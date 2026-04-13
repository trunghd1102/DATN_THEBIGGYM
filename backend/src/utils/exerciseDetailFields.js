const DETAIL_JSON_COLUMNS = {
  execution_steps: "execution_steps_json",
  common_mistakes: "common_mistakes_json",
  muscle_tags: "muscle_tags_json",
  recommended_sets: "recommended_sets_json",
  related_exercises: "related_exercises_json"
};

function parseJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function sanitizeText(value) {
  return String(value ?? "").trim();
}

function normalizeExecutionSteps(value) {
  return parseJsonArray(value)
    .map((item) => ({
      title: sanitizeText(item?.title),
      body: sanitizeText(item?.body)
    }))
    .filter((item) => item.title && item.body);
}

function normalizeTextList(value) {
  return parseJsonArray(value)
    .map((item) => sanitizeText(item))
    .filter(Boolean);
}

function normalizeRelatedExercises(value) {
  return parseJsonArray(value)
    .map((item) => ({
      slug: sanitizeText(item?.slug),
      title: sanitizeText(item?.title)
    }))
    .filter((item) => item.slug || item.title);
}

function normalizeExerciseDetailPayload(source = {}) {
  return {
    execution_steps: normalizeExecutionSteps(source.execution_steps || source.execution_steps_json),
    common_mistakes: normalizeTextList(source.common_mistakes || source.common_mistakes_json),
    muscle_tags: normalizeTextList(source.muscle_tags || source.muscle_tags_json),
    recommended_sets: normalizeTextList(source.recommended_sets || source.recommended_sets_json),
    related_exercises: normalizeRelatedExercises(source.related_exercises || source.related_exercises_json)
  };
}

function serializeExerciseDetailPayload(source = {}) {
  const normalized = normalizeExerciseDetailPayload(source);

  return {
    execution_steps_json: JSON.stringify(normalized.execution_steps),
    common_mistakes_json: JSON.stringify(normalized.common_mistakes),
    muscle_tags_json: JSON.stringify(normalized.muscle_tags),
    recommended_sets_json: JSON.stringify(normalized.recommended_sets),
    related_exercises_json: JSON.stringify(normalized.related_exercises)
  };
}

function attachExerciseDetailFields(row = {}) {
  return {
    ...row,
    ...normalizeExerciseDetailPayload(row)
  };
}

module.exports = {
  DETAIL_JSON_COLUMNS,
  attachExerciseDetailFields,
  normalizeExerciseDetailPayload,
  serializeExerciseDetailPayload
};
