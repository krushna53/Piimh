const admin = require("firebase-admin");

// Initialize Firebase Admin SDK from environment variables
if (!admin.apps.length) {
  try {
    // In production, Firebase credentials should be stored as Netlify environment variable:
    // FIREBASE_SERVICE_ACCOUNT (as JSON string)
    let serviceAccount;

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
      // Fallback for local development - read from file
      const path = require("path");
      const serviceAccountPath = path.join(
        __dirname,
        "../../Backend/src/api/piimh-1e1aa-firebase-adminsdk-fbsvc-fd8e0c4174.json"
      );
      serviceAccount = require(serviceAccountPath);
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log("Firebase initialized for transaction-log function");
  } catch (error) {
    console.error("Error initializing Firebase:", error.message);
  }
}

const db = admin.firestore();

/**
 * Get transaction details by order ID
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
 * Netlify Function: Get transaction log by order ID
 * Endpoint: GET /api/v1/hdfc/transaction-log/:orderId
 */
exports.handler = async (event) => {
  try {
    // Extract orderId from path
    // Path format: /api/v1/hdfc/transaction-log/ORD_xxx-xxx-xxx
    const pathParts = event.path.split("/");
    const orderId = pathParts[pathParts.length - 1];

    if (!orderId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          success: false,
          message: "Order ID is required",
        }),
      };
    }

    console.log(`Fetching transaction log for [${orderId}]`);

    const result = await getTransaction(orderId);

    if (!result.success) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          success: false,
          message: result.message || "Transaction not found",
        }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        data: result.data,
      }),
    };
  } catch (error) {
    console.error("Error fetching transaction log:", error.message);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: false,
        message: error.message || "Unable to fetch transaction",
      }),
    };
  }
};
