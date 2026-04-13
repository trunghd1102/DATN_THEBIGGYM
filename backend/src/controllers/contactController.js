const asyncHandler = require("../utils/asyncHandler");
const { query } = require("../services/queryService");

exports.getContactMeta = asyncHandler(async (_req, res) => {
  const rows = await query(
    `SELECT shop_name, contact_email, contact_phone, address, hero_title, hero_subtitle
     FROM shop_settings
     WHERE id = 1
     LIMIT 1`
  );

  res.json({
    success: true,
    data: rows[0] || null
  });
});

exports.createContactMessage = asyncHandler(async (req, res) => {
  const { full_name, email, phone, subject, message } = req.body;
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
  const normalizedPhone = (phone || linkedUser?.phone || "").trim() || null;
  const normalizedSubject = (subject || "").trim() || null;
  const normalizedMessage = (message || "").trim();

  if (!normalizedFullName || !normalizedEmail || !normalizedMessage) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng điền họ tên, email và nội dung liên hệ"
    });
  }

  const result = await query(
    `INSERT INTO contact_messages (user_id, full_name, email, phone, subject, message)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [linkedUser?.id || null, normalizedFullName, normalizedEmail, normalizedPhone, normalizedSubject, normalizedMessage]
  );

  res.status(201).json({
    success: true,
    data: {
      id: result.insertId,
      linked_user_id: linkedUser?.id || null
    }
  });
});
