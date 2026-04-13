const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.resolve(__dirname, "../../.env")
});

const port = Number(process.env.PORT || 4000);
const frontendBaseUrl = process.env.FRONTEND_BASE_URL || "http://127.0.0.1:5500";
const backendBaseUrl = process.env.BACKEND_BASE_URL || `http://localhost:${port}`;
const mailPort = Number(process.env.MAIL_PORT || 587);
const mailSecure =
  String(process.env.MAIL_SECURE || "").toLowerCase() === "true"
  || mailPort === 465;

module.exports = {
  port,
  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME || "biggym",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || ""
  },
  jwt: {
    secret: process.env.JWT_SECRET || "change_me_for_production",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || ""
  },
  mail: {
    host: process.env.MAIL_HOST || "",
    port: mailPort,
    secure: mailSecure,
    user: process.env.MAIL_USER || "",
    pass: process.env.MAIL_PASS || "",
    fromEmail: process.env.MAIL_FROM_EMAIL || process.env.MAIL_USER || "",
    fromName: process.env.MAIL_FROM_NAME || "THE BIG GYM"
  },
  app: {
    frontendBaseUrl,
    backendBaseUrl
  },
  payos: {
    clientId: process.env.PAYOS_CLIENT_ID || "",
    apiKey: process.env.PAYOS_API_KEY || "",
    checksumKey: process.env.PAYOS_CHECKSUM_KEY || "",
    returnUrl: process.env.PAYOS_RETURN_URL || `${frontendBaseUrl}/pages/checkout.html`,
    cancelUrl: process.env.PAYOS_CANCEL_URL || `${frontendBaseUrl}/pages/checkout.html?cancelled=1`,
    webhookUrl: process.env.PAYOS_WEBHOOK_URL || `${backendBaseUrl}/api/checkout/payos/webhook`
  }
};
