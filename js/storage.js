/* ==========================================================================
   Workbench 3.0 - Lean Core Storage & Data Persistence
   ========================================================================== */

const STORAGE_KEY = "workbench_clean_v3";
const DB_NAME = "workbench_clean_db";
const STORE_NAME = "app_state";

const state = {
  projects: [],
  inventory: [],
  inventoryFolders: [
    "3D Printing & Filament",
    "Lumber & Sheet Goods",
    "Fasteners & Hardware",
    "Electronics & Wiring",
    "Finishes & Adhesives",
    "Workshop Tools & Equipment",
    "General Supplies"
  ],
  ideas: [],
  activeView: "projects",
  projectsFilter: "all",
  inventoryFilter: "all",
  inventoryTab: "all",
  projectsViewMode: "grid",
  inventoryViewMode: "folders",
  materialsViewMode: "folders",
  theme: "auto",
  audio: {
    playing: false,
    track: "lofi",
    volume: 0.4
  }
};

let dbInstance = null;

// IndexedDB Initialization
function openDatabase() {
  return new Promise((resolve, reject) => {
    if (dbInstance) return resolve(dbInstance);
    if (!window.indexedDB) return resolve(null);
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = event => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = event => {
        dbInstance = event.target.result;
        resolve(dbInstance);
      };
      request.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

// Load saved state (with legacy migration fallback so existing user work is never lost)
async function loadState() {
  let loaded = null;

  // 1. Try LocalStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) loaded = JSON.parse(raw);
  } catch (e) {}

  // 2. Try IndexedDB if LocalStorage was empty
  if (!loaded) {
    try {
      const db = await openDatabase();
      if (db) {
        loaded = await new Promise(res => {
          const tx = db.transaction(STORE_NAME, "readonly");
          const req = tx.objectStore(STORE_NAME).get("current_state");
          req.onsuccess = () => res(req.result || null);
          req.onerror = () => res(null);
        });
      }
    } catch (e) {}
  }

  // 3. Fallback: migrate legacy projects, inventory, and ideas if fresh state is empty
  if (!loaded) {
    loaded = migrateLegacyData();
  }

  if (loaded && typeof loaded === "object") {
    if (Array.isArray(loaded.projects)) state.projects = loaded.projects;
    if (Array.isArray(loaded.inventory)) state.inventory = loaded.inventory;
    if (Array.isArray(loaded.inventoryFolders) && loaded.inventoryFolders.length > 0) {
      state.inventoryFolders = loaded.inventoryFolders;
    }
    if (Array.isArray(loaded.ideas)) state.ideas = loaded.ideas;
    if (loaded.theme) state.theme = loaded.theme;
    if (loaded.inventoryViewMode) state.inventoryViewMode = loaded.inventoryViewMode;
    if (loaded.materialsViewMode) state.materialsViewMode = loaded.materialsViewMode;
  }

  return state;
}

// Save state simultaneously to LocalStorage and IndexedDB
async function persistState() {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (e) {}

  try {
    const db = await openDatabase();
    if (db) {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(state, "current_state");
    }
  } catch (e) {}
}

// Migrate legacy Workbench data if available
function migrateLegacyData() {
  try {
    let legacyIdeas = [];
    try {
      const rawIdeas = localStorage.getItem("workbench-ideas-backup");
      if (rawIdeas) legacyIdeas = JSON.parse(rawIdeas);
    } catch {}

    let legacyState = null;
    try {
      const activeKey = localStorage.getItem("workbench_active_state_key") || "workbench_project_journal_state_v1";
      const rawState = localStorage.getItem(activeKey);
      if (rawState) legacyState = JSON.parse(rawState);
    } catch {}

    const projects = Array.isArray(legacyState?.projects) ? legacyState.projects : [];
    const inventory = Array.isArray(legacyState?.inventory) ? legacyState.inventory : [];
    const inventoryFolders = Array.isArray(legacyState?.inventoryFolders) ? legacyState.inventoryFolders : [];
    const ideas = Array.isArray(legacyIdeas) && legacyIdeas.length ? legacyIdeas : (Array.isArray(legacyState?.ideas) ? legacyState.ideas : []);

    if (projects.length || inventory.length || ideas.length) {
      return { projects, inventory, inventoryFolders, ideas };
    }
  } catch (e) {}
  return null;
}

// Helpers
function uid() {
  return "id_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

function formatMoney(amount) {
  const num = Number(amount) || 0;
  return "$" + num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(isoString) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

function relativeTime(isoString) {
  if (!isoString) return "recently";
  try {
    const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return "recently";
  }
}

function escapeHTML(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

let toastTimeout = null;
function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast visible ${type}`;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.className = "toast";
  }, 3200);
}

// Theme management
function applyTheme(theme = state.theme) {
  state.theme = theme;
  const isDark = theme === "dark" || (theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  const btn = document.getElementById("theme-toggle-btn");
  if (btn) btn.textContent = isDark ? "☀️ Light" : "🌙 Dark";
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const newTheme = current === "dark" ? "light" : "dark";
  applyTheme(newTheme);
  persistState();
}

// Export & Import backup JSON
function exportBackup() {
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `workbench-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Workshop backup downloaded!");
}

async function importBackup(file) {
  try {
    const text = await file.text();
    const imported = JSON.parse(text);
    if (!imported || typeof imported !== "object") throw new Error("Invalid backup format");
    if (Array.isArray(imported.projects)) state.projects = imported.projects;
    if (Array.isArray(imported.inventory)) state.inventory = imported.inventory;
    if (Array.isArray(imported.inventoryFolders)) state.inventoryFolders = imported.inventoryFolders;
    if (Array.isArray(imported.ideas)) state.ideas = imported.ideas;
    await persistState();
    if (typeof window.renderAll === "function") window.renderAll();
    showToast("Workshop backup restored successfully!");
  } catch (err) {
    showToast("Failed to restore backup: invalid file format.", "error");
  }
}

// Group icon helper for folders
function getGroupIcon(name = "") {
  const n = (name || "").toLowerCase();
  if (n.includes("print") || n.includes("filament") || n.includes("spool")) return "🖨️";
  if (n.includes("lumber") || n.includes("wood") || n.includes("sheet") || n.includes("plywood")) return "🪵";
  if (n.includes("fastener") || n.includes("hardware") || n.includes("screw") || n.includes("bolt")) return "🔩";
  if (n.includes("sensor") || n.includes("electronic") || n.includes("wire") || n.includes("mcu")) return "⚡";
  if (n.includes("finish") || n.includes("adhesive") || n.includes("glue") || n.includes("paint") || n.includes("oil")) return "🧪";
  if (n.includes("tool") || n.includes("power") || n.includes("hand") || n.includes("machinery")) return "⚙️";
  if (n.includes("yarn") || n.includes("fiber") || n.includes("textile") || n.includes("fabric")) return "🧶";
  return "📁";
}

if (typeof window !== "undefined") {
  window.state = state;
  window.loadState = loadState;
  window.persistState = persistState;
  window.uid = uid;
  window.formatMoney = formatMoney;
  window.formatDate = formatDate;
  window.relativeTime = relativeTime;
  window.escapeHTML = escapeHTML;
  window.showToast = showToast;
  window.applyTheme = applyTheme;
  window.toggleTheme = toggleTheme;
  window.exportBackup = exportBackup;
  window.importBackup = importBackup;
  window.getGroupIcon = getGroupIcon;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    state,
    loadState,
    persistState,
    uid,
    formatMoney,
    formatDate,
    relativeTime,
    escapeHTML,
    showToast,
    applyTheme,
    toggleTheme,
    exportBackup,
    importBackup,
    getGroupIcon,
    STORAGE_KEY
  };
}
