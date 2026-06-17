const admin = require("firebase-admin");

if (!admin.apps.length) {
  try {
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
      token_uri: process.env.FIREBASE_TOKEN_URI || "https://oauth2.googleapis.com/token",
    };
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } catch (err) {
    console.error("Firebase init failed:", err.message);
  }
}

const getAmountFromFirebase = async (orderId) => {
  try {
    if (!admin.apps.length) return null;
    const db = admin.firestore();
    const snap = await db.collection("transactions").doc(String(orderId)).get();
    if (snap.exists && snap.data().amount) return Number(snap.data().amount);
  } catch (err) {
    console.warn("Firebase amount lookup failed:", err.message);
  }
  return null;
};

const FRONTEND_URL = process.env.FRONTEND_URL || "https://payments.piimh.com";

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "https://piimh.com",
  "https://payments.piimh.com",
  process.env.FRONTEND_URL,
].filter(Boolean);

const isAllowedRedirect = (url) => {
  try {
    const parsed = new URL(url);
    return ALLOWED_ORIGINS.some((o) => {
      const allowed = new URL(o);
      return parsed.hostname === allowed.hostname && parsed.protocol === allowed.protocol;
    });
  } catch {
    return false;
  }
};

exports.handler = async (event) => {
  console.log("Payment callback received, method:", event.httpMethod);
  console.log("Body:", event.body);

  let bodyParams = {};
  if (event.body) {
    try {
      const params = new URLSearchParams(event.body);
      params.forEach((v, k) => { bodyParams[k] = v; });
    } catch (e) {
      console.warn("Could not parse callback body:", e.message);
    }
  }

  const hdfcResponse = { ...(event.queryStringParameters || {}), ...bodyParams };
  const { order_id, status, amount, hash, signature } = hdfcResponse;

  console.log("Parsed callback:", JSON.stringify(hdfcResponse));

  if (!order_id || !status) {
    return {
      statusCode: 302,
      headers: { Location: `${FRONTEND_URL}/payment-status?error=invalid_callback` },
    };
  }

  const isSuccess = ["success", "paid", "captured", "charged"].includes((status || "").toLowerCase());
  const logStatus = isSuccess ? "Success" : "Failed";
  const transactionRef = hash || signature || null;

  // Amount from callback, fallback to Firebase
  let paidAmount = Number(amount || 0);
  if (!paidAmount) {
    const fbAmount = await getAmountFromFirebase(order_id);
    if (fbAmount) paidAmount = fbAmount;
    console.log(`Amount from Firebase for [${order_id}]:`, fbAmount);
  }

  const redirectParams = new URLSearchParams({
    order_id,
    status: logStatus,
    amount: String(paidAmount),
    hash: transactionRef || "",
  });

  const redirectUrl = `${FRONTEND_URL}/payment-status?${redirectParams.toString()}`;

  if (!isAllowedRedirect(redirectUrl)) {
    console.error("Blocked unsafe redirect to:", redirectUrl);
    return { statusCode: 400, body: "Invalid redirect destination" };
  }

  console.log("Redirecting to:", redirectUrl);
  return {
    statusCode: 302,
    headers: { Location: redirectUrl },
  };
};
