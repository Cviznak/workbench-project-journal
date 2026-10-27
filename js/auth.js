/* ============================================================
   Workbench Project Journal - Authentication & Cloud Sync
   ============================================================ */

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
function isGenericName(name) {
  if (!name || typeof name !== "string") return true;
  const clean = name.trim().toLowerCase();
  return clean.length < 2 || [
    "studio maker", "local maker", "guest", "anonymous", "null", "undefined"
  ].includes(clean);
}

function isPrimaryOwner(user = null) {
  const u = user || getActiveUser();
  if (!u) return false;
  const primaryId = getPrimaryAdminId();
  if (u.id && primaryId && u.id === primaryId) return true;
  return Boolean(u.isPrimary);
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
  if (user.isPrimary) {
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
    const ownerRows = await cloudRequest("/rest/v1/workbench_profiles?is_primary=eq.true&select=id");
    if (Array.isArray(ownerRows) && ownerRows.length > 0 && ownerRows[0]?.id) {
      localStorage.setItem(PRIMARY_ADMIN_STORAGE_KEY, ownerRows[0].id);
      if (ownerRows[0].id !== user.id) {
        showToast("The Shop Owner role is permanently assigned and immutable.");
        return;
      }
    }
  } catch (err) {
    console.warn("Could not query primary owner status:", err);
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
            <span class="role-pill role-${escapeHTML(user.role)}">${roleLabel}</span>
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

  function showPasswordAlert(msg, type = "error") {
    if (!alertEl) return;
    alertEl.textContent = msg;
    alertEl.className = `auth-alert ${type}`;
    alertEl.style.display = "block";
  }

  if (newPass.length < 6) {
    showPasswordAlert("Password must be at least 6 characters long.");
    return;
  }
  if (newPass !== confirmPass) {
    showPasswordAlert("Passwords do not match. Please verify both fields.");
    return;
  }

  try {
    showPasswordAlert("Updating password…", "info");
    await cloudRequest("/auth/v1/user", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPass })
    });
    showPasswordAlert("✓ Password successfully updated!", "success");
    showToast("Password updated successfully! 🔒");
    if ($("#profile-new-password")) $("#profile-new-password").value = "";
    if ($("#profile-new-password-confirm")) $("#profile-new-password-confirm").value = "";
  } catch (err) {
    console.error("Password change failed:", err);
    showPasswordAlert(err.message || "Failed to update password. Please sign in again and retry.");
  }
}

async function saveProfileEmail() {
  const newEmail = $("#profile-new-email")?.value?.trim() || "";
  const alertEl = $("#profile-email-alert");

  function showEmailAlert(msg, type = "error") {
    if (!alertEl) return;
    alertEl.textContent = msg;
    alertEl.className = `auth-alert ${type}`;
    alertEl.style.display = "block";
  }

  if (!newEmail || !newEmail.includes("@")) {
    showEmailAlert("Please enter a valid email address.");
    return;
  }

  const user = getActiveUser();
  if (user && user.email.toLowerCase() === newEmail.toLowerCase()) {
    showEmailAlert("The new email address must be different from your current email.");
    return;
  }

  try {
    showEmailAlert("Updating email address…", "info");
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
    showEmailAlert("✓ Email update requested! If email confirmation is enabled on your Supabase project, check your new inbox to confirm the change.", "success");
    showToast("Email update requested! 📧");
    if ($("#profile-new-email")) $("#profile-new-email").value = "";
  } catch (err) {
    console.error("Email change failed:", err);
    showEmailAlert(err.message || "Failed to update email. Please check your connection and retry.");
  }
}

async function recoverOwnerWorkspace({ silent = false } = {}) {
  const session = getCloudSession();
  if (!session?.user?.id) return false;
  const user = getActiveUser();
  if (!isPrimaryOwner(user)) return false;

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
    loadSharedCollaborationsIntoState();
    await autoDiscoverCollaborativeProjects();
    await syncCloudWorkspace("pull");
    loadSharedCollaborationsIntoState();
    await autoDiscoverCollaborativeProjects();
    await syncCloudCollaborations().catch(() => {});
    loadSharedCollaborationsIntoState();
    await autoDiscoverCollaborativeProjects();
    syncSharedCollaborations();
    await persistState({ syncCloud: false });
  } catch (e) {
    console.warn("Initial sync pull notice", e);
  }

  updateUserUI();
  render();
  renderCloudConnection();

  const curUser = getActiveUser();
  if (isPrimaryOwner(curUser) && (!Array.isArray(state.projects) || state.projects.length === 0)) {
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
        loadSharedCollaborationsIntoState();
        await syncCloudCollaborations().catch(() => {});
        syncSharedCollaborations();
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
    syncSharedCollaborations();
    if (state.hasUserChanges && getCloudSession()) {
      await storeRemoteWorkspace().catch(() => {});
    }
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
  updateUserUI();
  render();
  renderCloudConnection();
  $("#user-menu-dialog")?.close();
  showToast("Signed out. Switched to clean workbench.");
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

function sanitizeCollaboratorWorkspace(user = null) {
  const u = user || getActiveUser();
  if (!u || isPrimaryOwner(u)) return false;

  let changed = false;
  const validProjects = [];
  const removedProjects = [];

  for (const p of state.projects) {
    if (!p || !p.id) continue;
    ensureProjectCreator(p);
    if (isDeletedProject(p.id)) {
      removedProjects.push(p);
      continue;
    }
    if (isUserCollaborator(p, u)) {
      validProjects.push(p);
    } else {
      removedProjects.push(p);
    }
  }

  if (removedProjects.length > 0 || state.projects.length !== validProjects.length) {
    state.projects = validProjects;
    changed = true;
  }

  const validProjectIds = new Set(validProjects.map(p => p.id));
  const validSkillIds = new Set();
  validProjects.forEach(p => (p.skillIds || []).forEach(sid => validSkillIds.add(sid)));

  const origActLen = (state.activity || []).length;
  state.activity = (state.activity || []).filter(a => {
    if (a.projectId && !validProjectIds.has(a.projectId)) return false;
    return true;
  });
  if (state.activity.length !== origActLen) changed = true;

  const origLogLen = (state.practiceLog || []).length;
  state.practiceLog = (state.practiceLog || []).filter(l => {
    if (l.projectId && !validProjectIds.has(l.projectId)) return false;
    return true;
  });
  if (state.practiceLog.length !== origLogLen) changed = true;

  const origSkillLen = (state.skills || []).length;
  state.skills = (state.skills || []).filter(s => {
    const hasValidPractice = (state.practiceLog || []).some(l => l.skillId === s.id && Number.isFinite(l.xp) && l.xp > 0);
    return validSkillIds.has(s.id) || hasValidPractice;
  });
  if (state.skills.length !== origSkillLen) changed = true;

  state.skills.forEach(s => {
    const userEarnedXp = (state.practiceLog || [])
      .filter(l => l.skillId === s.id && Number.isFinite(l.xp))
      .reduce((sum, l) => sum + (l.xp || 0), 0);
    if (s.xp !== userEarnedXp) {
      s.xp = userEarnedXp;
      changed = true;
    }
  });

  return changed;
}

async function loadUserScopedState() {
  const saved = await readSavedState();
  const backupIdeas = readIdeasBackup();
  if (saved) {
    state.projects = Array.isArray(saved.projects) ? saved.projects : [];
    let loadedIdeas = Array.isArray(saved.ideas) ? saved.ideas : [];
    if (backupIdeas && backupIdeas.length > 0) {
      loadedIdeas = mergeIdeas(loadedIdeas, backupIdeas);
    }
    if (loadedIdeas.length === 0) {
      loadedIdeas = [...STARTER_IDEAS];
    }
    state.ideas = loadedIdeas;
    saveIdeasBackup(state.ideas);
    state.skills = Array.isArray(saved.skills) ? saved.skills : [];
    state.activity = Array.isArray(saved.activity) ? saved.activity : [];
    state.practiceLog = Array.isArray(saved.practiceLog) ? saved.practiceLog : [];
    state.inventory = Array.isArray(saved.inventory) ? saved.inventory : [];
    state.depotRestockList = Array.isArray(saved.depotRestockList) ? saved.depotRestockList : [];
    state.customTemplates = Array.isArray(saved.customTemplates) ? saved.customTemplates : [];
    state.makerGoals = Array.isArray(saved.makerGoals) ? saved.makerGoals : [];
    state.maintenance = Array.isArray(saved.maintenance) ? saved.maintenance : [];
    state.currency = saved.currency || localStorage.getItem("workbench_currency") || "USD";
    state.unitSystem = saved.unitSystem || localStorage.getItem("workbench_unitSystem") || "in";
    state.deletedProjectIds = Array.isArray(saved.deletedProjectIds) ? saved.deletedProjectIds : getDeletedProjectIds();
    state.weeklyGoal = Number.isFinite(saved.weeklyGoal) ? saved.weeklyGoal : 60;

    for (const p of state.projects) {
      ensureProjectCreator(p);
    }

    loadSharedCollaborationsIntoState();
    syncSharedCollaborations();

    updateTopbarUnitsPill();
  } else {
    resetWorkspaceStateToDefault();
    if (backupIdeas && backupIdeas.length > 0) {
      state.ideas = backupIdeas;
    } else {
      state.ideas = [...STARTER_IDEAS];
    }
    saveIdeasBackup(state.ideas);
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
  return state.hasUserChanges || state.projects.length > 0 || state.skills.length > 0 || (state.practiceLog || []).length > 0 || (state.ideas || []).length > 0 || (state.inventory || []).length > 0;
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
        try {
          const blob = await cloudDownloadPhoto(image.cloudPath);
          image.blob = blob;
        } catch (photoErr) {
          console.warn("Could not download cloud photo:", image.cloudPath, photoErr);
        }
      }
    }
  }

  // Merge remote projects with existing collaborative projects so co-created projects are never lost
  const mergedProjectMap = new Map();
  for (const p of (state.projects || [])) {
    if (p?.id && isCollaborativeProject(p)) {
      mergedProjectMap.set(p.id, p);
    }
  }
  for (const sp of getSharedCollaborations()) {
    if (sp?.id && isCollaborativeProject(sp)) {
      const existing = mergedProjectMap.get(sp.id);
      if (!existing || new Date(sp.updatedAt || 0) >= new Date(existing.updatedAt || 0)) {
        mergedProjectMap.set(sp.id, sp);
      }
    }
  }
  for (const rp of remoteState.projects) {
    if (rp?.id) {
      const existing = mergedProjectMap.get(rp.id);
      if (!existing || new Date(rp.updatedAt || 0) >= new Date(existing.updatedAt || 0)) {
        mergedProjectMap.set(rp.id, rp);
      }
    }
  }
  remoteState.projects = Array.from(mergedProjectMap.values());

  // Merge remote ideas with local ideas and backup ideas so idea brainstorms are never lost
  const backupIdeas = readIdeasBackup();
  let baseIdeas = state.ideas || [];
  if (backupIdeas && backupIdeas.length > 0) {
    baseIdeas = mergeIdeas(baseIdeas, backupIdeas);
  }
  if (Array.isArray(remoteState.ideas)) {
    remoteState.ideas = mergeIdeas(baseIdeas, remoteState.ideas);
  } else {
    remoteState.ideas = baseIdeas.length ? baseIdeas : [...STARTER_IDEAS];
  }
  saveIdeasBackup(remoteState.ideas);

  Object.assign(state, remoteState, { updatedAt: remote.updated_at });
  state.starterSkillsAdded = true;
  state.hasUserChanges = remoteState.hasUserChanges === true;
  state.currency = remoteState.currency || state.currency || localStorage.getItem("workbench_currency") || "USD";
  state.unitSystem = remoteState.unitSystem || state.unitSystem || localStorage.getItem("workbench_unitSystem") || "in";
  updateTopbarUnitsPill();

  for (const p of state.projects) {
    ensureProjectCreator(p);
  }
  loadSharedCollaborationsIntoState();
  syncSharedCollaborations();

  const curUser = getActiveUser();
  if (!isPrimaryOwner(curUser) && !adminInspectionActive) {
    const changed = sanitizeCollaboratorWorkspace(curUser);
    if (changed) {
      await persistState({ syncCloud: true });
    }
  }
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
      await reconcileProjectOwnership().catch(() => {});
      return;
    }
    if (choice === "push") {
      await storeRemoteWorkspace();
      await syncCloudCollaborations().catch(() => {});
      await reconcileProjectOwnership().catch(() => {});
      return;
    }
    if (!remote) {
      await storeRemoteWorkspace();
      cloudMessage("Cloud sync is ready. This browser’s workspace is now backed up.", "connected");
      await syncCloudCollaborations().catch(() => {});
      await reconcileProjectOwnership().catch(() => {});
      return;
    }
    const marker = readSyncMarker(session.user.id);
    if (!hasLocal) {
      await loadRemoteWorkspace(remote);


      cloudMessage("Cloud workspace loaded on this browser.", "connected");
      await syncCloudCollaborations().catch(() => {});
      await reconcileProjectOwnership().catch(() => {});
      return;
    }
    if (!marker) {
      // First sync with existing remote: seamlessly merge remote workspace into local workspace
      await loadRemoteWorkspace(remote);
      await storeRemoteWorkspace();
      cloudMessage("Cloud and browser workspaces synchronized.", "connected");
      await syncCloudCollaborations().catch(() => {});
      await reconcileProjectOwnership().catch(() => {});
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
  restored.projects = restored.projects.map(p => sanitizeProjectObject(p)).filter(Boolean);
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
  state.ideas = Array.isArray(restored.ideas) ? restored.ideas : [];
  state.skills = restored.skills;
  state.activity = Array.isArray(restored.activity) ? restored.activity : [];
  state.practiceLog = restored.practiceLog;
  state.inventory = Array.isArray(restored.inventory) ? restored.inventory : [];
  state.depotRestockList = Array.isArray(restored.depotRestockList) ? restored.depotRestockList : [];
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
  renderIdeasView();
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
  if (activeProjectId && $("#detail-dialog")?.open) renderProjectDetail(activeProjectId);
}

function renderNavigation() {
  const projCount = $("#nav-project-count");
  if (projCount) projCount.textContent = state.projects.length;
  const ideasCount = $("#nav-ideas-count");
  if (ideasCount) {
    ideasCount.textContent = (state.ideas || []).filter(i => i.status !== "archived").length;
  }
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
  return `<div class="empty-state"><div class="empty-state-mark">✳</div><h3>${escapeHTML(title)}</h3><p>${escapeHTML(description)}</p><button class="button button-primary" data-action="${escapeHTML(action)}">＋ ${escapeHTML(buttonText)}</button></div>`;
}

function renderProjects() {
  renderSkillFilterPills();
  renderTagFilterPills();
  const query = ($("#project-search")?.value || "").trim().toLowerCase();
  const filter = $("#project-status-filter")?.value || "all";
  const collabOpt = $("#project-status-filter option[value='collaborative']");
  if (collabOpt) {
    const collabCount = (state.projects || []).filter(isCollaborativeProject).length;
    collabOpt.textContent = `👥 Collaborative (${collabCount})`;
  }
  const priorityFilter = $("#project-priority-filter")?.value || "all";
  const sort = $("#project-sort")?.value || "updated";
  const filtered = [...state.projects]
    .filter(project => {
      if (filter === "all") return true;
      if (filter === "pinned") return project.pinned === true;
      if (filter === "collaborative") return isCollaborativeProject(project);
      if (filter === "gift") return Boolean(project.isGift);
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
      const giftStr = project.isGift ? `gift ${project.giftRecipient || ""} ${project.giftOccasion || ""}` : "";
      const isCollabKeyword = isCollaborativeProject(project) && (query.includes("collab") || query.includes("shared") || query.includes("team"));
      const combined = `${project.title} ${project.description} ${tagsStr} ${skillsStr} ${creatorStr} ${collabStr} ${giftStr}`.toLowerCase();
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
        const isSecret = Boolean(project.isGift && project.giftSecret);
        const isRevealed = revealedSecretProjectIds.has(project.id);
        const secretShieldClass = (isSecret && !isRevealed) ? "is-gift-secret" : (isSecret && isRevealed) ? "is-gift-secret is-revealed" : "";
        const countdownInfo = project.giftDeadline ? formatGiftCountdown(project.giftDeadline) : null;

        return `<article class="project-card ${project.pinned ? "is-pinned" : ""} ${secretShieldClass}" data-project="${project.id}" tabindex="0" role="button" aria-label="Open ${escapeHTML(project.title)}">
          <div class="project-card-head">
            <div class="project-card-mark">${["✳", "⌘", "◈", "✿"][index % 4]}</div>
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              ${isCollaborativeProject(project) ? `<span class="collab-badge" title="Collaborative project with ${(project.coCreators || []).length + 1} members">👥 Team (${(project.coCreators || []).length + 1})</span>${(() => {
                const ur = getProjectUserRole(project);
                return ur ? `<span class="collab-role-pill ${ur.className}" title="Your role: ${ur.role}">${ur.label}</span>` : "";
              })()}` : ""}
              ${project.pinned ? `<span class="pin-badge">★ Pinned</span>` : ""}
              ${project.isGift ? `<span class="gift-badge" title="Handmade gift for ${escapeHTML(project.giftRecipient || "Someone")}">🎁 For ${escapeHTML(project.giftRecipient || "Someone")}</span>` : ""}
              ${countdownInfo ? `<span class="gift-countdown-pill ${countdownInfo.className}" title="Gift handover deadline">${countdownInfo.text}</span>` : ""}
              <button type="button" class="pin-toggle-btn ${project.pinned ? "active" : ""}" data-action="toggle-pin" data-project="${project.id}" title="${project.pinned ? "Unpin project" : "Pin project to top"}" aria-label="${project.pinned ? "Unpin project" : "Pin project to top"}">★</button>
              <span class="status-pill status-${safeStatus(project.status)}">${STATUS_LABELS[safeStatus(project.status)]}</span>
            </div>
          </div>
          ${isSecret ? `
            <div class="secret-gift-overlay" data-action="toggle-secret-reveal" data-project="${project.id}" title="Click to toggle peek">
              <span>🎁 Secret Surprise (${escapeHTML(project.giftRecipient || "Gift")})</span>
              <span>${isRevealed ? "🛡️ Shield" : "👁️ Reveal"}</span>
            </div>
          ` : ""}
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

      if (uid !== user.id && !isPrimaryUser) {
        const inspectedUser = { id: uid, email, displayName };
        projects = projects.filter(pr => isUserCollaborator(pr, inspectedUser) && !isDeletedProject(pr.id));
        const validSkillIds = new Set(projects.flatMap(pr => pr.skillIds || []));
        skills = skills.filter(sk => validSkillIds.has(sk.id));
      }


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
    const inspectedUser = { id: targetUserId, email: remote?.data?.owner?.email, displayName: targetUserName };
    if (!isPrimaryOwner(inspectedUser)) {
      state.projects = (state.projects || []).filter(p => isUserCollaborator(p, inspectedUser) && !isDeletedProject(p.id));
      const validSkillIds = new Set(state.projects.flatMap(p => p.skillIds || []));
      state.skills = (state.skills || []).filter(s => validSkillIds.has(s.id));
      state.activity = (state.activity || []).filter(a => !a.projectId || state.projects.some(p => p.id === a.projectId));
      state.practiceLog = (state.practiceLog || []).filter(l => !l.projectId || state.projects.some(p => p.id === l.projectId));
    }



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


if (typeof window !== "undefined") {
  window.getCloudConfig = getCloudConfig;
  window.getCloudSession = getCloudSession;
  window.saveCloudSession = saveCloudSession;
  window.clearCloudSession = clearCloudSession;
  window.getActiveUser = getActiveUser;
  window.getActiveStateKey = getActiveStateKey;
  window.loadUserScopedState = loadUserScopedState;
  window.updateUserUI = updateUserUI;
  window.syncCloudWorkspace = syncCloudWorkspace;
  window.storeRemoteWorkspace = storeRemoteWorkspace;
  window.loadRemoteWorkspace = loadRemoteWorkspace;
  window.resetWorkspaceStateToDefault = resetWorkspaceStateToDefault;
}
