(() => {
  const productDetailPages = {};
  const productSlugAliases = {
    "hydro-whey-pro": "ostrovit-100-whey-protein-isolate",
    "pure-strength-mono": "ostrovit-creatine-monohydrate",
    "ignition-pre-drive": "ostrovit-pump-pre-workout-formula",
    "sanctuary-multi-v": "ostrovit-100-vit-min",
    "recovery-omega-stack": "ostrovit-omega-3-extreme"
  };

  function getSlug(input) {
    if (!input) return "";
    const rawSlug = typeof input === "string" ? input.trim() : String(input.slug || "").trim();
    return productSlugAliases[rawSlug] || rawSlug;
  }

  function getProductDetailHref(input, basePath = "shop_pages") {
    const slug = getSlug(input);

    if (!slug) {
      return null;
    }

    const target = `product-detail.html?slug=${encodeURIComponent(slug)}`;
    const normalizedBasePath = basePath === "."
      ? "./"
      : basePath
        ? `${String(basePath).replace(/\/+$/, "")}/`
        : "";

    return `${normalizedBasePath}${target}`;
  }

  window.BIGGYM_PRODUCT_DETAIL_PAGES = productDetailPages;
  window.BIGGYM_PRODUCT_SLUG_ALIASES = productSlugAliases;
  window.getBigGymProductDetailHref = getProductDetailHref;
})();
