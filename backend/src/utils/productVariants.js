const { normalizeStoredMediaPath } = require("./mediaPaths");

function sanitizeText(value) {
  return String(value ?? "").trim();
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function toBoolean(value, fallback = true) {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value === "string") {
    return value !== "0" && value.toLowerCase() !== "false";
  }

  return Boolean(value);
}

function normalizeVariantRow(row) {
  return {
    id: Number(row.id),
    product_id: Number(row.product_id),
    flavor_label: sanitizeText(row.flavor_label),
    size_label: sanitizeText(row.size_label),
    price: Number(row.price),
    original_price: row.original_price === null || row.original_price === undefined ? null : Number(row.original_price),
    stock_quantity: Math.max(0, Number(row.stock_quantity || 0)),
    image_url: normalizeStoredMediaPath(row.image_url),
    is_active: toBoolean(row.is_active, true),
    sort_order: Number(row.sort_order || 0),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function normalizeVariantPayload(rawVariants = []) {
  const input = Array.isArray(rawVariants) ? rawVariants : [];

  return input
    .map((item, index) => {
      const price = Number(item?.price ?? 0);
      const originalPrice = toNumberOrNull(item?.original_price);

      if (!Number.isFinite(price) || price <= 0) {
        return null;
      }

      return {
        id: Number.isInteger(Number(item?.id)) && Number(item?.id) > 0 ? Number(item.id) : null,
        flavor_label: sanitizeText(item?.flavor_label ?? item?.flavor ?? ""),
        size_label: sanitizeText(item?.size_label ?? item?.size ?? ""),
        price,
        original_price: originalPrice,
        stock_quantity: Math.max(0, Number(item?.stock_quantity ?? 0)),
        image_url: normalizeStoredMediaPath(item?.image_url),
        is_active: toBoolean(item?.is_active, true),
        sort_order: Number.isFinite(Number(item?.sort_order)) ? Number(item.sort_order) : index
      };
    })
    .filter(Boolean)
    .filter((item, index, array) => {
      if (item.flavor_label || item.size_label) {
        return true;
      }

      return array.length === 1;
    })
    .sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order;
      }

      return (a.id || 0) - (b.id || 0);
    });
}

function groupVariantsByProduct(rows = []) {
  return rows.reduce((accumulator, row) => {
    const normalized = normalizeVariantRow(row);
    const productId = normalized.product_id;
    const current = accumulator.get(productId) || [];
    current.push(normalized);
    accumulator.set(productId, current);
    return accumulator;
  }, new Map());
}

function decorateProductsWithVariants(products = [], variantRows = []) {
  const grouped = groupVariantsByProduct(variantRows);

  return products.map((product) => {
    const variants = (grouped.get(Number(product.id)) || []).sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order;
      }
      return a.id - b.id;
    });
    const activeVariants = variants.filter((variant) => variant.is_active);
    const hasLabeledOptions = activeVariants.some((variant) => variant.flavor_label || variant.size_label);

    return {
      ...product,
      variants,
      has_variants: Boolean(activeVariants.length),
      requires_configuration: activeVariants.length > 1 || hasLabeledOptions
    };
  });
}

module.exports = {
  decorateProductsWithVariants,
  normalizeVariantPayload,
  normalizeVariantRow,
  sanitizeText,
  toNumberOrNull
};
