/* ============================================================
   Workbench Project Journal - System Constants & Configuration
   ============================================================ */

const DB_NAME = "workbench-project-journal";
const DB_VERSION = 1;
const STORE_NAME = "workspace";
const STATE_KEY = "main";
const XP_PER_LEVEL = 100;
const CLOUD_CONFIG_KEY = "workbench-cloud-config";
const CLOUD_SESSION_KEY = "workbench-cloud-session";
const CLOUD_SYNC_KEY = "workbench-cloud-last-sync";
const CLOUD_PKCE_KEY = "workbench-cloud-pkce";
const CLOUD_TABLE = "workbench_workspace";
const PHOTO_BUCKET = "workbench-photos";

// ZERO DEFAULTS: Clean slate - no starter skills
const STARTER_SKILLS = [];


const STATUS_LABELS = {
  "in-progress": "In progress",
  planned: "Planned",
  completed: "Completed",
  postponed: "Postponed",
  "on-hold": "On hold"
};

const PROJECT_TEMPLATES = {
  craft: {
    title: "Woodworking / Craft Build",
    description: "Handcrafted physical piece. Focused on precision, joinery, and clean finish.",
    status: "in-progress",
    priority: "normal",
    tags: ["workshop", "craft", "handmade"],
    skillNames: ["Woodworking"],
    tasks: [
      "Gather measurements & create dimension sketch",
      "Source lumber / materials & hardware",
      "Rough cut parts to length",
      "Cut joinery & test dry fit",
      "Glue-up and clamping",
      "Sand progression (80 -> 120 -> 220 grit)",
      "Apply protective finish coat"
    ]
  },
  crochet: {
    title: "Crochet Garment / Amigurumi",
    description: "Fiber art crochet project. Tension swatch, stitch repeats, and neat assembly.",
    status: "in-progress",
    priority: "normal",
    tags: ["crochet", "yarn", "fiberarts", "handmade"],
    skillNames: ["Crochet"],
    tasks: [
      "Select yarn weight, fiber content & hook size",
      "Work 4x4\" gauge swatch & measure tension",
      "Cast on foundation chain / magic ring",
      "Work pattern repeats & count rows",
      "Increase/decrease shaping sections",
      "Weave in loose yarn ends with tapestry needle",
      "Wet block / steam block finished piece"
    ]
  },
  knitting: {
    title: "Knitted Garment / Accessory",
    description: "Hand-knit sweater, scarf, or socks. Gauge swatch, stitch markers, and blocking.",
    status: "in-progress",
    priority: "normal",
    tags: ["knitting", "yarn", "fiberarts", "apparel"],
    skillNames: ["Knitting"],
    tasks: [
      "Swatch gauge on recommended circular/straight needles",
      "Calculate cast-on stitches from gauge sizing",
      "Work ribbed hem / cuff border",
      "Work main body pattern & place stitch markers",
      "Shape neckline / armholes / raglan decreases",
      "Kitchener stitch graft or bind off loosely",
      "Block on foam mats with T-pins to final measurements"
    ]
  },
  art: {
    title: "Fine Art Painting / Illustration",
    description: "Studio artwork exploration. Composition thumbnailing, color palette harmony, and layering.",
    status: "in-progress",
    priority: "normal",
    tags: ["art", "painting", "studio", "visual"],
    skillNames: ["Painting", "Drawing"],
    tasks: [
      "Rough thumbnail compositions & focal points",
      "Prepare surface (gesso canvas / prime wood panel)",
      "Mix core color palette & harmonize values",
      "Underpainting / tonal block-in (imprimatura)",
      "Develop mid-tones, form shadows, and color temperature",
      "Refine fine detail, highlights, and edge transitions",
      "Apply archival varnish coat once cured"
    ]
  },
  music: {
    title: "Music Track & Audio Production",
    description: "Original composition, audio recording, arrangement, mixing, and mastering.",
    status: "in-progress",
    priority: "high",
    tags: ["music", "audio", "production", "songwriting"],
    skillNames: ["Music Production", "Sound Design"],
    tasks: [
      "Establish tempo (BPM), key signature & groove draft",
      "Compose chord progression & melodic hook",
      "Track rhythm section (drums, bass, percussion)",
      "Record lead instruments & vocal takes",
      "Arrange structure (intro, verse, chorus, bridge, outro)",
      "Mix balance: EQ carved frequencies & synced delay/reverb",
      "Master export: loudness LUFS check & mono compatibility"
    ]
  },
  leather: {
    title: "Leathercraft & Hand Sewing",
    description: "Precision leather goods. Pattern cutting, edge beveling, saddle stitching, and burnishing.",
    status: "in-progress",
    priority: "normal",
    tags: ["leathercraft", "stitching", "handmade", "edc"],
    skillNames: ["Leathercraft"],
    tasks: [
      "Print / scribe pattern onto veg-tan leather",
      "Cut panels clean with rotary blade / utility knife",
      "Groove stitch line & punch stitching chisel holes",
      "Skive / thin pocket edges for minimal bulk",
      "Saddle stitch with waxed thread & two harness needles",
      "Sand edge progression (220 -> 400 -> 800 grit)",
      "Bevel edges & burnish with Tokonole / beeswax"
    ]
  },
  electronics: {
    title: "Electronics / Hardware Prototype",
    description: "Custom embedded device / circuit build. Breadboard to final enclosure.",
    status: "in-progress",
    priority: "high",
    tags: ["electronics", "hardware", "diy", "iot"],
    skillNames: ["Electronics"],
    tasks: [
      "Draft schematic & pinout diagram",
      "Order components & microcontroller",
      "Breadboard test circuit & flash initial firmware",
      "Verify sensor readings & logic",
      "Solder protoboard or design PCB",
      "Design 3D printed enclosure"
    ]
  },
  software: {
    title: "Software / Web App MVP",
    description: "Lean minimum viable product focused on solving one problem elegantly.",
    status: "in-progress",
    priority: "normal",
    tags: ["code", "software", "mvp"],
    skillNames: ["Programming"],
    tasks: [
      "Define user stories & essential scope",
      "Setup repo & boilerplate architecture",
      "Implement core data model & persistence",
      "Build primary UI flow",
      "Test edge cases & error handling",
      "Deploy & gather initial user feedback"
    ]
  },
  study: {
    title: "Learning & Skill Sprint",
    description: "Focused study sprint to level up a specific craft or discipline.",
    status: "in-progress",
    priority: "normal",
    tags: ["learning", "practice", "study"],
    skillNames: [],
    tasks: [
      "Pick top learning resource / curriculum",
      "Complete fundamentals module",
      "Build first hands-on exercise project",
      "Log daily practice sessions",
      "Document key takeaways & build portfolio piece"
    ]
  },
  "3dprint": {
    title: "3D Printing & Design",
    description: "CAD modeling, slicing, and 3D printing a custom functional part or enclosure.",
    status: "in-progress",
    priority: "normal",
    tags: ["3dprinting", "cad", "fabrication"],
    skillNames: ["3D modeling"],
    tasks: [
      "Take caliper measurements of interface points",
      "Model CAD geometry in Fusion/FreeCAD",
      "Export STL/STEP & slice test print",
      "Inspect test fit and adjust tolerances",
      "Print final model in desired filament",
      "Post-process (deburr, insert heat-set inserts)"
    ]
  }
};


// ZERO DEFAULTS: Clean slate - no starter ideas
const STARTER_IDEAS = [];

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
  robotics: { name: "Robotics & Mechatronics", icon: "🤖" },
  bicycle: { name: "Bicycle Framebuilding", icon: "🚲" },
  candle: { name: "Candle & Wax Studio", icon: "🕯️" },
  perfume: { name: "Perfume & Botanical Distillation", icon: "🌿" },
  letter: { name: "Letter & Correspondence Studio", icon: "✉️" },
  general: { name: "General Craft", icon: "✨" }
};

const VALID_APP_VIEWS = new Set([
  "overview", "projects", "ideas", "skills", "gallery", "planner", "sync",
  "timeline", "shopping", "inventory", "admin", "music", "woodworking",
  "textiles", "electronics", "programming", "art", "resin", "printing",
  "origami", "laser", "leather", "ceramics", "welding", "cnc", "blacksmith",
  "fasteners", "glass", "jewelry", "bookbinding", "sla", "luthier",
  "composites", "horology", "robotics", "bicycle", "candle", "perfume",
  "letter", "distillation"
]);

if (typeof window !== "undefined") {
  window.DB_NAME = DB_NAME;
  window.DB_VERSION = DB_VERSION;
  window.STORE_NAME = STORE_NAME;
  window.STATE_KEY = STATE_KEY;
  window.XP_PER_LEVEL = XP_PER_LEVEL;
  window.CLOUD_CONFIG_KEY = CLOUD_CONFIG_KEY;
  window.CLOUD_SESSION_KEY = CLOUD_SESSION_KEY;
  window.CLOUD_SYNC_KEY = CLOUD_SYNC_KEY;
  window.CLOUD_PKCE_KEY = CLOUD_PKCE_KEY;
  window.CLOUD_TABLE = CLOUD_TABLE;
  window.PHOTO_BUCKET = PHOTO_BUCKET;
  window.STARTER_SKILLS = STARTER_SKILLS;
  window.STATUS_LABELS = STATUS_LABELS;
  window.PROJECT_TEMPLATES = PROJECT_TEMPLATES;
  window.STARTER_IDEAS = STARTER_IDEAS;
  window.IDEA_CATEGORIES = IDEA_CATEGORIES;
  window.VALID_APP_VIEWS = VALID_APP_VIEWS;
}
