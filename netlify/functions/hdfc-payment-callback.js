const admin = require("firebase-admin");
const axios = require("axios");

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

const db = () => admin.firestore();

const getAmountFromFirebase = async (orderId) => {
  try {
    const snap = await db().collection("transactions").doc(String(orderId)).get();
    if (snap.exists && snap.data().amount) return Number(snap.data().amount);
  } catch (err) {
    console.warn("Firebase amount lookup failed:", err.message);
  }
  return null;
};

const saveToFirebase = async (orderId, amount, status, transactionRef, hdfcData) => {
  try {
    const d = hdfcData || {};
    const doc = {
      orderId: String(orderId),
      amount: Number(amount) || 1,
      status,
      responseHash: transactionRef || null,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      // Core fields
      hdfc_id: d.id || null,
      hdfc_txn_id: d.txn_id || null,
      hdfc_merchant_id: d.merchant_id || null,
      hdfc_currency: d.currency || null,
      hdfc_date_created: d.date_created || null,
      hdfc_return_url: d.return_url || null,
      hdfc_payment_method_type: d.payment_method_type || null,
      hdfc_payment_method: d.payment_method || null,
      hdfc_auth_type: d.auth_type || null,
      hdfc_status: d.status || null,
      hdfc_status_id: d.status_id || null,
      hdfc_resp_code: d.resp_code || null,
      hdfc_resp_message: d.resp_message || null,
      hdfc_bank_error_code: d.bank_error_code || null,
      hdfc_bank_error_message: d.bank_error_message || null,
      hdfc_txn_uuid: d.txn_uuid || null,
      hdfc_effective_amount: d.effective_amount || null,
      hdfc_refunded: d.refunded || false,
      hdfc_amount_refunded: d.amount_refunded || null,
      hdfc_gateway_id: d.gateway_id || null,
      hdfc_gateway_reference_id: d.gateway_reference_id || null,
      // Customer
      hdfc_customer_email: d.customer_email || null,
      hdfc_customer_phone: d.customer_phone || null,
      hdfc_customer_id: d.customer_id || null,
      // UPI
      hdfc_upi: d.upi || null,
      hdfc_payer_vpa: d.payer_vpa || null,
      // Card
      hdfc_card: d.card || null,
      // Payment links
      hdfc_payment_links: d.payment_links || null,
      // Txn detail
      hdfc_txn_detail: d.txn_detail || null,
      // Payment gateway response
      hdfc_payment_gateway_response: d.payment_gateway_response || null,
      // Refunds
      hdfc_refunds: d.refunds || null,
      // UDFs
      hdfc_udf1: d.udf1 || null,
      hdfc_udf2: d.udf2 || null,
      hdfc_udf3: d.udf3 || null,
      hdfc_udf4: d.udf4 || null,
      hdfc_udf5: d.udf5 || null,
      // Metadata
      hdfc_metadata: d.metadata || null,
      hdfc_offers: d.offers || null,
      // Full raw response
      hdfc_full_response: d,
    };

    await db().collection("transactions").doc(String(orderId)).set(doc, { merge: true });
    await db().collection("transactions").doc(String(orderId)).collection("history").add({
      status,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      source: "payment-callback",
    });
    console.log(`Firebase saved for [${orderId}]: ${status}`);
  } catch (err) {
    console.error("Firebase save failed:", err.message);
  }
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

  // Fetch full order data from HDFC Status API
  let hdfcOrderData = {};
  try {
    const statusRes = await axios.get(
      `${process.env.HDFC_BASE_URL}/orders/${order_id}`,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: process.env.HDFC_AUTH_HEADER,
          "x-merchantid": process.env.HDFC_MERCHANT_ID,
          "x-customerid": process.env.HDFC_CUSTOMER_ID,
        },
        timeout: 10000,
      }
    );
    hdfcOrderData = statusRes.data || {};
    if (!paidAmount && hdfcOrderData.amount) paidAmount = Number(hdfcOrderData.amount);
    console.log(`HDFC Status API fetched for [${order_id}]`);
  } catch (err) {
    console.warn(`HDFC Status API failed for [${order_id}]: ${err.message}`);
  }

  // Save everything to Firebase
  await saveToFirebase(order_id, paidAmount, logStatus, transactionRef, hdfcOrderData);

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
