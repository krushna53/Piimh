const express = require("express");
const { createHdfcSession, getOrderStatus, getTransactionLog, hdfcPaymentCallback } = require("../controller");
const router = express.Router();

// Payment initiation
router.post("/hdfc/create-session", createHdfcSession);

// Payment status check (polling)
router.get("/hdfc/order-status", getOrderStatus);

// Payment webhook callback (HDFC redirects here after payment)
router.post("/hdfc/payment-callback", hdfcPaymentCallback);
router.get("/hdfc/payment-callback", hdfcPaymentCallback); // Handle both POST and GET

// Transaction log retrieval
router.get("/hdfc/transaction-log/:orderId", getTransactionLog);

module.exports.router = router;
