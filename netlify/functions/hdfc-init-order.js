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
  const secret = process.env.PAYMENT_HMAC_SECRET || "piimh-payment-secret-change-in-prod";
  return crypto
    .createHmac("sha256", secret)
    .update(`${orderId}:${amount}`)
    .digest("hex");
};

/**
 * Persist the authoritative amount to Firestore so create-session can
 * retrieve it server-side instead of trusting the client-supplied value.
 */
const saveInitAmountToFirebase = async (orderId, amount) => {
  try {
    if (!admin.apps.length) return;
    const db = admin.firestore();
    await db.collection("transactions").doc(String(orderId)).set(
      {
        orderId: String(orderId),
        amount: Number(amount),
        status: "Initiated",
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    console.log(`Init amount ${amount} saved to Firebase for [${orderId}]`);
  } catch (err) {
    // Non-fatal — HMAC check in create-session is the primary defence
    console.warn("Firebase init-amount save failed:", err.message);
  }
};

const jsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
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
    const body = event.body ? JSON.parse(event.body) : {};
    const { orderId, amount } = body;
    const parsedAmount = Number(amount);

    if (!orderId || !amount) {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({
          success: false,
          message: "orderId and amount are required",
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

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > 999999999) {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({
          success: false,
          message: "Invalid amount",
        }),
      };
    }

    const amountHash = generateAmountHash(orderId, parsedAmount);

    // Persist authoritative amount server-side before returning to client
    await saveInitAmountToFirebase(orderId, parsedAmount);

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({
        success: true,
        orderId,
        amount: parsedAmount,
        amountHash,
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
