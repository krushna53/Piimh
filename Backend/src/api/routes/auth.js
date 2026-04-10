const express = require("express");
const { createHdfcSession } = require("../controller");
const router = express.Router();

router.post("/api/hdfc/create-session", createHdfcSession);


module.exports.router = router;
