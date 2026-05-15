const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../../.env") });

// Verify HDFC environment variables are loaded
console.log("=== Environment Variables Check ===");
console.log("✓ HDFC_BASE_URL:", process.env.HDFC_BASE_URL || "❌ MISSING");
console.log("✓ HDFC_MERCHANT_ID:", process.env.HDFC_MERCHANT_ID || "❌ MISSING");
console.log("✓ HDFC_CUSTOMER_ID:", process.env.HDFC_CUSTOMER_ID || "❌ MISSING");
console.log("✓ HDFC_AUTH_HEADER:", process.env.HDFC_AUTH_HEADER ? "✓ SET" : "❌ MISSING");
console.log("✓ FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID || "❌ MISSING");
console.log("✓ FIREBASE_PRIVATE_KEY:", process.env.FIREBASE_PRIVATE_KEY ? "✓ SET" : "❌ MISSING");
console.log("====================================\n");

const express = require("express");
const cors = require("cors");
// const routes = require("/src/api/routes");
const routes = require("./routes")
const app = express();

const port = 3001;
app.use(cors());
app.use(express.json());

app.use("/api/v1", routes);
// const { sequelize } = db;
app.get("/", (req, res) => {
  res.send("Welcome to my server!");
});


app.get("/api/users", (req, res) => {
  res.json({ message: "Get users" });
});

// Set up Swagger UI middleware
// app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.listen(port, async () => {
  try {
    console.error("Application Started Successfully");
    // await sequelize.authenticate();
    // await sequelize.sync();
    console.log("Connection has been established successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
});
