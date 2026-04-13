const { body, param, query: queryValidator, validationResult } = require("express-validator");
const asyncHandler = require("../utils/asyncHandler");
const { query } = require("../services/queryService");
const { attachDetailFields } = require("../utils/productDetailFields");
const { attachExerciseDetailFields } = require("../utils/exerciseDetailFields");
const { decorateProductsWithVariantData } = require("../services/productVariantService");
const { normalizeNullableMediaPath } = require("../utils/mediaPaths");
const { isMailConfigured, sendContactReplyMail } = require("../services/mailService");

const ORDER_STATUSES = ["pending", "shipping", "completed", "cancelled"];
const USER_ROLES = ["admin", "coach", "member"];

function handleValidation(req, res) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorList = errors.array();
    res.status(400).json({
      success: false,
      message: errorList[0]?.msg || "Dữ liệu không hợp lệ",
      errors: errorList
    });
    return false;
  }

  return true;
}

function toNumber(value) {
  return Number(value || 0);
}

function toBoolean(value) {
  return Boolean(value);
}

function normalizeProduct(row) {
  return attachDetailFields({
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    category_name: row.category_name,
    category_slug: row.category_slug,
    price: toNumber(row.price),
    sale_price: row.sale_price === null ? null : toNumber(row.sale_price),
    stock_quantity: Number(row.stock_quantity),
    image_url: normalizeNullableMediaPath(row.image_url),
    gallery_images_json: row.gallery_images_json,
    flavors_json: row.flavors_json,
    sizes_json: row.sizes_json,
    feature_cards_json: row.feature_cards_json,
    quick_info_json: row.quick_info_json,
    highlights_json: row.highlights_json,
    usage_guide_json: row.usage_guide_json,
    notes_json: row.notes_json,
    badge_label: row.badge_label,
    short_description: row.short_description,
    purchase_panel_title: row.purchase_panel_title,
    purchase_panel_body: row.purchase_panel_body,
    is_featured: toBoolean(row.is_featured),
    is_active: toBoolean(row.is_active),
    sort_order: Number(row.sort_order),
    created_at: row.created_at,
    updated_at: row.updated_at
  });
}

function normalizeOrder(row) {
  return {
    id: Number(row.id),
    user_id: row.user_id === null ? null : Number(row.user_id),
    order_code: Number(row.order_code),
    buyer_name: row.buyer_name,
    buyer_email: row.buyer_email,
    buyer_phone: row.buyer_phone,
    shipping_address: row.shipping_address,
    note: row.note,
    payment_provider: row.payment_provider,
    payment_status: row.payment_status,
    fulfillment_status: row.fulfillment_status || "pending",
    total_amount: toNumber(row.total_amount),
    subtotal_amount: toNumber(row.subtotal_amount),
    shipping_fee: toNumber(row.shipping_fee),
    discount_amount: toNumber(row.discount_amount),
    reference_code: row.reference_code,
    created_at: row.created_at,
    updated_at: row.updated_at,
    paid_at: row.paid_at
  };
}

function normalizeCustomer(row) {
  return {
    id: Number(row.id),
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    auth_provider: row.auth_provider || "local",
    avatar_url: normalizeNullableMediaPath(row.avatar_url),
    created_at: row.created_at,
    orders_count: Number(row.orders_count || 0),
    total_spent: toNumber(row.total_spent),
    last_order_at: row.last_order_at
  };
}

function normalizeExercise(row) {
  return attachExerciseDetailFields({
    id: Number(row.id),
    title: row.title,
    slug: row.slug,
    category_name: row.category_name,
    category_slug: row.category_slug,
    level_name: row.level_name,
    level_slug: row.level_slug,
    focus_label: row.focus_label,
    equipment: row.equipment,
    primary_muscles: row.primary_muscles,
    calorie_burn_text: row.calorie_burn_text,
    hero_image: normalizeNullableMediaPath(row.hero_image),
    short_description: row.short_description,
    long_description: row.long_description,
    video_url: row.video_url,
    expert_tip: row.expert_tip,
    execution_steps_json: row.execution_steps_json,
    common_mistakes_json: row.common_mistakes_json,
    muscle_tags_json: row.muscle_tags_json,
    recommended_sets_json: row.recommended_sets_json,
    related_exercises_json: row.related_exercises_json,
    is_active: Boolean(row.is_active),
    sort_order: Number(row.sort_order || 0),
    created_at: row.created_at,
    updated_at: row.updated_at
  });
}

function buildDateSeries(rows, days) {
  const today = new Date();
  const rowMap = new Map(rows.map((row) => [row.day_key, toNumber(row.revenue)]));
  const data = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const dayKey = date.toISOString().slice(0, 10);
    data.push({
      label: `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`,
      value: rowMap.get(dayKey) || 0,
      day_key: dayKey
    });
  }

  return data;
}

function buildMonthSeries(rows, months) {
  const now = new Date();
  const rowMap = new Map(rows.map((row) => [row.month_key, toNumber(row.revenue)]));
  const data = [];

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    data.push({
      label: `T${date.getMonth() + 1}/${String(date.getFullYear()).slice(-2)}`,
      value: rowMap.get(monthKey) || 0,
      month_key: monthKey
    });
  }

  return data;
}

function buildGrowthRate(currentValue, previousValue) {
  if (!previousValue) {
    return currentValue > 0 ? 100 : 0;
  }

  return Number((((currentValue - previousValue) / previousValue) * 100).toFixed(1));
}

function buildAbsoluteUrl(req, relativePath) {
  return `${req.protocol}://${req.get("host")}${relativePath}`;
}

async function getAdminOverviewPayload() {
  const [
    todayRevenueRows,
    monthRevenueRows,
    prevMonthRevenueRows,
    ordersCountRows,
    newCustomersRows,
    revenueByDayRows,
    topProductsRows
  ] = await Promise.all([
    query(
      `SELECT COALESCE(SUM(total_amount), 0) AS total
       FROM orders
       WHERE payment_status = 'PAID'
         AND DATE(COALESCE(paid_at, updated_at, created_at)) = CURDATE()`
    ),
    query(
      `SELECT COALESCE(SUM(total_amount), 0) AS total
       FROM orders
       WHERE payment_status = 'PAID'
         AND YEAR(COALESCE(paid_at, updated_at, created_at)) = YEAR(CURDATE())
         AND MONTH(COALESCE(paid_at, updated_at, created_at)) = MONTH(CURDATE())`
    ),
    query(
      `SELECT COALESCE(SUM(total_amount), 0) AS total
       FROM orders
       WHERE payment_status = 'PAID'
         AND YEAR(COALESCE(paid_at, updated_at, created_at)) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
         AND MONTH(COALESCE(paid_at, updated_at, created_at)) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))`
    ),
    query(
      `SELECT COUNT(*) AS total
       FROM orders
       WHERE YEAR(created_at) = YEAR(CURDATE())
         AND MONTH(created_at) = MONTH(CURDATE())`
    ),
    query(
      `SELECT COUNT(*) AS total
       FROM users
       WHERE YEAR(created_at) = YEAR(CURDATE())
         AND MONTH(created_at) = MONTH(CURDATE())`
    ),
    query(
      `SELECT DATE(COALESCE(paid_at, updated_at, created_at)) AS day_key,
              COALESCE(SUM(total_amount), 0) AS revenue
       FROM orders
       WHERE payment_status = 'PAID'
         AND COALESCE(paid_at, updated_at, created_at) >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
       GROUP BY DATE(COALESCE(paid_at, updated_at, created_at))
       ORDER BY day_key ASC`
    ),
    query(
      `SELECT oi.product_name,
              oi.product_slug,
              oi.product_image_url,
              SUM(oi.quantity) AS units_sold,
              SUM(oi.line_total) AS revenue
       FROM order_items oi
       INNER JOIN orders o ON o.id = oi.order_id
       WHERE o.payment_status = 'PAID'
       GROUP BY oi.product_name, oi.product_slug, oi.product_image_url
       ORDER BY units_sold DESC, revenue DESC
       LIMIT 6`
    )
  ]);

  const todayRevenue = toNumber(todayRevenueRows[0]?.total);
  const monthRevenue = toNumber(monthRevenueRows[0]?.total);
  const previousMonthRevenue = toNumber(prevMonthRevenueRows[0]?.total);
  const growthRate = buildGrowthRate(monthRevenue, previousMonthRevenue);

  return {
    stats: {
      revenue_today: todayRevenue,
      revenue_month: monthRevenue,
      orders_month: Number(ordersCountRows[0]?.total || 0),
      new_customers_month: Number(newCustomersRows[0]?.total || 0),
      growth_rate: growthRate
    },
    revenue_series: buildDateSeries(revenueByDayRows, 14),
    top_products: topProductsRows.map((row) => ({
      product_name: row.product_name,
      product_slug: row.product_slug,
      product_image_url: normalizeNullableMediaPath(row.product_image_url),
      units_sold: Number(row.units_sold || 0),
      revenue: toNumber(row.revenue)
    }))
  };
}

exports.validators = {
  getOrders: [
    queryValidator("status").optional().isIn(ORDER_STATUSES),
    queryValidator("payment_status").optional().isIn(["PENDING", "PROCESSING", "PAID", "CANCELLED", "FAILED", "EXPIRED", "UNDERPAID"]),
    queryValidator("search").optional().trim().isLength({ max: 150 })
  ],
  getOrderDetail: [
    param("id").isInt({ min: 1 }).withMessage("Mã đơn hàng không hợp lệ")
  ],
  updateOrderStatus: [
    param("id").isInt({ min: 1 }).withMessage("Mã đơn hàng không hợp lệ"),
    body("fulfillment_status").isIn(ORDER_STATUSES).withMessage("Trạng thái đơn hàng không hợp lệ")
  ],
  getProducts: [
    queryValidator("active").optional().isIn(["all", "active", "inactive"]),
    queryValidator("search").optional().trim().isLength({ max: 150 }),
    queryValidator("category").optional().trim().isLength({ max: 100 })
  ],
  getExercises: [
    queryValidator("active").optional().isIn(["all", "active", "inactive"]),
    queryValidator("search").optional().trim().isLength({ max: 150 })
  ],
  getCustomers: [
    queryValidator("search").optional().trim().isLength({ max: 150 })
  ],
  getCustomerDetail: [
    param("id").isInt({ min: 1 }).withMessage("Mã khách hàng không hợp lệ")
  ],
  updateSettings: [
    body("shop_name").trim().isLength({ min: 2, max: 150 }).withMessage("Tên shop phải từ 2 đến 150 ký tự"),
    body("contact_email").optional({ nullable: true, checkFalsy: true }).isEmail().withMessage("Email liên hệ không hợp lệ"),
    body("contact_phone").optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 30 }).withMessage("Số điện thoại liên hệ không hợp lệ"),
    body("address").optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 255 }).withMessage("Địa chỉ tối đa 255 ký tự"),
    body("hero_title").optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 180 }).withMessage("Tiêu đề hero tối đa 180 ký tự"),
    body("hero_subtitle").optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 255 }).withMessage("Mô tả hero tối đa 255 ký tự"),
    body("low_stock_threshold").optional().isInt({ min: 0, max: 999 }).withMessage("Ngưỡng cảnh báo tồn kho không hợp lệ")
  ],
  replyContactMessage: [
    param("id").isInt({ min: 1 }).withMessage("Mã lời nhắn liên hệ không hợp lệ"),
    body("reply_message")
      .trim()
      .isLength({ min: 10, max: 4000 })
      .withMessage("Nội dung phản hồi phải từ 10 đến 4000 ký tự")
  ],
  updateUserRole: [
    param("id").isInt({ min: 1 }).withMessage("Mã tài khoản không hợp lệ"),
    body("role").isIn(USER_ROLES).withMessage("Vai trò không hợp lệ")
  ]
};

exports.getOverview = asyncHandler(async (_req, res) => {
  const overview = await getAdminOverviewPayload();

  res.json({
    success: true,
    data: overview
  });
});

exports.getOrders = asyncHandler(async (req, res) => {
  if (!handleValidation(req, res)) {
    return;
  }

  const conditions = ["1 = 1"];
  const params = [];

  if (req.query.status) {
    conditions.push("o.fulfillment_status = ?");
    params.push(req.query.status);
  }

  if (req.query.payment_status) {
    conditions.push("o.payment_status = ?");
    params.push(req.query.payment_status);
  }

  if (req.query.search) {
    conditions.push("(CAST(o.order_code AS CHAR) LIKE ? OR o.buyer_name LIKE ? OR o.buyer_email LIKE ? OR o.buyer_phone LIKE ?)");
    const likeValue = `%${req.query.search}%`;
    params.push(likeValue, likeValue, likeValue, likeValue);
  }

  const rows = await query(
    `SELECT o.id, o.user_id, o.order_code, o.buyer_name, o.buyer_email, o.buyer_phone,
            o.payment_provider, o.payment_status, o.fulfillment_status, o.total_amount,
            o.subtotal_amount, o.shipping_fee, o.discount_amount, o.reference_code,
            o.created_at, o.updated_at, o.paid_at
     FROM orders o
     WHERE ${conditions.join(" AND ")}
     ORDER BY o.created_at DESC
     LIMIT 200`,
    params
  );

  res.json({
    success: true,
    count: rows.length,
    data: rows.map(normalizeOrder)
  });
});

exports.getOrderDetail = asyncHandler(async (req, res) => {
  if (!handleValidation(req, res)) {
    return;
  }

  const rows = await query(
    `SELECT *
     FROM orders
     WHERE id = ?
     LIMIT 1`,
    [req.params.id]
  );

  if (!rows.length) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy đơn hàng"
    });
  }

  const order = normalizeOrder(rows[0]);
  const items = await query(
    `SELECT id, order_id, product_id, product_name, product_slug, product_image_url, unit_price, quantity, line_total, created_at
     FROM order_items
     WHERE order_id = ?
     ORDER BY id ASC`,
    [order.id]
  );

  res.json({
    success: true,
    data: {
      order,
      items: items.map((item) => ({
        ...item,
        id: Number(item.id),
        order_id: Number(item.order_id),
        product_id: item.product_id === null ? null : Number(item.product_id),
        unit_price: toNumber(item.unit_price),
        quantity: Number(item.quantity),
        line_total: toNumber(item.line_total)
      }))
    }
  });
});

exports.updateOrderStatus = asyncHandler(async (req, res) => {
  if (!handleValidation(req, res)) {
    return;
  }

  const existing = await query("SELECT id FROM orders WHERE id = ?", [req.params.id]);

  if (!existing.length) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy đơn hàng"
    });
  }

  await query(
    "UPDATE orders SET fulfillment_status = ? WHERE id = ?",
    [req.body.fulfillment_status, req.params.id]
  );

  const updatedRows = await query("SELECT * FROM orders WHERE id = ?", [req.params.id]);

  res.json({
    success: true,
    data: {
      order: normalizeOrder(updatedRows[0])
    }
  });
});

exports.getProducts = asyncHandler(async (req, res) => {
  if (!handleValidation(req, res)) {
    return;
  }

  const conditions = ["1 = 1"];
  const params = [];

  if (req.query.category && req.query.category !== "all") {
    conditions.push("(category_slug = ? OR category_name = ?)");
    params.push(req.query.category, req.query.category);
  }

  if (req.query.active === "active") {
    conditions.push("is_active = 1");
  } else if (req.query.active === "inactive") {
    conditions.push("is_active = 0");
  }

  if (req.query.search) {
    conditions.push("(name LIKE ? OR slug LIKE ? OR short_description LIKE ?)");
    const likeValue = `%${req.query.search}%`;
    params.push(likeValue, likeValue, likeValue);
  }

  const rows = await query(
    `SELECT *
     FROM products
     WHERE ${conditions.join(" AND ")}
     ORDER BY is_featured DESC, sort_order ASC, updated_at DESC`,
    params
  );

  res.json({
    success: true,
    count: rows.length,
    data: await decorateProductsWithVariantData(rows.map(normalizeProduct))
  });
});

exports.getExercises = asyncHandler(async (req, res) => {
  if (!handleValidation(req, res)) {
    return;
  }

  const conditions = ["1 = 1"];
  const params = [];

  if (req.query.active === "active") {
    conditions.push("is_active = 1");
  } else if (req.query.active === "inactive") {
    conditions.push("is_active = 0");
  }

  if (req.query.search) {
    conditions.push("(title LIKE ? OR slug LIKE ? OR short_description LIKE ? OR primary_muscles LIKE ? OR equipment LIKE ?)");
    const likeValue = `%${req.query.search}%`;
    params.push(likeValue, likeValue, likeValue, likeValue, likeValue);
  }

  const rows = await query(
    `SELECT *
     FROM exercises
     WHERE ${conditions.join(" AND ")}
     ORDER BY sort_order ASC, updated_at DESC, title ASC`,
    params
  );

  res.json({
    success: true,
    count: rows.length,
    data: rows.map(normalizeExercise)
  });
});

exports.uploadProductImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng chọn ảnh sản phẩm"
    });
  }

  const imageUrl = buildAbsoluteUrl(req, `/uploads/products/${req.file.filename}`);

  res.json({
    success: true,
    data: {
      image_url: imageUrl
    }
  });
});

exports.uploadExerciseImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng chọn ảnh bài tập"
    });
  }

  const imageUrl = buildAbsoluteUrl(req, `/uploads/exercises/${req.file.filename}`);

  res.json({
    success: true,
    data: {
      image_url: imageUrl
    }
  });
});

exports.uploadProductGallery = asyncHandler(async (req, res) => {
  if (!req.files || !req.files.length) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng chọn ít nhất một ảnh gallery"
    });
  }

  res.json({
    success: true,
    data: {
      image_urls: req.files.map((file) => buildAbsoluteUrl(req, `/uploads/products/${file.filename}`))
    }
  });
});

exports.getCustomers = asyncHandler(async (req, res) => {
  if (!handleValidation(req, res)) {
    return;
  }

  const conditions = ["1 = 1"];
  const params = [];

  if (req.query.search) {
    conditions.push("(u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)");
    const likeValue = `%${req.query.search}%`;
    params.push(likeValue, likeValue, likeValue);
  }

  const rows = await query(
    `SELECT u.id, u.full_name, u.email, u.phone, u.role, u.auth_provider, u.avatar_url, u.created_at,
            COUNT(o.id) AS orders_count,
            COALESCE(SUM(CASE WHEN o.payment_status = 'PAID' THEN o.total_amount ELSE 0 END), 0) AS total_spent,
            MAX(o.created_at) AS last_order_at
     FROM users u
     LEFT JOIN orders o ON o.user_id = u.id
     WHERE ${conditions.join(" AND ")}
     GROUP BY u.id, u.full_name, u.email, u.phone, u.role, u.auth_provider, u.avatar_url, u.created_at
     ORDER BY u.created_at DESC
     LIMIT 200`,
    params
  );

  res.json({
    success: true,
    count: rows.length,
    data: rows.map(normalizeCustomer)
  });
});

exports.getCustomerDetail = asyncHandler(async (req, res) => {
  if (!handleValidation(req, res)) {
    return;
  }

  const rows = await query(
    `SELECT id, full_name, email, phone, role, auth_provider, avatar_url, created_at
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [req.params.id]
  );

  if (!rows.length) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy khách hàng"
    });
  }

  const customer = normalizeCustomer({
    ...rows[0],
    orders_count: 0,
    total_spent: 0,
    last_order_at: null
  });

  const orders = await query(
    `SELECT id, order_code, total_amount, payment_status, fulfillment_status, created_at, paid_at
     FROM orders
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [req.params.id]
  );

  customer.orders_count = orders.length;
  customer.total_spent = orders
    .filter((order) => order.payment_status === "PAID")
    .reduce((sum, order) => sum + toNumber(order.total_amount), 0);
  customer.last_order_at = orders[0]?.created_at || null;

  res.json({
    success: true,
    data: {
      customer,
      orders: orders.map((order) => ({
        id: Number(order.id),
        order_code: Number(order.order_code),
        total_amount: toNumber(order.total_amount),
        payment_status: order.payment_status,
        fulfillment_status: order.fulfillment_status || "pending",
        created_at: order.created_at,
        paid_at: order.paid_at
      }))
    }
  });
});

exports.getAnalytics = asyncHandler(async (_req, res) => {
  const [dailyRows, monthlyRows, topProductRows, statusRows] = await Promise.all([
    query(
      `SELECT DATE(COALESCE(paid_at, updated_at, created_at)) AS day_key,
              COALESCE(SUM(total_amount), 0) AS revenue
       FROM orders
       WHERE payment_status = 'PAID'
         AND COALESCE(paid_at, updated_at, created_at) >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
       GROUP BY DATE(COALESCE(paid_at, updated_at, created_at))
       ORDER BY day_key ASC`
    ),
    query(
      `SELECT DATE_FORMAT(COALESCE(paid_at, updated_at, created_at), '%Y-%m') AS month_key,
              COALESCE(SUM(total_amount), 0) AS revenue
       FROM orders
       WHERE payment_status = 'PAID'
         AND COALESCE(paid_at, updated_at, created_at) >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
       GROUP BY DATE_FORMAT(COALESCE(paid_at, updated_at, created_at), '%Y-%m')
       ORDER BY month_key ASC`
    ),
    query(
      `SELECT oi.product_name,
              oi.product_slug,
              SUM(oi.quantity) AS units_sold,
              SUM(oi.line_total) AS revenue
       FROM order_items oi
       INNER JOIN orders o ON o.id = oi.order_id
       WHERE o.payment_status = 'PAID'
       GROUP BY oi.product_name, oi.product_slug
       ORDER BY units_sold DESC, revenue DESC
       LIMIT 8`
    ),
    query(
      `SELECT fulfillment_status, COUNT(*) AS total
       FROM orders
       GROUP BY fulfillment_status`
    )
  ]);

  res.json({
    success: true,
    data: {
      revenue_by_day: buildDateSeries(dailyRows, 30),
      revenue_by_month: buildMonthSeries(monthlyRows, 6),
      top_products: topProductRows.map((row) => ({
        product_name: row.product_name,
        product_slug: row.product_slug,
        units_sold: Number(row.units_sold || 0),
        revenue: toNumber(row.revenue)
      })),
      order_status_breakdown: ORDER_STATUSES.map((status) => ({
        status,
        total: Number(statusRows.find((row) => row.fulfillment_status === status)?.total || 0)
      }))
    }
  });
});

exports.getAlerts = asyncHandler(async (_req, res) => {
  const settingsRows = await query("SELECT low_stock_threshold FROM shop_settings WHERE id = 1 LIMIT 1");
  const lowStockThreshold = Number(settingsRows[0]?.low_stock_threshold || 5);

  const [newOrders, lowStockProducts] = await Promise.all([
    query(
      `SELECT id, order_code, buyer_name, total_amount, payment_status, fulfillment_status, created_at
       FROM orders
       WHERE fulfillment_status = 'pending'
       ORDER BY created_at DESC
       LIMIT 6`
    ),
    query(
      `SELECT id, name, slug, stock_quantity, image_url
       FROM products
       WHERE is_active = 1
         AND stock_quantity <= ?
       ORDER BY stock_quantity ASC, updated_at DESC
      LIMIT 6`,
      [lowStockThreshold]
    )
  ]);
  const contactMessages = await query(
    `SELECT cm.id, cm.user_id, cm.full_name, cm.email, cm.phone, cm.subject, cm.message, cm.status, cm.created_at,
            u.role AS user_role
     FROM contact_messages cm
     LEFT JOIN users u ON u.id = cm.user_id
     WHERE cm.status = 'new'
     ORDER BY cm.created_at DESC
     LIMIT 6`
  );

  res.json({
    success: true,
    data: {
      low_stock_threshold: lowStockThreshold,
      new_orders: newOrders.map((order) => ({
        id: Number(order.id),
        order_code: Number(order.order_code),
        buyer_name: order.buyer_name,
        total_amount: toNumber(order.total_amount),
        payment_status: order.payment_status,
        fulfillment_status: order.fulfillment_status || "pending",
        created_at: order.created_at
      })),
      low_stock_products: lowStockProducts.map((product) => ({
        id: Number(product.id),
        name: product.name,
        slug: product.slug,
        stock_quantity: Number(product.stock_quantity),
        image_url: normalizeNullableMediaPath(product.image_url)
      })),
      contact_messages: contactMessages.map((message) => ({
        id: Number(message.id),
        user_id: message.user_id === null ? null : Number(message.user_id),
        full_name: message.full_name,
        email: message.email,
        phone: message.phone,
        subject: message.subject,
        message: message.message,
        status: message.status,
        created_at: message.created_at,
        user_role: message.user_role || null
      }))
    }
  });
});

exports.replyContactMessage = asyncHandler(async (req, res) => {
  if (!handleValidation(req, res)) {
    return;
  }

  const messageId = Number(req.params.id);
  const replyMessage = String(req.body.reply_message || "").trim();
  const messageRows = await query(
    `SELECT id, user_id, full_name, email, phone, subject, message, status, reply_message, replied_at
     FROM contact_messages
     WHERE id = ?
     LIMIT 1`,
    [messageId]
  );

  if (!messageRows.length) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy lời nhắn liên hệ"
    });
  }

  const contactMessage = messageRows[0];

  if (contactMessage.reply_message) {
    return res.status(400).json({
      success: false,
      message: "Lời nhắn này đã được phản hồi trước đó"
    });
  }

  if (!isMailConfigured()) {
    return res.status(503).json({
      success: false,
      message: "Chưa cấu hình SMTP. Hãy thiết lập MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS và MAIL_FROM_EMAIL."
    });
  }

  const settingsRows = await query(
    `SELECT shop_name, contact_email
     FROM shop_settings
     WHERE id = 1
     LIMIT 1`
  );
  const settings = settingsRows[0] || {};

  await sendContactReplyMail({
    to: contactMessage.email,
    customerName: contactMessage.full_name,
    originalSubject: contactMessage.subject,
    originalMessage: contactMessage.message,
    replyMessage,
    shopName: settings.shop_name,
    contactEmail: settings.contact_email
  });

  await query(
    `UPDATE contact_messages
     SET reply_message = ?,
         replied_by = ?,
         replied_at = CURRENT_TIMESTAMP,
         status = 'closed'
     WHERE id = ?`,
    [replyMessage, req.user.id, messageId]
  );

  const updatedRows = await query(
    `SELECT cm.id, cm.user_id, cm.full_name, cm.email, cm.phone, cm.subject, cm.message,
            cm.status, cm.reply_message, cm.replied_at, replier.full_name AS replied_by_name
     FROM contact_messages cm
     LEFT JOIN users replier ON replier.id = cm.replied_by
     WHERE cm.id = ?
     LIMIT 1`,
    [messageId]
  );

  const updatedMessage = updatedRows[0];

  res.json({
    success: true,
    data: {
      message: {
        id: Number(updatedMessage.id),
        user_id: updatedMessage.user_id === null ? null : Number(updatedMessage.user_id),
        full_name: updatedMessage.full_name,
        email: updatedMessage.email,
        phone: updatedMessage.phone,
        subject: updatedMessage.subject,
        message: updatedMessage.message,
        status: updatedMessage.status,
        reply_message: updatedMessage.reply_message,
        replied_at: updatedMessage.replied_at,
        replied_by_name: updatedMessage.replied_by_name || null
      }
    }
  });
});

exports.getSettings = asyncHandler(async (_req, res) => {
  const [settingRows, adminRows] = await Promise.all([
    query("SELECT * FROM shop_settings WHERE id = 1 LIMIT 1"),
    query(
      `SELECT id, full_name, email, phone, role, auth_provider, avatar_url, created_at
       FROM users
       WHERE role IN ('admin', 'coach')
       ORDER BY FIELD(role, 'admin', 'coach'), created_at ASC`
    )
  ]);

  res.json({
    success: true,
    data: {
      settings: settingRows[0] || null,
      admin_accounts: adminRows.map((row) => ({
        id: Number(row.id),
        full_name: row.full_name,
        email: row.email,
        phone: row.phone,
        role: row.role,
        auth_provider: row.auth_provider || "local",
        avatar_url: normalizeNullableMediaPath(row.avatar_url),
        created_at: row.created_at
      }))
    }
  });
});

exports.updateSettings = asyncHandler(async (req, res) => {
  if (!handleValidation(req, res)) {
    return;
  }

  await query(
    `UPDATE shop_settings
     SET shop_name = ?,
         contact_email = ?,
         contact_phone = ?,
         address = ?,
         hero_title = ?,
         hero_subtitle = ?,
         low_stock_threshold = ?
     WHERE id = 1`,
    [
      req.body.shop_name,
      req.body.contact_email || null,
      req.body.contact_phone || null,
      req.body.address || null,
      req.body.hero_title || null,
      req.body.hero_subtitle || null,
      req.body.low_stock_threshold ?? 5
    ]
  );

  const rows = await query("SELECT * FROM shop_settings WHERE id = 1 LIMIT 1");

  res.json({
    success: true,
    data: {
      settings: rows[0]
    }
  });
});

exports.updateUserRole = asyncHandler(async (req, res) => {
  if (!handleValidation(req, res)) {
    return;
  }

  const targetUserId = Number(req.params.id);
  const targetRows = await query("SELECT id, role FROM users WHERE id = ? LIMIT 1", [targetUserId]);

  if (!targetRows.length) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy tài khoản"
    });
  }

  const currentRole = targetRows[0].role;
  const nextRole = req.body.role;

  if (currentRole === "admin" && nextRole !== "admin") {
    const adminCountRows = await query("SELECT COUNT(*) AS total FROM users WHERE role = 'admin'");
    const adminCount = Number(adminCountRows[0]?.total || 0);

    if (adminCount <= 1) {
      return res.status(400).json({
        success: false,
        message: "Hệ thống phải luôn có ít nhất một tài khoản admin"
      });
    }
  }

  await query("UPDATE users SET role = ? WHERE id = ?", [nextRole, targetUserId]);
  const updatedRows = await query(
    "SELECT id, full_name, email, phone, role, auth_provider, avatar_url, created_at FROM users WHERE id = ? LIMIT 1",
    [targetUserId]
  );

  res.json({
    success: true,
    data: {
      user: {
        id: Number(updatedRows[0].id),
        full_name: updatedRows[0].full_name,
        email: updatedRows[0].email,
        phone: updatedRows[0].phone,
        role: updatedRows[0].role,
        auth_provider: updatedRows[0].auth_provider || "local",
        avatar_url: normalizeNullableMediaPath(updatedRows[0].avatar_url),
        created_at: updatedRows[0].created_at
      }
    }
  });
});
