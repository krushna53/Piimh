require("dotenv").config({
  path: require("path").join(__dirname, "../../.env"),
});
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
