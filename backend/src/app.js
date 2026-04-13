const express = require("express");
const cors = require("cors");
const path = require("path");
const routes = require("./routes");
const errorHandler = require("./middleware/errorHandler");
const { getExternalUploadsRoot } = require("./utils/uploadPaths");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(getExternalUploadsRoot()));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "THE BIG GYM backend is ready"
  });
});

app.use("/api", routes);
app.use(errorHandler);

module.exports = app;
