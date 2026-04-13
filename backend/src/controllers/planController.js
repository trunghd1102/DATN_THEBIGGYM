const asyncHandler = require("../utils/asyncHandler");
const { query, pool } = require("../services/queryService");

exports.getPlans = asyncHandler(async (req, res) => {
  const plans = await query(
    `SELECT id, user_id, title, goal, level, duration_weeks, notes, created_at
     FROM workout_plans
     ORDER BY created_at DESC`
  );

  res.json({
    success: true,
    count: plans.length,
    data: plans
  });
});

exports.createPlan = asyncHandler(async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { user_id, title, goal, level, duration_weeks, notes, items = [] } = req.body;

    const [planResult] = await connection.execute(
      `INSERT INTO workout_plans (user_id, title, goal, level, duration_weeks, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user_id || null, title, goal, level, duration_weeks || null, notes || null]
    );

    for (const item of items) {
      await connection.execute(
        `INSERT INTO workout_plan_items
         (workout_plan_id, day_label, exercise_id, sets_count, reps_text, rest_seconds, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          planResult.insertId,
          item.day_label,
          item.exercise_id,
          item.sets_count || null,
          item.reps_text || null,
          item.rest_seconds || null,
          item.sort_order || 1
        ]
      );
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      data: {
        id: planResult.insertId
      }
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});
