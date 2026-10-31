/* ============================================================
   Workbench Project Journal - Core State, Storage & Database
   ============================================================ */

const state = {
  projects: [],
  ideas: [],
  skills: [],
  activity: [],
  practiceLog: [],
  inventory: [],
  inventoryFolders: [],
  customTemplates: [],
  makerGoals: [],
  maintenance: [],
  currency: localStorage.getItem("workbench_currency") || "USD",
  unitSystem: localStorage.getItem("workbench_unitSystem") || "in",
  deletedProjectIds: [],
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

const DELETED_PROJECTS_STORAGE_KEY = "workbench_deleted_projects";

function getDeletedProjectIds() {
  try {
    const raw = localStorage.getItem(DELETED_PROJECTS_STORAGE_KEY);
    const set = new Set(Array.isArray(state.deletedProjectIds) ? state.deletedProjectIds : []);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) arr.forEach(id => set.add(id));
    }
    return Array.from(set);
  } catch {
    return Array.isArray(state.deletedProjectIds) ? state.deletedProjectIds : [];
  }
}

function isDeletedProject(projectId) {
  if (!projectId) return false;
  return getDeletedProjectIds().includes(projectId);
}

function recordDeletedProjectId(projectId) {
  if (!projectId) return;
  state.deletedProjectIds = Array.isArray(state.deletedProjectIds) ? state.deletedProjectIds : [];
  if (!state.deletedProjectIds.includes(projectId)) {
    state.deletedProjectIds.push(projectId);
  }
  const all = getDeletedProjectIds();
  if (!all.includes(projectId)) all.push(projectId);
  try {
    localStorage.setItem(DELETED_PROJECTS_STORAGE_KEY, JSON.stringify(all.slice(-100)));
  } catch {}
}

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
const uid = () => {
  if (typeof crypto !== "undefined") {
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
    if (typeof crypto.getRandomValues === "function") {
      const buf = new Uint8Array(16);
      crypto.getRandomValues(buf);
      return Array.from(buf, b => b.toString(16).padStart(2, "0")).join("");
    }
  }
  return "uid_" + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
};

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
  state.ideas = [];
  state.skills = [];
  state.activity = [];
  state.practiceLog = [];
  state.inventory = [];
  state.inventoryFolders = [];
  state.depotRestockList = [];
  state.customTemplates = [];
  state.makerGoals = [];
  state.maintenance = [];
  state.currency = localStorage.getItem("workbench_currency") || "USD";
  state.unitSystem = localStorage.getItem("workbench_unitSystem") || "in";
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
        const user = getActiveUser();
        const isCurrentPrimary = isPrimaryOwner(user);
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
const escapeHtml = escapeHTML;

function safeMediaUrl(url) {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (
    trimmed.startsWith("blob:") ||
    /^data:audio\/(?:wav|mp3|ogg|webm|m4a|aac);base64,/i.test(trimmed) ||
    /^https?:\/\//i.test(trimmed)
  ) {
    return escapeHTML(trimmed);
  }
  return "";
}

function decodeBase64Utf8(str) {
  if (!str || typeof str !== "string") return null;
  try {
    let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const binStr = atob(b64);
    try {
      return decodeURIComponent(binStr);
    } catch {
      return binStr;
    }
  } catch (e) {
    return null;
  }
}

function sanitizeProjectObject(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  try {
    const clean = JSON.parse(JSON.stringify(raw), (key, value) => {
      if (key === "__proto__" || key === "constructor" || key === "prototype") {
        return undefined;
      }
      return value;
    });

    if (!clean.id || typeof clean.id !== "string") return null;
    clean.id = String(clean.id).trim();
    if (!clean.id) return null;

    clean.title = typeof clean.title === "string" ? clean.title.slice(0, 300) : "Untitled Project";
    clean.description = typeof clean.description === "string" ? clean.description.slice(0, 5000) : "";
    clean.status = typeof safeStatus === "function" ? safeStatus(clean.status) : (clean.status || "planned");
    clean.priority = typeof safePriority === "function" ? safePriority(clean.priority) : "normal";
    clean.tags = Array.isArray(clean.tags) ? clean.tags.filter(t => typeof t === "string").map(t => t.slice(0, 50)) : [];
    clean.tasks = Array.isArray(clean.tasks) ? clean.tasks : [];
    clean.notes = Array.isArray(clean.notes) ? clean.notes : [];
    clean.materials = Array.isArray(clean.materials) ? clean.materials.filter(m => m && typeof m === "object").map(m => {
      const folder = typeof m.folder === "string" && m.folder.trim() ? m.folder.trim().slice(0, 60) : (typeof m.group === "string" && m.group.trim() ? m.group.trim().slice(0, 60) : "");
      return {
        ...m,
        id: typeof m.id === "string" ? m.id : ("mat_" + Math.random().toString(36).slice(2, 9)),
        name: typeof m.name === "string" ? m.name.slice(0, 200) : "Material",
        qty: typeof m.qty === "string" ? m.qty.slice(0, 50) : (m.qty != null ? String(m.qty).slice(0, 50) : ""),
        cost: Number.isFinite(Number(m.cost)) ? Number(m.cost) : 0,
        status: ["need", "ordered", "have"].includes(m.status) ? m.status : "need",
        folder: folder || "General Supplies",
        group: folder || "General Supplies"
      };
    }) : [];
    clean.materialFolders = Array.isArray(clean.materialFolders) ? clean.materialFolders.filter(f => typeof f === "string" && f.trim()).map(f => f.trim().slice(0, 60)) : [];
    clean.folders = Array.isArray(clean.folders) ? clean.folders : [];
    if (clean.creator && typeof clean.creator === "object") {
      clean.creator = {
        id: typeof clean.creator.id === "string" ? clean.creator.id.slice(0, 100) : "",
        name: typeof clean.creator.name === "string" ? clean.creator.name.slice(0, 150) : "Maker",
        email: typeof clean.creator.email === "string" ? clean.creator.email.slice(0, 150) : ""
      };
    }
    clean.coCreators = Array.isArray(clean.coCreators) ? clean.coCreators.map(c => {
      if (!c || typeof c !== "object") return null;
      const rawRole = String(c.role || "Editor").toLowerCase();
      const role = (rawRole === "viewer" || rawRole === "admin") ? rawRole : "editor";
      return {
        id: typeof c.id === "string" ? c.id.slice(0, 100) : "",
        name: typeof c.name === "string" ? c.name.slice(0, 150) : "Collaborator",
        email: typeof c.email === "string" ? c.email.slice(0, 150) : "",
        role,
        addedAt: typeof c.addedAt === "string" ? c.addedAt : new Date().toISOString()
      };
    }).filter(Boolean) : [];
    clean.pinned = Boolean(clean.pinned);
    clean.timeSpent = Number.isFinite(clean.timeSpent) ? clean.timeSpent : 0;
    return clean;
  } catch (e) {
    return null;
  }
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

function setSavedTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (e) {}
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


function safeStatus(status) {
  return STATUS_LABELS[status] ? status : "planned";
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 3000);
}

/* 🪟 Panel Minimization & Window Collapsing */
const COLLAPSED_PANELS_STORAGE_KEY = "workbench-collapsed-panels";

function isPanelCollapsed(panelId) {
  try {
    const list = JSON.parse(localStorage.getItem(COLLAPSED_PANELS_STORAGE_KEY) || "[]");
    return Array.isArray(list) && list.includes(panelId);
  } catch {
    return false;
  }
}

function togglePanelCollapse(panelId) {
  try {
    const list = JSON.parse(localStorage.getItem(COLLAPSED_PANELS_STORAGE_KEY) || "[]");
    const arr = Array.isArray(list) ? list : [];
    const idx = arr.indexOf(panelId);
    let nowCollapsed = false;
    if (idx >= 0) {
      arr.splice(idx, 1);
      nowCollapsed = false;
    } else {
      arr.push(panelId);
      nowCollapsed = true;
    }
    localStorage.setItem(COLLAPSED_PANELS_STORAGE_KEY, JSON.stringify(arr));

    const el = document.getElementById(panelId);
    if (el) {
      el.classList.toggle("is-collapsed", nowCollapsed);
      const btn = el.querySelector(`.panel-collapse-btn[data-panel="${panelId}"]`);
      if (btn) {
        btn.textContent = nowCollapsed ? "＋ Expand" : "— Minimize";
        btn.title = nowCollapsed ? "Expand panel" : "Minimize panel";
      }
    }
    if (panelId === "achievements" || panelId === "goals") {
      render();
    }
  } catch (e) {
    console.error(e);
  }
}

function applyInitialCollapsedPanels() {
  try {
    const list = JSON.parse(localStorage.getItem(COLLAPSED_PANELS_STORAGE_KEY) || "[]");
    if (!Array.isArray(list)) return;
    list.forEach(panelId => {
      const el = document.getElementById(panelId);
      if (el) {
        el.classList.add("is-collapsed");
        const btn = el.querySelector(`.panel-collapse-btn[data-panel="${panelId}"]`);
        if (btn) {
          btn.textContent = "＋ Expand";
          btn.title = "Expand panel";
        }
      }
    });
  } catch {}
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


if (typeof window !== "undefined") {
  window.state = state;
  window.$ = $;
  window.$$ = $$;
  window.uid = uid;
  window.CURRENCIES = CURRENCIES;
  window.formatMoney = formatMoney;
  window.formatDate = formatDate;
  window.escapeHTML = escapeHTML;
  window.escapeHtml = escapeHtml;
  window.safePriority = safePriority;
  window.safeStatus = safeStatus;
  window.showToast = showToast;
  window.makeActivity = makeActivity;
  window.persistState = persistState;
  window.readSavedState = readSavedState;
  window.openDatabase = openDatabase;
  window.applyTheme = applyTheme;
  window.getSavedTheme = getSavedTheme;
}
