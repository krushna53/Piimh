const crypto = require("crypto");
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

const generateAmountHash = (orderId, amount) => {
  const secret = process.env.PAYMENT_HMAC_SECRET;
  if (!secret) throw new Error("PAYMENT_HMAC_SECRET env var is not configured");
  return crypto
    .createHmac("sha256", secret)
    .update(`${orderId}:${amount}`)
    .digest("hex");
};

/**
 * Per-order secret used to authorize later reads of the transaction log
 * (fixes IDOR on GET /transaction-log/:orderId — the orderId alone is no
 * longer sufficient to read someone else's payment data). Only the SHA-256
 * hash is ever persisted; the raw token is returned once here and must be
 * presented by the client on subsequent transaction-log requests.
 */
const generateAccessToken = () => crypto.randomBytes(24).toString("hex");
const hashAccessToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

/**
 * Persist the authoritative amount to Firestore so create-session can
 * retrieve it server-side instead of trusting the client-supplied value.
 */
const saveInitAmountToFirebase = async (orderId, amount, accessTokenHash) => {
  try {
    if (!admin.apps.length) return;
    const db = admin.firestore();
    await db.collection("transactions").doc(String(orderId)).set(
      {
        orderId: String(orderId),
        amount: Number(amount),
        status: "Initiated",
        accessTokenHash,
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

// Realistic ceiling on a single payment. Overridable via env var. This is a
// blast-radius reducer, not a substitute for a real price catalog — it just
// stops absurd values (the old ceiling let through amounts up to ~99.9 crore).
const MAX_PAYMENT_AMOUNT = Number(process.env.MAX_PAYMENT_AMOUNT) || 1000000; // ₹10,00,000 default

/**
 * Optional server-side allow-list of valid payment amounts (SG-4356
 * remediation item: "enforce server-side price calculation from
 * authoritative data"). We don't have a price catalog yet, so this is
 * config-driven and OFF by default:
 *   - Unset ALLOWED_PAYMENT_AMOUNTS  -> amount is free-form (donations,
 *     user-chosen amounts); only the sanity bounds above apply.
 *   - Set ALLOWED_PAYMENT_AMOUNTS="100,500,1000,5000" -> only those exact
 *     values are accepted; everything else is rejected with 400.
 * Flip this on the moment a real list/catalog exists — no code change
 * needed, just set the env var.
 */
const getAllowedAmounts = () => {
  const raw = process.env.ALLOWED_PAYMENT_AMOUNTS;
  if (!raw) return null;
  const parsed = raw
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((v) => !Number.isNaN(v) && v > 0);
  return parsed.length ? parsed : null;
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
    if (!process.env.PAYMENT_HMAC_SECRET) {
      console.error("PAYMENT_HMAC_SECRET is not set");
      return {
        statusCode: 500,
        headers: jsonHeaders,
        body: JSON.stringify({ success: false, message: "Server configuration error" }),
      };
    }

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

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > MAX_PAYMENT_AMOUNT) {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({
          success: false,
          message: "Invalid amount",
        }),
      };
    }

    // ── Price catalog check (SG-4356 remediation, deferred) ────────────────
    const allowedAmounts = getAllowedAmounts();
    if (allowedAmounts) {
      if (!allowedAmounts.includes(parsedAmount)) {
        await sendSecurityAlert("AMOUNT_NOT_IN_ALLOWLIST", {
          order_id: orderId,
          amount: parsedAmount,
          source_ip: event.headers?.["x-nf-client-connection-ip"] || event.headers?.["client-ip"] || "unknown",
        });
        return {
          statusCode: 400,
          headers: jsonHeaders,
          body: JSON.stringify({
            success: false,
            message: "Invalid amount",
          }),
        };
      }
    } else {
      // No catalog configured yet. Not blocking — amount is currently
      // free-form by design — but log it so a real allow-list can be
      // derived from actual traffic once one is defined.
      console.log(`ℹ No amount allow-list configured; accepting amount ${parsedAmount} for [${orderId}] unchecked`);
    }
    // ── End price catalog check ─────────────────────────────────────────────

    const amountHash = generateAmountHash(orderId, parsedAmount);
    const accessToken = generateAccessToken();
    const accessTokenHash = hashAccessToken(accessToken);

    // Persist authoritative amount + access-token hash server-side before returning to client
    await saveInitAmountToFirebase(orderId, parsedAmount, accessTokenHash);

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({
        success: true,
        orderId,
        amount: parsedAmount,
        amountHash,
        // Client must store this (e.g. sessionStorage) and present it back
        // on GET /transaction-log/:orderId. Never logged, never stored raw.
        accessToken,
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
