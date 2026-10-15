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

const state = { projects: [], skills: [], activity: [], starterSkillsAdded: false, hasUserChanges: false };
let database;
let activeProjectId = null;
let activePhotoTarget = null;
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

function readSavedState() {
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(STATE_KEY);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function persistState({ syncCloud = true, preserveTimestamp = false } = {}) {
  return new Promise((resolve, reject) => {
    if (!preserveTimestamp) state.updatedAt = new Date().toISOString();
    if (syncCloud) state.hasUserChanges = true;
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(state, STATE_KEY);
    transaction.oncomplete = () => {
      resolve();
      if (syncCloud) scheduleCloudSync();
    };
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function makeActivity(kind, text) {
  state.activity.unshift({ id: uid(), kind, text, at: new Date().toISOString() });
  state.activity = state.activity.slice(0, 30);
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

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function projectSkillNames(project) {
  return (project.skillIds || []).map(id => state.skills.find(skill => skill.id === id)).filter(Boolean);
}

function getCloudConfig() {
  try {
    return JSON.parse(localStorage.getItem(CLOUD_CONFIG_KEY) || "null");
  } catch {
    return null;
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

async function ensureCloudSession() {
  const session = getCloudSession();
  if (!session?.access_token) throw new Error("Sign in to your Supabase account first.");
  if (session.expires_at && session.expires_at * 1000 > Date.now() + 60_000) return session;
  if (!session.refresh_token) throw new Error("Your cloud session expired. Sign in again.");
  const refreshed = await cloudRequest("/auth/v1/token?grant_type=refresh_token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: session.refresh_token })
  }, false);
  const nextSession = { ...refreshed, expires_at: refreshed.expires_at || Math.floor(Date.now() / 1000) + refreshed.expires_in };
  setCloudSession(nextSession);
  return nextSession;
}

async function signInCloud(email, password, createAccount = false) {
  const path = createAccount ? "/auth/v1/signup" : "/auth/v1/token?grant_type=password";
  const payload = await cloudRequest(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  }, false);
  const session = payload.access_token ? payload : payload.session;
  if (!session?.access_token) {
    if (createAccount) {
      cloudMessage("Account created. Check your email to confirm it, then sign in here.", "info");
      return false;
    }
    throw new Error("Sign-in did not return a session. Check your account and email confirmation settings.");
  }
  setCloudSession({ ...session, user: payload.user || session.user, expires_at: session.expires_at || Math.floor(Date.now() / 1000) + session.expires_in });
  cloudConflict = null;
  await syncCloudWorkspace();
  if ($("#sync-message").dataset.status === "error") throw new Error($("#sync-message").textContent);
  renderCloudConnection();
  return true;
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
  if (!code && !authError) return;
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  history.replaceState(null, "", redirectTo);
  if (authError) {
    localStorage.removeItem(CLOUD_PKCE_KEY);
    cloudMessage(`GitHub sign-in was not completed: ${authError}`, "error");
    return;
  }
  const pending = JSON.parse(localStorage.getItem(CLOUD_PKCE_KEY) || "null");
  if (!pending?.verifier || pending.redirectTo !== redirectTo || Date.now() - pending.startedAt > 10 * 60 * 1000) {
    localStorage.removeItem(CLOUD_PKCE_KEY);
    throw new Error("The GitHub sign-in session is missing or expired. Please try again.");
  }
  localStorage.removeItem(CLOUD_PKCE_KEY);
  const session = await cloudRequest("/auth/v1/token?grant_type=pkce", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ auth_code: code, code_verifier: pending.verifier })
  }, false);
  if (!session?.access_token || !session.user) throw new Error("GitHub sign-in did not return a valid Supabase session.");
  setCloudSession({ ...session, expires_at: session.expires_at || Math.floor(Date.now() / 1000) + session.expires_in });
  await syncCloudWorkspace();
  if ($("#sync-message").dataset.status === "error") throw new Error($("#sync-message").textContent);
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
  return state.hasUserChanges || state.projects.length > 0 || state.skills.some(skill => skill.xp > 0 || !STARTER_SKILLS.some(([name]) => name.toLocaleLowerCase() === skill.name.toLocaleLowerCase()));
}

function cloudWorkspacePayload() {
  return {
    ...state,
    projects: state.projects.map(project => ({
      ...project,
      folders: (project.folders || []).map(folder => ({
        ...folder,
        images: (folder.images || []).map(({ blob, ...image }) => image)
      }))
    }))
  };
}

async function getRemoteWorkspace() {
  const session = await ensureCloudSession();
  const query = `?user_id=eq.${encodeURIComponent(session.user.id)}&select=data,updated_at`;
  const rows = await cloudRequest(`/rest/v1/${CLOUD_TABLE}${query}`);
  return rows[0] || null;
}

async function storeRemoteWorkspace() {
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
  await persistState({ syncCloud: false, preserveTimestamp: true });
  const session = await ensureCloudSession();
  writeSyncMarker(session.user.id, remote.updated_at);
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
      }
      else cloudMessage("There is no cloud copy yet. Choose “Use this browser’s copy” to upload it.", "conflict");
      return;
    }
    if (choice === "push") {
      await storeRemoteWorkspace();
      return;
    }
    if (!remote) {
      await storeRemoteWorkspace();
      cloudMessage("Cloud sync is ready. This browser’s workspace is now backed up.", "connected");
      return;
    }
    const marker = readSyncMarker(session.user.id);
    if (!hasLocal) {
      await loadRemoteWorkspace(remote);
      cloudMessage("Cloud workspace loaded on this browser.", "connected");
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
  $("#cloud-key").value = config?.key || "";
  $("#cloud-config").classList.toggle("hidden", Boolean(session?.access_token));
  $("#cloud-auth-form").classList.toggle("hidden", Boolean(session?.access_token));
  $("#cloud-workspace").classList.toggle("hidden", !session?.access_token);
  $("#cloud-account-email").textContent = session?.user?.email || "Signed in";
  const marker = session?.user?.id ? readSyncMarker(session.user.id) : null;
  $("#cloud-last-synced").textContent = marker?.remoteUpdatedAt ? `Last synced ${relativeTime(marker.remoteUpdatedAt)}` : "";
  $("#cloud-auth-form [data-action='sign-out']").classList.toggle("hidden", !session?.access_token);
  if (config && !session?.access_token && $("#sync-message").dataset.status === "info") {
    cloudMessage("Connection saved. Sign in to sync this workspace.", "info");
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
  }
  if (!window.confirm("Importing replaces all projects and skills in this browser. Continue?")) return;
  state.projects = restored.projects;
  state.skills = restored.skills;
  state.activity = Array.isArray(restored.activity) ? restored.activity : [];
  state.starterSkillsAdded = true;
  try {
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
  renderNavigation();
  renderCloudConnection();
  renderOverview();
  renderProjects();
  renderPlanner();
  renderSkills();
  renderGallery();
  if (activeProjectId && $("#detail-dialog").open) renderProjectDetail(activeProjectId);
}

function renderNavigation() {
  $("#nav-project-count").textContent = state.projects.length;
}

function statCard(label, number, foot, symbol) {
  return `<article class="stat-card"><div class="stat-label">${label}</div><span class="stat-symbol">${symbol}</span><div class="stat-number">${number}</div><div class="stat-foot">${foot}</div></article>`;
}

function renderOverview() {
  const inProgress = state.projects.filter(project => project.status === "in-progress").length;
  const completed = state.projects.filter(project => project.status === "completed").length;
  const totalXp = state.skills.reduce((sum, skill) => sum + skill.xp, 0);
  const photos = state.projects.reduce((sum, project) => sum + projectImageCount(project), 0);
  $("#overview-stats").innerHTML = [
    statCard("Projects in motion", inProgress, `${state.projects.length} in your workshop`, "↗"),
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
}

function emptyState(title, description, action, buttonText = "Get started") {
  return `<div class="empty-state"><div class="empty-state-mark">✳</div><h3>${title}</h3><p>${description}</p><button class="button button-primary" data-action="${action}">＋ ${buttonText}</button></div>`;
}

function renderProjects() {
  const query = ($("#project-search")?.value || "").trim().toLowerCase();
  const filter = $("#project-status-filter")?.value || "all";
  const sort = $("#project-sort")?.value || "updated";
  const filtered = [...state.projects]
    .filter(project => (filter === "all" || safeStatus(project.status) === filter))
    .filter(project => `${project.title} ${project.description} ${(project.tags || []).join(" ")} ${projectSkillNames(project).map(skill => skill.name).join(" ")}`.toLowerCase().includes(query))
    .sort((a, b) => {
      if (sort === "due-soon") return (a.targetDate || "9999").localeCompare(b.targetDate || "9999");
      if (sort === "priority") return ({ high: 0, normal: 1, low: 2 }[a.priority] ?? 1) - ({ high: 0, normal: 1, low: 2 }[b.priority] ?? 1);
      if (sort === "name") return a.title.localeCompare(b.title);
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
  $("#project-result-count").textContent = `${filtered.length} ${filtered.length === 1 ? "project" : "projects"}`;
  $("#project-grid").innerHTML = filtered.length ? filtered.map((project, index) => {
    const skills = projectSkillNames(project);
    const images = projectImageCount(project);
    const progress = projectTaskProgress(project);
    return `<article class="project-card" data-project="${project.id}" tabindex="0" role="button" aria-label="Open ${escapeHTML(project.title)}">
      <div class="project-card-head"><div class="project-card-mark">${["✳", "⌘", "◈", "✿"][index % 4]}</div><span class="status-pill status-${safeStatus(project.status)}">${STATUS_LABELS[safeStatus(project.status)]}</span></div>
      <h3>${escapeHTML(project.title)}</h3><p class="project-card-description">${escapeHTML(project.description || "No description yet. Open this project to add one.")}</p>
      <div class="project-card-labels"><span class="priority-pill priority-${safePriority(project.priority)}">${priorityLabel(project.priority)}</span>${(project.tags || []).slice(0, 3).map(tag => `<span class="mini-tag">${escapeHTML(tag)}</span>`).join("")}${(project.tags || []).length > 3 ? `<span class="mini-tag">+${project.tags.length - 3}</span>` : ""}</div>
      <div class="project-card-skills">${skills.slice(0, 3).map(skill => `<span class="mini-tag">${escapeHTML(skill.name)}</span>`).join("")}${skills.length > 3 ? `<span class="mini-tag">+${skills.length - 3}</span>` : ""}</div>
      ${progress.total ? `<div class="card-task-progress"><div class="progress-track"><div class="progress-bar" style="width:${progress.percent}%"></div></div><span>${progress.completed}/${progress.total} steps</span></div>` : ""}
      <div class="project-card-bottom"><span class="project-card-meta">${images ? `▧ ${images} ${images === 1 ? "photo" : "photos"} · ` : ""}Updated ${relativeTime(project.updatedAt)}</span>${project.targetDate ? `<span class="project-card-meta">Due ${formatDate(project.targetDate)}</span>` : ""}</div>
    </article>`;
  }).join("") : emptyState(query || filter !== "all" ? "No projects match that" : "Every great thing starts somewhere", query || filter !== "all" ? "Try another search or status filter." : "Add something you’ve made, want to make, or are working on right now.", "new-project", "New project");
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
  $("#planner-stats").innerHTML = [
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
}

function renderSkills() {
  const totalXp = state.skills.reduce((sum, skill) => sum + skill.xp, 0);
  const levels = state.skills.reduce((sum, skill) => sum + skillLevel(skill.xp) - 1, 0);
  $("#skills-summary").innerHTML = state.skills.length
    ? `<span>✳</span><span>You’ve earned <strong>${totalXp.toLocaleString()} XP</strong> across <strong>${levels} level${levels === 1 ? "" : "s"}</strong> so far. Keep showing up; it adds up.</span>`
    : `<span>✳</span><span>Add a skill and start your own progress trail. Every <strong>100 XP</strong> earns a new level.</span>`;
  const sorted = [...state.skills].sort((a, b) => b.xp - a.xp);
  $("#skill-grid").innerHTML = sorted.length ? sorted.map((skill, index) => {
    const relatedCount = state.projects.filter(project => (project.skillIds || []).includes(skill.id)).length;
    return `<article class="skill-card">
      <div class="skill-card-header"><div class="skill-icon">${["✳", "⌘", "◈", "✿"][index % 4]}</div><div class="skill-card-heading"><h3>${escapeHTML(skill.name)}</h3><span>${escapeHTML(skill.category || "Personal skill")}</span></div><span class="skill-level-badge">Level ${skillLevel(skill.xp)}</span></div>
      <div class="skill-card-progress"><div class="progress-track"><div class="progress-bar" style="width:${skillProgress(skill.xp)}%"></div></div><div class="skill-xp-line"><span>${skillProgress(skill.xp)} / ${XP_PER_LEVEL} XP to next level</span><span>${skill.xp} total XP</span></div></div>
      <div class="skill-card-bottom"><span>${relatedCount} ${relatedCount === 1 ? "project" : "projects"}</span><div class="skill-card-actions"><button class="small-action" data-action="edit-skill" data-id="${skill.id}">Edit</button><button class="small-action" data-action="log-xp" data-id="${skill.id}">＋ Log XP</button></div></div>
    </article>`;
  }).join("") : emptyState("Your skills deserve a spot here", "Track a skill, practice over time, and watch your level grow.", "new-skill", "Add a skill");
}

function renderGallery() {
  const projects = state.projects.filter(project => projectImageCount(project) > 0);
  $("#gallery-content").innerHTML = projects.length ? projects.map(project => `
    <section class="gallery-project">
      <div class="gallery-project-heading"><h2>${escapeHTML(project.title)}</h2><span>${projectImageCount(project)} ${projectImageCount(project) === 1 ? "photo" : "photos"}</span></div>
      ${(project.folders || []).filter(folder => folder.images.length).map(folder => `
        <div class="gallery-folder"><div class="gallery-folder-title">${escapeHTML(folder.name)}</div><div class="photo-grid">${folder.images.map(image => `
          <div class="photo-tile"><img src="${imageUrl(image)}" alt="${escapeHTML(image.name)}" loading="lazy"><span class="photo-caption">${escapeHTML(image.name)}</span></div>`).join("")}</div></div>`).join("")}
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
  const progress = projectTaskProgress(project);
  $("#project-detail").innerHTML = `<div class="detail-content">
    <div class="detail-top"><div class="detail-title"><div class="project-swatch">✳</div><div><h2>${escapeHTML(project.title)}</h2><div class="detail-subtitle">Updated ${relativeTime(project.updatedAt)}${project.targetDate ? ` · Target ${formatDate(project.targetDate)}` : ""}</div></div></div><button class="dialog-close" data-action="close-dialog" aria-label="Close">×</button></div>
    <p class="detail-description">${escapeHTML(project.description || "No description yet.")}</p>
    <div class="detail-top"><div class="project-card-labels"><span class="status-pill status-${safeStatus(project.status)}">${STATUS_LABELS[safeStatus(project.status)]}</span><span class="priority-pill priority-${safePriority(project.priority)}">${priorityLabel(project.priority)} priority</span>${(project.tags || []).map(tag => `<span class="mini-tag">${escapeHTML(tag)}</span>`).join("")}</div><button class="small-action" data-action="edit-project" data-id="${project.id}">Edit project</button></div>
    ${skills.length ? `<div class="detail-skills">${skills.map(skill => `<span class="mini-tag">${escapeHTML(skill.name)} · Level ${skillLevel(skill.xp)}</span>`).join("")}</div>` : ""}
    <div class="detail-section-heading"><h3>Project checklist <span class="subtle-count">${progress.total ? `${progress.completed}/${progress.total} complete` : "Break it into steps"}</span></h3></div>
    ${progress.total ? `<div class="detail-task-progress"><div class="progress-track"><div class="progress-bar" style="width:${progress.percent}%"></div></div><span>${progress.percent}%</span></div>` : ""}
    <form class="inline-add-form task-add-form" data-project="${project.id}"><input name="taskText" required maxlength="140" placeholder="Add a next step..." aria-label="New checklist step"><button class="button button-outline" type="submit">＋ Add step</button></form>
    ${tasks.length ? `<ul class="task-list">${tasks.map(task => `<li class="task-item ${task.done ? "is-done" : ""}"><label><input type="checkbox" data-action="toggle-task" data-project="${project.id}" data-id="${task.id}" ${task.done ? "checked" : ""}><span>${escapeHTML(task.text)}</span></label><button class="task-remove" data-action="delete-task" data-project="${project.id}" data-id="${task.id}" aria-label="Remove ${escapeHTML(task.text)}">×</button></li>`).join("")}</ul>` : `<div class="folder-empty">Add a few steps to make a big project feel manageable.</div>`}
    <div class="detail-section-heading"><h3>Progress journal <span class="subtle-count">${notes.length ? `${notes.length} ${notes.length === 1 ? "entry" : "entries"}` : "Keep a note of the journey"}</span></h3></div>
    <form class="journal-add-form" data-project="${project.id}"><label class="sr-only" for="journal-entry">Progress note</label><textarea id="journal-entry" name="journalText" rows="2" required maxlength="1000" placeholder="What did you try, learn, or figure out today?"></textarea><div><span class="form-hint">A dated note, just for this project.</span><button class="button button-outline" type="submit">＋ Add note</button></div></form>
    ${notes.length ? `<div class="journal-list">${[...notes].sort((a, b) => new Date(b.at) - new Date(a.at)).map(note => `<article class="journal-entry"><div class="journal-date">${formatDate(note.at.slice(0, 10))}</div><p>${escapeHTML(note.text)}</p><button class="task-remove" data-action="delete-note" data-project="${project.id}" data-id="${note.id}" aria-label="Delete progress note">×</button></article>`).join("")}</div>` : ""}
    <div class="detail-section-heading"><h3>Project photos</h3><div><button class="small-action" data-action="new-folder" data-id="${project.id}">＋ Folder</button> <button class="small-action" data-action="add-photos" data-id="${project.id}">＋ Add photos</button></div></div>
    ${folders.map(folder => `<div class="folder-block"><div class="folder-heading">${escapeHTML(folder.name)} <span>${folder.images.length} ${folder.images.length === 1 ? "photo" : "photos"} <button class="small-action" data-action="add-photos" data-id="${project.id}" data-folder="${folder.id}">＋ Add</button></span></div>${folder.images.length ? `<div class="detail-photo-grid">${folder.images.map(image => `<div class="detail-photo"><img src="${imageUrl(image)}" alt="${escapeHTML(image.name)}"><button class="remove-photo" data-action="remove-photo" data-project="${project.id}" data-folder="${folder.id}" data-image="${image.id}" aria-label="Remove ${escapeHTML(image.name)}">×</button></div>`).join("")}</div>` : `<div class="folder-empty">No photos here yet. Add photos to keep a record of your progress.</div>`}</div>`).join("")}
    <div class="detail-footer"><button class="danger-button" data-action="delete-project" data-id="${project.id}">Delete project</button><span class="project-card-meta">${projectImageCount(project)} photos · ${folders.length} ${folders.length === 1 ? "folder" : "folders"}</span></div>
  </div>`;
}

function switchView(view) {
  $$(".view-section").forEach(section => section.classList.toggle("active", section.id === `${view}-view`));
  $$(".nav-link").forEach(link => link.classList.toggle("active", link.dataset.view === view));
  const title = { overview: "Overview", projects: "Projects", skills: "Skills", gallery: "Gallery", planner: "Planner", sync: "Sync & backup" }[view] || "Overview";
  $("#page-crumb").textContent = title;
  if (view === "sync") renderCloudConnection();
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
  $("#project-dialog-title").textContent = project ? "Edit project" : "Create a project";
  form.elements.id.value = project?.id || "";
  form.elements.title.value = project?.title || "";
  form.elements.description.value = project?.description || "";
  form.elements.status.value = project ? safeStatus(project.status) : "planned";
  form.elements.targetDate.value = project?.targetDate || "";
  form.elements.priority.value = project?.priority || "normal";
  form.elements.tags.value = (project?.tags || []).join(", ");
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
  $("#skill-dialog").showModal();
}

function openProjectDetail(id) {
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
      folder.images.push({ id: uid(), name: file.name, type: file.type, blob: file, addedAt: new Date().toISOString() });
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
  }
}

async function handleProjectSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const id = form.elements.id.value;
  const existing = state.projects.find(project => project.id === id);
  const skillIds = $$('input[name="skillIds"]:checked', form).map(input => input.value);
  const project = {
    id: existing?.id || uid(),
    title: form.elements.title.value.trim(),
    description: form.elements.description.value.trim(),
    status: safeStatus(form.elements.status.value),
    targetDate: form.elements.targetDate.value,
    priority: ["high", "normal", "low"].includes(form.elements.priority.value) ? form.elements.priority.value : "normal",
    tags: [...new Set(form.elements.tags.value.split(",").map(tag => tag.trim()).filter(Boolean))],
    skillIds,
    folders: existing?.folders || [{ id: uid(), name: "General", images: [] }],
    tasks: existing?.tasks || [],
    notes: existing?.notes || [],
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  if (!project.title) return;
  if (existing) Object.assign(existing, project);
  else state.projects.unshift(project);
  makeActivity("project", `${existing ? "Updated" : "Started"} ${project.title}`);
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
  makeActivity("xp", `${skill.name} +${earned} XP${note ? ` · ${note}` : ""}${newLevel > oldLevel ? ` — Level ${newLevel}!` : ""}`);
  try {
    await persistState();
    $("#xp-dialog").close();
    render();
    showToast(newLevel > oldLevel ? `${skill.name} reached Level ${newLevel}!` : `+${earned} XP added to ${skill.name}.`);
  } catch (error) {
    skill.xp -= earned;
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
  if (!form.matches(".task-add-form, .journal-add-form")) return;
  event.preventDefault();
  const project = state.projects.find(item => item.id === form.dataset.project);
  if (!project) return;
  const isTask = form.matches(".task-add-form");
  const text = form.elements[isTask ? "taskText" : "journalText"].value.trim();
  if (!text) return;
  if (isTask) {
    project.tasks.push({ id: uid(), text, done: false, createdAt: new Date().toISOString() });
    makeActivity("task", `Added a step to ${project.title}`);
  } else {
    const at = new Date().toISOString();
    project.notes.push({ id: uid(), text, at });
    makeActivity("note", `Added a progress note to ${project.title}`);
  }
  project.updatedAt = new Date().toISOString();
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
  project.updatedAt = new Date().toISOString();
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

async function handleAction(action, target) {
  const id = target.dataset.id;
  if (action === "new-project") openProjectForm();
  if (action === "new-skill") openSkillForm();
  if (action === "close-dialog") target.closest("dialog")?.close();
  if (action === "save-cloud-config") {
    const urlInput = $("#cloud-url");
    const keyInput = $("#cloud-key");
    const url = urlInput.value.trim().replace(/\/+$/, "");
    const key = keyInput.value.trim();
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) || !key) {
      cloudMessage("Enter a valid Supabase project URL and publishable/anon key.", "error");
      return;
    }
    try {
      const previous = getCloudConfig();
      if (previous?.url !== url || previous?.key !== key) setCloudSession(null);
      localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify({ url, key }));
      cloudMessage("Connection saved. Sign in to sync this workspace.", "info");
      renderCloudConnection();
      showToast("Cloud connection saved on this browser.");
    } catch (error) {
      console.error("Unable to save cloud connection.", error);
      cloudMessage("Could not save this connection in browser storage.", "error");
    }
    return;
  }
  if (action === "create-cloud-account" || action === "cloud-sign-in") {
    const form = $("#cloud-auth-form");
    if (!form.reportValidity()) return;
    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;
    try {
      const connected = await signInCloud(email, password, action === "create-cloud-account");
      if (connected) showToast("Cloud sync connected.");
    } catch (error) {
      console.error("Unable to authenticate with cloud storage.", error);
      cloudMessage(error.message, "error");
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
    clearTimeout(syncTimer);
    setCloudSession(null);
    cloudConflict = null;
    cloudMessage("Signed out. This browser still has its local copy.", "info");
    renderCloudConnection();
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
  if (action === "new-folder") openFolderForm(id);
  if (action === "add-photos") beginPhotoUpload(id, target.dataset.folder || null);
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
    });
    if (!saved?.starterSkillsAdded) {
      const existingNames = new Set(state.skills.map(skill => skill.name.trim().toLocaleLowerCase()));
      for (const [name, category] of STARTER_SKILLS) {
        if (existingNames.has(name.toLocaleLowerCase())) continue;
        state.skills.push({ id: uid(), name, category, xp: 0, createdAt: new Date().toISOString() });
      }
      makeActivity("skill", "Added a starter collection of skills to explore");
      state.starterSkillsAdded = true;
    }
    await persistState({ syncCloud: false, preserveTimestamp: Boolean(state.updatedAt) });
    render();
    renderCloudConnection();
    try {
      await completeGitHubSignIn();
    } catch (error) {
      console.error("Unable to complete GitHub sign-in.", error);
      cloudMessage(error.message || "Could not complete GitHub sign-in.", "error");
    }
    if (getCloudConfig() && getCloudSession()) {
      void syncCloudWorkspace();
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
  const target = event.target.closest("[data-action], [data-view], [data-project]");
  if (!target) return;
  if (target.dataset.view) {
    event.preventDefault();
    switchView(target.dataset.view);
    return;
  }
  if (target.dataset.project && !target.dataset.action) {
    openProjectDetail(target.dataset.project);
    return;
  }
  if (target.dataset.action) void handleAction(target.dataset.action, target);
});

document.addEventListener("keydown", event => {
  if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-project][role='button']")) {
    event.preventDefault();
    openProjectDetail(event.target.dataset.project);
  }
});

$("#project-search").addEventListener("input", renderProjects);
$("#project-status-filter").addEventListener("change", renderProjects);
$("#project-sort").addEventListener("change", renderProjects);
$("#project-form").addEventListener("submit", event => void handleProjectSubmit(event));
$("#skill-form").addEventListener("submit", event => void handleSkillSubmit(event));
$("#xp-form").addEventListener("submit", event => void handleXpSubmit(event));
$("#folder-form").addEventListener("submit", event => void handleFolderSubmit(event));
$("#cloud-auth-form").addEventListener("submit", event => {
  event.preventDefault();
  void handleAction("cloud-sign-in", event.currentTarget);
});
document.addEventListener("submit", event => void handleProjectEntrySubmit(event));
document.addEventListener("change", event => {
  if (event.target.matches('input[data-action="toggle-task"]')) void handleTaskToggle(event.target);
});
$("#photo-input").addEventListener("change", event => void handlePhotoUpload(event.target.files));
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
$("#detail-dialog").addEventListener("close", () => { activeProjectId = null; });
void initialize();
