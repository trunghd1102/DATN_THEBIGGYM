const jwt = require("jsonwebtoken");
const env = require("../config/env");

function auth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Thiếu token xác thực hoặc token không hợp lệ"
    });
  }

  const token = authHeader.replace("Bearer ", "").trim();

  try {
    const payload = jwt.verify(token, env.jwt.secret);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Token đã hết hạn hoặc không hợp lệ"
    });
  }
}

module.exports = auth;
