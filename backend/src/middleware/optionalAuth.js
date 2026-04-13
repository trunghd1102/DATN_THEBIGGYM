const jwt = require("jsonwebtoken");
const env = require("../config/env");

function optionalAuth(req, _res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = authHeader.replace("Bearer ", "").trim();

  try {
    const payload = jwt.verify(token, env.jwt.secret);
    req.user = payload;
  } catch (_error) {
    req.user = null;
  }

  next();
}

module.exports = optionalAuth;
