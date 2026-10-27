/* ============================================================
   Workbench Project Journal - Workshop Tools, Inventory & Calculators
   ============================================================ */

/* ============================================================
   🎙️ Hands-Free Workshop Voice Memos (Local Audio Recording)
   ============================================================ */
let journalMediaRecorder = null;
let journalAudioChunks = [];
let journalRecordStartTime = 0;
let journalRecordTimerInterval = null;

async function startJournalVoiceMemo(projectId) {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast("Audio recording is not supported in this browser.");
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    journalAudioChunks = [];
    journalMediaRecorder = new MediaRecorder(stream);

    journalMediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) journalAudioChunks.push(e.data);
    };

    journalMediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      const audioBlob = new Blob(journalAudioChunks, { type: "audio/webm" });
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result;
        const durationSec = Math.max(1, Math.round((Date.now() - journalRecordStartTime) / 1000));
        await saveVoiceMemoNote(projectId, base64Data, durationSec);
      };
      reader.readAsDataURL(audioBlob);
    };

    journalRecordStartTime = Date.now();
    journalMediaRecorder.start();

    const ind = $("#journal-voice-recording-indicator");
    if (ind) ind.style.display = "flex";
    const timerLbl = $("#journal-voice-timer");
    if (timerLbl) timerLbl.textContent = "00:00";

    if (journalRecordTimerInterval) clearInterval(journalRecordTimerInterval);
    journalRecordTimerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - journalRecordStartTime) / 1000);
      const m = Math.floor(elapsed / 60).toString().padStart(2, "0");
      const s = (elapsed % 60).toString().padStart(2, "0");
      if (timerLbl) timerLbl.textContent = `${m}:${s}`;
    }, 1000);

    showToast("🔴 Recording audio memo... Speak your note.");
  } catch (err) {
    console.error(err);
    showToast("Microphone access denied or unavailable.");
  }
}

function stopJournalVoiceMemo() {
  if (journalMediaRecorder && journalMediaRecorder.state !== "inactive") {
    journalMediaRecorder.stop();
  }
  if (journalRecordTimerInterval) {
    clearInterval(journalRecordTimerInterval);
    journalRecordTimerInterval = null;
  }
  const ind = $("#journal-voice-recording-indicator");
  if (ind) ind.style.display = "none";
}

async function saveVoiceMemoNote(projectId, audioDataUrl, durationSec) {
  const project = state.projects.find(p => p.id === projectId);
  if (!project) return;
  if (!Array.isArray(project.notes)) project.notes = [];

  const m = Math.floor(durationSec / 60);
  const s = (durationSec % 60).toString().padStart(2, "0");
  const timeStr = `${m}:${s}`;

  const note = {
    id: "note-" + uid(),
    text: `🎙️ Voice Memo (${timeStr})`,
    audioUrl: audioDataUrl,
    audioDuration: durationSec,
    at: new Date().toISOString()
  };

  project.notes.unshift(note);
  project.updatedAt = new Date().toISOString();
  await persistState();
  renderProjectDetail(project.id);
  showToast(`Attached ${timeStr} audio voice memo to journal!`);
}

try {
  applyTheme(getSavedTheme());
} catch {}

const selectedSkillFilters = new Set();
const selectedTimelineSkillFilters = new Set();
const selectedTagFilters = new Set();

function renderSkillFilterPills() {
  const container = $("#project-skill-pills");
  if (!container) return;
  if (!state.skills.length) {
    container.innerHTML = "";
    return;
  }
  const isAll = selectedSkillFilters.size === 0;
  let html = `<button type="button" class="skill-pill ${isAll ? "active" : ""}" data-action="filter-skill-all">All skills</button>`;
  for (const skill of state.skills) {
    const isSelected = selectedSkillFilters.has(skill.id);
    html += `<button type="button" class="skill-pill ${isSelected ? "active" : ""}" data-action="filter-skill-toggle" data-skill-id="${escapeHTML(skill.id)}"><span class="pill-spark">✳</span>${escapeHTML(skill.name)}</button>`;
  }
  container.innerHTML = html;
}

function renderTagFilterPills() {
  const container = $("#project-tag-pills");
  if (!container) return;
  const tagCounts = new Map();
  for (const project of state.projects) {
    for (const tag of (project.tags || [])) {
      if (!tag) continue;
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }
  if (!tagCounts.size) {
    container.innerHTML = "";
    container.style.display = "none";
    return;
  }
  container.style.display = "flex";
  const isAll = selectedTagFilters.size === 0;
  let html = `<button type="button" class="skill-pill ${isAll ? "active" : ""}" data-action="filter-tag-all">All tags</button>`;
  const sortedTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  for (const [tag, count] of sortedTags) {
    const isSelected = selectedTagFilters.has(tag);
    html += `<button type="button" class="skill-pill ${isSelected ? "active" : ""}" data-action="filter-tag-toggle" data-tag="${escapeHTML(tag)}">#${escapeHTML(tag)}<span class="pill-count">${count}</span></button>`;
  }
  container.innerHTML = html;
}

function renderTimelineSkillFilterPills() {
  const container = $("#timeline-skill-pills");
  if (!container) return;
  if (!state.skills.length) {
    container.innerHTML = "";
    return;
  }
  const isAll = selectedTimelineSkillFilters.size === 0;
  let html = `<button type="button" class="skill-pill ${isAll ? "active" : ""}" data-action="timeline-skill-all">All skills</button>`;
  for (const skill of state.skills) {
    const isSelected = selectedTimelineSkillFilters.has(skill.id);
    html += `<button type="button" class="skill-pill ${isSelected ? "active" : ""}" data-action="timeline-skill-toggle" data-skill-id="${escapeHTML(skill.id)}"><span class="pill-spark">✳</span>${escapeHTML(skill.name)}</button>`;
  }
  container.innerHTML = html;
}

function projectSkillNames(project) {
  return (project.skillIds || []).map(id => state.skills.find(skill => skill.id === id)).filter(Boolean);
}

function obfuscateStoredKey(str) {
  try {
    if (!str || typeof str !== "string") return "";
    const encoded = btoa(unescape(encodeURIComponent(str)));
    return "wbo_" + encoded.split("").reverse().join("");
  } catch {
    return str;
  }
}

function deobfuscateStoredKey(str) {
  try {
    if (!str || typeof str !== "string") return "";
    if (str.startsWith("wbo_")) {
      const reversed = str.slice(4).split("").reverse().join("");
      return decodeURIComponent(escape(atob(reversed)));
    }
    return str;
  } catch {
    return str;
  }
}


/* Workshop Reference & Tools */
function openToolsDialog() {
  const filterInput = $("#studio-quick-filter");
  if (filterInput) {
    filterInput.value = "";
    $$("#studio-quick-btn-grid button").forEach(el => el.classList.remove("hidden-studio"));
  }
  renderFractionChart();
  updateEpoxyCalc();
  populateUnitDropdowns($("#tool-unit-category")?.value || "length");
  updateUniversalUnitConverter();
  $("#tools-dialog")?.showModal();
}

function switchToolTab(tab) {
  $$(".tool-tab-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.toolTab === tab));
  $$(".tool-tab-panel").forEach(panel => {
    panel.style.display = panel.id === ("tool-panel-" + tab) ? "block" : "none";
  });
  if (tab === "epoxy") updateEpoxyCalc();
  if (tab === "units") {
    populateUnitDropdowns($("#tool-unit-category")?.value || "length");
    updateUniversalUnitConverter();
  }
}

const UNIT_CATEGORIES = {
  length: {
    name: "Length & Distance",
    units: {
      in: { name: "Inches (in)", factor: 0.0254 },
      ft: { name: "Feet (ft)", factor: 0.3048 },
      yd: { name: "Yards (yd)", factor: 0.9144 },
      mm: { name: "Millimeters (mm)", factor: 0.001 },
      cm: { name: "Centimeters (cm)", factor: 0.01 },
      m: { name: "Meters (m)", factor: 1.0 },
      km: { name: "Kilometers (km)", factor: 1000.0 },
      mi: { name: "Miles (mi)", factor: 1609.344 }
    },
    defaultFrom: "in",
    defaultTo: "mm"
  },
  weight: {
    name: "Weight & Mass",
    units: {
      oz: { name: "Ounces (oz)", factor: 0.0283495 },
      lb: { name: "Pounds (lb)", factor: 0.453592 },
      g: { name: "Grams (g)", factor: 0.001 },
      kg: { name: "Kilograms (kg)", factor: 1.0 },
      ton: { name: "Metric Tonnes", factor: 1000.0 }
    },
    defaultFrom: "lb",
    defaultTo: "kg"
  },
  volume: {
    name: "Liquid Volume",
    units: {
      floz: { name: "Fluid Ounces (fl oz)", factor: 0.0295735 },
      cup: { name: "US Cups", factor: 0.236588 },
      pt: { name: "Pints (pt)", factor: 0.473176 },
      qt: { name: "Quarts (qt)", factor: 0.946353 },
      gal: { name: "Gallons (gal)", factor: 3.78541 },
      ml: { name: "Milliliters (ml)", factor: 0.001 },
      l: { name: "Liters (L)", factor: 1.0 },
      tbsp: { name: "Tablespoons (tbsp)", factor: 0.0147868 },
      tsp: { name: "Teaspoons (tsp)", factor: 0.00492892 }
    },
    defaultFrom: "floz",
    defaultTo: "ml"
  },
  temp: {
    name: "Temperature",
    units: {
      c: { name: "Celsius (°C)" },
      f: { name: "Fahrenheit (°F)" },
      k: { name: "Kelvin (K)" }
    },
    defaultFrom: "f",
    defaultTo: "c"
  }
};

function populateUnitDropdowns(catKey) {
  const cat = UNIT_CATEGORIES[catKey] || UNIT_CATEGORIES.length;
  const fromSel = $("#tool-unit-from");
  const toSel = $("#tool-unit-to");
  if (!fromSel || !toSel || !cat) return;

  const prevFrom = fromSel.value;
  const prevTo = toSel.value;

  const html = Object.keys(cat.units).map(key => `<option value="${key}">${cat.units[key].name}</option>`).join("");
  fromSel.innerHTML = html;
  toSel.innerHTML = html;

  fromSel.value = cat.units[prevFrom] ? prevFrom : cat.defaultFrom;
  toSel.value = cat.units[prevTo] ? prevTo : cat.defaultTo;
}

function updateUniversalUnitConverter() {
  const catKey = $("#tool-unit-category")?.value || "length";
  const val = parseFloat($("#tool-unit-val")?.value);
  const fromKey = $("#tool-unit-from")?.value;
  const toKey = $("#tool-unit-to")?.value;
  const res = $("#tool-unit-result");
  if (!res) return;

  if (isNaN(val)) {
    res.innerHTML = '<span style="color:var(--muted);font-size:12px">Enter a measurement above to calculate conversion.</span>';
    return;
  }

  const cat = UNIT_CATEGORIES[catKey];
  if (!cat) return;

  let converted = 0;
  if (catKey === "temp") {
    let degC = val;
    if (fromKey === "f") degC = (val - 32) * (5 / 9);
    else if (fromKey === "k") degC = val - 273.15;

    if (toKey === "c") converted = degC;
    else if (toKey === "f") converted = (degC * 9 / 5) + 32;
    else if (toKey === "k") converted = degC + 273.15;
  } else {
    const fromFactor = cat.units[fromKey]?.factor || 1;
    const toFactor = cat.units[toKey]?.factor || 1;
    const baseVal = val * fromFactor;
    converted = baseVal / toFactor;
  }

  const precision = Math.abs(converted) >= 100 ? 2 : Math.abs(converted) >= 1 ? 3 : 5;
  const fromName = cat.units[fromKey]?.name || fromKey;
  const toName = cat.units[toKey]?.name || toKey;

  res.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <span style="font-size:11px;font-weight:700;color:var(--muted)">CONVERTED VALUE:</span>
      <strong style="font-size:18px;color:var(--green)">${converted.toFixed(precision)} ${toName.split("(")[0].trim()}</strong>
    </div>
    <div style="font-size:12px;color:var(--ink);line-height:1.4">
      • <strong>${val} ${fromName}</strong> = <strong>${converted.toFixed(precision)} ${toName}</strong><br>
      ${catKey === "length" && fromKey === "in" && typeof toNearestFraction === "function" ? `• Nearest Fractional Inch: <strong>${toNearestFraction(val)}"</strong>` : ""}
    </div>
  `;
}

function parseFraction(str) {
  if (str == null) return NaN;
  str = String(str).trim();
  if (!str) return NaN;

  const isNeg = str.startsWith("-");
  const sign = isNeg ? -1 : 1;
  const cleanStr = isNeg ? str.slice(1).trim() : str;

  const mixedMatch = cleanStr.match(/^(\d+)\s+([0-9]+)\/([0-9]+)$/);
  if (mixedMatch) {
    const whole = parseFloat(mixedMatch[1]);
    const num = parseFloat(mixedMatch[2]);
    const den = parseFloat(mixedMatch[3]);
    return den ? sign * (whole + num / den) : NaN;
  }
  const fracMatch = cleanStr.match(/^([0-9]+)\/([0-9]+)$/);
  if (fracMatch) {
    const num = parseFloat(fracMatch[1]);
    const den = parseFloat(fracMatch[2]);
    return den ? sign * (num / den) : NaN;
  }
  return parseFloat(str);
}

function decimalToFraction(val) {
  if (!Number.isFinite(val) || val < 0) return "";
  const whole = Math.floor(val);
  const frac = val - whole;
  if (frac < 0.0078125) return whole ? `${whole}"` : `0"`;
  const sixtyFourths = Math.round(frac * 64);
  if (sixtyFourths === 64) return `${whole + 1}"`;
  let num = sixtyFourths;
  let den = 64;
  while (num % 2 === 0 && den % 2 === 0) {
    num /= 2;
    den /= 2;
  }
  return whole > 0 ? `${whole} ${num}/${den}"` : `${num}/${den}"`;
}

function updateFractionCalc(source) {
  const fracInput = $("#tool-calc-fraction");
  const decInput = $("#tool-calc-decimal");
  const mmInput = $("#tool-calc-mm");
  const resultBox = $("#tool-fraction-nearest");
  if (!fracInput || !decInput || !mmInput) return;

  let inches = NaN;
  if (source === "fraction") {
    inches = parseFraction(fracInput.value);
    if (Number.isFinite(inches)) {
      decInput.value = inches.toFixed(4).replace(/\.?0+$/, "");
      mmInput.value = (inches * 25.4).toFixed(3).replace(/\.?0+$/, "");
    }
  } else if (source === "decimal") {
    inches = parseFloat(decInput.value);
    if (Number.isFinite(inches)) {
      fracInput.value = decimalToFraction(inches).replace(/"$/, "");
      mmInput.value = (inches * 25.4).toFixed(3).replace(/\.?0+$/, "");
    }
  } else if (source === "mm") {
    const mm = parseFloat(mmInput.value);
    if (Number.isFinite(mm)) {
      inches = mm / 25.4;
      decInput.value = inches.toFixed(4).replace(/\.?0+$/, "");
      fracInput.value = decimalToFraction(inches).replace(/"$/, "");
    }
  }

  if (Number.isFinite(inches) && inches >= 0) {
    const mmVal = inches * 25.4;
    const whole = Math.floor(inches);
    const frac = inches - whole;
    const n16 = Math.round(frac * 16);
    const n32 = Math.round(frac * 32);
    const n64 = Math.round(frac * 64);
    resultBox.innerHTML = `
      <div><strong>Exact:</strong> ${inches.toFixed(4)}" = ${mmVal.toFixed(3)} mm</div>
      <div style="margin-top:6px;color:#707469;font-size:11px">
        <strong>Nearest fractions:</strong>
        1/16" ➔ <code>${whole ? `${whole} ` : ""}${n16}/16"</code> &nbsp;|&nbsp;
        1/32" ➔ <code>${whole ? `${whole} ` : ""}${n32}/32"</code> &nbsp;|&nbsp;
        1/64" ➔ <code>${whole ? `${whole} ` : ""}${n64}/64"</code>
      </div>
    `;
  } else {
    resultBox.innerHTML = `Enter a measurement above to see bidirectional conversion and fractional breakdown.`;
  }
}

const COMMON_FRACTIONS = [
  { frac: "1/16", dec: 0.0625, mm: 1.588 },
  { frac: "1/8", dec: 0.1250, mm: 3.175 },
  { frac: "3/16", dec: 0.1875, mm: 4.763 },
  { frac: "1/4", dec: 0.2500, mm: 6.350 },
  { frac: "5/16", dec: 0.3125, mm: 7.938 },
  { frac: "3/8", dec: 0.3750, mm: 9.525 },
  { frac: "7/16", dec: 0.4375, mm: 11.113 },
  { frac: "1/2", dec: 0.5000, mm: 12.700 },
  { frac: "9/16", dec: 0.5625, mm: 14.288 },
  { frac: "5/8", dec: 0.6250, mm: 15.875 },
  { frac: "11/16", dec: 0.6875, mm: 17.463 },
  { frac: "3/4", dec: 0.7500, mm: 19.050 },
  { frac: "13/16", dec: 0.8125, mm: 20.638 },
  { frac: "7/8", dec: 0.8750, mm: 22.225 },
  { frac: "15/16", dec: 0.9375, mm: 23.813 },
  { frac: "1", dec: 1.0000, mm: 25.400 }
];

function renderFractionChart() {
  const container = $("#tools-fraction-chart");
  if (!container || container.children.length) return;
  container.innerHTML = COMMON_FRACTIONS.map(item => `
    <div class="tools-chart-cell" data-action="load-fraction" data-frac="${item.frac}">
      <strong>${item.frac}"</strong>
      <span>${item.dec.toFixed(4)}" · ${item.mm.toFixed(1)}mm</span>
    </div>
  `).join("");
}

function updateScaleCalc() {
  const origInput = $("#tool-scale-original");
  const presetSelect = $("#tool-scale-preset");
  const customInput = $("#tool-scale-custom");
  const customWrap = $("#tool-scale-custom-wrap");
  const resultBox = $("#tool-scale-result");
  if (!origInput || !presetSelect || !resultBox) return;

  const orig = parseFloat(origInput.value);
  const preset = presetSelect.value;
  if (customWrap) customWrap.style.display = preset === "custom" ? "block" : "none";

  let factor = 1;
  if (preset === "1:12") factor = 1 / 12;
  else if (preset === "1:24") factor = 1 / 24;
  else if (preset === "1:48") factor = 1 / 48;
  else if (preset === "1:72") factor = 1 / 72;
  else if (preset === "custom") factor = parseFloat(customInput.value) || 1;
  else factor = parseFloat(preset) || 1;

  if (Number.isFinite(orig) && orig > 0) {
    const scaled = orig * factor;
    resultBox.innerHTML = `
      <div><strong>Scaled dimension:</strong> <span style="font-size:16px;color:var(--green);font-weight:700">${scaled.toFixed(3)}</span> (at ${(factor * 100).toFixed(1)}% scale)</div>
      <div style="margin-top:6px;color:#707469;font-size:11px">Original: ${orig} ➔ Scaled: ${scaled.toFixed(3)} (Scale factor: ${factor.toFixed(5)})</div>
    `;
  } else {
    resultBox.innerHTML = `Enter an original dimension to see scaled results.`;
  }
}

function updateBoardFeetCalc() {
  const thick = parseFloat($("#tool-bf-thick")?.value) || 0;
  const width = parseFloat($("#tool-bf-width")?.value) || 0;
  const length = parseFloat($("#tool-bf-length")?.value) || 0;
  const qty = parseInt($("#tool-bf-qty")?.value, 10) || 1;
  const price = parseFloat($("#tool-bf-price")?.value) || 0;
  const resultBox = $("#tool-bf-result");
  if (!resultBox) return;

  if (thick > 0 && width > 0 && length > 0) {
    const bfPerBoard = (thick * width * length) / 12;
    const totalBf = bfPerBoard * qty;
    const totalCost = totalBf * price;
    resultBox.innerHTML = `
      <div><strong>Total Board Feet:</strong> <span style="font-size:16px;color:var(--green);font-weight:700">${totalBf.toFixed(2)} BF</span> (${bfPerBoard.toFixed(2)} BF per board)</div>
      ${price > 0 ? `<div style="margin-top:6px"><strong>Estimated Cost:</strong> ${formatMoney(totalCost)} (${formatMoney(price)}/BF)</div>` : `<div style="margin-top:6px;color:#888;font-size:11px">Tip: Enter price per BF to calculate total lumber purchase estimate.</div>`}
    `;
  } else {
    resultBox.innerHTML = `Adjust board dimensions above to compute board footage and estimated material cost.`;
  }
}


/* Activity & Journal Timeline */
function getTimelineEvents() {
  const events = [];

  for (const project of state.projects) {
    const skillIds = project.skillIds || [];
    const skillNames = projectSkillNames(project).map(s => s.name);

    events.push({
      id: `proj-${project.id}`,
      rawId: project.id,
      type: "project",
      badgeLabel: "Project",
      badgeClass: "badge-project",
      title: project.title,
      text: project.description ? `Status: ${STATUS_LABELS[safeStatus(project.status)]} · ${project.description}` : `Project marked as ${STATUS_LABELS[safeStatus(project.status)]}`,
      at: project.createdAt || project.updatedAt || new Date().toISOString(),
      projectId: project.id,
      projectTitle: project.title,
      skillIds,
      skillNames
    });

    for (const note of (project.notes || [])) {
      events.push({
        id: `note-${project.id}-${note.id}`,
        rawId: note.id,
        type: "note",
        badgeLabel: "Progress Note",
        badgeClass: "badge-note",
        title: project.title,
        text: note.text,
        at: note.at || project.updatedAt || project.createdAt,
        projectId: project.id,
        projectTitle: project.title,
        skillIds,
        skillNames
      });
    }

    for (const task of (project.tasks || [])) {
      events.push({
        id: `task-${project.id}-${task.id}`,
        rawId: task.id,
        type: "task",
        badgeLabel: task.done ? "Plan Completed" : "Plan Step",
        badgeClass: "badge-task",
        title: project.title,
        text: `${task.done ? "✓ " : "○ "} ${task.text}`,
        at: task.completedAt || task.createdAt || task.at || project.updatedAt || project.createdAt,
        projectId: project.id,
        projectTitle: project.title,
        skillIds,
        skillNames
      });
    }

    for (const mat of (project.materials || [])) {
      events.push({
        id: `mat-${mat.id}`,
        rawId: mat.id,
        type: "project",
        badgeLabel: "Material",
        badgeClass: "badge-project",
        title: project.title,
        text: `Part: ${mat.name}${mat.qty ? ` (${mat.qty})` : ""}${Number(mat.cost) > 0 ? ` · ${formatMoney(mat.cost)}` : ""} [${mat.status === "have" ? "In stock" : mat.status === "ordered" ? "Ordered" : "Need to buy"}]`,
        at: mat.createdAt || project.updatedAt || project.createdAt,
        projectId: project.id,
        projectTitle: project.title,
        skillIds,
        skillNames
      });
    }

    for (const folder of (project.folders || [])) {
      for (const image of (folder.images || [])) {
        events.push({
          id: `photo-${image.id}`,
          rawId: image.id,
          type: "photo",
          badgeLabel: "Photo",
          badgeClass: "badge-photo",
          title: `${project.title} (${folder.name})`,
          text: image.name || "Project photo added",
          at: image.addedAt || image.at || image.createdAt || project.updatedAt,
          projectId: project.id,
          projectTitle: project.title,
          skillIds,
          skillNames,
          image
        });
      }
    }
  }

  for (const entry of state.practiceLog) {
    const skill = state.skills.find(s => s.id === entry.skillId) || state.skills.find(s => entry.text.startsWith(`${s.name} +`));
    events.push({
      id: `xp-${entry.id}`,
      rawId: entry.id,
      type: "xp",
      badgeLabel: "Practice & XP",
      badgeClass: "badge-xp",
      title: skill ? skill.name : "Practice Session",
      text: entry.text,
      at: entry.at,
      projectId: "",
      projectTitle: "",
      skillIds: skill ? [skill.id] : [],
      skillNames: skill ? [skill.name] : []
    });
  }

  for (const act of state.activity) {
    if (act.kind === "xp") continue;
    events.push({
      id: `act-${act.id}`,
      rawId: act.id,
      type: "project",
      badgeLabel: "Activity",
      badgeClass: "badge-project",
      title: "Workshop Activity",
      text: act.text,
      at: act.at,
      projectId: "",
      projectTitle: "",
      skillIds: [],
      skillNames: []
    });
  }

  return events;
}

function renderTimeline() {
  const container = $("#timeline-feed");
  if (!container) return;

  const projectSelect = $("#timeline-project-filter");
  if (projectSelect) {
    const curVal = projectSelect.value;
    projectSelect.innerHTML = `<option value="all">All projects</option>${state.projects.map(p => `<option value="${escapeHTML(p.id)}">${escapeHTML(p.title)}</option>`).join("")}`;
    if (state.projects.some(p => p.id === curVal)) projectSelect.value = curVal;
    else projectSelect.value = "all";
  }

  const skillSelect = $("#timeline-skill-filter");
  if (skillSelect) {
    const curVal = skillSelect.value;
    skillSelect.innerHTML = `<option value="all">All skills</option>${state.skills.map(s => `<option value="${escapeHTML(s.id)}">${escapeHTML(s.name)}</option>`).join("")}`;
    if (state.skills.some(s => s.id === curVal)) skillSelect.value = curVal;
    else skillSelect.value = "all";
  }

  renderTimelineSkillFilterPills();

  const query = ($("#timeline-search")?.value || "").trim().toLowerCase();
  const typeFilter = $("#timeline-type-filter")?.value || "all";
  const projectFilter = $("#timeline-project-filter")?.value || "all";
  const skillSelectFilter = $("#timeline-skill-filter")?.value || "all";

  const allEvents = getTimelineEvents();
  const filtered = allEvents.filter(item => {
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
    if (projectFilter !== "all" && item.projectId !== projectFilter) return false;
    if (skillSelectFilter !== "all" && !(item.skillIds || []).includes(skillSelectFilter)) return false;
    if (selectedTimelineSkillFilters.size > 0 && !(item.skillIds || []).some(id => selectedTimelineSkillFilters.has(id))) return false;
    if (query) {
      const matchText = `${item.title} ${item.text} ${item.projectTitle} ${(item.skillNames || []).join(" ")} ${item.badgeLabel}`.toLowerCase();
      if (!matchText.includes(query)) return false;
    }
    return true;
  }).sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));

  const countElem = $("#timeline-result-count");
  if (countElem) {
    countElem.textContent = `${filtered.length} ${filtered.length === 1 ? "entry" : "entries"}`;
  }

  if (!filtered.length) {
    container.innerHTML = `<div class="empty-inline" style="padding:48px 24px;text-align:center;">No timeline entries match your filters. Add project notes, checklist plans, or practice sessions to see your full journal history.</div>`;
    return;
  }

  container.innerHTML = filtered.map(item => `
    <article class="timeline-card">
      <div class="timeline-card-header">
        <div class="timeline-card-left">
          <span class="timeline-badge ${item.badgeClass}">${item.badgeLabel}</span>
          ${item.projectId
            ? `<strong class="clickable" data-action="open-project-detail" data-id="${item.projectId}">${escapeHTML(item.projectTitle)}</strong>`
            : `<strong>${escapeHTML(item.title)}</strong>`
          }
          ${(item.skillNames || []).map(sn => `<span class="mini-tag">${escapeHTML(sn)}</span>`).join("")}
          <span class="timeline-time" title="${escapeHTML(formatFullDateTime(item.at))}">${formatFullDateTime(item.at)} · ${relativeTime(item.at)}</span>
        </div>
        <div class="timeline-card-actions">
          ${item.projectId ? `<button type="button" class="small-action" data-action="open-project-detail" data-id="${item.projectId}">View project</button>` : ""}
          ${item.type === "xp" ? `<button type="button" class="small-action danger-button" data-action="delete-xp" data-id="${item.rawId}" title="Delete practice log">Delete</button>` : ""}
        </div>
      </div>
      <div class="timeline-text">${escapeHTML(item.text)}</div>
      ${item.image ? `<div class="timeline-photo" style="margin-top:8px"><img src="${imageUrl(item.image)}" alt="${escapeHTML(item.image.name)}" style="max-height:160px;border-radius:6px;object-fit:cover;cursor:pointer" data-action="open-lightbox" data-image-id="${item.image.id}" data-caption="${escapeHTML(item.image.name)}"></div>` : ""}
    </article>
  `).join("");
}

/* Markdown Journal Export */
function exportMarkdownJournal() {
  const dateStr = localDateString();
  let md = `# Workshop Project Journal\n\n`;
  md += `*Exported on ${formatFullDateTime(new Date().toISOString())}*\n\n`;

  const totalXp = state.skills.reduce((sum, s) => sum + s.xp, 0);
  md += `## Overview\n\n`;
  md += `- **Total Projects:** ${state.projects.length}\n`;
  md += `- **Total Skills:** ${state.skills.length}\n`;
  md += `- **Total XP Earned:** ${totalXp.toLocaleString()} XP\n\n`;

  md += `## Skills\n\n`;
  if (state.skills.length) {
    state.skills.forEach(skill => {
      md += `### ${skill.name} (Level ${skillLevel(skill.xp)})\n`;
      md += `- **Category:** ${skill.category || "General"}\n`;
      md += `- **XP:** ${skill.xp} total XP (${skillProgress(skill.xp)} / ${XP_PER_LEVEL} to next level)\n\n`;
    });
  } else {
    md += `*No skills added yet.*\n\n`;
  }

  md += `## Projects\n\n`;
  if (state.projects.length) {
    state.projects.forEach(project => {
      const skills = projectSkillNames(project).map(s => s.name).join(", ");
      md += `### ${project.title}\n\n`;
      md += `- **Status:** ${STATUS_LABELS[safeStatus(project.status)]}\n`;
      md += `- **Priority:** ${priorityLabel(project.priority)}\n`;
      if (project.targetDate) md += `- **Target Date:** ${formatDate(project.targetDate)}\n`;
      if (project.timeSpent) md += `- **Time Invested:** ${formatMinutes(project.timeSpent)}\n`;
      if (skills) md += `- **Skills:** ${skills}\n`;
      if (project.tags?.length) md += `- **Tags:** ${project.tags.join(", ")}\n`;
      if (project.description) md += `\n**Description:**\n${project.description}\n`;

      if (project.tasks?.length) {
        md += `\n#### Action Plan & Checklist\n`;
        project.tasks.forEach(task => {
          const check = task.done ? "[x]" : "[ ]";
          const time = task.completedAt ? ` *(completed ${formatFullDateTime(task.completedAt)})*` : (task.createdAt ? ` *(added ${formatFullDateTime(task.createdAt)})*` : "");
          md += `- ${check} ${task.text}${time}\n`;
        });
      }

      if (project.notes?.length) {
        md += `\n#### Progress Notes\n`;
        project.notes.forEach(note => {
          md += `> **${formatFullDateTime(note.at)}:**\n> ${note.text.replace(/\n/g, "\n> ")}\n\n`;
        });
      }

      if (project.materials?.length) {
        const totalMatCost = project.materials.reduce((sum, m) => sum + (Number(m.cost) || 0), 0);
        md += `\n#### Materials & Supplies (BOM) — Total: ${formatMoney(totalMatCost)}\n`;
        project.materials.forEach(mat => {
          const costStr = Number(mat.cost) > 0 ? `, Cost: ${formatMoney(mat.cost)}` : "";
          const qtyStr = mat.qty ? `, Qty: ${mat.qty}` : "";
          const statusStr = mat.status === "have" ? "In hand" : mat.status === "ordered" ? "Ordered" : "Need to buy";
          md += `- **${mat.name}** (${statusStr}${qtyStr}${costStr})\n`;
        });
      }

      const imgCount = projectImageCount(project);
      if (imgCount > 0) {
        md += `\n*Photos: ${imgCount} project photo${imgCount === 1 ? "" : "s"} logged in workbench.*\n`;
      }

      md += `\n---\n\n`;
    });
  } else {
    md += `*No projects logged yet.*\n\n`;
  }

  md += `## Practice & XP History\n\n`;
  if (state.practiceLog?.length) {
    const sortedPractice = [...state.practiceLog].sort((a, b) => new Date(b.at) - new Date(a.at));
    sortedPractice.forEach(item => {
      md += `- **${formatFullDateTime(item.at)}**: ${item.text}\n`;
    });
    md += `\n`;
  } else {
    md += `*No practice sessions logged yet.*\n\n`;
  }

  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `workbench-journal-${dateStr}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  showToast("Markdown journal exported!");
}


/* 📐 Cut List & Stock Waste Optimizer */
function runCutListOptimizer() {
  const stockLen = parseFloat($("#tool-cut-stock")?.value) || 96;
  const kerf = parseFloat($("#tool-cut-kerf")?.value) || 0;
  const rawText = $("#tool-cut-pieces")?.value || "";
  const resultBox = $("#tool-cutlist-result");
  if (!resultBox) return;

  const lines = rawText.split("\n").map(l => l.trim()).filter(Boolean);
  const pieces = [];

  for (const line of lines) {
    const match = line.match(/^([\d.]+)\s*(?:[x*,\s]\s*(\d+))?/i);
    if (match) {
      const len = parseFloat(match[1]);
      const qty = match[2] ? parseInt(match[2], 10) : 1;
      if (len > 0 && qty > 0) {
        for (let i = 0; i < qty; i++) {
          pieces.push(len);
        }
      }
    }
  }

  if (pieces.length === 0) {
    resultBox.innerHTML = `<div style="color:var(--orange)">Please enter at least one cut piece length (e.g. <code>36 x 2</code>).</div>`;
    return;
  }

  const oversize = pieces.filter(p => p > stockLen);
  if (oversize.length > 0) {
    resultBox.innerHTML = `<div style="color:var(--orange)">Error: Cut piece (${oversize[0]}") exceeds stock length (${stockLen}").</div>`;
    return;
  }

  pieces.sort((a, b) => b - a);
  const boards = [];

  for (const piece of pieces) {
    let bestBoardIndex = -1;
    let minRemainingAfter = Infinity;

    for (let i = 0; i < boards.length; i++) {
      const needed = boards[i].cuts.length === 0 ? piece : piece + kerf;
      if (boards[i].remaining >= needed) {
        const remainingAfter = boards[i].remaining - needed;
        if (remainingAfter < minRemainingAfter) {
          minRemainingAfter = remainingAfter;
          bestBoardIndex = i;
        }
      }
    }

    if (bestBoardIndex >= 0) {
      const b = boards[bestBoardIndex];
      const needed = b.cuts.length === 0 ? piece : piece + kerf;
      b.remaining -= needed;
      b.cuts.push(piece);
      if (b.cuts.length > 1) b.kerfTotal += kerf;
    } else {
      boards.push({
        remaining: stockLen - piece,
        cuts: [piece],
        kerfTotal: 0
      });
    }
  }

  const totalStockUsed = boards.length * stockLen;
  const totalCutsLen = pieces.reduce((s, p) => s + p, 0);
  const totalKerf = boards.reduce((s, b) => s + b.kerfTotal, 0);
  const totalOffcut = boards.reduce((s, b) => s + b.remaining, 0);
  const yieldPct = Math.round((totalCutsLen / totalStockUsed) * 100);

  let html = `
    <div class="cutlist-summary-metrics">
      <div class="cutlist-metric"><strong>${boards.length}</strong><span>Boards Needed</span></div>
      <div class="cutlist-metric"><strong>${yieldPct}%</strong><span>Material Yield</span></div>
      <div class="cutlist-metric"><strong>${totalOffcut.toFixed(2)}"</strong><span>Total Offcut</span></div>
      <div class="cutlist-metric"><strong>${totalKerf.toFixed(2)}"</strong><span>Kerf Loss</span></div>
    </div>
    <div class="cutlist-boards-layout">
  `;

  boards.forEach((board, bIdx) => {
    html += `
      <div class="cutlist-board-block">
        <div class="cutlist-board-header">
          <strong>Board #${bIdx + 1} (${stockLen}")</strong>
          <span>${board.cuts.length} cut${board.cuts.length === 1 ? "" : "s"} · ${board.remaining.toFixed(2)}" offcut</span>
        </div>
        <div class="cutlist-visual-bar">
    `;

    board.cuts.forEach((cut, cIdx) => {
      const cutPct = (cut / stockLen) * 100;
      html += `<div class="cut-piece-box" style="width:${cutPct}%" title="Cut: ${cut}&quot;">${cut}"</div>`;
      if (cIdx < board.cuts.length - 1 && kerf > 0) {
        const kerfPct = (kerf / stockLen) * 100;
        html += `<div class="cut-kerf-box" style="width:${kerfPct}%" title="Kerf: ${kerf}&quot;"></div>`;
      }
    });

    if (board.remaining > 0) {
      const remPct = (board.remaining / stockLen) * 100;
      html += `<div class="cut-scrap-box" style="width:${remPct}%" title="Offcut: ${board.remaining.toFixed(2)}&quot;">${board.remaining >= 6 ? `${board.remaining.toFixed(1)}"` : ""}</div>`;
    }

    html += `</div>`;

    if (board.remaining >= 12) {
      html += `
        <div class="cutlist-offcut-action">
          <span>Usable Scrap: <strong>${board.remaining.toFixed(2)}"</strong></span>
          <button type="button" class="small-action" data-action="add-offcut-to-inventory" data-length="${board.remaining.toFixed(2)}" data-notes="Cut offcut from ${stockLen}&quot; stock">＋ Save offcut to Inventory</button>
        </div>
      `;
    }

    html += `</div>`;
  });

  html += `</div>`;
  resultBox.innerHTML = html;
}

async function copyCutPlan() {
  if (typeof lastCutPlanText !== "undefined" && lastCutPlanText) {
    try {
      await navigator.clipboard.writeText(lastCutPlanText);
      showToast("Copied cut plan to clipboard!");
      return;
    } catch {
      window.prompt("Copy your cut list plan:", lastCutPlanText);
      return;
    }
  }

  const stockLen = parseFloat($("#tool-cut-stock")?.value) || 96;
  const kerf = parseFloat($("#tool-cut-kerf")?.value) || 0;
  const resultBox = $("#tool-cutlist-result");
  const blocks = resultBox?.querySelectorAll(".cutlist-board-block");
  if (!blocks || blocks.length === 0) {
    if (typeof runCutOptimizer === "function") {
      runCutOptimizer();
      if (typeof lastCutPlanText !== "undefined" && lastCutPlanText) {
        try {
          await navigator.clipboard.writeText(lastCutPlanText);
          showToast("Copied cut plan to clipboard!");
          return;
        } catch {
          window.prompt("Copy your cut list plan:", lastCutPlanText);
          return;
        }
      }
    }
    showToast("Run the optimizer first to generate a cut plan.");
    return;
  }
  let plan = `📐 WORKBENCH CUT LIST PLAN\nStock Board Length: ${stockLen}" | Kerf: ${kerf}"\n\n`;
  blocks.forEach((block, idx) => {
    const text = block.querySelector(".cutlist-board-header")?.textContent?.trim() || "";
    const cuts = Array.from(block.querySelectorAll(".cut-piece-box")).map(el => el.textContent.trim()).join(", ");
    plan += `Board #${idx + 1}: Cuts [${cuts}] (${text})\n`;
  });
  try {
    await navigator.clipboard.writeText(plan);
    showToast("Cut plan copied to clipboard!");
  } catch {
    window.prompt("Copy your cut list plan:", plan);
  }
}


/* 🛒 Hardware Store Mode / Cross-Project Shopping List */
function renderShoppingList() {
  const view = $("#shopping-view");
  if (!view) return;

  const search = ($("#shopping-search")?.value || "").trim().toLowerCase();
  const statusFilter = $("#shopping-status-filter")?.value || "need";
  const projectFilter = $("#shopping-project-filter")?.value || "all";

  const allMaterials = [];
  for (const project of state.projects) {
    for (const m of (project.materials || [])) {
      allMaterials.push({
        ...m,
        projectId: project.id,
        projectTitle: project.title
      });
    }
  }

  const restockItems = state.depotRestockList || [];
  const filteredRestock = restockItems.filter(item => {
    if (projectFilter !== "all" && projectFilter !== "depot") return false;
    if (search && !item.name.toLowerCase().includes(search) && !(item.category || "").toLowerCase().includes(search)) return false;
    return true;
  });

  const projectSelect = $("#shopping-project-filter");
  if (projectSelect) {
    const activeProjects = state.projects.filter(p => (p.materials || []).length > 0);
    const prevVal = projectSelect.value;
    projectSelect.innerHTML = `<option value="all">All shopping (${allMaterials.length + restockItems.length})</option>` +
      (restockItems.length ? `<option value="depot">📦 Workshop Depot Restock (${restockItems.length})</option>` : "") +
      activeProjects.map(p => `<option value="${p.id}">${escapeHTML(p.title)}</option>`).join("");
    if (prevVal) projectSelect.value = prevVal;
  }

  const filtered = allMaterials.filter(item => {
    if (statusFilter === "need" && item.status !== "need") return false;
    if (statusFilter === "ordered" && item.status !== "ordered") return false;
    if (projectFilter === "depot") return false;
    if (projectFilter !== "all" && item.projectId !== projectFilter) return false;
    if (search && !item.name.toLowerCase().includes(search) && !item.projectTitle.toLowerCase().includes(search)) return false;
    return true;
  });

  const countEl = $("#shopping-result-count");
  const totalDisplayCount = filtered.length + (projectFilter === "all" || projectFilter === "depot" ? filteredRestock.length : 0);
  if (countEl) countEl.textContent = `${totalDisplayCount} item${totalDisplayCount === 1 ? "" : "s"}`;

  const restockCost = filteredRestock.reduce((s, r) => s + ((Number(r.price) || 0) * (Number(r.restockQty) || 1)), 0);
  const totalNeedCost = allMaterials.filter(m => m.status === "need").reduce((s, m) => s + (Number(m.cost) || 0), 0) + restockCost;
  const totalNeedCount = allMaterials.filter(m => m.status === "need").length + restockItems.length;
  const orderedCost = allMaterials.filter(m => m.status === "ordered").reduce((s, m) => s + (Number(m.cost) || 0), 0);
  const orderedCount = allMaterials.filter(m => m.status === "ordered").length;
  const acquiredCost = allMaterials.filter(m => m.status === "have").reduce((s, m) => s + (Number(m.cost) || 0), 0);

  const summaryBar = $("#shopping-summary-bar");
  if (summaryBar) {
    summaryBar.innerHTML = `
      <div class="shopping-stat"><strong>${totalNeedCount}</strong> <span>To Buy</span></div>
      <div class="shopping-stat"><strong>${formatMoney(totalNeedCost)}</strong> <span>Est. Cart Total</span></div>
      <div class="shopping-stat"><strong>${orderedCount}</strong> <span>On Order (${formatMoney(orderedCost)})</span></div>
      <div class="shopping-stat"><strong>${formatMoney(acquiredCost)}</strong> <span>Acquired In Shop</span></div>
    `;
  }

  const itemsContainer = $("#shopping-list-items");
  if (!itemsContainer) return;

  if (filtered.length === 0 && filteredRestock.length === 0) {
    itemsContainer.innerHTML = `
      <div class="shopping-empty">
        <p>No shopping items match your filter.</p>
        <span style="font-size:12px;color:var(--muted)">Add supplies in project details or click "🛒 Restock Supplies" in the Inventory Depot.</span>
      </div>
    `;
    return;
  }

  let restockHtml = "";
  if (filteredRestock.length > 0 && (projectFilter === "all" || projectFilter === "depot")) {
    restockHtml = `
      <div class="shopping-project-group depot-restock-card" style="margin-bottom:18px">
        <div class="shopping-group-head" style="background:var(--surface-hover)">
          <div style="display:flex;align-items:center;gap:8px">
            <span class="depot-restock-badge">📦 WORKSHOP DEPOT</span>
            <span class="shopping-group-title">Depot Stock Restock List</span>
          </div>
          <span style="font-size:11px;color:var(--muted)">${filteredRestock.length} supplies needed</span>
        </div>
        <div class="shopping-group-items">
          ${filteredRestock.map(item => {
            const cost = (Number(item.price) || 0) * (Number(item.restockQty) || 1);
            return `
              <div class="shopping-item-card">
                <div class="shopping-item-body">
                  <div style="display:flex;align-items:center;gap:6px">
                    <strong style="font-size:13px">${escapeHTML(item.name)}</strong>
                    <span class="inventory-category-badge">${escapeHTML(item.category || "Supplies")}</span>
                  </div>
                  <div class="shopping-item-meta" style="margin-top:3px">
                    <span class="shopping-qty-badge">Need: ${item.restockQty || 1} ${escapeHTML(item.unit || "units")}</span>
                    <span style="font-size:10px;color:var(--muted)">In depot: ${item.currentQty ?? 0}</span>
                    ${cost > 0 ? `<span class="shopping-cost-badge">${formatMoney(cost)}</span>` : ""}
                    ${item.supplier ? `<span>🏷️ ${escapeHTML(item.supplier)}</span>` : ""}
                    ${item.location ? `<span>📍 ${escapeHTML(item.location)}</span>` : ""}
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
                  <button type="button" class="button button-primary button-small" data-action="complete-depot-restock" data-id="${item.id}" data-qty="${item.restockQty || 1}" title="Mark bought and add to inventory depot stock">✓ Restocked</button>
                  <button type="button" class="icon-link-btn danger-hover" data-action="dismiss-depot-restock" data-id="${item.id}" title="Remove from restock list">×</button>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  const byProject = new Map();
  for (const item of filtered) {
    if (!byProject.has(item.projectId)) byProject.set(item.projectId, []);
    byProject.get(item.projectId).push(item);
  }

  const projectsHtml = Array.from(byProject.entries()).map(([pid, items]) => {
    const proj = state.projects.find(p => p.id === pid);
    const pTitle = proj?.title || "Project";
    return `
      <div class="shopping-project-group">
        <div class="shopping-group-head">
          <span class="shopping-group-title" data-project="${pid}" role="button" tabindex="0">${escapeHTML(pTitle)}</span>
          <span class="shopping-group-count">${items.length} item${items.length === 1 ? "" : "s"}</span>
        </div>
        <div class="shopping-group-items">
          ${items.map(m => `
            <div class="shopping-item-card ${m.status === "have" ? "is-acquired" : ""}">
              <label class="shopping-item-check-label">
                <input type="checkbox" class="shopping-checkbox" ${m.status === "have" ? "checked" : ""} data-action="shopping-toggle-item" data-project="${pid}" data-material="${m.id}" aria-label="Mark ${escapeHTML(m.name)} acquired">
                <span class="shopping-check-custom"></span>
              </label>
              <div class="shopping-item-body">
                <div class="shopping-item-name">
                  ${escapeHTML(m.name)}
                  <span class="materials-group-badge ${getGroupBadgeClass(m.group || inferMaterialGroup(m.name))}" style="margin-left:6px;font-size:9.5px;padding:1px 6px">
                    ${getGroupIcon(m.group || inferMaterialGroup(m.name))} ${escapeHTML(m.group || inferMaterialGroup(m.name))}
                  </span>
                </div>
                <div class="shopping-item-meta">
                  ${m.qty ? `<span class="shopping-qty-badge">Qty: ${escapeHTML(m.qty)}</span>` : ""}
                  ${Number(m.cost) > 0 ? `<span class="shopping-cost-badge">${formatMoney(m.cost)}</span>` : ""}
                  <span class="status-pill status-${m.status === "have" ? "completed" : m.status === "ordered" ? "on-hold" : "planned"}">${m.status === "have" ? "In Stock" : m.status === "ordered" ? "Ordered" : "Need to buy"}</span>
                </div>
              </div>
              <div class="shopping-item-actions">
                <button type="button" class="icon-link-btn" data-action="cycle-material-status" data-project="${pid}" data-id="${m.id}" title="Cycle status">🔄</button>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }).join("");

  itemsContainer.innerHTML = restockHtml + projectsHtml;
}

function copyShoppingList() {
  const needItems = state.projects.flatMap(p =>
    (p.materials || []).filter(m => m.status === "need").map(m => ({
      ...m,
      projectTitle: p.title
    }))
  );

  if (needItems.length === 0) {
    showToast("No items marked 'Need to buy' right now!");
    return;
  }

  let text = `🛒 HARDWARE STORE CHECKLIST\nGenerated from Workbench Project Journal\n\n`;
  needItems.forEach(m => {
    const qty = m.qty ? ` (${m.qty})` : "";
    const cost = Number(m.cost) > 0 ? ` [~${formatMoney(m.cost)}]` : "";
    text += `[ ] ${m.name}${qty}${cost} — for "${m.projectTitle}"\n`;
  });

  const totalCost = needItems.reduce((s, m) => s + (Number(m.cost) || 0), 0);
  if (totalCost > 0) text += `\nEstimated Total: ${formatMoney(totalCost)}\n`;

  navigator.clipboard.writeText(text).then(() => {
    showToast("Copied shopping checklist to clipboard!");
  }).catch(() => {
    showToast("Could not copy checklist.");
  });
}

/* ============================================================

/* ============================================================
   📦 Workshop Inventory Depot & Tool Equipment Tracker
   ============================================================ */

function isMaintOverdue(item) {
  if (!item || !item.lastServiced) return false;
  const lastDate = new Date(item.lastServiced);
  const interval = parseInt(item.intervalDays, 10) || 30;
  const dueDate = new Date(lastDate);
  dueDate.setDate(dueDate.getDate() + interval);
  return dueDate.getTime() < Date.now();
}

function renderInventory() {
  const view = $("#inventory-view");
  if (!view) return;

  renderToolMaintenance();

  const search = ($("#inventory-search")?.value || "").trim().toLowerCase();
  const categoryFilter = $("#inventory-category-filter")?.value || "all";
  const conditionFilter = $("#inventory-condition-filter")?.value || "all";
  const activeTab = state.inventoryActiveTab || "all";
  const alertsOnly = !!state.inventoryAlertsOnly;

  const inventory = state.inventory || [];

  // Group into materials and equipment
  const allMaterials = inventory.filter(i => (i.type || "material") === "material");
  const allEquipment = inventory.filter(i => i.type === "equipment");

  // Summary statistics
  const matTotalVal = allMaterials.reduce((sum, m) => sum + ((Number(m.quantity) || 0) * (Number(m.price || m.cost) || 0)), 0);
  const equipTotalVal = allEquipment.reduce((sum, e) => sum + (Number(e.cost || e.price) || 0), 0);
  const lowStockMaterials = allMaterials.filter(m => (Number(m.quantity) || 0) <= (Number(m.lowStockThreshold) || 1));
  const careDueEquipment = allEquipment.filter(e => e.condition === "maintenance_needed" || e.condition === "repair");
  const inUseEquipment = allEquipment.filter(e => e.condition === "in_use" || e.assignedProjectId);

  // Update summary metric tiles
  const matValEl = $("#inv-mat-val");
  const matCountEl = $("#inv-mat-count");
  const equipValEl = $("#inv-equip-val");
  const equipCountEl = $("#inv-equip-count");
  const statusValEl = $("#inv-status-val");
  const statusSubEl = $("#inv-status-sub");

  if (matValEl) matValEl.textContent = formatMoney(matTotalVal);
  if (matCountEl) matCountEl.textContent = `${allMaterials.length} item${allMaterials.length === 1 ? "" : "s"}${lowStockMaterials.length ? ` · ⚠️ ${lowStockMaterials.length} low stock` : ""}`;
  if (equipValEl) equipValEl.textContent = formatMoney(equipTotalVal);
  if (equipCountEl) equipCountEl.textContent = `${allEquipment.length} tool${allEquipment.length === 1 ? "" : "s"} · ${inUseEquipment.length} checked out`;
  if (statusValEl) {
    if (careDueEquipment.length) {
      statusValEl.textContent = `${careDueEquipment.length} Need Care`;
      statusValEl.style.color = "#d97706";
    } else if (lowStockMaterials.length) {
      statusValEl.textContent = `${lowStockMaterials.length} Low Stock`;
      statusValEl.style.color = "#ea580c";
    } else {
      statusValEl.textContent = "Depot Ready";
      statusValEl.style.color = "var(--ink)";
    }
  }
  if (statusSubEl) {
    statusSubEl.textContent = `${(state.maintenance || []).length} care schedules · ${inUseEquipment.length} in use`;
  }

  // Update tab counts
  const tabAllCount = $("#tab-count-all");
  const tabMatCount = $("#tab-count-materials");
  const tabEquipCount = $("#tab-count-equipment");
  if (tabAllCount) tabAllCount.textContent = inventory.length;
  if (tabMatCount) tabMatCount.textContent = allMaterials.length;
  if (tabEquipCount) tabEquipCount.textContent = allEquipment.length;

  // Filter items
  const matchFilter = item => {
    const isEquip = item.type === "equipment";

    // Tab filter
    if (activeTab === "material" && isEquip) return false;
    if (activeTab === "equipment" && !isEquip) return false;

    // Category filter
    if (categoryFilter !== "all" && item.category !== categoryFilter) return false;

    // Condition filter (equipment only)
    if (conditionFilter !== "all") {
      if (!isEquip) return false;
      if (item.condition !== conditionFilter) return false;
    }

    // Alerts only
    if (alertsOnly) {
      if (isEquip) {
        const needsCare = item.condition === "maintenance_needed" || item.condition === "repair";
        const hasOverdueMaint = (state.maintenance || []).some(m => m.toolName && m.toolName.toLowerCase() === item.name.toLowerCase() && isMaintOverdue(m));
        if (!needsCare && !hasOverdueMaint) return false;
      } else {
        const isLow = (Number(item.quantity) || 0) <= (Number(item.lowStockThreshold) || 1);
        if (!isLow) return false;
      }
    }

    // Search query
    if (search) {
      const corpus = `${item.name} ${item.brand || ""} ${item.model || ""} ${item.serialNumber || ""} ${item.location || ""} ${item.notes || ""} ${item.category || ""} ${item.specs || ""}`.toLowerCase();
      if (!corpus.includes(search)) return false;
    }

    return true;
  };

  const filtered = inventory.filter(matchFilter);
  const filteredMaterials = filtered.filter(i => (i.type || "material") === "material");
  const filteredEquipment = filtered.filter(i => i.type === "equipment");

  const countEl = $("#inventory-result-count");
  if (countEl) {
    countEl.textContent = `${filtered.length} item${filtered.length === 1 ? "" : "s"} (${filteredMaterials.length} materials, ${filteredEquipment.length} tools)`;
  }

  const grid = $("#inventory-grid");
  if (!grid) return;

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="inventory-empty">
        <p>${alertsOnly ? "No depot items currently require attention!" : "No inventory supplies or tools match your filter."}</p>
        <div style="display:flex;justify-content:center;gap:8px;margin-top:8px">
          <button type="button" class="button button-outline button-small" data-action="open-inventory-dialog" data-type="equipment">⚙️ Add Equipment</button>
          <button type="button" class="button button-primary button-small" data-action="open-inventory-dialog" data-type="material">📦 Add Material</button>
        </div>
      </div>
    `;
    return;
  }

  // Render cards
  const renderMaterialCard = item => {
    const qty = Number(item.quantity) || 0;
    const unitPrice = Number(item.price || item.cost) || 0;
    const totalVal = qty * unitPrice;
    const isLow = qty <= (Number(item.lowStockThreshold) || 1);
    const bumpDelta = item.unit === "g" ? 50 : 1;

    return `
      <div class="inventory-card inventory-card-material">
        <div class="inventory-card-top">
          <div class="inventory-card-badges">
            <span class="inventory-category-badge">📦 ${escapeHTML(item.category || "Supplies")}</span>
            ${isLow ? `<span class="inventory-chip alert">⚠️ Low stock</span>` : ""}
            ${item.location ? `<span class="inventory-chip">📍 ${escapeHTML(item.location)}</span>` : ""}
          </div>
          ${unitPrice > 0 ? `<span class="inventory-cost-badge">${formatMoney(unitPrice)}${item.unit ? ` / ${escapeHTML(item.unit)}` : ""}</span>` : ""}
        </div>

        <div>
          <h3 class="inventory-card-title">${escapeHTML(item.name)}</h3>
          ${item.spoolData ? `
            <div style="display:inline-flex;align-items:center;gap:6px;margin:2px 0 6px">
              <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${escapeHTML(item.spoolData.colorHex || '#333')};border:1.5px solid rgba(0,0,0,0.2)"></span>
              <span style="font-size:11px;font-weight:600;color:var(--ink-secondary)">${escapeHTML(item.spoolData.material || "Filament")} · ${escapeHTML(item.spoolData.colorName || "")}</span>
              ${item.spoolData.slot ? `<span class="inventory-chip" style="font-size:10px;padding:1px 5px">📍 ${escapeHTML(item.spoolData.slot)}</span>` : ""}
            </div>
          ` : ""}
          ${item.notes ? `<p class="inventory-card-notes">${escapeHTML(item.notes)}</p>` : ""}
        </div>

        <div class="inventory-chips-row">
          ${item.supplier ? `<span class="inventory-chip">🏷️ ${escapeHTML(item.supplier)}</span>` : ""}
          ${totalVal > 0 ? `<span class="inventory-chip highlight">Stock Value: ${formatMoney(totalVal)}${item.spoolData?.spoolCost ? ` ($${item.spoolData.spoolCost.toFixed(2)}/spool)` : ""}</span>` : ""}
        </div>

        <div class="inventory-qty-row">
          <div class="inventory-qty-control">
            <button type="button" class="qty-btn" data-action="inventory-bump" data-id="${item.id}" data-delta="${-bumpDelta}" title="Subtract ${bumpDelta}">−</button>
            <span class="inventory-qty-val">${qty}</span>
            <span class="inventory-unit">${escapeHTML(item.unit || "units")}</span>
            <button type="button" class="qty-btn" data-action="inventory-bump" data-id="${item.id}" data-delta="${bumpDelta}" title="Add ${bumpDelta}">＋</button>
          </div>
        </div>

        <div class="inventory-card-bottom">
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button type="button" class="small-action" data-action="pick-from-inventory" data-id="${item.id}">📥 Use in Project</button>
            ${item.spoolData ? `<button type="button" class="small-action" data-action="weigh-spool" data-id="${item.id}" title="Weigh or deduct filament">⚖️ Weigh / Deduct</button>` : `<button type="button" class="small-action" data-action="restock-material" data-id="${item.id}" title="Send this item to Shopping List">🛒 Restock</button>`}
          </div>
          <div style="display:flex;gap:4px">
            <button type="button" class="icon-link-btn" data-action="${item.spoolData ? 'edit-spool' : 'edit-inventory-item'}" data-id="${item.id}" title="${item.spoolData ? 'Edit filament spool' : 'Edit material'}">✎</button>
            <button type="button" class="icon-link-btn danger-hover" data-action="${item.spoolData ? 'delete-spool' : 'delete-inventory-item'}" data-id="${item.id}" title="Delete">×</button>
          </div>
        </div>
      </div>
    `;
  };

  const renderEquipmentCard = item => {
    const cost = Number(item.cost || item.price) || 0;
    const cond = item.condition || "operational";
    const condLabels = {
      operational: "🟢 Operational",
      maintenance_needed: "🟡 Needs Service",
      in_use: "🔵 In Use",
      repair: "🔴 Out of Service",
      borrowed: "🟣 Loaned Out"
    };

    const isAssigned = item.assignedProjectId && item.assignedProjectTitle;

    // Check if overdue maintenance exists
    const hasOverdueMaint = (state.maintenance || []).some(m => m.toolName && m.toolName.toLowerCase() === item.name.toLowerCase() && isMaintOverdue(m));
    const logbookCount = Array.isArray(item.logbook) ? item.logbook.length : 0;

    return `
      <div class="inventory-card inventory-card-equipment">
        <div class="inventory-card-top">
          <div class="inventory-card-badges">
            <span class="inventory-category-badge">⚙️ ${escapeHTML(item.category || "Tool")}</span>
            <span class="inventory-condition-pill condition-${cond}">${condLabels[cond] || cond}</span>
            ${hasOverdueMaint ? `<span class="inventory-chip alert">⚠️ Care Overdue</span>` : ""}
          </div>
          ${cost > 0 ? `<span class="inventory-cost-badge" title="Acquisition / Replacement Cost">${formatMoney(cost)}</span>` : ""}
        </div>

        <div>
          <h3 class="inventory-card-title">${escapeHTML(item.name)}</h3>
          ${item.brand || item.model ? `<div class="inventory-card-brand">${escapeHTML(item.brand || "")}${item.model ? ` · ${escapeHTML(item.model)}` : ""}</div>` : ""}
          ${item.notes ? `
            <div class="inventory-sop-badge" data-action="open-equipment-logbook" data-id="${item.id}" title="Click to view full SOP in logbook">
              🦺 SOP: ${escapeHTML(item.notes.slice(0, 36))}${item.notes.length > 36 ? "…" : ""}
            </div>
          ` : ""}
        </div>

        <div class="inventory-chips-row">
          ${item.location ? `<span class="inventory-chip">📍 ${escapeHTML(item.location)}</span>` : ""}
          ${item.specs ? `<span class="inventory-chip">⚡ ${escapeHTML(item.specs)}</span>` : ""}
          ${item.serialNumber ? `<span class="inventory-chip">🏷️ ${escapeHTML(item.serialNumber)}</span>` : ""}
          ${item.purchaseDate ? `<span class="inventory-chip">📅 Bought: ${escapeHTML(item.purchaseDate)}</span>` : ""}
        </div>

        ${isAssigned ? `
          <div class="inventory-assigned-banner">
            <span class="inventory-assigned-text">📌 In use for: <strong>${escapeHTML(item.assignedProjectTitle)}</strong></span>
            <button type="button" class="inventory-checkin-btn" data-action="checkin-equipment" data-id="${item.id}" title="Return tool to depot">↩ Check In</button>
          </div>
        ` : ""}

        <div class="inventory-card-bottom">
          <div style="display:flex;gap:5px;flex-wrap:wrap">
            <button type="button" class="small-action" data-action="pick-from-inventory" data-id="${item.id}">Assign</button>
            <button type="button" class="small-action" data-action="open-equipment-logbook" data-id="${item.id}" title="View lifetime logbook & service entries">📖 Log (${logbookCount})</button>
            <button type="button" class="small-action" data-action="open-tool-tag" data-id="${item.id}" title="Print tool asset tag with QR code">🏷️ Tag</button>
            <button type="button" class="small-action" data-action="schedule-tool-care" data-id="${item.id}" title="Open care schedule for this tool">🔧 Care</button>
          </div>
          <div style="display:flex;gap:4px">
            <button type="button" class="icon-link-btn" data-action="edit-inventory-item" data-id="${item.id}" title="Edit tool">✎</button>
            <button type="button" class="icon-link-btn danger-hover" data-action="delete-inventory-item" data-id="${item.id}" title="Delete tool">×</button>
          </div>
        </div>
      </div>
    `;
  };

  // If "all" tab, render divided into two distinct sections
  if (activeTab === "all") {
    let html = "";
    if (filteredMaterials.length > 0) {
      const matSubtotal = filteredMaterials.reduce((s, m) => s + ((Number(m.quantity) || 0) * (Number(m.price || m.cost) || 0)), 0);
      html += `
        <div class="inventory-section-divider">
          <h3 class="inventory-section-title">🪵 Materials &amp; Consumables</h3>
          <span class="inventory-section-meta">${filteredMaterials.length} items · ${formatMoney(matSubtotal)} value</span>
        </div>
        <div class="inventory-grid">
          ${filteredMaterials.map(renderMaterialCard).join("")}
        </div>
      `;
    }
    if (filteredEquipment.length > 0) {
      const equipSubtotal = filteredEquipment.reduce((s, e) => s + (Number(e.cost || e.price) || 0), 0);
      html += `
        <div class="inventory-section-divider">
          <h3 class="inventory-section-title">⚙️ Workshop Tools &amp; Equipment</h3>
          <span class="inventory-section-meta">${filteredEquipment.length} tools · ${formatMoney(equipSubtotal)} valuation</span>
        </div>
        <div class="inventory-grid">
          ${filteredEquipment.map(renderEquipmentCard).join("")}
        </div>
      `;
    }
    grid.innerHTML = html;
  } else if (activeTab === "material") {
    grid.innerHTML = `
      <div class="inventory-grid">
        ${filteredMaterials.map(renderMaterialCard).join("")}
      </div>
    `;
  } else if (activeTab === "equipment") {
    grid.innerHTML = `
      <div class="inventory-grid">
        ${filteredEquipment.map(renderEquipmentCard).join("")}
      </div>
    `;
  }
}

function openInventoryDialog(item = null, initialType = "material") {
  const form = $("#inventory-form");
  const dialog = $("#inventory-dialog");
  const delBtn = $("#delete-inventory-btn");
  const titleEl = $("#inventory-dialog-title");
  const eyebrowEl = $("#inventory-dialog-eyebrow");
  if (!form || !dialog) return;

  form.reset();

  const isEquip = item ? item.type === "equipment" : initialType === "equipment";

  $$('#inventory-form input[name="itemType"]').forEach(r => {
    r.checked = r.value === (isEquip ? "equipment" : "material");
  });

  $("#inventory-material-fields")?.classList.toggle("hidden", isEquip);
  $("#inventory-equipment-fields")?.classList.toggle("hidden", !isEquip);

  if (item && typeof item === "object") {
    if (titleEl) titleEl.textContent = isEquip ? "Edit Tool / Equipment" : "Edit Material / Supply";
    if (eyebrowEl) eyebrowEl.textContent = isEquip ? "WORKSHOP EQUIPMENT" : "WORKSHOP SUPPLIES";
    form.elements.id.value = item.id || "";

    if (isEquip) {
      if (form.elements.equipName) form.elements.equipName.value = item.name || "";
      if (form.elements.equipCategory) form.elements.equipCategory.value = item.category || "Stationary Machinery";
      if (form.elements.equipCondition) form.elements.equipCondition.value = item.condition || "operational";
      if (form.elements.equipBrand) form.elements.equipBrand.value = item.brand || "";
      if (form.elements.equipModel) form.elements.equipModel.value = item.model || "";
      if (form.elements.equipCost) form.elements.equipCost.value = item.cost != null ? item.cost : (item.price ?? "");
      if (form.elements.equipLocation) form.elements.equipLocation.value = item.location || "";
      if (form.elements.equipSerial) form.elements.equipSerial.value = item.serialNumber || "";
      if (form.elements.equipSpecs) form.elements.equipSpecs.value = item.specs || "";
      if (form.elements.equipPurchaseDate) form.elements.equipPurchaseDate.value = item.purchaseDate || "";
      if (form.elements.equipNotes) form.elements.equipNotes.value = item.notes || "";
      if (form.elements.equipCreateCare) form.elements.equipCreateCare.checked = false;
    } else {
      if (form.elements.name) form.elements.name.value = item.name || "";
      if (form.elements.category) form.elements.category.value = item.category || "Lumber / Scrap";
      if (form.elements.location) form.elements.location.value = item.location || "";
      if (form.elements.quantity) form.elements.quantity.value = item.quantity ?? 1;
      if (form.elements.unit) form.elements.unit.value = item.unit || "";
      if (form.elements.price) form.elements.price.value = item.price != null ? item.price : (item.cost ?? "");
      if (form.elements.lowStockThreshold) form.elements.lowStockThreshold.value = item.lowStockThreshold ?? "";
      if (form.elements.supplier) form.elements.supplier.value = item.supplier || "";
      if (form.elements.notes) form.elements.notes.value = item.notes || "";
    }
    if (delBtn) delBtn.classList.remove("hidden");
  } else {
    if (titleEl) titleEl.textContent = isEquip ? "Add Tool / Equipment" : "Add Material / Supply";
    if (eyebrowEl) eyebrowEl.textContent = isEquip ? "WORKSHOP EQUIPMENT" : "WORKSHOP SUPPLIES";
    form.elements.id.value = "";
    if (form.elements.quantity) form.elements.quantity.value = "1";
    if (delBtn) delBtn.classList.add("hidden");
  }

  dialog.showModal();
}

async function handleInventorySubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const id = form.elements.id.value;
  const existing = (state.inventory || []).find(i => i.id === id);

  const itemType = form.elements.itemType?.value || "material";
  let item = null;

  if (itemType === "equipment") {
    const name = (form.elements.equipName?.value || "").trim();
    if (!name) {
      showToast("Please enter an equipment name.", "warning");
      return;
    }
    const cost = parseFloat(form.elements.equipCost?.value) || 0;
    item = {
      id: existing?.id || uid(),
      type: "equipment",
      name,
      category: form.elements.equipCategory?.value || "Other Equipment",
      brand: (form.elements.equipBrand?.value || "").trim(),
      model: (form.elements.equipModel?.value || "").trim(),
      cost,
      price: cost,
      condition: form.elements.equipCondition?.value || "operational",
      location: (form.elements.equipLocation?.value || "").trim(),
      serialNumber: (form.elements.equipSerial?.value || "").trim(),
      specs: (form.elements.equipSpecs?.value || "").trim(),
      purchaseDate: form.elements.equipPurchaseDate?.value || "",
      notes: (form.elements.equipNotes?.value || "").trim(),
      assignedProjectId: existing?.assignedProjectId || null,
      assignedProjectTitle: existing?.assignedProjectTitle || null,
      updatedAt: new Date().toISOString()
    };

    // Auto schedule maintenance care if checked
    if (form.elements.equipCreateCare?.checked) {
      state.maintenance = state.maintenance || [];
      const hasMaint = state.maintenance.some(m => m.toolName && m.toolName.toLowerCase() === name.toLowerCase());
      if (!hasMaint) {
        state.maintenance.push({
          id: uid(),
          toolName: name,
          task: "Routine service & safety check",
          intervalDays: 30,
          lastServiced: new Date().toISOString().slice(0, 10),
          notes: item.notes || `Care schedule for ${name}`
        });
      }
    }
  } else {
    // Material
    const name = (form.elements.name?.value || "").trim();
    if (!name) {
      showToast("Please enter a material name.", "warning");
      return;
    }
    const price = parseFloat(form.elements.price?.value) || 0;
    item = {
      id: existing?.id || uid(),
      type: "material",
      name,
      category: form.elements.category?.value || "Other Supplies",
      location: (form.elements.location?.value || "").trim(),
      quantity: parseFloat(form.elements.quantity?.value) || 0,
      unit: (form.elements.unit?.value || "").trim(),
      price,
      cost: price,
      lowStockThreshold: parseInt(form.elements.lowStockThreshold?.value, 10) || 0,
      supplier: (form.elements.supplier?.value || "").trim(),
      notes: (form.elements.notes?.value || "").trim(),
      updatedAt: new Date().toISOString()
    };
  }

  state.inventory = state.inventory || [];
  if (existing) {
    if (existing.spoolData) item.spoolData = existing.spoolData;
    Object.assign(existing, item);
  } else {
    state.inventory.unshift(item);
  }

  makeActivity("note", `Updated shop depot: ${item.name} (${item.type === "equipment" ? `Tool · ${formatMoney(item.cost)}` : `${item.quantity} ${item.unit || "units"}`})`);

  try {
    await persistState();
    $("#inventory-dialog")?.close();
    render();
    showToast(`Saved "${item.name}" to workshop depot.`);
  } catch (e) {
    console.error(e);
    showToast("Could not save inventory item.");
  }
}

async function handleInventoryBump(id, delta) {
  const item = (state.inventory || []).find(i => i.id === id);
  if (!item) return;

  item.quantity = Math.max(0, (Number(item.quantity) || 0) + delta);
  if (item.spoolData) {
    item.spoolData.netWeight = item.quantity;
    item.spoolData.grossWeight = item.quantity + (Number(item.spoolData.tareWeight) || 240);
  }
  item.updatedAt = new Date().toISOString();

  try {
    await persistState();
    renderInventory();
    renderNavigation();
    if (typeof renderSpoolRack === "function") renderSpoolRack();
  } catch (e) {
    console.error(e);
  }
}

async function deleteInventoryItem(id) {
  const item = (state.inventory || []).find(i => i.id === id);
  if (!item) return;
  if (!window.confirm(`Delete "${item.name}" from inventory depot?`)) return;

  state.inventory = (state.inventory || []).filter(i => i.id !== id);

  try {
    await persistState();
    $("#inventory-dialog")?.close();
    render();
    showToast(`Deleted "${item.name}".`);
  } catch (e) {
    console.error(e);
  }
}

async function checkinEquipment(id) {
  const item = (state.inventory || []).find(i => i.id === id);
  if (!item) return;

  const prevProj = item.assignedProjectTitle || "project";
  item.assignedProjectId = null;
  item.assignedProjectTitle = null;
  if (item.condition === "in_use") item.condition = "operational";

  item.logbook = Array.isArray(item.logbook) ? item.logbook : [];
  item.logbook.push({
    id: uid(),
    date: new Date().toISOString(),
    type: "checkin",
    title: `Returned from ${prevProj} to depot`,
    notes: "Equipment operational and returned to shop station."
  });

  item.updatedAt = new Date().toISOString();

  makeActivity("note", `Returned ${item.name} from ${prevProj} to shop depot`);

  try {
    await persistState();
    renderInventory();
    if ($("#detail-dialog")?.open && activeProjectId) renderProjectDetail(activeProjectId);
    showToast(`Checked in “${item.name}” back to depot.`);
  } catch (err) {
    console.error(err);
  }
}

function scheduleToolCare(id) {
  const item = (state.inventory || []).find(i => i.id === id);
  if (!item) return;

  const existingMaint = (state.maintenance || []).find(m => m.toolName && m.toolName.toLowerCase() === item.name.toLowerCase());
  if (existingMaint) {
    openMaintenanceDialog(existingMaint);
  } else {
    openMaintenanceDialog({
      id: "",
      toolName: item.name,
      task: "Inspection, bit/blade check & lubrication",
      intervalDays: 30,
      lastServiced: new Date().toISOString().slice(0, 10),
      notes: `Location: ${item.location || "Shop"}. Brand: ${item.brand || ""} ${item.model || ""}`.trim()
    });
  }
}

function exportInventoryCSV() {
  const items = state.inventory || [];
  if (!items.length) {
    showToast("No inventory supplies or tools to export.");
    return;
  }

  const headers = [
    "Type", "Name", "Category", "Brand", "Model", "Serial_Number",
    "Condition_Status", "Quantity", "Unit", "Unit_Cost_Or_Price", "Total_Valuation",
    "Location", "Supplier", "Assigned_Project", "Notes", "Updated_At"
  ];

  const escapeCSV = val => {
    if (val == null) return '""';
    let s = String(val);
    if (/^[=+\-@\t\r]/.test(s)) {
      s = "'" + s;
    }
    s = s.replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = items.map(i => {
    const isEquip = i.type === "equipment";
    const type = isEquip ? "Equipment" : "Material";
    const qty = isEquip ? 1 : (Number(i.quantity) || 0);
    const unit = isEquip ? "unit" : (i.unit || "");
    const cost = Number(i.cost || i.price) || 0;
    const totalVal = isEquip ? cost : (qty * cost);

    return [
      escapeCSV(type),
      escapeCSV(i.name),
      escapeCSV(i.category || ""),
      escapeCSV(i.brand || ""),
      escapeCSV(i.model || ""),
      escapeCSV(i.serialNumber || ""),
      escapeCSV(isEquip ? (i.condition || "operational") : (qty <= (i.lowStockThreshold || 1) ? "Low Stock" : "In Stock")),
      escapeCSV(qty),
      escapeCSV(unit),
      escapeCSV(cost.toFixed(2)),
      escapeCSV(totalVal.toFixed(2)),
      escapeCSV(i.location || ""),
      escapeCSV(i.supplier || ""),
      escapeCSV(i.assignedProjectTitle || ""),
      escapeCSV(i.notes || ""),
      escapeCSV(i.updatedAt || "")
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  a.download = `workshop_depot_inventory_${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("📋 Exported Workshop Inventory & Equipment to CSV!");
}

/* ============================================================
   FEATURE: Workshop Starter Kits (1-Click Shop Setup Presets)
   ============================================================ */
const WORKSHOP_STARTER_KITS = {
  woodworking: {
    title: "Fine Woodworking Shop",
    icon: "🪵",
    category: "Woodworking",
    description: "Standard machinery and essentials for solid lumber & cabinetry builds.",
    items: [
      { type: "equipment", name: "10\" Contractor Table Saw", category: "Stationary Machinery", brand: "DeWalt", model: "DWE7491RS", cost: 599, condition: "operational", location: "Machine Bay 1", specs: "15A 120V · 10\" 24T/50T", notes: "Always use push sticks; check fence parallelism" },
      { type: "equipment", name: "12\" Dual-Bevel Sliding Miter Saw", category: "Stationary Machinery", brand: "Bosch", model: "GCM12SD", cost: 449, condition: "operational", location: "Miter Station", specs: "15A 120V · Axial-Glide", notes: "Keep throat plate clear of offcuts" },
      { type: "equipment", name: "2.25 HP Plunge & Fixed Base Router", category: "Power Hand Tools", brand: "Bosch", model: "1617EVSPK", cost: 199, condition: "operational", location: "Bench 1 Cabinet", specs: "12A 120V · 1/4\" & 1/2\" collets", notes: "Includes edge guide; feed against bit rotation" },
      { type: "equipment", name: "5\" Random Orbit Sander", category: "Power Hand Tools", brand: "Makita", model: "BO5041", cost: 89, condition: "operational", location: "Sand Shelf", specs: "3A 120V · 8-hole hook & loop", notes: "Connect dust hose before sanding" },
      { type: "material", name: "3/4\" Baltic Birch Plywood (5x5)", category: "Lumber / Scrap", quantity: 3, unit: "sheets", price: 68.00, lowStockThreshold: 1, location: "Lumber Rack A", supplier: "Local Hardwood Yard" },
      { type: "material", name: "Titebond II Wood Glue (16 oz)", category: "Finishes & Adhesives", quantity: 2, unit: "bottles", price: 8.50, lowStockThreshold: 1, location: "Glue Caddy", supplier: "Hardware Store" }
    ]
  },
  digital_fab: {
    title: "3D Printing & Digital Fab Lab",
    icon: "🖨️",
    category: "Digital Fabrication",
    description: "High-speed 3D printing, desktop CNC routing, and digital precision tools.",
    items: [
      { type: "equipment", name: "CoreXY 3D Printer", category: "3D Printers & CNC", brand: "Bambu Lab", model: "P1S Combo", cost: 699, condition: "operational", location: "Print Farm Bench", specs: "256x256x256mm · 0.4mm Hardened Nozzle", notes: "Clean textured PEI plate with IPA; calibrate flow per filament" },
      { type: "equipment", name: "Desktop CNC Router", category: "3D Printers & CNC", brand: "Shapeoko", model: "Pro 4 Standard", cost: 899, condition: "operational", location: "CNC Bay", specs: "Hybrid table · Sweepy 2.0 dust boot", notes: "Double check Z-zero and collet tightness before spindle start" },
      { type: "equipment", name: "6\" Stainless Digital Calipers", category: "Hand Tools & Measuring", brand: "Mitutoyo", model: "500-196-30", cost: 110, condition: "operational", location: "Drawer 1", specs: "0.01mm / 0.0005\" accuracy", notes: "Zero jaws before measurement; store in protective case" },
      { type: "material", name: "PLA Tough Filament 1.75mm (Black)", category: "3D Printing & Filament", quantity: 4, unit: "spools", price: 19.99, lowStockThreshold: 1, location: "Filament Dry Box", supplier: "Amazon / Bambu" },
      { type: "material", name: "PETG Filament 1.75mm (White)", category: "3D Printing & Filament", quantity: 2, unit: "spools", price: 21.50, lowStockThreshold: 1, location: "Filament Dry Box", supplier: "Amazon / Bambu" }
    ]
  },
  electronics: {
    title: "Electronics & Prototyping Bench",
    icon: "⚡",
    category: "Electronics",
    description: "Soldering, test instruments, DC power, and benchtop maker electronics.",
    items: [
      { type: "equipment", name: "Digital Soldering Station", category: "Power Hand Tools", brand: "Hakko", model: "FX-888D", cost: 115, condition: "operational", location: "Electronics Bench", specs: "70W 120V · 50-480°C", notes: "Tin tip before turning off; use brass wire wool" },
      { type: "equipment", name: "True-RMS Digital Multimeter", category: "Hand Tools & Measuring", brand: "Fluke", model: "117 Electrician", cost: 195, condition: "operational", location: "Electronics Bench", specs: "CAT III 600V · Non-contact volt alert", notes: "Check fuse and test leads before high current measurements" },
      { type: "equipment", name: "Adjustable Bench DC Power Supply", category: "Power Hand Tools", brand: "Korad", model: "KD3005D", cost: 95, condition: "operational", location: "Electronics Shelf", specs: "0-30V 0-5A Constant Current", notes: "Always verify voltage setting before connecting sensitive circuits" },
      { type: "material", name: "60/40 Rosin Core Solder Wire 0.8mm", category: "Electronics & Wiring", quantity: 2, unit: "spools", price: 14.50, lowStockThreshold: 1, location: "Solder Station Drawer", supplier: "Adafruit" },
      { type: "material", name: "Heat Shrink Tubing Assortment (150 pcs)", category: "Electronics & Wiring", quantity: 1, unit: "kits", price: 9.99, lowStockThreshold: 1, location: "Electronics Drawer 2", supplier: "Amazon" }
    ]
  },
  safety_air: {
    title: "Safety, Air Quality & Dust Care",
    icon: "🦺",
    category: "Safety & Dust",
    description: "Keep shop air clean, lungs protected, and machinery dust-free.",
    items: [
      { type: "equipment", name: "1.5 HP Mobile Cyclone Dust Collector", category: "Dust Collection & Air", brand: "Laguna", model: "CFlux:1", cost: 650, condition: "operational", location: "Main Bay", specs: "1 Micron canister · 900 CFM", notes: "Empty collection drum when 3/4 full; pulse clean filter regularly" },
      { type: "equipment", name: "3-Speed Ceiling Air Filtration Unit", category: "Dust Collection & Air", brand: "WEN", model: "3410", cost: 140, condition: "operational", location: "Ceiling Mount Center", specs: "400 CFM with RF remote control", notes: "Wash electrostatic outer filter monthly; replace inner filter yearly" },
      { type: "equipment", name: "Professional Half-Face Respirator (P100)", category: "Safety Gear & PPE", brand: "3M", model: "Rugged Comfort 6502QL", cost: 38, condition: "operational", location: "PPE Hook 1", specs: "P100 organic vapor filters", notes: "Store in airtight ziplock bag when not in use to preserve filters" },
      { type: "material", name: "Nitrile Gloves 5-mil (Box of 100)", category: "Other Supplies", quantity: 2, unit: "boxes", price: 12.50, lowStockThreshold: 1, location: "Safety Cabinet", supplier: "Costco / Harbor Freight" }
    ]
  },
  origami: {
    title: "Origami & Papercraft Studio Kit",
    icon: "🦢",
    category: "Papercraft & Origami",
    description: "Precision folding bone folders, authentic Japanese Kami & Tant papers, self-healing cutting mat, and methyl cellulose sizing.",
    items: [
      { type: "equipment", name: "Genuine Cattle Bone Folder (6\")", category: "Hand Tools & Measuring", brand: "Lineco", cost: 14.50, condition: "operational", location: "Origami Desk", specs: "Smooth polished natural bone", notes: "Use blunt tip for scoring and flat edge for sharp creases" },
      { type: "equipment", name: "A3 Self-Healing Cutting Mat (12x18\")", category: "Hand Tools & Measuring", brand: "Olfa", cost: 22.00, condition: "operational", location: "Origami Desk", specs: "Grid markings & angle guidelines", notes: "Never fold on rough table without mat underneath" },
      { type: "equipment", name: "Stainless Steel Precision Rotary Ruler (30cm)", category: "Hand Tools & Measuring", brand: "Shinwa", cost: 12.00, condition: "operational", location: "Tool Drawer", specs: "Zero-glare metric & imperial", notes: "Use with rotary cutter for squaring sheets" },
      { type: "material", name: "Japanese Kami Origami Paper Pack (15x15cm, 100 sheets)", category: "Papercraft & Origami", quantity: 100, unit: "sheets", price: 0.12, cost: 12.00, lowStockThreshold: 20, location: "Paper Drawer A", supplier: "Taro's Origami" },
      { type: "material", name: "Tant Dual-Color Paper Assortment (15x15cm, 48 sheets)", category: "Papercraft & Origami", quantity: 48, unit: "sheets", price: 0.28, cost: 13.50, lowStockThreshold: 10, location: "Paper Drawer B", supplier: "Toyo Japan" },
      { type: "material", name: "Methyl Cellulose (MC) Powder (100g)", category: "Finishes & Adhesives", quantity: 100, unit: "g", price: 0.08, cost: 8.00, lowStockThreshold: 25, location: "Sizing Shelf", supplier: "Bookbinding Supplies", notes: "Mix 1 tbsp powder into 1 cup cold water; let hydrate overnight for tissue foil & wet-folding" }
    ]
  },
  laser: {
    title: "Laser Cutting & Engraving Studio Kit",
    icon: "🔥",
    category: "Laser Consumables & Acrylic",
    description: "Certified multi-wavelength safety goggles, high-flow air assist pump, optical lens cleaner, and premium laser birch & acrylic blanks.",
    items: [
      { type: "equipment", name: "Certified Laser Safety Goggles (OD6+ Multi-Wavelength)", category: "Safety Gear & PPE", brand: "Cloudray", model: "OD6+ 190-540nm & 10600nm", cost: 68.00, condition: "operational", location: "Laser Station Rack", specs: "Optical Density > 6; CE EN207 Certified", notes: "Mandatory eye protection for diode and CO2 laser operations" },
      { type: "equipment", name: "Electromagnetic Air Assist Pump (45L/min)", category: "Dust Collection & Air", brand: "Hailea", model: "ACO-318", cost: 42.00, condition: "operational", location: "Under Laser Table", specs: "45 L/min · 0.025 MPa high flow", notes: "Prevents wood charring flare-ups and cleans acrylic cuts" },
      { type: "material", name: "Cast Acrylic Sheet Multipack 3mm (12x12\", 5 sheets)", category: "Laser Consumables & Acrylic", quantity: 5, unit: "sheets", price: 6.50, cost: 32.50, lowStockThreshold: 2, location: "Material Rack L1", supplier: "Tap Plastics" },
      { type: "material", name: "Baltic Birch Laser Plywood Grade B/BB 3mm (12x20\", 10 sheets)", category: "Sheet Goods", quantity: 10, unit: "sheets", price: 4.20, cost: 42.00, lowStockThreshold: 3, location: "Flat Sheet Rack", supplier: "Woodcraft" },
      { type: "material", name: "Optical Lens Cleaning Tissues & 99% IPA (50 wipes)", category: "Laser Consumables & Acrylic", quantity: 1, unit: "kit", price: 14.00, cost: 14.00, lowStockThreshold: 1, location: "Laser Cleaning Kit", supplier: "Thorlabs", notes: "Clean ZnSe focal lens after every 4 hours of cutting" }
    ]
  },
  leather: {
    title: "Leathercraft & Saddle Stitching Kit",
    icon: "🪡",
    category: "Leather, Hides & Hardware",
    description: "French diamond pricking irons, John James harness needles, bonded Tiger thread, full-grain veg-tan cowhide, and Tokonole burnishing gum.",
    items: [
      { type: "equipment", name: "French Style Pricking Irons 3.85mm (2+8 Tooth Set)", category: "Hand Tools & Measuring", brand: "KS Blade Punch", cost: 65.00, condition: "operational", location: "Leather Drawer 1", specs: "High carbon tool steel · 3.85mm pitch (6.5 SPI)", notes: "Always punch on rubber/poly punching board; never directly on granite" },
      { type: "equipment", name: "John James Saddler's Harness Needles (Size 004, 25-pack)", category: "Hand Tools & Measuring", brand: "John James", cost: 11.50, condition: "operational", location: "Needle Case", specs: "Round blunt tip 48mm x 1.02mm", notes: "Blunt tips prevent splitting leather grain or threads" },
      { type: "equipment", name: "Solid Wood Multi-Groove Edge Slicker", category: "Hand Tools & Measuring", brand: "Craft Sha", cost: 8.50, condition: "operational", location: "Burnishing Caddy", specs: "Dense tropical hardwood slicker", notes: "Use with Tokonole or beeswax for glass-smooth edges" },
      { type: "material", name: "Vegetable-Tanned Cowhide Double Shoulder 4-5oz (14 sq ft)", category: "Leather, Hides & Hardware", quantity: 14, unit: "sq ft", price: 9.50, cost: 133.00, lowStockThreshold: 4, location: "Hide Roll Bin", supplier: "Hermann Oak" },
      { type: "material", name: "Ritza 25 'Tiger' Waxed Polyester Thread 0.55mm (50m)", category: "Leather, Hides & Hardware", quantity: 50, unit: "meters", price: 0.24, cost: 12.00, lowStockThreshold: 10, location: "Thread Spool Rack", supplier: "Julius Koch" },
      { type: "material", name: "Seiwa Tokonole Leather Burnishing Gum (120g Clear)", category: "Finishes & Adhesives", quantity: 1, unit: "tub", price: 14.00, cost: 14.00, lowStockThreshold: 1, location: "Adhesives Shelf", supplier: "Rocky Mountain Leather", notes: "Water-based gum for burnishing flesh side and edges to high glass shine" }
    ]
  },
  ceramics: {
    title: "Ceramics & Wheel Throwing Studio Kit",
    icon: "🏺",
    category: "Ceramics, Clay & Glaze",
    description: "Essential pottery tool pack, stainless steel trimming ribbons, wire cut-off, Orton pyrometric cones, and Laguna B-Mix clay.",
    items: [
      { type: "equipment", name: "Pottery Tool 8-Piece Wood & Ribbon Set", category: "Hand Tools & Measuring", brand: "Kemper", cost: 18.50, condition: "operational", location: "Pottery Tool Bucket", specs: "Rib, sponge, wire cutter, needle tool, loop ribbon", notes: "Wash and dry tools after every throwing session to prevent rust" },
      { type: "equipment", name: "Orton Pyrometric Standard Self-Supporting Cones (Cone 04 & 6)", category: "Hand Tools & Measuring", brand: "Orton", cost: 24.00, condition: "operational", location: "Kiln Shelf", specs: "Cone 04 (1063°C) and Cone 6 (1222°C)", notes: "Place in witness cone pack on middle kiln shelf at peephole line" },
      { type: "material", name: "Laguna B-Mix Clay with Grog Cone 5-6 (25 lb Bag)", category: "Ceramics, Clay & Glaze", quantity: 25, unit: "lbs", price: 0.90, cost: 22.50, lowStockThreshold: 10, location: "Clay Bin 1", supplier: "Laguna Clay Co", notes: "Store in double-bagged bucket with damp sponge on top" },
      { type: "material", name: "Amaco Potter's Choice Cone 5-6 Glaze (Pint - Oatmeal/Blue)", category: "Ceramics, Clay & Glaze", quantity: 2, unit: "pints", price: 16.50, cost: 33.00, lowStockThreshold: 1, location: "Glaze Shelf A", supplier: "Amaco" },
      { type: "material", name: "USG No. 1 Pottery Plaster (50 lb Bag)", category: "Ceramics, Clay & Glaze", quantity: 50, unit: "lbs", price: 0.65, cost: 32.50, lowStockThreshold: 15, location: "Dry Powder Cabinet", supplier: "USG", notes: "Keep tightly sealed in airtight container away from shop moisture" }
    ]
  },
  welding: {
    title: "MIG & TIG Metal Fabrication Studio Kit",
    icon: "⚡",
    category: "Welding, Gas & Wire",
    description: "Auto-darkening true color welding helmet, MIG pliers, ER70S-6 wire, C25 shielding gas regulator, and magnetic fabrication squares.",
    items: [
      { type: "equipment", name: "Auto-Darkening True-Color Welding Helmet (Optical 1/1/1/1)", category: "Safety Gear & PPE", brand: "Lincoln Electric", model: "VIKING 3350", cost: 285.00, condition: "operational", location: "Welding Helmet Hook", specs: "Shade 5-13 · 3.74x3.34\" view", notes: "Replace outer clear sacrificial lens cover when spatter clouds vision" },
      { type: "equipment", name: "Welper 8-Way MIG Pliers", category: "Hand Tools & Measuring", brand: "Welper", model: "YS-50", cost: 24.00, condition: "operational", location: "MIG Cart Drawer", specs: "Nozzle cleaner, tip wrench, wire cutter", notes: "Keep near wire feeder for nozzle reaming and wire snips" },
      { type: "equipment", name: "Magnetic Multi-Angle Ground Clamp & Clamping Square (4-pack)", category: "Hand Tools & Measuring", brand: "Strong Hand Tools", cost: 48.00, condition: "operational", location: "Steel Fab Table", specs: "50 lb pull strength · 45°/90°/135°", notes: "Wipe metal shavings off magnets before precision layout" },
      { type: "material", name: "ER70S-6 Mild Steel MIG Wire 0.030\" (11 lb Spool)", category: "Welding, Gas & Wire", quantity: 1, unit: "spool", price: 29.50, cost: 29.50, lowStockThreshold: 1, location: "MIG Machine Spool Hub", supplier: "Hobart", notes: "Deoxidized with silicon and manganese for clean arc with C25 gas" },
      { type: "material", name: "Heavy Duty Premium Goat-Grain TIG/MIG Gloves (Pair)", category: "Safety Gear & PPE", quantity: 2, unit: "pairs", price: 18.00, cost: 36.00, lowStockThreshold: 1, location: "Safety Cabinet", supplier: "Tillman", notes: "Kevlar stitched heat-resistant goatskin" }
    ]
  },
  cnc: {
    title: "CNC Machining & Router Starter Kit",
    icon: "⚙️",
    category: "CNC Bits & Tooling",
    description: "Solid carbide upcut, downcut, compression spiral bits, 60° V-groove bit, precision ER20 collet set, and collet wrench.",
    items: [
      { type: "equipment", name: "High-Precision ER20 Spring Collet Set (1/8\", 1/4\", 3/8\", 1/2\")", category: "Hand Tools & Measuring", brand: "Techniks", cost: 68.00, condition: "operational", location: "CNC Spindle Drawer", specs: "T.I.R. < 0.0002\" precision runout", notes: "Clean collet cone and nut threads before torquing endmills" },
      { type: "equipment", name: "Solid Carbide 1/4\" Upcut Spiral Endmill (2-Flute)", category: "Hand Tools & Measuring", brand: "Amana Tool", model: "46102-K", cost: 36.00, condition: "operational", location: "Bit Block 1", specs: "Spektra extreme tool life coating", notes: "Superior chip evacuation on deep pockets and through-mortises" },
      { type: "equipment", name: "Solid Carbide 1/4\" Compression Spiral Endmill", category: "Hand Tools & Measuring", brand: "Amana Tool", model: "46170-K", cost: 44.00, condition: "operational", location: "Bit Block 1", specs: "Dual upcut/downcut shear geometry", notes: "Prevents veneer tearout on both top and bottom faces of plywood" },
      { type: "equipment", name: "Solid Carbide 60° V-Groove Lettering & Chamfer Bit", category: "Hand Tools & Measuring", brand: "Whiteside", model: "1540", cost: 24.50, condition: "operational", location: "Bit Block 2", specs: "1/4\" shank 60-degree point", notes: "Ideal for fine V-carving text, signage, and edge chamfers" },
      { type: "material", name: "Double-Sided CNC Spoilboard Hold-Down Tape (36 yd)", category: "Finishes & Adhesives", quantity: 1, unit: "roll", price: 16.00, cost: 16.00, lowStockThreshold: 1, location: "CNC Shelf", supplier: "XFasten", notes: "Leaves zero gummy residue on wood bottom or spoilboard MDF" }
    ]
  },
  blacksmith: {
    title: "Blacksmithing & Knife Making Studio Kit",
    icon: "⚒️",
    category: "Blacksmithing, Steels & Gas",
    description: "Hand-forged rounding hammer, Wolf Jaw tongs, Parks 50 fast quench oil, AISI 1095 & 15N20 Damascus steel billet stock.",
    items: [
      { type: "equipment", name: "Blacksmith Swedish Pattern Rounding Hammer (2.5 lb)", category: "Hand Tools & Measuring", brand: "Picard", cost: 62.00, condition: "operational", location: "Anvil Tool Rack", specs: "C45 carbon steel · crowned flat and round faces", notes: "Flat face for drawing out; rounded face for fast fullering" },
      { type: "equipment", name: "Wolf Jaw Blacksmithing Tongs (16\")", category: "Hand Tools & Measuring", brand: "Centaur Forge", cost: 42.00, condition: "operational", location: "Forge Wall Hook", specs: "Holds round, square, and flat blade stock securely", notes: "Never quench tongs cold in water while holding red hot steel" },
      { type: "equipment", name: "Digital Magnetic Contact Thermometer & Curie Magnet", category: "Hand Tools & Measuring", brand: "ThermoWorks", cost: 38.00, condition: "operational", location: "Quench Tank Bench", specs: "Tests 1414°F non-magnetic phase shift", notes: "Verify steel is non-magnetic before final soak and quench" },
      { type: "material", name: "Parks 50 Fast Knife Quench Oil (1 Gallon)", category: "Other Supplies", quantity: 1, unit: "gal", price: 38.00, cost: 38.00, lowStockThreshold: 1, location: "Steel Quench Tank", supplier: "Maxim Oil", notes: "Engineered specifically for 1095 and W2 to beat the 9-second nose curve" },
      { type: "material", name: "AISI 1095 & 15N20 Precision Ground Blade Bar Assortment", category: "Raw Metals & Acrylic", quantity: 4, unit: "bars", price: 14.50, cost: 58.00, lowStockThreshold: 2, location: "Steel Rack B2", supplier: "New Jersey Steel Baron", notes: "1.5\" x 0.156\" x 12\" annealed high-carbon flat bars for Damascus forge welding" }
    ]
  },
  fasteners: {
    title: "Precision Fasteners & Machining Drills Kit",
    icon: "🔩",
    category: "Fasteners & Hardware",
    description: "HSS-E Cobalt drill bit index, M3-M10 precision tap & die set, automatic center punch, and DIN 912 Class 12.9 hardware organizer.",
    items: [
      { type: "equipment", name: "HSS-E M35 Cobalt Drill Bit Index (1mm - 13mm by 0.5mm)", category: "Hand Tools & Measuring", brand: "Bosch", cost: 58.00, condition: "operational", location: "Drill Bit Cabinet", specs: "5% Cobalt alloy · 135° split point", notes: "Use cutting oil on alloy steels; 135° split point eliminates walking without center punch" },
      { type: "equipment", name: "Metric HSS Machine Tap & Die Set (M3 - M12 with T-handles)", category: "Hand Tools & Measuring", brand: "Irwin Hanson", cost: 74.00, condition: "operational", location: "Machining Drawer 2", specs: "Plug chamfer 3-5 threads · HSS ground thread", notes: "Reverse tap 1/2 turn every full turn to snap chips; always use tapping fluid" },
      { type: "equipment", name: "Heavy Duty Spring-Loaded Automatic Center Punch", category: "Hand Tools & Measuring", brand: "Starrett", model: "18A", cost: 42.00, condition: "operational", location: "Layout Caddy", specs: "Hardened steel replaceable point", notes: "Adjustable knurled cap controls strike force for aluminum vs steel" },
      { type: "material", name: "DIN 912 Class 12.9 Socket Head Cap Screws & Nuts (M3-M6 Assortment 600 pcs)", category: "Fasteners & Hardware", quantity: 1, unit: "kit", price: 28.50, cost: 28.50, lowStockThreshold: 1, location: "Hardware Bin 1A", supplier: "Bolt Depot", notes: "1200 MPa tensile strength black oxide socket screws" },
      { type: "material", name: "Tap Magic EP-Xtra Industrial Cutting & Tapping Fluid (16 oz)", category: "Finishes & Adhesives", quantity: 1, unit: "bottle", price: 12.00, cost: 12.00, lowStockThreshold: 1, location: "Mill Fluid Shelf", supplier: "Steco", notes: "Extends drill and tap cutting life by 4x; ozone safe" }
    ]
  },
  glass: {
    title: "Stained Glass & Tiffany Copper Foil Studio Kit",
    icon: "🪟",
    category: "Stained Glass, Foil & Came",
    description: "Hakko 601 temperature-controlled iron, Toyo pistol grip glass cutter, running & grozing pliers, 60/40 solder, and Venture black-backed foil.",
    items: [
      { type: "equipment", name: "Hakko FX-601 Temperature Controlled Ceramic Soldering Iron", category: "Power Hand Tools", brand: "Hakko", model: "FX-601", cost: 79.00, condition: "operational", location: "Glass Soldering Station", specs: "67W ceramic element · 464°F to 1004°F dial", notes: "Maintain tip tinned; clean on damp cellulose sponge or brass wool" },
      { type: "equipment", name: "Toyo Custom-Grip Supercutter Carbide Glass Cutter", category: "Hand Tools & Measuring", brand: "Toyo", model: "TC-21", cost: 36.00, condition: "operational", location: "Glass Cutting Board", specs: "Tap-wheel carbide technology · pistol ergonomic grip", notes: "Fill reservoir with light mineral cutting oil; maintain steady 7 lb pressure" },
      { type: "equipment", name: "Stained Glass 8\" Metal Running Pliers & Grozing Plier Set", category: "Hand Tools & Measuring", brand: "Studio Pro", cost: 26.50, condition: "operational", location: "Glass Tool Tray", specs: "Rubber jaw pads · set-screw pressure stop", notes: "Align red center mark directly over score line before squeezing" },
      { type: "material", name: "60/40 Tin/Lead Solid Wire Solder 1/8\" (1 lb Spool)", category: "Stained Glass, Foil & Came", quantity: 2, unit: "lbs", price: 18.50, cost: 37.00, lowStockThreshold: 1, location: "Solder Caddy", supplier: "Canfield", notes: "Melting range 361°F-374°F; delivers high rounded decorative Tiffany beads" },
      { type: "material", name: "Venture Black-Backed Copper Foil Tape 7/32\" (36 yd roll)", category: "Stained Glass, Foil & Came", quantity: 2, unit: "rolls", price: 11.50, cost: 23.00, lowStockThreshold: 1, location: "Foil Dispenser", supplier: "Venture Tape", notes: "Standard width for 3mm glass; black adhesive backing matches dark patina" },
      { type: "material", name: "Novacan Black Patina for Solder & Lead (8 oz Bottle)", category: "Finishes & Adhesives", quantity: 1, unit: "bottle", price: 9.50, cost: 9.50, lowStockThreshold: 1, location: "Chemical Finish Shelf", supplier: "Novacan", notes: "Neutralize flux with baking soda wash before applying patina" }
    ]
  },
  jewelry: {
    title: "Artisan Jewelry & Metalsmithing Kit",
    icon: "💍",
    category: "Precious Metals & Gemstones",
    description: "German jeweler's saw frame, Swiss saw blades, steel ring mandrel, rawhide mallet, sterling silver sheet, and Battern's flux.",
    items: [
      { type: "equipment", name: "German Adjustable Jeweler's Saw Frame 3\" Depth", category: "Hand Tools & Measuring", brand: "Grobet USA", cost: 24.50, condition: "operational", location: "Jewelry Bench Drawer", specs: "Thumbscrew tensioning · hardened steel clamp plates", notes: "Ping blade for high C note pitch; teeth must face forward and down toward handle" },
      { type: "equipment", name: "Swiss Made Piercing Saw Blades #2/0 (Pack of 12)", category: "Hand Tools & Measuring", brand: "Pike / Vallorbe", cost: 8.50, condition: "operational", location: "Blade Tube Caddy", specs: "56 TPI · 0.26mm thickness", notes: "Lubricate blade frequently with beeswax or BurLife to prevent breakage" },
      { type: "equipment", name: "Hardened Steel Graduated Ring Mandrel (Sizes 1-15)", category: "Hand Tools & Measuring", brand: "EuroTool", cost: 32.00, condition: "operational", location: "Anvil Block", specs: "Smooth mirror polish · quarter size markings", notes: "Never strike steel mandrel with steel hammer; use rawhide or wood mallet" },
      { type: "equipment", name: "Weighted Rawhide Mallet (Size 1)", category: "Hand Tools & Measuring", brand: "Garland", cost: 22.00, condition: "operational", location: "Hammer Rack", specs: "Water buffalo rawhide roll", notes: "Shapes ring bands and wire without marring precious metal surfaces" },
      { type: "material", name: "Sterling Silver 925 Sheet 18-Gauge (6\" x 2\" Dead Soft)", category: "Precious Metals & Gemstones", quantity: 1, unit: "sheet", price: 42.00, cost: 42.00, lowStockThreshold: 1, location: "Precious Metal Safe", supplier: "Rio Grande", notes: "Dead soft state ready for piercing, texturing, and doming" },
      { type: "material", name: "Battern's Liquid Soldering Flux (7 oz Bottle)", category: "Finishes & Adhesives", quantity: 1, unit: "bottle", price: 8.50, cost: 8.50, lowStockThreshold: 1, location: "Soldering Station", supplier: "Rio Grande", notes: "Self-pickling liquid flux for gold and silver hard soldering" }
    ]
  },
  bookbinding: {
    title: "Hand Bookbinding & Relief Print Kit",
    icon: "📖",
    category: "Bookbinding, Paper & Inks",
    description: "Natural cattle bone folder, Irish waxed linen thread, Davey binder's board, acid-free PVA glue, and Caligo Safe Wash relief ink.",
    items: [
      { type: "equipment", name: "Genuine Cattle Bone Folder 6\" Pointed", category: "Hand Tools & Measuring", brand: "Lineco", cost: 14.50, condition: "operational", location: "Bookbinding Caddy", specs: "Hand polished natural ox bone", notes: "Smooth rounded edge for creasing signatures; pointed tip for scoring hinges" },
      { type: "equipment", name: "Bookbinder's Heavy Piercing Awl with Wood Handle", category: "Hand Tools & Measuring", brand: "Talas", cost: 12.00, condition: "operational", location: "Awl Holder", specs: "Hardened needle point · tapered brass ferrule", notes: "Pierce sewing station holes inside cradle guide for true alignment" },
      { type: "equipment", name: "Speedball 4\" Soft Rubber Brayer (40 Durometer)", category: "Hand Tools & Measuring", brand: "Speedball", cost: 18.00, condition: "operational", location: "Print Bench", specs: "Natural rubber roller · steel frame", notes: "Store hung or resting on built-in stand; never rest rubber flat on bench" },
      { type: "material", name: "Unbleached Irish Waxed Linen Thread 25/3 (50m Spool)", category: "Bookbinding, Paper & Inks", quantity: 1, unit: "spool", price: 16.00, cost: 16.00, lowStockThreshold: 1, location: "Thread Box", supplier: "Crawford", notes: "Pure 3-ply linen lightly pre-waxed for smooth gliding without paper tear" },
      { type: "material", name: "Davey Red Label Binder's Board #20 (0.082\" / 2.1mm - 3 sheets)", category: "Bookbinding, Paper & Inks", quantity: 3, unit: "sheets", price: 6.50, cost: 19.50, lowStockThreshold: 1, location: "Flat Board Drawer", supplier: "Davey Co", notes: "High-density acid-free board; grain direction must run parallel to spine" },
      { type: "material", name: "Lineco Neutral pH Archival PVA Book Adhesive (16 oz)", category: "Finishes & Adhesives", quantity: 1, unit: "bottle", price: 13.50, cost: 13.50, lowStockThreshold: 1, location: "Glue Caddy", supplier: "Lineco", notes: "Flexible lay-flat dry film; mixes 1:1 with methyl cellulose for extended working open time" }
    ]
  },
  sla: {
    title: "SLA / MSLA Resin 3D Printing Studio Kit",
    icon: "🧪",
    category: "SLA Photopolymer Resin & Films",
    description: "405nm Wash & Cure Station, chemical nitrile gloves, FEP release film, rapid grey photopolymer resin, and 190µm paint strainers.",
    items: [
      { type: "equipment", name: "Anycubic Wash & Cure 2.0 UV Machine (405nm)", category: "3D Printers & CNC", brand: "Anycubic", cost: 129.00, condition: "operational", location: "Resin Wash Station", specs: "Rotating 360° turntable · 405nm UV array", notes: "Always use sealed bucket with 99% IPA; wear eye protection" },
      { type: "equipment", name: "Heavy Duty Chemical Nitrile Gloves 8-mil (Pack of 50)", category: "Safety Gear & PPE", brand: "Venom Steel", cost: 24.50, condition: "operational", location: "Safety Cabinet", specs: "8-mil dual layer chemical barrier", notes: "Mandatory for handling uncured resin and contaminated IPA wash baths" },
      { type: "equipment", name: "Stainless Steel Resin Funnel & 190µm Mesh Strainer", category: "Hand Tools & Measuring", brand: "Elegoo", cost: 14.00, condition: "operational", location: "Resin Caddy", specs: "Washable stainless steel mesh", notes: "Filter cured chunks after every print failure before pouring back into bottle" },
      { type: "material", name: "SLA Standard Rapid Photopolymer Resin 405nm Grey (1000g)", category: "SLA Photopolymer Resin & Films", quantity: 1, unit: "bottle", price: 28.00, cost: 28.00, lowStockThreshold: 1, location: "Dark Chemistry Cabinet", supplier: "Elegoo", notes: "Shake bottle 2 minutes before pouring; optimal print temperature 23°C-28°C" },
      { type: "material", name: "FEP 2.0 (PFA / nFEP) Release Film Sheets 0.15mm (5-pack)", category: "SLA Photopolymer Resin & Films", quantity: 5, unit: "sheets", price: 4.80, cost: 24.00, lowStockThreshold: 2, location: "SLA Spares Drawer", supplier: "Phrozen", notes: "Tension like a drumhead (~300-350 Hz bottle cap spacer tap) when tightening vat ring" }
    ]
  },
  luthier: {
    title: "Luthier & Guitar Building Studio Kit",
    icon: "🎸",
    category: "Luthier Tonewoods, Frets & Parts",
    description: "Japanese fret slotting saw with depth stop, StewMac fret rocker, dual-action truss rod, pre-radiused 18% nickel-silver fretwire, and bone blanks.",
    items: [
      { type: "equipment", name: "Japanese Fret Slotting Pull Saw 0.023\" Kerf", category: "Hand Tools & Measuring", brand: "StewMac", cost: 42.50, condition: "operational", location: "Luthier Tool Wall", specs: "0.023\" / 0.58mm slot width with clear acrylic depth stop", notes: "Cuts on pull stroke; stop depth at 2.5mm for standard fret tang" },
      { type: "equipment", name: "Precision Stainless Steel Fret Rocker (4 Edge Lengths)", category: "Hand Tools & Measuring", brand: "StewMac", cost: 28.00, condition: "operational", location: "Bench Drawer 1", specs: "Ground flat to ±0.00015\" tolerance", notes: "Spans 3 frets at once to instantly pinpoint high frets causing string buzz" },
      { type: "equipment", name: "Two-Way Dual-Action Guitar Truss Rod (460mm / 18.1\")", category: "Hand Tools & Measuring", brand: "Gotoh", cost: 18.50, condition: "operational", location: "Neck Parts Drawer", specs: "Dual action push-pull 4mm allen wrench drive", notes: "Wraps in kapton tape before epoxy filler strip install; provides convex and concave neck relief" },
      { type: "material", name: "Hard Nickel-Silver Fretwire Medium/Higher (24 Pre-Radiused Pieces)", category: "Luthier Tonewoods, Frets & Parts", quantity: 24, unit: "pcs", price: 0.80, cost: 19.20, lowStockThreshold: 6, location: "Fret Tube 1", supplier: "Jescar", notes: "18% Nickel-Silver alloy · 0.023\" tang with barbed retention studs" },
      { type: "material", name: "Unbleached Dense Cattle Bone Nut & Saddle Blanks (6 pcs)", category: "Luthier Tonewoods, Frets & Parts", quantity: 6, unit: "blanks", price: 3.50, cost: 21.00, lowStockThreshold: 2, location: "Nut & Saddle Bin", supplier: "Stewart-MacDonald", notes: "Natural unbleached dense bone transfers maximum string acoustic vibrational energy" }
    ]
  },
  composites: {
    title: "Composites & Carbon Fiber Infusion Kit",
    icon: "🌀",
    category: "Composites, Carbon Fiber & Resins",
    description: "Dual-stage vacuum pump with gauge, yellow butyl sealant tape, aerospace peel ply, resin infusion flow mesh, and 3K 2x2 twill carbon fiber.",
    items: [
      { type: "equipment", name: "Rotary Vane Vacuum Pump 3 CFM with Catch Pot & Gauge", category: "Stationary Machinery", brand: "Robinair", cost: 135.00, condition: "operational", location: "Composites Cart", specs: "Dual stage 29.5 inHg deep vacuum · 1/3 HP motor", notes: "Check vacuum oil clarity before every infusion; always use resin catch pot trap" },
      { type: "equipment", name: "High-Temperature Yellow Butyl Vacuum Sealant Tape (25ft Roll)", category: "Hand Tools & Measuring", brand: "Airtech AT-200Y", cost: 12.50, condition: "operational", location: "Tape Caddy", specs: "Rated to 150°C · high-tack rubber compound", notes: "Leave paper backing on until final bag fit; press pleat ears firmly with roller" },
      { type: "equipment", name: "Aerospace High-Flow Green Resin Infusion Flow Mesh (5m²)", category: "Hand Tools & Measuring", brand: "Airtech Greenflow 75", cost: 22.00, condition: "operational", location: "Consumables Rack", specs: "High velocity knitted polyethylene resin distribution matrix", notes: "Stop mesh 50mm short of vacuum brake rail to prevent resin rush into catch pot" },
      { type: "material", name: "3K 200 gsm Carbon Fiber Fabric 2x2 Twill (1m x 1m)", category: "Composites, Carbon Fiber & Resins", quantity: 1, unit: "sq.m", price: 36.00, cost: 36.00, lowStockThreshold: 1, location: "Fabric Roll Bin", supplier: "Toray / Composite Envisions", notes: "Toray T300 fiber · drapeable 2x2 twill weave for compound curves" },
      { type: "material", name: "Low-Viscosity Epoxy Infusion Resin & Slow Hardener Kit (1.3 kg)", category: "Composites, Carbon Fiber & Resins", quantity: 1, unit: "kit", price: 44.00, cost: 44.00, lowStockThreshold: 1, location: "Chemical Flammables Cabinet", supplier: "Pro-Set", notes: "180 mPa·s low viscosity · 90 min infusion working pot life @ 22°C" }
    ]
  },
  horology: {
    title: "Watchmaking & Horology Bench Kit",
    icon: "⏱️",
    category: "Watchmaking & Horology Tools",
    description: "Swiss-style tweezers #2 & #5, anti-magnetic screwdrivers, movement holder, Moebius 9010 synthetic oil, and Bergeon rodico.",
    items: [
      { type: "equipment", name: "Swiss Anti-Magnetic Stainless Steel Tweezers #2 & #5 (Pair)", category: "Hand Tools & Measuring", brand: "Dumont", cost: 48.00, condition: "operational", location: "Watch Bench Drawer 1", specs: "High precision ground tips · 100% anti-magnetic", notes: "Never touch screw threads or jewels with rough tools; dress tips on Arkansas stone" },
      { type: "equipment", name: "Bergeon 30081 Ergonomic Watchmaker Screwdrivers (Set of 5)", category: "Hand Tools & Measuring", brand: "Bergeon", cost: 89.00, condition: "operational", location: "Watch Carousel Stand", specs: "Sizes 0.80, 1.00, 1.20, 1.40, 1.60mm · rotating elastomer caps", notes: "Hone screwdriver blades flat to match movement screw slot depth exactly" },
      { type: "equipment", name: "Universal Reversible Watch Movement Holder (Large & Small)", category: "Hand Tools & Measuring", brand: "Bergeon 4040", cost: 24.50, condition: "operational", location: "Bench Top Caddy", specs: "Synthetic non-marring jaw vises", notes: "Locks calibers securely without bending pallet fork bridge or balance cock" },
      { type: "material", name: "Bergeon 6033-1 Rodico Cleaning Putty (Pack of 2 Bars)", category: "Watchmaking & Horology Tools", quantity: 2, unit: "bars", price: 8.50, cost: 17.00, lowStockThreshold: 1, location: "Parchment Box", supplier: "Bergeon", notes: "Cleans pivots, removes finger grease, absorbs excess oil droplets from train jewels" },
      { type: "material", name: "Moebius 9010 Fine Synthetic Horological Watch Oil (2ml Bottle)", category: "Watchmaking & Horology Tools", quantity: 1, unit: "bottle", price: 34.00, cost: 34.00, lowStockThreshold: 1, location: "Lube Safe", supplier: "Moebius Switzerland", notes: "Universal high-speed balance cap jewel & escape wheel pivot synthetic lubricant" }
    ]
  },
  robotics: {
    title: "Robotics & Mechatronics Lab Kit",
    icon: "🤖",
    category: "Robotics, Motors & Mechatronics",
    description: "NEMA 17 high-torque steppers, TMC2209 silent drivers, GT2 timing pulley pack, 24V power supply, and metal-gear servos.",
    items: [
      { type: "equipment", name: "NEMA 17 Bipolar Stepper Motors 59 N·cm / 84 oz·in (Pair)", category: "Stationary Machinery", brand: "StepperOnline", cost: 32.00, condition: "operational", location: "Mechatronics Drawer 1", specs: "2.0A rated · 1.8° step angle (200 steps/rev)", notes: "Set driver VREF current to 1.4A for cool continuous operation with thermal sink" },
      { type: "equipment", name: "Trinamic TMC2209 V1.3 SilentStepStick Drivers (Set of 4)", category: "Hand Tools & Measuring", brand: "BigTreeTech", cost: 24.50, condition: "operational", location: "Electronics Bench", specs: "StealthChop2 ultra-silent & StallGuard4 sensorless homing", notes: "UART address jumpers configurable; heat sinks mandatory with active fan airflow" },
      { type: "equipment", name: "Mean Well LRS-350-24 Industrial 24V 14.6A Enclosed PSU", category: "Stationary Machinery", brand: "Mean Well", cost: 42.00, condition: "operational", location: "Power Shelf", specs: "350W · 24V DC regulated output", notes: "Verify 115V/230V selector switch before initial AC mains power connection" },
      { type: "material", name: "GT2 6mm Neoprene Timing Belt (5m) & 20T Pulleys / Idler Kit", category: "Robotics, Motors & Mechatronics", quantity: 1, unit: "kit", price: 16.50, cost: 16.50, lowStockThreshold: 1, location: "Belts & Pulleys Caddy", supplier: "Gates Unitta", notes: "Fiberglass reinforced core prevents belt stretch under rapid acceleration" },
      { type: "material", name: "Digital Metal-Gear High-Torque Servos MG996R (2-pack)", category: "Robotics, Motors & Mechatronics", quantity: 2, unit: "servos", price: 9.00, cost: 18.00, lowStockThreshold: 1, location: "Servo Box", supplier: "TowerPro", notes: "11 kg·cm holding torque at 6.0V; uses standard 50 Hz PWM control signals" }
    ]
  },
  bicycle: {
    title: "Bicycle Framebuilding & Wheel Studio Kit",
    icon: "🚲",
    category: "Bicycle Components & Tubing",
    description: "Park Tool spoke tensiometer, 4130 chromoly frame tubing set, DT Swiss Competition double-butted spokes, and brass nipples.",
    items: [
      { type: "equipment", name: "Park Tool TM-1 Spoke Tension Meter with Deflection Gauge", category: "Hand Tools & Measuring", brand: "Park Tool", cost: 89.00, condition: "operational", location: "Wheelbuilding Stand", specs: "Measures absolute spoke tension across steel, titanium, and bladed spokes", notes: "Zero calibration against factory deflection wire before trueing dished rear wheels" },
      { type: "equipment", name: "Professional Wheel Truing Stand with Radial Calipers", category: "Hand Tools & Measuring", brand: "Minoura / Park Tool", cost: 145.00, condition: "operational", location: "Wheel Stand Bench", specs: "Accommodates up to 29\" wheels with thru-axle adapters", notes: "Center calipers using reference dishing tool (WAG-4)" },
      { type: "equipment", name: "Columbus 4130 Seamless Chromoly Main Frame Tube Set", category: "Hand Tools & Measuring", brand: "Columbus Tubi", cost: 125.00, condition: "operational", location: "Tubing Rack", specs: "Double-butted down tube, top tube, seat tube & BB shell", notes: "Degrease with acetone before TIG welding or silver brazing lugs" },
      { type: "material", name: "DT Swiss Competition Double-Butted Spokes 2.0/1.8mm (Box of 72)", category: "Bicycle Components & Tubing", quantity: 72, unit: "spokes", price: 0.95, cost: 68.40, lowStockThreshold: 16, location: "Spoke Box", supplier: "DT Swiss", notes: "Cold-forged Swedish chrome-nickel steel for fatigue life and impact compliance" },
      { type: "material", name: "DT Swiss Pro Lock 14mm Brass Spoke Nipples (Bag of 100)", category: "Bicycle Components & Tubing", quantity: 100, unit: "nipples", price: 0.18, cost: 18.00, lowStockThreshold: 20, location: "Nipple Tray", supplier: "DT Swiss", notes: "Pre-applied thread-locking compound prevents loosening under cyclic rim flex" }
    ]
  }
};

function openStarterKitsDialog() {
  const dialog = $("#starter-kits-dialog");
  const list = $("#starter-kits-list");
  if (!dialog || !list) return;

  list.innerHTML = Object.entries(WORKSHOP_STARTER_KITS).map(([key, kit]) => {
    const totalVal = kit.items.reduce((sum, i) => sum + (Number(i.cost || i.price) || 0), 0);
    const equipCount = kit.items.filter(i => i.type === "equipment").length;
    const matCount = kit.items.filter(i => i.type === "material").length;

    return `
      <div class="starter-kit-card">
        <div class="starter-kit-header">
          <div class="starter-kit-icon">${kit.icon}</div>
          <div class="starter-kit-header-text">
            <h3>${escapeHTML(kit.title)}</h3>
            <p>${escapeHTML(kit.description)}</p>
          </div>
        </div>

        <div class="starter-kit-items-list">
          ${kit.items.map(item => `
            <div class="starter-kit-item-row">
              <span>${item.type === "equipment" ? "⚙️" : "📦"} ${escapeHTML(item.name)}</span>
              <span>${item.cost ? `${formatMoney(item.cost)}` : (item.quantity ? `${item.quantity} ${item.unit}` : "")}</span>
            </div>
          `).join("")}
        </div>

        <div class="starter-kit-footer">
          <div class="starter-kit-cost">
            <span>${equipCount} tools, ${matCount} supplies · </span>
            <strong>${formatMoney(totalVal)}</strong>
          </div>
          <button type="button" class="button button-primary button-small" data-action="import-starter-kit" data-kit="${key}">Import Kit <span>→</span></button>
        </div>
      </div>
    `;
  }).join("");

  dialog.showModal();
}

async function importStarterKit(kitKey) {
  const kit = WORKSHOP_STARTER_KITS[kitKey];
  if (!kit) return;

  state.inventory = state.inventory || [];
  let addedCount = 0;

  for (const itemDef of kit.items) {
    const existing = state.inventory.find(i => i.name.toLowerCase() === itemDef.name.toLowerCase());
    if (existing) {
      if (itemDef.type === "material") {
        existing.quantity = (existing.quantity || 0) + (itemDef.quantity || 1);
        addedCount++;
      }
      continue;
    }

    const newItem = {
      id: uid(),
      type: itemDef.type || "material",
      name: itemDef.name,
      category: itemDef.category || "General",
      brand: itemDef.brand || "",
      model: itemDef.model || "",
      cost: itemDef.cost || 0,
      price: itemDef.cost || itemDef.price || 0,
      quantity: itemDef.quantity || 1,
      unit: itemDef.unit || (itemDef.type === "equipment" ? "unit" : "pcs"),
      condition: itemDef.condition || "operational",
      location: itemDef.location || "Shop",
      specs: itemDef.specs || "",
      notes: itemDef.notes || "",
      lowStockThreshold: itemDef.lowStockThreshold || 1,
      supplier: itemDef.supplier || "",
      assignedProjectId: null,
      assignedProjectTitle: null,
      logbook: [
        {
          id: uid(),
          date: new Date().toISOString(),
          type: "service",
          title: "Added to workshop depot via " + kit.title,
          notes: "Initial inventory setup."
        }
      ],
      updatedAt: new Date().toISOString()
    };

    state.inventory.unshift(newItem);
    addedCount++;
  }

  makeActivity("note", `Imported ${kit.title} with ${addedCount} tools and supplies`);

  try {
    await persistState();
    $("#starter-kits-dialog")?.close();
    renderInventory();
    showToast(`🎉 Imported "${kit.title}" with ${addedCount} items!`);
  } catch (err) {
    console.error(err);
    showToast("Could not import starter kit.");
  }
}

/* ============================================================
   FEATURE: Equipment Logbook & Care History
   ============================================================ */

function openEquipmentLogbook(equipmentId) {
  const item = (state.inventory || []).find(i => i.id === equipmentId);
  if (!item) return;

  const dialog = $("#equipment-dossier-dialog");
  const body = $("#equipment-dossier-body");
  const title = $("#equipment-dossier-title");
  const eyebrow = $("#equipment-dossier-eyebrow");
  const printBtn = $("#equipment-dossier-print-btn");
  if (!dialog || !body) return;

  if (title) title.textContent = `${item.name}`;
  if (eyebrow) eyebrow.textContent = `EQUIPMENT DOSSIER · ${item.category || "TOOL"}`;
  if (printBtn) printBtn.dataset.id = item.id;

  item.logbook = Array.isArray(item.logbook) ? item.logbook : [];

  const projectsUsed = new Set();
  if (item.assignedProjectId) projectsUsed.add(item.assignedProjectId);
  let serviceCount = 0;
  for (const entry of item.logbook) {
    if (entry.type === "checkout" && entry.projectId) projectsUsed.add(entry.projectId);
    if (entry.type === "service" || entry.type === "repair") serviceCount++;
  }

  const cost = Number(item.cost || item.price) || 0;
  const condLabels = {
    operational: "🟢 Operational",
    maintenance_needed: "🟡 Needs Care",
    in_use: "🔵 In Use",
    repair: "🔴 Out of Service",
    borrowed: "🟣 Loaned Out"
  };

  body.innerHTML = `
    <div style="background:var(--surface-hover);border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap">
        <div>
          <h3 style="margin:0 0 2px 0;font-size:16px">${escapeHTML(item.name)}</h3>
          <div style="font-size:12px;color:var(--muted)">
            ${item.brand ? `<strong>${escapeHTML(item.brand)}</strong> ` : ""}${item.model ? `Model: ${escapeHTML(item.model)} ` : ""}
            ${item.serialNumber ? `· Tag: ${escapeHTML(item.serialNumber)} ` : ""}
          </div>
        </div>
        <span class="inventory-condition-pill condition-${item.condition || "operational"}">
          ${condLabels[item.condition || "operational"] || item.condition}
        </span>
      </div>

      <div class="inventory-chips-row" style="margin-top:8px">
        ${item.location ? `<span class="inventory-chip">📍 Location: ${escapeHTML(item.location)}</span>` : ""}
        ${item.specs ? `<span class="inventory-chip">⚡ Specs: ${escapeHTML(item.specs)}</span>` : ""}
        ${cost > 0 ? `<span class="inventory-chip highlight">Valuation: ${formatMoney(cost)}</span>` : ""}
        ${item.purchaseDate ? `<span class="inventory-chip">📅 In Service: ${escapeHTML(item.purchaseDate)}</span>` : ""}
      </div>

      ${item.notes ? `
        <div style="font-size:11px;color:var(--muted);background:var(--surface);padding:6px 10px;border-radius:6px;border-left:3px solid var(--accent);margin-top:8px">
          🦺 <strong>Safety SOP &amp; Notes:</strong> ${escapeHTML(item.notes)}
        </div>
      ` : ""}
    </div>

    <div class="equipment-logbook-stats">
      <div class="equipment-logbook-stat">
        <strong>${serviceCount}</strong>
        <span>Services Logged</span>
      </div>
      <div class="equipment-logbook-stat">
        <strong>${projectsUsed.size}</strong>
        <span>Projects Involved</span>
      </div>
      <div class="equipment-logbook-stat">
        <strong>${cost > 0 ? formatMoney(cost) : "—"}</strong>
        <span>Asset Value</span>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <h4 style="margin:0;font-size:13px;font-weight:700">Service &amp; Usage Logbook (${item.logbook.length})</h4>
      <button type="button" class="button button-outline button-small" data-action="quick-log-service" data-id="${item.id}">＋ Log Care Today</button>
    </div>

    <div class="equipment-logbook-timeline">
      ${item.logbook.length === 0 ? `
        <div style="padding:20px;text-align:center;color:var(--muted);font-size:12px;border:1px dashed var(--border);border-radius:6px">
          No logbook entries recorded yet. Add service notes, maintenance completions, or check out this tool to a project.
        </div>
      ` : [...item.logbook].reverse().map(entry => {
        const icon = entry.type === "checkout" ? "📌" : entry.type === "checkin" ? "↩" : entry.type === "repair" ? "⚠️" : "🔧";
        return `
          <div class="equipment-logbook-entry">
            <div class="logbook-icon">${icon}</div>
            <div class="logbook-entry-main">
              <div class="logbook-entry-title">${escapeHTML(entry.title || "Log Entry")}</div>
              <div class="logbook-entry-meta">${formatFullDateTime(entry.date || new Date().toISOString())}</div>
              ${entry.notes ? `<div class="logbook-entry-notes">${escapeHTML(entry.notes)}</div>` : ""}
            </div>
          </div>
        `;
      }).join("")}
    </div>

    <form class="equipment-logbook-add-form" data-id="${item.id}">
      <select name="entryType" style="font-size:11px;min-height:32px">
        <option value="service">🔧 Service / Care</option>
        <option value="note">📝 Note / Spec</option>
        <option value="repair">⚠️ Repair / Part</option>
      </select>
      <input type="text" name="entryTitle" placeholder="e.g. Swapped 50T blade, calibrated fence..." required maxlength="120" style="font-size:11px;min-height:32px;padding:4px 8px">
      <button type="submit" class="button button-primary button-small" style="min-height:32px">Add Entry</button>
    </form>
  `;

  // Bind add form
  const form = $(".equipment-logbook-add-form", body);
  form?.addEventListener("submit", async e => {
    e.preventDefault();
    const type = form.elements.entryType.value;
    const titleText = form.elements.entryTitle.value.trim();
    if (!titleText) return;

    item.logbook.push({
      id: uid(),
      date: new Date().toISOString(),
      type,
      title: titleText,
      notes: ""
    });
    item.updatedAt = new Date().toISOString();

    makeActivity("note", `Added logbook entry for ${item.name}: ${titleText}`);
    try {
      await persistState();
      openEquipmentLogbook(equipmentId);
      showToast(`Added logbook entry for “${item.name}”!`);
    } catch (err) {
      console.error(err);
    }
  });

  dialog.showModal();
}

async function quickLogServiceForTool(id) {
  const item = (state.inventory || []).find(i => i.id === id);
  if (!item) return;

  const note = window.prompt(`Enter service completed for “${item.name}”:`, "Routine cleaning, inspection & safety check");
  if (!note || !note.trim()) return;

  item.logbook = Array.isArray(item.logbook) ? item.logbook : [];
  item.logbook.push({
    id: uid(),
    date: new Date().toISOString(),
    type: "service",
    title: note.trim(),
    notes: ""
  });
  if (item.condition === "maintenance_needed") item.condition = "operational";
  item.updatedAt = new Date().toISOString();

  makeActivity("project", `Serviced ${item.name}: ${note.trim()}`);
  try {
    await persistState();
    openEquipmentLogbook(id);
    renderInventory();
    showToast(`✓ Logged service for “${item.name}”!`);
  } catch (e) {
    console.error(e);
  }
}

/* ============================================================
   FEATURE: Printable Equipment Asset Tags & Barcodes
   ============================================================ */

function renderEquipmentAssetTagHtml(item) {
  const url = `${window.location.origin}${window.location.pathname}#tool=${item.id}`;
  const qrSvg = window.QR && typeof window.QR.toSVG === "function"
    ? window.QR.toSVG(url, { cellSize: 3, margin: 1 })
    : "";

  const cost = Number(item.cost || item.price) || 0;

  return `
    <div class="equipment-asset-tag">
      <div class="asset-tag-qr-col">
        ${qrSvg}
        <span class="asset-tag-scan-tip">Scan Logbook</span>
      </div>
      <div class="asset-tag-info-col">
        <span class="asset-tag-eyebrow">WORKBENCH · TOOL ASSET TAG</span>
        <h4 class="asset-tag-title">${escapeHTML(item.name)}</h4>
        <div class="asset-tag-brand">${escapeHTML(item.brand || "")}${item.model ? ` · Model: ${escapeHTML(item.model)}` : ""}</div>
        <div class="asset-tag-chips">
          ${item.serialNumber ? `<span class="asset-tag-chip">TAG #${escapeHTML(item.serialNumber)}</span>` : `<span class="asset-tag-chip">ID #${item.id.slice(0, 8)}</span>`}
          ${item.location ? `<span class="asset-tag-chip">📍 ${escapeHTML(item.location)}</span>` : ""}
          ${item.specs ? `<span class="asset-tag-chip">⚡ ${escapeHTML(item.specs)}</span>` : ""}
          ${cost > 0 ? `<span class="asset-tag-chip">${formatMoney(cost)}</span>` : ""}
        </div>
        <div class="asset-tag-safety-strip">
          <span>🥽 EYE</span>
          <span>🎧 EAR</span>
          <span>🦺 GUARD</span>
          <span style="color:#0284c7;margin-left:auto;font-size:8px">WB-ASSET</span>
        </div>
      </div>
    </div>
  `;
}

function openSingleToolTag(equipmentId) {
  const item = (state.inventory || []).find(i => i.id === equipmentId);
  if (!item) return;

  const dialog = $("#equipment-print-dialog");
  const sheet = $("#equipment-print-sheet");
  if (!dialog || !sheet) return;

  sheet.innerHTML = renderEquipmentAssetTagHtml(item);
  dialog.showModal();
}

function printAllEquipmentTags() {
  const tools = (state.inventory || []).filter(i => i.type === "equipment");
  if (tools.length === 0) {
    showToast("No equipment items in depot to print tags for.", "warning");
    return;
  }

  const dialog = $("#equipment-print-dialog");
  const sheet = $("#equipment-print-sheet");
  if (!dialog || !sheet) return;

  sheet.innerHTML = tools.map(renderEquipmentAssetTagHtml).join("");
  dialog.showModal();
}

/* ============================================================
   FEATURE: Depot Restock to Shopping List
   ============================================================ */

function restockLowStockMaterials(specificItemId = null) {
  const materials = (state.inventory || []).filter(i => (i.type || "material") === "material");

  let targetItems = [];
  if (specificItemId) {
    const item = materials.find(m => m.id === specificItemId);
    if (item) targetItems = [item];
  } else {
    targetItems = materials.filter(m => (Number(m.quantity) || 0) <= (Number(m.lowStockThreshold) || 1));
  }

  if (targetItems.length === 0) {
    showToast("All materials in your workshop depot are well-stocked! ✓");
    return;
  }

  state.depotRestockList = state.depotRestockList || [];

  let newCount = 0;
  for (const m of targetItems) {
    const existing = state.depotRestockList.find(r => r.id === m.id);
    if (!existing) {
      const suggestQty = Math.max(1, ((Number(m.lowStockThreshold) || 1) * 2) - (Number(m.quantity) || 0));
      state.depotRestockList.push({
        id: m.id,
        name: m.name,
        category: m.category,
        currentQty: m.quantity || 0,
        restockQty: suggestQty,
        unit: m.unit || "units",
        price: m.price || 0,
        supplier: m.supplier || "",
        location: m.location || "",
        addedAt: new Date().toISOString()
      });
      newCount++;
    }
  }

  void persistState();
  switchView("shopping");
  showToast(`🛒 Sent ${targetItems.length} supply items to your shopping checklist!`);
}

async function completeDepotRestock(inventoryId, qtyToAdd = 1) {
  const item = (state.inventory || []).find(i => i.id === inventoryId);
  if (!item) return;

  const added = Number(qtyToAdd) || 1;
  item.quantity = (Number(item.quantity) || 0) + added;
  item.updatedAt = new Date().toISOString();

  // Remove from restock list
  state.depotRestockList = (state.depotRestockList || []).filter(r => r.id !== inventoryId);

  makeActivity("note", `Restocked ${item.name} (+${added} ${item.unit || "units"}) in workshop depot`);

  try {
    await persistState();
    renderShoppingList();
    renderInventory();
    showToast(`✓ Restocked "${item.name}"! New stock: ${item.quantity} ${item.unit || "units"}.`);
  } catch (err) {
    console.error(err);
  }
}

async function dismissDepotRestock(id) {
  state.depotRestockList = (state.depotRestockList || []).filter(r => r.id !== id);
  try {
    await persistState();
    renderShoppingList();
    showToast("Removed from depot restock list.");
  } catch (e) {
    console.error(e);
  }
}

/* ============================================================
   Pick from Inventory Dialog (Fixing Pic 1 styling & UX)
   ============================================================ */

function openInventoryPickDialog(inventoryId = null, targetProjectId = null) {
  const dialog = $("#inventory-pick-dialog");
  const list = $("#inventory-pick-list");
  const eyebrowEl = $("#inventory-pick-eyebrow");
  const titleEl = $("#inventory-pick-title");
  if (!dialog || !list) return;

  // Flow A: Opened for a specific item (Assign to project)
  if (inventoryId) {
    const item = (state.inventory || []).find(i => i.id === inventoryId);
    if (!item) return;

    const isEquip = item.type === "equipment";
    if (eyebrowEl) eyebrowEl.textContent = isEquip ? "ASSIGN EQUIPMENT" : "USE MATERIAL";
    if (titleEl) titleEl.textContent = isEquip ? "Check Out Tool to Project" : "Allocate Material to Project";

    if ((state.projects || []).length === 0) {
      list.innerHTML = `
        <div style="padding:28px 16px;text-align:center;color:var(--muted)">
          <p style="margin-bottom:12px">No projects created yet. Create a project first to use this depot item!</p>
          <button type="button" class="button button-primary button-small" data-action="new-project">＋ Create Project</button>
        </div>
      `;
      dialog.showModal();
      return;
    }

    const availableQty = item.quantity != null ? item.quantity : 1;
    const unitPrice = Number(item.price || item.cost) || 0;

    list.innerHTML = `
      <div class="inventory-pick-header-card">
        <div class="inventory-pick-header-top">
          <span class="inventory-pick-header-title">${isEquip ? "⚙️" : "📦"} ${escapeHTML(item.name)}</span>
          <span class="inventory-cost-badge">${unitPrice > 0 ? `${formatMoney(unitPrice)}${!isEquip && item.unit ? ` / ${escapeHTML(item.unit)}` : ""}` : "No cost set"}</span>
        </div>
        <div class="inventory-pick-header-meta">
          <span>${escapeHTML(item.category || "General")}</span>
          ${isEquip ? (item.brand ? ` · ${escapeHTML(item.brand)} ${escapeHTML(item.model || "")}` : "") : ` · In Depot: ${availableQty} ${escapeHTML(item.unit || "units")}`}
          ${item.location ? ` · 📍 ${escapeHTML(item.location)}` : ""}
        </div>
        ${!isEquip ? `
          <div class="inventory-pick-controls">
            <label class="inventory-pick-qty-label">
              <span>Quantity:</span>
              <input type="number" id="pick-qty-input" class="inventory-pick-qty-input" value="1" min="0.1" max="${availableQty > 0 ? availableQty : 9999}" step="any">
              <span>${escapeHTML(item.unit || "")}</span>
            </label>
            <label class="inventory-pick-check-label">
              <input type="checkbox" id="pick-deduct-check" checked>
              <span>Deduct from stock</span>
            </label>
            <label class="inventory-pick-check-label">
              <input type="checkbox" id="pick-cost-check" ${unitPrice > 0 ? "checked" : ""}>
              <span>Track in project budget ($)</span>
            </label>
          </div>
        ` : `
          <div style="margin-top:8px;font-size:11px;color:var(--muted)">
            Checking out this equipment will mark it as <strong>In Use</strong> and track it on the chosen project's workbench.
          </div>
        `}
      </div>

      <input type="search" id="inventory-pick-search-input" class="inventory-pick-search" placeholder="Search projects..." aria-label="Search projects">

      <div class="inventory-pick-options" id="inventory-pick-options-list">
        ${state.projects.map(p => {
          const isAssigned = isEquip && item.assignedProjectId === p.id;
          const statusKey = safeStatus(p.status);
          return `
            <button type="button" class="inventory-pick-row" data-action="add-inventory-to-project" data-project="${p.id}" data-inventory="${item.id}">
              <div class="inventory-pick-row-main">
                <span class="inventory-pick-row-title">${escapeHTML(p.title)}</span>
                <span class="inventory-pick-row-meta">
                  ${escapeHTML(p.category || "Build")}
                  ${p.targetDate ? ` · Due ${formatDate(p.targetDate)}` : ` · Updated ${relativeTime(p.updatedAt)}`}
                  ${isAssigned ? `<span class="inventory-pick-row-badge">⚡ Currently Assigned</span>` : ""}
                </span>
              </div>
              <span class="status-pill status-${statusKey}">${STATUS_LABELS[statusKey] || statusKey}</span>
            </button>
          `;
        }).join("")}
      </div>
    `;

    // Fast search filter
    const searchInput = $("#inventory-pick-search-input");
    searchInput?.addEventListener("input", () => {
      const q = searchInput.value.toLowerCase().trim();
      $$(".inventory-pick-row", list).forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(q) ? "" : "none";
      });
    });

    dialog.showModal();
    return;
  }

  // Flow B: Opened from inside Project Detail (selecting item to add to project)
  if (targetProjectId) {
    const project = state.projects.find(p => p.id === targetProjectId);
    if (!project) return;

    if (eyebrowEl) eyebrowEl.textContent = `WORKSHOP DEPOT → ${project.title.toUpperCase()}`;
    if (titleEl) titleEl.textContent = "Pick from Workshop Inventory";

    const inventory = state.inventory || [];
    if (inventory.length === 0) {
      list.innerHTML = `
        <div style="padding:28px 16px;text-align:center;color:var(--muted)">
          <p style="margin-bottom:12px">Your shop depot is empty! Add materials or equipment first.</p>
          <button type="button" class="button button-primary button-small" data-action="open-inventory-dialog">＋ Add First Supply</button>
        </div>
      `;
      dialog.showModal();
      return;
    }

    list.innerHTML = `
      <input type="search" id="inventory-pick-search-input" class="inventory-pick-search" placeholder="Find material, screw, lumber, or tool..." aria-label="Search items">
      <div class="inventory-pick-options" id="inventory-pick-options-list">
        ${inventory.map(item => {
          const isEquip = item.type === "equipment";
          const isAssignedToThis = isEquip && item.assignedProjectId === project.id;
          const costVal = Number(item.cost || item.price) || 0;
          return `
            <div class="inventory-pick-row" style="cursor:default">
              <div class="inventory-pick-row-main">
                <span class="inventory-pick-row-title">${isEquip ? "⚙️" : "📦"} ${escapeHTML(item.name)}</span>
                <span class="inventory-pick-row-meta">
                  ${escapeHTML(item.category || "General")}
                  ${isEquip ? (item.brand ? ` · ${escapeHTML(item.brand)}` : "") : ` · Stock: ${item.quantity ?? 1} ${escapeHTML(item.unit || "units")}`}
                  ${costVal > 0 ? ` · ${formatMoney(costVal)}` : ""}
                  ${item.location ? ` · 📍 ${escapeHTML(item.location)}` : ""}
                </span>
              </div>
              <div>
                ${isEquip ? `
                  ${isAssignedToThis ? `
                    <span class="inventory-pick-row-badge">Checked out</span>
                  ` : `
                    <button type="button" class="button button-outline button-small" data-action="add-inventory-to-project" data-project="${project.id}" data-inventory="${item.id}">Check out tool</button>
                  `}
                ` : `
                  <button type="button" class="button button-primary button-small" data-action="add-inventory-to-project" data-project="${project.id}" data-inventory="${item.id}">Add part</button>
                `}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;

    const searchInput = $("#inventory-pick-search-input");
    searchInput?.addEventListener("input", () => {
      const q = searchInput.value.toLowerCase().trim();
      $$(".inventory-pick-row", list).forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(q) ? "" : "none";
      });
    });

    dialog.showModal();
  }
}

async function pickInventoryForProject(projectId, inventoryId) {
  const project = state.projects.find(p => p.id === projectId);
  const item = (state.inventory || []).find(i => i.id === inventoryId);
  if (!project || !item) return;

  const isEquip = item.type === "equipment";

  if (isEquip) {
    item.condition = "in_use";
    item.assignedProjectId = project.id;
    item.assignedProjectTitle = project.title;

    item.logbook = Array.isArray(item.logbook) ? item.logbook : [];
    item.logbook.push({
      id: uid(),
      date: new Date().toISOString(),
      type: "checkout",
      projectId: project.id,
      title: `Checked out to ${project.title}`,
      notes: `Assigned tool to active project workspace.`
    });

    item.updatedAt = new Date().toISOString();

    makeActivity("project", `Checked out ${item.name} for ${project.title}`);
    showToast(`Checked out ${item.name} to ${project.title}!`);
  } else {
    // Material
    const qtyInput = $("#pick-qty-input");
    const deductCheck = $("#pick-deduct-check");
    const costCheck = $("#pick-cost-check");

    const qtyToAllocate = qtyInput ? (parseFloat(qtyInput.value) || 1) : 1;
    const shouldDeduct = deductCheck ? deductCheck.checked : true;
    const trackCost = costCheck ? costCheck.checked : true;
    const unitPrice = Number(item.price || item.cost) || 0;
    const totalCost = trackCost ? (unitPrice * qtyToAllocate) : 0;

    project.materials = project.materials || [];
    project.materials.push({
      id: uid(),
      name: item.name,
      qty: item.unit ? `${qtyToAllocate} ${item.unit}` : `${qtyToAllocate}`,
      cost: totalCost,
      status: "have",
      group: item.category || inferMaterialGroup(item.name),
      inventoryId: item.id,
      createdAt: new Date().toISOString()
    });

    if (shouldDeduct) {
      item.quantity = Math.max(0, (Number(item.quantity) || 0) - qtyToAllocate);
      item.updatedAt = new Date().toISOString();
    }

    project.updatedAt = new Date().toISOString();
    makeActivity("note", `Allocated ${qtyToAllocate} ${item.unit || "units"} of ${item.name} to ${project.title}`);
    showToast(`Added ${item.name} (${qtyToAllocate} ${item.unit || "units"}) to ${project.title}!`);
  }

  try {
    await persistState();
    $("#inventory-pick-dialog")?.close();
    render();
    if ($("#detail-dialog")?.open && activeProjectId === projectId) {
      renderProjectDetail(projectId);
    }
  } catch (e) {
    console.error(e);
  }
}


/* ============================================================
   📄 Printable Workshop Blueprint & Job Cut-Sheet Exporter
   ============================================================ */
let activeWorkshopBlueprintProjectId = null;
let workshopBlueprintTheme = "paper";

function generateBlueprintRulerSvg() {
  const w = 760;
  const h = 38;

  // 6 inches across ~720px width (120px per inch)
  const marginX = 20;
  const inchPx = 115;
  const cmPx = inchPx / 2.54; // ~45.27px per cm

  let inchTicks = "";
  for (let i = 0; i <= 6; i++) {
    const x = marginX + (i * inchPx);
    inchTicks += `<line x1="${x}" y1="0" x2="${x}" y2="14" stroke="currentColor" stroke-width="1.5"/>`;
    inchTicks += `<text x="${x + 3}" y="11" font-size="9" font-family="monospace" font-weight="700" fill="currentColor">${i}"</text>`;
    if (i < 6) {
      // 1/2" tick
      inchTicks += `<line x1="${x + inchPx/2}" y1="0" x2="${x + inchPx/2}" y2="10" stroke="currentColor" stroke-width="1"/>`;
      // 1/4" ticks
      inchTicks += `<line x1="${x + inchPx/4}" y1="0" x2="${x + inchPx/4}" y2="7" stroke="currentColor" stroke-width="0.75"/>`;
      inchTicks += `<line x1="${x + (3*inchPx)/4}" y1="0" x2="${x + (3*inchPx)/4}" y2="7" stroke="currentColor" stroke-width="0.75"/>`;
      // 1/8" ticks
      for (let k = 1; k < 8; k += 2) {
        inchTicks += `<line x1="${x + (k*inchPx)/8}" y1="0" x2="${x + (k*inchPx)/8}" y2="5" stroke="currentColor" stroke-width="0.5"/>`;
      }
    }
  }

  let cmTicks = "";
  for (let c = 0; c <= 15; c++) {
    const x = marginX + (c * cmPx);
    cmTicks += `<line x1="${x}" y1="${h}" x2="${x}" y2="${h - 12}" stroke="currentColor" stroke-width="1.2"/>`;
    cmTicks += `<text x="${x + 2}" y="${h - 4}" font-size="8" font-family="monospace" font-weight="700" fill="currentColor">${c}</text>`;
    if (c < 15) {
      // 5mm tick
      cmTicks += `<line x1="${x + cmPx/2}" y1="${h}" x2="${x + cmPx/2}" y2="${h - 8}" stroke="currentColor" stroke-width="0.75"/>`;
      // 1mm ticks
      for (let m = 1; m < 10; m++) {
        if (m !== 5) {
          cmTicks += `<line x1="${x + (m*cmPx)/10}" y1="${h}" x2="${x + (m*cmPx)/10}" y2="${h - 4}" stroke="currentColor" stroke-width="0.4"/>`;
        }
      }
    }
  }

  return `
    <svg class="blueprint-ruler" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <rect x="0" y="0" width="${w}" height="${h}" fill="transparent"/>
      ${inchTicks}
      ${cmTicks}
      <text x="${w / 2}" y="22" text-anchor="middle" font-size="8" font-family="monospace" font-weight="800" letter-spacing="1px" fill="currentColor" opacity="0.75">
        1:1 CALIBRATION SCALE · 6 INCHES (TOP) / 15 CENTIMETERS (BOTTOM) · VERIFY BENCH MEASUREMENTS
      </text>
    </svg>
  `;
}

function openWorkshopBlueprint(projectId) {
  let project = state.projects.find(p => p.id === projectId);
  if (!project) {
    project = state.projects.find(p => p.id === state.activeProjectId) || state.projects[0];
  }
  if (!project) {
    showToast("Create a project first to view the Workshop Blueprint.", "error");
    return;
  }
  activeWorkshopBlueprintProjectId = project.id;

  const select = $("#blueprint-project-select");
  if (select) {
    select.innerHTML = state.projects.map(p =>
      `<option value="${p.id}" ${p.id === activeWorkshopBlueprintProjectId ? "selected" : ""}>${escapeHTML(p.title || "Untitled Project")}</option>`
    ).join("");
  }

  renderWorkshopBlueprint();

  const dialog = $("#workshop-blueprint-dialog");
  if (dialog) {
    dialog.showModal();
    initWorkshopBlueprintOptions();
  }
}

function setBlueprintSheetTheme(theme) {
  workshopBlueprintTheme = theme || "paper";
  const sheet = $("#workshop-blueprint-sheet");
  if (sheet) {
    sheet.classList.remove("blueprint-theme-paper", "blueprint-theme-blueprint");
    sheet.classList.add(workshopBlueprintTheme === "blueprint" ? "blueprint-theme-blueprint" : "blueprint-theme-paper");
  }

  $$(".blueprint-theme-btn").forEach(btn => {
    const isAct = btn.dataset.theme === workshopBlueprintTheme;
    btn.classList.toggle("active", isAct);
    btn.classList.toggle("button-outline", !isAct);
  });
}

let workshopBlueprintOptionsInited = false;
function initWorkshopBlueprintOptions() {
  if (workshopBlueprintOptionsInited) return;
  workshopBlueprintOptionsInited = true;

  const optDiagram = $("#blueprint-opt-diagram");
  const optRuler = $("#blueprint-opt-ruler");
  const optGrid = $("#blueprint-opt-grid");
  const projectSelect = $("#blueprint-project-select");

  optDiagram?.addEventListener("change", (e) => {
    const el = $("#bp-diagram-section");
    if (el) el.style.display = e.target.checked ? "block" : "none";
  });
  optRuler?.addEventListener("change", (e) => {
    const el = $("#bp-ruler-section");
    if (el) el.style.display = e.target.checked ? "block" : "none";
  });
  optGrid?.addEventListener("change", (e) => {
    const el = $("#bp-notes-grid");
    if (el) el.style.display = e.target.checked ? "block" : "none";
  });

  projectSelect?.addEventListener("change", (e) => {
    const newId = e.target.value;
    if (newId && state.projects.some(p => p.id === newId)) {
      activeWorkshopBlueprintProjectId = newId;
      renderWorkshopBlueprint();
    }
  });
}

function printWorkshopBlueprint() {
  const project = state.projects.find(p => p.id === activeWorkshopBlueprintProjectId);
  if (!project) {
    showToast("Open a project to generate and print its workshop blueprint.");
    return;
  }
  window.print();
}

function downloadWorkshopBlueprintHTML() {
  const project = state.projects.find(p => p.id === activeWorkshopBlueprintProjectId);
  const sheet = $("#workshop-blueprint-sheet");
  if (!project || !sheet) {
    showToast("Open a project to generate its workshop blueprint.");
    return;
  }

  const safeTitle = (project.title || "Project").replace(/[^a-zA-Z0-9_-]/g, "_") || "Project";
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Workshop Blueprint · ${escapeHTML(project.title)}</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      background: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Courier New", monospace;
      color: #0f172a;
      display: flex;
      justify-content: center;
    }
    .blueprint-sheet {
      width: 100%;
      max-width: 860px;
      padding: 24px;
      box-sizing: border-box;
      border: 2px solid #0f172a;
      background: #ffffff;
      outline: 1px solid #cbd5e1;
      outline-offset: -5px;
    }
    .blueprint-title-block {
      border: 2px solid #0f172a;
      padding: 16px;
      margin-bottom: 16px;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 16px;
    }
    .bp-project-title { font-size: 22px; font-weight: 900; margin: 4px 0 6px; text-transform: uppercase; }
    .bp-meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px 14px; font-size: 11px; }
    .bp-meta-cell strong { display: block; font-size: 9px; text-transform: uppercase; opacity: 0.7; }
    .bp-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 16px; border: 1.5px solid #0f172a; }
    .bp-table th { background: #f1f5f9; padding: 6px 8px; text-align: left; border-bottom: 1.5px solid #0f172a; border-right: 1px solid #cbd5e1; }
    .bp-table td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; }
    .bp-check-box { display: inline-block; width: 13px; height: 13px; border: 1.5px solid #0f172a; border-radius: 2px; vertical-align: middle; margin-right: 6px; }
    .blueprint-safety-strip { display: flex; gap: 8px; padding: 8px 12px; border: 1px dashed #0f172a; border-radius: 4px; margin-bottom: 16px; font-size: 11px; font-weight: 700; flex-wrap: wrap; }
    .blueprint-ruler { width: 100%; height: 38px; margin: 12px 0 16px; border: 1px solid #0f172a; }
    .blueprint-notes-grid { height: 90px; border: 1.5px solid #0f172a; margin-top: 14px; position: relative; background-image: radial-gradient(#0f172a 0.8px, transparent 0.8px); background-size: 10px 10px; }
    .blueprint-notes-tag { position: absolute; top: 4px; left: 8px; font-size: 9px; font-weight: 800; padding: 1px 6px; border: 1px solid #0f172a; background: #fff; }
    .blueprint-signoff-row { display: flex; justify-content: space-between; margin-top: 16px; padding-top: 8px; border-top: 1px solid #0f172a; font-size: 10px; text-transform: uppercase; }
    @media print {
      body { padding: 0; background: #fff; }
      .blueprint-sheet { border: 2px solid #000 !important; width: 100% !important; max-width: 100% !important; }
    }
  </style>
</head>
<body>
  ${sheet.outerHTML}
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `Workshop_Blueprint_${safeTitle}_${project.id.slice(0, 8)}.html`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast("Downloaded offline Workshop Blueprint HTML file!");
}

function renderWorkshopBlueprint() {
  const project = state.projects.find(p => p.id === activeWorkshopBlueprintProjectId);
  const sheet = $("#workshop-blueprint-sheet");
  if (!project || !sheet) return;

  const materials = project.materials || [];
  const totalCost = materials.reduce((s, m) => s + (Number(m.cost) || 0), 0);
  const progress = projectTaskProgress(project);
  const skills = projectSkillNames(project);
  const url = `${window.location.origin}${window.location.pathname}#project=${project.id}`;
  const qrSvg = window.QR?.toSVG ? window.QR.toSVG(url, { cellSize: 3, margin: 1 }) : "";

  // Group materials by group name
  const groupedMaterials = {};
  materials.forEach(m => {
    const grp = m.group || "General Supplies & Hardware";
    if (!groupedMaterials[grp]) groupedMaterials[grp] = [];
    groupedMaterials[grp].push(m);
  });

  // Group tasks by phase
  const groupedTasks = {};
  (project.tasks || []).forEach(t => {
    const ph = t.phase || "Primary Build Tasks";
    if (!groupedTasks[ph]) groupedTasks[ph] = [];
    groupedTasks[ph].push(t);
  });

  // Generate safety badges based on project contents
  const textCorpus = `${project.title} ${project.description || ""} ${(project.tags || []).join(" ")} ${materials.map(m => m.name).join(" ")}`.toLowerCase();
  const safetyBadges = [];
  safetyBadges.push("🥽 Safety Glasses Required");

  if (textCorpus.includes("wood") || textCorpus.includes("oak") || textCorpus.includes("pine") || textCorpus.includes("saw") || textCorpus.includes("sand") || textCorpus.includes("mdf") || textCorpus.includes("plywood")) {
    safetyBadges.push("😷 N95 / P100 Dust Mask");
    safetyBadges.push("🎧 Hearing Protection");
    safetyBadges.push("🪵 Table Saw Push Sticks");
  }
  if (textCorpus.includes("solder") || textCorpus.includes("wire") || textCorpus.includes("pcb") || textCorpus.includes("electronics") || textCorpus.includes("circuit") || textCorpus.includes("esp32")) {
    safetyBadges.push("⚡ Fume Extractor Active");
    safetyBadges.push("🔌 ESD Grounding Strap");
  }
  if (textCorpus.includes("epoxy") || textCorpus.includes("resin") || textCorpus.includes("paint") || textCorpus.includes("lacquer") || textCorpus.includes("poly") || textCorpus.includes("stain")) {
    safetyBadges.push("🧪 Nitrile Gloves");
    safetyBadges.push("🫁 Organic Vapor Respirator");
  }
  if (textCorpus.includes("laser") || textCorpus.includes("cut")) {
    safetyBadges.push("🔥 Laser Exhaust & Fire Watch");
  }

  // 1:1 Scale calibration ruler
  const rulerSvg = generateBlueprintRulerSvg();

  // Any attached images/drawing previews
  const allImages = (project.folders || []).flatMap(f => f.images || []);
  const drawingPreview = allImages.length > 0 ? `
    <div id="bp-diagram-section" style="margin-bottom:16px">
      <div style="font-size:10px;font-weight:800;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:6px">
        📐 Reference Photos &amp; Drawing Attachments (${allImages.length})
      </div>
      <div style="display:flex;gap:10px;overflow-x:auto;padding-bottom:4px">
        ${allImages.slice(0, 3).map(img => `
          <div style="flex:1;max-width:240px;border:1px solid currentColor;padding:4px;border-radius:3px">
            <img src="${imageUrl(img)}" alt="${escapeHTML(img.name)}" style="width:100%;height:110px;object-fit:cover;display:block;border-radius:2px">
            <span style="font-size:9px;font-weight:600;display:block;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHTML(img.name)}</span>
          </div>
        `).join("")}
      </div>
    </div>
  ` : "";

  sheet.innerHTML = `
    <!-- Top Blueprint Title Block -->
    <div class="blueprint-title-block">
      <div>
        <div style="display:flex;align-items:center;gap:8px;font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;opacity:0.8">
          <span>WORKBENCH DIGITAL FABRICATION SHEET</span> · <span>WO-${escapeHTML(project.id.slice(0, 8).toUpperCase())}</span>
        </div>
        <h1 class="bp-project-title">${escapeHTML(project.title)}</h1>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
          <span style="display:inline-block;padding:2px 8px;border:1px solid currentColor;border-radius:3px;font-size:10px;font-weight:700;text-transform:uppercase">
            ${STATUS_LABELS[safeStatus(project.status)] || "ACTIVE"}
          </span>
          <span style="display:inline-block;padding:2px 8px;border:1px solid currentColor;border-radius:3px;font-size:10px;font-weight:700;text-transform:uppercase">
            ${priorityLabel(project.priority)} Priority
          </span>
          ${skills.map(s => `<span style="display:inline-block;padding:2px 8px;border:1px solid currentColor;border-radius:3px;font-size:10px;opacity:0.8">${escapeHTML(s.name)}</span>`).join("")}
          ${(project.tags || []).map(t => `<span style="display:inline-block;padding:2px 8px;border:1px solid currentColor;border-radius:3px;font-size:10px;opacity:0.8">#${escapeHTML(t)}</span>`).join("")}
        </div>

        <div class="bp-meta-grid">
          <div class="bp-meta-cell">
            <strong>Lead Maker / Creator</strong>
            <span>👑 ${escapeHTML(project.creator?.name || "Solo Maker")}</span>
          </div>
          <div class="bp-meta-cell">
            <strong>Target Finish Date</strong>
            <span>${project.targetDate ? formatDate(project.targetDate) : "Open schedule"}</span>
          </div>
          <div class="bp-meta-cell">
            <strong>Logged Labor Time</strong>
            <span>${project.timeSpent ? formatMinutes(project.timeSpent) : "0 hrs 0 mins"}</span>
          </div>
          <div class="bp-meta-cell">
            <strong>Supplies Budget</strong>
            <span>${formatMoney(totalCost)}</span>
          </div>
        </div>
      </div>

      <div class="bp-qr-box" style="text-align:center;flex-shrink:0">
        ${qrSvg}
        <div style="font-size:8px;font-weight:800;letter-spacing:0.5px;text-transform:uppercase;margin-top:4px">
          Scan at Bench<br>for Digital Log
        </div>
      </div>
    </div>

    <!-- 1:1 Scale Calibration Ruler -->
    <div id="bp-ruler-section">
      ${rulerSvg}
    </div>

    <!-- Workshop Safety & Tooling Protocol -->
    <div class="blueprint-safety-strip">
      <span style="text-transform:uppercase;letter-spacing:0.5px;color:currentColor">⚠️ Safety Protocol:</span>
      ${safetyBadges.map(b => `<span style="padding:2px 6px;border:1px solid currentColor;border-radius:3px">${b}</span>`).join(" ")}
    </div>

    ${project.description ? `
      <div style="margin-bottom:16px;padding:8px 12px;border:1px solid currentColor;border-radius:3px;font-size:11px;line-height:1.45">
        <strong style="text-transform:uppercase;font-size:9px;display:block;opacity:0.75;letter-spacing:0.5px">Scope of Work &amp; Design Notes:</strong>
        ${escapeHTML(project.description)}
      </div>
    ` : ""}

    <!-- Bill of Materials & Cutting Schedule Table -->
    <div style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div style="font-size:11px;font-weight:900;letter-spacing:0.5px;text-transform:uppercase">
          📦 Bill of Materials &amp; Hardware Schedule (${materials.length} Items)
        </div>
        <div style="font-size:10px;font-weight:700">
          Total Estimated Supplies: ${formatMoney(totalCost)}
        </div>
      </div>

      ${materials.length > 0 ? `
        <table class="bp-table">
          <thead>
            <tr>
              <th style="width:28px;text-align:center">Got</th>
              <th>Material / Part Description</th>
              <th style="width:140px">Category / Group</th>
              <th style="width:65px">Qty</th>
              <th style="width:90px">Status</th>
              <th style="width:75px;text-align:right">Unit Cost</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(groupedMaterials).map(([groupName, items]) => `
              <tr style="background:rgba(0,0,0,0.04)">
                <td colspan="6" style="font-weight:800;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;padding:4px 8px">
                  📁 ${escapeHTML(groupName)} (${items.length} items)
                </td>
              </tr>
              ${items.map(m => `
                <tr>
                  <td style="text-align:center"><span class="bp-check-box"></span></td>
                  <td><strong>${escapeHTML(m.name)}</strong></td>
                  <td style="font-size:10px;opacity:0.85">${escapeHTML(groupName)}</td>
                  <td>${escapeHTML(m.qty || "1")}</td>
                  <td style="font-size:10px">${m.status === "have" ? "✓ In Hand" : m.status === "ordered" ? "📦 Ordered" : "⚠️ Needed"}</td>
                  <td style="text-align:right">${Number(m.cost) > 0 ? formatMoney(m.cost) : "—"}</td>
                </tr>
              `).join("")}
            `).join("")}
          </tbody>
        </table>
      ` : `
        <div style="padding:10px;border:1px dashed currentColor;border-radius:3px;font-size:11px;font-style:italic">
          No materials listed for this project yet. Add supplies in the Materials section to generate a complete cut schedule.
        </div>
      `}
    </div>

    <!-- Phased Build Checklist & Milestones -->
    <div style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div style="font-size:11px;font-weight:900;letter-spacing:0.5px;text-transform:uppercase">
          🔨 Phased Fabrication Checklist &amp; Milestones
        </div>
        <div style="font-size:10px;font-weight:700">
          Progress: ${progress.completed} of ${progress.total} Completed (${progress.percent}%)
        </div>
      </div>

      <div class="bp-phases-container">
        ${Object.entries(groupedTasks).map(([phaseName, tasks]) => `
          <div class="bp-phase-card">
            <div class="bp-phase-header">
              <span>${escapeHTML(phaseName)}</span>
              <span>${tasks.filter(t => t.done).length}/${tasks.length}</span>
            </div>
            <ul class="bp-task-list">
              ${tasks.map(t => `
                <li class="bp-task-item">
                  <span class="bp-check-box">${t.done ? "✓" : ""}</span>
                  <span style="flex:1;${t.done ? "text-decoration:line-through;opacity:0.7" : ""}">${escapeHTML(t.text)}</span>
                  ${t.priority === "high" ? `<span style="font-size:8px;padding:1px 4px;border:1px solid currentColor;border-radius:2px;font-weight:700">URGENT</span>` : ""}
                </li>
              `).join("")}
            </ul>
          </div>
        `).join("")}
      </div>
    </div>

    ${drawingPreview}

    <!-- Bench Measurements & Field Modifications Grid -->
    <div class="blueprint-notes-grid" id="bp-notes-grid">
      <span class="blueprint-notes-tag">Pencil Field Measurements &amp; Shop Adjustments</span>
    </div>

    <!-- Sign-off & Quality Assurance Row -->
    <div class="blueprint-signoff-row">
      <div>Fabricator Sign-off: ________________________</div>
      <div>Date Inspected: ________________________</div>
      <div>QC Stamp: [   ] PASS / READY</div>
      <div>Workbench Document Rev 1.0</div>
    </div>
  `;
}

/* ============================================================

/* ============================================================
   💼 Client Quote, Estimate & Work Order Invoice Generator
   ============================================================ */
let activeQuoteProjectId = null;
let activeQuoteMode = "quote"; // "quote" | "invoice" | "workorder"

function openQuoteDialog(projectId) {
  const dialog = $("#quote-dialog");
  const projectSelect = $("#quote-project-select");
  if (!dialog) return;

  if (projectSelect) {
    projectSelect.innerHTML = (state.projects || []).map(p => `
      <option value="${p.id}" ${p.id === projectId ? "selected" : ""}>${escapeHTML(p.title)}</option>
    `).join("");
  }

  activeQuoteProjectId = projectId || (state.projects[0] && state.projects[0].id);
  const project = state.projects.find(p => p.id === activeQuoteProjectId);

  if (project) {
    if ($("#quote-client-name") && !$("#quote-client-name").value) {
      $("#quote-client-name").value = project.clientName || "";
    }
    if ($("#quote-scope-notes") && !$("#quote-scope-notes").value) {
      $("#quote-scope-notes").value = project.description || `Custom fabrication for ${project.title}.`;
    }
    if ($("#quote-labor-hours")) {
      const hrs = project.timeSpent ? (project.timeSpent / 60).toFixed(1) : "8";
      $("#quote-labor-hours").value = hrs;
    }

    // Determine smart labor service description from project keywords & category
    let defaultLaborDesc = "Custom Design, Fabrication, Assembly & Finishing";
    const corpus = `${project.title} ${project.description || ""} ${(project.tags || []).join(" ")}`.toLowerCase();
    if (corpus.includes("3d print") || corpus.includes("filament") || corpus.includes("slice") || corpus.includes("stl") || corpus.includes("sla")) {
      defaultLaborDesc = "3D CAD Modeling, Slicing, Print Supervision & Post-Processing";
    } else if (corpus.includes("code") || corpus.includes("firmware") || corpus.includes("software") || corpus.includes("mcu") || corpus.includes("esp32")) {
      defaultLaborDesc = "Software Architecture, Firmware Development, Integration & Testing";
    } else if (corpus.includes("resin") || corpus.includes("silicone") || corpus.includes("epoxy") || corpus.includes("cast")) {
      defaultLaborDesc = "Mold Preparation, Resin/Silicone Formulation, Vacuum Casting & Finishing";
    } else if (corpus.includes("wood") || corpus.includes("joinery") || corpus.includes("cabinet") || corpus.includes("lumber") || corpus.includes("timber")) {
      defaultLaborDesc = "Custom Millwork, Precision Joinery, Assembly & Hand Finishing";
    } else if (corpus.includes("textile") || corpus.includes("knit") || corpus.includes("crochet") || corpus.includes("sew") || corpus.includes("yarn")) {
      defaultLaborDesc = "Pattern Drafting, Garment Construction, Stitching & Finishing";
    } else if (corpus.includes("music") || corpus.includes("audio") || corpus.includes("mix") || corpus.includes("track")) {
      defaultLaborDesc = "Audio Production, Sound Engineering, Recording & Mastering";
    } else if (corpus.includes("circuit") || corpus.includes("pcb") || corpus.includes("solder") || corpus.includes("electronic")) {
      defaultLaborDesc = "Schematic Design, PCB Assembly, Hand Soldering & Diagnostics";
    }
    if ($("#quote-labor-desc")) {
      $("#quote-labor-desc").value = defaultLaborDesc;
    }
  }

  renderQuoteInvoice();
  dialog.showModal();
}

function setQuoteMode(mode) {
  activeQuoteMode = mode || "quote";
  $$(".quote-mode-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.mode === activeQuoteMode);
    btn.classList.toggle("button-outline", btn.dataset.mode !== activeQuoteMode);
  });
  renderQuoteInvoice();
}

function renderQuoteInvoice() {
  const sheet = $("#quote-sheet");
  if (!sheet) return;

  const project = state.projects.find(p => p.id === activeQuoteProjectId) || state.projects[0] || {
    id: "proj_demo",
    title: "Custom Workshop Commission",
    description: "Custom fabrication and design project.",
    materials: []
  };

  const clientName = $("#quote-client-name")?.value || "Valued Client";
  const clientContact = $("#quote-client-contact")?.value || "client@example.com";
  const laborRate = parseFloat($("#quote-labor-rate")?.value) || 65;
  const laborHours = parseFloat($("#quote-labor-hours")?.value) || 8;
  const laborDesc = $("#quote-labor-desc")?.value || "Custom Fabrication, Assembly & Finishing";
  const matMarkupPct = parseFloat($("#quote-material-markup")?.value) || 20;
  const shopFee = parseFloat($("#quote-shop-fee")?.value) || 50;
  const taxRate = parseFloat($("#quote-tax-rate")?.value) || 7.5;
  const depositPct = parseFloat($("#quote-deposit-pct")?.value) || 50;
  const paymentTermsVal = $("#quote-payment-terms")?.value || "deposit_50";
  const scopeNotes = $("#quote-scope-notes")?.value || (project.description || "Custom handcrafted design & fabrication according to client specifications.");

  const docTitles = {
    quote: "FORMAL QUOTE / ESTIMATE",
    invoice: "TAX INVOICE & STATEMENT",
    workorder: "WORK ORDER & BUILD SPEC"
  };
  const docPrefix = {
    quote: "QTE",
    invoice: "INV",
    workorder: "WO"
  };
  const docCode = `${docPrefix[activeQuoteMode]}-${(project.id || "001").slice(0, 6).toUpperCase()}`;

  const paymentTermsText = {
    deposit_50: "50% upfront deposit to commence fabrication · Balance due upon final delivery & inspection.",
    net_15: "Payment due within 15 days of invoice date.",
    net_30: "Payment due within 30 days of invoice date.",
    due_receipt: "Due immediately upon receipt of invoice.",
    paid_full: "PAID IN FULL · Receipt of payment confirmed with thanks."
  }[paymentTermsVal] || "50% deposit required.";

  // Calculate Materials: Only use real project materials; if empty, do NOT inject lumberjacking placeholders
  const rawMaterials = (project.materials && project.materials.length > 0) ? project.materials : [];

  let rawMatTotal = 0;
  const matRows = rawMaterials.length > 0 ? rawMaterials.map(m => {
    const cost = parseFloat(m.cost) || 0;
    rawMatTotal += cost;
    const billedCost = cost * (1 + (matMarkupPct / 100));
    return `
      <tr>
        <td>${escapeHTML(m.name || "Material item")}</td>
        <td>${escapeHTML(m.quantity || "1")}</td>
        <td class="text-right">${formatMoney(cost)}</td>
        <td class="text-right">${formatMoney(billedCost)}</td>
      </tr>
    `;
  }).join("") : `
    <tr>
      <td colspan="4" style="color:#64748b;font-style:italic;text-align:center;padding:12px 8px">
        No specific depot materials logged for this project. Only labor, equipment and services are billed.
      </td>
    </tr>
  `;

  const markedUpMaterials = rawMatTotal * (1 + (matMarkupPct / 100));
  const laborTotal = laborHours * laborRate;
  const subtotal = markedUpMaterials + laborTotal + shopFee;
  const taxAmount = subtotal * (taxRate / 100);
  const grandTotal = subtotal + taxAmount;
  const depositDue = grandTotal * (depositPct / 100);
  const balanceDue = grandTotal - depositDue;

  const today = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  sheet.innerHTML = `
    <div class="quote-sheet-header">
      <div class="quote-sheet-brand">
        <h2>WORKBENCH ATELIER &amp; FABRICATION LAB</h2>
        <div class="quote-sheet-tagline">Custom Making · Rapid Prototyping · Design</div>
      </div>
      <div class="quote-sheet-doc-badge">
        <div class="quote-doc-title">${docTitles[activeQuoteMode]}</div>
        <div class="quote-doc-number">Document Ref: <strong>${docCode}</strong></div>
      </div>
    </div>

    <div class="quote-meta-grid">
      <div class="quote-meta-col">
        <h5>CLIENT / COMMISSIONED FOR</h5>
        <p><strong>${escapeHTML(clientName)}</strong></p>
        <p>${escapeHTML(clientContact)}</p>
      </div>
      <div class="quote-meta-col">
        <h5>COMMISSION METADATA</h5>
        <p><strong>Date Issued:</strong> ${today}</p>
        <p><strong>${activeQuoteMode === "invoice" ? "Payment Due" : "Estimate Valid Until"}:</strong> ${validUntil}</p>
        <p><strong>Project:</strong> ${escapeHTML(project.title)}</p>
      </div>
    </div>

    <div style="margin-bottom:18px">
      <div style="font-size:10px;text-transform:uppercase;color:#64748b;font-weight:700;margin-bottom:4px">PROJECT SCOPE &amp; SPECIFICATIONS</div>
      <div style="font-size:12px;color:#1e293b;line-height:1.5;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px">
        ${escapeHTML(scopeNotes)}
      </div>
    </div>

    <!-- Itemized Tables -->
    <table class="quote-items-table">
      <thead>
        <tr>
          <th>Materials &amp; Components</th>
          <th>Qty</th>
          <th class="text-right">Unit / Base</th>
          <th class="text-right">Billed Amount (${matMarkupPct}% markup)</th>
        </tr>
      </thead>
      <tbody>
        ${matRows}
      </tbody>
    </table>

    <table class="quote-items-table">
      <thead>
        <tr>
          <th>Labor, Fabrication &amp; Engineering Services</th>
          <th>Logged Hours</th>
          <th class="text-right">Rate / Hr</th>
          <th class="text-right">Service Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${escapeHTML(laborDesc)}</td>
          <td>${laborHours} hrs</td>
          <td class="text-right">${formatMoney(laborRate)}/hr</td>
          <td class="text-right">${formatMoney(laborTotal)}</td>
        </tr>
        ${shopFee > 0 ? `
          <tr>
            <td>Workshop Machinery Run Time &amp; Tool Wear Fee</td>
            <td>1 setup</td>
            <td class="text-right">${formatMoney(shopFee)}</td>
            <td class="text-right">${formatMoney(shopFee)}</td>
          </tr>
        ` : ""}
      </tbody>
    </table>

    <!-- Totals Block -->
    <div class="quote-totals-block">
      <table class="quote-totals-table">
        <tr>
          <td>Materials Subtotal:</td>
          <td class="text-right">${formatMoney(markedUpMaterials)}</td>
        </tr>
        <tr>
          <td>Labor Services Subtotal:</td>
          <td class="text-right">${formatMoney(laborTotal)}</td>
        </tr>
        ${shopFee > 0 ? `
          <tr>
            <td>Workshop Machinery Fee:</td>
            <td class="text-right">${formatMoney(shopFee)}</td>
          </tr>
        ` : ""}
        <tr>
          <td>Net Subtotal:</td>
          <td class="text-right"><strong>${formatMoney(subtotal)}</strong></td>
        </tr>
        <tr>
          <td>Estimated Sales Tax (${taxRate}%):</td>
          <td class="text-right">${formatMoney(taxAmount)}</td>
        </tr>
        <tr class="quote-total-highlight">
          <td>Grand Total:</td>
          <td class="text-right">${formatMoney(grandTotal)}</td>
        </tr>
        ${activeQuoteMode !== "workorder" && depositPct > 0 ? `
          <tr>
            <td style="padding-top:10px">
              <span class="quote-deposit-pill">Deposit Required (${depositPct}%):</span>
            </td>
            <td class="text-right" style="padding-top:10px;font-weight:700;color:#065f46">
              ${formatMoney(depositDue)}
            </td>
          </tr>
          <tr>
            <td>Balance Due on Delivery:</td>
            <td class="text-right" style="font-weight:600;color:#64748b">
              ${formatMoney(balanceDue)}
            </td>
          </tr>
        ` : ""}
      </table>
    </div>

    <!-- Terms Box -->
    <div class="quote-terms-box">
      <strong>Terms &amp; Payment Agreement:</strong> ${escapeHTML(paymentTermsText)}
      <br>All custom commission work is guaranteed against defects in craftsmanship, assembly, and materials for 1 year from delivery date.
    </div>

    <!-- Signatures -->
    <div class="quote-signatures-row">
      <div class="quote-sign-block">
        Authorized Workshop Signature &amp; Date
      </div>
      <div class="quote-sign-block">
        Client Acceptance Signature &amp; Date
      </div>
    </div>
  `;
}

function printQuoteInvoice() {
  window.print();
}

function downloadQuoteInvoiceHTML() {
  const sheet = $("#quote-sheet");
  const project = state.projects.find(p => p.id === activeQuoteProjectId) || { title: "Commission" };
  if (!sheet) return;

  const safeTitle = (project.title || "Commission").replace(/[^a-zA-Z0-9_-]/g, "_");
  const htmlDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${activeQuoteMode.toUpperCase()} · ${escapeHTML(project.title)}</title>
  <style>
    body {
      margin: 0;
      padding: 24px;
      background: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #0f172a;
      display: flex;
      justify-content: center;
    }
    .quote-sheet {
      width: 100%;
      max-width: 800px;
      background: #ffffff;
      padding: 40px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      box-sizing: border-box;
    }
    .quote-sheet-header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; }
    .quote-sheet-brand h2 { margin: 0 0 4px; font-size: 22px; font-weight: 800; }
    .quote-sheet-tagline { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; }
    .quote-doc-title { font-size: 22px; font-weight: 900; text-transform: uppercase; margin: 0 0 4px; }
    .quote-doc-number { font-size: 12px; color: #64748b; font-family: monospace; }
    .quote-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; font-size: 12px; }
    .quote-meta-col h5 { font-size: 10px; text-transform: uppercase; color: #64748b; margin: 0 0 4px; }
    .quote-meta-col p { margin: 0 0 3px; }
    .quote-items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
    .quote-items-table th { background: #f8fafc; border-bottom: 2px solid #cbd5e1; text-align: left; padding: 8px; font-size: 10px; text-transform: uppercase; }
    .quote-items-table td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
    .text-right { text-align: right; }
    .quote-totals-block { display: flex; justify-content: flex-end; margin-bottom: 24px; }
    .quote-totals-table { width: 320px; border-collapse: collapse; font-size: 12px; }
    .quote-totals-table td { padding: 4px 6px; }
    .quote-total-highlight td { border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; font-size: 15px; font-weight: 800; padding: 8px 6px; }
    .quote-deposit-pill { display: inline-block; background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
    .quote-terms-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; font-size: 11px; color: #475569; }
    .quote-signatures-row { display: flex; justify-content: space-between; gap: 30px; margin-top: 32px; font-size: 11px; color: #64748b; text-align: center; }
    .quote-sign-block { flex: 1; border-top: 1px dashed #94a3b8; padding-top: 6px; }
    @media print {
      body { padding: 0; background: #fff; }
      .quote-sheet { border: none; box-shadow: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="quote-sheet">
    ${sheet.innerHTML}
  </div>
</body>
</html>`;

  const blob = new Blob([htmlDoc], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = `${activeQuoteMode.toUpperCase()}_${safeTitle}.html`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
  showToast(`Downloaded ${activeQuoteMode.toUpperCase()} document!`);
}

function copyQuoteSummary() {
  const sheet = $("#quote-sheet");
  if (!sheet) return;
  const text = sheet.innerText || "";
  void navigator.clipboard.writeText(text).then(() => {
    showToast("Copied quote summary to clipboard!");
  });
}




/* ============================================================
   FEATURE 1: Project Labor Cost & Selling Price Calculator
   ============================================================ */
let activePricingProjectId = null;

function openProjectPricing(projectId) {
  const project = state.projects.find(p => p.id === projectId);
  if (!project) return;
  activePricingProjectId = project.id;
  renderProjectPricing();
  $("#price-dialog")?.showModal();
}

function setPricingPreset(preset) {
  if (!activePricingProjectId) return;
  const project = state.projects.find(p => p.id === activePricingProjectId);
  if (!project) return;
  if (preset === "hobby") {
    project.laborRate = project.laborRate || 15;
    project.overheadPercent = 0;
    project.profitMargin = 15;
  } else if (preset === "sidehustle") {
    project.laborRate = project.laborRate || 25;
    project.overheadPercent = 15;
    project.profitMargin = 30;
  } else if (preset === "pro") {
    project.laborRate = project.laborRate || 45;
    project.overheadPercent = 25;
    project.profitMargin = 50;
  }
  void persistState();
  renderProjectPricing();
}

function renderProjectPricing() {
  const project = state.projects.find(p => p.id === activePricingProjectId);
  const container = $("#pricing-dialog-body");
  if (!project || !container) return;

  const hours = (project.timeSpent || 0) / 60;
  const laborRate = Number.isFinite(project.laborRate) ? project.laborRate : 25;
  const overheadPercent = Number.isFinite(project.overheadPercent) ? project.overheadPercent : 15;
  const profitMargin = Number.isFinite(project.profitMargin) ? project.profitMargin : 30;

  const materialsCost = (project.materials || []).reduce((sum, m) => sum + (Number(m.cost) || 0), 0);
  const laborCost = hours * laborRate;
  const baseCost = materialsCost + laborCost;
  const overheadCost = baseCost * (overheadPercent / 100);
  const totalProductionCost = baseCost + overheadCost;

  const marginFrac = profitMargin / 100;
  const retailPrice = marginFrac < 1 ? (totalProductionCost / (1 - marginFrac)) : (totalProductionCost * 2);
  const wholesalePrice = retailPrice * 0.55;
  const netProfit = retailPrice - totalProductionCost;

  container.innerHTML = `
    <div style="font-size:13px;color:var(--muted);margin-bottom:12px">
      Valuation and pricing model for <strong>${escapeHTML(project.title)}</strong> based on logged craft time (${formatMinutes(project.timeSpent || 0)}) and acquired materials (${formatMoney(materialsCost)}).
    </div>

    <div class="pricing-summary-card">
      <div class="pricing-stats-grid">
        <div class="pricing-stat-box">
          <span class="pricing-stat-label">Materials</span>
          <span class="pricing-stat-val">${formatMoney(materialsCost)}</span>
        </div>
        <div class="pricing-stat-box">
          <span class="pricing-stat-label">Labor (${hours.toFixed(1)}h @ ${getCurrencySymbol()}${laborRate}/h)</span>
          <span class="pricing-stat-val">${formatMoney(laborCost)}</span>
        </div>
        <div class="pricing-stat-box">
          <span class="pricing-stat-label">Total Cost (+Overhead)</span>
          <span class="pricing-stat-val">${formatMoney(totalProductionCost)}</span>
        </div>
        <div class="pricing-stat-box">
          <span class="pricing-stat-label">Suggested Retail</span>
          <span class="pricing-stat-val retail">${formatMoney(retailPrice)}</span>
        </div>
        <div class="pricing-stat-box">
          <span class="pricing-stat-label">Wholesale (55%)</span>
          <span class="pricing-stat-val">${formatMoney(wholesalePrice)}</span>
        </div>
        <div class="pricing-stat-box">
          <span class="pricing-stat-label">Net Profit / Item</span>
          <span class="pricing-stat-val retail">+${formatMoney(netProfit)}</span>
        </div>
      </div>

      <div style="margin-top:14px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
        <span style="font-size:11px;font-weight:700;color:var(--muted)">PRICING PRESETS:</span>
        <div class="pricing-preset-pills">
          <button type="button" class="button button-outline button-small" data-action="set-pricing-preset" data-preset="hobby" title="Low markup for gifts and hobby sales">Hobbyist (15%)</button>
          <button type="button" class="button button-outline button-small" data-action="set-pricing-preset" data-preset="sidehustle" title="Balanced craft fair & Etsy pricing">Side Hustle (30%)</button>
          <button type="button" class="button button-outline button-small" data-action="set-pricing-preset" data-preset="pro" title="Full commercial studio rate & margin">Bespoke Pro (50%)</button>
        </div>
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:12px">
      <div class="pricing-slider-row">
        <label style="flex:1;font-size:13px;font-weight:600">Hourly Craft Rate: <span>${getCurrencySymbol()}${laborRate}/hr</span></label>
        <input type="range" id="pricing-labor-slider" min="10" max="150" step="1" value="${laborRate}" style="flex:1">
      </div>

      <div class="pricing-slider-row">
        <label style="flex:1;font-size:13px;font-weight:600">Overhead Markup (% for electricity, tool wear, consumables): <span>${overheadPercent}%</span></label>
        <input type="range" id="pricing-overhead-slider" min="0" max="40" step="1" value="${overheadPercent}" style="flex:1">
      </div>

      <div class="pricing-slider-row">
        <label style="flex:1;font-size:13px;font-weight:600">Profit Margin (%): <span>${profitMargin}%</span></label>
        <input type="range" id="pricing-margin-slider" min="5" max="80" step="1" value="${profitMargin}" style="flex:1">
      </div>
    </div>
  `;

  $("#pricing-labor-slider")?.addEventListener("input", e => {
    project.laborRate = parseFloat(e.target.value) || 25;
    void persistState();
    renderProjectPricing();
  });
  $("#pricing-overhead-slider")?.addEventListener("input", e => {
    project.overheadPercent = parseFloat(e.target.value) || 0;
    void persistState();
    renderProjectPricing();
  });
  $("#pricing-margin-slider")?.addEventListener("input", e => {
    project.profitMargin = parseFloat(e.target.value) || 30;
    void persistState();
    renderProjectPricing();
  });
}

/* ============================================================
   FEATURE 2: Linear Cut List & Stock Optimizer
   ============================================================ */
let lastCutPlanText = "";

function runCutOptimizer() {
  const stockInput = $("#tool-cut-stock");
  const kerfInput = $("#tool-cut-kerf");
  const piecesInput = $("#tool-cut-pieces");
  const resultBox = $("#tool-cutlist-result");
  if (!stockInput || !kerfInput || !piecesInput || !resultBox) return;

  const stockLen = parseFloat(stockInput.value);
  const kerf = parseFloat(kerfInput.value) || 0;
  if (!Number.isFinite(stockLen) || stockLen <= 0) {
    resultBox.innerHTML = `<span style="color:#ef4444">Please enter a valid raw stock length (e.g. 96 or 2400).</span>`;
    return;
  }

  const lines = piecesInput.value.split("\n");
  const pieces = [];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = line.match(/^([0-9.]+)\s*(?:[xX*]|qty|count)?\s*([0-9]+)?/);
    if (match) {
      const len = parseFloat(match[1]);
      const qty = match[2] ? parseInt(match[2], 10) : 1;
      if (Number.isFinite(len) && len > 0 && qty > 0) {
        for (let i = 0; i < qty; i++) {
          pieces.push(len);
        }
      }
    }
  }

  if (pieces.length === 0) {
    resultBox.innerHTML = `<span style="color:#ef4444">Please enter at least one cut piece (e.g. <code>36 x 2</code>).</span>`;
    return;
  }

  const overlong = pieces.filter(p => p > stockLen);
  if (overlong.length > 0) {
    resultBox.innerHTML = `<span style="color:#ef4444">Piece length (${overlong[0]}) exceeds raw stock length (${stockLen}). Increase stock length or trim piece.</span>`;
    return;
  }

  // First Fit Decreasing bin-packing
  pieces.sort((a, b) => b - a);

  const boards = [];
  for (const piece of pieces) {
    let placed = false;
    for (const board of boards) {
      const needed = board.cuts.length > 0 ? (piece + kerf) : piece;
      if (board.remaining >= needed) {
        board.cuts.push(piece);
        board.remaining -= needed;
        placed = true;
        break;
      }
    }
    if (!placed) {
      boards.push({
        cuts: [piece],
        remaining: stockLen - piece
      });
    }
  }

  const totalPartsLength = pieces.reduce((a, b) => a + b, 0);
  const totalStockLength = boards.length * stockLen;
  const yieldEfficiency = Math.round((totalPartsLength / totalStockLength) * 100);
  const totalOffcut = boards.reduce((sum, b) => sum + b.remaining, 0);

  const PALETTE = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#db2777", "#0891b2", "#ea580c"];

  let cutPlanSummary = `✂️ CUT LIST & STOCK OPTIMIZATION PLAN\n`;
  cutPlanSummary += `Stock Length: ${stockLen} | Blade Kerf: ${kerf}\n`;
  cutPlanSummary += `Boards Needed: ${boards.length} | Total Cuts: ${pieces.length} | Yield: ${yieldEfficiency}% | Total Scrap: ${totalOffcut.toFixed(2)}\n\n`;

  boards.forEach((b, idx) => {
    cutPlanSummary += `Board #${idx + 1} (cuts: ${b.cuts.join(", ")} | offcut: ${b.remaining.toFixed(2)})\n`;
  });
  lastCutPlanText = cutPlanSummary;

  const boardsHtml = boards.map((board, idx) => {
    const cutSegments = board.cuts.map((cut, cIdx) => {
      const pct = (cut / stockLen) * 100;
      const color = PALETTE[cIdx % PALETTE.length];
      return `<div class="cut-segment" style="width:${pct}%;background:${color}" title="Cut: ${cut}">${cut}</div>`;
    }).join("");

    const scrapPct = Math.max(0, (board.remaining / stockLen) * 100);
    const scrapSegment = scrapPct > 0 ? `<div class="cut-scrap-segment" style="width:${scrapPct}%" title="Offcut Scrap: ${board.remaining.toFixed(2)}">${board.remaining > (stockLen * 0.08) ? `Scrap: ${board.remaining.toFixed(1)}` : ""}</div>` : "";

    return `
      <div class="cut-board-visual">
        <div class="cut-board-head">
          <span>Board #${idx + 1} (${board.cuts.length} pieces)</span>
          <span style="color:var(--muted)">Offcut Scrap: ${board.remaining.toFixed(2)} (${scrapPct.toFixed(1)}%)</span>
        </div>
        <div class="cut-board-bar">
          ${cutSegments}
          ${scrapSegment}
        </div>
      </div>
    `;
  }).join("");

  resultBox.innerHTML = `
    <div class="cut-results-card">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <div>
          <span style="font-size:18px;font-weight:700;color:var(--ink)">${boards.length} ${boards.length === 1 ? "Board" : "Boards"} Required</span>
          <span style="margin-left:8px;font-size:13px;color:var(--muted)">(${pieces.length} cut pieces · ${yieldEfficiency}% yield efficiency)</span>
        </div>
        <div style="font-size:12px;font-weight:600;color:var(--green)">
          Total Offcut Scrap: ${totalOffcut.toFixed(2)}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px">
        ${boardsHtml}
      </div>
    </div>
  `;
}

// (Unified copyCutPlan defined above)

/* ============================================================
   🧪 Workshop Epoxy & Resin Pour Calculator
   ============================================================ */
let lastEpoxyRecipeText = "";

function updateEpoxyCalc() {
  const shape = $("#tool-epoxy-shape")?.value || "rect";
  const units = $("#tool-epoxy-units")?.value || "in";
  const ratioStr = $("#tool-epoxy-ratio")?.value || "2:1";
  const wastePct = parseFloat($("#tool-epoxy-waste")?.value) || 10;
  const resultBox = $("#tool-epoxy-result");
  if (!resultBox) return;

  const lenWrap = $("#tool-epoxy-len-wrap");
  const widWrap = $("#tool-epoxy-wid-wrap");
  const diamWrap = $("#tool-epoxy-diam-wrap");
  const unitLabels = $$(".epoxy-unit-lbl");
  unitLabels.forEach(lbl => lbl.textContent = units);

  if (shape === "round") {
    if (lenWrap) lenWrap.style.display = "none";
    if (widWrap) widWrap.style.display = "none";
    if (diamWrap) diamWrap.style.display = "block";
  } else {
    if (lenWrap) lenWrap.style.display = "block";
    if (widWrap) widWrap.style.display = "block";
    if (diamWrap) diamWrap.style.display = "none";
  }

  const depth = parseFloat($("#tool-epoxy-depth")?.value) || 0;
  let rawVolumeCuUnits = 0;

  if (shape === "round") {
    const diam = parseFloat($("#tool-epoxy-diameter")?.value) || 0;
    const radius = diam / 2;
    if (diam > 0 && depth > 0) {
      rawVolumeCuUnits = Math.PI * (radius * radius) * depth;
    }
  } else {
    const len = parseFloat($("#tool-epoxy-length")?.value) || 0;
    const wid = parseFloat($("#tool-epoxy-width")?.value) || 0;
    if (len > 0 && wid > 0 && depth > 0) {
      rawVolumeCuUnits = len * wid * depth;
    }
  }

  if (rawVolumeCuUnits <= 0) {
    resultBox.innerHTML = `Enter pour dimensions above to calculate resin volume and Part A/B weights.`;
    lastEpoxyRecipeText = "";
    return;
  }

  // 1 cu in = 16.387064 mL, 1 cu mm = 0.001 mL
  const baseMl = units === "in" ? (rawVolumeCuUnits * 16.387064) : (rawVolumeCuUnits / 1000);
  const totalMl = baseMl * (1 + (wastePct / 100));
  const totalFlOz = totalMl / 29.5735;
  const totalLiters = totalMl / 1000;

  const parts = ratioStr.split(":").map(Number);
  const partARatio = parts[0] || 2;
  const partBRatio = parts[1] || 1;
  const totalRatio = partARatio + partBRatio;

  const volMlA = totalMl * (partARatio / totalRatio);
  const volMlB = totalMl * (partBRatio / totalRatio);
  const volFlOzA = volMlA / 29.5735;
  const volFlOzB = volMlB / 29.5735;

  // Density (grams): Resin ~ 1.15 g/mL, Hardener ~ 0.98 g/mL
  const weightGramsA = volMlA * 1.15;
  const weightGramsB = volMlB * 0.98;
  const totalGrams = weightGramsA + weightGramsB;
  const totalLbs = totalGrams / 453.592;

  const depthInInches = units === "in" ? depth : (depth / 25.4);
  const isDeepPour = depthInInches >= 2.0;

  lastEpoxyRecipeText = `🧪 EPOXY POUR RECIPE\n` +
    `Shape: ${shape === "round" ? "Round / Cylinder" : "Rectangle / Cavity"}\n` +
    `Total Required: ${totalFlOz.toFixed(1)} fl oz (${Math.round(totalMl)} mL / ${totalLiters.toFixed(2)} L) [Includes +${wastePct}% buffer]\n` +
    `• Part A (Resin, ${partARatio} parts): ${volFlOzA.toFixed(1)} fl oz · ${Math.round(volMlA)} mL · ${Math.round(weightGramsA)} grams\n` +
    `• Part B (Hardener, ${partBRatio} parts): ${volFlOzB.toFixed(1)} fl oz · ${Math.round(volMlB)} mL · ${Math.round(weightGramsB)} grams\n` +
    `Total Batch Weight: ${Math.round(totalGrams)} g (${totalLbs.toFixed(2)} lbs)\n` +
    (isDeepPour ? `⚠️ Warning: Depth is ${depthInInches.toFixed(1)}". Use a specialized slow-cure deep pour epoxy formula to avoid thermal exotherm.\n` : "");

  resultBox.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px">
      <div>
        <div style="font-size:11px;text-transform:uppercase;color:var(--muted);font-weight:700">Total Mix Volume (+${wastePct}% buffer)</div>
        <div style="font-size:20px;color:var(--green);font-weight:800">${totalFlOz.toFixed(1)} fl oz <span style="font-size:14px;font-weight:600;color:var(--ink)">(${Math.round(totalMl)} mL / ${totalLiters.toFixed(2)} L)</span></div>
      </div>
      <div style="text-align:right">
        <span class="inventory-chip highlight" style="font-size:12px;font-weight:700">Total Weight: ${Math.round(totalGrams)} g (${totalLbs.toFixed(2)} lbs)</span>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px">
        <div style="font-size:12px;font-weight:700;color:var(--ink);margin-bottom:4px">🧪 Part A (Resin) — ${partARatio} parts</div>
        <div style="font-size:16px;font-weight:700;color:var(--green)">${volFlOzA.toFixed(1)} fl oz</div>
        <div style="font-size:12px;color:var(--muted)">${Math.round(volMlA)} mL · <strong>${Math.round(weightGramsA)} grams</strong></div>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px">
        <div style="font-size:12px;font-weight:700;color:var(--ink);margin-bottom:4px">💧 Part B (Hardener) — ${partBRatio} parts</div>
        <div style="font-size:16px;font-weight:700;color:#0284c7">${volFlOzB.toFixed(1)} fl oz</div>
        <div style="font-size:12px;color:var(--muted)">${Math.round(volMlB)} mL · <strong>${Math.round(weightGramsB)} grams</strong></div>
      </div>
    </div>

    ${isDeepPour ? `
      <div style="background:var(--warning-soft, #fef3c7);border:1px solid var(--warning, #f59e0b);color:#92400e;padding:10px;border-radius:6px;font-size:12px;margin-top:8px">
        ⚠️ <strong>Deep Pour Advisory (${depthInInches.toFixed(1)}″ depth):</strong> Pouring thicker than 1.5″ in a single layer with standard tabletop epoxy will cause thermal runaway (boiling/yellowing/cracking). Use a slow-reacting deep casting formula or pour in multiple thin coats.
      </div>
    ` : ""}
  `;
}

async function copyEpoxyRecipe() {
  if (!lastEpoxyRecipeText) {
    updateEpoxyCalc();
  }
  if (!lastEpoxyRecipeText) {
    showToast("Enter dimensions first to generate recipe.");
    return;
  }
  try {
    await navigator.clipboard.writeText(lastEpoxyRecipeText);
    showToast("Copied epoxy recipe to clipboard!");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = lastEpoxyRecipeText;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    showToast("Copied epoxy recipe to clipboard!");
  }
}

/* ============================================================
   🔩 Screw Pilot Hole & Clearance Drill Bit Guide
   ============================================================ */
const SCREW_DATA = {
  "#4": {
    name: "#4 Wood Screw (0.112″ / 2.8 mm)",
    softPilot: "1/16″ (0.062″ / 1.6 mm)",
    hardPilot: "5/64″ (0.078″ / 2.0 mm)",
    clearance: "1/8″ (0.125″ / 3.2 mm)",
    countersink: "82° angle · 1/4″ (6.4 mm) head",
    driver: "#1 Phillips / T10 Torx"
  },
  "#6": {
    name: "#6 Wood Screw (0.138″ / 3.5 mm)",
    softPilot: "5/64″ (0.078″ / 2.0 mm)",
    hardPilot: "3/32″ (0.094″ / 2.4 mm)",
    clearance: "9/64″ (0.141″ / 3.6 mm)",
    countersink: "82° angle · 5/16″ (7.9 mm) head",
    driver: "#2 Phillips / T15 Torx"
  },
  "#8": {
    name: "#8 Wood Screw (0.164″ / 4.2 mm) — General Woodworking",
    softPilot: "3/32″ (0.094″ / 2.4 mm)",
    hardPilot: "7/64″ (0.109″ / 2.8 mm)",
    clearance: "11/64″ (0.172″ / 4.4 mm)",
    countersink: "82° angle · 3/8″ (9.5 mm) head",
    driver: "#2 Phillips / T20 Torx / #2 Square"
  },
  "#10": {
    name: "#10 Wood Screw (0.190″ / 4.8 mm) — Cabinetry & Framing",
    softPilot: "7/64″ (0.109″ / 2.8 mm)",
    hardPilot: "1/8″ (0.125″ / 3.2 mm)",
    clearance: "3/16″ (0.188″ / 4.8 mm)",
    countersink: "82° angle · 7/16″ (11.1 mm) head",
    driver: "#2 Phillips / T25 Torx"
  },
  "#12": {
    name: "#12 Wood Screw (0.216″ / 5.5 mm) — Heavy Timber",
    softPilot: "1/8″ (0.125″ / 3.2 mm)",
    hardPilot: "9/64″ (0.141″ / 3.6 mm)",
    clearance: "7/32″ (0.219″ / 5.6 mm)",
    countersink: "82° angle · 1/2″ (12.7 mm) head",
    driver: "#3 Phillips / T25 Torx"
  },
  "#14": {
    name: "#14 Wood Screw (0.242″ / 6.1 mm) — Heavy Construction",
    softPilot: "9/64″ (0.141″ / 3.6 mm)",
    hardPilot: "5/32″ (0.156″ / 4.0 mm)",
    clearance: "1/4″ (0.250″ / 6.4 mm)",
    countersink: "82° angle · 9/16″ (14.3 mm) head",
    driver: "#3 Phillips / T30 Torx"
  },
  "M3": {
    name: "M3 Metric Screw (3.0 mm)",
    softPilot: "5/64″ (2.0 mm)",
    hardPilot: "3/32″ (2.5 mm)",
    clearance: "1/8″ (3.2 mm)",
    countersink: "90° metric angle · 6.0 mm head",
    driver: "#1 Phillips / 2.5 mm Hex"
  },
  "M4": {
    name: "M4 Metric Screw (4.0 mm)",
    softPilot: "7/64″ (2.8 mm)",
    hardPilot: "1/8″ (3.2 mm)",
    clearance: "11/64″ (4.5 mm)",
    countersink: "90° metric angle · 8.0 mm head",
    driver: "#2 Phillips / 3.0 mm Hex / T20"
  },
  "M5": {
    name: "M5 Metric Screw (5.0 mm)",
    softPilot: "9/64″ (3.5 mm)",
    hardPilot: "5/32″ (4.0 mm)",
    clearance: "7/32″ (5.5 mm)",
    countersink: "90° metric angle · 10.0 mm head",
    driver: "#2 Phillips / 4.0 mm Hex / T25"
  },
  "M6": {
    name: "M6 Metric Screw (6.0 mm)",
    softPilot: "11/64″ (4.2 mm)",
    hardPilot: "3/16″ (4.8 mm)",
    clearance: "17/64″ (6.5 mm)",
    countersink: "90° metric angle · 12.0 mm head",
    driver: "#3 Phillips / 5.0 mm Hex / T30"
  }
};

function updateScrewGuide() {
  const size = $("#tool-screw-size")?.value || "#8";
  const wood = $("#tool-screw-wood")?.value || "soft";
  const resultBox = $("#tool-screw-result");
  if (!resultBox) return;

  const data = SCREW_DATA[size] || SCREW_DATA["#8"];
  const isHard = wood === "hard";
  const chosenPilot = isHard ? data.hardPilot : data.softPilot;

  resultBox.innerHTML = `
    <div style="font-size:14px;font-weight:700;color:var(--ink);margin-bottom:8px">🔩 ${data.name}</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:10px">
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px">
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase">Recommended Pilot Drill Bit</div>
        <div style="font-size:18px;font-weight:800;color:var(--green);margin:2px 0">${chosenPilot}</div>
        <div style="font-size:11px;color:var(--muted)">For ${isHard ? "Hardwoods (prevents screw snap)" : "Softwoods & Plywood"}</div>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px">
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase">Shank Clearance Bit (Top Board)</div>
        <div style="font-size:18px;font-weight:800;color:#0284c7;margin:2px 0">${data.clearance}</div>
        <div style="font-size:11px;color:var(--muted)">Prevents thread jacking between pieces</div>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px">
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase">Countersink Head</div>
        <div style="font-size:14px;font-weight:700;color:var(--ink);margin:4px 0">${data.countersink}</div>
        <div style="font-size:11px;color:var(--muted)">Driver: <strong>${data.driver}</strong></div>
      </div>
    </div>
  `;
}

/* ============================================================
   📐 Miter, Bevel & Polygon Calculator
   ============================================================ */
function updateMiterCalc() {
  const preset = $("#tool-miter-preset")?.value || "8";
  const sidesInput = $("#tool-miter-sides");
  if (preset !== "custom" && sidesInput) {
    sidesInput.value = preset;
  }
  const sides = Math.max(3, parseInt(sidesInput?.value, 10) || 8);
  const splay = Math.max(0, Math.min(60, parseFloat($("#tool-miter-splay")?.value) || 0));
  const outerDia = Math.max(0.1, parseFloat($("#tool-miter-dia")?.value) || 10);
  const wallThick = Math.max(0.01, parseFloat($("#tool-miter-thick")?.value) || 1.25);
  const kerf = Math.max(0, parseFloat($("#tool-miter-kerf")?.value) || 0.125);
  const resultBox = $("#tool-miter-result");
  if (!resultBox) return;

  const includedAngle = ((sides - 2) * 180) / sides;
  const flatMiter = 180 / sides;

  let compoundMiter = flatMiter;
  let bladeBevel = 0;

  if (splay > 0) {
    const splayRad = (splay * Math.PI) / 180;
    const halfAngleRad = (flatMiter * Math.PI) / 180;
    const beta = Math.PI / 2 - splayRad;
    const tanMiter = Math.sin(beta) / Math.tan(halfAngleRad);
    compoundMiter = (Math.atan(tanMiter) * 180) / Math.PI;
    const sinBevel = Math.cos(beta) * Math.cos(halfAngleRad);
    bladeBevel = (Math.asin(Math.min(1, Math.max(0, sinBevel))) * 180) / Math.PI;
  }

  const halfAngleRad = (flatMiter * Math.PI) / 180;
  const outerSegmentLen = outerDia * Math.tan(halfAngleRad);
  const innerDia = Math.max(0, outerDia - 2 * wallThick);
  const innerSegmentLen = innerDia * Math.tan(halfAngleRad);
  const totalStockLength = (outerSegmentLen + kerf) * sides;

  resultBox.innerHTML = `
    <div style="font-size:14px;font-weight:700;color:var(--ink);margin-bottom:8px">
      📐 ${sides}-Sided Polygon ${splay > 0 ? `(Flared at ${splay}°)` : "(Flat 90° Sides)"}
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(170px, 1fr));gap:10px">
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px">
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase">Miter Saw Angle</div>
        <div style="font-size:20px;font-weight:800;color:var(--green);margin:2px 0">${compoundMiter.toFixed(2)}°</div>
        <div style="font-size:11px;color:var(--muted)">Set saw miter scale to <strong>${compoundMiter.toFixed(1)}°</strong></div>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px">
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase">Blade Bevel Tilt</div>
        <div style="font-size:20px;font-weight:800;color:#0284c7;margin:2px 0">${bladeBevel.toFixed(2)}°</div>
        <div style="font-size:11px;color:var(--muted)">${splay > 0 ? "Tilt saw blade bevel to this angle" : "0° (Perpendicular 90° blade)"}</div>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px">
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase">Segment Outer Cut Length</div>
        <div style="font-size:18px;font-weight:800;color:var(--ink);margin:2px 0">${outerSegmentLen.toFixed(3)}″</div>
        <div style="font-size:11px;color:var(--muted)">Inner ring cut: <strong>${innerSegmentLen.toFixed(3)}″</strong></div>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px">
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase">Corner Angle &amp; Stock</div>
        <div style="font-size:18px;font-weight:800;color:var(--ink);margin:2px 0">${includedAngle.toFixed(1)}°</div>
        <div style="font-size:11px;color:var(--muted)">Linear board: ~<strong>${totalStockLength.toFixed(1)}″</strong> (with ${sides} cuts)</div>
      </div>
    </div>
  `;
}

async function copyMiterRecipe() {
  const sides = $("#tool-miter-sides")?.value || "8";
  const splay = $("#tool-miter-splay")?.value || "0";
  const dia = $("#tool-miter-dia")?.value || "10";
  const flatMiter = (180 / parseFloat(sides)).toFixed(2);
  const text = `📐 Miter & Polygon Cut Recipe:
- Shape: ${sides}-sided polygon (flare: ${splay}°)
- Miter Saw Angle: ${flatMiter}°
- Desired Outer Diameter: ${dia}″
Calculated with Workbench Project Journal`;
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied miter angle recipe to clipboard!");
  } catch {
    showToast("Miter recipe ready.");
  }
}

/* ============================================================
   🌲 Wood Species & Movement Database
   ============================================================ */
const WOOD_SPECIES_DB = [
  { id: "walnut", name: "Black Walnut", latin: "Juglans nigra", category: "hardwood", janka: 1010, rad: 5.5, tang: 7.8, weight: 38, tr: 1.42, notes: "Premier North American cabinet wood. Exceptional stability, darkens with age, glues and finishes beautifully.", caution: "Dust can cause allergic rhinitis in sensitive makers." },
  { id: "white_oak", name: "White Oak", latin: "Quercus alba", category: "hardwood", janka: 1360, rad: 5.6, tang: 10.5, weight: 47, tr: 1.88, notes: "Closed tyloses make it rot and water proof (whiskey barrels, outdoor furniture). High tannins react black with iron.", caution: "Pre-drilling required for all screws." },
  { id: "red_oak", name: "Red Oak", latin: "Quercus rubra", category: "hardwood", janka: 1290, rad: 4.0, tang: 8.6, weight: 44, tr: 2.15, notes: "Open porous end-grain straws (not rot-proof). Accepts stains very readily. Coarse texture.", caution: "Prone to cupping if dried unevenly (T/R > 2.0)." },
  { id: "hard_maple", name: "Hard Maple (Sugar)", latin: "Acer saccharum", category: "hardwood", janka: 1450, rad: 4.8, tang: 9.9, weight: 44, tr: 2.06, notes: "Extremely abrasion resistant. Standard for butcher blocks, workbenches, and tool handles.", caution: "Dull router bits burn maple very quickly." },
  { id: "cherry", name: "Black Cherry", latin: "Prunus serotina", category: "hardwood", janka: 950, rad: 3.7, tang: 7.1, weight: 35, tr: 1.92, notes: "Ages to deep rich reddish-brown patina with UV sunlight. Low movement, silky smooth surface.", caution: "High pitch content burns easily when crosscutting." },
  { id: "ash", name: "White Ash", latin: "Fraxinus americana", category: "hardwood", janka: 1320, rad: 4.9, tang: 7.8, weight: 42, tr: 1.59, notes: "Superb shock resistance and steam-bending properties. Baseball bats, mallet handles, mid-century furniture.", caution: "Pores need grain filler for high gloss mirror finishes." },
  { id: "poplar", name: "Yellow Poplar", latin: "Liriodendron tulipifera", category: "hardwood", janka: 540, rad: 4.6, tang: 8.2, weight: 29, tr: 1.78, notes: "Soft hardwood. The premier paint-grade species for interior cabinetry, moldings, and core carcasses.", caution: "Grain can fuzz up if sanded with worn abrasive paper." },
  { id: "hickory", name: "Hickory", latin: "Carya ovata", category: "hardwood", janka: 1820, rad: 7.0, tang: 10.5, weight: 50, tr: 1.50, notes: "Highest strength and hardness among common domestic woods. Tremendous impact shock absorption.", caution: "Extremely tough on dull tooling and planers." },
  { id: "pine", name: "Eastern White Pine", latin: "Pinus strobus", category: "softwood", janka: 380, rad: 2.1, tang: 6.1, weight: 25, tr: 2.90, notes: "Historic colonial timber. Very low shrinkage, exceptionally easy to carve with hand planes and chisels.", caution: "Very soft—dents easily under fingernail pressure." },
  { id: "doug_fir", name: "Douglas Fir", latin: "Pseudotsuga menziesii", category: "softwood", janka: 660, rad: 4.8, tang: 7.6, weight: 32, tr: 1.58, notes: "High strength-to-weight structural timber. Very stiff workbench top material.", caution: "Latewood ridges can cause blade chatter when hand planning." },
  { id: "cedar", name: "Western Red Cedar", latin: "Thuja plicata", category: "softwood", janka: 350, rad: 2.4, tang: 5.0, weight: 23, tr: 2.08, notes: "Natural thujaplicin oils provide supreme weather and insect decay resistance. Sauna and deck staple.", caution: "Soft; use stainless steel or coated fasteners to avoid black staining." },
  { id: "teak", name: "Teak", latin: "Tectona grandis", category: "exotic", janka: 1070, rad: 2.5, tang: 5.8, weight: 40, tr: 2.32, notes: "Supreme marine and boat deck hardwood. Natural oils prevent water penetration even untreated.", caution: "High silica content blunts carbide saw blades quickly. Wipe with acetone before glue-up." },
  { id: "mahogany", name: "Genuine Mahogany", latin: "Swietenia macrophylla", category: "exotic", janka: 900, rad: 3.0, tang: 4.1, weight: 37, tr: 1.37, notes: "One of the most dimensionally stable woods on earth (T/R = 1.37). Classic antique furniture and guitars.", caution: "CITES Appendix II protected; ensure certified sustainably sourced." },
  { id: "purpleheart", name: "Purpleheart", latin: "Peltogyne spp.", category: "exotic", janka: 2520, rad: 3.8, tang: 6.4, weight: 56, tr: 1.68, notes: "Freshly cut dull brown oxidizes into bright vibrant purple. Ultra hard, stiff, and heavy.", caution: "Heat from dull tooling causes gum bleed that glazes blades." },
  { id: "padauk", name: "African Padauk", latin: "Pterocarpus soyauxii", category: "exotic", janka: 1970, rad: 3.3, tang: 5.2, weight: 47, tr: 1.58, notes: "Vivid bright coral crimson-orange heartwood. Excellent dimensional stability, turns cleanly.", caution: "Bright orange dust will coat shop surfaces; protect with UV-inhibiting finish." },
  { id: "wenge", name: "Wenge", latin: "Millettia laurentii", category: "exotic", janka: 1930, rad: 4.8, tang: 8.1, weight: 54, tr: 1.69, notes: "Dark chocolate espresso color with black veins. High contrast accents in fine jewelry boxes.", caution: "Splinters fester easily in skin; wear leather gloves when rough dimensioning." }
];

function initWoodSpeciesOptions() {
  const select = $("#tool-wood-species");
  if (!select || select.children.length > 0) return;
  select.innerHTML = WOOD_SPECIES_DB.map(s => `
    <option value="${s.id}">${s.name} (${s.category === "exotic" ? "Exotic" : s.category === "softwood" ? "Softwood" : "Hardwood"} · Janka ${s.janka})</option>
  `).join("");
}

function updateWoodSpeciesView() {
  initWoodSpeciesOptions();
  const select = $("#tool-wood-species");
  const speciesId = select?.value || "walnut";
  const species = WOOD_SPECIES_DB.find(s => s.id === speciesId) || WOOD_SPECIES_DB[0];
  const card = $("#tool-wood-card");
  if (!card) return;

  const jankaPct = Math.min(100, Math.round((species.janka / 2600) * 100));

  card.innerHTML = `
    <div class="wood-species-header">
      <div>
        <div class="wood-species-title">🌲 ${species.name}</div>
        <div class="wood-species-latin">${species.latin}</div>
      </div>
      <span class="wood-species-tag ${species.category}">${species.category}</span>
    </div>
    <div class="janka-meter-wrap">
      <div class="janka-meter-label">
        <span>Hardness: <strong>${species.janka} lbf</strong> (Janka Scale)</span>
        <span>${species.janka < 600 ? "Soft" : species.janka < 1200 ? "Medium Hard" : species.janka < 1700 ? "Hard" : "Ultra Dense"}</span>
      </div>
      <div class="janka-meter-track">
        <div class="janka-meter-fill" style="width: ${jankaPct}%"></div>
      </div>
    </div>
    <div class="wood-stats-grid">
      <div class="wood-stat-item">
        <div class="wood-stat-val">${species.tang}%</div>
        <div class="wood-stat-lbl">Tangential (Flat)</div>
      </div>
      <div class="wood-stat-item">
        <div class="wood-stat-val">${species.rad}%</div>
        <div class="wood-stat-lbl">Radial (Quarter)</div>
      </div>
      <div class="wood-stat-item">
        <div class="wood-stat-val">${species.tr}</div>
        <div class="wood-stat-lbl">T/R Ratio (${species.tr < 1.7 ? "Stable" : "Prone to Cup"})</div>
      </div>
      <div class="wood-stat-item">
        <div class="wood-stat-val">${species.weight} lbs</div>
        <div class="wood-stat-lbl">Density (cu. ft)</div>
      </div>
    </div>
    <div class="wood-workability-box">
      <strong>Workability:</strong> ${species.notes}<br>
      <span style="color:#b45309">⚠️ <strong>Note:</strong> ${species.caution}</span>
    </div>
  `;

  updateWoodMovementCalc();
}

function updateWoodMovementCalc() {
  const select = $("#tool-wood-species");
  const speciesId = select?.value || "walnut";
  const species = WOOD_SPECIES_DB.find(s => s.id === speciesId) || WOOD_SPECIES_DB[0];
  const width = Math.max(1, parseFloat($("#tool-wood-width")?.value) || 36);
  const cut = $("#tool-wood-cut")?.value || "tangential";
  const mcPreset = $("#tool-wood-mc-swing")?.value || "6";
  const customWrap = $("#tool-wood-custom-mc-wrap");

  let deltaMC = 6;
  if (mcPreset === "custom") {
    if (customWrap) customWrap.style.display = "block";
    deltaMC = parseFloat($("#tool-wood-custom-mc")?.value) || 6;
  } else {
    if (customWrap) customWrap.style.display = "none";
    deltaMC = parseFloat(mcPreset) || 6;
  }

  const shrinkPercent = cut === "radial" ? species.rad : species.tang;
  const Cr = (shrinkPercent / 30) / 100;
  const totalChangeInches = width * Cr * deltaMC;
  const totalChangeMm = totalChangeInches * 25.4;

  const resultBox = $("#tool-wood-movement-result");
  if (!resultBox) return;

  const approxFraction = totalChangeInches < 0.04 ? "~1/32″" : totalChangeInches < 0.08 ? "~1/16″" : totalChangeInches < 0.15 ? "~1/8″" : totalChangeInches < 0.22 ? "~3/16″" : totalChangeInches < 0.30 ? "~1/4″" : totalChangeInches < 0.40 ? "~3/8″" : "~1/2″";

  resultBox.innerHTML = `
    <div style="font-size:14px;font-weight:700;color:var(--ink);margin-bottom:6px">
      Expected Seasonal Movement: <span style="color:var(--green)">±${totalChangeInches.toFixed(3)}″ (${approxFraction} · ${totalChangeMm.toFixed(1)} mm)</span>
    </div>
    <div style="font-size:12px;color:var(--muted);line-height:1.5">
      A <strong>${width}″ wide</strong> ${cut === "radial" ? "quarter-sawn" : "flat-sawn"} ${species.name} panel will expand in summer and contract in winter by approximately <strong>${totalChangeInches.toFixed(2)}″</strong> over a ${deltaMC}% moisture swing.<br>
      ${totalChangeInches > 0.125 ? "💡 <strong>Joinery Rule:</strong> Secure tabletop to aprons using slotted figure-eight fasteners or tabletop Z-clips. Do not pocket-screw solid tops cross-grain!" : "💡 <strong>Joinery Rule:</strong> Normal tolerance. Minor seasonal movement."}
    </div>
  `;
}

/* ============================================================
   💨 Dust Collection CFM & Duct Sizing Tool
   ============================================================ */
const DUST_MACHINE_CFM = {
  tablesaw: 450,
  planer12: 500,
  planer15: 650,
  jointer8: 450,
  jointer12: 600,
  router: 350,
  bandsaw: 400,
  drumsander: 550,
  mitersaw: 500,
  cnc: 350,
  lathe: 400
};

function updateDustCalc() {
  const machineKey = $("#tool-dust-machine")?.value || "tablesaw";
  const customWrap = $("#tool-dust-custom-cfm-wrap");
  let cfm = 450;

  if (machineKey === "custom") {
    if (customWrap) customWrap.style.display = "block";
    cfm = Math.max(50, parseInt($("#tool-dust-custom-cfm")?.value, 10) || 450);
  } else {
    if (customWrap) customWrap.style.display = "none";
    cfm = DUST_MACHINE_CFM[machineKey] || 450;
  }

  const diaInches = parseFloat($("#tool-dust-dia")?.value) || 4.0;
  const straightFeet = Math.max(1, parseFloat($("#tool-dust-length")?.value) || 16);
  const elbows90 = Math.max(0, parseInt($("#tool-dust-elbows90")?.value, 10) || 0);
  const elbows45 = Math.max(0, parseInt($("#tool-dust-elbows45")?.value, 10) || 0);
  const flexFeet = Math.max(0, parseFloat($("#tool-dust-flex")?.value) || 0);
  const resultBox = $("#tool-dust-result");
  if (!resultBox) return;

  const radiusFt = (diaInches / 2) / 12;
  const areaSqFt = Math.PI * radiusFt * radiusFt;
  const velocityFpm = Math.round(cfm / areaSqFt);

  const eqLength = straightFeet + (elbows90 * 10) + (elbows45 * 5) + (flexFeet * 3);
  const velRatio = velocityFpm / 4005;
  const spDrop = Math.max(0.1, eqLength * (velRatio * velRatio) * (0.02 / (diaInches / 12))).toFixed(2);

  let statusClass = "optimal";
  let statusText = "🟢 Ideal Transport Velocity (3,800–4,500 FPM)";
  let statusAdvice = "Excellent chip and sawdust transport. Chips stay airborne without excessive friction losses.";

  if (velocityFpm < 3500) {
    statusClass = "low";
    statusText = "🔴 Velocity Too Low (< 3,500 FPM) — Clog Risk!";
    statusAdvice = "Heavy planer and jointer chips will settle in horizontal ductwork and choke airflow. Use a smaller diameter branch (e.g. 4″) or upgrade dust collector CFM.";
  } else if (velocityFpm > 5200) {
    statusClass = "high";
    statusText = "🟡 Velocity Very High (> 5,200 FPM) — High Friction & Noise";
    statusAdvice = "Significant air turbulence and static pressure loss. Upgrade to a 5″ or 6″ duct to reduce blower strain and air whistling.";
  }

  resultBox.innerHTML = `
    <div style="font-size:14px;font-weight:700;color:var(--ink);margin-bottom:8px">
      💨 Airflow Analysis: <span style="font-size:16px">${cfm} CFM</span> through <span style="font-size:16px">${diaInches}″</span> Duct
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(170px, 1fr));gap:10px">
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px">
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase">Air Velocity</div>
        <div style="font-size:20px;font-weight:800;color:var(--ink);margin:2px 0">${velocityFpm.toLocaleString()} FPM</div>
        <div class="velocity-status-badge ${statusClass}">${statusText}</div>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px">
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase">Estimated Static Pressure Loss</div>
        <div style="font-size:20px;font-weight:800;color:#0284c7;margin:2px 0">${spDrop}″ W.G.</div>
        <div style="font-size:11px;color:var(--muted)">Across ${eqLength.toFixed(0)} ft equivalent duct resistance</div>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px">
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase">Collector Recommendation</div>
        <div style="font-size:14px;font-weight:700;color:var(--ink);margin:3px 0">${cfm > 500 ? "1.5 HP – 2 HP Cyclone" : diaInches <= 2.5 ? "Shop Vac w/ Separator" : "1 HP – 1.5 HP Collector"}</div>
        <div style="font-size:11px;color:var(--muted)">Minimum recommended rating</div>
      </div>
    </div>
    <div style="margin-top:10px;font-size:12px;color:var(--ink);background:var(--surface-subtle);padding:8px 10px;border-radius:6px">
      ${statusAdvice}
    </div>
  `;
}

/* ============================================================
   ✂️ Project Cut List Bridge
   ============================================================ */
function transferProjectToCutlist(projectId) {
  const project = state.projects.find(p => p.id === projectId);
  if (!project) return;
  const materials = project.materials || [];
  const lines = [];

  for (const mat of materials) {
    const text = `${mat.name || ""} ${mat.notes || ""}`;
    const match = text.match(/(\d+(?:\.\d+)?)\s*(?:x|\*|by|×)\s*(\d+(?:\.\d+)?)/i);
    if (match) {
      lines.push(`${match[1]} x ${match[2]}`);
    } else {
      const singleNum = text.match(/(\d+(?:\.\d+)?)\s*(?:in|inch|″|cm|mm|')/i);
      if (singleNum) {
        lines.push(`${singleNum[1]} x 1`);
      }
    }
  }

  openToolsDialog();
  switchToolTab("cutlist");

  const cutArea = $("#tool-cut-pieces");
  if (cutArea) {
    if (lines.length > 0) {
      cutArea.value = lines.join("\n");
      showToast(`✂️ Transferred ${lines.length} items from ${project.title} to Cut List Optimizer!`);
    } else {
      showToast(`Opened Cut List Optimizer for ${project.title}.`);
    }
  }
  runCutOptimizer();
}

/* ============================================================
   🧶 Fiber Arts & Yarn: Knitting & Crochet Studio
   ============================================================ */
let yarnCounterState = { row: 1, repeat: 1, section: "" };

function updateYarnCounterUI() {
  const rowEl = $("#tool-yarn-row-display");
  const repEl = $("#tool-yarn-rep-display");
  if (rowEl) rowEl.textContent = yarnCounterState.row;
  if (repEl) repEl.textContent = yarnCounterState.repeat;
}

function yarnCounterAction(action) {
  if (action === "yarn-row-inc") yarnCounterState.row++;
  if (action === "yarn-row-dec") yarnCounterState.row = Math.max(1, yarnCounterState.row - 1);
  if (action === "yarn-row-reset") yarnCounterState.row = 1;
  if (action === "yarn-rep-inc") yarnCounterState.repeat++;
  if (action === "yarn-rep-dec") yarnCounterState.repeat = Math.max(1, yarnCounterState.repeat - 1);
  if (action === "yarn-rep-reset") yarnCounterState.repeat = 1;
  updateYarnCounterUI();
}

function updateYarnGaugeCalc() {
  const patSts = parseFloat($("#tool-yarn-pat-sts")?.value) || 20;
  const patRows = parseFloat($("#tool-yarn-pat-rows")?.value) || 26;
  const mySts = parseFloat($("#tool-yarn-my-sts")?.value) || 18;
  const myRows = parseFloat($("#tool-yarn-my-rows")?.value) || 24;
  const targetWidth = parseFloat($("#tool-yarn-target-width")?.value) || 40;
  const resultBox = $("#tool-yarn-gauge-result");
  if (!resultBox) return;

  const patStsPerInch = patSts / 4;
  const myStsPerInch = mySts / 4;
  const standardPatternCastOn = Math.round(targetWidth * patStsPerInch);
  const adjustedCastOn = Math.round(targetWidth * myStsPerInch);
  const diffSts = adjustedCastOn - standardPatternCastOn;
  const rowRatio = (myRows / patRows);

  let tensionVerdict = "Your tension matches the pattern closely.";
  let badgeColor = "var(--green)";
  if (mySts < patSts) {
    tensionVerdict = `Your gauge is LOOSER (${mySts} vs ${patSts} sts/4″). If you follow the pattern unadjusted, your garment will turn out ${(targetWidth * (patSts / mySts)).toFixed(1)}″ (too big!).`;
    badgeColor = "#ca8a04";
  } else if (mySts > patSts) {
    tensionVerdict = `Your gauge is TIGHTER (${mySts} vs ${patSts} sts/4″). If you follow the pattern unadjusted, your garment will turn out ${(targetWidth * (patSts / mySts)).toFixed(1)}″ (too small!).`;
    badgeColor = "#ca8a04";
  }

  resultBox.innerHTML = `
    <div style="font-size:14px;font-weight:700;color:var(--ink);margin-bottom:8px">
      Adjusted Cast-On for ${targetWidth}″ Finished Width: <span style="font-size:18px;color:${badgeColor}">${adjustedCastOn} stitches</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(170px, 1fr));gap:10px">
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px">
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase">Your Cast-On Target</div>
        <div style="font-size:22px;font-weight:900;color:var(--green);margin:2px 0">${adjustedCastOn} sts</div>
        <div style="font-size:11px;color:var(--muted)">Pattern calls for ${standardPatternCastOn} sts (${diffSts >= 0 ? `+${diffSts}` : diffSts} sts adjustment)</div>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px">
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase">Row Count Multiplier</div>
        <div style="font-size:22px;font-weight:900;color:#0284c7;margin:2px 0">${(rowRatio * 100).toFixed(0)}%</div>
        <div style="font-size:11px;color:var(--muted)">Work ${(rowRatio).toFixed(2)}× pattern row counts for correct height</div>
      </div>
    </div>
    <div style="margin-top:10px;font-size:12px;color:var(--ink);background:var(--surface-subtle);padding:8px 10px;border-radius:6px">
      💡 <strong>Tension Analysis:</strong> ${tensionVerdict} Or switch needle/hook size by 0.5mm to match pattern gauge directly.
    </div>
  `;
}

const YARN_WEIGHTS_DB = {
  "0": { name: "Lace", alt: "Fingering 10-count / Thread", wpi: "30-40+ WPI", hook: "1.6 – 2.25 mm (Steel 6–8)", needle: "1.5 – 2.25 mm (US 000–1)", knitGauge: "33–40 sts / 4″", crochetGauge: "32–42 sts / 4″", projects: "Doilies, lace shawls, delicate openwork collars" },
  "1": { name: "Super Fine", alt: "Sock, Fingering, Baby", wpi: "18-24 WPI", hook: "2.25 – 3.5 mm (B-1 to E-4)", needle: "2.25 – 3.25 mm (US 1–3)", knitGauge: "27–32 sts / 4″", crochetGauge: "21–32 sts / 4″", projects: "Socks, fine mittens, baby garments, lightweight scarves" },
  "2": { name: "Fine", alt: "Sport, Baby 4-ply", wpi: "14-18 WPI", hook: "3.5 – 4.5 mm (E-4 to 7)", needle: "3.25 – 3.75 mm (US 3–5)", knitGauge: "23–26 sts / 4″", crochetGauge: "16–20 sts / 4″", projects: "Lightweight sweaters, baby blankets, shawls, socks" },
  "3": { name: "Light", alt: "DK (Double Knitting), Light Worsted", wpi: "11-14 WPI", hook: "4.5 – 5.5 mm (7 to I-9)", needle: "3.75 – 4.5 mm (US 5–7)", knitGauge: "21–24 sts / 4″", crochetGauge: "12–17 sts / 4″", projects: "Garments, cardigans, lightweight afghans, beanies" },
  "4": { name: "Medium", alt: "Worsted, Afghan, Aran", wpi: "9-11 WPI", hook: "5.5 – 6.5 mm (I-9 to K-10.5)", needle: "4.5 – 5.5 mm (US 7–9)", knitGauge: "16–20 sts / 4″", crochetGauge: "11–14 sts / 4″", projects: "Standard sweaters, blankets, amigurumi toys, winter hats" },
  "5": { name: "Bulky", alt: "Chunky, Craft, Rug", wpi: "7-8 WPI", hook: "6.5 – 9.0 mm (K-10.5 to M-13)", needle: "5.5 – 8.0 mm (US 9–11)", knitGauge: "12–15 sts / 4″", crochetGauge: "8–11 sts / 4″", projects: "Heavy winter scarves, quick throw blankets, rugs, cowls" },
  "6": { name: "Super Bulky", alt: "Roving, Super Chunky", wpi: "5-6 WPI", hook: "9.0 – 15.0 mm (M-13 to Q)", needle: "8.0 – 12.75 mm (US 11–17)", knitGauge: "7–11 sts / 4″", crochetGauge: "5–9 sts / 4″", projects: "Cozy chunky throws, thick beanies, arm-knitted decor" },
  "7": { name: "Jumbo", alt: "Giant Roving", wpi: "1-4 WPI", hook: "15.0 mm and larger (Q and up)", needle: "12.75 mm and larger (US 17+)", knitGauge: "6 sts or fewer / 4″", crochetGauge: "5 sts or fewer / 4″", projects: "Extreme knitting, oversized couch blankets, pet beds" }
};

function updateYarnWeightView() {
  const select = $("#tool-yarn-weight-select");
  const key = select?.value || "4";
  const item = YARN_WEIGHTS_DB[key] || YARN_WEIGHTS_DB["4"];
  const card = $("#tool-yarn-weight-card");
  if (!card) return;

  card.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div style="font-size:16px;font-weight:700;color:var(--ink)">Category ${key} · ${item.name} (${item.alt})</div>
      <span class="wood-species-tag" style="background:rgba(217, 70, 239, 0.12);color:#a21caf">${item.wpi}</span>
    </div>
    <div class="wood-stats-grid">
      <div class="wood-stat-item">
        <div class="wood-stat-val" style="font-size:12px">${item.hook}</div>
        <div class="wood-stat-lbl">Crochet Hook</div>
      </div>
      <div class="wood-stat-item">
        <div class="wood-stat-val" style="font-size:12px">${item.needle}</div>
        <div class="wood-stat-lbl">Knitting Needle</div>
      </div>
      <div class="wood-stat-item">
        <div class="wood-stat-val" style="font-size:12px">${item.knitGauge}</div>
        <div class="wood-stat-lbl">Typical Knit Gauge</div>
      </div>
      <div class="wood-stat-item">
        <div class="wood-stat-val" style="font-size:12px">${item.crochetGauge}</div>
        <div class="wood-stat-lbl">Typical Crochet Gauge</div>
      </div>
    </div>
    <div style="font-size:12px;color:var(--muted);margin-top:6px">
      <strong>Best suited for:</strong> ${item.projects}
    </div>
  `;
}

/* ============================================================
   ⚡ Electronics, Circuits & Ohm's Law
   ============================================================ */
function calcOhmsLaw() {
  let v = parseFloat($("#tool-elec-v")?.value);
  let i = parseFloat($("#tool-elec-i")?.value);
  let r = parseFloat($("#tool-elec-r")?.value);
  let p = parseFloat($("#tool-elec-p")?.value);

  const hasV = !isNaN(v) && v > 0;
  const hasI = !isNaN(i) && i > 0;
  const hasR = !isNaN(r) && r > 0;
  const hasP = !isNaN(p) && p > 0;

  const count = [hasV, hasI, hasR, hasP].filter(Boolean).length;
  const resultBox = $("#tool-elec-ohms-result");
  if (!resultBox) return;

  if (count < 2) {
    resultBox.innerHTML = `<span style="color:#b45309">⚠️ Please enter at least 2 circuit values (e.g. Voltage and Resistance) to solve the circuit.</span>`;
    return;
  }

  let currentAmps = hasI ? (i / 1000) : 0;

  if (hasV && hasR) {
    currentAmps = v / r;
    p = v * currentAmps;
  } else if (hasV && hasI) {
    r = v / currentAmps;
    p = v * currentAmps;
  } else if (hasV && hasP) {
    currentAmps = p / v;
    r = v / currentAmps;
  } else if (hasI && hasR) {
    v = currentAmps * r;
    p = v * currentAmps;
  } else if (hasI && hasP) {
    v = p / currentAmps;
    r = v / currentAmps;
  } else if (hasR && hasP) {
    currentAmps = Math.sqrt(p / r);
    v = currentAmps * r;
  }

  i = currentAmps * 1000;

  if ($("#tool-elec-v")) $("#tool-elec-v").value = v.toFixed(3).replace(/\.?0+$/, "");
  if ($("#tool-elec-i")) $("#tool-elec-i").value = i.toFixed(2).replace(/\.?0+$/, "");
  if ($("#tool-elec-r")) $("#tool-elec-r").value = r.toFixed(2).replace(/\.?0+$/, "");
  if ($("#tool-elec-p")) $("#tool-elec-p").value = p.toFixed(4).replace(/\.?0+$/, "");

  let wattWarning = "Safe for miniature 1/8W or 1/4W standard carbon film resistors.";
  if (p > 0.5) {
    wattWarning = `⚠️ High dissipation (${p.toFixed(2)}W)! Standard 1/4W resistors will smoke and burn. Use a 1W, 2W, or cement power resistor with heatsinking!`;
  } else if (p > 0.25) {
    wattWarning = `⚠️ Power is ${(p * 1000).toFixed(0)} mW. Exceeds standard 1/4-Watt (250 mW) rating. Use at least a 1/2-Watt resistor.`;
  }

  resultBox.innerHTML = `
    <div style="font-size:14px;font-weight:700;color:var(--ink);margin-bottom:8px">
      ⚡ Circuit Solution: <span style="color:var(--green)">${v.toFixed(2)}V</span> · <span style="color:#0284c7">${i.toFixed(1)} mA</span> · <span style="color:var(--ink)">${r.toFixed(1)} Ω</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:8px">
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:8px;text-align:center">
        <div style="font-size:10px;color:var(--muted);font-weight:700">VOLTAGE</div>
        <div style="font-size:16px;font-weight:800;color:var(--ink)">${v.toFixed(2)} V</div>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:8px;text-align:center">
        <div style="font-size:10px;color:var(--muted);font-weight:700">CURRENT</div>
        <div style="font-size:16px;font-weight:800;color:#0284c7">${i < 1000 ? `${i.toFixed(1)} mA` : `${(i / 1000).toFixed(3)} A`}</div>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:8px;text-align:center">
        <div style="font-size:10px;color:var(--muted);font-weight:700">RESISTANCE</div>
        <div style="font-size:16px;font-weight:800;color:var(--green)">${r >= 1000 ? `${(r / 1000).toFixed(2)} kΩ` : `${r.toFixed(1)} Ω`}</div>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:8px;text-align:center">
        <div style="font-size:10px;color:var(--muted);font-weight:700">POWER DISSIPATION</div>
        <div style="font-size:16px;font-weight:800;color:${p > 0.25 ? "#dc2626" : "var(--ink)"}">${p < 1 ? `${(p * 1000).toFixed(1)} mW` : `${p.toFixed(2)} W`}</div>
      </div>
    </div>
    <div style="margin-top:8px;font-size:11px;color:var(--muted)">${wattWarning}</div>
  `;
}

function clearOhmsLaw() {
  if ($("#tool-elec-v")) $("#tool-elec-v").value = "";
  if ($("#tool-elec-i")) $("#tool-elec-i").value = "";
  if ($("#tool-elec-r")) $("#tool-elec-r").value = "";
  if ($("#tool-elec-p")) $("#tool-elec-p").value = "";
  const resultBox = $("#tool-elec-ohms-result");
  if (resultBox) resultBox.innerHTML = "Enter 2 parameters above and click Solve Circuit.";
}

const LED_VF_DATA = {
  red: 2.0,
  green: 2.2,
  yellow: 2.1,
  blue: 3.2,
  white: 3.2,
  uv: 3.4,
  ir: 1.4
};

const STANDARD_E24_VALUES = [
  10, 11, 12, 13, 15, 16, 18, 20, 22, 24, 27, 30, 33, 36, 39, 43, 47, 51, 56, 62, 68, 75, 82, 91
];

function findNearestE24(targetOhms) {
  if (targetOhms <= 0) return 0;
  const dec = Math.floor(Math.log10(targetOhms));
  const normalized = targetOhms / Math.pow(10, dec);
  let best = STANDARD_E24_VALUES[0];
  let minDiff = Infinity;
  for (const v of STANDARD_E24_VALUES) {
    const diff = Math.abs(v - normalized);
    if (diff < minDiff) {
      minDiff = diff;
      best = v;
    }
  }
  return Math.round(best * Math.pow(10, dec));
}

function updateLedCalc() {
  const vsPreset = $("#tool-led-vs-preset")?.value || "5";
  const customWrap = $("#tool-led-vs-custom-wrap");
  let vs = 5.0;

  if (vsPreset === "custom") {
    if (customWrap) customWrap.style.display = "block";
    vs = parseFloat($("#tool-led-vs-custom")?.value) || 5.0;
  } else {
    if (customWrap) customWrap.style.display = "none";
    vs = parseFloat(vsPreset) || 5.0;
  }

  const color = $("#tool-led-color")?.value || "red";
  const vf = LED_VF_DATA[color] || 2.0;
  const ma = Math.max(1, parseFloat($("#tool-led-ma")?.value) || 20);
  const resultBox = $("#tool-led-result");
  if (!resultBox) return;

  if (vs <= vf) {
    resultBox.innerHTML = `
      <div style="color:#dc2626;font-weight:700">⚠️ Supply voltage (${vs}V) is lower than or equal to LED forward voltage (${vf}V). The LED will not illuminate without a booster!</div>
    `;
    return;
  }

  const currentAmps = ma / 1000;
  const exactOhms = (vs - vf) / currentAmps;
  const standardE24 = findNearestE24(exactOhms);
  const powerWatts = (vs - vf) * currentAmps;

  resultBox.innerHTML = `
    <div style="font-size:14px;font-weight:700;color:var(--ink);margin-bottom:8px">
      💡 Target LED Resistor: <span style="font-size:18px;color:var(--green)">${standardE24 >= 1000 ? `${(standardE24 / 1000).toFixed(1)} kΩ` : `${standardE24} Ω`}</span> (Nearest Standard E24)
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(160px, 1fr));gap:8px">
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:8px">
        <div style="font-size:10px;color:var(--muted);font-weight:700">EXACT CALCULATED</div>
        <div style="font-size:16px;font-weight:800;color:var(--ink)">${exactOhms.toFixed(1)} Ω</div>
        <div style="font-size:10px;color:var(--muted)">R = (${vs}V − ${vf}V) / ${ma}mA</div>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:8px">
        <div style="font-size:10px;color:var(--muted);font-weight:700">RESISTOR POWER</div>
        <div style="font-size:16px;font-weight:800;color:#0284c7">${(powerWatts * 1000).toFixed(1)} mW</div>
        <div style="font-size:10px;color:var(--muted)">Min rating: <strong>${powerWatts > 0.25 ? "1/2-Watt" : "1/4-Watt standard"}</strong></div>
      </div>
    </div>
  `;
}

const RESISTOR_COLOR_MAP = {
  "0": { name: "Black", color: "#111827" },
  "1": { name: "Brown", color: "#854d0e" },
  "2": { name: "Red", color: "#dc2626" },
  "3": { name: "Orange", color: "#ea580c" },
  "4": { name: "Yellow", color: "#eab308" },
  "5": { name: "Green", color: "#16a34a" },
  "6": { name: "Blue", color: "#2563eb" },
  "7": { name: "Violet", color: "#9333ea" },
  "8": { name: "Gray", color: "#6b7280" },
  "9": { name: "White", color: "#f9fafb" },
  "0.1": { name: "Gold", color: "#eab308" },
  "0.01": { name: "Silver", color: "#9ca3af" },
  "5": { name: "Gold", color: "#eab308" },
  "10": { name: "Silver", color: "#9ca3af" }
};

function updateResistorColorCode() {
  const b1 = $("#tool-res-band1")?.value || "4";
  const b2 = $("#tool-res-band2")?.value || "7";
  const mult = parseFloat($("#tool-res-mult")?.value) || 100;
  const tol = parseFloat($("#tool-res-tol")?.value) || 5;
  const resultBox = $("#tool-res-code-result");
  if (!resultBox) return;

  const baseDigits = parseInt(`${b1}${b2}`, 10);
  const resistance = baseDigits * mult;
  const minR = resistance * (1 - tol / 100);
  const maxR = resistance * (1 + tol / 100);

  const formattedR = resistance >= 1000000 ? `${(resistance / 1000000).toFixed(2)} MΩ` : resistance >= 1000 ? `${(resistance / 1000).toFixed(2)} kΩ` : `${resistance.toFixed(1)} Ω`;

  const color1 = RESISTOR_COLOR_MAP[b1]?.color || "#854d0e";
  const color2 = RESISTOR_COLOR_MAP[b2]?.color || "#dc2626";
  const color3 = RESISTOR_COLOR_MAP[String(mult)]?.color || "#eab308";
  const color4 = RESISTOR_COLOR_MAP[String(tol)]?.color || "#eab308";

  resultBox.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <div class="resistor-graphic-body">
        <div class="resistor-stripe" style="background:${color1}" title="Band 1: ${b1}"></div>
        <div class="resistor-stripe" style="background:${color2}" title="Band 2: ${b2}"></div>
        <div class="resistor-stripe" style="background:${color3}" title="Multiplier: ×${mult}"></div>
        <div class="resistor-stripe" style="background:${color4}" title="Tolerance: ±${tol}%"></div>
      </div>
      <div>
        <div style="font-size:18px;font-weight:900;color:var(--green)">${formattedR} ±${tol}%</div>
        <div style="font-size:11px;color:var(--muted)">Tolerance Range: ${minR.toFixed(1)} Ω to ${maxR.toFixed(1)} Ω</div>
      </div>
    </div>
  `;
}

/* ============================================================
   🎨 Fine Art, Painting & Color Studio
   ============================================================ */
function hexToHsl(hex) {
  let c = hex.replace("#", "");
  if (c.length === 3) c = c.split("").map(x => x + x).join("");
  const num = parseInt(c, 16);
  const r = (num >> 16) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h, s, l) {
  h = (h % 360 + 360) % 360;
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function matchPigmentName(h, s, l) {
  if (l < 15) return "Lamp Black / Ivory Black";
  if (l > 88 && s < 15) return "Titanium White";
  if (s < 15) return l > 50 ? "Payne's Gray Tint" : "Raw Umber / Neutral Gray";

  if (h >= 345 || h < 15) return l < 40 ? "Alizarin Crimson / Madder" : "Cadmium Red Medium";
  if (h >= 15 && h < 45) return s > 65 ? "Cadmium Orange" : "Burnt Sienna";
  if (h >= 45 && h < 65) return s > 60 ? "Cadmium Yellow Medium" : "Yellow Ochre / Raw Sienna";
  if (h >= 65 && h < 165) return l < 40 ? "Sap Green / Viridian" : "Phthalo Green (Yellow Shade)";
  if (h >= 165 && h < 205) return "Cerulean Blue / Cobalt Teal";
  if (h >= 205 && h < 255) return l < 35 ? "Prussian Blue / Indigo" : "Ultramarine Blue / Cobalt";
  if (h >= 255 && h < 295) return "Dioxazine Purple / Cobalt Violet";
  return "Quinacridone Magenta / Rose";
}

let currentArtPaletteHexes = [];

function updateArtPalette() {
  const picker = $("#tool-art-color-picker");
  const hexInput = $("#tool-art-hex");
  const harmony = $("#tool-art-harmony")?.value || "complementary";
  const resultContainer = $("#tool-art-palette-result");
  if (!resultContainer) return;

  const baseHex = hexInput?.value || picker?.value || "#d97706";
  const [h, s, l] = hexToHsl(baseHex);

  let hues = [];
  if (harmony === "complementary") {
    hues = [h, (h + 180) % 360, (h + 30) % 360, (h + 210) % 360];
  } else if (harmony === "analogous") {
    hues = [(h - 40 + 360) % 360, (h - 20 + 360) % 360, h, (h + 20) % 360, (h + 40) % 360];
  } else if (harmony === "triadic") {
    hues = [h, (h + 120) % 360, (h + 240) % 360];
  } else if (harmony === "split") {
    hues = [h, (h + 150) % 360, (h + 210) % 360, (h + 30) % 360];
  } else {
    hues = [h, h, h, h, h];
  }

  const palette = hues.map((hue, idx) => {
    let lig = l;
    let sat = s;
    if (harmony === "monochromatic") {
      lig = Math.max(15, Math.min(85, 20 + idx * 16));
    } else if (idx === 1 && harmony === "complementary") {
      lig = Math.max(25, Math.min(75, 100 - l));
    }
    const hex = hslToHex(hue, sat, lig);
    const pigment = matchPigmentName(hue, sat, lig);
    return { hex, pigment };
  });

  currentArtPaletteHexes = palette.map(p => p.hex.toUpperCase());

  resultContainer.innerHTML = `
    <div class="art-palette-grid">
      ${palette.map(p => `
        <div class="art-swatch">
          <div class="art-swatch-color" style="background:${p.hex}"></div>
          <div class="art-swatch-info">
            <div class="art-swatch-hex">${p.hex.toUpperCase()}</div>
            <div class="art-swatch-pigment">${p.pigment}</div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

async function copyArtPalette() {
  if (!currentArtPaletteHexes.length) return;
  const str = currentArtPaletteHexes.join(", ");
  try {
    await navigator.clipboard.writeText(str);
    showToast(`Copied ${currentArtPaletteHexes.length} palette colors to clipboard!`);
  } catch {
    showToast("Palette ready.");
  }
}

function updateGoldenRatioCalc() {
  const mode = $("#tool-art-dim-mode")?.value || "width";
  const val = parseFloat($("#tool-art-dim-val")?.value) || 20;
  const resultBox = $("#tool-art-golden-result");
  if (!resultBox) return;

  const PHI = 1.61803398875;
  const matched = mode === "width" ? (val / PHI) : (val * PHI);
  const matchedExpanded = mode === "width" ? (val * PHI) : (val / PHI);

  const third1 = (val / 3).toFixed(2);
  const third2 = (val * (2 / 3)).toFixed(2);

  resultBox.innerHTML = `
    <div style="font-size:14px;font-weight:700;color:var(--ink);margin-bottom:8px">
      🖼️ Golden Rectangle Dimensions (Φ = 1.618):
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:10px">
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px">
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase">Divine Proportion Size</div>
        <div style="font-size:18px;font-weight:800;color:var(--green);margin:2px 0">${mode === "width" ? `${val} × ${matched.toFixed(2)}` : `${matched.toFixed(2)} × ${val}`}</div>
        <div style="font-size:11px;color:var(--muted)">Alternate aspect: ${mode === "width" ? `${val} × ${matchedExpanded.toFixed(2)}` : `${matchedExpanded.toFixed(2)} × ${val}`}</div>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px">
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase">Rule of Thirds Grid Line</div>
        <div style="font-size:18px;font-weight:800;color:#0284c7;margin:2px 0">${third1} and ${third2}</div>
        <div style="font-size:11px;color:var(--muted)">Focal interest points along ${val} dimension</div>
      </div>
    </div>
  `;
}

/* ============================================================
   🎵 Music Production & Audio Studio
   ============================================================ */
let tapTempoHistory = [];

function tapTempo() {
  const now = Date.now();
  tapTempoHistory.push(now);
  if (tapTempoHistory.length > 5) tapTempoHistory.shift();

  // Visual pulse on beat indicator LED
  const leds = $$("#music-beat-indicator");
  leds.forEach(led => {
    led.classList.add("beat-flash");
    setTimeout(() => led.classList.remove("beat-flash"), 120);
  });

  // Auditory tap feedback
  const ctx = getMusicAudioCtx();
  if (ctx) {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.04);
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  if (tapTempoHistory.length >= 2) {
    const intervals = [];
    for (let i = 1; i < tapTempoHistory.length; i++) {
      intervals.push(tapTempoHistory[i] - tapTempoHistory[i - 1]);
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const computedBpm = Math.round(60000 / avgInterval);
    if (computedBpm >= 40 && computedBpm <= 260) {
      const bpmInputs = [$("#music-main-bpm"), $("#tool-music-bpm"), $("#music-view-timing-bpm")].filter(Boolean);
      bpmInputs.forEach(input => input.value = computedBpm);
      updateMusicTiming();
      updateMusicViewTimingResult();
      showToast(`🥁 Tempo detected: ${computedBpm} BPM`);
    }
  }
}

function updateMusicTiming() {
  const bpm = Math.max(20, Math.min(320, parseFloat($("#tool-music-bpm")?.value) || 120));
  const resultBox = $("#tool-music-timing-result");
  if (!resultBox) return;

  const qNoteMs = 60000 / bpm;

  const notes = [
    { label: "Whole Note (1/1)", ms: qNoteMs * 4 },
    { label: "Half Note (1/2)", ms: qNoteMs * 2 },
    { label: "Quarter Note (1/4)", ms: qNoteMs },
    { label: "Eighth Note (1/8)", ms: qNoteMs / 2 },
    { label: "Dotted 1/8 Note (1/8D · Rhythmic Delay)", ms: (qNoteMs / 2) * 1.5 },
    { label: "1/8 Triplet (1/8T)", ms: (qNoteMs / 2) * (2 / 3) },
    { label: "Sixteenth Note (1/16)", ms: qNoteMs / 4 },
    { label: "Dotted 1/16 Note (1/16D)", ms: (qNoteMs / 4) * 1.5 },
    { label: "Thirty-Second Note (1/32)", ms: qNoteMs / 8 }
  ];

  resultBox.innerHTML = `
    <table class="music-timing-table">
      <thead>
        <tr>
          <th>Note Value / Subdivision</th>
          <th>Delay Time (ms)</th>
          <th>LFO Rate (Hz)</th>
        </tr>
      </thead>
      <tbody>
        ${notes.map(n => `
          <tr>
            <td>${n.label}</td>
            <td><strong>${n.ms.toFixed(1)} ms</strong></td>
            <td>${(1000 / n.ms).toFixed(2)} Hz</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
    <div style="font-size:11px;color:var(--muted);margin-top:8px">
      💡 <strong>Reverb Pre-Delay Suggestion:</strong> ${(qNoteMs / 16).toFixed(1)} ms (1/64 note) to keep lead vocals and snares upfront before reverb bloom.
    </div>
  `;
}

const NOTE_SEMITONES_FROM_A4 = {
  "A1": -36, "C2": -33, "E2": -29, "C3": -21, "C4": -9, "E4": -5, "A4": 0, "A5": 12, "C6": 15
};

function updateMusicNoteView() {
  const note = $("#tool-music-note")?.value || "A4";
  const concert = parseFloat($("#tool-music-tuning")?.value) || 440;
  const resultBox = $("#tool-music-note-result");
  if (!resultBox) return;

  const semitones = NOTE_SEMITONES_FROM_A4[note] || 0;
  const freq = concert * Math.pow(2, semitones / 12);
  const wavelengthFeet = (1125 / freq).toFixed(2);
  const wavelengthMeters = (343 / freq).toFixed(2);
  const midiNumber = 69 + semitones;

  resultBox.innerHTML = `
    <div style="font-size:14px;font-weight:700;color:var(--ink);margin-bottom:8px">
      🎹 Note ${note} Frequency: <span style="font-size:20px;font-weight:900;color:var(--green)">${freq.toFixed(2)} Hz</span> (MIDI Note ${midiNumber})
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(170px, 1fr));gap:10px">
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px">
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase">Physical Wavelength in Air</div>
        <div style="font-size:18px;font-weight:800;color:#0284c7;margin:2px 0">${wavelengthFeet} ft (${wavelengthMeters} m)</div>
        <div style="font-size:11px;color:var(--muted)">1/4 wave bass trap depth: ~${(wavelengthFeet / 4).toFixed(1)} ft</div>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px">
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase">Tuning Pitch Reference</div>
        <div style="font-size:18px;font-weight:800;color:var(--ink);margin:2px 0">A4 = ${concert} Hz</div>
        <div style="font-size:11px;color:var(--muted)">${concert === 432 ? "Alternative Verdi tuning" : "International Standard (ISO 16)"}</div>
      </div>
    </div>
  `;
}

function updateMusicStretchCalc() {
  const srcBpm = Math.max(10, parseFloat($("#tool-music-src-bpm")?.value) || 95);
  const targetBpm = Math.max(10, parseFloat($("#tool-music-target-bpm")?.value) || 128);
  const resultBox = $("#tool-music-stretch-result");
  if (!resultBox) return;

  const ratio = targetBpm / srcBpm;
  const speedPct = (ratio * 100).toFixed(1);
  const semitones = (12 * Math.log2(ratio)).toFixed(2);
  const cents = Math.round(1200 * Math.log2(ratio));

  resultBox.innerHTML = `
    <div style="font-size:14px;font-weight:700;color:var(--ink);margin-bottom:8px">
      Sample Stretch from ${srcBpm} to ${targetBpm} BPM:
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(170px, 1fr));gap:10px">
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px">
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase">Speed / Playback Rate</div>
        <div style="font-size:20px;font-weight:800;color:var(--green);margin:2px 0">${speedPct}%</div>
        <div style="font-size:11px;color:var(--muted)">${ratio >= 1 ? `+${((ratio - 1) * 100).toFixed(1)}% faster` : `${((ratio - 1) * 100).toFixed(1)}% slower`}</div>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px">
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase">Pitch Shift (if unlinked)</div>
        <div style="font-size:20px;font-weight:800;color:#0284c7;margin:2px 0">${semitones >= 0 ? `+${semitones}` : semitones} semitones</div>
        <div style="font-size:11px;color:var(--muted)">(${cents >= 0 ? `+${cents}` : cents} cents pitch shift)</div>
      </div>
    </div>
  `;
}


/* ============================================================
   🧵 Pixel Art & Stitch Pattern Studio
   ============================================================ */
const STITCH_PALETTE = [
  { name: "Charcoal", hex: "#1e293b" },
  { name: "Pure White", hex: "#ffffff" },
  { name: "Crimson Red", hex: "#ef4444" },
  { name: "Golden Amber", hex: "#f59e0b" },
  { name: "Forest Green", hex: "#10b981" },
  { name: "Ocean Blue", hex: "#0284c7" },
  { name: "Violet Purple", hex: "#8b5cf6" },
  { name: "Dusty Rose", hex: "#f43f5e" }
];

const stitchStudioState = {
  cols: 16,
  rows: 16,
  activeColor: "#ef4444",
  activeTool: "pencil",
  grid: Array.from({ length: 16 * 16 }, () => "#ffffff"),
  isMouseDown: false,
  displayMode: "pixel",
  patternType: "flat"
};

const STITCH_PRESETS = {
  heart: [
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,0,
    0,0,1,1,1,1,1,0,1,1,1,1,1,0,0,0,
    0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,
    0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,
    0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,
    0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0,
    0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0,
    0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,
    0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,
    0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
  ],
  star: [
    0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,
    0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,
    0,0,0,0,0,1,0,1,1,0,1,0,0,0,0,0,
    0,0,0,0,1,0,0,1,1,0,0,1,0,0,0,0,
    0,0,1,1,0,0,0,1,1,0,0,0,1,1,0,0,
    0,1,0,0,0,0,1,1,1,1,0,0,0,0,1,0,
    0,1,1,0,0,1,1,1,1,1,1,0,0,1,1,0,
    1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
    1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
    0,1,1,0,0,1,1,1,1,1,1,0,0,1,1,0,
    0,1,0,0,0,0,1,1,1,1,0,0,0,0,1,0,
    0,0,1,1,0,0,0,1,1,0,0,0,1,1,0,0,
    0,0,0,0,1,0,0,1,1,0,0,1,0,0,0,0,
    0,0,0,0,0,1,0,1,1,0,1,0,0,0,0,0,
    0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,
    0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0
  ],
  snowflake: [
    0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,
    0,1,0,0,0,1,0,1,1,0,1,0,0,0,1,0,
    0,0,1,0,1,0,0,1,1,0,0,1,0,1,0,0,
    0,0,0,1,0,0,0,1,1,0,0,0,1,0,0,0,
    0,0,1,0,1,0,0,1,1,0,0,1,0,1,0,0,
    0,1,0,0,0,1,1,1,1,1,1,0,0,0,1,0,
    0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,
    1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
    1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
    0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,
    0,1,0,0,0,1,1,1,1,1,1,0,0,0,1,0,
    0,0,1,0,1,0,0,1,1,0,0,1,0,1,0,0,
    0,0,0,1,0,0,0,1,1,0,0,0,1,0,0,0,
    0,0,1,0,1,0,0,1,1,0,0,1,0,1,0,0,
    0,1,0,0,0,1,0,1,1,0,1,0,0,0,1,0,
    0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0
  ],
  invader: [
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,
    0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,
    0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,
    0,0,0,0,1,1,0,1,1,0,1,1,0,0,0,0,
    0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,
    0,0,0,1,0,1,1,1,1,1,1,0,1,0,0,0,
    0,0,0,1,0,1,0,0,0,0,1,0,1,0,0,0,
    0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,
    0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
  ],
  cat: [
    0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,
    1,1,1,0,0,0,0,0,0,0,0,0,0,1,1,1,
    1,0,1,1,0,0,0,0,0,0,0,0,1,1,0,1,
    1,0,0,1,1,1,1,1,1,1,1,1,1,0,0,1,
    1,0,0,1,1,1,1,1,1,1,1,1,1,0,0,1,
    0,1,1,1,0,1,1,1,1,1,1,0,1,1,1,0,
    0,0,1,1,0,1,1,1,1,1,1,0,1,1,0,0,
    0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,
    0,1,1,1,1,1,1,0,0,1,1,1,1,1,1,0,
    0,0,0,1,1,1,0,1,1,0,1,1,1,0,0,0,
    0,1,1,0,1,1,1,0,0,1,1,1,0,1,1,0,
    0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,
    0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,
    0,0,0,1,1,0,1,1,1,1,0,1,1,0,0,0,
    0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,
    0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0
  ],
  tree: [
    0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,
    0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,
    0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,
    0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,
    0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,
    0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,
    0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,
    0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,
    0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,
    0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,
    0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,
    0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,
    0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,
    0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,
    0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,
    0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0
  ],
  flower: [
    0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,
    0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,
    0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,
    0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,
    0,0,1,1,0,0,0,1,1,0,0,0,1,1,0,0,
    0,1,1,1,1,0,1,1,1,1,0,1,1,1,1,0,
    1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
    1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
    1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
    1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
    0,1,1,1,1,0,1,1,1,1,0,1,1,1,1,0,
    0,0,1,1,0,0,0,1,1,0,0,0,1,1,0,0,
    0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,
    0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,
    0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,
    0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0
  ],
  mug: [
    0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,
    0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,
    0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,
    0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,
    0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,
    0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,
    0,0,1,1,1,1,1,1,1,1,1,1,0,1,1,0,
    0,0,1,1,1,1,1,1,1,1,1,1,0,0,1,0,
    0,0,1,1,1,1,1,1,1,1,1,1,0,0,1,0,
    0,0,1,1,1,1,1,1,1,1,1,1,0,1,1,0,
    0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,
    0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,
    0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0,
    0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,0,
    0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
  ]
};

function renderStitchPalette() {
  const wraps = $$("#stitch-palette-wrap, #stitch-view-palette");
  if (!wraps.length) return;
  const html = STITCH_PALETTE.map(c => `
    <button type="button" class="stitch-palette-swatch ${c.hex.toLowerCase() === stitchStudioState.activeColor.toLowerCase() ? "active" : ""}" 
      data-action="select-stitch-color" 
      data-color="${c.hex}" 
      style="background:${c.hex}" 
      title="${c.name} (${c.hex})"></button>
  `).join("");
  wraps.forEach(w => w.innerHTML = html);
}

function resizeStitchMatrix(newCols, newRows) {
  newCols = Math.max(4, Math.min(64, parseInt(newCols, 10) || 16));
  newRows = Math.max(4, Math.min(64, parseInt(newRows, 10) || 16));
  const oldCols = stitchStudioState.cols || 16;
  const oldRows = stitchStudioState.rows || 16;
  const oldGrid = stitchStudioState.grid || [];

  if (oldCols === newCols && oldRows === newRows && oldGrid.length === newCols * newRows) return;

  const newGrid = Array.from({ length: newCols * newRows }, () => "#ffffff");
  const minR = Math.min(oldRows, newRows);
  const minC = Math.min(oldCols, newCols);

  for (let r = 0; r < minR; r++) {
    for (let c = 0; c < minC; c++) {
      newGrid[r * newCols + c] = oldGrid[r * oldCols + c] || "#ffffff";
    }
  }

  stitchStudioState.cols = newCols;
  stitchStudioState.rows = newRows;
  stitchStudioState.grid = newGrid;

  const colInput = $("#stitch-matrix-cols");
  const rowInput = $("#stitch-matrix-rows");
  if (colInput) colInput.value = newCols;
  if (rowInput) rowInput.value = newRows;

  const presetSel = $("#stitch-matrix-preset");
  if (presetSel) {
    const key = `${newCols}x${newRows}`;
    const matchingOption = Array.from(presetSel.options).find(o => o.value === key);
    presetSel.value = matchingOption ? key : "custom";
    const customWrap = $("#stitch-custom-dim-wrap");
    if (customWrap) customWrap.style.display = presetSel.value === "custom" ? "inline-flex" : "none";
  }

  renderStitchGrid();
  showToast(`Matrix resized to ${newCols} × ${newRows}`);
}

function flipStitchMatrixH() {
  const cols = stitchStudioState.cols || 16;
  const rows = stitchStudioState.rows || 16;
  const grid = stitchStudioState.grid;
  const newGrid = [...grid];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      newGrid[r * cols + c] = grid[r * cols + (cols - 1 - c)];
    }
  }
  stitchStudioState.grid = newGrid;
  renderStitchGrid();
  showToast("Flipped horizontally ↔");
}

function flipStitchMatrixV() {
  const cols = stitchStudioState.cols || 16;
  const rows = stitchStudioState.rows || 16;
  const grid = stitchStudioState.grid;
  const newGrid = [...grid];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      newGrid[r * cols + c] = grid[(rows - 1 - r) * cols + c];
    }
  }
  stitchStudioState.grid = newGrid;
  renderStitchGrid();
  showToast("Flipped vertically ↕");
}

function rotateStitchMatrix() {
  const cols = stitchStudioState.cols || 16;
  const rows = stitchStudioState.rows || 16;
  const grid = stitchStudioState.grid;
  const newCols = rows;
  const newRows = cols;
  const newGrid = Array.from({ length: newCols * newRows }, () => "#ffffff");
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      newGrid[c * newCols + (rows - 1 - r)] = grid[r * cols + c];
    }
  }
  stitchStudioState.cols = newCols;
  stitchStudioState.rows = newRows;
  stitchStudioState.grid = newGrid;

  const colInput = $("#stitch-matrix-cols");
  const rowInput = $("#stitch-matrix-rows");
  if (colInput) colInput.value = newCols;
  if (rowInput) rowInput.value = newRows;

  const presetSel = $("#stitch-matrix-preset");
  if (presetSel) {
    const key = `${newCols}x${newRows}`;
    const matchingOption = Array.from(presetSel.options).find(o => o.value === key);
    presetSel.value = matchingOption ? key : "custom";
    const customWrap = $("#stitch-custom-dim-wrap");
    if (customWrap) customWrap.style.display = presetSel.value === "custom" ? "inline-flex" : "none";
  }

  renderStitchGrid();
  showToast("Rotated 90° clockwise ↶");
}

function shiftStitchMatrix(dir) {
  const cols = stitchStudioState.cols || 16;
  const rows = stitchStudioState.rows || 16;
  const grid = stitchStudioState.grid;
  const newGrid = Array.from({ length: cols * rows }, () => "#ffffff");

  let dr = 0;
  let dc = 0;
  if (dir === "up") dr = -1;
  else if (dir === "down") dr = 1;
  else if (dir === "left") dc = -1;
  else if (dir === "right") dc = 1;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        newGrid[nr * cols + nc] = grid[r * cols + c];
      }
    }
  }
  stitchStudioState.grid = newGrid;
  renderStitchGrid();
}

function invertStitchMatrix() {
  const color = stitchStudioState.activeColor || "#ef4444";
  stitchStudioState.grid = stitchStudioState.grid.map(c => (c === "#ffffff" ? color : "#ffffff"));
  renderStitchGrid();
  showToast("Colors inverted ◑");
}

function renderStitchGrid() {
  const boards = $$("#stitch-grid-board, #stitch-view-board");
  if (!boards.length) return;
  const cols = stitchStudioState.cols || 16;
  const rows = stitchStudioState.rows || 16;
  const showSymbols = $("#stitch-show-symbols")?.checked || $("#stitch-view-symbols")?.checked;
  const displayMode = stitchStudioState.displayMode || "pixel";

  let cellW = 20;
  let cellH = 20;
  if (displayMode === "knit") {
    cellW = cols > 24 ? 18 : 22;
    cellH = cols > 24 ? 14 : 17;
  } else if (cols > 32 || rows > 32) {
    cellW = 12;
    cellH = 12;
  } else if (cols > 24 || rows > 24) {
    cellW = 15;
    cellH = 15;
  } else if (cols > 18 || rows > 18) {
    cellW = 18;
    cellH = 18;
  }

  boards.forEach(b => {
    b.style.display = "grid";
    b.style.gridTemplateColumns = `repeat(${cols}, ${cellW}px)`;
    b.style.gridTemplateRows = `repeat(${rows}, ${cellH}px)`;
  });

  const total = cols * rows;
  if (stitchStudioState.grid.length !== total) {
    const oldGrid = stitchStudioState.grid;
    const newGrid = Array.from({ length: total }, () => "#ffffff");
    for (let i = 0; i < Math.min(oldGrid.length, total); i++) {
      newGrid[i] = oldGrid[i];
    }
    stitchStudioState.grid = newGrid;
  }

  const html = stitchStudioState.grid.map((color, idx) => {
    const isDark = color !== "#ffffff";
    let symbol = "";
    if (showSymbols && isDark) {
      if (displayMode === "knit") symbol = "∨";
      else if (displayMode === "cross") symbol = "×";
      else symbol = "•";
    }
    const textColor = (color === '#ffffff' || color === '#f59e0b' || color === '#fbbf24') ? '#0f172a' : '#ffffff';
    return `
      <div class="stitch-grid-cell ${displayMode === 'knit' ? 'knit-cell' : ''}" 
        data-action="paint-stitch-cell" 
        data-index="${idx}" 
        style="width:${cellW}px;height:${cellH}px;background:${color};color:${textColor};font-size:${Math.max(8, Math.round(cellH * 0.55))}px">
        ${symbol}
      </div>
    `;
  }).join("");

  boards.forEach(b => b.innerHTML = html);
  updateStitchInstructions();
  initStitchBoardInteraction();
}

function applyStitchTool(idx) {
  const cols = stitchStudioState.cols || 16;
  const rows = stitchStudioState.rows || 16;
  const total = cols * rows;
  if (idx < 0 || idx >= total) return;
  const tool = stitchStudioState.activeTool;
  const curColor = stitchStudioState.grid[idx];
  if (tool === "eraser") {
    if (curColor === "#ffffff") return;
    stitchStudioState.grid[idx] = "#ffffff";
  } else if (tool === "pencil") {
    if (curColor.toLowerCase() === stitchStudioState.activeColor.toLowerCase()) return;
    stitchStudioState.grid[idx] = stitchStudioState.activeColor;
  } else if (tool === "fill") {
    const targetColor = stitchStudioState.grid[idx];
    const fillColor = stitchStudioState.activeColor;
    if (targetColor.toLowerCase() === fillColor.toLowerCase()) return;
    const queue = [idx];
    const visited = new Set();
    while (queue.length > 0) {
      const curr = queue.pop();
      if (visited.has(curr)) continue;
      visited.add(curr);
      if (stitchStudioState.grid[curr] === targetColor) {
        stitchStudioState.grid[curr] = fillColor;
        const r = Math.floor(curr / cols);
        const c = curr % cols;
        if (r > 0) queue.push((r - 1) * cols + c);
        if (r < rows - 1) queue.push((r + 1) * cols + c);
        if (c > 0) queue.push(r * cols + (c - 1));
        if (c < cols - 1) queue.push(r * cols + (c + 1));
      }
    }
  }
  renderStitchGrid();
}

function updateStitchInstructions() {
  const boxes = $$("#stitch-instructions-box, #stitch-view-instructions");
  if (!boxes.length) return;
  const cols = stitchStudioState.cols || 16;
  const rows = stitchStudioState.rows || 16;
  const patternType = stitchStudioState.patternType || "flat";
  const displayMode = stitchStudioState.displayMode || "pixel";
  const craftName = displayMode === "knit" ? "Knit" : displayMode === "cross" ? "Cross-Stitch" : "Colorwork";
  const lines = [
    `// Chart Size: ${cols} cols × ${rows} rows (${craftName}) · Reading Mode: ${patternType === "round" ? "In the Round (all RS)" : "Flat (alternating RS/WS)"}`
  ];

  for (let r = 0; r < rows; r++) {
    const isRS = (r % 2 === 0);
    const label = patternType === "round" 
      ? `Rnd ${r + 1}` 
      : `Row ${r + 1} (${isRS ? "RS →" : "WS ←"})`;

    const rowCells = stitchStudioState.grid.slice(r * cols, (r + 1) * cols);
    const cellsToRead = (patternType === "flat" && !isRS) ? [...rowCells].reverse() : rowCells;

    const groups = [];
    let curColor = cellsToRead[0];
    let curCount = 1;
    for (let c = 1; c < cols; c++) {
      if (cellsToRead[c] === curColor) {
        curCount++;
      } else {
        const name = STITCH_PALETTE.find(p => p.hex.toLowerCase() === curColor.toLowerCase())?.name || (curColor === "#ffffff" ? "Background" : curColor);
        groups.push(`${curCount} ${name}`);
        curColor = cellsToRead[c];
        curCount = 1;
      }
    }
    const name = STITCH_PALETTE.find(p => p.hex.toLowerCase() === curColor.toLowerCase())?.name || (curColor === "#ffffff" ? "Background" : curColor);
    groups.push(`${curCount} ${name}`);
    lines.push(`${label}: ${groups.join(", ")}`);
  }
  const text = lines.join("\n");
  boxes.forEach(b => b.textContent = text);
}

function loadStitchPreset(presetKey) {
  const p = STITCH_PRESETS[presetKey];
  if (!p) return;
  const color = stitchStudioState.activeColor;
  let cols = stitchStudioState.cols || 16;
  let rows = stitchStudioState.rows || 16;

  if (cols < 16 || rows < 16) {
    cols = Math.max(cols, 16);
    rows = Math.max(rows, 16);
    stitchStudioState.cols = cols;
    stitchStudioState.rows = rows;
    const colInput = $("#stitch-matrix-cols");
    const rowInput = $("#stitch-matrix-rows");
    if (colInput) colInput.value = cols;
    if (rowInput) rowInput.value = rows;
  }

  const offsetR = Math.floor((rows - 16) / 2);
  const offsetC = Math.floor((cols - 16) / 2);
  const newGrid = Array.from({ length: cols * rows }, () => "#ffffff");

  for (let r = 0; r < 16; r++) {
    for (let c = 0; c < 16; c++) {
      if (p[r * 16 + c] === 1) {
        newGrid[(r + offsetR) * cols + (c + offsetC)] = color;
      }
    }
  }

  stitchStudioState.grid = newGrid;
  renderStitchGrid();
}

function updatePixelArtView() {
  renderStitchPalette();
  renderStitchGrid();
  initStitchBoardInteraction();
}

function initStitchBoardInteraction() {
  const boards = $$("#stitch-grid-board, #stitch-view-board");
  if (!boards.length) return;

  if (!window._stitchListenersAttached) {
    window._stitchListenersAttached = true;
    window.addEventListener("mouseup", () => {
      if (typeof stitchStudioState !== "undefined") {
        stitchStudioState.isMouseDown = false;
      }
    });
    window.addEventListener("pointerup", () => {
      if (typeof stitchStudioState !== "undefined") {
        stitchStudioState.isMouseDown = false;
      }
    });
    window.addEventListener("blur", () => {
      if (typeof stitchStudioState !== "undefined") {
        stitchStudioState.isMouseDown = false;
      }
    });
  }

  boards.forEach(board => {
    if (board.dataset.stitchEventsInitialized) return;
    board.dataset.stitchEventsInitialized = "true";

    board.addEventListener("dragstart", (e) => e.preventDefault());

    board.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      if (typeof stitchStudioState !== "undefined") {
        stitchStudioState.isMouseDown = true;
        const cell = e.target.closest(".stitch-grid-cell");
        if (cell && typeof applyStitchTool === "function") {
          applyStitchTool(parseInt(cell.dataset.index, 10));
        }
      }
    });

    board.addEventListener("mouseover", (e) => {
      if (typeof stitchStudioState === "undefined") return;
      if (!stitchStudioState.isMouseDown || (e.buttons !== undefined && e.buttons !== 1)) {
        stitchStudioState.isMouseDown = false;
        return;
      }
      if (stitchStudioState.activeTool === "fill") return;
      const cell = e.target.closest(".stitch-grid-cell");
      if (cell && typeof applyStitchTool === "function") {
        applyStitchTool(parseInt(cell.dataset.index, 10));
      }
    });

    board.addEventListener("mouseleave", (e) => {
      if (typeof stitchStudioState !== "undefined" && e.buttons !== 1) {
        stitchStudioState.isMouseDown = false;
      }
    });

    board.addEventListener("touchstart", (e) => {
      if (typeof stitchStudioState === "undefined") return;
      stitchStudioState.isMouseDown = true;
      const touch = e.touches[0];
      if (!touch) return;
      const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
      const cell = targetEl?.closest(".stitch-grid-cell");
      if (cell && typeof applyStitchTool === "function") {
        applyStitchTool(parseInt(cell.dataset.index, 10));
      }
    }, { passive: true });

    board.addEventListener("touchmove", (e) => {
      if (typeof stitchStudioState === "undefined" || !stitchStudioState.isMouseDown) return;
      if (e.cancelable) e.preventDefault();
      if (stitchStudioState.activeTool === "fill") return;
      const touch = e.touches[0];
      if (!touch) return;
      const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
      const cell = targetEl?.closest(".stitch-grid-cell");
      if (cell && typeof applyStitchTool === "function") {
        applyStitchTool(parseInt(cell.dataset.index, 10));
      }
    }, { passive: false });

    board.addEventListener("touchend", () => {
      if (typeof stitchStudioState !== "undefined") {
        stitchStudioState.isMouseDown = false;
      }
    });

    board.addEventListener("touchcancel", () => {
      if (typeof stitchStudioState !== "undefined") {
        stitchStudioState.isMouseDown = false;
      }
    });
  });
}

/* ============================================================
   📦 Papercraft & Packaging Studio
   ============================================================ */
function updatePapercraftView() {
  const gsmInput = $("#tool-paper-gsm");
  const gsm = parseFloat(gsmInput?.value) || 120;

  const textLb = (gsm / 1.48).toFixed(1);
  const coverLb = (gsm / 2.707).toFixed(1);
  const pt = (gsm * 0.054).toFixed(1);
  const mm = (pt * 0.0254).toFixed(3);

  const paperResult = $("#tool-paper-result");
  if (paperResult) {
    paperResult.innerHTML = `
      <div style="font-size:13px;font-weight:700;color:var(--ink);margin-bottom:6px">
        Paper Weight Conversions for <strong>${gsm} GSM</strong>:
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:8px">
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:8px">
          <div style="font-size:10px;font-weight:700;color:var(--muted)">TEXT / BOOK WEIGHT</div>
          <div style="font-size:18px;font-weight:800;color:var(--green)">${textLb} lb</div>
          <div style="font-size:10px;color:var(--muted)">Brochures, flyleaves, flyers</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:8px">
          <div style="font-size:10px;font-weight:700;color:var(--muted)">COVER / CARDSTOCK</div>
          <div style="font-size:18px;font-weight:800;color:#0284c7">${coverLb} lb</div>
          <div style="font-size:10px;color:var(--muted)">Postcards, packaging, covers</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:8px">
          <div style="font-size:10px;font-weight:700;color:var(--muted)">CALIPER THICKNESS</div>
          <div style="font-size:18px;font-weight:800;color:var(--ink)">${pt} pt (${mm} mm)</div>
          <div style="font-size:10px;color:var(--muted)">Estimated bulk caliper</div>
        </div>
      </div>
    `;
  }

  const L = parseFloat($("#tool-box-length")?.value) || 6;
  const W = parseFloat($("#tool-box-width")?.value) || 4;
  const D = parseFloat($("#tool-box-depth")?.value) || 2;
  const clearance = parseFloat($("#tool-box-clearance")?.value) || 0.0625;

  const totalLength = L + 2 * D;
  const totalWidth = W + 2 * D;

  const lidL = L + clearance;
  const lidW = W + clearance;
  const lidD = D * 0.6;
  const totalLidLength = (lidL + 2 * lidD).toFixed(2);
  const totalLidWidth = (lidW + 2 * lidD).toFixed(2);

  const boxResult = $("#tool-box-net-result");
  if (boxResult) {
    boxResult.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px;margin-bottom:12px">
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px">
          <div style="font-size:11px;font-weight:700;color:var(--muted)">BASE TRAY BLANK SHEET</div>
          <div style="font-size:20px;font-weight:800;color:var(--green)">${totalLength.toFixed(2)}" × ${totalWidth.toFixed(2)}"</div>
          <div style="font-size:11px;color:var(--muted)">Score lines inset by ${D}" on all 4 borders</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px">
          <div style="font-size:11px;font-weight:700;color:var(--muted)">LID BLANK SHEET</div>
          <div style="font-size:20px;font-weight:800;color:#0284c7">${totalLidLength}" × ${totalLidWidth}"</div>
          <div style="font-size:11px;color:var(--muted)">Lid height: ${lidD.toFixed(2)}" · +${clearance}" slip fit</div>
        </div>
      </div>
      <div style="text-align:center">
        <svg viewBox="0 0 400 280" class="box-net-svg">
          <rect x="50" y="30" width="300" height="220" fill="none" stroke="#0284c7" stroke-width="2"/>
          <rect x="110" y="70" width="180" height="140" fill="rgba(34,197,94,0.08)" stroke="#22c55e" stroke-width="2" stroke-dasharray="6,4"/>
          <line x1="110" y1="30" x2="110" y2="70" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="3,3"/>
          <line x1="290" y1="30" x2="290" y2="70" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="3,3"/>
          <line x1="110" y1="210" x2="110" y2="250" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="3,3"/>
          <line x1="290" y1="210" x2="290" y2="250" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="3,3"/>
          <text x="200" y="145" text-anchor="middle" font-size="12" font-weight="bold" fill="var(--ink)">Base Tray (${L}" × ${W}")</text>
          <text x="200" y="55" text-anchor="middle" font-size="10" fill="var(--muted)">Depth ${D}"</text>
          <text x="200" y="235" text-anchor="middle" font-size="10" fill="var(--muted)">Depth ${D}"</text>
          <text x="75" y="145" text-anchor="middle" font-size="10" fill="var(--muted)">${D}"</text>
          <text x="325" y="145" text-anchor="middle" font-size="10" fill="var(--muted)">${D}"</text>
        </svg>
        <div style="font-size:11px;color:var(--muted);margin-top:6px">
          Legend: <span style="color:#0284c7">― Outer Cut</span> · <span style="color:#22c55e">--- Score / Crease</span> · <span style="color:#ef4444">··· Corner Notch</span>
        </div>
      </div>
    `;
  }
}

/* ============================================================
   🖨️ 3D Printing & Laser Fabrication Studio
   ============================================================ */
const LASER_DATABASE = {
  plywood: { name: "1/8\" Baltic Birch Plywood", power: "65%", speed: "18 mm/s", passes: 1, air: "High Air Assist" },
  acrylic: { name: "1/8\" Cast Acrylic", power: "75%", speed: "12 mm/s", passes: 1, air: "Gentle Air (avoid frosting)" },
  leather: { name: "2mm Veg-Tan Leather", power: "45%", speed: "24 mm/s", passes: 1, air: "Medium Air Assist" },
  cardboard: { name: "Corrugated Cardboard", power: "30%", speed: "35 mm/s", passes: 1, air: "High Air Assist (fire watch)" },
  mdf: { name: "1/4\" MDF Draftboard", power: "90%", speed: "8 mm/s", passes: 2, air: "High Air Assist" }
};

function updateFabricationView() {
  const grams = parseFloat($("#tool-print-weight")?.value) || 65;
  const spoolCost = parseFloat($("#tool-print-spool-cost")?.value) || 22;
  const hours = parseFloat($("#tool-print-hours")?.value) || 3.5;
  const watts = parseFloat($("#tool-print-watts")?.value) || 120;
  const kwhRate = 0.16;

  const materialCost = (grams / 1000) * spoolCost;
  const electricityKwh = (watts * hours) / 1000;
  const electricityCost = electricityKwh * kwhRate;
  const totalCost = materialCost + electricityCost;

  const printResult = $("#tool-print-result");
  if (printResult) {
    printResult.innerHTML = `
      <div style="font-size:13px;font-weight:700;color:var(--ink);margin-bottom:6px">
        Production Cost: <span style="font-size:18px;font-weight:900;color:var(--green)">${totalCost.toFixed(2)}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:6px">
          <div style="font-size:10px;color:var(--muted)">PLASTIC MATERIAL</div>
          <div style="font-size:14px;font-weight:800;color:var(--ink)">${materialCost.toFixed(2)}</div>
          <div style="font-size:10px;color:var(--muted)">${grams}g @ ${spoolCost}/kg</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:6px">
          <div style="font-size:10px;color:var(--muted)">ELECTRIC POWER</div>
          <div style="font-size:14px;font-weight:800;color:#0284c7">${electricityCost.toFixed(2)}</div>
          <div style="font-size:10px;color:var(--muted)">${electricityKwh.toFixed(2)} kWh consumed</div>
        </div>
      </div>
    `;
  }

  const matKey = $("#tool-laser-material")?.value || "plywood";
  const laserInfo = LASER_DATABASE[matKey] || LASER_DATABASE.plywood;
  const spot = parseFloat($("#tool-laser-spot")?.value) || 0.15;
  const kerfRadius = spot / 2;

  const laserResult = $("#tool-laser-result");
  if (laserResult) {
    laserResult.innerHTML = `
      <div style="font-size:13px;font-weight:700;color:var(--ink);margin-bottom:6px">
        Parameters for <strong>${laserInfo.name}</strong>:
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:6px">
          <div style="font-size:10px;color:var(--muted)">CUT POWER / SPEED</div>
          <div style="font-size:14px;font-weight:800;color:var(--green)">${laserInfo.power} · ${laserInfo.speed}</div>
          <div style="font-size:10px;color:var(--muted)">Passes: ${laserInfo.passes}</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:6px">
          <div style="font-size:10px;color:var(--muted)">KERF OFFSET COMP</div>
          <div style="font-size:14px;font-weight:800;color:#0284c7">+${kerfRadius.toFixed(3)} mm</div>
          <div style="font-size:10px;color:var(--muted)">Spot dia: ${spot} mm</div>
        </div>
      </div>
      <div style="font-size:11px;color:var(--muted)">
        💨 <strong>Assist:</strong> ${laserInfo.air} · To maintain press fit tab joints, expand outside geometry by +${kerfRadius.toFixed(3)}mm and shrink holes by -${kerfRadius.toFixed(3)}mm.
      </div>
    `;
  }
}

/* ============================================================
   🔊 Web Audio Engine & Pitch Synthesis
   ============================================================ */
let musicAudioCtx = null;


function createWavBlobBuffer(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const numSamples = audioBuffer.length;
  const dataByteCount = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataByteCount);
  const view = new DataView(buffer);

  function writeString(offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataByteCount, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, "data");
  view.setUint32(40, dataByteCount, true);

  let offset = 44;
  const channels = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(audioBuffer.getChannelData(c));
  }
  for (let i = 0; i < numSamples; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }
  return buffer;
}

function getMusicAudioCtx() {
  if (!musicAudioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    musicAudioCtx = new AudioCtx();
  }
  if (musicAudioCtx.state === "suspended") {
    void musicAudioCtx.resume();
  }
  return musicAudioCtx;
}

function playNoteTone(freq, duration = 1.0) {
  const ctx = getMusicAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.3, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.05);
}

function playPitchToneAction() {
  const note = $("#tool-music-note")?.value || "A4";
  const concert = parseFloat($("#tool-music-tuning")?.value) || 440;
  const semitones = NOTE_SEMITONES_FROM_A4[note] || 0;
  const freq = concert * Math.pow(2, semitones / 12);
  playNoteTone(freq, 1.2);
  showToast(`🎵 Playing ${note} tone (${freq.toFixed(1)} Hz)`);
}

/* ============================================================
   🎹 Chord Progressions & 16-Step Drum Machine Studio
   ============================================================ */
const DIATONIC_KEYS_DB = {
  "C": {
    name: "C Major",
    chords: ["C", "Dm", "Em", "F", "G", "Am", "Bdim"],
    degrees: ["I", "ii", "iii", "IV", "V", "vi", "vii°"],
    extra: ["Cmaj7", "Dm7", "Em7", "Fmaj7", "G7", "Am7"]
  },
  "G": {
    name: "G Major",
    chords: ["G", "Am", "Bm", "C", "D", "Em", "F#dim"],
    degrees: ["I", "ii", "iii", "IV", "V", "vi", "vii°"],
    extra: ["Gmaj7", "Am7", "Bm7", "Cmaj7", "D7", "Em7"]
  },
  "D": {
    name: "D Major",
    chords: ["D", "Em", "F#m", "G", "A", "Bm", "C#dim"],
    degrees: ["I", "ii", "iii", "IV", "V", "vi", "vii°"],
    extra: ["Dmaj7", "Em7", "F#m7", "Gmaj7", "A7", "Bm7"]
  },
  "A": {
    name: "A Major",
    chords: ["A", "Bm", "C#m", "D", "E", "F#m", "G#dim"],
    degrees: ["I", "ii", "iii", "IV", "V", "vi", "vii°"],
    extra: ["Amaj7", "Bm7", "C#m7", "Dmaj7", "E7", "F#m7"]
  },
  "F": {
    name: "F Major",
    chords: ["F", "Gm", "Am", "Bb", "C", "Dm", "Edim"],
    degrees: ["I", "ii", "iii", "IV", "V", "vi", "vii°"],
    extra: ["Fmaj7", "Gm7", "Am7", "Bbmaj7", "C7", "Dm7"]
  },
  "Am": {
    name: "A Minor",
    chords: ["Am", "Bdim", "C", "Dm", "Em", "F", "G"],
    degrees: ["i", "ii°", "III", "iv", "v", "VI", "VII"],
    extra: ["Am7", "Cmaj7", "Dm7", "Em7", "Fmaj7", "E7"]
  },
  "Em": {
    name: "E Minor",
    chords: ["Em", "F#dim", "G", "Am", "Bm", "C", "D"],
    degrees: ["i", "ii°", "III", "iv", "v", "VI", "VII"],
    extra: ["Em7", "Gmaj7", "Am7", "Bm7", "Cmaj7", "B7"]
  },
  "Dm": {
    name: "D Minor",
    chords: ["Dm", "Edim", "F", "Gm", "Am", "Bb", "C"],
    degrees: ["i", "ii°", "III", "iv", "v", "VI", "VII"],
    extra: ["Dm7", "Fmaj7", "Gm7", "Am7", "Bbmaj7", "A7"]
  }
};

const CHORD_PROGRESSION_PRESETS = {
  pop: { name: "Pop 4-Chord", degrees: ["I", "V", "vi", "IV"] },
  ballad: { name: "Emotional Sad", degrees: ["vi", "IV", "I", "V"] },
  doowop: { name: "50s Doo-Wop", degrees: ["I", "vi", "IV", "V"] },
  jazz: { name: "Jazz Turnaround", degrees: ["ii", "V", "I", "vi"] },
  rock: { name: "Classic Rock", degrees: ["I", "IV", "V", "IV"] },
  flamenco: { name: "Andalusian Descent", degrees: ["vi", "V", "IV", "III"] },
  rnb: { name: "Neo-Soul / R&B", degrees: ["IV", "iii", "vi", "I"] }
};

const DRUM_BEAT_PRESETS = {
  rock: {
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    clap: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  },
  fourfloor: {
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    clap: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]
  },
  boombap: {
    kick: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    clap: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  },
  trap: {
    kick: [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    hat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    clap: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0]
  },
  lofi: {
    kick: [1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    clap: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]
  },
  clear: {
    kick: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    hat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    clap: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  }
};

const chordStudioState = {
  key: "C",
  bpm: 105,
  slots: [
    { chord: "C", degree: "I" },
    { chord: "G", degree: "V" },
    { chord: "Am", degree: "vi" },
    { chord: "F", degree: "IV" }
  ],
  selectedSlotIndex: 0
};

const drumGridState = {
  kick: [...DRUM_BEAT_PRESETS.rock.kick],
  snare: [...DRUM_BEAT_PRESETS.rock.snare],
  hat: [...DRUM_BEAT_PRESETS.rock.hat],
  clap: [...DRUM_BEAT_PRESETS.rock.clap]
};

const musicPlaybackState = {
  isPlaying: false,
  playMode: "both",
  chordsMuted: false,
  drumsMuted: false,
  metronomeMuted: true,
  bpm: 105,
  stepIndex: 0,
  intervalId: null
};

const CHORD_ROOT_OFFSETS = {
  "C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3,
  "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8,
  "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11
};

function getChordVoicingFrequencies(chordName) {
  const match = chordName.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return [261.63, 329.63, 392.00];
  const root = match[1];
  const quality = match[2];
  const rootOffset = CHORD_ROOT_OFFSETS[root] ?? 0; 
  let intervals = [0, 4, 7];
  if (quality === "m" || quality === "min") intervals = [0, 3, 7];
  else if (quality === "dim" || quality === "°") intervals = [0, 3, 6];
  else if (quality === "aug" || quality === "+") intervals = [0, 4, 8];
  else if (quality === "7" || quality === "dom7") intervals = [0, 4, 7, 10];
  else if (quality === "maj7" || quality === "M7") intervals = [0, 4, 7, 11];
  else if (quality === "m7" || quality === "min7") intervals = [0, 3, 7, 10];
  else if (quality === "sus4") intervals = [0, 5, 7];
  else if (quality === "sus2") intervals = [0, 2, 7];
  const bassMidi = 36 + rootOffset;
  const chordMidis = intervals.map(semitone => 60 + rootOffset + semitone);
  return [bassMidi, ...chordMidis].map(m => 440 * Math.pow(2, (m - 69) / 12));
}

function playChordVoicing(chordName, duration = 1.4) {
  const ctx = getMusicAudioCtx();
  if (!ctx) return;
  highlightPianoKeysForChord(chordName, duration);
  const freqs = getChordVoicingFrequencies(chordName);
  const now = ctx.currentTime;
  const instrument = $("#music-main-instrument")?.value || localStorage.getItem("workbench_music_instrument") || "rhodes";
  const gainPerVoice = 0.28 / freqs.length;

  if (instrument === "rhodes") {
    // 🎹 Rhodes Electric Piano: Sine bass + triangle body + metallic chime tine overtone
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? "sine" : "triangle";
      osc.frequency.setValueAtTime(freq, now);
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(idx === 0 ? 350 : 2400, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(gainPerVoice, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.05);

      if (idx > 0) {
        const tine = ctx.createOscillator();
        const tineGain = ctx.createGain();
        tine.type = "sine";
        tine.frequency.setValueAtTime(freq * 3.5, now);
        tineGain.gain.setValueAtTime(0.0001, now);
        tineGain.gain.linearRampToValueAtTime(gainPerVoice * 0.26, now + 0.01);
        tineGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
        tine.connect(tineGain);
        tineGain.connect(ctx.destination);
        tine.start(now);
        tine.stop(now + 0.4);
      }
    });
  } else if (instrument === "pad") {
    // 🌊 Warm Analog Pad: Dual detuned sawtooths + swept lowpass + slow swell attack
    freqs.forEach((freq, idx) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc1.type = idx === 0 ? "triangle" : "sawtooth";
      osc2.type = idx === 0 ? "sine" : "sawtooth";
      osc1.frequency.setValueAtTime(freq * 0.997, now);
      osc2.frequency.setValueAtTime(freq * 1.003, now);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(idx === 0 ? 250 : 380, now);
      filter.frequency.exponentialRampToValueAtTime(idx === 0 ? 400 : 1800, now + 0.45);
      filter.frequency.exponentialRampToValueAtTime(idx === 0 ? 250 : 600, now + duration);
      filter.Q.setValueAtTime(2.2, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(gainPerVoice * 0.55, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration + 0.1);
      osc2.stop(now + duration + 0.1);
    });
  } else if (instrument === "chiptune") {
    // 👾 8-Bit Chiptune: Pure square waves + snappy 8-bit NES decay
    freqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, now);
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(4500, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(gainPerVoice * 0.75, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, now + Math.min(duration, 0.95));
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.05);
    });
  } else if (instrument === "organ") {
    // ⛪ Cathedral / Tonewheel Organ: Additive sine harmonics (1f fundamental, 2f octave, 3f fifth)
    freqs.forEach((freq, idx) => {
      const harmonics = idx === 0 ? [1.0] : [1.0, 2.0, 3.0];
      harmonics.forEach((mult, hIdx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq * mult, now);
        const amp = (gainPerVoice * 0.55) / (hIdx + 1);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(amp, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + duration + 0.05);
      });
    });
  }
}

function playDrumSound(type) {
  const ctx = getMusicAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  if (type === "kick") {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.09);
    gain.gain.setValueAtTime(0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  } else if (type === "snare") {
    const bufferSize = Math.floor(ctx.sampleRate * 0.2);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(900, now);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.06);
    oscGain.gain.setValueAtTime(0.4, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    whiteNoise.start(now);
    whiteNoise.stop(now + 0.2);
    osc.start(now);
    osc.stop(now + 0.12);
  } else if (type === "hat") {
    const bufferSize = Math.floor(ctx.sampleRate * 0.06);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(7500, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    whiteNoise.start(now);
    whiteNoise.stop(now + 0.06);
  } else if (type === "clap") {
    const bufferSize = Math.floor(ctx.sampleRate * 0.2);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
    [0, 0.012, 0.024].forEach((delay, burstIdx) => {
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1200, now + delay);
      filter.Q.setValueAtTime(3, now + delay);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(burstIdx === 2 ? 0.6 : 0.35, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.12);
      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      whiteNoise.start(now + delay);
      whiteNoise.stop(now + delay + 0.15);
    });
  }
}

function playDrumClick(isFirstBeat = false) {
  const ctx = getMusicAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.setValueAtTime(isFirstBeat ? 1000 : 700, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.35, now + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.04);
}

function hitLiveDrumPad(drum) {
  playDrumSound(drum);
  const pads = document.querySelectorAll(`.live-drum-pad.pad-${drum}`);
  pads.forEach(pad => {
    pad.classList.add("hit");
    setTimeout(() => pad.classList.remove("hit"), 140);
  });
}


async function exportGrooveWav() {
  const AudioContextClass = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!AudioContextClass) {
    showToast("Audio export not supported in this browser.");
    return;
  }

  const bpm = chordStudioState.bpm || musicPlaybackState.bpm || 105;
  const sampleRate = 44100;
  const stepSec = (60 / bpm) / 4;
  const totalSteps = chordStudioState.slots.length * 16;
  const totalDuration = totalSteps * stepSec + 1.2;

  const offlineCtx = new AudioContextClass(2, Math.ceil(totalDuration * sampleRate), sampleRate);
  showToast("Synthesizing 4-bar groove audio WAV...");

  const swingPct = (parseFloat($("#music-main-swing")?.value) || 0) / 100;
  const instrument = $("#music-main-instrument")?.value || "rhodes";

  for (let step = 0; step < totalSteps; step++) {
    const bar = Math.floor(step / 16);
    const drumStep = step % 16;
    const isOdd = (step % 2) === 1;
    const swingOffset = isOdd ? stepSec * swingPct * 0.38 : 0;
    const stepTime = step * stepSec + swingOffset;

    if (drumStep === 0) {
      const slot = chordStudioState.slots[bar];
      if (slot) {
        const freqs = getChordVoicingFrequencies(slot.chord);
        const gainPerVoice = 0.28 / freqs.length;
        const chordDur = Math.min((60 / bpm) * 3.8, 2.4);

        if (instrument === "organ") {
          freqs.forEach((freq, idx) => {
            const harmonics = idx === 0 ? [1.0] : [1.0, 2.0, 3.0];
            harmonics.forEach((mult, hIdx) => {
              const osc = offlineCtx.createOscillator();
              const gain = offlineCtx.createGain();
              osc.type = "sine";
              osc.frequency.setValueAtTime(freq * mult, stepTime);
              const amp = (gainPerVoice * 0.55) / (hIdx + 1);
              gain.gain.setValueAtTime(0.0001, stepTime);
              gain.gain.linearRampToValueAtTime(amp, stepTime + 0.03);
              gain.gain.exponentialRampToValueAtTime(0.001, stepTime + chordDur);
              osc.connect(gain);
              gain.connect(offlineCtx.destination);
              osc.start(stepTime);
              osc.stop(stepTime + chordDur + 0.1);
            });
          });
        } else {
          freqs.forEach((freq, idx) => {
            const osc = offlineCtx.createOscillator();
            const filter = offlineCtx.createBiquadFilter();
            const gain = offlineCtx.createGain();

            osc.type = idx === 0 ? "sine" : (instrument === "chiptune" ? "square" : (instrument === "pad" ? "sawtooth" : "triangle"));
            osc.frequency.setValueAtTime(freq, stepTime);
            filter.type = "lowpass";
            filter.frequency.setValueAtTime(instrument === "chiptune" ? 4500 : (idx === 0 ? 300 : 2000), stepTime);

            gain.gain.setValueAtTime(0.0001, stepTime);
            gain.gain.linearRampToValueAtTime(gainPerVoice, stepTime + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, stepTime + chordDur);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(offlineCtx.destination);
            osc.start(stepTime);
            osc.stop(stepTime + chordDur + 0.1);
          });
        }
      }
    }

    if (drumGridState.kick[drumStep]) {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      osc.frequency.setValueAtTime(140, stepTime);
      osc.frequency.exponentialRampToValueAtTime(42, stepTime + 0.09);
      gain.gain.setValueAtTime(0.9, stepTime);
      gain.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.28);
      osc.connect(gain);
      gain.connect(offlineCtx.destination);
      osc.start(stepTime);
      osc.stop(stepTime + 0.3);
    }

    if (drumGridState.snare[drumStep]) {
      const bufLen = Math.floor(sampleRate * 0.2);
      const noiseBuf = offlineCtx.createBuffer(1, bufLen, sampleRate);
      const out = noiseBuf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) out[i] = Math.random() * 2 - 1;
      const whiteNoise = offlineCtx.createBufferSource();
      whiteNoise.buffer = noiseBuf;
      const filter = offlineCtx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.setValueAtTime(900, stepTime);
      const noiseGain = offlineCtx.createGain();
      noiseGain.gain.setValueAtTime(0.5, stepTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, stepTime + 0.18);
      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(offlineCtx.destination);
      whiteNoise.start(stepTime);
      whiteNoise.stop(stepTime + 0.2);
    }

    if (drumGridState.hat[drumStep]) {
      const bufLen = Math.floor(sampleRate * 0.06);
      const noiseBuf = offlineCtx.createBuffer(1, bufLen, sampleRate);
      const out = noiseBuf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) out[i] = Math.random() * 2 - 1;
      const whiteNoise = offlineCtx.createBufferSource();
      whiteNoise.buffer = noiseBuf;
      const filter = offlineCtx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.setValueAtTime(7500, stepTime);
      const gain = offlineCtx.createGain();
      gain.gain.setValueAtTime(0.35, stepTime);
      gain.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.05);
      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(offlineCtx.destination);
      whiteNoise.start(stepTime);
      whiteNoise.stop(stepTime + 0.06);
    }

    if (drumGridState.clap[drumStep]) {
      const bufLen = Math.floor(sampleRate * 0.2);
      const noiseBuf = offlineCtx.createBuffer(1, bufLen, sampleRate);
      const out = noiseBuf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) out[i] = Math.random() * 2 - 1;
      [0, 0.012, 0.024].forEach((delay, bIdx) => {
        const whiteNoise = offlineCtx.createBufferSource();
        whiteNoise.buffer = noiseBuf;
        const filter = offlineCtx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(1200, stepTime + delay);
        filter.Q.setValueAtTime(3, stepTime + delay);
        const gain = offlineCtx.createGain();
        gain.gain.setValueAtTime(bIdx === 2 ? 0.6 : 0.35, stepTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, stepTime + delay + 0.12);
        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(offlineCtx.destination);
        whiteNoise.start(stepTime + delay);
        whiteNoise.stop(stepTime + delay + 0.15);
      });
    }
  }

  try {
    const renderedBuffer = await offlineCtx.startRendering();
    const wavData = createWavBlobBuffer(renderedBuffer);
    const blob = new Blob([wavData], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workbench-groove-${chordStudioState.key}-${bpm}bpm.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("💾 Exported workbench-groove.wav!");
  } catch (err) {
    console.error("WAV export failed", err);
    showToast("WAV export encountered an error.");
  }
}

function renderChordSlotsUI() {
  const containers = [$("#music-main-chord-slots"), $("#tool-chord-slots-container")].filter(Boolean);
  if (!containers.length) return;
  const html = chordStudioState.slots.map((slot, index) => {
    const isSelected = index === chordStudioState.selectedSlotIndex;
    return `
      <div class="chord-slot-card ${isSelected ? "active-slot" : ""}" data-action="select-chord-slot" data-slot-index="${index}" id="chord-slot-${index}">
        <div class="chord-slot-bar-num">Bar ${index + 1}</div>
        <div class="chord-slot-name">${escapeHTML(slot.chord)}</div>
        <div class="chord-slot-degree">${escapeHTML(slot.degree)}</div>
      </div>
    `;
  }).join("");
  containers.forEach(c => { c.innerHTML = html; });
  const activeSlotText = `Bar ${chordStudioState.selectedSlotIndex + 1} (${chordStudioState.slots[chordStudioState.selectedSlotIndex]?.chord || ""})`;
  const lbl1 = $("#music-main-active-slot-lbl");
  if (lbl1) lbl1.textContent = activeSlotText;
  const lbl2 = $("#tool-chords-active-slot-lbl");
  if (lbl2) lbl2.textContent = activeSlotText;
}

function renderDiatonicChordsUI() {
  const wraps = [$("#music-main-diatonic-wrap"), $("#tool-diatonic-chords-wrap")].filter(Boolean);
  if (!wraps.length) return;
  const keyData = DIATONIC_KEYS_DB[chordStudioState.key] || DIATONIC_KEYS_DB["C"];
  let html = "";
  keyData.chords.forEach((chord, i) => {
    const deg = keyData.degrees[i];
    html += `<button type="button" class="diatonic-chord-pill" data-action="set-diatonic-chord" data-chord="${escapeHTML(chord)}" data-degree="${escapeHTML(deg)}">${escapeHTML(chord)} <span>${escapeHTML(deg)}</span></button>`;
  });
  keyData.extra.forEach(chord => {
    html += `<button type="button" class="diatonic-chord-pill" data-action="set-diatonic-chord" data-chord="${escapeHTML(chord)}" data-degree="ext">${escapeHTML(chord)} <span>7th</span></button>`;
  });
  wraps.forEach(w => { w.innerHTML = html; });
}

function renderDrumSequencerUI() {
  const containers = [$("#music-main-sequencer-grid"), $("#tool-sequencer-grid")].filter(Boolean);
  if (!containers.length) return;
  const tracks = [
    { id: "kick", label: "🥁 Kick", iconClass: "kick" },
    { id: "snare", label: "🎯 Snare", iconClass: "snare" },
    { id: "hat", label: "🔔 Hi-Hat", iconClass: "hat" },
    { id: "clap", label: "👏 Clap", iconClass: "clap" }
  ];
  const html = tracks.map(track => {
    const pattern = drumGridState[track.id] || [];
    const stepsHtml = Array.from({ length: 16 }).map((_, stepIdx) => {
      const isActive = Boolean(pattern[stepIdx]);
      const isBeatStart = (stepIdx % 4) === 0;
      return `
        <button type="button" 
          class="sequencer-step-btn ${track.iconClass} ${isActive ? "active" : ""} ${isBeatStart ? "beat-start" : ""}" 
          data-action="toggle-drum-step" 
          data-track="${track.id}" 
          data-step="${stepIdx}" 
          title="${track.label} Step ${stepIdx + 1}">
          ${stepIdx + 1}
        </button>
      `;
    }).join("");
    return `
      <div class="sequencer-row">
        <div class="sequencer-label">${track.label}</div>
        ${stepsHtml}
      </div>
    `;
  }).join("");
  containers.forEach(c => { c.innerHTML = html; });
}

function selectChordSlot(index) {
  if (index < 0 || index >= chordStudioState.slots.length) return;
  chordStudioState.selectedSlotIndex = index;
  renderChordSlotsUI();
  playChordVoicing(chordStudioState.slots[index].chord, 0.9);
}

function setDiatonicChord(chord, degree) {
  const idx = chordStudioState.selectedSlotIndex;
  chordStudioState.slots[idx] = { chord, degree: degree || "" };
  const p1 = $("#music-main-preset");
  if (p1) p1.value = "custom";
  const p2 = $("#tool-chords-preset");
  if (p2) p2.value = "custom";
  renderChordSlotsUI();
  playChordVoicing(chord, 0.9);
}

function updateChordPreset(presetKey) {
  if (presetKey === "custom") return;
  const preset = CHORD_PROGRESSION_PRESETS[presetKey];
  if (!preset) return;
  const keyData = DIATONIC_KEYS_DB[chordStudioState.key] || DIATONIC_KEYS_DB["C"];
  const isMinor = chordStudioState.key.endsWith("m");
  chordStudioState.slots = preset.degrees.map(deg => {
    let chord = keyData.chords[0];
    const degIndex = keyData.degrees.indexOf(deg);
    if (degIndex !== -1) {
      chord = keyData.chords[degIndex];
    } else {
      const degreeMap = isMinor
        ? { "i": 0, "ii°": 1, "III": 2, "iv": 3, "v": 4, "VI": 5, "VII": 6, "V": 6 }
        : { "I": 0, "ii": 1, "iii": 2, "IV": 3, "V": 4, "vi": 5, "vii°": 6, "III": 2 };
      const fallbackIdx = degreeMap[deg] ?? 0;
      chord = keyData.chords[fallbackIdx] || keyData.chords[0];
    }
    return { chord, degree: deg };
  });
  const p1 = $("#music-main-preset");
  if (p1) p1.value = presetKey;
  const p2 = $("#tool-chords-preset");
  if (p2) p2.value = presetKey;
  renderChordSlotsUI();
  playChordVoicing(chordStudioState.slots[0].chord, 0.9);
}

function updateChordKey(newKey) {
  if (!DIATONIC_KEYS_DB[newKey]) return;
  chordStudioState.key = newKey;
  const p1 = $("#music-main-preset");
  const currentPreset = p1 ? p1.value : "pop";
  const k1 = $("#music-main-key");
  if (k1) k1.value = newKey;
  const k2 = $("#tool-chords-key");
  if (k2) k2.value = newKey;
  if (currentPreset !== "custom") {
    updateChordPreset(currentPreset);
  } else {
    const keyData = DIATONIC_KEYS_DB[newKey];
    chordStudioState.slots.forEach(slot => {
      const idx = keyData.degrees.indexOf(slot.degree);
      if (idx !== -1) slot.chord = keyData.chords[idx];
    });
    renderChordSlotsUI();
  }
  renderDiatonicChordsUI();
}

function toggleDrumStep(track, step) {
  if (!drumGridState[track] || step < 0 || step > 15) return;
  drumGridState[track][step] = drumGridState[track][step] ? 0 : 1;
  const isStepActive = Boolean(drumGridState[track][step]);
  document.querySelectorAll(`button.sequencer-step-btn[data-track="${track}"][data-step="${step}"]`).forEach(btn => {
    btn.classList.toggle("active", isStepActive);
  });
  if (isStepActive) playDrumSound(track);
}

function applyDrumPreset(presetName) {
  const preset = DRUM_BEAT_PRESETS[presetName];
  if (!preset) return;
  drumGridState.kick = [...preset.kick];
  drumGridState.snare = [...preset.snare];
  drumGridState.hat = [...preset.hat];
  drumGridState.clap = [...preset.clap];
  const d1 = $("#music-main-drum-preset");
  if (d1) d1.value = presetName;
  const d2 = $("#tool-drum-preset");
  if (d2) d2.value = presetName;
  renderDrumSequencerUI();
}

function updateMusicPlayButtonsUI() {
  const isPlaying = musicPlaybackState.isPlaying;
  const mode = musicPlaybackState.playMode;
  const btnBoth = $("#music-btn-play-both");
  const btnChords = $("#music-btn-play-chords");
  const btnDrums = $("#music-btn-play-drums");
  const btnHeader = $("#music-view-play-both-btn");
  const btnModal = $("#tool-chord-play-btn");
  if (!isPlaying) {
    if (btnBoth) { btnBoth.textContent = "▶ Play Both"; btnBoth.className = "button button-primary music-transport-play-btn"; }
    if (btnChords) { btnChords.textContent = "🎹 Chords Only"; btnChords.className = "button button-outline music-transport-play-btn"; }
    if (btnDrums) { btnDrums.textContent = "🥁 Drums Only"; btnDrums.className = "button button-outline music-transport-play-btn"; }
    if (btnHeader) { btnHeader.textContent = "▶ Play Both (Chords & Drums)"; btnHeader.className = "button button-primary"; }
    if (btnModal) { btnModal.textContent = "▶ Play Groove"; btnModal.className = "button button-primary"; }
    return;
  }
  if (mode === "both") {
    if (btnBoth) { btnBoth.textContent = "⏸ Pause Both"; btnBoth.className = "button button-primary music-transport-play-btn"; }
    if (btnChords) { btnChords.textContent = "🎹 Chords Only"; btnChords.className = "button button-outline music-transport-play-btn"; }
    if (btnDrums) { btnDrums.textContent = "🥁 Drums Only"; btnDrums.className = "button button-outline music-transport-play-btn"; }
    if (btnHeader) { btnHeader.textContent = "⏸ Pause Groove"; btnHeader.className = "button button-outline"; }
    if (btnModal) { btnModal.textContent = "⏸ Pause Groove"; btnModal.className = "button button-outline"; }
  } else if (mode === "chords") {
    if (btnBoth) { btnBoth.textContent = "▶ Play Both"; btnBoth.className = "button button-outline music-transport-play-btn"; }
    if (btnChords) { btnChords.textContent = "⏸ Pause Chords"; btnChords.className = "button button-primary music-transport-play-btn"; }
    if (btnDrums) { btnDrums.textContent = "🥁 Drums Only"; btnDrums.className = "button button-outline music-transport-play-btn"; }
    if (btnHeader) { btnHeader.textContent = "⏸ Pause Chords"; btnHeader.className = "button button-outline"; }
    if (btnModal) { btnModal.textContent = "⏸ Pause Chords"; btnModal.className = "button button-outline"; }
  } else if (mode === "drums") {
    if (btnBoth) { btnBoth.textContent = "▶ Play Both"; btnBoth.className = "button button-outline music-transport-play-btn"; }
    if (btnChords) { btnChords.textContent = "🎹 Chords Only"; btnChords.className = "button button-outline music-transport-play-btn"; }
    if (btnDrums) { btnDrums.textContent = "⏸ Pause Drums"; btnDrums.className = "button button-primary music-transport-play-btn"; }
    if (btnHeader) { btnHeader.textContent = "⏸ Pause Drums"; btnHeader.className = "button button-outline"; }
    if (btnModal) { btnModal.textContent = "⏸ Pause Drums"; btnModal.className = "button button-outline"; }
  }
}

function startMusicGroove(mode = "both") {
  stopMusicGroove(false);
  musicPlaybackState.isPlaying = true;
  musicPlaybackState.playMode = mode;
  musicPlaybackState.stepIndex = 0;
  updateMusicPlayButtonsUI();
  const bpm = chordStudioState.bpm || musicPlaybackState.bpm || 105;
  const stepMs = (60000 / bpm) / 4;
  function tick() {
    if (!musicPlaybackState.isPlaying) return;
    const currentStep = musicPlaybackState.stepIndex;
    const barIndex = Math.floor(currentStep / 16) % chordStudioState.slots.length;
    const drumStep = currentStep % 16;
    if (drumStep === 0) {
      if (!musicPlaybackState.chordsMuted && (musicPlaybackState.playMode === "both" || musicPlaybackState.playMode === "chords")) {
        const activeSlot = chordStudioState.slots[barIndex];
        if (activeSlot) {
          const barDurationSec = (60 / bpm) * 4;
          playChordVoicing(activeSlot.chord, Math.min(barDurationSec * 0.95, 2.4));
        }
      }
      document.querySelectorAll(".chord-slot-card").forEach((card) => {
        const slotIdx = parseInt(card.dataset.slotIndex, 10);
        card.classList.toggle("playing-chord", slotIdx === barIndex);
      });
    }
    if (!musicPlaybackState.drumsMuted && (musicPlaybackState.playMode === "both" || musicPlaybackState.playMode === "drums")) {
      if (drumGridState.kick[drumStep]) playDrumSound("kick");
      if (drumGridState.snare[drumStep]) playDrumSound("snare");
      if (drumGridState.hat[drumStep]) playDrumSound("hat");
      if (drumGridState.clap[drumStep]) playDrumSound("clap");
    }
    if (!musicPlaybackState.metronomeMuted && (drumStep % 4 === 0)) {
      playDrumClick(drumStep === 0);
    }
    document.querySelectorAll(".sequencer-step-btn").forEach(btn => {
      btn.classList.toggle("playhead", parseInt(btn.dataset.step, 10) === drumStep);
    });
    musicPlaybackState.stepIndex = (currentStep + 1) % (chordStudioState.slots.length * 16);
  }
  tick();
  musicPlaybackState.intervalId = setInterval(tick, stepMs);
  const modeLabels = { both: "▶ Playing chord progression & drums", chords: "🎹 Playing chord progression", drums: "🥁 Playing drum groove" };
  showToast(modeLabels[mode] || "▶ Playing groove");
}

function stopMusicGroove(resetUI = true) {
  musicPlaybackState.isPlaying = false;
  if (musicPlaybackState.intervalId) {
    clearInterval(musicPlaybackState.intervalId);
    musicPlaybackState.intervalId = null;
  }
  musicPlaybackState.stepIndex = 0;
  if (resetUI) {
    updateMusicPlayButtonsUI();
    document.querySelectorAll(".chord-slot-card").forEach(card => card.classList.remove("playing-chord"));
    document.querySelectorAll(".sequencer-step-btn").forEach(btn => btn.classList.remove("playhead"));
  }
}

function toggleChordPlayback() {
  if (musicPlaybackState.isPlaying) stopMusicGroove();
  else startMusicGroove("both");
}

function toggleMusicChannel(channel) {
  if (channel === "chords") {
    musicPlaybackState.chordsMuted = !musicPlaybackState.chordsMuted;
    $("#music-toggle-chords")?.classList.toggle("active", !musicPlaybackState.chordsMuted);
    showToast(musicPlaybackState.chordsMuted ? "🎹 Chords channel muted" : "🎹 Chords channel active");
  } else if (channel === "drums") {
    musicPlaybackState.drumsMuted = !musicPlaybackState.drumsMuted;
    $("#music-toggle-drums")?.classList.toggle("active", !musicPlaybackState.drumsMuted);
    showToast(musicPlaybackState.drumsMuted ? "🥁 Drums channel muted" : "🥁 Drums channel active");
  } else if (channel === "metronome") {
    musicPlaybackState.metronomeMuted = !musicPlaybackState.metronomeMuted;
    $("#music-toggle-metro")?.classList.toggle("active", !musicPlaybackState.metronomeMuted);
    showToast(musicPlaybackState.metronomeMuted ? "🔔 Metronome click off" : "🔔 Metronome click on");
  }
}

async function copyChordProgressionDetails() {
  const key = chordStudioState.key;
  const bpm = chordStudioState.bpm;
  const progression = chordStudioState.slots.map((s, i) => `Bar ${i + 1}: ${s.chord} (${s.degree})`).join("  |  ");
  const text = `🎹 Chord Progression & Groove:\nKey: ${key} Major · Tempo: ${bpm} BPM\nProgression: ${progression}\nArranged with Workbench Studio`;
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied chord progression to clipboard!");
  } catch {
    showToast("Chord details ready.");
  }
}

function updateMusicViewTimingResult() {
  const bpm = chordStudioState.bpm || musicPlaybackState.bpm || 105;
  const quarterMs = Math.round(60000 / bpm);
  const eighthMs = Math.round(30000 / bpm);
  const dottedEighthMs = Math.round(45000 / bpm);
  const sixteenthMs = Math.round(15000 / bpm);
  const resultBox = $("#music-view-timing-result");
  if (resultBox) {
    resultBox.innerHTML = `
      <div style="font-size:12px;font-weight:700;color:var(--ink);margin-bottom:6px">
        Tempo Timing for <span style="color:var(--green)">${bpm} BPM</span>:
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(100px, 1fr));gap:6px">
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:6px;text-align:center">
          <div style="font-size:10px;color:var(--muted);font-weight:700">1/4 NOTE</div>
          <div style="font-size:15px;font-weight:800;color:var(--ink)">${quarterMs} ms</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:6px;text-align:center">
          <div style="font-size:10px;color:var(--muted);font-weight:700">1/8 NOTE</div>
          <div style="font-size:15px;font-weight:800;color:var(--ink)">${eighthMs} ms</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:6px;text-align:center">
          <div style="font-size:10px;color:var(--muted);font-weight:700">DOTTED 1/8</div>
          <div style="font-size:15px;font-weight:800;color:#0284c7">${dottedEighthMs} ms</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:6px;text-align:center">
          <div style="font-size:10px;color:var(--muted);font-weight:700">1/16 NOTE</div>
          <div style="font-size:15px;font-weight:800;color:var(--green)">${sixteenthMs} ms</div>
        </div>
      </div>
    `;
  }
  const tempoLbl = $("#music-view-tempo-lbl");
  if (tempoLbl) tempoLbl.textContent = bpm;
}

function updateMusicViewNoteResult() {
  const note = $("#music-view-note")?.value || "A4";
  const concert = parseFloat($("#music-view-tuning")?.value) || 440;
  const semitones = NOTE_SEMITONES_FROM_A4[note] || 0;
  const freq = concert * Math.pow(2, semitones / 12);
  const midiNumber = 69 + semitones;
  const speedOfSound = 1125;
  const wavelengthFeet = (speedOfSound / freq).toFixed(2);
  const wavelengthMeters = ((speedOfSound * 0.3048) / freq).toFixed(2);
  const resultBox = $("#music-view-note-result");
  if (resultBox) {
    resultBox.innerHTML = `
      <div style="font-size:13px;font-weight:700;color:var(--ink);margin-bottom:6px">
        Note ${note} Frequency: <span style="font-size:18px;font-weight:900;color:var(--green)">${freq.toFixed(2)} Hz</span> (MIDI ${midiNumber})
      </div>
      <div style="font-size:11px;color:var(--muted)">
        Acoustic Wavelength: <strong>${wavelengthFeet} ft</strong> (${wavelengthMeters} m) · Tuning: A4 = ${concert} Hz
      </div>
    `;
  }
}

function playPitchToneViewAction() {
  const note = $("#music-view-note")?.value || "A4";
  const concert = parseFloat($("#music-view-tuning")?.value) || 440;
  const semitones = NOTE_SEMITONES_FROM_A4[note] || 0;
  const freq = concert * Math.pow(2, semitones / 12);
  playNoteTone(freq, 1.2);
  showToast(`🎵 Playing ${note} tone (${freq.toFixed(1)} Hz)`);
}

const metronomeState = {
  bpm: 105,
  timeSignature: 4,
  currentBeat: 0,
  isPlaying: false,
  timerId: null,
  audioCtx: null,
  tapTimes: []
};

function renderMetronomeDots() {
  const container = $("#metronome-beat-dots");
  if (!container) return;
  const numBeats = metronomeState.timeSignature;
  let html = "";
  for (let i = 0; i < numBeats; i++) {
    const isCur = metronomeState.isPlaying && (metronomeState.currentBeat === i);
    const bg = isCur ? (i === 0 ? "var(--green)" : "#0284c7") : "var(--border)";
    const scale = isCur ? "transform:scale(1.4);box-shadow:0 0 6px var(--green);" : "";
    html += `<span class="metronome-dot" style="width:12px;height:12px;border-radius:50%;background:${bg};display:inline-block;transition:all 0.08s ease;${scale}"></span>`;
  }
  container.innerHTML = html;
}

function playMetronomeClick(isDownbeat) {
  try {
    if (!metronomeState.audioCtx) {
      metronomeState.audioCtx = (typeof getMusicAudioCtx === "function") ? getMusicAudioCtx() : new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = metronomeState.audioCtx;
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    if (isDownbeat) {
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.035);
      gain.gain.setValueAtTime(0.25, now);
    } else {
      osc.frequency.setValueAtTime(850, now);
      osc.frequency.exponentialRampToValueAtTime(450, now + 0.025);
      gain.gain.setValueAtTime(0.12, now);
    }
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.045);
  } catch {}
}

function startMetronome() {
  if (metronomeState.isPlaying) return;
  metronomeState.isPlaying = true;
  metronomeState.currentBeat = 0;

  const btn = $("#metronome-toggle-btn");
  if (btn) {
    btn.textContent = "⏹ Stop Metronome";
    btn.classList.add("button-danger");
    btn.classList.remove("button-primary");
  }

  const tick = () => {
    if (!metronomeState.isPlaying) return;
    const isDownbeat = (metronomeState.currentBeat === 0);
    playMetronomeClick(isDownbeat);
    renderMetronomeDots();
    metronomeState.currentBeat = (metronomeState.currentBeat + 1) % metronomeState.timeSignature;
  };

  tick();
  const intervalMs = (60 / metronomeState.bpm) * 1000;
  metronomeState.timerId = setInterval(tick, intervalMs);
}

function stopMetronome() {
  metronomeState.isPlaying = false;
  if (metronomeState.timerId) {
    clearInterval(metronomeState.timerId);
    metronomeState.timerId = null;
  }
  const btn = $("#metronome-toggle-btn");
  if (btn) {
    btn.textContent = "▶ Start Metronome";
    btn.classList.remove("button-danger");
    btn.classList.add("button-primary");
  }
  renderMetronomeDots();
}

function toggleMetronome() {
  if (metronomeState.isPlaying) stopMetronome();
  else startMetronome();
}

function setMetronomeBpm(newBpm) {
  metronomeState.bpm = Math.max(30, Math.min(280, parseInt(newBpm, 10) || 105));
  const valDisplay = $("#metronome-bpm-val");
  const slider = $("#metronome-bpm-slider");
  if (valDisplay) valDisplay.textContent = metronomeState.bpm;
  if (slider) slider.value = metronomeState.bpm;

  if (metronomeState.isPlaying) {
    clearInterval(metronomeState.timerId);
    const intervalMs = (60 / metronomeState.bpm) * 1000;
    metronomeState.timerId = setInterval(() => {
      if (!metronomeState.isPlaying) return;
      const isDownbeat = (metronomeState.currentBeat === 0);
      playMetronomeClick(isDownbeat);
      renderMetronomeDots();
      metronomeState.currentBeat = (metronomeState.currentBeat + 1) % metronomeState.timeSignature;
    }, intervalMs);
  }
}

function tapMetronomeTempo() {
  const now = performance.now();
  metronomeState.tapTimes.push(now);
  if (metronomeState.tapTimes.length > 4) metronomeState.tapTimes.shift();
  if (metronomeState.tapTimes.length >= 2) {
    const diffs = [];
    for (let i = 1; i < metronomeState.tapTimes.length; i++) {
      diffs.push(metronomeState.tapTimes[i] - metronomeState.tapTimes[i - 1]);
    }
    const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    if (avgDiff > 200 && avgDiff < 3000) {
      const calculatedBpm = Math.round(60000 / avgDiff);
      setMetronomeBpm(calculatedBpm);
    }
  }
}

/* ============================================================
   🎸 Fretboard Studio Engine & Scale Database
   ============================================================ */
const MUSIC_SCALES_DB = {
  ionian: { name: "Major (Ionian)", formula: "W - W - H - W - W - W - H", intervals: [0, 2, 4, 5, 7, 9, 11], mood: "Uplifting, resolute, bright, joyous", chords: "I, ii, iii, IV, V, vi, vii°" },
  aeolian: { name: "Natural Minor (Aeolian)", formula: "W - H - W - W - H - W - W", intervals: [0, 2, 3, 5, 7, 8, 10], mood: "Melancholic, contemplative, tragic, deep", chords: "i, ii°, III, iv, v, VI, VII" },
  dorian: { name: "Dorian Mode", formula: "W - H - W - W - W - H - W", intervals: [0, 2, 3, 5, 7, 9, 10], mood: "Bittersweet, jazzy, funky (Natural 6th lifts the minor darkness)", chords: "i, ii, ♭III, IV, v, vi°, ♭VII" },
  mixolydian: { name: "Mixolydian Mode", formula: "W - W - H - W - W - H - W", intervals: [0, 2, 4, 5, 7, 9, 10], mood: "Classic rock, bluesy, jam-band warmth (Dominant flat 7th)", chords: "I, ii, iii°, IV, v, vi, ♭VII" },
  lydian: { name: "Lydian Mode", formula: "W - W - W - H - W - W - H", intervals: [0, 2, 4, 6, 7, 9, 11], mood: "Dreamy, mystical, cinematic (Raised #4th creates floating sensation)", chords: "I, II, iii, #iv°, V, vi, vii" },
  pentatonic_minor: { name: "Minor Pentatonic", formula: "3H - W - W - 3H - W (5 notes)", intervals: [0, 3, 5, 7, 10], mood: "Rock, blues, zero sour notes, expressive guitar bends", chords: "Universal blues/rock framework" },
  blues: { name: "Blues Scale", formula: "3H - W - H - H - 3H - W (6 notes)", intervals: [0, 3, 5, 6, 7, 10], mood: "Soulful, guttural grit with iconic flat-5th blue note", chords: "I7, IV7, V7 dominant progression" },
  harmonic_minor: { name: "Harmonic Minor", formula: "W - H - W - W - H - 3H - H", intervals: [0, 2, 3, 5, 7, 8, 11], mood: "Neoclassical, dramatic, exotic Mediterranean tension", chords: "i, ii°, ♭III+, iv, V, ♭VI, vii°" }
};
const SCALE_PRESETS = MUSIC_SCALES_DB;

const FRETBOARD_INSTRUMENTS_DB = {
  guitar_standard: {
    name: "Guitar (Standard)",
    strings: [
      { name: "e", midi: 64, gauge: 1.2 },
      { name: "B", midi: 59, gauge: 1.5 },
      { name: "G", midi: 55, gauge: 2.0 },
      { name: "D", midi: 50, gauge: 2.6 },
      { name: "A", midi: 45, gauge: 3.2 },
      { name: "E", midi: 40, gauge: 3.8 }
    ]
  },
  guitar_dropd: {
    name: "Guitar (Drop D)",
    strings: [
      { name: "e", midi: 64, gauge: 1.2 },
      { name: "B", midi: 59, gauge: 1.5 },
      { name: "G", midi: 55, gauge: 2.0 },
      { name: "D", midi: 50, gauge: 2.6 },
      { name: "A", midi: 45, gauge: 3.2 },
      { name: "D", midi: 38, gauge: 4.0 }
    ]
  },
  guitar_dadgad: {
    name: "Guitar (DADGAD)",
    strings: [
      { name: "D", midi: 62, gauge: 1.3 },
      { name: "A", midi: 57, gauge: 1.6 },
      { name: "G", midi: 55, gauge: 2.0 },
      { name: "D", midi: 50, gauge: 2.6 },
      { name: "A", midi: 45, gauge: 3.2 },
      { name: "D", midi: 38, gauge: 4.0 }
    ]
  },
  guitar_opend: {
    name: "Guitar (Open D)",
    strings: [
      { name: "D", midi: 62, gauge: 1.3 },
      { name: "A", midi: 57, gauge: 1.6 },
      { name: "F#", midi: 54, gauge: 2.0 },
      { name: "D", midi: 50, gauge: 2.6 },
      { name: "A", midi: 45, gauge: 3.2 },
      { name: "D", midi: 38, gauge: 4.0 }
    ]
  },
  guitar_openg: {
    name: "Guitar (Open G)",
    strings: [
      { name: "D", midi: 62, gauge: 1.3 },
      { name: "B", midi: 59, gauge: 1.5 },
      { name: "G", midi: 55, gauge: 2.0 },
      { name: "D", midi: 50, gauge: 2.6 },
      { name: "G", midi: 43, gauge: 3.4 },
      { name: "D", midi: 38, gauge: 4.0 }
    ]
  },
  guitar_halfstep: {
    name: "Guitar (Eb Standard)",
    strings: [
      { name: "Eb", midi: 63, gauge: 1.2 },
      { name: "Bb", midi: 58, gauge: 1.5 },
      { name: "Gb", midi: 54, gauge: 2.0 },
      { name: "Db", midi: 49, gauge: 2.6 },
      { name: "Ab", midi: 44, gauge: 3.2 },
      { name: "Eb", midi: 39, gauge: 3.8 }
    ]
  },
  bass_standard: {
    name: "4-String Bass (Standard)",
    strings: [
      { name: "G", midi: 43, gauge: 2.2 },
      { name: "D", midi: 38, gauge: 3.0 },
      { name: "A", midi: 33, gauge: 3.8 },
      { name: "E", midi: 28, gauge: 4.6 }
    ]
  },
  bass_dropd: {
    name: "4-String Bass (Drop D)",
    strings: [
      { name: "G", midi: 43, gauge: 2.2 },
      { name: "D", midi: 38, gauge: 3.0 },
      { name: "A", midi: 33, gauge: 3.8 },
      { name: "D", midi: 26, gauge: 5.0 }
    ]
  },
  bass_5string: {
    name: "5-String Bass",
    strings: [
      { name: "G", midi: 43, gauge: 2.0 },
      { name: "D", midi: 38, gauge: 2.8 },
      { name: "A", midi: 33, gauge: 3.6 },
      { name: "E", midi: 28, gauge: 4.4 },
      { name: "B", midi: 23, gauge: 5.4 }
    ]
  },
  ukulele_standard: {
    name: "Ukulele (High-G GCEA)",
    strings: [
      { name: "A", midi: 69, gauge: 1.4 },
      { name: "E", midi: 64, gauge: 1.6 },
      { name: "C", midi: 60, gauge: 1.8 },
      { name: "G", midi: 67, gauge: 1.3 }
    ]
  },
  ukulele_lowg: {
    name: "Ukulele (Low-G GCEA)",
    strings: [
      { name: "A", midi: 69, gauge: 1.4 },
      { name: "E", midi: 64, gauge: 1.6 },
      { name: "C", midi: 60, gauge: 1.8 },
      { name: "G", midi: 55, gauge: 2.2 }
    ]
  },
  ukulele_baritone: {
    name: "Ukulele (Baritone DGBE)",
    strings: [
      { name: "E", midi: 64, gauge: 1.3 },
      { name: "B", midi: 59, gauge: 1.6 },
      { name: "G", midi: 55, gauge: 2.0 },
      { name: "D", midi: 50, gauge: 2.6 }
    ]
  },
  banjo_openg: {
    name: "Banjo (5-String Open G)",
    strings: [
      { name: "D", midi: 62, gauge: 1.2 },
      { name: "B", midi: 59, gauge: 1.4 },
      { name: "G", midi: 55, gauge: 1.8 },
      { name: "D", midi: 50, gauge: 2.4 },
      { name: "g", midi: 67, gauge: 1.1 }
    ]
  },
  mandolin_standard: {
    name: "Mandolin (Standard GDAE)",
    strings: [
      { name: "E", midi: 64, gauge: 1.2 },
      { name: "A", midi: 57, gauge: 1.8 },
      { name: "D", midi: 50, gauge: 2.4 },
      { name: "G", midi: 43, gauge: 3.2 }
    ]
  }
};

const NOTE_NAME_LIST = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function midiToNoteName(midi) {
  const norm = ((midi % 12) + 12) % 12;
  return NOTE_NAME_LIST[norm];
}

function playGuitarStringTone(midi, gauge = 2) {
  try {
    const ctx = (typeof getMusicAudioCtx === "function") ? getMusicAudioCtx() : new (window.AudioContext || window.webkitAudioContext)();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();

    const now = ctx.currentTime;
    const freq = 440 * Math.pow(2, (midi - 69) / 12);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(freq, now);

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(freq * 1.002, now);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(Math.min(6000, freq * 7), now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(120, freq * 1.5), now + 1.2);

    const duration = Math.min(2.8, Math.max(0.6, 2.2 - (midi - 40) * 0.03));
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration + 0.05);
    osc2.stop(now + duration + 0.05);
  } catch {}
}

function renderFretboardUI() {
  const neck = $("#fretboard-neck");
  if (!neck) return;

  const instKey = $("#fretboard-instrument-select")?.value || "guitar_standard";
  const inst = FRETBOARD_INSTRUMENTS_DB[instKey] || FRETBOARD_INSTRUMENTS_DB.guitar_standard;
  const dispMode = $("#fretboard-display-mode")?.value || "notes";
  const hlMode = $("#fretboard-highlight-mode")?.value || "scale";

  const rootKey = $("#music-scale-key")?.value || "C";
  const modeKey = $("#music-scale-mode")?.value || "ionian";
  const scale = SCALE_PRESETS[modeKey] || SCALE_PRESETS.ionian;
  const rootIdx = NOTE_NAME_LIST.indexOf(rootKey);
  const scaleNotes = new Set(scale.intervals.map(iv => NOTE_NAME_LIST[(rootIdx + iv) % 12]));

  const numFrets = 12;
  let html = "";

  inst.strings.forEach((str) => {
    html += `<div class="fretboard-string-row" style="--string-gauge:${str.gauge}px">`;
    html += `<div class="fretboard-string-name" data-action="hit-fretboard-note" data-midi="${str.midi}">${str.name}</div>`;

    for (let f = 0; f <= numFrets; f++) {
      const fretMidi = str.midi + f;
      const noteName = midiToNoteName(fretMidi);
      const isRoot = noteName === rootKey;
      const inScale = scaleNotes.has(noteName);

      let badgeClass = "fretboard-note-pill";
      if (isRoot) badgeClass += " scale-root";
      else if (inScale && hlMode !== "roots") badgeClass += " scale-note";

      let labelText = noteName;
      if (dispMode === "intervals") {
        if (isRoot) labelText = "R";
        else if (inScale) {
          const semitonesFromRoot = ((NOTE_NAME_LIST.indexOf(noteName) - rootIdx) + 12) % 12;
          const intervalMap = { 1: "♭2", 2: "2", 3: "♭3", 4: "3", 5: "4", 6: "♭5", 7: "5", 8: "♭6", 9: "6", 10: "♭7", 11: "7" };
          labelText = intervalMap[semitonesFromRoot] || noteName;
        } else {
          labelText = "";
        }
      } else if (dispMode === "dots") {
        labelText = isRoot ? "●" : (inScale ? "•" : "");
      }

      const showBadge = hlMode === "all" || (hlMode === "scale" && inScale) || (hlMode === "roots" && isRoot);
      const isNut = f === 0;

      html += `
        <div class="fretboard-fret-cell ${isNut ? "nut-fret" : ""}" data-action="hit-fretboard-note" data-midi="${fretMidi}" title="${noteName} (Fret ${f})">
          ${showBadge ? `<span class="${badgeClass}">${labelText}</span>` : ""}
        </div>
      `;
    }
    html += `</div>`;
  });

  // Markers row below neck
  html += `<div class="fretboard-markers-bar">`;
  for (let f = 0; f <= numFrets; f++) {
    const isSingleMarker = [3, 5, 7, 9].includes(f);
    const isDoubleMarker = f === 12;
    const marker = isDoubleMarker ? "●●" : isSingleMarker ? "●" : "";
    html += `<div class="fretboard-marker-fret">${f} ${marker ? `<br><span style="font-size:7px;color:#fbbf24">${marker}</span>` : ""}</div>`;
  }
  html += `</div>`;

  neck.innerHTML = html;

  const info = $("#fretboard-info-label");
  if (info) {
    info.textContent = `Active Scale: ${rootKey} ${scale.name.split("·")[0].trim()} · ${inst.name}`;
  }
}

function strumFretboardTuning() {
  const instKey = $("#fretboard-instrument-select")?.value || "guitar_standard";
  const inst = FRETBOARD_INSTRUMENTS_DB[instKey] || FRETBOARD_INSTRUMENTS_DB.guitar_standard;
  const strings = [...inst.strings].reverse();
  strings.forEach((str, i) => {
    setTimeout(() => {
      playGuitarStringTone(str.midi, str.gauge);
      const nameEl = Array.from(document.querySelectorAll(".fretboard-string-name")).find(el => el.textContent === str.name);
      if (nameEl) {
        nameEl.style.transform = "scale(1.3)";
        setTimeout(() => nameEl.style.transform = "", 200);
      }
    }, i * 65);
  });
}

// --- 🥁 Music Studio: 16-Step Beat Sequencer & Tap Tempo ---
const beatSeqState = {
  bpm: 120,
  isPlaying: false,
  currentStep: 0,
  swing: 0,
  timerId: null,
  tracks: {
    kick:  [1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0],
    snare: [0, 0, 0, 0,  1, 0, 0, 0,  0, 0, 0, 0,  1, 0, 0, 0],
    hihat: [1, 1, 1, 1,  1, 1, 1, 1,  1, 1, 1, 1,  1, 1, 1, 1],
    clap:  [0, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0,  0, 0, 1, 0]
  }
};

const beatTapTracker = {
  taps: [],
  lastTapTime: 0
};

function renderBeatSequencerGrid() {
  const container = $("#beat-seq-grid");
  if (!container) return;

  const trackDefs = [
    { id: "kick", label: "🥁 Kick", icon: "kick" },
    { id: "snare", label: "💥 Snare", icon: "snare" },
    { id: "hihat", label: "🎩 Hi-Hat", icon: "hihat" },
    { id: "clap", label: "👏 Clap", icon: "clap" }
  ];

  let html = "";
  trackDefs.forEach(tr => {
    const pattern = beatSeqState.tracks[tr.id] || [];
    let stepsHtml = "";
    for (let i = 0; i < 16; i++) {
      const active = pattern[i] ? "active" : "";
      const playhead = (beatSeqState.isPlaying && beatSeqState.currentStep === i) ? "playhead-active" : "";
      stepsHtml += `
        <button type="button" 
          class="beat-step-pad ${tr.id} ${active} ${playhead}" 
          data-action="toggle-beat-step" 
          data-track="${tr.id}" 
          data-step="${i}" 
          title="${tr.label} · Step ${i + 1}">
          ${i + 1}
        </button>
      `;
    }
    html += `
      <div class="beat-seq-row">
        <div class="beat-seq-label" data-action="audition-beat-track" data-track="${tr.id}" title="Click to test ${tr.label}">
          <span>${tr.label}</span>
          <span style="font-size:10px;color:var(--muted)">▶</span>
        </div>
        <div class="beat-seq-steps-wrap">
          ${stepsHtml}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function toggleBeatSequencer() {
  beatSeqState.isPlaying = !beatSeqState.isPlaying;
  const btn = $("#beat-seq-play-btn");
  const status = $("#beat-seq-status-text");

  if (beatSeqState.isPlaying) {
    if (btn) {
      btn.textContent = "⏹ Stop Beat";
      btn.classList.add("button-danger");
    }
    beatSeqState.currentStep = 0;
    scheduleNextBeatStep();
    if (status) status.textContent = `Playing · ${beatSeqState.bpm} BPM · 16 Steps`;
  } else {
    if (btn) {
      btn.textContent = "▶ Play Beat";
      btn.classList.remove("button-danger");
    }
    if (beatSeqState.timerId) {
      clearTimeout(beatSeqState.timerId);
      beatSeqState.timerId = null;
    }
    document.querySelectorAll(".beat-step-pad.playhead-active").forEach(el => el.classList.remove("playhead-active"));
    if (status) status.textContent = `Stopped · ${beatSeqState.bpm} BPM · 16 Steps`;
  }
}

function scheduleNextBeatStep() {
  if (!beatSeqState.isPlaying) return;

  const step = beatSeqState.currentStep;
  ["kick", "snare", "hihat", "clap"].forEach(tr => {
    if (beatSeqState.tracks[tr] && beatSeqState.tracks[tr][step]) {
      const mapped = tr === "hihat" ? "hat" : tr;
      playDrumSound(mapped);
    }
  });

  document.querySelectorAll(".beat-step-pad.playhead-active").forEach(el => el.classList.remove("playhead-active"));
  document.querySelectorAll(`.beat-step-pad[data-step="${step}"]`).forEach(el => el.classList.add("playhead-active"));

  const base16thMs = (60000 / beatSeqState.bpm) / 4;
  let interval = base16thMs;
  if (beatSeqState.swing > 0) {
    const swingFactor = (beatSeqState.swing / 100) * 0.45;
    interval = (step % 2 === 0) ? (base16thMs * (1 + swingFactor)) : (base16thMs * (1 - swingFactor));
  }

  beatSeqState.currentStep = (step + 1) % 16;
  beatSeqState.timerId = setTimeout(scheduleNextBeatStep, interval);
}

function tapBeatTempo() {
  const now = Date.now();
  if (beatTapTracker.lastTapTime && (now - beatTapTracker.lastTapTime > 2200)) {
    beatTapTracker.taps = [];
  }
  beatTapTracker.taps.push(now);
  beatTapTracker.lastTapTime = now;

  if (beatTapTracker.taps.length > 6) {
    beatTapTracker.taps.shift();
  }

  if (beatTapTracker.taps.length >= 2) {
    let diffs = [];
    for (let i = 1; i < beatTapTracker.taps.length; i++) {
      diffs.push(beatTapTracker.taps[i] - beatTapTracker.taps[i - 1]);
    }
    const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    let bpm = Math.round(60000 / avgDiff);
    bpm = Math.max(40, Math.min(260, bpm));

    beatSeqState.bpm = bpm;
    const bpmEl = $("#beat-tap-bpm-display");
    const msEl = $("#beat-tap-ms-display");
    const nameEl = $("#beat-tap-name-display");
    if (bpmEl) bpmEl.textContent = bpm;
    if (msEl) msEl.textContent = `(${Math.round(avgDiff)} ms)`;

    let tempoName = "Moderato";
    if (bpm < 60) tempoName = "Largo";
    else if (bpm < 76) tempoName = "Adagio";
    else if (bpm < 108) tempoName = "Andante";
    else if (bpm < 130) tempoName = "Moderato";
    else if (bpm < 168) tempoName = "Allegro";
    else tempoName = "Presto";
    if (nameEl) nameEl.textContent = tempoName;

    const tapBtn = $("#beat-tap-btn");
    if (tapBtn) {
      tapBtn.style.transform = "scale(0.96)";
      setTimeout(() => tapBtn.style.transform = "", 100);
    }
  }
}

function resetBeatTap() {
  beatTapTracker.taps = [];
  beatTapTracker.lastTapTime = 0;
  showToast("Tap tempo reset. Tap beat button 3-4 times.");
}

function applyBeatTempoToStudio() {
  const bpm = beatSeqState.bpm || 120;
  setMetronomeBpm(bpm);
  showToast(`Synced Studio Metronome & Delay Calculator to ${bpm} BPM!`);
}

function loadBeatPreset(name) {
  if (name === "four_on_floor") {
    beatSeqState.tracks = {
      kick:  [1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0],
      snare: [0, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0],
      hihat: [0, 0, 1, 0,  0, 0, 1, 0,  0, 0, 1, 0,  0, 0, 1, 0],
      clap:  [0, 0, 0, 0,  1, 0, 0, 0,  0, 0, 0, 0,  1, 0, 0, 0]
    };
  } else if (name === "boom_bap") {
    beatSeqState.tracks = {
      kick:  [1, 0, 0, 0,  0, 0, 0, 0,  0, 0, 1, 0,  0, 0, 0, 0],
      snare: [0, 0, 0, 0,  1, 0, 0, 0,  0, 0, 0, 0,  1, 0, 0, 0],
      hihat: [1, 0, 1, 0,  1, 0, 1, 0,  1, 0, 1, 0,  1, 0, 1, 0],
      clap:  [0, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0]
    };
  } else if (name === "rock") {
    beatSeqState.tracks = {
      kick:  [1, 0, 0, 0,  0, 0, 0, 0,  1, 0, 0, 0,  0, 0, 0, 0],
      snare: [0, 0, 0, 0,  1, 0, 0, 0,  0, 0, 0, 0,  1, 0, 0, 0],
      hihat: [1, 0, 1, 0,  1, 0, 1, 0,  1, 0, 1, 0,  1, 0, 1, 0],
      clap:  [0, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0]
    };
  } else if (name === "trap") {
    beatSeqState.tracks = {
      kick:  [1, 0, 0, 0,  0, 0, 0, 1,  0, 0, 1, 0,  0, 0, 0, 0],
      snare: [0, 0, 0, 0,  0, 0, 0, 0,  1, 0, 0, 0,  0, 0, 0, 0],
      hihat: [1, 1, 1, 1,  1, 1, 1, 1,  1, 1, 1, 1,  1, 1, 1, 1],
      clap:  [0, 0, 0, 0,  0, 0, 0, 0,  1, 0, 0, 0,  0, 0, 0, 0]
    };
  } else if (name === "clear") {
    beatSeqState.tracks = {
      kick:  [0, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0],
      snare: [0, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0],
      hihat: [0, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0],
      clap:  [0, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0]
    };
  }
  renderBeatSequencerGrid();
  showToast(`Loaded ${name.replace(/_/g, " ")} preset!`);
}

function renderMusicStudioView() {
  renderChordSlotsUI();
  renderDiatonicChordsUI();
  renderDrumSequencerUI();
  renderBeatSequencerGrid();
  updateMusicViewTimingResult();
  updateMusicViewNoteResult();
  renderPianoKeyboardUI();
  updateMusicScaleView();
  renderMetronomeDots();
  renderFretboardUI();
  renderTunerDisplay(null);
}

// --- 🎤 Live Microphone Chromatic Tuner & Pitch Detector ---
const micTunerState = {
  audioCtx: null,
  analyser: null,
  stream: null,
  isActive: false,
  animFrameId: null,
  noteName: "—",
  octave: "",
  freq: 0,
  cents: 0,
  smoothedCents: 0,
  smoothedFreq: 0
};

const CHROMATIC_NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function autoCorrelatePitch(buf, sampleRate) {
  const SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) {
    const val = buf[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.015) return -1; // Audio too quiet

  let r1 = 0, r2 = SIZE - 1, thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buf[i]) < thres) { r1 = i; break; }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
  }
  const bufSlice = buf.slice(r1, r2);
  const newSize = bufSlice.length;
  if (newSize < 2) return -1;

  const c = new Float32Array(newSize);
  for (let i = 0; i < newSize; i++) {
    for (let j = 0; j < newSize - i; j++) {
      c[i] = c[i] + bufSlice[j] * bufSlice[j + i];
    }
  }

  let d = 0;
  while (c[d] > c[d + 1]) d++;
  let maxval = -1, maxpos = -1;
  for (let i = d; i < newSize; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }
  let T0 = maxpos;
  if (T0 <= 0 || T0 >= newSize - 1) return (T0 > 0) ? (sampleRate / T0) : -1;

  // Parabolic interpolation for sub-bin precision
  const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);

  return sampleRate / T0;
}

const TUNER_INSTRUMENT_STRINGS = {
  guitar_std: [
    { note: "E", octave: 2, freq: 82.41, label: "6th String (Low E)" },
    { note: "A", octave: 2, freq: 110.00, label: "5th String (A)" },
    { note: "D", octave: 3, freq: 146.83, label: "4th String (D)" },
    { note: "G", octave: 3, freq: 196.00, label: "3rd String (G)" },
    { note: "B", octave: 3, freq: 246.94, label: "2nd String (B)" },
    { note: "E", octave: 4, freq: 329.63, label: "1st String (High E)" }
  ],
  guitar_dropd: [
    { note: "D", octave: 2, freq: 73.42, label: "6th String (Drop D)" },
    { note: "A", octave: 2, freq: 110.00, label: "5th String (A)" },
    { note: "D", octave: 3, freq: 146.83, label: "4th String (D)" },
    { note: "G", octave: 3, freq: 196.00, label: "3rd String (G)" },
    { note: "B", octave: 3, freq: 246.94, label: "2nd String (B)" },
    { note: "E", octave: 4, freq: 329.63, label: "1st String (High E)" }
  ],
  bass_std: [
    { note: "E", octave: 1, freq: 41.20, label: "4th String (Low E)" },
    { note: "A", octave: 1, freq: 55.00, label: "3rd String (A)" },
    { note: "D", octave: 2, freq: 73.42, label: "2nd String (D)" },
    { note: "G", octave: 2, freq: 98.00, label: "1st String (G)" }
  ],
  ukulele_std: [
    { note: "G", octave: 4, freq: 392.00, label: "4th String (High G)" },
    { note: "C", octave: 4, freq: 261.63, label: "3rd String (C)" },
    { note: "E", octave: 4, freq: 329.63, label: "2nd String (E)" },
    { note: "A", octave: 4, freq: 440.00, label: "1st String (A)" }
  ],
  violin_std: [
    { note: "G", octave: 3, freq: 196.00, label: "4th String (G)" },
    { note: "D", octave: 4, freq: 293.66, label: "3rd String (D)" },
    { note: "A", octave: 4, freq: 440.00, label: "2nd String (A)" },
    { note: "E", octave: 5, freq: 659.25, label: "1st String (High E)" }
  ]
};

function getNoteFromPitch(freq, concertA = 440) {
  const noteNum = 12 * (Math.log(freq / concertA) / Math.log(2)) + 69;
  const rounded = Math.round(noteNum);
  const noteName = CHROMATIC_NOTE_NAMES[((rounded % 12) + 12) % 12];
  const octave = Math.floor(rounded / 12) - 1;
  const targetFreq = concertA * Math.pow(2, (rounded - 69) / 12);
  const cents = Math.round(1200 * (Math.log(freq / targetFreq) / Math.log(2)));

  // Check instrument string match
  const presetKey = $("#music-tuner-preset")?.value || "chromatic";
  let stringLabel = "";
  if (TUNER_INSTRUMENT_STRINGS[presetKey]) {
    const list = TUNER_INSTRUMENT_STRINGS[presetKey];
    // Find closest open string
    let bestDist = Infinity;
    let bestStr = null;
    list.forEach(s => {
      const d = Math.abs(1200 * Math.log2(freq / s.freq));
      if (d < bestDist && d < 120) { // within a semitone
        bestDist = d;
        bestStr = s;
      }
    });
    if (bestStr) {
      stringLabel = bestStr.label;
    }
  }

  return { noteName, octave, targetFreq, cents, stringLabel };
}

function renderTunerDisplay(pitchData) {
  const container = $("#music-tuner-display");
  if (!container) return;

  if (!pitchData || pitchData.freq <= 0) {
    const isListening = micTunerState.isActive;
    container.innerHTML = `
      <div class="tuner-note-display">
        <span class="tuner-note-letter">${isListening ? "· · ·" : "—"}</span>
      </div>
      <div class="tuner-freq-readout">
        ${isListening ? "Listening... Play or hum a note into your microphone" : "Microphone tuner is stopped. Click Start to listen."}
      </div>
      <svg class="tuner-needle-svg" viewBox="0 0 320 120">
        <!-- Scale Arc -->
        <path d="M 40 100 A 120 120 0 0 1 280 100" fill="none" stroke="var(--border)" stroke-width="4"/>
        <line x1="160" y1="20" x2="160" y2="35" stroke="var(--green)" stroke-width="3"/>
        <text x="160" y="15" text-anchor="middle" font-size="10" font-weight="800" fill="var(--green)">IN TUNE</text>
        <text x="40" y="115" text-anchor="middle" font-size="9" fill="var(--muted)">-50¢</text>
        <text x="280" y="115" text-anchor="middle" font-size="9" fill="var(--muted)">+50¢</text>
        <!-- Needle centered idle -->
        <line x1="160" y1="110" x2="160" y2="40" stroke="var(--muted)" stroke-width="3" stroke-linecap="round"/>
        <circle cx="160" cy="110" r="6" fill="var(--muted)"/>
      </svg>
      <div>
        <span class="tuner-status-pill" style="background:var(--surface);border:1px solid var(--border);color:var(--muted)">
          ${isListening ? "🎙️ LISTENING..." : "STANDBY"}
        </span>
      </div>
    `;
    return;
  }

  const { noteName, octave, targetFreq, cents, freq, stringLabel } = pitchData;
  const clampedCents = Math.max(-50, Math.min(50, cents));

  // Needle angle: -50 cents = -45 deg, 0 = 0 deg, +50 cents = +45 deg
  const needleAngle = (clampedCents / 50) * 45;

  let statusClass = "in-tune";
  let statusText = "PERFECT IN TUNE · ±3¢";
  let needleColor = "#10b981";

  if (cents < -3) {
    statusClass = "flat";
    statusText = `FLAT (${cents}¢) · TUNE UP ↑`;
    needleColor = "#f59e0b";
  } else if (cents > 3) {
    statusClass = "sharp";
    statusText = `SHARP (+${cents}¢) · TUNE DOWN ↓`;
    needleColor = "#ef4444";
  }

  container.innerHTML = `
    <div class="tuner-note-display">
      <span class="tuner-note-letter" style="color:${statusClass === 'in-tune' ? '#10b981' : 'var(--ink)'}">${noteName}</span>
      <span class="tuner-note-octave">${octave}</span>
      ${stringLabel ? `<span class="materials-group-badge" style="font-size:11px;margin-left:6px">${stringLabel}</span>` : ""}
    </div>
    <div class="tuner-freq-readout">
      <strong>${freq.toFixed(1)} Hz</strong> <span style="color:var(--muted)">(Target: ${targetFreq.toFixed(1)} Hz)</span>
    </div>

    <svg class="tuner-needle-svg" viewBox="0 0 320 120">
      <!-- Scale Arc -->
      <path d="M 40 100 A 120 120 0 0 1 280 100" fill="none" stroke="var(--border)" stroke-width="4"/>
      <!-- In-tune center target zone -->
      <path d="M 150 25 A 120 120 0 0 1 170 25" fill="none" stroke="rgba(16, 185, 129, 0.4)" stroke-width="8"/>
      <line x1="160" y1="20" x2="160" y2="35" stroke="#10b981" stroke-width="3"/>
      <text x="160" y="15" text-anchor="middle" font-size="10" font-weight="900" fill="#10b981">IN TUNE</text>
      <!-- Graduation Ticks -->
      <line x1="95" y1="52" x2="102" y2="60" stroke="var(--border)" stroke-width="1.5"/>
      <line x1="225" y1="52" x2="218" y2="60" stroke="var(--border)" stroke-width="1.5"/>
      <text x="40" y="115" text-anchor="middle" font-size="9" fill="var(--muted)">-50¢</text>
      <text x="280" y="115" text-anchor="middle" font-size="9" fill="var(--muted)">+50¢</text>
      <!-- Pivoting Needle -->
      <g transform="rotate(${needleAngle}, 160, 110)">
        <line x1="160" y1="110" x2="160" y2="36" stroke="${needleColor}" stroke-width="3.5" stroke-linecap="round"/>
        <circle cx="160" cy="110" r="7" fill="${needleColor}"/>
      </g>
    </svg>

    <div>
      <span class="tuner-status-pill ${statusClass}">${statusText}</span>
    </div>
  `;
}

async function startMicTuner() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      showToast("Web Audio is not supported in this browser.");
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micTunerState.stream = stream;
    micTunerState.audioCtx = new AudioContext();
    const source = micTunerState.audioCtx.createMediaStreamSource(stream);
    const analyser = micTunerState.audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);

    micTunerState.analyser = analyser;
    micTunerState.isActive = true;

    const btn = $("#music-tuner-toggle-btn");
    if (btn) {
      btn.textContent = "⏹ Stop Tuner";
      btn.classList.add("button-danger");
    }

    runMicTunerLoop();
    showToast("Microphone Tuner started! Sing or play a note.");
  } catch (err) {
    showToast("Microphone access denied or unavailable.");
  }
}

function stopMicTuner() {
  micTunerState.isActive = false;
  if (micTunerState.animFrameId) {
    cancelAnimationFrame(micTunerState.animFrameId);
    micTunerState.animFrameId = null;
  }
  if (micTunerState.stream) {
    micTunerState.stream.getTracks().forEach(t => t.stop());
    micTunerState.stream = null;
  }
  if (micTunerState.audioCtx) {
    try { micTunerState.audioCtx.close(); } catch {}
    micTunerState.audioCtx = null;
  }

  const btn = $("#music-tuner-toggle-btn");
  if (btn) {
    btn.textContent = "🎙️ Start Microphone Tuner";
    btn.classList.remove("button-danger");
  }
  renderTunerDisplay(null);
}

function toggleMicTuner() {
  if (micTunerState.isActive) stopMicTuner();
  else void startMicTuner();
}

function runMicTunerLoop() {
  if (!micTunerState.isActive || !micTunerState.analyser) return;

  const buf = new Float32Array(micTunerState.analyser.fftSize);
  micTunerState.analyser.getFloatTimeDomainData(buf);

  const calib = parseFloat($("#music-tuner-calib")?.value) || 440;
  const sampleRate = micTunerState.audioCtx.sampleRate;
  const pitch = autoCorrelatePitch(buf, sampleRate);

  if (pitch !== -1 && pitch >= 30 && pitch <= 4200) {
    const details = getNoteFromPitch(pitch, calib);
    renderTunerDisplay({ ...details, freq: pitch });
  }

  micTunerState.animFrameId = requestAnimationFrame(runMicTunerLoop);
}

function initChordStudio() {
  renderChordSlotsUI();
  renderDiatonicChordsUI();
  renderDrumSequencerUI();
}

/* ============================================================
   📥 Bulk Workshop Inventory CSV Import
   ============================================================ */
let parsedInventoryImportItems = [];

function openImportInventoryDialog() {
  parsedInventoryImportItems = [];
  const fileInput = $("#inventory-csv-file");
  const textArea = $("#inventory-csv-text");
  const previewWrap = $("#inventory-csv-preview-wrap");
  const commitBtn = $("#inventory-csv-commit-btn");

  if (fileInput) fileInput.value = "";
  if (textArea) textArea.value = "";
  if (previewWrap) previewWrap.style.display = "none";
  if (commitBtn) commitBtn.disabled = true;

  $("#import-inventory-dialog")?.showModal();
}

function parseCSVLine(text) {
  const p = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      p.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  p.push(cur.trim());
  return p;
}

function parseInventoryCSV() {
  const fileInput = $("#inventory-csv-file");
  const textArea = $("#inventory-csv-text");
  let rawText = textArea?.value || "";

  if (fileInput?.files?.length) {
    const reader = new FileReader();
    reader.onload = e => {
      processInventoryCSVString(e.target.result);
    };
    reader.readAsText(fileInput.files[0]);
  } else if (rawText.trim()) {
    processInventoryCSVString(rawText);
  } else {
    showToast("Please choose a CSV file or paste CSV text to preview.");
  }
}

function loadInventoryCSVSample() {
  const ta = $("#inventory-csv-text");
  if (ta) {
    ta.value = `Name,Type,Category,Quantity,Unit,Cost,Location\n` +
      `3/4 Birch Plywood 4x8,Material,Sheet Goods,3,sheets,64.50,Lumber Rack B\n` +
      `DeWalt 20V Max XR Router,Equipment,Power Tools,1,unit,199.00,Tool Shelf 2\n` +
      `#8 x 1-1/4 Wood Screws,Material,Fasteners,250,pcs,12.99,Screw Bin 4\n` +
      `Starbond Medium CA Glue 2oz,Material,Adhesives,2,bottles,14.50,Finishing Cabinet\n` +
      `Kreg Pocket Hole Jig 720,Equipment,Joinery,1,unit,149.00,Workbench Drawer\n` +
      `220 Grit Sandpaper Roll,Material,Abrasives,5,meters,18.00,Sanding Station`;
    parseInventoryCSV();
  }
}

function processInventoryCSVString(str) {
  if (!str || !str.trim()) {
    showToast("No CSV data found.");
    return;
  }
  const lines = str.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 1) {
    showToast("CSV contains no rows.");
    return;
  }

  const firstRow = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[\s_-]+/g, ""));
  let hasHeader = firstRow.some(h => ["name", "item", "type", "category", "qty", "quantity", "price", "cost"].includes(h));

  const items = [];
  const startIndex = hasHeader ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const parts = parseCSVLine(lines[i]);
    if (!parts.length || !parts[0]) continue;

    let item = {
      id: uid(),
      type: "material",
      name: "",
      category: "Supplies",
      quantity: 1,
      unit: "units",
      price: 0,
      location: "",
      supplier: "",
      notes: ""
    };

    if (hasHeader) {
      parts.forEach((val, idx) => {
        const h = firstRow[idx] || "";
        if (h === "name" || h === "item") item.name = val;
        else if (h === "type") item.type = (val.toLowerCase().includes("equip") || val.toLowerCase().includes("tool")) ? "equipment" : "material";
        else if (h === "category") item.category = val || "Supplies";
        else if (h === "qty" || h === "quantity") item.quantity = parseFloat(val) || 1;
        else if (h === "unit") item.unit = val || "units";
        else if (h === "cost" || h === "price" || h === "unitcost" || h === "unitprice") item.price = parseFloat(val.replace(/[^0-9.]/g, "")) || 0;
        else if (h === "location") item.location = val;
        else if (h === "supplier") item.supplier = val;
        else if (h === "brand") item.brand = val;
        else if (h === "model") item.model = val;
        else if (h === "condition" || h === "status") item.condition = val.toLowerCase().replace(/\s+/g, "_");
        else if (h === "notes") item.notes = val;
      });
    } else {
      item.name = parts[0] || "Unnamed Item";
      if (parts[1]) item.type = (parts[1].toLowerCase().includes("equip") || parts[1].toLowerCase().includes("tool")) ? "equipment" : "material";
      if (parts[2]) item.category = parts[2];
      if (parts[3]) item.quantity = parseFloat(parts[3]) || 1;
      if (parts[4]) item.unit = parts[4];
      if (parts[5]) item.price = parseFloat(parts[5].replace(/[^0-9.]/g, "")) || 0;
      if (parts[6]) item.location = parts[6];
    }

    if (item.name) {
      if (item.type === "equipment") {
        item.cost = item.price;
        item.condition = item.condition || "operational";
        item.logbook = [];
      }
      item.createdAt = new Date().toISOString();
      item.updatedAt = new Date().toISOString();
      items.push(item);
    }
  }

  parsedInventoryImportItems = items;
  renderInventoryCSVPreview(items);
}

function renderInventoryCSVPreview(items) {
  const wrap = $("#inventory-csv-preview-wrap");
  const countEl = $("#inventory-csv-preview-count");
  const tableWrap = $("#inventory-csv-preview-table-wrap");
  const commitBtn = $("#inventory-csv-commit-btn");
  if (!wrap || !tableWrap) return;

  if (!items.length) {
    wrap.style.display = "none";
    if (commitBtn) commitBtn.disabled = true;
    showToast("Could not parse any valid items from that CSV.");
    return;
  }

  wrap.style.display = "block";
  if (countEl) countEl.textContent = `Found ${items.length} item${items.length === 1 ? "" : "s"} ready to import`;
  if (commitBtn) commitBtn.disabled = false;

  tableWrap.innerHTML = `
    <table class="materials-table" style="font-size:12px;margin:0">
      <thead>
        <tr>
          <th>Item Name</th>
          <th>Type</th>
          <th>Category</th>
          <th>Qty / Unit</th>
          <th>Unit Cost</th>
          <th>Location</th>
        </tr>
      </thead>
      <tbody>
        ${items.slice(0, 50).map(it => `
          <tr>
            <td><strong>${escapeHTML(it.name)}</strong></td>
            <td><span class="inventory-chip">${it.type === "equipment" ? "⚙️ Tool" : "📦 Material"}</span></td>
            <td>${escapeHTML(it.category || "General")}</td>
            <td>${it.type === "equipment" ? "1 unit" : `${it.quantity} ${escapeHTML(it.unit || "")}`}</td>
            <td>${it.price > 0 ? formatMoney(it.price) : "—"}</td>
            <td>${escapeHTML(it.location || "Shop")}</td>
          </tr>
        `).join("")}
        ${items.length > 50 ? `<tr><td colspan="6" style="text-align:center;color:var(--muted)">+ ${items.length - 50} more items...</td></tr>` : ""}
      </tbody>
    </table>
  `;
}

async function commitInventoryCSVImport() {
  if (!parsedInventoryImportItems.length) return;
  state.inventory = Array.isArray(state.inventory) ? state.inventory : [];
  state.inventory.unshift(...parsedInventoryImportItems);

  try {
    await persistState();
    renderInventory();
    $("#import-inventory-dialog")?.close();
    showToast(`🎉 Imported ${parsedInventoryImportItems.length} items to your workshop inventory!`);
    parsedInventoryImportItems = [];
  } catch (err) {
    console.error(err);
    showToast("Failed to save imported items.");
  }
}

/* ============================================================
   ⏱️ Live Project Crafting Session Stopwatch
   ============================================================ */
let liveCraftingSession = {
  projectId: null,
  projectTitle: "",
  startTime: null,
  elapsedSeconds: 0,
  intervalId: null,
  isRunning: false
};

function formatCraftingClock(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  if (h > 0) {
    return `${h}:${String(remM).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(remM).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function startProjectCraftingTimer(projectId) {
  const project = state.projects.find(p => p.id === projectId);
  if (!project) return;

  if (liveCraftingSession.isRunning && liveCraftingSession.projectId === project.id) {
    showToast("Crafting timer is already running for this project.");
    return;
  }

  if (liveCraftingSession.intervalId) {
    clearInterval(liveCraftingSession.intervalId);
  }

  liveCraftingSession.projectId = project.id;
  liveCraftingSession.projectTitle = project.title;
  liveCraftingSession.startTime = Date.now();
  liveCraftingSession.elapsedSeconds = 0;
  liveCraftingSession.isRunning = true;

  liveCraftingSession.intervalId = setInterval(() => {
    liveCraftingSession.elapsedSeconds++;
    updateLiveCraftingUI();
  }, 1000);

  updateLiveCraftingUI();
  if ($("#detail-dialog")?.open) renderProjectDetail(project.id);
  showToast(`⏱️ Started crafting session on “${project.title}”!`);
}

function toggleProjectCraftingTimer() {
  if (!liveCraftingSession.projectId) return;
  if (liveCraftingSession.isRunning) {
    clearInterval(liveCraftingSession.intervalId);
    liveCraftingSession.intervalId = null;
    liveCraftingSession.isRunning = false;
    showToast("Crafting timer paused.");
  } else {
    liveCraftingSession.isRunning = true;
    liveCraftingSession.intervalId = setInterval(() => {
      liveCraftingSession.elapsedSeconds++;
      updateLiveCraftingUI();
    }, 1000);
    showToast("Crafting timer resumed.");
  }
  updateLiveCraftingUI();
  if ($("#detail-dialog")?.open) renderProjectDetail(liveCraftingSession.projectId);
}

function updateLiveCraftingUI() {
  const topbarBtn = $("#topbar-timer-btn");
  if (topbarBtn) {
    if (liveCraftingSession.isRunning || liveCraftingSession.elapsedSeconds > 0) {
      topbarBtn.classList.add("topbar-focus-running");
      topbarBtn.textContent = `⏱️ ${formatCraftingClock(liveCraftingSession.elapsedSeconds)}`;
    }
  }

  const clockEl = $(".crafting-timer-clock");
  if (clockEl) {
    clockEl.textContent = formatCraftingClock(liveCraftingSession.elapsedSeconds);
  }
}

async function finishProjectCraftingTimer() {
  if (!liveCraftingSession.projectId) return;
  const project = state.projects.find(p => p.id === liveCraftingSession.projectId);
  if (!project) return;

  if (liveCraftingSession.intervalId) {
    clearInterval(liveCraftingSession.intervalId);
    liveCraftingSession.intervalId = null;
  }
  liveCraftingSession.isRunning = false;

  const totalMinutes = Math.max(1, Math.round(liveCraftingSession.elapsedSeconds / 60));
  project.timeSpent = (project.timeSpent || 0) + totalMinutes;
  project.updatedAt = new Date().toISOString();

  // Award XP to linked skills (+10 XP per 15m)
  const earnedXP = Math.max(5, Math.round((totalMinutes / 15) * 10));
  const linkedSkillIds = project.skillIds || [];
  if (linkedSkillIds.length > 0) {
    state.skills.forEach(s => {
      if (linkedSkillIds.includes(s.id)) {
        s.xp = (s.xp || 0) + earnedXP;
      }
    });
  }

  makeActivity("note", `Crafted on ${project.title} for ${formatMinutes(totalMinutes)} (+${earnedXP} XP)`);

  const prevTitle = project.title;
  liveCraftingSession = {
    projectId: null,
    projectTitle: "",
    startTime: null,
    elapsedSeconds: 0,
    intervalId: null,
    isRunning: false
  };

  const topbarBtn = $("#topbar-timer-btn");
  if (topbarBtn) {
    topbarBtn.classList.remove("topbar-focus-running");
    topbarBtn.textContent = "⏱️ Focus";
  }

  try {
    await persistState();
    render();
    if ($("#detail-dialog")?.open) renderProjectDetail(project.id);
    showToast(`🎉 Logged ${formatMinutes(totalMinutes)} & earned +${earnedXP} XP on ${prevTitle}!`);
  } catch (err) {
    console.error(err);
  }
}

/* ============================================================
   FEATURE 3: Workshop Tool Maintenance & Safety Tracker
   ============================================================ */
function renderToolMaintenance() {
  const container = $("#inventory-maintenance-section");
  if (!container) return;

  const list = state.maintenance || [];
  const now = new Date();

  const formattedItems = list.map(item => {
    const lastDate = new Date(item.lastServiced);
    const interval = parseInt(item.intervalDays, 10) || 30;
    const dueDate = new Date(lastDate);
    dueDate.setDate(dueDate.getDate() + interval);

    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let status = "good";
    let badgeHtml = "";
    if (diffDays < 0) {
      status = "overdue";
      badgeHtml = `<span class="maintenance-badge-overdue">⚠️ Overdue by ${Math.abs(diffDays)}d</span>`;
    } else if (diffDays <= 7) {
      status = "soon";
      badgeHtml = `<span class="maintenance-badge-soon">⏰ Due in ${diffDays}d</span>`;
    } else {
      status = "good";
      badgeHtml = `<span class="maintenance-badge-good">✓ Good (${diffDays}d left)</span>`;
    }

    return {
      ...item,
      status,
      diffDays,
      dueStr: dueDate.toISOString().slice(0, 10),
      badgeHtml
    };
  });

  formattedItems.sort((a, b) => a.diffDays - b.diffDays);

  const overdueCount = formattedItems.filter(i => i.status === "overdue").length;
  const soonCount = formattedItems.filter(i => i.status === "soon").length;

  container.innerHTML = `
    <div style="margin-top:28px;padding-top:20px;border-top:1px solid var(--line)">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <div>
          <h2 style="font-size:18px;margin:0">🧰 Equipment Maintenance &amp; Safety Tracker</h2>
          <span style="font-size:12px;color:var(--muted)">
            ${formattedItems.length} tool schedule${formattedItems.length === 1 ? "" : "s"}${overdueCount > 0 ? ` · <strong style="color:#ef4444">${overdueCount} overdue</strong>` : ""}${soonCount > 0 ? ` · <strong style="color:#d97706">${soonCount} due soon</strong>` : ""}
          </span>
        </div>
        <button type="button" class="button button-outline button-small" data-action="open-maintenance-dialog">+ Schedule Tool Care</button>
      </div>

      ${formattedItems.length === 0 ? `
        <div class="inventory-empty" style="margin-top:14px">
          <p>No equipment service schedules yet. Track table saw blade sharpening, 3D printer nozzle swaps, dust filter cleaning, and CNC lubrication.</p>
          <button type="button" class="button button-primary button-small" data-action="open-maintenance-dialog">+ Schedule First Tool</button>
        </div>
      ` : `
        <div class="maintenance-grid">
          ${formattedItems.map(item => `
            <div class="maintenance-card ${item.status === "overdue" ? "status-overdue" : ""}">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px">
                <div>
                  <h3 style="font-size:15px;margin:0 0 2px 0">${escapeHTML(item.toolName)}</h3>
                  <div style="font-size:12px;color:var(--muted)">Interval: Every ${item.intervalDays} days</div>
                </div>
                ${item.badgeHtml}
              </div>

              <div style="font-size:13px;font-weight:600;color:var(--ink)">
                🔧 ${escapeHTML(item.task)}
              </div>

              ${item.notes ? `
                <div style="font-size:11px;color:var(--muted);background:var(--surface-hover);padding:6px 8px;border-radius:4px;border-left:3px solid var(--accent)">
                  🦺 <strong>SOP / Safety:</strong> ${escapeHTML(item.notes)}
                </div>
              ` : ""}

              <div style="font-size:11px;color:var(--muted);display:flex;justify-content:space-between;margin-top:auto;padding-top:6px;border-top:1px solid var(--line)">
                <span>Last: ${item.lastServiced}</span>
                <span>Next due: ${item.dueStr}</span>
              </div>

              <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-top:6px">
                <button type="button" class="button button-outline button-small" data-action="log-service-today" data-id="${item.id}" title="Record maintenance completed today">✓ Log Service Today</button>
                <div style="display:flex;gap:4px">
                  <button type="button" class="icon-link-btn" data-action="edit-maintenance" data-id="${item.id}" title="Edit schedule">✎</button>
                  <button type="button" class="icon-link-btn danger-hover" data-action="delete-maintenance" data-id="${item.id}" title="Remove schedule">×</button>
                </div>
              </div>
            </div>
          `).join("")}
        </div>
      `}
    </div>
  `;
}

function openMaintenanceDialog(item = null) {
  const form = $("#maintenance-form");
  const dialog = $("#maintenance-dialog");
  const delBtn = $("#delete-maintenance-btn");
  const title = $("#maintenance-dialog-title");
  if (!form || !dialog) return;

  form.reset();
  if (item) {
    if (title) title.textContent = "Edit Tool Maintenance";
    form.elements.id.value = item.id;
    form.elements.toolName.value = item.toolName || "";
    form.elements.task.value = item.task || "";
    form.elements.intervalDays.value = item.intervalDays || 30;
    form.elements.lastServiced.value = item.lastServiced || new Date().toISOString().slice(0, 10);
    form.elements.notes.value = item.notes || "";
    if (delBtn) delBtn.classList.remove("hidden");
  } else {
    if (title) title.textContent = "Schedule Tool Maintenance";
    form.elements.id.value = "";
    form.elements.lastServiced.value = new Date().toISOString().slice(0, 10);
    if (delBtn) delBtn.classList.add("hidden");
  }
  dialog.showModal();
}

async function handleMaintenanceSubmit(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const id = form.elements.id.value;
  const toolName = form.elements.toolName.value.trim();
  const task = form.elements.task.value.trim();
  const intervalDays = parseInt(form.elements.intervalDays.value, 10) || 30;
  const lastServiced = form.elements.lastServiced.value || new Date().toISOString().slice(0, 10);
  const notes = form.elements.notes.value.trim();

  state.maintenance = state.maintenance || [];

  if (id) {
    const item = state.maintenance.find(m => m.id === id);
    if (item) {
      item.toolName = toolName;
      item.task = task;
      item.intervalDays = intervalDays;
      item.lastServiced = lastServiced;
      item.notes = notes;
    }
  } else {
    state.maintenance.push({
      id: uid(),
      toolName,
      task,
      intervalDays,
      lastServiced,
      notes
    });
  }

  try {
    await persistState();
    $("#maintenance-dialog")?.close();
    renderToolMaintenance();
    showToast(`Maintenance schedule saved for “${toolName}”!`);
  } catch (err) {
    console.error(err);
    showToast("Could not save maintenance schedule.");
  }
}

async function logServiceToday(id) {
  const item = (state.maintenance || []).find(m => m.id === id);
  if (!item) return;

  item.lastServiced = new Date().toISOString().slice(0, 10);

  // Cross-link with equipment inventory logbook if matching tool exists in depot
  const eq = (state.inventory || []).find(i => i.type === "equipment" && (
    (item.inventoryId && i.id === item.inventoryId) ||
    i.name.trim().toLowerCase() === item.toolName.trim().toLowerCase()
  ));
  if (eq) {
    eq.logbook = Array.isArray(eq.logbook) ? eq.logbook : [];
    eq.logbook.push({
      id: uid(),
      date: new Date().toISOString(),
      type: "service",
      title: `Scheduled Care: ${item.task || "Routine maintenance"}`,
      notes: `Logged via Workshop Maintenance Schedule (${item.intervalDays || 30} day interval).`
    });
    if (eq.condition === "maintenance_needed") {
      eq.condition = "operational";
    }
    eq.updatedAt = new Date().toISOString();
  }

  try {
    await persistState();
    makeActivity("project", `Serviced ${item.toolName}: ${item.task}`);
    renderToolMaintenance();
    renderInventory();
    showToast(`✓ Logged maintenance for “${item.toolName}” today!`);
  } catch (err) {
    console.error(err);
    showToast("Could not update service log.");
  }
}

async function deleteMaintenance(id) {
  const item = (state.maintenance || []).find(m => m.id === id);
  if (!item) return;
  if (!window.confirm(`Delete service schedule for “${item.toolName}”?`)) return;

  state.maintenance = (state.maintenance || []).filter(m => m.id !== id);
  try {
    await persistState();
    $("#maintenance-dialog")?.close();
    renderToolMaintenance();
    showToast("Service schedule removed.");
  } catch (err) {
    console.error(err);
    showToast("Could not remove maintenance schedule.");
  }
}

/* ============================================================
   FEATURE 4: Ambient Workshop Soundscapes (Web Audio procedural)
   ============================================================ */
let soundscapeAudioCtx = null;
let activeSoundscape = "off";
let soundscapeMasterGain = null;
let soundscapeNodes = [];

function initSoundscapeContext() {
  if (!soundscapeAudioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    soundscapeAudioCtx = new AudioContextClass();
    soundscapeMasterGain = soundscapeAudioCtx.createGain();
    const volInput = $("#soundscape-volume");
    soundscapeMasterGain.gain.setValueAtTime(volInput ? parseFloat(volInput.value) : 0.5, soundscapeAudioCtx.currentTime);
    soundscapeMasterGain.connect(soundscapeAudioCtx.destination);
  }
  if (soundscapeAudioCtx.state === "suspended") {
    soundscapeAudioCtx.resume();
  }
  return soundscapeAudioCtx;
}

function stopCurrentSoundscape() {
  for (const node of soundscapeNodes) {
    try {
      if (typeof node.stop === "function") node.stop();
      if (typeof node.disconnect === "function") node.disconnect();
    } catch {}
  }
  soundscapeNodes = [];
}

function toggleSoundscape(track) {
  if (activeSoundscape === track && track !== "off") {
    track = "off";
  }
  activeSoundscape = track;
  stopCurrentSoundscape();
  updateSoundscapeButtons();

  if (track === "off") {
    return;
  }

  const ctx = initSoundscapeContext();
  if (!ctx) return;

  if (track === "rain") {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1200, ctx.currentTime);

    noise.connect(filter);
    filter.connect(soundscapeMasterGain);
    noise.start();
    soundscapeNodes.push(noise, filter);

  } else if (track === "brown") {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(600, ctx.currentTime);

    noise.connect(filter);
    filter.connect(soundscapeMasterGain);
    noise.start();
    soundscapeNodes.push(noise, filter);

  } else if (track === "hum") {
    const osc60 = ctx.createOscillator();
    osc60.type = "sine";
    osc60.frequency.setValueAtTime(60, ctx.currentTime);

    const osc120 = ctx.createOscillator();
    osc120.type = "sine";
    osc120.frequency.setValueAtTime(120, ctx.currentTime);

    const humGain = ctx.createGain();
    humGain.gain.setValueAtTime(0.08, ctx.currentTime);

    osc60.connect(humGain);
    osc120.connect(humGain);
    humGain.connect(soundscapeMasterGain);

    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.04;
    const airNoise = ctx.createBufferSource();
    airNoise.buffer = buffer;
    airNoise.loop = true;

    const airFilter = ctx.createBiquadFilter();
    airFilter.type = "bandpass";
    airFilter.frequency.setValueAtTime(320, ctx.currentTime);
    airFilter.Q.setValueAtTime(3, ctx.currentTime);

    airNoise.connect(airFilter);
    airFilter.connect(soundscapeMasterGain);

    osc60.start();
    osc120.start();
    airNoise.start();
    soundscapeNodes.push(osc60, osc120, humGain, airNoise, airFilter);

  } else if (track === "fire") {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.015 * white)) / 1.015;
      lastOut = data[i];
      if (Math.random() < 0.0006) {
        data[i] += (Math.random() * 2 - 1) * 0.8;
      }
      data[i] *= 2.8;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, ctx.currentTime);

    noise.connect(filter);
    filter.connect(soundscapeMasterGain);
    noise.start();
    soundscapeNodes.push(noise, filter);
  }
}

function updateSoundscapeButtons() {
  $$(".soundscape-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.track === activeSoundscape);
  });
  const timerBtn = $("#topbar-timer-btn");
  if (timerBtn) {
    if (activeSoundscape !== "off") {
      timerBtn.classList.add("button-primary");
      timerBtn.classList.remove("button-outline");
      const name = activeSoundscape.charAt(0).toUpperCase() + activeSoundscape.slice(1);
      timerBtn.textContent = `⏱️ Focus (${name})`;
    } else {
      timerBtn.classList.remove("button-primary");
      timerBtn.classList.add("button-outline");
      timerBtn.textContent = "⏱️ Focus & Sounds";
    }
  }
}

function setSoundscapeVolume(val) {
  const v = parseFloat(val);
  if (soundscapeMasterGain && soundscapeAudioCtx && Number.isFinite(v)) {
    soundscapeMasterGain.gain.setValueAtTime(v, soundscapeAudioCtx.currentTime);
  }
}

function toggleSoundscapePanel() {
  const timerDialog = $("#timer-dialog");
  if (!timerDialog?.open) {
    openTimerDialog();
  }
}

/* ============================================================
   FEATURE 5: 2D Blueprint & Dimensioned Sketchpad
   ============================================================ */
let activeBlueprintProjectId = null;
let blueprintTool = "pencil";
let blueprintGrid = "square";
let blueprintColor = "#1e40af";
let blueprintCanvas = null;
let blueprintCtx = null;
let blueprintIsDrawing = false;
let blueprintStartX = 0;
let blueprintStartY = 0;
let blueprintSnapshot = null;
let blueprintHistory = [];
let blueprintEventsAttached = false;

function openProjectBlueprint(projectId) {
  const project = state.projects.find(p => p.id === projectId);
  if (!project) return;
  activeBlueprintProjectId = project.id;

  const title = $("#blueprint-dialog-title");
  if (title) title.textContent = `Blueprint & Sketchpad · ${project.title}`;

  $("#blueprint-dialog")?.showModal();
  setTimeout(() => initBlueprintCanvas(), 60);
}

function initBlueprintCanvas() {
  blueprintCanvas = $("#blueprint-canvas");
  if (!blueprintCanvas) return;
  blueprintCtx = blueprintCanvas.getContext("2d");

  const wrap = $("#blueprint-canvas-wrap");
  if (wrap) {
    const rect = wrap.getBoundingClientRect();
    if (rect.width > 200) {
      blueprintCanvas.width = Math.floor(rect.width);
      blueprintCanvas.height = Math.floor(rect.height || 480);
    }
  }

  blueprintHistory = [];
  redrawBlueprintGrid();
  attachBlueprintEvents();
}

function redrawBlueprintGrid() {
  if (!blueprintCtx || !blueprintCanvas) return;
  const w = blueprintCanvas.width;
  const h = blueprintCanvas.height;

  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  blueprintCtx.fillStyle = isDark ? "#0f172a" : "#ffffff";
  blueprintCtx.fillRect(0, 0, w, h);

  if (blueprintGrid === "square") {
    blueprintCtx.lineWidth = 1;
    blueprintCtx.strokeStyle = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
    for (let x = 0; x <= w; x += 20) {
      blueprintCtx.beginPath();
      blueprintCtx.moveTo(x, 0);
      blueprintCtx.lineTo(x, h);
      blueprintCtx.stroke();
    }
    for (let y = 0; y <= h; y += 20) {
      blueprintCtx.beginPath();
      blueprintCtx.moveTo(0, y);
      blueprintCtx.lineTo(w, y);
      blueprintCtx.stroke();
    }
    blueprintCtx.strokeStyle = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.13)";
    for (let x = 0; x <= w; x += 100) {
      blueprintCtx.beginPath();
      blueprintCtx.moveTo(x, 0);
      blueprintCtx.lineTo(x, h);
      blueprintCtx.stroke();
    }
    for (let y = 0; y <= h; y += 100) {
      blueprintCtx.beginPath();
      blueprintCtx.moveTo(0, y);
      blueprintCtx.lineTo(w, y);
      blueprintCtx.stroke();
    }
  } else if (blueprintGrid === "isometric") {
    blueprintCtx.lineWidth = 1;
    blueprintCtx.strokeStyle = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
    const step = 30;
    const tan30 = Math.tan(Math.PI / 6);
    for (let x = -h; x <= w + h; x += step) {
      blueprintCtx.beginPath();
      blueprintCtx.moveTo(x, 0);
      blueprintCtx.lineTo(x + h * tan30, h);
      blueprintCtx.stroke();

      blueprintCtx.beginPath();
      blueprintCtx.moveTo(x, 0);
      blueprintCtx.lineTo(x - h * tan30, h);
      blueprintCtx.stroke();
    }
  }

  pushBlueprintSnapshot();
}

function pushBlueprintSnapshot() {
  if (!blueprintCtx || !blueprintCanvas) return;
  try {
    const data = blueprintCtx.getImageData(0, 0, blueprintCanvas.width, blueprintCanvas.height);
    blueprintHistory.push(data);
    if (blueprintHistory.length > 25) blueprintHistory.shift();
  } catch {}
}

function blueprintUndo() {
  if (blueprintHistory.length > 1) {
    blueprintHistory.pop();
    const previous = blueprintHistory[blueprintHistory.length - 1];
    if (previous && blueprintCtx) {
      blueprintCtx.putImageData(previous, 0, 0);
    }
  } else if (blueprintHistory.length === 1) {
    const initial = blueprintHistory[0];
    if (initial && blueprintCtx) blueprintCtx.putImageData(initial, 0, 0);
  }
}

function blueprintClear() {
  if (!window.confirm("Clear the blueprint sketchpad?")) return;
  blueprintHistory = [];
  redrawBlueprintGrid();
}

function attachBlueprintEvents() {
  if (blueprintEventsAttached || !blueprintCanvas) return;
  blueprintEventsAttached = true;

  const getCanvasCoords = e => {
    const rect = blueprintCanvas.getBoundingClientRect();
    const touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
    const clientX = touch ? touch.clientX : e.clientX;
    const clientY = touch ? touch.clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (blueprintCanvas.width / rect.width),
      y: (clientY - rect.top) * (blueprintCanvas.height / rect.height)
    };
  };

  const handleStart = e => {
    blueprintIsDrawing = true;
    const pos = getCanvasCoords(e);
    blueprintStartX = pos.x;
    blueprintStartY = pos.y;
    blueprintSnapshot = blueprintCtx.getImageData(0, 0, blueprintCanvas.width, blueprintCanvas.height);

    if (blueprintTool === "pencil" || blueprintTool === "eraser") {
      blueprintCtx.beginPath();
      blueprintCtx.moveTo(pos.x, pos.y);
      blueprintCtx.lineWidth = blueprintTool === "eraser" ? 18 : 2.5;
      blueprintCtx.lineCap = "round";
      blueprintCtx.strokeStyle = blueprintTool === "eraser" ? (document.documentElement.getAttribute("data-theme") === "dark" ? "#0f172a" : "#ffffff") : blueprintColor;
    }
  };

  const handleMove = e => {
    if (!blueprintIsDrawing || !blueprintCtx) return;
    if (e.cancelable && e.type && e.type.startsWith("touch")) e.preventDefault();
    const pos = getCanvasCoords(e);

    if (blueprintTool === "pencil" || blueprintTool === "eraser") {
      blueprintCtx.lineTo(pos.x, pos.y);
      blueprintCtx.stroke();
    } else {
      blueprintCtx.putImageData(blueprintSnapshot, 0, 0);
      blueprintCtx.lineWidth = 2.5;
      blueprintCtx.strokeStyle = blueprintColor;

      if (blueprintTool === "line") {
        blueprintCtx.beginPath();
        blueprintCtx.moveTo(blueprintStartX, blueprintStartY);
        blueprintCtx.lineTo(pos.x, pos.y);
        blueprintCtx.stroke();
      } else if (blueprintTool === "rect") {
        blueprintCtx.strokeRect(blueprintStartX, blueprintStartY, pos.x - blueprintStartX, pos.y - blueprintStartY);
      } else if (blueprintTool === "circle") {
        const radius = Math.hypot(pos.x - blueprintStartX, pos.y - blueprintStartY);
        blueprintCtx.beginPath();
        blueprintCtx.arc(blueprintStartX, blueprintStartY, radius, 0, Math.PI * 2);
        blueprintCtx.stroke();
      } else if (blueprintTool === "dimension") {
        drawDimensionLine(blueprintStartX, blueprintStartY, pos.x, pos.y, false);
      }
    }
  };

  const handleEnd = e => {
    if (!blueprintIsDrawing || !blueprintCtx) return;
    blueprintIsDrawing = false;
    const pos = getCanvasCoords(e);

    if (blueprintTool === "dimension") {
      blueprintCtx.putImageData(blueprintSnapshot, 0, 0);
      const distPx = Math.round(Math.hypot(pos.x - blueprintStartX, pos.y - blueprintStartY));
      if (distPx > 10) {
        const estInches = (distPx / 20).toFixed(1).replace(/\.0$/, "");
        const label = window.prompt("Enter dimension measurement label:", `${estInches}"`);
        if (label !== null) {
          drawDimensionLine(blueprintStartX, blueprintStartY, pos.x, pos.y, true, label.trim() || `${estInches}"`);
        }
      }
    }

    pushBlueprintSnapshot();
  };

  blueprintCanvas.addEventListener("mousedown", handleStart);
  window.addEventListener("mousemove", handleMove);
  window.addEventListener("mouseup", handleEnd);

  blueprintCanvas.addEventListener("touchstart", handleStart, { passive: false });
  window.addEventListener("touchmove", handleMove, { passive: false });
  window.addEventListener("touchend", handleEnd);
  window.addEventListener("touchcancel", handleEnd);
}

function drawDimensionLine(x1, y1, x2, y2, commit, labelText = "") {
  if (!blueprintCtx) return;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 5) return;

  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const tickLen = 8;

  blueprintCtx.save();
  blueprintCtx.strokeStyle = blueprintColor;
  blueprintCtx.fillStyle = blueprintColor;
  blueprintCtx.lineWidth = 1.5;

  blueprintCtx.beginPath();
  blueprintCtx.moveTo(x1, y1);
  blueprintCtx.lineTo(x2, y2);
  blueprintCtx.stroke();

  blueprintCtx.beginPath();
  blueprintCtx.moveTo(x1 + px * tickLen, y1 + py * tickLen);
  blueprintCtx.lineTo(x1 - px * tickLen, y1 - py * tickLen);
  blueprintCtx.moveTo(x2 + px * tickLen, y2 + py * tickLen);
  blueprintCtx.lineTo(x2 - px * tickLen, y2 - py * tickLen);
  blueprintCtx.stroke();

  if (labelText) {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    blueprintCtx.font = "bold 12px monospace";
    blueprintCtx.textAlign = "center";
    blueprintCtx.textBaseline = "middle";

    const textWidth = blueprintCtx.measureText(labelText).width;
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";

    blueprintCtx.fillStyle = isDark ? "#1e293b" : "#ffffff";
    blueprintCtx.fillRect(midX - (textWidth / 2) - 6, midY - 9, textWidth + 12, 18);
    blueprintCtx.strokeStyle = blueprintColor;
    blueprintCtx.lineWidth = 1;
    blueprintCtx.strokeRect(midX - (textWidth / 2) - 6, midY - 9, textWidth + 12, 18);

    blueprintCtx.fillStyle = blueprintColor;
    blueprintCtx.fillText(labelText, midX, midY);
  }

  blueprintCtx.restore();
}

function setBlueprintTool(tool) {
  blueprintTool = tool;
  $$(".blueprint-tool-btn[data-tool]").forEach(b => b.classList.toggle("active", b.dataset.tool === tool));
}

function setBlueprintGrid(grid) {
  blueprintGrid = grid;
  $$(".blueprint-tool-btn[data-grid]").forEach(b => b.classList.toggle("active", b.dataset.grid === grid));
  redrawBlueprintGrid();
}

function setBlueprintColor(color) {
  blueprintColor = color;
  $$(".blueprint-color-circle").forEach(c => c.classList.toggle("active", c.dataset.color === color));
}

async function saveBlueprintToProject() {
  if (!activeBlueprintProjectId || !blueprintCanvas) return;
  const project = state.projects.find(p => p.id === activeBlueprintProjectId);
  if (!project) return;

  try {
    blueprintCanvas.toBlob(async blob => {
      if (!blob) {
        showToast("Could not generate blueprint image.");
        return;
      }
      project.folders = project.folders || [];
      let folder = project.folders.find(f => f.name.toLowerCase() === "blueprints");
      if (!folder) {
        folder = { id: uid(), name: "Blueprints", images: [] };
        project.folders.push(folder);
      }
      folder.images = folder.images || [];
      folder.images.push({
        id: uid(),
        name: `Blueprint ${new Date().toLocaleDateString()}`,
        type: "image/png",
        blob: blob,
        addedAt: new Date().toISOString()
      });

      project.updatedAt = new Date().toISOString();
      makeActivity("photo", `Drafted new 2D blueprint for ${project.title}`);

      await persistState();
      render();
      if ($("#detail-dialog")?.open) renderProjectDetail(project.id);
      $("#blueprint-dialog")?.close();
      showToast("💾 Blueprint saved to project photos in 'Blueprints'!");
    }, "image/png");
  } catch (e) {
    console.error(e);
    showToast("Could not save blueprint.");
  }
}

/* ============================================================
   FEATURE 6: Currency & Measurement System Standards
   ============================================================ */
function getCurrentMakerIdentity() {
  const user = getActiveUser();
  if (user) {
    return {
      id: user.id,
      name: user.displayName || (user.email ? user.email.split("@")[0] : "Maker"),
      email: user.email || ""
    };
  }
  return {
    id: "local-maker",
    name: "Studio Maker",
    email: "local@workbench.maker"
  };
}

function openUnitsModal() {
  const dialog = $("#units-dialog");
  if (!dialog) return;
  const currSelect = $("#units-currency-select");
  const unitSelect = $("#units-system-select");
  if (currSelect) currSelect.value = state.currency || localStorage.getItem("workbench_currency") || "USD";
  if (unitSelect) unitSelect.value = state.unitSystem || localStorage.getItem("workbench_unitSystem") || "in";
  dialog.showModal();
}

async function saveUnitsSettings() {
  const oldCurr = state.currency || "USD";
  const newCurr = $("#units-currency-select")?.value || "USD";
  const autoConvertCurr = $("#units-auto-convert-currency")?.checked;

  const oldUnit = state.unitSystem || "in";
  const newUnit = $("#units-system-select")?.value || "in";
  const autoConvertUnits = $("#units-auto-convert-measurements")?.checked;

  let convertedPricesCount = 0;
  if (autoConvertCurr && oldCurr !== newCurr && CURRENCIES[oldCurr] && CURRENCIES[newCurr]) {
    const oldRate = CURRENCIES[oldCurr].rate;
    const newRate = CURRENCIES[newCurr].rate;
    const ratio = newRate / oldRate;

    for (const p of state.projects) {
      if (Number.isFinite(p.budget) && p.budget > 0) {
        p.budget = Math.round(p.budget * ratio * 100) / 100;
        convertedPricesCount++;
      }
      if (Number.isFinite(p.laborRate) && p.laborRate > 0) {
        p.laborRate = Math.round(p.laborRate * ratio * 100) / 100;
      }
      for (const m of (p.materials || [])) {
        if (Number.isFinite(Number(m.cost)) && Number(m.cost) > 0) {
          m.cost = Math.round(Number(m.cost) * ratio * 100) / 100;
          convertedPricesCount++;
        }
      }
    }
    for (const item of (state.inventory || [])) {
      const priceVal = Number(item.cost != null ? item.cost : item.price);
      if (Number.isFinite(priceVal) && priceVal > 0) {
        const converted = Math.round(priceVal * ratio * 100) / 100;
        item.cost = converted;
        item.price = converted;
        convertedPricesCount++;
      }
    }
  }
  state.currency = newCurr;
  try { localStorage.setItem("workbench_currency", newCurr); } catch {}

  const UNIT_FACTORS = { in: 1, cm: 2.54, mm: 25.4 };
  let convertedUnitsCount = 0;
  if (autoConvertUnits && oldUnit !== newUnit && UNIT_FACTORS[oldUnit] && UNIT_FACTORS[newUnit]) {
    const unitRatio = UNIT_FACTORS[newUnit] / UNIT_FACTORS[oldUnit];

    const stockInput = $("#tool-cut-stock");
    if (stockInput && stockInput.value) {
      const val = parseFloat(stockInput.value);
      if (Number.isFinite(val) && val > 0) {
        stockInput.value = (val * unitRatio).toFixed(1).replace(/\.0$/, "");
      }
    }
    const kerfInput = $("#tool-cut-kerf");
    if (kerfInput && kerfInput.value) {
      const kval = parseFloat(kerfInput.value);
      if (Number.isFinite(kval) && kval > 0) {
        kerfInput.value = (kval * unitRatio).toFixed(2).replace(/0$/, "").replace(/\.0$/, "");
      }
    }
    const piecesInput = $("#tool-cut-pieces");
    if (piecesInput && piecesInput.value) {
      piecesInput.value = piecesInput.value.split("\n").map(line => {
        const m = line.match(/^([0-9.]+)(\s*(?:[xX*]|qty|count)?\s*[0-9]+)?(.*)$/);
        if (m) {
          const len = parseFloat(m[1]);
          const newLen = (len * unitRatio).toFixed(1).replace(/\.0$/, "");
          return `${newLen}${m[2] || ""}${m[3] || ""}`;
        }
        return line;
      }).join("\n");
    }

    for (const p of state.projects) {
      for (const m of (p.materials || [])) {
        if (m.qty && typeof m.qty === "string") {
          m.qty = m.qty.replace(/([0-9.]+)\s*(in|inch|inches|"|cm|mm)\b/gi, (match, num, unit) => {
            const u = (unit === '"' || unit.toLowerCase().startsWith("in")) ? "in" : unit.toLowerCase();
            const factor = UNIT_FACTORS[newUnit] / (UNIT_FACTORS[u] || 1);
            const converted = (parseFloat(num) * factor).toFixed(1).replace(/\.0$/, "");
            convertedUnitsCount++;
            return `${converted} ${newUnit}`;
          });
        }
      }
    }
  }
  state.unitSystem = newUnit;
  try { localStorage.setItem("workbench_unitSystem", newUnit); } catch {}
  updateTopbarUnitsPill();
  try {
    await persistState();
    $("#units-dialog")?.close();
    render();
    if ($("#detail-dialog")?.open && activeProjectId) {
      renderProjectDetail(activeProjectId);
    }
    let msg = `Preferences updated: ${CURRENCIES[newCurr].name} · ${newUnit.toUpperCase()}`;
    if (convertedPricesCount > 0 || convertedUnitsCount > 0) {
      msg += ` (Converted ${convertedPricesCount} sums & ${convertedUnitsCount} dimensions)`;
    }
    showToast(msg);
  } catch (err) {
    console.error(err);
    showToast("Could not save unit preferences.");
  }
}

/* ============================================================
   FEATURE 7: Formatted Markdown Document Printing
   ============================================================ */
function formatInlineMarkdown(str) {
  let s = escapeHTML(str);
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  return s;
}

function renderMarkdownToHTML(md) {
  if (!md) return "";
  const lines = md.split("\n");
  const output = [];
  let inList = false;
  let inCodeBlock = false;
  let codeBlockBuffer = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];

    if (rawLine.trim().startsWith("```")) {
      if (inCodeBlock) {
        output.push(`<pre><code>${escapeHTML(codeBlockBuffer.join("\n"))}</code></pre>`);
        codeBlockBuffer = [];
        inCodeBlock = false;
      } else {
        if (inList) { output.push("</ul>"); inList = false; }
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(rawLine);
      continue;
    }

    const trimmed = rawLine.trim();

    if (!trimmed) {
      if (inList) { output.push("</ul>"); inList = false; }
      continue;
    }

    if (trimmed.startsWith("# ")) {
      if (inList) { output.push("</ul>"); inList = false; }
      output.push(`<h1>${formatInlineMarkdown(trimmed.slice(2))}</h1>`);
      continue;
    }
    if (trimmed.startsWith("## ")) {
      if (inList) { output.push("</ul>"); inList = false; }
      output.push(`<h2>${formatInlineMarkdown(trimmed.slice(3))}</h2>`);
      continue;
    }
    if (trimmed.startsWith("### ")) {
      if (inList) { output.push("</ul>"); inList = false; }
      output.push(`<h3>${formatInlineMarkdown(trimmed.slice(4))}</h3>`);
      continue;
    }
    if (trimmed.startsWith("#### ")) {
      if (inList) { output.push("</ul>"); inList = false; }
      output.push(`<h4>${formatInlineMarkdown(trimmed.slice(5))}</h4>`);
      continue;
    }

    if (trimmed.startsWith("> ")) {
      if (inList) { output.push("</ul>"); inList = false; }
      output.push(`<blockquote>${formatInlineMarkdown(trimmed.slice(2))}</blockquote>`);
      continue;
    }

    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      if (inList) { output.push("</ul>"); inList = false; }
      output.push("<hr>");
      continue;
    }

    if (/^[-*]\s+\[([ xX])\]\s+(.*)/.test(trimmed)) {
      if (!inList) { output.push('<ul class="markdown-checklist">'); inList = true; }
      const match = trimmed.match(/^[-*]\s+\[([ xX])\]\s+(.*)/);
      const isChecked = match[1].toLowerCase() === "x";
      output.push(`<li class="checklist-item ${isChecked ? "checklist-checked" : "checklist-unchecked"}">${isChecked ? "☑" : "☐"} ${formatInlineMarkdown(match[2])}</li>`);
      continue;
    }

    if (/^[-*]\s+(.*)/.test(trimmed)) {
      if (!inList) { output.push("<ul>"); inList = true; }
      const match = trimmed.match(/^[-*]\s+(.*)/);
      output.push(`<li>${formatInlineMarkdown(match[1])}</li>`);
      continue;
    }

    if (inList) { output.push("</ul>"); inList = false; }
    output.push(`<p>${formatInlineMarkdown(trimmed)}</p>`);
  }

  if (inCodeBlock) {
    output.push(`<pre><code>${escapeHTML(codeBlockBuffer.join("\n"))}</code></pre>`);
  }
  if (inList) {
    output.push("</ul>");
  }

  return output.join("\n");
}

function printFormattedMarkdown(projectId) {
  const project = state.projects.find(p => p.id === (projectId || activeShowcaseProjectId));
  if (!project) return;
  const md = generateProjectMarkdown(project);
  const html = renderMarkdownToHTML(md);

  const printWin = window.open("", "_blank", "width=850,height=900");
  if (!printWin) {
    window.print();
    return;
  }
  try {
    printWin.opener = null;
  } catch {}

  printWin.document.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>${escapeHTML(project.title)} — Markdown Document</title>
        <style>
          @page { margin: 18mm 16mm; size: auto; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #111827;
            background: #fff;
            line-height: 1.6;
            margin: 0;
            padding: 32px;
            max-width: 820px;
            margin-left: auto;
            margin-right: auto;
          }
          .formatted-markdown-doc {
            font-size: 14px;
          }
          h1, h2, h3, h4 {
            color: #111827;
            font-weight: 700;
            line-height: 1.3;
            margin-top: 1.4em;
            margin-bottom: 0.5em;
          }
          h1 {
            font-size: 26px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 8px;
            margin-top: 0;
          }
          h2 {
            font-size: 19px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 5px;
          }
          h3 {
            font-size: 16px;
          }
          p {
            margin: 0.7em 0;
          }
          ul, ol {
            padding-left: 24px;
            margin: 0.6em 0;
          }
          li {
            margin: 0.3em 0;
          }
          .markdown-checklist {
            list-style: none;
            padding-left: 4px;
          }
          .checklist-item {
            margin: 0.35em 0;
          }
          .checklist-checked {
            color: #4b5563;
            text-decoration: line-through;
          }
          blockquote {
            border-left: 3px solid #2563eb;
            padding-left: 14px;
            margin: 14px 0;
            color: #4b5563;
            font-style: italic;
          }
          code {
            background: #f3f4f6;
            padding: 2px 5px;
            border-radius: 4px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 12px;
          }
          pre {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            padding: 12px;
            border-radius: 6px;
            overflow-x: auto;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 12px;
            line-height: 1.45;
          }
          hr {
            border: none;
            border-top: 1px solid #e5e7eb;
            margin: 20px 0;
          }
          .doc-header-tag {
            display: inline-block;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #2563eb;
            margin-bottom: 6px;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="doc-header-tag">WORKBENCH JOURNAL · FORMATTED DOCUMENT</div>
        <div class="formatted-markdown-doc">
          ${html}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `);
  printWin.document.close();
}

/* ============================================================
   FEATURE 8: Project Co-Creators & Immutable Creator Ownership
   ============================================================ */
const SHARED_COLLAB_STORAGE_KEY = "workbench_shared_collab_projects";

function ensureProjectCreator(project) {
  if (!project) return;
  if (!project.creator) {
    const maker = getCurrentMakerIdentity();
    project.creator = {
      id: maker.id,
      name: maker.name,
      email: maker.email
    };
  } else if (!project.creator.id) {
    project.creator.id = project.creator.email || ("creator-" + uid());
  }
  if (!Array.isArray(project.coCreators)) {
    project.coCreators = [];
  }
}

function isProjectCreator(project, user = null, includeAdmin = false) {
  if (!project) return false;
  ensureProjectCreator(project);
  const curUser = user || getActiveUser();
  if (!curUser) return false;
  if (curUser.id === "local-maker" && !getCloudSession()) return true;

  const uId = curUser.id;
  const uEmail = (curUser.email || "").toLowerCase().trim();
  const uName = (curUser.displayName || curUser.display_name || curUser.name || (uEmail ? uEmail.split("@")[0] : "")).toLowerCase().trim();

  const cId = project.creator?.id;
  const cEmail = (project.creator?.email || "").toLowerCase().trim();
  const cName = (project.creator?.name || project.creator?.displayName || (cEmail ? cEmail.split("@")[0] : "")).toLowerCase().trim();

  const idMatch = Boolean(cId && uId && cId === uId && cId !== "local-maker");
  const emailMatch = Boolean(cEmail && uEmail && cEmail === uEmail);
  const nameMatch = Boolean(
    !isGenericName(cName) &&
    !isGenericName(uName) &&
    (cName === uName || cName.replace(/\s+/g, "") === uName.replace(/\s+/g, ""))
  );

  // If project creator was generic or local-maker, primary owner claims it
  const primaryOwnerFallback = Boolean(
    isPrimaryOwner(curUser) &&
    (!cId || cId === "local-maker" || isGenericName(cName)) &&
    (!cEmail || cEmail === "local@workbench.maker")
  );

  if (uId && (emailMatch || nameMatch || primaryOwnerFallback) && (!cId || cId !== uId || cId === "local-maker")) {
    project.creator.id = uId;
    if (uEmail && !project.creator.email) project.creator.email = uEmail;
  }

  return Boolean(idMatch || emailMatch || nameMatch || primaryOwnerFallback);
}

function isCollaborativeProject(project) {
  return Boolean(project && Array.isArray(project.coCreators) && project.coCreators.length > 0);
}

function isUserCollaborator(project, user = null, includeAdmin = false) {
  if (!project) return false;
  ensureProjectCreator(project);
  const curUser = user || getActiveUser() || getCurrentMakerIdentity();
  if (!curUser) return false;
  if (curUser.id === "local-maker" && !getCloudSession()) return true;

  const uId = curUser.id || "";
  const uEmail = (curUser.email || "").toLowerCase().trim();
  const uName = (curUser.displayName || curUser.display_name || curUser.name || (uEmail ? uEmail.split("@")[0] : "")).toLowerCase().trim();

  const normalize = s => (s || "").toLowerCase().replace(/[\s._-]+/g, "");
  const uNorm = normalize(uName);
  const uPrefix = uEmail ? normalize(uEmail.split("@")[0]) : "";

  const matchesUser = (member) => {
    if (!member) return false;
    const mId = member.id || member.user_id;
    if (mId && uId && mId === uId && mId !== "local-maker") return true;

    const mEmail = (member.email || "").toLowerCase().trim();
    if (mEmail && uEmail && mEmail === uEmail) return true;

    const mName = (member.displayName || member.display_name || member.name || "").toLowerCase().trim();
    const mNorm = normalize(mName);
    const mPrefix = mEmail ? normalize(mEmail.split("@")[0]) : "";

    // 1. Direct name match (e.g. "Editor User" === "Editor User" or "David Miller" === "david miller")
    if (!isGenericName(mName) && !isGenericName(uName) && mNorm && mNorm === uNorm) return true;

    // 2. Member name matches user's email prefix (e.g. member entered as "editor" and user is "editor@xyz.com")
    if (!isGenericName(mName) && mNorm && uPrefix && mNorm === uPrefix) return true;

    // 3. User name matches member's email prefix (e.g. member entered as "editor@xyz.com" and user display name is "Editor")
    if (!isGenericName(uName) && uNorm && mPrefix && uNorm === mPrefix) return true;

    // 4. Both email prefixes match (non-generic, e.g. "charlie" === "charlie")
    if (mPrefix && uPrefix && !isGenericName(mPrefix) && !isGenericName(uPrefix) && mPrefix === uPrefix) return true;

    return false;
  };

  const isCreator = isProjectCreator(project, curUser, false);
  const isCoCreator = Array.isArray(project.coCreators) && project.coCreators.some(matchesUser);

  // Self-heal real Supabase UID onto member object if matched by name or email
  let healed = false;
  if (uId && (isCreator || isCoCreator)) {
    if (isCreator && (!project.creator.id || project.creator.id !== uId || project.creator.id === "local-maker")) {
      project.creator.id = uId;
      if (uEmail && !project.creator.email) project.creator.email = uEmail;
      healed = true;
    }
    if (Array.isArray(project.coCreators)) {
      for (const c of project.coCreators) {
        if (matchesUser(c)) {
          if (!c.id || c.id !== uId || c.id === "local-maker") {
            c.id = uId;
            healed = true;
          }
          if (uEmail && !c.email) {
            c.email = uEmail;
            healed = true;
          }
          if (uName && (!c.name || isGenericName(c.name))) {
            c.name = curUser.displayName || curUser.name || uName;
            healed = true;
          }
        }
      }
    }
  }

  if (healed) {
    try {
      syncSharedCollaborations();
    } catch {}
  }

  return Boolean(isCreator || isCoCreator);
}

function getProjectUserRole(project, user = null) {
  if (!project || !isCollaborativeProject(project)) return null;
  ensureProjectCreator(project);
  const curUser = user || getActiveUser() || getCurrentMakerIdentity();
  if (!curUser) return null;

  const uId = curUser.id || "";
  const uEmail = (curUser.email || "").toLowerCase().trim();
  const uName = (curUser.displayName || curUser.display_name || curUser.name || (uEmail ? uEmail.split("@")[0] : "")).toLowerCase().trim();

  const normalize = s => (s || "").toLowerCase().replace(/[\s._-]+/g, "");
  const uNorm = normalize(uName);
  const uPrefix = uEmail ? normalize(uEmail.split("@")[0]) : "";

  if (isProjectCreator(project, curUser)) {
    return { role: "creator", label: "👑 Creator", className: "role-creator" };
  }

  const matchesUser = (member) => {
    if (!member) return false;
    const mId = member.id || member.user_id;
    if (mId && uId && mId === uId && mId !== "local-maker") return true;

    const mEmail = (member.email || "").toLowerCase().trim();
    if (mEmail && uEmail && mEmail === uEmail) return true;

    const mName = (member.displayName || member.display_name || member.name || "").toLowerCase().trim();
    const mNorm = normalize(mName);
    const mPrefix = mEmail ? normalize(mEmail.split("@")[0]) : "";

    // 1. Direct name match (e.g. "Editor User" === "Editor User" or "David Miller" === "david miller")
    if (!isGenericName(mName) && !isGenericName(uName) && mNorm && mNorm === uNorm) return true;

    // 2. Member name matches user's email prefix (e.g. member entered as "editor" and user is "editor@xyz.com")
    if (!isGenericName(mName) && mNorm && uPrefix && mNorm === uPrefix) return true;

    // 3. User name matches member's email prefix (e.g. member entered as "editor@xyz.com" and user display name is "Editor")
    if (!isGenericName(uName) && uNorm && mPrefix && uNorm === mPrefix) return true;

    // 4. Both email prefixes match (non-generic, e.g. "charlie" === "charlie")
    if (mPrefix && uPrefix && !isGenericName(mPrefix) && !isGenericName(uPrefix) && mPrefix === uPrefix) return true;

    return false;
  };

  if (Array.isArray(project.coCreators)) {
    for (const c of project.coCreators) {
      if (matchesUser(c)) {
        const r = (c.role || "editor").toLowerCase();
        if (r === "viewer") return { role: "viewer", label: "👁️ Viewer", className: "role-viewer" };
        if (r === "contributor") return { role: "contributor", label: "🤝 Contributor", className: "role-contributor" };
        return { role: "editor", label: "✏️ Editor", className: "role-editor" };
      }
    }
  }

  return null;
}

function canUserEditProject(project, user = null) {
  if (!project) return false;
  const curUser = user || getActiveUser();
  if (!curUser) return true; // Offline single-maker fallback
  const isCurUserAdmin = Boolean(curUser && (curUser.isAdmin || curUser.role === "admin" || curUser.isPrimary || isPrimaryOwner(curUser)));
  if (isCurUserAdmin) return true;
  if (!isCollaborativeProject(project)) return true;
  if (isProjectCreator(project, curUser)) return true;
  const ur = getProjectUserRole(project, curUser);
  if (!ur) return false;
  return ur.role !== "viewer";
}

async function syncCloudCollaborations() {
  const session = getCloudSession();
  const curUser = getActiveUser();
  if (!session?.access_token || !curUser || adminInspectionActive) return;

  try {
    const rows = await cloudRequest(`/rest/v1/${CLOUD_TABLE}?select=user_id,updated_at,data`).catch(() => []);
    if (!Array.isArray(rows) || rows.length === 0) return;

    if (rows.length === 1 && !adminInspectionActive) {
      const hasSharedCollabs = (state.projects || []).some(isCollaborativeProject) || getSharedCollaborations().length > 0;
      if (hasSharedCollabs) {
        console.info(
          "ℹ️ Cloud sync note: Only 1 workspace row returned from Supabase. To enable automatic cross-device sync for collaborative projects across different user accounts, make sure this SQL policy is run in your Supabase SQL Editor:\n" +
          "create policy \"Authenticated users can select workspaces\" on public.workbench_workspace for select to authenticated using (true);"
        );
      }
    }

    let hasChanges = false;
    const myId = curUser.id;

    for (const row of rows) {
      if (row.user_id === myId) continue;
      const remoteProjects = Array.isArray(row.data?.projects) ? row.data.projects : [];

      for (const rp of remoteProjects) {
        if (!rp || !rp.id) continue;
        ensureProjectCreator(rp);

        // 1. NEVER pull or resurrect a project that has been deleted!
        if (isDeletedProject(rp.id)) {
          const existingIdx = state.projects.findIndex(p => p.id === rp.id);
          if (existingIdx !== -1) {
            state.projects.splice(existingIdx, 1);
            hasChanges = true;
          }
          continue;
        }

        // 2. ONLY pull projects that are explicitly marked collaborative!
        // Private projects must never sync across different maker accounts!
        if (!isCollaborativeProject(rp)) {
          continue;
        }

        const isCollaborator = isUserCollaborator(rp, curUser);

        if (!isCollaborator) {
          // Only remove if this remote row belongs to the actual project creator
          // AND is strictly newer than our local version (explicit revocation)
          const isCreatorRow = isProjectCreator(rp, { id: row.user_id });
          const existingIdx = state.projects.findIndex(p => p.id === rp.id);
          if (isCreatorRow && existingIdx !== -1) {
            const existing = state.projects[existingIdx];
            const remoteTime = new Date(rp.updatedAt || 0).getTime();
            const localTime = new Date(existing.updatedAt || 0).getTime();
            if (remoteTime > localTime) {
              state.projects.splice(existingIdx, 1);
              hasChanges = true;
            }
          }
          continue;
        }

        const existingIdx = state.projects.findIndex(p => p.id === rp.id);
        if (existingIdx === -1) {
          state.projects.unshift(rp);
          hasChanges = true;
        } else {
          const existing = state.projects[existingIdx];
          const remoteTime = new Date(rp.updatedAt || 0).getTime();
          const localTime = new Date(existing.updatedAt || 0).getTime();
          if (remoteTime > localTime) {
            state.projects[existingIdx] = rp;
            hasChanges = true;
          }
        }

        // Also ensure collaborator has skills linked to this project
        const remoteSkills = Array.isArray(row.data?.skills) ? row.data.skills : [];
        for (const sid of (rp.skillIds || [])) {
          const hasSkill = (state.skills || []).some(s => s.id === sid);
          if (!hasSkill) {
            const matchedRemote = remoteSkills.find(s => s.id === sid);
            if (matchedRemote) {
              state.skills.push({ ...matchedRemote, xp: 0 });
              hasChanges = true;
            }
          }
        }
      }
    }

    loadSharedCollaborationsIntoState();

    if (hasChanges) {
      const remainingProjectIds = new Set(state.projects.map(p => p.id));
      state.activity = (state.activity || []).filter(a => !a.projectId || remainingProjectIds.has(a.projectId));
      state.practiceLog = (state.practiceLog || []).filter(l => !l.projectId || remainingProjectIds.has(l.projectId));
      syncSharedCollaborations();

      await persistState({ syncCloud: true });
      render();
      if (activeProjectId && $("#detail-dialog")?.open) {
        renderProjectDetail(activeProjectId);
      }
    }
  } catch (err) {
    console.warn("Could not sync cloud collaborations:", err);
  }
}

function openActivityDetail(activityId) {
  if (!activityId) return;
  $("#day-summary-dialog")?.close();
  let item = (state.practiceLog || []).find(l => l.id === activityId) ||
             (state.activity || []).find(a => a.id === activityId);
  if (!item) {
    for (const p of state.projects) {
      const note = (p.notes || []).find(n => n.id === activityId);
      if (note) {
        item = { id: note.id, text: note.text, at: note.at || note.createdAt, projectId: p.id, kind: "note" };
        break;
      }
      const task = (p.tasks || []).find(t => t.id === activityId);
      if (task) {
        item = { id: task.id, text: `Completed checklist step: ${task.text} (${p.title})`, at: task.completedAt, projectId: p.id, kind: "task" };
        break;
      }
    }
  }
  if (!item) return;

  const dialog = $("#activity-detail-dialog");
  const titleEl = $("#activity-detail-title");
  const bodyEl = $("#activity-detail-body");
  const deleteBtn = $("#delete-activity-detail-btn");
  if (!dialog || !bodyEl) return;

  const isXp = item.kind === "xp" || item.xp;
  if (titleEl) {
    titleEl.textContent = isXp ? "Practice / XP Session" : "Activity Details";
  }

  const dateFormatted = item.at ? new Date(item.at).toLocaleString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }) : "Recent session";

  const skill = item.skillId ? (state.skills || []).find(s => s.id === item.skillId) : null;
  const project = item.projectId ? (state.projects || []).find(p => p.id === item.projectId) : null;

  bodyEl.innerHTML = `
    <div style="background:var(--surface-hover);padding:14px;border-radius:8px;border-left:4px solid var(--accent)">
      <div style="font-size:15px;font-weight:600;color:var(--ink);line-height:1.4">
        ${escapeHTML(item.text)}
      </div>
      <div style="font-size:12px;color:var(--muted);margin-top:6px;display:flex;align-items:center;gap:6px">
        <span>🕒</span>
        <span>${dateFormatted}</span>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:10px">
      <div class="stat-card" style="padding:10px 14px">
        <div style="font-size:11px;text-transform:uppercase;color:var(--muted)">Activity Type</div>
        <div style="font-size:14px;font-weight:700;color:var(--ink);margin-top:2px">${isXp ? "⚡ Skill Practice" : "📝 Project Log"}</div>
      </div>
      ${item.xp ? `
        <div class="stat-card" style="padding:10px 14px">
          <div style="font-size:11px;text-transform:uppercase;color:var(--muted)">XP Gained</div>
          <div style="font-size:14px;font-weight:700;color:var(--accent);margin-top:2px">+${item.xp} XP</div>
        </div>
      ` : ""}
      ${skill ? `
        <div class="stat-card" style="padding:10px 14px">
          <div style="font-size:11px;text-transform:uppercase;color:var(--muted)">Related Skill</div>
          <div style="font-size:14px;font-weight:700;color:var(--ink);margin-top:2px">${escapeHTML(skill.name)} (Lvl ${skillLevel(skill.xp)})</div>
        </div>
      ` : ""}
      ${project ? `
        <div class="stat-card" style="padding:10px 14px">
          <div style="font-size:11px;text-transform:uppercase;color:var(--muted)">Project</div>
          <div style="font-size:14px;font-weight:700;color:var(--ink);margin-top:2px">${escapeHTML(project.title)}</div>
        </div>
      ` : ""}
    </div>
  `;

  if (deleteBtn) {
    deleteBtn.classList.remove("hidden");
    deleteBtn.onclick = async () => {
      if (adminInspectionActive) {
        showToast("Inspection mode: edits disabled.", "warning");
        return;
      }
      if (!confirm("Are you sure you want to remove this practice log entry?")) return;
      state.practiceLog = (state.practiceLog || []).filter(l => l.id !== item.id);
      state.activity = (state.activity || []).filter(a => a.id !== item.id);
      if (item.xp && skill) {
        skill.xp = Math.max(0, (skill.xp || 0) - item.xp);
      }
      await persistState();
      dialog.close();
      render();
      showToast("Practice session removed.");
    };
  }

  dialog.showModal();
}

function getSharedCollaborations() {
  try {
    const raw = localStorage.getItem(SHARED_COLLAB_STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveSharedCollaborations(list) {
  try {
    localStorage.setItem(SHARED_COLLAB_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("Could not save shared collaborations:", e);
  }
}

function syncSharedCollaborations() {
  const sharedMap = new Map();
  for (const sp of getSharedCollaborations()) {
    if (sp?.id) sharedMap.set(sp.id, sp);
  }

  for (const p of state.projects) {
    if (isCollaborativeProject(p)) {
      const existing = sharedMap.get(p.id);
      if (!existing || new Date(p.updatedAt || 0) >= new Date(existing.updatedAt || 0)) {
        sharedMap.set(p.id, JSON.parse(JSON.stringify(p)));
      }
    }
  }

  saveSharedCollaborations(Array.from(sharedMap.values()));
}

function loadSharedCollaborationsIntoState() {
  const curUser = getActiveUser() || getCurrentMakerIdentity();
  if (!curUser) return;
  const shared = getSharedCollaborations();
  const candidates = [...shared];

  // Also check mailbox invite keys in localStorage
  try {
    const keysToCheck = [];
    if (curUser.id) keysToCheck.push(`workbench_collab_invites_${curUser.id}`);
    if (curUser.email) keysToCheck.push(`workbench_collab_invites_${curUser.email.toLowerCase().trim()}`);
    const uName = (curUser.displayName || curUser.display_name || curUser.name || (curUser.email ? curUser.email.split("@")[0] : "")).toLowerCase().replace(/[\s._-]+/g, "");
    if (uName) keysToCheck.push(`workbench_collab_invites_${uName}`);
    if (curUser.email && curUser.email.includes("@")) {
      keysToCheck.push(`workbench_collab_invites_${curUser.email.split("@")[0].toLowerCase().replace(/[\s._-]+/g, "")}`);
    }

    for (const key of keysToCheck) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const invProj = JSON.parse(raw);
          if (invProj && invProj.id && !candidates.some(c => c.id === invProj.id)) {
            candidates.push(invProj);
          }
        } catch {}
      }
    }
  } catch {}

  if (candidates.length === 0) return;

  for (const sp of candidates) {
    if (!sp || !sp.id) continue;
    ensureProjectCreator(sp);
    if (isDeletedProject(sp.id)) continue;
    if (!isCollaborativeProject(sp)) continue;
    if (!isUserCollaborator(sp, curUser)) continue;

    const existing = state.projects.find(p => p.id === sp.id);
    if (!existing) {
      state.projects.unshift(sp);
    } else {
      const spTime = new Date(sp.updatedAt || 0).getTime();
      const exTime = new Date(existing.updatedAt || 0).getTime();
      if (spTime > exTime) {
        Object.assign(existing, sp);
      }
    }
  }

  void autoDiscoverCollaborativeProjects();
}

async function autoDiscoverCollaborativeProjects() {
  const curUser = getActiveUser() || getCurrentMakerIdentity();
  if (!curUser || !database) return false;

  return new Promise(resolve => {
    try {
      const tx = database.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const items = [];

      if (typeof store.getAll === "function") {
        const req = store.getAll();
        req.onsuccess = () => processStates(req.result);
        req.onerror = () => resolve(false);
      } else {
        const cursorReq = store.openCursor();
        cursorReq.onsuccess = event => {
          const cursor = event.target.result;
          if (cursor) {
            items.push(cursor.value);
            cursor.continue();
          } else {
            processStates(items);
          }
        };
        cursorReq.onerror = () => resolve(false);
      }

      function processStates(allStates) {
        if (!Array.isArray(allStates)) return resolve(false);
        let foundAny = false;
        for (const st of allStates) {
          if (!st || !Array.isArray(st.projects)) continue;
          for (const p of st.projects) {
            if (!p || !p.id || !isCollaborativeProject(p)) continue;
            ensureProjectCreator(p);
            if (isDeletedProject(p.id)) continue;
            if (isUserCollaborator(p, curUser)) {
              const existingIdx = state.projects.findIndex(ep => ep.id === p.id);
              if (existingIdx === -1) {
                state.projects.unshift(structuredClone(p));
                foundAny = true;
              } else {
                const ex = state.projects[existingIdx];
                if (new Date(p.updatedAt || 0) > new Date(ex.updatedAt || 0)) {
                  state.projects[existingIdx] = structuredClone(p);
                  foundAny = true;
                }
              }

              // Also ensure collaborator has skills linked to this project
              for (const sid of (p.skillIds || [])) {
                const hasSkill = (state.skills || []).some(s => s.id === sid);
                if (!hasSkill && Array.isArray(st.skills)) {
                  const matched = st.skills.find(s => s.id === sid);
                  if (matched) {
                    state.skills.push({ ...matched, xp: 0 });
                    foundAny = true;
                  }
                }
              }
            }
          }
        }

        if (foundAny) {
          syncSharedCollaborations();
          render();
          void persistState({ syncCloud: false });
        }
        resolve(foundAny);
      }
    } catch {
      resolve(false);
    }
  });
}

let activeCollabProjectId = null;

async function openCollaboratorsDialog(projectId) {
  const project = state.projects.find(p => p.id === (projectId || activeProjectId));
  if (!project) return;
  activeCollabProjectId = project.id;
  ensureProjectCreator(project);

  const title = $("#collaborators-dialog-title");
  if (title) title.textContent = `Project Team · ${project.title}`;

  await renderCollaboratorsDialog(project);
  $("#collaborators-dialog")?.showModal();
}

async function renderCollaboratorsDialog(project) {
  const body = $("#collaborators-dialog-body");
  if (!body || !project) return;
  ensureProjectCreator(project);

  const curUser = getActiveUser();
  const isAdmin = isCurrentUserAdmin();
  const isCreator = isProjectCreator(project, curUser);
  const isCollaborator = isUserCollaborator(project, curUser);
  const canManage = isCreator || isAdmin;
  const coCreators = project.coCreators || [];

  let knownMakers = [];
  try {
    const localMap = await getLocallyKnownUsers();
    knownMakers = Array.from(localMap.values()).filter(m => {
      const mId = m.id;
      const mEmail = (m.email || "").toLowerCase().trim();
      const mName = (m.displayName || "").toLowerCase().trim();
      if (project.creator?.id === mId || (project.creator?.email && project.creator.email.toLowerCase().trim() === mEmail) || (project.creator?.name && project.creator.name.toLowerCase().trim() === mName)) return false;
      if (coCreators.some(c => c.id === mId || (c.email && c.email.toLowerCase().trim() === mEmail) || (c.name && c.name.toLowerCase().trim() === mName))) return false;
      return true;
    });
  } catch {}

  body.innerHTML = `
    ${!isCollaborator ? `
      <div style="background:var(--warning-soft, #fef3c7);border:1px solid var(--warning, #f59e0b);color:#92400e;padding:12px;border-radius:8px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <div>
          <strong>Transferred Project</strong>: This project's creator is <strong>${escapeHTML(project.creator?.name || "another maker")}</strong> and you are not listed on the team.
        </div>
        <button type="button" class="button button-primary button-small" data-action="return-project-to-creator" data-project="${project.id}">
          ↩ Push to Creator & Remove from My Workbench
        </button>
      </div>
    ` : ""}

    <div style="background:var(--surface-hover);padding:12px;border-radius:8px;border-left:4px solid var(--accent);font-size:13px;color:var(--ink)">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <div>
          <strong>${escapeHTML(project.title)}</strong>
          <span style="color:var(--muted)"> · ${coCreators.length + 1} project member${coCreators.length === 0 ? "" : "s"}</span>
        </div>
        <span class="status-pill status-${safeStatus(project.status)}">${STATUS_LABELS[safeStatus(project.status)]}</span>
      </div>
      <p style="margin:6px 0 0 0;font-size:12px;color:var(--muted);line-height:1.4">
        Collaborative projects are shared across team members. Every checklist step, journal note, and status change records the member who made it.
      </p>
    </div>

    <div style="display:flex;gap:8px;margin:10px 0 4px 0;flex-wrap:wrap">
      <button type="button" class="button button-outline button-small" data-action="copy-team-link" data-project="${project.id}" style="display:inline-flex;align-items:center;gap:6px">
        🔗 Copy Team Project Link
      </button>
      <button type="button" class="button button-quiet button-small" data-action="open-project-qr" data-project="${project.id}" style="display:inline-flex;align-items:center;gap:6px">
        📱 Project QR
      </button>
    </div>
    <div style="font-size:11.5px;color:var(--muted);margin:4px 0 10px 0;line-height:1.4">
      💡 Co-creators on this browser see this project automatically upon login. To open on a phone or other computer, share the Team Project Link or scan the QR.
    </div>

    <div>
      <h3 style="font-size:13px;text-transform:uppercase;color:var(--muted);letter-spacing:0.5px;margin:10px 0 6px 0">Project Creator (Immutable)</h3>
      <div class="collab-member-card">
        <div class="collab-member-main">
          <div class="collab-avatar">👑</div>
          <div class="collab-member-info">
            <div style="display:flex;align-items:center;gap:6px">
              <span class="collab-member-name">${escapeHTML(project.creator?.name || "Project Creator")}</span>
              <span class="collab-creator-badge">👑 Primary Creator</span>
            </div>
            <span class="collab-member-email">${escapeHTML(project.creator?.email || "Lead owner")}</span>
          </div>
        </div>
        <div class="collab-member-actions">
          <span style="font-size:11px;color:var(--muted);font-weight:600">Immutable Owner</span>
        </div>
      </div>
      <div style="font-size:11px;color:var(--muted);margin:4px 0 12px 6px">
        🔒 Project Creator status is permanent and immutable, but can be passed/transferred to another team member below.
      </div>
    </div>

    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <h3 style="font-size:13px;text-transform:uppercase;color:var(--muted);letter-spacing:0.5px;margin:0">Co-Creators (${coCreators.length})</h3>
      </div>

      ${coCreators.length === 0 ? `
        <div class="empty-inline" style="padding:14px;background:var(--surface-subtle);border-radius:6px;text-align:center">
          No co-creators added yet. Add another maker or collaborator below to make this project collaborative.
        </div>
      ` : `
        <div style="display:flex;flex-direction:column;gap:8px">
          ${coCreators.map(c => `
            <div class="collab-member-card">
              <div class="collab-member-main">
                <div class="collab-avatar">${(c.name || c.email || "M").slice(0, 1).toUpperCase()}</div>
                <div class="collab-member-info">
                  <div style="display:flex;align-items:center;gap:6px">
                    <span class="collab-member-name">${escapeHTML(c.name || c.email)}</span>
                    <span class="collab-badge">${escapeHTML(c.role || "Editor")}</span>
                  </div>
                  <span class="collab-member-email">${escapeHTML(c.email || "Co-creator")}</span>
                </div>
              </div>
              <div class="collab-member-actions">
                ${canManage ? `
                  <button type="button" class="button button-outline button-small" data-action="toggle-co-creator-role" data-project="${escapeHTML(project.id)}" data-id="${escapeHTML(c.id)}" title="Toggle between Editor and Viewer">Role: ${escapeHTML(c.role || "Editor")}</button>
                  <button type="button" class="button button-outline button-small" data-action="pass-creator-status" data-project="${escapeHTML(project.id)}" data-id="${escapeHTML(c.id)}" title="Pass immutable creator role to this member">👑 Transfer Creator</button>
                  <button type="button" class="danger-button" style="padding:4px 8px;font-size:11px" data-action="remove-co-creator" data-project="${escapeHTML(project.id)}" data-id="${escapeHTML(c.id)}" title="Remove co-creator">×</button>
                ` : `
                  <span style="font-size:12px;color:var(--muted)">${escapeHTML(c.role || "Editor")}</span>
                `}
              </div>
            </div>
          `).join("")}
        </div>
      `}
    </div>

    ${canManage ? `
      <div class="add-collab-box">
        <h3 style="font-size:12px;text-transform:uppercase;color:var(--muted);letter-spacing:0.5px;margin:0 0 10px 0;font-weight:700">Add Co-Creator to Team</h3>
        <div class="add-collab-row">
          <input type="text" id="new-collab-input" class="add-collab-input" placeholder="Maker name or email (e.g. sarah@maker.org)">
          <select id="new-collab-role" class="add-collab-select">
            <option value="Editor">Editor</option>
            <option value="Viewer">Viewer</option>
            <option value="Contributor">Contributor</option>
          </select>
          <button type="button" class="button button-primary button-small add-collab-btn" data-action="add-co-creator" data-project="${escapeHTML(project.id)}">＋ Add</button>
        </div>
        ${knownMakers.length > 0 ? `
          <div style="margin-top:10px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:11px;color:var(--muted)">
            <span>Quick add known makers:</span>
            ${knownMakers.slice(0, 4).map(m => `
              <button type="button" class="mini-tag clickable" data-action="quick-add-collab" data-project="${escapeHTML(project.id)}" data-name="${escapeHTML(m.displayName || m.email)}" data-email="${escapeHTML(m.email || "")}" data-id="${escapeHTML(m.id)}">＋ ${escapeHTML(m.displayName || m.email)}</button>
            `).join("")}
          </div>
        ` : ""}
      </div>
    ` : ""}
  `;

  body.querySelectorAll('button[data-action="quick-add-collab"]').forEach(btn => {
    btn.addEventListener("click", () => {
      void addCoCreator(btn.dataset.project, {
        id: btn.dataset.id,
        name: btn.dataset.name,
        email: btn.dataset.email
      }, "Editor");
    });
  });

  const collabInput = $("#new-collab-input");
  if (collabInput) {
    collabInput.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        event.preventDefault();
        void handleAddCoCreator(project.id);
      }
    });
  }
}

async function handleAddCoCreator(projectId) {
  const input = $("#new-collab-input");
  const roleSelect = $("#new-collab-role");
  if (!input || !input.value.trim()) {
    showToast("Please enter an email or username for the co-creator.");
    return;
  }
  const text = input.value.trim();
  const role = roleSelect ? roleSelect.value : "Editor";
  await addCoCreator(projectId, text, role);
  input.value = "";
}

async function pushProjectToCollaboratorWorkspaces(project) {
  if (!project) return;
  syncSharedCollaborations();
  const session = getCloudSession();
  const curUser = getActiveUser();

  // Also push project to local user-scoped IndexedDB state for all collaborators on this browser
  try {
    const targetUsers = new Map();
    // 1. Direct co-creators from project
    for (const c of (project.coCreators || [])) {
      if (c?.id && c.id !== curUser?.id && c.id !== "local-maker") {
        targetUsers.set(c.id, c);
      }
    }
    // 2. Known makers from localStorage
    let knownList = [];
    try {
      const knownMakersRaw = localStorage.getItem("workbench_known_makers");
      if (knownMakersRaw) knownList = JSON.parse(knownMakersRaw);
    } catch {}
    for (const m of (Array.isArray(knownList) ? knownList : [])) {
      if (!m?.id || m.id === curUser?.id || m.id === "local-maker") continue;
      if (isUserCollaborator(project, m)) {
        targetUsers.set(m.id, m);
      }
    }

    for (const [targetId, targetInfo] of targetUsers) {
      const userStateKey = `workbench_state_${targetId}`;
      let uState = await readSavedState(userStateKey);
      if (!uState) {
        uState = {
          projects: [],
          ideas: [...STARTER_IDEAS],
          skills: [],
          activity: [],
          practiceLog: [],
          inventory: [],
          depotRestockList: [],
          customTemplates: [],
          makerGoals: [],
          maintenance: [],
          currency: state.currency || "USD",
          unitSystem: state.unitSystem || "in",
          weeklyGoal: 60,
          updatedAt: new Date().toISOString(),
          hasUserChanges: false,
          starterSkillsAdded: true
        };
      }
      uState.projects = Array.isArray(uState.projects) ? uState.projects : [];
      const idx = uState.projects.findIndex(p => p.id === project.id);
      if (idx >= 0) {
        uState.projects[idx] = structuredClone(project);
      } else {
        uState.projects.unshift(structuredClone(project));
      }
      const tx = database.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(uState, userStateKey);

      // Write mailbox invites into localStorage for immediate discovery
      if (targetInfo.email) {
        localStorage.setItem(`workbench_collab_invites_${targetInfo.email.toLowerCase().trim()}`, JSON.stringify(project));
      }
      if (targetInfo.name) {
        localStorage.setItem(`workbench_collab_invites_${targetInfo.name.toLowerCase().replace(/[\s._-]+/g, "")}`, JSON.stringify(project));
      }
      localStorage.setItem(`workbench_collab_invites_${targetId}`, JSON.stringify(project));
    }
  } catch (err) {
    console.warn("Could not push project to local collaborator IndexedDB state:", err);
  }

  if (!session?.access_token || !curUser) return;

  try {
    const rows = await cloudRequest(`/rest/v1/${CLOUD_TABLE}?select=user_id,updated_at,data`).catch(() => []);
    if (!Array.isArray(rows) || rows.length === 0) return;

    const profiles = await cloudRequest(`/rest/v1/workbench_profiles?select=*`).catch(() => []);
    const profileByUserId = new Map();
    if (Array.isArray(profiles)) {
      for (const prof of profiles) {
        if (prof?.id) profileByUserId.set(prof.id, prof);
      }
    }

    const normalize = s => (s || "").toLowerCase().replace(/[\s._-]+/g, "");
    const memberIds = new Set();
    const memberEmails = new Set();
    const memberNames = new Set();

    const addTarget = (m) => {
      if (!m) return;
      if (m.id && m.id !== "local-maker") memberIds.add(m.id);
      if (m.email) {
        const em = m.email.toLowerCase().trim();
        memberEmails.add(em);
        if (em.includes("@")) {
          memberNames.add(normalize(em.split("@")[0]));
        }
      }
      const name = (m.name || m.displayName || m.display_name || "").toLowerCase().trim();
      if (name && !isGenericName(name)) {
        memberNames.add(name);
        memberNames.add(normalize(name));
      }
    };

    addTarget(project.creator);
    for (const c of (project.coCreators || [])) {
      addTarget(c);
    }

    for (const row of rows) {
      if (row.user_id === curUser.id) continue;
      const owner = row.data?.owner || {};
      const prof = profileByUserId.get(row.user_id) || {};

      const rowId = row.user_id;
      const rowEmail = (owner.email || prof.email || "").toLowerCase().trim();
      const rawName = (owner.displayName || owner.display_name || owner.name || prof.display_name || (rowEmail ? rowEmail.split("@")[0] : "")).toLowerCase().trim();
      const normName = normalize(rawName);
      const rowPrefix = rowEmail ? normalize(rowEmail.split("@")[0]) : "";

      const isMember = memberIds.has(rowId) ||
                       (rowEmail && memberEmails.has(rowEmail)) ||
                       (rowPrefix && memberNames.has(rowPrefix)) ||
                       (!isGenericName(rawName) && memberNames.has(rawName)) ||
                       (!isGenericName(normName) && memberNames.has(normName)) ||
                       (!isGenericName(normName) && [...memberNames].some(mn => mn && (mn.includes(normName) || normName.includes(mn)))) ||
                       (rowPrefix && [...memberNames].some(mn => mn && (mn.includes(rowPrefix) || rowPrefix.includes(mn))));

      if (isMember) {
        row.data = row.data || {};
        const remoteProjects = Array.isArray(row.data.projects) ? row.data.projects : [];
        const idx = remoteProjects.findIndex(p => p.id === project.id);
        if (idx >= 0) {
          remoteProjects[idx] = structuredClone(project);
        } else {
          remoteProjects.unshift(structuredClone(project));
        }
        row.data.projects = remoteProjects;

        // Also ensure target user has any skills linked to this project
        const projectSkills = (state.skills || []).filter(s => (project.skillIds || []).includes(s.id));
        if (projectSkills.length > 0) {
          row.data.skills = Array.isArray(row.data.skills) ? row.data.skills : [];
          for (const ps of projectSkills) {
            const hasSkill = row.data.skills.some(s => s.id === ps.id || s.name.toLowerCase() === ps.name.toLowerCase());
            if (!hasSkill) {
              row.data.skills.push({
                id: ps.id,
                name: ps.name,
                category: ps.category || "General",
                xp: 0,
                createdAt: new Date().toISOString()
              });
            }
          }
        }

        await cloudRequest(`/rest/v1/${CLOUD_TABLE}?user_id=eq.${encodeURIComponent(row.user_id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: row.data, updated_at: new Date().toISOString() })
        }).catch(() => {});
      } else {
        // If this user is NOT a member of this project, but has it in their remote workspace, remove it!
        if (row.data && Array.isArray(row.data.projects)) {
          const idx = row.data.projects.findIndex(p => p.id === project.id);
          if (idx >= 0) {
            row.data.projects.splice(idx, 1);
            await cloudRequest(`/rest/v1/${CLOUD_TABLE}?user_id=eq.${encodeURIComponent(row.user_id)}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ data: row.data, updated_at: new Date().toISOString() })
            }).catch(() => {});
          }
        }
      }
    }
  } catch (err) {
    console.warn("Could not push project to collaborator workspaces:", err);
  }
}

async function pushProjectDeletionToCollaboratorWorkspaces(projectId) {
  if (!projectId) return;
  recordDeletedProjectId(projectId);
  const session = getCloudSession();
  const curUser = getActiveUser();
  if (!session?.access_token || !curUser) return;

  try {
    const rows = await cloudRequest(`/rest/v1/${CLOUD_TABLE}?select=user_id,updated_at,data`).catch(() => []);
    if (!Array.isArray(rows) || rows.length === 0) return;

    for (const row of rows) {
      if (row.user_id === curUser.id) continue;
      if (row.data && Array.isArray(row.data.projects)) {
        const idx = row.data.projects.findIndex(p => p.id === projectId);
        if (idx >= 0) {
          row.data.projects.splice(idx, 1);
          await cloudRequest(`/rest/v1/${CLOUD_TABLE}?user_id=eq.${encodeURIComponent(row.user_id)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: row.data, updated_at: new Date().toISOString() })
          }).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.warn("Could not propagate project deletion to collaborators:", err);
  }
}

async function returnProjectToCreator(projectId) {
  const project = state.projects.find(p => p.id === (projectId || activeCollabProjectId));
  if (!project) return;
  ensureProjectCreator(project);

  const curUser = getActiveUser();
  const creatorName = project.creator?.name || "the creator";

  const confirmed = window.confirm(
    `Push “${project.title}” directly to ${creatorName}'s workbench and remove it from your workbench?`
  );
  if (!confirmed) return;

  showToast(`Pushing project to ${creatorName}...`);
  await pushProjectToCollaboratorWorkspaces(project);

  // If current user is not a member, remove from local projects
  const isCollaborator = isUserCollaborator(project, curUser);
  if (!isCollaborator) {
    state.projects = state.projects.filter(p => p.id !== project.id);
    activeCollabProjectId = null;
    $("#collaborators-dialog")?.close();
    if (activeProjectId === project.id) {
      $("#detail-dialog")?.close();
      activeProjectId = null;
    }
  }

  await persistState({ syncCloud: true });
  render();
  showToast(`✓ Successfully sent “${project.title}” to ${creatorName}!`);
}

async function reconcileProjectOwnership() {
  const session = getCloudSession();
  const curUser = getActiveUser();
  if (!session?.access_token || !curUser || adminInspectionActive) return;

  const isPrimary = isPrimaryOwner(curUser);

  // 1. Client-side sanitization for current user (collaborators / non-primary owners)
  if (!isPrimary) {
    let localChanged = false;
    const validProjects = [];
    const removedProjects = [];

    for (const p of state.projects) {
      if (!p || !p.id) continue;
      ensureProjectCreator(p);
      if (isUserCollaborator(p, curUser)) {
        validProjects.push(p);
      } else {
        removedProjects.push(p);
      }
    }

    if (removedProjects.length > 0) {
      state.projects = validProjects;
      localChanged = true;

      const removedProjectIds = new Set(removedProjects.map(p => p.id));
      const validSkillIds = new Set();
      validProjects.forEach(p => (p.skillIds || []).forEach(sid => validSkillIds.add(sid)));

      // Scrub activity entries referencing removed/leaked projects
      const origActCount = (state.activity || []).length;
      state.activity = (state.activity || []).filter(a => !a.projectId || !removedProjectIds.has(a.projectId));
      if (state.activity.length !== origActCount) localChanged = true;

      // Scrub practice log entries referencing removed/leaked projects
      const origLogCount = (state.practiceLog || []).length;
      state.practiceLog = (state.practiceLog || []).filter(l => !l.projectId || !removedProjectIds.has(l.projectId));
      if ((state.practiceLog || []).length !== origLogCount) localChanged = true;

      // Scrub skills that belonged only to leaked projects
      const origSkillCount = (state.skills || []).length;
      state.skills = (state.skills || []).filter(s => {
        const usedInValidLog = (state.practiceLog || []).some(l => l.skillId === s.id);
        return validSkillIds.has(s.id) || usedInValidLog;
      });
      if (state.skills.length !== origSkillCount) localChanged = true;

      // Recalculate XP on remaining skills from legitimate practice logs
      state.skills.forEach(s => {
        const earnedXp = (state.practiceLog || [])
          .filter(l => l.skillId === s.id && Number.isFinite(l.xp))
          .reduce((sum, l) => sum + (l.xp || 0), 0);
        s.xp = earnedXp;
      });

      console.warn(`Purged ${removedProjects.length} leaked project(s) and associated data from collaborator workspace.`);
    }

    if (localChanged) {
      await persistState({ syncCloud: true });
      render();
    }
  }

  // 2. Transferred project push:
  // If the current user has projects in their local workspace that they transferred to someone else
  // and are no longer a collaborator on, push them to the new creator/collaborators and remove locally.
  const transferredProjects = [];
  for (const p of state.projects) {
    if (!p || !p.id) continue;
    ensureProjectCreator(p);
    if (!isUserCollaborator(p, curUser)) {
      transferredProjects.push(p);
    }
  }
  if (transferredProjects.length > 0) {
    for (const p of transferredProjects) {
      await pushProjectToCollaboratorWorkspaces(p);
    }
    const transferredIds = new Set(transferredProjects.map(p => p.id));
    state.projects = state.projects.filter(p => !transferredIds.has(p.id));
    await persistState({ syncCloud: true });
    render();
    console.log(`Reconciled and pushed ${transferredProjects.length} transferred project(s) to respective creators.`);
  }

  // 3. Remote cloud sanitization (Primary Owner scans Supabase to scrub any leaked data in collaborator rows):
  if (!isPrimary) return;
  try {
    const rows = await cloudRequest(`/rest/v1/${CLOUD_TABLE}?select=user_id,updated_at,data`).catch(() => []);
    if (!Array.isArray(rows) || rows.length === 0) return;

    const profiles = await cloudRequest(`/rest/v1/workbench_profiles?select=*`).catch(() => []);
    const profileByUserId = new Map();
    if (Array.isArray(profiles)) {
      for (const prof of profiles) {
        if (prof?.id) profileByUserId.set(prof.id, prof);
      }
    }

    for (const row of rows) {
      if (row.user_id === curUser.id) continue;
      const prof = profileByUserId.get(row.user_id) || {};
      const owner = row.data?.owner || {};

      const targetUser = {
        id: row.user_id,
        email: prof.email || owner.email || "",
        displayName: prof.display_name || owner.displayName || owner.name || ""
      };

      if (isPrimaryOwner(targetUser)) continue;

      const remoteProjects = Array.isArray(row.data?.projects) ? row.data.projects : [];
      if (remoteProjects.length === 0) continue;

      let remoteChanged = false;
      const validRemoteProjects = [];
      const removedRemoteProjectIds = new Set();

      for (const p of remoteProjects) {
        if (!p || !p.id) continue;
        ensureProjectCreator(p);
        if (isUserCollaborator(p, targetUser)) {
          validRemoteProjects.push(p);
        } else {
          removedRemoteProjectIds.add(p.id);
          remoteChanged = true;
        }
      }

      if (remoteChanged) {
        row.data = row.data || {};
        row.data.projects = validRemoteProjects;

        const validSkillIds = new Set();
        validRemoteProjects.forEach(p => (p.skillIds || []).forEach(sid => validSkillIds.add(sid)));

        // Scrub activities belonging to removed projects
        if (Array.isArray(row.data.activity)) {
          row.data.activity = row.data.activity.filter(a => !a.projectId || !removedRemoteProjectIds.has(a.projectId));
        }

        // Scrub practice logs belonging to removed projects
        if (Array.isArray(row.data.practiceLog)) {
          row.data.practiceLog = row.data.practiceLog.filter(l => !l.projectId || !removedRemoteProjectIds.has(l.projectId));
        }

        // Scrub skills belonging only to removed projects
        if (Array.isArray(row.data.skills)) {
          row.data.skills = row.data.skills.filter(s => {
            const usedInValidLog = Array.isArray(row.data.practiceLog) && row.data.practiceLog.some(l => l.skillId === s.id);
            return validSkillIds.has(s.id) || usedInValidLog;
          });

          // Reset/recalculate XP from legitimate logs
          row.data.skills.forEach(s => {
            const earnedXp = (row.data.practiceLog || [])
              .filter(l => l.skillId === s.id && Number.isFinite(l.xp))
              .reduce((sum, l) => sum + (l.xp || 0), 0);
            s.xp = earnedXp;
          });
        }

        // PATCH cleaned row back to Supabase
        await cloudRequest(`/rest/v1/${CLOUD_TABLE}?user_id=eq.${encodeURIComponent(row.user_id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: row.data, updated_at: new Date().toISOString() })
        }).catch(err => {
          console.warn("Could not patch cleaned remote workspace for user:", row.user_id, err);
        });

        // Clean local IndexedDB partition for that user on this machine if present
        try {
          const db = await openDatabase();
          const targetKey = `workbench_state_${row.user_id}`;
          const tx = db.transaction(STORE_NAME, "readwrite");
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(targetKey);
          req.onsuccess = () => {
            if (req.result) {
              const localData = req.result;
              localData.projects = validRemoteProjects;
              localData.activity = row.data.activity;
              localData.practiceLog = row.data.practiceLog;
              localData.skills = row.data.skills;
              store.put(localData, targetKey);
            }
          };
        } catch {}

        console.log(`Cleaned leaked projects and data from collaborator ${row.user_id}: preserved ${validRemoteProjects.length} projects, removed ${removedRemoteProjectIds.size} leaked.`);
      }
    }
  } catch (err) {
    console.warn("Remote project ownership reconciliation error:", err);
  }
}

async function copyTeamProjectLink(projectId, btn = null) {
  const project = state.projects.find(p => p.id === (projectId || activeCollabProjectId));
  if (!project) return;
  ensureProjectCreator(project);

  const payload = {
    p: project,
    sharedAt: new Date().toISOString()
  };
  const json = JSON.stringify(payload);
  const base64 = btoa(encodeURIComponent(json));
  const link = `${window.location.origin}${window.location.pathname}#team-project=${base64}`;

  try {
    await navigator.clipboard.writeText(link);
    showToast("📋 Copied Team Project Link! Share this link with any member to join on PC or phone.");
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = "✓ Link Copied!";
      setTimeout(() => { if (btn) btn.textContent = orig; }, 2500);
    }
  } catch {
    window.prompt("Copy Team Project Link:", link);
  }
}

async function addCoCreator(projectId, identityOrString, role = "Editor") {
  const project = state.projects.find(p => p.id === (projectId || activeCollabProjectId));
  if (!project) return;
  ensureProjectCreator(project);
  const curUser = getActiveUser();
  const normalize = s => (s || "").toLowerCase().replace(/[\s._-]+/g, "");

  let newMember;
  if (typeof identityOrString === "object" && identityOrString !== null) {
    newMember = {
      id: identityOrString.id || uid(),
      name: identityOrString.name || identityOrString.email || "Maker",
      email: identityOrString.email || "",
      role: role || "Editor",
      addedAt: new Date().toISOString()
    };
  } else {
    const raw = String(identityOrString).trim();
    const isEmail = raw.includes("@");
    newMember = {
      id: uid(),
      name: isEmail ? raw.split("@")[0] : raw,
      email: isEmail ? raw : "",
      role: role || "Editor",
      addedAt: new Date().toISOString()
    };
  }

  // Match known maker to get real Supabase user_id if available
  try {
    const known = await getLocallyKnownUsers();
    const profiles = await cloudRequest(`/rest/v1/workbench_profiles?select=*`).catch(() => []);
    if (Array.isArray(profiles)) {
      for (const p of profiles) {
        if (p?.id && !known.has(p.id)) {
          known.set(p.id, { id: p.id, email: p.email, displayName: p.display_name });
        }
      }
    }
    const normNewName = normalize(newMember.name);
    const normNewEmail = (newMember.email || "").toLowerCase().trim();
    const newPrefix = normNewEmail ? normalize(normNewEmail.split("@")[0]) : normNewName;

    for (const m of known.values()) {
      if (m.id === curUser?.id || (curUser?.email && m.email && m.email.toLowerCase().trim() === curUser.email.toLowerCase().trim())) {
        continue;
      }
      const mEmail = (m.email || "").toLowerCase().trim();
      const mName = normalize(m.displayName || m.name || "");
      const mPrefix = mEmail ? normalize(mEmail.split("@")[0]) : "";

      const matchId = Boolean(newMember.id && m.id && newMember.id === m.id);
      const matchEmail = Boolean(normNewEmail && mEmail && normNewEmail === mEmail);
      const matchName = Boolean(normNewName && mName && !isGenericName(mName) && !isGenericName(normNewName) && normNewName === mName);
      const matchPrefix = Boolean(
        (newPrefix && mPrefix && newPrefix === mPrefix) ||
        (normNewName && mPrefix && normNewName === mPrefix) ||
        (normNewEmail && mName && !isGenericName(mName) && (mName.includes(normNewName) || normNewName.includes(mName)))
      );

      if (matchId || matchEmail || matchName || matchPrefix) {
        newMember.id = m.id;
        if (m.email) newMember.email = m.email;
        if (m.displayName || m.name) newMember.name = m.displayName || m.name;
        break;
      }
    }
  } catch {}

  const normNewName = normalize(newMember.name);
  const normNewEmail = (newMember.email || "").toLowerCase().trim();

  const exists = project.coCreators.some(c =>
    (c.id && newMember.id && c.id === newMember.id) ||
    (c.email && normNewEmail && c.email.toLowerCase().trim() === normNewEmail) ||
    (c.name && normNewName && normalize(c.name) === normNewName)
  );
  if (exists) {
    showToast(`${newMember.name} is already a co-creator on this project.`);
    return;
  }

  project.coCreators.push(newMember);
  project.updatedAt = new Date().toISOString();

  const maker = getCurrentMakerIdentity();
  makeActivity("project", `${maker.name} added ${newMember.name} as co-creator on ${project.title}`);

  syncSharedCollaborations();
  try {
    await persistState({ syncCloud: true });
    if (getCloudSession()) {
      await storeRemoteWorkspace().catch(err => console.warn("Direct cloud push notice:", err));
    }
    await pushProjectToCollaboratorWorkspaces(project);
    render();
    if ($("#detail-dialog")?.open && activeProjectId === project.id) {
      renderProjectDetail(project.id);
    }
    await renderCollaboratorsDialog(project);
    showToast(`👥 Added ${newMember.name} as a co-creator!`);
  } catch (err) {
    console.error(err);
    showToast("Could not save co-creator.");
  }
}

async function passCreatorStatus(projectId, targetId) {
  const project = state.projects.find(p => p.id === (projectId || activeCollabProjectId));
  if (!project) return;
  ensureProjectCreator(project);

  const curUser = getActiveUser();
  if (!isProjectCreator(project, curUser)) {
    showToast("Only the current Project Creator can pass immutable creator ownership.");
    return;
  }

  const target = project.coCreators.find(c => c.id === targetId);
  if (!target) return;

  const confirmed = window.confirm(
    `Transfer immutable Project Creator ownership to “${target.name}”?\n\nYou will step down to a Co-Creator (Editor) role.`
  );
  if (!confirmed) return;

  const previousCreator = {
    id: project.creator.id || uid(),
    name: project.creator.name || "Previous Creator",
    email: project.creator.email || "",
    role: "Editor",
    addedAt: new Date().toISOString()
  };

  project.creator = {
    id: target.id,
    name: target.name,
    email: target.email
  };

  project.coCreators = project.coCreators.filter(c => c.id !== target.id);
  project.coCreators.unshift(previousCreator);
  project.updatedAt = new Date().toISOString();

  const maker = getCurrentMakerIdentity();
  makeActivity("project", `${maker.name} transferred Project Creator ownership of ${project.title} to ${target.name}`);

  syncSharedCollaborations();
  try {
    await persistState({ syncCloud: true });
    if (getCloudSession()) {
      await storeRemoteWorkspace().catch(err => console.warn("Direct cloud push notice:", err));
    }
    await pushProjectToCollaboratorWorkspaces(project);
    render();
    if ($("#detail-dialog")?.open && activeProjectId === project.id) {
      renderProjectDetail(project.id);
    }
    await renderCollaboratorsDialog(project);
    showToast(`👑 Project creator ownership successfully passed to ${target.name}!`);
  } catch (err) {
    console.error(err);
    showToast("Could not transfer creator status.");
  }
}

async function toggleCoCreatorRole(projectId, targetId) {
  const project = state.projects.find(p => p.id === (projectId || activeCollabProjectId));
  if (!project) return;

  const target = project.coCreators.find(c => c.id === targetId);
  if (!target) return;

  target.role = target.role === "Editor" ? "Viewer" : target.role === "Viewer" ? "Contributor" : "Editor";
  project.updatedAt = new Date().toISOString();

  syncSharedCollaborations();
  try {
    await persistState({ syncCloud: true });
    if (getCloudSession()) {
      await storeRemoteWorkspace().catch(err => console.warn("Direct cloud push notice:", err));
    }
    await pushProjectToCollaboratorWorkspaces(project);
    await renderCollaboratorsDialog(project);
    showToast(`Updated role for ${target.name} to ${target.role}.`);
  } catch (err) {
    console.error(err);
  }
}

async function removeCoCreator(projectId, targetId) {
  const project = state.projects.find(p => p.id === (projectId || activeCollabProjectId));
  if (!project) return;

  const target = project.coCreators.find(c => c.id === targetId);
  if (!target) return;

  if (!window.confirm(`Remove ${target.name} from co-creators of “${project.title}”?`)) return;

  project.coCreators = project.coCreators.filter(c => c.id !== targetId);
  project.updatedAt = new Date().toISOString();

  const maker = getCurrentMakerIdentity();
  makeActivity("project", `${maker.name} removed ${target.name} from ${project.title}`);

  syncSharedCollaborations();

  const curUser = getActiveUser();
  const isSelf = targetId === curUser?.id || (curUser?.email && target.email && target.email.toLowerCase().trim() === curUser.email.toLowerCase().trim());
  const stillCollaborator = isUserCollaborator(project, curUser);

  if (isSelf || !stillCollaborator) {
    state.projects = state.projects.filter(p => p.id !== project.id);
    activeCollabProjectId = null;
    $("#collaborators-dialog")?.close();
    if (activeProjectId === project.id) {
      $("#detail-dialog")?.close();
      activeProjectId = null;
    }
  }

  try {
    await persistState({ syncCloud: true });
    if (getCloudSession()) {
      await storeRemoteWorkspace().catch(err => console.warn("Direct cloud push notice:", err));
    }
    await pushProjectToCollaboratorWorkspaces(project);
    render();
    if ($("#detail-dialog")?.open && activeProjectId === project.id) {
      renderProjectDetail(project.id);
    }
    if ($("#collaborators-dialog")?.open && activeCollabProjectId === project.id) {
      await renderCollaboratorsDialog(project);
    }
    showToast(`Removed ${target.name} from project team.`);
  } catch (err) {
    console.error(err);
    showToast("Could not remove co-creator.");
  }
}

function checkMaterialsInventory(projectId) {
  const project = state.projects.find(p => p.id === (projectId || activeProjectId));
  if (!project || !Array.isArray(project.materials) || project.materials.length === 0) {
    showToast("No materials found in this project to check against inventory.");
    return;
  }
  const inventory = Array.isArray(state.inventory) ? state.inventory : [];
  let inStockCount = 0;
  let partialCount = 0;
  let outCount = 0;

  for (const mat of project.materials) {
    const mName = (mat.name || "").toLowerCase().trim();
    if (!mName) continue;

    const matched = inventory.find(inv => {
      const invName = (inv.name || "").toLowerCase().trim();
      return invName === mName || invName.includes(mName) || mName.includes(invName);
    });

    const parsedQty = parseFloat(mat.qty || mat.quantity || 1) || 1;
    if (matched) {
      const invQty = parseFloat(matched.quantity || matched.stock || 0) || 0;
      if (invQty >= parsedQty) {
        inStockCount++;
        mat._stockStatus = { class: "stock-in", text: `✓ In Depot (${invQty} avail)` };
      } else if (invQty > 0) {
        partialCount++;
        mat._stockStatus = { class: "stock-partial", text: `⚠ Partial (${invQty}/${parsedQty})` };
      } else {
        outCount++;
        mat._stockStatus = { class: "stock-out", text: `✕ Out of Stock (0 in depot)` };
      }
    } else {
      outCount++;
      mat._stockStatus = { class: "stock-out", text: `✕ Not in Depot` };
    }
  }

  renderProjectDetail(project.id);
  showToast(`Inventory Check: ${inStockCount} In Stock, ${partialCount} Partial, ${outCount} Out of Stock / Missing.`);
}

async function addMissingMaterialsToRestock(projectId) {
  const project = state.projects.find(p => p.id === (projectId || activeProjectId));
  if (!project || !Array.isArray(project.materials) || project.materials.length === 0) {
    showToast("No materials found in this project.");
    return;
  }
  state.depotRestockList = state.depotRestockList || [];
  const inventory = Array.isArray(state.inventory) ? state.inventory : [];
  let addedCount = 0;

  for (const mat of project.materials) {
    const mName = (mat.name || "").toLowerCase().trim();
    if (!mName) continue;

    const matched = inventory.find(inv => {
      const invName = (inv.name || "").toLowerCase().trim();
      return invName === mName || invName.includes(mName) || mName.includes(invName);
    });

    const parsedQty = parseFloat(mat.qty || mat.quantity || 1) || 1;
    const invQty = matched ? (parseFloat(matched.quantity || matched.stock || 0) || 0) : 0;
    const hasEnoughInDepot = Boolean(matched && invQty >= parsedQty);
    const isNeeded = !hasEnoughInDepot && mat.status !== "have";

    if (isNeeded) {
      const alreadyInRestock = state.depotRestockList.find(r => (r.name || "").toLowerCase().trim() === mName);
      if (!alreadyInRestock) {
        state.depotRestockList.push({
          id: matched ? matched.id : `restock-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: mat.name,
          category: mat.group || "Project Material",
          currentQty: invQty,
          restockQty: Math.max(1, Math.ceil(parsedQty - invQty)),
          unit: "units",
          price: Number(mat.cost) || 0,
          supplier: "",
          location: matched?.location || "",
          notes: `Needed for project: ${project.title}`,
          addedAt: new Date().toISOString()
        });
        addedCount++;
      }
    }
  }

  await persistState();
  renderInventory();
  if (addedCount > 0) {
    showToast(`Added ${addedCount} needed item(s) to Depot Restock List! 🛒`);
  } else {
    showToast("All needed items are already on your Restock List or in stock.");
  }
}

function downloadTextFile(filename, text, mimeType = "text/html;charset=utf-8") {
  const blob = new Blob([text], { type: mimeType });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }, 100);
}

function exportProjectBinder(projectId) {
  const project = state.projects.find(p => p.id === (projectId || activeProjectId));
  if (!project) return;

  const safeTitle = (project.title || "Project").replace(/[^a-z0-9_-]/gi, "_");
  const tasks = Array.isArray(project.tasks) ? project.tasks : [];
  const materials = Array.isArray(project.materials) ? project.materials : [];
  const notes = Array.isArray(project.notes) ? [...project.notes].sort((a, b) => new Date(b.at) - new Date(a.at)) : [];
  const totalCost = materials.reduce((sum, m) => sum + (Number(m.cost) || 0), 0);
  const doneTasks = tasks.filter(t => t.done).length;
  const initialPercent = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;
  const isCollab = isCollaborativeProject(project);

  const htmlDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHTML(project.title)} — Digital Build Binder</title>
  <style>
    :root {
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --text: #0f172a;
      --muted: #64748b;
      --border: #e2e8f0;
      --primary: #d97706;
      --primary-hover: #b45309;
      --success: #16a34a;
      --accent: #2563eb;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0b0f17;
        --card-bg: #151b26;
        --text: #f1f5f9;
        --muted: #94a3b8;
        --border: #1e293b;
        --primary: #f59e0b;
        --primary-hover: #d97706;
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 30px 20px 80px;
      max-width: 960px;
      margin: 0 auto;
    }
    header {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 28px;
      margin-bottom: 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.03);
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      flex-wrap: wrap;
    }
    h1 {
      font-size: 28px;
      font-weight: 800;
      color: var(--text);
      margin-bottom: 8px;
    }
    .badges {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 16px;
      background: var(--border);
      color: var(--text);
    }
    .badge.primary { background: #fef3c7; color: #b45309; }
    .badge.success { background: #dcfce7; color: #15803d; }
    .badge.info { background: #e0f2fe; color: #0369a1; }
    .description {
      font-size: 15px;
      color: var(--muted);
      margin-bottom: 18px;
      white-space: pre-line;
    }
    .meta-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 18px;
      font-size: 13px;
      color: var(--muted);
      border-top: 1px solid var(--border);
      padding-top: 14px;
    }
    .actions-bar {
      margin-top: 18px;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .btn {
      background: var(--primary);
      color: #fff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s;
    }
    .btn:hover { background: var(--primary-hover); }
    .btn-outline {
      background: transparent;
      color: var(--text);
      border: 1px solid var(--border);
    }
    .btn-outline:hover { background: var(--border); }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.02);
    }
    .card-title {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .progress-box {
      margin-bottom: 18px;
    }
    .progress-track {
      height: 10px;
      background: var(--border);
      border-radius: 5px;
      overflow: hidden;
      margin-bottom: 6px;
    }
    .progress-fill {
      height: 100%;
      background: var(--success);
      width: ${initialPercent}%;
      transition: width 0.25s ease;
    }
    .progress-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--muted);
      display: flex;
      justify-content: space-between;
    }
    .task-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .task-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: var(--bg);
      transition: background 0.15s;
    }
    .task-item.is-done {
      text-decoration: line-through;
      opacity: 0.65;
    }
    .task-item input[type="checkbox"] {
      width: 17px;
      height: 17px;
      cursor: pointer;
    }
    .task-phase-tag {
      font-size: 10.5px;
      padding: 2px 6px;
      background: var(--border);
      border-radius: 4px;
      margin-left: auto;
      color: var(--muted);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13.5px;
      margin-top: 10px;
    }
    th, td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    th {
      font-weight: 700;
      color: var(--muted);
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
    }
    .journal-entry {
      border-left: 3px solid var(--primary);
      padding: 8px 16px;
      margin-bottom: 14px;
      background: var(--bg);
      border-radius: 0 6px 6px 0;
    }
    .journal-date {
      font-size: 11px;
      color: var(--muted);
      font-weight: 600;
      margin-bottom: 4px;
    }
    .team-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
    }
    .team-card {
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--bg);
    }
    .team-role {
      font-size: 11px;
      font-weight: 700;
      color: var(--primary);
      text-transform: uppercase;
    }
    @media print {
      body { background: #fff; color: #000; padding: 0; max-width: 100%; }
      .actions-bar, button { display: none !important; }
      .card, header { box-shadow: none; border: 1px solid #ccc; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <header>
    <div class="header-top">
      <div>
        <h1>${escapeHTML(project.title)}</h1>
        <div class="badges">
          <span class="badge primary">● ${escapeHTML(project.status || "In Progress")}</span>
          <span class="badge info">⚡ ${escapeHTML(project.priority || "Normal")} Priority</span>
          ${isCollab ? `<span class="badge">👥 Team (${(project.coCreators || []).length + 1} members)</span>` : ""}
          ${project.isGift ? `<span class="badge" style="background:#fce7f3;color:#be185d">🎁 Gift for ${escapeHTML(project.giftRecipient || "Someone")}</span>` : ""}
        </div>
      </div>
    </div>
    <p class="description">${escapeHTML(project.description || "Digital build binder and project archive.")}</p>
    <div class="meta-bar">
      <span>📅 Updated: ${new Date(project.updatedAt || Date.now()).toLocaleDateString()}</span>
      ${project.targetDate ? `<span>🎯 Target Due Date: ${escapeHTML(project.targetDate)}</span>` : ""}
      ${project.timeSpent ? `<span>⏱️ Time Logged: ${formatMinutes(project.timeSpent)}</span>` : ""}
      <span>🏷️ Tags: ${(project.tags || []).join(", ") || "None"}</span>
    </div>
    <div class="actions-bar">
      <button type="button" class="btn" onclick="window.print()">🖶 Print Build Binder</button>
      <button type="button" class="btn btn-outline" onclick="resetChecklist()">↺ Reset Checklist</button>
    </div>
  </header>

  ${isCollab ? `
  <section class="card">
    <div class="card-title"><span>👥 Project Build Team</span></div>
    <div class="team-grid">
      <div class="team-card">
        <div class="team-role">👑 Project Creator</div>
        <strong>${escapeHTML(project.creator?.name || "Creator")}</strong>
        <div style="font-size:12px;color:var(--muted)">${escapeHTML(project.creator?.email || "")}</div>
      </div>
      ${(project.coCreators || []).map(c => {
        const rawRole = String(c.role || "Editor").toLowerCase();
        const safeRole = rawRole === "viewer" ? "👁️ Viewer" : "✏️ Editor";
        return `
        <div class="team-card">
          <div class="team-role">${safeRole}</div>
          <strong>${escapeHTML(c.name || c.email || "Collaborator")}</strong>
          <div style="font-size:12px;color:var(--muted)">${escapeHTML(c.email || "")}</div>
        </div>
        `;
      }).join("")}
    </div>
  </section>
  ` : ""}

  <section class="card">
    <div class="card-title">
      <span>📋 Interactive Build Steps</span>
      <span id="step-count" style="font-size:13px;color:var(--muted);font-weight:normal">${doneTasks}/${tasks.length} Completed</span>
    </div>
    <div class="progress-box">
      <div class="progress-track"><div class="progress-fill" id="progress-fill"></div></div>
      <div class="progress-label">
        <span id="percent-label">${initialPercent}% Complete</span>
        <span>Interactive Offline Tracker</span>
      </div>
    </div>
    ${tasks.length ? `
      <ul class="task-list" id="task-list">
        ${tasks.map((task, idx) => `
          <li class="task-item ${task.done ? "is-done" : ""}" data-idx="${idx}">
            <input type="checkbox" id="task-${idx}" ${task.done ? "checked" : ""} onchange="toggleTask(${idx})">
            <label for="task-${idx}">${escapeHTML(task.text)}</label>
            ${task.phase ? `<span class="task-phase-tag">${escapeHTML(task.phase)}</span>` : ""}
          </li>
        `).join("")}
      </ul>
    ` : `<p style="color:var(--muted);font-style:italic">No steps recorded for this project.</p>`}
  </section>

  <section class="card">
    <div class="card-title">
      <span>🪵 Bill of Materials (BOM)</span>
      <span style="font-size:13px;color:var(--muted);font-weight:normal">${materials.length} items · Total ${formatMoney(totalCost)}</span>
    </div>
    ${materials.length ? `
      <table>
        <thead>
          <tr>
            <th>Material / Part</th>
            <th>Group</th>
            <th>Qty</th>
            <th>Est. Cost</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${materials.map(m => `
            <tr>
              <td><strong>${escapeHTML(m.name)}</strong></td>
              <td>${escapeHTML(m.group || "Supplies")}</td>
              <td>${escapeHTML(m.qty || "-")}</td>
              <td>${Number(m.cost) > 0 ? formatMoney(m.cost) : "-"}</td>
              <td>${m.status === "have" ? "✓ In Hand" : m.status === "ordered" ? "↗ Ordered" : "○ Need"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    ` : `<p style="color:var(--muted);font-style:italic">No materials tracked.</p>`}
  </section>

  ${notes.length ? `
  <section class="card">
    <div class="card-title"><span>📝 Progress Journal</span></div>
    ${notes.map(n => `
      <div class="journal-entry">
        <div class="journal-date">${new Date(n.at).toLocaleString()}</div>
        <p>${escapeHTML(n.text)}</p>
      </div>
    `).join("")}
  </section>
  ` : ""}

  ${project.isGift ? `
  <section class="card" style="border: 2px dashed #f472b6; background: #fffdfd;">
    <div class="card-title" style="color: #be185d;"><span>🎁 Printable Maker Certificate & Care Tag</span></div>
    <div style="padding: 16px; border: 1px solid #fbcfe8; border-radius: 8px; background: #fff;">
      <h3 style="font-family: serif; font-size: 20px; color: #9d174d; margin-bottom: 8px;">Handcrafted Especially for ${escapeHTML(project.giftRecipient || "Someone Special")}</h3>
      <p style="font-size: 14px; margin-bottom: 8px;"><strong>Project:</strong> ${escapeHTML(project.title)}</p>
      ${project.giftOccasion ? `<p style="font-size: 14px; margin-bottom: 8px;"><strong>Occasion:</strong> ${escapeHTML(project.giftOccasion)}</p>` : ""}
      ${project.giftCareInstructions ? `<p style="font-size: 13px; color: #475569; margin-top: 10px;"><strong>Care Instructions:</strong> ${escapeHTML(project.giftCareInstructions)}</p>` : ""}
      <div style="margin-top: 14px; font-size: 12px; font-style: italic; color: #94a3b8;">Lovingly made by ${escapeHTML(project.creator?.name || "The Maker")}</div>
    </div>
  </section>
  ` : ""}

  <script>
    const storageKey = "binder_tasks_" + "${project.id}";
    let taskStates = [];
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) taskStates = JSON.parse(saved);
    } catch {}

    function updateProgress() {
      const items = document.querySelectorAll("#task-list .task-item");
      if (!items.length) return;
      let done = 0;
      items.forEach((item, idx) => {
        const chk = item.querySelector("input[type='checkbox']");
        if (chk && chk.checked) {
          done++;
          item.classList.add("is-done");
        } else {
          item.classList.remove("is-done");
        }
      });
      const pct = Math.round((done / items.length) * 100);
      const fill = document.getElementById("progress-fill");
      if (fill) fill.style.width = pct + "%";
      const lbl = document.getElementById("percent-label");
      if (lbl) lbl.textContent = pct + "% Complete";
      const cnt = document.getElementById("step-count");
      if (cnt) cnt.textContent = done + "/" + items.length + " Completed";
    }

    function toggleTask(idx) {
      const chk = document.getElementById("task-" + idx);
      taskStates[idx] = chk ? chk.checked : false;
      try {
        localStorage.setItem(storageKey, JSON.stringify(taskStates));
      } catch {}
      updateProgress();
    }

    function resetChecklist() {
      if (!confirm("Reset checklist to original export state?")) return;
      localStorage.removeItem(storageKey);
      location.reload();
    }

    if (Array.isArray(taskStates) && taskStates.length) {
      taskStates.forEach((val, idx) => {
        const chk = document.getElementById("task-" + idx);
        if (chk && typeof val === "boolean") chk.checked = val;
      });
      updateProgress();
    }
  </script>
</body>
</html>`;

  downloadTextFile(`Build_Binder_${safeTitle}_${project.id.slice(0, 8)}.html`, htmlDoc);
  showToast(`Exported Digital Build Binder for "${project.title}"! 📦`);
}

$("#goal-form")?.addEventListener("submit", event => void handleGoalSubmit(event));
$("#maintenance-form")?.addEventListener("submit", event => void handleMaintenanceSubmit(event));
$("#units-form")?.addEventListener("submit", event => { event.preventDefault(); void saveUnitsSettings(); });
$("#soundscape-volume")?.addEventListener("input", event => setSoundscapeVolume(event.target.value));
$("#tool-cut-stock")?.addEventListener("input", () => runCutOptimizer());
$("#tool-cut-kerf")?.addEventListener("input", () => runCutOptimizer());
$("#detail-dialog").addEventListener("close", () => { activeProjectId = null; });
void initialize();



if (typeof window !== "undefined") {
  window.openToolsDialog = openToolsDialog;
  window.runCutListOptimizer = runCutListOptimizer;
  window.renderInventory = renderInventory;
  window.openInventoryDialog = openInventoryDialog;
  window.openWorkshopBlueprint = openWorkshopBlueprint;
  window.openQuoteDialog = openQuoteDialog;
}
