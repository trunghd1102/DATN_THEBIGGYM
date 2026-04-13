const express = require("express");
const contactController = require("../controllers/contactController");
const optionalAuth = require("../middleware/optionalAuth");

const router = express.Router();

router.get("/meta", contactController.getContactMeta);
router.post("/", optionalAuth, contactController.createContactMessage);

module.exports = router;
