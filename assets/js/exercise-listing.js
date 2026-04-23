(function () {
  const API_BASE_URL = window.BIGGYM_API_BASE_URL || (window.location.protocol === "file:" ? "http://localhost:4000/api" : `${window.location.origin}/api`);
  const DEFAULT_HERO_IMAGE = "../../assets/images/weight-room.jpg";

  const dom = {
    categoryFilters: document.getElementById("exercise-category-filters"),
    levelFilters: document.getElementById("exercise-level-filters"),
    grid: document.getElementById("exercise-grid"),
    emptyState: document.getElementById("exercise-empty-state"),
    resultsCount: document.getElementById("exercise-results-count")
  };

  if (!dom.grid || !dom.categoryFilters || !dom.levelFilters) {
    return;
  }

  const state = {
    exercises: [],
    activeCategory: "all",
    activeLevel: "all"
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function resolveMediaUrl(value, fallback = DEFAULT_HERO_IMAGE) {
    const rawValue = String(value || "").trim();

    if (!rawValue) {
      return fallback;
    }

    if (/^(https?:|data:|blob:)/i.test(rawValue) || rawValue.startsWith("/")) {
      return rawValue;
    }

    const normalizedPath = rawValue
      .replace(/^(\.\.\/)+/, "")
      .replace(/^\.\//, "");

    return `../../${normalizedPath}`;
  }

  async function apiFetch(path) {
    const response = await fetch(`${API_BASE_URL}${path}`);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.success) {
      throw new Error(payload.message || "Không thể tải danh sách bài tập");
    }

    return payload.data;
  }

  function getDetailUrl(slug) {
    return `baitap_pages/exercise-detail.html?slug=${encodeURIComponent(slug)}`;
  }

  function setFilterButtonState(buttons, activeValue) {
    buttons.forEach((button) => {
      const isActive = button.dataset.filterValue === activeValue;
      button.classList.toggle("border-primary", isActive);
      button.classList.toggle("bg-primary", isActive);
      button.classList.toggle("text-on-primary", isActive);
      button.classList.toggle("border-outline-variant", !isActive);
      button.classList.toggle("text-on-background", !isActive);
    });
  }

  function renderFilterButtons(container, items, activeValue, type) {
    const markup = items.map((item) => `
      <button
        class="exercise-filter-chip rounded-full border px-6 py-2 text-xs font-bold uppercase tracking-widest transition-all hover:border-primary hover:text-primary"
        data-filter-type="${type}"
        data-filter-value="${escapeHtml(item.value)}"
        type="button"
      >${escapeHtml(item.label)}</button>
    `).join("");

    container.innerHTML = markup;
    setFilterButtonState(Array.from(container.querySelectorAll("[data-filter-value]")), activeValue);
  }

  function buildCategoryFilters() {
    const uniqueCategories = Array.from(new Map(
      state.exercises
        .map((exercise) => ({
          value: exercise.category_slug || "uncategorized",
          label: exercise.category_name || "Khác"
        }))
        .map((item) => [item.value, item])
    ).values());

    return [{ value: "all", label: "Tất cả" }, ...uniqueCategories];
  }

  function buildLevelFilters() {
    const uniqueLevels = Array.from(new Map(
      state.exercises
        .map((exercise) => ({
          value: exercise.level_slug || "unknown",
          label: exercise.level_name || "Khác"
        }))
        .map((item) => [item.value, item])
    ).values());

    return [{ value: "all", label: "Mọi cấp độ" }, ...uniqueLevels];
  }

  function getFilteredExercises() {
    return state.exercises.filter((exercise) => {
      const matchesCategory = state.activeCategory === "all" || exercise.category_slug === state.activeCategory;
      const matchesLevel = state.activeLevel === "all" || exercise.level_slug === state.activeLevel;
      return matchesCategory && matchesLevel;
    });
  }

  function renderExercises() {
    const exercises = getFilteredExercises();
    dom.resultsCount.textContent = `${exercises.length} bài tập`;

    if (!exercises.length) {
      dom.grid.innerHTML = "";
      dom.emptyState.classList.remove("hidden");
      return;
    }

    dom.emptyState.classList.add("hidden");
    dom.grid.innerHTML = exercises.map((exercise) => `
      <article class="group">
        <a class="relative mb-6 block aspect-[4/5] overflow-hidden rounded-lg bg-surface-container-high" href="${escapeHtml(getDetailUrl(exercise.slug))}">
          <img alt="${escapeHtml(exercise.title)}" class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" src="${escapeHtml(resolveMediaUrl(exercise.hero_image, DEFAULT_HERO_IMAGE))}" />
          <div class="absolute left-4 top-4 rounded bg-background/60 px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${exercise.level_slug === "nang-cao" ? "text-primary" : exercise.level_slug === "trung-binh" ? "text-secondary" : "text-white/70"}">
            ${escapeHtml(exercise.level_name || "Bài tập")}
          </div>
        </a>
        <div class="flex items-start justify-between gap-4">
          <div>
            <a class="block" href="${escapeHtml(getDetailUrl(exercise.slug))}">
              <h3 class="serif mb-1 text-2xl transition-colors group-hover:text-primary">${escapeHtml(exercise.title)}</h3>
            </a>
            <p class="text-sm uppercase tracking-widest text-on-surface-variant">${escapeHtml(exercise.primary_muscles || exercise.category_name || "Bài tập tổng hợp")}</p>
            <p class="mt-4 max-w-md text-sm leading-relaxed text-gray-400">${escapeHtml(exercise.short_description || "Chi tiết kỹ thuật và nhóm cơ tác động đang được cập nhật.")}</p>
          </div>
          <a class="flex h-12 w-12 items-center justify-center rounded-full border border-outline-variant transition-all group-hover:border-primary group-hover:bg-primary" href="${escapeHtml(getDetailUrl(exercise.slug))}">
            <span class="material-symbols-outlined group-hover:text-on-primary">arrow_forward_ios</span>
          </a>
        </div>
      </article>
    `).join("");
  }

  function renderFilters() {
    renderFilterButtons(dom.categoryFilters, buildCategoryFilters(), state.activeCategory, "category");
    renderFilterButtons(dom.levelFilters, buildLevelFilters(), state.activeLevel, "level");
  }

  async function loadExercises() {
    state.exercises = await apiFetch("/exercises");
    renderFilters();
    renderExercises();
  }

  document.body.addEventListener("click", (event) => {
    const filterButton = event.target.closest("[data-filter-type]");
    if (!filterButton) return;

    if (filterButton.dataset.filterType === "category") {
      state.activeCategory = filterButton.dataset.filterValue;
    }

    if (filterButton.dataset.filterType === "level") {
      state.activeLevel = filterButton.dataset.filterValue;
    }

    renderFilters();
    renderExercises();
  });

  loadExercises().catch((_error) => {
    dom.grid.innerHTML = "";
    dom.resultsCount.textContent = "0 bài tập";
    dom.emptyState.classList.remove("hidden");
    dom.emptyState.innerHTML = `
      <p class="serif text-3xl text-primary">Chưa tải được thư viện bài tập</p>
      <p class="mt-4 text-sm leading-relaxed text-gray-400">Kiểm tra backend hoặc dữ liệu bài tập trước khi tiếp tục demo.</p>
    `;
  });
})();
