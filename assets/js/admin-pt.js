(function () {
  const dom = {
    section: document.querySelector('[data-admin-section="pt"]'),
    summaryTrainers: document.getElementById("pt-summary-trainers"),
    summarySlots: document.getElementById("pt-summary-slots"),
    summaryPending: document.getElementById("pt-summary-pending"),
    summaryConfirmed: document.getElementById("pt-summary-confirmed"),
    trainersTable: document.getElementById("pt-trainers-table-body"),
    slotsTable: document.getElementById("pt-slots-table-body"),
    bookingsTable: document.getElementById("pt-bookings-table-body"),
    bookingsFeedback: document.getElementById("pt-bookings-feedback"),
    trainerForm: document.getElementById("pt-trainer-form"),
    trainerReset: document.getElementById("pt-trainer-reset"),
    trainerFeedback: document.getElementById("pt-trainer-feedback"),
    trainerId: document.getElementById("pt-trainer-id"),
    trainerSlug: document.getElementById("pt-trainer-slug"),
    trainerName: document.getElementById("pt-trainer-name"),
    trainerRole: document.getElementById("pt-trainer-role"),
    trainerExpertise: document.getElementById("pt-trainer-expertise"),
    trainerYears: document.getElementById("pt-trainer-years"),
    trainerSort: document.getElementById("pt-trainer-sort"),
    trainerPortrait: document.getElementById("pt-trainer-portrait"),
    trainerPortraitFile: document.getElementById("pt-trainer-portrait-file"),
    trainerPortraitPreview: document.getElementById("pt-trainer-portrait-preview"),
    trainerPortraitClear: document.getElementById("pt-trainer-portrait-clear"),
    trainerHero: document.getElementById("pt-trainer-hero"),
    trainerHeroFile: document.getElementById("pt-trainer-hero-file"),
    trainerHeroPreview: document.getElementById("pt-trainer-hero-preview"),
    trainerHeroClear: document.getElementById("pt-trainer-hero-clear"),
    trainerShortBio: document.getElementById("pt-trainer-short-bio"),
    trainerFullBio: document.getElementById("pt-trainer-full-bio"),
    trainerTags: document.getElementById("pt-trainer-tags"),
    trainerFeatures: document.getElementById("pt-trainer-features"),
    trainerFeatured: document.getElementById("pt-trainer-featured"),
    trainerActive: document.getElementById("pt-trainer-active"),
    slotForm: document.getElementById("pt-slot-form"),
    slotReset: document.getElementById("pt-slot-reset"),
    slotFeedback: document.getElementById("pt-slot-feedback"),
    slotId: document.getElementById("pt-slot-id"),
    slotTrainerId: document.getElementById("pt-slot-trainer-id"),
    slotStart: document.getElementById("pt-slot-start"),
    slotEnd: document.getElementById("pt-slot-end"),
    slotLocation: document.getElementById("pt-slot-location"),
    slotSession: document.getElementById("pt-slot-session"),
    slotCapacity: document.getElementById("pt-slot-capacity"),
    slotActive: document.getElementById("pt-slot-active"),
    slotNote: document.getElementById("pt-slot-note")
  };

  if (!dom.section || !dom.trainerForm || !dom.slotForm) {
    return;
  }

  if (dom.bookingsFeedback && dom.bookingsTable) {
    const bookingsCard = dom.bookingsTable.closest("article");
    const bookingsScroller = dom.bookingsTable.closest(".overflow-x-auto");

    if (bookingsCard && bookingsScroller && dom.bookingsFeedback.parentElement !== bookingsCard) {
      bookingsCard.insertBefore(dom.bookingsFeedback, bookingsScroller);
    }
  }

  const API_BASE_URL = window.BIGGYM_API_BASE_URL || (window.location.protocol === "file:" ? "http://localhost:4000/api" : `${window.location.origin}/api`);
  const state = { summary: {}, trainers: [], slots: [], bookings: [] };

  function getToken() {
    return localStorage.getItem("biggym_token");
  }

  function buildHeaders(includeJson) {
    const headers = includeJson ? { "Content-Type": "application/json" } : {};
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  async function apiFetch(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...buildHeaders(Boolean(options.body)),
        ...(options.headers || {})
      }
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      throw new Error(payload?.message || "Không thể xử lý dữ liệu PT.");
    }

    return payload.data;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function splitLines(value) {
    return String(value || "")
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function formatDateTime(value) {
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

  function toLocalInputValue(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  function setFeedback(element, type, message) {
    if (!element) {
      return;
    }

    if (!message) {
      element.textContent = "";
      element.className = "hidden rounded-2xl border px-4 py-3 text-sm";
      return;
    }

    element.className = "rounded-2xl border px-4 py-3 text-sm";
    element.textContent = message;

    if (type === "error") {
      element.classList.add("border-red-400/20", "bg-red-500/10", "text-red-100");
      return;
    }

    element.classList.add("border-green-400/20", "bg-green-500/10", "text-green-100");
  }

  function getBookingStatusOptions(currentStatus) {
    return ["pending", "confirmed", "completed", "cancelled", "rejected", "no_show"]
      .map((status) => `<option value="${status}" ${currentStatus === status ? "selected" : ""}>${status}</option>`)
      .join("");
  }

  async function uploadTrainerImage(file) {
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`${API_BASE_URL}/admin/pt/upload-image`, {
      method: "POST",
      headers: buildHeaders(false),
      body: formData
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.success) {
      throw new Error(payload.message || "Không thể tải ảnh huấn luyện viên lên.");
    }

    return payload.data.image_url;
  }

  async function uploadTrainerImagesIfNeeded() {
    const portraitFile = dom.trainerPortraitFile?.files?.[0];
    const heroFile = dom.trainerHeroFile?.files?.[0];

    if (portraitFile) {
      dom.trainerPortrait.value = await uploadTrainerImage(portraitFile);
      dom.trainerPortraitFile.value = "";
    }

    if (heroFile) {
      dom.trainerHero.value = await uploadTrainerImage(heroFile);
      dom.trainerHeroFile.value = "";
    }

    syncTrainerImagePreviews();
  }

  function clearPreviewObjectUrl(imageElement) {
    if (!imageElement?.dataset.objectUrl) {
      return;
    }

    URL.revokeObjectURL(imageElement.dataset.objectUrl);
    delete imageElement.dataset.objectUrl;
  }

  function syncImagePreview(urlInput, fileInput, previewElement) {
    if (!previewElement) {
      return;
    }

    clearPreviewObjectUrl(previewElement);

    const selectedFile = fileInput?.files?.[0];
    if (selectedFile) {
      const objectUrl = URL.createObjectURL(selectedFile);
      previewElement.dataset.objectUrl = objectUrl;
      previewElement.src = objectUrl;
      previewElement.classList.remove("hidden");
      return;
    }

    const value = urlInput?.value?.trim();
    if (value) {
      previewElement.src = value;
      previewElement.classList.remove("hidden");
      return;
    }

    previewElement.removeAttribute("src");
    previewElement.classList.add("hidden");
  }

  function syncTrainerImagePreviews() {
    syncImagePreview(dom.trainerPortrait, dom.trainerPortraitFile, dom.trainerPortraitPreview);
    syncImagePreview(dom.trainerHero, dom.trainerHeroFile, dom.trainerHeroPreview);
  }

  function clearTrainerImage(kind) {
    if (kind === "portrait") {
      dom.trainerPortrait.value = "";
      if (dom.trainerPortraitFile) {
        dom.trainerPortraitFile.value = "";
      }
    }

    if (kind === "hero") {
      dom.trainerHero.value = "";
      if (dom.trainerHeroFile) {
        dom.trainerHeroFile.value = "";
      }
    }

    syncTrainerImagePreviews();
  }

  function resetTrainerForm(clearFeedback = true) {
    dom.trainerForm.reset();
    dom.trainerId.value = "";
    dom.trainerFeatured.checked = false;
    dom.trainerActive.checked = true;
    if (dom.trainerPortraitFile) {
      dom.trainerPortraitFile.value = "";
    }
    if (dom.trainerHeroFile) {
      dom.trainerHeroFile.value = "";
    }
    syncTrainerImagePreviews();

    if (clearFeedback) {
      setFeedback(dom.trainerFeedback, "success", "");
    }
  }

  function resetSlotForm(clearFeedback = true) {
    dom.slotForm.reset();
    dom.slotId.value = "";
    dom.slotCapacity.value = "1";
    dom.slotActive.checked = true;

    if (clearFeedback) {
      setFeedback(dom.slotFeedback, "success", "");
    }
  }

  function fillTrainerSelect() {
    dom.slotTrainerId.innerHTML = state.trainers
      .map((trainer) => `<option value="${trainer.id}">${escapeHtml(trainer.full_name)}</option>`)
      .join("");
  }

  function renderSummary() {
    dom.summaryTrainers.textContent = String(state.summary.active_trainers || 0);
    dom.summarySlots.textContent = String(state.summary.active_slots || 0);
    dom.summaryPending.textContent = String(state.summary.pending_bookings || 0);
    dom.summaryConfirmed.textContent = String(state.summary.confirmed_last_30_days || 0);
  }

  function renderTrainersTable() {
    dom.trainersTable.innerHTML = state.trainers.map((trainer) => `
      <tr>
        <td class="px-4 py-4">
          <div class="font-semibold text-on-surface">${escapeHtml(trainer.full_name)}</div>
          <div class="mt-1 text-xs uppercase tracking-[0.16em] text-gray-500">${escapeHtml(trainer.role_title || "PT")}</div>
        </td>
        <td class="px-4 py-4 text-sm text-gray-300">${escapeHtml(trainer.expertise_label || "—")}</td>
        <td class="px-4 py-4 text-sm text-gray-300">${Number(trainer.available_slots_count || 0)}</td>
        <td class="px-4 py-4 text-sm text-gray-300">${escapeHtml(trainer.next_slot_start ? formatDateTime(trainer.next_slot_start) : "—")}</td>
        <td class="px-4 py-4 text-right">
          <button class="rounded-full border border-primary/20 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-primary" data-pt-edit-trainer="${trainer.id}" type="button">Sửa</button>
        </td>
      </tr>
    `).join("");

    dom.trainersTable.querySelectorAll("[data-pt-edit-trainer]").forEach((button) => {
      button.addEventListener("click", () => {
        const trainer = state.trainers.find((item) => item.id === Number(button.dataset.ptEditTrainer));
        if (!trainer) {
          return;
        }

        dom.trainerId.value = String(trainer.id);
        dom.trainerSlug.value = trainer.slug || "";
        dom.trainerName.value = trainer.full_name || "";
        dom.trainerRole.value = trainer.role_title || "";
        dom.trainerExpertise.value = trainer.expertise_label || "";
        dom.trainerYears.value = String(trainer.experience_years || 0);
        dom.trainerSort.value = String(trainer.sort_order || 0);
        dom.trainerPortrait.value = trainer.portrait_image_url || "";
        dom.trainerHero.value = trainer.hero_image_url || "";
        dom.trainerShortBio.value = trainer.short_bio || "";
        dom.trainerFullBio.value = trainer.full_bio || "";
        dom.trainerTags.value = (trainer.specialty_tags || []).join("\n");
        dom.trainerFeatures.value = (trainer.feature_points || []).join("\n");
        dom.trainerFeatured.checked = Boolean(trainer.is_featured);
        dom.trainerActive.checked = trainer.is_active !== false;
        if (dom.trainerPortraitFile) {
          dom.trainerPortraitFile.value = "";
        }
        if (dom.trainerHeroFile) {
          dom.trainerHeroFile.value = "";
        }
        syncTrainerImagePreviews();
        setFeedback(dom.trainerFeedback, "success", "");
        dom.section.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function renderSlotsTable() {
    dom.slotsTable.innerHTML = state.slots.map((slot) => `
      <tr>
        <td class="px-4 py-4 text-sm text-gray-300">${escapeHtml(slot.trainer_name || "—")}</td>
        <td class="px-4 py-4 text-sm text-gray-300">${escapeHtml(formatDateTime(slot.slot_start))}</td>
        <td class="px-4 py-4 text-sm text-gray-300">${escapeHtml(slot.location_label || "THE BIG GYM")}</td>
        <td class="px-4 py-4 text-sm text-gray-300">${Number(slot.remaining_capacity || 0)} / ${Number(slot.capacity || 1)}</td>
        <td class="px-4 py-4 text-right">
          <button class="rounded-full border border-primary/20 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-primary" data-pt-edit-slot="${slot.id}" type="button">Sửa</button>
        </td>
      </tr>
    `).join("");

    dom.slotsTable.querySelectorAll("[data-pt-edit-slot]").forEach((button) => {
      button.addEventListener("click", () => {
        const slot = state.slots.find((item) => item.id === Number(button.dataset.ptEditSlot));
        if (!slot) {
          return;
        }

        dom.slotId.value = String(slot.id);
        dom.slotTrainerId.value = String(slot.trainer_id);
        dom.slotStart.value = toLocalInputValue(slot.slot_start);
        dom.slotEnd.value = toLocalInputValue(slot.slot_end);
        dom.slotLocation.value = slot.location_label || "";
        dom.slotSession.value = slot.session_label || "";
        dom.slotCapacity.value = String(slot.capacity || 1);
        dom.slotActive.checked = slot.is_active !== false;
        dom.slotNote.value = slot.admin_note || "";
        setFeedback(dom.slotFeedback, "success", "");
        dom.section.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function renderBookingsTable() {
    dom.bookingsTable.innerHTML = state.bookings.map((booking) => `
      <tr>
        <td class="px-4 py-4">
          <div class="font-semibold text-on-surface">${escapeHtml(booking.booking_code)}</div>
          <div class="mt-1 text-xs uppercase tracking-[0.16em] text-gray-500">${escapeHtml(formatDateTime(booking.created_at))}</div>
        </td>
        <td class="px-4 py-4 text-sm text-gray-300">
          <div>${escapeHtml(booking.full_name || "—")}</div>
          <div class="mt-1 text-xs text-gray-500">${escapeHtml(booking.phone || booking.email || "—")}</div>
        </td>
        <td class="px-4 py-4 text-sm text-gray-300">
          <div>${escapeHtml(booking.trainer_name || "—")}</div>
          <div class="mt-1 text-xs text-gray-500">${escapeHtml(formatDateTime(booking.slot_start))}</div>
        </td>
        <td class="px-4 py-4 text-sm text-gray-300">${escapeHtml(booking.goal_label || "—")}</td>
        <td class="px-4 py-4">
          <select class="rounded-2xl border border-white/10 bg-surface-container px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-0" data-pt-booking-status="${booking.id}">
            ${getBookingStatusOptions(booking.status)}
          </select>
        </td>
        <td class="px-4 py-4 text-right">
          <button class="rounded-full bg-primary px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-on-primary" data-pt-booking-save="${booking.id}" type="button">Lưu</button>
        </td>
      </tr>
    `).join("");

    dom.bookingsTable.querySelectorAll("[data-pt-booking-save]").forEach((button) => {
      button.addEventListener("click", async () => {
        const bookingId = Number(button.dataset.ptBookingSave);
        const select = dom.bookingsTable.querySelector(`[data-pt-booking-status="${bookingId}"]`);
        if (!select) {
          return;
        }

        button.disabled = true;
        setFeedback(dom.bookingsFeedback, "success", "");

        try {
          await apiFetch(`/admin/pt/bookings/${bookingId}`, {
            method: "PATCH",
            body: JSON.stringify({ status: select.value })
          });
          await loadDashboard();
          setFeedback(dom.bookingsFeedback, "success", "Đã cập nhật trạng thái booking PT.");
        } catch (error) {
          setFeedback(dom.bookingsFeedback, "error", error.message || "Không thể cập nhật trạng thái booking PT.");
        } finally {
          button.disabled = false;
        }
      });
    });
  }

  async function loadDashboard() {
    const data = await apiFetch("/admin/pt/dashboard");
    state.summary = data.summary || {};
    state.trainers = data.trainers || [];
    state.slots = data.slots || [];
    state.bookings = data.bookings || [];
    renderSummary();
    fillTrainerSelect();
    renderTrainersTable();
    renderSlotsTable();
    renderBookingsTable();
  }

  function buildTrainerPayload() {
    return {
      slug: dom.trainerSlug.value.trim(),
      full_name: dom.trainerName.value.trim(),
      role_title: dom.trainerRole.value.trim(),
      expertise_label: dom.trainerExpertise.value.trim(),
      experience_years: Number(dom.trainerYears.value || 0),
      short_bio: dom.trainerShortBio.value.trim() || null,
      full_bio: dom.trainerFullBio.value.trim() || null,
      portrait_image_url: dom.trainerPortrait.value.trim() || null,
      hero_image_url: dom.trainerHero.value.trim() || null,
      specialty_tags: splitLines(dom.trainerTags.value),
      feature_points: splitLines(dom.trainerFeatures.value),
      sort_order: Number(dom.trainerSort.value || 0),
      is_featured: dom.trainerFeatured.checked,
      is_active: dom.trainerActive.checked
    };
  }

  function buildSlotPayload() {
    return {
      trainer_id: Number(dom.slotTrainerId.value),
      slot_start: dom.slotStart.value,
      slot_end: dom.slotEnd.value,
      location_label: dom.slotLocation.value.trim() || null,
      session_label: dom.slotSession.value.trim() || null,
      capacity: Number(dom.slotCapacity.value || 1),
      is_active: dom.slotActive.checked,
      admin_note: dom.slotNote.value.trim() || null
    };
  }

  dom.trainerReset.addEventListener("click", () => resetTrainerForm(true));
  dom.slotReset.addEventListener("click", () => resetSlotForm(true));

  dom.trainerPortrait.addEventListener("input", syncTrainerImagePreviews);
  dom.trainerHero.addEventListener("input", syncTrainerImagePreviews);
  dom.trainerPortraitFile?.addEventListener("change", syncTrainerImagePreviews);
  dom.trainerHeroFile?.addEventListener("change", syncTrainerImagePreviews);
  dom.trainerPortraitClear?.addEventListener("click", () => clearTrainerImage("portrait"));
  dom.trainerHeroClear?.addEventListener("click", () => clearTrainerImage("hero"));

  dom.trainerName.addEventListener("blur", () => {
    if (dom.trainerSlug.value.trim()) {
      return;
    }

    dom.trainerSlug.value = dom.trainerName.value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  });

  dom.trainerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const trainerId = dom.trainerId.value.trim();
      await uploadTrainerImagesIfNeeded();
      await apiFetch(trainerId ? `/admin/pt/trainers/${trainerId}` : "/admin/pt/trainers", {
        method: trainerId ? "PUT" : "POST",
        body: JSON.stringify(buildTrainerPayload())
      });
      await loadDashboard();
      resetTrainerForm(false);
      setFeedback(dom.trainerFeedback, "success", trainerId ? "Đã cập nhật huấn luyện viên PT." : "Đã tạo huấn luyện viên PT.");
    } catch (error) {
      setFeedback(dom.trainerFeedback, "error", error.message || "Không thể lưu huấn luyện viên PT.");
    }
  });

  dom.slotForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const slotId = dom.slotId.value.trim();
      await apiFetch(slotId ? `/admin/pt/slots/${slotId}` : "/admin/pt/slots", {
        method: slotId ? "PUT" : "POST",
        body: JSON.stringify(buildSlotPayload())
      });
      await loadDashboard();
      resetSlotForm(false);
      setFeedback(dom.slotFeedback, "success", slotId ? "Đã cập nhật slot PT." : "Đã tạo slot PT.");
    } catch (error) {
      setFeedback(dom.slotFeedback, "error", error.message || "Không thể lưu slot PT.");
    }
  });

  resetTrainerForm();
  resetSlotForm();
  setFeedback(dom.bookingsFeedback, "success", "");

  loadDashboard().catch((error) => {
    setFeedback(dom.bookingsFeedback, "error", error.message || "Không thể tải dữ liệu PT trong admin.");
  });
})();
