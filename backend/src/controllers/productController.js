const { validationResult } = require("express-validator");
const asyncHandler = require("../utils/asyncHandler");
const { pool, query } = require("../services/queryService");
const { attachDetailFields, serializeDetailPayload } = require("../utils/productDetailFields");
const { decorateProductsWithVariantData, syncProductVariants } = require("../services/productVariantService");
const { normalizeNullableMediaPath } = require("../utils/mediaPaths");

const PRODUCT_REVIEW_STATS_JOIN = `
  LEFT JOIN (
    SELECT product_id, COUNT(*) AS review_count, ROUND(AVG(rating), 1) AS average_rating
    FROM product_reviews
    GROUP BY product_id
  ) review_stats ON review_stats.product_id = p.id
`;

function buildOrderClause(sort) {
  switch (sort) {
    case "price-asc":
      return "ORDER BY COALESCE(sale_price, price) ASC, name ASC";
    case "price-desc":
      return "ORDER BY COALESCE(sale_price, price) DESC, name ASC";
    case "name-asc":
      return "ORDER BY name ASC";
    default:
      return "ORDER BY is_featured DESC, sort_order ASC, created_at DESC";
  }
}

function normalizeProduct(row) {
  return attachDetailFields({
    ...row,
    image_url: normalizeNullableMediaPath(row.image_url),
    price: Number(row.price),
    sale_price: row.sale_price === null ? null : Number(row.sale_price),
    stock_quantity: Number(row.stock_quantity),
    review_count: Number(row.review_count || 0),
    average_rating: row.average_rating === null || row.average_rating === undefined ? null : Number(row.average_rating),
    is_featured: Boolean(row.is_featured),
    is_active: Boolean(row.is_active)
  });
}

async function getProductBySlugOrThrow(slug) {
  const rows = await query(
    `SELECT p.id, p.name, p.slug, p.category_name, p.category_slug, p.price, p.sale_price, p.stock_quantity,
            p.image_url, p.badge_label, p.short_description, p.is_featured, p.is_active, p.sort_order,
            p.created_at, p.updated_at, p.gallery_images_json, p.flavors_json, p.sizes_json,
            p.feature_cards_json, p.quick_info_json, p.highlights_json, p.usage_guide_json, p.notes_json,
            p.purchase_panel_title, p.purchase_panel_body, review_stats.review_count, review_stats.average_rating
     FROM products p
     ${PRODUCT_REVIEW_STATS_JOIN}
     WHERE p.slug = ?`,
    [slug]
  );

  if (!rows.length) {
    const error = new Error("Không tìm thấy sản phẩm");
    error.statusCode = 404;
    throw error;
  }

  const [product] = await decorateProductsWithVariantData([normalizeProduct(rows[0])]);
  return product;
}

async function userHasPurchasedProduct(userId, productId) {
  if (!userId) {
    return false;
  }

  const rows = await query(
    `SELECT 1
     FROM orders o
     INNER JOIN order_items oi ON oi.order_id = o.id
     WHERE o.user_id = ?
       AND oi.product_id = ?
       AND o.payment_status = 'PAID'
     LIMIT 1`,
    [userId, productId]
  );

  return Boolean(rows.length);
}

async function getUserReview(userId, productId) {
  if (!userId) {
    return null;
  }

  const rows = await query(
    `SELECT pr.id, pr.product_id, pr.user_id, pr.rating, pr.comment, pr.created_at, pr.updated_at,
            u.full_name, u.avatar_url
     FROM product_reviews pr
     INNER JOIN users u ON u.id = pr.user_id
     WHERE pr.user_id = ? AND pr.product_id = ?
     LIMIT 1`,
    [userId, productId]
  );

  if (!rows.length) {
    return null;
  }

  const row = rows[0];
  return {
    id: Number(row.id),
    product_id: Number(row.product_id),
    user_id: Number(row.user_id),
    rating: Number(row.rating),
    comment: row.comment,
    created_at: row.created_at,
    updated_at: row.updated_at,
    author_name: row.full_name,
    author_avatar_url: normalizeNullableMediaPath(row.avatar_url)
  };
}

async function getReviewSummary(productId) {
  const rows = await query(
    `SELECT COUNT(*) AS review_count, ROUND(AVG(rating), 1) AS average_rating
     FROM product_reviews
     WHERE product_id = ?`,
    [productId]
  );

  return {
    review_count: Number(rows[0]?.review_count || 0),
    average_rating: rows[0]?.average_rating === null || rows[0]?.average_rating === undefined
      ? null
      : Number(rows[0].average_rating)
  };
}

exports.getProducts = asyncHandler(async (req, res) => {
  const { category, featured, search, sort } = req.query;
  const conditions = ["is_active = 1"];
  const params = [];

  if (category && category !== "all") {
    conditions.push("category_slug = ?");
    params.push(category);
  }

  if (featured === "true") {
    conditions.push("is_featured = 1");
  }

  if (search) {
    conditions.push("(name LIKE ? OR short_description LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  const products = await query(
    `SELECT p.id, p.name, p.slug, p.category_name, p.category_slug, p.price, p.sale_price, p.stock_quantity,
            p.image_url, p.badge_label, p.short_description, p.is_featured, p.is_active, p.sort_order,
            p.created_at, p.updated_at, p.gallery_images_json, p.flavors_json, p.sizes_json,
            p.feature_cards_json, p.quick_info_json, p.highlights_json, p.usage_guide_json, p.notes_json,
            p.purchase_panel_title, p.purchase_panel_body, review_stats.review_count, review_stats.average_rating
     FROM products p
     ${PRODUCT_REVIEW_STATS_JOIN}
     WHERE ${conditions.join(" AND ")}
     ${buildOrderClause(sort)}`,
    params
  );

  res.json({
    success: true,
    count: products.length,
    data: await decorateProductsWithVariantData(products.map(normalizeProduct))
  });
});

exports.getProductBySlug = asyncHandler(async (req, res) => {
  const product = await getProductBySlugOrThrow(req.params.slug);

  res.json({
    success: true,
    data: product
  });
});

exports.createProduct = asyncHandler(async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const {
    name,
    slug,
    category_name,
    category_slug,
    price,
    sale_price = null,
    stock_quantity = 0,
    image_url = null,
    badge_label = null,
    short_description = null,
    is_featured = false,
    is_active = true,
    sort_order = 0,
    gallery_images = [],
    flavors = [],
    sizes = [],
    feature_cards = [],
    quick_info = [],
    highlights = [],
    usage_guide = [],
    notes = [],
    variants = [],
    purchase_panel_title = null,
    purchase_panel_body = null
  } = req.body;
  const detailPayload = serializeDetailPayload({
    gallery_images,
    flavors,
    sizes,
    feature_cards,
    quick_info,
    highlights,
    usage_guide,
    notes
  });

  const existing = await query("SELECT id FROM products WHERE slug = ?", [slug]);
  if (existing.length) {
    return res.status(409).json({
      success: false,
      message: "Slug sản phẩm đã tồn tại"
    });
  }

  const connection = await pool.getConnection();
  let createdId = 0;

  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `INSERT INTO products (
        name, slug, category_name, category_slug, price, sale_price, stock_quantity,
        image_url, badge_label, short_description, is_featured, is_active, sort_order,
        gallery_images_json, flavors_json, sizes_json, feature_cards_json,
        quick_info_json, highlights_json, usage_guide_json, notes_json,
        purchase_panel_title, purchase_panel_body
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        slug,
        category_name,
        category_slug,
        price,
        sale_price,
        stock_quantity,
        normalizeNullableMediaPath(image_url),
        badge_label,
        short_description,
        is_featured ? 1 : 0,
        is_active ? 1 : 0,
        sort_order,
        detailPayload.gallery_images_json,
        detailPayload.flavors_json,
        detailPayload.sizes_json,
        detailPayload.feature_cards_json,
        detailPayload.quick_info_json,
        detailPayload.highlights_json,
        detailPayload.usage_guide_json,
        detailPayload.notes_json,
        purchase_panel_title,
        purchase_panel_body
      ]
    );

    createdId = Number(result.insertId);
    await syncProductVariants(connection, createdId, variants, {
      price,
      sale_price,
      stock_quantity,
      image_url,
      is_active
    });

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const [createdProduct] = await decorateProductsWithVariantData(
    (await query("SELECT * FROM products WHERE id = ?", [createdId])).map(normalizeProduct)
  );

  res.status(201).json({
    success: true,
    data: createdProduct
  });
});

exports.updateProduct = asyncHandler(async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const productId = req.params.id;
  const existingRows = await query("SELECT * FROM products WHERE id = ?", [productId]);

  if (!existingRows.length) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy sản phẩm"
    });
  }

  const current = existingRows[0];
  const nextProduct = {
    name: req.body.name ?? current.name,
    slug: req.body.slug ?? current.slug,
    category_name: req.body.category_name ?? current.category_name,
    category_slug: req.body.category_slug ?? current.category_slug,
    price: req.body.price ?? current.price,
    sale_price: Object.prototype.hasOwnProperty.call(req.body, "sale_price") ? req.body.sale_price : current.sale_price,
    stock_quantity: req.body.stock_quantity ?? current.stock_quantity,
    image_url: Object.prototype.hasOwnProperty.call(req.body, "image_url") ? normalizeNullableMediaPath(req.body.image_url) : normalizeNullableMediaPath(current.image_url),
    badge_label: Object.prototype.hasOwnProperty.call(req.body, "badge_label") ? req.body.badge_label : current.badge_label,
    short_description: Object.prototype.hasOwnProperty.call(req.body, "short_description") ? req.body.short_description : current.short_description,
    is_featured: Object.prototype.hasOwnProperty.call(req.body, "is_featured") ? req.body.is_featured : Boolean(current.is_featured),
    is_active: Object.prototype.hasOwnProperty.call(req.body, "is_active") ? req.body.is_active : Boolean(current.is_active),
    sort_order: req.body.sort_order ?? current.sort_order,
    gallery_images: Object.prototype.hasOwnProperty.call(req.body, "gallery_images") ? req.body.gallery_images : current.gallery_images_json,
    flavors: Object.prototype.hasOwnProperty.call(req.body, "flavors") ? req.body.flavors : current.flavors_json,
    sizes: Object.prototype.hasOwnProperty.call(req.body, "sizes") ? req.body.sizes : current.sizes_json,
    feature_cards: Object.prototype.hasOwnProperty.call(req.body, "feature_cards") ? req.body.feature_cards : current.feature_cards_json,
    quick_info: Object.prototype.hasOwnProperty.call(req.body, "quick_info") ? req.body.quick_info : current.quick_info_json,
    highlights: Object.prototype.hasOwnProperty.call(req.body, "highlights") ? req.body.highlights : current.highlights_json,
    usage_guide: Object.prototype.hasOwnProperty.call(req.body, "usage_guide") ? req.body.usage_guide : current.usage_guide_json,
    notes: Object.prototype.hasOwnProperty.call(req.body, "notes") ? req.body.notes : current.notes_json,
    variants: Object.prototype.hasOwnProperty.call(req.body, "variants") ? req.body.variants : undefined,
    purchase_panel_title: Object.prototype.hasOwnProperty.call(req.body, "purchase_panel_title") ? req.body.purchase_panel_title : current.purchase_panel_title,
    purchase_panel_body: Object.prototype.hasOwnProperty.call(req.body, "purchase_panel_body") ? req.body.purchase_panel_body : current.purchase_panel_body
  };
  const detailPayload = serializeDetailPayload(nextProduct);

  const duplicateSlug = await query("SELECT id FROM products WHERE slug = ? AND id <> ?", [nextProduct.slug, productId]);
  if (duplicateSlug.length) {
    return res.status(409).json({
      success: false,
      message: "Slug sản phẩm đã tồn tại"
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute(
      `UPDATE products
       SET name = ?, slug = ?, category_name = ?, category_slug = ?, price = ?, sale_price = ?,
           stock_quantity = ?, image_url = ?, badge_label = ?, short_description = ?,
           is_featured = ?, is_active = ?, sort_order = ?, gallery_images_json = ?, flavors_json = ?,
           sizes_json = ?, feature_cards_json = ?, quick_info_json = ?, highlights_json = ?,
           usage_guide_json = ?, notes_json = ?, purchase_panel_title = ?, purchase_panel_body = ?
       WHERE id = ?`,
      [
        nextProduct.name,
        nextProduct.slug,
        nextProduct.category_name,
        nextProduct.category_slug,
        nextProduct.price,
        nextProduct.sale_price,
        nextProduct.stock_quantity,
        nextProduct.image_url,
        nextProduct.badge_label,
        nextProduct.short_description,
        nextProduct.is_featured ? 1 : 0,
        nextProduct.is_active ? 1 : 0,
        nextProduct.sort_order,
        detailPayload.gallery_images_json,
        detailPayload.flavors_json,
        detailPayload.sizes_json,
        detailPayload.feature_cards_json,
        detailPayload.quick_info_json,
        detailPayload.highlights_json,
        detailPayload.usage_guide_json,
        detailPayload.notes_json,
        nextProduct.purchase_panel_title,
        nextProduct.purchase_panel_body,
        productId
      ]
    );

    await syncProductVariants(connection, Number(productId), nextProduct.variants, {
      price: nextProduct.price,
      sale_price: nextProduct.sale_price,
      stock_quantity: nextProduct.stock_quantity,
      image_url: nextProduct.image_url,
      is_active: nextProduct.is_active
    });

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const [updatedProduct] = await decorateProductsWithVariantData(
    (await query("SELECT * FROM products WHERE id = ?", [productId])).map(normalizeProduct)
  );

  res.json({
    success: true,
    data: updatedProduct
  });
});

exports.getProductReviews = asyncHandler(async (req, res) => {
  const product = await getProductBySlugOrThrow(req.params.slug);
  const reviews = await query(
    `SELECT pr.id, pr.rating, pr.comment, pr.created_at, pr.updated_at,
            u.id AS user_id, u.full_name, u.avatar_url
     FROM product_reviews pr
     INNER JOIN users u ON u.id = pr.user_id
     WHERE pr.product_id = ?
     ORDER BY pr.updated_at DESC, pr.id DESC`,
    [product.id]
  );

  const userId = req.user?.id || null;
  const hasPurchased = await userHasPurchasedProduct(userId, product.id);
  const userReview = await getUserReview(userId, product.id);

  res.json({
    success: true,
    data: {
      product: {
        id: product.id,
        slug: product.slug,
        name: product.name,
        average_rating: product.average_rating,
        review_count: product.review_count
      },
      permissions: {
        is_logged_in: Boolean(userId),
        has_purchased: hasPurchased,
        can_review: Boolean(userId) && hasPurchased
      },
      user_review: userReview,
      reviews: reviews.map((row) => ({
        id: Number(row.id),
        user_id: Number(row.user_id),
        author_name: row.full_name,
        author_avatar_url: normalizeNullableMediaPath(row.avatar_url),
        rating: Number(row.rating),
        comment: row.comment,
        created_at: row.created_at,
        updated_at: row.updated_at,
        is_current_user: Boolean(userId) && Number(row.user_id) === Number(userId)
      }))
    }
  });
});

exports.upsertProductReview = asyncHandler(async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
      message: errors.array()[0]?.msg || "Dữ liệu đánh giá không hợp lệ"
    });
  }

  const product = await getProductBySlugOrThrow(req.params.slug);
  const hasPurchased = await userHasPurchasedProduct(req.user.id, product.id);

  if (!hasPurchased) {
    return res.status(403).json({
      success: false,
      message: "Bạn cần mua và thanh toán sản phẩm này trước khi đánh giá"
    });
  }

  const rating = Number(req.body.rating);
  const comment = typeof req.body.comment === "string" ? req.body.comment.trim() : null;

  await query(
    `INSERT INTO product_reviews (product_id, user_id, rating, comment)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       rating = VALUES(rating),
       comment = VALUES(comment),
       updated_at = CURRENT_TIMESTAMP`,
    [product.id, req.user.id, rating, comment || null]
  );

  const summary = await getReviewSummary(product.id);
  const userReview = await getUserReview(req.user.id, product.id);

  res.status(201).json({
    success: true,
    message: userReview?.created_at && userReview?.updated_at && userReview.created_at !== userReview.updated_at
      ? "Đã cập nhật đánh giá của bạn"
      : "Đã gửi đánh giá thành công",
    data: {
      summary,
      user_review: userReview
    }
  });
});

exports.deleteProduct = asyncHandler(async (req, res) => {
  const result = await query("DELETE FROM products WHERE id = ?", [req.params.id]);

  if (!result.affectedRows) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy sản phẩm"
    });
  }

  res.json({
    success: true,
    message: "Đã xóa sản phẩm"
  });
});
