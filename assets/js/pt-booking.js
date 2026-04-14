(function () {
  const dom = {
    heroTrainerCount: document.getElementById("pt-hero-trainer-count"),
    heroSlotCount: document.getElementById("pt-hero-slot-count"),
    heroImage: document.getElementById("pt-hero-image"),
    heroName: document.getElementById("pt-hero-name"),
    heroRole: document.getElementById("pt-hero-role"),
    heroExpertise: document.getElementById("pt-hero-expertise"),
    trainerGrid: document.getElementById("pt-trainer-grid"),
    pageFeedback: document.getElementById("pt-page-feedback"),
    selectedTrainerPanel: document.getElementById("pt-selected-trainer-panel"),
    dateFilters: document.getElementById("pt-date-filters"),
    slotList: document.getElementById("pt-slot-list"),
    slotCountLabel: document.getElementById("pt-slot-count-label"),
    selectedSlotLabel: document.getElementById("pt-selected-slot-label"),
    bookingFeedback: document.getElementById("pt-booking-feedback"),
    bookingForm: document.getElementById("pt-booking-form"),
    fullName: document.getElementById("pt-full-name"),
    phone: document.getElementById("pt-phone"),
    email: document.getElementById("pt-email"),
    goalLabel: document.getElementById("pt-goal-label"),
    fitnessLevel: document.getElementById("pt-fitness-level"),
    preferredFocus: document.getElementById("pt-preferred-focus"),
    note: document.getElementById("pt-note"),
    submitButton: document.getElementById("pt-booking-submit"),
    bookingsContent: document.getElementById("pt-bookings-content")
  };

  if (!dom.trainerGrid || !dom.bookingForm) {
    return;
  }

  const API_BASE_URL = window.BIGGYM_API_BASE_URL || (window.location.protocol === "file:" ? "http://localhost:4000/api" : `${window.location.origin}/api`);
  const state = {
    user: getStoredUser(),
    token: getStoredToken(),
    trainers: [],
    slots: [],
    myBookings: [],
    selectedTrainerId: null,
    selectedSlotId: null,
    activeDateKey: null
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

  function buildHeaders(includeJson) {
    const headers = includeJson ? { "Content-Type": "application/json" } : {};
    if (state.token) {
      headers.Authorization = `Bearer ${state.token}`;
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
      throw new Error(payload?.message || "Không thể xử lý yêu cầu PT.");
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

  function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Không xác định";
    }
    return date.toLocaleString("vi-VN", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function formatDayLabel(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Không xác định";
    }
    return date.toLocaleDateString("vi-VN", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit"
    });
  }

  function formatTimeRange(startValue, endValue) {
    const start = new Date(startValue);
    const end = new Date(endValue);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return "Không xác định";
    }
    return `${start.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`;
  }

  function getDateKey(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function setFeedback(element, type, message) {
    if (!element) {
      return;
    }
    if (!message) {
      element.textContent = "";
      element.className = "hidden rounded-[22px] border px-5 py-4 text-sm";
      return;
    }

    element.className = "rounded-[22px] border px-5 py-4 text-sm";
    element.textContent = message;

    if (type === "error") {
      element.classList.add("border-red-400/20", "bg-red-500/10", "text-red-100");
      return;
    }
    if (type === "success") {
      element.classList.add("border-green-400/20", "bg-green-500/10", "text-green-100");
      return;
    }

    element.classList.add("border-primary/20", "bg-primary/10", "text-gray-100");
  }

  function getStatusBadge(status) {
    const normalized = String(status || "").toLowerCase();
    if (normalized === "confirmed") return '<span class="status-pill bg-sky-500/15 text-sky-100">Đã xác nhận</span>';
    if (normalized === "completed") return '<span class="status-pill bg-green-500/15 text-green-100">Hoàn tất</span>';
    if (normalized === "cancelled") return '<span class="status-pill bg-red-500/15 text-red-100">Đã hủy</span>';
    if (normalized === "rejected") return '<span class="status-pill bg-red-500/15 text-red-100">Từ chối</span>';
    if (normalized === "no_show") return '<span class="status-pill bg-orange-500/15 text-orange-100">Vắng mặt</span>';
    return '<span class="status-pill bg-amber-500/15 text-amber-100">Chờ xác nhận</span>';
  }

  function getSelectedTrainer() {
    return state.trainers.find((trainer) => trainer.id === state.selectedTrainerId) || null;
  }

  function getSelectedSlot() {
    return state.slots.find((slot) => slot.id === state.selectedSlotId) || null;
  }

  function fillFormFromUser() {
    if (!state.user) {
      return;
    }
    if (dom.fullName && !dom.fullName.value) dom.fullName.value = state.user.full_name || "";
    if (dom.email && !dom.email.value) dom.email.value = state.user.email || "";
    if (dom.phone && !dom.phone.value) dom.phone.value = state.user.phone || "";
  }

  function updateHero() {
    const featuredTrainer = getSelectedTrainer() || state.trainers.find((trainer) => trainer.is_featured) || state.trainers[0] || null;
    const totalSlots = state.trainers.reduce((sum, trainer) => sum + Number(trainer.available_slots_count || 0), 0);

    if (dom.heroTrainerCount) dom.heroTrainerCount.textContent = String(state.trainers.length);
    if (dom.heroSlotCount) dom.heroSlotCount.textContent = String(totalSlots);

    if (!featuredTrainer) {
      return;
    }

    if (dom.heroImage) dom.heroImage.src = featuredTrainer.hero_image_url || featuredTrainer.portrait_image_url || "../assets/images/customer-review-1.jpg";
    if (dom.heroName) dom.heroName.textContent = featuredTrainer.full_name;
    if (dom.heroRole) dom.heroRole.textContent = featuredTrainer.role_title || "Huấn luyện viên";
    if (dom.heroExpertise) dom.heroExpertise.textContent = featuredTrainer.expertise_label || "PT Premium";
  }

  function renderTrainerGrid() {
    if (!state.trainers.length) {
      dom.trainerGrid.innerHTML = `
        <div class="panel-surface col-span-full rounded-[30px] px-6 py-10 text-center">
          <p class="text-xs font-bold uppercase tracking-[0.28em] text-gray-500">Không có dữ liệu</p>
          <p class="mt-4 text-sm leading-7 text-gray-300">Chưa có huấn luyện viên PT nào sẵn sàng hiển thị.</p>
        </div>
      `;
      return;
    }

    dom.trainerGrid.innerHTML = state.trainers.map((trainer) => {
      const isActive = trainer.id === state.selectedTrainerId;
      const tags = (trainer.specialty_tags || []).slice(0, 2).map((tag) => `
        <span class="rounded-full border border-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-300">${escapeHtml(tag)}</span>
      `).join("");

      return `
        <article class="${isActive ? "ring-1 ring-primary/40" : ""} overflow-hidden rounded-[30px] border border-white/8 bg-[#161616] shadow-cinematic">
          <div class="relative overflow-hidden">
            <img alt="${escapeHtml(trainer.full_name)}" class="h-[420px] w-full object-cover object-top transition-transform duration-700 hover:scale-[1.04]" src="${trainer.portrait_image_url || "../assets/images/customer-review-1.jpg"}" />
            <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/10 to-transparent p-5">
              <span class="rounded-full border border-primary/20 bg-primary/12 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">${escapeHtml(trainer.expertise_label || "PT")}</span>
            </div>
          </div>
          <div class="space-y-4 px-6 py-6">
            <div class="flex items-start justify-between gap-4">
              <div>
                <h3 class="serif text-3xl text-white">${escapeHtml(trainer.full_name)}</h3>
                <p class="mt-2 text-sm uppercase tracking-[0.16em] text-gray-500">${escapeHtml(trainer.role_title || "Huấn luyện viên")}</p>
              </div>
              <div class="text-right">
                <p class="text-lg font-semibold text-primary">${Number(trainer.experience_years || 0)} năm</p>
                <p class="mt-1 text-[10px] uppercase tracking-[0.2em] text-gray-500">Kinh nghiệm</p>
              </div>
            </div>
            <p class="text-sm leading-7 text-gray-300">${escapeHtml(trainer.short_bio || "Huấn luyện viên đang cập nhật giới thiệu chi tiết.")}</p>
            <div class="flex flex-wrap gap-2">${tags}</div>
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">Slot còn mở</p>
                <p class="mt-2 text-xl font-semibold text-white">${Number(trainer.available_slots_count || 0)}</p>
              </div>
              <button class="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#2f2400] transition-colors hover:bg-[#ffd86d]" data-trainer-select="${trainer.id}" type="button">
                Xem chi tiết & đặt lịch
              </button>
            </div>
          </div>
        </article>
      `;
    }).join("");

    dom.trainerGrid.querySelectorAll("[data-trainer-select]").forEach((button) => {
      button.addEventListener("click", () => selectTrainer(Number(button.dataset.trainerSelect), true));
    });
  }

  function renderSelectedTrainerPanel() {
    const trainer = getSelectedTrainer();

    if (!trainer) {
      dom.selectedTrainerPanel.innerHTML = `
        <div class="rounded-[28px] border border-white/8 bg-white/[0.02] px-5 py-6">
          <p class="text-sm leading-7 text-gray-300">Chọn một huấn luyện viên từ danh sách phía trên để xem chi tiết và slot khả dụng.</p>
        </div>
      `;
      return;
    }

    const featureMarkup = (trainer.feature_points || []).map((item) => `
      <li class="rounded-[20px] border border-white/8 bg-white/[0.02] px-4 py-3 text-sm leading-7 text-gray-300">${escapeHtml(item)}</li>
    `).join("");
    const nextSlotText = trainer.next_slot_start ? formatDateTime(trainer.next_slot_start) : "Chưa có slot mới";

    dom.selectedTrainerPanel.innerHTML = `
      <div class="overflow-hidden rounded-[28px] border border-white/8">
        <img alt="${escapeHtml(trainer.full_name)}" class="h-[360px] w-full object-cover object-top" src="${trainer.hero_image_url || trainer.portrait_image_url || "../assets/images/customer-review-1.jpg"}" />
      </div>
      <div class="space-y-4">
        <div class="flex flex-wrap items-center gap-3">
          <span class="rounded-full border border-primary/20 bg-primary/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">${escapeHtml(trainer.expertise_label || "Huấn luyện viên")}</span>
          <span class="rounded-full border border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-300">${Number(trainer.experience_years || 0)} năm kinh nghiệm</span>
        </div>
        <div>
          <h3 class="serif text-4xl text-white">${escapeHtml(trainer.full_name)}</h3>
          <p class="mt-2 text-sm uppercase tracking-[0.18em] text-gray-500">${escapeHtml(trainer.role_title || "Huấn luyện viên")}</p>
        </div>
        <p class="text-sm leading-7 text-gray-300">${escapeHtml(trainer.full_bio || trainer.short_bio || "Hồ sơ chuyên môn đang được cập nhật.")}</p>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="rounded-[24px] border border-primary/12 bg-primary/6 px-5 py-4">
          <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">Slot gần nhất</p>
          <p class="mt-3 text-sm leading-7 text-white">${escapeHtml(nextSlotText)}</p>
        </div>
        <div class="rounded-[24px] border border-white/8 bg-white/[0.02] px-5 py-4">
          <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">Slot đang mở</p>
          <p class="mt-3 text-2xl font-light tracking-tight text-primary">${Number(trainer.available_slots_count || 0)}</p>
        </div>
      </div>
      <div>
        <p class="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">Điểm mạnh trong buổi coaching</p>
        <ul class="mt-4 grid gap-3">${featureMarkup || '<li class="rounded-[20px] border border-white/8 bg-white/[0.02] px-4 py-3 text-sm leading-7 text-gray-300">HLV đang cập nhật thêm mô tả chi tiết cho từng buổi huấn luyện.</li>'}</ul>
      </div>
    `;
  }

  function getVisibleDates() {
    return Array.from(new Set(state.slots.map((slot) => getDateKey(slot.slot_start)).filter(Boolean))).slice(0, 7);
  }

  function renderDateFilters() {
    const visibleDates = getVisibleDates();

    if (!visibleDates.length) {
      dom.dateFilters.innerHTML = '<p class="text-sm text-gray-500">Chưa có ngày khả dụng.</p>';
      return;
    }

    if (!state.activeDateKey || !visibleDates.includes(state.activeDateKey)) {
      state.activeDateKey = visibleDates[0];
    }

    dom.dateFilters.innerHTML = visibleDates.map((dateKey) => `
      <button class="slot-chip ${state.activeDateKey === dateKey ? "is-active" : ""} rounded-full border border-white/10 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-gray-300 transition-colors hover:border-primary/30 hover:text-primary" data-date-key="${dateKey}" type="button">
        ${escapeHtml(formatDayLabel(dateKey))}
      </button>
    `).join("");

    dom.dateFilters.querySelectorAll("[data-date-key]").forEach((button) => {
      button.addEventListener("click", () => {
        state.activeDateKey = button.dataset.dateKey;
        renderDateFilters();
        renderSlots();
      });
    });
  }

  function syncSelectedSlotLabel() {
    const trainer = getSelectedTrainer();
    const slot = getSelectedSlot();

    if (!trainer || !slot) {
      dom.selectedSlotLabel.textContent = "Chưa chọn khung giờ.";
      return;
    }

    dom.selectedSlotLabel.textContent = `${trainer.full_name} • ${formatDateTime(slot.slot_start)} • ${slot.location_label || "THE BIG GYM"}`;
  }

  function renderSlots() {
    const visibleSlots = state.activeDateKey
      ? state.slots.filter((slot) => getDateKey(slot.slot_start) === state.activeDateKey)
      : state.slots;

    dom.slotCountLabel.textContent = `${visibleSlots.length} slot`;

    if (!visibleSlots.length) {
      dom.slotList.innerHTML = `
        <div class="rounded-[24px] border border-white/8 bg-white/[0.02] px-5 py-6 text-sm leading-7 text-gray-400">
          Huấn luyện viên này hiện chưa còn slot ở ngày bạn chọn. Hãy chuyển ngày khác hoặc chọn HLV khác.
        </div>
      `;
      dom.selectedSlotLabel.textContent = "Chưa chọn khung giờ.";
      return;
    }

    if (!visibleSlots.some((slot) => slot.id === state.selectedSlotId)) {
      state.selectedSlotId = visibleSlots[0].id;
    }

    dom.slotList.innerHTML = visibleSlots.map((slot) => `
      <button class="slot-chip ${slot.id === state.selectedSlotId ? "is-active" : ""} flex items-start justify-between gap-4 rounded-[24px] border border-white/10 bg-white/[0.02] px-4 py-4 text-left transition-colors hover:border-primary/30" data-slot-id="${slot.id}" type="button">
        <div>
          <p class="text-sm font-semibold text-white">${escapeHtml(formatTimeRange(slot.slot_start, slot.slot_end))}</p>
          <p class="mt-1 text-[11px] uppercase tracking-[0.14em] text-gray-500">${escapeHtml(slot.session_label || "PT 1:1")} ${slot.location_label ? `• ${escapeHtml(slot.location_label)}` : ""}</p>
        </div>
        <div class="text-right">
          <p class="text-lg font-semibold text-primary">${Number(slot.remaining_capacity || 0)}</p>
          <p class="mt-1 text-[10px] uppercase tracking-[0.2em] text-gray-500">Còn trống</p>
        </div>
      </button>
    `).join("");

    dom.slotList.querySelectorAll("[data-slot-id]").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedSlotId = Number(button.dataset.slotId);
        renderSlots();
        syncSelectedSlotLabel();
      });
    });

    syncSelectedSlotLabel();
  }

  function renderBookings() {
    if (!state.user || !state.token) {
      dom.bookingsContent.innerHTML = `
        <div class="rounded-[28px] border border-primary/12 bg-primary/5 px-5 py-6">
          <p class="text-sm leading-7 text-gray-200">Đăng nhập để xem lịch sử đặt PT của chính bạn trên thiết bị này.</p>
        </div>
      `;
      return;
    }

    if (!state.myBookings.length) {
      dom.bookingsContent.innerHTML = `
        <div class="rounded-[28px] border border-white/8 bg-white/[0.02] px-5 py-6">
          <p class="text-sm leading-7 text-gray-300">Bạn chưa có lịch PT nào. Hãy chọn HLV và khóa một slot ở khu đặt lịch phía trên.</p>
        </div>
      `;
      return;
    }

    dom.bookingsContent.innerHTML = state.myBookings.map((booking) => `
      <article class="rounded-[28px] border border-white/8 bg-white/[0.02] p-5">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div class="space-y-3">
            <div class="flex flex-wrap items-center gap-3">
              ${getStatusBadge(booking.status)}
              <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">${escapeHtml(booking.booking_code)}</span>
            </div>
            <h3 class="serif text-3xl text-white">${escapeHtml(booking.trainer_name)}</h3>
            <p class="text-sm uppercase tracking-[0.16em] text-gray-500">${escapeHtml(booking.goal_label)}</p>
            <p class="text-sm leading-7 text-gray-300">${escapeHtml(formatDateTime(booking.slot_start))} ${booking.location_label ? `• ${escapeHtml(booking.location_label)}` : ""}</p>
          </div>
          <div class="max-w-xl space-y-2 text-sm leading-7 text-gray-300">
            ${booking.preferred_focus ? `<p><span class="text-gray-500">Trọng tâm:</span> ${escapeHtml(booking.preferred_focus)}</p>` : ""}
            ${booking.note ? `<p><span class="text-gray-500">Ghi chú:</span> ${escapeHtml(booking.note)}</p>` : ""}
            ${booking.admin_note ? `<p><span class="text-gray-500">Phản hồi admin:</span> ${escapeHtml(booking.admin_note)}</p>` : ""}
          </div>
        </div>
      </article>
    `).join("");
  }

  async function loadTrainers() {
    state.trainers = await apiFetch("/pt/trainers");
    updateHero();
    renderTrainerGrid();
  }

  async function loadSlotsForTrainer(trainerId) {
    state.slots = await apiFetch(`/pt/slots?trainer_id=${trainerId}`);
    renderDateFilters();
    renderSlots();
  }

  async function loadMyBookings() {
    if (!state.user || !state.token) {
      renderBookings();
      return;
    }

    try {
      state.myBookings = await apiFetch("/pt/bookings/me");
    } catch (error) {
      state.myBookings = [];
      setFeedback(dom.pageFeedback, "error", error.message || "Không thể tải lịch sử booking PT.");
    }

    renderBookings();
  }

  async function selectTrainer(trainerId, scrollToBooking) {
    state.selectedTrainerId = trainerId;
    state.selectedSlotId = null;
    state.activeDateKey = null;

    renderTrainerGrid();
    renderSelectedTrainerPanel();
    updateHero();
    setFeedback(dom.bookingFeedback, "info", "");

    try {
      await loadSlotsForTrainer(trainerId);
    } catch (error) {
      state.slots = [];
      dom.dateFilters.innerHTML = "";
      dom.slotList.innerHTML = "";
      dom.slotCountLabel.textContent = "0 slot";
      dom.selectedSlotLabel.textContent = "Không thể tải slot.";
      setFeedback(dom.pageFeedback, "error", error.message || "Không thể tải slot của huấn luyện viên.");
    }

    if (scrollToBooking) {
      document.getElementById("pt-booking")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function getInitialTrainerId() {
    const slug = new URLSearchParams(window.location.search).get("trainer");
    if (slug) {
      const match = state.trainers.find((trainer) => trainer.slug === slug);
      if (match) {
        return match.id;
      }
    }
    return (state.trainers.find((trainer) => trainer.is_featured) || state.trainers[0] || {}).id || null;
  }

  async function handleBookingSubmit(event) {
    event.preventDefault();

    const trainer = getSelectedTrainer();
    const slot = getSelectedSlot();

    if (!trainer || !slot) {
      setFeedback(dom.bookingFeedback, "error", "Bạn cần chọn huấn luyện viên và một slot còn trống trước khi gửi.");
      return;
    }

    const payload = {
      trainer_id: trainer.id,
      slot_id: slot.id,
      full_name: dom.fullName.value.trim(),
      email: dom.email.value.trim(),
      phone: dom.phone.value.trim(),
      goal_label: dom.goalLabel.value.trim(),
      fitness_level: dom.fitnessLevel.value || null,
      preferred_focus: dom.preferredFocus.value.trim() || null,
      note: dom.note.value.trim() || null
    };

    if (!payload.goal_label) {
      setFeedback(dom.bookingFeedback, "error", "Vui lòng nhập mục tiêu chính của buổi PT.");
      return;
    }

    dom.submitButton.disabled = true;
    dom.submitButton.classList.add("opacity-60", "cursor-not-allowed");

    try {
      const booking = await apiFetch("/pt/bookings", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      dom.note.value = "";
      await selectTrainer(trainer.id, false);
      await loadMyBookings();
      setFeedback(dom.bookingFeedback, "success", `Đã ghi nhận yêu cầu đặt lịch PT. Mã booking của bạn là ${booking.booking_code}.`);
    } catch (error) {
      setFeedback(dom.bookingFeedback, "error", error.message || "Không thể gửi yêu cầu đặt lịch.");
    } finally {
      dom.submitButton.disabled = false;
      dom.submitButton.classList.remove("opacity-60", "cursor-not-allowed");
    }
  }

  async function bootstrap() {
    fillFormFromUser();
    renderSelectedTrainerPanel();
    renderBookings();

    try {
      await loadTrainers();
      const initialTrainerId = getInitialTrainerId();
      if (initialTrainerId) {
        await selectTrainer(initialTrainerId, false);
      }
      await loadMyBookings();
    } catch (error) {
      setFeedback(dom.pageFeedback, "error", error.message || "Không thể khởi tạo hệ thống đặt lịch PT.");
      dom.trainerGrid.innerHTML = `
        <div class="panel-surface col-span-full rounded-[30px] px-6 py-10 text-center">
          <p class="text-sm leading-7 text-gray-300">Dữ liệu đội ngũ PT hiện chưa sẵn sàng.</p>
        </div>
      `;
    }
  }

  dom.bookingForm.addEventListener("submit", handleBookingSubmit);
  bootstrap();
})();
