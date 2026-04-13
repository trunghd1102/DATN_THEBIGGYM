const express = require("express");
const healthRoutes = require("./healthRoutes");
const authRoutes = require("./authRoutes");
const exerciseRoutes = require("./exerciseRoutes");
const productRoutes = require("./productRoutes");
const cartRoutes = require("./cartRoutes");
const checkoutRoutes = require("./checkoutRoutes");
const adminRoutes = require("./adminRoutes");
const metricRoutes = require("./metricRoutes");
const tdeeRoutes = require("./tdeeRoutes");
const planRoutes = require("./planRoutes");
const contactRoutes = require("./contactRoutes");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/exercises", exerciseRoutes);
router.use("/products", productRoutes);
router.use("/cart", cartRoutes);
router.use("/checkout", checkoutRoutes);
router.use("/admin", adminRoutes);
router.use("/metrics", metricRoutes);
router.use("/tdee-logs", tdeeRoutes);
router.use("/plans", planRoutes);
router.use("/contacts", contactRoutes);

module.exports = router;
