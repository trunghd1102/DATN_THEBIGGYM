(function () {
  const API_BASE_URL = window.BIGGYM_API_BASE_URL || (window.location.protocol === "file:" ? "http://localhost:4000/api" : `${window.location.origin}/api`);
  const slugFromQuery = new URLSearchParams(window.location.search).get("slug");
  const slugFromPath = window.location.pathname.split("/").pop()?.replace(/\.html$/i, "") || "";
  const slug = slugFromQuery || slugFromPath;

  function ensureSummaryHooks() {
    if (document.querySelector("[data-review-stars]")) {
      return;
    }

    const candidate = Array.from(document.querySelectorAll("main .flex.flex-wrap.items-center.gap-4"))
      .find((element) => /đánh giá/i.test(element.textContent) && element.querySelector(".material-symbols-outlined"));

    if (!candidate) {
      return;
    }

    candidate.innerHTML = `
      <div data-review-stars class="flex text-primary"></div>
      <span data-review-average class="text-sm font-semibold text-on-background">Chưa có đánh giá</span>
      <span data-review-count class="text-[11px] uppercase tracking-[0.22em] text-gray-500">0 đánh giá</span>
    `;
  }

  function ensureReviewSectionHooks() {
    if (document.querySelector("[data-review-form]")) {
      return;
    }

    const heading = Array.from(document.querySelectorAll("h2"))
      .find((element) => /đánh giá khách hàng/i.test(element.textContent || ""));

    const shell = heading?.closest(".rounded-\\[28px\\]") || heading?.parentElement?.parentElement;

    if (!shell) {
      return;
    }

    shell.innerHTML = `
      <div class="flex items-end justify-between gap-4">
        <div>
          <p class="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Đánh giá thực tế</p>
          <h2 class="serif text-3xl text-primary">Nhận xét từ khách đã mua</h2>
        </div>
      </div>
      <div class="mt-8 grid gap-6">
        <div data-review-form class="rounded-[24px] border border-white/5 bg-white/[0.02] p-6">
          <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Viết đánh giá</p>
          <p data-review-form-note class="mt-4 text-sm leading-relaxed text-gray-300">Đăng nhập và mua sản phẩm này để gửi đánh giá.</p>
          <div data-review-form-stars class="mt-6 flex flex-wrap gap-3"></div>
          <textarea data-review-comment class="mt-6 min-h-[140px] w-full rounded-2xl border border-white/10 bg-surface-container px-5 py-4 text-sm text-on-surface placeholder:text-gray-500 focus:border-primary focus:ring-0" placeholder="Chia sẻ trải nghiệm thực tế của bạn về sản phẩm này..."></textarea>
          <div class="mt-5 flex flex-col gap-3">
            <button data-review-submit class="inline-flex items-center justify-center rounded-full bg-primary px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-on-primary shadow-lg shadow-primary/10 transition-all hover:shadow-primary/20" type="button">Gửi đánh giá</button>
            <p data-review-form-feedback class="hidden text-sm leading-relaxed"></p>
          </div>
        </div>
        <div data-review-empty class="hidden rounded-[24px] border border-white/5 bg-white/[0.02] p-6 text-sm leading-relaxed text-gray-500">
          Chưa có đánh giá nào cho sản phẩm này. Hãy là người đầu tiên chia sẻ trải nghiệm sau khi mua hàng.
        </div>
        <div data-review-list class="space-y-6"></div>
      </div>
    `;
  }

  function getRefs() {
    return {
      summaryStars: document.querySelector("[data-review-stars]"),
      summaryAverage: document.querySelector("[data-review-average]"),
      summaryCount: document.querySelector("[data-review-count]"),
      formShell: document.querySelector("[data-review-form]"),
      formNote: document.querySelector("[data-review-form-note]"),
      formStars: document.querySelector("[data-review-form-stars]"),
      comment: document.querySelector("[data-review-comment]"),
      submit: document.querySelector("[data-review-submit]"),
      feedback: document.querySelector("[data-review-form-feedback]"),
      list: document.querySelector("[data-review-list]"),
      empty: document.querySelector("[data-review-empty]")
    };
  }

  ensureSummaryHooks();
  ensureReviewSectionHooks();

  const refs = getRefs();

  let selectedRating = 0;
  let currentPermissions = {
    is_logged_in: false,
    has_purchased: false,
    can_review: false
  };
  let currentUserReview = null;

  function getToken() {
    return localStorage.getItem("biggym_token");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDate(value) {
    if (!value) {
      return "Chưa cập nhật";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Chưa cập nhật";
    }

    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(date);
  }

  function buildHeaders(withJson = false) {
    const headers = {};
    const token = getToken();

    if (withJson) {
      headers["Content-Type"] = "application/json";
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  async function apiFetch(url, options = {}) {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.success === false) {
      throw new Error(payload.message || "Không thể tải dữ liệu đánh giá");
    }

    return payload;
  }

  function getStarIconType(ratingValue, index) {
    const starNumber = index + 1;
    if (ratingValue >= starNumber) {
      return "star";
    }

    if (ratingValue >= starNumber - 0.5) {
      return "star_half";
    }

    return "star";
  }

  function renderSummaryStars(ratingValue = 0) {
    if (!refs.summaryStars) return;

    refs.summaryStars.innerHTML = Array.from({ length: 5 }, (_, index) => {
      const filled = ratingValue >= index + 1;
      const half = !filled && ratingValue >= index + 0.5;
      const icon = getStarIconType(ratingValue, index);
      const style = filled || half ? "font-variation-settings:'FILL' 1" : "font-variation-settings:'FILL' 0";
      return `<span class="material-symbols-outlined !text-sm ${filled || half ? "text-primary" : "text-gray-600"}" style="${style}">${icon}</span>`;
    }).join("");
  }

  function renderSummary(summary) {
    const count = Number(summary.review_count || 0);
    const average = summary.average_rating === null || summary.average_rating === undefined
      ? null
      : Number(summary.average_rating);

    renderSummaryStars(average || 0);

    if (refs.summaryAverage) {
      refs.summaryAverage.textContent = count ? average.toFixed(1) : "Chưa có đánh giá";
    }

    if (refs.summaryCount) {
      refs.summaryCount.textContent = count ? `${count} đánh giá` : "0 đánh giá";
    }
  }

  function setFormFeedback(message, type = "info") {
    if (!refs.feedback) return;

    if (!message) {
      refs.feedback.classList.add("hidden");
      refs.feedback.textContent = "";
      return;
    }

    refs.feedback.classList.remove("hidden", "text-primary", "text-error", "text-gray-400");
    refs.feedback.textContent = message;
    refs.feedback.classList.add(type === "error" ? "text-error" : type === "success" ? "text-primary" : "text-gray-400");
  }

  function renderFormStars() {
    if (!refs.formStars) return;

    refs.formStars.innerHTML = Array.from({ length: 5 }, (_, index) => {
      const starValue = index + 1;
      const active = selectedRating >= starValue;
      return `
        <button class="inline-flex h-11 w-11 items-center justify-center rounded-full border ${active ? "border-primary bg-primary/10 text-primary" : "border-white/10 text-gray-500 hover:border-primary/30 hover:text-primary"} transition-colors" data-review-star-value="${starValue}" type="button">
          <span class="material-symbols-outlined" style="font-variation-settings:'FILL' ${active ? 1 : 0}">star</span>
        </button>
      `;
    }).join("");

    refs.formStars.querySelectorAll("[data-review-star-value]").forEach((button) => {
      button.addEventListener("click", () => {
        if (!currentPermissions.can_review) {
          return;
        }
        selectedRating = Number(button.dataset.reviewStarValue);
        renderFormStars();
      });
    });
  }

  function applyFormState() {
    if (!refs.formShell) return;

    const canReview = currentPermissions.can_review;
    const hasExistingReview = Boolean(currentUserReview);

    if (refs.comment) {
      refs.comment.disabled = !canReview;
      refs.comment.value = currentUserReview?.comment || "";
    }

    if (refs.submit) {
      refs.submit.disabled = !canReview;
      refs.submit.textContent = hasExistingReview ? "Cập nhật đánh giá" : "Gửi đánh giá";
    }

    if (refs.formNote) {
      if (!currentPermissions.is_logged_in) {
        refs.formNote.textContent = "Đăng nhập và mua sản phẩm này để gửi đánh giá.";
      } else if (!currentPermissions.has_purchased) {
        refs.formNote.textContent = "Chỉ khách đã mua và thanh toán sản phẩm này mới được đánh giá.";
      } else if (hasExistingReview) {
        refs.formNote.textContent = "Bạn đã đánh giá sản phẩm này. Gửi lại để cập nhật nhận xét của mình.";
      } else {
        refs.formNote.textContent = "Đánh giá của bạn sẽ được ghi nhận ngay sau khi gửi.";
      }
    }

    renderFormStars();
  }

  function renderReviews(reviews = []) {
    if (!refs.list) return;

    if (!reviews.length) {
      refs.list.innerHTML = "";
      refs.empty?.classList.remove("hidden");
      return;
    }

    refs.empty?.classList.add("hidden");
    refs.list.innerHTML = reviews.map((review) => `
      <article class="rounded-[24px] border border-white/5 bg-surface-container-low p-6">
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="h-12 w-12 overflow-hidden rounded-full border border-white/10 bg-surface-container-high">
              ${review.author_avatar_url
                ? `<img alt="${escapeHtml(review.author_name)}" class="h-full w-full object-cover" src="${escapeHtml(review.author_avatar_url)}" />`
                : `<div class="flex h-full w-full items-center justify-center text-sm font-black uppercase text-primary">${escapeHtml(String(review.author_name || "U").trim().charAt(0) || "U")}</div>`}
            </div>
            <div>
              <p class="text-sm font-bold uppercase tracking-[0.14em] text-on-surface">${escapeHtml(review.author_name || "Thành viên BigGym")}</p>
              <div class="mt-2 flex items-center gap-3">
                <div class="flex text-primary">${Array.from({ length: 5 }, (_, index) => `
                  <span class="material-symbols-outlined !text-[14px]" style="font-variation-settings:'FILL' ${review.rating >= index + 1 ? 1 : 0}">star</span>
                `).join("")}</div>
                <span class="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Đã mua hàng</span>
              </div>
            </div>
          </div>
          <span class="text-[10px] uppercase tracking-[0.18em] text-gray-500">${escapeHtml(formatDate(review.updated_at || review.created_at))}</span>
        </div>
        <p class="mt-4 text-sm leading-relaxed text-gray-300">${escapeHtml(review.comment || "Khách hàng đã chấm điểm sản phẩm này.")}</p>
      </article>
    `).join("");
  }

  async function loadReviews() {
    const payload = await apiFetch(`${API_BASE_URL}/products/${encodeURIComponent(slug)}/reviews`, {
      headers: buildHeaders()
    });

    const data = payload.data || {};
    currentPermissions = data.permissions || currentPermissions;
    currentUserReview = data.user_review || null;
    selectedRating = currentUserReview?.rating || 0;

    renderSummary(data.product || {});
    applyFormState();
    renderReviews(data.reviews || []);
  }

  async function submitReview() {
    if (!selectedRating) {
      throw new Error("Vui lòng chọn số sao đánh giá.");
    }

    const payload = await apiFetch(`${API_BASE_URL}/products/${encodeURIComponent(slug)}/reviews`, {
      method: "POST",
      headers: buildHeaders(true),
      body: JSON.stringify({
        rating: selectedRating,
        comment: refs.comment?.value?.trim() || null
      })
    });

    setFormFeedback(payload.message || "Đã gửi đánh giá thành công.", "success");
    await loadReviews();
  }

  if (!slug || !refs.summaryStars || !refs.summaryCount || !refs.list) {
    return;
  }

  refs.submit?.addEventListener("click", async () => {
    if (!currentPermissions.can_review) {
      return;
    }

    refs.submit.disabled = true;
    setFormFeedback("", "info");

    try {
      await submitReview();
    } catch (error) {
      setFormFeedback(error.message || "Không thể gửi đánh giá lúc này.", "error");
    } finally {
      refs.submit.disabled = false;
      applyFormState();
    }
  });

  loadReviews().catch((error) => {
    renderSummary({ average_rating: null, review_count: 0 });
    applyFormState();
    renderReviews([]);
    setFormFeedback(error.message || "Không thể tải đánh giá sản phẩm lúc này.", "error");
  });
})();
