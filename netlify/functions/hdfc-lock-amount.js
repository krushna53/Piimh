const admin = require("firebase-admin");
const { sendSecurityAlert } = require("./lib/security-alert");

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

const AMOUNT_CATALOG = {
  AMT_1:    1,
  AMT_5:    5,
  AMT_10:   10,
  AMT_200:  200,
  AMT_500:  500,
  AMT_1000: 1000,
};

const jsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: { ...jsonHeaders, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" },
      body: JSON.stringify({ success: true }),
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: jsonHeaders, body: JSON.stringify({ success: false, message: "Method Not Allowed" }) };
  }

  try {
    const { sessionToken, amountKey } = JSON.parse(event.body || "{}");

    if (!sessionToken || !amountKey) {
      return { statusCode: 400, headers: jsonHeaders, body: JSON.stringify({ success: false, message: "sessionToken and amountKey required" }) };
    }

    if (!AMOUNT_CATALOG[amountKey]) {
      return { statusCode: 400, headers: jsonHeaders, body: JSON.stringify({ success: false, message: "Invalid amount selection" }) };
    }

    if (!admin.apps.length) {
      return { statusCode: 500, headers: jsonHeaders, body: JSON.stringify({ success: false, message: "Server configuration error" }) };
    }

    const db = admin.firestore();
    const sessionRef = db.collection("payment_sessions").doc(String(sessionToken));

    const updated = await db.runTransaction(async (tx) => {
      const doc = await tx.get(sessionRef);

      if (!doc.exists) return { ok: false, reason: "Invalid or expired session" };
      if (doc.data().expiresAt < Date.now()) return { ok: false, reason: "Session expired" };

      // Always update — user can freely change selection until Pay is clicked
      tx.update(sessionRef, { amountKey, locked: true });
      return { ok: true };
    });

    if (!updated.ok) {
      if (updated.reason === "tamper") {
        await sendSecurityAlert("AMOUNT_KEY_TAMPER_ATTEMPT", {
          sessionToken,
          original_amountKey: updated.original,
          attempted_amountKey: amountKey,
          source_ip: event.headers?.["x-nf-client-connection-ip"] || "unknown",
        });
      }
      return { statusCode: 400, headers: jsonHeaders, body: JSON.stringify({ success: false, message: updated.reason }) };
    }

    return { statusCode: 200, headers: jsonHeaders, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error("lock-amount error:", err.message);
    return { statusCode: 500, headers: jsonHeaders, body: JSON.stringify({ success: false, message: "Server error" }) };
  }
};
