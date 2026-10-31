/* ==========================================================================
   Workbench 3.0 - Inventory Depot, Filament Spools & Folders
   ========================================================================== */

function getInventoryFolders() {
  const defined = Array.isArray(state.inventoryFolders) ? state.inventoryFolders.filter(Boolean) : [];
  const used = (state.inventory || []).map(i => i.folder || i.category).filter(Boolean);
  const combined = Array.from(new Set([...defined, ...used]));
  if (!combined.length) {
    return [
      "3D Printing & Filament",
      "Lumber & Sheet Goods",
      "Fasteners & Hardware",
      "Electronics & Wiring",
      "Finishes & Adhesives",
      "Workshop Tools & Equipment",
      "General Supplies"
    ];
  }
  return combined;
}

function renderInventory() {
  const container = document.getElementById("inventory-content");
  if (!container) return;

  const inventory = state.inventory || [];
  const search = (document.getElementById("inventory-search")?.value || "").trim().toLowerCase();
  const tab = state.inventoryTab || "all";
  const viewMode = state.inventoryViewMode || "folders";

  // Summary Metrics
  const materials = inventory.filter(i => (i.type || "material") === "material" && !i.spoolData);
  const spools = inventory.filter(i => !!i.spoolData);
  const equipment = inventory.filter(i => i.type === "equipment");

  const matVal = materials.reduce((s, m) => s + ((Number(m.quantity) || 0) * (Number(m.price || m.cost) || 0)), 0);
  const spoolVal = spools.reduce((s, sp) => s + (Number(sp.cost || sp.spoolData?.spoolCost) || 0), 0);
  const equipVal = equipment.reduce((s, e) => s + (Number(e.cost || e.price) || 0), 0);
  const lowStock = inventory.filter(i => (Number(i.quantity) || 0) <= (Number(i.lowStockThreshold) || 1));

  const matValEl = document.getElementById("inv-stat-mat");
  const equipValEl = document.getElementById("inv-stat-equip");
  const spoolValEl = document.getElementById("inv-stat-spools");
  const alertEl = document.getElementById("inv-stat-alert");

  if (matValEl) matValEl.textContent = formatMoney(matVal);
  if (equipValEl) equipValEl.textContent = formatMoney(equipVal);
  if (spoolValEl) spoolValEl.textContent = `${spools.length} spools (${formatMoney(spoolVal)})`;
  if (alertEl) alertEl.textContent = lowStock.length ? `⚠️ ${lowStock.length} Low Stock` : "Depot Stocked";

  // Filter items
  const filtered = inventory.filter(item => {
    if (tab === "material" && (item.type === "equipment" || item.spoolData)) return false;
    if (tab === "equipment" && item.type !== "equipment") return false;
    if (tab === "spool" && !item.spoolData) return false;

    if (search) {
      const corpus = `${item.name} ${item.folder || ""} ${item.category || ""} ${item.location || ""} ${item.spoolData?.colorName || ""} ${item.spoolData?.material || ""}`.toLowerCase();
      if (!corpus.includes(search)) return false;
    }
    return true;
  });

  state.collapsedInventoryFolders = state.collapsedInventoryFolders || new Set();

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📦</div>
        <h3>${search ? "No supplies match your search" : "Your workshop depot is empty"}</h3>
        <p>${search ? "Try searching for a different keyword." : "Add raw materials, filament spools, fasteners, or shop equipment below."}</p>
        <div class="btn-group" style="justify-content:center">
          <button type="button" class="btn btn-primary" onclick="openInventoryDialog(null, 'material')">📦 Add Supply</button>
          <button type="button" class="btn btn-outline" onclick="openAddSpoolDialog()">🖨️ Add Filament Spool</button>
        </div>
      </div>
    `;
    return;
  }

  // Card renderer
  const renderCard = item => {
    if (item.spoolData) {
      // Filament spool card
      const s = item.spoolData;
      const colorHex = s.colorHex || "#333333";
      const netWeight = Number(item.quantity) || 1000;
      return `
        <div class="inv-card inv-card-spool">
          <div class="inv-card-top">
            <span class="pill pill-folder">📁 ${escapeHTML(item.folder || "3D Printing & Filament")}</span>
            <span class="inv-cost-tag">${formatMoney(item.cost || s.spoolCost || 20)}</span>
          </div>
          <div class="spool-visual-row">
            <span class="spool-swatch" style="background:${escapeHTML(colorHex)}"></span>
            <div>
              <h4 class="inv-card-title">${escapeHTML(item.name)}</h4>
              <span class="spool-meta">${escapeHTML(s.material || "Filament")} · ${escapeHTML(s.colorName || "Standard")}</span>
            </div>
          </div>
          <div class="inv-qty-row">
            <div class="qty-control">
              <button type="button" class="qty-btn" onclick="bumpInventoryQty('${item.id}', -50)">−50g</button>
              <strong class="qty-val">${netWeight}g</strong>
              <button type="button" class="qty-btn" onclick="bumpInventoryQty('${item.id}', 50)">＋50g</button>
            </div>
            ${item.location ? `<span class="inv-chip">📍 ${escapeHTML(item.location)}</span>` : ""}
          </div>
          <div class="inv-card-bottom">
            <span class="inv-subtle">${s.diameterMm || 1.75}mm${s.brand ? ` · ${escapeHTML(s.brand)}` : ""}</span>
            <div class="row-actions">
              <button type="button" class="icon-btn copy" onclick="openAddSpoolDialog('${item.id}', true)" title="Copy spool (create variant with different color!)">⧉</button>
              <button type="button" class="icon-btn" onclick="openAddSpoolDialog('${item.id}', false)" title="Edit spool">✎</button>
              <button type="button" class="icon-btn danger" onclick="deleteInventoryItem('${item.id}')" title="Delete spool">×</button>
            </div>
          </div>
        </div>
      `;
    }

    if (item.type === "equipment") {
      // Equipment card
      const condClass = {
        operational: "status-have",
        maintenance_needed: "status-ordered",
        repair: "status-need"
      }[item.condition || "operational"] || "status-have";

      return `
        <div class="inv-card inv-card-equip">
          <div class="inv-card-top">
            <span class="pill pill-folder">📁 ${escapeHTML(item.folder || "Tools & Equipment")}</span>
            <span class="status-tag ${condClass}">${item.condition || "Operational"}</span>
          </div>
          <h4 class="inv-card-title">${escapeHTML(item.name)}</h4>
          ${item.brand || item.model ? `<span class="spool-meta">${escapeHTML(item.brand || "")} ${escapeHTML(item.model || "")}</span>` : ""}
          <div class="inv-chips-row">
            ${item.location ? `<span class="inv-chip">📍 ${escapeHTML(item.location)}</span>` : ""}
            ${item.cost > 0 ? `<span class="inv-cost-tag">${formatMoney(item.cost)}</span>` : ""}
          </div>
          ${item.notes ? `<p class="inv-notes">${escapeHTML(item.notes)}</p>` : ""}
          <div class="inv-card-bottom">
            <span></span>
            <div class="row-actions">
              <button type="button" class="icon-btn copy" onclick="openInventoryDialog(getItem('${item.id}'), 'equipment', true)" title="Copy equipment variant">⧉</button>
              <button type="button" class="icon-btn" onclick="openInventoryDialog(getItem('${item.id}'), 'equipment', false)" title="Edit tool">✎</button>
              <button type="button" class="icon-btn danger" onclick="deleteInventoryItem('${item.id}')" title="Delete tool">×</button>
            </div>
          </div>
        </div>
      `;
    }

    // General Material card
    const qty = Number(item.quantity) || 0;
    const price = Number(item.price || item.cost) || 0;
    const totalItemVal = qty * price;
    const isLow = qty <= (Number(item.lowStockThreshold) || 1);

    return `
      <div class="inv-card inv-card-material">
        <div class="inv-card-top">
          <span class="pill pill-folder">📁 ${escapeHTML(item.folder || item.category || "General Supplies")}</span>
          ${isLow ? `<span class="badge badge-need">⚠️ Low</span>` : ""}
          ${price > 0 ? `<span class="inv-cost-tag">${formatMoney(price)}${item.unit ? `/${escapeHTML(item.unit)}` : ""}</span>` : ""}
        </div>
        <h4 class="inv-card-title">${escapeHTML(item.name)}</h4>
        <div class="inv-qty-row">
          <div class="qty-control">
            <button type="button" class="qty-btn" onclick="bumpInventoryQty('${item.id}', -1)">−</button>
            <strong class="qty-val">${qty} ${escapeHTML(item.unit || "pcs")}</strong>
            <button type="button" class="qty-btn" onclick="bumpInventoryQty('${item.id}', 1)">＋</button>
          </div>
          ${item.location ? `<span class="inv-chip">📍 ${escapeHTML(item.location)}</span>` : ""}
        </div>
        <div class="inv-card-bottom">
          <span class="inv-subtle">${totalItemVal > 0 ? `Stock value: ${formatMoney(totalItemVal)}` : ""}</span>
          <div class="row-actions">
            <button type="button" class="icon-btn copy" onclick="openInventoryDialog(getItem('${item.id}'), 'material', true)" title="Copy supply variant">⧉</button>
            <button type="button" class="icon-btn" onclick="openInventoryDialog(getItem('${item.id}'), 'material', false)" title="Edit supply">✎</button>
            <button type="button" class="icon-btn danger" onclick="deleteInventoryItem('${item.id}')" title="Delete supply">×</button>
          </div>
        </div>
      </div>
    `;
  };

  // Render Folders View Mode
  if (viewMode === "folders") {
    const allFolders = getInventoryFolders();

    container.innerHTML = `
      <div class="folders-container">
        ${allFolders.map(folderName => {
          const folderItems = filtered.filter(i => (i.folder || i.category || "General Supplies") === folderName);
          const count = folderItems.length;
          if (search && count === 0) return ""; // Hide empty folders during search

          const folderVal = folderItems.reduce((s, i) => {
            if (i.type === "equipment") return s + (Number(i.cost || i.price) || 0);
            if (i.spoolData) return s + (Number(i.cost || i.spoolData.spoolCost) || 0);
            return s + ((Number(i.quantity) || 0) * (Number(i.price || i.cost) || 0));
          }, 0);

          const isCollapsed = state.collapsedInventoryFolders.has(folderName);
          const folderIcon = getGroupIcon(folderName);

          return `
            <div class="folder-card ${isCollapsed ? "is-collapsed" : ""}">
              <div class="folder-header" onclick="toggleInventoryFolderCollapse('${escapeHTML(folderName)}')">
                <div class="folder-header-left">
                  <span class="chevron">${isCollapsed ? "▶" : "▼"}</span>
                  <span class="folder-icon">${folderIcon}</span>
                  <strong class="folder-title">${escapeHTML(folderName)}</strong>
                  <span class="pill">${count} ${count === 1 ? "item" : "items"}</span>
                  ${folderVal > 0 ? `<span class="pill pill-cost">${formatMoney(folderVal)} value</span>` : ""}
                </div>
                <div class="folder-header-right" onclick="event.stopPropagation()">
                  <button type="button" class="btn btn-xs" onclick="openInventoryDialogWithFolder('${escapeHTML(folderName)}')">＋ Add item</button>
                  <button type="button" class="icon-btn" onclick="openInventoryFolderDialog('${escapeHTML(folderName)}')" title="Rename folder">✎</button>
                  <button type="button" class="icon-btn danger" onclick="deleteInventoryFolder('${escapeHTML(folderName)}')" title="Delete folder">×</button>
                </div>
              </div>
              ${!isCollapsed ? `
                <div class="folder-body">
                  ${count > 0 ? `
                    <div class="inv-grid">
                      ${folderItems.map(renderCard).join("")}
                    </div>
                  ` : `
                    <div class="folder-empty">No items in this folder yet. <button type="button" class="btn btn-xs" onclick="openInventoryDialogWithFolder('${escapeHTML(folderName)}')">＋ Add item</button></div>
                  `}
                </div>
              ` : ""}
            </div>
          `;
        }).join("")}
      </div>
    `;
    return;
  }

  // Flat Grid View Mode
  container.innerHTML = `
    <div class="inv-grid">
      ${filtered.map(renderCard).join("")}
    </div>
  `;
}

function getItem(id) {
  return (state.inventory || []).find(i => i.id === id) || null;
}

// Bump Quantity
async function bumpInventoryQty(id, delta) {
  const item = (state.inventory || []).find(i => i.id === id);
  if (!item) return;
  item.quantity = Math.max(0, (Number(item.quantity) || 0) + delta);
  item.updatedAt = new Date().toISOString();
  await persistState();
  renderInventory();
}

// Dialog: Add / Edit / Copy Inventory Item (Material or Equipment)
function openInventoryDialog(item = null, initialType = "material", isCopy = false) {
  const dialog = document.getElementById("inventory-dialog");
  const form = document.getElementById("inventory-form");
  if (!dialog || !form) return;

  form.reset();
  const isEquip = item ? item.type === "equipment" : initialType === "equipment";
  const titleEl = document.getElementById("inventory-dialog-title");

  // Radio button type
  const radios = form.querySelectorAll('input[name="itemType"]');
  radios.forEach(r => r.checked = r.value === (isEquip ? "equipment" : "material"));

  document.getElementById("inv-form-material-fields")?.classList.toggle("hidden", isEquip);
  document.getElementById("inv-form-equip-fields")?.classList.toggle("hidden", !isEquip);

  // Populate folder datalist
  const datalist = document.getElementById("inventory-folders-datalist");
  if (datalist) {
    datalist.innerHTML = getInventoryFolders().map(f => `<option value="${escapeHTML(f)}">`).join("");
  }

  if (item) {
    if (isCopy) {
      titleEl.textContent = isEquip ? "Copy Tool / Equipment (Variant)" : "Copy Material / Supply (Variant)";
      form.elements.id.value = "";
    } else {
      titleEl.textContent = isEquip ? "Edit Tool / Equipment" : "Edit Material / Supply";
      form.elements.id.value = item.id || "";
    }

    if (isEquip) {
      form.elements.equipName.value = item.name || "";
      form.elements.equipFolder.value = item.folder || "Workshop Tools & Equipment";
      form.elements.equipCondition.value = item.condition || "operational";
      form.elements.equipBrand.value = item.brand || "";
      form.elements.equipModel.value = item.model || "";
      form.elements.equipCost.value = item.cost != null ? item.cost : "";
      form.elements.equipLocation.value = item.location || "";
      form.elements.equipNotes.value = item.notes || "";
    } else {
      form.elements.name.value = item.name || "";
      form.elements.folder.value = item.folder || item.category || "General Supplies";
      form.elements.quantity.value = item.quantity ?? 1;
      form.elements.unit.value = item.unit || "";
      form.elements.price.value = item.price != null ? item.price : "";
      form.elements.location.value = item.location || "";
      form.elements.lowStockThreshold.value = item.lowStockThreshold ?? "";
      form.elements.notes.value = item.notes || "";
    }
  } else {
    titleEl.textContent = isEquip ? "Add Tool / Equipment" : "Add Material / Supply";
    form.elements.id.value = "";
    form.elements.folder.value = "General Supplies";
  }

  dialog.showModal();
  const nameEl = isEquip ? form.elements.equipName : form.elements.name;
  if (nameEl) {
    nameEl.focus();
    if (isCopy) nameEl.select();
  }
}

async function handleInventorySubmit(event) {
  event.preventDefault();
  const form = event.target;
  const id = form.elements.id.value;
  const isEquip = form.elements.itemType?.value === "equipment";

  let itemData = null;
  if (isEquip) {
    const name = (form.elements.equipName.value || "").trim();
    if (!name) return;
    const folder = (form.elements.equipFolder.value || "").trim() || "Workshop Tools & Equipment";
    itemData = {
      id: id || uid(),
      type: "equipment",
      name,
      folder,
      condition: form.elements.equipCondition.value || "operational",
      brand: (form.elements.equipBrand.value || "").trim(),
      model: (form.elements.equipModel.value || "").trim(),
      cost: parseFloat(form.elements.equipCost.value) || 0,
      location: (form.elements.equipLocation.value || "").trim(),
      notes: (form.elements.equipNotes.value || "").trim(),
      updatedAt: new Date().toISOString()
    };
  } else {
    const name = (form.elements.name.value || "").trim();
    if (!name) return;
    const folder = (form.elements.folder.value || "").trim() || "General Supplies";
    itemData = {
      id: id || uid(),
      type: "material",
      name,
      folder,
      quantity: parseFloat(form.elements.quantity.value) || 0,
      unit: (form.elements.unit.value || "").trim(),
      price: parseFloat(form.elements.price.value) || 0,
      location: (form.elements.location.value || "").trim(),
      lowStockThreshold: parseInt(form.elements.lowStockThreshold.value, 10) || 0,
      notes: (form.elements.notes.value || "").trim(),
      updatedAt: new Date().toISOString()
    };
  }

  state.inventory = state.inventory || [];
  state.inventoryFolders = state.inventoryFolders || [];
  if (itemData.folder && !state.inventoryFolders.includes(itemData.folder)) {
    state.inventoryFolders.push(itemData.folder);
  }

  const existing = id ? state.inventory.find(i => i.id === id) : null;
  if (existing) {
    Object.assign(existing, itemData);
    showToast(`Updated “${itemData.name}”.`);
  } else {
    state.inventory.unshift(itemData);
    showToast(`Added “${itemData.name}” to depot!`);
  }

  document.getElementById("inventory-dialog")?.close();
  await persistState();
  renderInventory();
}

// Dialog: Add / Edit / Copy Filament Spool (Color variants!)
function openAddSpoolDialog(spoolId = null, isCopy = false) {
  const dialog = document.getElementById("spool-dialog");
  const form = document.getElementById("spool-form");
  if (!dialog || !form) return;

  form.reset();
  const titleEl = document.getElementById("spool-dialog-title");

  // Populate folder suggestions
  const datalist = document.getElementById("inventory-folders-datalist");
  if (datalist) {
    datalist.innerHTML = getInventoryFolders().map(f => `<option value="${escapeHTML(f)}">`).join("");
  }

  const existing = spoolId ? (state.inventory || []).find(i => i.id === spoolId) : null;
  const sData = existing?.spoolData || {};

  if (existing) {
    if (isCopy) {
      titleEl.textContent = "Copy Spool (New Color / Variant)";
      form.elements.id.value = ""; // Empty ID so it saves as new
    } else {
      titleEl.textContent = "Edit Filament Spool";
      form.elements.id.value = existing.id;
    }

    form.elements.material.value = sData.material || "PLA";
    form.elements.brand.value = sData.brand || "";
    form.elements.colorName.value = sData.colorName || "";
    form.elements.colorHex.value = sData.colorHex || "#333333";
    form.elements.folder.value = existing.folder || "3D Printing & Filament";
    form.elements.spoolCost.value = sData.spoolCost ?? existing.cost ?? 20;
    form.elements.diameterMm.value = sData.diameterMm || 1.75;
    form.elements.netWeight.value = sData.netWeight ?? existing.quantity ?? 1000;
    form.elements.location.value = existing.location || "";
    form.elements.notes.value = existing.notes || "";
  } else {
    titleEl.textContent = "Add Filament Spool";
    form.elements.id.value = "";
    form.elements.material.value = "PLA";
    form.elements.colorHex.value = "#333333";
    form.elements.folder.value = "3D Printing & Filament";
    form.elements.spoolCost.value = 20;
    form.elements.diameterMm.value = 1.75;
    form.elements.netWeight.value = 1000;
  }

  dialog.showModal();
  if (isCopy && form.elements.colorName) {
    form.elements.colorName.focus();
    form.elements.colorName.select();
  } else if (form.elements.colorName) {
    form.elements.colorName.focus();
  }
}

async function handleSpoolSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const id = form.elements.id.value;
  const material = (form.elements.material.value || "PLA").trim();
  const brand = (form.elements.brand.value || "").trim();
  const colorName = (form.elements.colorName.value || "Standard").trim();
  const colorHex = form.elements.colorHex.value || "#333333";
  const folder = (form.elements.folder.value || "").trim() || "3D Printing & Filament";
  const spoolCost = parseFloat(form.elements.spoolCost.value) || 20;
  const diameterMm = parseFloat(form.elements.diameterMm.value) || 1.75;
  const netWeight = parseFloat(form.elements.netWeight.value) || 1000;
  const location = (form.elements.location.value || "").trim();
  const notes = (form.elements.notes.value || "").trim();

  const name = `${brand ? brand + ' ' : ''}${material} - ${colorName}`;
  const pricePerGram = Number((spoolCost / Math.max(1, netWeight)).toFixed(4));

  const spoolItem = {
    id: id || uid(),
    type: "material",
    name,
    folder,
    quantity: netWeight,
    unit: "g",
    price: pricePerGram,
    cost: spoolCost,
    location,
    notes,
    spoolData: {
      material,
      brand,
      colorName,
      colorHex,
      spoolCost,
      diameterMm,
      netWeight
    },
    updatedAt: new Date().toISOString()
  };

  state.inventory = state.inventory || [];
  state.inventoryFolders = state.inventoryFolders || [];
  if (!state.inventoryFolders.includes(folder)) {
    state.inventoryFolders.push(folder);
  }

  const existing = id ? state.inventory.find(i => i.id === id) : null;
  if (existing) {
    Object.assign(existing, spoolItem);
    showToast(`Updated spool “${name}”.`);
  } else {
    state.inventory.unshift(spoolItem);
    showToast(`Added spool “${name}”!`);
  }

  document.getElementById("spool-dialog")?.close();
  await persistState();
  renderInventory();
}

async function deleteInventoryItem(id) {
  const item = (state.inventory || []).find(i => i.id === id);
  if (!item) return;
  if (!confirm(`Remove “${item.name}” from inventory?`)) return;

  state.inventory = state.inventory.filter(i => i.id !== id);
  await persistState();
  renderInventory();
  showToast(`Removed “${item.name}”.`);
}

// Inventory Folders Management
function openInventoryFolderDialog(oldFolder = "") {
  const dialog = document.getElementById("inventory-folder-dialog");
  const form = document.getElementById("inventory-folder-form");
  if (!dialog || !form) return;
  form.reset();
  form.elements.oldFolder.value = oldFolder || "";
  form.elements.name.value = oldFolder || "";
  const titleEl = document.getElementById("inventory-folder-dialog-title");
  if (titleEl) titleEl.textContent = oldFolder ? "Rename Folder" : "New Inventory Folder";
  dialog.showModal();
  form.elements.name.focus();
  if (oldFolder) form.elements.name.select();
}

async function handleInventoryFolderSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const oldFolder = (form.elements.oldFolder.value || "").trim();
  const newFolder = (form.elements.name.value || "").trim();
  if (!newFolder) return;

  state.inventoryFolders = Array.isArray(state.inventoryFolders) ? state.inventoryFolders : [];

  if (oldFolder) {
    const idx = state.inventoryFolders.indexOf(oldFolder);
    if (idx >= 0) state.inventoryFolders[idx] = newFolder;
    else state.inventoryFolders.push(newFolder);
    (state.inventory || []).forEach(item => {
      if ((item.folder || item.category) === oldFolder) {
        item.folder = newFolder;
      }
    });
    showToast(`Renamed folder to “${newFolder}”.`);
  } else {
    if (!state.inventoryFolders.includes(newFolder)) {
      state.inventoryFolders.push(newFolder);
    }
    showToast(`Created folder “${newFolder}”.`);
  }

  document.getElementById("inventory-folder-dialog")?.close();
  await persistState();
  renderInventory();
}

async function deleteInventoryFolder(folderName) {
  const items = (state.inventory || []).filter(i => (i.folder || i.category) === folderName);
  const msg = items.length
    ? `Delete folder “${folderName}”? Its ${items.length} item(s) will be moved to “General Supplies”.`
    : `Delete folder “${folderName}”?`;
  if (!confirm(msg)) return;

  (state.inventory || []).forEach(item => {
    if ((item.folder || item.category) === folderName) {
      item.folder = "General Supplies";
    }
  });
  state.inventoryFolders = (state.inventoryFolders || []).filter(f => f !== folderName);
  if (items.length && !state.inventoryFolders.includes("General Supplies")) {
    state.inventoryFolders.push("General Supplies");
  }
  await persistState();
  renderInventory();
  showToast(`Deleted folder “${folderName}”.`);
}

function setInventoryViewMode(mode) {
  state.inventoryViewMode = mode;
  persistState();
  renderInventory();
}

function setInventoryTab(tab) {
  state.inventoryTab = tab;
  renderInventory();
}

function toggleInventoryFolderCollapse(folderName) {
  state.collapsedInventoryFolders = state.collapsedInventoryFolders || new Set();
  if (state.collapsedInventoryFolders.has(folderName)) state.collapsedInventoryFolders.delete(folderName);
  else state.collapsedInventoryFolders.add(folderName);
  renderInventory();
}

function openInventoryDialogWithFolder(folderName) {
  openInventoryDialog(null, "material");
  const folderInput = document.getElementById("inv-material-folder-input");
  if (folderInput) folderInput.value = folderName;
}

if (typeof window !== "undefined") {
  window.renderInventory = renderInventory;
  window.getInventoryFolders = getInventoryFolders;
  window.bumpInventoryQty = bumpInventoryQty;
  window.openInventoryDialog = openInventoryDialog;
  window.handleInventorySubmit = handleInventorySubmit;
  window.openAddSpoolDialog = openAddSpoolDialog;
  window.handleSpoolSubmit = handleSpoolSubmit;
  window.deleteInventoryItem = deleteInventoryItem;
  window.openInventoryFolderDialog = openInventoryFolderDialog;
  window.handleInventoryFolderSubmit = handleInventoryFolderSubmit;
  window.deleteInventoryFolder = deleteInventoryFolder;
  window.setInventoryViewMode = setInventoryViewMode;
  window.setInventoryTab = setInventoryTab;
  window.toggleInventoryFolderCollapse = toggleInventoryFolderCollapse;
  window.openInventoryDialogWithFolder = openInventoryDialogWithFolder;
}
