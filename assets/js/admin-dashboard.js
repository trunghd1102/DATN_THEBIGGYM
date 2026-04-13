(function () {
  const API_BASE_URL = window.BIGGYM_API_BASE_URL || (window.location.protocol === "file:" ? "http://localhost:4000/api" : `${window.location.origin}/api`);

  const state = {
    user: null,
    token: null,
    currentSection: "overview",
    charts: {},
    orders: [],
    products: [],
    customers: [],
    alerts: null,
    settings: null,
    currentOrderId: null,
    currentCustomerId: null,
    currentContactMessageId: null
  };

  const PRODUCT_DRAFT_KEY = "biggym_admin_product_draft";
  const PRODUCT_DRAFT_RESTORE_KEY = "biggym_admin_product_draft_restore";

  const sectionTitleMap = {
    overview: "Tổng quan vận hành",
    orders: "Quản lý đơn hàng",
    products: "Quản lý sản phẩm",
    customers: "Quản lý khách hàng",
    analytics: "Báo cáo & phân tích",
    alerts: "Thông báo hệ thống",
    settings: "Cài đặt quản trị"
  };

  const dom = {
    app: document.getElementById("admin-app"),
    accessBlock: document.getElementById("admin-access-block"),
    sidebar: document.getElementById("admin-sidebar"),
    mobileOverlay: document.getElementById("admin-mobile-overlay"),
    sidebarToggle: document.getElementById("admin-sidebar-toggle"),
    sectionButtons: Array.from(document.querySelectorAll("[data-section-trigger]")),
    sections: Array.from(document.querySelectorAll("[data-admin-section]")),
    headerTitle: document.getElementById("admin-header-title"),
    heroTitle: document.getElementById("admin-hero-title"),
    heroSubtitle: document.getElementById("admin-hero-subtitle"),
    headerName: document.getElementById("admin-header-name"),
    headerRole: document.getElementById("admin-header-role"),
    headerAvatar: document.getElementById("admin-header-avatar"),
    logoutButton: document.getElementById("admin-logout-button"),
    openAlertsButton: document.getElementById("admin-open-alerts"),
    alertCount: document.getElementById("admin-alert-count")
  };

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

  function buildHeaders(includeJson = false) {
    const headers = {};

    if (includeJson) {
      headers["Content-Type"] = "application/json";
    }

    if (state.token) {
      headers.Authorization = `Bearer ${state.token}`;
    }

    return headers;
  }

  function formatCurrency(value) {
    return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
  }

  function formatDateTime(value) {
    if (!value) {
      return "—";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function slugify(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function splitTextareaLines(value) {
    return String(value || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function parseDelimitedRows(value, mapper) {
    return splitTextareaLines(value)
      .map((line) => line.split("|").map((part) => part.trim()))
      .map(mapper)
      .filter(Boolean);
  }

  function parseGalleryUrls(value) {
    return splitTextareaLines(value);
  }

  function parseFlavors(value) {
    return parseDelimitedRows(value, ([label, image_url]) => {
      if (!label) return null;
      return {
        label,
        image_url: image_url || ""
      };
    });
  }

  function parseSizes(value) {
    return parseDelimitedRows(value, ([label, price, original_price, image_url]) => {
      if (!label) return null;
      return {
        label,
        price: price ? Number(price) : null,
        original_price: original_price ? Number(original_price) : null,
        image_url: image_url || ""
      };
    });
  }

  function parseVariants(value) {
    try {
      const parsed = JSON.parse(String(value || "[]"));
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  function parseTitleBodyRows(value) {
    return parseDelimitedRows(value, ([title, body]) => {
      if (!title || !body) return null;
      return { title, body };
    });
  }

  function parseLabelValueRows(value) {
    return parseDelimitedRows(value, ([label, rowValue]) => {
      if (!label || !rowValue) return null;
      return { label, value: rowValue };
    });
  }

  function parseNotes(value) {
    return splitTextareaLines(value);
  }

  function stringifyFlavorRows(items) {
    return (items || []).map((item) => `${item.label || ""}|${item.image_url || ""}`).join("\n");
  }

  function stringifySizeRows(items) {
    return (items || []).map((item) => `${item.label || ""}|${item.price ?? ""}|${item.original_price ?? ""}|${item.image_url || ""}`).join("\n");
  }

  function stringifyVariantRows(items) {
    return JSON.stringify(items || []);
  }

  function stringifyTitleBodyRows(items) {
    return (items || []).map((item) => `${item.title || ""}|${item.body || ""}`).join("\n");
  }

  function stringifyLabelValueRows(items) {
    return (items || []).map((item) => `${item.label || ""}|${item.value || ""}`).join("\n");
  }

  function stringifyNotes(items) {
    return (items || []).join("\n");
  }

  function parseVariantGeneratorLines(value) {
    return Array.from(new Set(
      splitTextareaLines(value).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean)
    ));
  }

  function getVariantComboKey(flavorLabel, sizeLabel) {
    return `${String(flavorLabel || "").trim().toLowerCase()}::${String(sizeLabel || "").trim().toLowerCase()}`;
  }

  function toOptionalNumber(value) {
    if (value === "" || value === null || value === undefined) {
      return null;
    }

    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  function getVariantGeneratorDefaults() {
    return {
      price: toOptionalNumber(document.getElementById("product-variant-generator-price")?.value),
      original_price: toOptionalNumber(document.getElementById("product-variant-generator-original-price")?.value),
      stock_quantity: toOptionalNumber(document.getElementById("product-variant-generator-stock")?.value),
      image_url: document.getElementById("product-variant-generator-image-url")?.value?.trim() || ""
    };
  }

  function fillVariantGeneratorFromVariants(variants = [], product = null) {
    const sortedVariants = [...(variants || [])].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
    const primaryVariant = sortedVariants[0] || null;
    const flavorLabels = Array.from(new Set(sortedVariants.map((variant) => String(variant.flavor_label || "").trim()).filter(Boolean)));
    const sizeLabels = Array.from(new Set(sortedVariants.map((variant) => String(variant.size_label || "").trim()).filter(Boolean)));

    document.getElementById("product-variant-generator-flavors").value = flavorLabels.join("\n");
    document.getElementById("product-variant-generator-sizes").value = sizeLabels.join("\n");
    document.getElementById("product-variant-generator-price").value = primaryVariant?.price ?? product?.sale_price ?? product?.price ?? "";
    document.getElementById("product-variant-generator-original-price").value = primaryVariant?.original_price ?? product?.price ?? "";
    document.getElementById("product-variant-generator-stock").value = primaryVariant?.stock_quantity ?? "";
    document.getElementById("product-variant-generator-image-url").value = primaryVariant?.image_url || product?.image_url || "";
  }

  function deriveFlavorRowsFromVariants(variants = [], fallbackRows = []) {
    const fallbackMap = new Map((fallbackRows || []).map((item) => [
      String(item.label || "").trim().toLowerCase(),
      item
    ]));

    return Array.from(new Map(
      (variants || [])
        .map((item) => ({
          label: String(item.flavor_label || "").trim(),
          image_url: String(item.image_url || "").trim()
        }))
        .filter((item) => item.label)
        .map((item) => [item.label.toLowerCase(), item])
    ).values()).map((item) => {
      const fallback = fallbackMap.get(item.label.toLowerCase());
      return {
        label: item.label,
        image_url: item.image_url || fallback?.image_url || ""
      };
    });
  }

  function deriveSizeRowsFromVariants(variants = [], fallbackRows = []) {
    const fallbackMap = new Map((fallbackRows || []).map((item) => [
      String(item.label || "").trim().toLowerCase(),
      item
    ]));

    return Array.from(new Map(
      (variants || [])
        .map((item) => ({
          label: String(item.size_label || "").trim(),
          price: item.price === "" || item.price === null || item.price === undefined ? null : Number(item.price),
          original_price: item.original_price === "" || item.original_price === null || item.original_price === undefined ? null : Number(item.original_price),
          image_url: String(item.image_url || "").trim()
        }))
        .filter((item) => item.label)
        .map((item) => [item.label.toLowerCase(), item])
    ).values()).map((item) => {
      const fallback = fallbackMap.get(item.label.toLowerCase());
      return {
        label: item.label,
        price: item.price ?? fallback?.price ?? null,
        original_price: item.original_price ?? fallback?.original_price ?? null,
        image_url: item.image_url || fallback?.image_url || ""
      };
    });
  }

  function refreshProductAggregateFieldsFromVariants(variants = []) {
    const normalizedVariants = (variants || [])
      .map((item, index) => ({
        ...item,
        price: item.price === "" || item.price === null || item.price === undefined ? null : Number(item.price),
        original_price: item.original_price === "" || item.original_price === null || item.original_price === undefined ? null : Number(item.original_price),
        stock_quantity: item.stock_quantity === "" || item.stock_quantity === null || item.stock_quantity === undefined ? 0 : Number(item.stock_quantity),
        sort_order: item.sort_order === "" || item.sort_order === null || item.sort_order === undefined ? index : Number(item.sort_order),
        is_active: item.is_active !== false
      }))
      .filter((item) => Number(item.price) > 0);

    const activeVariants = normalizedVariants.filter((item) => item.is_active !== false);
    const primaryVariant = [...(activeVariants.length ? activeVariants : normalizedVariants)]
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))[0];
    const totalStock = activeVariants.reduce((sum, item) => sum + Math.max(0, Number(item.stock_quantity || 0)), 0);
    const productPriceInput = document.getElementById("product-price");
    const productSalePriceInput = document.getElementById("product-sale-price");
    const productStockInput = document.getElementById("product-stock");

    if (!productPriceInput || !productSalePriceInput || !productStockInput) {
      return;
    }

    if (!primaryVariant) {
      productPriceInput.value = "0";
      productSalePriceInput.value = "";
      productStockInput.value = "0";
      return;
    }

    const hasDiscount = Number(primaryVariant.original_price || 0) > Number(primaryVariant.price || 0);
    productPriceInput.value = String(hasDiscount ? Number(primaryVariant.original_price || 0) : Number(primaryVariant.price || 0));
    productSalePriceInput.value = hasDiscount ? String(Number(primaryVariant.price || 0)) : "";
    productStockInput.value = String(totalStock);
  }

  function normalizeUrlList(urls) {
    return Array.from(new Set((urls || []).map((url) => String(url || "").trim()).filter(Boolean)));
  }

  function renderProductGalleryPreview(urls = []) {
    const container = document.getElementById("product-gallery-preview");
    if (!container) return;

    const normalizedUrls = normalizeUrlList(urls);

    container.innerHTML = normalizedUrls.length
      ? normalizedUrls.map((url) => `
        <div class="overflow-hidden rounded-2xl border border-white/10 bg-surface-container-high">
          <img alt="Gallery preview" class="aspect-square w-full object-cover" src="${escapeHtml(url)}" />
        </div>
      `).join("")
      : `
        <div class="col-span-3 rounded-2xl border border-white/10 bg-surface-container px-4 py-5 text-center text-xs uppercase tracking-[0.18em] text-gray-500">
          Chưa có ảnh gallery
        </div>
      `;
  }

  function getGalleryPreviewUrlsFromForm() {
    syncAdvancedRepeatersToInputs();
    const uploadedFileUrls = Array.from(document.getElementById("product-gallery-files")?.files || []).map((file) => URL.createObjectURL(file));
    const manualUrls = parseGalleryUrls(document.getElementById("product-gallery-urls").value);
    return [...manualUrls, ...uploadedFileUrls];
  }

  function refreshAdvancedGalleryPreview() {
    renderProductGalleryPreview(getGalleryPreviewUrlsFromForm());
  }

  const advancedFieldMap = {
    gallery: { inputId: "product-gallery-urls", containerId: "detail-repeater-gallery" },
    variants: { inputId: "product-variants", containerId: "detail-repeater-variants" },
    flavors: { inputId: "product-flavors", containerId: "detail-repeater-flavors" },
    sizes: { inputId: "product-sizes", containerId: "detail-repeater-sizes" },
    feature_cards: { inputId: "product-feature-cards", containerId: "detail-repeater-feature-cards" },
    quick_info: { inputId: "product-quick-info", containerId: "detail-repeater-quick-info" },
    highlights: { inputId: "product-highlights", containerId: "detail-repeater-highlights" },
    usage_guide: { inputId: "product-usage-guide", containerId: "detail-repeater-usage-guide" },
    notes: { inputId: "product-notes", containerId: "detail-repeater-notes" }
  };

  function createAdvancedRow(type, values = {}) {
    if (type === "gallery") {
      return `
        <div class="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
          <input data-advanced-field="url" class="w-full rounded-2xl border border-white/10 bg-surface-container px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-0" placeholder="URL ảnh gallery" type="text" value="${escapeHtml(values.url || "")}" />
          <button class="rounded-full border border-red-400/20 px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-red-200" data-repeater-remove type="button">Xóa</button>
        </div>
      `;
    }

    if (type === "notes") {
      return `
        <div class="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
          <input data-advanced-field="note" class="w-full rounded-2xl border border-white/10 bg-surface-container px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-0" placeholder="Nội dung lưu ý" type="text" value="${escapeHtml(values.note || "")}" />
          <button class="rounded-full border border-red-400/20 px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-red-200" data-repeater-remove type="button">Xóa</button>
        </div>
      `;
    }

    if (type === "flavors") {
      return `
        <div class="space-y-3">
          <div class="grid gap-3 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <input data-advanced-field="label" class="w-full rounded-2xl border border-white/10 bg-surface-container px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-0" placeholder="Tên vị" type="text" value="${escapeHtml(values.label || "")}" />
            <input data-advanced-field="image_url" class="w-full rounded-2xl border border-white/10 bg-surface-container px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-0" placeholder="URL ảnh vị" type="text" value="${escapeHtml(values.image_url || "")}" />
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <input accept="image/*" class="block min-w-[220px] flex-1 rounded-2xl border border-white/10 bg-surface-container px-4 py-3 text-sm text-on-surface file:mr-4 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-xs file:font-black file:uppercase file:tracking-[0.18em] file:text-on-primary" data-advanced-file="image" type="file" />
            <button class="rounded-full border border-primary/20 px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-primary" data-repeater-upload type="button">Tải ảnh</button>
            <div class="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-surface-container-high" data-advanced-thumb-shell></div>
            <button class="rounded-full border border-red-400/20 px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-red-200" data-repeater-remove type="button">Xóa</button>
          </div>
        </div>
      `;
    }

    if (type === "variants") {
      return `
        <div class="space-y-3">
          <input data-advanced-field="id" type="hidden" value="${escapeHtml(values.id ?? "")}" />
          <div class="grid gap-3 xl:grid-cols-2">
            <input data-advanced-field="flavor_label" class="w-full rounded-2xl border border-white/10 bg-surface-container px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-0" placeholder="Hương vị" type="text" value="${escapeHtml(values.flavor_label || "")}" />
            <input data-advanced-field="size_label" class="w-full rounded-2xl border border-white/10 bg-surface-container px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-0" placeholder="Quy cách" type="text" value="${escapeHtml(values.size_label || "")}" />
          </div>
          <div class="grid gap-3 xl:grid-cols-2 2xl:grid-cols-4">
            <input data-advanced-field="price" class="w-full rounded-2xl border border-white/10 bg-surface-container px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-0" placeholder="Giá bán" type="number" value="${escapeHtml(values.price ?? "")}" />
            <input data-advanced-field="original_price" class="w-full rounded-2xl border border-white/10 bg-surface-container px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-0" placeholder="Giá gốc" type="number" value="${escapeHtml(values.original_price ?? "")}" />
            <input data-advanced-field="stock_quantity" class="w-full rounded-2xl border border-white/10 bg-surface-container px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-0" placeholder="Tồn kho" min="0" type="number" value="${escapeHtml(values.stock_quantity ?? "")}" />
            <input data-advanced-field="sort_order" class="w-full rounded-2xl border border-white/10 bg-surface-container px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-0" placeholder="Thứ tự" min="0" type="number" value="${escapeHtml(values.sort_order ?? "")}" />
          </div>
          <div class="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
            <input data-advanced-field="image_url" class="w-full rounded-2xl border border-white/10 bg-surface-container px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-0" placeholder="URL ảnh biến thể" type="text" value="${escapeHtml(values.image_url || "")}" />
            <label class="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-gray-200">
              <input data-advanced-field="is_active" class="rounded border-white/10 bg-surface-container text-primary focus:ring-primary" type="checkbox" ${values.is_active === false || values.is_active === "0" ? "" : "checked"} />
              Active
            </label>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <input accept="image/*" class="block min-w-[220px] flex-1 rounded-2xl border border-white/10 bg-surface-container px-4 py-3 text-sm text-on-surface file:mr-4 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-xs file:font-black file:uppercase file:tracking-[0.18em] file:text-on-primary" data-advanced-file="image" type="file" />
            <button class="rounded-full border border-primary/20 px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-primary" data-repeater-upload type="button">Tải ảnh</button>
            <div class="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-surface-container-high" data-advanced-thumb-shell></div>
            <button class="rounded-full border border-red-400/20 px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-red-200" data-repeater-remove type="button">Xóa</button>
          </div>
        </div>
      `;
    }

    if (type === "sizes") {
      return `
        <div class="space-y-3">
          <div class="grid gap-3 xl:grid-cols-2">
            <input data-advanced-field="label" class="w-full rounded-2xl border border-white/10 bg-surface-container px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-0" placeholder="Tên quy cách" type="text" value="${escapeHtml(values.label || "")}" />
            <input data-advanced-field="image_url" class="w-full rounded-2xl border border-white/10 bg-surface-container px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-0" placeholder="URL ảnh quy cách" type="text" value="${escapeHtml(values.image_url || "")}" />
          </div>
          <div class="grid gap-3 xl:grid-cols-2">
            <input data-advanced-field="price" class="w-full rounded-2xl border border-white/10 bg-surface-container px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-0" placeholder="Giá hiển thị" type="number" value="${escapeHtml(values.price ?? "")}" />
            <input data-advanced-field="original_price" class="w-full rounded-2xl border border-white/10 bg-surface-container px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-0" placeholder="Giá gốc" type="number" value="${escapeHtml(values.original_price ?? "")}" />
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <input accept="image/*" class="block min-w-[220px] flex-1 rounded-2xl border border-white/10 bg-surface-container px-4 py-3 text-sm text-on-surface file:mr-4 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-xs file:font-black file:uppercase file:tracking-[0.18em] file:text-on-primary" data-advanced-file="image" type="file" />
            <button class="rounded-full border border-primary/20 px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-primary" data-repeater-upload type="button">Tải ảnh</button>
            <div class="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-surface-container-high" data-advanced-thumb-shell></div>
            <button class="rounded-full border border-red-400/20 px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-red-200" data-repeater-remove type="button">Xóa</button>
          </div>
        </div>
      `;
    }

    if (type === "quick_info") {
      return `
        <div class="grid gap-3 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto]">
          <input data-advanced-field="label" class="w-full rounded-2xl border border-white/10 bg-surface-container px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-0" placeholder="Nhãn" type="text" value="${escapeHtml(values.label || "")}" />
          <input data-advanced-field="value" class="w-full rounded-2xl border border-white/10 bg-surface-container px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-0" placeholder="Giá trị" type="text" value="${escapeHtml(values.value || "")}" />
          <button class="rounded-full border border-red-400/20 px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-red-200" data-repeater-remove type="button">Xóa</button>
        </div>
      `;
    }

    return `
      <div class="grid gap-3 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto]">
        <input data-advanced-field="title" class="w-full rounded-2xl border border-white/10 bg-surface-container px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-0" placeholder="Tiêu đề" type="text" value="${escapeHtml(values.title || "")}" />
        <input data-advanced-field="body" class="w-full rounded-2xl border border-white/10 bg-surface-container px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-0" placeholder="Nội dung" type="text" value="${escapeHtml(values.body || "")}" />
        <button class="rounded-full border border-red-400/20 px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-red-200" data-repeater-remove type="button">Xóa</button>
      </div>
    `;
  }

  function renderAdvancedRowMediaPreview(row) {
    const previewShell = row?.querySelector("[data-advanced-thumb-shell]");
    const imageUrl = row?.querySelector('[data-advanced-field="image_url"]')?.value?.trim();
    if (!previewShell) return;

    previewShell.innerHTML = imageUrl
      ? `<img alt="Preview" class="h-full w-full object-cover" src="${escapeHtml(imageUrl)}" />`
      : `<span class="text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">Ảnh</span>`;
  }

  function refreshAdvancedRowMediaPreviews() {
    document.querySelectorAll('[data-repeater-row="flavors"], [data-repeater-row="sizes"], [data-repeater-row="variants"]').forEach((row) => {
      renderAdvancedRowMediaPreview(row);
    });
  }

  function setHiddenAdvancedFieldsVisibility() {
    document.querySelectorAll("[data-legacy-advanced-field]").forEach((element) => {
      element.classList.add("hidden");
    });
  }

  function renderAdvancedRepeater(type, items = []) {
    const config = advancedFieldMap[type];
    const container = config ? document.getElementById(config.containerId) : null;
    if (!container) return;

    container.innerHTML = (items.length ? items : [{}]).map((item) => `
      <div class="rounded-2xl border border-white/10 bg-surface-container p-3" data-repeater-row="${type}">
        ${createAdvancedRow(type, item)}
      </div>
    `).join("");
  }

  function appendAdvancedRepeaterRow(type, values = {}) {
    const config = advancedFieldMap[type];
    const container = config ? document.getElementById(config.containerId) : null;
    if (!container) return;

    container.insertAdjacentHTML("beforeend", `
      <div class="rounded-2xl border border-white/10 bg-surface-container p-3" data-repeater-row="${type}">
        ${createAdvancedRow(type, values)}
      </div>
    `);
  }

  function hydrateAdvancedRepeatersFromInputs() {
    renderAdvancedRepeater("gallery", parseGalleryUrls(document.getElementById("product-gallery-urls").value).map((url) => ({ url })));
    renderAdvancedRepeater("variants", parseVariants(document.getElementById("product-variants").value));
    renderAdvancedRepeater("flavors", parseFlavors(document.getElementById("product-flavors").value));
    renderAdvancedRepeater("sizes", parseSizes(document.getElementById("product-sizes").value));
    renderAdvancedRepeater("feature_cards", parseTitleBodyRows(document.getElementById("product-feature-cards").value));
    renderAdvancedRepeater("quick_info", parseLabelValueRows(document.getElementById("product-quick-info").value));
    renderAdvancedRepeater("highlights", parseTitleBodyRows(document.getElementById("product-highlights").value));
    renderAdvancedRepeater("usage_guide", parseTitleBodyRows(document.getElementById("product-usage-guide").value));
    renderAdvancedRepeater("notes", parseNotes(document.getElementById("product-notes").value).map((note) => ({ note })));
    refreshAdvancedRowMediaPreviews();
    refreshAdvancedGalleryPreview();
    refreshProductAggregateFieldsFromVariants(parseVariants(document.getElementById("product-variants").value));
    clearVariantValidationState();
  }

  function collectAdvancedRepeaterRows(type) {
    const config = advancedFieldMap[type];
    const container = config ? document.getElementById(config.containerId) : null;
    if (!container) return [];

    return Array.from(container.querySelectorAll(`[data-repeater-row="${type}"]`)).map((row) => {
      const getValue = (key) => row.querySelector(`[data-advanced-field="${key}"]`)?.value?.trim() || "";

      if (type === "gallery") {
        return { url: getValue("url") };
      }
      if (type === "notes") {
        return { note: getValue("note") };
      }
      if (type === "flavors") {
        return { label: getValue("label"), image_url: getValue("image_url") };
      }
      if (type === "variants") {
        return {
          id: getValue("id"),
          flavor_label: getValue("flavor_label"),
          size_label: getValue("size_label"),
          price: getValue("price"),
          original_price: getValue("original_price"),
          stock_quantity: getValue("stock_quantity"),
          sort_order: getValue("sort_order"),
          image_url: getValue("image_url"),
          is_active: Boolean(row.querySelector('[data-advanced-field="is_active"]')?.checked)
        };
      }
      if (type === "sizes") {
        return { label: getValue("label"), price: getValue("price"), original_price: getValue("original_price"), image_url: getValue("image_url") };
      }
      if (type === "quick_info") {
        return { label: getValue("label"), value: getValue("value") };
      }

      return { title: getValue("title"), body: getValue("body") };
    }).filter((item) => Object.values(item).some(Boolean));
  }

  function syncAdvancedRepeatersToInputs() {
    const variantRows = collectAdvancedRepeaterRows("variants");
    const fallbackFlavorRows = parseFlavors(document.getElementById("product-flavors").value);
    const fallbackSizeRows = parseSizes(document.getElementById("product-sizes").value);

    document.getElementById("product-gallery-urls").value = collectAdvancedRepeaterRows("gallery").map((item) => item.url).filter(Boolean).join("\n");
    document.getElementById("product-variants").value = stringifyVariantRows(variantRows);
    document.getElementById("product-flavors").value = stringifyFlavorRows(deriveFlavorRowsFromVariants(variantRows, fallbackFlavorRows));
    document.getElementById("product-sizes").value = stringifySizeRows(deriveSizeRowsFromVariants(variantRows, fallbackSizeRows));
    document.getElementById("product-feature-cards").value = stringifyTitleBodyRows(collectAdvancedRepeaterRows("feature_cards"));
    document.getElementById("product-quick-info").value = stringifyLabelValueRows(collectAdvancedRepeaterRows("quick_info"));
    document.getElementById("product-highlights").value = stringifyTitleBodyRows(collectAdvancedRepeaterRows("highlights"));
    document.getElementById("product-usage-guide").value = stringifyTitleBodyRows(collectAdvancedRepeaterRows("usage_guide"));
    document.getElementById("product-notes").value = stringifyNotes(collectAdvancedRepeaterRows("notes").map((item) => item.note));
    refreshProductAggregateFieldsFromVariants(variantRows);
  }

  function ensureVariantFeedbackNode(row) {
    let feedback = row?.querySelector("[data-variant-row-feedback]");

    if (!row) {
      return null;
    }

    if (!feedback) {
      feedback = document.createElement("p");
      feedback.className = "hidden text-xs leading-relaxed text-red-200";
      feedback.setAttribute("data-variant-row-feedback", "");
      row.appendChild(feedback);
    }

    return feedback;
  }

  function clearVariantValidationState() {
    document.querySelectorAll('[data-repeater-row="variants"]').forEach((row) => {
      row.classList.remove("border-red-400/30", "bg-red-500/5");
      row.classList.add("border-white/10", "bg-surface-container");
      const feedback = ensureVariantFeedbackNode(row);
      if (feedback) {
        feedback.textContent = "";
        feedback.classList.add("hidden");
      }
    });
  }

  function validateVariantRowsInEditor() {
    const rows = Array.from(document.querySelectorAll('[data-repeater-row="variants"]'));
    clearVariantValidationState();

    const comboMap = new Map();

    rows.forEach((row, index) => {
      const flavorLabel = row.querySelector('[data-advanced-field="flavor_label"]')?.value?.trim() || "";
      const sizeLabel = row.querySelector('[data-advanced-field="size_label"]')?.value?.trim() || "";
      const priceValue = row.querySelector('[data-advanced-field="price"]')?.value?.trim() || "";

      if (!flavorLabel && !sizeLabel) {
        return;
      }

      if (!priceValue) {
        return;
      }

      const key = getVariantComboKey(flavorLabel, sizeLabel);
      const currentRows = comboMap.get(key) || [];
      currentRows.push({
        row,
        index,
        flavorLabel,
        sizeLabel
      });
      comboMap.set(key, currentRows);
    });

    const duplicateGroups = Array.from(comboMap.values()).filter((items) => items.length > 1);

    if (!duplicateGroups.length) {
      return {
        valid: true,
        message: ""
      };
    }

    duplicateGroups.forEach((group) => {
      const label = [group[0].flavorLabel, group[0].sizeLabel].filter(Boolean).join(" - ") || "Biến thể trống";
      group.forEach((item) => {
        item.row.classList.remove("border-white/10", "bg-surface-container");
        item.row.classList.add("border-red-400/30", "bg-red-500/5");
        const feedback = ensureVariantFeedbackNode(item.row);
        if (feedback) {
          feedback.textContent = `Tổ hợp "${label}" đang bị trùng với một dòng biến thể khác.`;
          feedback.classList.remove("hidden");
        }
      });
    });

    const firstDuplicate = duplicateGroups[0]?.[0]?.row;
    firstDuplicate?.scrollIntoView({ behavior: "smooth", block: "center" });

    return {
      valid: false,
      message: "Danh sách biến thể đang có tổ hợp hương vị + quy cách bị trùng."
    };
  }

  function generateVariantMatrix() {
    syncAdvancedRepeatersToInputs();

    const flavorLabels = parseVariantGeneratorLines(document.getElementById("product-variant-generator-flavors").value);
    const sizeLabels = parseVariantGeneratorLines(document.getElementById("product-variant-generator-sizes").value);

    if (!flavorLabels.length && !sizeLabels.length) {
      throw new Error("Hãy nhập ít nhất một hương vị hoặc một quy cách để tạo biến thể");
    }

    const defaults = getVariantGeneratorDefaults();
    const existingVariantRows = collectAdvancedRepeaterRows("variants");
    const existingFlavorRows = parseFlavors(document.getElementById("product-flavors").value);
    const existingSizeRows = parseSizes(document.getElementById("product-sizes").value);
    const fallbackFlavorLabels = flavorLabels.length
      ? flavorLabels
      : Array.from(new Set(existingVariantRows.map((item) => String(item.flavor_label || "").trim()).filter(Boolean)));
    const fallbackSizeLabels = sizeLabels.length
      ? sizeLabels
      : Array.from(new Set(existingVariantRows.map((item) => String(item.size_label || "").trim()).filter(Boolean)));
    const matrixFlavors = fallbackFlavorLabels.length ? fallbackFlavorLabels : [""];
    const matrixSizes = fallbackSizeLabels.length ? fallbackSizeLabels : [""];

    const existingVariantMap = new Map(existingVariantRows.map((item) => [
      getVariantComboKey(item.flavor_label, item.size_label),
      item
    ]));
    const existingFlavorMap = new Map(existingFlavorRows.map((item) => [String(item.label || "").trim().toLowerCase(), item]));
    const existingSizeMap = new Map(existingSizeRows.map((item) => [String(item.label || "").trim().toLowerCase(), item]));
    const flavorImageMap = new Map(existingFlavorRows.map((item) => [String(item.label || "").trim().toLowerCase(), item.image_url || ""]));
    const sizeImageMap = new Map(existingSizeRows.map((item) => [String(item.label || "").trim().toLowerCase(), item.image_url || ""]));

    const generatedKeys = new Set();
    let nextSortOrder = 10;
    const generatedVariantRows = [];

    matrixFlavors.forEach((flavorLabel) => {
      matrixSizes.forEach((sizeLabel) => {
        const key = getVariantComboKey(flavorLabel, sizeLabel);
        const existing = existingVariantMap.get(key);
        generatedKeys.add(key);

        const flavorImage = flavorImageMap.get(String(flavorLabel || "").trim().toLowerCase()) || "";
        const sizeImage = sizeImageMap.get(String(sizeLabel || "").trim().toLowerCase()) || "";

        generatedVariantRows.push({
          id: existing?.id || "",
          flavor_label: flavorLabel,
          size_label: sizeLabel,
          price: existing?.price !== undefined && existing?.price !== "" ? existing.price : (defaults.price ?? ""),
          original_price: existing?.original_price !== undefined && existing?.original_price !== "" ? existing.original_price : (defaults.original_price ?? ""),
          stock_quantity: existing?.stock_quantity !== undefined && existing?.stock_quantity !== "" ? existing.stock_quantity : (defaults.stock_quantity ?? 0),
          sort_order: existing?.sort_order !== undefined && existing?.sort_order !== "" ? existing.sort_order : nextSortOrder,
          image_url: existing?.image_url || flavorImage || sizeImage || defaults.image_url || "",
          is_active: existing?.is_active !== undefined ? existing.is_active : true
        });

        nextSortOrder += 10;
      });
    });

    const untouchedVariantRows = existingVariantRows.filter((item) => !generatedKeys.has(getVariantComboKey(item.flavor_label, item.size_label)));
    const nextVariantRows = [...generatedVariantRows, ...untouchedVariantRows];

    const nextFlavorRows = matrixFlavors
      .filter(Boolean)
      .map((label) => {
        const existing = existingFlavorMap.get(String(label).trim().toLowerCase());
        const firstVariantImage = nextVariantRows.find((item) => String(item.flavor_label || "").trim().toLowerCase() === String(label).trim().toLowerCase())?.image_url || "";
        return {
          label,
          image_url: existing?.image_url || firstVariantImage || defaults.image_url || ""
        };
      });

    const untouchedFlavorRows = existingFlavorRows.filter((item) => !matrixFlavors.some((label) => String(label).trim().toLowerCase() === String(item.label || "").trim().toLowerCase()));
    const mergedFlavorRows = [...nextFlavorRows, ...untouchedFlavorRows];

    const nextSizeRows = matrixSizes
      .filter(Boolean)
      .map((label) => {
        const existing = existingSizeMap.get(String(label).trim().toLowerCase());
        const firstVariant = nextVariantRows.find((item) => String(item.size_label || "").trim().toLowerCase() === String(label).trim().toLowerCase());
        return {
          label,
          price: existing?.price !== undefined && existing?.price !== "" ? existing.price : (firstVariant?.price ?? defaults.price ?? ""),
          original_price: existing?.original_price !== undefined && existing?.original_price !== "" ? existing.original_price : (firstVariant?.original_price ?? defaults.original_price ?? ""),
          image_url: existing?.image_url || firstVariant?.image_url || defaults.image_url || ""
        };
      });

    const untouchedSizeRows = existingSizeRows.filter((item) => !matrixSizes.some((label) => String(label).trim().toLowerCase() === String(item.label || "").trim().toLowerCase()));
    const mergedSizeRows = [...nextSizeRows, ...untouchedSizeRows];

    document.getElementById("product-variants").value = stringifyVariantRows(nextVariantRows);
    document.getElementById("product-flavors").value = stringifyFlavorRows(mergedFlavorRows);
    document.getElementById("product-sizes").value = stringifySizeRows(mergedSizeRows);

    hydrateAdvancedRepeatersFromInputs();
    validateVariantRowsInEditor();
    persistProductDraft();
    showToast(`Đã sinh ${generatedVariantRows.length} tổ hợp biến thể.`, "success");
  }

  async function apiFetch(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, options);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.success) {
      const message = payload.message
        || (Array.isArray(payload.errors) && payload.errors.length ? payload.errors[0]?.msg : "")
        || "Không thể tải dữ liệu từ server";
      throw new Error(message);
    }

    return payload.data;
  }

  function showToast(message, type = "info") {
    let container = document.getElementById("admin-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "admin-toast-container";
      container.className = "fixed right-4 top-20 z-[90] flex w-[min(92vw,420px)] flex-col gap-3";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    const typeClass = type === "error"
      ? "border-red-400/20 bg-red-500/10 text-red-100"
      : type === "success"
        ? "border-green-400/20 bg-green-500/10 text-green-100"
        : "border-primary/20 bg-primary/10 text-gray-100";
    toast.className = `rounded-2xl border px-5 py-4 text-sm shadow-admin ${typeClass}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
      if (!container.children.length) {
        container.remove();
      }
    }, 3200);
  }

  function getStatusBadge(status, kind = "fulfillment") {
    const normalized = String(status || "").toLowerCase();

    if (kind === "payment") {
      if (normalized === "paid") {
        return '<span class="status-pill bg-green-500/15 text-green-200">PAID</span>';
      }
      if (normalized === "processing" || normalized === "underpaid") {
        return `<span class="status-pill bg-amber-500/15 text-amber-200">${escapeHtml(status)}</span>`;
      }
      if (normalized === "pending") {
        return '<span class="status-pill bg-white/10 text-gray-200">PENDING</span>';
      }
      return `<span class="status-pill bg-red-500/15 text-red-200">${escapeHtml(status)}</span>`;
    }

    if (normalized === "completed") {
      return '<span class="status-pill bg-green-500/15 text-green-200">COMPLETED</span>';
    }
    if (normalized === "shipping") {
      return '<span class="status-pill bg-sky-500/15 text-sky-200">SHIPPING</span>';
    }
    if (normalized === "cancelled") {
      return '<span class="status-pill bg-red-500/15 text-red-200">CANCELLED</span>';
    }

    return '<span class="status-pill bg-amber-500/15 text-amber-200">PENDING</span>';
  }

  function openSidebar() {
    dom.sidebar.classList.remove("-translate-x-full");
    dom.mobileOverlay.classList.remove("hidden");
  }

  function closeSidebar() {
    dom.sidebar.classList.add("-translate-x-full");
    dom.mobileOverlay.classList.add("hidden");
  }

  function setSection(sectionName) {
    state.currentSection = sectionName;
    dom.sectionButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.sectionTrigger === sectionName);
    });
    dom.sections.forEach((section) => {
      section.classList.toggle("hidden", section.dataset.adminSection !== sectionName);
    });
    dom.headerTitle.textContent = sectionTitleMap[sectionName] || "Admin Dashboard";
    closeSidebar();

    requestAnimationFrame(() => {
      Object.values(state.charts).forEach((chart) => {
        if (chart && typeof chart.resize === "function") {
          chart.resize();
        }
      });
    });
  }

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove("hidden");
      document.body.classList.add("overflow-hidden");
    }
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add("hidden");
      if (modalId === "product-modal") {
        clearProductDraft();
      }
      if (modalId === "contact-reply-modal") {
        state.currentContactMessageId = null;
        const replyTextarea = document.getElementById("contact-reply-message");
        if (replyTextarea) {
          replyTextarea.value = "";
        }
        setContactReplyFeedback("info", "");
      }
      if (!document.querySelector(".modal-shell:not(.hidden)")) {
        document.body.classList.remove("overflow-hidden");
      }
    }
  }

  function closeAllModals() {
    document.querySelectorAll(".modal-shell").forEach((modal) => modal.classList.add("hidden"));
    document.body.classList.remove("overflow-hidden");
  }

  function getContactMessageById(messageId) {
    return state.alerts?.contact_messages?.find((item) => Number(item.id) === Number(messageId)) || null;
  }

  function setContactReplyFeedback(type, message) {
    const feedback = document.getElementById("contact-reply-feedback");
    if (!feedback) return;

    if (!message) {
      feedback.className = "hidden rounded-2xl border px-4 py-3 text-sm";
      feedback.textContent = "";
      return;
    }

    const typeClass = type === "error"
      ? "border-red-400/20 bg-red-500/10 text-red-100"
      : type === "success"
        ? "border-green-400/20 bg-green-500/10 text-green-100"
        : "border-primary/20 bg-primary/10 text-gray-100";
    feedback.className = `rounded-2xl border px-4 py-3 text-sm ${typeClass}`;
    feedback.textContent = message;
  }

  function openContactReplyModal(messageId) {
    const message = getContactMessageById(messageId);
    if (!message) {
      throw new Error("Không tìm thấy lời nhắn liên hệ để phản hồi");
    }

    state.currentContactMessageId = Number(message.id);

    document.getElementById("contact-reply-summary").innerHTML = `
      <div class="space-y-5">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <p class="text-[11px] font-black uppercase tracking-[0.18em] text-primary">Người gửi</p>
            <h4 class="mt-2 text-2xl font-semibold text-on-surface">${escapeHtml(message.full_name)}</h4>
            <p class="mt-2 text-sm text-gray-400">${escapeHtml(message.email)}</p>
          </div>
          <span class="inline-flex items-center justify-center rounded-full border ${message.user_id ? "border-primary/25 bg-primary/10 text-primary" : "border-white/10 bg-white/[0.03] text-gray-300"} px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]">
            ${message.user_id ? `TK ${escapeHtml(message.user_role || "member")}` : "Guest"}
          </span>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-2xl border border-white/5 bg-surface-container-high/40 px-4 py-3">
            <p class="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Gửi lúc</p>
            <p class="mt-2 text-sm text-on-surface">${formatDateTime(message.created_at)}</p>
          </div>
          <div class="rounded-2xl border border-white/5 bg-surface-container-high/40 px-4 py-3">
            <p class="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Số điện thoại</p>
            <p class="mt-2 text-sm text-on-surface">${escapeHtml(message.phone || "Chưa cung cấp")}</p>
          </div>
        </div>
        <div class="rounded-2xl border border-white/5 bg-surface-container-high/40 px-4 py-4">
          <p class="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Chủ đề</p>
          <p class="mt-2 text-sm font-semibold text-on-surface">${escapeHtml(message.subject || "Liên hệ từ website")}</p>
        </div>
        <div class="rounded-2xl border border-white/5 bg-surface-container-high/40 px-4 py-4">
          <p class="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Nội dung khách gửi</p>
          <p class="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-300">${escapeHtml(message.message || "")}</p>
        </div>
      </div>
    `;

    document.getElementById("contact-reply-message").value = "";
    setContactReplyFeedback("info", `Email phản hồi sẽ được gửi tới ${message.email}.`);
    openModal("contact-reply-modal");
  }

  async function submitContactReply() {
    const messageId = state.currentContactMessageId;
    const textarea = document.getElementById("contact-reply-message");
    const sendButton = document.getElementById("contact-reply-send");
    const replyMessage = textarea.value.trim();

    if (!messageId) {
      throw new Error("Chưa chọn lời nhắn để phản hồi");
    }

    if (replyMessage.length < 10) {
      setContactReplyFeedback("error", "Nội dung phản hồi cần ít nhất 10 ký tự.");
      return;
    }

    sendButton.disabled = true;
    sendButton.classList.add("opacity-60", "cursor-not-allowed");
    setContactReplyFeedback("info", "Đang gửi phản hồi tới khách hàng...");

    try {
      await apiFetch(`/admin/contact-messages/${messageId}/reply`, {
        method: "POST",
        headers: buildHeaders(true),
        body: JSON.stringify({
          reply_message: replyMessage
        })
      });

      closeModal("contact-reply-modal");
      showToast("Đã gửi phản hồi tới khách hàng", "success");
      await loadAlerts();
    } finally {
      sendButton.disabled = false;
      sendButton.classList.remove("opacity-60", "cursor-not-allowed");
    }
  }

  function isProductModalOpen() {
    const modal = document.getElementById("product-modal");
    return Boolean(modal && !modal.classList.contains("hidden"));
  }

  function getProductDraftSnapshot() {
    syncAdvancedRepeatersToInputs();

    const fieldIds = [
      "product-id",
      "product-image-url",
      "product-name",
      "product-slug",
      "product-category-name",
      "product-category-slug",
      "product-price",
      "product-sale-price",
      "product-stock",
      "product-badge-label",
      "product-sort-order",
      "product-short-description",
      "product-gallery-urls",
      "product-variants",
      "product-flavors",
      "product-sizes",
      "product-variant-generator-flavors",
      "product-variant-generator-sizes",
      "product-variant-generator-price",
      "product-variant-generator-original-price",
      "product-variant-generator-stock",
      "product-variant-generator-image-url",
      "product-feature-cards",
      "product-quick-info",
      "product-highlights",
      "product-usage-guide",
      "product-notes",
      "product-purchase-panel-title",
      "product-purchase-panel-body"
    ];

    const checkboxIds = ["product-is-featured", "product-is-active"];
    const fields = {};
    const checkboxes = {};

    fieldIds.forEach((id) => {
      fields[id] = document.getElementById(id)?.value ?? "";
    });

    checkboxIds.forEach((id) => {
      checkboxes[id] = Boolean(document.getElementById(id)?.checked);
    });

    return {
      fields,
      checkboxes,
      modalTitle: document.getElementById("product-modal-title")?.textContent || "Thêm sản phẩm",
      imagePreviewSrc: document.getElementById("product-image-preview")?.src || "../assets/images/weight-room.jpg",
      slugTouched: Boolean(document.getElementById("product-slug")?.dataset.touched)
    };
  }

  function persistProductDraft() {
    if (!isProductModalOpen()) return;
    sessionStorage.setItem(PRODUCT_DRAFT_KEY, JSON.stringify(getProductDraftSnapshot()));
  }

  function clearProductDraft() {
    sessionStorage.removeItem(PRODUCT_DRAFT_KEY);
    sessionStorage.removeItem(PRODUCT_DRAFT_RESTORE_KEY);
  }

  function restoreProductDraftIfNeeded() {
    if (sessionStorage.getItem(PRODUCT_DRAFT_RESTORE_KEY) !== "1") {
      return;
    }

    const rawDraft = sessionStorage.getItem(PRODUCT_DRAFT_KEY);
    if (!rawDraft) {
      sessionStorage.removeItem(PRODUCT_DRAFT_RESTORE_KEY);
      return;
    }

    try {
      const draft = JSON.parse(rawDraft);
      resetProductForm();

      Object.entries(draft.fields || {}).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
          element.value = value ?? "";
        }
      });

      Object.entries(draft.checkboxes || {}).forEach(([id, checked]) => {
        const element = document.getElementById(id);
        if (element) {
          element.checked = Boolean(checked);
        }
      });

      document.getElementById("product-modal-title").textContent = draft.modalTitle || "Thêm sản phẩm";
      document.getElementById("product-image-preview").src = draft.imagePreviewSrc || "../assets/images/weight-room.jpg";

      if (draft.slugTouched) {
        document.getElementById("product-slug").dataset.touched = "true";
      }

      hydrateAdvancedRepeatersFromInputs();
      openModal("product-modal");
      showToast("Đã khôi phục phần sản phẩm bạn đang chỉnh dở", "info");
    } catch (_error) {
      sessionStorage.removeItem(PRODUCT_DRAFT_KEY);
    } finally {
      sessionStorage.removeItem(PRODUCT_DRAFT_RESTORE_KEY);
    }
  }

  function createOrUpdateChart(key, canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === "undefined") {
      return;
    }

    if (state.charts[key]) {
      state.charts[key].destroy();
    }

    state.charts[key] = new Chart(canvas, config);
  }

  function setHeaderProfile() {
    const fallbackAvatar = "../assets/images/customer-review.jpg";
    dom.headerName.textContent = state.user.full_name || state.user.email || "Admin";
    dom.headerRole.textContent = (state.user.role || "admin").toUpperCase();
    dom.headerAvatar.src = state.user.avatar_url || fallbackAvatar;
  }

  function denyAccess() {
    dom.app.classList.add("hidden");
    dom.accessBlock.classList.remove("hidden");
  }

  function ensureAdminAccess() {
    state.user = getStoredUser();
    state.token = getStoredToken();

    if (!state.user || !state.token || state.user.role !== "admin") {
      denyAccess();
      return false;
    }

    setHeaderProfile();
    return true;
  }

  async function loadOverview() {
    const overview = await apiFetch("/admin/overview", {
      headers: buildHeaders()
    });

    document.getElementById("stat-revenue-today").textContent = formatCurrency(overview.stats.revenue_today);
    document.getElementById("stat-revenue-month").textContent = formatCurrency(overview.stats.revenue_month);
    document.getElementById("stat-orders-month").textContent = Number(overview.stats.orders_month || 0).toLocaleString("vi-VN");
    document.getElementById("stat-growth-rate").textContent = `${overview.stats.growth_rate > 0 ? "+" : ""}${overview.stats.growth_rate}%`;
    document.getElementById("admin-new-customers-count").textContent = Number(overview.stats.new_customers_month || 0).toLocaleString("vi-VN");

    createOrUpdateChart("overviewRevenue", "overview-revenue-chart", {
      type: "line",
      data: {
        labels: overview.revenue_series.map((item) => item.label),
        datasets: [{
          label: "Doanh thu",
          data: overview.revenue_series.map((item) => item.value),
          borderColor: "#f2ca50",
          backgroundColor: "rgba(242, 202, 80, 0.14)",
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: "#f2ca50"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: "#8f8a80" }, grid: { color: "rgba(255,255,255,0.04)" } },
          y: {
            ticks: {
              color: "#8f8a80",
              callback: (value) => `${Number(value).toLocaleString("vi-VN")}đ`
            },
            grid: { color: "rgba(255,255,255,0.04)" }
          }
        }
      }
    });

    createOrUpdateChart("overviewTopProducts", "overview-top-products-chart", {
      type: "bar",
      data: {
        labels: overview.top_products.map((item) => item.product_name),
        datasets: [{
          label: "Đã bán",
          data: overview.top_products.map((item) => item.units_sold),
          backgroundColor: ["#f2ca50", "#f0bc6a", "#eba37f", "#d4af37", "#c58d4b", "#ffb693"]
        }]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: "#8f8a80" }, grid: { color: "rgba(255,255,255,0.04)" } },
          y: { ticks: { color: "#d0c5af" }, grid: { display: false } }
        }
      }
    });
  }

  async function loadOrders() {
    const search = document.getElementById("orders-search-input").value.trim();
    const status = document.getElementById("orders-status-filter").value;
    const paymentStatus = document.getElementById("orders-payment-filter").value;
    const params = new URLSearchParams();

    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (paymentStatus) params.set("payment_status", paymentStatus);

    const orders = await apiFetch(`/admin/orders?${params.toString()}`, {
      headers: buildHeaders()
    });

    state.orders = orders;
    renderOrders();
  }

  function renderOrders() {
    const tbody = document.getElementById("orders-table-body");

    if (!state.orders.length) {
      tbody.innerHTML = `
        <tr>
          <td class="px-6 py-8 text-center text-sm text-gray-500" colspan="7">Chưa có đơn hàng phù hợp với bộ lọc hiện tại.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = state.orders.map((order) => `
      <tr class="border-b border-white/5">
        <td class="px-6 py-5">
          <p class="font-semibold text-on-surface">#${order.order_code}</p>
          <p class="mt-1 text-xs text-gray-500">${escapeHtml(order.reference_code || "Chưa có mã tham chiếu")}</p>
        </td>
        <td class="px-6 py-5">
          <p class="font-semibold text-on-surface">${escapeHtml(order.buyer_name)}</p>
          <p class="mt-1 text-xs text-gray-500">${escapeHtml(order.buyer_email || order.buyer_phone || "Không có")}</p>
        </td>
        <td class="px-6 py-5">${getStatusBadge(order.fulfillment_status)}</td>
        <td class="px-6 py-5">${getStatusBadge(order.payment_status, "payment")}</td>
        <td class="px-6 py-5 font-semibold text-primary">${formatCurrency(order.total_amount)}</td>
        <td class="px-6 py-5 text-sm text-gray-400">${formatDateTime(order.created_at)}</td>
        <td class="px-6 py-5 text-right">
          <button class="rounded-full border border-primary/20 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-primary transition hover:bg-primary hover:text-on-primary" data-view-order="${order.id}" type="button">Xem chi tiết</button>
        </td>
      </tr>
    `).join("");
  }

  async function openOrderDetail(orderId) {
    const detail = await apiFetch(`/admin/orders/${orderId}`, {
      headers: buildHeaders()
    });
    const order = detail.order;
    state.currentOrderId = order.id;

    document.getElementById("order-detail-summary").innerHTML = `
      <div class="space-y-3 text-sm text-gray-300">
        <div>
          <p class="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">Mã đơn</p>
          <p class="mt-2 text-2xl font-light text-on-surface">#${order.order_code}</p>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <p class="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">Khách hàng</p>
            <p class="mt-2 text-on-surface">${escapeHtml(order.buyer_name)}</p>
          </div>
          <div>
            <p class="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">Số điện thoại</p>
            <p class="mt-2 text-on-surface">${escapeHtml(order.buyer_phone || "—")}</p>
          </div>
        </div>
        <div>
          <p class="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">Địa chỉ</p>
          <p class="mt-2 leading-relaxed text-on-surface">${escapeHtml(order.shipping_address || "—")}</p>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <p class="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">Thanh toán</p>
            <div class="mt-2">${getStatusBadge(order.payment_status, "payment")}</div>
          </div>
          <div>
            <p class="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">Tổng tiền</p>
            <p class="mt-2 text-xl font-semibold text-primary">${formatCurrency(order.total_amount)}</p>
          </div>
        </div>
      </div>
    `;

    document.getElementById("order-detail-status-select").value = order.fulfillment_status || "pending";
    document.getElementById("order-detail-items").innerHTML = detail.items.map((item) => `
      <article class="flex gap-4 rounded-[24px] border border-white/5 bg-surface-container p-4">
        <img alt="${escapeHtml(item.product_name)}" class="h-20 w-20 rounded-2xl object-cover" src="${escapeHtml(item.product_image_url || "../assets/images/weight-room.jpg")}" />
        <div class="min-w-0 flex-1">
          <p class="text-[10px] uppercase tracking-[0.18em] text-gray-500">${escapeHtml(item.product_slug || "product")}</p>
          <h4 class="mt-2 text-sm font-semibold text-on-surface">${escapeHtml(item.product_name)}</h4>
          <div class="mt-3 flex items-center justify-between gap-4 text-sm">
            <span class="text-gray-400">SL: ${item.quantity}</span>
            <span class="font-semibold text-primary">${formatCurrency(item.line_total)}</span>
          </div>
        </div>
      </article>
    `).join("");

    openModal("order-detail-modal");
  }

  async function saveOrderStatus() {
    if (!state.currentOrderId) return;
    const status = document.getElementById("order-detail-status-select").value;

    await apiFetch(`/admin/orders/${state.currentOrderId}/status`, {
      method: "PATCH",
      headers: buildHeaders(true),
      body: JSON.stringify({ fulfillment_status: status })
    });

    showToast("Đã cập nhật trạng thái đơn hàng", "success");
    await Promise.all([loadOrders(), loadAlerts(), loadAnalytics(), loadOverview()]);
    await openOrderDetail(state.currentOrderId);
  }

  async function loadProducts() {
    const search = document.getElementById("products-search-input").value.trim();
    const active = document.getElementById("products-active-filter").value;
    const params = new URLSearchParams();

    if (search) params.set("search", search);
    if (active) params.set("active", active);

    const products = await apiFetch(`/admin/products?${params.toString()}`, {
      headers: buildHeaders()
    });

    state.products = products;
    renderProducts();
  }

  function renderProducts() {
    const tbody = document.getElementById("products-table-body");

    if (!state.products.length) {
      tbody.innerHTML = `
        <tr>
          <td class="px-6 py-8 text-center text-sm text-gray-500" colspan="6">Chưa có sản phẩm phù hợp.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = state.products.map((product) => `
      <tr class="border-b border-white/5">
        <td class="px-6 py-5">
          <div class="flex items-center gap-4">
            <img alt="${escapeHtml(product.name)}" class="h-14 w-14 rounded-2xl object-cover" src="${escapeHtml(product.image_url || "../assets/images/weight-room.jpg")}" />
            <div>
              <p class="font-semibold text-on-surface">${escapeHtml(product.name)}</p>
              <p class="mt-1 text-xs text-gray-500">${escapeHtml(product.slug)}</p>
            </div>
          </div>
        </td>
        <td class="px-6 py-5 text-sm text-gray-300">${escapeHtml(product.category_name)}</td>
        <td class="px-6 py-5">
          <p class="font-semibold text-primary">${formatCurrency(product.sale_price ?? product.price)}</p>
          ${product.sale_price ? `<p class="mt-1 text-xs text-gray-500 line-through">${formatCurrency(product.price)}</p>` : ""}
        </td>
        <td class="px-6 py-5 text-sm text-gray-300">${Number(product.stock_quantity).toLocaleString("vi-VN")}</td>
        <td class="px-6 py-5">
          ${product.is_active
            ? '<span class="status-pill bg-green-500/15 text-green-200">ACTIVE</span>'
            : '<span class="status-pill bg-white/10 text-gray-300">INACTIVE</span>'}
        </td>
        <td class="px-6 py-5 text-right">
          <div class="inline-flex gap-2">
            <button class="rounded-full border border-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-gray-200 transition hover:border-primary/30 hover:text-primary" data-edit-product="${product.id}" type="button">Sửa</button>
            <button class="rounded-full border border-red-400/20 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-red-200 transition hover:bg-red-500/10" data-delete-product="${product.id}" type="button">Xóa</button>
          </div>
        </td>
      </tr>
    `).join("");
  }

  function resetProductForm() {
    document.getElementById("product-form").reset();
    document.getElementById("product-id").value = "";
    document.getElementById("product-image-url").value = "";
    document.getElementById("product-image-file").value = "";
    document.getElementById("product-gallery-files").value = "";
    document.getElementById("product-image-preview").src = "../assets/images/weight-room.jpg";
    document.getElementById("product-modal-title").textContent = "Thêm sản phẩm";
    document.getElementById("product-is-active").checked = true;
    document.getElementById("product-gallery-urls").value = "";
    document.getElementById("product-variants").value = "";
    document.getElementById("product-flavors").value = "";
    document.getElementById("product-sizes").value = "";
    document.getElementById("product-variant-generator-flavors").value = "";
    document.getElementById("product-variant-generator-sizes").value = "";
    document.getElementById("product-variant-generator-price").value = "";
    document.getElementById("product-variant-generator-original-price").value = "";
    document.getElementById("product-variant-generator-stock").value = "";
    document.getElementById("product-variant-generator-image-url").value = "";
    document.getElementById("product-feature-cards").value = "";
    document.getElementById("product-quick-info").value = "";
    document.getElementById("product-highlights").value = "";
    document.getElementById("product-usage-guide").value = "";
    document.getElementById("product-notes").value = "";
    document.getElementById("product-purchase-panel-title").value = "";
    document.getElementById("product-purchase-panel-body").value = "";
    hydrateAdvancedRepeatersFromInputs();
    delete document.getElementById("product-slug").dataset.touched;
  }

  function openCreateProductModal() {
    resetProductForm();
    openModal("product-modal");
    persistProductDraft();
  }

  function openEditProductModal(productId) {
    const product = state.products.find((item) => item.id === Number(productId));
    if (!product) return;

    resetProductForm();
    document.getElementById("product-modal-title").textContent = "Cập nhật sản phẩm";
    document.getElementById("product-id").value = product.id;
    document.getElementById("product-image-url").value = product.image_url || "";
    document.getElementById("product-image-preview").src = product.image_url || "../assets/images/weight-room.jpg";
    document.getElementById("product-name").value = product.name || "";
    document.getElementById("product-slug").value = product.slug || "";
    document.getElementById("product-slug").dataset.touched = "true";
    document.getElementById("product-category-name").value = product.category_name || "";
    document.getElementById("product-category-slug").value = product.category_slug || "";
    document.getElementById("product-price").value = product.price || 0;
    document.getElementById("product-sale-price").value = product.sale_price ?? "";
    document.getElementById("product-stock").value = product.stock_quantity || 0;
    document.getElementById("product-badge-label").value = product.badge_label || "";
    document.getElementById("product-sort-order").value = product.sort_order || 0;
    document.getElementById("product-short-description").value = product.short_description || "";
    document.getElementById("product-gallery-urls").value = (product.gallery_images || []).join("\n");
    document.getElementById("product-variants").value = stringifyVariantRows(product.variants || []);
    document.getElementById("product-flavors").value = stringifyFlavorRows(product.flavors);
    document.getElementById("product-sizes").value = stringifySizeRows(product.sizes);
    fillVariantGeneratorFromVariants(product.variants || [], product);
    document.getElementById("product-feature-cards").value = stringifyTitleBodyRows(product.feature_cards);
    document.getElementById("product-quick-info").value = stringifyLabelValueRows(product.quick_info);
    document.getElementById("product-highlights").value = stringifyTitleBodyRows(product.highlights);
    document.getElementById("product-usage-guide").value = stringifyTitleBodyRows(product.usage_guide);
    document.getElementById("product-notes").value = stringifyNotes(product.notes);
    document.getElementById("product-purchase-panel-title").value = product.purchase_panel_title || "";
    document.getElementById("product-purchase-panel-body").value = product.purchase_panel_body || "";
    document.getElementById("product-is-featured").checked = Boolean(product.is_featured);
    document.getElementById("product-is-active").checked = Boolean(product.is_active);
    hydrateAdvancedRepeatersFromInputs();
    openModal("product-modal");
    persistProductDraft();
  }

  async function uploadProductImageIfNeeded() {
    const fileInput = document.getElementById("product-image-file");
    const file = fileInput.files?.[0];

    if (!file) {
      return document.getElementById("product-image-url").value || null;
    }

    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`${API_BASE_URL}/admin/products/upload-image`, {
      method: "POST",
      headers: buildHeaders(),
      body: formData
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.success) {
      throw new Error(payload.message || "Không thể tải ảnh sản phẩm lên");
    }

    return payload.data.image_url;
  }

  async function uploadSingleProductAsset(file) {
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`${API_BASE_URL}/admin/products/upload-image`, {
      method: "POST",
      headers: buildHeaders(),
      body: formData
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.success) {
      throw new Error(payload.message || "Không thể tải ảnh lên");
    }

    return payload.data.image_url;
  }

  async function uploadProductGalleryImagesIfNeeded() {
    const files = Array.from(document.getElementById("product-gallery-files").files || []);

    if (!files.length) {
      return [];
    }

    const formData = new FormData();
    files.forEach((file) => formData.append("images", file));

    const response = await fetch(`${API_BASE_URL}/admin/products/upload-gallery`, {
      method: "POST",
      headers: buildHeaders(),
      body: formData
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.success) {
      throw new Error(payload.message || "Không thể tải gallery ảnh lên");
    }

    return payload.data.image_urls || [];
  }

  async function saveProduct(event) {
    event.preventDefault();
    syncAdvancedRepeatersToInputs();

    const variantValidation = validateVariantRowsInEditor();
    if (!variantValidation.valid) {
      throw new Error(variantValidation.message);
    }

    const productId = document.getElementById("product-id").value;
    const name = document.getElementById("product-name").value.trim();
    const slugInput = document.getElementById("product-slug");
    const slug = slugInput.value.trim() || slugify(name);
    slugInput.value = slug;

    const rawVariants = parseVariants(document.getElementById("product-variants").value);
    const variants = rawVariants.map((item, index) => ({
      ...item,
      id: item.id ? Number(item.id) : null,
      price: item.price === "" || item.price === null || item.price === undefined ? null : Number(item.price),
      original_price: item.original_price === "" || item.original_price === null || item.original_price === undefined ? null : Number(item.original_price),
      stock_quantity: item.stock_quantity === "" || item.stock_quantity === null || item.stock_quantity === undefined ? 0 : Number(item.stock_quantity),
      sort_order: item.sort_order === "" || item.sort_order === null || item.sort_order === undefined ? index : Number(item.sort_order),
      is_active: item.is_active !== false
    })).filter((item) => Number(item.price) > 0 && (String(item.flavor_label || "").trim() || String(item.size_label || "").trim() || rawVariants.length === 1));

    if (!variants.length) {
      throw new Error("HÃ£y táº¡o Ã­t nháº¥t má»™t biáº¿n thá»ƒ bÃ¡n hÃ ng trÆ°á»›c khi lÆ°u sáº£n pháº©m.");
    }

    const payload = {
      name,
      slug,
      category_name: document.getElementById("product-category-name").value.trim(),
      category_slug: document.getElementById("product-category-slug").value.trim(),
      price: Number(document.getElementById("product-price").value || 0),
      sale_price: document.getElementById("product-sale-price").value ? Number(document.getElementById("product-sale-price").value) : null,
      stock_quantity: Number(document.getElementById("product-stock").value || 0),
      image_url: await uploadProductImageIfNeeded(),
      badge_label: document.getElementById("product-badge-label").value.trim() || null,
      short_description: document.getElementById("product-short-description").value.trim() || null,
      gallery_images: [],
      variants,
      flavors: parseFlavors(document.getElementById("product-flavors").value),
      sizes: parseSizes(document.getElementById("product-sizes").value),
      feature_cards: parseTitleBodyRows(document.getElementById("product-feature-cards").value),
      quick_info: parseLabelValueRows(document.getElementById("product-quick-info").value),
      highlights: parseTitleBodyRows(document.getElementById("product-highlights").value),
      usage_guide: parseTitleBodyRows(document.getElementById("product-usage-guide").value),
      notes: parseNotes(document.getElementById("product-notes").value),
      purchase_panel_title: document.getElementById("product-purchase-panel-title").value.trim() || null,
      purchase_panel_body: document.getElementById("product-purchase-panel-body").value.trim() || null,
      is_featured: document.getElementById("product-is-featured").checked,
      is_active: document.getElementById("product-is-active").checked,
      sort_order: Number(document.getElementById("product-sort-order").value || 0)
    };

    if (variants.length) {
      const primaryVariant = variants
        .filter((item) => item.is_active !== false)
        .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))[0] || variants[0];
      const totalVariantStock = variants
        .filter((item) => item.is_active !== false)
        .reduce((sum, item) => sum + Math.max(0, Number(item.stock_quantity || 0)), 0);

      payload.price = Number(primaryVariant.original_price ?? primaryVariant.price ?? payload.price ?? 0);
      payload.sale_price = primaryVariant.original_price && Number(primaryVariant.original_price) > Number(primaryVariant.price)
        ? Number(primaryVariant.price)
        : null;
      payload.stock_quantity = totalVariantStock;
      if (!payload.image_url && primaryVariant.image_url) {
        payload.image_url = primaryVariant.image_url;
      }
    }
    const uploadedGalleryUrls = await uploadProductGalleryImagesIfNeeded();
    payload.gallery_images = normalizeUrlList([
      ...parseGalleryUrls(document.getElementById("product-gallery-urls").value),
      ...uploadedGalleryUrls
    ]);

    const endpoint = productId ? `/products/${productId}` : "/products";
    const method = productId ? "PUT" : "POST";

    await apiFetch(endpoint, {
      method,
      headers: buildHeaders(true),
      body: JSON.stringify(payload)
    });

    clearProductDraft();
    closeModal("product-modal");
    showToast(productId ? "Đã cập nhật sản phẩm" : "Đã tạo sản phẩm mới", "success");
    await Promise.all([loadProducts(), loadAlerts()]);
  }

  async function deleteProduct(productId) {
    const product = state.products.find((item) => item.id === Number(productId));
    if (!product) return;
    if (!window.confirm(`Xóa sản phẩm "${product.name}"?`)) return;

    await apiFetch(`/products/${productId}`, {
      method: "DELETE",
      headers: buildHeaders()
    });

    showToast("Đã xóa sản phẩm", "success");
    await Promise.all([loadProducts(), loadAlerts()]);
  }

  async function loadCustomers() {
    const search = document.getElementById("customers-search-input").value.trim();
    const params = new URLSearchParams();
    if (search) params.set("search", search);

    const customers = await apiFetch(`/admin/customers?${params.toString()}`, {
      headers: buildHeaders()
    });

    state.customers = customers;
    renderCustomers();
  }

  function renderCustomers() {
    const tbody = document.getElementById("customers-table-body");

    if (!state.customers.length) {
      tbody.innerHTML = `
        <tr>
          <td class="px-6 py-8 text-center text-sm text-gray-500" colspan="6">Chưa có khách hàng phù hợp.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = state.customers.map((customer) => `
      <tr class="border-b border-white/5">
        <td class="px-6 py-5">
          <div class="flex items-center gap-4">
            <img alt="${escapeHtml(customer.full_name)}" class="h-12 w-12 rounded-full object-cover" src="${escapeHtml(customer.avatar_url || "../assets/images/customer-review.jpg")}" />
            <div>
              <p class="font-semibold text-on-surface">${escapeHtml(customer.full_name)}</p>
              <p class="mt-1 text-xs text-gray-500">${escapeHtml(customer.auth_provider || "local")}</p>
            </div>
          </div>
        </td>
        <td class="px-6 py-5 text-sm text-gray-300">
          <p>${escapeHtml(customer.email || "—")}</p>
          <p class="mt-1 text-xs text-gray-500">${escapeHtml(customer.phone || "—")}</p>
        </td>
        <td class="px-6 py-5">
          <span class="status-pill bg-white/10 text-gray-200">${escapeHtml(String(customer.role || "member").toUpperCase())}</span>
        </td>
        <td class="px-6 py-5 text-sm text-gray-300">${Number(customer.orders_count || 0).toLocaleString("vi-VN")}</td>
        <td class="px-6 py-5 font-semibold text-primary">${formatCurrency(customer.total_spent)}</td>
        <td class="px-6 py-5 text-right">
          <button class="rounded-full border border-primary/20 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-primary transition hover:bg-primary hover:text-on-primary" data-view-customer="${customer.id}" type="button">Chi tiết</button>
        </td>
      </tr>
    `).join("");
  }

  async function openCustomerDetail(customerId) {
    const detail = await apiFetch(`/admin/customers/${customerId}`, {
      headers: buildHeaders()
    });
    state.currentCustomerId = detail.customer.id;

    document.getElementById("customer-detail-summary").innerHTML = `
      <div class="flex items-center gap-4">
        <img alt="${escapeHtml(detail.customer.full_name)}" class="h-20 w-20 rounded-full object-cover" src="${escapeHtml(detail.customer.avatar_url || "../assets/images/customer-review.jpg")}" />
        <div>
          <p class="text-2xl font-light text-on-surface">${escapeHtml(detail.customer.full_name)}</p>
          <p class="mt-2 text-sm text-gray-400">${escapeHtml(detail.customer.email || "—")}</p>
          <p class="mt-1 text-sm text-gray-400">${escapeHtml(detail.customer.phone || "—")}</p>
        </div>
      </div>
      <div class="mt-6 grid gap-4 sm:grid-cols-2">
        <div class="rounded-2xl border border-white/5 bg-surface-container-high px-4 py-4">
          <p class="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Số đơn</p>
          <p class="mt-2 text-xl font-semibold text-on-surface">${Number(detail.customer.orders_count || 0).toLocaleString("vi-VN")}</p>
        </div>
        <div class="rounded-2xl border border-white/5 bg-surface-container-high px-4 py-4">
          <p class="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Tổng chi</p>
          <p class="mt-2 text-xl font-semibold text-primary">${formatCurrency(detail.customer.total_spent)}</p>
        </div>
      </div>
    `;

    document.getElementById("customer-detail-orders").innerHTML = detail.orders.length
      ? detail.orders.map((order) => `
        <article class="rounded-[24px] border border-white/5 bg-surface-container p-4">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="font-semibold text-on-surface">#${order.order_code}</p>
              <p class="mt-1 text-xs text-gray-500">${formatDateTime(order.created_at)}</p>
            </div>
            <div class="text-right">
              ${getStatusBadge(order.fulfillment_status)}
              <p class="mt-2 font-semibold text-primary">${formatCurrency(order.total_amount)}</p>
            </div>
          </div>
        </article>
      `).join("")
      : `<div class="rounded-[24px] border border-white/5 bg-surface-container p-5 text-sm text-gray-500">Khách hàng này chưa có đơn hàng nào.</div>`;

    openModal("customer-modal");
  }

  async function loadAnalytics() {
    const analytics = await apiFetch("/admin/analytics", {
      headers: buildHeaders()
    });

    createOrUpdateChart("analyticsRevenue", "analytics-revenue-chart", {
      type: "line",
      data: {
        labels: analytics.revenue_by_month.map((item) => item.label),
        datasets: [{
          label: "Doanh thu tháng",
          data: analytics.revenue_by_month.map((item) => item.value),
          borderColor: "#f2ca50",
          backgroundColor: "rgba(242, 202, 80, 0.12)",
          fill: true,
          tension: 0.35,
          pointRadius: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: "#8f8a80" }, grid: { color: "rgba(255,255,255,0.04)" } },
          y: { ticks: { color: "#8f8a80" }, grid: { color: "rgba(255,255,255,0.04)" } }
        }
      }
    });

    createOrUpdateChart("analyticsStatus", "analytics-status-chart", {
      type: "doughnut",
      data: {
        labels: analytics.order_status_breakdown.map((item) => item.status),
        datasets: [{
          data: analytics.order_status_breakdown.map((item) => item.total),
          backgroundColor: ["#f2ca50", "#38bdf8", "#86efac", "#f87171"]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: "#d0c5af" } } }
      }
    });

    createOrUpdateChart("analyticsTopProducts", "analytics-top-products-chart", {
      type: "bar",
      data: {
        labels: analytics.top_products.map((item) => item.product_name),
        datasets: [{
          label: "Đã bán",
          data: analytics.top_products.map((item) => item.units_sold),
          backgroundColor: "#ffb693"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: "#d0c5af" }, grid: { display: false } },
          y: { ticks: { color: "#8f8a80" }, grid: { color: "rgba(255,255,255,0.04)" } }
        }
      }
    });
  }

  async function loadAlerts() {
    const alerts = await apiFetch("/admin/alerts", {
      headers: buildHeaders()
    });
    state.alerts = alerts;

    document.getElementById("alerts-new-orders").innerHTML = alerts.new_orders.length
      ? alerts.new_orders.map((order) => `
        <article class="rounded-[24px] border border-white/5 bg-surface-container p-5">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="font-semibold text-on-surface">#${order.order_code}</p>
              <p class="mt-1 text-sm text-gray-400">${escapeHtml(order.buyer_name)}</p>
              <p class="mt-3 text-xs text-gray-500">${formatDateTime(order.created_at)}</p>
            </div>
            <div class="text-right">
              ${getStatusBadge(order.fulfillment_status)}
              <p class="mt-3 font-semibold text-primary">${formatCurrency(order.total_amount)}</p>
            </div>
          </div>
        </article>
      `).join("")
      : `<div class="rounded-[24px] border border-white/5 bg-surface-container p-5 text-sm text-gray-500">Không có đơn hàng mới cần xử lý.</div>`;

    document.getElementById("alerts-low-stock").innerHTML = alerts.low_stock_products.length
      ? alerts.low_stock_products.map((product) => `
        <article class="flex items-center gap-4 rounded-[24px] border border-white/5 bg-surface-container p-4">
          <img alt="${escapeHtml(product.name)}" class="h-16 w-16 rounded-2xl object-cover" src="${escapeHtml(product.image_url || "../assets/images/weight-room.jpg")}" />
          <div class="flex-1">
            <p class="font-semibold text-on-surface">${escapeHtml(product.name)}</p>
            <p class="mt-1 text-xs text-gray-500">${escapeHtml(product.slug)}</p>
          </div>
          <div class="text-right">
            <p class="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Còn lại</p>
            <p class="mt-2 text-2xl font-light text-error">${Number(product.stock_quantity).toLocaleString("vi-VN")}</p>
          </div>
        </article>
      `).join("")
      : `<div class="rounded-[24px] border border-white/5 bg-surface-container p-5 text-sm text-gray-500">Hiện chưa có sản phẩm nào chạm ngưỡng cảnh báo tồn kho.</div>`;

    document.getElementById("alerts-contact-messages").innerHTML = alerts.contact_messages.length
      ? alerts.contact_messages.map((message) => `
        <article class="rounded-[24px] border border-white/5 bg-surface-container p-5">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="font-semibold text-on-surface">${escapeHtml(message.full_name)}</p>
              <p class="mt-1 truncate text-xs text-gray-500">${escapeHtml(message.email)}</p>
            </div>
            <div class="text-right">
              <span class="inline-flex items-center justify-center rounded-full border ${message.user_id ? "border-primary/25 bg-primary/10 text-primary" : "border-white/10 bg-white/[0.03] text-gray-300"} px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]">
                ${message.user_id ? `TK ${escapeHtml(message.user_role || "member")}` : "Guest"}
              </span>
              <p class="mt-3 text-xs text-gray-500">${formatDateTime(message.created_at)}</p>
            </div>
          </div>
          ${message.subject ? `<p class="mt-4 text-[11px] font-black uppercase tracking-[0.16em] text-primary">${escapeHtml(message.subject)}</p>` : ""}
          <p class="mt-3 text-sm leading-7 text-gray-300">${escapeHtml(String(message.message || "").slice(0, 220))}${String(message.message || "").length > 220 ? "..." : ""}</p>
          <div class="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
            ${message.phone ? `<span>${escapeHtml(message.phone)}</span>` : ""}
            ${message.user_id ? `<span>User #${Number(message.user_id).toLocaleString("vi-VN")}</span>` : ""}
          </div>
          <div class="mt-5 flex items-center justify-between gap-4">
            <p class="text-xs text-gray-500">Phản hồi sẽ được gửi tới ${escapeHtml(message.email)}.</p>
            <button class="rounded-full border border-primary/20 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-primary transition hover:bg-primary hover:text-on-primary" data-reply-contact="${message.id}" type="button">Phản hồi</button>
          </div>
        </article>
      `).join("")
      : `<div class="rounded-[24px] border border-white/5 bg-surface-container p-5 text-sm text-gray-500">Hiện chưa có lời nhắn liên hệ mới.</div>`;

    const totalAlerts = alerts.new_orders.length + alerts.low_stock_products.length + alerts.contact_messages.length;
    document.getElementById("admin-pending-orders-count").textContent = Number(alerts.new_orders.length || 0).toLocaleString("vi-VN");
    document.getElementById("admin-low-stock-count").textContent = Number(alerts.low_stock_products.length || 0).toLocaleString("vi-VN");
    dom.alertCount.textContent = totalAlerts;
    dom.alertCount.classList.toggle("hidden", totalAlerts === 0);
  }

  async function loadSettings() {
    const data = await apiFetch("/admin/settings", {
      headers: buildHeaders()
    });

    state.settings = data.settings;
    if (data.settings) {
      document.getElementById("settings-shop-name").value = data.settings.shop_name || "";
      document.getElementById("settings-contact-email").value = data.settings.contact_email || "";
      document.getElementById("settings-contact-phone").value = data.settings.contact_phone || "";
      document.getElementById("settings-address").value = data.settings.address || "";
      document.getElementById("settings-hero-title").value = data.settings.hero_title || "";
      document.getElementById("settings-hero-subtitle").value = data.settings.hero_subtitle || "";
      document.getElementById("settings-low-stock-threshold").value = Number(data.settings.low_stock_threshold || 5);
      dom.heroTitle.textContent = data.settings.hero_title || "Bảng điều khiển quản trị";
      dom.heroSubtitle.textContent = data.settings.hero_subtitle || "Theo dõi vận hành, đơn hàng và tăng trưởng toàn hệ thống BigGym.";
    }

    document.getElementById("settings-admin-accounts-body").innerHTML = data.admin_accounts.map((account) => `
      <tr class="border-b border-white/5">
        <td class="px-4 py-5">
          <div class="flex items-center gap-3">
            <img alt="${escapeHtml(account.full_name)}" class="h-10 w-10 rounded-full object-cover" src="${escapeHtml(account.avatar_url || "../assets/images/customer-review.jpg")}" />
            <div>
              <p class="font-semibold text-on-surface">${escapeHtml(account.full_name)}</p>
              <p class="mt-1 text-xs text-gray-500">${escapeHtml(account.email)}</p>
            </div>
          </div>
        </td>
        <td class="px-4 py-5">
          <select class="rounded-full border border-white/10 bg-surface-container px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-on-surface" data-role-select="${account.id}">
            <option value="admin" ${account.role === "admin" ? "selected" : ""}>Admin</option>
            <option value="coach" ${account.role === "coach" ? "selected" : ""}>Coach</option>
            <option value="member" ${account.role === "member" ? "selected" : ""}>Member</option>
          </select>
        </td>
        <td class="px-4 py-5 text-sm text-gray-400">${formatDateTime(account.created_at)}</td>
        <td class="px-4 py-5 text-right">
          <button class="rounded-full border border-primary/20 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-primary transition hover:bg-primary hover:text-on-primary" data-save-role="${account.id}" type="button">Lưu</button>
        </td>
      </tr>
    `).join("");
  }

  async function saveSettings(event) {
    event.preventDefault();

    await apiFetch("/admin/settings", {
      method: "PUT",
      headers: buildHeaders(true),
      body: JSON.stringify({
        shop_name: document.getElementById("settings-shop-name").value.trim(),
        contact_email: document.getElementById("settings-contact-email").value.trim() || null,
        contact_phone: document.getElementById("settings-contact-phone").value.trim() || null,
        address: document.getElementById("settings-address").value.trim() || null,
        hero_title: document.getElementById("settings-hero-title").value.trim() || null,
        hero_subtitle: document.getElementById("settings-hero-subtitle").value.trim() || null,
        low_stock_threshold: Number(document.getElementById("settings-low-stock-threshold").value || 5)
      })
    });

    showToast("Đã lưu cài đặt shop", "success");
    await Promise.all([loadSettings(), loadAlerts()]);
  }

  async function saveUserRole(userId) {
    const select = document.querySelector(`[data-role-select="${userId}"]`);
    if (!select) return;

    const result = await apiFetch(`/admin/users/${userId}/role`, {
      method: "PATCH",
      headers: buildHeaders(true),
      body: JSON.stringify({ role: select.value })
    });

    showToast("Đã cập nhật vai trò tài khoản", "success");

    if (Number(userId) === Number(state.user.id)) {
      state.user.role = result.user.role;
      localStorage.setItem("biggym_user", JSON.stringify(state.user));
      if (result.user.role !== "admin") {
        showToast("Tài khoản hiện tại không còn quyền admin. Đang chuyển về trang chủ.", "info");
        setTimeout(() => {
          localStorage.removeItem("biggym_token");
          localStorage.removeItem("biggym_user");
          window.location.href = "../index.html";
        }, 1200);
        return;
      }
    }

    await loadSettings();
  }

  function wireEventDelegation() {
    document.body.addEventListener("click", async (event) => {
      const orderButton = event.target.closest("[data-view-order]");
      const editProductButton = event.target.closest("[data-edit-product]");
      const deleteProductButton = event.target.closest("[data-delete-product]");
      const customerButton = event.target.closest("[data-view-customer]");
      const replyContactButton = event.target.closest("[data-reply-contact]");
      const saveRoleButton = event.target.closest("[data-save-role]");
      const closeButton = event.target.closest("[data-close-modal]");
      const repeaterAddButton = event.target.closest("[data-repeater-add]");
      const repeaterRemoveButton = event.target.closest("[data-repeater-remove]");
      const repeaterUploadButton = event.target.closest("[data-repeater-upload]");

      try {
        if (repeaterUploadButton) {
          const row = repeaterUploadButton.closest("[data-repeater-row]");
          const fileInput = row?.querySelector('[data-advanced-file="image"]');
          const imageInput = row?.querySelector('[data-advanced-field="image_url"]');
          const type = row?.dataset.repeaterRow;
          const file = fileInput?.files?.[0];

          if (!row || !imageInput || !file) {
            throw new Error("Hãy chọn ảnh trước khi tải lên");
          }

          repeaterUploadButton.disabled = true;
          const uploadedImageUrl = await uploadSingleProductAsset(file);
          imageInput.value = uploadedImageUrl;
          fileInput.value = "";
          renderAdvancedRowMediaPreview(row);
          syncAdvancedRepeatersToInputs();
          persistProductDraft();
          if (type === "gallery") {
            refreshAdvancedGalleryPreview();
          }
          showToast("Đã tải ảnh lên. Bấm Lưu sản phẩm để ghi thay đổi.", "success");
          return;
        }

        if (repeaterAddButton) {
          appendAdvancedRepeaterRow(repeaterAddButton.dataset.repeaterAdd);
          refreshAdvancedRowMediaPreviews();
          syncAdvancedRepeatersToInputs();
          if (repeaterAddButton.dataset.repeaterAdd === "variants") {
            clearVariantValidationState();
          }
          persistProductDraft();
          if (repeaterAddButton.dataset.repeaterAdd === "gallery") {
            refreshAdvancedGalleryPreview();
          }
          return;
        }

        if (repeaterRemoveButton) {
          const row = repeaterRemoveButton.closest("[data-repeater-row]");
          if (!row) return;

          const type = row.dataset.repeaterRow;
          const container = row.parentElement;
          row.remove();

          if (container && !container.querySelector(`[data-repeater-row="${type}"]`)) {
            appendAdvancedRepeaterRow(type);
          }

          syncAdvancedRepeatersToInputs();
          refreshAdvancedRowMediaPreviews();
          if (type === "variants") {
            validateVariantRowsInEditor();
          }
          persistProductDraft();
          if (type === "gallery") {
            refreshAdvancedGalleryPreview();
          }
          return;
        }

        if (orderButton) {
          await openOrderDetail(orderButton.dataset.viewOrder);
          return;
        }

        if (editProductButton) {
          openEditProductModal(editProductButton.dataset.editProduct);
          return;
        }

        if (deleteProductButton) {
          await deleteProduct(deleteProductButton.dataset.deleteProduct);
          return;
        }

        if (customerButton) {
          await openCustomerDetail(customerButton.dataset.viewCustomer);
          return;
        }

        if (replyContactButton) {
          openContactReplyModal(replyContactButton.dataset.replyContact);
          return;
        }

        if (saveRoleButton) {
          await saveUserRole(saveRoleButton.dataset.saveRole);
          return;
        }

        if (closeButton) {
          closeModal(closeButton.dataset.closeModal);
        }
      } catch (error) {
        showToast(error.message || "Thao tác thất bại", "error");
      } finally {
        if (repeaterUploadButton) {
          repeaterUploadButton.disabled = false;
        }
      }
    });

    document.querySelectorAll(".modal-shell").forEach((modal) => {
      modal.addEventListener("click", (event) => {
        if (event.target === modal) {
          closeModal(modal.id);
        }
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeAllModals();
      }
    });
  }

  function wireControls() {
    setHiddenAdvancedFieldsVisibility();
    hydrateAdvancedRepeatersFromInputs();

    dom.sidebarToggle.addEventListener("click", openSidebar);
    dom.mobileOverlay.addEventListener("click", closeSidebar);
    dom.openAlertsButton.addEventListener("click", () => setSection("alerts"));
    dom.logoutButton.addEventListener("click", () => {
      localStorage.removeItem("biggym_token");
      localStorage.removeItem("biggym_user");
      window.location.href = "../index.html";
    });

    dom.sectionButtons.forEach((button) => {
      button.addEventListener("click", () => setSection(button.dataset.sectionTrigger));
    });

    document.getElementById("orders-search-input").addEventListener("keydown", (event) => {
      if (event.key === "Enter") loadOrders().catch((error) => showToast(error.message, "error"));
    });
    document.getElementById("orders-status-filter").addEventListener("change", () => loadOrders().catch((error) => showToast(error.message, "error")));
    document.getElementById("orders-payment-filter").addEventListener("change", () => loadOrders().catch((error) => showToast(error.message, "error")));
    document.getElementById("products-search-input").addEventListener("keydown", (event) => {
      if (event.key === "Enter") loadProducts().catch((error) => showToast(error.message, "error"));
    });
    document.getElementById("products-active-filter").addEventListener("change", () => loadProducts().catch((error) => showToast(error.message, "error")));
    document.getElementById("customers-search-button").addEventListener("click", () => loadCustomers().catch((error) => showToast(error.message, "error")));
    document.getElementById("customers-search-input").addEventListener("keydown", (event) => {
      if (event.key === "Enter") loadCustomers().catch((error) => showToast(error.message, "error"));
    });
    document.getElementById("open-product-modal-button").addEventListener("click", openCreateProductModal);
    document.getElementById("product-name").addEventListener("input", (event) => {
      const slugInput = document.getElementById("product-slug");
      if (!slugInput.dataset.touched) {
        slugInput.value = slugify(event.target.value);
      }
    });
    document.getElementById("product-slug").addEventListener("input", () => {
      document.getElementById("product-slug").dataset.touched = "true";
    });
    document.getElementById("product-image-file").addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const previewUrl = URL.createObjectURL(file);
      document.getElementById("product-image-preview").src = previewUrl;
      persistProductDraft();
    });
    document.getElementById("product-gallery-files").addEventListener("change", (event) => {
      refreshAdvancedGalleryPreview();
      persistProductDraft();
    });
    document.getElementById("product-gallery-urls").addEventListener("input", () => {
      refreshAdvancedGalleryPreview();
      persistProductDraft();
    });
    document.getElementById("generate-variant-matrix-button").addEventListener("click", () => {
      try {
        generateVariantMatrix();
      } catch (error) {
        showToast(error.message || "Không thể sinh ma trận biến thể", "error");
      }
    });
    document.getElementById("product-form").addEventListener("input", (event) => {
      if (!event.target.closest("[data-repeater-row]")) {
        persistProductDraft();
        return;
      }

      syncAdvancedRepeatersToInputs();
      if (event.target.matches('[data-advanced-field="image_url"]')) {
        renderAdvancedRowMediaPreview(event.target.closest("[data-repeater-row]"));
      }
      if (event.target.closest('[data-repeater-row="variants"]')) {
        validateVariantRowsInEditor();
      }
      if (event.target.closest('[data-repeater-row="gallery"]')) {
        refreshAdvancedGalleryPreview();
      }
      persistProductDraft();
    });
    document.getElementById("product-form").addEventListener("submit", (event) => {
      saveProduct(event).catch((error) => showToast(error.message || "Không thể lưu sản phẩm", "error"));
    });
    document.getElementById("shop-settings-form").addEventListener("submit", (event) => {
      saveSettings(event).catch((error) => showToast(error.message || "Không thể lưu cài đặt", "error"));
    });
    document.getElementById("order-detail-status-save").addEventListener("click", () => {
      saveOrderStatus().catch((error) => showToast(error.message || "Không thể cập nhật trạng thái đơn hàng", "error"));
    });
    document.getElementById("contact-reply-send").addEventListener("click", () => {
      submitContactReply().catch((error) => {
        setContactReplyFeedback("error", error.message || "Không thể gửi phản hồi cho khách hàng.");
      });
    });
    window.addEventListener("beforeunload", () => {
      if (!isProductModalOpen()) {
        return;
      }

      persistProductDraft();
      sessionStorage.setItem(PRODUCT_DRAFT_RESTORE_KEY, "1");
    });
  }

  async function bootstrap() {
    if (!ensureAdminAccess()) {
      return;
    }

    wireControls();
    wireEventDelegation();
    setSection("overview");

    try {
      await Promise.all([
        loadOverview(),
        loadOrders(),
        loadProducts(),
        loadCustomers(),
        loadAnalytics(),
        loadAlerts(),
        loadSettings()
      ]);
      restoreProductDraftIfNeeded();
    } catch (error) {
      showToast(error.message || "Không thể tải dashboard admin", "error");
    }
  }

  bootstrap();
})();
