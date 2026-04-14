const { normalizeNullableMediaPath } = require("./mediaPaths");

const ACTIVE_SLOT_BOOKING_STATUSES = ["pending", "confirmed", "completed"];

function parseJsonArray(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed)
      ? parsed.map((item) => String(item || "").trim()).filter(Boolean)
      : [];
  } catch (_error) {
    return String(value)
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function toNumber(value, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function toBoolean(value) {
  return Boolean(Number.isFinite(Number(value)) ? Number(value) : value);
}

function normalizeTrainer(row) {
  return {
    id: Number(row.id),
    user_id: row.user_id === null || row.user_id === undefined ? null : Number(row.user_id),
    slug: row.slug,
    full_name: row.full_name,
    role_title: row.role_title,
    expertise_label: row.expertise_label,
    experience_years: toNumber(row.experience_years),
    short_bio: row.short_bio,
    full_bio: row.full_bio,
    portrait_image_url: normalizeNullableMediaPath(row.portrait_image_url),
    hero_image_url: normalizeNullableMediaPath(row.hero_image_url),
    specialty_tags: parseJsonArray(row.specialty_tags_json),
    feature_points: parseJsonArray(row.feature_points_json),
    accent_color: row.accent_color || "#f2ca50",
    is_featured: toBoolean(row.is_featured),
    is_active: toBoolean(row.is_active),
    sort_order: toNumber(row.sort_order),
    created_at: row.created_at,
    updated_at: row.updated_at,
    available_slots_count: row.available_slots_count === undefined ? undefined : toNumber(row.available_slots_count),
    next_slot_start: row.next_slot_start || null
  };
}

function normalizeSlot(row) {
  const capacity = toNumber(row.capacity, 1);
  const bookingsCount = toNumber(row.bookings_count, 0);

  return {
    id: Number(row.id),
    trainer_id: Number(row.trainer_id),
    trainer_name: row.trainer_name || null,
    trainer_slug: row.trainer_slug || null,
    trainer_portrait_image_url: normalizeNullableMediaPath(row.trainer_portrait_image_url),
    slot_start: row.slot_start,
    slot_end: row.slot_end,
    location_label: row.location_label,
    session_label: row.session_label,
    capacity,
    is_active: toBoolean(row.is_active),
    admin_note: row.admin_note,
    created_at: row.created_at,
    updated_at: row.updated_at,
    bookings_count: bookingsCount,
    remaining_capacity: Math.max(capacity - bookingsCount, 0)
  };
}

function normalizeBooking(row) {
  return {
    id: Number(row.id),
    booking_code: row.booking_code,
    trainer_id: Number(row.trainer_id),
    trainer_name: row.trainer_name,
    trainer_slug: row.trainer_slug || null,
    trainer_portrait_image_url: normalizeNullableMediaPath(row.trainer_portrait_image_url),
    slot_id: Number(row.slot_id),
    slot_start: row.slot_start,
    slot_end: row.slot_end,
    location_label: row.location_label,
    session_label: row.session_label,
    user_id: row.user_id === null || row.user_id === undefined ? null : Number(row.user_id),
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    goal_label: row.goal_label,
    fitness_level: row.fitness_level,
    preferred_focus: row.preferred_focus,
    note: row.note,
    status: row.status,
    admin_note: row.admin_note,
    created_at: row.created_at,
    updated_at: row.updated_at,
    status_updated_at: row.status_updated_at
  };
}

function buildBookingCode() {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `PT${datePart}${randomPart}`;
}

module.exports = {
  ACTIVE_SLOT_BOOKING_STATUSES,
  parseJsonArray,
  normalizeTrainer,
  normalizeSlot,
  normalizeBooking,
  buildBookingCode
};
