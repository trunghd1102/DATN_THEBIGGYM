const asyncHandler = require("../utils/asyncHandler");
const { query } = require("../services/queryService");

exports.getHealth = asyncHandler(async (req, res) => {
  const dbPing = await query("SELECT 1 AS ok");

  res.json({
    success: true,
    message: "API is running",
    database: dbPing[0]?.ok === 1 ? "connected" : "unknown"
  });
});
