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

const jsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

// Session expires in 30 minutes
const SESSION_TTL_MS = 30 * 60 * 1000;

exports.handler = async (event) => {
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
    if (!admin.apps.length) {
      return {
        statusCode: 500,
        headers: jsonHeaders,
        body: JSON.stringify({ success: false, message: "Server configuration error" }),
      };
    }

    // Generate a cryptographically random session token
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + SESSION_TTL_MS;

    // Store session in Firebase — amountKey will be locked to this session later
    await admin.firestore().collection("payment_sessions").doc(sessionToken).set({
      sessionToken,
      amountKey: null,
      locked: false,
      expiresAt,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({ success: true, sessionToken, expiresAt }),
    };
  } catch (err) {
    console.error("init-session error:", err.message);
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ success: false, message: "Failed to create session" }),
    };
  }
};
