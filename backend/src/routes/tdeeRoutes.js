const express = require("express");
const tdeeController = require("../controllers/tdeeController");
const auth = require("../middleware/auth");
const optionalAuth = require("../middleware/optionalAuth");

const router = express.Router();

router.post("/", optionalAuth, tdeeController.createTdeeLog);
router.get("/me", auth, tdeeController.getMyTdeeLogs);

module.exports = router;
