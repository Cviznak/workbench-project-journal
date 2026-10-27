/* ============================================================
   Workbench Project Journal - Skills, Timer, Milestones & Goals
   ============================================================ */

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

let timerAudioCtx = null;
function getTimerAudioCtx() {
  if (typeof getMusicAudioCtx === "function") return getMusicAudioCtx();
  if (!timerAudioCtx || timerAudioCtx.state === "closed") {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    timerAudioCtx = new AudioCtx();
  }
  if (timerAudioCtx.state === "suspended") {
    void timerAudioCtx.resume();
  }
  return timerAudioCtx;
}

function playTimerChime() {
  if (!timer.soundEnabled) return;
  try {
    const ctx = getTimerAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      const startAt = now + idx * 0.12;
      osc.frequency.setValueAtTime(freq, startAt);
      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(0.2, startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startAt);
      osc.stop(startAt + 0.45);
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

  // Floating widget sync
  const floatDisplay = $("#floating-timer-display");
  if (floatDisplay) floatDisplay.textContent = timeText;
  const floatPlayBtn = $("#floating-timer-play-btn");
  if (floatPlayBtn) floatPlayBtn.textContent = timer.isRunning ? "⏸" : "▶";

  // Cycle dots
  const dotsContainer = $("#pomodoro-cycle-dots");
  if (dotsContainer) {
    dotsContainer.innerHTML = [1, 2, 3, 4].map(c => `
      <span class="pomodoro-dot ${c < timer.cycle ? "filled" : c === timer.cycle ? "filled current" : ""}" title="Cycle ${c}"></span>
    `).join("");
  }
}

function minimizeTimer() {
  $("#timer-dialog")?.close();
  const floatWidget = $("#floating-timer-widget");
  if (floatWidget) floatWidget.style.display = "flex";
  try {
    localStorage.setItem("workbench_timer_minimized", "true");
  } catch {}
  showToast("Focus timer minimized to floating widget.");
}

function restoreTimer() {
  const floatWidget = $("#floating-timer-widget");
  if (floatWidget) floatWidget.style.display = "none";
  try {
    localStorage.setItem("workbench_timer_minimized", "false");
  } catch {}
  openTimerDialog();
}

function closeFloatingTimer() {
  const floatWidget = $("#floating-timer-widget");
  if (floatWidget) floatWidget.style.display = "none";
  try {
    localStorage.setItem("workbench_timer_minimized", "false");
  } catch {}
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
        if ($("#detail-dialog")?.open) renderProjectDetail(project.id);
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

if (typeof window !== "undefined") {
  window.openTimerDialog = openTimerDialog;
  window.toggleTimer = toggleTimer;
  window.resetTimer = resetTimer;
  window.renderAchievements = renderAchievements;
  window.renderWeeklyGoal = renderWeeklyGoal;
  window.setWeeklyPracticeGoal = setWeeklyPracticeGoal;
  window.renderMakerGoals = renderMakerGoals;
}
