const express = require("express");
const cartController = require("../controllers/cartController");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth);

router.get("/", cartController.getCart);
router.put("/", cartController.replaceCart);
router.post("/items", cartController.cartValidators.addOrUpdateItem, cartController.addOrUpdateItem);
router.patch("/items/:productId", cartController.cartValidators.updateItemQuantity, cartController.updateItemQuantity);
router.delete("/items/:productId", cartController.cartValidators.removeItem, cartController.removeItem);

module.exports = router;
