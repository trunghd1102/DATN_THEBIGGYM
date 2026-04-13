const { query } = require("./queryService");
const { decorateProductsWithVariants, normalizeVariantPayload, sanitizeText } = require("../utils/productVariants");
const { normalizeStoredMediaPath } = require("../utils/mediaPaths");

function buildDefaultVariantFromProduct(product = {}) {
  const effectivePrice = Number(product.sale_price ?? product.price ?? 0);
  const basePrice = Number(product.price ?? effectivePrice ?? 0);

  return {
    id: null,
    flavor_label: "",
    size_label: "",
    price: effectivePrice > 0 ? effectivePrice : basePrice,
    original_price: basePrice > effectivePrice ? basePrice : null,
    stock_quantity: Math.max(0, Number(product.stock_quantity || 0)),
    image_url: normalizeStoredMediaPath(product.image_url),
    is_active: product.is_active !== false,
    sort_order: 0
  };
}

async function fetchVariantRows(productIds = []) {
  const normalizedIds = Array.from(
    new Set(
      (Array.isArray(productIds) ? productIds : [productIds])
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0)
    )
  );

  if (!normalizedIds.length) {
    return [];
  }

  const placeholders = normalizedIds.map(() => "?").join(", ");
  return query(
    `SELECT id, product_id, flavor_label, size_label, price, original_price, stock_quantity, image_url, is_active, sort_order, created_at, updated_at
     FROM product_variants
     WHERE product_id IN (${placeholders})
     ORDER BY product_id ASC, sort_order ASC, id ASC`,
    normalizedIds
  );
}

async function decorateProductsWithVariantData(products = []) {
  const variantRows = await fetchVariantRows(products.map((product) => product.id));
  return decorateProductsWithVariants(products, variantRows);
}

async function syncProductAggregateFields(connection, productId) {
  await connection.execute(
    `UPDATE products p
     LEFT JOIN (
       SELECT pv.product_id,
              COALESCE(SUM(CASE WHEN pv.is_active = 1 THEN pv.stock_quantity ELSE 0 END), 0) AS total_stock
       FROM product_variants pv
       WHERE pv.product_id = ?
       GROUP BY pv.product_id
     ) stock_totals ON stock_totals.product_id = p.id
     LEFT JOIN product_variants pv_primary
       ON pv_primary.id = (
         SELECT pv2.id
         FROM product_variants pv2
         WHERE pv2.product_id = p.id AND pv2.is_active = 1
         ORDER BY pv2.sort_order ASC, pv2.id ASC
         LIMIT 1
       )
     SET p.stock_quantity = COALESCE(stock_totals.total_stock, 0),
         p.price = COALESCE(
           CASE
             WHEN pv_primary.original_price IS NOT NULL AND pv_primary.original_price > pv_primary.price THEN pv_primary.original_price
             ELSE pv_primary.price
           END,
           p.price
         ),
         p.sale_price = CASE
           WHEN pv_primary.original_price IS NOT NULL AND pv_primary.original_price > pv_primary.price THEN pv_primary.price
           ELSE NULL
         END,
         p.image_url = COALESCE(NULLIF(pv_primary.image_url, ''), p.image_url)
     WHERE p.id = ?`,
    [productId, productId]
  );
}

async function syncProductVariants(connection, productId, rawVariants, fallbackProduct = {}) {
  const incomingVariants = normalizeVariantPayload(rawVariants);
  const effectiveVariants = incomingVariants.length
    ? incomingVariants
    : [buildDefaultVariantFromProduct(fallbackProduct)];

  const [existingRows] = await connection.execute(
    `SELECT id
     FROM product_variants
     WHERE product_id = ?`,
    [productId]
  );
  const existingIds = new Set(existingRows.map((row) => Number(row.id)));
  const keptIds = new Set();

  for (const variant of effectiveVariants) {
    if (variant.id && existingIds.has(variant.id)) {
      keptIds.add(Number(variant.id));
      await connection.execute(
        `UPDATE product_variants
         SET flavor_label = ?,
             size_label = ?,
             price = ?,
             original_price = ?,
             stock_quantity = ?,
             image_url = ?,
             is_active = ?,
             sort_order = ?
         WHERE id = ? AND product_id = ?`,
        [
          variant.flavor_label,
          variant.size_label,
          variant.price,
          variant.original_price,
          variant.stock_quantity,
          variant.image_url || null,
          variant.is_active ? 1 : 0,
          variant.sort_order,
          variant.id,
          productId
        ]
      );
      continue;
    }

    const [insertResult] = await connection.execute(
      `INSERT INTO product_variants (
         product_id, flavor_label, size_label, price, original_price, stock_quantity, image_url, is_active, sort_order
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        productId,
        variant.flavor_label,
        variant.size_label,
        variant.price,
        variant.original_price,
        variant.stock_quantity,
        variant.image_url || null,
        variant.is_active ? 1 : 0,
        variant.sort_order
      ]
    );
    keptIds.add(Number(insertResult.insertId));
  }

  const staleIds = Array.from(existingIds).filter((id) => !keptIds.has(id));
  if (staleIds.length) {
    const placeholders = staleIds.map(() => "?").join(", ");
    await connection.execute(
      `DELETE FROM product_variants
       WHERE product_id = ? AND id IN (${placeholders})`,
      [productId, ...staleIds]
    );
  }

  await syncProductAggregateFields(connection, productId);
}

module.exports = {
  buildDefaultVariantFromProduct,
  decorateProductsWithVariantData,
  fetchVariantRows,
  syncProductAggregateFields,
  syncProductVariants
};
