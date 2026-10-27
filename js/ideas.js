/* ============================================================
   Workbench Project Journal - Project Ideas & Maker Sparks System
   ============================================================ */

/* ============================================================
   💡 Project Ideas & Maker Sparks System
   ============================================================ */

const IDEA_CATEGORIES = {
  woodworking: { name: "Woodworking", icon: "🪵" },
  textiles: { name: "Textiles & Fiber", icon: "🧶" },
  music: { name: "Music & Audio", icon: "🎵" },
  electronics: { name: "Electronics & IoT", icon: "⚡" },
  programming: { name: "Software & MCU", icon: "💻" },
  art: { name: "Fine Art & Design", icon: "🎨" },
  resin: { name: "Epoxy & Casting", icon: "🧪" },
  printing: { name: "3D Printing", icon: "🖨️" },
  origami: { name: "Origami & Paper", icon: "🦢" },
  laser: { name: "Laser Cutting", icon: "🔥" },
  leather: { name: "Leathercraft", icon: "🪡" },
  ceramics: { name: "Ceramics & Pottery", icon: "🏺" },
  welding: { name: "Welding & Metal", icon: "⚡" },
  cnc: { name: "CNC Machining", icon: "⚙️" },
  blacksmith: { name: "Blacksmithing", icon: "⚒️" },
  fasteners: { name: "Fasteners & Hardware", icon: "🔩" },
  glass: { name: "Stained Glass", icon: "🪟" },
  jewelry: { name: "Jewelry Making", icon: "💍" },
  bookbinding: { name: "Bookbinding & Print", icon: "📖" },
  sla: { name: "Resin SLA Print", icon: "🧪" },
  luthier: { name: "Luthier & Guitar", icon: "🎸" },
  composites: { name: "Carbon Fiber", icon: "🌀" },
  horology: { name: "Watchmaking", icon: "⏱️" },
  robotics: { name: "Robotics & Motors", icon: "🤖" },
  bicycle: { name: "Bicycle Framebuilding", icon: "🚲" },
  general: { name: "General Craft", icon: "✨" }
};

const STARTER_IDEAS = [
  {
    id: "idea-starter-1",
    title: "Live Edge Black Walnut Charcuterie Board",
    category: "woodworking",
    priority: "high",
    effort: "weekend",
    cost: "45",
    supplies: "Kiln-dried walnut slab, food-safe mineral oil, brass cabinet handles, beeswax",
    notes: "Flatten with router sled, chamfer underside 45 degrees for finger grip, carve juice groove with ball-nose bit.",
    status: "ready",
    createdAt: new Date().toISOString()
  },
  {
    id: "idea-starter-2",
    title: "Ortholinear Split Macro Pad with OLED & Rotary",
    category: "electronics",
    priority: "high",
    effort: "weekend",
    cost: "38",
    supplies: "Raspberry Pi Pico RP2040, Kailh Choc v2 switches, custom PCB, EC11 encoder, 0.91in I2C OLED",
    notes: "Program with QMK / Vial firmware for layered hotkeys in Fusion 360, KiCAD, and VS Code.",
    status: "ready",
    createdAt: new Date().toISOString()
  },
  {
    id: "idea-starter-3",
    title: "Hand-Stitched Shell Cordovan 5-Pocket Card Wallet",
    category: "leather",
    priority: "normal",
    effort: "quick",
    cost: "30",
    supplies: "3oz Horween shell cordovan, 0.6mm Vinymo poly thread, Tokonole burnishing gum",
    notes: "3.85mm French pricking irons, saddle stitch with 2 harness needles, polished glass burnished edge.",
    status: "brainstorming",
    createdAt: new Date().toISOString()
  },
  {
    id: "idea-starter-4",
    title: "Vacuum-Compacted Carbon Fiber Drone Top Plate",
    category: "composites",
    priority: "normal",
    effort: "weekend",
    cost: "40",
    supplies: "3K 200gsm 2x2 twill carbon cloth, laminating epoxy, peel ply, vacuum bag film, breather mesh",
    notes: "Quasi-isotropic [0/45/90/-45]s layup, 28 inHg vacuum clamp, CNC profile routing under water bath.",
    status: "brainstorming",
    createdAt: new Date().toISOString()
  },
  {
    id: "idea-starter-5",
    title: "Lost-Wax Cast 14K Gold Signet Ring",
    category: "jewelry",
    priority: "normal",
    effort: "multi-week",
    cost: "120",
    supplies: "Blue carving wax, investment powder, 14K casting grain, sprue base, pickle acid",
    notes: "Carve monogram with micro graver, vacuum debubble investment, burnout kiln ramp to 1350F.",
    status: "brainstorming",
    createdAt: new Date().toISOString()
  },
  {
    id: "idea-starter-6",
    title: "Hardcover French-Link Coptic Stitch Sketchbook",
    category: "bookbinding",
    priority: "low",
    effort: "weekend",
    cost: "22",
    supplies: "140gsm cotton watercolor paper, Davey book board, bookcloth, waxed Irish linen thread, bone folder",
    notes: "8 signatures of 4 folios each (64 pages), exposed French-link stitch spine allowing flat 180° opening.",
    status: "brainstorming",
    createdAt: new Date().toISOString()
  }
];

const CURATED_SPARKS = [
  {
    id: "spark-1",
    title: "Kumiko Lantern with Hinoki Cypress",
    category: "woodworking",
    effort: "weekend",
    cost: "35",
    supplies: "Basswood/Cypress strips, shoji paper, LED warm puck light, guide block",
    notes: "Asa-no-ha (hemp leaf) pattern lattice frame with mitered half-lap corner joints."
  },
  {
    id: "spark-2",
    title: "Smart Workshop Dust Collector Gate",
    category: "electronics",
    effort: "weekend",
    cost: "28",
    supplies: "ESP32 MCU, current sensor CT clamp, MG996R servo motor, 4in blast gate",
    notes: "Detects current draw when table saw runs, automatically swings blast gate open."
  },
  {
    id: "spark-3",
    title: "Hexagonal Wall Pegboard Modular Tool Grid",
    category: "printing",
    effort: "quick",
    cost: "18",
    supplies: "PLA+ filament spools, drywall anchors, M3 hex standoffs",
    notes: "Interlocking honeycomb tiles with custom snap clips for calipers, pliers, and cutters."
  },
  {
    id: "spark-4",
    title: "Waxed Canvas & Horween Leather Shop Apron",
    category: "leather",
    effort: "weekend",
    cost: "45",
    supplies: "12oz waxed canvas, 5oz vegetable tanned leather straps, solid copper rivets",
    notes: "Cross-back harness design to relieve neck strain; reinforced pockets for pencil, square, and phone."
  },
  {
    id: "spark-5",
    title: "Hand-Forged Damascus Steel EDC Bottle Opener",
    category: "blacksmith",
    effort: "quick",
    cost: "15",
    supplies: "1095 & 15N20 billet scrap, borax flux, ferric chloride etchant",
    notes: "Folded 60-layer billet, full twist handle pattern, quenched in canola oil and acid etched."
  },
  {
    id: "spark-6",
    title: "Hand-Wound Single-Coil Guitar Pickup",
    category: "luthier",
    effort: "weekend",
    cost: "30",
    supplies: "Alnico 5 rod magnets, vulcanized fiber flatwork, 42 AWG plain enamel wire, paraffin wax",
    notes: "Scatter-wound to ~6.4k ohms, potted in beeswax/paraffin 80/20 mix for vintage Strat chime."
  },
  {
    id: "spark-7",
    title: "Vacuum-Compacted Carbon Fiber Watch Travel Case",
    category: "composites",
    effort: "weekend",
    cost: "50",
    supplies: "3K 2x2 twill carbon, epoxy resin, high-density EVA foam, brass zipper",
    notes: "Two-piece clamshell molded on 3D printed negative tool, polished with automotive clear coat."
  },
  {
    id: "spark-8",
    title: "Mechanical Watch Acoustic Pickup & Timegrapher Sensor",
    category: "horology",
    effort: "quick",
    cost: "20",
    supplies: "Piezo microphone pickup, op-amp preamp circuit, 3.5mm jack, watchmaker loupe",
    notes: "Acoustic sensor feeding tick sounds into open-source software for daily rate balance regulation."
  },
  {
    id: "spark-9",
    title: "Articulated 2-DOF Scara Robotic Pen Plotter",
    category: "robotics",
    effort: "multi-week",
    cost: "55",
    supplies: "2x NEMA 17 steppers, GT2 timing belts, TMC2209 silent drivers, Arduino CNC shield",
    notes: "Draws generative SVG vector artwork and schematics using technical fineliner pens."
  },
  {
    id: "spark-10",
    title: "Hand-Laced 32-Hole Tubeless Gravel Wheelset",
    category: "bicycle",
    effort: "weekend",
    cost: "140",
    supplies: "Alloy 25mm internal gravel rims, DT Swiss 350 hubs, Sapim double-butted spokes, brass nipples",
    notes: "3-cross lacing, tensioned to 115 kgf drive side, dished to 0.2mm tolerance with spoke tensiometer."
  },
  {
    id: "spark-11",
    title: "Tiffany-Style Honeycomb Stained Glass Suncatcher",
    category: "glass",
    effort: "quick",
    cost: "25",
    supplies: "Amber & textured clear glass, 7/32in copper foil, 60/40 solder, black patina",
    notes: "Hexagonal honeycomb cluster with wire-wrapped copper reinforcement and hanging rings."
  },
  {
    id: "spark-12",
    title: "Lost-Wax Cast Sterling Silver Branch Ring with Flush Gem",
    category: "jewelry",
    effort: "weekend",
    cost: "35",
    supplies: "Sculpting wax wire, 925 casting grain, 3mm synthetic sapphire, investment plaster",
    notes: "Organic tree bark texture formed by flame manipulation, burnished bezel gem setting."
  }
];

function saveIdeasBackup(ideas) {
  if (!Array.isArray(ideas)) return;
  try {
    const json = JSON.stringify(ideas);
    localStorage.setItem("workbench_saved_ideas", json);
    const key = typeof getActiveStateKey === "function" ? getActiveStateKey() : "main";
    localStorage.setItem(`workbench_saved_ideas_${key}`, json);
  } catch (e) {
    console.warn("Could not save ideas backup to localStorage:", e);
  }
}

function readIdeasBackup() {
  try {
    const key = typeof getActiveStateKey === "function" ? getActiveStateKey() : "main";
    const userRaw = localStorage.getItem(`workbench_saved_ideas_${key}`);
    if (userRaw) {
      const parsed = JSON.parse(userRaw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    const globalRaw = localStorage.getItem("workbench_saved_ideas");
    if (globalRaw) {
      const parsed = JSON.parse(globalRaw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn("Could not read ideas backup from localStorage:", e);
  }
  return null;
}

function mergeIdeas(existingIdeas, newIdeas) {
  const map = new Map();
  for (const item of (Array.isArray(existingIdeas) ? existingIdeas : [])) {
    if (item?.id) map.set(item.id, item);
  }
  for (const item of (Array.isArray(newIdeas) ? newIdeas : [])) {
    if (!item?.id) continue;
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
    } else {
      const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
      const newTime = new Date(item.updatedAt || item.createdAt || 0).getTime();
      if (newTime >= existingTime) {
        map.set(item.id, { ...existing, ...item });
      }
    }
  }
  return Array.from(map.values());
}

function renderIdeasView() {
  const container = $("#ideas-grid");
  if (!container) return;

  const ideas = state.ideas || [];

  // Update Stats
  const totalCount = ideas.length;
  const readyCount = ideas.filter(i => i.status === "ready").length;
  const promotedCount = ideas.filter(i => i.status === "promoted").length;
  const highCount = ideas.filter(i => i.priority === "high").length;

  const statTotal = $("#stat-ideas-total");
  if (statTotal) statTotal.textContent = totalCount;
  const statReady = $("#stat-ideas-ready");
  if (statReady) statReady.textContent = readyCount;
  const statPromoted = $("#stat-ideas-promoted");
  if (statPromoted) statPromoted.textContent = promotedCount;
  const statHigh = $("#stat-ideas-high");
  if (statHigh) statHigh.textContent = highCount;

  // Filter values
  const q = ($("#idea-search")?.value || "").toLowerCase().trim();
  const cat = $("#idea-category-filter")?.value || "all";
  const status = $("#idea-status-filter")?.value || "all";
  const priority = $("#idea-priority-filter")?.value || "all";

  const filtered = ideas.filter(item => {
    if (cat !== "all" && item.category !== cat) return false;
    if (status !== "all" && item.status !== status) return false;
    if (priority !== "all" && item.priority !== priority) return false;
    if (q) {
      const title = (item.title || "").toLowerCase();
      const notes = (item.notes || "").toLowerCase();
      const supplies = (item.supplies || "").toLowerCase();
      const category = (item.category || "").toLowerCase();
      if (!title.includes(q) && !notes.includes(q) && !supplies.includes(q) && !category.includes(q)) {
        return false;
      }
    }
    return true;
  });

  const countBadge = $("#idea-result-count");
  if (countBadge) countBadge.textContent = `${filtered.length} idea${filtered.length === 1 ? "" : "s"}`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; padding: 48px 16px">
        <div class="empty-state-mark">💡</div>
        <h3>No project ideas match your filter</h3>
        <p>Brainstorm a fresh project build or adopt an idea from the curated sparks below!</p>
        <button type="button" class="button button-primary" data-action="new-idea">＋ Create New Idea</button>
      </div>
    `;
  } else {
    container.innerHTML = filtered.map(idea => {
      const catMeta = IDEA_CATEGORIES[idea.category] || { name: idea.category || "General", icon: "✨" };
      const priorityLabel = idea.priority === "high" ? "★★★ High" : idea.priority === "low" ? "★ Low" : "★★ Normal";
      const statusClass = idea.status === "promoted" ? "status-promoted" : idea.status === "ready" ? "status-ready" : "";
      const statusText = idea.status === "promoted" ? "🚀 Promoted to Project" : idea.status === "ready" ? "⚡ Ready to Build" : "💭 Brainstorming";
      const effortText = idea.effort === "quick" ? "⚡ Quick Build" : idea.effort === "multi-week" ? "🏔️ Multi-Week" : idea.effort === "long-term" ? "🌌 Long-Term" : "🔨 Weekend Build";
      const costText = idea.cost ? formatMoney(idea.cost) : "";

      const promoteBtn = idea.status === "promoted"
        ? `<button type="button" class="button button-small button-outline" data-action="open-promoted-project" data-project-id="${escapeHtml(idea.promotedProjectId || "")}">↗ View Project</button>`
        : `<button type="button" class="button button-small button-primary" data-action="promote-idea" data-idea-id="${escapeHtml(idea.id)}">🚀 Promote to Project</button>`;

      return `
        <article class="idea-card" data-id="${escapeHtml(idea.id)}">
          <div class="idea-card-header">
            <div class="idea-card-tags">
              <span class="idea-category-tag">${catMeta.icon} ${escapeHtml(catMeta.name)}</span>
              <span class="idea-priority-tag priority-${escapeHtml(idea.priority || "normal")}">${priorityLabel}</span>
            </div>
            <span class="idea-status-tag ${statusClass}">${statusText}</span>
          </div>
          <h3>${escapeHtml(idea.title)}</h3>
          <p class="idea-card-desc">${escapeHtml(idea.notes || "No notes added yet.")}</p>
          <div class="idea-card-meta">
            <span class="idea-meta-item" title="Effort">${effortText}</span>
            ${costText ? `<span class="idea-meta-item" title="Budget">💰 ~${costText}</span>` : ""}
            ${idea.supplies ? `<span class="idea-meta-item" title="Key Supplies">📦 ${escapeHtml(idea.supplies)}</span>` : ""}
          </div>
          <div class="idea-card-actions">
            ${promoteBtn}
            <div style="display:flex;gap:6px">
              <button type="button" class="icon-button" data-action="edit-idea" data-idea-id="${escapeHtml(idea.id)}" title="Edit Idea">✏️</button>
              <button type="button" class="icon-button" data-action="delete-idea" data-idea-id="${escapeHtml(idea.id)}" title="Delete Idea">🗑️</button>
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  renderCuratedSparks();
}

function renderCuratedSparks() {
  const container = $("#ideas-sparks-grid");
  if (!container) return;

  const sparks = [...CURATED_SPARKS].sort(() => 0.5 - Math.random()).slice(0, 4);

  container.innerHTML = sparks.map(spark => {
    const cat = IDEA_CATEGORIES[spark.category] || { name: spark.category, icon: "✨" };
    return `
      <div class="spark-card">
        <div class="spark-card-header">
          <span>${cat.icon} ${cat.name}</span>
          <span style="margin-left:auto;color:var(--muted)">~${formatMoney(spark.cost)}</span>
        </div>
        <h4>${escapeHtml(spark.title)}</h4>
        <p>${escapeHtml(spark.notes)}</p>
        <button type="button" class="button button-small button-outline" data-action="adopt-spark" data-spark-id="${escapeHtml(spark.id)}" style="margin-top:auto">＋ Adopt This Idea</button>
      </div>
    `;
  }).join("");
}

function openIdeaDialog(ideaId = null) {
  const dialog = $("#idea-dialog");
  const form = $("#idea-form");
  if (!dialog || !form) return;

  form.reset();
  const deleteBtn = $("#delete-idea-btn");
  const el = form.elements || {};

  const setVal = (name, val) => {
    const field = el.namedItem ? el.namedItem(name) : el[name];
    if (field) {
      field.value = val;
    } else {
      const input = form.querySelector(`[name="${name}"]`);
      if (input) input.value = val;
    }
  };
  const setChecked = (name, val) => {
    const field = el.namedItem ? el.namedItem(name) : el[name];
    if (field) {
      field.checked = Boolean(val);
    } else {
      const input = form.querySelector(`[name="${name}"]`);
      if (input) input.checked = Boolean(val);
    }
  };

  if (ideaId) {
    const idea = (state.ideas || []).find(i => i.id === ideaId);
    if (!idea) return;
    const titleEl = $("#idea-dialog-title");
    if (titleEl) titleEl.textContent = "Edit Project Idea";
    setVal("id", idea.id);
    setVal("title", idea.title || "");
    setVal("category", idea.category || "");
    setVal("priority", idea.priority || "");
    setVal("effort", idea.effort || "");
    setVal("cost", idea.cost || "");
    setVal("supplies", idea.supplies || "");
    setVal("notes", idea.notes || "");
    setVal("status", idea.status || "");
    setChecked("isGift", Boolean(idea.isGift));
    setVal("giftRecipient", idea.giftRecipient || "");
    if (deleteBtn) {
      deleteBtn.classList.remove("hidden");
      deleteBtn.dataset.ideaId = idea.id;
    }
  } else {
    const titleEl = $("#idea-dialog-title");
    if (titleEl) titleEl.textContent = "New Project Idea";
    setVal("id", "");
    setVal("title", "");
    setVal("category", "");
    setVal("priority", "");
    setVal("effort", "");
    setVal("cost", "");
    setVal("supplies", "");
    setVal("notes", "");
    setVal("status", "");
    setChecked("isGift", false);
    setVal("giftRecipient", "");
    if (deleteBtn) deleteBtn.classList.add("hidden");
  }

  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

let isSavingIdea = false;

async function saveIdeaFromForm(form) {
  if (typeof isSavingIdea !== "undefined" && isSavingIdea) return;
  if (typeof isSavingIdea !== "undefined") isSavingIdea = true;
  try {
    const targetForm = (form && form.elements) ? form : $("#idea-form");
    if (!targetForm) return;
    const el = targetForm.elements || {};
    const getVal = (name) => {
      let field = null;
      if (el) {
        field = el.namedItem ? el.namedItem(name) : el[name];
      }
      return (field?.value || (typeof targetForm.querySelector === "function" ? targetForm.querySelector(`[name="${name}"]`)?.value : "") || "").trim();
    };
    const getChecked = (name) => {
      let field = null;
      if (el) {
        field = el.namedItem ? el.namedItem(name) : el[name];
      }
      return Boolean(field?.checked ?? (typeof targetForm.querySelector === "function" ? targetForm.querySelector(`[name="${name}"]`)?.checked : false));
    };

    const id = getVal("id") || uid();
    // Cache the assigned ID into the form controls immediately so that any subsequent read in the same lifecycle updates instead of re-creating
    const idField = el.namedItem ? el.namedItem("id") : el["id"];
    if (idField) idField.value = id;
    const idInput = typeof targetForm.querySelector === "function" ? targetForm.querySelector('input[name="id"]') : null;
    if (idInput) idInput.value = id;

    const title = (el.namedItem ? el.namedItem("title")?.value : "") || getVal("title");
    if (!title) {
      showToast("Please enter an idea title.");
      return;
    }

    state.ideas = state.ideas || [];
    const existingIndex = state.ideas.findIndex(i => i.id === id);

    const ideaData = {
      id,
      title,
      category: getVal("category") || "",
      priority: getVal("priority") || "",
      effort: getVal("effort") || "",
      cost: getVal("cost") ? String(getVal("cost")) : "",
      supplies: getVal("supplies"),
      notes: getVal("notes"),
      isGift: getChecked("isGift"),
      giftRecipient: getVal("giftRecipient"),
      status: getVal("status") || "",
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      state.ideas[existingIndex] = { ...state.ideas[existingIndex], ...ideaData };
      showToast(`Updated idea "${title}" 💡`);
    } else {
      ideaData.createdAt = new Date().toISOString();
      state.ideas.unshift(ideaData);
      makeActivity("idea", `Added project idea: ${title}`);
      showToast(`Saved idea "${title}" to your queue! 💡`);
    }

    saveIdeasBackup(state.ideas);
    await persistState({ syncCloud: true });
    if (getCloudConfig() && getCloudSession() && !cloudWorking) {
      void storeRemoteWorkspace().catch(err => console.warn("Direct idea cloud push notice:", err));
    }
    renderNavigation();
    renderIdeasView();
    $("#idea-dialog")?.close();
  } finally {
    if (typeof isSavingIdea !== "undefined") {
      setTimeout(() => {
        isSavingIdea = false;
      }, 400);
    }
  }
}

async function handleIdeaSubmit(event) {
  if (event) {
    if (typeof event.preventDefault === "function") event.preventDefault();
    if (typeof event.stopPropagation === "function") event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
  }
  if (isSavingIdea) return;
  const form = $("#idea-form") || (event?.target?.closest ? event.target.closest("form") : null);
  if (form) {
    await saveIdeaFromForm(form);
  }
}

async function deleteIdea(ideaId) {
  const idea = (state.ideas || []).find(i => i.id === ideaId);
  if (!idea) return;
  if (!confirm(`Delete project idea "${idea.title}"?`)) return;

  state.ideas = (state.ideas || []).filter(i => i.id !== ideaId);
  saveIdeasBackup(state.ideas);
  await persistState({ syncCloud: true });
  if (getCloudConfig() && getCloudSession() && !cloudWorking) {
    void storeRemoteWorkspace().catch(err => console.warn("Direct idea delete cloud push notice:", err));
  }
  renderNavigation();
  renderIdeasView();
  $("#idea-dialog")?.close();
  showToast(`Deleted idea "${idea.title}".`);
}

async function promoteIdeaToProject(ideaId) {
  const idea = (state.ideas || []).find(i => i.id === ideaId);
  if (!idea) return;

  const project = {
    id: uid(),
    title: idea.title,
    description: idea.notes || `Fabrication idea for ${idea.title}.`,
    status: "in-progress",
    priority: idea.priority || "normal",
    budget: idea.cost ? Number(idea.cost) : undefined,
    tags: [idea.category, "promoted-idea", idea.isGift ? "gift" : ""].filter(Boolean),
    isGift: Boolean(idea.isGift),
    giftRecipient: idea.giftRecipient || "",
    giftOccasion: "birthday",
    giftStatus: "planning",
    folders: [{ id: uid(), name: "General", images: [] }],
    tasks: [
      { id: uid(), text: "Refine design specifications and CAD drawing", done: false },
      { id: uid(), text: "Acquire materials and prepare workshop workspace", done: false },
      { id: uid(), text: "Fabricate prototype and assemble build", done: false }
    ],
    materials: (idea.supplies || "").split(",").map(s => s.trim()).filter(Boolean).map(name => ({
      id: uid(),
      name,
      status: "need",
      cost: 0
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  idea.status = "promoted";
  idea.promotedProjectId = project.id;
  idea.updatedAt = new Date().toISOString();
  saveIdeasBackup(state.ideas);
  state.projects.unshift(project);
  makeActivity("project", `Promoted idea "${idea.title}" into an active workshop project!`);
  await persistState({ syncCloud: true });
  renderNavigation();
  renderIdeasView();
  renderProjects();
  showToast(`🚀 "${idea.title}" is now an active project!`);
  switchView("projects");
}

async function adoptSparkIdea(sparkId) {
  const spark = CURATED_SPARKS.find(s => s.id === sparkId);
  if (!spark) return;

  state.ideas = state.ideas || [];
  const newIdea = {
    id: uid(),
    title: spark.title,
    category: spark.category,
    priority: "normal",
    effort: spark.effort,
    cost: spark.cost,
    supplies: spark.supplies,
    notes: spark.notes,
    status: "ready",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  state.ideas.unshift(newIdea);
  saveIdeasBackup(state.ideas);
  makeActivity("idea", `Adopted spark idea: ${spark.title}`);
  await persistState({ syncCloud: true });
  renderNavigation();
  renderIdeasView();
  showToast(`Adopted spark "${spark.title}" into your ideas!`);
}

function sparkRandomIdea() {
  const randomSpark = CURATED_SPARKS[Math.floor(Math.random() * CURATED_SPARKS.length)];
  if (!randomSpark) return;
  adoptSparkIdea(randomSpark.id);
}


if (typeof window !== "undefined") {
  window.saveIdeaFromForm = saveIdeaFromForm;
  window.handleIdeaSubmit = handleIdeaSubmit;
  window.openIdeaDialog = openIdeaDialog;
  window.deleteIdea = deleteIdea;
  window.promoteIdeaToProject = promoteIdeaToProject;
  window.renderIdeasView = renderIdeasView;
  window.filterIdeas = filterIdeas;
  window.generateSpark = generateSpark;
  window.saveSparkAsIdea = saveSparkAsIdea;
}
