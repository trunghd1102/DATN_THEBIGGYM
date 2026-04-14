const express = require("express");
const ptController = require("../controllers/ptController");
const auth = require("../middleware/auth");
const optionalAuth = require("../middleware/optionalAuth");

const router = express.Router();

router.get("/trainers", ptController.getTrainers);
router.get("/slots", ptController.validators.getSlots, ptController.getAvailableSlots);
router.post("/bookings", optionalAuth, ptController.validators.createBooking, ptController.createBooking);
router.get("/bookings/me", auth, ptController.getMyBookings);

module.exports = router;
