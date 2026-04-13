const express = require("express");
const checkoutController = require("../controllers/checkoutController");
const auth = require("../middleware/auth");
const optionalAuth = require("../middleware/optionalAuth");

const router = express.Router();

router.post(
  "/payos/create",
  optionalAuth,
  checkoutController.checkoutValidators.createPayOSCheckout,
  checkoutController.createPayOSCheckout
);
router.post("/payos/webhook", checkoutController.handlePayOSWebhook);
router.get(
  "/orders/my",
  auth,
  checkoutController.checkoutValidators.getMyOrders,
  checkoutController.getMyOrders
);
router.post(
  "/orders/lookup",
  checkoutController.checkoutValidators.lookupOrder,
  checkoutController.lookupOrder
);
router.get(
  "/orders/:orderCode",
  auth,
  checkoutController.checkoutValidators.getOrderDetail,
  checkoutController.getOrderDetail
);

module.exports = router;
