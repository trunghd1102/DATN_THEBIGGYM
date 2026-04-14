const { body, query: queryValidator, validationResult } = require("express-validator");
const asyncHandler = require("../utils/asyncHandler");
const { query, pool } = require("../services/queryService");
const {
  ACTIVE_SLOT_BOOKING_STATUSES,
  normalizeTrainer,
  normalizeSlot,
  normalizeBooking,
  buildBookingCode
} = require("../utils/ptData");

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

exports.validators = {
  getSlots: [
    queryValidator("trainer_id").optional().isInt({ min: 1 }).withMessage("Huấn luyện viên không hợp lệ"),
    queryValidator("date_from").optional().isISO8601().withMessage("Ngày bắt đầu không hợp lệ"),
    queryValidator("date_to").optional().isISO8601().withMessage("Ngày kết thúc không hợp lệ")
  ],
  createBooking: [
    body("trainer_id").isInt({ min: 1 }).withMessage("Huấn luyện viên không hợp lệ"),
    body("slot_id").isInt({ min: 1 }).withMessage("Khung giờ không hợp lệ"),
    body("full_name").optional({ nullable: true, checkFalsy: true }).trim().isLength({ min: 2, max: 150 }).withMessage("Họ tên tối thiểu 2 ký tự"),
    body("email").optional({ nullable: true, checkFalsy: true }).isEmail().withMessage("Email không hợp lệ"),
    body("phone").optional({ nullable: true, checkFalsy: true }).trim().isLength({ min: 8, max: 30 }).withMessage("Số điện thoại không hợp lệ"),
    body("goal_label").trim().isLength({ min: 3, max: 150 }).withMessage("Mục tiêu tập luyện tối thiểu 3 ký tự"),
    body("fitness_level").optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 100 }).withMessage("Mức độ hiện tại không hợp lệ"),
    body("preferred_focus").optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 150 }).withMessage("Trọng tâm buổi tập không hợp lệ"),
    body("note").optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 2000 }).withMessage("Ghi chú tối đa 2000 ký tự")
  ]
};

exports.getTrainers = asyncHandler(async (_req, res) => {
  const rows = await query(
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
     WHERE t.is_active = 1
     GROUP BY t.id
     ORDER BY t.is_featured DESC, t.sort_order ASC, t.full_name ASC`
  );

  res.json({
    success: true,
    data: rows.map(normalizeTrainer)
  });
});

exports.getAvailableSlots = asyncHandler(async (req, res) => {
  if (!handleValidation(req, res)) {
    return;
  }

  const conditions = ["s.is_active = 1", "s.slot_end >= NOW()", "b.id IS NULL"];
  const params = [];

  if (req.query.trainer_id) {
    conditions.push("s.trainer_id = ?");
    params.push(Number(req.query.trainer_id));
  }

  if (req.query.date_from) {
    conditions.push("DATE(s.slot_start) >= DATE(?)");
    params.push(req.query.date_from);
  }

  if (req.query.date_to) {
    conditions.push("DATE(s.slot_start) <= DATE(?)");
    params.push(req.query.date_to);
  }

  const rows = await query(
    `SELECT s.*,
            t.full_name AS trainer_name,
            t.slug AS trainer_slug,
            t.portrait_image_url AS trainer_portrait_image_url,
            COUNT(active_bookings.id) AS bookings_count
     FROM pt_booking_slots s
     INNER JOIN pt_trainers t ON t.id = s.trainer_id AND t.is_active = 1
     LEFT JOIN pt_bookings active_bookings
       ON active_bookings.slot_id = s.id
      AND active_bookings.status IN ('pending', 'confirmed', 'completed')
     LEFT JOIN pt_bookings b
       ON b.slot_id = s.id
      AND b.status IN ('pending', 'confirmed', 'completed')
     WHERE ${conditions.join(" AND ")}
     GROUP BY s.id, t.full_name, t.slug, t.portrait_image_url
     ORDER BY s.slot_start ASC`,
    params
  );

  res.json({
    success: true,
    data: rows.map(normalizeSlot)
  });
});

exports.createBooking = asyncHandler(async (req, res) => {
  if (!handleValidation(req, res)) {
    return;
  }

  const {
    trainer_id,
    slot_id,
    full_name,
    email,
    phone,
    goal_label,
    fitness_level = null,
    preferred_focus = null,
    note = null
  } = req.body;

  let linkedUser = null;

  if (req.user?.id) {
    const userRows = await query(
      `SELECT id, full_name, email, phone
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [req.user.id]
    );
    linkedUser = userRows[0] || null;
  }

  const normalizedFullName = (linkedUser?.full_name || full_name || "").trim();
  const normalizedEmail = (linkedUser?.email || email || "").trim();
  const normalizedPhone = (phone || linkedUser?.phone || "").trim();

  if (!normalizedFullName || !normalizedEmail || !normalizedPhone) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng điền đủ họ tên, email và số điện thoại"
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [slotRows] = await connection.execute(
      `SELECT s.id, s.trainer_id, s.slot_start, s.slot_end, s.is_active,
              t.full_name AS trainer_name, t.slug AS trainer_slug, t.is_active AS trainer_is_active
       FROM pt_booking_slots s
       INNER JOIN pt_trainers t ON t.id = s.trainer_id
       WHERE s.id = ?
         AND s.trainer_id = ?
       FOR UPDATE`,
      [Number(slot_id), Number(trainer_id)]
    );

    const slot = slotRows[0];

    if (!slot || !slot.is_active || !slot.trainer_is_active) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Khung giờ bạn chọn không còn khả dụng"
      });
    }

    if (new Date(slot.slot_start).getTime() <= Date.now()) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Khung giờ này đã qua, vui lòng chọn lịch khác"
      });
    }

    const [bookingRows] = await connection.execute(
      `SELECT id
       FROM pt_bookings
       WHERE slot_id = ?
         AND status IN ('pending', 'confirmed', 'completed')
       LIMIT 1
       FOR UPDATE`,
      [Number(slot_id)]
    );

    if (bookingRows.length) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: "Khung giờ này vừa được đặt, vui lòng chọn giờ khác"
      });
    }

    let bookingCode = buildBookingCode();
    const [duplicateCode] = await connection.execute(
      `SELECT id
       FROM pt_bookings
       WHERE booking_code = ?
       LIMIT 1`,
      [bookingCode]
    );
    if (duplicateCode.length) {
      bookingCode = buildBookingCode();
    }

    const [result] = await connection.execute(
      `INSERT INTO pt_bookings (
        booking_code,
        trainer_id,
        slot_id,
        user_id,
        full_name,
        email,
        phone,
        goal_label,
        fitness_level,
        preferred_focus,
        note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bookingCode,
        Number(trainer_id),
        Number(slot_id),
        linkedUser?.id || null,
        normalizedFullName,
        normalizedEmail,
        normalizedPhone,
        String(goal_label || "").trim(),
        fitness_level ? String(fitness_level).trim() : null,
        preferred_focus ? String(preferred_focus).trim() : null,
        note ? String(note).trim() : null
      ]
    );

    const [createdRows] = await connection.execute(
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
       WHERE b.id = ?
       LIMIT 1`,
      [result.insertId]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Yêu cầu đặt lịch PT đã được ghi nhận",
      data: normalizeBooking(createdRows[0])
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

exports.getMyBookings = asyncHandler(async (req, res) => {
  const rows = await query(
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
     WHERE b.user_id = ?
     ORDER BY s.slot_start DESC, b.created_at DESC`,
    [req.user.id]
  );

  res.json({
    success: true,
    data: rows.map(normalizeBooking)
  });
});
