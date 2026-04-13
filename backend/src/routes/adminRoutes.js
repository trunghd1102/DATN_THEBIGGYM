const express = require("express");
const adminController = require("../controllers/adminController");
const auth = require("../middleware/auth");
const authorizeRole = require("../middleware/authorizeRole");
const uploadProductImage = require("../middleware/uploadProductImage");
const uploadExerciseImage = require("../middleware/uploadExerciseImage");

const router = express.Router();

router.use(auth, authorizeRole("admin"));

router.get("/overview", adminController.getOverview);
router.get("/analytics", adminController.getAnalytics);
router.get("/alerts", adminController.getAlerts);
router.post(
  "/contact-messages/:id/reply",
  adminController.validators.replyContactMessage,
  adminController.replyContactMessage
);

router.get(
  "/orders",
  adminController.validators.getOrders,
  adminController.getOrders
);
router.get(
  "/orders/:id",
  adminController.validators.getOrderDetail,
  adminController.getOrderDetail
);
router.patch(
  "/orders/:id/status",
  adminController.validators.updateOrderStatus,
  adminController.updateOrderStatus
);

router.get(
  "/products",
  adminController.validators.getProducts,
  adminController.getProducts
);
router.get(
  "/exercises",
  adminController.validators.getExercises,
  adminController.getExercises
);
router.post(
  "/products/upload-image",
  uploadProductImage.single("image"),
  adminController.uploadProductImage
);
router.post(
  "/exercises/upload-image",
  uploadExerciseImage.single("image"),
  adminController.uploadExerciseImage
);
router.post(
  "/products/upload-gallery",
  uploadProductImage.array("images", 12),
  adminController.uploadProductGallery
);

router.get(
  "/customers",
  adminController.validators.getCustomers,
  adminController.getCustomers
);
router.get(
  "/customers/:id",
  adminController.validators.getCustomerDetail,
  adminController.getCustomerDetail
);

router.get("/settings", adminController.getSettings);
router.put(
  "/settings",
  adminController.validators.updateSettings,
  adminController.updateSettings
);
router.patch(
  "/users/:id/role",
  adminController.validators.updateUserRole,
  adminController.updateUserRole
);

module.exports = router;
