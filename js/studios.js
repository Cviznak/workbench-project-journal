/* ============================================================
   Workbench Project Journal - 29 Craft Studios & Calculators
   ============================================================ */

/* ============================================================
   🎨 CRAFT STUDIOS: Woodworking, Textiles, Electronics, Programming, Art
   ============================================================ */

// --- 🪵 Woodworking Studio ---
function updateWoodworkingStudio() {
  // 1. Board Feet & Cost
  const t = parseFloat($("#wood-view-t")?.value) || 1;
  const w = parseFloat($("#wood-view-w")?.value) || 6;
  const l = parseFloat($("#wood-view-l")?.value) || 8;
  const qty = parseInt($("#wood-view-qty")?.value, 10) || 1;
  const price = parseFloat($("#wood-view-price")?.value) || 0;

  const bfPerBoard = (t * w * l) / 12;
  const totalBf = bfPerBoard * qty;
  const totalCost = totalBf * price;

  const bfResult = $("#wood-view-bf-result");
  if (bfResult) {
    bfResult.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:8px">
        <div>
          <span style="font-size:11px;font-weight:700;color:var(--muted)">TOTAL LUMBER VOLUME:</span>
          <strong style="font-size:18px;color:var(--green);margin-left:6px">${totalBf.toFixed(2)} BF</strong>
        </div>
        <button type="button" class="button button-small button-outline" data-action="wood-add-to-shopping" title="Add calculated lumber to project shopping list">🛒 Add to Shopping List</button>
      </div>
      <div style="font-size:12px;color:var(--ink);line-height:1.4">
        • <strong>${bfPerBoard.toFixed(2)} BF</strong> per board (${t}" × ${w}" × ${l} ft) × ${qty} boards<br>
        • Estimated Total Cost: <strong style="color:var(--green)">$${totalCost.toFixed(2)}</strong> ${price > 0 ? `(@ $${price.toFixed(2)}/BF)` : ""}
      </div>
    `;
  }

  // 2. Species Movement & Hardness
  const speciesId = $("#wood-view-species")?.value || "white_oak";
  const species = (typeof WOOD_SPECIES_DB !== "undefined" ? WOOD_SPECIES_DB.find(s => s.id === speciesId) : null) || {
    name: "White Oak", latin: "Quercus alba", janka: 1360, rad: 5.6, tang: 10.5, tr: 1.88,
    notes: "Closed tyloses make it rot and water proof. High tannins react black with iron.",
    caution: "Pre-drilling required for all screws."
  };
  const widthIn = parseFloat($("#wood-view-width-in")?.value) || 10;
  const rhDelta = parseFloat($("#wood-view-rh-delta")?.value) || 4;

  const tangMovement = widthIn * (species.tang / 100) * (rhDelta / 30);
  const radMovement = widthIn * (species.rad / 100) * (rhDelta / 30);
  const jankaPct = Math.min(100, Math.round(((species.janka || 1000) / 2600) * 100));

  const speciesResult = $("#wood-view-species-result");
  if (speciesResult) {
    speciesResult.innerHTML = `
      <div style="margin-bottom:6px">
        <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;margin-bottom:2px">
          <span>Janka Hardness: ${species.janka} lbf</span>
          <span>${jankaPct > 65 ? "Very Hard" : jankaPct > 40 ? "Medium Hardwood" : "Softwood"}</span>
        </div>
        <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden">
          <div style="width:${jankaPct}%;height:100%;background:var(--green);border-radius:3px"></div>
        </div>
      </div>
      <div style="font-size:12px;color:var(--ink);line-height:1.4">
        • <strong>Flat-Sawn (Tangential) Δ:</strong> ±${tangMovement.toFixed(3)}" (${(tangMovement * 25.4).toFixed(2)} mm)<br>
        • <strong>Quarter-Sawn (Radial) Δ:</strong> ±${radMovement.toFixed(3)}" (${(radMovement * 25.4).toFixed(2)} mm)<br>
        • <em>Stability T/R Ratio:</em> ${species.tr || 1.8} (${(species.tr || 1.8) < 1.6 ? "Superbly Stable" : "Moderate Movement"})<br>
        <span style="font-size:11px;color:var(--muted);display:block;margin-top:4px">💡 ${species.notes || ""}</span>
      </div>
    `;
  }

  // 3. Miter & Polygon Angle Solver
  const sides = parseInt($("#wood-view-sides")?.value, 10) || 4;
  const miterAngle = 180 / sides;
  const cornerAngle = 360 / sides;
  const interiorAngle = 180 - cornerAngle;

  const miterResult = $("#wood-view-miter-result");
  if (miterResult) {
    miterResult.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-size:11px;font-weight:700;color:var(--muted)">MITER SAW ANGLE:</span>
        <strong style="font-size:18px;color:#0284c7">${miterAngle.toFixed(1)}°</strong>
      </div>
      <div style="font-size:12px;color:var(--ink);line-height:1.4">
        • Corner Joint Angle: <strong>${cornerAngle.toFixed(1)}°</strong><br>
        • Interior Polygon Corner: <strong>${interiorAngle.toFixed(1)}°</strong><br>
        • Total Joints: <strong>${sides}</strong> precision cuts (${sides * 2} miter faces)
      </div>
    `;
  }

  // 4. Screw Pilot Guide
  const screwSize = $("#wood-view-screw")?.value || "8";
  const screwData = {
    "6": { shank: '0.138"', hardPilot: '3/32" (0.093")', softPilot: '5/64" (0.078")', clearance: '9/64" (0.140")', csk: '#6 (1/4")' },
    "8": { shank: '0.164"', hardPilot: '7/64" (0.109")', softPilot: '3/32" (0.093")', clearance: '11/64" (0.171")', csk: '#8 (3/8")' },
    "10": { shank: '0.190"', hardPilot: '1/8" (0.125")', softPilot: '7/64" (0.109")', clearance: '3/16" (0.187")', csk: '#10 (3/8")' },
    "12": { shank: '0.216"', hardPilot: '9/64" (0.140")', softPilot: '1/8" (0.125")', clearance: '7/32" (0.218")', csk: '#12 (1/2")' }
  }[screwSize] || { shank: '0.164"', hardPilot: '7/64"', softPilot: '3/32"', clearance: '11/64"', csk: '#8' };

  const screwResult = $("#wood-view-screw-result");
  if (screwResult) {
    screwResult.innerHTML = `
      <div style="font-size:12px;color:var(--ink);line-height:1.4">
        • <strong>Hardwood Pilot Hole:</strong> <span style="color:var(--green);font-weight:700">${screwData.hardPilot}</span><br>
        • <strong>Softwood Pilot Hole:</strong> ${screwData.softPilot}<br>
        • <strong>Clearance Hole:</strong> ${screwData.clearance}<br>
        • <strong>Countersink Diameter:</strong> ${screwData.csk}
      </div>
    `;
  }

  // 5. Joinery & Sanding Guides
  updateWoodJoineryGuide();
  updateWoodSandingGuide();
}

const WOOD_JOINERY_DB = {
  mortise_tenon: {
    name: "Mortise & Tenon",
    strength: "⭐⭐⭐⭐⭐ Exceptional (Gold Standard)",
    racking: "Extreme resistance to diagonal racking forces",
    glueArea: "Very high internal face-to-face glue surface",
    tools: "Mortise chisel, router, or hollow chisel mortiser + tenon saw",
    bestFor: "Table legs and aprons, chair frames, entry doors, frame-and-panel casework",
    tips: "Aim for tenon thickness = 1/3 the board thickness. Tenon length should be 2/3 to 3/4 the mortise piece width."
  },
  through_dovetail: {
    name: "Through Dovetail",
    strength: "⭐⭐⭐⭐⭐ Maximum Mechanical Interlock",
    racking: "Immune to pull-apart tension in the pin direction",
    glueArea: "Extensive long-grain to long-grain contact",
    tools: "Dovetail saw, marking gauge, sharp bench chisels, coping saw",
    bestFor: "Heirloom blanket chests, visible case corners, high-end furniture",
    tips: "Tails first vs. pins first is preference; 1:6 ratio for softwoods, 1:8 for hardwoods."
  },
  half_blind_dovetail: {
    name: "Half-Blind Dovetail",
    strength: "⭐⭐⭐⭐⭐ Superb (Invisible from front)",
    racking: "Exceptional resistance to drawer-opening pull forces",
    glueArea: "High long-grain contact",
    tools: "Dovetail saw, router dovetail jig, or hand chisels",
    bestFor: "Traditional premium drawer box construction",
    tips: "Pins terminate ~1/4\" before the drawer front face, hiding end-grain from the front view."
  },
  pocket_hole: {
    name: "Pocket Hole Screw Joinery",
    strength: "⭐⭐⭐ Moderate to Good",
    racking: "Moderate (relies on screw clamping & friction; no mechanical interlock)",
    glueArea: "End-grain to edge-grain (glue adds minimal strength; screws do the work)",
    tools: "Pocket hole jig (Kreg), stepped drill bit, face clamp, square-drive screws",
    bestFor: "Cabinet face frames, shop furniture, rapid mockups, pocket-attaching table tops",
    tips: "Use coarse-thread screws for softwoods/plywood, fine-thread for hardwoods. Always clamp tightly before driving screws."
  },
  dowel: {
    name: "Dowel Joinery",
    strength: "⭐⭐⭐⭐ High (when multiple fluted dowels used)",
    racking: "High torsional resistance with 2+ dowels per joint",
    glueArea: "High cylindrical surface area (fluted dowels allow glue distribution)",
    tools: "Self-centering dowel jig + brad point bit",
    bestFor: "Edge-to-edge tabletop glue-ups, modular cabinet casework, chair rungs",
    tips: "Use compressed, spiral-fluted dried hardwood dowels. Never use smooth hardware store dowel rods."
  },
  half_lap: {
    name: "Half-Lap / Cross-Lap",
    strength: "⭐⭐⭐⭐ Very High Glue Surface",
    racking: "Strong when properly square and glued",
    glueArea: "Entire lap intersection provides 100% face-grain glue contact",
    tools: "Dado stack on table saw, miter gauge, or router with straight bit",
    bestFor: "Picture frames, Japanese architectural frames, workbench trestle bases",
    tips: "Set blade height to exactly half the workpiece thickness using scrap test blocks."
  },
  box_joint: {
    name: "Box / Finger Joint",
    strength: "⭐⭐⭐⭐⭐ Extremely Strong",
    racking: "Exceptional due to massive interlocking glue surface",
    glueArea: "Maximum glue area of any corner joint",
    tools: "Table saw with dado stack + box joint indexing jig, or CNC router",
    bestFor: "Beehives, guitar amplifier cabinets, toolboxes, decorative storage boxes",
    tips: "Fingers should be cut a hair proud (~1/64\") and flushed with a block plane or card scraper after glue-up."
  },
  splined_miter: {
    name: "Splined Miter Joint",
    strength: "⭐⭐⭐⭐ Very Strong (Reinforced)",
    racking: "High (spline converts weak end-grain miter into long-grain glue shear)",
    glueArea: "Spline adds key cross-grain shear strength across the 45° seam",
    tools: "Table saw with 45° miter sled + spline slotting jig",
    bestFor: "Jewelry boxes, shadow boxes, hardwood picture frames",
    tips: "Make sure the spline grain runs perpendicular to the miter cut line for maximum strength."
  },
  bridle: {
    name: "Bridle Joint (Open Mortise & Tenon)",
    strength: "⭐⭐⭐⭐ Very High",
    racking: "Resists twisting and corner shear exceptionally well",
    glueArea: "Three full glue faces open to inspection",
    tools: "Tenon saw or table saw tenoning jig + coping saw",
    bestFor: "Workbench base stretchers, heavy duty framing, shop doors",
    tips: "Can be pinned with dowels for draw-bored mechanical locking without clamps."
  }
};

function updateWoodJoineryGuide() {
  const key = $("#wood-joinery-select")?.value || "mortise_tenon";
  const j = WOOD_JOINERY_DB[key] || WOOD_JOINERY_DB.mortise_tenon;
  const res = $("#wood-joinery-result");
  if (res) {
    res.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:6px">
        <span style="font-size:11px;font-weight:700;color:var(--muted)">MECHANICAL INTEGRITY:</span>
        <strong style="font-size:15px;color:var(--green)">${j.strength}</strong>
      </div>
      <div style="font-size:12px;color:var(--ink);line-height:1.4">
        • <strong>Racking &amp; Shear Resistance:</strong> ${j.racking}<br>
        • <strong>Glue Surface Area:</strong> ${j.glueArea}<br>
        • <strong>Recommended Tools:</strong> ${j.tools}<br>
        • <strong>Best Use Cases:</strong> <span style="color:#0284c7;font-weight:700">${j.bestFor}</span><br>
        • 💡 <em>Craftsman Tip:</em> ${j.tips}
      </div>
    `;
  }
}

const SANDING_SCHEDULES = {
  rough: {
    grits: ["80 grit (remove tearout)", "120 grit (level surface)", "150 grit", "180 grit", "220 grit (finish prep)"],
    tips: "Spend 60% of your sanding time on 80 and 120 grit. If scratches remain from 80, going to 220 won't hide them! Wipe down with mineral spirits to inspect for scratches."
  },
  planed: {
    grits: ["120 grit (erase mill scalloping)", "150 grit", "180 grit", "220 grit"],
    tips: "Pencil scribble a light zigzag across the board before each grit. When the pencil lines disappear, move to the next grit to avoid uneven dips."
  },
  s4s: {
    grits: ["150 grit (open pores)", "180 grit", "220 grit"],
    tips: "Factory S4S boards are smooth but often glazed/burnished from high-speed commercial rollers. A light 150 grit scuff ensures even oil/stain penetration."
  },
  plywood: {
    grits: ["180 grit (very light pass)", "220 grit (by hand with grain)"],
    tips: "CAUTION: Modern hardwood plywood face veneers are only ~0.5 mm thick! Never use aggressive grits or heavy pressure with a random orbital sander."
  },
  endgrain: {
    grits: ["80 grit (flattening)", "120 grit", "180 grit", "240 grit", "320 grit", "400 grit"],
    tips: "End-grain pores absorb finish rapidly. Sand to at least 320 or 400 grit to achieve a glass-smooth silky feel for cutting boards."
  }
};

function updateWoodSandingGuide() {
  const starting = $("#wood-sand-starting")?.value || "planed";
  const finishType = $("#wood-sand-finish-type")?.value || "oil_hardwax";
  const s = SANDING_SCHEDULES[starting] || SANDING_SCHEDULES.planed;

  let maxGritNote = "";
  if (finishType === "oil_hardwax") {
    maxGritNote = "Stop at 180 or 220 grit! Sanding higher closes wood pores, preventing hardwax oils (Rubio/Osmo) from bonding chemically with raw cellulose.";
  } else if (finishType === "water_poly") {
    maxGritNote = "Raise the grain! After 180 grit, wipe with a damp cloth, let dry 30 minutes, then sand lightly with 220 grit to remove raised grain before topcoating.";
  } else if (finishType === "film_poly") {
    maxGritNote = "Sand between cured coats with 320 or 400 grit (or maroon synthetic pad) to de-nib dust nibs and ensure mechanical inter-coat adhesion.";
  } else {
    maxGritNote = "Prime with high-build shellac or oil primer; sand primer flat with 240 grit before applying enamel topcoats.";
  }

  const res = $("#wood-sand-result");
  if (res) {
    res.innerHTML = `
      <div style="font-size:12px;color:var(--ink);line-height:1.4">
        • <strong>Recommended Grit Sequence:</strong><br>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin:4px 0">
          ${s.grits.map(g => `<span style="background:var(--surface);border:1px solid var(--border);border-radius:4px;padding:2px 6px;font-size:11px;font-weight:700;color:var(--green)">${g}</span>`).join(" → ")}
        </div>
        • 💡 <em>Sanding Protocol:</em> ${s.tips}<br>
        • 🎯 <em>Finish Specific Requirement:</em> <span style="color:#0284c7;font-weight:700">${maxGritNote}</span>
      </div>
    `;
  }
}

/* ============================================================
   🥽 Workshop Safety, PPE & Chemical Compatibility Guide
   ============================================================ */
const WOOD_SAFETY_DB = {
  tablesaw: {
    title: "Table Saw & Miter Saw",
    hazards: "High-velocity blade contact, projectile kickback, fine inhalable sawdust (respirable particles <10μm).",
    eye: "ANSI Z87.1+ impact-resistant safety glasses with side shields.",
    resp: "N95 or P100 particulate half-mask respirator.",
    hearing: "NRR 28–32 dB earmuffs or foam earplugs (Table saws operate at 95–102 dB).",
    hands: "⚠️ NEVER WEAR GLOVES! Gloves can snag into the high-speed blade and pull hands in.",
    vent: "Dedicated dust collection at blade shroud (minimum 450 CFM) + riving knife installed.",
    tips: "Always stand outside the kickback trajectory path. Use push sticks and featherboards for rips under 6 inches."
  },
  router: {
    title: "Router Table & Handheld Router",
    hazards: "Extreme spindle speed (10,000–24,000 RPM), high-volume fine dust, chip ejection, resin binder fumes in MDF/plywood.",
    eye: "Full polycarbonate face shield over ANSI Z87+ safety glasses.",
    resp: "N95 or P100 dust mask (MDF contains urea-formaldehyde resins).",
    hearing: "NRR 30+ dB hearing protection (Routers produce ear-damaging high-pitch screaming >100 dB).",
    hands: "NO GLOVES near spinning collet. Use gripper pads and push blocks.",
    vent: "Dual-port dust collection (fence port + router under-table cabinet suction).",
    tips: "Always feed against the bit rotation (climb-cutting can violently wrench the board from your grasp)."
  },
  sanding: {
    title: "Random Orbital Sanding & Surface Prep",
    hazards: "Microscopic airborne wood dust; sensitization to exotic hardwoods (e.g. cocobolo, rosewood, walnut).",
    eye: "Sealed dust goggles or close-fitting safety glasses.",
    resp: "P100 HEPA half-mask respirator (filters 99.97% of airborne particulates down to 0.3μm).",
    hearing: "NRR 24–28 dB earmuffs.",
    hands: "Vibration-dampening gloves or bare hands. Nitrile gloves when wiping with mineral spirits.",
    vent: "Sander vacuum extraction hose + ambient ceiling air cleaner running.",
    tips: "Exotic hardwoods cause allergic respiratory reactions. Clean work surfaces with vacuum, never compressed air blowing!"
  },
  epoxy_pour: {
    title: "Epoxy Resin Pouring & Deep Casting",
    hazards: "Sensitizing amine hardener vapor, thermal runaway (exotherm boiling), toxic dermatitis upon skin contact.",
    eye: "Chemical splash goggles.",
    resp: "Half-face respirator with Organic Vapor (OV) cartridges (e.g., 3M 6001). Dust masks provide ZERO vapor protection!",
    hearing: "None needed.",
    hands: "Nitrile gloves (Latex breaks down quickly in contact with epoxy resins).",
    vent: "Cross-ventilation with active exhaust fan or dedicated fume extractor.",
    tips: "Never use acetone or solvents to wash epoxy off skin; solvents open skin pores and carry toxic amines deeper. Wash with warm water and citrus soap or vinegar!"
  },
  spray_finish: {
    title: "Spray Lacquer, Polyurethane & Paint",
    hazards: "Explosive aerosol solvent mist, toluene/xylene neurotoxins, isocyanates in 2K urethane.",
    eye: "Sealed chemical goggles or full-face respirator.",
    resp: "Half-face or full-face respirator with Organic Vapor (OV) + P100 Particulate pre-filters (3M 60921).",
    hearing: "NRR 22–26 dB for compressor and HVLP spray roar.",
    hands: "Nitrile or chemical-resistant butyl gloves.",
    vent: "Dedicated spray booth with explosion-proof exhaust fan. No open flames, pilot lights, or sparks within 30 feet!",
    tips: "Allow cured overspray filters to off-gas outdoors before disposal."
  },
  oily_rags: {
    title: "Hardwax Oil & Danish Oil (Spontaneous Combustion)",
    hazards: "🚨 CRITICAL FIRE HAZARD: Linseed oil & tung oil cure via exothermic oxidation. Crumpled oil rags generate heat and self-ignite!",
    eye: "Safety glasses.",
    resp: "Organic vapor respirator during wipe-down.",
    hearing: "None needed.",
    hands: "Heavy-duty nitrile gloves.",
    vent: "Good shop airflow until topcoat cures.",
    tips: "🔥 NEVER throw oil-soaked rags into trash cans! Immediately immerse rags in a sealed metal can filled with water, or lay them flat individually on concrete outdoors to fully dry and harden before disposal."
  },
  laser_cutting: {
    title: "Laser Cutting & Engraving (CO2 / Diode)",
    hazards: "Laser optical radiation (permanent retinal burn), toxic hydrogen cyanide from acrylic/leather, formaldehyde from MDF.",
    eye: "Wavelength-certified laser safety glasses (OD 5+ matching laser nm wavelength, e.g. 450nm diode or 10,600nm CO2). Regular glasses offer ZERO laser protection!",
    resp: "Fume extractor with activated carbon + HEPA filter.",
    hearing: "None needed.",
    hands: "Heat-resistant gloves when handling freshly cut acrylic or metal.",
    vent: "Dedicated sealed exhaust duct vented directly outside with inline blower.",
    tips: "NEVER cut PVC, vinyl, or faux leather with chlorine content; heating creates hydrochloric acid gas that destroys lungs and corrodes machine rails!"
  },
  soldering: {
    title: "Electronics Soldering & Assembly",
    hazards: "Lead particulate from solder alloy, vaporized colophony (rosin acid) smoke causing occupational asthma, hot iron burns (350°C).",
    eye: "Safety glasses (protects against popping solder flux droplets).",
    resp: "Activated carbon fume absorber or ducted smoke trap.",
    hearing: "None needed.",
    hands: "Wash hands thoroughly with soap after handling leaded solder before eating or drinking.",
    vent: "Position fume extractor 4–6 inches from workpiece.",
    tips: "Use lead-free solder (SAC305) for toys, food-contact items, and wearable electronics."
  },
  metal_grind: {
    title: "Angle Grinder & Metal Cutting",
    hazards: "Exploding abrasive disc shrapnel, incandescent hot iron sparks (1200°C), metal fume fever.",
    eye: "Full face shield over ANSI Z87+ safety glasses.",
    resp: "P100 particulate respirator for metal dust and abrasive wheel binders.",
    hearing: "NRR 28–32 dB earmuffs (Grinders reach 105+ dB).",
    hands: "Heavy-duty split-cowhide leather welding/grinding gloves.",
    vent: "Ensure no flammable liquids, sawdust bins, or solvent rags are in the spark shower zone (minimum 25-foot radius).",
    tips: "Never use an angle grinder without the manufacturer's steel wheel guard securely in place."
  }
};

function updateWoodSafetyGuide() {
  const key = $("#wood-safety-process-select")?.value || "tablesaw";
  const s = WOOD_SAFETY_DB[key] || WOOD_SAFETY_DB.tablesaw;
  const res = $("#wood-safety-result");
  if (!res) return;

  res.innerHTML = `
    <div style="font-size:12px;color:var(--ink);line-height:1.45">
      <div style="margin-bottom:6px">
        <strong style="color:#ef4444">⚠️ Primary Hazards:</strong> ${s.hazards}
      </div>
      <div class="safety-ppe-grid">
        <div class="safety-ppe-card">
          <div class="safety-ppe-icon">🥽</div>
          <div class="safety-ppe-title">Eye &amp; Face</div>
          <div class="safety-ppe-val">${s.eye}</div>
        </div>
        <div class="safety-ppe-card">
          <div class="safety-ppe-icon">😷</div>
          <div class="safety-ppe-title">Respiratory</div>
          <div class="safety-ppe-val">${s.resp}</div>
        </div>
        <div class="safety-ppe-card">
          <div class="safety-ppe-icon">🎧</div>
          <div class="safety-ppe-title">Hearing</div>
          <div class="safety-ppe-val">${s.hearing}</div>
        </div>
        <div class="safety-ppe-card">
          <div class="safety-ppe-icon">🧤</div>
          <div class="safety-ppe-title">Hand &amp; Skin</div>
          <div class="safety-ppe-val">${s.hands}</div>
        </div>
      </div>
      <div style="margin-top:6px">
        • <strong>Ventilation Requirement:</strong> ${s.vent}<br>
        • 💡 <em>Craftsman Safety Rule:</em> <span style="color:#0284c7;font-weight:700">${s.tips}</span>
      </div>
    </div>
  `;
}

// --- 🪵 Woodworking Studio: Sagulator (Shelf Sag & Beam Deflection) ---
const WOOD_SAG_SPECIES_DB = {
  pine: { name: "Eastern White Pine", E: 1.24e6, type: "Softwood", note: "Common softwood, moderate stiffness." },
  doug_fir: { name: "Douglas Fir", E: 1.95e6, type: "Structural Softwood", note: "Exceptional stiffness for framing & shelving." },
  red_oak: { name: "Red Oak", E: 1.82e6, type: "Northern Hardwood", note: "Heavy, stiff, classic bookshelf hardwood." },
  white_oak: { name: "White Oak", E: 1.78e6, type: "High-Density Hardwood", note: "Stiff and decay-resistant." },
  hard_maple: { name: "Hard Sugar Maple", E: 1.83e6, type: "Dense Hardwood", note: "Extremely rigid furniture wood." },
  walnut: { name: "Black Walnut", E: 1.68e6, type: "Furniture Hardwood", note: "Premium fine woodworking timber." },
  cherry: { name: "Black Cherry", E: 1.49e6, type: "Hardwood", note: "Stable and medium-stiff cabinet wood." },
  baltic_birch: { name: "Baltic Birch Plywood", E: 1.25e6, type: "Multi-Ply Hardwood", note: "All-birch void-free core, stiffer than standard ply." },
  hardwood_ply: { name: "Cabinet Hardwood Plywood", E: 1.10e6, type: "Veneer Core Plywood", note: "Fir or poplar core with veneer face." },
  mdf: { name: "MDF (Medium Density Fiberboard)", E: 0.55e6, type: "Engineered Composite", note: "High sag risk under sustained heavy loads." },
  particle: { name: "Particle Board / Melamine", E: 0.40e6, type: "Pressed Chip Board", note: "Very weak in bending; requires frequent center supports." }
};

function updateSagulatorCalc() {
  const speciesKey = $("#wood-sag-species")?.value || "pine";
  const species = WOOD_SAG_SPECIES_DB[speciesKey] || WOOD_SAG_SPECIES_DB.pine;
  const span = Math.max(6, parseFloat($("#wood-sag-span")?.value) || 36);
  const depth = Math.max(2, parseFloat($("#wood-sag-depth")?.value) || 10);
  const thick = parseFloat($("#wood-sag-thick")?.value) || 0.75;
  const edge = $("#wood-sag-edge")?.value || "none";
  const loadType = $("#wood-sag-load-type")?.value || "uniform";
  const wtUnit = $("#wood-sag-wt-unit")?.value || "lbs";
  let rawWeight = Math.max(1, parseFloat($("#wood-sag-weight")?.value) || 45);
  const weightLbs = (wtUnit === "kg") ? (rawWeight * 2.20462) : rawWeight;
  const support = $("#wood-sag-support")?.value || "floating";
  const res = $("#wood-sag-result");
  if (!res) return;

  // Base Moment of Inertia I = (b * h^3) / 12
  let I = (depth * Math.pow(thick, 3)) / 12;

  // Edge stiffener contribution
  let edgeLabel = "Plain raw edge";
  if (edge === "lip_1x1.5") {
    I *= 3.8;
    edgeLabel = "1x1.5\" Solid Front Lip";
  } else if (edge === "lip_1x2") {
    I *= 5.5;
    edgeLabel = "1x2\" Solid Front Lip";
  } else if (edge === "cleat_bottom") {
    I *= 3.1;
    edgeLabel = "0.75x1.5\" Under-Shelf Cleat";
  }

  const E = species.E; // psi
  const W = weightLbs;
  const L = span; // inches

  let delta = 0; // inches
  if (loadType === "uniform") {
    delta = (support === "fixed")
      ? (W * Math.pow(L, 3)) / (384 * E * I)
      : (5 * W * Math.pow(L, 3)) / (384 * E * I);
  } else {
    delta = (support === "fixed")
      ? (W * Math.pow(L, 3)) / (192 * E * I)
      : (W * Math.pow(L, 3)) / (48 * E * I);
  }

  const deltaMm = delta * 25.4;
  const sagPerFt = delta / (L / 12);
  const ratio = Math.round(L / Math.max(0.0001, delta));

  let statusClass = "rigid";
  let statusText = "🟢 Barely Visible / Rigid";
  let statusDesc = "Sag is imperceptible under normal room viewing (< 0.02\"/ft). Exceptional stiffness.";

  if (sagPerFt > 0.04) {
    statusClass = "excessive";
    statusText = "🔴 Excessive Sagging Risk";
    statusDesc = "Severe visible droop (> 0.04\"/ft) and long-term creep failure hazard. Shorten span, thicken stock, or add center divider.";
  } else if (sagPerFt > 0.02) {
    statusClass = "borderline";
    statusText = "🟡 Borderline / Visible Sag";
    statusDesc = "Sag will be noticeable across the room under heavy loads (0.02 - 0.04\"/ft). Adding a solid front lip or thicker shelf is recommended.";
  }

  // Dynamic visual SVG curve
  const curveDip = Math.min(42, Math.max(2, delta * 300));
  const svgCurve = `
    <svg viewBox="0 0 360 80" width="100%" height="70" style="overflow:visible;display:block">
      <!-- Supports -->
      <polygon points="20,50 30,70 10,70" fill="var(--border)" stroke="var(--ink)" stroke-width="1.5"/>
      <polygon points="340,50 350,70 330,70" fill="var(--border)" stroke="var(--ink)" stroke-width="1.5"/>
      <!-- Shelf flat reference line (dashed) -->
      <line x1="20" y1="48" x2="340" y2="48" stroke="var(--border)" stroke-width="1" stroke-dasharray="4,4"/>
      <!-- Deflected Shelf Curve -->
      <path d="M 20 48 Q 180 ${48 + curveDip} 340 48" fill="none" stroke="${sagPerFt > 0.04 ? '#ef4444' : sagPerFt > 0.02 ? '#f59e0b' : '#10b981'}" stroke-width="4" stroke-linecap="round"/>
      <!-- Deflection arrow -->
      <line x1="180" y1="48" x2="180" y2="${48 + curveDip}" stroke="${sagPerFt > 0.04 ? '#ef4444' : sagPerFt > 0.02 ? '#f59e0b' : '#10b981'}" stroke-width="1.5" stroke-dasharray="2,2"/>
      <text x="180" y="24" text-anchor="middle" font-size="11" font-weight="700" fill="var(--ink)">
        Span ${L}" · ${rawWeight} ${wtUnit} ${loadType === "uniform" ? "Uniform" : "Center"} Load
      </text>
      <text x="180" y="${56 + curveDip + 14}" text-anchor="middle" font-size="11" font-weight="800" fill="${sagPerFt > 0.04 ? '#ef4444' : sagPerFt > 0.02 ? '#f59e0b' : '#10b981'}">
        Sag: ${delta.toFixed(3)}" (${deltaMm.toFixed(2)} mm) · L/${ratio}
      </text>
    </svg>
  `;

  res.innerHTML = `
    <div class="sag-result-hero">
      <div>
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;font-weight:700">Calculated Elastic Beam Sag</div>
        <div style="font-size:24px;font-weight:900;color:var(--ink);margin:2px 0">
          ${delta.toFixed(3)}" <span style="font-size:14px;color:var(--muted);font-weight:600">(${deltaMm.toFixed(2)} mm)</span>
        </div>
      </div>
      <div>
        <span class="sag-status-badge ${statusClass}">${statusText}</span>
      </div>
    </div>

    <div class="sag-graphic-wrap">
      ${svgCurve}
    </div>

    <div style="font-size:11px;color:var(--ink);background:var(--surface);padding:8px 12px;border:1px solid var(--border);border-radius:6px;margin:8px 0">
      <strong>Structural Assessment:</strong> ${statusDesc}
    </div>

    <div class="sag-specs-grid">
      <div class="sag-spec-card">
        <div class="val">${species.name}</div>
        <div class="lbl">Wood Species (E = ${(E/1e6).toFixed(2)} Mpsi)</div>
      </div>
      <div class="sag-spec-card">
        <div class="val">${sagPerFt.toFixed(3)}" / ft</div>
        <div class="lbl">Deflection Rate</div>
      </div>
      <div class="sag-spec-card">
        <div class="val">L / ${ratio}</div>
        <div class="lbl">Stiffness Ratio</div>
      </div>
      <div class="sag-spec-card">
        <div class="val">${I.toFixed(2)} in⁴</div>
        <div class="lbl">Moment of Inertia (${edgeLabel})</div>
      </div>
    </div>

    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;flex-wrap:wrap">
      <button type="button" class="button button-small button-outline" data-action="copy-sag-specs">📋 Copy Sag Specs</button>
      <button type="button" class="button button-small button-primary" data-action="save-sag-to-materials">➕ Add Lumber to Project Materials</button>
    </div>
  `;
}

async function copySagSpecs() {
  const species = $("#wood-sag-species option:checked")?.textContent || "Wood";
  const span = $("#wood-sag-span")?.value || "36";
  const depth = $("#wood-sag-depth")?.value || "10";
  const thick = $("#wood-sag-thick option:checked")?.textContent || "3/4\"";
  const weight = $("#wood-sag-weight")?.value || "45";
  const unit = $("#wood-sag-wt-unit")?.value || "lbs";
  const heroVal = $("#wood-sag-result .sag-result-hero div:first-child div:nth-child(2)")?.textContent.trim() || "";

  const text = `Shelf Sag (The Sagulator) Calculation:\n• Species: ${species}\n• Shelf: ${span}" span × ${depth}" deep × ${thick} thick\n• Load: ${weight} ${unit}\n• Resulting Deflection: ${heroVal}\nGenerated by Workbench Journal`;
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied Sagulator specs to clipboard!");
  } catch {
    showToast("Specs generated.");
  }
}

async function saveSagToProjectMaterials() {
  const species = $("#wood-sag-species option:checked")?.textContent.split("·")[0].trim() || "Hardwood";
  const span = $("#wood-sag-span")?.value || "36";
  const depth = $("#wood-sag-depth")?.value || "10";
  const thick = $("#wood-sag-thick option:checked")?.textContent.split("(")[0].trim() || "3/4\"";
  await addMaterialToProjectShopping(`${species} Shelf Board (${thick} × ${depth}" × ${span}")`, "1 pc", 0, "Lumber & Sheet Goods");
}

// --- 🌡️ Woodworking: Equilibrium Moisture Content (EMC) & Wood Movement ---
const WOOD_EMC_SPECIES = {
  red_oak: { name: "Red Oak", tang: 0.00369, rad: 0.00158 },
  white_oak: { name: "White Oak", tang: 0.00448, rad: 0.00222 },
  hard_maple: { name: "Hard Sugar Maple", tang: 0.00353, rad: 0.00165 },
  walnut: { name: "Black Walnut", tang: 0.00274, rad: 0.00190 },
  cherry: { name: "Black Cherry", tang: 0.00248, rad: 0.00126 },
  white_pine: { name: "Eastern White Pine", tang: 0.00216, rad: 0.00082 },
  doug_fir: { name: "Douglas Fir", tang: 0.00267, rad: 0.00165 }
};

function calculateFplEmc(tempF, rhPercent) {
  const h = Math.max(0.01, Math.min(0.99, rhPercent / 100));
  const T = tempF;
  const W = 330 + 0.452 * T + 0.00415 * Math.pow(T, 2);
  const K = 0.791 + 0.000463 * T - 0.000000844 * Math.pow(T, 2);
  const K1 = 6.34 + 0.00775 * T - 0.0000935 * Math.pow(T, 2);
  const K2 = 1.09 + 0.0284 * T - 0.0000904 * Math.pow(T, 2);

  const term1 = (K * h) / (1 - K * h);
  const term2 = (K1 * K * h + 2 * K1 * K2 * Math.pow(K * h, 2)) / (1 + K1 * K * h + K1 * K2 * Math.pow(K * h, 2));
  return (1800 / W) * (term1 + term2);
}

function updateWoodEmcCalc() {
  const speciesKey = $("#wood-emc-species")?.value || "red_oak";
  const species = WOOD_EMC_SPECIES[speciesKey] || WOOD_EMC_SPECIES.red_oak;
  const tempUnit = $("#wood-emc-temp-unit")?.value || "f";
  let tempRaw = parseFloat($("#wood-emc-temp")?.value) || 70;
  const tempF = (tempUnit === "c") ? (tempRaw * 9/5 + 32) : tempRaw;
  const rh = parseFloat($("#wood-emc-rh-slider")?.value) || 45;
  const envKey = $("#wood-emc-env")?.value || "indoor_annual";
  const panelUnit = $("#wood-emc-panel-unit")?.value || "in";
  let panelW = parseFloat($("#wood-emc-panel-w")?.value) || 36;
  const grain = $("#wood-emc-grain")?.value || "flatsawn";
  const res = $("#wood-emc-result");
  if (!res) return;

  const rhValEl = $("#wood-emc-rh-val");
  if (rhValEl) rhValEl.textContent = `${rh}%`;

  const shopEmc = calculateFplEmc(tempF, rh);

  // Target environment EMC
  let targetEmc = 8.5;
  let envLabel = "Normal Air-Conditioned Home (~45% RH · 8.5% EMC)";
  if (envKey === "indoor_winter") { targetEmc = 6.0; envLabel = "Winter Heated Indoor (~30% RH · 6.0% EMC)"; }
  else if (envKey === "indoor_summer") { targetEmc = 13.0; envLabel = "Humid Summer Indoor (~70% RH · 13.0% EMC)"; }
  else if (envKey === "outdoor_covered") { targetEmc = 14.5; envLabel = "Covered Porch / Outdoor Deck (~75% RH · 14.5% EMC)"; }

  // Grain shrinkage factor C
  let factorC = species.tang;
  if (grain === "quartersawn") factorC = species.rad;
  else if (grain === "mixed") factorC = (species.tang + species.rad) / 2;

  // Delta moisture between current shop EMC and target environment
  const deltaM = targetEmc - shopEmc;
  const widthInches = (panelUnit === "mm") ? (panelW / 25.4) : panelW;
  const deltaWInches = widthInches * factorC * deltaM;
  const deltaWMm = deltaWInches * 25.4;

  let advice = "";
  if (Math.abs(deltaM) < 1.0) {
    advice = "🟢 <strong>Lumber is Acclimated:</strong> Current shop moisture content matches the target indoor environment within ±1%. Safe to mill, joint, and glue without excessive seasonal distortion.";
  } else if (deltaM < 0) {
    advice = `🟡 <strong>Lumber is Wetter Than Target:</strong> Wood will shrink by <strong>${Math.abs(deltaWInches).toFixed(3)}" (${Math.abs(deltaWMm).toFixed(1)} mm)</strong> after moving indoors. Allow boards to sticker and dry in the shop for 1-2 weeks before final jointing, or panel seams will gap.`;
  } else {
    advice = `🟡 <strong>Lumber is Drier Than Target:</strong> Wood will expand by <strong>+${deltaWInches.toFixed(3)}" (+${deltaWMm.toFixed(1)} mm)</strong> when installed. Always attach tabletops with Figure-8 fasteners, Z-clips, or slotted screw holes so the top can expand without splitting aprons.`;
  }

  const emcBarWidth = Math.min(100, (shopEmc / 25) * 100);

  res.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:10px;margin-bottom:12px">
      <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">Workshop Equilibrium (EMC)</div>
        <div style="font-size:22px;font-weight:900;color:var(--ink);margin:2px 0">
          ${shopEmc.toFixed(1)}% <span style="font-size:12px;color:var(--muted)">moisture</span>
        </div>
        <div class="emc-viz-bar"><div class="emc-viz-fill" style="width:${emcBarWidth}%"></div></div>
        <div style="font-size:10px;color:var(--muted)">At ${tempRaw}°${tempUnit.toUpperCase()} &amp; ${rh}% RH (US FPL formula)</div>
      </div>

      <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">Target Finished Room EMC</div>
        <div style="font-size:22px;font-weight:900;color:var(--green);margin:2px 0">
          ${targetEmc.toFixed(1)}% <span style="font-size:12px;color:var(--muted)">target</span>
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:6px">${envLabel}</div>
      </div>

      <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">Tabletop Seasonal Width Shift</div>
        <div style="font-size:22px;font-weight:900;color:${deltaWInches >= 0 ? '#38bdf8' : '#f59e0b'};margin:2px 0">
          ${deltaWInches >= 0 ? '+' : ''}${deltaWInches.toFixed(3)}"
          <span style="font-size:13px;color:var(--muted)">(${deltaWMm >= 0 ? '+' : ''}${deltaWMm.toFixed(1)} mm)</span>
        </div>
        <div style="font-size:10px;color:var(--muted)">Across ${panelW} ${panelUnit} wide ${grain} panel</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink);background:var(--surface);padding:8px 12px;border:1px solid var(--border);border-radius:6px;margin:8px 0">
      ${advice}
    </div>

    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px">
      <button type="button" class="button button-small button-outline" data-action="copy-emc-specs">📋 Copy Wood Movement Specs</button>
    </div>
  `;
}

async function copyEmcSpecs() {
  const species = $("#wood-emc-species option:checked")?.textContent.split("(")[0].trim() || "Wood";
  const emcVal = $("#wood-emc-result div:first-child div:first-child div:nth-child(2)")?.textContent.trim() || "";
  const shiftVal = $("#wood-emc-result div:first-child div:nth-child(3) div:nth-child(2)")?.textContent.trim() || "";
  const text = `Wood Movement & Moisture Specs:\n• Species: ${species}\n• Shop EMC: ${emcVal}\n• Seasonal Width Shift: ${shiftVal}\nGenerated by Workbench Journal`;
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied Wood Movement specs to clipboard!");
  } catch {
    showToast("Specs generated.");
  }
}

// --- 🔩 Fastener, Bolt & Tap Drill Precision Finder ---
const FASTENER_DATABASE = {
  metric: [
    { size: "M1.6", pitch: 0.35, majorMm: 1.6, tapSoftMm: 1.25, tapHardMm: 1.30, closeMm: 1.7, freeMm: 1.8, hexKey: "1.5mm", tpi: 72.6 },
    { size: "M2", pitch: 0.40, majorMm: 2.0, tapSoftMm: 1.60, tapHardMm: 1.65, closeMm: 2.1, freeMm: 2.2, hexKey: "1.5mm", tpi: 63.5 },
    { size: "M2.5", pitch: 0.45, majorMm: 2.5, tapSoftMm: 2.05, tapHardMm: 2.10, closeMm: 2.6, freeMm: 2.8, hexKey: "2.0mm", tpi: 56.4 },
    { size: "M3", pitch: 0.50, majorMm: 3.0, tapSoftMm: 2.50, tapHardMm: 2.60, closeMm: 3.2, freeMm: 3.4, hexKey: "2.5mm", tpi: 50.8 },
    { size: "M4", pitch: 0.70, majorMm: 4.0, tapSoftMm: 3.30, tapHardMm: 3.40, closeMm: 4.2, freeMm: 4.5, hexKey: "3.0mm", tpi: 36.3 },
    { size: "M5", pitch: 0.80, majorMm: 5.0, tapSoftMm: 4.20, tapHardMm: 4.30, closeMm: 5.3, freeMm: 5.5, hexKey: "4.0mm", tpi: 31.8 },
    { size: "M6", pitch: 1.00, majorMm: 6.0, tapSoftMm: 5.00, tapHardMm: 5.20, closeMm: 6.3, freeMm: 6.6, hexKey: "5.0mm", tpi: 25.4 },
    { size: "M8", pitch: 1.25, majorMm: 8.0, tapSoftMm: 6.80, tapHardMm: 7.00, closeMm: 8.4, freeMm: 9.0, hexKey: "6.0mm", tpi: 20.3 },
    { size: "M10", pitch: 1.50, majorMm: 10.0, tapSoftMm: 8.50, tapHardMm: 8.80, closeMm: 10.5, freeMm: 11.0, hexKey: "8.0mm", tpi: 16.9 },
    { size: "M12", pitch: 1.75, majorMm: 12.0, tapSoftMm: 10.20, tapHardMm: 10.50, closeMm: 12.5, freeMm: 13.5, hexKey: "10.0mm", tpi: 14.5 }
  ],
  imperial_unc: [
    { size: "#2-56 UNC", pitch: 0.454, majorIn: 0.086, majorMm: 2.18, tapSoft: "#50 (0.070\")", tapHard: "#49 (0.073\")", closeIn: "#43 (0.089\")", freeIn: "#41 (0.096\")", hexKey: "5/64\"", tpi: 56 },
    { size: "#4-40 UNC", pitch: 0.635, majorIn: 0.112, majorMm: 2.84, tapSoft: "#43 (0.089\")", tapHard: "#42 (0.093\")", closeIn: "#32 (0.116\")", freeIn: "#30 (0.128\")", hexKey: "3/32\"", tpi: 40 },
    { size: "#6-32 UNC", pitch: 0.794, majorIn: 0.138, majorMm: 3.51, tapSoft: "#36 (0.106\")", tapHard: "#35 (0.110\")", closeIn: "#27 (0.144\")", freeIn: "#25 (0.149\")", hexKey: "7/64\"", tpi: 32 },
    { size: "#8-32 UNC", pitch: 0.794, majorIn: 0.164, majorMm: 4.17, tapSoft: "#29 (0.136\")", tapHard: "#28 (0.140\")", closeIn: "#18 (0.169\")", freeIn: "#16 (0.177\")", hexKey: "9/64\"", tpi: 32 },
    { size: "#10-24 UNC", pitch: 1.058, majorIn: 0.190, majorMm: 4.83, tapSoft: "#25 (0.149\")", tapHard: "#21 (0.159\")", closeIn: "#8 (0.199\")", freeIn: "#6 (0.204\")", hexKey: "5/32\"", tpi: 24 },
    { size: "1/4\"-20 UNC", pitch: 1.270, majorIn: 0.250, majorMm: 6.35, tapSoft: "#7 (0.201\")", tapHard: "13/64\" (0.203\")", closeIn: "F (0.257\")", freeIn: "9/32\" (0.281\")", hexKey: "3/16\"", tpi: 20 },
    { size: "5/16\"-18 UNC", pitch: 1.411, majorIn: 0.312, majorMm: 7.94, tapSoft: "F (0.257\")", tapHard: "G (0.261\")", closeIn: "21/64\" (0.328\")", freeIn: "11/32\" (0.344\")", hexKey: "1/4\"", tpi: 18 },
    { size: "3/8\"-16 UNC", pitch: 1.588, majorIn: 0.375, majorMm: 9.53, tapSoft: "5/16\" (0.312\")", tapHard: "Q (0.332\")", closeIn: "25/64\" (0.391\")", freeIn: "13/32\" (0.406\")", hexKey: "5/16\"", tpi: 16 },
    { size: "1/2\"-13 UNC", pitch: 1.954, majorIn: 0.500, majorMm: 12.70, tapSoft: "27/64\" (0.422\")", tapHard: "7/16\" (0.437\")", closeIn: "17/32\" (0.531\")", freeIn: "9/16\" (0.562\")", hexKey: "3/8\"", tpi: 13 }
  ],
  imperial_unf: [
    { size: "#10-32 UNF", pitch: 0.794, majorIn: 0.190, majorMm: 4.83, tapSoft: "#21 (0.159\")", tapHard: "#19 (0.166\")", closeIn: "#8 (0.199\")", freeIn: "#6 (0.204\")", hexKey: "5/32\"", tpi: 32 },
    { size: "1/4\"-28 UNF", pitch: 0.907, majorIn: 0.250, majorMm: 6.35, tapSoft: "#3 (0.213\")", tapHard: "7/32\" (0.218\")", closeIn: "F (0.257\")", freeIn: "9/32\" (0.281\")", hexKey: "3/16\"", tpi: 28 },
    { size: "5/16\"-24 UNF", pitch: 1.058, majorIn: 0.312, majorMm: 7.94, tapSoft: "I (0.272\")", tapHard: "17/64\" (0.266\")", closeIn: "21/64\" (0.328\")", freeIn: "11/32\" (0.344\")", hexKey: "1/4\"", tpi: 24 },
    { size: "3/8\"-24 UNF", pitch: 1.058, majorIn: 0.375, majorMm: 9.53, tapSoft: "Q (0.332\")", tapHard: "21/64\" (0.328\")", closeIn: "25/64\" (0.391\")", freeIn: "13/32\" (0.406\")", hexKey: "5/16\"", tpi: 24 }
  ]
};

function populateFastenerFinderSizes() {
  const sys = $("#fastener-system")?.value || "metric";
  const sizeSelect = $("#fastener-size");
  if (!sizeSelect) return;

  const list = FASTENER_DATABASE[sys] || FASTENER_DATABASE.metric;
  const curVal = sizeSelect.value;
  sizeSelect.innerHTML = list.map(item => `
    <option value="${item.size}" ${item.size === curVal ? "selected" : ""}>
      ${item.size} (${sys === "metric" ? `${item.majorMm} mm` : `${item.majorIn}" / ${item.majorMm} mm`})
    </option>
  `).join("");
}

function updateFastenerFinder() {
  populateFastenerFinderSizes();
  const sys = $("#fastener-system")?.value || "metric";
  const sizeKey = $("#fastener-size")?.value;
  const headType = $("#fastener-head-type")?.value || "socket_cap";
  const material = $("#fastener-material")?.value || "soft";
  const res = $("#fastener-result");
  if (!res) return;

  const list = FASTENER_DATABASE[sys] || FASTENER_DATABASE.metric;
  const f = list.find(item => item.size === sizeKey) || list[3] || list[0];

  let tapDrill = "";
  if (sys === "metric") {
    tapDrill = (material === "hard") ? `${f.tapHardMm} mm (65% thread depth)` : `${f.tapSoftMm} mm (75% thread depth)`;
  } else {
    tapDrill = (material === "hard") ? `${f.tapHard} (65% depth)` : `${f.tapSoft} (75% depth)`;
  }
  const closeFit = sys === "metric" ? `${f.closeMm} mm` : f.closeIn;
  const freeFit = sys === "metric" ? `${f.freeMm} mm` : f.freeIn;
  const countersinkAngle = sys === "metric" ? "90° (DIN / ISO)" : "82° (ANSI / ASME)";

  const diaMm = f.majorMm;
  const scale = 8;
  const shankW = diaMm * scale;
  const headW = diaMm * scale * (headType === "hex_bolt" ? 1.7 : 1.5);
  const headH = diaMm * scale * 0.8;
  const shankL = 70;

  let headPath = "";
  if (headType === "countersunk") {
    headPath = `<polygon points="${150 - headW/2},15 ${150 + headW/2},15 ${150 + shankW/2},${15 + headH} ${150 - shankW/2},${15 + headH}" fill="#38bdf8" opacity="0.85"/>`;
  } else if (headType === "hex_bolt") {
    headPath = `<rect x="${150 - headW/2}" y="${25 - headH}" width="${headW}" height="${headH}" rx="1" fill="#f59e0b" opacity="0.85"/>`;
  } else {
    headPath = `<rect x="${150 - headW/2}" y="${25 - headH}" width="${headW}" height="${headH}" rx="3" fill="#38bdf8" opacity="0.85"/>`;
  }

  const svgSilhouette = `
    <div class="fastener-silhouette-wrap">
      <svg viewBox="0 0 300 130" width="100%" height="110">
        <line x1="20" y1="25" x2="280" y2="25" stroke="#334155" stroke-dasharray="2,2"/>
        ${headPath}
        <rect x="${150 - shankW/2}" y="25" width="${shankW}" height="${shankL}" fill="#64748b" opacity="0.75" rx="1"/>
        ${Array.from({ length: 8 }).map((_, i) => `
          <line x1="${150 - shankW/2}" y1="${32 + i * 6}" x2="${150 + shankW/2}" y2="${35 + i * 6}" stroke="#94a3b8" stroke-width="1.5"/>
        `).join("")}
        <line x1="${150 + headW/2 + 10}" y1="25" x2="${150 + headW/2 + 10}" y2="${25 + shankL}" stroke="#38bdf8" stroke-width="1"/>
        <text x="${150 + headW/2 + 16}" y="${25 + shankL/2 + 4}" font-size="10" font-weight="700" fill="#38bdf8">Ø ${diaMm.toFixed(2)}mm (${(diaMm / 25.4).toFixed(3)}")</text>
        <text x="150" y="118" text-anchor="middle" font-size="10" font-weight="700" fill="#94a3b8">
          ${f.size} · Pitch ${f.pitch} mm (${f.tpi.toFixed(1)} TPI)
        </text>
      </svg>
    </div>
  `;

  res.innerHTML = `
    ${svgSilhouette}

    <div class="fastener-spec-grid">
      <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">Recommended Tap Drill</div>
        <div style="font-size:18px;font-weight:800;color:var(--green);margin:2px 0">
          ${tapDrill}
        </div>
        <div style="font-size:11px;color:var(--muted)">For threading ${material === "hard" ? "hard steels" : "soft aluminum/brass/plastics"}</div>
      </div>

      <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">Clearance Hole (Through)</div>
        <div style="font-size:18px;font-weight:800;color:var(--ink);margin:2px 0">
          ${closeFit} <span style="font-size:12px;color:var(--muted)">(Close)</span>
        </div>
        <div style="font-size:11px;color:var(--muted)">Free fit clearance: ${freeFit}</div>
      </div>

      <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">Drive Tool / Hex Key</div>
        <div style="font-size:18px;font-weight:800;color:#0284c7;margin:2px 0">
          ${f.hexKey} Allen Key
        </div>
        <div style="font-size:11px;color:var(--muted)">Countersink angle: ${countersinkAngle}</div>
      </div>

      <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">Thread Pitch &amp; TPI</div>
        <div style="font-size:18px;font-weight:800;color:#f59e0b;margin:2px 0">
          ${f.pitch} mm / thread
        </div>
        <div style="font-size:11px;color:var(--muted)">${f.tpi.toFixed(1)} Threads Per Inch</div>
      </div>
    </div>

    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button type="button" class="button button-outline" data-action="add-fastener-to-project" data-size="${f.size}" style="font-size:12px">
        + Add ${f.size} Fasteners to Project Shopping
      </button>
      <button type="button" class="button button-outline" data-action="copy-fastener-specs" style="font-size:12px">
        📋 Copy Drilling Specs
      </button>
    </div>
  `;
}

// --- 🪚 2D Guillotine Sheet Goods & Plywood Nesting Optimizer ---
const NEST_PALETTE = ["#38bdf8", "#34d399", "#f59e0b", "#ec4899", "#a855f7", "#06b6d4", "#f97316", "#10b981", "#818cf8"];

function pack2DSheetNesting(sheetW, sheetH, parts, kerf, allowRotation) {
  const items = [];
  let colorIdx = 0;
  parts.forEach(p => {
    const col = NEST_PALETTE[colorIdx % NEST_PALETTE.length];
    colorIdx++;
    for (let i = 0; i < p.qty; i++) {
      items.push({
        id: p.id,
        label: p.label || `Part ${p.id}`,
        w: p.w,
        h: p.h,
        area: p.w * p.h,
        color: col
      });
    }
  });

  items.sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h));
  const sheets = [];

  for (const item of items) {
    let placed = false;
    for (const sheet of sheets) {
      const fit = findBestNestingPlacement(sheet.freeRects, item.w, item.h, kerf, allowRotation);
      if (fit) {
        placeNestingRectangle(sheet, fit, item, kerf);
        placed = true;
        break;
      }
    }

    if (!placed) {
      const newSheet = {
        sheetIndex: sheets.length + 1,
        w: sheetW,
        h: sheetH,
        placedItems: [],
        freeRects: [{ x: 0, y: 0, w: sheetW, h: sheetH }]
      };
      const fit = findBestNestingPlacement(newSheet.freeRects, item.w, item.h, kerf, allowRotation);
      if (fit) {
        placeNestingRectangle(newSheet, fit, item, kerf);
        sheets.push(newSheet);
        placed = true;
      } else {
        item.oversized = true;
      }
    }
  }

  return { sheets, unplaced: items.filter(it => it.oversized) };
}

function findBestNestingPlacement(freeRects, itemW, itemH, kerf, allowRotation) {
  let bestFit = null;
  let bestShortSideFit = Infinity;

  freeRects.forEach((rect, idx) => {
    if (itemW <= rect.w && itemH <= rect.h) {
      const leftoverShort = Math.min(rect.w - itemW, rect.h - itemH);
      if (leftoverShort < bestShortSideFit) {
        bestShortSideFit = leftoverShort;
        bestFit = { rectIdx: idx, rotated: false, w: itemW, h: itemH };
      }
    }

    if (allowRotation && itemH <= rect.w && itemW <= rect.h) {
      const leftoverShort = Math.min(rect.w - itemH, rect.h - itemW);
      if (leftoverShort < bestShortSideFit) {
        bestShortSideFit = leftoverShort;
        bestFit = { rectIdx: idx, rotated: true, w: itemH, h: itemW };
      }
    }
  });

  return bestFit;
}

function placeNestingRectangle(sheet, fit, item, kerf) {
  const free = sheet.freeRects.splice(fit.rectIdx, 1)[0];
  const placed = {
    label: item.label,
    x: free.x,
    y: free.y,
    w: fit.w,
    h: fit.h,
    origW: item.w,
    origH: item.h,
    rotated: fit.rotated,
    color: item.color
  };
  sheet.placedItems.push(placed);

  const rightW = free.w - fit.w - kerf;
  const bottomH = free.h - fit.h - kerf;

  if (rightW > 0) {
    sheet.freeRects.push({
      x: free.x + fit.w + kerf,
      y: free.y,
      w: rightW,
      h: fit.h
    });
  }
  if (bottomH > 0) {
    sheet.freeRects.push({
      x: free.x,
      y: free.y + fit.h + kerf,
      w: free.w,
      h: bottomH
    });
  }
}

function run2DSheetNestingOptimizer() {
  const sheetW = Math.max(12, parseFloat($("#wood-nest-sheet-w")?.value) || 48);
  const sheetH = Math.max(12, parseFloat($("#wood-nest-sheet-h")?.value) || 96);
  const unit = $("#wood-nest-unit")?.value || "in";
  const kerf = Math.max(0, parseFloat($("#wood-nest-kerf")?.value) || (unit === "mm" ? 3.2 : 0.125));
  const allowRotation = $("#wood-nest-rotation")?.value !== "strict";
  const rawPartsText = $("#wood-nest-parts")?.value || "";
  const res = $("#wood-nest-result");
  if (!res) return;

  const lines = rawPartsText.split("\n");
  const parts = [];
  let partCounter = 1;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    let label = `Part ${partCounter}`;
    let rest = line;
    if (line.includes(":")) {
      const partsArr = line.split(":");
      label = partsArr[0].trim();
      rest = partsArr.slice(1).join(":");
    }

    const match = rest.match(/([0-9.]+)\s*[xX*×]\s*([0-9.]+)(?:\s*[xX*×]\s*([0-9]+))?/);
    if (match) {
      const w = parseFloat(match[1]);
      const h = parseFloat(match[2]);
      const qty = match[3] ? parseInt(match[3], 10) : 1;
      if (w > 0 && h > 0 && qty > 0) {
        parts.push({ id: partCounter++, label, w, h, qty });
      }
    }
  }

  if (parts.length === 0) {
    res.innerHTML = `<div style="padding:10px;border:1px dashed #ef4444;color:#ef4444;border-radius:6px">Please enter at least one cut piece (Format: <code>Top: 30 x 54 x 1</code>).</div>`;
    return;
  }

  const { sheets, unplaced } = pack2DSheetNesting(sheetW, sheetH, parts, kerf, allowRotation);

  let totalPartsArea = 0;
  parts.forEach(p => { totalPartsArea += (p.w * p.h * p.qty); });
  const singleSheetArea = sheetW * sheetH;
  const totalSheetsArea = sheets.length * singleSheetArea;
  const overallYield = totalSheetsArea > 0 ? ((totalPartsArea / totalSheetsArea) * 100).toFixed(1) : 0;
  const totalWasteArea = totalSheetsArea - totalPartsArea;

  let sheetsHtml = "";
  sheets.forEach(sheet => {
    const svgW = 580;
    const svgScale = svgW / sheet.w;
    const svgH = Math.round(sheet.h * svgScale);

    let rectsSvg = "";
    sheet.placedItems.forEach(item => {
      const rx = item.x * svgScale;
      const ry = item.y * svgScale;
      const rw = item.w * svgScale;
      const rh = item.h * svgScale;

      rectsSvg += `
        <g>
          <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${item.color}" opacity="0.8" stroke="#0f172a" stroke-width="1.5"/>
          <text x="${rx + rw/2}" y="${ry + rh/2 - 2}" text-anchor="middle" font-size="${Math.min(11, Math.max(8, rw/8))}" font-weight="800" fill="#0f172a">
            ${escapeHTML(item.label)} ${item.rotated ? "↻" : ""}
          </text>
          <text x="${rx + rw/2}" y="${ry + rh/2 + 10}" text-anchor="middle" font-size="${Math.min(9, Math.max(7, rw/10))}" font-weight="600" fill="#1e293b">
            ${item.w}${unit} × ${item.h}${unit}
          </text>
        </g>
      `;
    });

    let offcutsSvg = "";
    sheet.freeRects.forEach(fr => {
      const fx = fr.x * svgScale;
      const fy = fr.y * svgScale;
      const fw = fr.w * svgScale;
      const fh = fr.h * svgScale;
      if (fw > 10 && fh > 10) {
        offcutsSvg += `
          <g>
            <rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" fill="#334155" opacity="0.3" stroke="#475569" stroke-width="1" stroke-dasharray="3,3"/>
            <text x="${fx + fw/2}" y="${fy + fh/2 + 3}" text-anchor="middle" font-size="8" fill="#94a3b8">
              ${fr.w.toFixed(1)}×${fr.h.toFixed(1)}${unit} offcut
            </text>
          </g>
        `;
      }
    });

    sheetsHtml += `
      <div class="nest-sheet-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <strong>Sheet ${sheet.sheetIndex} of ${sheets.length} (${sheet.w}${unit} × ${sheet.h}${unit})</strong>
          <span style="font-size:11px;color:var(--muted)">${sheet.placedItems.length} parts nested</span>
        </div>
        <svg class="nest-sheet-svg" viewBox="0 0 ${svgW} ${svgH}" width="100%">
          <rect x="0" y="0" width="${svgW}" height="${svgH}" fill="#1e293b" stroke="#64748b" stroke-width="2"/>
          ${offcutsSvg}
          ${rectsSvg}
        </svg>
      </div>
    `;
  });

  res.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(170px, 1fr));gap:10px;margin-bottom:12px">
      <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">Raw Sheets Required</div>
        <div style="font-size:20px;font-weight:800;color:var(--green);margin:2px 0">
          ${sheets.length} Sheet${sheets.length === 1 ? "" : "s"}
        </div>
        <div style="font-size:11px;color:var(--muted)">${sheetW}" × ${sheetH}" (${unit})</div>
      </div>

      <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">Overall Material Yield</div>
        <div style="font-size:20px;font-weight:800;color:var(--ink);margin:2px 0">
          ${overallYield}%
        </div>
        <div style="font-size:11px;color:var(--muted)">${totalWasteArea.toFixed(1)} ${unit}² scrap / kerf</div>
      </div>

      <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">Parts Successfully Nested</div>
        <div style="font-size:20px;font-weight:800;color:#0284c7;margin:2px 0">
          ${parts.reduce((sum, p) => sum + p.qty, 0)} Parts
        </div>
        <div style="font-size:11px;color:var(--muted)">${unplaced.length === 0 ? "100% of parts placed" : `${unplaced.length} oversized`}</div>
      </div>
    </div>

    ${unplaced.length > 0 ? `
      <div style="padding:8px 12px;background:rgba(239,68,68,0.15);border:1px solid #ef4444;border-radius:6px;color:#ef4444;font-size:12px;margin-bottom:10px">
        ⚠️ Warning: ${unplaced.length} part(s) are larger than the raw sheet dimensions (${sheetW}×${sheetH}${unit}).
      </div>
    ` : ""}

    ${sheetsHtml}

    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
      <button type="button" class="button button-outline" data-action="copy-2d-nest-plan" style="font-size:12px">
        📋 Copy Nesting Plan
      </button>
      <button type="button" class="button button-outline" data-action="add-nest-sheets-to-project" data-sheets="${sheets.length}" style="font-size:12px">
        + Add ${sheets.length} Plywood Sheet(s) to Materials
      </button>
    </div>
  `;
}

function renderWoodworkingView() {
  updateWoodworkingStudio();
  updateWoodSafetyGuide();
  if (typeof updateSagulatorCalc === "function") updateSagulatorCalc();
  if (typeof updateWoodEmcCalc === "function") updateWoodEmcCalc();
  if (typeof updateDovetailCalc === "function") updateDovetailCalc();
  if (typeof updateFastenerFinder === "function") updateFastenerFinder();
  if (typeof run2DSheetNestingOptimizer === "function") run2DSheetNestingOptimizer();
}

// --- 🧶 Textiles & Yarn Studio ---
function playCounterClickSound() {
  const soundEnabled = $("#textiles-counter-sound")?.checked;
  if (!soundEnabled) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!window._counterAudioCtx) window._counterAudioCtx = new AudioContext();
    const ctx = window._counterAudioCtx;
    if (ctx.state === "suspended") void ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch {}
}

function updateTextilesRowDisplay() {
  let count = 0;
  let repeatCount = 0;
  try {
    count = parseInt(localStorage.getItem("workbench_textiles_row") || "0", 10);
    repeatCount = parseInt(localStorage.getItem("workbench_textiles_repeat_row") || "0", 10);
  } catch {}

  const repeatLen = parseInt($("#textiles-repeat-length")?.value, 10) || 8;
  const display = $("#textiles-row-count-display");
  if (display) display.textContent = count;

  const repeatDisplay = $("#textiles-repeat-display");
  const repeatCountDisplay = $("#textiles-repeat-count-display");
  if (repeatDisplay) {
    if (count === 0 && repeatCount === 0) {
      repeatDisplay.textContent = `Row 1 of ${repeatLen}`;
      if (repeatCountDisplay) repeatCountDisplay.textContent = "Cycle #1";
    } else {
      const curRepeatRow = ((repeatCount - 1) % repeatLen) + 1;
      const curCycle = Math.floor((repeatCount - 1) / repeatLen) + 1;
      repeatDisplay.textContent = `Row ${curRepeatRow} of ${repeatLen}`;
      if (repeatCountDisplay) repeatCountDisplay.textContent = `Cycle #${curCycle}`;
    }
  }
}

function incrementTextilesRow() {
  let count = parseInt(localStorage.getItem("workbench_textiles_row") || "0", 10) + 1;
  let repeatCount = parseInt(localStorage.getItem("workbench_textiles_repeat_row") || "0", 10) + 1;
  try {
    localStorage.setItem("workbench_textiles_row", count.toString());
    localStorage.setItem("workbench_textiles_repeat_row", repeatCount.toString());
  } catch {}
  playCounterClickSound();
  updateTextilesRowDisplay();
  showToast(`Row ${count}`);
}

function decrementTextilesRow() {
  let count = Math.max(0, parseInt(localStorage.getItem("workbench_textiles_row") || "0", 10) - 1);
  let repeatCount = Math.max(0, parseInt(localStorage.getItem("workbench_textiles_repeat_row") || "0", 10) - 1);
  try {
    localStorage.setItem("workbench_textiles_row", count.toString());
    localStorage.setItem("workbench_textiles_repeat_row", repeatCount.toString());
  } catch {}
  playCounterClickSound();
  updateTextilesRowDisplay();
}

function resetTextilesRow() {
  try {
    localStorage.setItem("workbench_textiles_row", "0");
    localStorage.setItem("workbench_textiles_repeat_row", "0");
  } catch {}
  updateTextilesRowDisplay();
  showToast("Row counter reset to 0");
}

function resetTextilesRepeat() {
  try {
    localStorage.setItem("workbench_textiles_repeat_row", "0");
  } catch {}
  updateTextilesRowDisplay();
  showToast("Pattern repeat cycle reset to Row 1");
}

function updateTextilesYarnWeightView() {
  const cat = $("#textiles-yarn-weight-select")?.value || "4";
  const data = (typeof YARN_WEIGHTS_DB !== "undefined" && YARN_WEIGHTS_DB[cat]) ? YARN_WEIGHTS_DB[cat] : {
    name: "Medium", alt: "Worsted, Afghan, Aran", needle: "4.5 - 5.5 mm (US 7-9)", hook: "5.5 - 6.5 mm (I-9 to K-10.5)",
    knitGauge: "16-20 sts / 4 in", projects: "Sweaters, blankets, beanies, mittens"
  };
  const res = $("#textiles-yarn-weight-result");
  if (res) {
    res.innerHTML = `
      <div style="font-size:12px;color:var(--ink);line-height:1.4">
        • <strong>Category ${cat}:</strong> ${data.name} (${data.alt || data.name})<br>
        • <strong>Knitting Needles:</strong> <span style="color:var(--green);font-weight:700">${data.needle}</span><br>
        • <strong>Crochet Hook:</strong> ${data.hook}<br>
        • <strong>Typical Gauge:</strong> ${data.knitGauge || data.gauge || "16-20 sts / 4 in"}<br>
        • <strong>Recommended Projects:</strong> ${data.projects}
      </div>
    `;
  }
}

function updateAmigurumiGenerator() {
  const shape = $("#crochet-shape-type")?.value || "sphere";
  const stType = $("#crochet-stitch-type")?.value || "sc";
  const targetSts = parseInt($("#crochet-target-sts")?.value, 10) || 30;
  const stagger = $("#crochet-stagger-inc")?.checked !== false;

  const stAbbr = stType;
  const baseInc = stType === "sc" ? 6 : stType === "hdc" ? 8 : 12;
  const incRounds = Math.max(2, Math.round(targetSts / baseInc));
  const actualTargetSts = incRounds * baseInc;

  const roundLines = [];
  roundLines.push(`Rnd 1: Magic Ring with ${baseInc} ${stAbbr} [${baseInc} sts]`);

  for (let i = 2; i <= incRounds; i++) {
    const stsBeforeInc = i - 2;
    const curSts = i * baseInc;
    if (stsBeforeInc === 0) {
      roundLines.push(`Rnd ${i}: Inc in each st around [${curSts} sts]`);
    } else {
      if (stagger && stsBeforeInc % 2 === 0) {
        const half = stsBeforeInc / 2;
        roundLines.push(`Rnd ${i}: ${half} ${stAbbr}, inc, [${stsBeforeInc} ${stAbbr}, inc] × ${baseInc - 1}, ${half} ${stAbbr} [${curSts} sts]`);
      } else {
        roundLines.push(`Rnd ${i}: [${stsBeforeInc} ${stAbbr}, inc] × ${baseInc} [${curSts} sts]`);
      }
    }
  }

  let bodyRounds = 0;
  let decRounds = 0;
  if (shape === "sphere") {
    bodyRounds = Math.max(3, incRounds);
    for (let r = 1; r <= bodyRounds; r++) {
      roundLines.push(`Rnd ${incRounds + r}: ${stAbbr} in each st around [${actualTargetSts} sts]`);
    }
    const decStart = incRounds + bodyRounds + 1;
    for (let i = incRounds - 1; i >= 1; i--) {
      const stsBeforeDec = i - 1;
      const curSts = i * baseInc;
      const rndNum = decStart + (incRounds - 1 - i);
      if (stsBeforeDec === 0) {
        roundLines.push(`Rnd ${rndNum}: Dec around [${curSts} sts]`);
      } else {
        roundLines.push(`Rnd ${rndNum}: [${stsBeforeDec} ${stAbbr}, dec] × ${baseInc} [${curSts} sts]`);
      }
    }
    decRounds = incRounds - 1;
    roundLines.push(`Fasten off, weave yarn tail through front loops of remaining ${baseInc} sts, pull tight to close.`);
  } else if (shape === "beanie_crown") {
    roundLines.push(`Crown complete at ${actualTargetSts} stitches (~${((actualTargetSts / (stType === 'sc' ? 4 : 3.5))).toFixed(1)}" diameter).`);
    roundLines.push(`Work even rounds of ${stAbbr} in each st around until desired hat height is reached.`);
  } else if (shape === "flat_circle") {
    roundLines.push(`Sl st to first st, fasten off. Flat circle diameter: ~${((incRounds * 2 * (stType === 'sc' ? 0.35 : 0.55))).toFixed(1)}" with worsted weight.`);
  } else if (shape === "cylinder") {
    roundLines.push(`Work straight even rounds of ${stAbbr} in each st around for desired limb/sleeve length.`);
  } else if (shape === "cone") {
    roundLines.push(`Alternative gradual cone: Work 1 round even, 1 round increase for elongated point.`);
  }

  const totalRounds = incRounds + bodyRounds + decRounds;
  const res = $("#crochet-amigurumi-result");
  if (res) {
    res.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:6px">
        <div>
          <span style="font-size:11px;font-weight:700;color:var(--muted)">SHAPED PATTERN:</span>
          <strong style="font-size:15px;color:var(--green);margin-left:6px">${actualTargetSts} max stitches · ${totalRounds} total rounds</strong>
        </div>
        <button type="button" class="button button-small button-outline" data-action="crochet-copy-pattern">📋 Copy Pattern</button>
      </div>
      ${shape === "sphere" ? `<div style="font-size:11px;color:var(--muted);margin-bottom:6px">💡 <em>Safety Eyes:</em> Insert between Rnds ${incRounds + Math.floor(bodyRounds / 2)} and ${incRounds + Math.floor(bodyRounds / 2) + 1}, spaced 6-7 sts apart before stuffing.</div>` : ""}
      <pre id="crochet-amigurumi-text" style="margin:0;font-family:monospace;font-size:11px;background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:8px;max-height:180px;overflow-y:auto;white-space:pre-wrap;line-height:1.4">${roundLines.join("\n")}</pre>
    `;
  }
}

async function copyAmigurumiPattern() {
  const box = $("#crochet-amigurumi-text");
  if (!box || !box.textContent.trim()) {
    showToast("No crochet pattern to copy.");
    return;
  }
  try {
    await navigator.clipboard.writeText(box.textContent);
    showToast("Copied crochet shaping pattern to clipboard!");
  } catch {
    showToast("Crochet pattern ready.");
  }
}

function updateSewingCuttingCalc() {
  const w = parseFloat($("#sew-piece-w")?.value) || 18;
  const l = parseFloat($("#sew-piece-l")?.value) || 24;
  const qty = parseInt($("#sew-piece-qty")?.value, 10) || 2;
  const sa = parseFloat($("#sew-sa-select")?.value) || 0.625;
  const hem = parseFloat($("#sew-hem-select")?.value) || 1.0;
  const yds45 = parseFloat($("#sew-convert-yds-45")?.value) || 2.5;

  const cutW = (w + 2 * sa).toFixed(3);
  const cutL = (l + sa + hem).toFixed(3);
  const cutWFrac = toNearestFraction(w + 2 * sa);
  const cutLFrac = toNearestFraction(l + sa + hem);

  const areaSqIn = yds45 * 36 * 43;
  const rawYds54 = (areaSqIn / (36 * 52)) * 1.05;
  const rawYds60 = (areaSqIn / (36 * 58)) * 1.08;

  const yds54 = (Math.ceil(rawYds54 * 8) / 8).toFixed(2);
  const yds60 = (Math.ceil(rawYds60 * 8) / 8).toFixed(2);
  const meters60 = (parseFloat(yds60) * 0.9144).toFixed(2);

  const res = $("#sew-cutting-result");
  if (res) {
    res.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:6px">
        <span style="font-size:11px;font-weight:700;color:var(--muted)">CUTTING SPECIFICATION:</span>
        <strong style="font-size:16px;color:var(--green)">Cut ${qty} × [ ${cutWFrac}" × ${cutLFrac}" ]</strong>
      </div>
      <div style="font-size:12px;color:var(--ink);line-height:1.4">
        • <strong>Per Piece Cut Size:</strong> ${cutW}" wide × ${cutL}" long (includes 2 × ${toNearestFraction(sa)}" SA + ${toNearestFraction(hem)}" hem)<br>
        • <strong>Bolt Conversion:</strong> ${yds45} yds of 45" fabric = <strong style="color:#0284c7">${yds60} yds (~${meters60} m)</strong> of 60" fabric (or ${yds54} yds of 54")<br>
        • 💡 <em>Grainline Tip:</em> Align piece length with selvage (lengthwise grain) for minimum stretch and vertical drape.
      </div>
    `;
  }
}

function toNearestFraction(val) {
  const num = Number(val);
  if (!Number.isFinite(num)) return "0";
  const sign = num < 0 ? "-" : "";
  const abs = Math.abs(num);
  const whole = Math.floor(abs);
  const dec = abs - whole;
  let frac = "";
  if (dec < 0.0625) frac = "";
  else if (dec < 0.1875) frac = "1/8";
  else if (dec < 0.3125) frac = "1/4";
  else if (dec < 0.4375) frac = "3/8";
  else if (dec < 0.5625) frac = "1/2";
  else if (dec < 0.6875) frac = "5/8";
  else if (dec < 0.8125) frac = "3/4";
  else if (dec < 0.9375) frac = "7/8";
  else return `${sign}${whole + 1}`;

  if (whole === 0) {
    return frac ? `${sign}${frac}` : "0";
  }
  return frac ? `${sign}${whole} ${frac}` : `${sign}${whole}`;
}

const SEWING_NEEDLE_DB = {
  light_woven: {
    type: "Microtex / Sharp or Universal",
    size: "60/8 to 70/10",
    thread: "Extra-fine Cotton (50-60wt) or Fine Polyester (Gutermann Mara 120)",
    stitch: "Straight stitch 1.8 - 2.0 mm",
    tips: "Use sharp scissors, fine silk pins, and a straight-stitch needle plate to prevent fabric from getting sucked into the feed dogs."
  },
  med_woven: {
    type: "Universal (Standard 130/705 H)",
    size: "80/12 (or 75/11 for light poplin)",
    thread: "100% All-Purpose Polyester 40-50wt (Gutermann, Coats Dual Duty, Mettler)",
    stitch: "Straight stitch 2.2 - 2.5 mm",
    tips: "The universal workhorse needle. Replace needle every 8 hours of active sewing or after each completed garment."
  },
  heavy_woven: {
    type: "Jeans / Denim Needle (Reinforced blade & slender point)",
    size: "90/14 to 110/18",
    thread: "Heavy-Duty Polyester (Gutermann Topstitch 30wt in needle, regular 40wt in bobbin)",
    stitch: "Straight stitch 3.0 - 3.5 mm",
    tips: "Use a clearance hump jumper over thick flat-felled seam intersections to prevent needle deflection and broken stitches."
  },
  light_knit: {
    type: "Ballpoint / Jersey (rounded point separates fibers)",
    size: "70/10 to 80/12",
    thread: "100% Spun Polyester 40wt (or Wooly Nylon in serger lower looper)",
    stitch: "Narrow Zigzag (0.5 mm width, 2.5 mm length) or Lightning Stretch stitch",
    tips: "Ballpoint prevents popped fibers and runs. Use ballpoint twin needle for professional T-shirt hems."
  },
  med_knit: {
    type: "Ballpoint or Stretch Needle (deep scarf prevents skipped stitches)",
    size: "80/12 to 90/14",
    thread: "All-Purpose Polyester 40wt",
    stitch: "Stretch / Lightning stitch or 4-thread overlock serger",
    tips: "Slightly reduce presser foot pressure (or use a walking foot) to prevent wavy, stretched-out seams."
  },
  stretch_active: {
    type: "Stretch Needle (special scarf & eye design)",
    size: "75/11 to 90/14",
    thread: "High-tenacity Polyester or Maraflex elastic thread",
    stitch: "Triple Stretch stitch or 3-step Zigzag (width 4.0, length 1.5)",
    tips: "Use a Stretch needle specifically (not regular ballpoint) to eliminate skipped stitches in high-spandex/swim fabrics."
  },
  leather_vinyl: {
    type: "Leather / Wedge Point (chisel cutting point)",
    size: "90/14 to 100/16",
    thread: "Bonded Nylon or Heavy-Duty Polyester 30-40wt",
    stitch: "Long straight stitch 3.5 - 4.5 mm (never short stitches which perforate like postage stamps!)",
    tips: "Use a Teflon / non-stick or roller presser foot. Use wonder clips instead of pins, as pinholes in leather are permanent."
  },
  delicate_micro: {
    type: "Microtex (Acute point for micro-woven fibers)",
    size: "60/8 to 75/11",
    thread: "Fine Polyester 50-60wt",
    stitch: "Straight stitch 2.0 mm",
    tips: "Acute slim point penetrates high-density microfibers cleanly without pulling threads or puckering."
  }
};

function updateSewingNeedleGuide() {
  const cat = $("#sew-fabric-type")?.value || "med_woven";
  const data = SEWING_NEEDLE_DB[cat] || SEWING_NEEDLE_DB.med_woven;

  const res = $("#sew-needle-result");
  if (res) {
    res.innerHTML = `
      <div style="font-size:12px;color:var(--ink);line-height:1.4">
        • <strong>Needle System &amp; Type:</strong> <span style="color:var(--green);font-weight:800">${data.type}</span><br>
        • <strong>Needle Size:</strong> <span style="color:#0284c7;font-weight:800">${data.size}</span> (US / European standard)<br>
        • <strong>Recommended Thread:</strong> ${data.thread}<br>
        • <strong>Ideal Stitch Setting:</strong> ${data.stitch}<br>
        • 💡 <em>Pro Tip:</em> ${data.tips}
      </div>
    `;
  }
}

const NEEDLE_HOOK_CONVERT_DB = {
  "2.0": { mm: 2.0, usKnit: "US 0", usHook: "— (Steel 4)", uk: "14", jp: "—", yarn: "0 - Lace" },
  "2.25": { mm: 2.25, usKnit: "US 1", usHook: "US B-1", uk: "13", jp: "1", yarn: "1 - Super Fine (Sock / Fingering)" },
  "2.75": { mm: 2.75, usKnit: "US 2", usHook: "US C-2", uk: "12", jp: "2", yarn: "1 - Super Fine / Baby" },
  "3.25": { mm: 3.25, usKnit: "US 3", usHook: "US D-3", uk: "10", jp: "4", yarn: "2 - Fine (Sport)" },
  "3.5": { mm: 3.5, usKnit: "US 4", usHook: "US E-4", uk: "9", jp: "5", yarn: "2 - Fine / 3 - Light (DK)" },
  "3.75": { mm: 3.75, usKnit: "US 5", usHook: "US F-5", uk: "—", jp: "5.5", yarn: "3 - Light (DK)" },
  "4.0": { mm: 4.0, usKnit: "US 6", usHook: "US G-6", uk: "8", jp: "6", yarn: "3 - Light / 4 - Worsted" },
  "4.5": { mm: 4.5, usKnit: "US 7", usHook: "US 7", uk: "7", jp: "8", yarn: "4 - Medium (Worsted / Aran)" },
  "5.0": { mm: 5.0, usKnit: "US 8", usHook: "US H-8", uk: "6", jp: "10", yarn: "4 - Medium (Worsted · Most Popular)" },
  "5.5": { mm: 5.5, usKnit: "US 9", usHook: "US I-9", uk: "5", jp: "11", yarn: "4 - Medium (Aran / Heavy Worsted)" },
  "6.0": { mm: 6.0, usKnit: "US 10", usHook: "US J-10", uk: "4", jp: "13", yarn: "5 - Bulky (Chunky)" },
  "6.5": { mm: 6.5, usKnit: "US 10.5", usHook: "US K-10.5", uk: "3", jp: "15", yarn: "5 - Bulky" },
  "8.0": { mm: 8.0, usKnit: "US 11", usHook: "US L-11", uk: "0", jp: "8mm", yarn: "5 - Bulky / 6 - Super Bulky" },
  "9.0": { mm: 9.0, usKnit: "US 13", usHook: "US M/N-13", uk: "00", jp: "9mm", yarn: "6 - Super Bulky" },
  "10.0": { mm: 10.0, usKnit: "US 15", usHook: "US N/P-15", uk: "000", jp: "10mm", yarn: "6 - Super Bulky" },
  "12.0": { mm: 12.0, usKnit: "US 17", usHook: "US P", uk: "—", jp: "12mm", yarn: "6 - Super Bulky" },
  "15.0": { mm: 15.0, usKnit: "US 19", usHook: "US Q", uk: "—", jp: "15mm", yarn: "7 - Jumbo" }
};

function updateNeedleHookConverter() {
  const key = $("#textiles-needle-convert-select")?.value || "5.0";
  const item = NEEDLE_HOOK_CONVERT_DB[key] || NEEDLE_HOOK_CONVERT_DB["5.0"];

  const res = $("#textiles-needle-convert-result");
  if (res) {
    res.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:6px;margin-bottom:6px">
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:6px 8px">
          <div style="font-size:10px;font-weight:700;color:var(--muted)">METRIC DIAMETER</div>
          <div style="font-size:16px;font-weight:800;color:var(--green)">${item.mm.toFixed(2)} mm</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:6px 8px">
          <div style="font-size:10px;font-weight:700;color:var(--muted)">US KNIT NEEDLE</div>
          <div style="font-size:16px;font-weight:800;color:#0284c7">${item.usKnit}</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:6px 8px">
          <div style="font-size:10px;font-weight:700;color:var(--muted)">US CROCHET HOOK</div>
          <div style="font-size:16px;font-weight:800;color:#8b5cf6">${item.usHook}</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:6px 8px">
          <div style="font-size:10px;font-weight:700;color:var(--muted)">UK / CANADIAN</div>
          <div style="font-size:16px;font-weight:800;color:var(--ink)">${item.uk}</div>
        </div>
      </div>
      <div style="font-size:11px;color:var(--muted);line-height:1.4">
        • <strong>Recommended Yarn Standard:</strong> <span style="color:var(--ink);font-weight:700">${item.yarn}</span><br>
        • Japanese Needle Gauge: ${item.jp}
      </div>
    `;
  }
}

function syncStitchViewUI() {
  renderStitchPalette();
  renderStitchGrid();
  updateStitchInstructions();
}

async function copyStitchInstructions() {
  const box = $("#stitch-view-instructions") || $("#stitch-instructions-box");
  if (!box || !box.textContent.trim()) {
    showToast("Pattern is empty.");
    return;
  }
  try {
    await navigator.clipboard.writeText(box.textContent);
    showToast("Copied written pattern to clipboard!");
  } catch {
    showToast("Pattern ready.");
  }
}

/* ============================================================
   🧺 Textile Fiber Properties & International Care Symbols
   ============================================================ */
const TEXTILES_FIBER_DB = {
  merino_wool: {
    name: "Merino Wool",
    warmth: "⭐⭐⭐⭐⭐ Excellent",
    elasticity: "⭐⭐⭐⭐⭐ High (crimp memory)",
    breathability: "⭐⭐⭐⭐⭐ Moisture wicking",
    drape: "Lofty & resilient",
    felting: "High (unless superwash treated)",
    wash: "Hand wash cold (max 30°C / 85°F), wool detergent, dry flat in shade. Do not tumble dry.",
    symbols: ["🧺 30°C Hand", "🚫 No Bleach", "🧺 Dry Flat", "熨 Low 110°C", "🚫 No Tumble"],
    bestFor: "Heirloom sweaters, winter beanies, warm scarves, colorwork jumpers."
  },
  alpaca: {
    name: "Alpaca",
    warmth: "⭐⭐⭐⭐⭐ 3x warmer than sheep wool",
    elasticity: "⭐⭐ Moderate (lacks natural crimp)",
    breathability: "⭐⭐⭐⭐ High",
    drape: "Heavy silky liquid drape",
    felting: "High",
    wash: "Hand wash lukewarm, gentle wool wash, never wring or twist. Dry flat supported.",
    symbols: ["🧺 Hand Wash", "🚫 No Bleach", "🧺 Dry Flat", "熨 Low Iron", "🚫 No Tumble"],
    bestFor: "Flowing cowls, shawls, winter outerwear, luxury accessories."
  },
  cashmere: {
    name: "Cashmere",
    warmth: "⭐⭐⭐⭐⭐ Supreme loft",
    elasticity: "⭐⭐⭐ Moderate",
    breathability: "⭐⭐⭐⭐⭐ Superb",
    drape: "Cloud-soft velvety drape",
    felting: "Very High",
    wash: "Hand wash cold with baby shampoo or gentle wool wash, press between towels, dry flat.",
    symbols: ["🧺 Hand Wash Cold", "🚫 No Bleach", "🧺 Dry Flat", "熨 Very Low", "🧴 Delicate Dry Clean"],
    bestFor: "Ultra-luxury next-to-skin scarves, baby heirlooms, fine knitwear."
  },
  silk: {
    name: "Mulberry Silk",
    warmth: "⭐⭐⭐⭐ Good thermal regulator",
    elasticity: "⭐ Low stretch",
    breathability: "⭐⭐⭐⭐⭐ High",
    drape: "Extremely fluid luxury sheen",
    felting: "None",
    wash: "Hand wash cool with pH-neutral silk wash. Roll in towel, dry in shade away from direct sunlight.",
    symbols: ["🧺 Cool Hand Wash", "🚫 No Bleach", "🧺 Drip Dry Shade", "熨 Silk Setting", "🧴 Dry Clean Safe"],
    bestFor: "Luxury lace shawls, woven scarves, embroidery accents, summer tanks."
  },
  cotton: {
    name: "Pima Cotton",
    warmth: "⭐⭐ Cool & crisp",
    elasticity: "⭐ Zero stretch (requires ribbed stitches)",
    breathability: "⭐⭐⭐⭐⭐ Maximum",
    drape: "Structured & defined stitch crispness",
    felting: "None",
    wash: "Machine wash warm (40°C), tumble dry low/medium. Warm iron while slightly damp.",
    symbols: ["🧺 40°C Machine", "🧺 Tumble Dry", "熨 Medium 150°C", "🧺 Machine Washable"],
    bestFor: "Summer apparel, dishcloths, market tote bags, amigurumi stuffed toys."
  },
  linen: {
    name: "Belgian Linen / Flax",
    warmth: "⭐ Very cool",
    elasticity: "⭐ Zero elasticity",
    breathability: "⭐⭐⭐⭐⭐ Highest natural breathability",
    drape: "Stiff at first; softens wonderfully with each wash",
    felting: "None",
    wash: "Machine wash warm, tumble dry gentle to break in fibers. Steam iron while damp.",
    symbols: ["🧺 40°C Machine", "🧺 Tumble Dry Gentle", "熨 High Steam 200°C"],
    bestFor: "Breezy summer tops, structured bags, tea towels, heirloom garments."
  },
  bamboo: {
    name: "Bamboo Rayon / Viscose",
    warmth: "⭐⭐ Cool touch",
    elasticity: "⭐⭐ Low (heavy stitch growth)",
    breathability: "⭐⭐⭐⭐ High",
    drape: "Very heavy fluid drape (grows when wet)",
    felting: "None",
    wash: "Hand wash cool or delicate cycle inside mesh bag. Support while drying flat to prevent elongation.",
    symbols: ["🧺 30°C Delicate", "🚫 No Bleach", "🧺 Dry Flat Supported", "熨 Low 110°C"],
    bestFor: "Baby blankets, summer cardigans, slouchy cowls, lightweight wraps."
  },
  acrylic: {
    name: "Acrylic",
    warmth: "⭐⭐⭐⭐ Good synthetic insulation",
    elasticity: "⭐⭐⭐ Moderate",
    breathability: "⭐⭐ Low (synthetic trap)",
    drape: "Moderate (can 'kill' acrylic with steam)",
    felting: "None (100% synthetic)",
    wash: "Machine wash warm, tumble dry low. Never touch direct hot iron (melts fibers!).",
    symbols: ["🧺 40°C Machine", "🧺 Tumble Dry Low", "🚫 Do NOT Iron Hot", "🧺 Colorfast"],
    bestFor: "Everyday blankets, school scarves, beginner practice projects, charity knits."
  },
  nylon_blend: {
    name: "Sock Wool / Nylon Blend (75/25)",
    warmth: "⭐⭐⭐⭐ Warm",
    elasticity: "⭐⭐⭐⭐⭐ High memory",
    breathability: "⭐⭐⭐⭐ High",
    drape: "Springy & durable",
    felting: "Low to Moderate (superwash treated)",
    wash: "Machine wash gentle cold or hand wash. Lay flat to dry or hang by toe.",
    symbols: ["🧺 30°C Machine Wool", "🚫 No Bleach", "🧺 Dry Flat", "熨 Low Iron"],
    bestFor: "Hard-wearing socks, gloves, mittens, high-friction boot liners."
  }
};

function updateTextilesFiberGuide() {
  const fiberKey = $("#textiles-fiber-select")?.value || "merino_wool";
  const garmentType = $("#textiles-garment-select")?.value || "sweater";
  const f = TEXTILES_FIBER_DB[fiberKey] || TEXTILES_FIBER_DB.merino_wool;
  const res = $("#textiles-fiber-result");
  if (!res) return;

  res.innerHTML = `
    <div style="font-size:12px;color:var(--ink);line-height:1.45">
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:6px;margin-bottom:8px">
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:6px 8px">
          <div style="font-size:9.5px;font-weight:700;color:var(--muted)">THERMAL WARMTH</div>
          <div style="font-size:11px;font-weight:800;color:var(--green)">${f.warmth}</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:6px 8px">
          <div style="font-size:9.5px;font-weight:700;color:var(--muted)">STRETCH &amp; MEMORY</div>
          <div style="font-size:11px;font-weight:800;color:#0284c7">${f.elasticity}</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:6px 8px">
          <div style="font-size:9.5px;font-weight:700;color:var(--muted)">DRAPE &amp; FEEL</div>
          <div style="font-size:11px;font-weight:800;color:#8b5cf6">${f.drape}</div>
        </div>
      </div>

      <div style="margin-bottom:6px">
        • <strong>Recommended Project Applications:</strong> <span style="color:var(--ink);font-weight:700">${f.bestFor}</span><br>
        • <strong>Washing &amp; Care Protocol:</strong> ${f.wash}
      </div>

      <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:8px;margin-top:6px">
        <span style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase">GARMENT TAG CARE SYMBOLS:</span>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">
          ${f.symbols.map(s => `<span style="background:var(--surface-subtle);border:1px solid var(--border);border-radius:4px;padding:2px 8px;font-size:11px;font-weight:700">${s}</span>`).join("")}
        </div>
      </div>
    </div>
  `;
}

function renderTextilesView() {
  updateTextilesRowDisplay();
  updateTextilesYarnWeightView();
  if (typeof updateTextilesYardageCalc === "function") updateTextilesYardageCalc();
  if (typeof updateTextilesGaugeCalc === "function") updateTextilesGaugeCalc();
  if (typeof updateYarnSkeinCalculator === "function") updateYarnSkeinCalculator();
  if (typeof updateTextilesHatCalc === "function") updateTextilesHatCalc();
  if (typeof updateTextilesPooling === "function") updateTextilesPooling();
  if (typeof updateYarnHoldingCalc === "function") updateYarnHoldingCalc();
  updateAmigurumiGenerator();
  updateSewingCuttingCalc();
  updateSewingNeedleGuide();
  updateNeedleHookConverter();
  updateTextilesFiberGuide();
  syncStitchViewUI();
}

// --- ⚡ Electronics Studio ---
const ELEC_MULTIPLIER_MAP = {
  "1": { name: "Black (×1)", hex: "#000000" },
  "10": { name: "Brown (×10)", hex: "#854d0e" },
  "100": { name: "Red (×100)", hex: "#dc2626" },
  "1000": { name: "Orange (×1k)", hex: "#ea580c" },
  "10000": { name: "Yellow (×10k)", hex: "#eab308" },
  "100000": { name: "Green (×100k)", hex: "#16a34a" },
  "1000000": { name: "Blue (×1M)", hex: "#2563eb" }
};
const ELEC_TOLERANCE_MAP = {
  "1": { name: "Brown (±1%)", hex: "#854d0e" },
  "2": { name: "Red (±2%)", hex: "#dc2626" },
  "5": { name: "Gold (±5%)", hex: "#ca8a04" },
  "10": { name: "Silver (±10%)", hex: "#94a3b8" }
};

function updateResistorColorView() {
  const is5Band = (typeof resistorBandMode !== "undefined" ? resistorBandMode : "4") === "5";
  const b1 = $("#elec-res-band1")?.value || "2";
  const b2 = $("#elec-res-band2")?.value || "0";
  const b3 = $("#elec-res-band3")?.value || "0";
  const mult = $("#elec-res-mult")?.value || "100";
  const tol = $("#elec-res-tol")?.value || (is5Band ? "1" : "5");

  const band3Wrap = $("#elec-res-band3-wrap");
  if (band3Wrap) band3Wrap.style.display = is5Band ? "block" : "none";

  const colorMap = typeof RESISTOR_COLOR_MAP !== "undefined" ? RESISTOR_COLOR_MAP : {};
  const c1 = colorMap[b1]?.color || colorMap[b1]?.hex || "#dc2626";
  const c2 = colorMap[b2]?.color || colorMap[b2]?.hex || "#000000";
  const c3 = colorMap[b3]?.color || colorMap[b3]?.hex || "#000000";
  const cm = ELEC_MULTIPLIER_MAP[mult]?.hex || "#dc2626";
  const ct = ELEC_TOLERANCE_MAP[tol]?.hex || "#ca8a04";

  const s1 = $("#res-band-1-vis");
  const s2 = $("#res-band-2-vis");
  const s3digit = $("#res-band-3digit-vis");
  const sm = $("#res-band-3-vis");
  const st = $("#res-band-tol-vis");
  if (s1) s1.style.background = c1;
  if (s2) s2.style.background = c2;
  if (s3digit) {
    s3digit.style.display = is5Band ? "block" : "none";
    s3digit.style.background = c3;
  }
  if (sm) sm.style.background = cm;
  if (st) st.style.background = ct;

  const baseDigits = is5Band
    ? parseInt(b1, 10) * 100 + parseInt(b2, 10) * 10 + parseInt(b3, 10)
    : parseInt(b1, 10) * 10 + parseInt(b2, 10);
  const valOhms = baseDigits * parseFloat(mult);
  const tolPct = parseFloat(tol);
  const minOhms = valOhms * (1 - tolPct / 100);
  const maxOhms = valOhms * (1 + tolPct / 100);

  function formatOhms(o) {
    if (o >= 1000000) return (o / 1000000).toFixed(2).replace(/\.00$/, "") + " MΩ";
    if (o >= 1000) return (o / 1000).toFixed(2).replace(/\.00$/, "") + " kΩ";
    return o.toFixed(1).replace(/\.0$/, "") + " Ω";
  }

  const seq = is5Band
    ? `${colorMap[b1]?.name || b1} – ${colorMap[b2]?.name || b2} – ${colorMap[b3]?.name || b3} – ${ELEC_MULTIPLIER_MAP[mult]?.name?.split(" ")[0] || mult} – ${ELEC_TOLERANCE_MAP[tol]?.name?.split(" ")[0] || tol}`
    : `${colorMap[b1]?.name || b1} – ${colorMap[b2]?.name || b2} – ${ELEC_MULTIPLIER_MAP[mult]?.name?.split(" ")[0] || mult} – ${ELEC_TOLERANCE_MAP[tol]?.name?.split(" ")[0] || tol}`;

  const res = $("#elec-res-calc-result");
  if (res) {
    res.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:8px">
        <div>
          <span style="font-size:11px;font-weight:700;color:var(--muted)">RESISTANCE:</span>
          <strong style="font-size:20px;color:var(--green);margin-left:6px">${formatOhms(valOhms)} ±${tolPct}%</strong>
        </div>
        <button type="button" class="button button-small button-outline" data-action="elec-add-to-shopping" title="Add this resistor specification to project shopping list">🛒 Add to Shopping List</button>
      </div>
      <div style="font-size:12px;color:var(--ink);line-height:1.4">
        • <strong>Tolerance Range:</strong> ${formatOhms(minOhms)} to ${formatOhms(maxOhms)}<br>
        • <strong>Color Sequence:</strong> ${seq}<br>
        • Standard ${is5Band ? "EIA E96 1% Precision" : "EIA E24 5% Standard"} Series
      </div>
    `;
  }
}

function updateOhmsLawStudio() {
  const vInput = $("#elec-ohms-v");
  const iInput = $("#elec-ohms-i");
  const rInput = $("#elec-ohms-r");
  const pInput = $("#elec-ohms-p");

  let v = parseFloat(vInput?.value);
  let i = parseFloat(iInput?.value);
  let r = parseFloat(rInput?.value);
  let p = parseFloat(pInput?.value);

  const res = $("#elec-ohms-result");
  if (!res) return;

  let knowns = 0;
  if (!isNaN(v) && v > 0) knowns++;
  if (!isNaN(i) && i > 0) knowns++;
  if (!isNaN(r) && r > 0) knowns++;
  if (!isNaN(p) && p > 0) knowns++;

  if (knowns < 2) {
    res.innerHTML = `<span style="font-size:12px;color:var(--muted)">Enter any 2 values above to calculate the other two.</span>`;
    return;
  }

  if (!isNaN(v) && !isNaN(i)) {
    r = v / i;
    p = v * i;
  } else if (!isNaN(v) && !isNaN(r)) {
    i = v / r;
    p = (v * v) / r;
  } else if (!isNaN(v) && !isNaN(p)) {
    i = p / v;
    r = (v * v) / p;
  } else if (!isNaN(i) && !isNaN(r)) {
    v = i * r;
    p = i * i * r;
  } else if (!isNaN(i) && !isNaN(p)) {
    v = p / i;
    r = p / (i * i);
  } else if (!isNaN(r) && !isNaN(p)) {
    v = Math.sqrt(p * r);
    i = Math.sqrt(p / r);
  }

  res.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(110px, 1fr));gap:6px">
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:6px;text-align:center">
        <div style="font-size:10px;color:var(--muted);font-weight:700">VOLTAGE V</div>
        <div style="font-size:16px;font-weight:800;color:var(--ink)">${v.toFixed(2)} V</div>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:6px;text-align:center">
        <div style="font-size:10px;color:var(--muted);font-weight:700">CURRENT I</div>
        <div style="font-size:16px;font-weight:800;color:var(--green)">${i < 1 ? (i * 1000).toFixed(1) + " mA" : i.toFixed(3) + " A"}</div>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:6px;text-align:center">
        <div style="font-size:10px;color:var(--muted);font-weight:700">RESISTANCE R</div>
        <div style="font-size:16px;font-weight:800;color:#0284c7">${r >= 1000 ? (r / 1000).toFixed(2) + " kΩ" : r.toFixed(1) + " Ω"}</div>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:6px;text-align:center">
        <div style="font-size:10px;color:var(--muted);font-weight:700">POWER P</div>
        <div style="font-size:16px;font-weight:800;color:#d97706">${p < 1 ? (p * 1000).toFixed(1) + " mW" : p.toFixed(2) + " W"}</div>
      </div>
    </div>
  `;
}

function resetOhmsLawAll() {
  ["#elec-ohms-v", "#elec-ohms-i", "#elec-ohms-r", "#elec-ohms-p", "#tool-elec-v", "#tool-elec-i", "#tool-elec-r", "#tool-elec-p"].forEach(id => {
    const el = $(id);
    if (el) el.value = "";
  });
  const res1 = $("#elec-ohms-result");
  if (res1) res1.innerHTML = `<span style="font-size:12px;color:var(--muted)">Enter any 2 values above to calculate the other two.</span>`;
  const res2 = $("#tool-elec-ohms-result");
  if (res2) res2.innerHTML = "Enter 2 parameters above and click Solve Circuit.";
}

function updateLedResistorView() {
  const vs = parseFloat($("#elec-led-vs")?.value) || 5;
  const vf = parseFloat($("#elec-led-vf")?.value) || 2.0;
  const iMa = parseFloat($("#elec-led-i")?.value) || 20;

  const res = $("#elec-led-result");
  if (!res) return;

  if (vs <= vf) {
    res.innerHTML = `<span style="color:#ef4444;font-size:12px">⚠️ Supply voltage (${vs}V) must exceed LED forward drop (${vf}V).</span>`;
    return;
  }

  const iAmps = iMa / 1000;
  const rExact = (vs - vf) / iAmps;
  const pWatts = (vs - vf) * iAmps;

  const e12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82];
  let standardR = 220;
  let mult = 1;
  while (mult <= 100000) {
    for (const base of e12) {
      if (base * mult >= rExact) {
        standardR = base * mult;
        break;
      }
    }
    if (standardR >= rExact) break;
    mult *= 10;
  }

  res.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <span style="font-size:11px;font-weight:700;color:var(--muted)">REQUIRED RESISTOR:</span>
      <strong style="font-size:18px;color:var(--green)">${standardR >= 1000 ? (standardR / 1000) + " kΩ" : standardR + " Ω"}</strong>
    </div>
    <div style="font-size:12px;color:var(--ink);line-height:1.4">
      • Calculated Exact: <strong>${rExact.toFixed(1)} Ω</strong><br>
      • Dissipation: <strong>${(pWatts * 1000).toFixed(1)} mW</strong> → Standard <strong>1/4 Watt (0.25W)</strong> resistor<br>
      • Actual LED current with ${standardR}Ω: ${(((vs - vf) / standardR) * 1000).toFixed(1)} mA
    </div>
  `;
}

function updateBatteryRuntimeView() {
  const mah = parseFloat($("#elec-batt-mah")?.value) || 2500;
  const ma = parseFloat($("#elec-batt-ma")?.value) || 120;

  const res = $("#elec-batt-result");
  if (!res) return;

  if (ma <= 0) {
    res.innerHTML = `<span style="font-size:12px;color:var(--muted)">Enter load current to calculate.</span>`;
    return;
  }

  const hours = (mah * 0.85) / ma;
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);

  res.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <span style="font-size:11px;font-weight:700;color:var(--muted)">ESTIMATED RUNTIME:</span>
      <strong style="font-size:18px;color:var(--green)">${wholeHours}h ${minutes}m</strong>
    </div>
    <div style="font-size:12px;color:var(--ink);line-height:1.4">
      • Continuous Life: <strong>${hours.toFixed(1)} hours</strong> (${(hours / 24).toFixed(1)} days)<br>
      • Includes 15% safety discharge derating buffer<br>
      • Energy capacity: ~<strong>${((mah * 3.7) / 1000).toFixed(1)} Watt-hours</strong> (@ 3.7V LiPo nominal)
    </div>
  `;
}

function renderElectronicsView() {
  updateResistorColorView();
  updateOhmsLawStudio();
  updateLedResistorView();
  updateBatteryRuntimeView();
  if (typeof updateVoltageDividerCalc === "function") updateVoltageDividerCalc();
  if (typeof updateCapacitorCodeView === "function") updateCapacitorCodeView();
  if (typeof updateWireAwgView === "function") updateWireAwgView();
  if (typeof update555TimerCalc === "function") update555TimerCalc();
  if (typeof updatePassiveFilterCalc === "function") updatePassiveFilterCalc();
  if (typeof updateI2cSensorGuide === "function") updateI2cSensorGuide();
  if (typeof updateSmdDecoder === "function") updateSmdDecoder();
  if (typeof updateStepperMotorCalc === "function") updateStepperMotorCalc();
  if (typeof updatePcbTraceCalc === "function") updatePcbTraceCalc();
}

// --- 💻 Programming & Microcontrollers Studio ---
let progRegisterValue = 42;

function renderProgBitRegister() {
  const regWrap = $("#prog-bit-register");
  if (!regWrap) return;

  const bits = [];
  for (let i = 7; i >= 0; i--) {
    const isBitSet = (progRegisterValue & (1 << i)) !== 0;
    const weight = 1 << i;
    bits.push(`
      <div class="bit-toggle-cell" data-action="prog-bit-toggle" data-bit="${i}" title="Bit ${i} (Weight ${weight})">
        <div class="bit-led ${isBitSet ? "on" : ""}">${isBitSet ? "1" : "0"}</div>
        <span style="font-size:9px;color:var(--muted);font-weight:700">b${i}</span>
      </div>
    `);
  }

  regWrap.innerHTML = `
    <div style="display:flex;gap:6px;align-items:center;justify-content:center;flex-wrap:wrap">
      ${bits.join("")}
    </div>
    <div style="display:flex;gap:6px;justify-content:center;margin-top:10px;flex-wrap:wrap">
      <button type="button" class="button button-small button-outline" data-action="prog-bit-op" data-op="not">NOT (~)</button>
      <button type="button" class="button button-small button-outline" data-action="prog-bit-op" data-op="shl">&lt;&lt; 1</button>
      <button type="button" class="button button-small button-outline" data-action="prog-bit-op" data-op="shr">&gt;&gt; 1</button>
      <button type="button" class="button button-small button-outline" data-action="prog-bit-op" data-op="clear">Clear (0)</button>
      <button type="button" class="button button-small button-outline" data-action="prog-bit-op" data-op="set255">All 1s</button>
    </div>
  `;

  const bitResult = $("#prog-bit-result");
  if (bitResult) {
    const signed8 = progRegisterValue > 127 ? progRegisterValue - 256 : progRegisterValue;
    bitResult.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--ink)">
        <span>Unsigned: <strong style="color:var(--green)">${progRegisterValue}</strong></span>
        <span>Signed (Two's Comp): <strong>${signed8}</strong></span>
        <span>Octal: <strong>0o${progRegisterValue.toString(8).padStart(3, "0")}</strong></span>
        <span>Nibbles: <strong>0x${((progRegisterValue >> 4) & 0xF).toString(16).toUpperCase()} : 0x${(progRegisterValue & 0xF).toString(16).toUpperCase()}</strong></span>
      </div>
    `;
  }
}

function updateProgBaseFromValue(val, source) {
  val = Math.max(0, Math.min(255, Math.floor(val) || 0));
  progRegisterValue = val;

  if (source !== "dec") {
    const d = $("#prog-base-dec");
    if (d) d.value = val;
  }
  if (source !== "hex") {
    const h = $("#prog-base-hex");
    if (h) h.value = val.toString(16).toUpperCase().padStart(2, "0");
  }
  if (source !== "bin") {
    const b = $("#prog-base-bin");
    if (b) b.value = val.toString(2).padStart(8, "0");
  }
  if (source !== "ascii") {
    const a = $("#prog-base-ascii");
    if (a) a.value = (val >= 32 && val <= 126) ? String.fromCharCode(val) : (val === 0 ? "NUL" : "·");
  }

  renderProgBitRegister();
}

function toggleProgBit(bit) {
  progRegisterValue ^= (1 << bit);
  updateProgBaseFromValue(progRegisterValue, "register");
}

function executeProgBitOp(op) {
  if (op === "not") progRegisterValue = (~progRegisterValue) & 0xFF;
  else if (op === "shl") progRegisterValue = (progRegisterValue << 1) & 0xFF;
  else if (op === "shr") progRegisterValue = (progRegisterValue >> 1) & 0xFF;
  else if (op === "clear") progRegisterValue = 0;
  else if (op === "set255") progRegisterValue = 255;

  updateProgBaseFromValue(progRegisterValue, "register");
}

const MCU_BOARDS_DB = {
  esp32: {
    name: "ESP32-WROOM-32",
    cpu: "Tensilica Xtensa Dual-Core 32-bit LX6 @ 240 MHz",
    ram: "520 KB SRAM · 4 MB SPI Flash",
    logic: "3.3V Logic (NOT 5V tolerant! Use level shifter)",
    wireless: "Wi-Fi 802.11 b/g/n (150 Mbps) + Bluetooth 4.2 / BLE",
    pins: "34 GPIOs · 18 ADC channels (12-bit) · 2 DACs · 16 PWM",
    notes: "Premier powerhouse for IoT, home automation, and web dashboards."
  },
  pico: {
    name: "Raspberry Pi Pico (RP2040)",
    cpu: "Dual-Core ARM Cortex-M0+ @ 133 MHz",
    ram: "264 KB SRAM · 2 MB QSPI Flash",
    logic: "3.3V Logic (3.3V power out, 1.8V-5.5V VSYS input)",
    wireless: "Pico Standard (None) / Pico W (2.4GHz WiFi)",
    pins: "26 GPIOs · 8 Programmable I/O (PIO) state machines · 3 ADC (12-bit)",
    notes: "Unique PIO machines handle custom protocols with zero CPU cycle overhead."
  },
  uno: {
    name: "Arduino Uno R4 (RA4M1)",
    cpu: "Renesas RA4M1 32-bit ARM Cortex-M4 @ 48 MHz",
    ram: "32 KB SRAM · 256 KB Flash · 8 KB EEPROM",
    logic: "5V Logic (Fully 5V tolerant for classic shields)",
    wireless: "Minima (None) / WiFi (ESP32-S3 Co-processor)",
    pins: "14 Digital I/O · 6 Analog Inputs (14-bit) · 12-bit DAC · CAN bus",
    notes: "Modern 32-bit speed with legendary plug-and-play 5V pinout durability."
  },
  nano: {
    name: "Arduino Nano (Classic ATmega328P)",
    cpu: "Microchip ATmega328P 8-bit AVR @ 16 MHz",
    ram: "2 KB SRAM · 32 KB Flash · 1 KB EEPROM",
    logic: "5V Logic (5V logic level, 7-12V VIN pin)",
    wireless: "None",
    pins: "22 Digital I/O (6 PWM) · 8 Analog Inputs (10-bit)",
    notes: "Compact breadboard form factor. Low standby power, indestructible simplicity."
  },
  teensy: {
    name: "Teensy 4.0",
    cpu: "NXP i.MXRT1062 ARM Cortex-M7 @ 600 MHz (Blazing Fast)",
    ram: "1024 KB RAM · 2048 KB Flash · Hardware FPU (Floating Point)",
    logic: "3.3V Logic (NOT 5V tolerant)",
    wireless: "None",
    pins: "40 Digital Pins (31 PWM) · 14 Analog Pins · 7 Serial ports · 3 SPI",
    notes: "Fastest microcontroller on the market. Ideal for polyphonic audio DSP and synth."
  }
};

function updateMcuBoardView() {
  const boardKey = $("#prog-mcu-select")?.value || "esp32";
  const b = MCU_BOARDS_DB[boardKey] || MCU_BOARDS_DB.esp32;
  const res = $("#prog-mcu-result");
  if (!res) return;

  res.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px;font-size:12px;line-height:1.5">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <strong style="font-size:15px;color:var(--ink)">${b.name}</strong>
        <span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;background:${b.logic.includes("5V") ? "rgba(34,197,94,0.15);color:var(--green)" : "rgba(239,68,68,0.15);color:#ef4444"}">${b.logic.split(" ")[0]}</span>
      </div>
      • <strong>CPU:</strong> ${b.cpu}<br>
      • <strong>Memory:</strong> ${b.ram}<br>
      • <strong>Logic Level:</strong> <span style="font-weight:700">${b.logic}</span><br>
      • <strong>Connectivity:</strong> ${b.wireless}<br>
      • <strong>Peripherals:</strong> ${b.pins}<br>
      <div style="font-size:11px;color:var(--muted);margin-top:6px;border-top:1px dashed var(--border);padding-top:4px">💡 ${b.notes}</div>
    </div>
  `;
}

const PROG_SNIPPETS = {
  arduino_blink: `// Non-blocking timer using millis() - Arduino C++
const int LED_PIN = 13;
const unsigned long INTERVAL = 500; // ms
unsigned long prevMillis = 0;
int ledState = LOW;

void setup() {
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  unsigned long curMillis = millis();
  if (curMillis - prevMillis >= INTERVAL) {
    prevMillis = curMillis;
    ledState = (ledState == LOW) ? HIGH : LOW;
    digitalWrite(LED_PIN, ledState);
  }
}`,
  arduino_i2c: `// I2C Bus Address Scanner - Arduino C++
#include <Wire.h>

void setup() {
  Wire.begin();
  Serial.begin(115200);
  while (!Serial);
  Serial.println("\n--- Scanning I2C Bus ---");
  byte count = 0;
  for (byte address = 1; address < 127; ++address) {
    Wire.beginTransmission(address);
    if (Wire.endTransmission() == 0) {
      Serial.print("Device found at 0x");
      if (address < 16) Serial.print("0");
      Serial.println(address, HEX);
      count++;
    }
  }
  Serial.print("Done. Found ");
  Serial.print(count);
  Serial.println(" device(s).");
}

void loop() {}`,
  pico_pwm: `# Hardware PWM LED Breathing Fade - MicroPython (RP2040)
from machine import Pin, PWM
import time, math

led = PWM(Pin(25)) # Onboard LED
led.freq(1000)

step = 0
while True:
    # Smooth sinusoidal breathing curve
    brightness = int((math.sin(step) + 1) / 2 * 65535)
    led.duty_u16(brightness)
    step += 0.05
    time.sleep(0.02)`,
  esp32_wifi: `# WiFi Station Connect with Auto-Retry - MicroPython (ESP32)
import network, time

def connect_wifi(ssid, password):
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if not wlan.isconnected():
        print(f"Connecting to {ssid}...")
        wlan.connect(ssid, password)
        timeout = 10
        while not wlan.isconnected() and timeout > 0:
            time.sleep(1)
            timeout -= 1
    if wlan.isconnected():
        print(f"Connected! IP: {wlan.ifconfig()[0]}")
    else:
        print("Connection failed. Check credentials.")
    return wlan.isconnected()

# Usage: connect_wifi("MyNetwork", "SecretPass")`
};

function updateProgSnippetView() {
  const key = $("#prog-snippet-select")?.value || "arduino_blink";
  const codeBox = $("#prog-snippet-code");
  if (codeBox) {
    codeBox.textContent = PROG_SNIPPETS[key] || PROG_SNIPPETS.arduino_blink;
  }
}

async function copyProgSnippet() {
  const codeBox = $("#prog-snippet-code");
  if (!codeBox) return;
  try {
    await navigator.clipboard.writeText(codeBox.textContent);
    showToast("Copied code snippet to clipboard!");
  } catch {
    showToast("Code ready.");
  }
}

function renderProgrammingView() {
  updateProgBaseFromValue(progRegisterValue, "init");
  updateMcuBoardView();
  updateProgSnippetView();
  updateProgAluCalc();
  searchProgAsciiTable();
  formatProgByteArray();
  updateProgBaudCalc();
  updateProgCrcCalc();
  if (typeof updateProgBatteryLifeCalc === "function") updateProgBatteryLifeCalc();
  if (typeof updateIeee754InspectorUI === "function") updateIeee754InspectorUI();
}

// --- 🎨 Art & Design Studio ---
let currentStudioPaletteHexes = [];

function updateArtStudioPalette() {
  const baseHex = $("#art-view-base-color")?.value || "#0284c7";
  const rule = $("#art-view-harmony-rule")?.value || "complementary";
  const [h, s, l] = typeof hexToHsl === "function" ? hexToHsl(baseHex) : [200, 80, 50];

  let swatches = [];
  if (rule === "complementary") {
    swatches = [
      { h, s, l: Math.min(90, l + 18) },
      { h, s, l },
      { h: (h + 180) % 360, s, l },
      { h: (h + 180) % 360, s: Math.max(20, s - 15), l: Math.max(15, l - 18) },
      { h, s: Math.max(15, s - 30), l: 88 }
    ];
  } else if (rule === "analogous") {
    swatches = [
      { h: (h - 30) % 360, s, l },
      { h, s, l },
      { h: (h + 30) % 360, s, l },
      { h: (h + 60) % 360, s, l },
      { h: (h + 90) % 360, s: Math.max(20, s - 20), l: Math.min(85, l + 15) }
    ];
  } else if (rule === "triadic") {
    swatches = [
      { h, s, l },
      { h: (h + 120) % 360, s, l },
      { h: (h + 240) % 360, s, l },
      { h: (h + 120) % 360, s: Math.max(25, s - 25), l: Math.min(88, l + 20) },
      { h: (h + 240) % 360, s: Math.max(25, s - 25), l: Math.max(20, l - 20) }
    ];
  } else if (rule === "split") {
    swatches = [
      { h, s, l },
      { h: (h + 150) % 360, s, l },
      { h: (h + 210) % 360, s, l },
      { h: (h + 150) % 360, s: Math.max(20, s - 25), l: Math.max(20, l - 15) },
      { h, s: Math.max(10, s - 35), l: 90 }
    ];
  } else if (rule === "monochromatic") {
    swatches = [
      { h, s, l: 85 },
      { h, s, l: 65 },
      { h, s, l },
      { h, s: Math.min(100, s + 10), l: Math.max(25, l - 20) },
      { h, s: Math.min(100, s + 15), l: Math.max(12, l - 35) }
    ];
  }

  currentStudioPaletteHexes = swatches.map(item => typeof hslToHex === "function" ? hslToHex(item.h, item.s, item.l) : "#0284c7");
  if (typeof currentArtPaletteHexes !== "undefined") {
    currentArtPaletteHexes = [...currentStudioPaletteHexes];
  }

  const container = $("#art-view-palette-result");
  if (container) {
    container.innerHTML = swatches.map(item => {
      const hex = typeof hslToHex === "function" ? hslToHex(item.h, item.s, item.l) : "#0284c7";
      const pigment = typeof matchPigmentName === "function" ? matchPigmentName(item.h, item.s, item.l) : "Art Pigment";
      return `
        <div class="art-swatch" data-action="copy-art-swatch" data-hex="${hex}" style="cursor:pointer" title="Click to copy ${hex}">
          <div class="art-swatch-color" style="background:${hex}"></div>
          <div class="art-swatch-info">
            <div class="art-swatch-hex">${hex.toUpperCase()}</div>
            <div class="art-swatch-pigment">${pigment}</div>
          </div>
        </div>
      `;
    }).join("");
  }
  if (typeof updateArtGradientStudio === "function") updateArtGradientStudio();
  if (typeof updateArtCvdView === "function") updateArtCvdView();
}

function updateArtGoldenRatioView() {
  const mode = $("#art-view-dim-mode")?.value || "width";
  const val = parseFloat($("#art-view-dim-val")?.value) || 24;
  const res = $("#art-view-golden-result");
  if (!res) return;

  const PHI = 1.61803398875;
  const paired = mode === "width" ? (val / PHI) : (val * PHI);
  const alternate = mode === "width" ? (val * PHI) : (val / PHI);

  const third1 = (val / 3).toFixed(2);
  const third2 = (val * (2 / 3)).toFixed(2);

  res.innerHTML = `
    <div style="font-size:12px;color:var(--ink);line-height:1.4">
      • <strong>Golden Section Dimension (1:1.618):</strong> <span style="color:var(--green);font-weight:700">${val} × ${paired.toFixed(2)}</span><br>
      • Extended Aspect: ${val} × ${alternate.toFixed(2)}<br>
      • <strong>Rule of Thirds Gridlines:</strong> ${third1} and ${third2} from edge<br>
      • Standard Canvas Matches: 16×20, 18×24, 24×36 (3:2 / 4:3 proximity)
    </div>
  `;
}

function updateArtBoxNetView() {
  const l = parseFloat($("#art-box-l")?.value) || 6;
  const w = parseFloat($("#art-box-w")?.value) || 4;
  const d = parseFloat($("#art-box-d")?.value) || 2;
  const res = $("#art-box-result");
  if (!res) return;

  const glueTab = 0.75;
  const totalSheetWidth = (2 * l) + (2 * w) + glueTab;
  const totalSheetHeight = d + (2 * w) + (2 * 0.6);
  const volumeCuIn = l * w * d;
  const volumeMl = volumeCuIn * 16.387;

  res.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <span style="font-size:11px;font-weight:700;color:var(--muted)">FLAT CARDSTOCK CUT SIZE:</span>
      <strong style="font-size:18px;color:#0284c7">${totalSheetWidth.toFixed(2)}" × ${totalSheetHeight.toFixed(2)}"</strong>
    </div>
    <div style="font-size:12px;color:var(--ink);line-height:1.4">
      • Internal Box Volume: <strong>${volumeCuIn.toFixed(1)} cu in</strong> (~${Math.round(volumeMl)} mL / ${(volumeMl / 29.573).toFixed(1)} fl oz)<br>
      • Glue Tab Allowance: ${glueTab}" side seam flap<br>
      • Recommended Stock: 250 - 350 GSM Cardstock or 1.5mm E-Flute corrugated board
    </div>
  `;
}

function updateArt3DPrintView() {
  const weightG = parseFloat($("#art-print-g")?.value) || 65;
  const spoolCost = parseFloat($("#art-print-spool")?.value) || 22;
  const res = $("#art-print-result");
  if (!res) return;

  const materialCost = (weightG / 1000) * spoolCost;
  const electricityEst = 0.35;
  const totalCost = materialCost + electricityEst;
  const makerRetail = totalCost * 2.5;

  res.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <span style="font-size:11px;font-weight:700;color:var(--muted)">NET PRODUCTION COST:</span>
      <strong style="font-size:18px;color:var(--green)">$${totalCost.toFixed(2)}</strong>
    </div>
    <div style="font-size:12px;color:var(--ink);line-height:1.4">
      • Filament Cost: <strong>$${materialCost.toFixed(2)}</strong> (@ $${spoolCost}/kg PLA)<br>
      • Power & Maintenance Buffer: $${electricityEst.toFixed(2)}<br>
      • Suggested Maker Price: <strong style="color:var(--green)">$${makerRetail.toFixed(2)}</strong> (2.5× hobbyist markup)
    </div>
  `;
}

function updateArtLaserKerfView() {
  const spotMm = parseFloat($("#art-laser-spot")?.value) || 0.15;
  const res = $("#art-laser-result");
  if (!res) return;

  const halfKerf = spotMm / 2;
  res.innerHTML = `
    <div style="font-size:12px;color:var(--ink);line-height:1.4">
      • <strong>Inside Cutout Compensation:</strong> Expand vector path by <strong style="color:var(--green)">+${halfKerf.toFixed(3)} mm</strong><br>
      • <strong>Outside Perimeter Offset:</strong> Shrink vector path by <strong>-${halfKerf.toFixed(3)} mm</strong><br>
      • Finger-Joint Press Fit: Adjust slot width by -${(spotMm * 0.8).toFixed(3)} mm for snug friction lock
    </div>
  `;
}

// --- 🖼️ Art Studio: Mat Board, Border & Picture Frame Sizing Calculator ---
function updateArtFrameCalc() {
  const preset = $("#art-frame-preset")?.value || "8x10";
  const dimUnit = $("#art-frame-dim-unit")?.value || "in";
  let artW = parseFloat($("#art-frame-art-w")?.value) || 8;
  let artH = parseFloat($("#art-frame-art-h")?.value) || 10;
  const matW = parseFloat($("#art-frame-mat-w")?.value) || 2.5;
  const moldingW = parseFloat($("#art-frame-molding-w")?.value) || 0.75;
  const overlap = parseFloat($("#art-frame-overlap")?.value) || 0.25;
  const bottomWeight = $("#art-frame-bottom-weight")?.value || "optical";
  const matColor = $("#art-frame-mat-color")?.value || "#f8fafc";
  const res = $("#art-frame-result");
  if (!res) return;

  const openW = Math.max(0.5, artW - (2 * overlap));
  const openH = Math.max(0.5, artH - (2 * overlap));

  const borderTop = matW;
  const borderSides = matW;
  const borderBottom = (bottomWeight === "optical") ? (matW + (dimUnit === "cm" ? 1.5 : 0.5)) : matW;

  const matTotalW = openW + (2 * borderSides);
  const matTotalH = openH + borderTop + borderBottom;

  const frameOutsideW = matTotalW + (2 * moldingW);
  const frameOutsideH = matTotalH + (2 * moldingW);

  const maxDim = Math.max(frameOutsideW, frameOutsideH);
  const scale = 200 / maxDim;
  const svgFrameW = frameOutsideW * scale;
  const svgFrameH = frameOutsideH * scale;
  const svgMatW = matTotalW * scale;
  const svgMatH = matTotalH * scale;
  const svgOpenW = openW * scale;
  const svgOpenH = openH * scale;
  const svgMold = moldingW * scale;
  const svgTop = borderTop * scale;
  const svgSides = borderSides * scale;

  const svgMockup = `
    <div class="art-frame-svg-wrap">
      <svg viewBox="0 0 300 240" width="100%" height="200" style="overflow:visible">
        <g transform="translate(${150 - svgFrameW/2}, ${120 - svgFrameH/2})">
          <rect x="0" y="0" width="${svgFrameW}" height="${svgFrameH}" rx="3" fill="#3e2723" stroke="#271917" stroke-width="2"/>
          <rect x="${svgMold}" y="${svgMold}" width="${svgMatW}" height="${svgMatH}" fill="${matColor}" stroke="#cbd5e1" stroke-width="1"/>
          <rect x="${svgMold + svgSides}" y="${svgMold + svgTop}" width="${svgOpenW}" height="${svgOpenH}" fill="#1e293b" opacity="0.15"/>
          <rect x="${svgMold + svgSides}" y="${svgMold + svgTop}" width="${svgOpenW}" height="${svgOpenH}" fill="#38bdf8" rx="1"/>
          <text x="${svgMold + svgSides + svgOpenW/2}" y="${svgMold + svgTop + svgOpenH/2 + 4}" text-anchor="middle" font-size="10" font-weight="700" fill="#0f172a">
            Art: ${artW}×${artH} ${dimUnit}
          </text>
        </g>
      </svg>
    </div>
  `;

  res.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:10px;margin-bottom:12px">
      <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">1. Mat Aperture Cutout</div>
        <div style="font-size:18px;font-weight:800;color:var(--ink);margin:2px 0">
          ${openW.toFixed(2)}" × ${openH.toFixed(2)}" ${dimUnit}
        </div>
        <div style="font-size:11px;color:var(--muted)">Includes ${overlap}" overlap on each edge</div>
      </div>

      <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">2. Mat &amp; Glass Cut Size</div>
        <div style="font-size:18px;font-weight:800;color:var(--green);margin:2px 0">
          ${matTotalW.toFixed(2)}" × ${matTotalH.toFixed(2)}" ${dimUnit}
        </div>
        <div style="font-size:11px;color:var(--muted)">Backing board, glass &amp; mat size</div>
      </div>

      <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">3. Outside Frame Footprint</div>
        <div style="font-size:18px;font-weight:800;color:#0284c7;margin:2px 0">
          ${frameOutsideW.toFixed(2)}" × ${frameOutsideH.toFixed(2)}" ${dimUnit}
        </div>
        <div style="font-size:11px;color:var(--muted)">Total outer wall footprint on hanging</div>
      </div>
    </div>

    ${svgMockup}

    <div style="font-size:11px;color:var(--ink);background:var(--surface);padding:8px 12px;border:1px solid var(--border);border-radius:6px;margin:8px 0">
      • <strong>Mat Margins:</strong> Top: <code>${borderTop.toFixed(2)}"</code> · Sides: <code>${borderSides.toFixed(2)}"</code> · Bottom: <code>${borderBottom.toFixed(2)}"</code> ${(bottomWeight === "optical") ? "<span style=\"color:#10b981\">(+0.5\" Optical Center Weighting Applied)</span>" : ""}
    </div>

    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;flex-wrap:wrap">
      <button type="button" class="button button-small button-outline" data-action="copy-frame-specs">📋 Copy Framing Cut Sheet</button>
      <button type="button" class="button button-small button-primary" data-action="save-frame-to-materials">➕ Add Frame Materials to Project</button>
    </div>
  `;
}

async function copyFrameSpecs() {
  const artW = $("#art-frame-art-w")?.value || "8";
  const artH = $("#art-frame-art-h")?.value || "10";
  const unit = $("#art-frame-dim-unit")?.value || "in";
  const cards = document.querySelectorAll("#art-frame-result div[style*='font-size:18px']");
  const openVal = cards[0]?.textContent.trim() || "";
  const matVal = cards[1]?.textContent.trim() || "";
  const frameVal = cards[2]?.textContent.trim() || "";

  const text = `Custom Picture Framing Cut Sheet:\n• Artwork: ${artW} × ${artH} ${unit}\n• Mat Window Cutout: ${openVal}\n• Mat & Glass Cut Size: ${matVal}\n• Frame Outer Footprint: ${frameVal}\nGenerated by Workbench Journal`;
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied Framing Cut Sheet to clipboard!");
  } catch {
    showToast("Cut sheet generated.");
  }
}

async function saveFrameToMaterials() {
  const cards = document.querySelectorAll("#art-frame-result div[style*='font-size:18px']");
  const matVal = cards[1]?.textContent.trim() || "11x14 in";
  await addMaterialToProjectShopping(`Mat Board & Glass (${matVal})`, "1 unit", 0, "Lumber & Sheet Goods");
}

function renderArtView() {
  updateArtStudioPalette();
  updateArtGoldenRatioView();
  updateArtBoxNetView();
  updateArt3DPrintView();
  updateArtLaserKerfView();
  updateArtContrastCalc();
  updateArtGradientStudio();
  updateArtPrintResCalc();
  updateArtCvdView();
  if (typeof updateArtFrameCalc === "function") updateArtFrameCalc();
  if (typeof updatePigmentMixer === "function") updatePigmentMixer();
  if (typeof renderArtCameraDetails === "function" && typeof artCameraState !== "undefined") {
    renderArtCameraDetails(artCameraState.activeColor, artCameraState.topClusters, artCameraState.screenDominantColor);
  }
}

// --- Initialize All Craft Studios ---

/* ============================================================
   🌟 CRAFT STUDIOS EXPANDED FEATURE ENGINES
   ============================================================ */

// --- 🪵 Woodworking Cut List Optimizer & Dust Velocity ---
function runWoodCutOptimizer() {
  const stockLen = parseFloat($("#wood-cut-stock")?.value) || 96;
  const kerf = parseFloat($("#wood-cut-kerf")?.value) || 0.125;
  const rawText = $("#wood-cut-pieces")?.value || "";

  const pieces = [];
  rawText.split("\n").forEach(line => {
    line = line.trim();
    if (!line) return;
    const parts = line.split(/[xX*]/);
    if (parts.length >= 2) {
      const len = parseFloat(parts[0]);
      const qty = parseInt(parts[1], 10) || 1;
      if (len > 0 && qty > 0) {
        for (let i = 0; i < qty; i++) pieces.push(len);
      }
    } else {
      const len = parseFloat(line);
      if (len > 0) pieces.push(len);
    }
  });

  const res = $("#wood-cutlist-result");
  if (!res) return;

  if (pieces.length === 0) {
    res.innerHTML = '<span style="font-size:12px;color:var(--muted)">Enter cut pieces above (e.g. <code>36 x 2</code>) and click Optimize.</span>';
    return;
  }

  const over = pieces.find(p => p > stockLen);
  if (over) {
    res.innerHTML = '<span style="color:#ef4444;font-size:12px">⚠️ Piece length (' + over + '") exceeds stock board length (' + stockLen + '").</span>';
    return;
  }

  pieces.sort((a, b) => b - a);
  const boards = [];

  pieces.forEach(p => {
    let placed = false;
    for (const b of boards) {
      const needed = b.cuts.length === 0 ? p : p + kerf;
      if (b.remaining >= needed) {
        b.cuts.push(p);
        b.remaining -= needed;
        placed = true;
        break;
      }
    }
    if (!placed) {
      boards.push({ remaining: stockLen - p, cuts: [p] });
    }
  });

  const totalUsed = boards.length * stockLen;
  const totalCutLen = pieces.reduce((sum, p) => sum + p, 0);
  const yieldPct = ((totalCutLen / totalUsed) * 100).toFixed(1);
  const scrapLen = (totalUsed - totalCutLen).toFixed(1);

  const colors = ["#0284c7", "#16a34a", "#d97706", "#9333ea", "#e11d48", "#0d9488", "#4f46e5"];

  const boardDiagrams = boards.map((b, idx) => {
    const segs = b.cuts.map((cut, cIdx) => {
      const pct = (cut / stockLen) * 100;
      const c = colors[cIdx % colors.length];
      return '<div class="cutlist-seg" style="width:' + pct + '%;background:' + c + '" title="Piece ' + (cIdx + 1) + ': ' + cut + '\">'+ cut + '\"</div>';
    }).join("");
    const wastePct = Math.max(0, (b.remaining / stockLen) * 100);
    const wasteSeg = wastePct > 0 ? '<div class="cutlist-seg waste" style="width:' + wastePct + '%;" title="Offcut: ' + b.remaining.toFixed(2) + '\">'+ b.remaining.toFixed(1) + '\"</div>' : "";

    return '<div class="cutlist-board-diagram">' +
      '<div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700">' +
        '<span>BOARD ' + (idx + 1) + ' (' + stockLen + '")</span>' +
        '<span style="color:var(--muted)">' + b.cuts.length + ' cuts · Offcut: ' + b.remaining.toFixed(1) + '"</span>' +
      '</div>' +
      '<div class="cutlist-bar-vis">' + segs + wasteSeg + '</div>' +
    '</div>';
  }).join("");

  res.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px">' +
    '<div style="font-size:13px;font-weight:800;color:var(--ink)">Yield: <span style="color:var(--green)">' + yieldPct + '%</span> · Stock Needed: <span style="color:#0284c7">' + boards.length + ' boards</span></div>' +
    '<div style="font-size:11px;color:var(--muted)">Total Cut: ' + totalCutLen.toFixed(1) + '" · Total Scrap: ' + scrapLen + '"</div>' +
  '</div>' + boardDiagrams;
}

async function copyWoodCutPlan() {
  const stockLen = parseFloat($("#wood-cut-stock")?.value) || 96;
  const rawText = $("#wood-cut-pieces")?.value || "";
  const text = "✂️ Woodworking Cut List Plan\nStock Length: " + stockLen + '"\nRequired Pieces:\n' + rawText + "\nGenerated with Workbench Studio";
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied cut plan to clipboard!");
  } catch {
    showToast("Plan ready.");
  }
}

function updateWoodDustCalc() {
  const cfm = parseFloat($("#wood-dust-machine")?.value) || 450;
  const diaIn = parseFloat($("#wood-dust-dia")?.value) || 4;
  const res = $("#wood-dust-result");
  if (!res) return;

  const areaSqFt = Math.PI * Math.pow((diaIn / 24), 2);
  const fpm = cfm / areaSqFt;

  let statusHtml = "";
  if (fpm < 3500) {
    statusHtml = '<span style="color:#ef4444;font-weight:700">⚠️ ' + Math.round(fpm) + ' FPM (Too Low):</span> Heavy chips will drop out of airflow and clog horizontal ducts. Use smaller duct or increase dust collector CFM.';
  } else if (fpm <= 4500) {
    statusHtml = '<span style="color:var(--green);font-weight:700">✅ ' + Math.round(fpm) + ' FPM (Optimal):</span> Ideal velocity for chip transport without excessive static pressure friction.';
  } else {
    statusHtml = '<span style="color:#d97706;font-weight:700">⚡ ' + Math.round(fpm) + ' FPM (High Velocity):</span> Excellent chip suspension, but produces higher airflow static pressure drop.';
  }

  res.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
    '<span style="font-size:11px;font-weight:700;color:var(--muted)">DUCT AIR VELOCITY:</span>' +
    '<strong style="font-size:18px;color:var(--ink)">' + Math.round(fpm) + ' FPM</strong>' +
  '</div>' +
  '<div style="font-size:12px;color:var(--ink);line-height:1.4">' + statusHtml + '</div>';
}

const WOOD_FINISHES_DB = {
  hardwax: { name: "Hardwax Oil (Rubio Monocoat / Odie's)", dry: "24 hours", recoat: "1 coat sufficient (zero recoat needed)", voc: "0% VOC (Plant-based)", durability: "High water repellency, satin matte sheen", foodSafe: "Yes (Safe for cutting boards/bowls once cured)", method: "Buff in with white scotch-brite pad, wipe completely dry with rag" },
  poly_oil: { name: "Wipe-On Polyurethane (Oil-Based)", dry: "8 - 12 hours", recoat: "2 - 3 coats (sand with 320 between coats)", voc: "High (Requires organic vapor respirator)", durability: "Maximum scratch, heat & chemical durability", foodSafe: "Yes (Fully food-contact safe after 30-day cure)", method: "Wipe thin coats with lint-free cotton rag in direction of wood grain" },
  poly_water: { name: "Water-Based Polyurethane", dry: "2 hours (fast dry)", recoat: "3 - 4 coats within 1 day", voc: "Very low odor, soap & water cleanup", durability: "High durability, crystal-clear non-yellowing look", foodSafe: "Yes after full cure", method: "Synthetic bristle brush or HVLP spray gun" },
  danish: { name: "Danish Oil / Tung Oil Blend", dry: "12 - 24 hours", recoat: "2 - 3 coats for satin glow", voc: "Moderate solvent odor", durability: "Moderate moisture resistance, penetrates deep into wood pores", foodSafe: "Not pure (contains driers); look for 100% pure Tung oil for food surfaces", method: "Flood surface, allow 20 mins to soak, wipe thoroughly dry" },
  shellac: { name: "Dewaxed Shellac (Zinsser SealCoat)", dry: "30 minutes (ultra-fast)", recoat: "Multiple coats in 1 hour", voc: "Denatured alcohol solvent (mild sweet aroma)", durability: "Low heat & alcohol resistance; supreme universal primer/sealer", foodSafe: "Yes (Pharmaceutical & candy glaze grade)", method: "French polish pad or camel-hair brush" },
  lacquer: { name: "Pre-Catalyzed Spray Lacquer", dry: "15 minutes", recoat: "2 - 3 coats in same afternoon", voc: "Very high VOC (spray booth recommended)", durability: "Commercial furniture standard, crystal clarity, easy repair", foodSafe: "Yes once solvents fully evaporate (7 days)", method: "HVLP spray turbine at 20-25 PSI" },
  blo: { name: "Boiled Linseed Oil (BLO)", dry: "24 - 48 hours", recoat: "Annual maintenance coat", voc: "Low natural linseed oil aroma", durability: "Low water barrier; enhances chatoyance and grain pop", foodSafe: "Traditional BLO contains heavy metal metallic driers (use pure raw for food)", method: "Rub in by hand. CAUTION: Lay oily rags flat to dry to prevent spontaneous combustion!" }
};

function updateWoodFinishView() {
  const key = $("#wood-finish-select")?.value || "hardwax";
  const f = WOOD_FINISHES_DB[key] || WOOD_FINISHES_DB.hardwax;
  const res = $("#wood-finish-result");
  if (!res) return;

  res.innerHTML = '<div style="font-size:12px;color:var(--ink);line-height:1.4">' +
    '• <strong>Dry &amp; Recoat:</strong> ' + f.dry + ' (' + f.recoat + ')<br>' +
    '• <strong>VOC &amp; Odor:</strong> ' + f.voc + '<br>' +
    '• <strong>Durability &amp; Sheen:</strong> ' + f.durability + '<br>' +
    '• <strong>Food Safe:</strong> <span style="color:var(--green);font-weight:700">' + f.foodSafe + '</span><br>' +
    '• <strong>Best Application:</strong> ' + f.method +
  '</div>';
}

// --- ⚙️ Woodworking: CNC Feeds, Speeds & Chip Load Precision Calculator ---
function updateCncCalc() {
  const material = $("#cnc-material")?.value || "hardwood";
  const bitPreset = $("#cnc-bit-preset")?.value || "0.25";
  const customBitInput = $("#cnc-bit-custom");
  let bitDia = parseFloat(bitPreset);
  if (bitPreset === "custom") {
    if (customBitInput) customBitInput.style.display = "inline-block";
    bitDia = parseFloat(customBitInput?.value) || 0.25;
  } else {
    if (customBitInput) customBitInput.style.display = "none";
  }
  bitDia = Math.max(0.01, Math.min(3.0, bitDia));

  const flutes = parseInt($("#cnc-flutes")?.value, 10) || 2;
  const rpm = Math.max(1000, Math.min(40000, parseInt($("#cnc-rpm")?.value, 10) || 18000));
  const opType = $("#cnc-op-type")?.value || "slotting";
  const unit = $("#cnc-unit")?.value || "imperial";
  const res = $("#cnc-result");
  if (!res) return;

  const matDatabase = {
    hardwood: { name: "Hardwood", baseChip: 0.0045, docFactor: 0.50, maxSfm: 800, advice: "Use 2-flute upcut or compression spiral to prevent bottom blowout; ensure rigid workpiece hold-down." },
    softwood: { name: "Softwood", baseChip: 0.0055, docFactor: 0.75, maxSfm: 1000, advice: "High feed rates prevent burning in pitchy pine/fir. Sharp carbide edge is critical to avoid fuzzy fibers." },
    plywood:  { name: "Plywood", baseChip: 0.0040, docFactor: 0.50, maxSfm: 750, advice: "Use compression spiral bits (upcut bottom + downcut top) for tearout-free veneers on both sides." },
    mdf:      { name: "MDF / HDF", baseChip: 0.0060, docFactor: 0.75, maxSfm: 1000, advice: "Abrasive resin glues dull bits rapidly. Run fast feed rates to extract heat in dust; turn dust collection on MAX." },
    acrylic:  { name: "Cast Acrylic", baseChip: 0.0040, docFactor: 0.40, maxSfm: 500, advice: "Use polished single O-flute bit. Too slow feeds melt plastic back into kerf; ramp entries prevent chipping." },
    aluminum: { name: "Aluminum (6061)", baseChip: 0.0012, docFactor: 0.20, maxSfm: 400, advice: "Single or 2-flute ZrN coated endmill. Use isopropyl alcohol or air blast mist; shallow DOC with high RPM." },
    delrin:   { name: "Delrin / Acetal", baseChip: 0.0050, docFactor: 0.50, maxSfm: 800, advice: "Machines exceptionally well. Use sharp upcut bit with moderate feed to avoid heating and thermal expansion." }
  };

  const mat = matDatabase[material] || matDatabase.hardwood;
  // Haas tooling chip load scaling: CL = base * (D / 0.25)^0.6
  const chipLoadIn = mat.baseChip * Math.pow(bitDia / 0.25, 0.6);
  const feedRateIpm = Math.round(rpm * flutes * chipLoadIn * 10) / 10;
  const sfm = Math.round((Math.PI * bitDia * rpm) / 12);
  const plungeIpm = Math.round(feedRateIpm * 0.30 * 10) / 10;
  const docIn = Math.round(bitDia * mat.docFactor * 1000) / 1000;
  const wocFactor = opType === "slotting" ? 1.0 : (opType === "roughing" ? 0.5 : 0.15);
  const wocIn = Math.round(bitDia * wocFactor * 1000) / 1000;
  const mrrIn3 = Math.round(feedRateIpm * docIn * wocIn * 100) / 100;

  // Unit display values
  const isMetric = unit === "metric";
  const displayFeed = isMetric ? Math.round(feedRateIpm * 25.4) : feedRateIpm;
  const feedUnit = isMetric ? "mm/min" : "IPM";
  const displayPlunge = isMetric ? Math.round(plungeIpm * 25.4) : plungeIpm;
  const plungeUnit = isMetric ? "mm/min" : "IPM";
  const displayDoc = isMetric ? (docIn * 25.4).toFixed(2) : docIn.toFixed(3);
  const docUnit = isMetric ? "mm" : "in";
  const displayWoc = isMetric ? (wocIn * 25.4).toFixed(2) : wocIn.toFixed(3);
  const wocUnit = isMetric ? "mm" : "in";
  const displayMrr = isMetric ? (mrrIn3 * 16.387).toFixed(1) : mrrIn3.toFixed(2);
  const mrrUnit = isMetric ? "cm³/min" : "in³/min";
  const displayChip = isMetric ? (chipLoadIn * 25.4).toFixed(3) : chipLoadIn.toFixed(4);
  const chipUnit = isMetric ? "mm/tooth" : "in/tooth";
  const surfaceSpeed = isMetric ? Math.round(sfm * 0.3048) : sfm;
  const sfmUnit = isMetric ? "m/min" : "SFM";

  res.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:8px">
      <div class="cnc-stat-pill">
        <span class="cnc-stat-pill-label">Feed Rate (XY)</span>
        <span class="cnc-stat-pill-val">${displayFeed}<span class="cnc-stat-pill-unit">${feedUnit}</span></span>
      </div>
      <div class="cnc-stat-pill">
        <span class="cnc-stat-pill-label">Plunge Rate (Z)</span>
        <span class="cnc-stat-pill-val">${displayPlunge}<span class="cnc-stat-pill-unit">${plungeUnit}</span></span>
      </div>
      <div class="cnc-stat-pill">
        <span class="cnc-stat-pill-label">Target Chip Load</span>
        <span class="cnc-stat-pill-val">${displayChip}<span class="cnc-stat-pill-unit">${chipUnit}</span></span>
      </div>
      <div class="cnc-stat-pill">
        <span class="cnc-stat-pill-label">Max Depth of Cut</span>
        <span class="cnc-stat-pill-val">${displayDoc}<span class="cnc-stat-pill-unit">${docUnit}</span></span>
      </div>
      <div class="cnc-stat-pill">
        <span class="cnc-stat-pill-label">Stepover (WOC)</span>
        <span class="cnc-stat-pill-val">${displayWoc}<span class="cnc-stat-pill-unit">${wocUnit}</span></span>
      </div>
      <div class="cnc-stat-pill">
        <span class="cnc-stat-pill-label">Surface Speed</span>
        <span class="cnc-stat-pill-val">${surfaceSpeed}<span class="cnc-stat-pill-unit">${sfmUnit}</span></span>
      </div>
      <div class="cnc-stat-pill">
        <span class="cnc-stat-pill-label">Removal Rate</span>
        <span class="cnc-stat-pill-val">${displayMrr}<span class="cnc-stat-pill-unit">${mrrUnit}</span></span>
      </div>
    </div>

    <div class="cnc-chip-gauge-wrap">
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;font-weight:700">
        <span style="color:#ef4444">🔥 Rubbing / Friction Burn</span>
        <span style="color:#10b981">🎯 Optimal Evacuation Sweet Spot</span>
        <span style="color:#ef4444">⚠️ Tool Deflection / Chatter</span>
      </div>
      <div class="cnc-chip-track">
        <div class="cnc-chip-marker" style="left:50%" title="Target Chip Load Sweet Spot"></div>
      </div>
    </div>

    <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin:10px 0;font-size:12px;line-height:1.45">
      <strong>💡 Tooling &amp; Cut Strategy Advice:</strong> ${mat.advice}
    </div>

    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button type="button" class="button button-outline" data-action="copy-cnc-specs" style="font-size:12px" data-gcode="S${rpm} M3\nG1 F${displayFeed}">
        📋 Copy G-Code Settings (F${displayFeed} ${feedUnit} · S${rpm})
      </button>
    </div>
  `;
}

function setRouterRpmPreset(val) {
  const rpmInput = $("#cnc-rpm");
  if (rpmInput && val) {
    rpmInput.value = val;
    updateCncCalc();
  }
}

// --- 🧶 Textiles & Yarn Studio: Yardage Estimator, Gauge Swatch, PNG Export ---
const TEXTILE_PROJECT_YARDAGE_DB = {
  beanie: { "1": 250, "2": 220, "3": 200, "4": 180, "5": 140, "6": 90 },
  scarf: { "1": 600, "2": 500, "3": 450, "4": 380, "5": 280, "6": 180 },
  sweater_m: { "1": 1800, "2": 1500, "3": 1300, "4": 1100, "5": 850, "6": 600 },
  sweater_xl: { "1": 2200, "2": 1900, "3": 1650, "4": 1400, "5": 1100, "6": 750 },
  baby_blanket: { "1": 1400, "2": 1200, "3": 1050, "4": 900, "5": 700, "6": 500 },
  throw_blanket: { "1": 3000, "2": 2600, "3": 2200, "4": 1800, "5": 1400, "6": 950 },
  socks: { "1": 400, "2": 350, "3": 300, "4": 250, "5": 200, "6": 150 },
  shawl: { "1": 900, "2": 800, "3": 700, "4": 600, "5": 450, "6": 300 }
};

function updateTextilesYardageEstimator() {
  const proj = $("#textiles-est-project")?.value || "beanie";
  const wt = $("#textiles-est-yarn-wt")?.value || "4";
  const baseYardage = (TEXTILE_PROJECT_YARDAGE_DB[proj] && TEXTILE_PROJECT_YARDAGE_DB[proj][wt]) ? TEXTILE_PROJECT_YARDAGE_DB[proj][wt] : 200;

  const totalYds = Math.round(baseYardage * 1.10);
  const totalMeters = Math.round(totalYds * 0.9144);
  const skeins100g = Math.ceil(totalYds / 210);
  const skeins50g = Math.ceil(totalYds / 115);

  const res = $("#textiles-yardage-result");
  if (!res) return;

  res.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:8px">' +
    '<div>' +
      '<span style="font-size:11px;font-weight:700;color:var(--muted)">RECOMMENDED YARN:</span>' +
      '<strong style="font-size:18px;color:var(--green);margin-left:6px">~' + totalYds + ' yds (' + totalMeters + ' m)</strong>' +
    '</div>' +
    '<button type="button" class="button button-small button-outline" data-action="textiles-add-to-shopping" title="Add yarn to project shopping list">🛒 Add to Shopping List</button>' +
  '</div>' +
  '<div style="font-size:12px;color:var(--ink);line-height:1.4">' +
    '• Estimated Skeins: <strong>' + skeins100g + ' × 100g skeins</strong> (or ' + skeins50g + ' × 50g skeins)<br>' +
    '• Includes <strong>10% safety margin</strong> for swatches and seams<br>' +
    '• Check dye lot numbers when purchasing multiple skeins!' +
  '</div>';
}

function updateTextilesGaugeCalc() {
  const patSts = parseFloat($("#textiles-gauge-pattern")?.value) || 20;
  const actSts = parseFloat($("#textiles-gauge-actual")?.value) || 22;
  const targetW = parseFloat($("#textiles-gauge-target-w")?.value) || 38;

  const res = $("#textiles-gauge-result");
  if (!res) return;

  const patStsPerInch = patSts / 4;
  const actStsPerInch = actSts / 4;

  const plannedCastOn = Math.round(targetW * patStsPerInch);
  const actualFinishedW = plannedCastOn / actStsPerInch;
  const variancePct = (((actualFinishedW - targetW) / targetW) * 100).toFixed(1);
  const adjustedCastOn = Math.round(targetW * actStsPerInch);

  res.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
    '<span style="font-size:11px;font-weight:700;color:var(--muted)">FINISHED SIZE IMPACT:</span>' +
    '<strong style="font-size:18px;color:' + (Math.abs(actualFinishedW - targetW) > 1.5 ? '#ef4444' : 'var(--green)') + '">' + actualFinishedW.toFixed(1) + '" wide (' + (variancePct > 0 ? '+' : '') + variancePct + '%)</strong>' +
  '</div>' +
  '<div style="font-size:12px;color:var(--ink);line-height:1.4">' +
    '• Original Pattern Cast-On: <strong>' + plannedCastOn + ' stitches</strong><br>' +
    '• <strong>Adjusted Cast-On to Hit ' + targetW + '":</strong> <span style="color:var(--green);font-weight:800">' + adjustedCastOn + ' stitches</span><br>' +
    '• ' + (actSts > patSts ? 'Your gauge is tighter: Go UP 1 needle size (e.g. US 7 → US 8).' : actSts < patSts ? 'Your gauge is looser: Go DOWN 1 needle size (e.g. US 8 → US 7).' : 'Spot on! Your gauge perfectly matches the pattern.') +
  '</div>';
}

function updateYarnSkeinCalculator() {
  const fullWt = parseFloat($("#textiles-skein-full-wt")?.value) || 100;
  const fullLen = parseFloat($("#textiles-skein-full-len")?.value) || 220;
  const unit = $("#textiles-skein-len-unit")?.value || "yds";
  const curWt = parseFloat($("#textiles-skein-cur-wt")?.value) || 0;
  const targetLen = parseFloat($("#textiles-skein-target-len")?.value) || 0;
  const res = $("#textiles-skein-result");
  if (!res) return;

  if (fullWt <= 0 || fullLen <= 0) {
    res.innerHTML = '<span style="font-size:12px;color:var(--muted)">Enter valid full skein weight and length.</span>';
    return;
  }

  const fractionLeft = Math.max(0, Math.min(1.0, curWt / fullWt));
  const remainingLen = fractionLeft * fullLen;
  const usedWt = Math.max(0, fullWt - curWt);
  const usedLen = fullLen - remainingLen;
  const pctLeft = Math.round(fractionLeft * 100);

  const remainingYds = unit === "yds" ? remainingLen : remainingLen * 1.09361;
  const remainingM = unit === "m" ? remainingLen : remainingLen * 0.9144;

  let patternStatus = "";
  if (targetLen > 0) {
    if (remainingLen >= targetLen) {
      const extra = remainingLen - targetLen;
      patternStatus = `<div style="margin-top:6px;padding:6px 10px;border-radius:6px;background:rgba(34,197,94,0.12);color:var(--green);font-weight:700;font-size:12px">
        ✅ Sufficient yarn! You have +${extra.toFixed(1)} ${unit} surplus for this pattern.
      </div>`;
    } else {
      const shortage = targetLen - remainingLen;
      patternStatus = `<div style="margin-top:6px;padding:6px 10px;border-radius:6px;background:rgba(239,68,68,0.12);color:#ef4444;font-weight:700;font-size:12px">
        ⚠️ Yarn Shortage: You are ${shortage.toFixed(1)} ${unit} short of pattern requirement. Wind another skein or reduce repeat!
      </div>`;
    }
  }

  res.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:6px">
      <span style="font-size:11px;font-weight:700;color:var(--muted)">REMAINING YARDAGE ON SKEIN:</span>
      <strong style="font-size:18px;color:#ec4899">~${remainingLen.toFixed(1)} ${unit} (${unit === "yds" ? remainingM.toFixed(1) + " m" : remainingYds.toFixed(1) + " yds"})</strong>
    </div>
    <div class="skein-meter-bar">
      <div class="skein-meter-fill" style="width:${pctLeft}%"></div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-bottom:8px">
      <span>Used: ${usedWt.toFixed(1)}g (${usedLen.toFixed(1)} ${unit})</span>
      <strong style="color:var(--ink)">${pctLeft}% Remaining (${curWt.toFixed(1)}g)</strong>
    </div>
    ${patternStatus}
    <div style="margin-top:8px;display:flex;justify-content:flex-end">
      <button type="button" class="button button-small button-outline" data-action="save-skein-to-materials" title="Add this stash yarn to your active project supplies">➕ Add Stash Yarn to Materials</button>
    </div>
  `;
}

async function saveSkeinToProjectMaterials() {
  const fullWt = parseFloat($("#textiles-skein-full-wt")?.value) || 100;
  const fullLen = parseFloat($("#textiles-skein-full-len")?.value) || 220;
  const unit = $("#textiles-skein-len-unit")?.value || "yds";
  const curWt = parseFloat($("#textiles-skein-cur-wt")?.value) || 0;
  const remainingLen = (fullWt > 0) ? (Math.max(0, Math.min(1.0, curWt / fullWt)) * fullLen) : curWt;

  await addMaterialToProjectShopping(`Partial Skein Stash Yarn (${curWt.toFixed(0)}g)`, `~${remainingLen.toFixed(0)} ${unit}`, 0, "Yarn & Fibers");
}

// --- 🧢 Textiles Studio: Beanie Hat & Sock Cast-On Sizing Calculator ---
const HAT_SIZE_PRESETS = {
  adult_m: { name: 'Adult Medium (22" / 56 cm head)', circIn: 22, circCm: 56 },
  adult_s: { name: 'Adult Small (20.5" / 52 cm head)', circIn: 20.5, circCm: 52 },
  adult_l: { name: 'Adult Large (23.5" / 60 cm head)', circIn: 23.5, circCm: 60 },
  child: { name: 'Child 4-10 yrs (19.5" / 50 cm head)', circIn: 19.5, circCm: 50 },
  toddler: { name: 'Toddler 1-3 yrs (18" / 46 cm head)', circIn: 18, circCm: 46 },
  baby: { name: 'Baby 6-12 mos (16" / 41 cm head)', circIn: 16, circCm: 41 },
  custom: { name: 'Custom Measurement', circIn: 22, circCm: 56 }
};

const SOCK_SIZE_PRESETS = {
  sock_women_m: { name: "Women's US 7–8 / EU 38–39 (8.5\" circ · 9.25\" len)", circIn: 8.5, circCm: 21.5, lenIn: 9.25, lenCm: 23.5 },
  sock_women_s: { name: "Women's US 5–6 / Youth (8.0\" circ · 8.5\" len)", circIn: 8.0, circCm: 20.3, lenIn: 8.5, lenCm: 21.5 },
  sock_women_l: { name: "Women's US 9–10 / Men's US 7.5–8.5 (9.0\" circ · 9.75\" len)", circIn: 9.0, circCm: 22.9, lenIn: 9.75, lenCm: 24.8 },
  sock_men_l: { name: "Men's US 10–12 / EU 43–46 (9.5\" circ · 10.5\" len)", circIn: 9.5, circCm: 24.1, lenIn: 10.5, lenCm: 26.7 },
  sock_men_xl: { name: "Men's US 13+ / EU 47+ (10.0\" circ · 11.25\" len)", circIn: 10.0, circCm: 25.4, lenIn: 11.25, lenCm: 28.5 },
  sock_child: { name: "Child 4–8 yrs (6.5\" circ · 7.0\" len)", circIn: 6.5, circCm: 16.5, lenIn: 7.0, lenCm: 17.8 },
  sock_baby: { name: "Baby / Toddler Bootie (5.0\" circ · 4.5\" len)", circIn: 5.0, circCm: 12.7, lenIn: 4.5, lenCm: 11.4 },
  custom: { name: "Custom Foot Measurement", circIn: 8.5, circCm: 21.5, lenIn: 9.25, lenCm: 23.5 }
};

function syncTextilesHatSockUI() {
  const projType = $("#textiles-hat-type")?.value || "beanie";
  const isSock = projType === "sock";
  const circUnit = $("#textiles-hat-circ-unit")?.value || "in";
  const titleEl = $("#textiles-hat-title");
  const descEl = $("#textiles-hat-desc");
  const presetSel = $("#textiles-hat-size-preset");
  const circLabelText = $("#textiles-circ-label-text");
  const sockLenWrap = $("#textiles-sock-len-wrap");
  const sockLenUnitLbl = $("#textiles-sock-len-unit-lbl");
  const easeSel = $("#textiles-hat-ease");
  const multLabel = $("#textiles-hat-multiple-label");
  const multSel = $("#textiles-hat-multiple");
  const brimLabel = $("#textiles-hat-brim-label");
  const brimSel = $("#textiles-hat-brim");
  const circInp = $("#textiles-hat-circ");
  const sockLenInp = $("#textiles-sock-len");

  if (sockLenUnitLbl) sockLenUnitLbl.textContent = circUnit;

  if (isSock) {
    if (titleEl) titleEl.textContent = "🧦 Handknit Sock Cast-On & Construction Architect";
    if (descEl) descEl.textContent = "Calculate exact cast-on stitches, negative ease stretch factors, and complete heel flap, heel turn, gusset pickup, and wedge toe decrease schedules for custom-fit handknit socks.";
    if (circLabelText) circLabelText.textContent = "Foot Circumference (Around ball of foot)";
    if (sockLenWrap) sockLenWrap.style.display = "block";

    if (presetSel && presetSel.dataset.mode !== "sock") {
      presetSel.dataset.mode = "sock";
      presetSel.innerHTML = Object.entries(SOCK_SIZE_PRESETS).map(([k, v]) => `
        <option value="${k}" ${k === "sock_women_m" ? "selected" : ""}>${v.name}</option>
      `).join("");
      if (circInp) {
        circInp.value = (circUnit === "cm") ? SOCK_SIZE_PRESETS.sock_women_m.circCm : SOCK_SIZE_PRESETS.sock_women_m.circIn;
      }
      if (sockLenInp) {
        sockLenInp.value = (circUnit === "cm") ? SOCK_SIZE_PRESETS.sock_women_m.lenCm : SOCK_SIZE_PRESETS.sock_women_m.lenIn;
      }
    }

    if (easeSel && !easeSel.dataset.isSock) {
      easeSel.dataset.isSock = "true";
      easeSel.innerHTML = `
        <option value="0.10" selected>-10% (Standard snug sock fit)</option>
        <option value="0.15">-15% (Firm athletic fit / ribbed)</option>
        <option value="0.05">-5% (Relaxed lounge / bed sock)</option>
        <option value="0.0">0% (Zero ease / slipper bootie)</option>
      `;
    }

    if (multLabel) multLabel.textContent = "Needle Setup / Stitch Multiple";
    if (multSel && !multSel.dataset.isSock) {
      multSel.dataset.isSock = "true";
      multSel.innerHTML = `
        <option value="4" selected>Multiple of 4 (Magic Loop / 4 DPNs &amp; 2x2 Ribbing)</option>
        <option value="2">Multiple of 2 (Ideal for 1x1 Ribbing)</option>
      `;
    }

    if (brimLabel) brimLabel.textContent = "Heel Construction Method";
    if (brimSel && !brimSel.dataset.isSock) {
      brimSel.dataset.isSock = "true";
      brimSel.innerHTML = `
        <option value="flap_gusset" selected>Traditional Heel Flap &amp; Gusset (Dutch Square Heel - Best Fit)</option>
        <option value="short_row">German Short Row Heel (Fish Lips Kiss / Hourglass)</option>
        <option value="afterthought">Afterthought / Peasant Tube Heel (Easiest to Replace)</option>
      `;
    }
  } else {
    // Hat mode
    if (titleEl) titleEl.textContent = "🧢 Beanie Hat Cast-On Sizing Calculator";
    if (descEl) descEl.textContent = "Calculate exact cast-on stitch counts and dynamic crown decrease schedules based on your gauge swatch and negative ease so your beanies fit without slouching or sliding.";
    if (circLabelText) circLabelText.textContent = "Actual Head Circumference";
    if (sockLenWrap) sockLenWrap.style.display = "none";

    if (presetSel && presetSel.dataset.mode === "sock") {
      presetSel.dataset.mode = "hat";
      presetSel.innerHTML = Object.entries(HAT_SIZE_PRESETS).map(([k, v]) => `
        <option value="${k}" ${k === "adult_m" ? "selected" : ""}>${v.name}</option>
      `).join("");
      if (circInp) {
        circInp.value = (circUnit === "cm") ? HAT_SIZE_PRESETS.adult_m.circCm : HAT_SIZE_PRESETS.adult_m.circIn;
      }
    }

    if (easeSel && easeSel.dataset.isSock) {
      delete easeSel.dataset.isSock;
      easeSel.innerHTML = `
        <option value="0.15" selected>-15% (Standard snug hat fit)</option>
        <option value="0.10">-10% (Gentle relaxed fit)</option>
        <option value="0.20">-20% (Firm athletic fit / ribbed)</option>
        <option value="0.0">0% (Zero ease / loose fit)</option>
      `;
    }

    if (multLabel) multLabel.textContent = "Ribbing Stitch Multiple";
    if (multSel && multSel.dataset.isSock) {
      delete multSel.dataset.isSock;
      multSel.innerHTML = `
        <option value="4" selected>Multiple of 4 (Ideal for 2x2 Ribbing)</option>
        <option value="2">Multiple of 2 (Ideal for 1x1 Ribbing)</option>
        <option value="8">Multiple of 8 (8-Wedge Crown Decrease)</option>
      `;
    }

    if (brimLabel) brimLabel.textContent = "Brim Style";
    if (brimSel && brimSel.dataset.isSock) {
      delete brimSel.dataset.isSock;
      brimSel.innerHTML = `
        <option value="folded" selected>Folded Brim (+2.5" / 6.5 cm cuff)</option>
        <option value="single">Single Unfolded Ribbed Brim (1.5" / 4 cm)</option>
        <option value="rolled">Rolled Stockinette Brim</option>
      `;
    }
  }
}

function updateTextilesHatCalc() {
  syncTextilesHatSockUI();

  const projType = $("#textiles-hat-type")?.value || "beanie";
  const isSock = projType === "sock";
  const circUnit = $("#textiles-hat-circ-unit")?.value || "in";
  let circ = parseFloat($("#textiles-hat-circ")?.value) || (isSock ? 8.5 : 22);
  const ease = parseFloat($("#textiles-hat-ease")?.value) || (isSock ? 0.10 : 0.15);
  const gaugeSts = Math.max(4, parseFloat($("#textiles-hat-gauge-sts")?.value) || 20);
  const gaugeRows = Math.max(4, parseFloat($("#textiles-hat-gauge-rows")?.value) || 28);
  const multiple = parseInt($("#textiles-hat-multiple")?.value, 10) || 4;
  const brimStyle = $("#textiles-hat-brim")?.value || (isSock ? "flap_gusset" : "folded");
  const res = $("#textiles-hat-result");
  if (!res) return;

  const circInches = (circUnit === "cm") ? (circ / 2.54) : circ;
  const targetCircInches = circInches * (1 - ease);
  const stsPerInch = gaugeSts / 4;
  const rowsPerInch = gaugeRows / 4;

  const rawSts = targetCircInches * stsPerInch;
  const castOn = Math.max(isSock ? 24 : 32, Math.round(rawSts / multiple) * multiple);

  const finishedCirc = (castOn / stsPerInch);
  const finishedCircDisplay = (circUnit === "cm") ? `${(finishedCirc * 2.54).toFixed(1)} cm` : `${finishedCirc.toFixed(1)}"`;

  if (isSock) {
    const sockLenRaw = parseFloat($("#textiles-sock-len")?.value) || (circUnit === "cm" ? 23.5 : 9.25);
    const footLenInches = (circUnit === "cm") ? (sockLenRaw / 2.54) : sockLenRaw;

    let heelSts = Math.round(castOn / 2);
    if (heelSts % 2 !== 0) heelSts += 1;
    const instepSts = castOn - heelSts;
    const heelFlapRows = heelSts;
    const gussetPickUp = Math.floor(heelFlapRows / 2) + 1;

    // Heel turn calculations (Dutch/Square heel)
    const turnCenter = Math.floor(heelSts / 3);
    const turnSide = Math.floor((heelSts - turnCenter) / 2);
    const turnKnitSts = turnSide + turnCenter;

    // Toe length estimate (~1.75" to 2" / 4.5 - 5 cm)
    const toeLengthInches = Math.min(2.5, Math.max(1.5, (castOn / 4) / stsPerInch * 2));
    const knitBeforeToeInches = Math.max(1.0, footLenInches - toeLengthInches);
    const knitBeforeToeDisplay = (circUnit === "cm") ? `${(knitBeforeToeInches * 2.54).toFixed(1)} cm` : `${knitBeforeToeInches.toFixed(1)}"`;
    const footLenDisplay = (circUnit === "cm") ? `${(footLenInches * 2.54).toFixed(1)} cm` : `${footLenInches.toFixed(1)}"`;
    const toeLenDisplay = (circUnit === "cm") ? `${(toeLengthInches * 2.54).toFixed(1)} cm` : `${toeLengthInches.toFixed(1)}"`;

    // Toe decrease schedule (Classic Wedge Toe)
    const toeRounds = [];
    let curToeSts = castOn;
    let roundNum = 1;
    const minToeSts = Math.max(12, Math.round(castOn * 0.35 / 4) * 4);

    while (curToeSts > minToeSts) {
      toeRounds.push({
        round: `Rnd ${roundNum}`,
        instruction: `Instep: K1, SSK, knit to last 3 sts, K2tog, K1. Sole: repeat. (-4 sts)`,
        rem: curToeSts - 4
      });
      curToeSts -= 4;
      roundNum++;

      if (curToeSts > minToeSts) {
        toeRounds.push({
          round: `Rnd ${roundNum}`,
          instruction: "Knit all stitches plain (no decreases)",
          rem: curToeSts
        });
        roundNum++;
      }
    }

    // Rapid decreases every round until final Kitchener graft
    const finalKitchenerSts = Math.max(8, Math.round(castOn * 0.22 / 2) * 2);
    while (curToeSts > finalKitchenerSts) {
      toeRounds.push({
        round: `Rnd ${roundNum}`,
        instruction: `Dec Rnd (every rnd): Instep: K1, SSK, to last 3, K2tog, K1. Sole: repeat. (-4 sts)`,
        rem: curToeSts - 4
      });
      curToeSts -= 4;
      roundNum++;
    }

    const toeTableHtml = toeRounds.slice(0, 10).map(r => `
      <tr>
        <td class="rnd">${r.round}</td>
        <td>${r.instruction}</td>
        <td class="rem">${r.rem} sts</td>
      </tr>
    `).join("");

    res.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--surface);border:1px solid var(--border);border-radius:8px;margin-bottom:12px;flex-wrap:wrap;gap:12px">
        <div>
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;font-weight:700">Recommended Sock Cast-On</div>
          <div style="font-size:26px;font-weight:900;color:var(--green);margin:2px 0">
            ${castOn} <span style="font-size:14px;color:var(--muted);font-weight:600">stitches</span>
          </div>
          <div style="font-size:11px;color:var(--muted)">
            Setup: ${instepSts} Instep / ${heelSts} Sole (or ${Math.round(castOn / 4)} sts per needle on 4 DPNs) · Relaxed Circ: ${finishedCircDisplay}
          </div>
        </div>
        <div>
          <span class="materials-group-badge" style="font-size:12px;padding:4px 10px">${(ease * 100).toFixed(0)}% Negative Ease</span>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(160px, 1fr));gap:8px;margin-bottom:12px">
        <div style="padding:8px 10px;background:var(--surface);border:1px solid var(--border);border-radius:6px;text-align:center">
          <div style="font-size:16px;font-weight:700;color:var(--ink)">${knitBeforeToeDisplay}</div>
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase">Foot Length Before Toe</div>
        </div>
        <div style="padding:8px 10px;background:var(--surface);border:1px solid var(--border);border-radius:6px;text-align:center">
          <div style="font-size:16px;font-weight:700;color:var(--ink)">${footLenDisplay}</div>
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase">Total Finished Foot</div>
        </div>
        <div style="padding:8px 10px;background:var(--surface);border:1px solid var(--border);border-radius:6px;text-align:center">
          <div style="font-size:16px;font-weight:700;color:var(--ink)">${heelSts} sts × ${heelFlapRows} rows</div>
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase">Heel Flap Architecture</div>
        </div>
        <div style="padding:8px 10px;background:var(--surface);border:1px solid var(--border);border-radius:6px;text-align:center">
          <div style="font-size:16px;font-weight:700;color:var(--ink)">${toeLenDisplay}</div>
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase">Toe Shaping Depth</div>
        </div>
      </div>

      <div style="background:var(--surface-subtle);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:12px">
        <div style="font-size:12px;font-weight:800;color:var(--ink);margin-bottom:6px">🧦 Step-by-Step Sock Pattern Architecture</div>
        <ol style="margin:0;padding-left:18px;font-size:11.5px;color:var(--ink);line-height:1.6">
          <li><strong>Cuff:</strong> Cast on ${castOn} sts. Join in the round. Work (2x2 or 1x1) ribbing for ~1.5" (3.8 cm).</li>
          <li><strong>Leg:</strong> Knit in stockinette in the round until desired leg height (~7" / 18 cm for standard crew).</li>
          <li><strong>Heel Flap:</strong> Work back and forth over ${heelSts} sole stitches for ${heelFlapRows} rows (Row 1: *Sl 1, K1*; Row 2: Sl 1, Purl to end). Leaves ${Math.floor(heelFlapRows / 2)} slipped edge chains.</li>
          <li><strong>Heel Turn:</strong> Row 1 (RS): Sl 1, K${turnKnitSts - 1}, SSK, K1, turn. Row 2 (WS): Sl 1, P${turnCenter}, P2tog, P1, turn. Row 3: Sl 1, knit to 1 st before gap, SSK, K1, turn. Row 4: Sl 1, purl to 1 st before gap, P2tog, P1, turn. Repeat until all side sts are worked.</li>
          <li><strong>Gusset:</strong> Pick up ${gussetPickUp} sts along each flap selvedge (+1 at corner). Decrease 2 sts every 2nd round until back to ${castOn} sts.</li>
          <li><strong>Foot:</strong> Knit plain stockinette until foot measures <strong>${knitBeforeToeDisplay}</strong> from back of heel.</li>
        </ol>
      </div>

      <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;margin-bottom:4px">Wedge Toe Decrease Schedule (Decreases to ${finalKitchenerSts} sts)</div>
      <table class="hat-schedule-table">
        <thead>
          <tr>
            <th>Round</th>
            <th>Stitch Instruction</th>
            <th>Remaining</th>
          </tr>
        </thead>
        <tbody>
          ${toeTableHtml}
        </tbody>
      </table>
      <div style="font-size:11px;color:var(--muted);margin-top:6px">
        ✂️ <em>Finishing Graft:</em> Divide remaining ${finalKitchenerSts} stitches evenly (${finalKitchenerSts / 2} instep / ${finalKitchenerSts / 2} sole). Cut yarn leaving a 12" (30 cm) tail and graft closed seamlessly with Kitchener Stitch.
      </div>

      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;flex-wrap:wrap">
        <button type="button" class="button button-small button-outline" data-action="copy-hat-specs">📋 Copy Sock Pattern</button>
        <button type="button" class="button button-small button-primary" data-action="save-hat-to-materials">➕ Add Notes to Project</button>
      </div>
    `;
    return;
  }

  // Hat calculation
  const sections = 8;
  const stsPerSection = Math.floor(castOn / sections);

  let currentSecSts = stsPerSection;
  let roundNum = 1;
  let remainingTotal = castOn;

  const decreaseRounds = [];
  while (currentSecSts > 1) {
    const kSts = currentSecSts - 2;
    decreaseRounds.push({
      round: `Rnd ${roundNum}`,
      instruction: (kSts > 0) ? `*K${kSts}, K2tog* repeat ${sections} times` : `*K2tog* repeat ${sections} times`,
      rem: remainingTotal - sections
    });
    remainingTotal -= sections;
    roundNum++;

    // Plain knit round in between
    if (currentSecSts > 2) {
      decreaseRounds.push({
        round: `Rnd ${roundNum}`,
        instruction: "Knit all stitches plain (no decreases)",
        rem: remainingTotal
      });
      roundNum++;
    }
    currentSecSts--;
  }

  const crownHeightInches = (roundNum / rowsPerInch);
  let totalHatHeightInches = (circInches <= 18) ? 7.0 : 8.5; // standard head height
  if (projType === "slouchy") totalHatHeightInches += 2.5;
  if (brimStyle === "folded") totalHatHeightInches += 2.5;

  const knitBeforeCrownInches = Math.max(1, totalHatHeightInches - crownHeightInches);
  const knitBeforeCrownDisplay = (circUnit === "cm") ? `${(knitBeforeCrownInches * 2.54).toFixed(1)} cm` : `${knitBeforeCrownInches.toFixed(1)}"`;
  const totalHeightDisplay = (circUnit === "cm") ? `${(totalHatHeightInches * 2.54).toFixed(1)} cm` : `${totalHatHeightInches.toFixed(1)}"`;

  const scheduleHtml = decreaseRounds.slice(0, 10).map(r => `
    <tr>
      <td class="rnd">${r.round}</td>
      <td>${r.instruction}</td>
      <td class="rem">${r.rem} sts</td>
    </tr>
  `).join("");

  res.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--surface);border:1px solid var(--border);border-radius:8px;margin-bottom:12px;flex-wrap:wrap;gap:12px">
      <div>
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;font-weight:700">Recommended Cast-On Stitches</div>
        <div style="font-size:26px;font-weight:900;color:var(--green);margin:2px 0">
          ${castOn} <span style="font-size:14px;color:var(--muted);font-weight:600">stitches</span>
        </div>
        <div style="font-size:11px;color:var(--muted)">Multiple of ${multiple} · Finished relaxed fit: ${finishedCircDisplay}</div>
      </div>
      <div>
        <span class="materials-group-badge" style="font-size:12px;padding:4px 10px">${(ease * 100).toFixed(0)}% Negative Ease</span>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(160px, 1fr));gap:8px;margin-bottom:12px">
      <div style="padding:8px 10px;background:var(--surface);border:1px solid var(--border);border-radius:6px;text-align:center">
        <div style="font-size:16px;font-weight:700;color:var(--ink)">${knitBeforeCrownDisplay}</div>
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase">Knit Before Decreases</div>
      </div>
      <div style="padding:8px 10px;background:var(--surface);border:1px solid var(--border);border-radius:6px;text-align:center">
        <div style="font-size:16px;font-weight:700;color:var(--ink)">${totalHeightDisplay}</div>
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase">Total Finished Height</div>
      </div>
      <div style="padding:8px 10px;background:var(--surface);border:1px solid var(--border);border-radius:6px;text-align:center">
        <div style="font-size:16px;font-weight:700;color:var(--ink)">${sections} Wedges</div>
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase">Crown Decrease Sections</div>
      </div>
    </div>

    <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;margin-bottom:4px">Crown Decrease Schedule (${sections}-Point Cinch)</div>
    <table class="hat-schedule-table">
      <thead>
        <tr>
          <th>Round</th>
          <th>Stitch Instruction</th>
          <th>Remaining</th>
        </tr>
      </thead>
      <tbody>
        ${scheduleHtml}
      </tbody>
    </table>
    <div style="font-size:11px;color:var(--muted);margin-top:6px">
      ✂️ <em>Finishing:</em> When ${sections} stitches remain, cut yarn leaving an 8" (20 cm) tail, thread through live loops with a tapestry needle, and cinch tightly inside.
    </div>

    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;flex-wrap:wrap">
      <button type="button" class="button button-small button-outline" data-action="copy-hat-specs">📋 Copy Pattern Notes</button>
      <button type="button" class="button button-small button-primary" data-action="save-hat-to-materials">➕ Add Notes to Project</button>
    </div>
  `;
}

async function copyHatSpecs() {
  const castOn = $("#textiles-hat-result div:first-child div:first-child div:nth-child(2)")?.textContent.trim() || "";
  const type = $("#textiles-hat-type option:checked")?.textContent || "Beanie";
  const size = $("#textiles-hat-size-preset option:checked")?.textContent || "Adult";
  const text = `Knit/Crochet Sizing Notes:\n• Project: ${type} (${size})\n• Cast-On: ${castOn}\nGenerated by Workbench Journal`;
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied Pattern Notes to clipboard!");
  } catch {
    showToast("Notes generated.");
  }
}

async function saveHatToProjectMaterials() {
  const castOn = $("#textiles-hat-result div:first-child div:first-child div:nth-child(2)")?.textContent.trim() || "Stitches";
  const type = $("#textiles-hat-type option:checked")?.textContent.split("(")[0].trim() || "Beanie Hat";
  await addMaterialToProjectShopping(`${type} (${castOn})`, "1 item", 0, "Yarn & Fibers");
}

// --- 🧶 Textiles Studio: Planned Pooling & Argyle Generator ---
const POOLING_PRESETS = {
  sunset: { name: "Sunset Rainbow", colors: ["#f43f5e", "#fbbf24", "#0d9488", "#7e22ce"], lengths: [6, 4, 6, 4] },
  forest: { name: "Woodland Mist", colors: ["#84cc16", "#fef3c7", "#4d7c0f", "#78350f"], lengths: [5, 4, 5, 4] },
  berry:  { name: "Berry Jam", colors: ["#be123c", "#c084fc", "#fdf4ff"], lengths: [7, 5, 4] },
  ocean:  { name: "Deep Ocean", colors: ["#1e3a8a", "#38bdf8", "#5eead4", "#f8fafc"], lengths: [6, 6, 6, 4] }
};

function updateTextilesPooling() {
  const presetKey = $("#textiles-pool-preset")?.value || "sunset";
  const seqStr = $("#textiles-pool-stitch-seq")?.value || "6, 4, 6, 4";
  const shiftMode = $("#textiles-pool-shift")?.value || "argyle_pos";
  const repeats = Math.max(1, parseInt($("#textiles-pool-mult")?.value, 10) || 2);
  const res = $("#textiles-pool-result");
  if (!res) return;

  const counts = seqStr.split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0);
  if (!counts.length) counts.push(6, 4, 6, 4);

  const repeatCycleSts = counts.reduce((a, b) => a + b, 0);

  let shiftSts = 1;
  let effectName = "Diagonal Argyle Diamonds";
  if (shiftMode === "argyle_neg") { shiftSts = -1; effectName = "Reverse Diagonal Argyle Diamonds"; }
  else if (shiftMode === "vertical") { shiftSts = 0; effectName = "Vertical Color Columns"; }
  else if (shiftMode === "zigzag") { shiftSts = 2; effectName = "Chevron Zig-Zag Pattern"; }

  const targetRowSts = (repeats * repeatCycleSts) + shiftSts;

  const preset = POOLING_PRESETS[presetKey] || POOLING_PRESETS.sunset;
  const colors = preset.colors;

  const cycleColorArray = [];
  counts.forEach((cLen, cIdx) => {
    const col = colors[cIdx % colors.length] || "#f43f5e";
    for (let i = 0; i < cLen; i++) cycleColorArray.push(col);
  });

  const rows = 20;
  const cols = targetRowSts;
  const cellW = Math.max(6, Math.min(16, Math.floor(460 / cols)));
  const cellH = cellW;
  const svgW = cols * cellW;
  const svgH = rows * cellH;

  let rects = "";
  let stitchCounter = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const colIdx = stitchCounter % cycleColorArray.length;
      const color = cycleColorArray[colIdx];
      const x = c * cellW;
      const y = (rows - 1 - r) * cellH;
      rects += `<rect x="${x}" y="${y}" width="${cellW - 0.5}" height="${cellH - 0.5}" rx="1" fill="${color}"/>`;
      stitchCounter++;
    }
  }

  const svgGrid = `
    <div class="pool-grid-wrap">
      <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;margin-bottom:6px">
        Live Swatch Simulation (${cols} sts × ${rows} rows)
      </div>
      <svg class="pool-canvas" viewBox="0 0 ${svgW} ${svgH}" width="100%" style="max-height:220px;display:block;margin:0 auto">
        ${rects}
      </svg>
    </div>
  `;

  res.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--surface);border:1px solid var(--border);border-radius:8px;margin-bottom:12px;flex-wrap:wrap;gap:12px">
      <div>
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;font-weight:700">Calculated Stitch Count Per Row</div>
        <div style="font-size:26px;font-weight:900;color:var(--green);margin:2px 0">
          ${targetRowSts} <span style="font-size:14px;color:var(--muted);font-weight:600">stitches / row</span>
        </div>
        <div style="font-size:11px;color:var(--muted)">${repeats} repeats of ${repeatCycleSts}-st color cycle ${shiftSts >= 0 ? `+ ${shiftSts}` : shiftSts} shift</div>
      </div>
      <div>
        <span class="materials-group-badge" style="font-size:12px;padding:4px 10px">${effectName}</span>
      </div>
    </div>

    ${svgGrid}

    <div style="font-size:11px;color:var(--ink);background:var(--surface);padding:8px 12px;border:1px solid var(--border);border-radius:6px;margin:8px 0">
      💡 <strong>Planned Pooling Tip:</strong> Keep your crochet/knitting tension uniform so each color section uses exactly its planned number of stitches (${counts.join(" · ")} sts). If your diamonds start to drift vertically or widen, tighten or loosen your stitch tension slightly!
    </div>

    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px">
      <button type="button" class="button button-small button-outline" data-action="copy-pooling-notes">📋 Copy Pooling Pattern Notes</button>
    </div>
  `;
}

async function copyPoolingNotes() {
  const rowSts = $("#textiles-pool-result div:first-child div:first-child div:nth-child(2)")?.textContent.trim() || "";
  const shiftName = $("#textiles-pool-shift option:checked")?.textContent || "Argyle";
  const seq = $("#textiles-pool-stitch-seq")?.value || "";
  const text = `Yarn Planned Pooling Recipe:\n• Target Stitch Count: ${rowSts}\n• Pattern: ${shiftName}\n• Color Repeat Sequence: ${seq} stitches\nGenerated by Workbench Journal`;
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied Planned Pooling recipe to clipboard!");
  } catch {
    showToast("Recipe copied.");
  }
}

function exportStitchChartPng() {
  if (typeof stitchStudioState === "undefined" || !stitchStudioState.grid) {
    showToast("No pattern chart to export.");
    return;
  }
  const cols = stitchStudioState.cols || 16;
  const rows = stitchStudioState.rows || 16;
  const displayMode = stitchStudioState.displayMode || "pixel";
  const canvas = document.createElement("canvas");
  const cellSize = cols > 32 ? 18 : cols > 24 ? 22 : 28;
  const rulerSize = 24;
  canvas.width = cols * cellSize + rulerSize;
  canvas.height = rows * cellSize + rulerSize;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, canvas.width, rulerSize);
  ctx.fillRect(0, 0, rulerSize, canvas.height);

  ctx.font = "bold 9px monospace";
  ctx.fillStyle = "#64748b";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let c = 0; c < cols; c++) {
    ctx.fillText((c + 1).toString(), rulerSize + c * cellSize + cellSize / 2, rulerSize / 2);
  }
  for (let r = 0; r < rows; r++) {
    ctx.fillText((r + 1).toString(), rulerSize / 2, rulerSize + r * cellSize + cellSize / 2);
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const color = stitchStudioState.grid[idx] || "#ffffff";
      const x = rulerSize + c * cellSize;
      const y = rulerSize + r * cellSize;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, cellSize, cellSize);
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, cellSize, cellSize);

      if (color !== "#ffffff") {
        let sym = "";
        if (displayMode === "knit") sym = "∨";
        else if (displayMode === "cross") sym = "×";
        if (sym) {
          ctx.fillStyle = (color === "#ffffff" || color === "#f59e0b" || color === "#fbbf24") ? "#0f172a" : "#ffffff";
          ctx.font = `bold ${Math.round(cellSize * 0.55)}px sans-serif`;
          ctx.fillText(sym, x + cellSize / 2, y + cellSize / 2);
        }
      }
    }
  }

  const link = document.createElement("a");
  link.download = `workbench-stitch-pattern-${cols}x${rows}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
  showToast(`Downloaded chart image (${cols}×${rows})!`);
}

// --- 🎵 Music Studio: Piano Keyboard & Scale Explorer ---
const PIANO_NOTES_25 = [
  { note: "C3", midi: 48, isBlack: false },
  { note: "C#3", midi: 49, isBlack: true },
  { note: "D3", midi: 50, isBlack: false },
  { note: "D#3", midi: 51, isBlack: true },
  { note: "E3", midi: 52, isBlack: false },
  { note: "F3", midi: 53, isBlack: false },
  { note: "F#3", midi: 54, isBlack: true },
  { note: "G3", midi: 55, isBlack: false },
  { note: "G#3", midi: 56, isBlack: true },
  { note: "A3", midi: 57, isBlack: false },
  { note: "A#3", midi: 58, isBlack: true },
  { note: "B3", midi: 59, isBlack: false },
  { note: "C4", midi: 60, isBlack: false },
  { note: "C#4", midi: 61, isBlack: true },
  { note: "D4", midi: 62, isBlack: false },
  { note: "D#4", midi: 63, isBlack: true },
  { note: "E4", midi: 64, isBlack: false },
  { note: "F4", midi: 65, isBlack: false },
  { note: "F#4", midi: 66, isBlack: true },
  { note: "G4", midi: 67, isBlack: false },
  { note: "G#4", midi: 68, isBlack: true },
  { note: "A4", midi: 69, isBlack: false },
  { note: "A#4", midi: 70, isBlack: true },
  { note: "B4", midi: 71, isBlack: false },
  { note: "C5", midi: 72, isBlack: false }
];

function renderPianoKeyboardUI() {
  const wrap = $("#music-piano-keyboard");
  if (!wrap) return;

  wrap.innerHTML = PIANO_NOTES_25.map(k => {
    return '<div class="piano-key ' + (k.isBlack ? 'black-key' : 'white-key') + '" data-action="hit-piano-key" data-note="' + k.note + '" data-midi="' + k.midi + '" id="piano-key-' + k.midi + '">' + k.note.replace(/[0-9]/g, "") + '</div>';
  }).join("");

  if (!wrap.dataset.touchBound) {
    wrap.dataset.touchBound = "true";
    wrap.addEventListener("pointerdown", (e) => {
      const key = e.target.closest(".piano-key");
      if (!key) return;
      const note = key.dataset.note;
      const midi = parseInt(key.dataset.midi, 10);
      if (note && !isNaN(midi)) {
        key._lastPointerTime = Date.now();
        playPianoKeyNote(note, midi);
      }
    });
  }
}

function playPianoKeyNote(note, midi) {
  const ctx = getMusicAudioCtx();
  if (!ctx) return;
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const now = ctx.currentTime;
  const instrument = $("#music-main-instrument")?.value || localStorage.getItem("workbench_music_instrument") || "rhodes";

  const keyEl = $("#piano-key-" + midi);
  if (keyEl) {
    keyEl.classList.add("active");
    setTimeout(() => keyEl.classList.remove("active"), 350);
  }

  if (instrument === "rhodes") {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2400, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.85);

    const tine = ctx.createOscillator();
    const tineGain = ctx.createGain();
    tine.type = "sine";
    tine.frequency.setValueAtTime(freq * 3.5, now);
    tineGain.gain.setValueAtTime(0.0001, now);
    tineGain.gain.linearRampToValueAtTime(0.08, now + 0.01);
    tineGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    tine.connect(tineGain);
    tineGain.connect(ctx.destination);
    tine.start(now);
    tine.stop(now + 0.4);
  } else if (instrument === "pad") {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc1.type = "sawtooth";
    osc2.type = "sawtooth";
    osc1.frequency.setValueAtTime(freq * 0.997, now);
    osc2.frequency.setValueAtTime(freq * 1.003, now);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(380, now);
    filter.frequency.exponentialRampToValueAtTime(1400, now + 0.4);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.95);
    osc2.stop(now + 0.95);
  } else if (instrument === "chiptune") {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.75);
  } else if (instrument === "organ") {
    [1.0, 2.0, 3.0].forEach((mult, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq * mult, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.18 / (idx + 1), now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.85);
    });
  } else {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.85);
  }
}

function highlightPianoKeysForChord(chordName, duration = 1.0) {
  const intervalsMap = {
    "": [0, 4, 7], "m": [0, 3, 7], "maj7": [0, 4, 7, 11], "m7": [0, 3, 7, 10],
    "7": [0, 4, 7, 10], "dim": [0, 3, 6], "sus4": [0, 5, 7], "add9": [0, 4, 7, 14]
  };
  const rootOffsets = { "C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11 };
  let root = chordName.slice(0, 2);
  let type = chordName.slice(2);
  if (!rootOffsets[root]) {
    root = chordName.slice(0, 1);
    type = chordName.slice(1);
  }
  const rootOffset = rootOffsets[root] || 0;
  const intervals = intervalsMap[type] || [0, 4, 7];

  const chordMidis = [48 + rootOffset, ...intervals.map(semitone => {
    let m = 60 + rootOffset + semitone;
    while (m > 72) m -= 12;
    while (m < 48) m += 12;
    return m;
  })];

  chordMidis.forEach(midi => {
    const keyEl = $("#piano-key-" + midi);
    if (keyEl) {
      keyEl.classList.add("active");
      setTimeout(() => keyEl.classList.remove("active"), Math.min(duration * 1000, 1600));
    }
  });
}

// Note: MUSIC_SCALES_DB and SCALE_PRESETS are defined above in the Fretboard & Music Engine section.

function updateMusicScaleView() {
  const root = $("#music-scale-key")?.value || "C";
  const modeKey = $("#music-scale-mode")?.value || "ionian";
  const scale = MUSIC_SCALES_DB[modeKey] || MUSIC_SCALES_DB.ionian;
  const res = $("#music-scale-result");
  if (!res) return;

  const notesList = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const rootIdx = notesList.indexOf(root);
  const scaleNotes = scale.intervals.map(semi => notesList[(rootIdx + semi) % 12]);

  res.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
    '<span style="font-size:11px;font-weight:700;color:var(--muted)">' + root + ' ' + scale.name.toUpperCase() + ':</span>' +
    '<strong style="font-size:16px;color:var(--green)">' + scaleNotes.join(" – ") + '</strong>' +
  '</div>' +
  '<div style="font-size:12px;color:var(--ink);line-height:1.4">' +
    '• <strong>Step Formula:</strong> ' + scale.formula + '<br>' +
    '• <strong>Aesthetic Mood:</strong> ' + scale.mood + '<br>' +
    '• <strong>Diatonic Harmony Triads:</strong> ' + scale.chords +
  '</div>';
}

// --- ⚡ Electronics Studio: 5-Band Mode, Voltage Divider, Capacitor, AWG ---
let resistorBandMode = "4";

function setResistorBandMode(mode) {
  resistorBandMode = mode;
  $("#res-mode-4-btn")?.classList.toggle("button-primary", mode === "4");
  $("#res-mode-4-btn")?.classList.toggle("button-outline", mode !== "4");
  $("#res-mode-5-btn")?.classList.toggle("button-primary", mode === "5");
  $("#res-mode-5-btn")?.classList.toggle("button-outline", mode !== "5");
  const band3Wrap = $("#elec-res-band3-wrap");
  if (band3Wrap) band3Wrap.style.display = mode === "5" ? "block" : "none";
  const stripe3 = $("#res-band-3digit-vis");
  if (stripe3) stripe3.style.display = mode === "5" ? "block" : "none";
  if (mode === "5") {
    const tolSelect = $("#elec-res-tol");
    if (tolSelect && tolSelect.value === "5") tolSelect.value = "1";
  }
  updateResistorColorView();
  showToast(mode === "5" ? "Switched to 5-Band Precision (1%) mode" : "Switched to 4-Band Standard (5%) mode");
}

function updateVoltageDividerCalc() {
  const vinInput = $("#elec-div-vin");
  const r1Input = $("#elec-div-r1");
  const r2Input = $("#elec-div-r2");
  const vin = parseFloat(vinInput?.value ?? "5") || 0;
  const r1 = parseFloat(r1Input?.value ?? "10000") || 0;
  const r2 = parseFloat(r2Input?.value ?? "10000") || 0;
  const res = $("#elec-div-result");
  if (!res) return;

  if (r1 <= 0 || r2 <= 0 || (r1 + r2) <= 0) {
    res.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:6px 0;">Please enter positive resistor values (R1 &gt; 0 Ω and R2 &gt; 0 Ω).</div>';
    return;
  }

  const vout = vin * (r2 / (r1 + r2));
  const currentMa = (vin / (r1 + r2)) * 1000;
  const p1Mw = (Math.pow(vin - vout, 2) / r1) * 1000;
  const p2Mw = (Math.pow(vout, 2) / r2) * 1000;
  const zOut = (r1 * r2) / (r1 + r2);

  res.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
    '<span style="font-size:11px;font-weight:700;color:var(--muted)">OUTPUT VOUT:</span>' +
    '<strong style="font-size:20px;color:var(--green)">' + vout.toFixed(2) + ' V</strong>' +
  '</div>' +
  '<div style="font-size:12px;color:var(--ink);line-height:1.4">' +
    '• Quiescent Current: <strong>' + (currentMa < 1 ? (currentMa * 1000).toFixed(1) + " µA" : currentMa.toFixed(2) + " mA") + '</strong><br>' +
    '• Dissipation: R1 = ' + p1Mw.toFixed(1) + ' mW · R2 = ' + p2Mw.toFixed(1) + ' mW<br>' +
    '• Thevenin Output Impedance: <strong>' + zOut.toFixed(0) + ' Ω</strong>' +
  '</div>';
}

function setVoltageDividerPreset(preset) {
  const vinInput = $("#elec-div-vin");
  const r1Input = $("#elec-div-r1");
  const r2Input = $("#elec-div-r2");
  if (!vinInput || !r1Input || !r2Input) return;

  if (preset === "5to33") {
    vinInput.value = 5;
    r1Input.value = 1700;
    r2Input.value = 3300;
  } else if (preset === "12to5") {
    vinInput.value = 12;
    r1Input.value = 14000;
    r2Input.value = 10000;
  } else if (preset === "half") {
    vinInput.value = 5;
    r1Input.value = 10000;
    r2Input.value = 10000;
  }
  updateVoltageDividerCalc();
}

function updateCapacitorCodeView() {
  const codeStr = $("#elec-cap-code")?.value.trim() || "104";
  const res = $("#elec-cap-result");
  if (!res) return;

  if (codeStr.length < 3 || isNaN(parseInt(codeStr, 10))) {
    res.innerHTML = '<span style="font-size:12px;color:var(--muted)">Enter a 3-digit EIA capacitor code (e.g. 104, 473).</span>';
    return;
  }

  const digits = parseInt(codeStr.slice(0, 2), 10);
  const mult = parseInt(codeStr.slice(2, 3), 10);
  const pf = digits * Math.pow(10, mult);
  const nf = pf / 1000;
  const uf = pf / 1000000;

  res.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
    '<span style="font-size:11px;font-weight:700;color:var(--muted)">CAPACITANCE:</span>' +
    '<strong style="font-size:18px;color:#0284c7">' + (uf >= 1 ? uf.toFixed(2) + " µF" : nf >= 1 ? nf.toFixed(1) + " nF" : pf + " pF") + '</strong>' +
  '</div>' +
  '<div style="font-size:12px;color:var(--ink);line-height:1.4">' +
    '• <strong>Microfarads (µF):</strong> ' + uf + ' µF<br>' +
    '• <strong>Nanofarads (nF):</strong> ' + nf + ' nF<br>' +
    '• <strong>Picofarads (pF):</strong> ' + pf.toLocaleString() + ' pF<br>' +
    '• Typical application: ' + (codeStr === "104" ? "High frequency IC decoupling / bypass (0.1 µF)" : "Audio filtering or RC timing") +
  '</div>';
}

const WIRE_AWG_DB = {
  "12": { diaMm: 2.05, resOhmsPer1000Ft: 1.588, chassisA: 20 },
  "14": { diaMm: 1.63, resOhmsPer1000Ft: 2.525, chassisA: 15 },
  "18": { diaMm: 1.02, resOhmsPer1000Ft: 6.385, chassisA: 7 },
  "22": { diaMm: 0.64, resOhmsPer1000Ft: 16.14, chassisA: 5 },
  "24": { diaMm: 0.51, resOhmsPer1000Ft: 25.67, chassisA: 3.5 },
  "28": { diaMm: 0.32, resOhmsPer1000Ft: 64.9, chassisA: 1.4 },
  "30": { diaMm: 0.25, resOhmsPer1000Ft: 103.2, chassisA: 0.8 }
};

function updateWireAwgView() {
  const awg = $("#elec-wire-awg")?.value || "22";
  const data = WIRE_AWG_DB[awg] || WIRE_AWG_DB["22"];
  const res = $("#elec-wire-result");
  if (!res) return;

  const distFt = parseFloat($("#elec-wire-dist")?.value) || 20;
  const volts = parseFloat($("#elec-wire-volts")?.value) || 12;
  const amps = parseFloat($("#elec-wire-amps")?.value) || 3;

  const loopFt = distFt * 2;
  const loopResOhms = (data.resOhmsPer1000Ft / 1000) * loopFt;
  const vDrop = amps * loopResOhms;
  const pctDrop = volts > 0 ? (vDrop / volts) * 100 : 0;
  const vLoad = Math.max(0, volts - vDrop);
  const powerLossW = Math.pow(amps, 2) * loopResOhms;
  const isOverAmp = amps > data.chassisA;

  res.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <span style="font-size:11px;font-weight:700;color:var(--muted)">VOLTAGE DROP (${distFt} FT RUN):</span>
      <strong style="font-size:18px;color:${pctDrop > 5 ? '#ef4444' : 'var(--green)'}">${vDrop.toFixed(2)} V (${pctDrop.toFixed(1)}% loss)</strong>
    </div>
    <div style="font-size:12px;color:var(--ink);line-height:1.4">
      • <strong>Voltage at Load:</strong> ${vLoad.toFixed(2)} V (from ${volts}V source)<br>
      • <strong>Two-Way Loop Resistance:</strong> ${loopResOhms.toFixed(3)} Ω (${loopFt} ft total round-trip)<br>
      • <strong>Wire Heat Dissipation:</strong> ${powerLossW.toFixed(2)} W<br>
      • <strong>Max Chassis Ampacity:</strong> <span style="color:${isOverAmp ? '#ef4444' : 'var(--green)'};font-weight:700">${data.chassisA} A</span>
      ${isOverAmp ? '<br><strong style="color:#ef4444;font-size:11px">⚠️ WARNING: Current exceeds maximum rated chassis ampacity for ' + awg + ' AWG!</strong>' : ''}
    </div>
  `;
}

// --- ⏱️ NE555 Astable Timer Engine ---
function update555TimerCalc() {
  const r1K = parseFloat($("#elec-555-r1")?.value) || 10;
  const r2K = parseFloat($("#elec-555-r2")?.value) || 47;
  const cUf = parseFloat($("#elec-555-c")?.value) || 10;
  const res = $("#elec-555-result");
  if (!res) return;

  const r1 = r1K * 1000;
  const r2 = r2K * 1000;
  const c = cUf * 1e-6;

  if (r1 <= 0 || r2 <= 0 || c <= 0) {
    res.innerHTML = '<span style="font-size:12px;color:var(--muted)">Enter valid positive numbers for R1, R2, and C.</span>';
    return;
  }

  const tHigh = 0.693 * (r1 + r2) * c;
  const tLow = 0.693 * r2 * c;
  const period = tHigh + tLow;
  const freq = 1 / period;
  const dutyPct = (tHigh / period) * 100;

  function fmtTime(s) {
    if (s >= 1) return s.toFixed(3) + " s";
    if (s >= 0.001) return (s * 1000).toFixed(2) + " ms";
    return (s * 1000000).toFixed(1) + " µs";
  }

  function fmtFreq(hz) {
    if (hz >= 1000000) return (hz / 1000000).toFixed(3) + " MHz";
    if (hz >= 1000) return (hz / 1000).toFixed(2) + " kHz";
    return hz.toFixed(2) + " Hz";
  }

  res.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <span style="font-size:11px;font-weight:700;color:var(--muted)">OSCILLATION FREQUENCY:</span>
      <strong style="font-size:18px;color:var(--green)">${fmtFreq(freq)}</strong>
    </div>
    <div style="font-size:12px;color:var(--ink);line-height:1.4">
      • <strong>Cycle Period (T):</strong> ${fmtTime(period)}<br>
      • <strong>Output High Time (T<sub>high</sub>):</strong> ${fmtTime(tHigh)} (${dutyPct.toFixed(1)}%)<br>
      • <strong>Output Low Time (T<sub>low</sub>):</strong> ${fmtTime(tLow)} (${(100 - dutyPct).toFixed(1)}%)
    </div>
    <div class="duty-cycle-visualizer">
      <div class="duty-high-bar" style="width:${dutyPct.toFixed(1)}%">HIGH ${dutyPct.toFixed(0)}%</div>
      <div class="duty-low-bar" style="width:${(100 - dutyPct).toFixed(1)}%">LOW ${(100 - dutyPct).toFixed(0)}%</div>
    </div>
  `;
}

function updatePassiveFilterCalc() {
  const type = $("#elec-filter-type")?.value || "lowpass";
  const rK = parseFloat($("#elec-filter-r")?.value);
  const cN = parseFloat($("#elec-filter-c")?.value);
  const res = $("#elec-filter-result");
  if (!res) return;

  if (isNaN(rK) || isNaN(cN) || rK <= 0 || cN <= 0) {
    res.innerHTML = '<span style="font-size:12px;color:var(--muted)">Enter valid positive numbers for R (kΩ) and C (nF).</span>';
    return;
  }

  const rOhms = rK * 1000;
  const cFarads = cN * 1e-9;
  const cutoffHz = 1 / (2 * Math.PI * rOhms * cFarads);
  const timeConstSec = rOhms * cFarads;

  function fmtFilterFreq(hz) {
    if (hz >= 1000000) return (hz / 1000000).toFixed(3) + " MHz";
    if (hz >= 1000) return (hz / 1000).toFixed(2) + " kHz";
    return hz.toFixed(1) + " Hz";
  }
  function fmtFilterTime(s) {
    if (s >= 1) return s.toFixed(3) + " s";
    if (s >= 0.001) return (s * 1000).toFixed(2) + " ms";
    return (s * 1000000).toFixed(1) + " µs";
  }

  const refFreqs = [
    { label: "60 Hz AC Hum", f: 60 },
    { label: "490 Hz Arduino PWM", f: 490 },
    { label: "1.0 kHz Audio Tone", f: 1000 },
    { label: "10 kHz Treble", f: 10000 }
  ];
  const attenuationList = refFreqs.map(item => {
    const gainFrac = type === "lowpass"
      ? 1 / Math.sqrt(1 + Math.pow(item.f / cutoffHz, 2))
      : (item.f / cutoffHz) / Math.sqrt(1 + Math.pow(item.f / cutoffHz, 2));
    const db = 20 * Math.log10(gainFrac);
    return `<span style="background:var(--surface);border:1px solid var(--border);border-radius:4px;padding:3px 6px;font-size:10.5px">
      ${item.label}: <strong style="color:${db > -3 ? 'var(--green)' : '#ef4444'}">${db.toFixed(1)} dB</strong> (${(gainFrac * 100).toFixed(0)}%)
    </span>`;
  }).join(" ");

  res.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <span style="font-size:11px;font-weight:700;color:var(--muted)">-3dB CUTOFF FREQUENCY (f<sub>c</sub>):</span>
      <strong style="font-size:18px;color:var(--green)">${fmtFilterFreq(cutoffHz)}</strong>
    </div>
    <div style="font-size:12px;color:var(--ink);line-height:1.45">
      • <strong>Time Constant (τ = R·C):</strong> ${fmtFilterTime(timeConstSec)}<br>
      • <strong>Rise Time (10% to 90%):</strong> ${fmtFilterTime(2.2 * timeConstSec)}<br>
      • <strong>Filter Action:</strong> ${type === "lowpass" ? "Passes frequencies below " + fmtFilterFreq(cutoffHz) + "; rolls off high frequencies at -20 dB/decade (-6 dB/octave)." : "Blocks DC offset and frequencies below " + fmtFilterFreq(cutoffHz) + "; passes higher frequencies."}<br>
      <div style="margin-top:8px">
        <strong style="font-size:11px;color:var(--muted)">ATTENUATION AT REFERENCE FREQUENCIES:</strong>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">
          ${attenuationList}
        </div>
      </div>
    </div>
  `;
}

// --- ⚡ Sensor & Module I2C Bus Address Guide & Conflict Checker ---
const I2C_SENSORS_DB = {
  bme280: {
    name: "BME280 / BMP280",
    function: "Barometric Pressure, Altitude, Ambient Temperature & Humidity",
    defaultAddr: "0x76",
    altAddr: "0x77 (SDO -> VCC)",
    voltage: "3.3V (Logic level shifter required for 5V Arduino Uno)",
    pins: ["VCC", "GND", "SCL", "SDA", "SDO/ADDR", "CSB"],
    speed: "Standard 100 kHz / Fast 400 kHz",
    notes: "BMP280 measures pressure & temp; BME280 adds relative humidity. High accuracy for weather stations & altimeters."
  },
  mpu6050: {
    name: "MPU6050",
    function: "6-Axis MotionTracking (3-Axis Gyroscope + 3-Axis Accelerometer + DMP)",
    defaultAddr: "0x68",
    altAddr: "0x69 (Pull AD0 pin HIGH to 3.3V)",
    voltage: "3.3V - 5V (Onboard regulator on GY-521; I2C bus is 3.3V logic)",
    pins: ["VCC", "GND", "SCL", "SDA", "XDA", "XCL", "AD0", "INT"],
    speed: "Up to 400 kHz Fast Mode",
    notes: "Shares address 0x68 with DS3231 RTC. Tie AD0 to 3.3V to change MPU6050 address to 0x69."
  },
  ssd1306: {
    name: "SSD1306 OLED Display (128x64)",
    function: "Monochrome Graphics & Text Display",
    defaultAddr: "0x3C",
    altAddr: "0x3D (Resolder 0-ohm jumper on PCB)",
    voltage: "3.3V - 5V (Includes onboard charge pump)",
    pins: ["VCC", "GND", "SCL", "SDA"],
    speed: "Up to 400 kHz (Supports 1 MHz on fast MCUs)",
    notes: "Draws ~25mA when all pixels lit. Compatible with Adafruit_SSD1306 and U8g2 libraries."
  },
  bme680: {
    name: "BME680 Environmental Sensor",
    function: "Gas (VOC / IAQ), Pressure, Temperature & Humidity",
    defaultAddr: "0x77",
    altAddr: "0x76 (SDO -> GND)",
    voltage: "3.3V (Strict 1.71V - 3.6V range; do not apply 5V)",
    pins: ["VCC", "GND", "SCL", "SDA", "SDO", "CS"],
    speed: "Up to 3.4 MHz High-Speed Mode",
    notes: "Internal metal-oxide plate for VOC sensing. Requires Bosch BSEC library for calculated Indoor Air Quality (IAQ) index."
  },
  vl53l0x: {
    name: "VL53L0X Time-of-Flight (ToF)",
    function: "Laser Distance Measuring (Up to 2 meters / 6.5 ft)",
    defaultAddr: "0x29",
    altAddr: "Software programmable via XSHUT pin",
    voltage: "2.8V internal core; module breakout boards include 5V level shifter",
    pins: ["VCC", "GND", "SCL", "SDA", "XSHUT", "GPIO1"],
    speed: "Up to 400 kHz Fast Mode",
    notes: "Conflicts with TCS34725 color sensor (both 0x29). To use multiple ToF sensors, hold XSHUT LOW and initialize sequentially."
  },
  ina219: {
    name: "INA219 High-Side Current & Power",
    function: "Measures 0-26V DC up to ±3.2A with 0.8mA resolution",
    defaultAddr: "0x40",
    altAddr: "0x40 - 0x45 (Jumpers A0 & A1)",
    voltage: "3.0V - 5.5V Supply",
    pins: ["VCC", "GND", "SCL", "SDA", "Vin+", "Vin-"],
    speed: "Up to 2.56 MHz High-Speed Mode",
    notes: "Measures across precision 0.1Ω 1% shunt resistor. Ideal for battery discharge and solar charge logging."
  },
  ads1115: {
    name: "ADS1115 16-Bit 4-Channel ADC",
    function: "Ultra-High Resolution Analog-to-Digital Converter with PGA",
    defaultAddr: "0x48",
    altAddr: "0x48 (GND), 0x49 (VDD), 0x4A (SDA), 0x4B (SCL)",
    voltage: "2.0V - 5.5V",
    pins: ["VDD", "GND", "SCL", "SDA", "ADDR", "ALRT", "A0", "A1", "A2", "A3"],
    speed: "Up to 3.4 MHz",
    notes: "Offers 860 samples/sec with programmable gain amplifier up to 16x. Up to 4 chips can run on one I2C bus."
  },
  ds3231: {
    name: "DS3231 Precision RTC",
    function: "Extremely Accurate I2C Real-Time Clock with TCXO & crystal",
    defaultAddr: "0x68",
    altAddr: "Fixed 0x68 (EEPROM on board is 0x57)",
    voltage: "2.3V - 5.5V (CR2032 coin cell backup)",
    pins: ["VCC", "GND", "SCL", "SDA", "SQW", "32K"],
    speed: "Standard 100 kHz & Fast 400 kHz",
    notes: "Drifts less than 1 minute per year. Avoid MPU6050 address collision by shifting MPU6050 to 0x69."
  },
  tcs34725: {
    name: "TCS34725 RGB Color Sensor",
    function: "RGB and Clear Light Sensing with IR Blocking Filter",
    defaultAddr: "0x29",
    altAddr: "Fixed 0x29",
    voltage: "3.3V (Board regulator handles 3.3V - 5V)",
    pins: ["VIN", "GND", "SCL", "SDA", "INT", "LED"],
    speed: "Up to 400 kHz",
    notes: "Features 3,800,000:1 dynamic range. Tie LED pin LOW to extinguish bright white illumination LED."
  },
  apds9960: {
    name: "APDS9960 Gesture & Proximity",
    function: "Directional Gesture (Up/Down/Left/Right), Color, Light & Proximity",
    defaultAddr: "0x39",
    altAddr: "Fixed 0x39",
    voltage: "3.3V (Not 5V tolerant! Use 3.3V supply and logic level shifter)",
    pins: ["VL", "VCC", "GND", "SDA", "SCL", "INT"],
    speed: "Up to 400 kHz",
    notes: "Integrated IR LED emitter enables contactless hand gesture detection up to 10-20 cm."
  },
  max30102: {
    name: "MAX30102 Pulse Oximeter",
    function: "SpO2 Blood Oxygen & Photoplethysmography (PPG) Heart Rate",
    defaultAddr: "0x57",
    altAddr: "Fixed 0x57",
    voltage: "1.8V core, 3.3V - 5V module input with dual LDOs",
    pins: ["VIN", "GND", "SCL", "SDA", "INT", "RD", "IRD"],
    speed: "Up to 400 kHz",
    notes: "Emits Red (660nm) and Infrared (880nm) light to calculate oxygenated hemoglobin ratio in capillary blood."
  },
  sht31: {
    name: "SHT31-D Digital Humidity & Temp",
    function: "±2% Relative Humidity and ±0.3°C Temperature Sensor",
    defaultAddr: "0x44",
    altAddr: "0x45 (ADR -> VDD)",
    voltage: "2.4V - 5.5V Wide voltage supply",
    pins: ["VIN", "GND", "SCL", "SDA", "ALR", "ADR"],
    speed: "Up to 1.0 MHz Fast Mode Plus",
    notes: "True I2C interface with multiple measurement modes and internal heater for de-fogging condensation."
  },
  mcp23017: {
    name: "MCP23017 16-Bit I/O Expander",
    function: "Adds 16 GPIO pins over I2C (Two 8-bit ports GPA & GPB)",
    defaultAddr: "0x20",
    altAddr: "0x20 - 0x27 (Pins A0, A1, A2)",
    voltage: "1.8V - 5.5V",
    pins: ["VDD", "VSS", "SCL", "SDA", "A0", "A1", "A2", "RESET", "INTA", "INTB", "GPA0-7", "GPB0-7"],
    speed: "100 kHz, 400 kHz, 1.7 MHz",
    notes: "Run up to 8 chips on one I2C bus to expand an Arduino or Raspberry Pi by 128 digital I/O pins."
  },
  pca9685: {
    name: "PCA9685 16-Channel 12-Bit PWM",
    function: "Drives 16 Servos or LEDs with free-running clock",
    defaultAddr: "0x40",
    altAddr: "0x40 - 0x7F (Solder pads A0-A5)",
    voltage: "3.3V - 5V Logic, separate V+ servo terminal up to 6V",
    pins: ["VCC", "GND", "SCL", "SDA", "OE", "V+"],
    speed: "Up to 1 MHz Fast Mode Plus",
    notes: "Completely offloads servo pulse timing from the microcontroller. Up to 62 boards can be chained."
  },
  aht20: {
    name: "AHT20 Digital Temp & Humidity",
    function: "Next-Generation MEMS Temperature & Humidity",
    defaultAddr: "0x38",
    altAddr: "Fixed 0x38",
    voltage: "2.0V - 5.5V",
    pins: ["VIN", "GND", "SCL", "SDA"],
    speed: "Standard 100 kHz & Fast 400 kHz",
    notes: "Calibrated digital output; significantly faster response and stability compared to older DHT11/DHT22."
  }
};

function updateI2cSensorGuide() {
  const s1Key = $("#elec-sensor-primary")?.value || "bme280";
  const s2Key = $("#elec-sensor-secondary")?.value || "none";
  const res = $("#elec-sensor-result");
  if (!res) return;

  const s1 = I2C_SENSORS_DB[s1Key] || I2C_SENSORS_DB.bme280;
  const s2 = (s2Key !== "none" && I2C_SENSORS_DB[s2Key]) ? I2C_SENSORS_DB[s2Key] : null;

  let conflictHtml = "";
  if (s2) {
    const isConflict = s1.defaultAddr.toLowerCase() === s2.defaultAddr.toLowerCase();
    if (isConflict) {
      conflictHtml = `
        <div style="background:rgba(239,68,68,0.12);border:1px solid #ef4444;border-radius:6px;padding:8px 12px;margin-bottom:10px;color:#dc2626;font-size:12px">
          <strong>⚠️ I2C BUS ADDRESS CONFLICT DETECTED!</strong><br>
          Both <strong>${s1.name}</strong> and <strong>${s2.name}</strong> share the default 7-bit address <code>${s1.defaultAddr}</code>.<br>
          <span style="font-size:11px;color:var(--ink);margin-top:4px;display:block">
            🔧 <strong>Hardware Solution:</strong> ${s1.altAddr !== "Fixed " + s1.defaultAddr ? `Change ${s1.name} address to <strong>${s1.altAddr}</strong>` : `Change ${s2.name} address to <strong>${s2.altAddr}</strong>`} or use an I2C Multiplexer (TCA9548A).
          </span>
        </div>
      `;
    } else {
      conflictHtml = `
        <div style="background:rgba(34,197,94,0.12);border:1px solid var(--green);border-radius:6px;padding:8px 12px;margin-bottom:10px;color:var(--green);font-size:12px">
          <strong>✅ Compatible on Same I2C Bus!</strong><br>
          ${s1.name} (<code>${s1.defaultAddr}</code>) and ${s2.name} (<code>${s2.defaultAddr}</code>) use distinct addresses and can share SDA/SCL lines freely.
        </div>
      `;
    }
  }

  const pinChips = s1.pins.map(p => {
    const pLow = p.toLowerCase();
    let cls = "sensor-pin-chip";
    if (pLow.includes("vcc") || pLow.includes("vdd") || pLow.includes("vin")) cls += " vcc";
    else if (pLow.includes("gnd") || pLow.includes("vss")) cls += " gnd";
    else if (pLow.includes("sda")) cls += " sda";
    else if (pLow.includes("scl")) cls += " scl";
    return `<span class="${cls}">${p}</span>`;
  }).join(" ");

  res.innerHTML = `
    ${conflictHtml}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:8px">
      <div>
        <strong style="font-size:15px;color:var(--ink)">${s1.name}</strong>
        <span style="font-size:11px;color:var(--muted);margin-left:6px">${s1.function}</span>
      </div>
      <div style="display:flex;gap:6px;align-items:center">
        <span style="background:var(--surface);border:1px solid var(--border);border-radius:4px;padding:3px 8px;font-family:monospace;font-size:12px;font-weight:800;color:var(--green)">
          ADDR: ${s1.defaultAddr}
        </span>
      </div>
    </div>
    <div style="font-size:12px;color:var(--ink);line-height:1.45">
      • <strong>Alternate Address:</strong> ${s1.altAddr}<br>
      • <strong>Supply &amp; Logic Level:</strong> ${s1.voltage}<br>
      • <strong>Max Bus Speed:</strong> ${s1.speed}<br>
      • <strong>Integration &amp; Quirks:</strong> ${s1.notes}<br>
      <div style="margin-top:8px">
        <strong style="font-size:11px;color:var(--muted)">HEADER PINOUT:</strong>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">
          ${pinChips}
        </div>
      </div>
    </div>
    <div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
      <button type="button" class="button button-small button-outline" data-action="copy-i2c-scanner" title="Copy Arduino C++ I2C Bus Scanner Sketch">📋 Copy Arduino I2C Scanner</button>
      <button type="button" class="button button-small button-outline" data-action="save-sensor-to-materials" title="Add this sensor to your project materials">➕ Add Sensor to Materials</button>
    </div>
  `;
}

async function copyI2cScannerSketch() {
  const code = `#include <Wire.h>

void setup() {
  Wire.begin();
  Serial.begin(115200);
  while (!Serial);
  Serial.println("\\n--- Arduino I2C Bus Scanner ---");
}

void loop() {
  byte error, address;
  int nDevices = 0;
  Serial.println("Scanning I2C bus...");
  for (address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    error = Wire.endTransmission();
    if (error == 0) {
      Serial.print("  [+] I2C device found at address 0x");
      if (address < 16) Serial.print("0");
      Serial.print(address, HEX);
      Serial.println(" !");
      nDevices++;
    }
  }
  if (nDevices == 0) Serial.println("  [-] No I2C devices found. Check wiring & pull-ups.");
  delay(5000);
}`;

  try {
    await navigator.clipboard.writeText(code);
    showToast("Copied Arduino I2C Scanner code to clipboard!");
  } catch {
    showToast("I2C Scanner ready.");
  }
}

async function saveSensorToProjectMaterials() {
  const s1Key = $("#elec-sensor-primary")?.value || "bme280";
  const s1 = I2C_SENSORS_DB[s1Key] || I2C_SENSORS_DB.bme280;
  await addMaterialToProjectShopping(`${s1.name} Sensor Module`, "1 unit", 0, "Sensors & Modules");
}

// --- 🔬 Electronics Studio: SMD Component Code & Package Decoder ---
const EIA96_VALUE_TABLE = {
  "01": 100, "02": 102, "03": 105, "04": 107, "05": 110, "06": 113, "07": 115, "08": 118,
  "09": 121, "10": 124, "11": 127, "12": 130, "13": 133, "14": 137, "15": 140, "16": 143,
  "17": 147, "18": 150, "19": 154, "20": 158, "21": 162, "22": 165, "23": 169, "24": 174,
  "25": 178, "26": 182, "27": 187, "28": 191, "29": 196, "30": 200, "31": 205, "32": 210,
  "33": 215, "34": 221, "35": 226, "36": 232, "37": 237, "38": 243, "39": 249, "40": 255,
  "41": 261, "42": 267, "43": 274, "44": 280, "45": 287, "46": 294, "47": 301, "48": 309,
  "49": 316, "50": 324, "51": 332, "52": 340, "53": 348, "54": 357, "55": 365, "56": 374,
  "57": 383, "58": 392, "59": 402, "60": 412, "61": 422, "62": 432, "63": 442, "64": 453,
  "65": 464, "66": 475, "67": 487, "68": 499, "69": 511, "70": 523, "71": 536, "72": 549,
  "73": 562, "74": 576, "75": 590, "76": 604, "77": 619, "78": 634, "79": 649, "80": 665,
  "81": 681, "82": 698, "83": 715, "84": 732, "85": 750, "86": 768, "87": 787, "88": 806,
  "89": 825, "90": 845, "91": 866, "92": 887, "93": 909, "94": 931, "95": 953, "96": 976
};

const EIA96_MULT_TABLE = {
  Z: 0.001, Y: 0.01, X: 0.1, A: 1, B: 10, C: 100, D: 1000, E: 10000, F: 100000
};

const SMD_PACKAGES_DB = {
  "0805": { metric: "2012 Metric", dims: "2.0 × 1.25 mm (0.08 × 0.05 in)", power: "1/8 W (0.125W)", solder: "Comfortable DIY Hand-Soldering (Staple for breadboard breakouts)" },
  "0603": { metric: "1608 Metric", dims: "1.6 × 0.8 mm (0.06 × 0.03 in)", power: "1/10 W (0.100W)", solder: "Moderate (Standard modern surface mount maker projects)" },
  "1206": { metric: "3216 Metric", dims: "3.2 × 1.6 mm (0.12 × 0.06 in)", power: "1/4 W (0.250W)", solder: "Very Easy Hand-Soldering (Generous solder fillets)" },
  "0402": { metric: "1005 Metric", dims: "1.0 × 0.5 mm (0.04 × 0.02 in)", power: "1/16 W (0.063W)", solder: "Difficult (Requires fine tweezers, microscope, and flux)" },
  "1210": { metric: "3225 Metric", dims: "3.2 × 2.5 mm (0.12 × 0.10 in)", power: "1/2 W (0.500W)", solder: "Easy (High current filtering and motor drive)" },
  "2512": { metric: "6432 Metric", dims: "6.4 × 3.2 mm (0.25 × 0.12 in)", power: "1 W (1.000W)", solder: "Very Easy (Large current-sense shunt resistors)" }
};

function formatResistanceOhms(ohms) {
  if (ohms >= 1e6) return `${(ohms / 1e6).toFixed(2).replace(/\.00$/, "")} MΩ`;
  if (ohms >= 1e3) return `${(ohms / 1e3).toFixed(2).replace(/\.00$/, "")} kΩ`;
  return `${ohms.toFixed(2).replace(/\.00$/, "")} Ω`;
}

function updateSmdDecoder() {
  const mode = $("#elec-smd-mode")?.value || "res_3digit";
  const rawCode = ($("#elec-smd-code")?.value || "").trim().toUpperCase();
  const pkgKey = $("#elec-smd-package")?.value || "0805";
  const pkg = SMD_PACKAGES_DB[pkgKey] || SMD_PACKAGES_DB["0805"];
  const res = $("#elec-smd-result");
  if (!res) return;

  let valueDisplay = "—";
  let tolDisplay = "±5%";
  let formulaDisplay = "";
  let isValid = false;

  if (mode === "res_3digit") {
    tolDisplay = "±5% (Standard EIA)";
    if (/^[0-9]R[0-9]$/.test(rawCode)) {
      const val = parseFloat(rawCode.replace("R", "."));
      valueDisplay = `${val} Ω`;
      formulaDisplay = `${rawCode} → 'R' denotes decimal point → ${val} Ω`;
      isValid = true;
    } else if (/^R[0-9]{2}$/.test(rawCode)) {
      const val = parseFloat("0." + rawCode.substring(1));
      valueDisplay = `${val} Ω`;
      formulaDisplay = `${rawCode} → 0.${rawCode.substring(1)} Ω`;
      isValid = true;
    } else if (/^[0-9]{3}$/.test(rawCode)) {
      const base = parseInt(rawCode.substring(0, 2), 10);
      const mult = parseInt(rawCode.charAt(2), 10);
      const ohms = base * Math.pow(10, mult);
      valueDisplay = formatResistanceOhms(ohms);
      formulaDisplay = `${base} × 10^${mult} = ${ohms.toLocaleString()} Ω`;
      isValid = true;
    }
  } else if (mode === "res_4digit") {
    tolDisplay = "±1% (Precision EIA)";
    if (/^[0-9]{1,2}R[0-9]{1,2}$/.test(rawCode)) {
      const val = parseFloat(rawCode.replace("R", "."));
      valueDisplay = `${val} Ω`;
      formulaDisplay = `${rawCode} → decimal point 'R' → ${val} Ω`;
      isValid = true;
    } else if (/^[0-9]{4}$/.test(rawCode)) {
      const base = parseInt(rawCode.substring(0, 3), 10);
      const mult = parseInt(rawCode.charAt(3), 10);
      const ohms = base * Math.pow(10, mult);
      valueDisplay = formatResistanceOhms(ohms);
      formulaDisplay = `${base} × 10^${mult} = ${ohms.toLocaleString()} Ω`;
      isValid = true;
    }
  } else if (mode === "res_eia96") {
    tolDisplay = "±1% (EIA-96 Precision)";
    if (/^[0-9]{2}[A-Z]$/.test(rawCode)) {
      const numCode = rawCode.substring(0, 2);
      const letter = rawCode.charAt(2);
      const baseVal = EIA96_VALUE_TABLE[numCode];
      const mult = EIA96_MULT_TABLE[letter];
      if (baseVal && mult !== undefined) {
        const ohms = baseVal * mult;
        valueDisplay = formatResistanceOhms(ohms);
        formulaDisplay = `Code '${numCode}' (${baseVal}) × Mult '${letter}' (${mult}) = ${ohms.toLocaleString()} Ω`;
        isValid = true;
      }
    }
  } else if (mode === "cap_3digit") {
    tolDisplay = "±10% (Ceramic MLCC)";
    if (/^[0-9]{3}$/.test(rawCode)) {
      const base = parseInt(rawCode.substring(0, 2), 10);
      const mult = parseInt(rawCode.charAt(2), 10);
      const pf = base * Math.pow(10, mult);
      const nf = pf / 1000;
      const uf = nf / 1000;
      if (uf >= 1) {
        valueDisplay = `${uf.toFixed(2).replace(/\.00$/, "")} µF (${nf.toLocaleString()} nF)`;
      } else if (nf >= 1) {
        valueDisplay = `${nf.toFixed(2).replace(/\.00$/, "")} nF (${pf.toLocaleString()} pF)`;
      } else {
        valueDisplay = `${pf} pF`;
      }
      formulaDisplay = `${base} × 10^${mult} pF = ${pf.toLocaleString()} pF`;
      isValid = true;
    }
  }

  const displayCode = rawCode || "—";
  const chipHtml = `
    <div style="display:flex;align-items:center;justify-content:center;margin:10px 0">
      <div class="smd-chip-graphic">
        <div class="smd-chip-lead"></div>
        <div class="smd-chip-body">
          <span class="smd-chip-text">${displayCode}</span>
        </div>
        <div class="smd-chip-lead"></div>
      </div>
    </div>
  `;

  if (!isValid && rawCode.length > 0) {
    res.innerHTML = `
      ${chipHtml}
      <div style="padding:10px 14px;background:rgba(239, 68, 68, 0.1);border:1px solid rgba(239, 68, 68, 0.3);border-radius:6px;font-size:12px;color:#ef4444">
        ⚠️ <strong>Unrecognized SMD Code:</strong> "${rawCode}". Check the selected decoder mode (e.g. 3-digit: <code>472</code>, 4-digit: <code>1002</code>, EIA-96: <code>01C</code>, or Capacitor: <code>104</code>).
      </div>
    `;
    return;
  }

  res.innerHTML = `
    ${chipHtml}

    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--surface);border:1px solid var(--border);border-radius:8px;margin-bottom:12px;flex-wrap:wrap;gap:12px">
      <div>
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;font-weight:700">Decoded Nominal Value</div>
        <div style="font-size:24px;font-weight:900;color:var(--ink);margin:2px 0">
          ${valueDisplay}
        </div>
        <div style="font-size:11px;color:var(--muted)">${formulaDisplay}</div>
      </div>
      <div>
        <span class="materials-group-badge" style="font-size:12px;padding:4px 10px">${tolDisplay}</span>
      </div>
    </div>

    <table class="smd-spec-table">
      <thead>
        <tr>
          <th>Selected Package</th>
          <th>Metric Equivalent</th>
          <th>Dimensions (L × W)</th>
          <th>Power Rating</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>${pkgKey}</strong></td>
          <td>${pkg.metric}</td>
          <td>${pkg.dims}</td>
          <td><span style="color:var(--green);font-weight:700">${pkg.power}</span></td>
        </tr>
      </tbody>
    </table>
    <div style="font-size:11px;color:var(--muted);margin-top:6px">
      💡 <em>Soldering Note:</em> ${pkg.solder}
    </div>

    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;flex-wrap:wrap">
      <button type="button" class="button button-small button-outline" data-action="copy-smd-specs">📋 Copy SMD Specs</button>
      <button type="button" class="button button-small button-primary" data-action="save-smd-to-materials">➕ Add to Project Materials</button>
    </div>
  `;
}

async function copySmdSpecs() {
  const code = $("#elec-smd-code")?.value.toUpperCase() || "";
  const decVal = $("#elec-smd-result div:nth-child(2) div div:nth-child(2)")?.textContent.trim() || "";
  const pkg = $("#elec-smd-package")?.value || "0805";
  const text = `SMD Component Specs:\n• Marking: ${code}\n• Decoded Value: ${decVal}\n• Package Footprint: ${pkg}\nGenerated by Workbench Journal`;
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied SMD Component specs to clipboard!");
  } catch {
    showToast("Specs generated.");
  }
}

async function saveSmdToMaterials() {
  const code = $("#elec-smd-code")?.value.toUpperCase() || "";
  const decVal = $("#elec-smd-result div:nth-child(2) div div:nth-child(2)")?.textContent.trim() || "";
  const pkg = $("#elec-smd-package")?.value || "0805";
  await addMaterialToProjectShopping(`SMD Resistor ${decVal} (${pkg} / ${code})`, "10 pcs", 0, "Sensors & Modules");
}

// --- ⚙️ Electronics: Stepper Motor & Lead Screw / Belt Motion Resolution ---
function updateStepperMotorCalc() {
  const mech = $("#elec-step-mech")?.value || "belt_gt2_20t";
  const stepAngle = parseFloat($("#elec-step-angle")?.value) || 1.8;
  const micro = parseInt($("#elec-step-micro")?.value, 10) || 16;
  const gearRatio = parseFloat($("#elec-step-gear")?.value) || 1.0;
  const res = $("#elec-step-result");
  if (!res) return;

  const fullStepsPerRev = 360 / stepAngle;
  const totalStepsPerMotorRev = fullStepsPerRev * micro;

  let pitchMm = 40.0;
  let mechDesc = "GT2 Belt (20T Pulley · 40mm / rev)";

  if (mech === "belt_gt2_20t") {
    pitchMm = 20 * 2.0;
    mechDesc = "GT2 Belt · 20T Pulley (40.0 mm / rev)";
  } else if (mech === "belt_gt2_16t") {
    pitchMm = 16 * 2.0;
    mechDesc = "GT2 Belt · 16T Pulley (32.0 mm / rev)";
  } else if (mech === "leadscrew_t8x8") {
    pitchMm = 8.0;
    mechDesc = "T8 Lead Screw · 4-Start (8.0 mm lead / rev)";
  } else if (mech === "leadscrew_t8x4") {
    pitchMm = 4.0;
    mechDesc = "T8 Lead Screw · 2-Start (4.0 mm lead / rev)";
  } else if (mech === "leadscrew_t8x2") {
    pitchMm = 2.0;
    mechDesc = "T8 Lead Screw · 1-Start (2.0 mm lead / rev)";
  } else {
    pitchMm = 10.0;
    mechDesc = "Custom Direct Drive Pitch";
  }

  const stepsPerMm = (totalStepsPerMotorRev * gearRatio) / pitchMm;
  const microstepResolutionUm = (1000 / stepsPerMm);
  const maxFeedrateMmSec = Math.round(100000 / stepsPerMm);
  const m92Code = `M92 X${stepsPerMm.toFixed(2)} Y${stepsPerMm.toFixed(2)} Z${stepsPerMm.toFixed(2)}`;

  res.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:10px;margin-bottom:12px">
      <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">Calculated Firmware Steps/mm</div>
        <div style="font-size:24px;font-weight:900;color:var(--green);margin:2px 0">
          ${stepsPerMm.toFixed(2)} <span style="font-size:12px;color:var(--muted)">steps / mm</span>
        </div>
        <div style="font-size:10px;color:var(--muted)">Exact M92 value for Marlin / Klipper / GRBL</div>
      </div>

      <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">Single Microstep Resolution</div>
        <div style="font-size:24px;font-weight:900;color:var(--ink);margin:2px 0">
          ${microstepResolutionUm.toFixed(2)} <span style="font-size:12px;color:var(--muted)">µm</span>
        </div>
        <div style="font-size:10px;color:var(--muted)">${(microstepResolutionUm / 1000).toFixed(5)} mm linear resolution</div>
      </div>

      <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">Theoretical Max Feedrate</div>
        <div style="font-size:24px;font-weight:900;color:#0284c7;margin:2px 0">
          ${maxFeedrateMmSec} <span style="font-size:12px;color:var(--muted)">mm/s</span>
        </div>
        <div style="font-size:10px;color:var(--muted)">Based on standard 100 kHz step pulse limit</div>
      </div>
    </div>

    <div class="stepper-code-box">
      <div>
        <span style="color:#64748b">// 3D Printer / CNC Configuration G-Code:</span><br>
        <code>${m92Code}</code>
      </div>
      <button type="button" class="button button-small button-outline" data-action="copy-stepper-code">📋 Copy M92 G-Code</button>
    </div>

    <div style="font-size:11px;color:var(--muted);margin-top:6px">
      ⚙️ <em>Mechanics:</em> ${fullStepsPerRev} full steps/rev × 1/${micro} microsteps × ${gearRatio}:1 gear ratio ÷ ${pitchMm} mm travel.
    </div>

    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px">
      <button type="button" class="button button-small button-primary" data-action="save-stepper-to-materials">➕ Add Stepper &amp; Driver to Project</button>
    </div>
  `;
}

async function copyStepperM92() {
  const code = $("#elec-step-result .stepper-code-box code")?.textContent.trim() || "";
  try {
    await navigator.clipboard.writeText(code);
    showToast(`Copied "${code}" to clipboard!`);
  } catch {
    showToast(code);
  }
}

async function saveStepperToMaterials() {
  const angle = $("#elec-step-angle option:checked")?.textContent.split("(")[0].trim() || "NEMA 17";
  const micro = $("#elec-step-micro")?.value || "16";
  await addMaterialToProjectShopping(`${angle} Stepper Motor + 1/${micro} Driver`, "1 set", 0, "Sensors & Modules");
}

// --- 💻 Programming Studio: ALU, ASCII Search, Array Formatter ---
function updateProgAluCalc() {
  const a = Math.max(0, Math.min(255, parseInt($("#prog-alu-rega")?.value, 10) || 0));
  const b = Math.max(0, Math.min(255, parseInt($("#prog-alu-regb")?.value, 10) || 0));
  const op = $("#prog-alu-op")?.value || "and";
  const res = $("#prog-alu-result");
  if (!res) return;

  let out = 0;
  let codeSyntax = "";
  if (op === "and") { out = (a & b) & 0xFF; codeSyntax = 'uint8_t out = (A & B); // 0x' + a.toString(16).toUpperCase() + ' & 0x' + b.toString(16).toUpperCase(); }
  else if (op === "or") { out = (a | b) & 0xFF; codeSyntax = 'uint8_t out = (A | B); // Bit Set'; }
  else if (op === "xor") { out = (a ^ b) & 0xFF; codeSyntax = 'uint8_t out = (A ^ B); // Bit Toggle'; }
  else if (op === "not") { out = (~a) & 0xFF; codeSyntax = 'uint8_t out = (~A); // Inversion'; }
  else if (op === "nand") { out = (~(a & b)) & 0xFF; codeSyntax = 'uint8_t out = ~(A & B);'; }
  else if (op === "nor") { out = (~(a | b)) & 0xFF; codeSyntax = 'uint8_t out = ~(A | B);'; }

  const bits = [];
  for (let i = 7; i >= 0; i--) {
    const isSet = (out & (1 << i)) !== 0;
    bits.push('<span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:' + (isSet ? '#22c55e' : 'var(--border)') + ';color:' + (isSet ? '#fff' : 'var(--muted)') + ';text-align:center;line-height:18px;font-size:10px;font-weight:800;margin:0 2px">' + (isSet ? '1' : '0') + '</span>');
  }

  res.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:8px">' +
    '<span style="font-size:11px;font-weight:700;color:var(--muted)">ALU OUTPUT:</span>' +
    '<div style="display:flex;align-items:center">' + bits.join("") + '</div>' +
    '<strong style="font-size:16px;color:var(--green)">0x' + out.toString(16).toUpperCase().padStart(2, '0') + ' (' + out + ')</strong>' +
  '</div>' +
  '<div style="font-size:11px;font-family:monospace;background:var(--surface);padding:4px 8px;border-radius:4px;border:1px solid var(--border);color:var(--ink)">' +
    codeSyntax +
  '</div>';
}

function searchProgAsciiTable() {
  const query = ($("#prog-ascii-search")?.value || "").toLowerCase().trim();
  const box = $("#prog-ascii-table-result");
  if (!box) return;

  const asciiRows = [];
  for (let i = 0; i < 128; i++) {
    const ch = (i >= 32 && i <= 126) ? String.fromCharCode(i) : (i === 0 ? "NUL" : i === 10 ? "\n (LF)" : i === 13 ? "\r (CR)" : i === 9 ? "\t (TAB)" : i === 27 ? "ESC" : i === 32 ? "SPACE" : "CTRL");
    const name = i === 10 ? "newline line feed" : i === 13 ? "carriage return" : i === 9 ? "horizontal tab" : i === 0 ? "null zero byte" : i === 32 ? "space blank" : "";
    if (!query || i.toString().includes(query) || i.toString(16).toLowerCase().includes(query) || ch.toLowerCase().includes(query) || name.includes(query)) {
      asciiRows.push("Dec " + i.toString().padStart(3, " ") + " | 0x" + i.toString(16).toUpperCase().padStart(2, "0") + " | 0b" + i.toString(2).padStart(8, "0") + " | '" + ch + "'");
    }
  }

  box.innerHTML = asciiRows.slice(0, 40).map(r => '<div>' + r + '</div>').join("") || '<div>No matching ASCII entries.</div>';
}

function formatProgByteArray() {
  const raw = $("#prog-array-input")?.value || "";
  const lang = $("#prog-array-lang")?.value || "c";
  const outBox = $("#prog-array-output");
  if (!outBox) return;

  const numbers = raw.split(/[ ,\t\n]+/).map(s => parseInt(s.trim().replace(/^0x/i, ''), s.startsWith('0x') ? 16 : 10)).filter(n => !isNaN(n) && n >= 0 && n <= 255);

  let formatted = "";
  if (lang === "c") {
    const hexes = numbers.map(n => "0x" + n.toString(16).toUpperCase().padStart(2, "0"));
    formatted = "const uint8_t PROGMEM data[" + numbers.length + "] = {\n  " + hexes.join(", ") + "\n};";
  } else if (lang === "python") {
    formatted = "data = bytearray([\n    " + numbers.map(n => "0x" + n.toString(16).toUpperCase().padStart(2, "0")).join(", ") + "\n])";
  } else if (lang === "json") {
    formatted = JSON.stringify(numbers, null, 2);
  }

  outBox.textContent = formatted;
}

async function copyFormattedArray() {
  const outBox = $("#prog-array-output");
  if (!outBox || !outBox.textContent) return;
  try {
    await navigator.clipboard.writeText(outBox.textContent);
    showToast("Copied formatted array to clipboard!");
  } catch {
    showToast("Array ready.");
  }
}

// --- ⚡ Serial Baud Rate & Bit Timing Calculator ---
function updateProgBaudCalc() {
  const baud = parseInt($("#prog-baud-rate")?.value, 10) || 115200;
  const dataBits = parseInt($("#prog-baud-databits")?.value, 10) || 8;
  const parity = $("#prog-baud-parity")?.value || "none";
  const stopBits = parseInt($("#prog-baud-stopbits")?.value, 10) || 1;
  const res = $("#prog-baud-result");
  if (!res) return;

  const parityBits = parity === "none" ? 0 : 1;
  const totalFrameBits = 1 + dataBits + parityBits + stopBits;
  const bitTimeUs = 1000000 / baud;
  const frameTimeUs = bitTimeUs * totalFrameBits;
  const charsPerSec = Math.round(baud / totalFrameBits);
  const kbPerSec = (charsPerSec / 1024).toFixed(2);

  const bitCells = [];
  bitCells.push('<div class="serial-bit-cell start" title="Start Bit (Active LOW)">START (0)</div>');
  for (let i = 0; i < dataBits; i++) {
    bitCells.push('<div class="serial-bit-cell data" title="Data Bit D' + i + '">D' + i + '</div>');
  }
  if (parityBits > 0) {
    bitCells.push('<div class="serial-bit-cell parity" title="Parity Bit (' + parity.toUpperCase() + ')">PAR (' + parity[0].toUpperCase() + ')</div>');
  }
  for (let s = 1; s <= stopBits; s++) {
    bitCells.push('<div class="serial-bit-cell stop" title="Stop Bit ' + s + ' (Resting HIGH)">STOP (1)</div>');
  }

  res.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <span style="font-size:11px;font-weight:700;color:var(--muted)">1 BIT DURATION:</span>
      <strong style="font-size:18px;color:var(--green)">${bitTimeUs.toFixed(2)} µs</strong>
    </div>
    <div style="font-size:12px;color:var(--ink);line-height:1.4">
      • <strong>1 Byte Frame Duration:</strong> ${frameTimeUs >= 1000 ? (frameTimeUs / 1000).toFixed(3) + ' ms' : frameTimeUs.toFixed(1) + ' µs'} (${totalFrameBits} total bits per character)<br>
      • <strong>Max Throughput:</strong> ${charsPerSec.toLocaleString()} Bytes/sec (~${kbPerSec} KB/s)<br>
      • <strong>Frame Configuration:</strong> ${dataBits}${parity === 'none' ? 'N' : parity[0].toUpperCase()}${stopBits} (8N1 Standard)
    </div>
    <div class="serial-timing-chart">
      ${bitCells.join("")}
    </div>
  `;
}

// --- 🔐 CRC Checksum Calculator (CRC-8 & CRC-16) ---
let lastCalculatedCrcHex = "";

function updateProgCrcCalc() {
  const inputStr = ($("#prog-crc-input")?.value || "").trim();
  const format = $("#prog-crc-format")?.value || "ascii";
  const algo = $("#prog-crc-algo")?.value || "crc16_modbus";
  const res = $("#prog-crc-result");
  if (!res) return;

  if (!inputStr) {
    res.innerHTML = '<span style="font-size:12px;color:var(--muted)">Enter payload text or hex bytes above.</span>';
    return;
  }

  const bytes = [];
  if (format === "hex") {
    const tokens = inputStr.replace(/0x/gi, '').split(/[\s,]+/);
    for (const t of tokens) {
      if (t) {
        const val = parseInt(t, 16);
        if (!isNaN(val)) bytes.push(val & 0xFF);
      }
    }
  } else {
    for (let i = 0; i < inputStr.length; i++) {
      bytes.push(inputStr.charCodeAt(i) & 0xFF);
    }
  }

  let crcVal = 0;
  let polyName = "";
  let cSnippet = "";

  if (algo === "crc16_modbus") {
    polyName = "Modbus CRC-16 (Poly 0x8005, Init 0xFFFF)";
    let crc = 0xFFFF;
    for (const b of bytes) {
      crc ^= b;
      for (let i = 0; i < 8; i++) {
        if ((crc & 0x0001) !== 0) {
          crc = ((crc >> 1) ^ 0xA001) & 0xFFFF;
        } else {
          crc = (crc >> 1) & 0xFFFF;
        }
      }
    }
    crcVal = crc;
    lastCalculatedCrcHex = "0x" + crc.toString(16).toUpperCase().padStart(4, "0");
    const lowByte = crc & 0xFF;
    const highByte = (crc >> 8) & 0xFF;
    cSnippet = `// CRC-16 Modbus (Low Byte First):\nuint8_t crcLo = 0x${lowByte.toString(16).toUpperCase().padStart(2, "0")};\nuint8_t crcHi = 0x${highByte.toString(16).toUpperCase().padStart(2, "0")};`;
  } else if (algo === "crc16_ccitt") {
    polyName = "CRC-16 CCITT / XMODEM (Poly 0x1021, Init 0x0000)";
    let crc = 0x0000;
    for (const b of bytes) {
      crc ^= (b << 8);
      for (let i = 0; i < 8; i++) {
        if ((crc & 0x8000) !== 0) {
          crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
        } else {
          crc = (crc >> 1) & 0xFFFF;
        }
      }
    }
    crcVal = crc;
    lastCalculatedCrcHex = "0x" + crc.toString(16).toUpperCase().padStart(4, "0");
    cSnippet = `uint16_t crc16 = ${lastCalculatedCrcHex};`;
  } else if (algo === "crc8_dallas") {
    polyName = "CRC-8 Dallas / Maxim 1-Wire (Poly 0x31, Init 0x00)";
    let crc = 0x00;
    for (const b of bytes) {
      crc ^= b;
      for (let i = 0; i < 8; i++) {
        if ((crc & 0x01) !== 0) {
          crc = ((crc >> 1) ^ 0x8C) & 0xFF;
        } else {
          crc = (crc >> 1) & 0xFF;
        }
      }
    }
    crcVal = crc;
    lastCalculatedCrcHex = "0x" + crc.toString(16).toUpperCase().padStart(2, "0");
    cSnippet = `uint8_t crc8 = ${lastCalculatedCrcHex};`;
  }

  res.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <span style="font-size:11px;font-weight:700;color:var(--muted)">CHECKSUM VALUE:</span>
      <strong style="font-size:20px;color:var(--green)">${lastCalculatedCrcHex} (${crcVal})</strong>
    </div>
    <div style="font-size:12px;color:var(--ink);line-height:1.4">
      • <strong>Payload Size:</strong> ${bytes.length} bytes<br>
      • <strong>Algorithm:</strong> ${polyName}
    </div>
    <pre style="margin:8px 0 0;font-family:monospace;font-size:11px;background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:6px;line-height:1.3">${cSnippet}</pre>
  `;
}

async function copyCrcResult() {
  if (!lastCalculatedCrcHex) {
    showToast("No CRC value calculated.");
    return;
  }
  try {
    await navigator.clipboard.writeText(lastCalculatedCrcHex);
    showToast(`Copied ${lastCalculatedCrcHex} to clipboard!`);
  } catch {
    showToast("Checksum ready.");
  }
}

// --- 🔋 Programming: Microcontroller Deep Sleep & Battery Life Calculator ---
function updateProgBatteryLifeCalc() {
  const mcu = $("#prog-pwr-mcu")?.value || "esp32";
  const actCurr = Math.max(0.1, parseFloat($("#prog-pwr-act-curr")?.value) || 120);
  const actTimeMs = Math.max(1, parseFloat($("#prog-pwr-act-time")?.value) || 350);
  const sleepCurrRaw = Math.max(0.01, parseFloat($("#prog-pwr-sleep-curr")?.value) || 15);
  const sleepUnit = $("#prog-pwr-sleep-unit")?.value || "ua";
  const sleepCurrMa = (sleepUnit === "ua") ? (sleepCurrRaw / 1000) : sleepCurrRaw;

  const sleepTimeRaw = Math.max(1, parseFloat($("#prog-pwr-sleep-time")?.value) || 15);
  const sleepTimeUnit = $("#prog-pwr-sleep-time-unit")?.value || "min";
  let sleepTimeMs = sleepTimeRaw * 1000;
  if (sleepTimeUnit === "min") sleepTimeMs = sleepTimeRaw * 60 * 1000;
  else if (sleepTimeUnit === "hr") sleepTimeMs = sleepTimeRaw * 3600 * 1000;

  const batCap = Math.max(1, parseFloat($("#prog-pwr-bat-cap")?.value) || 2600);
  const res = $("#prog-pwr-result");
  if (!res) return;

  const totalCycleMs = actTimeMs + sleepTimeMs;
  const actFraction = actTimeMs / totalCycleMs;
  const sleepFraction = sleepTimeMs / totalCycleMs;

  const avgCurrentMa = (actCurr * actFraction) + (sleepCurrMa * sleepFraction);
  const usableMah = batCap * 0.85;

  const runtimeHours = usableMah / avgCurrentMa;
  const runtimeDays = runtimeHours / 24;
  const runtimeMonths = runtimeDays / 30.4375;
  const runtimeYears = runtimeDays / 365.25;

  let runtimeDisplay = "";
  if (runtimeYears >= 1.0) {
    runtimeDisplay = `${runtimeYears.toFixed(1)} Years (${Math.round(runtimeDays)} days)`;
  } else if (runtimeMonths >= 1.0) {
    runtimeDisplay = `${runtimeMonths.toFixed(1)} Months (${Math.round(runtimeDays)} days)`;
  } else {
    runtimeDisplay = `${runtimeDays.toFixed(1)} Days (${Math.round(runtimeHours)} hrs)`;
  }

  const actEnergy = actCurr * actTimeMs;
  const sleepEnergy = sleepCurrMa * sleepTimeMs;
  const totalEnergy = actEnergy + sleepEnergy;
  const actPct = Math.round((actEnergy / totalEnergy) * 100);
  const sleepPct = 100 - actPct;

  res.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:10px;margin-bottom:12px">
      <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">Estimated Total Autonomy</div>
        <div style="font-size:22px;font-weight:900;color:var(--green);margin:2px 0">
          ${runtimeDisplay}
        </div>
        <div style="font-size:10px;color:var(--muted)">Based on 85% usable battery capacity</div>
      </div>

      <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">Average Current Consumption</div>
        <div style="font-size:22px;font-weight:900;color:var(--ink);margin:2px 0">
          ${avgCurrentMa >= 1 ? `${avgCurrentMa.toFixed(2)} mA` : `${(avgCurrentMa * 1000).toFixed(1)} µA`}
        </div>
        <div style="font-size:10px;color:var(--muted)">Continuous equivalent load</div>
      </div>

      <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">Duty Cycle Wake Ratio</div>
        <div style="font-size:22px;font-weight:900;color:#0284c7;margin:2px 0">
          ${(actFraction * 100).toFixed(3)}%
        </div>
        <div style="font-size:10px;color:var(--muted)">Wake ${(actTimeMs/1000).toFixed(2)}s every ${(sleepTimeMs/60000).toFixed(1)} mins</div>
      </div>
    </div>

    <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;margin-bottom:4px">
      Energy Consumption Distribution: <span style="color:#f97316">Active Tx ${actPct}%</span> vs <span style="color:#10b981">Deep Sleep ${sleepPct}%</span>
    </div>
    <div class="pwr-bar-wrap">
      <div class="pwr-bar-active" style="width:${actPct}%" title="Active WiFi/Sensors: ${actPct}%"></div>
      <div class="pwr-bar-sleep" style="width:${sleepPct}%" title="Sleep Current: ${sleepPct}%"></div>
    </div>

    <div style="font-size:11px;color:var(--muted);margin-top:6px">
      💡 <em>Optimization Tip:</em> ${actPct > 70 ? "Most battery energy is spent during the active wake burst. Consider caching sensor readings, shortening WiFi DHCP connection time with static IP, or using BLE advertisements instead of HTTP!" : "Most battery power is lost to sleep quiescent leakage current. Ensure your onboard 3.3V LDO regulator has low quiescent current (<15µA) or use a discrete MOSFET power gate!"}
    </div>

    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;flex-wrap:wrap">
      <button type="button" class="button button-small button-outline" data-action="copy-battery-life-specs">📋 Copy Power Budget Specs</button>
      <button type="button" class="button button-small button-primary" data-action="save-battery-to-materials">➕ Add Battery to Project</button>
    </div>
  `;
}

async function copyBatteryLifeSpecs() {
  const mcu = $("#prog-pwr-mcu option:checked")?.textContent.split("(")[0].trim() || "MCU";
  const runtime = $("#prog-pwr-result div:first-child div:first-child div:nth-child(2)")?.textContent.trim() || "";
  const avg = $("#prog-pwr-result div:first-child div:nth-child(2) div:nth-child(2)")?.textContent.trim() || "";
  const bat = $("#prog-pwr-battery option:checked")?.textContent || "Battery";

  const text = `IoT Power Budget & Battery Life:\n• MCU: ${mcu}\n• Battery: ${bat}\n• Average Draw: ${avg}\n• Estimated Autonomy: ${runtime}\nGenerated by Workbench Journal`;
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied Power Budget specs to clipboard!");
  } catch {
    showToast("Specs generated.");
  }
}

async function saveBatteryToMaterials() {
  const bat = $("#prog-pwr-battery option:checked")?.textContent.split("·")[0].trim() || "Li-Ion Battery";
  const cap = $("#prog-pwr-bat-cap")?.value || "2600";
  await addMaterialToProjectShopping(`${bat} (${cap} mAh)`, "1 unit", 0, "Sensors & Modules");
}

// --- 📡 Programming: Serial UART, Packet Timing & CRC Checksum Analyzer ---
function updateSerialCalc() {
  const baud = parseInt($("#serial-baud")?.value, 10) || 115200;
  const framing = $("#serial-framing")?.value || "8N1";
  const format = $("#serial-data-format")?.value || "ascii";
  const rawInput = $("#serial-payload-input")?.value || "HELLO_MAKER";
  const res = $("#serial-result");
  if (!res) return;

  const bitTimeUs = (1 / baud) * 1e6;
  const framingMap = {
    "8N1": { data: 8, parity: 0, stop: 1, total: 10, label: "8 Data, No Parity, 1 Stop" },
    "8E1": { data: 8, parity: 1, stop: 1, total: 11, label: "8 Data, Even Parity, 1 Stop" },
    "8O1": { data: 8, parity: 1, stop: 1, total: 11, label: "8 Data, Odd Parity, 1 Stop" },
    "8N2": { data: 8, parity: 0, stop: 2, total: 11, label: "8 Data, No Parity, 2 Stop" },
    "7E1": { data: 7, parity: 1, stop: 1, total: 10, label: "7 Data, Even Parity, 1 Stop" }
  };
  const frame = framingMap[framing] || framingMap["8N1"];

  let bytes = [];
  if (format === "hex") {
    const clean = rawInput.replace(/[^0-9a-fA-F]/g, "");
    for (let i = 0; i < clean.length; i += 2) {
      bytes.push(parseInt(clean.substr(i, 2), 16) || 0);
    }
  } else {
    for (let i = 0; i < rawInput.length; i++) {
      bytes.push(rawInput.charCodeAt(i) & 0xFF);
    }
  }
  if (bytes.length === 0) bytes = [0x00];

  // XOR Checksum
  const xor = bytes.reduce((acc, b) => acc ^ b, 0);

  // Sum-8
  const sum8 = bytes.reduce((acc, b) => (acc + b) & 0xFF, 0);

  // CRC-8 (Dallas 0x31)
  let crc8 = 0;
  for (const b of bytes) {
    crc8 ^= b;
    for (let i = 0; i < 8; i++) {
      if (crc8 & 0x80) crc8 = ((crc8 << 1) ^ 0x31) & 0xFF;
      else crc8 = (crc8 << 1) & 0xFF;
    }
  }

  // CRC-16 Modbus (Poly 0xA001)
  let crc16Modbus = 0xFFFF;
  for (const b of bytes) {
    crc16Modbus ^= b;
    for (let i = 0; i < 8; i++) {
      if (crc16Modbus & 0x0001) crc16Modbus = (crc16Modbus >> 1) ^ 0xA001;
      else crc16Modbus = crc16Modbus >> 1;
    }
  }

  // CRC-16 CCITT (Poly 0x1021)
  let crc16Ccitt = 0xFFFF;
  for (const b of bytes) {
    crc16Ccitt ^= (b << 8);
    for (let i = 0; i < 8; i++) {
      if (crc16Ccitt & 0x8000) crc16Ccitt = ((crc16Ccitt << 1) ^ 0x1021) & 0xFFFF;
      else crc16Ccitt = (crc16Ccitt << 1) & 0xFFFF;
    }
  }

  const packetBits = bytes.length * frame.total;
  const packetTimeMs = (packetBits * bitTimeUs) / 1000;
  const byteRate = Math.round(baud / frame.total);
  const throughputKbps = ((byteRate * 8) / 1000).toFixed(1);

  const xorHex = "0x" + xor.toString(16).padStart(2, "0").toUpperCase();
  const sum8Hex = "0x" + sum8.toString(16).padStart(2, "0").toUpperCase();
  const crc8Hex = "0x" + crc8.toString(16).padStart(2, "0").toUpperCase();
  const crc16ModbusHex = "0x" + crc16Modbus.toString(16).padStart(4, "0").toUpperCase();
  const crc16CcittHex = "0x" + crc16Ccitt.toString(16).padStart(4, "0").toUpperCase();

  // Generate Digital Signal Waveform SVG for first byte (UART TX Line)
  const firstByte = bytes[0] || 0;
  const firstByteHex = "0x" + firstByte.toString(16).padStart(2, "0").toUpperCase();
  const firstByteChar = (firstByte >= 32 && firstByte <= 126) ? `'${String.fromCharCode(firstByte)}'` : "N/A";

  // Build bit train: Idle (1) -> Start (0) -> D0..D7 -> Parity -> Stop (1) -> Idle (1)
  const bitTrain = [{ name: "IDLE", val: 1 }];
  bitTrain.push({ name: "START", val: 0 });
  for (let i = 0; i < frame.data; i++) {
    const bitVal = (firstByte >> i) & 1;
    bitTrain.push({ name: `D${i}`, val: bitVal });
  }
  if (frame.parity > 0) {
    let ones = 0;
    for (let i = 0; i < frame.data; i++) if ((firstByte >> i) & 1) ones++;
    const isEvenParity = framing.includes("E");
    const parVal = isEvenParity ? (ones % 2 === 0 ? 0 : 1) : (ones % 2 === 0 ? 1 : 0);
    bitTrain.push({ name: "PAR", val: parVal });
  }
  for (let i = 0; i < frame.stop; i++) {
    bitTrain.push({ name: `STOP${frame.stop > 1 ? i + 1 : ""}`, val: 1 });
  }
  bitTrain.push({ name: "IDLE", val: 1 });

  // Draw SVG pulse waveform
  const totalSlots = bitTrain.length;
  const slotW = 540 / totalSlots;
  const highY = 16, lowY = 48;
  let waveD = `M 0 ${highY}`;
  let currentY = highY;

  let markersHtml = "";
  bitTrain.forEach((bit, idx) => {
    const xStart = idx * slotW;
    const xEnd = (idx + 1) * slotW;
    const targetY = bit.val === 1 ? highY : lowY;
    if (targetY !== currentY) {
      waveD += ` L ${xStart} ${targetY}`;
      currentY = targetY;
    }
    waveD += ` L ${xEnd} ${targetY}`;

    markersHtml += `
      <g transform="translate(${xStart + (slotW / 2)}, 0)">
        <text x="0" y="62" font-size="9" font-family="monospace" fill="#94a3b8" text-anchor="middle">${bit.name}</text>
        <text x="0" y="${targetY > 30 ? 44 : 28}" font-size="10" font-weight="bold" font-family="monospace" fill="${bit.val === 1 ? '#34d399' : '#f87171'}" text-anchor="middle">${bit.val}</text>
      </g>
    `;
  });

  res.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:8px">
      <div class="cnc-stat-pill">
        <span class="cnc-stat-pill-label">Bit Duration (Tbit)</span>
        <span class="cnc-stat-pill-val">${bitTimeUs < 1 ? (bitTimeUs * 1000).toFixed(1) : bitTimeUs.toFixed(2)}<span class="cnc-stat-pill-unit">${bitTimeUs < 1 ? "ns" : "µs"}</span></span>
      </div>
      <div class="cnc-stat-pill">
        <span class="cnc-stat-pill-label">Byte Throughput</span>
        <span class="cnc-stat-pill-val">${byteRate.toLocaleString()}<span class="cnc-stat-pill-unit">B/s</span></span>
      </div>
      <div class="cnc-stat-pill">
        <span class="cnc-stat-pill-label">Effective Data Rate</span>
        <span class="cnc-stat-pill-val">${throughputKbps}<span class="cnc-stat-pill-unit">kbps</span></span>
      </div>
      <div class="cnc-stat-pill">
        <span class="cnc-stat-pill-label">Packet Payload</span>
        <span class="cnc-stat-pill-val">${bytes.length}<span class="cnc-stat-pill-unit">bytes</span></span>
      </div>
      <div class="cnc-stat-pill">
        <span class="cnc-stat-pill-label">Wire Time</span>
        <span class="cnc-stat-pill-val">${packetTimeMs < 1 ? (packetTimeMs * 1000).toFixed(0) : packetTimeMs.toFixed(2)}<span class="cnc-stat-pill-unit">${packetTimeMs < 1 ? "µs" : "ms"}</span></span>
      </div>
    </div>

    <!-- Oscilloscope trace -->
    <div class="serial-wave-box">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;font-size:11px;color:#94a3b8">
        <span>⚡ <strong>Digital Scope: Byte 0 (${firstByteHex} / ${firstByteChar})</strong> · LSB-First UART Pulse Train</span>
        <span>${frame.label} · ${baud} bps</span>
      </div>
      <svg class="serial-wave-svg" viewBox="0 0 540 70">
        <line x1="0" y1="${highY}" x2="540" y2="${highY}" stroke="#1e293b" stroke-dasharray="2,2"/>
        <line x1="0" y1="${lowY}" x2="540" y2="${lowY}" stroke="#1e293b" stroke-dasharray="2,2"/>
        <path d="${waveD}" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linejoin="round"/>
        ${markersHtml}
      </svg>
    </div>

    <!-- CRC Checksum Badges -->
    <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <div class="serial-crc-badge" title="Standard Modbus RTU / RS-485 CRC-16 (Poly 0xA001)">
        <span>CRC-16 Modbus:</span> <strong>${crc16ModbusHex}</strong>
      </div>
      <div class="serial-crc-badge" title="CRC-16 CCITT / XMODEM (Poly 0x1021)">
        <span>CRC-16 CCITT:</span> <strong>${crc16CcittHex}</strong>
      </div>
      <div class="serial-crc-badge" title="Dallas 1-Wire DS18B20 CRC-8 (Poly 0x31)">
        <span>CRC-8 Dallas:</span> <strong>${crc8Hex}</strong>
      </div>
      <div class="serial-crc-badge" title="8-bit XOR Longitudinal Checksum">
        <span>XOR / NMEA:</span> <strong>${xorHex}</strong>
      </div>
      <div class="serial-crc-badge" title="8-bit Modulo 256 Sum Checksum">
        <span>Sum-8:</span> <strong>${sum8Hex}</strong>
      </div>
    </div>

    <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
      <button type="button" class="button button-outline" data-action="copy-serial-crc" data-hex="${crc16ModbusHex}" style="font-size:12px">
        📋 Copy CRC-16 (${crc16ModbusHex})
      </button>
      <button type="button" class="button button-outline" data-action="copy-serial-crc" data-hex="${crc8Hex}" style="font-size:12px">
        📋 Copy CRC-8 (${crc8Hex})
      </button>
    </div>
  `;
}

// --- 🛒 Studio to Project Supplies Helper ---
async function addMaterialToProjectShopping(itemName, qty, cost = 0, groupOverride = null) {
  let project = (typeof state !== "undefined" && state.projects) ? (state.projects.find(p => p.status === "in-progress") || state.projects[0]) : null;
  if (!project && typeof state !== "undefined") {
    state.projects = state.projects || [];
    project = {
      id: uid(),
      title: "Workshop Supplies & Builds",
      description: "Materials and hardware calculated from craft studios",
      status: "in-progress",
      priority: "normal",
      tags: ["supplies", "workshop"],
      tasks: [],
      materials: [],
      logs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    state.projects.push(project);
  }
  if (!project) return;

  const grp = groupOverride || (typeof inferMaterialGroup === "function" ? inferMaterialGroup(itemName) : "General Supplies");
  project.materials = Array.isArray(project.materials) ? project.materials : [];
  project.materials.push({
    id: uid(),
    name: itemName,
    qty: String(qty),
    cost: Number(cost) || 0,
    status: "need",
    group: grp,
    createdAt: new Date().toISOString()
  });
  project.updatedAt = new Date().toISOString();
  if (typeof makeActivity === "function") {
    makeActivity("project", `Added ${itemName} (${grp}) to supplies for ${project.title}`);
  }
  await persistState();
  if (typeof renderShoppingList === "function") renderShoppingList();
  showToast(`🛒 Added "${itemName}" (${qty}) to project "${project.title}" supplies!`);
}

// --- 🎨 Art & Design Studio: WCAG Contrast, CSS Gradient, DPI Print Scaler ---
function getLuminance(hex) {
  let c = hex.replace("#", "");
  if (c.length === 3) c = c.split("").map(x => x + x).join("");
  const num = parseInt(c, 16);
  const rgb = [(num >> 16) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255].map(val => {
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function updateArtContrastCalc() {
  const fg = $("#art-contrast-text")?.value || "#ffffff";
  const bg = $("#art-contrast-bg")?.value || "#0284c7";
  const res = $("#art-contrast-result");
  if (!res) return;

  const l1 = getLuminance(fg);
  const l2 = getLuminance(bg);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

  const aaNormal = ratio >= 4.5;
  const aaLarge = ratio >= 3.0;
  const aaaNormal = ratio >= 7.0;

  res.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
    '<span style="font-size:11px;font-weight:700;color:var(--muted)">CONTRAST RATIO:</span>' +
    '<strong style="font-size:20px;color:' + (aaNormal ? 'var(--green)' : '#ef4444') + '">' + ratio.toFixed(2) + ' : 1</strong>' +
  '</div>' +
  '<div style="padding:10px;border-radius:6px;background:' + bg + ';color:' + fg + ';font-weight:700;font-size:13px;text-align:center;margin-bottom:8px">' +
    'Sample Readable Text on Color' +
  '</div>' +
  '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
    '<span class="contrast-badge ' + (aaNormal ? 'pass' : 'fail') + '">' + (aaNormal ? '✓' : '✗') + ' AA Normal (4.5+)</span>' +
    '<span class="contrast-badge ' + (aaLarge ? 'pass' : 'fail') + '">' + (aaLarge ? '✓' : '✗') + ' AA Large (3.0+)</span>' +
    '<span class="contrast-badge ' + (aaaNormal ? 'pass' : 'fail') + '">' + (aaaNormal ? '✓' : '✗') + ' AAA Enhanced (7.0+)</span>' +
  '</div>';
}

function updateArtGradientStudio() {
  const type = $("#art-gradient-type")?.value || "linear";
  const angle = parseInt($("#art-gradient-angle")?.value, 10) || 135;
  const prev = $("#art-gradient-preview");
  const codeBox = $("#art-gradient-css");

  const colors = (typeof currentStudioPaletteHexes !== "undefined" && currentStudioPaletteHexes.length >= 2)
    ? currentStudioPaletteHexes.slice(0, 3)
    : ["#0284c7", "#38bdf8", "#0369a1"];

  const cssStr = type === "linear"
    ? "linear-gradient(" + angle + "deg, " + colors.join(", ") + ")"
    : "radial-gradient(circle, " + colors.join(", ") + ")";

  if (prev) prev.style.background = cssStr;
  if (codeBox) codeBox.textContent = "background: " + cssStr + ";";
}

async function copyArtGradientCss() {
  const codeBox = $("#art-gradient-css");
  if (!codeBox || !codeBox.textContent) return;
  try {
    await navigator.clipboard.writeText(codeBox.textContent);
    showToast("Copied CSS gradient to clipboard!");
  } catch {
    showToast("CSS ready.");
  }
}

const ART_PRINT_SIZES_DB = {
  "8x10": { wIn: 8, hIn: 10, label: '8" × 10" Portrait' },
  "11x14": { wIn: 11, hIn: 14, label: '11" × 14" Frame' },
  "16x20": { wIn: 16, hIn: 20, label: '16" × 20" Gallery' },
  "18x24": { wIn: 18, hIn: 24, label: '18" × 24" Poster' },
  "24x36": { wIn: 24, hIn: 36, label: '24" × 36" Statement' },
  "A4": { wIn: 8.27, hIn: 11.69, label: 'A4 (210 × 297 mm)' },
  "A3": { wIn: 11.69, hIn: 16.54, label: 'A3 (297 × 420 mm)' }
};

function updateArtPrintResCalc() {
  const sizeKey = $("#art-print-size")?.value || "18x24";
  const dpi = parseInt($("#art-print-dpi")?.value, 10) || 300;
  const res = $("#art-print-dpi-result");
  if (!res) return;

  const data = ART_PRINT_SIZES_DB[sizeKey] || ART_PRINT_SIZES_DB["18x24"];
  const pxW = Math.round(data.wIn * dpi);
  const pxH = Math.round(data.hIn * dpi);
  const mp = ((pxW * pxH) / 1000000).toFixed(1);

  res.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
    '<span style="font-size:11px;font-weight:700;color:var(--muted)">CANVAS PIXEL RESOLUTION:</span>' +
    '<strong style="font-size:18px;color:#0284c7">' + pxW + ' × ' + pxH + ' px</strong>' +
  '</div>' +
  '<div style="font-size:12px;color:var(--ink);line-height:1.4">' +
    '• Total Image Detail: <strong>' + mp + ' Megapixels</strong><br>' +
    '• Physical Aspect Ratio: <strong>' + (data.wIn / data.hIn).toFixed(2) + ' : 1</strong><br>' +
    '• Minimum recommended canvas size for 300 DPI razor sharpness' +
  '</div>';
}

// --- 👁️ Color Vision Deficiency (CVD) Simulation Preview ---
function simulateCvdColor(hex, type) {
  let c = hex.replace("#", "");
  if (c.length === 3) c = c.split("").map(x => x + x).join("");
  const num = parseInt(c, 16);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;

  let sr = r, sg = g, sb = b;
  if (type === "protanopia") {
    sr = 0.56667 * r + 0.43333 * g;
    sg = 0.55833 * r + 0.44167 * g;
    sb = 0.24167 * g + 0.75833 * b;
  } else if (type === "deuteranopia") {
    sr = 0.625 * r + 0.375 * g;
    sg = 0.70 * r + 0.30 * g;
    sb = 0.30 * g + 0.70 * b;
  } else if (type === "tritanopia") {
    sr = 0.95 * r + 0.05 * g;
    sg = 0.43333 * g + 0.56667 * b;
    sb = 0.475 * g + 0.525 * b;
  } else if (type === "achromatopsia") {
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    sr = sg = sb = luma;
  }

  const toByte = (v) => Math.max(0, Math.min(255, Math.round(v * 255)));
  const toHex = (v) => toByte(v).toString(16).padStart(2, "0");
  return `#${toHex(sr)}${toHex(sg)}${toHex(sb)}`;
}

function updateArtCvdView() {
  const wrap = $("#art-cvd-preview-wrap");
  if (!wrap) return;

  const cvdType = $("#art-cvd-type")?.value || "protanopia";
  const colors = (typeof currentStudioPaletteHexes !== "undefined" && currentStudioPaletteHexes.length >= 2)
    ? currentStudioPaletteHexes
    : ["#0284c7", "#38bdf8", "#0369a1", "#f59e0b", "#10b981"];

  const cards = colors.map((origHex) => {
    const simHex = simulateCvdColor(origHex, cvdType);
    return `
      <div class="cvd-swatch-card">
        <div class="cvd-color-split">
          <div class="cvd-color-orig" style="background:${origHex}" title="Normal Vision: ${origHex}"></div>
          <div class="cvd-color-sim" style="background:${simHex}" title="Simulated: ${simHex}"></div>
        </div>
        <div class="cvd-swatch-label">
          <div style="font-weight:700">${origHex}</div>
          <div style="color:var(--muted);font-size:9px">→ ${simHex}</div>
        </div>
      </div>
    `;
  });

  wrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;font-size:10px;font-weight:700;color:var(--muted);margin-bottom:4px;padding:0 4px">
      <span>LEFT: NORMAL</span>
      <span>RIGHT: SIMULATED</span>
    </div>
    <div class="cvd-preview-grid">
      ${cards.join("")}
    </div>
  `;
}

// --- 📷 Live Camera Color Eyedropper & Screen Dominant Color Analyzer ---
function rgbToHex(r, g, b) {
  const toByte = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v) => toByte(v).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function getColorNameApprox(r, g, b) {
  const [h, s, l] = rgbToHsl(r, g, b);
  if (s < 12) {
    if (l < 15) return "Obsidian Black";
    if (l < 35) return "Charcoal Gray";
    if (l < 65) return "Medium Gray";
    if (l < 88) return "Silver Gray";
    return "Pure White";
  }
  if (l < 15) return "Very Dark Shadow";
  if (l > 88) return "Pale Pastel";

  if (h >= 350 || h < 12) return l < 40 ? "Burgundy / Maroon" : "Crimson Red";
  if (h >= 12 && h < 38) return l < 40 ? "Rust Brown" : "Vibrant Orange";
  if (h >= 38 && h < 65) return l < 45 ? "Raw Umber / Ochre" : "Golden Amber";
  if (h >= 65 && h < 85) return "Lime Yellow";
  if (h >= 85 && h < 160) return l < 35 ? "Deep Forest Green" : "Emerald Green";
  if (h >= 160 && h < 195) return "Teal / Cyan";
  if (h >= 195 && h < 245) return l < 35 ? "Navy Blue" : "Sky / Azure Blue";
  if (h >= 245 && h < 275) return "Indigo / Royal Blue";
  if (h >= 275 && h < 315) return "Plum / Purple";
  if (h >= 315 && h < 350) return "Rose / Magenta";
  return "Custom Hue";
}

const artCameraState = {
  stream: null,
  active: false,
  facingMode: "environment",
  frozen: false,
  activeColor: "#0284c7",
  screenDominantColor: "#0284c7",
  topClusters: ["#0284c7", "#38bdf8", "#0369a1", "#024a73", "#e0f2fe"],
  rafId: null,
  tapX: null,
  tapY: null
};

async function startArtCamera() {
  const video = $("#art-camera-video");
  const canvas = $("#art-camera-canvas");
  const btn = $("#art-camera-toggle-btn");
  const flipBtn = $("#art-camera-flip-btn");
  const freezeBtn = $("#art-camera-freeze-btn");
  const hudBadge = $("#art-camera-hud-badge");
  const statusText = $("#art-camera-status-text");
  if (!video) return;

  if (artCameraState.stream) {
    stopArtCamera();
    return;
  }

  try {
    const constraints = {
      video: {
        facingMode: artCameraState.facingMode,
        width: { ideal: 640 },
        height: { ideal: 480 }
      },
      audio: false
    };

    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }

    artCameraState.stream = stream;
    artCameraState.active = true;
    artCameraState.frozen = false;
    video.srcObject = stream;
    await video.play();

    if (canvas) canvas.classList.remove("active");
    if (btn) {
      btn.textContent = "⏹ Stop Camera";
      btn.classList.add("button-outline");
    }
    if (flipBtn) flipBtn.style.display = "inline-flex";
    if (freezeBtn) {
      freezeBtn.style.display = "inline-flex";
      freezeBtn.textContent = "📸 Freeze Frame";
    }
    if (hudBadge) {
      hudBadge.classList.remove("frozen");
      const dot = hudBadge.querySelector(".hud-status-dot");
      if (dot) dot.style.background = "#22c55e";
    }
    if (statusText) statusText.textContent = "Live Camera Active";

    initCameraViewportTap();
    runArtCameraFrameLoop();
    showToast("Camera active. Point at any subject to extract dominant color!");
  } catch (err) {
    console.error("Camera access failed:", err);
    showToast("Could not access camera. Please check browser permissions, or use 'Pick from Photo'.", "warning");
  }
}

function stopArtCamera() {
  if (artCameraState.stream) {
    artCameraState.stream.getTracks().forEach(t => t.stop());
    artCameraState.stream = null;
  }
  if (artCameraState.rafId) {
    cancelAnimationFrame(artCameraState.rafId);
    artCameraState.rafId = null;
  }
  artCameraState.active = false;
  artCameraState.frozen = false;

  const video = $("#art-camera-video");
  const canvas = $("#art-camera-canvas");
  const btn = $("#art-camera-toggle-btn");
  const flipBtn = $("#art-camera-flip-btn");
  const freezeBtn = $("#art-camera-freeze-btn");
  const hudBadge = $("#art-camera-hud-badge");
  const statusText = $("#art-camera-status-text");

  if (video) video.srcObject = null;
  if (canvas) canvas.classList.remove("active");
  if (btn) {
    btn.textContent = "📷 Start Camera";
    btn.classList.remove("button-outline");
  }
  if (flipBtn) flipBtn.style.display = "none";
  if (freezeBtn) freezeBtn.style.display = "none";
  if (hudBadge) {
    hudBadge.classList.remove("frozen");
    const dot = hudBadge.querySelector(".hud-status-dot");
    if (dot) dot.style.background = "#94a3b8";
  }
  if (statusText) statusText.textContent = "Camera Inactive";
}

function toggleArtCamera() {
  if (artCameraState.active) {
    stopArtCamera();
  } else {
    void startArtCamera();
  }
}

async function switchArtCameraFacing() {
  artCameraState.facingMode = (artCameraState.facingMode === "environment") ? "user" : "environment";
  if (artCameraState.active) {
    stopArtCamera();
    await startArtCamera();
  }
}

function freezeArtCamera() {
  const video = $("#art-camera-video");
  const canvas = $("#art-camera-canvas");
  const freezeBtn = $("#art-camera-freeze-btn");
  const hudBadge = $("#art-camera-hud-badge");
  const statusText = $("#art-camera-status-text");
  if (!video || !canvas) return;

  if (!artCameraState.frozen) {
    artCameraState.frozen = true;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.classList.add("active");

    if (freezeBtn) freezeBtn.textContent = "▶ Resume Video";
    if (hudBadge) {
      hudBadge.classList.add("frozen");
      const dot = hudBadge.querySelector(".hud-status-dot");
      if (dot) dot.style.background = "#38bdf8";
    }
    if (statusText) statusText.textContent = "Frame Frozen";
    showToast("Snapshot frozen! Tap anywhere to sample colors.");
  } else {
    artCameraState.frozen = false;
    canvas.classList.remove("active");
    if (freezeBtn) freezeBtn.textContent = "📸 Freeze Frame";
    if (hudBadge) {
      hudBadge.classList.remove("frozen");
      const dot = hudBadge.querySelector(".hud-status-dot");
      if (dot) dot.style.background = "#22c55e";
    }
    if (statusText) statusText.textContent = "Live Camera Active";
    runArtCameraFrameLoop();
  }
}

function runArtCameraFrameLoop() {
  if (!artCameraState.active || artCameraState.frozen) return;
  const video = $("#art-camera-video");
  if (video && video.readyState >= 2) {
    analyzeVideoFrame(video);
  }
  artCameraState.rafId = requestAnimationFrame(runArtCameraFrameLoop);
}

function analyzeVideoFrame(videoSource) {
  if (!window._artCameraOffscreen) {
    window._artCameraOffscreen = document.createElement("canvas");
    window._artCameraOffscreen.width = 48;
    window._artCameraOffscreen.height = 36;
  }
  const oc = window._artCameraOffscreen;
  const octx = oc.getContext("2d", { willReadFrequently: true });
  octx.drawImage(videoSource, 0, 0, oc.width, oc.height);

  const imgData = octx.getImageData(0, 0, oc.width, oc.height).data;
  const colorBuckets = {};

  let rx = Math.floor(oc.width / 2);
  let ry = Math.floor(oc.height / 2);
  if (artCameraState.tapX !== null && artCameraState.tapY !== null) {
    rx = Math.max(0, Math.min(oc.width - 1, Math.floor(artCameraState.tapX * oc.width)));
    ry = Math.max(0, Math.min(oc.height - 1, Math.floor(artCameraState.tapY * oc.height)));
  }

  const reticleIdx = (ry * oc.width + rx) * 4;
  const rRet = imgData[reticleIdx];
  const gRet = imgData[reticleIdx + 1];
  const bRet = imgData[reticleIdx + 2];
  const reticleHex = rgbToHex(rRet, gRet, bRet);

  for (let i = 0; i < imgData.length; i += 4) {
    const r = imgData[i];
    const g = imgData[i + 1];
    const b = imgData[i + 2];
    const qr = Math.round(r / 24) * 24;
    const qg = Math.round(g / 24) * 24;
    const qb = Math.round(b / 24) * 24;
    const key = `${Math.min(255, qr)},${Math.min(255, qg)},${Math.min(255, qb)}`;
    colorBuckets[key] = (colorBuckets[key] || 0) + 1;
  }

  const sorted = Object.entries(colorBuckets).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return;

  const domRgb = sorted[0][0].split(",").map(Number);
  const domHex = rgbToHex(domRgb[0], domRgb[1], domRgb[2]);
  artCameraState.screenDominantColor = domHex;

  const activeColor = (artCameraState.tapX !== null) ? reticleHex : domHex;
  artCameraState.activeColor = activeColor;

  const top5 = sorted.slice(0, 5).map(entry => {
    const [r, g, b] = entry[0].split(",").map(Number);
    return rgbToHex(r, g, b);
  });
  artCameraState.topClusters = top5;

  renderArtCameraDetails(activeColor, top5, domHex);
}

function renderArtCameraDetails(activeHex, top5Hexes = [], domHex = null) {
  const swatchBox = $("#art-camera-swatch-box");
  const hexVal = $("#art-camera-hex-val");
  const nameVal = $("#art-camera-color-name");
  const rgbVal = $("#art-camera-rgb-val");
  const hslVal = $("#art-camera-hsl-val");
  const lumaVal = $("#art-camera-luma-val");
  const strip = $("#art-camera-palette-strip");

  const hex = (activeHex || "#0284c7").toLowerCase();
  const c = hex.replace("#", "");
  const num = parseInt(c.length === 3 ? c.split("").map(x => x + x).join("") : c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;

  const [h, s, l] = rgbToHsl(r, g, b);
  const luma = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  const lumaPct = Math.round((luma / 255) * 100);
  const colorName = getColorNameApprox(r, g, b);

  if (swatchBox) swatchBox.style.background = hex;
  if (hexVal) hexVal.textContent = hex.toUpperCase();
  if (nameVal) nameVal.textContent = `${colorName} ${domHex && hex.toLowerCase() === domHex.toLowerCase() ? "(Dominant)" : ""}`;
  if (rgbVal) rgbVal.textContent = `rgb(${r}, ${g}, ${b})`;
  if (hslVal) hslVal.textContent = `hsl(${h}, ${s}%, ${l}%)`;
  if (lumaVal) lumaVal.textContent = `Luma: ${lumaPct}% (${lumaPct > 50 ? "Light" : "Dark"})`;

  if (strip && top5Hexes.length > 0) {
    const roles = ["Main Dominant", "Secondary", "Accent", "Muted", "Highlight"];
    strip.innerHTML = top5Hexes.map((chipHex, idx) => {
      const isSelected = chipHex.toLowerCase() === hex;
      return `
        <div class="art-camera-palette-chip ${isSelected ? "active" : ""}" data-action="pick-camera-chip" data-hex="${chipHex}" title="${roles[idx] || "Cluster"}: ${chipHex}">
          <div class="art-camera-chip-swatch" style="background:${chipHex}"></div>
          <span class="art-camera-chip-hex">${chipHex.toUpperCase()}</span>
          <span class="art-camera-chip-role">${roles[idx] || ""}</span>
        </div>
      `;
    }).join("");
  }
}

function handleArtCameraFileUpload(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      stopArtCamera();
      const canvas = $("#art-camera-canvas");
      const freezeBtn = $("#art-camera-freeze-btn");
      const hudBadge = $("#art-camera-hud-badge");
      const statusText = $("#art-camera-status-text");
      if (!canvas) return;

      canvas.width = img.naturalWidth || 640;
      canvas.height = img.naturalHeight || 480;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.classList.add("active");

      artCameraState.frozen = true;
      artCameraState.active = true;

      if (freezeBtn) {
        freezeBtn.style.display = "inline-flex";
        freezeBtn.textContent = "▶ Resume Camera";
      }
      if (hudBadge) {
        hudBadge.classList.add("frozen");
        const dot = hudBadge.querySelector(".hud-status-dot");
        if (dot) dot.style.background = "#38bdf8";
      }
      if (statusText) statusText.textContent = "Photo Loaded";

      analyzeVideoFrame(canvas);
      initCameraViewportTap();
      showToast("Photo analyzed! Extracted main color on screen.");
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function initCameraViewportTap() {
  const wrap = $("#art-camera-viewport-wrap");
  const reticle = $("#art-camera-reticle");
  if (!wrap || wrap.dataset.tapBound) return;
  wrap.dataset.tapBound = "true";

  wrap.addEventListener("pointerdown", (e) => {
    const rect = wrap.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    artCameraState.tapX = x;
    artCameraState.tapY = y;

    if (reticle) {
      reticle.style.left = `${(x * 100).toFixed(1)}%`;
      reticle.style.top = `${(y * 100).toFixed(1)}%`;
    }

    const video = $("#art-camera-video");
    const canvas = $("#art-camera-canvas");
    const source = (artCameraState.frozen && canvas) ? canvas : video;
    if (source) analyzeVideoFrame(source);
  });
}

function setCameraColorAsStudioBase() {
  const hex = artCameraState.activeColor || artCameraState.screenDominantColor || "#0284c7";
  const baseInput = $("#art-view-base-color");
  if (baseInput) {
    baseInput.value = hex;
    updateArtStudioPalette();
  }
  showToast(`Updated Studio Base Color to ${hex.toUpperCase()}! Harmonious palette regenerated.`);
}

// --- 🪚 Woodworking: Dovetail & Box Joint Layout Calculator ---
function updateDovetailCalc() {
  const jointType = $("#wood-dt-type")?.value || "through_dt";
  const unit = $("#wood-dt-unit")?.value || "mm";
  const isInch = unit === "in";
  const width = Math.max(isInch ? 0.5 : 10, parseFloat($("#wood-dt-width")?.value) || (isInch ? 6 : 150));
  const thick = Math.max(isInch ? 0.125 : 3, parseFloat($("#wood-dt-thick")?.value) || (isInch ? 0.75 : 19));
  const slopeRatio = parseFloat($("#wood-dt-slope")?.value) || 8;
  const numTails = Math.max(1, Math.min(20, parseInt($("#wood-dt-tails")?.value, 10) || 3));
  const halfPinMargin = Math.max(isInch ? 0.05 : 1, parseFloat($("#wood-dt-halfpin")?.value) || (isInch ? 0.25 : 6));
  const res = $("#wood-dt-result");
  if (!res) return;

  const isBoxJoint = jointType === "box_joint";
  const isHalfBlind = jointType === "half_blind";

  let fingerW = 0;
  let socketDepth = thick;
  let slopeAngleDeg = 0;
  let deltaSlope = 0;
  let tailBaseW = 0;
  let tailTipW = 0;
  let pinBaseW = 0;
  let pinTipW = 0;
  let numFingers = 0;

  if (isBoxJoint) {
    numFingers = (numTails * 2) + 1;
    fingerW = width / numFingers;
  } else {
    slopeAngleDeg = (Math.atan(1 / slopeRatio) * 180 / Math.PI);
    socketDepth = isHalfBlind ? (thick * 0.75) : thick;
    deltaSlope = socketDepth / slopeRatio;

    const availableW = Math.max(1, width - (2 * halfPinMargin));
    const pitch = availableW / numTails;
    const tailMidW = pitch * 0.65;
    const pinMidW = pitch * 0.35;

    tailBaseW = Math.max(1, tailMidW - deltaSlope);
    tailTipW = tailMidW + deltaSlope;
    pinBaseW = Math.max(1, pinMidW + deltaSlope);
    pinTipW = Math.max(0.5, pinMidW - deltaSlope);
  }

  let glueArea = 0;
  if (isBoxJoint) {
    glueArea = 2 * (numFingers - 1) * fingerW * socketDepth;
  } else {
    const flankLen = Math.sqrt(Math.pow(socketDepth, 2) + Math.pow(deltaSlope, 2));
    glueArea = (2 * numTails * flankLen * thick) + (width * socketDepth * 0.5);
  }
  const buttJointArea = width * thick;
  const strengthMultiplier = (glueArea / buttJointArea).toFixed(1);

  // CAD Layout SVG
  const svgW = 560;
  const svgH = 140;
  const marginX = 30;
  const marginY = 20;
  const drawW = svgW - (2 * marginX);
  const drawH = 90;
  const scaleX = drawW / width;
  const drawSocketH = Math.min(drawH * 0.55, socketDepth * scaleX * 2.5);

  let pathsHtml = "";
  if (isBoxJoint) {
    const fwSvg = drawW / numFingers;
    for (let i = 0; i < numFingers; i++) {
      const x = marginX + (i * fwSvg);
      const isSocket = (i % 2 === 1);
      if (isSocket) {
        pathsHtml += `<rect x="${x}" y="${marginY}" width="${fwSvg}" height="${drawSocketH}" fill="rgba(239, 68, 68, 0.25)" stroke="#ef4444" stroke-dasharray="2,2" stroke-width="1.5"/>`;
      } else {
        pathsHtml += `<rect x="${x}" y="${marginY}" width="${fwSvg}" height="${drawSocketH}" fill="#38bdf8" opacity="0.4" stroke="#38bdf8" stroke-width="1.5"/>`;
      }
    }
  } else {
    const hwSvg = halfPinMargin * scaleX;
    const pitchSvg = (drawW - (2 * hwSvg)) / numTails;
    const deltaSvg = deltaSlope * scaleX;

    pathsHtml += `<polygon points="${marginX},${marginY} ${marginX + hwSvg},${marginY} ${marginX + hwSvg + deltaSvg},${marginY + drawSocketH} ${marginX},${marginY + drawSocketH}" fill="#10b981" opacity="0.35" stroke="#10b981" stroke-width="1.5"/>`;

    for (let t = 0; t < numTails; t++) {
      const cx = marginX + hwSvg + (t * pitchSvg) + (pitchSvg / 2);
      const tMidSvg = (pitchSvg * 0.65) / 2;

      const xTopL = cx - tMidSvg - deltaSvg;
      const xTopR = cx + tMidSvg + deltaSvg;
      const xBotL = cx - tMidSvg + deltaSvg;
      const xBotR = cx + tMidSvg - deltaSvg;

      pathsHtml += `
        <polygon points="${xTopL},${marginY} ${xTopR},${marginY} ${xBotR},${marginY + drawSocketH} ${xBotL},${marginY + drawSocketH}" fill="#38bdf8" opacity="0.5" stroke="#38bdf8" stroke-width="1.5"/>
        <text x="${cx}" y="${marginY + (drawSocketH / 2) + 4}" text-anchor="middle" font-size="10" font-weight="700" fill="#f8fafc">T${t + 1}</text>
      `;

      if (t < numTails - 1) {
        const nextCx = marginX + hwSvg + ((t + 1) * pitchSvg) + (pitchSvg / 2);
        const nextTopL = nextCx - tMidSvg - deltaSvg;
        const nextBotL = nextCx - tMidSvg + deltaSvg;
        pathsHtml += `<polygon points="${xTopR},${marginY} ${nextTopL},${marginY} ${nextBotL},${marginY + drawSocketH} ${xBotR},${marginY + drawSocketH}" fill="rgba(239, 68, 68, 0.25)" stroke="#ef4444" stroke-dasharray="2,2" stroke-width="1"/>`;
      }
    }

    const rightX = marginX + drawW;
    pathsHtml += `<polygon points="${rightX - hwSvg},${marginY} ${rightX},${marginY} ${rightX},${marginY + drawSocketH} ${rightX - hwSvg - deltaSvg},${marginY + drawSocketH}" fill="#10b981" opacity="0.35" stroke="#10b981" stroke-width="1.5"/>`;
  }

  const svgDiagram = `
    <div class="dt-cad-wrap">
      <svg class="dt-cad-svg" viewBox="0 0 ${svgW} ${svgH}" width="100%">
        <line x1="${marginX}" y1="${marginY + drawSocketH}" x2="${marginX + drawW}" y2="${marginY + drawSocketH}" stroke="var(--border)" stroke-width="2" stroke-dasharray="4,4"/>
        <text x="${marginX + drawW - 8}" y="${marginY + drawSocketH - 5}" font-size="9" fill="var(--muted)" text-anchor="end">Depth: ${socketDepth.toFixed(1)}${unit}</text>

        <rect x="${marginX}" y="${marginY}" width="${drawW}" height="${drawH}" fill="none" stroke="#64748b" stroke-width="1.5"/>
        ${pathsHtml}

        <line x1="${marginX}" y1="${marginY + drawH + 12}" x2="${marginX + drawW}" y2="${marginY + drawH + 12}" stroke="var(--ink)" stroke-width="1.5"/>
        <line x1="${marginX}" y1="${marginY + drawH + 8}" x2="${marginX}" y2="${marginY + drawH + 16}" stroke="var(--ink)" stroke-width="1.5"/>
        <line x1="${marginX + drawW}" y1="${marginY + drawH + 8}" x2="${marginX + drawW}" y2="${marginY + drawH + 16}" stroke="var(--ink)" stroke-width="1.5"/>
        <text x="${svgW / 2}" y="${marginY + drawH + 24}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--ink)">Board Width: ${width}${unit}</text>
      </svg>
    </div>
  `;

  res.innerHTML = `
    ${svgDiagram}

    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(170px, 1fr));gap:10px;margin-bottom:12px">
      <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">Joint Configuration</div>
        <div style="font-size:16px;font-weight:800;color:var(--ink);margin:2px 0">
          ${isBoxJoint ? `${numFingers} Total Fingers` : `${numTails} Tails · ${numTails + 1} Pins`}
        </div>
        <div style="font-size:11px;color:var(--muted)">
          ${isBoxJoint ? `Equal ${fingerW.toFixed(1)}${unit} spacing` : `Slope 1:${slopeRatio} (${slopeAngleDeg.toFixed(1)}°)`}
        </div>
      </div>

      <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">Socket Baseline Depth</div>
        <div style="font-size:16px;font-weight:800;color:var(--green);margin:2px 0">
          ${socketDepth.toFixed(1)} ${unit}
        </div>
        <div style="font-size:11px;color:var(--muted)">
          ${isHalfBlind ? `75% drawer front depth` : `Full stock thickness`}
        </div>
      </div>

      <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">Half-Pin Outer Margin</div>
        <div style="font-size:16px;font-weight:800;color:#0284c7;margin:2px 0">
          ${halfPinMargin.toFixed(1)} ${unit}
        </div>
        <div style="font-size:11px;color:var(--muted)">Protects outer edge corners</div>
      </div>

      <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">Glue Surface Area</div>
        <div style="font-size:16px;font-weight:800;color:#f59e0b;margin:2px 0">
          +${strengthMultiplier}× Strength
        </div>
        <div style="font-size:11px;color:var(--muted)">${glueArea.toFixed(0)} ${unit}² mechanical interlock</div>
      </div>
    </div>

    ${!isBoxJoint ? `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:10px;font-size:12px;color:var(--ink)">
        <strong>📏 Dovetail Cut Schedule:</strong><br>
        • <strong>Tail Width:</strong> ${tailBaseW.toFixed(1)}${unit} (narrow base) → <strong>${tailTipW.toFixed(1)}${unit}</strong> (wide tip)<br>
        • <strong>Interior Pin Width:</strong> ${pinTipW.toFixed(1)}${unit} (narrow face) → <strong>${pinBaseW.toFixed(1)}${unit}</strong> (broad baseline)<br>
        • <strong>Half-Pin Margin:</strong> ${halfPinMargin.toFixed(1)}${unit} at outer corners<br>
        ${pinTipW < (unit === 'in' ? 0.08 : 2.5) ? `<span style="color:#ef4444;font-weight:700">⚠️ Caution: Pin tip width is under 2.5mm. Use fine-kerf Japanese dozuki saw and narrow chisel.</span>` : ``}
      </div>
    ` : `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:10px;font-size:12px;color:var(--ink)">
        <strong>📏 Box Joint Finger Schedule:</strong><br>
        • <strong>Finger Width:</strong> ${fingerW.toFixed(2)} ${unit}<br>
        • <strong>Dado Depth:</strong> ${socketDepth.toFixed(2)} ${unit}<br>
        • <strong>Table Saw Dado Blade:</strong> Set stack to ${fingerW.toFixed(2)}${unit} or use standard index pin jig
      </div>
    `}

    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button type="button" class="button button-outline" data-action="copy-dovetail-specs" style="font-size:12px">
        📋 Copy Cut Layout Specs
      </button>
      <button type="button" class="button button-outline" data-action="add-dovetail-material" style="font-size:12px">
        + Add Board to Materials
      </button>
    </div>
  `;
}

// --- 🧶 Textiles & Yarn Studio: Multi-Strand Yarn Equivalency Calculator ---
const YARN_WEIGHT_STANDARDS = {
  "0": { name: "Lace / Cobweb", mPer100g: 800, needleMm: "1.5 - 2.25 mm", needleUs: "US 000 - 1", hook: "Steel 6-8", gauge: "33-40 sts" },
  "1": { name: "Super Fine (Fingering / Sock / 4-ply)", mPer100g: 400, needleMm: "2.25 - 3.25 mm", needleUs: "US 1 - 3", hook: "B/1 - E/4", gauge: "27-32 sts" },
  "2": { name: "Fine (Sport / Baby / 5-ply)", mPer100g: 300, needleMm: "3.25 - 3.75 mm", needleUs: "US 3 - 5", hook: "E/4 - 7", gauge: "23-26 sts" },
  "3": { name: "Light (DK / Light Worsted / 8-ply)", mPer100g: 225, needleMm: "3.75 - 4.5 mm", needleUs: "US 5 - 7", hook: "7 - I/9", gauge: "21-24 sts" },
  "4": { name: "Medium (Worsted / Afghan / Aran / 10-ply)", mPer100g: 180, needleMm: "4.5 - 5.5 mm", needleUs: "US 7 - 9", hook: "I/9 - K/10.5", gauge: "16-20 sts" },
  "5": { name: "Bulky (Chunky / Craft / Rug / 12-ply)", mPer100g: 120, needleMm: "5.5 - 8.0 mm", needleUs: "US 9 - 11", hook: "K/10.5 - M/13", gauge: "12-15 sts" },
  "6": { name: "Super Bulky (Roving / 14-ply)", mPer100g: 70, needleMm: "8.0 - 12.75 mm", needleUs: "US 11 - 17", hook: "M/13 - Q", gauge: "7-11 sts" },
  "7": { name: "Jumbo (Giant arm-knit)", mPer100g: 35, needleMm: "12.75+ mm", needleUs: "US 17+", hook: "Q+", gauge: "6 sts or fewer" }
};

function getCategoryFromMPer100g(m) {
  if (m >= 550) return "0";
  if (m >= 350) return "1";
  if (m >= 260) return "2";
  if (m >= 200) return "3";
  if (m >= 140) return "4";
  if (m >= 90) return "5";
  if (m >= 50) return "6";
  return "7";
}

function updateYarnHoldingCalc() {
  const s1Key = $("#textiles-yarn-strand1")?.value || "1";
  const s2Key = $("#textiles-yarn-strand2")?.value || "0";
  const s3Key = $("#textiles-yarn-strand3")?.value || "none";
  const targetLen = Math.max(10, parseFloat($("#textiles-yarn-target-len")?.value) || 950);
  const lenUnit = $("#textiles-yarn-len-unit")?.value || "m";
  const res = $("#textiles-yarn-result");
  if (!res) return;

  const s1 = YARN_WEIGHT_STANDARDS[s1Key] || YARN_WEIGHT_STANDARDS["1"];
  const s2 = YARN_WEIGHT_STANDARDS[s2Key] || YARN_WEIGHT_STANDARDS["0"];
  const s3 = (s3Key !== "none" && YARN_WEIGHT_STANDARDS[s3Key]) ? YARN_WEIGHT_STANDARDS[s3Key] : null;

  let invSum = (1 / s1.mPer100g) + (1 / s2.mPer100g);
  if (s3) invSum += (1 / s3.mPer100g);

  const combinedMPer100g = Math.round(1 / invSum);
  const combinedYardsPer100g = Math.round(combinedMPer100g * 1.09361);
  const catKey = getCategoryFromMPer100g(combinedMPer100g);
  const compositeStd = YARN_WEIGHT_STANDARDS[catKey];

  const targetM = (lenUnit === "yd") ? (targetLen * 0.9144) : targetLen;
  const s1Grams = (targetM / s1.mPer100g) * 100;
  const s2Grams = (targetM / s2.mPer100g) * 100;
  const s3Grams = s3 ? (targetM / s3.mPer100g) * 100 : 0;
  const totalWeightGrams = Math.round(s1Grams + s2Grams + s3Grams);

  const s1Skeins = Math.ceil(s1Grams / 100);
  const s2Skeins = Math.ceil(s2Grams / 100);
  const s3Skeins = s3 ? Math.ceil(s3Grams / 100) : 0;

  res.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap">
      <span class="yarn-holding-badge">
        🧶 Combined Weight: Category ${catKey} · ${compositeStd.name}
      </span>
      <span style="font-size:12px;color:var(--muted)">
        Yields <strong>${combinedMPer100g} m</strong> (${combinedYardsPer100g} yds) per 100g
      </span>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:10px;margin-bottom:12px">
      <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">Recommended Needles</div>
        <div style="font-size:16px;font-weight:800;color:var(--ink);margin:2px 0">
          ${compositeStd.needleUs}
        </div>
        <div style="font-size:11px;color:var(--muted)">${compositeStd.needleMm}</div>
      </div>

      <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">Recommended Crochet Hook</div>
        <div style="font-size:16px;font-weight:800;color:var(--green);margin:2px 0">
          ${compositeStd.hook}
        </div>
        <div style="font-size:11px;color:var(--muted)">Standard ergonomic hook</div>
      </div>

      <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">Stockinette Gauge</div>
        <div style="font-size:16px;font-weight:800;color:#0284c7;margin:2px 0">
          ${compositeStd.gauge}
        </div>
        <div style="font-size:11px;color:var(--muted)">per 4 inches (10 cm)</div>
      </div>

      <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">Total Garment Weight</div>
        <div style="font-size:16px;font-weight:800;color:#f59e0b;margin:2px 0">
          ~${totalWeightGrams} g
        </div>
        <div style="font-size:11px;color:var(--muted)">For ${targetLen} ${lenUnit} project</div>
      </div>
    </div>

    <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:12px;color:var(--ink);line-height:1.5">
      <strong>📦 Yarn Purchase Plan for ${targetLen} ${lenUnit} Project:</strong><br>
      • <strong>Strand 1 (${s1.name}):</strong> ~${Math.round(s1Grams)}g (${s1Skeins} × 100g skeins)<br>
      • <strong>Strand 2 (${s2.name}):</strong> ~${Math.round(s2Grams)}g (${s2Skeins} × 100g skeins)<br>
      ${s3 ? `• <strong>Strand 3 (${s3.name}):</strong> ~${Math.round(s3Grams)}g (${s3Skeins} × 100g skeins)<br>` : ""}
      <span style="color:var(--muted);font-size:11px">Tip: Holding silk mohair with wool creates an airy, brushed halo without adding heavy garment weight!</span>
    </div>

    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button type="button" class="button button-outline" data-action="add-yarn-holding-bundle" style="font-size:12px">
        + Add All Strands to Project Shopping
      </button>
      <button type="button" class="button button-outline" data-action="copy-yarn-holding-specs" style="font-size:12px">
        📋 Copy Yarn Specs
      </button>
    </div>
  `;
}

// --- ⚡ Electronics Studio: IPC-2152 / IPC-2221 PCB Trace Width & Ampacity Solver ---
function updatePcbTraceCalc() {
  const current = Math.max(0.01, parseFloat($("#elec-trace-current")?.value) || 2.5);
  const copperOz = parseFloat($("#elec-trace-copper")?.value) || 1.0;
  const deltaT = parseFloat($("#elec-trace-deltat")?.value) || 20;
  const layer = $("#elec-trace-layer")?.value || "external";
  const lenRaw = Math.max(1, parseFloat($("#elec-trace-len")?.value) || 50);
  const lenUnit = $("#elec-trace-len-unit")?.value || "mm";
  const ambientT = parseFloat($("#elec-trace-ambient")?.value) || 25;
  const res = $("#elec-trace-result");
  if (!res) return;

  const lenMm = (lenUnit === "in") ? (lenRaw * 25.4) : lenRaw;
  const k = (layer === "external") ? 0.048 : 0.024;
  const areaMils2 = Math.pow(current / (k * Math.pow(deltaT, 0.44)), 1 / 0.725);
  const areaMm2 = areaMils2 * 0.00064516;

  const copperThickMils = copperOz * 1.37;
  const copperThickMm = copperOz * 0.035;

  const traceWidthMils = areaMils2 / copperThickMils;
  const traceWidthMm = traceWidthMils * 0.0254;

  const opTemp = ambientT + deltaT;
  const rhoOp = 1.724e-8 * (1 + 0.00393 * (opTemp - 20));
  const areaM2 = (traceWidthMm / 1000) * (copperThickMm / 1000);
  const lenM = lenMm / 1000;
  const resistanceOhms = rhoOp * (lenM / areaM2);
  const resistanceMilliOhms = resistanceOhms * 1000;

  const voltDrop = current * resistanceOhms;
  const voltDropMv = voltDrop * 1000;
  const powerLossWatts = Math.pow(current, 2) * resistanceOhms;
  const powerLossMw = powerLossWatts * 1000;

  const svgWidth = 480;
  const svgHeight = 110;
  const traceVisualW = Math.max(20, Math.min(240, traceWidthMm * 40));
  const traceVisualH = Math.max(6, Math.min(22, copperOz * 7));

  const svgDiagram = `
    <div class="pcb-trace-diagram">
      <svg viewBox="0 0 ${svgWidth} ${svgHeight}" width="100%">
        <rect x="20" y="55" width="440" height="45" rx="3" fill="#14532d" stroke="#22c55e" stroke-width="1.5"/>
        <text x="35" y="82" font-size="11" font-weight="700" fill="#86efac">FR-4 Dielectric Core (Tg 140°C)</text>

        <g transform="translate(${240 - traceVisualW/2}, ${55 - traceVisualH})">
          <rect x="-8" y="-8" width="${traceVisualW + 16}" height="${traceVisualH + 16}" rx="4" fill="rgba(249, 115, 22, 0.15)"/>
          <rect x="0" y="0" width="${traceVisualW}" height="${traceVisualH}" rx="1" fill="#f59e0b" stroke="#d97706" stroke-width="1.5"/>
          <text x="${traceVisualW / 2}" y="${traceVisualH / 2 + 4}" text-anchor="middle" font-size="10" font-weight="900" fill="#78350f">
            ${traceWidthMils.toFixed(1)} mils (${traceWidthMm.toFixed(2)}mm)
          </text>
        </g>

        <line x1="20" y1="55" x2="${240 - traceVisualW/2 - 6}" y2="55" stroke="#16a34a" stroke-width="5"/>
        <line x1="${240 + traceVisualW/2 + 6}" y1="55" x2="460" y2="55" stroke="#16a34a" stroke-width="5"/>

        <text x="240" y="20" text-anchor="middle" font-size="11" font-weight="700" fill="#fdba74">
          Continuous Current: ${current}A · ΔT +${deltaT}°C (Operating at ${opTemp.toFixed(1)}°C)
        </text>
      </svg>
    </div>
  `;

  res.innerHTML = `
    ${svgDiagram}

    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(170px, 1fr));gap:10px;margin-bottom:12px">
      <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">1. Required Width (Mils)</div>
        <div style="font-size:20px;font-weight:800;color:var(--green);margin:2px 0">
          ${traceWidthMils.toFixed(1)} mils
        </div>
        <div style="font-size:11px;color:var(--muted)">${traceWidthMm.toFixed(3)} mm (thou)</div>
      </div>

      <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">2. Trace Resistance</div>
        <div style="font-size:20px;font-weight:800;color:var(--ink);margin:2px 0">
          ${resistanceMilliOhms.toFixed(2)} mΩ
        </div>
        <div style="font-size:11px;color:var(--muted)">Over ${lenRaw} ${lenUnit} @ ${opTemp.toFixed(0)}°C</div>
      </div>

      <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">3. Voltage Drop (ΔV)</div>
        <div style="font-size:20px;font-weight:800;color:#0284c7;margin:2px 0">
          ${voltDropMv < 1000 ? `${voltDropMv.toFixed(1)} mV` : `${voltDrop.toFixed(3)} V`}
        </div>
        <div style="font-size:11px;color:var(--muted)">At ${current}A continuous</div>
      </div>

      <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">4. Power Dissipation</div>
        <div style="font-size:20px;font-weight:800;color:#f59e0b;margin:2px 0">
          ${powerLossMw < 1000 ? `${powerLossMw.toFixed(1)} mW` : `${powerLossWatts.toFixed(2)} W`}
        </div>
        <div style="font-size:11px;color:var(--muted)">I²R heat dissipation</div>
      </div>
    </div>

    <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:10px;font-size:12px;color:var(--ink);line-height:1.5">
      <strong>💡 EDA Routing Recommendations:</strong><br>
      • <strong>Rule of Thumb:</strong> For standard 1.0 oz copper, budget ~<strong>${(traceWidthMils / current).toFixed(0)} mils per Amp</strong> for an external layer.<br>
      • <strong>KiCad / Altium Net Class:</strong> Assign net to width <strong>${Math.ceil(traceWidthMm * 10) / 10} mm</strong> (${Math.ceil(traceWidthMils)} mils).<br>
      • <strong>Via Current Capacity:</strong> A standard 0.3mm drill via carries ~1.5A to 2.0A. Use <strong>${Math.ceil(current / 1.5)} vias in parallel</strong> if switching layers.
    </div>

    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button type="button" class="button button-outline" data-action="copy-pcb-trace-specs" style="font-size:12px">
        📋 Copy Trace Routing Specs
      </button>
    </div>
  `;
}

// --- 🖩 Programming Studio: IEEE 754 32-Bit Floating Point Inspector ---
let ieee754CurrentUint = 0x41560000;

function setIeee754FromFloat(val) {
  const buf = new ArrayBuffer(4);
  const f32 = new Float32Array(buf);
  const u32 = new Uint32Array(buf);
  f32[0] = val;
  ieee754CurrentUint = u32[0];
  updateIeee754InspectorUI();
}

function setIeee754FromHex(hexStr) {
  let cleaned = hexStr.trim().replace(/^0x/i, "");
  if (!cleaned) return;
  const u = parseInt(cleaned, 16);
  if (!isNaN(u)) {
    ieee754CurrentUint = (u >>> 0);
    updateIeee754InspectorUI();
  }
}

function toggleIeee754Bit(bitIdx) {
  if (bitIdx < 0 || bitIdx > 31) return;
  ieee754CurrentUint = ((ieee754CurrentUint ^ (1 << bitIdx)) >>> 0);
  updateIeee754InspectorUI();
}

function updateIeee754InspectorUI() {
  const buf = new ArrayBuffer(4);
  const u32 = new Uint32Array(buf);
  const f32 = new Float32Array(buf);
  u32[0] = ieee754CurrentUint;
  const floatVal = f32[0];

  const hexVal = "0x" + ieee754CurrentUint.toString(16).toUpperCase().padStart(8, "0");
  const binStr = ieee754CurrentUint.toString(2).padStart(32, "0");

  const signBit = parseInt(binStr[0], 10);
  const expBits = binStr.substring(1, 9);
  const mantissaBits = binStr.substring(9);

  const rawExp = parseInt(expBits, 2);
  const biasedExp = rawExp - 127;
  const mantissaInt = parseInt(mantissaBits, 2);
  const mantissaFrac = mantissaInt / Math.pow(2, 23);

  const decInput = $("#prog-fp-dec");
  const hexInput = $("#prog-fp-hex");
  if (decInput && document.activeElement !== decInput) {
    decInput.value = isNaN(floatVal) ? "NaN" : (!isFinite(floatVal) ? (floatVal > 0 ? "Infinity" : "-Infinity") : floatVal);
  }
  if (hexInput && document.activeElement !== hexInput) {
    hexInput.value = hexVal;
  }

  const res = $("#prog-fp-result");
  if (!res) return;

  let bitCells = "";
  for (let i = 31; i >= 0; i--) {
    const bitVal = (ieee754CurrentUint >>> i) & 1;
    let cls = "fp-bit-mantissa";
    if (i === 31) cls = "fp-bit-sign";
    else if (i >= 23) cls = "fp-bit-exp";

    bitCells += `
      <div class="fp-bit-cell ${cls}" data-action="prog-fp-bit-toggle" data-bit="${i}" title="Toggle Bit ${i}">
        <span class="bit-idx">${i}</span>
        <span>${bitVal}</span>
      </div>
    `;
  }

  let typeDesc = "Normal Floating Point";
  if (rawExp === 255) {
    if (mantissaInt === 0) {
      typeDesc = (signBit === 0) ? "+Infinity (Overflow)" : "-Infinity (Negative Overflow)";
    } else {
      typeDesc = (mantissaBits[0] === '1') ? "Quiet NaN (qNaN)" : "Signaling NaN (sNaN)";
    }
  } else if (rawExp === 0) {
    if (mantissaInt === 0) {
      typeDesc = (signBit === 0) ? "+0.0 (Positive Zero)" : "-0.0 (Negative Zero)";
    } else {
      typeDesc = "Subnormal / Denormalized Number (Gradual Underflow)";
    }
  }

  res.innerHTML = `
    <div style="margin-bottom:8px">
      <div style="font-size:11px;font-weight:700;color:var(--muted);display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px">
        <span>Bit 31: Sign (Red)</span>
        <span>Bits 30-23: Biased Exponent (Blue)</span>
        <span>Bits 22-0: Mantissa / Fraction (Green)</span>
      </div>
      <div class="fp-bits-grid">
        ${bitCells}
      </div>
      <div style="font-size:10px;color:var(--muted);text-align:center">Click any bit to flip 0 ↔ 1</div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(170px, 1fr));gap:10px;margin-bottom:12px">
      <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">Sign (1 Bit)</div>
        <div style="font-size:18px;font-weight:800;color:#ef4444;margin:2px 0">
          ${signBit === 0 ? "+ (Positive)" : "- (Negative)"}
        </div>
        <div style="font-size:11px;color:var(--muted)">Bit 31: ${signBit}</div>
      </div>

      <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">Exponent (8 Bits)</div>
        <div style="font-size:18px;font-weight:800;color:#38bdf8;margin:2px 0">
          2<sup>${biasedExp}</sup>
        </div>
        <div style="font-size:11px;color:var(--muted)">Raw ${rawExp} - 127 = ${biasedExp}</div>
      </div>

      <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">Mantissa (23 Bits)</div>
        <div style="font-size:18px;font-weight:800;color:#34d399;margin:2px 0">
          ${(rawExp === 0 ? 0 : 1) + mantissaFrac < 2 ? (1 + mantissaFrac).toFixed(6) : "1.000000"}
        </div>
        <div style="font-size:11px;color:var(--muted)">${rawExp === 0 ? "0." : "1."}${mantissaBits.substring(0, 8)}...</div>
      </div>

      <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">Evaluation</div>
        <div style="font-size:18px;font-weight:800;color:var(--ink);margin:2px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
          ${isNaN(floatVal) ? "NaN" : floatVal}
        </div>
        <div style="font-size:11px;color:var(--muted)">${typeDesc}</div>
      </div>
    </div>

    <div style="background:#0f172a;border:1px solid #1e293b;border-radius:8px;padding:10px 12px;font-family:monospace;font-size:12px;color:#94a3b8;line-height:1.5">
      <span style="color:#64748b">// C / Embedded Microcontroller Type Punning</span><br>
      <span style="color:#38bdf8">union</span> { <span style="color:#f59e0b">float</span> f; <span style="color:#f59e0b">uint32_t</span> u; } converter = { .u = <span style="color:#34d399">${hexVal}</span> };<br>
      <span style="color:#f59e0b">float</span> value = converter.f; <span style="color:#64748b">// = ${floatVal}</span>
    </div>
  `;
}

// --- 🎨 Art & Design Studio: Physical Artist Pigment & Subtractive Paint Color Mixer ---
const ART_PIGMENTS_DB = [
  { id: "pw6", code: "PW6", name: "Titanium White", hex: "#ffffff", weight: 1.0, absorb: [0.02, 0.02, 0.02], scatter: 1.0, isOpaque: true },
  { id: "py35", code: "PY35", name: "Cadmium Lemon Yellow", hex: "#fff000", weight: 1.2, absorb: [0.05, 0.08, 0.95], scatter: 0.6, isOpaque: true },
  { id: "py43", code: "PY43", name: "Yellow Ochre", hex: "#c98f39", weight: 1.3, absorb: [0.25, 0.45, 0.85], scatter: 0.5, isOpaque: false },
  { id: "pr108", code: "PR108", name: "Cadmium Red Medium", hex: "#d01c1f", weight: 1.8, absorb: [0.08, 0.92, 0.90], scatter: 0.7, isOpaque: true },
  { id: "pv19", code: "PV19", name: "Quinacridone Magenta", hex: "#a40046", weight: 2.2, absorb: [0.15, 0.95, 0.55], scatter: 0.2, isOpaque: false },
  { id: "pb15", code: "PB15:3", name: "Phthalo Blue", hex: "#00356b", weight: 3.5, absorb: [0.95, 0.40, 0.05], scatter: 0.1, isOpaque: false },
  { id: "pb29", code: "PB29", name: "Ultramarine Blue", hex: "#18227d", weight: 1.5, absorb: [0.92, 0.75, 0.10], scatter: 0.3, isOpaque: false },
  { id: "pbr7", code: "PBr7", name: "Burnt Umber", hex: "#462b1a", weight: 1.6, absorb: [0.75, 0.82, 0.90], scatter: 0.4, isOpaque: false },
  { id: "pbk9", code: "PBk9", name: "Ivory / Carbon Black", hex: "#111111", weight: 4.0, absorb: [0.98, 0.98, 0.98], scatter: 0.8, isOpaque: true }
];

const PIGMENT_PRESETS = {
  spring_green: { pw6: 1, py35: 5, py43: 0, pr108: 0, pv19: 0, pb15: 1, pb29: 0, pbr7: 0, pbk9: 0 },
  deep_navy: { pw6: 0, py35: 0, py43: 0, pr108: 0, pv19: 0, pb15: 2, pb29: 4, pbr7: 2, pbk9: 1 },
  flesh_tone: { pw6: 6, py35: 0, py43: 2, pr108: 1, pv19: 0, pb15: 0, pb29: 0.2, pbr7: 0.5, pbk9: 0 },
  terracotta: { pw6: 1, py35: 0, py43: 4, pr108: 2, pv19: 0, pb15: 0, pb29: 0, pbr7: 2, pbk9: 0 },
  chromatic_black: { pw6: 0, py35: 0, py43: 0, pr108: 0, pv19: 0, pb15: 0, pb29: 3, pbr7: 3, pbk9: 0 },
  olive_drab: { pw6: 0, py35: 0, py43: 5, pr108: 0, pv19: 0, pb15: 0, pb29: 2, pbr7: 0, pbk9: 1 }
};

let pigmentPartsState = {
  pw6: 0, py35: 4, py43: 0, pr108: 0, pv19: 0, pb15: 1, pb29: 0, pbr7: 0, pbk9: 0
};

function renderPigmentSlidersUI() {
  const container = $("#art-pigment-sliders");
  if (!container) return;
  container.innerHTML = ART_PIGMENTS_DB.map(p => {
    const val = pigmentPartsState[p.id] || 0;
    return `
      <div class="pigment-tube-card">
        <span class="pigment-color-dot" style="background:${p.hex}"></span>
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700">
            <span>${p.name} <span style="font-size:9px;color:var(--muted)">(${p.code})</span></span>
            <span id="pigment-val-${p.id}" style="color:var(--ink)">${val}</span>
          </div>
          <input type="range" id="pigment-slider-${p.id}" min="0" max="10" step="0.5" value="${val}" style="width:100%;margin-top:4px">
        </div>
      </div>
    `;
  }).join("");

  ART_PIGMENTS_DB.forEach(p => {
    $(`#pigment-slider-${p.id}`)?.addEventListener("input", (e) => {
      const v = parseFloat(e.target.value) || 0;
      pigmentPartsState[p.id] = v;
      const lbl = $(`#pigment-val-${p.id}`);
      if (lbl) lbl.textContent = v;
      if ($("#art-pigment-preset")) $("#art-pigment-preset").value = "custom";
      updatePigmentMixer();
    });
  });
}

function updatePigmentMixer() {
  const res = $("#art-pigment-result");
  if (!res) return;

  let totalParts = 0;
  let totalWeightedParts = 0;
  let absR = 0, absG = 0, absB = 0;
  let totalScatter = 0;

  ART_PIGMENTS_DB.forEach(p => {
    const parts = pigmentPartsState[p.id] || 0;
    if (parts > 0) {
      totalParts += parts;
      const w = parts * p.weight;
      totalWeightedParts += w;
      absR += p.absorb[0] * w;
      absG += p.absorb[1] * w;
      absB += p.absorb[2] * w;
      totalScatter += p.scatter * parts;
    }
  });

  let mixedHex = "#ffffff";
  let r = 255, g = 255, b = 255;
  let tintHex = "#ffffff";

  if (totalParts > 0 && totalWeightedParts > 0) {
    const normAbsR = absR / totalWeightedParts;
    const normAbsG = absG / totalWeightedParts;
    const normAbsB = absB / totalWeightedParts;

    const density = Math.min(3.2, 0.8 + (totalWeightedParts * 0.25));
    r = Math.round(255 * Math.exp(-normAbsR * density));
    g = Math.round(255 * Math.exp(-normAbsG * density));
    b = Math.round(255 * Math.exp(-normAbsB * density));

    r = Math.max(8, Math.min(255, r));
    g = Math.max(8, Math.min(255, g));
    b = Math.max(8, Math.min(255, b));

    mixedHex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;

    const tr = Math.round(r * 0.5 + 255 * 0.5);
    const tg = Math.round(g * 0.5 + 255 * 0.5);
    const tb = Math.round(b * 0.5 + 255 * 0.5);
    tintHex = `#${((1 << 24) + (tr << 16) + (tg << 8) + tb).toString(16).slice(1)}`;
  }

  const avgScatter = totalParts > 0 ? (totalScatter / totalParts) : 1;
  let opacityLabel = "Semi-Transparent / Glaze";
  if (avgScatter > 0.7) opacityLabel = "Opaque / High Covering Power";
  else if (avgScatter > 0.45) opacityLabel = "Semi-Opaque";
  else if (avgScatter < 0.25) opacityLabel = "Transparent (Staining Glaze)";

  const recipeItems = ART_PIGMENTS_DB
    .filter(p => (pigmentPartsState[p.id] || 0) > 0)
    .map(p => {
      const parts = pigmentPartsState[p.id];
      const pct = totalParts > 0 ? ((parts / totalParts) * 100).toFixed(0) : 0;
      return `<strong>${parts} parts (${pct}%)</strong> ${p.name} [${p.code}]`;
    });

  res.innerHTML = `
    <div class="pigment-swatch-split">
      <div class="pigment-swatch-half" style="background:${mixedHex}">
        <span>Masstone (Full Body)</span>
        <span style="font-family:monospace;font-size:12px">${mixedHex.toUpperCase()}</span>
      </div>
      <div class="pigment-swatch-half" style="background:${tintHex};color:#0f172a;text-shadow:none">
        <span>50% Tint with White</span>
        <span style="font-family:monospace;font-size:12px">${tintHex.toUpperCase()}</span>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:10px;margin-bottom:12px">
      <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">Digital RGB Approximation</div>
        <div style="font-size:18px;font-weight:800;color:var(--ink);margin:2px 0">
          rgb(${r}, ${g}, ${b})
        </div>
        <div style="font-size:11px;color:var(--muted)">Hex ${mixedHex.toUpperCase()}</div>
      </div>

      <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">Film Opacity Rating</div>
        <div style="font-size:16px;font-weight:800;color:var(--green);margin:2px 0">
          ${opacityLabel}
        </div>
        <div style="font-size:11px;color:var(--muted)">Based on pigment index scattering</div>
      </div>

      <div style="padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;font-weight:700">Total Mix Volume</div>
        <div style="font-size:18px;font-weight:800;color:#0284c7;margin:2px 0">
          ${totalParts} parts
        </div>
        <div style="font-size:11px;color:var(--muted)">${recipeItems.length} tube pigments combined</div>
      </div>
    </div>

    <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:10px;font-size:12px;color:var(--ink);line-height:1.5">
      <strong>🎨 Physical Tube Recipe Breakdown:</strong><br>
      ${recipeItems.length > 0 ? recipeItems.join("<br>") : "<em>All tube sliders at 0. Move sliders to mix paint.</em>"}
    </div>

    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button type="button" class="button button-outline" data-action="copy-pigment-recipe" data-hex="${mixedHex}" style="font-size:12px">
        📋 Copy Recipe &amp; Hex
      </button>
      <button type="button" class="button button-outline" data-action="set-studio-palette-from-pigment" data-hex="${mixedHex}" style="font-size:12px">
        🎯 Set as Studio Base Color
      </button>
      <button type="button" class="button button-outline" data-action="add-pigment-to-materials" data-hex="${mixedHex}" style="font-size:12px">
        + Add Custom Paint to Materials
      </button>
    </div>
  `;
}

// --- 🧪 Art & Design: Epoxy Resin, Silicone & Casting Mix Calculator ---
function updateResinCalc() {
  const preset = $("#resin-type-preset")?.value || "tabletop_1_1";
  const shape = $("#resin-shape")?.value || "rect";
  const measureMode = $("#resin-measure-mode")?.value || "weight";
  const units = $("#resin-units")?.value || "imperial";
  const wastePct = parseFloat($("#resin-waste")?.value) || 0.10;
  const res = $("#resin-result");
  if (!res) return;

  const isMetric = units === "metric";

  // Dynamic label updating
  const lbl1 = $("#resin-lbl-dim1");
  const lbl2 = $("#resin-lbl-dim2");
  const lbl3 = $("#resin-lbl-dim3");
  const text1 = $("#resin-text-dim1");
  const text2 = $("#resin-text-dim2");
  const text3 = $("#resin-text-dim3");

  if (shape === "rect") {
    if (lbl1) lbl1.style.display = "block";
    if (lbl2) lbl2.style.display = "block";
    if (lbl3) lbl3.style.display = "block";
    if (text1) text1.textContent = isMetric ? "Length (cm)" : "Length (in)";
    if (text2) text2.textContent = isMetric ? "Width (cm)" : "Width (in)";
    if (text3) text3.textContent = isMetric ? "Depth / Thickness (cm)" : "Depth / Thickness (in)";
  } else if (shape === "cyl") {
    if (lbl1) lbl1.style.display = "block";
    if (lbl2) lbl2.style.display = "none";
    if (lbl3) lbl3.style.display = "block";
    if (text1) text1.textContent = isMetric ? "Diameter (cm)" : "Diameter (in)";
    if (text3) text3.textContent = isMetric ? "Depth / Height (cm)" : "Depth / Height (in)";
  } else {
    // direct
    if (lbl1) lbl1.style.display = "block";
    if (lbl2) lbl2.style.display = "none";
    if (lbl3) lbl3.style.display = "none";
    if (text1) text1.textContent = isMetric ? "Liquid Volume (ml)" : "Liquid Volume (fl oz)";
  }

  const dim1 = Math.max(0.1, parseFloat($("#resin-dim1")?.value) || 12);
  const dim2 = Math.max(0.1, parseFloat($("#resin-dim2")?.value) || 6);
  const dim3 = Math.max(0.01, parseFloat($("#resin-dim3")?.value) || 0.5);

  let volMl = 0;
  let depthIn = 0;
  if (shape === "rect") {
    if (isMetric) {
      volMl = dim1 * dim2 * dim3; // cm3 = ml
      depthIn = dim3 / 2.54;
    } else {
      const volIn3 = dim1 * dim2 * dim3;
      volMl = volIn3 * 16.3871;
      depthIn = dim3;
    }
  } else if (shape === "cyl") {
    if (isMetric) {
      volMl = Math.PI * Math.pow(dim1 / 2, 2) * dim3;
      depthIn = dim3 / 2.54;
    } else {
      const volIn3 = Math.PI * Math.pow(dim1 / 2, 2) * dim3;
      volMl = volIn3 * 16.3871;
      depthIn = dim3;
    }
  } else {
    volMl = isMetric ? dim1 : dim1 * 29.5735;
    depthIn = 0;
  }

  // Formulation properties
  let ratioA = 1, ratioB = 1, safeDepthIn = 0.25, potLifeMin = 25, cureHours = 24;
  let name = "1:1 Tabletop Epoxy";
  if (preset === "tabletop_1_1") {
    ratioA = 1; ratioB = 1; safeDepthIn = 0.25; potLifeMin = 25; cureHours = 24; name = "1:1 Tabletop Epoxy";
  } else if (preset === "deep_pour_2_1") {
    ratioA = 2; ratioB = 1; safeDepthIn = 2.0; potLifeMin = 90; cureHours = 72; name = "2:1 Deep Pour River Table Epoxy";
  } else if (preset === "casting_3_1") {
    ratioA = 3; ratioB = 1; safeDepthIn = 3.0; potLifeMin = 180; cureHours = 96; name = "3:1 Casting Resin";
  } else if (preset === "silicone_10_1") {
    ratioA = 10; ratioB = 1; safeDepthIn = 8.0; potLifeMin = 45; cureHours = 18; name = "10:1 Tin-Cure Mold Silicone";
  } else if (preset === "silicone_1_1") {
    ratioA = 1; ratioB = 1; safeDepthIn = 8.0; potLifeMin = 30; cureHours = 12; name = "1:1 Platinum Silicone";
  } else if (preset === "urethane_1_1") {
    ratioA = 1; ratioB = 1; safeDepthIn = 1.5; potLifeMin = 4; cureHours = 2; name = "1:1 Fast-Cast Polyurethane";
  }

  const totalMl = volMl * (1 + wastePct);
  const totalFlOz = totalMl / 29.5735;

  const fracA = ratioA / (ratioA + ratioB);
  const fracB = ratioB / (ratioA + ratioB);

  const partAMl = Math.round(totalMl * fracA);
  const partBMl = Math.round(totalMl * fracB);

  // Densities (g/ml): Part A ~1.12, Part B ~0.98
  const densityA = preset.startsWith("silicone") ? 1.15 : 1.12;
  const densityB = preset.startsWith("silicone") ? 1.05 : 0.98;

  const partAGrams = Math.round(partAMl * densityA);
  const partBGrams = Math.round(partBMl * densityB);
  const totalGrams = partAGrams + partBGrams;
  const partAoz = (partAGrams / 28.3495).toFixed(1);
  const partBoz = (partBGrams / 28.3495).toFixed(1);
  const totalOz = (totalGrams / 28.3495).toFixed(1);

  // Exotherm safety evaluation
  const isDepthDanger = shape !== "direct" && depthIn > (safeDepthIn * 1.35);
  const depthMm = (depthIn * 25.4).toFixed(1);
  const safeDepthMm = (safeDepthIn * 25.4).toFixed(1);

  let exothermHtml = "";
  if (isDepthDanger) {
    exothermHtml = `
      <div class="resin-exotherm-alert resin-alert-warn">
        <span style="font-size:20px;line-height:1">⚠️</span>
        <div>
          <strong>HIGH EXOTHERMIC HEAT WARNING!</strong><br>
          Pour depth of <strong>${depthIn.toFixed(2)}" (${depthMm} mm)</strong> exceeds the safe dissipation limit (<strong>${safeDepthIn}" / ${safeDepthMm} mm</strong>) for ${name}. The resin will overheat, boil, create bubbles, scorch yellow, or crack during cure!
          <br><em>Action: Pour in 2 or more sequential layers, OR switch formulation to <strong>2:1 Deep Pour Epoxy</strong>.</em>
        </div>
      </div>
    `;
  } else {
    exothermHtml = `
      <div class="resin-exotherm-alert resin-alert-safe">
        <span style="font-size:18px;line-height:1">✅</span>
        <div>
          <strong>Thermal Dissipation Safe:</strong> Pour depth of <strong>${depthIn.toFixed(2)}" (${depthMm} mm)</strong> is well within the recommended limit (max ${safeDepthIn}" / ${safeDepthMm} mm). Pot life: ~${potLifeMin} min · Demold time: ~${cureHours} hrs.
        </div>
      </div>
    `;
  }

  // Visual Flask percentages
  const pctA = Math.round(fracA * 100);
  const pctB = Math.round(fracB * 100);

  res.innerHTML = `
    <div class="resin-vessel-card">
      <div class="resin-flask-beaker" title="Part A (Resin) + Part B (Hardener)">
        <div class="resin-fluid-b" style="height:${pctB * 0.9}%" title="Part B: ${pctB}%"></div>
        <div class="resin-fluid-a" style="height:${pctA * 0.9}%" title="Part A: ${pctA}%"></div>
      </div>

      <div>
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px">TOTAL MIX REQUIRED (INCL. ${(wastePct * 100).toFixed(0)}% OVERAGE)</div>
        <div style="font-size:24px;font-weight:900;color:var(--ink);margin:2px 0 8px">
          ${measureMode === "weight" ? `${totalGrams} g (${totalOz} oz)` : `${Math.round(totalMl)} ml (${totalFlOz.toFixed(1)} fl oz)`}
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div style="background:var(--surface);border:1.5px solid #3b82f6;border-radius:6px;padding:8px 10px">
            <div style="font-size:10px;font-weight:800;color:#2563eb;text-transform:uppercase">PART A (RESIN / BASE)</div>
            <div style="font-size:17px;font-weight:800;color:var(--ink);margin-top:2px">
              ${measureMode === "weight" ? `${partAGrams} g` : `${partAMl} ml`}
            </div>
            <div style="font-size:11px;color:var(--muted)">${measureMode === "weight" ? `${partAoz} oz` : `${(partAMl / 29.5735).toFixed(1)} fl oz`} · ${pctA}%</div>
          </div>

          <div style="background:var(--surface);border:1.5px solid #06b6d4;border-radius:6px;padding:8px 10px">
            <div style="font-size:10px;font-weight:800;color:#0891b2;text-transform:uppercase">PART B (HARDENER / CATALYST)</div>
            <div style="font-size:17px;font-weight:800;color:var(--ink);margin-top:2px">
              ${measureMode === "weight" ? `${partBGrams} g` : `${partBMl} ml`}
            </div>
            <div style="font-size:11px;color:var(--muted)">${measureMode === "weight" ? `${partBoz} oz` : `${(partBMl / 29.5735).toFixed(1)} fl oz`} · ${pctB}%</div>
          </div>
        </div>
      </div>
    </div>

    ${exothermHtml}

    <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
      <button type="button" class="button button-outline" data-action="copy-resin-mix" style="font-size:12px" data-recipe="${name}: Part A = ${partAGrams}g (${partAMl}ml), Part B = ${partBGrams}g (${partBMl}ml) · Total = ${totalGrams}g">
        📋 Copy Recipe Card
      </button>
    </div>
  `;
}

function updateResinDegas() {
  const method = $("#resin-degas-method")?.value || "vacuum";
  const visc = $("#resin-viscosity")?.value || "high";
  const res = $("#resin-degas-result");
  if (!res) return;

  if (method === "vacuum") {
    res.innerHTML = `
      <div style="font-size:12px;line-height:1.5;color:var(--ink)">
        <strong>🎯 Vacuum Chamber Target:</strong> Pull full vacuum to <strong>-29 to -30 in-Hg (0.98 bar)</strong>.<br>
        • <strong>Moffat Rise &amp; Fall:</strong> Material will expand <strong>3× to 4× in volume</strong> as air boils out. Use a mixing cup with at least 4× headspace!<br>
        • <strong>Window:</strong> De-air for 90–120 seconds after the foam head collapses. Ensure pour is complete before pot life window ends.<br>
        • <strong>Best for:</strong> ${visc === "high" ? "High-viscosity platinum/tin silicones, clear encapsulation blocks" : "Deep pour epoxy mixes and low-viscosity urethane rubbers"}.
      </div>
    `;
  } else if (method === "pressure") {
    res.innerHTML = `
      <div style="font-size:12px;line-height:1.5;color:var(--ink)">
        <strong>🎯 Pressure Pot Target:</strong> Charge tank with clean compressed air to <strong>45 – 55 PSI (3.1 – 3.8 bar)</strong>.<br>
        • <strong>Physics:</strong> Compresses air bubbles down to microscopic size (&lt; 0.05mm), making them invisible to the human eye.<br>
        • <strong>Crucial Rule:</strong> Leave under continuous pressure for the <strong>ENTIRE cure cycle</strong> (do not vent early or bubbles will re-expand!).<br>
        • <strong>Safety Check:</strong> Verify safety pop-off pressure valve (60 PSI max) is certified before pressurizing!
      </div>
    `;
  } else {
    res.innerHTML = `
      <div style="font-size:12px;line-height:1.5;color:var(--ink)">
        <strong>🎯 Surface Torch / Heat Gun:</strong> Pass flame or hot air 6–8 inches above surface in swift sweeping motions.<br>
        • <strong>Mechanism:</strong> Breaks surface tension to pop surface bubbles. Does NOT remove deep trapped air bubbles.<br>
        • <strong>Warning:</strong> Never hold torch in one spot (ignites alcohol inks or scorches epoxy yellow).
      </div>
    `;
  }
}

function updateResinPigment() {
  const type = $("#resin-pigment-type")?.value || "mica";
  const batchG = Math.max(10, parseFloat($("#resin-pigment-batch")?.value) || 500);
  const res = $("#resin-pigment-result");
  if (!res) return;

  let advice = "";
  let targetAmount = "";
  if (type === "mica") {
    const minG = (batchG * 0.01).toFixed(1);
    const maxG = (batchG * 0.025).toFixed(1);
    targetAmount = `${minG}g – ${maxG}g (1.0% – 2.5%)`;
    advice = "Produces brilliant metallic, pearlescent shimmer and river table ribbons. Mix thoroughly into Part A before adding Part B hardener.";
  } else if (type === "liquid_dye") {
    const drops = Math.max(2, Math.round(batchG / 50));
    targetAmount = `~${drops} – ${drops * 3} drops (0.2% – 0.8%)`;
    advice = "Maintains crystal clear stained-glass transparency. Add drop-by-drop with tooth-pick until desired optical depth is achieved.";
  } else if (type === "alcohol_ink") {
    targetAmount = "5 – 15 drops on surface";
    advice = "Used for Petri dish cell bloom effects. Drop color inks followed by heavy white alcohol ink (Piñata White) to drive cells downwards.";
  } else if (type === "paste") {
    const pasteG = (batchG * 0.04).toFixed(1);
    targetAmount = `~${pasteG}g (3.0% – 5.0%)`;
    advice = "Provides 100% solid non-translucent blockout color. Excellent for coaster bottoms, ocean waves, and high-contrast resin art.";
  } else {
    const glowG = (batchG * 0.10).toFixed(1);
    targetAmount = `~${glowG}g (8% – 12%)`;
    advice = "Strontium aluminate glow crystals are heavy and sink. Let resin reach early gel state before stirring in powder for even suspension.";
  }

  res.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <span style="font-size:11px;font-weight:700;color:var(--muted)">RECOMMENDED DOSAGE:</span>
      <strong style="font-size:16px;color:var(--primary)">${targetAmount}</strong>
    </div>
    <div style="font-size:12px;color:var(--ink);line-height:1.45">${advice}</div>
  `;
}

function updateResinInhibition() {
  const master = $("#resin-master-mat")?.value || "sla_print";
  const rubber = $("#resin-rubber-class")?.value || "platinum";
  const res = $("#resin-inhibition-result");
  if (!res) return;

  if (master === "sla_print" && rubber === "platinum") {
    res.innerHTML = `
      <div class="resin-exotherm-alert resin-alert-warn">
        <span style="font-size:20px;line-height:1">🚫</span>
        <div>
          <strong>CRITICAL CURE INHIBITION DANGER:</strong><br>
          UV SLA / DLP resin 3D prints contain residual photoinitiators and sulfur compounds that permanently poison platinum silicone catalysts! The mold rubber touching the print will remain a sticky, un-cured gooey mess forever.<br>
          • <strong>Required Remedy:</strong> Bake the SLA print in an oven at 60°C (140°F) for 2 hours, post-cure under UV for 30 mins, and coat thoroughly with 2 coats of gloss acrylic lacquer or Inhibit X before pouring silicone! Or switch to Tin-Cure silicone.
        </div>
      </div>
    `;
  } else if (master === "clay_sulfur" && rubber === "platinum") {
    res.innerHTML = `
      <div class="resin-exotherm-alert resin-alert-warn">
        <span style="font-size:20px;line-height:1">🚫</span>
        <div>
          <strong>SULFUR INHIBITION ALERT:</strong> Traditional sulfur-based clay (Plasteline) poisons platinum silicone. Use only sulfur-free clay (Monster Clay / Chavant NSP) or seal clay with shellac.
        </div>
      </div>
    `;
  } else {
    res.innerHTML = `
      <div class="resin-exotherm-alert resin-alert-safe">
        <span style="font-size:18px;line-height:1">✅</span>
        <div>
          <strong>Cure Chemistry Compatible:</strong> Low risk of chemical cure inhibition. Apply 2 light coats of mold release (Mann Ease Release 200 or PVA) and allow solvent to dry for 10 minutes before pouring rubber.
        </div>
      </div>
    `;
  }
}

// --- 🧵 Filament Spool Rack & Multi-Spool Depot Management ---
const FILAMENT_DENSITIES = {
  PLA: 1.24,
  "PLA+": 1.24,
  PETG: 1.27,
  ABS: 1.04,
  ASA: 1.07,
  "TPU 95A": 1.21,
  TPU: 1.21,
  "PA-CF": 1.14,
  PA: 1.14,
  Nylon: 1.14,
  PC: 1.20,
  PVA: 1.23,
  Resin: 1.10
};

function getFilamentDensity(material) {
  if (!material) return 1.24;
  const matUpper = String(material).trim().toUpperCase();
  for (const [key, val] of Object.entries(FILAMENT_DENSITIES)) {
    if (matUpper.includes(key.toUpperCase())) return val;
  }
  return 1.24;
}

function calculateFilamentLength(netWeightG, material = "PLA", diameterMm = 1.75) {
  const density = getFilamentDensity(material);
  const volCm3 = Math.max(0, Number(netWeightG) || 0) / density;
  const radiusCm = (Number(diameterMm) || 1.75) / 20; // convert mm diameter to cm radius
  const areaCm2 = Math.PI * Math.pow(radiusCm, 2);
  const lengthM = areaCm2 > 0 ? (volCm3 / areaCm2) / 100 : 0;
  return Math.round(lengthM);
}

function getSpoolInventoryItems() {
  state.inventory = state.inventory || [];
  return state.inventory.filter(item => item.spoolData || item.category === "3D Printing & Filament");
}

function renderSpoolRack() {
  const grid = $("#spool-rack-grid");
  const statsBadge = $("#spool-rack-stats-badge");
  const spoolSelect = $("#print-cost-spool-select");
  if (!grid) return;

  const spools = getSpoolInventoryItems();
  const search = ($("#spool-rack-search")?.value || "").trim().toLowerCase();
  const matFilter = $("#spool-rack-material-filter")?.value || "all";
  const sortMode = $("#spool-rack-sort")?.value || "remaining-desc";

  // Filter spools
  let filtered = spools.filter(item => {
    const sData = item.spoolData || {};
    const mat = sData.material || "PLA";
    if (matFilter !== "all" && !mat.toLowerCase().includes(matFilter.toLowerCase())) return false;
    if (search) {
      const haystack = `${item.name} ${sData.material || ""} ${sData.brand || ""} ${sData.colorName || ""} ${sData.slot || ""} ${item.location || ""} ${item.notes || ""}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  // Sort spools
  filtered.sort((a, b) => {
    const aNet = Number(a.spoolData?.netWeight ?? a.quantity) || 0;
    const bNet = Number(b.spoolData?.netWeight ?? b.quantity) || 0;
    if (sortMode === "remaining-desc") return bNet - aNet;
    if (sortMode === "remaining-asc") return aNet - bNet;
    if (sortMode === "material") return (a.spoolData?.material || "").localeCompare(b.spoolData?.material || "");
    if (sortMode === "name") return (a.name || "").localeCompare(b.name || "");
    return 0;
  });

  // Calculate overall stats
  const totalNetG = spools.reduce((sum, s) => sum + (Number(s.spoolData?.netWeight ?? s.quantity) || 0), 0);
  const totalVal = spools.reduce((sum, s) => {
    const net = Number(s.spoolData?.netWeight ?? s.quantity) || 0;
    const pricePerG = Number(s.price) || ((Number(s.spoolData?.spoolCost) || 0) / (Number(s.spoolData?.initialNetWeight) || 1000));
    return sum + (net * pricePerG);
  }, 0);

  if (statsBadge) {
    statsBadge.textContent = `${spools.length} spool${spools.length === 1 ? "" : "s"} · ${(totalNetG / 1000).toFixed(2)}kg ($${totalVal.toFixed(2)})`;
  }

  // Update spool selector in #panel-print-cost
  if (spoolSelect) {
    const curVal = spoolSelect.value;
    spoolSelect.innerHTML = `<option value="">-- Manual Material &amp; Spool Price --</option>` +
      spools.map(s => {
        const net = Math.round(Number(s.spoolData?.netWeight ?? s.quantity) || 0);
        const cost = Number(s.spoolData?.spoolCost ?? s.cost ?? 22).toFixed(2);
        return `<option value="${s.id}" ${s.id === curVal ? "selected" : ""}>${escapeHTML(s.name)} (${net}g left · $${cost})</option>`;
      }).join("");
  }

  // Render cards
  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="spool-rack-empty">
        <div style="font-size:32px;margin-bottom:6px">🧵</div>
        <h4 style="margin:0 0 4px;font-size:15px;color:var(--ink)">${spools.length === 0 ? "No Filament Spools in Inventory Yet" : "No Spools Match Your Search"}</h4>
        <p style="font-size:12px;margin:0 0 12px;color:var(--muted)">${spools.length === 0 ? "Track filament polymer, color, tare weight, remaining grams, and AMS slots." : "Try clearing filters or search query."}</p>
        <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
          <button type="button" class="button button-primary button-small" data-action="open-add-spool-dialog">＋ Add New Spool</button>
          ${spools.length === 0 ? `<button type="button" class="button button-outline button-small" data-action="quick-add-sample-spools">✨ Load 5 Starter Spools</button>` : ""}
        </div>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(item => {
    const sData = item.spoolData || {};
    const material = sData.material || "PLA";
    const colorHex = sData.colorHex || "#333333";
    const colorName = sData.colorName || "Standard";
    const brand = sData.brand || item.supplier || "";
    const slot = sData.slot || item.location || "";
    const initialNet = Number(sData.initialNetWeight) || 1000;
    const tare = Number(sData.tareWeight) || 240;
    const netG = Math.max(0, Math.round(Number(sData.netWeight ?? item.quantity) || 0));
    const grossG = sData.grossWeight ? Math.round(sData.grossWeight) : (netG + tare);
    const spoolCost = Number(sData.spoolCost ?? item.cost ?? 21.99);
    const pricePerG = Number(item.price) || (spoolCost / initialNet);
    const remainingVal = netG * pricePerG;
    const remainingMeters = calculateFilamentLength(netG, material, sData.diameterMm || 1.75);
    const pct = Math.min(100, Math.max(0, Math.round((netG / initialNet) * 100)));
    const lowStock = netG <= (Number(item.lowStockThreshold) || 150);

    // Color tag class
    const matKey = material.toLowerCase().replace(/[^a-z]/g, "");
    const matTagClass = `material-${matKey}`;

    // Meter bar color
    const meterColor = pct <= 15 ? "#ef4444" : (pct <= 40 ? "#f59e0b" : "#10b981");

    return `
      <div class="spool-card ${lowStock ? 'low-stock' : ''}" data-id="${item.id}">
        <div class="spool-card-top">
          <div class="spool-reel-icon" style="background:${escapeHTML(colorHex)};" title="${escapeHTML(colorName)}">
            <div class="spool-reel-hub"></div>
          </div>
          <div class="spool-card-info">
            <div class="spool-badges-row">
              <span class="spool-tag ${matTagClass}">${escapeHTML(material)}</span>
              ${slot ? `<span class="spool-tag slot-tag">📍 ${escapeHTML(slot)}</span>` : ""}
              ${lowStock ? `<span class="spool-tag" style="background:#fee2e2;color:#b91c1c;border-color:#fca5a5">⚠️ Low Stock</span>` : ""}
            </div>
            <h4 class="spool-card-title" title="${escapeHTML(item.name)}">${escapeHTML(item.name)}</h4>
            <div class="spool-card-sub">
              <span>${brand ? escapeHTML(brand) : "Filament"}</span>
              <span>•</span>
              <span>$${spoolCost.toFixed(2)} spool</span>
            </div>
          </div>
        </div>

        <!-- Meter bar -->
        <div class="spool-meter-container">
          <div class="spool-meter-header">
            <span style="font-weight:600;color:var(--ink-secondary)">Remaining: ${pct}%</span>
            <span style="color:var(--muted)">Tare: ${tare}g · Gross: ${grossG}g</span>
          </div>
          <div class="spool-meter-track">
            <div class="spool-meter-fill" style="width:${pct}%;background:${meterColor};"></div>
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="spool-stats-grid">
          <div class="spool-stat-col">
            <span class="spool-stat-label">Net Grams</span>
            <span class="spool-stat-val">${netG}g</span>
          </div>
          <div class="spool-stat-col">
            <span class="spool-stat-label">Length</span>
            <span class="spool-stat-val">~${remainingMeters}m</span>
          </div>
          <div class="spool-stat-col">
            <span class="spool-stat-label">Asset Value</span>
            <span class="spool-stat-val">$${remainingVal.toFixed(2)}</span>
          </div>
        </div>

        ${item.notes ? `
          <div style="font-size:11px;color:var(--muted);background:var(--surface-sunken);padding:4px 8px;border-radius:6px;border:1px solid var(--border);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${escapeHTML(item.notes)}">
            ⚙️ ${escapeHTML(item.notes)}
          </div>
        ` : ""}

        <!-- Actions -->
        <div class="spool-card-actions">
          <div style="display:flex;gap:4px">
            <button type="button" class="button button-small button-primary" data-action="weigh-spool" data-id="${item.id}" title="Scale weigh-in or deduct print usage">⚖️ Weigh / Deduct</button>
            <button type="button" class="button button-small button-outline" data-action="load-spool-to-calc" data-id="${item.id}" title="Pre-fill 3D Print Cost Estimator with this spool">📥 Load to Calc</button>
          </div>
          <div style="display:flex;gap:4px">
            <button type="button" class="icon-link-btn" data-action="edit-spool" data-id="${item.id}" title="Edit spool details">✎</button>
            <button type="button" class="icon-link-btn danger-hover" data-action="delete-spool" data-id="${item.id}" title="Delete spool from rack & inventory">×</button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function openAddSpoolDialog(spoolId = null) {
  const dialog = $("#spool-dialog");
  const form = $("#spool-form");
  if (!dialog || !form) return;

  form.reset();
  const idInput = form.querySelector("input[name='id']");
  const delBtn = $("#delete-spool-modal-btn");
  const titleEl = $("#spool-dialog-title");

  if (spoolId) {
    const existing = (state.inventory || []).find(i => i.id === spoolId);
    if (!existing) return;
    const sData = existing.spoolData || {};

    if (idInput) idInput.value = existing.id;
    if (titleEl) titleEl.innerHTML = `Edit Filament Spool<span class="heading-period">.</span>`;
    if (delBtn) delBtn.classList.remove("hidden");

    if (form.elements.material) form.elements.material.value = sData.material || "PLA";
    if (form.elements.brand) form.elements.brand.value = sData.brand || existing.supplier || "";
    if (form.elements.colorName) form.elements.colorName.value = sData.colorName || "";
    if (form.elements.colorHex) form.elements.colorHex.value = sData.colorHex || "#333333";
    if (form.elements.spoolCost) form.elements.spoolCost.value = sData.spoolCost ?? existing.cost ?? 21.99;
    if (form.elements.diameterMm) form.elements.diameterMm.value = sData.diameterMm || 1.75;
    if (form.elements.initialNetWeight) form.elements.initialNetWeight.value = sData.initialNetWeight || 1000;
    const tare = sData.tareWeight ?? 240;
    if (form.elements.tareWeight) form.elements.tareWeight.value = tare;
    const net = sData.netWeight ?? existing.quantity ?? 1000;
    if (form.elements.grossWeight) form.elements.grossWeight.value = sData.grossWeight ?? (Number(net) + Number(tare));
    if (form.elements.netWeight) form.elements.netWeight.value = net;
    if (form.elements.location) form.elements.location.value = sData.slot || existing.location || "";
    if (form.elements.lowStockThreshold) form.elements.lowStockThreshold.value = existing.lowStockThreshold ?? 150;
    if (form.elements.notes) form.elements.notes.value = existing.notes || "";
  } else {
    if (idInput) idInput.value = "";
    if (titleEl) titleEl.innerHTML = `Add Filament Spool<span class="heading-period">.</span>`;
    if (delBtn) delBtn.classList.add("hidden");
    if (form.elements.material) form.elements.material.value = "PLA";
    if (form.elements.colorHex) form.elements.colorHex.value = "#333333";
    if (form.elements.spoolCost) form.elements.spoolCost.value = 21.99;
    if (form.elements.diameterMm) form.elements.diameterMm.value = "1.75";
    if (form.elements.initialNetWeight) form.elements.initialNetWeight.value = 1000;
    if (form.elements.tareWeight) form.elements.tareWeight.value = 240;
    if (form.elements.grossWeight) form.elements.grossWeight.value = 1240;
    if (form.elements.netWeight) form.elements.netWeight.value = 1000;
    if (form.elements.lowStockThreshold) form.elements.lowStockThreshold.value = 150;
  }

  updateSpoolModalWeightHint();
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

function closeSpoolDialog() {
  const dialog = $("#spool-dialog");
  if (!dialog) return;
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
}

function updateSpoolModalWeightHint() {
  const form = $("#spool-form");
  const hint = $("#spool-weight-calc-hint");
  if (!form || !hint) return;
  const gross = parseFloat(form.elements.grossWeight?.value) || 0;
  const tare = parseFloat(form.elements.tareWeight?.value) || 0;
  const net = Math.max(0, gross - tare);
  const mat = form.elements.material?.value || "PLA";
  const lengthM = calculateFilamentLength(net, mat, parseFloat(form.elements.diameterMm?.value) || 1.75);
  hint.innerHTML = `💡 Gross (${gross}g) − Tare (${tare}g) = <strong>${net}g net remaining</strong> (~${lengthM} meters of ${escapeHTML(mat)})`;
}

async function handleSpoolSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const idVal = form.elements.id?.value;
  const material = (form.elements.material?.value || "PLA").trim();
  const brand = (form.elements.brand?.value || "").trim();
  const colorName = (form.elements.colorName?.value || "Standard").trim();
  const colorHex = form.elements.colorHex?.value || "#333333";
  const spoolCost = Math.max(0, parseFloat(form.elements.spoolCost?.value) || 21.99);
  const diameterMm = parseFloat(form.elements.diameterMm?.value) || 1.75;
  const initialNet = Math.max(50, parseFloat(form.elements.initialNetWeight?.value) || 1000);
  const tare = Math.max(0, parseFloat(form.elements.tareWeight?.value) || 240);
  const gross = Math.max(0, parseFloat(form.elements.grossWeight?.value) || (initialNet + tare));
  const netWeight = Math.max(0, gross - tare);
  const location = (form.elements.location?.value || "").trim();
  const lowStockThreshold = Math.max(0, parseInt(form.elements.lowStockThreshold?.value, 10) || 150);
  const notes = (form.elements.notes?.value || "").trim();

  state.inventory = state.inventory || [];
  const existing = idVal ? state.inventory.find(i => i.id === idVal) : null;
  const itemId = existing?.id || ("spool_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6));

  const pricePerGram = Number((spoolCost / initialNet).toFixed(4));
  const name = `${brand ? brand + ' ' : ''}${material} - ${colorName}`;

  const spoolItem = {
    id: itemId,
    type: "material",
    name,
    category: "3D Printing & Filament",
    quantity: netWeight,
    unit: "g",
    price: pricePerGram,
    cost: spoolCost,
    location: location || "Spool Rack",
    supplier: brand || "",
    lowStockThreshold,
    notes,
    spoolData: {
      material,
      brand,
      colorName,
      colorHex,
      diameterMm,
      density: getFilamentDensity(material),
      spoolCost,
      initialNetWeight: initialNet,
      tareWeight: tare,
      grossWeight: gross,
      netWeight,
      slot: location || ""
    },
    updatedAt: new Date().toISOString()
  };

  if (existing) {
    Object.assign(existing, spoolItem);
  } else {
    spoolItem.createdAt = new Date().toISOString();
    state.inventory.unshift(spoolItem);
  }

  makeActivity("note", `Updated filament depot: ${name} (${netWeight}g remaining in ${location || "Spool Rack"})`);
  await persistState();
  renderSpoolRack();
  if (typeof renderInventory === "function") renderInventory();
  closeSpoolDialog();
  showToast(`Saved ${name} (${netWeight}g) to rack & inventory!`);
}

async function deleteSpool(spoolId) {
  if (!spoolId) return;
  state.inventory = state.inventory || [];
  const idx = state.inventory.findIndex(i => i.id === spoolId);
  if (idx === -1) return;
  const name = state.inventory[idx].name;
  if (!confirm(`Are you sure you want to remove "${name}" from your spool rack and inventory?`)) return;

  state.inventory.splice(idx, 1);
  await persistState();
  renderSpoolRack();
  if (typeof renderInventory === "function") renderInventory();
  closeSpoolDialog();
  showToast(`Removed "${name}" from rack and inventory.`);
}

let activeWeighSpoolId = null;
let activeWeighMode = "scale";

function openWeighSpoolDialog(spoolId) {
  const dialog = $("#spool-weigh-dialog");
  const spool = (state.inventory || []).find(i => i.id === spoolId);
  if (!dialog || !spool) return;

  activeWeighSpoolId = spoolId;
  activeWeighMode = "scale";
  const idInput = $("#spool-weigh-id");
  if (idInput) idInput.value = spoolId;

  const sData = spool.spoolData || {};
  const summaryEl = $("#spool-weigh-summary");
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="spool-reel-icon" style="background:${escapeHTML(sData.colorHex || '#333')};width:36px;height:36px">
        <div class="spool-reel-hub" style="width:12px;height:12px"></div>
      </div>
      <div style="flex:1">
        <h4 style="margin:0;font-size:13px;font-weight:700;color:var(--ink)">${escapeHTML(spool.name)}</h4>
        <div style="font-size:11px;color:var(--muted)">Current Net: <strong>${Math.round(spool.quantity || 0)}g</strong> · Tare: ${sData.tareWeight ?? 240}g</div>
      </div>
    `;
  }

  setWeighDialogMode("scale");

  const tare = Number(sData.tareWeight ?? 240);
  const curNet = Number(spool.quantity ?? 0);
  const grossInput = $("#spool-weigh-gross-input");
  const deductInput = $("#spool-weigh-deduct-input");
  if (grossInput) grossInput.value = curNet + tare;
  if (deductInput) deductInput.value = "";

  updateWeighDialogPreview();

  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function closeWeighSpoolDialog() {
  const dialog = $("#spool-weigh-dialog");
  if (!dialog) return;
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
  activeWeighSpoolId = null;
}

function setWeighDialogMode(mode) {
  activeWeighMode = mode;
  const isScale = mode === "scale";
  const scalePanel = $("#spool-weigh-scale-panel");
  const deductPanel = $("#spool-weigh-deduct-panel");
  if (scalePanel) scalePanel.style.display = isScale ? "block" : "none";
  if (deductPanel) deductPanel.style.display = isScale ? "none" : "block";
  $("#spool-weigh-tab-scale")?.classList.toggle("button-primary", isScale);
  $("#spool-weigh-tab-scale")?.classList.toggle("button-outline", !isScale);
  $("#spool-weigh-tab-deduct")?.classList.toggle("button-primary", !isScale);
  $("#spool-weigh-tab-deduct")?.classList.toggle("button-outline", isScale);
  updateWeighDialogPreview();
}

function updateWeighDialogPreview() {
  const spool = (state.inventory || []).find(i => i.id === activeWeighSpoolId);
  const previewBox = $("#spool-weigh-preview-box");
  if (!spool || !previewBox) return;

  const sData = spool.spoolData || {};
  const tare = Number(sData.tareWeight ?? 240);
  const curNet = Number(spool.quantity ?? 0);
  let newNet = curNet;

  if (activeWeighMode === "scale") {
    const gross = parseFloat($("#spool-weigh-gross-input")?.value);
    if (!isNaN(gross)) {
      newNet = Math.max(0, Math.round(gross - tare));
    }
  } else {
    const deduct = parseFloat($("#spool-weigh-deduct-input")?.value);
    if (!isNaN(deduct)) {
      newNet = Math.max(0, Math.round(curNet - deduct));
    }
  }

  const delta = newNet - curNet;
  const lengthM = calculateFilamentLength(newNet, sData.material || "PLA", sData.diameterMm || 1.75);
  const initialNet = Number(sData.initialNetWeight || 1000);
  const pct = Math.min(100, Math.round((newNet / initialNet) * 100));

  previewBox.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
      <span style="font-size:11px;font-weight:700">UPDATED NET FILAMENT:</span>
      <strong style="font-size:16px;color:var(--ink)">${newNet}g <span style="font-size:11px;font-weight:normal;color:var(--muted)">(${pct}% remaining)</span></strong>
    </div>
    <div style="font-size:11px;color:var(--ink-secondary)">
      ${delta !== 0 ? `Change: <strong style="color:${delta < 0 ? '#ef4444' : '#10b981'}">${delta > 0 ? '+' + delta : delta}g</strong> • ` : ""}
      Estimated remaining length: <strong>~${lengthM} meters</strong>
    </div>
  `;
}

async function handleWeighSpoolSubmit(event) {
  event.preventDefault();
  const spool = (state.inventory || []).find(i => i.id === activeWeighSpoolId);
  if (!spool) return;

  const sData = spool.spoolData || {};
  const tare = Number(sData.tareWeight ?? 240);
  const curNet = Number(spool.quantity ?? 0);
  let newNet = curNet;

  if (activeWeighMode === "scale") {
    const gross = parseFloat($("#spool-weigh-gross-input")?.value);
    if (isNaN(gross) || gross < 0) {
      showToast("Please enter a valid scale reading.", "warning");
      return;
    }
    newNet = Math.max(0, Math.round(gross - tare));
  } else {
    const deduct = parseFloat($("#spool-weigh-deduct-input")?.value);
    if (isNaN(deduct) || deduct <= 0) {
      showToast("Please enter print grams to deduct.", "warning");
      return;
    }
    newNet = Math.max(0, Math.round(curNet - deduct));
  }

  spool.quantity = newNet;
  if (!spool.spoolData) spool.spoolData = {};
  spool.spoolData.netWeight = newNet;
  spool.spoolData.grossWeight = newNet + tare;
  spool.updatedAt = new Date().toISOString();

  makeActivity("note", `Weighed spool ${spool.name}: updated to ${newNet}g remaining.`);
  await persistState();
  renderSpoolRack();
  if (typeof renderInventory === "function") renderInventory();
  closeWeighSpoolDialog();
  showToast(`Updated ${spool.name}: ${newNet}g remaining!`);
}

async function quickAddSampleSpools() {
  const starterSpools = [
    {
      brand: "Bambu Lab",
      material: "PLA",
      colorName: "Matte Charcoal",
      colorHex: "#262626",
      spoolCost: 19.99,
      tareWeight: 240,
      initialNetWeight: 1000,
      netWeight: 820,
      location: "AMS Slot 1",
      notes: "Nozzle 220°C, Bed 55°C, Flow 0.98"
    },
    {
      brand: "Polymaker",
      material: "PLA",
      colorName: "Alpine White",
      colorHex: "#f8f9fa",
      spoolCost: 21.99,
      tareWeight: 180,
      initialNetWeight: 1000,
      netWeight: 1000,
      location: "AMS Slot 2",
      notes: "Cardboard spool. PolyLite PLA."
    },
    {
      brand: "eSun",
      material: "PETG",
      colorName: "Fire Red",
      colorHex: "#dc2626",
      spoolCost: 18.50,
      tareWeight: 220,
      initialNetWeight: 1000,
      netWeight: 650,
      location: "AMS Slot 3",
      notes: "Nozzle 240°C, Bed 75°C, Fan 30%"
    },
    {
      brand: "Overture",
      material: "TPU 95A",
      colorName: "Royal Blue",
      colorHex: "#2563eb",
      spoolCost: 24.99,
      tareWeight: 140,
      initialNetWeight: 1000,
      netWeight: 420,
      location: "Drybox A",
      notes: "Direct drive only, Speed max 35mm/s"
    },
    {
      brand: "Bambu Lab",
      material: "PLA",
      colorName: "Silk Gold",
      colorHex: "#eab308",
      spoolCost: 23.99,
      tareWeight: 240,
      initialNetWeight: 1000,
      netWeight: 910,
      location: "AMS Slot 4",
      notes: "Outer perimeter slow 40mm/s for max shine"
    }
  ];

  state.inventory = state.inventory || [];
  let addedCount = 0;
  for (const s of starterSpools) {
    const pricePerG = Number((s.spoolCost / s.initialNetWeight).toFixed(4));
    const name = `${s.brand} ${s.material} - ${s.colorName}`;
    if (state.inventory.some(i => i.name === name)) continue;

    state.inventory.push({
      id: "spool_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      type: "material",
      name,
      category: "3D Printing & Filament",
      quantity: s.netWeight,
      unit: "g",
      price: pricePerG,
      cost: s.spoolCost,
      location: s.location,
      supplier: s.brand,
      lowStockThreshold: 150,
      notes: s.notes,
      spoolData: {
        material: s.material,
        brand: s.brand,
        colorName: s.colorName,
        colorHex: s.colorHex,
        diameterMm: 1.75,
        density: getFilamentDensity(s.material),
        spoolCost: s.spoolCost,
        initialNetWeight: s.initialNetWeight,
        tareWeight: s.tareWeight,
        grossWeight: s.netWeight + s.tareWeight,
        netWeight: s.netWeight,
        slot: s.location
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    addedCount++;
  }

  await persistState();
  renderSpoolRack();
  if (typeof renderInventory === "function") renderInventory();
  showToast(addedCount > 0 ? `Added ${addedCount} popular starter spools to your rack and inventory!` : "Starter spools are already in your inventory!");
}

function loadSpoolToCostCalc(spoolId) {
  const spool = (state.inventory || []).find(i => i.id === spoolId);
  if (!spool) return;

  const sData = spool.spoolData || {};
  const spoolSelect = $("#print-cost-spool-select");
  const priceInput = $("#print-spool-price");
  const techSelect = $("#print-tech");

  if (spoolSelect) spoolSelect.value = spoolId;
  if (priceInput) priceInput.value = sData.spoolCost ?? spool.cost ?? 22;
  if (techSelect) {
    if (sData.material === "Resin") techSelect.value = "sla";
    else techSelect.value = "fdm";
  }

  update3DPrintCostCalc();

  const costPanel = $("#panel-print-cost");
  if (costPanel) {
    costPanel.scrollIntoView({ behavior: "smooth", block: "center" });
    costPanel.style.outline = "2px solid var(--primary)";
    setTimeout(() => { costPanel.style.outline = ""; }, 1500);
  }

  showToast(`Loaded "${spool.name}" ($${(sData.spoolCost ?? spool.cost ?? 22).toFixed(2)}) into Cost Estimator.`);
}

async function deductJobFromSpool(spoolId, weightG) {
  const spool = (state.inventory || []).find(i => i.id === spoolId);
  if (!spool || !weightG) return;

  const curNet = Number(spool.quantity ?? 0);
  const newNet = Math.max(0, Math.round(curNet - weightG));
  const sData = spool.spoolData || {};
  const tare = Number(sData.tareWeight ?? 240);

  spool.quantity = newNet;
  if (!spool.spoolData) spool.spoolData = {};
  spool.spoolData.netWeight = newNet;
  spool.spoolData.grossWeight = newNet + tare;
  spool.updatedAt = new Date().toISOString();

  makeActivity("note", `Deducted ${weightG}g print from ${spool.name} (${newNet}g left).`);
  await persistState();
  renderSpoolRack();
  update3DPrintCostCalc();
  if (typeof renderInventory === "function") renderInventory();
  showToast(`Deducted ${weightG}g! ${spool.name} now has ${newNet}g remaining.`);
}

// --- 🖨️ 3D Printing Studio Tools ---
function update3DPrintCostCalc() {
  const tech = $("#print-tech")?.value || "fdm";
  const weightG = Math.max(1, parseFloat($("#print-weight-g")?.value) || 85);
  const spoolPrice = Math.max(1, parseFloat($("#print-spool-price")?.value) || 22);
  const timeHours = Math.max(0.1, parseFloat($("#print-time-hours")?.value) || 4.5);
  const machineRate = Math.max(0, parseFloat($("#print-machine-rate")?.value) || 2.50);
  const markupPct = Math.max(0, parseFloat($("#print-markup-pct")?.value) || 40);
  const res = $("#print-cost-result");
  const unitSpan = $("#print-weight-unit");
  if (unitSpan) unitSpan.textContent = tech === "fdm" ? "grams" : "ml";
  if (!res) return;

  const costPerUnit = spoolPrice / 1000;
  const materialCost = weightG * costPerUnit;
  const powerKw = tech === "fdm" ? 0.16 : 0.06;
  const powerKwh = timeHours * powerKw;
  const powerCost = powerKwh * 0.15;
  const machineCost = timeHours * machineRate;
  const consumablesCost = tech === "fdm" ? 0.50 : 1.50;
  const baseCost = materialCost + powerCost + machineCost + consumablesCost;
  const profit = baseCost * (markupPct / 100);
  const quoteTotal = baseCost + profit;

  const selectedSpoolId = $("#print-cost-spool-select")?.value;
  const activeSpool = selectedSpoolId ? (state.inventory || []).find(i => i.id === selectedSpoolId) : null;

  let spoolCalloutHTML = "";
  if (activeSpool) {
    const sData = activeSpool.spoolData || {};
    const curNet = Number(activeSpool.quantity ?? 0);
    const afterNet = Math.max(0, Math.round(curNet - weightG));
    const remMeters = calculateFilamentLength(afterNet, sData.material || "PLA", sData.diameterMm || 1.75);
    spoolCalloutHTML = `
      <div style="margin-top:10px;padding:8px 12px;background:var(--surface-sunken);border:1px solid var(--border);border-radius:6px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${escapeHTML(sData.colorHex || '#333')};border:1.5px solid rgba(0,0,0,0.2)"></span>
          <span style="font-size:12px;font-weight:600;color:var(--ink)">${escapeHTML(activeSpool.name)}</span>
          <span style="font-size:11px;color:var(--muted)">(${curNet}g on spool)</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="font-size:11px;color:var(--ink-secondary)">Remaining after job: <strong>${afterNet}g</strong> (~${remMeters}m)</span>
          <button type="button" class="button button-small button-outline" data-action="deduct-job-from-spool" data-spool-id="${activeSpool.id}" data-weight="${weightG}">✂️ Deduct ${weightG}g from Spool</button>
        </div>
      </div>
    `;
  }

  res.innerHTML = `
    <div class="print-cost-card">
      <div class="cnc-stat-pill">
        <span class="cnc-stat-pill-label">Material Cost</span>
        <span class="cnc-stat-pill-val">$${materialCost.toFixed(2)}</span>
      </div>
      <div class="cnc-stat-pill">
        <span class="cnc-stat-pill-label">Power &amp; Wear</span>
        <span class="cnc-stat-pill-val">$${(powerCost + consumablesCost).toFixed(2)}</span>
      </div>
      <div class="cnc-stat-pill">
        <span class="cnc-stat-pill-label">Machine Run Time</span>
        <span class="cnc-stat-pill-val">$${machineCost.toFixed(2)}</span>
      </div>
      <div class="cnc-stat-pill">
        <span class="cnc-stat-pill-label">Base Cost</span>
        <span class="cnc-stat-pill-val">$${baseCost.toFixed(2)}</span>
      </div>
      <div class="cnc-stat-pill" style="border-color:var(--primary)">
        <span class="cnc-stat-pill-label">Quote with Markup (${markupPct}%)</span>
        <span class="cnc-stat-pill-val" style="color:var(--primary)">$${quoteTotal.toFixed(2)}</span>
      </div>
    </div>
    ${spoolCalloutHTML}
  `;
}

function update3DFlowCalc() {
  const hotend = $("#print-hotend-type")?.value || "bambu";
  const nozzle = parseFloat($("#print-nozzle-dia")?.value) || 0.4;
  const layerH = parseFloat($("#print-layer-h")?.value) || 0.20;
  const speed = parseFloat($("#print-speed-mms")?.value) || 200;
  const res = $("#print-flow-result");
  if (!res) return;

  const hotendLimits = {
    standard: 14,
    volcano: 28,
    bambu: 32,
    supervolcano: 65
  };
  const limit = hotendLimits[hotend] || 32;

  const lineWidth = nozzle * 1.05;
  const flowMm3s = layerH * lineWidth * speed;
  const pct = Math.min(100, Math.round((flowMm3s / limit) * 100));
  const isOverLimit = flowMm3s > limit;
  const maxSafeSpeed = Math.floor(limit / (layerH * lineWidth));

  const barColor = isOverLimit ? "#ef4444" : (pct > 80 ? "#f59e0b" : "#10b981");

  res.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
      <span style="font-size:11px;font-weight:700">EXTRUSION MELT FLOW:</span>
      <strong style="font-size:16px;color:${barColor}">${flowMm3s.toFixed(1)} mm³/s <span style="font-size:11px;font-weight:normal;color:var(--muted)">/ ${limit} mm³/s max</span></strong>
    </div>

    <div class="print-flow-bar-wrap">
      <div class="print-flow-bar-fill" style="width:${pct}%;background:${barColor}"></div>
    </div>

    ${isOverLimit ? `
      <div style="font-size:11px;color:#ef4444;font-weight:700;margin-top:6px">
        ⚠️ FLOW RATE OVERLOAD: Speed (${speed} mm/s) exceeds hotend capacity! Reduce print speed to maximum <strong>${maxSafeSpeed} mm/s</strong> to prevent skipped steps and under-extrusion.
      </div>
    ` : `
      <div style="font-size:11px;color:#10b981;font-weight:600;margin-top:6px">
        ✅ Melt Flow Optimal: Safe headroom remaining. Max achievable speed at this layer height: <strong>${maxSafeSpeed} mm/s</strong>.
      </div>
    `}
  `;
}

function update3DSpoolCalc() {
  const grossG = Math.max(0, parseFloat($("#print-spool-gross")?.value) || 480);
  const tareG = parseFloat($("#print-spool-tare")?.value) || 250;
  const density = parseFloat($("#print-polymer-type")?.value) || 1.24;
  const checkG = Math.max(0, parseFloat($("#print-spool-check")?.value) || 120);
  const res = $("#print-spool-result");
  if (!res) return;

  const netG = Math.max(0, grossG - tareG);
  const volCm3 = netG / density;
  const areaMm2 = Math.PI * Math.pow(0.875, 2);
  const lengthM = Math.round((volCm3 * 1000) / areaMm2 / 1000);
  const lengthFt = Math.round(lengthM * 3.28084);
  const canFinish = netG >= checkG;

  res.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <span style="font-size:11px;font-weight:700">NET FILAMENT REMAINING:</span>
      <strong style="font-size:18px;color:var(--ink)">${netG} g <span style="font-size:12px;font-weight:normal;color:var(--muted)">(~${lengthM} m / ${lengthFt} ft)</span></strong>
    </div>

    <div style="padding:8px 10px;border-radius:6px;font-size:12px;${canFinish ? 'background:rgba(16,185,129,0.12);color:#065f46;border:1px solid #10b981' : 'background:rgba(239,68,68,0.12);color:#991b1b;border:1px solid #ef4444'}">
      ${canFinish ? `
        ✅ <strong>Sufficient Filament:</strong> You have <strong>${netG}g</strong> available, which easily covers your planned <strong>${checkG}g</strong> print with ${(netG - checkG)}g remaining!
      ` : `
        ⚠️ <strong>RUNOUT WARNING:</strong> You need <strong>${checkG}g</strong>, but only have <strong>${netG}g</strong> on this spool. You will run out <strong>${(checkG - netG)}g</strong> before completion!
      `}
    </div>
  `;
}

function update3DSlaGuide() {
  const chem = $("#print-resin-chem")?.value || "standard";
  const geom = $("#print-sla-geometry")?.value || "solid";
  const res = $("#print-sla-result");
  if (!res) return;

  const guideMap = {
    standard: { wash: "6 – 8 mins in 99% IPA (2-stage bath)", cure: "3 – 5 mins under 405nm UV chamber", shrink: "1.5%", slicerScale: "101.52%" },
    abs_like: { wash: "8 – 10 mins in 99% IPA", cure: "8 – 12 mins (rotate halfway)", shrink: "1.2%", slicerScale: "101.21%" },
    water_washable: { wash: "3 – 5 mins warm tap water (rinse bucket)", cure: "5 – 8 mins UV", shrink: "2.0%", slicerScale: "102.04%" },
    plant_based: { wash: "6 – 8 mins in 95%+ IPA", cure: "4 – 6 mins UV", shrink: "1.8%", slicerScale: "101.83%" },
    flexible: { wash: "5 mins in IPA + dry thoroughly", cure: "15 – 25 mins UV submerged in clean water", shrink: "2.5%", slicerScale: "102.56%" }
  };
  const g = guideMap[chem] || guideMap.standard;

  res.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:8px;font-size:12px">
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:8px 10px">
        <span style="font-size:10px;text-transform:uppercase;color:var(--muted);font-weight:700">1. Solvent Wash Time</span>
        <div style="font-size:14px;font-weight:700;color:var(--ink);margin-top:2px">${g.wash}</div>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:8px 10px">
        <span style="font-size:10px;text-transform:uppercase;color:var(--muted);font-weight:700">2. UV 405nm Final Cure</span>
        <div style="font-size:14px;font-weight:700;color:var(--ink);margin-top:2px">${g.cure}</div>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:8px 10px">
        <span style="font-size:10px;text-transform:uppercase;color:var(--muted);font-weight:700">3. Dimensional Slicer Scale</span>
        <div style="font-size:14px;font-weight:700;color:var(--primary);margin-top:2px">Scale to ${g.slicerScale} (+${g.shrink})</div>
      </div>
    </div>
  `;
}

// --- 🦢 Origami & Papercraft Studio Engine ---
let activeOrigamiModel = "crane";
let activeOrigamiStepIndex = 0;

const ORIGAMI_MODELS = {
  crane: {
    title: "Traditional Peace Crane (Orizuru)",
    difficulty: "Traditional • Intermediate",
    paperNeeded: "15×15 cm Kami or Washi (square)",
    steps: [
      {
        title: "Initial Diagonal Crease",
        desc: "Place paper with colored side DOWN. Fold along the diagonal from top-left to bottom-right, crease firmly with a bone folder, and unfold.",
        action: "Valley Fold & Unfold",
        paperSide: "Colored Side Down",
        svg: `
          <polygon points="50,50 350,50 350,350 50,350" fill="#f8fafc" stroke="#334155" stroke-width="2.5"/>
          <line x1="50" y1="50" x2="350" y2="350" stroke="#2563eb" stroke-width="2.5" stroke-dasharray="8,5"/>
          <path d="M 120,70 Q 220,180 320,300" fill="none" stroke="#10b981" stroke-width="3" marker-end="url(#origami-arrow)"/>
        `
      },
      {
        title: "Opposite Diagonal Crease",
        desc: "Fold the opposite diagonal from top-right to bottom-left, crease sharply, and unfold to form an 'X' crease.",
        action: "Valley Fold & Unfold",
        paperSide: "Colored Side Down",
        svg: `
          <polygon points="50,50 350,50 350,350 50,350" fill="#f8fafc" stroke="#334155" stroke-width="2.5"/>
          <line x1="50" y1="50" x2="350" y2="350" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3,3"/>
          <line x1="350" y1="50" x2="50" y2="350" stroke="#2563eb" stroke-width="2.5" stroke-dasharray="8,5"/>
          <path d="M 280,70 Q 180,180 80,300" fill="none" stroke="#10b981" stroke-width="3" marker-end="url(#origami-arrow)"/>
        `
      },
      {
        title: "Turn Over & Horizontal/Vertical Mountain Creases",
        desc: "Turn paper over so the colored side is facing UP. Fold in half horizontally and vertically, creasing both ways, then unfold.",
        action: "Mountain Folds (Colored Up)",
        paperSide: "Colored Side Facing Up",
        svg: `
          <polygon points="50,50 350,50 350,350 50,350" fill="#3b82f6" fill-opacity="0.25" stroke="#1d4ed8" stroke-width="2.5"/>
          <line x1="50" y1="200" x2="350" y2="200" stroke="#ef4444" stroke-width="2.5" stroke-dasharray="10,4,2,4"/>
          <line x1="200" y1="50" x2="200" y2="350" stroke="#ef4444" stroke-width="2.5" stroke-dasharray="10,4,2,4"/>
          <circle cx="200" cy="200" r="6" fill="#ef4444"/>
        `
      },
      {
        title: "Collapse into Preliminary / Square Base",
        desc: "Using the mountain and valley creases, push the top and bottom corners together while bringing left and right corners inward. Collapse flat into a square diamond base.",
        action: "Preliminary Base Collapse",
        paperSide: "Colored Flaps Outside",
        svg: `
          <polygon points="200,60 330,190 200,320 70,190" fill="#3b82f6" fill-opacity="0.3" stroke="#1d4ed8" stroke-width="2.5"/>
          <line x1="200" y1="60" x2="200" y2="320" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3,3"/>
          <line x1="70" y1="190" x2="330" y2="190" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3,3"/>
          <text x="200" y="345" font-size="12" text-anchor="middle" fill="#64748b" font-weight="bold">Open flaps at bottom point</text>
        `
      },
      {
        title: "Kite Creases & Top Triangle",
        desc: "With the open corners at the bottom, fold the lower left and right edges into the center vertical crease. Fold the top triangle flap down firmly and unfold all three.",
        action: "Pre-creasing for Petal Fold",
        paperSide: "Front Flaps Only",
        svg: `
          <polygon points="200,60 330,190 200,320 70,190" fill="#3b82f6" fill-opacity="0.3" stroke="#1d4ed8" stroke-width="2.5"/>
          <line x1="70" y1="190" x2="200" y2="240" stroke="#2563eb" stroke-width="2.5" stroke-dasharray="6,4"/>
          <line x1="330" y1="190" x2="200" y2="240" stroke="#2563eb" stroke-width="2.5" stroke-dasharray="6,4"/>
          <line x1="135" y1="125" x2="265" y2="125" stroke="#2563eb" stroke-width="2.5" stroke-dasharray="6,4"/>
          <path d="M 85,210 Q 150,260 195,245" fill="none" stroke="#10b981" stroke-width="2.5" marker-end="url(#origami-arrow)"/>
          <path d="M 315,210 Q 250,260 205,245" fill="none" stroke="#10b981" stroke-width="2.5" marker-end="url(#origami-arrow)"/>
        `
      },
      {
        title: "Petal Fold into Bird Base",
        desc: "Lift the single bottom point up along the horizontal crease. Allow the left and right outer sides to collapse inward along your pre-creases into an elongated diamond.",
        action: "Petal Fold (Repeat on Back)",
        paperSide: "Elongated Diamond Base",
        svg: `
          <polygon points="200,30 290,190 200,370 110,190" fill="#3b82f6" fill-opacity="0.35" stroke="#1d4ed8" stroke-width="2.5"/>
          <line x1="200" y1="30" x2="200" y2="370" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3,3"/>
          <line x1="110" y1="190" x2="290" y2="190" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3,3"/>
          <text x="200" y="390" font-size="11" text-anchor="middle" fill="#15803d" font-weight="bold">Bird Base Complete (both sides)</text>
        `
      },
      {
        title: "Narrow Neck and Tail Legs",
        desc: "Fold the lower outer edges of both front legs into the center vertical crease. Flip the model over and repeat on the back.",
        action: "Valley Folds on Legs",
        paperSide: "Front and Back",
        svg: `
          <polygon points="200,40 260,190 200,360 140,190" fill="#3b82f6" fill-opacity="0.35" stroke="#1d4ed8" stroke-width="2"/>
          <line x1="140" y1="190" x2="200" y2="360" stroke="#2563eb" stroke-width="2" stroke-dasharray="5,3"/>
          <line x1="260" y1="190" x2="200" y2="360" stroke="#2563eb" stroke-width="2" stroke-dasharray="5,3"/>
          <path d="M 155,240 L 195,250" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#origami-arrow)"/>
          <path d="M 245,240 L 205,250" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#origami-arrow)"/>
        `
      },
      {
        title: "Inside Reverse Folds & Wings Flap",
        desc: "Inside reverse-fold the left leg upward to form the neck and fold its tip downward for the head. Inside reverse-fold the right leg upward for the tail. Gently pull the wings apart to inflate the crane's body!",
        action: "Inside Reverse Folds (Finish)",
        paperSide: "3D Origami Crane",
        svg: `
          <!-- Crane Body and Wings -->
          <polygon points="200,160 110,120 180,220" fill="#3b82f6" stroke="#1d4ed8" stroke-width="2"/>
          <polygon points="200,160 290,120 220,220" fill="#3b82f6" stroke="#1d4ed8" stroke-width="2"/>
          <polygon points="180,220 200,170 220,220 200,240" fill="#60a5fa" stroke="#1d4ed8" stroke-width="2"/>
          <!-- Neck and Head -->
          <polyline points="180,210 110,110 85,125" stroke="#1d4ed8" stroke-width="4" stroke-linecap="round" fill="none"/>
          <!-- Tail -->
          <polyline points="220,210 290,120" stroke="#1d4ed8" stroke-width="4" stroke-linecap="round" fill="none"/>
          <text x="200" y="320" font-size="14" text-anchor="middle" fill="#047857" font-weight="bold">🎉 Peace Crane Complete!</text>
        `
      }
    ]
  },
  flower: {
    title: "Kusudama Bell Flower (Petal Unit)",
    difficulty: "Modular • Beginner-Intermediate",
    paperNeeded: "7.5×7.5 cm or 15×15 cm square",
    steps: [
      {
        title: "Diagonal Triangle Fold",
        desc: "Fold square paper in half diagonally to form a triangle with the apex pointing up.",
        action: "Valley Fold",
        paperSide: "Colored Side Outside",
        svg: `<polygon points="50,330 350,330 200,70" fill="#ec4899" fill-opacity="0.3" stroke="#be185d" stroke-width="2.5"/>`
      },
      {
        title: "Fold Bottom Corners to Apex",
        desc: "Fold both bottom-left and bottom-right corners up to meet the top point, creating a compact diamond.",
        action: "Valley Folds to Apex",
        paperSide: "Diamond Shape",
        svg: `
          <polygon points="200,70 290,200 200,330 110,200" fill="#ec4899" fill-opacity="0.3" stroke="#be185d" stroke-width="2.5"/>
          <line x1="200" y1="70" x2="200" y2="330" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3,3"/>
          <line x1="110" y1="200" x2="290" y2="200" stroke="#2563eb" stroke-width="2" stroke-dasharray="5,3"/>
        `
      },
      {
        title: "Squash Fold Outer Flaps",
        desc: "Open each flap slightly, insert finger, and squash fold flat so the crease aligns with the outer edge.",
        action: "Squash Fold (Both Flaps)",
        paperSide: "Kite Wing Flaps",
        svg: `
          <polygon points="200,70 340,160 270,330 130,330 60,160" fill="#ec4899" fill-opacity="0.35" stroke="#be185d" stroke-width="2.5"/>
          <line x1="130" y1="160" x2="60" y2="160" stroke="#2563eb" stroke-width="2" stroke-dasharray="5,3"/>
          <line x1="270" y1="160" x2="340" y2="160" stroke="#2563eb" stroke-width="2" stroke-dasharray="5,3"/>
        `
      },
      {
        title: "Fold Outer Tips Down & Fold Wings in Half",
        desc: "Fold down the extending triangular tips level with the outer edges. Then fold both flaps in half along the existing crease lines.",
        action: "Valley Folds",
        paperSide: "Folded Wings",
        svg: `
          <polygon points="200,70 300,190 200,310 100,190" fill="#ec4899" fill-opacity="0.4" stroke="#be185d" stroke-width="2.5"/>
          <line x1="200" y1="70" x2="200" y2="310" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3,3"/>
          <path d="M 120,200 Q 150,240 185,220" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#origami-arrow)"/>
          <path d="M 280,200 Q 250,240 215,220" fill="none" stroke="#10b981" stroke-width="2" marker-end="url(#origami-arrow)"/>
        `
      },
      {
        title: "Roll into Cone Petal & Glue Seam",
        desc: "Bring the two outer flaps together to form a 3D conical petal with 3 stamens inside! Glue or tape the outer edges together. Make 5 units to form a complete Kusudama flower.",
        action: "Cone Assembly (3D)",
        paperSide: "Finished Petal Unit",
        svg: `
          <path d="M 130,280 Q 200,340 270,280 L 230,120 Q 200,150 170,120 Z" fill="#ec4899" fill-opacity="0.5" stroke="#be185d" stroke-width="2.5"/>
          <path d="M 170,120 Q 200,190 230,120" fill="none" stroke="#fbcfe8" stroke-width="3"/>
          <text x="200" y="360" font-size="13" text-anchor="middle" fill="#be185d" font-weight="bold">🌸 Petal Unit Ready (Assemble 5 for Flower)</text>
        `
      }
    ]
  },
  sonobe: {
    title: "Sonobe Modular Polyhedron Unit",
    difficulty: "Modular Building Block",
    paperNeeded: "7.5×7.5 cm square sheet",
    steps: [
      {
        title: "Horizontal Half Crease",
        desc: "Fold the square in half horizontally and unfold to create a center reference crease.",
        action: "Valley Fold & Unfold",
        paperSide: "White Side Up",
        svg: `
          <polygon points="50,50 350,50 350,350 50,350" fill="#f8fafc" stroke="#334155" stroke-width="2.5"/>
          <line x1="50" y1="200" x2="350" y2="200" stroke="#2563eb" stroke-width="2.5" stroke-dasharray="8,5"/>
        `
      },
      {
        title: "Cupboard / Shutter Folds",
        desc: "Fold both top and bottom edges into the center crease line.",
        action: "Valley Folds to Center",
        paperSide: "Cupboard Fold",
        svg: `
          <polygon points="50,125 350,125 350,275 50,275" fill="#6366f1" fill-opacity="0.3" stroke="#4338ca" stroke-width="2.5"/>
          <line x1="50" y1="200" x2="350" y2="200" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3,3"/>
        `
      },
      {
        title: "Fold Opposite Corners into Triangles",
        desc: "Fold the top-left corner down to the edge, and bottom-right corner up to the edge. Unfold.",
        action: "Corner Triangles",
        paperSide: "Pre-creasing",
        svg: `
          <polygon points="50,125 350,125 350,275 50,275" fill="#6366f1" fill-opacity="0.3" stroke="#4338ca" stroke-width="2.5"/>
          <line x1="50" y1="125" x2="125" y2="200" stroke="#2563eb" stroke-width="2" stroke-dasharray="5,3"/>
          <line x1="350" y1="275" x2="275" y2="200" stroke="#2563eb" stroke-width="2" stroke-dasharray="5,3"/>
        `
      },
      {
        title: "Tuck Tabs into Pockets (Parallelogram)",
        desc: "Tuck the bottom-left diagonal flap under the top shutter layer, and the top-right diagonal flap under the bottom shutter layer. Flatten into a parallelogram.",
        action: "Tuck into Pockets",
        paperSide: "Sonobe Parallelogram",
        svg: `
          <polygon points="80,275 220,125 320,125 180,275" fill="#6366f1" fill-opacity="0.4" stroke="#4338ca" stroke-width="2.5"/>
          <line x1="130" y1="200" x2="270" y2="200" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3,3"/>
        `
      },
      {
        title: "Turn Over & Crease Tabs (Finished Unit)",
        desc: "Flip the unit over. Fold the two triangular points inward to form a square with two insertion tabs and two receiving pockets. Ready to connect!",
        action: "Mountain Folds on Tabs",
        paperSide: "Modular Unit Complete",
        svg: `
          <polygon points="120,120 280,120 280,280 120,280" fill="#6366f1" fill-opacity="0.5" stroke="#4338ca" stroke-width="2.5"/>
          <line x1="120" y1="120" x2="280" y2="280" stroke="#2563eb" stroke-width="2.5" stroke-dasharray="6,4"/>
          <text x="200" y="325" font-size="12" text-anchor="middle" fill="#4338ca" font-weight="bold">📦 Sonobe Unit Ready (Tabs &amp; Pockets)</text>
        `
      }
    ]
  },
  butterfly: {
    title: "Japanese Butterfly (Chocho)",
    difficulty: "Traditional • Beginner-Intermediate",
    paperNeeded: "15×15 cm Kami",
    steps: [
      {
        title: "Diagonal & Orthogonal Creases",
        desc: "Crease both diagonals (valley) and both midpoints (mountain).",
        action: "Valley & Mountain Creases",
        paperSide: "Colored Side Down",
        svg: `
          <polygon points="50,50 350,50 350,350 50,350" fill="#f8fafc" stroke="#334155" stroke-width="2"/>
          <line x1="50" y1="50" x2="350" y2="350" stroke="#2563eb" stroke-width="2" stroke-dasharray="6,4"/>
          <line x1="350" y1="50" x2="50" y2="350" stroke="#2563eb" stroke-width="2" stroke-dasharray="6,4"/>
          <line x1="50" y1="200" x2="350" y2="200" stroke="#ef4444" stroke-width="2" stroke-dasharray="8,3,2,3"/>
        `
      },
      {
        title: "Collapse into Waterbomb Base",
        desc: "Push horizontal creases inward and collapse into a wide triangle with 2 flaps on each side.",
        action: "Waterbomb Base",
        paperSide: "Triangle Base",
        svg: `<polygon points="50,280 350,280 200,100" fill="#f59e0b" fill-opacity="0.35" stroke="#d97706" stroke-width="2.5"/>`
      },
      {
        title: "Fold Top Flaps to Center Apex",
        desc: "Fold only the top layer's left and right bottom points up to meet the top apex.",
        action: "Valley Folds to Apex",
        paperSide: "Front Flaps Only",
        svg: `
          <polygon points="50,280 350,280 200,100" fill="#f59e0b" fill-opacity="0.35" stroke="#d97706" stroke-width="2.5"/>
          <polygon points="200,100 135,190 200,280" fill="#f59e0b" stroke="#d97706" stroke-width="2"/>
          <polygon points="200,100 265,190 200,280" fill="#f59e0b" stroke="#d97706" stroke-width="2"/>
        `
      },
      {
        title: "Flip Over & Pull Bottom Corner Up Past Top Edge",
        desc: "Turn model over. Pull the bottom corner up past the top horizontal edge so a small tip protrudes over the top edge.",
        action: "Valley Fold Past Edge",
        paperSide: "Back Side",
        svg: `
          <polygon points="60,240 340,240 200,120" fill="#f59e0b" fill-opacity="0.4" stroke="#d97706" stroke-width="2.5"/>
          <polygon points="180,120 220,120 200,80" fill="#d97706" stroke="#b45309" stroke-width="2"/>
        `
      },
      {
        title: "Wrap Tip Around Edge & Fold Center to Form Wings",
        desc: "Fold the protruding tip over the edge to lock the paper. Pinch the center spine vertically to spread the butterfly wings!",
        action: "Lock Tip & Spread Wings",
        paperSide: "Butterfly Complete",
        svg: `
          <polygon points="200,180 80,100 110,250" fill="#f59e0b" stroke="#d97706" stroke-width="2.5"/>
          <polygon points="200,180 320,100 290,250" fill="#f59e0b" stroke="#d97706" stroke-width="2.5"/>
          <ellipse cx="200" cy="180" rx="8" ry="30" fill="#b45309"/>
          <text x="200" y="320" font-size="14" text-anchor="middle" fill="#d97706" font-weight="bold">🦋 Japanese Butterfly Complete!</text>
        `
      }
    ]
  },
  frog: {
    title: "Traditional Jumping Frog",
    difficulty: "Action Origami • Intermediate",
    paperNeeded: "15×15 cm Kami or Index Card",
    steps: [
      {
        title: "Top Waterbomb Base",
        desc: "Fold the top half of the rectangle into an X-crease and collapse into a waterbomb triangle.",
        action: "Waterbomb on Top Half",
        paperSide: "Green Kami",
        svg: `
          <polygon points="100,170 300,170 200,50" fill="#10b981" fill-opacity="0.35" stroke="#059669" stroke-width="2.5"/>
          <rect x="120" y="170" width="160" height="150" fill="#10b981" fill-opacity="0.2" stroke="#059669" stroke-width="2.5"/>
        `
      },
      {
        title: "Fold Front Legs & Bottom Flaps",
        desc: "Fold the front triangular flaps up and out at an angle for the front legs. Fold the bottom rectangle up to meet the base of the triangle.",
        action: "Leg Folds & Bottom Shutter",
        paperSide: "Front Legs Formed",
        svg: `
          <polygon points="100,170 300,170 200,50" fill="#10b981" fill-opacity="0.35" stroke="#059669" stroke-width="2"/>
          <polyline points="200,50 140,110 90,80" stroke="#059669" stroke-width="3" fill="none"/>
          <polyline points="200,50 260,110 310,80" stroke="#059669" stroke-width="3" fill="none"/>
          <rect x="120" y="170" width="160" height="90" fill="#10b981" fill-opacity="0.3" stroke="#059669" stroke-width="2"/>
        `
      },
      {
        title: "Accordion Pleat for Spring Action",
        desc: "Fold the lower half up horizontally, then fold it back down halfway to create a spring pleat. Press the tail with your finger and slide off to make the frog jump!",
        action: "Z-Fold Accordion Spring",
        paperSide: "Jumping Action Complete",
        svg: `
          <polygon points="120,180 280,180 200,90" fill="#10b981" fill-opacity="0.5" stroke="#059669" stroke-width="2.5"/>
          <polyline points="200,90 130,130 90,110" stroke="#059669" stroke-width="3.5" fill="none"/>
          <polyline points="200,90 270,130 310,110" stroke="#059669" stroke-width="3.5" fill="none"/>
          <polyline points="150,180 120,240 80,260" stroke="#059669" stroke-width="3.5" fill="none"/>
          <polyline points="250,180 280,240 320,260" stroke="#059669" stroke-width="3.5" fill="none"/>
          <text x="200" y="320" font-size="14" text-anchor="middle" fill="#059669" font-weight="bold">🐸 Press Spring Tail to Jump!</text>
        `
      }
    ]
  },
  lotus: {
    title: "Origami Water Lotus (Blintz Base)",
    difficulty: "Traditional • Intermediate",
    paperNeeded: "15×15 cm or 20×20 cm Duo Paper",
    steps: [
      {
        title: "First Blintz Fold",
        desc: "Fold all 4 corners into the exact center of the square.",
        action: "Blintz Fold (All 4 Corners)",
        paperSide: "Smaller Square",
        svg: `
          <polygon points="200,60 340,200 200,340 60,200" fill="#a855f7" fill-opacity="0.3" stroke="#7e22ce" stroke-width="2.5"/>
          <line x1="200" y1="60" x2="200" y2="340" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3,3"/>
          <line x1="60" y1="200" x2="340" y2="200" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3,3"/>
        `
      },
      {
        title: "Second Blintz Fold",
        desc: "Without turning over, fold all 4 new corners into the center again.",
        action: "Second Blintz Fold",
        paperSide: "Even Smaller Square",
        svg: `<rect x="110" y="110" width="180" height="180" fill="#a855f7" fill-opacity="0.4" stroke="#7e22ce" stroke-width="2.5"/>`
      },
      {
        title: "Turn Over & Third Blintz Fold",
        desc: "Turn the paper over to the smooth side. Fold all 4 corners into the center for the third time.",
        action: "Third Blintz (Opposite Side)",
        paperSide: "Turned Over",
        svg: `<polygon points="200,120 280,200 200,280 120,200" fill="#a855f7" fill-opacity="0.45" stroke="#7e22ce" stroke-width="2.5"/>`
      },
      {
        title: "Pull Up Petals from Underneath",
        desc: "Reach underneath each corner from behind and gently curl the flaps forward and upward over the corners to bloom the lotus petals!",
        action: "Petal Bloom Action",
        paperSide: "3D Blossom",
        svg: `
          <circle cx="200" cy="200" r="40" fill="#fef08a" stroke="#ca8a04" stroke-width="2"/>
          <path d="M 200,160 Q 200,90 200,60 Q 220,120 200,160 Z" fill="#c084fc" stroke="#7e22ce" stroke-width="2"/>
          <path d="M 200,240 Q 200,310 200,340 Q 180,280 200,240 Z" fill="#c084fc" stroke="#7e22ce" stroke-width="2"/>
          <path d="M 160,200 Q 90,200 60,200 Q 120,220 160,200 Z" fill="#c084fc" stroke="#7e22ce" stroke-width="2"/>
          <path d="M 240,200 Q 310,200 340,200 Q 280,180 240,200 Z" fill="#c084fc" stroke="#7e22ce" stroke-width="2"/>
          <text x="200" y="370" font-size="14" text-anchor="middle" fill="#7e22ce" font-weight="bold">🪷 Water Lotus Bloomed!</text>
        `
      }
    ]
  },
  waterbomb: {
    title: "Waterbomb Balloon Base",
    difficulty: "Base Model • Beginner",
    paperNeeded: "15×15 cm Kami or Copy Paper",
    steps: [
      {
        title: "Diagonal Valley Folds",
        desc: "Fold both diagonals in half and unfold.",
        action: "Valley Folds",
        paperSide: "Colored Side Down",
        svg: `
          <polygon points="50,50 350,50 350,350 50,350" fill="#f8fafc" stroke="#334155" stroke-width="2"/>
          <line x1="50" y1="50" x2="350" y2="350" stroke="#2563eb" stroke-width="2.5" stroke-dasharray="6,4"/>
          <line x1="350" y1="50" x2="50" y2="350" stroke="#2563eb" stroke-width="2.5" stroke-dasharray="6,4"/>
        `
      },
      {
        title: "Turn Over & Horizontal Mountain Fold",
        desc: "Flip the paper over. Fold in half horizontally and unfold.",
        action: "Mountain Fold",
        paperSide: "Colored Side Up",
        svg: `
          <polygon points="50,50 350,50 350,350 50,350" fill="#0284c7" fill-opacity="0.3" stroke="#0369a1" stroke-width="2"/>
          <line x1="50" y1="200" x2="350" y2="200" stroke="#ef4444" stroke-width="2.5" stroke-dasharray="8,3,2,3"/>
        `
      },
      {
        title: "Push Sides in to Collapse Base",
        desc: "Push the left and right horizontal edges toward each other; the top and bottom will collapse forward into a layered triangle.",
        action: "Collapse Waterbomb Base",
        paperSide: "Waterbomb Complete",
        svg: `
          <polygon points="50,310 350,310 200,100" fill="#0284c7" fill-opacity="0.4" stroke="#0369a1" stroke-width="2.5"/>
          <line x1="200" y1="100" x2="200" y2="310" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3,3"/>
          <text x="200" y="350" font-size="13" text-anchor="middle" fill="#0369a1" font-weight="bold">💧 Waterbomb Base Complete!</text>
        `
      }
    ]
  }
};

function renderOrigamiStep(modelKey = activeOrigamiModel, stepIndex = activeOrigamiStepIndex) {
  const model = ORIGAMI_MODELS[modelKey];
  if (!model) return;
  const steps = model.steps || [];
  if (stepIndex < 0) stepIndex = 0;
  if (stepIndex >= steps.length) stepIndex = steps.length - 1;
  activeOrigamiStepIndex = stepIndex;
  activeOrigamiModel = modelKey;

  const currentStep = steps[stepIndex];
  if (!currentStep) return;

  const diffEl = $("#origami-model-difficulty");
  const stepLabel = $("#origami-step-label");
  const stepTitle = $("#origami-step-title");
  const stepDesc = $("#origami-step-desc");
  const actionTag = $("#origami-step-action-tag");
  const paperSide = $("#origami-step-paper-side");
  const prevBtn = $("#origami-prev-step");
  const nextBtn = $("#origami-next-step");
  const svgEl = $("#origami-svg");

  if (diffEl) diffEl.textContent = model.difficulty;
  if (stepLabel) stepLabel.textContent = `Step ${stepIndex + 1} of ${steps.length}`;
  if (stepTitle) stepTitle.textContent = currentStep.title;
  if (stepDesc) stepDesc.textContent = currentStep.desc;
  if (actionTag) actionTag.textContent = currentStep.action;
  if (paperSide) paperSide.textContent = currentStep.paperSide;

  if (prevBtn) prevBtn.disabled = stepIndex === 0;
  if (nextBtn) {
    if (stepIndex === steps.length - 1) {
      nextBtn.textContent = "Finish ✓";
      nextBtn.disabled = true;
    } else {
      nextBtn.textContent = "Next ▶";
      nextBtn.disabled = false;
    }
  }

  if (svgEl) {
    svgEl.innerHTML = `
      <defs>
        <marker id="origami-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981"/>
        </marker>
      </defs>
      ${currentStep.svg}
    `;
  }
}

function origamiNextStep() {
  const model = ORIGAMI_MODELS[activeOrigamiModel];
  if (!model) return;
  if (activeOrigamiStepIndex < model.steps.length - 1) {
    renderOrigamiStep(activeOrigamiModel, activeOrigamiStepIndex + 1);
  }
}

function origamiPrevStep() {
  if (activeOrigamiStepIndex > 0) {
    renderOrigamiStep(activeOrigamiModel, activeOrigamiStepIndex - 1);
  }
}

function origamiRestart() {
  renderOrigamiStep(activeOrigamiModel, 0);
  showToast(`Restarted ${ORIGAMI_MODELS[activeOrigamiModel]?.title || "model"} from Step 1.`);
}

function copyOrigamiSteps() {
  const model = ORIGAMI_MODELS[activeOrigamiModel];
  if (!model) return;
  const text = `${model.title} (${model.difficulty})\nPaper: ${model.paperNeeded}\n\n` +
    model.steps.map((s, idx) => `Step ${idx + 1}: ${s.title}\n${s.desc}\n[${s.action} - ${s.paperSide}]`).join("\n\n");
  void navigator.clipboard.writeText(text).then(() => showToast(`Copied ${model.title} folding steps to clipboard!`));
}

async function addOrigamiSupplies() {
  await addMaterialToProjectShopping("Japanese Kami Origami Paper (15x15cm, 100 sheets)", "1 pack", 12.00, "Papercraft & Origami");
}

function updateOrigamiPaperCalc() {
  const parentFormat = $("#origami-parent-format")?.value || "a4";
  const targetShape = $("#origami-target-shape")?.value || "square";
  const parentWInput = $("#origami-parent-w");
  const parentHInput = $("#origami-parent-h");
  const targetSizeInput = $("#origami-target-size");
  const res = $("#origami-paper-calc-result");
  if (!res) return;

  const presets = {
    a4: [210, 297],
    a3: [297, 420],
    letter: [216, 279],
    scrapbook12: [305, 305],
    giant_kami: [350, 350],
    washi_sheet: [640, 940]
  };

  if (parentFormat !== "custom" && presets[parentFormat] && parentWInput && parentHInput) {
    parentWInput.value = presets[parentFormat][0];
    parentHInput.value = presets[parentFormat][1];
  }

  const pW = Math.max(10, parseFloat(parentWInput?.value) || 210);
  const pH = Math.max(10, parseFloat(parentHInput?.value) || 297);
  const cutW = Math.max(10, parseFloat(targetSizeInput?.value) || 150);

  // Aspect ratio calculation
  const ratios = {
    square: 1.0,
    silver: Math.SQRT2, // 1.4142
    golden: 1.61803,
    double_square: 2.0,
    dollar: 2.348
  };
  const ratio = ratios[targetShape] || 1.0;
  const cutH = Math.round(cutW * ratio);

  // Orientation 1: (W / cutW) * (H / cutH)
  const count1 = Math.floor(pW / cutW) * Math.floor(pH / cutH);
  // Orientation 2: (W / cutH) * (H / cutW)
  const count2 = Math.floor(pW / cutH) * Math.floor(pH / cutW);

  const bestCount = Math.max(count1, count2);
  const bestOrient = count1 >= count2 ? "Standard" : "Rotated 90°";

  const totalParentArea = pW * pH;
  const cutArea = cutW * cutH;
  const usedArea = bestCount * cutArea;
  const efficiency = ((usedArea / totalParentArea) * 100).toFixed(1);

  // Leftover strip dimension
  const remainderW = count1 >= count2 ? pW - (Math.floor(pW / cutW) * cutW) : pW - (Math.floor(pW / cutH) * cutH);

  res.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <span style="font-size:11px;font-weight:700">EXTRACTABLE CUTS:</span>
      <strong style="font-size:18px;color:var(--primary)">${bestCount} sheet${bestCount === 1 ? "" : "s"} <span style="font-size:12px;font-weight:normal;color:var(--muted)">(${cutW} × ${cutH} mm)</span></strong>
    </div>

    <div style="background:var(--surface-sunken);border:1px solid var(--border);border-radius:6px;padding:8px 10px;font-size:12px;margin-bottom:6px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span>Paper Sheet Yield:</span>
        <strong>${efficiency}% paper utilized</strong>
      </div>
      <div style="display:flex;justify-content:space-between;color:var(--muted);font-size:11px">
        <span>Optimal Orientation:</span>
        <span>${bestOrient}</span>
      </div>
      <div style="display:flex;justify-content:space-between;color:var(--muted);font-size:11px">
        <span>Remainder Offcut Strip:</span>
        <span>~${Math.round(remainderW)} × ${Math.round(pH)} mm</span>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary)">
      💡 <strong>Folder's Pro Tip:</strong> Use the remaining ${Math.round(remainderW)}mm offcut strip for folding mini Sonobe units, bookmark corners, or modular Kusudama connector tabs!
    </div>
  `;
}

function updateOrigamiModularCalc() {
  const polyKey = $("#origami-modular-poly")?.value || "cube";
  const squareSize = Math.max(10, parseFloat($("#origami-modular-square-size")?.value) || 75);
  const colorCount = parseInt($("#origami-modular-colors")?.value, 10) || 6;
  const res = $("#origami-modular-result");
  if (!res) return;

  const polyData = {
    cube: { title: "Sonobe Cube", units: 6, faces: 6, edges: 12, vertices: 8, diamFactor: 1.22, notes: "Classic 6-face cube. Use 3 dual pairs or 6 distinct colors so opposite faces match." },
    octahedron: { title: "Triakis Octahedron", units: 12, faces: 8, edges: 24, vertices: 6, diamFactor: 1.6, notes: "3 intersecting rings of 4 units each. Ideal with 3 or 4 color symmetry." },
    icosahedron: { title: "Stellated Icosahedron", units: 30, faces: 20, edges: 30, vertices: 12, diamFactor: 2.45, notes: "Five intersecting rings of 6 units. 5-color Hamiltonian path ensures no adjacent units share a color!" },
    dodecahedron: { title: "Pentagonal Dodecahedron", units: 30, faces: 12, edges: 30, vertices: 20, diamFactor: 2.6, notes: "Folded with PHiZZ units (Tom Hull). 3 units meet at every vertex." },
    kusudama_classic: { title: "Classic Kusudama Flower Ball", units: 60, faces: 12, edges: 30, vertices: 20, diamFactor: 2.2, notes: "12 flowers assembled from 5 conical petals each. Sew or glue petal seams with methyl cellulose." },
    cherry_kusudama: { title: "Cherry Blossom Kusudama", units: 72, faces: 12, edges: 36, vertices: 24, diamFactor: 2.5, notes: "12 flowers of 6 petals each. Elegant curved bell openings." },
    buckyball: { title: "Buckminsterfullerene (C60)", units: 90, faces: 32, edges: 90, vertices: 60, diamFactor: 3.8, notes: "90 PHiZZ units forming 12 pentagons and 20 hexagons. Geodesic sphere geometry." },
    great_stellated: { title: "Great Stellated Dodecahedron", units: 60, faces: 20, edges: 60, vertices: 32, diamFactor: 3.2, notes: "60 triangular spikes. Requires crisp tant paper with high friction." }
  };

  const p = polyData[polyKey] || polyData.cube;
  const finishedDiamMm = Math.round(p.diamFactor * squareSize);
  const finishedDiamIn = (finishedDiamMm / 25.4).toFixed(1);

  const sheetsPerColor = Math.ceil(p.units / colorCount);
  const colorBreakdown = Array.from({ length: colorCount }, (_, i) => {
    const isLast = i === colorCount - 1;
    const count = isLast ? (p.units - (sheetsPerColor * (colorCount - 1))) : sheetsPerColor;
    return `Color ${i + 1}: ${count} sheet${count === 1 ? '' : 's'}`;
  }).join(" · ");

  res.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <span style="font-size:11px;font-weight:700">REQUIRED PAPER SHEETS:</span>
      <strong style="font-size:18px;color:var(--primary)">${p.units} sheets <span style="font-size:12px;font-weight:normal;color:var(--muted)">(${squareSize}×${squareSize} mm)</span></strong>
    </div>

    <div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:6px;font-size:11px;margin-bottom:8px">
      <div style="background:var(--surface-sunken);border:1px solid var(--border);border-radius:6px;padding:6px 8px">
        <span style="color:var(--muted);text-transform:uppercase;font-weight:700;font-size:9px">Assembled Diameter</span>
        <div style="font-size:13px;font-weight:700;color:var(--ink);margin-top:2px">~${finishedDiamMm} mm (${finishedDiamIn}")</div>
      </div>
      <div style="background:var(--surface-sunken);border:1px solid var(--border);border-radius:6px;padding:6px 8px">
        <span style="color:var(--muted);text-transform:uppercase;font-weight:700;font-size:9px">Polyhedral Topology</span>
        <div style="font-size:13px;font-weight:700;color:var(--ink);margin-top:2px">${p.vertices} Vertices • ${p.edges} Edges</div>
      </div>
    </div>

    <div style="background:var(--surface-sunken);border:1px solid var(--border);border-radius:6px;padding:6px 8px;font-size:11px;margin-bottom:6px">
      <strong>Color Palette Split (${colorCount} colors):</strong> ${colorBreakdown}
    </div>

    <div style="font-size:11px;color:var(--ink-secondary)">
      🧩 <strong>Assembly Note:</strong> ${p.notes}
    </div>
  `;
}

function updateOrigamiCpValidator() {
  const preset = $("#origami-cp-preset")?.value || "bird_base";
  const mInput = $("#origami-cp-m");
  const vInput = $("#origami-cp-v");
  const anglesInput = $("#origami-cp-angles");
  const res = $("#origami-cp-result");
  if (!res) return;

  const presets = {
    bird_base: { m: 3, v: 1, angles: "45, 45, 135, 135" },
    waterbomb: { m: 3, v: 1, angles: "90, 90, 90, 90" },
    frog_base: { m: 5, v: 3, angles: "22.5, 67.5, 67.5, 22.5, 22.5, 67.5, 67.5, 22.5" },
    flat_twist: { m: 2, v: 2, angles: "90, 90, 90, 90" },
    invalid_maekawa: { m: 2, v: 2, angles: "45, 135, 45, 135" },
    invalid_kawasaki: { m: 3, v: 1, angles: "60, 100, 80, 120" }
  };

  if (preset !== "custom" && presets[preset] && mInput && vInput && anglesInput) {
    mInput.value = presets[preset].m;
    vInput.value = presets[preset].v;
    anglesInput.value = presets[preset].angles;
  }

  const M = parseInt(mInput?.value, 10) || 0;
  const V = parseInt(vInput?.value, 10) || 0;
  const totalCreases = M + V;

  // Maekawa's Theorem: |M - V| === 2
  const maekawaDiff = Math.abs(M - V);
  const maekawaValid = (totalCreases % 2 === 0) && (maekawaDiff === 2);

  // Parse angles
  const anglesStr = (anglesInput?.value || "").split(/[,;\s]+/).filter(Boolean);
  const angles = anglesStr.map(a => parseFloat(a)).filter(n => !isNaN(n));
  const sumAngles = angles.reduce((sum, n) => sum + n, 0);

  let oddSum = 0;
  let evenSum = 0;
  for (let i = 0; i < angles.length; i++) {
    if (i % 2 === 0) oddSum += angles[i];
    else evenSum += angles[i];
  }

  const sumValid = Math.abs(sumAngles - 360) < 0.5;
  const kawasakiValid = sumValid && (angles.length % 2 === 0) && Math.abs(oddSum - 180) < 0.5 && Math.abs(evenSum - 180) < 0.5;
  const isFlatFoldable = maekawaValid && kawasakiValid;

  res.innerHTML = `
    <div class="origami-theorem-card ${isFlatFoldable ? 'theorem-valid' : 'theorem-invalid'}">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <strong>${isFlatFoldable ? '✅ Mathematically Flat-Foldable Vertex' : '❌ Non-Flat Foldable Vertex (Self-Intersecting)'}</strong>
        <span style="font-size:11px;font-weight:bold">${isFlatFoldable ? 'Valid CP Node' : 'Theorem Failure'}</span>
      </div>
      <div style="font-size:11px;margin-top:4px">
        ${isFlatFoldable ? 'This vertex can be pressed completely flat without tearing, warping, or self-intersection.' : 'Paper cannot lie flat around this vertex in Euclidean space.'}
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px">
      <div style="background:var(--surface-sunken);border:1px solid var(--border);border-radius:6px;padding:8px">
        <div style="font-weight:700;color:${maekawaValid ? '#10b981' : '#ef4444'}">${maekawaValid ? '✓ Maekawa\'s Theorem Passed' : '✗ Maekawa\'s Theorem Failed'}</div>
        <div style="color:var(--muted);font-size:10px;margin-top:2px">|M − V| = |${M} − ${V}| = ${maekawaDiff} ${maekawaValid ? '(exactly 2)' : '(must equal 2)'}</div>
      </div>
      <div style="background:var(--surface-sunken);border:1px solid var(--border);border-radius:6px;padding:8px">
        <div style="font-weight:700;color:${kawasakiValid ? '#10b981' : '#ef4444'}">${kawasakiValid ? '✓ Kawasaki\'s Theorem Passed' : '✗ Kawasaki\'s Theorem Failed'}</div>
        <div style="color:var(--muted);font-size:10px;margin-top:2px">Σ odd = ${oddSum.toFixed(1)}°, Σ even = ${evenSum.toFixed(1)}° ${kawasakiValid ? '(both = 180°)' : '(must both equal 180°)'}</div>
      </div>
    </div>
  `;
}

function updateOrigamiPaperGuide() {
  const paperKey = $("#origami-guide-paper")?.value || "kami";
  const compKey = $("#origami-guide-complexity")?.value || "intermediate";
  const res = $("#origami-guide-result");
  if (!res) return;

  const papers = {
    kami: { name: "Japanese Kami", gsm: "50–60 GSM", fibers: "Short wood pulp", memory: "Medium-High", wetFold: "Low (blowout risk if damp)", sizing: "None (pre-sized)", rating: "⭐⭐⭐⭐ (Best for general models)" },
    tant: { name: "Tant Paper", gsm: "75–80 GSM", fibers: "Medium textured pulp", memory: "Very High", wetFold: "Moderate (misting with spray)", sizing: "Pre-sized textured surface", rating: "⭐⭐⭐⭐⭐ (Ideal for modular polyhedra)" },
    elephant_hide: { name: "Elephant Hide (Elefantenhaut)", gsm: "110 GSM", fibers: "Synthetic parchment finish", memory: "Extreme", wetFold: "⭐⭐⭐⭐⭐ Master Class (water repellant)", sizing: "Heavy chemical sizing", rating: "⭐⭐⭐⭐⭐ (King of 3D organic curves)" },
    tissue_foil: { name: "Tissue Foil / Sandwich", gsm: "40 GSM", fibers: "Foil core with tissue laminate", memory: "Infinite (zero spring-back)", wetFold: "N/A (metal foil core)", sizing: "Methyl Cellulose adhesive layer", rating: "⭐⭐⭐⭐⭐ (Best for complex insects with 8+ legs)" },
    washi: { name: "Washi / Kozo / Unryu", gsm: "35–50 GSM", fibers: "Extremely long Mulberry bark", memory: "Low (requires MC treatment)", sizing: "Brush 3% Methyl Cellulose to stiffen", rating: "⭐⭐⭐⭐ (Delicate organic translucent art)" },
    origamido: { name: "Origamido Paper", gsm: "30–40 GSM", fibers: "Handmade kozo/hemp custom blend", memory: "Highest possible", wetFold: "⭐⭐⭐⭐⭐ Extreme wet-sculpting", sizing: "Custom formulated", rating: "👑 Museum Grade Master Paper" },
    copy_paper: { name: "20lb Office Copy Paper", gsm: "75 GSM", fibers: "Short machine pulp", memory: "Springy (cracks easily on thick folds)", wetFold: "Poor (turns to mush)", sizing: "Acidic starch", rating: "⭐⭐ (Practice folds only)" }
  };

  const compLayers = {
    simple: { folds: 12, maxLayers: 16, note: "Almost any paper works cleanly." },
    intermediate: { folds: 30, maxLayers: 64, note: "Kami or Tant recommended. Use bone folder on bird base points." },
    modular: { folds: 24, maxLayers: 32, note: "Tant is unmatched: its textured grain creates friction to prevent units sliding apart." },
    complex: { folds: 80, maxLayers: 256, note: "MUST use paper < 45 GSM (Tissue Foil, Origamido, or treated Washi) or joints will tear." },
    organic_wet: { folds: 40, maxLayers: 48, note: "Elephant Hide or 100+ GSM watercolor paper treated with Methyl Cellulose." }
  };

  const p = papers[paperKey] || papers.kami;
  const c = compLayers[compKey] || compLayers.intermediate;

  res.innerHTML = `
    <div style="background:var(--surface-sunken);border:1px solid var(--border);border-radius:6px;padding:8px 12px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <strong>${p.name} (${p.gsm})</strong>
        <span style="font-size:11px;color:var(--primary);font-weight:bold">${p.rating}</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:6px;font-size:11px;color:var(--ink-secondary)">
        <div>Fibers: <strong>${p.fibers}</strong></div>
        <div>Crease Memory: <strong>${p.memory}</strong></div>
        <div>Wet-Folding: <strong>${p.wetFold}</strong></div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4">
      🧪 <strong>Sizing &amp; Chemical Treatment:</strong> ${p.sizing}.<br>
      📐 <strong>Complexity Compatibility:</strong> At ${c.folds} folds, paper accumulates up to <strong>~${c.maxLayers} layers</strong> at critical apexes. ${c.note}
    </div>
  `;
}

function renderOrigamiView() {
  renderOrigamiStep();
  updateOrigamiPaperCalc();
  updateOrigamiModularCalc();
  updateOrigamiCpValidator();
  updateOrigamiPaperGuide();
}

// ============================================================
// 🔥 Laser Cutting & Engraving Studio Calculations & Handlers
// ============================================================
const LASER_RECIPES = {
  diode_10w: {
    ply_3mm: { cut: [200, 100, 2], engrave: [3000, 35, 1], score: [1200, 30, 1], kerf: 0.14 },
    ply_6mm: { cut: [100, 100, 4], engrave: [3000, 35, 1], score: [1200, 30, 1], kerf: 0.18 },
    mdf_3mm: { cut: [160, 100, 3], engrave: [2500, 40, 1], score: [1000, 30, 1], kerf: 0.15 },
    acrylic_3mm: { cut: [180, 100, 2], engrave: [2200, 30, 1], score: [1200, 25, 1], kerf: 0.14, note: "Opaque dark/black colors only. Blue diode transmits through clear acrylic!" },
    acrylic_6mm: { cut: [80, 100, 4], engrave: [2200, 30, 1], score: [1200, 25, 1], kerf: 0.20, note: "Opaque dark colors only." },
    leather_4oz: { cut: [350, 85, 1], engrave: [3200, 25, 1], score: [1500, 20, 1], kerf: 0.15 },
    hardwood_3mm: { cut: [180, 100, 2], engrave: [3000, 40, 1], score: [1200, 30, 1], kerf: 0.15 },
    anodized_alum: { cut: [0, 0, 0], engrave: [2500, 70, 1], score: [1200, 40, 1], kerf: 0.08, note: "Surface bleach only. Diode cannot through-cut metals." },
    slate_stone: { cut: [0, 0, 0], engrave: [2200, 80, 1], score: [1000, 50, 1], kerf: 0.10, note: "Creates bright white mineral micro-fracture contrast." }
  },
  diode_20w: {
    ply_3mm: { cut: [400, 95, 1], engrave: [4500, 30, 1], score: [1800, 25, 1], kerf: 0.16 },
    ply_6mm: { cut: [180, 100, 2], engrave: [4500, 30, 1], score: [1800, 25, 1], kerf: 0.20 },
    mdf_3mm: { cut: [300, 100, 1], engrave: [3800, 35, 1], score: [1500, 25, 1], kerf: 0.17 },
    acrylic_3mm: { cut: [320, 95, 1], engrave: [3500, 25, 1], score: [1600, 20, 1], kerf: 0.16, note: "Dark colors only. Diode lasers transmit through clear acrylic." },
    acrylic_6mm: { cut: [140, 100, 2], engrave: [3500, 25, 1], score: [1600, 20, 1], kerf: 0.22, note: "Dark colors only." },
    leather_4oz: { cut: [600, 70, 1], engrave: [4500, 20, 1], score: [2000, 15, 1], kerf: 0.16 },
    hardwood_3mm: { cut: [320, 90, 1], engrave: [4000, 30, 1], score: [1600, 25, 1], kerf: 0.16 },
    anodized_alum: { cut: [0, 0, 0], engrave: [3500, 60, 1], score: [1800, 35, 1], kerf: 0.09, note: "Crisp white text ablation on anodized layer." },
    slate_stone: { cut: [0, 0, 0], engrave: [3000, 75, 1], score: [1400, 45, 1], kerf: 0.12 }
  },
  diode_40w: {
    ply_3mm: { cut: [700, 85, 1], engrave: [6000, 25, 1], score: [2400, 20, 1], kerf: 0.18 },
    ply_6mm: { cut: [350, 95, 1], engrave: [6000, 25, 1], score: [2400, 20, 1], kerf: 0.22 },
    mdf_3mm: { cut: [550, 90, 1], engrave: [5000, 28, 1], score: [2000, 20, 1], kerf: 0.18 },
    acrylic_3mm: { cut: [500, 90, 1], engrave: [4500, 22, 1], score: [2200, 18, 1], kerf: 0.18, note: "Dark/black only. Diode transmits through clear." },
    acrylic_6mm: { cut: [240, 100, 1], engrave: [4500, 22, 1], score: [2200, 18, 1], kerf: 0.24, note: "Dark colors only." },
    leather_4oz: { cut: [900, 60, 1], engrave: [6000, 18, 1], score: [2800, 15, 1], kerf: 0.18 },
    hardwood_3mm: { cut: [550, 85, 1], engrave: [5000, 25, 1], score: [2200, 20, 1], kerf: 0.18 },
    anodized_alum: { cut: [0, 0, 0], engrave: [4500, 50, 1], score: [2500, 30, 1], kerf: 0.10, note: "Ultra fast engraving speeds." },
    slate_stone: { cut: [0, 0, 0], engrave: [4000, 65, 1], score: [2000, 40, 1], kerf: 0.14 }
  },
  co2_45w: {
    ply_3mm: { cut: [850, 60, 1], engrave: [8000, 20, 1], score: [3000, 15, 1], kerf: 0.15 },
    ply_6mm: { cut: [380, 80, 1], engrave: [8000, 20, 1], score: [3000, 15, 1], kerf: 0.19 },
    mdf_3mm: { cut: [650, 75, 1], engrave: [7000, 22, 1], score: [2500, 18, 1], kerf: 0.16 },
    acrylic_3mm: { cut: [700, 65, 1], engrave: [7500, 18, 1], score: [2800, 14, 1], kerf: 0.14, note: "10,600nm is 100% absorbed! Cuts CLEAR cast acrylic with crystal flame-polished edges." },
    acrylic_6mm: { cut: [300, 85, 1], engrave: [7500, 18, 1], score: [2800, 14, 1], kerf: 0.18, note: "Flame-polished crystal edge with air assist." },
    leather_4oz: { cut: [950, 45, 1], engrave: [8000, 15, 1], score: [3200, 12, 1], kerf: 0.14 },
    hardwood_3mm: { cut: [650, 65, 1], engrave: [7000, 22, 1], score: [2600, 16, 1], kerf: 0.16 },
    anodized_alum: { cut: [0, 0, 0], engrave: [6000, 35, 1], score: [3000, 20, 1], kerf: 0.10, note: "Bleaches black oxide layer with high contrast." },
    slate_stone: { cut: [0, 0, 0], engrave: [5500, 45, 1], score: [2500, 25, 1], kerf: 0.12 }
  },
  co2_90w: {
    ply_3mm: { cut: [1800, 50, 1], engrave: [15000, 15, 1], score: [5000, 10, 1], kerf: 0.16 },
    ply_6mm: { cut: [850, 65, 1], engrave: [15000, 15, 1], score: [5000, 10, 1], kerf: 0.20 },
    mdf_3mm: { cut: [1400, 60, 1], engrave: [14000, 18, 1], score: [4500, 12, 1], kerf: 0.17 },
    acrylic_3mm: { cut: [1500, 55, 1], engrave: [14000, 14, 1], score: [4800, 10, 1], kerf: 0.15, note: "Lightning fast, glass-like edge." },
    acrylic_6mm: { cut: [700, 75, 1], engrave: [14000, 14, 1], score: [4800, 10, 1], kerf: 0.19, note: "Pristine acrylic edge; flame polished in single pass." },
    leather_4oz: { cut: [2000, 35, 1], engrave: [15000, 12, 1], score: [5500, 8, 1], kerf: 0.15 },
    hardwood_3mm: { cut: [1300, 55, 1], engrave: [14000, 16, 1], score: [4500, 12, 1], kerf: 0.16 },
    anodized_alum: { cut: [0, 0, 0], engrave: [12000, 25, 1], score: [5000, 15, 1], kerf: 0.12 },
    slate_stone: { cut: [0, 0, 0], engrave: [10000, 35, 1], score: [4500, 20, 1], kerf: 0.14 }
  },
  fiber_30w: {
    ply_3mm: { cut: [0, 0, 0], engrave: [0, 0, 0], score: [0, 0, 0], kerf: 0.05, note: "Fiber lasers (1064nm) are NOT for wood. Fire hazard with zero optical absorption!" },
    ply_6mm: { cut: [0, 0, 0], engrave: [0, 0, 0], score: [0, 0, 0], kerf: 0.05, note: "Not suitable for organic materials." },
    mdf_3mm: { cut: [0, 0, 0], engrave: [0, 0, 0], score: [0, 0, 0], kerf: 0.05, note: "Not suitable for organic materials." },
    acrylic_3mm: { cut: [0, 0, 0], engrave: [0, 0, 0], score: [0, 0, 0], kerf: 0.05, note: "Fiber laser passes through transparent plastics." },
    acrylic_6mm: { cut: [0, 0, 0], engrave: [0, 0, 0], score: [0, 0, 0], kerf: 0.05, note: "Fiber laser passes through transparent plastics." },
    leather_4oz: { cut: [0, 0, 0], engrave: [0, 0, 0], score: [0, 0, 0], kerf: 0.05, note: "Organic leather chars poorly under 1064nm fiber." },
    hardwood_3mm: { cut: [0, 0, 0], engrave: [0, 0, 0], score: [0, 0, 0], kerf: 0.05, note: "Not suitable for organic materials." },
    anodized_alum: { cut: [0, 0, 0], engrave: [18000, 45, 1], score: [10000, 25, 1], kerf: 0.02, note: "Precision galvanometric spot (0.02mm). Deep metal engraving & annealing." },
    slate_stone: { cut: [0, 0, 0], engrave: [12000, 60, 1], score: [7000, 35, 1], kerf: 0.03, note: "Ultra crisp micro-engraving." }
  }
};

function copyLaserParams() {
  const type = $("#laser-type option:checked")?.textContent || "Laser";
  const op = $("#laser-op option:checked")?.textContent || "Operation";
  const mat = $("#laser-material option:checked")?.textContent || "Material";
  const calcText = $("#laser-calc-result")?.innerText || "";
  const kerfText = $("#laser-kerf-result")?.innerText || "";
  const text = `🔥 LASER SPECIFICATIONS & PRODUCTION SHEET\nMachine: ${type}\nOperation: ${op}\nMaterial: ${mat}\n\n${calcText}\n\n${kerfText}`;
  void navigator.clipboard.writeText(text).then(() => showToast("Copied Laser Cutting & Engraving Specs to clipboard!"));
}

async function addLaserMaterials() {
  const matName = $("#laser-material option:checked")?.textContent || "Laser Cutting Substrate";
  const cost = parseFloat($("#laser-mat-cost")?.value) || 6.50;
  await addMaterialToProjectShopping(matName, "1 sheet", cost, "Laser Consumables & Acrylic");
}

function updateLaserCalc() {
  const laserType = $("#laser-type")?.value || "diode_20w";
  const opType = $("#laser-op")?.value || "cut";
  const matType = $("#laser-material")?.value || "ply_3mm";
  const matCost = Math.max(0, parseFloat($("#laser-mat-cost")?.value) || 6.50);
  const runtimeMins = Math.max(1, parseFloat($("#laser-runtime-mins")?.value) || 12);
  const hourlyRate = Math.max(0, parseFloat($("#laser-hourly-rate")?.value) || 45.00);
  const res = $("#laser-calc-result");
  if (!res) return;

  const recipe = LASER_RECIPES[laserType]?.[matType] || { cut: [300, 90, 1], engrave: [3000, 30, 1], score: [1500, 20, 1], kerf: 0.16 };
  const targetOp = recipe[opType] || [300, 90, 1];
  const [speed, power, passes] = targetOp;
  const isImpossible = speed === 0 && power === 0;

  // Financial job quoting math
  const machineCost = (runtimeMins / 60) * hourlyRate;
  const isCO2 = laserType.startsWith("co2");
  const wearRate = isCO2 ? 4.50 : 2.00; // tube degradation / diode wear $/hr
  const tubeAmort = (runtimeMins / 60) * wearRate;
  const shopElectricity = 0.35 * (runtimeMins / 60);
  const totalCost = matCost + machineCost + tubeAmort + shopElectricity;
  const suggestedQuote = totalCost / (1 - 0.35); // 35% gross profit margin
  const estProfit = suggestedQuote - totalCost;

  let paramHTML = "";
  if (isImpossible) {
    paramHTML = `
      <div style="background:rgba(239, 68, 68, 0.1);border:1px solid #ef4444;border-radius:6px;padding:10px 12px;color:#991b1b;margin-bottom:10px">
        ⚠️ <strong>Operation Incompatible:</strong> This laser class cannot perform a <em>${opType}</em> operation on this substrate.<br>
        <span style="font-size:11px;color:var(--ink-secondary)">${recipe.note || "Choose a compatible wavelength or substrate."}</span>
      </div>
    `;
  } else {
    paramHTML = `
      <div class="laser-stat-grid">
        <div class="laser-stat-card">
          <span class="label">Feed Rate</span>
          <span class="value">${speed} <span style="font-size:11px;font-weight:normal">mm/min</span></span>
          <div class="hint">${(speed / 60).toFixed(1)} mm/s</div>
        </div>
        <div class="laser-stat-card">
          <span class="label">Laser Power</span>
          <span class="value">${power}%</span>
          <div class="hint">${opType === "engrave" ? "Surface scan" : "Focal penetration"}</div>
        </div>
        <div class="laser-stat-card">
          <span class="label">Pass Count</span>
          <span class="value">${passes} <span style="font-size:11px;font-weight:normal">${passes === 1 ? "pass" : "passes"}</span></span>
          <div class="hint">${passes > 1 ? "Lower Z by 1mm each pass" : "Single clean cut"}</div>
        </div>
        <div class="laser-stat-card">
          <span class="label">Typical Kerf</span>
          <span class="value">~${recipe.kerf} <span style="font-size:11px;font-weight:normal">mm</span></span>
          <div class="hint">Beam waist slot width</div>
        </div>
      </div>
      ${recipe.note ? `<div style="font-size:11px;color:var(--ink-secondary);margin-top:6px;padding:6px 8px;background:var(--surface-sunken);border-radius:4px">💡 <strong>Pro Tip:</strong> ${recipe.note}</div>` : ""}
    `;
  }

  res.innerHTML = `
    ${paramHTML}
    <div class="laser-quote-box">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-size:11px;font-weight:700">COMMERCIAL JOB QUOTE ESTIMATE:</span>
        <strong style="font-size:18px;color:var(--primary)">$${suggestedQuote.toFixed(2)} <span style="font-size:11px;font-weight:normal;color:var(--muted)">(35% Margin)</span></strong>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:6px;font-size:11px;color:var(--ink-secondary)">
        <div>Material Stock: <strong>$${matCost.toFixed(2)}</strong></div>
        <div>Machine Runtime: <strong>$${machineCost.toFixed(2)}</strong> <span style="font-size:10px">(${runtimeMins}m @ $${hourlyRate}/hr)</span></div>
        <div>Tube/Diode Wear: <strong>$${tubeAmort.toFixed(2)}</strong></div>
        <div>Total Direct Cost: <strong>$${totalCost.toFixed(2)}</strong></div>
        <div style="color:var(--primary)">Net Profit Margin: <strong>+$${estProfit.toFixed(2)}</strong></div>
      </div>
    </div>
  `;
}

function updateLaserKerfCalc() {
  const thickness = Math.max(0.2, parseFloat($("#laser-kerf-thickness")?.value) || 3.15);
  const kerf = Math.max(0.01, parseFloat($("#laser-kerf-width")?.value) || 0.16);
  const tabNominal = Math.max(1, parseFloat($("#laser-kerf-tab")?.value) || 12.0);
  const fitMode = $("#laser-kerf-fit")?.value || "press_fit";
  const res = $("#laser-kerf-result");
  if (!res) return;

  // Clearance deltas
  let clearance = 0; // mm
  let fitLabel = "Friction Press-Fit";
  let fitDesc = "Zero slop. Tabs hold together tightly by mechanical friction without glue.";
  if (fitMode === "glue_fit") {
    clearance = 0.05;
    fitLabel = "Glue Slip-Fit (0.05 mm capillary gap)";
    fitDesc = "Allows PVA or acrylic cement to wick into the joint via capillary action without squeezing dry.";
  } else if (fitMode === "slide_fit") {
    clearance = 0.15;
    fitLabel = "Sliding Tab (0.15 mm clearance)";
    fitDesc = "Smooth sliding motion for box lids, sliding doors, or removable panels.";
  }

  // Male Pin width in CAD = tabNominal + kerf - (clearance / 2)
  // Female Mortise Slot width in CAD = tabNominal - kerf + (clearance / 2)
  const maleCad = tabNominal + kerf - (clearance / 2);
  const femaleCad = tabNominal - kerf + (clearance / 2);
  const fingerDepth = thickness + 0.1; // +0.1mm sand-off allowance

  res.innerHTML = `
    <div style="background:var(--surface-sunken);border:1px solid var(--border);border-radius:6px;padding:8px 10px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <strong>${fitLabel}</strong>
        <span style="font-size:11px;color:var(--primary);font-weight:bold">Offset: ${(kerf / 2).toFixed(3)} mm</span>
      </div>
      <p style="font-size:11px;color:var(--ink-secondary);margin:0 0 8px">${fitDesc}</p>
      
      <div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:8px;font-size:12px">
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:8px">
          <span style="font-size:10px;color:var(--muted);text-transform:uppercase;display:block">Male Pin CAD Dimension</span>
          <strong style="font-size:15px;color:var(--ink)">${maleCad.toFixed(2)} mm</strong>
          <div style="font-size:10px;color:var(--ink-secondary)">+${(kerf - clearance / 2).toFixed(2)} mm compensation</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:8px">
          <span style="font-size:10px;color:var(--muted);text-transform:uppercase;display:block">Female Slot CAD Dimension</span>
          <strong style="font-size:15px;color:var(--ink)">${femaleCad.toFixed(2)} mm</strong>
          <div style="font-size:10px;color:var(--ink-secondary)">-${(kerf - clearance / 2).toFixed(2)} mm compensation</div>
        </div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4">
      📏 <strong>Joint Depth:</strong> Set finger length to <strong>${fingerDepth.toFixed(2)} mm</strong> (includes +0.1 mm flush-sanding pride allowance).<br>
      💻 <strong>LightBurn / Illustrator:</strong> Apply a contour kerf offset of <strong>+${(kerf / 2).toFixed(3)} mm</strong> outward on exterior box tabs, or inward on mortise slots.
    </div>
  `;
}

function updateLaserSafetyWatchdog() {
  const mat = $("#laser-safety-mat")?.value || "cast_acrylic";
  const res = $("#laser-safety-result");
  if (!res) return;

  const safetyProfiles = {
    cast_acrylic: {
      status: "safe",
      badge: "🟢 LASER SAFE (PMMA)",
      badgeClass: "laser-badge-safe",
      gas: "Methyl methacrylate monomer (sweet, non-corrosive organic odor).",
      machineRisk: "Zero corrosion risk to optics or rails. Highly flammable if air assist fails.",
      ppe: "Standard exhaust ventilation (minimum 150 CFM). Keep fire blanket / extinguisher nearby.",
      notes: "Flame-polishes to a brilliant optical glass edge. Extruded acrylic cuts gummy, but cast cuts cleanly."
    },
    pvc_vinyl: {
      status: "danger",
      badge: "🔴 FATAL TOXIC HAZARD — NEVER CUT",
      badgeClass: "laser-badge-danger",
      gas: "HYDROCHLORIC ACID (HCl) & PURE CHLORINE GAS. Lethal pulmonary toxin.",
      machineRisk: "DESTROYER OF LASERS. Condenses into liquid muriatic acid in < 48 hrs, permanently rusting linear rails and etching optical mirrors.",
      ppe: "PROHIBITED IN ALL WORKSHOPS. If accidental ignition occurs, evacuate shop immediately.",
      notes: "Do the Copper Wire Flame Test (Beilstein test) before cutting any unknown flexible plastics."
    },
    polycarbonate: {
      status: "danger",
      badge: "🔴 SEVERE FIRE & DENSE SMOKE HAZARD",
      badgeClass: "laser-badge-danger",
      gas: "Dense black soot, hydrogen cyanide traces, and benzene carcinogens.",
      machineRisk: "Rapidly coats laser mirrors with oily tar; intense localized heat easily cracks laser focus lenses.",
      ppe: "Do not cut > 1mm thickness. Immediate flame flare-up risk.",
      notes: "Cut Lexan / Polycarbonate with CNC router or mechanical shear instead."
    },
    carbon_fiber: {
      status: "danger",
      badge: "🔴 CONDUCTIVE AIRBORNE ASBESTOS-LIKE DUST",
      badgeClass: "laser-badge-danger",
      gas: "Epoxy pyrolyzes, releasing free conductive microscopic carbon fibers.",
      machineRisk: "Floating carbon dust shorts out stepper driver PCBs and high-voltage CO2 power supplies.",
      ppe: "Requires sealed HEPA vacuum CNC milling under water bath.",
      notes: "Never cut prepreg or solid carbon fiber with a laser."
    },
    mdf_plywood: {
      status: "safe",
      badge: "🟢 SAFE WITH CONTINUOUS EXHAUST",
      badgeClass: "laser-badge-safe",
      gas: "Wood smoke, urea-formaldehyde resin offgas, acetic acid.",
      machineRisk: "Leaves sticky wood tar on honeycomb bed and lenses; clean optics every 4 operating hours.",
      ppe: "Continuous 100% CFM inline exhaust fan ducted outside.",
      notes: "Baltic birch plywood has uniform interior birch plies without glue voids."
    },
    veg_tan: {
      status: "safe",
      badge: "🟢 100% VEG-TAN LEATHER SAFE",
      badgeClass: "laser-badge-safe",
      gas: "Singed natural organic protein (strong campfire / burnt hair smell). Non-corrosive.",
      machineRisk: "Safe for laser optics and linear guide rails.",
      ppe: "High CFM exhaust to evacuate organic smoke odor.",
      notes: "Wipe burnt char from cut edges with damp rag and dish soap before saddle stitching."
    },
    chrome_tan: {
      status: "warning",
      badge: "🟡 CHEMICAL TOXICITY WARNING",
      badgeClass: "laser-badge-warning",
      gas: "Trivalent chromium decomposes under laser heat into airborne Hexavalent Chromium [Cr(VI)].",
      machineRisk: "Potent respiratory carcinogen. Safe for machine, unsafe for lungs without certified fume scrubber.",
      ppe: "Industrial activated carbon + HEPA filtration or sealed outdoor exhaust.",
      notes: "Veg-tan leather is strongly preferred for laser work over chrome-tanned upholstery."
    },
    delrin: {
      status: "safe",
      badge: "🟢 LASER SAFE (POLYOXYMETHYLENE)",
      badgeClass: "laser-badge-safe",
      gas: "Formaldehyde gas traces (sharp, pungent, pickle-like odor).",
      machineRisk: "Non-corrosive to machine when exhaust runs continually.",
      ppe: "Leave exhaust fan running for 5 minutes after job finishes to evacuate residual chamber gas.",
      notes: "Cuts like warm butter with mirror-smooth, friction-free edges. Superb for precision gears."
    },
    ptfe_teflon: {
      status: "danger",
      badge: "🔴 LETHAL FLUORINE OFFGAS — NEVER CUT",
      badgeClass: "laser-badge-danger",
      gas: "Perfluoroisobutylene (PFIB) & carbonyl fluoride. Causes 'Polymer Fume Fever'.",
      machineRisk: "Lethal to humans and pets (especially birds) even in trace parts-per-billion.",
      ppe: "PROHIBITED FROM LASER CUTTERS.",
      notes: "Machine PTFE mechanically on lathe or mill."
    },
    anodized: {
      status: "safe",
      badge: "🟢 100% SAFE SURFACE ABLATION",
      badgeClass: "laser-badge-safe",
      gas: "Minimal organic dye sublimation. Zero toxic fumes.",
      machineRisk: "Zero machine wear. Beam merely vaporizes colored organic dye in aluminum oxide micropores.",
      ppe: "Standard light shop exhaust.",
      notes: "Produces brilliant, crisp white photographic contrast on black anodized aluminum."
    }
  };

  const prof = safetyProfiles[mat] || safetyProfiles.cast_acrylic;

  res.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <span class="${prof.badgeClass}">${prof.badge}</span>
      <span style="font-size:11px;color:var(--muted);text-transform:uppercase">Chemical Profile</span>
    </div>

    <div style="background:var(--surface-sunken);border:1px solid var(--border);border-radius:6px;padding:8px 10px;font-size:11px;color:var(--ink-secondary);margin-bottom:6px">
      <div style="margin-bottom:4px">💨 <strong>Emitted Fumes:</strong> ${prof.gas}</div>
      <div style="margin-bottom:4px">⚙️ <strong>Laser &amp; Rail Impact:</strong> ${prof.machineRisk}</div>
      <div>🛡️ <strong>Safety Protocol:</strong> ${prof.ppe}</div>
    </div>
    <div style="font-size:11px;color:var(--ink-secondary)">💡 <strong>Fab Note:</strong> ${prof.notes}</div>
  `;
}

function updateLaserOpticsGuide() {
  const lens = $("#laser-lens-type")?.value || "2.0";
  const air = $("#laser-air-mode")?.value || "high";
  const res = $("#laser-optics-result");
  if (!res) return;

  const lensData = {
    "1.5": {
      name: "1.5\" (38.1 mm) Short Focal Meniscus",
      spot: "0.075 mm (75 µm)",
      dof: "1.2 mm",
      dpi: "400 – 600 DPI",
      app: "High-resolution micro-engraving, rubber stamps, tiny text down to 4pt, fine photo halftones. Not recommended for cutting > 3mm.",
      cutRating: "⭐ (Thin only)",
      engraveRating: "⭐⭐⭐⭐⭐ (Ultra-Fine)"
    },
    "2.0": {
      name: "2.0\" (50.8 mm) Standard Universal Focal Lens",
      spot: "0.12 mm (120 µm)",
      dof: "2.8 mm",
      dpi: "250 – 350 DPI",
      app: "The shop workhorse. Clean cuts up to 6mm (1/4\") Baltic birch, cast acrylic, and veg-tan leather with crisp engraving.",
      cutRating: "⭐⭐⭐⭐ (General Shop)",
      engraveRating: "⭐⭐⭐⭐ (Crisp)"
    },
    "2.5": {
      name: "2.5\" (63.5 mm) Long Waist Meniscus",
      spot: "0.16 mm (160 µm)",
      dof: "4.5 mm",
      dpi: "200 – 250 DPI",
      app: "Thick stock through-cuts (6mm – 12mm). Elongated beam waist eliminates hourglass edge taper for 90° vertical cut walls.",
      cutRating: "⭐⭐⭐⭐⭐ (Thick Cuts)",
      engraveRating: "⭐⭐⭐ (Coarser Dot)"
    },
    "4.0": {
      name: "4.0\" (101.6 mm) Ultra-Deep Depth of Field",
      spot: "0.25 mm (250 µm)",
      dof: "10.0 mm",
      dpi: "150 DPI",
      app: "Cutting thick 1\" (25mm) polyethylene foam inserts, corrugated boxes, reaching into pre-assembled deep recesses.",
      cutRating: "⭐⭐⭐⭐ (Deep Foam)",
      engraveRating: "⭐⭐ (Low Res)"
    }
  };

  const airData = {
    high: {
      psi: "18 – 25 PSI (High Flow)",
      effect: "Instantly blows molten plastic and vaporized carbon through kerf. Prevents flare-ups, eliminates wood scorch halos, and cools cut edges.",
      bestFor: "Vector Through-Cutting"
    },
    low: {
      psi: "3 – 5 PSI (Gentle Blanket)",
      effect: "Maintains positive pressure inside nozzle cone to protect focal lens coating from smoke without blowing airborne soot across engraving raster.",
      bestFor: "Photo Raster Engraving"
    },
    none: {
      psi: "0 PSI (Disabled)",
      effect: "⚠️ DANGER: Rising smoke deposits tar onto lens. Laser energy cooks tar, resulting in thermal fracture and destroyed anti-reflective coating.",
      bestFor: "PROHIBITED"
    }
  };

  const l = lensData[lens] || lensData["2.0"];
  const a = airData[air] || airData.high;

  res.innerHTML = `
    <div style="background:var(--surface-sunken);border:1px solid var(--border);border-radius:6px;padding:8px 12px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <strong>${l.name}</strong>
        <span style="font-size:11px;color:var(--primary);font-weight:bold">${l.spot} Beam Spot</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:6px;font-size:11px;color:var(--ink-secondary)">
        <div>Rayleigh Depth of Field: <strong>${l.dof}</strong></div>
        <div>Optimal Resolution: <strong>${l.dpi}</strong></div>
        <div>Through-Cutting: <strong>${l.cutRating}</strong></div>
        <div>Engraving Fidelity: <strong>${l.engraveRating}</strong></div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4">
      🎯 <strong>Lens Application:</strong> ${l.app}<br>
      💨 <strong>Air Assist Pressure [${a.psi}]:</strong> ${a.effect} <em>(Best for: ${a.bestFor})</em>
    </div>
  `;
}

function renderLaserView() {
  updateLaserCalc();
  updateLaserKerfCalc();
  updateLaserSafetyWatchdog();
  updateLaserOpticsGuide();
}

// ============================================================
// 🪡 Leathercraft & Stitching Studio Calculations & Handlers
// ============================================================
function copyLeatherSpecs() {
  const stitchText = $("#leather-stitch-result")?.innerText || "";
  const gaugeText = $("#leather-gauge-result")?.innerText || "";
  const beltText = $("#leather-belt-result")?.innerText || "";
  const text = `🪡 LEATHERCRAFT SADDLE STITCHING & BENCH SPEC SHEET\n\n${stitchText}\n\n${gaugeText}\n\n${beltText}`;
  void navigator.clipboard.writeText(text).then(() => showToast("Copied Leather Stitching & Sizing Specs to clipboard!"));
}

async function addLeatherSupplies() {
  const hideName = $("#leather-hide-cut option:checked")?.textContent.split("(")[0].trim() || "Leather Hide";
  const oz = $("#leather-oz-preset")?.value || "4";
  const sqftPrice = parseFloat($("#leather-sqft-price")?.value) || 9.50;
  await addMaterialToProjectShopping(`${hideName} (${oz} oz Veg-Tan Leather)`, "1 hide", sqftPrice * 14, "Leather, Hides & Hardware");
}

function updateLeatherStitchCalc() {
  const seamLen = Math.max(5, parseFloat($("#leather-seam-len")?.value) || 180);
  const stackThick = Math.max(0.5, parseFloat($("#leather-stack-thick")?.value) || 3.2);
  const pitch = Math.max(2, parseFloat($("#leather-iron-pitch")?.value) || 3.85);
  const threadType = $("#leather-thread-type")?.value || "0.55";
  const res = $("#leather-stitch-result");
  if (!res) return;

  // Traditional 2-needle saddle stitch thread multiplier formula:
  // Multiplier = 3.5 + (0.35 * thickness_in_mm)
  const multiplier = 3.5 + (0.35 * stackThick);
  // Add 200mm tail reserve (100mm per needle for threading lock & 2.5 backstitches)
  const threadMm = Math.round((seamLen * multiplier) + 200);
  const threadCm = (threadMm / 10).toFixed(1);
  const threadInches = (threadMm / 25.4).toFixed(1);

  // Hole count = floor(seamLen / pitch) + 1
  const holeCount = Math.floor(seamLen / pitch) + 1;
  const spi = (25.4 / pitch).toFixed(1);

  // Recommended needle size & awl
  let needleSize = "John James Size 004 (48mm × 1.02mm)";
  if (pitch <= 2.85) needleSize = "John James Size 004 or 002 (Fine)";
  else if (pitch >= 4.5) needleSize = "John James Size 001 or 1/0 (Heavy)";

  let threadDesc = "0.55 mm Tiger / Vinymo (Universal Wallets & Bags)";
  if (threadType === "0.45") threadDesc = "0.45 mm Braided Poly (Watch Straps & Fine French Wallets)";
  else if (threadType === "0.80") threadDesc = "0.80 mm Heavy Cord (Boots, Holsters & Heavy Saddlery)";
  else if (threadType === "linen") threadDesc = "Lin Câblé Waxed French Linen (Luxury Bespoke)";

  res.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <span style="font-size:11px;font-weight:700">REQUIRED THREAD LENGTH:</span>
      <strong style="font-size:18px;color:var(--primary)">${threadCm} cm <span style="font-size:12px;font-weight:normal;color:var(--muted)">(${threadInches}" / ${multiplier.toFixed(1)}× seam)</span></strong>
    </div>

    <div class="laser-stat-grid" style="margin-bottom:8px">
      <div class="laser-stat-card">
        <span class="label">Pricking Holes</span>
        <span class="value">${holeCount}</span>
        <div class="hint">${spi} Stitches / Inch (SPI)</div>
      </div>
      <div class="laser-stat-card">
        <span class="label">Needle Size</span>
        <span class="value" style="font-size:13px">Size 004</span>
        <div class="hint">Blunt round harness point</div>
      </div>
      <div class="laser-stat-card">
        <span class="label">Cast Angle</span>
        <span class="value">45° Slant</span>
        <div class="hint">Left needle over right loop</div>
      </div>
      <div class="laser-stat-card">
        <span class="label">Backstitches</span>
        <span class="value">2.5 Stitches</span>
        <div class="hint">Tuck tails between plies</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4">
      🪡 <strong>Thread:</strong> ${threadDesc}.<br>
      📌 <strong>Harness Needle:</strong> Use <em>${needleSize}</em>. Blunt tips glide through awl holes without puncturing existing thread loops.
    </div>
  `;
}

function updateLeatherGaugeCalc() {
  const ozPreset = $("#leather-oz-preset")?.value || "4";
  const customMmInput = $("#leather-custom-mm");
  const cutPreset = $("#leather-hide-cut")?.value || "side";
  const sqftPrice = Math.max(1, parseFloat($("#leather-sqft-price")?.value) || 9.50);
  const res = $("#leather-gauge-result");
  if (!res) return;

  const ozMap = {
    "2": { oz: "2 – 3 oz", mm: 1.0, frac: "3/64\"", beveler: "#0 (0.6mm)", app: "Wallet interiors, card pockets, linings, watch strap lining." },
    "4": { oz: "4 – 5 oz", mm: 1.8, frac: "1/16\"", beveler: "#1 (0.8mm)", app: "Wallet exteriors, notebook covers, clutch bags, light scabbards." },
    "6": { oz: "6 – 7 oz", mm: 2.6, frac: "3/32\"", beveler: "#2 (1.0mm)", app: "Tote bags, heavy knife sheaths, light straps, messenger bags." },
    "8": { oz: "8 – 9 oz", mm: 3.4, frac: "1/8\"", beveler: "#3 (1.2mm)", app: "Standard heavy jeans belts, gun slings, heavy tool roll bodies." },
    "10": { oz: "10 – 12 oz", mm: 4.4, frac: "5/32\"", beveler: "#4 (1.5mm)", app: "Law enforcement gun holsters, saddle cinches, ultra-stiff rig belts." }
  };

  if (ozPreset !== "custom" && ozMap[ozPreset] && customMmInput) {
    customMmInput.value = ozMap[ozPreset].mm;
  }

  const mm = Math.max(0.4, parseFloat(customMmInput?.value) || 1.8);
  const equivOz = (mm / 0.4).toFixed(1);
  const fracInch = (mm / 25.4).toFixed(3);

  const cutData = {
    side: { name: "Full Side", sqft: 22, yield: 0.78, note: "Contains back, belly, and shoulder. Most versatile economy yield." },
    double_shoulder: { name: "Double Shoulder", sqft: 14, yield: 0.88, note: "Uniform directional grain. Premier cut for belts, tote straps, and bag panels." },
    bend: { name: "Single Bend / Butt", sqft: 11, yield: 0.94, note: "Tightest fiber density. Maximum tensile strength and zero stretch." },
    belly: { name: "Belly", sqft: 5, yield: 0.55, note: "Loose stretchy spongy fibers. Best for gusset liners or practice stitching." }
  };

  const c = cutData[cutPreset] || cutData.side;
  const hideTotalCost = c.sqft * sqftPrice;
  const usableSqft = c.sqft * c.yield;
  const trueCostPerUsableSqft = hideTotalCost / usableSqft;

  const currentProfile = ozMap[ozPreset] || {
    oz: `${equivOz} oz`,
    frac: `~${fracInch}"`,
    beveler: mm < 1.4 ? "#0" : mm < 2.2 ? "#1" : mm < 3.0 ? "#2" : "#3",
    app: "Custom fabrication project."
  };

  res.innerHTML = `
    <div style="background:var(--surface-sunken);border:1px solid var(--border);border-radius:6px;padding:8px 10px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <strong>${equivOz} oz Leather (${mm.toFixed(1)} mm)</strong>
        <span style="font-size:11px;color:var(--primary);font-weight:bold">${currentProfile.frac}</span>
      </div>
      <div style="font-size:11px;color:var(--ink-secondary);margin-bottom:6px">🎯 <strong>Ideal For:</strong> ${currentProfile.app}</div>
      <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:6px;font-size:11px">
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:4px;padding:6px">
          <span style="font-size:10px;color:var(--muted);display:block">Edge Beveler</span>
          <strong>${currentProfile.beveler}</strong>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:4px;padding:6px">
          <span style="font-size:10px;color:var(--muted);display:block">Skive Target</span>
          <strong>${(mm * 0.5).toFixed(1)} mm (50%)</strong>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:4px;padding:6px">
          <span style="font-size:10px;color:var(--muted);display:block">Trade Rule</span>
          <strong>1 oz ≈ 1/64"</strong>
        </div>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--ink-secondary);padding-top:4px">
      <span>${c.name} (~${c.sqft} sq ft @ $${sqftPrice.toFixed(2)}/sq ft = <strong>$${hideTotalCost.toFixed(2)}</strong>)</span>
      <span style="color:var(--primary);font-weight:bold">True Usable: $${trueCostPerUsableSqft.toFixed(2)} / sq ft (${(c.yield * 100).toFixed(0)}% yield)</span>
    </div>
  `;
}

function updateLeatherBeltCalc() {
  const waist = Math.max(20, parseFloat($("#leather-belt-waist")?.value) || 34);
  const strapWidth = parseFloat($("#leather-belt-width")?.value) || 1.5;
  const spacing = parseFloat($("#leather-belt-spacing")?.value) || 1.0;
  const leatherOz = Math.max(5, parseFloat($("#leather-belt-oz")?.value) || 9);
  const res = $("#leather-belt-result");
  if (!res) return;

  // Belt geometry rules:
  // Center hole = waist size + 2" (accounts for pant fabric, underwear, and buckle tongue fold)
  const centerHoleDist = waist + 2.0; // from fold line of buckle
  const tongueLength = 6.0; // inches past center hole
  const buckleFoldLength = 3.75; // inches wrapped over buckle prong
  const totalCutLength = centerHoleDist + tongueLength + buckleFoldLength; // in inches
  const totalCutCm = (totalCutLength * 2.54).toFixed(1);

  // Hole positions: 5 holes standard
  const holePositions = [-2, -1, 0, 1, 2].map(i => (centerHoleDist + (i * spacing)).toFixed(1));

  // Keeper loop formula:
  const thickInches = (leatherOz * 0.4) / 25.4;
  const keeperStrapLen = (2 * strapWidth + 2 * thickInches + 0.35).toFixed(2);
  const keeperStrapLenMm = Math.round(keeperStrapLen * 25.4);

  res.innerHTML = `
    <div style="background:var(--surface-sunken);border:1px solid var(--border);border-radius:6px;padding:8px 12px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <span style="font-size:11px;font-weight:700">TOTAL STRAP BLANK TO CUT:</span>
        <strong style="font-size:18px;color:var(--primary)">${totalCutLength.toFixed(1)}" <span style="font-size:12px;font-weight:normal;color:var(--muted)">(${totalCutCm} cm)</span></strong>
      </div>

      <div class="laser-stat-grid" style="margin-bottom:8px">
        <div class="laser-stat-card">
          <span class="label">Center Hole</span>
          <span class="value">${centerHoleDist.toFixed(1)}"</span>
          <div class="hint">From buckle fold line</div>
        </div>
        <div class="laser-stat-card">
          <span class="label">Tongue Tip</span>
          <span class="value">6.0"</span>
          <div class="hint">English point / tapered</div>
        </div>
        <div class="laser-stat-card">
          <span class="label">Buckle Fold End</span>
          <span class="value">${buckleFoldLength}"</span>
          <div class="hint">Skive fold to 4.5 oz</div>
        </div>
        <div class="laser-stat-card">
          <span class="label">Keeper Loop</span>
          <span class="value">${keeperStrapLen}"</span>
          <div class="hint">${keeperStrapLenMm} mm strip length</div>
        </div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4">
      📌 <strong>5-Hole Span Markings:</strong> Punch holes at <strong>${holePositions.join('", ')}"</strong> from the buckle fold line.<br>
      ✂️ <strong>Buckle Tongue Slot:</strong> Punch a <strong>1.25" × 0.20" oval slot</strong> centered 1.75" from the fold line to allow the buckle tongue free rotation.
    </div>
  `;
}

function updateLeatherEdgeGuide() {
  const tannage = $("#leather-tannage-select")?.value || "natural_vegtan";
  const res = $("#leather-edge-result");
  if (!res) return;

  const tannageProfiles = {
    natural_vegtan: {
      name: "Natural Vegetable-Tanned Cowhide",
      temper: "Firm to Extra Firm (Can be molded, carved & stamped)",
      burnish: "⭐⭐⭐⭐⭐ Outstanding (Bonds instantly with Tokonole & friction heat)",
      patina: "Extreme honey amber patina with sun exposure & handling",
      water: "High sensitivity (casing with water allows deep floral tooling)",
      edgeMethod: "Edge beveler #2 -> 400/800 grit sand -> Seiwa Tokonole -> Hardwood slicker friction -> Beeswax"
    },
    buttero_pueblo: {
      name: "Italian Buttero / Pueblo (Badalassi Carlo)",
      temper: "Firm Temper (Dense tight grain, rich vegetable oils)",
      burnish: "⭐⭐⭐⭐⭐ Glass-Smooth (Achieves mirror edge effortlessly)",
      patina: "Deepens in saturation and buffs into natural gloss luster",
      water: "Moderate resistance (pre-conditioned with natural tallow/neatsfoot)",
      edgeMethod: "Edge beveler #1 -> 600 grit dry sand -> Tokonole rub -> Canvas slicking -> Columbus edge wax"
    },
    english_bridle: {
      name: "English Bridle Leather (Sedgwick / Wickett & Craig)",
      temper: "Medium-Firm (Hot stuffed with waxes and tallow)",
      burnish: "⭐⭐⭐⭐ Smooth Satin Finish",
      patina: "Wax blooms to the surface; buffs to rich equestrian sheen",
      water: "High weather & moisture resistance",
      edgeMethod: "Bevel edge -> Canvas slick with gum tragacanth -> Buff wax out with horsehair brush"
    },
    chrome_tanned: {
      name: "Chrome-Tanned / Upholstery Leather",
      temper: "Soft to Supple (Flexible, loose fiber matrix)",
      burnish: "❌ CANNOT BE BURNISHED WITH FRICTION (Fibers will fray into fuzzy fuzz)",
      patina: "Very low patina (colors remain locked and uniform)",
      water: "Water repellant and stain resistant",
      edgeMethod: "Mandatory Edge Painting: Base primer coat -> Sand -> 2x Fenice / Giardini Edge Paint -> Heat crease"
    },
    oil_tanned: {
      name: "Oil-Tanned / Crazy Horse / Kodiak",
      temper: "Medium-Soft (Saturated with heavy mineral oils)",
      burnish: "⭐⭐ Difficult (Oils inhibit water-based burnishing gums)",
      patina: "Classic dramatic pull-up color shift when bent",
      water: "Superb water repellency",
      edgeMethod: "Bevel lightly -> Sand dry -> Apply melted beeswax / paraffin cake -> Rapid friction canvas buff"
    },
    shell_cordovan: {
      name: "Shell Cordovan (Equine Membrane)",
      temper: "Firm Dense Cartilage Layer (Zero grain pores)",
      burnish: "⭐⭐⭐⭐⭐ Crown Jewel of Leather (Naturally glass-like)",
      patina: "Lustrous micro-depth shine that never creases or ripples",
      water: "Avoid heavy soaking (can cause micro-welts)",
      edgeMethod: "Deer bone burnishing with Saphir Medaille d'Or cordovan cream or Tokonole"
    }
  };

  const t = tannageProfiles[tannage] || tannageProfiles.natural_vegtan;

  res.innerHTML = `
    <div style="background:var(--surface-sunken);border:1px solid var(--border);border-radius:6px;padding:8px 12px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <strong>${t.name}</strong>
        <span style="font-size:11px;color:var(--primary);font-weight:bold">${t.burnish.split("(")[0]}</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:6px;font-size:11px;color:var(--ink-secondary)">
        <div>Temper: <strong>${t.temper}</strong></div>
        <div>Patina: <strong>${t.patina}</strong></div>
        <div>Water Sensitivity: <strong>${t.water}</strong></div>
      </div>
    </div>

    <div style="margin-top:8px">
      <div class="leather-burnish-step">
        <div class="leather-burnish-num">1</div>
        <div class="leather-burnish-body">
          <strong>Bevel &amp; Shape Edge</strong>
          Use an edge beveler (size #1 or #2) at a steady 45° angle along both face and flesh edges to create a rounded profile.
        </div>
      </div>
      <div class="leather-burnish-step">
        <div class="leather-burnish-num">2</div>
        <div class="leather-burnish-body">
          <strong>Progressive Sanding</strong>
          Dry-sand in ONE direction only (e.g. away from the tip) using 320 -> 600 -> 1000 grit paper until the seam layers blend into a single homogeneous edge.
        </div>
      </div>
      <div class="leather-burnish-step">
        <div class="leather-burnish-num">3</div>
        <div class="leather-burnish-body">
          <strong>Apply Tokonole Gum &amp; Friction Slick</strong>
          Smear a thin film of Seiwa Tokonole over the edge. Wait 20 seconds for tack. Briskly rub with dense canvas or a hardwood slicker until the friction heats up and an audible 'squeak' is heard.
        </div>
      </div>
      <div class="leather-burnish-step" style="margin-bottom:0">
        <div class="leather-burnish-num">4</div>
        <div class="leather-burnish-body">
          <strong>Beeswax Seal &amp; Canvas Buff</strong>
          Lightly rub pure beeswax cake across the burnished edge, then do a quick 5-second buff with clean denim canvas to seal against moisture.
        </div>
      </div>
    </div>
  `;
}

function renderLeatherView() {
  updateLeatherStitchCalc();
  updateLeatherGaugeCalc();
  updateLeatherBeltCalc();
  updateLeatherEdgeGuide();
}

// ============================================================
// 🏺 Ceramics & Pottery Studio Calculations & Handlers
// ============================================================
function copyCeramicsSpecs() {
  const shrinkText = $("#clay-shrink-result")?.innerText || "";
  const glazeText = $("#glaze-umf-result")?.innerText || "";
  const kilnText = $("#kiln-ramp-result")?.innerText || "";
  const text = `🏺 CERAMICS & POTTERY BENCH & FIRING SPEC SHEET\n\n${shrinkText}\n\n${glazeText}\n\n${kilnText}`;
  void navigator.clipboard.writeText(text).then(() => showToast("Copied Ceramics & Pottery Specs to clipboard!"));
}

async function addCeramicsSupplies() {
  const clayName = $("#clay-body-preset option:checked")?.textContent.split("(")[0].trim() || "Pottery Clay";
  await addMaterialToProjectShopping(`${clayName} (25 lb Bag)`, "1 bag", 22.50, "Ceramics, Clay & Glaze");
}

function updateClayShrinkCalc() {
  const preset = $("#clay-body-preset")?.value || "bmix_cone6";
  const shrinkInput = $("#clay-shrinkage-pct");
  const firedHeight = Math.max(1, parseFloat($("#clay-fired-height")?.value) || 10.0);
  const firedDiam = Math.max(1, parseFloat($("#clay-fired-diam")?.value) || 8.5);
  const firedVol = Math.max(10, parseFloat($("#clay-fired-vol")?.value) || 350);
  const res = $("#clay-shrink-result");
  if (!res) return;

  const presets = {
    bmix_cone6: 12.5,
    porcelain_cone6: 14.2,
    stoneware_cone6: 11.8,
    terracotta_low: 9.2,
    sculpture_raku: 8.0
  };

  if (preset !== "custom" && presets[preset] && shrinkInput) {
    shrinkInput.value = presets[preset];
  }

  const shrinkPct = Math.max(1, Math.min(25, parseFloat(shrinkInput?.value) || 12.5));
  const factor = 1 - (shrinkPct / 100);
  const mult = 1 / factor;

  const wetHeight = (firedHeight * mult).toFixed(1);
  const wetDiam = (firedDiam * mult).toFixed(1);
  const wetVol = Math.round(firedVol * Math.pow(mult, 3));
  // Ball weight rule: ~1.25g per ml of wet volume + 75g for bottom trimming foot
  const clayBallGrams = Math.round((firedVol * 1.25) + 80);
  const clayBallLbs = (clayBallGrams / 453.592).toFixed(2);

  res.innerHTML = `
    <div style="background:var(--surface-sunken);border:1px solid var(--border);border-radius:6px;padding:8px 12px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <span style="font-size:11px;font-weight:700">WET THROWING CALIPERS:</span>
        <strong style="font-size:18px;color:var(--primary)">${wetHeight} cm H × ${wetDiam} cm ⌀</strong>
      </div>
      <div class="welding-stat-grid" style="margin-bottom:6px">
        <div class="welding-param-card">
          <span class="label">Wet Height</span>
          <span class="value">${wetHeight} <span style="font-size:11px;font-weight:normal">cm</span></span>
          <div class="hint">+${(wetHeight - firedHeight).toFixed(1)} cm shrink allowance</div>
        </div>
        <div class="welding-param-card">
          <span class="label">Wet Rim Diam</span>
          <span class="value">${wetDiam} <span style="font-size:11px;font-weight:normal">cm</span></span>
          <div class="hint">+${(wetDiam - firedDiam).toFixed(1)} cm shrink allowance</div>
        </div>
        <div class="welding-param-card">
          <span class="label">Clay Ball Weight</span>
          <span class="value">${clayBallGrams} <span style="font-size:11px;font-weight:normal">g</span></span>
          <div class="hint">~${clayBallLbs} lbs on wheel</div>
        </div>
        <div class="welding-param-card">
          <span class="label">Wet Cavity Vol</span>
          <span class="value">${wetVol} <span style="font-size:11px;font-weight:normal">ml</span></span>
          <div class="hint">Shrinks to ${firedVol} ml</div>
        </div>
      </div>
    </div>
    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4">
      📏 <strong>Lid &amp; Gallery Fit:</strong> If throwing a lidded jar, measure gallery with calipers while wet. Multiply flange by <strong>${mult.toFixed(3)}×</strong>.<br>
      ⚖️ <strong>Shrinkage Ratio:</strong> At ${shrinkPct}% total shrinkage, the clay shrinks <strong>${(shrinkPct * 0.45).toFixed(1)}% in drying</strong> and <strong>${(shrinkPct * 0.55).toFixed(1)}% in the firing</strong>.
    </div>
  `;
}

function updateGlazeUmfCalc() {
  const preset = $("#glaze-recipe-preset")?.value || "leach_4321";
  const alInput = $("#glaze-alumina");
  const siInput = $("#glaze-silica");
  const r2oInput = $("#glaze-r2o");
  const roInput = $("#glaze-ro");
  const res = $("#glaze-umf-result");
  if (!res) return;

  const recipes = {
    leach_4321: { al: 0.35, si: 3.40, r2o: 0.28, ro: 0.72 },
    floating_blue: { al: 0.42, si: 3.20, r2o: 0.25, ro: 0.75 },
    satin_strontium: { al: 0.38, si: 2.60, r2o: 0.22, ro: 0.78 },
    celadon_cone10: { al: 0.55, si: 4.80, r2o: 0.30, ro: 0.70 },
    shino_carbon: { al: 0.40, si: 2.40, r2o: 0.45, ro: 0.55 }
  };

  if (preset !== "custom" && recipes[preset] && alInput && siInput && r2oInput && roInput) {
    alInput.value = recipes[preset].al;
    siInput.value = recipes[preset].si;
    r2oInput.value = recipes[preset].r2o;
    roInput.value = recipes[preset].ro;
  }

  const al = Math.max(0.05, parseFloat(alInput?.value) || 0.35);
  const si = Math.max(0.5, parseFloat(siInput?.value) || 3.40);
  const r2o = Math.max(0.05, parseFloat(r2oInput?.value) || 0.28);
  const ro = Math.max(0.2, parseFloat(roInput?.value) || 0.72);

  const ratio = si / al;
  let stullClass = "stull-gloss";
  let stullBadge = "BRIGHT GLOSSY GLASS";
  let surfaceDesc = "High reflectivity, transparent depth, fluid melt. Excellent for functional food-ware.";

  if (ratio >= 9.0) {
    stullClass = "stull-gloss";
    stullBadge = "ULTRA-GLOSS / RUNNY";
    surfaceDesc = "High silica melt. Prone to running off vertical foot rings if over-fired. Catchers recommended.";
  } else if (ratio >= 7.0) {
    stullClass = "stull-satin";
    stullBadge = "SILKY SATIN SEMI-MATTE";
    surfaceDesc = "Pleasing buttery sheen. Smooth tactile surface with excellent knife cut-mark resistance.";
  } else if (ratio >= 5.2) {
    stullClass = "stull-matte";
    stullBadge = "MATTE / MICRO-CRYSTALLINE";
    surfaceDesc = "Alumina-dominated micro-crystals precipitate upon slow cooling, creating velvet opaque matte.";
  } else {
    stullClass = "stull-unmelted";
    stullBadge = "UNDER-FIRED / IMMATURE DRY";
    surfaceDesc = "Insufficient silica glass-former lattice. Rough, dry surface that absorbs liquids and harbors bacteria.";
  }

  // Food-safety durability test:
  // Silica should be >= 2.50 moles and Alumina >= 0.25 moles in a stable Cone 6 glaze
  const isFoodSafeGlaze = si >= 2.50 && al >= 0.25 && r2o <= 0.35;
  const foodSafeBadge = isFoodSafeGlaze 
    ? `<span style="color:#10b981;font-weight:bold">🟢 Stable Glass Former Matrix (Food Safe Base)</span>` 
    : `<span style="color:#ef4444;font-weight:bold">🔴 High Leaching Risk (Not Recommended for Food Surfaces)</span>`;

  res.innerHTML = `
    <div class="ceramics-stull-card ${stullClass}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <strong>${stullBadge} (SiO₂ : Al₂O₃ = ${ratio.toFixed(1)})</strong>
        <span style="font-size:11px;font-weight:bold">Unity Sum: ${(r2o + ro).toFixed(2)} Flux</span>
      </div>
      <p style="font-size:11px;margin:0 0 6px">${surfaceDesc}</p>
      <div style="font-size:11px">${foodSafeBadge}</div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:6px;font-size:11px;margin-bottom:6px">
      <div style="background:var(--surface-sunken);border:1px solid var(--border);border-radius:4px;padding:6px">
        <span style="font-size:10px;color:var(--muted);display:block">SiO₂ Silica</span>
        <strong>${si.toFixed(2)} mol</strong>
      </div>
      <div style="background:var(--surface-sunken);border:1px solid var(--border);border-radius:4px;padding:6px">
        <span style="font-size:10px;color:var(--muted);display:block">Al₂O₃ Alumina</span>
        <strong>${al.toFixed(2)} mol</strong>
      </div>
      <div style="background:var(--surface-sunken);border:1px solid var(--border);border-radius:4px;padding:6px">
        <span style="font-size:10px;color:var(--muted);display:block">R₂O : RO Flux Ratio</span>
        <strong>${(r2o / (r2o + ro)).toFixed(2)} : ${(ro / (r2o + ro)).toFixed(2)}</strong>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4">
      🧪 <strong>Stull Phase Diagram:</strong> Silica acts as the glass former; Alumina is the stabilizer / refractor. Balance fluxes (${(r2o + ro).toFixed(2)} total) to keep COE below 6.5×10⁻⁶ to prevent crazing cracks.
    </div>
  `;
}

function updateKilnRampCalc() {
  const cone = $("#kiln-cone-preset")?.value || "cone_04_bisque";
  const candlingHrs = parseFloat($("#kiln-candling-mode")?.value) || 2;
  const soakMins = parseFloat($("#kiln-soak-time")?.value) || 15;
  const res = $("#kiln-ramp-result");
  if (!res) return;

  const coneData = {
    cone_04_bisque: {
      name: "Cone 04 Bisque Firing",
      targetF: "1945°F",
      targetC: "1063°C",
      totalHrs: (8.5 + candlingHrs).toFixed(1),
      purpose: "Burn out organic carbon, dehydrate clay chemically, and leave porous for glaze dipping."
    },
    cone_06_bisque: {
      name: "Cone 06 Low Bisque Firing",
      targetF: "1828°F",
      targetC: "998°C",
      totalHrs: (7.5 + candlingHrs).toFixed(1),
      purpose: "Softer bisque for school studios and delicate low-fire earthenware."
    },
    cone_6_glaze: {
      name: "Cone 6 Mid-Fire Stoneware Glaze",
      targetF: "2232°F",
      targetC: "1222°C",
      totalHrs: (7.0 + (soakMins / 60)).toFixed(1),
      purpose: "Full vitrification of stoneware clay body (< 2% absorption) and fluid glass melt."
    },
    cone_10_glaze: {
      name: "Cone 10 Reduction Porcelain Glaze",
      targetF: "2345°F",
      targetC: "1285°C",
      totalHrs: (10.5 + (soakMins / 60)).toFixed(1),
      purpose: "Gas kiln heavy reduction (0.82 AF ratio) for celadons, copper reds, and iron saturates."
    },
    cone_018_luster: {
      name: "Cone 018 Gold Luster & Overglaze Decal",
      targetF: "1319°F",
      targetC: "715°C",
      totalHrs: "4.0",
      purpose: "Fusing metallic gold, platinum, or silk-screen enamel decals onto fired glaze."
    }
  };

  const c = coneData[cone] || coneData.cone_04_bisque;

  res.innerHTML = `
    <div style="background:var(--surface-sunken);border:1px solid var(--border);border-radius:6px;padding:8px 12px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <strong>${c.name} — Peak ${c.targetF} (${c.targetC})</strong>
        <span style="font-size:11px;color:var(--primary);font-weight:bold">Estimated Cycle: ~${c.totalHrs} Hours</span>
      </div>
      <p style="font-size:11px;color:var(--ink-secondary);margin:0 0 8px">${c.purpose}</p>

      <div style="margin-top:6px">
        <div class="ceramics-ramp-step">
          <div class="ceramics-ramp-badge">STAGE 1</div>
          <div class="ceramics-ramp-body">
            <strong>Candling &amp; Water Smoking (Room Temp → 180°F / 82°C)</strong>
            Hold for ${candlingHrs} hours. Eliminates mechanical pore moisture. <em>Critical: Never ramp above 212°F if ware is cool to the cheek, or water turns to explosive steam!</em>
          </div>
        </div>
        <div class="ceramics-ramp-step">
          <div class="ceramics-ramp-badge">STAGE 2</div>
          <div class="ceramics-ramp-body">
            <strong>Organic Burnout &amp; Chem-Water Dehydroxylation (200°F → 950°F / 510°C)</strong>
            Ramp at 250°F/hr. Burns out lignite, sulfur, and drives off chemically bound lattice water. Keep kiln top peephole open.
          </div>
        </div>
        <div class="ceramics-ramp-step">
          <div class="ceramics-ramp-badge" style="background:#ef4444">STAGE 3</div>
          <div class="ceramics-ramp-body">
            <strong>Alpha-to-Beta Quartz Inversion Shock Zone (950°F → 1150°F / 620°C)</strong>
            Slow ramp to 150°F/hr. Silica crystals expand 0.45% instantaneously at 1063°F (573°C). Slow heating prevents structural dunting stress fractures.
          </div>
        </div>
        <div class="ceramics-ramp-step">
          <div class="ceramics-ramp-badge">STAGE 4</div>
          <div class="ceramics-ramp-body">
            <strong>Final Vitrification Climb (1150°F → ${c.targetF})</strong>
            Ramp at 180°F/hr for the last 200°F until target Orton cone tip bends into a clean 90° arch touching the shelf.
          </div>
        </div>
        <div class="ceramics-ramp-step" style="margin-bottom:0">
          <div class="ceramics-ramp-badge">STAGE 5</div>
          <div class="ceramics-ramp-body">
            <strong>Peak Soak &amp; Controlled Drop Cool</strong>
            Hold at peak for ${soakMins} minutes to heal surface glaze bubbles. Natural cool with closed lid to prevent cristobalite thermal shock at 437°F.
          </div>
        </div>
      </div>
    </div>
  `;
}

function updatePlasterCalc() {
  const plasterType = $("#plaster-type")?.value || "usg_no1";
  const shape = $("#plaster-mold-shape")?.value || "box";
  const dim1 = Math.max(1, parseFloat($("#plaster-dim-1")?.value) || 20);
  const dim2 = Math.max(1, parseFloat($("#plaster-dim-2")?.value) || 15);
  const dim3 = Math.max(1, parseFloat($("#plaster-dim-3")?.value) || 10);
  const res = $("#plaster-calc-result");
  if (!res) return;

  // Volume in cm3 (ml)
  let vol = 0;
  if (shape === "box") {
    vol = dim1 * dim2 * dim3;
  } else {
    const radius = dim1 / 2;
    vol = Math.PI * Math.pow(radius, 2) * dim2;
  }

  // Consistency ratios (parts water per 100 parts plaster by weight)
  const ratios = {
    usg_no1: { waterRatio: 70, name: "USG No. 1 Pottery Plaster", desc: "Standard 70 consistency. Superb capillary water absorption for slip-casting slip molds." },
    hydrocal: { waterRatio: 45, name: "USG Hydrocal White", desc: "Dense 45 consistency. High compressive strength for mother molds and pressed tiles." },
    ultracal30: { waterRatio: 38, name: "Ultracal 30", desc: "Low expansion 38 consistency. Maximum hardness and edge detail for resin tooling." }
  };

  const p = ratios[plasterType] || ratios.usg_no1;
  // 1 cm3 of mixed slurry requires ~0.85g of dry plaster + (0.85 * ratio/100)g of water
  const factor = 1 / (1 + (p.waterRatio / 100) * 0.7); // volume efficiency factor
  const dryPlasterGrams = Math.round(vol * 0.88);
  const waterGrams = Math.round(dryPlasterGrams * (p.waterRatio / 100));
  const dryPlasterLbs = (dryPlasterGrams / 453.592).toFixed(2);
  const waterLbs = (waterGrams / 453.592).toFixed(2);

  res.innerHTML = `
    <div style="background:var(--surface-sunken);border:1px solid var(--border);border-radius:6px;padding:8px 12px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <span style="font-size:11px;font-weight:700">MOLD SLURRY BATCH (${vol.toFixed(0)} cm³ / ${(vol / 1000).toFixed(2)} Liters):</span>
        <strong style="font-size:18px;color:var(--primary)">${waterGrams}g H₂O + ${dryPlasterGrams}g Plaster</strong>
      </div>
      <div class="welding-stat-grid" style="margin-bottom:6px">
        <div class="welding-param-card">
          <span class="label">Water Weight</span>
          <span class="value">${waterGrams} <span style="font-size:11px;font-weight:normal">g</span></span>
          <div class="hint">${waterLbs} lbs • Cool 70°F water</div>
        </div>
        <div class="welding-param-card">
          <span class="label">Dry Plaster</span>
          <span class="value">${dryPlasterGrams} <span style="font-size:11px;font-weight:normal">g</span></span>
          <div class="hint">${dryPlasterLbs} lbs dry powder</div>
        </div>
        <div class="welding-param-card">
          <span class="label">Slaking Soak</span>
          <span class="value">2 Minutes</span>
          <div class="hint">Sift into water; let hydrate</div>
        </div>
        <div class="welding-param-card">
          <span class="label">Mix &amp; Pour Time</span>
          <span class="value">3 Minutes</span>
          <div class="hint">Pour before pudding phase</div>
        </div>
      </div>
    </div>
    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4">
      🪣 <strong>Mixing Protocol:</strong> Always add <em>plaster into water</em> (never water into plaster). Sift evenly across surface until an island forms. Allow to slake undisturbed for 2 minutes, then blend thoroughly from the bottom without whipping air into the slurry. Tap mold frame vigorously to dislodge bubbles.
    </div>
  `;
}

function renderCeramicsView() {
  updateClayShrinkCalc();
  updateGlazeUmfCalc();
  updateKilnRampCalc();
  updatePlasterCalc();
}

// ============================================================
// ⚡ Welding & Metal Fabrication Calculations & Handlers
// ============================================================
function copyWeldingSpecs() {
  const paramsText = $("#weld-params-result")?.innerText || "";
  const gasText = $("#weld-gas-result")?.innerText || "";
  const bendText = $("#weld-bend-result")?.innerText || "";
  const text = `⚡ WELDING & METAL FABRICATION WORKSHOP SPEC SHEET\n\n${paramsText}\n\n${gasText}\n\n${bendText}`;
  void navigator.clipboard.writeText(text).then(() => showToast("Copied Welding & Metal Specs to clipboard!"));
}

async function addWeldingSupplies() {
  const process = $("#weld-process")?.value || "mig_gmaw";
  if (process.includes("mig")) {
    await addMaterialToProjectShopping("ER70S-6 Mild Steel MIG Wire 0.030\" (11 lb Spool)", "1 spool", 29.50, "Welding, Gas & Wire");
  } else {
    await addMaterialToProjectShopping("Welding Consumables & Filler Rods", "1 pack", 35.00, "Welding, Gas & Wire");
  }
}

function updateWeldParamsCalc() {
  const proc = $("#weld-process")?.value || "mig_gmaw";
  const metal = $("#weld-metal")?.value || "mild_steel";
  const thick = $("#weld-thickness")?.value || "in_0125";
  const joint = $("#weld-joint")?.value || "butt";
  const res = $("#weld-params-result");
  if (!res) return;

  // Welding parameters matrix
  // [amps, volts, wfs_ipm, wire_dia_inch, polarity, tip_or_rod]
  const weldMatrix = {
    mig_gmaw: {
      mild_steel: {
        ga_20: [45, 15.0, 140, "0.023\"", "DCEP (Reverse)", "Short circuit arc; stitch weld to prevent burn-through."],
        ga_16: [85, 17.0, 190, "0.030\"", "DCEP (Reverse)", "Smooth short circuit arc; 1/2\" wire stickout."],
        in_0125: [135, 19.5, 260, "0.030\"", "DCEP (Reverse)", "Slight push angle (10-15°); solid penetration bead."],
        in_0250: [190, 22.5, 340, "0.035\"", "DCEP (Reverse)", "Bevel plate 30° groove; 2 passes recommended."],
        in_0375: [240, 25.0, 420, "0.035\" or 0.045\"", "DCEP (Reverse)", "Multi-pass stringer beads; root + hot pass + cap."]
      },
      stainless_304: {
        ga_20: [40, 14.5, 130, "0.023\" ER308L", "DCEP (Reverse)", "Tri-mix gas required to prevent gray oxidized seam."],
        ga_16: [75, 16.5, 170, "0.030\" ER308L", "DCEP (Reverse)", "Maintain short arc; stainless has 50% more thermal expansion."],
        in_0125: [120, 18.5, 230, "0.030\" ER308L", "DCEP (Reverse)", "Keep heat low to preserve corrosion resistance."],
        in_0250: [170, 21.0, 300, "0.035\" ER308L", "DCEP (Reverse)", "Interpass temp < 350°F to prevent carbide sensitization."],
        in_0375: [210, 23.5, 360, "0.035\" ER308L", "DCEP (Reverse)", "Back purge with 100% Argon on pipe/enclosed boxes."]
      },
      aluminum_6061: {
        ga_20: [0, 0, 0, "N/A", "AC TIG ONLY", "MIG on 20ga aluminum is too hot; switch to AC TIG."],
        ga_16: [90, 19.0, 320, "0.035\" ER4043", "DCEP (Spool Gun)", "Spool gun mandatory; Teflon liner to prevent bird-nesting."],
        in_0125: [145, 21.5, 380, "0.035\" ER4043", "DCEP (Spool Gun)", "100% Argon gas; stainless wire brush oxide immediately prior."],
        in_0250: [210, 24.0, 460, "3/64\" (0.047\") ER5356", "DCEP (Spool Gun)", "Preheat to 150°F; clean with acetone."],
        in_0375: [260, 26.5, 520, "3/64\" (0.047\") ER5356", "DCEP (Push-Pull)", "Heavy chamfer bevel; 3-pass sequence."]
      },
      chromoly_4130: {
        ga_20: [50, 15.5, 140, "0.025\" ER70S-2", "DCEP", "TIG strongly preferred on thin 4130 aerospace tubing."],
        ga_16: [85, 17.5, 190, "0.030\" ER70S-2", "DCEP", "Clean mill scale completely. No post-heat needed < 0.120\" thick."],
        in_0125: [130, 19.0, 250, "0.030\" ER70S-2", "DCEP", "Slow air cool in still air; never quench in water."],
        in_0250: [180, 22.0, 320, "0.035\" ER70S-2", "DCEP", "Preheat to 300°F to avoid martensitic brittle cracking."],
        in_0375: [230, 24.5, 400, "0.035\" ER70S-2", "DCEP", "Preheat 400°F; post-weld stress relief annealing required."]
      }
    },
    tig_gtaw: {
      mild_steel: {
        ga_20: [40, 11.0, 0, "1/16\" ER70S-6", "DCEN (Straight)", "Sharp 2% Lanthanated tungsten (20° included taper)."],
        ga_16: [70, 12.5, 0, "1/16\" ER70S-6", "DCEN (Straight)", "3/32\" Lanthanated tungsten; clean base metal to bright shine."],
        in_0125: [125, 14.0, 0, "3/32\" ER70S-6", "DCEN (Straight)", "High frequency start; add dab per puddle freeze cycle."],
        in_0250: [185, 16.0, 0, "1/8\" ER70S-6", "DCEN (Straight)", "Bevel groove; 2 passes; maintain 1/16\" arc length."],
        in_0375: [240, 18.0, 0, "1/8\" ER70S-6", "DCEN (Straight)", "Water-cooled torch recommended above 175 Amps."]
      },
      stainless_304: {
        ga_20: [35, 11.0, 0, "1/16\" ER308L", "DCEN (Straight)", "Purge backside with argon. Move rapidly to keep color gold/pink."],
        ga_16: [65, 12.0, 0, "1/16\" ER308L", "DCEN (Straight)", "Straw or salmon pink color = perfect shielding."],
        in_0125: [110, 13.5, 0, "3/32\" ER308L", "DCEN (Straight)", "#12 jumbo gas lens cup; post-flow gas 10 seconds."],
        in_0250: [160, 15.0, 0, "3/32\" ER308L", "DCEN (Straight)", "Skip-weld opposite sides to cancel distortion."],
        in_0375: [210, 17.0, 0, "1/8\" ER308L", "DCEN (Straight)", "Root pass with gap spacer, followed by weave cap."]
      },
      aluminum_6061: {
        ga_20: [55, 13.0, 0, "1/16\" ER4043", "AC High-Frequency", "70% AC Balance (cleaning action); 120 Hz pulse."],
        ga_16: [85, 14.5, 0, "1/16\" ER4043", "AC High-Frequency", "Ball tungsten tip lightly; 100% Ultra-pure Argon."],
        in_0125: [140, 16.0, 0, "3/32\" ER4043", "AC High-Frequency", "Rule of thumb: ~1 Amp per 0.001\" aluminum thickness."],
        in_0250: [220, 18.5, 0, "1/8\" ER5356", "AC High-Frequency", "Foot pedal modulation: start hot, taper back as heat soaks."],
        in_0375: [290, 20.0, 0, "5/32\" ER5356", "AC High-Frequency", "Water-cooled torch mandatory. Heavy chamfer."]
      },
      chromoly_4130: {
        ga_20: [45, 11.5, 0, "1/16\" ER70S-2", "DCEN (Straight)", "Aerospace gold standard. Dip rod rhythmically at puddle edge."],
        ga_16: [75, 13.0, 0, "1/16\" ER70S-2", "DCEN (Straight)", "ER70S-2 contains triple deoxidizers for pristine ductility."],
        in_0125: [120, 14.5, 0, "3/32\" ER70S-2", "DCEN (Straight)", "Clean tubes inside and out with Scotch-Brite and acetone."],
        in_0250: [175, 16.5, 0, "3/32\" ER70S-2", "DCEN (Straight)", "Multi-pass; maintain interpass temperature."],
        in_0375: [225, 18.5, 0, "1/8\" ER70S-2", "DCEN (Straight)", "Slow air cool in still room. No cold drafts."]
      }
    },
    flux_core: {
      mild_steel: {
        ga_20: [0, 0, 0, "N/A", "DCEN", "Flux-core is too hot for 20ga sheet metal; burns through."],
        ga_16: [70, 15.0, 130, "0.030\" E71T-GS", "DCEN (Straight Polarity)", "Straight polarity (torch negative). Chipping hammer for slag."],
        in_0125: [125, 17.5, 190, "0.030\" E71T-11", "DCEN (Straight Polarity)", "Excellent wind immunity outdoors. Drag angle 10-15°."],
        in_0250: [175, 20.0, 260, "0.035\" E71T-11", "DCEN (Straight Polarity)", "Deep penetrating arc. Remove all slag before second pass."],
        in_0375: [220, 22.5, 320, "0.045\" E71T-8", "DCEN (Straight Polarity)", "Heavy structural steel; high deposition rate."]
      }
    },
    stick_smaw: {
      mild_steel: {
        ga_20: [0, 0, 0, "N/A", "DCEP", "Stick welding burns through 20ga immediately."],
        ga_16: [50, 22.0, 0, "3/32\" E6013", "DCEP or AC", "Light penetration shallow arc rod for thin metal."],
        in_0125: [90, 24.0, 0, "3/32\" E7018", "DCEP (Reverse)", "Low hydrogen rod. Keep rods in rod oven at 250°F to prevent porosity."],
        in_0250: [135, 26.0, 0, "1/8\" E7018", "DCEP (Reverse)", "70,000 PSI high-strength structural weld. Clean slag with wire brush."],
        in_0375: [170, 28.0, 0, "5/32\" E7018", "DCEP (Reverse)", "Heavy bevel; root pass with E6010, cap with E7018."]
      }
    }
  };

  const pData = weldMatrix[proc]?.[metal]?.[thick] || weldMatrix.mig_gmaw.mild_steel[thick] || [135, 19.5, 260, "0.030\"", "DCEP", "Standard settings."];
  const [amps, volts, wfs, wire, polarity, note] = pData;

  if (amps === 0) {
    res.innerHTML = `
      <div style="background:rgba(239, 68, 68, 0.1);border:1px solid #ef4444;border-radius:6px;padding:10px 12px;color:#991b1b">
        ⚠️ <strong>Process / Thickness Incompatible:</strong> ${note}
      </div>
    `;
    return;
  }

  res.innerHTML = `
    <div class="welding-stat-grid" style="margin-bottom:8px">
      <div class="welding-param-card">
        <span class="label">Current (Amps)</span>
        <span class="value">${amps} <span style="font-size:11px;font-weight:normal">A</span></span>
        <div class="hint">Target heat window</div>
      </div>
      <div class="welding-param-card">
        <span class="label">Arc Voltage</span>
        <span class="value">${volts} <span style="font-size:11px;font-weight:normal">V</span></span>
        <div class="hint">Puddle wet-out width</div>
      </div>
      ${wfs > 0 ? `
      <div class="welding-param-card">
        <span class="label">Wire Feed Speed</span>
        <span class="value">${wfs} <span style="font-size:11px;font-weight:normal">IPM</span></span>
        <div class="hint">${(wfs * 0.0254).toFixed(1)} m/min</div>
      </div>` : `
      <div class="welding-param-card">
        <span class="label">Electrode Spec</span>
        <span class="value" style="font-size:13px">3/32" 2% La</span>
        <div class="hint">Tungsten ground to 20° point</div>
      </div>`}
      <div class="welding-param-card">
        <span class="label">Filler Wire</span>
        <span class="value" style="font-size:13px">${wire}</span>
        <div class="hint">${polarity}</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4">
      💡 <strong>Machine Guidance:</strong> ${note}<br>
      📐 <strong>Joint Note [${joint.toUpperCase()}]:</strong> For fillet/T-joints, increase wire feed speed by +10% to fill joint throat without undercut. Maintain 45° nozzle work angle bisecting the corner.
    </div>
  `;
}

function updateWeldGasCalc() {
  const proc = $("#weld-process")?.value || "mig_gmaw";
  const metal = $("#weld-metal")?.value || "mild_steel";
  const opt = $("#weld-gas-opt")?.value || "standard";
  const draft = $("#weld-draft-env")?.value || "still";
  const res = $("#weld-gas-result");
  if (!res) return;

  let gasBlend = "75% Argon / 25% CO₂ (C25)";
  let baseCfh = 20;
  let cupSize = "#8 (1/2\" Nozzle)";
  let why = "The universal gold standard for mild steel MIG. Creates smooth short-circuit arc with minimal spatter.";

  if (proc === "flux_core") {
    gasBlend = "None (Self-Shielding Flux Core)";
    baseCfh = 0;
    cupSize = "Thread Protector / Gasless Nozzle";
    why = "Internal flux ingredients vaporize to generate CO₂ gas shielding around the arc. Zero cylinder required.";
  } else if (proc === "tig_gtaw") {
    gasBlend = "100% Ultra-Pure Industrial Argon (Ar)";
    baseCfh = 15;
    cupSize = "#12 Gas Lens with fine mesh screen";
    why = "Inert argon protects molten tungsten electrode and pool from oxidation. Gas lens ensures laminar flow.";
  } else if (metal === "aluminum_6061") {
    gasBlend = "100% High-Purity Argon";
    baseCfh = 25;
    cupSize = "#8 or #10 Cup";
    why = "Argon allows cathodic etching to blast through refractory aluminum oxide (melting point 3700°F).";
  } else if (metal === "stainless_304") {
    if (proc === "mig_gmaw") {
      gasBlend = "90% He / 7.5% Ar / 2.5% CO₂ (Tri-Mix) or 98% Ar / 2% O₂";
      baseCfh = 22;
      why = "Prevents heavy chromium oxidation and keeps weld bead bright silver instead of scorched black.";
    } else {
      gasBlend = "100% Argon (Torch) + 100% Argon (Back-Purge)";
      baseCfh = 16;
      why = "Back-purging the backside of the seam prevents ugly 'sugaring' cauliflower oxidation inside the joint.";
    }
  } else if (opt === "deep_penetration") {
    gasBlend = "100% CO₂ (Carbon Dioxide)";
    baseCfh = 22;
    why = "Hotter arc and deepest penetration into heavy steel plate, but generates noticeably more spatter.";
  }

  let draftAdj = 0;
  let draftWarn = "";
  if (draft === "drafty") {
    draftAdj = 6;
    draftWarn = "Light breeze detected: Flow increased by +6 CFH to prevent air turbulence from diluting shield.";
  } else if (draft === "outdoor") {
    draftAdj = 12;
    draftWarn = "⚠️ WARNING: Shielding gas blows away outdoors at wind speeds > 4 MPH. Use wind shielding screens or switch to FCAW flux-cored wire.";
  }

  const totalCfh = baseCfh > 0 ? baseCfh + draftAdj : 0;
  const lpm = (totalCfh * 0.4719).toFixed(1);

  res.innerHTML = `
    <div style="background:var(--surface-sunken);border:1px solid var(--border);border-radius:6px;padding:8px 10px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <strong>${gasBlend}</strong>
        ${totalCfh > 0 ? `<span style="font-size:12px;color:var(--primary);font-weight:bold">${totalCfh} CFH (${lpm} L/min)</span>` : `<span style="color:var(--muted)">No Gas Required</span>`}
      </div>
      <div style="font-size:11px;color:var(--ink-secondary);margin-bottom:4px">${why}</div>
      <div style="font-size:11px">Cup / Diffuser: <strong>${cupSize}</strong></div>
    </div>
    ${draftWarn ? `<div style="font-size:11px;color:${draft === 'outdoor' ? '#ef4444' : 'var(--ink-secondary)'};padding:4px 6px;background:var(--surface-sunken);border-radius:4px">${draftWarn}</div>` : ""}
  `;
}

function updateWeldBendCalc() {
  const t = Math.max(0.1, parseFloat($("#weld-bend-thick")?.value) || 2.0);
  const r = Math.max(0.1, parseFloat($("#weld-bend-radius")?.value) || 2.0);
  const legA = Math.max(1, parseFloat($("#weld-bend-leg-a")?.value) || 50.0);
  const legB = Math.max(1, parseFloat($("#weld-bend-leg-b")?.value) || 75.0);
  const angle = Math.max(1, Math.min(179, parseFloat($("#weld-bend-angle")?.value) || 90));
  const k = parseFloat($("#weld-bend-kfactor")?.value) || 0.44;
  const res = $("#weld-bend-result");
  if (!res) return;

  const rad = angle * (Math.PI / 180);
  // Bend Allowance BA = rad * (R + K * T)
  const ba = rad * (r + (k * t));
  // Outside Setback OSB = tan(rad / 2) * (R + T)
  const osb = Math.tan(rad / 2) * (r + t);
  // Bend Deduction BD = (2 * OSB) - BA
  const bd = (2 * osb) - ba;
  // Flat blank cut length = A + B - BD
  const flatLength = legA + legB - bd;
  // First bend tangent line from edge A = legA - osb
  const bendLine1 = legA - osb;

  res.innerHTML = `
    <div style="background:var(--surface-sunken);border:1px solid var(--border);border-radius:6px;padding:8px 12px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <span style="font-size:11px;font-weight:700">FLAT CUT LENGTH (L_FLAT):</span>
        <strong style="font-size:18px;color:var(--primary)">${flatLength.toFixed(2)} mm</strong>
      </div>
      <div class="welding-stat-grid" style="margin-bottom:6px">
        <div class="welding-param-card">
          <span class="label">Bend Deduction (BD)</span>
          <span class="value">${bd.toFixed(2)} <span style="font-size:11px;font-weight:normal">mm</span></span>
          <div class="hint">Material subtracted for bend</div>
        </div>
        <div class="welding-param-card">
          <span class="label">Bend Allowance (BA)</span>
          <span class="value">${ba.toFixed(2)} <span style="font-size:11px;font-weight:normal">mm</span></span>
          <div class="hint">Arc length of neutral axis</div>
        </div>
        <div class="welding-param-card">
          <span class="label">Outside Setback (OSB)</span>
          <span class="value">${osb.toFixed(2)} <span style="font-size:11px;font-weight:normal">mm</span></span>
          <div class="hint">Apex to bend tangent line</div>
        </div>
        <div class="welding-param-card">
          <span class="label">Brake Sight Line</span>
          <span class="value">${bendLine1.toFixed(2)} <span style="font-size:11px;font-weight:normal">mm</span></span>
          <div class="hint">From Flange A edge to bend</div>
        </div>
      </div>
    </div>
    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4">
      📐 <strong>Press Brake Setup:</strong> Mark your sheet metal scribe line at <strong>${bendLine1.toFixed(2)} mm</strong> from Edge A. Align the press brake punch nose directly over the scribe line.<br>
      K-Factor <strong>${k}</strong> represents neutral axis displacement at ${(k * 100).toFixed(0)}% material thickness.
    </div>
  `;
}

function updateWeldHeatCalc() {
  const volts = Math.max(5, parseFloat($("#weld-heat-volts")?.value) || 19.5);
  const amps = Math.max(10, parseFloat($("#weld-heat-amps")?.value) || 140);
  const speedIpm = Math.max(1, parseFloat($("#weld-heat-speed")?.value) || 14.0);
  const eff = parseFloat($("#weld-heat-eff")?.value) || 0.80;
  const res = $("#weld-heat-result");
  if (!res) return;

  // Arc Heat Input: H = (Volts * Amps * 60 * eff) / (TravelSpeed_IPM * 1000) in kJ/inch
  const heatKjIn = (volts * amps * 60 * eff) / (speedIpm * 1000);
  const heatKjMm = (heatKjIn / 25.4).toFixed(2);

  let badgeClass = "low";
  let badgeTitle = "LOW HEAT INPUT (OPTIMAL)";
  let badgeNote = "Narrow Heat Affected Zone (HAZ). Minimal angular warpage and distortion. Low risk of burn-through.";

  if (heatKjIn > 35.0) {
    badgeClass = "high";
    badgeTitle = "HIGH HEAT INPUT (SEVERE WARPING RISK)";
    badgeNote = "Excessive heat build-up will cause severe angular potato-chipping distortion, grain coarsening in HAZ, and loss of toughness.";
  } else if (heatKjIn > 22.0) {
    badgeClass = "moderate";
    badgeTitle = "MODERATE HEAT INPUT";
    badgeNote = "Standard structural heat input. Clamp rigidly and use backstep welding to manage contraction stress.";
  }

  res.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <span class="welding-heat-badge ${badgeClass}">${badgeTitle}</span>
      <strong style="font-size:16px;color:var(--ink)">${heatKjIn.toFixed(1)} kJ/inch <span style="font-size:11px;font-weight:normal;color:var(--muted)">(${heatKjMm} kJ/mm)</span></strong>
    </div>

    <div style="background:var(--surface-sunken);border:1px solid var(--border);border-radius:6px;padding:8px 10px;font-size:11px;color:var(--ink-secondary);margin-bottom:8px">
      ${badgeNote}
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:6px;font-size:11px;color:var(--ink-secondary)">
      <div>🔄 <strong>Backstep Sequencing:</strong> Weld 2" beads backward towards the finished seam.</div>
      <div>❄️ <strong>Interpass Cooling:</strong> Wait until joint drops below 350°F (check with Tempilstik).</div>
      <div>🗜️ <strong>Pre-Bending Strategy:</strong> Preset flanges 2° reverse angle to pull 90° flat upon cooling.</div>
      <div>⚡ <strong>Travel Speed:</strong> Speeding up to ${(speedIpm * 1.25).toFixed(1)} IPM drops heat input by 20%.</div>
    </div>
  `;
}

function renderWeldingView() {
  updateWeldParamsCalc();
  updateWeldGasCalc();
  updateWeldBendCalc();
  updateWeldHeatCalc();
}

// ============================================================
// ⚙️ CNC Machining & Milling Studio Calculations & Handlers
// ============================================================
const CNC_MATERIALS = {
  hardwood: { sfm: 600, chip: 0.0035, hpFactor: 1.1, name: "Hardwood (Oak, Walnut, Maple)" },
  softwood: { sfm: 900, chip: 0.0045, hpFactor: 0.8, name: "Softwood (Pine, Cedar, Fir)" },
  plywood: { sfm: 750, chip: 0.0038, hpFactor: 0.9, name: "Baltic Birch / Plywood" },
  mdf: { sfm: 800, chip: 0.0040, hpFactor: 0.85, name: "MDF / Draftboard" },
  acrylic: { sfm: 500, chip: 0.0028, hpFactor: 0.7, name: "Cast Acrylic / PMMA" },
  delrin: { sfm: 600, chip: 0.0038, hpFactor: 0.65, name: "Delrin / Acetal POM" },
  aluminum: { sfm: 250, chip: 0.0015, hpFactor: 1.8, name: "6061-T6 Aluminum" },
  brass: { sfm: 300, chip: 0.0018, hpFactor: 1.6, name: "C360 Free-Cutting Brass" }
};

let cncSimTimer = null;
let cncSimStep = 0;
let cncSimPaths = [];

function copyCncSpecs() {
  const feedsText = $("#cnc-feeds-result")?.innerText || "";
  const scallopText = $("#cnc-scallop-result")?.innerText || "";
  const deflectText = $("#cnc-deflect-result")?.innerText || "";
  const text = `⚙️ CNC MACHINING FEEDS, SPEEDS & TOOLPATH SPEC SHEET\n\n${feedsText}\n\n${scallopText}\n\n${deflectText}`;
  void navigator.clipboard.writeText(text).then(() => showToast("Copied CNC Machining Specs to clipboard!"));
}

async function addCncSupplies() {
  const dia = $("#cnc-tool-dia option:checked")?.textContent.split("(")[0].trim() || "1/4\"";
  const bit = $("#cnc-bit-type option:checked")?.textContent.split("(")[0].trim() || "Solid Carbide Endmill";
  await addMaterialToProjectShopping(`${dia} ${bit}`, "1 bit", 36.00, "CNC Bits & Tooling");
}

function updateCncFeeds() {
  const matKey = ($("#cnc-studio-material") || $("#cnc-material"))?.value || "hardwood";
  const bitType = $("#cnc-bit-type")?.value || "upcut_2f";
  const toolDia = parseFloat($("#cnc-tool-dia")?.value) || 0.250;
  const spindleType = $("#cnc-spindle-type")?.value || "router_dw";
  const doc = Math.max(0.01, parseFloat($("#cnc-doc-in")?.value) || 0.125);
  const wocPct = Math.max(5, Math.min(100, parseFloat($("#cnc-woc-pct")?.value) || 40));
  const res = $("#cnc-feeds-result");
  if (!res) return;

  const mat = CNC_MATERIALS[matKey] || CNC_MATERIALS.hardwood;
  let flutes = 2;
  if (bitType === "surfacing") flutes = 3;
  if (toolDia <= 0.0625) flutes = 1;

  // Spindle constraints
  const spindleRanges = {
    router_dw: [16000, 27000, "DeWalt/Makita Trim Router (Dial 1–6)"],
    vfd_spindle: [8000, 24000, "VFD Spindle (ER20 / 2.2kW)"],
    desktop_cnc: [5000, 12000, "Desktop 775 / Genmitsu Hobby"]
  };
  const [minRpm, maxRpm, spindleName] = spindleRanges[spindleType] || spindleRanges.router_dw;

  // Theoretical RPM = (SFM * 3.82) / Diameter
  const rawRpm = Math.round((mat.sfm * 3.82) / toolDia);
  const clampedRpm = Math.max(minRpm, Math.min(maxRpm, rawRpm));

  // Feed Rate IPM = RPM * flutes * chipLoad
  const chipLoad = mat.chip * (toolDia / 0.250); // scales proportionally with bit size
  const feedIpm = Math.round(clampedRpm * flutes * chipLoad);
  const feedMmpm = Math.round(feedIpm * 25.4);
  const plungeIpm = Math.round(feedIpm * 0.35);
  const plungeMmpm = Math.round(plungeIpm * 25.4);

  // Material Removal Rate (MRR) = Feed * DOC * WOC
  const wocIn = toolDia * (wocPct / 100);
  const mrr = (feedIpm * doc * wocIn).toFixed(2);
  const estHp = (mrr * mat.hpFactor * 0.12).toFixed(2);

  let bitGuidance = "Standard two-flute tool.";
  if (bitType === "upcut_2f") bitGuidance = "High upward chip evacuation; ideal for deep pockets and slotting. May produce slight fuzz on top edge of wood.";
  else if (bitType === "downcut_2f") bitGuidance = "Forces chips down; leaves pristine razor-clean top veneer on plywood and laminated sheet goods.";
  else if (bitType === "compression") bitGuidance = "Upcut tip + downcut upper flutes. Clean edges on both top and bottom surfaces of plywood.";
  else if (bitType === "ballnose") bitGuidance = "Spherical hemispherical tip. Use 8–12% stepover for smooth 3D organic finishing.";
  else if (bitType === "vbit_90") bitGuidance = "V-carving bit; enter depth determines line width. Ramp into vector corners.";

  res.innerHTML = `
    <div class="welding-stat-grid" style="margin-bottom:8px">
      <div class="welding-param-card">
        <span class="label">Spindle Speed</span>
        <span class="value">${clampedRpm.toLocaleString()} <span style="font-size:11px;font-weight:normal">RPM</span></span>
        <div class="hint">${spindleName.split("(")[0].trim()}</div>
      </div>
      <div class="welding-param-card">
        <span class="label">Cutting Feed Rate</span>
        <span class="value">${feedIpm} <span style="font-size:11px;font-weight:normal">IPM</span></span>
        <div class="hint">${feedMmpm.toLocaleString()} mm/min</div>
      </div>
      <div class="welding-param-card">
        <span class="label">Plunge Rate</span>
        <span class="value">${plungeIpm} <span style="font-size:11px;font-weight:normal">IPM</span></span>
        <div class="hint">${plungeMmpm} mm/min (Ramp 20°)</div>
      </div>
      <div class="welding-param-card">
        <span class="label">Chip Load</span>
        <span class="value">${chipLoad.toFixed(4)}"</span>
        <div class="hint">${(chipLoad * 25.4).toFixed(3)} mm / tooth</div>
      </div>
      <div class="welding-param-card">
        <span class="label">Removal Rate (MRR)</span>
        <span class="value">${mrr} <span style="font-size:11px;font-weight:normal">in³/min</span></span>
        <div class="hint">~${estHp} Spindle HP draw</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4">
      💡 <strong>Bit Geometry:</strong> ${bitGuidance}<br>
      📐 <strong>Cut Depth &amp; Stepover:</strong> DOC: <strong>${doc}"</strong> (${(doc * 25.4).toFixed(2)} mm) · Stepover: <strong>${wocPct}%</strong> (${wocIn.toFixed(3)}" / ${(wocIn * 25.4).toFixed(2)} mm).
    </div>
  `;
}

function updateCncScallop() {
  const r = Math.max(0.1, parseFloat($("#cnc-scallop-radius")?.value) || 1.587);
  const s = Math.max(0.01, parseFloat($("#cnc-scallop-stepover")?.value) || 0.30);
  const res = $("#cnc-scallop-result");
  if (!res) return;

  // Cusp height h = R - sqrt(R^2 - (S/2)^2)
  let cuspMm = 0;
  if (s < 2 * r) {
    cuspMm = r - Math.sqrt(Math.pow(r, 2) - Math.pow(s / 2, 2));
  } else {
    cuspMm = r;
  }
  const cuspMicrons = (cuspMm * 1000).toFixed(1);
  const cuspInches = (cuspMm / 25.4).toFixed(5);
  const stepoverPct = ((s / (2 * r)) * 100).toFixed(0);

  let finishQuality = "Super Fine (Near Optical)";
  let sandAdvice = "Minimal to zero hand-sanding needed. Ready for direct oil / finish.";
  if (cuspMicrons > 25.0) {
    finishQuality = "Rough Corduroy Ridges";
    sandAdvice = "Heavy visible stepping ridges. Requires 80–120 grit aggressive hand sanding.";
  } else if (cuspMicrons > 10.0) {
    finishQuality = "Medium Satin 3D Finish";
    sandAdvice = "Moderate scallop. Quick pass with 220–320 grit sandpaper will smooth clean.";
  }

  res.innerHTML = `
    <div class="cnc-scallop-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <strong>${finishQuality}</strong>
        <span style="font-size:11px;color:var(--primary);font-weight:bold">Cusp Height: ${cuspMicrons} µm</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:6px;font-size:11px;margin-bottom:6px">
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:4px;padding:6px">
          <span style="font-size:10px;color:var(--muted);display:block">Cusp Depth (in)</span>
          <strong>${cuspInches}"</strong>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:4px;padding:6px">
          <span style="font-size:10px;color:var(--muted);display:block">Stepover %</span>
          <strong>${stepoverPct}% of tool dia</strong>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:4px;padding:6px">
          <span style="font-size:10px;color:var(--muted);display:block">Est. Ra Finish</span>
          <strong>~${(cuspMicrons / 4).toFixed(1)} µm Ra</strong>
        </div>
      </div>
      <div style="font-size:11px;color:var(--ink-secondary)">🪵 <strong>Sanding Profile:</strong> ${sandAdvice}</div>
    </div>
  `;
}

function updateCncDeflection() {
  const stickout = Math.max(0.1, parseFloat($("#cnc-deflect-stickout")?.value) || 0.875);
  const toolDia = parseFloat($("#cnc-tool-dia")?.value) || 0.250;
  const matType = $("#cnc-deflect-mat")?.value || "carbide";
  const res = $("#cnc-deflect-result");
  if (!res) return;

  // Elastic modulus E: Carbide = 85M PSI, HSS = 30M PSI
  const e = matType === "carbide" ? 85e6 : 30e6;
  // Second moment of area I = (pi * D^4) / 64
  const i = (Math.PI * Math.pow(toolDia, 4)) / 64;
  // Cutting force estimate F_t = 12 lbs for typical 1/4" cut
  const force = 12.0;
  // Deflection delta = (F * L^3) / (3 * E * I)
  const defInches = (force * Math.pow(stickout, 3)) / (3 * e * i);
  const defMm = defInches * 25.4;
  const defMicrons = (defMm * 1000).toFixed(1);

  const isSafe = defInches < 0.001; // under 0.001" (25 microns) is rigid and accurate
  const badgeClass = isSafe ? "cnc-deflect-safe" : "cnc-deflect-warn";
  const badgeText = isSafe ? "🟢 RIGID & ACCURATE" : "🔴 HIGH BIT FLEX (CHATTER RISK)";

  res.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <span class="cnc-deflect-badge ${badgeClass}">${badgeText}</span>
      <strong style="font-size:15px;color:var(--ink)">${defMicrons} µm <span style="font-size:11px;color:var(--muted)">(${defInches.toFixed(5)}")</span></strong>
    </div>

    <div style="background:var(--surface-sunken);border:1px solid var(--border);border-radius:6px;padding:8px 10px;font-size:11px;color:var(--ink-secondary);line-height:1.4">
      ${isSafe ? 
        `Deflection is within tight precision tolerances (< 0.001"). Slot walls will be perfectly vertical with zero taper.` :
        `⚠️ <strong>Deflection Exceeds 0.001" (25 µm):</strong> This stickout length (${stickout}") will cause the bit to flex away from the cut line, creating tapered walls, chatter lines, and high risk of snapped flutes. Choke up the bit in the collet or reduce pass depth.`
      }
    </div>
  `;
}

const CNC_GCODE_PRESETS = {
  pocket_spiral: `G90 G21
G0 Z5.000
G0 X200.000 Y150.000
G1 Z-2.000 F600
G2 X200.000 Y150.000 I15.000 J0.000 F1800
G2 X200.000 Y150.000 I30.000 J0.000 F1800
G2 X200.000 Y150.000 I45.000 J0.000 F1800
G0 Z5.000
G0 X50.000 Y50.000`,

  star_contour: `G90 G21
G0 Z5.000
G0 X200.000 Y70.000
G1 Z-3.000 F600
G1 X225.000 Y125.000 F2000
G1 X285.000 Y130.000
G1 X240.000 Y170.000
G1 X255.000 Y230.000
G1 X200.000 Y195.000
G1 X145.000 Y230.000
G1 X160.000 Y170.000
G1 X115.000 Y130.000
G1 X175.000 Y125.000
G1 X200.000 Y70.000
G0 Z5.000`,

  facing_zigzag: `G90 G21
G0 Z5.000
G0 X50.000 Y50.000
G1 Z-0.500 F800
G1 X350.000 Y50.000 F3000
G1 X350.000 Y90.000
G1 X50.000 Y90.000
G1 X50.000 Y130.000
G1 X350.000 Y130.000
G1 X350.000 Y170.000
G1 X50.000 Y170.000
G1 X50.000 Y210.000
G1 X350.000 Y210.000
G0 Z5.000`,

  bore_helix: `G90 G21
G0 Z5.000
G0 X200.000 Y100.000
G1 Z0.000 F600
G2 X200.000 Y100.000 I0.000 J50.000 Z-2.000 F1500
G2 X200.000 Y100.000 I0.000 J50.000 Z-4.000
G2 X200.000 Y100.000 I0.000 J50.000 Z-6.000
G2 X200.000 Y100.000 I0.000 J50.000
G0 Z5.000`
};

function parseAndRenderCncGcode(gcodeText) {
  const svg = $("#cnc-sim-svg");
  if (!svg) return;

  const lines = gcodeText.split("\n");
  let curX = 50, curY = 50;
  let paths = [];
  let totalCutLen = 0;
  let totalRapidLen = 0;

  lines.forEach(line => {
    const l = line.trim().toUpperCase();
    if (!l || l.startsWith("(") || l.startsWith(";")) return;

    const xMatch = l.match(/X([-\d.]+)/);
    const yMatch = l.match(/Y([-\d.]+)/);
    const targetX = xMatch ? parseFloat(xMatch[1]) : curX;
    const targetY = yMatch ? parseFloat(yMatch[1]) : curY;

    if (l.startsWith("G0")) {
      const dist = Math.hypot(targetX - curX, targetY - curY);
      totalRapidLen += dist;
      paths.push({ type: "G0", x1: curX, y1: curY, x2: targetX, y2: targetY });
      curX = targetX;
      curY = targetY;
    } else if (l.startsWith("G1")) {
      const dist = Math.hypot(targetX - curX, targetY - curY);
      totalCutLen += dist;
      paths.push({ type: "G1", x1: curX, y1: curY, x2: targetX, y2: targetY });
      curX = targetX;
      curY = targetY;
    } else if (l.startsWith("G2") || l.startsWith("G3")) {
      const iMatch = l.match(/I([-\d.]+)/);
      const jMatch = l.match(/J([-\d.]+)/);
      const iVal = iMatch ? parseFloat(iMatch[1]) : 0;
      const jVal = jMatch ? parseFloat(jMatch[1]) : 0;
      const dist = Math.PI * 2 * Math.hypot(iVal, jVal);
      totalCutLen += dist;
      paths.push({ type: "G2", x1: curX, y1: curY, x2: targetX, y2: targetY, i: iVal, j: jVal });
      curX = targetX;
      curY = targetY;
    }
  });

  cncSimPaths = paths;

  // Build SVG elements
  let svgContent = `
    <defs>
      <pattern id="cnc-grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" stroke-width="0.8"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#cnc-grid)" />
    <!-- Machine Limits Origin Crosshair -->
    <path d="M 10 280 L 40 280 M 25 265 L 25 295" stroke="#475569" stroke-width="1.5" />
    <text x="32" y="275" fill="#64748b" font-size="10" font-family="monospace">(0,0)</text>
  `;

  paths.forEach(p => {
    if (p.type === "G0") {
      svgContent += `<line x1="${p.x1}" y1="${p.y1}" x2="${p.x2}" y2="${p.y2}" stroke="#ef4444" stroke-width="1.2" stroke-dasharray="3,3" />`;
    } else if (p.type === "G1") {
      svgContent += `<line x1="${p.x1}" y1="${p.y1}" x2="${p.x2}" y2="${p.y2}" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" />`;
    } else if (p.type === "G2") {
      const radius = Math.hypot(p.i, p.j);
      svgContent += `<circle cx="${p.x1 + p.i}" cy="${p.y1 + p.j}" r="${radius}" fill="none" stroke="#4ade80" stroke-width="2" />`;
    }
  });

  // Animated tool cursor
  svgContent += `<circle id="cnc-tool-cursor" cx="${paths[0]?.x1 || 50}" cy="${paths[0]?.y1 || 50}" r="5" fill="#facc15" stroke="#ffffff" stroke-width="1.5" filter="drop-shadow(0 0 6px #facc15)" />`;

  svg.innerHTML = svgContent;

  const res = $("#cnc-gcode-result");
  if (res) {
    const estSec = ((totalCutLen / 2000) * 60 + (totalRapidLen / 5000) * 60).toFixed(1);
    res.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--ink-secondary)">
        <span>Vector Cut Distance: <strong>${(totalCutLen).toFixed(0)} mm</strong> · Rapid Transit: <strong>${(totalRapidLen).toFixed(0)} mm</strong></span>
        <strong style="color:var(--primary)">Estimated Run Time: ~${estSec}s</strong>
      </div>
    `;
  }
}

function simulateCncGcode() {
  if (cncSimTimer) clearInterval(cncSimTimer);
  const status = $("#cnc-sim-status");
  const cursor = $("#cnc-tool-cursor");
  if (!cursor || !cncSimPaths.length) return;

  cncSimStep = 0;
  if (status) status.textContent = "Simulating...";

  cncSimTimer = setInterval(() => {
    if (cncSimStep >= cncSimPaths.length) {
      clearInterval(cncSimTimer);
      cncSimTimer = null;
      if (status) status.textContent = "✓ Completed";
      return;
    }
    const p = cncSimPaths[cncSimStep];
    cursor.setAttribute("cx", p.x2);
    cursor.setAttribute("cy", p.y2);
    cncSimStep++;
  }, 120);
}

function resetCncGcode() {
  if (cncSimTimer) clearInterval(cncSimTimer);
  cncSimTimer = null;
  cncSimStep = 0;
  const status = $("#cnc-sim-status");
  if (status) status.textContent = "Ready";
  const cursor = $("#cnc-tool-cursor");
  if (cursor && cncSimPaths.length) {
    cursor.setAttribute("cx", cncSimPaths[0].x1);
    cursor.setAttribute("cy", cncSimPaths[0].y1);
  }
}

function renderCncView() {
  updateCncFeeds();
  updateCncScallop();
  updateCncDeflection();
  const presetKey = $("#cnc-gcode-preset")?.value || "pocket_spiral";
  const input = $("#cnc-gcode-input");
  if (input && !input.value.trim()) {
    input.value = CNC_GCODE_PRESETS[presetKey];
  }
  parseAndRenderCncGcode(input?.value || CNC_GCODE_PRESETS.pocket_spiral);
}

// ============================================================
// ⚒️ Blacksmithing & Bladesmithing Studio Calculations & Handlers
// ============================================================
function copyForgeSpecs() {
  const steelText = $("#forge-steel-result")?.innerText || "";
  const temperText = $("#forge-temper-result")?.innerText || "";
  const damascusText = $("#forge-damascus-result")?.innerText || "";
  const text = `⚒️ BLACKSMITHING & BLADESMITHING HEAT TREAT SPEC SHEET\n\n${steelText}\n\n${temperText}\n\n${damascusText}`;
  void navigator.clipboard.writeText(text).then(() => showToast("Copied Blacksmithing Specs to clipboard!"));
}

async function addForgeSupplies() {
  const steel = $("#forge-steel-select option:checked")?.textContent.split("(")[0].trim() || "1095 High Carbon";
  await addMaterialToProjectShopping(`${steel} Precision Ground Flat Bar (1.5" x 0.156" x 12")`, "2 bars", 29.00, "Blacksmithing, Steels & Gas");
}

function updateForgeSteel() {
  const steelKey = $("#forge-steel-select")?.value || "1095";
  const bladeType = $("#forge-blade-type")?.value || "chef";
  const res = $("#forge-steel-result");
  if (!res) return;

  const steelData = {
    "1095": {
      name: "AISI 1095 High Carbon Simple Steel",
      carbon: "0.95% Carbon",
      austTemp: "1475°F (802°C)",
      soak: "5–10 Minutes",
      quenchOil: "Fast Oil (Parks 50 / 9-second oil)",
      quenchTemp: "65°F – 75°F",
      asQuenchedHrc: "66 – 67 HRC",
      curie: "Non-magnetic transition at 1414°F (Curie point). Heat ~60°F past shadow fade.",
      normCycles: "1600°F -> 1525°F -> 1450°F (Three thermal cycles in air to eliminate forging stress)."
    },
    "5160": {
      name: "AISI 5160 Chromium Spring Steel",
      carbon: "0.60% Carbon, 0.80% Chromium",
      austTemp: "1525°F (830°C)",
      soak: "5 Minutes",
      quenchOil: "Medium Oil (Parks AAA or warm Canola oil)",
      quenchTemp: "120°F – 130°F (warm oil)",
      asQuenchedHrc: "62 – 64 HRC",
      curie: "Non-magnetic transition at 1420°F. Forgiving alloy for beginner and production bladesmiths.",
      normCycles: "1625°F -> 1550°F -> 1475°F air cool cycles."
    },
    "80crv2": {
      name: "80CrV2 Swedish High-Carbon Saw Steel",
      carbon: "0.80% Carbon, 0.50% Cr, 0.20% Vanadium",
      austTemp: "1510°F (820°C)",
      soak: "8–10 Minutes",
      quenchOil: "Fast to Medium Oil (Parks 50 or warm Parks AAA)",
      quenchTemp: "100°F – 120°F",
      asQuenchedHrc: "64 – 66 HRC",
      curie: "Vanadium addition inhibits grain growth even at slightly elevated temperatures.",
      normCycles: "1600°F -> 1525°F -> 1450°F cycles."
    },
    "o1": {
      name: "O1 Oil-Hardening Precision Tool Steel",
      carbon: "0.90% Carbon, 1.20% Manganese, 0.50% Chromium, 0.50% Tungsten",
      austTemp: "1475°F – 1500°F (815°C)",
      soak: "15–20 Minutes (Dwell time essential to dissolve complex carbides)",
      quenchOil: "Medium Speed Oil (Parks AAA)",
      quenchTemp: "125°F – 140°F",
      asQuenchedHrc: "64 – 65 HRC",
      curie: "Very low distortion during quench due to manganese stabilizing lattice.",
      normCycles: "1600°F -> 1500°F -> 1425°F cycles."
    },
    "d2": {
      name: "D2 High-Carbon High-Chromium Die Steel",
      carbon: "1.50% Carbon, 12.0% Chromium, 1.0% Moly, 1.0% Vanadium",
      austTemp: "1850°F (1010°C) in sealed stainless heat-treat foil",
      soak: "30 Minutes soak at peak heat",
      quenchOil: "Air Plate Quench (Clamp between 1\" aluminum chill plates with compressed air)",
      quenchTemp: "Ambient Room Temp",
      asQuenchedHrc: "63 – 65 HRC",
      curie: "High chromium semi-stainless. Massive carbide volume yields extreme abrasion wear life.",
      normCycles: "Do not normalize D2 in open forge; wrap in high-temp stainless foil."
    },
    "15n20": {
      name: "15N20 High-Nickel Band Saw Steel",
      carbon: "0.75% Carbon, 2.0% Nickel",
      austTemp: "1500°F (815°C)",
      soak: "5 Minutes",
      quenchOil: "Fast Oil (Parks 50)",
      quenchTemp: "70°F – 90°F",
      asQuenchedHrc: "64 – 65 HRC",
      curie: "Nickel resists ferric chloride acid attack, producing bright silvery Damascus lines.",
      normCycles: "Matches 1095 and 80CrV2 thermal cycling perfectly."
    }
  };

  const s = steelData[steelKey] || steelData["1095"];

  res.innerHTML = `
    <div style="background:var(--surface-sunken);border:1px solid var(--border);border-radius:6px;padding:8px 12px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <strong>${s.name} (${s.carbon})</strong>
        <span class="forge-quench-badge">As-Quenched: ${s.asQuenchedHrc}</span>
      </div>
      <div class="welding-stat-grid" style="margin-bottom:6px">
        <div class="welding-param-card">
          <span class="label">Austenitizing Temp</span>
          <span class="value" style="font-size:14px">${s.austTemp}</span>
          <div class="hint">Soak: ${s.soak}</div>
        </div>
        <div class="welding-param-card">
          <span class="label">Quench Medium</span>
          <span class="value" style="font-size:13px">${s.quenchOil.split("(")[0].trim()}</span>
          <div class="hint">Preheat oil to ${s.quenchTemp}</div>
        </div>
        <div class="welding-param-card">
          <span class="label">Curie Point Transition</span>
          <span class="value" style="font-size:13px">1414°F (Non-Mag)</span>
          <div class="hint">Use neodymium test wand</div>
        </div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4">
      🧲 <strong>Magnetic Check:</strong> ${s.curie}<br>
      🔄 <strong>Thermal Normalization Cycles:</strong> ${s.normCycles}
    </div>
  `;
}

function updateForgeTemper() {
  const steelKey = $("#forge-steel-select")?.value || "1095";
  const tempF = Math.max(300, Math.min(650, parseFloat($("#forge-temper-temp")?.value) || 400));
  const cycles = $("#forge-temper-cycles")?.value || "2";
  const res = $("#forge-temper-result");
  if (!res) return;

  // Estimate HRC based on temp
  // Base 66 HRC - ~1 HRC per 25°F above 350°F
  let estHrc = 66 - ((tempF - 350) / 25);
  if (steelKey === "5160") estHrc = 63 - ((tempF - 350) / 28);
  if (steelKey === "d2") estHrc = 64 - ((tempF - 400) / 40);
  estHrc = Math.max(48, Math.min(64, estHrc));

  // Determine oxide color
  let colorName = "Pale Straw";
  let hexColor = "#fef08a";
  let appBest = "Straight razors, surgical scalpels, fine woodworking chisels";

  if (tempF >= 590) {
    colorName = "Dark Blue / Gray";
    hexColor = "#475569";
    appBest = "Springs, pry bars, structural brackets (High impact shock, ductile)";
  } else if (tempF >= 540) {
    colorName = "Bright Peacock Blue";
    hexColor = "#2563eb";
    appBest = "Throwing knives, axes, tomahawks, broadsword blades";
  } else if (tempF >= 490) {
    colorName = "Purple / Brown";
    hexColor = "#9333ea";
    appBest = "Heavy camp knives, machetes, survival choppers";
  } else if (tempF >= 440) {
    colorName = "Bronze / Deep Straw";
    hexColor = "#ca8a04";
    appBest = "Everyday carry (EDC) pocket knives, hunting skinners";
  } else if (tempF >= 390) {
    colorName = "Light Straw";
    hexColor = "#facc15";
    appBest = "Japanese Santoku, Gyuto, French chef knives (Exceptional edge retention)";
  }

  res.innerHTML = `
    <div class="forge-temper-card">
      <div class="forge-color-swatch" style="background:${hexColor}"></div>
      <div style="flex:1">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <strong>${colorName} (${tempF}°F / ${Math.round((tempF - 32) * 5 / 9)}°C)</strong>
          <strong style="font-size:16px;color:var(--primary)">~${estHrc.toFixed(1)} HRC</strong>
        </div>
        <div style="font-size:11px;color:var(--ink-secondary);margin-top:2px">Best suited for: <em>${appBest}</em></div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4">
      ⏱️ <strong>Soak Protocol [${cycles} Cycles]:</strong> Bake in oven for <strong>2 hours per cycle</strong>. Allow to cool completely to room temperature between cycles to convert retained austenite into tempered martensite.
    </div>
  `;
}

function updateForgeDamascus() {
  const initial = parseInt($("#forge-damascus-initial")?.value, 10) || 7;
  const cutMult = parseInt($("#forge-damascus-cut")?.value, 10) || 3;
  const folds = Math.max(1, Math.min(8, parseInt($("#forge-damascus-folds")?.value, 10) || 4));
  const pattern = $("#forge-damascus-pattern")?.value || "raindrop";
  const res = $("#forge-damascus-result");
  if (!res) return;

  // Final layer count = initial * (cutMult ^ folds)
  const totalLayers = initial * Math.pow(cutMult, folds);
  // Layer thickness in finished 3.0mm blade spine = (3.0mm / totalLayers) * 1000 in microns
  const layerMicrons = (3000 / totalLayers).toFixed(1);

  const patternData = {
    raindrop: "Drill shallow cone divots across billet surface with ball mill or drill bit. When ground flat, concentric ring circles emerge.",
    ladder: "Grind or forge transverse grooves across billet width every 1/2\". Flattens into ladder rung stripes.",
    twist: "Heat billet to yellow forging heat (2100°F). Clamp end in heavy vise and twist 360° continuously. Yields intricate starburst spiral whorls.",
    feather: "Cut billet down center with hot hardy cut chisel; restack with spine in center to form feathered chevron backbone."
  };

  res.innerHTML = `
    <div style="background:var(--surface-sunken);border:1px solid var(--border);border-radius:6px;padding:8px 12px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <span style="font-size:11px;font-weight:700">DAMASCUS ARCHITECTURE:</span>
        <strong style="font-size:18px;color:var(--primary)">${totalLayers.toLocaleString()} True Layers</strong>
      </div>
      <div class="forge-damascus-bar"></div>
      <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:6px;font-size:11px;margin-top:8px">
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:4px;padding:6px">
          <span style="font-size:10px;color:var(--muted);display:block">Layer Thickness</span>
          <strong>~${layerMicrons} µm</strong>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:4px;padding:6px">
          <span style="font-size:10px;color:var(--muted);display:block">Initial Stack</span>
          <strong>${initial} Plies</strong>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:4px;padding:6px">
          <span style="font-size:10px;color:var(--muted);display:block">Folds (${folds}×)</span>
          <strong>${cutMult}× Multiplier</strong>
        </div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4">
      🎨 <strong>Pattern Method:</strong> ${patternData[pattern]}<br>
      🧪 <strong>Contrast Etch:</strong> Submerge clean blade into <strong>Ferric Chloride (FeCl₃) 1:4 with distilled water</strong> for 10 minutes. Neutralize in baking soda bath, then soak 4 hours in strong instant coffee to turn 1095 pitch black while 15N20 stays bright chrome!
    </div>
  `;
}

function updateForgeGas() {
  const burners = parseInt($("#forge-gas-burners")?.value, 10) || 2;
  const tip = parseFloat($("#forge-gas-tip")?.value) || 0.035;
  const psi = Math.max(3, Math.min(30, parseFloat($("#forge-gas-psi")?.value) || 12));
  const targetHeat = $("#forge-target-temp")?.value || "weld";
  const res = $("#forge-gas-result");
  if (!res) return;

  // Approx BTU per burner: 0.035" tip @ 10 PSI = ~55,000 BTU/hr
  const baseBtuPerBurner = (tip / 0.035) * Math.sqrt(psi / 10) * 55000;
  const totalBtu = Math.round(baseBtuPerBurner * burners);
  // Propane has ~21,500 BTU per pound; 20 lb tank = ~430,000 BTU
  const lbsPerHour = (totalBtu / 21500).toFixed(2);
  const tankHours = (430000 / totalBtu).toFixed(1);

  let atmosphereDesc = "Neutral balanced flame (clean heating with low scaling).";
  if (targetHeat === "weld") {
    atmosphereDesc = "Slightly reducing / rich flame (excess unburnt gas forms soft blue flame lick at door; excludes oxygen to prevent scale between forge weld layers).";
  } else if (targetHeat === "heattreat") {
    atmosphereDesc = "Dial back choke and pressure to 4–6 PSI for gentle 1475°F soaking without overheating thin blade tips.";
  }

  res.innerHTML = `
    <div class="welding-stat-grid" style="margin-bottom:8px">
      <div class="welding-param-card">
        <span class="label">Total Forge Output</span>
        <span class="value">${(totalBtu / 1000).toFixed(0)}k <span style="font-size:11px;font-weight:normal">BTU/hr</span></span>
        <div class="hint">${burners} Burners @ ${psi} PSI</div>
      </div>
      <div class="welding-param-card">
        <span class="label">Fuel Consumption</span>
        <span class="value">${lbsPerHour} <span style="font-size:11px;font-weight:normal">lbs/hr</span></span>
        <div class="hint">Propane vapor draw</div>
      </div>
      <div class="welding-param-card">
        <span class="label">20 lb Tank Runtime</span>
        <span class="value">~${tankHours} <span style="font-size:11px;font-weight:normal">Hours</span></span>
        <div class="hint">Continuous full fire</div>
      </div>
      <div class="welding-param-card">
        <span class="label">Atmosphere</span>
        <span class="value" style="font-size:13px">${targetHeat === 'weld' ? 'Reducing Flame' : 'Neutral Flame'}</span>
        <div class="hint">Zero scale oxidation</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4">
      🔥 <strong>Atmospheric Tuning:</strong> ${atmosphereDesc}<br>
      ⚠️ <strong>Freeze Prevention:</strong> High draw (> 3.5 lbs/hr) causes 20 lb tanks to frost over. Place tank in a bucket of lukewarm room-temperature water to maintain steady vapor pressure.
    </div>
  `;
}

function renderBlacksmithView() {
  updateForgeSteel();
  updateForgeTemper();
  updateForgeDamascus();
  updateForgeGas();
}

// ============================================================
// 🔩 Fasteners, Bolts & Drills Studio Calculations & Handlers
// ============================================================
const FASTENER_DATA = {
  "metric-coarse": {
    "M1.6x0.35": { major: 1.6, pitch: 0.35, tapDia: 1.25, tapName: "1.25 mm (#55)", close: 1.7, closeName: "1.7 mm (#51)", norm: 1.8, normName: "1.8 mm (#50)", loose: 2.0, looseName: "2.0 mm (#47)", area: 1.27 },
    "M2x0.4": { major: 2.0, pitch: 0.4, tapDia: 1.60, tapName: "1.60 mm (#52)", close: 2.1, closeName: "2.1 mm (#45)", norm: 2.2, normName: "2.2 mm (#44)", loose: 2.4, looseName: "2.4 mm (#41)", area: 2.07 },
    "M2.5x0.45": { major: 2.5, pitch: 0.45, tapDia: 2.05, tapName: "2.05 mm (#46)", close: 2.6, closeName: "2.6 mm (#37)", norm: 2.7, normName: "2.7 mm (#36)", loose: 3.0, looseName: "3.0 mm (#31)", area: 3.39 },
    "M3x0.5": { major: 3.0, pitch: 0.5, tapDia: 2.50, tapName: "2.50 mm (#39 / 3/32\")", close: 3.2, closeName: "3.2 mm (#30 / 1/8\")", norm: 3.4, normName: "3.4 mm (#29)", loose: 3.6, looseName: "3.6 mm (#27)", area: 5.03 },
    "M4x0.7": { major: 4.0, pitch: 0.7, tapDia: 3.30, tapName: "3.30 mm (#29 / 1/8\")", close: 4.3, closeName: "4.3 mm (#18 / 11/64\")", norm: 4.5, normName: "4.5 mm (#16)", loose: 4.8, looseName: "4.8 mm (#12 / 3/16\")", area: 8.78 },
    "M5x0.8": { major: 5.0, pitch: 0.8, tapDia: 4.20, tapName: "4.20 mm (#19 / 11/64\")", close: 5.3, closeName: "5.3 mm (#4 / 13/64\")", norm: 5.5, normName: "5.5 mm (7/32\")", loose: 5.8, looseName: "5.8 mm (#1)", area: 14.2 },
    "M6x1.0": { major: 6.0, pitch: 1.0, tapDia: 5.00, tapName: "5.00 mm (#8 / 13/64\")", close: 6.4, closeName: "6.4 mm (1/4\")", norm: 6.6, normName: "6.6 mm (Letter G / 17/64\")", loose: 7.0, looseName: "7.0 mm (Letter J / 9/32\")", area: 20.1 },
    "M8x1.25": { major: 8.0, pitch: 1.25, tapDia: 6.80, tapName: "6.80 mm (Letter H / 17/64\")", close: 8.4, closeName: "8.4 mm (21/64\")", norm: 9.0, normName: "9.0 mm (Letter T / 23/64\")", loose: 9.5, looseName: "9.5 mm (3/8\")", area: 36.6 },
    "M10x1.5": { major: 10.0, pitch: 1.5, tapDia: 8.50, tapName: "8.50 mm (Letter R / 21/64\")", close: 10.5, closeName: "10.5 mm (27/64\")", norm: 11.0, normName: "11.0 mm (7/16\")", loose: 11.5, looseName: "11.5 mm (29/64\")", area: 58.0 },
    "M12x1.75": { major: 12.0, pitch: 1.75, tapDia: 10.20, tapName: "10.20 mm (13/32\")", close: 12.5, closeName: "12.5 mm (1/2\")", norm: 13.0, normName: "13.0 mm (33/64\")", loose: 13.5, looseName: "13.5 mm (17/32\")", area: 84.3 },
    "M14x2.0": { major: 14.0, pitch: 2.0, tapDia: 12.00, tapName: "12.00 mm (15/32\")", close: 14.5, closeName: "14.5 mm (37/64\")", norm: 15.0, normName: "15.0 mm (19/32\")", loose: 15.5, looseName: "15.5 mm (39/64\")", area: 115 },
    "M16x2.0": { major: 16.0, pitch: 2.0, tapDia: 14.00, tapName: "14.00 mm (35/64\")", close: 16.5, closeName: "16.5 mm (21/32\")", norm: 17.5, normName: "17.5 mm (11/16\")", loose: 18.0, looseName: "18.0 mm (23/32\")", area: 157 },
    "M20x2.5": { major: 20.0, pitch: 2.5, tapDia: 17.50, tapName: "17.50 mm (11/16\")", close: 20.5, closeName: "20.5 mm (13/16\")", norm: 21.5, normName: "21.5 mm (27/32\")", loose: 22.0, looseName: "22.0 mm (7/8\")", area: 245 }
  },
  "metric-fine": {
    "M4x0.5": { major: 4.0, pitch: 0.5, tapDia: 3.50, tapName: "3.50 mm (#28)", close: 4.3, closeName: "4.3 mm (#18)", norm: 4.5, normName: "4.5 mm (#16)", loose: 4.8, looseName: "4.8 mm (#12)", area: 9.79 },
    "M6x0.75": { major: 6.0, pitch: 0.75, tapDia: 5.25, tapName: "5.25 mm (#4)", close: 6.4, closeName: "6.4 mm (1/4\")", norm: 6.6, normName: "6.6 mm (Letter G)", loose: 7.0, looseName: "7.0 mm (Letter J)", area: 21.8 },
    "M8x1.0": { major: 8.0, pitch: 1.0, tapDia: 7.00, tapName: "7.00 mm (Letter J / 9/32\")", close: 8.4, closeName: "8.4 mm (21/64\")", norm: 9.0, normName: "9.0 mm (Letter T)", loose: 9.5, looseName: "9.5 mm (3/8\")", area: 39.2 },
    "M10x1.25": { major: 10.0, pitch: 1.25, tapDia: 8.75, tapName: "8.75 mm (11/32\")", close: 10.5, closeName: "10.5 mm (27/64\")", norm: 11.0, normName: "11.0 mm (7/16\")", loose: 11.5, looseName: "11.5 mm (29/64\")", area: 61.2 },
    "M12x1.25": { major: 12.0, pitch: 1.25, tapDia: 10.75, tapName: "10.75 mm (27/64\")", close: 12.5, closeName: "12.5 mm (1/2\")", norm: 13.0, normName: "13.0 mm (33/64\")", loose: 13.5, looseName: "13.5 mm (17/32\")", area: 92.1 },
    "M14x1.5": { major: 14.0, pitch: 1.5, tapDia: 12.50, tapName: "12.50 mm (1/2\")", close: 14.5, closeName: "14.5 mm (37/64\")", norm: 15.0, normName: "15.0 mm (19/32\")", loose: 15.5, looseName: "15.5 mm (39/64\")", area: 125 },
    "M16x1.5": { major: 16.0, pitch: 1.5, tapDia: 14.50, tapName: "14.50 mm (37/64\")", close: 16.5, closeName: "16.5 mm (21/32\")", norm: 17.5, normName: "17.5 mm (11/16\")", loose: 18.0, looseName: "18.0 mm (23/32\")", area: 167 }
  },
  "unc": {
    "#2-56 UNC": { major: 2.18, pitch: 0.45, tpi: 56, tapDia: 1.78, tapName: "#50 (0.0700\")", close: 2.26, closeName: "#43 (0.0890\")", norm: 2.44, normName: "#41 (0.0960\")", loose: 2.64, looseName: "#37 (0.1040\")", area: 2.39 },
    "#4-40 UNC": { major: 2.84, pitch: 0.635, tpi: 40, tapDia: 2.26, tapName: "#43 (0.0890\")", close: 2.95, closeName: "#32 (0.1160\")", norm: 3.26, normName: "#30 (0.1285\")", loose: 3.57, looseName: "9/64\" (0.1406\")", area: 3.90 },
    "#6-32 UNC": { major: 3.51, pitch: 0.794, tpi: 32, tapDia: 2.71, tapName: "#36 (0.1065\")", close: 3.66, closeName: "#27 (0.1440\")", norm: 3.80, normName: "#25 (0.1495\")", loose: 4.31, looseName: "#18 (0.1695\")", area: 5.86 },
    "#8-32 UNC": { major: 4.17, pitch: 0.794, tpi: 32, tapDia: 3.45, tapName: "#29 (0.1360\")", close: 4.31, closeName: "#18 (0.1695\")", norm: 4.50, normName: "#16 (0.1770\")", loose: 4.92, looseName: "#10 (0.1935\")", area: 9.03 },
    "#10-24 UNC": { major: 4.83, pitch: 1.058, tpi: 24, tapDia: 3.80, tapName: "#25 (0.1495\")", close: 4.98, closeName: "#9 (0.1960\")", norm: 5.11, normName: "#7 (0.2010\")", loose: 5.61, looseName: "#2 (0.2210\")", area: 11.29 },
    "1/4\"-20 UNC": { major: 6.35, pitch: 1.27, tpi: 20, tapDia: 5.11, tapName: "#7 (0.2010\" / 5.1 mm)", close: 6.53, closeName: "Letter F (0.2570\")", norm: 6.76, normName: "Letter H (0.2660\")", loose: 7.14, looseName: "9/32\" (0.2812\")", area: 20.5 },
    "5/16\"-18 UNC": { major: 7.94, pitch: 1.41, tpi: 18, tapDia: 6.53, tapName: "Letter F (0.2570\")", close: 8.33, closeName: "21/64\" (0.3281\")", norm: 8.43, normName: "Letter Q (0.3320\")", loose: 8.73, looseName: "11/32\" (0.3438\")", area: 33.8 },
    "3/8\"-16 UNC": { major: 9.53, pitch: 1.587, tpi: 16, tapDia: 7.94, tapName: "5/16\" (0.3125\" / 7.9 mm)", close: 9.80, closeName: "Letter W (0.3860\")", norm: 9.92, normName: "25/64\" (0.3906\")", loose: 10.32, looseName: "13/32\" (0.4062\")", area: 50.0 },
    "1/2\"-13 UNC": { major: 12.70, pitch: 1.954, tpi: 13, tapDia: 10.72, tapName: "27/64\" (0.4219\")", close: 13.10, closeName: "33/64\" (0.5156\")", norm: 13.49, normName: "17/32\" (0.5312\")", loose: 14.29, looseName: "9/16\" (0.5625\")", area: 91.5 },
    "5/8\"-11 UNC": { major: 15.88, pitch: 2.309, tpi: 11, tapDia: 13.49, tapName: "17/32\" (0.5312\")", close: 16.27, closeName: "41/64\" (0.6406\")", norm: 16.67, normName: "21/32\" (0.6562\")", loose: 17.46, looseName: "11/16\" (0.6875\")", area: 145.8 },
    "3/4\"-10 UNC": { major: 19.05, pitch: 2.54, tpi: 10, tapDia: 16.67, tapName: "21/32\" (0.6562\")", close: 19.45, closeName: "49/64\" (0.7656\")", norm: 19.84, normName: "25/32\" (0.7812\")", loose: 20.64, looseName: "13/16\" (0.8125\")", area: 215.8 }
  },
  "unf": {
    "#0-80 UNF": { major: 1.52, pitch: 0.317, tpi: 80, tapDia: 1.19, tapName: "3/64\" (#56 / 0.0469\")", close: 1.61, closeName: "#52 (0.0635\")", norm: 1.70, normName: "#51 (0.0670\")", loose: 1.93, looseName: "#48 (0.0760\")", area: 1.16 },
    "#2-64 UNF": { major: 2.18, pitch: 0.397, tpi: 64, tapDia: 1.78, tapName: "#49 (0.0700\")", close: 2.26, closeName: "#43 (0.0890\")", norm: 2.44, normName: "#41 (0.0960\")", loose: 2.64, looseName: "#37 (0.1040\")", area: 2.54 },
    "#4-48 UNF": { major: 2.84, pitch: 0.529, tpi: 48, tapDia: 2.37, tapName: "#42 (0.0935\")", close: 2.95, closeName: "#32 (0.1160\")", norm: 3.26, normName: "#30 (0.1285\")", loose: 3.57, looseName: "9/64\" (0.1406\")", area: 4.26 },
    "#6-40 UNF": { major: 3.51, pitch: 0.635, tpi: 40, tapDia: 2.95, tapName: "#33 (0.1130\")", close: 3.66, closeName: "#27 (0.1440\")", norm: 3.80, normName: "#25 (0.1495\")", loose: 4.31, looseName: "#18 (0.1695\")", area: 6.55 },
    "#8-36 UNF": { major: 4.17, pitch: 0.706, tpi: 36, tapDia: 3.51, tapName: "#29 (0.1360\")", close: 4.31, closeName: "#18 (0.1695\")", norm: 4.50, normName: "#16 (0.1770\")", loose: 4.92, looseName: "#10 (0.1935\")", area: 9.51 },
    "#10-32 UNF": { major: 4.83, pitch: 0.794, tpi: 32, tapDia: 4.04, tapName: "#21 (0.1590\")", close: 4.98, closeName: "#9 (0.1960\")", norm: 5.11, normName: "#7 (0.2010\")", loose: 5.61, looseName: "#2 (0.2210\")", area: 12.90 },
    "1/4\"-28 UNF": { major: 6.35, pitch: 0.907, tpi: 28, tapDia: 5.41, tapName: "#3 (0.2130\")", close: 6.53, closeName: "Letter F (0.2570\")", norm: 6.76, normName: "Letter H (0.2660\")", loose: 7.14, looseName: "9/32\" (0.2812\")", area: 23.5 },
    "5/16\"-24 UNF": { major: 7.94, pitch: 1.058, tpi: 24, tapDia: 6.91, tapName: "Letter I (0.2720\")", close: 8.33, closeName: "21/64\" (0.3281\")", norm: 8.43, normName: "Letter Q (0.3320\")", loose: 8.73, looseName: "11/32\" (0.3438\")", area: 37.4 },
    "3/8\"-24 UNF": { major: 9.53, pitch: 1.058, tpi: 24, tapDia: 8.43, tapName: "Letter Q (0.3320\")", close: 9.80, closeName: "Letter W (0.3860\")", norm: 9.92, normName: "25/64\" (0.3906\")", loose: 10.32, looseName: "13/32\" (0.4062\")", area: 56.6 },
    "1/2\"-20 UNF": { major: 12.70, pitch: 1.27, tpi: 20, tapDia: 11.51, tapName: "29/64\" (0.4531\")", close: 13.10, closeName: "33/64\" (0.5156\")", norm: 13.49, normName: "17/32\" (0.5312\")", loose: 14.29, looseName: "9/16\" (0.5625\")", area: 103.2 },
    "3/4\"-16 UNF": { major: 19.05, pitch: 1.587, tpi: 16, tapDia: 17.46, tapName: "11/16\" (0.6875\")", close: 19.45, closeName: "49/64\" (0.7656\")", norm: 19.84, normName: "25/32\" (0.7812\")", loose: 20.64, looseName: "13/16\" (0.8125\")", area: 240.6 }
  }
};

function copyFastenersSpecs() {
  const tapText = $("#fastener-tap-result")?.innerText || "";
  const torqueText = $("#fastener-torque-result")?.innerText || "";
  const woodText = $("#fastener-wood-result")?.innerText || "";
  const cbText = $("#fastener-cb-result")?.innerText || "";
  const text = `🔩 FASTENERS, TAPPING & DRILL CLEARANCE SPEC SHEET\n\n${tapText}\n\n${torqueText}\n\n${woodText}\n\n${cbText}`;
  void navigator.clipboard.writeText(text).then(() => showToast("Copied Fastener Specs to clipboard!"));
}

async function addFastenersSupplies() {
  const std = $("#fastener-standard-select")?.value || "metric-coarse";
  const size = $("#fastener-size-select")?.value || (std.startsWith("metric") ? "M5x0.8" : "1/4\"-20 UNC");
  await addMaterialToProjectShopping(`${size} High-Tensile Fasteners & Nuts (Box of 50)`, "1 box", 14.50, "Fasteners & Hardware");
}

function populateFastenerStudioSizes() {
  const std = $("#fastener-standard-select")?.value || "metric-coarse";
  const select = $("#fastener-size-select");
  if (!select) return;

  const currentVal = select.value;
  const sizes = Object.keys(FASTENER_DATA[std] || {});
  select.innerHTML = sizes.map(s => `<option value="${s}">${s}</option>`).join("");

  if (sizes.includes(currentVal)) {
    select.value = currentVal;
  } else if (sizes.includes("M5x0.8")) {
    select.value = "M5x0.8";
  } else if (sizes.includes("1/4\"-20 UNC")) {
    select.value = "1/4\"-20 UNC";
  } else if (sizes.length > 0) {
    select.selectedIndex = 0;
  }
}

function updateFastenerTap() {
  const std = $("#fastener-standard-select")?.value || "metric-coarse";
  const sizeKey = $("#fastener-size-select")?.value;
  const material = $("#fastener-material-select")?.value || "steel";
  const res = $("#fastener-tap-result");
  if (!res) return;

  const dataSet = FASTENER_DATA[std] || {};
  const item = dataSet[sizeKey] || Object.values(dataSet)[0];
  if (!item) return;

  const diaRef = $("#fastener-torque-diameter-ref");
  if (diaRef) diaRef.textContent = `${sizeKey} (Major: ${item.major} mm)`;

  let materialEngagement = "70% – 75% thread engagement (industry standard for ductile steel/iron)";
  if (material === "aluminum") {
    materialEngagement = "60% – 65% engagement (prevents aluminum galling & tap breakage)";
  } else if (material === "plastic") {
    materialEngagement = "75% – 80% engagement (maximizes shear strength in soft plastics/nylon)";
  } else if (material === "stainless") {
    materialEngagement = "65% engagement (critical to avoid work-hardening stainless threads)";
  }

  res.innerHTML = `
    <div class="fastener-spec-grid">
      <div class="fastener-stat-card">
        <span class="label">Recommended Tap Drill</span>
        <span class="value" style="color:var(--primary)">${item.tapName}</span>
        <div class="hint">Optimal for ~75% engagement</div>
      </div>
      <div class="fastener-stat-card">
        <span class="label">Close Clearance (H12)</span>
        <span class="value">${item.closeName}</span>
        <div class="hint">Precision located alignment</div>
      </div>
      <div class="fastener-stat-card">
        <span class="label">Normal Clearance (H13)</span>
        <span class="value">${item.normName}</span>
        <div class="hint">Standard mechanical through-hole</div>
      </div>
      <div class="fastener-stat-card">
        <span class="label">Loose Clearance (H14)</span>
        <span class="value">${item.looseName}</span>
        <div class="hint">Slotted / sheet metal clearance</div>
      </div>
    </div>

    <table class="fastener-tap-table">
      <thead>
        <tr>
          <th>Nominal Size</th>
          <th>Major Dia</th>
          <th>Pitch / TPI</th>
          <th>Tensile Stress Area (As)</th>
          <th>Material Guideline</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>${sizeKey}</strong></td>
          <td>${item.major} mm (${(item.major / 25.4).toFixed(3)}")</td>
          <td>${item.pitch} mm ${item.tpi ? `(${item.tpi} TPI)` : ''}</td>
          <td>${item.area} mm² (${(item.area / 645.16).toFixed(4)} in²)</td>
          <td>${materialEngagement}</td>
        </tr>
      </tbody>
    </table>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      💡 <strong>Machinist Rule:</strong> Minimum internal thread engagement depth should be <strong>1.0× nominal bolt diameter</strong> in steel, <strong>1.5×</strong> in cast iron, and <strong>2.0×</strong> in aluminum or soft plastics.
    </div>
  `;
}

function updateFastenerTorque() {
  const std = $("#fastener-standard-select")?.value || "metric-coarse";
  const sizeKey = $("#fastener-size-select")?.value;
  const grade = $("#fastener-grade-select")?.value || "8.8";
  const lube = $("#fastener-lube-select")?.value || "dry";
  const preloadPct = parseFloat($("#fastener-preload-target")?.value) || 0.75;
  const res = $("#fastener-torque-result");
  if (!res) return;

  const dataSet = FASTENER_DATA[std] || {};
  const item = dataSet[sizeKey] || Object.values(dataSet)[0];
  if (!item) return;

  // Proof strength Sp (MPa)
  const proofStrengthMap = {
    "8.8": 600,
    "10.9": 830,
    "12.9": 970,
    "a2": 450,
    "4.8": 310
  };
  const sp = proofStrengthMap[grade] || 600;

  // Friction nut factor K
  const kMap = {
    "dry": 0.20,
    "oil": 0.15,
    "antiseize": 0.10,
    "threadlocker": 0.18
  };
  const kFactor = kMap[lube] || 0.20;

  // Clamping Preload Force F (N) = preloadPct * Sp (N/mm^2) * As (mm^2)
  const clampForceN = preloadPct * sp * item.area;
  const clampForceKn = (clampForceN / 1000).toFixed(2);
  const clampForceLbf = Math.round(clampForceN * 0.224809);

  // Torque T (N*m) = K * D (meters) * F (N)
  const dMeters = item.major / 1000;
  const torqueNm = (kFactor * dMeters * clampForceN).toFixed(1);
  const torqueFtLb = (parseFloat(torqueNm) * 0.737562).toFixed(1);
  const torqueInLb = Math.round(parseFloat(torqueNm) * 8.85075);

  res.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px">
      <span class="fastener-torque-badge">⚡ Recommended Torque: ${torqueNm} N·m (${torqueFtLb} ft·lb / ${torqueInLb} in·lb)</span>
      <span style="font-size:11px;color:var(--muted)">Preload Tension: <strong>${clampForceKn} kN</strong> (${clampForceLbf.toLocaleString()} lbf)</span>
    </div>

    <div class="fastener-spec-grid">
      <div class="fastener-stat-card">
        <span class="label">Tightening Torque</span>
        <span class="value">${torqueNm} N·m</span>
        <div class="hint">${torqueFtLb} ft-lbs (${torqueInLb} in-lbs)</div>
      </div>
      <div class="fastener-stat-card">
        <span class="label">Tensile Clamp Force</span>
        <span class="value">${clampForceKn} kN</span>
        <div class="hint">${clampForceLbf.toLocaleString()} lbs clamping load</div>
      </div>
      <div class="fastener-stat-card">
        <span class="label">Nut Factor (K)</span>
        <span class="value">${kFactor.toFixed(2)}</span>
        <div class="hint">${lube.toUpperCase()} friction coefficient</div>
      </div>
      <div class="fastener-stat-card">
        <span class="label">Proof Strength</span>
        <span class="value">${sp} MPa</span>
        <div class="hint">${Math.round(sp * 145.038).toLocaleString()} psi proof rating</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      ⚠️ <strong>Anti-Seize Warning:</strong> Moly or copper anti-seize drops K to 0.10, reducing friction by 50%. Always reduce tightening torque accordingly to avoid stretching or snapping bolts!
    </div>
  `;
}

function updateFastenerWood() {
  const gauge = $("#fastener-wood-gauge")?.value || "8";
  const woodType = $("#fastener-wood-type")?.value || "hardwood";
  const style = $("#fastener-wood-style")?.value || "countersink";
  const lengthIn = parseFloat($("#fastener-wood-length")?.value) || 1.5;
  const res = $("#fastener-wood-result");
  if (!res) return;

  const woodData = {
    "4": { major: '0.112" (2.84 mm)', hardPilot: '5/64" (2.0 mm)', softPilot: '1/16" (1.6 mm)', shank: '7/64" (2.8 mm)', csink: '1/4" (6.4 mm)', plug: '3/8"' },
    "6": { major: '0.138" (3.51 mm)', hardPilot: '3/32" (2.4 mm)', softPilot: '5/64" (2.0 mm)', shank: '9/64" (3.5 mm)', csink: '5/16" (7.9 mm)', plug: '3/8"' },
    "8": { major: '0.164" (4.17 mm)', hardPilot: '7/64" (2.8 mm)', softPilot: '3/32" (2.4 mm)', shank: '11/64" (4.3 mm)', csink: '3/8" (9.5 mm)', plug: '3/8"' },
    "10": { major: '0.190" (4.83 mm)', hardPilot: '1/8" (3.2 mm)', softPilot: '7/64" (2.8 mm)', shank: '3/16" (4.8 mm)', csink: '7/16" (11.1 mm)', plug: '1/2"' },
    "12": { major: '0.216" (5.49 mm)', hardPilot: '9/64" (3.6 mm)', softPilot: '1/8" (3.2 mm)', shank: '7/32" (5.5 mm)', csink: '1/2" (12.7 mm)', plug: '1/2"' },
    "14": { major: '0.242" (6.15 mm)', hardPilot: '5/32" (4.0 mm)', softPilot: '9/64" (3.6 mm)', shank: '1/4" (6.3 mm)', csink: '9/16" (14.3 mm)', plug: '5/8"' }
  };

  const item = woodData[gauge] || woodData["8"];
  const pilot = woodType === "hardwood" ? item.hardPilot : item.softPilot;

  let headPrepDesc = "";
  if (style === "countersink") {
    headPrepDesc = `Flush 82° Countersink: Chamfer surface hole to <strong>${item.csink}</strong> outer diameter until screw head sits flush or 0.5 mm below wood plane.`;
  } else if (style === "counterbore") {
    headPrepDesc = `Plugged Counterbore: Drill <strong>${item.plug}</strong> diameter flat-bottom counterbore pocket 3/8" deep. Cut face-grain wood plugs with a matching ${item.plug} plug cutter for invisible joinery.`;
  } else {
    headPrepDesc = `Round / Pan Head: No countersink required. Use flat washer on softwood to prevent head crushing wood fibers.`;
  }

  res.innerHTML = `
    <div class="fastener-spec-grid">
      <div class="fastener-stat-card">
        <span class="label">Pilot Hole (Threads)</span>
        <span class="value" style="color:var(--primary)">${pilot}</span>
        <div class="hint">Depth: full ${(lengthIn * 0.9).toFixed(2)}" length</div>
      </div>
      <div class="fastener-stat-card">
        <span class="label">Shank Clearance</span>
        <span class="value">${item.shank}</span>
        <div class="hint">Through top face board only</div>
      </div>
      <div class="fastener-stat-card">
        <span class="label">Head Diameter</span>
        <span class="value">${item.csink}</span>
        <div class="hint">82° standard wood screw bevel</div>
      </div>
      <div class="fastener-stat-card">
        <span class="label">Wood Plug Cutter</span>
        <span class="value">${item.plug}</span>
        <div class="hint">For counterbore plugs</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      🪵 <strong>Wood Preparation:</strong> ${headPrepDesc}<br>
      ⚠️ <strong>Split Prevention:</strong> Drilling the shank clearance hole through the top board allows the screw threads to freely pull the two boards tightly together without binding (preventing joint gaps).
    </div>
  `;
}

function updateFastenerCounterbore() {
  const style = $("#fastener-cb-style")?.value || "shcs";
  const size = $("#fastener-cb-size")?.value || "M5";
  const fit = $("#fastener-cb-fit")?.value || "normal";
  const res = $("#fastener-cb-result");
  if (!res) return;

  const cbData = {
    shcs: {
      M3: { headDia: 5.5, headHt: 3.0, hex: 2.5, through: 3.4 },
      M4: { headDia: 7.0, headHt: 4.0, hex: 3.0, through: 4.5 },
      M5: { headDia: 8.5, headHt: 5.0, hex: 4.0, through: 5.5 },
      M6: { headDia: 10.0, headHt: 6.0, hex: 5.0, through: 6.6 },
      M8: { headDia: 13.0, headHt: 8.0, hex: 6.0, through: 9.0 },
      M10: { headDia: 16.0, headHt: 10.0, hex: 8.0, through: 11.0 },
      M12: { headDia: 18.0, headHt: 12.0, hex: 10.0, through: 13.5 }
    },
    button: {
      M3: { headDia: 5.7, headHt: 1.65, hex: 2.0, through: 3.4 },
      M4: { headDia: 7.6, headHt: 2.20, hex: 2.5, through: 4.5 },
      M5: { headDia: 9.5, headHt: 2.75, hex: 3.0, through: 5.5 },
      M6: { headDia: 10.5, headHt: 3.30, hex: 4.0, through: 6.6 },
      M8: { headDia: 14.0, headHt: 4.40, hex: 5.0, through: 9.0 },
      M10: { headDia: 17.5, headHt: 5.50, hex: 6.0, through: 11.0 },
      M12: { headDia: 21.0, headHt: 6.60, hex: 8.0, through: 13.5 }
    },
    flat: {
      M3: { headDia: 6.0, headHt: 1.7, hex: 2.0, through: 3.4 },
      M4: { headDia: 8.0, headHt: 2.3, hex: 2.5, through: 4.5 },
      M5: { headDia: 10.0, headHt: 2.8, hex: 3.0, through: 5.5 },
      M6: { headDia: 12.0, headHt: 3.3, hex: 4.0, through: 6.6 },
      M8: { headDia: 16.0, headHt: 4.4, hex: 5.0, through: 9.0 },
      M10: { headDia: 20.0, headHt: 5.5, hex: 6.0, through: 11.0 },
      M12: { headDia: 24.0, headHt: 6.5, hex: 8.0, through: 13.5 }
    }
  };

  const item = cbData[style]?.[size] || cbData.shcs.M5;

  let pocketDiaAllowance = 0.8;
  if (fit === "tight") pocketDiaAllowance = 0.3;
  if (fit === "generous") pocketDiaAllowance = 1.5;

  const cbPocketDia = (item.headDia + pocketDiaAllowance).toFixed(1);
  const cbDepth = (item.headHt + 0.4).toFixed(1);

  res.innerHTML = `
    <div class="fastener-spec-grid">
      <div class="fastener-stat-card">
        <span class="label">Counterbore Pocket Dia</span>
        <span class="value" style="color:var(--primary)">${cbPocketDia} mm</span>
        <div class="hint">Head OD: ${item.headDia} mm + ${pocketDiaAllowance} mm</div>
      </div>
      <div class="fastener-stat-card">
        <span class="label">Minimum Pocket Depth</span>
        <span class="value">${cbDepth} mm</span>
        <div class="hint">Head Ht: ${item.headHt} mm + 0.4 mm sub-flush</div>
      </div>
      <div class="fastener-stat-card">
        <span class="label">Clearance Through-Hole</span>
        <span class="value">${item.through} mm</span>
        <div class="hint">Standard through-hole drill</div>
      </div>
      <div class="fastener-stat-card">
        <span class="label">Hex Key / Drive</span>
        <span class="value">${item.hex} mm</span>
        <div class="hint">Allen wrench size required</div>
      </div>
    </div>

    <div class="fastener-cb-diagram">
      <svg width="180" height="90" viewBox="0 0 180 90" style="background:var(--surface);border-radius:6px;border:1px solid var(--border)">
        <!-- Material block -->
        <rect x="20" y="20" width="140" height="60" fill="rgba(100,116,139,0.2)" stroke="var(--border)" stroke-width="1"/>
        <!-- Counterbore pocket -->
        <rect x="60" y="20" width="60" height="28" fill="var(--surface-sunken)" stroke="var(--primary)" stroke-width="1.5"/>
        <!-- Through hole -->
        <rect x="75" y="48" width="30" height="32" fill="var(--surface-sunken)" stroke="var(--primary)" stroke-width="1.5"/>
        <!-- Callout text -->
        <text x="90" y="38" font-size="9" text-anchor="middle" fill="var(--primary)" font-weight="bold">Ø ${cbPocketDia}</text>
        <text x="90" y="66" font-size="8" text-anchor="middle" fill="var(--muted)">Ø ${item.through}</text>
        <text x="145" y="38" font-size="8" fill="var(--ink-secondary)">Depth: ${cbDepth}mm</text>
      </svg>
      <div style="font-size:12px;color:var(--ink-secondary);line-height:1.4;flex:1">
        📐 <strong>Machining Tooling:</strong> Use a flat-bottom <strong>${cbPocketDia} mm endmill</strong> or counterbore cutter with ${item.through} mm pilot pin. Ensure the bottom face of the pocket is completely flat so the bolt head seats uniformly without canting or bending under tensile load.
      </div>
    </div>
  `;
}

function renderFastenersView() {
  populateFastenerStudioSizes();
  updateFastenerTap();
  updateFastenerTorque();
  updateFastenerWood();
  updateFastenerCounterbore();
}

// ============================================================
// 🪟 Stained Glass & Copper Foil Studio Calculations & Handlers
// ============================================================
function copyGlassSpecs() {
  const solderText = $("#glass-solder-result")?.innerText || "";
  const foilText = $("#glass-foil-result")?.innerText || "";
  const patinaText = $("#glass-patina-result")?.innerText || "";
  const scoreText = $("#glass-score-result")?.innerText || "";
  const text = `🪟 STAINED GLASS & COPPER FOIL STUDIO SPEC SHEET\n\n${solderText}\n\n${foilText}\n\n${patinaText}\n\n${scoreText}`;
  void navigator.clipboard.writeText(text).then(() => showToast("Copied Stained Glass Specs to clipboard!"));
}

async function addGlassSupplies() {
  const alloy = $("#glass-solder-alloy option:checked")?.textContent.split("(")[0].trim() || "60/40 Tin/Lead";
  const foil = $("#glass-foil-width option:checked")?.textContent.split("(")[0].trim() || "7/32\" Foil";
  await addMaterialToProjectShopping(`${alloy} Solder & ${foil} Tape Bundle`, "1 bundle", 29.50, "Stained Glass, Foil & Came");
}

function updateGlassSolder() {
  const lengthIn = Math.max(1, parseFloat($("#glass-seam-length")?.value) || 120);
  const assembly = $("#glass-assembly-type")?.value || "foil-dome";
  const alloy = $("#glass-solder-alloy")?.value || "6040";
  const res = $("#glass-solder-result");
  if (!res) return;

  // Rate in oz per linear foot (1 ft = 12 in)
  const ratePerFootMap = {
    "foil-dome": 0.52,
    "foil-flat": 0.30,
    "lead-came": 0.16,
    "zinc-border": 0.40
  };
  const rateOzPerFt = ratePerFootMap[assembly] || 0.52;
  const feet = lengthIn / 12;
  const totalOz = feet * rateOzPerFt;
  const totalGrams = Math.round(totalOz * 28.3495);
  const spools1lb = (totalOz / 16 * 1.1).toFixed(1); // 10% safety allowance

  // Alloy thermal properties
  const thermalData = {
    "6040": { meltRange: "361°F – 374°F (183°C – 190°C)", recIronF: "410°F – 420°F", recIronC: "210°C – 215°C", rheostat: "3.5 / 5", crown: "High decorative rounded dome (Tiffany standard)" },
    "5050": { meltRange: "361°F – 421°F (183°C – 216°C)", recIronF: "430°F – 450°F", recIronC: "221°C – 232°C", rheostat: "4.0 / 5", crown: "Flatter bead; wider slushy range prevents melting lead came" },
    "6337": { meltRange: "361°F Eutectic (183°C instant solid)", recIronF: "390°F – 405°F", recIronC: "199°C – 207°C", rheostat: "3.2 / 5", crown: "Instant freezing; zero slumping on 3D sculptural solder" },
    "leadfree": { meltRange: "440°F Liquidus (227°C)", recIronF: "480°F – 500°F", recIronC: "249°C – 260°C", rheostat: "4.5 / 5", crown: "Food/skin safe jewelry; requires higher wattage & frequent tip tinning" }
  };
  const alloyInfo = thermalData[alloy] || thermalData["6040"];

  res.innerHTML = `
    <div class="glass-solder-summary">
      <div class="glass-stat-card">
        <span class="label">Total Solder Needed</span>
        <span class="value" style="color:var(--primary)">${totalOz.toFixed(1)} oz</span>
        <div class="hint">${totalGrams} grams (+10% margin: ${spools1lb} lb)</div>
      </div>
      <div class="glass-stat-card">
        <span class="label">Iron Setpoint Temp</span>
        <span class="value">${alloyInfo.recIronF}</span>
        <div class="hint">${alloyInfo.recIronC} · Dial ${alloyInfo.rheostat}</div>
      </div>
      <div class="glass-stat-card">
        <span class="label">Alloy Melting Range</span>
        <span class="value" style="font-size:13px">${alloyInfo.meltRange.split('(')[0]}</span>
        <div class="hint">Melting to liquidus</div>
      </div>
      <div class="glass-stat-card">
        <span class="label">Seam Footage</span>
        <span class="value">${feet.toFixed(1)} ft</span>
        <div class="hint">${Math.round(lengthIn * 2.54)} cm linear joint</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      ✨ <strong>Bead Profile:</strong> ${alloyInfo.crown}<br>
      🌡️ <strong>Thermal Tip Control:</strong> Maintain iron tip flat on seam with steady 3–5 seconds per inch sweep speed. Tin tip frequently with damp cellulose sponge and sal ammoniac block to prevent solder drag ridges.
    </div>
  `;
}

function updateGlassFoil() {
  const glassMm = parseFloat($("#glass-thickness")?.value) || 3.0;
  const foilWidthFrac = $("#glass-foil-width")?.value || "7/32";
  const backing = $("#glass-foil-backing")?.value || "black";
  const mil = $("#glass-foil-mil")?.value || "1.0";
  const res = $("#glass-foil-result");
  if (!res) return;

  const widthMmMap = {
    "5/32": 3.97,
    "3/16": 4.76,
    "7/32": 5.56,
    "1/4": 6.35,
    "5/16": 7.94
  };
  const foilWidthMm = widthMmMap[foilWidthFrac] || 5.56;
  const overhangMm = (foilWidthMm - glassMm) / 2;
  const overhangIn = (overhangMm / 25.4).toFixed(3);

  let evalBadge = "";
  let evalNote = "";
  if (overhangMm < 0.6) {
    evalBadge = '<span style="color:#ef4444;font-weight:bold">⚠️ Fragile / Insufficient Overhang</span>';
    evalNote = "Overhang is under 0.6 mm. High risk of foil tape lifting off under solder iron heat. Step up one foil width.";
  } else if (overhangMm >= 0.9 && overhangMm <= 1.5) {
    evalBadge = '<span style="color:#10b981;font-weight:bold">✅ Golden Tiffany Ratio (Ideal)</span>';
    evalNote = "Balanced 1.0–1.5 mm overhang creates a robust mechanical wrap without masking artwork glass.";
  } else {
    evalBadge = '<span style="color:#f59e0b;font-weight:bold">ℹ️ Heavy Structural / Wide Bead</span>';
    evalNote = "Wide overhang creates a bold, structural solder bead. Recommended for outer perimeter borders and heavy lampshades.";
  }

  const backingGuide = {
    "black": "Black Backed: Essential for clear, translucent, or water glass when using black chemical patina, so no bright copper shows through the glass edge.",
    "copper": "Copper Backed: Matches clear glass when using copper patina.",
    "silver": "Silver Backed: Matches mirror backing and polished silver seams.",
    "standard": "Standard Core: Cost-effective for opaque and opalescent art glass where the back of the tape is completely invisible."
  }[backing];

  res.innerHTML = `
    <div class="glass-solder-summary">
      <div class="glass-stat-card">
        <span class="label">Overhang Per Face</span>
        <span class="value" style="color:var(--primary)">${overhangMm.toFixed(2)} mm</span>
        <div class="hint">${overhangIn}" wrap per side</div>
      </div>
      <div class="glass-stat-card">
        <span class="label">Foil Width</span>
        <span class="value">${foilWidthFrac}"</span>
        <div class="hint">${foilWidthMm.toFixed(2)} mm tape width</div>
      </div>
      <div class="glass-stat-card">
        <span class="label">Glass Thickness</span>
        <span class="value">${glassMm.toFixed(1)} mm</span>
        <div class="hint">~${(glassMm / 25.4).toFixed(3)}" plate</div>
      </div>
      <div class="glass-stat-card">
        <span class="label">Evaluation</span>
        <div style="font-size:12px;margin-top:2px">${evalBadge}</div>
        <div class="hint">${mil} mil pliable foil</div>
      </div>
    </div>

    <div class="glass-foil-cross-section">
      <div style="font-size:12px;font-weight:600;margin-bottom:4px">📐 Cross-Section Geometry &amp; Burnishing</div>
      <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4">
        • ${evalNote}<br>
        • <strong>Backing Matching:</strong> ${backingGuide}<br>
        • <strong>Burnishing Rule:</strong> Press foil firmly with a plastic fid or wood dowel on the top face, edge, and bottom face to eliminate air pockets before applying flux.
      </div>
    </div>
  `;
}

function updateGlassPatina() {
  const target = $("#glass-patina-target")?.value || "black";
  const flux = $("#glass-flux-type")?.value || "liquid-zinc";
  const res = $("#glass-patina-result");
  if (!res) return;

  const chemicalGuide = {
    "black": {
      name: "Novacan Black Patina (Copper Selenide)",
      prep: "Submerge finished panel in baking soda neutralizing bath (1 cup baking soda per gallon of warm water) or spray CJ's Flux Remover. Scrub with dish soap and rinse thoroughly.",
      chem: "Pour 2 oz patina into plastic cup (never dip brush directly into bottle). Apply with dedicated foam brush or cotton pad. Reaction turns seam jet black within 3 seconds. Rinse immediately with cold water.",
      seal: "Dry thoroughly with microfiber towel. Apply generous coat of microcrystalline carnauba wax / stained glass finishing polish. Let haze for 10 minutes, then buff with soft cloth to lock out oxygen and prevent white mold."
    },
    "copper": {
      name: "Novacan Copper Patina (Electro-Chemical Displacement)",
      prep: "Thoroughly neutralize all zinc chloride flux. Buff solder seams with #0000 fine bronze wool until beads are bright and shiny silver.",
      chem: "Apply copper patina smoothly with foam brush. The chemical deposits a micro-layer of pure copper. Do not over-scrub during reaction or the thin copper coat will wipe off.",
      seal: "Rinse cold, dry completely, and wax immediately. Copper oxidizes rapidly in air; polish seals the brilliant penny shine."
    },
    "silver": {
      name: "Polished Silver Pewter (Natural 60/40 Seam)",
      prep: "Neutralize flux in warm soapy water with a soft bristle brush.",
      chem: "Skip chemical patina. Polish clean bare solder directly with fine 0000 steel wool or nylon abrasive pad for a bright metallic silver pewter luster.",
      seal: "Apply stained glass wax immediately to prevent atmospheric lead dulling and white bloom oxidation."
    }
  }[target];

  res.innerHTML = `
    <div style="font-weight:600;font-size:12px;margin-bottom:6px;display:flex;align-items:center;gap:6px">
      <span>🧪 Protocol:</span> <span>${chemicalGuide.name}</span>
    </div>

    <div class="glass-patina-step-list">
      <div class="glass-patina-step">
        <div class="glass-patina-step-num">1</div>
        <div>
          <strong>Flux Neutralization (${flux === 'liquid-zinc' ? 'Zinc Chloride Acid' : 'Gel Flux'}):</strong><br>
          ${chemicalGuide.prep}
        </div>
      </div>
      <div class="glass-patina-step">
        <div class="glass-patina-step-num">2</div>
        <div>
          <strong>Mechanical Deoxidation:</strong><br>
          Scrub all solder seams with 0000 steel wool to remove dull gray oxide film down to brilliant lustrous tin/lead.
        </div>
      </div>
      <div class="glass-patina-step">
        <div class="glass-patina-step-num">3</div>
        <div>
          <strong>Chemical Application:</strong><br>
          ${chemicalGuide.chem}
        </div>
      </div>
      <div class="glass-patina-step">
        <div class="glass-patina-step-num">4</div>
        <div>
          <strong>White Mold (Lead Carbonate) Prevention:</strong><br>
          ${chemicalGuide.seal}
        </div>
      </div>
    </div>
  `;
}

function updateGlassScore() {
  const sheet = $("#glass-score-sheet")?.value || "cathedral";
  const shape = $("#glass-score-shape")?.value || "straight";
  const oil = $("#glass-score-oil")?.value || "mineral";
  const res = $("#glass-score-result");
  if (!res) return;

  const sheetData = {
    "cathedral": { pressure: "5 – 7 lbs", sound: "Crisp light zipper tearing sound", angle: "134° Carbide Wheel", notes: "Consistent texture; smooth fluid score without hesitation." },
    "opalescent": { pressure: "7 – 9 lbs", sound: "Firm steady sizzle sound", angle: "134° – 140° Carbide Wheel", notes: "Denser rolled glass with internal grain; score with firm posture." },
    "textured": { pressure: "6 – 8 lbs", sound: "Variable sound across ridges", angle: "140° Steep Carbide Wheel", notes: "Always flip sheet and score on the smoothest back face to avoid wheel jumping." },
    "hard": { pressure: "10 – 12 lbs", sound: "Sharp distinct snap line", angle: "140° – 145° Heavy Wheel", notes: "Borosilicate or fused art glass; requires steep carbide bevel and heavy downward hand force." }
  }[sheet];

  let shapeGuide = "";
  if (shape === "straight") {
    shapeGuide = "Straight Break: Place running pliers alignment mark directly over score line at sheet edge. Squeeze gently; the mechanical curve pops the fissure along the entire length.";
  } else if (shape === "convex") {
    shapeGuide = "Convex Outer Curve: Score smoothly around the contour. Apply running pliers at one edge or tap lightly underneath the score line with brass ball cutter handle until fissure runs.";
  } else if (shape === "shallow-concave") {
    shapeGuide = "Shallow Inside Curve: Make score in one continuous sweep. Use running pliers positioned with curved jaw facing upward to flex the center outwards.";
  } else {
    shapeGuide = "Deep Inside Curve / Horseshoe: DO NOT attempt to snap in one cut. Draw series of stepped tangent relief lines from the waste margin towards the inner curve boundary. Score relief lines first, snap off waste strips sequentially with grozing pliers, then make final inner curve finish score!";
  }

  res.innerHTML = `
    <div class="glass-solder-summary">
      <div class="glass-stat-card">
        <span class="label">Target Hand Pressure</span>
        <span class="value" style="color:var(--primary)">${sheetData.pressure}</span>
        <div class="hint">Steady downward thrust</div>
      </div>
      <div class="glass-stat-card">
        <span class="label">Wheel Bevel Angle</span>
        <span class="value">${sheetData.angle}</span>
        <div class="hint">Industrial tungsten carbide</div>
      </div>
      <div class="glass-stat-card">
        <span class="label">Acoustic Feedback</span>
        <span class="value" style="font-size:13px">${sheetData.sound}</span>
        <div class="hint">No crunching / no skipping</div>
      </div>
      <div class="glass-stat-card">
        <span class="label">Cutting Fluid</span>
        <span class="value" style="font-size:13px">${oil === 'mineral' ? 'Light Mineral Oil' : (oil === 'water-soluble' ? 'Water-Soluble Fluid' : 'Dry Wheel')}</span>
        <div class="hint">Keeps micro-fissure open</div>
      </div>
    </div>

    <div class="glass-score-guide">
      🔪 <strong>Break Mechanics (${shape.replace('-', ' ').toUpperCase()}):</strong><br>
      ${shapeGuide}<br><br>
      💡 <strong>Pro Tip:</strong> Never score twice over the same line! A second score ruins the carbide wheel blade and creates jagged, micro-chipped edges that crack during soldering.
    </div>
  `;
}

function renderGlassView() {
  updateGlassSolder();
  updateGlassFoil();
  updateGlassPatina();
  updateGlassScore();
}

// ============================================================
// 💍 Jewelry Making & Metalsmithing Studio Calculations
// ============================================================
const JEWELRY_RING_DATA = {
  "4": { us: 4, dia: 14.9, circ: 46.8, uk: "H", eu: 47, jp: 7 },
  "5": { us: 5, dia: 15.7, circ: 49.3, uk: "J 1/2", eu: 49, jp: 9 },
  "6": { us: 6, dia: 16.5, circ: 51.9, uk: "M", eu: 52, jp: 11 },
  "7": { us: 7, dia: 17.3, circ: 54.4, uk: "O", eu: 54, jp: 14 },
  "8": { us: 8, dia: 18.1, circ: 57.0, uk: "Q", eu: 57, jp: 16 },
  "9": { us: 9, dia: 19.0, circ: 59.5, uk: "S", eu: 60, jp: 18 },
  "10": { us: 10, dia: 19.8, circ: 62.2, uk: "T 1/2", eu: 62, jp: 20 },
  "11": { us: 11, dia: 20.6, circ: 64.7, uk: "V 1/2", eu: 65, jp: 23 },
  "12": { us: 12, dia: 21.4, circ: 67.2, uk: "Y", eu: 67, jp: 25 },
  "13": { us: 13, dia: 22.2, circ: 69.7, uk: "Z+1", eu: 70, jp: 27 }
};

function copyJewelrySpecs() {
  const ringText = $("#jewelry-ring-result")?.innerText || "";
  const bezelText = $("#jewelry-bezel-result")?.innerText || "";
  const castText = $("#jewelry-casting-result")?.innerText || "";
  const solderText = $("#jewelry-soldering-result")?.innerText || "";
  const text = `💍 JEWELRY MAKING & METALSMITHING SPEC SHEET\n\n${ringText}\n\n${bezelText}\n\n${castText}\n\n${solderText}`;
  void navigator.clipboard.writeText(text).then(() => showToast("Copied Jewelry Specs to clipboard!"));
}

async function addJewelrySupplies() {
  const alloy = $("#jewelry-cast-metal option:checked")?.textContent.split("(")[0].trim() || "Sterling Silver 925";
  await addMaterialToProjectShopping(`${alloy} Wire & Sheet Stock Assortment`, "1 pack", 38.00, "Precious Metals & Gemstones");
}

function updateJewelryRing() {
  const sizeKey = $("#jewelry-ring-size")?.value || "7";
  const metalThick = parseFloat($("#jewelry-metal-thick")?.value) || 1.3;
  const bandWidth = parseFloat($("#jewelry-band-width")?.value) || 4;
  const res = $("#jewelry-ring-result");
  if (!res) return;

  const ringInfo = JEWELRY_RING_DATA[sizeKey] || JEWELRY_RING_DATA["7"];

  // Band width size adjustment: wide bands compress tissue, requiring stepped up size
  let adjustedDia = ringInfo.dia;
  let widthNote = "Standard fit";
  if (bandWidth >= 6 && bandWidth < 8) {
    adjustedDia += 0.2; // approx 1/4 size
    widthNote = "Wide band (+0.25 US size compensation)";
  } else if (bandWidth >= 8 && bandWidth < 10) {
    adjustedDia += 0.4; // approx 1/2 size
    widthNote = "Extra wide band (+0.50 US size compensation)";
  } else if (bandWidth >= 10) {
    adjustedDia += 0.6; // approx 3/4 size
    widthNote = "Cigar band (+0.75 US size compensation)";
  }

  // Neutral bend axis formula: Length = PI * (Inner Diameter + Metal Thickness) + 0.25mm saw kerf
  const blankLengthMm = Math.PI * (adjustedDia + metalThick) + 0.25;
  const blankLengthIn = (blankLengthMm / 25.4).toFixed(3);

  res.innerHTML = `
    <div class="jewelry-spec-grid">
      <div class="jewelry-stat-card">
        <span class="label">Cut Blank Strip Length</span>
        <span class="value" style="color:var(--primary)">${blankLengthMm.toFixed(1)} mm</span>
        <div class="hint">${blankLengthIn}" flat strip (incl. saw kerf)</div>
      </div>
      <div class="jewelry-stat-card">
        <span class="label">Mandrel Inner Diameter</span>
        <span class="value">${adjustedDia.toFixed(1)} mm</span>
        <div class="hint">Circumference: ${(Math.PI * adjustedDia).toFixed(1)} mm</div>
      </div>
      <div class="jewelry-stat-card">
        <span class="label">International Sizes</span>
        <span class="value" style="font-size:13px">UK ${ringInfo.uk} • EU ${ringInfo.eu}</span>
        <div class="hint">Japan/Asia Size: ${ringInfo.jp}</div>
      </div>
      <div class="jewelry-stat-card">
        <span class="label">Band Comfort Fit</span>
        <span class="value" style="font-size:13px">${bandWidth} mm Width</span>
        <div class="hint">${widthNote}</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      📏 <strong>Neutral Bend Axis:</strong> When bending metal into a ring, the inside face compresses while the outside face stretches. The neutral axis lies in the middle (Inner Dia + Thickness).<br>
      🔨 <strong>Joint Prep:</strong> File both ends dead square before bending. When ends meet on the mandrel, snap-pass a jeweler's saw blade through the joint seam for light-tight, flush solder alignment!
    </div>
  `;
}

function updateJewelryBezel() {
  const shape = $("#jewelry-stone-shape")?.value || "oval";
  const len = Math.max(2, parseFloat($("#jewelry-stone-len")?.value) || 18);
  const width = Math.max(2, parseFloat($("#jewelry-stone-width")?.value) || 13);
  const height = Math.max(1, parseFloat($("#jewelry-stone-height")?.value) || 5);
  const res = $("#jewelry-bezel-result");
  if (!res) return;

  // Perimeter calculation
  let perimeter = 0;
  if (shape === "round") {
    perimeter = Math.PI * len;
  } else if (shape === "oval") {
    // Ramanujan approximation for ellipse perimeter
    const a = len / 2;
    const b = width / 2;
    const hR = Math.pow(a - b, 2) / Math.pow(a + b, 2);
    perimeter = Math.PI * (a + b) * (1 + (3 * hR) / (10 + Math.sqrt(4 - 3 * hR)));
  } else {
    // Rectangle / Cushion
    perimeter = (len * 2) + (width * 2) - 1.0; // corner radius deduction
  }

  // Bezel cut length: perimeter + 0.5mm overlap joint
  const bezelCutMm = perimeter + 0.5;

  // Recommended bezel wall height: 65% of stone dome height
  const recBezelHeightMm = (height * 0.65).toFixed(1);

  res.innerHTML = `
    <div class="jewelry-spec-grid">
      <div class="jewelry-stat-card">
        <span class="label">Bezel Wire Cut Length</span>
        <span class="value" style="color:var(--primary)">${bezelCutMm.toFixed(1)} mm</span>
        <div class="hint">Includes +0.5 mm overlap joint</div>
      </div>
      <div class="jewelry-stat-card">
        <span class="label">Recommended Bezel Height</span>
        <span class="value">${recBezelHeightMm} mm</span>
        <div class="hint">65% of ${height} mm dome height</div>
      </div>
      <div class="jewelry-stat-card">
        <span class="label">Stone Perimeter</span>
        <span class="value">${perimeter.toFixed(1)} mm</span>
        <div class="hint">Exact circumference / border</div>
      </div>
      <div class="jewelry-stat-card">
        <span class="label">Recommended Bezel Wire</span>
        <span class="value" style="font-size:13px">26 – 28 Gauge</span>
        <div class="hint">0.4 mm Fine Silver (999) dead-soft</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      💎 <strong>Setting Best Practice:</strong> Use Fine Silver (.999) rather than Sterling (.925) for bezel tape. Fine silver does not work-harden rapidly and pushes smoothly over cabochon edges without spring-back.<br>
      ⚠️ <strong>Fragile Stones:</strong> Opals (Mohs 5.5) and Turquoise (Mohs 5–6) are heat and shock sensitive. Never solder near set stones; burnish bezel gently with polished agate or brass pusher.
    </div>
  `;
}

function updateJewelryCasting() {
  const waxGrams = Math.max(0.01, parseFloat($("#jewelry-wax-weight")?.value) || 1.2);
  const alloyKey = $("#jewelry-cast-metal")?.value || "14k";
  const res = $("#jewelry-casting-result");
  if (!res) return;

  const alloyData = {
    "14k": { mult: 13.0, name: "14K Yellow Gold", density: "13.07 g/cm³", melt: "1550°F (843°C)", comp: "58.5% Au · 25% Ag · 16.5% Cu" },
    "18k": { mult: 15.5, name: "18K Yellow Gold", density: "15.58 g/cm³", melt: "1680°F (915°C)", comp: "75.0% Au · 15% Ag · 10% Cu" },
    "sterling": { mult: 10.4, name: "Sterling Silver 925", density: "10.36 g/cm³", melt: "1640°F (893°C)", comp: "92.5% Ag · 7.5% Cu" },
    "fine-silver": { mult: 10.5, name: "Fine Silver 999", density: "10.49 g/cm³", melt: "1763°F (961°C)", comp: "99.9% Pure Ag" },
    "platinum": { mult: 21.5, name: "Platinum 950", density: "21.45 g/cm³", melt: "3215°F (1768°C)", comp: "95% Pt · 5% Ru/Ir" },
    "bronze": { mult: 8.5, name: "Jeweler's Bronze / Brass", density: "8.50 g/cm³", melt: "1800°F (982°C)", comp: "90% Cu · 10% Zn" }
  };

  const item = alloyData[alloyKey] || alloyData["14k"];
  const castGrams = waxGrams * item.mult;
  const sprueGrams = castGrams * 0.25; // 25% button sprue reserve
  const totalMeltGrams = castGrams + sprueGrams;
  const totalOz = totalMeltGrams / 31.1035; // Troy ounces

  res.innerHTML = `
    <div class="jewelry-spec-grid">
      <div class="jewelry-stat-card">
        <span class="label">Cast Part Metal Weight</span>
        <span class="value" style="color:var(--primary)">${castGrams.toFixed(2)} g</span>
        <div class="hint">${item.mult}× wax multiplier</div>
      </div>
      <div class="jewelry-stat-card">
        <span class="label">Total Melt Charge (+Sprue)</span>
        <span class="value">${totalMeltGrams.toFixed(2)} g</span>
        <div class="hint">${totalOz.toFixed(2)} Troy Oz (incl. 25% button)</div>
      </div>
      <div class="jewelry-stat-card">
        <span class="label">Liquidus Melt Temp</span>
        <span class="value">${item.melt}</span>
        <div class="hint">Centrifugal / vacuum cast</div>
      </div>
      <div class="jewelry-stat-card">
        <span class="label">Alloy Purity</span>
        <span class="value" style="font-size:12px">${item.comp.split('·')[0]}</span>
        <div class="hint">${item.density}</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      ⚖️ <strong>Casting Rule:</strong> Always melt at least <strong>25% extra metal</strong> for the crucible button and sprue reservoir. The molten button supplies liquid metal to feed shrinking casting cavities during solidification.
    </div>
  `;
}

function updateJewelrySoldering() {
  const metal = $("#jewelry-solder-base")?.value || "silver";
  const stage = $("#jewelry-solder-stage")?.value || "hard";
  const res = $("#jewelry-soldering-result");
  if (!res) return;

  const solderData = {
    silver: {
      hard: { flowF: "1450°F (788°C)", meltF: "1365°F (740°C)", desc: "Stage 1: Primary structural join. Use for ring band butt seams, bezel joins, and master frames." },
      medium: { flowF: "1360°F (738°C)", meltF: "1275°F (691°C)", desc: "Stage 2: Secondary joins. Use for soldering bezel cup to baseplate or adding ring shanks." },
      easy: { flowF: "1325°F (718°C)", meltF: "1240°F (671°C)", desc: "Stage 3: Detail work. Use for earring posts, decorative granules, and bail loops." },
      "extra-easy": { flowF: "1205°F (651°C)", meltF: "1145°F (618°C)", desc: "Stage 4: Final repair and closing jump rings. Low heat avoids disturbing previous joints." }
    },
    "gold-14k": {
      hard: { flowF: "1530°F (832°C)", meltF: "1480°F (804°C)", desc: "Stage 1: Ring resizing and main head structural assemblies." },
      medium: { flowF: "1460°F (793°C)", meltF: "1410°F (766°C)", desc: "Stage 2: Setting mountings, shoulder accents, and gallery wire." },
      easy: { flowF: "1390°F (754°C)", meltF: "1340°F (727°C)", desc: "Stage 3: Post findings, safety chains, and final prong assembly." },
      "extra-easy": { flowF: "1310°F (710°C)", meltF: "1260°F (682°C)", desc: "Stage 4: Sizing rings with heat-sensitive diamonds or sapphires nearby." }
    },
    brass: {
      hard: { flowF: "1450°F (788°C)", meltF: "1365°F (740°C)", desc: "Silver hard solder provides high shear strength for brass/copper art metalwork." },
      medium: { flowF: "1360°F (738°C)", meltF: "1275°F (691°C)", desc: "Silver medium solder for secondary vessel or hollowware components." },
      easy: { flowF: "1325°F (718°C)", meltF: "1240°F (671°C)", desc: "Silver easy solder for hinges and surface appliqués." },
      "extra-easy": { flowF: "1205°F (651°C)", meltF: "1145°F (618°C)", desc: "Quick repair solder to prevent melting thin copper wire filigree." }
    }
  };

  const item = solderData[metal]?.[stage] || solderData.silver.hard;

  res.innerHTML = `
    <div class="jewelry-spec-grid">
      <div class="jewelry-stat-card">
        <span class="label">Solder Flow Temperature</span>
        <span class="value" style="color:var(--primary)">${item.flowF}</span>
        <div class="hint">Melts @ ${item.meltF}</div>
      </div>
      <div class="jewelry-stat-card">
        <span class="label">Soldering Stage</span>
        <span class="value" style="font-size:13px">${stage.toUpperCase()} SOLDER</span>
        <div class="hint">Step hierarchy protection</div>
      </div>
      <div class="jewelry-stat-card">
        <span class="label">Torch Flame Setting</span>
        <span class="value" style="font-size:13px">Soft Bushy Flame</span>
        <div class="hint">Heat entire piece; don't torch seam alone</div>
      </div>
      <div class="jewelry-stat-card">
        <span class="label">Flux Recommendation</span>
        <span class="value" style="font-size:13px">Battern's / Handy Paste</span>
        <div class="hint">Prevents oxide barrier on metal</div>
      </div>
    </div>

    <div class="jewelry-stage-step">
      <div class="jewelry-stage-num">✓</div>
      <div>
        <strong>Application Guide:</strong> ${item.desc}<br>
        🧪 <strong>Pickle Safety Rule:</strong> Use copper, brass, or wooden tongs ONLY in the pickle bath (Sparex or citric acid). Dipping steel or iron tweezers into the pickle causes an electrochemical reaction that flash-plates copper onto every piece of silver in the bath!
      </div>
    </div>
  `;
}

function renderJewelryView() {
  updateJewelryRing();
  updateJewelryBezel();
  updateJewelryCasting();
  updateJewelrySoldering();
  updateJewelryWireGauge();
  updateJewelryMohs();
  updateJewelryPolishing();
}

// ============================================================
// 📖 Bookbinding & Printmaking Studio Calculations
// ============================================================
function copyBookbindingSpecs() {
  const sigText = $("#book-signatures-result")?.innerText || "";
  const spineText = $("#book-spine-result")?.innerText || "";
  const stitchText = $("#book-stitching-result")?.innerText || "";
  const printText = $("#book-print-result")?.innerText || "";
  const text = `📖 BOOKBINDING & PRINTMAKING SPEC SHEET\n\n${sigText}\n\n${spineText}\n\n${stitchText}\n\n${printText}`;
  void navigator.clipboard.writeText(text).then(() => showToast("Copied Bookbinding Specs to clipboard!"));
}

async function addBookbindingSupplies() {
  await addMaterialToProjectShopping("Irish Waxed Linen Thread & Davey Board Pack", "1 set", 28.50, "Bookbinding, Paper & Inks");
}

function updateBookSignatures() {
  const totalPages = Math.max(8, parseInt($("#book-total-pages")?.value, 10) || 160);
  const format = $("#book-imposition-format")?.value || "octavo";
  const endpaper = $("#book-endpaper-style")?.value || "separate";
  const res = $("#book-signatures-result");
  if (!res) return;

  const formatData = {
    octavo: { ppPerSig: 16, leaves: 8, sheets: 4, name: "Octavo 8vo", folds: "3 right-angle folds" },
    quarto: { ppPerSig: 8, leaves: 4, sheets: 2, name: "Quarto 4to", folds: "2 folds" },
    folio: { ppPerSig: 4, leaves: 2, sheets: 1, name: "Folio", folds: "1 single center fold" },
    sexto: { ppPerSig: 32, leaves: 16, sheets: 8, name: "16mo", folds: "4 folds" }
  };

  const fmt = formatData[format] || formatData.octavo;
  const numSignatures = Math.ceil(totalPages / fmt.ppPerSig);
  const adjustedTotalPages = numSignatures * fmt.ppPerSig;
  const blankRemainderPages = adjustedTotalPages - totalPages;
  const totalLeaves = adjustedTotalPages / 2;
  const parentSheets = numSignatures * fmt.sheets;

  let endpaperNote = "Separate Folio: Cut 2 double-leaf folded folios (1 front + 1 back) out of heavy 120 gsm decorative or archival paper.";
  if (endpaper === "integral") {
    endpaperNote = "Integral Endpapers: Use first leaf of Sig 1 and last leaf of final Sig as paste-downs. (Saves 4 book pages).";
  } else if (endpaper === "tipped") {
    endpaperNote = "Tipped-on Endpaper: Glue a 1/8\" strip along the spine edge of the outer signatures.";
  }

  res.innerHTML = `
    <div class="book-spec-grid">
      <div class="book-stat-card">
        <span class="label">Number of Signatures</span>
        <span class="value" style="color:var(--primary)">${numSignatures} Signatures</span>
        <div class="hint">${fmt.ppPerSig} pages (${fmt.leaves} leaves) each</div>
      </div>
      <div class="book-stat-card">
        <span class="label">Total Text Block Sheets</span>
        <span class="value">${parentSheets} Sheets</span>
        <div class="hint">${fmt.sheets} folded sheets per signature</div>
      </div>
      <div class="book-stat-card">
        <span class="label">Imposition Math</span>
        <span class="value">${adjustedTotalPages} Pages</span>
        <div class="hint">${blankRemainderPages > 0 ? `${blankRemainderPages} blank end notes pages` : 'Zero remainder waste'}</div>
      </div>
      <div class="book-stat-card">
        <span class="label">Text Leaves / Folios</span>
        <span class="value">${totalLeaves} Leaves</span>
        <div class="hint">Total thickness base</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      📖 <strong>Endpaper Protocol:</strong> ${endpaperNote}<br>
      🌾 <strong>Paper Grain Direction:</strong> The paper grain of every sheet MUST run <strong>parallel to the spine</strong> (head-to-tail). Grain running across the spine creates wavy, buckling pages and stiff opening resistance!
    </div>
  `;
}

function updateBookSpine() {
  const totalPages = Math.max(8, parseInt($("#book-total-pages")?.value, 10) || 160);
  const caliperMm = parseFloat($("#book-paper-caliper")?.value) || 0.13;
  const boardMm = parseFloat($("#book-board-grade")?.value) || 2.1;
  const pageW = Math.max(2, parseFloat($("#book-page-w")?.value) || 5.5);
  const pageH = Math.max(3, parseFloat($("#book-page-h")?.value) || 8.5);
  const res = $("#book-spine-result");
  if (!res) return;

  const totalLeaves = totalPages / 2;
  const rawSpineMm = totalLeaves * caliperMm;
  const swellAllowanceMm = rawSpineMm * 0.18; // 18% sewing thread swell
  const totalSpineMm = rawSpineMm + swellAllowanceMm;
  const totalSpineIn = (totalSpineMm / 25.4).toFixed(3);

  // Board dimensions (in inches):
  // Board height: Page height + 2 * square margin (3.5 mm = 0.138 in)
  const squareMarginIn = 0.138;
  const boardHIn = (pageH + (2 * squareMarginIn)).toFixed(2);

  // Board width: Page width - joint gap (3.0 mm = 0.118 in) + square margin (0.138 in)
  const jointGapIn = 0.118;
  const boardWIn = (pageW - jointGapIn + squareMarginIn).toFixed(2);

  // Spine stiffener inlay strip:
  const spineInlayWIn = ((totalSpineMm + 1.0) / 25.4).toFixed(2);

  // Book cloth wrap cutting size (includes 3/4" = 0.75" turn-in margin on all 4 edges):
  const clothWIn = ((parseFloat(boardWIn) * 2) + parseFloat(spineInlayWIn) + (jointGapIn * 2) + (0.75 * 2)).toFixed(2);
  const clothHIn = (parseFloat(boardHIn) + (0.75 * 2)).toFixed(2);

  res.innerHTML = `
    <div class="book-spec-grid">
      <div class="book-stat-card">
        <span class="label">Total Spine Thickness</span>
        <span class="value" style="color:var(--primary)">${totalSpineMm.toFixed(1)} mm</span>
        <div class="hint">${totalSpineIn}" (incl. 18% sewing swell)</div>
      </div>
      <div class="book-stat-card">
        <span class="label">Davey Board Cut Size (2×)</span>
        <span class="value">${boardWIn}" × ${boardHIn}"</span>
        <div class="hint">Includes 1/8" (3.5 mm) squares</div>
      </div>
      <div class="book-stat-card">
        <span class="label">Spine Stiffener Inlay</span>
        <span class="value">${spineInlayWIn}" × ${boardHIn}"</span>
        <div class="hint">Spine width + 1 mm clearance</div>
      </div>
      <div class="book-stat-card">
        <span class="label">Book Cloth Cut Size</span>
        <span class="value">${clothWIn}" × ${clothHIn}"</span>
        <div class="hint">Includes 3/4" turn-in margins</div>
      </div>
    </div>

    <div class="book-cut-summary">
      📐 <strong>Case Construction Layout:</strong><br>
      • <strong>Hinge Joint Gap:</strong> Leave a <strong>${(jointGapIn * 25.4).toFixed(1)} mm (~1/8") gap</strong> between the spine inlay and the cover boards on each side. This allows the boards to swing open freely without binding against the spine.<br>
      • <strong>Corner Turn-in Trim:</strong> Cut book cloth corners at 45° leaving <strong>1.5× the board thickness (~3.0 mm)</strong> from the board corner to prevent exposed gray board tips when folded!
    </div>
  `;
}

function updateBookStitching() {
  const pageH = Math.max(3, parseFloat($("#book-page-h")?.value) || 8.5);
  const totalPages = Math.max(8, parseInt($("#book-total-pages")?.value, 10) || 160);
  const format = $("#book-imposition-format")?.value || "octavo";
  const style = $("#book-stitch-style")?.value || "french-link";
  const threadWeight = $("#book-thread-weight")?.value || "25/3";
  const res = $("#book-stitching-result");
  if (!res) return;

  const ppPerSig = format === "octavo" ? 16 : (format === "quarto" ? 8 : (format === "folio" ? 4 : 32));
  const numSignatures = Math.ceil(totalPages / ppPerSig);

  // Thread length formula: (height * signatures) + reserve
  const heightIn = pageH;
  let multiplier = 1.0;
  if (style === "french-link" || style === "coptic") multiplier = 1.35; // link loop consumes extra thread
  if (style === "long-stitch") multiplier = 1.6;

  const threadInches = (heightIn * numSignatures * multiplier) + (heightIn * 2);
  const threadFeet = (threadInches / 12).toFixed(1);
  const threadMeters = (parseFloat(threadFeet) * 0.3048).toFixed(1);

  // Number of sewing stations recommended for book height
  let stations = 4;
  if (heightIn >= 7 && heightIn < 10) stations = 5;
  if (heightIn >= 10) stations = 6;

  res.innerHTML = `
    <div class="book-spec-grid">
      <div class="book-stat-card">
        <span class="label">Linen Thread Length</span>
        <span class="value" style="color:var(--primary)">${threadFeet} ft</span>
        <div class="hint">${threadMeters} meters continuous uncut</div>
      </div>
      <div class="book-stat-card">
        <span class="label">Sewing Stations</span>
        <span class="value">${stations} Stations</span>
        <div class="hint">Incl. 2 kettle stitch stations</div>
      </div>
      <div class="book-stat-card">
        <span class="label">Linen Thread Weight</span>
        <span class="value">${threadWeight}</span>
        <div class="hint">Unbleached Irish bookbinding linen</div>
      </div>
      <div class="book-stat-card">
        <span class="label">Needle Size</span>
        <span class="value" style="font-size:13px">Size 18 / 20 Blunt</span>
        <div class="hint">John James tapestry needle</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      🕯️ <strong>Thread Waxing:</strong> Pull the linen thread twice through a block of natural beeswax, then draw it through your thumb and forefinger with an old cloth to press wax into the fibers. This prevents knotting, tangling, and slicing paper during tension pulls!
    </div>
  `;
}

function updateBookPrint() {
  const ink = $("#book-ink-type")?.value || "oil-safe";
  const paper = $("#book-print-paper")?.value || "kitakata";
  const medium = $("#book-block-medium")?.value || "battleship";
  const res = $("#book-print-result");
  if (!res) return;

  const inkData = {
    "oil-safe": { dryTime: "24 – 48 Hours", clean: "Warm water + dish soap (Zero mineral spirits)", body: "Dense luminous viscosity; professional artist grade" },
    "oil-traditional": { dryTime: "3 – 5 Days", clean: "Vegetable oil followed by odorless mineral spirits", body: "Slowest drying; maximum open working time for multi-color reduction prints" },
    "water-based": { dryTime: "20 – 40 Minutes", clean: "Cold tap water instantly", body: "Dries rapidly; prone to drying on brayer slab if not printed promptly" }
  }[ink];

  const paperData = {
    "kitakata": { gsm: "36 gsm", pressure: "Light to moderate hand baren pressure", note: "Long kozo fibers absorb oil evenly without fiber bleed" },
    "hosho": { gsm: "85 gsm", pressure: "Firm bamboo baren pressure", note: "Traditional Japanese woodblock paper; silky absorbent face" },
    "rives": { gsm: "280 gsm", pressure: "Heavy lever / cylinder etching press pressure", note: "100% cotton rag; dampening recommended before printing heavy solids" }
  }[paper];

  res.innerHTML = `
    <div class="book-spec-grid">
      <div class="book-stat-card">
        <span class="label">Estimated Ink Dry Time</span>
        <span class="value" style="color:var(--primary)">${inkData.dryTime}</span>
        <div class="hint">${ink.toUpperCase()} cure rate</div>
      </div>
      <div class="book-stat-card">
        <span class="label">Paper Weight &amp; Impression</span>
        <span class="value">${paperData.gsm}</span>
        <div class="hint">${paperData.pressure}</div>
      </div>
      <div class="book-stat-card">
        <span class="label">Cleanup Solvent</span>
        <span class="value" style="font-size:12px">${inkData.clean.split('(')[0]}</span>
        <div class="hint">Studio cleanup protocol</div>
      </div>
      <div class="book-stat-card">
        <span class="label">Audio Texture Cue</span>
        <span class="value" style="font-size:13px">"Sizzling Bacon"</span>
        <div class="hint">Optimal velvet orange peel on slab</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      🎨 <strong>The Golden Audio Cue:</strong> When rolling ink on the glass slab, listen for a soft, velvety hiss (often compared to gentle sizzling bacon). If the brayer sounds loud and suction-heavy, you have too much ink and will fill in fine linocut details. If silent, there is insufficient ink film for solid coverage!<br>
      📜 <strong>Paper Face:</strong> ${paperData.note}
    </div>
  `;
}

function renderBookbindingView() {
  updateBookSignatures();
  updateBookSpine();
  updateBookStitching();
  updateBookPrint();
}

// ============================================================
// 🧪 Resin 3D Printing (SLA / MSLA) Studio Calculations
// ============================================================
function copySlaSpecs() {
  const expText = $("#sla-exposure-result")?.innerText || "";
  const vatText = $("#sla-vat-result")?.innerText || "";
  const peelText = $("#sla-peel-result")?.innerText || "";
  const hollowText = $("#sla-hollow-result")?.innerText || "";
  const text = `🧪 SLA / MSLA RESIN 3D PRINTING SPEC SHEET\n\n${expText}\n\n${vatText}\n\n${peelText}\n\n${hollowText}`;
  void navigator.clipboard.writeText(text).then(() => showToast("Copied SLA Print Specs to clipboard!"));
}

async function addSlaSupplies() {
  const resin = $("#sla-resin-type option:checked")?.textContent.split("(")[0].trim() || "Standard Photopolymer";
  await addMaterialToProjectShopping(`${resin} 405nm Resin (1000g Bottle)`, "1 bottle", 28.00, "SLA Photopolymer Resin & Films");
}

function updateSlaExposure() {
  const lcd = $("#sla-lcd-type")?.value || "mono";
  const resin = $("#sla-resin-type")?.value || "standard";
  const layerMicrons = parseInt($("#sla-layer-height")?.value, 10) || 50;
  const powerPct = parseInt($("#sla-light-intensity")?.value, 10) || 100;
  const res = $("#sla-exposure-result");
  if (!res) return;

  // Base 50µm normal layer exposure (seconds)
  const baseExposureMap = {
    standard: { mono: 2.5, color: 8.0, bottomMono: 30, bottomColor: 65 },
    "abs-like": { mono: 2.8, color: 8.5, bottomMono: 35, bottomColor: 70 },
    "water-wash": { mono: 2.2, color: 7.5, bottomMono: 28, bottomColor: 60 },
    clear: { mono: 3.2, color: 9.0, bottomMono: 40, bottomColor: 75 },
    castable: { mono: 4.0, color: 11.0, bottomMono: 45, bottomColor: 85 },
    "high-temp": { mono: 3.5, color: 10.0, bottomMono: 45, bottomColor: 80 }
  };

  const item = baseExposureMap[resin] || baseExposureMap.standard;
  let baseNormal = lcd === "mono" ? item.mono : item.color;
  let baseBottom = lcd === "mono" ? item.bottomMono : item.bottomColor;

  // Layer thickness scaling factor
  const layerScale = layerMicrons === 25 ? 0.75 : (layerMicrons === 35 ? 0.88 : (layerMicrons === 50 ? 1.0 : 1.55));

  // Light power scaling factor (100% = 1.0, 90% = 1.11, 80% = 1.25)
  const powerScale = 100 / powerPct;

  const normalExposure = (baseNormal * layerScale * powerScale).toFixed(1);
  const bottomExposure = Math.round(baseBottom * powerScale);
  const bottomLayers = layerMicrons <= 35 ? 6 : (layerMicrons === 50 ? 5 : 4);
  const transitionLayers = 4;

  res.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px">
      <span class="sla-badge">⚡ Normal Exposure: ${normalExposure}s per layer</span>
      <span style="font-size:11px;color:var(--muted)">Bottom Burn-In: <strong>${bottomExposure}s (${bottomLayers} layers)</strong></span>
    </div>

    <div class="sla-spec-grid">
      <div class="sla-stat-card">
        <span class="label">Normal Layer Dwell</span>
        <span class="value" style="color:var(--primary)">${normalExposure}s</span>
        <div class="hint">At ${layerMicrons} µm layer depth</div>
      </div>
      <div class="sla-stat-card">
        <span class="label">Bottom / Base Exposure</span>
        <span class="value">${bottomExposure}s</span>
        <div class="hint">${bottomLayers} foundation burn layers</div>
      </div>
      <div class="sla-stat-card">
        <span class="label">Transition Layers</span>
        <span class="value">${transitionLayers} Layers</span>
        <div class="hint">Prevents delamination step</div>
      </div>
      <div class="sla-stat-card">
        <span class="label">LCD Technology</span>
        <span class="value" style="font-size:13px">${lcd === 'mono' ? 'Monochrome' : 'Color RGB'}</span>
        <div class="hint">${powerPct}% UV light power</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      🧪 <strong>Calibration Note:</strong> Before printing large multi-hour plates, print a <strong>Cones of Calibration</strong> or XP2 Validation Matrix test card. If cones fail to bridge on the success side, add +0.2s; if failure side cones bridge, reduce exposure by -0.2s!
    </div>
  `;
}

function updateSlaVat() {
  const vatW = Math.max(20, parseFloat($("#sla-vat-w")?.value) || 145);
  const vatL = Math.max(20, parseFloat($("#sla-vat-l")?.value) || 225);
  const vatDepth = Math.max(5, parseFloat($("#sla-vat-depth")?.value) || 12);
  const jobMl = Math.max(1, parseFloat($("#sla-job-ml")?.value) || 65);
  const res = $("#sla-vat-result");
  if (!res) return;

  const resinDensity = 1.12; // average g/ml
  const vatAreaMm2 = vatW * vatL;
  const vatVolumeMl = (vatAreaMm2 * vatDepth) / 1000;
  const vatGrams = Math.round(vatVolumeMl * resinDensity);

  const jobGrams = Math.round(jobMl * resinDensity);
  const bottleCostKg = 28.00; // $28 / 1000g standard resin
  const jobCost = ((jobGrams / 1000) * bottleCostKg).toFixed(2);
  const printsPerBottle = Math.floor(1000 / jobGrams);

  // Minimum safe vat head level (3 mm above FEP)
  const minSafeHeadMl = Math.round((vatAreaMm2 * 3) / 1000);

  res.innerHTML = `
    <div class="sla-spec-grid">
      <div class="sla-stat-card">
        <span class="label">Vat Fill Capacity</span>
        <span class="value" style="color:var(--primary)">${Math.round(vatVolumeMl)} ml</span>
        <div class="hint">${vatGrams}g at ${vatDepth}mm depth</div>
      </div>
      <div class="sla-stat-card">
        <span class="label">Print Job Weight</span>
        <span class="value">${jobGrams} g</span>
        <div class="hint">${jobMl} ml sliced liquid volume</div>
      </div>
      <div class="sla-stat-card">
        <span class="label">Est. Resin Cost</span>
        <span class="value">$${jobCost}</span>
        <div class="hint">Based on $28/kg bottle</div>
      </div>
      <div class="sla-stat-card">
        <span class="label">1kg Bottle Yield</span>
        <span class="value">~${printsPerBottle} Prints</span>
        <div class="hint">Safe head reserve: ${minSafeHeadMl} ml</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      🛢️ <strong>Resin Level Warning:</strong> Never let the vat liquid drop below <strong>${minSafeHeadMl} ml (3mm)</strong> during a print job. When the build plate retracts, shallow resin creates cavitation bubbles that produce hollow voids and support failures!
    </div>
  `;
}

function updateSlaPeel() {
  const film = $("#sla-film-type")?.value || "fep";
  const area = $("#sla-model-area")?.value || "small";
  const res = $("#sla-peel-result");
  if (!res) return;

  const motionData = {
    fep: {
      small: { lift1Speed: "60 mm/min", lift1Dist: "3.0 mm", lift2Speed: "180 mm/min", lift2Dist: "4.0 mm", retractSpeed: "180 mm/min", delay: "0.5s" },
      medium: { lift1Speed: "50 mm/min", lift1Dist: "4.0 mm", lift2Speed: "160 mm/min", lift2Dist: "4.0 mm", retractSpeed: "160 mm/min", delay: "1.0s" },
      large: { lift1Speed: "40 mm/min", lift1Dist: "5.0 mm", lift2Speed: "140 mm/min", lift2Dist: "4.0 mm", retractSpeed: "140 mm/min", delay: "1.5s" }
    },
    nfep: {
      small: { lift1Speed: "80 mm/min", lift1Dist: "2.5 mm", lift2Speed: "220 mm/min", lift2Dist: "3.5 mm", retractSpeed: "220 mm/min", delay: "0.5s" },
      medium: { lift1Speed: "65 mm/min", lift1Dist: "3.5 mm", lift2Speed: "180 mm/min", lift2Dist: "3.5 mm", retractSpeed: "180 mm/min", delay: "0.8s" },
      large: { lift1Speed: "55 mm/min", lift1Dist: "4.5 mm", lift2Speed: "160 mm/min", lift2Dist: "4.0 mm", retractSpeed: "160 mm/min", delay: "1.2s" }
    },
    acf: {
      small: { lift1Speed: "120 mm/min", lift1Dist: "2.0 mm", lift2Speed: "300 mm/min", lift2Dist: "3.0 mm", retractSpeed: "300 mm/min", delay: "0.2s" },
      medium: { lift1Speed: "100 mm/min", lift1Dist: "2.5 mm", lift2Speed: "260 mm/min", lift2Dist: "3.5 mm", retractSpeed: "260 mm/min", delay: "0.5s" },
      large: { lift1Speed: "80 mm/min", lift1Dist: "3.5 mm", lift2Speed: "220 mm/min", lift2Dist: "3.5 mm", retractSpeed: "220 mm/min", delay: "0.8s" }
    }
  };

  const m = motionData[film]?.[area] || motionData.fep.small;

  res.innerHTML = `
    <div class="sla-spec-grid">
      <div class="sla-stat-card">
        <span class="label">Stage 1 Slow Peel Lift</span>
        <span class="value" style="color:var(--primary)">${m.lift1Speed}</span>
        <div class="hint">For first ${m.lift1Dist} peel distance</div>
      </div>
      <div class="sla-stat-card">
        <span class="label">Stage 2 Travel Lift</span>
        <span class="value">${m.lift2Speed}</span>
        <div class="hint">Remaining ${m.lift2Dist} height</div>
      </div>
      <div class="sla-stat-card">
        <span class="label">Retract Approach Speed</span>
        <span class="value">${m.retractSpeed}</span>
        <div class="hint">Controlled plunge back to vat</div>
      </div>
      <div class="sla-stat-card">
        <span class="label">Rest / Light-Off Delay</span>
        <span class="value">${m.delay}</span>
        <div class="hint">Allows resin film to settle</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      ⚡ <strong>TSMC Advantage:</strong> Slowing the first 3 mm peel prevents micro-tearing on fine contact tips. Once the vacuum snaps free from the FEP film, accelerating to Stage 2 cuts print time by up to 35%!
    </div>
  `;
}

function updateSlaHollow() {
  const height = Math.max(10, parseFloat($("#sla-hollow-height")?.value) || 120);
  const wallThick = parseFloat($("#sla-wall-thick")?.value) || 2.0;
  const temp = $("#sla-ambient-temp")?.value || "warm";
  const res = $("#sla-hollow-result");
  if (!res) return;

  const minHoleDia = (wallThick * 1.8).toFixed(1);
  const minHoles = height > 150 ? 3 : 2;
  const resinSavingsPct = Math.min(80, Math.round(55 + (height / 8)));

  let washGuide = "Submerge in 99% IPA wash bath for 4 minutes with magnetic stirrer agitation. Use plastic syringe to flush clean IPA into bottom drain hole until it runs crystal clear.";
  if (temp === "cold") {
    washGuide = "Cold resin is thick and clings inside shells. Pre-warm print in warm water bath (35°C) before IPA rinse to thin internal resin residue!";
  }

  res.innerHTML = `
    <div class="sla-spec-grid">
      <div class="sla-stat-card">
        <span class="label">Min Drain Hole Diameter</span>
        <span class="value" style="color:var(--primary)">Ø ${minHoleDia} mm</span>
        <div class="hint">Minimum 2 holes required</div>
      </div>
      <div class="sla-stat-card">
        <span class="label">Recommended Wall Shell</span>
        <span class="value">${wallThick.toFixed(1)} mm</span>
        <div class="hint">Resist hydrostatic suction pull</div>
      </div>
      <div class="sla-stat-card">
        <span class="label">Est. Resin Savings</span>
        <span class="value">~${resinSavingsPct}%</span>
        <div class="hint">Vs printing completely solid</div>
      </div>
      <div class="sla-stat-card">
        <span class="label">Post-Cure Soak Time</span>
        <span class="value">3 – 5 Mins</span>
        <div class="hint">405nm UV turntable cure</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      🕳️ <strong>The 2-Hole Rule:</strong> Never place just ONE drain hole. You need <strong>1 hole at the base</strong> (closest to the build plate to drain resin during peeling) and <strong>1 hole near the top</strong> (to allow air inside and break the vacuum). A single hole acts like a straw with your finger on the end, creating immense suction force that tears prints off supports!<br>
      🧼 <strong>Internal Washing:</strong> ${washGuide}
    </div>
  `;
}

function renderSlaView() {
  updateSlaExposure();
  updateSlaVat();
  updateSlaPeel();
  updateSlaHollow();
}

// ============================================================
// 🎸 Luthier & Stringed Instrument Building Calculations
// ============================================================
function copyLuthierSpecs() {
  const fretText = $("#luthier-fret-result")?.innerText || "";
  const radText = $("#luthier-radius-result")?.innerText || "";
  const tenText = $("#luthier-tension-result")?.innerText || "";
  const actText = $("#luthier-action-result")?.innerText || "";
  const text = `🎸 LUTHIER & STRINGED INSTRUMENT BUILDING SPEC SHEET\n\n${fretText}\n\n${radText}\n\n${tenText}\n\n${actText}`;
  void navigator.clipboard.writeText(text).then(() => showToast("Copied Luthier Specs to clipboard!"));
}

async function addLuthierSupplies() {
  await addMaterialToProjectShopping("18% Nickel-Silver Fretwire & Bone Nut Blanks Pack", "1 pack", 24.50, "Luthier Tonewoods, Frets & Parts");
}

function updateLuthierFret() {
  const scaleIn = parseFloat($("#luthier-scale-select")?.value) || 25.5;
  const numFrets = parseInt($("#luthier-fret-count")?.value, 10) || 22;
  const unit = $("#luthier-unit-display")?.value || "mm";
  const res = $("#luthier-fret-result");
  if (!res) return;

  const scaleMm = scaleIn * 25.4;
  const scaleLen = unit === "mm" ? scaleMm : scaleIn;

  // Rule of 17.817 / 12th root of 2 calculation
  const twelfthRoot2 = Math.pow(2, 1 / 12); // ~1.059463094
  let rows = [];
  let prevDist = 0;

  for (let n = 1; n <= numFrets; n++) {
    // Formula: dn = Scale * (1 - (1 / (twelfthRoot2 ^ n)))
    const distFromNut = scaleLen * (1 - (1 / Math.pow(twelfthRoot2, n)));
    const fretToFret = distFromNut - prevDist;
    const remaining = scaleLen - distFromNut;
    prevDist = distFromNut;

    const isOctave = n === 12;
    const unitSymbol = unit === "mm" ? "mm" : '"';
    const dec = unit === "mm" ? 2 : 3;

    rows.push(`
      <tr class="${isOctave ? 'octave-fret' : ''}">
        <td><strong>Fret ${n}</strong> ${isOctave ? '★ Octave' : ''}</td>
        <td><strong>${distFromNut.toFixed(dec)} ${unitSymbol}</strong></td>
        <td>${fretToFret.toFixed(dec)} ${unitSymbol}</td>
        <td>${remaining.toFixed(dec)} ${unitSymbol}</td>
      </tr>
    `);
  }

  const octaveNutDist = (scaleLen * 0.5).toFixed(unit === 'mm' ? 2 : 3);
  const unitText = unit === "mm" ? "mm" : "inches";

  res.innerHTML = `
    <div class="luthier-spec-grid">
      <div class="luthier-stat-card">
        <span class="label">Scale Length</span>
        <span class="value" style="color:var(--primary)">${scaleIn.toFixed(3)}"</span>
        <div class="hint">${scaleMm.toFixed(2)} mm nominal scale</div>
      </div>
      <div class="luthier-stat-card">
        <span class="label">12th Fret Octave Point</span>
        <span class="value">${octaveNutDist} ${unit === 'mm' ? 'mm' : '"'}</span>
        <div class="hint">Exact 1:2 string midpoint</div>
      </div>
      <div class="luthier-stat-card">
        <span class="label">Fret Slot Saw Kerf</span>
        <span class="value" style="font-size:13px">0.023" (0.58 mm)</span>
        <div class="hint">Standard fret tang width</div>
      </div>
      <div class="luthier-stat-card">
        <span class="label">Slot Cut Depth</span>
        <span class="value" style="font-size:13px">2.5 – 2.8 mm</span>
        <div class="hint">Clears fret tang + bead glue</div>
      </div>
    </div>

    <div class="luthier-fret-scroll">
      <table class="luthier-fret-table">
        <thead>
          <tr>
            <th>Fret #</th>
            <th>Distance from Nut</th>
            <th>Fret-to-Fret Step</th>
            <th>Remaining to Bridge</th>
          </tr>
        </thead>
        <tbody>
          ${rows.join("")}
        </tbody>
      </table>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      📐 <strong>Lutherie Rule:</strong> Always measure fret slot cuts from the <strong>Nut face zero-line</strong>, never from fret-to-fret. Measuring fret-to-fret accumulates saw indexing errors across 22 frets, causing severe intonation drift!
    </div>
  `;
}

function updateLuthierRadius() {
  const radNutIn = parseFloat($("#luthier-rad-nut")?.value) || 9.5;
  const radHeelIn = parseFloat($("#luthier-rad-heel")?.value) || 14.0;
  const nutW = parseFloat($("#luthier-nut-w")?.value) || 42.8;
  const heelW = parseFloat($("#luthier-heel-w")?.value) || 55.6;
  const res = $("#luthier-radius-result");
  if (!res) return;

  const radNutMm = radNutIn * 25.4;
  const radHeelMm = radHeelIn * 25.4;

  // Crown camber height drop: h = R - sqrt(R^2 - (W/2)^2)
  const camberNutMm = radNutMm - Math.sqrt(Math.pow(radNutMm, 2) - Math.pow(nutW / 2, 2));
  const camberHeelMm = radHeelMm - Math.sqrt(Math.pow(radHeelMm, 2) - Math.pow(heelW / 2, 2));

  const isCompound = Math.abs(radNutIn - radHeelIn) > 0.1;
  const compoundDesc = isCompound
    ? `Conical compound radius transitioning from ${radNutIn}" at nut (ergonomic chord grip) to ${radHeelIn}" at heel (prevents string choke out during high register bends).`
    : `Straight cylindrical radius of ${radNutIn}" throughout the entire fretboard.`;

  res.innerHTML = `
    <div class="luthier-spec-grid">
      <div class="luthier-stat-card">
        <span class="label">Nut Center Crown Camber</span>
        <span class="value" style="color:var(--primary)">${camberNutMm.toFixed(2)} mm</span>
        <div class="hint">Radius: ${radNutIn}" on ${nutW}mm width</div>
      </div>
      <div class="luthier-stat-card">
        <span class="label">Heel Center Crown Camber</span>
        <span class="value">${camberHeelMm.toFixed(2)} mm</span>
        <div class="hint">Radius: ${radHeelIn}" on ${heelW}mm width</div>
      </div>
      <div class="luthier-stat-card">
        <span class="label">Fretboard Taper</span>
        <span class="value">${(heelW - nutW).toFixed(1)} mm</span>
        <div class="hint">${nutW}mm nut to ${heelW}mm heel</div>
      </div>
      <div class="luthier-stat-card">
        <span class="label">Edge Thickness Delta</span>
        <span class="value">${Math.abs(camberHeelMm - camberNutMm).toFixed(2)} mm</span>
        <div class="hint">Edge wood depth compensation</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      🎸 <strong>Camber Profile:</strong> ${compoundDesc}<br>
      🪵 <strong>Sanding Technique:</strong> When using wooden radius sanding blocks on compound boards, stroke along string lines rather than parallel to the center seam to preserve the true conical conic section!
    </div>
  `;
}

function updateLuthierTension() {
  const tuning = $("#luthier-tension-tuning")?.value || "standard";
  const gaugeSet = $("#luthier-tension-gauge")?.value || "10-46";
  const res = $("#luthier-tension-result");
  if (!res) return;

  const scaleIn = parseFloat($("#luthier-scale-select")?.value) || 25.5;

  // Approximate string tensions (lbs) for 25.5" scale in standard EADGBE
  const tensionSets = {
    "9-42": { strings: [13.1, 11.0, 14.7, 15.8, 15.8, 14.8], total: 85.2 },
    "10-46": { strings: [16.2, 15.4, 16.6, 18.4, 19.5, 17.5], total: 103.6 },
    "11-49": { strings: [19.6, 17.8, 18.6, 21.3, 21.6, 19.7], total: 118.6 },
    "12-54": { strings: [23.3, 23.3, 22.8, 28.1, 26.2, 24.3], total: 148.0 }
  };

  const item = tensionSets[gaugeSet] || tensionSets["10-46"];

  // Scale multiplier factor: Tension is proportional to scale^2
  const scaleFactor = Math.pow(scaleIn / 25.5, 2);

  // Tuning adjustment: Half-step down drops tension ~12%, D standard ~23%
  let tuningFactor = 1.0;
  if (tuning === "drop-d") tuningFactor = 0.96;
  if (tuning === "eb") tuningFactor = 0.89;
  if (tuning === "d-std") tuningFactor = 0.79;

  const adjTotalLbs = (item.total * scaleFactor * tuningFactor).toFixed(1);
  const adjTotalKg = (parseFloat(adjTotalLbs) * 0.453592).toFixed(1);

  res.innerHTML = `
    <div class="luthier-spec-grid">
      <div class="luthier-stat-card">
        <span class="label">Total Neck Tension</span>
        <span class="value" style="color:var(--primary)">${adjTotalLbs} lbs</span>
        <div class="hint">${adjTotalKg} kg combined pull force</div>
      </div>
      <div class="luthier-stat-card">
        <span class="label">Scale Length Ref</span>
        <span class="value">${scaleIn}"</span>
        <div class="hint">${(scaleFactor * 100).toFixed(0)}% tension scale factor</div>
      </div>
      <div class="luthier-stat-card">
        <span class="label">Gauge Profile</span>
        <span class="value" style="font-size:13px">${gaugeSet}</span>
        <div class="hint">Nickel-plated steel roundwound</div>
      </div>
      <div class="luthier-stat-card">
        <span class="label">Truss Rod Counter-Load</span>
        <span class="value" style="font-size:13px">Dual-Action</span>
        <div class="hint">Counteracts ${adjTotalLbs} lbs forward pull</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      🎼 <strong>Tension Physics:</strong> Switching from 9-42 to 10-46 adds <strong>~18.4 lbs (~8.3 kg)</strong> of forward pull load onto the neck shaft. Tighten the truss rod clockwise 1/8 to 1/4 turn to prevent excess up-bow!
    </div>
  `;
}

function updateLuthierAction() {
  const type = $("#luthier-setup-type")?.value || "electric";
  const style = $("#luthier-setup-style")?.value || "medium";
  const res = $("#luthier-action-result");
  if (!res) return;

  const setupData = {
    electric: {
      low: { relief: '0.008" (0.20 mm)', actTreble: '3/64" (1.2 mm)', actBass: '4/64" (1.6 mm)', nutTreble: '0.010" (0.25 mm)', nutBass: '0.018" (0.45 mm)' },
      medium: { relief: '0.010" (0.25 mm)', actTreble: '4/64" (1.6 mm)', actBass: '5/64" (2.0 mm)', nutTreble: '0.012" (0.30 mm)', nutBass: '0.020" (0.50 mm)' },
      high: { relief: '0.012" (0.30 mm)', actTreble: '5/64" (2.0 mm)', actBass: '6/64" (2.4 mm)', nutTreble: '0.014" (0.35 mm)', nutBass: '0.022" (0.55 mm)' }
    },
    acoustic: {
      low: { relief: '0.008" (0.20 mm)', actTreble: '4/64" (1.6 mm)', actBass: '5/64" (2.0 mm)', nutTreble: '0.012" (0.30 mm)', nutBass: '0.020" (0.50 mm)' },
      medium: { relief: '0.010" (0.25 mm)', actTreble: '5/64" (2.0 mm)', actBass: '6/64" (2.4 mm)', nutTreble: '0.014" (0.35 mm)', nutBass: '0.022" (0.55 mm)' },
      high: { relief: '0.012" (0.30 mm)', actTreble: '6/64" (2.4 mm)', actBass: '7/64" (2.8 mm)', nutTreble: '0.016" (0.40 mm)', nutBass: '0.024" (0.60 mm)' }
    },
    classical: {
      low: { relief: '0.006" (0.15 mm)', actTreble: '6/64" (2.4 mm)', actBass: '7/64" (2.8 mm)', nutTreble: '0.018" (0.45 mm)', nutBass: '0.024" (0.60 mm)' },
      medium: { relief: '0.008" (0.20 mm)', actTreble: '7/64" (2.8 mm)', actBass: '8/64" (3.2 mm)', nutTreble: '0.020" (0.50 mm)', nutBass: '0.026" (0.65 mm)' },
      high: { relief: '0.010" (0.25 mm)', actTreble: '8/64" (3.2 mm)', actBass: '9/64" (3.6 mm)', nutTreble: '0.022" (0.55 mm)', nutBass: '0.028" (0.70 mm)' }
    },
    bass: {
      low: { relief: '0.012" (0.30 mm)', actTreble: '5/64" (2.0 mm)', actBass: '6/64" (2.4 mm)', nutTreble: '0.020" (0.50 mm)', nutBass: '0.024" (0.60 mm)' },
      medium: { relief: '0.014" (0.35 mm)', actTreble: '6/64" (2.4 mm)', actBass: '7/64" (2.8 mm)', nutTreble: '0.022" (0.55 mm)', nutBass: '0.026" (0.65 mm)' },
      high: { relief: '0.016" (0.40 mm)', actTreble: '7/64" (2.8 mm)', actBass: '8/64" (3.2 mm)', nutTreble: '0.024" (0.60 mm)', nutBass: '0.028" (0.70 mm)' }
    }
  };

  const item = setupData[type]?.[style] || setupData.electric.medium;

  res.innerHTML = `
    <div class="luthier-spec-grid">
      <div class="luthier-stat-card">
        <span class="label">12th Fret Action (Treble)</span>
        <span class="value" style="color:var(--primary)">${item.actTreble}</span>
        <div class="hint">High E string clearance</div>
      </div>
      <div class="luthier-stat-card">
        <span class="label">12th Fret Action (Bass)</span>
        <span class="value">${item.actBass}</span>
        <div class="hint">Low E string clearance</div>
      </div>
      <div class="luthier-stat-card">
        <span class="label">Neck Relief (7th/8th Fret)</span>
        <span class="value">${item.relief}</span>
        <div class="hint">Capo on 1st fret, hold last fret</div>
      </div>
      <div class="luthier-stat-card">
        <span class="label">Nut Slot 1st Fret Gap</span>
        <span class="value" style="font-size:12px">${item.nutTreble} / ${item.nutBass}</span>
        <div class="hint">Feeler gauge clearance</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      🎸 <strong>Saddle Intonation Compensation:</strong> When strings are fretted down to the fretwire, they stretch slightly sharp. To compensate, slant the bridge saddle back: <strong>+1.5 mm back on the high E string</strong>, and <strong>+3.0 mm to +3.5 mm back on the low E string</strong>!
    </div>
  `;
}

function renderLuthierView() {
  updateLuthierFret();
  updateLuthierRadius();
  updateLuthierTension();
  updateLuthierAction();
}

// ============================================================
// 🌀 Composites & Carbon Fiber Fabrication Calculations
// ============================================================
function copyCompositesSpecs() {
  const resinText = $("#comp-resin-result")?.innerText || "";
  const stackText = $("#comp-stack-result")?.innerText || "";
  const vacText = $("#comp-vacuum-result")?.innerText || "";
  const cureText = $("#comp-cure-result")?.innerText || "";
  const text = `🌀 COMPOSITES & CARBON FIBER FABRICATION SPEC SHEET\n\n${resinText}\n\n${stackText}\n\n${vacText}\n\n${cureText}`;
  void navigator.clipboard.writeText(text).then(() => showToast("Copied Composites Specs to clipboard!"));
}

async function addCompositesSupplies() {
  const fabric = $("#comp-fabric-type option:checked")?.textContent.split("(")[0].trim() || "3K 200 gsm Carbon Fiber";
  await addMaterialToProjectShopping(`${fabric} (1m x 1m roll)`, "1 sq.m", 36.00, "Composites, Carbon Fiber & Resins");
}

function updateCompositesResin() {
  const fabric = $("#comp-fabric-type")?.value || "carbon-3k";
  const process = $("#comp-process-type")?.value || "infusion";
  const area = Math.max(0.01, parseFloat($("#comp-part-area")?.value) || 0.50);
  const plies = Math.max(1, parseInt($("#comp-ply-count")?.value, 10) || 4);
  const mixRatioStr = $("#comp-mix-ratio")?.value || "100:30";
  const wasteFactor = parseFloat($("#comp-waste-factor")?.value) || 1.15;
  const res = $("#comp-resin-result");
  if (!res) return;

  const fabricData = {
    "carbon-3k": { gsm: 200, density: 1.78, name: "3K 2x2 Twill Carbon" },
    "carbon-6k": { gsm: 300, density: 1.78, name: "6K Plain Weave Carbon" },
    "carbon-biax": { gsm: 400, density: 1.78, name: "12K Biaxial Carbon" },
    "fiberglass-twill": { gsm: 200, density: 2.54, name: "E-Glass Fiberglass" },
    "fiberglass-csm": { gsm: 450, density: 2.54, name: "Chopped Strand Mat" },
    "aramid-kevlar": { gsm: 170, density: 1.44, name: "Kevlar 49 Aramid" }
  };

  const processData = {
    "wet-layup": { targetVf: 40, resinToFiberWt: 1.15, label: "Wet Hand Layup" },
    "vac-bagging": { targetVf: 52, resinToFiberWt: 0.75, label: "Vacuum Bagged" },
    infusion: { targetVf: 60, resinToFiberWt: 0.55, label: "VARTM Resin Infusion" },
    prepreg: { targetVf: 66, resinToFiberWt: 0.45, label: "Prepreg / Autoclave" }
  };

  const f = fabricData[fabric] || fabricData["carbon-3k"];
  const p = processData[process] || processData.infusion;

  // Total fabric weight in part (grams)
  const totalFabricGrams = area * plies * f.gsm;

  // Net resin inside part (grams)
  const partResinGrams = totalFabricGrams * p.resinToFiberWt;

  // Total mixed resin batch accounting for waste (catch pot, lines, mixing cup)
  const batchResinGrams = Math.round(partResinGrams * wasteFactor);

  // Stoichiometry Part A / Part B
  const [partAParts, partBParts] = mixRatioStr.split(":").map(Number);
  const totalParts = partAParts + partBParts;
  const hardenerGrams = Math.round(batchResinGrams * (partBParts / totalParts));
  const baseResinGrams = batchResinGrams - hardenerGrams;

  // Finished cured part mass (grams)
  const curedPartMassGrams = Math.round(totalFabricGrams + partResinGrams);

  // Cured laminate thickness (mm): t = (gsm * plies) / (density * Vf * 10000)
  const curedThickMm = (f.gsm * plies) / (f.density * (p.targetVf / 100) * 10000);

  res.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px">
      <span class="comp-badge">🧪 Resin Batch to Mix: ${batchResinGrams}g Total</span>
      <span style="font-size:11px;color:var(--muted)">Target Fiber Volume: <strong>${p.targetVf}% Vf</strong> (${p.label})</span>
    </div>

    <div class="comp-spec-grid">
      <div class="comp-stat-card">
        <span class="label">Epoxy Resin (Part A)</span>
        <span class="value" style="color:var(--primary)">${baseResinGrams} g</span>
        <div class="hint">${partAParts} parts by weight</div>
      </div>
      <div class="comp-stat-card">
        <span class="label">Hardener (Part B)</span>
        <span class="value">${hardenerGrams} g</span>
        <div class="hint">${partBParts} parts by weight (${mixRatioStr})</div>
      </div>
      <div class="comp-stat-card">
        <span class="label">Total Dry Fabric</span>
        <span class="value">${Math.round(totalFabricGrams)} g</span>
        <div class="hint">${plies} plies · ${f.gsm} gsm (${area} m²)</div>
      </div>
      <div class="comp-stat-card">
        <span class="label">Finished Part Weight</span>
        <span class="value">${curedPartMassGrams} g</span>
        <div class="hint">Cured thickness: ~${curedThickMm.toFixed(2)} mm</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      ⚖️ <strong>Stoichiometry Rule:</strong> Always weigh epoxy on a digital scale to <strong>&plusmn;1 gram</strong> accuracy. Unlike polyester resin where MEKP catalyst percentage alters cure speed, epoxy hardener undergoes a strict 1:1 molecular crosslinking reaction. Adding extra hardener leaves uncured gooey amine blush and permanently weakens the composite!
    </div>
  `;
}

function updateCompositesStack() {
  const schedule = $("#comp-stack-schedule")?.value || "quasi-8";
  const core = $("#comp-core-material")?.value || "solid";
  const res = $("#comp-stack-result");
  if (!res) return;

  const stackData = {
    "quasi-8": {
      name: "Quasi-Isotropic [0 / +45 / -45 / 90]s",
      plies: 8,
      symmetry: "Symmetric & Balanced (Bij = 0)",
      description: "Equal in-plane tensile and flexural modulus in all directions. Cures 100% flat with zero thermal contraction warping.",
      isotropy: "Quasi-Isotropic (Ex ≈ Ey)"
    },
    "quasi-6": {
      name: "Quasi-Isotropic [0 / +60 / -60]s",
      plies: 6,
      symmetry: "Balanced Symmetrical",
      description: "Hexagonal orientation yielding isotropic planar stiffness with 25% fewer plies than 8-ply schedules.",
      isotropy: "Quasi-Isotropic (Ex ≈ Ey)"
    },
    crossply: {
      name: "Bidirectional Cross-Ply [0 / 90]s",
      plies: 4,
      symmetry: "Orthotropic Symmetrical",
      description: "High 0° and 90° axial rigidity for flat structural panels, but reduced shear resistance under 45° torsional load.",
      isotropy: "Orthotropic (Ex = Ey, low Gxy)"
    },
    unidirectional: {
      name: "Unidirectional [0] Longitudinal",
      plies: 4,
      symmetry: "Highly Anisotropic",
      description: "Concentrates 95% of tensile strength strictly along the longitudinal axis. Ideal for spars, wing beams, and drive shafts.",
      isotropy: "Anisotropic (Ex >> Ey)"
    }
  };

  const coreData = {
    solid: { name: "Solid Monolithic", thickMm: 0, weightGsm: 0, stiffnessFactor: 1.0, shearStr: "N/A" },
    "divinycell-3": { name: "3mm Divinycell H60 Foam", thickMm: 3.0, weightGsm: 180, stiffnessFactor: 7.2, shearStr: "0.76 MPa" },
    "divinycell-5": { name: "5mm Divinycell H80 Foam", thickMm: 5.0, weightGsm: 400, stiffnessFactor: 22.5, shearStr: "1.15 MPa" },
    "nomex-6": { name: "6mm Nomex Aramid Honeycomb", thickMm: 6.0, weightGsm: 290, stiffnessFactor: 35.0, shearStr: "1.40 MPa" },
    "balsa-6": { name: "6mm End-Grain Balsa Wood", thickMm: 6.0, weightGsm: 900, stiffnessFactor: 40.0, shearStr: "2.80 MPa" }
  };

  const s = stackData[schedule] || stackData["quasi-8"];
  const c = coreData[core] || coreData.solid;

  const skinThickMm = s.plies * 0.25;
  const totalPanelThickMm = (skinThickMm + c.thickMm).toFixed(2);

  res.innerHTML = `
    <div class="comp-spec-grid">
      <div class="comp-stat-card">
        <span class="label">Bending Stiffness</span>
        <span class="value" style="color:var(--primary)">${c.stiffnessFactor}x</span>
        <div class="hint">Relative to solid laminate</div>
      </div>
      <div class="comp-stat-card">
        <span class="label">Stacking Schedule</span>
        <span class="value" style="font-size:13px">${s.plies} Plies</span>
        <div class="hint">${s.isotropy}</div>
      </div>
      <div class="comp-stat-card">
        <span class="label">Total Sandwich Depth</span>
        <span class="value">${totalPanelThickMm} mm</span>
        <div class="hint">${c.name}</div>
      </div>
      <div class="comp-stat-card">
        <span class="label">Symmetry Status</span>
        <span class="value" style="font-size:12px;color:#10b981">Verified Flat</span>
        <div class="hint">${s.symmetry}</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      🥪 <strong>Sandwich Core Physics:</strong> Separating top and bottom carbon skins with a lightweight core exponentially increases the second moment of area (I = b·h³/12). Adding a <strong>${c.name}</strong> increases flexural rigidity by <strong>${c.stiffnessFactor}x</strong> while adding only ${c.weightGsm} g/m² of weight!<br>
      📐 <strong>Stacking Note:</strong> ${s.description}
    </div>
  `;
}

function updateCompositesVacuum() {
  const vacInHg = parseFloat($("#comp-vacuum-level")?.value) || 28;
  const leakRate = $("#comp-leakdown-rate")?.value || "pass";
  const area = Math.max(0.01, parseFloat($("#comp-part-area")?.value) || 0.50);
  const res = $("#comp-vacuum-result");
  if (!res) return;

  // Atmospheric pressure at sea level = 29.92 inHg = 14.696 psi = 101.325 kPa
  const psiPerInHg = 14.696 / 29.92; // ~0.4912 psi/inHg
  const clampingPsi = (vacInHg * psiPerInHg).toFixed(2);
  const clampingKpa = (vacInHg * 3.38639).toFixed(1);

  // Area: 1 m² = 1550.003 in²
  const areaSqIn = area * 1550.003;
  const totalClampingLbs = Math.round(parseFloat(clampingPsi) * areaSqIn);
  const totalClampingTons = (totalClampingLbs / 2204.62).toFixed(2); // Metric tons

  let leakStatusHtml = '<span style="color:#10b981;font-weight:700">✅ PASSED (&lt; 2 mbar/min)</span>';
  let leakHint = 'Hermetic seal achieved. Resin will infuse cleanly without boiling or drawing vacuum voids.';
  if (leakRate === "marginal") {
    leakStatusHtml = '<span style="color:#f59e0b;font-weight:700">⚠️ MARGINAL (2 - 5 mbar/min)</span>';
    leakHint = 'Acceptable for wet bagging compaction, but locate micro-leaks before attempting VARTM resin infusion.';
  } else if (leakRate === "fail") {
    leakStatusHtml = '<span style="color:#ef4444;font-weight:700">❌ FAILED (&gt; 5 mbar/min)</span>';
    leakHint = 'Critical bag leak! Run ultrasonic detector or check sealant tape pleats. Infusing now will create catastrophic dry spots.';
  }

  res.innerHTML = `
    <div class="comp-spec-grid">
      <div class="comp-stat-card">
        <span class="label">Total Clamping Force</span>
        <span class="value" style="color:var(--primary)">${totalClampingTons} Tons</span>
        <div class="hint">${totalClampingLbs.toLocaleString()} lbs over ${area} m²</div>
      </div>
      <div class="comp-stat-card">
        <span class="label">Compaction Pressure</span>
        <span class="value">${clampingPsi} psi</span>
        <div class="hint">${clampingKpa} kPa atmospheric squeeze</div>
      </div>
      <div class="comp-stat-card">
        <span class="label">Vacuum Level</span>
        <span class="value">${vacInHg} inHg</span>
        <div class="hint">${Math.round((vacInHg / 29.92) * 100)}% absolute vacuum</div>
      </div>
      <div class="comp-stat-card">
        <span class="label">15-Min Leakdown Test</span>
        <span class="value" style="font-size:12px">${leakStatusHtml}</span>
        <div class="hint">${leakRate === 'pass' ? 'Infusion Ready' : 'Bag Inspection Required'}</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      🌪️ <strong>Atmospheric Squeeze:</strong> Pulling ${vacInHg} inHg applies <strong>${totalClampingLbs.toLocaleString()} lbs (~${totalClampingTons} metric tons)</strong> of uniform pressure over your part surface. This compresses dry carbon fabrics tight to the mold tooling surface and evacuates micro-air voids!<br>
      🔍 <strong>Leakdown Protocol:</strong> ${leakHint}
    </div>
  `;
}

function updateCompositesCure() {
  const temp = $("#comp-ambient-temp")?.value || "optimal";
  const cureSched = $("#comp-cure-schedule")?.value || "ambient";
  const res = $("#comp-cure-result");
  if (!res) return;

  const tempGuide = {
    cool: { potLife: "75 – 95 Mins", exothermRisk: "Low", note: "Extended working time, ideal for large infusion parts. Demold time extended to 36 hours." },
    optimal: { potLife: "45 – 60 Mins", exothermRisk: "Normal", note: "Standard laminating window. Safe for resin batches up to 400g in open wide mixing containers." },
    hot: { potLife: "20 – 30 Mins", exothermRisk: "HIGH RISK 🔥", note: "Warning: High exothermic runaway danger! Spread resin into shallow roller trays immediately after mixing." }
  };

  const schedGuide = {
    ambient: { tg: "58°C – 62°C", cycle: "Room Temp 24 Hours", usage: "Cosmetic car parts, drone frames, interior trim." },
    "mild-post": { tg: "80°C – 85°C", cycle: "50°C for 6 Hours", usage: "Automotive engine bays, outdoor marine deck gear." },
    "full-post": { tg: "115°C – 125°C", cycle: "Ramp 1°C/min → 60°C (2h) → 80°C (4h)", usage: "Structural aerospace, high-temperature exhaust fairings, track race hoods." }
  };

  const t = tempGuide[temp] || tempGuide.optimal;
  const s = schedGuide[cureSched] || schedGuide.ambient;

  res.innerHTML = `
    <div class="comp-spec-grid">
      <div class="comp-stat-card">
        <span class="label">Working Pot Life</span>
        <span class="value" style="color:var(--primary)">${t.potLife}</span>
        <div class="hint">At shop ambient temp</div>
      </div>
      <div class="comp-stat-card">
        <span class="label">Exotherm Runaway Risk</span>
        <span class="value" style="font-size:13px;color:${temp === 'hot' ? '#ef4444' : 'inherit'}">${t.exothermRisk}</span>
        <div class="hint">${t.note}</div>
      </div>
      <div class="comp-stat-card">
        <span class="label">Glass Transition (Tg)</span>
        <span class="value">${s.tg}</span>
        <div class="hint">Heat deflection temperature</div>
      </div>
      <div class="comp-stat-card">
        <span class="label">Post-Cure Schedule</span>
        <span class="value" style="font-size:12px">${s.cycle}</span>
        <div class="hint">${s.usage}</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      📜 <strong>Consumable Bagging Stack Order (Bottom to Top):</strong><br>
      <strong>1. Tooling Mold</strong> (Coated with 3 coats carnuba / semi-permanent release wax)<br>
      <strong>2. Reinforcement Fabric</strong> (Dry carbon plies stacked to specified schedule)<br>
      <strong>3. Peel Ply Fabric</strong> (Porous nylon 66 with red tracer; leaves rough textured surface for secondary bonding)<br>
      <strong>4. Perforated Release Film</strong> (P3 pinhole perforated barrier film to control resin bleed)<br>
      <strong>5. Resin Flow Media / Breather Felt</strong> (High-flow knitted mesh to distribute resin rapidly across surface)<br>
      <strong>6. Vacuum Bagging Film & Butyl Tack Tape</strong> (Yellow sealant tape with pleats ensuring zero bridge tension)
    </div>
  `;
}

function renderCompositesView() {
  updateCompositesResin();
  updateCompositesStack();
  updateCompositesVacuum();
  updateCompositesCure();
}

// ============================================================
// ⏱️ Watchmaking & Horology Studio Calculations
// ============================================================
function copyHorologySpecs() {
  const timeText = $("#horo-timegrapher-result")?.innerText || "";
  const resText = $("#horo-reserve-result")?.innerText || "";
  const lubeText = $("#horo-lube-result")?.innerText || "";
  const presText = $("#horo-pressure-result")?.innerText || "";
  const text = `⏱️ WATCHMAKING & HOROLOGY SPEC SHEET\n\n${timeText}\n\n${resText}\n\n${lubeText}\n\n${presText}`;
  void navigator.clipboard.writeText(text).then(() => showToast("Copied Horology Specs to clipboard!"));
}

async function addHorologySupplies() {
  await addMaterialToProjectShopping("Moebius 9010 Fine Synthetic Watch Oil (2ml Bottle)", "1 bottle", 34.00, "Watchmaking & Horology Tools");
}

function updateHorologyTimegrapher() {
  const caliber = $("#horo-caliber-select")?.value || "nh35";
  const pos = $("#horo-test-pos")?.value || "ch";
  const rateDrift = parseInt($("#horo-rate-drift")?.value, 10) || 0;
  const amplitude = parseInt($("#horo-balance-amp")?.value, 10) || 285;
  const beatError = parseFloat($("#horo-beat-error")?.value) || 0.2;
  const res = $("#horo-timegrapher-result");
  if (!res) return;

  const calData = {
    nh35: { name: "Seiko NH35 / 4R36", bph: 21600, hz: 3.0, liftAngle: 53, rateTol: [-20, 40], ampMin: 250, ampMax: 310 },
    eta2824: { name: "ETA 2824-2 / SW200", bph: 28800, hz: 4.0, liftAngle: 50, rateTol: [-12, 12], ampMin: 260, ampMax: 315 },
    miyota9015: { name: "Miyota 9015", bph: 28800, hz: 4.0, liftAngle: 51, rateTol: [-10, 30], ampMin: 260, ampMax: 310 },
    valjoux7750: { name: "Valjoux 7750 Chrono", bph: 28800, hz: 4.0, liftAngle: 49, rateTol: [-10, 15], ampMin: 250, ampMax: 310 },
    pocket18k: { name: "Vintage Pocket 18k", bph: 18000, hz: 2.5, liftAngle: 52, rateTol: [-30, 30], ampMin: 240, ampMax: 300 },
    hibeat36k: { name: "Hi-Beat 36k (5Hz)", bph: 36000, hz: 5.0, liftAngle: 52, rateTol: [-5, 8], ampMin: 260, ampMax: 310 }
  };

  const c = calData[caliber] || calData.nh35;

  // Rate Health
  const rateOk = rateDrift >= c.rateTol[0] && rateDrift <= c.rateTol[1];

  // Amplitude Health
  let ampStatus = "Healthy Amplitude";
  let ampColor = "#10b981";
  if (amplitude < 230) {
    ampStatus = "Low Amplitude (Friction/Service)";
    ampColor = "#ef4444";
  } else if (amplitude > 320) {
    ampStatus = "Over-Banking / Knocking Risk!";
    ampColor = "#ef4444";
  } else if (amplitude < c.ampMin) {
    ampStatus = "Slightly Sluggish";
    ampColor = "#f59e0b";
  }

  // Beat Error Health
  let beatStatus = "Excellent Symmetry";
  let beatColor = "#10b981";
  if (beatError > 0.8) {
    beatStatus = "Adjust Stud Carrier";
    beatColor = "#ef4444";
  } else if (beatError > 0.5) {
    beatStatus = "Moderate Beat Error";
    beatColor = "#f59e0b";
  }

  // Diagnostic recommendation
  let rec = `Movement is running within manufacturer tolerance for ${c.name}.`;
  if (beatError > 0.5) {
    rec = `Beat error of ${beatError}ms indicates the balance impulse pin is resting off-center from the pallet fork horns. Gently rotate the <strong>mobile balance stud carrier</strong> to bring beat error under 0.4ms before touching the rate regulator!`;
  } else if (!rateOk) {
    const dir = rateDrift > 0 ? "toward minus (-)" : "toward plus (+)";
    rec = `Rate is drifting outside target window (${rateDrift > 0 ? '+' : ''}${rateDrift} s/d). Move the <strong>regulator index curb pin arm</strong> slightly ${dir} by a fraction of a millimeter.`;
  } else if (amplitude < 230) {
    rec = `Low amplitude (${amplitude}°) in position indicates dry/congealed oil on the balance cap jewels or excessive pivot friction in the train. A full ultrasonic movement cleaning and re-lubrication with Moebius 9010 is required!`;
  }

  res.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px">
      <span class="horo-badge">⏱️ Rate Drift: ${rateDrift > 0 ? '+' : ''}${rateDrift} s/day</span>
      <span style="font-size:11px;color:var(--muted)">Beat Rate: <strong>${c.bph.toLocaleString()} bph (${c.hz} Hz)</strong> · Lift Angle: ${c.liftAngle}°</span>
    </div>

    <div class="horo-spec-grid">
      <div class="horo-stat-card">
        <span class="label">Balance Amplitude</span>
        <span class="value" style="color:${ampColor}">${amplitude}°</span>
        <div class="hint">${ampStatus}</div>
      </div>
      <div class="horo-stat-card">
        <span class="label">Beat Error</span>
        <span class="value" style="color:${beatColor}">${beatError.toFixed(1)} ms</span>
        <div class="hint">${beatStatus}</div>
      </div>
      <div class="horo-stat-card">
        <span class="label">Lift Angle Setting</span>
        <span class="value">${c.liftAngle}°</span>
        <div class="hint">Timegrapher calibration constant</div>
      </div>
      <div class="horo-stat-card">
        <span class="label">Positional Delta</span>
        <span class="value" style="font-size:13px">${pos.toUpperCase()} Position</span>
        <div class="hint">Tolerance: ${c.rateTol[0]} to +${c.rateTol[1]} s/d</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      🛠️ <strong>Horological Diagnostic:</strong> ${rec}<br>
      ⚖️ <strong>Isochronism Rule:</strong> Always regulate beat error FIRST using the stud carrier. Adjusting the rate index arm changes spring effective length, but if the balance is out of beat, rate will wander wildly across dial-up vs crown-down positions!
    </div>
  `;
}

function updateHorologyReserve() {
  const type = $("#horo-mainspring-type")?.value || "auto-bridle";
  const windState = $("#horo-wind-state")?.value || "full";
  const res = $("#horo-reserve-result");
  if (!res) return;

  const springData = {
    "auto-bridle": {
      name: "Automatic with Slipping Bridle",
      totalReserve: "41 Hours",
      barrelTurns: "6.8 Turns",
      slipTorque: "1.15 N·mm",
      notes: "Mainspring outer tail slips smoothly along barrel wall lubricated with graphite braking grease to prevent overwinding."
    },
    "manual-hook": {
      name: "Manual Wind with Fixed Arbor Hook",
      totalReserve: "48 Hours",
      barrelTurns: "7.5 Turns",
      slipTorque: "Fixed (Hard stop)",
      notes: "Traditional riveted hook into barrel wall. Stop winding immediately when firm resistance is felt at full wind."
    },
    "pow-80": {
      name: "Extended Reserve (Powermatic 80 / Nivachron)",
      totalReserve: "80 Hours",
      barrelTurns: "8.2 Turns",
      slipTorque: "1.05 N·mm",
      notes: "Thinner mainspring inside expanded barrel drum, operating at optimized 21,600 bph frequency with synthetic low-friction escapement."
    }
  };

  const stateData = {
    full: { torqueDesc: "Peak Full Torque (100% – 85%)", ampEst: "280° – 305°", rateDriftEst: "Nominal 0 s/d baseline", advice: "Maximum balance wheel inertia. Optimal timekeeping window." },
    mid: { torqueDesc: "Stable Mid Torque (85% – 60%)", ampEst: "260° – 275°", rateDriftEst: "+2 to +4 s/d slight advance", advice: "Flat isochronous plateau. Balance spring breaths concentric cycles." },
    low: { torqueDesc: "Torque Droop (Tail 40% – 0%)", ampEst: "215° – 235°", rateDriftEst: "-10 to -25 s/d sudden lag", advice: "Torque collapse. Escapement loses kinetic energy; amplitude drops below safe threshold." }
  };

  const s = springData[type] || springData["auto-bridle"];
  const w = stateData[windState] || stateData.full;

  res.innerHTML = `
    <div class="horo-spec-grid">
      <div class="horo-stat-card">
        <span class="label">Total Power Reserve</span>
        <span class="value" style="color:var(--primary)">${s.totalReserve}</span>
        <div class="hint">${s.barrelTurns} full arbor winds</div>
      </div>
      <div class="horo-stat-card">
        <span class="label">Instantaneous Torque</span>
        <span class="value" style="font-size:13px">${w.torqueDesc}</span>
        <div class="hint">${w.advice}</div>
      </div>
      <div class="horo-stat-card">
        <span class="label">Expected Amplitude</span>
        <span class="value">${w.ampEst}</span>
        <div class="hint">Discharge amplitude drop</div>
      </div>
      <div class="horo-stat-card">
        <span class="label">Isochronism Drift</span>
        <span class="value" style="font-size:13px">${w.rateDriftEst}</span>
        <div class="hint">Hooke's spring torque curve</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      ⚙️ <strong>Mainspring Barrel Architecture:</strong> ${s.notes}<br>
      🌀 <strong>Isochronism Principle:</strong> In an ideal balance wheel, oscillation period is independent of amplitude. However, real balance springs have terminal curvature imperfections (Breguet overcoil vs flat hairspring). When mainspring torque drops after 24–36 hours, lower amplitude causes slight rate drift!
    </div>
  `;
}

function updateHorologyLube() {
  const point = $("#horo-lube-point")?.value || "balance-jewel";
  const res = $("#horo-lube-result");
  if (!res) return;

  const lubeMap = {
    "balance-jewel": {
      oil: "Moebius 9010",
      viscosity: "Light Synthetic (150 cSt @ 20°C)",
      dosage: "1/2 to 2/3 cap jewel diameter dot",
      tool: "Fine Oiler (Black Bergeon 7013-1)",
      instructions: "Place micro-dot of 9010 strictly on the flat polished face of the endstone (cap jewel). Never oil the pierced hole stone! Treat jewels with Epilame (Fixodrop) beforehand to prevent oil from creeping off the center contact meniscus."
    },
    "pallet-stones": {
      oil: "Moebius 9415",
      viscosity: "Thixotropic Escapement Grease (110 cSt)",
      dosage: "Micro-dot on 3 alternating escape teeth",
      tool: "Micro Oiler (Yellow Bergeon 7013-2)",
      instructions: "Never apply oil directly to the pallet fork stones or pallet arbor pivots! Pallet arbor pivots must run 100% bone dry. Place a tiny smear of 9415 on the impulse faces of 3 alternating escape wheel teeth while cycling the wheel slowly."
    },
    "train-pivots": {
      oil: "Moebius HP-1300 (Synt-HP 1300 / 9104)",
      viscosity: "Heavy Synthetic (1300 cSt @ 20°C)",
      dosage: "1/3 to 1/2 oil sink capacity",
      tool: "Medium Oiler (Green Bergeon 7013-3)",
      instructions: "Lubricate center wheel arbor, third wheel pivots, and fourth wheel pivots. Ensure the oiler enters the oil sink without touching the jewel chamfer bevel. Use Moebius 9010 on high-speed escape wheel pivots."
    },
    "barrel-arbor": {
      oil: "Moebius 8200 / Kluber P125 / Moebius 8217",
      viscosity: "Heavy Viscous Grease / Braking Paste",
      dosage: "Thin film along inner barrel wall notches",
      tool: "Flat Spatula Oiler (Blue Bergeon 7013-4)",
      instructions: "For automatic movements, apply 3 to 4 tiny dabs of Kluber P125 or Moebius 8217 braking grease to the internal barrel drum wall. This allows the slipping bridle to slip smoothly at 1.15 N·mm without scratching the barrel wall."
    },
    "keyless-works": {
      oil: "Molykote DX / Moebius 9504",
      viscosity: "Extreme Pressure Lithium Grease",
      dosage: "Light coating on sliding teeth and detents",
      tool: "Flat Spatula / Fine Brush",
      instructions: "Apply to sliding clutch teeth, winding pinion bevel teeth, setting lever pin, yoke spring contact point, and minute wheel post. High-pressure boundary lubrication prevents steel-on-steel wear during manual winding and time setting."
    },
    "case-gaskets": {
      oil: "Fomblin / Silicone Grease (Seiko S-414)",
      viscosity: "Fluorinated Pure Silicone Paste",
      dosage: "Thin translucent sheen on O-rings",
      tool: "Silicon Sponge Applicator Box",
      instructions: "Place caseback O-ring and crown stem gaskets inside silicone greasing box and twist gently. Silicone maintains elastomeric flexibility, seals microscopic case grooves, and prevents gaskets from binding or tearing when torquing the caseback."
    }
  };

  const item = lubeMap[point] || lubeMap["balance-jewel"];

  res.innerHTML = `
    <div class="horo-spec-grid">
      <div class="horo-stat-card">
        <span class="label">Recommended Lubricant</span>
        <span class="value" style="color:var(--primary)">${item.oil}</span>
        <div class="hint">${item.viscosity}</div>
      </div>
      <div class="horo-stat-card">
        <span class="label">Target Dosage</span>
        <span class="value" style="font-size:13px">${item.dosage}</span>
        <div class="hint">Avoid over-lubrication</div>
      </div>
      <div class="horo-stat-card">
        <span class="label">Applicator Tool</span>
        <span class="value" style="font-size:13px">${item.tool}</span>
        <div class="hint">Clean tip in pithwood before dip</div>
      </div>
      <div class="horo-stat-card">
        <span class="label">Anti-Spreading Barrier</span>
        <span class="value" style="font-size:13px">Fixodrop Epilame</span>
        <div class="hint">Prevents oil migration</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      🛢️ <strong>Application Protocol:</strong> ${item.instructions}<br>
      ⚠️ <strong>Golden Rule of Horology:</strong> Too much oil is far more destructive than too little oil! Excess oil creeps away by capillary action onto hairspring coils or pinions, attracting dust and causing the watch to stop within months.
    </div>
  `;
}

function updateHorologyPressure() {
  const rating = $("#horo-water-rating")?.value || "10atm";
  const crown = $("#horo-gasket-type")?.value || "screw-down";
  const res = $("#horo-pressure-result");
  if (!res) return;

  const pressData = {
    "3atm": { depth: "30 Meters", bars: 3, psi: 43.5, safe: "Splashes, rain, hand washing", forbid: "Showering, surface swimming, diving", safetyFactor: "Static test only" },
    "5atm": { depth: "50 Meters", bars: 5, psi: 72.5, safe: "Shallow swimming, dishwashing, rainstorms", forbid: "High-board diving, water skiing, scuba diving", safetyFactor: "1.5x dynamic reserve" },
    "10atm": { depth: "100 Meters", bars: 10, psi: 145.0, safe: "Swimming, snorkeling, sailing, surfing", forbid: "Deep scuba diving on compressed gas", safetyFactor: "2.0x dynamic reserve" },
    "20atm": { depth: "200 Meters", bars: 20, psi: 290.0, safe: "Scuba diving (ISO 6425 compliant), deep water sports", forbid: "Hyperbaric saturation dive bells without HRV", safetyFactor: "Meets ISO 6425 125% test" },
    "30atm": { depth: "300+ Meters", bars: 30, psi: 435.0, safe: "Deep saturation commercial diving", forbid: "None (Operating with helium release valve)", safetyFactor: "Heavy engineered case" }
  };

  const p = pressData[rating] || pressData["10atm"];

  let crownAdvice = "Push-pull crown relies strictly on radial stem O-ring squeeze. Never pull crown out when wet!";
  if (crown === "screw-down") {
    crownAdvice = "Screw-down crown compresses an internal face gasket against the case tube rim, creating a dual-stage water barrier. Screw down finger-tight without over-torquing threads.";
  } else if (crown === "monobloc") {
    crownAdvice = "Monobloc / front-loading cases have no rear caseback seam, eliminating the largest failure point for water ingress.";
  }

  res.innerHTML = `
    <div class="horo-spec-grid">
      <div class="horo-stat-card">
        <span class="label">Hydrostatic Pressure</span>
        <span class="value" style="color:var(--primary)">${p.bars} Bar (${p.psi} psi)</span>
        <div class="hint">${p.depth} nominal rating</div>
      </div>
      <div class="horo-stat-card">
        <span class="label">Permitted Activities</span>
        <span class="value" style="font-size:12px;color:#10b981">${p.safe}</span>
        <div class="hint">${p.safetyFactor}</div>
      </div>
      <div class="horo-stat-card">
        <span class="label">Strictly Prohibited</span>
        <span class="value" style="font-size:12px;color:#ef4444">${p.forbid}</span>
        <div class="hint">Dynamic pressure spike risk</div>
      </div>
      <div class="horo-stat-card">
        <span class="label">Crown Sealing System</span>
        <span class="value" style="font-size:13px">${crown === 'screw-down' ? 'Screw-Down Crown' : (crown === 'monobloc' ? 'Monobloc Seam' : 'Push-Pull Crown')}</span>
        <div class="hint">FKM Viton / Nitrile Gaskets</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      🌊 <strong>Dynamic Pressure Reality:</strong> Watch depth ratings (e.g. 50m / 5 bar) are measured in static laboratory tanks. A fast swimmer plunging their arm into water creates dynamic velocity pressure spikes that can exceed 3 bar locally, allowing water to bypass tired push-pull seals!<br>
      👑 <strong>Crown Sealing:</strong> ${crownAdvice}<br>
      🎈 <strong>Helium Release Valve (HRV) Physics:</strong> In saturation diving bells with Heliox atmosphere, tiny helium atoms (0.28 nm) penetrate rubber gaskets over days. During chamber decompression, internal case pressure will blow the front sapphire crystal off unless vented automatically by an HRV!
    </div>
  `;
}

function renderHorologyView() {
  updateHorologyTimegrapher();
  updateHorologyReserve();
  updateHorologyLube();
  updateHorologyPressure();
}

// ============================================================
// 🤖 Robotics, Mechatronics & Kinematics Calculations
// ============================================================
function copyRoboticsSpecs() {
  const torqText = $("#robo-torque-result")?.innerText || "";
  const drvText = $("#robo-driver-result")?.innerText || "";
  const linText = $("#robo-linear-result")?.innerText || "";
  const kinText = $("#robo-kinematics-result")?.innerText || "";
  const text = `🤖 ROBOTICS & MECHATRONICS SPEC SHEET\n\n${torqText}\n\n${drvText}\n\n${linText}\n\n${kinText}`;
  void navigator.clipboard.writeText(text).then(() => showToast("Copied Robotics Specs to clipboard!"));
}

async function addRoboticsSupplies() {
  const motor = $("#robo-motor-class option:checked")?.textContent.split("(")[0].trim() || "NEMA 17 Stepper";
  await addMaterialToProjectShopping(`${motor} Motor Kit`, "1 kit", 32.00, "Robotics, Motors & Mechatronics");
}

function updateRoboticsTorque() {
  const motorClass = $("#robo-motor-class")?.value || "nema17";
  const mech = $("#robo-mech-type")?.value || "direct-rotary";
  const massKg = Math.max(0.01, parseFloat($("#robo-load-mass")?.value) || 1.50);
  const radiusMm = Math.max(1, parseFloat($("#robo-arm-radius")?.value) || 120);
  const alpha = parseFloat($("#robo-ang-accel")?.value) || 25;
  const safetyFactor = parseFloat($("#robo-safety-factor")?.value) || 1.8;
  const res = $("#robo-torque-result");
  if (!res) return;

  const motorData = {
    nema17: { name: "NEMA 17 Stepper", ratedNm: 0.45, ratedOzIn: 63.7, currentA: "1.5A – 2.0A" },
    nema23: { name: "NEMA 23 Stepper", ratedNm: 1.90, ratedOzIn: 269.1, currentA: "2.8A – 4.2A" },
    nema34: { name: "NEMA 34 Stepper", ratedNm: 8.50, ratedOzIn: 1203.7, currentA: "5.5A – 8.0A" },
    "servo-standard": { name: "Digital MG996R Servo", ratedNm: 1.08, ratedOzIn: 152.8, currentA: "1.5A stall" },
    "bldc-gimbal": { name: "BLDC FOC Direct-Drive", ratedNm: 0.80, ratedOzIn: 113.3, currentA: "2.2A bus" }
  };

  const m = motorData[motorClass] || motorData.nema17;
  const radiusM = radiusMm / 1000;

  // 1. Static holding torque:
  const g = 9.80665;
  let staticNm = massKg * g * radiusM;
  if (mech === "leadscrew") {
    const leadM = 0.008;
    const eff = 0.90;
    const mu = 0.05;
    staticNm = (mu * massKg * g * leadM) / (2 * Math.PI * eff);
  }

  // 2. Dynamic inertial torque: T_inertia = J * alpha
  const inertiaKgM2 = massKg * Math.pow(radiusM, 2);
  const dynamicNm = inertiaKgM2 * alpha;

  // 3. Required total torque with safety margin
  const reqTotalNm = (staticNm + dynamicNm) * safetyFactor;
  const reqOzIn = reqTotalNm * 141.612;

  // Motor adequacy check
  const adequacyRatio = m.ratedNm / reqTotalNm;
  let statusColor = "#10b981";
  let statusText = "Motor Adequately Sized";
  if (adequacyRatio < 1.0) {
    statusColor = "#ef4444";
    statusText = "Stall / Step Loss Risk! Upgrade Motor";
  } else if (adequacyRatio < 1.25) {
    statusColor = "#f59e0b";
    statusText = "Marginal Holding Torque";
  }

  res.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px">
      <span class="robo-badge">⚡ Req Torque: ${reqTotalNm.toFixed(2)} N·m (${Math.round(reqOzIn)} oz·in)</span>
      <span style="font-size:11px;color:${statusColor}"><strong>${statusText}</strong> (${(adequacyRatio * 100).toFixed(0)}% capacity)</span>
    </div>

    <div class="robo-spec-grid">
      <div class="robo-stat-card">
        <span class="label">Static Gravitational Hold</span>
        <span class="value" style="color:var(--primary)">${staticNm.toFixed(2)} N·m</span>
        <div class="hint">Holding load at ${radiusMm}mm radius</div>
      </div>
      <div class="robo-stat-card">
        <span class="label">Dynamic Inertial Torque</span>
        <span class="value">${dynamicNm.toFixed(2)} N·m</span>
        <div class="hint">At &alpha; = ${alpha} rad/s² acceleration</div>
      </div>
      <div class="robo-stat-card">
        <span class="label">Selected Motor Rating</span>
        <span class="value">${m.ratedNm} N·m</span>
        <div class="hint">${m.name} (${Math.round(m.ratedOzIn)} oz·in)</div>
      </div>
      <div class="robo-stat-card">
        <span class="label">Rotational Inertia (J)</span>
        <span class="value" style="font-size:13px">${inertiaKgM2.toFixed(4)} kg·m²</span>
        <div class="hint">${safetyFactor}x safety margin applied</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      ⚡ <strong>Stepper Torque Decay Physics:</strong> Unlike DC motors, stepper holding torque drops significantly as RPM increases. At 600 RPM, a NEMA 17 stepper typically outputs only <strong>40% to 50%</strong> of its static rating. Always design for a 1.8x to 2.0x safety factor to prevent skipped steps!
    </div>
  `;
}

function updateRoboticsDriver() {
  const driver = $("#robo-driver-ic")?.value || "tmc2209";
  const microsteps = parseInt($("#robo-microsteps")?.value, 10) || 16;
  const rpm = Math.max(1, parseInt($("#robo-motor-rpm")?.value, 10) || 600);
  const stepAngle = parseFloat($("#robo-step-angle")?.value) || 1.8;
  const res = $("#robo-driver-result");
  if (!res) return;

  const stepsPerRevNative = Math.round(360 / stepAngle);
  const totalMicrostepsPerRev = stepsPerRevNative * microsteps;

  // Pulse step frequency: f = (RPM * totalMicrostepsPerRev) / 60
  const stepPulseHz = (rpm * totalMicrostepsPerRev) / 60;
  const stepPulseKhz = (stepPulseHz / 1000).toFixed(2);

  let mcuHint = "32-bit MCU (RP2040 / STM32 / ESP32) recommended";
  let mcuColor = "#10b981";
  if (stepPulseHz > 150000) {
    mcuHint = "High step rate! High-clock 32-bit MCU (RP2040 133MHz / Teensy 4.1) required";
    mcuColor = "#f59e0b";
  } else if (stepPulseHz <= 35000) {
    mcuHint = "Compatible with standard 8-bit AVR (ATmega328P) & 32-bit controllers";
  }

  const driverNotes = {
    tmc2209: "Trinamic StealthChop2 voltage-mode modulation provides whisper-quiet movement. Automatically transitions to SpreadCycle at higher velocities to maintain torque.",
    a4988: "Cost-effective classic chopper driver. Prone to motor whine / audible singing frequencies at 1/16 microstepping.",
    drv8825: "Fast decay mode recommended to eliminate low-speed motor resonance bumps. Supports up to 1/32 microstepping.",
    tb6600: "Optocoupled isolated inputs prevent ground loops and inductive spikes from reaching microcontroller GPIO pins."
  };

  res.innerHTML = `
    <div class="robo-spec-grid">
      <div class="robo-stat-card">
        <span class="label">Step Pulse Frequency</span>
        <span class="value" style="color:var(--primary)">${stepPulseKhz} kHz</span>
        <div class="hint">${Math.round(stepPulseHz).toLocaleString()} pulses/sec</div>
      </div>
      <div class="robo-stat-card">
        <span class="label">Microstep Resolution</span>
        <span class="value">1 / ${microsteps}</span>
        <div class="hint">${totalMicrostepsPerRev.toLocaleString()} steps per revolution</div>
      </div>
      <div class="robo-stat-card">
        <span class="label">Microcontroller Load</span>
        <span class="value" style="font-size:12px;color:${mcuColor}">${stepPulseHz > 100000 ? 'High Step Frequency' : 'Optimal Bandwidth'}</span>
        <div class="hint">${mcuHint}</div>
      </div>
      <div class="robo-stat-card">
        <span class="label">Native Step Profile</span>
        <span class="value" style="font-size:13px">${stepAngle}° (${stepsPerRevNative} steps)</span>
        <div class="hint">Operating at ${rpm} RPM</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      🎛️ <strong>Driver Modulation Note:</strong> ${driverNotes[driver] || driverNotes.tmc2209}<br>
      🧠 <strong>Current Calibration:</strong> Always calibrate VREF voltage with a ceramic screwdriver before connecting motor coils: <strong>I_RMS = VREF / (1.414 &times; R_sense)</strong>. For TMC2209 with 0.11&Omega; sense resistors, VREF = 1.20V yields ~1.1A RMS!
    </div>
  `;
}

function updateRoboticsLinear() {
  const mech = $("#robo-drivetrain-mech")?.value || "gt2-20t";
  const gearRatio = parseFloat($("#robo-gear-ratio")?.value) || 1.0;
  const microsteps = parseInt($("#robo-microsteps")?.value, 10) || 16;
  const stepAngle = parseFloat($("#robo-step-angle")?.value) || 1.8;
  const res = $("#robo-linear-result");
  if (!res) return;

  const stepsPerRevNative = Math.round(360 / stepAngle);
  const totalMicrostepsPerRev = stepsPerRevNative * microsteps;

  const mechData = {
    "gt2-20t": { leadMm: 40.0, name: "GT2 20-Tooth Belt (40mm/rev)", backlash: "0.02 – 0.05 mm" },
    "gt2-16t": { leadMm: 32.0, name: "GT2 16-Tooth Belt (32mm/rev)", backlash: "0.02 – 0.05 mm" },
    "t8-lead8": { leadMm: 8.0, name: "T8 Lead Screw (8mm lead)", backlash: "0.08 – 0.15 mm (Anti-backlash nut advised)" },
    "t8-lead2": { leadMm: 2.0, name: "T8 Lead Screw (2mm lead)", backlash: "0.05 – 0.10 mm" },
    sfu1605: { leadMm: 5.0, name: "SFU1605 Ground Ballscrew (5mm lead)", backlash: "< 0.015 mm (Zero backlash)" },
    "rack-mod1": { leadMm: 62.83, name: "Rack & Pinion Module 1.0 (62.83mm/rev)", backlash: "0.05 – 0.10 mm" }
  };

  const d = mechData[mech] || mechData["gt2-20t"];

  // Effective linear lead after gear reduction (mm/motor rev)
  const linearLeadMm = d.leadMm / gearRatio;

  // Steps per millimeter: steps/mm = totalMicrostepsPerRev / linearLeadMm
  const stepsPerMm = (totalMicrostepsPerRev / linearLeadMm).toFixed(2);

  // Linear travel per single microstep (microns)
  const micronsPerStep = ((linearLeadMm / totalMicrostepsPerRev) * 1000).toFixed(2);

  res.innerHTML = `
    <div class="robo-spec-grid">
      <div class="robo-stat-card">
        <span class="label">Controller Firmware Config</span>
        <span class="value" style="color:var(--primary)">${stepsPerMm} steps/mm</span>
        <div class="hint">Value for GRBL / Klipper / Marlin</div>
      </div>
      <div class="robo-stat-card">
        <span class="label">Linear Resolution</span>
        <span class="value">${micronsPerStep} &mu;m / step</span>
        <div class="hint">Physical microstep resolution</div>
      </div>
      <div class="robo-stat-card">
        <span class="label">Travel per Revolution</span>
        <span class="value">${linearLeadMm.toFixed(2)} mm</span>
        <div class="hint">${gearRatio > 1 ? `${gearRatio}:1 reduction applied` : 'Direct drive 1:1'}</div>
      </div>
      <div class="robo-stat-card">
        <span class="label">Mechanical Backlash</span>
        <span class="value" style="font-size:12px">${d.backlash}</span>
        <div class="hint">${d.name}</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      📐 <strong>Backlash Compensation:</strong> Belt systems have negligible backlash when properly tensioned (taut acoustic resonance ~60–70 Hz over 150mm span). Lead screws with brass nuts develop axial play under reversal; use spring-loaded anti-backlash POM nuts or preloaded C7 ballscrews for precision CNC and robotic joints!
    </div>
  `;
}

function updateRoboticsKinematics() {
  const l1 = Math.max(10, parseFloat($("#robo-arm-l1")?.value) || 220);
  const l2 = Math.max(10, parseFloat($("#robo-arm-l2")?.value) || 180);
  const theta1Deg = parseFloat($("#robo-arm-theta1")?.value) || 45;
  const theta2Deg = parseFloat($("#robo-arm-theta2")?.value) || 30;
  const batteryConfig = $("#robo-battery-pack")?.value || "24v-6s";
  const batteryMah = Math.max(100, parseFloat($("#robo-battery-mah")?.value) || 5000);
  const res = $("#robo-kinematics-result");
  if (!res) return;

  // Forward Kinematics for 2-DOF Planar Robot Arm:
  const rad1 = (theta1Deg * Math.PI) / 180;
  const rad2 = ((theta1Deg + theta2Deg) * Math.PI) / 180;

  const posX = (l1 * Math.cos(rad1) + l2 * Math.cos(rad2)).toFixed(1);
  const posY = (l1 * Math.sin(rad1) + l2 * Math.sin(rad2)).toFixed(1);
  const maxReach = (l1 + l2).toFixed(0);
  const currentRadius = Math.sqrt(Math.pow(parseFloat(posX), 2) + Math.pow(parseFloat(posY), 2)).toFixed(1);

  // Battery Energy & Run-Time:
  const voltMap = {
    "12v-3s": { volts: 11.1, cRating: 25 },
    "24v-6s": { volts: 22.2, cRating: 30 },
    "48v": { volts: 48.0, cRating: 20 }
  };
  const b = voltMap[batteryConfig] || voltMap["24v-6s"];
  const capacityAh = batteryMah / 1000;
  const wattHours = (capacityAh * b.volts).toFixed(1);

  const estPowerWatts = 65;
  const runTimeHours = ((parseFloat(wattHours) * 0.85) / estPowerWatts).toFixed(1);
  const maxContinuousAmps = (capacityAh * b.cRating).toFixed(0);

  res.innerHTML = `
    <div class="robo-spec-grid">
      <div class="robo-stat-card">
        <span class="label">End-Effector (X, Y)</span>
        <span class="value" style="color:var(--primary)">(${posX}, ${posY}) mm</span>
        <div class="hint">Radius: ${currentRadius} mm from base datum</div>
      </div>
      <div class="robo-stat-card">
        <span class="label">Max Envelope Reach</span>
        <span class="value">${maxReach} mm</span>
        <div class="hint">L1 (${l1}mm) + L2 (${l2}mm) fully extended</div>
      </div>
      <div class="robo-stat-card">
        <span class="label">Battery Energy</span>
        <span class="value">${wattHours} Wh</span>
        <div class="hint">${b.volts}V · ${batteryMah} mAh (${maxContinuousAmps}A max burst)</div>
      </div>
      <div class="robo-stat-card">
        <span class="label">Estimated Run-Time</span>
        <span class="value">~${runTimeHours} Hours</span>
        <div class="hint">At ~${estPowerWatts}W average mechanical load</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      🦾 <strong>Forward Kinematics:</strong> End effector position is computed via trigonometric joint angles &theta;1 (${theta1Deg}°) and &theta;2 (${theta2Deg}°). Avoid fully stretched singular positions (&theta;2 = 0°) where Jacobian determinant approaches zero and motor velocity requirements spike to infinity!<br>
      🔋 <strong>Battery Protection:</strong> Never discharge LiPo cells below <strong>3.3V per cell (19.8V for 6S)</strong>. Deep discharge permanently destroys lithium polymer cell chemistry.
    </div>
  `;
}

function renderRoboticsView() {
  updateRoboticsTorque();
  updateRoboticsDriver();
  updateRoboticsLinear();
  updateRoboticsKinematics();
}

// ============================================================
// 🚲 Bicycle Framebuilding & Wheel Building Calculations
// ============================================================
function copyBicycleSpecs() {
  const spokeText = $("#bike-spoke-result")?.innerText || "";
  const tensText = $("#bike-tension-result")?.innerText || "";
  const trailText = $("#bike-trail-result")?.innerText || "";
  const miterText = $("#bike-miter-result")?.innerText || "";
  const text = `🚲 BICYCLE FRAMEBUILDING & WHEELBUILDING SPEC SHEET\n\n${spokeText}\n\n${tensText}\n\n${trailText}\n\n${miterText}`;
  void navigator.clipboard.writeText(text).then(() => showToast("Copied Bicycle Specs to clipboard!"));
}

async function addBicycleSupplies() {
  await addMaterialToProjectShopping("DT Swiss Competition Double-Butted Spokes 2.0/1.8mm (Box of 72)", "1 box", 68.40, "Bicycle Components & Tubing");
}

function updateBicycleSpoke() {
  const erd = Math.max(200, parseFloat($("#bike-rim-erd")?.value) || 596.0);
  const holes = parseInt($("#bike-spoke-count")?.value, 10) || 32;
  const crosses = parseInt($("#bike-cross-pattern")?.value, 10) || 3;
  const dl = Math.max(10, parseFloat($("#bike-hub-dl")?.value) || 58.0);
  const dr = Math.max(10, parseFloat($("#bike-hub-dr")?.value) || 54.0);
  const wl = Math.max(5, parseFloat($("#bike-hub-wl")?.value) || 34.0);
  const wr = Math.max(5, parseFloat($("#bike-hub-wr")?.value) || 19.0);
  const res = $("#bike-spoke-result");
  if (!res) return;

  // Erdmann Spoke Length Formula:
  // L = sqrt( d^2 + (R - r*cos(alpha))^2 + (r*sin(alpha))^2 ) - S/2
  const sHole = 2.6;
  const R = erd / 2;
  const alphaRad = ((720 * crosses) / holes) * (Math.PI / 180);

  // Left side
  const rL = dl / 2;
  const termL1 = Math.pow(wl, 2);
  const termL2 = Math.pow(R - rL * Math.cos(alphaRad), 2);
  const termL3 = Math.pow(rL * Math.sin(alphaRad), 2);
  const rawSpokeLeft = Math.sqrt(termL1 + termL2 + termL3) - (sHole / 2);

  // Right side
  const rR = dr / 2;
  const termR1 = Math.pow(wr, 2);
  const termR2 = Math.pow(R - rR * Math.cos(alphaRad), 2);
  const termR3 = Math.pow(rR * Math.sin(alphaRad), 2);
  const rawSpokeRight = Math.sqrt(termR1 + termR2 + termR3) - (sHole / 2);

  const roundLeft = Math.round(rawSpokeLeft);
  const roundRight = Math.round(rawSpokeRight);

  res.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px">
      <span class="bike-badge">🎡 Left: ${rawSpokeLeft.toFixed(1)} mm (Buy ${roundLeft} mm)</span>
      <span class="bike-badge" style="background:rgba(245,158,11,0.12);color:#b45309;border-color:#f59e0b">Right: ${rawSpokeRight.toFixed(1)} mm (Buy ${roundRight} mm)</span>
    </div>

    <div class="bike-spec-grid">
      <div class="bike-stat-card">
        <span class="label">Non-Drive Left Spoke</span>
        <span class="value" style="color:var(--primary)">${roundLeft} mm</span>
        <div class="hint">Exact: ${rawSpokeLeft.toFixed(2)} mm (WL: ${wl}mm)</div>
      </div>
      <div class="bike-stat-card">
        <span class="label">Drive-Side Right Spoke</span>
        <span class="value">${roundRight} mm</span>
        <div class="hint">Exact: ${rawSpokeRight.toFixed(2)} mm (WR: ${wr}mm)</div>
      </div>
      <div class="bike-stat-card">
        <span class="label">Spoke Length Delta</span>
        <span class="value" style="font-size:13px">${Math.abs(rawSpokeLeft - rawSpokeRight).toFixed(1)} mm</span>
        <div class="hint">Cassette dish offset differential</div>
      </div>
      <div class="bike-stat-card">
        <span class="label">Lacing Geometry</span>
        <span class="value" style="font-size:13px">${crosses}-Cross (${holes} Spokes)</span>
        <div class="hint">&alpha; = ${((720 * crosses) / holes).toFixed(1)}° tangent angle</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      📏 <strong>Erdmann Formula:</strong> Accounts for true 3-dimensional triangulation from the hub flange plane to the rim bed. Round down to the nearest even integer if between sizes to ensure nipples do not bottom out on unthreaded spoke shank during high-tension trueing!
    </div>
  `;
}

function updateBicycleTension() {
  const targetDs = Math.max(50, parseFloat($("#bike-target-tension")?.value) || 120);
  const gauge = $("#bike-spoke-gauge")?.value || "double-butted";
  const wl = Math.max(5, parseFloat($("#bike-hub-wl")?.value) || 34.0);
  const wr = Math.max(5, parseFloat($("#bike-hub-wr")?.value) || 19.0);
  const res = $("#bike-tension-result");
  if (!res) return;

  const tensionRatio = wr / wl;
  const nonDriveTension = Math.round(targetDs * tensionRatio);

  const gaugeData = {
    plain14: { name: "14G Plain 2.0mm", stretchRate: "Low stretch • High stiffness", tm1Deflect: "21.5 Deflection reading" },
    "double-butted": { name: "Double-Butted 2.0/1.8/2.0mm", stretchRate: "Optimal elasticity • Extended fatigue life", tm1Deflect: "23.0 Deflection reading" },
    bladed: { name: "Bladed (Sapim CX-Ray)", stretchRate: "Cold-forged aero • High tensile", tm1Deflect: "16.0 Deflection reading (0.9x2.2mm)" }
  };

  const g = gaugeData[gauge] || gaugeData["double-butted"];

  res.innerHTML = `
    <div class="bike-spec-grid">
      <div class="bike-stat-card">
        <span class="label">Drive-Side Tension</span>
        <span class="value" style="color:var(--primary)">${targetDs} kgf</span>
        <div class="hint">Max target rim tension (~1177 N)</div>
      </div>
      <div class="bike-stat-card">
        <span class="label">Non-Drive Left Tension</span>
        <span class="value">${nonDriveTension} kgf</span>
        <div class="hint">${Math.round(tensionRatio * 100)}% of drive side tension</div>
      </div>
      <div class="bike-stat-card">
        <span class="label">Park Tool TM-1 Target</span>
        <span class="value" style="font-size:12px">${g.tm1Deflect}</span>
        <div class="hint">${g.name}</div>
      </div>
      <div class="bike-stat-card">
        <span class="label">Dish Elasticity</span>
        <span class="value" style="font-size:12px">${g.stretchRate}</span>
        <div class="hint">Prevents nipple loosening</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      ⚖️ <strong>Dishing Balance Physics:</strong> Because the cassette body pushes the drive-side flange inward (WR = ${wr}mm vs WL = ${wl}mm), the left spokes pull at a shallower angle. To center the rim over the frame axle datum, non-drive spokes must sit at <strong>~${nonDriveTension} kgf</strong>. Never overtension the left side or the rim will dish out of frame alignment!
    </div>
  `;
}

function updateBicycleTrail() {
  const headAngleDeg = parseFloat($("#bike-head-angle")?.value) || 72.5;
  const forkRakeMm = parseFloat($("#bike-fork-rake")?.value) || 45.0;
  const wheelRadiusMm = parseFloat($("#bike-wheel-radius")?.value) || 340.0;
  const res = $("#bike-trail-result");
  if (!res) return;

  const hRad = (headAngleDeg * Math.PI) / 180;

  // Mechanical Trail Formula:
  // Trail = (Rw * cos(H) - Rf) / sin(H)
  const trailMm = (wheelRadiusMm * Math.cos(hRad) - forkRakeMm) / Math.sin(hRad);

  // Wheel Flop Factor:
  // Flop = Trail * sin(H) * cos(H)
  const wheelFlopMm = trailMm * Math.sin(hRad) * Math.cos(hRad);

  let handling = "Neutral Road / All-Road Endurance";
  let handlingDesc = "Balanced high-speed stability without sluggish low-speed steering.";
  if (trailMm < 55) {
    handling = "Fast Criterium / Track Twitchy";
    handlingDesc = "Ultra-quick steering response; requires active rider attention at speed.";
  } else if (trailMm > 66) {
    handling = "Gravel / Touring / MTB Stable";
    handlingDesc = "Self-centering directional stability; resists rock deflection on rough terrain.";
  }

  res.innerHTML = `
    <div class="bike-spec-grid">
      <div class="bike-stat-card">
        <span class="label">Mechanical Trail</span>
        <span class="value" style="color:var(--primary)">${trailMm.toFixed(1)} mm</span>
        <div class="hint">${handling}</div>
      </div>
      <div class="bike-stat-card">
        <span class="label">Wheel Flop Factor</span>
        <span class="value">${wheelFlopMm.toFixed(1)} mm</span>
        <div class="hint">Tendency to lean into turns</div>
      </div>
      <div class="bike-stat-card">
        <span class="label">Head Tube Angle (H)</span>
        <span class="value">${headAngleDeg}°</span>
        <div class="hint">Fork Offset: ${forkRakeMm} mm</div>
      </div>
      <div class="bike-stat-card">
        <span class="label">Wheel Diameter Ref</span>
        <span class="value">${(wheelRadiusMm * 2).toFixed(0)} mm</span>
        <div class="hint">Effective rolling tire diameter</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      📐 <strong>Trail Dynamics:</strong> Mechanical trail is the tire contact patch castor offset behind the steering axis projection. <strong>${handling}:</strong> ${handlingDesc}<br>
      🚲 <strong>The Rake Paradox:</strong> INCREASING fork rake DECREASES mechanical trail, making steering quicker and lighter. Decreasing fork rake increases trail and directional stability!
    </div>
  `;
}

function updateBicycleMiter() {
  const junction = $("#bike-tube-junction")?.value || "down-bb";
  const alloy = $("#bike-tube-material")?.value || "4130";
  const res = $("#bike-miter-result");
  if (!res) return;

  const junctionData = {
    "down-bb": { name: "Down Tube to BB Shell", angle: "60.0°", cutterDia: "40.0 mm (1-9/16\")", tubeOD: "31.8 mm (1-1/4\")", fishmouthDepth: "9.2 mm" },
    "top-head": { name: "Top Tube to Head Tube", angle: "73.0°", cutterDia: "36.0 mm (1-3/8\")", tubeOD: "28.6 mm (1-1/8\")", fishmouthDepth: "5.8 mm" },
    "seat-bb": { name: "Seat Tube to BB Shell", angle: "73.5°", cutterDia: "40.0 mm (1-9/16\")", tubeOD: "28.6 mm (1-1/8\")", fishmouthDepth: "5.6 mm" },
    "chain-bb": { name: "Chainstay to BB Shell", angle: "8.0° Flare", cutterDia: "40.0 mm (1-9/16\")", tubeOD: "22.2 mm Ovalized", fishmouthDepth: "3.4 mm" }
  };

  const alloyData = {
    "4130": { name: "4130 Seamless Chromoly", weldMethod: "TIG (ER70S-2) or Bronze Fillet Braze (Gasflux 56% Silver)" },
    columbus: { name: "Columbus Zona / Reynolds 853", weldMethod: "Silver Fillet Braze (Low heat prevents annealing thin butted zones)" },
    titanium: { name: "3Al-2.5V Grade 9 Titanium", weldMethod: "TIG with Argon Purge Box + Trailing Shield (Zero discolouration)" },
    aluminum: { name: "6061-T6 Aluminum", weldMethod: "TIG AC (4043/5356) + Post-weld Heat Treatment T4/T6 mandatory" }
  };

  const j = junctionData[junction] || junctionData["down-bb"];
  const a = alloyData[alloy] || alloyData["4130"];

  res.innerHTML = `
    <div class="bike-spec-grid">
      <div class="bike-stat-card">
        <span class="label">Mitering Cut Angle</span>
        <span class="value" style="color:var(--primary)">${j.angle}</span>
        <div class="hint">Tube notcher vise angle</div>
      </div>
      <div class="bike-stat-card">
        <span class="label">Hole Saw Cutter Dia</span>
        <span class="value">${j.cutterDia}</span>
        <div class="hint">Matches mating tube OD</div>
      </div>
      <div class="bike-stat-card">
        <span class="label">Fishmouth Cope Depth</span>
        <span class="value">${j.fishmouthDepth}</span>
        <div class="hint">On ${j.tubeOD} tubing</div>
      </div>
      <div class="bike-stat-card">
        <span class="label">Welding / Brazing</span>
        <span class="value" style="font-size:12px">${a.name}</span>
        <div class="hint">${a.weldMethod}</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      🪵 <strong>Framebuilder Precision:</strong> Tubing copes must achieve zero gap (&lt; 0.1 mm light check) prior to tacking. Large fitment gaps cause intense angular distortion from weld puddle shrink tension, pulling frame alignment out of plane!
    </div>
  `;
}

function renderBicycleView() {
  updateBicycleSpoke();
  updateBicycleTension();
  updateBicycleTrail();
  updateBicycleMiter();
}

// scratch/studio_code.js
// Standalone JavaScript functions for Candle, Perfume, Letter, Epoxy, Silicone, and Jewelry Studios

// ============================================================
// 🕯️ Candle Making Studio Calculations & Handlers
// ============================================================
function updateCandleCalc() {
  const waxType = $("#candle-wax-type")?.value || "soy_464";
  const vesselMode = $("#candle-vessel-mode")?.value || "volume";
  const volUnit = $("#candle-vol-unit")?.value || "ml";
  const count = Math.max(1, parseInt($("#candle-count")?.value, 10) || 1);
  const rawFrag = parseFloat($("#candle-fragrance-pct")?.value);
  const fragPct = Number.isFinite(rawFrag) && rawFrag >= 0 ? rawFrag : 9.0;
  const res = $("#candle-calc-result");
  if (!res) return;

  const lblVol = $("#candle-lbl-vol");
  const lblDim1 = $("#candle-lbl-dim1");
  const lblDim2 = $("#candle-lbl-dim2");

  if (vesselMode === "dimensions") {
    if (lblVol) lblVol.style.display = "none";
    if (lblDim1) lblDim1.style.display = "block";
    if (lblDim2) lblDim2.style.display = "block";
  } else {
    if (lblVol) lblVol.style.display = "block";
    if (lblDim1) lblDim1.style.display = "none";
    if (lblDim2) lblDim2.style.display = "none";
  }

  let waterMl = 240;
  let diaIn = 3.0;
  if (vesselMode === "dimensions") {
    diaIn = Math.max(1.0, parseFloat($("#candle-dim-dia")?.value) || 3.0);
    const hgtIn = Math.max(1.0, parseFloat($("#candle-dim-hgt")?.value) || 3.5);
    const rIn = diaIn / 2;
    // Fill to 88% to leave 1/2 inch headspace
    waterMl = Math.PI * Math.pow(rIn, 2) * (hgtIn * 0.88) * 16.3871;
  } else {
    const rawVal = Math.max(10, parseFloat($("#candle-vessel-vol")?.value) || 240);
    waterMl = volUnit === "oz" ? rawVal * 29.5735 : rawVal;
    diaIn = (Math.sqrt(waterMl / (Math.PI * 3.5 * 16.3871)) * 2) || 2.8;
  }

  const waxDensity = (waxType === "gel") ? 0.90 : (waxType === "beeswax") ? 0.88 : 0.86;
  const singleWaxG = waterMl * waxDensity;
  const totalWaxG = singleWaxG * count;
  const fragranceG = totalWaxG * (fragPct / 100);
  const totalBatchG = totalWaxG + fragranceG;

  const waxOz = (totalWaxG / 28.3495).toFixed(2);
  const fragranceOz = (fragranceG / 28.3495).toFixed(2);
  const totalBatchOz = (totalBatchG / 28.3495).toFixed(2);

  const guide = {
    soy_464: { meltF: "185°F (85°C)", foF: "180°F − 185°F (82°C − 85°C)", pourF: "135°F (57°C)", maxFo: 10, cureDays: 14, name: "Golden Wax 464 Soy", desc: "Pour slushy/cloudy at 135°F to ensure smooth tops and prevent frosting." },
    soy_444: { meltF: "185°F (85°C)", foF: "180°F (82°C)", pourF: "140°F (60°C)", maxFo: 10, cureDays: 14, name: "Golden Wax 444 Soy", desc: "Higher melt point for warm climates; pour at 140°F." },
    coconut_soy: { meltF: "175°F (79°C)", foF: "170°F (77°C)", pourF: "125°F − 130°F (52°C − 54°C)", maxFo: 12, cureDays: 10, name: "Coconut / Soy Blend", desc: "Superior glass adhesion and single-pour mirror smooth finish." },
    beeswax: { meltF: "165°F (74°C)", foF: "160°F (71°C)", pourF: "155°F − 160°F (68°C − 71°C)", maxFo: 8, cureDays: 7, name: "100% Pure Beeswax", desc: "Pre-heat glass containers to 100°F before pouring to prevent deep crack sinkholes." },
    paraffin: { meltF: "190°F (88°C)", foF: "185°F (85°C)", pourF: "165°F − 170°F (74°C − 77°C)", maxFo: 10, cureDays: 3, name: "Paraffin Container IGI 4630", desc: "Maximum scent throw; cool slowly at room temperature away from drafts." },
    gel: { meltF: "215°F (102°C)", foF: "200°F (93°C)", pourF: "190°F (88°C)", maxFo: 6, cureDays: 1, name: "Penreco Gel Wax", desc: "Use only dense non-polar fragrance oils with flash point >170°F." }
  }[waxType] || { meltF: "185°F", foF: "180°F", pourF: "135°F", maxFo: 10, cureDays: 14, name: "Soy Wax", desc: "" };

  const isOverload = fragPct > guide.maxFo;
  const loadAlert = isOverload ? `
    <div class="resin-exotherm-alert resin-alert-warn" style="margin-top:8px">
      <span>⚠️</span>
      <div>
        <strong>FRAGRANCE SATURATION WARNING:</strong> ${fragPct}% exceeds the maximum recommended load (${guide.maxFo}%) for ${guide.name}. Excess fragrance will weep, sweat to the top surface, and create flare-up fire hazards!
      </div>
    </div>
  ` : "";

  res.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:8px">
      <div class="jewelry-stat-card">
        <span class="label">Total Wax Flakes</span>
        <span class="value" style="color:var(--primary)">${Math.round(totalWaxG)} g</span>
        <div class="hint">${waxOz} oz (${Math.round(singleWaxG)}g per jar)</div>
      </div>
      <div class="jewelry-stat-card">
        <span class="label">Fragrance Oil (${fragPct}%)</span>
        <span class="value" style="color:#d97706">${fragranceG.toFixed(1)} g</span>
        <div class="hint">${fragranceOz} oz total oil weight</div>
      </div>
      <div class="jewelry-stat-card">
        <span class="label">Total Batch Weight</span>
        <span class="value">${Math.round(totalBatchG)} g</span>
        <div class="hint">${totalBatchOz} oz for ${count} candle${count > 1 ? "s" : ""}</div>
      </div>
      <div class="jewelry-stat-card">
        <span class="label">Target Pour Temp</span>
        <span class="value" style="color:#059669">${guide.pourF}</span>
        <div class="hint">Melt to ${guide.meltF}</div>
      </div>
    </div>

    ${loadAlert}

    <div style="margin-top:10px;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px;font-size:11px;line-height:1.5">
      <strong>🔥 Thermal Process Milestones for ${guide.name}:</strong><br>
      • <strong>Melt Step:</strong> Heat wax flakes slowly in double boiler up to <strong>${guide.meltF}</strong>.<br>
      • <strong>Fragrance Addition:</strong> Remove from heat and stir in fragrance oil at <strong>${guide.foF}</strong>. Stir gently and continuously for <strong>2 full minutes</strong> to chemically bond oil with wax molecules.<br>
      • <strong>Pouring:</strong> Allow wax to cool undisturbed until it reaches <strong>${guide.pourF}</strong>, then pour into pre-wicked containers in a smooth, steady stream.<br>
      • <em>Tip: ${guide.desc}</em>
    </div>
  `;
}

function updateCandleWick() {
  const diaKey = $("#candle-wick-dia")?.value || "medium";
  const family = $("#candle-wick-family")?.value || "cd";
  const res = $("#candle-wick-result");
  if (!res) return;

  const wickData = {
    small: {
      cd: { rec: "CD 3 − CD 4", pool: "2.0\" − 2.4\"", burn: "25 − 30 hrs", note: "Curled flame structure prevents carbon ball mushrooming." },
      eco: { rec: "ECO 1 − ECO 2", pool: "2.0\" − 2.3\"", burn: "26 − 32 hrs", note: "Self-trimming braided cotton with paper core." },
      cotton: { rec: "Premier 710 / HTP 41", pool: "2.1\" − 2.5\"", burn: "24 − 28 hrs", note: "Consistent flame with low sooting." },
      wood: { rec: "Single Wood 0.02\" × 0.375\"", pool: "2.2\" − 2.5\"", burn: "20 − 25 hrs", note: "Soft ambient crackle; trim char to 1/8\" before each burn." }
    },
    medium: {
      cd: { rec: "CD 12 − CD 14", pool: "2.6\" − 3.0\"", burn: "40 − 50 hrs", note: "Ideal standard for 8 oz amber glass jars and rocks tumblers." },
      eco: { rec: "ECO 6 − ECO 8", pool: "2.7\" − 3.0\"", burn: "42 − 52 hrs", note: "Burns cleanly with heavy fragrance loads up to 10%." },
      cotton: { rec: "Premier 755 / HTP 83", pool: "2.6\" − 2.9\"", burn: "40 − 48 hrs", note: "Stable round melt pool without smoking." },
      wood: { rec: "Booster Wood Wick 0.03\" × 0.50\"", pool: "2.8\" − 3.1\"", burn: "35 − 42 hrs", note: "Booster strip maintains steady flame in viscous soy waxes." }
    },
    large: {
      cd: { rec: "CD 18 − CD 20 (or Double CD 4 × 2)", pool: "3.1\" − 3.5\"", burn: "55 − 65 hrs", note: "For containers >3.25\", double-wicking provides a far more uniform melt pool." },
      eco: { rec: "ECO 10 − ECO 12 (or Double ECO 2 × 2)", pool: "3.1\" − 3.5\"", burn: "55 − 68 hrs", note: "Single large wick may flicker; dual wicks prevent off-center tunneling." },
      cotton: { rec: "HTP 105 (or Double HTP 52 × 2)", pool: "3.2\" − 3.5\"", burn: "50 − 60 hrs", note: "High-temperature paper filament resists high FO drag." },
      wood: { rec: "Dual Wood Wicks 0.03\" × 0.375\" (spaced 1.5\" apart)", pool: "3.2\" − 3.6\"", burn: "45 − 55 hrs", note: "Spaced dual wood wicks prevent cool zones at container edge." }
    },
    extra_large: {
      cd: { rec: "Double-Wick CD 6-8 × 2 or Triple-Wick CD 4 × 3", pool: "3.6\" − 4.5\"", burn: "70 − 90 hrs", note: "CRITICAL: A single wick CANNOT pool a 4\" bowl without burning the center too deep!" },
      eco: { rec: "Triple-Wick ECO 2 × 3 (Equilateral triangle layout)", pool: "3.8\" − 4.5\"", burn: "75 − 95 hrs", note: "Space wicks 1.25\" from edges and 1.5\" apart from each other." },
      cotton: { rec: "Triple HTP 41 × 3", pool: "3.7\" − 4.4\"", burn: "70 − 90 hrs", note: "Prevents glass thermal fracture by distributing heat load evenly." },
      wood: { rec: "Triple Wood Wicks 0.02\" × 0.50\" × 3", pool: "3.8\" − 4.5\"", burn: "60 − 75 hrs", note: "Creates an expansive multi-crackling hearth glow." }
    }
  };

  const item = wickData[diaKey]?.[family] || wickData.medium.cd;

  res.innerHTML = `
    <div class="jewelry-spec-grid">
      <div class="jewelry-stat-card">
        <span class="label">Recommended Wick Model</span>
        <span class="value" style="color:var(--primary);font-size:14px">${item.rec}</span>
        <div class="hint">${family.toUpperCase()} Wick Family</div>
      </div>
      <div class="jewelry-stat-card">
        <span class="label">Target Melt Pool</span>
        <span class="value">${item.pool}</span>
        <div class="hint">1/4" to 1/2" depth in 2−3 hrs</div>
      </div>
      <div class="jewelry-stat-card">
        <span class="label">Estimated Burn Life</span>
        <span class="value">${item.burn}</span>
        <div class="hint">Based on 4-hour burn cycles</div>
      </div>
      <div class="jewelry-stat-card">
        <span class="label">Wick Placement Tip</span>
        <span class="value" style="font-size:12px">Centered &amp; Taut</span>
        <div class="hint">Use wick centering collar</div>
      </div>
    </div>
    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      ℹ️ <strong>Wick Science:</strong> ${item.note}<br>
      📏 <strong>Pre-Trim Rule:</strong> Always trim cotton wicks to <strong>1/4" (6 mm)</strong> and wood wicks to <strong>1/8" (3 mm)</strong> before every lighting. An untrimmed wick creates flame flare and carbon soot.
    </div>
  `;
}

function updateCandleCure() {
  const container = $("#candle-cure-benchmark");
  const testRes = $("#candle-burn-test-result");
  if (!container) return;

  const currentWax = $("#candle-wax-type")?.value || "soy_464";

  const cureProfiles = [
    { id: "soy_464", name: "Soy Wax (464/444)", days: "10 − 14 Days", icon: "🌱", hint: "Locks polymorphic crystal matrix for max hot throw." },
    { id: "coconut_soy", name: "Coconut / Soy", days: "7 − 10 Days", icon: "🥥", hint: "Faster maturation; smooth tops with high scent release." },
    { id: "beeswax", name: "Pure Beeswax", days: "7 Days", icon: "🐝", hint: "Settles natural honey aroma and hardens contraction." },
    { id: "paraffin", name: "Paraffin (4630)", days: "2 − 3 Days", icon: "⚡", hint: "Rapid crystalline structure; quick turnaround for markets." }
  ];

  container.innerHTML = cureProfiles.map(p => `
    <div class="candle-cure-card ${currentWax === p.id || (currentWax.includes('soy') && p.id.includes('soy')) ? 'active-cure' : ''}">
      <span style="font-size:18px">${p.icon}</span>
      <div class="candle-cure-wax">${p.name}</div>
      <div class="candle-cure-days">${p.days}</div>
      <div class="candle-cure-hint">${p.hint}</div>
    </div>
  `).join("");

  if (testRes) {
    testRes.innerHTML = `
      <div style="font-size:12px;font-weight:700;color:var(--ink);margin-bottom:6px">🧪 4-Hour Test Burn Evaluation Checklist:</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:6px;font-size:11px;color:var(--ink-secondary)">
        <div>✅ <strong>Hour 2:</strong> Melt pool reaches rim edge (no tunneling ring).</div>
        <div>✅ <strong>Hour 3:</strong> Melt pool depth is between 1/4" and 1/2".</div>
        <div>✅ <strong>Hour 4:</strong> Steady flame (1" tall), no mushrooming or black smoke.</div>
        <div>✅ <strong>Exterior:</strong> Jar glass touch safe (&lt;140°F / 60°C).</div>
      </div>
    `;
  }
}

function updateCandleSafety() {
  const brand = $("#candle-label-brand")?.value || "Artisan Studio Workshop";
  const scent = $("#candle-label-scent")?.value || "Amber Woods & Lavender";
  const net = $("#candle-label-net")?.value || "8.0 oz (226 g)";
  const res = $("#candle-label-result");
  if (!res) return;

  res.innerHTML = `
    <div class="candle-caution-preview">
      <div class="candle-caution-header">
        <span class="candle-caution-icon">🔥</span>
        <span class="candle-caution-icon">🚸</span>
        <span class="candle-caution-icon">🛡️</span>
      </div>
      <div class="candle-caution-title" style="text-align:center">WARNING / ATTENTION</div>
      <div style="font-size:11px;font-weight:700;text-align:center;color:#dc2626;margin-bottom:6px">
        BURN WITHIN SIGHT • KEEP AWAY FROM FLAMMABLE OBJECTS • KEEP OUT OF REACH OF CHILDREN &amp; PETS
      </div>
      <ul class="candle-caution-rules">
        <li><strong>Trim wick to 1/4 inch (6 mm)</strong> before each lighting.</li>
        <li>Burn candle only on a flat, level, heat-resistant surface.</li>
        <li>Do not burn for more than <strong>4 hours</strong> at a time.</li>
        <li>Keep wax pool free of wick trimmings, matches, and debris.</li>
        <li>Discontinue use when only <strong>1/2 inch (12 mm)</strong> of wax remains at the bottom.</li>
      </ul>
      <div class="candle-caution-brand">
        <strong>${escapeHTML(scent)}</strong> • ${escapeHTML(net)}<br>
        Handcrafted by ${escapeHTML(brand)}
      </div>
    </div>
  `;
}

// scratch/distill_code.js
// Standalone logic for Botanical Distillation, Essential Oils & Herbal Extracts Studio

const DISTILL_STORAGE_KEY = "workbench_distill_runs";

function getDistillRuns() {
  try {
    const raw = localStorage.getItem(DISTILL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDistillRuns(runs) {
  try {
    localStorage.setItem(DISTILL_STORAGE_KEY, JSON.stringify(runs));
  } catch {}
}

function updateSteamDistillCalc() {
  const botanical = $("#distill-botanical-select")?.value || "lavender";
  const harvestState = $("#distill-harvest-state")?.value || "dry";
  const plantWeightG = Math.max(10, parseFloat($("#distill-plant-weight")?.value) || 500);
  const stillType = $("#distill-still-type")?.value || "copper_alembic";
  const boilerLiters = Math.max(0.2, parseFloat($("#distill-boiler-liters")?.value) || 3.0);
  const res = $("#distill-steam-result");
  if (!res) return;

  const customYieldLbl = $("#distill-lbl-custom-yield");
  let yieldPct = 2.2;
  let botanicalName = "Lavender Buds";
  let chemProfile = "Linalool & Linalyl acetate";
  let noteClass = "Top-Heart Note";
  let oilDensity = 0.89; // g/ml
  let separatorBehavior = "Floats on water (Specific gravity 0.89 < 1.0)";

  if (botanical === "custom") {
    if (customYieldLbl) customYieldLbl.style.display = "block";
    yieldPct = Math.max(0.01, parseFloat($("#distill-custom-yield")?.value) || 1.5);
    botanicalName = "Custom Botanical Material";
    chemProfile = "Terpenes & Aromatics";
    noteClass = "Volatile Essence";
  } else {
    if (customYieldLbl) customYieldLbl.style.display = "none";
    const botanicals = {
      lavender: { name: "Lavender Buds (Lavandula angustifolia)", yield: 2.2, note: "Top-Heart Note", chem: "Linalool & Linalyl acetate", density: 0.89, sep: "Floats on top of hydrosol in essencier" },
      peppermint: { name: "Peppermint Leaves (Mentha piperita)", yield: 1.3, note: "Top Note", chem: "Menthol & Menthone", density: 0.90, sep: "Floats; cool coolant ensures crystalline menthol doesn't clog" },
      rosemary: { name: "Rosemary Leaves (Salvia rosmarinus)", yield: 1.5, note: "Top-Heart Note", chem: "1,8-Cineole & Camphor", density: 0.91, sep: "Floats; collect first 45 min for fresh green cineole notes" },
      eucalyptus: { name: "Eucalyptus Leaves (Eucalyptus globulus)", yield: 2.0, note: "Top Note", chem: "Eucalyptol (Cineole)", density: 0.91, sep: "Floats on hydrosol; high volatile steam carryover" },
      citrus_peel: { name: "Sweet Orange / Lemon Peel (Citrus sinensis)", yield: 1.0, note: "Top Note", chem: "d-Limonene", density: 0.85, sep: "Floats; light density, fast separation in Florentine receiver" },
      frankincense: { name: "Frankincense Tears (Boswellia carterii)", yield: 5.5, note: "Base Note", chem: "Alpha-pinene & Incensole", density: 0.88, sep: "Hydro-distillation required (submerge crushed resin in water)" },
      rose: { name: "Damask Rose Petals (Rosa damascena)", yield: 0.035, note: "Heart Note", chem: "Citronellol & Geraniol", density: 0.86, sep: "Forms thin golden surface sheen (Rose Otto); high value in rose water hydrosol" },
      chamomile: { name: "German Chamomile (Matricaria chamomilla)", yield: 0.6, note: "Heart-Base Note", chem: "Chamazulene (Striking deep sapphire blue!)", density: 0.93, sep: "Dark cobalt blue oil drops collect on receiver surface" },
      tea_tree: { name: "Tea Tree (Melaleuca alternifolia)", yield: 1.8, note: "Top-Heart Note", chem: "Terpinen-4-ol", density: 0.90, sep: "Floats cleanly on medicinal tea tree hydrosol" }
    };
    const b = botanicals[botanical] || botanicals.lavender;
    yieldPct = b.yield;
    botanicalName = b.name;
    chemProfile = b.chem;
    noteClass = b.note;
    oilDensity = b.density;
    separatorBehavior = b.sep;
  }

  // Effective dry mass calculation: fresh herb has ~70% water weight
  const isFresh = harvestState === "fresh";
  const effectiveG = isFresh ? plantWeightG * 0.35 : plantWeightG;

  const oilWeightG = effectiveG * (yieldPct / 100);
  const oilVolumeMl = oilWeightG / oilDensity;
  const oilDrops = Math.round(oilVolumeMl * 28);

  // Floral water hydrosol volume collected: ~1:1 with effective dry plant weight
  const hydrosolMl = Math.round(effectiveG * 1.1);

  // Minimum boiler water required: need 1.8x collected hydrosol to keep boiler safe
  const minBoilerLiters = (hydrosolMl * 1.8) / 1000;
  const isBoilerLow = boilerLiters < minBoilerLiters;

  const stillSpecs = {
    copper_alembic: { name: "Copper Alembic Still", tempTarget: "98°C − 100°C (208°F − 212°F)", coolantMax: "22°C (72°F)", note: "Copper ions chemically bind and neutralize harsh foul-smelling sulfur compounds, producing a sweet, floral, unblemished bouquet." },
    stainless_column: { name: "Stainless Steel Column Still", tempTarget: "99°C − 100°C", coolantMax: "20°C (68°F)", note: "Inert sanitary stainless steel with perforated botanical vapor basket. High hygiene, perfect for medicinal extracts and easy sanitization." },
    glass_clevenger: { name: "Borosilicate Glass Clevenger Still", tempTarget: "98°C − 100°C", coolantMax: "18°C (64°F)", note: "Laboratory standard with direct optical visualization of vapor condensate and calibrated return arm for exact micro-ml yield measurement." }
  }[stillType] || {};

  const boilerAlert = isBoilerLow ? `
    <div class="resin-exotherm-alert resin-alert-warn" style="margin-top:8px">
      <span>⚠️</span>
      <div>
        <strong>BOILER WATER CHARGE ALERT:</strong> Your ${boilerLiters} L water charge is too low for a ${plantWeightG}g run! You will collect ~${hydrosolMl} ml hydrosol. To prevent the boiler from running dry and scorching plant matter, fill boiler with at least <strong>${minBoilerLiters.toFixed(1)} Liters</strong> of distilled water.
      </div>
    </div>
  ` : "";

  res.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(150px, 1fr));gap:8px">
      <div class="jewelry-stat-card">
        <span class="label">Pure Essential Oil Yield</span>
        <span class="value" style="color:var(--primary)">${oilVolumeMl < 1 ? oilVolumeMl.toFixed(2) : oilVolumeMl.toFixed(1)} ml</span>
        <div class="hint">${oilWeightG.toFixed(2)} g (~ ${oilDrops} drops)</div>
      </div>
      <div class="jewelry-stat-card">
        <span class="label">Aromatic Hydrosol Output</span>
        <span class="value" style="color:#059669">${hydrosolMl} ml</span>
        <div class="hint">100% Pure Floral Water Distillate</div>
      </div>
      <div class="jewelry-stat-card">
        <span class="label">Primary Active Terpenes</span>
        <span class="value" style="font-size:12px;color:var(--ink)">${noteClass}</span>
        <div class="hint">${chemProfile}</div>
      </div>
      <div class="jewelry-stat-card">
        <span class="label">Distillation Duration</span>
        <span class="value" style="font-size:13px">45 − 90 mins</span>
        <div class="hint">Top vapor head @ ${stillSpecs.tempTarget}</div>
      </div>
    </div>

    ${boilerAlert}

    <div style="margin-top:10px;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px;font-size:11px;line-height:1.5">
      <strong>⚗️ Still Operations Protocol (${stillSpecs.name}):</strong><br>
      • <strong>Boiler Fill:</strong> Fill boiler with <strong>${boilerLiters} L</strong> of pure distilled water (never tap water to avoid mineral scale). Ensure water level stays below the perforated botanical basket (true steam distillation).<br>
      • <strong>Packing:</strong> Pack ${plantWeightG}g of ${botanicalName} evenly into the vapor chamber. Do not over-compress or steam will channel through paths of least resistance.<br>
      • <strong>Condenser Coolant:</strong> Run cold water through condenser jacket. Coolant outlet water must stay below <strong>${stillSpecs.coolantMax}</strong> to prevent volatile oil vapor escape into the air.<br>
      • <strong>Essencier Separation:</strong> ${separatorBehavior}. Drain floral hydrosol from bottom valve while retaining the floating essential oil layer in the separator neck.<br>
      • <em>Alembic Advantage: ${stillSpecs.note}</em>
    </div>
  `;
}

function updateSolventExtractCalc() {
  const mode = $("#distill-extract-mode")?.value || "tincture_50";
  const marcG = Math.max(5, parseFloat($("#distill-marc-grams")?.value) || 100);
  const ratio = $("#distill-marc-ratio")?.value || "1:5";
  const res = $("#distill-extract-result");
  if (!res) return;

  let mult = 5;
  if (ratio === "1:2") mult = 2;
  else if (ratio === "1:4") mult = 4;
  else if (ratio === "1:5") mult = 5;
  else if (ratio === "1:8") mult = 8;
  else if (ratio === "1:10") mult = 10;

  const solventMl = marcG * mult;
  const recoveredMl = Math.round(solventMl * 0.82); // 82% recovered after pressing

  const modeData = {
    tincture_50: {
      name: "50% ABV (100 Proof) Tincture",
      macerateDays: "14 − 28 Days",
      affinity: "Balanced universal solvent (dissolves both water-soluble saponins/tannins and alcohol-soluble essential oils).",
      pressTip: "Shake amber mason jar daily for 21 days; press marc with stainless potato ricer or fruit press."
    },
    tincture_70: {
      name: "70% ABV (140 Proof) Tincture",
      macerateDays: "14 − 21 Days",
      affinity: "High-affinity for botanical alkaloids, volatile terpenes, and antimicrobial compounds (Propolis, Echinacea).",
      pressTip: "Keeps indefinitely at room temperature; 100% self-preserving."
    },
    tincture_95: {
      name: "95% ABV (190 Proof Everclear) Tincture",
      macerateDays: "7 − 14 Days",
      affinity: "Specialized for tree resins, myrrh, frankincense, propolis, and essential oil extraction.",
      pressTip: "Too high in alcohol for direct ingestion; ideal for perfumery concentrates or compounding."
    },
    oil_maceration: {
      name: "Infused Botanical Carrier Oil",
      macerateDays: "28 − 42 Days (or 4 hrs @ 45°C)",
      affinity: "Extracts fat-soluble vitamins, carotenoids, and lipophilic herbal aromatics (Calendula, Arnica, St. John's Wort).",
      pressTip: "Add 0.2% Vitamin E (Tocopherol) as natural antioxidant to prevent oil rancidity."
    },
    glycerite: {
      name: "Vegetable Glycerite (Alcohol-Free)",
      macerateDays: "28 − 35 Days",
      affinity: "65% Food-Grade Vegetable Glycerin + 35% Distilled Water. Safe for children and individuals avoiding alcohol.",
      pressTip: "Viscous liquid; shake vigorously twice daily to disperse herbal marc."
    }
  }[mode] || {};

  res.innerHTML = `
    <div class="jewelry-spec-grid">
      <div class="jewelry-stat-card">
        <span class="label">Required Solvent Volume</span>
        <span class="value" style="color:var(--primary)">${solventMl} ml</span>
        <div class="hint">${ratio} ratio on ${marcG}g herb marc</div>
      </div>
      <div class="jewelry-stat-card">
        <span class="label">Projected Finished Extract</span>
        <span class="value" style="color:#059669">${recoveredMl} ml</span>
        <div class="hint">~82% yield after pressing marc</div>
      </div>
      <div class="jewelry-stat-card">
        <span class="label">Maceration Duration</span>
        <span class="value" style="font-size:13px">${modeData.macerateDays}</span>
        <div class="hint">${modeData.name}</div>
      </div>
      <div class="jewelry-stat-card">
        <span class="label">Storage Bottle</span>
        <span class="value" style="font-size:13px">Amber Dropper Glass</span>
        <div class="hint">UV protection keeps potency</div>
      </div>
    </div>
    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      🌿 <strong>Extraction Chemistry:</strong> ${modeData.affinity}<br>
      📦 <strong>Pressing &amp; Filtering:</strong> ${modeData.pressTip}
    </div>
  `;
}

function updateAlcoholDilutionCalc() {
  const startAbv = Math.min(100, Math.max(1, parseFloat($("#distill-start-abv")?.value) || 95));
  const targetAbv = Math.min(100, Math.max(1, parseFloat($("#distill-target-abv")?.value) || 50));
  const targetVol = Math.max(50, parseFloat($("#distill-target-volume")?.value) || 500);
  const res = $("#distill-dilution-result");
  if (!res) return;

  if (targetAbv >= startAbv) {
    res.innerHTML = `
      <div class="resin-exotherm-alert resin-alert-warn" style="margin-top:4px">
        <span>⚠️</span>
        <div>
          <strong>INVALID DILUTION TARGET:</strong> Target ABV (${targetAbv}%) must be strictly lower than starting spirit ABV (${startAbv}%). Water only dilutes alcohol; it cannot raise proof.
        </div>
      </div>
    `;
    return;
  }

  // Pearson's Square: C1 * V1 = C2 * V2
  const rawAlcoholMl = (targetAbv / startAbv) * targetVol;
  const rawWaterMl = targetVol - rawAlcoholMl;

  // Molecular volume contraction of ethanol and water mixing (~3.2%)
  const compWaterMl = rawWaterMl * 1.032;

  res.innerHTML = `
    <div class="jewelry-spec-grid">
      <div class="jewelry-stat-card">
        <span class="label">High-Proof Spirit (${startAbv}%)</span>
        <span class="value" style="color:#d97706">${Math.round(rawAlcoholMl)} ml</span>
        <div class="hint">${(rawAlcoholMl / 29.5735).toFixed(1)} fl oz spirit</div>
      </div>
      <div class="jewelry-stat-card">
        <span class="label">Distilled Water (+Contraction)</span>
        <span class="value" style="color:var(--primary)">${Math.round(compWaterMl)} ml</span>
        <div class="hint">Compensates for 3.2% volume shrinkage</div>
      </div>
      <div class="jewelry-stat-card">
        <span class="label">Finished Extract Base</span>
        <span class="value">${targetVol} ml</span>
        <div class="hint">Exact ${targetAbv}% ABV (${targetAbv * 2} Proof)</div>
      </div>
    </div>
    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      📐 <strong>Pearson's Square Physics:</strong> Ethanol and water molecules form tight hydrogen bonds that pull together, shrinking the combined liquid by <strong>~3.2%</strong>. Adding ${Math.round(compWaterMl)} ml of water compensates for this contraction so your final volume is exactly ${targetVol} ml at ${targetAbv}% ABV.
    </div>
  `;
}

function updateHydrosolPreservation() {
  const hydroType = $("#distill-hydrosol-type")?.value || "lavender";
  const method = $("#distill-preservation-method")?.value || "refrigeration";
  const res = $("#distill-preservation-result");
  if (!res) return;

  const hydroData = {
    lavender: { ph: "pH 4.1 − 4.5", shelf: "6 − 12 months", benefits: "Calming skin toner, sunburn relief, linen bedtime mist" },
    rose: { ph: "pH 4.6 − 5.0", shelf: "8 − 14 months", benefits: "Anti-inflammatory, balances skin microbiome, luxurious hydration" },
    peppermint: { ph: "pH 4.2 − 4.6", shelf: "6 − 10 months", benefits: "Invigorating cooling mist, pores tightening, hot flash relief" },
    chamomile: { ph: "pH 4.0 − 4.4", shelf: "6 − 12 months", benefits: "Gentle eye compress, eczema soothing, sensitive baby skin care" }
  }[hydroType] || {};

  const methodData = {
    refrigeration: {
      name: "Refrigerated Dark Storage (4°C)",
      life: "6 − 9 Months",
      protocol: "Store in sterile dark amber or cobalt blue bottles with zero headspace. Always keep refrigerated between uses. Discard if liquid becomes hazy or cloudy."
    },
    leucidal: {
      name: "Natural Eco-Preservative (Leucidal / Geogard ECT)",
      life: "12 − 18 Months (Room Temp)",
      protocol: "Add 1.0% (1g per 100ml) Leucidal Liquid SF Max or Geogard ECT. Broad-spectrum protection against yeast, mold, and bacteria. Safe for facial cosmetics."
    },
    alcohol_fortified: {
      name: "12% Neutral Grain Spirit Fortification",
      life: "18+ Months Shelf Stable",
      protocol: "Add 12.5 ml of 95% neutral grain alcohol to every 87.5 ml of hydrosol. Self-preserving facial spritz that naturally evaporates cleanly from skin."
    }
  }[method] || {};

  res.innerHTML = `
    <div class="jewelry-spec-grid">
      <div class="jewelry-stat-card">
        <span class="label">Natural Acidity Benchmark</span>
        <span class="value" style="color:var(--primary)">${hydroData.ph}</span>
        <div class="hint">Naturally acidic antimicrobial barrier</div>
      </div>
      <div class="jewelry-stat-card">
        <span class="label">Expected Shelf Life</span>
        <span class="value" style="color:#059669">${methodData.life}</span>
        <div class="hint">${methodData.name}</div>
      </div>
    </div>
    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      🌿 <strong>Therapeutic Applications:</strong> ${hydroData.benefits}.<br>
      🛡️ <strong>Sterility Protocol:</strong> ${methodData.protocol}<br>
      🔬 <strong>Sterile Micro-Filtration:</strong> For commercial grade clarity, pass fresh distillate through a <strong>0.22 micron syringe filter</strong> to eliminate any trace spores.
    </div>
  `;
}

function renderDistillationRuns() {
  const container = $("#distill-log-result");
  if (!container) return;

  const runs = getDistillRuns();
  if (runs.length === 0) {
    container.innerHTML = `
      <div style="font-size:12px;color:var(--muted);text-align:center;padding:12px">
        No distillation runs recorded yet. Click "Record Run to Journal" above to log your first harvest!
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(240px, 1fr));gap:8px">
      ${runs.map((r, idx) => `
        <div class="mohs-stone-card">
          <div class="mohs-stone-top">
            <span class="mohs-stone-name">${escapeHTML(r.name)}</span>
            <span class="badge" style="font-size:10px;background:var(--surface-sunken);border:1px solid var(--border);padding:2px 6px;border-radius:10px">${escapeHTML(r.date)}</span>
          </div>
          <div style="font-size:11px;color:var(--primary);font-weight:700">${escapeHTML(r.yield)}</div>
          <div class="mohs-stone-rule">${escapeHTML(r.notes)}</div>
          <div style="display:flex;justify-content:flex-end;margin-top:4px">
            <button type="button" class="button button-small button-outline" style="font-size:10px;padding:1px 6px" data-action="delete-distill-run" data-index="${idx}">Delete</button>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function saveDistillationRun() {
  const name = $("#distill-run-name")?.value || "Botanical Run";
  const dateInput = $("#distill-run-date");
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split("T")[0];
  }
  const date = dateInput?.value || new Date().toISOString().split("T")[0];
  const source = $("#distill-run-source")?.value || "Harvest notes";

  const plantWeightG = $("#distill-plant-weight")?.value || "500";
  const botSelect = $("#distill-botanical-select option:checked")?.textContent.split("(")[0].trim() || "Lavender";

  const runs = getDistillRuns();
  runs.unshift({
    name,
    date,
    yield: `${plantWeightG}g ${botSelect}`,
    notes: source
  });
  saveDistillRuns(runs);
  renderDistillationRuns();
  if (typeof showToast === "function") showToast(`Logged distillation run: ${name}`);
}

function deleteDistillationRun(idx) {
  const runs = getDistillRuns();
  if (idx >= 0 && idx < runs.length) {
    runs.splice(idx, 1);
    saveDistillRuns(runs);
    renderDistillationRuns();
    if (typeof showToast === "function") showToast("Distillation run removed from log.");
  }
}

function renderDistillationView() {
  updateSteamDistillCalc();
  updateSolventExtractCalc();
  updateAlcoholDilutionCalc();
  updateHydrosolPreservation();
  renderDistillationRuns();
}

function renderCandleView() {
  updateCandleCalc();
  updateCandleWick();
  updateCandleCure();
  updateCandleSafety();
}

// ============================================================
// 🌸 Perfume Making Studio Calculations & Handlers
// ============================================================
function updatePerfumeDilution() {
  const bottleSizeVal = $("#perfume-bottle-size")?.value || "50";
  const customInput = $("#perfume-lbl-custom-size");
  let bottleMl = 50;
  if (bottleSizeVal === "custom") {
    if (customInput) customInput.style.display = "block";
    bottleMl = Math.max(5, parseFloat($("#perfume-custom-size")?.value) || 50);
  } else {
    if (customInput) customInput.style.display = "none";
    bottleMl = parseFloat(bottleSizeVal) || 50;
  }

  const concCat = $("#perfume-conc-category")?.value || "edp";
  const carrier = $("#perfume-carrier-type")?.value || "alcohol";
  const res = $("#perfume-dilution-result");
  if (!res) return;

  const concRates = {
    extrait: { pct: 25, label: "Extrait de Parfum", wear: "10 − 14+ hrs", oilDesc: "Pure Parfum" },
    edp: { pct: 18, label: "Eau de Parfum (EdP)", wear: "6 − 8 hrs", oilDesc: "Classic Standard" },
    edt: { pct: 10, label: "Eau de Toilette (EdT)", wear: "3 − 5 hrs", oilDesc: "Daywear Spray" },
    edc: { pct: 4, label: "Eau de Cologne (EdC)", wear: "2 hrs", oilDesc: "Light Citrus Splash" },
    fraiche: { pct: 2, label: "Eau Fraîche", wear: "1 hr", oilDesc: "Subtle Skin Mist" }
  };

  const item = concRates[concCat] || concRates.edp;
  const concentrateMl = (bottleMl * item.pct) / 100;
  const carrierMl = bottleMl - concentrateMl;

  // Drops approx 28 drops per ml
  const concDrops = Math.round(concentrateMl * 28);
  const carrierDrops = Math.round(carrierMl * 28);

  // Density: Essential Oil ~0.90 g/ml, Alcohol ~0.81 g/ml, Carrier oil ~0.92 g/ml
  const carrierDensity = carrier === "oil" ? 0.92 : 0.81;
  const concG = (concentrateMl * 0.90).toFixed(1);
  const carrierG = (carrierMl * carrierDensity).toFixed(1);
  const totalG = (parseFloat(concG) + parseFloat(carrierG)).toFixed(1);

  res.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:8px">
      <div class="jewelry-stat-card">
        <span class="label">Fragrance Concentrate (${item.pct}%)</span>
        <span class="value" style="color:#d97706">${concentrateMl.toFixed(1)} ml</span>
        <div class="hint">${concG} g (~ ${concDrops} drops)</div>
      </div>
      <div class="jewelry-stat-card">
        <span class="label">Carrier Solvent (${100 - item.pct}%)</span>
        <span class="value" style="color:var(--primary)">${carrierMl.toFixed(1)} ml</span>
        <div class="hint">${carrierG} g (${carrier === "oil" ? "Jojoba/FCO" : "SDA 40-B Alcohol"})</div>
      </div>
      <div class="jewelry-stat-card">
        <span class="label">Total Net Weight</span>
        <span class="value">${totalG} g</span>
        <div class="hint">Bottle Vol: ${bottleMl} ml</div>
      </div>
      <div class="jewelry-stat-card">
        <span class="label">Expected Longevity</span>
        <span class="value" style="color:#059669">${item.wear}</span>
        <div class="hint">${item.label}</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.45;margin-top:10px">
      🧪 <strong>Blending Guidance:</strong> Weigh materials with a 0.01g precision scale rather than volumetric pipettes for laboratory repeatability. Always dissolve pure aromatic oils into alcohol first before adding any distilled water (if blending hydroalcoholic formulations), to prevent clouding/louching.
    </div>
  `;

  updatePerfumePyramid();
}

function updatePerfumePyramid() {
  const topRange = parseInt($("#perfume-range-top")?.value, 10) || 25;
  const heartRange = parseInt($("#perfume-range-heart")?.value, 10) || 45;
  const baseRange = parseInt($("#perfume-range-base")?.value, 10) || 30;

  $("#perfume-val-top") && ($("#perfume-val-top").textContent = `${topRange}%`);
  $("#perfume-val-heart") && ($("#perfume-val-heart").textContent = `${heartRange}%`);
  $("#perfume-val-base") && ($("#perfume-val-base").textContent = `${baseRange}%`);

  const res = $("#perfume-pyramid-result");
  if (!res) return;

  // Concentrate volume from dilution panel
  const bottleSizeVal = $("#perfume-bottle-size")?.value || "50";
  const bottleMl = bottleSizeVal === "custom" ? (parseFloat($("#perfume-custom-size")?.value) || 50) : (parseFloat(bottleSizeVal) || 50);
  const concCat = $("#perfume-conc-category")?.value || "edp";
  const concPct = { extrait: 25, edp: 18, edt: 10, edc: 4, fraiche: 2 }[concCat] || 18;
  const totalConcMl = (bottleMl * concPct) / 100;

  const sumPct = topRange + heartRange + baseRange || 100;
  const normTop = topRange / sumPct;
  const normHeart = heartRange / sumPct;
  const normBase = baseRange / sumPct;

  const topMl = totalConcMl * normTop;
  const heartMl = totalConcMl * normHeart;
  const baseMl = totalConcMl * normBase;

  const topDrops = Math.round(topMl * 28);
  const heartDrops = Math.round(heartMl * 28);
  const baseDrops = Math.round(baseMl * 28);

  res.innerHTML = `
    <div class="perfume-pyramid-container">
      <div class="perfume-tier perfume-tier-top">
        <div>
          <div class="perfume-tier-name">🍋 TOP NOTES (HEAD) • ${Math.round(normTop * 100)}%</div>
          <div class="perfume-tier-meta">First Impression: 0 − 30 min • Citrus, Herbs, Light Aromatics</div>
        </div>
        <div class="perfume-tier-stats">
          <div class="perfume-tier-drops">${topMl.toFixed(2)} ml (${topDrops} drops)</div>
          <div style="font-size:10px;color:var(--ink-secondary)">${(topMl * 0.90).toFixed(2)} g</div>
        </div>
      </div>

      <div class="perfume-tier perfume-tier-heart">
        <div>
          <div class="perfume-tier-name">🌹 HEART NOTES (MID) • ${Math.round(normHeart * 100)}%</div>
          <div class="perfume-tier-meta">The Scent Identity: 30 min − 4 hrs • Florals, Spices, Green Leaves</div>
        </div>
        <div class="perfume-tier-stats">
          <div class="perfume-tier-drops">${heartMl.toFixed(2)} ml (${heartDrops} drops)</div>
          <div style="font-size:10px;color:var(--ink-secondary)">${(heartMl * 0.90).toFixed(2)} g</div>
        </div>
      </div>

      <div class="perfume-tier perfume-tier-base">
        <div>
          <div class="perfume-tier-name">🪵 BASE NOTES (DRYDOWN) • ${Math.round(normBase * 100)}%</div>
          <div class="perfume-tier-meta">The Fixative Anchor: 4 − 24+ hrs • Resins, Woods, Ambers, Vanillas</div>
        </div>
        <div class="perfume-tier-stats">
          <div class="perfume-tier-drops">${baseMl.toFixed(2)} ml (${baseDrops} drops)</div>
          <div style="font-size:10px;color:var(--ink-secondary)">${(baseMl * 0.90).toFixed(2)} g</div>
        </div>
      </div>
    </div>
  `;
}

function updatePerfumeIfra() {
  const ing = $("#perfume-ifra-ing")?.value || "bergamot";
  const res = $("#perfume-ifra-result");
  if (!res) return;

  const data = {
    bergamot: {
      status: "PHOTOTOXIC DERMAL RISK",
      limit: "Max 0.4% in finished cosmetics",
      safe: "Use Bergapten-Free FCF (Furanocoumarin-Free) Bergamot",
      desc: "Cold-pressed natural bergamot contains bergapten which chemically sensitizes skin to UV light, causing severe sunburn blisters and dark permanent hyperpigmentation. Always source steam-distilled or FCF grade."
    },
    oakmoss: {
      status: "SKIN ALLERGEN SENSITIZER",
      limit: "Max 0.1% (IFRA 49th Amendment)",
      safe: "Use Low-Atranol Oakmoss or Evernyl Synthetic substitute",
      desc: "Natural oakmoss (Evernia prunastri) absolute contains atranol and chloroatranol, known potent contact allergens. Modern compliance requires low-atranol treated absolute or molecular synthesis."
    },
    cinnamon: {
      status: "SEVERE DERMAL IRRITANT",
      limit: "Max 0.05% leave-on concentration",
      safe: "Use Cinnamon Leaf instead of Bark, or trace drops only",
      desc: "Cinnamic aldehyde in cinnamon bark causes burning flare-ups and chemical contact redness on sensitive skin. Keep below 0.05% in all perfumes."
    },
    clove: {
      status: "DERMAL SENSITIZER",
      limit: "Max 0.5% in leave-on fine fragrance",
      safe: "Dilute thoroughly into sandalwood/vanilla base fixative",
      desc: "Eugenol content can provoke contact allergies. Essential in spicy carnation and oriental accords but must be strictly metered."
    },
    rose_otto: {
      status: "METHYLEUGENOL RESTRICTION",
      limit: "Max 0.012% Methyleugenol exposure",
      safe: "Use Rose Damascena Absolute or high-grade Geraniol",
      desc: "Natural pure rose contains trace methyleugenol, regulated under international carcinogen safety limits. Meter total usage accordingly."
    }
  }[ing] || {};

  res.innerHTML = `
    <div class="resin-exotherm-alert resin-alert-warn">
      <span style="font-size:20px">🛡️</span>
      <div>
        <strong>${data.status}:</strong> ${data.limit}<br>
        • <strong>Remedy / Safer Option:</strong> ${data.safe}<br>
        • <em>${data.desc}</em>
      </div>
    </div>
  `;
}

function updatePerfumeMaceration() {
  const name = $("#perfume-log-name")?.value || "Artisan Bespoke Blend";
  const dateInput = $("#perfume-log-date");
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split("T")[0];
  }
  const date = dateInput?.value || new Date().toISOString().split("T")[0];
  const notes = $("#perfume-log-notes")?.value || "Bergamot, Rose, Sandalwood";
  const res = $("#perfume-maceration-result");
  if (!res) return;

  const start = new Date(date);
  const day14 = new Date(start.getTime() + (14 * 86400000)).toLocaleDateString();
  const day30 = new Date(start.getTime() + (30 * 86400000)).toLocaleDateString();
  const day45 = new Date(start.getTime() + (45 * 86400000)).toLocaleDateString();

  res.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:8px">
      <div class="jewelry-stat-card">
        <span class="label">Stage 1: Initial Compounding</span>
        <span class="value" style="font-size:13px">${date}</span>
        <div class="hint">Sharp ethanol aroma; keep in dark cool closet (15°C / 60°F)</div>
      </div>
      <div class="jewelry-stat-card">
        <span class="label">Stage 2: Esterification</span>
        <span class="value" style="font-size:13px">${day14}</span>
        <div class="hint">Molecules cross-link; alcohol burn softens noticeably</div>
      </div>
      <div class="jewelry-stat-card">
        <span class="label">Stage 3: Full Maturation</span>
        <span class="value" style="font-size:13px;color:var(--primary)">${day30}</span>
        <div class="hint">Bouquet harmonizes into unified scent profile</div>
      </div>
      <div class="jewelry-stat-card">
        <span class="label">Stage 4: Chill Filter &amp; Bottle</span>
        <span class="value" style="font-size:13px;color:#059669">${day45}</span>
        <div class="hint">Chill to 32°F (0°C) for 24h, filter waxes, bottle for use</div>
      </div>
    </div>
  `;
}

function renderPerfumeView() {
  updatePerfumeDilution();
  updatePerfumePyramid();
  updatePerfumeIfra();
  updatePerfumeMaceration();
}

// ============================================================
// ✉️ Letter Planning & Epistolary Studio Calculations & Handlers
// ============================================================
function updateLetterDraft() {
  const text = $("#letter-body-text")?.value || "";
  const recipient = $("#letter-recipient")?.value || "Friend";
  const tone = $("#letter-tone-select")?.value || "personal";
  const res = $("#letter-draft-result");
  if (!res) return;

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;

  // Handwriting speed ~22 words per minute
  const handwriteMins = Math.max(1, Math.ceil(words / 22));

  // A4 / A5 handwriting capacity ~180-220 words per page
  const estPages = Math.max(1, Math.ceil(words / 190));

  res.innerHTML = `
    <div class="letter-stats-bar">
      <div class="letter-stat-item">📝 <strong>${words}</strong> words</div>
      <div class="letter-stat-item">🔤 <strong>${chars}</strong> characters</div>
      <div class="letter-stat-item">⏱️ ~<strong>${handwriteMins}</strong> min handwriting time</div>
      <div class="letter-stat-item">📄 ~<strong>${estPages}</strong> page${estPages > 1 ? "s" : ""} (Handwritten)</div>
      <div class="letter-stat-item" style="margin-left:auto">
        <span class="badge" style="background:var(--surface);border:1px solid var(--border);padding:2px 8px;border-radius:12px;font-size:11px">
          Tone: ${tone.toUpperCase()}
        </span>
      </div>
    </div>
  `;
}

function updateLetterPaper() {
  const gsm = $("#letter-paper-gsm")?.value || "100";
  const env = $("#letter-envelope-type")?.value || "a7";
  const res = $("#letter-paper-result");
  if (!res) return;

  const paperData = {
    "80": { name: "80 GSM Laid Paper", caliper: "0.10 mm", feel: "Light & Crisp", ghost: "Moderate show-through with wet fountain pens", envRec: "Ideal for multi-page lightweight international postage." },
    "100": { name: "100 GSM Cotton Rag", caliper: "0.14 mm", feel: "Smooth Silky Tooth", ghost: "Zero show-through / zero feathering (Champion fountain pen paper)", envRec: "Standard heirloom stationery weight." },
    "120": { name: "120 GSM Smooth Heavy Vellum", caliper: "0.17 mm", feel: "Substantial & Luxurious", ghost: "Zero bleed with Broad and Italic nibs", envRec: "Perfect for formal invitations and diplomatic notes." },
    "180": { name: "180 GSM Handmade Deckle-Edge", caliper: "0.26 mm", feel: "Tactile Organic Fiber", ghost: "Ultra-heavy; feathering depends on gelatin sizing", envRec: "Requires scored fold to prevent fiber splitting." },
    "250": { name: "250 GSM Heavy Cardstock", caliper: "0.34 mm", feel: "Rigid Board Note", ghost: "Completely opaque postcard thickness", envRec: "Flat correspondence cards (do not fold)." }
  }[gsm] || {};

  const envData = {
    a7: { dims: "5.25\" × 7.25\" (133 × 184 mm)", fit: "Fits 5\" × 7\" flat card or half-folded 7\" × 10\" sheet", postage: "Standard 1-oz letter stamp (if < 1/4\" thick)" },
    a2: { dims: "4.375\" × 5.75\" (111 × 146 mm)", fit: "Fits quarter-folded letter sheet or 4.25\" × 5.5\" card", postage: "Standard 1-oz letter stamp" },
    a6: { dims: "4.75\" × 6.5\" (121 × 165 mm)", fit: "Fits 4.5\" × 6.25\" flat card or half-folded A5", postage: "Standard 1-oz letter stamp" },
    c5: { dims: "162 × 229 mm (6.4\" × 9.0\")", fit: "Fits half-folded European A4 sheet", postage: "Standard European letter rate" },
    c6: { dims: "114 × 162 mm (4.5\" × 6.4\")", fit: "Fits quarter-folded European A4 sheet", postage: "Standard European small letter" }
  }[env] || {};

  res.innerHTML = `
    <div class="jewelry-spec-grid">
      <div class="jewelry-stat-card">
        <span class="label">${paperData.name}</span>
        <span class="value" style="color:var(--primary)">${paperData.caliper}</span>
        <div class="hint">${paperData.feel}</div>
      </div>
      <div class="jewelry-stat-card">
        <span class="label">Envelope Sizing</span>
        <span class="value" style="font-size:13px">${envData.dims}</span>
        <div class="hint">${envData.fit}</div>
      </div>
    </div>
    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      📜 <strong>Paper Handling:</strong> ${paperData.ghost}<br>
      📐 <strong>Paper Grain Direction Rule:</strong> Always fold your letter sheet <em>parallel</em> to the paper grain direction. Folding against the grain causes unsightly cracked fibers and buckled edges.
    </div>
  `;
}

function updateLetterPen() {
  const nib = $("#letter-pen-nib")?.value || "f";
  const ink = $("#letter-ink-type")?.value || "dye";
  const res = $("#letter-pen-result");
  if (!res) return;

  const nibInfo = {
    ef: { width: "0.3 mm", flow: "Controlled / Dry", best: "Small script, pocket notebooks, thin laid papers." },
    f: { width: "0.5 mm", flow: "Balanced", best: "Everyday correspondence and clean cursive letters." },
    m: { width: "0.7 mm", flow: "Wet / Rich", best: "Displays ink shading and sheen on 100+ GSM cotton papers." },
    stub: { width: "1.1 mm", flow: "Very Wet / Broad", best: "Italic calligraphy, line variation, and shimmer inks." },
    dip: { width: "Hairline to 2.0 mm", flow: "Variable Flex", best: "Copperplate, Spencerian, and historic quill styles." }
  }[nib] || {};

  const isIndiaWarn = ink === "india";
  const inkInfo = {
    dye: { perm: "Water-Soluble", dryTime: "12 − 20 sec", safe: "100% Safe in all fountain pens", warn: "" },
    pigment: { perm: "100% Waterproof", dryTime: "15 − 25 sec", safe: "Fountain pen safe with monthly flushing", warn: "Do not let dry in feed" },
    iron_gall: { perm: "Archival Permanent", dryTime: "10 − 15 sec", safe: "Safe in modern pens; darkens over time", warn: "Clean pen every 2-3 weeks" },
    shimmer: { perm: "Decorative Glitter", dryTime: "25 − 40 sec", safe: "Best in Medium, Broad, or Stub nibs", warn: "Mica can settle in tight feeds" },
    india: { perm: "Waterproof Lacquer", dryTime: "30 − 60 sec", safe: "DIP PEN & BRUSH ONLY!", warn: "NEVER PUT IN FOUNTAIN PEN! Shellac binder will harden permanently and destroy the feed!" }
  }[ink] || {};

  const alertHtml = isIndiaWarn ? `
    <div class="resin-exotherm-alert resin-alert-warn" style="margin-top:8px">
      <span>🚫</span>
      <div>
        <strong>CRITICAL FOUNTAIN PEN WARNING:</strong> India Ink, Acrylic Ink, and Chinese Calligraphy Inks contain shellac/gum binders. If placed into a fountain pen, they will dry rock-hard inside the capillary feed channels, permanently ruining the pen! Use only with dip nibs.
      </div>
    </div>
  ` : "";

  res.innerHTML = `
    <div class="jewelry-spec-grid">
      <div class="jewelry-stat-card">
        <span class="label">Nib Stroke Width</span>
        <span class="value" style="color:var(--primary)">${nibInfo.width}</span>
        <div class="hint">${nibInfo.flow} flow</div>
      </div>
      <div class="jewelry-stat-card">
        <span class="label">Ink Permanence</span>
        <span class="value" style="font-size:13px">${inkInfo.perm}</span>
        <div class="hint">Dry time: ${inkInfo.dryTime}</div>
      </div>
    </div>
    ${alertHtml}
    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      ✒️ <strong>Nib Synergy:</strong> ${nibInfo.best}<br>
      🛡️ <strong>Ink Care:</strong> ${inkInfo.safe}. ${inkInfo.warn ? "(" + inkInfo.warn + ")" : ""}
    </div>
  `;
}

function updateWaxSealDesigner() {
  const diaMm = parseInt($("#wax-stamp-dia")?.value, 10) || 25;
  const primaryColor = $("#wax-color-primary")?.value || "#7f1d1d";
  const accentColor = $("#wax-color-accent")?.value || "#eab308";
  const flex = $("#wax-flex-grade")?.value || "flexible";
  const count = Math.max(1, parseInt($("#wax-seal-batch")?.value, 10) || 25);
  const res = $("#wax-seal-result");
  if (!res) return;

  let beadsPerSeal = 3.5;
  let gramsPerSeal = 1.2;
  if (diaMm <= 20) { beadsPerSeal = 2.5; gramsPerSeal = 0.85; }
  else if (diaMm <= 25) { beadsPerSeal = 3.5; gramsPerSeal = 1.2; }
  else if (diaMm <= 30) { beadsPerSeal = 5.0; gramsPerSeal = 1.7; }
  else { beadsPerSeal = 6.5; gramsPerSeal = 2.3; }

  const totalBeads = Math.ceil(beadsPerSeal * count);
  const totalGrams = Math.round(gramsPerSeal * count * 10) / 10;
  const sticksCount = Math.ceil(totalGrams / 11);

  const safeHex = (c, fallback) => /^#[0-9a-fA-F]{3,8}$/.test(c) ? c : fallback;
  const cleanPrimary = safeHex(primaryColor, "#7f1d1d");
  const cleanAccent = accentColor === "none" ? "none" : safeHex(accentColor, "#eab308");

  // Background gradient for wax seal
  let sealBg = cleanPrimary;
  if (cleanAccent !== "none") {
    sealBg = `radial-gradient(circle at 35% 35%, ${cleanAccent} 0%, ${cleanPrimary} 65%, #000000 120%)`;
  } else {
    sealBg = `radial-gradient(circle at 35% 35%, ${cleanPrimary} 0%, #000000 130%)`;
  }

  const mailableNote = flex === "flexible" ?
    "✅ <strong>USPS / Postal Machine Safe:</strong> Flexible resin wax can bend without shattering in automated mail sorting belts." :
    "⚠️ <strong>Brittle Historical Wax:</strong> Snaps cleanly with a tactile crack when opened, but WILL shatter in postal sorting machines unless enclosed in an outer protective envelope.";

  res.innerHTML = `
    <div class="wax-seal-designer-wrap">
      <div class="wax-seal-preview-disk" style="background:${sealBg}" title="Wax Seal Preview (${diaMm}mm)">
        <div class="wax-seal-inner-emblem">⚜️</div>
      </div>

      <div>
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase">BATCH WAX MELTING REQUIREMENT (${count} SEALS)</div>
        <div style="font-size:22px;font-weight:900;color:var(--ink);margin:2px 0 6px">
          ${totalBeads} Wax Beads (~ ${totalGrams} g)
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:6px 10px">
            <div style="font-size:10px;font-weight:700;color:var(--muted)">OCTAGON BEADS</div>
            <div style="font-size:14px;font-weight:800;color:var(--ink)">${beadsPerSeal} beads / seal</div>
          </div>
          <div style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:6px 10px">
            <div style="font-size:10px;font-weight:700;color:var(--muted)">GLUE GUN STICKS</div>
            <div style="font-size:14px;font-weight:800;color:var(--ink)">~ ${sticksCount} standard sticks</div>
          </div>
        </div>

        <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
          ${mailableNote}<br>
          ❄️ <strong>Pro Ice Technique:</strong> Rest your brass seal matrix on an ice pack or damp cloth between seals. A cold metal stamp sets the hot wax in <strong>10 seconds</strong> and releases cleanly without dragging!
        </div>
      </div>
    </div>
  `;
}

function renderLetterView() {
  updateLetterDraft();
  updateLetterPaper();
  updateLetterPen();
  updateWaxSealDesigner();
}

// ============================================================
// 🔥 Epoxy & Silicone Studio Expansion Functions
// ============================================================
function updateResinThermalWatchdog() {
  const type = $("#resin-thermal-type")?.value || "tabletop";
  const depthIn = parseFloat($("#resin-thermal-depth")?.value) || 1.75;
  const volMl = parseFloat($("#resin-thermal-volume")?.value) || 1800;
  const ambientF = parseFloat($("#resin-thermal-ambient")?.value) || 72;
  const res = $("#resin-thermal-result");
  if (!res) return;

  const specs = {
    tabletop: { maxDepth: 0.25, maxVol: 500, exothermCoeff: 1.8, name: "Tabletop Epoxy" },
    deep_pour: { maxDepth: 2.0, maxVol: 5000, exothermCoeff: 0.6, name: "2:1 Deep Pour Epoxy" },
    deep_casting: { maxDepth: 3.0, maxVol: 10000, exothermCoeff: 0.35, name: "3:1 Deep Casting Epoxy" },
    uv_resin: { maxDepth: 0.12, maxVol: 50, exothermCoeff: 2.2, name: "UV Photopolymer Resin" }
  }[type] || { maxDepth: 0.25, maxVol: 500, exothermCoeff: 1.8, name: "Epoxy" };

  // Calculate estimated peak core temperature
  const tempRise = (depthIn * 35) + ((volMl / 1000) * 20 * specs.exothermCoeff);
  const peakTempF = Math.round(ambientF + tempRise);
  const peakTempC = Math.round((peakTempF - 32) * (5 / 9));

  const isDanger = depthIn > specs.maxDepth || peakTempF > 240;
  const stagedLayers = Math.ceil(depthIn / specs.maxDepth);

  if (isDanger) {
    res.innerHTML = `
      <div class="resin-exotherm-alert resin-alert-warn">
        <span style="font-size:24px">⚠️</span>
        <div>
          <strong>CRITICAL THERMAL RUNAWAY HAZARD!</strong><br>
          Target depth of <strong>${depthIn.toFixed(2)}"</strong> exceeds the safe dissipation limit (<strong>${specs.maxDepth}"</strong>) for ${specs.name}.<br>
          • <strong>Predicted Peak Core Temp:</strong> <span style="font-size:15px;color:#dc2626;font-weight:800">${peakTempF}°F (${peakTempC}°C)</span><br>
          • <strong>Consequences:</strong> Spontaneous resin boiling, violent smoke, toxic outgassing, yellow scorching, and severe shrinkage stress cracks.<br>
          • <strong>Required Solution:</strong> Pour in <strong>${stagedLayers} staged layers</strong> (approx ${(depthIn / stagedLayers).toFixed(2)}" each) spaced <strong>24 to 36 hours apart</strong> once the previous layer reaches a firm tacky gel state!
        </div>
      </div>
    `;
  } else {
    res.innerHTML = `
      <div class="resin-exotherm-alert resin-alert-safe">
        <span style="font-size:20px">✅</span>
        <div>
          <strong>Thermal Dissipation Safe:</strong> Predicted peak temperature of <strong>${peakTempF}°F (${peakTempC}°C)</strong> is within safe thresholds (&lt;200°F). Heat will dissipate steadily without boiling or yellow discoloration.
        </div>
      </div>
    `;
  }
}

function updateSiliconeMoldCalc() {
  const boxL = Math.max(0.5, parseFloat($("#silicone-box-l")?.value) || 6.0);
  const boxW = Math.max(0.5, parseFloat($("#silicone-box-w")?.value) || 4.0);
  const boxD = Math.max(0.5, parseFloat($("#silicone-box-d")?.value) || 2.5);
  const masterVol = Math.max(0, parseFloat($("#silicone-master-vol")?.value) || 120);
  const mixType = $("#silicone-mix-type")?.value || "plat_1_1";
  const res = $("#silicone-mold-result");
  if (!res) return;

  const boxVolIn3 = boxL * boxW * boxD;
  const boxVolMl = boxVolIn3 * 16.3871;
  const netSiliconeMl = Math.max(20, (boxVolMl - masterVol) * 1.10); // 10% safety margin

  // Silicone density ~1.12 g/ml
  const totalGrams = Math.round(netSiliconeMl * 1.12);

  let partAG = 0, partBG = 0;
  if (mixType === "plat_1_1") {
    partAG = Math.round(totalGrams / 2);
    partBG = totalGrams - partAG;
  } else {
    partAG = Math.round((totalGrams / 11) * 10);
    partBG = totalGrams - partAG;
  }

  res.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:8px">
      <div class="jewelry-stat-card">
        <span class="label">Total Silicone Needed</span>
        <span class="value" style="color:var(--primary)">${totalGrams} g</span>
        <div class="hint">${Math.round(netSiliconeMl)} ml (incl. 10% safety)</div>
      </div>
      <div class="jewelry-stat-card">
        <span class="label">Part A (Base Rubber)</span>
        <span class="value" style="color:#2563eb">${partAG} g</span>
        <div class="hint">${mixType === "plat_1_1" ? "50% by weight" : "90.9% by weight"}</div>
      </div>
      <div class="jewelry-stat-card">
        <span class="label">Part B (Catalyst)</span>
        <span class="value" style="color:#0891b2">${partBG} g</span>
        <div class="hint">${mixType === "plat_1_1" ? "50% by weight" : "9.1% by weight"}</div>
      </div>
    </div>
    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      📏 <strong>Wall Margin:</strong> Ensure at least <strong>0.5" (13 mm)</strong> of rubber between the master object and all mold box walls to prevent mold wall bulging under the hydraulic pressure of poured casting resin.
    </div>
  `;
}

function updateSiliconeShore() {
  const picker = $("#silicone-shore-picker")?.value || "miniatures";
  const arch = $("#silicone-arch-type")?.value || "one_part";
  const res = $("#silicone-shore-result");
  if (!res) return;

  const data = {
    miniatures: { shore: "Shore 10A − 15A (Super Soft)", tear: "High elongation (&gt;600%)", desc: "Easily stretches over delicate thin miniature fingers and antennas without snapping details upon demolding." },
    dice: { shore: "Shore 25A − 30A (Medium Firm)", tear: "Crisp edge retention", desc: "Maintains razor-sharp vertex geometry on polyhedral gaming dice without convex wall distortion." },
    candles: { shore: "Shore 15A − 20A (Flexible)", tear: "Deep peel flexibility", desc: "Allows tubular candle pillars to be pulled out cleanly without tearing mold cavities." },
    production: { shore: "Shore 40A − 50A (Rigid Split Mold)", tear: "Long life dimensional stability", desc: "Stiff rubber resists deflection under heavy polyurethane injection or rotocasting machines." }
  }[picker] || {};

  const archDesc = arch === "two_part" ?
    "🧩 <strong>2-Part Registration Keys:</strong> Embed half of the master into sulfur-free clay (Monster Clay). Use marble hemispheres or a 45° keying tool around the border to create interlocking keys. <em>CRITICAL: Apply 2 coats of Mann Ease Release or Vaseline thinned with mineral spirits to the cured silicone before pouring the second half, or both halves will fuse into a solid block!</em>" :
    "✂️ <strong>1-Part Cut Block Mold:</strong> Pour silicone completely over master. After full cure, cut a single parting seam down the side with a sharp scalpel in a zig-zag wavy keyway. The zig-zag shape self-aligns tightly when wrapped with rubber bands for casting.";

  res.innerHTML = `
    <div class="jewelry-spec-grid">
      <div class="jewelry-stat-card">
        <span class="label">Recommended Durometer</span>
        <span class="value" style="color:var(--primary);font-size:14px">${data.shore}</span>
        <div class="hint">${data.tear}</div>
      </div>
    </div>
    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      ℹ️ <strong>Rubber Behavior:</strong> ${data.desc}<br>
      ${archDesc}
    </div>
  `;
}

function updateResinEmbed() {
  const mat = $("#resin-embed-mat")?.value || "wood";
  const mc = parseFloat($("#resin-wood-mc")?.value) || 9.0;
  const res = $("#resin-embed-result");
  if (!res) return;

  let advice = "";
  if (mat === "wood") {
    if (mc > 12.0) {
      advice = `
        <div class="resin-exotherm-alert resin-alert-warn">
          <span>⚠️</span>
          <div>
            <strong>HIGH WOOD MOISTURE WARNING (${mc}% MC):</strong> Wood with &gt;12% moisture content will steam and outgas during exothermic cure, releasing clouds of micro-bubbles and causing resin delamination! Kiln-dry or desiccate slab below 10% MC before pouring.
          </div>
        </div>
      `;
    } else {
      advice = `
        <div class="resin-exotherm-alert resin-alert-safe">
          <span>✅</span>
          <div>
            <strong>Moisture Content Safe (${mc}% MC):</strong> Slab is adequately dry. Pre-seal all raw live edges with a brushed coat of thin tabletop epoxy 4 hours before the river pour to prevent wood pores from outgassing.
          </div>
        </div>
      `;
    }
  } else if (mat === "flowers") {
    advice = `
      <div style="font-size:11px;line-height:1.45;color:var(--ink)">
        🌸 <strong>Botanical Encapsulation Protocol:</strong> Fresh flowers contain 80−90% water which turns brown and rots inside cured resin. Submerge whole blooms in <strong>silica gel desiccant crystals</strong> for 4 to 6 days until paper-dry before resin encapsulation. Spray with clear matte acrylic to prevent petal bleeding.
      </div>
    `;
  } else if (mat === "porous") {
    advice = `
      <div style="font-size:11px;line-height:1.45;color:var(--ink)">
        🦴 <strong>Porous Stabilization:</strong> Bones, antlers, and pinecones have microscopic air pockets. Degas in a vacuum chamber submerged in Cactus Juice stabilizing resin, then bake at 200°F before final epoxy casting to eliminate bubble weeping.
      </div>
    `;
  } else {
    advice = `
      <div style="font-size:11px;line-height:1.45;color:var(--ink)">
        ⚙️ <strong>Metals &amp; Non-Porous:</strong> Wipe thoroughly with 99% isopropyl alcohol or acetone to remove machining cutting oils. Scuff surface with 220-grit sandpaper for mechanical tooth adhesion.
      </div>
    `;
  }

  res.innerHTML = advice;
}

// ============================================================
// 💎 Jewelry Making Studio Expansion Functions
// ============================================================
function updateJewelryWireGauge() {
  const gauge = $("#jewelry-wire-gauge")?.value || "20";
  const temper = $("#jewelry-wire-temper")?.value || "dead_soft";
  const alloy = $("#jewelry-wire-alloy")?.value || "sterling";
  const res = $("#jewelry-wire-result");
  if (!res) return;

  const awgTable = {
    "12": { mm: "2.05 mm", in: "0.081\"", area: "3.31 mm²", use: "Heavy forged bangles and cuff bracelet frames" },
    "14": { mm: "1.63 mm", in: "0.064\"", area: "2.08 mm²", use: "Heavy signet ring shanks and collar armatures" },
    "16": { mm: "1.29 mm", in: "0.051\"", area: "1.31 mm²", use: "Classic ring bands and heavy duty neckwires" },
    "18": { mm: "1.02 mm", in: "0.040\"", area: "0.82 mm²", use: "Sturdy jump rings, hook & eye clasps, ring shanks" },
    "20": { mm: "0.81 mm", in: "0.032\"", area: "0.52 mm²", use: "Standard ear wires, French hooks, and headpins" },
    "22": { mm: "0.64 mm", in: "0.025\"", area: "0.32 mm²", use: "Delicate ear wires, briolette wrapping, wire links" },
    "24": { mm: "0.51 mm", in: "0.020\"", area: "0.20 mm²", use: "Intricate wire wrapping, bails, small gemstone loops" },
    "26": { mm: "0.40 mm", in: "0.016\"", area: "0.13 mm²", use: "Bezel wall tape, wire crochet, micro weaving" },
    "28": { mm: "0.32 mm", in: "0.013\"", area: "0.08 mm²", use: "Fine filigree wire, intricate wire crochet" },
    "30": { mm: "0.25 mm", in: "0.010\"", area: "0.05 mm²", use: "Ultra-fine filigree granules and wire knitting" }
  }[gauge] || { mm: "0.81 mm", in: "0.032\"", area: "0.52 mm²", use: "Ear wires" };

  const temperInfo = {
    dead_soft: "Bends easily with fingers, zero spring-back. Ideal for bezel rolling, wire weaving, and shaping around mandrels before work-hardening.",
    half_hard: "Holds structural geometry while retaining moderate spring. Perfect for earwires, jump rings, clasps, and fabricated pin stems.",
    full_hard: "Rigid with high elastic spring-back. Essential for locking brooch pins, safety catches, and high-tension wire chokers."
  }[temper] || "";

  const annealInfo = {
    sterling: "Heat with soft bushy torch flame in dim light to a dull red glow (1100°F / 600°C). Hold for 5 seconds, then quench immediately in water. Follow with Sparex pickle bath.",
    fine_silver: "Fine silver (.999) does not firescale or work-harden rapidly. Anneals easily at 1000°F; quench immediately.",
    gold_14k: "Heat to dull red (1250°F / 675°C). Let cool until red color fades completely in dark, then quench in water.",
    copper: "Heat to dull cherry red (1200°F / 650°C) and quench immediately in water for complete dead-soft reset."
  }[alloy] || "";

  res.innerHTML = `
    <div class="jewelry-spec-grid">
      <div class="jewelry-stat-card">
        <span class="label">Metric Diameter</span>
        <span class="value" style="color:var(--primary)">${awgTable.mm}</span>
        <div class="hint">${awgTable.in} inches</div>
      </div>
      <div class="jewelry-stat-card">
        <span class="label">Cross-Sectional Area</span>
        <span class="value">${awgTable.area}</span>
        <div class="hint">AWG ${gauge} Gauge</div>
      </div>
    </div>
    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      📐 <strong>Bench Application:</strong> ${awgTable.use}.<br>
      ⚡ <strong>Temper Physics:</strong> ${temperInfo}<br>
      🔥 <strong>Annealing Guide:</strong> ${annealInfo}
    </div>
  `;
}

function updateJewelryMohs() {
  const query = ($("#jewelry-mohs-search")?.value || "").toLowerCase().trim();
  const filter = $("#jewelry-mohs-filter")?.value || "all";
  const res = $("#jewelry-mohs-result");
  if (!res) return;

  const stones = [
    { name: "Diamond", mohs: 10, cat: "tough", notes: "Ultimate hardness. Heat & ultrasonic safe with boric acid firecoat." },
    { name: "Moissanite", mohs: 9.25, cat: "tough", notes: "Exceptional thermal stability; survives direct torch soldering." },
    { name: "Sapphire / Ruby (Corundum)", mohs: 9.0, cat: "tough", notes: "High thermal & chemical resistance. Ultrasonic and steam safe." },
    { name: "Spinel", mohs: 8.0, cat: "tough", notes: "Durable daily wear. Protect from direct rapid flame quenching." },
    { name: "Topaz", mohs: 8.0, cat: "tough", notes: "Basal cleavage: vulnerable to hard hammer blows on prong tips." },
    { name: "Emerald (Beryl)", mohs: 7.5, cat: "moderate", notes: "Fragile inclusions: NO ultrasonic, NO steam, NO torch heat! Cold-set only." },
    { name: "Quartz / Amethyst / Citrine", mohs: 7.0, cat: "moderate", notes: "Moderate durability. Avoid sudden temperature thermal shock." },
    { name: "Garnet", mohs: 6.5, cat: "moderate", notes: "Good bench durability; shield from direct flame to prevent fracturing." },
    { name: "Tanzanite", mohs: 6.5, cat: "moderate", notes: "Thermal shock sensitive. Avoid ultrasonic bath and high heat." },
    { name: "Opal", mohs: 5.5, cat: "soft", notes: "CRITICAL: 5-10% water content. NO HEAT, NO PICKLE, NO ULTRASONIC! Will craze and shatter." },
    { name: "Turquoise", mohs: 5.5, cat: "soft", notes: "CRITICAL: Porous. Absorbs pickle acid and chemicals; burns black under torch." },
    { name: "Lapis Lazuli", mohs: 5.0, cat: "soft", notes: "Calcite veins dissolve in acids. Keep strictly out of pickle bath." },
    { name: "Malachite", mohs: 4.0, cat: "soft", notes: "Copper carbonate. Highly sensitive to acids, heat, and ultrasonic vibrations." },
    { name: "Pearl / Coral", mohs: 3.0, cat: "soft", notes: "Organic calcium carbonate. Mount with epoxy post AFTER all polishing is complete!" }
  ];

  const filtered = stones.filter(s => {
    const matchQ = !query || s.name.toLowerCase().includes(query) || s.notes.toLowerCase().includes(query);
    const matchF = filter === "all" || s.cat === filter;
    return matchQ && matchF;
  });

  if (filtered.length === 0) {
    res.innerHTML = `<div style="font-size:12px;color:var(--muted);padding:8px">No gemstones match "${escapeHTML(query)}".</div>`;
    return;
  }

  res.innerHTML = `
    <div class="mohs-stone-grid">
      ${filtered.map(s => {
        const badgeClass = s.cat === "tough" ? "mohs-badge-tough" : s.cat === "moderate" ? "mohs-badge-mod" : "mohs-badge-fragile";
        return `
          <div class="mohs-stone-card">
            <div class="mohs-stone-top">
              <span class="mohs-stone-name">${s.name}</span>
              <span class="mohs-badge ${badgeClass}">Mohs ${s.mohs}</span>
            </div>
            <div class="mohs-stone-rule">${s.notes}</div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function updateJewelryPolishing() {
  const start = $("#jewelry-polish-start")?.value || "raw_cast";
  const metal = $("#jewelry-polish-metal")?.value || "silver_gold";
  const res = $("#jewelry-polish-result");
  if (!res) return;

  res.innerHTML = `
    <div class="polishing-step-list">
      <div class="polishing-step-item">
        <div class="polishing-step-dot" style="background:#78350f" title="Brown Tripoli"></div>
        <div>
          <strong style="font-size:12px">Step 1: Tripoli / Bobbing Compound (Brown)</strong>
          <div style="font-size:11px;color:var(--ink-secondary)">Coarse cutting compound on stitched muslin wheel (3,500 RPM). Removes 400−600 grit file marks. Keep workpiece moving constantly to avoid flat-spotting curves.</div>
        </div>
      </div>

      <div class="polishing-step-item">
        <div class="polishing-step-dot" style="background:#e2e8f0;border-color:#94a3b8" title="White Diamond"></div>
        <div>
          <strong style="font-size:12px">Step 2: White Diamond Compound</strong>
          <div style="font-size:11px;color:var(--ink-secondary)">Intermediate smoothing on unstitched cotton buff. Removes greasy Tripoli haze and prepares metal for optical mirror clarity.</div>
        </div>
      </div>

      <div class="polishing-step-item">
        <div class="polishing-step-dot" style="background:#dc2626" title="Red Jeweler's Rouge"></div>
        <div>
          <strong style="font-size:12px">Step 3: Red Jeweler's Rouge (Ferric Oxide)</strong>
          <div style="font-size:11px;color:var(--ink-secondary)">Final ultra-high luster on soft flannel or wool buff (2,500 RPM) with whisper-light pressure. Burnishes precious Gold and Silver to deep liquid mirror reflection.</div>
        </div>
      </div>

      <div class="polishing-step-item">
        <div class="polishing-step-dot" style="background:#059669" title="Fabulustre / Zam"></div>
        <div>
          <strong style="font-size:12px">Step 4 (Alternative): Fabulustre / Zam All-in-One</strong>
          <div style="font-size:11px;color:var(--ink-secondary)">Safe for delicate set stones (Turquoise, Lapis, Coral) without scratching soft gems or leaving clinging residues.</div>
        </div>
      </div>
    </div>
    <div style="font-size:11px;color:var(--ink-secondary);line-height:1.4;margin-top:8px">
      ⚠️ <strong>Polishing Lathe Safety:</strong> Never hold chains, rings, or rags directly with bare fingers on a spinning arbor! Chains will catch and wrap instantly. Always mount rings onto a wooden split ring clamp.
    </div>
  `;
}

// --- 📐 Universal Automatic Unit Value Conversion Engine ---
function setupAutoUnitConversions() {
  const configs = [
    {
      unitId: "#textiles-hat-circ-unit",
      inputs: ["#textiles-hat-circ", "#textiles-sock-len"],
      convert: (val, from, to) => {
        if (from === "in" && to === "cm") return (val * 2.54).toFixed(1);
        if (from === "cm" && to === "in") return (val / 2.54).toFixed(1);
        return val;
      },
      callback: () => {
        if (typeof updateTextilesHatCalc === "function") updateTextilesHatCalc();
      }
    },
    {
      unitId: "#art-frame-dim-unit",
      inputs: ["#art-frame-art-w", "#art-frame-art-h", "#art-frame-mat-w", "#art-frame-molding-w", "#art-frame-overlap"],
      convert: (val, from, to) => {
        if (from === "in" && to === "cm") return (val * 2.54).toFixed(1);
        if (from === "cm" && to === "in") return (val / 2.54).toFixed(2);
        return val;
      },
      callback: () => {
        if (typeof updateArtFrameCalc === "function") updateArtFrameCalc();
      }
    },
    {
      unitId: "#wood-dt-unit",
      inputs: ["#wood-dt-width", "#wood-dt-thick", "#wood-dt-halfpin"],
      convert: (val, from, to) => {
        if (from === "mm" && to === "in") return (val / 25.4).toFixed(2);
        if (from === "in" && to === "mm") return Math.round(val * 25.4);
        return val;
      },
      callback: () => {
        if (typeof updateDovetailCalc === "function") updateDovetailCalc();
      }
    },
    {
      unitId: "#wood-emc-panel-unit",
      inputs: ["#wood-emc-panel-w"],
      convert: (val, from, to) => {
        if (from === "in" && to === "mm") return Math.round(val * 25.4);
        if (from === "mm" && to === "in") return (val / 2.54).toFixed(1);
        return val;
      },
      callback: () => {
        if (typeof updateWoodEmcCalc === "function") updateWoodEmcCalc();
      }
    },
    {
      unitId: "#wood-emc-temp-unit",
      inputs: ["#wood-emc-temp"],
      convert: (val, from, to) => {
        if (from === "f" && to === "c") return Math.round((val - 32) * 5 / 9);
        if (from === "c" && to === "f") return Math.round((val * 9 / 5) + 32);
        return val;
      },
      callback: () => {
        if (typeof updateWoodEmcCalc === "function") updateWoodEmcCalc();
      }
    },
    {
      unitId: "#wood-sag-wt-unit",
      inputs: ["#wood-sag-weight"],
      convert: (val, from, to) => {
        if (from === "lbs" && to === "kg") return (val * 0.453592).toFixed(1);
        if (from === "kg" && to === "lbs") return (val / 0.453592).toFixed(1);
        return val;
      },
      callback: () => {
        if (typeof updateSagulatorCalc === "function") updateSagulatorCalc();
      }
    },
    {
      unitId: "#wood-nest-unit",
      inputs: ["#wood-nest-sheet-w", "#wood-nest-sheet-h", "#wood-nest-kerf"],
      convert: (val, from, to, inputId) => {
        if (inputId === "#wood-nest-kerf") {
          if (from === "in" && to === "mm") return (val * 25.4).toFixed(1);
          if (from === "mm" && to === "in") return (val / 25.4).toFixed(3);
        }
        if (from === "in" && to === "mm") return Math.round(val * 25.4);
        if (from === "mm" && to === "in") return Math.round(val / 25.4);
        return val;
      },
      custom: (from, to) => {
        const partsEl = $("#wood-nest-parts");
        if (!partsEl) return;
        const text = partsEl.value;
        const lines = text.split("\n");
        const convertedLines = lines.map(line => {
          return line.replace(/(\d+(?:\.\d+)?)\s*[xX*×]\s*(\d+(?:\.\d+)?)/g, (match, wStr, hStr) => {
            let w = parseFloat(wStr);
            let h = parseFloat(hStr);
            if (isNaN(w) || isNaN(h)) return match;
            if (from === "in" && to === "mm") {
              return `${Math.round(w * 25.4)} x ${Math.round(h * 25.4)}`;
            } else if (from === "mm" && to === "in") {
              return `${(w / 25.4).toFixed(1)} x ${(h / 25.4).toFixed(1)}`;
            }
            return match;
          });
        });
        partsEl.value = convertedLines.join("\n");
      },
      callback: () => {
        if (typeof run2DSheetNestingOptimizer === "function") run2DSheetNestingOptimizer();
      }
    },
    {
      unitId: "#tool-epoxy-units",
      inputs: ["#tool-epoxy-length", "#tool-epoxy-width", "#tool-epoxy-depth", "#tool-epoxy-diameter"],
      convert: (val, from, to) => {
        if (from === "in" && to === "mm") return (val * 25.4).toFixed(1);
        if (from === "mm" && to === "in") return (val / 2.54).toFixed(2);
        return val;
      },
      callback: () => {
        if (typeof updateEpoxyCalc === "function") updateEpoxyCalc();
      }
    },
    {
      unitId: "#textiles-skein-len-unit",
      inputs: ["#textiles-skein-full-len", "#textiles-skein-target-len"],
      convert: (val, from, to) => {
        if (from === "yds" && to === "m") return Math.round(val * 0.9144);
        if (from === "m" && to === "yds") return Math.round(val / 0.9144);
        return val;
      },
      callback: () => {
        if (typeof updateYarnSkeinCalculator === "function") updateYarnSkeinCalculator();
      }
    },
    {
      unitId: "#textiles-yarn-len-unit",
      inputs: ["#textiles-yarn-target-len"],
      convert: (val, from, to) => {
        if (from === "m" && to === "yd") return Math.round(val / 0.9144);
        if (from === "yd" && to === "m") return Math.round(val * 0.9144);
        return val;
      },
      callback: () => {
        if (typeof updateYarnHoldingCalc === "function") updateYarnHoldingCalc();
      }
    },
    {
      unitId: "#elec-trace-len-unit",
      inputs: ["#elec-trace-len"],
      convert: (val, from, to) => {
        if (from === "mm" && to === "in") return (val / 25.4).toFixed(2);
        if (from === "in" && to === "mm") return (val * 25.4).toFixed(1);
        return val;
      },
      callback: () => {
        if (typeof updatePcbTraceCalc === "function") updatePcbTraceCalc();
      }
    }
  ];

  configs.forEach(cfg => {
    const sel = $(cfg.unitId);
    if (!sel || sel.dataset.unitConvertedBound) return;
    sel.dataset.unitConvertedBound = "true";
    sel.dataset.prevUnit = sel.value;
    sel.addEventListener("change", () => {
      const from = sel.dataset.prevUnit || sel.value;
      const to = sel.value;
      if (from === to) return;

      if (cfg.inputs && cfg.convert) {
        cfg.inputs.forEach(inpId => {
          const inp = $(inpId);
          if (inp && inp.value !== "") {
            const raw = parseFloat(inp.value);
            if (!isNaN(raw) && raw > 0) {
              const converted = cfg.convert(raw, from, to, inpId);
              inp.value = converted;
            }
          }
        });
      }

      if (typeof cfg.custom === "function") {
        cfg.custom(from, to);
      }

      sel.dataset.prevUnit = to;

      if (typeof cfg.callback === "function") {
        cfg.callback();
      }
    });
  });
}

function initCraftStudios() {
  // Initialize automatic unit value conversions
  setupAutoUnitConversions();

  // Piano keyboard & Music Theory & Fretboard Studio
  renderPianoKeyboardUI();
  updateMusicScaleView();
  renderFretboardUI();
  $("#music-scale-key")?.addEventListener("change", () => { updateMusicScaleView(); renderFretboardUI(); });
  $("#music-scale-mode")?.addEventListener("change", () => { updateMusicScaleView(); renderFretboardUI(); });
  $("#fretboard-instrument-select")?.addEventListener("change", renderFretboardUI);
  $("#fretboard-display-mode")?.addEventListener("change", renderFretboardUI);
  $("#fretboard-highlight-mode")?.addEventListener("change", renderFretboardUI);

  // Studio Metronome & Tuner
  renderMetronomeDots();
  renderTunerDisplay(null);
  $("#music-tuner-calib")?.addEventListener("change", () => { if (!micTunerState.isActive) renderTunerDisplay(null); });
  $("#metronome-bpm-slider")?.addEventListener("input", (e) => setMetronomeBpm(e.target.value));
  $("#metronome-time-sig")?.addEventListener("change", (e) => {
    metronomeState.timeSignature = parseInt(e.target.value, 10) || 4;
    renderMetronomeDots();
  });

  // 16-Step Beat Sequencer & Tap Tempo
  renderBeatSequencerGrid();
  $("#beat-seq-swing")?.addEventListener("input", (e) => {
    beatSeqState.swing = parseInt(e.target.value, 10) || 0;
    const lbl = $("#beat-seq-swing-val");
    if (lbl) lbl.textContent = beatSeqState.swing + "%";
  });

  // Woodworking Cutlist, Dust, Finishes, Joinery, Sanding, Safety, Sagulator & EMC
  runWoodCutOptimizer();
  updateWoodDustCalc();
  updateWoodFinishView();
  updateWoodJoineryGuide();
  updateWoodSandingGuide();
  updateWoodSafetyGuide();
  updateSagulatorCalc();
  updateWoodEmcCalc();
  ["#wood-cut-stock", "#wood-cut-kerf"].forEach(s => $(s)?.addEventListener("input", runWoodCutOptimizer));
  $("#wood-cut-pieces")?.addEventListener("input", runWoodCutOptimizer);
  $("#wood-dust-machine")?.addEventListener("change", updateWoodDustCalc);
  $("#wood-dust-dia")?.addEventListener("change", updateWoodDustCalc);
  $("#wood-finish-select")?.addEventListener("change", updateWoodFinishView);
  $("#wood-joinery-select")?.addEventListener("change", updateWoodJoineryGuide);
  $("#wood-sand-starting")?.addEventListener("change", updateWoodSandingGuide);
  $("#wood-sand-finish-type")?.addEventListener("change", updateWoodSandingGuide);
  $("#wood-safety-process-select")?.addEventListener("change", updateWoodSafetyGuide);
  ["#wood-sag-species", "#wood-sag-thick", "#wood-sag-edge", "#wood-sag-load-type", "#wood-sag-wt-unit", "#wood-sag-support"].forEach(s => $(s)?.addEventListener("change", updateSagulatorCalc));
  ["#wood-sag-span", "#wood-sag-depth", "#wood-sag-weight"].forEach(s => $(s)?.addEventListener("input", updateSagulatorCalc));
  ["#wood-emc-species", "#wood-emc-temp-unit", "#wood-emc-env", "#wood-emc-panel-unit", "#wood-emc-grain"].forEach(s => $(s)?.addEventListener("change", updateWoodEmcCalc));
  ["#wood-emc-temp", "#wood-emc-panel-w"].forEach(s => $(s)?.addEventListener("input", updateWoodEmcCalc));
  $("#wood-emc-rh-slider")?.addEventListener("input", updateWoodEmcCalc);

  // Woodworking Dovetail & Box Joint Layout
  updateDovetailCalc();
  ["#wood-dt-type", "#wood-dt-unit", "#wood-dt-slope"].forEach(s => $(s)?.addEventListener("change", updateDovetailCalc));
  ["#wood-dt-width", "#wood-dt-thick", "#wood-dt-tails", "#wood-dt-halfpin"].forEach(s => $(s)?.addEventListener("input", updateDovetailCalc));

  // Fastener, Bolt & Tap Drill Precision Finder
  updateFastenerFinder();
  $("#fastener-system")?.addEventListener("change", () => {
    populateFastenerFinderSizes();
    updateFastenerFinder();
  });
  ["#fastener-size", "#fastener-head-type", "#fastener-material"].forEach(s => $(s)?.addEventListener("change", updateFastenerFinder));

  // 2D Sheet Goods & Plywood Nesting Optimizer
  run2DSheetNestingOptimizer();
  $("#wood-nest-preset")?.addEventListener("change", (e) => {
    const map = {
      "4x8": [48, 96, "in"],
      "5x5": [60, 60, "in"],
      "half_sheet": [48, 48, "in"],
      "quarter_sheet": [24, 48, "in"],
      "laser_bed": [24, 12, "in"]
    };
    const pair = map[e.target.value];
    if (pair) {
      if ($("#wood-nest-sheet-w")) $("#wood-nest-sheet-w").value = pair[0];
      if ($("#wood-nest-sheet-h")) $("#wood-nest-sheet-h").value = pair[1];
      if ($("#wood-nest-unit")) $("#wood-nest-unit").value = pair[2];
      run2DSheetNestingOptimizer();
    }
  });
  ["#wood-nest-sheet-w", "#wood-nest-sheet-h", "#wood-nest-kerf"].forEach(s => $(s)?.addEventListener("input", run2DSheetNestingOptimizer));
  ["#wood-nest-unit", "#wood-nest-rotation"].forEach(s => $(s)?.addEventListener("change", run2DSheetNestingOptimizer));
  $("#wood-nest-parts")?.addEventListener("input", run2DSheetNestingOptimizer);

  // Textiles Yardage, Gauge, Fiber Guide, Skein, Hat Sizing & Planned Pooling
  updateTextilesYardageEstimator();
  updateTextilesGaugeCalc();
  updateTextilesFiberGuide();
  updateYarnSkeinCalculator();
  updateTextilesHatCalc();
  updateTextilesPooling();
  $("#textiles-est-project")?.addEventListener("change", updateTextilesYardageEstimator);
  $("#textiles-est-yarn-wt")?.addEventListener("change", updateTextilesYardageEstimator);
  ["#textiles-gauge-pattern", "#textiles-gauge-actual", "#textiles-gauge-target-w"].forEach(s => $(s)?.addEventListener("input", updateTextilesGaugeCalc));
  $("#textiles-fiber-select")?.addEventListener("change", updateTextilesFiberGuide);
  $("#textiles-garment-select")?.addEventListener("change", updateTextilesFiberGuide);
  ["#textiles-skein-full-wt", "#textiles-skein-full-len", "#textiles-skein-cur-wt", "#textiles-skein-target-len"].forEach(s => $(s)?.addEventListener("input", updateYarnSkeinCalculator));
  $("#textiles-skein-len-unit")?.addEventListener("change", updateYarnSkeinCalculator);
  ["#textiles-hat-type", "#textiles-hat-ease", "#textiles-hat-multiple", "#textiles-hat-brim"].forEach(s => $(s)?.addEventListener("change", updateTextilesHatCalc));
  $("#textiles-hat-type")?.addEventListener("change", () => {
    syncTextilesHatSockUI();
    updateTextilesHatCalc();
  });
  $("#textiles-hat-size-preset")?.addEventListener("change", (e) => {
    const val = e.target.value;
    const circUnit = $("#textiles-hat-circ-unit")?.value || "in";
    const circEl = $("#textiles-hat-circ");
    const lenEl = $("#textiles-sock-len");

    if (SOCK_SIZE_PRESETS[val]) {
      const p = SOCK_SIZE_PRESETS[val];
      if (circEl) circEl.value = (circUnit === "cm") ? p.circCm : p.circIn;
      if (lenEl) lenEl.value = (circUnit === "cm") ? p.lenCm : p.lenIn;
    } else if (HAT_SIZE_PRESETS[val]) {
      const p = HAT_SIZE_PRESETS[val];
      if (circEl) circEl.value = (circUnit === "cm") ? p.circCm : p.circIn;
    }
    updateTextilesHatCalc();
  });
  ["#textiles-hat-circ", "#textiles-sock-len", "#textiles-hat-gauge-sts", "#textiles-hat-gauge-rows"].forEach(s => $(s)?.addEventListener("input", updateTextilesHatCalc));
  ["#textiles-pool-shift"].forEach(s => $(s)?.addEventListener("change", updateTextilesPooling));
  $("#textiles-pool-preset")?.addEventListener("change", (e) => {
    const p = POOLING_PRESETS[e.target.value];
    if (p && $("#textiles-pool-stitch-seq")) {
      $("#textiles-pool-stitch-seq").value = p.lengths.join(", ");
      updateTextilesPooling();
    }
  });
  ["#textiles-pool-stitch-seq", "#textiles-pool-mult"].forEach(s => $(s)?.addEventListener("input", updateTextilesPooling));

  // Textiles Multi-Strand Yarn Equivalency
  updateYarnHoldingCalc();
  ["#textiles-yarn-strand1", "#textiles-yarn-strand2", "#textiles-yarn-strand3", "#textiles-yarn-len-unit"].forEach(s => $(s)?.addEventListener("change", updateYarnHoldingCalc));
  $("#textiles-yarn-target-len")?.addEventListener("input", updateYarnHoldingCalc);
  $("#textiles-yarn-preset")?.addEventListener("change", (e) => {
    const val = e.target.value;
    const s1 = $("#textiles-yarn-strand1");
    const s2 = $("#textiles-yarn-strand2");
    const s3 = $("#textiles-yarn-strand3");
    if (val === "fingering_mohair") { if (s1) s1.value = "1"; if (s2) s2.value = "0"; if (s3) s3.value = "none"; }
    else if (val === "double_fingering") { if (s1) s1.value = "1"; if (s2) s2.value = "1"; if (s3) s3.value = "none"; }
    else if (val === "double_dk") { if (s1) s1.value = "3"; if (s2) s2.value = "3"; if (s3) s3.value = "none"; }
    else if (val === "double_worsted") { if (s1) s1.value = "4"; if (s2) s2.value = "4"; if (s3) s3.value = "none"; }
    else if (val === "triple_fingering") { if (s1) s1.value = "1"; if (s2) s2.value = "1"; if (s3) s3.value = "1"; }
    else if (val === "dk_mohair") { if (s1) s1.value = "3"; if (s2) s2.value = "0"; if (s3) s3.value = "none"; }
    updateYarnHoldingCalc();
  });

  // Electronics Voltage Divider, Capacitor, AWG, 555 Timer, Passive RC Filter, I2C Sensors, SMD Decoder & Stepper Solver
  updateVoltageDividerCalc();
  updateCapacitorCodeView();
  updateWireAwgView();
  update555TimerCalc();
  updatePassiveFilterCalc();
  updateI2cSensorGuide();
  updateSmdDecoder();
  updateStepperMotorCalc();
  ["#elec-div-vin", "#elec-div-r1", "#elec-div-r2"].forEach(s => $(s)?.addEventListener("input", updateVoltageDividerCalc));
  $("#elec-cap-code")?.addEventListener("input", updateCapacitorCodeView);
  $("#elec-cap-preset")?.addEventListener("change", (e) => {
    const inp = $("#elec-cap-code");
    if (inp) { inp.value = e.target.value; updateCapacitorCodeView(); }
  });
  $("#elec-wire-awg")?.addEventListener("change", updateWireAwgView);
  ["#elec-wire-dist", "#elec-wire-volts", "#elec-wire-amps"].forEach(s => $(s)?.addEventListener("input", updateWireAwgView));
  ["#elec-555-r1", "#elec-555-r2", "#elec-555-c"].forEach(s => $(s)?.addEventListener("input", update555TimerCalc));
  $("#elec-555-preset")?.addEventListener("change", (e) => {
    const val = e.target.value;
    const r1 = $("#elec-555-r1");
    const r2 = $("#elec-555-r2");
    const c = $("#elec-555-c");
    if (val === "1hz") { if (r1) r1.value = 10; if (r2) r2.value = 68; if (c) c.value = 10; }
    else if (val === "1khz") { if (r1) r1.value = 1; if (r2) r2.value = 47; if (c) c.value = 0.015; }
    else if (val === "38khz") { if (r1) r1.value = 1; if (r2) r2.value = 18; if (c) c.value = 0.001; }
    else if (val === "pwm50") { if (r1) r1.value = 1; if (r2) r2.value = 100; if (c) c.value = 1; }
    update555TimerCalc();
  });
  $("#elec-res-band3")?.addEventListener("change", updateResistorColorView);
  ["#elec-filter-r", "#elec-filter-c"].forEach(s => $(s)?.addEventListener("input", updatePassiveFilterCalc));
  $("#elec-filter-type")?.addEventListener("change", updatePassiveFilterCalc);
  $("#elec-filter-preset")?.addEventListener("change", (e) => {
    const val = e.target.value;
    const r = $("#elec-filter-r");
    const c = $("#elec-filter-c");
    if (val === "arduino_pwm") { if (r) r.value = 10; if (c) c.value = 100; }
    else if (val === "subwoofer") { if (r) r.value = 15; if (c) c.value = 100; }
    else if (val === "mic_rumble") { if (r) r.value = 100; if (c) c.value = 22; }
    else if (val === "debounce") { if (r) r.value = 10; if (c) c.value = 10000; }
    else if (val === "ultrasonic") { if (r) r.value = 3.3; if (c) c.value = 2.2; }
    updatePassiveFilterCalc();
  });
  $("#elec-sensor-primary")?.addEventListener("change", updateI2cSensorGuide);
  $("#elec-sensor-secondary")?.addEventListener("change", updateI2cSensorGuide);
  $("#elec-smd-code")?.addEventListener("input", updateSmdDecoder);
  ["#elec-smd-mode", "#elec-smd-package"].forEach(s => $(s)?.addEventListener("change", updateSmdDecoder));
  ["#elec-step-mech", "#elec-step-angle", "#elec-step-micro"].forEach(s => $(s)?.addEventListener("change", updateStepperMotorCalc));
  $("#elec-step-gear")?.addEventListener("input", updateStepperMotorCalc);

  // Electronics PCB Trace Solver (IPC-2152)
  updatePcbTraceCalc();
  ["#elec-trace-copper", "#elec-trace-deltat", "#elec-trace-layer", "#elec-trace-len-unit"].forEach(s => $(s)?.addEventListener("change", updatePcbTraceCalc));
  ["#elec-trace-current", "#elec-trace-len", "#elec-trace-ambient"].forEach(s => $(s)?.addEventListener("input", updatePcbTraceCalc));

  // Programming ALU, ASCII, Array Formatter, Baud, CRC & Battery Life
  updateProgAluCalc();
  searchProgAsciiTable();
  formatProgByteArray();
  updateProgBaudCalc();
  updateProgCrcCalc();
  updateProgBatteryLifeCalc();
  ["#prog-alu-rega", "#prog-alu-regb"].forEach(s => $(s)?.addEventListener("input", updateProgAluCalc));
  $("#prog-alu-op")?.addEventListener("change", updateProgAluCalc);
  $("#prog-ascii-search")?.addEventListener("input", searchProgAsciiTable);
  $("#prog-array-input")?.addEventListener("input", formatProgByteArray);
  $("#prog-array-lang")?.addEventListener("change", formatProgByteArray);
  ["#prog-baud-rate", "#prog-baud-databits", "#prog-baud-parity", "#prog-baud-stopbits"].forEach(s => $(s)?.addEventListener("change", updateProgBaudCalc));
  $("#prog-crc-input")?.addEventListener("input", updateProgCrcCalc);
  ["#prog-crc-format", "#prog-crc-algo"].forEach(s => $(s)?.addEventListener("change", updateProgCrcCalc));
  ["#prog-pwr-sleep-unit", "#prog-pwr-sleep-time-unit"].forEach(s => $(s)?.addEventListener("change", updateProgBatteryLifeCalc));
  $("#prog-pwr-mcu")?.addEventListener("change", (e) => {
    const v = e.target.value;
    if (v === "esp32") { $("#prog-pwr-act-curr").value = 120; $("#prog-pwr-sleep-curr").value = 15; $("#prog-pwr-sleep-unit").value = "ua"; }
    else if (v === "esp8266") { $("#prog-pwr-act-curr").value = 80; $("#prog-pwr-sleep-curr").value = 20; $("#prog-pwr-sleep-unit").value = "ua"; }
    else if (v === "pico_w") { $("#prog-pwr-act-curr").value = 45; $("#prog-pwr-sleep-curr").value = 1.2; $("#prog-pwr-sleep-unit").value = "ma"; }
    else if (v === "promini_3v3") { $("#prog-pwr-act-curr").value = 5; $("#prog-pwr-sleep-curr").value = 4.5; $("#prog-pwr-sleep-unit").value = "ua"; }
    else if (v === "nrf52840") { $("#prog-pwr-act-curr").value = 7; $("#prog-pwr-sleep-curr").value = 1.5; $("#prog-pwr-sleep-unit").value = "ua"; }
    updateProgBatteryLifeCalc();
  });
  $("#prog-pwr-battery")?.addEventListener("change", (e) => {
    const map = { "18650_2600": 2600, "18650_3500": 3500, "lipo_1000": 1000, "aa_alkaline": 2200, "cr2032": 225 };
    const cap = map[e.target.value];
    if (cap && $("#prog-pwr-bat-cap")) { $("#prog-pwr-bat-cap").value = cap; updateProgBatteryLifeCalc(); }
  });
  ["#prog-pwr-act-curr", "#prog-pwr-act-time", "#prog-pwr-sleep-curr", "#prog-pwr-sleep-time", "#prog-pwr-bat-cap"].forEach(s => $(s)?.addEventListener("input", updateProgBatteryLifeCalc));

  // Programming IEEE 754 Floating Point Inspector
  updateIeee754InspectorUI();
  $("#prog-fp-dec")?.addEventListener("input", (e) => {
    const v = parseFloat(e.target.value);
    setIeee754FromFloat(v);
  });
  $("#prog-fp-hex")?.addEventListener("input", (e) => {
    setIeee754FromHex(e.target.value);
  });

  // Art Contrast, Gradient, Print Scaler, CVD Preview, Framing & Camera Color Picker
  updateArtContrastCalc();
  updateArtGradientStudio();
  updateArtPrintResCalc();
  updateArtCvdView();
  updateArtFrameCalc();
  renderArtCameraDetails(artCameraState.activeColor, artCameraState.topClusters, artCameraState.screenDominantColor);
  $("#art-contrast-text")?.addEventListener("input", updateArtContrastCalc);
  $("#art-contrast-bg")?.addEventListener("input", updateArtContrastCalc);
  $("#art-gradient-type")?.addEventListener("change", updateArtGradientStudio);
  $("#art-gradient-angle")?.addEventListener("input", updateArtGradientStudio);
  $("#art-print-size")?.addEventListener("change", updateArtPrintResCalc);
  $("#art-print-dpi")?.addEventListener("change", updateArtPrintResCalc);
  $("#art-cvd-type")?.addEventListener("change", updateArtCvdView);
  ["#art-frame-dim-unit", "#art-frame-overlap", "#art-frame-bottom-weight", "#art-frame-mat-color"].forEach(s => $(s)?.addEventListener("change", updateArtFrameCalc));
  $("#art-frame-preset")?.addEventListener("change", (e) => {
    const map = { "8x10": [8, 10], "5x7": [5, 7], "4x6": [4, 6], "11x14": [11, 14], "12x16": [12, 16], "16x20": [16, 20], "18x24": [18, 24], "A4": [8.27, 11.69], "A3": [11.69, 16.54] };
    const pair = map[e.target.value];
    if (pair) {
      if ($("#art-frame-art-w")) $("#art-frame-art-w").value = pair[0];
      if ($("#art-frame-art-h")) $("#art-frame-art-h").value = pair[1];
      updateArtFrameCalc();
    }
  });
  ["#art-frame-art-w", "#art-frame-art-h", "#art-frame-mat-w", "#art-frame-molding-w"].forEach(s => $(s)?.addEventListener("input", updateArtFrameCalc));
  $("#art-camera-file-input")?.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) handleArtCameraFileUpload(e.target.files[0]);
  });

  // Art Physical Pigment Mixer
  renderPigmentSlidersUI();
  updatePigmentMixer();
  $("#art-pigment-preset")?.addEventListener("change", (e) => {
    const p = PIGMENT_PRESETS[e.target.value];
    if (p) {
      Object.assign(pigmentPartsState, p);
      renderPigmentSlidersUI();
      updatePigmentMixer();
    }
  });

  // Wood CNC Feeds & Speeds Precision Calculator
  updateCncCalc();
  ["#cnc-material", "#cnc-bit-preset", "#cnc-flutes", "#cnc-op-type", "#cnc-unit"].forEach(s => $(s)?.addEventListener("change", updateCncCalc));
  ["#cnc-bit-custom", "#cnc-rpm"].forEach(s => $(s)?.addEventListener("input", updateCncCalc));
  $("#cnc-router-preset")?.addEventListener("change", (e) => setRouterRpmPreset(e.target.value));

  // Programming Serial UART & CRC Analyzer
  updateSerialCalc();
  ["#serial-baud", "#serial-framing", "#serial-data-format"].forEach(s => $(s)?.addEventListener("change", updateSerialCalc));
  $("#serial-payload-input")?.addEventListener("input", updateSerialCalc);

  // Resin & Silicone Studio
  updateResinCalc();
  updateResinDegas();
  updateResinPigment();
  updateResinInhibition();
  updateResinThermalWatchdog();
  updateSiliconeMoldCalc();
  updateSiliconeShore();
  updateResinEmbed();
  ["#resin-type-preset", "#resin-shape", "#resin-measure-mode", "#resin-units", "#resin-waste"].forEach(s => $(s)?.addEventListener("change", updateResinCalc));
  ["#resin-dim1", "#resin-dim2", "#resin-dim3"].forEach(s => $(s)?.addEventListener("input", updateResinCalc));
  ["#resin-degas-method", "#resin-viscosity"].forEach(s => $(s)?.addEventListener("change", updateResinDegas));
  $("#resin-pigment-type")?.addEventListener("change", updateResinPigment);
  $("#resin-pigment-batch")?.addEventListener("input", updateResinPigment);
  ["#resin-master-mat", "#resin-rubber-class"].forEach(s => $(s)?.addEventListener("change", updateResinInhibition));

  // 3D Printing Studio & Spool Depot
  renderSpoolRack();
  update3DPrintCostCalc();
  update3DFlowCalc();
  update3DSpoolCalc();
  update3DSlaGuide();
  ["#print-tech", "#print-spool-price", "#print-machine-rate", "#print-markup-pct"].forEach(s => $(s)?.addEventListener("change", update3DPrintCostCalc));
  ["#print-weight-g", "#print-time-hours", "#print-spool-price", "#print-machine-rate", "#print-markup-pct"].forEach(s => $(s)?.addEventListener("input", update3DPrintCostCalc));
  ["#print-hotend-type", "#print-nozzle-dia"].forEach(s => $(s)?.addEventListener("change", update3DFlowCalc));
  ["#print-layer-h", "#print-speed-mms"].forEach(s => $(s)?.addEventListener("input", update3DFlowCalc));
  ["#print-spool-tare", "#print-polymer-type"].forEach(s => $(s)?.addEventListener("change", update3DSpoolCalc));
  ["#print-spool-gross", "#print-spool-check"].forEach(s => $(s)?.addEventListener("input", update3DSpoolCalc));
  ["#print-resin-chem", "#print-sla-geometry"].forEach(s => $(s)?.addEventListener("change", update3DSlaGuide));

  // Spool Rack filter & search
  $("#spool-rack-search")?.addEventListener("input", renderSpoolRack);
  ["#spool-rack-material-filter", "#spool-rack-sort"].forEach(s => $(s)?.addEventListener("change", renderSpoolRack));

  // Spool selection in print cost calculator
  $("#print-cost-spool-select")?.addEventListener("change", (e) => {
    const sId = e.target.value;
    if (sId) {
      const spool = (state.inventory || []).find(i => i.id === sId);
      if (spool) {
        const sData = spool.spoolData || {};
        if ($("#print-spool-price")) $("#print-spool-price").value = sData.spoolCost ?? spool.cost ?? 22;
        if (sData.material === "Resin" && $("#print-tech")) $("#print-tech").value = "sla";
      }
    }
    update3DPrintCostCalc();
  });

  // Spool Form Submission & Field Interactivity
  $("#spool-form")?.addEventListener("submit", handleSpoolSubmit);
  $$(".spool-preset-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const color = btn.dataset.color;
      const picker = $("#spool-color-picker");
      if (color && picker) {
        picker.value = color;
      }
    });
  });

  $("#spool-tare-preset")?.addEventListener("change", (e) => {
    const val = e.target.value;
    if (val !== "custom" && $("#spool-tare-weight")) {
      $("#spool-tare-weight").value = val;
      const gross = parseFloat($("#spool-input-gross")?.value) || 0;
      const tare = parseFloat(val) || 0;
      if ($("#spool-input-net")) $("#spool-input-net").value = Math.max(0, gross - tare);
      updateSpoolModalWeightHint();
    }
  });

  $("#spool-input-gross")?.addEventListener("input", () => {
    const gross = parseFloat($("#spool-input-gross")?.value) || 0;
    const tare = parseFloat($("#spool-tare-weight")?.value) || 0;
    if ($("#spool-input-net")) $("#spool-input-net").value = Math.max(0, gross - tare);
    updateSpoolModalWeightHint();
  });

  $("#spool-input-net")?.addEventListener("input", () => {
    const net = parseFloat($("#spool-input-net")?.value) || 0;
    const tare = parseFloat($("#spool-tare-weight")?.value) || 0;
    if ($("#spool-input-gross")) $("#spool-input-gross").value = net + tare;
    updateSpoolModalWeightHint();
  });

  ["#spool-tare-weight", "#spool-material-select", "#spool-dia-select"].forEach(s => {
    $(s)?.addEventListener("input", updateSpoolModalWeightHint);
    $(s)?.addEventListener("change", updateSpoolModalWeightHint);
  });

  // Spool Quick Weigh & Deduct Dialog
  $("#spool-weigh-form")?.addEventListener("submit", handleWeighSpoolSubmit);
  $("#spool-weigh-tab-scale")?.addEventListener("click", () => setWeighDialogMode("scale"));
  $("#spool-weigh-tab-deduct")?.addEventListener("click", () => setWeighDialogMode("deduct"));
  $("#spool-weigh-gross-input")?.addEventListener("input", updateWeighDialogPreview);
  $("#spool-weigh-deduct-input")?.addEventListener("input", updateWeighDialogPreview);

  // Origami & Papercraft Studio Listeners
  renderOrigamiView();
  $("#origami-model-select")?.addEventListener("change", (e) => {
    activeOrigamiModel = e.target.value;
    activeOrigamiStepIndex = 0;
    renderOrigamiStep(activeOrigamiModel, 0);
  });

  ["#origami-parent-format", "#origami-target-shape", "#origami-quick-size-preset"].forEach(s => {
    $(s)?.addEventListener("change", (e) => {
      if (e.target.id === "origami-quick-size-preset" && e.target.value !== "custom") {
        if ($("#origami-target-size")) $("#origami-target-size").value = e.target.value;
      }
      updateOrigamiPaperCalc();
    });
  });
  ["#origami-parent-w", "#origami-parent-h", "#origami-target-size"].forEach(s => {
    $(s)?.addEventListener("input", updateOrigamiPaperCalc);
  });

  ["#origami-modular-poly", "#origami-modular-colors"].forEach(s => $(s)?.addEventListener("change", updateOrigamiModularCalc));
  $("#origami-modular-square-size")?.addEventListener("input", updateOrigamiModularCalc);

  $("#origami-cp-preset")?.addEventListener("change", updateOrigamiCpValidator);
  ["#origami-cp-m", "#origami-cp-v", "#origami-cp-angles"].forEach(s => {
    $(s)?.addEventListener("input", updateOrigamiCpValidator);
  });

  ["#origami-guide-paper", "#origami-guide-complexity"].forEach(s => $(s)?.addEventListener("change", updateOrigamiPaperGuide));

  // Laser Cutting & Engraving Studio Listeners
  renderLaserView();
  ["#laser-type", "#laser-op", "#laser-material"].forEach(s => $(s)?.addEventListener("change", updateLaserCalc));
  ["#laser-mat-cost", "#laser-runtime-mins", "#laser-hourly-rate"].forEach(s => $(s)?.addEventListener("input", updateLaserCalc));
  ["#laser-kerf-thickness", "#laser-kerf-width", "#laser-kerf-tab"].forEach(s => $(s)?.addEventListener("input", updateLaserKerfCalc));
  $("#laser-kerf-fit")?.addEventListener("change", updateLaserKerfCalc);
  $("#laser-safety-mat")?.addEventListener("change", updateLaserSafetyWatchdog);
  ["#laser-lens-type", "#laser-air-mode"].forEach(s => $(s)?.addEventListener("change", updateLaserOpticsGuide));

  // Leathercraft & Stitching Studio Listeners
  renderLeatherView();
  ["#leather-seam-len", "#leather-stack-thick"].forEach(s => $(s)?.addEventListener("input", updateLeatherStitchCalc));
  ["#leather-iron-pitch", "#leather-thread-type"].forEach(s => $(s)?.addEventListener("change", updateLeatherStitchCalc));
  $("#leather-oz-preset")?.addEventListener("change", updateLeatherGaugeCalc);
  ["#leather-custom-mm", "#leather-sqft-price"].forEach(s => $(s)?.addEventListener("input", updateLeatherGaugeCalc));
  $("#leather-hide-cut")?.addEventListener("change", updateLeatherGaugeCalc);
  ["#leather-belt-waist", "#leather-belt-oz"].forEach(s => $(s)?.addEventListener("input", updateLeatherBeltCalc));
  ["#leather-belt-width", "#leather-belt-spacing"].forEach(s => $(s)?.addEventListener("change", updateLeatherBeltCalc));
  $("#leather-tannage-select")?.addEventListener("change", updateLeatherEdgeGuide);

  // Ceramics & Pottery Studio Listeners
  renderCeramicsView();
  $("#clay-body-preset")?.addEventListener("change", updateClayShrinkCalc);
  ["#clay-shrinkage-pct", "#clay-fired-height", "#clay-fired-diam", "#clay-fired-vol"].forEach(s => $(s)?.addEventListener("input", updateClayShrinkCalc));
  $("#glaze-recipe-preset")?.addEventListener("change", updateGlazeUmfCalc);
  ["#glaze-alumina", "#glaze-silica", "#glaze-r2o", "#glaze-ro"].forEach(s => $(s)?.addEventListener("input", updateGlazeUmfCalc));
  ["#kiln-cone-preset", "#kiln-candling-mode", "#kiln-soak-time"].forEach(s => $(s)?.addEventListener("change", updateKilnRampCalc));
  ["#plaster-type", "#plaster-mold-shape"].forEach(s => $(s)?.addEventListener("change", updatePlasterCalc));
  ["#plaster-dim-1", "#plaster-dim-2", "#plaster-dim-3"].forEach(s => $(s)?.addEventListener("input", updatePlasterCalc));

  // Welding & Metal Fabrication Studio Listeners
  renderWeldingView();
  ["#weld-process", "#weld-metal", "#weld-thickness", "#weld-joint"].forEach(s => $(s)?.addEventListener("change", updateWeldParamsCalc));
  ["#weld-gas-opt", "#weld-draft-env"].forEach(s => $(s)?.addEventListener("change", updateWeldGasCalc));
  ["#weld-bend-thick", "#weld-bend-radius", "#weld-bend-leg-a", "#weld-bend-leg-b", "#weld-bend-angle"].forEach(s => $(s)?.addEventListener("input", updateWeldBendCalc));
  $("#weld-bend-kfactor")?.addEventListener("change", updateWeldBendCalc);
  ["#weld-heat-volts", "#weld-heat-amps", "#weld-heat-speed"].forEach(s => $(s)?.addEventListener("input", updateWeldHeatCalc));
  $("#weld-heat-eff")?.addEventListener("change", updateWeldHeatCalc);

  // CNC Machining & Milling Studio Listeners
  renderCncView();
  ["#cnc-studio-material", "#cnc-material", "#cnc-bit-type", "#cnc-tool-dia", "#cnc-spindle-type"].forEach(s => $(s)?.addEventListener("change", updateCncFeeds));
  ["#cnc-doc-in", "#cnc-woc-pct"].forEach(s => $(s)?.addEventListener("input", updateCncFeeds));
  ["#cnc-scallop-radius", "#cnc-scallop-stepover"].forEach(s => $(s)?.addEventListener("input", updateCncScallop));
  ["#cnc-deflect-stickout"].forEach(s => $(s)?.addEventListener("input", updateCncDeflection));
  ["#cnc-deflect-mat", "#cnc-tool-dia"].forEach(s => $(s)?.addEventListener("change", updateCncDeflection));
  $("#cnc-gcode-preset")?.addEventListener("change", (e) => {
    const val = e.target.value;
    if ($("#cnc-gcode-input")) $("#cnc-gcode-input").value = CNC_GCODE_PRESETS[val] || "";
    parseAndRenderCncGcode($("#cnc-gcode-input")?.value || "");
    resetCncGcode();
  });
  $("#cnc-gcode-input")?.addEventListener("input", (e) => {
    parseAndRenderCncGcode(e.target.value);
    resetCncGcode();
  });

  // Blacksmithing & Bladesmithing Studio Listeners
  renderBlacksmithView();
  ["#forge-steel-select", "#forge-blade-type"].forEach(s => $(s)?.addEventListener("change", () => {
    updateForgeSteel();
    updateForgeTemper();
  }));
  $("#forge-temper-temp")?.addEventListener("input", updateForgeTemper);
  $("#forge-temper-cycles")?.addEventListener("change", updateForgeTemper);
  ["#forge-damascus-initial", "#forge-damascus-cut", "#forge-damascus-pattern"].forEach(s => $(s)?.addEventListener("change", updateForgeDamascus));
  $("#forge-damascus-folds")?.addEventListener("input", updateForgeDamascus);
  ["#forge-gas-burners", "#forge-gas-tip", "#forge-target-temp"].forEach(s => $(s)?.addEventListener("change", updateForgeGas));
  $("#forge-gas-psi")?.addEventListener("input", updateForgeGas);

  // Fasteners & Drills Studio Listeners
  renderFastenersView();
  $("#fastener-standard-select")?.addEventListener("change", () => {
    populateFastenerStudioSizes();
    updateFastenerTap();
    updateFastenerTorque();
  });
  $("#fastener-size-select")?.addEventListener("change", () => {
    updateFastenerTap();
    updateFastenerTorque();
  });
  $("#fastener-material-select")?.addEventListener("change", updateFastenerTap);
  ["#fastener-grade-select", "#fastener-lube-select", "#fastener-preload-target"].forEach(s => $(s)?.addEventListener("change", updateFastenerTorque));
  ["#fastener-wood-gauge", "#fastener-wood-type", "#fastener-wood-style"].forEach(s => $(s)?.addEventListener("change", updateFastenerWood));
  $("#fastener-wood-length")?.addEventListener("input", updateFastenerWood);
  ["#fastener-cb-style", "#fastener-cb-size", "#fastener-cb-fit"].forEach(s => $(s)?.addEventListener("change", updateFastenerCounterbore));

  // Stained Glass & Copper Foil Studio Listeners
  renderGlassView();
  $("#glass-seam-length")?.addEventListener("input", updateGlassSolder);
  ["#glass-assembly-type", "#glass-solder-alloy", "#glass-iron-tip"].forEach(s => $(s)?.addEventListener("change", updateGlassSolder));
  ["#glass-thickness", "#glass-foil-width", "#glass-foil-backing", "#glass-foil-mil"].forEach(s => $(s)?.addEventListener("change", updateGlassFoil));
  ["#glass-patina-target", "#glass-flux-type"].forEach(s => $(s)?.addEventListener("change", updateGlassPatina));
  ["#glass-score-sheet", "#glass-score-shape", "#glass-score-oil"].forEach(s => $(s)?.addEventListener("change", updateGlassScore));

  // Jewelry Making & Metalsmithing Studio Listeners
  renderJewelryView();
  ["#jewelry-ring-size", "#jewelry-metal-thick", "#jewelry-band-width"].forEach(s => $(s)?.addEventListener("change", updateJewelryRing));
  ["#jewelry-stone-len", "#jewelry-stone-width", "#jewelry-stone-height"].forEach(s => $(s)?.addEventListener("input", updateJewelryBezel));
  $("#jewelry-stone-shape")?.addEventListener("change", updateJewelryBezel);
  $("#jewelry-wax-weight")?.addEventListener("input", updateJewelryCasting);
  $("#jewelry-cast-metal")?.addEventListener("change", updateJewelryCasting);
  ["#jewelry-solder-base", "#jewelry-solder-stage"].forEach(s => $(s)?.addEventListener("change", updateJewelrySoldering));

  // Bookbinding & Printmaking Studio Listeners
  renderBookbindingView();
  $("#book-total-pages")?.addEventListener("input", () => {
    updateBookSignatures();
    updateBookSpine();
    updateBookStitching();
  });
  ["#book-imposition-format", "#book-endpaper-style"].forEach(s => $(s)?.addEventListener("change", () => {
    updateBookSignatures();
    updateBookStitching();
  }));
  ["#book-paper-caliper", "#book-board-grade"].forEach(s => $(s)?.addEventListener("change", updateBookSpine));
  ["#book-page-w", "#book-page-h"].forEach(s => $(s)?.addEventListener("input", () => {
    updateBookSpine();
    updateBookStitching();
  }));
  ["#book-stitch-style", "#book-thread-weight"].forEach(s => $(s)?.addEventListener("change", updateBookStitching));
  ["#book-ink-type", "#book-print-paper", "#book-block-medium"].forEach(s => $(s)?.addEventListener("change", updateBookPrint));

  // SLA / MSLA Resin 3D Printing Studio Listeners
  renderSlaView();
  ["#sla-lcd-type", "#sla-resin-type", "#sla-layer-height", "#sla-light-intensity"].forEach(s => $(s)?.addEventListener("change", updateSlaExposure));
  ["#sla-vat-w", "#sla-vat-l", "#sla-vat-depth", "#sla-job-ml"].forEach(s => $(s)?.addEventListener("input", updateSlaVat));
  ["#sla-film-type", "#sla-model-area"].forEach(s => $(s)?.addEventListener("change", updateSlaPeel));
  $("#sla-hollow-height")?.addEventListener("input", updateSlaHollow);
  ["#sla-wall-thick", "#sla-ambient-temp"].forEach(s => $(s)?.addEventListener("change", updateSlaHollow));

  // Luthier & Stringed Instrument Building Studio Listeners
  renderLuthierView();
  ["#luthier-scale-select", "#luthier-fret-count", "#luthier-unit-display"].forEach(s => $(s)?.addEventListener("change", () => {
    updateLuthierFret();
    updateLuthierTension();
  }));
  ["#luthier-rad-nut", "#luthier-rad-heel", "#luthier-nut-w", "#luthier-heel-w"].forEach(s => $(s)?.addEventListener("change", updateLuthierRadius));
  ["#luthier-tension-tuning", "#luthier-tension-gauge"].forEach(s => $(s)?.addEventListener("change", updateLuthierTension));
  ["#luthier-setup-type", "#luthier-setup-style"].forEach(s => $(s)?.addEventListener("change", updateLuthierAction));

  // Composites & Carbon Fiber Fabrication Studio Listeners
  renderCompositesView();
  ["#comp-fabric-type", "#comp-process-type", "#comp-mix-ratio", "#comp-waste-factor"].forEach(s => $(s)?.addEventListener("change", updateCompositesResin));
  ["#comp-part-area", "#comp-ply-count"].forEach(s => $(s)?.addEventListener("input", () => {
    updateCompositesResin();
    updateCompositesVacuum();
  }));
  ["#comp-stack-schedule", "#comp-core-material"].forEach(s => $(s)?.addEventListener("change", updateCompositesStack));
  ["#comp-vacuum-level", "#comp-leakdown-rate"].forEach(s => $(s)?.addEventListener("change", updateCompositesVacuum));
  ["#comp-ambient-temp", "#comp-cure-schedule"].forEach(s => $(s)?.addEventListener("change", updateCompositesCure));

  // Watchmaking & Horology Studio Listeners
  renderHorologyView();
  ["#horo-caliber-select", "#horo-test-pos"].forEach(s => $(s)?.addEventListener("change", updateHorologyTimegrapher));
  ["#horo-rate-drift", "#horo-balance-amp", "#horo-beat-error"].forEach(s => $(s)?.addEventListener("input", updateHorologyTimegrapher));
  ["#horo-mainspring-type", "#horo-wind-state"].forEach(s => $(s)?.addEventListener("change", updateHorologyReserve));
  $("#horo-lube-point")?.addEventListener("change", updateHorologyLube);
  ["#horo-water-rating", "#horo-gasket-type"].forEach(s => $(s)?.addEventListener("change", updateHorologyPressure));

  // Robotics & Mechatronics Studio Listeners
  renderRoboticsView();
  ["#robo-motor-class", "#robo-mech-type", "#robo-ang-accel", "#robo-safety-factor"].forEach(s => $(s)?.addEventListener("change", updateRoboticsTorque));
  ["#robo-load-mass", "#robo-arm-radius"].forEach(s => $(s)?.addEventListener("input", updateRoboticsTorque));
  ["#robo-driver-ic", "#robo-microsteps", "#robo-step-angle"].forEach(s => $(s)?.addEventListener("change", () => {
    updateRoboticsDriver();
    updateRoboticsLinear();
  }));
  $("#robo-motor-rpm")?.addEventListener("input", updateRoboticsDriver);
  ["#robo-drivetrain-mech", "#robo-gear-ratio"].forEach(s => $(s)?.addEventListener("change", updateRoboticsLinear));
  ["#robo-arm-l1", "#robo-arm-l2", "#robo-arm-theta1", "#robo-arm-theta2", "#robo-battery-mah"].forEach(s => $(s)?.addEventListener("input", updateRoboticsKinematics));
  $("#robo-battery-pack")?.addEventListener("change", updateRoboticsKinematics);

  // Bicycle Framebuilding & Wheel Studio Listeners
  renderBicycleView();
  ["#bike-spoke-count", "#bike-cross-pattern"].forEach(s => $(s)?.addEventListener("change", updateBicycleSpoke));
  ["#bike-rim-erd", "#bike-hub-dl", "#bike-hub-dr", "#bike-hub-wl", "#bike-hub-wr"].forEach(s => $(s)?.addEventListener("input", () => {
    updateBicycleSpoke();
    updateBicycleTension();
  }));
  $("#bike-target-tension")?.addEventListener("input", updateBicycleTension);
  $("#bike-spoke-gauge")?.addEventListener("change", updateBicycleTension);
  ["#bike-head-angle", "#bike-fork-rake"].forEach(s => $(s)?.addEventListener("input", updateBicycleTrail));
  $("#bike-wheel-radius")?.addEventListener("change", updateBicycleTrail);
  ["#bike-tube-junction", "#bike-tube-material"].forEach(s => $(s)?.addEventListener("change", updateBicycleMiter));

  // 🔍 Live Search Filter for Studio Switchers (Quick Dialog & Mobile Drawer)
  const filterStudioElements = (query, containerSelector, itemSelector) => {
    const q = (query || "").toLowerCase().trim();
    $$(containerSelector + " " + itemSelector).forEach(el => {
      const text = el.textContent.toLowerCase();
      const match = !q || text.includes(q);
      el.classList.toggle("hidden-studio", !match);
    });
  };

  $("#studio-quick-filter")?.addEventListener("input", (e) => {
    filterStudioElements(e.target.value, "#studio-quick-btn-grid", "button");
  });

  $("#mobile-studio-filter")?.addEventListener("input", (e) => {
    filterStudioElements(e.target.value, "#mobile-studios-grid", ".mobile-studio-card");
  });

  // 🔍 Craft Studio Tab Search in Sidebar
  const sidebarStudioInput = $("#sidebar-studio-search");
  const sidebarStudioClear = $("#sidebar-studio-search-clear");
  const sidebarStudioNoResults = $("#sidebar-studios-no-results");
  const sidebarStudioQuerySpan = $("#sidebar-studios-query");

  function filterSidebarStudios(query) {
    const q = (query || "").toLowerCase().trim();
    const studioLinks = $$("#sidebar-content-craft-studios .nav-link");
    let matchCount = 0;

    if (sidebarStudioClear) {
      sidebarStudioClear.style.display = q ? "inline-block" : "none";
    }

    if (q) {
      const craftSec = $("#sidebar-section-craft-studios");
      if (craftSec?.classList.contains("collapsed")) {
        craftSec.classList.remove("collapsed");
        $("[data-action='toggle-sidebar-section'][data-section='craft-studios']")?.setAttribute("aria-expanded", "true");
      }
    }

    studioLinks.forEach(link => {
      const name = link.textContent.toLowerCase();
      const keywords = (link.dataset.keywords || "").toLowerCase();
      const view = (link.dataset.view || "").toLowerCase();
      const matches = !q || name.includes(q) || keywords.includes(q) || view.includes(q);
      link.style.display = matches ? "" : "none";
      if (matches) matchCount++;
    });

    if (sidebarStudioNoResults) {
      sidebarStudioNoResults.style.display = (q && matchCount === 0) ? "block" : "none";
      if (sidebarStudioQuerySpan) sidebarStudioQuerySpan.textContent = q;
    }
  }

  sidebarStudioInput?.addEventListener("input", (e) => {
    filterSidebarStudios(e.target.value);
  });

  sidebarStudioClear?.addEventListener("click", () => {
    if (sidebarStudioInput) {
      sidebarStudioInput.value = "";
      filterSidebarStudios("");
      sidebarStudioInput.focus();
    }
  });

  sidebarStudioInput?.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      sidebarStudioInput.value = "";
      filterSidebarStudios("");
    } else if (e.key === "Enter") {
      const firstMatch = $("#sidebar-content-craft-studios .nav-link:not([style*='display: none'])");
      if (firstMatch?.dataset.view) {
        switchView(firstMatch.dataset.view);
      }
    }
  });

  // 🛠️ Workshop Suites Search in Sidebar
  const sidebarSuiteInput = $("#sidebar-suite-search");
  const sidebarSuiteClear = $("#sidebar-suite-search-clear");
  const sidebarSuiteNoResults = $("#sidebar-suites-no-results");
  const sidebarSuiteQuerySpan = $("#sidebar-suites-query");

  function filterSidebarSuites(query) {
    const q = (query || "").toLowerCase().trim();
    const suiteLinks = $$("#sidebar-content-workshop-suites .nav-link");
    let matchCount = 0;

    if (sidebarSuiteClear) {
      sidebarSuiteClear.style.display = q ? "inline-block" : "none";
    }

    if (q) {
      const suiteSec = $("#sidebar-section-workshop-suites");
      if (suiteSec?.classList.contains("collapsed")) {
        suiteSec.classList.remove("collapsed");
        $("[data-action='toggle-sidebar-section'][data-section='workshop-suites']")?.setAttribute("aria-expanded", "true");
      }
    }

    suiteLinks.forEach(link => {
      const name = link.textContent.toLowerCase();
      const keywords = (link.dataset.keywords || "").toLowerCase();
      const action = (link.dataset.action || "").toLowerCase();
      const matches = !q || name.includes(q) || keywords.includes(q) || action.includes(q);
      link.style.display = matches ? "" : "none";
      if (matches) matchCount++;
    });

    if (sidebarSuiteNoResults) {
      sidebarSuiteNoResults.style.display = (q && matchCount === 0) ? "block" : "none";
      if (sidebarSuiteQuerySpan) sidebarSuiteQuerySpan.textContent = q;
    }
  }

  sidebarSuiteInput?.addEventListener("input", (e) => {
    filterSidebarSuites(e.target.value);
  });

  sidebarSuiteClear?.addEventListener("click", () => {
    if (sidebarSuiteInput) {
      sidebarSuiteInput.value = "";
      filterSidebarSuites("");
      sidebarSuiteInput.focus();
    }
  });

  sidebarSuiteInput?.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      sidebarSuiteInput.value = "";
      filterSidebarSuites("");
    } else if (e.key === "Enter") {
      const firstMatch = $("#sidebar-content-workshop-suites .nav-link:not([style*='display: none'])");
      if (firstMatch) firstMatch.click();
    }
  });

  // Ensure CAD file input change listener is permanently attached on startup
  $("#cad-file-input")?.addEventListener("change", e => {
    if (e.target.files && e.target.files[0]) {
      loadCadFile(e.target.files[0]);
    }
  });

  // 💡 Project Ideas Listeners
  ["#idea-search", "#idea-category-filter", "#idea-status-filter", "#idea-priority-filter"].forEach(sel => {
    $(sel)?.addEventListener("input", renderIdeasView);
    $(sel)?.addEventListener("change", renderIdeasView);
  });


  // Expanded Resin & Silicone Studio Listeners
  ["#resin-thermal-type", "#resin-thermal-depth", "#resin-thermal-volume", "#resin-thermal-ambient"].forEach(s => $(s)?.addEventListener("input", updateResinThermalWatchdog));
  ["#resin-thermal-type", "#resin-thermal-depth"].forEach(s => $(s)?.addEventListener("change", updateResinThermalWatchdog));
  ["#silicone-box-l", "#silicone-box-w", "#silicone-box-d", "#silicone-master-vol"].forEach(s => $(s)?.addEventListener("input", updateSiliconeMoldCalc));
  $("#silicone-mix-type")?.addEventListener("change", updateSiliconeMoldCalc);
  ["#silicone-shore-picker", "#silicone-arch-type"].forEach(s => $(s)?.addEventListener("change", updateSiliconeShore));
  $("#resin-embed-mat")?.addEventListener("change", updateResinEmbed);
  $("#resin-wood-mc")?.addEventListener("input", updateResinEmbed);

  // Expanded Jewelry Studio Listeners
  ["#jewelry-wire-gauge", "#jewelry-wire-temper", "#jewelry-wire-alloy"].forEach(s => $(s)?.addEventListener("change", updateJewelryWireGauge));
  $("#jewelry-mohs-search")?.addEventListener("input", updateJewelryMohs);
  $("#jewelry-mohs-filter")?.addEventListener("change", updateJewelryMohs);
  ["#jewelry-polish-start", "#jewelry-polish-metal"].forEach(s => $(s)?.addEventListener("change", updateJewelryPolishing));


  // 🌿 Botanical Distillation & Extracts Studio Listeners
  renderDistillationView();
  ["#distill-botanical-select", "#distill-harvest-state", "#distill-still-type"].forEach(s => $(s)?.addEventListener("change", updateSteamDistillCalc));
  ["#distill-plant-weight", "#distill-boiler-liters", "#distill-custom-yield"].forEach(s => $(s)?.addEventListener("input", updateSteamDistillCalc));
  ["#distill-extract-mode", "#distill-marc-ratio"].forEach(s => $(s)?.addEventListener("change", updateSolventExtractCalc));
  $("#distill-marc-grams")?.addEventListener("input", updateSolventExtractCalc);
  ["#distill-start-abv", "#distill-target-abv"].forEach(s => $(s)?.addEventListener("change", updateAlcoholDilutionCalc));
  $("#distill-target-volume")?.addEventListener("input", updateAlcoholDilutionCalc);
  ["#distill-hydrosol-type", "#distill-preservation-method"].forEach(s => $(s)?.addEventListener("change", updateHydrosolPreservation));
  ["#distill-run-name", "#distill-run-date", "#distill-run-source"].forEach(s => $(s)?.addEventListener("input", () => {}));

    // 🕯️ Candle Making Studio Listeners
  renderCandleView();
  ["#candle-wax-type", "#candle-vessel-mode", "#candle-vol-unit"].forEach(s => $(s)?.addEventListener("change", updateCandleCalc));
  ["#candle-vessel-vol", "#candle-dim-dia", "#candle-dim-hgt", "#candle-count"].forEach(s => $(s)?.addEventListener("input", updateCandleCalc));
  $("#candle-fragrance-range")?.addEventListener("input", (e) => {
    const valInput = $("#candle-fragrance-pct");
    if (valInput) valInput.value = e.target.value;
    updateCandleCalc();
  });
  $("#candle-fragrance-pct")?.addEventListener("input", (e) => {
    const rangeInput = $("#candle-fragrance-range");
    if (rangeInput) rangeInput.value = e.target.value;
    updateCandleCalc();
  });
  ["#candle-wick-dia", "#candle-wick-family"].forEach(s => $(s)?.addEventListener("change", updateCandleWick));
  $("#candle-wax-type")?.addEventListener("change", updateCandleCure);
  ["#candle-label-brand", "#candle-label-scent", "#candle-label-net"].forEach(s => $(s)?.addEventListener("input", updateCandleSafety));

  // 🌸 Perfume & Fragrance Studio Listeners
  renderPerfumeView();
  ["#perfume-bottle-size", "#perfume-conc-category", "#perfume-carrier-type"].forEach(s => $(s)?.addEventListener("change", updatePerfumeDilution));
  $("#perfume-custom-size")?.addEventListener("input", updatePerfumeDilution);
  ["#perfume-range-top", "#perfume-range-heart", "#perfume-range-base"].forEach(s => $(s)?.addEventListener("input", updatePerfumePyramid));
  $("#perfume-ifra-ing")?.addEventListener("change", updatePerfumeIfra);
  ["#perfume-log-name", "#perfume-log-date", "#perfume-log-notes"].forEach(s => $(s)?.addEventListener("input", updatePerfumeMaceration));

  // ✉️ Letter Planning & Wax Seal Studio Listeners
  renderLetterView();
  ["#letter-tone-select", "#letter-recipient", "#letter-dateline"].forEach(s => $(s)?.addEventListener("input", updateLetterDraft));
  $("#letter-tone-select")?.addEventListener("change", updateLetterDraft);
  $("#letter-body-text")?.addEventListener("input", updateLetterDraft);
  ["#letter-paper-gsm", "#letter-envelope-type"].forEach(s => $(s)?.addEventListener("change", updateLetterPaper));
  ["#letter-pen-nib", "#letter-ink-type"].forEach(s => $(s)?.addEventListener("change", updateLetterPen));
  ["#wax-stamp-dia", "#wax-color-primary", "#wax-color-accent", "#wax-flex-grade"].forEach(s => $(s)?.addEventListener("change", updateWaxSealDesigner));
  $("#wax-seal-batch")?.addEventListener("input", updateWaxSealDesigner);

    // Restore Collapsible Sidebar Groups (Your Space & Craft Studios)
  restoreSidebarSections();

  // Client Quote & Estimate Form Listeners
  ["#quote-project-select", "#quote-payment-terms"].forEach(s => $(s)?.addEventListener("change", (e) => {
    if (e.target.id === "quote-project-select") {
      activeQuoteProjectId = e.target.value;
      const proj = state.projects.find(p => p.id === activeQuoteProjectId);
      if (proj && $("#quote-scope-notes")) {
        $("#quote-scope-notes").value = proj.description || `Custom fabrication for ${proj.title}.`;
      }
    }
    renderQuoteInvoice();
  }));
  ["#quote-client-name", "#quote-client-contact", "#quote-labor-rate", "#quote-labor-hours", "#quote-labor-desc", "#quote-material-markup", "#quote-shop-fee", "#quote-tax-rate", "#quote-deposit-pct", "#quote-scope-notes"].forEach(s => $(s)?.addEventListener("input", renderQuoteInvoice));

  const instSelect = $("#music-main-instrument");
  if (instSelect) {
    const saved = localStorage.getItem("workbench_music_instrument");
    if (saved) instSelect.value = saved;
    instSelect.addEventListener("change", (e) => {
      const val = e.target.value;
      try { localStorage.setItem("workbench_music_instrument", val); } catch {}
      const activeChord = chordStudioState.slots[chordStudioState.selectedSlotIndex]?.chord || "Cmaj7";
      playChordVoicing(activeChord, 1.2);
      const names = { rhodes: "🎹 Rhodes E-Piano", pad: "🌊 Warm Analog Pad", chiptune: "👾 8-Bit Chiptune", organ: "⛪ Cathedral Organ" };
      showToast(`Sound changed to ${names[val] || val}`);
    });
  }

  ["#wood-view-t", "#wood-view-w", "#wood-view-l", "#wood-view-qty", "#wood-view-price", "#wood-view-species", "#wood-view-width-in", "#wood-view-rh-delta", "#wood-view-sides", "#wood-view-screw"].forEach(sel => {
    $(sel)?.addEventListener("input", updateWoodworkingStudio);
    $(sel)?.addEventListener("change", updateWoodworkingStudio);
  });

  $("#textiles-yarn-weight-select")?.addEventListener("change", updateTextilesYarnWeightView);
  $("#stitch-view-preset")?.addEventListener("change", (e) => {
    if (typeof loadStitchPreset === "function") {
      loadStitchPreset(e.target.value);
      syncStitchViewUI();
    }
  });
  $("#stitch-view-custom-color")?.addEventListener("input", (e) => {
    if (typeof stitchStudioState !== "undefined") {
      stitchStudioState.activeColor = e.target.value;
      syncStitchViewUI();
    }
  });
  $("#stitch-view-symbols")?.addEventListener("change", syncStitchViewUI);

  $("#stitch-matrix-preset")?.addEventListener("change", (e) => {
    const val = e.target.value;
    const customWrap = $("#stitch-custom-dim-wrap");
    if (val === "custom") {
      if (customWrap) customWrap.style.display = "inline-flex";
    } else {
      if (customWrap) customWrap.style.display = "none";
      const parts = val.split("x");
      if (parts.length === 2) {
        resizeStitchMatrix(parseInt(parts[0], 10), parseInt(parts[1], 10));
      }
    }
  });

  $("#stitch-display-mode")?.addEventListener("change", (e) => {
    if (typeof stitchStudioState !== "undefined") {
      stitchStudioState.displayMode = e.target.value;
      renderStitchGrid();
    }
  });

  $("#stitch-pattern-type")?.addEventListener("change", (e) => {
    if (typeof stitchStudioState !== "undefined") {
      stitchStudioState.patternType = e.target.value;
      updateStitchInstructions();
    }
  });

  $("#textiles-repeat-length")?.addEventListener("input", updateTextilesRowDisplay);

  ["#crochet-shape-type", "#crochet-stitch-type", "#crochet-target-sts"].forEach(sel => {
    $(sel)?.addEventListener("change", updateAmigurumiGenerator);
  });
  $("#crochet-stagger-inc")?.addEventListener("change", updateAmigurumiGenerator);

  ["#sew-piece-w", "#sew-piece-l", "#sew-piece-qty", "#sew-convert-yds-45"].forEach(sel => {
    $(sel)?.addEventListener("input", updateSewingCuttingCalc);
  });
  ["#sew-sa-select", "#sew-hem-select"].forEach(sel => {
    $(sel)?.addEventListener("change", updateSewingCuttingCalc);
  });

  $("#sew-fabric-type")?.addEventListener("change", updateSewingNeedleGuide);
  $("#textiles-needle-convert-select")?.addEventListener("change", updateNeedleHookConverter);

  initStitchBoardInteraction();

  ["#elec-res-band1", "#elec-res-band2", "#elec-res-mult", "#elec-res-tol"].forEach(sel => {
    $(sel)?.addEventListener("change", updateResistorColorView);
  });
  ["#elec-ohms-v", "#elec-ohms-i", "#elec-ohms-r", "#elec-ohms-p"].forEach(sel => {
    $(sel)?.addEventListener("input", updateOhmsLawStudio);
  });
  ["#elec-led-vs", "#elec-led-vf", "#elec-led-i"].forEach(sel => {
    $(sel)?.addEventListener("input", updateLedResistorView);
    $(sel)?.addEventListener("change", updateLedResistorView);
  });
  ["#elec-batt-mah", "#elec-batt-ma"].forEach(sel => {
    $(sel)?.addEventListener("input", updateBatteryRuntimeView);
  });

  $("#prog-base-dec")?.addEventListener("input", (e) => updateProgBaseFromValue(parseInt(e.target.value, 10) || 0, "dec"));
  $("#prog-base-hex")?.addEventListener("input", (e) => updateProgBaseFromValue(parseInt(e.target.value.replace(/^0x/i, ''), 16) || 0, "hex"));
  $("#prog-base-bin")?.addEventListener("input", (e) => updateProgBaseFromValue(parseInt(e.target.value.replace(/[^01]/g, ''), 2) || 0, "bin"));
  $("#prog-base-ascii")?.addEventListener("input", (e) => updateProgBaseFromValue(e.target.value.charCodeAt(0) || 0, "ascii"));
  $("#prog-mcu-select")?.addEventListener("change", updateMcuBoardView);
  $("#prog-snippet-select")?.addEventListener("change", updateProgSnippetView);

  $("#art-view-base-color")?.addEventListener("input", updateArtStudioPalette);
  $("#art-view-harmony-rule")?.addEventListener("change", updateArtStudioPalette);
  $("#art-view-dim-mode")?.addEventListener("change", updateArtGoldenRatioView);
  $("#art-view-dim-val")?.addEventListener("input", updateArtGoldenRatioView);
  ["#art-box-l", "#art-box-w", "#art-box-d"].forEach(sel => $(sel)?.addEventListener("input", updateArtBoxNetView));
  ["#art-print-g", "#art-print-spool"].forEach(sel => $(sel)?.addEventListener("input", updateArt3DPrintView));
  $("#art-laser-spot")?.addEventListener("input", updateArtLaserKerfView);

  updateWoodworkingStudio();
  updateWoodSafetyGuide();
  updateTextilesRowDisplay();
  updateTextilesYarnWeightView();
  if (typeof updateTextilesYardageCalc === "function") updateTextilesYardageCalc();
  if (typeof updateTextilesGaugeCalc === "function") updateTextilesGaugeCalc();
  updateTextilesFiberGuide();
  updateAmigurumiGenerator();
  updateSewingCuttingCalc();
  updateSewingNeedleGuide();
  updateNeedleHookConverter();
  updateResistorColorView();
  updateOhmsLawStudio();
  updateLedResistorView();
  updateBatteryRuntimeView();
  updatePassiveFilterCalc();
  renderFretboardUI();
  updateProgBaseFromValue(progRegisterValue, "init");
  updateMcuBoardView();
  updateProgSnippetView();
  updateProgAluCalc();
  formatProgByteArray();
  updateProgBaudCalc();
  updateProgCrcCalc();
  updateArtStudioPalette();
  updateArtGoldenRatioView();
  updateArtBoxNetView();
  updateArt3DPrintView();
  updateArtLaserKerfView();
  updateArtContrastCalc();
  updateArtGradientStudio();
  updateArtPrintResCalc();
  updateArtCvdView();
  populateUnitDropdowns($("#tool-unit-category")?.value || "length");
  updateUniversalUnitConverter();

  // Tablet & Desktop Sidebar state
  initSidebarMinimize();

  // Restore any saved collapsed/minimized panels
  applyInitialCollapsedPanels();

  // Live drum pads touch latency binding
  const drumWrap = $(".live-drum-pads-wrap");
  if (drumWrap && !drumWrap.dataset.touchBound) {
    drumWrap.dataset.touchBound = "true";
    drumWrap.addEventListener("pointerdown", (e) => {
      const pad = e.target.closest(".live-drum-pad");
      if (!pad) return;
      const drum = pad.dataset.drum;
      if (drum) {
        pad._lastPointerTime = Date.now();
        hitLiveDrumPad(drum);
      }
    });
  }

  // Restore floating timer if minimized
  if (localStorage.getItem("workbench_timer_minimized") === "true") {
    const floatWidget = $("#floating-timer-widget");
    if (floatWidget) floatWidget.style.display = "flex";
  }
}

window.addEventListener("DOMContentLoaded", initCraftStudios);


