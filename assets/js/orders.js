(function () {
  const API_BASE_URL = window.BIGGYM_API_BASE_URL || (window.location.protocol === "file:" ? "http://localhost:4000/api" : `${window.location.origin}/api`);
  const refs = {
    userState: document.getElementById("orders-user-state"),
    feedback: document.getElementById("orders-feedback"),
    loginTip: document.getElementById("orders-login-tip"),
    emptyState: document.getElementById("orders-empty-state"),
    countBadge: document.getElementById("orders-count-badge"),
    list: document.getElementById("orders-list"),
    detailShell: document.getElementById("order-detail-shell"),
    detailNote: document.getElementById("order-detail-note"),
    lookupForm: document.getElementById("order-lookup-form"),
    lookupOrderCode: document.getElementById("lookup-order-code"),
    lookupPhone: document.getElementById("lookup-phone"),
    lookupSubmitButton: document.getElementById("lookup-submit-button")
  };

  let orders = [];
  let selectedOrderCode = null;

  function getStoredUser() {
    try {
      return JSON.parse(localStorage.getItem("biggym_user") || "null");
    } catch (_error) {
      return null;
    }
  }

  function getStoredToken() {
    return localStorage.getItem("biggym_token");
  }

  function isLoggedIn() {
    return Boolean(getStoredUser() && getStoredToken());
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatCurrency(value) {
    return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
  }

  function formatDateTime(value) {
    if (!value) {
      return "Chưa cập nhật";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Chưa cập nhật";
    }

    return new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(date);
  }

  function buildHeaders(withJson = false) {
    const headers = {};
    const token = getStoredToken();

    if (withJson) {
      headers["Content-Type"] = "application/json";
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  function setFeedback(type, message) {
    if (!refs.feedback) return;

    if (!message) {
      refs.feedback.classList.add("hidden");
      refs.feedback.textContent = "";
      return;
    }

    refs.feedback.classList.remove("hidden");
    refs.feedback.textContent = message;
    refs.feedback.className = "mb-8 rounded-[24px] border px-6 py-5 text-sm";

    if (type === "error") {
      refs.feedback.classList.add("border", "border-red-400/20", "bg-red-500/10", "text-red-100");
      return;
    }

    if (type === "success") {
      refs.feedback.classList.add("border", "border-green-400/20", "bg-green-500/10", "text-green-100");
      return;
    }

    refs.feedback.classList.add("border", "border-primary/15", "bg-primary/5", "text-gray-200");
  }

  function getPaymentStatusMeta(status) {
    switch (status) {
      case "PAID":
        return { label: "Đã thanh toán", className: "border-green-400/20 bg-green-500/10 text-green-100" };
      case "PROCESSING":
        return { label: "Đang xác nhận", className: "border-yellow-400/20 bg-yellow-500/10 text-yellow-100" };
      case "UNDERPAID":
        return { label: "Thanh toán thiếu", className: "border-yellow-400/20 bg-yellow-500/10 text-yellow-100" };
      case "CANCELLED":
        return { label: "Đã hủy thanh toán", className: "border-red-400/20 bg-red-500/10 text-red-100" };
      case "FAILED":
        return { label: "Thanh toán thất bại", className: "border-red-400/20 bg-red-500/10 text-red-100" };
      case "EXPIRED":
        return { label: "Phiên đã hết hạn", className: "border-red-400/20 bg-red-500/10 text-red-100" };
      default:
        return { label: "Chờ thanh toán", className: "border-yellow-400/20 bg-yellow-500/10 text-yellow-100" };
    }
  }

  function getFulfillmentStatusMeta(status) {
    switch (status) {
      case "completed":
        return { label: "Hoàn tất", className: "border-green-400/20 bg-green-500/10 text-green-100" };
      case "shipping":
        return { label: "Đang giao", className: "border-blue-400/20 bg-blue-500/10 text-blue-100" };
      case "cancelled":
        return { label: "Đã hủy", className: "border-red-400/20 bg-red-500/10 text-red-100" };
      default:
        return { label: "Đang xử lý", className: "border-primary/20 bg-primary/10 text-primary" };
    }
  }

  function getPrimaryStatusMeta(order) {
    if (order.payment_status !== "PAID") {
      return getPaymentStatusMeta(order.payment_status);
    }

    return getFulfillmentStatusMeta(order.fulfillment_status);
  }

  function renderBadge(meta) {
    return `<span class="inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${meta.className}">${escapeHtml(meta.label)}</span>`;
  }

  function setDetailPlaceholder(message) {
    refs.detailShell.innerHTML = `
      <div class="rounded-[24px] border border-white/5 bg-surface-container-low p-8 text-center text-sm leading-relaxed text-gray-500">
        ${escapeHtml(message)}
      </div>
    `;
  }

  function renderOrderList() {
    refs.countBadge.textContent = `${orders.length} đơn`;

    if (!orders.length) {
      refs.list.innerHTML = "";
      refs.emptyState.classList.remove("hidden");
      return;
    }

    refs.emptyState.classList.add("hidden");
    refs.list.innerHTML = orders.map((order) => {
      const active = Number(order.order_code) === Number(selectedOrderCode);
      const primaryStatus = getPrimaryStatusMeta(order);
      return `
        <button class="w-full rounded-[24px] border p-5 text-left transition-colors ${active ? "border-primary/30 bg-primary/8" : "border-white/5 bg-white/[0.02] hover:border-primary/20"}" data-order-code="${order.order_code}" type="button">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">Mã đơn</p>
              <p class="mt-2 text-lg font-semibold text-on-surface">#${escapeHtml(order.order_code)}</p>
            </div>
            ${renderBadge(primaryStatus)}
          </div>
          <div class="mt-4 grid gap-3 text-sm text-on-surface-variant">
            <div class="flex items-center justify-between gap-4">
              <span>Ngày tạo</span>
              <span class="text-right text-on-surface">${escapeHtml(formatDateTime(order.created_at))}</span>
            </div>
            <div class="flex items-center justify-between gap-4">
              <span>Tổng tiền</span>
              <span class="text-right font-semibold text-primary">${escapeHtml(formatCurrency(order.total_amount))}</span>
            </div>
            <div class="flex items-center justify-between gap-4">
              <span>Sản phẩm</span>
              <span class="text-right text-on-surface">${Number(order.items?.length || 0)} món</span>
            </div>
          </div>
        </button>
      `;
    }).join("");

    refs.list.querySelectorAll("[data-order-code]").forEach((button) => {
      button.addEventListener("click", () => {
        const orderCode = Number(button.dataset.orderCode);
        const order = orders.find((item) => Number(item.order_code) === orderCode);
        if (order) {
          selectedOrderCode = orderCode;
          renderOrderList();
          renderOrderDetail(order);
        }
      });
    });
  }

  function renderOrderDetail(order) {
    const paymentStatus = getPaymentStatusMeta(order.payment_status);
    const fulfillmentStatus = getFulfillmentStatusMeta(order.fulfillment_status);
    const canContinuePayment = ["PENDING", "PROCESSING", "UNDERPAID"].includes(order.payment_status) && order.checkout_url;

    refs.detailNote.textContent = `Đơn #${order.order_code} được tạo lúc ${formatDateTime(order.created_at)}.`;
    refs.detailShell.innerHTML = `
      <div class="space-y-6">
        <div class="grid gap-4 lg:grid-cols-3">
          <div class="rounded-[24px] border border-white/5 bg-surface-container-low p-5">
            <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">Mã đơn</p>
            <p class="mt-3 text-2xl font-light text-on-surface">#${escapeHtml(order.order_code)}</p>
          </div>
          <div class="rounded-[24px] border border-white/5 bg-surface-container-low p-5">
            <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">Thanh toán</p>
            <div class="mt-3">${renderBadge(paymentStatus)}</div>
          </div>
          <div class="rounded-[24px] border border-white/5 bg-surface-container-low p-5">
            <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">Xử lý đơn</p>
            <div class="mt-3">${renderBadge(fulfillmentStatus)}</div>
          </div>
        </div>

        <div class="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div class="space-y-6">
            <div class="rounded-[24px] border border-white/5 bg-surface-container-low p-6">
              <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-secondary">Thông tin nhận hàng</p>
              <div class="mt-5 space-y-4 text-sm text-on-surface-variant">
                <div class="flex items-start justify-between gap-4">
                  <span>Người nhận</span>
                  <span class="text-right text-on-surface">${escapeHtml(order.buyer_name || "Chưa cập nhật")}</span>
                </div>
                <div class="flex items-start justify-between gap-4">
                  <span>Số điện thoại</span>
                  <span class="text-right text-on-surface">${escapeHtml(order.buyer_phone || "Chưa cập nhật")}</span>
                </div>
                <div class="flex items-start justify-between gap-4">
                  <span>Email</span>
                  <span class="text-right text-on-surface">${escapeHtml(order.buyer_email || "Chưa cập nhật")}</span>
                </div>
                <div class="flex items-start justify-between gap-4">
                  <span>Địa chỉ</span>
                  <span class="max-w-[65%] text-right text-on-surface">${escapeHtml(order.shipping_address || "Chưa cập nhật")}</span>
                </div>
                <div class="flex items-start justify-between gap-4">
                  <span>Ghi chú</span>
                  <span class="max-w-[65%] text-right text-on-surface">${escapeHtml(order.note || "Không có")}</span>
                </div>
              </div>
            </div>

            <div class="rounded-[24px] border border-white/5 bg-surface-container-low p-6">
              <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-secondary">Tình trạng đơn</p>
              <div class="mt-5 space-y-4 text-sm leading-relaxed text-on-surface-variant">
                <div class="flex items-start justify-between gap-4">
                  <span>Ngày tạo</span>
                  <span class="text-right text-on-surface">${escapeHtml(formatDateTime(order.created_at))}</span>
                </div>
                <div class="flex items-start justify-between gap-4">
                  <span>Xác nhận thanh toán</span>
                  <span class="text-right text-on-surface">${escapeHtml(formatDateTime(order.paid_at))}</span>
                </div>
                <div class="flex items-start justify-between gap-4">
                  <span>Tổng thanh toán</span>
                  <span class="text-right text-lg font-semibold text-primary">${escapeHtml(formatCurrency(order.total_amount))}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-6">
            <div class="rounded-[24px] border border-white/5 bg-surface-container-low p-6">
              <div class="flex items-center justify-between gap-4">
                <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-secondary">Sản phẩm trong đơn</p>
                <span class="text-xs uppercase tracking-[0.18em] text-gray-500">${Number(order.items?.length || 0)} món</span>
              </div>
              <div class="mt-5 space-y-4">
                ${(order.items || []).map((item) => `
                  <div class="flex gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                    <div class="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-surface-container-high">
                      <img alt="${escapeHtml(item.product_name)}" class="h-full w-full object-cover" src="${escapeHtml(item.product_image_url || "../assets/images/weight-room.jpg")}"/>
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="font-semibold text-on-surface">${escapeHtml(item.product_name)}</p>
                      ${[item.variant_flavor, item.variant_size].filter(Boolean).length ? `<p class="mt-2 text-[11px] uppercase tracking-[0.18em] text-gray-500">${escapeHtml([item.variant_flavor, item.variant_size].filter(Boolean).join(" • "))}</p>` : ""}
                      <div class="mt-2 flex flex-wrap items-center justify-between gap-3 text-sm text-on-surface-variant">
                        <span>Số lượng: ${Number(item.quantity)}</span>
                        <span class="font-semibold text-primary">${escapeHtml(formatCurrency(item.line_total))}</span>
                      </div>
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>

            <div class="rounded-[24px] border border-primary/10 bg-primary/5 p-6">
              <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Thao tác tiếp theo</p>
              <div class="mt-4 flex flex-wrap gap-3">
                ${canContinuePayment
                  ? `<a class="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-xs font-bold uppercase tracking-[0.18em] text-on-primary" href="${escapeHtml(order.checkout_url)}">Tiếp tục thanh toán</a>`
                  : ""}
                <a class="inline-flex items-center justify-center rounded-full border border-white/10 px-6 py-3 text-xs font-bold uppercase tracking-[0.18em] text-gray-200 transition-colors hover:border-primary/30 hover:text-primary" href="shop.html">Quay lại cửa hàng</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async function apiFetch(url, options = {}) {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.success === false) {
      throw new Error(payload.message || "Không thể tải dữ liệu đơn hàng");
    }

    return payload;
  }

  async function loadMyOrders() {
    const payload = await apiFetch(`${API_BASE_URL}/checkout/orders/my`, {
      headers: buildHeaders()
    });

    orders = payload.data?.orders || [];
    refs.countBadge.textContent = `${orders.length} đơn`;

    if (!orders.length) {
      renderOrderList();
      setDetailPlaceholder("Bạn chưa có đơn hàng nào để theo dõi.");
      return;
    }

    const latestOrderCode = Number(sessionStorage.getItem("biggym_latest_order_code") || 0);
    const matchedOrder = orders.find((order) => Number(order.order_code) === latestOrderCode);
    const selectedOrder = matchedOrder || orders[0];

    selectedOrderCode = Number(selectedOrder.order_code);
    renderOrderList();
    renderOrderDetail(selectedOrder);
  }

  async function lookupOrder(orderCode, phone) {
    const payload = await apiFetch(`${API_BASE_URL}/checkout/orders/lookup`, {
      method: "POST",
      headers: buildHeaders(true),
      body: JSON.stringify({
        order_code: Number(orderCode),
        phone: String(phone || "").trim()
      })
    });

    const order = payload.data?.order;
    if (!order) {
      throw new Error("Không tìm thấy đơn hàng phù hợp với thông tin tra cứu");
    }

    selectedOrderCode = Number(order.order_code);

    const existingIndex = orders.findIndex((item) => Number(item.order_code) === Number(order.order_code));
    if (existingIndex >= 0) {
      orders[existingIndex] = order;
    } else if (isLoggedIn()) {
      orders.unshift(order);
    }

    if (isLoggedIn()) {
      renderOrderList();
    }

    renderOrderDetail(order);
    setFeedback("success", `Đã tải thông tin đơn #${order.order_code}.`);
  }

  function initUserState() {
    const user = getStoredUser();

    if (isLoggedIn()) {
      refs.userState.textContent = `Đã đăng nhập với ${user?.email || "tài khoản của bạn"}. Lịch sử đơn hàng sẽ được đồng bộ tự động.`;
      refs.loginTip.classList.add("hidden");
      return;
    }

    refs.userState.textContent = "Bạn chưa đăng nhập. Hãy đăng nhập để xem toàn bộ lịch sử mua hàng hoặc dùng tra cứu nhanh ở bên phải.";
    refs.loginTip.classList.remove("hidden");
    refs.emptyState.classList.add("hidden");
    refs.countBadge.textContent = "0 đơn";
    setDetailPlaceholder("Đăng nhập để xem danh sách đơn hàng của bạn hoặc tra cứu bằng mã đơn ở khối bên phải.");

    const latestOrderCode = sessionStorage.getItem("biggym_latest_order_code");
    if (latestOrderCode) {
      refs.lookupOrderCode.value = latestOrderCode;
    }
  }

  refs.lookupForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setFeedback("", "");

    const orderCode = refs.lookupOrderCode.value.trim();
    const phone = refs.lookupPhone.value.trim();

    if (!orderCode || !phone) {
      setFeedback("error", "Vui lòng nhập đầy đủ mã đơn hàng và số điện thoại nhận hàng.");
      return;
    }

    refs.lookupSubmitButton.disabled = true;
    refs.lookupSubmitButton.textContent = "Đang tra cứu...";

    try {
      await lookupOrder(orderCode, phone);
    } catch (error) {
      setFeedback("error", error.message || "Không thể tra cứu đơn hàng lúc này.");
    } finally {
      refs.lookupSubmitButton.disabled = false;
      refs.lookupSubmitButton.textContent = "Tra cứu đơn hàng";
    }
  });

  (async function bootstrap() {
    initUserState();

    if (!isLoggedIn()) {
      return;
    }

    try {
      await loadMyOrders();
    } catch (error) {
      refs.loginTip.classList.add("hidden");
      refs.emptyState.classList.add("hidden");
      setFeedback("error", error.message || "Không thể tải lịch sử đơn hàng.");
      setDetailPlaceholder("Không thể tải lịch sử đơn hàng của bạn lúc này.");
    }
  })();
})();
