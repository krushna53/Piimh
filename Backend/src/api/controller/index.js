const axios = require("axios");
const { logTransaction, getTransaction } = require("../firebase");

/**
 * Sanitization helper - Remove dangerous characters
 */
const sanitizeString = (input) => {
  if ("string" !== typeof input) return String(input || "").trim();
  let cleaned = input.trim();
  // Remove control characters and null bytes
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, "");
  return cleaned;
};

/**
 * Input validation helper (Production-Grade)
 */
const validateSessionRequest = (data) => {
  const required = ["orderId", "amount", "customerId", "customerEmail", "customerPhone", "firstName", "lastName"];
  const errors = [];

  // Check required fields (Yoda conditions)
  required.forEach(field => {
    const value = data[field];
    if ("undefined" === typeof value || null === value || "" === String(value).trim()) {
      errors.push(`Missing required field: ${field}`);
    }
  });

  // Sanitize strings
  const sanitized = {
    firstName: sanitizeString(data.firstName),
    lastName: sanitizeString(data.lastName),
    customerEmail: sanitizeString(data.customerEmail),
    customerPhone: sanitizeString(data.customerPhone),
    orderId: sanitizeString(data.orderId),
    customerId: sanitizeString(data.customerId),
  };

  // Validate firstName & lastName (letters, spaces, hyphens only)
  const nameRegex = /^[a-zA-Z\s\-']{1,50}$/;
  if (sanitized.firstName && !nameRegex.test(sanitized.firstName)) {
    errors.push("First name contains invalid characters");
  }
  if (sanitized.lastName && !nameRegex.test(sanitized.lastName)) {
    errors.push("Last name contains invalid characters");
  }

  // Validate email (strict RFC-like format)
  const emailRegex = /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (sanitized.customerEmail && !emailRegex.test(sanitized.customerEmail)) {
    errors.push("Invalid email format");
  }
  if (sanitized.customerEmail && 254 < sanitized.customerEmail.length) {
    errors.push("Email too long");
  }

  // Validate phone (10-15 digits)
  const phoneDigits = sanitized.customerPhone.replace(/\D/g, "");
  if (phoneDigits && (10 > phoneDigits.length || 15 < phoneDigits.length)) {
    errors.push("Phone must be 10-15 digits");
  }
  if (sanitized.customerPhone && !/^[\d+\-\s()]{10,}$/.test(sanitized.customerPhone)) {
    errors.push("Phone contains invalid characters");
  }

  // Validate amount is a positive number
  const amount = Number(data.amount);
  if (isNaN(amount) || 0 >= amount || 999999999 < amount) {
    errors.push("Amount must be a valid number between 1 and 999999999");
  }

  // Validate orderId format
  if (sanitized.orderId && !/^[a-zA-Z0-9_-]{20,}$/.test(sanitized.orderId)) {
    errors.push("Invalid order ID format");
  }

  return { errors, sanitized };
};

/**
 * Create HDFC Payment Session
 * Flow: Request received → Log as "Pending" → Create HDFC session → Return payment link
 */
const createHdfcSession = async (req, res) => {
  try {
    const { amount } = req.body;

    // Input validation & sanitization
    const { errors: validationErrors, sanitized } = validateSessionRequest(req.body);
    if (validationErrors.length > 0) {
      console.warn(`Validation failed: ${validationErrors.join(", ")}`);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    // Use sanitized values
    const orderId = sanitized.orderId;
    const firstName = sanitized.firstName;
    const lastName = sanitized.lastName;
    const customerEmail = sanitized.customerEmail;
    const customerPhone = sanitized.customerPhone;
    const customerId = sanitized.customerId;

    const protocol = req.protocol;
    const host = req.get('host');
    const fullUrl = `${protocol}://${host}`;

    // Log initial attempt as "Pending"
    const logResult = await logTransaction({
      orderId: orderId,
      amount: amount,
      status: "Pending",
      responseHash: null,
      additionalData: {
        customerId: customerId,
        customerEmail: customerEmail,
        customerPhone: customerPhone,
        sessionInitiated: true,
        source: "create-session",
      },
    });

    if (!logResult.success) {
      console.warn(`Warning: Failed to log initial transaction for [${orderId}], but continuing...`);
      // Don't fail the entire request if logging fails (fail-open for payments)
    }

    // Prepare HDFC payload
    const payload = {
      order_id: orderId,
      amount: amount,
      customer_id: customerId,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      payment_page_client_id: "hdfcmaster",
      action: "paymentPage",
      currency: "INR",
      return_url: `${fullUrl}/api/v1/hdfc/payment-callback`, // Webhook endpoint
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
    console.log("  Full URL:", `${process.env.HDFC_BASE_URL}/session`);

    const response = await axios.post(
      `${process.env.HDFC_BASE_URL}/session`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "x-merchantid": process.env.HDFC_MERCHANT_ID,
          "x-customerid": process.env.HDFC_CUSTOMER_ID,
          Authorization: process.env.HDFC_AUTH_HEADER,
        },
        timeout: 10000, // 10 second timeout
      }
    );

    return res.json({
      success: true,
      orderId: orderId,
      paymentLink: response.data.payment_links?.web || response.data.payment_link,
      message: "Payment session created successfully",
    });
  } catch (error) {
    const orderId = req.body?.orderId;
    console.error(`❌ Session creation failed for [${orderId}]`);
    console.error("Error Details:");
    console.error("  Type:", error.constructor.name);
    console.error("  Message:", error.message);
    
    if (error.response) {
      console.error("  HDFC Response Status:", error.response.status);
      console.error("  HDFC Response Headers:", JSON.stringify(error.response.headers, null, 2));
      console.error("  HDFC Response Data:", JSON.stringify(error.response.data, null, 2));
      console.error("  Request Config URL:", error.config?.url);
      console.error("  Request Config Headers:", JSON.stringify(error.config?.headers, null, 2));
    } else if (error.request) {
      console.error("  Request was made but no response received");
      console.error("  Request details:", error.request);
    } else {
      console.error("  Error setting up the request:", error.message);
    }

    // Log as "Failed" only if it's a session creation error (not HDFC API error)
    if (orderId && req.body?.amount) {
      await logTransaction({
        orderId: orderId,
        amount: req.body.amount,
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
      const mockPaymentLink = `${req.protocol}://${req.get("host")}/payment-status?order_id=${encodeURIComponent(
        orderId || "mock-order"
      )}&mock=success&amount=${encodeURIComponent(String(amount))}`;

      console.warn(`Using mock HDFC fallback for [${orderId}]`);

      return res.json({
        success: true,
        orderId: orderId,
        paymentLink: mockPaymentLink,
        message: "Mock payment session created locally because the live HDFC session failed.",
        mock: true,
      });
    }

    return res.status(error.response?.status || 500).json({
      success: false,
      message: error.response?.data?.message || error.message || "Unable to create payment session",
      orderId: orderId,
      error: error.response?.data || { message: error.message },
    });
  }
};

const getFrontendBaseUrl = (req) => {
  return (
    process.env.FRONTEND_URL ||
    process.env.REACT_APP_FRONTEND_URL ||
    `${req.protocol}://${req.hostname}:3000`
  );
};

const getOrderStatus = async (req, res) => {
  const orderId = req.query.orderId;
  
  try {
    // Validate orderId
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    console.log(`ℹ️ Checking HDFC status for [${orderId}]`);

    const response = await axios.get(
      `https://smartgateway.hdfcuat.bank.in/orders/${orderId}`,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: "Basic RDFEN0RCN0ZBQUI0NUNFQjQyNDczN0YzODYyQjlBOg==",
        },
        timeout: 10000,
      }
    );

    const hdfcStatus = response.data.status || "Unknown";
    const isSuccess = ["success", "paid", "captured"].includes(hdfcStatus.toLowerCase());
    const logStatus = isSuccess ? "Success" : "Failed";

    // Log the status check result
    await logTransaction({
      orderId: response.data.order_id || orderId,
      amount: response.data.amount || 0,
      status: logStatus,
      responseHash: response.data.response_hash || response.data.hash || null,
      additionalData: {
        hdfcStatus: hdfcStatus,
        source: "status-check",
        statusCheckAt: new Date().toISOString(),
      },
    });

    return res.json({
      success: true,
      orderId: response.data.order_id,
      status: response.data.status,
      amount: response.data.amount,
    });
  } catch (error) {
    console.error(`Status check failed for [${orderId}]:`, error.message);

    // Log status check failure
    if (orderId) {
      await logTransaction({
        orderId: orderId,
        amount: 0,
        status: "Failed",
        responseHash: null,
        additionalData: {
          errorType: "STATUS_CHECK_FAILED",
          errorMessage: error.message,
          source: "status-check",
        },
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to check payment status",
      orderId: orderId,
    });
  }
};

/**
 * HDFC Payment Callback Webhook
 * Called by HDFC after user completes/cancels payment
 * This is the PRIMARY source of truth for payment status
 * 
 * Flow: HDFC redirects user here → We log the response → Redirect to frontend status page
 */
const hdfcPaymentCallback = async (req, res) => {
  try {
    // HDFC may send data in query params or body depending on their implementation
    const hdfcResponse = { ...req.query, ...req.body };
    const { order_id, status, amount, hash } = hdfcResponse;

    console.log(`📨 Payment callback received for [${order_id}] - Status: ${status}`);

    // Validate callback data
    if (!order_id || !status) {
      console.warn("Incomplete callback data:", hdfcResponse);
      
      // Redirect to error page on frontend
      return res.redirect(
        `${getFrontendBaseUrl(req)}/payment-status?error=invalid_callback&message=Missing%20order%20ID%20or%20status`
      );
    }

    // Determine if payment was successful
    const isSuccess = ["success", "paid", "captured"].includes(status.toLowerCase());
    const logStatus = isSuccess ? "Success" : "Failed";

    // Log the callback response (this updates from Pending to Success/Failed)
    const logResult = await logTransaction({
      orderId: order_id,
      amount: amount || 0,
      status: logStatus,
      responseHash: hash || null,
      additionalData: {
        hdfcStatus: status,
        source: "payment-callback",
        callbackAt: new Date().toISOString(),
        fullResponse: hdfcResponse,
      },
    });

    if (!logResult.success) {
      console.error(`Failed to log callback for [${order_id}]`);
      // Don't fail response - payment succeeded even if logging fails
    }

    console.log(`Callback processed for [${order_id}], redirecting to status page...`);

    // Redirect to frontend payment status page with order ID
    // Frontend will query backend for final status
    return res.redirect(
      `${getFrontendBaseUrl(req)}/payment-status?order_id=${encodeURIComponent(order_id)}`
    );
  } catch (error) {
    console.error("Error processing payment callback:", error.message);
    
    // Redirect to error page
    return res.redirect(
      `${getFrontendBaseUrl(req)}/payment-status?error=callback_error&message=${encodeURIComponent(
        error.message
      )}`
    );
  }
};

/**
 * Get transaction logs by order ID
 */
const getTransactionLog = async (req, res) => {
  const { orderId } = req.params;

  try {
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    const result = await getTransaction(orderId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message || "Transaction not found",
      });
    }

    return res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("Error fetching transaction log:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = { createHdfcSession, getOrderStatus, getTransactionLog, hdfcPaymentCallback };

