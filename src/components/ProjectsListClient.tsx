'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Project, SkillCatalog, Currency } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import {
  FolderKanban,
  Plus,
  Users,
  Target,
  Trophy,
  ArrowRight,
  X,
  Loader2,
  Sparkles,
  Check,
  Boxes,
  FlaskConical,
  Printer,
  Palette,
} from 'lucide-react';
import SkillSelector from '@/components/SkillSelector';

interface ProjectsListClientProps {
  initialProjects: any[];
  catalogSkills: SkillCatalog[];
  userId: string;
}

interface StarterBlueprint {
  id: string;
  name: string;
  badge: string;
  description: string;
  icon: any;
  defaultXp: number;
  skillKeywords: string[];
  tasks: Array<{
    title: string;
    description: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    xp_reward: number;
    subtasks: Array<{ id: string; title: string; completed: boolean }>;
  }>;
}

const STARTER_BLUEPRINTS: StarterBlueprint[] = [
  {
    id: 'blank',
    name: 'Blank Project',
    badge: 'Custom',
    description: 'Empty board ready for custom objectives, milestones, and ad-hoc tasks.',
    icon: FolderKanban,
    defaultXp: 100,
    skillKeywords: [],
    tasks: [],
  },
  {
    id: 'resin-mold',
    name: 'Resin & Mold Casting Run',
    badge: 'Casting',
    description: 'Master prep & sealing, silicone degassing, test cast, and wet-sanding.',
    icon: Boxes,
    defaultXp: 150,
    skillKeywords: ['resin', 'mold', 'casting', 'craft'],
    tasks: [
      {
        title: 'Master Model Prep & Sealing',
        description: 'Inspect 3D print or clay master, fill micro-imperfections, apply 2 gloss seal coats, and affix to mold base.',
        priority: 'HIGH',
        xp_reward: 35,
        subtasks: [
          { id: 'sb-1-1', title: 'Sand master model up to 1000 grit finish', completed: false },
          { id: 'sb-1-2', title: 'Apply 2 coats of gloss clear acrylic sealant', completed: false },
          { id: 'sb-1-3', title: 'Affix to mold box base and seal edges against leaks', completed: false },
        ],
      },
      {
        title: 'Silicone Mold Pour & Vacuum Degas',
        description: 'Calculate silicone volume by displacement, mix Part A & B 1:1, degas at -29 inHg, and pour slow ribbon.',
        priority: 'HIGH',
        xp_reward: 45,
        subtasks: [
          { id: 'sb-2-1', title: 'Measure Part A & B in precise 1:1 ratio by gram scale', completed: false },
          { id: 'sb-2-2', title: 'Degas in vacuum chamber for 5 mins until bubbling subsides', completed: false },
          { id: 'sb-2-3', title: 'Pour in slow thin ribbon into lowest corner and cure 12h', completed: false },
        ],
      },
      {
        title: 'Test Resin Casting & Color Swatch',
        description: 'Mix polyurethane or epoxy casting resin with chosen mica pigments or alcohol dyes.',
        priority: 'MEDIUM',
        xp_reward: 40,
        subtasks: [
          { id: 'sb-3-1', title: 'Preheat silicone mold cavity and apply light mold release mist', completed: false },
          { id: 'sb-3-2', title: 'Mix resin with UV inhibitor and metallic swirl pigments', completed: false },
          { id: 'sb-3-3', title: 'Demold after full cure and inspect for bubble pits or voids', completed: false },
        ],
      },
      {
        title: 'Sanding, Polishing & Findings Assembly',
        description: 'Trim sprues/flashing, wet-sand edges through micro-mesh pads, and attach hardware or base.',
        priority: 'MEDIUM',
        xp_reward: 30,
        subtasks: [
          { id: 'sb-4-1', title: 'Clip off pour sprues with flush cutters', completed: false },
          { id: 'sb-4-2', title: 'Wet sand bottom flat from 400 to 3000 grit', completed: false },
          { id: 'sb-4-3', title: 'Buff with compound polishing paste and install hardware', completed: false },
        ],
      },
    ],
  },
  {
    id: 'perfume-lab',
    name: 'Perfume Accord & Dilution Lab',
    badge: 'Fragrance',
    description: 'Scent pyramid formulation, 10ml concentrate test, alcohol dilution, and 2-week maceration check.',
    icon: FlaskConical,
    defaultXp: 150,
    skillKeywords: ['perfume', 'fragrance', 'scent', 'chemistry'],
    tasks: [
      {
        title: 'Scent Pyramid Formulation & Formula Sheet',
        description: 'Design fragrance architecture balancing volatile top notes, floral/spice heart, and fixative base notes.',
        priority: 'HIGH',
        xp_reward: 35,
        subtasks: [
          { id: 'sp-1-1', title: 'Select base fixatives (ambroxan, cedarwood, vanilla, benzoin)', completed: false },
          { id: 'sp-1-2', title: 'Select heart florals/aromatics (rose otto, lavender, cardamom)', completed: false },
          { id: 'sp-1-3', title: 'Balance sparkling top notes (bergamot, pink pepper, grapefruit)', completed: false },
        ],
      },
      {
        title: '10ml Test Concentrate Blend',
        description: 'Precision drop-by-drop or 0.001g scale compounding of raw aromatic materials.',
        priority: 'HIGH',
        xp_reward: 45,
        subtasks: [
          { id: 'sp-2-1', title: 'Tare precision milligram scale with clean 20ml amber glass beaker', completed: false },
          { id: 'sp-2-2', title: 'Dispense each raw aroma chemical and record exact batch gram weight', completed: false },
          { id: 'sp-2-3', title: 'Swirl gently with glass rod and rest concentrate for 24h blend time', completed: false },
        ],
      },
      {
        title: 'Alcohol Dilution & Maceration Log',
        description: 'Dilute concentrate to Eau de Parfum concentration (15-20%) with SDA 40-B 200-proof ethanol.',
        priority: 'MEDIUM',
        xp_reward: 40,
        subtasks: [
          { id: 'sp-3-1', title: 'Add 80% weight Perfumer Alcohol and 0.5% distilled water', completed: false },
          { id: 'sp-3-2', title: 'Store in dark UV-resistant amber bottle at 18-20°C', completed: false },
          { id: 'sp-3-3', title: 'Dip fragrance test strips at Day 2, Day 7, and Day 14; log changes', completed: false },
        ],
      },
      {
        title: 'Filtration, Bottling & Custom Labeling',
        description: 'Chill-filter out precipitants, fill atomizer bottle, and crimp sprayer.',
        priority: 'MEDIUM',
        xp_reward: 30,
        subtasks: [
          { id: 'sp-4-1', title: 'Chill bottle to 4°C for 12 hours and pass through lab filter paper', completed: false },
          { id: 'sp-4-2', title: 'Fill 30ml glass atomizer using pipette', completed: false },
          { id: 'sp-4-3', title: 'Apply vinyl waterproof bottle label and batch serial number', completed: false },
        ],
      },
    ],
  },
  {
    id: '3d-prototype',
    name: '3D Print & Prototype Build',
    badge: 'Digital Fab',
    description: 'CAD modeling, slicer toolpaths, first-layer calibration, and post-processing assembly.',
    icon: Printer,
    defaultXp: 150,
    skillKeywords: ['3d', 'print', 'cad', 'prototyping', 'engineering'],
    tasks: [
      {
        title: 'CAD Modeling & Slicing Optimization',
        description: 'Design functional geometry in CAD, export STEP file, and tune slicer wall loops and infill.',
        priority: 'HIGH',
        xp_reward: 35,
        subtasks: [
          { id: 's3d-1-1', title: 'Export clean STEP file and orient for minimal support overhangs', completed: false },
          { id: 's3d-1-2', title: 'Configure 3 walls, 20% gyroid infill, and 0.16mm layer height', completed: false },
          { id: 's3d-1-3', title: 'Review sliced toolpaths and verify retraction seams', completed: false },
        ],
      },
      {
        title: 'First Test Print & Tolerance Gauge',
        description: 'Print initial calibration piece to check snap-fit tolerances, hole shrinkages, and bed adhesion.',
        priority: 'HIGH',
        xp_reward: 45,
        subtasks: [
          { id: 's3d-2-1', title: 'Clean PEI sheet with 99% IPA and calibrate z-offset', completed: false },
          { id: 's3d-2-2', title: 'Monitor first layer deposition speed and line squash', completed: false },
          { id: 's3d-2-3', title: 'Measure bearing pockets and press-fit pins with digital caliper', completed: false },
        ],
      },
      {
        title: 'Post-Processing & Hardware Assembly',
        description: 'Remove tree supports, insert brass heat-set M3 threaded inserts, and install fasteners.',
        priority: 'MEDIUM',
        xp_reward: 40,
        subtasks: [
          { id: 's3d-3-1', title: 'Pry off tree supports with needle-nose pliers', completed: false },
          { id: 's3d-3-2', title: 'Press M3 brass heat-set threaded inserts at 230°C soldering tip', completed: false },
          { id: 's3d-3-3', title: 'Fasten stainless steel hex screws and test moving mechanical fits', completed: false },
        ],
      },
      {
        title: 'Final Production Batch & G-Code Archive',
        description: 'Run multi-item build plate, record total grams used and electricity runtime cost.',
        priority: 'MEDIUM',
        xp_reward: 30,
        subtasks: [
          { id: 's3d-4-1', title: 'Pack full build plate with nesting arrangement', completed: false },
          { id: 's3d-4-2', title: 'Log filament spool tare weight and net material consumption', completed: false },
          { id: 's3d-4-3', title: 'Archive verified 3MF and G-code file with profile notes', completed: false },
        ],
      },
    ],
  },
  {
    id: 'tabletop-pack',
    name: 'Illustration / Tabletop Asset Pack',
    badge: 'Art & Design',
    description: 'Character silhouettes, crisp inked linework, flat swatches, and VTT token export.',
    icon: Palette,
    defaultXp: 150,
    skillKeywords: ['art', 'illustration', 'drawing', 'design'],
    tasks: [
      {
        title: 'Concept Thumbnails & Silhouette Pass',
        description: 'Draft 8-10 rapid rough thumbnails focusing on dynamic readable silhouette and character proportions.',
        priority: 'HIGH',
        xp_reward: 35,
        subtasks: [
          { id: 'art-1-1', title: 'Generate 6 distinct thumbnail silhouettes on grid canvas', completed: false },
          { id: 'art-1-2', title: 'Pick top 2 designs and refine gesture/action poses', completed: false },
          { id: 'art-1-3', title: 'Align scale reference guide with standard 28mm miniature proportions', completed: false },
        ],
      },
      {
        title: 'Clean Lineart & Vector Inking',
        description: 'Establish crisp, confident contour lines with variable pressure weights for visual clarity.',
        priority: 'HIGH',
        xp_reward: 45,
        subtasks: [
          { id: 'art-2-1', title: 'Rough under-drawing pencil pass on 30% opacity layer', completed: false },
          { id: 'art-2-2', title: 'Ink main silhouette contours with heavy 8px vector brush', completed: false },
          { id: 'art-2-3', title: 'Detail internal texture lines, facial features, and equipment', completed: false },
        ],
      },
      {
        title: 'Flat Colors & Harmonized Swatch Palette',
        description: 'Block in local base colors, establish key lighting direction, and apply subtle warm/cool shadows.',
        priority: 'MEDIUM',
        xp_reward: 40,
        subtasks: [
          { id: 'art-3-1', title: 'Create distinct color palette with 6-8 core harmonious swatches', completed: false },
          { id: 'art-3-2', title: 'Fill flat color regions without hairline gaps', completed: false },
          { id: 'art-3-3', title: 'Add cel-shading shadow layer set to Multiply 40%', completed: false },
        ],
      },
      {
        title: 'Virtual Tabletop Token Export & Print Sheet',
        description: 'Mask into circular border tokens (Roll20 / Foundry VTT compatible) and lay out on printable card sheet.',
        priority: 'MEDIUM',
        xp_reward: 30,
        subtasks: [
          { id: 'art-4-1', title: 'Mask character into 512x512 transparent PNG token frame', completed: false },
          { id: 'art-4-2', title: 'Export web-optimized WebP tokens with drop shadows', completed: false },
          { id: 'art-4-3', title: 'Generate high-res 300 DPI A4 print sheet for physical punchboard tokens', completed: false },
        ],
      },
    ],
  },
];

export default function ProjectsListClient({
  initialProjects,
  catalogSkills,
  userId,
}: ProjectsListClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [projects, setProjects] = useState(initialProjects);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('blank');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [xpReward, setXpReward] = useState('100');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSelectBlueprint(bp: StarterBlueprint) {
    setSelectedTemplateId(bp.id);
    setName(bp.id === 'blank' ? '' : bp.name);
    setDescription(bp.description);
    setXpReward(String(bp.defaultXp));

    // Auto-select matching skills from catalog
    if (bp.skillKeywords.length > 0 && catalogSkills.length > 0) {
      const matched = catalogSkills.filter((s) => {
        const lowerName = s.name.toLowerCase();
        const lowerSlug = s.slug.toLowerCase();
        return bp.skillKeywords.some((kw) => lowerName.includes(kw) || lowerSlug.includes(kw));
      });
      if (matched.length > 0) {
        setSelectedSkillIds(matched.map((m) => m.id));
      }
    } else if (bp.id === 'blank') {
      setSelectedSkillIds([]);
    }
  }

  function toggleSkill(id: string) {
    setSelectedSkillIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Atomic project creation RPC
      const { data: newProjectId, error: rpcErr } = await supabase.rpc('create_maker_project', {
        p_name: name.trim(),
        p_description: description.trim(),
        p_completion_xp_reward: parseInt(xpReward, 10) || 100,
        p_skill_ids: selectedSkillIds,
        p_member_user_ids: [],
        p_budget_limit: Math.max(0, parseFloat(budgetLimit) || 0),
        p_currency: currency,
      });

      if (rpcErr) throw rpcErr;
      if (!newProjectId) throw new Error('Project creation failed: no ID returned');

      // 2. Seed starter tasks if a template blueprint was selected
      const blueprint = STARTER_BLUEPRINTS.find((b) => b.id === selectedTemplateId);
      if (blueprint && blueprint.tasks.length > 0) {
        const tasksToInsert = blueprint.tasks.map((task, idx) => ({
          project_id: newProjectId,
          title: task.title,
          description: task.description,
          status: 'TODO',
          priority: task.priority,
          xp_reward: task.xp_reward,
          assignee_id: userId,
          order_index: idx,
          subtasks: task.subtasks,
        }));

        const { error: seedErr } = await supabase.from('project_tasks').insert(tasksToInsert);
        if (seedErr) {
          console.warn('Failed to seed blueprint tasks:', seedErr.message);
        }
      }

      // 3. Immediately close modal and reset form
      setModalOpen(false);
      setName('');
      setDescription('');
      setXpReward('100');
      setSelectedSkillIds([]);
      setSelectedTemplateId('blank');

      // 4. Navigate directly to new project
      router.push(`/projects/${newProjectId}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200 pb-28 lg:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Projects &amp; Task Boards
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Collaborative workspaces with role governance, 1-click starter blueprints, and dual task/project XP payouts.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedTemplateId('blank');
            setName('');
            setDescription('');
            setXpReward('100');
            setSelectedSkillIds([]);
            setModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition self-start sm:self-auto min-h-[44px] touch-manipulation active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>＋ Create Project</span>
        </button>
      </div>

      {/* Projects Grid */}
      {projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((proj: any) => {
            const isPM = proj.pm_user_id === userId;
            const skills = (proj.skills || []).map((s: any) => s.skill).filter(Boolean);
            const members = proj.members || [];

            return (
              <Link
                key={proj.id}
                href={`/projects/${proj.id}`}
                className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:border-blue-400 dark:hover:border-blue-600 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        proj.status === 'ACTIVE'
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                          : proj.status === 'COMPLETED'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {proj.status}
                    </span>
                    {isPM && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-sm">
                        PM
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                    {proj.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {proj.description || 'No description provided.'}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  {/* Skills badges */}
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {skills.slice(0, 3).map((s: any) => (
                        <span
                          key={s.id}
                          className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        >
                          {s.name}
                        </span>
                      ))}
                      {skills.length > 3 && (
                        <span className="text-[11px] font-medium px-1.5 py-0.5 text-slate-400">
                          +{skills.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Team & Meta Footer */}
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>{members.length} {members.length === 1 ? 'member' : 'members'}</span>
                    </div>

                    <div className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                      <Trophy className="w-3.5 h-3.5" />
                      <span>+{proj.completion_xp_reward || 100} XP</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center font-bold mb-3">
            <FolderKanban className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            No projects found
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
            Projects give you a dedicated Kanban board, team member roles, and automatic XP distribution upon completion.
          </p>
          <button
            onClick={() => {
              setSelectedTemplateId('blank');
              setName('');
              setDescription('');
              setXpReward('100');
              setSelectedSkillIds([]);
              setModalOpen(true);
            }}
            className="inline-block mt-4 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 min-h-[44px] touch-manipulation active:scale-95"
          >
            ＋ Create First Project
          </button>
        </div>
      )}

      {/* Create Project Modal with 1-Click Starter Blueprints */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative max-h-[92vh] overflow-y-auto overscroll-contain">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition touch-manipulation active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <FolderKanban className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Create New Maker Project
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select a 1-click starter blueprint or start with a blank board.
                </p>
              </div>
            </div>

            {/* Starter Blueprint Selector */}
            <div className="mb-6">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                Starter Blueprint
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {STARTER_BLUEPRINTS.map((bp) => {
                  const isSelected = selectedTemplateId === bp.id;
                  const Icon = bp.icon;
                  return (
                    <button
                      key={bp.id}
                      type="button"
                      onClick={() => handleSelectBlueprint(bp)}
                      className={`text-left p-3 rounded-2xl border transition relative flex items-start gap-3 touch-manipulation active:scale-[0.98] ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 shadow-sm ring-1 ring-blue-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900 dark:text-white truncate block">
                            {bp.name}
                          </span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                            {bp.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {bp.description}
                        </p>
                        {bp.tasks.length > 0 && (
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold block mt-1">
                            +{bp.tasks.length} tasks &amp; checklists
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <div className="absolute top-3 right-3 text-blue-600 dark:text-blue-400">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-600 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Quadcopter Drone V2, Walnut Dining Table"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Description / Goals
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Objectives, deliverables, materials to test..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Team Completion XP Reward
                </label>
                <input
                  type="number"
                  min="10"
                  max="1000"
                  value={xpReward}
                  onChange={(e) => setXpReward(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Distributed to every project member across each linked skill when marked COMPLETED by the PM.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Budget Limit (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={budgetLimit}
                    onChange={(e) => setBudgetLimit(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Project Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as Currency)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="ILS">ILS (₪)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Link Developing Skills
                </label>
                <SkillSelector
                  skills={catalogSkills}
                  mode="multi"
                  selectedIds={selectedSkillIds}
                  onChangeMulti={(ids) => setSelectedSkillIds(ids)}
                  placeholder="Search and link skills rewarded on completion..."
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition min-h-[44px] touch-manipulation active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 min-h-[44px] touch-manipulation active:scale-95"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create &amp; Open Board →</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
