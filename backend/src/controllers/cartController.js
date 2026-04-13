const { body, param, validationResult } = require("express-validator");
const asyncHandler = require("../utils/asyncHandler");
const { pool, query } = require("../services/queryService");
const { normalizeNullableMediaPath } = require("../utils/mediaPaths");

function handleValidation(req, res) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      errors: errors.array()
    });
    return false;
  }

  return true;
}

function normalizeCartItem(row) {
  return {
    id: Number(row.id),
    product_id: Number(row.product_id),
    product_variant_id: Number(row.product_variant_id),
    quantity: Number(row.quantity),
    variant: {
      id: Number(row.product_variant_id),
      flavor_label: row.variant_flavor_label || "",
      size_label: row.variant_size_label || "",
      price: Number(row.variant_price),
      original_price: row.variant_original_price === null ? null : Number(row.variant_original_price),
      stock_quantity: Number(row.variant_stock_quantity),
      image_url: normalizeNullableMediaPath(row.variant_image_url),
      is_active: Boolean(row.variant_is_active),
      sort_order: Number(row.variant_sort_order || 0)
    },
    product: {
      id: Number(row.product_id),
      name: row.name,
      slug: row.slug,
      category_name: row.category_name,
      category_slug: row.category_slug,
      price: Number(row.price),
      sale_price: row.sale_price === null ? null : Number(row.sale_price),
      stock_quantity: Number(row.stock_quantity),
      image_url: normalizeNullableMediaPath(row.image_url),
      badge_label: row.badge_label,
      short_description: row.short_description,
      is_featured: Boolean(row.is_featured),
      is_active: Boolean(row.is_active)
    }
  };
}

async function fetchCartItems(userId) {
  const rows = await query(
    `SELECT ci.id, ci.product_id, ci.product_variant_id, ci.quantity,
            p.name, p.slug, p.category_name, p.category_slug, p.price, p.sale_price,
            p.stock_quantity, p.image_url, p.badge_label, p.short_description,
            p.is_featured, p.is_active,
            pv.flavor_label AS variant_flavor_label,
            pv.size_label AS variant_size_label,
            pv.price AS variant_price,
            pv.original_price AS variant_original_price,
            pv.stock_quantity AS variant_stock_quantity,
            pv.image_url AS variant_image_url,
            pv.is_active AS variant_is_active,
            pv.sort_order AS variant_sort_order
     FROM cart_items ci
     INNER JOIN products p ON p.id = ci.product_id
     INNER JOIN product_variants pv ON pv.id = ci.product_variant_id
     WHERE ci.user_id = ?
       AND p.is_active = 1
       AND pv.is_active = 1
     ORDER BY ci.updated_at DESC, ci.id DESC`,
    [userId]
  );

  return rows.map(normalizeCartItem);
}

function createExecutor(connection = null) {
  if (connection && typeof connection.execute === "function") {
    return async (sql, params = []) => {
      const [rows] = await connection.execute(sql, params);
      return rows;
    };
  }

  return (sql, params = []) => query(sql, params);
}

async function getVariantOrThrowWithExecutor(execute, productVariantId, productId = null) {
  const rows = await execute(
    `SELECT pv.id, pv.product_id, pv.stock_quantity, pv.is_active,
            pv.flavor_label, pv.size_label,
            p.name, p.is_active AS product_is_active
     FROM product_variants pv
     INNER JOIN products p ON p.id = pv.product_id
     WHERE pv.id = ?`,
    [productVariantId]
  );

  const variant = rows[0];

  if (!variant || !variant.product_is_active || !variant.is_active) {
    const error = new Error("Không tìm thấy biến thể sản phẩm hợp lệ");
    error.statusCode = 404;
    throw error;
  }

  if (productId && Number(variant.product_id) !== Number(productId)) {
    const error = new Error("Biến thể không thuộc sản phẩm đã chọn");
    error.statusCode = 400;
    throw error;
  }

  return variant;
}

async function getVariantOrThrow(productVariantId, productId = null) {
  return getVariantOrThrowWithExecutor(createExecutor(), productVariantId, productId);
}

async function syncCartItemWithExecutor(execute, userId, productVariantId, requestedQuantity, productId = null) {
  const variant = await getVariantOrThrowWithExecutor(execute, productVariantId, productId);
  const normalizedQuantity = Number(requestedQuantity);
  const availableStock = Number(variant.stock_quantity);

  if (normalizedQuantity <= 0) {
    await execute("DELETE FROM cart_items WHERE user_id = ? AND product_variant_id = ?", [userId, productVariantId]);
    return null;
  }

  if (availableStock <= 0) {
    const error = new Error("Sản phẩm hiện đã hết hàng");
    error.statusCode = 409;
    throw error;
  }

  if (normalizedQuantity > availableStock) {
    const error = new Error(
      availableStock === 1
        ? "Chỉ còn 1 sản phẩm trong kho"
        : `Chỉ còn ${availableStock} sản phẩm trong kho`
    );
    error.statusCode = 409;
    throw error;
  }

  await execute(
    `INSERT INTO cart_items (user_id, product_id, product_variant_id, quantity)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       product_id = VALUES(product_id),
       quantity = VALUES(quantity)`,
    [userId, Number(variant.product_id), Number(variant.id), normalizedQuantity]
  );

  return normalizedQuantity;
}

async function syncCartItem(userId, productVariantId, requestedQuantity, productId = null) {
  return syncCartItemWithExecutor(createExecutor(), userId, productVariantId, requestedQuantity, productId);
}

exports.cartValidators = {
  addOrUpdateItem: [
    body("product_id").optional().isInt({ min: 1 }),
    body("product_variant_id").isInt({ min: 1 }),
    body("quantity").isInt({ min: 0 })
  ],
  updateItemQuantity: [
    param("productId").isInt({ min: 1 }),
    body("quantity").isInt({ min: 0 })
  ],
  removeItem: [
    param("productId").isInt({ min: 1 })
  ]
};

exports.getCart = asyncHandler(async (req, res) => {
  const items = await fetchCartItems(req.user.id);

  res.json({
    success: true,
    count: items.length,
    data: items
  });
});

exports.addOrUpdateItem = asyncHandler(async (req, res) => {
  if (!handleValidation(req, res)) {
    return;
  }

  await syncCartItem(
    req.user.id,
    Number(req.body.product_variant_id),
    Number(req.body.quantity),
    req.body.product_id ? Number(req.body.product_id) : null
  );
  const items = await fetchCartItems(req.user.id);

  res.json({
    success: true,
    count: items.length,
    data: items
  });
});

exports.updateItemQuantity = asyncHandler(async (req, res) => {
  if (!handleValidation(req, res)) {
    return;
  }

  await syncCartItem(req.user.id, Number(req.params.productId), Number(req.body.quantity));
  const items = await fetchCartItems(req.user.id);

  res.json({
    success: true,
    count: items.length,
    data: items
  });
});

exports.removeItem = asyncHandler(async (req, res) => {
  if (!handleValidation(req, res)) {
    return;
  }

  await query(
    "DELETE FROM cart_items WHERE user_id = ? AND product_variant_id = ?",
    [req.user.id, Number(req.params.productId)]
  );

  const items = await fetchCartItems(req.user.id);

  res.json({
    success: true,
    count: items.length,
    data: items
  });
});

exports.replaceCart = asyncHandler(async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const aggregatedItems = items.reduce((accumulator, item) => {
    const productVariantId = Number(item?.product_variant_id);

    if (!Number.isInteger(productVariantId) || productVariantId <= 0) {
      return accumulator;
    }

    const currentItem = accumulator.get(productVariantId) || {
      product_variant_id: productVariantId,
      product_id: item?.product_id ? Number(item.product_id) : null,
      quantity: 0
    };

    if (!currentItem.product_id && item?.product_id) {
      currentItem.product_id = Number(item.product_id);
    }

    currentItem.quantity += Number(item?.quantity || 0);
    accumulator.set(productVariantId, currentItem);
    return accumulator;
  }, new Map());

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const execute = createExecutor(connection);

    await execute("DELETE FROM cart_items WHERE user_id = ?", [req.user.id]);

    for (const item of aggregatedItems.values()) {
      await syncCartItemWithExecutor(
        execute,
        req.user.id,
        Number(item.product_variant_id),
        Number(item.quantity || 0),
        item.product_id ? Number(item.product_id) : null
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const nextItems = await fetchCartItems(req.user.id);

  res.json({
    success: true,
    count: nextItems.length,
    data: nextItems
  });
});
