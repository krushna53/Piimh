const express = require("express");
const { createHdfcSession, getOrderStatus } = require("../controller");
const router = express.Router();

router.post("/api/hdfc/create-session", createHdfcSession);
router.get("/api/hdfc/order-status", getOrderStatus);


module.exports.router = router;
