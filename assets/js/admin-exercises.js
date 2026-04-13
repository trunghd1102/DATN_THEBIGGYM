(function () {
  const API_BASE_URL = window.BIGGYM_API_BASE_URL || (window.location.protocol === "file:" ? "http://localhost:4000/api" : `${window.location.origin}/api`);
  const DEFAULT_PREVIEW_IMAGE = "../assets/images/exercise/exercises-hero.jpg";

  const dom = {
    section: document.querySelector('[data-admin-section="exercises"]'),
    tableBody: document.getElementById("exercises-table-body"),
    searchInput: document.getElementById("exercises-search-input"),
    activeFilter: document.getElementById("exercises-active-filter"),
    openButton: document.getElementById("open-exercise-modal-button"),
    form: document.getElementById("exercise-form"),
    modal: document.getElementById("exercise-modal"),
    modalTitle: document.getElementById("exercise-modal-title"),
    previewImage: document.getElementById("exercise-image-preview"),
    imageFileInput: document.getElementById("exercise-image-file")
  };

  if (!dom.section || !dom.tableBody || !dom.form || !dom.modal) {
    return;
  }

  const state = {
    exercises: []
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

    const token = getStoredToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  async function apiFetch(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, options);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.success) {
      throw new Error(payload.message || "Không thể tải dữ liệu bài tập");
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

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDateTime(value) {
    if (!value) return "—";

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

  function parseTitleBodyRows(value) {
    return parseDelimitedRows(value, ([title, body]) => {
      if (!title || !body) return null;
      return { title, body };
    });
  }

  function parseNotes(value) {
    return splitTextareaLines(value);
  }

  function parseRelatedExerciseRows(value) {
    return parseDelimitedRows(value, ([slug, title]) => {
      if (!slug && !title) return null;
      return {
        slug: slug || "",
        title: title || ""
      };
    });
  }

  function stringifyTitleBodyRows(items = []) {
    return items.map((item) => `${item.title || ""}|${item.body || ""}`).join("\n");
  }

  function stringifyNotes(items = []) {
    return items.join("\n");
  }

  function stringifyRelatedExerciseRows(items = []) {
    return items.map((item) => `${item.slug || ""}|${item.title || ""}`).join("\n");
  }

  function openModal() {
    dom.modal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
  }

  function closeModal() {
    dom.modal.classList.add("hidden");
    if (!document.querySelector(".modal-shell:not(.hidden)")) {
      document.body.classList.remove("overflow-hidden");
    }
  }

  function setPreviewImage(url) {
    dom.previewImage.src = url || DEFAULT_PREVIEW_IMAGE;
  }

  function resetExerciseForm() {
    dom.form.reset();
    document.getElementById("exercise-id").value = "";
    document.getElementById("exercise-hero-image-url").value = "";
    document.getElementById("exercise-is-active").checked = true;
    document.getElementById("exercise-sort-order").value = "0";
    document.getElementById("exercise-execution-steps").value = "";
    document.getElementById("exercise-common-mistakes").value = "";
    document.getElementById("exercise-muscle-tags").value = "";
    document.getElementById("exercise-recommended-sets").value = "";
    document.getElementById("exercise-related-exercises").value = "";
    dom.imageFileInput.value = "";
    setPreviewImage(DEFAULT_PREVIEW_IMAGE);
    dom.modalTitle.textContent = "Thêm bài tập";
    delete document.getElementById("exercise-slug").dataset.touched;
    delete document.getElementById("exercise-category-slug").dataset.touched;
    delete document.getElementById("exercise-level-slug").dataset.touched;
    hydrateExecutionStepsRepeaterFromTextarea();
    hydrateRelatedExercisesRepeaterFromTextarea();
  }

  function openCreateExerciseModal() {
    resetExerciseForm();
    openModal();
  }

  function openEditExerciseModal(exerciseId) {
    const exercise = state.exercises.find((item) => item.id === Number(exerciseId));
    if (!exercise) return;

    resetExerciseForm();
    dom.modalTitle.textContent = "Cập nhật bài tập";
    document.getElementById("exercise-id").value = exercise.id;
    document.getElementById("exercise-title").value = exercise.title || "";
    document.getElementById("exercise-slug").value = exercise.slug || "";
    document.getElementById("exercise-slug").dataset.touched = "true";
    document.getElementById("exercise-category-name").value = exercise.category_name || "";
    document.getElementById("exercise-category-slug").value = exercise.category_slug || "";
    document.getElementById("exercise-category-slug").dataset.touched = "true";
    document.getElementById("exercise-level-name").value = exercise.level_name || "";
    document.getElementById("exercise-level-slug").value = exercise.level_slug || "";
    document.getElementById("exercise-level-slug").dataset.touched = "true";
    document.getElementById("exercise-focus-label").value = exercise.focus_label || "";
    document.getElementById("exercise-calorie-burn-text").value = exercise.calorie_burn_text || "";
    document.getElementById("exercise-equipment").value = exercise.equipment || "";
    document.getElementById("exercise-primary-muscles").value = exercise.primary_muscles || "";
    document.getElementById("exercise-video-url").value = exercise.video_url || "";
    document.getElementById("exercise-short-description").value = exercise.short_description || "";
    document.getElementById("exercise-long-description").value = exercise.long_description || "";
    document.getElementById("exercise-expert-tip").value = exercise.expert_tip || "";
    document.getElementById("exercise-execution-steps").value = stringifyTitleBodyRows(exercise.execution_steps || []);
    document.getElementById("exercise-common-mistakes").value = stringifyNotes(exercise.common_mistakes || []);
    document.getElementById("exercise-muscle-tags").value = stringifyNotes(exercise.muscle_tags || []);
    document.getElementById("exercise-recommended-sets").value = stringifyNotes(exercise.recommended_sets || []);
    document.getElementById("exercise-related-exercises").value = stringifyRelatedExerciseRows(exercise.related_exercises || []);
    document.getElementById("exercise-is-active").checked = Boolean(exercise.is_active);
    document.getElementById("exercise-sort-order").value = exercise.sort_order ?? 0;
    document.getElementById("exercise-hero-image-url").value = exercise.hero_image || "";
    setPreviewImage(exercise.hero_image || DEFAULT_PREVIEW_IMAGE);
    hydrateExecutionStepsRepeaterFromTextarea();
    hydrateRelatedExercisesRepeaterFromTextarea();
    openModal();
  }

  async function uploadExerciseImageIfNeeded() {
    const file = dom.imageFileInput.files?.[0];

    if (!file) {
      return document.getElementById("exercise-hero-image-url").value.trim() || null;
    }

    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`${API_BASE_URL}/admin/exercises/upload-image`, {
      method: "POST",
      headers: buildHeaders(),
      body: formData
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.success) {
      throw new Error(payload.message || "Không thể tải ảnh bài tập lên");
    }

    return payload.data.image_url;
  }

  function renderExecutionStepRow(values = {}) {
    return `
      <div class="rounded-2xl border border-white/10 bg-surface-container p-3" data-exercise-step-row>
        <div class="grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_auto]">
          <input data-exercise-step-field="title" class="w-full rounded-2xl border border-white/10 bg-surface-container-high px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-0" placeholder="Tiêu đề bước" type="text" value="${escapeHtml(values.title || "")}" />
          <input data-exercise-step-field="body" class="w-full rounded-2xl border border-white/10 bg-surface-container-high px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-0" placeholder="Nội dung chi tiết" type="text" value="${escapeHtml(values.body || "")}" />
          <button class="rounded-full border border-red-400/20 px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-red-200" data-exercise-repeater-remove="execution_steps" type="button">Xóa</button>
        </div>
      </div>
    `;
  }

  function collectExecutionStepRows() {
    const container = document.getElementById("exercise-execution-steps-repeater");
    if (!container) return [];

    return Array.from(container.querySelectorAll("[data-exercise-step-row]")).map((row) => {
      const title = row.querySelector('[data-exercise-step-field="title"]')?.value?.trim() || "";
      const body = row.querySelector('[data-exercise-step-field="body"]')?.value?.trim() || "";
      return title && body ? { title, body } : null;
    }).filter(Boolean);
  }

  function syncExecutionStepsToTextarea() {
    const textarea = document.getElementById("exercise-execution-steps");
    if (!textarea) return;
    textarea.value = stringifyTitleBodyRows(collectExecutionStepRows());
  }

  function hydrateExecutionStepsRepeaterFromTextarea() {
    const container = document.getElementById("exercise-execution-steps-repeater");
    const textarea = document.getElementById("exercise-execution-steps");
    if (!container || !textarea) return;

    const rows = parseTitleBodyRows(textarea.value);
    const seed = rows.length ? rows : [{ title: "", body: "" }];
    container.innerHTML = seed.map(renderExecutionStepRow).join("");
  }

  function appendExecutionStepRow() {
    const container = document.getElementById("exercise-execution-steps-repeater");
    if (!container) return;
    container.insertAdjacentHTML("beforeend", renderExecutionStepRow());
  }

  function renderRelatedExerciseRow(values = {}) {
    return `
      <div class="rounded-2xl border border-white/10 bg-surface-container p-3" data-related-exercise-row>
        <div class="grid gap-3 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto]">
          <input data-related-exercise-field="slug" class="w-full rounded-2xl border border-white/10 bg-surface-container-high px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-0" placeholder="Slug bài tập" type="text" value="${escapeHtml(values.slug || "")}" />
          <input data-related-exercise-field="title" class="w-full rounded-2xl border border-white/10 bg-surface-container-high px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-0" placeholder="Tên hiển thị" type="text" value="${escapeHtml(values.title || "")}" />
          <button class="rounded-full border border-red-400/20 px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-red-200" data-exercise-repeater-remove="related_exercises" type="button">Xóa</button>
        </div>
      </div>
    `;
  }

  function collectRelatedExerciseRows() {
    const container = document.getElementById("exercise-related-exercises-repeater");
    if (!container) return [];

    return Array.from(container.querySelectorAll("[data-related-exercise-row]")).map((row) => {
      const slug = row.querySelector('[data-related-exercise-field="slug"]')?.value?.trim() || "";
      const title = row.querySelector('[data-related-exercise-field="title"]')?.value?.trim() || "";
      return slug || title ? { slug, title } : null;
    }).filter(Boolean);
  }

  function syncRelatedExercisesToTextarea() {
    const textarea = document.getElementById("exercise-related-exercises");
    if (!textarea) return;
    textarea.value = stringifyRelatedExerciseRows(collectRelatedExerciseRows());
  }

  function hydrateRelatedExercisesRepeaterFromTextarea() {
    const container = document.getElementById("exercise-related-exercises-repeater");
    const textarea = document.getElementById("exercise-related-exercises");
    if (!container || !textarea) return;

    const rows = parseRelatedExerciseRows(textarea.value);
    const seed = rows.length ? rows : [{ slug: "", title: "" }];
    container.innerHTML = seed.map(renderRelatedExerciseRow).join("");
  }

  function appendRelatedExerciseRow() {
    const container = document.getElementById("exercise-related-exercises-repeater");
    if (!container) return;
    container.insertAdjacentHTML("beforeend", renderRelatedExerciseRow());
  }

  function buildExercisePayload(imageUrl) {
    const titleInput = document.getElementById("exercise-title");
    const slugInput = document.getElementById("exercise-slug");
    const categoryNameInput = document.getElementById("exercise-category-name");
    const categorySlugInput = document.getElementById("exercise-category-slug");
    const levelNameInput = document.getElementById("exercise-level-name");
    const levelSlugInput = document.getElementById("exercise-level-slug");

    const title = titleInput.value.trim();
    const slug = slugInput.value.trim() || slugify(title);
    const categoryName = categoryNameInput.value.trim();
    const categorySlug = categorySlugInput.value.trim() || slugify(categoryName);
    const levelName = levelNameInput.value.trim();
    const levelSlug = levelSlugInput.value.trim() || slugify(levelName);

    slugInput.value = slug;
    categorySlugInput.value = categorySlug;
    levelSlugInput.value = levelSlug;

    return {
      title,
      slug,
      category_name: categoryName,
      category_slug: categorySlug,
      level_name: levelName,
      level_slug: levelSlug,
      focus_label: document.getElementById("exercise-focus-label").value.trim() || null,
      equipment: document.getElementById("exercise-equipment").value.trim() || null,
      primary_muscles: document.getElementById("exercise-primary-muscles").value.trim() || null,
      calorie_burn_text: document.getElementById("exercise-calorie-burn-text").value.trim() || null,
      hero_image: imageUrl,
      short_description: document.getElementById("exercise-short-description").value.trim() || null,
      long_description: document.getElementById("exercise-long-description").value.trim() || null,
      video_url: document.getElementById("exercise-video-url").value.trim() || null,
      expert_tip: document.getElementById("exercise-expert-tip").value.trim() || null,
      execution_steps: collectExecutionStepRows(),
      common_mistakes: parseNotes(document.getElementById("exercise-common-mistakes").value),
      muscle_tags: parseNotes(document.getElementById("exercise-muscle-tags").value),
      recommended_sets: parseNotes(document.getElementById("exercise-recommended-sets").value),
      related_exercises: collectRelatedExerciseRows(),
      is_active: document.getElementById("exercise-is-active").checked,
      sort_order: Number(document.getElementById("exercise-sort-order").value || 0)
    };
  }

  async function saveExercise(event) {
    event.preventDefault();

    const exerciseId = document.getElementById("exercise-id").value.trim();
    const imageUrl = await uploadExerciseImageIfNeeded();
    const payload = buildExercisePayload(imageUrl);
    const endpoint = exerciseId ? `/exercises/${exerciseId}` : "/exercises";
    const method = exerciseId ? "PUT" : "POST";

    await apiFetch(endpoint, {
      method,
      headers: buildHeaders(true),
      body: JSON.stringify(payload)
    });

    document.getElementById("exercise-hero-image-url").value = imageUrl || "";
    closeModal();
    showToast(exerciseId ? "Đã cập nhật bài tập" : "Đã tạo bài tập mới", "success");
    await loadExercises();
  }

  async function deleteExercise(exerciseId) {
    const exercise = state.exercises.find((item) => item.id === Number(exerciseId));
    if (!exercise) return;

    if (!window.confirm(`Xóa bài tập "${exercise.title}"?`)) {
      return;
    }

    await apiFetch(`/exercises/${exerciseId}`, {
      method: "DELETE",
      headers: buildHeaders()
    });

    showToast("Đã xóa bài tập", "success");
    await loadExercises();
  }

  async function loadExercises() {
    const params = new URLSearchParams();
    const search = dom.searchInput.value.trim();
    const active = dom.activeFilter.value;

    if (search) params.set("search", search);
    if (active) params.set("active", active);

    const exercises = await apiFetch(`/admin/exercises?${params.toString()}`, {
      headers: buildHeaders()
    });

    state.exercises = exercises;
    renderExercises();
  }

  function renderExercises() {
    if (!state.exercises.length) {
      dom.tableBody.innerHTML = `
        <tr>
          <td class="px-6 py-8 text-center text-sm text-gray-500" colspan="6">Chưa có bài tập phù hợp.</td>
        </tr>
      `;
      return;
    }

    dom.tableBody.innerHTML = state.exercises.map((exercise) => `
      <tr class="border-b border-white/5">
        <td class="px-6 py-5">
          <div class="flex items-center gap-4">
            <img alt="${escapeHtml(exercise.title)}" class="h-14 w-14 rounded-2xl object-cover" src="${escapeHtml(exercise.hero_image || DEFAULT_PREVIEW_IMAGE)}" />
            <div>
              <p class="font-semibold text-on-surface">${escapeHtml(exercise.title)}</p>
              <p class="mt-1 text-xs text-gray-500">${escapeHtml(exercise.slug)}</p>
            </div>
          </div>
        </td>
        <td class="px-6 py-5 text-sm text-gray-300">
          <p>${escapeHtml(exercise.category_name || "—")}</p>
          <p class="mt-1 text-xs text-gray-500">${escapeHtml(exercise.focus_label || exercise.primary_muscles || "—")}</p>
        </td>
        <td class="px-6 py-5 text-sm text-gray-300">${escapeHtml(exercise.level_name || "—")}</td>
        <td class="px-6 py-5">
          ${exercise.is_active
            ? '<span class="status-pill bg-green-500/15 text-green-200">ACTIVE</span>'
            : '<span class="status-pill bg-white/10 text-gray-300">INACTIVE</span>'}
        </td>
        <td class="px-6 py-5 text-sm text-gray-400">${formatDateTime(exercise.updated_at || exercise.created_at)}</td>
        <td class="px-6 py-5 text-right">
          <div class="inline-flex gap-2">
            <button class="rounded-full border border-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-gray-200 transition hover:border-primary/30 hover:text-primary" data-edit-exercise="${exercise.id}" type="button">Sửa</button>
            <button class="rounded-full border border-red-400/20 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-red-200 transition hover:bg-red-500/10" data-delete-exercise="${exercise.id}" type="button">Xóa</button>
          </div>
        </td>
      </tr>
    `).join("");
  }

  function wireControls() {
    const exerciseSectionButton = document.querySelector('[data-section-trigger="exercises"]');

    dom.openButton.addEventListener("click", openCreateExerciseModal);

    exerciseSectionButton?.addEventListener("click", () => {
      requestAnimationFrame(() => {
        const headerTitle = document.getElementById("admin-header-title");
        if (headerTitle) {
          headerTitle.textContent = "Quản lý bài tập";
        }
      });
    });

    dom.searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        loadExercises().catch((error) => showToast(error.message || "Không thể tải bài tập", "error"));
      }
    });
    dom.activeFilter.addEventListener("change", () => {
      loadExercises().catch((error) => showToast(error.message || "Không thể tải bài tập", "error"));
    });

    document.body.addEventListener("click", (event) => {
      const addStepButton = event.target.closest('[data-exercise-repeater-add="execution_steps"]');
      const removeStepButton = event.target.closest('[data-exercise-repeater-remove="execution_steps"]');
      const addRelatedButton = event.target.closest('[data-exercise-repeater-add="related_exercises"]');
      const removeRelatedButton = event.target.closest('[data-exercise-repeater-remove="related_exercises"]');

      if (addStepButton) {
        appendExecutionStepRow();
        syncExecutionStepsToTextarea();
      }

      if (removeStepButton) {
        const row = removeStepButton.closest("[data-exercise-step-row]");
        if (!row) return;
        row.remove();
        const container = document.getElementById("exercise-execution-steps-repeater");
        if (container && !container.querySelector("[data-exercise-step-row]")) {
          appendExecutionStepRow();
        }
        syncExecutionStepsToTextarea();
      }

      if (addRelatedButton) {
        appendRelatedExerciseRow();
        syncRelatedExercisesToTextarea();
      }

      if (removeRelatedButton) {
        const row = removeRelatedButton.closest("[data-related-exercise-row]");
        if (!row) return;
        row.remove();
        const container = document.getElementById("exercise-related-exercises-repeater");
        if (container && !container.querySelector("[data-related-exercise-row]")) {
          appendRelatedExerciseRow();
        }
        syncRelatedExercisesToTextarea();
      }
    });

    document.getElementById("exercise-execution-steps-repeater").addEventListener("input", () => {
      syncExecutionStepsToTextarea();
    });
    document.getElementById("exercise-related-exercises-repeater").addEventListener("input", () => {
      syncRelatedExercisesToTextarea();
    });

    document.getElementById("exercise-title").addEventListener("input", (event) => {
      const slugInput = document.getElementById("exercise-slug");
      if (!slugInput.dataset.touched) {
        slugInput.value = slugify(event.target.value);
      }
    });
    document.getElementById("exercise-slug").addEventListener("input", () => {
      document.getElementById("exercise-slug").dataset.touched = "true";
    });

    document.getElementById("exercise-category-name").addEventListener("input", (event) => {
      const slugInput = document.getElementById("exercise-category-slug");
      if (!slugInput.dataset.touched) {
        slugInput.value = slugify(event.target.value);
      }
    });
    document.getElementById("exercise-category-slug").addEventListener("input", () => {
      document.getElementById("exercise-category-slug").dataset.touched = "true";
    });

    document.getElementById("exercise-level-name").addEventListener("input", (event) => {
      const slugInput = document.getElementById("exercise-level-slug");
      if (!slugInput.dataset.touched) {
        slugInput.value = slugify(event.target.value);
      }
    });
    document.getElementById("exercise-level-slug").addEventListener("input", () => {
      document.getElementById("exercise-level-slug").dataset.touched = "true";
    });

    dom.imageFileInput.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      setPreviewImage(URL.createObjectURL(file));
    });

    dom.form.addEventListener("submit", (event) => {
      saveExercise(event).catch((error) => showToast(error.message || "Không thể lưu bài tập", "error"));
    });

    document.body.addEventListener("click", (event) => {
      const editButton = event.target.closest("[data-edit-exercise]");
      const deleteButton = event.target.closest("[data-delete-exercise]");

      if (editButton) {
        openEditExerciseModal(editButton.dataset.editExercise);
      }

      if (deleteButton) {
        deleteExercise(deleteButton.dataset.deleteExercise).catch((error) => {
          showToast(error.message || "Không thể xóa bài tập", "error");
        });
      }
    });
  }

  async function bootstrap() {
    const user = getStoredUser();
    if (!user || user.role !== "admin" || !getStoredToken()) {
      return;
    }

    wireControls();

    try {
      await loadExercises();
    } catch (error) {
      showToast(error.message || "Không thể tải danh sách bài tập", "error");
    }
  }

  bootstrap();
})();
