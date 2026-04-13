const express = require("express");
const { body } = require("express-validator");
const authController = require("../controllers/authController");
const auth = require("../middleware/auth");
const uploadAvatar = require("../middleware/uploadAvatar");

const router = express.Router();

router.get("/google-config", authController.getGoogleConfig);

router.post(
  "/register",
  [
    body("full_name").trim().notEmpty(),
    body("email").isEmail(),
    body("password").isLength({ min: 6 })
  ],
  authController.register
);

router.post(
  "/login",
  [
    body("email").isEmail(),
    body("password").notEmpty()
  ],
  authController.login
);

router.post(
  "/google",
  [
    body("credential").trim().notEmpty()
  ],
  authController.googleLogin
);

router.get("/me", auth, authController.getCurrentUser);

router.put(
  "/me",
  auth,
  [
    body("full_name").optional({ checkFalsy: true, nullable: true }).trim().isLength({ min: 2, max: 150 }),
    body("phone").optional({ checkFalsy: true, nullable: true }).trim().isLength({ max: 30 }),
    body("avatar_url").optional({ checkFalsy: true, nullable: true }).trim().isLength({ max: 255 }),
    body("current_password").optional({ checkFalsy: true, nullable: true }).isLength({ min: 6 }),
    body("new_password").optional({ checkFalsy: true, nullable: true }).isLength({ min: 6 })
  ],
  authController.updateCurrentUser
);

router.post(
  "/me/avatar",
  auth,
  uploadAvatar.single("avatar"),
  authController.uploadAvatar
);

module.exports = router;
