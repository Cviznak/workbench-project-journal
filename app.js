/* ============================================================
   Workbench Project Journal - Application Coordinator & Router
   ============================================================ */

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


function switchView(view, { updateHistory = true, scroll = true } = {}) {
  const targetView = VALID_APP_VIEWS.has(view) ? view : "overview";
  $$(".view-section").forEach(section => section.classList.toggle("active", section.id === `${targetView}-view`));
  $$(".nav-link").forEach(link => link.classList.toggle("active", link.dataset.view === targetView));

  const studioViews = new Set(["woodworking", "textiles", "music", "electronics", "programming", "art", "resin", "printing", "origami", "laser", "leather", "ceramics", "welding", "cnc", "blacksmith", "fasteners", "glass", "jewelry", "bookbinding", "sla", "luthier", "composites", "horology", "robotics", "bicycle", "candle", "perfume", "letter", "distillation"]);
  $$(".mobile-nav-btn").forEach(btn => {
    if (btn.dataset.view) {
      btn.classList.toggle("active", btn.dataset.view === targetView);
    } else if (btn.dataset.action === "open-mobile-studios-sheet") {
      btn.classList.toggle("active", studioViews.has(targetView));
    }
  });

  // Ensure containing sidebar section is uncollapsed when navigated into
  if (studioViews.has(targetView)) {
    const studiosSec = $("#sidebar-section-craft-studios");
    if (studiosSec?.classList.contains("collapsed")) {
      studiosSec.classList.remove("collapsed");
      $("[data-action='toggle-sidebar-section'][data-section='craft-studios']")?.setAttribute("aria-expanded", "true");
    }
  } else {
    const spaceSec = $("#sidebar-section-your-space");
    if (spaceSec?.classList.contains("collapsed")) {
      spaceSec.classList.remove("collapsed");
      $("[data-action='toggle-sidebar-section'][data-section='your-space']")?.setAttribute("aria-expanded", "true");
    }
  }

  // Close mobile navigation drawer if open
  $(".sidebar")?.classList.remove("open");
  $("#sidebar-backdrop")?.classList.remove("visible");
  const title = {
    overview: "Overview",
    projects: "Projects",
    ideas: "Project Ideas & Inspiration",
    skills: "Skills",
    gallery: "Gallery",
    planner: "Planner",
    sync: "Sync & backup",
    timeline: "Activity & Journal",
    shopping: "Shopping list",
    inventory: "Inventory",
    admin: "Admin Console",
    woodworking: "Woodworking Studio",
    textiles: "Textiles & Yarn Studio",
    music: "Music & Audio Studio",
    electronics: "Electronics Studio",
    programming: "Programming Studio",
    art: "Art & Design Studio",
    resin: "Epoxy & Silicone Studio",
    printing: "3D Printing Studio",
    origami: "Origami & Papercraft Studio",
    laser: "Laser Cutting & Engraving Studio",
    leather: "Leathercraft & Stitching Studio",
    ceramics: "Ceramics & Pottery Studio",
    welding: "Welding & Metal Fabrication Studio",
    cnc: "CNC Machining & Milling Studio",
    blacksmith: "Blacksmithing & Bladesmithing Studio",
    fasteners: "Fasteners & Machining Drills",
    glass: "Stained Glass & Copper Foil Studio",
    jewelry: "Jewelry Making & Metalsmithing",
    bookbinding: "Bookbinding & Printmaking Studio",
    sla: "Resin 3D Printing (SLA / MSLA) Studio",
    luthier: "Luthier & Instrument Building Studio",
    composites: "Composites & Carbon Fiber Fabrication Studio",
    horology: "Watchmaking & Horology Studio",
    robotics: "Robotics & Mechatronics Studio",
    bicycle: "Bicycle Framebuilding & Wheel Studio",
    candle: "Candle Making Studio",
    perfume: "Perfume & Fragrance Studio",
    letter: "Letter Planning & Wax Seal Studio",
    distillation: "Botanical Distillation & Extracts Studio"
  }[targetView] || "Overview";
  const crumb = $("#page-crumb");
  if (crumb) crumb.textContent = title;
  updateUserUI();

  try {
    localStorage.setItem(ACTIVE_VIEW_STORAGE_KEY, targetView);
  } catch {}

  if (updateHistory) {
    const curHash = window.location.hash || "";
    if (!curHash.startsWith("#project=") && !curHash.startsWith("#project/") && !curHash.startsWith("#tool=") && !curHash.startsWith("#setup") && !curHash.startsWith("#join")) {
      try {
        history.replaceState(null, "", `#${targetView}`);
      } catch {}
    }
  }

  if (targetView === "ideas") renderIdeasView();
  if (targetView === "sync") renderCloudConnection();
  if (targetView === "timeline") renderTimeline();
  if (targetView === "shopping") renderShoppingList();
  if (targetView === "inventory") renderInventory();
  if (targetView === "admin") renderAdminHub();
  if (targetView === "music") renderMusicStudioView();
  if (targetView === "woodworking") renderWoodworkingView();
  if (targetView === "textiles") renderTextilesView();
  if (targetView === "electronics") renderElectronicsView();
  if (targetView === "programming") renderProgrammingView();
  if (targetView === "art") renderArtView();
  if (targetView === "printing") renderSpoolRack();
  if (targetView === "origami") renderOrigamiView();
  if (targetView === "laser") renderLaserView();
  if (targetView === "leather") renderLeatherView();
  if (targetView === "ceramics") renderCeramicsView();
  if (targetView === "welding") renderWeldingView();
  if (targetView === "cnc") renderCncView();
  if (targetView === "blacksmith") renderBlacksmithView();
  if (targetView === "fasteners") renderFastenersView();
  if (targetView === "glass") renderGlassView();
  if (targetView === "jewelry") renderJewelryView();
  if (targetView === "bookbinding") renderBookbindingView();
  if (targetView === "sla") renderSlaView();
  if (targetView === "luthier") renderLuthierView();
  if (targetView === "composites") renderCompositesView();
  if (targetView === "horology") renderHorologyView();
  if (targetView === "robotics") renderRoboticsView();
  if (targetView === "bicycle") renderBicycleView();
  if (targetView === "candle") renderCandleView();
  if (targetView === "perfume") renderPerfumeView();
  if (targetView === "letter") renderLetterView();
  if (targetView === "distillation") renderDistillationView();

  // Safely stop background media streams & audio when navigating away from studios
  if (targetView !== "art") {
    if (typeof artCameraState !== "undefined" && artCameraState.isActive && typeof stopArtCamera === "function") {
      stopArtCamera();
    }
  }
  if (targetView !== "music") {
    if (typeof micTunerState !== "undefined" && micTunerState.isActive && typeof stopMicTuner === "function") {
      stopMicTuner();
    }
    if (typeof beatSeqState !== "undefined" && beatSeqState.isPlaying && typeof toggleBeatSequencer === "function") {
      toggleBeatSequencer();
    }
  }

  if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
}


function checkHashRouting() {
  const hash = window.location.hash || "";

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
      const raw = decodeBase64Utf8(teamMatch[1]);
      if (raw) {
        const data = JSON.parse(raw);
        const incomingProject = sanitizeProjectObject(data?.p);
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
          switchView("projects", { updateHistory: false, scroll: false });
          openProjectDetail(incomingProject.id);
          showToast(`👥 Joined team project: ${incomingProject.title}!`);
          return;
        }
      }
    } catch (e) {
      console.warn("Could not import team project from link:", e);
    }
  }

  const projectMatch = hash.match(/^#project[=/]([a-zA-Z0-9_-]+)/);
  if (projectMatch) {
    const pid = projectMatch[1];
    switchView("projects", { updateHistory: false, scroll: false });
    openProjectDetail(pid);
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
  const toolMatch = hash.match(/^#tool=([a-zA-Z0-9_-]+)/);
  if (toolMatch) {
    switchView("inventory", { updateHistory: false, scroll: false });
    openEquipmentLogbook(toolMatch[1]);
    return;
  }

  // Check if hash matches any valid view name: e.g. #skills, #projects, #inventory, #shopping, #gallery, #planner, #timeline, #admin, #sync, #overview
  const cleanHash = hash.replace(/^#\/?/, "").replace(/^view=/, "").toLowerCase().trim();
  if (cleanHash && VALID_APP_VIEWS.has(cleanHash)) {
    switchView(cleanHash, { updateHistory: false, scroll: false });
    return;
  }

  // If no hash in URL or unrecognized hash, restore the saved view from localStorage!
  let savedView = null;
  try {
    savedView = localStorage.getItem(ACTIVE_VIEW_STORAGE_KEY);
  } catch {}
  if (savedView && VALID_APP_VIEWS.has(savedView) && savedView !== "overview") {
    switchView(savedView, { updateHistory: true, scroll: false });
  }
}


/* 📐 Sidebar Minimize / Collapse (Desktop & Tablet) */
const SIDEBAR_MINIMIZED_KEY = "workbench_sidebar_minimized";

function initSidebarMinimize() {
  try {
    const isMin = localStorage.getItem(SIDEBAR_MINIMIZED_KEY) === "true";
    if (isMin && window.innerWidth > 768) {
      $(".app-shell")?.classList.add("sidebar-minimized");
      updateSidebarCollapseBtn(true);
    }
  } catch {}
}

function toggleSidebarMinimize() {
  const shell = $(".app-shell");
  if (!shell) return;
  const isNowMin = shell.classList.toggle("sidebar-minimized");
  try {
    localStorage.setItem(SIDEBAR_MINIMIZED_KEY, isNowMin ? "true" : "false");
  } catch {}
  updateSidebarCollapseBtn(isNowMin);
  showToast(isNowMin ? "Sidebar minimized." : "Sidebar expanded.");
}

function updateSidebarCollapseBtn(isMin) {
  const btn = $("#sidebar-collapse-toggle-btn");
  if (btn) {
    btn.title = isMin ? "Expand sidebar (Ctrl+[)" : "Minimize sidebar (Ctrl+[)";
    btn.setAttribute("aria-expanded", isMin ? "false" : "true");
    const icon = btn.querySelector(".sidebar-collapse-icon");
    if (icon) icon.textContent = isMin ? "⇥" : "⇤";
  }
}

/* 📂 Collapsible Sidebar Group Sections (Your Space & Craft Studios) */
function toggleSidebarSection(sectionName) {
  const sec = $(`#sidebar-section-${sectionName}`);
  const btn = $(`[data-action="toggle-sidebar-section"][data-section="${sectionName}"]`);
  if (!sec) return;
  const isNowCollapsed = !sec.classList.contains("collapsed");
  sec.classList.toggle("collapsed", isNowCollapsed);
  if (btn) btn.setAttribute("aria-expanded", isNowCollapsed ? "false" : "true");
  try {
    localStorage.setItem(`workbench_sidebar_${sectionName}_collapsed`, isNowCollapsed ? "true" : "false");
  } catch {}
}

function restoreSidebarSections() {
  ["your-space", "craft-studios", "workshop-suites"].forEach(sec => {
    try {
      const saved = localStorage.getItem(`workbench_sidebar_${sec}_collapsed`);
      if (saved === "true") {
        const el = $(`#sidebar-section-${sec}`);
        const btn = $(`[data-action="toggle-sidebar-section"][data-section="${sec}"]`);
        if (el) el.classList.add("collapsed");
        if (btn) btn.setAttribute("aria-expanded", "false");
      }
    } catch {}
  });
}


async function handleAction(action, target) {
  if (target?.closest(".sidebar") && action !== "toggle-sidebar-section" && action !== "toggle-sidebar-minimize") {
    $(".sidebar")?.classList.remove("open");
    $("#sidebar-backdrop")?.classList.remove("visible");
  }
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
      "dictate-task", "add-task", "assign-task-phase", "add-project-phase", "pick-from-inventory", "add-material",
      "delete-material", "add-journal", "delete-journal",
      "add-co-creator", "remove-co-creator", "toggle-co-creator-role", "pass-creator-status",
      "save-inventory", "delete-inventory", "commit-inventory-csv", "save-maintenance", "delete-maintenance"
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
  if (action === "toggle-sidebar-minimize") {
    toggleSidebarMinimize();
    return;
  }
  if (action === "toggle-mobile-sidebar") {
    const sb = $(".sidebar");
    const bd = $("#sidebar-backdrop");
    const isOpen = sb?.classList.toggle("open");
    bd?.classList.toggle("visible", !!isOpen);
    return;
  }
  if (action === "close-mobile-sidebar") {
    $(".sidebar")?.classList.remove("open");
    $("#sidebar-backdrop")?.classList.remove("visible");
    return;
  }
  if (action === "new-idea") {
    openIdeaDialog();
    return;
  }
  if (action === "edit-idea") {
    openIdeaDialog(target.dataset.ideaId || id);
    return;
  }
  if (action === "delete-idea") {
    deleteIdea(target.dataset.ideaId || id);
    return;
  }
  if (action === "promote-idea") {
    promoteIdeaToProject(target.dataset.ideaId || id);
    return;
  }
  if (action === "spark-random-idea") {
    sparkRandomIdea();
    return;
  }
  if (action === "refresh-sparks") {
    renderCuratedSparks();
    return;
  }
  if (action === "adopt-spark") {
    adoptSparkIdea(target.dataset.sparkId);
    return;
  }
  if (action === "open-promoted-project") {
    const projId = target.dataset.projectId;
    if (projId) {
      switchView("projects");
      renderProjectDetail(projId);
      $("#detail-dialog")?.showModal();
    }
    return;
  }
  if (action === "open-mobile-studios-sheet") {
    const filterInput = $("#mobile-studio-filter");
    if (filterInput) {
      filterInput.value = "";
      $$("#mobile-studios-grid .mobile-studio-card").forEach(el => el.classList.remove("hidden-studio"));
    }
    $("#mobile-studios-dialog")?.showModal();
    return;
  }
  if (action === "select-mobile-studio") {
    const view = target.dataset.view || target.closest("[data-view]")?.dataset.view;
    if (view) {
      $("#mobile-studios-dialog")?.close();
      switchView(view);
    }
    return;
  }
  if (action === "minimize-timer") {
    minimizeTimer();
    return;
  }
  if (action === "restore-timer") {
    restoreTimer();
    return;
  }
  if (action === "toggle-floating-timer") {
    toggleTimer();
    return;
  }
  if (action === "close-floating-timer") {
    closeFloatingTimer();
    return;
  }
  if (action === "open-gift-hub") {
    openGiftHubDialog(target.dataset.tab || "tracker");
    return;
  }
  if (action === "new-gift-project") {
    $("#gift-hub-dialog")?.close();
    openProjectForm({ isGift: true, giftStatus: "planning", giftOccasion: "birthday" });
    return;
  }
  if (action === "open-gift-tag") {
    const projId = target.dataset.id || target.dataset.project || activeProjectId;
    openGiftTagDialog(projId);
    return;
  }
  if (action === "open-gift-calc") {
    const projId = target.dataset.id || target.dataset.project || activeProjectId;
    const p = state.projects.find(x => x.id === projId);
    if (p && p.giftBoxLength && $("#gift-calc-l")) $("#gift-calc-l").value = p.giftBoxLength;
    if (p && p.giftBoxWidth && $("#gift-calc-w")) $("#gift-calc-w").value = p.giftBoxWidth;
    if (p && p.giftBoxHeight && $("#gift-calc-h")) $("#gift-calc-h").value = p.giftBoxHeight;
    openGiftHubDialog("calc");
    return;
  }
  if (action === "toggle-secret-reveal") {
    const pid = target.dataset.project;
    if (pid) {
      if (revealedSecretProjectIds.has(pid)) {
        revealedSecretProjectIds.delete(pid);
      } else {
        revealedSecretProjectIds.add(pid);
      }
      renderProjects();
    }
    return;
  }
  if (action === "toggle-project-gift-secret") {
    const pid = target.dataset.id || target.dataset.project || activeProjectId;
    const p = state.projects.find(x => x.id === pid);
    if (p) {
      p.giftSecret = !p.giftSecret;
      p.updatedAt = new Date().toISOString();
      await persistState();
      renderProjects();
      if (activeProjectId === p.id) renderProjectDetail(p.id);
      showToast(p.giftSecret ? "Surprise gift privacy shield active." : "Surprise shield turned off.");
    }
    return;
  }
  if (action === "set-gift-tab") {
    setGiftHubTab(target.dataset.tab || "tracker");
    return;
  }
  if (action === "set-gift-status") {
    const pid = target.dataset.project;
    const p = state.projects.find(x => x.id === pid);
    if (p) {
      p.giftStatus = target.value;
      p.updatedAt = new Date().toISOString();
      await persistState();
      renderProjects();
      if (activeProjectId === p.id) renderProjectDetail(p.id);
      renderGiftHub();
      showToast(`Gift status updated to “${p.giftStatus}”.`);
    }
    return;
  }
  if (action === "filter-gifts") {
    giftActiveFilter = target.dataset.filter || "all";
    renderGiftProjectsList();
    return;
  }
  if (action === "print-gift-tag") {
    printGiftTag();
    return;
  }
  if (action === "copy-gift-tag-text") {
    copyGiftTagText();
    return;
  }
  if (action === "set-gift-calc-unit") {
    giftCalcUnit = target.dataset.unit || "in";
    $$(".unit-pill").forEach(pill => pill.classList.toggle("active", pill.dataset.unit === giftCalcUnit));
    updateGiftWrappingCalc();
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
        if ($("#detail-dialog")?.open) renderProjectDetail(project.id);
        showToast(material.status === "have" ? `Marked ${material.name} as in hand!` : `Marked ${material.name} as needed.`);
      } catch (e) {
        console.error(e);
      }
    }
    return;
  }
  if (action === "open-inventory-dialog") {
    openInventoryDialog(id ? (state.inventory || []).find(i => i.id === id) : null, target.dataset.type || "material");
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
    openInventoryPickDialog(id || null, target.dataset.project || null);
    return;
  }
  if (action === "checkin-equipment") {
    void checkinEquipment(id);
    return;
  }
  if (action === "schedule-tool-care") {
    scheduleToolCare(id);
    return;
  }
  if (action === "export-inventory-csv") {
    exportInventoryCSV();
    return;
  }
  if (action === "open-import-inventory-dialog") {
    openImportInventoryDialog();
    return;
  }
  if (action === "parse-inventory-csv") {
    parseInventoryCSV();
    return;
  }
  if (action === "load-inventory-csv-sample") {
    loadInventoryCSVSample();
    return;
  }
  if (action === "commit-inventory-csv") {
    void commitInventoryCSVImport();
    return;
  }
  if (action === "toggle-inventory-alerts") {
    state.inventoryAlertsOnly = !state.inventoryAlertsOnly;
    target.classList.toggle("button-primary", state.inventoryAlertsOnly);
    target.classList.toggle("button-outline", !state.inventoryAlertsOnly);
    renderInventory();
    return;
  }
  if (action === "open-starter-kits") {
    openStarterKitsDialog();
    return;
  }
  if (action === "import-starter-kit") {
    const kitKey = target.dataset.kit || target.dataset.kitId;
    if (kitKey) void importStarterKit(kitKey);
    return;
  }
  if (action === "restock-low-stock") {
    restockLowStockMaterials();
    return;
  }
  if (action === "restock-material") {
    restockLowStockMaterials(id || target.dataset.id);
    return;
  }
  if (action === "complete-depot-restock") {
    const qty = parseFloat(target.dataset.qty) || 1;
    void completeDepotRestock(id || target.dataset.id, qty);
    return;
  }
  if (action === "dismiss-depot-restock") {
    void dismissDepotRestock(id || target.dataset.id);
    return;
  }
  if (action === "open-equipment-logbook") {
    openEquipmentLogbook(id || target.dataset.id);
    return;
  }
  if (action === "quick-log-service") {
    void quickLogServiceForTool(id || target.dataset.id);
    return;
  }
  if (action === "print-equipment-tags") {
    printAllEquipmentTags();
    return;
  }
  if (action === "open-tool-tag") {
    openSingleToolTag(id || target.dataset.id);
    return;
  }
  if (action === "print-single-tool-tag") {
    const equipId = target.dataset.id || id;
    if (equipId) {
      openSingleToolTag(equipId);
      setTimeout(() => window.print(), 250);
    }
    return;
  }
  if (action === "trigger-print-tags") {
    window.print();
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
  if (action === "open-workshop-blueprint") {
    openWorkshopBlueprint(id || target.dataset.project || activeProjectId);
    return;
  }
  if (action === "open-quote-dialog") {
    openQuoteDialog(id || target.dataset.project || activeProjectId);
    return;
  }
  if (action === "export-project-binder") {
    exportProjectBinder(id || target.dataset.project || target.dataset.id || activeProjectId);
    return;
  }
  if (action === "check-materials-inventory") {
    checkMaterialsInventory(id || target.dataset.project || target.dataset.id || activeProjectId);
    return;
  }
  if (action === "add-missing-materials-to-restock") {
    addMissingMaterialsToRestock(id || target.dataset.project || target.dataset.id || activeProjectId);
    return;
  }
  if (action === "print-quote-invoice") {
    printQuoteInvoice();
    return;
  }
  if (action === "download-quote-invoice") {
    downloadQuoteInvoiceHTML();
    return;
  }
  if (action === "copy-quote-summary") {
    copyQuoteSummary();
    return;
  }
  if (action === "set-quote-mode") {
    setQuoteMode(target.dataset.mode);
    return;
  }
  if (action === "copy-cnc-specs") {
    const gcode = target.dataset.gcode || $("#cnc-result")?.innerText || "";
    if (gcode) {
      void navigator.clipboard.writeText(gcode).then(() => showToast("Copied CNC Feed & Speed G-Code settings!"));
    }
    return;
  }
  if (action === "copy-serial-crc") {
    const hex = target.dataset.hex || "";
    if (hex) {
      void navigator.clipboard.writeText(hex).then(() => showToast(`Copied ${hex} to clipboard!`));
    }
    return;
  }
  if (action === "copy-distill-specs") {
    const steam = $("#distill-steam-result")?.innerText || "";
    const ext = $("#distill-extract-result")?.innerText || "";
    const text = `🌿 BOTANICAL DISTILLATION & EXTRACTS SPEC SHEET\n\n${steam}\n\n${ext}`;
    void navigator.clipboard.writeText(text).then(() => showToast("Copied Distillation specs to clipboard!"));
    return;
  }
  if (action === "export-oil-to-perfume") {
    switchView("perfume");
    showToast("🌸 Transferred extracted botanical oil to Perfume Studio!");
    return;
  }
  if (action === "export-oil-to-candle") {
    switchView("candle");
    showToast("🕯️ Transferred essential oil fragrance profile to Candle Studio!");
    return;
  }
  if (action === "add-distill-to-materials") {
    await addMaterialToProjectShopping("Copper Alembic Still & Florentine Essencier Receiver Kit", "1 set", 85.00, "Distillation & Extracts");
    return;
  }
  if (action === "save-distill-run") {
    saveDistillationRun();
    return;
  }
  if (action === "delete-distill-run") {
    const idx = parseInt(target.dataset.index, 10);
    deleteDistillationRun(idx);
    return;
  }
  if (action === "copy-candle-recipe") {
    const text = $("#candle-calc-result")?.innerText || "";
    if (text) void navigator.clipboard.writeText(text).then(() => showToast("Copied Candle Recipe to clipboard!"));
    return;
  }
  if (action === "print-candle-label") {
    const text = $("#candle-label-result")?.innerText || "";
    if (text) void navigator.clipboard.writeText(text).then(() => showToast("Copied ASTM Caution Label to clipboard!"));
    return;
  }
  if (action === "add-candle-to-materials") {
    await addMaterialToProjectShopping("Golden Wax 464 Soy Wax (5 lb bag) & Cotton Wicks", "1 kit", 24.50, "Candle Studio & Scents");
    return;
  }
  if (action === "copy-perfume-formula") {
    const dil = $("#perfume-dilution-result")?.innerText || "";
    const pyr = $("#perfume-pyramid-result")?.innerText || "";
    const text = `🌸 PERFUME FORMULATION SPEC SHEET\n\n${dil}\n\n${pyr}`;
    void navigator.clipboard.writeText(text).then(() => showToast("Copied Perfume Formula to clipboard!"));
    return;
  }
  if (action === "add-perfume-to-materials") {
    await addMaterialToProjectShopping("Perfumer's Alcohol SDA 40-B & Aromatic Accord Set", "1 set", 38.00, "Perfumery & Scents");
    return;
  }
  if (action === "save-perfume-log") {
    showToast("Formula saved to your Local Perfume Compounding Journal!");
    return;
  }
  if (action === "copy-letter-draft") {
    const text = $("#letter-body-text")?.value || "";
    if (text) void navigator.clipboard.writeText(text).then(() => showToast("Copied Letter Text to clipboard!"));
    return;
  }
  if (action === "print-letter-sheet") {
    window.print();
    return;
  }
  if (action === "copy-seal-recipe") {
    const text = $("#wax-seal-result")?.innerText || "";
    if (text) void navigator.clipboard.writeText(text).then(() => showToast("Copied Wax Seal Recipe!"));
    return;
  }
  if (action === "add-letter-to-materials") {
    await addMaterialToProjectShopping("Handmade Cotton Rag Paper & Flexible Sealing Wax Set", "1 set", 22.50, "Letter Studio & Wax Seals");
    return;
  }
  if (action === "copy-resin-mix") {
    const recipe = target.dataset.recipe || $("#resin-result")?.innerText || "";
    if (recipe) {
      void navigator.clipboard.writeText(recipe).then(() => showToast("Copied Resin & Silicone mix recipe!"));
    }
    return;
  }
  if (action === "toggle-sidebar-section") {
    const sec = target.dataset.section || target.closest("[data-section]")?.dataset.section;
    if (sec) toggleSidebarSection(sec);
    return;
  }
  if (action === "copy-print-quote") {
    const quoteTxt = $("#print-cost-result")?.innerText || "";
    if (quoteTxt) {
      void navigator.clipboard.writeText(quoteTxt).then(() => showToast("Copied 3D print cost quote to clipboard!"));
    }
    return;
  }
  if (action === "copy-print-specs") {
    const specs = $("#print-flow-result")?.innerText || "";
    if (specs) {
      void navigator.clipboard.writeText(specs).then(() => showToast("Copied 3D print flow specs to clipboard!"));
    }
    return;
  }
  if (action === "open-add-spool-dialog") {
    openAddSpoolDialog();
    return;
  }
  if (action === "close-spool-dialog") {
    closeSpoolDialog();
    return;
  }
  if (action === "edit-spool") {
    openAddSpoolDialog(target.dataset.id || id);
    return;
  }
  if (action === "delete-spool") {
    void deleteSpool(target.dataset.id || id);
    return;
  }
  if (action === "delete-spool-from-modal") {
    const modalId = $("#spool-form input[name='id']")?.value;
    if (modalId) void deleteSpool(modalId);
    return;
  }
  if (action === "weigh-spool") {
    openWeighSpoolDialog(target.dataset.id || id);
    return;
  }
  if (action === "close-spool-weigh-dialog") {
    closeWeighSpoolDialog();
    return;
  }
  if (action === "load-spool-to-calc") {
    loadSpoolToCostCalc(target.dataset.id || id);
    return;
  }
  if (action === "quick-add-sample-spools") {
    void quickAddSampleSpools();
    return;
  }
  if (action === "deduct-job-from-spool") {
    const spoolId = target.dataset.spoolId;
    const weightG = parseFloat(target.dataset.weight) || 0;
    void deductJobFromSpool(spoolId, weightG);
    return;
  }
  if (action === "origami-prev-step") {
    origamiPrevStep();
    return;
  }
  if (action === "origami-next-step") {
    origamiNextStep();
    return;
  }
  if (action === "origami-restart") {
    origamiRestart();
    return;
  }
  if (action === "copy-origami-steps") {
    copyOrigamiSteps();
    return;
  }
  if (action === "add-origami-supplies") {
    void addOrigamiSupplies();
    return;
  }
  if (action === "copy-laser-params") {
    copyLaserParams();
    return;
  }
  if (action === "add-laser-materials") {
    void addLaserMaterials();
    return;
  }
  if (action === "copy-leather-specs") {
    copyLeatherSpecs();
    return;
  }
  if (action === "add-leather-supplies") {
    void addLeatherSupplies();
    return;
  }
  if (action === "copy-ceramics-specs") {
    copyCeramicsSpecs();
    return;
  }
  if (action === "add-ceramics-supplies") {
    void addCeramicsSupplies();
    return;
  }
  if (action === "copy-welding-specs") {
    copyWeldingSpecs();
    return;
  }
  if (action === "add-welding-supplies") {
    void addWeldingSupplies();
    return;
  }
  if (action === "copy-cnc-specs") {
    copyCncSpecs();
    return;
  }
  if (action === "add-cnc-supplies") {
    void addCncSupplies();
    return;
  }
  if (action === "simulate-cnc-gcode") {
    simulateCncGcode();
    return;
  }
  if (action === "reset-cnc-gcode") {
    resetCncGcode();
    return;
  }
  if (action === "copy-forge-specs") {
    copyForgeSpecs();
    return;
  }
  if (action === "add-forge-supplies") {
    void addForgeSupplies();
    return;
  }
  if (action === "copy-fasteners-specs") {
    copyFastenersSpecs();
    return;
  }
  if (action === "add-fasteners-supplies") {
    void addFastenersSupplies();
    return;
  }
  if (action === "copy-glass-specs") {
    copyGlassSpecs();
    return;
  }
  if (action === "add-glass-supplies") {
    void addGlassSupplies();
    return;
  }
  if (action === "copy-jewelry-specs") {
    copyJewelrySpecs();
    return;
  }
  if (action === "add-jewelry-supplies") {
    void addJewelrySupplies();
    return;
  }
  if (action === "copy-bookbinding-specs") {
    copyBookbindingSpecs();
    return;
  }
  if (action === "add-bookbinding-supplies") {
    void addBookbindingSupplies();
    return;
  }
  if (action === "copy-sla-specs") {
    copySlaSpecs();
    return;
  }
  if (action === "add-sla-supplies") {
    void addSlaSupplies();
    return;
  }
  if (action === "copy-luthier-specs") {
    copyLuthierSpecs();
    return;
  }
  if (action === "add-luthier-supplies") {
    void addLuthierSupplies();
    return;
  }
  if (action === "copy-composites-specs") {
    copyCompositesSpecs();
    return;
  }
  if (action === "add-composites-supplies") {
    void addCompositesSupplies();
    return;
  }
  if (action === "copy-horology-specs") {
    copyHorologySpecs();
    return;
  }
  if (action === "add-horology-supplies") {
    void addHorologySupplies();
    return;
  }
  if (action === "copy-robotics-specs") {
    copyRoboticsSpecs();
    return;
  }
  if (action === "add-robotics-supplies") {
    void addRoboticsSupplies();
    return;
  }
  if (action === "copy-bicycle-specs") {
    copyBicycleSpecs();
    return;
  }
  if (action === "add-bicycle-supplies") {
    void addBicycleSupplies();
    return;
  }
  if (action === "add-filament-to-materials") {
    const price = parseFloat($("#print-spool-price")?.value) || 22;
    const poly = $("#print-polymer-type option:checked")?.textContent.split("(")[0].trim() || "PLA";
    await addMaterialToProjectShopping(`${poly} 3D Printer Filament (1kg Spool)`, "1 spool", price, "3D Printing & Filament");
    return;
  }
  if (action === "add-resin-to-materials") {
    const preset = $("#resin-type-preset option:checked")?.textContent.split("(")[0].trim() || "Casting Resin";
    await addMaterialToProjectShopping(`${preset} (Part A + Part B Kit)`, "1 kit", 35, "Finishes & Adhesives");
    return;
  }
  if (action === "add-fastener-to-project") {
    const size = target.dataset.size || "M4";
    await addMaterialToProjectShopping(`${size} Fasteners & Machine Screws`, "1 box (50 pcs)", 0, "Fasteners & Hardware");
    return;
  }
  if (action === "copy-fastener-specs") {
    const specs = $("#fastener-result")?.innerText || "";
    if (specs) {
      void navigator.clipboard.writeText(specs).then(() => showToast("Copied Fastener Drilling Specs to clipboard!"));
    }
    return;
  }
  if (action === "add-nest-sheets-to-project") {
    const count = parseInt(target.dataset.sheets, 10) || 1;
    const w = $("#wood-nest-sheet-w")?.value || "48";
    const h = $("#wood-nest-sheet-h")?.value || "96";
    const u = $("#wood-nest-unit")?.value || "in";
    await addMaterialToProjectShopping(`Sheet Stock (${w}" × ${h}" ${u})`, `${count} sheet(s)`, 0, "Lumber & Sheet Goods");
    return;
  }
  if (action === "print-workshop-blueprint") {
    printWorkshopBlueprint();
    return;
  }
  if (action === "download-workshop-blueprint") {
    downloadWorkshopBlueprintHTML();
    return;
  }
  if (action === "set-blueprint-sheet-theme") {
    setBlueprintSheetTheme(target.dataset.theme);
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
    const input = target.closest("form")?.querySelector("input[name='taskText']") || $("#task-input") || target.parentElement?.querySelector("input");
    toggleSpeechDictation(target, input);
    return;
  }
  if (action === "dictate-note") {
    toggleSpeechDictation(target, $("#journal-entry"));
    return;
  }
  if (action === "start-voice-memo") {
    const pid = target.dataset.project || activeProjectId;
    if (pid) void startJournalVoiceMemo(pid);
    return;
  }
  if (action === "stop-voice-memo") {
    stopJournalVoiceMemo();
    return;
  }
  if (action === "wood-run-2d-nesting") {
    if (typeof run2DSheetNestingOptimizer === "function") run2DSheetNestingOptimizer();
    return;
  }
  if (action === "wood-2d-sample-cabinets") {
    const el = $("#wood-nest-parts");
    if (el) {
      el.value = "Cabinet Top: 24 x 36 x 1\nCabinet Bottom: 24 x 36 x 1\nCabinet Side: 24 x 30 x 2\nAdjustable Shelf: 22 x 34.5 x 2\nBack Panel: 30 x 36 x 1";
      if (typeof run2DSheetNestingOptimizer === "function") run2DSheetNestingOptimizer();
    }
    return;
  }
  if (action === "wood-2d-sample-bookshelf") {
    const el = $("#wood-nest-parts");
    if (el) {
      el.value = "Top/Bottom: 12 x 36 x 2\nSide Panel: 12 x 72 x 2\nMiddle Fixed Shelf: 12 x 34.5 x 1\nAdjustable Shelf: 11.5 x 34.5 x 4\nBacking: 36 x 72 x 1";
      if (typeof run2DSheetNestingOptimizer === "function") run2DSheetNestingOptimizer();
    }
    return;
  }
  if (action === "copy-2d-nest-plan") {
    const text = $("#wood-nest-result")?.innerText || "";
    if (text) {
      void navigator.clipboard.writeText(text).then(() => showToast("Copied 2D Sheet Nesting Plan to clipboard!"));
    }
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
      if ($("#detail-dialog")?.open) renderProjectDetail(project.id);
      showToast(project.pinned ? `Pinned “${project.title}” to top.` : `Unpinned “${project.title}”.`);
    } catch (e) {
      console.error(e);
    }
    return;
  }
  if (action === "print-project") {
    const pid = id || target.dataset.project || activeProjectId;
    if (pid) {
      openWorkshopBlueprint(pid);
    } else {
      window.print();
    }
    return;
  }
  if (action === "cycle-material-status") {
    const project = state.projects.find(item => item.id === target.dataset.project);
    if (!project) return;
    if (!canUserEditProject(project)) {
      showToast("Viewers have read-only access to this project.");
      return;
    }
    const material = project.materials?.find(item => item.id === id);
    if (!material) return;
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
  if (action === "filter-material-group") {
    state.activeMaterialGroupFilter = target.dataset.group || "all";
    const projId = target.dataset.project || activeProjectId;
    if (projId) renderProjectDetail(projId);
    return;
  }
  if (action === "edit-material-group") {
    const project = state.projects.find(item => item.id === target.dataset.project);
    if (!project) return;
    if (!canUserEditProject(project)) {
      showToast("Viewers have read-only access to this project.");
      return;
    }
    const material = project.materials?.find(item => item.id === id);
    if (!material) return;
    const currentGroup = material.group || inferMaterialGroup(material.name);
    const newGroup = prompt("Enter group for this material (e.g. Yarn & Fibers, Sensors & Modules, Hardware, Lumber):", currentGroup);
    if (newGroup !== null) {
      material.group = newGroup.trim() || "General Supplies";
      project.updatedAt = new Date().toISOString();
      try {
        await persistState();
        render();
        renderProjectDetail(project.id);
        showToast(`Updated ${material.name} group to "${material.group}".`);
      } catch (err) {
        console.error(err);
      }
    }
    return;
  }
  if (action === "delete-material") {
    const project = state.projects.find(item => item.id === target.dataset.project);
    if (!project || !project.materials) return;
    if (!canUserEditProject(project)) {
      showToast("Viewers have read-only access to this project.");
      return;
    } 
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
  if (action === "copy-epoxy-recipe") {
    copyEpoxyRecipe();
    return;
  }
  if (action === "copy-miter-recipe") {
    void copyMiterRecipe();
    return;
  }
  if (action === "transfer-project-to-cutlist") {
    transferProjectToCutlist(id || target.dataset.id || target.dataset.project);
    return;
  }
  if (action.startsWith("yarn-")) {
    yarnCounterAction(action);
    return;
  }
  if (action === "calc-ohms-law") {
    calcOhmsLaw();
    return;
  }
  if (action === "clear-ohms-law") {
    clearOhmsLaw();
    return;
  }
  if (action === "copy-art-palette") {
    void copyArtPalette();
    return;
  }
  if (action === "copy-art-swatch") {
    const hex = target.dataset.hex;
    if (hex) {
      void navigator.clipboard.writeText(hex).then(() => showToast(`Copied ${hex} to clipboard!`));
    }
    return;
  }
  if (action === "textiles-row-plus") {
    incrementTextilesRow();
    return;
  }
  if (action === "textiles-row-minus") {
    decrementTextilesRow();
    return;
  }
  if (action === "textiles-row-reset") {
    resetTextilesRow();
    return;
  }
  if (action === "copy-stitch-instructions") {
    void copyStitchInstructions();
    return;
  }
  if (action === "copy-prog-snippet") {
    void copyProgSnippet();
    return;
  }
  if (action === "prog-bit-toggle") {
    const bit = parseInt(target.dataset.bit, 10);
    toggleProgBit(bit);
    return;
  }
  if (action === "prog-fp-bit-toggle") {
    const bit = parseInt(target.dataset.bit, 10);
    if (typeof toggleIeee754Bit === "function") toggleIeee754Bit(bit);
    return;
  }
  if (action === "prog-fp-preset") {
    const valStr = target.dataset.val;
    const val = (valStr === "NaN") ? NaN : ((valStr === "Infinity") ? Infinity : parseFloat(valStr));
    if (typeof setIeee754FromFloat === "function") setIeee754FromFloat(val);
    return;
  }
  if (action === "copy-dovetail-specs") {
    const specs = $("#wood-dt-result")?.innerText || "";
    if (specs) {
      void navigator.clipboard.writeText(specs).then(() => showToast("Copied Dovetail Layout Specs to clipboard!"));
    }
    return;
  }
  if (action === "add-dovetail-material") {
    const w = $("#wood-dt-width")?.value || "150";
    const u = $("#wood-dt-unit")?.value || "mm";
    const t = $("#wood-dt-thick")?.value || "19";
    await addMaterialToProjectShopping(`Dovetail Stock (${w}${u} × ${t}${u})`, "1 board", 0, "Lumber & Sheet Goods");
    return;
  }
  if (action === "copy-yarn-holding-specs") {
    const specs = $("#textiles-yarn-result")?.innerText || "";
    if (specs) {
      void navigator.clipboard.writeText(specs).then(() => showToast("Copied Yarn Combination Specs to clipboard!"));
    }
    return;
  }
  if (action === "add-yarn-holding-bundle") {
    const s1Key = $("#textiles-yarn-strand1")?.value || "1";
    const s2Key = $("#textiles-yarn-strand2")?.value || "0";
    const s1 = typeof YARN_WEIGHT_STANDARDS !== "undefined" && YARN_WEIGHT_STANDARDS[s1Key] ? YARN_WEIGHT_STANDARDS[s1Key].name : "Strand 1";
    const s2 = typeof YARN_WEIGHT_STANDARDS !== "undefined" && YARN_WEIGHT_STANDARDS[s2Key] ? YARN_WEIGHT_STANDARDS[s2Key].name : "Strand 2";
    await addMaterialToProjectShopping(`Yarn Combo (${s1} + ${s2})`, "2 skeins", 0, "Yarn & Thread");
    return;
  }
  if (action === "copy-pcb-trace-specs") {
    const specs = $("#elec-trace-result")?.innerText || "";
    if (specs) {
      void navigator.clipboard.writeText(specs).then(() => showToast("Copied PCB Trace Routing Specs to clipboard!"));
    }
    return;
  }
  if (action === "copy-pigment-recipe") {
    const specs = $("#art-pigment-result")?.innerText || "";
    if (specs) {
      void navigator.clipboard.writeText(specs).then(() => showToast("Copied Artist Paint Recipe to clipboard!"));
    }
    return;
  }
  if (action === "set-studio-palette-from-pigment") {
    const hex = target.dataset.hex;
    if (hex && $("#art-view-base-color")) {
      $("#art-view-base-color").value = hex;
      if (typeof updateArtStudioPalette === "function") updateArtStudioPalette();
      showToast(`Updated Studio Base Color to ${hex.toUpperCase()}!`);
    }
    return;
  }
  if (action === "add-pigment-to-materials") {
    const hex = target.dataset.hex || "#ffffff";
    await addMaterialToProjectShopping(`Custom Mixed Artist Paint (${hex.toUpperCase()})`, "1 tube", 0, "Finishes & Solvents");
    return;
  }
  if (action === "art-pigment-reset") {
    if (typeof ART_PIGMENTS_DB !== "undefined" && typeof pigmentPartsState !== "undefined") {
      ART_PIGMENTS_DB.forEach(p => { pigmentPartsState[p.id] = 0; });
      if (typeof renderPigmentSlidersUI === "function") renderPigmentSlidersUI();
      if (typeof updatePigmentMixer === "function") updatePigmentMixer();
      showToast("Reset all tube pigment sliders to 0.");
    }
    return;
  }
  if (action === "prog-bit-op") {
    executeProgBitOp(target.dataset.op);
    return;
  }
  if (action === "switch-studio-from-tools") {
    const studio = target.dataset.studio;
    $("#tools-dialog")?.close();
    if (studio) switchView(studio);
    return;
  }
  if (action === "scroll-to-wood-cutlist") {
    $("#wood-cutlist-panel")?.scrollIntoView({ behavior: "smooth" });
    return;
  }
  if (action === "scroll-to-wood-bf") {
    ($("#wood-bf-panel") || $("#wood-view-bf-result"))?.scrollIntoView({ behavior: "smooth" });
    return;
  }
  if (action === "wood-add-to-shopping") {
    const t = parseFloat($("#wood-view-t")?.value) || 1;
    const w = parseFloat($("#wood-view-w")?.value) || 6;
    const l = parseFloat($("#wood-view-l")?.value) || 8;
    const qty = parseInt($("#wood-view-qty")?.value, 10) || 1;
    const price = parseFloat($("#wood-view-price")?.value) || 0;
    const totalBf = ((t * w * l) / 12) * qty;
    const totalCost = totalBf * price;
    const speciesSel = $("#wood-view-species");
    const species = speciesSel ? speciesSel.selectedOptions[0]?.text.split("(")[0].trim() : "Hardwood";
    void addMaterialToProjectShopping(`${species} Lumber (${t}" × ${w}" × ${l}')`, `${qty} boards (${totalBf.toFixed(1)} BF)`, totalCost, "Lumber & Sheet Goods");
    return;
  }
  if (action === "textiles-add-to-shopping") {
    const projSel = $("#textiles-est-project");
    const wtSel = $("#textiles-est-yarn-wt");
    const projName = projSel ? projSel.selectedOptions[0]?.text : "Knitting Project";
    const wtName = wtSel ? wtSel.selectedOptions[0]?.text.split("(")[0].trim() : "Worsted";
    const baseYds = (typeof TEXTILE_PROJECT_YARDAGE_DB !== "undefined" && TEXTILE_PROJECT_YARDAGE_DB[projSel?.value] && TEXTILE_PROJECT_YARDAGE_DB[projSel?.value][wtSel?.value])
      ? TEXTILE_PROJECT_YARDAGE_DB[projSel?.value][wtSel?.value] : 200;
    const totalYds = Math.round(baseYds * 1.10);
    const skeins = Math.ceil(totalYds / 210);
    void addMaterialToProjectShopping(`${wtName} Yarn for ${projName}`, `${skeins} skeins (~${totalYds} yds)`, 0, "Yarn & Fibers");
    return;
  }
  if (action === "elec-add-to-shopping") {
    const is5 = (typeof resistorBandMode !== "undefined" ? resistorBandMode : "4") === "5";
    const b1 = $("#elec-res-band1")?.value || "2";
    const b2 = $("#elec-res-band2")?.value || "0";
    const b3 = $("#elec-res-band3")?.value || "0";
    const mult = parseFloat($("#elec-res-mult")?.value) || 100;
    const tol = $("#elec-res-tol")?.value || (is5 ? "1" : "5");
    const base = is5 ? parseInt(b1, 10) * 100 + parseInt(b2, 10) * 10 + parseInt(b3, 10) : parseInt(b1, 10) * 10 + parseInt(b2, 10);
    const ohms = base * mult;
    const valStr = ohms >= 1e6 ? `${(ohms/1e6).toFixed(2).replace(/\.00$/,'')} MΩ` : ohms >= 1e3 ? `${(ohms/1e3).toFixed(2).replace(/\.00$/,'')} kΩ` : `${ohms} Ω`;
    void addMaterialToProjectShopping(`${valStr} ±${tol}% Resistors`, "10 pcs pack", 0.50, "Electronics & Wiring");
    return;
  }
  if (action === "toggle-art-camera") {
    toggleArtCamera();
    return;
  }
  if (action === "freeze-art-camera") {
    freezeArtCamera();
    return;
  }
  if (action === "switch-art-camera") {
    void switchArtCameraFacing();
    return;
  }
  if (action === "set-camera-base-color") {
    setCameraColorAsStudioBase();
    return;
  }
  if (action === "copy-camera-hex") {
    const hex = artCameraState.activeColor || "#0284c7";
    try {
      await navigator.clipboard.writeText(hex.toUpperCase());
      showToast(`Copied ${hex.toUpperCase()} to clipboard!`);
    } catch {
      showToast(hex.toUpperCase());
    }
    return;
  }
  if (action === "pick-camera-chip") {
    const hex = target.dataset.hex;
    if (hex) {
      artCameraState.activeColor = hex;
      renderArtCameraDetails(hex, artCameraState.topClusters, artCameraState.screenDominantColor);
    }
    return;
  }
  if (action === "copy-i2c-scanner") {
    void copyI2cScannerSketch();
    return;
  }
  if (action === "save-sensor-to-materials") {
    void saveSensorToProjectMaterials();
    return;
  }
  if (action === "save-skein-to-materials") {
    void saveSkeinToProjectMaterials();
    return;
  }
  if (action === "copy-sag-specs") {
    void copySagSpecs();
    return;
  }
  if (action === "save-sag-to-materials") {
    void saveSagToProjectMaterials();
    return;
  }
  if (action === "toggle-beat-sequencer") {
    toggleBeatSequencer();
    return;
  }
  if (action === "tap-beat-tempo") {
    tapBeatTempo();
    return;
  }
  if (action === "reset-beat-tap") {
    resetBeatTap();
    return;
  }
  if (action === "apply-beat-tempo-to-studio") {
    applyBeatTempoToStudio();
    return;
  }
  if (action === "load-beat-preset") {
    const preset = target.dataset.preset || "four_on_floor";
    loadBeatPreset(preset);
    return;
  }
  if (action === "toggle-beat-step") {
    const track = target.dataset.track;
    const step = parseInt(target.dataset.step, 10);
    if (track && !isNaN(step) && beatSeqState.tracks[track]) {
      beatSeqState.tracks[track][step] = beatSeqState.tracks[track][step] ? 0 : 1;
      target.classList.toggle("active", Boolean(beatSeqState.tracks[track][step]));
      if (beatSeqState.tracks[track][step]) {
        playDrumSound(track === "hihat" ? "hat" : track);
      }
    }
    return;
  }
  if (action === "audition-beat-track") {
    const track = target.dataset.track || target.closest("[data-track]")?.dataset.track;
    if (track) playDrumSound(track === "hihat" ? "hat" : track);
    return;
  }
  if (action === "copy-smd-specs") {
    void copySmdSpecs();
    return;
  }
  if (action === "save-smd-to-materials") {
    void saveSmdToMaterials();
    return;
  }
  if (action === "copy-frame-specs") {
    void copyFrameSpecs();
    return;
  }
  if (action === "save-frame-to-materials") {
    void saveFrameToMaterials();
    return;
  }
  if (action === "copy-hat-specs") {
    void copyHatSpecs();
    return;
  }
  if (action === "save-hat-to-materials") {
    void saveHatToProjectMaterials();
    return;
  }
  if (action === "toggle-mic-tuner") {
    toggleMicTuner();
    return;
  }
  if (action === "copy-emc-specs") {
    void copyEmcSpecs();
    return;
  }
  if (action === "copy-stepper-code") {
    void copyStepperM92();
    return;
  }
  if (action === "save-stepper-to-materials") {
    void saveStepperToMaterials();
    return;
  }
  if (action === "copy-battery-life-specs") {
    void copyBatteryLifeSpecs();
    return;
  }
  if (action === "save-battery-to-materials") {
    void saveBatteryToMaterials();
    return;
  }
  if (action === "copy-pooling-notes") {
    void copyPoolingNotes();
    return;
  }
  if (action === "copy-crc-result") {
    void copyCrcResult();
    return;
  }
  if (action === "wood-run-cut-optimizer") {
    runWoodCutOptimizer();
    return;
  }
  if (action === "wood-copy-cut-plan") {
    void copyWoodCutPlan();
    return;
  }
  if (action === "toggle-metronome") {
    toggleMetronome();
    return;
  }
  if (action === "tap-metronome-tempo") {
    tapMetronomeTempo();
    return;
  }
  if (action === "export-stitch-png") {
    exportStitchChartPng();
    return;
  }
  if (action === "hit-piano-key") {
    if (target._lastPointerTime && Date.now() - target._lastPointerTime < 450) return;
    const note = target.dataset.note;
    const midi = parseInt(target.dataset.midi, 10);
    playPianoKeyNote(note, midi);
    return;
  }
  if (action === "hit-fretboard-note") {
    const midi = parseInt(target.dataset.midi, 10);
    if (!isNaN(midi)) {
      playGuitarStringTone(midi);
      const pill = target.querySelector(".fretboard-note-pill");
      if (pill) {
        pill.classList.add("active-hit");
        setTimeout(() => pill.classList.remove("active-hit"), 280);
      }
    }
    return;
  }
  if (action === "strum-fretboard-tuning") {
    strumFretboardTuning();
    return;
  }
  if (action === "set-res-band-mode") {
    setResistorBandMode(target.dataset.mode);
    return;
  }
  if (action === "set-div-preset") {
    setVoltageDividerPreset(target.dataset.preset);
    return;
  }
  if (action === "copy-formatted-array") {
    void copyFormattedArray();
    return;
  }
  if (action === "copy-css-gradient") {
    void copyArtGradientCss();
    return;
  }
  if (action === "tap-tempo") {
    tapTempo();
    return;
  }
  if (action === "open-full-music-studio") {
    $("#tools-dialog")?.close();
    switchView("music");
    return;
  }
  if (action === "export-groove-wav") {
    void exportGrooveWav();
    return;
  }
  if (action === "select-stitch-color") {
    stitchStudioState.activeColor = target.dataset.color || "#ef4444";
    stitchStudioState.isMouseDown = false;
    renderStitchPalette();
    return;
  }
  if (action === "set-stitch-tool") {
    stitchStudioState.activeTool = target.dataset.tool || "pencil";
    stitchStudioState.isMouseDown = false;
    $$(".stitch-tool-btn").forEach(b => {
      b.classList.toggle("button-primary", b.dataset.tool === target.dataset.tool);
      b.classList.toggle("button-outline", b.dataset.tool !== target.dataset.tool);
    });
    return;
  }
  if (action === "clear-stitch-grid") {
    const total = (stitchStudioState.cols || 16) * (stitchStudioState.rows || 16);
    stitchStudioState.grid = Array.from({ length: total }, () => "#ffffff");
    renderStitchGrid();
    return;
  }
  if (action === "stitch-apply-dimensions") {
    const c = parseInt($("#stitch-matrix-cols")?.value, 10) || 16;
    const r = parseInt($("#stitch-matrix-rows")?.value, 10) || 16;
    resizeStitchMatrix(c, r);
    return;
  }
  if (action === "stitch-flip-h") {
    flipStitchMatrixH();
    return;
  }
  if (action === "stitch-flip-v") {
    flipStitchMatrixV();
    return;
  }
  if (action === "stitch-rotate") {
    rotateStitchMatrix();
    return;
  }
  if (action === "stitch-shift") {
    shiftStitchMatrix(target.dataset.dir || "up");
    return;
  }
  if (action === "stitch-invert") {
    invertStitchMatrix();
    return;
  }
  if (action === "textiles-repeat-reset") {
    resetTextilesRepeat();
    return;
  }
  if (action === "crochet-copy-pattern") {
    void copyAmigurumiPattern();
    return;
  }
  if (action === "paint-stitch-cell") {
    const idx = parseInt(target.dataset.index, 10);
    applyStitchTool(idx);
    return;
  }
  if (action === "copy-stitch-instructions") {
    void copyStitchInstructions();
    return;
  }
  if (action === "play-both-groove") {
    if (musicPlaybackState.isPlaying && musicPlaybackState.playMode === "both") {
      stopMusicGroove();
    } else {
      startMusicGroove("both");
    }
    return;
  }
  if (action === "play-chords-only") {
    if (musicPlaybackState.isPlaying && musicPlaybackState.playMode === "chords") {
      stopMusicGroove();
    } else {
      startMusicGroove("chords");
    }
    return;
  }
  if (action === "play-drums-only") {
    if (musicPlaybackState.isPlaying && musicPlaybackState.playMode === "drums") {
      stopMusicGroove();
    } else {
      startMusicGroove("drums");
    }
    return;
  }
  if (action === "stop-music-groove") {
    stopMusicGroove();
    return;
  }
  if (action === "toggle-channel-chords") {
    toggleMusicChannel("chords");
    return;
  }
  if (action === "toggle-channel-drums") {
    toggleMusicChannel("drums");
    return;
  }
  if (action === "toggle-channel-metronome") {
    toggleMusicChannel("metronome");
    return;
  }
  if (action === "hit-drum-pad") {
    if (target._lastPointerTime && Date.now() - target._lastPointerTime < 450) return;
    const drum = target.dataset.drum || target.closest("[data-drum]")?.dataset.drum;
    if (drum) hitLiveDrumPad(drum);
    return;
  }
  if (action === "play-pitch-tone-view") {
    playPitchToneViewAction();
    return;
  }
  if (action === "toggle-metronome") {
    toggleMetronome();
    return;
  }
  if (action === "play-pitch-tone") {
    playPitchToneAction();
    return;
  }
  if (action === "toggle-chord-playback") {
    toggleChordPlayback();
    return;
  }
  if (action === "stop-chord-playback") {
    stopChordPlayback();
    return;
  }
  if (action === "copy-chord-progression") {
    void copyChordProgressionDetails();
    return;
  }
  if (action === "select-chord-slot") {
    const slotIdx = parseInt(target.dataset.slotIndex || target.closest("[data-slot-index]")?.dataset.slotIndex, 10);
    selectChordSlot(slotIdx);
    return;
  }
  if (action === "set-diatonic-chord") {
    const el = target.dataset.chord ? target : target.closest("[data-chord]");
    if (el) {
      setDiatonicChord(el.dataset.chord, el.dataset.degree);
    }
    return;
  }
  if (action === "toggle-drum-step") {
    const el = target.dataset.track ? target : target.closest("[data-track]");
    if (el) {
      toggleDrumStep(el.dataset.track, parseInt(el.dataset.step, 10));
    }
    return;
  }
  if (action === "open-time-dialog") {
    openTimeDialog(id || target.dataset.id);
    return;
  }
  if (action === "snap-photo") {
    const projId = id || target.dataset.id;
    const project = state.projects.find(p => p.id === projId);
    if (project && !canUserEditProject(project)) {
      showToast("Viewers have read-only access to this project.");
      return;
    }
    beginCameraCapture(projId, target.dataset.folder || null);
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
      materials.length ? `💰 **Supplies Budget:** ${formatMoney(totalCost)} (${formatMoney(spentCost)} acquired)` : "",
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
  if (action === "quick-start-project-timer") {
    const projId = target.dataset.project || target.dataset.id || id;
    startProjectCraftingTimer(projId);
    return;
  }
  if (action === "toggle-project-timer") {
    toggleProjectCraftingTimer();
    return;
  }
  if (action === "finish-project-timer") {
    void finishProjectCraftingTimer();
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
  if (action === "toggle-chill-music") {
    toggleChillMusic(target?.dataset?.track);
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
    if (!canUserEditProject(project)) {
      showToast("Viewers have read-only access to this project.");
      return;
    }
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
  if (action === "new-folder") {
    const project = state.projects.find(item => item.id === id);
    if (project && !canUserEditProject(project)) {
      showToast("Viewers have read-only access to this project.");
      return;
    }
    openFolderForm(id);
    return;
  }
  if (action === "rename-folder") {
    const project = state.projects.find(item => item.id === target.dataset.project);
    if (!project) return;
    if (!canUserEditProject(project)) {
      showToast("Viewers have read-only access to this project.");
      return;
    }
    const folder = project.folders.find(item => item.id === target.dataset.folder);
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
    if (!project) return;
    if (!canUserEditProject(project)) {
      showToast("Viewers have read-only access to this project.");
      return;
    }
    const folderIndex = project.folders.findIndex(item => item.id === target.dataset.folder);
    if (folderIndex === undefined || folderIndex < 0) return;
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
  if (action === "add-photos") {
    const project = state.projects.find(item => item.id === id);
    if (project && !canUserEditProject(project)) {
      showToast("Viewers have read-only access to this project.");
      return;
    }
    beginPhotoUpload(id, target.dataset.folder || null);
    return;
  }
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
    if (!canUserEditProject(project)) {
      showToast("Viewers have read-only access to this project.");
      return;
    }
    const activePhase = project._activePhase || "all";
    const taskList = activePhase === "all" ? project.tasks : project.tasks.filter(t => (t.phase || "") === activePhase);
    const visibleIndex = taskList.findIndex(item => item.id === id);
    if (visibleIndex < 0) return;
    const targetVisibleIndex = action === "move-task-up" ? visibleIndex - 1 : visibleIndex + 1;
    if (targetVisibleIndex < 0 || targetVisibleIndex >= taskList.length) return;
    const neighborTask = taskList[targetVisibleIndex];
    const currentIndex = project.tasks.findIndex(t => t.id === id);
    const neighborIndex = project.tasks.findIndex(t => t.id === neighborTask.id);
    if (currentIndex >= 0 && neighborIndex >= 0) {
      const [moved] = project.tasks.splice(currentIndex, 1);
      project.tasks.splice(neighborIndex, 0, moved);
      project.updatedAt = new Date().toISOString();
      try {
        await persistState();
        render();
        renderProjectDetail(project.id);
      } catch (error) {
        console.error("Unable to reorder task.", error);
      }
    }
    return;
  }
  if (action === "set-phase-filter") {
    const proj = state.projects.find(p => p.id === (target.dataset.project || id));
    if (proj) {
      proj._activePhase = target.dataset.phase || "all";
      renderProjectDetail(proj.id);
    }
    return;
  }
  if (action === "add-project-phase") {
    const proj = state.projects.find(p => p.id === (target.dataset.project || id));
    if (proj) {
      if (!canUserEditProject(proj)) {
        showToast("Viewers have read-only access to this project.");
        return;
      }
      const newPhase = window.prompt("Enter new build phase name (e.g. Rough Cut, Assembly, Sanding, Finish, Wiring):");
      if (newPhase && newPhase.trim()) {
        const trimmed = newPhase.trim();
        if (!proj.phases) proj.phases = [];
        if (!proj.phases.includes(trimmed)) {
          proj.phases.push(trimmed);
        }
        proj._activePhase = trimmed;
        void saveProject(proj);
        renderProjectDetail(proj.id);
        showToast(`Phase "${trimmed}" added!`);
      }
    }
    return;
  }
  if (action === "assign-task-phase") {
    const proj = state.projects.find(p => p.id === (target.dataset.project || id));
    const taskId = target.dataset.id || id;
    if (proj && taskId) {
      if (!canUserEditProject(proj)) {
        showToast("Viewers have read-only access to this project.");
        return;
      }
      const task = (proj.tasks || []).find(t => t.id === taskId);
      if (task) {
        const current = task.phase || "";
        const allKnown = Array.from(new Set([
          "Rough Dimensioning", "Joinery & Prep", "Assembly & Glue-up", "Sanding & Smoothing", "Finishing & Polish", "Final Setup",
          ...(proj.phases || []),
          ...((proj.tasks || []).map(t => t.phase).filter(Boolean))
        ]));
        const chosen = window.prompt(
          `Assign build phase for "${task.text}":\nSuggestions: ${allKnown.slice(0, 6).join(", ")}\n\n(Enter a phase name, or leave blank to clear)`,
          current
        );
        if (chosen !== null) {
          const trimmed = chosen.trim();
          task.phase = trimmed || undefined;
          if (trimmed) {
            if (!proj.phases) proj.phases = [];
            if (!proj.phases.includes(trimmed)) proj.phases.push(trimmed);
          }
          proj.updatedAt = new Date().toISOString();
          try {
            await persistState();
            render();
            renderProjectDetail(proj.id);
            showToast(trimmed ? `Phase set to "${trimmed}"` : "Phase cleared.");
          } catch (e) {
            console.error("Unable to update task phase", e);
          }
        }
      }
    }
    return;
  }
  if (action === "edit-note") {
    const project = state.projects.find(item => item.id === target.dataset.project);
    const note = project?.notes.find(item => item.id === id);
    if (!project || !note) return;
    if (!canUserEditProject(project)) {
      showToast("Viewers have read-only access to this project.");
      return;
    }
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
    if (!canUserEditProject(project)) {
      showToast("Viewers have read-only access to this project.");
      return;
    }
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
    const projectId = id || target.dataset.id || target.dataset.project || activeProjectId || $("#project-form input[name='id']")?.value;
    const project = state.projects.find(item => item.id === projectId);
    if (!project) return;

    const curUser = getActiveUser();
    const isCreator = isProjectCreator(project, curUser);
    const isAdmin = isCurrentUserAdmin();

    // Collaborative team members who are not the creator or admin can only LEAVE the project
    if (isCollaborativeProject(project) && !isCreator && !isAdmin) {
      if (!window.confirm(`Leave collaborative project “${project.title}”? You will be removed from the team, but the creator and other collaborators will keep their project.`)) return;

      const uId = curUser?.id || "local-maker";
      const uEmail = (curUser?.email || "").toLowerCase().trim();
      project.coCreators = (project.coCreators || []).filter(c => {
        if (c.id && c.id === uId) return false;
        if (c.email && uEmail && c.email.toLowerCase().trim() === uEmail) return false;
        return true;
      });
      project.updatedAt = new Date().toISOString();

      const shared = getSharedCollaborations().filter(p => p.id !== projectId);
      saveSharedCollaborations(shared);

      state.projects = state.projects.filter(item => item.id !== projectId);
      if (activeProjectId === projectId) activeProjectId = null;

      $("#detail-dialog")?.close();
      $("#project-dialog")?.close();

      try {
        await persistState({ syncCloud: true });
        await pushProjectToCollaboratorWorkspaces(project);
        render();
        showToast(`Left collaborative project “${project.title}”.`);
      } catch (err) {
        console.error("Error leaving collaborative project:", err);
        render();
      }
      return;
    }

    if (!window.confirm(`Delete “${project.title}” and all its photos? This can’t be undone.`)) return;

    recordDeletedProjectId(projectId);
    (project.folders || []).forEach(folder => (folder.images || []).forEach(image => releaseImageUrl(image.id)));
    state.projects = state.projects.filter(item => item.id !== projectId);
    (state.inventory || []).forEach(item => {
      if (item.assignedProjectId === projectId) {
        item.assignedProjectId = null;
        item.assignedProjectTitle = null;
        if (item.condition === "in_use") item.condition = "operational";
      }
    });

    const shared = getSharedCollaborations().filter(p => p.id !== projectId);
    saveSharedCollaborations(shared);

    state.activity = (state.activity || []).filter(a => a.projectId !== projectId);
    state.practiceLog = (state.practiceLog || []).filter(l => l.projectId !== projectId);

    makeActivity("project", `Removed ${project.title}`);

    if (activeProjectId === projectId) {
      activeProjectId = null;
    }
    $("#detail-dialog")?.close();
    $("#project-dialog")?.close();

    try {
      await persistState({ syncCloud: true });
      void pushProjectDeletionToCollaboratorWorkspaces(projectId);
      render();
      showToast("Project deleted.");
    } catch (error) {
      console.error("Unable to delete project.", error);
      render();
      showToast("Could not sync project deletion to cloud, but project removed locally.");
    }
    return;
  }
  if (action === "remove-photo") {
    const project = state.projects.find(item => item.id === target.dataset.project);
    if (!project) return;
    if (!canUserEditProject(project)) {
      showToast("Viewers have read-only access to this project.");
      return;
    }
    const folder = project.folders.find(item => item.id === target.dataset.folder);
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
    const backupIdeas = readIdeasBackup();
    if (saved) {
      state.projects = Array.isArray(saved.projects) ? saved.projects : [];
      let loadedIdeas = Array.isArray(saved.ideas) ? saved.ideas : [];
      if (backupIdeas && backupIdeas.length > 0) {
        loadedIdeas = mergeIdeas(loadedIdeas, backupIdeas);
      }
      // Zero defaults: keep empty when starting fresh
      if (loadedIdeas.length === 0) {
        loadedIdeas = [];
      }
      state.ideas = loadedIdeas;
      saveIdeasBackup(state.ideas);
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
      state.hasUserChanges = saved.hasUserChanges === true || state.projects.length > 0 || state.skills.some(skill => skill.xp > 0) || (state.ideas || []).length > 0;
    } else {
      if (backupIdeas && backupIdeas.length > 0) {
        state.ideas = backupIdeas;
      } else {
        state.ideas = [];
      }
      saveIdeasBackup(state.ideas);
    }
    state.projects.forEach(project => {
      project.tasks = Array.isArray(project.tasks) ? project.tasks : [];
      project.notes = Array.isArray(project.notes) ? project.notes : [];
      project.materials = Array.isArray(project.materials) ? project.materials : [];
      project.pinned = Boolean(project.pinned);
      project.timeSpent = Number.isFinite(project.timeSpent) ? project.timeSpent : 0;
    });
    state.ideas = (Array.isArray(state.ideas) && state.ideas.length > 0)
      ? state.ideas
      : ((backupIdeas && backupIdeas.length > 0)
        ? backupIdeas
        : (Array.isArray(saved?.ideas) && saved.ideas.length > 0
          ? saved.ideas
          : []));
    saveIdeasBackup(state.ideas);
    state.inventory = Array.isArray(saved?.inventory) ? saved.inventory : [];
    state.customTemplates = Array.isArray(saved?.customTemplates) ? saved.customTemplates : [];
    state.makerGoals = Array.isArray(saved?.makerGoals) ? saved.makerGoals : [];
    state.maintenance = Array.isArray(saved?.maintenance) ? saved.maintenance : [];
    state.currency = saved?.currency || localStorage.getItem("workbench_currency") || "USD";
    state.unitSystem = saved?.unitSystem || localStorage.getItem("workbench_unitSystem") || "in";
    state.deletedProjectIds = Array.isArray(saved?.deletedProjectIds) ? saved.deletedProjectIds : getDeletedProjectIds();
    state.weeklyGoal = Number.isFinite(saved?.weeklyGoal) ? saved.weeklyGoal : 60;
    updateTopbarUnitsPill();

    for (const p of state.projects) {
      ensureProjectCreator(p);
    }
    loadSharedCollaborationsIntoState();
    await autoDiscoverCollaborativeProjects();
    syncSharedCollaborations();

    if (!saved?.starterSkillsAdded) {
      state.starterSkillsAdded = true;
      // ZERO DEFAULTS: Clean slate - do NOT add dummy starter skills
    }
    // Migration: Purge any previously auto-injected starter ideas (idea-starter-*)
    if (Array.isArray(state.ideas)) {
      const cleanedIdeas = state.ideas.filter(i => !i.id || !String(i.id).startsWith("idea-starter-"));
      if (cleanedIdeas.length !== state.ideas.length) {
        state.ideas = cleanedIdeas;
        saveIdeasBackup(state.ideas);
      }
    }
    // Migration: Purge any previously auto-injected starter skills with 0 XP unreferenced by projects
    if (Array.isArray(state.skills)) {
      const legacySkillNames = new Set([
        "knitting", "crocheting", "electronics", "programming", "gongfu cha",
        "cello", "guqin", "singing", "3d modeling", "woodworking", "sewing",
        "drawing", "photography"
      ]);
      const referencedSkillIds = new Set((state.projects || []).flatMap(p => p.skillIds || []));
      state.skills = state.skills.filter(s => {
        if ((s.xp || 0) > 0) return true;
        if (referencedSkillIds.has(s.id)) return true;
        if (legacySkillNames.has((s.name || "").trim().toLowerCase())) return false;
        return true;
      });
    }
    await persistState({ syncCloud: false, preserveTimestamp: Boolean(state.updatedAt) });
    applyTheme(getSavedTheme());
    window.matchMedia("(prefers-color-scheme: dark)")?.addEventListener("change", () => {
      if (getSavedTheme() === "auto") applyTheme("auto");
    });
    if ("serviceWorker" in navigator && (window.location.protocol === "http:" || window.location.protocol === "https:")) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
    document?.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && getCloudConfig() && getCloudSession()) {
        void syncCloudWorkspace();
      }
    });
    window?.addEventListener("storage", event => {
      if (event.key === CLOUD_SESSION_KEY || event.key === CURRENT_PROFILE_STORAGE_KEY || event.key === PRIMARY_ADMIN_STORAGE_KEY) {
        updateUserUI();
        void loadUserScopedState().then(() => render());
      } else if (event.key === SHARED_COLLAB_STORAGE_KEY || (event.key && event.key.startsWith("workbench_collab_invites_"))) {
        loadSharedCollaborationsIntoState();
        render();
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
    window?.addEventListener("hashchange", checkHashRouting);
    if (getCloudConfig() && getCloudSession()) {
      void syncCloudWorkspace().then(async () => {
        const curUser = getActiveUser();
        if (isPrimaryOwner(curUser) && (!Array.isArray(state.projects) || state.projects.length === 0)) {
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

document?.addEventListener("click", event => {
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

document?.addEventListener("keydown", event => {
  if ((event.ctrlKey || event.metaKey) && event.key === "[") {
    event.preventDefault();
    toggleSidebarMinimize();
    return;
  }
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

$("#project-search")?.addEventListener("input", renderProjects);
$("#project-status-filter")?.addEventListener("change", renderProjects);
$("#project-priority-filter")?.addEventListener("change", renderProjects);
$("#project-sort")?.addEventListener("change", renderProjects);
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
$("#inventory-condition-filter")?.addEventListener("change", renderInventory);
$("#inventory-form")?.addEventListener("submit", event => void handleInventorySubmit(event));

// Type selector in inventory modal
$$('#inventory-form input[name="itemType"]').forEach(radio => {
  radio?.addEventListener("change", () => {
    const isEquip = radio.value === "equipment";
    $("#inventory-material-fields")?.classList.toggle("hidden", isEquip);
    $("#inventory-equipment-fields")?.classList.toggle("hidden", !isEquip);
    const titleEl = $("#inventory-dialog-title");
    const eyebrowEl = $("#inventory-dialog-eyebrow");
    const idVal = $("#inventory-form input[name='id']")?.value;
    if (titleEl) titleEl.textContent = isEquip ? (idVal ? "Edit Tool / Equipment" : "Add Tool / Equipment") : (idVal ? "Edit Material / Supply" : "Add Material / Supply");
    if (eyebrowEl) eyebrowEl.textContent = isEquip ? "WORKSHOP EQUIPMENT" : "WORKSHOP SUPPLIES";
  });
});

// Segmented view tabs in inventory depot
$$(".inventory-segmented-tabs .inventory-tab-btn").forEach(btn => {
  btn?.addEventListener("click", () => {
    state.inventoryActiveTab = btn.dataset.tab || "all";
    $$(".inventory-segmented-tabs .inventory-tab-btn").forEach(b => {
      const active = b === btn;
      b.classList.toggle("active", active);
      b.setAttribute("aria-selected", active ? "true" : "false");
    });
    const condWrap = $("#inventory-condition-wrap");
    if (condWrap) condWrap.style.display = state.inventoryActiveTab === "material" ? "none" : "";
    renderInventory();
  });
});
$("#template-form")?.addEventListener("submit", event => void handleTemplateSubmit(event));
$("#project-form")?.addEventListener("submit", event => void handleProjectSubmit(event));
$("#idea-form")?.addEventListener("submit", event => void handleIdeaSubmit(event));
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
$("#skill-form")?.addEventListener("submit", event => void handleSkillSubmit(event));
$("#xp-form")?.addEventListener("submit", event => void handleXpSubmit(event));
$("#folder-form")?.addEventListener("submit", event => void handleFolderSubmit(event));
$("#practice-filter")?.addEventListener("change", () => {
  practiceLogLimit = 12;
  renderPracticeLog();
});
document?.addEventListener("submit", event => {
  if (event.target && event.target.id === "idea-form") return;
  void handleProjectEntrySubmit(event);
});
document?.addEventListener("change", event => {
  if (event.target.matches('input[data-action="toggle-task"]')) void handleTaskToggle(event.target);
});
$("#photo-input")?.addEventListener("change", event => void handlePhotoUpload(event.target.files));
$("#camera-input")?.addEventListener("change", event => void handlePhotoUpload(event.target.files));


// 🎁 Handmade Gift Suite Event Listeners
$("#project-is-gift")?.addEventListener("change", (e) => {
  const f = $("#project-gift-fields");
  if (f) f.style.display = e.target.checked ? "block" : "none";
});

document?.addEventListener("click", (e) => {
  const presetBtn = e.target.closest(".tag-preset-btn");
  if (presetBtn) {
    const key = presetBtn.dataset.preset;
    if (key && GIFT_CARE_PRESETS[key]) {
      const ta = $("#project-gift-fields textarea[name='giftCareNotes']");
      if (ta) ta.value = GIFT_CARE_PRESETS[key];
    }
  }

  const calcPreset = e.target.closest(".calc-preset-btn");
  if (calcPreset) {
    const { l, w, h } = calcPreset.dataset;
    if (l && $("#gift-calc-l")) $("#gift-calc-l").value = l;
    if (w && $("#gift-calc-w")) $("#gift-calc-w").value = w;
    if (h && $("#gift-calc-h")) $("#gift-calc-h").value = h;
    updateGiftWrappingCalc();
  }

  const tagCareBtn = e.target.closest(".tag-care-btn");
  if (tagCareBtn) {
    const careKey = tagCareBtn.dataset.care;
    if (careKey && GIFT_CARE_PRESETS[careKey]) {
      const ta = $("#gift-tag-care");
      if (ta) {
        ta.value = GIFT_CARE_PRESETS[careKey];
        renderGiftTagPreview();
      }
    }
  }
});

["#gift-calc-l", "#gift-calc-w", "#gift-calc-h", "#gift-calc-overlap", "#gift-calc-bow"].forEach(sel => {
  const el = $(sel);
  if (el) {
    el?.addEventListener("input", updateGiftWrappingCalc);
    el?.addEventListener("change", updateGiftWrappingCalc);
  }
});

$("#gift-tag-project-select")?.addEventListener("change", (e) => {
  populateGiftTagFromProject(e.target.value);
  renderGiftTagPreview();
});

["#gift-tag-style-select", "#gift-tag-theme-select", "#gift-tag-to", "#gift-tag-from", "#gift-tag-title", "#gift-tag-occasion", "#gift-tag-materials", "#gift-tag-care", "#gift-tag-date", "#gift-tag-edition"].forEach(sel => {
  const el = $(sel);
  if (el) {
    el?.addEventListener("input", renderGiftTagPreview);
    el?.addEventListener("change", renderGiftTagPreview);
  }
});

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
    if ($("#detail-dialog")?.open) renderProjectDetail(project.id);
    showToast(`Logged ${formatMinutes(minutes)} to ${project.title}!`);
  } catch (error) {
    console.error("Unable to save project time.", error);
    showToast("Could not log time.");
  }
});

/* Workshop Tools listeners */
$$(".tool-tab-btn").forEach(btn => {
  btn?.addEventListener("click", () => switchToolTab(btn.dataset.toolTab));
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
$("#tool-epoxy-shape")?.addEventListener("change", updateEpoxyCalc);
$("#tool-epoxy-units")?.addEventListener("change", updateEpoxyCalc);
$("#tool-epoxy-length")?.addEventListener("input", updateEpoxyCalc);
$("#tool-epoxy-width")?.addEventListener("input", updateEpoxyCalc);
$("#tool-epoxy-diameter")?.addEventListener("input", updateEpoxyCalc);
$("#tool-epoxy-depth")?.addEventListener("input", updateEpoxyCalc);
$("#tool-epoxy-ratio")?.addEventListener("change", updateEpoxyCalc);
$("#tool-epoxy-waste")?.addEventListener("input", updateEpoxyCalc);
$("#tool-screw-size")?.addEventListener("change", updateScrewGuide);
$("#tool-screw-wood")?.addEventListener("change", updateScrewGuide);
$("#inventory-csv-file")?.addEventListener("change", parseInventoryCSV);

// Universal Unit Converter listeners
$("#tool-unit-category")?.addEventListener("change", (e) => {
  populateUnitDropdowns(e.target.value);
  updateUniversalUnitConverter();
});
["#tool-unit-val", "#tool-unit-from", "#tool-unit-to"].forEach(s => $(s)?.addEventListener("input", updateUniversalUnitConverter));
["#tool-unit-from", "#tool-unit-to"].forEach(s => $(s)?.addEventListener("change", updateUniversalUnitConverter));

// Miter & Polygon Calculator listeners
$("#tool-miter-preset")?.addEventListener("change", updateMiterCalc);
$("#tool-miter-sides")?.addEventListener("input", updateMiterCalc);
$("#tool-miter-splay")?.addEventListener("input", updateMiterCalc);
$("#tool-miter-dia")?.addEventListener("input", updateMiterCalc);
$("#tool-miter-thick")?.addEventListener("input", updateMiterCalc);
$("#tool-miter-kerf")?.addEventListener("input", updateMiterCalc);

// Wood Species & Movement listeners
$("#tool-wood-species")?.addEventListener("change", updateWoodSpeciesView);
$("#tool-wood-width")?.addEventListener("input", updateWoodMovementCalc);
$("#tool-wood-cut")?.addEventListener("change", updateWoodMovementCalc);
$("#tool-wood-mc-swing")?.addEventListener("change", updateWoodMovementCalc);
$("#tool-wood-custom-mc")?.addEventListener("input", updateWoodMovementCalc);

// Dust Collection listeners
$("#tool-dust-machine")?.addEventListener("change", updateDustCalc);
$("#tool-dust-custom-cfm")?.addEventListener("input", updateDustCalc);
$("#tool-dust-dia")?.addEventListener("change", updateDustCalc);
$("#tool-dust-length")?.addEventListener("input", updateDustCalc);
$("#tool-dust-elbows90")?.addEventListener("input", updateDustCalc);
$("#tool-dust-elbows45")?.addEventListener("input", updateDustCalc);
$("#tool-dust-flex")?.addEventListener("input", updateDustCalc);

// Fiber Arts & Yarn listeners
$("#tool-yarn-section")?.addEventListener("input", event => {
  yarnCounterState.section = event.target.value;
});
$("#tool-yarn-pat-sts")?.addEventListener("input", updateYarnGaugeCalc);
$("#tool-yarn-pat-rows")?.addEventListener("input", updateYarnGaugeCalc);
$("#tool-yarn-my-sts")?.addEventListener("input", updateYarnGaugeCalc);
$("#tool-yarn-my-rows")?.addEventListener("input", updateYarnGaugeCalc);
$("#tool-yarn-target-width")?.addEventListener("input", updateYarnGaugeCalc);
$("#tool-yarn-weight-select")?.addEventListener("change", updateYarnWeightView);

// Electronics & Circuits listeners
$("#tool-led-vs-preset")?.addEventListener("change", updateLedCalc);
$("#tool-led-vs-custom")?.addEventListener("input", updateLedCalc);
$("#tool-led-color")?.addEventListener("change", updateLedCalc);
$("#tool-led-ma")?.addEventListener("input", updateLedCalc);
$("#tool-res-band1")?.addEventListener("change", updateResistorColorCode);
$("#tool-res-band2")?.addEventListener("change", updateResistorColorCode);
$("#tool-res-mult")?.addEventListener("change", updateResistorColorCode);
$("#tool-res-tol")?.addEventListener("change", updateResistorColorCode);

// Art & Color Studio listeners
$("#tool-art-color-picker")?.addEventListener("input", event => {
  if ($("#tool-art-hex")) $("#tool-art-hex").value = event.target.value;
  updateArtPalette();
});
$("#tool-art-hex")?.addEventListener("input", event => {
  const val = event.target.value;
  if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
    if ($("#tool-art-color-picker")) $("#tool-art-color-picker").value = val;
    updateArtPalette();
  }
});
$("#tool-art-harmony")?.addEventListener("change", updateArtPalette);
$("#tool-art-dim-mode")?.addEventListener("change", updateGoldenRatioCalc);
$("#tool-art-dim-val")?.addEventListener("input", updateGoldenRatioCalc);

// Music & Audio Studio listeners
$("#tool-music-bpm")?.addEventListener("input", updateMusicTiming);
$("#tool-music-note")?.addEventListener("change", updateMusicNoteView);
$("#tool-music-tuning")?.addEventListener("change", updateMusicNoteView);
$("#tool-music-src-bpm")?.addEventListener("input", updateMusicStretchCalc);
$("#tool-music-target-bpm")?.addEventListener("input", updateMusicStretchCalc);

// Chords & Drum Machine Studio listeners
$("#tool-chords-bpm")?.addEventListener("input", (e) => {
  const bpm = Math.max(50, Math.min(240, parseFloat(e.target.value) || 105));
  chordStudioState.bpm = bpm;
  if (chordStudioState.isPlaying) {
    stopChordPlayback(false);
    startChordPlayback();
  }
});
$("#tool-chords-preset")?.addEventListener("change", (e) => {
  updateChordPreset(e.target.value);
});
$("#tool-chords-key")?.addEventListener("change", (e) => {
  updateChordKey(e.target.value);
});
$("#tool-drum-preset")?.addEventListener("change", (e) => {
  applyDrumPreset(e.target.value);
});

// Main Music Studio View listeners
$("#music-main-bpm")?.addEventListener("input", (e) => {
  const bpm = Math.max(40, Math.min(260, parseFloat(e.target.value) || 105));
  chordStudioState.bpm = bpm;
  musicPlaybackState.bpm = bpm;
  const toolBpm = $("#tool-chords-bpm");
  if (toolBpm) toolBpm.value = bpm;
  updateMusicViewTimingResult();
  if (musicPlaybackState.isPlaying) {
    startMusicGroove(musicPlaybackState.playMode);
  }
});
$("#music-main-key")?.addEventListener("change", (e) => {
  updateChordKey(e.target.value);
});
$("#music-main-preset")?.addEventListener("change", (e) => {
  updateChordPreset(e.target.value);
});
$("#music-main-drum-preset")?.addEventListener("change", (e) => {
  applyDrumPreset(e.target.value);
});
$("#music-view-note")?.addEventListener("change", updateMusicViewNoteResult);
$("#music-view-tuning")?.addEventListener("change", updateMusicViewNoteResult);

// 🧵 Pixel & Stitch Studio listeners
$("#stitch-preset-select, #stitch-view-preset")?.addEventListener("change", (e) => {
  if (typeof loadStitchPreset === "function") loadStitchPreset(e.target.value);
});
$("#stitch-custom-color, #stitch-view-custom-color")?.addEventListener("input", (e) => {
  if (typeof stitchStudioState !== "undefined") {
    stitchStudioState.activeColor = e.target.value;
    if (typeof renderStitchPalette === "function") renderStitchPalette();
  }
});
$("#stitch-show-symbols, #stitch-view-symbols")?.addEventListener("change", () => {
  if (typeof renderStitchGrid === "function") renderStitchGrid();
});

// 📦 Papercraft & Packaging listeners
$("#tool-paper-gsm")?.addEventListener("input", updatePapercraftView);
$("#tool-box-length")?.addEventListener("input", updatePapercraftView);
$("#tool-box-width")?.addEventListener("input", updatePapercraftView);
$("#tool-box-depth")?.addEventListener("input", updatePapercraftView);
$("#tool-box-clearance")?.addEventListener("input", updatePapercraftView);

// 🖨️ 3D Print & Laser Job listeners
$("#tool-print-weight")?.addEventListener("input", updateFabricationView);
$("#tool-print-spool-cost")?.addEventListener("input", updateFabricationView);
$("#tool-print-hours")?.addEventListener("input", updateFabricationView);
$("#tool-print-watts")?.addEventListener("input", updateFabricationView);
$("#tool-laser-material")?.addEventListener("change", updateFabricationView);
$("#tool-laser-spot")?.addEventListener("input", updateFabricationView);
$("#tool-laser-watts")?.addEventListener("change", updateFabricationView);

// Swing Slider listener
$("#music-main-swing")?.addEventListener("input", (e) => {
  const lbl = $("#music-main-swing-lbl");
  if (lbl) lbl.textContent = `${e.target.value}%`;
});

// Jam keyboard shortcuts (1, 2, 3, 4 for Kick, Snare, Hat, Clap; Space for Play Both)
window?.addEventListener("keydown", (e) => {
  const tag = (e.target?.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select" || e.target?.isContentEditable) {
    return;
  }
  const musicView = $("#music-view");
  if (!musicView || !musicView.classList.contains("active")) {
    return;
  }
  if (e.key === "1" || e.key === "k" || e.key === "K") {
    e.preventDefault();
    hitLiveDrumPad("kick");
  } else if (e.key === "2" || e.key === "s" || e.key === "S") {
    e.preventDefault();
    hitLiveDrumPad("snare");
  } else if (e.key === "3" || e.key === "h" || e.key === "H") {
    e.preventDefault();
    hitLiveDrumPad("hat");
  } else if (e.key === "4" || e.key === "c" || e.key === "C") {
    e.preventDefault();
    hitLiveDrumPad("clap");
  } else if (e.code === "Space") {
    e.preventDefault();
    if (musicPlaybackState.isPlaying) {
      stopMusicGroove();
    } else {
      startMusicGroove("both");
    }
  }
});
$("#tools-dialog")?.addEventListener("close", () => {
  stopChordPlayback();
  if (metronomeIntervalId) toggleMetronome();
  const filterInput = $("#studio-quick-filter");
  if (filterInput) {
    filterInput.value = "";
    $$("#studio-quick-btn-grid button").forEach(el => el.classList.remove("hidden-studio"));
  }
});

$("#mobile-studios-dialog")?.addEventListener("close", () => {
  const filterInput = $("#mobile-studio-filter");
  if (filterInput) {
    filterInput.value = "";
    $$("#mobile-studios-grid .mobile-studio-card").forEach(el => el.classList.remove("hidden-studio"));
  }
});

$("#backup-input")?.addEventListener("change", async event => {
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
  btn?.addEventListener("click", () => switchAuthTab(btn.dataset.authTab));
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


/* Prevent Escape key from closing auth dialog when locked for guests */
$("#auth-dialog")?.addEventListener("cancel", event => {
  if (!getActiveUser()) {
    event.preventDefault();
  }
});

/* Admin console listeners */
$("#admin-create-user-form")?.addEventListener("submit", async event => {
  event.preventDefault();
  if (!isCurrentUserAdmin()) {
    showToast("Admin privileges required to create accounts.");
    return;
  }
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



$("#goal-form")?.addEventListener("submit", event => void handleGoalSubmit(event));
$("#maintenance-form")?.addEventListener("submit", event => void handleMaintenanceSubmit(event));
$("#units-form")?.addEventListener("submit", event => { event.preventDefault(); void saveUnitsSettings(); });
$("#soundscape-volume")?.addEventListener("input", event => setSoundscapeVolume(event.target.value));
$("#tool-cut-stock")?.addEventListener("input", () => runCutOptimizer());
$("#tool-cut-kerf")?.addEventListener("input", () => runCutOptimizer());
$("#detail-dialog")?.addEventListener("close", () => { activeProjectId = null; });

void initialize();

if (typeof window !== "undefined") {
  window.render = render;
  window.renderNavigation = renderNavigation;
  window.renderOverview = renderOverview;
  window.switchView = switchView;
  window.handleAction = handleAction;
  window.checkHashRouting = checkHashRouting;
  window.initialize = initialize;
}
