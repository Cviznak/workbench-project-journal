/* ==========================================================================
   Workbench 3.0 — Skills & XP Module
   Clean, motivating skill progression for makers, fabricators, and creators.
   ========================================================================== */

function renderSkills() {
  const container = document.getElementById("skills-list");
  if (!container) return;

  const skills = state.skills || [];
  const practiceLog = state.practiceLog || [];

  // Update Skill Stat Strip
  const totalSkillsEl = document.getElementById("skills-stat-total");
  const totalXpEl = document.getElementById("skills-stat-xp");
  const topSkillEl = document.getElementById("skills-stat-top");
  const sessionsEl = document.getElementById("skills-stat-sessions");

  const totalXp = skills.reduce((sum, s) => sum + (Number(s.xp) || 0), 0);
  const sortedByXp = [...skills].sort((a, b) => (Number(b.xp) || 0) - (Number(a.xp) || 0));
  const topSkill = sortedByXp[0];

  if (totalSkillsEl) totalSkillsEl.textContent = `${skills.length} ${skills.length === 1 ? "skill" : "skills"}`;
  if (totalXpEl) totalXpEl.textContent = `${totalXp.toLocaleString()} XP`;
  if (topSkillEl) {
    topSkillEl.textContent = topSkill
      ? `${topSkill.icon || "🎯"} Lvl ${skillLevel(topSkill.xp)} (${topSkill.name})`
      : "No skills yet";
  }
  if (sessionsEl) sessionsEl.textContent = `${practiceLog.length} ${practiceLog.length === 1 ? "session" : "sessions"}`;

  // Filter & Search
  const query = (document.getElementById("skills-search")?.value || "").toLowerCase().trim();
  const filterCat = state.skillsFilter || "all";

  const filtered = skills.filter(s => {
    const matchesQuery = !query ||
      (s.name || "").toLowerCase().includes(query) ||
      (s.category || "").toLowerCase().includes(query) ||
      (s.notes || "").toLowerCase().includes(query);
    const matchesCat = filterCat === "all" || (s.category || "").toLowerCase() === filterCat.toLowerCase();
    return matchesQuery && matchesCat;
  });

  // Empty State (Zero Defaults)
  if (filtered.length === 0) {
    if (skills.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1">
          <div class="empty-icon">🎯</div>
          <h3>No skills added yet</h3>
          <p class="empty-hint">Add the crafts, techniques, and maker tools you are developing (e.g. 3D Printing, Wood Joinery, Soldering, Leathercraft). Earn XP and celebrate every level up as you build.</p>
          <button type="button" class="btn btn-primary" onclick="openSkillDialog()">＋ Add Your First Skill</button>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1">
          <div class="empty-icon">⌕</div>
          <h3>No matching skills</h3>
          <p class="empty-hint">Try adjusting your search query or category filter.</p>
          <button type="button" class="btn btn-outline" onclick="resetSkillsFilter()">Show All Skills</button>
        </div>
      `;
    }
    return;
  }

  // Render Skill Cards
  container.innerHTML = filtered.map(skill => {
    const xp = Number(skill.xp) || 0;
    const lvl = skillLevel(xp);
    const progress = skillProgress(xp);
    const icon = skill.icon || "🎯";

    return `
      <div class="skill-card" data-skill-id="${skill.id}">
        <div class="skill-card-top">
          <div class="skill-avatar">${escapeHTML(icon)}</div>
          <div class="skill-info">
            <h3 class="skill-name">${escapeHTML(skill.name)}</h3>
            <span class="skill-category">${escapeHTML(skill.category || "General Maker")}</span>
          </div>
          <div class="skill-level-badge">⭐ Level ${lvl}</div>
        </div>

        <div class="skill-xp-wrap">
          <div class="skill-xp-header">
            <span>${progress} / 100 XP to Level ${lvl + 1}</span>
            <strong class="skill-xp-total">${xp.toLocaleString()} XP total</strong>
          </div>
          <div class="skill-xp-track">
            <div class="skill-xp-fill" style="width: ${progress}%"></div>
          </div>
        </div>

        ${skill.notes ? `<p class="skill-notes">${escapeHTML(skill.notes)}</p>` : ""}

        <!-- Quick XP Action Row -->
        <div class="skill-xp-actions">
          <span class="skill-xp-label">Quick XP:</span>
          <button type="button" class="xp-btn" onclick="quickAwardXp('${skill.id}', 15)" title="Tinkering / Quick session">+15</button>
          <button type="button" class="xp-btn" onclick="quickAwardXp('${skill.id}', 25)" title="Standard practice session">+25</button>
          <button type="button" class="xp-btn" onclick="quickAwardXp('${skill.id}', 50)" title="Major project milestone">+50</button>
          <button type="button" class="btn btn-xs btn-outline" onclick="openPracticeDialog('${skill.id}')" title="Log detailed practice notes">✎ Log</button>
        </div>

        <div class="skill-card-bottom">
          <span class="skill-last-practiced">
            ${skill.lastPracticed ? `Practiced ${relativeTime(skill.lastPracticed)}` : "Not practiced yet"}
          </span>
          <div class="btn-group">
            <button type="button" class="icon-btn" onclick="openSkillDialog('${skill.id}')" title="Edit skill">✎</button>
            <button type="button" class="icon-btn danger" onclick="deleteSkill('${skill.id}')" title="Delete skill">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// Reset filter
function resetSkillsFilter() {
  state.skillsFilter = "all";
  const searchInput = document.getElementById("skills-search");
  if (searchInput) searchInput.value = "";
  document.querySelectorAll("#skills-view .pill-btn").forEach(b => {
    b.classList.toggle("active", b.getAttribute("data-cat") === "all");
  });
  renderSkills();
}

function setSkillsFilter(cat, btn) {
  state.skillsFilter = cat;
  document.querySelectorAll("#skills-view .pill-btn").forEach(b => b.classList.toggle("active", b === btn));
  renderSkills();
}

// Open create/edit skill dialog
function openSkillDialog(skillId = null) {
  const dialog = document.getElementById("skill-dialog");
  const form = document.getElementById("skill-form");
  const title = document.getElementById("skill-dialog-title");
  if (!dialog || !form) return;

  form.reset();
  form.elements.id.value = "";
  form.elements.icon.value = "🎯";

  if (skillId) {
    const skill = (state.skills || []).find(s => s.id === skillId);
    if (skill) {
      if (title) title.textContent = "Edit Skill";
      form.elements.id.value = skill.id || "";
      form.elements.name.value = skill.name || "";
      form.elements.icon.value = skill.icon || "🎯";
      form.elements.category.value = skill.category || "";
      form.elements.xp.value = Number(skill.xp) || 0;
      form.elements.notes.value = skill.notes || "";
    }
  } else {
    if (title) title.textContent = "Add Maker Skill";
    form.elements.xp.value = 0;
  }

  dialog.showModal();
}

// Quick emoji setter in skill form
function setSkillFormIcon(emoji) {
  const form = document.getElementById("skill-form");
  if (form && form.elements.icon) {
    form.elements.icon.value = emoji;
  }
}

// Save skill submit handler
async function handleSkillSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const id = form.elements.id.value;
  const name = form.elements.name.value.trim();
  if (!name) return;

  const icon = form.elements.icon.value.trim() || "🎯";
  const category = form.elements.category.value.trim() || "General Maker";
  const xp = Math.max(0, parseInt(form.elements.xp.value, 10) || 0);
  const notes = form.elements.notes.value.trim();

  state.skills = state.skills || [];

  if (id) {
    const existing = state.skills.find(s => s.id === id);
    if (existing) {
      existing.name = name;
      existing.icon = icon;
      existing.category = category;
      existing.xp = xp;
      existing.notes = notes;
      existing.updatedAt = new Date().toISOString();
      showToast(`Skill “${name}” updated!`);
    }
  } else {
    const newSkill = {
      id: "skill_" + uid(),
      name,
      icon,
      category,
      xp,
      notes,
      lastPracticed: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    state.skills.push(newSkill);
    showToast(`Skill “${name}” created!`);
  }

  await persistState();
  form.closest("dialog")?.close();
  renderSkills();
  if (typeof updateProjectSkillOptions === "function") updateProjectSkillOptions();
}

// Delete skill
async function deleteSkill(skillId) {
  const skill = (state.skills || []).find(s => s.id === skillId);
  if (!skill) return;

  if (!confirm(`Delete skill “${skill.name}” (${skill.xp} XP)?`)) return;

  state.skills = state.skills.filter(s => s.id !== skillId);

  // Clean up any references in projects
  (state.projects || []).forEach(p => {
    if (Array.isArray(p.skillIds)) {
      p.skillIds = p.skillIds.filter(id => id !== skillId);
    }
  });

  await persistState();
  renderSkills();
  showToast(`Skill “${skill.name}” removed.`);
}

// Quick XP award
async function quickAwardXp(skillId, amount, reason = "Practice Session") {
  const skill = (state.skills || []).find(s => s.id === skillId);
  if (!skill) return;

  const numAmount = parseInt(amount, 10) || 0;
  if (numAmount <= 0) return;

  const oldLvl = skillLevel(skill.xp);
  skill.xp = (Number(skill.xp) || 0) + numAmount;
  skill.lastPracticed = new Date().toISOString();
  skill.updatedAt = new Date().toISOString();
  const newLvl = skillLevel(skill.xp);

  // Log in practice log
  state.practiceLog = state.practiceLog || [];
  state.practiceLog.unshift({
    id: "prac_" + uid(),
    skillId: skill.id,
    skillName: skill.name,
    amount: numAmount,
    reason,
    at: new Date().toISOString()
  });

  await persistState();
  renderSkills();

  // Celebrate level up!
  if (newLvl > oldLvl) {
    showToast(`🎉 LEVEL UP! ${skill.icon || "🎯"} ${skill.name} reached Level ${newLvl}! ⭐`, "success");
  } else {
    showToast(`+${numAmount} XP to ${skill.name}! (Now ${skill.xp} XP)`);
  }
}

// Practice Log Dialog
function openPracticeDialog(skillId = null) {
  const dialog = document.getElementById("practice-dialog");
  const form = document.getElementById("practice-form");
  const select = document.getElementById("practice-skill-select");
  if (!dialog || !form || !select) return;

  form.reset();
  select.innerHTML = (state.skills || []).map(s => `
    <option value="${s.id}" ${s.id === skillId ? "selected" : ""}>
      ${escapeHTML(s.icon || "🎯")} ${escapeHTML(s.name)} (Lvl ${skillLevel(s.xp)})
    </option>
  `).join("");

  if (state.skills.length === 0) {
    showToast("Please add a skill before logging practice.");
    openSkillDialog();
    return;
  }

  dialog.showModal();
}

async function handlePracticeSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const skillId = form.elements.skillId.value;
  const amount = parseInt(form.elements.amount.value, 10) || 25;
  const notes = form.elements.notes.value.trim() || "Workshop practice session";

  await quickAwardXp(skillId, amount, notes);
  form.closest("dialog")?.close();
}

if (typeof window !== "undefined") {
  window.renderSkills = renderSkills;
  window.openSkillDialog = openSkillDialog;
  window.setSkillFormIcon = setSkillFormIcon;
  window.handleSkillSubmit = handleSkillSubmit;
  window.deleteSkill = deleteSkill;
  window.quickAwardXp = quickAwardXp;
  window.openPracticeDialog = openPracticeDialog;
  window.handlePracticeSubmit = handlePracticeSubmit;
  window.setSkillsFilter = setSkillsFilter;
  window.resetSkillsFilter = resetSkillsFilter;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    renderSkills,
    openSkillDialog,
    handleSkillSubmit,
    deleteSkill,
    quickAwardXp,
    openPracticeDialog,
    handlePracticeSubmit,
    setSkillsFilter,
    resetSkillsFilter
  };
}
