const { body, param, validationResult } = require("express-validator");
const asyncHandler = require("../utils/asyncHandler");
const { query } = require("../services/queryService");
const { normalizeTrainer, normalizeSlot, normalizeBooking, parseJsonArray } = require("../utils/ptData");

const BOOKING_STATUSES = ["pending", "confirmed", "completed", "cancelled", "rejected", "no_show"];

function handleValidation(req, res) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorList = errors.array();
    res.status(400).json({
      success: false,
      message: errorList[0]?.msg || "Dữ liệu không hợp lệ",
      errors: errorList
    });
    return false;
  }

  return true;
}

function toNullableString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

function toBooleanNumber(value) {
  return value ? 1 : 0;
}

function buildAbsoluteUrl(req, relativePath) {
  return `${req.protocol}://${req.get("host")}${relativePath}`;
}

exports.validators = {
  saveTrainer: [
    body("user_id").optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage("Tài khoản HLV không hợp lệ"),
    body("slug").trim().isLength({ min: 2, max: 160 }).withMessage("Slug tối thiểu 2 ký tự"),
    body("full_name").trim().isLength({ min: 2, max: 150 }).withMessage("Tên HLV tối thiểu 2 ký tự"),
    body("role_title").trim().isLength({ min: 2, max: 150 }).withMessage("Vai trò hiển thị tối thiểu 2 ký tự"),
    body("expertise_label").trim().isLength({ min: 2, max: 150 }).withMessage("Chuyên môn hiển thị tối thiểu 2 ký tự"),
    body("experience_years").isInt({ min: 0, max: 80 }).withMessage("Số năm kinh nghiệm không hợp lệ"),
    body("short_bio").optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 1000 }).withMessage("Mô tả ngắn tối đa 1000 ký tự"),
    body("full_bio").optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 4000 }).withMessage("Mô tả chi tiết tối đa 4000 ký tự"),
    body("portrait_image_url").optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 255 }).withMessage("Ảnh chân dung không hợp lệ"),
    body("hero_image_url").optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 255 }).withMessage("Ảnh hero không hợp lệ"),
    body("accent_color").optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 20 }).withMessage("Màu nhấn không hợp lệ"),
    body("sort_order").optional().isInt({ min: 0 }).withMessage("Thứ tự hiển thị không hợp lệ"),
    body("specialty_tags").optional({ nullable: true }).isArray().withMessage("Danh sách specialty_tags phải là mảng"),
    body("feature_points").optional({ nullable: true }).isArray().withMessage("Danh sách feature_points phải là mảng"),
    body("is_featured").optional().isBoolean().withMessage("Trạng thái featured không hợp lệ"),
    body("is_active").optional().isBoolean().withMessage("Trạng thái active không hợp lệ"),
    param("id").optional().isInt({ min: 1 }).withMessage("HLV không hợp lệ")
  ],
  saveSlot: [
    body("trainer_id").isInt({ min: 1 }).withMessage("HLV không hợp lệ"),
    body("slot_start").isISO8601().withMessage("Thời gian bắt đầu không hợp lệ"),
    body("slot_end").isISO8601().withMessage("Thời gian kết thúc không hợp lệ"),
    body("location_label").optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 150 }).withMessage("Địa điểm tối đa 150 ký tự"),
    body("session_label").optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 150 }).withMessage("Tên session tối đa 150 ký tự"),
    body("capacity").optional().isInt({ min: 1, max: 10 }).withMessage("Sức chứa mỗi slot phải từ 1 đến 10"),
    body("admin_note").optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 255 }).withMessage("Ghi chú admin tối đa 255 ký tự"),
    body("is_active").optional().isBoolean().withMessage("Trạng thái slot không hợp lệ"),
    param("id").optional().isInt({ min: 1 }).withMessage("Slot không hợp lệ")
  ],
  updateBookingStatus: [
    param("id").isInt({ min: 1 }).withMessage("Booking không hợp lệ"),
    body("status").isIn(BOOKING_STATUSES).withMessage("Trạng thái booking không hợp lệ"),
    body("admin_note").optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 2000 }).withMessage("Ghi chú admin tối đa 2000 ký tự")
  ]
};

exports.getDashboard = asyncHandler(async (_req, res) => {
  const [trainerRows, slotRows, bookingRows, summaryRows] = await Promise.all([
    query(
      `SELECT t.*,
              COUNT(CASE WHEN s.id IS NOT NULL AND b.id IS NULL THEN 1 END) AS available_slots_count,
              MIN(CASE WHEN s.id IS NOT NULL AND b.id IS NULL THEN s.slot_start END) AS next_slot_start
       FROM pt_trainers t
       LEFT JOIN pt_booking_slots s
         ON s.trainer_id = t.id
        AND s.is_active = 1
        AND s.slot_end >= NOW()
       LEFT JOIN pt_bookings b
         ON b.slot_id = s.id
        AND b.status IN ('pending', 'confirmed', 'completed')
       GROUP BY t.id
       ORDER BY t.sort_order ASC, t.full_name ASC`
    ),
    query(
      `SELECT s.*,
              t.full_name AS trainer_name,
              t.slug AS trainer_slug,
              t.portrait_image_url AS trainer_portrait_image_url,
              COUNT(b.id) AS bookings_count
       FROM pt_booking_slots s
       INNER JOIN pt_trainers t ON t.id = s.trainer_id
       LEFT JOIN pt_bookings b
         ON b.slot_id = s.id
        AND b.status IN ('pending', 'confirmed', 'completed')
       GROUP BY s.id, t.full_name, t.slug, t.portrait_image_url
       ORDER BY s.slot_start ASC
       LIMIT 200`
    ),
    query(
      `SELECT b.*,
              t.full_name AS trainer_name,
              t.slug AS trainer_slug,
              t.portrait_image_url AS trainer_portrait_image_url,
              s.slot_start,
              s.slot_end,
              s.location_label,
              s.session_label
       FROM pt_bookings b
       INNER JOIN pt_trainers t ON t.id = b.trainer_id
       INNER JOIN pt_booking_slots s ON s.id = b.slot_id
       ORDER BY FIELD(b.status, 'pending', 'confirmed', 'completed', 'cancelled', 'rejected', 'no_show'),
                s.slot_start ASC,
                b.created_at DESC
       LIMIT 300`
    ),
    query(
      `SELECT
          (SELECT COUNT(*) FROM pt_trainers WHERE is_active = 1) AS active_trainers,
          (SELECT COUNT(*) FROM pt_booking_slots WHERE is_active = 1 AND slot_end >= NOW()) AS active_slots,
          (SELECT COUNT(*) FROM pt_bookings WHERE status = 'pending') AS pending_bookings,
          (SELECT COUNT(*) FROM pt_bookings WHERE status = 'confirmed' AND DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) AS confirmed_last_30_days`
    )
  ]);

  res.json({
    success: true,
    data: {
      summary: {
        active_trainers: Number(summaryRows[0]?.active_trainers || 0),
        active_slots: Number(summaryRows[0]?.active_slots || 0),
        pending_bookings: Number(summaryRows[0]?.pending_bookings || 0),
        confirmed_last_30_days: Number(summaryRows[0]?.confirmed_last_30_days || 0)
      },
      trainers: trainerRows.map(normalizeTrainer),
      slots: slotRows.map(normalizeSlot),
      bookings: bookingRows.map(normalizeBooking)
    }
  });
});

exports.uploadTrainerImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng chọn ảnh huấn luyện viên"
    });
  }

  const imageUrl = buildAbsoluteUrl(req, `/uploads/pt/${req.file.filename}`);

  res.json({
    success: true,
    data: {
      image_url: imageUrl
    }
  });
});

exports.saveTrainer = asyncHandler(async (req, res) => {
  if (!handleValidation(req, res)) {
    return;
  }

  const trainerId = req.params.id ? Number(req.params.id) : null;
  const payload = {
    user_id: req.body.user_id ? Number(req.body.user_id) : null,
    slug: String(req.body.slug || "").trim(),
    full_name: String(req.body.full_name || "").trim(),
    role_title: String(req.body.role_title || "").trim(),
    expertise_label: String(req.body.expertise_label || "").trim(),
    experience_years: Number(req.body.experience_years || 0),
    short_bio: toNullableString(req.body.short_bio),
    full_bio: toNullableString(req.body.full_bio),
    portrait_image_url: toNullableString(req.body.portrait_image_url),
    hero_image_url: toNullableString(req.body.hero_image_url),
    specialty_tags_json: JSON.stringify(parseJsonArray(req.body.specialty_tags || [])),
    feature_points_json: JSON.stringify(parseJsonArray(req.body.feature_points || [])),
    accent_color: toNullableString(req.body.accent_color) || "#f2ca50",
    is_featured: toBooleanNumber(Boolean(req.body.is_featured)),
    is_active: toBooleanNumber(req.body.is_active !== false),
    sort_order: Number(req.body.sort_order || 0)
  };

  const duplicateRows = await query(
    `SELECT id
     FROM pt_trainers
     WHERE slug = ?
       AND (? IS NULL OR id <> ?)
     LIMIT 1`,
    [payload.slug, trainerId, trainerId]
  );

  if (duplicateRows.length) {
    return res.status(409).json({
      success: false,
      message: "Slug HLV đã tồn tại"
    });
  }

  if (trainerId) {
    await query(
      `UPDATE pt_trainers
       SET user_id = ?, slug = ?, full_name = ?, role_title = ?, expertise_label = ?, experience_years = ?,
           short_bio = ?, full_bio = ?, portrait_image_url = ?, hero_image_url = ?,
           specialty_tags_json = ?, feature_points_json = ?, accent_color = ?, is_featured = ?, is_active = ?, sort_order = ?
       WHERE id = ?`,
      [
        payload.user_id,
        payload.slug,
        payload.full_name,
        payload.role_title,
        payload.expertise_label,
        payload.experience_years,
        payload.short_bio,
        payload.full_bio,
        payload.portrait_image_url,
        payload.hero_image_url,
        payload.specialty_tags_json,
        payload.feature_points_json,
        payload.accent_color,
        payload.is_featured,
        payload.is_active,
        payload.sort_order,
        trainerId
      ]
    );
  } else {
    const result = await query(
      `INSERT INTO pt_trainers (
        user_id, slug, full_name, role_title, expertise_label, experience_years,
        short_bio, full_bio, portrait_image_url, hero_image_url,
        specialty_tags_json, feature_points_json, accent_color, is_featured, is_active, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.user_id,
        payload.slug,
        payload.full_name,
        payload.role_title,
        payload.expertise_label,
        payload.experience_years,
        payload.short_bio,
        payload.full_bio,
        payload.portrait_image_url,
        payload.hero_image_url,
        payload.specialty_tags_json,
        payload.feature_points_json,
        payload.accent_color,
        payload.is_featured,
        payload.is_active,
        payload.sort_order
      ]
    );
    req.params.id = String(result.insertId);
  }

  res.json({
    success: true,
    message: trainerId ? "Đã cập nhật HLV PT" : "Đã tạo HLV PT"
  });
});

exports.saveSlot = asyncHandler(async (req, res) => {
  if (!handleValidation(req, res)) {
    return;
  }

  const slotId = req.params.id ? Number(req.params.id) : null;
  const slotStart = new Date(req.body.slot_start);
  const slotEnd = new Date(req.body.slot_end);

  if (Number.isNaN(slotStart.getTime()) || Number.isNaN(slotEnd.getTime()) || slotEnd <= slotStart) {
    return res.status(400).json({
      success: false,
      message: "Khoảng thời gian slot không hợp lệ"
    });
  }

  const existingRows = await query(
    `SELECT id
     FROM pt_booking_slots
     WHERE trainer_id = ?
       AND slot_start = ?
       AND (? IS NULL OR id <> ?)
     LIMIT 1`,
    [Number(req.body.trainer_id), req.body.slot_start, slotId, slotId]
  );

  if (existingRows.length) {
    return res.status(409).json({
      success: false,
      message: "HLV này đã có slot đúng thời gian bắt đầu như trên"
    });
  }

  const payload = [
    Number(req.body.trainer_id),
    req.body.slot_start,
    req.body.slot_end,
    toNullableString(req.body.location_label),
    toNullableString(req.body.session_label),
    Number(req.body.capacity || 1),
    toBooleanNumber(req.body.is_active !== false),
    toNullableString(req.body.admin_note)
  ];

  if (slotId) {
    await query(
      `UPDATE pt_booking_slots
       SET trainer_id = ?, slot_start = ?, slot_end = ?, location_label = ?, session_label = ?,
           capacity = ?, is_active = ?, admin_note = ?
       WHERE id = ?`,
      [...payload, slotId]
    );
  } else {
    await query(
      `INSERT INTO pt_booking_slots (
        trainer_id, slot_start, slot_end, location_label, session_label, capacity, is_active, admin_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      payload
    );
  }

  res.json({
    success: true,
    message: slotId ? "Đã cập nhật slot PT" : "Đã tạo slot PT"
  });
});

exports.updateBookingStatus = asyncHandler(async (req, res) => {
  if (!handleValidation(req, res)) {
    return;
  }

  await query(
    `UPDATE pt_bookings
     SET status = ?, admin_note = ?, status_updated_at = NOW()
     WHERE id = ?`,
    [req.body.status, toNullableString(req.body.admin_note), Number(req.params.id)]
  );

  res.json({
    success: true,
    message: "Đã cập nhật trạng thái booking PT"
  });
});
