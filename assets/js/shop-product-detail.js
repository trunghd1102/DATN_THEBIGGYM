(() => {
  const API_BASE_URL = window.BIGGYM_API_BASE_URL || (window.location.protocol === "file:" ? "http://localhost:4000/api" : `${window.location.origin}/api`);
  const FALLBACK_IMAGE = "../../assets/images/weight-room.jpg";
  const slug = new URLSearchParams(window.location.search).get("slug");

  const refs = {
    shell: document.getElementById("detail-shell"),
    errorState: document.getElementById("detail-error-state"),
    errorMessage: document.getElementById("detail-error-message"),
    breadcrumbCategory: document.getElementById("detail-breadcrumb-category"),
    breadcrumbName: document.getElementById("detail-breadcrumb-name"),
    category: document.getElementById("detail-product-category"),
    name: document.getElementById("detail-product-name"),
    badge: document.getElementById("detail-product-badge"),
    image: document.getElementById("detail-product-image"),
    thumbnailList: document.getElementById("detail-thumbnail-list"),
    featureCards: document.getElementById("detail-feature-cards"),
    price: document.getElementById("detail-product-price"),
    originalPrice: document.getElementById("detail-product-original-price"),
    description: document.getElementById("detail-product-description"),
    stock: document.getElementById("detail-product-stock"),
    optionPanels: document.getElementById("detail-option-panels"),
    flavorShell: document.getElementById("detail-flavors-shell"),
    flavorOptions: document.getElementById("detail-flavor-options"),
    sizeShell: document.getElementById("detail-sizes-shell"),
    sizeOptions: document.getElementById("detail-size-options"),
    quickInfo: document.getElementById("detail-quick-info"),
    highlights: document.getElementById("detail-highlights"),
    usage: document.getElementById("detail-usage-guide"),
    notes: document.getElementById("detail-notes"),
    purchasePanelTitle: document.getElementById("detail-purchase-panel-title"),
    purchasePanelBody: document.getElementById("detail-purchase-panel-body"),
    related: document.getElementById("detail-related-products"),
    addToCartButton: document.getElementById("detail-add-to-cart"),
    buyNowButton: document.getElementById("detail-buy-now"),
    actionMessage: document.getElementById("detail-action-message")
  };

  let currentProduct = null;
  let selectedFlavor = "";
  let selectedSize = "";
  let selectedImageUrl = "";

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

  function resolveImageUrl(imageUrl) {
    if (!imageUrl) return FALLBACK_IMAGE;
    if (/^(https?:)?\/\//i.test(imageUrl) || imageUrl.startsWith("data:")) return imageUrl;
    if (imageUrl.startsWith("../")) return `../${imageUrl}`;
    if (imageUrl.startsWith("./")) return imageUrl.replace(/^\.\//, "../../");
    if (imageUrl.startsWith("/")) return `${window.location.origin}${imageUrl}`;
    return imageUrl;
  }

  function uniqueValues(values) {
    return Array.from(new Set((values || []).map((value) => String(value || "").trim()).filter(Boolean)));
  }

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

  function buildAuthHeaders() {
    const token = getStoredToken();
    return token
      ? {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      : {
          "Content-Type": "application/json"
        };
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.success === false) {
      throw new Error(payload.message || "Không thể tải dữ liệu sản phẩm.");
    }

    return payload;
  }

  function showError(message) {
    refs.shell?.classList.add("hidden");
    refs.errorState?.classList.remove("hidden");
    if (refs.errorMessage) {
      refs.errorMessage.textContent = message || "Không thể tải chi tiết sản phẩm.";
    }
  }

  function setMessage(message, isError = false) {
    if (!refs.actionMessage) return;
    refs.actionMessage.textContent = message;
    refs.actionMessage.classList.remove("hidden", "text-primary", "text-error");
    refs.actionMessage.classList.add(isError ? "text-error" : "text-primary");
  }

  function clearMessage() {
    if (!refs.actionMessage) return;
    refs.actionMessage.textContent = "";
    refs.actionMessage.classList.add("hidden");
  }

  function getActiveVariants() {
    return (currentProduct?.variants || []).filter((variant) => variant.is_active);
  }

  function getFlavorOptions() {
    return uniqueValues(getActiveVariants().map((variant) => variant.flavor_label));
  }

  function getScopedVariantsByFlavor() {
    const activeVariants = getActiveVariants();
    const flavorOptions = getFlavorOptions();

    if (!flavorOptions.length) {
      return activeVariants;
    }

    return activeVariants.filter((variant) => variant.flavor_label === selectedFlavor);
  }

  function getSizeOptions() {
    return uniqueValues(getScopedVariantsByFlavor().map((variant) => variant.size_label));
  }

  function syncSelectionState() {
    const activeVariants = getActiveVariants();
    const flavorOptions = getFlavorOptions();

    if (flavorOptions.length) {
      if (!flavorOptions.includes(selectedFlavor)) {
        selectedFlavor = flavorOptions[0];
      }
    } else {
      selectedFlavor = "";
    }

    const sizeOptions = getSizeOptions();
    if (sizeOptions.length) {
      if (!sizeOptions.includes(selectedSize)) {
        selectedSize = sizeOptions[0];
      }
    } else {
      selectedSize = "";
    }

    if (!activeVariants.length) {
      selectedFlavor = "";
      selectedSize = "";
    }
  }

  function getCurrentVariant() {
    const activeVariants = getActiveVariants();
    if (!activeVariants.length) {
      return null;
    }

    syncSelectionState();

    const hasFlavorOptions = getFlavorOptions().length > 0;
    const hasSizeOptions = getSizeOptions().length > 0 || uniqueValues(activeVariants.map((variant) => variant.size_label)).length > 0;

    const matched = activeVariants.filter((variant) => {
      const matchesFlavor = hasFlavorOptions ? variant.flavor_label === selectedFlavor : true;
      const matchesSize = hasSizeOptions && selectedSize ? variant.size_label === selectedSize : true;
      return matchesFlavor && matchesSize;
    });

    return matched.sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))[0] || activeVariants[0];
  }

  function getEffectivePrice() {
    const currentVariant = getCurrentVariant();
    return Number(currentVariant?.price ?? currentProduct?.sale_price ?? currentProduct?.price ?? 0);
  }

  function getEffectiveOriginalPrice() {
    const currentVariant = getCurrentVariant();

    if (currentVariant?.original_price !== null && currentVariant?.original_price !== undefined) {
      return Number(currentVariant.original_price);
    }

    if (currentProduct?.sale_price !== null && currentProduct?.sale_price !== undefined) {
      return Number(currentProduct.price);
    }

    return null;
  }

  function getCurrentStock() {
    const currentVariant = getCurrentVariant();
    return Number(currentVariant?.stock_quantity ?? currentProduct?.stock_quantity ?? 0);
  }

  function buildThumbnailItems() {
    const currentVariant = getCurrentVariant();
    const items = [];
    const seen = new Set();

    const pushItem = (imageUrl, variant = null) => {
      const resolvedUrl = resolveImageUrl(imageUrl);
      if (!resolvedUrl || seen.has(resolvedUrl)) {
        return;
      }

      seen.add(resolvedUrl);
      items.push({
        url: resolvedUrl,
        variant_id: variant ? Number(variant.id) : null
      });
    };

    pushItem(currentVariant?.image_url || currentProduct?.image_url, currentVariant);
    (currentProduct?.gallery_images || []).forEach((url) => pushItem(url));
    getActiveVariants().forEach((variant) => pushItem(variant.image_url, variant));

    return items;
  }

  function toggleSection(target, visible) {
    const section = target?.closest("[data-detail-section]") || target?.parentElement;
    if (section) {
      section.classList.toggle("hidden", !visible);
    }
  }

  function renderRows(target, rows) {
    if (!target) return;
    target.innerHTML = (rows || []).map((row) => `
      <div class="flex items-start justify-between gap-4 border-b border-white/5 pb-4 last:border-b-0 last:pb-0">
        <span class="text-[10px] uppercase tracking-[0.18em] text-gray-500">${escapeHtml(row.label)}</span>
        <span class="max-w-[65%] text-right text-sm leading-relaxed text-gray-200">${escapeHtml(row.value)}</span>
      </div>
    `).join("");
    toggleSection(target, Boolean((rows || []).length));
  }

  function renderCards(target, cards) {
    if (!target) return;
    target.innerHTML = (cards || []).map((item) => `
      <div class="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">${escapeHtml(item.title)}</p>
        <p class="mt-3 text-sm leading-relaxed text-gray-300">${escapeHtml(item.body)}</p>
      </div>
    `).join("");
    toggleSection(target, Boolean((cards || []).length));
  }

  function renderNotes(target, notes) {
    if (!target) return;
    target.innerHTML = (notes || []).map((note) => `
      <li class="rounded-2xl border border-white/5 bg-white/[0.02] px-5 py-4 text-sm leading-relaxed text-gray-300">
        ${escapeHtml(note)}
      </li>
    `).join("");
    toggleSection(target, Boolean((notes || []).length));
  }

  function renderFeatureCards(cards) {
    if (!refs.featureCards) return;
    const items = Array.isArray(cards) ? cards : [];
    refs.featureCards.innerHTML = items.map((item) => `
      <div class="rounded-2xl border border-white/5 bg-surface-container-low p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">${escapeHtml(item.title)}</p>
        <p class="mt-3 text-sm leading-relaxed text-gray-400">${escapeHtml(item.body)}</p>
      </div>
    `).join("");
    refs.featureCards.classList.toggle("hidden", !items.length);
  }

  function renderThumbnails(thumbnailItems) {
    if (!refs.thumbnailList) return;

    refs.thumbnailList.innerHTML = thumbnailItems.map((item) => {
      const active = selectedImageUrl === item.url;
      return `
        <button class="overflow-hidden rounded-2xl border ${active ? "border-primary shadow-[0_0_0_1px_rgba(242,202,80,0.25)]" : "border-white/10"} bg-surface-container-low transition-colors hover:border-primary/40" data-detail-thumb="${escapeHtml(item.url)}" data-detail-thumb-variant-id="${item.variant_id || ""}" type="button">
          <img alt="Thumbnail san pham" class="aspect-square w-full object-cover" src="${escapeHtml(item.url)}" />
        </button>
      `;
    }).join("");

    refs.thumbnailList.querySelectorAll("[data-detail-thumb]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedImageUrl = button.dataset.detailThumb;
        const variantId = Number(button.dataset.detailThumbVariantId || 0);
        if (variantId) {
          const matchedVariant = getActiveVariants().find((variant) => Number(variant.id) === variantId);
          if (matchedVariant) {
            selectedFlavor = matchedVariant.flavor_label || "";
            selectedSize = matchedVariant.size_label || "";
          }
        }
        renderOptionState();
      });
    });
  }

  function renderPriceBlock() {
    if (refs.price) {
      refs.price.textContent = formatCurrency(getEffectivePrice());
    }

    if (refs.originalPrice) {
      const originalPrice = getEffectiveOriginalPrice();
      if (originalPrice && Number(originalPrice) > Number(getEffectivePrice())) {
        refs.originalPrice.textContent = formatCurrency(originalPrice);
        refs.originalPrice.classList.remove("hidden");
      } else {
        refs.originalPrice.textContent = "";
        refs.originalPrice.classList.add("hidden");
      }
    }
  }

  function renderStockBlock() {
    const currentVariant = getCurrentVariant();
    const stockQuantity = getCurrentStock();
    const flavorLabel = currentVariant?.flavor_label ? ` • ${currentVariant.flavor_label}` : "";
    const sizeLabel = currentVariant?.size_label ? ` • ${currentVariant.size_label}` : "";

    if (!refs.stock) return;

    if (stockQuantity > 0) {
      refs.stock.textContent = `Còn ${stockQuantity} sản phẩm${flavorLabel}${sizeLabel}`;
      refs.stock.classList.remove("text-error");
      refs.stock.classList.add("text-gray-500");
    } else {
      refs.stock.textContent = `Tạm hết hàng${flavorLabel}${sizeLabel}`;
      refs.stock.classList.remove("text-gray-500");
      refs.stock.classList.add("text-error");
    }
  }

  function renderFlavorOptions() {
    if (!refs.flavorShell || !refs.flavorOptions) return;

    const flavorOptions = getFlavorOptions();
    refs.flavorShell.classList.toggle("hidden", !flavorOptions.length);

    if (!flavorOptions.length) {
      refs.flavorOptions.innerHTML = "";
      return;
    }

    refs.flavorOptions.innerHTML = flavorOptions.map((label) => {
      const variantsForFlavor = getActiveVariants().filter((variant) => variant.flavor_label === label);
      const hasStock = variantsForFlavor.some((variant) => Number(variant.stock_quantity) > 0);
      const active = label === selectedFlavor;
      return `
        <button class="rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] transition-colors ${active ? "border-primary bg-primary/10 text-primary" : "border-white/10 text-gray-300 hover:border-primary/40 hover:text-primary"} ${hasStock ? "" : "cursor-not-allowed opacity-40"}" data-detail-flavor="${escapeHtml(label)}" type="button" ${hasStock ? "" : "disabled"}>
          ${escapeHtml(label)}
        </button>
      `;
    }).join("");

    refs.flavorOptions.querySelectorAll("[data-detail-flavor]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedFlavor = button.dataset.detailFlavor || "";
        const currentVariant = getCurrentVariant();
        if (currentVariant?.image_url) {
          selectedImageUrl = resolveImageUrl(currentVariant.image_url);
        }
        renderOptionState();
      });
    });
  }

  function renderSizeOptions() {
    if (!refs.sizeShell || !refs.sizeOptions) return;

    const sizeOptions = getSizeOptions();
    refs.sizeShell.classList.toggle("hidden", !sizeOptions.length);

    if (!sizeOptions.length) {
      refs.sizeOptions.innerHTML = "";
      return;
    }

    refs.sizeOptions.innerHTML = sizeOptions.map((label) => {
      const variantsForSize = getScopedVariantsByFlavor().filter((variant) => variant.size_label === label);
      const hasStock = variantsForSize.some((variant) => Number(variant.stock_quantity) > 0);
      const active = label === selectedSize;
      return `
        <button class="rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] transition-colors ${active ? "border-primary bg-primary/10 text-primary" : "border-white/10 text-gray-300 hover:border-primary/40 hover:text-primary"} ${hasStock ? "" : "cursor-not-allowed opacity-40"}" data-detail-size="${escapeHtml(label)}" type="button" ${hasStock ? "" : "disabled"}>
          ${escapeHtml(label)}
        </button>
      `;
    }).join("");

    refs.sizeOptions.querySelectorAll("[data-detail-size]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedSize = button.dataset.detailSize || "";
        const currentVariant = getCurrentVariant();
        if (currentVariant?.image_url) {
          selectedImageUrl = resolveImageUrl(currentVariant.image_url);
        }
        renderOptionState();
      });
    });
  }

  function renderOptionState() {
    syncSelectionState();
    const currentVariant = getCurrentVariant();
    const thumbnailItems = buildThumbnailItems();
    const thumbnailImages = thumbnailItems.map((item) => item.url);

    if (!selectedImageUrl || !thumbnailImages.includes(selectedImageUrl)) {
      selectedImageUrl = resolveImageUrl(currentVariant?.image_url || thumbnailImages[0] || currentProduct?.image_url);
    }

    if (refs.image) {
      refs.image.src = selectedImageUrl || resolveImageUrl(currentProduct?.image_url);
      refs.image.alt = currentProduct?.name || "Ảnh sản phẩm";
    }

    renderFlavorOptions();
    renderSizeOptions();
    renderPriceBlock();
    renderStockBlock();
    renderThumbnails(thumbnailItems);

    const hasFlavors = getFlavorOptions().length > 0;
    const hasSizes = getSizeOptions().length > 0 || uniqueValues(getActiveVariants().map((variant) => variant.size_label)).length > 0;
    refs.optionPanels?.classList.toggle("hidden", !hasFlavors && !hasSizes);
  }

  function renderPurchasePanel(product) {
    if (refs.purchasePanelTitle) {
      refs.purchasePanelTitle.textContent = product.purchase_panel_title || "";
      refs.purchasePanelTitle.classList.toggle("hidden", !product.purchase_panel_title);
    }

    if (refs.purchasePanelBody) {
      refs.purchasePanelBody.textContent = product.purchase_panel_body || "";
      refs.purchasePanelBody.classList.toggle("hidden", !product.purchase_panel_body);
    }
  }

  function renderProduct(product) {
    currentProduct = product;
    selectedFlavor = "";
    selectedSize = "";
    selectedImageUrl = "";

    document.title = `${product.name} | THE BIG GYM`;
    if (refs.breadcrumbCategory) refs.breadcrumbCategory.textContent = product.category_name;
    if (refs.breadcrumbName) refs.breadcrumbName.textContent = product.name;
    if (refs.category) refs.category.textContent = product.category_name;
    if (refs.name) refs.name.textContent = product.name;
    if (refs.badge) refs.badge.textContent = product.badge_label || (product.is_featured ? "Nổi bật" : product.category_name);
    if (refs.description) refs.description.textContent = product.short_description || "";

    renderFeatureCards(product.feature_cards || []);
    renderRows(refs.quickInfo, product.quick_info || []);
    renderCards(refs.highlights, product.highlights || []);
    renderCards(refs.usage, product.usage_guide || []);
    renderNotes(refs.notes, product.notes || []);
    renderPurchasePanel(product);
    renderOptionState();
  }

  function getVariantOptionLabel(variant) {
    return [variant?.flavor_label, variant?.size_label].filter(Boolean).join(" • ");
  }

  function buildCartStorageItem(variant, quantity) {
    return {
      product_id: Number(currentProduct.id),
      product_variant_id: Number(variant.id),
      quantity: Number(quantity),
      product_name: currentProduct.name,
      product_slug: currentProduct.slug,
      product_image_url: variant.image_url || currentProduct.image_url,
      variant_flavor: variant.flavor_label || "",
      variant_size: variant.size_label || "",
      unit_price: Number(variant.price),
      base_price: Number(variant.original_price ?? variant.price)
    };
  }

  async function addCurrentProductToCart() {
    if (!currentProduct) {
      throw new Error("Chưa tải xong thông tin sản phẩm.");
    }

    const currentVariant = getCurrentVariant();
    if (!currentVariant) {
      throw new Error("Sản phẩm này chưa có biến thể bán hàng khả dụng.");
    }

    const availableStock = Number(currentVariant.stock_quantity || 0);
    if (availableStock <= 0) {
      throw new Error("Biến thể bạn chọn hiện đã hết hàng.");
    }

    const user = getStoredUser();
    const token = getStoredToken();

    if (user?.id && token) {
      const cartPayload = await fetchJson(`${API_BASE_URL}/cart`, { headers: buildAuthHeaders() });
      const cartItems = Array.isArray(cartPayload.data) ? cartPayload.data : [];
      const existing = cartItems.find((item) => Number(item.product_variant_id) === Number(currentVariant.id));
      const nextQuantity = existing ? Number(existing.quantity) + 1 : 1;

      if (nextQuantity > availableStock) {
        throw new Error(
          availableStock === 1
            ? "Chỉ còn 1 sản phẩm trong kho."
            : `Chỉ còn ${availableStock} sản phẩm trong kho.`
        );
      }

      const updatedPayload = await fetchJson(`${API_BASE_URL}/cart/items`, {
        method: "POST",
        headers: buildAuthHeaders(),
        body: JSON.stringify({
          product_id: Number(currentProduct.id),
          product_variant_id: Number(currentVariant.id),
          quantity: nextQuantity
        })
      });
      const updatedItems = Array.isArray(updatedPayload.data) ? updatedPayload.data : [];
      const normalized = updatedItems.map((item) => ({
        product_id: Number(item.product_id),
        product_variant_id: Number(item.product_variant_id),
        quantity: Number(item.quantity)
      }));
      localStorage.setItem(`biggym_shop_cart_user_${user.id}`, JSON.stringify(normalized));
    } else {
      const guestCart = JSON.parse(localStorage.getItem("biggym_shop_cart_guest") || "[]");
      const existing = guestCart.find((item) => Number(item.product_variant_id) === Number(currentVariant.id));
      const nextQuantity = existing ? Number(existing.quantity) + 1 : 1;

      if (nextQuantity > availableStock) {
        throw new Error(
          availableStock === 1
            ? "Chỉ còn 1 sản phẩm trong kho."
            : `Chỉ còn ${availableStock} sản phẩm trong kho.`
        );
      }

      if (existing) {
        existing.quantity = nextQuantity;
        existing.product_name = currentProduct.name;
        existing.product_slug = currentProduct.slug;
        existing.product_image_url = currentVariant.image_url || currentProduct.image_url;
        existing.variant_flavor = currentVariant.flavor_label || "";
        existing.variant_size = currentVariant.size_label || "";
        existing.unit_price = Number(currentVariant.price);
        existing.base_price = Number(currentVariant.original_price ?? currentVariant.price);
      } else {
        guestCart.push(buildCartStorageItem(currentVariant, 1));
      }

      localStorage.setItem("biggym_shop_cart_guest", JSON.stringify(guestCart));
    }

    sessionStorage.setItem("biggym_shop_cart_dirty", "1");
  }

  async function loadRelatedProducts(product) {
    if (!refs.related) return;

    try {
      const sameCategoryPayload = await fetchJson(`${API_BASE_URL}/products?category=${encodeURIComponent(product.category_slug)}&sort=featured`);
      const sameCategoryItems = (sameCategoryPayload.data || []).filter((item) => item.slug !== product.slug);
      let related = sameCategoryItems.slice(0, 3);

      if (related.length < 3) {
        const allPayload = await fetchJson(`${API_BASE_URL}/products?sort=featured`);
        const fallback = (allPayload.data || []).filter(
          (item) => item.slug !== product.slug && !related.some((entry) => entry.slug === item.slug)
        );
        related = related.concat(fallback.slice(0, 3 - related.length));
      }

      refs.related.innerHTML = related.length
        ? related.map((item) => {
            const detailHref = typeof window.getBigGymProductDetailHref === "function"
              ? window.getBigGymProductDetailHref(item.slug, ".")
              : `./product-detail.html?slug=${encodeURIComponent(item.slug)}`;
            return `
              <a class="group block space-y-4 rounded-[24px] border border-white/5 bg-surface-container-low p-4 transition-colors hover:border-primary/30" href="${detailHref}">
                <div class="overflow-hidden rounded-[20px] bg-surface-container-high">
                  <img alt="${escapeHtml(item.name)}" class="aspect-[4/4.4] w-full object-cover transition-transform duration-700 group-hover:scale-105" src="${resolveImageUrl(item.image_url)}" />
                </div>
                <div>
                  <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">${escapeHtml(item.category_name)}</p>
                  <h3 class="mt-2 text-xl font-semibold text-on-background">${escapeHtml(item.name)}</h3>
                  <p class="mt-2 text-sm text-gray-400">${escapeHtml(item.short_description || "")}</p>
                  <p class="mt-4 text-lg font-semibold text-on-background">${formatCurrency(item.sale_price ?? item.price)}</p>
                </div>
              </a>
            `;
          }).join("")
        : `
          <div class="col-span-full rounded-[24px] border border-white/5 bg-surface-container-low p-6 text-sm text-gray-400">
            Chưa có sản phẩm gợi ý phù hợp ở thời điểm hiện tại.
          </div>
        `;
    } catch (_error) {
      refs.related.innerHTML = `
        <div class="col-span-full rounded-[24px] border border-white/5 bg-surface-container-low p-6 text-sm text-gray-400">
          Không thể tải phần gợi ý mua kèm lúc này.
        </div>
      `;
    }
  }

  async function bootstrap() {
    if (!slug) {
      showError("Thiếu slug sản phẩm. Hãy quay lại cửa hàng và mở lại sản phẩm.");
      return;
    }

    try {
      const payload = await fetchJson(`${API_BASE_URL}/products/${encodeURIComponent(slug)}`);
      renderProduct(payload.data);
      await loadRelatedProducts(payload.data);
    } catch (error) {
      showError(error.message || "Không thể tải chi tiết sản phẩm.");
    }
  }

  refs.addToCartButton?.addEventListener("click", async () => {
    clearMessage();
    refs.addToCartButton.disabled = true;

    try {
      const currentVariant = getCurrentVariant();
      await addCurrentProductToCart();
      setMessage(`Đã thêm ${currentProduct?.name || "sản phẩm"}${currentVariant ? ` (${getVariantOptionLabel(currentVariant)})` : ""} vào giỏ hàng.`);
    } catch (error) {
      setMessage(error.message || "Không thể thêm sản phẩm vào giỏ.", true);
    } finally {
      refs.addToCartButton.disabled = false;
    }
  });

  refs.buyNowButton?.addEventListener("click", async () => {
    clearMessage();
    refs.buyNowButton.disabled = true;

    try {
      await addCurrentProductToCart();
      window.location.href = "../checkout.html";
    } catch (error) {
      setMessage(error.message || "Không thể chuẩn bị đơn hàng.", true);
      refs.buyNowButton.disabled = false;
    }
  });

  bootstrap();
})();
