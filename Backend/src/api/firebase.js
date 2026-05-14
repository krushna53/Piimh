const admin = require("firebase-admin");
const path = require("path");

// Initialize Firebase Admin SDK
try {
  const serviceAccountPath = path.join(
    __dirname,
    "piimh-1e1aa-firebase-adminsdk-fbsvc-fd8e0c4174.json"
  );

  const serviceAccount = require(serviceAccountPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Error initializing Firebase:", error.message);
  process.exit(1);
}

const db = admin.firestore();

/**
 * Log a transaction to Firestore (Production-Grade)
 * @param {Object} transactionData - Transaction details
 * @param {string} transactionData.orderId - Order ID (required)
 * @param {number} transactionData.amount - Payment amount (required)
 * @param {string} transactionData.status - Status: Pending, Success, Failed (required)
 * @param {string} transactionData.responseHash - Response hash from HDFC
 * @param {Object} transactionData.additionalData - Extra data to store
 */
const logTransaction = async (transactionData, retries = 3) => {
  try {
    const { orderId, amount, status, responseHash = null, additionalData = {} } = transactionData;

    // Validate required fields (Yoda conditions - prevents accidental assignment)
    if ("undefined" === typeof orderId || null === orderId) {
      throw new Error("Missing required field: orderId");
    }
    if ("undefined" === typeof amount || null === amount) {
      throw new Error("Missing required field: amount");
    }
    if ("undefined" === typeof status || null === status) {
      throw new Error("Missing required field: status");
    }

    // Validate amount is a positive number
    const numAmount = Number(amount);
    if (isNaN(numAmount) || 0 >= numAmount) {
      throw new Error("Amount must be a positive number");
    }

    // Validate status is one of the allowed values (Yoda condition)
    const validStatuses = ["Pending", "Success", "Failed"];
    if (!validStatuses.includes(status)) {
      const validList = validStatuses.join(", ");
      throw new Error(`Invalid status: "${String(status)}" (allowed: ${validList})`);
    }

    // Create transaction document
    const transactionLog = {
      orderId: String(orderId),
      amount: Number(amount),
      status: status,
      responseHash: responseHash || null,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      ...additionalData,
    };

    // Save to Firestore under 'transactions' collection with merge
    await db.collection("transactions").doc(String(orderId)).set(
      transactionLog,
      { merge: true }
    );

    // Also log to transaction history for audit trail
    await db
      .collection("transactions")
      .doc(String(orderId))
      .collection("history")
      .add({
        status: status,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: additionalData,
      });

    console.log(`[${orderId}] Transaction logged: ${status}`);
    return { success: true, orderId: String(orderId) };
  } catch (error) {
    console.error(`Error logging transaction [${transactionData?.orderId}]: ${error.message}`);
    
    // Retry logic for transient errors
    if (retries > 0 && error.code === "DEADLINE_EXCEEDED") {
      console.warn(`Retrying transaction log (${retries} retries left)...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return logTransaction(transactionData, retries - 1);
    }

    return { success: false, error: error.message };
  }
};

/**
 * Get transaction by Order ID
 * @param {string} orderId - Order ID to retrieve
 */
const getTransaction = async (orderId) => {
  try {
    const docSnapshot = await db.collection("transactions").doc(String(orderId)).get();

    if (!docSnapshot.exists) {
      return { success: false, message: "Transaction not found" };
    }

    return { success: true, data: docSnapshot.data() };
  } catch (error) {
    console.error("Error fetching transaction:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Get all transactions with optional filtering
 * @param {string} status - Filter by status (optional)
 */
const getAllTransactions = async (status = null) => {
  try {
    let query = db.collection("transactions");

    if (status) {
      query = query.where("status", "==", status);
    }

    const snapshot = await query.orderBy("timestamp", "desc").limit(100).get();

    const transactions = [];
    snapshot.forEach((doc) => {
      transactions.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, count: transactions.length, data: transactions };
  } catch (error) {
    console.error("Error fetching transactions:", error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  db,
  admin,
  logTransaction,
  getTransaction,
  getAllTransactions,
};
