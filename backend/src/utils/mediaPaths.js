function normalizeStoredMediaPath(value) {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return "";
  }

  if (/^(data:|blob:)/i.test(rawValue)) {
    return rawValue;
  }

  if (rawValue.startsWith("/uploads/")) {
    return rawValue;
  }

  if (rawValue.startsWith("uploads/")) {
    return `/${rawValue}`;
  }

  if (rawValue.startsWith("./uploads/") || rawValue.startsWith("../uploads/")) {
    return `/${rawValue.replace(/^(\.\/|\.\.\/)+/, "")}`;
  }

  try {
    const parsedUrl = new URL(rawValue);

    if (parsedUrl.pathname.startsWith("/uploads/")) {
      return parsedUrl.pathname;
    }

    return rawValue;
  } catch (_error) {
    return rawValue;
  }
}

function normalizeNullableMediaPath(value) {
  const normalizedValue = normalizeStoredMediaPath(value);
  return normalizedValue || null;
}

module.exports = {
  normalizeStoredMediaPath,
  normalizeNullableMediaPath
};
