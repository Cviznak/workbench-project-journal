/* ==========================================================================
   Workbench 3.0 - Main Controller, Navigation & View Routing
   ========================================================================== */

let focusTimer = null;
let focusSecondsLeft = 25 * 60;
let focusTimerRunning = false;

function switchView(viewName) {
  state.activeView = viewName;

  // Update view sections visibility
  document.querySelectorAll(".view-section").forEach(sec => {
    sec.classList.toggle("active", sec.id === `${viewName}-view`);
  });

  // Update navigation items active state (desktop header and mobile bottom bar)
  document.querySelectorAll("[data-nav-view]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.navView === viewName);
  });

  // Render view-specific content
  if (viewName === "projects") renderProjects();
  else if (viewName === "inventory") renderInventory();
  else if (viewName === "ideas") renderIdeas();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderAll() {
  renderProjects();
  renderInventory();
  renderIdeas();
  updateAudioUI();
}

// Focus Pomodoro Timer
function toggleFocusTimer() {
  if (focusTimerRunning) {
    clearInterval(focusTimer);
    focusTimerRunning = false;
    updateFocusTimerDisplay();
  } else {
    focusTimerRunning = true;
    focusTimer = setInterval(() => {
      focusSecondsLeft--;
      if (focusSecondsLeft <= 0) {
        clearInterval(focusTimer);
        focusTimerRunning = false;
        focusSecondsLeft = 25 * 60;
        showToast("🔔 Focus session complete! Time for a short break.");
      }
      updateFocusTimerDisplay();
    }, 1000);
    updateFocusTimerDisplay();
  }
}

function resetFocusTimer() {
  clearInterval(focusTimer);
  focusTimerRunning = false;
  focusSecondsLeft = 25 * 60;
  updateFocusTimerDisplay();
}

function updateFocusTimerDisplay() {
  const display = document.getElementById("focus-timer-clock");
  const toggleBtn = document.getElementById("focus-timer-btn");
  if (display) {
    const m = Math.floor(focusSecondsLeft / 60).toString().padStart(2, "0");
    const s = (focusSecondsLeft % 60).toString().padStart(2, "0");
    display.textContent = `${m}:${s}`;
  }
  if (toggleBtn) {
    toggleBtn.textContent = focusTimerRunning ? "⏸ Pause Timer" : "▶ Start 25m Focus";
  }
}

// App Bootstrap
async function initApp() {
  await loadState();
  applyTheme(state.theme);

  // Setup search listeners
  document.getElementById("project-search")?.addEventListener("input", renderProjects);
  document.getElementById("inventory-search")?.addEventListener("input", renderInventory);

  // Close modals on escape key
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      document.querySelectorAll("dialog[open]").forEach(d => d.close());
    }
  });

  // Close dialog on backdrop click
  document.querySelectorAll("dialog").forEach(dialog => {
    dialog.addEventListener("click", e => {
      const rect = dialog.getBoundingClientRect();
      const inDialog = (
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      );
      if (!inDialog) dialog.close();
    });
  });

  renderAll();
  switchView(state.activeView || "projects");
  updateFocusTimerDisplay();
}

// Global exports
if (typeof window !== "undefined") {
  window.switchView = switchView;
  window.renderAll = renderAll;
  window.toggleFocusTimer = toggleFocusTimer;
  window.resetFocusTimer = resetFocusTimer;
}

window.addEventListener("DOMContentLoaded", initApp);
