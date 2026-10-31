/* ==========================================================================
   Workbench 3.0 - Ideas Quick Capture & Conversion
   ========================================================================== */

function renderIdeas() {
  const container = document.getElementById("ideas-list");
  if (!container) return;

  const ideas = Array.isArray(state.ideas) ? state.ideas : [];

  if (ideas.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">💡</div>
        <h3>No project ideas yet</h3>
        <p>Jot down your next build concept, inspiration, or workshop thought above.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = ideas.map(idea => `
    <article class="idea-card">
      <div class="card-header">
        <h3 class="card-title">${escapeHTML(idea.title)}</h3>
        <div class="row-actions">
          <button type="button" class="btn btn-xs btn-primary" onclick="convertIdeaToProject('${idea.id}')" title="Turn idea into a project build">🚀 Make Project</button>
          <button type="button" class="icon-btn danger" onclick="deleteIdea('${idea.id}')" title="Delete idea">×</button>
        </div>
      </div>
      ${idea.notes ? `<p class="idea-notes">${escapeHTML(idea.notes)}</p>` : ""}
      <div class="card-footer">
        <span class="inv-subtle">Captured ${relativeTime(idea.createdAt)}</span>
      </div>
    </article>
  `).join("");
}

async function handleIdeaSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const title = (form.elements.title.value || "").trim();
  const notes = (form.elements.notes.value || "").trim();
  if (!title) return;

  state.ideas = Array.isArray(state.ideas) ? state.ideas : [];
  state.ideas.unshift({
    id: uid(),
    title,
    notes,
    createdAt: new Date().toISOString()
  });

  form.reset();
  await persistState();
  renderIdeas();
  showToast(`Captured idea “${title}”!`);
}

async function deleteIdea(id) {
  const idea = (state.ideas || []).find(i => i.id === id);
  if (!idea) return;
  state.ideas = state.ideas.filter(i => i.id !== id);
  await persistState();
  renderIdeas();
  showToast("Idea removed.");
}

async function convertIdeaToProject(id) {
  const idea = (state.ideas || []).find(i => i.id === id);
  if (!idea) return;

  const project = {
    id: uid(),
    title: idea.title,
    description: idea.notes || "",
    status: "planned",
    targetDate: "",
    tasks: [],
    materials: [],
    materialFolders: [],
    photos: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  state.projects = state.projects || [];
  state.projects.unshift(project);
  state.ideas = state.ideas.filter(i => i.id !== id);

  await persistState();
  renderIdeas();
  renderProjects();
  switchView("projects");
  openProjectDetail(project.id);
  showToast(`🚀 Converted “${idea.title}” into a project!`);
}

if (typeof window !== "undefined") {
  window.renderIdeas = renderIdeas;
  window.handleIdeaSubmit = handleIdeaSubmit;
  window.deleteIdea = deleteIdea;
  window.convertIdeaToProject = convertIdeaToProject;
}
