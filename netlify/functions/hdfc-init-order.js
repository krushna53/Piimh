const crypto = require("crypto");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
      }),
    });
  } catch (err) {
    console.error("Firebase init failed:", err.message);
  }
}

const generateAmountHash = (orderId, amount) => {
  const secret = process.env.PAYMENT_HMAC_SECRET;
  if (!secret) throw new Error("PAYMENT_HMAC_SECRET env var is not configured");
  return crypto
    .createHmac("sha256", secret)
    .update(`${orderId}:${amount}`)
    .digest("hex");
};

/**
 * Per-order secret used to authorize later reads of the transaction log
 * (fixes IDOR on GET /transaction-log/:orderId — the orderId alone is no
 * longer sufficient to read someone else's payment data). Only the SHA-256
 * hash is ever persisted; the raw token is returned once here and must be
 * presented by the client on subsequent transaction-log requests.
 */
const generateAccessToken = () => crypto.randomBytes(24).toString("hex");
const hashAccessToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

/**
 * Persist the authoritative amount to Firestore so create-session can
 * retrieve it server-side instead of trusting the client-supplied value.
 */
const saveInitAmountToFirebase = async (orderId, amount, accessTokenHash) => {
  if (!admin.apps.length) {
    throw new Error("Firebase is not initialized");
  }
  const db = admin.firestore();
  await db.runTransaction(async (transaction) => {
    const docRef = db.collection("transactions").doc(String(orderId));
    const doc = await transaction.get(docRef);

    if (doc.exists) {
      const existingAmount = Number(doc.data().amount);

      if (existingAmount !== Number(amount)) {
        throw new Error("Amount cannot be modified");
      }

      return;
    }

    transaction.set(docRef, {
      orderId: String(orderId),
      amount: Number(amount),
      status: "Initiated",
      accessTokenHash,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  console.log(`Init amount ${amount} saved to Firebase for [${orderId}]`);
};

const jsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

// Server-side catalog — amountKey → actual amount in INR
// Client sends only the key, server resolves the amount. Attacker cannot
// submit an arbitrary amount — only valid catalog keys are accepted.
const AMOUNT_CATALOG = {
  AMT_1:    1,
  AMT_5:    5,
  AMT_10:   10,
  AMT_200:  200,
  AMT_500:  500,
  AMT_1000: 1000,
};

exports.handler = async (event) => {
  console.log("=== HDFC Init Order Handler Started ===");
  console.log("HTTP Method:", event.httpMethod);

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        ...jsonHeaders,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({ success: true }),
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: jsonHeaders,
      body: JSON.stringify({ success: false, message: "Method Not Allowed" }),
    };
  }

  try {
    if (!process.env.PAYMENT_HMAC_SECRET) {
      console.error("PAYMENT_HMAC_SECRET is not set");
      return {
        statusCode: 500,
        headers: jsonHeaders,
        body: JSON.stringify({ success: false, message: "Server configuration error" }),
      };
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const { orderId, amountKey, sessionToken } = body;

    if (!orderId || !amountKey || !sessionToken) {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({
          success: false,
          message: "orderId, amountKey and sessionToken are required",
        }),
      };
    }

    if (!/^[a-zA-Z0-9]{1,20}$/.test(String(orderId))) {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({
          success: false,
          message: "Invalid order ID format",
        }),
      };
    }

    // Verify sessionToken and read the server-locked amountKey — ignore client-supplied amountKey
    if (!admin.apps.length) {
      return {
        statusCode: 500,
        headers: jsonHeaders,
        body: JSON.stringify({ success: false, message: "Server configuration error" }),
      };
    }

    const db = admin.firestore();
    const sessionDoc = await db.collection("payment_sessions").doc(String(sessionToken)).get();

    if (!sessionDoc.exists) {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({ success: false, message: "Invalid or expired session. Please refresh and try again." }),
      };
    }

    const sessionData = sessionDoc.data();

    if (sessionData.expiresAt < Date.now()) {
      await db.collection("payment_sessions").doc(String(sessionToken)).delete();
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({ success: false, message: "Session expired. Please refresh and try again." }),
      };
    }

    if (!sessionData.locked || !sessionData.amountKey) {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({ success: false, message: "Please select an amount before proceeding." }),
      };
    }

    // Use the server-locked amountKey — completely ignore client-supplied amountKey
    const lockedAmountKey = sessionData.amountKey;
    const parsedAmount = AMOUNT_CATALOG[lockedAmountKey];

    if (!parsedAmount) {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({ success: false, message: "Invalid amount selection" }),
      };
    }

    // Bind orderId to session so create-session can verify it too
    await db.collection("payment_sessions").doc(String(sessionToken)).update({
      orderId: String(orderId),
    });

    const amountHash = generateAmountHash(orderId, parsedAmount);
    const accessToken = generateAccessToken();
    const accessTokenHash = hashAccessToken(accessToken);

    // Persist authoritative amount + access-token hash server-side before returning to client
   try {
  await saveInitAmountToFirebase(orderId, parsedAmount, accessTokenHash);
} catch (err) {
  return {
    statusCode: 400,
    headers: jsonHeaders,
    body: JSON.stringify({
      success: false,
      message: err.message,
    }),
  };
}

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({
        success: true,
        orderId,
        amount: parsedAmount,
        amountHash,
        // Client must store this (e.g. sessionStorage) and present it back
        // on GET /transaction-log/:orderId. Never logged, never stored raw.
        accessToken,
      }),
    };
  } catch (error) {
    console.error("Error parsing init-order request:", error.message);
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({
        success: false,
        message: "Invalid JSON in request body",
        error: error.message,
      }),
    };
  }
};
