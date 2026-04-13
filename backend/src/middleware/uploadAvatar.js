const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDirectory = path.join(__dirname, "..", "..", "uploads", "avatars");

fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDirectory);
  },
  filename: (req, file, callback) => {
    const safeExtension = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    const timestamp = Date.now();
    const userId = req.user?.id || "guest";
    callback(null, `avatar-${userId}-${timestamp}${safeExtension}`);
  }
});

function fileFilter(_req, file, callback) {
  if (!file.mimetype.startsWith("image/")) {
    callback(new Error("Chỉ chấp nhận tệp hình ảnh"));
    return;
  }

  callback(null, true);
}

module.exports = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});
