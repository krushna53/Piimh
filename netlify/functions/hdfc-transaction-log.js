const admin = require("firebase-admin");

// Initialize Firebase Admin SDK from environment variables
if (!admin.apps.length) {
  try {
    let serviceAccount;

    // Load from individual environment variables (Netlify/production)
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
      console.log("Loading Firebase credentials from environment variables...");
      serviceAccount = {
        type: process.env.FIREBASE_TYPE || "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: process.env.FIREBASE_AUTH_URI,
        token_uri: process.env.FIREBASE_TOKEN_URI,
        auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
        client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
        universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN || "googleapis.com",
      };
    } else {
      // Fallback for local development - read from file
      console.log("Loading Firebase credentials from local JSON file...");
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
