const DB_NAME = "workbench-project-journal";
const DB_VERSION = 1;
const STORE_NAME = "workspace";
const STATE_KEY = "main";
const XP_PER_LEVEL = 100;
const CLOUD_CONFIG_KEY = "workbench-cloud-config";
const CLOUD_SESSION_KEY = "workbench-cloud-session";
const CLOUD_SYNC_KEY = "workbench-cloud-last-sync";
const CLOUD_PKCE_KEY = "workbench-cloud-pkce";
const CLOUD_TABLE = "workbench_workspace";
const PHOTO_BUCKET = "workbench-photos";
const STARTER_SKILLS = [
  ["Knitting", "Textiles"],
  ["Crocheting", "Textiles"],
  ["Electronics", "Hardware"],
  ["Programming", "Digital"],
  ["Gongfu cha", "Tea practice"],
  ["Cello", "Music"],
  ["Guqin", "Music"],
  ["Singing", "Music"],
  ["3D modeling", "Digital fabrication"],
  ["Woodworking", "Workshop"],
  ["Sewing", "Textiles"],
  ["Drawing", "Visual arts"],
  ["Photography", "Media"]
];

const STATUS_LABELS = {
  "in-progress": "In progress",
  planned: "Planned",
  completed: "Completed",
  postponed: "Postponed",
  "on-hold": "On hold"
};

const PROJECT_TEMPLATES = {
  craft: {
    title: "Woodworking / Craft Build",
    description: "Handcrafted physical piece. Focused on precision, joinery, and clean finish.",
    status: "in-progress",
    priority: "normal",
    tags: ["workshop", "craft", "handmade"],
    skillNames: ["Woodworking"],
    tasks: [
      "Gather measurements & create dimension sketch",
      "Source lumber / materials & hardware",
      "Rough cut parts to length",
      "Cut joinery & test dry fit",
      "Glue-up and clamping",
      "Sand progression (80 -> 120 -> 220 grit)",
      "Apply protective finish coat"
    ]
  },
  electronics: {
    title: "Electronics / Hardware Prototype",
    description: "Custom embedded device / circuit build. Breadboard to final enclosure.",
    status: "in-progress",
    priority: "high",
    tags: ["electronics", "hardware", "diy", "iot"],
    skillNames: ["Electronics"],
    tasks: [
      "Draft schematic & pinout diagram",
      "Order components & microcontroller",
      "Breadboard test circuit & flash initial firmware",
      "Verify sensor readings & logic",
      "Solder protoboard or design PCB",
      "Design 3D printed enclosure"
    ]
  },
  software: {
    title: "Software / Web App MVP",
    description: "Lean minimum viable product focused on solving one problem elegantly.",
    status: "in-progress",
    priority: "normal",
    tags: ["code", "software", "mvp"],
    skillNames: ["Programming"],
    tasks: [
      "Define user stories & essential scope",
      "Setup repo & boilerplate architecture",
      "Implement core data model & persistence",
      "Build primary UI flow",
      "Test edge cases & error handling",
      "Deploy & gather initial user feedback"
    ]
  },
  study: {
    title: "Learning & Skill Sprint",
    description: "Focused study sprint to level up a specific craft or discipline.",
    status: "in-progress",
    priority: "normal",
    tags: ["learning", "practice", "study"],
    skillNames: [],
    tasks: [
      "Pick top learning resource / curriculum",
      "Complete fundamentals module",
      "Build first hands-on exercise project",
      "Log daily practice sessions",
      "Document key takeaways & build portfolio piece"
    ]
  },
  "3dprint": {
    title: "3D Printing & Design",
    description: "CAD modeling, slicing, and 3D printing a custom functional part or enclosure.",
    status: "in-progress",
    priority: "normal",
    tags: ["3dprinting", "cad", "fabrication"],
    skillNames: ["3D modeling"],
    tasks: [
      "Take caliper measurements of interface points",
      "Model CAD geometry in Fusion/FreeCAD",
      "Export STL/STEP & slice test print",
      "Inspect test fit and adjust tolerances",
      "Print final model in desired filament",
      "Post-process (deburr, insert heat-set inserts)"
    ]
  }
};

const state = {
  projects: [],
  skills: [],
  activity: [],
  practiceLog: [],
  inventory: [],
  customTemplates: [],
  makerGoals: [],
  maintenance: [],
  currency: "USD",
  unitSystem: "in",
  weeklyGoal: 60,
  starterSkillsAdded: false,
  hasUserChanges: false
};

const CURRENCIES = {
  USD: { code: "USD", symbol: "$", name: "US Dollar ($)", rate: 1.0 },
  EUR: { code: "EUR", symbol: "€", name: "Euro (€)", rate: 0.92 },
  GBP: { code: "GBP", symbol: "£", name: "British Pound (£)", rate: 0.79 },
  CAD: { code: "CAD", symbol: "CA$", name: "Canadian Dollar (CA$)", rate: 1.36 },
  AUD: { code: "AUD", symbol: "AU$", name: "Australian Dollar (AU$)", rate: 1.52 },
  JPY: { code: "JPY", symbol: "¥", name: "Japanese Yen (¥)", rate: 155.0 },
  CHF: { code: "CHF", symbol: "CHF ", name: "Swiss Franc (CHF)", rate: 0.90 },
  ILS: { code: "ILS", symbol: "₪", name: "Israeli Shekel (₪)", rate: 3.70 }
};

function formatMoney(amount) {
  const curr = CURRENCIES[state.currency] || CURRENCIES.USD;
  const num = Number(amount) || 0;
  if (curr.code === "JPY") {
    return `${curr.symbol}${Math.round(num).toLocaleString()}`;
  }
  return `${curr.symbol}${num.toFixed(2)}`;
}

function getCurrencySymbol() {
  return (CURRENCIES[state.currency] || CURRENCIES.USD).symbol;
}

function updateTopbarUnitsPill() {
  const label = $("#topbar-units-label");
  if (label) {
    const curr = CURRENCIES[state.currency] || CURRENCIES.USD;
    label.textContent = `${curr.symbol} ${curr.code} · ${state.unitSystem || "in"}`;
  }
}

let database;
let activeProjectId = null;
let activePhotoTarget = null;
let practiceLogLimit = 12;
let projectViewMode = localStorage.getItem("workbench-project-mode") || "grid";
let plannerMode = "calendar";
let calendarDate = new Date();
let toastTimer;
let syncTimer;
let cloudWorking = false;
let cloudSyncPending = false;
let cloudConflict = null;
const imageUrls = new Map();

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const uid = () => crypto.randomUUID();

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

let adminInspectionActive = false;
let adminInspectionBackup = null;
let adminInspectedUserName = "";

function getActiveStateKey() {
  const session = getCloudSession();
  if (session?.user?.id) {
    return `workbench_state_${session.user.id}`;
  }
  return STATE_KEY;
}

function resetWorkspaceStateToDefault() {
  state.projects = [];
  state.skills = [];
  state.activity = [];
  state.practiceLog = [];
  state.inventory = [];
  state.customTemplates = [];
  state.makerGoals = [];
  state.maintenance = [];
  state.currency = "USD";
  state.unitSystem = "in";
  state.weeklyGoal = 60;
  state.updatedAt = "";
  state.hasUserChanges = false;
  state.starterSkillsAdded = true;
}

function readSavedState(overrideKey = null) {
  return new Promise((resolve, reject) => {
    const key = overrideKey || getActiveStateKey();
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key);
    request.onsuccess = () => {
      // If an explicit override key was requested, never fall back to legacy STATE_KEY
      if (overrideKey) {
        resolve(request.result || null);
        return;
      }
      // If user-specific key is empty:
      // ONLY the primary admin / shop owner should migrate legacy unpartitioned STATE_KEY!
      // New or non-owner users must start fresh with their own blank workspace.
      if (!request.result && key !== STATE_KEY) {
        const session = getCloudSession();
        const primaryAdminId = getPrimaryAdminId();
        const user = getActiveUser();
        const isCurrentPrimary = Boolean(user?.isPrimary || (session?.user?.id && primaryAdminId && session.user.id === primaryAdminId) || (user?.email && user.email.toLowerCase().includes("rakowshik")));
        if (isCurrentPrimary) {
          const fallback = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(STATE_KEY);
          fallback.onsuccess = () => resolve(fallback.result || null);
          fallback.onerror = () => resolve(null);
          return;
        }
        resolve(null);
      } else {
        resolve(request.result || null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

function persistState({ syncCloud = true, preserveTimestamp = false } = {}) {
  if (adminInspectionActive) {
    return Promise.resolve(); // Never overwrite another user's workbench during inspection!
  }
  return new Promise((resolve, reject) => {
    if (!preserveTimestamp) state.updatedAt = new Date().toISOString();
    if (syncCloud) state.hasUserChanges = true;
    const key = getActiveStateKey();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(state, key);
    transaction.oncomplete = () => {
      resolve();
      if (syncCloud) scheduleCloudSync();
    };
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function makeActivity(kind, text, details = {}) {
  const activity = { id: uid(), kind, text, at: new Date().toISOString(), ...details };
  state.activity.unshift(activity);
  state.activity = state.activity.slice(0, 30);
  return activity;
}

function migratePracticeLog(activity, skills) {
  return activity
    .filter(item => item?.kind === "xp" && typeof item.text === "string")
    .map(item => ({
      ...item,
      skillId: item.skillId || skills.find(skill => item.text.startsWith(`${skill.name} +`))?.id || ""
    }));
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatFullDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMinutes(mins) {
  mins = Math.max(0, Math.round(mins || 0));
  if (mins === 0) return "0m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function activeProject(project) {
  return !["completed", "postponed", "on-hold"].includes(safeStatus(project.status));
}

function safePriority(priority) {
  return ["high", "normal", "low"].includes(priority) ? priority : "normal";
}

function priorityLabel(priority) {
  return ({ high: "High", normal: "Normal", low: "Low" })[safePriority(priority)];
}

function relativeTime(value) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Recently";
  const elapsed = Math.max(0, Date.now() - timestamp);
  const days = Math.floor(elapsed / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

function skillLevel(xp) {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

function skillProgress(xp) {
  return xp % XP_PER_LEVEL;
}

function getPracticeStats() {
  const dates = new Set();
  const allLogs = [
    ...(Array.isArray(state.practiceLog) ? state.practiceLog : []),
    ...(Array.isArray(state.activity) ? state.activity.filter(item => item?.kind === "xp" || item?.kind === "time" || item?.kind === "practice" || item?.skillId) : [])
  ];
  for (const item of allLogs) {
    const timestamp = item.at || item.createdAt || item.date;
    if (timestamp) {
      const d = new Date(timestamp);
      if (Number.isFinite(d.getTime())) {
        dates.add(localDateString(d));
      }
    }
  }

  const today = new Date();
  const todayStr = localDateString(today);
  const yesterday = new Date(Date.now() - 86400000);
  const yesterdayStr = localDateString(yesterday);

  let streak = 0;
  let checkDate = dates.has(todayStr) ? today : (dates.has(yesterdayStr) ? yesterday : null);

  if (checkDate) {
    while (true) {
      const dStr = localDateString(checkDate);
      if (dates.has(dStr)) {
        streak++;
        checkDate = new Date(checkDate.getTime() - 86400000);
      } else {
        break;
      }
    }
  }

  const dayOfWeek = today.getDay();
  const distanceToMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(today.getTime() - distanceToMonday * 86400000);

  const weekDays = [];
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getTime() + i * 86400000);
    const dStr = localDateString(d);
    weekDays.push({
      name: dayNames[i],
      dateStr: dStr,
      active: dates.has(dStr),
      isToday: dStr === todayStr
    });
  }

  const thisWeekCount = weekDays.filter(w => w.active).length;
  const totalSessions = Math.max((state.practiceLog || []).length, dates.size);
  return { streak, weekDays, thisWeekCount, totalSessions };
}

function renderStreakWidget() {
  const stats = getPracticeStats();
  return `
    <section class="streak-widget">
      <div class="streak-left">
        <div class="streak-flame">${stats.streak > 0 ? "🔥" : "🌱"}</div>
        <div>
          <div class="streak-heading">${stats.streak > 0 ? `${stats.streak}-day practice streak!` : "Start your practice streak"}</div>
          <div class="streak-caption">${stats.thisWeekCount} of 7 days practiced this week · ${stats.totalSessions} total session${stats.totalSessions === 1 ? "" : "s"} logged</div>
        </div>
      </div>
      <div class="streak-week-dots" title="Weekly consistency (Mon-Sun)">
        ${stats.weekDays.map(d => `
          <div class="streak-day">
            <span class="streak-day-label">${d.name}</span>
            <div class="streak-dot ${d.active ? "active" : ""} ${d.isToday ? "today" : ""}" title="${d.name} (${d.dateStr}): ${d.active ? "Practiced" : "No practice logged"}"></div>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function projectImageCount(project) {
  return (project.folders || []).reduce((count, folder) => count + (folder.images || []).length, 0);
}

function projectTaskProgress(project) {
  const tasks = project.tasks || [];
  const completed = tasks.filter(task => task.done).length;
  return { completed, total: tasks.length, percent: tasks.length ? Math.round(completed / tasks.length * 100) : 0 };
}

function imageUrl(image) {
  if (!imageUrls.has(image.id)) imageUrls.set(image.id, URL.createObjectURL(image.blob));
  return imageUrls.get(image.id);
}

function releaseImageUrl(imageId) {
  const url = imageUrls.get(imageId);
  if (!url) return;
  URL.revokeObjectURL(url);
  imageUrls.delete(imageId);
}

function openLightbox(imageId, caption = "") {
  let imageBlob = null;
  for (const project of state.projects) {
    for (const folder of project.folders || []) {
      const found = (folder.images || []).find(img => img.id === imageId);
      if (found) {
        imageBlob = found;
        break;
      }
    }
    if (imageBlob) break;
  }
  if (!imageBlob) return;
  const dialog = $("#lightbox-dialog");
  const imgEl = $("#lightbox-img");
  const capEl = $("#lightbox-caption");
  if (!dialog || !imgEl) return;
  imgEl.dataset.imageId = imageId;
  imgEl.src = imageUrl(imageBlob);
  imgEl.alt = caption || imageBlob.name || "Enlarged photo";
  if (capEl) capEl.textContent = caption || imageBlob.name || "";
  dialog.showModal();
}

async function optimizeImage(file, maxDimension = 1600, quality = 0.85) {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml" || file.type === "image/gif") {
    return file;
  }
  return new Promise(resolve => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const { width, height } = img;
      if (width <= maxDimension && height <= maxDimension && file.size < 400 * 1024) {
        resolve(file);
        return;
      }
      const scale = Math.min(1, maxDimension / Math.max(width, height));
      const targetWidth = Math.round(width * scale);
      const targetHeight = Math.round(height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      canvas.toBlob(blob => {
        if (!blob || blob.size >= file.size) {
          resolve(file);
        } else {
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
        }
      }, "image/jpeg", quality);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
    img.src = objectUrl;
  });
}

const THEME_KEY = "workbench-theme";
function getSavedTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || "auto";
  } catch {
    return "auto";
  }
}

function applyTheme(theme = getSavedTheme()) {
  const isDark = theme === "dark" || (theme === "auto" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  if (isDark) {
    document.documentElement.setAttribute("data-theme", "dark");
    document.body?.setAttribute("data-theme", "dark");
    document.documentElement.classList.add("theme-dark");
    document.body?.classList.add("theme-dark");
  } else {
    document.documentElement.setAttribute("data-theme", "light");
    document.body?.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("theme-dark");
    document.body?.classList.remove("theme-dark");
  }
  const btn = $("#theme-toggle-btn");
  if (btn) {
    const icon = btn.querySelector(".theme-icon");
    if (icon) icon.textContent = isDark ? "☀️" : "🌙";
    btn.title = `Switch to ${isDark ? "light" : "dark"} mode`;
    btn.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} mode`);
  }
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute("content", isDark ? "#171a16" : "#f5f3ed");
  }
}

function toggleTheme() {
  const currentAttr = document.documentElement.getAttribute("data-theme");
  const isCurrentlyDark = currentAttr === "dark" || (!currentAttr && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  const nextTheme = isCurrentlyDark ? "light" : "dark";
  try {
    localStorage.setItem(THEME_KEY, nextTheme);
  } catch (e) {
    console.warn("Storage restricted", e);
  }
  applyTheme(nextTheme);
  showToast(`Switched to ${nextTheme} mode.`);
}

let activeSpeechRecognition = null;
function toggleSpeechDictation(button, targetInput) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast("Voice dictation is not supported by your browser.");
    return;
  }
  if (activeSpeechRecognition) {
    try { activeSpeechRecognition.stop(); } catch {}
    activeSpeechRecognition = null;
    button.classList.remove("is-recording");
    button.innerHTML = "🎙 Dictate";
    showToast("Voice dictation stopped.");
    return;
  }
  try {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = navigator.language || "en-US";
    activeSpeechRecognition = recognition;

    button.classList.add("is-recording");
    const origHTML = button.innerHTML;
    button.innerHTML = "🔴 Listening...";
    showToast("Listening... speak your note or task.");

    recognition.onresult = event => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join(" ");
      if (transcript && targetInput) {
        targetInput.value = targetInput.value ? `${targetInput.value} ${transcript}` : transcript;
        targetInput.dispatchEvent(new Event("input", { bubbles: true }));
        targetInput.focus();
        showToast(`Dictated: "${transcript}"`);
      }
    };
    recognition.onerror = event => {
      console.warn("Speech error", event);
      if (event.error !== "no-speech") showToast("Voice recognition stopped or unavailable.");
    };
    recognition.onend = () => {
      activeSpeechRecognition = null;
      button.classList.remove("is-recording");
      button.innerHTML = origHTML;
    };
    recognition.start();
  } catch (err) {
    console.warn("Speech recognition failed to start", err);
    showToast("Could not access microphone.");
    button.classList.remove("is-recording");
  }
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

function getCloudConfig() {
  try {
    const raw = localStorage.getItem(CLOUD_CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.url) return null;
    return {
      url: parsed.url,
      key: deobfuscateStoredKey(parsed.key)
    };
  } catch {
    return null;
  }
}

function setCloudConfig(config) {
  if (config?.url && config?.key) {
    const rawKey = deobfuscateStoredKey(config.key.trim());
    const normalized = {
      url: config.url.trim().replace(/\/+$/, ""),
      key: obfuscateStoredKey(rawKey),
      updatedAt: Date.now()
    };
    localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(normalized));
  } else if (!config) {
    localStorage.removeItem(CLOUD_CONFIG_KEY);
  }
}

function getCloudSession() {
  try {
    return JSON.parse(localStorage.getItem(CLOUD_SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function setCloudSession(session) {
  if (session) localStorage.setItem(CLOUD_SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(CLOUD_SESSION_KEY);
}

const CURRENT_PROFILE_STORAGE_KEY = "workbench_current_profile";
const PRIMARY_ADMIN_STORAGE_KEY = "workbench_primary_admin_id";

function getCachedUserProfile(userId) {
  try {
    const raw = localStorage.getItem(CURRENT_PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const profile = JSON.parse(raw);
    if (profile?.id === userId) return profile;
  } catch {}
  return null;
}

function getPrimaryAdminId() {
  const fromStorage = localStorage.getItem(PRIMARY_ADMIN_STORAGE_KEY);
  if (fromStorage) return fromStorage;
  const session = getCloudSession();
  const cached = session?.user?.id ? getCachedUserProfile(session.user.id) : null;
  if (cached?.is_primary) return cached.id;
  return "";
}



function getActiveUser() {
  const session = getCloudSession();
  if (!session?.user) return null;
  const u = session.user;
  const cachedProfile = getCachedUserProfile(u.id);
  const meta = u.user_metadata || {};
  const primaryId = getPrimaryAdminId();
  const isPrimary = Boolean((primaryId && primaryId === u.id) || cachedProfile?.is_primary || meta.is_primary);
  let role = (cachedProfile?.role || meta.role || "maker").toLowerCase();
  if (isPrimary || role === "admin" || role === "owner") {
    role = "admin";
  }
  const isAdmin = role === "admin" || isPrimary;
  return {
    id: u.id,
    email: cachedProfile?.email || u.email || "",
    displayName: cachedProfile?.display_name || meta.display_name || (u.email ? u.email.split("@")[0] : "Maker"),
    role: isAdmin ? "admin" : "maker",
    isAdmin,
    isPrimary
  };
}

function isCurrentUserAdmin() {
  const user = getActiveUser();
  return Boolean(user && (user.isAdmin || user.role === "admin" || user.isPrimary));
}

async function syncUserProfile(userId) {
  if (!userId) return null;
  const cfg = getCloudConfig();
  if (!cfg?.url || !cfg?.key) return null;
  try {
    const rows = await cloudRequest(`/rest/v1/workbench_profiles?id=eq.${encodeURIComponent(userId)}&select=*`);
    if (Array.isArray(rows) && rows.length > 0) {
      const profile = rows[0];
      const isPrimaryUser = (userId === getPrimaryAdminId()) || Boolean(profile.is_primary);
      if (isPrimaryUser) {
        profile.role = "admin";
        profile.is_primary = true;
        localStorage.setItem(PRIMARY_ADMIN_STORAGE_KEY, userId);
      }
      localStorage.setItem(CURRENT_PROFILE_STORAGE_KEY, JSON.stringify(profile));
      const session = getCloudSession();
      if (session?.user && session.user.id === userId) {
        session.user.user_metadata = session.user.user_metadata || {};
        session.user.user_metadata.role = profile.role || (isPrimaryUser ? "admin" : "maker");
        if (profile.display_name) session.user.user_metadata.display_name = profile.display_name;
        if (isPrimaryUser) session.user.user_metadata.is_primary = true;
        setCloudSession(session);
      }
      if (isPrimaryUser && rows[0]?.role !== "admin") {
        cloudRequest(`/rest/v1/workbench_profiles?id=eq.${encodeURIComponent(userId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "admin", is_primary: true, updated_at: new Date().toISOString() })
        }).catch(() => {});
      }
      if (!getPrimaryAdminId()) {
        try {
          const ownerRows = await cloudRequest("/rest/v1/workbench_profiles?is_primary=eq.true&select=id");
          if (Array.isArray(ownerRows) && ownerRows.length > 0 && ownerRows[0]?.id) {
            localStorage.setItem(PRIMARY_ADMIN_STORAGE_KEY, ownerRows[0].id);
          }
        } catch {}
      }
      updateUserUI();
      return profile;
    }
  } catch (err) {
    console.warn("Could not sync user profile from cloud:", err);
  }
  return null;
}

function ensurePrimaryAdmin(user) {
  if (!user?.id) return;
  const isOwnerEmail = user.email && user.email.toLowerCase().includes("rakowshik");
  if (isOwnerEmail || user.isPrimary) {
    localStorage.setItem(PRIMARY_ADMIN_STORAGE_KEY, user.id);
    return;
  }
  const existing = getPrimaryAdminId();
  if (!existing && user.role === "admin") {
    localStorage.setItem(PRIMARY_ADMIN_STORAGE_KEY, user.id);
  }
}

async function claimPrimaryAdmin() {
  const user = getActiveUser();
  if (!user?.id) {
    showToast("Please sign in first.");
    return;
  }

  const existingPrimary = getPrimaryAdminId();
  if (existingPrimary && existingPrimary !== user.id) {
    showToast("The Shop Owner role is permanently assigned and immutable.");
    return;
  }

  try {
    showToast("Claiming Shop Owner / Primary Admin…");
    const oldPrimaryId = getPrimaryAdminId();

    // 1. If a different account held the primary admin role, demote it in workbench_profiles
    if (oldPrimaryId && oldPrimaryId !== user.id) {
      try {
        await cloudRequest(`/rest/v1/workbench_profiles?id=eq.${encodeURIComponent(oldPrimaryId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "maker", is_primary: false, updated_at: new Date().toISOString() })
        });
      } catch (e) {
        console.warn("Could not demote previous primary admin in cloud:", e);
      }
    }

    // 2. Promote current user to admin in Supabase workbench_profiles
    try {
      await cloudRequest("/rest/v1/workbench_profiles?on_conflict=id", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=representation"
        },
        body: JSON.stringify([{
          id: user.id,
          email: user.email,
          display_name: user.displayName,
          role: "admin",
          is_primary: true,
          updated_at: new Date().toISOString()
        }])
      });
    } catch {
      // Fallback without is_primary if column not present in SQL table yet
      try {
        await cloudRequest("/rest/v1/workbench_profiles?on_conflict=id", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates,return=representation"
          },
          body: JSON.stringify([{
            id: user.id,
            email: user.email,
            display_name: user.displayName,
            role: "admin",
            updated_at: new Date().toISOString()
          }])
        });
      } catch (pe) {
        console.warn("Could not upsert profile in workbench_profiles:", pe);
      }
    }

    // 3. Set Primary Admin ID in localStorage
    localStorage.setItem(PRIMARY_ADMIN_STORAGE_KEY, user.id);

    // 4. Update session metadata and cached profile
    const session = getCloudSession();
    if (session?.user) {
      session.user.user_metadata = session.user.user_metadata || {};
      session.user.user_metadata.role = "admin";
      session.user.user_metadata.is_primary = true;
      setCloudSession(session);
    }

    const updatedProfile = {
      id: user.id,
      email: user.email,
      display_name: user.displayName,
      role: "admin",
      is_primary: true,
      updated_at: new Date().toISOString()
    };
    localStorage.setItem(CURRENT_PROFILE_STORAGE_KEY, JSON.stringify(updatedProfile));

    updateUserUI();
    render();
    $("#user-menu-dialog")?.close();
    showToast("👑 You are now the Shop Owner & Primary Admin!");
  } catch (err) {
    console.error("Failed to claim primary admin role:", err);
    showToast(err.message || "Could not claim admin role.");
  }
}

function showAuthAlert(message, type = "error") {
  const alert = $("#auth-alert");
  if (!alert) return;
  alert.textContent = message;
  alert.className = `auth-alert ${type}`;
  alert.style.display = "block";
}

function switchAuthTab(tab) {
  $$(".auth-tab-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.authTab === tab));
  $$(".auth-form-panel").forEach(p => p.style.display = "none");
  const alert = $("#auth-alert");
  if (alert) alert.style.display = "none";

  if (tab === "signin") {
    $("#auth-signin-form").style.display = "block";
    $("#auth-dialog-title").textContent = "Sign in to your workbench";
  } else if (tab === "signup") {
    $("#auth-signup-form").style.display = "block";
    $("#auth-dialog-title").textContent = "Create your cloud workbench";
  } else if (tab === "config") {
    $("#auth-config-form").style.display = "block";
    $("#auth-dialog-title").textContent = "Supabase Cloud Connection";
    const cfg = getCloudConfig();
    if (cfg) {
      if ($("#auth-cloud-url")) $("#auth-cloud-url").value = cfg.url || "";
      if ($("#auth-cloud-key")) $("#auth-cloud-key").value = cfg.key ? "••••••••••••••••" : "";
    }
  }
}

function openAuthModal(tab = "signin") {
  const dialog = $("#auth-dialog");
  if (!dialog) return;
  switchAuthTab(tab);
  if (!dialog.open) {
    try {
      dialog.showModal();
    } catch {}
  }
}

let activeProfileTab = "account";

function switchProfileTab(tab) {
  activeProfileTab = tab;
  renderProfileModalContent();
}

function renderProfileModalContent() {
  const content = $("#user-menu-content");
  const tabsNav = $("#profile-tabs-nav");
  if (!content) return;

  const user = getActiveUser();

  if (!user) {
    if (tabsNav) tabsNav.style.display = "none";
    content.innerHTML = `
      <div style="text-align:center;padding:12px 0">
        <div class="profile-avatar" style="margin:0 auto 10px;width:48px;height:48px;font-size:24px">✿</div>
        <h3>Guest / Local Workbench</h3>
        <p style="font-size:12px;color:var(--muted);margin:8px 0 16px">Your projects and photos are currently saved only in this browser. Sign in or create an account to access your workbench from any phone, laptop, or tablet.</p>
        <button type="button" class="button button-primary button-block" data-action="open-auth-modal" data-tab="signin">Sign In / Create Account →</button>
      </div>
    `;
    return;
  }

  if (tabsNav) tabsNav.style.display = "flex";
  $$(".profile-tab-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === activeProfileTab));

  const initial = (user.displayName || user.email || "M")[0].toUpperCase();
  const isOwner = user.isPrimary;
  const isAdmin = isCurrentUserAdmin();
  const roleLabel = isOwner ? "👑 Shop Owner (Admin)" : (isAdmin ? "⭐ Shop Admin" : "🛠️ Maker Workbench");

  if (activeProfileTab === "account") {
    content.innerHTML = `
      <div class="user-menu-item">
        <div class="admin-user-avatar" style="${isAdmin ? "background:#d69e2e" : ""}">${isOwner ? "👑" : (isAdmin ? "⭐" : initial)}</div>
        <div class="admin-user-meta">
          <strong style="font-size:15px">${escapeHTML(user.displayName)}</strong>
          <span>${escapeHTML(user.email)}</span>
          <div style="margin-top:4px;display:flex;gap:6px;align-items:center">
            <span class="role-pill role-${user.role}">${roleLabel}</span>
            ${isOwner ? '<span style="font-size:11px;color:#d69e2e;font-weight:600">● Primary Admin</span>' : ''}
          </div>
        </div>
      </div>

      <div class="profile-section-card" style="margin-top:14px">
        <label class="field-label" style="font-size:12px;font-weight:700">Display Name / Maker Name
          <div style="display:flex;gap:8px;margin-top:4px">
            <input type="text" id="profile-display-name" value="${escapeHTML(user.displayName)}" style="flex:1" placeholder="e.g. Jordan Lee" required>
            <button type="button" class="button button-primary button-small" data-action="save-profile-name">Save Name</button>
          </div>
        </label>
        <span style="font-size:11px;color:var(--muted)">This name appears on your workbench space, journal notes, and workshop activity.</span>
      </div>

      <div class="profile-section-card">
        <div>
          <strong style="font-size:13px;display:block">Workshop Role: ${roleLabel}</strong>
          <span style="font-size:11px;color:var(--muted)">${isOwner ? "You have full owner access to inspect maker workbenches, create accounts, and manage permissions." : (isAdmin ? "You have administrator access to the workshop console." : "You have a personal maker workbench. Only admins can inspect other workbenches.")}</span>
        </div>
        ${isAdmin ? `
          <button type="button" class="button button-outline" data-action="go-to-admin" style="margin-top:6px">
            👑 Open Admin Hub
          </button>
        ` : ''}
      </div>

      <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px;border-top:1px solid var(--line);padding-top:12px">
        ${isAdmin ? '<button type="button" class="button button-outline" data-action="recover-owner-workspace">🔄 Restore My Projects &amp; Stats</button>' : ''}
        <button type="button" class="button button-outline" data-action="open-invite-modal">👥 Invite Makers to Shop</button>
        <button type="button" class="button button-outline" data-action="sync-now">⇄ Sync Workspace Now</button>
        <button type="button" class="button button-outline" data-action="open-auth-modal" data-tab="signin">Switch Account</button>
        <button type="button" class="danger-button" data-action="auth-sign-out">Sign Out</button>
      </div>
    `;
  } else if (activeProfileTab === "security") {
    content.innerHTML = `
      <div class="profile-section-card">
        <div style="margin-bottom:8px">
          <h3 style="font-size:15px;margin:0 0 4px">Change Email Address</h3>
          <p style="font-size:12px;color:var(--muted);margin:0">Current login email: <strong style="color:var(--ink)">${escapeHTML(user.email)}</strong></p>
        </div>
        <form id="profile-email-form" onsubmit="event.preventDefault(); void saveProfileEmail();">
          <label class="field-label">New Email Address
            <input type="email" id="profile-new-email" required placeholder="new-email@example.com" autocomplete="email">
          </label>
          <div id="profile-email-alert" class="auth-alert" style="display:none;margin-top:8px"></div>
          <div style="margin-top:12px;display:flex;justify-content:flex-end">
            <button type="submit" class="button button-primary">Update Email Address →</button>
          </div>
        </form>
      </div>

      <div class="profile-section-card">
        <div style="margin-bottom:8px">
          <h3 style="font-size:15px;margin:0 0 4px">Change Password</h3>
          <p style="font-size:12px;color:var(--muted);margin:0">Enter a new secure password (minimum 6 characters) for your cloud account.</p>
        </div>
        <form id="profile-password-form" onsubmit="event.preventDefault(); void saveProfilePassword();">
          <label class="field-label">New Password
            <input type="password" id="profile-new-password" required minlength="6" placeholder="••••••••" autocomplete="new-password">
          </label>
          <label class="field-label" style="margin-top:8px">Confirm New Password
            <input type="password" id="profile-new-password-confirm" required minlength="6" placeholder="••••••••" autocomplete="new-password">
          </label>
          <div id="profile-password-alert" class="auth-alert" style="display:none;margin-top:8px"></div>
          <div style="margin-top:12px;display:flex;justify-content:flex-end">
            <button type="submit" class="button button-primary">Update Password →</button>
          </div>
        </form>
      </div>

      <div class="profile-section-card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
          <div>
            <strong style="font-size:13px;display:block">Forgot your password?</strong>
            <span style="font-size:11px;color:var(--muted)">Send a password recovery email to ${escapeHTML(user.email)}.</span>
          </div>
          <button type="button" class="button button-small button-outline" data-action="profile-send-recovery" style="white-space:nowrap">Send Reset Link</button>
        </div>
      </div>
    `;
  } else if (activeProfileTab === "preferences") {
    const savedTheme = getSavedTheme();
    content.innerHTML = `
      <div class="profile-section-card">
        <h3 style="font-size:15px;margin:0 0 8px">Workshop Appearance</h3>
        <label class="field-label">Theme Mode
          <div style="display:flex;gap:14px;margin-top:6px;flex-wrap:wrap">
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
              <input type="radio" name="pref-theme" value="light" ${savedTheme === "light" ? "checked" : ""}> ☀️ Light
            </label>
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
              <input type="radio" name="pref-theme" value="dark" ${savedTheme === "dark" ? "checked" : ""}> 🌙 Dark
            </label>
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
              <input type="radio" name="pref-theme" value="auto" ${savedTheme === "auto" ? "checked" : ""}> ⚙️ Match System
            </label>
          </div>
        </label>
      </div>

      <div class="profile-section-card">
        <h3 style="font-size:15px;margin:0 0 8px">Project Layout &amp; Practice Goals</h3>
        <label class="field-label">Default Project View
          <div style="display:flex;gap:14px;margin-top:6px">
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
              <input type="radio" name="pref-project-mode" value="grid" ${projectViewMode === "grid" ? "checked" : ""}> ⊞ Grid Cards
            </label>
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
              <input type="radio" name="pref-project-mode" value="kanban" ${projectViewMode === "kanban" ? "checked" : ""}> ☷ Kanban Board
            </label>
          </div>
        </label>
        <label class="field-label" style="margin-top:12px">Weekly Making Goal (Minutes per week)
          <input type="number" id="pref-weekly-goal" min="10" max="6000" step="5" value="${state.weeklyGoal || 60}" style="max-width:180px;margin-top:4px">
          <span style="font-size:11px;color:var(--muted);margin-top:2px">Used on the Overview dashboard to track your weekly progress.</span>
        </label>
        <div style="margin-top:12px;display:flex;justify-content:flex-end">
          <button type="button" class="button button-primary button-small" data-action="save-profile-preferences">Save Preferences</button>
        </div>
      </div>
    `;

    // Live preview listeners for instant feedback
    content.querySelectorAll("input[name='pref-theme']").forEach(radio => {
      radio.addEventListener("change", (e) => {
        applyTheme(e.target.value);
        setSavedTheme(e.target.value);
      });
    });
    content.querySelectorAll("input[name='pref-project-mode']").forEach(radio => {
      radio.addEventListener("change", (e) => {
        setProjectViewMode(e.target.value);
      });
    });
  }
}

function openUserMenuModal(tab = "account") {
  const dialog = $("#user-menu-dialog");
  if (!dialog) return;
  activeProfileTab = tab;
  renderProfileModalContent();
  dialog.showModal();
}

async function saveProfilePassword() {
  const newPass = $("#profile-new-password")?.value || "";
  const confirmPass = $("#profile-new-password-confirm")?.value || "";
  const alertEl = $("#profile-password-alert");

  function showAlert(msg, type = "error") {
    if (!alertEl) return;
    alertEl.textContent = msg;
    alertEl.className = `auth-alert ${type}`;
    alertEl.style.display = "block";
  }

  if (newPass.length < 6) {
    showAlert("Password must be at least 6 characters long.");
    return;
  }
  if (newPass !== confirmPass) {
    showAlert("Passwords do not match. Please verify both fields.");
    return;
  }

  try {
    showAlert("Updating password…", "info");
    await cloudRequest("/auth/v1/user", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPass })
    });
    showAlert("✓ Password successfully updated!", "success");
    showToast("Password updated successfully! 🔒");
    if ($("#profile-new-password")) $("#profile-new-password").value = "";
    if ($("#profile-new-password-confirm")) $("#profile-new-password-confirm").value = "";
  } catch (err) {
    console.error("Password change failed:", err);
    showAlert(err.message || "Failed to update password. Please sign in again and retry.");
  }
}

async function saveProfileEmail() {
  const newEmail = $("#profile-new-email")?.value?.trim() || "";
  const alertEl = $("#profile-email-alert");

  function showAlert(msg, type = "error") {
    if (!alertEl) return;
    alertEl.textContent = msg;
    alertEl.className = `auth-alert ${type}`;
    alertEl.style.display = "block";
  }

  if (!newEmail || !newEmail.includes("@")) {
    showAlert("Please enter a valid email address.");
    return;
  }

  const user = getActiveUser();
  if (user && user.email.toLowerCase() === newEmail.toLowerCase()) {
    showAlert("The new email address must be different from your current email.");
    return;
  }

  try {
    showAlert("Updating email address…", "info");
    await cloudRequest("/auth/v1/user", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail })
    });

    if (user?.id) {
      try {
        await cloudRequest(`/rest/v1/workbench_profiles?id=eq.${encodeURIComponent(user.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: newEmail, updated_at: new Date().toISOString() })
        });
      } catch (e) {
        console.warn("Could not patch workbench_profiles email:", e);
      }
    }

    const session = getCloudSession();
    if (session?.user) {
      session.user.email = newEmail;
      setCloudSession(session);
    }
    const cached = user?.id ? getCachedUserProfile(user.id) : null;
    if (cached) {
      localStorage.setItem(CURRENT_PROFILE_STORAGE_KEY, JSON.stringify({ ...cached, email: newEmail }));
    }

    updateUserUI();
    showAlert("✓ Email update requested! If email confirmation is enabled on your Supabase project, check your new inbox to confirm the change.", "success");
    showToast("Email update requested! 📧");
    if ($("#profile-new-email")) $("#profile-new-email").value = "";
  } catch (err) {
    console.error("Email change failed:", err);
    showAlert(err.message || "Failed to update email. Please check your connection and retry.");
  }
}

async function recoverOwnerWorkspace({ silent = false } = {}) {
  const session = getCloudSession();
  if (!session?.user?.id) return false;
  const user = getActiveUser();
  const primaryId = getPrimaryAdminId();
  const isOwner = Boolean(user?.isPrimary || (user && user.id === primaryId) || isCurrentUserAdmin() || (user?.email && user.email.toLowerCase().includes("rakowshik")));
  if (!isOwner) return false;

  try {
    if (!silent) showToast("Checking local backup for owner projects…");

    // Only restore if current user actually has 0 projects
    if (Array.isArray(state?.projects) && state.projects.length > 0) {
      if (!silent) showToast("✓ Workbench is active and up to date.");
      return true;
    }

    // Check owner's own cloud row in Supabase
    try {
      const ownRemote = await getRemoteWorkspace();
      if (ownRemote?.data && Array.isArray(ownRemote.data.projects) && ownRemote.data.projects.length > 0) {
        await loadRemoteWorkspace(ownRemote);
        render();
        if (!silent) showToast("✓ Restored projects from your cloud backup! 🎯");
        return true;
      }
    } catch {}

    // Check legacy IndexedDB STATE_KEY as well
    const legacyState = await new Promise(resolve => {
      try {
        const req = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(STATE_KEY);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch { resolve(null); }
    });
    if (legacyState && Array.isArray(legacyState.projects) && legacyState.projects.length > 0) {
      state.projects = legacyState.projects;
      state.practiceLog = Array.isArray(legacyState.practiceLog) ? legacyState.practiceLog : [];
      if (Array.isArray(legacyState.skills) && legacyState.skills.length > 0) state.skills = legacyState.skills;
      if (Array.isArray(legacyState.activity) && legacyState.activity.length > 0) state.activity = legacyState.activity;
      state.updatedAt = new Date().toISOString();
      state.hasUserChanges = true;
      await persistState();
      render();
      if (!silent) showToast("✓ Restored projects & skills from legacy local database! 🎯");
      return true;
    }

    if (!silent) showToast("No previous backups found to restore.");
    return false;
  } catch (err) {
    console.error("recoverOwnerWorkspace failed:", err);
    if (!silent) showToast("Could not complete project recovery: " + err.message);
    return false;
  }
}

async function saveProfileName() {
  const nameInput = $("#profile-display-name");
  const newName = nameInput?.value?.trim();
  if (!newName) {
    showToast("Please enter a valid display name.");
    return;
  }
  const user = getActiveUser();
  if (!user?.id) return;

  try {
    showToast("Saving name…");
    try {
      await cloudRequest("/auth/v1/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { display_name: newName } })
      });
    } catch (e) {
      console.warn("Could not update auth metadata:", e);
    }

    try {
      await cloudRequest(`/rest/v1/workbench_profiles?id=eq.${encodeURIComponent(user.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: newName, updated_at: new Date().toISOString() })
      });
    } catch (e) {
      console.warn("Could not update workbench_profiles table:", e);
    }

    const session = getCloudSession();
    if (session?.user) {
      session.user.user_metadata = session.user.user_metadata || {};
      session.user.user_metadata.display_name = newName;
      setCloudSession(session);
    }
    const cached = getCachedUserProfile(user.id) || {};
    localStorage.setItem(CURRENT_PROFILE_STORAGE_KEY, JSON.stringify({ ...cached, display_name: newName }));

    updateUserUI();
    render();
    renderProfileModalContent();
    showToast(`Display name updated to ${newName}!`);
  } catch (err) {
    console.error("Failed to update name:", err);
    showToast(err.message || "Could not update name.");
  }
}

async function saveProfilePreferences() {
  const goalInput = $("#pref-weekly-goal");
  const modeInput = $("input[name='pref-project-mode']:checked");
  const themeInput = $("input[name='pref-theme']:checked");

  if (goalInput) {
    const val = parseInt(goalInput.value, 10);
    if (val && val > 0) {
      state.weeklyGoal = val;
      await persistState();
    }
  }

  if (modeInput?.value) {
    setProjectViewMode(modeInput.value);
  }

  if (themeInput?.value) {
    setSavedTheme(themeInput.value);
    applyTheme(themeInput.value);
  }

  render();
  renderProfileModalContent();
  showToast("Preferences saved!");
}

async function profileSendRecovery() {
  const user = getActiveUser();
  if (!user?.email) return;
  try {
    showToast(`Sending recovery email to ${user.email}…`);
    await sendPasswordRecovery(user.email);
    showToast("Password reset email sent! Check your inbox 📬");
  } catch (err) {
    showToast(err.message || "Failed to send recovery email.");
  }
}

function recordKnownMaker(user) {
  if (!user?.id) return;
  try {
    const raw = localStorage.getItem("workbench_known_makers");
    const list = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(m => m.id === user.id);
    const email = user.email || "";
    const displayName = user.displayName || user.display_name || (email ? email.split("@")[0] : "Maker");
    const isPrimary = Boolean(user.isPrimary || user.is_primary || (user.id === getPrimaryAdminId()));
    const role = isPrimary ? "admin" : (user.role || "maker");
    const item = {
      id: user.id,
      email,
      displayName,
      role,
      isPrimary,
      updatedAt: new Date().toISOString()
    };
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...item };
    } else {
      list.push(item);
    }
    localStorage.setItem("workbench_known_makers", JSON.stringify(list));
  } catch {}
}

async function getLocallyKnownUsers() {
  const users = new Map();
  // 1. From localStorage known makers
  try {
    const list = JSON.parse(localStorage.getItem("workbench_known_makers") || "[]");
    if (Array.isArray(list)) {
      for (const u of list) {
        if (u?.id) users.set(u.id, u);
      }
    }
  } catch {}

  // 2. From IndexedDB keys
  if (database) {
    try {
      const primaryId = getPrimaryAdminId();
      const keys = await new Promise((resolve) => {
        const req = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAllKeys();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
      for (const k of keys) {
        if (typeof k === "string" && k.startsWith("workbench_state_")) {
          const uid = k.replace("workbench_state_", "");
          if (uid) {
            try {
              const uState = await new Promise(res => {
                const req = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(k);
                req.onsuccess = () => res(req.result);
                req.onerror = () => res(null);
              });
              const owner = uState?.owner;
              const existing = users.get(uid) || {};
              const isPrimary = existing.isPrimary || Boolean(owner?.isPrimary || owner?.is_primary) || (uid === primaryId);
              let projects = Array.isArray(uState?.projects) ? uState.projects : (existing.projects || []);
              let practiceLog = Array.isArray(uState?.practiceLog) ? uState.practiceLog : (existing.practiceLog || []);

              users.set(uid, {
                id: uid,
                email: existing.email || owner?.email || "",
                displayName: existing.displayName || owner?.displayName || owner?.display_name || (existing.email ? existing.email.split("@")[0] : "Maker"),
                role: existing.role || owner?.role || "maker",
                isPrimary,
                updatedAt: uState?.updatedAt || existing.updatedAt || null,
                projects,
                skills: Array.isArray(uState?.skills) ? uState.skills : (existing.skills || [])
              });
            } catch {}
          }
        }
      }
    } catch {}
  }

  // 3. From localStorage sync keys
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("workbench-cloud-last-sync:")) {
        const uid = key.replace("workbench-cloud-last-sync:", "");
        if (uid && !users.has(uid)) {
          users.set(uid, {
            id: uid,
            email: "",
            displayName: "Maker",
            role: "maker"
          });
        }
      }
    }
  } catch {}

  return users;
}

async function upsertUserProfile(user, desiredRole = null) {
  try {
    let existingRow = null;
    try {
      const rows = await cloudRequest(`/rest/v1/workbench_profiles?id=eq.${encodeURIComponent(user.id)}&select=role,is_primary,display_name,email`);
      if (Array.isArray(rows) && rows.length > 0) {
        existingRow = rows[0];
      }
    } catch {}

    const meta = user.user_metadata || {};
    const finalRole = desiredRole || existingRow?.role || meta.role || "maker";
    const isPrimary = Boolean(existingRow?.is_primary) || Boolean(meta.is_primary) || (user.id === getPrimaryAdminId());
    const displayName = meta.display_name || existingRow?.display_name || (user.email ? user.email.split("@")[0] : "Maker");
    const email = user.email || existingRow?.email || "";

    recordKnownMaker({ id: user.id, email, displayName, role: finalRole, isPrimary });

    const profileData = {
      id: user.id,
      email,
      display_name: displayName,
      role: finalRole,
      is_primary: isPrimary,
      updated_at: new Date().toISOString()
    };

    if (existingRow) {
      try {
        await cloudRequest(`/rest/v1/workbench_profiles?id=eq.${encodeURIComponent(user.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profileData)
        });
      } catch {
        const { is_primary, ...rest } = profileData;
        await cloudRequest(`/rest/v1/workbench_profiles?id=eq.${encodeURIComponent(user.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rest)
        }).catch(() => {});
      }
    } else {
      try {
        await cloudRequest("/rest/v1/workbench_profiles", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Prefer: "return=representation"
          },
          body: JSON.stringify([profileData])
        });
      } catch {
        const { is_primary, ...rest } = profileData;
        await cloudRequest("/rest/v1/workbench_profiles", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Prefer: "return=representation"
          },
          body: JSON.stringify([rest])
        }).catch(() => {});
      }
    }

    const cached = {
      id: user.id,
      email,
      display_name: displayName,
      role: finalRole,
      is_primary: isPrimary,
      updated_at: new Date().toISOString()
    };
    localStorage.setItem(CURRENT_PROFILE_STORAGE_KEY, JSON.stringify(cached));
    if (isPrimary) {
      localStorage.setItem(PRIMARY_ADMIN_STORAGE_KEY, user.id);
    }
  } catch (e) {
    // Silently continue if profiles table is not created yet
  }
}

async function signInWithEmail(email, password) {
  const cfg = getCloudConfig();
  if (!cfg?.url || !cfg?.key) {
    switchAuthTab("config");
    showAuthAlert("Please save your Supabase project URL and anon key first.", "error");
    return;
  }

  const session = await cloudRequest("/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim(), password })
  }, false);

  if (!session?.access_token || !session?.user) {
    throw new Error("Invalid response from auth server.");
  }

  setCloudSession({
    ...session,
    expires_at: session.expires_at || Math.floor(Date.now() / 1000) + (session.expires_in || 3600)
  });

  recordKnownMaker({
    id: session.user.id,
    email: session.user.email,
    displayName: session.user.user_metadata?.display_name || (session.user.email ? session.user.email.split("@")[0] : "Maker"),
    role: session.user.user_metadata?.role || "maker"
  });

  $("#auth-dialog")?.close();
  updateUserUI();
  renderCloudConnection();
  showToast(`Signed in as ${getActiveUser()?.displayName || "Maker"}!`);

  try {
    await syncUserProfile(session.user.id);
    await upsertUserProfile(session.user);
    await loadUserScopedState();
    await syncCloudWorkspace("pull");
  } catch (e) {
    console.warn("Initial sync pull notice", e);
  }

  updateUserUI();
  render();
  renderCloudConnection();

  const curUser = getActiveUser();
  const primaryId = getPrimaryAdminId();
  const isOwner = Boolean(curUser?.isPrimary || (curUser && curUser.id === primaryId) || isCurrentUserAdmin() || (curUser?.email && curUser.email.toLowerCase().includes("rakowshik")));
  if (isOwner && (!Array.isArray(state.projects) || state.projects.length === 0)) {
    void recoverOwnerWorkspace({ silent: true });
  }
}

async function signUpWithEmail(email, password, displayName, role = "maker") {
  const cfg = getCloudConfig();
  if (!cfg?.url || !cfg?.key) {
    switchAuthTab("config");
    showAuthAlert("Please save your Supabase project URL and anon key first.", "error");
    return;
  }

  try {
    const res = await cloudRequest("/auth/v1/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        password,
        data: {
          display_name: displayName.trim(),
          role
        }
      })
    }, false);

    if (res?.access_token && res?.user) {
      resetWorkspaceStateToDefault();
      setCloudSession({
        ...res,
        expires_at: res.expires_at || Math.floor(Date.now() / 1000) + (res.expires_in || 3600)
      });
      recordKnownMaker({
        id: res.user.id,
        email: res.user.email,
        displayName,
        role
      });
      ensurePrimaryAdmin(res.user);

      $("#auth-dialog")?.close();
      updateUserUI();
      renderCloudConnection();
      showToast(`Welcome to Workbench, ${displayName}!`);

      try {
        await upsertUserProfile(res.user);
        await persistState();
        await storeRemoteWorkspace();
      } catch (e) {
        console.warn("Could not push initial workspace on signup:", e);
      }
      updateUserUI();
      render();
      renderCloudConnection();
    } else if (res?.id || res?.user?.id) {
      showAuthAlert("Account created! Check your email inbox to verify your account, then sign in. (Tip: Turn off 'Confirm email' in Supabase to skip email verification).", "success");
    } else {
      throw new Error("Unable to register account. Please check your credentials.");
    }
  } catch (err) {
    const msg = err.message || "";
    if (msg.includes("429") || msg.toLowerCase().includes("rate limit") || msg.toLowerCase().includes("email rate limit")) {
      showAuthAlert("⚠️ Supabase email rate limit exceeded (free tier sends max 3-4 confirmation emails/hour). To fix this permanently: In your Supabase Dashboard, go to Authentication → Providers → Email, and turn OFF 'Confirm email'. This allows instant unlimited registrations without sending emails.", "error");
    } else if (msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("user already registered")) {
      showAuthAlert("An account with this email is already registered. Switch to the Sign In tab above.", "error");
    } else {
      showAuthAlert(msg || "Unable to register account.", "error");
    }
    throw err;
  }
}

async function signOutUser() {
  try {
    await cloudRequest("/auth/v1/logout", { method: "POST" });
  } catch {}
  clearTimeout(syncTimer);
  setCloudSession(null);
  localStorage.removeItem(CURRENT_PROFILE_STORAGE_KEY);
  cloudConflict = null;
  if (adminInspectionActive) {
    exitInspectionMode();
  }
  resetWorkspaceStateToDefault();
  await loadUserScopedState();
  updateUserUI();
  render();
  renderCloudConnection();
  $("#user-menu-dialog")?.close();
  showToast("Signed out. Switched to local workbench.");
}

async function sendPasswordRecovery(email) {
  const cfg = getCloudConfig();
  if (!cfg?.url || !cfg?.key) {
    switchAuthTab("config");
    showAuthAlert("Please configure your Supabase connection first.", "error");
    return;
  }
  await cloudRequest("/auth/v1/recover", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim() })
  }, false);
  showAuthAlert("Password recovery email sent! Check your inbox.", "success");
}

async function loadUserScopedState() {
  const saved = await readSavedState();
  if (saved) {
    state.projects = Array.isArray(saved.projects) ? saved.projects : [];
    state.skills = Array.isArray(saved.skills) ? saved.skills : [];
    state.activity = Array.isArray(saved.activity) ? saved.activity : [];
    state.practiceLog = Array.isArray(saved.practiceLog) ? saved.practiceLog : [];
    state.inventory = Array.isArray(saved.inventory) ? saved.inventory : [];
    state.customTemplates = Array.isArray(saved.customTemplates) ? saved.customTemplates : [];
    state.makerGoals = Array.isArray(saved.makerGoals) ? saved.makerGoals : [];
    state.maintenance = Array.isArray(saved.maintenance) ? saved.maintenance : [];
    state.currency = saved.currency || "USD";
    state.unitSystem = saved.unitSystem || "in";
    state.weeklyGoal = Number.isFinite(saved.weeklyGoal) ? saved.weeklyGoal : 60;

    for (const p of state.projects) {
      ensureProjectCreator(p);
    }

    loadSharedCollaborationsIntoState();
    syncSharedCollaborations();
    updateTopbarUnitsPill();
  } else {
    resetWorkspaceStateToDefault();
    loadSharedCollaborationsIntoState();
    updateTopbarUnitsPill();
    await persistState({ syncCloud: false });
  }
}

function updateUserUI() {
  const user = getActiveUser();
  const topAuthBtn = $("#top-auth-btn");
  const userNameEl = $("#user-name");
  const userRoleEl = $("#user-role-label");
  const userAvatarEl = $("#user-avatar");
  const spaceLabel = $("#topbar-space-label");
  const adminNav = $("#nav-admin-link");

  if (user) {
    document.body.classList.remove("auth-locked");
    $("#auth-dialog")?.close();
    ensurePrimaryAdmin(user);
    const initial = (user.displayName || user.email || "M")[0].toUpperCase();
    const isOwner = user.isPrimary;
    const isAdmin = isCurrentUserAdmin();
    const roleText = isOwner ? "👑 Shop Owner (Admin)" : (isAdmin ? "⭐ Shop Admin" : "🛠️ Maker Workbench");
    const avatarIcon = isOwner ? "👑" : (isAdmin ? "⭐" : initial);
    if (topAuthBtn) {
      topAuthBtn.innerHTML = `${avatarIcon} ${escapeHTML(user.displayName)}`;
      topAuthBtn.title = `Signed in as ${user.email} (${user.role})`;
      topAuthBtn.dataset.action = "open-user-menu";
    }
    if (userNameEl) userNameEl.textContent = user.displayName;
    if (userRoleEl) userRoleEl.textContent = roleText;
    if (userAvatarEl) {
      userAvatarEl.textContent = avatarIcon;
      userAvatarEl.style.background = isOwner ? "#d69e2e" : (isAdmin ? "#b7791f" : "");
    }
    if (spaceLabel) spaceLabel.textContent = `${user.displayName}'s shop`;
    if (adminNav) adminNav.style.display = isAdmin ? "flex" : "none";
  } else {
    document.body.classList.add("auth-locked");
    openAuthModal("signin");
    if (topAuthBtn) {
      topAuthBtn.innerHTML = "Sign in";
      topAuthBtn.title = "Sign in or create cloud workbench";
      topAuthBtn.dataset.action = "open-auth-modal";
    }
    if (userNameEl) userNameEl.textContent = "Sign In Required";
    if (userRoleEl) userRoleEl.textContent = "Workshop locked";
    if (userAvatarEl) {
      userAvatarEl.textContent = "🔒";
      userAvatarEl.style.background = "";
    }
    if (spaceLabel) spaceLabel.textContent = "Locked workshop";
    if (adminNav) adminNav.style.display = "none";
  }
}

function cloudMessage(text, status = "info") {
  $("#sync-message").textContent = text;
  $("#sync-message").dataset.status = status;
  const badge = $("#sync-badge");
  badge.className = `sync-badge ${status}`;
  badge.querySelector("span").textContent = "";
  const labels = { info: "Not connected", connected: "Connected", syncing: "Syncing…", error: "Needs attention", conflict: "Choose a copy" };
  badge.lastChild.textContent = ` ${labels[status] || labels.info}`;
  $("#cloud-conflict").classList.toggle("hidden", status !== "conflict");
}

function cloudEndpoint(path) {
  const config = getCloudConfig();
  if (!config?.url || !config?.key) throw new Error("Add your Supabase project URL and publishable key first.");
  return `${config.url.replace(/\/+$/, "")}${path}`;
}

async function cloudRequest(path, options = {}, authenticated = true) {
  const config = getCloudConfig();
  if (!config?.key) throw new Error("Add your Supabase publishable key first.");
  const headers = new Headers(options.headers || {});
  headers.set("apikey", config.key);
  if (authenticated) {
    const session = await ensureCloudSession();
    headers.set("Authorization", `Bearer ${session.access_token}`);
  } else {
    headers.set("Authorization", `Bearer ${config.key}`);
  }
  const response = await fetch(cloudEndpoint(path), { ...options, headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const reason = payload?.msg || payload?.message || payload?.error_description || payload?.error || response.statusText;
    throw new Error(`Cloud request failed (${response.status}): ${reason}`);
  }
  return response.status === 204 ? null : response.json();
}

let activeRefreshPromise = null;

async function ensureCloudSession() {
  const session = getCloudSession();
  if (!session?.access_token) throw new Error("Sign in to your Supabase account first.");
  if (session.expires_at && session.expires_at * 1000 > Date.now() + 60_000) return session;
  if (!session.refresh_token) throw new Error("Your cloud session expired. Sign in again.");

  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = (async () => {
    try {
      const refreshed = await cloudRequest("/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: session.refresh_token })
      }, false);
      const nextSession = {
        ...refreshed,
        expires_at: refreshed.expires_at || Math.floor(Date.now() / 1000) + (refreshed.expires_in || 3600)
      };
      setCloudSession(nextSession);
      return nextSession;
    } catch (err) {
      const msg = err.message || "";
      if (
        msg.includes("400") ||
        msg.toLowerCase().includes("invalid refresh token") ||
        msg.toLowerCase().includes("refresh token not found") ||
        msg.toLowerCase().includes("token expired")
      ) {
        console.warn("Stale refresh token detected. Clearing stale session to avoid error loops.", err);
        setCloudSession(null);
        updateUserUI();
        renderCloudConnection();
      }
      throw err;
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
}

function encodeBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function beginGitHubSignIn() {
  const config = getCloudConfig();
  if (!config?.url || !config?.key) throw new Error("Save your Supabase project URL and publishable/anon key first.");
  if (window.location.protocol === "file:") {
    throw new Error("GitHub sign-in needs a localhost or hosted URL. Follow the README instructions to run Workbench on localhost first.");
  }
  const verifier = encodeBase64Url(crypto.getRandomValues(new Uint8Array(48)));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  const challenge = encodeBase64Url(new Uint8Array(digest));
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  localStorage.setItem(CLOUD_PKCE_KEY, JSON.stringify({ verifier, redirectTo, startedAt: Date.now() }));
  const authorizeUrl = new URL(cloudEndpoint("/auth/v1/authorize"));
  authorizeUrl.searchParams.set("provider", "github");
  authorizeUrl.searchParams.set("redirect_to", redirectTo);
  authorizeUrl.searchParams.set("code_challenge", challenge);
  authorizeUrl.searchParams.set("code_challenge_method", "s256");
  window.location.assign(authorizeUrl.toString());
}

async function completeGitHubSignIn() {
  const currentUrl = new URL(window.location.href);
  const code = currentUrl.searchParams.get("code");
  const authError = currentUrl.searchParams.get("error_description") || currentUrl.searchParams.get("error");
  const hash = window.location.hash || "";
  const hasHashToken = hash.includes("access_token=");
  if (!code && !authError && !hasHashToken) return;

  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  history.replaceState(null, "", redirectTo);

  if (authError) {
    localStorage.removeItem(CLOUD_PKCE_KEY);
    cloudMessage(`GitHub sign-in was not completed: ${authError}`, "error");
    return;
  }

  let session = null;
  if (code) {
    const pending = JSON.parse(localStorage.getItem(CLOUD_PKCE_KEY) || "null");
    if (!pending?.verifier || Date.now() - pending.startedAt > 15 * 60 * 1000) {
      localStorage.removeItem(CLOUD_PKCE_KEY);
      throw new Error("The GitHub sign-in session is missing or expired. Please try again.");
    }
    localStorage.removeItem(CLOUD_PKCE_KEY);
    session = await cloudRequest("/auth/v1/token?grant_type=pkce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auth_code: code, code_verifier: pending.verifier })
    }, false);
  } else if (hasHashToken) {
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token") || "";
    const expires_in = parseInt(params.get("expires_in") || "3600", 10);
    if (access_token) {
      const config = getCloudConfig();
      const userRes = await fetch(cloudEndpoint("/auth/v1/user"), {
        headers: { apikey: config.key, Authorization: `Bearer ${access_token}` }
      });
      if (!userRes.ok) throw new Error("Could not fetch user profile from Supabase with hash token.");
      const user = await userRes.json();
      session = {
        access_token,
        refresh_token,
        expires_in,
        expires_at: Math.floor(Date.now() / 1000) + expires_in,
        user
      };
    }
  }

  if (!session?.access_token || !session.user) throw new Error("GitHub sign-in did not return a valid Supabase session.");
  setCloudSession({ ...session, expires_at: session.expires_at || Math.floor(Date.now() / 1000) + (session.expires_in || 3600) });

  const gitHubUser = session.user;
  const meta = gitHubUser.user_metadata || {};
  const displayName = meta.full_name || meta.display_name || meta.user_name || (gitHubUser.email ? gitHubUser.email.split("@")[0] : "Maker");
  recordKnownMaker({
    id: gitHubUser.id,
    email: gitHubUser.email,
    displayName,
    role: meta.role || "maker"
  });
  ensurePrimaryAdmin(gitHubUser);

  document.body.classList.remove("auth-locked");
  $("#auth-dialog")?.close();
  showToast(`Signed in with GitHub as ${displayName}!`);

  try {
    await upsertUserProfile(gitHubUser);
    await loadUserScopedState();
    await syncCloudWorkspace();
  } catch (syncErr) {
    console.warn("GitHub sign-in background sync notice:", syncErr);
  }
  updateUserUI();
  render();
  renderCloudConnection();
}

function syncMarkerKey(userId) {
  return `${CLOUD_SYNC_KEY}:${userId}`;
}

function readSyncMarker(userId) {
  try {
    const stored = localStorage.getItem(syncMarkerKey(userId));
    if (!stored) return null;
    const marker = JSON.parse(stored);
    if (marker?.localUpdatedAt && marker?.remoteUpdatedAt) return marker;
    return { localUpdatedAt: stored, remoteUpdatedAt: stored };
  } catch {
    return null;
  }
}

function writeSyncMarker(userId, remoteUpdatedAt) {
  localStorage.setItem(syncMarkerKey(userId), JSON.stringify({
    localUpdatedAt: state.updatedAt,
    remoteUpdatedAt
  }));
}

function hasWorkspaceContent() {
  return state.hasUserChanges || state.projects.length > 0 || state.skills.length > 0 || (state.practiceLog || []).length > 0;
}

function cloudWorkspacePayload() {
  const user = getActiveUser();
  return {
    ...state,
    owner: user ? { id: user.id, email: user.email, displayName: user.displayName, role: user.role } : null,
    projects: state.projects.map(project => ({
      ...project,
      folders: (project.folders || []).map(folder => ({
        ...folder,
        images: (folder.images || []).map(({ blob, ...image }) => image)
      }))
    }))
  };
}

async function getRemoteWorkspace(overrideUserId = null) {
  const session = await ensureCloudSession();
  const targetId = overrideUserId || session.user.id;
  const query = `?user_id=eq.${encodeURIComponent(targetId)}&select=data,updated_at`;
  const rows = await cloudRequest(`/rest/v1/${CLOUD_TABLE}${query}`);
  return rows[0] || null;
}

async function storeRemoteWorkspace() {
  if (adminInspectionActive) return; // Never overwrite another user's workbench during inspection!
  const session = await ensureCloudSession();
  const previous = await getRemoteWorkspace();
  for (const project of state.projects) {
    for (const folder of project.folders || []) {
      for (const image of folder.images || []) {
        if (!image.blob) continue;
        const path = `${session.user.id}/${image.id}`;
        if (image.cloudPath === path) continue;
        await cloudRequest(`/storage/v1/object/${PHOTO_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`, {
          method: "POST",
          headers: { "Content-Type": image.type || image.blob.type || "application/octet-stream", "x-upsert": "true" },
          body: image.blob
        });
        image.cloudPath = path;
      }
    }
  }
  await persistState({ syncCloud: false, preserveTimestamp: true });
  const payload = cloudWorkspacePayload();
  const rows = await cloudRequest(`/rest/v1/${CLOUD_TABLE}?on_conflict=user_id`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify([{ user_id: session.user.id, data: payload }])
  });
  const updatedAt = rows?.[0]?.updated_at || new Date().toISOString();
  const currentPaths = new Set(state.projects.flatMap(project => (project.folders || []).flatMap(folder => (folder.images || []).map(image => image.cloudPath).filter(Boolean))));
  const obsoletePaths = (previous?.data?.projects || []).flatMap(project => (project.folders || []).flatMap(folder => (folder.images || []).map(image => image.cloudPath).filter(path => path && path.startsWith(`${session.user.id}/`) && !currentPaths.has(path))));
  if (obsoletePaths.length) {
    await cloudRequest(`/storage/v1/object/${PHOTO_BUCKET}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefixes: obsoletePaths })
    });
  }
  state.updatedAt = updatedAt;
  await persistState({ syncCloud: false, preserveTimestamp: true });
  writeSyncMarker(session.user.id, updatedAt);
  cloudConflict = null;
  cloudMessage("Workspace synced to your cloud account.", "connected");
  renderCloudConnection();
}

async function loadRemoteWorkspace(remote) {
  const remoteState = structuredClone(remote.data);
  remoteState.projects = Array.isArray(remoteState.projects) ? remoteState.projects : [];
  remoteState.skills = Array.isArray(remoteState.skills) ? remoteState.skills : [];
  remoteState.activity = Array.isArray(remoteState.activity) ? remoteState.activity : [];
  remoteState.practiceLog = Array.isArray(remoteState.practiceLog)
    ? remoteState.practiceLog.filter(item => item?.kind === "xp" && typeof item.text === "string")
    : migratePracticeLog(remoteState.activity, remoteState.skills);


  for (const project of remoteState.projects) {
    project.createdAt = project.createdAt || remote.updated_at;
    project.updatedAt = project.updatedAt || remote.updated_at;
    project.priority = safePriority(project.priority);
    project.tags = Array.isArray(project.tags) ? project.tags.filter(tag => typeof tag === "string") : [];
    project.skillIds = Array.isArray(project.skillIds) ? project.skillIds : [];
    project.tasks = Array.isArray(project.tasks) ? project.tasks : [];
    project.notes = Array.isArray(project.notes) ? project.notes : [];
    project.folders = Array.isArray(project.folders) ? project.folders : [];
    for (const folder of project.folders) {
      folder.images = Array.isArray(folder.images) ? folder.images : [];
      for (const image of folder.images) {
        if (!image.cloudPath) continue;
        const blob = await cloudDownloadPhoto(image.cloudPath);
        image.blob = blob;
      }
    }
  }
  Object.assign(state, remoteState, { updatedAt: remote.updated_at });
  state.starterSkillsAdded = true;
  state.hasUserChanges = remoteState.hasUserChanges === true;
  if (!adminInspectionActive) {
    await persistState({ syncCloud: false, preserveTimestamp: true });
    const session = await ensureCloudSession();
    writeSyncMarker(session.user.id, remote.updated_at);
  }
  cloudConflict = null;
  render();
  renderCloudConnection();
}

async function cloudDownloadPhoto(path) {
  const config = getCloudConfig();
  const session = await ensureCloudSession();
  const response = await fetch(cloudEndpoint(`/storage/v1/object/${PHOTO_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`), {
    headers: { apikey: config.key, Authorization: `Bearer ${session.access_token}` }
  });
  if (!response.ok) throw new Error(`Could not download a project photo (${response.status}).`);
  return response.blob();
}

async function syncCloudWorkspace(choice = "automatic") {
  if (adminInspectionActive) return;
  if (cloudWorking) {
    cloudSyncPending = true;
    return;
  }
  cloudWorking = true;
  cloudMessage("Checking your cloud copy…", "syncing");
  try {
    const session = await ensureCloudSession();
    const remote = await getRemoteWorkspace();
    const hasLocal = hasWorkspaceContent();
    if (choice === "pull") {
      if (remote) {
        await loadRemoteWorkspace(remote);
        cloudMessage("Cloud copy loaded on this browser.", "connected");
      } else {
        await storeRemoteWorkspace();
        cloudMessage("Cloud workspace initialized for this account.", "connected");
      }
      await syncCloudCollaborations().catch(() => {});
      return;
    }
    if (choice === "push") {
      await storeRemoteWorkspace();
      await syncCloudCollaborations().catch(() => {});
      return;
    }
    if (!remote) {
      await storeRemoteWorkspace();
      cloudMessage("Cloud sync is ready. This browser’s workspace is now backed up.", "connected");
      await syncCloudCollaborations().catch(() => {});
      return;
    }
    const marker = readSyncMarker(session.user.id);
    if (!hasLocal) {
      await loadRemoteWorkspace(remote);
      cloudMessage("Cloud workspace loaded on this browser.", "connected");
      await syncCloudCollaborations().catch(() => {});
      return;
    }
    if (!marker) {
      cloudConflict = remote;
      cloudMessage("There is already a cloud workspace. Choose which copy to keep.", "conflict");
      return;
    }
    const localChanged = state.updatedAt !== marker.localUpdatedAt;
    const remoteChanged = remote.updated_at !== marker.remoteUpdatedAt;
    if (localChanged && remoteChanged) {
      cloudConflict = remote;
      cloudMessage("Both this browser and the cloud have changed since the last sync. Choose which copy to keep.", "conflict");
    } else if (remoteChanged) {
      await loadRemoteWorkspace(remote);
      cloudMessage("Latest cloud changes loaded.", "connected");
    } else if (localChanged) {
      await storeRemoteWorkspace();
      cloudMessage("This browser’s latest changes are backed up.", "connected");
    } else {
      writeSyncMarker(session.user.id, remote.updated_at);
      cloudMessage("Everything is up to date.", "connected");
    }
    await syncCloudCollaborations().catch(() => {});
    await reconcileProjectOwnership().catch(() => {});
  } catch (error) {
    console.error("Cloud sync failed.", error);
    cloudMessage(error.message || "Cloud sync failed. Check your connection and setup.", "error");
  } finally {
    cloudWorking = false;
    renderCloudConnection();
    if (cloudSyncPending) {
      cloudSyncPending = false;
      scheduleCloudSync();
    }
  }
}

function scheduleCloudSync() {
  if (!getCloudSession() || cloudConflict) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => void syncCloudWorkspace(), 1200);
}

function renderCloudConnection() {
  const config = getCloudConfig();
  const session = getCloudSession();
  const indicator = $(".local-indicator");
  indicator.lastChild.textContent = session?.access_token ? " Cloud sync enabled" : " Saved on this device";
  indicator.title = session?.access_token ? "Cloud sync is enabled for this account." : "Data is saved in this browser.";
  $("#cloud-url").value = config?.url || "";
  $("#cloud-key").value = config?.key ? "••••••••••••••••" : "";
  $("#cloud-config").classList.toggle("hidden", Boolean(session?.access_token));
  $("#cloud-auth-form").classList.toggle("hidden", Boolean(session?.access_token));
  $("#cloud-workspace").classList.toggle("hidden", !session?.access_token);
  $("#cloud-account-email").textContent = session?.user?.email || "Signed in";
  const marker = session?.user?.id ? readSyncMarker(session.user.id) : null;
  $("#cloud-last-synced").textContent = marker?.remoteUpdatedAt ? `Last synced ${relativeTime(marker.remoteUpdatedAt)}` : "";
  if (config && !session?.access_token && $("#sync-message").dataset.status === "info") {
    cloudMessage("Connection saved. Sign in to sync this workspace.", "info");
  }
  const footerStatusText = $("#footer-cloud-status-text");
  const footerStatusPill = $("#footer-cloud-status");
  if (footerStatusText && footerStatusPill) {
    if (session?.access_token) {
      footerStatusText.textContent = `Cloud Synced (${session?.user?.email || "Connected"})`;
      footerStatusPill.className = "footer-status-pill connected";
    } else if (config?.url) {
      footerStatusText.textContent = "Cloud Configured (Offline/Guest)";
      footerStatusPill.className = "footer-status-pill pending";
    } else {
      footerStatusText.textContent = "Local Storage Mode (Offline)";
      footerStatusPill.className = "footer-status-pill offline";
    }
  }
}

function bytesToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function base64ToBlob(encoded, type) {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: type || "application/octet-stream" });
}

async function exportBackup() {
  const backup = {
    format: "workbench-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    workspace: {
      ...state,
      projects: await Promise.all(state.projects.map(async project => ({
        ...project,
        folders: await Promise.all((project.folders || []).map(async folder => ({
          ...folder,
          images: await Promise.all((folder.images || []).map(async image => ({
            ...image,
            cloudPath: undefined,
            data: image.blob ? bytesToBase64(await image.blob.arrayBuffer()) : null
          })))
        })))
      })))
    }
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `workbench-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("Workspace backup exported.");
}

async function importBackup(file) {
  const parsed = JSON.parse(await file.text());
  if (parsed?.format !== "workbench-backup" || parsed?.version !== 1 || !parsed.workspace
      || !Array.isArray(parsed.workspace.projects) || !Array.isArray(parsed.workspace.skills)) {
    throw new Error("That file is not a supported Workbench backup.");
  }
  const restored = structuredClone(parsed.workspace);
  restored.activity = Array.isArray(restored.activity) ? restored.activity : [];
  restored.practiceLog = Array.isArray(restored.practiceLog)
    ? restored.practiceLog.filter(item => item?.kind === "xp" && typeof item.text === "string")
    : migratePracticeLog(restored.activity, restored.skills);
  for (const project of restored.projects) {
    project.priority = safePriority(project.priority);
    project.tags = Array.isArray(project.tags) ? project.tags.filter(tag => typeof tag === "string") : [];
    project.folders = Array.isArray(project.folders) ? project.folders : [];
    for (const folder of project.folders) {
      folder.images = Array.isArray(folder.images) ? folder.images : [];
      for (const image of folder.images) {
        image.blob = image.data ? base64ToBlob(image.data, image.type) : null;
        delete image.data;
        delete image.cloudPath;
      }
    }
    project.tasks = Array.isArray(project.tasks) ? project.tasks : [];
    project.notes = Array.isArray(project.notes) ? project.notes : [];
    project.materials = Array.isArray(project.materials) ? project.materials : [];
    project.pinned = Boolean(project.pinned);
    project.timeSpent = Number.isFinite(project.timeSpent) ? project.timeSpent : 0;
  }
  if (!window.confirm("Importing replaces all projects and skills in this browser. Continue?")) return;
  state.projects = restored.projects;
  state.skills = restored.skills;
  state.activity = Array.isArray(restored.activity) ? restored.activity : [];
  state.practiceLog = restored.practiceLog;
  state.inventory = Array.isArray(restored.inventory) ? restored.inventory : [];
  state.customTemplates = Array.isArray(restored.customTemplates) ? restored.customTemplates : [];
  state.makerGoals = Array.isArray(restored.makerGoals) ? restored.makerGoals : [];
  state.maintenance = Array.isArray(restored.maintenance) ? restored.maintenance : [];
  state.currency = restored.currency || "USD";
  state.unitSystem = restored.unitSystem || "in";
  state.weeklyGoal = Number.isFinite(restored.weeklyGoal) ? restored.weeklyGoal : 60;
  state.starterSkillsAdded = true;
  try {
    updateTopbarUnitsPill();
    await persistState();
    render();
    showToast("Workspace backup imported.");
  } catch (error) {
    console.error("Unable to import workspace backup.", error);
    cloudMessage("Backup import failed. The current browser data has not been fully saved.", "error");
  }
}

function safeStatus(status) {
  return STATUS_LABELS[status] ? status : "planned";
}

function render() {
  updateUserUI();
  renderNavigation();
  renderCloudConnection();
  renderOverview();
  renderProjects();
  renderPlanner();
  renderSkills();
  renderGallery();
  renderTimeline();
  renderShoppingList();
  renderInventory();
  renderWeeklyGoal();
  renderAchievements();
  renderNotificationBadge();
  if ($("#admin-view")?.classList.contains("active")) renderAdminHub();
  if (activeProjectId && $("#detail-dialog").open) renderProjectDetail(activeProjectId);
}

function renderNavigation() {
  const projCount = $("#nav-project-count");
  if (projCount) projCount.textContent = state.projects.length;
  const shoppingCount = $("#nav-shopping-count");
  if (shoppingCount) {
    const unpurchased = state.projects.flatMap(p => (p.materials || []).filter(m => m.status !== "have"));
    shoppingCount.textContent = unpurchased.length;
  }
  const inventoryCount = $("#nav-inventory-count");
  if (inventoryCount) {
    inventoryCount.textContent = (state.inventory || []).length;
  }
}

function statCard(label, number, foot, symbol) {
  return `<article class="stat-card"><div class="stat-label">${label}</div><span class="stat-symbol">${symbol}</span><div class="stat-number">${number}</div><div class="stat-foot">${foot}</div></article>`;
}

function renderOverview() {
  const inProgress = state.projects.filter(project => project.status === "in-progress").length;
  const completed = state.projects.filter(project => project.status === "completed").length;
  const totalXp = state.skills.reduce((sum, skill) => sum + skill.xp, 0);
  const photos = state.projects.reduce((sum, project) => sum + projectImageCount(project), 0);
  const totalMinutes = state.projects.reduce((sum, project) => sum + (Number(project.timeSpent) || 0), 0);
  $("#overview-stats").innerHTML = [
    statCard("Projects in motion", inProgress, `${state.projects.length} in your workshop`, "↗"),
    statCard("Time invested", formatMinutes(totalMinutes), "Across all workshop projects", "⏱"),
    statCard("Finished projects", completed, "A little something to be proud of", "✳"),
    statCard("Skills growing", state.skills.length, `${totalXp.toLocaleString()} XP earned so far`, "✽"),
    statCard("Moments captured", photos, "Photos saved across your projects", "▧")
  ].join("");

  const recent = [...state.projects].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 4);
  $("#recent-projects").innerHTML = recent.length ? recent.map((project, index) => {
    const skillText = projectSkillNames(project).map(skill => skill.name).join(" · ");
    return `<div class="project-row" data-project="${project.id}" tabindex="0" role="button" aria-label="Open ${escapeHTML(project.title)}">
      <div class="project-swatch color-${index % 4}">${["✳", "⌘", "◈", "✿"][index % 4]}</div>
      <div class="project-row-info"><strong>${escapeHTML(project.title)}</strong><span>${escapeHTML(skillText || project.description || "A project in your workshop")}</span></div>
      <span class="status-pill status-${safeStatus(project.status)}">${STATUS_LABELS[safeStatus(project.status)]}</span>
    </div>`;
  }).join("") : emptyState("Your first project is waiting", "Start with an idea, a plan, or something you’ve already made.", "new-project");

  const topSkills = [...state.skills].sort((a, b) => b.xp - a.xp).slice(0, 4);
  $("#overview-skills").innerHTML = topSkills.length ? topSkills.map(skill => `
    <div class="skill-overview-item">
      <div class="skill-overview-top"><span class="skill-overview-name">${escapeHTML(skill.name)}</span><span class="skill-level">Level ${skillLevel(skill.xp)}</span></div>
      <div class="progress-track"><div class="progress-bar" style="width:${skillProgress(skill.xp)}%"></div></div>
      <div class="skill-overview-foot"><span>${skillProgress(skill.xp)} / ${XP_PER_LEVEL} XP to next level</span><span>${skill.xp} XP</span></div>
    </div>`).join("") + `<button class="panel-footer-link" data-view="skills">Explore all skills <span>→</span></button>`
    : `<div class="empty-inline">Add the skills you’re building and celebrate each level up.</div><button class="panel-footer-link" data-action="new-skill">Add your first skill <span>→</span></button>`;

  const activities = state.activity.slice(0, 3);
  $("#recent-activity").innerHTML = activities.length ? `<div class="activity-list">${activities.map(activity => `
    <div class="activity-item"><div class="activity-icon">${activity.kind === "xp" ? "✳" : activity.kind === "photo" ? "▧" : "↗"}</div>
    <div><p>${escapeHTML(activity.text)}</p><time>${relativeTime(activity.at)}</time></div></div>`).join("")}</div>`
    : `<div class="empty-inline">Your little wins will show up here as you go.</div>`;

  const overviewStreak = $("#overview-streak-container");
  if (overviewStreak) overviewStreak.innerHTML = renderStreakWidget();
  renderMakerGoals();
}

function emptyState(title, description, action, buttonText = "Get started") {
  return `<div class="empty-state"><div class="empty-state-mark">✳</div><h3>${title}</h3><p>${description}</p><button class="button button-primary" data-action="${action}">＋ ${buttonText}</button></div>`;
}

function renderProjects() {
  renderSkillFilterPills();
  renderTagFilterPills();
  const query = ($("#project-search")?.value || "").trim().toLowerCase();
  const filter = $("#project-status-filter")?.value || "all";
  const priorityFilter = $("#project-priority-filter")?.value || "all";
  const sort = $("#project-sort")?.value || "updated";
  const filtered = [...state.projects]
    .filter(project => {
      if (filter === "all") return true;
      if (filter === "pinned") return project.pinned === true;
      if (filter === "collaborative") return isCollaborativeProject(project);
      return safeStatus(project.status) === filter;
    })
    .filter(project => {
      if (priorityFilter === "all") return true;
      return safePriority(project.priority) === priorityFilter;
    })
    .filter(project => {
      if (selectedSkillFilters.size === 0) return true;
      return (project.skillIds || []).some(id => selectedSkillFilters.has(id));
    })
    .filter(project => {
      if (selectedTagFilters.size === 0) return true;
      return (project.tags || []).some(tag => selectedTagFilters.has(tag));
    })
    .filter(project => {
      if (!query) return true;
      const skillsStr = projectSkillNames(project).map(skill => skill.name).join(" ");
      const tagsStr = (project.tags || []).join(" ");
      const creatorStr = project.creator ? `${project.creator.name || ""} ${project.creator.email || ""}` : "";
      const collabStr = (project.coCreators || []).map(c => `${c.name || ""} ${c.email || ""} ${c.role || ""}`).join(" ");
      const isCollabKeyword = isCollaborativeProject(project) && (query.includes("collab") || query.includes("shared") || query.includes("team"));
      const combined = `${project.title} ${project.description} ${tagsStr} ${skillsStr} ${creatorStr} ${collabStr}`.toLowerCase();
      return combined.includes(query) || isCollabKeyword;
    })
    .sort((a, b) => {
      if (Boolean(b.pinned) !== Boolean(a.pinned)) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
      if (sort === "due-soon") return (a.targetDate || "9999").localeCompare(b.targetDate || "9999");
      if (sort === "priority") return ({ high: 0, normal: 1, low: 2 }[a.priority] ?? 1) - ({ high: 0, normal: 1, low: 2 }[b.priority] ?? 1);
      if (sort === "name") return a.title.localeCompare(b.title);
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
  $("#project-result-count").textContent = `${filtered.length} ${filtered.length === 1 ? "project" : "projects"}`;

  const isKanban = projectViewMode === "kanban";
  const gridEl = $("#project-grid");
  const kanbanEl = $("#project-kanban");
  $$("#project-view-mode-toggle .view-mode-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.mode === projectViewMode);
  });

  if (isKanban) {
    if (gridEl) gridEl.style.display = "none";
    if (kanbanEl) {
      kanbanEl.style.display = "grid";
      renderKanban(filtered);
    }
  } else {
    if (kanbanEl) kanbanEl.style.display = "none";
    if (gridEl) {
      gridEl.style.display = "grid";
      gridEl.innerHTML = filtered.length ? filtered.map((project, index) => {
        const skills = projectSkillNames(project);
        const images = projectImageCount(project);
        const progress = projectTaskProgress(project);
        return `<article class="project-card ${project.pinned ? "is-pinned" : ""}" data-project="${project.id}" tabindex="0" role="button" aria-label="Open ${escapeHTML(project.title)}">
          <div class="project-card-head">
            <div class="project-card-mark">${["✳", "⌘", "◈", "✿"][index % 4]}</div>
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              ${isCollaborativeProject(project) ? `<span class="collab-badge" title="Collaborative project with ${(project.coCreators || []).length + 1} members">👥 Team (${(project.coCreators || []).length + 1})</span>` : ""}
              ${project.pinned ? `<span class="pin-badge">★ Pinned</span>` : ""}
              <button type="button" class="pin-toggle-btn ${project.pinned ? "active" : ""}" data-action="toggle-pin" data-project="${project.id}" title="${project.pinned ? "Unpin project" : "Pin project to top"}" aria-label="${project.pinned ? "Unpin project" : "Pin project to top"}">★</button>
              <span class="status-pill status-${safeStatus(project.status)}">${STATUS_LABELS[safeStatus(project.status)]}</span>
            </div>
          </div>
          <h3>${escapeHTML(project.title)}</h3><p class="project-card-description">${escapeHTML(project.description || "No description yet. Open this project to add one.")}</p>
          <div class="project-card-labels"><span class="priority-pill priority-${safePriority(project.priority)}">${priorityLabel(project.priority)}</span>${(project.tags || []).slice(0, 3).map(tag => `<span class="mini-tag clickable" data-tag="${escapeHTML(tag)}">${escapeHTML(tag)}</span>`).join("")}${(project.tags || []).length > 3 ? `<span class="mini-tag">+${project.tags.length - 3}</span>` : ""}</div>
          <div class="project-card-skills">${skills.slice(0, 3).map(skill => `<span class="mini-tag clickable" data-skill-id="${skill.id}">${escapeHTML(skill.name)}</span>`).join("")}${skills.length > 3 ? `<span class="mini-tag">+${skills.length - 3}</span>` : ""}</div>
          ${progress.total ? `<div class="card-task-progress"><div class="progress-track"><div class="progress-bar" style="width:${progress.percent}%"></div></div><span>${progress.completed}/${progress.total} steps</span></div>` : ""}
          <div class="project-card-bottom"><span class="project-card-meta">${images ? `▧ ${images} ${images === 1 ? "photo" : "photos"} · ` : ""}${project.materials?.length ? `⚙ ${project.materials.length} parts · ` : ""}${project.timeSpent ? `⏱ ${formatMinutes(project.timeSpent)} · ` : ""}Updated ${relativeTime(project.updatedAt)}</span>${project.targetDate ? `<span class="project-card-meta">Due ${formatDate(project.targetDate)}</span>` : ""}</div>
        </article>`;
      }).join("") : emptyState(query || filter !== "all" || priorityFilter !== "all" || selectedSkillFilters.size > 0 || selectedTagFilters.size > 0 ? "No projects match that" : "Every great thing starts somewhere", query || filter !== "all" || priorityFilter !== "all" || selectedSkillFilters.size > 0 || selectedTagFilters.size > 0 ? "Try another search or status/priority/tag filter." : "Add something you’ve made, want to make, or are working on right now.", "new-project", "New project");
    }
  }
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
  const totalCost = materials.reduce((sum, m) => sum + (Number(m.cost) || 0), 0);
  const spentCost = materials.filter(m => m.status === "have" || m.status === "ordered").reduce((sum, m) => sum + (Number(m.cost) || 0), 0);
  const haveCount = materials.filter(m => m.status === "have").length;
  const budget = Number(project.budget) || 0;
  const budgetRemaining = budget ? budget - totalCost : 0;
  const budgetPercent = budget > 0 ? Math.min(100, Math.round((totalCost / budget) * 100)) : 0;
  const isOverBudget = budget > 0 && totalCost > budget;

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

  $("#project-detail").innerHTML = `<div class="detail-content">
    <div class="detail-top">
      <div class="detail-title">
        <div class="project-swatch">✳</div>
        <div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <h2>${escapeHTML(project.title)}</h2>
            <button type="button" class="pin-toggle-btn ${project.pinned ? "active" : ""}" data-action="toggle-pin" data-project="${project.id}" title="${project.pinned ? "Unpin project" : "Pin project to top"}" aria-label="${project.pinned ? "Unpin project" : "Pin project to top"}">★</button>
            <button type="button" class="button button-small prominent-team-btn" data-action="open-collaborators-dialog" data-id="${project.id}" title="Manage co-creators & project team members">👥 Project Team (${(project.coCreators || []).length + 1})</button>
            <button type="button" class="small-action" data-action="open-time-dialog" data-id="${project.id}" title="Log time on this project">⏱ Log time</button>
            <button type="button" class="small-action" data-action="open-timer" data-project="${project.id}" title="Start focused practice timer for this project">⏱ Timer</button>
            <button type="button" class="small-action" data-action="open-showcase" data-id="${project.id}" title="Shareable project showcase & build story">🌟 Showcase</button>
            <button type="button" class="small-action" data-action="open-project-pricing" data-id="${project.id}" title="Labor cost & selling price calculator">🏷️ Price & Profit</button>
            <button type="button" class="small-action" data-action="open-project-blueprint" data-id="${project.id}" title="2D Blueprint & dimensioned sketchpad">📐 Blueprint</button>
            <button type="button" class="small-action" data-action="open-project-qr" data-id="${project.id}" title="Workshop QR bin label">🏷️ QR Label</button>
            <button type="button" class="small-action" data-action="save-project-template" data-id="${project.id}" title="Save as reusable template">💾 Template</button>
            <button type="button" class="small-action" data-action="open-compare-photos" data-project="${project.id}" title="Compare photos side-by-side">↔️ Compare</button>
            <button type="button" class="small-action print-keep" data-action="open-project-dossier" data-id="${project.id}" title="View comprehensive project dossier">📄 Dossier</button>
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
    ${completionBannerHtml}
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
    <div class="detail-section-heading"><h3>Project checklist <span class="subtle-count">${progress.total ? `${progress.completed}/${progress.total} complete` : "Break it into steps"}</span></h3></div>
    ${progress.total ? `<div class="detail-task-progress"><div class="progress-track"><div class="progress-bar" style="width:${progress.percent}%"></div></div><span>${progress.percent}%</span></div>` : ""}
    <form class="inline-add-form task-add-form" data-project="${project.id}"><input name="taskText" required maxlength="140" placeholder="Add a next step..." aria-label="New checklist step"><button type="button" class="small-action mic-btn" data-action="dictate-task" data-project="${project.id}" title="Voice dictate next step">🎙 Dictate</button><button class="button button-outline" type="submit">＋ Add step</button></form>
    ${tasks.length ? `<ul class="task-list">${tasks.map((task, idx) => `<li class="task-item ${task.done ? "is-done" : ""}"><label><input type="checkbox" data-action="toggle-task" data-project="${project.id}" data-id="${task.id}" ${task.done ? "checked" : ""}><span>${escapeHTML(task.text)}</span>${task.completedBy ? `<span class="activity-author-tag">✓ ${escapeHTML(task.completedBy.name)}</span>` : ""}</label><div class="task-item-actions">${idx > 0 ? `<button type="button" class="task-action-btn" data-action="move-task-up" data-project="${project.id}" data-id="${task.id}" title="Move up" aria-label="Move up">↑</button>` : ""}${idx < tasks.length - 1 ? `<button type="button" class="task-action-btn" data-action="move-task-down" data-project="${project.id}" data-id="${task.id}" title="Move down" aria-label="Move down">↓</button>` : ""}<button type="button" class="task-action-btn" data-action="edit-task" data-project="${project.id}" data-id="${task.id}" title="Edit step" aria-label="Edit step">✎</button><button type="button" class="task-remove" data-action="delete-task" data-project="${project.id}" data-id="${task.id}" aria-label="Remove ${escapeHTML(task.text)}">×</button></div></li>`).join("")}</ul>` : `<div class="folder-empty">Add a few steps to make a big project feel manageable.</div>`}
    ${budgetCardHtml}
    <div class="detail-section-heading">
      <div>
        <h3>Materials &amp; Supplies</h3>
        <span class="subtle-count">${materials.length ? `${materials.length} items · ${formatMoney(totalCost)} total` : "Track parts & build budget"}</span>
      </div>
      <div>
        <button type="button" class="small-action" data-action="pick-from-inventory" data-project="${project.id}">📥 Add from inventory</button>
      </div>
    </div>
    ${materials.length ? `
      <div class="materials-summary-bar">
        <div><strong>Budget:</strong> $${totalCost.toFixed(2)} total · <span class="materials-cost-total">$${spentCost.toFixed(2)} acquired</span></div>
        <div><span>${haveCount}/${materials.length} items in hand</span></div>
      </div>
    ` : ""}
    <form class="materials-add-form" data-project="${project.id}">
      <input name="materialName" required maxlength="80" placeholder="Part or material name (e.g. 1/4&quot; Walnut ply)..." aria-label="Material name">
      <input name="materialQty" maxlength="30" placeholder="Qty (e.g. 2 pcs)" aria-label="Quantity">
      <input name="materialCost" type="number" step="0.01" min="0" placeholder="$ Price" aria-label="Price">
      <select name="materialStatus" aria-label="Status">
        <option value="need">Need to buy</option>
        <option value="ordered">Ordered</option>
        <option value="have">Have / In stock</option>
      </select>
      <button class="button button-primary" type="submit">＋ Add</button>
    </form>
    ${materials.length ? `
      <div class="materials-table-wrap">
        <table class="materials-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Est. Cost</th>
              <th>Status</th>
              <th style="text-align:right">Action</th>
            </tr>
          </thead>
          <tbody>
            ${materials.map(mat => `
              <tr>
                <td><strong>${escapeHTML(mat.name)}</strong></td>
                <td>${escapeHTML(mat.qty || "-")}</td>
                <td>${Number(mat.cost) > 0 ? `$${Number(mat.cost).toFixed(2)}` : "-"}</td>
                <td>
                  <span class="materials-status-tag status-${mat.status || "need"}" data-action="cycle-material-status" data-project="${project.id}" data-id="${mat.id}" title="Click to cycle status">
                    ${mat.status === "have" ? "✓ Have / In stock" : mat.status === "ordered" ? "↗ Ordered" : "○ Need to buy"}
                  </span>
                </td>
                <td style="text-align:right">
                  <button type="button" class="task-remove" data-action="delete-material" data-project="${project.id}" data-id="${mat.id}" title="Remove material" aria-label="Remove material">×</button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    ` : `<div class="folder-empty"><span style="font-size:16px;margin-right:6px">🪵</span>No materials tracked yet. Add items and parts above to keep track of your build budget.</div>`}
    <div class="detail-section-heading"><h3>Progress journal <span class="subtle-count">${notes.length ? `${notes.length} ${notes.length === 1 ? "entry" : "entries"}` : "Keep a note of the journey"}</span></h3></div>
    <form class="journal-add-form" data-project="${project.id}"><label class="sr-only" for="journal-entry">Progress note</label><textarea id="journal-entry" name="journalText" rows="2" required maxlength="1000" placeholder="What did you try, learn, or figure out today?"></textarea><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><span class="form-hint">A dated note, just for this project.</span><div style="display:flex;gap:6px"><button type="button" class="small-action mic-btn" data-action="dictate-note" data-project="${project.id}" title="Voice dictate note">🎙 Dictate</button><button class="button button-outline" type="submit">＋ Add note</button></div></div></form>
    ${notes.length ? `<div class="journal-list">${[...notes].sort((a, b) => new Date(b.at) - new Date(a.at)).map(note => `<article class="journal-entry"><div class="journal-date">${formatFullDateTime(note.at)}</div><p>${escapeHTML(note.text)}</p><div class="journal-actions"><button type="button" class="journal-action-btn" data-action="edit-note" data-project="${project.id}" data-id="${note.id}" title="Edit progress note" aria-label="Edit progress note">✎</button><button type="button" class="task-remove" data-action="delete-note" data-project="${project.id}" data-id="${note.id}" aria-label="Delete progress note">×</button></div></article>`).join("")}</div>` : ""}
    <div class="detail-section-heading"><h3>Project photos</h3><div><button class="small-action" data-action="new-folder" data-id="${project.id}">＋ Folder</button> <button class="small-action" data-action="open-compare-photos" data-project="${project.id}">↔️ Compare</button> <button class="small-action" data-action="snap-photo" data-id="${project.id}">📷 Camera</button> <button class="small-action" data-action="add-photos" data-id="${project.id}">＋ Add photos</button></div></div>
    ${folders.map(folder => `<div class="folder-block"><div class="folder-heading"><div class="folder-title-wrap"><span class="folder-name-text">${escapeHTML(folder.name)}</span><button type="button" class="icon-link-btn" data-action="rename-folder" data-project="${project.id}" data-folder="${folder.id}" title="Rename folder" aria-label="Rename folder">✎</button>${folders.length > 1 ? `<button type="button" class="icon-link-btn danger-hover" data-action="delete-folder" data-project="${project.id}" data-folder="${folder.id}" title="Delete folder" aria-label="Delete folder">×</button>` : ""}</div><span>${folder.images.length} ${folder.images.length === 1 ? "photo" : "photos"} <button class="small-action" data-action="snap-photo" data-id="${project.id}" data-folder="${folder.id}">📷 Camera</button> <button class="small-action" data-action="add-photos" data-id="${project.id}" data-folder="${folder.id}">＋ Add</button></span></div>${folder.images.length ? `<div class="detail-photo-grid">${folder.images.map(image => `<div class="detail-photo" data-action="open-lightbox" data-image-id="${image.id}" data-caption="${escapeHTML(image.name)}" tabindex="0" role="button" aria-label="View photo ${escapeHTML(image.name)}"><img src="${imageUrl(image)}" alt="${escapeHTML(image.name)}"><button type="button" class="photo-annotate-badge" data-action="annotate-photo" data-image-id="${image.id}" title="Annotate photo" style="position:absolute;bottom:6px;left:6px;background:rgba(0,0,0,0.6);color:#fff;border:none;border-radius:4px;padding:2px 6px;font-size:10px;cursor:pointer">✏️</button><button class="remove-photo" data-action="remove-photo" data-project="${project.id}" data-folder="${folder.id}" data-image="${image.id}" aria-label="Remove ${escapeHTML(image.name)}">×</button></div>`).join("")}</div>` : `<div class="folder-empty">No photos here yet. Add photos to keep a record of your progress.</div>`}</div>`).join("")}
    <div class="detail-footer"><button class="danger-button" data-action="delete-project" data-id="${project.id}">Delete project</button><span class="project-card-meta">${projectImageCount(project)} photos · ${folders.length} ${folders.length === 1 ? "folder" : "folders"}</span></div>
  </div>`;
}

function switchView(view) {
  $$(".view-section").forEach(section => section.classList.toggle("active", section.id === `${view}-view`));
  $$(".nav-link").forEach(link => link.classList.toggle("active", link.dataset.view === view));
  const title = {
    overview: "Overview",
    projects: "Projects",
    skills: "Skills",
    gallery: "Gallery",
    planner: "Planner",
    sync: "Sync & backup",
    timeline: "Activity & Journal",
    shopping: "Shopping list",
    inventory: "Inventory",
    admin: "Admin Console"
  }[view] || "Overview";
  $("#page-crumb").textContent = title;
  updateUserUI();
  if (view === "sync") renderCloudConnection();
  if (view === "timeline") renderTimeline();
  if (view === "shopping") renderShoppingList();
  if (view === "inventory") renderInventory();
  if (view === "admin") renderAdminHub();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 3000);
}

function addProjectSkillOptions(selectedIds = []) {
  const container = $("#project-skill-options");
  container.innerHTML = state.skills.length ? state.skills.map(skill => `
    <label class="skill-option"><input type="checkbox" name="skillIds" value="${skill.id}" ${selectedIds.includes(skill.id) ? "checked" : ""}><span>${escapeHTML(skill.name)}</span></label>`).join("")
    : `<span class="form-hint">No skills yet — you can add them from the Skills page.</span>`;
}

function openProjectForm(project = null) {
  const form = $("#project-form");
  form.reset();
  delete form.dataset.templateTasks;
  delete form.dataset.templateMaterials;
  $("#project-dialog-title").textContent = project ? "Edit project" : "Create a project";
  form.elements.id.value = project?.id || "";
  form.elements.title.value = project?.title || "";
  form.elements.description.value = project?.description || "";
  form.elements.status.value = project ? safeStatus(project.status) : "planned";
  form.elements.targetDate.value = project?.targetDate || "";
  form.elements.priority.value = project?.priority || "normal";
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
    if ($("#detail-dialog").open) renderProjectDetail(project.id);
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
  if (form.matches(".materials-add-form")) {
    const name = form.elements.materialName.value.trim();
    if (!name) return;
    const qty = form.elements.materialQty?.value.trim() || "";
    const cost = parseFloat(form.elements.materialCost?.value) || 0;
    const status = form.elements.materialStatus?.value || "need";
    project.materials = Array.isArray(project.materials) ? project.materials : [];
    project.materials.push({
      id: uid(),
      name,
      qty,
      cost,
      status,
      createdAt: new Date().toISOString()
    });
    project.updatedAt = new Date().toISOString();
    makeActivity("project", `Added ${name} to materials for ${project.title}`);
    try {
      await persistState();
      form.reset();
      render();
      renderProjectDetail(project.id);
      showToast(`Added “${name}” to supplies.`);
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
    project.tasks.push({ id: uid(), text, done: false, createdAt: new Date().toISOString(), createdBy: maker });
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

/* Practice & Pomodoro Focus Timer State and Controls */
const timer = {
  mode: "focus",
  durationSeconds: 25 * 60,
  secondsLeft: 25 * 60,
  intervalId: null,
  isRunning: false,
  isStopwatch: false,
  cycle: 1,
  soundEnabled: true,
  completedCycles: parseInt(localStorage.getItem("workbench-pomodoro-cycles") || "0", 10)
};

function playTimerChime() {
  if (!timer.soundEnabled) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
      gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + idx * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.12);
      osc.stop(ctx.currentTime + idx * 0.12 + 0.45);
    });
  } catch (e) {
    console.warn("Audio chime not available", e);
  }
}

function updateTimerDisplay() {
  const display = $("#timer-display");
  const s = timer.isStopwatch ? timer.secondsLeft : Math.max(0, timer.secondsLeft);
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  const timeText = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  if (display) display.textContent = timeText;

  // Ring SVG progress (circumference = 2 * PI * 88 = 552.92)
  const ring = $("#timer-ring-progress");
  if (ring) {
    const circumference = 552.92;
    if (timer.isStopwatch) {
      ring.style.strokeDashoffset = "0";
      ring.style.stroke = "var(--accent)";
    } else {
      const fraction = timer.durationSeconds > 0 ? (timer.secondsLeft / timer.durationSeconds) : 0;
      const offset = circumference * (1 - fraction);
      ring.style.strokeDashoffset = String(offset);
      ring.style.stroke = timer.mode.includes("break") ? "#10b981" : "#e11d48";
    }
  }

  // Mode label
  const modeLabel = $("#timer-mode-label");
  if (modeLabel) {
    const labels = {
      "focus": "Focus Session (25m)",
      "short-break": "Short Break (5m)",
      "long-break": "Long Break (15m)",
      "deep-focus": "Deep Focus (50m)",
      "stopwatch": "Stopwatch Flow"
    };
    modeLabel.textContent = labels[timer.mode] || "Focus Session";
  }

  // Topbar timer button state
  const topbarBtn = $("#topbar-timer-btn");
  if (topbarBtn) {
    if (timer.isRunning) {
      topbarBtn.classList.add("topbar-focus-running");
      topbarBtn.textContent = `⏱️ ${timeText}`;
    } else {
      topbarBtn.classList.remove("topbar-focus-running");
      topbarBtn.textContent = "⏱️ Focus";
    }
  }

  // Start button text
  const startBtn = $("#timer-start-btn");
  if (startBtn) {
    startBtn.textContent = timer.isRunning ? "Pause" : (timer.isStopwatch ? "Start Stopwatch" : "Start Focus");
  }

  // Cycle dots
  const dotsContainer = $("#pomodoro-cycle-dots");
  if (dotsContainer) {
    dotsContainer.innerHTML = [1, 2, 3, 4].map(c => `
      <span class="pomodoro-dot ${c < timer.cycle ? "filled" : c === timer.cycle ? "filled current" : ""}" title="Cycle ${c}"></span>
    `).join("");
  }
}

function setPomodoroMode(mode, minutes) {
  if (timer.intervalId) {
    clearInterval(timer.intervalId);
    timer.intervalId = null;
    timer.isRunning = false;
  }
  timer.mode = mode;
  if (minutes === 0 || mode === "stopwatch") {
    timer.isStopwatch = true;
    timer.durationSeconds = 0;
    timer.secondsLeft = 0;
  } else {
    timer.isStopwatch = false;
    timer.durationSeconds = minutes * 60;
    timer.secondsLeft = minutes * 60;
  }
  $$("#timer-dialog [data-action='set-pomodoro-mode']").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });
  updateTimerDisplay();
}

function toggleTimerSound() {
  timer.soundEnabled = !timer.soundEnabled;
  const btn = $("#timer-sound-toggle");
  if (btn) {
    btn.classList.toggle("active", timer.soundEnabled);
    btn.textContent = timer.soundEnabled ? "🔔 Chime: ON" : "🔕 Chime: OFF";
  }
}

function openTimerDialog(arg = null) {
  let skillId = null;
  let projectId = null;
  if (typeof arg === "string") {
    skillId = state.skills.some(s => s.id === arg) ? arg : null;
    projectId = state.projects.some(p => p.id === arg) ? arg : null;
  } else if (arg && typeof arg === "object") {
    skillId = arg.skillId || null;
    projectId = arg.projectId || null;
  }

  const projectSelect = $("#timer-project-select");
  if (projectSelect) {
    projectSelect.innerHTML = `<option value="">None (general practice)</option>` +
      state.projects.map(p => `<option value="${escapeHTML(p.id)}">${escapeHTML(p.title)}</option>`).join("");
    if (projectId && state.projects.some(p => p.id === projectId)) {
      projectSelect.value = projectId;
      const proj = state.projects.find(p => p.id === projectId);
      if (!skillId && proj?.skillIds?.length) {
        skillId = proj.skillIds[0];
      }
    } else {
      projectSelect.value = "";
    }
  }

  const select = $("#timer-skill-select");
  if (select) {
    select.innerHTML = state.skills.map(s => `<option value="${escapeHTML(s.id)}">${escapeHTML(s.name)}</option>`).join("");
    if (skillId && state.skills.some(s => s.id === skillId)) {
      select.value = skillId;
    } else if (state.skills.length > 0) {
      select.value = state.skills[0].id;
    }
  }
  updateTimerDisplay();
  $("#timer-dialog")?.showModal();
}

function setTimerPreset(minutes) {
  setPomodoroMode(minutes === 0 ? "stopwatch" : minutes === 5 ? "short-break" : minutes === 15 ? "long-break" : minutes === 50 ? "deep-focus" : "focus", minutes);
}

function toggleTimer() {
  if (timer.isRunning) {
    clearInterval(timer.intervalId);
    timer.intervalId = null;
    timer.isRunning = false;
    updateTimerDisplay();
  } else {
    timer.isRunning = true;
    updateTimerDisplay();
    timer.intervalId = setInterval(() => {
      if (timer.isStopwatch) {
        timer.secondsLeft++;
        updateTimerDisplay();
      } else {
        if (timer.secondsLeft > 0) {
          timer.secondsLeft--;
          updateTimerDisplay();
          if (timer.secondsLeft === 0) {
            clearInterval(timer.intervalId);
            timer.intervalId = null;
            timer.isRunning = false;
            updateTimerDisplay();
            playTimerChime();
            if (timer.mode === "focus" || timer.mode === "deep-focus") {
              timer.completedCycles = (timer.completedCycles || 0) + 1;
              localStorage.setItem("workbench-pomodoro-cycles", String(timer.completedCycles));
              if (timer.cycle < 4) {
                timer.cycle++;
                showToast("🍅 Focus session complete! Take a 5-minute break.");
                setPomodoroMode("short-break", 5);
              } else {
                timer.cycle = 1;
                showToast("🏆 4 Pomodoro cycles finished! Take a 15-minute restorative break.");
                setPomodoroMode("long-break", 15);
              }
            } else {
              showToast("☕ Break finished! Ready for your next focus session.");
              setPomodoroMode("focus", 25);
            }
          }
        }
      }
    }, 1000);
  }
}

function resetTimer() {
  if (timer.intervalId) {
    clearInterval(timer.intervalId);
    timer.intervalId = null;
    timer.isRunning = false;
  }
  timer.secondsLeft = timer.durationSeconds;
  updateTimerDisplay();
}

function finishTimer() {
  const projectSelect = $("#timer-project-select");
  const projectId = projectSelect?.value;
  const skillSelect = $("#timer-skill-select");
  const skillId = skillSelect?.value || state.skills[0]?.id;

  const elapsed = timer.isStopwatch ? timer.secondsLeft : (timer.durationSeconds - timer.secondsLeft);
  const elapsedMins = Math.max(1, Math.round(elapsed / 60));
  let recommendedXp = "10";
  if (elapsedMins >= 55) recommendedXp = "100";
  else if (elapsedMins >= 40) recommendedXp = "50";
  else if (elapsedMins >= 20) recommendedXp = "25";

  if (projectId) {
    const project = state.projects.find(p => p.id === projectId);
    if (project) {
      project.timeSpent = (project.timeSpent || 0) + elapsedMins;
      const at = new Date().toISOString();
      project.notes.push({ id: uid(), text: `⏱ Focused work session: ${formatMinutes(elapsedMins)}`, at });
      project.updatedAt = new Date().toISOString();
      makeActivity("note", `Logged ${formatMinutes(elapsedMins)} on ${project.title}`);
      void persistState().then(() => {
        render();
        if ($("#detail-dialog").open) renderProjectDetail(project.id);
      });
      showToast(`Logged ${formatMinutes(elapsedMins)} to “${project.title}”!`);
    }
  }

  resetTimer();
  $("#timer-dialog")?.close();
  if (skillId) {
    openXpDialog(skillId, recommendedXp, `${elapsedMins}m practice session`);
  }
}

/* Workshop Reference & Tools */
function openToolsDialog() {
  renderFractionChart();
  $("#tools-dialog")?.showModal();
}

function switchToolTab(tab) {
  $$(".tool-tab-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.toolTab === tab));
  $$(".tool-tab-panel").forEach(panel => {
    panel.style.display = panel.id === `tool-panel-${tab}` ? "block" : "none";
  });
}

function parseFraction(str) {
  if (!str) return NaN;
  str = String(str).trim();
  const mixedMatch = str.match(/^(\d+)\s+([0-9]+)\/([0-9]+)$/);
  if (mixedMatch) {
    const whole = parseFloat(mixedMatch[1]);
    const num = parseFloat(mixedMatch[2]);
    const den = parseFloat(mixedMatch[3]);
    return den ? whole + num / den : NaN;
  }
  const fracMatch = str.match(/^([0-9]+)\/([0-9]+)$/);
  if (fracMatch) {
    const num = parseFloat(fracMatch[1]);
    const den = parseFloat(fracMatch[2]);
    return den ? num / den : NaN;
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
      ${price > 0 ? `<div style="margin-top:6px"><strong>Estimated Cost:</strong> $${totalCost.toFixed(2)} ($${price.toFixed(2)}/BF)</div>` : `<div style="margin-top:6px;color:#888;font-size:11px">Tip: Enter price per BF to calculate total lumber purchase estimate.</div>`}
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
        text: `Part: ${mat.name}${mat.qty ? ` (${mat.qty})` : ""}${Number(mat.cost) > 0 ? ` · $${Number(mat.cost).toFixed(2)}` : ""} [${mat.status === "have" ? "In stock" : mat.status === "ordered" ? "Ordered" : "Need to buy"}]`,
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
        md += `\n#### Materials & Supplies (BOM) — Total: $${totalMatCost.toFixed(2)}\n`;
        project.materials.forEach(mat => {
          const costStr = Number(mat.cost) > 0 ? `, Cost: $${Number(mat.cost).toFixed(2)}` : "";
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

function copyCutPlan() {
  const stockLen = parseFloat($("#tool-cut-stock")?.value) || 96;
  const kerf = parseFloat($("#tool-cut-kerf")?.value) || 0;
  const resultBox = $("#tool-cutlist-result");
  const blocks = resultBox?.querySelectorAll(".cutlist-board-block");
  if (!blocks || blocks.length === 0) {
    showToast("Run the optimizer first to generate a cut plan.");
    return;
  }
  let plan = `📐 WORKBENCH CUT LIST PLAN\nStock Board Length: ${stockLen}" | Kerf: ${kerf}"\n\n`;
  blocks.forEach((block, idx) => {
    const text = block.querySelector(".cutlist-board-header")?.textContent?.trim() || "";
    const cuts = Array.from(block.querySelectorAll(".cut-piece-box")).map(el => el.textContent.trim()).join(", ");
    plan += `Board #${idx + 1}: Cuts [${cuts}] (${text})\n`;
  });
  navigator.clipboard.writeText(plan).then(() => {
    showToast("Cut plan copied to clipboard!");
  }).catch(() => {
    showToast("Could not copy cut plan.");
  });
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
              <div class="kanban-card ${project.pinned ? "is-pinned" : ""}" draggable="true" data-project="${project.id}" tabindex="0" role="button" aria-label="Open ${escapeHTML(project.title)}">
                <div class="kanban-card-top">
                  <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                    <span class="priority-pill priority-${safePriority(project.priority)}">${priorityLabel(project.priority)}</span>
                    ${isCollaborativeProject(project) ? `<span class="collab-badge" style="font-size:10px;padding:1px 5px">👥 Team</span>` : ""}
                    ${project.pinned ? `<span class="pin-badge">📌</span>` : ""}
                  </div>
                  <div class="kanban-card-quickshift" onclick="event.stopPropagation()">
                    <select class="kanban-shift-select" data-project="${project.id}" title="Move project status" aria-label="Move project status">
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

/* 🔐 Encrypted / Opaque Cloud Setup Invite Tokens */
const WORKSHOP_INVITE_SECRET = "workbench-maker-shop-v1-cloud-key";

function bytesToBase64Url(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlToBytes(str) {
  let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getInviteAesKey() {
  const c = (typeof window !== "undefined" && window.crypto) || (typeof crypto !== "undefined" ? crypto : null);
  const enc = new TextEncoder();
  const hash = await c.subtle.digest("SHA-256", enc.encode(WORKSHOP_INVITE_SECRET));
  return c.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function fallbackScrambleInvite(text) {
  const enc = new TextEncoder().encode(text);
  const keyBytes = new TextEncoder().encode(WORKSHOP_INVITE_SECRET);
  const out = new Uint8Array(enc.length);
  for (let i = 0; i < enc.length; i++) {
    out[i] = enc[i] ^ keyBytes[i % keyBytes.length] ^ ((i * 37) & 0xff);
  }
  return "wbx_" + bytesToBase64Url(out);
}

function fallbackUnscrambleInvite(token) {
  if (!token || !token.startsWith("wbx_")) return null;
  const bytes = base64UrlToBytes(token.slice(4));
  const keyBytes = new TextEncoder().encode(WORKSHOP_INVITE_SECRET);
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    out[i] = bytes[i] ^ keyBytes[i % keyBytes.length] ^ ((i * 37) & 0xff);
  }
  return new TextDecoder().decode(out);
}

async function encryptInviteToken(url, key) {
  const payload = JSON.stringify({ u: url, k: key, t: Date.now() });
  try {
    const c = (typeof window !== "undefined" && window.crypto) || (typeof crypto !== "undefined" ? crypto : null);
    if (c?.subtle) {
      const aesKey = await getInviteAesKey();
      const iv = c.getRandomValues(new Uint8Array(12));
      const enc = new TextEncoder();
      const cipherBuf = await c.subtle.encrypt(
        { name: "AES-GCM", iv },
        aesKey,
        enc.encode(payload)
      );
      const cipherBytes = new Uint8Array(cipherBuf);
      const combined = new Uint8Array(12 + cipherBytes.length);
      combined.set(iv, 0);
      combined.set(cipherBytes, 12);
      return "wbe_" + bytesToBase64Url(combined);
    }
  } catch (e) {
    console.warn("WebCrypto encryption failed, using fallback scrambler:", e);
  }
  return fallbackScrambleInvite(payload);
}

async function decryptInviteToken(token) {
  if (!token || typeof token !== "string") return null;
  token = decodeURIComponent(token.trim());
  if (token.startsWith("wbe_")) {
    try {
      const c = (typeof window !== "undefined" && window.crypto) || (typeof crypto !== "undefined" ? crypto : null);
      if (c?.subtle) {
        const combined = base64UrlToBytes(token.slice(4));
        if (combined.length < 13) return null;
        const iv = combined.slice(0, 12);
        const ciphertext = combined.slice(12);
        const aesKey = await getInviteAesKey();
        const decryptedBuf = await c.subtle.decrypt(
          { name: "AES-GCM", iv },
          aesKey,
          ciphertext
        );
        return JSON.parse(new TextDecoder().decode(decryptedBuf));
      }
    } catch (e) {
      console.warn("AES decryption failed:", e);
      return null;
    }
  } else if (token.startsWith("wbx_")) {
    try {
      const json = fallbackUnscrambleInvite(token);
      return JSON.parse(json);
    } catch (e) {
      console.warn("Fallback unscrambler failed:", e);
      return null;
    }
  }
  return null;
}

async function parseInputOrToken(inputStr) {
  if (!inputStr || typeof inputStr !== "string") return null;
  let s = inputStr.trim();
  if (s.includes("#")) {
    const hash = s.slice(s.indexOf("#"));
    if (hash.startsWith("#join=") || hash.startsWith("#invite=") || hash.startsWith("#setup=") || hash.startsWith("#connect=")) {
      s = hash.slice(hash.indexOf("=") + 1);
    } else if (hash.includes("?")) {
      const q = new URLSearchParams(hash.slice(hash.indexOf("?") + 1));
      const tok = q.get("token") || q.get("code") || q.get("c");
      if (tok) s = tok;
      else if (q.get("url") && q.get("key")) return { url: q.get("url"), key: q.get("key") };
    }
  }
  if (s.startsWith("wbe_") || s.startsWith("wbx_")) {
    const dec = await decryptInviteToken(s);
    if (dec && dec.u && dec.k) return { url: dec.u, key: dec.k };
  }
  return null;
}

async function getEncryptedInviteUrl() {
  const cfg = getCloudConfig();
  const url = cfg?.url || $("#auth-cloud-url")?.value?.trim() || $("#cloud-url")?.value?.trim() || "";
  const key = cfg?.key || $("#auth-cloud-key")?.value?.trim() || $("#cloud-key")?.value?.trim() || "";
  if (!url || !key) return null;
  const cleanUrl = url.replace(/\/+$/, "");
  const token = await encryptInviteToken(cleanUrl, key);
  return `${window.location.origin}${window.location.pathname}#join=${encodeURIComponent(token)}`;
}

async function openInviteModal() {
  const dialog = $("#invite-dialog");
  if (!dialog) return;

  const inviteUrl = await getEncryptedInviteUrl();
  if (!inviteUrl) {
    showToast("Please save your Supabase connection first to create an invite link.");
    openAuthModal("config");
    return;
  }

  const inputEl = $("#invite-dialog-url");
  const qrContainer = $("#invite-qr-code");
  const copyBtn = $("#invite-dialog-copy-btn");

  if (inputEl) inputEl.value = inviteUrl;
  if (copyBtn) {
    copyBtn.textContent = "📋 Copy Link";
    copyBtn.disabled = false;
  }

  if (qrContainer) {
    if (window.QR && typeof window.QR.toSVG === "function") {
      qrContainer.innerHTML = window.QR.toSVG(inviteUrl, { cellSize: 3, margin: 2 });
    } else {
      qrContainer.innerHTML = `<span style="font-size:12px;color:var(--muted)">Scan or copy link above</span>`;
    }
  }

  dialog.showModal();
}

async function copyInviteLinkToClipboard(sourceBtn = null) {
  const inviteUrl = await getEncryptedInviteUrl();
  if (!inviteUrl) {
    showToast("Please save your Supabase connection first.");
    openAuthModal("config");
    return;
  }

  try {
    await navigator.clipboard.writeText(inviteUrl);
    showToast("Copied encrypted invite link to clipboard! 🔒📋");
    if (sourceBtn) {
      const origText = sourceBtn.textContent;
      sourceBtn.textContent = "✓ Copied!";
      setTimeout(() => { if (sourceBtn) sourceBtn.textContent = origText; }, 2500);
    }
  } catch {
    window.prompt("Copy your encrypted invite link:", inviteUrl);
  }
}

async function checkInviteOrSetupLink() {
  let url = "";
  let key = "";
  let token = "";

  const hash = window.location.hash || "";
  if (hash.startsWith("#join=") || hash.startsWith("#invite=") || hash.startsWith("#setup=") || hash.startsWith("#connect=")) {
    token = hash.slice(hash.indexOf("=") + 1);
  } else if (hash.startsWith("#setup?") || hash.startsWith("#join?") || hash.startsWith("#invite?") || hash.startsWith("#connect?")) {
    const rawQuery = hash.slice(hash.indexOf("?") + 1);
    const params = new URLSearchParams(rawQuery);
    token = params.get("token") || params.get("code") || params.get("c") || "";
    if (!token) {
      url = params.get("url") || "";
      key = params.get("key") || "";
    }
  }

  if (!token && !url) {
    const searchParams = new URLSearchParams(window.location.search);
    token = searchParams.get("join") || searchParams.get("token") || searchParams.get("invite") || searchParams.get("code") || searchParams.get("c") || "";
    if (!token) {
      url = searchParams.get("url") || "";
      key = searchParams.get("key") || "";
    }
  }

  if (token) {
    try {
      const decrypted = await decryptInviteToken(token);
      if (decrypted && decrypted.u && decrypted.k) {
        url = decrypted.u;
        key = decrypted.k;
      }
    } catch (e) {
      console.error("Failed to decrypt invite token", e);
    }
  }

  if (url && key) {
    url = url.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    url = url.replace(/\/+$/, "");
    key = key.trim();

    try {
      const cleanUrl = `${window.location.origin}${window.location.pathname}`;
      history.replaceState(null, "", cleanUrl);

      const previous = getCloudConfig();
      if (previous?.url !== url || previous?.key !== key) setCloudSession(null);
      setCloudConfig({ url, key });
      if ($("#cloud-url")) $("#cloud-url").value = url;
      if ($("#cloud-key")) $("#cloud-key").value = "••••••••••••••••";
      if ($("#auth-cloud-url")) $("#auth-cloud-url").value = url;
      if ($("#auth-cloud-key")) $("#auth-cloud-key").value = "••••••••••••••••";

      renderCloudConnection();
      showToast("Connected to shop cloud database! 🚀");

      if (!getCloudSession()) {
        setTimeout(() => {
          openAuthModal("signup");
          showAuthAlert("✓ Cloud connected! Create your maker account below to get started.", "success");
        }, 350);
      }
      return true;
    } catch (e) {
      console.error("Failed to process setup link", e);
    }
  }
  return false;
}

/* 🔖 Workshop QR Code Label Generator & Routing */
function checkHashRouting() {
  const hash = window.location.hash || "";
  if (!hash) return;

  if (
    hash.startsWith("#setup") ||
    hash.startsWith("#join") ||
    hash.startsWith("#invite") ||
    hash.startsWith("#connect")
  ) {
    void checkInviteOrSetupLink();
    return;
  }

  const teamMatch = hash.match(/^#(?:team-project|import-project)[=/]([a-zA-Z0-9+/=_-]+)/);
  if (teamMatch) {
    try {
      const raw = decodeURIComponent(atob(teamMatch[1]));
      const data = JSON.parse(raw);
      const incomingProject = data?.p;
      if (incomingProject && incomingProject.id) {
        history.replaceState(null, "", `${window.location.origin}${window.location.pathname}`);
        ensureProjectCreator(incomingProject);
        const curUser = getActiveUser();
        if (curUser && curUser.id !== "local-maker") {
          const already = (incomingProject.coCreators || []).some(c => c.id === curUser.id || (c.email && curUser.email && c.email.toLowerCase() === curUser.email.toLowerCase()));
          if (!already && incomingProject.creator?.id !== curUser.id) {
            incomingProject.coCreators = incomingProject.coCreators || [];
            incomingProject.coCreators.push({
              id: curUser.id,
              name: curUser.displayName || "Maker",
              email: curUser.email || "",
              role: "Editor",
              addedAt: new Date().toISOString()
            });
          }
        }
        const existingIdx = state.projects.findIndex(p => p.id === incomingProject.id);
        if (existingIdx >= 0) {
          state.projects[existingIdx] = incomingProject;
        } else {
          state.projects.unshift(incomingProject);
        }
        syncSharedCollaborations();
        void persistState();
        render();
        switchView("projects");
        openProjectDetail(incomingProject.id);
        showToast(`👥 Joined team project: ${incomingProject.title}!`);
        return;
      }
    } catch (e) {
      console.warn("Could not import team project from link:", e);
    }
  }

  const projectMatch = hash.match(/^#project[=/]([a-zA-Z0-9_-]+)/);
  if (projectMatch) {
    const pid = projectMatch[1];
    switchView("projects");
    openProjectDetail(pid);
    return;
  }

  if (hash === "#shopping") {
    switchView("shopping");
    return;
  }
  if (hash === "#inventory") {
    switchView("inventory");
    return;
  }
  if (hash === "#tools") {
    openToolsDialog();
    return;
  }
  if (hash === "#timer") {
    openTimerDialog();
    return;
  }
  const viewMatch = hash.match(/^#view=([a-z-]+)/);
  if (viewMatch) {
    switchView(viewMatch[1]);
  }
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

  const projectSelect = $("#shopping-project-filter");
  if (projectSelect) {
    const activeProjects = state.projects.filter(p => (p.materials || []).length > 0);
    const prevVal = projectSelect.value;
    projectSelect.innerHTML = `<option value="all">All projects (${allMaterials.length})</option>` +
      activeProjects.map(p => `<option value="${p.id}">${escapeHTML(p.title)}</option>`).join("");
    if (prevVal) projectSelect.value = prevVal;
  }

  const filtered = allMaterials.filter(item => {
    if (statusFilter === "need" && item.status !== "need") return false;
    if (statusFilter === "ordered" && item.status !== "ordered") return false;
    if (projectFilter !== "all" && item.projectId !== projectFilter) return false;
    if (search && !item.name.toLowerCase().includes(search) && !item.projectTitle.toLowerCase().includes(search)) return false;
    return true;
  });

  const countEl = $("#shopping-result-count");
  if (countEl) countEl.textContent = `${filtered.length} item${filtered.length === 1 ? "" : "s"}`;

  const totalNeedCost = allMaterials.filter(m => m.status === "need").reduce((s, m) => s + (Number(m.cost) || 0), 0);
  const totalNeedCount = allMaterials.filter(m => m.status === "need").length;
  const orderedCost = allMaterials.filter(m => m.status === "ordered").reduce((s, m) => s + (Number(m.cost) || 0), 0);
  const orderedCount = allMaterials.filter(m => m.status === "ordered").length;
  const acquiredCost = allMaterials.filter(m => m.status === "have").reduce((s, m) => s + (Number(m.cost) || 0), 0);

  const summaryBar = $("#shopping-summary-bar");
  if (summaryBar) {
    summaryBar.innerHTML = `
      <div class="shopping-stat"><strong>${totalNeedCount}</strong> <span>To Buy</span></div>
      <div class="shopping-stat"><strong>$${totalNeedCost.toFixed(2)}</strong> <span>Est. Cart Total</span></div>
      <div class="shopping-stat"><strong>${orderedCount}</strong> <span>On Order ($${orderedCost.toFixed(2)})</span></div>
      <div class="shopping-stat"><strong>$${acquiredCost.toFixed(2)}</strong> <span>Acquired In Shop</span></div>
    `;
  }

  const itemsContainer = $("#shopping-list-items");
  if (!itemsContainer) return;

  if (filtered.length === 0) {
    itemsContainer.innerHTML = `
      <div class="shopping-empty">
        <p>No shopping items match your filter.</p>
        <span style="font-size:12px;color:var(--muted)">Add supplies in any project's detail view under "Materials &amp; Supplies".</span>
      </div>
    `;
    return;
  }

  const byProject = new Map();
  for (const item of filtered) {
    if (!byProject.has(item.projectId)) byProject.set(item.projectId, []);
    byProject.get(item.projectId).push(item);
  }

  itemsContainer.innerHTML = Array.from(byProject.entries()).map(([pid, items]) => {
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
                <div class="shopping-item-name">${escapeHTML(m.name)}</div>
                <div class="shopping-item-meta">
                  ${m.qty ? `<span class="shopping-qty-badge">Qty: ${escapeHTML(m.qty)}</span>` : ""}
                  ${Number(m.cost) > 0 ? `<span class="shopping-cost-badge">$${Number(m.cost).toFixed(2)}</span>` : ""}
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
    const cost = Number(m.cost) > 0 ? ` [~$${Number(m.cost).toFixed(2)}]` : "";
    text += `[ ] ${m.name}${qty}${cost} — for "${m.projectTitle}"\n`;
  });

  const totalCost = needItems.reduce((s, m) => s + (Number(m.cost) || 0), 0);
  if (totalCost > 0) text += `\nEstimated Total: $${totalCost.toFixed(2)}\n`;

  navigator.clipboard.writeText(text).then(() => {
    showToast("Copied shopping checklist to clipboard!");
  }).catch(() => {
    showToast("Could not copy checklist.");
  });
}

/* 📦 Workshop Inventory Depot */
function renderInventory() {
  const view = $("#inventory-view");
  if (!view) return;

  renderToolMaintenance();

  const search = ($("#inventory-search")?.value || "").trim().toLowerCase();
  const categoryFilter = $("#inventory-category-filter")?.value || "all";

  const inventory = state.inventory || [];
  const filtered = inventory.filter(item => {
    if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
    if (search) {
      const match = `${item.name} ${item.location || ""} ${item.notes || ""} ${item.category}`.toLowerCase();
      if (!match.includes(search)) return false;
    }
    return true;
  });

  const countEl = $("#inventory-result-count");
  const totalValue = filtered.reduce((s, i) => s + ((i.quantity || 0) * (i.price || 0)), 0);
  if (countEl) countEl.textContent = `${filtered.length} item${filtered.length === 1 ? "" : "s"}${totalValue > 0 ? ` · Est. Value: $${totalValue.toFixed(2)}` : ""}`;

  const grid = $("#inventory-grid");
  if (!grid) return;

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="inventory-empty">
        <p>No inventory items match your search.</p>
        <button class="button button-primary button-small" data-action="open-inventory-dialog">+ Add First Supply</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(item => {
    return `
      <div class="inventory-card">
        <div class="inventory-card-top">
          <span class="inventory-category-badge">${escapeHTML(item.category || "General")}</span>
          ${item.price > 0 ? `<span class="inventory-category-badge" style="background:var(--surface-hover);border:1px solid var(--line);font-weight:600">$${item.price.toFixed(2)}${item.unit ? ` / ${escapeHTML(item.unit)}` : ""}</span>` : ""}
          ${item.location ? `<span class="inventory-location-badge">📍 ${escapeHTML(item.location)}</span>` : ""}
          ${item.supplier ? `<span class="inventory-location-badge">🏷️ ${escapeHTML(item.supplier)}</span>` : ""}
        </div>
        <h3 class="inventory-card-title">${escapeHTML(item.name)}</h3>
        ${item.notes ? `<p class="inventory-card-notes">${escapeHTML(item.notes)}</p>` : ""}
        <div class="inventory-qty-row">
          <div class="inventory-qty-control">
            <button type="button" class="qty-btn" data-action="inventory-bump" data-id="${item.id}" data-delta="-1" title="Subtract 1">−</button>
            <span class="inventory-qty-val">${item.quantity ?? 1}</span>
            <span class="inventory-unit">${escapeHTML(item.unit || "units")}</span>
            <button type="button" class="qty-btn" data-action="inventory-bump" data-id="${item.id}" data-delta="1" title="Add 1">＋</button>
          </div>
        </div>
        <div class="inventory-card-bottom">
          <button type="button" class="small-action" data-action="pick-from-inventory" data-id="${item.id}">Use in Project</button>
          <div style="display:flex;gap:4px">
            <button type="button" class="icon-link-btn" data-action="edit-inventory-item" data-id="${item.id}" title="Edit item">✎</button>
            <button type="button" class="icon-link-btn danger-hover" data-action="delete-inventory-item" data-id="${item.id}" title="Delete item">×</button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function openInventoryDialog(item = null) {
  const form = $("#inventory-form");
  const dialog = $("#inventory-dialog");
  const delBtn = $("#delete-inventory-btn");
  if (!form || !dialog) return;

  form.reset();
  if (item && typeof item === "object") {
    $("#inventory-dialog-title").textContent = item.id ? "Edit supply item" : "Add supply item";
    form.elements.id.value = item.id || "";
    form.elements.name.value = item.name || "";
    form.elements.category.value = item.category || "Lumber / Scrap";
    form.elements.location.value = item.location || "";
    form.elements.quantity.value = item.quantity ?? 1;
    form.elements.unit.value = item.unit || "";
    if (form.elements.price) form.elements.price.value = item.price ?? "";
    if (form.elements.supplier) form.elements.supplier.value = item.supplier || "";
    form.elements.notes.value = item.notes || "";
    if (delBtn) delBtn.classList.toggle("hidden", !item.id);
  } else {
    $("#inventory-dialog-title").textContent = "Add supply item";
    form.elements.id.value = "";
    form.elements.quantity.value = "1";
    if (form.elements.price) form.elements.price.value = "";
    if (form.elements.supplier) form.elements.supplier.value = "";
    if (delBtn) delBtn.classList.add("hidden");
  }

  dialog.showModal();
}

async function handleInventorySubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const id = form.elements.id.value;
  const existing = (state.inventory || []).find(i => i.id === id);

  const item = {
    id: existing?.id || uid(),
    name: form.elements.name.value.trim(),
    category: form.elements.category.value,
    location: form.elements.location.value.trim(),
    quantity: parseFloat(form.elements.quantity.value) || 0,
    unit: form.elements.unit.value.trim(),
    price: parseFloat(form.elements.price?.value) || 0,
    supplier: (form.elements.supplier?.value || "").trim(),
    notes: form.elements.notes.value.trim(),
    updatedAt: new Date().toISOString()
  };

  if (!item.name) return;

  state.inventory = state.inventory || [];
  if (existing) {
    Object.assign(existing, item);
  } else {
    state.inventory.unshift(item);
  }

  makeActivity("note", `Updated inventory: ${item.name} (${item.quantity} ${item.unit || "units"})`);

  try {
    await persistState();
    $("#inventory-dialog")?.close();
    render();
    showToast(`Saved "${item.name}" to inventory.`);
  } catch (e) {
    console.error(e);
    showToast("Could not save inventory item.");
  }
}

async function handleInventoryBump(id, delta) {
  const item = (state.inventory || []).find(i => i.id === id);
  if (!item) return;

  item.quantity = Math.max(0, (item.quantity || 0) + delta);
  item.updatedAt = new Date().toISOString();

  try {
    await persistState();
    renderInventory();
    renderNavigation();
  } catch (e) {
    console.error(e);
  }
}

async function deleteInventoryItem(id) {
  const item = (state.inventory || []).find(i => i.id === id);
  if (!item) return;
  if (!window.confirm(`Delete "${item.name}" from inventory?`)) return;

  state.inventory = state.inventory.filter(i => i.id !== id);

  try {
    await persistState();
    $("#inventory-dialog")?.close();
    render();
    showToast(`Deleted "${item.name}".`);
  } catch (e) {
    console.error(e);
  }
}

function openInventoryPickDialog(inventoryId) {
  const item = (state.inventory || []).find(i => i.id === inventoryId);
  if (!item) return;

  const dialog = $("#inventory-pick-dialog");
  const list = $("#inventory-pick-list");
  if (!dialog || !list) return;

  if (state.projects.length === 0) {
    list.innerHTML = `<p style="padding:16px;color:#888">No projects available yet. Create a project first!</p>`;
  } else {
    list.innerHTML = `
      <p style="font-size:12px;margin-bottom:10px">Select which project to add <strong>${escapeHTML(item.name)}</strong> to:</p>
      <div class="inventory-pick-options">
        ${state.projects.map(p => `
          <button type="button" class="inventory-pick-row" data-action="add-inventory-to-project" data-project="${p.id}" data-inventory="${item.id}">
            <strong>${escapeHTML(p.title)}</strong>
            <span class="status-pill status-${safeStatus(p.status)}">${STATUS_LABELS[safeStatus(p.status)]}</span>
          </button>
        `).join("")}
      </div>
    `;
  }

  dialog.showModal();
}

async function pickInventoryForProject(projectId, inventoryId) {
  const project = state.projects.find(p => p.id === projectId);
  const item = (state.inventory || []).find(i => i.id === inventoryId);
  if (!project || !item) return;

  project.materials = project.materials || [];
  project.materials.push({
    id: uid(),
    name: item.name,
    qty: item.unit ? `1 ${item.unit}` : "1",
    cost: 0,
    status: "have",
    createdAt: new Date().toISOString()
  });
  project.updatedAt = new Date().toISOString();

  try {
    await persistState();
    $("#inventory-pick-dialog")?.close();
    render();
    if ($("#detail-dialog").open && activeProjectId === projectId) renderProjectDetail(projectId);
    showToast(`Added ${item.name} to ${project.title}!`);
  } catch (e) {
    console.error(e);
  }
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
        drawDimensionLine(ctx, annotateState.startX, annotateState.startY, pt.x, pt.y);
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

function drawDimensionLine(ctx, fromX, fromY, toX, toY) {
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
      if ($("#detail-dialog").open) renderProjectDetail(annotateState.activeProject.id);
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
      <div class="dossier-stat-box"><strong>$${totalCost.toFixed(2)}</strong><span>Supplies Budget</span></div>
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
                <td style="text-align:right">${Number(m.cost) > 0 ? `$${Number(m.cost).toFixed(2)}` : "—"}</td>
              </tr>
            `).join("")}
          </tbody>
          <tfoot>
            <tr><td colspan="3"><strong>Total Budget</strong></td><td style="text-align:right"><strong>$${totalCost.toFixed(2)}</strong></td></tr>
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

/* 🪟 Panel Minimization & Window Collapsing */
function isPanelCollapsed(panelId) {
  try {
    const list = JSON.parse(localStorage.getItem("workbench-collapsed-panels") || "[]");
    return Array.isArray(list) && list.includes(panelId);
  } catch {
    return false;
  }
}

function togglePanelCollapse(panelId) {
  try {
    const list = JSON.parse(localStorage.getItem("workbench-collapsed-panels") || "[]");
    const arr = Array.isArray(list) ? list : [];
    const idx = arr.indexOf(panelId);
    if (idx >= 0) {
      arr.splice(idx, 1);
    } else {
      arr.push(panelId);
    }
    localStorage.setItem("workbench-collapsed-panels", JSON.stringify(arr));
    render();
  } catch (e) {
    console.error(e);
  }
}

/* 🔔 In-App Notification Center */
const NOTIFICATIONS_STORAGE_PREFIX = "workbench_notifications_";

function getNotificationsStorageKey() {
  const session = getCloudSession();
  if (session?.user?.id) return `${NOTIFICATIONS_STORAGE_PREFIX}${session.user.id}`;
  return `${NOTIFICATIONS_STORAGE_PREFIX}local`;
}

function getStoredNotifications() {
  try {
    const raw = localStorage.getItem(getNotificationsStorageKey());
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredNotifications(list) {
  try {
    localStorage.setItem(getNotificationsStorageKey(), JSON.stringify(list.slice(0, 60)));
  } catch {}
}

function addNotification({ title, message, icon = "🔔", type = "info" }) {
  const list = getStoredNotifications();
  const notification = {
    id: uid(),
    title,
    message,
    icon,
    type,
    read: false,
    at: new Date().toISOString()
  };
  list.unshift(notification);
  saveStoredNotifications(list);
  renderNotificationBadge();
  return notification;
}

function markAllNotificationsRead() {
  const list = getStoredNotifications().map(n => ({ ...n, read: true }));
  saveStoredNotifications(list);
  renderNotificationBadge();
  renderNotificationList();
}

function clearAllNotifications() {
  saveStoredNotifications([]);
  renderNotificationBadge();
  renderNotificationList();
}

function renderNotificationBadge() {
  const badge = $("#notification-badge");
  if (!badge) return;
  const list = getStoredNotifications();
  const unreadCount = list.filter(n => !n.read).length;
  if (unreadCount > 0) {
    badge.textContent = unreadCount > 9 ? "9+" : String(unreadCount);
    badge.style.display = "inline-flex";
  } else {
    badge.style.display = "none";
  }
}

function renderNotificationList() {
  const listEl = $("#notification-list");
  if (!listEl) return;
  const list = getStoredNotifications();
  if (list.length === 0) {
    listEl.innerHTML = `
      <div class="notification-empty">
        <div class="empty-icon">🔔</div>
        <h4>No notifications yet</h4>
        <p>Unlocked milestones, completed projects, and weekly practice goal celebrations will appear here.</p>
      </div>
    `;
    return;
  }
  listEl.innerHTML = list.map(n => `
    <div class="notification-item ${n.read ? "read" : "unread"}" data-id="${n.id}">
      <div class="notification-item-icon">${n.icon}</div>
      <div class="notification-item-body">
        <div class="notification-item-head">
          <strong class="notification-item-title">${escapeHTML(n.title)}</strong>
          <span class="notification-item-time">${relativeTime(n.at)}</span>
        </div>
        <p class="notification-item-msg">${escapeHTML(n.message)}</p>
      </div>
      ${!n.read ? `<span class="notification-dot" title="Unread"></span>` : ""}
    </div>
  `).join("");
}

function openNotificationsModal() {
  const dialog = $("#notification-dialog");
  if (!dialog) return;
  renderNotificationList();
  dialog.showModal();
}

const UNLOCKED_BADGES_KEY = "workbench_unlocked_badges";
function checkNewBadgeUnlocks(achievements) {
  try {
    const prev = JSON.parse(localStorage.getItem(UNLOCKED_BADGES_KEY) || "[]");
    const prevSet = new Set(Array.isArray(prev) ? prev : []);
    const newlyUnlocked = [];

    achievements.forEach(a => {
      if (a.unlocked && !prevSet.has(a.id)) {
        newlyUnlocked.push(a);
        prevSet.add(a.id);
      }
    });

    localStorage.setItem(UNLOCKED_BADGES_KEY, JSON.stringify([...prevSet]));

    // Only notify if this is not the very first load
    if (newlyUnlocked.length > 0 && prev.length > 0) {
      newlyUnlocked.forEach(a => {
        addNotification({
          title: `Milestone Unlocked: ${a.title}`,
          message: a.desc,
          icon: a.icon,
          type: "badge"
        });
        showToast(`🎉 Milestone Unlocked: ${a.title}!`);
      });
    }
  } catch {}
}

/* 🏅 Milestone Badges & Achievements (22 Badges) */
function computeAchievements() {
  const totalProjects = state.projects.length;
  const completedProjects = state.projects.filter(p => safeStatus(p.status) === "completed").length;
  const totalMinutes = state.projects.reduce((s, p) => s + (p.timeSpent || 0), 0);
  const totalPhotos = state.projects.reduce((s, p) => s + projectImageCount(p), 0);
  const distinctSkills = new Set(state.projects.flatMap(p => p.skillIds || [])).size;
  const inventoryCount = (state.inventory || []).length;
  const practiceCount = (state.practiceLog || []).length;

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 86400000;
  const recentPractice = (state.practiceLog || []).filter(item => new Date(item.at).getTime() >= sevenDaysAgo).length;

  const allTimestamps = [
    ...(state.practiceLog || []).map(item => item.at),
    ...state.projects.flatMap(p => (p.notes || []).map(n => n.at)),
    ...(state.activity || []).map(a => a.at)
  ].filter(Boolean);

  const hasNightWork = allTimestamps.some(ts => {
    const h = new Date(ts).getHours();
    return h >= 21 || h < 4;
  });

  const hasEarlyWork = allTimestamps.some(ts => {
    const h = new Date(ts).getHours();
    return h >= 5 && h < 8;
  });

  const maxSingleSession = (state.practiceLog || []).reduce((max, log) => {
    const match = (log.text || "").match(/·\s*(\d+)m/);
    const m = match ? parseInt(match[1], 10) : 15;
    return Math.max(max, m);
  }, 0);

  const maxSkillXp = (state.skills || []).reduce((max, s) => Math.max(max, s.xp || 0), 0);
  const hasDetailedChecklist = state.projects.some(p => p.tasks && p.tasks.length >= 5 && p.tasks.every(t => t.done));
  const projectsWithMaterials = state.projects.filter(p => p.materials && p.materials.length > 0).length;
  const totalNotes = state.projects.reduce((s, p) => s + (p.notes?.length || 0), 0);

  return [
    {
      id: "first_cut",
      title: "First Cut",
      icon: "🪵",
      desc: "Created your first workbench project",
      unlocked: totalProjects >= 1,
      progress: `${Math.min(totalProjects, 1)}/1`
    },
    {
      id: "in_zone",
      title: "In the Zone",
      icon: "⏱️",
      desc: "Logged your first practice session or timer",
      unlocked: practiceCount >= 1 || totalMinutes > 0,
      progress: `${practiceCount > 0 || totalMinutes > 0 ? 1 : 0}/1`
    },
    {
      id: "finisher",
      title: "Finisher",
      icon: "🎯",
      desc: "Completed your first project",
      unlocked: completedProjects >= 1,
      progress: `${Math.min(completedProjects, 1)}/1`
    },
    {
      id: "renaissance",
      title: "Renaissance Maker",
      icon: "📚",
      desc: "Practiced 3 or more distinct skills",
      unlocked: distinctSkills >= 3,
      progress: `${Math.min(distinctSkills, 3)}/3`
    },
    {
      id: "centurion",
      title: "Centurion",
      icon: "⚡",
      desc: "Logged 100+ minutes of project work",
      unlocked: totalMinutes >= 100,
      progress: `${Math.min(totalMinutes, 100)}/100m`
    },
    {
      id: "master_builder",
      title: "Master Builder",
      icon: "🏗️",
      desc: "Completed 3 or more full projects",
      unlocked: completedProjects >= 3,
      progress: `${Math.min(completedProjects, 3)}/3`
    },
    {
      id: "documentarian",
      title: "Documentarian",
      icon: "📷",
      desc: "Attached 5 or more build photos",
      unlocked: totalPhotos >= 5,
      progress: `${Math.min(totalPhotos, 5)}/5`
    },
    {
      id: "stocked_shop",
      title: "Stocked Shop",
      icon: "📦",
      desc: "Saved 3 or more workshop inventory items",
      unlocked: inventoryCount >= 3,
      progress: `${Math.min(inventoryCount, 3)}/3`
    },
    {
      id: "consistency",
      title: "Consistency",
      icon: "🔥",
      desc: "Logged 3 practice sessions in the past 7 days",
      unlocked: recentPractice >= 3,
      progress: `${Math.min(recentPractice, 3)}/3`
    },
    {
      id: "night_owl",
      title: "Night Owl",
      icon: "🌙",
      desc: "Logged project work or journal notes after 9:00 PM",
      unlocked: hasNightWork,
      progress: hasNightWork ? "1/1" : "0/1"
    },
    {
      id: "early_bird",
      title: "Early Bird",
      icon: "🌅",
      desc: "Logged workshop practice or notes before 8:00 AM",
      unlocked: hasEarlyWork,
      progress: hasEarlyWork ? "1/1" : "0/1"
    },
    {
      id: "marathoner",
      title: "Marathon Maker",
      icon: "🏃",
      desc: "Logged 60+ minutes in a single practice session",
      unlocked: maxSingleSession >= 60,
      progress: `${Math.min(maxSingleSession, 60)}/60m`
    },
    {
      id: "skill_specialist",
      title: "Skill Specialist",
      icon: "⭐",
      desc: "Reached Level 3 (100+ XP) in any skill",
      unlocked: maxSkillXp >= 100,
      progress: `${Math.min(maxSkillXp, 100)}/100 XP`
    },
    {
      id: "grandmaster",
      title: "Grandmaster",
      icon: "🏆",
      desc: "Reached Level 5 (300+ XP) in any skill",
      unlocked: maxSkillXp >= 300,
      progress: `${Math.min(maxSkillXp, 300)}/300 XP`
    },
    {
      id: "polymath",
      title: "Polymath",
      icon: "🎨",
      desc: "Practiced 5 or more distinct skills",
      unlocked: distinctSkills >= 5,
      progress: `${Math.min(distinctSkills, 5)}/5`
    },
    {
      id: "prolific",
      title: "Prolific Maker",
      icon: "🚀",
      desc: "Completed 5 or more full projects",
      unlocked: completedProjects >= 5,
      progress: `${Math.min(completedProjects, 5)}/5`
    },
    {
      id: "master_photo",
      title: "Master Photographer",
      icon: "📸",
      desc: "Attached 10 or more build photos across projects",
      unlocked: totalPhotos >= 10,
      progress: `${Math.min(totalPhotos, 10)}/10`
    },
    {
      id: "detail_oriented",
      title: "Detail Oriented",
      icon: "📋",
      desc: "Completed all steps on a project with 5+ checklist tasks",
      unlocked: hasDetailedChecklist,
      progress: hasDetailedChecklist ? "1/1" : "0/1"
    },
    {
      id: "shop_curator",
      title: "Shop Curator",
      icon: "🧰",
      desc: "Cataloged 6 or more tools or materials in inventory",
      unlocked: inventoryCount >= 6,
      progress: `${Math.min(inventoryCount, 6)}/6`
    },
    {
      id: "streak_master",
      title: "Habit of Craft",
      icon: "🔥",
      desc: "Logged 5 or more practice sessions in the past 7 days",
      unlocked: recentPractice >= 5,
      progress: `${Math.min(recentPractice, 5)}/5`
    },
    {
      id: "bom_master",
      title: "BOM Master",
      icon: "🧾",
      desc: "Tracked materials and budget on 2 or more projects",
      unlocked: projectsWithMaterials >= 2,
      progress: `${Math.min(projectsWithMaterials, 2)}/2`
    },
    {
      id: "chronicler",
      title: "Chronicler",
      icon: "✍️",
      desc: "Written 5 or more progress journal notes",
      unlocked: totalNotes >= 5,
      progress: `${Math.min(totalNotes, 5)}/5`
    },
    {
      id: "deep_flow",
      title: "Deep Flow",
      icon: "🍅",
      desc: "Completed 4 or more Pomodoro focus sessions",
      unlocked: (timer.completedCycles || 0) >= 4,
      progress: `${Math.min(timer.completedCycles || 0, 4)}/4`
    },
    {
      id: "goal_crusher",
      title: "Milestone Master",
      icon: "🎖️",
      desc: "Completed all roadmap steps of a maker goal challenge",
      unlocked: (state.makerGoals || []).some(g => (g.milestones || []).length > 0 && g.milestones.every(m => m.done)),
      progress: (state.makerGoals || []).some(g => (g.milestones || []).length > 0 && g.milestones.every(m => m.done)) ? "1/1" : "0/1"
    },
    {
      id: "budget_master",
      title: "Budget Master",
      icon: "💰",
      desc: "Completed a project with a set target budget",
      unlocked: state.projects.some(p => p.status === "completed" && Number(p.budget) > 0),
      progress: state.projects.some(p => p.status === "completed" && Number(p.budget) > 0) ? "1/1" : "0/1"
    }
  ];
}

function renderAchievements() {
  const achievements = computeAchievements();
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const isCollapsed = isPanelCollapsed("achievements");

  const markup = `
    <div class="panel achievements-panel ${isCollapsed ? "is-collapsed" : ""}" style="margin-bottom:20px" id="panel-achievements">
      <div class="panel-heading" style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div class="eyebrow">MAKER JOURNEY</div>
          <h2>Milestones &amp; Badges (${unlockedCount}/${achievements.length}) ${isCollapsed ? `<span style="font-size:12px;font-weight:400;color:var(--muted);margin-left:6px">(Minimized)</span>` : ""}</h2>
        </div>
        <button type="button" class="panel-collapse-btn" data-action="toggle-panel-collapse" data-panel="achievements" title="${isCollapsed ? "Expand panel" : "Minimize panel"}">
          ${isCollapsed ? "＋ Expand" : "− Minimize"}
        </button>
      </div>
      ${!isCollapsed ? `
        <div class="achievements-grid">
          ${achievements.map(a => `
            <div class="achievement-card ${a.unlocked ? "unlocked" : "locked"}" title="${escapeHTML(a.desc)}">
              <div class="achievement-icon">${a.icon}</div>
              <div class="achievement-info">
                <strong class="achievement-title">${escapeHTML(a.title)}</strong>
                <p class="achievement-desc">${escapeHTML(a.desc)}</p>
                <span class="achievement-progress">${a.unlocked ? "✓ Unlocked" : a.progress}</span>
              </div>
            </div>
          `).join("")}
        </div>
      ` : ""}
    </div>
  `;

  const overviewContainer = $("#overview-achievements");
  if (overviewContainer) overviewContainer.innerHTML = markup;

  const skillsContainer = $("#skills-achievements");
  if (skillsContainer) skillsContainer.innerHTML = markup;

  checkNewBadgeUnlocks(achievements);
}

/* 🎯 Weekly Practice Goals */
function renderWeeklyGoal() {
  const container = $("#skills-weekly-goal");
  if (!container) return;

  const goal = state.weeklyGoal || 60;

  const now = new Date();
  const day = now.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  let weekMinutes = 0;
  for (const log of (state.practiceLog || [])) {
    const logDate = new Date(log.at);
    if (logDate >= monday) {
      const match = (log.text || "").match(/·\s*(\d+)m/);
      if (match) {
        weekMinutes += parseInt(match[1], 10);
      } else {
        weekMinutes += 15;
      }
    }
  }

  const pct = Math.min(100, Math.round((weekMinutes / goal) * 100));
  const met = weekMinutes >= goal;

  container.innerHTML = `
    <div class="weekly-goal-card ${met ? "is-goal-met" : ""}">
      <div class="weekly-goal-head">
        <div>
          <span class="weekly-goal-eyebrow">THIS WEEK'S TARGET</span>
          <h3 class="weekly-goal-title">${met ? "🎉 Goal Reached!" : "Weekly Practice Target"}</h3>
        </div>
        <button type="button" class="small-action" data-action="set-weekly-goal">Target: ${goal}m ✎</button>
      </div>
      <div class="weekly-goal-bar-wrap">
        <div class="progress-track"><div class="progress-bar" style="width:${pct}%"></div></div>
      </div>
      <div class="weekly-goal-footer">
        <span><strong>${weekMinutes}m</strong> logged this week</span>
        <span>${pct}% of ${goal}m goal</span>
      </div>
    </div>
  `;
}

async function setWeeklyPracticeGoal() {
  const current = state.weeklyGoal || 60;
  const input = window.prompt("Set weekly practice target in minutes (e.g. 30, 60, 120, 300):", String(current));
  if (!input) return;

  const mins = parseInt(input, 10);
  if (!mins || mins <= 0) return;

  state.weeklyGoal = mins;
  try {
    await persistState();
    renderWeeklyGoal();
    showToast(`Weekly practice goal set to ${mins} minutes!`);
  } catch (e) {
    console.error(e);
  }
}

async function renderAdminHub() {
  const adminView = $("#admin-view");
  if (!adminView) return;

  const user = getActiveUser();
  if (!isCurrentUserAdmin()) {
    const grid = $("#admin-users-grid");
    if (grid) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state-icon">🔒</div>
          <h3>Admin Access Required</h3>
          <p>You must be signed in with an administrator account to view the shop admin console.</p>
          <button type="button" class="button button-primary" data-action="open-auth-modal" data-tab="signin" style="margin-top:12px">Sign in as Admin</button>
        </div>`;
    }
    if ($("#admin-stat-users")) $("#admin-stat-users").textContent = "0";
    if ($("#admin-stat-projects")) $("#admin-stat-projects").textContent = "0";
    if ($("#admin-stat-hours")) $("#admin-stat-hours").textContent = "0h";
    if ($("#admin-stat-active")) $("#admin-stat-active").textContent = "0";
    if ($("#admin-user-count")) $("#admin-user-count").textContent = "";
    return;
  }

  let makers = [];
  try {
    const workspaceMap = new Map();
    try {
      const workspaces = await cloudRequest(`/rest/v1/${CLOUD_TABLE}?select=user_id,updated_at,data`);
      if (Array.isArray(workspaces)) {
        for (const row of workspaces) {
          if (row.user_id) workspaceMap.set(row.user_id, row);
        }
      }
    } catch (e) {
      console.warn("Could not fetch remote workspaces list:", e);
    }

    const profileMap = new Map();
    try {
      const profiles = await cloudRequest("/rest/v1/workbench_profiles?select=*");
      if (Array.isArray(profiles)) {
        for (const p of profiles) {
          if (p.id) profileMap.set(p.id, p);
        }
      }
    } catch (e) {
      // profiles table might not be created yet
    }

    const localMap = await getLocallyKnownUsers();
    const allUserIds = new Set([...workspaceMap.keys(), ...profileMap.keys(), ...localMap.keys()]);
    if (user.id) allUserIds.add(user.id);

    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    makers = Array.from(allUserIds).map(uid => {
      const p = profileMap.get(uid);
      const ws = workspaceMap.get(uid);
      const loc = localMap.get(uid);
      const wsOwner = ws?.data?.owner;

      const email = p?.email || wsOwner?.email || loc?.email || (uid === user.id ? user.email : "");
      const displayName = p?.display_name || wsOwner?.displayName || wsOwner?.display_name || loc?.displayName || (uid === user.id ? user.displayName : (email ? email.split("@")[0] : "Maker"));
      const isPrimaryUser = (uid === getPrimaryAdminId()) || Boolean(p?.is_primary || wsOwner?.is_primary || loc?.isPrimary);
      let role = p?.role || wsOwner?.role || loc?.role || (uid === user.id ? user.role : "maker");
      if (isPrimaryUser) role = "admin";

      let projects = ws?.data?.projects || loc?.projects || (uid === user.id ? state.projects : []);
      let skills = ws?.data?.skills || loc?.skills || (uid === user.id ? state.skills : []);


      const totalMinutes = projects.reduce((sum, pr) => sum + (pr.timeSpent || 0), 0);
      const hours = Math.round((totalMinutes / 60) * 10) / 10;
      const updatedAt = ws?.updated_at || p?.updated_at || loc?.updatedAt || (uid === user.id ? state.updatedAt : null);
      const isActiveWeek = updatedAt ? (now - new Date(updatedAt).getTime() < sevenDaysMs) : (uid === user.id);

      return {
        id: uid,
        displayName,
        email: email || "Registered Maker",
        role,
        isPrimary: isPrimaryUser,
        projectCount: projects.length,
        hours,
        skillCount: skills.length,
        updatedAt,
        isActiveWeek,
        isSelf: uid === user.id
      };
    });

  } catch (err) {
    console.warn("Falling back to active user for admin console:", err);
    makers = [{
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      projectCount: state.projects.length,
      hours: Math.round((state.projects.reduce((s, p) => s + (p.timeSpent || 0), 0) / 60) * 10) / 10,
      skillCount: state.skills.length,
      updatedAt: state.updatedAt,
      isActiveWeek: true,
      isSelf: true
    }];
  }

  const totalUsers = makers.length;
  const totalProjects = makers.reduce((sum, m) => sum + m.projectCount, 0);
  const totalHours = Math.round(makers.reduce((sum, m) => sum + m.hours, 0));
  const activeThisWeek = makers.filter(m => m.isActiveWeek).length;

  if ($("#admin-stat-users")) $("#admin-stat-users").textContent = totalUsers;
  if ($("#admin-stat-projects")) $("#admin-stat-projects").textContent = totalProjects;
  if ($("#admin-stat-hours")) $("#admin-stat-hours").textContent = `${totalHours}h`;
  if ($("#admin-stat-active")) $("#admin-stat-active").textContent = activeThisWeek;

  const searchQuery = ($("#admin-user-search")?.value || "").toLowerCase().trim();
  const roleFilter = $("#admin-role-filter")?.value || "all";

  const filteredMakers = makers.filter(m => {
    if (roleFilter !== "all" && m.role !== roleFilter) return false;
    if (searchQuery) {
      const match = m.displayName.toLowerCase().includes(searchQuery) ||
                    m.email.toLowerCase().includes(searchQuery) ||
                    m.role.toLowerCase().includes(searchQuery);
      if (!match) return false;
    }
    return true;
  });

  const countEl = $("#admin-user-count");
  if (countEl) countEl.textContent = `Showing ${filteredMakers.length} of ${makers.length} makers`;

  const grid = $("#admin-users-grid");
  if (!grid) return;

  if (filteredMakers.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">🔍</div>
        <h3>No makers found</h3>
        <p>No makers matched your search or role filter.</p>
      </div>`;
    return;
  }

  grid.innerHTML = filteredMakers.map(m => {
    const initial = (m.displayName || m.email || "M")[0].toUpperCase();
    const lastActiveStr = m.updatedAt ? relativeTime(m.updatedAt) : "Never synced";
    const nextRole = m.role === "admin" ? "maker" : "admin";
    const nextRoleLabel = m.role === "admin" ? "Demote to Maker" : "Promote to Admin";

    const isPrimaryOwner = m.id === getPrimaryAdminId();
    const isProtectedAdmin = m.role === "admin" && isPrimaryOwner;
    const avatarIcon = isPrimaryOwner ? "👑" : (m.role === "admin" ? "⭐" : initial);
    return `
      <div class="admin-user-card" data-user-id="${m.id}">
        <div class="admin-user-header">
          <div class="admin-user-avatar" style="${m.role === "admin" ? "background:#d69e2e" : ""}">${avatarIcon}</div>
          <div class="admin-user-meta">
            <h4>${escapeHTML(m.displayName)} ${m.isSelf ? '<span style="font-size:11px;color:var(--muted)">(You)</span>' : ''} ${isPrimaryOwner ? '<span style="font-size:11px;color:#d69e2e;font-weight:600">👑 Shop Owner</span>' : ''}</h4>
            <span class="admin-user-email">${escapeHTML(m.email)}</span>
            <div style="margin-top:4px">
              <span class="role-pill role-${m.role}">${isPrimaryOwner ? "Shop Owner (Admin)" : (m.role === "admin" ? "Shop Admin" : "Maker")}</span>
              ${m.isActiveWeek ? '<span style="font-size:11px;color:#38a169;margin-left:6px;font-weight:600">● active recently</span>' : ''}
            </div>
          </div>
        </div>
        <div class="admin-user-stats">
          <div class="admin-stat-item">
            <strong>${m.projectCount}</strong>
            <span>Projects</span>
          </div>
          <div class="admin-stat-item">
            <strong>${m.hours}h</strong>
            <span>Time</span>
          </div>
          <div class="admin-stat-item">
            <strong>${m.skillCount}</strong>
            <span>Skills</span>
          </div>
        </div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:12px">
          Last active: <strong>${lastActiveStr}</strong>
        </div>
        <div class="admin-user-actions">
          <button type="button" class="button button-small button-outline" data-action="inspect-user-workbench" data-user-id="${m.id}" data-user-name="${escapeHTML(m.displayName)}">
            👁️ Inspect Workbench
          </button>
          ${isProtectedAdmin
            ? `<span style="font-size:11px;font-weight:600;color:#d69e2e;padding:6px 10px;background:rgba(214,158,46,0.12);border-radius:6px;border:1px solid rgba(214,158,46,0.3)">🔒 Shop Owner (Immutable)</span>`
            : `<button type="button" class="button button-small button-outline" data-action="admin-toggle-role" data-user-id="${m.id}" data-current-role="${m.role}">
                ${m.role === "admin" ? "👤 Demote to Maker" : "👑 Promote to Admin"}
              </button>`
          }
        </div>
      </div>
    `;
  }).join("");
}

async function inspectUserWorkbench(targetUserId, targetUserName) {
  if (!isCurrentUserAdmin()) {
    showToast("Admin access required to inspect other workbenches.");
    return;
  }

  try {
    showToast(`Loading ${targetUserName}'s workbench…`);
    let remote = null;
    try {
      remote = await getRemoteWorkspace(targetUserId);
    } catch {}

    if (!remote || !remote.data) {
      // Check local IndexedDB fallback
      const localState = await readSavedState(`workbench_state_${targetUserId}`).catch(() => null);
      if (localState) {
        remote = { data: localState, updated_at: localState.updatedAt || new Date().toISOString() };
      }
    }

    if (!remote || !remote.data) {
      showToast(`No workbench data found for ${targetUserName} yet.`);
      return;
    }


    if (!adminInspectionActive) {
      adminInspectionBackup = structuredClone(state);
    }

    adminInspectionActive = true;
    adminInspectedUserName = targetUserName || "Maker";
    await loadRemoteWorkspace(remote);

    const banner = $("#admin-inspect-banner");
    if (banner) {
      $("#inspect-user-name").textContent = adminInspectedUserName;
      banner.style.display = "flex";
    }

    render();
    switchView("projects");
    showToast(`Viewing ${adminInspectedUserName}'s workbench in Read-Only mode.`);
  } catch (err) {
    console.error("Failed to inspect workbench:", err);
    showToast(err.message || "Could not load that workbench.");
  }
}

async function exitInspectionMode() {
  if (adminInspectionBackup) {
    state.projects = adminInspectionBackup.projects || [];
    state.skills = adminInspectionBackup.skills || [];
    state.activity = adminInspectionBackup.activity || [];
    state.practiceLog = adminInspectionBackup.practiceLog || [];
    state.inventory = adminInspectionBackup.inventory || [];
    state.customTemplates = adminInspectionBackup.customTemplates || [];
    state.makerGoals = adminInspectionBackup.makerGoals || [];
    state.maintenance = adminInspectionBackup.maintenance || [];
    state.weeklyGoal = adminInspectionBackup.weeklyGoal || 60;
    state.updatedAt = adminInspectionBackup.updatedAt || "";
    adminInspectionBackup = null;
  } else {
    await loadUserScopedState();
  }

  adminInspectionActive = false;
  adminInspectedUserName = "";

  const banner = $("#admin-inspect-banner");
  if (banner) banner.style.display = "none";

  render();
  switchView("admin");
  showToast("Exited inspection mode. Returned to your workbench.");
}

async function adminToggleUserRole(userId, currentRole) {
  const nextRole = currentRole === "admin" ? "maker" : "admin";
  const user = getActiveUser();
  if (!isCurrentUserAdmin()) {
    showToast("Admin privileges required.");
    return;
  }

  const primaryAdminId = getPrimaryAdminId();
  if (userId === primaryAdminId && currentRole === "admin") {
    showToast("The Shop Owner status is permanent and immutable.");
    return;
  }

  try {
    try {
      await cloudRequest(`/rest/v1/workbench_profiles?id=eq.${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole, updated_at: new Date().toISOString() })
      });
    } catch (e) {
      console.warn("Could not patch workbench_profiles table directly", e);
    }

    try {
      const wsRow = await getRemoteWorkspace(userId);
      if (wsRow?.data?.owner) {
        wsRow.data.owner.role = nextRole;
        await cloudRequest(`/rest/v1/${CLOUD_TABLE}?user_id=eq.${encodeURIComponent(userId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: wsRow.data, updated_at: new Date().toISOString() })
        });
      }
    } catch {}

    try {
      const raw = localStorage.getItem("workbench_known_makers");
      if (raw) {
        const list = JSON.parse(raw);
        const targetMaker = list.find(m => m.id === userId);
        if (targetMaker) {
          targetMaker.role = nextRole;
          localStorage.setItem("workbench_known_makers", JSON.stringify(list));
        }
      }
    } catch {}

    if (userId === user.id) {
      const session = getCloudSession();
      if (session?.user) {
        session.user.user_metadata = session.user.user_metadata || {};
        session.user.user_metadata.role = nextRole;
        setCloudSession(session);
        const cached = getCachedUserProfile(userId) || {};
        localStorage.setItem(CURRENT_PROFILE_STORAGE_KEY, JSON.stringify({ ...cached, role: nextRole }));
        updateUserUI();
      }
    }

    showToast(`Role updated to ${nextRole}!`);
    await renderAdminHub();
  } catch (err) {
    console.error("Could not toggle user role:", err);
    showToast(err.message || "Failed to update user role.");
  }
}


async function handleAction(action, target) {
  const id = target.dataset.id;
  if (action === "open-activity-detail") {
    openActivityDetail(id || target.dataset.id);
    return;
  }
  if (action === "open-day-summary") {
    openDaySummaryDialog(target.dataset.date);
    return;
  }
  if (action === "return-project-to-creator") {
    void returnProjectToCreator(target.dataset.project || id);
    return;
  }
  if (adminInspectionActive) {
    const blockedActions = [
      "new-project", "edit-project", "delete-project", "archive-project", "save-project",
      "new-skill", "edit-skill", "delete-skill", "delete-xp",
      "toggle-task", "delete-task", "move-task-up", "move-task-down", "edit-task",
      "dictate-task", "add-task", "pick-from-inventory", "add-material",
      "delete-material", "add-journal", "delete-journal",
      "add-co-creator", "remove-co-creator", "toggle-co-creator-role", "pass-creator-status",
      "save-inventory", "delete-inventory", "save-maintenance", "delete-maintenance"
    ];
    if (blockedActions.includes(action)) {
      showToast("🔒 Read-Only Inspection: Modifying another user's workbench is disabled.", "warning");
      return;
    }
  }
  if (action === "open-auth-modal") {
    openAuthModal(target.dataset.tab || "signin");
    return;
  }
  if (action === "switch-auth-tab") {
    switchAuthTab(target.dataset.tab || "signin");
    return;
  }
  if (action === "open-user-menu") {
    openUserMenuModal();
    return;
  }
  if (action === "open-notifications") {
    openNotificationsModal();
    return;
  }
  if (action === "mark-notifications-read") {
    markAllNotificationsRead();
    return;
  }
  if (action === "clear-notifications") {
    clearAllNotifications();
    return;
  }
  if (action === "toggle-panel-collapse") {
    const pid = target.dataset.panel;
    if (pid) togglePanelCollapse(pid);
    return;
  }
  if (action === "auth-forgot-password") {
    const email = $("#signin-email")?.value;
    if (!email) {
      showAuthAlert("Please enter your email address in the field above first.", "error");
      return;
    }
    try {
      await sendPasswordRecovery(email);
    } catch (e) {
      showAuthAlert(e.message || "Could not send password recovery.", "error");
    }
    return;
  }
  if (action === "auth-sign-out" || action === "sign-out") {
    await signOutUser();
    return;
  }
  if (action === "claim-primary-admin") {
    await claimPrimaryAdmin();
    return;
  }
  if (action === "switch-profile-tab") {
    switchProfileTab(target.dataset.tab || "account");
    return;
  }
  if (action === "save-profile-name") {
    await saveProfileName();
    return;
  }
  if (action === "save-profile-email") {
    await saveProfileEmail();
    return;
  }
  if (action === "save-profile-password") {
    await saveProfilePassword();
    return;
  }
  if (action === "save-profile-preferences") {
    await saveProfilePreferences();
    return;
  }
  if (action === "recover-owner-workspace") {
    await recoverOwnerWorkspace();
    return;
  }
  if (action === "profile-send-recovery") {
    await profileSendRecovery();
    return;
  }
  if (action === "go-to-admin") {
    $("#user-menu-dialog")?.close();
    switchView("admin");
    return;
  }
  if (action === "inspect-user-workbench") {
    const uid = target.dataset.userId;
    const uname = target.dataset.userName;
    if (uid) void inspectUserWorkbench(uid, uname);
    return;
  }
  if (action === "exit-inspection") {
    void exitInspectionMode();
    return;
  }
  if (action === "admin-toggle-role") {
    const uid = target.dataset.userId;
    const currentRole = target.dataset.currentRole;
    if (uid && currentRole) void adminToggleUserRole(uid, currentRole);
    return;
  }
  if (action === "open-admin-create-user") {
    $("#admin-create-user-dialog")?.showModal();
    return;
  }
  if (action === "open-invite-modal") {
    void openInviteModal();
    return;
  }
  if (action === "copy-dialog-invite" || action === "copy-invite-link") {
    void copyInviteLinkToClipboard(target);
    return;
  }
  if (action === "copy-team-link") {
    void copyTeamProjectLink(target.dataset.project, target);
    return;
  }
  if (action === "open-about-modal") {
    $("#about-dialog")?.showModal();
    return;
  }
  if (action === "open-terms-modal") {
    $("#terms-dialog")?.showModal();
    return;
  }
  if (action === "open-privacy-modal") {
    $("#privacy-dialog")?.showModal();
    return;
  }
  if (action === "scroll-to-top") {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  if (action === "switch-to-admin-or-login") {
    const curUser = getActiveUser();
    if (curUser && (curUser.role === "admin" || curUser.id === getPrimaryAdminId())) {
      switchView("admin");
    } else {
      openAuthModal("signin");
    }
    return;
  }
  if (action === "github-auth" || action === "github-sign-in") {
    try {
      await beginGitHubSignIn();
    } catch (e) {
      showAuthAlert(e.message || "Could not start GitHub sign-in.", "error");
    }
    return;
  }
  if (action === "set-project-mode") {
    setProjectViewMode(target.dataset.mode);
    return;
  }
  if (action === "open-project-qr") {
    openProjectQR(id || target.dataset.project);
    return;
  }
  if (action === "print-qr-label") {
    printQRLabel();
    return;
  }
  if (action === "run-cut-optimizer") {
    runCutListOptimizer();
    return;
  }
  if (action === "copy-cut-plan") {
    copyCutPlan();
    return;
  }
  if (action === "add-offcut-to-inventory") {
    openInventoryDialog({
      name: `${target.dataset.length}" Offcut Stock`,
      category: "Lumber / Scrap",
      quantity: 1,
      unit: "piece",
      notes: target.dataset.notes || ""
    });
    return;
  }
  if (action === "copy-shopping-list") {
    copyShoppingList();
    return;
  }
  if (action === "shopping-toggle-item") {
    const project = state.projects.find(p => p.id === target.dataset.project);
    const material = project?.materials?.find(m => m.id === target.dataset.material);
    if (project && material) {
      material.status = target.checked ? "have" : "need";
      project.updatedAt = new Date().toISOString();
      if (material.status === "have") {
        makeActivity("note", `Acquired ${material.name} for ${project.title}`);
      }
      try {
        await persistState();
        render();
        if ($("#detail-dialog").open) renderProjectDetail(project.id);
        showToast(material.status === "have" ? `Marked ${material.name} as in hand!` : `Marked ${material.name} as needed.`);
      } catch (e) {
        console.error(e);
      }
    }
    return;
  }
  if (action === "open-inventory-dialog") {
    openInventoryDialog(id ? (state.inventory || []).find(i => i.id === id) : null);
    return;
  }
  if (action === "edit-inventory-item") {
    const item = (state.inventory || []).find(i => i.id === id);
    if (item) openInventoryDialog(item);
    return;
  }
  if (action === "delete-inventory-item") {
    const deleteId = id || $("#inventory-form input[name='id']")?.value;
    if (deleteId) void deleteInventoryItem(deleteId);
    return;
  }
  if (action === "inventory-bump") {
    void handleInventoryBump(id, parseInt(target.dataset.delta, 10) || 0);
    return;
  }
  if (action === "pick-from-inventory") {
    openInventoryPickDialog(id);
    return;
  }
  if (action === "add-inventory-to-project") {
    void pickInventoryForProject(target.dataset.project, target.dataset.inventory);
    return;
  }
  if (action === "open-compare-photos") {
    openComparePhotos(id || target.dataset.project);
    return;
  }
  if (action === "open-project-dossier") {
    openProjectDossier(id || target.dataset.project);
    return;
  }
  if (action === "print-dossier") {
    printDossier();
    return;
  }
  if (action === "save-project-template") {
    openSaveTemplateDialog(id || target.dataset.project);
    return;
  }
  if (action === "annotate-photo") {
    openAnnotateDialog(target.dataset.imageId);
    return;
  }
  if (action === "annotate-current-photo") {
    const currentImgId = $("#lightbox-img")?.dataset.imageId;
    if (currentImgId) {
      $("#lightbox-dialog")?.close();
      openAnnotateDialog(currentImgId);
    }
    return;
  }
  if (action === "annotate-undo") {
    undoAnnotation();
    return;
  }
  if (action === "annotate-clear") {
    clearAnnotation();
    return;
  }
  if (action === "save-annotation") {
    void saveAnnotatedPhoto();
    return;
  }
  if (action === "dictate-task") {
    toggleSpeechDictation(target, $("#task-input"));
    return;
  }
  if (action === "dictate-note") {
    toggleSpeechDictation(target, $("#journal-entry"));
    return;
  }
  if (action === "dictate-practice") {
    toggleSpeechDictation(target, $("#xp-form textarea[name='text']"));
    return;
  }
  if (action === "set-weekly-goal") {
    void setWeeklyPracticeGoal();
    return;
  }
  if (action === "toggle-pin") {
    const project = state.projects.find(item => item.id === (target.dataset.project || id));
    if (!project) return;
    project.pinned = !project.pinned;
    project.updatedAt = new Date().toISOString();
    try {
      await persistState();
      render();
      if ($("#detail-dialog").open) renderProjectDetail(project.id);
      showToast(project.pinned ? `Pinned “${project.title}” to top.` : `Unpinned “${project.title}”.`);
    } catch (e) {
      console.error(e);
    }
    return;
  }
  if (action === "print-project") {
    window.print();
    return;
  }
  if (action === "cycle-material-status") {
    const project = state.projects.find(item => item.id === target.dataset.project);
    const material = project?.materials?.find(item => item.id === id);
    if (!project || !material) return;
    const nextStatus = { need: "ordered", ordered: "have", have: "need" };
    material.status = nextStatus[material.status] || "need";
    project.updatedAt = new Date().toISOString();
    try {
      await persistState();
      render();
      renderProjectDetail(project.id);
      const statusLabel = { need: "Need to buy", ordered: "Ordered", have: "Have / In stock" }[material.status];
      showToast(`Marked ${material.name} as “${statusLabel}”.`);
    } catch (error) {
      console.error(error);
    }
    return;
  }
  if (action === "delete-material") {
    const project = state.projects.find(item => item.id === target.dataset.project);
    if (!project || !project.materials) return;
    const index = project.materials.findIndex(item => item.id === id);
    if (index < 0) return;
    const [removed] = project.materials.splice(index, 1);
    project.updatedAt = new Date().toISOString();
    try {
      await persistState();
      render();
      renderProjectDetail(project.id);
      showToast(`Removed “${removed.name}” from supplies.`);
    } catch (error) {
      project.materials.splice(index, 0, removed);
      console.error(error);
      showToast("Could not remove material.");
    }
    return;
  }
  if (action === "open-tools") {
    openToolsDialog();
    return;
  }
  if (action === "switch-tool-tab") {
    switchToolTab(target.dataset.toolTab);
    return;
  }
  if (action === "load-fraction") {
    const input = $("#tool-calc-fraction");
    if (input) {
      input.value = target.dataset.frac;
      updateFractionCalc("fraction");
    }
    return;
  }
  if (action === "open-time-dialog") {
    openTimeDialog(id || target.dataset.id);
    return;
  }
  if (action === "snap-photo") {
    beginCameraCapture(id || target.dataset.id, target.dataset.folder || null);
    return;
  }
  if (action === "copy-project-summary") {
    const project = state.projects.find(p => p.id === (id || target.dataset.id));
    if (!project) return;
    const progress = projectTaskProgress(project);
    const skills = projectSkillNames(project).map(s => s.name);
    const materials = project.materials || [];
    const totalCost = materials.reduce((sum, m) => sum + (Number(m.cost) || 0), 0);
    const spentCost = materials.filter(m => m.status === "have" || m.status === "ordered").reduce((sum, m) => sum + (Number(m.cost) || 0), 0);

    const summary = [
      `🛠️ **${project.title}** (${STATUS_LABELS[safeStatus(project.status)]} · ${priorityLabel(project.priority)} priority)`,
      project.description ? `\n${project.description}\n` : "",
      `📊 **Progress:** ${progress.completed}/${progress.total} checklist steps (${progress.percent}%)`,
      project.timeSpent ? `⏱️ **Time Invested:** ${formatMinutes(project.timeSpent)}` : "",
      materials.length ? `💰 **Supplies Budget:** $${totalCost.toFixed(2)} ($${spentCost.toFixed(2)} acquired)` : "",
      skills.length ? `🎯 **Skills:** ${skills.join(", ")}` : "",
      project.tags?.length ? `🏷️ **Tags:** ${project.tags.map(t => `#${t}`).join(" ")}` : "",
      project.tasks?.length ? `\n📋 **Checklist:**\n` + project.tasks.map(t => `- [${t.done ? "x" : " "}] ${t.text}`).join("\n") : "",
      `\n_Exported from Workbench Project Journal_`
    ].filter(Boolean).join("\n");

    try {
      await navigator.clipboard.writeText(summary);
      showToast("Copied project summary to clipboard!");
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = summary;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      showToast("Copied project summary to clipboard!");
    }
    return;
  }
  if (action === "filter-tag-all") {
    selectedTagFilters.clear();
    renderProjects();
    return;
  }
  if (action === "filter-tag-toggle") {
    const tag = target.dataset.tag;
    if (selectedTagFilters.has(tag)) selectedTagFilters.delete(tag);
    else selectedTagFilters.add(tag);
    renderProjects();
    return;
  }
  if (action === "toggle-theme") {
    toggleTheme();
    return;
  }
  if (action === "filter-skill-all") {
    selectedSkillFilters.clear();
    renderProjects();
    return;
  }
  if (action === "filter-skill-toggle") {
    const sid = target.dataset.skillId;
    if (selectedSkillFilters.has(sid)) selectedSkillFilters.delete(sid);
    else selectedSkillFilters.add(sid);
    renderProjects();
    return;
  }
  if (action === "timeline-skill-all") {
    selectedTimelineSkillFilters.clear();
    if ($("#timeline-skill-filter")) $("#timeline-skill-filter").value = "all";
    renderTimeline();
    return;
  }
  if (action === "timeline-skill-toggle") {
    const sid = target.dataset.skillId;
    if (selectedTimelineSkillFilters.has(sid)) selectedTimelineSkillFilters.delete(sid);
    else selectedTimelineSkillFilters.add(sid);
    if ($("#timeline-skill-filter")) {
      $("#timeline-skill-filter").value = selectedTimelineSkillFilters.size === 1 ? Array.from(selectedTimelineSkillFilters)[0] : "all";
    }
    renderTimeline();
    return;
  }
  if (action === "open-timer") {
    openTimerDialog({ skillId: target.dataset.id || null, projectId: target.dataset.project || null });
    return;
  }
  if (action === "set-timer") {
    setTimerPreset(Number(target.dataset.minutes || 0));
    return;
  }
  if (action === "set-pomodoro-mode") {
    setPomodoroMode(target.dataset.mode, Number(target.dataset.minutes || 0));
    return;
  }
  if (action === "toggle-timer-sound") {
    toggleTimerSound();
    return;
  }
  if (action === "timer-toggle") {
    toggleTimer();
    return;
  }
  if (action === "timer-reset") {
    resetTimer();
    return;
  }
  if (action === "timer-finish") {
    finishTimer();
    return;
  }
  if (action === "switch-planner-mode") {
    switchPlannerMode(target.dataset.mode);
    return;
  }
  if (action === "calendar-prev") {
    navCalendar(-1);
    return;
  }
  if (action === "calendar-next") {
    navCalendar(1);
    return;
  }
  if (action === "calendar-today") {
    navCalendar(0);
    return;
  }
  if (action === "open-showcase") {
    openProjectShowcase(id || target.dataset.id || target.dataset.project);
    return;
  }
  if (action === "copy-showcase-markdown") {
    copyShowcaseMarkdown();
    return;
  }
  if (action === "print-showcase") {
    printShowcase();
    return;
  }
  if (action === "open-goal-dialog") {
    openGoalDialog();
    return;
  }
  if (action === "edit-goal") {
    const goal = (state.makerGoals || []).find(g => g.id === (id || target.dataset.id));
    if (goal) openGoalDialog(goal);
    return;
  }
  if (action === "delete-goal") {
    const goalId = id || target.dataset.id || $("#goal-form input[name='id']")?.value;
    if (goalId) void deleteGoal(goalId);
    return;
  }
  if (action === "toggle-goal-milestone") {
    const goalId = target.dataset.goal;
    const idx = parseInt(target.dataset.index, 10);
    if (goalId && !isNaN(idx)) void toggleGoalMilestone(goalId, idx);
    return;
  }
  if (action === "open-project-pricing") {
    openProjectPricing(id || target.dataset.id);
    return;
  }
  if (action === "set-pricing-preset") {
    setPricingPreset(target.dataset.preset);
    return;
  }
  if (action === "run-cut-optimizer") {
    runCutOptimizer();
    return;
  }
  if (action === "copy-cut-plan") {
    void copyCutPlan();
    return;
  }
  if (action === "open-maintenance-dialog") {
    openMaintenanceDialog();
    return;
  }
  if (action === "edit-maintenance") {
    openMaintenanceDialog((state.maintenance || []).find(m => m.id === (id || target.dataset.id)));
    return;
  }
  if (action === "delete-maintenance") {
    void deleteMaintenance(id || target.dataset.id || $("#maintenance-form input[name='id']")?.value);
    return;
  }
  if (action === "log-service-today") {
    void logServiceToday(id || target.dataset.id);
    return;
  }
  if (action === "toggle-soundscape") {
    toggleSoundscape(target.dataset.track);
    return;
  }
  if (action === "toggle-soundscape-panel") {
    toggleSoundscapePanel();
    return;
  }
  if (action === "open-project-blueprint") {
    openProjectBlueprint(id || target.dataset.id || target.dataset.project);
    return;
  }
  if (action === "set-blueprint-tool") {
    setBlueprintTool(target.dataset.tool);
    return;
  }
  if (action === "set-blueprint-grid") {
    setBlueprintGrid(target.dataset.grid);
    return;
  }
  if (action === "set-blueprint-color") {
    setBlueprintColor(target.dataset.color);
    return;
  }
  if (action === "blueprint-undo") {
    blueprintUndo();
    return;
  }
  if (action === "blueprint-clear") {
    blueprintClear();
    return;
  }
  if (action === "save-blueprint-to-project") {
    void saveBlueprintToProject();
    return;
  }
  if (action === "open-units-modal") {
    openUnitsModal();
    return;
  }
  if (action === "save-units") {
    void saveUnitsSettings();
    return;
  }
  if (action === "print-formatted-markdown") {
    printFormattedMarkdown(id || target.dataset.id || activeShowcaseProjectId);
    return;
  }
  if (action === "open-collaborators-dialog") {
    openCollaboratorsDialog(id || target.dataset.id || target.dataset.project);
    return;
  }
  if (action === "pass-creator-status") {
    void passCreatorStatus(target.dataset.project, target.dataset.id);
    return;
  }
  if (action === "toggle-co-creator-role") {
    void toggleCoCreatorRole(target.dataset.project, target.dataset.id);
    return;
  }
  if (action === "remove-co-creator") {
    void removeCoCreator(target.dataset.project, target.dataset.id);
    return;
  }
  if (action === "add-co-creator") {
    void handleAddCoCreator(target.dataset.project);
    return;
  }
  if (action === "export-markdown") {
    exportMarkdownJournal();
    return;
  }
  if (action === "open-project-detail") {
    openProjectDetail(id || target.dataset.id);
    return;
  }
  if (action === "delete-xp") {
    const entry = state.practiceLog.find(item => item.id === id);
    if (!entry) return;
    if (!window.confirm(`Delete this logged practice session (“${entry.text}”)? Any XP earned will be deducted.`)) return;
    let xpAmount = entry.xp;
    if (!Number.isFinite(xpAmount)) {
      const match = entry.text.match(/\+(\d+)\s*XP/i);
      xpAmount = match ? parseInt(match[1], 10) : 0;
    }
    const skill = state.skills.find(s => s.id === entry.skillId) || state.skills.find(s => entry.text.startsWith(`${s.name} +`));
    if (skill && xpAmount > 0) {
      skill.xp = Math.max(0, skill.xp - xpAmount);
    }
    state.practiceLog = state.practiceLog.filter(item => item.id !== id);
    state.activity = state.activity.filter(item => item.id !== id);
    try {
      await persistState();
      render();
      showToast("Practice session deleted.");
    } catch (error) {
      console.error("Unable to delete practice session.", error);
      showToast("Could not delete practice session.");
    }
    return;
  }
  if (action === "new-project") openProjectForm();
  if (action === "new-skill") openSkillForm();
  if (action === "show-more-practice") {
    practiceLogLimit += 12;
    renderPracticeLog();
    return;
  }
  if (action === "close-dialog") {
    if (!getActiveUser() && target.closest("#auth-dialog")) {
      return;
    }
    target.closest("dialog")?.close();
    return;
  }
  if (action === "save-cloud-config") {
    const urlInput = $("#cloud-url");
    const keyInput = $("#cloud-key");
    let url = (urlInput?.value || "").trim();
    let key = (keyInput?.value || "").trim();
    if (key === "••••••••••••••••") {
      key = getCloudConfig()?.key || "";
    }
    if (url && !key) {
      const creds = await parseInputOrToken(url);
      if (creds?.url && creds?.key) {
        url = creds.url;
        key = creds.key;
        if (urlInput) urlInput.value = url;
        if (keyInput) keyInput.value = "••••••••••••••••";
      }
    }
    if (!url || !key) {
      cloudMessage("Enter your Supabase project URL and anon key, or paste an encrypted invite token.", "error");
      showToast("Please enter both URL and key, or an invite token.");
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    url = url.replace(/\/+$/, "");
    try {
      const previous = getCloudConfig();
      if (previous?.url !== url || previous?.key !== key) setCloudSession(null);
      setCloudConfig({ url, key });
      if ($("#auth-cloud-url")) $("#auth-cloud-url").value = url;
      if ($("#auth-cloud-key")) $("#auth-cloud-key").value = "••••••••••••••••";
      if (keyInput) keyInput.value = "••••••••••••••••";
      cloudMessage("Connection saved. Sign in or create an account to sync.", "info");
      renderCloudConnection();
      showToast("Cloud connection saved on this browser.");
    } catch (error) {
      console.error("Unable to save cloud connection.", error);
      cloudMessage("Could not save this connection in browser storage.", "error");
    }
    return;
  }
  if (action === "github-sign-in") {
    try {
      await beginGitHubSignIn();
    } catch (error) {
      console.error("Unable to start GitHub sign-in.", error);
      cloudMessage(error.message || "Could not start GitHub sign-in.", "error");
    }
    return;
  }
  if (action === "sign-out") {
    await signOutUser();
    return;
  }
  if (action === "sync-now") {
    await syncCloudWorkspace();
    return;
  }
  if (action === "pull-cloud" || action === "push-cloud") {
    await syncCloudWorkspace(action === "pull-cloud" ? "pull" : "push");
    return;
  }
  if (action === "export-backup") {
    try {
      await exportBackup();
    } catch (error) {
      console.error("Unable to export workspace backup.", error);
      showToast("Could not export the backup. Please try again.");
    }
    return;
  }
  if (action === "import-backup") {
    $("#backup-input").click();
    return;
  }
  if (action === "edit-project") {
    const project = state.projects.find(item => item.id === id);
    if (!project) return;
    $("#detail-dialog").close();
    openProjectForm(project);
  }
  if (action === "edit-skill") {
    const skill = state.skills.find(item => item.id === id);
    if (skill) openSkillForm(skill);
  }
  if (action === "log-xp") {
    const skill = state.skills.find(item => item.id === id);
    if (!skill) return;
    const form = $("#xp-form");
    form.reset();
    form.elements.skillId.value = skill.id;
    $("#xp-dialog").querySelector(".eyebrow").textContent = `PRACTICE MAKES PROGRESS · ${skill.name.toUpperCase()}`;
    $("#xp-dialog").showModal();
  }
  if (action === "delete-skill") {
    const skill = state.skills.find(item => item.id === id);
    if (!skill) return;
    const linkedCount = state.projects.filter(p => (p.skillIds || []).includes(skill.id)).length;
    const confirmMsg = linkedCount > 0
      ? `Delete “${skill.name}”? It is currently linked to ${linkedCount} project${linkedCount === 1 ? "" : "s"}. Those projects will remain, but the skill link will be removed.`
      : `Delete “${skill.name}”? This will remove the skill and its XP progress.`;
    if (!window.confirm(confirmMsg)) return;
    state.skills = state.skills.filter(item => item.id !== id);
    state.projects.forEach(p => {
      p.skillIds = (p.skillIds || []).filter(sid => sid !== id);
    });
    selectedSkillFilters.delete(id);
    selectedTimelineSkillFilters.delete(id);
    makeActivity("skill", `Removed skill ${skill.name}`);
    try {
      await persistState();
      $("#skill-dialog")?.close();
      render();
      showToast(`Skill “${skill.name}” deleted.`);
    } catch (error) {
      console.error("Unable to delete skill.", error);
      showToast("Could not delete skill. Please try again.");
    }
    return;
  }
  if (action === "new-folder") openFolderForm(id);
  if (action === "rename-folder") {
    const project = state.projects.find(item => item.id === target.dataset.project);
    const folder = project?.folders.find(item => item.id === target.dataset.folder);
    if (!folder) return;
    const newName = window.prompt("New folder name:", folder.name)?.trim();
    if (!newName || newName === folder.name) return;
    if (project.folders.some(f => f.id !== folder.id && f.name.toLowerCase() === newName.toLowerCase())) {
      showToast("A folder with that name already exists in this project.");
      return;
    }
    folder.name = newName;
    project.updatedAt = new Date().toISOString();
    try {
      await persistState();
      render();
      renderProjectDetail(project.id);
      showToast(`Folder renamed to “${newName}”.`);
    } catch (error) {
      console.error("Unable to rename folder.", error);
      showToast("Could not rename folder.");
    }
    return;
  }
  if (action === "delete-folder") {
    const project = state.projects.find(item => item.id === target.dataset.project);
    const folderIndex = project?.folders.findIndex(item => item.id === target.dataset.folder);
    if (!project || folderIndex === undefined || folderIndex < 0) return;
    const folder = project.folders[folderIndex];
    if (project.folders.length <= 1) {
      showToast("A project must have at least one folder.");
      return;
    }
    const targetFolder = project.folders.find(f => f.id !== folder.id) || project.folders[0];
    if (!window.confirm(`Delete folder “${folder.name}”? ${folder.images.length ? `Its ${folder.images.length} photo(s) will be moved to “${targetFolder.name}”.` : ""}`)) return;
    if (folder.images.length) {
      targetFolder.images.push(...folder.images);
    }
    project.folders.splice(folderIndex, 1);
    project.updatedAt = new Date().toISOString();
    try {
      await persistState();
      render();
      renderProjectDetail(project.id);
      showToast(`Folder “${folder.name}” deleted.`);
    } catch (error) {
      console.error("Unable to delete folder.", error);
      showToast("Could not delete folder.");
    }
    return;
  }
  if (action === "add-photos") beginPhotoUpload(id, target.dataset.folder || null);
  if (action === "edit-task") {
    const project = state.projects.find(item => item.id === target.dataset.project);
    const task = project?.tasks.find(item => item.id === id);
    if (!project || !task) return;
    const newText = window.prompt("Edit step:", task.text)?.trim();
    if (!newText || newText === task.text) return;
    task.text = newText;
    project.updatedAt = new Date().toISOString();
    try {
      await persistState();
      render();
      renderProjectDetail(project.id);
      showToast("Step updated.");
    } catch (error) {
      console.error("Unable to update step.", error);
      showToast("Could not update step.");
    }
    return;
  }
  if (action === "move-task-up" || action === "move-task-down") {
    const project = state.projects.find(item => item.id === target.dataset.project);
    if (!project) return;
    const index = project.tasks.findIndex(item => item.id === id);
    if (index < 0) return;
    const targetIndex = action === "move-task-up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= project.tasks.length) return;
    const [moved] = project.tasks.splice(index, 1);
    project.tasks.splice(targetIndex, 0, moved);
    project.updatedAt = new Date().toISOString();
    try {
      await persistState();
      render();
      renderProjectDetail(project.id);
    } catch (error) {
      console.error("Unable to reorder task.", error);
    }
    return;
  }
  if (action === "edit-note") {
    const project = state.projects.find(item => item.id === target.dataset.project);
    const note = project?.notes.find(item => item.id === id);
    if (!project || !note) return;
    const newText = window.prompt("Edit progress note:", note.text)?.trim();
    if (!newText || newText === note.text) return;
    note.text = newText;
    project.updatedAt = new Date().toISOString();
    try {
      await persistState();
      render();
      renderProjectDetail(project.id);
      showToast("Progress note updated.");
    } catch (error) {
      console.error("Unable to update progress note.", error);
      showToast("Could not update progress note.");
    }
    return;
  }
  if (action === "open-lightbox") {
    openLightbox(target.dataset.imageId, target.dataset.caption);
    return;
  }
  if (action === "delete-task" || action === "delete-note") {
    const project = state.projects.find(item => item.id === target.dataset.project);
    if (!project) return;
    const collection = action === "delete-task" ? project.tasks : project.notes;
    const index = collection.findIndex(item => item.id === id);
    if (index < 0) return;
    const [removed] = collection.splice(index, 1);
    project.updatedAt = new Date().toISOString();
    try {
      await persistState();
      render();
      renderProjectDetail(project.id);
      showToast(action === "delete-task" ? "Checklist step removed." : "Progress note deleted.");
    } catch (error) {
      collection.splice(index, 0, removed);
      console.error("Unable to remove project progress.", error);
      showToast("Could not remove that update. Please try again.");
    }
    return;
  }
  if (action === "delete-project") {
    const project = state.projects.find(item => item.id === id);
    if (!project || !window.confirm(`Delete “${project.title}” and all its photos? This can’t be undone.`)) return;
    project.folders.forEach(folder => folder.images.forEach(image => releaseImageUrl(image.id)));
    state.projects = state.projects.filter(item => item.id !== id);
    makeActivity("project", `Removed ${project.title}`);
    try {
      await persistState();
      $("#detail-dialog").close();
      activeProjectId = null;
      render();
      showToast("Project deleted.");
    } catch (error) {
      console.error("Unable to delete project.", error);
      showToast("Could not delete the project. Please try again.");
    }
  }
  if (action === "remove-photo") {
    const project = state.projects.find(item => item.id === target.dataset.project);
    const folder = project?.folders.find(item => item.id === target.dataset.folder);
    if (!folder) return;
    releaseImageUrl(target.dataset.image);
    folder.images = folder.images.filter(image => image.id !== target.dataset.image);
    project.updatedAt = new Date().toISOString();
    try {
      await persistState();
      render();
      renderProjectDetail(project.id);
      showToast("Photo removed.");
    } catch (error) {
      console.error("Unable to remove photo.", error);
      showToast("Could not remove that photo. Please try again.");
    }
  }
}

async function initialize() {
  try {
    database = await openDatabase();
    const saved = await readSavedState();
    if (saved) {
      state.projects = Array.isArray(saved.projects) ? saved.projects : [];
      state.skills = Array.isArray(saved.skills) ? saved.skills : [];
      state.activity = Array.isArray(saved.activity) ? saved.activity : [];
      state.practiceLog = Array.isArray(saved.practiceLog)
        ? saved.practiceLog.filter(item => item?.kind === "xp" && typeof item.text === "string")
        : migratePracticeLog(state.activity, state.skills);
      state.starterSkillsAdded = saved.starterSkillsAdded === true;
      state.updatedAt = saved.updatedAt || "";
      state.projects.forEach(project => {
        project.priority = safePriority(project.priority);
        project.tags = Array.isArray(project.tags) ? project.tags.filter(tag => typeof tag === "string") : [];
        project.folders = Array.isArray(project.folders) ? project.folders : [{ id: uid(), name: "General", images: [] }];
        project.folders.forEach(folder => {
          folder.images = Array.isArray(folder.images) ? folder.images : [];
        });
        project.skillIds = Array.isArray(project.skillIds) ? project.skillIds : [];
      });
      state.skills.forEach(skill => { skill.xp = Number.isFinite(skill.xp) ? skill.xp : 0; });
      state.hasUserChanges = saved.hasUserChanges === true || state.projects.length > 0 || state.skills.some(skill => skill.xp > 0);
    }
    state.projects.forEach(project => {
      project.tasks = Array.isArray(project.tasks) ? project.tasks : [];
      project.notes = Array.isArray(project.notes) ? project.notes : [];
      project.materials = Array.isArray(project.materials) ? project.materials : [];
      project.pinned = Boolean(project.pinned);
      project.timeSpent = Number.isFinite(project.timeSpent) ? project.timeSpent : 0;
    });
    state.inventory = Array.isArray(saved?.inventory) ? saved.inventory : [];
    state.customTemplates = Array.isArray(saved?.customTemplates) ? saved.customTemplates : [];
    state.makerGoals = Array.isArray(saved?.makerGoals) ? saved.makerGoals : [];
    state.maintenance = Array.isArray(saved?.maintenance) ? saved.maintenance : [];
    state.weeklyGoal = Number.isFinite(saved?.weeklyGoal) ? saved.weeklyGoal : 60;

    if (!saved?.starterSkillsAdded) {
      state.starterSkillsAdded = true;
      if (!getActiveUser() && (!Array.isArray(state.skills) || state.skills.length === 0)) {
        const existingNames = new Set(state.skills.map(skill => skill.name.trim().toLocaleLowerCase()));
        for (const [name, category] of STARTER_SKILLS) {
          if (existingNames.has(name.toLocaleLowerCase())) continue;
          state.skills.push({ id: uid(), name, category, xp: 0, createdAt: new Date().toISOString() });
        }
        makeActivity("skill", "Added a starter collection of skills to explore");
      }
    }
    await persistState({ syncCloud: false, preserveTimestamp: Boolean(state.updatedAt) });
    applyTheme(getSavedTheme());
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (getSavedTheme() === "auto") applyTheme("auto");
    });
    if ("serviceWorker" in navigator && (window.location.protocol === "http:" || window.location.protocol === "https:")) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && getCloudConfig() && getCloudSession()) {
        void syncCloudWorkspace();
      }
    });
    window.addEventListener("storage", event => {
      if (event.key === CLOUD_SESSION_KEY || event.key === CURRENT_PROFILE_STORAGE_KEY || event.key === PRIMARY_ADMIN_STORAGE_KEY) {
        updateUserUI();
        void loadUserScopedState().then(() => render());
      }
    });
    try {
      await completeGitHubSignIn();
    } catch (error) {
      console.error("Unable to complete GitHub sign-in.", error);
      cloudMessage(error.message || "Could not complete GitHub sign-in.", "error");
    }
    render();
    renderCloudConnection();
    const activeSession = getCloudSession();
    if (activeSession?.user?.id) {
      void syncUserProfile(activeSession.user.id);
    }
    checkInviteOrSetupLink();
    checkHashRouting();
    window.addEventListener("hashchange", checkHashRouting);
    if (getCloudConfig() && getCloudSession()) {
      void syncCloudWorkspace().then(async () => {
        const curUser = getActiveUser();
        const primaryId = getPrimaryAdminId();
        const isOwner = Boolean(curUser?.isPrimary || (curUser && curUser.id === primaryId) || isCurrentUserAdmin() || (curUser?.email && curUser.email.toLowerCase().includes("rakowshik")));
        if (isOwner && (!Array.isArray(state.projects) || state.projects.length === 0)) {
          await recoverOwnerWorkspace({ silent: true });
        }
      });
      setInterval(() => {
        if (getCloudSession() && !document.hidden) void syncCloudWorkspace();
      }, 30_000);
    }
  } catch (error) {
    console.error("Unable to open the local project journal.", error);
    document.body.innerHTML = `<main style="max-width:560px;margin:12vh auto;padding:24px;font:14px sans-serif;color:#242720"><h1>Workbench couldn’t open its local storage.</h1><p>Your browser may be blocking IndexedDB for this page. Try opening it in a regular browser window with site storage enabled.</p><p><strong>Details:</strong> ${escapeHTML(error?.message || "Unknown storage error")}</p></main>`;
  }
}

document.addEventListener("click", event => {
  if (!getActiveUser() && !event.target.closest("#auth-dialog")) {
    event.preventDefault();
    openAuthModal("signin");
    return;
  }
  if (event.target.closest("input, textarea, select, option") && !event.target.closest("[data-action]")) {
    return;
  }
  const tagTarget = event.target.closest(".mini-tag.clickable");
  if (tagTarget) {
    if (tagTarget.dataset.tag) {
      event.preventDefault();
      switchView("projects");
      selectedTagFilters.clear();
      selectedTagFilters.add(tagTarget.dataset.tag);
      renderProjects();
      return;
    }
    if (tagTarget.dataset.skillId) {
      event.preventDefault();
      switchView("projects");
      selectedSkillFilters.clear();
      selectedSkillFilters.add(tagTarget.dataset.skillId);
      renderProjects();
      return;
    }
  }
  const target = event.target.closest("[data-action], [data-view], .project-card[data-project], .project-row[data-project], .planner-row[data-project], .kanban-card[data-project]");
  if (!target) return;
  if (target.dataset.view) {
    event.preventDefault();
    switchView(target.dataset.view);
    return;
  }
  if (target.dataset.action) {
    void handleAction(target.dataset.action, target);
    return;
  }
  if (isDraggingKanbanCard) return;
  if (target.dataset.project && target.matches(".project-card, .project-row, .planner-row, .kanban-card, [role='button']")) {
    if (event.target.closest(".kanban-shift-select, select, button")) return;
    openProjectDetail(target.dataset.project);
    return;
  }
});

document.addEventListener("keydown", event => {
  if (event.target.closest("input, textarea, select")) {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && event.target.matches("textarea#journal-entry")) {
      event.preventDefault();
      event.target.form?.requestSubmit();
    }
    return;
  }
  if (event.key === "Enter" || event.key === " ") {
    const photoTarget = event.target.closest("[data-action='open-lightbox']");
    if (photoTarget) {
      event.preventDefault();
      openLightbox(photoTarget.dataset.imageId, photoTarget.dataset.caption);
      return;
    }
    if (event.target.matches("[data-project][role='button']")) {
      event.preventDefault();
      openProjectDetail(event.target.dataset.project);
      return;
    }
  }
  if (event.key === "Escape") {
    const lightbox = $("#lightbox-dialog");
    if (lightbox && lightbox.open) lightbox.close();
  }
});

$("#project-search").addEventListener("input", renderProjects);
$("#project-status-filter").addEventListener("change", renderProjects);
$("#project-priority-filter")?.addEventListener("change", renderProjects);
$("#project-sort").addEventListener("change", renderProjects);
$("#timeline-search")?.addEventListener("input", renderTimeline);
$("#timeline-type-filter")?.addEventListener("change", renderTimeline);
$("#timeline-project-filter")?.addEventListener("change", renderTimeline);
$("#timeline-skill-filter")?.addEventListener("change", () => {
  const val = $("#timeline-skill-filter").value;
  selectedTimelineSkillFilters.clear();
  if (val !== "all") selectedTimelineSkillFilters.add(val);
  renderTimeline();
});
$("#shopping-search")?.addEventListener("input", renderShoppingList);
$("#shopping-status-filter")?.addEventListener("change", renderShoppingList);
$("#shopping-project-filter")?.addEventListener("change", renderShoppingList);
$("#inventory-search")?.addEventListener("input", renderInventory);
$("#inventory-category-filter")?.addEventListener("change", renderInventory);
$("#inventory-form")?.addEventListener("submit", event => void handleInventorySubmit(event));
$("#template-form")?.addEventListener("submit", event => void handleTemplateSubmit(event));
$("#project-form").addEventListener("submit", event => void handleProjectSubmit(event));
$("#project-template-select")?.addEventListener("change", event => {
  const key = event.target.value;
  const form = $("#project-form");
  const templateHint = $("#project-template-hint");

  if (!key) {
    form.elements.title.value = "";
    form.elements.description.value = "";
    form.elements.status.value = "planned";
    form.elements.priority.value = "normal";
    form.elements.tags.value = "";
    delete form.dataset.templateTasks;
    delete form.dataset.templateMaterials;
    $$('input[name="skillIds"]', form).forEach(cb => { cb.checked = false; });
    if (templateHint) {
      templateHint.textContent = "";
      templateHint.style.display = "none";
    }
    return;
  }

  if (key.startsWith("custom_")) {
    const custId = key.replace("custom_", "");
    const cust = (state.customTemplates || []).find(t => t.id === custId);
    if (cust) {
      form.elements.title.value = cust.name.replace(/ Template$/i, "");
      form.elements.description.value = cust.description || "";
      form.elements.status.value = "planned";
      form.elements.priority.value = "normal";
      form.elements.tags.value = (cust.tags || []).join(", ");
      form.dataset.templateTasks = JSON.stringify(cust.tasks || []);
      form.dataset.templateMaterials = JSON.stringify(cust.materials || []);

      const matchedSkillIds = cust.skillNames?.length
        ? state.skills.filter(s => cust.skillNames.some(name => s.name.toLowerCase() === name.toLowerCase())).map(s => s.id)
        : [];
      $$('input[name="skillIds"]', form).forEach(cb => {
        cb.checked = matchedSkillIds.includes(cb.value);
      });

      if (templateHint) {
        templateHint.textContent = `Includes ${cust.tasks?.length || 0} checklist steps & ${cust.materials?.length || 0} supplies.`;
        templateHint.style.display = "block";
      }
      return;
    }
  }

  const tpl = PROJECT_TEMPLATES[key];
  if (!tpl) return;

  form.elements.title.value = tpl.title;
  form.elements.description.value = tpl.description;
  form.elements.status.value = tpl.status || "in-progress";
  form.elements.priority.value = tpl.priority || "normal";
  form.elements.tags.value = (tpl.tags || []).join(", ");
  form.dataset.templateTasks = JSON.stringify(tpl.tasks || []);
  delete form.dataset.templateMaterials;

  const matchedSkillIds = tpl.skillNames?.length
    ? state.skills.filter(s => tpl.skillNames.some(name => s.name.toLowerCase() === name.toLowerCase())).map(s => s.id)
    : [];
  $$('input[name="skillIds"]', form).forEach(cb => {
    cb.checked = matchedSkillIds.includes(cb.value);
  });

  if (templateHint) {
    templateHint.textContent = `Includes ${tpl.tasks?.length || 0} starter checklist steps (e.g. “${tpl.tasks[0]}”)`;
    templateHint.style.display = "block";
  }
});
$("#skill-form").addEventListener("submit", event => void handleSkillSubmit(event));
$("#xp-form").addEventListener("submit", event => void handleXpSubmit(event));
$("#folder-form").addEventListener("submit", event => void handleFolderSubmit(event));
$("#practice-filter").addEventListener("change", () => {
  practiceLogLimit = 12;
  renderPracticeLog();
});
document.addEventListener("submit", event => void handleProjectEntrySubmit(event));
document.addEventListener("change", event => {
  if (event.target.matches('input[data-action="toggle-task"]')) void handleTaskToggle(event.target);
});
$("#photo-input").addEventListener("change", event => void handlePhotoUpload(event.target.files));
$("#camera-input")?.addEventListener("change", event => void handlePhotoUpload(event.target.files));

$("#timer-project-select")?.addEventListener("change", event => {
  const pid = event.target.value;
  if (!pid) return;
  const project = state.projects.find(p => p.id === pid);
  if (project?.skillIds?.length) {
    const firstSkill = state.skills.find(s => project.skillIds.includes(s.id));
    if (firstSkill && $("#timer-skill-select")) {
      $("#timer-skill-select").value = firstSkill.id;
    }
  }
});

$("#time-preset-select")?.addEventListener("change", event => {
  if (event.target.value) {
    const form = $("#time-form");
    form.elements.minutes.value = event.target.value;
  }
});

$("#time-form")?.addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const projectId = form.elements.projectId.value;
  const project = state.projects.find(p => p.id === projectId);
  if (!project) return;
  const minutes = parseInt(form.elements.minutes.value, 10);
  if (!minutes || minutes <= 0) return;
  const note = form.elements.note.value.trim();
  const awardXp = form.elements.awardXp?.checked;

  project.timeSpent = (project.timeSpent || 0) + minutes;
  const at = new Date().toISOString();
  const noteText = `⏱ Worked for ${formatMinutes(minutes)}${note ? ` · ${note}` : ""}`;
  project.notes.push({ id: uid(), text: noteText, at });
  project.updatedAt = new Date().toISOString();

  makeActivity("note", `Logged ${formatMinutes(minutes)} on ${project.title}`);

  if (awardXp && project.skillIds?.length) {
    let xpAmount = 10;
    if (minutes >= 60) xpAmount = 50;
    else if (minutes >= 30) xpAmount = 25;

    for (const sid of project.skillIds) {
      const skill = state.skills.find(s => s.id === sid);
      if (skill) {
        skill.xp += xpAmount;
        const act = makeActivity("xp", `${skill.name} +${xpAmount} XP · ${formatMinutes(minutes)} on ${project.title}`, { skillId: skill.id, xp: xpAmount });
        state.practiceLog.push(act);
      }
    }
  }

  try {
    await persistState();
    $("#time-dialog").close();
    render();
    if ($("#detail-dialog").open) renderProjectDetail(project.id);
    showToast(`Logged ${formatMinutes(minutes)} to ${project.title}!`);
  } catch (error) {
    console.error("Unable to save project time.", error);
    showToast("Could not log time.");
  }
});

/* Workshop Tools listeners */
$$(".tool-tab-btn").forEach(btn => {
  btn.addEventListener("click", () => switchToolTab(btn.dataset.toolTab));
});
$("#tool-calc-fraction")?.addEventListener("input", () => updateFractionCalc("fraction"));
$("#tool-calc-decimal")?.addEventListener("input", () => updateFractionCalc("decimal"));
$("#tool-calc-mm")?.addEventListener("input", () => updateFractionCalc("mm"));
$("#tool-scale-original")?.addEventListener("input", updateScaleCalc);
$("#tool-scale-preset")?.addEventListener("change", updateScaleCalc);
$("#tool-scale-custom")?.addEventListener("input", updateScaleCalc);
$("#tool-bf-thick")?.addEventListener("input", updateBoardFeetCalc);
$("#tool-bf-width")?.addEventListener("input", updateBoardFeetCalc);
$("#tool-bf-length")?.addEventListener("input", updateBoardFeetCalc);
$("#tool-bf-qty")?.addEventListener("input", updateBoardFeetCalc);
$("#tool-bf-price")?.addEventListener("input", updateBoardFeetCalc);

$("#backup-input").addEventListener("change", async event => {
  const [file] = event.target.files;
  if (!file) return;
  try {
    await importBackup(file);
  } catch (error) {
    console.error("Unable to read workspace backup.", error);
    showToast(error.message || "Could not read that backup file.");
  } finally {
    event.target.value = "";
  }
});
/* Auth modal listeners */
$$(".auth-tab-btn").forEach(btn => {
  btn.addEventListener("click", () => switchAuthTab(btn.dataset.authTab));
});

$("#auth-signin-form")?.addEventListener("submit", async event => {
  event.preventDefault();
  const email = $("#signin-email")?.value || "";
  const pass = $("#signin-password")?.value || "";
  const submitBtn = event.currentTarget.querySelector('button[type="submit"]');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Signing in…"; }
  try {
    await signInWithEmail(email, pass);
  } catch (e) {
    showAuthAlert(e.message || "Invalid email or password.", "error");
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Sign In →"; }
  }
});

$("#auth-signup-form")?.addEventListener("submit", async event => {
  event.preventDefault();
  const name = $("#signup-name")?.value?.trim() || "";
  const email = $("#signup-email")?.value?.trim() || "";
  const pass = $("#signup-password")?.value || "";
  const passConfirm = $("#signup-password-confirm")?.value || "";

  if (pass.length < 6) {
    showAuthAlert("Password must be at least 6 characters long.", "error");
    return;
  }
  if (pass !== passConfirm) {
    showAuthAlert("Passwords do not match. Please re-enter both passwords.", "error");
    return;
  }

  const role = "maker"; // Public registration is strictly Maker role
  const submitBtn = event.currentTarget.querySelector('button[type="submit"]');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Creating account…"; }
  try {
    await signUpWithEmail(email, pass, name, role);
  } catch (e) {
    // Handled in signUpWithEmail
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Create Workbench →"; }
  }
});

async function autoDetectInviteToken(inputEl, keyEl) {
  if (!inputEl) return;
  const raw = inputEl.value.trim();
  if (raw.startsWith("wbe_") || raw.startsWith("wbx_") || raw.includes("#join=") || raw.includes("#setup=")) {
    const creds = await parseInputOrToken(raw);
    if (creds?.url && creds?.key) {
      inputEl.value = creds.url;
      if (keyEl) keyEl.value = creds.key;
      showToast("✓ Decrypted shop connection from token!");
    }
  }
}

$("#auth-cloud-url")?.addEventListener("input", e => autoDetectInviteToken(e.target, $("#auth-cloud-key")));
$("#auth-cloud-url")?.addEventListener("paste", e => setTimeout(() => autoDetectInviteToken(e.target, $("#auth-cloud-key")), 50));
$("#cloud-url")?.addEventListener("input", e => autoDetectInviteToken(e.target, $("#cloud-key")));
$("#cloud-url")?.addEventListener("paste", e => setTimeout(() => autoDetectInviteToken(e.target, $("#cloud-key")), 50));

$("#auth-config-form")?.addEventListener("submit", async event => {
  event.preventDefault();
  let url = $("#auth-cloud-url")?.value?.trim() || "";
  let key = $("#auth-cloud-key")?.value?.trim() || "";
  if (key === "••••••••••••••••") {
    key = getCloudConfig()?.key || "";
  }

  if (url && !key) {
    const creds = await parseInputOrToken(url);
    if (creds?.url && creds?.key) {
      url = creds.url;
      key = creds.key;
      if ($("#auth-cloud-url")) $("#auth-cloud-url").value = url;
      if ($("#auth-cloud-key")) $("#auth-cloud-key").value = "••••••••••••••••";
    }
  }

  if (!url || !key) {
    showAuthAlert("Please provide both Supabase Project URL and API Key, or paste an encrypted invite token.", "error");
    return;
  }
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  url = url.replace(/\/+$/, "");
  try {
    const previous = getCloudConfig();
    if (previous?.url !== url || previous?.key !== key) setCloudSession(null);
    setCloudConfig({ url, key });
    if ($("#cloud-url")) $("#cloud-url").value = url;
    if ($("#cloud-key")) $("#cloud-key").value = "••••••••••••••••";
    if ($("#auth-cloud-key")) $("#auth-cloud-key").value = "••••••••••••••••";
    renderCloudConnection();
    showAuthAlert("✓ Supabase connection saved! You can now create your account or sign in.", "success");
    showToast("Supabase connection saved!");
    setTimeout(() => {
      switchAuthTab("signup");
    }, 700);
  } catch (err) {
    showAuthAlert("Failed to save connection: " + err.message, "error");
  }
});

/* Prevent Escape key from closing auth dialog when locked for guests */
$("#auth-dialog")?.addEventListener("cancel", event => {
  if (!getActiveUser()) {
    event.preventDefault();
  }
});

/* Admin console listeners */
$("#admin-create-user-form")?.addEventListener("submit", async event => {
  event.preventDefault();
  const name = $("#admin-new-name")?.value?.trim() || "";
  const email = $("#admin-new-email")?.value?.trim() || "";
  const pass = $("#admin-new-password")?.value || "";
  const passConfirm = $("#admin-new-password-confirm")?.value || "";
  const role = $("#admin-new-role")?.value || "maker";

  if (pass.length < 6) {
    alert("Password must be at least 6 characters long.");
    return;
  }
  if (pass !== passConfirm) {
    alert("Passwords do not match. Please verify both password fields.");
    return;
  }

  const submitBtn = event.currentTarget.querySelector('button[type="submit"]');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Creating…"; }

  const currentAdminSession = getCloudSession();
  try {
    const res = await cloudRequest("/auth/v1/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        password: pass,
        data: {
          display_name: name.trim(),
          role
        }
      })
    }, false);

    const newUid = res?.user?.id || res?.id;
    if (newUid) {
      recordKnownMaker({
        id: newUid,
        email: email.trim(),
        displayName: name.trim(),
        role
      });

      try {
        await cloudRequest("/rest/v1/workbench_profiles?on_conflict=id", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates,return=representation"
          },
          body: JSON.stringify([{
            id: newUid,
            email: email.trim(),
            display_name: name.trim(),
            role,
            updated_at: new Date().toISOString()
          }])
        });
      } catch (pe) {
        console.warn("Could not insert profile for new user:", pe);
      }

      try {
        const initialWs = {
          projects: [],
          skills: [],
          activity: [],
          practiceLog: [],
          inventory: [],
          customTemplates: [],
          weeklyGoal: 60,
          updatedAt: new Date().toISOString(),
          owner: { id: newUid, email: email.trim(), displayName: name.trim(), role }
        };
        await cloudRequest(`/rest/v1/${CLOUD_TABLE}?on_conflict=user_id`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=representation" },
          body: JSON.stringify([{ user_id: newUid, data: initialWs }])
        });
      } catch (wse) {
        console.warn("Could not seed workspace for new user:", wse);
      }
    }

    // Always restore the admin's session so the admin stays signed in!
    if (currentAdminSession) {
      setCloudSession(currentAdminSession);
    }

    $("#admin-create-user-dialog")?.close();
    event.currentTarget.reset();
    showToast(`Created account for ${name} (${role})!`);
    await renderAdminHub();
  } catch (e) {
    if (currentAdminSession) {
      setCloudSession(currentAdminSession);
    }
    alert(e.message || "Failed to create maker account.");
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Create Account →"; }
  }
});

$("#admin-user-search")?.addEventListener("input", () => {
  void renderAdminHub();
});

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
    materials.length ? `> **Supplies Budget:** $${totalCost.toFixed(2)} ($${spentCost.toFixed(2)} acquired)` : "",
    skills.length ? `> **Skills Involved:** ${skills.join(", ")}` : "",
    "",
    project.description ? `### About this build\n${project.description}\n` : "",
    project.tasks?.length ? `### Checklist & Process\n` + project.tasks.map(t => `- [${t.done ? "x" : " "}] ${t.text}`).join("\n") + "\n" : "",
    materials.length ? `### Materials & Supplies\n` + materials.map(m => `- ${m.name}${m.qty ? ` (${m.qty})` : ""}${Number(m.cost) > 0 ? ` — $${Number(m.cost).toFixed(2)}` : ""} [${m.status === "have" ? "In hand" : m.status === "ordered" ? "Ordered" : "To buy"}]`).join("\n") + "\n" : "",
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
function renderMakerGoals() {
  const container = $("#overview-goals-section");
  if (!container) return;

  const goals = state.makerGoals || [];
  const isCollapsed = isPanelCollapsed("goals");

  if (goals.length === 0) {
    container.innerHTML = `
      <section class="panel goals-section-container" id="panel-goals">
        <div class="panel-heading" style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div class="eyebrow"><span class="eyebrow-line"></span> TARGETS &amp; MILESTONES</div>
            <h2>Maker Goals &amp; Visual Roadmaps</h2>
          </div>
          <button class="button button-outline button-small" data-action="open-goal-dialog">＋ Set Goal</button>
        </div>
        <div class="goal-card" style="text-align:center;padding:26px 16px;border-style:dashed;margin-top:12px">
          <div style="font-size:26px;margin-bottom:6px">🎯</div>
          <strong style="font-size:15px;color:var(--ink)">No active maker challenges yet</strong>
          <p style="font-size:13px;color:var(--muted);max-width:440px;margin:6px auto 16px;line-height:1.5">
            Set a multi-step milestone roadmap (e.g. "Build Custom Coffee Table", "30 Days of Daily Turning", "Build 5 Synthesizers") and track each step node-by-node.
          </p>
          <div><button type="button" class="button button-primary button-small" data-action="open-goal-dialog">＋ Set Your First Goal</button></div>
        </div>
      </section>
    `;
    return;
  }

  container.innerHTML = `
    <section class="panel goals-section-container ${isCollapsed ? "is-collapsed" : ""}" id="panel-goals">
      <div class="panel-heading" style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div class="eyebrow"><span class="eyebrow-line"></span> TARGETS &amp; MILESTONES</div>
          <h2>Maker Goals &amp; Visual Roadmaps (${goals.filter(g => (g.milestones || []).length > 0 && g.milestones.every(m => m.done)).length}/${goals.length}) ${isCollapsed ? `<span style="font-size:12px;font-weight:400;color:var(--muted);margin-left:6px">(Minimized)</span>` : ""}</h2>
        </div>
        <div style="display:flex;gap:8px">
          <button type="button" class="button button-outline button-small" data-action="open-goal-dialog">＋ Set Goal</button>
          <button type="button" class="panel-collapse-btn" data-action="toggle-panel-collapse" data-panel="goals" title="${isCollapsed ? "Expand panel" : "Minimize panel"}">
            ${isCollapsed ? "＋ Expand" : "− Minimize"}
          </button>
        </div>
      </div>
      ${!isCollapsed ? `
        <div class="goals-grid">
          ${goals.map(goal => {
            const milestones = goal.milestones || [];
            const doneCount = milestones.filter(m => m.done).length;
            const totalCount = milestones.length;
            const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
            const isCompleted = totalCount > 0 && doneCount === totalCount;

            return `
              <div class="goal-card ${isCompleted ? "completed" : ""}" data-goal-id="${goal.id}">
                <div class="goal-card-header">
                  <div>
                    <div style="display:flex;align-items:center;gap:6px">
                      <h3 class="goal-card-title">${escapeHTML(goal.title)}</h3>
                      ${isCompleted ? '<span class="status-pill status-completed" style="font-size:10px;padding:2px 6px">🏆 Achieved!</span>' : ""}
                    </div>
                    <div class="goal-card-meta">
                      ${goal.category ? `<span>🏷️ ${escapeHTML(goal.category)} · </span>` : ""}
                      <span>${doneCount}/${totalCount} milestones (${percent}%)</span>
                      ${goal.deadline ? ` · <span>Target: ${formatDate(goal.deadline)}</span>` : ""}
                    </div>
                  </div>
                  <div style="display:flex;gap:4px">
                    <button type="button" class="icon-link-btn" data-action="edit-goal" data-id="${goal.id}" title="Edit goal">✎</button>
                    <button type="button" class="icon-link-btn danger-hover" data-action="delete-goal" data-id="${goal.id}" title="Delete goal">×</button>
                  </div>
                </div>

                <div class="roadmap-container">
                  <div class="roadmap-line-track">
                    <div class="roadmap-line-fill" style="width:${percent}%"></div>
                  </div>
                  <div class="roadmap-nodes-row">
                    ${milestones.map((m, idx) => `
                      <div class="roadmap-node-wrap ${m.done ? "done" : ""}" data-action="toggle-goal-milestone" data-goal="${goal.id}" data-index="${idx}" title="${escapeHTML(m.title)} (Click to toggle)">
                        <div class="roadmap-node-circle">${m.done ? "✓" : idx + 1}</div>
                        <div class="roadmap-node-text" title="${escapeHTML(m.title)}">${escapeHTML(m.title)}</div>
                      </div>
                    `).join("")}
                  </div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      ` : ""}
    </section>
  `;
}

function openGoalDialog(goal = null) {
  const dialog = $("#goal-dialog");
  const form = $("#goal-form");
  const delBtn = $("#delete-goal-btn");
  if (!dialog || !form) return;

  form.reset();
  if (goal && typeof goal === "object") {
    $("#goal-dialog-title").textContent = "Edit Maker Goal";
    form.elements.id.value = goal.id || "";
    form.elements.title.value = goal.title || "";
    form.elements.category.value = goal.category || "";
    form.elements.deadline.value = goal.deadline || "";
    form.elements.milestones.value = (goal.milestones || []).map(m => m.title).join("\n");
    if (delBtn) delBtn.classList.toggle("hidden", !goal.id);
  } else {
    $("#goal-dialog-title").textContent = "Set a Maker Goal";
    form.elements.id.value = "";
    if (delBtn) delBtn.classList.add("hidden");
  }

  dialog.showModal();
}

async function handleGoalSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const id = form.elements.id.value;
  const existing = (state.makerGoals || []).find(g => g.id === id);

  const rawLines = (form.elements.milestones.value || "")
    .split("\n")
    .map(line => line.trim().replace(/^\d+[\.\)]\s*/, ""))
    .filter(Boolean);

  if (rawLines.length === 0) {
    showToast("Please provide at least one milestone step.");
    return;
  }

  const milestones = rawLines.map((title, idx) => {
    const prevMatch = existing?.milestones?.find(m => m.title.toLowerCase() === title.toLowerCase()) || existing?.milestones?.[idx];
    return {
      id: prevMatch?.id || uid(),
      title,
      done: Boolean(prevMatch?.done)
    };
  });

  const goal = {
    id: existing?.id || uid(),
    title: form.elements.title.value.trim(),
    category: form.elements.category.value.trim(),
    deadline: form.elements.deadline.value || "",
    milestones,
    updatedAt: new Date().toISOString()
  };

  if (!goal.title) return;

  state.makerGoals = state.makerGoals || [];
  if (existing) {
    Object.assign(existing, goal);
  } else {
    state.makerGoals.unshift(goal);
  }

  makeActivity("project", `${existing ? "Updated" : "Set"} Maker Goal: ${goal.title}`);

  try {
    await persistState();
    $("#goal-dialog")?.close();
    render();
    showToast(`Saved goal “${goal.title}”!`);
  } catch (e) {
    console.error(e);
    showToast("Could not save maker goal.");
  }
}

async function deleteGoal(id) {
  const goal = (state.makerGoals || []).find(g => g.id === id);
  if (!goal) return;
  if (!window.confirm(`Delete the goal “${goal.title}”?`)) return;

  state.makerGoals = (state.makerGoals || []).filter(g => g.id !== id);
  try {
    await persistState();
    $("#goal-dialog")?.close();
    render();
    showToast("Goal removed.");
  } catch (e) {
    console.error(e);
    showToast("Could not remove goal.");
  }
}

async function toggleGoalMilestone(goalId, index) {
  const goal = (state.makerGoals || []).find(g => g.id === goalId);
  if (!goal || !goal.milestones || !goal.milestones[index]) return;

  const milestone = goal.milestones[index];
  milestone.done = !milestone.done;
  goal.updatedAt = new Date().toISOString();

  const allDone = goal.milestones.every(m => m.done);
  if (allDone && milestone.done) {
    showToast(`🏆 Goal Completed: “${goal.title}”! Fantastic work!`);
    makeActivity("project", `Achieved Maker Goal: ${goal.title}`);
    addNotification({
      title: "🏆 Maker Goal Achieved!",
      message: `You reached all milestones for “${goal.title}”!`,
      icon: "🎖️",
      type: "achievement"
    });
  } else {
    showToast(milestone.done ? `✓ Milestone reached: ${milestone.title}` : `Step unchecked: ${milestone.title}`);
  }

  try {
    await persistState();
    render();
  } catch (e) {
    console.error(e);
  }
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
      Valuation and pricing model for <strong>${escapeHTML(project.title)}</strong> based on logged craft time (${formatMinutes(project.timeSpent || 0)}) and acquired materials ($${materialsCost.toFixed(2)}).
    </div>

    <div class="pricing-summary-card">
      <div class="pricing-stats-grid">
        <div class="pricing-stat-box">
          <span class="pricing-stat-label">Materials</span>
          <span class="pricing-stat-val">$${materialsCost.toFixed(2)}</span>
        </div>
        <div class="pricing-stat-box">
          <span class="pricing-stat-label">Labor (${hours.toFixed(1)}h @ $${laborRate}/h)</span>
          <span class="pricing-stat-val">$${laborCost.toFixed(2)}</span>
        </div>
        <div class="pricing-stat-box">
          <span class="pricing-stat-label">Total Cost (+Overhead)</span>
          <span class="pricing-stat-val">$${totalProductionCost.toFixed(2)}</span>
        </div>
        <div class="pricing-stat-box">
          <span class="pricing-stat-label">Suggested Retail</span>
          <span class="pricing-stat-val retail">$${retailPrice.toFixed(2)}</span>
        </div>
        <div class="pricing-stat-box">
          <span class="pricing-stat-label">Wholesale (55%)</span>
          <span class="pricing-stat-val">$${wholesalePrice.toFixed(2)}</span>
        </div>
        <div class="pricing-stat-box">
          <span class="pricing-stat-label">Net Profit / Item</span>
          <span class="pricing-stat-val retail">+$${netProfit.toFixed(2)}</span>
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
        <label style="flex:1;font-size:13px;font-weight:600">Hourly Craft Rate: <span>$${laborRate}/hr</span></label>
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

async function copyCutPlan() {
  if (!lastCutPlanText) {
    runCutOptimizer();
  }
  if (!lastCutPlanText) return;
  try {
    await navigator.clipboard.writeText(lastCutPlanText);
    showToast("Copied cut plan to clipboard!");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = lastCutPlanText;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    showToast("Copied cut plan to clipboard!");
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
  try {
    await persistState();
    makeActivity("project", `Serviced ${item.toolName}: ${item.task}`);
    renderToolMaintenance();
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
  const topbarBtn = $("#topbar-soundscape-btn");
  if (topbarBtn) {
    if (activeSoundscape !== "off") {
      topbarBtn.classList.add("button-primary");
      topbarBtn.classList.remove("button-outline");
      topbarBtn.textContent = `🎧 ${activeSoundscape.toUpperCase()}`;
    } else {
      topbarBtn.classList.remove("button-primary");
      topbarBtn.classList.add("button-outline");
      topbarBtn.textContent = "🎧 Sounds";
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
    return {
      x: (e.clientX - rect.left) * (blueprintCanvas.width / rect.width),
      y: (e.clientY - rect.top) * (blueprintCanvas.height / rect.height)
    };
  };

  blueprintCanvas.addEventListener("mousedown", e => {
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
  });

  window.addEventListener("mousemove", e => {
    if (!blueprintIsDrawing || !blueprintCtx) return;
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
  });

  window.addEventListener("mouseup", e => {
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
  });
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
      if ($("#detail-dialog").open) renderProjectDetail(project.id);
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
  if (currSelect) currSelect.value = state.currency || "USD";
  if (unitSelect) unitSelect.value = state.unitSystem || "in";
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
      if (Number.isFinite(Number(item.cost)) && Number(item.cost) > 0) {
        item.cost = Math.round(Number(item.cost) * ratio * 100) / 100;
        convertedPricesCount++;
      }
    }
  }
  state.currency = newCurr;

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

  updateTopbarUnitsPill();
  try {
    await persistState();
    $("#units-dialog")?.close();
    render();
    if ($("#detail-dialog").open && activeProjectId) {
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
  if (!project.creator || !project.creator.id) {
    const maker = getCurrentMakerIdentity();
    project.creator = {
      id: maker.id,
      name: maker.name,
      email: maker.email
    };
  }
  if (!Array.isArray(project.coCreators)) {
    project.coCreators = [];
  }
}

function isProjectCreator(project, user = null, includeAdmin = false) {
  if (!project) return false;
  ensureProjectCreator(project);
  const curUser = user || getActiveUser();
  if (!curUser || curUser.id === "local-maker") return true;

  const uId = curUser.id;
  const uEmail = (curUser.email || "").toLowerCase().trim();
  const uName = (curUser.displayName || curUser.display_name || curUser.name || (uEmail ? uEmail.split("@")[0] : "")).toLowerCase().trim();

  const cId = project.creator?.id;
  const cEmail = (project.creator?.email || "").toLowerCase().trim();
  const cName = (project.creator?.name || project.creator?.displayName || (cEmail ? cEmail.split("@")[0] : "")).toLowerCase().trim();

  const idMatch = Boolean(cId && uId && cId === uId);
  const emailMatch = Boolean(cEmail && uEmail && cEmail === uEmail);
  const nameMatch = Boolean(cName && uName && (cName === uName || cName.replace(/\s+/g, "") === uName.replace(/\s+/g, "")));

  if (uId && (emailMatch || nameMatch) && (!cId || cId !== uId)) {
    project.creator.id = uId;
  }

  return Boolean(idMatch || emailMatch || nameMatch || (includeAdmin && (curUser.isAdmin || isCurrentUserAdmin())));
}

function isCollaborativeProject(project) {
  return Boolean(project && Array.isArray(project.coCreators) && project.coCreators.length > 0);
}

function isUserCollaborator(project, user = null, includeAdmin = false) {
  if (!project) return false;
  ensureProjectCreator(project);
  const curUser = user || getActiveUser();
  if (!curUser) return false;

  const uId = curUser.id;
  const uEmail = (curUser.email || "").toLowerCase().trim();
  const uName = (curUser.displayName || curUser.display_name || curUser.name || (uEmail ? uEmail.split("@")[0] : "")).toLowerCase().trim();

  const matchesUser = (member) => {
    if (!member) return false;
    const mId = member.id || member.user_id;
    if (mId && uId && mId === uId) return true;

    const mEmail = (member.email || "").toLowerCase().trim();
    if (mEmail && uEmail && mEmail === uEmail) return true;

    const mName = (member.displayName || member.display_name || member.name || (mEmail ? mEmail.split("@")[0] : "")).toLowerCase().trim();
    if (mName && uName && (mName === uName || mName.replace(/\s+/g, "") === uName.replace(/\s+/g, ""))) return true;

    return false;
  };

  const isCreator = matchesUser(project.creator);
  const isCoCreator = Array.isArray(project.coCreators) && project.coCreators.some(matchesUser);

  // Self-heal real Supabase UID onto member object if matched by name or email
  if (uId && (isCreator || isCoCreator)) {
    if (isCreator && (!project.creator.id || project.creator.id !== uId)) {
      project.creator.id = uId;
      if (uEmail && !project.creator.email) project.creator.email = uEmail;
    }
    if (Array.isArray(project.coCreators)) {
      for (const c of project.coCreators) {
        if (matchesUser(c) && (!c.id || c.id !== uId)) {
          c.id = uId;
          if (uEmail && !c.email) c.email = uEmail;
        }
      }
    }
  }

  return Boolean(isCreator || isCoCreator || (includeAdmin && (curUser.isAdmin || isCurrentUserAdmin())));
}

async function syncCloudCollaborations() {
  const session = getCloudSession();
  const curUser = getActiveUser();
  if (!session?.access_token || !curUser || adminInspectionActive) return;

  try {
    const rows = await cloudRequest(`/rest/v1/${CLOUD_TABLE}?select=user_id,updated_at,data`).catch(() => []);
    if (!Array.isArray(rows) || rows.length === 0) return;

    let hasChanges = false;
    const myId = curUser.id;

    for (const row of rows) {
      if (row.user_id === myId) continue;
      const remoteProjects = Array.isArray(row.data?.projects) ? row.data.projects : [];

      for (const rp of remoteProjects) {
        if (!rp || !rp.id) continue;
        ensureProjectCreator(rp);

        const isCollaborator = isUserCollaborator(rp, curUser);

        if (!isCollaborator) {
          // If we had this project in our workbench, but remote confirms we are NOT creator or co-creator, remove it!
          const existingIdx = state.projects.findIndex(p => p.id === rp.id);
          if (existingIdx !== -1) {
            state.projects.splice(existingIdx, 1);
            hasChanges = true;
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
      }
    }

    if (hasChanges) {
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
  const shared = getSharedCollaborations();
  if (!shared || shared.length === 0) return;

  for (const sp of shared) {
    if (!sp || !sp.id) continue;
    ensureProjectCreator(sp);

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
                  <button type="button" class="button button-outline button-small" data-action="toggle-co-creator-role" data-project="${project.id}" data-id="${c.id}" title="Toggle between Editor and Viewer">Role: ${c.role || "Editor"}</button>
                  <button type="button" class="button button-outline button-small" data-action="pass-creator-status" data-project="${project.id}" data-id="${c.id}" title="Pass immutable creator role to this member">👑 Transfer Creator</button>
                  <button type="button" class="danger-button" style="padding:4px 8px;font-size:11px" data-action="remove-co-creator" data-project="${project.id}" data-id="${c.id}" title="Remove co-creator">×</button>
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
          <button type="button" class="button button-primary button-small add-collab-btn" data-action="add-co-creator" data-project="${project.id}">＋ Add</button>
        </div>
        ${knownMakers.length > 0 ? `
          <div style="margin-top:10px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:11px;color:var(--muted)">
            <span>Quick add known makers:</span>
            ${knownMakers.slice(0, 4).map(m => `
              <button type="button" class="mini-tag clickable" data-action="quick-add-collab" data-project="${project.id}" data-name="${escapeHTML(m.displayName || m.email)}" data-email="${escapeHTML(m.email || "")}" data-id="${escapeHTML(m.id)}">＋ ${escapeHTML(m.displayName || m.email)}</button>
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
  const session = getCloudSession();
  const curUser = getActiveUser();
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

    const memberIds = new Set();
    const memberEmails = new Set();
    const memberNames = new Set();

    const addTarget = (m) => {
      if (!m) return;
      if (m.id) memberIds.add(m.id);
      if (m.email) memberEmails.add(m.email.toLowerCase().trim());
      const name = (m.name || m.displayName || m.display_name || "").toLowerCase().trim();
      if (name) {
        memberNames.add(name);
        memberNames.add(name.replace(/\s+/g, ""));
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
      const normName = rawName.replace(/\s+/g, "");

      const isMember = memberIds.has(rowId) ||
                       (rowEmail && memberEmails.has(rowEmail)) ||
                       (rawName && memberNames.has(rawName)) ||
                       (normName && memberNames.has(normName));

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
        await cloudRequest(`/rest/v1/${CLOUD_TABLE}?user_id=eq.${encodeURIComponent(row.user_id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: row.data, updated_at: new Date().toISOString() })
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.warn("Could not push project to collaborator workspaces:", err);
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

  const toRemoveIds = [];
  const projectsToPush = [];

  for (const p of state.projects) {
    if (!p || !p.id) continue;
    ensureProjectCreator(p);

    const isCollaborator = isUserCollaborator(p, curUser);
    if (!isCollaborator) {
      // Current user is neither creator nor co-creator on this project!
      toRemoveIds.push(p.id);
      projectsToPush.push(p);
    }
  }

  if (projectsToPush.length > 0) {
    for (const p of projectsToPush) {
      await pushProjectToCollaboratorWorkspaces(p);
    }
    state.projects = state.projects.filter(p => !toRemoveIds.includes(p.id));
    await persistState({ syncCloud: true });
    render();
    console.log(`Reconciled ${projectsToPush.length} transferred project(s) to respective creators.`);
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
    const cleanNewName = (newMember.name || "").toLowerCase().replace(/\s+/g, "");
    const cleanNewEmail = (newMember.email || "").toLowerCase().trim();
    for (const m of known.values()) {
      const mEmail = (m.email || "").toLowerCase().trim();
      const mName = (m.displayName || "").toLowerCase().replace(/\s+/g, "");
      if ((mEmail && cleanNewEmail && mEmail === cleanNewEmail) ||
          (mName && cleanNewName && mName === cleanNewName)) {
        newMember.id = m.id;
        if (!newMember.email && m.email) newMember.email = m.email;
        if (m.displayName) newMember.name = m.displayName;
        break;
      }
    }
  } catch {}

  const exists = project.coCreators.some(c =>
    (c.id && newMember.id && c.id === newMember.id) ||
    (c.email && newMember.email && c.email.toLowerCase().trim() === newMember.email.toLowerCase().trim()) ||
    (c.name && newMember.name && c.name.toLowerCase().replace(/\s+/g, "") === newMember.name.toLowerCase().replace(/\s+/g, ""))
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
    await persistState();
    void pushProjectToCollaboratorWorkspaces(project);
    render();
    if ($("#detail-dialog").open && activeProjectId === project.id) {
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
    await persistState();
    void pushProjectToCollaboratorWorkspaces(project);
    render();
    if ($("#detail-dialog").open && activeProjectId === project.id) {
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
    await persistState();
    void pushProjectToCollaboratorWorkspaces(project);
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
    await persistState();
    void pushProjectToCollaboratorWorkspaces(project);
    render();
    if ($("#detail-dialog").open && activeProjectId === project.id) {
      renderProjectDetail(project.id);
    }
    if ($("#collaborators-dialog").open && activeCollabProjectId === project.id) {
      await renderCollaboratorsDialog(project);
    }
    showToast(`Removed ${target.name} from project team.`);
  } catch (err) {
    console.error(err);
    showToast("Could not remove co-creator.");
  }
}

$("#goal-form")?.addEventListener("submit", event => void handleGoalSubmit(event));
$("#maintenance-form")?.addEventListener("submit", event => void handleMaintenanceSubmit(event));
$("#units-form")?.addEventListener("submit", event => { event.preventDefault(); void saveUnitsSettings(); });
$("#soundscape-volume")?.addEventListener("input", event => setSoundscapeVolume(event.target.value));
$("#tool-cut-stock")?.addEventListener("input", () => runCutOptimizer());
$("#tool-cut-kerf")?.addEventListener("input", () => runCutOptimizer());
$("#detail-dialog").addEventListener("close", () => { activeProjectId = null; });
void initialize();
