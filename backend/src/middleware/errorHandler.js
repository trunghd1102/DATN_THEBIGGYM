function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Lỗi máy chủ nội bộ"
  });
}

module.exports = errorHandler;
