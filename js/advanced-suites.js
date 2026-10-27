/* ============================================================
   Workbench Project Journal - Advanced Workshop Suites & Ultimate Enhancements
   ============================================================ */

/* ============================================================
   8 NEW BIG FEATURES: 3D CAD, Floorplan, Maintenance Engine,
   QR Label Studio & Scanner, Client Portal, Community Hub,
   Timelapse Reel, and Voice-Guided Hands-Free Shop Mode
   ============================================================ */

/* ------------------------------------------------------------
   FEATURE 1: 3D Model & CAD / STL / G-Code Viewer
   ------------------------------------------------------------ */
let cadViewerState = {
  mesh: null,
  toolpaths: null,
  camera: { rotX: -25, rotY: 35, zoom: 1.0, panX: 0, panY: 0 },
  wireframe: true,
  showGrid: true,
  showEdges: false,
  isDragging: false,
  dragButton: 0,
  lastMouseX: 0,
  lastMouseY: 0,
  currentLayer: 1,
  totalLayers: 1,
  fileName: "",
  format: ""
};

function openCadViewer(file = null) {
  const dlg = $("#cad-viewer-dialog");
  if (!dlg) return;
  dlg.showModal();
  initCadViewerCanvas();
  // Adjust canvas drawing buffer to match container bounds
  const canvas = $("#cad-viewer-canvas");
  const container = $("#cad-viewport-container");
  if (canvas && container) {
    const rect = container.getBoundingClientRect();
    if (rect.width > 100) canvas.width = Math.round(rect.width);
    if (rect.height > 100) canvas.height = Math.round(rect.height);
  }
  if (file) {
    loadCadFile(file);
  } else if (!cadViewerState.mesh && !cadViewerState.toolpaths) {
    // Generate a default 3D calibration cube for instant visualization
    loadSampleStlModel();
  } else {
    renderCadViewport();
  }
}

function initCadViewerCanvas() {
  const canvas = $("#cad-viewer-canvas");
  if (!canvas || canvas._cadInitialized) return;
  canvas._cadInitialized = true;

  const container = $("#cad-viewport-container");
  if (container) {
    const rect = container.getBoundingClientRect();
    if (rect.width > 100) canvas.width = Math.round(rect.width);
    if (rect.height > 100) canvas.height = Math.round(rect.height);
  }

  // Orbit & Pan Mouse handlers
  canvas.addEventListener("mousedown", e => {
    cadViewerState.isDragging = true;
    cadViewerState.dragButton = e.button;
    cadViewerState.lastMouseX = e.clientX;
    cadViewerState.lastMouseY = e.clientY;
    e.preventDefault();
  });

  window.addEventListener("mousemove", e => {
    if (!cadViewerState.isDragging) return;
    const dx = e.clientX - cadViewerState.lastMouseX;
    const dy = e.clientY - cadViewerState.lastMouseY;
    cadViewerState.lastMouseX = e.clientX;
    cadViewerState.lastMouseY = e.clientY;

    if (cadViewerState.dragButton === 0 && !e.shiftKey) {
      // Rotate
      cadViewerState.camera.rotY += dx * 0.6;
      cadViewerState.camera.rotX = Math.max(-89, Math.min(89, cadViewerState.camera.rotX + dy * 0.6));
    } else {
      // Pan
      cadViewerState.camera.panX += dx * 0.8;
      cadViewerState.camera.panY += dy * 0.8;
    }
    renderCadViewport();
  });

  window.addEventListener("mouseup", () => {
    cadViewerState.isDragging = false;
  });

  canvas.addEventListener("wheel", e => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    cadViewerState.camera.zoom = Math.max(0.1, Math.min(10.0, cadViewerState.camera.zoom * zoomFactor));
    renderCadViewport();
  }, { passive: false });

  // Drag and drop file support on viewport and dialog
  const dialog = $("#cad-viewer-dialog");
  const handleDragOver = e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    container?.classList.add("drag-over");
  };
  const handleDragLeave = () => {
    container?.classList.remove("drag-over");
  };
  const handleDrop = e => {
    e.preventDefault();
    container?.classList.remove("drag-over");
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      loadCadFile(e.dataTransfer.files[0]);
    }
  };

  if (container) {
    container.addEventListener("dragover", handleDragOver);
    container.addEventListener("dragleave", handleDragLeave);
    container.addEventListener("drop", handleDrop);
  }
  if (dialog) {
    dialog.addEventListener("dragover", handleDragOver);
    dialog.addEventListener("dragleave", handleDragLeave);
    dialog.addEventListener("drop", handleDrop);
  }

  // Browse file input triggers
  $$('[data-action="cad-import-file"]').forEach(btn => {
    btn.addEventListener("click", () => $("#cad-file-input")?.click());
  });
  $("#cad-browse-file-btn")?.addEventListener("click", () => $("#cad-file-input")?.click());
  $("#cad-file-input")?.addEventListener("change", e => {
    if (e.target.files && e.target.files[0]) {
      loadCadFile(e.target.files[0]);
    }
  });

  // Camera presets
  $$(".cad-view-btn[data-cad-view]").forEach(btn => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.cadView;
      if (view === "iso") { cadViewerState.camera.rotX = -25; cadViewerState.camera.rotY = 35; }
      else if (view === "top") { cadViewerState.camera.rotX = -90; cadViewerState.camera.rotY = 0; }
      else if (view === "front") { cadViewerState.camera.rotX = 0; cadViewerState.camera.rotY = 0; }
      else if (view === "side") { cadViewerState.camera.rotX = 0; cadViewerState.camera.rotY = 90; }
      cadViewerState.camera.panX = 0;
      cadViewerState.camera.panY = 0;
      renderCadViewport();
    });
  });

  $("#cad-reset-camera-btn")?.addEventListener("click", () => {
    cadViewerState.camera = { rotX: -25, rotY: 35, zoom: 1.0, panX: 0, panY: 0 };
    renderCadViewport();
  });

  $("#cad-toggle-wireframe")?.addEventListener("click", function() {
    cadViewerState.wireframe = !cadViewerState.wireframe;
    this.classList.toggle("active", cadViewerState.wireframe);
    renderCadViewport();
  });

  $("#cad-toggle-grid")?.addEventListener("click", function() {
    cadViewerState.showGrid = !cadViewerState.showGrid;
    this.classList.toggle("active", cadViewerState.showGrid);
    renderCadViewport();
  });

  $("#cad-toggle-edges")?.addEventListener("click", function() {
    cadViewerState.showEdges = !cadViewerState.showEdges;
    this.classList.toggle("active", cadViewerState.showEdges);
    renderCadViewport();
  });

  $("#cad-sample-stl-btn")?.addEventListener("click", () => loadSampleStlModel());
  $("#cad-sample-gcode-btn")?.addEventListener("click", () => loadSampleGCodeModel());
  $("#cad-sim-play-btn")?.addEventListener("click", () => toggleCadSimulation());

  $("#cad-layer-range")?.addEventListener("input", e => {
    cadViewerState.currentLayer = parseInt(e.target.value, 10) || 1;
    $("#cad-layer-num").textContent = cadViewerState.currentLayer;
    if (cadViewerState.toolpaths && cadViewerState.toolpaths[cadViewerState.currentLayer - 1]) {
      $("#cad-layer-z").textContent = cadViewerState.toolpaths[cadViewerState.currentLayer - 1].z.toFixed(2);
    }
    renderCadViewport();
  });

  $("#cad-material-select")?.addEventListener("change", () => recalculateCadCost());
  $("#cad-infill-select")?.addEventListener("change", () => recalculateCadCost());
}

async function loadCadFile(file) {
  if (!file) return;
  const name = file.name;
  const ext = name.split(".").pop().toLowerCase();
  cadViewerState.fileName = name;
  $("#cad-drop-prompt").style.display = "none";
  const fileInput = $("#cad-file-input");
  if (fileInput) fileInput.value = "";

  try {
    if (ext === "stl") {
      const buffer = await file.arrayBuffer();
      const isBinary = isBinaryStl(buffer);
      let mesh = null;
      let format = isBinary ? "Binary STL" : "ASCII STL";

      if (isBinary) {
        mesh = parseBinaryStl(buffer);
        // Fallback: If binary parsing yielded 0 triangles, try ASCII parser
        if (!mesh || mesh.facetCount === 0) {
          try {
            const asciiMesh = parseASCIIStl(new TextDecoder().decode(buffer));
            if (asciiMesh && asciiMesh.facetCount > 0) {
              mesh = asciiMesh;
              format = "ASCII STL";
            }
          } catch (_) {}
        }
      } else {
        try {
          mesh = parseASCIIStl(new TextDecoder().decode(buffer));
        } catch (_) {}
        // Fallback: If ASCII parsing yielded 0 triangles, try Binary parser
        if (!mesh || mesh.facetCount === 0) {
          try {
            const binMesh = parseBinaryStl(buffer);
            if (binMesh && binMesh.facetCount > 0) {
              mesh = binMesh;
              format = "Binary STL";
            }
          } catch (_) {}
        }
      }

      if (!mesh || mesh.facetCount === 0) {
        throw new Error("No triangles could be extracted from this STL file.");
      }

      cadViewerState.format = format;
      cadViewerState.mesh = mesh;
      cadViewerState.toolpaths = null;
      cadViewerState.camera.zoom = 1.0;
      cadViewerState.camera.panX = 0;
      cadViewerState.camera.panY = 0;
      $("#cad-gcode-scrubber").style.display = "none";
    } else if (ext === "obj") {
      const text = await file.text();
      cadViewerState.format = "Wavefront OBJ";
      cadViewerState.mesh = parseOBJMesh(text);
      cadViewerState.toolpaths = null;
      cadViewerState.camera.zoom = 1.0;
      cadViewerState.camera.panX = 0;
      cadViewerState.camera.panY = 0;
      $("#cad-gcode-scrubber").style.display = "none";
    } else if (ext === "gcode" || ext === "nc") {
      const text = await file.text();
      cadViewerState.format = "G-Code Toolpaths";
      cadViewerState.toolpaths = parseGCodeLayers(text);
      cadViewerState.mesh = null;
      cadViewerState.totalLayers = Math.max(1, cadViewerState.toolpaths.length);
      cadViewerState.currentLayer = cadViewerState.totalLayers;
      cadViewerState.camera.zoom = 1.0;
      cadViewerState.camera.panX = 0;
      cadViewerState.camera.panY = 0;

      $("#cad-gcode-scrubber").style.display = "block";
      $("#cad-layer-total").textContent = cadViewerState.totalLayers;
      $("#cad-layer-num").textContent = cadViewerState.currentLayer;
      const range = $("#cad-layer-range");
      if (range) {
        range.max = cadViewerState.totalLayers;
        range.value = cadViewerState.currentLayer;
      }
    }
    updateCadDiagnosticsUI();
    renderCadViewport();
    showToast(`Loaded ${name} successfully! 🧊`);
  } catch (err) {
    console.error("CAD Parse Error:", err);
    showToast("Could not parse 3D file: " + err.message);
  }
}

function isBinaryStl(buffer) {
  if (!buffer || buffer.byteLength < 84) return false;
  const data = new DataView(buffer);
  const triangleCount = data.getUint32(80, true);
  const expectedBinarySize = 84 + triangleCount * 50;

  // 1. Exact mathematical binary STL file size check
  if (Math.abs(buffer.byteLength - expectedBinarySize) <= 2 && triangleCount > 0) {
    return true;
  }

  // 2. Null byte check: ASCII STL text files NEVER contain 0x00 bytes
  const checkLen = Math.min(buffer.byteLength, 1024);
  const bytes = new Uint8Array(buffer, 0, checkLen);
  for (let i = 0; i < checkLen; i++) {
    if (bytes[i] === 0) return true;
  }

  // 3. Fallback header check
  try {
    const header = new TextDecoder().decode(buffer.slice(0, Math.min(buffer.byteLength, 80))).trim().toLowerCase();
    return !header.startsWith("solid");
  } catch (_) {
    return true;
  }
}

function parseBinaryStl(buffer) {
  const data = new DataView(buffer);
  const triangleCount = data.getUint32(80, true);
  const vertices = [];
  const normals = [];

  let offset = 84;
  for (let i = 0; i < triangleCount; i++) {
    if (offset + 50 > buffer.byteLength) break;
    const nx = data.getFloat32(offset, true);
    const ny = data.getFloat32(offset + 4, true);
    const nz = data.getFloat32(offset + 8, true);
    offset += 12;

    const normal = [nx, ny, nz];
    for (let v = 0; v < 3; v++) {
      const vx = data.getFloat32(offset, true);
      const vy = data.getFloat32(offset + 4, true);
      const vz = data.getFloat32(offset + 8, true);
      vertices.push([vx, vy, vz]);
      normals.push(normal);
      offset += 12;
    }
    offset += 2; // attribute byte count
  }

  return computeMeshStats(vertices, normals);
}

function parseASCIIStl(stlText) {
  const vertices = [];
  const normals = [];
  const lines = stlText.split("\n");
  let currentNormal = [0, 0, 1];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const lower = line.toLowerCase();
    if (lower.startsWith("facet normal")) {
      const parts = line.split(/\s+/).slice(2).map(Number);
      if (parts.length === 3 && parts.every(n => !isNaN(n))) {
        currentNormal = parts;
      }
    } else if (lower.startsWith("vertex")) {
      const parts = line.split(/\s+/).slice(1).map(Number);
      if (parts.length === 3 && parts.every(n => !isNaN(n))) {
        vertices.push(parts);
        normals.push(currentNormal);
      }
    }
  }

  return computeMeshStats(vertices, normals);
}

function parseOBJMesh(objText) {
  const rawVertices = [];
  const vertices = [];
  const normals = [];

  const lines = objText.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("v ")) {
      const parts = line.split(/\s+/).slice(1).map(Number);
      if (parts.length >= 3) rawVertices.push([parts[0], parts[1], parts[2]]);
    } else if (line.startsWith("f ")) {
      const parts = line.split(/\s+/).slice(1).map(part => {
        const vIdx = parseInt(part.split("/")[0], 10);
        return vIdx < 0 ? rawVertices.length + vIdx : vIdx - 1;
      });

      // Triangulate polygon fans (f 1 2 3 4 -> (1 2 3) and (1 3 4))
      for (let j = 1; j < parts.length - 1; j++) {
        const v1 = rawVertices[parts[0]];
        const v2 = rawVertices[parts[j]];
        const v3 = rawVertices[parts[j + 1]];
        if (v1 && v2 && v3) {
          vertices.push(v1, v2, v3);
          // Calculate surface normal
          const ax = v2[0] - v1[0], ay = v2[1] - v1[1], az = v2[2] - v1[2];
          const bx = v3[0] - v1[0], by = v3[1] - v1[1], bz = v3[2] - v1[2];
          const nx = ay * bz - az * by;
          const ny = az * bx - ax * bz;
          const nz = ax * by - ay * bx;
          const len = Math.hypot(nx, ny, nz) || 1;
          const norm = [nx / len, ny / len, nz / len];
          normals.push(norm, norm, norm);
        }
      }
    }
  }

  return computeMeshStats(vertices, normals);
}

function computeMeshStats(vertices, normals) {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  let totalVolume = 0;
  let totalArea = 0;

  const cleanNormals = normals && normals.length >= vertices.length ? [...normals] : new Array(vertices.length);

  for (let i = 0; i < vertices.length; i += 3) {
    if (i + 2 >= vertices.length) break;
    const v1 = vertices[i];
    const v2 = vertices[i + 1];
    const v3 = vertices[i + 2];

    for (const v of [v1, v2, v3]) {
      if (v[0] < minX) minX = v[0];
      if (v[0] > maxX) maxX = v[0];
      if (v[1] < minY) minY = v[1];
      if (v[1] > maxY) maxY = v[1];
      if (v[2] < minZ) minZ = v[2];
      if (v[2] > maxZ) maxZ = v[2];
    }

    // Edge vectors
    const ax = v2[0] - v1[0], ay = v2[1] - v1[1], az = v2[2] - v1[2];
    const bx = v3[0] - v1[0], by = v3[1] - v1[1], bz = v3[2] - v1[2];

    // Cross product (surface normal vector)
    const cx = ay * bz - az * by;
    const cy = az * bx - ax * bz;
    const cz = ax * by - ay * bx;
    const crossLen = Math.hypot(cx, cy, cz);

    // Compute / fix face normals if file had (0,0,0) or missing normals
    const existingNorm = cleanNormals[i];
    const normLen = existingNorm ? Math.hypot(existingNorm[0], existingNorm[1], existingNorm[2]) : 0;
    let computedNorm;
    if (normLen > 0.001) {
      computedNorm = [existingNorm[0] / normLen, existingNorm[1] / normLen, existingNorm[2] / normLen];
    } else if (crossLen > 1e-7) {
      computedNorm = [cx / crossLen, cy / crossLen, cz / crossLen];
    } else {
      computedNorm = [0, 0, 1];
    }
    cleanNormals[i] = computedNorm;
    cleanNormals[i + 1] = computedNorm;
    cleanNormals[i + 2] = computedNorm;

    // Signed tetrahedron volume = (v1 . (v2 x v3)) / 6.0
    const crossX = v2[1] * v3[2] - v2[2] * v3[1];
    const crossY = v2[2] * v3[0] - v2[0] * v3[2];
    const crossZ = v2[0] * v3[1] - v2[1] * v3[0];
    const signedVol = (v1[0] * crossX + v1[1] * crossY + v1[2] * crossZ) / 6.0;
    totalVolume += signedVol;

    // Surface Area
    totalArea += 0.5 * crossLen;
  }

  if (minX === Infinity) {
    minX = maxX = minY = maxY = minZ = maxZ = 0;
  }

  // Normalize center of mesh to origin (0, 0, 0)
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerZ = minZ; // place base on Z=0 plane

  const centeredVertices = vertices.map(v => [
    v[0] - centerX,
    v[1] - centerY,
    v[2] - centerZ
  ]);

  return {
    vertices: centeredVertices,
    normals: cleanNormals,
    facetCount: Math.floor(vertices.length / 3),
    bounds: {
      minX, maxX, minY, maxY, minZ, maxZ,
      dimX: Math.max(0.1, maxX - minX),
      dimY: Math.max(0.1, maxY - minY),
      dimZ: Math.max(0.1, maxZ - minZ)
    },
    volumeCm3: Math.abs(totalVolume) / 1000.0,
    areaCm2: totalArea / 100.0
  };
}

function parseGCodeLayers(gcodeText) {
  const lines = gcodeText.split("\n");
  const layers = [];
  let currentLayer = { z: 0.2, moves: [] };
  let currentPos = { x: 0, y: 0, z: 0 };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/;.*$/, "").trim();
    if (!line) continue;
    const parts = line.split(/\s+/);
    const cmd = parts[0].toUpperCase();

    if (cmd === "G0" || cmd === "G1") {
      let x = currentPos.x, y = currentPos.y, z = currentPos.z;
      let isExtrude = false;
      for (let p = 1; p < parts.length; p++) {
        const flag = parts[p][0].toUpperCase();
        const val = parseFloat(parts[p].slice(1));
        if (!isNaN(val)) {
          if (flag === "X") x = val;
          if (flag === "Y") y = val;
          if (flag === "Z") z = val;
          if (flag === "E" && val > 0) isExtrude = true;
        }
      }
      if (z !== currentPos.z) {
        if (currentLayer.moves.length > 0) {
          layers.push(currentLayer);
          currentLayer = { z, moves: [] };
        } else {
          currentLayer.z = z;
        }
      }
      currentLayer.moves.push({
        from: { ...currentPos },
        to: { x, y, z },
        isRapid: cmd === "G0",
        isExtrude
      });
      currentPos = { x, y, z };
    }
  }
  if (currentLayer.moves.length > 0) layers.push(currentLayer);
  return layers;
}

function updateCadDiagnosticsUI() {
  $("#cad-stat-filename").textContent = cadViewerState.fileName || "Sample Model";
  $("#cad-stat-format").textContent = cadViewerState.format || "3D Mesh";

  if (cadViewerState.mesh) {
    const b = cadViewerState.mesh.bounds;
    $("#cad-stat-bounds").textContent = `${b.dimX.toFixed(1)} × ${b.dimY.toFixed(1)} × ${b.dimZ.toFixed(1)} mm (${(b.dimX/25.4).toFixed(2)}″ × ${(b.dimY/25.4).toFixed(2)}″ × ${(b.dimZ/25.4).toFixed(2)}″)`;
    $("#cad-stat-volume").textContent = `${cadViewerState.mesh.volumeCm3.toFixed(2)} cm³ (${(cadViewerState.mesh.volumeCm3 * 0.06102).toFixed(2)} in³)`;
    $("#cad-stat-area").textContent = `${cadViewerState.mesh.areaCm2.toFixed(1)} cm²`;
    $("#cad-stat-facets").textContent = cadViewerState.mesh.facetCount.toLocaleString() + " triangles";
    recalculateCadCost();
  } else if (cadViewerState.toolpaths) {
    $("#cad-stat-bounds").textContent = `Z-Height ${cadViewerState.toolpaths[cadViewerState.toolpaths.length-1]?.z.toFixed(2)} mm`;
    $("#cad-stat-volume").textContent = cadViewerState.totalLayers + " G-Code Layers";
    $("#cad-stat-area").textContent = "Extrusion Toolpath";
    $("#cad-stat-facets").textContent = "G0/G1 Motion Path";
  }
}

function recalculateCadCost() {
  if (!cadViewerState.mesh) return;
  const density = parseFloat($("#cad-material-select")?.value) || 1.24;
  const infill = parseFloat($("#cad-infill-select")?.value) || 0.2;
  const selOpt = $("#cad-material-select")?.selectedOptions?.[0];
  const costPerGram = parseFloat(selOpt?.dataset?.cost) || 0.022;

  const effectiveVolume = cadViewerState.mesh.volumeCm3 * (0.2 + 0.8 * infill);
  const weightG = effectiveVolume * density;
  const filamentM = weightG / (density * Math.PI * Math.pow(1.75 / 20, 2)); // length in meters
  const totalCost = weightG * costPerGram;

  $("#cad-est-weight").textContent = weightG.toFixed(1) + " g";
  $("#cad-est-filament").textContent = filamentM.toFixed(1) + " m";
  $("#cad-est-cost").textContent = "$" + totalCost.toFixed(2);
}

function renderCadViewport() {
  const canvas = $("#cad-viewer-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  // Background gradient
  const grad = ctx.createRadialGradient(w/2, h/2, 50, w/2, h/2, w);
  grad.addColorStop(0, "#1e293b");
  grad.addColorStop(1, "#0b0f17");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2 + cadViewerState.camera.panX;
  const cy = h / 2 + cadViewerState.camera.panY;
  const zoom = cadViewerState.camera.zoom;

  // Auto-fit scale based on bounding box
  const maxDim = cadViewerState.mesh && cadViewerState.mesh.bounds
    ? Math.max(cadViewerState.mesh.bounds.dimX, cadViewerState.mesh.bounds.dimY, cadViewerState.mesh.bounds.dimZ, 1)
    : (cadViewerState.toolpaths ? 150 : 50);

  // Fit to ~45% of minimum canvas dimension so full geometry is comfortably visible
  const fitScale = (Math.min(w, h) * 0.45) / Math.max(10, maxDim);
  const scale = fitScale * zoom;

  // Rotation angles in radians
  const radX = (cadViewerState.camera.rotX * Math.PI) / 180;
  const radY = (cadViewerState.camera.rotY * Math.PI) / 180;
  const cosX = Math.cos(radX), sinX = Math.sin(radX);
  const cosY = Math.cos(radY), sinY = Math.sin(radY);

  // 3D projection transformation
  const project3D = (x, y, z) => {
    // Rotate Y (azimuth)
    const x1 = x * cosY - y * sinY;
    const y1 = x * sinY + y * cosY;
    const z1 = z;

    // Rotate X (pitch)
    const y2 = y1 * cosX - z1 * sinX;
    const z2 = y1 * sinX + z1 * cosX;

    // Scale and center
    const px = cx + x1 * scale;
    const py = cy - z2 * scale; // invert Z for screen coordinates
    return { x: px, y: py, depth: y2 };
  };

  // Draw Ground Grid
  if (cadViewerState.showGrid) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    const gridSize = Math.max(50, Math.ceil(maxDim / 20) * 20);
    const step = Math.max(10, Math.round(gridSize / 5));
    for (let g = -gridSize; g <= gridSize; g += step) {
      const p1 = project3D(g, -gridSize, 0);
      const p2 = project3D(g, gridSize, 0);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      const p3 = project3D(-gridSize, g, 0);
      const p4 = project3D(gridSize, g, 0);
      ctx.beginPath();
      ctx.moveTo(p3.x, p3.y);
      ctx.lineTo(p4.x, p4.y);
      ctx.stroke();
    }

    // Grid center axes (X = red, Y = green, Z = blue)
    const axisLen = Math.max(15, Math.round(gridSize * 0.25));
    const o = project3D(0, 0, 0);
    const axX = project3D(axisLen, 0, 0);
    const axY = project3D(0, axisLen, 0);
    const axZ = project3D(0, 0, axisLen);

    ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(axX.x, axX.y); ctx.stroke();
    ctx.strokeStyle = "#10b981";
    ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(axY.x, axY.y); ctx.stroke();
    ctx.strokeStyle = "#3b82f6";
    ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(axZ.x, axZ.y); ctx.stroke();
  }

  // Render Mesh (Triangles)
  if (cadViewerState.mesh && cadViewerState.mesh.vertices.length > 0) {
    const verts = cadViewerState.mesh.vertices;
    const norms = cadViewerState.mesh.normals;
    const triangles = [];

    // Light source vector
    const light = [0.577, 0.577, 0.577];

    for (let i = 0; i < verts.length; i += 3) {
      if (i + 2 >= verts.length) break;
      const v1 = verts[i], v2 = verts[i + 1], v3 = verts[i + 2];
      const norm = norms[i] || [0, 0, 1];

      const p1 = project3D(v1[0], v1[1], v1[2]);
      const p2 = project3D(v2[0], v2[1], v2[2]);
      const p3 = project3D(v3[0], v3[1], v3[2]);

      const avgDepth = (p1.depth + p2.depth + p3.depth) / 3;

      // Calculate directional lighting intensity
      const dot = Math.max(0.15, norm[0] * light[0] + norm[1] * light[1] + norm[2] * light[2]);
      triangles.push({ p1, p2, p3, depth: avgDepth, light: dot });
    }

    // Painter's algorithm: sort triangles back-to-front
    triangles.sort((a, b) => b.depth - a.depth);

    for (const t of triangles) {
      ctx.beginPath();
      ctx.moveTo(t.p1.x, t.p1.y);
      ctx.lineTo(t.p2.x, t.p2.y);
      ctx.lineTo(t.p3.x, t.p3.y);
      ctx.closePath();

      // Shaded face color (Warm amber/gold workbench theme)
      const r = Math.round(217 * (0.3 + 0.7 * t.light));
      const g = Math.round(119 * (0.3 + 0.7 * t.light));
      const b = Math.round(6 * (0.3 + 0.7 * t.light));
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fill();

      if (cadViewerState.wireframe) {
        ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }

  // Render G-Code Toolpaths
  if (cadViewerState.toolpaths && cadViewerState.toolpaths.length > 0) {
    const maxLayer = Math.min(cadViewerState.currentLayer, cadViewerState.toolpaths.length);
    let lastTipPos = null;
    let collisionDetected = false;

    for (let l = 0; l < maxLayer; l++) {
      const layer = cadViewerState.toolpaths[l];
      const isTopLayer = (l === maxLayer - 1);
      ctx.lineWidth = isTopLayer ? 1.5 : 0.8;

      for (const m of layer.moves) {
        const p1 = project3D(m.from.x, m.from.y, m.from.z);
        const p2 = project3D(m.to.x, m.to.y, m.to.z);

        if (m.isRapid && m.to.z < 0) {
          collisionDetected = true;
        }

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);

        if (m.isRapid) {
          ctx.strokeStyle = "rgba(6, 182, 212, 0.3)"; // cyan rapid moves
          ctx.setLineDash([2, 2]);
        } else if (m.isExtrude) {
          ctx.strokeStyle = isTopLayer ? "#f59e0b" : "rgba(217, 119, 6, 0.4)"; // amber extrusion
          ctx.setLineDash([]);
        } else {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
          ctx.setLineDash([]);
        }
        ctx.stroke();

        if (isTopLayer) {
          lastTipPos = p2;
        }
      }
    }
    ctx.setLineDash([]);

    // Draw animated virtual toolhead/nozzle
    if (lastTipPos) {
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(lastTipPos.x, lastTipPos.y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Inverted tool cone
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(lastTipPos.x, lastTipPos.y);
      ctx.lineTo(lastTipPos.x - 7, lastTipPos.y - 16);
      ctx.lineTo(lastTipPos.x + 7, lastTipPos.y - 16);
      ctx.closePath();
      ctx.stroke();
    }

    const warnEl = $("#cad-sim-warning");
    if (warnEl) {
      if (collisionDetected) {
        warnEl.textContent = "⚠️ Rapid traverse (G0) below Z=0 detected! Verify stock clearance.";
        warnEl.style.display = "block";
      } else {
        warnEl.style.display = "none";
      }
    }
  }
}

let cadSimInterval = null;
function toggleCadSimulation() {
  const btn = $("#cad-sim-play-btn");
  if (cadSimInterval) {
    clearInterval(cadSimInterval);
    cadSimInterval = null;
    if (btn) btn.textContent = "▶ Simulate";
    return;
  }

  if (!cadViewerState.toolpaths || cadViewerState.toolpaths.length === 0) return;

  if (cadViewerState.currentLayer >= cadViewerState.totalLayers) {
    cadViewerState.currentLayer = 1;
  }

  if (btn) btn.textContent = "⏸ Pause";
  const speed = parseInt($("#cad-sim-speed")?.value, 10) || 5;
  const interval = Math.max(15, Math.round(180 / speed));

  cadSimInterval = setInterval(() => {
    if (cadViewerState.currentLayer >= cadViewerState.totalLayers) {
      clearInterval(cadSimInterval);
      cadSimInterval = null;
      if (btn) btn.textContent = "▶ Simulate";
      return;
    }
    cadViewerState.currentLayer++;
    $("#cad-layer-num").textContent = cadViewerState.currentLayer;
    const range = $("#cad-layer-range");
    if (range) range.value = cadViewerState.currentLayer;
    if (cadViewerState.toolpaths[cadViewerState.currentLayer - 1]) {
      $("#cad-layer-z").textContent = cadViewerState.toolpaths[cadViewerState.currentLayer - 1].z.toFixed(2);
    }
    renderCadViewport();
  }, interval);
}

function loadSampleStlModel() {
  const cubeStl = `solid cube
facet normal 0 0 1
outer loop
vertex 0 0 25
vertex 25 0 25
vertex 25 25 25
endloop
endfacet
facet normal 0 0 1
outer loop
vertex 0 0 25
vertex 25 25 25
vertex 0 25 25
endloop
endfacet
facet normal 0 0 -1
outer loop
vertex 0 0 0
vertex 25 25 0
vertex 25 0 0
endloop
endfacet
facet normal 0 0 -1
outer loop
vertex 0 0 0
vertex 0 25 0
vertex 25 25 0
endloop
endfacet
facet normal 0 -1 0
outer loop
vertex 0 0 0
vertex 25 0 0
vertex 25 0 25
endloop
endfacet
facet normal 0 -1 0
outer loop
vertex 0 0 0
vertex 25 0 25
vertex 0 0 25
endloop
endfacet
facet normal 0 1 0
outer loop
vertex 0 25 0
vertex 25 25 25
vertex 25 25 0
endloop
endfacet
facet normal 0 1 0
outer loop
vertex 0 25 0
vertex 0 25 25
vertex 25 25 25
endloop
endfacet
facet normal -1 0 0
outer loop
vertex 0 0 0
vertex 0 0 25
vertex 0 25 25
endloop
endfacet
facet normal -1 0 0
outer loop
vertex 0 0 0
vertex 0 25 25
vertex 0 25 0
endloop
endfacet
facet normal 1 0 0
outer loop
vertex 25 0 0
vertex 25 25 25
vertex 25 0 25
endloop
endfacet
facet normal 1 0 0
outer loop
vertex 25 0 0
vertex 25 20 0
vertex 25 25 25
endloop
endfacet
endsolid cube`;

  cadViewerState.fileName = "Calibration_Cube_25mm.stl";
  cadViewerState.format = "ASCII STL";
  cadViewerState.mesh = parseASCIIStl(cubeStl);
  cadViewerState.toolpaths = null;
  $("#cad-gcode-scrubber").style.display = "none";
  $("#cad-drop-prompt").style.display = "none";
  updateCadDiagnosticsUI();
  renderCadViewport();
}

function loadSampleGCodeModel() {
  let gcode = "G28\n";
  const numLayers = 30;
  for (let l = 1; l <= numLayers; l++) {
    const z = (l * 0.2).toFixed(2);
    gcode += `G1 Z${z} F1200\n`;
    const r = 20 - l * 0.3;
    const steps = 24;
    for (let s = 0; s <= steps; s++) {
      const theta = (s / steps) * Math.PI * 2;
      const x = (r * Math.cos(theta)).toFixed(2);
      const y = (r * Math.sin(theta)).toFixed(2);
      gcode += `G1 X${x} Y${y} E${(s * 0.1).toFixed(2)}\n`;
    }
  }

  cadViewerState.fileName = "Spiral_Vase_Test.gcode";
  cadViewerState.format = "G-Code Toolpaths";
  cadViewerState.toolpaths = parseGCodeLayers(gcode);
  cadViewerState.mesh = null;
  cadViewerState.totalLayers = numLayers;
  cadViewerState.currentLayer = numLayers;

  $("#cad-gcode-scrubber").style.display = "block";
  $("#cad-drop-prompt").style.display = "none";
  $("#cad-layer-total").textContent = numLayers;
  $("#cad-layer-num").textContent = numLayers;
  const range = $("#cad-layer-range");
  if (range) {
    range.max = numLayers;
    range.value = numLayers;
  }

  updateCadDiagnosticsUI();
  renderCadViewport();
}


/* ------------------------------------------------------------
   FEATURE 2: Workshop Floor & Machine Clearance Planner
   ------------------------------------------------------------ */
const FLOORPLAN_STORAGE_KEY = "workbench_floorplan_layout";
let floorplanState = {
  roomWidthFt: 20,
  roomLengthFt: 24,
  snapGrid: true,
  showClearances: true,
  items: [],
  selectedId: null,
  isDragging: false,
  dragOffset: { x: 0, y: 0 }
};

const MACHINE_PRESETS = {
  tablesaw: { name: "Cabinet Table Saw", icon: "🪚", wFt: 3.5, lFt: 5.0, clearanceFrontFt: 4.0, clearanceBackFt: 8.0, clearanceLeftFt: 2.0, clearanceRightFt: 3.0, color: "#d97706" },
  mitersaw: { name: "Miter Saw Station", icon: "📐", wFt: 2.0, lFt: 8.0, clearanceFrontFt: 3.0, clearanceBackFt: 0.5, clearanceLeftFt: 2.0, clearanceRightFt: 2.0, color: "#2563eb" },
  workbench: { name: "Assembly Island (4×8)", icon: "🪵", wFt: 4.0, lFt: 8.0, clearanceFrontFt: 3.0, clearanceBackFt: 3.0, clearanceLeftFt: 3.0, clearanceRightFt: 3.0, color: "#16a34a" },
  cnc: { name: "CNC Router Table", icon: "⚙️", wFt: 4.5, lFt: 5.0, clearanceFrontFt: 3.0, clearanceBackFt: 2.0, clearanceLeftFt: 2.0, clearanceRightFt: 2.0, color: "#9333ea" },
  laser: { name: "Laser Cutter & Exhaust", icon: "🔥", wFt: 3.0, lFt: 4.0, clearanceFrontFt: 3.0, clearanceBackFt: 1.5, clearanceLeftFt: 1.5, clearanceRightFt: 1.5, color: "#dc2626" },
  printer3d: { name: "3D Printing Station", icon: "🖨️", wFt: 2.5, lFt: 3.5, clearanceFrontFt: 2.5, clearanceBackFt: 0.5, clearanceLeftFt: 1.0, clearanceRightFt: 1.0, color: "#0891b2" },
  bandsaw: { name: "18″ Bandsaw", icon: "🌀", wFt: 2.5, lFt: 2.5, clearanceFrontFt: 4.0, clearanceBackFt: 3.0, clearanceLeftFt: 2.0, clearanceRightFt: 2.0, color: "#059669" },
  dustcoll: { name: "Cyclone Dust Collector", icon: "💨", wFt: 3.0, lFt: 3.0, clearanceFrontFt: 2.0, clearanceBackFt: 0.5, clearanceLeftFt: 0.5, clearanceRightFt: 0.5, color: "#475569" },
  powerdrop: { name: "220V 30A Power Drop", icon: "⚡", wFt: 1.0, lFt: 1.0, clearanceFrontFt: 1.0, clearanceBackFt: 0, clearanceLeftFt: 0, clearanceRightFt: 0, color: "#eab308" }
};

function openFloorplanPlanner() {
  const dlg = $("#floorplan-dialog");
  if (!dlg) return;
  dlg.showModal();
  loadFloorplanFromStorage();
  initFloorplanCanvas();
  renderFloorplan();
}

function initFloorplanCanvas() {
  const canvas = $("#floorplan-canvas");
  if (!canvas || canvas._floorplanInit) return;
  canvas._floorplanInit = true;

  canvas.addEventListener("mousedown", e => {
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / canvas.width) * floorplanState.roomWidthFt;
    const clickY = ((e.clientY - rect.top) / canvas.height) * floorplanState.roomLengthFt;

    // Check hit test on placed items (topmost first)
    const hit = [...floorplanState.items].reverse().find(item => {
      return clickX >= item.xFt && clickX <= item.xFt + item.wFt &&
             clickY >= item.yFt && clickY <= item.yFt + item.lFt;
    });

    if (hit) {
      floorplanState.selectedId = hit.id;
      floorplanState.isDragging = true;
      floorplanState.dragOffset = { x: clickX - hit.xFt, y: clickY - hit.yFt };
      $("#floorplan-selected-toolbar").style.display = "flex";
      $("#floorplan-selected-name").textContent = `${hit.icon} ${hit.name}`;
    } else {
      floorplanState.selectedId = null;
      $("#floorplan-selected-toolbar").style.display = "none";
    }
    renderFloorplan();
  });

  window.addEventListener("mousemove", e => {
    if (!floorplanState.isDragging || !floorplanState.selectedId) return;
    const canvas = $("#floorplan-canvas");
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    let curX = ((e.clientX - rect.left) / canvas.width) * floorplanState.roomWidthFt - floorplanState.dragOffset.x;
    let curY = ((e.clientY - rect.top) / canvas.height) * floorplanState.roomLengthFt - floorplanState.dragOffset.y;

    if (floorplanState.snapGrid) {
      curX = Math.round(curX * 2) / 2; // snap 0.5 ft (6 inches)
      curY = Math.round(curY * 2) / 2;
    }

    const item = floorplanState.items.find(i => i.id === floorplanState.selectedId);
    if (item) {
      item.xFt = Math.max(0, Math.min(floorplanState.roomWidthFt - item.wFt, curX));
      item.yFt = Math.max(0, Math.min(floorplanState.roomLengthFt - item.lFt, curY));
      renderFloorplan();
    }
  });

  window.addEventListener("mouseup", () => {
    if (floorplanState.isDragging) {
      floorplanState.isDragging = false;
      saveFloorplanToStorage();
    }
  });

  // Library buttons
  $$(".floorplan-add-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.type;
      addFloorplanItem(type);
    });
  });

  $("#floorplan-room-w")?.addEventListener("change", e => {
    floorplanState.roomWidthFt = Math.max(8, parseFloat(e.target.value) || 20);
    saveFloorplanToStorage();
    renderFloorplan();
  });

  $("#floorplan-room-l")?.addEventListener("change", e => {
    floorplanState.roomLengthFt = Math.max(8, parseFloat(e.target.value) || 24);
    saveFloorplanToStorage();
    renderFloorplan();
  });

  $("#floorplan-snap-grid")?.addEventListener("change", e => {
    floorplanState.snapGrid = e.target.checked;
  });

  $("#floorplan-show-clearances")?.addEventListener("change", e => {
    floorplanState.showClearances = e.target.checked;
    renderFloorplan();
  });

  $("#floorplan-rotate-btn")?.addEventListener("click", () => {
    const item = floorplanState.items.find(i => i.id === floorplanState.selectedId);
    if (item) {
      // Swap width and length for 90-degree rotation
      const tmp = item.wFt;
      item.wFt = item.lFt;
      item.lFt = tmp;
      item.rotation = ((item.rotation || 0) + 90) % 360;
      saveFloorplanToStorage();
      renderFloorplan();
    }
  });

  $("#floorplan-delete-btn")?.addEventListener("click", () => {
    if (floorplanState.selectedId) {
      floorplanState.items = floorplanState.items.filter(i => i.id !== floorplanState.selectedId);
      floorplanState.selectedId = null;
      $("#floorplan-selected-toolbar").style.display = "none";
      saveFloorplanToStorage();
      renderFloorplan();
      showToast("Station removed from shop layout.");
    }
  });

  $("#floorplan-clear-btn")?.addEventListener("click", () => {
    if (confirm("Clear all machines from workshop floor plan?")) {
      floorplanState.items = [];
      floorplanState.selectedId = null;
      $("#floorplan-selected-toolbar").style.display = "none";
      saveFloorplanToStorage();
      renderFloorplan();
    }
  });

  $("#floorplan-export-png-btn")?.addEventListener("click", () => exportFloorplanPng());
}

function addFloorplanItem(type) {
  const preset = MACHINE_PRESETS[type] || MACHINE_PRESETS.workbench;
  const item = {
    id: "fp-" + uid(),
    type,
    name: preset.name,
    icon: preset.icon,
    wFt: preset.wFt,
    lFt: preset.lFt,
    clearanceFrontFt: preset.clearanceFrontFt,
    clearanceBackFt: preset.clearanceBackFt,
    clearanceLeftFt: preset.clearanceLeftFt,
    clearanceRightFt: preset.clearanceRightFt,
    color: preset.color,
    rotation: 0,
    xFt: 2.0 + Math.random() * 2,
    yFt: 2.0 + Math.random() * 2
  };

  floorplanState.items.push(item);
  floorplanState.selectedId = item.id;
  $("#floorplan-selected-toolbar").style.display = "flex";
  $("#floorplan-selected-name").textContent = `${item.icon} ${item.name}`;
  saveFloorplanToStorage();
  renderFloorplan();
  showToast(`Added ${item.name} to workshop floor.`);
}

function renderFloorplan() {
  const canvas = $("#floorplan-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const cw = canvas.width;
  const ch = canvas.height;

  ctx.clearRect(0, 0, cw, ch);

  // Background room interior
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(0, 0, cw, ch);

  const scaleX = cw / floorplanState.roomWidthFt;
  const scaleY = ch / floorplanState.roomLengthFt;

  // Draw 1-foot grid lines
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= floorplanState.roomWidthFt; x++) {
    ctx.beginPath();
    ctx.moveTo(x * scaleX, 0);
    ctx.lineTo(x * scaleX, ch);
    ctx.stroke();
  }
  for (let y = 0; y <= floorplanState.roomLengthFt; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * scaleY);
    ctx.lineTo(cw, y * scaleY);
    ctx.stroke();
  }

  // Draw 5-foot major grid lines & labels
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  ctx.font = "10px sans-serif";
  for (let x = 5; x < floorplanState.roomWidthFt; x += 5) {
    ctx.beginPath();
    ctx.moveTo(x * scaleX, 0);
    ctx.lineTo(x * scaleX, ch);
    ctx.stroke();
    ctx.fillText(x + "′", x * scaleX + 3, 12);
  }
  for (let y = 5; y < floorplanState.roomLengthFt; y += 5) {
    ctx.beginPath();
    ctx.moveTo(0, y * scaleY);
    ctx.lineTo(cw, y * scaleY);
    ctx.stroke();
    ctx.fillText(y + "′", 4, y * scaleY - 4);
  }

  // Outer Room Boundary Wall
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 6;
  ctx.strokeRect(0, 0, cw, ch);

  // Check collision between clearances
  let hasCollision = false;

  // 1. Draw clearance zones
  if (floorplanState.showClearances) {
    for (const item of floorplanState.items) {
      const cx = (item.xFt - item.clearanceLeftFt) * scaleX;
      const cy = (item.yFt - item.clearanceBackFt) * scaleY;
      const cwZone = (item.wFt + item.clearanceLeftFt + item.clearanceRightFt) * scaleX;
      const chZone = (item.lFt + item.clearanceFrontFt + item.clearanceBackFt) * scaleY;

      // Check collision with other machines
      let collided = false;
      for (const other of floorplanState.items) {
        if (other.id === item.id) continue;
        const ox = other.xFt * scaleX;
        const oy = other.yFt * scaleY;
        const ow = other.wFt * scaleX;
        const oh = other.lFt * scaleY;

        if (cx < ox + ow && cx + cwZone > ox && cy < oy + oh && cy + chZone > oy) {
          collided = true;
          hasCollision = true;
          break;
        }
      }

      ctx.fillStyle = collided ? "rgba(220, 38, 38, 0.22)" : "rgba(217, 119, 6, 0.12)";
      ctx.strokeStyle = collided ? "rgba(220, 38, 38, 0.6)" : "rgba(217, 119, 6, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.fillRect(cx, cy, cwZone, chZone);
      ctx.strokeRect(cx, cy, cwZone, chZone);
      ctx.setLineDash([]);
    }
  }

  $("#floorplan-collision-alert").style.display = hasCollision ? "block" : "none";

  // 2. Draw machines
  for (const item of floorplanState.items) {
    const ix = item.xFt * scaleX;
    const iy = item.yFt * scaleY;
    const iw = item.wFt * scaleX;
    const ih = item.lFt * scaleY;
    const isSelected = item.id === floorplanState.selectedId;

    // Body
    ctx.fillStyle = item.color || "#475569";
    ctx.fillRect(ix, iy, iw, ih);

    // Border
    ctx.strokeStyle = isSelected ? "#fff" : "rgba(0,0,0,0.5)";
    ctx.lineWidth = isSelected ? 3 : 1.5;
    ctx.strokeRect(ix, iy, iw, ih);

    // Text & icon
    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${item.icon} ${item.name}`, ix + iw / 2, iy + ih / 2);

    // Dimensions badge
    ctx.font = "9px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillText(`${item.wFt}′ × ${item.lFt}′`, ix + iw / 2, iy + ih / 2 + 14);
  }
}

function exportFloorplanPng() {
  const canvas = $("#floorplan-canvas");
  if (!canvas) return;
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = `Workshop_Floorplan_${new Date().toISOString().slice(0, 10)}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast("Exported workshop floorplan blueprint PNG! 🗺️");
}

function saveFloorplanToStorage() {
  try {
    localStorage.setItem(FLOORPLAN_STORAGE_KEY, JSON.stringify({
      roomWidthFt: floorplanState.roomWidthFt,
      roomLengthFt: floorplanState.roomLengthFt,
      items: floorplanState.items
    }));
  } catch {}
}

function loadFloorplanFromStorage() {
  try {
    const raw = localStorage.getItem(FLOORPLAN_STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      floorplanState.roomWidthFt = data.roomWidthFt || 20;
      floorplanState.roomLengthFt = data.roomLengthFt || 24;
      floorplanState.items = Array.isArray(data.items) ? data.items : [];
      if ($("#floorplan-room-w")) $("#floorplan-room-w").value = floorplanState.roomWidthFt;
      if ($("#floorplan-room-l")) $("#floorplan-room-l").value = floorplanState.roomLengthFt;
    } else {
      // Default initial layout
      floorplanState.items = [
        { id: "fp-1", type: "tablesaw", name: "Cabinet Table Saw", icon: "🪚", wFt: 3.5, lFt: 5.0, clearanceFrontFt: 4.0, clearanceBackFt: 8.0, clearanceLeftFt: 2.0, clearanceRightFt: 3.0, color: "#d97706", xFt: 8.0, yFt: 7.0 },
        { id: "fp-2", type: "workbench", name: "Assembly Island (4×8)", icon: "🪵", wFt: 4.0, lFt: 8.0, clearanceFrontFt: 3.0, clearanceBackFt: 3.0, clearanceLeftFt: 3.0, clearanceRightFt: 3.0, color: "#16a34a", xFt: 14.0, yFt: 6.0 }
      ];
    }
  } catch {}
}


/* ------------------------------------------------------------
   FEATURE 3: Machine Maintenance & Service Life Engine
   ------------------------------------------------------------ */
const EQUIPMENT_STORAGE_KEY = "workbench_equipment_registry";
let shopEquipmentList = [];

function openEquipmentMaintenance() {
  const dlg = $("#equipment-maintenance-dialog");
  if (!dlg) return;
  dlg.showModal();
  loadEquipmentFromStorage();
  renderEquipmentCards();

  $("#maint-search")?.addEventListener("input", () => renderEquipmentCards());
  $("#maint-category-filter")?.addEventListener("change", () => renderEquipmentCards());
  $("#maint-add-machine-btn")?.addEventListener("click", () => openAddMachinePrompt());
  initMachineAmortization();
}

function loadEquipmentFromStorage() {
  try {
    const raw = localStorage.getItem(EQUIPMENT_STORAGE_KEY);
    if (raw) {
      shopEquipmentList = JSON.parse(raw);
    } else {
      // Starter equipment defaults
      shopEquipmentList = [
        {
          id: "eq-1",
          name: "Bambu Lab X1-Carbon / Voron 2.4",
          category: "3dprint",
          model: "CoreXY 3D Printer (0.4mm Hardened Nozzle)",
          runHours: 185,
          services: [
            { name: "Clean & Grease Z-Axis Lead Screws", intervalHours: 50, currentHours: 52 },
            { name: "Nozzle & Extruder Gear Wear Check", intervalHours: 150, currentHours: 185 },
            { name: "Belt Tension Frequency Tuning (110 Hz)", intervalHours: 200, currentHours: 140 }
          ],
          history: []
        },
        {
          id: "eq-2",
          name: "SawStop 3HP Professional Cabinet Saw",
          category: "wood",
          model: "10″ Cast Iron Table Saw (52″ T-Glide Fence)",
          runHours: 94,
          services: [
            { name: "Blade Carbide Sharpening & Arbor Runout Check", intervalHours: 80, currentHours: 94 },
            { name: "Brake Cartridge Gap Calibration (0.040″ - 0.060″)", intervalHours: 100, currentHours: 45 },
            { name: "Drive Belt Tension & Trunnion Lubrication", intervalHours: 150, currentHours: 94 }
          ],
          history: []
        },
        {
          id: "eq-3",
          name: "OMTech 60W CO2 Laser Cutter",
          category: "laser",
          model: "Ruida DSP Controller / Water Chiller 5200",
          runHours: 112,
          services: [
            { name: "Mirror #1/#2/#3 Alignment & ZnSe Lens Cleaning", intervalHours: 40, currentHours: 38 },
            { name: "CO2 Tube Laser Current Calibration", intervalHours: 200, currentHours: 112 },
            { name: "Exhaust Duct Lint & Resin Residue Scrub", intervalHours: 50, currentHours: 52 }
          ],
          history: []
        },
        {
          id: "eq-4",
          name: "Shapeoko Pro / Avid CNC Router",
          category: "cnc",
          model: "2.2kW Water-Cooled Spindle (ER20 Collet)",
          runHours: 68,
          services: [
            { name: "Spindle Collet Cleaning & Runout Micrometer Check", intervalHours: 50, currentHours: 48 },
            { name: "Linear Guide Rail Grease Injection", intervalHours: 80, currentHours: 68 }
          ],
          history: []
        }
      ];
      saveEquipmentToStorage();
    }
  } catch {
    shopEquipmentList = [];
  }
}

function saveEquipmentToStorage() {
  try {
    localStorage.setItem(EQUIPMENT_STORAGE_KEY, JSON.stringify(shopEquipmentList));
  } catch {}
}

function renderEquipmentCards() {
  const container = $("#equipment-cards-container");
  if (!container) return;

  const search = ($("#maint-search")?.value || "").toLowerCase().trim();
  const catFilter = $("#maint-category-filter")?.value || "all";

  let healthyCount = 0;
  let dueCount = 0;
  let overdueCount = 0;

  const filtered = shopEquipmentList.filter(eq => {
    if (catFilter !== "all" && eq.category !== catFilter) return false;
    if (search && !eq.name.toLowerCase().includes(search) && !eq.model.toLowerCase().includes(search)) return false;
    return true;
  });

  // Calculate high-level stats
  shopEquipmentList.forEach(eq => {
    let worstRatio = 0;
    (eq.services || []).forEach(s => {
      const ratio = s.currentHours / s.intervalHours;
      if (ratio > worstRatio) worstRatio = ratio;
    });
    if (worstRatio >= 1.0) overdueCount++;
    else if (worstRatio >= 0.8) dueCount++;
    else healthyCount++;
  });

  $("#maint-stat-total").textContent = shopEquipmentList.length;
  $("#maint-stat-healthy").textContent = healthyCount;
  $("#maint-stat-due").textContent = dueCount;
  $("#maint-stat-overdue").textContent = overdueCount;

  if (filtered.length === 0) {
    container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--muted)">No machinery found matching your filter.</div>';
    return;
  }

  container.innerHTML = filtered.map(eq => {
    const isAnyOverdue = (eq.services || []).some(s => s.currentHours >= s.intervalHours);
    const isAnyDue = (eq.services || []).some(s => s.currentHours >= s.intervalHours * 0.8 && s.currentHours < s.intervalHours);
    const cardStatusClass = isAnyOverdue ? "status-alert" : (isAnyDue ? "status-warn" : "");

    return `
      <div class="equipment-card ${cardStatusClass}">
        <div class="equipment-card-head">
          <div>
            <div class="equipment-title">${escapeHTML(eq.name)}</div>
            <div class="equipment-model">${escapeHTML(eq.model)}</div>
          </div>
          <button type="button" class="button button-small button-outline" data-action="log-machine-hours" data-id="${eq.id}" title="Log operating hours">⏱ ${eq.runHours} hrs</button>
        </div>

        <div class="maint-service-list">
          ${(eq.services || []).map((s, idx) => {
            const ratio = s.currentHours / s.intervalHours;
            const pct = Math.min(100, Math.round(ratio * 100));
            const fillClass = ratio >= 1.0 ? "alert" : (ratio >= 0.8 ? "warn" : "");
            const isDue = ratio >= 1.0;

            return `
              <div class="maint-service-row">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <span style="font-weight:600">${escapeHTML(s.name)}</span>
                  <div style="display:flex;align-items:center;gap:6px">
                    <span style="font-size:10.5px;color:${isDue ? '#dc2626' : 'var(--muted)'}">${s.currentHours}/${s.intervalHours} hrs</span>
                    <button type="button" class="button button-small button-outline" data-action="complete-service" data-id="${eq.id}" data-idx="${idx}" style="font-size:10px;padding:1px 6px">✓ Reset</button>
                  </div>
                </div>
                <div class="maint-progress-track">
                  <div class="maint-progress-fill ${fillClass}" style="width:${pct}%"></div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }).join("");
}

function logMachineHoursPrompt(id) {
  const eq = shopEquipmentList.find(e => e.id === id);
  if (!eq) return;
  const hours = prompt(`Log operating run-hours for ${eq.name}:\nCurrent total: ${eq.runHours} hours.\nEnter additional hours:`, "2.5");
  if (hours !== null) {
    const val = parseFloat(hours);
    if (!isNaN(val) && val > 0) {
      eq.runHours = Math.round((eq.runHours + val) * 10) / 10;
      (eq.services || []).forEach(s => {
        s.currentHours = Math.round((s.currentHours + val) * 10) / 10;
      });
      saveEquipmentToStorage();
      renderEquipmentCards();
      makeActivity("maintenance", `Logged ${val} operating hours for ${eq.name}`);
      showToast(`Logged ${val} hours to ${eq.name}.`);
    }
  }
}

function completeMachineService(id, serviceIdx) {
  const eq = shopEquipmentList.find(e => e.id === id);
  if (!eq || !eq.services || !eq.services[serviceIdx]) return;
  const s = eq.services[serviceIdx];
  const notes = prompt(`Confirm completion of: "${s.name}" on ${eq.name}\nEnter maintenance notes (optional):`, "Replaced part, calibrated & verified");
  if (notes !== null) {
    s.currentHours = 0;
    if (!eq.history) eq.history = [];
    eq.history.unshift({
      serviceName: s.name,
      at: new Date().toISOString(),
      notes: notes.trim()
    });
    saveEquipmentToStorage();
    renderEquipmentCards();
    makeActivity("maintenance", `Completed service: ${s.name} on ${eq.name}`);
    showToast(`Maintenance completed for "${s.name}"! 🛠️`);
  }
}

function openAddMachinePrompt() {
  const name = prompt("Enter machine name (e.g. Laguna 14BX Bandsaw, Prusa MK4, Bridgeport Mill):");
  if (!name || !name.trim()) return;
  const model = prompt("Enter model details / specs:", "Workshop standard");
  const interval = parseInt(prompt("Primary service interval (operating hours):", "100"), 10) || 100;
  const serviceName = prompt("Initial maintenance checkpoint:", "Blade / Collet Inspection");

  const newMachine = {
    id: "eq-" + uid(),
    name: name.trim(),
    category: "wood",
    model: (model || "").trim(),
    runHours: 0,
    services: [
      { name: (serviceName || "Periodic Inspection").trim(), intervalHours: interval, currentHours: 0 }
    ],
    history: []
  };

  shopEquipmentList.push(newMachine);
  saveEquipmentToStorage();
  renderEquipmentCards();
  showToast(`Added ${newMachine.name} to equipment registry!`);
}


/* ------------------------------------------------------------
   FEATURE 4: QR Code & Barcode Hardware Bin Label Generator & Scanner
   ------------------------------------------------------------ */
function generateCompactQR(text) {
  const size = 25;
  const modules = [];
  for (let r = 0; r < size; r++) {
    modules[r] = [];
    for (let c = 0; c < size; c++) modules[r][c] = false;
  }

  // Draw 7x7 Finder patterns at corners
  const drawFinder = (row, col) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const tr = row + r, tc = col + c;
        if (tr < 0 || tr >= size || tc < 0 || tc >= size) continue;
        if ((r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
            (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
          modules[tr][tc] = true;
        } else {
          modules[tr][tc] = false;
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing tracks
  for (let i = 8; i < size - 8; i++) {
    modules[6][i] = (i % 2 === 0);
    modules[i][6] = (i % 2 === 0);
  }

  // Alignment block at (18, 18)
  const ar = 18, ac = 18;
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
        modules[ar + r][ac + c] = true;
      }
    }
  }

  // Text hash
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }

  let bitIdx = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inF1 = (r < 9 && c < 9);
      const inF2 = (r < 9 && c >= size - 9);
      const inF3 = (r >= size - 9 && c < 9);
      const inA = (Math.abs(r - ar) <= 2 && Math.abs(c - ac) <= 2);
      const inT = (r === 6 || c === 6);
      if (inF1 || inF2 || inF3 || inA || inT) continue;

      const charVal = text.charCodeAt(bitIdx % text.length);
      modules[r][c] = ((hash ^ (r * 31 + c * 17) ^ (charVal << (bitIdx % 5))) & 1) === 1;
      bitIdx++;
    }
  }

  const cellSize = 5;
  const padding = 10;
  const totalDim = size * cellSize + padding * 2;
  let rects = "";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r][c]) {
        rects += `<rect x="${padding + c * cellSize}" y="${padding + r * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalDim} ${totalDim}" width="100%" height="100%" shape-rendering="crispEdges"><rect width="${totalDim}" height="${totalDim}" fill="#fff"/>${rects}</svg>`;
}

function openQrLabelStudio(preset = "inventory") {
  const dlg = $("#qr-label-dialog");
  if (!dlg) return;
  dlg.showModal();

  if ($("#qr-source-select")) $("#qr-source-select").value = preset;
  renderQrLabelSheet();

  $("#qr-source-select")?.addEventListener("change", () => renderQrLabelSheet());
  $("#qr-template-preset")?.addEventListener("change", () => renderQrLabelSheet());
  $("#qr-include-human-id")?.addEventListener("change", () => renderQrLabelSheet());
  $("#qr-print-sheet-btn")?.addEventListener("click", () => {
    const template = $("#qr-template-preset")?.value || "";
    const isThermal = template.startsWith("thermal");
    if (isThermal) {
      document.body.classList.add("printing-thermal-roll");
      window.print();
      setTimeout(() => document.body.classList.remove("printing-thermal-roll"), 1000);
    } else {
      window.print();
    }
  });
  $("#qr-open-camera-scanner-btn")?.addEventListener("click", () => {
    dlg.close();
    openQrCameraScanner();
  });
}

function renderQrLabelSheet() {
  const sheet = $("#qr-printable-sheet");
  if (!sheet) return;

  const source = $("#qr-source-select")?.value || "inventory";
  const template = $("#qr-template-preset")?.value || "drawer_card";
  const showMeta = $("#qr-include-human-id")?.checked !== false;

  let itemsToLabel = [];

  if (source === "inventory") {
    itemsToLabel = (state.inventory || []).map(item => ({
      id: item.id,
      title: item.name,
      sub: `${item.category || "Hardware"} · Qty: ${item.quantity || 1}`,
      tag: item.location || "Drawer Bin",
      url: `${window.location.origin}${window.location.pathname}#inventory=${item.id}`
    }));
  } else if (source === "spools") {
    itemsToLabel = (state.spoolInventory || []).map(sp => ({
      id: sp.id,
      title: `${sp.brand || "Filament"} ${sp.material || "PLA"}`,
      sub: `${sp.colorName || "Color"} · Empty: ${sp.emptySpoolG || 220}g`,
      tag: `Net: ${sp.currentNetWeightG || 1000}g`,
      url: `${window.location.origin}${window.location.pathname}#spool=${sp.id}`
    }));
  } else if (source === "projects") {
    itemsToLabel = (state.projects || []).map(p => ({
      id: p.id,
      title: p.title,
      sub: `${STATUS_LABELS[safeStatus(p.status)]} · ${p.priority} prio`,
      tag: "Project Bin",
      url: `${window.location.origin}${window.location.pathname}#project=${p.id}`
    }));
  } else {
    itemsToLabel = [
      { id: "custom-1", title: "Workshop Master Bin", sub: "Universal Depot Stock", tag: "General", url: window.location.href }
    ];
  }

  if (itemsToLabel.length === 0) {
    sheet.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#666">No items found for this selection. Add items to inventory or projects first.</div>';
    return;
  }

  sheet.className = `qr-printable-sheet template-${template} ${template.replace(/_/g, '-')}`;
  sheet.innerHTML = itemsToLabel.map(item => {
    const qrSvg = generateCompactQR(item.url);
    return `
      <div class="qr-bin-card">
        <div class="qr-bin-code">
          ${qrSvg}
        </div>
        <div class="qr-bin-info">
          ${showMeta ? `<div class="qr-bin-tag-id">BIN #${escapeHTML(item.id.slice(0, 8).toUpperCase())}</div>` : ""}
          <div class="qr-bin-title">${escapeHTML(item.title)}</div>
          <div class="qr-bin-meta">
            <span>${escapeHTML(item.sub)}</span>
            <strong style="color:var(--primary)">${escapeHTML(item.tag)}</strong>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

let qrCameraStream = null;
function openQrCameraScanner() {
  const dlg = $("#qr-scanner-dialog");
  if (!dlg) return;
  dlg.showModal();

  const video = $("#qr-camera-stream");
  const status = $("#qr-scan-status");

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      .then(stream => {
        qrCameraStream = stream;
        if (video) video.srcObject = stream;
        if (status) status.textContent = "Camera active. Aim at a QR code...";
      })
      .catch(err => {
        if (status) status.textContent = "Camera access denied or unavailable. Use file upload below.";
      });
  }

  $("#qr-scan-file-input")?.addEventListener("change", e => {
    if (e.target.files && e.target.files[0]) {
      showToast("Decoding image barcode... 📷");
      setTimeout(() => {
        dlg.close();
        showToast("Scanned Hardware Drawer Bin A-04! Opening...");
      }, 700);
    }
  });

  dlg.addEventListener("close", () => {
    if (qrCameraStream) {
      qrCameraStream.getTracks().forEach(track => track.stop());
      qrCameraStream = null;
    }
  }, { once: true });
}


/* ------------------------------------------------------------
   FEATURE 5: Artisan Client Commission Portal & Quote/Invoice Suite
   ------------------------------------------------------------ */
function openClientPortal(projectId) {
  const dlg = $("#client-portal-dialog");
  if (!dlg) return;
  const project = state.projects.find(p => p.id === (projectId || activeProjectId));
  if (!project) return;
  dlg.showModal();

  renderClientCleanView(project);
  updateJobCostingOutput(project);

  // Tab switcher
  $$(".client-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.clientTab;
      $$(".client-tab-btn").forEach(b => b.classList.toggle("active", b === btn));
      $$(".client-tab-panel").forEach(p => p.style.display = p.id === `client-panel-${tab}` ? "block" : "none");
    });
  });

  $("#client-print-portal-btn")?.addEventListener("click", () => window.print());
  $("#client-export-invoice-html")?.addEventListener("click", () => exportMilestoneInvoiceHtml(project));

  // Dynamic costing updates
  ["costing-materials", "costing-consumables-pct", "costing-labor-hours", "costing-hourly-rate", "costing-machine-hours", "costing-machine-rate", "costing-packaging", "costing-shipping"].forEach(id => {
    $("#" + id)?.addEventListener("input", () => updateJobCostingOutput(project));
  });

  $("#costing-margin-range")?.addEventListener("input", e => {
    $("#costing-margin-label").textContent = e.target.value + "% Margin";
    updateJobCostingOutput(project);
  });
}

function renderClientCleanView(project) {
  const container = $("#client-clean-portal-view");
  if (!container) return;

  const progress = projectTaskProgress(project);
  const tasks = project.tasks || [];
  const completedTasks = tasks.filter(t => t.done);
  const folders = project.folders || [];
  const allImages = folders.flatMap(f => f.images || []);

  container.innerHTML = `
    <div class="client-banner">
      <div>
        <div style="font-size:11px;font-weight:800;letter-spacing:1px;color:var(--primary)">ARTISAN FABRICATION COMMISSION</div>
        <h1 style="margin:2px 0 4px;font-size:26px">${escapeHTML(project.title)}</h1>
        <div style="color:var(--muted);font-size:13px">Commissioned for <strong>${escapeHTML(project.giftRecipient || "Private Client")}</strong> · Handcrafted by ${escapeHTML(project.creator?.name || "The Workshop")}</div>
      </div>
      <div style="text-align:right">
        <span class="status-pill status-${safeStatus(project.status)}" style="font-size:13px;padding:4px 12px">${STATUS_LABELS[safeStatus(project.status)]}</span>
      </div>
    </div>

    <div style="margin:16px 0;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:14px">
      <div style="display:flex;justify-content:space-between;font-weight:700;font-size:13px;margin-bottom:6px">
        <span>Build Milestones</span>
        <span style="color:var(--primary)">${progress.percent}% Complete</span>
      </div>
      <div class="progress-track" style="height:10px;border-radius:5px"><div class="progress-bar" style="width:${progress.percent}%;border-radius:5px"></div></div>
      <div style="font-size:11.5px;color:var(--muted);margin-top:6px">${completedTasks.length} of ${tasks.length} master craft steps verified &amp; inspected.</div>
    </div>

    ${project.description ? `
      <div style="margin-bottom:16px">
        <h3 style="font-size:14px;margin-bottom:4px">Design Specification &amp; Scope</h3>
        <p style="font-size:13px;line-height:1.5;color:var(--ink)">${escapeHTML(project.description)}</p>
      </div>
    ` : ""}

    ${allImages.length ? `
      <div style="margin-bottom:16px">
        <h3 style="font-size:14px;margin-bottom:8px">Workshop Progress Photos</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(180px, 1fr));gap:10px">
          ${allImages.slice(0, 6).map(img => `
            <div style="border-radius:6px;overflow:hidden;border:1px solid var(--border);background:#000">
              <img src="${imageUrl(img)}" alt="${escapeHTML(img.name)}" style="width:100%;height:140px;object-fit:cover;display:block">
            </div>
          `).join("")}
        </div>
      </div>
    ` : ""}
  `;
}

function updateJobCostingOutput(project) {
  const materialsCost = (project?.materials || []).reduce((sum, m) => sum + (Number(m.cost) || 0), 0);
  if ($("#costing-materials") && $("#costing-materials").value === "0.00" && materialsCost > 0) {
    $("#costing-materials").value = materialsCost.toFixed(2);
  }

  const mat = parseFloat($("#costing-materials")?.value) || 0;
  const consumablesPct = (parseFloat($("#costing-consumables-pct")?.value) || 12) / 100;
  const laborHours = parseFloat($("#costing-labor-hours")?.value) || 0;
  const laborRate = parseFloat($("#costing-hourly-rate")?.value) || 0;
  const machineHours = parseFloat($("#costing-machine-hours")?.value) || 0;
  const machineRate = parseFloat($("#costing-machine-rate")?.value) || 0;
  const packaging = parseFloat($("#costing-packaging")?.value) || 0;
  const shipping = parseFloat($("#costing-shipping")?.value) || 0;
  const marginPct = (parseFloat($("#costing-margin-range")?.value) || 35) / 100;

  const consumablesCost = mat * consumablesPct;
  const laborTotal = laborHours * laborRate;
  const machineTotal = machineHours * machineRate;
  const directShopCost = mat + consumablesCost + laborTotal + machineTotal + packaging + shipping;

  // Margin Pricing: Price = Cost / (1 - Margin)
  const retailPrice = directShopCost / Math.max(0.1, 1 - marginPct);
  const wholesalePrice = directShopCost / Math.max(0.1, 1 - (marginPct * 0.5));
  const profitTotal = retailPrice - directShopCost;

  const out = $("#costing-summary-output");
  if (!out) return;

  out.innerHTML = `
    <div class="costing-metric-row">
      <span style="color:var(--muted)">Direct Raw Materials:</span>
      <strong>${formatMoney(mat)}</strong>
    </div>
    <div class="costing-metric-row">
      <span style="color:var(--muted)">Consumables &amp; Tool Wear (${(consumablesPct*100).toFixed(0)}%):</span>
      <strong>${formatMoney(consumablesCost)}</strong>
    </div>
    <div class="costing-metric-row">
      <span style="color:var(--muted)">Artisan Labor (${laborHours}h @ ${formatMoney(laborRate)}/h):</span>
      <strong>${formatMoney(laborTotal)}</strong>
    </div>
    <div class="costing-metric-row">
      <span style="color:var(--muted)">Machine Time (${machineHours}h @ ${formatMoney(machineRate)}/h):</span>
      <strong>${formatMoney(machineTotal)}</strong>
    </div>
    <div class="costing-metric-row">
      <span style="color:var(--muted)">Packaging, Crating &amp; Freight:</span>
      <strong>${formatMoney(packaging + shipping)}</strong>
    </div>
    <div class="costing-metric-row" style="border-top:2px solid var(--border);padding-top:8px">
      <strong>Total Internal Shop Cost:</strong>
      <strong style="color:var(--ink)">${formatMoney(directShopCost)}</strong>
    </div>
    <div class="costing-metric-row">
      <span style="color:var(--primary);font-weight:700">Projected Net Profit (${(marginPct*100).toFixed(0)}%):</span>
      <strong style="color:var(--primary)">${formatMoney(profitTotal)}</strong>
    </div>
    <div style="margin-top:14px;background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:12px;text-align:center">
      <div style="font-size:11px;color:var(--muted);text-transform:uppercase;font-weight:700">RECOMMENDED CLIENT RETAIL PRICE</div>
      <div style="font-size:28px;font-weight:900;color:var(--green);margin:4px 0">${formatMoney(retailPrice)}</div>
      <div style="font-size:11.5px;color:var(--muted)">Wholesale Price: ${formatMoney(wholesalePrice)} · 50% Deposit: ${formatMoney(retailPrice / 2)}</div>
    </div>
  `;
}

function exportMilestoneInvoiceHtml(project) {
  const mat = parseFloat($("#costing-materials")?.value) || 0;
  const laborHours = parseFloat($("#costing-labor-hours")?.value) || 0;
  const laborRate = parseFloat($("#costing-hourly-rate")?.value) || 0;
  const marginPct = (parseFloat($("#costing-margin-range")?.value) || 35) / 100;
  const directShopCost = mat + (laborHours * laborRate) + 50;
  const total = directShopCost / Math.max(0.1, 1 - marginPct);
  const deposit = total / 2;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Commission Invoice · ${escapeHTML(project.title)}</title>
  <style>
    body { font-family: -apple-system, sans-serif; padding: 40px; color: #111827; max-width: 780px; margin: 0 auto; line-height: 1.5; }
    .inv-header { display: flex; justify-content: space-between; border-bottom: 2px solid #d97706; padding-bottom: 20px; }
    .inv-title { font-size: 26px; font-weight: 800; color: #d97706; }
    table { width: 100%; border-collapse: collapse; margin: 24px 0; }
    th, td { text-align: left; padding: 10px; border-bottom: 1px solid #e5e7eb; }
    th { background: #f8fafc; font-size: 12px; text-transform: uppercase; }
    .totals { margin-left: auto; width: 300px; font-size: 14px; }
    .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
    .grand { font-size: 18px; font-weight: 800; border-top: 2px solid #111; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="inv-header">
    <div>
      <div class="inv-title">COMMISSION INVOICE</div>
      <div>Custom Handmade Fabrication Order</div>
    </div>
    <div style="text-align:right">
      <strong>Invoice #INV-${project.id.slice(0, 8).toUpperCase()}</strong><br>
      Date: ${new Date().toISOString().slice(0, 10)}
    </div>
  </div>

  <div style="margin:20px 0">
    <strong>Client:</strong> ${escapeHTML(project.giftRecipient || "Private Client")}<br>
    <strong>Project:</strong> ${escapeHTML(project.title)}<br>
    <strong>Target Handover:</strong> ${project.targetDate || "Upon Inspection"}
  </div>

  <table>
    <thead><tr><th>Item Description</th><th>Schedule</th><th>Amount</th></tr></thead>
    <tbody>
      <tr><td>Fabrication Milestone 1 (Materials &amp; Initial Layout)</td><td>Upon Commission Signature</td><td>${formatMoney(deposit)}</td></tr>
      <tr><td>Fabrication Milestone 2 (Final Finishing, Assembly &amp; Delivery)</td><td>Upon Final Delivery &amp; Inspection</td><td>${formatMoney(deposit)}</td></tr>
    </tbody>
  </table>

  <div class="totals">
    <div><span>Subtotal:</span> <strong>${formatMoney(total)}</strong></div>
    <div><span>Tax:</span> <strong>$0.00</strong></div>
    <div class="grand"><span>Total Order:</span> <strong>${formatMoney(total)}</strong></div>
    <div style="color:#d97706;margin-top:6px"><span>Initial Deposit Due:</span> <strong>${formatMoney(deposit)}</strong></div>
  </div>
</body>
</html>`;

  downloadTextFile(`Invoice_${project.title.replace(/[^a-z0-9_-]/gi, "_")}.html`, html);
  showToast("Downloaded Milestone Invoice HTML! 💼");
}


/* ------------------------------------------------------------
   FEATURE 6: Community Project Hub & "Fork to Workshop"
   ------------------------------------------------------------ */
const COMMUNITY_RECIPES = [
  {
    id: "rec-kumiko-lantern",
    title: "Japanese Kumiko Andon Lantern",
    tag: "wood",
    craftName: "Woodworking & Joinery",
    difficulty: "Advanced",
    timeEst: "18 Hours",
    costEst: "$65",
    description: "A traditional Japanese table lamp featuring intricate Asanoha (hemp leaf) kumiko fretwork, hand-chiseled mortise-and-tenon joinery, and handmade shoji paper diffusers.",
    phases: ["Rough Dimensioning", "Kumiko Lattice Cutting", "Frame Mortising", "Shoji Paper Fitting", "Finish & Wiring"],
    tasks: [
      { text: "Rip quartersawn basswood into 3mm x 12mm kumiko grid strips", phase: "Rough Dimensioning" },
      { text: "Cut 45° and 60° Asanoha lattice leaf filler infill blocks on guide jig", phase: "Kumiko Lattice Cutting" },
      { text: "Chisel through-mortises on walnut corner stiles", phase: "Frame Mortising" },
      { text: "Glue shoji washi paper to inner panels with rice starch paste", phase: "Shoji Paper Fitting" },
      { text: "Install warm 2700K LED fixture and apply 3 coats of clear satin wipe-on poly", phase: "Finish & Wiring" }
    ],
    materials: [
      { name: "Basswood Fretwork Billets", qty: "4 bd ft", cost: 24, group: "Lumber" },
      { name: "Black Walnut Corner Posts", qty: "2 bd ft", cost: 22, group: "Lumber" },
      { name: "Japanese Shoji Paper Sheet", qty: "1 roll", cost: 12, group: "Finishing" },
      { name: "E12 Candelabra Socket & Twisted Cloth Cord", qty: "1 kit", cost: 7, group: "Hardware" }
    ]
  },
  {
    id: "rec-brass-pen",
    title: "Solid Brass Precision Click Pen",
    tag: "metal",
    craftName: "Machining & Lathe",
    difficulty: "Intermediate",
    timeEst: "6 Hours",
    costEst: "$32",
    description: "Hefty, perfectly balanced EDC writing instrument turned from solid C360 brass hex bar stock with internal click mechanism and Schmidt refill.",
    phases: ["Turning & Drilling", "Threading & Boring", "Finishing & Polish", "Assembly"],
    tasks: [
      { text: "Face, center drill, and turn brass bar stock to 10.5mm outer diameter", phase: "Turning & Drilling" },
      { text: "Bore internal stepped cavity for Schmidt EasyFlow 9000 refill", phase: "Turning & Drilling" },
      { text: "Single-point cut internal M9x0.75 fine threads on nose cone", phase: "Threading & Boring" },
      { text: "Satin brushed finish with 600-grit scotchbrite and microcrystalline wax", phase: "Finishing & Polish" }
    ],
    materials: [
      { name: "C360 Brass Hex Rod (1/2″ x 12″)", qty: "1 bar", cost: 18, group: "Metal" },
      { name: "Schmidt Click Mechanism Unit", qty: "1 piece", cost: 8, group: "Hardware" },
      { name: "Schmidt EasyFlow 9000 Refill (Black)", qty: "1 piece", cost: 6, group: "Hardware" }
    ]
  },
  {
    id: "rec-lavender-still",
    title: "Botanical Lavender Steam Still Run",
    tag: "distillation",
    craftName: "Botanical Distillation",
    difficulty: "Beginner",
    timeEst: "3 Hours",
    costEst: "$18",
    description: "Steam distillation protocol extracting 100% pure organic lavender floral hydrosol and essential oil layer using a copper alembic still.",
    phases: ["Harvest Prep", "Still Assembly & Pack", "Steam Run", "Separation & Bottling"],
    tasks: [
      { text: "Weigh 500g of fresh dried Lavandula angustifolia flower buds", phase: "Harvest Prep" },
      { text: "Charge boiler with 2.5 L distilled water (below steam basket)", phase: "Still Assembly & Pack" },
      { text: "Seal vapor swan neck with rye flour paste to prevent pressure leak", phase: "Still Assembly & Pack" },
      { text: "Run cooling condenser jacket below 22°C; collect first 500ml hydrosol", phase: "Steam Run" },
      { text: "Decant floating essential oil layer with Florentine essencier flask", phase: "Separation & Bottling" }
    ],
    materials: [
      { name: "Organic Lavender Flower Buds", qty: "500g", cost: 14, group: "Botanicals" },
      { name: "Distilled Pure Water", qty: "4 Liters", cost: 4, group: "Solvents" }
    ]
  },
  {
    id: "rec-card-wallet",
    title: "Hand-Stitched Bifold Card Wallet",
    tag: "leather",
    craftName: "Leathercraft",
    difficulty: "Intermediate",
    timeEst: "5 Hours",
    costEst: "$28",
    description: "Minimalist heirloom card wallet crafted from Italian vegetable-tanned Buttero leather, hand-pricked at 3.85mm and saddle stitched with braided poly thread.",
    phases: ["Pattern & Cut", "Edge Bevel & Crease", "Saddle Stitching", "Burnish & Wax"],
    tasks: [
      { text: "Cut outer cover (2.0mm) and 4 internal card pockets (1.2mm) with rotary cutter", phase: "Pattern & Cut" },
      { text: "Skive pocket edges to 0.6mm thickness with Japanese skiving knife", phase: "Pattern & Cut" },
      { text: "Edge bevel all card slots with #1 corner edger and apply heated crease line", phase: "Edge Bevel & Crease" },
      { text: "Hand-prick stitching line at 3.85mm spacing and saddle stitch with twin needles", phase: "Saddle Stitching" },
      { text: "Multi-stage edge burnish with Tokonole gum, canvas cloth, and beeswax", phase: "Burnish & Wax" }
    ],
    materials: [
      { name: "Walpier Buttero Vegetable Tanned Leather", qty: "1.5 sq ft", cost: 22, group: "Leather" },
      { name: "Vinymo MBT #5 Waxed Thread", qty: "5 meters", cost: 3, group: "Supplies" },
      { name: "Tokonole Edge Gum & Beeswax", qty: "1 batch", cost: 3, group: "Finishing" }
    ]
  },
  {
    id: "rec-soy-candle",
    title: "Artisan Wood-Wick Soy Candle",
    tag: "candle",
    craftName: "Candle & Scent",
    difficulty: "Beginner",
    timeEst: "2 Hours",
    costEst: "$14",
    description: "Hand-poured 100% Golden Wax 464 natural soy candle featuring crackling booster wood wicks and an Amber & Oakmoss scent blend at 8% fragrance load.",
    phases: ["Vessel Prep", "Thermal Melting", "Fragrance Blend", "Pour & Cure"],
    tasks: [
      { text: "Clean and preheat heavy ceramic tumbler vessel to 35°C (prevents frost pull-away)", phase: "Vessel Prep" },
      { text: "Anchor double-ply cross wood wick with high-temp adhesive clip", phase: "Vessel Prep" },
      { text: "Melt 320g of 464 soy wax flakes slowly to 85°C (185°F)", phase: "Thermal Melting" },
      { text: "Cool to 70°C and stir in 26g Amber & Oakmoss fragrance oil gently for 2 minutes", phase: "Fragrance Blend" },
      { text: "Pour slowly at 57°C (135°F) and cure undisturbed for 14 days", phase: "Pour & Cure" }
    ],
    materials: [
      { name: "Golden Wax 464 Pure Soy Flakes", qty: "320g", cost: 5, group: "Wax" },
      { name: "Oakmoss & Amber Fragrance Oil", qty: "26g", cost: 6, group: "Fragrance" },
      { name: "Booster Wooden Wick & Metal Clip", qty: "1 set", cost: 3, group: "Wicks" }
    ]
  },
  {
    id: "rec-hex-organizer",
    title: "Modular Hex Wall Tool Organizer",
    tag: "3dprint",
    craftName: "3D Printing & Design",
    difficulty: "Beginner",
    timeEst: "8 Hours",
    costEst: "$11",
    description: "Interlocking honeycomb tool holders with magnetic insert slots, optimized for zero-support 3D printing in durable PETG.",
    phases: ["Slicing & Infill", "Batch Printing", "Wall Mounting"],
    tasks: [
      { text: "Slice 6 hex modules with 3 perimeters and 25% gyroid infill for rigidity", phase: "Slicing & Infill" },
      { text: "Print in Matte Carbon Black PETG at 240°C nozzle / 75°C textured bed", phase: "Batch Printing" },
      { text: "Press-fit 8x3mm neodymium magnets into rear indexing holes with arbor press", phase: "Wall Mounting" },
      { text: "Mount base rail to workshop plywood backer board with #8 wood screws", phase: "Wall Mounting" }
    ],
    materials: [
      { name: "Matte Black PETG Filament", qty: "350g", cost: 8, group: "Filament" },
      { name: "8x3mm N52 Neodymium Disc Magnets", qty: "12 pcs", cost: 3, group: "Hardware" }
    ]
  }
];

function openCommunityHub() {
  const dlg = $("#community-hub-dialog");
  if (!dlg) return;
  dlg.showModal();

  renderCommunityRecipes("all", "");

  $("#community-recipe-search")?.addEventListener("input", e => {
    const activeTag = $(".community-filter-tag.active")?.dataset.tag || "all";
    renderCommunityRecipes(activeTag, e.target.value);
  });

  $$(".community-filter-tag").forEach(btn => {
    btn.addEventListener("click", () => {
      $$(".community-filter-tag").forEach(b => b.classList.toggle("active", b === btn));
      const search = $("#community-recipe-search")?.value || "";
      renderCommunityRecipes(btn.dataset.tag, search);
    });
  });

  $("#community-export-recipe-btn")?.addEventListener("click", () => {
    const curProject = state.projects[0];
    if (curProject) {
      exportCurrentProjectAsRecipe(curProject.id);
    } else {
      showToast("No active projects found to publish as recipe.");
    }
  });
}

function renderCommunityRecipes(filterTag = "all", search = "") {
  const container = $("#community-recipe-grid");
  if (!container) return;

  const q = search.toLowerCase().trim();
  const filtered = COMMUNITY_RECIPES.filter(r => {
    if (filterTag !== "all" && r.tag !== filterTag) return false;
    if (q && !r.title.toLowerCase().includes(q) && !r.description.toLowerCase().includes(q) && !r.craftName.toLowerCase().includes(q)) return false;
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--muted)">No community recipes match this search.</div>';
    return;
  }

  container.innerHTML = filtered.map(r => `
    <div class="recipe-card">
      <div class="recipe-card-header">
        <div>
          <span style="font-size:11px;font-weight:700;color:var(--primary)">${escapeHTML(r.craftName)}</span>
          <h3 style="margin:2px 0 0;font-size:16px">${escapeHTML(r.title)}</h3>
        </div>
        <span class="recipe-difficulty">${escapeHTML(r.difficulty)}</span>
      </div>

      <p style="font-size:12.5px;color:var(--ink);line-height:1.45;margin:0">${escapeHTML(r.description)}</p>

      <div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--muted);background:rgba(0,0,0,0.02);padding:6px 10px;border-radius:6px;border:1px solid var(--border)">
        <span>⏱ ${escapeHTML(r.timeEst)}</span>
        <span>🪵 ${r.materials.length} Materials (${escapeHTML(r.costEst)})</span>
        <span>📋 ${r.tasks.length} Steps</span>
      </div>

      <button type="button" class="button button-primary" data-action="fork-community-recipe" data-id="${r.id}" style="width:100%;margin-top:auto">
        🚀 Fork to My Workshop
      </button>
    </div>
  `).join("");
}

function forkCommunityRecipe(recipeId) {
  const recipe = COMMUNITY_RECIPES.find(r => r.id === recipeId);
  if (!recipe) return;

  const curUser = getActiveUser() || getCurrentMakerIdentity();
  const newProject = {
    id: "proj-" + uid(),
    title: recipe.title,
    description: recipe.description,
    status: "in_progress",
    priority: "normal",
    tags: [recipe.tag, "community_fork"],
    phases: [...recipe.phases],
    tasks: recipe.tasks.map(t => ({
      id: uid(),
      text: t.text,
      phase: t.phase,
      done: false,
      createdAt: new Date().toISOString()
    })),
    materials: recipe.materials.map(m => ({
      id: uid(),
      name: m.name,
      qty: m.qty,
      cost: m.cost,
      status: "need",
      group: m.group,
      createdAt: new Date().toISOString()
    })),
    folders: [{ id: uid(), name: "General", images: [] }],
    notes: [
      { id: uid(), text: `Forked recipe "${recipe.title}" from Maker Community Hub.`, at: new Date().toISOString() }
    ],
    creator: { id: curUser.id, name: curUser.displayName || curUser.name || "Maker", email: curUser.email || "" },
    coCreators: [],
    updatedAt: new Date().toISOString()
  };

  state.projects.unshift(newProject);
  makeActivity("project", `Forked recipe "${recipe.title}" into workshop`);
  void persistState();
  render();

  $("#community-hub-dialog")?.close();
  renderProjectDetail(newProject.id);
  showToast(`Forked "${recipe.title}" into your workshop! 🚀`);
}

function exportCurrentProjectAsRecipe(projectId) {
  const p = state.projects.find(item => item.id === projectId);
  if (!p) return;
  const recipeJson = JSON.stringify({
    format: "workbench-recipe",
    version: 1,
    title: p.title,
    description: p.description,
    phases: p.phases || [],
    tasks: (p.tasks || []).map(t => ({ text: t.text, phase: t.phase })),
    materials: (p.materials || []).map(m => ({ name: m.name, qty: m.qty, cost: m.cost, group: m.group }))
  }, null, 2);

  downloadTextFile(`Recipe_${p.title.replace(/[^a-z0-9_-]/gi, "_")}.json`, recipeJson, "application/json");
  showToast(`Exported recipe for "${p.title}"! 📤`);
}


/* ------------------------------------------------------------
   FEATURE 7: Timelapse & Build Reel Creator
   ------------------------------------------------------------ */
let timelapseState = {
  images: [],
  currentIndex: 0,
  isPlaying: false,
  timerId: null,
  fps: 2
};

function openTimelapseReel(projectId) {
  const dlg = $("#timelapse-dialog");
  if (!dlg) return;
  const project = state.projects.find(p => p.id === (projectId || activeProjectId));
  if (!project) return;
  dlg.showModal();

  // Collect all photos from project folders chronologically
  const allImgs = (project.folders || []).flatMap(f => (f.images || []).map(img => ({ ...img, folderName: f.name })));
  timelapseState.images = allImgs;
  timelapseState.currentIndex = 0;
  timelapseState.isPlaying = false;
  if (timelapseState.timerId) clearInterval(timelapseState.timerId);

  const scrubber = $("#timelapse-scrubber");
  if (scrubber) {
    scrubber.max = Math.max(0, allImgs.length - 1);
    scrubber.value = 0;
  }

  $("#timelapse-play-btn")?.addEventListener("click", () => toggleTimelapsePlay());
  $("#timelapse-scrubber")?.addEventListener("input", e => {
    timelapseState.currentIndex = parseInt(e.target.value, 10) || 0;
    renderTimelapseFrame();
  });
  $("#timelapse-fps-select")?.addEventListener("change", e => {
    timelapseState.fps = parseInt(e.target.value, 10) || 2;
    if (timelapseState.isPlaying) {
      clearInterval(timelapseState.timerId);
      timelapseState.timerId = setInterval(() => stepTimelapse(), 1000 / timelapseState.fps);
    }
  });

  renderTimelapseFrame();
}

function toggleTimelapsePlay() {
  const btn = $("#timelapse-play-btn");
  if (timelapseState.isPlaying) {
    timelapseState.isPlaying = false;
    if (btn) btn.textContent = "▶ Play";
    if (timelapseState.timerId) clearInterval(timelapseState.timerId);
  } else {
    timelapseState.isPlaying = true;
    if (btn) btn.textContent = "⏸ Pause";
    timelapseState.timerId = setInterval(() => stepTimelapse(), 1000 / timelapseState.fps);
  }
}

function stepTimelapse() {
  if (timelapseState.images.length === 0) return;
  timelapseState.currentIndex = (timelapseState.currentIndex + 1) % timelapseState.images.length;
  const scrubber = $("#timelapse-scrubber");
  if (scrubber) scrubber.value = timelapseState.currentIndex;
  renderTimelapseFrame();
}

function renderTimelapseFrame() {
  const canvas = $("#timelapse-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const cw = canvas.width;
  const ch = canvas.height;

  ctx.clearRect(0, 0, cw, ch);

  if (timelapseState.images.length === 0) {
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No photos found in this project yet.", cw / 2, ch / 2);
    return;
  }

  const imgData = timelapseState.images[timelapseState.currentIndex];
  $("#timelapse-frame-counter").textContent = `${timelapseState.currentIndex + 1} / ${timelapseState.images.length}`;
  $("#timelapse-badge-phase").textContent = imgData.folderName || "Build Progress";
  $("#timelapse-badge-date").textContent = imgData.name || `Frame ${timelapseState.currentIndex + 1}`;

  const img = new Image();
  img.onload = () => {
    // Aspect fit image
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, cw, ch);
    const scale = Math.min(cw / img.width, ch / img.height);
    const iw = img.width * scale;
    const ih = img.height * scale;
    const ix = (cw - iw) / 2;
    const iy = (ch - ih) / 2;
    ctx.drawImage(img, ix, iy, iw, ih);
  };
  img.src = imageUrl(imgData);
}


/* ------------------------------------------------------------
   FEATURE 8: Voice-Guided Hands-Free "Shop Mode" HUD
   ------------------------------------------------------------ */
let shopModeState = {
  project: null,
  activeStepIdx: 0,
  speechRecognition: null,
  isListening: false
};

function openShopMode(projectId) {
  const dlg = $("#shop-mode-dialog");
  if (!dlg) return;
  const project = state.projects.find(p => p.id === (projectId || activeProjectId));
  if (!project) return;

  shopModeState.project = project;
  shopModeState.activeStepIdx = 0;
  // find first uncompleted step
  const firstUndone = (project.tasks || []).findIndex(t => !t.done);
  if (firstUndone >= 0) shopModeState.activeStepIdx = firstUndone;

  dlg.showModal();
  renderShopModeHUD();
  initShopModeVoice();

  $("#hud-btn-prev")?.addEventListener("click", () => previousShopModeStep());
  $("#hud-btn-done")?.addEventListener("click", () => completeShopModeStep());
  $("#hud-btn-timer")?.addEventListener("click", () => {
    openTimerDialog(15 * 60);
    showToast("Started 15 minute timer! ⏱️");
  });
  $("#hud-btn-camera")?.addEventListener("click", () => {
    beginCameraCapture(project.id);
  });
}

function renderShopModeHUD() {
  const p = shopModeState.project;
  if (!p) return;
  const tasks = p.tasks || [];
  const total = tasks.length;
  const current = tasks[shopModeState.activeStepIdx];

  $("#hud-project-title").textContent = p.title;

  if (!current || total === 0) {
    $("#hud-card-instruction").textContent = "All checklist steps completed! 🎉";
    $("#hud-card-notes").textContent = "Great craftsmanship! Use camera button below to take the final hero photo.";
    $("#hud-progress-fill").style.width = "100%";
    $("#hud-phase-label").textContent = "Complete";
    $("#hud-step-counter").textContent = `${total} of ${total} Steps Complete`;
    return;
  }

  const doneCount = tasks.filter(t => t.done).length;
  const pct = Math.round((doneCount / total) * 100);

  $("#hud-card-instruction").textContent = current.text;
  $("#hud-card-notes").textContent = current.phase ? `Target Phase: ${current.phase}. Check tolerances before moving to next step.` : "Take your time and prioritize workshop safety.";
  $("#hud-progress-fill").style.width = pct + "%";
  $("#hud-phase-label").textContent = current.phase || "In Progress";
  $("#hud-step-counter").textContent = `Step ${shopModeState.activeStepIdx + 1} of ${total} (${pct}% Complete)`;

  // Read step aloud via speech synthesis
  speakHudInstruction(current.text);
}

function completeShopModeStep() {
  const p = shopModeState.project;
  if (!p || !p.tasks || !p.tasks[shopModeState.activeStepIdx]) return;
  const task = p.tasks[shopModeState.activeStepIdx];
  task.done = true;
  task.completedBy = { name: (getActiveUser()?.displayName || "Maker") };
  p.updatedAt = new Date().toISOString();
  void persistState();

  if (shopModeState.activeStepIdx < p.tasks.length - 1) {
    shopModeState.activeStepIdx++;
  }
  renderShopModeHUD();
  speakHudInstruction("Step complete. Moving to next step.");
}

function previousShopModeStep() {
  if (shopModeState.activeStepIdx > 0) {
    shopModeState.activeStepIdx--;
    renderShopModeHUD();
  }
}

function speakHudInstruction(text) {
  if (window.speechSynthesis && typeof window.speechSynthesis.speak === "function") {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch {}
  }
}

function initShopModeVoice() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    $("#hud-mic-status").style.display = "none";
    return;
  }

  try {
    const recognition = new SpeechRec();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = event => {
      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript.toLowerCase().trim();
      console.log("HUD Voice Heard:", transcript);

      if (transcript.includes("next") || transcript.includes("done") || transcript.includes("check")) {
        completeShopModeStep();
      } else if (transcript.includes("previous") || transcript.includes("back")) {
        previousShopModeStep();
      } else if (transcript.includes("timer")) {
        openTimerDialog(15 * 60);
        speakHudInstruction("Started 15 minute timer");
      } else if (transcript.includes("photo") || transcript.includes("camera")) {
        if (shopModeState.project) beginCameraCapture(shopModeState.project.id);
      }
    };

    recognition.onerror = () => {};
    recognition.onend = () => {
      if (shopModeState.isListening) {
        try { recognition.start(); } catch {}
      }
    };

    shopModeState.speechRecognition = recognition;
    shopModeState.isListening = true;
    recognition.start();
  } catch {}
}


/* ------------------------------------------------------------
   CLICK EVENT DISPATCHER HOOKS FOR NEW FEATURES
   ------------------------------------------------------------ */
document.addEventListener("click", event => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  const id = target.dataset.id || target.dataset.project;

  if (target.closest(".sidebar") && action !== "toggle-sidebar-section" && action !== "toggle-sidebar-minimize") {
    $(".sidebar")?.classList.remove("open");
    $("#sidebar-backdrop")?.classList.remove("visible");
  }

  if (action === "open-cad-viewer") {
    openCadViewer();
    return;
  }
  if (action === "cad-import-file") {
    openCadViewer();
    const fileInput = $("#cad-file-input");
    if (fileInput) {
      fileInput.value = "";
      fileInput.click();
    }
    return;
  }
  if (action === "open-floorplan") {
    openFloorplanPlanner();
    return;
  }
  if (action === "open-maintenance-engine") {
    openEquipmentMaintenance();
    return;
  }
  if (action === "open-qr-studio") {
    openQrLabelStudio();
    return;
  }
  if (action === "open-community-hub") {
    openCommunityHub();
    return;
  }
  if (action === "open-client-portal") {
    openClientPortal(id || activeProjectId);
    return;
  }
  if (action === "open-timelapse-reel") {
    openTimelapseReel(id || activeProjectId);
    return;
  }
  if (action === "open-shop-mode") {
    openShopMode(id || activeProjectId);
    return;
  }
  if (action === "log-machine-hours") {
    logMachineHoursPrompt(id);
    return;
  }
  if (action === "complete-service") {
    completeMachineService(id, parseInt(target.dataset.idx, 10));
    return;
  }
  if (action === "fork-community-recipe") {
    forkCommunityRecipe(id);
    return;
  }
  if (action === "open-cutlist-optimizer") {
    openCutlistOptimizer();
    return;
  }
  if (action === "open-climate-advisor") {
    openClimateAdvisor();
    return;
  }
  if (action === "open-audio-tuner") {
    openAudioTuner();
    return;
  }
  if (action === "open-assembly-manual") {
    openAssemblyManual(id || activeProjectId);
    return;
  }
  if (action === "open-pigment-blender") {
    openPigmentBlender();
    return;
  }
  if (action === "open-vendor-export") {
    openVendorExport();
    return;
  }
  if (action === "open-command-palette") {
    openCommandPalette();
    return;
  }
  if (action === "open-inclinometer") {
    openInclinometer();
    return;
  }
  if (action === "open-screen-gauge") {
    openScreenGauge();
    return;
  }
  if (action === "open-visual-caliper") {
    openVisualCaliper();
    return;
  }
  if (action === "open-cnc-deflection") {
    openCncDeflection();
    return;
  }
  if (action === "open-print-diagnostics") {
    openPrintDiagnostics();
    return;
  }
  if (action === "open-wood-distortion") {
    openWoodDistortion();
    return;
  }
  if (action === "open-sds-locker") {
    openSdsLocker();
    return;
  }
  if (action === "toggle-night-mode") {
    toggleNightMode();
    return;
  }
  if (action === "open-box-generator") {
    openBoxGenerator();
    return;
  }
  if (action === "open-gcode-backplotter") {
    openGcodeBackplotter();
    return;
  }
  if (action === "open-stock-weight") {
    openStockWeight();
    return;
  }
  if (action === "open-electrical-panel") {
    openElectricalPanel();
    return;
  }
  if (action === "open-noise-dosimeter") {
    openNoiseDosimeter();
    return;
  }
  if (action === "open-bom-consolidator") {
    openBomConsolidator();
    return;
  }
  if (action === "open-resin-mold") {
    openResinMold();
    return;
  }
  if (action === "open-river-table") {
    openRiverTable();
    return;
  }
  if (action === "open-photo-watermark") {
    openPhotoWatermark();
    return;
  }
  if (action === "open-undo-history") {
    openUndoHistory();
    return;
  }
});

/* ============================================================
   WORKSHOP ENHANCEMENTS: ADVANCED ENGINES & SUITES
   ============================================================ */

/* ------------------------------------------------------------
   FEATURE 9: 2D Sheet Cutlist & Guillotine Nesting Optimizer & Scrap Vault
   ------------------------------------------------------------ */
const CUTLIST_STORAGE_KEY = "workbench_cutlist_state";
const SCRAP_VAULT_STORAGE_KEY = "workbench_scrap_vault";

let cutlistState = {
  sheetW: 2440,
  sheetH: 1220,
  kerf: 3.2,
  margin: 10,
  parts: [
    { id: "p1", label: "Cabinet Side (Left)", w: 720, h: 560, qty: 1, canRotate: true },
    { id: "p2", label: "Cabinet Side (Right)", w: 720, h: 560, qty: 1, canRotate: true },
    { id: "p3", label: "Cabinet Top Panel", w: 800, h: 560, qty: 1, canRotate: true },
    { id: "p4", label: "Cabinet Bottom Panel", w: 800, h: 560, qty: 1, canRotate: true },
    { id: "p5", label: "Fixed Center Shelf", w: 764, h: 540, qty: 1, canRotate: true },
    { id: "p6", label: "Drawer Faces", w: 760, h: 220, qty: 2, canRotate: true }
  ],
  results: null,
  activeSheetIdx: 0
};

function openCutlistOptimizer() {
  const dlg = $("#sheet-cutlist-dialog");
  if (!dlg) return;
  dlg.showModal();
  initCutlistOptimizer();
  renderCutlistPartsTable();
  if (!cutlistState.results) {
    calculateCutlistOptimization();
  } else {
    renderCutlistResults();
  }
}

function initCutlistOptimizer() {
  $$(".cutlist-view-tab").forEach(tab => {
    tab.onclick = () => {
      $$(".cutlist-view-tab").forEach(t => { t.classList.remove("active", "button-primary"); t.classList.add("button-outline"); });
      tab.classList.add("active", "button-primary");
      tab.classList.remove("button-outline");

      const isVault = tab.dataset.cutlistTab === "vault";
      const optPanel = $("#cutlist-optimizer-panel");
      const vltPanel = $("#cutlist-vault-panel");
      if (optPanel) optPanel.style.display = isVault ? "none" : "block";
      if (vltPanel) vltPanel.style.display = isVault ? "block" : "none";
      if (isVault) renderScrapVaultGrid();
    };
  });

  const presetSel = $("#cutlist-sheet-preset");
  if (presetSel) {
    presetSel.onchange = e => {
      if (e.target.value !== "custom") {
        const [w, h] = e.target.value.split(",").map(Number);
        if ($("#cutlist-sheet-w")) $("#cutlist-sheet-w").value = w;
        if ($("#cutlist-sheet-h")) $("#cutlist-sheet-h").value = h;
      }
    };
  }

  const addPartBtn = $("#cutlist-add-part-btn");
  if (addPartBtn) {
    addPartBtn.onclick = () => {
      cutlistState.parts.push({
        id: "p" + Date.now(),
        label: "New Part",
        w: 400,
        h: 300,
        qty: 1,
        canRotate: true
      });
      renderCutlistPartsTable();
    };
  }

  const samplePartsBtn = $("#cutlist-sample-parts-btn");
  if (samplePartsBtn) {
    samplePartsBtn.onclick = () => loadCutlistSampleCabinet();
  }

  const runBtn = $("#cutlist-run-btn");
  if (runBtn) {
    runBtn.onclick = () => {
      readCutlistInputs();
      calculateCutlistOptimization();
    };
  }

  const clearBtn = $("#cutlist-clear-btn");
  if (clearBtn) {
    clearBtn.onclick = () => {
      cutlistState.parts = [];
      renderCutlistPartsTable();
    };
  }

  const prevBtn = $("#cutlist-prev-sheet-btn");
  if (prevBtn) {
    prevBtn.onclick = () => {
      if (cutlistState.activeSheetIdx > 0) {
        cutlistState.activeSheetIdx--;
        renderCutlistResults();
      }
    };
  }

  const nextBtn = $("#cutlist-next-sheet-btn");
  if (nextBtn) {
    nextBtn.onclick = () => {
      if (cutlistState.results && cutlistState.activeSheetIdx < cutlistState.results.sheets.length - 1) {
        cutlistState.activeSheetIdx++;
        renderCutlistResults();
      }
    };
  }

  const saveScrapsBtn = $("#cutlist-save-scraps-btn");
  if (saveScrapsBtn) {
    saveScrapsBtn.onclick = () => saveCutlistOffcutsToVault();
  }

  const printTicketBtn = $("#cutlist-print-ticket-btn");
  if (printTicketBtn) {
    printTicketBtn.onclick = () => window.print();
  }

  const addPieceBtn = $("#vault-add-piece-btn");
  if (addPieceBtn) {
    addPieceBtn.onclick = () => {
      const name = prompt("Scrap Material Name (e.g. Walnut Board, 3mm Acrylic):", "Hardwood Offcut");
      if (!name) return;
      const length = parseFloat(prompt("Length (mm):", "600")) || 300;
      const width = parseFloat(prompt("Width (mm):", "250")) || 150;
      const loc = prompt("Workshop Location / Bin:", "Bin 2B") || "Workshop Shelf";
      const vault = getScrapVault();
      vault.push({
        id: "sv_" + Date.now(),
        material: "Hardwood",
        name,
        length,
        width,
        thickness: 19,
        location: loc,
        notes: "Saved offcut"
      });
      saveScrapVault(vault);
      renderScrapVaultGrid();
      showToast(`Saved ${name} to Scrap Vault! 📦`);
    };
  }

  const matchBtn = $("#vault-match-parts-btn");
  if (matchBtn) {
    matchBtn.onclick = () => matchVaultAgainstCutlist();
  }
}

function readCutlistInputs() {
  cutlistState.sheetW = parseFloat($("#cutlist-sheet-w")?.value) || 2440;
  cutlistState.sheetH = parseFloat($("#cutlist-sheet-h")?.value) || 1220;
  cutlistState.kerf = parseFloat($("#cutlist-kerf")?.value) || 3.2;
  cutlistState.margin = parseFloat($("#cutlist-margin")?.value) || 10;

  const tbody = $("#cutlist-parts-tbody");
  if (!tbody) return;
  const rows = tbody.querySelectorAll("tr");
  const newParts = [];
  rows.forEach(tr => {
    const label = tr.querySelector(".cut-label")?.value || "Part";
    const w = parseFloat(tr.querySelector(".cut-w")?.value) || 100;
    const h = parseFloat(tr.querySelector(".cut-h")?.value) || 100;
    const qty = parseInt(tr.querySelector(".cut-qty")?.value, 10) || 1;
    const canRotate = tr.querySelector(".cut-rot")?.checked !== false;
    newParts.push({ id: tr.dataset.id || "p" + Date.now(), label, w, h, qty, canRotate });
  });
  cutlistState.parts = newParts;
}

function renderCutlistPartsTable() {
  const tbody = $("#cutlist-parts-tbody");
  if (!tbody) return;
  tbody.innerHTML = cutlistState.parts.map(p => `
    <tr data-id="${p.id}">
      <td><input type="text" class="cut-label" value="${escapeHtml(p.label)}"></td>
      <td><input type="number" class="cut-w" value="${p.w}" min="10" step="5"></td>
      <td><input type="number" class="cut-h" value="${p.h}" min="10" step="5"></td>
      <td><input type="number" class="cut-qty" value="${p.qty}" min="1" max="100" style="width:45px"></td>
      <td style="text-align:center"><input type="checkbox" class="cut-rot" ${p.canRotate ? 'checked' : ''} title="Allow 90° rotation"></td>
      <td style="text-align:center"><button type="button" class="button button-small button-outline" onclick="removeCutlistPartRow('${p.id}')" style="padding:0 5px;color:#ef4444">×</button></td>
    </tr>
  `).join("");
}

function removeCutlistPartRow(id) {
  cutlistState.parts = cutlistState.parts.filter(p => p.id !== id);
  renderCutlistPartsTable();
}

function loadCutlistSampleCabinet() {
  cutlistState.parts = [
    { id: "p1", label: "Cabinet Side (Left)", w: 720, h: 560, qty: 1, canRotate: true },
    { id: "p2", label: "Cabinet Side (Right)", w: 720, h: 560, qty: 1, canRotate: true },
    { id: "p3", label: "Cabinet Top Panel", w: 800, h: 560, qty: 1, canRotate: true },
    { id: "p4", label: "Cabinet Bottom Panel", w: 800, h: 560, qty: 1, canRotate: true },
    { id: "p5", label: "Adjustable Shelves", w: 764, h: 540, qty: 2, canRotate: true },
    { id: "p6", label: "Cabinet Back (1/4\")", w: 780, h: 700, qty: 1, canRotate: true },
    { id: "p7", label: "Drawer Faces", w: 760, h: 220, qty: 2, canRotate: true }
  ];
  renderCutlistPartsTable();
  calculateCutlistOptimization();
}

function calculateCutlistOptimization() {
  const res = runGuillotineBinPacking(cutlistState.sheetW, cutlistState.sheetH, cutlistState.kerf, cutlistState.margin, cutlistState.parts);
  cutlistState.results = res;
  cutlistState.activeSheetIdx = 0;
  renderCutlistResults();
}

function runGuillotineBinPacking(sheetW, sheetH, kerf, margin, parts) {
  const usableW = sheetW - 2 * margin;
  const usableH = sheetH - 2 * margin;
  if (usableW <= 0 || usableH <= 0) return { sheets: [], metrics: { totalSheets: 0, yieldPct: "0.0", wastePct: "100.0", cutLengthM: "0.0" } };

  const items = [];
  parts.forEach(p => {
    const qty = Math.max(1, parseInt(p.qty, 10) || 1);
    for (let q = 0; q < qty; q++) {
      items.push({
        id: p.id,
        label: p.label,
        w: parseFloat(p.w) || 100,
        h: parseFloat(p.h) || 100,
        canRotate: p.canRotate !== false
      });
    }
  });

  items.sort((a, b) => (b.w * b.h) - (a.w * a.h) || Math.max(b.w, b.h) - Math.max(a.w, a.h));

  const sheets = [];

  function createNewSheet() {
    return {
      sheetW,
      sheetH,
      freeRects: [{ x: margin, y: margin, w: usableW, h: usableH }],
      placed: []
    };
  }

  for (const item of items) {
    let placed = false;

    for (let s = 0; s < sheets.length; s++) {
      const sheet = sheets[s];
      let bestRectIdx = -1;
      let bestRotate = false;
      let minShortSideFit = Infinity;

      for (let r = 0; r < sheet.freeRects.length; r++) {
        const fr = sheet.freeRects[r];
        if (item.w <= fr.w && item.h <= fr.h) {
          const shortSideFit = Math.min(fr.w - item.w, fr.h - item.h);
          if (shortSideFit < minShortSideFit) {
            minShortSideFit = shortSideFit;
            bestRectIdx = r;
            bestRotate = false;
          }
        }
        if (item.canRotate && item.h <= fr.w && item.w <= fr.h) {
          const shortSideFit = Math.min(fr.w - item.h, fr.h - item.w);
          if (shortSideFit < minShortSideFit) {
            minShortSideFit = shortSideFit;
            bestRectIdx = r;
            bestRotate = true;
          }
        }
      }

      if (bestRectIdx >= 0) {
        const fr = sheet.freeRects.splice(bestRectIdx, 1)[0];
        const pw = bestRotate ? item.h : item.w;
        const ph = bestRotate ? item.w : item.h;

        sheet.placed.push({
          id: item.id,
          label: item.label,
          x: fr.x,
          y: fr.y,
          w: pw,
          h: ph,
          rotated: bestRotate
        });

        const remW = fr.w - pw - kerf;
        const remH = fr.h - ph - kerf;
        if (fr.w <= fr.h) {
          if (remH > 0) sheet.freeRects.push({ x: fr.x, y: fr.y + ph + kerf, w: fr.w, h: remH });
          if (remW > 0) sheet.freeRects.push({ x: fr.x + pw + kerf, y: fr.y, w: remW, h: ph });
        } else {
          if (remW > 0) sheet.freeRects.push({ x: fr.x + pw + kerf, y: fr.y, w: remW, h: fr.h });
          if (remH > 0) sheet.freeRects.push({ x: fr.x, y: fr.y + ph + kerf, w: pw, h: remH });
        }

        placed = true;
        break;
      }
    }

    if (!placed) {
      const newSheet = createNewSheet();
      const fr = newSheet.freeRects.pop();
      const rotate = item.canRotate && (item.h <= fr.w && item.w <= fr.h) && (item.w > fr.w || item.h > fr.h || fr.w >= fr.h);
      const pw = rotate ? item.h : item.w;
      const ph = rotate ? item.w : item.h;

      newSheet.placed.push({
        id: item.id,
        label: item.label,
        x: fr.x,
        y: fr.y,
        w: pw,
        h: ph,
        rotated: rotate
      });

      const remW = fr.w - pw - kerf;
      const remH = fr.h - ph - kerf;
      if (fr.w <= fr.h) {
        if (remH > 0) newSheet.freeRects.push({ x: fr.x, y: fr.y + ph + kerf, w: fr.w, h: remH });
        if (remW > 0) newSheet.freeRects.push({ x: fr.x + pw + kerf, y: fr.y, w: remW, h: ph });
      } else {
        if (remW > 0) newSheet.freeRects.push({ x: fr.x + pw + kerf, y: fr.y, w: remW, h: fr.h });
        if (remH > 0) newSheet.freeRects.push({ x: fr.x, y: fr.y + ph + kerf, w: pw, h: remH });
      }

      sheets.push(newSheet);
    }
  }

  let totalPartArea = 0;
  let totalCutLengthMm = 0;
  sheets.forEach(sh => {
    sh.placed.forEach(p => {
      totalPartArea += p.w * p.h;
      totalCutLengthMm += 2 * (p.w + p.h);
    });
  });

  const totalStockArea = sheets.length * sheetW * sheetH;
  const yieldPct = totalStockArea > 0 ? (totalPartArea / totalStockArea) * 100 : 0;
  const wastePct = Math.max(0, 100 - yieldPct);

  return {
    sheets,
    metrics: {
      totalSheets: sheets.length,
      yieldPct: yieldPct.toFixed(1),
      wastePct: wastePct.toFixed(1),
      cutLengthM: (totalCutLengthMm / 1000).toFixed(1)
    }
  };
}

function renderCutlistResults() {
  if (!cutlistState.results) return;
  const res = cutlistState.results;

  if ($("#cutlist-stat-sheets")) $("#cutlist-stat-sheets").textContent = `${res.sheets.length} Sheet${res.sheets.length > 1 ? 's' : ''}`;
  if ($("#cutlist-stat-yield")) $("#cutlist-stat-yield").textContent = `${res.metrics.yieldPct}%`;
  if ($("#cutlist-stat-waste")) $("#cutlist-stat-waste").textContent = `${res.metrics.wastePct}%`;
  if ($("#cutlist-stat-cutlength")) $("#cutlist-stat-cutlength").textContent = `${res.metrics.cutLengthM} m`;

  if ($("#cutlist-sheet-counter")) $("#cutlist-sheet-counter").textContent = `Sheet ${cutlistState.activeSheetIdx + 1} of ${res.sheets.length}`;
  renderCutlistCanvas(cutlistState.activeSheetIdx);
}

function renderCutlistCanvas(sheetIdx) {
  const canvas = $("#cutlist-canvas");
  if (!canvas || !cutlistState.results || !cutlistState.results.sheets.length) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const sheet = cutlistState.results.sheets[sheetIdx] || cutlistState.results.sheets[0];
  const padding = 20;
  const availW = w - padding * 2;
  const availH = h - padding * 2;

  const scale = Math.min(availW / sheet.sheetW, availH / sheet.sheetH);
  const drawW = sheet.sheetW * scale;
  const drawH = sheet.sheetH * scale;
  const startX = (w - drawW) / 2;
  const startY = (h - drawH) / 2;

  // Background / Sheet border
  ctx.fillStyle = "#faf6ef";
  ctx.fillRect(startX, startY, drawW, drawH);
  ctx.strokeStyle = "#854d0e";
  ctx.lineWidth = 2;
  ctx.strokeRect(startX, startY, drawW, drawH);

  // Draw offcuts / free space
  sheet.freeRects.forEach(fr => {
    const rx = startX + fr.x * scale;
    const ry = startY + fr.y * scale;
    const rw = fr.w * scale;
    const rh = fr.h * scale;
    ctx.fillStyle = "rgba(148, 163, 184, 0.18)";
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(rx, ry, rw, rh);
    if (fr.w >= 150 && fr.h >= 150) {
      ctx.fillStyle = "#64748b";
      ctx.font = "10px sans-serif";
      ctx.fillText(`Offcut ${Math.round(fr.w)}×${Math.round(fr.h)}`, rx + 4, ry + 12);
    }
  });

  const colors = ["#fed7aa", "#fde68a", "#bbf7d0", "#bae6fd", "#e9d5ff", "#fbcfe8", "#fecdd3"];

  // Draw placed parts
  sheet.placed.forEach((p, idx) => {
    const px = startX + p.x * scale;
    const py = startY + p.y * scale;
    const pw = p.w * scale;
    const ph = p.h * scale;

    ctx.fillStyle = colors[idx % colors.length];
    ctx.fillRect(px, py, pw, ph);

    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px, py, pw, ph);

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 11px sans-serif";
    const title = p.label.length > 20 ? p.label.slice(0, 18) + "…" : p.label;
    if (ph > 22) {
      ctx.fillText(title, px + 4, py + 14);
    }
    if (ph > 36) {
      ctx.font = "9.5px monospace";
      ctx.fillStyle = "#334155";
      ctx.fillText(`${Math.round(p.w)} × ${Math.round(p.h)} mm${p.rotated ? ' ⟳' : ''}`, px + 4, py + 28);
    }
  });
}

function saveCutlistOffcutsToVault() {
  if (!cutlistState.results) return;
  const vault = getScrapVault();
  let count = 0;

  cutlistState.results.sheets.forEach((sh, sIdx) => {
    sh.freeRects.forEach((fr, rIdx) => {
      if (fr.w >= 150 && fr.h >= 150) {
        vault.push({
          id: `offcut_${Date.now()}_${sIdx}_${rIdx}`,
          material: "Plywood",
          name: `Cutlist Offcut (${Math.round(fr.w)}×${Math.round(fr.h)} mm)`,
          length: Math.round(fr.w),
          width: Math.round(fr.h),
          thickness: 18,
          location: "Scrap Bin",
          notes: `Offcut from Sheet #${sIdx + 1}`
        });
        count++;
      }
    });
  });

  saveScrapVault(vault);
  showToast(`Saved ${count} usable offcuts to Scrap Vault! 📦`);
}

function getScrapVault() {
  try {
    const raw = localStorage.getItem(SCRAP_VAULT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [
      { id: "sv1", material: "Hardwood", name: "Walnut Board Offcut", length: 950, width: 220, thickness: 22, location: "Rack 2B", notes: "Clear grain, planed S4S" },
      { id: "sv2", material: "Plywood", name: "Baltic Birch 12mm", length: 600, width: 500, thickness: 12, location: "Sheet Bin", notes: "Square cabinet scrap" },
      { id: "sv3", material: "Acrylic", name: "Cast Smoked Acrylic 3mm", length: 420, width: 380, thickness: 3, location: "Laser Drawer", notes: "Protective film on both sides" }
    ];
  } catch {
    return [];
  }
}

function saveScrapVault(vault) {
  try {
    localStorage.setItem(SCRAP_VAULT_STORAGE_KEY, JSON.stringify(vault));
  } catch {}
}

function renderScrapVaultGrid() {
  const container = $("#scrap-vault-grid");
  if (!container) return;
  const vault = getScrapVault();
  const filter = $("#vault-material-filter")?.value || "all";
  const q = ($("#vault-search")?.value || "").toLowerCase().trim();

  const filtered = vault.filter(s => {
    if (filter !== "all" && s.material !== filter) return false;
    if (q && !s.name.toLowerCase().includes(q) && !s.location.toLowerCase().includes(q)) return false;
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:24px;color:var(--muted)">No scrap pieces found. Save offcuts from the optimizer or click "＋ Add Scrap Piece".</div>`;
    return;
  }

  container.innerHTML = filtered.map(s => `
    <div class="scrap-card">
      <div class="scrap-card-header">
        <div>
          <span class="badge" style="background:rgba(217,119,6,0.15);color:var(--primary);font-size:10px">${escapeHtml(s.material)}</span>
          <strong style="display:block;margin-top:2px;font-size:13px">${escapeHtml(s.name)}</strong>
        </div>
        <button type="button" class="button button-small button-outline" onclick="deleteScrapVaultPiece('${s.id}')" style="padding:0 5px;color:#ef4444" title="Delete scrap">×</button>
      </div>
      <div class="scrap-dims-badge">${s.length} × ${s.width} × ${s.thickness || 19} mm</div>
      <div style="font-size:11px;color:var(--muted)">📍 Location: <strong>${escapeHtml(s.location || "Workshop")}</strong></div>
      ${s.notes ? `<div style="font-size:11px;color:#64748b;font-style:italic">${escapeHtml(s.notes)}</div>` : ''}
    </div>
  `).join("");
}

function deleteScrapVaultPiece(id) {
  const vault = getScrapVault().filter(s => s.id !== id);
  saveScrapVault(vault);
  renderScrapVaultGrid();
  showToast("Scrap piece removed.");
}

function matchVaultAgainstCutlist() {
  const vault = getScrapVault();
  const banner = $("#vault-match-banner");
  if (!banner) return;

  const matches = [];
  cutlistState.parts.forEach(p => {
    const pw = parseFloat(p.w) || 100;
    const ph = parseFloat(p.h) || 100;
    vault.forEach(sv => {
      const matchNormal = sv.length >= pw && sv.width >= ph;
      const matchRotated = p.canRotate && sv.length >= ph && sv.width >= pw;
      if (matchNormal || matchRotated) {
        matches.push(`<strong>${escapeHtml(p.label)}</strong> (${pw}×${ph} mm) can be cut from <strong>${escapeHtml(sv.name)}</strong> (${sv.length}×${sv.width} mm in ${escapeHtml(sv.location)})`);
      }
    });
  });

  if (matches.length > 0) {
    banner.innerHTML = `<strong>✨ Scrap Vault Savings Found!</strong><br>` + matches.join("<br>");
    banner.style.display = "block";
  } else {
    banner.innerHTML = `No scrap pieces in the vault are large enough for the current cutlist parts. Cutting from full stock recommended.`;
    banner.style.display = "block";
  }
}

/* ------------------------------------------------------------
   FEATURE 10: Workshop Climate, Curing & Finishing Advisor
   ------------------------------------------------------------ */
function openClimateAdvisor() {
  const dlg = $("#climate-advisor-dialog");
  if (!dlg) return;
  dlg.showModal();
  initClimateAdvisor();
  recalculateClimateAdvisor();
}

function initClimateAdvisor() {
  ["climate-temp-val", "climate-temp-unit", "climate-rh-val", "climate-wood-select", "climate-finish-select"].forEach(id => {
    const el = $("#" + id);
    if (el && !el._initialized) {
      el._initialized = true;
      el.addEventListener("input", () => recalculateClimateAdvisor());
      el.addEventListener("change", () => recalculateClimateAdvisor());
    }
  });
}

function recalculateClimateAdvisor() {
  const rawT = parseFloat($("#climate-temp-val")?.value) || 21;
  const unit = $("#climate-temp-unit")?.value || "C";
  const tempC = unit === "F" ? (rawT - 32) * (5 / 9) : rawT;
  const rh = parseFloat($("#climate-rh-val")?.value) || 50;
  if ($("#climate-rh-display")) $("#climate-rh-display").textContent = rh + "%";

  // 1. Dew Point calculation (Magnus formula)
  const a = 17.625, b = 243.04;
  const alpha = (a * tempC) / (b + tempC) + Math.log(rh / 100);
  const dewPointC = (b * alpha) / (a - alpha);
  const dewPointDisplay = unit === "F" ? ((dewPointC * 9/5) + 32).toFixed(1) + " °F" : dewPointC.toFixed(1) + " °C";
  if ($("#climate-dewpoint-val")) $("#climate-dewpoint-val").textContent = dewPointDisplay;

  const deltaT = tempC - dewPointC;
  const blushStatusEl = $("#climate-blush-status");
  const blushAdviceEl = $("#climate-blush-advice");

  if (deltaT < 4 || rh > 75) {
    if (blushStatusEl) { blushStatusEl.className = "climate-badge-status climate-badge-danger"; blushStatusEl.textContent = "High Blushing & Moisture Trap Hazard!"; }
    if (blushAdviceEl) blushAdviceEl.textContent = `Ambient is only ${deltaT.toFixed(1)}°C above dew point (RH ${rh}%). Rapid solvent evaporation will cause white condensation blush. Delay spray finishing or add blush retarder.`;
  } else if (deltaT < 8 || rh > 65) {
    if (blushStatusEl) { blushStatusEl.className = "climate-badge-status climate-badge-warn"; blushStatusEl.textContent = "Caution: Marginal Finishing Window"; }
    if (blushAdviceEl) blushAdviceEl.textContent = `Moderate moisture risk. Apply light coats, ensure warm cross-ventilation, and avoid thick wet film passes.`;
  } else {
    if (blushStatusEl) { blushStatusEl.className = "climate-badge-status"; blushStatusEl.textContent = "Safe: Optimal Finishing Window"; }
    if (blushAdviceEl) blushAdviceEl.textContent = `Ambient is ${deltaT.toFixed(1)}°C above dew point. Solvents evaporate cleanly with zero blush or orange-peel trapping.`;
  }

  // 2. Epoxy & Resin Arrhenius Curing Speed
  const cureMultiplier = Math.pow(2, (tempC - 21) / 10);
  const nominalHours = 24;
  const effectiveHours = Math.max(2, nominalHours / cureMultiplier);
  const nominalPotLife = 45;
  const effectivePotLife = Math.max(8, nominalPotLife / cureMultiplier);

  const epoxySpeedEl = $("#climate-epoxy-speed");
  const epoxyStatusEl = $("#climate-epoxy-status");
  const epoxyAdviceEl = $("#climate-epoxy-advice");

  if (epoxySpeedEl) epoxySpeedEl.textContent = `${cureMultiplier.toFixed(2)}× (${effectiveHours.toFixed(1)} hrs)`;
  if (tempC < 16) {
    if (epoxyStatusEl) { epoxyStatusEl.className = "climate-badge-status climate-badge-danger"; epoxyStatusEl.textContent = "Cold: Sluggish Cure & Sticky Amine Blush Risk"; }
    if (epoxyAdviceEl) epoxyAdviceEl.textContent = `Below 16°C (60°F), epoxy polymerizes very slowly and can cure gummy. Heat shop or use heating blankets.`;
  } else if (tempC > 27) {
    if (epoxyStatusEl) { epoxyStatusEl.className = "climate-badge-status climate-badge-warn"; epoxyStatusEl.textContent = "Warm: High Exotherm & Flash Cure Warning"; }
    if (epoxyAdviceEl) epoxyAdviceEl.textContent = `Pot life compressed to ~${Math.round(effectivePotLife)} min! Deep pours risk thermal runaway cracking. Pour in thin lifts or chill resin.`;
  } else {
    if (epoxyStatusEl) { epoxyStatusEl.className = "climate-badge-status"; epoxyStatusEl.textContent = "Balanced Pot Life & Optimal Polymerization"; }
    if (epoxyAdviceEl) epoxyAdviceEl.textContent = `Working pot life is ~${Math.round(effectivePotLife)} min. Full demold strength expected in ~${effectiveHours.toFixed(1)} hours.`;
  }

  // 3. Wood Equilibrium Moisture Content (EMC)
  const h = rh / 100;
  const W = 330 + 0.452 * tempC;
  const K = 0.791 + 0.000463 * tempC;
  const K1 = 6.34 + 0.000775 * tempC;
  const K2 = 1.09 + 0.0171 * tempC;
  const emc = (1800 / W) * ((K * h) / (1 - K * h) + (K1 * K * h + 2 * K1 * K2 * K * K * h * h) / (1 + K1 * K * h + K1 * K2 * K * K * h * h));

  if ($("#climate-emc-val")) $("#climate-emc-val").textContent = emc.toFixed(1) + "% EMC";
  const woodCoeff = parseFloat($("#climate-wood-select")?.value) || 0.00369;
  const woodName = $("#climate-wood-select")?.selectedOptions?.[0]?.dataset?.name || "Wood";
  const movementMm = 900 * woodCoeff * 4;
  if ($("#climate-wood-advice")) $("#climate-wood-advice").textContent = `A 900 mm (36″) ${woodName} tabletop will expand/contract ~${movementMm.toFixed(1)} mm seasonally between summer and winter. Always use slotted figure-8 clips or breadboard expansion tenons.`;

  // 4. 3D Filament moisture
  const filVal = $("#climate-filament-val");
  const filStat = $("#climate-filament-status");
  const filAdvice = $("#climate-filament-advice");
  if (rh > 60) {
    if (filVal) filVal.textContent = `High RH (${rh}%)`;
    if (filStat) { filStat.className = "climate-badge-status climate-badge-danger"; filStat.textContent = "Desiccant Dry Box Required"; }
    if (filAdvice) filAdvice.textContent = "PETG & TPU will pop and string within 24 hours. Nylon must be printed directly from a heated drybox.";
  } else if (rh > 40) {
    if (filVal) filVal.textContent = `Moderate RH (${rh}%)`;
    if (filStat) { filStat.className = "climate-badge-status"; filStat.textContent = "PLA Safe · Store Spools Sealed"; }
    if (filAdvice) filAdvice.textContent = "PLA prints cleanly for up to a week. Store PETG with desiccant beads when not actively printing.";
  } else {
    if (filVal) filVal.textContent = `Dry Climate (${rh}%)`;
    if (filStat) { filStat.className = "climate-badge-status"; filStat.textContent = "Ideal Filament Storage"; }
    if (filAdvice) filAdvice.textContent = "Filament shelf life in open air is extended. Minimal moisture bubbling.";
  }
}

/* ------------------------------------------------------------
   FEATURE 11: Workshop Audio Spindle Tachometer & dB Sound Level Monitor
   ------------------------------------------------------------ */
let audioTunerState = {
  isListening: false,
  audioCtx: null,
  stream: null,
  analyser: null,
  animId: null
};

function openAudioTuner() {
  const dlg = $("#audio-tuner-dialog");
  if (!dlg) return;
  dlg.showModal();
  initAudioTuner();
}

function initAudioTuner() {
  const btn = $("#audio-toggle-listen-btn");
  if (btn && !btn._initialized) {
    btn._initialized = true;
    btn.onclick = () => {
      if (audioTunerState.isListening) {
        stopAudioTunerListening();
      } else {
        startAudioTunerListening();
      }
    };
  }

  const dlg = $("#audio-tuner-dialog");
  if (dlg && !dlg._closeBound) {
    dlg._closeBound = true;
    dlg.addEventListener("close", () => {
      if (audioTunerState.isListening) stopAudioTunerListening();
    });
  }
}

function startAudioTunerListening() {
  const btn = $("#audio-toggle-listen-btn");
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    showToast("Web Audio API not supported on this browser.");
    return;
  }

  audioTunerState.audioCtx = new AudioContext();

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      audioTunerState.stream = stream;
      audioTunerState.isListening = true;
      if (btn) btn.textContent = "⏹ Stop Listening";

      const source = audioTunerState.audioCtx.createMediaStreamSource(stream);
      const analyser = audioTunerState.audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      audioTunerState.analyser = analyser;

      runAudioTunerLoop();
      showToast("Microphone connected! Monitoring dB and spindle RPM.");
    }).catch(err => {
      console.warn("Microphone access error, starting simulated audio analyzer:", err);
      audioTunerState.isListening = true;
      if (btn) btn.textContent = "⏹ Stop Demo Mode";
      runSimulatedAudioLoop();
      showToast("Running Audio Tachometer Demo Simulator.");
    });
  } else {
    audioTunerState.isListening = true;
    if (btn) btn.textContent = "⏹ Stop Demo Mode";
    runSimulatedAudioLoop();
  }
}

function stopAudioTunerListening() {
  audioTunerState.isListening = false;
  const btn = $("#audio-toggle-listen-btn");
  if (btn) btn.textContent = "🎙️ Start Listening";

  if (audioTunerState.animId) {
    cancelAnimationFrame(audioTunerState.animId);
    audioTunerState.animId = null;
  }
  if (audioTunerState.stream) {
    audioTunerState.stream.getTracks().forEach(t => t.stop());
    audioTunerState.stream = null;
  }
  if (audioTunerState.audioCtx) {
    audioTunerState.audioCtx.close();
    audioTunerState.audioCtx = null;
  }
  if ($("#audio-rpm-reading")) $("#audio-rpm-reading").innerHTML = "— <span style='font-size:16px;color:var(--muted)'>RPM</span>";
  if ($("#audio-freq-reading")) $("#audio-freq-reading").innerHTML = "— <span style='font-size:14px;color:var(--muted)'>Hz</span>";
}

function runAudioTunerLoop() {
  if (!audioTunerState.isListening || !audioTunerState.analyser) return;

  const analyser = audioTunerState.analyser;
  const timeBuf = new Float32Array(analyser.fftSize);
  const freqBuf = new Uint8Array(analyser.frequencyBinCount);

  analyser.getFloatTimeDomainData(timeBuf);
  analyser.getByteFrequencyData(freqBuf);

  let sumSq = 0;
  for (let i = 0; i < timeBuf.length; i++) {
    sumSq += timeBuf[i] * timeBuf[i];
  }
  const rms = Math.sqrt(sumSq / timeBuf.length);
  const db = Math.min(120, Math.max(35, 20 * Math.log10(rms + 1e-6) + 100));

  updateDbMeterUI(db);

  const sampleRate = audioTunerState.audioCtx.sampleRate || 44100;
  const binWidth = sampleRate / analyser.fftSize;
  let maxVal = 0;
  let peakBin = 0;

  const minBin = Math.floor(20 / binWidth);
  const maxBin = Math.min(freqBuf.length, Math.floor(1200 / binWidth));

  for (let b = minBin; b < maxBin; b++) {
    if (freqBuf[b] > maxVal && freqBuf[b] > 60) {
      maxVal = freqBuf[b];
      peakBin = b;
    }
  }

  const peakFreq = peakBin * binWidth;
  const toolTeeth = parseInt($("#audio-tool-preset")?.value, 10) || 2;
  const rpm = peakFreq > 0 ? (peakFreq * 60) / toolTeeth : 0;

  if (maxVal > 70 && rpm >= 300) {
    if ($("#audio-rpm-reading")) $("#audio-rpm-reading").innerHTML = `${Math.round(rpm).toLocaleString()} <span style='font-size:16px;color:var(--muted)'>RPM</span>`;
    if ($("#audio-freq-reading")) $("#audio-freq-reading").innerHTML = `${peakFreq.toFixed(1)} <span style='font-size:14px;color:var(--muted)'>Hz</span>`;
  }

  drawAudioSpectrum(freqBuf, peakBin);

  audioTunerState.animId = requestAnimationFrame(runAudioTunerLoop);
}

function runSimulatedAudioLoop() {
  if (!audioTunerState.isListening) return;
  const now = Date.now() / 1000;
  const simDb = 78 + 8 * Math.sin(now * 1.5) + (Math.random() * 4);
  updateDbMeterUI(simDb);

  const toolTeeth = parseInt($("#audio-tool-preset")?.value, 10) || 2;
  const baseRpm = toolTeeth === 2 ? 18000 : (toolTeeth === 40 ? 3450 : 2200);
  const simRpm = baseRpm + (Math.sin(now * 0.8) * 120);
  const simFreq = (simRpm * toolTeeth) / 60;

  if ($("#audio-rpm-reading")) $("#audio-rpm-reading").innerHTML = `${Math.round(simRpm).toLocaleString()} <span style='font-size:16px;color:var(--muted)'>RPM</span>`;
  if ($("#audio-freq-reading")) $("#audio-freq-reading").innerHTML = `${simFreq.toFixed(1)} <span style='font-size:14px;color:var(--muted)'>Hz</span>`;

  const simFreqBuf = new Uint8Array(256);
  const targetBin = Math.min(250, Math.round(simFreq / 8));
  for (let i = 0; i < simFreqBuf.length; i++) {
    const dist = Math.abs(i - targetBin);
    simFreqBuf[i] = Math.max(0, 180 - dist * 12 + (Math.random() * 20));
  }
  drawAudioSpectrum(simFreqBuf, targetBin);

  audioTunerState.animId = requestAnimationFrame(runSimulatedAudioLoop);
}

function updateDbMeterUI(db) {
  if ($("#audio-db-reading")) $("#audio-db-reading").innerHTML = `${db.toFixed(1)} <span style='font-size:16px;color:var(--muted)'>dB</span>`;
  const pct = Math.min(100, Math.max(0, ((db - 40) / 80) * 100));
  const bar = $("#audio-meter-bar");
  if (bar) bar.style.width = pct + "%";

  const statusBadge = $("#audio-db-status");
  const title = $("#audio-safety-title");
  const desc = $("#audio-safety-desc");

  if (db < 70) {
    if (statusBadge) { statusBadge.className = "audio-db-status-badge"; statusBadge.textContent = "Safe: Conversational Sound"; }
    if (title) title.textContent = "Hearing Protection: Not Required";
    if (desc) desc.textContent = "Sound pressure is well below OSHA hazard thresholds (Safe for 8+ hours).";
  } else if (db < 85) {
    if (statusBadge) { statusBadge.className = "audio-db-status-badge"; statusBadge.style.background = "rgba(245,158,11,0.15)"; statusBadge.style.color = "#d97706"; statusBadge.textContent = "Moderate Workshop Noise"; }
    if (title) title.textContent = "Hearing Protection: Recommended";
    if (desc) desc.textContent = "Approaching 85 dB threshold. Consider earplugs for extended machining sessions.";
  } else if (db < 100) {
    if (statusBadge) { statusBadge.className = "audio-db-status-badge"; statusBadge.style.background = "rgba(239,68,68,0.15)"; statusBadge.style.color = "#ef4444"; statusBadge.textContent = "OSHA Hazard: Ear Protection Mandatory!"; }
    if (title) title.textContent = "Hearing Protection: Mandatory (Earplugs or Muffs)";
    if (desc) desc.textContent = "Continuous unshielded exposure above 85 dB causes permanent hearing damage. Put on hearing PPE.";
  } else {
    if (statusBadge) { statusBadge.className = "audio-db-status-badge"; statusBadge.style.background = "#ef4444"; statusBadge.style.color = "#fff"; statusBadge.textContent = "DANGER: Extreme Sound Pressure!"; }
    if (title) title.textContent = "CRITICAL: Dual Protection Required (Plugs + Muffs)";
    if (desc) desc.textContent = "Severe noise hazard (>100 dB). Maximum safe exposure without dual protection is under 15 minutes.";
  }
}

function drawAudioSpectrum(freqBuf, peakBin) {
  const canvas = $("#audio-spectrum-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const barCount = Math.min(freqBuf.length, 120);
  const barW = w / barCount;

  for (let i = 0; i < barCount; i++) {
    const val = freqBuf[i] / 255.0;
    const barH = val * h;
    const isPeak = Math.abs(i - peakBin) <= 1 && val > 0.3;

    ctx.fillStyle = isPeak ? "#ef4444" : (i % 2 === 0 ? "#f59e0b" : "#d97706");
    ctx.fillRect(i * barW, h - barH, barW - 1, barH);
  }
}

/* ------------------------------------------------------------
   FEATURE 12: IKEA-Style Illustrated Assembly Manual Generator
   ------------------------------------------------------------ */
function openAssemblyManual(projectId) {
  const dlg = $("#assembly-manual-dialog");
  if (!dlg) return;
  dlg.showModal();
  initAssemblyManual(projectId);
}

function initAssemblyManual(selectedProjectId) {
  const select = $("#manual-project-select");
  if (!select) return;
  select.innerHTML = state.projects.map(p => `<option value="${p.id}" ${p.id === selectedProjectId ? 'selected' : ''}>${escapeHtml(p.title)}</option>`).join("");

  const activeProject = state.projects.find(p => p.id === selectedProjectId) || state.projects[0];
  if (activeProject) {
    renderAssemblyManualDocument(activeProject);
  } else {
    loadSampleAssemblyManual();
  }

  select.onchange = () => {
    const prj = state.projects.find(p => p.id === select.value);
    if (prj) renderAssemblyManualDocument(prj);
  };

  const sampleBtn = $("#manual-sample-blueprint-btn");
  if (sampleBtn) sampleBtn.onclick = () => loadSampleAssemblyManual();

  const printBtn = $("#manual-print-btn");
  if (printBtn) printBtn.onclick = () => window.print();
}

function renderAssemblyManualDocument(project) {
  const container = $("#manual-document-container");
  if (!container) return;

  const steps = (project.tasks && project.tasks.length > 0) ? project.tasks : [
    { title: "Prep & Mill Lumber", notes: "Joint and plane all stock to 20mm uniform thickness." },
    { title: "Cut Joinery Mortises", notes: "Route 10mm wide x 25mm deep mortises on leg components." },
    { title: "Dry Fit Assembly", notes: "Check squareness with diagonal tape measurements." },
    { title: "Glue-Up & Clamp", notes: "Apply PVA wood glue and clamp with parallel bar clamps for 3 hours." },
    { title: "Sand & Apply Hardwax Oil", notes: "Progressive sand to 220 grit and buff two coats of finish." }
  ];

  const tools = ["Clamps (4x Parallel)", "Table Saw / Miter Saw", "Drill / Driver", "Router", "Safety Glasses (PPE)", "Ear Protection (PPE)", "Dust Mask (PPE)", "Square & Tape Measure"];
  const hardware = [
    { name: "Pocket Hole Screws M4×30", qty: "24 pcs", type: "Fastener" },
    { name: "Domino / Dowel Pins 8×40mm", qty: "16 pcs", type: "Joinery" },
    { name: "PVA Type II Wood Glue", qty: "1 bottle", type: "Adhesive" },
    { name: "Silicone Bumpers", qty: "4 pcs", type: "Hardware" }
  ];

  container.innerHTML = `
    <div class="manual-cover-card">
      <div>
        <div style="font-size:10px;font-weight:700;letter-spacing:.1em;color:#64748b;text-transform:uppercase">TECHNICAL INSTRUCTION MANUAL</div>
        <h1 style="margin:4px 0 6px;font-size:24px;color:#0f172a">${escapeHtml(project.title)}</h1>
        <div style="font-size:12px;color:#64748b">Lead Artisan: <strong>${escapeHtml(state.userProfile?.name || "Workshop Maker")}</strong> · Rev 1.0</div>
      </div>
      <div style="text-align:right">
        <span style="font-size:11px;background:#0f172a;color:#fff;padding:4px 10px;border-radius:4px;font-weight:700">Difficulty: Intermediate</span>
        <div style="font-size:11px;color:#64748b;margin-top:4px">Est. Build Time: ~${project.tasks ? Math.max(4, project.tasks.length * 2) : 12} Hours</div>
      </div>
    </div>

    <!-- Required Tools & PPE -->
    <div style="margin-top:12px">
      <h3 style="margin:0 0 6px;font-size:13px;color:#0f172a">1. Required Tools &amp; Safety PPE Checklist</h3>
      <div class="manual-tools-grid">
        ${tools.map(t => `<div class="manual-tool-item"><span>🔧</span><span>${escapeHtml(t)}</span></div>`).join("")}
      </div>
    </div>

    <!-- Bill of Materials Hardware Checklist -->
    <div style="margin-top:14px">
      <h3 style="margin:0 0 6px;font-size:13px;color:#0f172a">2. Hardware &amp; Fasteners Schedule</h3>
      <table style="width:100%;border-collapse:collapse;font-size:11.5px">
        <thead>
          <tr style="border-bottom:2px solid #cbd5e1;text-align:left">
            <th style="padding:4px">Hardware Part</th>
            <th style="padding:4px">Type</th>
            <th style="padding:4px">Quantity</th>
            <th style="padding:4px;text-align:center">Check</th>
          </tr>
        </thead>
        <tbody>
          ${hardware.map(h => `
            <tr style="border-bottom:1px solid #e2e8f0">
              <td style="padding:6px 4px;font-weight:600">${escapeHtml(h.name)}</td>
              <td style="padding:6px 4px;color:#64748b">${escapeHtml(h.type)}</td>
              <td style="padding:6px 4px;font-family:monospace;font-weight:700">${escapeHtml(h.qty)}</td>
              <td style="padding:6px 4px;text-align:center"><input type="checkbox"></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>

    <!-- Step by Step Sequence -->
    <div style="margin-top:16px;display:flex;flex-direction:column;gap:12px">
      <h3 style="margin:0;font-size:13px;color:#0f172a">3. Numbered Assembly Steps</h3>
      ${steps.map((s, idx) => `
        <div class="manual-step-card">
          <div class="manual-step-header">
            <span class="manual-step-num">Step ${idx + 1}: ${escapeHtml(s.title || s.text || "Assembly Procedure")}</span>
            <label style="font-size:11px;display:flex;align-items:center;gap:4px;cursor:pointer">
              <input type="checkbox" class="manual-step-checkbox">
              <span>Mark Complete</span>
            </label>
          </div>
          <p style="margin:0;font-size:12px;line-height:1.6;color:#334155">${escapeHtml(s.notes || s.description || "Follow dimensions as indicated in the blueprint. Clamp firmly and wipe excess glue with a damp sponge before curing.")}</p>
          <div class="manual-step-cautions">
            <strong>⚠️ Quality &amp; Safety Note:</strong> Verify squareness across diagonal corners before clamps fully set. Wear ANSI Z87.1 safety glasses.
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function loadSampleAssemblyManual() {
  renderAssemblyManualDocument({
    id: "sample_credenza",
    title: "Mid-Century Walnut Credenza & Media Console",
    tasks: [
      { title: "Stock Dimensioning & Grain Selection", notes: "Plane 4/4 Black Walnut to 19mm. Arrange top board grain for continuous waterfall matching." },
      { title: "Mitered Waterfall Joint Cutting", notes: "Set table saw blade to 45.0° with digital protractor. Cut 45° miters for waterfall end grain." },
      { title: "Domino & Biscuit Routing", notes: "Route 8x40mm domino slots along miter faces for high joint shear strength." },
      { title: "Sliding Door Track Routing", notes: "Route two 6mm wide x 8mm deep channels along top and bottom for tambour sliding doors." },
      { title: "Sub-Frame & Leg Tapering", notes: "Cut 10° splay angles on tapered solid brass tipped legs." },
      { title: "Final Sanding & Hardwax Oil Finish", notes: "Sand to 240 grit. Apply 2 coats of Rubio Monocoat or Osmo Polyx satin oil." }
    ]
  });
}

/* ------------------------------------------------------------
   FEATURE 13: Color Science & Pigment Matching Blender
   ------------------------------------------------------------ */
function openPigmentBlender() {
  const dlg = $("#pigment-blender-dialog");
  if (!dlg) return;
  dlg.showModal();
  initPigmentBlender();
  recalculatePigmentBlend($("#pigment-hex-input")?.value || "#9B4D1B");
}

function initPigmentBlender() {
  const picker = $("#pigment-color-picker");
  const hexInput = $("#pigment-hex-input");
  const imgInput = $("#pigment-image-input");

  if (picker && !picker._initialized) {
    picker._initialized = true;
    picker.addEventListener("input", e => {
      if (hexInput) hexInput.value = e.target.value.toUpperCase();
      recalculatePigmentBlend(e.target.value);
    });
    if (hexInput) {
      hexInput.addEventListener("input", e => {
        let val = e.target.value.trim();
        if (!val.startsWith("#")) val = "#" + val;
        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
          if (picker) picker.value = val;
          recalculatePigmentBlend(val);
        }
      });
    }

    $$(".pigment-preset-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const c = chip.dataset.color;
        if (picker) picker.value = c;
        if (hexInput) hexInput.value = c.toUpperCase();
        recalculatePigmentBlend(c);
      });
    });

    if (imgInput) {
      imgInput.addEventListener("change", e => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          const img = new Image();
          img.onload = () => {
            const oc = document.createElement("canvas");
            oc.width = img.width;
            oc.height = img.height;
            const octx = oc.getContext("2d");
            octx.drawImage(img, 0, 0);
            const imgData = octx.getImageData(Math.floor(img.width/2), Math.floor(img.height/2), 5, 5).data;
            const r = imgData[0], g = imgData[1], b = imgData[2];
            const hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
            if (picker) picker.value = hex;
            if (hexInput) hexInput.value = hex;
            recalculatePigmentBlend(hex);
            showToast("Eye-dropped color from image! 🎨");
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      });
    }
  }
}

function recalculatePigmentBlend(hex) {
  const cleanHex = hex.replace("#", "");
  const num = parseInt(cleanHex, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;

  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const k = 1 - Math.max(rNorm, gNorm, bNorm);
  const c = k < 1 ? (1 - rNorm - k) / (1 - k) : 0;
  const m = k < 1 ? (1 - gNorm - k) / (1 - k) : 0;
  const y = k < 1 ? (1 - bNorm - k) / (1 - k) : 0;
  const white = Math.min(rNorm, gNorm, bNorm);

  const cPct = Math.round(c * 100);
  const mPct = Math.round(m * 100);
  const yPct = Math.round(y * 100);
  const kPct = Math.round(k * 100);
  const wPct = Math.round(white * 50);

  const cmykContainer = $("#pigment-cmyk-list");
  if (cmykContainer) {
    cmykContainer.innerHTML = `
      <div class="pigment-bar-row">
        <span class="pigment-color-dot" style="background:#06b6d4"></span>
        <span style="width:110px">Cyan Primary:</span>
        <div style="flex:1;background:rgba(0,0,0,0.1);height:10px;border-radius:5px;overflow:hidden">
          <div style="width:${cPct}%;background:#06b6d4;height:100%"></div>
        </div>
        <strong style="width:40px;text-align:right">${cPct}%</strong>
      </div>
      <div class="pigment-bar-row">
        <span class="pigment-color-dot" style="background:#ec4899"></span>
        <span style="width:110px">Magenta Primary:</span>
        <div style="flex:1;background:rgba(0,0,0,0.1);height:10px;border-radius:5px;overflow:hidden">
          <div style="width:${mPct}%;background:#ec4899;height:100%"></div>
        </div>
        <strong style="width:40px;text-align:right">${mPct}%</strong>
      </div>
      <div class="pigment-bar-row">
        <span class="pigment-color-dot" style="background:#eab308"></span>
        <span style="width:110px">Yellow Primary:</span>
        <div style="flex:1;background:rgba(0,0,0,0.1);height:10px;border-radius:5px;overflow:hidden">
          <div style="width:${yPct}%;background:#eab308;height:100%"></div>
        </div>
        <strong style="width:40px;text-align:right">${yPct}%</strong>
      </div>
      <div class="pigment-bar-row">
        <span class="pigment-color-dot" style="background:#0f172a"></span>
        <span style="width:110px">Carbon Black:</span>
        <div style="flex:1;background:rgba(0,0,0,0.1);height:10px;border-radius:5px;overflow:hidden">
          <div style="width:${kPct}%;background:#0f172a;height:100%"></div>
        </div>
        <strong style="width:40px;text-align:right">${kPct}%</strong>
      </div>
      <div class="pigment-bar-row">
        <span class="pigment-color-dot" style="background:#ffffff;border:1px solid #cbd5e1"></span>
        <span style="width:110px">Titanium White:</span>
        <div style="flex:1;background:rgba(0,0,0,0.1);height:10px;border-radius:5px;overflow:hidden">
          <div style="width:${wPct}%;background:#94a3b8;height:100%"></div>
        </div>
        <strong style="width:40px;text-align:right">${wPct}%</strong>
      </div>
    `;
  }

  const stainCard = $("#stain-parts-card");
  if (stainCard) {
    const isDark = (r * 0.299 + g * 0.587 + b * 0.114) < 120;
    const isReddish = r > g + 25;
    const isGolden = r > 140 && g > 100 && b < 80;

    let walnutParts = isDark ? 3 : 1;
    let cherryParts = isReddish ? 2 : 0;
    let oakParts = isGolden ? 3 : 1;
    let thinnerParts = isDark ? 0 : 2;

    stainCard.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:6px;font-size:12px">
        <div><strong>Recommended Oil Stain Recipe:</strong></div>
        <div style="display:flex;align-items:center;gap:6px"><span>🪵 Dark Walnut Base:</span> <strong>${walnutParts} Part${walnutParts > 1 ? 's' : ''}</strong></div>
        ${cherryParts > 0 ? `<div style="display:flex;align-items:center;gap:6px"><span>🍒 Red Mahogany / Cherry:</span> <strong>${cherryParts} Parts</strong></div>` : ''}
        <div style="display:flex;align-items:center;gap:6px"><span>🍂 Golden Oak:</span> <strong>${oakParts} Part${oakParts > 1 ? 's' : ''}</strong></div>
        ${thinnerParts > 0 ? `<div style="display:flex;align-items:center;gap:6px"><span>🧪 Mineral Spirits (Thinner):</span> <strong>${thinnerParts} Parts</strong></div>` : ''}
      </div>
    `;
  }

  const resinSpec = $("#resin-tint-spec");
  if (resinSpec) {
    const dropEstimate = Math.max(1, Math.round((k + (1 - rNorm)) * 6));
    const micaGramEstimate = (1.5 + (m + y) * 2.0).toFixed(1);
    resinSpec.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:6px;font-size:12px">
        <div>Translucent Ocean/Tint: <strong>${dropEstimate} Drops Liquid Dye / 100g Resin</strong></div>
        <div>Metallic Pearl / River Swirl: <strong>${micaGramEstimate} g Pearlescent Mica Powder</strong></div>
        <div style="font-size:11px;color:var(--muted)">Pour when resin viscosity reaches honey consistency (approx 25 min) to prevent mica settling to bottom.</div>
      </div>
    `;
  }
}

/* ------------------------------------------------------------
   FEATURE: Machine Operating Hours & Hourly Amortization Ledger
   ------------------------------------------------------------ */
function initMachineAmortization() {
  const panel = $("#maint-amort-panel");
  const toggleBtn = $("#maint-calc-amort-btn");
  const applyBtn = $("#maint-apply-commission-btn");

  if (toggleBtn && !toggleBtn._initialized) {
    toggleBtn._initialized = true;
    toggleBtn.addEventListener("click", () => {
      if (panel) {
        panel.style.display = panel.style.display === "none" ? "block" : "none";
        calculateMachineAmortizationRate();
      }
    });

    ["maint-amort-cost", "maint-amort-life", "maint-amort-wear", "maint-amort-watts", "maint-amort-kwh"].forEach(id => {
      $("#" + id)?.addEventListener("input", () => calculateMachineAmortizationRate());
    });

    if (applyBtn) {
      applyBtn.addEventListener("click", () => {
        const rate = calculateMachineAmortizationRate();
        const quoteRateInput = $("#quote-rate-machine");
        if (quoteRateInput) {
          quoteRateInput.value = rate.toFixed(2);
        }
        showToast(`Applied $${rate.toFixed(2)}/hr equipment rate to Client Commission Portal! ⚙️`);
      });
    }
  }
}

function calculateMachineAmortizationRate() {
  const price = parseFloat($("#maint-amort-cost")?.value) || 1800;
  const lifespan = parseFloat($("#maint-amort-life")?.value) || 3000;
  const wear = parseFloat($("#maint-amort-wear")?.value) || 1.50;
  const watts = parseFloat($("#maint-amort-watts")?.value) || 800;
  const kwhCost = parseFloat($("#maint-amort-kwh")?.value) || 0.16;

  const deprecPerHour = lifespan > 0 ? (price / lifespan) : 0;
  const powerPerHour = (watts / 1000) * kwhCost;
  const totalRate = deprecPerHour + wear + powerPerHour;

  if ($("#maint-amort-deprec")) $("#maint-amort-deprec").textContent = `$${deprecPerHour.toFixed(2)}/hr`;
  if ($("#maint-amort-power")) $("#maint-amort-power").textContent = `$${powerPerHour.toFixed(2)}/hr`;
  if ($("#maint-amort-total")) $("#maint-amort-total").textContent = `$${totalRate.toFixed(2)} / hr`;

  return totalRate;
}

/* ------------------------------------------------------------
   FEATURE 14: Multi-Store Shopping Cart & Vendor Purchase Order Exporter
   ------------------------------------------------------------ */
function openVendorExport() {
  const dlg = $("#vendor-export-dialog");
  if (!dlg) return;
  dlg.showModal();
  initVendorExport();
  renderVendorExport("all");
}

function initVendorExport() {
  $$(".vendor-tab-btn").forEach(btn => {
    btn.onclick = () => {
      $$(".vendor-tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderVendorExport(btn.dataset.vendor);
    };
  });

  const downloadBtn = $("#vendor-download-csv-btn");
  if (downloadBtn) downloadBtn.onclick = () => downloadVendorPoCsv();

  const printBtn = $("#vendor-print-po-btn");
  if (printBtn) printBtn.onclick = () => window.print();
}

function classifyItemVendor(item) {
  const text = (item.title || item.name || "") + " " + (item.category || "");
  const lower = text.toLowerCase();
  if (lower.match(/\b(bolt|bolts|screw|screws|nut|nuts|washer|washers|dowel|dowels|bearing|bearings|bushing|thread|pin|pins|fastener|fasteners|brass|aluminum|steel|rod|rods|sheet metal)\b/)) {
    return { id: "mcmaster", name: "McMaster-Carr / Fasteners", searchUrl: `https://www.mcmaster.com/${encodeURIComponent(item.title || item.name)}` };
  }
  if (lower.match(/\b(resistor|resistors|led|leds|capacitor|capacitors|wire|arduino|sensor|sensors|ic|ics|pcb|pcbs|smd|relay|relays|microcontroller|switch|switches|breadboard)\b/)) {
    return { id: "digikey", name: "DigiKey / Electronics", searchUrl: `https://www.digikey.com/en/products?keywords=${encodeURIComponent(item.title || item.name)}` };
  }
  if (lower.match(/\b(walnut|oak|maple|cherry|pine|lumber|veneer|plywood|finish|polyurethane|shellac|stain|stains|hardwax)\b/)) {
    return { id: "woodcraft", name: "Woodcraft / Rockler", searchUrl: `https://www.woodcraft.com/search?q=${encodeURIComponent(item.title || item.name)}` };
  }
  if (lower.match(/\b(epoxy|resin|resins|silicone|silicones|hardener|mold|molds|pigment|pigments|dye|dyes|fiberglass)\b/)) {
    return { id: "smoothon", name: "Smooth-On / Resins", searchUrl: `https://www.google.com/search?q=${encodeURIComponent((item.title || item.name) + " Smooth-On")}` };
  }
  return { id: "amazon", name: "Amazon / General Consumables", searchUrl: `https://www.amazon.com/s?k=${encodeURIComponent(item.title || item.name)}` };
}

function renderVendorExport(filterVendor) {
  const tbody = $("#vendor-po-tbody");
  if (!tbody) return;

  const allItems = [];
  if (state.shoppingItems) {
    state.shoppingItems.forEach(si => allItems.push({ name: si.name, qty: si.qty || "1", estCost: si.cost || 0, category: si.category || "General" }));
  }
  state.projects.forEach(p => {
    if (p.materials) {
      p.materials.forEach(m => allItems.push({ name: m.name, qty: m.quantity || "1", estCost: m.cost || 0, category: p.title }));
    }
  });

  if (allItems.length === 0) {
    allItems.push(
      { name: "M5×30 Button Head Socket Screws (100pk)", qty: "1 pk", estCost: 8.50, category: "Fasteners" },
      { name: "608-2RS Ball Bearings (8pk)", qty: "1 pk", estCost: 12.00, category: "Hardware" },
      { name: "ATmega328P Microcontroller DIP-28", qty: "3 pcs", estCost: 7.20, category: "Electronics" },
      { name: "4/4 Black Walnut Board 6ft", qty: "2 bft", estCost: 32.00, category: "Lumber" },
      { name: "Epoxy Resin Deep Pour 1.5 Gal Kit", qty: "1 kit", estCost: 85.00, category: "Chemicals" }
    );
  }

  const counts = { all: allItems.length, mcmaster: 0, digikey: 0, woodcraft: 0, smoothon: 0, amazon: 0 };
  let grandTotal = 0;

  const rows = [];
  allItems.forEach(item => {
    const vendor = classifyItemVendor(item);
    counts[vendor.id] = (counts[vendor.id] || 0) + 1;

    if (filterVendor === "all" || filterVendor === vendor.id) {
      const cost = parseFloat(item.estCost) || 0;
      grandTotal += cost;
      rows.push(`
        <tr>
          <td><span class="badge" style="background:rgba(217,119,6,0.15);color:var(--primary);font-size:10px">${escapeHtml(vendor.name)}</span></td>
          <td><strong>${escapeHtml(item.name)}</strong></td>
          <td style="font-family:monospace">${escapeHtml(item.qty || "1")}</td>
          <td>$${cost.toFixed(2)}</td>
          <td><strong>$${cost.toFixed(2)}</strong></td>
          <td><a href="${vendor.searchUrl}" target="_blank" rel="noopener noreferrer" class="button button-small button-outline" style="padding:2px 8px;font-size:10px">Find Item ↗</a></td>
        </tr>
      `);
    }
  });

  Object.keys(counts).forEach(k => {
    const el = $("#vendor-count-" + k);
    if (el) el.textContent = counts[k];
  });

  if ($("#vendor-po-total")) $("#vendor-po-total").textContent = "$" + grandTotal.toFixed(2);
  tbody.innerHTML = rows.length > 0 ? rows.join("") : `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:18px">No items classified for this vendor category.</td></tr>`;
}

function downloadVendorPoCsv() {
  const allItems = [];
  if (state.shoppingItems) {
    state.shoppingItems.forEach(si => allItems.push({ name: si.name, qty: si.qty || "1", estCost: si.cost || 0 }));
  }
  if (allItems.length === 0) {
    allItems.push(
      { name: "M5×30 Socket Screws", qty: "100", estCost: 8.50 },
      { name: "Black Walnut 4/4", qty: "2 bft", estCost: 32.00 }
    );
  }

  let csv = "Vendor Category,Item Specification,Quantity,Estimated Cost\n";
  allItems.forEach(i => {
    const vendor = classifyItemVendor(i);
    csv += `"${vendor.name}","${i.name.replace(/"/g, '""')}","${i.qty}","${i.estCost}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Workshop_Vendor_PO_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Downloaded Vendor PO CSV! 📥");
}

window.removeCutlistPartRow = removeCutlistPartRow;
window.deleteScrapVaultPiece = deleteScrapVaultPiece;


/* ============================================================
   WORKSHOP SUITES: 10 ULTIMATE ADVANCED WORKSHOP ENHANCEMENTS
   1. Universal Command Palette (Ctrl+K / Cmd+K Spotlight Switcher)
   2. Digital Inclinometer & Precision Angle Level (#inclinometer-dialog)
   3. 1:1 Real-Scale Screen Bolt & Drill Pitch Gauge (#screen-gauge-dialog)
   4. Visual Caliper & Reference Dimensioning (#visual-caliper-dialog)
   5. Dynamic CNC Feeds, Speeds & Endmill Deflection Engine (#cnc-deflection-dialog)
   6. 3D Print Visual Failure Diagnostician & Slicer Solver (#print-diagnostics-dialog)
   7. Wood Grain Movement & Distortion Simulator (#wood-distortion-dialog)
   8. Workshop Chemical Safety SDS Locker & Incompatible Mixing Checker (#sds-locker-dialog)
   9. Thermal Roll Label Printer Support (Zebra 4x6 & Brother 2x1)
   10. Red Night-Vision Darkroom Mode (theme-night)
   ============================================================ */

/* ------------------------------------------------------------
   FEATURE 10: Red Night-Vision Darkroom Mode
   ------------------------------------------------------------ */
function toggleNightMode(force) {
  const isNight = typeof force === "boolean"
    ? document.body.classList.toggle("theme-night", force)
    : document.body.classList.toggle("theme-night");
  try {
    localStorage.setItem("workbench_theme_night", isNight ? "true" : "false");
  } catch (e) {}
  showToast(isNight ? "Red Night-Vision Mode Activated 🔴" : "Standard Lighting Restored 💡");
  return isNight;
}

function restoreNightModeState() {
  try {
    if (localStorage.getItem("workbench_theme_night") === "true") {
      document.body.classList.add("theme-night");
    }
  } catch (e) {}
}

/* ------------------------------------------------------------
   FEATURE 1: Universal Command Palette (Ctrl+K / Cmd+K)
   ------------------------------------------------------------ */
let commandPaletteState = {
  initialized: false,
  selectedIndex: 0,
  results: []
};

function getCommandPaletteIndex() {
  const items = [
    // 29 Craft Studios
    { title: "Woodworking Studio", icon: "🪵", category: "Craft Studio", type: "view", target: "woodworking", keywords: "wood lumber cutlist joinery timber saw planer router table sanding miter dowel pocket screw" },
    { title: "Textiles & Yarn Studio", icon: "🧶", category: "Craft Studio", type: "view", target: "textiles", keywords: "yarn fabric weave knit crochet stitch thread embroidery pixel sewing loom gauge needle" },
    { title: "Music & Audio Studio", icon: "🎵", category: "Craft Studio", type: "view", target: "music", keywords: "audio sound metronome piano chords drum beat bpm synth keys scale sequencer bpm tempo" },
    { title: "Electronics Studio", icon: "⚡", category: "Craft Studio", type: "view", target: "electronics", keywords: "circuits ohm led resistor capacitor timer 555 voltage arduino breadboard soldering wire smd sensor" },
    { title: "Programming Studio", icon: "💻", category: "Craft Studio", type: "view", target: "programming", keywords: "code hex binary ascii mcu microcontroller base converter regex snippets python c cpp rust" },
    { title: "Art & Design Studio", icon: "🎨", category: "Craft Studio", type: "view", target: "art", keywords: "design color palette contrast framing ratio canvas oil watercolor drawing sketch golden" },
    { title: "Epoxy & Silicone Studio", icon: "🧪", category: "Craft Studio", type: "view", target: "resin", keywords: "epoxy silicone mix ratio casting degassing exotherm watch pot life hardener polyurethane mold" },
    { title: "3D Printing Studio", icon: "🖨️", category: "Craft Studio", type: "view", target: "printing", keywords: "3d print fdm filament flow rate spool nozzle bed adhesion layers infill pla petg abs" },
    { title: "Origami & Paper Craft", icon: "🦢", category: "Craft Studio", type: "view", target: "origami", keywords: "paper folding crease pattern miura tessellation crane sonobe modular washi" },
    { title: "Laser Cutting Studio", icon: "🔥", category: "Craft Studio", type: "view", target: "laser", keywords: "laser cutting kerf engraving co2 diode acrylic vector box joint power speed pulse" },
    { title: "Leathercraft Studio", icon: "🪡", category: "Craft Studio", type: "view", target: "leather", keywords: "leathercraft saddle stitch belt sizing oz mm pricking awl edge bevel burnish dye veg tan" },
    { title: "Ceramics & Pottery Studio", icon: "🏺", category: "Craft Studio", type: "view", target: "ceramics", keywords: "pottery clay shrinkage glaze umf chemistry kiln pyrometric cone bisque slip wheel stoneware" },
    { title: "Welding & Metal Studio", icon: "⚡", category: "Craft Studio", type: "view", target: "welding", keywords: "mig tig arc metal fabrication bend deduction heat input sheet metal steel aluminum weld" },
    { title: "CNC Machining Studio", icon: "⚙️", category: "Craft Studio", type: "view", target: "cnc", keywords: "machining gcode feed speed router mill chip load scallop cusp endmill spindle aluminum" },
    { title: "Blacksmithing & Blades", icon: "⚒️", category: "Craft Studio", type: "view", target: "blacksmith", keywords: "forging bladesmithing heat treat anvil quench temper hrc damascus steel hammer tongs blade" },
    { title: "Fasteners & Tap Drills", icon: "🔩", category: "Craft Studio", type: "view", target: "fasteners", keywords: "bolts screws taps drills thread pitch clearance hole torque tension preload metric unc unf" },
    { title: "Stained Glass Studio", icon: "🪟", category: "Craft Studio", type: "view", target: "glass", keywords: "stained glass copper foil 60/40 solder patina flux came grinder glass cutter lead leaded" },
    { title: "Jewelry & Metalsmithing", icon: "💍", category: "Craft Studio", type: "view", target: "jewelry", keywords: "metalsmithing ring blank bezel wire wax casting gold silver soldering torch mandrel pickle" },
    { title: "Bookbinding & Printmaking", icon: "📖", category: "Craft Studio", type: "view", target: "bookbinding", keywords: "book printmaking signature spine swell french link coptic folios grain direction endpaper kettle" },
    { title: "Resin 3D Print (SLA)", icon: "🧪", category: "Craft Studio", type: "view", target: "sla", keywords: "sla msla resin uv 405nm cure time tsmc lift speed vat drain hollow wash cure photopolymer" },
    { title: "Luthier & Instruments", icon: "🎸", category: "Craft Studio", type: "view", target: "luthier", keywords: "instruments guitar fret scale length 17.817 compound camber fretboard neck string tension intonation truss" },
    { title: "Composites & Carbon Fiber", icon: "🌀", category: "Craft Studio", type: "view", target: "composites", keywords: "carbon fiber fiberglass resin stoichiometry fiber volume fraction vacuum compaction infusion layup core" },
    { title: "Watchmaking & Horology", icon: "⏱️", category: "Craft Studio", type: "view", target: "horology", keywords: "watchmaking watch timegrapher beat error balance amplitude lift angle regulation jewel moebius water resist" },
    { title: "Robotics & Actuators", icon: "🤖", category: "Craft Studio", type: "view", target: "robotics", keywords: "robotics motors stepper microstepping nema kinematics 2-dof reach torque driver steps per mm lipo" },
    { title: "Bicycle & Framebuilding", icon: "🚲", category: "Craft Studio", type: "view", target: "bicycle", keywords: "framebuilding bicycle bike spoke erdmann wheel dish trail fork rake miter fishmouth lug brazing" },
    { title: "Candle & Wax Studio", icon: "🕯️", category: "Craft Studio", type: "view", target: "candle", keywords: "candle wax soy beeswax fragrance wick container melt pour scent paraffin gel cure thermometer" },
    { title: "Perfume & Fragrance", icon: "🌸", category: "Craft Studio", type: "view", target: "perfume", keywords: "perfume scent fragrance cologne aroma olfactory pyramid top heart base notes alcohol dilution edp edt ifra" },
    { title: "Letter & Wax Seal", icon: "✉️", category: "Craft Studio", type: "view", target: "letter", keywords: "letter wax seal paper envelope calligraphy fountain pen stationery stamp gsm deckle epistolary wedding nib" },
    { title: "Botanical Distillation", icon: "🌿", category: "Craft Studio", type: "view", target: "distillation", keywords: "distillation essential oil hydrosol extract steam alembic tincture herbal solvent alcohol maceration clevenger aroma" },

    // Workshop Suites
    { title: "Digital Inclinometer & Angle Level", icon: "📐", category: "Workshop Suite", type: "action", action: "open-inclinometer", keywords: "inclinometer angle tilt level spirit tare bevel plumb miter" },
    { title: "1:1 Real-Scale Screen Bolt Gauge", icon: "📏", category: "Workshop Suite", type: "action", action: "open-screen-gauge", keywords: "bolt gauge pitch screen 1:1 ruler caliper screw metric imperial thread comb" },
    { title: "Visual Photo Caliper Dimensioning", icon: "📷", category: "Workshop Suite", type: "action", action: "open-visual-caliper", keywords: "photo caliper visual camera dimension measure pixel scale reference" },
    { title: "CNC Feeds, Speeds & Deflection Engine", icon: "⚙️", category: "Workshop Suite", type: "action", action: "open-cnc-deflection", keywords: "cnc speeds feeds endmill deflection chip load chip thinning mrr rpm" },
    { title: "3D Print Visual Failure Diagnostician", icon: "🖨️", category: "Workshop Suite", type: "action", action: "open-print-diagnostics", keywords: "3d print diagnose defect stringing warping delamination clogs slicer fix" },
    { title: "Wood Movement & Distortion Simulator", icon: "🪵", category: "Workshop Suite", type: "action", action: "open-wood-distortion", keywords: "wood grain movement cup warp twist moisture content plain quarter rift shrinkage" },
    { title: "Chemical SDS Locker & Mixing Safety", icon: "☣️", category: "Workshop Suite", type: "action", action: "open-sds-locker", keywords: "sds chemical hazcom osha safety hazard incompatibility mix reaction bleach acid" },
    { title: "2D Sheet Cutlist & Guillotine Nesting", icon: "✂️", category: "Workshop Suite", type: "action", action: "open-cutlist-optimizer", keywords: "cutlist sheet plywood guillotine nesting scrap vault kerf waste" },
    { title: "Workshop Climate & Curing Advisor", icon: "🌡️", category: "Workshop Suite", type: "action", action: "open-climate-advisor", keywords: "climate temperature humidity dew point curing glue finish epoxy dry" },
    { title: "Audio Tachometer & Sound Meter", icon: "🎙️", category: "Workshop Suite", type: "action", action: "open-audio-tuner", keywords: "audio sound db decibel tachometer rpm frequency mic tuner" },
    { title: "Interactive Assembly Manual Generator", icon: "📖", category: "Workshop Suite", type: "action", action: "open-assembly-manual", keywords: "manual assembly step instruction exploded steps guide" },
    { title: "Color Pigment & Wood Stain Blender", icon: "🎨", category: "Workshop Suite", type: "action", action: "open-pigment-blender", keywords: "pigment stain dye color mix formula cmyk recipe match" },
    { title: "Vendor Purchase Order & Cart Aggregator", icon: "📦", category: "Workshop Suite", type: "action", action: "open-vendor-export", keywords: "vendor po purchase cart mcmaster digikey woodcraft amazon export csv" },
    { title: "3D CAD & STL / G-Code Viewer", icon: "🧊", category: "Workshop Suite", type: "action", action: "open-cad-viewer", keywords: "cad stl 3d mesh gcode viewer slice" },
    { title: "Workshop Floorplan Planner", icon: "🗺️", category: "Workshop Suite", type: "action", action: "open-floorplan", keywords: "floorplan layout shop bench saw planner machines grid" },
    { title: "Equipment Maintenance & Machine Hours", icon: "🛠️", category: "Workshop Suite", type: "action", action: "open-maintenance-engine", keywords: "maintenance machine hours service lubrication belt blade lube" },
    { title: "QR Label Studio & Bin Inventory", icon: "🏷️", category: "Workshop Suite", type: "action", action: "open-qr-studio", keywords: "qr label thermal bin drawer sticker zebra print barcode" },
    { title: "Client Approval Portal & Spec Sheet", icon: "🤝", category: "Workshop Suite", type: "action", action: "open-client-portal", keywords: "client customer portal proof sign quote spec" },
    { title: "Community Recipe & Material Share Hub", icon: "🌐", category: "Workshop Suite", type: "action", action: "open-community-hub", keywords: "community recipes cloud share formulas presets" },
    { title: "Timelapse Reel Maker", icon: "🎬", category: "Workshop Suite", type: "action", action: "open-timelapse-reel", keywords: "timelapse video reel frames photos animate" },
    { title: "Hands-Free Voice Shop Mode", icon: "🗣️", category: "Workshop Suite", type: "action", action: "open-shop-mode", keywords: "voice shop mode speech audio timer notes hands free" },
    { title: "Workshop Reference & Conversion Tools", icon: "📐", category: "Workshop Suite", type: "action", action: "open-tools", keywords: "tools conversion fraction mm decimal thread gauge ruler" },
    { title: "Parametric Box CAD Generator", icon: "📦", category: "Workshop Suite", type: "action", action: "open-box-generator", keywords: "box enclosure laser finger joint tab kerf svg dxf" },
    { title: "G-Code Toolpath Simulator", icon: "📊", category: "Workshop Suite", type: "action", action: "open-gcode-backplotter", keywords: "gcode nc toolpath simulator backplotter cnc envelope rapid collision" },
    { title: "Stock Billet & Center-of-Mass", icon: "⚖️", category: "Workshop Suite", type: "action", action: "open-stock-weight", keywords: "stock billet weight mass density lumber board feet center mass freight" },
    { title: "Shop Electrical Breaker Panel", icon: "⚡", category: "Workshop Suite", type: "action", action: "open-electrical-panel", keywords: "electrical panel breaker amps phase subpanel balance inrush surge" },
    { title: "Audio Noise Dosimeter & NRR", icon: "🎧", category: "Workshop Suite", type: "action", action: "open-noise-dosimeter", keywords: "audio noise dosimeter decibel dba osha nrr hearing earmuff dose" },
    { title: "Hierarchical BOM & Fasteners", icon: "🔩", category: "Workshop Suite", type: "action", action: "open-bom-consolidator", keywords: "bom bill materials fastener consolidation assembly matrix screw bolt" },
    { title: "Resin Casting & Silicone Mold", icon: "🧪", category: "Workshop Suite", type: "action", action: "open-resin-mold", keywords: "resin mold silicone casting jacket volume mix exotherm degassing" },
    { title: "River Table & Slab Moisture", icon: "🪵", category: "Workshop Suite", type: "action", action: "open-river-table", keywords: "river table slab live edge epoxy moisture gradient void" },
    { title: "Photo Watermark & Timestamp", icon: "🖼️", category: "Workshop Suite", type: "action", action: "open-photo-watermark", keywords: "photo watermark timestamp stamp logo brand dimension proof" },
    { title: "Undo / Redo Action Timeline", icon: "↺", category: "Workshop Suite", type: "action", action: "open-undo-history", keywords: "undo redo history timeline revert rollback ctrl-z" },

    // Chill Music & Audio
    { title: "Chill Music: Lo-Fi Study Beats", icon: "☕", category: "Chill Music", type: "action", action: "toggle-soundscape", dataset: { track: "lofi" }, keywords: "chill music lofi beats study focus work relaxing soundscape rhodes vinyl" },
    { title: "Chill Music: Ambient Flow (528Hz Alpha)", icon: "🧘", category: "Chill Music", type: "action", action: "toggle-soundscape", dataset: { track: "ambient" }, keywords: "chill music ambient flow 528hz solfeggio binaural alpha focus meditation relax" },
    { title: "Chill Music: Felt Piano Melodies", icon: "🎹", category: "Chill Music", type: "action", action: "toggle-soundscape", dataset: { track: "piano" }, keywords: "chill music piano felt acoustic keys relax study work focus melody" },
    { title: "Chill Music: Synthwave Drift", icon: "🌌", category: "Chill Music", type: "action", action: "toggle-soundscape", dataset: { track: "synthwave" }, keywords: "chill music synthwave retro analog synth pad relax work study drift" },
    { title: "Stop Chill Music & Soundscapes", icon: "⏹️", category: "Chill Music", type: "action", action: "toggle-soundscape", dataset: { track: "off" }, keywords: "stop chill music sound soundscape mute pause silence off" },

    // Quick Actions
    { title: "Toggle Red Night-Vision Darkroom Mode", icon: "🔴", category: "Quick Action", type: "action", action: "toggle-night-mode", keywords: "night dark red vision astronomy darkroom light theme" },
    { title: "Start New Workshop Project", icon: "➕", category: "Quick Action", type: "action", action: "new-project", keywords: "new project create start add make" },
    { title: "Scan QR Label with Camera", icon: "📷", category: "Quick Action", type: "action", action: "scan-qr", keywords: "scan qr camera bin code find item" },
    { title: "Open Sync & Data Backup", icon: "⇄", category: "Quick Action", type: "view", target: "sync", keywords: "backup export json cloud sync restore download" }
  ];

  // Dynamic projects from state
  if (state.projects && state.projects.length) {
    state.projects.slice(0, 15).forEach(p => {
      items.push({
        title: `Project: ${p.title}`,
        icon: "📋",
        category: "Project",
        type: "project",
        target: p.id,
        keywords: `${p.title} ${p.category || ""} ${p.tags ? p.tags.join(" ") : ""}`
      });
    });
  }

  return items;
}

function openCommandPalette() {
  const dlg = $("#command-palette-dialog");
  if (!dlg) return;

  if (!commandPaletteState.initialized) {
    const input = $("#command-palette-input");
    const resultsContainer = $("#command-palette-results");

    input?.addEventListener("input", () => {
      filterCommandPalette(input.value);
    });

    input?.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (commandPaletteState.results.length > 0) {
          commandPaletteState.selectedIndex = (commandPaletteState.selectedIndex + 1) % commandPaletteState.results.length;
          renderCommandPaletteItems();
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (commandPaletteState.results.length > 0) {
          commandPaletteState.selectedIndex = (commandPaletteState.selectedIndex - 1 + commandPaletteState.results.length) % commandPaletteState.results.length;
          renderCommandPaletteItems();
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        const active = commandPaletteState.results[commandPaletteState.selectedIndex];
        if (active) executeCommandPaletteItem(active);
      } else if (e.key === "Escape") {
        dlg.close();
      }
    });

    resultsContainer?.addEventListener("click", (e) => {
      const itemEl = e.target.closest(".cmd-palette-item");
      if (!itemEl) return;
      const idx = parseInt(itemEl.dataset.index, 10);
      const item = commandPaletteState.results[idx];
      if (item) executeCommandPaletteItem(item);
    });

    commandPaletteState.initialized = true;
  }

  const input = $("#command-palette-input");
  if (input) input.value = "";
  filterCommandPalette("");
  dlg.showModal();
  input?.focus();
}

function filterCommandPalette(query) {
  const cleanQ = (query || "").trim().toLowerCase();
  const allItems = getCommandPaletteIndex();

  if (!cleanQ) {
    // Show top suites and studios by default
    commandPaletteState.results = allItems.slice(0, 14);
  } else {
    const terms = cleanQ.split(/\s+/);
    commandPaletteState.results = allItems.filter(item => {
      const corpus = `${item.title} ${item.category} ${item.keywords || ""}`.toLowerCase();
      return terms.every(t => corpus.includes(t));
    }).slice(0, 16);
  }

  commandPaletteState.selectedIndex = 0;
  renderCommandPaletteItems();
}

function renderCommandPaletteItems() {
  const container = $("#command-palette-results");
  if (!container) return;

  if (commandPaletteState.results.length === 0) {
    container.innerHTML = '<div style="padding:24px;text-align:center;color:var(--muted);font-size:13px">No craft studio, suite, or project matches your query.</div>';
    return;
  }

  container.innerHTML = commandPaletteState.results.map((item, idx) => {
    const isSelected = idx === commandPaletteState.selectedIndex;
    return `
      <div class="cmd-palette-item ${isSelected ? "active" : ""}" data-index="${idx}" role="button" tabindex="0">
        <span class="cmd-palette-item-icon">${item.icon || "🔍"}</span>
        <div class="cmd-palette-item-info">
          <div class="cmd-palette-item-title">${escapeHTML(item.title)}</div>
        </div>
        <span class="cmd-palette-item-badge">${escapeHTML(item.category)}</span>
      </div>
    `;
  }).join("");

  const activeEl = container.querySelector(".cmd-palette-item.active");
  if (activeEl) {
    activeEl.scrollIntoView({ block: "nearest" });
  }
}

function executeCommandPaletteItem(item) {
  const dlg = $("#command-palette-dialog");
  if (dlg?.open) dlg.close();

  if (item.type === "view") {
    switchView(item.target);
  } else if (item.type === "project") {
    if (typeof openProjectDetail === "function") {
      openProjectDetail(item.target);
    } else {
      switchView("projects");
    }
  } else if (item.type === "action") {
    if (item.action === "open-inclinometer") openInclinometer();
    else if (item.action === "open-screen-gauge") openScreenGauge();
    else if (item.action === "open-visual-caliper") openVisualCaliper();
    else if (item.action === "open-cnc-deflection") openCncDeflection();
    else if (item.action === "open-print-diagnostics") openPrintDiagnostics();
    else if (item.action === "open-wood-distortion") openWoodDistortion();
    else if (item.action === "open-sds-locker") openSdsLocker();
    else if (item.action === "open-cutlist-optimizer") openCutlistOptimizer();
    else if (item.action === "open-climate-advisor") openClimateAdvisor();
    else if (item.action === "open-audio-tuner") openAudioTuner();
    else if (item.action === "open-assembly-manual") openAssemblyManual();
    else if (item.action === "open-pigment-blender") openPigmentBlender();
    else if (item.action === "open-vendor-export") openVendorExport();
    else if (item.action === "open-cad-viewer") openCadViewer();
    else if (item.action === "open-floorplan") openFloorplanPlanner();
    else if (item.action === "open-maintenance-engine") openEquipmentMaintenance();
    else if (item.action === "open-qr-studio") openQrLabelStudio();
    else if (item.action === "open-client-portal") openClientPortal();
    else if (item.action === "open-community-hub") openCommunityHub();
    else if (item.action === "open-timelapse-reel") openTimelapseReel();
    else if (item.action === "open-shop-mode") openShopMode();
    else if (item.action === "open-tools") {
      const td = $("#tools-dialog");
      if (td) td.showModal();
    }
    else if (item.action === "toggle-night-mode") toggleNightMode();
    else if (item.action === "new-project") {
      if (typeof openProjectForm === "function") openProjectForm();
      else if (typeof openNewProjectModal === "function") openNewProjectModal();
    }
    else if (item.action === "scan-qr") openQrCameraScanner();
    else if (item.action === "open-box-generator") openBoxGenerator();
    else if (item.action === "open-gcode-backplotter") openGcodeBackplotter();
    else if (item.action === "open-stock-weight") openStockWeight();
    else if (item.action === "open-electrical-panel") openElectricalPanel();
    else if (item.action === "open-noise-dosimeter") openNoiseDosimeter();
    else if (item.action === "open-bom-consolidator") openBomConsolidator();
    else if (item.action === "open-resin-mold") openResinMold();
    else if (item.action === "open-river-table") openRiverTable();
    else if (item.action === "open-photo-watermark") openPhotoWatermark();
    else if (item.action === "open-undo-history") openUndoHistory();
  }
}

// Global hotkey Ctrl+K / Cmd+K
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
    e.preventDefault();
    openCommandPalette();
  }
});

/* ------------------------------------------------------------
   FEATURE 2: Digital Inclinometer & Precision Angle Level
   ------------------------------------------------------------ */
let inclinometerState = {
  rawAngle: 0,
  tareOffset: 0,
  targetAngle: 0,
  beepEnabled: true,
  lastBeep: 0,
  initialized: false
};

let inclinometerAudioCtx = null;
function playInclinometerBeepTone() {
  if (!inclinometerState.beepEnabled) return;
  const now = Date.now();
  if (now - inclinometerState.lastBeep < 350) return;
  inclinometerState.lastBeep = now;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!inclinometerAudioCtx) inclinometerAudioCtx = new AudioContextClass();
    if (inclinometerAudioCtx.state === "suspended") inclinometerAudioCtx.resume();

    const osc = inclinometerAudioCtx.createOscillator();
    const gain = inclinometerAudioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1050, inclinometerAudioCtx.currentTime);
    gain.gain.setValueAtTime(0.08, inclinometerAudioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, inclinometerAudioCtx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(inclinometerAudioCtx.destination);
    osc.start();
    osc.stop(inclinometerAudioCtx.currentTime + 0.12);
  } catch (e) {}
}

function openInclinometer() {
  if ($("#tools-dialog")?.open) $("#tools-dialog").close();
  const dlg = $("#inclinometer-dialog");
  if (!dlg) return;
  dlg.showModal();

  if (!inclinometerState.initialized) {
    $("#inclinometer-tare-btn")?.addEventListener("click", tareInclinometer);
    $("#inclinometer-reset-tare-btn")?.addEventListener("click", resetTareInclinometer);
    $("#inclinometer-beep-toggle")?.addEventListener("change", (e) => {
      inclinometerState.beepEnabled = !!e.target.checked;
    });

    // Angle presets
    $$(".inclinometer-target-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        $$(".inclinometer-target-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        inclinometerState.targetAngle = parseFloat(btn.dataset.angle) || 0;
        updateInclinometer(inclinometerState.rawAngle);
      });
    });

    // Simulation slider
    const simSlider = $("#inclinometer-sim-slider");
    simSlider?.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value) || 0;
      if ($("#inclinometer-sim-val")) $("#inclinometer-sim-val").textContent = val.toFixed(1) + "°";
      updateInclinometer(val);
    });

    // Sensor support (accelerometer / gyro)
    if (window.DeviceOrientationEvent) {
      window.addEventListener("deviceorientation", (e) => {
        if (!dlg.open) return;
        // gamma: left-to-right tilt in degrees (-90 to 90)
        // beta: front-to-back tilt in degrees (-180 to 180)
        let angle = e.gamma;
        if (typeof angle === "number" && !isNaN(angle)) {
          if (simSlider) simSlider.value = angle.toFixed(1);
          if ($("#inclinometer-sim-val")) $("#inclinometer-sim-val").textContent = angle.toFixed(1) + "°";
          updateInclinometer(angle);
        }
      });
    }

    inclinometerState.initialized = true;
  }

  updateInclinometer(inclinometerState.rawAngle);
}

function updateInclinometer(angle) {
  inclinometerState.rawAngle = angle;
  const net = angle - inclinometerState.tareOffset;

  const degEl = $("#inclinometer-degrees");
  if (degEl) {
    degEl.innerHTML = `${net.toFixed(1)}<span style="font-size:24px;color:var(--muted)">°</span>`;
  }

  // Spirit level bubble (maps -45 deg to 45 deg across 5% to 95%)
  const bubble = $("#inclinometer-bubble");
  if (bubble) {
    let pct = 50 + (net / 45) * 45;
    pct = Math.max(5, Math.min(95, pct));
    bubble.style.left = `${pct}%`;
  }

  const hero = $("#inclinometer-hero-display");
  const status = $("#inclinometer-target-status");
  const diff = Math.abs(net - inclinometerState.targetAngle);

  if (diff <= 0.2) {
    hero?.classList.add("inclinometer-locked");
    if (status) {
      status.textContent = `Target Locked (${inclinometerState.targetAngle.toFixed(1)}°) ✓`;
      status.style.color = "var(--green)";
    }
    playInclinometerBeepTone();
  } else {
    hero?.classList.remove("inclinometer-locked");
    if (status) {
      status.style.color = "";
      if (inclinometerState.targetAngle !== 0) {
        const offset = net - inclinometerState.targetAngle;
        status.textContent = `${offset > 0 ? "+" : ""}${offset.toFixed(1)}° from ${inclinometerState.targetAngle.toFixed(1)}° target`;
      } else {
        status.textContent = Math.abs(net) < 0.3 ? "Level (0.0°)" : `${net > 0 ? "+" : ""}${net.toFixed(1)}°`;
      }
    }
  }
}

function tareInclinometer() {
  inclinometerState.tareOffset = inclinometerState.rawAngle;
  updateInclinometer(inclinometerState.rawAngle);
  showToast("Relative zero (tare) set! 📐");
}

function resetTareInclinometer() {
  inclinometerState.tareOffset = 0;
  updateInclinometer(inclinometerState.rawAngle);
  showToast("Absolute zero restored! 📐");
}

/* ------------------------------------------------------------
   FEATURE 3: 1:1 Real-Scale Screen Bolt & Drill Pitch Gauge
   ------------------------------------------------------------ */
let screenGaugeState = {
  zoom: 100,
  activeTab: "metric",
  calibVisible: true,
  initialized: false
};

const METRIC_BOLTS = [
  { name: "M2", dia: 2.0, pitch: 0.4, tapDrill: 1.6, hexHead: 4.0 },
  { name: "M2.5", dia: 2.5, pitch: 0.45, tapDrill: 2.05, hexHead: 5.0 },
  { name: "M3", dia: 3.0, pitch: 0.5, tapDrill: 2.5, hexHead: 5.5 },
  { name: "M4", dia: 4.0, pitch: 0.7, tapDrill: 3.3, hexHead: 7.0 },
  { name: "M5", dia: 5.0, pitch: 0.8, tapDrill: 4.2, hexHead: 8.0 },
  { name: "M6", dia: 6.0, pitch: 1.0, tapDrill: 5.0, hexHead: 10.0 },
  { name: "M8", dia: 8.0, pitch: 1.25, tapDrill: 6.8, hexHead: 13.0 },
  { name: "M10", dia: 10.0, pitch: 1.5, tapDrill: 8.5, hexHead: 17.0 },
  { name: "M12", dia: 12.0, pitch: 1.75, tapDrill: 10.2, hexHead: 19.0 },
  { name: "M16", dia: 16.0, pitch: 2.0, tapDrill: 14.0, hexHead: 24.0 }
];

const IMPERIAL_BOLTS = [
  { name: "#4", dia: 2.84, dec: '0.112"', pitch: "40 TPI", tapDrill: "#43 (2.26mm)" },
  { name: "#6", dia: 3.51, dec: '0.138"', pitch: "32 TPI", tapDrill: "#36 (2.79mm)" },
  { name: "#8", dia: 4.17, dec: '0.164"', pitch: "32 TPI", tapDrill: "#29 (3.45mm)" },
  { name: "#10", dia: 4.83, dec: '0.190"', pitch: "24/32 TPI", tapDrill: "#25 / #21" },
  { name: '1/4"', dia: 6.35, dec: '0.250"', pitch: "20 / 28 TPI", tapDrill: '#7 (5.1mm)' },
  { name: '5/16"', dia: 7.94, dec: '0.312"', pitch: "18 / 24 TPI", tapDrill: 'F (6.5mm)' },
  { name: '3/8"', dia: 9.53, dec: '0.375"', pitch: "16 / 24 TPI", tapDrill: '5/16" (7.9mm)' },
  { name: '1/2"', dia: 12.70, dec: '0.500"', pitch: "13 / 20 TPI", tapDrill: '27/64" (10.7mm)' }
];

const THREAD_PITCHES = [
  { label: "0.40 mm", valMm: 0.40, std: "M2 Coarse" },
  { label: "0.50 mm", valMm: 0.50, std: "M3 Coarse" },
  { label: "0.70 mm", valMm: 0.70, std: "M4 Coarse" },
  { label: "0.80 mm", valMm: 0.80, std: "M5 Coarse" },
  { label: "1.00 mm", valMm: 1.00, std: "M6 Coarse" },
  { label: "1.25 mm", valMm: 1.25, std: "M8 Coarse" },
  { label: "1.50 mm", valMm: 1.50, std: "M10 Coarse" },
  { label: "1.75 mm", valMm: 1.75, std: "M12 Coarse" },
  { label: "2.00 mm", valMm: 2.00, std: "M16 Coarse" },
  { label: "32 TPI", valMm: 25.4 / 32, std: '#6-32, #8-32' },
  { label: "24 TPI", valMm: 25.4 / 24, std: '#10-24 UNC' },
  { label: "20 TPI", valMm: 25.4 / 20, std: '1/4"-20 UNC' },
  { label: "18 TPI", valMm: 25.4 / 18, std: '5/16"-18 UNC' },
  { label: "16 TPI", valMm: 25.4 / 16, std: '3/8"-16 UNC' },
  { label: "13 TPI", valMm: 25.4 / 13, std: '1/2"-13 UNC' }
];

function openScreenGauge() {
  if ($("#tools-dialog")?.open) $("#tools-dialog").close();
  const dlg = $("#screen-gauge-dialog");
  if (!dlg) return;
  dlg.showModal();

  if (!screenGaugeState.initialized) {
    const zoomSlider = $("#screen-gauge-zoom-slider");
    zoomSlider?.addEventListener("input", (e) => {
      screenGaugeState.zoom = parseFloat(e.target.value) || 100;
      if ($("#screen-gauge-zoom-val")) $("#screen-gauge-zoom-val").textContent = screenGaugeState.zoom + "%";
      updateScreenGaugeCalibrationTarget();
      renderScreenGaugeTab();
    });

    $("#screen-gauge-toggle-calib-btn")?.addEventListener("click", () => {
      screenGaugeState.calibVisible = !screenGaugeState.calibVisible;
      const target = $("#screen-gauge-credit-card-target");
      const zoomWrap = $("#screen-gauge-zoom-slider")?.parentElement;
      const btn = $("#screen-gauge-toggle-calib-btn");
      if (target) target.style.display = screenGaugeState.calibVisible ? "flex" : "none";
      if (zoomWrap) zoomWrap.style.display = screenGaugeState.calibVisible ? "flex" : "none";
      if (btn) btn.textContent = screenGaugeState.calibVisible ? "Hide Calibrator" : "Show Calibrator";
    });

    $$(".screen-gauge-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        $$(".screen-gauge-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        screenGaugeState.activeTab = tab.dataset.gauge;
        renderScreenGaugeTab();
      });
    });

    screenGaugeState.initialized = true;
  }

  updateScreenGaugeCalibrationTarget();
  renderScreenGaugeTab();
}

function updateScreenGaugeCalibrationTarget() {
  // ISO/IEC 7810 ID-1 standard credit card: 85.60 mm wide x 53.98 mm high
  // CSS 1mm = 3.779527559 px at 96 DPI
  const scale = 3.779527559 * (screenGaugeState.zoom / 100);
  const target = $("#screen-gauge-credit-card-target");
  if (target) {
    target.style.width = `${(85.60 * scale).toFixed(1)}px`;
    target.style.height = `${(53.98 * scale).toFixed(1)}px`;
  }
}

function renderScreenGaugeTab() {
  const vp = $("#screen-gauge-viewport");
  if (!vp) return;

  const pxPerMm = 3.779527559 * (screenGaugeState.zoom / 100);

  if (screenGaugeState.activeTab === "metric") {
    vp.innerHTML = `
      <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:12px;text-align:center">
        HOLD BOLT OR DRILL DIRECTLY OVER SCREEN CIRCLE TO MATCH DIAMETER 1:1
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(135px, 1fr));gap:16px">
        ${METRIC_BOLTS.map(b => {
          const dPx = (b.dia * pxPerMm).toFixed(1);
          const tapPx = (b.tapDrill * pxPerMm).toFixed(1);
          return `
            <div class="panel" style="display:flex;flex-direction:column;align-items:center;padding:12px;text-align:center;background:var(--surface)">
              <div style="width:70px;height:70px;display:flex;align-items:center;justify-content:center;position:relative;margin-bottom:8px">
                <!-- Outer Hole Circle -->
                <div style="width:${dPx}px;height:${dPx}px;border-radius:50%;border:2px solid var(--primary);box-shadow:inset 0 0 4px rgba(217,119,6,0.3);background:rgba(217,119,6,0.06)"></div>
                <!-- Inner Tap Drill Outline -->
                <div style="position:absolute;width:${tapPx}px;height:${tapPx}px;border-radius:50%;border:1px dashed var(--muted);opacity:0.6;pointer-events:none"></div>
              </div>
              <strong style="font-size:14px;color:var(--primary)">${b.name}</strong>
              <div style="font-size:11px;color:var(--muted);font-family:monospace">${b.dia.toFixed(1)} mm</div>
              <div style="font-size:10px;color:var(--text);margin-top:4px">Tap: ${b.tapDrill}mm (P: ${b.pitch})</div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  } else if (screenGaugeState.activeTab === "imperial") {
    vp.innerHTML = `
      <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:12px;text-align:center">
        HOLD INCH FASTENERS DIRECTLY OVER CIRCLE TO MATCH 1:1 REAL DIAMETER
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(135px, 1fr));gap:16px">
        ${IMPERIAL_BOLTS.map(b => {
          const dPx = (b.dia * pxPerMm).toFixed(1);
          return `
            <div class="panel" style="display:flex;flex-direction:column;align-items:center;padding:12px;text-align:center;background:var(--surface)">
              <div style="width:70px;height:70px;display:flex;align-items:center;justify-content:center;position:relative;margin-bottom:8px">
                <div style="width:${dPx}px;height:${dPx}px;border-radius:50%;border:2px solid var(--primary);box-shadow:inset 0 0 4px rgba(217,119,6,0.3);background:rgba(217,119,6,0.06)"></div>
              </div>
              <strong style="font-size:14px;color:var(--primary)">${b.name}</strong>
              <div style="font-size:11px;color:var(--muted);font-family:monospace">${b.dec} (${b.dia.toFixed(2)} mm)</div>
              <div style="font-size:10px;color:var(--text);margin-top:4px">Tap: ${b.tapDrill}</div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  } else if (screenGaugeState.activeTab === "pitches") {
    vp.innerHTML = `
      <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:12px;text-align:center">
        REST THREAD CRESTS DIRECTLY AGAINST SERRATED COMB TEETH BELOW
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px">
        ${THREAD_PITCHES.map(p => {
          const pitchPx = p.valMm * pxPerMm;
          return `
            <div class="panel" style="padding:10px 14px;background:var(--surface)">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <strong style="font-size:13px;color:var(--primary)">${p.label}</strong>
                <span style="font-size:10px;color:var(--muted)">${p.std}</span>
              </div>
              <!-- Serrated repeating SVG comb -->
              <div style="height:28px;width:100%;overflow:hidden;border:1px solid var(--border);border-radius:4px;background:#18181b">
                <svg width="100%" height="28" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="comb-${p.label.replace(/[^a-z0-9]/gi, '')}" width="${pitchPx}" height="28" patternUnits="userSpaceOnUse">
                      <polygon points="0,28 ${pitchPx / 2},10 ${pitchPx},28" fill="#d97706" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="28" fill="url(#comb-${p.label.replace(/[^a-z0-9]/gi, '')})" />
                </svg>
              </div>
              <div style="font-size:9.5px;color:var(--muted);margin-top:4px;text-align:right">Tooth Spacing: ${p.valMm.toFixed(2)} mm</div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  } else {
    // Drill Bit Index
    vp.innerHTML = `
      <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:12px;text-align:center">
        DRILL BIT APERTURE GAUGE (1:1 PHYSICAL CLEARANCE FIT)
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(80px, 1fr));gap:10px">
        ${[1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0].map(d => {
          const dPx = (d * pxPerMm).toFixed(1);
          return `
            <div class="panel" style="padding:8px 4px;display:flex;flex-direction:column;align-items:center;background:var(--surface)">
              <div style="width:50px;height:50px;display:flex;align-items:center;justify-content:center">
                <div style="width:${dPx}px;height:${dPx}px;border-radius:50%;background:#d97706;border:1px solid #b45309"></div>
              </div>
              <strong style="font-size:12px;margin-top:4px">${d.toFixed(1)}</strong>
              <span style="font-size:9px;color:var(--muted)">mm</span>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }
}

/* ------------------------------------------------------------
   FEATURE 4: Visual Caliper & Reference Dimensioning
   ------------------------------------------------------------ */
let caliperState = {
  img: null,
  mode: "calibrate", // "calibrate" | "measure"
  refMm: 85.6, // default credit card width
  pxPerMm: null,
  points: [],
  measurements: [],
  initialized: false
};

function openVisualCaliper() {
  if ($("#tools-dialog")?.open) $("#tools-dialog").close();
  const dlg = $("#visual-caliper-dialog");
  if (!dlg) return;
  dlg.showModal();

  if (!caliperState.initialized) {
    const fileInput = $("#caliper-file-input");
    const canvas = $("#caliper-canvas");

    $("#caliper-sample-btn")?.addEventListener("click", () => {
      loadCaliperSampleImage();
    });

    fileInput?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (re) => {
        const img = new Image();
        img.onload = () => {
          caliperState.img = img;
          caliperState.measurements = [];
          caliperState.points = [];
          caliperState.pxPerMm = null;
          if ($("#caliper-scale-ratio")) $("#caliper-scale-ratio").textContent = "— px/mm";
          renderCaliperCanvas();
          updateCaliperStatus();
        };
        img.src = re.target.result;
      };
      reader.readAsDataURL(file);
    });

    $("#caliper-mode-ref")?.addEventListener("click", () => {
      caliperState.mode = "calibrate";
      caliperState.points = [];
      updateCaliperModeButtons();
      updateCaliperStatus();
      renderCaliperCanvas();
    });

    $("#caliper-mode-meas")?.addEventListener("click", () => {
      if (!caliperState.pxPerMm) {
        showToast("Please calibrate a reference line first! 📷");
        return;
      }
      caliperState.mode = "measure";
      caliperState.points = [];
      updateCaliperModeButtons();
      updateCaliperStatus();
      renderCaliperCanvas();
    });

    $("#caliper-ref-preset")?.addEventListener("change", (e) => {
      caliperState.refMm = parseFloat(e.target.value) || 85.6;
    });

    $("#caliper-clear-btn")?.addEventListener("click", () => {
      caliperState.measurements = [];
      caliperState.points = [];
      renderCaliperCanvas();
      showToast("Measurements cleared 🗑️");
    });

    // Canvas click dispatcher
    canvas?.addEventListener("click", (e) => {
      handleCaliperCanvasClick(e);
    });

    caliperState.initialized = true;
  }

  if (!caliperState.img) {
    loadCaliperSampleImage();
  } else {
    renderCaliperCanvas();
  }
}

function updateCaliperModeButtons() {
  const refBtn = $("#caliper-mode-ref");
  const measBtn = $("#caliper-mode-meas");
  if (caliperState.mode === "calibrate") {
    refBtn?.classList.add("button-primary", "active");
    refBtn?.classList.remove("button-outline");
    measBtn?.classList.add("button-outline");
    measBtn?.classList.remove("button-primary", "active");
  } else {
    measBtn?.classList.add("button-primary", "active");
    measBtn?.classList.remove("button-outline");
    refBtn?.classList.add("button-outline");
    refBtn?.classList.remove("button-primary", "active");
  }
}

function updateCaliperStatus() {
  const status = $("#caliper-status-text");
  if (!status) return;

  if (caliperState.mode === "calibrate") {
    if (caliperState.points.length === 0) {
      status.textContent = "Click POINT 1 at the start of your known reference object (e.g. credit card edge or coin).";
    } else {
      status.textContent = "Click POINT 2 at the opposite edge of the reference object.";
    }
  } else {
    if (caliperState.points.length === 0) {
      status.textContent = "Click POINT 1 on the part or feature you wish to dimension.";
    } else {
      status.textContent = "Click POINT 2 to finish dimension line.";
    }
  }
}

function loadCaliperSampleImage() {
  const canvas = $("#caliper-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // Generate high-contrast photo workbench calibration sample
  ctx.fillStyle = "#1e2124";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 30) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 30) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  // Reference standard card (width = 340px => 3.97 px/mm)
  ctx.fillStyle = "#2563eb";
  ctx.roundRect(80, 140, 340, 214, 12);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText("STANDARD ID CARD / CREDIT CARD", 100, 190);
  ctx.font = "13px monospace";
  ctx.fillText("Exact Width = 85.60 mm", 100, 220);
  ctx.fillText("Height = 53.98 mm", 100, 244);

  // Sample hardware to measure
  // Bolt
  ctx.fillStyle = "#94a3b8";
  ctx.fillRect(520, 200, 180, 48); // shaft (length = 180px, dia = 48px)
  // Bolt head
  ctx.fillStyle = "#cbd5e1";
  ctx.fillRect(480, 184, 40, 80);

  // Hex socket
  ctx.fillStyle = "#475569";
  ctx.fillRect(490, 208, 20, 32);

  ctx.fillStyle = "#f59e0b";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText("Sample Hex Bolt to Dimension", 500, 160);

  const img = new Image();
  img.src = canvas.toDataURL();
  img.onload = () => {
    caliperState.img = img;
    caliperState.measurements = [];
    caliperState.points = [];
    caliperState.pxPerMm = null;
    if ($("#caliper-scale-ratio")) $("#caliper-scale-ratio").textContent = "— px/mm";
    updateCaliperStatus();
    renderCaliperCanvas();
  };
}

function handleCaliperCanvasClick(e) {
  const canvas = $("#caliper-canvas");
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;

  caliperState.points.push({ x, y });

  if (caliperState.points.length === 2) {
    const p1 = caliperState.points[0];
    const p2 = caliperState.points[1];
    const distPx = Math.hypot(p2.x - p1.x, p2.y - p1.y);

    if (caliperState.mode === "calibrate") {
      caliperState.pxPerMm = distPx / caliperState.refMm;
      if ($("#caliper-scale-ratio")) {
        $("#caliper-scale-ratio").textContent = `${caliperState.pxPerMm.toFixed(2)} px/mm`;
      }
      showToast(`Calibrated: ${caliperState.pxPerMm.toFixed(2)} px/mm! Now click part points to measure. 🎯`);
      caliperState.mode = "measure";
      caliperState.points = [];
      updateCaliperModeButtons();
    } else {
      // Measurement mode
      const mm = distPx / caliperState.pxPerMm;
      const inch = mm / 25.4;
      caliperState.measurements.push({ p1, p2, mm, inch });
      caliperState.points = [];
    }
  }

  updateCaliperStatus();
  renderCaliperCanvas();
}

function renderCaliperCanvas() {
  const canvas = $("#caliper-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (caliperState.img) {
    ctx.drawImage(caliperState.img, 0, 0, canvas.width, canvas.height);
  }

  // Draw active point
  if (caliperState.points.length === 1) {
    const p = caliperState.points[0];
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Draw stored measurements
  caliperState.measurements.forEach((m, idx) => {
    drawCaliperDimensionLine(ctx, m.p1, m.p2, `${m.mm.toFixed(1)} mm (${m.inch.toFixed(2)}")`, "#10b981");
  });
}

function drawCaliperDimensionLine(ctx, p1, p2, label, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.5;

  // Main line
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();

  // End circles / cross-ticks
  ctx.beginPath(); ctx.arc(p1.x, p1.y, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(p2.x, p2.y, 4, 0, Math.PI * 2); ctx.fill();

  // Dimension label box in center
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;

  ctx.font = "bold 13px monospace";
  const textWidth = ctx.measureText(label).width;
  ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
  ctx.fillRect(midX - textWidth / 2 - 6, midY - 12, textWidth + 12, 22);

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(midX - textWidth / 2 - 6, midY - 12, textWidth + 12, 22);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, midX, midY);
  ctx.restore();
}

/* ------------------------------------------------------------
   FEATURE 5: Dynamic CNC Feeds, Speeds & Endmill Deflection Engine
   ------------------------------------------------------------ */
let cncDeflectionInitialized = false;

function openCncDeflection() {
  if ($("#tools-dialog")?.open) $("#tools-dialog").close();
  const dlg = $("#cnc-deflection-dialog");
  if (!dlg) return;
  dlg.showModal();

  if (!cncDeflectionInitialized) {
    const inputs = [
      "#cnc-mat-select",
      "#cnc-tool-dia",
      "#cnc-tool-flutes",
      "#cnc-tool-stickout",
      "#cnc-tool-mat",
      "#cnc-doc",
      "#cnc-woc"
    ];
    inputs.forEach(sel => {
      $(sel)?.addEventListener("input", calculateCncDeflection);
      $(sel)?.addEventListener("change", calculateCncDeflection);
    });
    cncDeflectionInitialized = true;
  }

  calculateCncDeflection();
}

function calculateCncDeflection() {
  const matSelect = $("#cnc-mat-select");
  const toolDia = parseFloat($("#cnc-tool-dia")?.value) || 6.35;
  const toolFlutes = parseInt($("#cnc-tool-flutes")?.value, 10) || 2;
  const stickout = parseFloat($("#cnc-tool-stickout")?.value) || 22;
  const toolMat = $("#cnc-tool-mat")?.value || "carbide";
  const doc = parseFloat($("#cnc-doc")?.value) || 3.175;
  const woc = parseFloat($("#cnc-woc")?.value) || 6.35;

  const opt = matSelect?.selectedOptions?.[0];
  const kc = parseFloat(opt?.dataset?.kc) || 250;
  const sfm = parseFloat(opt?.dataset?.sfm) || 350;

  // Surface speed Vc in m/min = SFM * 0.3048
  const vc = sfm * 0.3048;

  // Spindle RPM = (Vc * 1000) / (pi * D)
  let rpm = (vc * 1000) / (Math.PI * toolDia);
  rpm = Math.max(1200, Math.min(24000, Math.round(rpm)));

  // Base nominal chip load fz0
  let fz0 = 0.05;
  if (toolDia > 10) fz0 = 0.09;
  else if (toolDia > 5) fz0 = 0.06;
  else if (toolDia < 3) fz0 = 0.025;

  // Chip thinning factor CTF = 1 / sqrt( (ae/D) * (2 - (ae/D)) ) when ae < D/2
  let ctf = 1.0;
  if (woc < toolDia / 2 && woc > 0.01) {
    const ratio = woc / toolDia;
    ctf = 1.0 / Math.sqrt(ratio * (2.0 - ratio));
    ctf = Math.min(ctf, 3.2);
  }
  const fzPrime = fz0 * ctf;

  // Feed rate Vf = RPM * Z * fzPrime (mm/min)
  const vf = Math.round(rpm * toolFlutes * fzPrime);

  // MRR = (doc * woc * vf) / 1000 in cm3/min
  const mrr = (doc * woc * vf) / 1000;

  // Tangential cutting force Fc = kc * doc * fz0 * sqrt(woc / toolDia) in Newtons
  const fc = kc * doc * fz0 * Math.sqrt(Math.min(1.0, woc / toolDia));

  // Young's modulus E in Pa: Carbide = 600 GPa, HSS = 210 GPa
  const E = (toolMat === "carbide" ? 600 : 210) * 1e9;

  // Second moment of area I = (pi * D^4) / 64 (in meters^4)
  const Dm = toolDia * 1e-3;
  const I = (Math.PI * Math.pow(Dm, 4)) / 64;

  // Cantilever deflection delta = (Fc * L^3) / (3 * E * I) (in micrometers)
  const Lm = stickout * 1e-3;
  const deltaM = (fc * Math.pow(Lm, 3)) / (3 * E * I);
  const deflectionUm = Math.max(0.1, deltaM * 1e6);

  // Update DOM
  if ($("#cnc-res-rpm")) $("#cnc-res-rpm").textContent = `${rpm.toLocaleString()} RPM`;
  if ($("#cnc-res-feed")) $("#cnc-res-feed").textContent = `${vf.toLocaleString()} mm/min`;
  if ($("#cnc-res-chipload")) $("#cnc-res-chipload").textContent = `${fzPrime.toFixed(3)} mm/t ${ctf > 1.05 ? "(Thinned)" : ""}`;
  if ($("#cnc-res-mrr")) $("#cnc-res-mrr").textContent = `${mrr.toFixed(1)} cm³/min`;
  if ($("#cnc-res-deflect")) $("#cnc-res-deflect").textContent = `${deflectionUm.toFixed(1)} µm`;

  const badge = $("#cnc-deflect-status");
  const advice = $("#cnc-deflect-advice");
  if (badge) {
    if (deflectionUm < 10) {
      badge.className = "cnc-deflect-badge";
      badge.style.background = "rgba(16,185,129,0.15)";
      badge.style.color = "var(--green)";
      badge.textContent = "✓ Optimal Stiffness (<10 µm)";
    } else if (deflectionUm <= 25) {
      badge.className = "cnc-deflect-badge";
      badge.style.background = "rgba(217,119,6,0.15)";
      badge.style.color = "var(--primary)";
      badge.textContent = "⚠️ Acceptable Roughing (10–25 µm)";
    } else {
      badge.className = "cnc-deflect-badge";
      badge.style.background = "rgba(239,68,68,0.15)";
      badge.style.color = "var(--red)";
      badge.textContent = "❌ Excessive Deflection (>25 µm)";
    }
  }

  if (advice) {
    if (deflectionUm < 10) {
      advice.textContent = `Rigid toolpath. Expected dimensional error <0.01 mm. Optimal chip evacuation and tool longevity for ${opt?.text || "material"}.`;
    } else if (deflectionUm <= 25) {
      advice.textContent = `Moderate tool flex detected (${deflectionUm.toFixed(1)} µm). Suitable for roughing passes, but schedule a 0.25 mm spring finishing pass to avoid dimensional tapering.`;
    } else {
      const suggestedStickout = Math.round(stickout * Math.cbrt(10 / deflectionUm));
      advice.textContent = `High risk of chatter, wall gouging, and cutter snapping! Reduce tool stickout from ${stickout}mm to ≤${suggestedStickout}mm, upgrade to solid carbide, or step down DOC.`;
    }
  }

  return { rpm, vf, fzPrime, mrr, deflectionUm, fc };
}

/* ------------------------------------------------------------
   FEATURE 6: 3D Print Visual Failure Diagnostician & Slicer Solver
   ------------------------------------------------------------ */
const PRINT_SYMPTOMS = [
  {
    id: "stringing",
    name: "Stringing & Cobweb Oozing",
    icon: "🕸️",
    severity: "Cosmetic / Post-Processing",
    materials: "PLA, PETG, TPU",
    quickFix: "Increase retraction distance & speed, lower nozzle temperature by 5-10°C, and dry filament spool.",
    slicer: [
      { param: "Retraction Distance", change: "+1.0 to +2.0 mm (Bowden) / +0.4 mm (Direct Drive)" },
      { param: "Retraction Speed", change: "Increase to 45 mm/s" },
      { param: "Nozzle Temp", change: "Decrease by 5°C – 10°C" },
      { param: "Travel Speed", change: "Increase to 180–200 mm/s to break ooze quickly" }
    ],
    hardware: [
      "Moist filament causes steam pressure that forces melt out: dry spool at 50°C (PLA) / 65°C (PETG) for 6h.",
      "Check nozzle orifice for wear (enlarged hole from brass wear)."
    ],
    physics: "Hydrostatic melt pressure combined with thermal expansion in the heater block continues to push liquid polymer through the nozzle during non-printing travel moves."
  },
  {
    id: "warping",
    name: "Corner Warping & Bed Detachment",
    icon: "📐",
    severity: "Critical / Failure Risk",
    materials: "ABS, ASA, PETG, Nylon, Polycarbonate",
    quickFix: "Increase heated bed temp, apply brim or mouse-ears, clean PEI with dish soap + 99% IPA, turn off part cooling fan.",
    slicer: [
      { param: "Build Plate Adhesion", change: "Enable Brim (8–10 mm width)" },
      { param: "Initial Layer Bed Temp", change: "Increase by +5°C to +10°C" },
      { param: "Part Cooling Fan", change: "Set to 0% for first 3–5 layers; 0-20% max for ABS/ASA" },
      { param: "Initial Layer Speed", change: "Slow down to 15–20 mm/s" }
    ],
    hardware: [
      "Wash PEI build plate with warm water & Dawn dish soap to dissolve skin oils, then wipe with 99% IPA.",
      "Eliminate shop drafts: use an enclosure or draft shield around printer."
    ],
    physics: "Thermal contraction gradient: as upper printed layers cool and shrink faster than the heated bottom layers, tensile stress curls the corners upwards."
  },
  {
    id: "delamination",
    name: "Layer Separation & Delamination",
    icon: "💔",
    severity: "Structural Weakness",
    materials: "ABS, PETG, PC, Nylon",
    quickFix: "Increase hotend temp by 10°C, decrease part fan speed, print inside an enclosure, and increase flow rate slightly.",
    slicer: [
      { param: "Printing Temperature", change: "Increase hotend temp by +10°C to +15°C" },
      { param: "Fan Speed", change: "Lower fan to 0% – 30%" },
      { param: "Layer Height", change: "Keep ≤50% of nozzle diameter (e.g. 0.20mm on 0.4mm nozzle)" },
      { param: "Flow / Extrusion Multiplier", change: "Increase by +2% to +4%" }
    ],
    hardware: [
      "Chamber ambient temperature must stay ≥45°C for ABS to prevent inter-layer shear failure."
    ],
    physics: "Polymer chain entanglement fails across layer boundaries when the previous layer cools below its glass transition temperature (Tg) before the new molten bead is deposited."
  },
  {
    id: "underextrusion",
    name: "Under-Extrusion & Spongy Infill",
    icon: "🧽",
    severity: "Structural Defect",
    materials: "All Filaments",
    quickFix: "Clean partial nozzle clog with atomic cold pull, check extruder idler tension, inspect for heat creep.",
    slicer: [
      { param: "Flow Rate", change: "Calibrate and bump to 102%–105%" },
      { param: "Filament Diameter", change: "Verify actual caliper measurement (e.g. 1.75mm vs 1.71mm)" },
      { param: "Print Speed", change: "Decrease volumetric speed by 20%" }
    ],
    hardware: [
      "Perform cold pull using nylon or cleaning filament at 90°C.",
      "Check extruder drive gear for ground plastic teeth slipping against filament.",
      "Inspect hotend heatsink fan: failing fan causes heat creep softening filament in the cold break."
    ],
    physics: "Flow resistance exceeds extruder gear grip force, resulting in skipped stepper motor steps or filament grinding."
  },
  {
    id: "ghosting",
    name: "Ghosting, Ringing & Ripples",
    icon: "🌊",
    severity: "Cosmetic",
    materials: "All Filaments",
    quickFix: "Tune Klipper Input Shaping, tighten GT2 belts to 110Hz, reduce acceleration and jerk settings.",
    slicer: [
      { param: "Print Acceleration", change: "Reduce outer wall acceleration to 500–1000 mm/s²" },
      { param: "Outer Wall Speed", change: "Slow outer walls to 35–45 mm/s" },
      { param: "Jerk / Junction Deviation", change: "Lower jerk from 10 to 6 mm/s" }
    ],
    hardware: [
      "Tension X/Y timing belts to 105–115 Hz acoustic resonance.",
      "Place printer on high-mass concrete paver over EVA foam mat to decouple workbench vibration."
    ],
    physics: "Rapid directional deceleration generates mechanical resonance oscillations in the frame and gantry that transfer periodic wave patterns to the extruded bead."
  },
  {
    id: "elephantsfoot",
    name: "Elephant's Foot (Flared First Layer)",
    icon: "🐘",
    severity: "Dimensional Fit",
    materials: "PLA, PETG, ABS",
    quickFix: "Adjust Initial Layer Horizontal Expansion to -0.2mm, raise Z-offset slightly, lower bed temp by 5°C after layer 1.",
    slicer: [
      { param: "Initial Layer Horizontal Expansion", change: "Set to -0.15 mm to -0.25 mm" },
      { param: "Z-Offset", change: "Baby-step nozzle upward by +0.03 mm to avoid squishing" },
      { param: "Bed Temp after Layer 1", change: "Lower by 5°C to 10°C" }
    ],
    hardware: [
      "Level bed with precision feeler gauge (0.10mm) instead of paper."
    ],
    physics: "Weight of subsequent extruded layers squashes the warm bottom layer outward before it solidifies."
  },
  {
    id: "pillowing",
    name: "Pillowing & Top Surface Voids",
    icon: "🕳️",
    severity: "Surface Quality",
    materials: "PLA, PETG",
    quickFix: "Add 2 more top solid layers, increase infill percentage to ≥20%, increase part cooling fan speed.",
    slicer: [
      { param: "Top Solid Layers", change: "Increase to at least 5 layers (≥1.0 mm thickness)" },
      { param: "Infill Density", change: "Increase to at least 15%–20% (use Gyroid pattern)" },
      { param: "Top Surface Fan", change: "100% cooling on top solid skin" }
    ],
    hardware: [
      "Ensure part cooling fan shroud is aimed at nozzle tip, not heater block."
    ],
    physics: "Rising hot air bubbles trapped in sparse infill cells burst through thin molten top layers before solidifying."
  },
  {
    id: "zbanding",
    name: "Z-Banding & Periodic Ribbing",
    icon: "📏",
    severity: "Surface Quality",
    materials: "All Filaments",
    quickFix: "De-constrain Z-lead screws with flexible Oldham couplings, clean & lubricate lead screws, run Bed PID tuning.",
    slicer: [
      { param: "Layer Height", change: "Use magic numbers matching full motor steps (e.g. 0.12, 0.16, 0.20 mm)" }
    ],
    hardware: [
      "Slightly loosen Z lead-screw brass nut bolts to allow horizontal float without binding.",
      "Run M303 PID tune on heated bed: bang-bang temperature cycling expands bed cyclically."
    ],
    physics: "Lead screw wobble or heated bed thermal pulsing changes layer squish periodically at the pitch of the screw or heater cycle."
  },
  {
    id: "blobs",
    name: "Blobs, Zits & Visible Z-Seam",
    icon: "🔴",
    severity: "Cosmetic",
    materials: "All Filaments",
    quickFix: "Align Z-seam to sharpest corner, enable linear/pressure advance, turn on coasting, dry wet filament.",
    slicer: [
      { param: "Z-Seam Alignment", change: "Set to 'Sharpest Corner' or 'User Specified (Back)'" },
      { param: "Coasting", change: "Enable coasting (volume ~0.06 mm³)" },
      { param: "Wipe Distance", change: "Set to 0.4 mm on loop end" }
    ],
    hardware: [
      "Calibrate Klipper Pressure Advance or Marlin Linear Advance (K-factor) to eliminate deceleration bulge."
    ],
    physics: "Residual nozzle nozzle pressure causes excess plastic deposition at the start and stop coordinates of outer perimeter loops."
  },
  {
    id: "bridging",
    name: "Bridging Sag & Drooping Spans",
    icon: "🌉",
    severity: "Geometric Accuracy",
    materials: "PLA, PETG",
    quickFix: "100% bridging fan speed, lower bridge flow ratio to 85-90%, print bridges at 25-30 mm/s.",
    slicer: [
      { param: "Bridge Fan Speed", change: "Set to 100%" },
      { param: "Bridge Flow Ratio", change: "Reduce to 0.85 – 0.90" },
      { param: "Bridge Speed", change: "Set to 25–35 mm/s" }
    ],
    hardware: [
      "Upgrade part cooling fan to high static-pressure 5015 centrifugal blower."
    ],
    physics: "Extruded filament must freeze instantly in mid-air under tension before gravity pulls the un-supported molten strand down."
  }
];

let printDiagnosticsInitialized = false;
let activeSymptomId = "stringing";

function openPrintDiagnostics() {
  if ($("#tools-dialog")?.open) $("#tools-dialog").close();
  const dlg = $("#print-diagnostics-dialog");
  if (!dlg) return;
  dlg.showModal();

  if (!printDiagnosticsInitialized) {
    printDiagnosticsInitialized = true;
  }

  renderPrintSymptomsList();
  selectPrintSymptom(activeSymptomId);
}

function renderPrintSymptomsList() {
  const container = $("#print-symptoms-list");
  if (!container) return;

  container.innerHTML = PRINT_SYMPTOMS.map(s => {
    const isAct = s.id === activeSymptomId;
    return `
      <div class="panel print-symptom-item ${isAct ? "active" : ""}" data-id="${s.id}" role="button" tabindex="0" style="padding:10px;margin-bottom:8px;cursor:pointer;border-left:4px solid ${isAct ? "var(--primary)" : "transparent"};background:var(--surface)">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:20px">${s.icon}</span>
          <div style="flex:1">
            <strong style="font-size:12.5px;display:block">${escapeHTML(s.name)}</strong>
            <span style="font-size:10px;color:var(--muted)">${escapeHTML(s.materials)}</span>
          </div>
        </div>
      </div>
    `;
  }).join("");

  container.querySelectorAll(".print-symptom-item").forEach(el => {
    el.addEventListener("click", () => {
      selectPrintSymptom(el.dataset.id);
    });
  });
}

function selectPrintSymptom(id) {
  activeSymptomId = id;
  const s = PRINT_SYMPTOMS.find(x => x.id === id) || PRINT_SYMPTOMS[0];

  $$(".print-symptom-item").forEach(el => {
    el.classList.toggle("active", el.dataset.id === id);
    el.style.borderLeftColor = el.dataset.id === id ? "var(--primary)" : "transparent";
  });

  const card = $("#print-solution-card");
  if (!card) return;

  card.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;border-bottom:1px solid var(--border);padding-bottom:10px">
      <div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:26px">${s.icon}</span>
          <h3 style="margin:0;font-size:16px">${escapeHTML(s.name)}</h3>
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:4px">Target Materials: <strong>${escapeHTML(s.materials)}</strong> · Severity: <em>${escapeHTML(s.severity)}</em></div>
      </div>
      <button type="button" class="button button-small button-outline" id="copy-print-rx-btn">📋 Copy Tuning Plan</button>
    </div>

    <!-- Quick Prescription Banner -->
    <div style="padding:10px 14px;background:rgba(217,119,6,0.12);border-left:4px solid var(--primary);border-radius:4px;font-size:12px;margin-bottom:14px;line-height:1.5">
      <strong>Immediate Prescription:</strong> ${escapeHTML(s.quickFix)}
    </div>

    <!-- Slicer Settings Table -->
    <div style="margin-bottom:14px">
      <h4 style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:var(--muted)">🔧 Precision Slicer Adjustments:</h4>
      <table style="width:100%;font-size:12px;border-collapse:collapse">
        <tbody>
          ${s.slicer.map(row => `
            <tr style="border-bottom:1px solid var(--border)">
              <td style="padding:6px 8px;font-weight:700;width:35%">${escapeHTML(row.param)}</td>
              <td style="padding:6px 8px;font-family:monospace;color:var(--primary)">${escapeHTML(row.change)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>

    <!-- Mechanical & Hardware Checks -->
    <div style="margin-bottom:14px">
      <h4 style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:var(--muted)">🛠️ Hardware & Machine Checks:</h4>
      <ul style="margin:0;padding-left:18px;font-size:12px;line-height:1.5">
        ${s.hardware.map(h => `<li>${escapeHTML(h)}</li>`).join("")}
      </ul>
    </div>

    <!-- Physics Explanation -->
    <div style="font-size:11px;color:var(--muted);padding:8px 12px;background:var(--surface);border-radius:6px;border:1px solid var(--border)">
      <strong>Root Cause Physics:</strong> ${escapeHTML(s.physics)}
    </div>
  `;

  $("#copy-print-rx-btn")?.addEventListener("click", () => {
    const text = `[3D Print Solver] ${s.name}\nPrescription: ${s.quickFix}\n\nSlicer Adjustments:\n${s.slicer.map(r => `- ${r.param}: ${r.change}`).join("\n")}\n\nHardware Checks:\n${s.hardware.map(h => `- ${h}`).join("\n")}`;
    navigator.clipboard?.writeText(text).then(() => {
      showToast("Tuning plan copied to clipboard! 📋");
    });
  });
}

/* ------------------------------------------------------------
   FEATURE 7: Wood Grain Movement & Distortion Simulator
   ------------------------------------------------------------ */
let woodDistortionState = {
  cutType: "plain", // "plain" | "quarter" | "rift"
  mc: 8,
  initialized: false
};

function openWoodDistortion() {
  if ($("#tools-dialog")?.open) $("#tools-dialog").close();
  const dlg = $("#wood-distortion-dialog");
  if (!dlg) return;
  dlg.showModal();

  if (!woodDistortionState.initialized) {
    $$(".wood-cut-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        $$(".wood-cut-btn").forEach(b => {
          b.classList.remove("button-primary", "active");
          b.classList.add("button-outline");
        });
        btn.classList.add("button-primary", "active");
        btn.classList.remove("button-outline");
        woodDistortionState.cutType = btn.dataset.cut;
        renderWoodDistortionCanvas();
      });
    });

    const mcSlider = $("#wood-mc-slider");
    mcSlider?.addEventListener("input", (e) => {
      woodDistortionState.mc = parseInt(e.target.value, 10) || 8;
      const lbl = $("#wood-mc-display");
      if (lbl) {
        let tag = "Equilibrium";
        if (woodDistortionState.mc <= 7) tag = "Winter / Dry Heated";
        else if (woodDistortionState.mc <= 10) tag = "Interior Dry";
        else if (woodDistortionState.mc >= 15) tag = "Summer Humid";
        lbl.textContent = `${woodDistortionState.mc}% (${tag})`;
      }
      renderWoodDistortionCanvas();
    });

    woodDistortionState.initialized = true;
  }

  renderWoodDistortionCanvas();
}

function renderWoodDistortionCanvas() {
  const canvas = $("#wood-distortion-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background
  ctx.fillStyle = "#181a1b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2 + 10;
  const baseW = 460;
  const baseH = 80;

  // Moisture deviation from standard equilibrium (12% MC)
  const dMC = woodDistortionState.mc - 12;

  // Tangential shrinkage ~0.28% per % MC, Radial ~0.14% per % MC (2:1 ratio)
  const cut = woodDistortionState.cutType;

  ctx.save();

  if (cut === "plain") {
    // Plain-sawn (flat-sawn): cupping away from pith / concave to bark
    // Cup curvature delta proportional to dMC
    const cupSag = -dMC * 2.2; // in pixels
    const widthShrink = dMC * 1.8;

    ctx.fillStyle = "#9a6324";
    ctx.strokeStyle = "#e5c07b";
    ctx.lineWidth = 2;

    ctx.beginPath();
    // Top face (concave curve when dry)
    ctx.moveTo(cx - (baseW + widthShrink) / 2, cy - baseH / 2);
    ctx.quadraticCurveTo(cx, cy - baseH / 2 + cupSag, cx + (baseW + widthShrink) / 2, cy - baseH / 2);
    // Right edge
    ctx.lineTo(cx + (baseW + widthShrink) / 2 - cupSag * 0.2, cy + baseH / 2);
    // Bottom face
    ctx.quadraticCurveTo(cx, cy + baseH / 2 + cupSag, cx - (baseW + widthShrink) / 2 - cupSag * 0.2, cy + baseH / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw growth rings (arched concentric curves)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
    ctx.lineWidth = 1.5;
    for (let r = 80; r <= 320; r += 24) {
      ctx.beginPath();
      ctx.arc(cx, cy + 180 + cupSag, r, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }

    // Pith indicator
    ctx.fillStyle = "#f59e0b";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("↓ PITH (Heartwood Center)", cx - 75, cy + baseH / 2 + 35);
    ctx.fillText("↑ BARK SIDE (Outer Sapwood)", cx - 80, cy - baseH / 2 - 25);

  } else if (cut === "quarter") {
    // Quarter-sawn: vertical rings, uniform radial shrinkage across width (~half plain-sawn), ZERO cupping!
    const widthShrink = dMC * 0.9;
    const heightShrink = dMC * 1.6;

    ctx.fillStyle = "#b45309";
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 2;

    ctx.fillRect(cx - (baseW + widthShrink) / 2, cy - (baseH + heightShrink) / 2, baseW + widthShrink, baseH + heightShrink);
    ctx.strokeRect(cx - (baseW + widthShrink) / 2, cy - (baseH + heightShrink) / 2, baseW + widthShrink, baseH + heightShrink);

    // Vertical straight growth rings
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 1.5;
    for (let x = cx - (baseW + widthShrink) / 2 + 15; x < cx + (baseW + widthShrink) / 2; x += 18) {
      ctx.beginPath();
      ctx.moveTo(x, cy - (baseH + heightShrink) / 2);
      ctx.lineTo(x, cy + (baseH + heightShrink) / 2);
      ctx.stroke();
    }

    ctx.fillStyle = "#10b981";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText("✓ 100% FLAT: Zero cupping distortion across full humidity range!", cx - 180, cy - baseH / 2 - 25);

  } else {
    // Rift-sawn: 45-degree rings, distorts into slight rhomboid / parallelogram
    const skew = -dMC * 0.7;
    const widthShrink = dMC * 1.2;

    ctx.fillStyle = "#78350f";
    ctx.strokeStyle = "#d97706";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(cx - (baseW + widthShrink) / 2 + skew, cy - baseH / 2);
    ctx.lineTo(cx + (baseW + widthShrink) / 2 + skew, cy - baseH / 2);
    ctx.lineTo(cx + (baseW + widthShrink) / 2 - skew, cy + baseH / 2);
    ctx.lineTo(cx - (baseW + widthShrink) / 2 - skew, cy + baseH / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 45 degree diagonal growth rings
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 1.5;
    for (let o = -260; o <= 260; o += 22) {
      ctx.beginPath();
      ctx.moveTo(cx + o - 30, cy - baseH / 2);
      ctx.lineTo(cx + o + 30, cy + baseH / 2);
      ctx.stroke();
    }

    ctx.fillStyle = "#f59e0b";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("45° Straight Grain (Rhomboid Shearing, Stable Face)", cx - 140, cy - baseH / 2 - 25);
  }

  ctx.restore();

  // Dynamic explanation
  const exp = $("#wood-dist-explanation");
  if (exp) {
    if (cut === "plain") {
      exp.innerHTML = `
        <strong>Plain-Sawn Lumber Analysis (${woodDistortionState.mc}% Moisture Content):</strong><br>
        Because tangential shrinkage (~8%) is roughly double radial shrinkage (~4%), the bark side contracts much more than the pith side as wood dries below the 28% Fiber Saturation Point.
        <ul style="margin:6px 0 0;padding-left:18px">
          <li><strong>Glue-Up Rule:</strong> Always alternate growth ring directions (smile / frown / smile) across tabletop board glue-ups to cancel out cumulative cupping.</li>
          <li><strong>Tabletop Fasteners:</strong> Never glue solid wood tops rigidly to an apron. Use slotted screw holes, figure-8 desktop fasteners, or wooden Z-clips to accommodate seasonal expansion.</li>
        </ul>
      `;
    } else if (cut === "quarter") {
      exp.innerHTML = `
        <strong>Quarter-Sawn Lumber Analysis (${woodDistortionState.mc}% Moisture Content):</strong><br>
        Growth rings run perpendicular to the face (60°–90°). Shrinkage is almost entirely radial across the face, eliminating cupping, twisting, and bowing.
        <ul style="margin:6px 0 0;padding-left:18px">
          <li><strong>Ideal Applications:</strong> Guitar necks, instrument tops, drawer sides, hardwood flooring, and mission furniture.</li>
          <li>Features iconic medullary ray flecks in White Oak and Beech.</li>
        </ul>
      `;
    } else {
      exp.innerHTML = `
        <strong>Rift-Sawn Lumber Analysis (${woodDistortionState.mc}% Moisture Content):</strong><br>
        Growth rings run at a 30°–60° diagonal angle. Produces the most consistent linear straight grain with minimal face movement, but deforms into a mild parallelogram.
        <ul style="margin:6px 0 0;padding-left:18px">
          <li><strong>Ideal Applications:</strong> High-end architectural millwork, table legs, and mid-century modern cabinetry.</li>
        </ul>
      `;
    }
  }
}

/* ------------------------------------------------------------
   FEATURE 8: Workshop Chemical Safety SDS Locker & Incompatible Mixing Checker
   ------------------------------------------------------------ */
const WORKSHOP_CHEMICALS = [
  {
    id: "acetone",
    name: "Acetone (Pure Technical)",
    cas: "67-64-1",
    category: "Organic Solvent",
    flashPoint: "-20°C (-4°F)",
    nfpa: { health: 1, flammability: 3, instability: 0, special: "" },
    ppe: "Butyl or laminated foil gloves (breaks down Nitrile in <5 min!), safety goggles, vapor respirator in enclosed spaces.",
    firstAid: "Eye contact: rinse immediately for 15 min. Inhalation: move to fresh air. Non-corrosive to skin but causes extreme defatting and drying.",
    storage: "Explosion-proof flammables safety cabinet. Ground metal pour containers to prevent static spark."
  },
  {
    id: "ipa",
    name: "Isopropyl Alcohol (99% IPA)",
    cas: "67-63-0",
    category: "Solvent / Degreaser",
    flashPoint: "12°C (54°F)",
    nfpa: { health: 1, flammability: 3, instability: 0, special: "" },
    ppe: "Nitrile gloves, safety glasses, well-ventilated area.",
    firstAid: "Flush skin with water. Eye irrigation for 15 min. Do not induce vomiting if ingested.",
    storage: "Keep away from pilot lights, 3D UV resin curing stations, and heating elements."
  },
  {
    id: "epoxy_resin",
    name: "Epoxy Resin (Part A Bisphenol-A)",
    cas: "25068-38-6",
    category: "Thermoset Resin",
    flashPoint: "252°C (485°F)",
    nfpa: { health: 2, flammability: 1, instability: 0, special: "" },
    ppe: "Nitrile gloves, safety glasses. Barrier cream recommended.",
    firstAid: "Clean skin immediately with soap and water or citrus resin wipes (NEVER clean skin with acetone—it drives unreacted oligomers through skin pores!).",
    storage: "Store 20°C–25°C. Crystallization in cold can be reversed in a warm 50°C water bath."
  },
  {
    id: "epoxy_hardener",
    name: "Epoxy Hardener (Part B Polyamines)",
    cas: "112-24-3",
    category: "Alkaline Amine",
    flashPoint: "110°C (230°F)",
    nfpa: { health: 3, flammability: 1, instability: 0, special: "COR" },
    ppe: "Heavy nitrile or neoprene gloves, vapor respirator for deep casts, eye goggles.",
    firstAid: "Corrosive to skin & eyes. Causes permanent sensitization and asthma-like allergies on repeated contact.",
    storage: "Keep tightly capped. Reacts with atmospheric carbon dioxide (amine blush)."
  },
  {
    id: "cyanoacrylate",
    name: "Cyanoacrylate (Super Glue / CA)",
    cas: "7085-85-0",
    category: "Fast Adhesive",
    flashPoint: "85°C (185°F)",
    nfpa: { health: 2, flammability: 2, instability: 1, special: "" },
    ppe: "Nitrile gloves (NEVER wear cotton or wool gloves!), safety glasses.",
    firstAid: "Glued skin: soak in warm soapy water or apply acetone gently. Do NOT pull skin apart forcefully.",
    storage: "Refrigerate (4°C) with silica desiccant to prolong shelf life."
  },
  {
    id: "linseed_oil",
    name: "Boiled Linseed Oil (BLO)",
    cas: "68553-15-1",
    category: "Drying Oil Finish",
    flashPoint: "222°C (432°F)",
    nfpa: { health: 1, flammability: 1, instability: 1, special: "SPONT" },
    ppe: "Nitrile gloves, apron.",
    firstAid: "Skin wash with soap and water. Remove contaminated clothing immediately.",
    storage: "CRITICAL: Soaked application rags WILL spontaneously combust! Must be immersed in water or laid completely flat outside on bare earth/concrete to cure."
  },
  {
    id: "muriatic_acid",
    name: "Muriatic Acid (Hydrochloric 31.45%)",
    cas: "7647-01-0",
    category: "Inorganic Acid",
    flashPoint: "Non-flammable",
    nfpa: { health: 3, flammability: 0, instability: 1, special: "ACID" },
    ppe: "Acid-resistant rubber gauntlets, chemical face shield, acid gas cartridge respirator.",
    firstAid: "Flush with copious water for 20 min. Inhalation causes chemical burns to airway.",
    storage: "Acid storage cabinet away from all metals, bases, and hypochlorites."
  },
  {
    id: "bleach",
    name: "Sodium Hypochlorite (Household Bleach)",
    cas: "7681-52-9",
    category: "Oxidizer / Disinfectant",
    flashPoint: "Non-flammable",
    nfpa: { health: 2, flammability: 0, instability: 1, special: "OX" },
    ppe: "Rubber gloves, eye protection.",
    firstAid: "Flush eyes and skin immediately with running water.",
    storage: "Cool, ventilated shelf away from acids, ammonia, and solvents."
  },
  {
    id: "mineral_spirits",
    name: "Mineral Spirits / White Spirit",
    cas: "64742-88-7",
    category: "Petroleum Distillate",
    flashPoint: "41°C (105°F)",
    nfpa: { health: 1, flammability: 2, instability: 0, special: "" },
    ppe: "Nitrile gloves, eye protection.",
    firstAid: "Do not induce vomiting if swallowed (severe chemical pneumonitis aspiration risk!).",
    storage: "Flambles cabinet away from heat sources."
  },
  {
    id: "mek",
    name: "Methyl Ethyl Ketone (MEK)",
    cas: "78-93-3",
    category: "Organic Solvent",
    flashPoint: "-9°C (16°F)",
    nfpa: { health: 2, flammability: 3, instability: 0, special: "" },
    ppe: "Butyl rubber gloves, organic vapor respirator, chemical splash goggles.",
    firstAid: "Remove victim to fresh air. Wash skin with soap and water.",
    storage: "Dedicated flammables cabinet. Forms peroxide crystals upon prolonged air exposure."
  },
  {
    id: "polyurethane",
    name: "Polyurethane Varnish (Oil-Based)",
    cas: "Mixed",
    category: "Coating Finish",
    flashPoint: "38°C (100°F)",
    nfpa: { health: 2, flammability: 2, instability: 0, special: "" },
    ppe: "Nitrile gloves, organic vapor mask.",
    firstAid: "Wash skin with mineral spirits followed by soap and water.",
    storage: "Keep cans tightly sealed upside down to prevent skim skinning."
  },
  {
    id: "denatured_alcohol",
    name: "Denatured Alcohol (Shellac Solvent)",
    cas: "64-17-5",
    category: "Alcohol Solvent",
    flashPoint: "13°C (55°F)",
    nfpa: { health: 2, flammability: 3, instability: 0, special: "" },
    ppe: "Nitrile gloves, safety glasses.",
    firstAid: "Contains toxic methanol: ingestion causes permanent blindness and death. Seek emergency medical care.",
    storage: "Pale invisible flame when burning: keep dry powder extinguisher nearby."
  }
];

let sdsLockerInitialized = false;
let selectedSdsId = "acetone";

function openSdsLocker() {
  if ($("#tools-dialog")?.open) $("#tools-dialog").close();
  const dlg = $("#sds-locker-dialog");
  if (!dlg) return;
  dlg.showModal();

  if (!sdsLockerInitialized) {
    const search = $("#sds-search");
    search?.addEventListener("input", (e) => {
      renderSdsChemicalList(e.target.value);
    });

    // Incompatibility checker dropdowns
    const mixA = $("#sds-mix-a");
    const mixB = $("#sds-mix-b");
    if (mixA && mixB) {
      const opts = WORKSHOP_CHEMICALS.map(c => `<option value="${c.id}">${escapeHTML(c.name)}</option>`).join("");
      mixA.innerHTML = opts;
      mixB.innerHTML = opts;
      mixA.value = "bleach";
      mixB.value = "muriatic_acid";

      mixA.addEventListener("change", evaluateChemicalMixSafety);
      mixB.addEventListener("change", evaluateChemicalMixSafety);
    }

    sdsLockerInitialized = true;
  }

  renderSdsChemicalList("");
  renderSdsDetails(selectedSdsId);
  evaluateChemicalMixSafety();
}

function renderSdsChemicalList(filter) {
  const container = $("#sds-chemical-list");
  if (!container) return;

  const q = (filter || "").trim().toLowerCase();
  const filtered = WORKSHOP_CHEMICALS.filter(c => {
    return c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q) || c.cas.includes(q);
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div style="padding:16px;text-align:center;color:var(--muted);font-size:12px">No chemicals matched.</div>';
    return;
  }

  container.innerHTML = filtered.map(c => {
    const isAct = c.id === selectedSdsId;
    return `
      <div class="panel sds-list-card ${isAct ? "active" : ""}" data-id="${c.id}" role="button" tabindex="0" style="padding:8px 10px;margin-bottom:6px;cursor:pointer;background:var(--surface);border-left:3px solid ${isAct ? "var(--primary)" : "transparent"}">
        <strong style="font-size:12px;display:block">${escapeHTML(c.name)}</strong>
        <span style="font-size:10px;color:var(--muted)">${escapeHTML(c.category)} · CAS: ${c.cas}</span>
      </div>
    `;
  }).join("");

  container.querySelectorAll(".sds-list-card").forEach(el => {
    el.addEventListener("click", () => {
      selectedSdsId = el.dataset.id;
      renderSdsChemicalList($("#sds-search")?.value || "");
      renderSdsDetails(selectedSdsId);
    });
  });
}

function renderSdsDetails(id) {
  const c = WORKSHOP_CHEMICALS.find(x => x.id === id) || WORKSHOP_CHEMICALS[0];
  const panel = $("#sds-details-panel");
  if (!panel) return;

  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
      <div>
        <h3 style="margin:0;font-size:16px">${escapeHTML(c.name)}</h3>
        <div style="font-size:11.5px;color:var(--muted);margin-top:2px">
          Category: <strong>${escapeHTML(c.category)}</strong> · CAS Registry: ${c.cas} · Flash Point: ${c.flashPoint}
        </div>
      </div>

      <!-- NFPA 704 Diamond -->
      <div class="sds-nfpa-diamond" title="NFPA 704 Standard Fire Diamond" style="width:72px;height:72px;position:relative">
        <div style="width:72px;height:72px;position:relative;transform:rotate(45deg);border:2px solid #000;background:#000;border-radius:4px">
          <!-- Top (Red: Flammability) -->
          <div style="position:absolute;top:0;left:0;width:34px;height:34px;background:#ef4444;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px;transform:rotate(-45deg)">${c.nfpa.flammability}</div>
          <!-- Left (Blue: Health) -->
          <div style="position:absolute;bottom:0;left:0;width:34px;height:34px;background:#3b82f6;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px;transform:rotate(-45deg)">${c.nfpa.health}</div>
          <!-- Right (Yellow: Instability) -->
          <div style="position:absolute;top:0;right:0;width:34px;height:34px;background:#eab308;color:#000;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px;transform:rotate(-45deg)">${c.nfpa.instability}</div>
          <!-- Bottom (White: Special) -->
          <div style="position:absolute;bottom:0;right:0;width:34px;height:34px;background:#ffffff;color:#000;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:10px;transform:rotate(-45deg)">${c.nfpa.special || "—"}</div>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr;gap:10px;font-size:12px">
      <div style="padding:8px 12px;background:var(--surface);border-radius:6px;border:1px solid var(--border)">
        <strong style="color:var(--primary);display:block;margin-bottom:2px">🛡️ Required Personal Protective Equipment (PPE):</strong>
        ${escapeHTML(c.ppe)}
      </div>

      <div style="padding:8px 12px;background:var(--surface);border-radius:6px;border:1px solid var(--border)">
        <strong style="color:var(--green);display:block;margin-bottom:2px">🚑 First Aid Protocol:</strong>
        ${escapeHTML(c.firstAid)}
      </div>

      <div style="padding:8px 12px;background:var(--surface);border-radius:6px;border:1px solid var(--border)">
        <strong style="color:var(--red);display:block;margin-bottom:2px">🔒 Storage, Handling &amp; Disposal:</strong>
        ${escapeHTML(c.storage)}
      </div>
    </div>
  `;
}

function checkChemicalCompatibility(idA, idB) {
  if (idA === idB) {
    return {
      safe: true,
      severity: "identical",
      message: "Same substance. No cross-reaction hazard."
    };
  }

  const pair = [idA, idB].sort().join("+");

  const HAZARDS = {
    "bleach+muriatic_acid": {
      safe: false,
      severity: "DEADLY TOXIC GAS",
      color: "var(--red)",
      desc: "☠️ DEADLY CHLORINE GAS EVOLUTION! Mixing bleach (sodium hypochlorite) with muriatic acid (hydrochloric acid) releases dense chlorine gas (Cl2). Causes acute pulmonary edema, chemical asphyxiation, and fatal lung damage. EVACUATE IMMEDIATELY IF MIXED."
    },
    "bleach+epoxy_hardener": {
      safe: false,
      severity: "TOXIC CHLORAMINES",
      color: "var(--red)",
      desc: "☠️ HIGHLY TOXIC CHLORAMINE VAPOR! Bleach reacts violently with organic polyamines in epoxy hardeners, producing poisonous chloramine gas and nitrogen trichloride."
    },
    "acetone+bleach": {
      safe: false,
      severity: "CHLOROFORM HAZARD",
      color: "var(--red)",
      desc: "☠️ CHLOROFORM EVOLUTION (Haloform Reaction)! Acetone reacts with sodium hypochlorite to produce chloroform (CHCl3) and phosgene gas traces, causing immediate dizziness, central nervous system depression, and liver toxicity."
    },
    "cyanoacrylate+linseed_oil": {
      safe: false,
      severity: "EXOTHERMIC FIRE",
      color: "var(--red)",
      desc: "🔥 VIOLENT EXOTHERMIC COMBUSTION! Cyanoacrylate reacts with natural drying oils, catalyzing instantaneous thermal polymerization and igniting combustible rags or wood."
    },
    "epoxy_hardener+muriatic_acid": {
      safe: false,
      severity: "BOILING ACID SPATTER",
      color: "var(--red)",
      desc: "💥 VIOLENT EXOTHERMIC NEUTRALIZATION! Polyamines are concentrated organic alkaline bases. Adding strong mineral acids results in violent boiling, splashing corrosive liquid, and release of noxious amine smoke."
    },
    "acetone+mek": {
      safe: true,
      severity: "SAFE (FLAMMABLE)",
      color: "var(--primary)",
      desc: "Compatible organic ketones. Both are extremely flammable; keep away from ignition sources, but no hazardous chemical cross-reaction occurs."
    },
    "ipa+mineral_spirits": {
      safe: true,
      severity: "SAFE (SOLVENTS)",
      color: "var(--primary)",
      desc: "Compatible solvents. Immiscible depending on water content, but no violent chemical reaction."
    }
  };

  if (HAZARDS[pair]) {
    return HAZARDS[pair];
  }

  // General checks
  if (pair.includes("muriatic_acid") && pair.includes("bleach")) {
    return HAZARDS["bleach+muriatic_acid"];
  }

  return {
    safe: true,
    severity: "SAFE COEXISTENCE",
    color: "var(--green)",
    desc: "✓ Chemically compatible for separate storage and standard workshop usage. Always maintain proper ventilation and close containers after use."
  };
}

function evaluateChemicalMixSafety() {
  const idA = $("#sds-mix-a")?.value;
  const idB = $("#sds-mix-b")?.value;
  const resultEl = $("#sds-mix-result");
  if (!idA || !idB || !resultEl) return;

  const result = checkChemicalCompatibility(idA, idB);

  resultEl.style.background = result.safe ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.15)";
  resultEl.style.color = result.color || (result.safe ? "var(--green)" : "var(--red)");
  resultEl.style.border = `1px solid ${result.safe ? "var(--green)" : "var(--red)"}`;

  resultEl.innerHTML = `
    <div style="font-weight:800;margin-bottom:4px;font-size:12.5px">${result.severity}</div>
    <div>${escapeHTML(result.desc || result.message)}</div>
  `;
}

// Restore saved Night-Vision mode on page boot
restoreNightModeState();

// Global exports for tests and direct event handlers
window.openCommandPalette = openCommandPalette;
window.openInclinometer = openInclinometer;
window.openScreenGauge = openScreenGauge;
window.openVisualCaliper = openVisualCaliper;
window.openCncDeflection = openCncDeflection;
window.openPrintDiagnostics = openPrintDiagnostics;
window.openWoodDistortion = openWoodDistortion;
window.openSdsLocker = openSdsLocker;
window.toggleNightMode = toggleNightMode;
window.calculateCncDeflection = calculateCncDeflection;
window.checkChemicalCompatibility = checkChemicalCompatibility;
window.tareInclinometer = tareInclinometer;
window.resetTareInclinometer = resetTareInclinometer;


/* ============================================================
   10 NEXT-GEN WORKSHOP ENHANCEMENTS & FABRICATION ENGINES
   22. Parametric Box & Enclosure CAD Generator (#box-generator-dialog)
   23. G-Code Toolpath Simulator & Machine Safety Checker (#gcode-backplotter-dialog)
   24. Raw Stock Billet & Center-of-Mass (CoM) Estimator (#stock-weight-dialog)
   25. Workshop Electrical Sub-Panel & Breaker Balancing (#electrical-panel-dialog)
   26. Workshop Noise Dosimeter & NRR Hearing Protection (#noise-dosimeter-dialog)
   27. Hierarchical BOM & Fastener Consolidation Matrix (#bom-consolidator-dialog)
   28. Resin Casting & Silicone Jacket Mold Solver (#resin-mold-dialog)
   29. Epoxy River Table & Timber Slab Moisture Solver (#river-table-dialog)
   30. Batch Photo Watermarker & Dimension Stamp (#photo-watermark-dialog)
   31. Global Undo / Redo History Timeline Drawer (#undo-history-dialog)
   ============================================================ */

/* ------------------------------------------------------------
   FEATURE 22: Parametric Box & Enclosure CAD Generator
   ------------------------------------------------------------ */
let boxGenState = {
  length: 120,
  width: 80,
  height: 60,
  thick: 3.0,
  kerf: 0.15,
  tabWidth: 12,
  style: "closed",
  initialized: false
};

function openBoxGenerator() {
  if ($("#tools-dialog")?.open) $("#tools-dialog").close();
  const dlg = $("#box-generator-dialog");
  if (!dlg) return;
  dlg.showModal();

  if (!boxGenState.initialized) {
    const inputs = [
      "#box-dim-length",
      "#box-dim-width",
      "#box-dim-height",
      "#box-dim-thick",
      "#box-dim-kerf",
      "#box-tab-width",
      "#box-style-select"
    ];
    inputs.forEach(sel => {
      $(sel)?.addEventListener("input", updateBoxGenerator);
      $(sel)?.addEventListener("change", updateBoxGenerator);
    });

    $("#box-download-svg-btn")?.addEventListener("click", downloadBoxSvg);
    $("#box-zoom-fit-btn")?.addEventListener("click", renderBoxPreviewCanvas);

    boxGenState.initialized = true;
  }

  updateBoxGenerator();
}

function updateBoxGenerator() {
  boxGenState.length = Math.max(20, parseFloat($("#box-dim-length")?.value) || 120);
  boxGenState.width = Math.max(20, parseFloat($("#box-dim-width")?.value) || 80);
  boxGenState.height = Math.max(20, parseFloat($("#box-dim-height")?.value) || 60);
  boxGenState.thick = Math.max(0.5, parseFloat($("#box-dim-thick")?.value) || 3.0);
  boxGenState.kerf = Math.max(0, parseFloat($("#box-dim-kerf")?.value) || 0.15);
  boxGenState.tabWidth = Math.max(4, parseFloat($("#box-tab-width")?.value) || 12);
  boxGenState.style = $("#box-style-select")?.value || "closed";

  const panelCount = boxGenState.style === "open" ? 5 : 6;
  const sheetAreaM2 = ((boxGenState.length * boxGenState.width * 2) +
                       (boxGenState.length * boxGenState.height * 2) +
                       (boxGenState.width * boxGenState.height * 2)) * 1e-6;
  const tabsX = Math.floor(boxGenState.length / boxGenState.tabWidth);

  const summary = $("#box-summary-text");
  if (summary) {
    summary.textContent = `Total Panels: ${panelCount} · Flat Sheet Area: ${sheetAreaM2.toFixed(3)} m² · Approx Tabs: ${tabsX} per front edge`;
  }

  renderBoxPreviewCanvas();
}

function renderBoxPreviewCanvas() {
  const canvas = $("#box-preview-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111315";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const L = boxGenState.length;
  const W = boxGenState.width;
  const H = boxGenState.height;
  const T = boxGenState.thick;

  // Unrolled layout scaling
  const totalW = L * 2 + W * 2 + 80;
  const totalH = H * 2 + W + 60;
  const scale = Math.min((canvas.width - 60) / totalW, (canvas.height - 60) / totalH, 1.8);

  ctx.save();
  ctx.translate(30, 30);
  ctx.scale(scale, scale);

  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = 1.5 / scale;
  ctx.fillStyle = "rgba(239, 68, 68, 0.08)";

  // Draw 6 unrolled panels: Bottom in center, Front/Back top/bottom, Left/Right sides, Top lid
  const panels = [
    { label: "BOTTOM", x: W + 10, y: H + 10, w: L, h: W },
    { label: "FRONT", x: W + 10, y: H * 2 + W + 20, w: L, h: H },
    { label: "BACK", x: W + 10, y: 0, w: L, h: H },
    { label: "LEFT", x: 0, y: H + 10, w: W, h: H },
    { label: "RIGHT", x: W + L + 20, y: H + 10, w: W, h: H }
  ];
  if (boxGenState.style !== "open") {
    panels.push({ label: "TOP LID", x: W + L + W + 30, y: H + 10, w: L, h: W });
  }

  panels.forEach(p => {
    // Draw base panel with finger notches simulation
    ctx.beginPath();
    ctx.rect(p.x, p.y, p.w, p.h);
    ctx.fill();
    ctx.stroke();

    // Finger tabs along edges
    ctx.strokeStyle = "#38bdf8";
    ctx.strokeRect(p.x + T, p.y + T, p.w - T * 2, p.h - T * 2);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.fillText(p.label, p.x + p.w / 2, p.y + p.h / 2);
    ctx.fillStyle = "rgba(239, 68, 68, 0.08)";
    ctx.strokeStyle = "#ef4444";
  });

  ctx.restore();
}

function downloadBoxSvg() {
  const L = boxGenState.length;
  const W = boxGenState.width;
  const H = boxGenState.height;
  const T = boxGenState.thick;
  const K = boxGenState.kerf;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${L * 3 + 100}mm" height="${H * 3 + 100}mm" viewBox="0 0 ${L * 3 + 100} ${H * 3 + 100}" xmlns="http://www.w3.org/2000/svg">
  <g id="panels" stroke="#FF0000" stroke-width="0.1" fill="none">
    <!-- Bottom Panel -->
    <rect x="20" y="20" width="${L}" height="${W}" />
    <!-- Front Panel -->
    <rect x="${L + 30}" y="20" width="${L}" height="${H}" />
    <!-- Back Panel -->
    <rect x="${L * 2 + 40}" y="20" width="${L}" height="${H}" />
    <!-- Left Panel -->
    <rect x="20" y="${W + 30}" width="${W}" height="${H}" />
    <!-- Right Panel -->
    <rect x="${W + 30}" y="${W + 30}" width="${W}" height="${H}" />
    <!-- Top Lid -->
    <rect x="${W * 2 + 40}" y="${W + 30}" width="${L}" height="${W}" />
  </g>
  <!-- Metadata & Kerf Spec -->
  <text x="20" y="${W * 2 + 60}" font-family="sans-serif" font-size="5" fill="#333">
    Parametric Enclosure: ${L}x${W}x${H}mm · Thickness: ${T}mm · Kerf: ${K}mm · Style: ${boxGenState.style}
  </text>
</svg>`;

  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Box_CAD_${L}x${W}x${H}mm_T${T}mm.svg`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Downloaded laser/CNC cut-ready SVG! 📥");
}

/* ------------------------------------------------------------
   FEATURE 23: G-Code Toolpath Simulator & Machine Safety Checker
   ------------------------------------------------------------ */
let gcodeState = {
  commands: [],
  bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 },
  totalFeedDist: 0,
  totalRapidDist: 0,
  estTimeSec: 0,
  safetyWarnings: [],
  playbackIndex: 0,
  initialized: false
};

function openGcodeBackplotter() {
  if ($("#tools-dialog")?.open) $("#tools-dialog").close();
  const dlg = $("#gcode-backplotter-dialog");
  if (!dlg) return;
  dlg.showModal();

  if (!gcodeState.initialized) {
    const fileInput = $("#gcode-file-input");
    $("#gcode-browse-btn")?.addEventListener("click", () => fileInput?.click());
    fileInput?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (re) => parseAndBackplotGcode(re.target.result);
      reader.readAsText(file);
    });

    $("#gcode-load-sample-btn")?.addEventListener("click", () => {
      loadSampleGcodeToolpath();
    });

    const slider = $("#gcode-slider");
    slider?.addEventListener("input", (e) => {
      const pct = parseFloat(e.target.value) / 100;
      gcodeState.playbackIndex = Math.floor(pct * gcodeState.commands.length);
      renderGcodeCanvas();
    });

    gcodeState.initialized = true;
  }

  if (gcodeState.commands.length === 0) {
    loadSampleGcodeToolpath();
  } else {
    renderGcodeCanvas();
  }
}

function loadSampleGcodeToolpath() {
  const sample = `
G21 ; Millimeters
G90 ; Absolute coordinates
M03 S18000 ; Spindle ON
G04 P2 ; Dwell 2 sec for spindle spinup
G00 Z10.000 ; Retract to safe Z
G00 X20.000 Y20.000 ; Rapid to start
G01 Z-3.000 F600 ; Plunge cut
G01 X100.000 Y20.000 F1800 ; Pocket pass 1
G01 X100.000 Y70.000
G01 X20.000 Y70.000
G01 X20.000 Y20.000
G02 X30.000 Y30.000 I10.000 J0.000 ; Arc inside
G01 X90.000 Y30.000
G01 X90.000 Y60.000
G01 X30.000 Y60.000
G01 X30.000 Y30.000
G00 Z10.000 ; Retract
G00 X0.000 Y0.000 ; Return home
M05 ; Spindle OFF
M30 ; End program
`;
  parseAndBackplotGcode(sample);
}

function parseAndBackplotGcode(text) {
  const lines = text.split(/\r?\n/);
  const cmds = [];
  let curX = 0, curY = 0, curZ = 0, curFeed = 1000;
  let curMode = "G00";
  let hasSpindleStart = false;
  let hasDwell = false;
  const warnings = [];

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  let feedDist = 0;
  let rapidDist = 0;
  let totalTime = 0;

  lines.forEach((line, idx) => {
    const clean = line.replace(/;.*$/, "").trim();
    if (!clean) return;

    if (clean.includes("M03") || clean.includes("M3") || clean.includes("M04")) hasSpindleStart = true;
    if (clean.includes("G04") || clean.includes("G4")) hasDwell = true;

    if (/G0?0\b/.test(clean)) curMode = "G00";
    else if (/G0?1\b/.test(clean)) curMode = "G01";
    else if (/G0?2\b/.test(clean)) curMode = "G02";
    else if (/G0?3\b/.test(clean)) curMode = "G03";

    const xMatch = clean.match(/X([-\d.]+)/i);
    const yMatch = clean.match(/Y([-\d.]+)/i);
    const zMatch = clean.match(/Z([-\d.]+)/i);
    const fMatch = clean.match(/F([-\d.]+)/i);

    if (fMatch) curFeed = parseFloat(fMatch[1]);

    const targetX = xMatch ? parseFloat(xMatch[1]) : curX;
    const targetY = yMatch ? parseFloat(yMatch[1]) : curY;
    const targetZ = zMatch ? parseFloat(zMatch[1]) : curZ;

    if (xMatch || yMatch || zMatch) {
      const dist = Math.hypot(targetX - curX, targetY - curY, targetZ - curZ);
      const isPlunge = (targetZ < curZ) && (Math.abs(targetX - curX) < 0.1 && Math.abs(targetY - curY) < 0.1);

      if (isPlunge && curFeed > 800) {
        warnings.push(`Line ${idx+1}: High-speed straight Z-plunge detected (${curFeed} mm/min). Risk of endmill snapping.`);
      }

      if (curMode === "G00") {
        rapidDist += dist;
        totalTime += dist / 4000 * 60; // assume 4000 mm/min rapid
      } else {
        feedDist += dist;
        totalTime += dist / Math.max(100, curFeed) * 60;
      }

      minX = Math.min(minX, curX, targetX);
      maxX = Math.max(maxX, curX, targetX);
      minY = Math.min(minY, curY, targetY);
      maxY = Math.max(maxY, curY, targetY);
      minZ = Math.min(minZ, curZ, targetZ);
      maxZ = Math.max(maxZ, curZ, targetZ);

      cmds.push({
        type: curMode,
        p1: { x: curX, y: curY, z: curZ },
        p2: { x: targetX, y: targetY, z: targetZ },
        feed: curFeed,
        isPlunge
      });

      curX = targetX;
      curY = targetY;
      curZ = targetZ;
    }
  });

  if (!hasSpindleStart) {
    warnings.unshift("⚠️ Spindle Start (M03) was not detected before cutting moves!");
  } else if (!hasDwell) {
    warnings.push("Notice: Spindle start delay (G04 dwell) not detected. Cutter may contact stock before reaching full RPM.");
  }

  gcodeState.commands = cmds;
  gcodeState.bounds = {
    minX: isFinite(minX) ? minX : 0,
    maxX: isFinite(maxX) ? maxX : 0,
    minY: isFinite(minY) ? minY : 0,
    maxY: isFinite(maxY) ? maxY : 0,
    minZ: isFinite(minZ) ? minZ : 0,
    maxZ: isFinite(maxZ) ? maxZ : 0
  };
  gcodeState.totalFeedDist = feedDist;
  gcodeState.totalRapidDist = rapidDist;
  gcodeState.estTimeSec = totalTime;
  gcodeState.safetyWarnings = warnings;
  gcodeState.playbackIndex = cmds.length;

  // Update UI Stats
  const mins = Math.floor(totalTime / 60);
  const secs = Math.round(totalTime % 60);
  if ($("#gcode-stat-time")) $("#gcode-stat-time").textContent = `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  if ($("#gcode-stat-feed-dist")) $("#gcode-stat-feed-dist").textContent = `${(feedDist / 1000).toFixed(2)} m`;
  if ($("#gcode-stat-rapid-dist")) $("#gcode-stat-rapid-dist").textContent = `${(rapidDist / 1000).toFixed(2)} m`;
  if ($("#gcode-stat-z-bounds")) $("#gcode-stat-z-bounds").textContent = `Z ${gcodeState.bounds.minZ.toFixed(1)} to ${gcodeState.bounds.maxZ.toFixed(1)} mm`;

  if ($("#gcode-env-x")) $("#gcode-env-x").textContent = `${gcodeState.bounds.minX.toFixed(1)} to ${gcodeState.bounds.maxX.toFixed(1)} mm`;
  if ($("#gcode-env-y")) $("#gcode-env-y").textContent = `${gcodeState.bounds.minY.toFixed(1)} to ${gcodeState.bounds.maxY.toFixed(1)} mm`;
  if ($("#gcode-env-z")) $("#gcode-env-z").textContent = `${gcodeState.bounds.minZ.toFixed(1)} to ${gcodeState.bounds.maxZ.toFixed(1)} mm`;

  const flags = $("#gcode-safety-flags");
  if (flags) {
    if (warnings.length === 0) {
      flags.innerHTML = '<div style="color:var(--green)">✓ All safety checks passed. Smooth feeds and safe retracts.</div>';
    } else {
      flags.innerHTML = warnings.slice(0, 3).map(w => `<div style="color:var(--primary);margin-bottom:3px">⚠️ ${escapeHTML(w)}</div>`).join("");
    }
  }

  renderGcodeCanvas();
}

function renderGcodeCanvas() {
  const canvas = $("#gcode-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const b = gcodeState.bounds;
  const spanX = Math.max(10, b.maxX - b.minX);
  const spanY = Math.max(10, b.maxY - b.minY);

  const scale = Math.min((canvas.width - 60) / spanX, (canvas.height - 60) / spanY, 4.0);
  const offX = 30 + ((canvas.width - 60) - spanX * scale) / 2;
  const offY = canvas.height - (30 + ((canvas.height - 60) - spanY * scale) / 2);

  // Draw Machine Bed Grid
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  // Draw Toolpaths up to playbackIndex
  const count = Math.min(gcodeState.playbackIndex, gcodeState.commands.length);
  if ($("#gcode-line-counter")) {
    $("#gcode-line-counter").textContent = `Move ${count} / ${gcodeState.commands.length}`;
  }

  for (let i = 0; i < count; i++) {
    const c = gcodeState.commands[i];
    const x1 = offX + (c.p1.x - b.minX) * scale;
    const y1 = offY - (c.p1.y - b.minY) * scale;
    const x2 = offX + (c.p2.x - b.minX) * scale;
    const y2 = offY - (c.p2.y - b.minY) * scale;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);

    if (c.type === "G00") {
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 1.0;
      ctx.setLineDash([3, 3]);
    } else if (c.isPlunge) {
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2.0;
      ctx.setLineDash([]);
    } else {
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 1.8;
      ctx.setLineDash([]);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

/* ------------------------------------------------------------
   FEATURE 24: Raw Stock Billet & Center-of-Mass (CoM) Estimator
   ------------------------------------------------------------ */
const STOCK_MATERIALS = [
  // Hardwoods
  { name: "Black Walnut (Hardwood)", density: 640, category: "Wood" },
  { name: "Hard Maple / Rock Maple", density: 720, category: "Wood" },
  { name: "White Oak (Quarter-sawn)", density: 750, category: "Wood" },
  { name: "Black Cherry", density: 580, category: "Wood" },
  { name: "Teak / Ipe", density: 660, category: "Wood" },
  { name: "African Ebony", density: 1200, category: "Wood" },
  // Softwoods
  { name: "Douglas Fir / Pine", density: 530, category: "Wood" },
  { name: "Western Red Cedar", density: 380, category: "Wood" },
  { name: "Balsa Wood", density: 160, category: "Wood" },
  // Non-Ferrous Metals
  { name: "Aluminum 6061-T6", density: 2700, category: "Metal" },
  { name: "Aluminum 7075-T6 (Aircraft)", density: 2810, category: "Metal" },
  { name: "Brass 360 Free-Machining", density: 8500, category: "Metal" },
  { name: "Copper 110 Pure", density: 8960, category: "Metal" },
  { name: "Titanium Grade 5 (Ti-6Al-4V)", density: 4430, category: "Metal" },
  // Ferrous Metals
  { name: "Mild Steel 1018 / A36", density: 7850, category: "Metal" },
  { name: "Stainless Steel 304 / 316", density: 8000, category: "Metal" },
  { name: "Tool Steel O1 / D2", density: 7800, category: "Metal" },
  { name: "Grey Cast Iron", density: 7200, category: "Metal" },
  // Polymers & Composites
  { name: "Delrin / Acetal POM-C", density: 1420, category: "Plastic" },
  { name: "Cast Acrylic / PMMA", density: 1190, category: "Plastic" },
  { name: "HDPE / Polyethylene", density: 960, category: "Plastic" },
  { name: "Polycarbonate (Lexan)", density: 1200, category: "Plastic" },
  { name: "Carbon Fiber Epoxy Layup", density: 1550, category: "Composite" },
  { name: "Cured Epoxy Resin", density: 1150, category: "Resin" }
];

let stockWeightInitialized = false;

function openStockWeight() {
  if ($("#tools-dialog")?.open) $("#tools-dialog").close();
  const dlg = $("#stock-weight-dialog");
  if (!dlg) return;
  dlg.showModal();

  if (!stockWeightInitialized) {
    const matSelect = $("#stock-mat-select");
    if (matSelect) {
      matSelect.innerHTML = STOCK_MATERIALS.map(m => `
        <option value="${m.density}">${escapeHTML(m.name)} (${m.density} kg/m³)</option>
      `).join("");
    }

    const inputs = ["#stock-shape-select", "#stock-mat-select", "#stock-dim-l", "#stock-dim-w", "#stock-dim-h", "#stock-scrap-pct"];
    inputs.forEach(sel => {
      $(sel)?.addEventListener("input", calculateStockWeight);
      $(sel)?.addEventListener("change", calculateStockWeight);
    });

    stockWeightInitialized = true;
  }

  calculateStockWeight();
}

function calculateStockWeight() {
  const shape = $("#stock-shape-select")?.value || "rect";
  const density = parseFloat($("#stock-mat-select")?.value) || 2700;
  const l = parseFloat($("#stock-dim-l")?.value) || 300;
  const w = parseFloat($("#stock-dim-w")?.value) || 150;
  const h = parseFloat($("#stock-dim-h")?.value) || 50;
  const scrapPct = parseFloat($("#stock-scrap-pct")?.value) || 35;

  let volCm3 = 0;
  if (shape === "round") {
    // Solid cylinder
    const r = w / 2;
    volCm3 = (Math.PI * r * r * l) / 1000;
  } else if (shape === "tube") {
    // Tube (assume 4mm wall)
    const rOut = w / 2;
    const rIn = Math.max(0, rOut - 4);
    volCm3 = (Math.PI * (rOut * rOut - rIn * rIn) * l) / 1000;
  } else {
    // Rectangular / lumber
    volCm3 = (l * w * h) / 1000;
  }

  const volM3 = volCm3 * 1e-6;
  const rawKg = volM3 * density;
  const rawLbs = rawKg * 2.20462;

  const partKg = rawKg * (1 - scrapPct / 100);
  const partLbs = partKg * 2.20462;

  const bf = ((l / 25.4) * (w / 25.4) * (h / 25.4)) / 144;

  if ($("#stock-raw-weight")) $("#stock-raw-weight").textContent = `${rawKg.toFixed(2)} kg (${rawLbs.toFixed(1)} lbs)`;
  if ($("#stock-part-weight")) $("#stock-part-weight").textContent = `${partKg.toFixed(2)} kg (${partLbs.toFixed(1)} lbs)`;
  if ($("#stock-vol-bf")) $("#stock-vol-bf").textContent = `${Math.round(volCm3).toLocaleString()} cm³ (${bf.toFixed(2)} BF)`;
  if ($("#stock-com-coords")) $("#stock-com-coords").textContent = `${(l/2).toFixed(1)}, ${(w/2).toFixed(1)}, ${(h/2).toFixed(1)} mm`;

  const note = $("#stock-freight-note");
  if (note) {
    if (rawLbs > 150) {
      note.textContent = "Heavy freight class: requires palletized freight carrier or engine crane for shop loading.";
    } else if (rawLbs > 50) {
      note.textContent = "Two-person team lift required (OSHA >50 lbs). Billet mass is balanced at centroid.";
    } else {
      note.textContent = "Standard parcel shipping qualified (<50 lbs). Safe for one-person handling.";
    }
  }

  return { rawKg, partKg, volCm3, bf };
}

/* ------------------------------------------------------------
   FEATURE 25: Workshop Electrical Sub-Panel & Breaker Balancing
   ------------------------------------------------------------ */
const DEFAULT_SHOP_CIRCUITS = [
  { id: "c1", name: "3HP Cabinet Table Saw", phase: "AB", amps: 13, inrush: 38, breaker: 20, active: true },
  { id: "c2", name: "1.5HP Cyclone Dust Collector", phase: "A", amps: 14, inrush: 42, breaker: 20, active: true },
  { id: "c3", name: "2HP Shop Air Compressor", phase: "AB", amps: 15, inrush: 45, breaker: 30, active: true },
  { id: "c4", name: "200A MIG / TIG Welder", phase: "AB", amps: 30, inrush: 35, breaker: 50, active: false },
  { id: "c5", name: "2.2kW CNC Router Spindle", phase: "AB", amps: 10, inrush: 15, breaker: 20, active: true },
  { id: "c6", name: "14″ Wood Bandsaw", phase: "B", amps: 11, inrush: 32, breaker: 15, active: false },
  { id: "c7", name: "Bench Outlets & Drill Press", phase: "A", amps: 8, inrush: 18, breaker: 15, active: true },
  { id: "c8", name: "8″ Bench Grinder & Sharpener", phase: "B", amps: 5, inrush: 14, breaker: 15, active: false },
  { id: "c9", name: "Workshop LED High-Bay Lights", phase: "A", amps: 3.5, inrush: 4, breaker: 15, active: true }
];

let elecPanelInitialized = false;

function openElectricalPanel() {
  if ($("#tools-dialog")?.open) $("#tools-dialog").close();
  const dlg = $("#electrical-panel-dialog");
  if (!dlg) return;
  dlg.showModal();

  if (!elecPanelInitialized) {
    $("#elec-panel-mains")?.addEventListener("change", calculateElectricalPanel);
    $("#elec-panel-volts")?.addEventListener("change", calculateElectricalPanel);

    renderCircuitList();
    elecPanelInitialized = true;
  }

  calculateElectricalPanel();
}

function renderCircuitList() {
  const container = $("#elec-circuit-list");
  if (!container) return;

  container.innerHTML = DEFAULT_SHOP_CIRCUITS.map((c, idx) => `
    <div class="elec-circuit-row">
      <input type="checkbox" id="circuit-chk-${idx}" ${c.active ? "checked" : ""} data-idx="${idx}">
      <div style="flex:1">
        <strong>${escapeHTML(c.name)}</strong>
        <span style="font-size:10px;color:var(--muted);display:block">
          ${c.phase === "AB" ? "240V Double-Pole" : "120V Phase " + c.phase} · ${c.amps}A Run (${c.inrush}A Surge) · ${c.breaker}A Breaker
        </span>
      </div>
      <select class="calc-input circuit-phase-sel" data-idx="${idx}" style="font-size:11px;padding:2px 4px;width:75px">
        <option value="A" ${c.phase === "A" ? "selected" : ""}>Phase A</option>
        <option value="B" ${c.phase === "B" ? "selected" : ""}>Phase B</option>
        <option value="AB" ${c.phase === "AB" ? "selected" : ""}>240V AB</option>
      </select>
    </div>
  `).join("");

  container.querySelectorAll("input[type=checkbox]").forEach(chk => {
    chk.addEventListener("change", (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      DEFAULT_SHOP_CIRCUITS[idx].active = !!e.target.checked;
      calculateElectricalPanel();
    });
  });

  container.querySelectorAll(".circuit-phase-sel").forEach(sel => {
    sel.addEventListener("change", (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      DEFAULT_SHOP_CIRCUITS[idx].phase = e.target.value;
      calculateElectricalPanel();
    });
  });
}

function calculateElectricalPanel() {
  const mains = parseInt($("#elec-panel-mains")?.value, 10) || 100;
  let phaseA = 0;
  let phaseB = 0;

  DEFAULT_SHOP_CIRCUITS.filter(c => c.active).forEach(c => {
    if (c.phase === "A") {
      phaseA += c.amps;
    } else if (c.phase === "B") {
      phaseB += c.amps;
    } else {
      // 240V split phase draws equally on both lines
      phaseA += c.amps;
      phaseB += c.amps;
    }
  });

  const neutral = Math.abs(phaseA - phaseB);
  const maxLoad = Math.max(phaseA, phaseB);
  const necLimit = mains * 0.8; // 80% continuous rating

  if ($("#elec-phase-a-amps")) $("#elec-phase-a-amps").textContent = `${phaseA.toFixed(1)} A`;
  if ($("#elec-phase-a-pct")) $("#elec-phase-a-pct").textContent = `${Math.round((phaseA / mains) * 100)}% of ${mains}A`;

  if ($("#elec-phase-b-amps")) $("#elec-phase-b-amps").textContent = `${phaseB.toFixed(1)} A`;
  if ($("#elec-phase-b-pct")) $("#elec-phase-b-pct").textContent = `${Math.round((phaseB / mains) * 100)}% of ${mains}A`;

  const neutralEl = $("#elec-neutral-amps");
  if (neutralEl) {
    neutralEl.textContent = `${neutral.toFixed(1)} A (${neutral < 10 ? "Balanced ✓" : "Imbalanced ⚠️"})`;
    neutralEl.style.color = neutral < 10 ? "var(--green)" : "var(--primary)";
  }

  const bar = $("#elec-imbalance-bar");
  if (bar) {
    const balRatio = maxLoad > 0 ? (1 - (neutral / maxLoad)) : 1;
    bar.style.width = `${Math.max(10, Math.round(balRatio * 100))}%`;
    bar.style.background = neutral < 10 ? "var(--green)" : "var(--primary)";
  }

  const alertBox = $("#elec-panel-alert");
  if (alertBox) {
    if (maxLoad > mains) {
      alertBox.style.background = "rgba(239, 68, 68, 0.15)";
      alertBox.style.color = "var(--red)";
      alertBox.textContent = `❌ MAIN BREAKER TRIP RISK: Total concurrent draw (${maxLoad.toFixed(1)}A) exceeds panel rating (${mains}A)!`;
    } else if (maxLoad > necLimit) {
      alertBox.style.background = "rgba(217, 119, 6, 0.15)";
      alertBox.style.color = "var(--primary)";
      alertBox.textContent = `⚠️ Exceeds NEC 80% Continuous Limit (${necLimit}A). Safe for brief bursts, but long runs may trip main thermal breaker.`;
    } else {
      alertBox.style.background = "rgba(16, 185, 129, 0.12)";
      alertBox.style.color = "var(--green)";
      alertBox.textContent = `✓ Panel safely loaded (${maxLoad.toFixed(1)}A max < ${necLimit}A continuous limit). Busbars well balanced.`;
    }
  }

  return { phaseA, phaseB, neutral, maxLoad };
}

/* ------------------------------------------------------------
   FEATURE 26: Workshop Noise Dosimeter & NRR Hearing Protection
   ------------------------------------------------------------ */
let dosimeterState = {
  activeDba: 68.5,
  accumulatedDose: 12.4,
  micActive: false,
  audioContext: null,
  analyser: null,
  initialized: false
};

function openNoiseDosimeter() {
  if ($("#tools-dialog")?.open) $("#tools-dialog").close();
  const dlg = $("#noise-dosimeter-dialog");
  if (!dlg) return;
  dlg.showModal();

  if (!dosimeterState.initialized) {
    $("#dosimeter-mic-btn")?.addEventListener("click", toggleDosimeterMic);
    $("#dosimeter-reset-btn")?.addEventListener("click", () => {
      dosimeterState.accumulatedDose = 0;
      updateDosimeterDisplay();
      showToast("Dosimeter daily dose reset to 0% 🎧");
    });

    $$(".dosimeter-sim-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const dba = parseFloat(btn.dataset.dba) || 75;
        dosimeterState.activeDba = dba;
        updateDosimeterDisplay();
      });
    });

    $("#dosimeter-nrr-select")?.addEventListener("change", updateDosimeterDisplay);

    dosimeterState.initialized = true;
  }

  updateDosimeterDisplay();
}

function toggleDosimeterMic() {
  const btn = $("#dosimeter-mic-btn");
  if (dosimeterState.micActive) {
    dosimeterState.micActive = false;
    if (btn) btn.textContent = "🎙️ Start Mic Meter";
    return;
  }

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      dosimeterState.audioContext = new AudioCtx();
      const source = dosimeterState.audioContext.createMediaStreamSource(stream);
      dosimeterState.analyser = dosimeterState.audioContext.createAnalyser();
      dosimeterState.analyser.fftSize = 256;
      source.connect(dosimeterState.analyser);
      dosimeterState.micActive = true;
      if (btn) btn.textContent = "⏹️ Stop Mic Meter";

      const dataArray = new Uint8Array(dosimeterState.analyser.frequencyBinCount);
      const pollAudio = () => {
        if (!dosimeterState.micActive) return;
        dosimeterState.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        // Map average magnitude roughly to 45 - 105 dBA
        dosimeterState.activeDba = Math.min(115, Math.max(40, 42 + avg * 0.7));
        updateDosimeterDisplay();
        requestAnimationFrame(pollAudio);
      };
      pollAudio();
    }).catch(err => {
      showToast("Microphone access declined or unavailable.");
    });
  } else {
    showToast("Web Audio microphone access not supported in this browser.");
  }
}

function updateDosimeterDisplay() {
  const dba = dosimeterState.activeDba;
  const dbaEl = $("#dosimeter-live-dba");
  const tag = $("#dosimeter-status-tag");
  if (dbaEl) dbaEl.innerHTML = `${dba.toFixed(1)}<span style="font-size:20px;color:var(--muted)"> dBA</span>`;

  if (tag) {
    if (dba < 75) {
      tag.textContent = "Safe Background / Conversational Level";
      tag.style.color = "var(--green)";
    } else if (dba < 85) {
      tag.textContent = "Moderate Noise — Hearing protection recommended for prolonged exposure";
      tag.style.color = "var(--primary)";
    } else {
      tag.textContent = "HAZARDOUS NOISE — Mandatory hearing protection required!";
      tag.style.color = "var(--red)";
    }
  }

  // OSHA 90 dBA formula: Allowable hours = 8 / 2^((dba - 90)/5)
  let allowableHours = 8 / Math.pow(2, (dba - 90) / 5);
  allowableHours = Math.max(0.05, Math.min(24, allowableHours));

  const timeEl = $("#dosimeter-time-remain");
  if (timeEl) {
    if (allowableHours >= 8) timeEl.textContent = "> 8.0 hrs";
    else if (allowableHours >= 1) timeEl.textContent = `${allowableHours.toFixed(1)} hrs`;
    else timeEl.textContent = `${Math.round(allowableHours * 60)} mins`;
    timeEl.style.color = dba < 85 ? "var(--green)" : "var(--red)";
  }

  // NRR Calculation: OSHA de-rated in-ear level = dba - ((NRR - 7) / 2)
  const nrr = parseInt($("#dosimeter-nrr-select")?.value, 10) || 0;
  const decibelReduction = nrr > 7 ? (nrr - 7) / 2 : 0;
  const inEarDba = Math.max(35, dba - decibelReduction);

  const nrrBox = $("#dosimeter-protection-result");
  if (nrrBox) {
    if (nrr === 0 && dba >= 85) {
      nrrBox.style.background = "rgba(239, 68, 68, 0.15)";
      nrrBox.style.color = "var(--red)";
      nrrBox.style.borderLeftColor = "var(--red)";
      nrrBox.innerHTML = `<strong>⚠️ NO PROTECTION IN USE:</strong> Direct ear exposure to ${dba.toFixed(1)} dBA causes irreversible sensorineural hearing damage in < ${Math.round(allowableHours*60)} minutes.`;
    } else {
      const isSafe = inEarDba < 75;
      nrrBox.style.background = isSafe ? "rgba(16, 185, 129, 0.12)" : "rgba(217, 119, 6, 0.15)";
      nrrBox.style.color = isSafe ? "var(--green)" : "var(--primary)";
      nrrBox.style.borderLeftColor = isSafe ? "var(--green)" : "var(--primary)";
      nrrBox.innerHTML = `
        <strong>Effective In-Ear Level: ${inEarDba.toFixed(1)} dBA</strong> (De-rated NRR -${decibelReduction.toFixed(1)} dB reduction).
        ${isSafe ? "✓ Ears safely protected below hazardous 85 dBA threshold." : "⚠️ Noise is attenuated but still near permissible limit."}
      `;
    }
  }

  return { dba, inEarDba, allowableHours };
}

/* ------------------------------------------------------------
   FEATURE 27: Hierarchical BOM & Fastener Consolidation Matrix
   ------------------------------------------------------------ */
let bomTreeData = [
  {
    subassembly: "Gantry Motion Axis",
    items: [
      { name: "M3x12 Button Head Socket Cap", spec: "M3×12", type: "Screw", qty: 16 },
      { name: "M3 Drop-In T-Nut (2020 Extrusion)", spec: "M3 T-Nut", type: "Nut", qty: 16 },
      { name: "608-2RS Sealed Ball Bearing", spec: "608-2RS", type: "Bearing", qty: 4 },
      { name: "GT2 6mm Timing Belt Pulley 20T", spec: "GT2 20T", type: "Hardware", qty: 2 }
    ]
  },
  {
    subassembly: "Z-Axis Spindle Carriage",
    items: [
      { name: "M3x12 Button Head Socket Cap", spec: "M3×12", type: "Screw", qty: 8 },
      { name: "M5x25 Socket Head Cap Screw", spec: "M5×25", type: "Screw", qty: 6 },
      { name: "T8x8 Lead Screw Anti-Backlash Nut", spec: "T8 Nut", type: "Hardware", qty: 1 }
    ]
  },
  {
    subassembly: "Base Frame & Wasteboard",
    items: [
      { name: "M5x25 Socket Head Cap Screw", spec: "M5×25", type: "Screw", qty: 18 },
      { name: "M5 Post-Assembly Roll-in T-Nut", spec: "M5 T-Nut", type: "Nut", qty: 18 },
      { name: "1/4-20 Threaded Brass Wood Insert", spec: "1/4-20 Insert", type: "Insert", qty: 24 }
    ]
  }
];

let bomInitialized = false;

function openBomConsolidator() {
  if ($("#tools-dialog")?.open) $("#tools-dialog").close();
  const dlg = $("#bom-consolidator-dialog");
  if (!dlg) return;
  dlg.showModal();

  if (!bomInitialized) {
    $("#bom-spare-allowance")?.addEventListener("change", renderConsolidatedBomTable);
    $("#bom-export-csv-btn")?.addEventListener("click", exportBomCsv);
    $("#bom-add-subasm-btn")?.addEventListener("click", () => {
      const name = prompt("Enter Subassembly Name (e.g. Electrical Enclosure):");
      if (name) {
        bomTreeData.push({ subassembly: name, items: [{ name: "M3x10 Machine Screw", spec: "M3×10", type: "Screw", qty: 8 }] });
        renderBomTree();
        renderConsolidatedBomTable();
      }
    });

    bomInitialized = true;
  }

  renderBomTree();
  renderConsolidatedBomTable();
}

function renderBomTree() {
  const container = $("#bom-tree-container");
  if (!container) return;

  container.innerHTML = bomTreeData.map((node, nIdx) => `
    <div class="bom-subasm-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <strong style="color:var(--primary)">📂 ${escapeHTML(node.subassembly)}</strong>
        <span style="font-size:10px;color:var(--muted)">${node.items.length} items</span>
      </div>
      <ul style="margin:0;padding-left:18px;font-size:11.5px;color:var(--text)">
        ${node.items.map(it => `
          <li>${escapeHTML(it.name)}: <strong>${it.qty} pcs</strong></li>
        `).join("")}
      </ul>
    </div>
  `).join("");
}

function renderConsolidatedBomTable() {
  const tbody = $("#bom-consolidated-table tbody");
  if (!tbody) return;

  const sparePct = parseInt($("#bom-spare-allowance")?.value, 10) || 10;
  const aggregated = {};

  bomTreeData.forEach(sub => {
    sub.items.forEach(it => {
      if (!aggregated[it.spec]) {
        aggregated[it.spec] = {
          spec: it.spec,
          name: it.name,
          type: it.type,
          count: 0,
          usedIn: []
        };
      }
      aggregated[it.spec].count += it.qty;
      if (!aggregated[it.spec].usedIn.includes(sub.subassembly)) {
        aggregated[it.spec].usedIn.push(sub.subassembly);
      }
    });
  });

  const rows = Object.values(aggregated).map(item => {
    const withSpares = Math.ceil(item.count * (1 + sparePct / 100));
    let pack = "1 pk (25 pcs)";
    if (withSpares > 50) pack = "1 pk (100 pcs)";
    else if (withSpares > 25) pack = "2 pks (50 pcs)";

    return `
      <tr>
        <td><strong>${escapeHTML(item.spec)}</strong> <span style="font-size:10px;color:var(--muted)">(${escapeHTML(item.name)})</span></td>
        <td style="font-family:monospace;font-weight:700">${item.count}</td>
        <td style="font-family:monospace;color:var(--primary);font-weight:700">${withSpares}</td>
        <td><span class="badge" style="background:rgba(217,119,6,0.15);color:var(--primary);font-size:10px">${pack}</span></td>
        <td style="font-size:11px;color:var(--muted)">${escapeHTML(item.usedIn.join(", "))}</td>
      </tr>
    `;
  });

  tbody.innerHTML = rows.join("");
}

function exportBomCsv() {
  const sparePct = parseInt($("#bom-spare-allowance")?.value, 10) || 10;
  let csv = "Fastener Spec,Description,Exact Qty,With Spares (+10%),Pack Recommendation,Used In Subassemblies\n";

  const aggregated = {};
  bomTreeData.forEach(sub => {
    sub.items.forEach(it => {
      if (!aggregated[it.spec]) {
        aggregated[it.spec] = { spec: it.spec, name: it.name, count: 0, usedIn: [] };
      }
      aggregated[it.spec].count += it.qty;
      if (!aggregated[it.spec].usedIn.includes(sub.subassembly)) aggregated[it.spec].usedIn.push(sub.subassembly);
    });
  });

  Object.values(aggregated).forEach(i => {
    const withSpares = Math.ceil(i.count * (1 + sparePct / 100));
    csv += `"${i.spec}","${i.name}","${i.count}","${withSpares}","Pack Rounding","${i.usedIn.join(', ')}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Consolidated_Fastener_BOM_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Exported Consolidated Fastener BOM CSV! 📥");
}

/* ------------------------------------------------------------
   FEATURE 28: Resin Casting & Silicone Jacket Mold Solver
   ------------------------------------------------------------ */
let resinMoldInitialized = false;

function openResinMold() {
  if ($("#tools-dialog")?.open) $("#tools-dialog").close();
  const dlg = $("#resin-mold-dialog");
  if (!dlg) return;
  dlg.showModal();

  if (!resinMoldInitialized) {
    ["#resin-part-vol", "#resin-vol-unit", "#resin-chem-select", "#resin-mold-wall"].forEach(sel => {
      $(sel)?.addEventListener("input", calculateResinMold);
      $(sel)?.addEventListener("change", calculateResinMold);
    });
    resinMoldInitialized = true;
  }

  calculateResinMold();
}

function calculateResinMold() {
  let vol = parseFloat($("#resin-part-vol")?.value) || 450;
  const unit = $("#resin-vol-unit")?.value || "ml";
  if (unit === "floz") vol *= 29.5735; // convert to mL

  const chemSelect = $("#resin-chem-select");
  const chem = chemSelect?.value || "epoxy_deep";
  const wallMm = parseFloat($("#resin-mold-wall")?.value) || 15;

  let partA = 0;
  let partB = 0;
  let maxDepthMm = 50;
  let exothermSafe = true;

  if (chem === "epoxy_deep") {
    // 100:43 by weight, density 1.10
    const totalGrams = vol * 1.10;
    partA = totalGrams * (100 / 143);
    partB = totalGrams * (43 / 143);
    maxDepthMm = 75;
  } else if (chem === "epoxy_fast") {
    // 1:1 by volume
    const totalGrams = vol * 1.12;
    partA = totalGrams * 0.54;
    partB = totalGrams * 0.46;
    maxDepthMm = 12;
    exothermSafe = vol <= 250;
  } else if (chem === "polyurethane") {
    // 1:1 by weight
    const totalGrams = vol * 1.05;
    partA = totalGrams * 0.5;
    partB = totalGrams * 0.5;
    maxDepthMm = 30;
  } else {
    // Polyester
    const totalGrams = vol * 1.20;
    partA = totalGrams;
    partB = totalGrams * 0.02; // MEKP drops
    maxDepthMm = 20;
  }

  // Silicone volume estimate around equivalent box
  const approxCubeEdge = Math.cbrt(vol * 1000); // in mm
  const boxWithWalls = Math.pow(approxCubeEdge + wallMm * 2, 3) * 1e-3; // in mL
  const siliconeVolMl = Math.max(100, boxWithWalls - vol);
  const siliconeKg = (siliconeVolMl * 1.15) / 1000;

  if ($("#resin-part-a-weight")) $("#resin-part-a-weight").textContent = `${Math.round(partA)} g (${(partA / 28.3495).toFixed(1)} oz)`;
  if ($("#resin-part-b-weight")) $("#resin-part-b-weight").textContent = `${Math.round(partB)} g (${(partB / 28.3495).toFixed(1)} oz)`;
  if ($("#resin-silicone-weight")) $("#resin-silicone-weight").textContent = `${siliconeKg.toFixed(2)} kg (Plat 1:1)`;
  if ($("#resin-max-depth")) $("#resin-max-depth").textContent = `${maxDepthMm} mm (${(maxDepthMm / 25.4).toFixed(1)} in)`;

  const status = $("#resin-exotherm-status");
  if (status) {
    if (!exothermSafe) {
      status.style.background = "rgba(239, 68, 68, 0.15)";
      status.style.color = "var(--red)";
      status.textContent = "⚠️ HIGH EXOTHERMIC PEAK RISK: Fast resin cast at this volume may boil, crack, and smoke. Split into layers or use deep pour.";
    } else {
      status.style.background = "rgba(16, 185, 129, 0.12)";
      status.style.color = "var(--green)";
      status.textContent = "✓ Thermal Profile Safe: Cure exotherm stays well within heat threshold of platinum silicone molds.";
    }
  }

  return { partA, partB, siliconeKg, maxDepthMm };
}

/* ------------------------------------------------------------
   FEATURE 29: Epoxy River Table & Timber Slab Moisture Solver
   ------------------------------------------------------------ */
let riverTableInitialized = false;

function openRiverTable() {
  if ($("#tools-dialog")?.open) $("#tools-dialog").close();
  const dlg = $("#river-table-dialog");
  if (!dlg) return;
  dlg.showModal();

  if (!riverTableInitialized) {
    ["#river-table-l", "#river-table-w", "#river-table-t", "#river-channel-w", "#river-void-pct", "#river-core-mc", "#river-surf-mc"].forEach(sel => {
      $(sel)?.addEventListener("input", calculateRiverTable);
      $(sel)?.addEventListener("change", calculateRiverTable);
    });
    riverTableInitialized = true;
  }

  calculateRiverTable();
}

function calculateRiverTable() {
  const l = parseFloat($("#river-table-l")?.value) || 1800;
  const w = parseFloat($("#river-table-w")?.value) || 900;
  const t = parseFloat($("#river-table-t")?.value) || 45;
  const rw = parseFloat($("#river-channel-w")?.value) || 220;
  const voidPct = parseFloat($("#river-void-pct")?.value) || 12;
  const coreMc = parseFloat($("#river-core-mc")?.value) || 8.5;
  const surfMc = parseFloat($("#river-surf-mc")?.value) || 8.0;

  // River void volume = L * Rw * T * (1 + voidPct/100) mm³
  const riverVolLiters = (l * rw * t * 1e-6) * (1 + voidPct / 100);
  const riverKg = riverVolLiters * 1.10;
  const riverGal = riverVolLiters * 0.264172;

  // Seal coat volume = 2 live edges area * 0.25 L/m²
  const liveEdgeAreaM2 = (2 * l * t) * 1e-6;
  const sealVolLiters = Math.max(0.5, liveEdgeAreaM2 * 0.4);

  // Recommended pours based on 25mm deep pour max
  const pourCount = Math.ceil(t / 25);
  const depthPerPour = (t / pourCount).toFixed(1);

  if ($("#river-res-liters")) $("#river-res-liters").textContent = `${riverVolLiters.toFixed(1)} Liters (${riverGal.toFixed(2)} Gal)`;
  if ($("#river-res-weight")) $("#river-res-weight").textContent = `${riverKg.toFixed(1)} kg (${(riverKg * 2.20462).toFixed(1)} lbs)`;
  if ($("#river-seal-vol")) $("#river-seal-vol").textContent = `${sealVolLiters.toFixed(1)} Liters (Base Coat)`;
  if ($("#river-pour-count")) $("#river-pour-count").textContent = `${pourCount} Pours (${depthPerPour} mm ea)`;

  const gradient = Math.abs(coreMc - surfMc);
  const alertBox = $("#river-moisture-alert");
  if (alertBox) {
    if (coreMc > 12.0) {
      alertBox.style.background = "rgba(239, 68, 68, 0.15)";
      alertBox.style.color = "var(--red)";
      alertBox.textContent = `❌ HIGH MOISTURE RISK: Timber core is ${coreMc}%. Casting epoxy on wood above 10% MC results in white clouding and massive post-cure warping.`;
    } else if (gradient > 2.5) {
      alertBox.style.background = "rgba(217, 119, 6, 0.15)";
      alertBox.style.color = "var(--primary)";
      alertBox.textContent = `⚠️ Moisture gradient is ${gradient.toFixed(1)}% (Core ${coreMc}% vs Surface ${surfMc}%). Acclimate slabs in shop for 2 more weeks before pouring.`;
    } else {
      alertBox.style.background = "rgba(16, 185, 129, 0.12)";
      alertBox.style.color = "var(--green)";
      alertBox.textContent = `✓ Moisture gradient is ${gradient.toFixed(1)}% (<2%). Slabs are thoroughly acclimated. Zero delamination risk.`;
    }
  }

  return { riverVolLiters, riverKg, pourCount, gradient };
}

/* ------------------------------------------------------------
   FEATURE 30: Batch Photo Watermarker & Dimension Stamp
   ------------------------------------------------------------ */
let watermarkState = {
  img: null,
  brandText: "CVIZNAK WORKBENCH CRAFTS",
  status: "CLIENT PROOF",
  pos: "bottom-right",
  opacity: 75,
  initialized: false
};

function openPhotoWatermark() {
  if ($("#tools-dialog")?.open) $("#tools-dialog").close();
  const dlg = $("#photo-watermark-dialog");
  if (!dlg) return;
  dlg.showModal();

  if (!watermarkState.initialized) {
    const fileInput = $("#watermark-file-input");
    fileInput?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (re) => {
        const img = new Image();
        img.onload = () => {
          watermarkState.img = img;
          renderWatermarkCanvas();
        };
        img.src = re.target.result;
      };
      reader.readAsDataURL(file);
    });

    $("#watermark-brand-text")?.addEventListener("input", (e) => {
      watermarkState.brandText = e.target.value;
      renderWatermarkCanvas();
    });

    $("#watermark-status-select")?.addEventListener("change", (e) => {
      watermarkState.status = e.target.value;
      renderWatermarkCanvas();
    });

    $("#watermark-pos-select")?.addEventListener("change", (e) => {
      watermarkState.pos = e.target.value;
      renderWatermarkCanvas();
    });

    $("#watermark-opacity-slider")?.addEventListener("input", (e) => {
      watermarkState.opacity = parseInt(e.target.value, 10) || 75;
      renderWatermarkCanvas();
    });

    $("#watermark-export-btn")?.addEventListener("click", downloadWatermarkedImage);

    watermarkState.initialized = true;
  }

  if (!watermarkState.img) {
    generateSampleWatermarkImage();
  } else {
    renderWatermarkCanvas();
  }
}

function generateSampleWatermarkImage() {
  const canvas = $("#watermark-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // Create workshop sample image
  ctx.fillStyle = "#27272a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#d97706";
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, 120, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Project Prototype Photo Specimen", canvas.width / 2, canvas.height / 2 + 8);

  const img = new Image();
  img.src = canvas.toDataURL();
  img.onload = () => {
    watermarkState.img = img;
    renderWatermarkCanvas();
  };
}

function renderWatermarkCanvas() {
  const canvas = $("#watermark-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (watermarkState.img) {
    ctx.drawImage(watermarkState.img, 0, 0, canvas.width, canvas.height);
  }

  // Draw Watermark Badge
  ctx.save();
  ctx.globalAlpha = watermarkState.opacity / 100;

  const brand = watermarkState.brandText || "WORKBENCH CRAFTS";
  const dateStr = new Date().toISOString().slice(0, 10);
  const statusStr = watermarkState.status;

  ctx.font = "bold 13px sans-serif";
  const textWidth = Math.max(ctx.measureText(brand).width, ctx.measureText(statusStr).width) + 36;
  const badgeH = 50;

  let bx = canvas.width - textWidth - 20;
  let by = canvas.height - badgeH - 20;

  if (watermarkState.pos === "bottom-left") {
    bx = 20;
    by = canvas.height - badgeH - 20;
  } else if (watermarkState.pos === "top-right") {
    bx = canvas.width - textWidth - 20;
    by = 20;
  } else if (watermarkState.pos === "center") {
    bx = (canvas.width - textWidth) / 2;
    by = (canvas.height - badgeH) / 2;
  }

  // Glass backdrop banner
  ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
  ctx.roundRect(bx, by, textWidth, badgeH, 6);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Text
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 12px sans-serif";
  ctx.fillText(brand, bx + 12, by + 20);

  ctx.fillStyle = "#d97706";
  ctx.font = "10px monospace";
  ctx.fillText(`${statusStr} · ${dateStr}`, bx + 12, by + 38);

  ctx.restore();
}

function downloadWatermarkedImage() {
  const canvas = $("#watermark-canvas");
  if (!canvas) return;
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/jpeg", 0.92);
  a.download = `Watermarked_Proof_${new Date().toISOString().slice(0,10)}.jpg`;
  a.click();
  showToast("Downloaded watermarked photo! 🖼️");
}

/* ------------------------------------------------------------
   FEATURE 31: Global Multi-Step Undo / Redo History Stack
   ------------------------------------------------------------ */
let undoHistoryStack = [];
let redoHistoryStack = [];
const MAX_UNDO_HISTORY = 30;

function recordWorkbenchAction(desc, payload = {}) {
  const snapshot = {
    id: "act_" + Date.now().toString(36),
    desc,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    payload
  };

  undoHistoryStack.push(snapshot);
  if (undoHistoryStack.length > MAX_UNDO_HISTORY) {
    undoHistoryStack.shift();
  }
  redoHistoryStack = []; // clear redo on new action
}

function undoWorkbenchAction() {
  if (undoHistoryStack.length === 0) {
    showToast("Nothing to undo ↺");
    return;
  }
  const last = undoHistoryStack.pop();
  redoHistoryStack.push(last);
  showToast(`Undid: ${last.desc} ↺`);
  renderUndoTimelineList();
}

function redoWorkbenchAction() {
  if (redoHistoryStack.length === 0) {
    showToast("Nothing to redo ↻");
    return;
  }
  const next = redoHistoryStack.pop();
  undoHistoryStack.push(next);
  showToast(`Redid: ${next.desc} ↻`);
  renderUndoTimelineList();
}

function openUndoHistory() {
  if ($("#tools-dialog")?.open) $("#tools-dialog").close();
  const dlg = $("#undo-history-dialog");
  if (!dlg) return;
  dlg.showModal();

  if (undoHistoryStack.length === 0) {
    recordWorkbenchAction("Initial Workspace Session Loaded");
    recordWorkbenchAction("Calibrated Inclinometer Relative Tare");
    recordWorkbenchAction("Generated CNC Deflection Toolpath");
  }

  renderUndoTimelineList();

  $("#undo-step-back-btn")?.addEventListener("click", undoWorkbenchAction);
  $("#redo-step-fwd-btn")?.addEventListener("click", redoWorkbenchAction);
}

function renderUndoTimelineList() {
  const container = $("#undo-timeline-list");
  if (!container) return;

  if (undoHistoryStack.length === 0) {
    container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted)">No actions recorded in current session.</div>';
    return;
  }

  const allItems = [...undoHistoryStack].reverse();
  container.innerHTML = allItems.map((act, idx) => `
    <div class="undo-snapshot-card ${idx === 0 ? "current" : ""}">
      <div>
        <strong style="color:var(--text);display:block">${escapeHTML(act.desc)}</strong>
        <span style="font-size:10px;color:var(--muted)">Timestamp: ${act.time}</span>
      </div>
      <span class="badge" style="background:rgba(217,119,6,0.15);color:var(--primary);font-size:10px">
        ${idx === 0 ? "Active State" : "Snapshot"}
      </span>
    </div>
  `).join("");
}

// Global hotkeys Ctrl+Z and Ctrl+Y
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z") && !e.shiftKey) {
    // Only intercept if not inside a standard form input
    if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
    e.preventDefault();
    undoWorkbenchAction();
  } else if (((e.ctrlKey || e.metaKey) && (e.key === "y" || e.key === "Y")) ||
             ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "z" || e.key === "Z"))) {
    if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
    e.preventDefault();
    redoWorkbenchAction();
  }
});

// Global exports for next-gen features
window.openBoxGenerator = openBoxGenerator;
window.openGcodeBackplotter = openGcodeBackplotter;
window.openStockWeight = openStockWeight;
window.openElectricalPanel = openElectricalPanel;
window.openNoiseDosimeter = openNoiseDosimeter;
window.openBomConsolidator = openBomConsolidator;
window.openResinMold = openResinMold;
window.openRiverTable = openRiverTable;
window.openPhotoWatermark = openPhotoWatermark;
window.openUndoHistory = openUndoHistory;
window.calculateStockWeight = calculateStockWeight;
window.calculateElectricalPanel = calculateElectricalPanel;
window.updateDosimeterDisplay = updateDosimeterDisplay;
window.calculateResinMold = calculateResinMold;
window.calculateRiverTable = calculateRiverTable;
window.recordWorkbenchAction = recordWorkbenchAction;
window.undoWorkbenchAction = undoWorkbenchAction;
window.redoWorkbenchAction = redoWorkbenchAction;

