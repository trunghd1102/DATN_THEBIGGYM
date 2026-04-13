const asyncHandler = require("../utils/asyncHandler");
const { query } = require("../services/queryService");

exports.createTdeeLog = asyncHandler(async (req, res) => {
  const {
    gender,
    age,
    height_cm,
    weight_kg,
    activity_factor,
    bmi,
    body_fat_percent,
    bmr,
    tdee,
    cut_calories,
    bulk_calories,
    protein_grams,
    carbs_grams,
    fats_grams
  } = req.body;

  const result = await query(
    `INSERT INTO tdee_logs
     (user_id, gender, age, height_cm, weight_kg, activity_factor, bmi, body_fat_percent,
      bmr, tdee, cut_calories, bulk_calories, protein_grams, carbs_grams, fats_grams)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.user?.id || null,
      gender,
      age,
      height_cm,
      weight_kg,
      activity_factor,
      bmi || null,
      body_fat_percent || null,
      bmr || null,
      tdee,
      cut_calories,
      bulk_calories,
      protein_grams || null,
      carbs_grams || null,
      fats_grams || null
    ]
  );

  res.status(201).json({
    success: true,
    data: {
      id: result.insertId
    }
  });
});

exports.getMyTdeeLogs = asyncHandler(async (req, res) => {
  const logs = await query(
    `SELECT * FROM tdee_logs
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [req.user.id]
  );

  res.json({
    success: true,
    count: logs.length,
    data: logs
  });
});
