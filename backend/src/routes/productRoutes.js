const express = require("express");
const { body } = require("express-validator");
const productController = require("../controllers/productController");
const auth = require("../middleware/auth");
const authorizeRole = require("../middleware/authorizeRole");
const optionalAuth = require("../middleware/optionalAuth");

const router = express.Router();

router.get("/", productController.getProducts);
router.get("/:slug/reviews", optionalAuth, productController.getProductReviews);
router.post(
  "/:slug/reviews",
  auth,
  [
    body("rating").isInt({ min: 1, max: 5 }).withMessage("Số sao đánh giá phải từ 1 đến 5"),
    body("comment").optional({ nullable: true }).trim().isLength({ max: 1500 }).withMessage("Nội dung đánh giá tối đa 1500 ký tự")
  ],
  productController.upsertProductReview
);
router.get("/:slug", productController.getProductBySlug);

router.post(
  "/",
  auth,
  authorizeRole("admin"),
  [
    body("name").trim().notEmpty().isLength({ max: 180 }),
    body("slug").trim().notEmpty().isLength({ max: 190 }),
    body("category_name").trim().notEmpty().isLength({ max: 100 }),
    body("category_slug").trim().notEmpty().isLength({ max: 100 }),
    body("price").isFloat({ gt: 0 }),
    body("sale_price").optional({ nullable: true }).isFloat({ gt: 0 }),
    body("stock_quantity").optional().isInt({ min: 0 }),
    body("image_url").optional({ nullable: true }).trim().isLength({ max: 255 }),
    body("badge_label").optional({ nullable: true }).trim().isLength({ max: 80 }),
    body("short_description").optional({ nullable: true }).trim(),
    body("gallery_images").optional({ nullable: true }).isArray(),
    body("flavors").optional({ nullable: true }).isArray(),
    body("sizes").optional({ nullable: true }).isArray(),
    body("variants").optional({ nullable: true }).isArray(),
    body("feature_cards").optional({ nullable: true }).isArray(),
    body("quick_info").optional({ nullable: true }).isArray(),
    body("highlights").optional({ nullable: true }).isArray(),
    body("usage_guide").optional({ nullable: true }).isArray(),
    body("notes").optional({ nullable: true }).isArray(),
    body("purchase_panel_title").optional({ nullable: true }).trim().isLength({ max: 180 }),
    body("purchase_panel_body").optional({ nullable: true }).trim(),
    body("is_featured").optional().isBoolean(),
    body("is_active").optional().isBoolean(),
    body("sort_order").optional().isInt({ min: 0 })
  ],
  productController.createProduct
);

router.put(
  "/:id",
  auth,
  authorizeRole("admin"),
  [
    body("name").optional().trim().notEmpty().isLength({ max: 180 }),
    body("slug").optional().trim().notEmpty().isLength({ max: 190 }),
    body("category_name").optional().trim().notEmpty().isLength({ max: 100 }),
    body("category_slug").optional().trim().notEmpty().isLength({ max: 100 }),
    body("price").optional().isFloat({ gt: 0 }),
    body("sale_price").optional({ nullable: true }).isFloat({ gt: 0 }),
    body("stock_quantity").optional().isInt({ min: 0 }),
    body("image_url").optional({ nullable: true }).trim().isLength({ max: 255 }),
    body("badge_label").optional({ nullable: true }).trim().isLength({ max: 80 }),
    body("short_description").optional({ nullable: true }).trim(),
    body("gallery_images").optional({ nullable: true }).isArray(),
    body("flavors").optional({ nullable: true }).isArray(),
    body("sizes").optional({ nullable: true }).isArray(),
    body("variants").optional({ nullable: true }).isArray(),
    body("feature_cards").optional({ nullable: true }).isArray(),
    body("quick_info").optional({ nullable: true }).isArray(),
    body("highlights").optional({ nullable: true }).isArray(),
    body("usage_guide").optional({ nullable: true }).isArray(),
    body("notes").optional({ nullable: true }).isArray(),
    body("purchase_panel_title").optional({ nullable: true }).trim().isLength({ max: 180 }),
    body("purchase_panel_body").optional({ nullable: true }).trim(),
    body("is_featured").optional().isBoolean(),
    body("is_active").optional().isBoolean(),
    body("sort_order").optional().isInt({ min: 0 })
  ],
  productController.updateProduct
);

router.delete(
  "/:id",
  auth,
  authorizeRole("admin"),
  productController.deleteProduct
);

module.exports = router;
