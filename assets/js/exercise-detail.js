(function () {
  const API_BASE_URL = window.BIGGYM_API_BASE_URL || (window.location.protocol === "file:" ? "http://localhost:4000/api" : `${window.location.origin}/api`);
  const DEFAULT_HERO_IMAGE = "../../assets/images/exercise/exercises-hero.jpg";

  const dom = {
    shell: document.getElementById("exercise-detail-shell"),
    errorState: document.getElementById("exercise-detail-error"),
    errorMessage: document.getElementById("exercise-detail-error-message"),
    breadcrumbName: document.getElementById("exercise-breadcrumb-name"),
    categoryLink: document.getElementById("exercise-category-link"),
    mediaShell: document.getElementById("exercise-media-shell"),
    focusLabel: document.getElementById("exercise-focus-label"),
    title: document.getElementById("exercise-title"),
    description: document.getElementById("exercise-description"),
    level: document.getElementById("exercise-level"),
    equipment: document.getElementById("exercise-equipment"),
    calories: document.getElementById("exercise-calories"),
    steps: document.getElementById("exercise-steps"),
    tipShell: document.getElementById("exercise-expert-tip-shell"),
    tipText: document.getElementById("exercise-expert-tip"),
    mistakesShell: document.getElementById("exercise-common-mistakes-shell"),
    mistakes: document.getElementById("exercise-common-mistakes"),
    muscleTagsShell: document.getElementById("exercise-muscle-tags-shell"),
    muscleTags: document.getElementById("exercise-muscle-tags"),
    recommendationsShell: document.getElementById("exercise-recommendations-shell"),
    recommendations: document.getElementById("exercise-recommendations"),
    relatedShell: document.getElementById("exercise-related-shell"),
    related: document.getElementById("exercise-related")
  };

  if (!dom.shell || !dom.errorState) {
    return;
  }

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
      throw new Error(payload.message || "Không thể tải chi tiết bài tập");
    }

    return payload.data;
  }

  function getSlugFromQuery() {
    return new URLSearchParams(window.location.search).get("slug") || "";
  }

  function renderMedia(exercise) {
    if (exercise.video_url) {
      dom.mediaShell.innerHTML = `
        <div class="absolute inset-0 bg-surface-container-lowest"></div>
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
          class="absolute inset-0 z-10 h-full w-full"
          frameborder="0"
          referrerpolicy="strict-origin-when-cross-origin"
          src="${escapeHtml(exercise.video_url)}"
          title="${escapeHtml(exercise.title)}"
        ></iframe>
      `;
      return;
    }

    dom.mediaShell.innerHTML = `
      <img alt="${escapeHtml(exercise.title)}" class="h-full w-full object-cover" src="${escapeHtml(resolveMediaUrl(exercise.hero_image, DEFAULT_HERO_IMAGE))}" />
      <div class="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent"></div>
    `;
  }

  function renderSteps(steps = []) {
    dom.steps.innerHTML = steps.length
      ? steps.map((step, index) => `
        <div class="step-card">
          <span class="step-index">${String(index + 1).padStart(2, "0")}</span>
          <div>
            <h3 class="mb-2 text-lg font-bold text-on-background">${escapeHtml(step.title)}</h3>
            <p class="leading-relaxed text-on-surface-variant">${escapeHtml(step.body)}</p>
          </div>
        </div>
      `).join("")
      : `
        <div class="rounded-xl border border-white/5 bg-surface-container-low px-6 py-5 text-sm leading-relaxed text-gray-400">
          Chưa có hướng dẫn chi tiết cho bài tập này.
        </div>
      `;
  }

  function renderTextList(container, items, bulletColorClass = "text-red-400") {
    container.innerHTML = items.map((item) => `
      <li class="flex items-start gap-2">
        <span class="${bulletColorClass}">•</span>
        <span>${escapeHtml(item)}</span>
      </li>
    `).join("");
  }

  function renderRelatedExercises(items = []) {
    const safeItems = items.filter((item) => item.slug || item.title);

    if (!safeItems.length) {
      dom.relatedShell.classList.add("hidden");
      return;
    }

    dom.relatedShell.classList.remove("hidden");
    dom.related.innerHTML = safeItems.map((item) => {
      const label = escapeHtml(item.title || item.slug || "Bài tập liên quan");
      const category = escapeHtml(item.category_name || "Bài tập liên quan");
      const description = escapeHtml(item.short_description || "Tiếp tục buổi tập với bài bổ trợ phù hợp.");
      const imageUrl = escapeHtml(resolveMediaUrl(item.hero_image || "", DEFAULT_HERO_IMAGE));

      if (!item.slug) {
        return `
          <div class="group block space-y-4 rounded-[24px] border border-white/5 bg-surface-container-low p-4">
            <div class="overflow-hidden rounded-[20px] bg-surface-container-high">
              <img alt="${label}" class="aspect-[4/4.4] w-full object-cover" src="${imageUrl}" />
            </div>
            <div>
              <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">${category}</p>
              <h3 class="mt-2 text-xl font-semibold text-on-background">${label}</h3>
              <p class="mt-2 text-sm text-gray-400">${description}</p>
            </div>
          </div>
        `;
      }

      return `
        <a class="group block space-y-4 rounded-[24px] border border-white/5 bg-surface-container-low p-4 transition-colors hover:border-primary/30" href="exercise-detail.html?slug=${encodeURIComponent(item.slug)}">
          <div class="overflow-hidden rounded-[20px] bg-surface-container-high">
            <img alt="${label}" class="aspect-[4/4.4] w-full object-cover transition-transform duration-700 group-hover:scale-105" src="${imageUrl}" />
          </div>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">${category}</p>
            <h3 class="mt-2 text-xl font-semibold text-on-background">${label}</h3>
            <p class="mt-2 text-sm text-gray-400">${description}</p>
          </div>
        </a>
      `;
    }).join("");
  }

  function renderExercise(exercise) {
    document.title = `${exercise.title} | THE BIG GYM`;
    dom.breadcrumbName.textContent = exercise.title;
    dom.categoryLink.textContent = exercise.category_name || "Bài tập";
    dom.focusLabel.textContent = exercise.focus_label || `${exercise.category_name || "Kỹ thuật"} • ${exercise.level_name || "Bài tập"}`;
    dom.title.textContent = exercise.title;
    dom.description.textContent = exercise.long_description || exercise.short_description || "Chi tiết bài tập đang được cập nhật.";
    dom.level.textContent = exercise.level_name || "Đang cập nhật";
    dom.equipment.textContent = exercise.equipment || "Đang cập nhật";
    dom.calories.textContent = exercise.calorie_burn_text || "Đang cập nhật";

    renderMedia(exercise);
    renderSteps(exercise.execution_steps || []);

    if (exercise.expert_tip) {
      dom.tipShell.classList.remove("hidden");
      dom.tipText.textContent = exercise.expert_tip;
    } else {
      dom.tipShell.classList.add("hidden");
    }

    if ((exercise.common_mistakes || []).length) {
      dom.mistakesShell.classList.remove("hidden");
      renderTextList(dom.mistakes, exercise.common_mistakes);
    } else {
      dom.mistakesShell.classList.add("hidden");
    }

    if ((exercise.muscle_tags || []).length) {
      dom.muscleTagsShell.classList.remove("hidden");
      dom.muscleTags.innerHTML = exercise.muscle_tags.map((item) => `
        <span class="rounded-full bg-primary/10 px-4 py-2 text-xs uppercase tracking-widest text-primary">${escapeHtml(item)}</span>
      `).join("");
    } else {
      dom.muscleTagsShell.classList.add("hidden");
    }

    if ((exercise.recommended_sets || []).length) {
      dom.recommendationsShell.classList.remove("hidden");
      dom.recommendations.innerHTML = exercise.recommended_sets.map((item) => `
        <li>${escapeHtml(item)}</li>
      `).join("");
    } else {
      dom.recommendationsShell.classList.add("hidden");
    }

    renderRelatedExercises(exercise.related_exercises || []);
  }

  function showError(message) {
    dom.shell.classList.add("hidden");
    dom.errorState.classList.remove("hidden");
    dom.errorMessage.textContent = message;
  }

  async function bootstrap() {
    const slug = getSlugFromQuery();
    if (!slug) {
      showError("Thiếu slug bài tập trên URL. Hãy quay lại thư viện bài tập và chọn lại một bài cụ thể.");
      return;
    }

    try {
      const exercise = await apiFetch(`/exercises/${encodeURIComponent(slug)}`);
      renderExercise(exercise);
    } catch (error) {
      showError(error.message || "Không thể tải chi tiết bài tập");
    }
  }

  bootstrap();
})();
