const { body, param, validationResult } = require("express-validator");
const asyncHandler = require("../utils/asyncHandler");
const env = require("../config/env");
const { pool, query } = require("../services/queryService");
const { getPayOSClient, isPayOSConfigured } = require("../services/payosService");
const { normalizeNullableMediaPath } = require("../utils/mediaPaths");

const VALID_PAYMENT_STATUSES = new Set([
  "PENDING",
  "PROCESSING",
  "PAID",
  "CANCELLED",
  "FAILED",
  "EXPIRED",
  "UNDERPAID"
]);

function handleValidation(req, res) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorList = errors.array();
    res.status(400).json({
      success: false,
      message: errorList[0]?.msg || "Du lieu thanh toan khong hop le",
      errors: errorList
    });
    return false;
  }

  return true;
}

function sanitizeOptionalString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : null;
}

function normalizeStatus(status) {
  return VALID_PAYMENT_STATUSES.has(status) ? status : "PENDING";
}

function toCurrencyInt(value) {
  return Math.round(Number(value || 0));
}

function buildShortDescription(orderCode) {
  return `BG${String(orderCode).slice(-7)}`;
}

function generateOrderCode() {
  return Number(`${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`);
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function mapOrderRow(row) {
  return {
    id: Number(row.id),
    user_id: row.user_id === null ? null : Number(row.user_id),
    order_code: Number(row.order_code),
    payment_provider: row.payment_provider,
    payment_status: row.payment_status,
    fulfillment_status: row.fulfillment_status || "pending",
    checkout_url: row.checkout_url,
    payment_link_id: row.payment_link_id,
    qr_code: row.qr_code,
    buyer_name: row.buyer_name,
    buyer_email: row.buyer_email,
    buyer_phone: row.buyer_phone,
    shipping_address: row.shipping_address,
    note: row.note,
    subtotal_amount: Number(row.subtotal_amount),
    shipping_fee: Number(row.shipping_fee),
    discount_amount: Number(row.discount_amount),
    total_amount: Number(row.total_amount),
    reference_code: row.reference_code,
    return_status: row.return_status,
    paid_at: row.paid_at,
    inventory_reserved: Boolean(row.inventory_reserved),
    created_at: row.created_at,
    updated_at: row.updated_at,
    items: []
  };
}

function mapOrderItemRow(row) {
  return {
    id: Number(row.id),
    order_id: Number(row.order_id),
    product_id: row.product_id === null ? null : Number(row.product_id),
    product_variant_id: row.product_variant_id === null ? null : Number(row.product_variant_id),
    product_name: row.product_name,
    product_slug: row.product_slug,
    product_image_url: normalizeNullableMediaPath(row.product_image_url),
    variant_flavor: row.variant_flavor || "",
    variant_size: row.variant_size || "",
    unit_price: Number(row.unit_price),
    quantity: Number(row.quantity),
    line_total: Number(row.line_total)
  };
}

async function syncAggregateProductStock(connection, productIds) {
  for (const productId of productIds) {
    await connection.execute(
      `UPDATE products
       SET stock_quantity = (
         SELECT COALESCE(SUM(CASE WHEN is_active = 1 THEN stock_quantity ELSE 0 END), 0)
         FROM product_variants
         WHERE product_id = ?
       )
       WHERE id = ?`,
      [productId, productId]
    );
  }
}

async function reserveInventoryForOrderItems(connection, orderItems) {
  const aggregated = new Map();

  for (const item of orderItems) {
    const variantId = Number(item.product_variant_id || 0);
    if (!variantId) continue;
    aggregated.set(variantId, (aggregated.get(variantId) || 0) + Number(item.quantity || 0));
  }

  const touchedProductIds = new Set();

  for (const [variantId, quantity] of aggregated.entries()) {
    if (quantity <= 0) {
      continue;
    }

    const [variantRows] = await connection.execute(
      "SELECT product_id FROM product_variants WHERE id = ? LIMIT 1",
      [variantId]
    );
    const productId = Number(variantRows[0]?.product_id || 0);
    if (!productId) {
      const error = new Error("Bien the san pham khong hop le");
      error.statusCode = 400;
      throw error;
    }

    const [result] = await connection.execute(
      `UPDATE product_variants
       SET stock_quantity = stock_quantity - ?
       WHERE id = ? AND stock_quantity >= ?`,
      [quantity, variantId, quantity]
    );

    if (!result.affectedRows) {
      const error = new Error("So luong vuot ton kho");
      error.statusCode = 400;
      throw error;
    }

    touchedProductIds.add(productId);
  }

  await syncAggregateProductStock(connection, touchedProductIds);
}

async function adjustReservedInventoryByOrder(connection, orderId, direction) {
  const sign = direction === "restore" ? 1 : -1;
  const [itemRows] = await connection.execute(
    `SELECT product_id, product_variant_id, SUM(quantity) AS quantity
     FROM order_items
     WHERE order_id = ?
       AND product_variant_id IS NOT NULL
     GROUP BY product_id, product_variant_id`,
    [orderId]
  );

  const touchedProductIds = new Set();

  for (const item of itemRows) {
    const productId = Number(item.product_id || 0);
    const productVariantId = Number(item.product_variant_id || 0);
    const quantity = Number(item.quantity || 0);

    if (!productId || !productVariantId || quantity <= 0) {
      continue;
    }

    if (sign < 0) {
      const [result] = await connection.execute(
        `UPDATE product_variants
         SET stock_quantity = stock_quantity - ?
         WHERE id = ? AND stock_quantity >= ?`,
        [quantity, productVariantId, quantity]
      );

      if (!result.affectedRows) {
        const error = new Error("So luong vuot ton kho");
        error.statusCode = 400;
        throw error;
      }
    } else {
      await connection.execute(
        `UPDATE product_variants
         SET stock_quantity = stock_quantity + ?
         WHERE id = ?`,
        [quantity, productVariantId]
      );
    }

    touchedProductIds.add(productId);
  }

  await syncAggregateProductStock(connection, touchedProductIds);
}

async function applyInventoryDeduction(connection, orderId) {
  await adjustReservedInventoryByOrder(connection, orderId, "deduct");
}

async function applyInventoryRestock(connection, orderId) {
  await adjustReservedInventoryByOrder(connection, orderId, "restore");
}

async function fetchOrderByCode(orderCode) {
  const orderRows = await query(
    `SELECT *
     FROM orders
     WHERE order_code = ?
     LIMIT 1`,
    [orderCode]
  );

  const orderRow = orderRows[0];
  if (!orderRow) {
    return null;
  }

  const itemRows = await query(
    `SELECT *
     FROM order_items
     WHERE order_id = ?
     ORDER BY id ASC`,
    [orderRow.id]
  );

  const order = mapOrderRow(orderRow);
  order.items = itemRows.map(mapOrderItemRow);
  return order;
}

async function fetchOrdersByUserId(userId) {
  const orderRows = await query(
    `SELECT *
     FROM orders
     WHERE user_id = ?
     ORDER BY created_at DESC, id DESC`,
    [userId]
  );

  if (!orderRows.length) {
    return [];
  }

  const orderIds = orderRows.map((row) => Number(row.id));
  const placeholders = orderIds.map(() => "?").join(", ");
  const itemRows = await query(
    `SELECT *
     FROM order_items
     WHERE order_id IN (${placeholders})
     ORDER BY order_id DESC, id ASC`,
    orderIds
  );

  const itemsByOrderId = itemRows.reduce((accumulator, row) => {
    const orderId = Number(row.order_id);
    const currentItems = accumulator.get(orderId) || [];
    currentItems.push(mapOrderItemRow(row));
    accumulator.set(orderId, currentItems);
    return accumulator;
  }, new Map());

  return orderRows.map((row) => {
    const order = mapOrderRow(row);
    order.items = itemsByOrderId.get(Number(row.id)) || [];
    return order;
  });
}

async function persistOrderPaymentUpdate({
  orderCode,
  nextStatus,
  paymentLinkId = null,
  referenceCode = null,
  paidAt = null,
  returnStatus = null
}) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [orderRows] = await connection.execute(
      `SELECT id, order_code, payment_status, payment_link_id, reference_code, paid_at, inventory_reserved
       FROM orders
       WHERE order_code = ?
       LIMIT 1
       FOR UPDATE`,
      [Number(orderCode)]
    );

    if (!orderRows.length) {
      await connection.rollback();
      return null;
    }

    const currentOrder = orderRows[0];
    const normalizedNextStatus = normalizeStatus(nextStatus);
    const finalStatus = currentOrder.payment_status === "PAID" ? "PAID" : normalizedNextStatus;
    const finalReturnStatus = currentOrder.payment_status === "PAID"
      ? "PAID"
      : normalizeStatus(returnStatus || normalizedNextStatus);
    const resolvedPaidAt = finalStatus === "PAID"
      ? (currentOrder.paid_at || paidAt || new Date())
      : currentOrder.paid_at;
    const pendingStatuses = new Set(["PENDING", "PROCESSING", "UNDERPAID"]);
    const failedStatuses = new Set(["CANCELLED", "FAILED", "EXPIRED"]);
    let nextInventoryReserved = Number(currentOrder.inventory_reserved || 0);

    if (finalStatus === "PAID" && currentOrder.payment_status !== "PAID") {
      if (!nextInventoryReserved) {
        await applyInventoryDeduction(connection, currentOrder.id);
        nextInventoryReserved = 1;
      }
    } else if (
      failedStatuses.has(finalStatus)
      && pendingStatuses.has(currentOrder.payment_status)
      && nextInventoryReserved
    ) {
      await applyInventoryRestock(connection, currentOrder.id);
      nextInventoryReserved = 0;
    }

    await connection.execute(
      `UPDATE orders
       SET payment_status = ?,
           payment_link_id = COALESCE(?, payment_link_id),
           reference_code = COALESCE(?, reference_code),
           paid_at = CASE WHEN ? = 'PAID' THEN COALESCE(paid_at, ?) ELSE paid_at END,
           return_status = ?,
           inventory_reserved = ?
       WHERE id = ?`,
      [
        finalStatus,
        paymentLinkId,
        referenceCode,
        finalStatus,
        resolvedPaidAt,
        finalReturnStatus,
        nextInventoryReserved,
        currentOrder.id
      ]
    );

    await connection.commit();
    return fetchOrderByCode(Number(orderCode));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function syncOrderStatusFromPayOS(order) {
  if (!order || !isPayOSConfigured()) {
    return order;
  }

  try {
    const payos = getPayOSClient();
    const payment = await payos.paymentRequests.get(Number(order.order_code));
    const nextStatus = normalizeStatus(payment.status);
    const latestTransaction = Array.isArray(payment.transactions) ? payment.transactions[0] : null;
    const paidAt = nextStatus === "PAID"
      ? latestTransaction?.transactionDateTime || order.paid_at || new Date()
      : order.paid_at;

    return (await persistOrderPaymentUpdate({
      orderCode: order.order_code,
      nextStatus,
      paymentLinkId: payment.id || order.payment_link_id,
      referenceCode: latestTransaction?.reference || order.reference_code,
      paidAt,
      returnStatus: nextStatus
    })) || order;
  } catch (_error) {
    return order;
  }
}

function shouldSyncWithPayOS(order) {
  return Boolean(order) && ["PENDING", "PROCESSING", "UNDERPAID"].includes(order.payment_status);
}

async function buildOrderItemsFromProducts(connection, items) {
  const normalizedItems = (Array.isArray(items) ? items : [])
    .map((item) => ({
      product_id: Number(item.product_id),
      product_variant_id: Number(item.product_variant_id),
      quantity: Number(item.quantity)
    }))
    .filter((item) => Number.isInteger(item.product_variant_id) && item.product_variant_id > 0 && Number.isInteger(item.quantity) && item.quantity > 0);

  if (!normalizedItems.length) {
    const error = new Error("Gio hang dang trong");
    error.statusCode = 400;
    throw error;
  }

  const aggregatedItems = normalizedItems.reduce((accumulator, item) => {
    const existing = accumulator.get(item.product_variant_id) || {
      product_id: item.product_id || null,
      quantity: 0
    };
    existing.product_id = existing.product_id || item.product_id || null;
    existing.quantity += item.quantity;
    accumulator.set(item.product_variant_id, existing);
    return accumulator;
  }, new Map());

  const variantIds = Array.from(aggregatedItems.keys());
  const placeholders = variantIds.map(() => "?").join(", ");
  const [variantRows] = await connection.execute(
    `SELECT pv.id, pv.product_id, pv.flavor_label, pv.size_label,
            pv.price AS variant_price,
            pv.original_price AS variant_original_price,
            pv.stock_quantity AS variant_stock_quantity,
            pv.image_url AS variant_image_url,
            pv.is_active AS variant_is_active,
            p.name,
            p.slug,
            p.image_url AS product_image_url,
            p.is_active AS product_is_active
     FROM product_variants pv
     INNER JOIN products p ON p.id = pv.product_id
     WHERE pv.id IN (${placeholders})
     FOR UPDATE`,
    variantIds
  );

  const variantMap = new Map(variantRows.map((variant) => [Number(variant.id), variant]));
  const orderItems = [];

  for (const [productVariantId, requestedItem] of aggregatedItems.entries()) {
    const variant = variantMap.get(productVariantId);

    if (!variant || !variant.product_is_active || !variant.variant_is_active) {
      const error = new Error("Co san pham khong con kha dung de thanh toan");
      error.statusCode = 400;
      throw error;
    }

    if (requestedItem.product_id && Number(requestedItem.product_id) !== Number(variant.product_id)) {
      const error = new Error("Bien the san pham khong hop le");
      error.statusCode = 400;
      throw error;
    }

    const availableStock = Number(variant.variant_stock_quantity || 0);
    const quantity = Number(requestedItem.quantity || 0);

    if (availableStock <= 0) {
      const error = new Error(`San pham ${variant.name} da het hang`);
      error.statusCode = 400;
      throw error;
    }

    if (quantity > availableStock) {
      const error = new Error(`So luong vuot ton kho. Con lai ${availableStock}`);
      error.statusCode = 400;
      throw error;
    }

    const basePrice = toCurrencyInt(
      variant.variant_original_price === null || variant.variant_original_price === undefined
        ? variant.variant_price
        : variant.variant_original_price
    );
    const effectivePrice = toCurrencyInt(variant.variant_price);

    orderItems.push({
      product_id: Number(variant.product_id),
      product_variant_id: Number(variant.id),
      product_name: variant.name,
      product_slug: variant.slug,
      product_image_url: normalizeNullableMediaPath(variant.variant_image_url || variant.product_image_url),
      variant_flavor: variant.flavor_label || "",
      variant_size: variant.size_label || "",
      base_price: basePrice,
      unit_price: effectivePrice,
      quantity,
      line_total: effectivePrice * quantity
    });
  }

  return orderItems;
}

exports.checkoutValidators = {
  createPayOSCheckout: [
    body("full_name").isLength({ min: 2, max: 150 }).withMessage("Ho va ten phai tu 2 den 150 ky tu"),
    body("phone").isLength({ min: 8, max: 30 }).withMessage("So dien thoai phai tu 8 den 30 ky tu"),
    body("address").isLength({ min: 8, max: 255 }).withMessage("Dia chi giao hang phai tu 8 den 255 ky tu"),
    body("email").optional({ values: "falsy" }).isEmail().withMessage("Email khong hop le"),
    body("note").optional({ values: "falsy" }).isLength({ max: 1000 }).withMessage("Ghi chu don hang toi da 1000 ky tu"),
    body("items").isArray({ min: 1 }).withMessage("Don hang phai co it nhat mot san pham"),
    body("items.*.product_id").optional().isInt({ min: 1 }).withMessage("Ma san pham khong hop le"),
    body("items.*.product_variant_id").isInt({ min: 1 }).withMessage("Bien the san pham khong hop le"),
    body("items.*.quantity").isInt({ min: 1 }).withMessage("So luong san pham phai lon hon 0")
  ],
  lookupOrder: [
    body("order_code").isInt({ min: 1 }).withMessage("Ma don hang khong hop le"),
    body("phone").isLength({ min: 8, max: 30 }).withMessage("So dien thoai phai tu 8 den 30 ky tu")
  ],
  getOrderDetail: [
    param("orderCode").isInt({ min: 1 })
  ],
  getMyOrders: []
};

exports.createPayOSCheckout = asyncHandler(async (req, res) => {
  if (!handleValidation(req, res)) {
    return;
  }

  if (!isPayOSConfigured()) {
    return res.status(500).json({
      success: false,
      message: "PayOS chua duoc cau hinh tren server"
    });
  }

  const buyerName = req.body.full_name.trim();
  const buyerPhone = req.body.phone.trim();
  const buyerAddress = req.body.address.trim();
  const buyerEmail = sanitizeOptionalString(req.body.email);
  const note = sanitizeOptionalString(req.body.note);
  const userId = req.user?.id || null;
  const shippingFee = 0;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const orderItems = await buildOrderItemsFromProducts(connection, Array.isArray(req.body.items) ? req.body.items : []);
    const subtotalAmount = orderItems.reduce((sum, item) => sum + item.line_total, 0);
    const discountAmount = orderItems.reduce((sum, item) => sum + ((item.base_price - item.unit_price) * item.quantity), 0);
    const totalAmount = subtotalAmount + shippingFee;

    if (totalAmount <= 0) {
      const error = new Error("Tong tien don hang khong hop le");
      error.statusCode = 400;
      throw error;
    }

    await reserveInventoryForOrderItems(connection, orderItems);

    let orderCode = 0;
    let orderId = 0;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      orderCode = generateOrderCode();

      try {
        const [result] = await connection.execute(
          `INSERT INTO orders (
             user_id, order_code, payment_provider, payment_status, buyer_name, buyer_email,
             buyer_phone, shipping_address, note, subtotal_amount, shipping_fee,
             discount_amount, total_amount, inventory_reserved
           )
           VALUES (?, ?, 'payos', 'PENDING', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            orderCode,
            buyerName,
            buyerEmail,
            buyerPhone,
            buyerAddress,
            note,
            subtotalAmount,
            shippingFee,
            discountAmount,
            totalAmount,
            1
          ]
        );

        orderId = result.insertId;
        break;
      } catch (error) {
        if (error.code !== "ER_DUP_ENTRY") {
          throw error;
        }
      }
    }

    if (!orderId) {
      const error = new Error("Khong the tao ma don hang moi");
      error.statusCode = 500;
      throw error;
    }

    for (const item of orderItems) {
      await connection.execute(
        `INSERT INTO order_items (
           order_id, product_id, product_variant_id, product_name, product_slug, product_image_url,
           variant_flavor, variant_size, unit_price, quantity, line_total
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          item.product_id,
          item.product_variant_id,
          item.product_name,
          item.product_slug,
          item.product_image_url,
          item.variant_flavor || null,
          item.variant_size || null,
          item.unit_price,
          item.quantity,
          item.line_total
        ]
      );
    }

    let paymentLink;

    try {
      const payos = getPayOSClient();
      paymentLink = await payos.paymentRequests.create({
        orderCode,
        amount: totalAmount,
        description: buildShortDescription(orderCode),
        returnUrl: env.payos.returnUrl,
        cancelUrl: env.payos.cancelUrl,
        buyerName,
        buyerEmail: buyerEmail || undefined,
        buyerPhone,
        buyerAddress,
        items: orderItems.map((item) => ({
          name: [item.product_name, item.variant_flavor, item.variant_size].filter(Boolean).join(" - ").slice(0, 25),
          quantity: item.quantity,
          price: item.unit_price
        })),
        expiredAt: Math.floor(Date.now() / 1000) + (15 * 60)
      });
    } catch (error) {
      console.error("[PayOS] create payment link failed", {
        status: error?.status,
        code: error?.code,
        desc: error?.desc,
        message: error?.message
      });

      const detailMessage = error?.desc
        || error?.error?.desc
        || error?.error?.message
        || error?.message
        || "Khong the tao link thanh toan PayOS";
      const nextError = new Error(detailMessage);
      nextError.statusCode = error?.status || 502;
      throw nextError;
    }

    await connection.execute(
      `UPDATE orders
       SET payment_status = ?,
           checkout_url = ?,
           payment_link_id = ?,
           qr_code = ?,
           return_status = ?
       WHERE id = ?`,
      [
        normalizeStatus(paymentLink.status),
        paymentLink.checkoutUrl,
        paymentLink.paymentLinkId,
        paymentLink.qrCode,
        normalizeStatus(paymentLink.status),
        orderId
      ]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      data: {
        orderCode,
        checkoutUrl: paymentLink.checkoutUrl,
        paymentLinkId: paymentLink.paymentLinkId,
        qrCode: paymentLink.qrCode,
        amount: totalAmount,
        status: normalizeStatus(paymentLink.status)
      }
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});

exports.getOrderDetail = asyncHandler(async (req, res) => {
  if (!handleValidation(req, res)) {
    return;
  }

  const orderCode = Number(req.params.orderCode);
  let order = await fetchOrderByCode(orderCode);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Khong tim thay don hang"
    });
  }

  const requesterId = Number(req.user?.id || 0);
  const isAdmin = req.user?.role === "admin";

  if (!isAdmin && (!requesterId || requesterId !== Number(order.user_id || 0))) {
    return res.status(404).json({
      success: false,
      message: "Khong tim thay don hang"
    });
  }

  order = await syncOrderStatusFromPayOS(order);

  res.json({
    success: true,
    data: {
      order
    }
  });
});

exports.lookupOrder = asyncHandler(async (req, res) => {
  if (!handleValidation(req, res)) {
    return;
  }

  const orderCode = Number(req.body.order_code);
  const phone = normalizePhone(req.body.phone);
  let order = await fetchOrderByCode(orderCode);

  if (!order || normalizePhone(order.buyer_phone) !== phone) {
    return res.status(404).json({
      success: false,
      message: "Khong tim thay don hang phu hop voi thong tin tra cuu"
    });
  }

  if (shouldSyncWithPayOS(order)) {
    order = await syncOrderStatusFromPayOS(order);
  }

  res.json({
    success: true,
    data: {
      order
    }
  });
});

exports.getMyOrders = asyncHandler(async (req, res) => {
  let orders = await fetchOrdersByUserId(req.user.id);

  for (let index = 0; index < orders.length; index += 1) {
    if (shouldSyncWithPayOS(orders[index])) {
      orders[index] = await syncOrderStatusFromPayOS(orders[index]);
    }
  }

  res.json({
    success: true,
    count: orders.length,
    data: {
      orders
    }
  });
});

exports.handlePayOSWebhook = asyncHandler(async (req, res) => {
  if (!isPayOSConfigured()) {
    return res.status(500).json({
      error: -1,
      message: "PayOS chua duoc cau hinh"
    });
  }

  const payos = getPayOSClient();
  const webhookData = await payos.webhooks.verify(req.body);
  const nextStatus = webhookData.code === "00" ? "PAID" : "PROCESSING";

  await persistOrderPaymentUpdate({
    orderCode: Number(webhookData.orderCode),
    nextStatus,
    paymentLinkId: webhookData.paymentLinkId || null,
    referenceCode: webhookData.reference || null,
    paidAt: webhookData.transactionDateTime || new Date(),
    returnStatus: nextStatus
  });

  res.json({
    error: 0,
    message: "ok"
  });
});
