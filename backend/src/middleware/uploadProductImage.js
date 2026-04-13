const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { getProductsUploadDirectory } = require("../utils/uploadPaths");

const uploadDirectory = getProductsUploadDirectory();

fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDirectory);
  },
  filename: (req, file, callback) => {
    const safeExtension = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    const timestamp = Date.now();
    const adminId = req.user?.id || "admin";
    const nonce = Math.random().toString(36).slice(2, 8);
    callback(null, `product-${adminId}-${timestamp}-${nonce}${safeExtension}`);
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
    fileSize: 8 * 1024 * 1024
  }
});
