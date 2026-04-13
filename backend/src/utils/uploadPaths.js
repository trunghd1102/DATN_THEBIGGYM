const os = require("os");
const path = require("path");

function getExternalUploadsRoot() {
  const localAppData = process.env.LOCALAPPDATA;

  if (localAppData) {
    return path.join(localAppData, "BigGym", "uploads");
  }

  return path.join(os.tmpdir(), "BigGym", "uploads");
}

function getProductsUploadDirectory() {
  return path.join(getExternalUploadsRoot(), "products");
}

function getExercisesUploadDirectory() {
  return path.join(getExternalUploadsRoot(), "exercises");
}

function getLegacyUploadsRoot() {
  return path.join(__dirname, "..", "..", "uploads");
}

module.exports = {
  getExternalUploadsRoot,
  getExercisesUploadDirectory,
  getProductsUploadDirectory,
  getLegacyUploadsRoot
};
