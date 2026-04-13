const { normalizeStoredMediaPath } = require("./mediaPaths");

const DETAIL_JSON_COLUMNS = {
  gallery_images: "gallery_images_json",
  flavors: "flavors_json",
  sizes: "sizes_json",
  feature_cards: "feature_cards_json",
  quick_info: "quick_info_json",
  highlights: "highlights_json",
  usage_guide: "usage_guide_json",
  notes: "notes_json"
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

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function normalizeGalleryImages(value) {
  return parseJsonArray(value)
    .map((item) => normalizeStoredMediaPath(item))
    .filter(Boolean);
}

function normalizeFlavors(value) {
  return parseJsonArray(value)
    .map((item) => ({
      label: sanitizeText(item?.label),
      image_url: normalizeStoredMediaPath(item?.image_url)
    }))
    .filter((item) => item.label);
}

function normalizeSizes(value) {
  return parseJsonArray(value)
    .map((item) => ({
      label: sanitizeText(item?.label),
      price: toNumberOrNull(item?.price),
      original_price: toNumberOrNull(item?.original_price),
      image_url: normalizeStoredMediaPath(item?.image_url)
    }))
    .filter((item) => item.label);
}

function normalizePairedItems(value) {
  return parseJsonArray(value)
    .map((item) => ({
      title: sanitizeText(item?.title),
      body: sanitizeText(item?.body)
    }))
    .filter((item) => item.title && item.body);
}

function normalizeKeyValueItems(value) {
  return parseJsonArray(value)
    .map((item) => ({
      label: sanitizeText(item?.label),
      value: sanitizeText(item?.value)
    }))
    .filter((item) => item.label && item.value);
}

function normalizeNotes(value) {
  return parseJsonArray(value)
    .map((item) => sanitizeText(item))
    .filter(Boolean);
}

function normalizeDetailPayload(source = {}) {
  return {
    gallery_images: normalizeGalleryImages(source.gallery_images || source.gallery_images_json),
    flavors: normalizeFlavors(source.flavors || source.flavors_json),
    sizes: normalizeSizes(source.sizes || source.sizes_json),
    feature_cards: normalizePairedItems(source.feature_cards || source.feature_cards_json),
    quick_info: normalizeKeyValueItems(source.quick_info || source.quick_info_json),
    highlights: normalizePairedItems(source.highlights || source.highlights_json),
    usage_guide: normalizePairedItems(source.usage_guide || source.usage_guide_json),
    notes: normalizeNotes(source.notes || source.notes_json)
  };
}

function serializeDetailPayload(source = {}) {
  const normalized = normalizeDetailPayload(source);

  return {
    gallery_images_json: JSON.stringify(normalized.gallery_images),
    flavors_json: JSON.stringify(normalized.flavors),
    sizes_json: JSON.stringify(normalized.sizes),
    feature_cards_json: JSON.stringify(normalized.feature_cards),
    quick_info_json: JSON.stringify(normalized.quick_info),
    highlights_json: JSON.stringify(normalized.highlights),
    usage_guide_json: JSON.stringify(normalized.usage_guide),
    notes_json: JSON.stringify(normalized.notes)
  };
}

function attachDetailFields(row = {}) {
  const normalized = normalizeDetailPayload(row);
  return {
    ...row,
    ...normalized
  };
}

module.exports = {
  DETAIL_JSON_COLUMNS,
  attachDetailFields,
  normalizeDetailPayload,
  serializeDetailPayload
};
