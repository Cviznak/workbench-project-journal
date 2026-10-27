/* ============================================================
   Workbench Project Journal - Projects, Gifts & Collaborations
   ============================================================ */

/* ============================================================
   🎁 Handmade Gift Preparation Hub & Maker Tag Studio Suite
   ============================================================ */

const revealedSecretProjectIds = new Set();
let giftActiveFilter = "all";
let giftCalcUnit = "in";

const GIFT_OCCASIONS = {
  birthday: { label: "Birthday", emoji: "🎂" },
  holiday: { label: "Holiday / Christmas", emoji: "🎄" },
  wedding: { label: "Wedding", emoji: "💍" },
  anniversary: { label: "Anniversary", emoji: "🥂" },
  housewarming: { label: "Housewarming", emoji: "🏡" },
  baby: { label: "Baby Shower", emoji: "🍼" },
  graduation: { label: "Graduation", emoji: "🎓" },
  thankyou: { label: "Thank You", emoji: "💌" },
  valentines: { label: "Valentine’s Day", emoji: "❤️" },
  retirement: { label: "Retirement", emoji: "🌅" },
  justbecause: { label: "Just Because", emoji: "✨" }
};

const GIFT_CARE_PRESETS = {
  wood: "Hand wash only with warm water and mild soap. Never soak or put in a dishwasher. Towel dry immediately and stand upright. Apply food-safe mineral oil or beeswax conditioner every 4-8 weeks to keep wood nourished and moisture-resistant.",
  textile: "Hand wash gently in cool water with mild wool-safe detergent. Do not wring or twist. Roll in a clean dry towel to press out excess moisture, then reshape and lay flat on a drying rack. Store folded in a breathable bag with cedar or lavender.",
  knife: "Hand wash blade immediately after each use and dry thoroughly with a soft cloth. Never place in a dishwasher or leave wet in a sink. Coat lightly with food-grade camellia or mineral oil before storing in a dry block or sheath. Hone periodically with a ceramic rod.",
  ceramic: "Finished with non-toxic, food-safe glaze. Gentle hand-washing recommended to preserve luster and rim edges. Microwave-safe unless accented with metallic gold or luster overglazes. Avoid thermal shock (e.g. cold water into a piping hot vessel).",
  jewelry: "Store in an airtight pouch or soft cloth box away from humidity. Remove before swimming, showering, or applying perfume and lotion. Clean gently with a microfiber polishing cloth. Avoid ultrasonic cleaners for soft gemstones, pearls, or resin inlay.",
  leather: "Keep away from prolonged direct sunlight and heat sources. Wipe clean with a slightly damp cloth if needed. Nourish 2-3 times per year with natural beeswax or neatsfoot oil leather balm. If wet, let dry naturally at room temperature.",
  general: "Handmade with care and attention to detail. Handle gently and store away from extreme temperature or moisture fluctuations to preserve its beauty and function for decades to come."
};

function formatGiftOccasionLabel(key) {
  return GIFT_OCCASIONS[key]?.label || key || "Special Occasion";
}

function formatGiftCountdown(deadline) {
  if (!deadline) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const cleanDateStr = String(deadline).split("T")[0];
  const target = new Date(`${cleanDateStr}T12:00:00`);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - now.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return { text: `${Math.abs(diffDays)}d overdue`, className: "is-overdue", isOverdue: true };
  }
  if (diffDays === 0) {
    return { text: "Gift today! 🎉", className: "is-today", isToday: true };
  }
  if (diffDays === 1) {
    return { text: "Tomorrow! ⏳", className: "is-urgent", isUrgent: true };
  }
  if (diffDays <= 7) {
    return { text: `${diffDays} days left ⏳`, className: "is-urgent", isUrgent: true };
  }
  return { text: `${diffDays} days left`, className: "", isNormal: true };
}

function renderProjectDetailGiftBanner(project) {
  const cd = project.giftDeadline ? formatGiftCountdown(project.giftDeadline) : null;
  const occasionLbl = formatGiftOccasionLabel(project.giftOccasion);
  return `
    <div class="detail-gift-banner">
      <div class="detail-gift-header">
        <div class="detail-gift-title">
          <span>🎁</span> Handmade Gift for ${escapeHTML(project.giftRecipient || "Special Someone")}
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          ${cd ? `<span class="gift-countdown-pill ${cd.className}" title="Handover event deadline">${cd.text}</span>` : ""}
          <select class="kanban-shift-select" data-action="set-gift-status" data-project="${project.id}" title="Update gift preparation status" style="font-size:11.5px;padding:3px 8px">
            <option value="planning" ${project.giftStatus === "planning" ? "selected" : ""}>📋 Planning &amp; Sourcing</option>
            <option value="making" ${project.giftStatus === "making" ? "selected" : ""}>🛠️ In the Workshop (Making)</option>
            <option value="wrapped" ${project.giftStatus === "wrapped" ? "selected" : ""}>🎀 Wrapped &amp; Tagged</option>
            <option value="delivered" ${project.giftStatus === "delivered" ? "selected" : ""}>🎉 Delivered / Gifted</option>
          </select>
        </div>
      </div>
      <div class="detail-gift-meta-grid">
        <div class="detail-gift-meta-item">
          <div class="meta-label">Occasion</div>
          <div class="meta-value">${escapeHTML(occasionLbl)}</div>
        </div>
        <div class="detail-gift-meta-item">
          <div class="meta-label">Handover Date</div>
          <div class="meta-value">${project.giftDeadline ? formatDate(project.giftDeadline) : "Not scheduled"}</div>
        </div>
        <div class="detail-gift-meta-item">
          <div class="meta-label">Box Dimensions</div>
          <div class="meta-value">${project.giftBoxLength && project.giftBoxWidth ? `${project.giftBoxLength}″ × ${project.giftBoxWidth}″ × ${project.giftBoxHeight || 0}″` : "Custom"}</div>
        </div>
        <div class="detail-gift-meta-item">
          <div class="meta-label">Privacy Shield</div>
          <div class="meta-value">${project.giftSecret ? "🛡️ Surprise Shielded" : "Public in Studio"}</div>
        </div>
      </div>
      ${project.giftCareNotes ? `
        <div class="detail-gift-care-box">
          <strong>🏷️ Care &amp; Preservation Advice:</strong> ${escapeHTML(project.giftCareNotes)}
        </div>
      ` : ""}
      <div class="detail-gift-actions">
        <button type="button" class="button button-small button-primary" data-action="open-gift-tag" data-id="${project.id}">
          🏷️ Print Gift Tag / Care Card
        </button>
        <button type="button" class="button button-small button-outline" data-action="open-gift-calc" data-id="${project.id}">
          📐 Box &amp; Wrapping Calc
        </button>
        <button type="button" class="button button-small button-quiet" data-action="toggle-project-gift-secret" data-id="${project.id}">
          ${project.giftSecret ? "👁️ Disable Privacy Shield" : "🛡️ Enable Surprise Shield"}
        </button>
      </div>
    </div>
  `;
}

function openGiftHubDialog(defaultTab = "tracker") {
  const dialog = $("#gift-hub-dialog");
  if (!dialog) return;
  setGiftHubTab(defaultTab);
  renderGiftHub();
  dialog.showModal();
}

function setGiftHubTab(tabKey) {
  $$(".gift-hub-tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.tab === tabKey);
  });
  $$(".gift-hub-tab-panel").forEach(panel => {
    panel.style.display = panel.id === `gift-tab-${tabKey}` ? "block" : "none";
  });
  if (tabKey === "calc") {
    updateGiftWrappingCalc();
  }
}

function renderGiftHub() {
  const gifts = state.projects.filter(p => p.isGift);
  const countEl = $("#gift-tracker-count");
  if (countEl) countEl.textContent = gifts.length;

  const makingCount = gifts.filter(p => p.giftStatus === "making").length;
  const wrappedCount = gifts.filter(p => p.giftStatus === "wrapped").length;
  const deliveredCount = gifts.filter(p => p.giftStatus === "delivered").length;

  if ($("#gift-stat-total")) $("#gift-stat-total").textContent = gifts.length;
  if ($("#gift-stat-making")) $("#gift-stat-making").textContent = makingCount;
  if ($("#gift-stat-wrapped")) $("#gift-stat-wrapped").textContent = wrappedCount;
  if ($("#gift-stat-delivered")) $("#gift-stat-delivered").textContent = deliveredCount;

  renderGiftProjectsList();
  updateGiftWrappingCalc();
}

function renderGiftProjectsList() {
  const listEl = $("#gift-project-list");
  if (!listEl) return;

  const allGifts = state.projects.filter(p => p.isGift);
  let filtered = [...allGifts];

  if (giftActiveFilter === "upcoming") {
    filtered = filtered.filter(p => p.giftDeadline && p.giftStatus !== "delivered")
      .sort((a, b) => a.giftDeadline.localeCompare(b.giftDeadline));
  } else if (giftActiveFilter === "making") {
    filtered = filtered.filter(p => p.giftStatus === "making");
  } else if (giftActiveFilter === "wrapped") {
    filtered = filtered.filter(p => p.giftStatus === "wrapped");
  } else if (giftActiveFilter === "delivered") {
    filtered = filtered.filter(p => p.giftStatus === "delivered");
  } else {
    // "all": sort by deadline if available, then by updated
    filtered.sort((a, b) => {
      if (a.giftDeadline && b.giftDeadline) return a.giftDeadline.localeCompare(b.giftDeadline);
      if (a.giftDeadline) return -1;
      if (b.giftDeadline) return 1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
  }

  $$(".gift-filter-pill").forEach(pill => {
    pill.classList.toggle("active", pill.dataset.filter === giftActiveFilter);
  });

  if (!filtered.length) {
    listEl.innerHTML = `
      <div class="empty-state" style="padding:24px 16px">
        <div class="empty-state-mark">🎁</div>
        <h3>${allGifts.length ? "No gifts match this filter" : "No handmade gifts yet"}</h3>
        <p>${allGifts.length ? "Try switching filters to view your other gift builds." : "Start a project as a handmade gift to track deadlines, calculate wrapping paper, and print custom tags."}</p>
        <button type="button" class="button button-primary" data-action="new-gift-project">＋ Start a Gift Build</button>
      </div>
    `;
    return;
  }

  listEl.innerHTML = filtered.map(p => {
    const cd = p.giftDeadline ? formatGiftCountdown(p.giftDeadline) : null;
    const occ = formatGiftOccasionLabel(p.giftOccasion);
    return `
      <article class="gift-hub-card">
        <div class="gift-hub-card-header">
          <div class="gift-hub-card-main">
            <h4 class="gift-hub-card-title">
              <span>🎁</span> ${escapeHTML(p.title)}
              <span class="gift-badge" style="font-size:10px">For ${escapeHTML(p.giftRecipient || "Someone")}</span>
            </h4>
            <div class="gift-hub-card-sub">
              Occasion: <strong>${escapeHTML(occ)}</strong>${p.giftDeadline ? ` · Target Date: <strong>${formatDate(p.giftDeadline)}</strong>` : ""}
            </div>
          </div>
          <div class="gift-hub-card-badges">
            ${cd ? `<span class="gift-countdown-pill ${cd.className}" title="Gift handover countdown">${cd.text}</span>` : ""}
            <select class="kanban-shift-select" data-action="set-gift-status" data-project="${p.id}" title="Change gift status" style="font-size:11.5px">
              <option value="planning" ${p.giftStatus === "planning" ? "selected" : ""}>📋 Planning</option>
              <option value="making" ${p.giftStatus === "making" ? "selected" : ""}>🛠️ In Progress</option>
              <option value="wrapped" ${p.giftStatus === "wrapped" ? "selected" : ""}>🎀 Wrapped &amp; Tagged</option>
              <option value="delivered" ${p.giftStatus === "delivered" ? "selected" : ""}>🎉 Delivered</option>
            </select>
          </div>
        </div>

        ${p.giftCareNotes ? `
          <div style="font-size:11px;color:var(--muted);background:var(--surface-2, rgba(0,0,0,0.02));padding:4px 8px;border-radius:4px">
            <strong>Care:</strong> ${escapeHTML(p.giftCareNotes)}
          </div>
        ` : ""}

        <div class="gift-hub-card-actions">
          <div style="font-size:11px;color:var(--muted)">
            ${p.giftBoxLength && p.giftBoxWidth ? `Box: ${p.giftBoxLength}×${p.giftBoxWidth}×${p.giftBoxHeight || 0} in` : "Box size unassigned"}
          </div>
          <div class="gift-hub-card-btns">
            <button type="button" class="button button-small button-outline" data-action="open-gift-tag" data-id="${p.id}">
              🏷️ Tag &amp; Certificate
            </button>
            <button type="button" class="button button-small button-outline" data-action="open-gift-calc" data-id="${p.id}">
              📐 Wrapping Calc
            </button>
            <button type="button" class="button button-small button-quiet" data-action="open-project" data-id="${p.id}">
              View Project →
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function updateGiftWrappingCalc() {
  const lInput = $("#gift-calc-l");
  const wInput = $("#gift-calc-w");
  const hInput = $("#gift-calc-h");
  const oInput = $("#gift-calc-overlap");
  const bowSelect = $("#gift-calc-bow");

  if (!lInput || !wInput || !hInput) return;

  const isCm = giftCalcUnit === "cm";
  const unitLabel = isCm ? "cm" : "in";

  let L = Math.max(0.1, Number(lInput.value) || 8);
  let W = Math.max(0.1, Number(wInput.value) || 6);
  let H = Math.max(0.1, Number(hInput.value) || 4);
  const overlap = Math.max(0.2, Number(oInput?.value) || (isCm ? 3.8 : 1.5));
  const bowStyle = bowSelect?.value || "standard";

  // Standard flat wrapping paper cut formulas:
  // Paper Width = L + 2H
  // Paper Length = 2W + 2H + overlap
  const stdWidth = L + (2 * H);
  const stdLength = (2 * W) + (2 * H) + overlap;
  const stdArea = stdWidth * stdLength;

  // Diagonal 45-degree wrapping paper cut formula:
  // Side = (W + H) + (L + H) / sqrt(2)
  const diagSide = (W + H) + ((L + H) / Math.SQRT2);
  const diagArea = diagSide * diagSide;
  const savingsPct = Math.max(0, Math.round(((stdArea - diagArea) / stdArea) * 100));

  // Ribbon length formula:
  // Ribbon = 2L + 2W + 4H + bowAllowance
  let bowAllowance = 24; // inches
  if (isCm) {
    bowAllowance = bowStyle === "grand" ? 90 : bowStyle === "minimal" ? 30 : 60;
  } else {
    bowAllowance = bowStyle === "grand" ? 36 : bowStyle === "minimal" ? 12 : 24;
  }
  const ribbonLength = (2 * L) + (2 * W) + (4 * H) + bowAllowance;

  // Update UI outputs
  const stdDimsEl = $("#calc-res-standard-dims");
  const stdSubEl = $("#calc-res-standard-sub");
  if (stdDimsEl) {
    stdDimsEl.textContent = `${stdWidth.toFixed(1)}${unitLabel} × ${stdLength.toFixed(1)}${unitLabel}`;
  }
  if (stdSubEl) {
    stdSubEl.textContent = `Total Area: ${Math.round(stdArea)} sq ${unitLabel} · Cut size`;
  }

  const diagDimsEl = $("#calc-res-diagonal-dims");
  const diagSubEl = $("#calc-res-diagonal-sub");
  if (diagDimsEl) {
    diagDimsEl.textContent = `${diagSide.toFixed(1)}${unitLabel} × ${diagSide.toFixed(1)}${unitLabel} Square`;
  }
  if (diagSubEl) {
    diagSubEl.textContent = `Rotated 45° · Saves ~${savingsPct}% paper vs standard`;
  }

  const ribbonEl = $("#calc-res-ribbon-length");
  const ribbonSubEl = $("#calc-res-ribbon-sub");
  if (ribbonEl) {
    const feetOrMeters = isCm ? `${(ribbonLength / 100).toFixed(2)} m` : `${(ribbonLength / 12).toFixed(1)} ft`;
    ribbonEl.textContent = `${Math.round(ribbonLength)} ${unitLabel} (${feetOrMeters})`;
  }
  if (ribbonSubEl) {
    ribbonSubEl.textContent = `Includes ${bowAllowance} ${unitLabel} for ${bowStyle} bow knot`;
  }

  // Update Visual Diagram
  const boxDimsEl = $("#cut-diagram-box-dims");
  if (boxDimsEl) {
    boxDimsEl.textContent = `${L}${unitLabel} × ${W}${unitLabel}`;
  }
  const marginTop = $("#cut-margin-top");
  const marginBottom = $("#cut-margin-bottom");
  if (marginTop) marginTop.textContent = `H: ${H}${unitLabel}`;
  if (marginBottom) marginBottom.textContent = `H: ${H}${unitLabel}`;
}

function openGiftTagDialog(projectId = null) {
  const dialog = $("#gift-tag-dialog");
  if (!dialog) return;

  const select = $("#gift-tag-project-select");
  if (select) {
    select.innerHTML = `<option value="">Custom / Blank Dedication</option>` +
      state.projects.map(p => `
        <option value="${p.id}" ${p.id === projectId ? "selected" : ""}>
          ${p.isGift ? "🎁 " : ""}${escapeHTML(p.title)} ${p.giftRecipient ? `(for ${escapeHTML(p.giftRecipient)})` : ""}
        </option>
      `).join("");
    if (projectId) select.value = projectId;
  }

  populateGiftTagFromProject(projectId);
  renderGiftTagPreview();
  dialog.showModal();
}

function populateGiftTagFromProject(projectId) {
  const project = state.projects.find(p => p.id === projectId);
  const maker = getCurrentMakerIdentity();

  const toInput = $("#gift-tag-to");
  const fromInput = $("#gift-tag-from");
  const titleInput = $("#gift-tag-title");
  const occasionInput = $("#gift-tag-occasion");
  const materialsInput = $("#gift-tag-materials");
  const careInput = $("#gift-tag-care");
  const dateInput = $("#gift-tag-date");
  const editionInput = $("#gift-tag-edition");

  if (project) {
    if (toInput) toInput.value = project.giftRecipient || "";
    if (fromInput) fromInput.value = project.creator?.name || maker.name || "Liam";
    if (titleInput) titleInput.value = project.title || "";
    if (occasionInput) occasionInput.value = project.giftRecipient ? `Handcrafted with love for ${project.giftRecipient} · ${formatGiftOccasionLabel(project.giftOccasion)}` : "Handcrafted with artisanal care";
    if (materialsInput) {
      const matNames = (project.materials || []).map(m => m.name).slice(0, 3).join(", ");
      materialsInput.value = matNames || "Workshop Selected Materials";
    }
    if (careInput) {
      careInput.value = project.giftCareNotes || GIFT_CARE_PRESETS.general;
    }
    if (dateInput) {
      const d = project.targetDate || project.giftDeadline || new Date().toISOString();
      const dt = new Date(d);
      dateInput.value = dt.toLocaleDateString(undefined, { year: "numeric", month: "long" });
    }
    if (editionInput) {
      editionInput.value = "1 of 1 · Workshop Original";
    }
  } else {
    if (toInput) toInput.value = "";
    if (fromInput) fromInput.value = maker.name || "Liam";
    if (titleInput) titleInput.value = "Handcrafted Piece";
    if (occasionInput) occasionInput.value = "Handcrafted with care & intention";
    if (materialsInput) materialsInput.value = "Artisan Hardwood & Brass";
    if (careInput) careInput.value = GIFT_CARE_PRESETS.wood;
    if (dateInput) dateInput.value = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long" });
    if (editionInput) editionInput.value = "1 of 1 · Workshop Original";
  }
}

function renderGiftTagPreview() {
  const sheet = $("#printable-gift-sheet");
  if (!sheet) return;

  const style = $("#gift-tag-style-select")?.value || "folding";
  const theme = $("#gift-tag-theme-select")?.value || "kraft";

  const to = ($("#gift-tag-to")?.value || "").trim();
  const from = ($("#gift-tag-from")?.value || "").trim();
  const title = ($("#gift-tag-title")?.value || "").trim();
  const occasion = ($("#gift-tag-occasion")?.value || "").trim();
  const materials = ($("#gift-tag-materials")?.value || "").trim();
  const care = ($("#gift-tag-care")?.value || "").trim();
  const date = ($("#gift-tag-date")?.value || "").trim();
  const edition = ($("#gift-tag-edition")?.value || "").trim();

  sheet.className = `printable-gift-sheet theme-${theme}`;

  if (style === "folding") {
    sheet.innerHTML = `
      <div class="tag-folding-wrap">
        <div class="tag-panel left-panel">
          <div class="tag-punch-hole" title="Punch hole for baker's twine">○</div>
          <div class="tag-back-header">A Note From the Workshop</div>
          <div class="tag-back-dedication">“${escapeHTML(occasion || "Handcrafted with intention & care")}”</div>
          ${materials ? `<div class="tag-back-materials"><strong>Craft:</strong> ${escapeHTML(materials)}</div>` : ""}
          ${care ? `<div class="tag-back-care"><strong>Care:</strong> ${escapeHTML(care)}</div>` : ""}
          <div class="tag-back-foot">
            <span>${escapeHTML(date || "Workshop Made")}</span>
            <span>${escapeHTML(edition || "Original Piece")}</span>
          </div>
        </div>
        <div class="tag-panel right-panel">
          <div class="tag-punch-hole" title="Punch hole for baker's twine">○</div>
          <div class="tag-front-eyebrow">HANDMADE FOR YOU</div>
          <div class="tag-front-icon">🎁</div>
          <div class="tag-front-title">${escapeHTML(title || "Handmade Treasure")}</div>
          <div class="tag-front-names">
            <div><strong>To:</strong> ${escapeHTML(to || "A Cherished Recipient")}</div>
            <div><strong>From:</strong> ${escapeHTML(from || "The Workshop")}</div>
          </div>
        </div>
      </div>
    `;
  } else if (style === "hangtag") {
    sheet.innerHTML = `
      <div class="tag-hangtag-wrap">
        <div class="hangtag-top-notch">
          <div class="tag-punch-hole-center" title="Punch hole for ribbon"></div>
          <div class="tag-front-eyebrow">HANDMADE ORIGIN</div>
        </div>
        <div class="hangtag-title">${escapeHTML(title || "Handmade Piece")}</div>
        <div class="hangtag-names">
          <div><strong>To:</strong> ${escapeHTML(to || "You")}</div>
          <div><strong>From:</strong> ${escapeHTML(from || "The Workshop")}</div>
        </div>
        ${occasion ? `<div class="hangtag-dedication">“${escapeHTML(occasion)}”</div>` : ""}
        ${materials ? `<div style="font-size:10px;margin-bottom:6px"><strong>Materials:</strong> ${escapeHTML(materials)}</div>` : ""}
        ${care ? `<div class="hangtag-care"><strong>Care:</strong> ${escapeHTML(care)}</div>` : ""}
        <div class="hangtag-footer">
          ${escapeHTML(date || "")} ${edition ? `· ${escapeHTML(edition)}` : ""}
        </div>
      </div>
    `;
  } else if (style === "certificate") {
    sheet.innerHTML = `
      <div class="tag-certificate-wrap">
        <div class="cert-header">
          <div class="cert-eyebrow">CERTIFICATE OF PROVENANCE &amp; AUTHENTICITY</div>
          <div class="cert-title">${escapeHTML(title || "Handcrafted Original")}</div>
        </div>
        <div class="cert-proclamation">
          This certifies that this piece was individually handcrafted with artisanal care and dedication${from ? ` by <strong>${escapeHTML(from)}</strong>` : ""}${to ? ` for <strong>${escapeHTML(to)}</strong>` : ""}.
        </div>
        <div class="cert-grid">
          <div class="cert-grid-item">
            <strong>Occasion / Dedication</strong>
            ${escapeHTML(occasion || "Personal Gift")}
          </div>
          <div class="cert-grid-item">
            <strong>Completion Date</strong>
            ${escapeHTML(date || "Workshop Complete")}
          </div>
          <div class="cert-grid-item">
            <strong>Primary Materials</strong>
            ${escapeHTML(materials || "Artisan Selected Materials")}
          </div>
          <div class="cert-grid-item">
            <strong>Edition / Serial</strong>
            ${escapeHTML(edition || "1 of 1 · Workshop Original")}
          </div>
        </div>
        ${care ? `
          <div class="cert-care-block">
            <strong>Care &amp; Preservation Instructions:</strong><br>
            ${escapeHTML(care)}
          </div>
        ` : ""}
        <div class="cert-signatures">
          <div>
            <strong>Studio / Workshop:</strong> ${escapeHTML(from || "Handmade Studio")}
          </div>
          <div class="cert-sign-line">
            Maker’s Signature
          </div>
        </div>
      </div>
    `;
  }
}

function printGiftTag() {
  document.body.classList.add("printing-gift-tag");
  window.print();
  setTimeout(() => {
    document.body.classList.remove("printing-gift-tag");
  }, 500);
}

function copyGiftTagText() {
  const to = ($("#gift-tag-to")?.value || "").trim();
  const from = ($("#gift-tag-from")?.value || "").trim();
  const title = ($("#gift-tag-title")?.value || "").trim();
  const care = ($("#gift-tag-care")?.value || "").trim();

  const text = `🎁 ${title}\nTo: ${to}\nFrom: ${from}\n\n🏷️ Care Instructions:\n${care}`;
  navigator.clipboard?.writeText(text).then(() => {
    showToast("Copied gift tag & care instructions to clipboard!");
  }).catch(() => {
    showToast("Could not copy to clipboard.");
  });
}

function renderPlanner() {
  const today = localDateString();
  const projects = state.projects.filter(activeProject);
  const overdue = projects.filter(project => project.targetDate && project.targetDate < today).sort((a, b) => a.targetDate.localeCompare(b.targetDate));
  const upcoming = projects.filter(project => project.targetDate && project.targetDate >= today).sort((a, b) => a.targetDate.localeCompare(b.targetDate));
  const nextThirtyDays = upcoming.filter(project => {
    const due = new Date(`${project.targetDate}T12:00:00`);
    return due.getTime() - new Date(`${today}T12:00:00`).getTime() <= 30 * 86400000;
  }).length;
  const undated = projects.filter(project => !project.targetDate).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  // Count everything done today across practice sessions, activities, and tasks
  const todayLogs = (state.practiceLog || []).filter(l => l.at && localDateString(new Date(l.at)) === today);
  const todayActivities = (state.activity || []).filter(a => a.at && localDateString(new Date(a.at)) === today);
  let todayTasksCount = 0;
  for (const p of state.projects) {
    for (const t of (p.tasks || [])) {
      if (t.done && t.completedAt && localDateString(new Date(t.completedAt)) === today) {
        todayTasksCount++;
      }
    }
  }
  const todayDoneTotal = todayLogs.length + todayActivities.length + todayTasksCount;

  $("#planner-stats").innerHTML = [
    statCard("Done today", todayDoneTotal, todayDoneTotal ? `${todayDoneTotal} action${todayDoneTotal === 1 ? "" : "s"} logged today` : "Log a session or checklist step", "⚡"),
    statCard("Overdue", overdue.length, overdue.length ? "A chance to reset the target" : "You’re all caught up", "⌛"),
    statCard("Due in 30 days", nextThirtyDays, "Upcoming project targets", "↗"),
    statCard("Active projects", projects.length, `${undated.length} without a target date`, "▤")
  ].join("");
  $("#overdue-count").textContent = overdue.length;
  $("#upcoming-count").textContent = upcoming.length;
  const renderRows = (items, emptyText, dateCaption) => items.length ? items.map(project => `
    <div class="planner-row" data-project="${project.id}" tabindex="0" role="button" aria-label="Open ${escapeHTML(project.title)}">
      <div class="planner-row-info"><strong>${escapeHTML(project.title)}</strong><span>${dateCaption(project)} · ${priorityLabel(project.priority)} priority</span></div>
      <span class="status-pill status-${safeStatus(project.status)}">${STATUS_LABELS[safeStatus(project.status)]}</span>
    </div>`).join("") : `<div class="empty-inline">${emptyText}</div>`;
  $("#overdue-projects").innerHTML = renderRows(overdue, "Nothing overdue. Nice work keeping things on track.", project => `${formatDate(project.targetDate)} · overdue`);
  $("#upcoming-projects").innerHTML = renderRows(upcoming, "No upcoming targets. Add a date to a project whenever it helps.", project => {
    const days = Math.round((new Date(`${project.targetDate}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 86400000);
    return days === 0 ? "Due today" : days === 1 ? "Due tomorrow" : `Due ${formatDate(project.targetDate)}`;
  });
  $("#undated-projects").innerHTML = renderRows(undated.slice(0, 6), "No undated active projects. Create a project or remove its target date to keep it flexible.", project => `${STATUS_LABELS[safeStatus(project.status)]} · no target date`);

  $("#planner-toggle-calendar")?.classList.toggle("active", plannerMode === "calendar");
  $("#planner-toggle-list")?.classList.toggle("active", plannerMode === "list");
  const calContainer = $("#planner-calendar-container");
  const listContainer = $("#planner-list-container");
  if (calContainer) calContainer.style.display = plannerMode === "calendar" ? "" : "none";
  if (listContainer) listContainer.style.display = plannerMode === "list" ? "" : "none";
  if (plannerMode === "calendar") renderCalendar();
}

function switchPlannerMode(mode) {
  plannerMode = mode;
  $("#planner-toggle-calendar")?.classList.toggle("active", mode === "calendar");
  $("#planner-toggle-list")?.classList.toggle("active", mode === "list");
  const calContainer = $("#planner-calendar-container");
  const listContainer = $("#planner-list-container");
  if (calContainer) calContainer.style.display = mode === "calendar" ? "" : "none";
  if (listContainer) listContainer.style.display = mode === "list" ? "" : "none";
  if (mode === "calendar") renderCalendar();
}

function navCalendar(delta) {
  if (delta === 0) {
    calendarDate = new Date();
  } else {
    calendarDate.setMonth(calendarDate.getMonth() + delta);
  }
  renderCalendar();
}

function renderCalendar() {
  const container = $("#planner-calendar-container");
  if (!container) return;

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const monthName = calendarDate.toLocaleString("default", { month: "long" });

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDaysInMonth = new Date(year, month, 0).getDate();

  const today = localDateString();

  const projectsByDate = new Map();
  for (const p of state.projects) {
    if (p.targetDate) {
      if (!projectsByDate.has(p.targetDate)) projectsByDate.set(p.targetDate, []);
      projectsByDate.get(p.targetDate).push(p);
    }
  }

  // Practice log items grouped by date
  const practicesByDate = new Map();
  for (const log of (state.practiceLog || [])) {
    if (log.at) {
      const d = localDateString(new Date(log.at));
      if (!practicesByDate.has(d)) practicesByDate.set(d, []);
      practicesByDate.get(d).push(log);
    }
  }

  // Activities grouped by date
  const activitiesByDate = new Map();
  for (const act of (state.activity || [])) {
    if (act.at) {
      const d = localDateString(new Date(act.at));
      if (!activitiesByDate.has(d)) activitiesByDate.set(d, []);
      activitiesByDate.get(d).push(act);
    }
  }

  // Project tasks completed on date
  const tasksByDate = new Map();
  for (const p of state.projects) {
    for (const t of (p.tasks || [])) {
      if (t.done && t.completedAt) {
        const d = localDateString(new Date(t.completedAt));
        if (!tasksByDate.has(d)) tasksByDate.set(d, []);
        tasksByDate.get(d).push({ ...t, projectTitle: p.title, projectId: p.id });
      }
    }
  }

  const renderCellBadges = (dateStr) => {
    const dayProjects = projectsByDate.get(dateStr) || [];
    const dayPractices = practicesByDate.get(dateStr) || [];
    const dayTasks = tasksByDate.get(dateStr) || [];
    const dayActs = activitiesByDate.get(dateStr) || [];

    const badgeItems = [];

    // 1. Projects due on this date
    for (const p of dayProjects) {
      const isOverdue = p.targetDate < today && p.status !== "completed";
      badgeItems.push(`
        <div class="calendar-badge ${isOverdue ? "calendar-badge-overdue" : "calendar-badge-project"}" data-action="open-project-detail" data-id="${p.id}" title="${escapeHTML(p.title)} · ${STATUS_LABELS[safeStatus(p.status)]}">
          ${isOverdue ? "⌛ " : "✳ "}${escapeHTML(p.title)}
        </div>
      `);
    }

    // 2. Practice sessions
    for (const log of dayPractices) {
      badgeItems.push(`
        <div class="calendar-badge calendar-badge-practice" data-action="open-activity-detail" data-id="${log.id}" title="${escapeHTML(log.text)}">
          ⏱ ${escapeHTML(log.text.replace(/^[^+]+/, "") || log.text)}
        </div>
      `);
    }

    // 3. Completed checklist tasks
    for (const t of dayTasks) {
      badgeItems.push(`
        <div class="calendar-badge calendar-badge-task" data-action="open-project-detail" data-id="${t.projectId}" title="Completed: ${escapeHTML(t.text)} (${escapeHTML(t.projectTitle)})">
          ✓ ${escapeHTML(t.text)}
        </div>
      `);
    }

    // 4. Minor activities summary badge if any activities exist
    if (dayActs.length > 0) {
      badgeItems.push(`
        <div class="calendar-badge calendar-badge-summary" data-action="open-day-summary" data-date="${dateStr}" title="Click to view all ${dayActs.length} actions logged">
          ⚡ ${dayActs.length} action${dayActs.length === 1 ? "" : "s"} logged
        </div>
      `);
    }

    // Show up to 3 badges; if more, show 2 plus "+N more…"
    const MAX_VISIBLE = 3;
    if (badgeItems.length <= MAX_VISIBLE) {
      return badgeItems.join("");
    }

    const visible = badgeItems.slice(0, 2);
    const hiddenCount = badgeItems.length - 2;
    return `
      ${visible.join("")}
      <button type="button" class="calendar-badge-more" data-action="open-day-summary" data-date="${dateStr}">+${hiddenCount} more…</button>
    `;
  };

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  let cellsHtml = "";

  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = prevDaysInMonth - i;
    const prevMonthDate = new Date(year, month - 1, dayNum);
    const dateStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    cellsHtml += `
      <div class="calendar-cell is-other-month" data-action="open-day-summary" data-date="${dateStr}" title="Click to inspect day">
        <div class="calendar-cell-header"><span class="calendar-cell-num">${dayNum}</span></div>
        <div class="calendar-events-list">
          ${renderCellBadges(dateStr)}
        </div>
      </div>
    `;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isToday = dateStr === today;

    cellsHtml += `
      <div class="calendar-cell ${isToday ? "is-today" : ""}" data-action="open-day-summary" data-date="${dateStr}" title="Click to inspect day">
        <div class="calendar-cell-header">
          <span class="calendar-cell-num">${day}</span>
          ${isToday ? '<span class="status-pill status-in-progress" style="font-size:9px;padding:1px 4px">Today</span>' : ""}
        </div>
        <div class="calendar-events-list">
          ${renderCellBadges(dateStr)}
        </div>
      </div>
    `;
  }

  const totalCellsSoFar = firstDayIndex + daysInMonth;
  const trailingCells = (7 - (totalCellsSoFar % 7)) % 7;
  for (let nextDay = 1; nextDay <= trailingCells; nextDay++) {
    const nextMonthDate = new Date(year, month + 1, nextDay);
    const dateStr = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}-${String(nextDay).padStart(2, "0")}`;
    cellsHtml += `
      <div class="calendar-cell is-other-month" data-action="open-day-summary" data-date="${dateStr}" title="Click to inspect day">
        <div class="calendar-cell-header"><span class="calendar-cell-num">${nextDay}</span></div>
        <div class="calendar-events-list">
          ${renderCellBadges(dateStr)}
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="calendar-topbar">
      <div class="calendar-month-heading">
        <span>📅 ${monthName} ${year}</span>
      </div>
      <div class="calendar-nav-buttons">
        <button type="button" class="button button-outline button-small" data-action="calendar-prev">← Prev</button>
        <button type="button" class="button button-outline button-small" data-action="calendar-today">Today</button>
        <button type="button" class="button button-outline button-small" data-action="calendar-next">Next →</button>
      </div>
    </div>
    <div class="calendar-grid">
      ${dayLabels.map(lbl => `<div class="calendar-day-label">${lbl}</div>`).join("")}
      ${cellsHtml}
    </div>
  `;
}

function openDaySummaryDialog(dateStr) {
  if (!dateStr) return;
  const dialog = $("#day-summary-dialog");
  const titleEl = $("#day-summary-title");
  const bodyEl = $("#day-summary-body");
  if (!dialog || !bodyEl) return;

  const dateObj = new Date(`${dateStr}T12:00:00`);
  const formattedDate = isNaN(dateObj.getTime()) ? dateStr : dateObj.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  if (titleEl) {
    titleEl.textContent = `📅 ${formattedDate}`;
  }

  const today = localDateString();
  const dayProjects = state.projects.filter(p => p.targetDate === dateStr);
  const dayPractices = (state.practiceLog || []).filter(l => l.at && localDateString(new Date(l.at)) === dateStr);
  const dayActivities = (state.activity || []).filter(a => a.at && localDateString(new Date(a.at)) === dateStr);

  const dayTasks = [];
  for (const p of state.projects) {
    for (const t of (p.tasks || [])) {
      if (t.done && t.completedAt && localDateString(new Date(t.completedAt)) === dateStr) {
        dayTasks.push({ ...t, projectTitle: p.title, projectId: p.id });
      }
    }
  }

  const hasAny = dayProjects.length > 0 || dayPractices.length > 0 || dayTasks.length > 0 || dayActivities.length > 0;

  if (!hasAny) {
    bodyEl.innerHTML = `
      <div class="empty-inline" style="padding:24px;text-align:center">
        No projects due, practice sessions, or activity logs recorded on this day.
      </div>
    `;
    dialog.showModal();
    return;
  }

  let html = "";

  // 1. Projects Due Section
  if (dayProjects.length > 0) {
    html += `
      <div>
        <h3 style="font-size:12px;text-transform:uppercase;color:var(--muted);letter-spacing:0.5px;margin:0 0 8px 0">📌 Target Deadlines (${dayProjects.length})</h3>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${dayProjects.map(p => {
            const isOverdue = p.targetDate < today && p.status !== "completed";
            return `
              <div class="day-summary-card clickable" data-action="open-project-detail" data-id="${p.id}">
                <div>
                  <strong style="color:var(--ink)">${escapeHTML(p.title)}</strong>
                  <div style="font-size:11px;color:var(--muted);margin-top:2px">${priorityLabel(p.priority)} priority · ${STATUS_LABELS[safeStatus(p.status)]}</div>
                </div>
                <span class="status-pill status-${isOverdue ? "blocked" : safeStatus(p.status)}">${isOverdue ? "Overdue" : STATUS_LABELS[safeStatus(p.status)]}</span>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  // 2. Practice Sessions
  if (dayPractices.length > 0) {
    html += `
      <div>
        <h3 style="font-size:12px;text-transform:uppercase;color:var(--muted);letter-spacing:0.5px;margin:10px 0 8px 0">⏱ Practice & XP Log (${dayPractices.length})</h3>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${dayPractices.map(l => {
            const timeStr = l.at ? new Date(l.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
            return `
              <div class="day-summary-card clickable" data-action="open-activity-detail" data-id="${l.id}">
                <div>
                  <div style="font-weight:600;font-size:13px;color:var(--ink)">${escapeHTML(l.text)}</div>
                  <div style="font-size:11px;color:var(--muted);margin-top:2px">Logged at ${timeStr}</div>
                </div>
                ${l.xp ? `<span style="font-size:12px;font-weight:700;color:var(--accent)">+${l.xp} XP</span>` : ""}
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  // 3. Completed Checklist Tasks
  if (dayTasks.length > 0) {
    html += `
      <div>
        <h3 style="font-size:12px;text-transform:uppercase;color:var(--muted);letter-spacing:0.5px;margin:10px 0 8px 0">✓ Completed Checklist Steps (${dayTasks.length})</h3>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${dayTasks.map(t => {
            const timeStr = t.completedAt ? new Date(t.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
            return `
              <div class="day-summary-card clickable" data-action="open-project-detail" data-id="${t.projectId}">
                <div>
                  <div style="font-weight:600;font-size:13px;color:var(--ink)">${escapeHTML(t.text)}</div>
                  <div style="font-size:11px;color:var(--muted);margin-top:2px">Project: ${escapeHTML(t.projectTitle)} · ${timeStr}</div>
                </div>
                <span class="status-pill status-completed">Completed</span>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  // 4. Activity Timeline
  if (dayActivities.length > 0) {
    html += `
      <div>
        <h3 style="font-size:12px;text-transform:uppercase;color:var(--muted);letter-spacing:0.5px;margin:10px 0 8px 0">⚡ Activity Timeline (${dayActivities.length})</h3>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${dayActivities.map(a => {
            const timeStr = a.at ? new Date(a.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
            return `
              <div class="day-summary-card clickable" data-action="open-activity-detail" data-id="${a.id}">
                <div>
                  <div style="font-size:12.5px;color:var(--ink);line-height:1.35">${escapeHTML(a.text)}</div>
                  <div style="font-size:11px;color:var(--muted);margin-top:2px">Recorded at ${timeStr}</div>
                </div>
                <span style="font-size:11px;color:var(--muted)">View ›</span>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  bodyEl.innerHTML = html;
  dialog.showModal();
}


function renderSkills() {
  const totalXp = state.skills.reduce((sum, skill) => sum + skill.xp, 0);
  const levels = state.skills.reduce((sum, skill) => sum + skillLevel(skill.xp) - 1, 0);
  $("#skills-summary").innerHTML = state.skills.length
    ? `<span>✳</span><span>You’ve earned <strong>${totalXp.toLocaleString()} XP</strong> across <strong>${levels} level${levels === 1 ? "" : "s"}</strong> so far. Keep showing up; it adds up.</span>`
    : `<span>✳</span><span>Add a skill and start your own progress trail. Every <strong>100 XP</strong> earns a new level.</span>`;
  const streakContainer = $("#skills-streak-container");
  if (streakContainer) streakContainer.innerHTML = renderStreakWidget();
  const sorted = [...state.skills].sort((a, b) => b.xp - a.xp);
  const practiceFilter = $("#practice-filter").value;
  $("#practice-filter").innerHTML = `<option value="all">All skills</option>${state.skills.map(skill => `<option value="${escapeHTML(skill.id)}">${escapeHTML(skill.name)}</option>`).join("")}`;
  $("#practice-filter").value = state.skills.some(skill => skill.id === practiceFilter) ? practiceFilter : "all";
  $("#skill-grid").innerHTML = sorted.length ? sorted.map((skill, index) => {
    const relatedCount = state.projects.filter(project => (project.skillIds || []).includes(skill.id)).length;
    const practiceSessions = state.activity.filter(activity => activity.kind === "xp" && (activity.skillId === skill.id || (!activity.skillId && activity.text.startsWith(`${skill.name} +`))));
    const lastPracticed = practiceSessions.sort((a, b) => new Date(b.at) - new Date(a.at))[0];
    return `<article class="skill-card">
      <div class="skill-card-header"><div class="skill-icon">${["✳", "⌘", "◈", "✿"][index % 4]}</div><div class="skill-card-heading"><h3>${escapeHTML(skill.name)}</h3><span>${escapeHTML(skill.category || "Personal skill")}</span></div><span class="skill-level-badge">Level ${skillLevel(skill.xp)}</span></div>
      <div class="skill-card-progress"><div class="progress-track"><div class="progress-bar" style="width:${skillProgress(skill.xp)}%"></div></div><div class="skill-xp-line"><span>${skillProgress(skill.xp)} / ${XP_PER_LEVEL} XP to next level</span><span>${skill.xp} total XP</span></div></div>
      <div class="skill-practice-meta"><span>${lastPracticed ? `Last practiced ${relativeTime(lastPracticed.at)}` : "No practice logged yet"}</span><span>${relatedCount} ${relatedCount === 1 ? "project" : "projects"}</span></div>
      <div class="skill-card-bottom"><span>Level ${skillLevel(skill.xp)} progress</span><div class="skill-card-actions"><button class="small-action" data-action="edit-skill" data-id="${skill.id}">Edit</button><button class="small-action" data-action="log-xp" data-id="${skill.id}">＋ Log XP</button><button class="small-action danger-button" data-action="delete-skill" data-id="${skill.id}">Delete</button></div></div>
    </article>`;
  }).join("") : emptyState("Your skills deserve a spot here", "Track a skill, practice over time, and watch your level grow.", "new-skill", "Add a skill");
  renderPracticeLog();
}

function renderPracticeLog() {
  const filter = $("#practice-filter").value;
  const filtered = state.practiceLog
    .filter(activity => activity?.kind === "xp" && typeof activity.text === "string")
    .filter(activity => filter === "all" || activity.skillId === filter || (!activity.skillId && activity.text.startsWith(`${state.skills.find(skill => skill.id === filter)?.name || "\u0000"} +`)))
    .sort((a, b) => new Date(b.at) - new Date(a.at));
  const entries = filtered.slice(0, practiceLogLimit);
  $("#practice-log").innerHTML = entries.length ? `<div class="practice-list">${entries.map(activity => `
    <article class="practice-entry">
      <span class="activity-icon">✳</span>
      <div class="practice-entry-copy"><p>${escapeHTML(activity.text)}</p><time>${formatFullDateTime(activity.at)} · ${relativeTime(activity.at)}</time></div>
      <button type="button" class="task-remove" data-action="delete-xp" data-id="${activity.id}" title="Delete logged practice session" aria-label="Delete logged practice session">×</button>
    </article>`).join("")}</div>` : `<div class="empty-inline">${filter === "all" ? "Log XP for a skill and your practice history will appear here." : "No practice logged for this skill yet."}</div>`;
  if (filtered.length > entries.length) {
    $("#practice-log").insertAdjacentHTML("beforeend", `<button class="panel-footer-link practice-more" data-action="show-more-practice">Show older practice <span>↓</span></button>`);
  }
}

function renderGallery() {
  const projects = state.projects.filter(project => projectImageCount(project) > 0);
  $("#gallery-content").innerHTML = projects.length ? projects.map(project => `
    <section class="gallery-project">
      <div class="gallery-project-heading"><h2>${escapeHTML(project.title)}</h2><span>${projectImageCount(project)} ${projectImageCount(project) === 1 ? "photo" : "photos"}</span></div>
      ${(project.folders || []).filter(folder => folder.images.length).map(folder => `
        <div class="gallery-folder"><div class="gallery-folder-title">${escapeHTML(folder.name)}</div><div class="photo-grid">${folder.images.map(image => `
          <div class="photo-tile" data-action="open-lightbox" data-image-id="${image.id}" data-caption="${escapeHTML(image.name)}" tabindex="0" role="button" aria-label="View photo ${escapeHTML(image.name)}"><img src="${imageUrl(image)}" alt="${escapeHTML(image.name)}" loading="lazy"><span class="photo-caption">${escapeHTML(image.name)}</span></div>`).join("")}</div></div>`).join("")}
    </section>`).join("") : `<div class="gallery-empty"><div class="empty-state-mark">▧</div><h3>Your making, in the making</h3><p>Add photos to any project to build a visual journal of the process. Create folders for prototypes, materials, finished pieces, and everything in between.</p><button class="button button-primary" data-view="projects">Explore projects <span>→</span></button></div>`;
}

function inferMaterialGroup(name = "") {
  const n = (name || "").toLowerCase();
  if (n.includes("yarn") || n.includes("wool") || n.includes("skein") || n.includes("cotton") || n.includes("acrylic") || n.includes("alpaca") || n.includes("thread") || n.includes("merino") || n.includes("fabric") || n.includes("linen") || n.includes("cashmere") || n.includes("silk") || n.includes("stitch") || n.includes("fiber")) return "Yarn & Fibers";
  if (n.includes("sensor") || n.includes("bme280") || n.includes("bmp280") || n.includes("bme680") || n.includes("mpu6050") || n.includes("oled") || n.includes("esp32") || n.includes("arduino") || n.includes("module") || n.includes("i2c") || n.includes("spi") || n.includes("imu") || n.includes("tof") || n.includes("sonar") || n.includes("ultrasonic") || n.includes("dht") || n.includes("thermistor") || n.includes("ina219") || n.includes("ads1115") || n.includes("rtc") || n.includes("ds3231") || n.includes("mcu")) return "Sensors & Modules";
  if (n.includes("plywood") || n.includes("oak") || n.includes("walnut") || n.includes("board") || n.includes("pine") || n.includes("lumber") || n.includes("maple") || n.includes("cedar") || n.includes("wood") || n.includes("dowel") || n.includes("timber") || n.includes("mdf") || n.includes("sheet")) return "Lumber & Sheet Goods";
  if (n.includes("screw") || n.includes("bolt") || n.includes("nut") || n.includes("washer") || n.includes("hinge") || n.includes("bracket") || n.includes("hardware") || n.includes("fastener") || n.includes("pin") || n.includes("pull") || n.includes("handle")) return "Fasteners & Hardware";
  if (n.includes("finish") || n.includes("oil") || n.includes("poly") || n.includes("stain") || n.includes("paint") || n.includes("epoxy") || n.includes("glue") || n.includes("hardwax") || n.includes("varnish") || n.includes("primer") || n.includes("lacquer") || n.includes("shellac") || n.includes("adhesive")) return "Finishes & Adhesives";
  if (n.includes("resistor") || n.includes("capacitor") || n.includes("led") || n.includes("diode") || n.includes("wire") || n.includes("pcb") || n.includes("breadboard") || n.includes("ic") || n.includes("potentiometer") || n.includes("switch") || n.includes("header") || n.includes("jumper")) return "Electronics & Wiring";
  if (n.includes("sandpaper") || n.includes("blade") || n.includes("bit") || n.includes("rag") || n.includes("abrasive") || n.includes("tape") || n.includes("consumable")) return "Consumables";
  return "General Supplies";
}

function getGroupIcon(group = "") {
  const g = (group || "").toLowerCase();
  if (g.includes("yarn") || g.includes("fiber") || g.includes("fabric") || g.includes("textile")) return "🧶";
  if (g.includes("sensor") || g.includes("mcu") || g.includes("module")) return "⚡";
  if (g.includes("lumber") || g.includes("wood") || g.includes("sheet")) return "🪵";
  if (g.includes("fastener") || g.includes("hardware") || g.includes("screw")) return "🔩";
  if (g.includes("finish") || g.includes("adhesive") || g.includes("glue") || g.includes("oil")) return "🧪";
  if (g.includes("electronic") || g.includes("wiring") || g.includes("circuit")) return "🔌";
  if (g.includes("print") || g.includes("filament")) return "🖨️";
  return "📦";
}

function getGroupBadgeClass(group = "") {
  const g = (group || "").toLowerCase();
  if (g.includes("yarn") || g.includes("fiber") || g.includes("fabric")) return "group-yarn";
  if (g.includes("sensor") || g.includes("mcu") || g.includes("module")) return "group-sensors";
  if (g.includes("lumber") || g.includes("wood")) return "group-lumber";
  if (g.includes("hardware") || g.includes("fastener")) return "group-hardware";
  if (g.includes("finish") || g.includes("adhesive")) return "group-finishes";
  if (g.includes("electronic") || g.includes("wire")) return "group-electronics";
  return "";
}

function renderProjectDetail(projectId) {
  const project = state.projects.find(item => item.id === projectId);
  if (!project) {
    $("#detail-dialog").close();
    activeProjectId = null;
    return;
  }
  const folders = project.folders || [];
  const skills = projectSkillNames(project);
  const tasks = project.tasks || [];
  const notes = project.notes || [];
  const materials = project.materials || [];
  const assignedTools = (state.inventory || []).filter(i => i.type === "equipment" && i.assignedProjectId === project.id);
  const totalCost = materials.reduce((sum, m) => sum + (Number(m.cost) || 0), 0);
  const spentCost = materials.filter(m => m.status === "have" || m.status === "ordered").reduce((sum, m) => sum + (Number(m.cost) || 0), 0);
  const haveCount = materials.filter(m => m.status === "have").length;
  const budget = Number(project.budget) || 0;
  const budgetRemaining = budget ? budget - totalCost : 0;
  const budgetPercent = budget > 0 ? Math.min(100, Math.round((totalCost / budget) * 100)) : 0;
  const isOverBudget = budget > 0 && totalCost > budget;

  const catTotals = { yarn: 0, sensors: 0, lumber: 0, hardware: 0, finishes: 0, consumables: 0, other: 0 };
  for (const m of materials) {
    const cost = Number(m.cost) || 0;
    const nameLow = (m.name || "").toLowerCase();
    const groupLow = (m.group || m.type || m.category || inferMaterialGroup(m.name)).toLowerCase();
    if (groupLow.includes("yarn") || groupLow.includes("fiber")) {
      catTotals.yarn += cost;
    } else if (groupLow.includes("sensor") || groupLow.includes("mcu") || groupLow.includes("module")) {
      catTotals.sensors += cost;
    } else if (groupLow.includes("lumber") || groupLow.includes("wood") || groupLow.includes("sheet")) {
      catTotals.lumber += cost;
    } else if (groupLow.includes("fastener") || groupLow.includes("hardware")) {
      catTotals.hardware += cost;
    } else if (groupLow.includes("finish") || groupLow.includes("adhesive")) {
      catTotals.finishes += cost;
    } else if (groupLow.includes("consumable") || groupLow.includes("abrasive")) {
      catTotals.consumables += cost;
    } else {
      catTotals.other += cost;
    }
  }

  const catBreakdownHtml = (totalCost > 0) ? `
    <div class="supplies-cat-bar-wrap">
      <div class="supplies-cat-bar" title="Category Cost Distribution">
        ${catTotals.yarn > 0 ? `<div class="supplies-cat-segment yarn" style="width:${(catTotals.yarn / totalCost) * 100}%" title="Yarn &amp; Fibers: ${formatMoney(catTotals.yarn)}"></div>` : ""}
        ${catTotals.sensors > 0 ? `<div class="supplies-cat-segment sensors" style="width:${(catTotals.sensors / totalCost) * 100}%" title="Sensors &amp; Modules: ${formatMoney(catTotals.sensors)}"></div>` : ""}
        ${catTotals.lumber > 0 ? `<div class="supplies-cat-segment lumber" style="width:${(catTotals.lumber / totalCost) * 100}%" title="Lumber: ${formatMoney(catTotals.lumber)}"></div>` : ""}
        ${catTotals.hardware > 0 ? `<div class="supplies-cat-segment hardware" style="width:${(catTotals.hardware / totalCost) * 100}%" title="Hardware: ${formatMoney(catTotals.hardware)}"></div>` : ""}
        ${catTotals.finishes > 0 ? `<div class="supplies-cat-segment finishes" style="width:${(catTotals.finishes / totalCost) * 100}%" title="Finishes: ${formatMoney(catTotals.finishes)}"></div>` : ""}
        ${catTotals.consumables > 0 ? `<div class="supplies-cat-segment consumables" style="width:${(catTotals.consumables / totalCost) * 100}%" title="Consumables: ${formatMoney(catTotals.consumables)}"></div>` : ""}
        ${catTotals.other > 0 ? `<div class="supplies-cat-segment other" style="width:${(catTotals.other / totalCost) * 100}%" title="Other: ${formatMoney(catTotals.other)}"></div>` : ""}
      </div>
      <div class="supplies-cat-legend">
        ${catTotals.yarn > 0 ? `<span class="supplies-cat-pill"><span class="cat-dot yarn"></span> Yarn: <strong>${formatMoney(catTotals.yarn)}</strong></span>` : ""}
        ${catTotals.sensors > 0 ? `<span class="supplies-cat-pill"><span class="cat-dot sensors"></span> Sensors: <strong>${formatMoney(catTotals.sensors)}</strong></span>` : ""}
        ${catTotals.lumber > 0 ? `<span class="supplies-cat-pill"><span class="cat-dot lumber"></span> Lumber: <strong>${formatMoney(catTotals.lumber)}</strong></span>` : ""}
        ${catTotals.hardware > 0 ? `<span class="supplies-cat-pill"><span class="cat-dot hardware"></span> Hardware: <strong>${formatMoney(catTotals.hardware)}</strong></span>` : ""}
        ${catTotals.finishes > 0 ? `<span class="supplies-cat-pill"><span class="cat-dot finishes"></span> Finishes: <strong>${formatMoney(catTotals.finishes)}</strong></span>` : ""}
        ${catTotals.consumables > 0 ? `<span class="supplies-cat-pill"><span class="cat-dot consumables"></span> Parts: <strong>${formatMoney(catTotals.consumables)}</strong></span>` : ""}
        ${catTotals.other > 0 ? `<span class="supplies-cat-pill"><span class="cat-dot other"></span> Other: <strong>${formatMoney(catTotals.other)}</strong></span>` : ""}
      </div>
    </div>
  ` : "";

  const budgetCardHtml = (budget > 0 || materials.length > 0) ? `
    <div class="project-budget-card">
      <div class="budget-stats-grid">
        <div class="budget-stat-item">
          <span class="budget-stat-label">Target Budget</span>
          <span class="budget-stat-val">${budget > 0 ? formatMoney(budget) : "Not set"}</span>
        </div>
        <div class="budget-stat-item">
          <span class="budget-stat-label">Acquired / Spent</span>
          <span class="budget-stat-val">${formatMoney(spentCost)}</span>
        </div>
        <div class="budget-stat-item">
          <span class="budget-stat-label">Est. Total</span>
          <span class="budget-stat-val ${isOverBudget ? "over" : budget > 0 ? "under" : ""}">${formatMoney(totalCost)}</span>
        </div>
        <div class="budget-stat-item">
          <span class="budget-stat-label">Remaining</span>
          <span class="budget-stat-val ${isOverBudget ? "over" : "under"}">${budget > 0 ? (budgetRemaining >= 0 ? formatMoney(budgetRemaining) : `-${formatMoney(Math.abs(budgetRemaining))}`) : "—"}</span>
        </div>
      </div>
      ${budget > 0 ? `
        <div class="budget-meter-track" title="${budgetPercent}% of target budget">
          <div class="budget-meter-fill ${isOverBudget ? "over-budget" : ""}" style="width:${budgetPercent}%"></div>
        </div>
      ` : ""}
      ${catBreakdownHtml}
    </div>
  ` : "";

  const progress = projectTaskProgress(project);
  const isComplete = project.status === "completed" || (progress.total > 0 && progress.completed === progress.total);
  const completionBannerHtml = isComplete ? `
    <div class="completion-banner">
      <div class="completion-banner-icon">🎉</div>
      <div class="completion-banner-text">
        <strong>${project.status === "completed" ? "Project Complete!" : "All checklist steps complete!"}</strong>
        <span>${progress.completed} of ${progress.total || tasks.length} steps finished · ${formatMinutes(project.timeSpent || 0)} invested${materials.length ? ` · ${formatMoney(totalCost)} in parts` : ""}.</span>
      </div>
    </div>` : "";

  ensureProjectCreator(project);
  const isCollab = (project.coCreators || []).length > 0;
  const isCraftingActive = liveCraftingSession.projectId === project.id;
  const allTasks = project.tasks || [];
  const phases = Array.from(new Set(allTasks.map(t => (t.phase || "").trim()).filter(Boolean)));
  const activePhase = project._activePhase || "all";
  const visibleTasks = activePhase === "all" ? allTasks : allTasks.filter(t => (t.phase || "") === activePhase);

  const craftingBannerHtml = isCraftingActive ? `
    <div class="active-crafting-banner">
      <div class="crafting-banner-left">
        <span class="crafting-pulse-dot"></span>
        <div>
          <div style="font-weight:700;font-size:14px;color:var(--ink)">
            Crafting in Progress: <span class="crafting-timer-clock">${formatCraftingClock(liveCraftingSession.elapsedSeconds)}</span>
          </div>
          <div style="font-size:11px;color:var(--muted)">Session logging to “${escapeHTML(project.title)}” · Focused craft time</div>
        </div>
      </div>
      <div style="display:flex;gap:6px;align-items:center">
        <button type="button" class="button button-small ${liveCraftingSession.isRunning ? "button-outline" : "button-primary"}" data-action="toggle-project-timer" data-project="${project.id}">
          ${liveCraftingSession.isRunning ? "⏸ Pause" : "▶ Resume"}
        </button>
        <button type="button" class="button button-small button-primary" data-action="finish-project-timer" data-project="${project.id}">
          ⏹ Finish &amp; Log Time
        </button>
      </div>
    </div>
  ` : "";

  $("#project-detail").innerHTML = `<div class="detail-content">
    <div class="detail-top">
      <div class="detail-title">
        <div class="project-swatch">✳</div>
        <div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <h2>${escapeHTML(project.title)}</h2>
            <button type="button" class="pin-toggle-btn ${project.pinned ? "active" : ""}" data-action="toggle-pin" data-project="${project.id}" title="${project.pinned ? "Unpin project" : "Pin project to top"}" aria-label="${project.pinned ? "Unpin project" : "Pin project to top"}">★</button>
            <button type="button" class="button button-small ${isCraftingActive ? "button-outline" : "button-primary"} live-craft-btn" data-action="quick-start-project-timer" data-project="${project.id}" title="Start real-time crafting stopwatch & focus session">⏱️ ${isCraftingActive && liveCraftingSession.isRunning ? "Crafting..." : "Start Crafting"}</button>
            <button type="button" class="button button-small prominent-team-btn" data-action="open-collaborators-dialog" data-id="${project.id}" title="Manage co-creators & project team members">👥 Project Team (${(project.coCreators || []).length + 1})</button>
            <button type="button" class="small-action" data-action="open-time-dialog" data-id="${project.id}" title="Log time on this project">⏱ Log time</button>
            <button type="button" class="small-action" data-action="open-timer" data-project="${project.id}" title="Start focused practice timer for this project">⏱ Focus Timer</button>
            <button type="button" class="small-action" data-action="open-showcase" data-id="${project.id}" title="Shareable project showcase & build story">🌟 Showcase</button>
            <button type="button" class="small-action" data-action="open-project-pricing" data-id="${project.id}" title="Labor cost & selling price calculator">🏷️ Price & Profit</button>
            <button type="button" class="small-action" data-action="open-project-blueprint" data-id="${project.id}" title="2D Blueprint & dimensioned sketchpad">📐 Blueprint</button>
            <button type="button" class="small-action" data-action="open-project-qr" data-id="${project.id}" title="Workshop QR bin label">🏷️ QR Label</button>
            <button type="button" class="small-action" data-action="open-shop-mode" data-id="${project.id}" title="Hands-Free Workshop HUD with Voice Control" style="background:rgba(16,185,129,0.15);border-color:#10b981;font-weight:700">🎙️ Shop Mode (HUD)</button>
            <button type="button" class="small-action" data-action="open-client-portal" data-id="${project.id}" title="Client Progress Portal &amp; Job Costing">💼 Client Portal</button>
            <button type="button" class="small-action" data-action="open-timelapse-reel" data-id="${project.id}" title="Animated Build Progress Timelapse Reel">🎬 Timelapse</button>
            <button type="button" class="small-action" data-action="open-cad-viewer" data-id="${project.id}" title="3D CAD &amp; STL / G-Code Viewer">🧊 3D CAD</button>
            <button type="button" class="small-action" data-action="save-project-template" data-id="${project.id}" title="Save as reusable template">💾 Template</button>
            <button type="button" class="small-action" data-action="open-compare-photos" data-project="${project.id}" title="Compare photos side-by-side">↔️ Compare</button>
            <button type="button" class="small-action print-keep" data-action="open-gift-tag" data-id="${project.id}" title="Generate and print maker gift tag & care certificate">🎁 Gift Tag / Card</button>
            <button type="button" class="small-action" data-action="open-gift-calc" data-id="${project.id}" title="Gift wrapping paper and box sizing calculator">📐 Box &amp; Wrap Calc</button>
            <button type="button" class="small-action print-keep" data-action="open-project-dossier" data-id="${project.id}" title="View comprehensive project dossier">📄 Dossier</button>
            <button type="button" class="small-action print-keep" data-action="open-workshop-blueprint" data-id="${project.id}" title="Printable workshop blueprint & cut-sheet">📐 Shop Blueprint</button>
            <button type="button" class="small-action print-keep" data-action="open-quote-dialog" data-id="${project.id}" title="Client quote, estimate & work order invoice generator">💼 Client Quote</button>
            <button type="button" class="small-action print-keep" data-action="export-project-binder" data-id="${project.id}" title="Export self-contained, offline-runnable interactive HTML Build Binder archive">📦 Export Binder (HTML)</button>
            <button type="button" class="small-action" data-action="copy-project-summary" data-id="${project.id}" title="Copy project summary to clipboard">📋 Copy summary</button>
            <button type="button" class="small-action print-keep" data-action="print-project" data-id="${project.id}" title="Print workshop sheet">🖶 Print sheet</button>
          </div>
          <div class="detail-subtitle">
            Updated ${relativeTime(project.updatedAt)}${project.targetDate ? ` · Target ${formatDate(project.targetDate)}` : ""}${project.timeSpent ? ` · ⏱ ${formatMinutes(project.timeSpent)} invested` : ""}
            ${isCollab ? ` · <span class="collab-badge">👥 👑 ${escapeHTML(project.creator?.name || "Creator")} + ${(project.coCreators || []).map(c => escapeHTML(c.name || c.email)).join(", ")}</span>` : ""}
            ${project.lastStatusChange ? ` · <span style="color:var(--muted)">Status changed by ${escapeHTML(project.lastStatusChange.by)}</span>` : ""}
          </div>
          <div class="collab-team-banner" style="display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:pointer;margin:10px 0 4px" data-action="open-collaborators-dialog" data-id="${project.id}">
            <div style="display:flex;align-items:center;gap:10px;min-width:0">
              <div style="font-size:20px;flex-shrink:0">👥</div>
              <div style="min-width:0">
                <div style="font-weight:600;font-size:13px;color:var(--ink)">
                  Project Team · 👑 ${escapeHTML(project.creator?.name || "Creator")} ${isCollab ? `+ ${(project.coCreators || []).map(c => escapeHTML(c.name || c.email)).join(", ")}` : `<span style="font-weight:normal;color:var(--muted)">(Solo project)</span>`}
                </div>
                <div style="font-size:11px;color:var(--muted)">
                  ${isCollab ? `${(project.coCreators || []).length + 1} collaborators sharing this project · Click to manage` : `Invite a co-creator to collaborate on this project in real-time`}
                </div>
              </div>
            </div>
            <button type="button" class="button button-outline button-small" data-action="open-collaborators-dialog" data-id="${project.id}" style="flex-shrink:0">
              ${isCollab ? `👥 Manage Team (${(project.coCreators || []).length + 1})` : `＋ Add Co-Creator`}
            </button>
          </div>
        </div>
      </div>
      <button class="dialog-close" data-action="close-dialog" aria-label="Close">×</button>
    </div>
    ${craftingBannerHtml}
    ${completionBannerHtml}
    ${project.isGift ? renderProjectDetailGiftBanner(project) : ""}
    <p class="detail-description">${escapeHTML(project.description || "No description yet.")}</p>
    <div class="detail-top">
      <div class="project-card-labels">
        <span class="status-pill status-${safeStatus(project.status)}">${STATUS_LABELS[safeStatus(project.status)]}</span>
        <span class="priority-pill priority-${safePriority(project.priority)}">${priorityLabel(project.priority)} priority</span>
        ${isCollab ? `<span class="collab-badge">👥 Collaborative</span>` : ""}
        ${(project.tags || []).map(tag => `<span class="mini-tag clickable" data-tag="${escapeHTML(tag)}">${escapeHTML(tag)}</span>`).join("")}
      </div>
      <button class="small-action" data-action="edit-project" data-id="${project.id}">Edit project</button>
    </div>
    ${skills.length ? `<div class="detail-skills">${skills.map(skill => `<span class="mini-tag clickable" data-skill-id="${skill.id}">${escapeHTML(skill.name)} · Level ${skillLevel(skill.xp)}</span>`).join("")}</div>` : ""}
    
    <div class="detail-section-heading">
      <div>
        <h3>Project checklist <span class="subtle-count">${progress.total ? `${progress.completed}/${progress.total} complete` : "Break it into steps"}</span></h3>
      </div>
    </div>
    ${progress.total ? `<div class="detail-task-progress"><div class="progress-track"><div class="progress-bar" style="width:${progress.percent}%"></div></div><span>${progress.percent}%</span></div>` : ""}

    <div class="project-phase-strip">
      <button type="button" class="phase-pill ${activePhase === "all" ? "active" : ""}" data-action="set-phase-filter" data-project="${project.id}" data-phase="all">
        All Steps (${allTasks.filter(t => t.done).length}/${allTasks.length})
      </button>
      ${phases.map(ph => {
        const phTasks = allTasks.filter(t => (t.phase || "") === ph);
        const phDone = phTasks.filter(t => t.done).length;
        return `
          <button type="button" class="phase-pill ${activePhase === ph ? "active" : ""}" data-action="set-phase-filter" data-project="${project.id}" data-phase="${escapeHTML(ph)}">
            ${escapeHTML(ph)} (${phDone}/${phTasks.length})${phDone === phTasks.length && phTasks.length > 0 ? " ✓" : ""}
          </button>
        `;
      }).join("")}
      <button type="button" class="phase-pill phase-add-btn" data-action="add-project-phase" data-project="${project.id}">＋ Phase</button>
    </div>

    <form class="inline-add-form task-add-form" data-project="${project.id}">
      <input name="taskText" required maxlength="140" placeholder="Add a next step..." aria-label="New checklist step">
      <input name="taskPhase" list="phase-options-${project.id}" placeholder="Phase (optional)" style="max-width:130px;font-size:12px" aria-label="Step phase" value="${activePhase !== "all" ? escapeHTML(activePhase) : ""}">
      <datalist id="phase-options-${project.id}">
        ${phases.map(ph => `<option value="${escapeHTML(ph)}">`).join("")}
      </datalist>
      <button type="button" class="small-action mic-btn" data-action="dictate-task" data-project="${project.id}" title="Voice dictate next step">🎙 Dictate</button>
      <button class="button button-outline" type="submit">＋ Add step</button>
    </form>
    ${visibleTasks.length ? `<ul class="task-list">${visibleTasks.map((task, idx) => `<li class="task-item ${task.done ? "is-done" : ""}"><label><input type="checkbox" data-action="toggle-task" data-project="${project.id}" data-id="${task.id}" ${task.done ? "checked" : ""}><span>${escapeHTML(task.text)}</span>${task.phase ? `<span class="mini-tag phase-tag">${escapeHTML(task.phase)}</span>` : ""}${task.completedBy ? `<span class="activity-author-tag">✓ ${escapeHTML(task.completedBy.name)}</span>` : ""}</label><div class="task-item-actions"><button type="button" class="task-action-btn" data-action="assign-task-phase" data-project="${project.id}" data-id="${task.id}" title="Assign build phase">🏷️</button>${idx > 0 ? `<button type="button" class="task-action-btn" data-action="move-task-up" data-project="${project.id}" data-id="${task.id}" title="Move up" aria-label="Move up">↑</button>` : ""}${idx < visibleTasks.length - 1 ? `<button type="button" class="task-action-btn" data-action="move-task-down" data-project="${project.id}" data-id="${task.id}" title="Move down" aria-label="Move down">↓</button>` : ""}<button type="button" class="task-action-btn" data-action="edit-task" data-project="${project.id}" data-id="${task.id}" title="Edit step" aria-label="Edit step">✎</button><button type="button" class="task-remove" data-action="delete-task" data-project="${project.id}" data-id="${task.id}" aria-label="Remove ${escapeHTML(task.text)}">×</button></div></li>`).join("")}</ul>` : `<div class="folder-empty">${activePhase !== "all" ? `No steps in "${escapeHTML(activePhase)}" phase yet. Add one above.` : "Add a few steps to make a big project feel manageable."}</div>`}
    ${budgetCardHtml}
    <div class="detail-section-heading">
      <div>
        <h3>Materials &amp; Supplies</h3>
        <span class="subtle-count">${materials.length ? `${materials.length} items · ${formatMoney(totalCost)} total` : "Track parts & build budget"}</span>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button type="button" class="small-action" data-action="check-materials-inventory" data-project="${project.id}" title="Auto-match supplies against shop inventory">📦 Shop Stock Match</button>
        <button type="button" class="small-action" data-action="add-missing-materials-to-restock" data-project="${project.id}" title="Send needed/out-of-stock items to Depot Restock List">🛒 Add Needed to Restock List</button>
        <button type="button" class="small-action" data-action="transfer-project-to-cutlist" data-id="${project.id}" title="Send lumber items to Workshop Cut List Optimizer">✂️ Send to Cut List</button>
        <button type="button" class="small-action" data-action="pick-from-inventory" data-project="${project.id}">📥 Add from inventory</button>
      </div>
    </div>
    ${materials.length ? `
      <div class="materials-summary-bar">
        <div><strong>Budget:</strong> ${formatMoney(totalCost)} total · <span class="materials-cost-total">${formatMoney(spentCost)} acquired</span></div>
        <div><span>${haveCount}/${materials.length} items in hand</span></div>
      </div>
    ` : ""}
    <datalist id="material-groups-datalist">
      <option value="Yarn &amp; Fibers">
      <option value="Sensors &amp; Modules">
      <option value="Lumber &amp; Sheet Goods">
      <option value="Fasteners &amp; Hardware">
      <option value="Finishes &amp; Adhesives">
      <option value="Electronics &amp; Wiring">
      <option value="3D Print &amp; Filament">
      <option value="Consumables &amp; Other">
    </datalist>
    <form class="materials-add-form" data-project="${project.id}">
      <input name="materialName" required maxlength="80" placeholder="Part or material name (e.g. 1/4&quot; Walnut ply, Merino wool, BME280)..." aria-label="Material name">
      <input name="materialGroup" list="material-groups-datalist" maxlength="40" placeholder="Group (e.g. Yarn, Sensors)..." aria-label="Group">
      <input name="materialQty" maxlength="30" placeholder="Qty (e.g. 2 pcs, 100g)" aria-label="Quantity">
      <input name="materialCost" type="number" step="0.01" min="0" placeholder="${getCurrencySymbol()} Price" aria-label="Price">
      <select name="materialStatus" aria-label="Status">
        <option value="need">Need to buy</option>
        <option value="ordered">Ordered</option>
        <option value="have">Have / In stock</option>
      </select>
      <button class="button button-primary" type="submit">＋ Add</button>
    </form>
    ${materials.length ? `
      ${(() => {
        const groups = Array.from(new Set(materials.map(m => m.group || inferMaterialGroup(m.name)))).filter(Boolean);
        const activeFilter = state.activeMaterialGroupFilter || "all";
        if (groups.length <= 1) return "";
        return `
          <div class="materials-filter-bar">
            <button type="button" class="materials-filter-pill ${activeFilter === "all" ? "active" : ""}" data-action="filter-material-group" data-group="all" data-project="${project.id}">All (${materials.length})</button>
            ${groups.map(grp => {
              const count = materials.filter(m => (m.group || inferMaterialGroup(m.name)) === grp).length;
              return `<button type="button" class="materials-filter-pill ${activeFilter === grp ? "active" : ""}" data-action="filter-material-group" data-group="${escapeHTML(grp)}" data-project="${project.id}">${getGroupIcon(grp)} ${escapeHTML(grp)} (${count})</button>`;
            }).join("")}
          </div>
        `;
      })()}
      <div class="materials-table-wrap">
        <table class="materials-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Group</th>
              <th>Qty</th>
              <th>Est. Cost</th>
              <th>Status</th>
              <th style="text-align:right">Action</th>
            </tr>
          </thead>
          <tbody>
            ${(() => {
              const activeFilter = state.activeMaterialGroupFilter || "all";
              const displayed = activeFilter === "all"
                ? materials
                : materials.filter(m => (m.group || inferMaterialGroup(m.name)) === activeFilter);
              return displayed.map(mat => {
                const grp = mat.group || inferMaterialGroup(mat.name);
                return `
                <tr>
                  <td><strong>${escapeHTML(mat.name)}</strong></td>
                  <td>
                    <span class="materials-group-badge ${getGroupBadgeClass(grp)}" data-action="edit-material-group" data-project="${project.id}" data-id="${mat.id}" title="Click to change group">
                      ${getGroupIcon(grp)} ${escapeHTML(grp)}
                    </span>
                  </td>
                  <td>${escapeHTML(mat.qty || "-")}</td>
                  <td>${Number(mat.cost) > 0 ? formatMoney(mat.cost) : "-"}</td>
                  <td>
                    <span class="materials-status-tag status-${mat.status || "need"}" data-action="cycle-material-status" data-project="${project.id}" data-id="${mat.id}" title="Click to cycle status">
                      ${mat.status === "have" ? "✓ Have / In stock" : mat.status === "ordered" ? "↗ Ordered" : "○ Need to buy"}
                    </span>
                    ${mat._stockStatus ? `<span class="materials-stock-badge ${mat._stockStatus.class}">${mat._stockStatus.text}</span>` : ""}
                  </td>
                  <td style="text-align:right">
                    <button type="button" class="task-remove" data-action="delete-material" data-project="${project.id}" data-id="${mat.id}" title="Remove material" aria-label="Remove material">×</button>
                  </td>
                </tr>
              `;
              }).join("");
            })()}
          </tbody>
        </table>
      </div>
    ` : `<div class="folder-empty"><span style="font-size:16px;margin-right:6px">🪵</span>No materials tracked yet. Add items and parts above to keep track of your build budget.</div>`}
    <div class="detail-section-heading">
      <div>
        <h3>Assigned Tools &amp; Equipment</h3>
        <span class="subtle-count">${assignedTools.length ? `${assignedTools.length} ${assignedTools.length === 1 ? "tool" : "tools"} in use for this build` : "Track machinery & tools checked out for this build"}</span>
      </div>
      <div>
        <button type="button" class="small-action" data-action="pick-from-inventory" data-project="${project.id}">⚙️ Check out tool from shop</button>
      </div>
    </div>
    ${assignedTools.length ? `
      <div class="inventory-project-tools-grid">
        ${assignedTools.map(t => `
          <div class="inventory-project-tool-card">
            <div class="inventory-project-tool-info">
              <span class="inventory-project-tool-name">⚙️ ${escapeHTML(t.name)}</span>
              <span class="inventory-project-tool-meta">${escapeHTML(t.brand || "")}${t.model ? ` · ${escapeHTML(t.model)}` : ""}${t.location ? ` · 📍 ${escapeHTML(t.location)}` : ""}</span>
            </div>
            <button type="button" class="inventory-checkin-btn" data-action="checkin-equipment" data-id="${t.id}" data-project="${project.id}" title="Return tool back to shop depot">↩ Return to shop</button>
          </div>
        `).join("")}
      </div>
    ` : `<div class="folder-empty"><span style="font-size:16px;margin-right:6px">⚙️</span>No tools currently checked out for this build. <button type="button" class="small-action" data-action="pick-from-inventory" data-project="${project.id}" style="margin-left:6px">＋ Check out from depot</button></div>`}
    <div class="detail-section-heading"><h3>Progress journal <span class="subtle-count">${notes.length ? `${notes.length} ${notes.length === 1 ? "entry" : "entries"}` : "Keep a note of the journey"}</span></h3></div>
    <form class="journal-add-form" data-project="${project.id}"><label class="sr-only" for="journal-entry">Progress note</label><textarea id="journal-entry" name="journalText" rows="2" required maxlength="1000" placeholder="What did you try, learn, or figure out today?"></textarea><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><span class="form-hint">A dated note, just for this project.</span><div style="display:flex;gap:6px"><button type="button" class="small-action mic-btn" data-action="dictate-note" data-project="${project.id}" title="Voice dictate note">🎙 Dictate</button><button type="button" class="small-action voice-record-btn" data-action="start-voice-memo" data-project="${project.id}" title="Record audio voice memo directly">🔴 Voice Memo</button><button class="button button-outline" type="submit">＋ Add note</button></div></div><div id="journal-voice-recording-indicator" style="display:none;margin-top:8px;padding:6px 12px;background:rgba(239,68,68,0.12);border:1px solid #ef4444;border-radius:6px;align-items:center;justify-content:space-between"><span class="voice-memo-recording-active" style="font-size:12px;color:#ef4444;font-weight:700">🔴 Recording audio memo... <span id="journal-voice-timer">00:00</span></span><button type="button" class="button button-small button-primary" data-action="stop-voice-memo">■ Stop &amp; Save</button></div></form>
    ${notes.length ? `<div class="journal-list">${[...notes].sort((a, b) => new Date(b.at) - new Date(a.at)).map(note => `<article class="journal-entry"><div class="journal-date">${formatFullDateTime(note.at)}</div><p>${escapeHTML(note.text)}</p>${safeMediaUrl(note.audioUrl) ? `<audio controls src="${safeMediaUrl(note.audioUrl)}" class="journal-audio-player"></audio>` : ""}<div class="journal-actions"><button type="button" class="journal-action-btn" data-action="edit-note" data-project="${project.id}" data-id="${note.id}" title="Edit progress note" aria-label="Edit progress note">✎</button><button type="button" class="task-remove" data-action="delete-note" data-project="${project.id}" data-id="${note.id}" aria-label="Delete progress note">×</button></div></article>`).join("")}</div>` : ""}
    ${isCollab ? `
      <div class="team-timeline-box">
        <div class="team-timeline-header">
          <span class="team-timeline-title">👥 Team Activity Timeline</span>
          <span style="font-size:11px;color:var(--muted)">${(project.coCreators || []).length + 1} members</span>
        </div>
        <div class="team-timeline-list">
          <div class="team-timeline-item">
            <span>👑 <strong>${escapeHTML(project.creator?.name || "Creator")}</strong> created project</span>
            <span style="color:var(--muted);font-size:11px">${relativeTime(project.createdAt || project.updatedAt)}</span>
          </div>
          ${(project.coCreators || []).map(c => {
            const rawRole = String(c.role || "editor").toLowerCase();
            const safeRole = (rawRole === "viewer") ? "viewer" : "editor";
            const roleLabel = safeRole === "viewer" ? "Viewer" : "Editor";
            return `
            <div class="team-timeline-item">
              <span>${safeRole === "editor" ? "✏️" : "👁️"} <strong>${escapeHTML(c.name || c.email || "Collaborator")}</strong> joined as ${roleLabel}</span>
              <span class="collab-role-pill role-${safeRole}">${roleLabel}</span>
            </div>
            `;
          }).join("")}
          ${project.lastStatusChange ? `
            <div class="team-timeline-item">
              <span>🔄 <strong>${escapeHTML(project.lastStatusChange.by)}</strong> changed status to <em>${STATUS_LABELS[safeStatus(project.status)]}</em></span>
              <span style="color:var(--muted);font-size:11px">${relativeTime(project.lastStatusChange.at)}</span>
            </div>
          ` : ""}
          ${notes.slice(0, 3).map(n => `
            <div class="team-timeline-item">
              <span>📝 Progress journal note logged</span>
              <span style="color:var(--muted);font-size:11px">${relativeTime(n.at)}</span>
            </div>
          `).join("")}
        </div>
      </div>
    ` : ""}
    <div class="detail-section-heading"><h3>Project photos</h3><div><button class="small-action" data-action="new-folder" data-id="${project.id}">＋ Folder</button> <button class="small-action" data-action="open-compare-photos" data-project="${project.id}">↔️ Compare</button> <button class="small-action" data-action="snap-photo" data-id="${project.id}">📷 Camera</button> <button class="small-action" data-action="add-photos" data-id="${project.id}">＋ Add photos</button></div></div>
    ${folders.map(folder => `<div class="folder-block"><div class="folder-heading"><div class="folder-title-wrap"><span class="folder-name-text">${escapeHTML(folder.name)}</span><button type="button" class="icon-link-btn" data-action="rename-folder" data-project="${project.id}" data-folder="${folder.id}" title="Rename folder" aria-label="Rename folder">✎</button>${folders.length > 1 ? `<button type="button" class="icon-link-btn danger-hover" data-action="delete-folder" data-project="${project.id}" data-folder="${folder.id}" title="Delete folder" aria-label="Delete folder">×</button>` : ""}</div><span>${folder.images.length} ${folder.images.length === 1 ? "photo" : "photos"} <button class="small-action" data-action="snap-photo" data-id="${project.id}" data-folder="${folder.id}">📷 Camera</button> <button class="small-action" data-action="add-photos" data-id="${project.id}" data-folder="${folder.id}">＋ Add</button></span></div>${folder.images.length ? `<div class="detail-photo-grid">${folder.images.map(image => `<div class="detail-photo" data-action="open-lightbox" data-image-id="${image.id}" data-caption="${escapeHTML(image.name)}" tabindex="0" role="button" aria-label="View photo ${escapeHTML(image.name)}"><img src="${imageUrl(image)}" alt="${escapeHTML(image.name)}"><button type="button" class="photo-annotate-badge" data-action="annotate-photo" data-image-id="${image.id}" title="Annotate photo" style="position:absolute;bottom:6px;left:6px;background:rgba(0,0,0,0.6);color:#fff;border:none;border-radius:4px;padding:2px 6px;font-size:10px;cursor:pointer">✏️</button><button class="remove-photo" data-action="remove-photo" data-project="${project.id}" data-folder="${folder.id}" data-image="${image.id}" aria-label="Remove ${escapeHTML(image.name)}">×</button></div>`).join("")}</div>` : `<div class="folder-empty">No photos here yet. Add photos to keep a record of your progress.</div>`}</div>`).join("")}
    ${(() => {
      const curUser = getActiveUser();
      const isCreator = isProjectCreator(project, curUser);
      const isAdmin = isCurrentUserAdmin();
      const isCollab = isCollaborativeProject(project);
      const isMemberOnly = isCollab && !isCreator && !isAdmin;
      return `<div class="detail-footer"><button class="${isMemberOnly ? "button button-outline danger-hover" : "danger-button"}" data-action="delete-project" data-id="${project.id}">${isMemberOnly ? "Leave project" : "Delete project"}</button><span class="project-card-meta">${projectImageCount(project)} photos · ${folders.length} ${folders.length === 1 ? "folder" : "folders"}</span></div>`;
    })()}
  </div>`;
}

const ACTIVE_VIEW_STORAGE_KEY = "workbench_active_view";
const VALID_APP_VIEWS = new Set(["overview", "projects", "ideas", "skills", "gallery", "planner", "sync", "timeline", "shopping", "inventory", "admin", "music", "woodworking", "textiles", "electronics", "programming", "art", "resin", "printing", "origami", "laser", "leather", "ceramics", "welding", "cnc", "blacksmith", "fasteners", "glass", "jewelry", "bookbinding", "sla", "luthier", "composites", "horology", "robotics", "bicycle", "candle", "perfume", "letter", "distillation"]);


function openProjectForm(project = null) {
  const form = $("#project-form");
  form.reset();
  delete form.dataset.templateTasks;
  delete form.dataset.templateMaterials;
  $("#project-dialog-title").textContent = project ? "Edit project" : "Create a project";
  form.elements.id.value = project?.id || "";
  form.elements.title.value = project?.title || "";
  form.elements.description.value = project?.description || "";
  form.elements.status.value = project ? safeStatus(project.status) : "";
  form.elements.targetDate.value = project?.targetDate || "";
  form.elements.priority.value = project?.priority || "";
  if (form.elements.budget) form.elements.budget.value = project?.budget ?? "";
  form.elements.tags.value = (project?.tags || []).join(", ");
  const templateWrap = $("#project-template-wrap");
  if (templateWrap) {
    templateWrap.style.display = project ? "none" : "";
    const templateSelect = $("#project-template-select");
    if (templateSelect) {
      const custom = state.customTemplates || [];
      const customOptions = custom.length
        ? `<optgroup label="My Custom Templates">${custom.map(t => `<option value="custom_${t.id}">⭐ ${escapeHTML(t.name)}</option>`).join("")}</optgroup>`
        : "";
      templateSelect.innerHTML = `
        <option value="">Custom / Start from scratch</option>
        <optgroup label="Standard Templates">
          <option value="woodworking">Woodworking &amp; Joinery</option>
          <option value="electronics">Electronics &amp; PCB</option>
          <option value="software">Software / Web App MVP</option>
          <option value="learning">Study &amp; Skill Practice</option>
          <option value="3dprint">3D Printing &amp; Design</option>
        </optgroup>
        ${customOptions}
      `;
      templateSelect.value = "";
    }
    const templateHint = $("#project-template-hint");
    if (templateHint) {
      templateHint.textContent = "";
      templateHint.style.display = "none";
    }
  }
  addProjectSkillOptions(project?.skillIds || []);
  const isGift = Boolean(project?.isGift);
  if (form.elements.isGift) form.elements.isGift.checked = isGift;
  const giftFields = $("#project-gift-fields");
  if (giftFields) giftFields.style.display = isGift ? "block" : "none";
  if (form.elements.giftRecipient) form.elements.giftRecipient.value = project?.giftRecipient || "";
  if (form.elements.giftOccasion) form.elements.giftOccasion.value = project?.giftOccasion || "birthday";
  if (form.elements.giftDeadline) form.elements.giftDeadline.value = project?.giftDeadline || "";
  if (form.elements.giftStatus) form.elements.giftStatus.value = project?.giftStatus || "planning";
  if (form.elements.giftCareNotes) form.elements.giftCareNotes.value = project?.giftCareNotes || "";
  if (form.elements.giftSecret) form.elements.giftSecret.checked = Boolean(project?.giftSecret);
  if (form.elements.giftBoxLength) form.elements.giftBoxLength.value = project?.giftBoxLength ?? "";
  if (form.elements.giftBoxWidth) form.elements.giftBoxWidth.value = project?.giftBoxWidth ?? "";
  if (form.elements.giftBoxHeight) form.elements.giftBoxHeight.value = project?.giftBoxHeight ?? "";

  const deleteBtn = $("#delete-project-btn");
  if (deleteBtn) {
    deleteBtn.classList.toggle("hidden", !project);
    deleteBtn.dataset.id = project?.id || "";
  }
  $("#project-dialog").showModal();
}

function openSkillForm(skill = null) {
  const form = $("#skill-form");
  form.reset();
  $("#skill-dialog-title").textContent = skill ? "Edit a skill" : "Add a skill";
  form.elements.id.value = skill?.id || "";
  form.elements.name.value = skill?.name || "";
  form.elements.category.value = skill?.category || "";
  const deleteBtn = $("#delete-skill-btn");
  if (deleteBtn) {
    deleteBtn.classList.toggle("hidden", !skill);
    deleteBtn.dataset.id = skill?.id || "";
  }
  $("#skill-dialog").showModal();
}

function openXpDialog(skillId, xp = "25", note = "") {
  const skill = state.skills.find(item => item.id === skillId);
  if (!skill) return;
  const form = $("#xp-form");
  form.reset();
  form.elements.skillId.value = skill.id;
  if (form.elements.xp && xp) form.elements.xp.value = xp;
  if (form.elements.note && note) form.elements.note.value = note;
  $("#xp-dialog").querySelector(".eyebrow").textContent = `PRACTICE MAKES PROGRESS · ${skill.name.toUpperCase()}`;
  $("#xp-dialog").showModal();
}

function openProjectDetail(id) {
  $("#day-summary-dialog")?.close();
  activeProjectId = id;
  renderProjectDetail(id);
  $("#detail-dialog").showModal();
}

function openFolderForm(projectId) {
  const form = $("#folder-form");
  form.reset();
  form.elements.projectId.value = projectId;
  $("#folder-dialog").showModal();
}

function beginPhotoUpload(projectId, folderId = null) {
  const project = state.projects.find(item => item.id === projectId);
  if (!project) return;
  if (!project.folders.length) project.folders.push({ id: uid(), name: "General", images: [] });
  activePhotoTarget = { projectId, folderId: folderId || project.folders[0].id };
  $("#photo-input").click();
}

function beginCameraCapture(projectId, folderId = null) {
  const project = state.projects.find(item => item.id === projectId);
  if (!project) return;
  if (!project.folders.length) project.folders.push({ id: uid(), name: "General", images: [] });
  activePhotoTarget = { projectId, folderId: folderId || project.folders[0].id };
  $("#camera-input").click();
}

function openTimeDialog(projectId) {
  const project = state.projects.find(p => p.id === projectId);
  if (!project) return;
  const form = $("#time-form");
  form.reset();
  form.elements.projectId.value = project.id;
  $("#time-dialog-title").textContent = `Log time · ${project.title}`;
  $("#time-dialog")?.showModal();
}

async function handlePhotoUpload(files) {
  if (!activePhotoTarget || !files.length) return;
  const project = state.projects.find(item => item.id === activePhotoTarget.projectId);
  const folder = project?.folders.find(item => item.id === activePhotoTarget.folderId);
  if (!project || !folder) return;
  const validFiles = [...files].filter(file => file.type.startsWith("image/"));
  if (validFiles.length !== files.length) showToast("Only image files can be added.");
  if (!validFiles.length) return;
  try {
    for (const file of validFiles) {
      const optimized = await optimizeImage(file);
      folder.images.push({ id: uid(), name: file.name, type: optimized.type, blob: optimized, addedAt: new Date().toISOString() });
    }
    project.updatedAt = new Date().toISOString();
    makeActivity("photo", `Added ${validFiles.length} ${validFiles.length === 1 ? "photo" : "photos"} to ${project.title}`);
    await persistState();
    render();
    if ($("#detail-dialog")?.open) renderProjectDetail(project.id);
    showToast(`${validFiles.length} ${validFiles.length === 1 ? "photo" : "photos"} added to ${folder.name}.`);
  } catch (error) {
    console.error("Unable to save project photos.", error);
    showToast("Could not save those photos. Try smaller images or free up browser storage.");
  } finally {
    activePhotoTarget = null;
    $("#photo-input").value = "";
    const cam = $("#camera-input");
    if (cam) cam.value = "";
  }
}

async function handleProjectSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const id = form.elements.id.value;
  const existing = state.projects.find(project => project.id === id);
  if (existing && !canUserEditProject(existing)) {
    showToast("Viewers have read-only access to this project.");
    return;
  }
  const skillIds = $$('input[name="skillIds"]:checked', form).map(input => input.value);
  const templateTasks = form.dataset.templateTasks ? JSON.parse(form.dataset.templateTasks) : [];
  const templateMaterials = form.dataset.templateMaterials ? JSON.parse(form.dataset.templateMaterials) : [];
  const maker = getCurrentMakerIdentity();
  const project = {
    id: existing?.id || uid(),
    title: form.elements.title.value.trim(),
    description: form.elements.description.value.trim(),
    status: safeStatus(form.elements.status.value),
    targetDate: form.elements.targetDate.value,
    priority: ["high", "normal", "low"].includes(form.elements.priority.value) ? form.elements.priority.value : "normal",
    budget: form.elements.budget?.value ? Number(form.elements.budget.value) : (existing?.budget || null),
    tags: [...new Set(form.elements.tags.value.split(",").map(tag => tag.trim()).filter(Boolean))],
    isGift: Boolean(form.elements.isGift?.checked),
    giftRecipient: form.elements.giftRecipient?.value.trim() || "",
    giftOccasion: form.elements.giftOccasion?.value || "birthday",
    giftDeadline: form.elements.giftDeadline?.value || "",
    giftStatus: form.elements.giftStatus?.value || "planning",
    giftCareNotes: form.elements.giftCareNotes?.value.trim() || "",
    giftSecret: Boolean(form.elements.giftSecret?.checked),
    giftBoxLength: form.elements.giftBoxLength?.value ? Number(form.elements.giftBoxLength.value) : null,
    giftBoxWidth: form.elements.giftBoxWidth?.value ? Number(form.elements.giftBoxWidth.value) : null,
    giftBoxHeight: form.elements.giftBoxHeight?.value ? Number(form.elements.giftBoxHeight.value) : null,
    skillIds,
    creator: existing?.creator || { id: maker.id, name: maker.name, email: maker.email },
    coCreators: existing?.coCreators || [],
    folders: existing?.folders || [{ id: uid(), name: "General", images: [] }],
    tasks: existing?.tasks || (templateTasks.length > 0 ? templateTasks.map(t => ({ id: uid(), text: t, done: false, createdAt: new Date().toISOString() })) : []),
    notes: existing?.notes || [],
    materials: existing?.materials || (templateMaterials.length > 0 ? templateMaterials.map(m => ({ id: uid(), name: m.name, qty: m.qty || "", cost: Number(m.cost) || 0, status: "need", createdAt: new Date().toISOString() })) : []),
    pinned: Boolean(existing?.pinned),
    timeSpent: Number.isFinite(existing?.timeSpent) ? existing.timeSpent : 0,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (existing && existing.status !== project.status) {
    project.lastStatusChange = {
      from: STATUS_LABELS[existing.status] || existing.status,
      to: STATUS_LABELS[project.status] || project.status,
      by: maker,
      at: new Date().toISOString()
    };
  } else if (existing?.lastStatusChange) {
    project.lastStatusChange = existing.lastStatusChange;
  }

  delete form.dataset.templateTasks;
  delete form.dataset.templateMaterials;
  if (!project.title) return;
  if (existing) Object.assign(existing, project);
  else state.projects.unshift(project);
  makeActivity("project", `${existing ? `${maker.name} updated` : `${maker.name} started`} ${project.title}`);
  syncSharedCollaborations();
  try {
    await persistState();
    $("#project-dialog").close();
    render();
    showToast(existing ? "Project updated." : "Project added to your workshop.");
  } catch (error) {
    console.error("Unable to save project.", error);
    showToast("Could not save your project. Please try again.");
  }
}

async function handleSkillSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const id = form.elements.id.value;
  const existing = state.skills.find(skill => skill.id === id);
  const skill = {
    id: existing?.id || uid(),
    name: form.elements.name.value.trim(),
    category: form.elements.category.value.trim(),
    xp: existing?.xp || 0,
    createdAt: existing?.createdAt || new Date().toISOString()
  };
  if (!skill.name) return;
  if (existing) Object.assign(existing, skill);
  else state.skills.push(skill);
  makeActivity("skill", `${existing ? "Updated" : "Added"} the ${skill.name} skill`);
  try {
    await persistState();
    $("#skill-dialog").close();
    render();
    showToast(existing ? "Skill updated." : "Skill added. Here’s to learning something new.");
  } catch (error) {
    console.error("Unable to save skill.", error);
    showToast("Could not save your skill. Please try again.");
  }
}

async function handleXpSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const skill = state.skills.find(item => item.id === form.elements.skillId.value);
  if (!skill) return;
  const oldLevel = skillLevel(skill.xp);
  const earned = Number(form.elements.xp.value);
  skill.xp += earned;
  const newLevel = skillLevel(skill.xp);
  const note = form.elements.note.value.trim();
  const activity = makeActivity("xp", `${skill.name} +${earned} XP${note ? ` · ${note}` : ""}${newLevel > oldLevel ? ` — Level ${newLevel}!` : ""}`, { skillId: skill.id, xp: earned });
  state.practiceLog.push(activity);
  try {
    await persistState();
    $("#xp-dialog").close();
    render();
    showToast(newLevel > oldLevel ? `${skill.name} reached Level ${newLevel}!` : `+${earned} XP added to ${skill.name}.`);
  } catch (error) {
    skill.xp -= earned;
    state.activity = state.activity.filter(item => item.id !== activity.id);
    state.practiceLog = state.practiceLog.filter(item => item.id !== activity.id);
    console.error("Unable to save skill progress.", error);
    showToast("Could not save that progress. Please try again.");
  }
}

async function handleFolderSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const project = state.projects.find(item => item.id === form.elements.projectId.value);
  const name = form.elements.name.value.trim();
  if (!project || !name) return;
  if (!canUserEditProject(project)) {
    showToast("Viewers have read-only access to this project.");
    return;
  }
  if (project.folders.some(folder => folder.name.toLowerCase() === name.toLowerCase())) {
    showToast("That project already has a folder with this name.");
    return;
  }
  project.folders.push({ id: uid(), name, images: [] });
  project.updatedAt = new Date().toISOString();
  try {
    await persistState();
    $("#folder-dialog").close();
    render();
    renderProjectDetail(project.id);
    showToast(`Folder “${name}” created.`);
  } catch (error) {
    console.error("Unable to save project folder.", error);
    showToast("Could not create that folder. Please try again.");
  }
}

async function handleProjectEntrySubmit(event) {
  const form = event.target;
  if (!form.matches(".task-add-form, .journal-add-form, .materials-add-form")) return;
  event.preventDefault();
  const project = state.projects.find(item => item.id === form.dataset.project);
  if (!project) return;
  if (!canUserEditProject(project)) {
    showToast("Viewers have read-only access to this project.");
    return;
  }
  if (form.matches(".materials-add-form")) {
    const name = form.elements.materialName.value.trim();
    if (!name) return;
    const qty = form.elements.materialQty?.value.trim() || "";
    const cost = parseFloat(form.elements.materialCost?.value) || 0;
    const status = form.elements.materialStatus?.value || "need";
    const groupVal = form.elements.materialGroup?.value.trim();
    const group = groupVal || inferMaterialGroup(name);
    project.materials = Array.isArray(project.materials) ? project.materials : [];
    project.materials.push({
      id: uid(),
      name,
      qty,
      cost,
      status,
      group: group || "General Supplies",
      createdAt: new Date().toISOString()
    });
    project.updatedAt = new Date().toISOString();
    makeActivity("project", `Added ${name} (${group}) to materials for ${project.title}`);
    try {
      await persistState();
      form.reset();
      render();
      renderProjectDetail(project.id);
      showToast(`Added “${name}” to ${group}.`);
    } catch (error) {
      console.error(error);
      showToast("Could not save material item.");
    }
    return;
  }
  const isTask = form.matches(".task-add-form");
  const text = form.elements[isTask ? "taskText" : "journalText"].value.trim();
  if (!text) return;
  const maker = getCurrentMakerIdentity();
  if (isTask) {
    const phaseVal = form.elements["taskPhase"] ? form.elements["taskPhase"].value.trim() : "";
    project.tasks.push({ id: uid(), text, phase: phaseVal || undefined, done: false, createdAt: new Date().toISOString(), createdBy: maker });
    makeActivity("task", `${maker.name} added a step to ${project.title}`);
  } else {
    const at = new Date().toISOString();
    project.notes.push({ id: uid(), text, at, author: maker });
    makeActivity("note", `${maker.name} added a progress note to ${project.title}`);
  }
  project.updatedAt = new Date().toISOString();
  syncSharedCollaborations();
  try {
    await persistState();
    form.reset();
    render();
    renderProjectDetail(project.id);
    showToast(isTask ? "Checklist step added." : "Progress note saved.");
  } catch (error) {
    console.error("Unable to save project progress.", error);
    showToast("Could not save that update. Please try again.");
  }
}

async function handleTaskToggle(input) {
  const project = state.projects.find(item => item.id === input.dataset.project);
  const task = project?.tasks.find(item => item.id === input.dataset.id);
  if (!project || !task) return;
  if (!canUserEditProject(project)) {
    input.checked = !input.checked;
    showToast("Viewers have read-only access to this project.");
    return;
  }
  task.done = input.checked;
  const maker = getCurrentMakerIdentity();
  if (input.checked) {
    task.completedBy = {
      id: maker.id,
      name: maker.name,
      email: maker.email,
      at: new Date().toISOString()
    };
    task.completedAt = task.completedBy.at;
    makeActivity("project", `${maker.name} completed "${task.text}" on ${project.title}`);
  } else {
    delete task.completedBy;
    task.completedAt = null;
  }
  project.updatedAt = new Date().toISOString();
  syncSharedCollaborations();
  try {
    await persistState();
    render();
    renderProjectDetail(project.id);
    if (task.done && projectTaskProgress(project).completed === projectTaskProgress(project).total) {
      showToast("Every checklist step is done. Nicely made!");
    }
  } catch (error) {
    task.done = !input.checked;
    input.checked = task.done;
    console.error("Unable to update checklist progress.", error);
    showToast("Could not update that step. Please try again.");
  }
}


/* 📋 Project View Mode & Kanban Board */
function setProjectViewMode(mode) {
  projectViewMode = mode;
  try {
    localStorage.setItem("workbench-project-mode", mode);
  } catch (e) {
    console.warn(e);
  }
  renderProjects();
}

let isDraggingKanbanCard = false;

function renderKanban(projects) {
  const kanban = $("#project-kanban");
  if (!kanban) return;

  const statuses = [
    { key: "planned", label: "Planned", badgeClass: "status-planned" },
    { key: "in-progress", label: "In Progress", badgeClass: "status-in-progress" },
    { key: "on-hold", label: "On Hold", badgeClass: "status-on-hold" },
    { key: "completed", label: "Completed", badgeClass: "status-completed" }
  ];

  kanban.innerHTML = statuses.map(st => {
    const colProjects = projects.filter(p => safeStatus(p.status) === st.key);
    return `
      <div class="kanban-column" data-status="${st.key}">
        <div class="kanban-col-head">
          <div class="kanban-col-title-wrap">
            <span class="status-pill ${st.badgeClass}">${st.label}</span>
            <span class="kanban-count">${colProjects.length}</span>
          </div>
        </div>
        <div class="kanban-dropzone" data-status="${st.key}">
          ${colProjects.length ? colProjects.map(project => {
            const progress = projectTaskProgress(project);
            return `
              <div class="kanban-card ${project.pinned ? "is-pinned" : ""}" draggable="true" data-project="${escapeHTML(project.id)}" tabindex="0" role="button" aria-label="Open ${escapeHTML(project.title)}">
                <div class="kanban-card-top">
                  <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                    <span class="priority-pill priority-${safePriority(project.priority)}">${priorityLabel(project.priority)}</span>
                    ${isCollaborativeProject(project) ? `<span class="collab-badge" style="font-size:10px;padding:1px 5px">👥 Team</span>${(() => {
                      const ur = getProjectUserRole(project);
                      return ur ? `<span class="collab-role-pill ${ur.className}" style="font-size:9.5px;padding:1px 5px">${ur.label}</span>` : "";
                    })()}` : ""}
                    ${project.pinned ? `<span class="pin-badge">📌</span>` : ""}
                    ${project.isGift ? `<span class="gift-badge-mini" title="Handmade gift for ${escapeHTML(project.giftRecipient || "Someone")}">🎁 ${escapeHTML(project.giftRecipient || "Gift")}</span>` : ""}
                  </div>
                  <div class="kanban-card-quickshift" onclick="event.stopPropagation()">
                    <select class="kanban-shift-select" data-project="${escapeHTML(project.id)}" title="Move project status" aria-label="Move project status">
                      <option value="" disabled selected>Move ▾</option>
                      ${statuses.filter(s => s.key !== st.key).map(s => `<option value="${s.key}">→ ${s.label}</option>`).join("")}
                    </select>
                  </div>
                </div>
                <h4 class="kanban-card-title">${escapeHTML(project.title)}</h4>
                ${project.description ? `<p class="kanban-card-desc">${escapeHTML(project.description)}</p>` : ""}
                ${progress.total ? `
                  <div class="card-task-progress">
                    <div class="progress-track"><div class="progress-bar" style="width:${progress.percent}%"></div></div>
                    <span>${progress.completed}/${progress.total}</span>
                  </div>
                ` : ""}
                <div class="kanban-card-meta">
                  ${project.timeSpent ? `<span>⏱️ ${formatMinutes(project.timeSpent)}</span>` : ""}
                  ${project.materials?.length ? `<span>📦 ${project.materials.length} parts</span>` : ""}
                  <span style="margin-left:auto;font-size:10px;color:var(--muted)">⠿ Drag to move</span>
                </div>
              </div>
            `;
          }).join("") : `<div class="kanban-empty-drop">Drop projects here</div>`}
        </div>
      </div>
    `;
  }).join("");

  setupKanbanDragDrop(kanban);
}

function setupKanbanDragDrop(kanban) {
  let draggedProjectId = null;
  const dragDepthMap = new Map();

  kanban.querySelectorAll(".kanban-card[draggable='true']").forEach(card => {
    card.addEventListener("dragstart", event => {
      isDraggingKanbanCard = true;
      draggedProjectId = card.dataset.project;
      card.classList.add("is-dragging");
      event.dataTransfer.setData("text/plain", draggedProjectId);
      event.dataTransfer.effectAllowed = "move";
    });

    card.addEventListener("dragend", () => {
      card.classList.remove("is-dragging");
      kanban.querySelectorAll(".kanban-dropzone, .kanban-column").forEach(dz => dz.classList.remove("drag-over"));
      setTimeout(() => {
        isDraggingKanbanCard = false;
      }, 150);
    });
  });

  kanban.querySelectorAll(".kanban-column").forEach(column => {
    const status = column.dataset.status;
    if (!status) return;

    column.addEventListener("dragover", event => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      column.classList.add("drag-over");
      const dropzone = column.querySelector(".kanban-dropzone");
      if (dropzone) dropzone.classList.add("drag-over");
    });

    column.addEventListener("dragenter", event => {
      event.preventDefault();
      const count = (dragDepthMap.get(column) || 0) + 1;
      dragDepthMap.set(column, count);
      column.classList.add("drag-over");
      const dropzone = column.querySelector(".kanban-dropzone");
      if (dropzone) dropzone.classList.add("drag-over");
    });

    column.addEventListener("dragleave", () => {
      const count = Math.max(0, (dragDepthMap.get(column) || 1) - 1);
      dragDepthMap.set(column, count);
      if (count === 0) {
        column.classList.remove("drag-over");
        const dropzone = column.querySelector(".kanban-dropzone");
        if (dropzone) dropzone.classList.remove("drag-over");
      }
    });

    column.addEventListener("drop", async event => {
      event.preventDefault();
      dragDepthMap.set(column, 0);
      kanban.querySelectorAll(".drag-over").forEach(el => el.classList.remove("drag-over"));

      const pid = event.dataTransfer.getData("text/plain") || draggedProjectId;
      if (!pid || !status) return;

      const project = state.projects.find(p => p.id === pid);
      if (!project) return;
      if (project.status === status) return;

      const oldStatus = project.status;
      project.status = status;
      const maker = getCurrentMakerIdentity();
      const makerName = maker.name || maker.displayName || "Maker";
      project.lastStatusChange = {
        from: STATUS_LABELS[oldStatus] || oldStatus,
        to: STATUS_LABELS[status] || status,
        by: makerName,
        at: new Date().toISOString()
      };
      project.updatedAt = new Date().toISOString();
      syncSharedCollaborations();

      makeActivity("project", `${makerName} moved ${project.title} to ${STATUS_LABELS[status] || status}`);
      if (status === "completed") {
        addNotification({
          title: `Project Complete: ${project.title}`,
          message: `Great job! You finished ${project.title}.`,
          icon: "🎯",
          type: "project"
        });
      }
      try {
        await persistState();
        render();
        showToast(`Moved to ${STATUS_LABELS[status] || status}!`);
      } catch (e) {
        console.error(e);
      }
    });
  });

  kanban.querySelectorAll(".kanban-shift-select").forEach(sel => {
    sel.addEventListener("change", async event => {
      event.stopPropagation();
      const pid = sel.dataset.project;
      const targetStatus = sel.value;
      if (!targetStatus) return;
      const project = state.projects.find(p => p.id === pid);
      if (!project || project.status === targetStatus) return;

      const oldStatus = project.status;
      project.status = targetStatus;
      const maker = getCurrentMakerIdentity();
      project.lastStatusChange = {
        from: STATUS_LABELS[oldStatus] || oldStatus,
        to: STATUS_LABELS[targetStatus] || targetStatus,
        by: maker,
        at: new Date().toISOString()
      };
      project.updatedAt = new Date().toISOString();
      syncSharedCollaborations();

      makeActivity("project", `${maker.name} moved ${project.title} to ${STATUS_LABELS[targetStatus] || targetStatus}`);
      if (targetStatus === "completed") {
        addNotification({
          title: `Project Complete: ${project.title}`,
          message: `Great job! You finished ${project.title}.`,
          icon: "🎯",
          type: "project"
        });
      }
      try {
        await persistState();
        render();
        showToast(`Moved to ${STATUS_LABELS[targetStatus] || targetStatus}!`);
      } catch (e) {
        console.error(e);
      }
    });
    sel.addEventListener("click", e => e.stopPropagation());
  });
}


function openProjectQR(projectId) {
  const project = state.projects.find(p => p.id === projectId);
  if (!project) return;

  const dialog = $("#qr-dialog");
  const body = $("#qr-dialog-body");
  if (!dialog || !body) return;

  const url = `${window.location.origin}${window.location.pathname}#project=${project.id}`;

  let qrSvg = "";
  if (window.QR && typeof window.QR.toSVG === "function") {
    qrSvg = window.QR.toSVG(url, { cellSize: 4, margin: 1 });
  } else {
    qrSvg = `<div style="padding:20px;text-align:center;color:#888;">Generating QR...</div>`;
  }

  const tasks = project.tasks || [];
  const completedTasks = tasks.filter(t => t.done).length;
  const isCollab = (project.coCreators || []).length > 0;

  body.innerHTML = `
    <div class="qr-bin-label" id="printable-qr-label">
      <div class="qr-label-qr-side">
        <div class="qr-label-code-wrap">
          ${qrSvg}
        </div>
        <span class="qr-label-scan-tip">Scan for Steps &amp; Journal</span>
      </div>
      <div class="qr-label-info-side">
        <div>
          <div class="qr-label-eyebrow">WORKBENCH · PROJECT BIN</div>
          <h2 class="qr-label-title">${escapeHTML(project.title)}</h2>
          <div class="qr-label-badges">
            <span class="status-pill status-${safeStatus(project.status)}">${STATUS_LABELS[safeStatus(project.status)]}</span>
            <span class="priority-pill priority-${safePriority(project.priority)}">${priorityLabel(project.priority)}</span>
            ${isCollab ? `<span class="collab-badge">👥 Team (${(project.coCreators || []).length + 1})</span>` : ""}
          </div>
          <div style="font-size:11px;color:#4b5563;margin-bottom:6px">
            ${tasks.length ? `${completedTasks}/${tasks.length} steps complete` : "Break into steps"} · ⏱ ${formatMinutes(project.timeSpent || 0)}
          </div>
        </div>
        <div class="qr-label-url">
          ID: ${project.id.slice(0, 8)} · ${escapeHTML(url)}
        </div>
      </div>
    </div>
    <div style="margin-top:14px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
      <button type="button" class="button button-small button-outline" id="copy-qr-url-btn">📋 Copy Project Link</button>
      <button type="button" class="button button-small button-primary" data-action="print-qr-label">🖶 Print Bin Label</button>
    </div>
  `;

  body.querySelector("#copy-qr-url-btn")?.addEventListener("click", () => {
    navigator.clipboard.writeText(url).then(() => showToast("Copied project URL!"));
  });

  dialog.showModal();
}

function printQRLabel() {
  window.print();
}


/* ↔️ Before & After Photo Comparison Slider */
function openComparePhotos(projectId) {
  const project = state.projects.find(p => p.id === projectId);
  if (!project) return;

  const allImages = [];
  for (const f of (project.folders || [])) {
    for (const img of (f.images || [])) {
      allImages.push(img);
    }
  }

  if (allImages.length < 2) {
    showToast("Need at least 2 photos in this project to compare progress.");
    return;
  }

  const dialog = $("#compare-dialog");
  const selBefore = $("#compare-select-before");
  const selAfter = $("#compare-select-after");
  const imgBefore = $("#compare-img-before");
  const imgAfter = $("#compare-img-after");
  const range = $("#compare-range");
  const layerBefore = $("#compare-layer-before");
  const handle = $("#compare-handle");

  if (!dialog || !selBefore || !selAfter || !imgBefore || !imgAfter) return;

  const options = allImages.map((img, i) => `<option value="${img.id}">${escapeHTML(img.name || `Photo #${i + 1}`)}</option>`).join("");
  selBefore.innerHTML = options;
  selAfter.innerHTML = options;

  selBefore.value = allImages[0].id;
  selAfter.value = allImages[allImages.length - 1].id;

  const updateImages = () => {
    const beforeItem = allImages.find(img => img.id === selBefore.value);
    const afterItem = allImages.find(img => img.id === selAfter.value);
    if (beforeItem) imgBefore.src = imageUrl(beforeItem);
    if (afterItem) imgAfter.src = imageUrl(afterItem);
  };

  const updateSlider = (val) => {
    if (layerBefore) layerBefore.style.width = `${val}%`;
    if (handle) handle.style.left = `${val}%`;
  };

  selBefore.onchange = updateImages;
  selAfter.onchange = updateImages;

  if (range) {
    range.value = "50";
    range.oninput = () => updateSlider(range.value);
  }

  updateImages();
  updateSlider(50);

  const viewport = $("#compare-viewport");
  if (viewport && !viewport.dataset.eventsAttached) {
    viewport.dataset.eventsAttached = "true";
    const handleMove = (clientX) => {
      const rect = viewport.getBoundingClientRect();
      const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      if (range) range.value = pct;
      updateSlider(pct);
    };

    let isDragging = false;
    viewport.onmousedown = (e) => { isDragging = true; handleMove(e.clientX); };
    window.addEventListener("mousemove", (e) => { if (isDragging) handleMove(e.clientX); });
    window.addEventListener("mouseup", () => { isDragging = false; });

    viewport.ontouchstart = (e) => { if (e.touches[0]) handleMove(e.touches[0].clientX); };
    viewport.ontouchmove = (e) => { if (e.touches[0]) handleMove(e.touches[0].clientX); };
  }

  dialog.showModal();
}

/* ✏️ Quick Photo Annotation Studio */
const annotateState = {
  activeImage: null,
  activeProject: null,
  activeFolder: null,
  tool: "pen",
  color: "#e53e3e",
  size: 4,
  isDrawing: false,
  startX: 0,
  startY: 0,
  history: [],
  baseImage: null
};

function openAnnotateDialog(imageId) {
  if (!imageId) return;

  let foundProject = null;
  let foundFolder = null;
  let foundImage = null;

  for (const p of state.projects) {
    for (const f of (p.folders || [])) {
      const img = (f.images || []).find(i => i.id === imageId);
      if (img) {
        foundProject = p;
        foundFolder = f;
        foundImage = img;
        break;
      }
    }
    if (foundImage) break;
  }

  if (!foundImage) {
    showToast("Photo not found.");
    return;
  }

  annotateState.activeImage = foundImage;
  annotateState.activeProject = foundProject;
  annotateState.activeFolder = foundFolder;
  annotateState.history = [];

  const dialog = $("#annotate-dialog");
  const canvas = $("#annotate-canvas");
  if (!dialog || !canvas) return;

  const ctx = canvas.getContext("2d");
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    const maxWidth = 900;
    const maxHeight = 650;
    let w = img.naturalWidth || 800;
    let h = img.naturalHeight || 600;

    const scale = Math.min(maxWidth / w, maxHeight / h, 1);
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    annotateState.baseImage = img;
    saveAnnotateHistory();
  };
  img.src = imageUrl(foundImage);

  initAnnotationToolbar();
  initAnnotationCanvasEvents();

  dialog.showModal();
}

function saveAnnotateHistory() {
  const canvas = $("#annotate-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  annotateState.history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  if (annotateState.history.length > 20) annotateState.history.shift();
}

function undoAnnotation() {
  if (annotateState.history.length <= 1) return;
  annotateState.history.pop();
  const prev = annotateState.history[annotateState.history.length - 1];
  const canvas = $("#annotate-canvas");
  const ctx = canvas?.getContext("2d");
  if (ctx && prev) {
    ctx.putImageData(prev, 0, 0);
  }
}

function clearAnnotation() {
  if (!annotateState.baseImage) return;
  const canvas = $("#annotate-canvas");
  const ctx = canvas?.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(annotateState.baseImage, 0, 0, canvas.width, canvas.height);
  annotateState.history = [];
  saveAnnotateHistory();
}

function initAnnotationToolbar() {
  const dialog = $("#annotate-dialog");
  if (!dialog) return;

  dialog.querySelectorAll(".annotate-tools-group [data-tool]").forEach(btn => {
    btn.onclick = () => {
      dialog.querySelectorAll(".annotate-tools-group [data-tool]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      annotateState.tool = btn.dataset.tool;
    };
  });

  dialog.querySelectorAll(".annotate-color-group [data-color]").forEach(btn => {
    btn.onclick = () => {
      dialog.querySelectorAll(".annotate-color-group [data-color]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      annotateState.color = btn.dataset.color;
    };
  });

  dialog.querySelectorAll(".annotate-size-group [data-size]").forEach(btn => {
    btn.onclick = () => {
      dialog.querySelectorAll(".annotate-size-group [data-size]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      annotateState.size = parseInt(btn.dataset.size, 10);
    };
  });
}

function initAnnotationCanvasEvents() {
  const canvas = $("#annotate-canvas");
  if (!canvas || canvas.dataset.eventsAttached) return;
  canvas.dataset.eventsAttached = "true";

  const ctx = canvas.getContext("2d");
  let snapshot = null;

  const getCanvasCoords = (e) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    annotateState.isDrawing = true;
    const pt = getCanvasCoords(e);
    annotateState.startX = pt.x;
    annotateState.startY = pt.y;
    snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (annotateState.tool === "pen") {
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
      ctx.strokeStyle = annotateState.color;
      ctx.lineWidth = annotateState.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
  };

  const draw = (e) => {
    if (!annotateState.isDrawing) return;
    e.preventDefault();
    const pt = getCanvasCoords(e);

    if (annotateState.tool === "pen") {
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    } else {
      ctx.putImageData(snapshot, 0, 0);
      ctx.strokeStyle = annotateState.color;
      ctx.fillStyle = annotateState.color;
      ctx.lineWidth = annotateState.size;
      ctx.lineCap = "round";

      if (annotateState.tool === "rect") {
        ctx.strokeRect(annotateState.startX, annotateState.startY, pt.x - annotateState.startX, pt.y - annotateState.startY);
      } else if (annotateState.tool === "circle") {
        const rx = Math.abs(pt.x - annotateState.startX) / 2;
        const ry = Math.abs(pt.y - annotateState.startY) / 2;
        const cx = Math.min(annotateState.startX, pt.x) + rx;
        const cy = Math.min(annotateState.startY, pt.y) + ry;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (annotateState.tool === "arrow") {
        drawArrow(ctx, annotateState.startX, annotateState.startY, pt.x, pt.y, annotateState.size * 3.5);
      } else if (annotateState.tool === "dimension") {
        drawAnnotateDimensionLine(ctx, annotateState.startX, annotateState.startY, pt.x, pt.y);
      }
    }
  };

  const endDraw = (e) => {
    if (!annotateState.isDrawing) return;
    annotateState.isDrawing = false;

    if (annotateState.tool === "dimension") {
      const label = window.prompt("Enter dimension label (e.g. 24\", 50mm, 3/4\"):")?.trim();
      if (label) {
        const pt = getCanvasCoords(e);
        drawDimensionText(ctx, annotateState.startX, annotateState.startY, pt.x, pt.y, label);
      }
    }

    saveAnnotateHistory();
  };

  canvas.addEventListener("mousedown", startDraw);
  canvas.addEventListener("mousemove", draw);
  canvas.addEventListener("mouseup", endDraw);
  canvas.addEventListener("touchstart", startDraw, { passive: false });
  canvas.addEventListener("touchmove", draw, { passive: false });
  canvas.addEventListener("touchend", endDraw);
}

function drawArrow(ctx, fromX, fromY, toX, toY, headLength) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const angle = Math.atan2(dy, dx);
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

function drawAnnotateDimensionLine(ctx, fromX, fromY, toX, toY) {
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  const dx = toX - fromX;
  const dy = toY - fromY;
  const angle = Math.atan2(dy, dx) + Math.PI / 2;
  const tickLen = 8;

  ctx.beginPath();
  ctx.moveTo(fromX - tickLen * Math.cos(angle), fromY - tickLen * Math.sin(angle));
  ctx.lineTo(fromX + tickLen * Math.cos(angle), fromY + tickLen * Math.sin(angle));
  ctx.moveTo(toX - tickLen * Math.cos(angle), toY - tickLen * Math.sin(angle));
  ctx.lineTo(toX + tickLen * Math.cos(angle), toY + tickLen * Math.sin(angle));
  ctx.stroke();
}

function drawDimensionText(ctx, fromX, fromY, toX, toY, label) {
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2;
  ctx.save();
  ctx.font = "bold 14px sans-serif";
  const metrics = ctx.measureText(label);
  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.fillRect(midX - metrics.width / 2 - 4, midY - 10, metrics.width + 8, 20);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, midX, midY);
  ctx.restore();
}

async function saveAnnotatedPhoto() {
  const canvas = $("#annotate-canvas");
  if (!canvas || !annotateState.activeProject) return;

  canvas.toBlob(async (blob) => {
    if (!blob) {
      showToast("Could not export annotated image.");
      return;
    }

    const folder = annotateState.activeFolder || annotateState.activeProject.folders[0];
    const newImage = {
      id: uid(),
      name: `[Marked Up] ${annotateState.activeImage?.name || "Photo"}`,
      type: "image/jpeg",
      blob
    };

    folder.images.unshift(newImage);
    annotateState.activeProject.updatedAt = new Date().toISOString();
    makeActivity("photo", `Added annotated photo to ${annotateState.activeProject.title}`);

    try {
      await persistState();
      $("#annotate-dialog")?.close();
      render();
      if ($("#detail-dialog")?.open) renderProjectDetail(annotateState.activeProject.id);
      showToast("Annotated photo saved to project!");
    } catch (e) {
      console.error(e);
      showToast("Could not save annotated photo.");
    }
  }, "image/jpeg", 0.92);
}


/* 📑 Printable Project Dossier / Build Log */
function openProjectDossier(projectId) {
  const project = state.projects.find(p => p.id === projectId);
  if (!project) return;

  const dialog = $("#dossier-dialog");
  const sheet = $("#dossier-sheet");
  if (!dialog || !sheet) return;

  const progress = projectTaskProgress(project);
  const skills = projectSkillNames(project);
  const materials = project.materials || [];
  const totalCost = materials.reduce((s, m) => s + (Number(m.cost) || 0), 0);
  const allImages = (project.folders || []).flatMap(f => f.images || []);

  const url = `${window.location.origin}${window.location.pathname}#project=${project.id}`;
  const qrSvg = window.QR?.toSVG ? window.QR.toSVG(url, { cellSize: 3, margin: 1 }) : "";

  sheet.innerHTML = `
    <div class="dossier-header-row">
      <div class="dossier-header-main">
        <div class="eyebrow">WORKBENCH BUILD DOSSIER · ${escapeHTML(project.id.slice(0, 8))}</div>
        <h1 class="dossier-title">${escapeHTML(project.title)}</h1>
        <div class="dossier-meta-tags">
          <span class="status-pill status-${safeStatus(project.status)}">${STATUS_LABELS[safeStatus(project.status)]}</span>
          <span class="priority-pill priority-${safePriority(project.priority)}">${priorityLabel(project.priority)} priority</span>
          ${skills.map(s => `<span class="mini-tag">${escapeHTML(s.name)}</span>`).join("")}
          ${(project.tags || []).map(t => `<span class="mini-tag">#${escapeHTML(t)}</span>`).join("")}
        </div>
      </div>
      <div class="dossier-qr-col">
        ${qrSvg}
        <span class="dossier-qr-label">Digital Log</span>
      </div>
    </div>

    <div class="dossier-stats-strip">
      <div class="dossier-stat-box"><strong>${progress.completed}/${progress.total}</strong><span>Steps (${progress.percent}%)</span></div>
      <div class="dossier-stat-box"><strong>${project.timeSpent ? formatMinutes(project.timeSpent) : "0m"}</strong><span>Time Invested</span></div>
      <div class="dossier-stat-box"><strong>${formatMoney(totalCost)}</strong><span>Supplies Budget</span></div>
      <div class="dossier-stat-box"><strong>${allImages.length}</strong><span>Photos Logged</span></div>
    </div>

    ${project.description ? `
      <div class="dossier-section">
        <h2>Project Overview</h2>
        <p class="dossier-description">${escapeHTML(project.description)}</p>
      </div>
    ` : ""}

    ${project.tasks?.length ? `
      <div class="dossier-section">
        <h2>Build Checklist &amp; Milestones</h2>
        <ul class="dossier-tasks-list">
          ${project.tasks.map(t => `
            <li class="${t.done ? "is-done" : ""}">
              <span class="dossier-checkbox">${t.done ? "☑" : "☐"}</span>
              <span class="dossier-task-text">${escapeHTML(t.text)}</span>
            </li>
          `).join("")}
        </ul>
      </div>
    ` : ""}

    ${materials.length ? `
      <div class="dossier-section">
        <h2>Bill of Materials &amp; Supplies</h2>
        <table class="dossier-table">
          <thead><tr><th>Item</th><th>Qty</th><th>Status</th><th style="text-align:right">Cost</th></tr></thead>
          <tbody>
            ${materials.map(m => `
              <tr>
                <td><strong>${escapeHTML(m.name)}</strong></td>
                <td>${escapeHTML(m.qty || "—")}</td>
                <td>${m.status === "have" ? "In Hand" : m.status === "ordered" ? "Ordered" : "Need"}</td>
                <td style="text-align:right">${Number(m.cost) > 0 ? formatMoney(m.cost) : "—"}</td>
              </tr>
            `).join("")}
          </tbody>
          <tfoot>
            <tr><td colspan="3"><strong>Total Budget</strong></td><td style="text-align:right"><strong>${formatMoney(totalCost)}</strong></td></tr>
          </tfoot>
        </table>
      </div>
    ` : ""}

    ${project.notes?.length ? `
      <div class="dossier-section">
        <h2>Journal &amp; Progress Notes</h2>
        <div class="dossier-timeline">
          ${project.notes.slice(-8).reverse().map(n => `
            <div class="dossier-note-entry">
              <span class="dossier-note-time">${formatFullDateTime(n.at)}</span>
              <div class="dossier-note-text">${escapeHTML(n.text)}</div>
            </div>
          `).join("")}
        </div>
      </div>
    ` : ""}

    ${allImages.length ? `
      <div class="dossier-section dossier-photos-section">
        <h2>Build Photos</h2>
        <div class="dossier-gallery">
          ${allImages.slice(0, 6).map(img => `
            <div class="dossier-photo-card">
              <img src="${imageUrl(img)}" alt="${escapeHTML(img.name)}">
              <span>${escapeHTML(img.name)}</span>
            </div>
          `).join("")}
        </div>
      </div>
    ` : ""}

    <div class="dossier-footer">
      <span>Exported on ${new Date().toLocaleDateString()} from Workbench Project Journal</span>
      <span>${escapeHTML(url)}</span>
    </div>
  `;

  dialog.showModal();
}

function printDossier() {
  window.print();
}

/* ============================================================

/* ⭐ Save Custom Project Templates */
function openSaveTemplateDialog(projectId) {
  const project = state.projects.find(p => p.id === projectId);
  if (!project) return;

  const form = $("#template-form");
  const dialog = $("#template-dialog");
  if (!form || !dialog) return;

  form.reset();
  form.elements.projectId.value = project.id;
  form.elements.name.value = `${project.title} Template`;
  form.elements.description.value = project.description || "";

  dialog.showModal();
}

async function handleTemplateSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const projectId = form.elements.projectId.value;
  const project = state.projects.find(p => p.id === projectId);
  if (!project) return;

  const templateName = form.elements.name.value.trim();
  if (!templateName) return;

  const customTpl = {
    id: uid(),
    name: templateName,
    description: form.elements.description.value.trim(),
    tasks: (project.tasks || []).map(t => t.text),
    materials: (project.materials || []).map(m => ({ name: m.name, qty: m.qty, cost: m.cost })),
    skillNames: projectSkillNames(project).map(s => s.name),
    tags: project.tags || [],
    createdAt: new Date().toISOString()
  };

  state.customTemplates = state.customTemplates || [];
  state.customTemplates.push(customTpl);

  try {
    await persistState();
    $("#template-dialog")?.close();
    showToast(`Saved "${templateName}" to custom templates!`);
  } catch (e) {
    console.error(e);
    showToast("Could not save template.");
  }
}


/* ==========================================================================
   4. Shareable Project Showcase & Before/After Comparison
   ========================================================================== */
let activeShowcaseProjectId = null;

function generateProjectMarkdown(project) {
  if (!project) return "";
  const progress = projectTaskProgress(project);
  const skills = projectSkillNames(project).map(s => s.name);
  const materials = project.materials || [];
  const totalCost = materials.reduce((s, m) => s + (Number(m.cost) || 0), 0);
  const spentCost = materials.filter(m => m.status === "have" || m.status === "ordered").reduce((s, m) => s + (Number(m.cost) || 0), 0);

  const lines = [
    `# 🛠️ ${project.title}`,
    `> **Status:** ${STATUS_LABELS[safeStatus(project.status)]} | **Priority:** ${priorityLabel(project.priority)}`,
    project.targetDate ? `> **Target Date:** ${formatDate(project.targetDate)}` : "",
    project.timeSpent ? `> **Time Invested:** ${formatMinutes(project.timeSpent)}` : "",
    materials.length ? `> **Supplies Budget:** ${formatMoney(totalCost)} (${formatMoney(spentCost)} acquired)` : "",
    skills.length ? `> **Skills Involved:** ${skills.join(", ")}` : "",
    "",
    project.description ? `### About this build\n${project.description}\n` : "",
    project.tasks?.length ? `### Checklist & Process\n` + project.tasks.map(t => `- [${t.done ? "x" : " "}] ${t.text}`).join("\n") + "\n" : "",
    materials.length ? `### Materials & Supplies\n` + materials.map(m => `- ${m.name}${m.qty ? ` (${m.qty})` : ""}${Number(m.cost) > 0 ? ` — ${formatMoney(m.cost)}` : ""} [${m.status === "have" ? "In hand" : m.status === "ordered" ? "Ordered" : "To buy"}]`).join("\n") + "\n" : "",
    project.notes?.length ? `### Progress Journal Notes\n` + [...project.notes].sort((a,b) => new Date(b.at) - new Date(a.at)).map(n => `- **${formatDate(n.at)}:** ${n.text}`).join("\n") + "\n" : "",
    `---\n*Created with [Workbench](https://github.com) — Maker Project Journal*`
  ];
  return lines.filter(line => line !== null).join("\n");
}

function openProjectShowcase(projectId) {
  const project = state.projects.find(p => p.id === projectId);
  if (!project) return;
  activeShowcaseProjectId = project.id;

  const dialog = $("#showcase-dialog");
  const sheet = $("#showcase-sheet");
  const titleEl = $("#showcase-title");
  if (!dialog || !sheet) return;

  if (titleEl) titleEl.textContent = `🌟 ${project.title} — Showcase`;

  const materials = project.materials || [];
  const totalCost = materials.reduce((s, m) => s + (Number(m.cost) || 0), 0);
  const spentCost = materials.filter(m => m.status === "have" || m.status === "ordered").reduce((s, m) => s + (Number(m.cost) || 0), 0);
  const progress = projectTaskProgress(project);
  const skills = projectSkillNames(project);
  const images = (project.folders || []).flatMap(f => f.images || []);

  sheet.innerHTML = `
    <div class="showcase-sheet">
      <div class="showcase-hero" style="padding:20px;background:var(--surface);border-radius:8px;border:1px solid var(--line)">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap">
          <div>
            <div class="eyebrow">${safeStatus(project.status).toUpperCase()} · ${priorityLabel(project.priority).toUpperCase()} PRIORITY</div>
            <h1 style="font-size:24px;font-weight:700;margin:4px 0 8px;color:var(--ink)">${escapeHTML(project.title)}</h1>
            <p style="font-size:14px;color:var(--muted);line-height:1.5;max-width:600px">${escapeHTML(project.description || "A custom crafted project documented in Workbench.")}</p>
          </div>
          <span class="status-pill status-${safeStatus(project.status)}" style="font-size:13px;padding:6px 12px">${STATUS_LABELS[safeStatus(project.status)]}</span>
        </div>
        ${skills.length ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px">${skills.map(s => `<span class="mini-tag">${escapeHTML(s.name)} · Level ${skillLevel(s.xp)}</span>`).join("")}</div>` : ""}
      </div>

      <div class="showcase-metrics-bar">
        <div class="showcase-metric-box">
          <span class="showcase-metric-label">Time Invested</span>
          <span class="showcase-metric-val">⏱ ${formatMinutes(project.timeSpent || 0)}</span>
        </div>
        <div class="showcase-metric-box">
          <span class="showcase-metric-label">Total Cost</span>
          <span class="showcase-metric-val">${formatMoney(totalCost)}</span>
        </div>
        <div class="showcase-metric-box">
          <span class="showcase-metric-label">Checklist Steps</span>
          <span class="showcase-metric-val">${progress.completed} of ${progress.total || project.tasks?.length || 0}</span>
        </div>
        <div class="showcase-metric-box">
          <span class="showcase-metric-label">Build Photos</span>
          <span class="showcase-metric-val">▧ ${images.length}</span>
        </div>
      </div>

      ${images.length >= 2 ? `
        <div style="margin:8px 0">
          <div class="panel-heading" style="margin-bottom:8px">
            <div>
              <div class="eyebrow">VISUAL PROGRESSION</div>
              <h3 style="font-size:15px;font-weight:700">Before &amp; After Photo Comparison</h3>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div style="position:relative;border-radius:8px;overflow:hidden;border:1px solid var(--line);background:var(--surface)">
              <span style="position:absolute;top:8px;left:8px;background:rgba(0,0,0,0.7);color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:4px;z-index:2">BEFORE / RAW</span>
              <img src="${imageUrl(images[0])}" alt="Before" style="width:100%;height:220px;object-fit:cover;display:block">
              <div style="padding:6px 10px;font-size:11px;color:var(--muted)">${escapeHTML(images[0].name)}</div>
            </div>
            <div style="position:relative;border-radius:8px;overflow:hidden;border:1px solid var(--line);background:var(--surface)">
              <span style="position:absolute;top:8px;left:8px;background:rgba(16,185,129,0.9);color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:4px;z-index:2">AFTER / FINISHED</span>
              <img src="${imageUrl(images[images.length - 1])}" alt="After" style="width:100%;height:220px;object-fit:cover;display:block">
              <div style="padding:6px 10px;font-size:11px;color:var(--muted)">${escapeHTML(images[images.length - 1].name)}</div>
            </div>
          </div>
        </div>
      ` : images.length === 1 ? `
        <div style="border-radius:8px;overflow:hidden;border:1px solid var(--line);max-height:300px">
          <img src="${imageUrl(images[0])}" alt="${escapeHTML(images[0].name)}" style="width:100%;height:300px;object-fit:cover;display:block">
        </div>
      ` : ""}

      ${project.tasks?.length ? `
        <div>
          <h4 style="font-size:13px;font-weight:700;text-transform:uppercase;color:var(--muted);letter-spacing:0.5px;margin-bottom:8px">Build Steps &amp; Process</h4>
          <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:6px">
            ${project.tasks.map(t => `
              <li style="display:flex;align-items:center;gap:8px;font-size:13px">
                <span style="color:${t.done ? "#10b981" : "var(--muted)"};font-weight:700">${t.done ? "✓" : "○"}</span>
                <span style="${t.done ? "" : "color:var(--muted)"}">${escapeHTML(t.text)}</span>
              </li>
            `).join("")}
          </ul>
        </div>
      ` : ""}

      ${materials.length ? `
        <div>
          <h4 style="font-size:13px;font-weight:700;text-transform:uppercase;color:var(--muted);letter-spacing:0.5px;margin-bottom:8px">Materials &amp; Supplies Used</h4>
          <div class="materials-table-wrap">
            <table class="materials-table">
              <thead>
                <tr><th>Item</th><th>Qty</th><th>Cost</th><th>Status</th></tr>
              </thead>
              <tbody>
                ${materials.map(m => `
                  <tr>
                    <td><strong>${escapeHTML(m.name)}</strong></td>
                    <td>${escapeHTML(m.qty || "-")}</td>
                    <td>${Number(m.cost) > 0 ? formatMoney(m.cost) : "-"}</td>
                    <td>${m.status === "have" ? "Acquired" : m.status === "ordered" ? "Ordered" : "Planned"}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      ` : ""}

      <div class="no-print showcase-markdown-section">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px">
          <h4 style="font-size:13px;font-weight:700;text-transform:uppercase;color:var(--muted);letter-spacing:0.5px;margin:0">Shareable Markdown Summary (for forums &amp; GitHub)</h4>
          <button type="button" class="button button-outline button-small" data-action="print-formatted-markdown" data-id="${project.id}" title="Print as formatted document">🖶 Print Markdown Document</button>
        </div>
        <pre class="showcase-markdown-preview" id="showcase-md-content">${escapeHTML(generateProjectMarkdown(project))}</pre>
      </div>
    </div>
  `;

  dialog.showModal();
}

async function copyShowcaseMarkdown() {
  const project = state.projects.find(p => p.id === activeShowcaseProjectId);
  if (!project) return;
  const md = generateProjectMarkdown(project);
  try {
    await navigator.clipboard.writeText(md);
    showToast("Showcase markdown copied to clipboard!");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = md;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    showToast("Showcase markdown copied to clipboard!");
  }
}

function printShowcase() {
  window.print();
}

/* ==========================================================================
   5. Maker Goals & Visual Milestone Roadmaps
   ========================================================================== */

if (typeof window !== "undefined") {
  window.openProjectForm = openProjectForm;
  window.handleProjectSubmit = handleProjectSubmit;
  window.openProjectDetail = openProjectDetail;
  window.renderKanban = renderKanban;
  window.setProjectViewMode = setProjectViewMode;
}
