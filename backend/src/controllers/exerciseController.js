const { validationResult } = require("express-validator");
const asyncHandler = require("../utils/asyncHandler");
const { query } = require("../services/queryService");
const { attachExerciseDetailFields, serializeExerciseDetailPayload } = require("../utils/exerciseDetailFields");
const { normalizeNullableMediaPath } = require("../utils/mediaPaths");

function toNumber(value) {
  return Number(value || 0);
}

function toBoolean(value) {
  return Boolean(value);
}

function normalizeExercise(row) {
  return attachExerciseDetailFields({
    id: Number(row.id),
    title: row.title,
    slug: row.slug,
    category_name: row.category_name,
    category_slug: row.category_slug,
    level_name: row.level_name,
    level_slug: row.level_slug,
    focus_label: row.focus_label,
    equipment: row.equipment,
    primary_muscles: row.primary_muscles,
    calorie_burn_text: row.calorie_burn_text,
    hero_image: normalizeNullableMediaPath(row.hero_image),
    short_description: row.short_description,
    long_description: row.long_description,
    video_url: row.video_url,
    expert_tip: row.expert_tip,
    execution_steps_json: row.execution_steps_json,
    common_mistakes_json: row.common_mistakes_json,
    muscle_tags_json: row.muscle_tags_json,
    recommended_sets_json: row.recommended_sets_json,
    related_exercises_json: row.related_exercises_json,
    is_active: row.is_active === undefined ? true : toBoolean(row.is_active),
    sort_order: row.sort_order === undefined ? 0 : toNumber(row.sort_order),
    created_at: row.created_at,
    updated_at: row.updated_at
  });
}

function mapExerciseCard(row, overrides = {}) {
  const normalized = normalizeExercise(row);

  return {
    slug: normalized.slug,
    title: overrides.title || normalized.title,
    hero_image: normalized.hero_image,
    level_name: normalized.level_name,
    category_name: normalized.category_name,
    short_description: normalized.short_description
  };
}

async function getExerciseBySlugOrThrow(slug, includeInactive = false) {
  const conditions = ["slug = ?"];
  const params = [slug];

  if (!includeInactive) {
    conditions.push("is_active = 1");
  }

  const rows = await query(
    `SELECT *
     FROM exercises
     WHERE ${conditions.join(" AND ")}
     LIMIT 1`,
    params
  );

  if (!rows.length) {
    const error = new Error("Exercise not found");
    error.statusCode = 404;
    throw error;
  }

  return normalizeExercise(rows[0]);
}

async function resolveRelatedExercises(exercise) {
  const relatedItems = exercise.related_exercises.filter((item) => item.slug || item.title);
  const relatedSlugs = [...new Set(relatedItems
    .map((item) => item.slug)
    .filter(Boolean)
    .filter((slug) => slug !== exercise.slug))];

  const resolvedItems = [];
  const seenSlugs = new Set([exercise.slug]);

  if (relatedSlugs.length) {
    const placeholders = relatedSlugs.map(() => "?").join(", ");
    const rows = await query(
      `SELECT id, title, slug, hero_image, level_name, category_name, short_description
       FROM exercises
       WHERE slug IN (${placeholders})
         AND is_active = 1`,
      relatedSlugs
    );
    const relatedMap = new Map(rows.map((row) => [row.slug, row]));

    relatedItems.forEach((item) => {
      if (!item.slug) {
        if (item.title) {
          resolvedItems.push({
            slug: "",
            title: item.title,
            hero_image: "",
            level_name: "",
            category_name: "",
            short_description: ""
          });
        }
        return;
      }

      const matched = relatedMap.get(item.slug);
      if (!matched || seenSlugs.has(item.slug)) {
        return;
      }

      resolvedItems.push(mapExerciseCard(matched, { title: item.title }));
      seenSlugs.add(item.slug);
    });
  }

  const slotsRemaining = Math.max(0, 3 - resolvedItems.length);

  if (!slotsRemaining) {
    return resolvedItems.slice(0, 3);
  }

  if (!exercise.category_slug) {
    return resolvedItems.slice(0, 3);
  }

  const autoParams = [exercise.slug, exercise.category_slug];
  const excludePlaceholders = [...seenSlugs]
    .filter((slug) => slug !== exercise.slug)
    .map(() => "?")
    .join(", ");

  if (excludePlaceholders) {
    autoParams.push(...[...seenSlugs].filter((slug) => slug !== exercise.slug));
  }
  const safeLimit = Math.min(3, Math.max(1, Number(slotsRemaining) || 1));

  const rows = await query(
    `SELECT id, title, slug, hero_image, level_name, category_name, short_description
     FROM exercises
     WHERE is_active = 1
       AND slug <> ?
       AND category_slug = ?
       ${excludePlaceholders ? `AND slug NOT IN (${excludePlaceholders})` : ""}
     ORDER BY sort_order ASC, title ASC
     LIMIT ${safeLimit}`,
    autoParams
  );

  return resolvedItems.concat(rows.map((row) => mapExerciseCard(row))).slice(0, 3);
}

exports.getExercises = asyncHandler(async (req, res) => {
  const { category, level, search } = req.query;
  const conditions = ["is_active = 1"];
  const params = [];

  if (category) {
    conditions.push("category_slug = ?");
    params.push(category);
  }

  if (level) {
    conditions.push("level_slug = ?");
    params.push(level);
  }

  if (search) {
    conditions.push("(title LIKE ? OR short_description LIKE ? OR primary_muscles LIKE ?)");
    const likeValue = `%${search}%`;
    params.push(likeValue, likeValue, likeValue);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const exercises = await query(
    `SELECT id, title, slug, category_name, category_slug, level_name, level_slug,
            focus_label, equipment, primary_muscles, calorie_burn_text, hero_image,
            short_description, long_description, video_url, expert_tip,
            execution_steps_json, common_mistakes_json, muscle_tags_json,
            recommended_sets_json, related_exercises_json, is_active, sort_order,
            created_at, updated_at
     FROM exercises
     ${whereClause}
     ORDER BY sort_order ASC, title ASC`,
    params
  );

  res.json({
    success: true,
    count: exercises.length,
    data: exercises.map(normalizeExercise)
  });
});

exports.getExerciseBySlug = asyncHandler(async (req, res) => {
  const exercise = await getExerciseBySlugOrThrow(req.params.slug);
  const relatedExercises = await resolveRelatedExercises(exercise);

  res.json({
    success: true,
    data: {
      ...exercise,
      related_exercises: relatedExercises
    }
  });
});

exports.createExercise = asyncHandler(async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const {
    title,
    slug,
    category_name,
    category_slug,
    level_name,
    level_slug,
    focus_label = null,
    equipment = null,
    primary_muscles = null,
    calorie_burn_text = null,
    hero_image = null,
    short_description = null,
    long_description = null,
    video_url = null,
    expert_tip = null,
    execution_steps = [],
    common_mistakes = [],
    muscle_tags = [],
    recommended_sets = [],
    related_exercises = [],
    is_active = true,
    sort_order = 0
  } = req.body;

  const duplicateRows = await query("SELECT id FROM exercises WHERE slug = ?", [slug]);
  if (duplicateRows.length) {
    return res.status(409).json({
      success: false,
      message: "Exercise slug already exists"
    });
  }

  const detailPayload = serializeExerciseDetailPayload({
    execution_steps,
    common_mistakes,
    muscle_tags,
    recommended_sets,
    related_exercises
  });

  const result = await query(
    `INSERT INTO exercises (
      title, slug, category_name, category_slug, level_name, level_slug, focus_label,
      equipment, primary_muscles, calorie_burn_text, hero_image, short_description,
      long_description, video_url, expert_tip, execution_steps_json, common_mistakes_json,
      muscle_tags_json, recommended_sets_json, related_exercises_json, is_active, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      title,
      slug,
      category_name,
      category_slug,
      level_name,
      level_slug,
      focus_label,
      equipment,
      primary_muscles,
      calorie_burn_text,
      normalizeNullableMediaPath(hero_image),
      short_description,
      long_description,
      video_url,
      expert_tip,
      detailPayload.execution_steps_json,
      detailPayload.common_mistakes_json,
      detailPayload.muscle_tags_json,
      detailPayload.recommended_sets_json,
      detailPayload.related_exercises_json,
      is_active ? 1 : 0,
      sort_order
    ]
  );

  const exercise = await getExerciseBySlugOrThrow(
    (await query("SELECT slug FROM exercises WHERE id = ?", [result.insertId]))[0]?.slug || slug,
    true
  );

  res.status(201).json({
    success: true,
    data: exercise
  });
});

exports.updateExercise = asyncHandler(async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const existingRows = await query("SELECT * FROM exercises WHERE id = ?", [req.params.id]);

  if (!existingRows.length) {
    return res.status(404).json({
      success: false,
      message: "Exercise not found"
    });
  }

  const current = existingRows[0];
  const nextExercise = {
    title: req.body.title ?? current.title,
    slug: req.body.slug ?? current.slug,
    category_name: req.body.category_name ?? current.category_name,
    category_slug: req.body.category_slug ?? current.category_slug,
    level_name: req.body.level_name ?? current.level_name,
    level_slug: req.body.level_slug ?? current.level_slug,
    focus_label: Object.prototype.hasOwnProperty.call(req.body, "focus_label") ? req.body.focus_label : current.focus_label,
    equipment: Object.prototype.hasOwnProperty.call(req.body, "equipment") ? req.body.equipment : current.equipment,
    primary_muscles: Object.prototype.hasOwnProperty.call(req.body, "primary_muscles") ? req.body.primary_muscles : current.primary_muscles,
    calorie_burn_text: Object.prototype.hasOwnProperty.call(req.body, "calorie_burn_text") ? req.body.calorie_burn_text : current.calorie_burn_text,
    hero_image: Object.prototype.hasOwnProperty.call(req.body, "hero_image") ? normalizeNullableMediaPath(req.body.hero_image) : normalizeNullableMediaPath(current.hero_image),
    short_description: Object.prototype.hasOwnProperty.call(req.body, "short_description") ? req.body.short_description : current.short_description,
    long_description: Object.prototype.hasOwnProperty.call(req.body, "long_description") ? req.body.long_description : current.long_description,
    video_url: Object.prototype.hasOwnProperty.call(req.body, "video_url") ? req.body.video_url : current.video_url,
    expert_tip: Object.prototype.hasOwnProperty.call(req.body, "expert_tip") ? req.body.expert_tip : current.expert_tip,
    execution_steps: Object.prototype.hasOwnProperty.call(req.body, "execution_steps") ? req.body.execution_steps : current.execution_steps_json,
    common_mistakes: Object.prototype.hasOwnProperty.call(req.body, "common_mistakes") ? req.body.common_mistakes : current.common_mistakes_json,
    muscle_tags: Object.prototype.hasOwnProperty.call(req.body, "muscle_tags") ? req.body.muscle_tags : current.muscle_tags_json,
    recommended_sets: Object.prototype.hasOwnProperty.call(req.body, "recommended_sets") ? req.body.recommended_sets : current.recommended_sets_json,
    related_exercises: Object.prototype.hasOwnProperty.call(req.body, "related_exercises") ? req.body.related_exercises : current.related_exercises_json,
    is_active: Object.prototype.hasOwnProperty.call(req.body, "is_active") ? req.body.is_active : Boolean(current.is_active),
    sort_order: req.body.sort_order ?? current.sort_order
  };

  const duplicateRows = await query("SELECT id FROM exercises WHERE slug = ? AND id <> ?", [nextExercise.slug, req.params.id]);
  if (duplicateRows.length) {
    return res.status(409).json({
      success: false,
      message: "Exercise slug already exists"
    });
  }

  const detailPayload = serializeExerciseDetailPayload(nextExercise);

  await query(
    `UPDATE exercises
     SET title = ?, slug = ?, category_name = ?, category_slug = ?, level_name = ?, level_slug = ?,
         focus_label = ?, equipment = ?, primary_muscles = ?, calorie_burn_text = ?, hero_image = ?,
         short_description = ?, long_description = ?, video_url = ?, expert_tip = ?, execution_steps_json = ?,
         common_mistakes_json = ?, muscle_tags_json = ?, recommended_sets_json = ?, related_exercises_json = ?,
         is_active = ?, sort_order = ?
     WHERE id = ?`,
    [
      nextExercise.title,
      nextExercise.slug,
      nextExercise.category_name,
      nextExercise.category_slug,
      nextExercise.level_name,
      nextExercise.level_slug,
      nextExercise.focus_label,
      nextExercise.equipment,
      nextExercise.primary_muscles,
      nextExercise.calorie_burn_text,
      nextExercise.hero_image,
      nextExercise.short_description,
      nextExercise.long_description,
      nextExercise.video_url,
      nextExercise.expert_tip,
      detailPayload.execution_steps_json,
      detailPayload.common_mistakes_json,
      detailPayload.muscle_tags_json,
      detailPayload.recommended_sets_json,
      detailPayload.related_exercises_json,
      nextExercise.is_active ? 1 : 0,
      nextExercise.sort_order,
      req.params.id
    ]
  );

  const exercise = await getExerciseBySlugOrThrow(nextExercise.slug, true);

  res.json({
    success: true,
    data: exercise
  });
});

exports.deleteExercise = asyncHandler(async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const result = await query("DELETE FROM exercises WHERE id = ?", [req.params.id]);

  if (!result.affectedRows) {
    return res.status(404).json({
      success: false,
      message: "Exercise not found"
    });
  }

  res.json({
    success: true,
    message: "Exercise deleted"
  });
});
