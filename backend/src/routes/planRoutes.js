const express = require("express");
const planController = require("../controllers/planController");

const router = express.Router();

router.get("/", planController.getPlans);
router.post("/", planController.createPlan);

module.exports = router;
