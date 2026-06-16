const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../../.env") });

// Initialize Firebase Admin SDK
let firebaseReady = false;
let db = null;

try {
  let serviceAccount = null;

  // Try to load from explicit environment variables (CI / Netlify style)
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
    console.log("Loading Firebase credentials from environment variables...");
    serviceAccount = {
      type: process.env.FIREBASE_TYPE || "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    };
  } else {
    // Fallback to local JSON file for development
    const serviceAccountPath = path.join(
      __dirname,
      "piimh-1e1aa-firebase-adminsdk-fbsvc-fd8e0c4174.json"
    );

    if (fs.existsSync(serviceAccountPath)) {
      console.log("Loading Firebase credentials from local JSON file...");
      serviceAccount = require(serviceAccountPath);
    }
  }

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    db = admin.firestore();
    firebaseReady = true;
    console.log("Firebase initialized successfully");
  } else {
    console.warn("Firebase service account not provided; transaction logging is disabled for this session.");
  }
} catch (error) {
  console.warn("Firebase initialization skipped:", error && error.message ? error.message : error);
}

/**
 * Log a transaction to Firestore
 */
const logTransaction = async (transactionData, retries = 3) => {
  try {
    if (!firebaseReady || !db) {
      return { success: false, skipped: true, message: "Firebase is not configured" };
    }

    const { orderId, amount, status, responseHash = null, additionalData = {} } = transactionData;

    if (typeof orderId === "undefined" || orderId === null) throw new Error("Missing required field: orderId");
    if (typeof amount === "undefined" || amount === null) throw new Error("Missing required field: amount");
    if (typeof status === "undefined" || status === null) throw new Error("Missing required field: status");

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) throw new Error("Amount must be a positive number");

    const validStatuses = ["Pending", "Success", "Failed"];
    if (!validStatuses.includes(status)) throw new Error(`Invalid status: "${String(status)}"`);

    const transactionLog = {
      orderId: String(orderId),
      amount: Number(amount),
      status,
      responseHash: responseHash || null,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      ...additionalData,
    };

    await db.collection("transactions").doc(String(orderId)).set(transactionLog, { merge: true });

    await db.collection("transactions").doc(String(orderId)).collection("history").add({
      status,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: additionalData,
    });

    console.log(`[${orderId}] Transaction logged: ${status}`);
    return { success: true, orderId: String(orderId) };
  } catch (error) {
    console.error(`Error logging transaction [${transactionData?.orderId}]: ${error && error.message ? error.message : error}`);

    if (retries > 0 && error && error.code === "DEADLINE_EXCEEDED") {
      console.warn(`Retrying transaction log (${retries} retries left)...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return logTransaction(transactionData, retries - 1);
    }

    return { success: false, error: error && error.message ? error.message : String(error) };
  }
};

const getTransaction = async (orderId) => {
  try {
    if (!firebaseReady || !db) return { success: false, message: "Firebase is not configured" };
    const docSnapshot = await db.collection("transactions").doc(String(orderId)).get();
    if (!docSnapshot.exists) return { success: false, message: "Transaction not found" };
    return { success: true, data: docSnapshot.data() };
  } catch (error) {
    console.error("Error fetching transaction:", error && error.message ? error.message : error);
    return { success: false, error: error && error.message ? error.message : String(error) };
  }
};

const getAllTransactions = async (status = null) => {
  try {
    if (!firebaseReady || !db) return { success: false, message: "Firebase is not configured" };
    let query = db.collection("transactions");
    if (status) query = query.where("status", "==", status);
    const snapshot = await query.orderBy("lastUpdated", "desc").limit(100).get();
    const transactions = [];
    snapshot.forEach((doc) => transactions.push({ id: doc.id, ...doc.data() }));
    return { success: true, count: transactions.length, data: transactions };
  } catch (error) {
    console.error("Error fetching transactions:", error && error.message ? error.message : error);
    return { success: false, error: error && error.message ? error.message : String(error) };
  }
};

module.exports = {
  db,
  admin,
  firebaseReady,
  logTransaction,
  getTransaction,
  getAllTransactions,
};
