const admin = require("firebase-admin");

console.log("=== HDFC Transaction Log Function Initializing ===");

// Initialize Firebase Admin SDK from environment variables
if (!admin.apps.length) {
  try {
    console.log("Firebase not initialized yet, initializing now...");
    let serviceAccount;

    // Validate environment variables first
    const requiredVars = [
      "FIREBASE_PROJECT_ID",
      "FIREBASE_PRIVATE_KEY",
      "FIREBASE_CLIENT_EMAIL",
      "FIREBASE_AUTH_URI",
      "FIREBASE_TOKEN_URI",
    ];

    const missingVars = requiredVars.filter(v => !process.env[v]);
    
    if (missingVars.length > 0) {
      console.error("✗ Missing Firebase environment variables:", missingVars);
    } else {
      console.log("✓ All required Firebase environment variables are present");
    }

    // Load from individual environment variables (Netlify/production)
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
      console.log("✓ Loading Firebase credentials from environment variables...");
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
      console.log("✓ Service account constructed with project_id:", serviceAccount.project_id);
    } else {
      // Fallback for local development - read from file
      console.log("⚠ Env vars not available, attempting fallback to local JSON file...");
      const path = require("path");
      const serviceAccountPath = path.join(
        __dirname,
        "../../Backend/src/api/piimh-1e1aa-firebase-adminsdk-fbsvc-fd8e0c4174.json"
      );
      console.log("Attempting to read from:", serviceAccountPath);
      serviceAccount = require(serviceAccountPath);
      console.log("✓ Loaded from JSON file");
    }

    console.log("Initializing Firebase with project:", serviceAccount.project_id);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log("✓ Firebase initialized successfully for transaction-log function");
  } catch (error) {
    console.error("✗ Error initializing Firebase:", error.message);
    console.error("Stack:", error.stack);
  }
} else {
  console.log("✓ Firebase already initialized");
}

const db = admin.firestore();

/**
 * Get transaction details by order ID
 */
const getTransaction = async (orderId) => {
  try {
    console.log(`  Querying Firestore for orderId: ${orderId}`);
    const docSnapshot = await db.collection("transactions").doc(String(orderId)).get();

    if (!docSnapshot.exists) {
      console.warn(`  ⚠ No transaction found for orderId: ${orderId}`);
      return { success: false, message: "Transaction not found" };
    }

    const data = docSnapshot.data();
    console.log(`  ✓ Transaction found. Status: ${data.status}, Amount: ${data.amount}`);
    return { success: true, data: data };
  } catch (error) {
    console.error(`  ✗ Firestore query error for [${orderId}]:`, error.message);
    console.error("  Error code:", error.code);
    console.error("  Full error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Netlify Function: Get transaction log by order ID
 * Endpoint: GET /api/v1/hdfc/transaction-log/:orderId
 */
exports.handler = async (event) => {
  console.log("=== HDFC Transaction Log Request ===");
  console.log("HTTP Method:", event.httpMethod);
  console.log("Request Path:", event.path);
  console.log("Request Headers:", JSON.stringify(event.headers, null, 2));
  
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    console.log("Handling OPTIONS (CORS preflight)");
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    };
  }

  try {
    // Extract orderId from path
    // Path format: /api/v1/hdfc/transaction-log/ORD_xxx-xxx-xxx
    const pathParts = event.path.split("/");
    const orderId = pathParts[pathParts.length - 1];

    console.log("Extracted path parts:", pathParts);
    console.log("Extracted orderId:", orderId);

    if (!orderId || orderId === "transaction-log") {
      console.warn("✗ No orderId provided in request");
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          success: false,
          message: "Order ID is required in path: /api/v1/hdfc/transaction-log/YOUR_ORDER_ID",
        }),
      };
    }

    console.log(`✓ Fetching transaction log for orderId: [${orderId}]`);

    const result = await getTransaction(orderId);

    if (!result.success) {
      console.warn(`✗ Transaction not found for [${orderId}]`);
      return {
        statusCode: 404,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          success: false,
          message: result.message || "Transaction not found",
        }),
      };
    }

    return {
      statusCode: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: true,
        orderId: orderId,
        data: result.data,
      }),
    };
  } catch (error) {
    console.error("=== ERROR in Transaction Log Handler ===");
    console.error("Error Type:", error.constructor.name);
    console.error("Error Message:", error.message);
    console.error("Error Code:", error.code);
    console.error("Error Stack:", error.stack);
    
    if (error.details) {
      console.error("Error Details:", error.details);
    }

    return {
      statusCode: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: false,
        message: error.message || "Unable to fetch transaction",
        error: {
          type: error.constructor.name,
          code: error.code,
          message: error.message,
        }
      }),
    };
  }
};
