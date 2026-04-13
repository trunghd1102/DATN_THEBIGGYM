const express = require("express");
const metricController = require("../controllers/metricController");

const router = express.Router();

router.post("/", metricController.createMetric);
router.get("/user/:userId", metricController.getMetricsByUser);

module.exports = router;
