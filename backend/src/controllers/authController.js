const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const { validationResult } = require("express-validator");
const env = require("../config/env");
const asyncHandler = require("../utils/asyncHandler");
const { query } = require("../services/queryService");
const { normalizeNullableMediaPath } = require("../utils/mediaPaths");

const googleClient = env.google.clientId ? new OAuth2Client(env.google.clientId) : null;

function buildToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
}

function serializeUser(user) {
  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    auth_provider: user.auth_provider || "local",
    avatar_url: normalizeNullableMediaPath(user.avatar_url)
  };
}

async function getUserById(userId) {
  const users = await query(
    `SELECT id, full_name, email, phone, role, auth_provider, avatar_url, created_at
     FROM users
     WHERE id = ?`,
    [userId]
  );

  return users[0];
}

function buildAvatarUrl(req, fileName) {
  return `/uploads/avatars/${fileName}`;
}

function sanitizeProfileInput(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue ? normalizeNullableMediaPath(trimmedValue) : null;
}

exports.register = asyncHandler(async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { full_name, email, password, phone } = req.body;
  const existingUsers = await query("SELECT id FROM users WHERE email = ?", [email]);

  if (existingUsers.length) {
    return res.status(409).json({
      success: false,
      message: "Email này đã được sử dụng"
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await query(
    `INSERT INTO users (full_name, email, password_hash, phone, role, auth_provider)
     VALUES (?, ?, ?, ?, 'member', 'local')`,
    [full_name, email, passwordHash, phone || null]
  );

  const user = await getUserById(result.insertId);

  res.status(201).json({
    success: true,
    data: {
      user: serializeUser(user),
      token: buildToken(user)
    }
  });
});

exports.login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { email, password } = req.body;
  const users = await query("SELECT * FROM users WHERE email = ?", [email]);
  const user = users[0];

  if (!user || !user.password_hash) {
    return res.status(401).json({
      success: false,
      message: "Email hoặc mật khẩu không đúng"
    });
  }

  const isValidPassword = await bcrypt.compare(password, user.password_hash);

  if (!isValidPassword) {
    return res.status(401).json({
      success: false,
      message: "Email hoặc mật khẩu không đúng"
    });
  }

  res.json({
    success: true,
    data: {
      user: serializeUser(user),
      token: buildToken(user)
    }
  });
});

exports.getGoogleConfig = asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    data: {
      enabled: Boolean(env.google.clientId),
      clientId: env.google.clientId || null
    }
  });
});

exports.getCurrentUser = asyncHandler(async (req, res) => {
  const user = await getUserById(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy người dùng"
    });
  }

  res.json({
    success: true,
    data: {
      user: serializeUser(user)
    }
  });
});

exports.updateCurrentUser = asyncHandler(async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const user = await query("SELECT * FROM users WHERE id = ?", [req.user.id]).then((rows) => rows[0]);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy người dùng"
    });
  }

  const hasPhoneField = Object.prototype.hasOwnProperty.call(req.body, "phone");
  const hasAvatarField = Object.prototype.hasOwnProperty.call(req.body, "avatar_url");
  const fullName = sanitizeProfileInput(req.body.full_name) || user.full_name;
  const phone = hasPhoneField ? sanitizeProfileInput(req.body.phone) : user.phone;
  const avatarUrl = hasAvatarField ? sanitizeProfileInput(req.body.avatar_url) : user.avatar_url;
  const currentPassword = req.body.current_password || "";
  const newPassword = req.body.new_password || "";

  let passwordHash = user.password_hash;

  if (newPassword) {
    if (user.auth_provider !== "local") {
      return res.status(400).json({
        success: false,
        message: "Tài khoản Google không thể đổi mật khẩu tại đây"
      });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash || "");

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Mật khẩu hiện tại không đúng"
      });
    }

    passwordHash = await bcrypt.hash(newPassword, 10);
  }

  await query(
    `UPDATE users
     SET full_name = ?, phone = ?, avatar_url = ?, password_hash = ?
     WHERE id = ?`,
    [fullName, phone, avatarUrl, passwordHash, user.id]
  );

  const updatedUser = await getUserById(user.id);

  res.json({
    success: true,
    data: {
      user: serializeUser(updatedUser),
      token: buildToken(updatedUser)
    }
  });
});

exports.uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng chọn ảnh đại diện"
    });
  }

  const avatarUrl = buildAvatarUrl(req, req.file.filename);

  await query(
    "UPDATE users SET avatar_url = ? WHERE id = ?",
    [avatarUrl, req.user.id]
  );

  const updatedUser = await getUserById(req.user.id);

  res.json({
    success: true,
    data: {
      user: serializeUser(updatedUser),
      avatar_url: avatarUrl
    }
  });
});

exports.googleLogin = asyncHandler(async (req, res) => {
  if (!env.google.clientId || !googleClient) {
    return res.status(503).json({
      success: false,
      message: "Đăng nhập Google chưa được cấu hình trên máy chủ"
    });
  }

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { credential } = req.body;
  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: env.google.clientId
  });
  const payload = ticket.getPayload();

  if (!payload || !payload.sub || !payload.email || !payload.email_verified) {
    return res.status(401).json({
      success: false,
      message: "Dữ liệu tài khoản Google không hợp lệ"
    });
  }

  const { sub, email, name, picture } = payload;
  const existingUsers = await query(
    "SELECT * FROM users WHERE google_id = ? OR email = ? LIMIT 1",
    [sub, email]
  );

  let user = existingUsers[0];

  if (!user) {
    const passwordHash = await bcrypt.hash(crypto.randomUUID(), 10);
    const insertResult = await query(
      `INSERT INTO users (
        full_name, email, password_hash, phone, role, auth_provider, google_id, avatar_url
      ) VALUES (?, ?, ?, NULL, 'member', 'google', ?, ?)`,
      [name || email, email, passwordHash, sub, picture || null]
    );

    user = await getUserById(insertResult.insertId);
  } else {
    const nextFullName = user.full_name || name || email;
    const nextAvatarUrl = user.avatar_url || picture || null;

    await query(
      `UPDATE users
       SET full_name = ?,
           auth_provider = 'google',
           google_id = ?,
           avatar_url = ?
       WHERE id = ?`,
      [nextFullName, sub, nextAvatarUrl, user.id]
    );

    user = await getUserById(user.id);
  }

  res.json({
    success: true,
    data: {
      user: serializeUser(user),
      token: buildToken(user)
    }
  });
});
