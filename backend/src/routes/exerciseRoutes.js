const express = require("express");
const { body, param } = require("express-validator");
const exerciseController = require("../controllers/exerciseController");
const auth = require("../middleware/auth");
const authorizeRole = require("../middleware/authorizeRole");

const router = express.Router();

router.get("/", exerciseController.getExercises);
router.get("/:slug", exerciseController.getExerciseBySlug);
router.post(
  "/",
  auth,
  authorizeRole("admin"),
  [
    body("title").trim().notEmpty().isLength({ max: 150 }),
    body("slug").trim().notEmpty().isLength({ max: 160 }),
    body("category_name").trim().notEmpty().isLength({ max: 100 }),
    body("category_slug").trim().notEmpty().isLength({ max: 100 }),
    body("level_name").trim().notEmpty().isLength({ max: 100 }),
    body("level_slug").trim().notEmpty().isLength({ max: 100 }),
    body("focus_label").optional({ nullable: true }).trim().isLength({ max: 180 }),
    body("equipment").optional({ nullable: true }).trim().isLength({ max: 255 }),
    body("primary_muscles").optional({ nullable: true }).trim().isLength({ max: 255 }),
    body("calorie_burn_text").optional({ nullable: true }).trim().isLength({ max: 120 }),
    body("hero_image").optional({ nullable: true }).trim().isLength({ max: 255 }),
    body("short_description").optional({ nullable: true }).trim(),
    body("long_description").optional({ nullable: true }).trim(),
    body("video_url").optional({ nullable: true }).trim().isLength({ max: 255 }),
    body("expert_tip").optional({ nullable: true }).trim(),
    body("execution_steps").optional({ nullable: true }).isArray(),
    body("common_mistakes").optional({ nullable: true }).isArray(),
    body("muscle_tags").optional({ nullable: true }).isArray(),
    body("recommended_sets").optional({ nullable: true }).isArray(),
    body("related_exercises").optional({ nullable: true }).isArray(),
    body("is_active").optional().isBoolean(),
    body("sort_order").optional().isInt({ min: 0 })
  ],
  exerciseController.createExercise
);
router.put(
  "/:id",
  auth,
  authorizeRole("admin"),
  [
    param("id").isInt({ min: 1 }),
    body("title").optional().trim().notEmpty().isLength({ max: 150 }),
    body("slug").optional().trim().notEmpty().isLength({ max: 160 }),
    body("category_name").optional().trim().notEmpty().isLength({ max: 100 }),
    body("category_slug").optional().trim().notEmpty().isLength({ max: 100 }),
    body("level_name").optional().trim().notEmpty().isLength({ max: 100 }),
    body("level_slug").optional().trim().notEmpty().isLength({ max: 100 }),
    body("focus_label").optional({ nullable: true }).trim().isLength({ max: 180 }),
    body("equipment").optional({ nullable: true }).trim().isLength({ max: 255 }),
    body("primary_muscles").optional({ nullable: true }).trim().isLength({ max: 255 }),
    body("calorie_burn_text").optional({ nullable: true }).trim().isLength({ max: 120 }),
    body("hero_image").optional({ nullable: true }).trim().isLength({ max: 255 }),
    body("short_description").optional({ nullable: true }).trim(),
    body("long_description").optional({ nullable: true }).trim(),
    body("video_url").optional({ nullable: true }).trim().isLength({ max: 255 }),
    body("expert_tip").optional({ nullable: true }).trim(),
    body("execution_steps").optional({ nullable: true }).isArray(),
    body("common_mistakes").optional({ nullable: true }).isArray(),
    body("muscle_tags").optional({ nullable: true }).isArray(),
    body("recommended_sets").optional({ nullable: true }).isArray(),
    body("related_exercises").optional({ nullable: true }).isArray(),
    body("is_active").optional().isBoolean(),
    body("sort_order").optional().isInt({ min: 0 })
  ],
  exerciseController.updateExercise
);
router.delete(
  "/:id",
  auth,
  authorizeRole("admin"),
  [param("id").isInt({ min: 1 })],
  exerciseController.deleteExercise
);

module.exports = router;
