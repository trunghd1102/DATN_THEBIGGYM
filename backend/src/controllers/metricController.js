const asyncHandler = require("../utils/asyncHandler");
const { query } = require("../services/queryService");

exports.createMetric = asyncHandler(async (req, res) => {
  const {
    user_id,
    weight_kg,
    height_cm,
    body_fat_percent,
    bmi,
    recorded_at,
    note
  } = req.body;

  const result = await query(
    `INSERT INTO body_metrics
     (user_id, weight_kg, height_cm, body_fat_percent, bmi, recorded_at, note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      user_id || null,
      weight_kg,
      height_cm,
      body_fat_percent || null,
      bmi || null,
      recorded_at || new Date(),
      note || null
    ]
  );

  res.status(201).json({
    success: true,
    data: {
      id: result.insertId
    }
  });
});

exports.getMetricsByUser = asyncHandler(async (req, res) => {
  const metrics = await query(
    `SELECT id, user_id, weight_kg, height_cm, body_fat_percent, bmi, recorded_at, note
     FROM body_metrics
     WHERE user_id = ?
     ORDER BY recorded_at DESC`,
    [req.params.userId]
  );

  res.json({
    success: true,
    count: metrics.length,
    data: metrics
  });
});
