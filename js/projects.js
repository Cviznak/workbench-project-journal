/* ==========================================================================
   Workbench 3.0 - Projects, Steps, Material Folders & Variants
   ========================================================================== */

let activeProjectId = null;

function renderProjects() {
  const container = document.getElementById("projects-list");
  if (!container) return;

  const filter = state.projectsFilter || "all";
  const search = (document.getElementById("project-search")?.value || "").trim().toLowerCase();

  const filtered = (state.projects || []).filter(p => {
    if (filter !== "all" && (p.status || "planned") !== filter) return false;
    if (search) {
      const match = (p.title + " " + (p.description || "") + " " + (p.tags || []).join(" ")).toLowerCase();
      if (!match.includes(search)) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🪵</div>
        <h3>${search ? "No projects found" : "No projects yet"}</h3>
        <p>${search ? "Try searching for a different keyword." : "Start your first build by creating a project below."}</p>
        <button type="button" class="btn btn-primary" onclick="openProjectForm()">＋ Create Project</button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(project => {
    const tasks = Array.isArray(project.tasks) ? project.tasks : [];
    const doneTasks = tasks.filter(t => t.done).length;
    const progressPct = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;
    const materials = Array.isArray(project.materials) ? project.materials : [];
    const totalCost = materials.reduce((s, m) => s + (Number(m.cost) || 0), 0);
    const photos = Array.isArray(project.photos) ? project.photos : [];

    const statusBadge = {
      in_progress: `<span class="badge badge-progress">⚡ In Progress</span>`,
      planned: `<span class="badge badge-planned">🗓️ Planned</span>`,
      completed: `<span class="badge badge-done">✓ Completed</span>`
    }[project.status || "planned"] || `<span class="badge">Planned</span>`;

    return `
      <article class="project-card" onclick="openProjectDetail('${project.id}')">
        <div class="card-header">
          <div class="card-title-wrap">
            <h3 class="card-title">${escapeHTML(project.title)}</h3>
            ${statusBadge}
          </div>
          <div class="card-menu" onclick="event.stopPropagation()">
            <button type="button" class="icon-btn" onclick="openProjectForm('${project.id}')" title="Edit project details">✎</button>
            <button type="button" class="icon-btn danger" onclick="deleteProject('${project.id}')" title="Delete project">×</button>
          </div>
        </div>
        ${project.description ? `<p class="card-desc">${escapeHTML(project.description)}</p>` : ""}
        ${tasks.length ? `
          <div class="progress-wrap">
            <div class="progress-bar"><div class="progress-fill" style="width:${progressPct}%"></div></div>
            <span class="progress-text">${doneTasks}/${tasks.length} steps (${progressPct}%)</span>
          </div>
        ` : ""}
        <div class="card-footer">
          <span>📦 ${materials.length} supplies · ${formatMoney(totalCost)}</span>
          ${photos.length ? `<span>📷 ${photos.length}</span>` : ""}
          <span>⏱️ ${relativeTime(project.updatedAt || project.createdAt)}</span>
        </div>
      </article>
    `;
  }).join("");
}

function openProjectForm(projectId = null) {
  const dialog = document.getElementById("project-dialog");
  const form = document.getElementById("project-form");
  if (!dialog || !form) return;

  form.reset();
  const titleEl = document.getElementById("project-dialog-title");
  const project = projectId ? (state.projects || []).find(p => p.id === projectId) : null;

  if (project) {
    if (titleEl) titleEl.textContent = "Edit Project";
    form.elements.id.value = project.id;
    form.elements.title.value = project.title || "";
    form.elements.description.value = project.description || "";
    form.elements.status.value = project.status || "planned";
    form.elements.targetDate.value = project.targetDate || "";
  } else {
    if (titleEl) titleEl.textContent = "Create Project";
    form.elements.id.value = "";
    form.elements.status.value = "planned";
  }

  dialog.showModal();
  form.elements.title.focus();
}

async function handleProjectSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const id = form.elements.id.value;
  const title = (form.elements.title.value || "").trim();
  if (!title) return;

  const existing = id ? (state.projects || []).find(p => p.id === id) : null;
  const projectData = {
    id: existing?.id || uid(),
    title,
    description: (form.elements.description.value || "").trim(),
    status: form.elements.status.value || "planned",
    targetDate: form.elements.targetDate.value || "",
    tasks: existing?.tasks || [],
    materials: existing?.materials || [],
    materialFolders: existing?.materialFolders || [],
    photos: existing?.photos || [],
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  state.projects = state.projects || [];
  if (existing) {
    Object.assign(existing, projectData);
    showToast(`Updated “${title}”.`);
  } else {
    state.projects.unshift(projectData);
    showToast(`Created project “${title}”!`);
  }

  document.getElementById("project-dialog")?.close();
  await persistState();
  renderProjects();
  if (activeProjectId === projectData.id) {
    openProjectDetail(projectData.id);
  }
}

async function deleteProject(projectId) {
  const project = (state.projects || []).find(p => p.id === projectId);
  if (!project) return;
  if (!confirm(`Delete project “${project.title}”?`)) return;

  state.projects = state.projects.filter(p => p.id !== projectId);
  if (activeProjectId === projectId) {
    document.getElementById("project-detail-dialog")?.close();
    activeProjectId = null;
  }
  await persistState();
  renderProjects();
  showToast(`Deleted “${project.title}”.`);
}

// --------------------------------------------------------------------------
// Project Detail Modal (Steps, Material Folders & Copy, Photos)
// --------------------------------------------------------------------------
function getProjectMaterialFolders(project) {
  const defined = Array.isArray(project.materialFolders) ? project.materialFolders.filter(Boolean) : [];
  const used = (project.materials || []).map(m => m.folder).filter(Boolean);
  const combined = Array.from(new Set([...defined, ...used]));
  if (!combined.length && (project.materials || []).length > 0) {
    return ["General Supplies"];
  }
  return combined;
}

function openProjectDetail(projectId) {
  const project = (state.projects || []).find(p => p.id === projectId);
  if (!project) return;
  activeProjectId = projectId;

  const dialog = document.getElementById("project-detail-dialog");
  const body = document.getElementById("project-detail-content");
  if (!dialog || !body) return;

  const tasks = Array.isArray(project.tasks) ? project.tasks : [];
  const doneTasks = tasks.filter(t => t.done).length;
  const materials = Array.isArray(project.materials) ? project.materials : [];
  const totalCost = materials.reduce((s, m) => s + (Number(m.cost) || 0), 0);
  const acquiredCost = materials.filter(m => m.status === "have" || m.status === "ordered").reduce((s, m) => s + (Number(m.cost) || 0), 0);
  const haveCount = materials.filter(m => m.status === "have").length;
  const photos = Array.isArray(project.photos) ? project.photos : [];
  const viewMode = state.materialsViewMode || "folders";
  const allFolders = getProjectMaterialFolders(project);

  state.collapsedMaterialFolders = state.collapsedMaterialFolders || new Set();

  body.innerHTML = `
    <div class="detail-header">
      <div>
        <div class="badge-row">
          <span class="badge badge-${project.status}">${project.status.replace('_', ' ').toUpperCase()}</span>
          ${project.targetDate ? `<span class="badge">Due ${formatDate(project.targetDate)}</span>` : ""}
        </div>
        <h2 class="detail-title">${escapeHTML(project.title)}</h2>
        ${project.description ? `<p class="detail-desc">${escapeHTML(project.description)}</p>` : ""}
      </div>
      <div class="detail-header-actions">
        <button type="button" class="btn btn-outline" onclick="openProjectForm('${project.id}')">✎ Edit</button>
      </div>
    </div>

    <!-- Steps Checklist Section -->
    <section class="detail-section">
      <div class="section-heading-row">
        <div>
          <h3>Build Checklist</h3>
          <span class="section-sub">${doneTasks}/${tasks.length} steps completed</span>
        </div>
      </div>

      <form class="inline-add-form" onsubmit="handleAddTask(event, '${project.id}')">
        <input name="taskText" required maxlength="120" placeholder="Add next step (e.g. Cut walnut leg tenons, wire driver)..." autocomplete="off">
        <button type="submit" class="btn btn-primary">＋ Add</button>
      </form>

      ${tasks.length ? `
        <ul class="task-list">
          ${tasks.map((task, idx) => `
            <li class="task-item ${task.done ? "is-done" : ""}">
              <label class="task-label">
                <input type="checkbox" ${task.done ? "checked" : ""} onchange="toggleTaskDone('${project.id}', '${task.id}')">
                <span class="task-text">${escapeHTML(task.text)}</span>
              </label>
              <div class="task-actions">
                ${idx > 0 ? `<button type="button" class="icon-btn" onclick="moveTask('${project.id}', '${task.id}', -1)" title="Move up">↑</button>` : ""}
                ${idx < tasks.length - 1 ? `<button type="button" class="icon-btn" onclick="moveTask('${project.id}', '${task.id}', 1)" title="Move down">↓</button>` : ""}
                <button type="button" class="icon-btn danger" onclick="deleteTask('${project.id}', '${task.id}')" title="Delete step">×</button>
              </div>
            </li>
          `).join("")}
        </ul>
      ` : `<div class="empty-hint">No checklist steps yet. Add one above to start tracking your build.</div>`}
    </section>

    <!-- Materials & Supplies Section (Folders & Copy Variants) -->
    <section class="detail-section">
      <div class="section-heading-row">
        <div>
          <h3>Materials &amp; Supplies</h3>
          <span class="section-sub">${materials.length} items · ${formatMoney(totalCost)} total (${formatMoney(acquiredCost)} acquired)</span>
        </div>
        <div class="btn-group">
          <div class="view-toggle">
            <button type="button" class="toggle-btn ${viewMode === 'folders' ? 'active' : ''}" onclick="setMaterialsViewMode('folders', '${project.id}')" title="Group into folders">📁 Folders</button>
            <button type="button" class="toggle-btn ${viewMode === 'flat' ? 'active' : ''}" onclick="setMaterialsViewMode('flat', '${project.id}')" title="Flat table list">📋 Flat List</button>
          </div>
          <button type="button" class="btn btn-outline btn-sm" onclick="openMaterialFolderDialog('${project.id}')">📁 ＋ Folder</button>
        </div>
      </div>

      <!-- Add Material Form -->
      <form class="material-add-form" onsubmit="handleAddMaterial(event, '${project.id}')">
        <input name="name" id="mat-add-name-${project.id}" required maxlength="100" placeholder="Material or part name (e.g. 1/4&quot; Walnut ply, M3x12 bolts)...">
        <input name="folder" id="mat-add-folder-${project.id}" list="project-folders-dl-${project.id}" maxlength="60" placeholder="Folder (e.g. Lumber, Hardware)">
        <datalist id="project-folders-dl-${project.id}">
          ${allFolders.map(f => `<option value="${escapeHTML(f)}">`).join("")}
          <option value="3D Print &amp; Filament">
          <option value="Lumber &amp; Sheet Goods">
          <option value="Hardware &amp; Fasteners">
          <option value="Electronics &amp; Wiring">
          <option value="Finishes &amp; Adhesives">
          <option value="General Supplies">
        </datalist>
        <input name="qty" maxlength="30" placeholder="Qty (e.g. 2 pcs)">
        <input name="cost" type="number" step="0.01" min="0" placeholder="$ Price">
        <select name="status">
          <option value="need">○ Need to buy</option>
          <option value="ordered">↗ Ordered</option>
          <option value="have">✓ In stock</option>
        </select>
        <button type="submit" class="btn btn-primary">＋ Add</button>
      </form>

      ${(() => {
        if (!materials.length && !allFolders.length) {
          return `<div class="empty-hint">No materials tracked yet. Add items above or create folders to organize your parts list.</div>`;
        }

        if (viewMode === "folders") {
          return `
            <div class="folders-container">
              ${allFolders.map(folderName => {
                const folderItems = materials.filter(m => (m.folder || "General Supplies") === folderName);
                const count = folderItems.length;
                const folderCost = folderItems.reduce((s, m) => s + (Number(m.cost) || 0), 0);
                const haveFCount = folderItems.filter(m => m.status === "have").length;
                const isCollapsed = state.collapsedMaterialFolders.has(`${project.id}:${folderName}`);

                return `
                  <div class="folder-card ${isCollapsed ? "is-collapsed" : ""}">
                    <div class="folder-header" onclick="toggleMaterialFolderCollapse('${project.id}', '${escapeHTML(folderName)}')">
                      <div class="folder-header-left">
                        <span class="chevron">${isCollapsed ? "▶" : "▼"}</span>
                        <span class="folder-icon">${getGroupIcon(folderName)}</span>
                        <strong class="folder-title">${escapeHTML(folderName)}</strong>
                        <span class="pill">${count} ${count === 1 ? "item" : "items"}</span>
                        ${folderCost > 0 ? `<span class="pill pill-cost">${formatMoney(folderCost)}</span>` : ""}
                        ${count > 0 ? `<span class="pill pill-status ${haveFCount === count ? 'complete' : ''}">${haveFCount === count ? '✓ All in hand' : `${haveFCount}/${count} acquired`}</span>` : ""}
                      </div>
                      <div class="folder-header-right" onclick="event.stopPropagation()">
                        <button type="button" class="btn btn-xs" onclick="prefillMaterialFolder('${project.id}', '${escapeHTML(folderName)}')" title="Add item to this folder">＋ Add item</button>
                        <button type="button" class="icon-btn" onclick="openMaterialFolderDialog('${project.id}', '${escapeHTML(folderName)}')" title="Rename folder">✎</button>
                        <button type="button" class="icon-btn danger" onclick="deleteMaterialFolder('${project.id}', '${escapeHTML(folderName)}')" title="Delete folder">×</button>
                      </div>
                    </div>
                    ${!isCollapsed ? `
                      <div class="folder-body">
                        ${count > 0 ? `
                          <div class="table-wrap">
                            <table class="data-table">
                              <thead>
                                <tr>
                                  <th>Item</th>
                                  <th>Qty</th>
                                  <th>Cost</th>
                                  <th>Status</th>
                                  <th style="text-align:right">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${folderItems.map(mat => `
                                  <tr>
                                    <td><strong>${escapeHTML(mat.name)}</strong></td>
                                    <td>${escapeHTML(mat.qty || "-")}</td>
                                    <td>${Number(mat.cost) > 0 ? formatMoney(mat.cost) : "-"}</td>
                                    <td>
                                      <span class="status-tag status-${mat.status || 'need'}" onclick="cycleMaterialStatus('${project.id}', '${mat.id}')" title="Click to cycle status">
                                        ${mat.status === "have" ? "✓ Have" : mat.status === "ordered" ? "↗ Ordered" : "○ Need"}
                                      </span>
                                    </td>
                                    <td style="text-align:right">
                                      <div class="row-actions">
                                        <button type="button" class="icon-btn copy" onclick="openMaterialEditDialog('${project.id}', '${mat.id}', true)" title="Copy & duplicate variant (different color, size, etc.)">⧉</button>
                                        <button type="button" class="icon-btn" onclick="openMaterialEditDialog('${project.id}', '${mat.id}', false)" title="Edit material">✎</button>
                                        <button type="button" class="icon-btn danger" onclick="deleteMaterial('${project.id}', '${mat.id}')" title="Delete material">×</button>
                                      </div>
                                    </td>
                                  </tr>
                                `).join("")}
                              </tbody>
                            </table>
                          </div>
                        ` : `
                          <div class="folder-empty">Folder is empty. <button type="button" class="btn btn-xs" onclick="prefillMaterialFolder('${project.id}', '${escapeHTML(folderName)}')">＋ Add item</button></div>
                        `}
                      </div>
                    ` : ""}
                  </div>
                `;
              }).join("")}
            </div>
          `;
        }

        // Flat table view
        return `
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Folder</th>
                  <th>Qty</th>
                  <th>Cost</th>
                  <th>Status</th>
                  <th style="text-align:right">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${materials.map(mat => `
                  <tr>
                    <td><strong>${escapeHTML(mat.name)}</strong></td>
                    <td><span class="pill">${escapeHTML(mat.folder || "General Supplies")}</span></td>
                    <td>${escapeHTML(mat.qty || "-")}</td>
                    <td>${Number(mat.cost) > 0 ? formatMoney(mat.cost) : "-"}</td>
                    <td>
                      <span class="status-tag status-${mat.status || 'need'}" onclick="cycleMaterialStatus('${project.id}', '${mat.id}')" title="Click to cycle status">
                        ${mat.status === "have" ? "✓ Have" : mat.status === "ordered" ? "↗ Ordered" : "○ Need"}
                      </span>
                    </td>
                    <td style="text-align:right">
                      <div class="row-actions">
                        <button type="button" class="icon-btn copy" onclick="openMaterialEditDialog('${project.id}', '${mat.id}', true)" title="Copy & duplicate variant">⧉</button>
                        <button type="button" class="icon-btn" onclick="openMaterialEditDialog('${project.id}', '${mat.id}', false)" title="Edit material">✎</button>
                        <button type="button" class="icon-btn danger" onclick="deleteMaterial('${project.id}', '${mat.id}')" title="Delete material">×</button>
                      </div>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        `;
      })()}
    </section>

    <!-- Photos Section -->
    <section class="detail-section">
      <div class="section-heading-row">
        <div>
          <h3>Project Photos</h3>
          <span class="section-sub">${photos.length} photos</span>
        </div>
        <label class="btn btn-outline btn-sm" style="cursor:pointer">
          📷 ＋ Add Photo
          <input type="file" accept="image/*" style="display:none" onchange="handleAddPhoto(event, '${project.id}')">
        </label>
      </div>

      ${photos.length ? `
        <div class="photo-grid">
          ${photos.map(p => `
            <div class="photo-card">
              <img src="${p.dataUrl}" alt="${escapeHTML(p.name || 'Project Photo')}" onclick="openPhotoViewer('${p.dataUrl}')">
              <button type="button" class="photo-del-btn" onclick="deletePhoto('${project.id}', '${p.id}')">×</button>
            </div>
          `).join("")}
        </div>
      ` : `<div class="empty-hint">No photos added yet. Snap or upload progress photos as you build.</div>`}
    </section>
  `;

  dialog.showModal();
}

// Checklist Tasks
async function handleAddTask(event, projectId) {
  event.preventDefault();
  const form = event.target;
  const text = (form.elements.taskText.value || "").trim();
  if (!text) return;

  const project = (state.projects || []).find(p => p.id === projectId);
  if (!project) return;
  project.tasks = Array.isArray(project.tasks) ? project.tasks : [];
  project.tasks.push({ id: uid(), text, done: false, createdAt: new Date().toISOString() });
  project.updatedAt = new Date().toISOString();

  form.reset();
  await persistState();
  openProjectDetail(projectId);
  renderProjects();
}

async function toggleTaskDone(projectId, taskId) {
  const project = (state.projects || []).find(p => p.id === projectId);
  const task = project?.tasks?.find(t => t.id === taskId);
  if (!task) return;
  task.done = !task.done;
  project.updatedAt = new Date().toISOString();
  await persistState();
  openProjectDetail(projectId);
  renderProjects();
}

async function moveTask(projectId, taskId, delta) {
  const project = (state.projects || []).find(p => p.id === projectId);
  if (!project || !project.tasks) return;
  const idx = project.tasks.findIndex(t => t.id === taskId);
  if (idx < 0) return;
  const targetIdx = idx + delta;
  if (targetIdx < 0 || targetIdx >= project.tasks.length) return;
  const [task] = project.tasks.splice(idx, 1);
  project.tasks.splice(targetIdx, 0, task);
  project.updatedAt = new Date().toISOString();
  await persistState();
  openProjectDetail(projectId);
}

async function deleteTask(projectId, taskId) {
  const project = (state.projects || []).find(p => p.id === projectId);
  if (!project || !project.tasks) return;
  project.tasks = project.tasks.filter(t => t.id !== taskId);
  project.updatedAt = new Date().toISOString();
  await persistState();
  openProjectDetail(projectId);
  renderProjects();
}

// Materials Management
async function handleAddMaterial(event, projectId) {
  event.preventDefault();
  const form = event.target;
  const name = (form.elements.name.value || "").trim();
  if (!name) return;

  const project = (state.projects || []).find(p => p.id === projectId);
  if (!project) return;

  const folder = (form.elements.folder.value || "").trim() || "General Supplies";
  const qty = (form.elements.qty.value || "").trim();
  const cost = parseFloat(form.elements.cost.value) || 0;
  const status = form.elements.status.value || "need";

  project.materials = Array.isArray(project.materials) ? project.materials : [];
  project.materialFolders = Array.isArray(project.materialFolders) ? project.materialFolders : [];
  if (!project.materialFolders.includes(folder)) {
    project.materialFolders.push(folder);
  }

  project.materials.push({
    id: uid(),
    name,
    folder,
    qty,
    cost,
    status,
    createdAt: new Date().toISOString()
  });
  project.updatedAt = new Date().toISOString();

  form.reset();
  await persistState();
  openProjectDetail(projectId);
  renderProjects();
  showToast(`Added “${name}” to ${folder}.`);
}

async function cycleMaterialStatus(projectId, materialId) {
  const project = (state.projects || []).find(p => p.id === projectId);
  const mat = project?.materials?.find(m => m.id === materialId);
  if (!mat) return;
  const next = { need: "ordered", ordered: "have", have: "need" };
  mat.status = next[mat.status] || "need";
  project.updatedAt = new Date().toISOString();
  await persistState();
  openProjectDetail(projectId);
  renderProjects();
}

async function deleteMaterial(projectId, materialId) {
  const project = (state.projects || []).find(p => p.id === projectId);
  if (!project || !project.materials) return;
  const mat = project.materials.find(m => m.id === materialId);
  if (!mat) return;
  project.materials = project.materials.filter(m => m.id !== materialId);
  project.updatedAt = new Date().toISOString();
  await persistState();
  openProjectDetail(projectId);
  renderProjects();
  showToast(`Removed “${mat.name}”.`);
}

// Material Copy / Duplicate & Edit Dialog
function openMaterialEditDialog(projectId, materialId, isDuplicate = false) {
  const project = (state.projects || []).find(p => p.id === projectId);
  const mat = project?.materials?.find(m => m.id === materialId);
  if (!project || !mat) return;

  const dialog = document.getElementById("material-edit-dialog");
  const form = document.getElementById("material-edit-form");
  if (!dialog || !form) return;

  form.reset();
  form.elements.projectId.value = projectId;
  form.elements.materialId.value = materialId;
  form.elements.isDuplicate.value = isDuplicate ? "true" : "false";

  const titleEl = document.getElementById("material-edit-dialog-title");
  const submitBtn = document.getElementById("material-edit-submit-btn");
  const nameInput = document.getElementById("material-edit-name-input");
  const folderInput = document.getElementById("material-edit-folder-input");
  const qtyInput = document.getElementById("material-edit-qty-input");
  const costInput = document.getElementById("material-edit-cost-input");
  const statusSelect = document.getElementById("material-edit-status-select");

  if (isDuplicate) {
    if (titleEl) titleEl.textContent = "Copy & Edit Material (Variant)";
    if (submitBtn) submitBtn.textContent = "Save copy as new material →";
  } else {
    if (titleEl) titleEl.textContent = "Edit Material";
    if (submitBtn) submitBtn.textContent = "Save changes →";
  }

  nameInput.value = mat.name || "";
  folderInput.value = mat.folder || "General Supplies";
  qtyInput.value = mat.qty || "";
  costInput.value = Number(mat.cost) > 0 ? mat.cost : "";
  statusSelect.value = mat.status || "need";

  // Populate folder suggestions datalist
  const datalist = document.getElementById("material-edit-folder-suggestions");
  if (datalist) {
    datalist.innerHTML = getProjectMaterialFolders(project).map(f => `<option value="${escapeHTML(f)}">`).join("");
  }

  dialog.showModal();
  nameInput.focus();
  if (isDuplicate) nameInput.select();
}

async function handleMaterialEditSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const projectId = form.elements.projectId.value;
  const materialId = form.elements.materialId.value;
  const isDuplicate = form.elements.isDuplicate.value === "true";

  const name = (form.elements.name.value || "").trim();
  const folder = (form.elements.folder.value || "").trim() || "General Supplies";
  const qty = (form.elements.qty.value || "").trim();
  const cost = parseFloat(form.elements.cost.value) || 0;
  const status = form.elements.status.value || "need";

  if (!name) return;
  const project = (state.projects || []).find(p => p.id === projectId);
  if (!project) return;

  project.materials = Array.isArray(project.materials) ? project.materials : [];
  project.materialFolders = Array.isArray(project.materialFolders) ? project.materialFolders : [];
  if (!project.materialFolders.includes(folder)) {
    project.materialFolders.push(folder);
  }

  if (isDuplicate) {
    const newMaterial = {
      id: uid(),
      name,
      folder,
      qty,
      cost,
      status,
      createdAt: new Date().toISOString()
    };
    const origIdx = project.materials.findIndex(m => m.id === materialId);
    if (origIdx >= 0) {
      project.materials.splice(origIdx + 1, 0, newMaterial);
    } else {
      project.materials.push(newMaterial);
    }
    showToast(`Created copy “${name}”.`);
  } else {
    const mat = project.materials.find(m => m.id === materialId);
    if (!mat) return;
    mat.name = name;
    mat.folder = folder;
    mat.qty = qty;
    mat.cost = cost;
    mat.status = status;
    showToast(`Updated “${name}”.`);
  }

  project.updatedAt = new Date().toISOString();
  document.getElementById("material-edit-dialog")?.close();
  await persistState();
  openProjectDetail(projectId);
  renderProjects();
}

// Material Folders Management
function openMaterialFolderDialog(projectId, oldFolder = "") {
  const dialog = document.getElementById("material-folder-dialog");
  const form = document.getElementById("material-folder-form");
  if (!dialog || !form) return;
  form.reset();
  form.elements.projectId.value = projectId;
  form.elements.oldFolder.value = oldFolder || "";
  form.elements.name.value = oldFolder || "";
  const titleEl = document.getElementById("material-folder-dialog-title");
  if (titleEl) titleEl.textContent = oldFolder ? "Rename Folder" : "New Folder";
  dialog.showModal();
  form.elements.name.focus();
  if (oldFolder) form.elements.name.select();
}

async function handleMaterialFolderSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const projectId = form.elements.projectId.value;
  const oldFolder = (form.elements.oldFolder.value || "").trim();
  const newFolder = (form.elements.name.value || "").trim();
  if (!newFolder) return;

  const project = (state.projects || []).find(p => p.id === projectId);
  if (!project) return;

  project.materialFolders = Array.isArray(project.materialFolders) ? project.materialFolders : [];

  if (oldFolder) {
    const idx = project.materialFolders.indexOf(oldFolder);
    if (idx >= 0) project.materialFolders[idx] = newFolder;
    else project.materialFolders.push(newFolder);
    (project.materials || []).forEach(m => {
      if ((m.folder || "General Supplies") === oldFolder) {
        m.folder = newFolder;
      }
    });
    showToast(`Renamed folder to “${newFolder}”.`);
  } else {
    if (!project.materialFolders.includes(newFolder)) {
      project.materialFolders.push(newFolder);
    }
    showToast(`Created folder “${newFolder}”.`);
  }

  project.updatedAt = new Date().toISOString();
  document.getElementById("material-folder-dialog")?.close();
  await persistState();
  openProjectDetail(projectId);
}

async function deleteMaterialFolder(projectId, folderName) {
  const project = (state.projects || []).find(p => p.id === projectId);
  if (!project) return;
  const items = (project.materials || []).filter(m => (m.folder || "General Supplies") === folderName);
  const msg = items.length
    ? `Delete folder “${folderName}”? Its ${items.length} item(s) will be moved to “General Supplies”.`
    : `Delete folder “${folderName}”?`;
  if (!confirm(msg)) return;

  (project.materials || []).forEach(m => {
    if ((m.folder || "General Supplies") === folderName) {
      m.folder = "General Supplies";
    }
  });
  project.materialFolders = (project.materialFolders || []).filter(f => f !== folderName);
  if (items.length && !project.materialFolders.includes("General Supplies")) {
    project.materialFolders.push("General Supplies");
  }
  project.updatedAt = new Date().toISOString();
  await persistState();
  openProjectDetail(projectId);
  showToast(`Deleted folder “${folderName}”.`);
}

function setMaterialsViewMode(mode, projectId) {
  state.materialsViewMode = mode;
  persistState();
  openProjectDetail(projectId);
}

function toggleMaterialFolderCollapse(projectId, folderName) {
  state.collapsedMaterialFolders = state.collapsedMaterialFolders || new Set();
  const key = `${projectId}:${folderName}`;
  if (state.collapsedMaterialFolders.has(key)) state.collapsedMaterialFolders.delete(key);
  else state.collapsedMaterialFolders.add(key);
  openProjectDetail(projectId);
}

function prefillMaterialFolder(projectId, folderName) {
  const input = document.getElementById(`mat-add-folder-${projectId}`);
  const nameInput = document.getElementById(`mat-add-name-${projectId}`);
  if (input) input.value = folderName;
  if (nameInput) {
    nameInput.scrollIntoView({ behavior: "smooth", block: "center" });
    nameInput.focus();
  }
}

// Photos
function handleAddPhoto(event, projectId) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async e => {
    const project = (state.projects || []).find(p => p.id === projectId);
    if (!project) return;
    project.photos = Array.isArray(project.photos) ? project.photos : [];
    project.photos.push({ id: uid(), name: file.name, dataUrl: e.target.result, createdAt: new Date().toISOString() });
    project.updatedAt = new Date().toISOString();
    await persistState();
    openProjectDetail(projectId);
    renderProjects();
    showToast("Photo added!");
  };
  reader.readAsDataURL(file);
}

async function deletePhoto(projectId, photoId) {
  const project = (state.projects || []).find(p => p.id === projectId);
  if (!project || !project.photos) return;
  project.photos = project.photos.filter(p => p.id !== photoId);
  project.updatedAt = new Date().toISOString();
  await persistState();
  openProjectDetail(projectId);
  renderProjects();
}

function openPhotoViewer(src) {
  const dialog = document.getElementById("lightbox-dialog");
  const img = document.getElementById("lightbox-img");
  if (!dialog || !img) return;
  img.src = src;
  dialog.showModal();
}

if (typeof window !== "undefined") {
  window.renderProjects = renderProjects;
  window.openProjectForm = openProjectForm;
  window.handleProjectSubmit = handleProjectSubmit;
  window.deleteProject = deleteProject;
  window.openProjectDetail = openProjectDetail;
  window.handleAddTask = handleAddTask;
  window.toggleTaskDone = toggleTaskDone;
  window.moveTask = moveTask;
  window.deleteTask = deleteTask;
  window.handleAddMaterial = handleAddMaterial;
  window.cycleMaterialStatus = cycleMaterialStatus;
  window.deleteMaterial = deleteMaterial;
  window.openMaterialEditDialog = openMaterialEditDialog;
  window.handleMaterialEditSubmit = handleMaterialEditSubmit;
  window.openMaterialFolderDialog = openMaterialFolderDialog;
  window.handleMaterialFolderSubmit = handleMaterialFolderSubmit;
  window.deleteMaterialFolder = deleteMaterialFolder;
  window.setMaterialsViewMode = setMaterialsViewMode;
  window.toggleMaterialFolderCollapse = toggleMaterialFolderCollapse;
  window.prefillMaterialFolder = prefillMaterialFolder;
  window.handleAddPhoto = handleAddPhoto;
  window.deletePhoto = deletePhoto;
  window.openPhotoViewer = openPhotoViewer;
}
