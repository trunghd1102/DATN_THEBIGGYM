(function () {
  const authLink = document.querySelector("[data-auth-link]");

  if (!authLink) {
    return;
  }

  const LABELS = {
    admin: "Admin",
    coach: "Coach",
    member: "Member",
    memberName: "\u0054h\u00e0nh vi\u00ean",
    login: "\u0110\u0103ng nh\u1eadp",
    profile: "H\u1ed3 s\u01a1",
    orders: "\u0110\u01a1n h\u00e0ng",
    home: "Trang ch\u1ee7",
    logout: "\u0110\u0103ng xu\u1ea5t",
    orderLookup: "Tra c\u1ee9u \u0111\u01a1n",
    sessionTitle: "Tr\u1ea1ng th\u00e1i phi\u00ean",
    sessionBody: "\u0110\u00e3 \u0111\u0103ng nh\u1eadp v\u00e0 \u0111\u1ed3ng b\u1ed9 t\u00e0i kho\u1ea3n tr\u00ean tr\u00ecnh duy\u1ec7t n\u00e0y.",
    menuLabel: "Menu",
    menuOpen: "M\u1edf menu \u0111i\u1ec1u h\u01b0\u1edbng",
    menuClose: "\u0110\u00f3ng menu \u0111i\u1ec1u h\u01b0\u1edbng",
    menuTitle: "\u0110i\u1ec1u h\u01b0\u1edbng nhanh",
    menuSubtitle: "Chuy\u1ec3n trang nhanh m\u00e0 kh\u00f4ng m\u1ea5t ng\u1eef c\u1ea3nh.",
    navTitle: "Kh\u00e1m ph\u00e1",
    accountTitle: "T\u00e0i kho\u1ea3n",
    guestTitle: "T\u00e0i kho\u1ea3n",
    guestBody: "\u0110\u0103ng nh\u1eadp \u0111\u1ec3 theo d\u00f5i \u0111\u01a1n v\u00e0 qu\u1ea3n l\u00fd th\u00f4ng tin c\u00e1 nh\u00e2n.",
    servicesTitle: "D\u1ecbch v\u1ee5",
    currentTag: "\u0110ang m\u1edf",
    loggedInAs: "\u0110ang d\u00f9ng",
    viewSite: "Xem website",
    shop: "C\u1eeda h\u00e0ng",
    exercises: "B\u00e0i t\u1eadp",
    tools: "C\u00f4ng c\u1ee5",
    contact: "Li\u00ean h\u1ec7",
    privateGym: "Private Gym Area",
    yoga: "Yoga Sanctuary",
    spa: "Spa Recovery",
    bathroom: "Ph\u00f2ng t\u1eafm cao c\u1ea5p",
    footerEyebrow: "Premium Fitness Club",
    footerBody: "Kh\u00f4ng gian t\u1eadp luy\u1ec7n, recovery v\u00e0 mua s\u1eafm \u0111\u01b0\u1ee3c t\u1ed5 ch\u1ee9c nh\u01b0 m\u1ed9t h\u1ec7 sinh th\u00e1i g\u1ecdn, sang v\u00e0 r\u00f5 nh\u1ecbp.",
    footerPrimaryCta: "Li\u00ean h\u1ec7 t\u01b0 v\u1ea5n",
    footerSecondaryCta: "Kh\u00e1m ph\u00e1 d\u1ecbch v\u1ee5",
    footerNavTitle: "\u0110i\u1ec1u h\u01b0\u1edbng",
    footerServicesTitle: "Kh\u00f4ng gian",
    footerContactTitle: "Li\u00ean h\u1ec7 tr\u1ef1c ti\u1ebfp",
    footerAddressLabel: "\u0110\u1ecba ch\u1ec9",
    footerEmailLabel: "Email",
    footerPhoneLabel: "Hotline",
    footerSocialLabel: "Facebook",
    footerLegalCopy: "\u00a9 {year} THE BIG GYM. Ki\u1ebfn t\u1ea1o tr\u1ea3i nghi\u1ec7m t\u1eadp luy\u1ec7n cao c\u1ea5p t\u1ea1i H\u1ea3i Ph\u00f2ng.",
    facebook: "Facebook"
  };

  const uiState = {
    desktopMenu: null,
    desktopTrigger: null,
    desktopWrapper: null,
    mobileRoot: null,
    mobileOverlay: null,
    mobilePanel: null,
    mobileContent: null,
    mobileToggle: null,
    mobileHideTimer: null,
    handlersBound: false
  };

  const FOOTER_DEFAULTS = {
    shopName: "THE BIG GYM",
    contactEmail: "thebiggym@phamductrung.id.vn",
    contactPhone: "1900 8888",
    address: "219 H\u1ed3 Sen, Ph\u01b0\u1eddng L\u00ea Ch\u00e2n, TP. H\u1ea3i Ph\u00f2ng",
    facebookUrl: "https://facebook.com/thebiggymhp",
    facebookLabel: "facebook.com/thebiggymhp"
  };

  function getStoredUser() {
    try {
      return JSON.parse(localStorage.getItem("biggym_user") || "null");
    } catch (error) {
      return null;
    }
  }

  function getStoredToken() {
    return localStorage.getItem("biggym_token");
  }

  function getBasePrefix() {
    return authLink.dataset.basePrefix || "";
  }

  function getApiBaseUrl() {
    return window.BIGGYM_API_BASE_URL || (window.location.protocol === "file:" ? "http://localhost:4000/api" : `${window.location.origin}/api`);
  }

  function buildPageHref(basePrefix, relativePath) {
    return `${basePrefix}${relativePath}`.replace(/pages\/pages\//g, "pages/");
  }

  function getFooterTarget() {
    const footers = Array.from(document.querySelectorAll("footer"));
    return footers.length ? footers[footers.length - 1] : null;
  }

  function buildSharedFooterMarkup(basePrefix) {
    const year = new Date().getFullYear();

    return `
      <footer data-shared-footer="true" class="relative overflow-hidden border-t border-white/8 bg-[#0b0b0b]">
        <div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f2ca50]/60 to-transparent"></div>
        <div class="pointer-events-none absolute -top-24 right-0 h-64 w-64 rounded-full bg-[#f2ca50]/8 blur-3xl"></div>
        <div class="pointer-events-none absolute bottom-0 left-0 h-56 w-56 rounded-full bg-white/[0.04] blur-3xl"></div>
        <div class="mx-auto max-w-screen-2xl px-4 py-16 sm:px-6 lg:px-12 lg:py-20">
          <div class="grid gap-12 border-b border-white/8 pb-12 lg:grid-cols-[minmax(0,1.4fr)_0.8fr_0.9fr_1fr]">
            <div class="space-y-6">
              <p class="text-[10px] font-bold uppercase tracking-[0.32em] text-[#f2ca50]">${LABELS.footerEyebrow}</p>
              <a href="${buildPageHref(basePrefix, "index.html")}" id="shared-footer-shop-name" class="inline-block font-['Noto_Serif'] text-4xl font-bold uppercase tracking-[-0.04em] text-white transition-colors duration-300 hover:text-[#f2ca50]">${FOOTER_DEFAULTS.shopName}</a>
              <p class="max-w-xl text-sm leading-7 text-gray-400">${LABELS.footerBody}</p>
              <div class="flex flex-col gap-3 sm:flex-row">
                <a href="${buildPageHref(basePrefix, "pages/contact.html")}" class="inline-flex items-center justify-center rounded-full bg-[#f2ca50] px-6 py-3 text-xs font-bold uppercase tracking-[0.18em] text-[#352700] transition-colors duration-300 hover:bg-[#ffd76a]">${LABELS.footerPrimaryCta}</a>
                <a href="${buildPageHref(basePrefix, "index.html#premium-services")}" class="inline-flex items-center justify-center rounded-full border border-white/10 px-6 py-3 text-xs font-bold uppercase tracking-[0.18em] text-white transition-colors duration-300 hover:border-[#f2ca50]/30 hover:text-[#f2ca50]">${LABELS.footerSecondaryCta}</a>
              </div>
            </div>

            <div class="space-y-5">
              <p class="text-[10px] font-bold uppercase tracking-[0.28em] text-gray-500">${LABELS.footerNavTitle}</p>
              <ul class="space-y-3 text-sm text-gray-300">
                <li><a class="transition-colors duration-300 hover:text-[#f2ca50]" href="${buildPageHref(basePrefix, "index.html")}">${LABELS.home}</a></li>
                <li><a class="transition-colors duration-300 hover:text-[#f2ca50]" href="${buildPageHref(basePrefix, "pages/shop.html")}">${LABELS.shop}</a></li>
                <li><a class="transition-colors duration-300 hover:text-[#f2ca50]" href="${buildPageHref(basePrefix, "pages/baitap.html")}">${LABELS.exercises}</a></li>
                <li><a class="transition-colors duration-300 hover:text-[#f2ca50]" href="${buildPageHref(basePrefix, "pages/congcu.html")}">${LABELS.tools}</a></li>
                <li><a class="transition-colors duration-300 hover:text-[#f2ca50]" href="${buildPageHref(basePrefix, "pages/contact.html")}">${LABELS.contact}</a></li>
              </ul>
            </div>

            <div class="space-y-5">
              <p class="text-[10px] font-bold uppercase tracking-[0.28em] text-gray-500">${LABELS.footerServicesTitle}</p>
              <ul class="space-y-3 text-sm text-gray-300">
                <li><a class="transition-colors duration-300 hover:text-[#f2ca50]" href="${buildPageHref(basePrefix, "pages/service_pages/private-gym-area.html")}">${LABELS.privateGym}</a></li>
                <li><a class="transition-colors duration-300 hover:text-[#f2ca50]" href="${buildPageHref(basePrefix, "pages/service_pages/yoga-sanctuary.html")}">${LABELS.yoga}</a></li>
                <li><a class="transition-colors duration-300 hover:text-[#f2ca50]" href="${buildPageHref(basePrefix, "pages/service_pages/spa-recovery.html")}">${LABELS.spa}</a></li>
                <li><a class="transition-colors duration-300 hover:text-[#f2ca50]" href="${buildPageHref(basePrefix, "pages/service_pages/premium-bathroom.html")}">${LABELS.bathroom}</a></li>
              </ul>
            </div>

            <div class="space-y-5">
              <p class="text-[10px] font-bold uppercase tracking-[0.28em] text-gray-500">${LABELS.footerContactTitle}</p>
              <div class="space-y-4 text-sm text-gray-300">
                <div>
                  <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">${LABELS.footerAddressLabel}</p>
                  <p id="contact-footer-address" class="mt-2 max-w-xs leading-7 text-gray-300">${FOOTER_DEFAULTS.address}</p>
                </div>
                <div>
                  <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">${LABELS.footerEmailLabel}</p>
                  <a id="shared-footer-email-link" class="mt-2 inline-flex transition-colors duration-300 hover:text-[#f2ca50]" href="mailto:${FOOTER_DEFAULTS.contactEmail}">
                    <span id="shared-footer-email">${FOOTER_DEFAULTS.contactEmail}</span>
                  </a>
                </div>
                <div>
                  <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">${LABELS.footerPhoneLabel}</p>
                  <a id="shared-footer-phone-link" class="mt-2 inline-flex transition-colors duration-300 hover:text-[#f2ca50]" href="tel:${FOOTER_DEFAULTS.contactPhone.replace(/[^\\d+]/g, "")}">
                    <span id="contact-footer-phone">Hotline: ${FOOTER_DEFAULTS.contactPhone}</span>
                  </a>
                </div>
                <div>
                  <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">${LABELS.footerSocialLabel}</p>
                  <a id="shared-footer-facebook-link" class="mt-2 inline-flex transition-colors duration-300 hover:text-[#f2ca50]" href="${FOOTER_DEFAULTS.facebookUrl}" rel="noopener noreferrer" target="_blank">${FOOTER_DEFAULTS.facebookLabel}</a>
                </div>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-4 pt-6 text-[11px] tracking-[0.08em] text-gray-500 md:flex-row md:items-center md:justify-between">
            <p id="shared-footer-legal-copy">${LABELS.footerLegalCopy.replace("{year}", year)}</p>
            <div class="flex flex-wrap gap-5 text-[10px] font-bold uppercase tracking-[0.18em]">
              <a class="transition-colors duration-300 hover:text-[#f2ca50]" href="${buildPageHref(basePrefix, "pages/contact.html")}">${LABELS.contact}</a>
              <a class="transition-colors duration-300 hover:text-[#f2ca50]" href="${buildPageHref(basePrefix, "pages/orders.html")}">${LABELS.orderLookup}</a>
              <a class="transition-colors duration-300 hover:text-[#f2ca50]" href="${FOOTER_DEFAULTS.facebookUrl}" rel="noopener noreferrer" target="_blank">${LABELS.facebook}</a>
            </div>
          </div>
        </div>
      </footer>
    `;
  }

  function setFooterText(id, value) {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = value;
    }
  }

  function setFooterHref(id, value) {
    const element = document.getElementById(id);

    if (element) {
      element.href = value;
    }
  }

  function hydrateSharedFooter(meta = {}) {
    const shopName = (meta.shop_name || FOOTER_DEFAULTS.shopName).trim();
    const contactEmail = (meta.contact_email || FOOTER_DEFAULTS.contactEmail).trim();
    const contactPhone = (meta.contact_phone || FOOTER_DEFAULTS.contactPhone).trim();
    const address = (meta.address || FOOTER_DEFAULTS.address).trim();
    const normalizedPhone = contactPhone.replace(/[^\d+]/g, "");

    setFooterText("shared-footer-shop-name", shopName);
    setFooterText("contact-footer-address", address);
    setFooterText("shared-footer-email", contactEmail);
    setFooterText("contact-footer-phone", `Hotline: ${contactPhone}`);
    setFooterHref("shared-footer-email-link", `mailto:${contactEmail}`);
    setFooterHref("shared-footer-phone-link", `tel:${normalizedPhone}`);
  }

  function renderSharedFooter(basePrefix) {
    const footer = getFooterTarget();

    if (!footer || footer.dataset.footerMode === "custom") {
      return;
    }

    footer.outerHTML = buildSharedFooterMarkup(basePrefix);
    hydrateSharedFooter();

    fetch(`${getApiBaseUrl()}/contacts/meta`)
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (!payload?.success || !payload.data) {
          return;
        }

        hydrateSharedFooter(payload.data);
      })
      .catch(() => {});
  }

  function getRoleLabel(role) {
    if (role === "admin") return LABELS.admin;
    if (role === "coach") return LABELS.coach;
    return LABELS.member;
  }

  function getFirstName(user) {
    return (user.full_name || user.email || LABELS.memberName).trim().split(/\s+/).pop();
  }

  function getAuthButtonClass() {
    return "hidden md:inline-flex min-h-[48px] min-w-[176px] shrink-0 items-center justify-center gap-2 rounded-full border border-[#f2ca50]/40 px-6 py-3 text-xs font-bold uppercase tracking-widest text-[#f2ca50] transition-colors duration-300 hover:bg-[#f2ca50] hover:text-[#3c2f00]";
  }

  function getOrderLookupButtonClass() {
    return "hidden md:inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-full border border-white/10 px-5 py-3 text-xs font-bold uppercase tracking-widest text-gray-200 transition-colors duration-300 hover:border-[#f2ca50]/30 hover:text-[#f2ca50]";
  }

  function getMobileNavLinkClass(isActive) {
    return [
      "flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] transition-colors duration-300",
      isActive
        ? "border-[#f2ca50]/30 bg-[#f2ca50]/10 text-[#f2ca50]"
        : "border-white/10 bg-white/[0.02] text-gray-100 hover:border-[#f2ca50]/20 hover:text-[#f2ca50]"
    ].join(" ");
  }

  function getMobileActionClass(isPrimary) {
    return [
      "inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-[11px] font-bold uppercase tracking-[0.18em] transition-colors duration-300",
      isPrimary
        ? "bg-gradient-to-r from-[#f2ca50] to-[#d4af37] text-[#3c2f00]"
        : "border border-white/10 text-gray-100 hover:border-[#f2ca50]/30 hover:text-[#f2ca50]"
    ].join(" ");
  }

  function closeDesktopMenu() {
    if (!uiState.desktopMenu || !uiState.desktopTrigger) {
      return;
    }

    uiState.desktopMenu.classList.add("hidden");
    uiState.desktopTrigger.setAttribute("aria-expanded", "false");
  }

  function openDesktopMenu() {
    if (!uiState.desktopMenu || !uiState.desktopTrigger) {
      return;
    }

    uiState.desktopMenu.classList.remove("hidden");
    uiState.desktopTrigger.setAttribute("aria-expanded", "true");
  }

  function clearSessionAndRedirect(basePrefix) {
    localStorage.removeItem("biggym_token");
    localStorage.removeItem("biggym_user");
    window.location.href = buildPageHref(basePrefix, "index.html");
  }

  function ensureWrapper() {
    if (authLink.parentElement && authLink.parentElement.dataset.authWrapper === "true") {
      return authLink.parentElement;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "relative flex items-center gap-3";
    wrapper.dataset.authWrapper = "true";
    authLink.parentNode.insertBefore(wrapper, authLink);
    wrapper.appendChild(authLink);
    return wrapper;
  }

  function getNavElement() {
    return authLink.closest("nav");
  }

  function getNavInner() {
    const nav = getNavElement();

    if (!nav) {
      return null;
    }

    return Array.from(nav.children).find((child) => child.nodeType === 1) || null;
  }

  function getActionsContainer() {
    const wrapper = ensureWrapper();
    return wrapper.parentElement;
  }

  function getBrandElement() {
    const navInner = getNavInner();
    return navInner ? navInner.firstElementChild : null;
  }

  function getDesktopLinksContainer() {
    const navInner = getNavInner();

    if (!navInner) {
      return null;
    }

    return Array.from(navInner.children).find((child) => Array.from(child.classList || []).includes("md:flex")) || null;
  }

  function getPrimaryCtaElement() {
    const actions = getActionsContainer();
    const wrapper = ensureWrapper();

    if (!actions) {
      return null;
    }

    return Array.from(actions.children).find((child) => child !== wrapper && child.dataset.mobileNavToggle !== "true") || null;
  }

  function updateNavHeightVar() {
    const navInner = getNavInner();
    const nav = getNavElement();
    const height = navInner?.offsetHeight || nav?.offsetHeight || 0;

    document.documentElement.style.setProperty("--biggym-nav-height", `${height}px`);
  }

  function stabilizeAuthLink() {
    authLink.className = getAuthButtonClass();
    authLink.style.minWidth = "176px";
    authLink.style.minHeight = "48px";
  }

  function tightenHeaderForMobile() {
    const navInner = getNavInner();
    const actions = getActionsContainer();
    const brand = getBrandElement();
    const cta = getPrimaryCtaElement();

    if (navInner) {
      navInner.classList.remove("px-12", "py-6");
      navInner.classList.add("px-4", "py-4", "sm:px-6", "lg:px-12", "lg:py-6");
    }

    if (actions) {
      actions.classList.remove("gap-3");
      actions.classList.add("gap-2", "md:gap-3");
    }

    if (brand) {
      brand.classList.remove("text-2xl");
      brand.classList.add("text-lg", "leading-none", "sm:text-xl", "md:text-2xl");
    }

    if (cta) {
      cta.classList.add("shrink-0");
      cta.classList.remove("px-8", "py-3", "text-xs");
      cta.classList.add("px-4", "py-2.5", "text-[10px]", "sm:px-5", "md:px-8", "md:py-3", "md:text-xs");
    }

    updateNavHeightVar();
  }

  function ensureOrderLookupLink(wrapper, basePrefix) {
    let orderLookupLink = wrapper.querySelector("[data-order-lookup-link]");

    if (!orderLookupLink) {
      orderLookupLink = document.createElement("a");
      orderLookupLink.dataset.orderLookupLink = "true";
      wrapper.insertBefore(orderLookupLink, authLink);
    }

    orderLookupLink.className = getOrderLookupButtonClass();
    orderLookupLink.href = buildPageHref(basePrefix, "pages/orders.html");
    orderLookupLink.textContent = LABELS.orderLookup;
    return orderLookupLink;
  }

  function createMenuButtonLink(href, label, className) {
    const link = document.createElement("a");
    link.href = href;
    link.className = className;
    link.textContent = label;
    link.dataset.mobileNavClose = "true";
    return link;
  }

  function buildMenu(user, basePrefix, trigger) {
    const menu = document.createElement("div");
    menu.dataset.authMenu = "true";
    menu.className = "hidden absolute right-0 top-full z-50 mt-3 w-72 overflow-hidden rounded-2xl border border-white/10 bg-[#171717] shadow-2xl shadow-black/40";

    const header = document.createElement("div");
    header.className = "border-b border-white/5 bg-white/[0.03] px-5 py-4";
    header.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="truncate text-sm font-extrabold uppercase tracking-[0.18em] text-[#f2ca50]">${user.full_name || LABELS.memberName}</p>
          <p class="mt-1 truncate text-xs text-gray-400">${user.email || ""}</p>
        </div>
        <span class="rounded-full border border-[#f2ca50]/25 bg-[#f2ca50]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#f2ca50]">${getRoleLabel(user.role)}</span>
      </div>
    `;

    const content = document.createElement("div");
    content.className = "space-y-3 px-5 py-4";

    const summary = document.createElement("div");
    summary.className = "rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3";
    summary.innerHTML = `
      <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">${LABELS.sessionTitle}</p>
      <p class="mt-2 text-sm text-gray-200">${LABELS.sessionBody}</p>
    `;

    const actions = document.createElement("div");
    actions.className = "grid gap-3";

    if (user.role === "admin") {
      actions.appendChild(
        createMenuButtonLink(
          buildPageHref(basePrefix, "pages/admin.html"),
          LABELS.admin,
          "rounded-full border border-[#f2ca50]/20 bg-[#f2ca50]/8 px-4 py-3 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-[#f2ca50] transition-colors hover:bg-[#f2ca50] hover:text-[#3c2f00]"
        )
      );
    }

    actions.appendChild(
      createMenuButtonLink(
        buildPageHref(basePrefix, "pages/profile.html"),
        LABELS.profile,
        "rounded-full border border-[#f2ca50]/20 bg-[#f2ca50]/8 px-4 py-3 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-[#f2ca50] transition-colors hover:bg-[#f2ca50] hover:text-[#3c2f00]"
      )
    );
    actions.appendChild(
      createMenuButtonLink(
        buildPageHref(basePrefix, "pages/orders.html"),
        LABELS.orders,
        "rounded-full border border-[#f2ca50]/20 bg-[#f2ca50]/8 px-4 py-3 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-[#f2ca50] transition-colors hover:bg-[#f2ca50] hover:text-[#3c2f00]"
      )
    );
    actions.appendChild(
      createMenuButtonLink(
        buildPageHref(basePrefix, "index.html"),
        LABELS.home,
        "rounded-full border border-white/10 px-4 py-3 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-gray-200 transition-colors hover:border-[#f2ca50]/30 hover:text-[#f2ca50]"
      )
    );

    const logoutButton = document.createElement("button");
    logoutButton.type = "button";
    logoutButton.className = "rounded-full bg-gradient-to-r from-[#f2ca50] to-[#d4af37] px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#3c2f00] transition-transform hover:scale-[1.02]";
    logoutButton.textContent = LABELS.logout;
    logoutButton.addEventListener("click", () => {
      closeDesktopMenu();
      closeMobileMenu();
      clearSessionAndRedirect(basePrefix);
    });

    actions.appendChild(logoutButton);
    content.appendChild(summary);
    content.appendChild(actions);
    menu.appendChild(header);
    menu.appendChild(content);

    uiState.desktopMenu = menu;
    uiState.desktopTrigger = trigger;
    uiState.desktopWrapper = ensureWrapper();

    return menu;
  }

  function normalizeLabel(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }

  function wirePtBookingCtas(basePrefix) {
    const targetHref = buildPageHref(basePrefix, "pages/doi-ngu.html#pt-booking");

    Array.from(document.querySelectorAll("[data-pt-booking-link], button, a")).forEach((element) => {
      if (element.dataset.ptBookingWired === "true") {
        return;
      }

      const label = normalizeLabel(element.textContent);
      const isPtTrigger = element.hasAttribute("data-pt-booking-link") || label === "Đặt lịch PT";

      if (!isPtTrigger) {
        return;
      }

      if (element.tagName === "A") {
        element.href = targetHref;
      } else {
        element.addEventListener("click", () => {
          window.location.href = targetHref;
        });
      }

      element.dataset.ptBookingWired = "true";
    });
  }

  function isLinkActive(element) {
    return element.classList.contains("text-primary")
      || element.classList.contains("text-[#f2ca50]")
      || element.classList.contains("border-b-2");
  }

  function extractNavigationItems() {
    const container = getDesktopLinksContainer();

    if (!container) {
      return [];
    }

    return Array.from(container.children)
      .map((child) => {
        if (child.tagName === "A") {
          return {
            type: "link",
            label: normalizeLabel(child.textContent),
            href: child.getAttribute("href") || "#",
            active: isLinkActive(child)
          };
        }

        const trigger = Array.from(child.children).find((entry) => entry.tagName === "A");
        const megaMenu = child.querySelector(".mega-menu");

        if (!trigger || !megaMenu) {
          return null;
        }

        const items = Array.from(megaMenu.querySelectorAll("a[href]")).map((link) => ({
          label: normalizeLabel(link.textContent),
          href: link.getAttribute("href") || "#"
        }));

        if (!items.length) {
          Array.from(megaMenu.querySelectorAll("li")).forEach((item) => {
            items.push({
              label: normalizeLabel(item.textContent),
              href: ""
            });
          });
        }

        return {
          type: "section",
          label: normalizeLabel(trigger.textContent.replace("expand_more", "")),
          items
        };
      })
      .filter(Boolean);
  }

  function setDocumentScrollLocked(locked) {
    document.documentElement.style.overflow = locked ? "hidden" : "";
    document.body.style.overflow = locked ? "hidden" : "";
  }

  function isMobileMenuOpen() {
    return Boolean(uiState.mobileRoot && !uiState.mobileRoot.classList.contains("hidden"));
  }

  function closeMobileMenu() {
    if (!uiState.mobileRoot || uiState.mobileRoot.classList.contains("hidden")) {
      return;
    }

    if (uiState.mobileHideTimer) {
      clearTimeout(uiState.mobileHideTimer);
    }

    uiState.mobileOverlay.classList.add("opacity-0");
    uiState.mobilePanel.classList.add("translate-x-full");
    uiState.mobileToggle.setAttribute("aria-expanded", "false");
    uiState.mobileToggle.querySelector("[data-mobile-nav-icon]").textContent = "menu";
    setDocumentScrollLocked(false);

    uiState.mobileHideTimer = window.setTimeout(() => {
      uiState.mobileRoot.classList.add("hidden");
      uiState.mobileHideTimer = null;
    }, 260);
  }

  function openMobileMenu() {
    if (!uiState.mobileRoot) {
      return;
    }

    if (uiState.mobileHideTimer) {
      clearTimeout(uiState.mobileHideTimer);
      uiState.mobileHideTimer = null;
    }

    uiState.mobileRoot.classList.remove("hidden");
    uiState.mobileToggle.setAttribute("aria-expanded", "true");
    uiState.mobileToggle.querySelector("[data-mobile-nav-icon]").textContent = "close";
    setDocumentScrollLocked(true);

    requestAnimationFrame(() => {
      uiState.mobileOverlay.classList.remove("opacity-0");
      uiState.mobilePanel.classList.remove("translate-x-full");
    });
  }

  function createMobileSectionTitle(label) {
    const title = document.createElement("p");
    title.className = "mb-3 text-[10px] font-bold uppercase tracking-[0.24em] text-gray-500";
    title.textContent = label;
    return title;
  }

  function createMobileSummaryCard(user) {
    const card = document.createElement("div");
    card.className = "rounded-[24px] border border-[#f2ca50]/15 bg-[#f2ca50]/8 p-4";

    if (!user) {
      card.innerHTML = `
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-[#f2ca50]">${LABELS.guestTitle}</p>
        <p class="mt-3 text-sm leading-relaxed text-gray-100">${LABELS.guestBody}</p>
      `;
      return card;
    }

    const firstName = getFirstName(user);
    const avatarMarkup = user.avatar_url
      ? `<img alt="Avatar" class="h-11 w-11 rounded-full object-cover" src="${user.avatar_url}">`
      : `<span class="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#f2ca50] text-sm font-black uppercase text-[#3c2f00]">${firstName.charAt(0)}</span>`;

    card.innerHTML = `
      <div class="flex items-start gap-3">
        ${avatarMarkup}
        <div class="min-w-0 flex-1">
          <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-[#f2ca50]">${LABELS.loggedInAs}</p>
          <p class="mt-2 truncate text-sm font-bold uppercase tracking-[0.12em] text-white">${user.full_name || LABELS.memberName}</p>
          <p class="mt-1 truncate text-xs text-gray-300">${user.email || ""}</p>
        </div>
        <span class="rounded-full border border-[#f2ca50]/25 bg-[#f2ca50]/10 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[#f2ca50]">${getRoleLabel(user.role)}</span>
      </div>
    `;

    return card;
  }

  function appendMobileActionLink(container, href, label, isPrimary) {
    container.appendChild(createMenuButtonLink(href, label, getMobileActionClass(isPrimary)));
  }

  function renderMobileMenu(user, basePrefix) {
    if (!uiState.mobileContent) {
      return;
    }

    uiState.mobileContent.innerHTML = "";

    const content = document.createElement("div");
    content.className = "flex h-full flex-col gap-6";

    const accountSection = document.createElement("section");
    accountSection.appendChild(createMobileSectionTitle(LABELS.accountTitle));
    accountSection.appendChild(createMobileSummaryCard(user));

    const accountActions = document.createElement("div");
    accountActions.className = "mt-4 grid gap-3";

    if (user && getStoredToken()) {
      if (user.role === "admin") {
        appendMobileActionLink(accountActions, buildPageHref(basePrefix, "pages/admin.html"), LABELS.admin, false);
      }

      appendMobileActionLink(accountActions, buildPageHref(basePrefix, "pages/profile.html"), LABELS.profile, false);
      appendMobileActionLink(accountActions, buildPageHref(basePrefix, "pages/orders.html"), LABELS.orders, false);

      const logoutButton = document.createElement("button");
      logoutButton.type = "button";
      logoutButton.className = getMobileActionClass(true);
      logoutButton.textContent = LABELS.logout;
      logoutButton.addEventListener("click", () => {
        closeMobileMenu();
        clearSessionAndRedirect(basePrefix);
      });
      accountActions.appendChild(logoutButton);
    } else {
      appendMobileActionLink(accountActions, buildPageHref(basePrefix, "pages/orders.html"), LABELS.orderLookup, false);
      appendMobileActionLink(accountActions, buildPageHref(basePrefix, "pages/login.html"), LABELS.login, true);
    }

    accountSection.appendChild(accountActions);
    content.appendChild(accountSection);

    const navigationSection = document.createElement("section");
    navigationSection.appendChild(createMobileSectionTitle(LABELS.navTitle));

    const navigationList = document.createElement("div");
    navigationList.className = "space-y-3";

    extractNavigationItems().forEach((item) => {
      if (item.type === "link") {
        navigationList.appendChild(createMenuButtonLink(item.href, item.label, getMobileNavLinkClass(item.active)));
        return;
      }

      const details = document.createElement("details");
      details.className = "overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.02]";

      const summary = document.createElement("summary");
      summary.className = "flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] text-gray-100";
      summary.innerHTML = `
        <span>${item.label || LABELS.servicesTitle}</span>
        <span class="material-symbols-outlined text-base text-gray-500">expand_more</span>
      `;

      const body = document.createElement("div");
      body.className = "border-t border-white/5 px-4 py-3";

      const itemList = document.createElement("div");
      itemList.className = "space-y-2";

      item.items.forEach((entry) => {
        if (entry.href) {
          itemList.appendChild(createMenuButtonLink(entry.href, entry.label, "block rounded-2xl px-3 py-2 text-sm text-gray-300 transition-colors duration-300 hover:bg-white/[0.03] hover:text-[#f2ca50]"));
          return;
        }

        const label = document.createElement("div");
        label.className = "rounded-2xl border border-white/5 px-3 py-2 text-sm text-gray-300";
        label.textContent = entry.label;
        itemList.appendChild(label);
      });

      body.appendChild(itemList);
      details.appendChild(summary);
      details.appendChild(body);
      navigationList.appendChild(details);
    });

    navigationSection.appendChild(navigationList);
    content.appendChild(navigationSection);

    const siteLink = createMenuButtonLink(
      buildPageHref(basePrefix, "index.html"),
      LABELS.viewSite,
      "mt-auto inline-flex w-full items-center justify-center rounded-full border border-white/10 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-100 transition-colors duration-300 hover:border-[#f2ca50]/30 hover:text-[#f2ca50]"
    );
    content.appendChild(siteLink);

    uiState.mobileContent.appendChild(content);
  }

  function ensureMobileMenuScaffold() {
    if (uiState.mobileRoot) {
      return;
    }

    const actions = getActionsContainer();

    if (!actions) {
      return;
    }

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.dataset.mobileNavToggle = "true";
    toggle.className = "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-[#f2ca50] transition-colors duration-300 hover:border-[#f2ca50]/30 hover:text-white md:hidden";
    toggle.setAttribute("aria-label", LABELS.menuOpen);
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = `<span class="material-symbols-outlined text-[20px]" data-mobile-nav-icon>menu</span>`;
    actions.appendChild(toggle);

    const root = document.createElement("div");
    root.className = "hidden fixed inset-0 z-[70] md:hidden";
    root.dataset.mobileNavRoot = "true";

    const overlay = document.createElement("button");
    overlay.type = "button";
    overlay.className = "absolute inset-0 bg-black/70 opacity-0 transition-opacity duration-300";
    overlay.setAttribute("aria-label", LABELS.menuClose);

    const panel = document.createElement("div");
    panel.className = "absolute inset-y-0 right-0 flex w-[min(88vw,360px)] max-w-full translate-x-full flex-col border-l border-white/10 bg-[#131313] px-5 py-5 shadow-2xl shadow-black/60 transition-transform duration-300";

    panel.innerHTML = `
      <div class="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
        <div class="min-w-0">
          <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-[#f2ca50]">${LABELS.menuLabel}</p>
          <h2 class="mt-2 text-xl font-bold uppercase tracking-[0.12em] text-white">${LABELS.menuTitle}</h2>
          <p class="mt-2 text-sm leading-relaxed text-gray-400">${LABELS.menuSubtitle}</p>
        </div>
        <button type="button" data-mobile-nav-close class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 text-gray-100 transition-colors duration-300 hover:border-[#f2ca50]/30 hover:text-[#f2ca50]" aria-label="${LABELS.menuClose}">
          <span class="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
    `;

    const content = document.createElement("div");
    content.className = "flex-1 overflow-y-auto py-6";
    content.dataset.mobileNavContent = "true";

    panel.appendChild(content);
    root.appendChild(overlay);
    root.appendChild(panel);
    document.body.appendChild(root);

    uiState.mobileRoot = root;
    uiState.mobileOverlay = overlay;
    uiState.mobilePanel = panel;
    uiState.mobileContent = content;
    uiState.mobileToggle = toggle;

    toggle.addEventListener("click", () => {
      if (isMobileMenuOpen()) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });

    overlay.addEventListener("click", closeMobileMenu);
    panel.querySelector("[data-mobile-nav-close]").addEventListener("click", closeMobileMenu);
    content.addEventListener("click", (event) => {
      const target = event.target.closest("[data-mobile-nav-close]");

      if (target) {
        closeMobileMenu();
      }
    });
  }

  function bindGlobalHandlers() {
    if (uiState.handlersBound) {
      return;
    }

    document.addEventListener("click", (event) => {
      if (uiState.desktopWrapper && uiState.desktopMenu && !uiState.desktopWrapper.contains(event.target)) {
        closeDesktopMenu();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") {
        return;
      }

      closeDesktopMenu();
      closeMobileMenu();
    });

    window.addEventListener("resize", () => {
      updateNavHeightVar();

      if (window.innerWidth >= 768) {
        closeMobileMenu();
      }
    });

    window.addEventListener("load", updateNavHeightVar, { once: true });

    if (document.fonts && typeof document.fonts.ready?.then === "function") {
      document.fonts.ready.then(() => {
        updateNavHeightVar();
      }).catch(() => {});
    }

    window.setTimeout(updateNavHeightVar, 200);
    window.setTimeout(updateNavHeightVar, 800);

    uiState.handlersBound = true;
  }

  function renderLoggedOut(basePrefix) {
    const wrapper = ensureWrapper();
    ensureOrderLookupLink(wrapper, basePrefix);

    authLink.className = getAuthButtonClass();
    authLink.textContent = LABELS.login;
    authLink.href = buildPageHref(basePrefix, "pages/login.html");
    authLink.removeAttribute("title");
    authLink.removeAttribute("aria-expanded");
    authLink.removeAttribute("aria-haspopup");
    authLink.onclick = null;

    const existingMenu = wrapper.querySelector("[data-auth-menu]");
    if (existingMenu) {
      existingMenu.remove();
    }

    uiState.desktopMenu = null;
    uiState.desktopTrigger = null;
    uiState.desktopWrapper = wrapper;
  }

  function renderLoggedIn(user, basePrefix) {
    const wrapper = ensureWrapper();
    const firstName = getFirstName(user);
    const roleLabel = getRoleLabel(user.role);
    const avatarMarkup = user.avatar_url
      ? `<img alt="Avatar t\u00e0i kho\u1ea3n" class="h-7 w-7 rounded-full object-cover" src="${user.avatar_url}">`
      : `<span class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#f2ca50] text-[11px] font-black uppercase text-[#3c2f00]">${firstName.charAt(0)}</span>`;
    const existingMenu = wrapper.querySelector("[data-auth-menu]");
    const existingOrderLookupLink = wrapper.querySelector("[data-order-lookup-link]");

    if (existingMenu) {
      existingMenu.remove();
    }

    if (existingOrderLookupLink) {
      existingOrderLookupLink.remove();
    }

    authLink.className = getAuthButtonClass();
    authLink.href = "#";
    authLink.title = user.full_name || user.email || "Tai khoan";
    authLink.setAttribute("aria-haspopup", "menu");
    authLink.setAttribute("aria-expanded", "false");
    authLink.innerHTML = `
      ${avatarMarkup}
      <span>${firstName}</span>
      <span class="rounded-full border border-[#f2ca50]/30 bg-[#f2ca50]/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.15em] text-[#f2ca50]">${roleLabel}</span>
    `;

    const menu = buildMenu(user, basePrefix, authLink);
    wrapper.appendChild(menu);

    authLink.onclick = (event) => {
      event.preventDefault();

      if (menu.classList.contains("hidden")) {
        openDesktopMenu();
      } else {
        closeDesktopMenu();
      }
    };
  }

  const user = getStoredUser();
  const token = getStoredToken();
  const basePrefix = getBasePrefix();

  stabilizeAuthLink();
  tightenHeaderForMobile();
  updateNavHeightVar();
  renderSharedFooter(basePrefix);
  wirePtBookingCtas(basePrefix);
  ensureMobileMenuScaffold();
  bindGlobalHandlers();

  if (!user || !token) {
    renderLoggedOut(basePrefix);
    renderMobileMenu(null, basePrefix);
    return;
  }

  renderLoggedIn(user, basePrefix);
  renderMobileMenu(user, basePrefix);
})();
