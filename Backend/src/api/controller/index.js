const axios = require("axios");
const crypto = require("crypto");
const { logTransaction, getTransaction } = require("../firebase");

// In-memory store for pending orders: orderId -> { amount, createdAt }
// Prevents frontend from tampering with the amount between init and submit
const pendingOrders = new Map();

const HMAC_SECRET = process.env.PAYMENT_HMAC_SECRET;
if (!HMAC_SECRET) {
  console.error("FATAL: PAYMENT_HMAC_SECRET env var is not set. Payment integrity checks will fail.");
}

const generateAmountHash = (orderId, amount) => {
  if (!HMAC_SECRET) throw new Error("PAYMENT_HMAC_SECRET env var is not configured");
  return crypto
    .createHmac("sha256", HMAC_SECRET)
    .update(`${orderId}:${amount}`)
    .digest("hex");
};

const sanitizeString = (input) => {
  if ("string" !== typeof input) return String(input || "").trim();
  let cleaned = input.trim();
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, "");
  return cleaned;
};

const validateSessionRequest = (data) => {
  const required = ["orderId", "amount", "customerId", "customerEmail", "customerPhone", "firstName", "lastName"];
  const errors = [];

  required.forEach(field => {
    const value = data[field];
    if ("undefined" === typeof value || null === value || "" === String(value).trim()) {
      errors.push(`Missing required field: ${field}`);
    }
  });

  const sanitized = {
    firstName: sanitizeString(data.firstName),
    lastName: sanitizeString(data.lastName),
    customerEmail: sanitizeString(data.customerEmail),
    customerPhone: sanitizeString(data.customerPhone),
    orderId: sanitizeString(data.orderId),
    customerId: sanitizeString(data.customerId),
  };

  const nameRegex = /^[a-zA-Z\s\-']{1,50}$/;
  if (sanitized.firstName && !nameRegex.test(sanitized.firstName)) errors.push("First name contains invalid characters");
  if (sanitized.lastName && !nameRegex.test(sanitized.lastName)) errors.push("Last name contains invalid characters");

  const emailRegex = /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (sanitized.customerEmail && !emailRegex.test(sanitized.customerEmail)) errors.push("Invalid email format");
  if (sanitized.customerEmail && 254 < sanitized.customerEmail.length) errors.push("Email too long");

  const phoneDigits = sanitized.customerPhone.replace(/\D/g, "");
  if (phoneDigits && (10 > phoneDigits.length || 15 < phoneDigits.length)) errors.push("Phone must be 10-15 digits");
  if (sanitized.customerPhone && !/^[\d+\-\s()]{10,}$/.test(sanitized.customerPhone)) errors.push("Phone contains invalid characters");

  const amount = Number(data.amount);
  if (isNaN(amount) || 0 >= amount || 999999999 < amount) errors.push("Amount must be a valid number between 1 and 999999999");

  if (sanitized.orderId && !/^[a-zA-Z0-9_-]{20,}$/.test(sanitized.orderId)) errors.push("Invalid order ID format");

  return { errors, sanitized };
};

// #4 — Only allow redirects to our own frontend domain
const ALLOWED_REDIRECT_ORIGINS = [
  "http://localhost:3000",
  "https://piimh.com",
  process.env.FRONTEND_URL,
].filter(Boolean);

const isAllowedRedirectUrl = (url) => {
  try {
    const parsed = new URL(url);
    return ALLOWED_REDIRECT_ORIGINS.some(origin => {
      const allowedOrigin = new URL(origin);
      return parsed.hostname === allowedOrigin.hostname && parsed.protocol === allowedOrigin.protocol;
    });
  } catch {
    return false;
  }
};

const getFrontendBaseUrl = (req) => {
  return (
    process.env.FRONTEND_URL ||
    process.env.REACT_APP_FRONTEND_URL ||
    `${req.protocol}://${req.hostname}:3000`
  );
};

// #2 — New endpoint: frontend calls this first to register the order amount server-side
// Returns a hash the frontend must pass with the payment request
const initPaymentOrder = (req, res) => {
  if (!HMAC_SECRET) {
    return res.status(500).json({ success: false, message: "Server configuration error" });
  }

  const { orderId, amount } = req.body;

  if (!orderId || !amount) {
    return res.status(400).json({ success: false, message: "orderId and amount are required" });
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0 || numAmount > 999999999) {
    return res.status(400).json({ success: false, message: "Invalid amount" });
  }

  if (!/^[a-zA-Z0-9]{1,20}$/.test(String(orderId))) {
    return res.status(400).json({ success: false, message: "Invalid order ID format" });
  }

  // #5 — Reject if orderId was already used
  if (pendingOrders.has(orderId)) {
    return res.status(409).json({ success: false, message: "Duplicate order ID. Please refresh and try again." });
  }

  pendingOrders.set(orderId, { amount: numAmount, createdAt: Date.now() });

  // Expire pending orders after 30 minutes
  setTimeout(() => pendingOrders.delete(orderId), 30 * 60 * 1000);

  const amountHash = generateAmountHash(orderId, numAmount);
  return res.json({ success: true, orderId, amount: numAmount, amountHash });
};

const createHdfcSession = async (req, res) => {
  try {
    const { amountHash } = req.body;

    const { errors: validationErrors, sanitized } = validateSessionRequest(req.body);
    if (validationErrors.length > 0) {
      console.warn(`Validation failed: ${validationErrors.join(", ")}`);
      return res.status(400).json({ success: false, message: "Validation failed", errors: validationErrors });
    }

    const orderId = sanitized.orderId;

    // #2 — Verify amount was not tampered: check hash and compare against server-side stored amount
    const pending = pendingOrders.get(orderId);
    if (!pending) {
      return res.status(400).json({ success: false, message: "Order not initialised. Please start payment again." });
    }

    const expectedHash = generateAmountHash(orderId, pending.amount);
    if (!amountHash || amountHash !== expectedHash) {
      console.warn(`Amount hash mismatch for [${orderId}]`);
      return res.status(400).json({ success: false, message: "Payment amount validation failed. Please try again." });
    }

    // Use server-side stored amount — ignore whatever the frontend sent
    const verifiedAmount = pending.amount;

    // #5 — Mark order as in-flight to prevent duplicate submissions
    pendingOrders.set(orderId, { ...pending, submitting: true });

    const firstName = sanitized.firstName;
    const lastName = sanitized.lastName;
    const customerEmail = sanitized.customerEmail;
    const customerPhone = sanitized.customerPhone;
    const customerId = sanitized.customerId;

    const logResult = await logTransaction({
      orderId,
      amount: verifiedAmount,
      status: "Pending",
      responseHash: null,
      additionalData: {
        customerId,
        customerEmail,
        customerPhone,
        sessionInitiated: true,
        source: "create-session",
      },
    });

    if (!logResult.success) {
      console.warn(`Warning: Failed to log initial transaction for [${orderId}], but continuing...`);
    }

    // HDFC POSTs to return_url after payment — must be the backend, which then redirects browser to frontend.
    const returnUrl = `${req.protocol}://${req.hostname}:3001/api/v1/hdfc/payment-callback`;

    const payload = {
      order_id: orderId,
      amount: verifiedAmount,
      customer_id: customerId,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      payment_page_client_id: "hdfcmaster",
      action: "paymentPage",
      currency: "INR",
      return_url: returnUrl,
      description: "Complete your payment",
      first_name: firstName,
      last_name: lastName,
    };

    console.log(`ℹ️ Creating HDFC session for [${orderId}]`);
    console.log("HDFC Request Details:");
    console.log("  Base URL:", process.env.HDFC_BASE_URL);
    console.log("  Merchant ID:", process.env.HDFC_MERCHANT_ID);
    console.log("  Customer ID:", process.env.HDFC_CUSTOMER_ID);
    console.log("  Auth Header Set:", !!process.env.HDFC_AUTH_HEADER);
    console.log("  Return URL:", returnUrl);

    const response = await axios.post(
      `${process.env.HDFC_BASE_URL}/session`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "x-merchantid": process.env.HDFC_MERCHANT_ID,
          "x-customerid": process.env.HDFC_CUSTOMER_ID,
          Authorization: process.env.HDFC_AUTH_HEADER,
          // "x-api": process.env.HDFC_API_KEY,
        },
        timeout: 10000,
      }
    );

    // Remove from pending — HDFC accepted it
    pendingOrders.delete(orderId);

    return res.json({
      success: true,
      orderId,
      paymentLink: response.data.payment_links?.web || response.data.payment_link,
      message: "Payment session created successfully",
    });
  } catch (error) {
    const orderId = req.body?.orderId;
    console.error(`❌ Session creation failed for [${orderId}]`);
    console.error("  Type:", error.constructor.name);
    console.error("  Message:", error.message);

    if (error.response) {
      console.error("  HDFC Response Status:", error.response.status);
      console.error("  HDFC Response Data:", JSON.stringify(error.response.data, null, 2));
    }

    // Remove submitting lock on failure so user can retry
    if (orderId && pendingOrders.has(orderId)) {
      const existing = pendingOrders.get(orderId);
      pendingOrders.set(orderId, { ...existing, submitting: false });
    }

    const failedPending = orderId ? pendingOrders.get(orderId) : null;
    if (orderId && failedPending?.amount) {
      await logTransaction({
        orderId,
        amount: failedPending.amount,
        status: "Failed",
        responseHash: null,
        additionalData: {
          errorType: "SESSION_CREATION_FAILED",
          errorMessage: error.message,
          errorCode: error.response?.status || "UNKNOWN",
          errorData: error.response?.data || null,
          failedAt: new Date().toISOString(),
        },
      });
    }

    const shouldUseMockFallback =
      process.env.NODE_ENV !== "production" &&
      process.env.HDFC_MOCK_FALLBACK !== "disabled";

    if (shouldUseMockFallback) {
      const amount = req.body?.amount || 0;
      const frontendBase = getFrontendBaseUrl(req);
      const mockPaymentLink = `${frontendBase}/payment-status?order_id=${encodeURIComponent(
        orderId || "mock-order"
      )}&mock=success&amount=${encodeURIComponent(String(amount))}`;

      console.warn(`Using mock HDFC fallback for [${orderId}]`);

      return res.json({
        success: true,
        orderId,
        paymentLink: mockPaymentLink,
        message: "Mock payment session created locally because the live HDFC session failed.",
        mock: true,
      });
    }

    return res.status(error.response?.status || 500).json({
      success: false,
      message: error.response?.data?.message || error.message || "Unable to create payment session",
      orderId,
      error: error.response?.data || { message: error.message },
    });
  }
};

const getOrderStatus = async (req, res) => {
  const orderId = req.query.orderId;

  if (!orderId) {
    return res.status(400).json({ success: false, message: "Order ID is required" });
  }

  console.log(`ℹ️ Status API called for [${orderId}]`);

  try {
    // Try HDFC live status API first
    const response = await axios.get(
      `${process.env.HDFC_BASE_URL}/orders/${orderId}`,
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

    const hdfcStatus = response.data.status || "Unknown";
    const isSuccess = ["success", "paid", "captured", "charged"].includes(hdfcStatus.toLowerCase());
    const isPending = ["new", "pending", "pending_vbv", "authorizing"].includes(hdfcStatus.toLowerCase());
    const logStatus = isSuccess ? "Success" : isPending ? "Pending" : "Failed";

    const d = response.data;

    await logTransaction({
      orderId: d.order_id || orderId,
      amount: d.amount || 0,
      status: logStatus,
      responseHash: d.signature || d.hash || null,
      additionalData: {
        source: "status-api",
        checkedAt: new Date().toISOString(),
        hdfcStatus,
        // Core order fields
        hdfc_id: d.id || null,
        hdfc_txn_id: d.txn_id || null,
        hdfc_merchant_id: d.merchant_id || null,
        hdfc_currency: d.currency || null,
        hdfc_date_created: d.date_created || null,
        hdfc_return_url: d.return_url || null,
        hdfc_product_id: d.product_id || null,
        hdfc_payment_method_type: d.payment_method_type || null,
        hdfc_payment_method: d.payment_method || null,
        hdfc_auth_type: d.auth_type || null,
        hdfc_gateway_id: d.gateway_id || null,
        hdfc_gateway_reference_id: d.gateway_reference_id || null,
        hdfc_resp_code: d.resp_code || null,
        hdfc_resp_message: d.resp_message || null,
        hdfc_bank_error_code: d.bank_error_code || null,
        hdfc_bank_error_message: d.bank_error_message || null,
        hdfc_txn_uuid: d.txn_uuid || null,
        hdfc_effective_amount: d.effective_amount || null,
        hdfc_refunded: d.refunded || false,
        hdfc_amount_refunded: d.amount_refunded || null,
        // Customer info
        hdfc_customer_email: d.customer_email || null,
        hdfc_customer_phone: d.customer_phone || null,
        hdfc_customer_id: d.customer_id || null,
        // Card details
        hdfc_card: d.card || null,
        // Payment links
        hdfc_payment_links: d.payment_links || null,
        // Transaction detail
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
      },
    });

    return res.json({
      success: true,
      orderId: d.order_id || orderId,
      status: hdfcStatus,
      amount: d.amount,
      source: "hdfc-live",
      data: d,
    });
  } catch (hdfcError) {
    console.warn(`HDFC status API failed for [${orderId}]: ${hdfcError.message} — falling back to DB`);

    // Fall back to our own Firebase transaction log
    const dbResult = await getTransaction(orderId);

    if (dbResult.success && dbResult.data) {
      return res.json({
        success: true,
        orderId,
        status: dbResult.data.status,
        amount: dbResult.data.amount,
        source: "database",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve order status",
      orderId,
    });
  }
};

// #3 — Validate HDFC callback response hash to prevent response tampering
const verifyCallbackHash = (hdfcResponse) => {
  const { hash, order_id, status, amount } = hdfcResponse;
  if (!hash) return false;

  // HDFC hash = SHA256(orderId + "|" + status + "|" + amount + "|" + apiKey)
  const apiKey = process.env.HDFC_API_KEY || "";
  const expectedHash = crypto
    .createHash("sha256")
    .update(`${order_id}|${status}|${amount}|${apiKey}`)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(hash.toLowerCase()),
    Buffer.from(expectedHash.toLowerCase())
  );
};

const hdfcPaymentCallback = async (req, res) => {
  try {
    const hdfcResponse = { ...req.query, ...req.body };
    const { order_id, status, amount, hash } = hdfcResponse;

    console.log("📨 Payment callback received");
    console.log("  Method:", req.method);
    console.log("  Query params:", JSON.stringify(req.query));
    console.log("  Body:", JSON.stringify(req.body));
    console.log("  order_id:", order_id, "| status:", status);

    if (!order_id || !status) {
      console.warn("Incomplete callback data:", hdfcResponse);
      return res.redirect(
        `${getFrontendBaseUrl(req)}/payment-status?error=invalid_callback&message=Missing%20order%20ID%20or%20status`
      );
    }

    // #3 — Verify the response hash from HDFC to ensure it wasn't tampered
    const hashValid = verifyCallbackHash(hdfcResponse);
    if (hash && !hashValid) {
      console.error(`❌ Hash mismatch for callback [${order_id}] — possible response tampering`);
      await logTransaction({
        orderId: order_id,
        amount: amount || 0,
        status: "Failed",
        responseHash: hash || null,
        additionalData: {
          errorType: "HASH_MISMATCH",
          source: "payment-callback",
          callbackAt: new Date().toISOString(),
        },
      });
      return res.redirect(
        `${getFrontendBaseUrl(req)}/payment-status?error=hash_mismatch&message=Response%20validation%20failed`
      );
    }

    // HDFC uses "CHARGED" for successful payments (also accept other variants)
    const isSuccess = ["success", "paid", "captured", "charged"].includes(status.toLowerCase());
    const logStatus = isSuccess ? "Success" : "Failed";

    // HDFC sends signature instead of hash in some flows
    const transactionRef = hash || hdfcResponse.signature || null;

    // HDFC callback does not include amount — look up from memory, then Firestore pending log
    const storedOrder = pendingOrders.get(order_id);
    let paidAmount = Number(amount || hdfcResponse.amount || storedOrder?.amount || 0);

    if (!paidAmount) {
      // Fetch the pending transaction we logged at session creation to get the amount
      const existing = await getTransaction(order_id);
      if (existing.success && existing.data?.amount) {
        paidAmount = Number(existing.data.amount);
      }
    }

    // Fetch full order details from HDFC Status API
    let hdfcOrderData = {};
    try {
      const statusResponse = await axios.get(
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
      hdfcOrderData = statusResponse.data || {};
      // Use amount from Status API if we don't have it
      if (!paidAmount && hdfcOrderData.amount) {
        paidAmount = Number(hdfcOrderData.amount);
      }
      console.log(`✓ HDFC Status API fetched for [${order_id}]`);
    } catch (statusErr) {
      console.warn(`⚠ HDFC Status API failed for [${order_id}]: ${statusErr.message}`);
    }

    const logResult = await logTransaction({
      orderId: order_id,
      amount: paidAmount || null,
      status: logStatus,
      responseHash: transactionRef,
      additionalData: {
        hdfcStatus: status,
        source: "payment-callback",
        callbackAt: new Date().toISOString(),
        callbackResponse: hdfcResponse,
        hashVerified: hashValid,
        // Full HDFC order details from Status API
        hdfc_id: hdfcOrderData.id || null,
        hdfc_txn_id: hdfcOrderData.txn_id || null,
        hdfc_merchant_id: hdfcOrderData.merchant_id || null,
        hdfc_currency: hdfcOrderData.currency || "INR",
        hdfc_date_created: hdfcOrderData.date_created || null,
        hdfc_payment_method_type: hdfcOrderData.payment_method_type || null,
        hdfc_auth_type: hdfcOrderData.auth_type || null,
        hdfc_customer_email: hdfcOrderData.customer_email || null,
        hdfc_customer_phone: hdfcOrderData.customer_phone || null,
        hdfc_customer_id: hdfcOrderData.customer_id || null,
        hdfc_card: hdfcOrderData.card || null,
        hdfc_udf1: hdfcOrderData.udf1 || null,
        hdfc_udf2: hdfcOrderData.udf2 || null,
        hdfc_payment_links: hdfcOrderData.payment_links || null,
        hdfc_full_response: hdfcOrderData,
      },
    });

    if (!logResult.success) {
      console.error(`Failed to log callback for [${order_id}]`);
    }

    // Clean up pending order entry
    pendingOrders.delete(order_id);

    // #4 — Redirect browser to frontend with all payment params in query string
    const frontendBase = getFrontendBaseUrl(req);
    const params = new URLSearchParams({
      order_id: order_id,
      status: logStatus,
      amount: String(paidAmount),
      hash: transactionRef || "",
    });
    const redirectUrl = `${frontendBase}/payment-status?${params.toString()}`;

    if (!isAllowedRedirectUrl(redirectUrl)) {
      console.error(`Blocked unsafe redirect to: ${redirectUrl}`);
      return res.status(400).send("Invalid redirect destination");
    }

    console.log(`Redirecting to frontend: ${redirectUrl}`);
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error("Error processing payment callback:", error.message);
    return res.redirect(
      `${getFrontendBaseUrl(req)}/payment-status?error=callback_error&message=${encodeURIComponent(error.message)}`
    );
  }
};

const getTransactionLog = async (req, res) => {
  const { orderId } = req.params;

  try {
    if (!orderId) {
      return res.status(400).json({ success: false, message: "Order ID is required" });
    }

    const result = await getTransaction(orderId);

    if (!result.success) {
      return res.status(404).json({ success: false, message: result.message || "Transaction not found" });
    }

    return res.json({ success: true, data: result.data });
  } catch (error) {
    console.error("Error fetching transaction log:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { initPaymentOrder, createHdfcSession, getOrderStatus, getTransactionLog, hdfcPaymentCallback };
