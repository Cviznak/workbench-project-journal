'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Project, SkillCatalog } from '@/lib/types';
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
} from 'lucide-react';

interface ProjectsListClientProps {
  initialProjects: any[];
  catalogSkills: SkillCatalog[];
  userId: string;
}

export default function ProjectsListClient({
  initialProjects,
  catalogSkills,
  userId,
}: ProjectsListClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [projects, setProjects] = useState(initialProjects);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [xpReward, setXpReward] = useState('100');
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleSkill(id: string) {
    setSelectedSkillIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Create project
      const { data: project, error: projErr } = await supabase
        .from('projects')
        .insert({
          name: name.trim(),
          description: description.trim(),
          pm_user_id: userId,
          status: 'ACTIVE',
          completion_xp_reward: parseInt(xpReward, 10) || 100,
        })
        .select()
        .single();

      if (projErr) throw projErr;

      if (project) {
        // 2. Add creator to project_members as ACCEPTED (upsert on conflict)
        await supabase.from('project_members').upsert(
          {
            project_id: project.id,
            user_id: userId,
            invitation_status: 'ACCEPTED',
          },
          { onConflict: 'project_id,user_id' }
        );

        // 3. Link selected skills
        if (selectedSkillIds.length > 0) {
          const skillRows = selectedSkillIds.map((sid) => ({
            project_id: project.id,
            skill_id: sid,
          }));
          await supabase.from('project_skills').insert(skillRows);
        }

        router.push(`/projects/${project.id}`);
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Projects &amp; Task Boards
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Collaborative workspaces with role governance and dual task/project XP payouts.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition self-start sm:self-auto"
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
                        proj.status === 'COMPLETED'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                      }`}
                    >
                      {proj.status}
                    </span>

                    <span className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full">
                      <Trophy className="w-3 h-3" />
                      <span>+{proj.completion_xp_reward} XP</span>
                    </span>
                  </div>

                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition leading-snug">
                    {proj.name}
                  </h3>

                  {proj.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                      {proj.description}
                    </p>
                  )}

                  {/* Linked Skills Chips */}
                  {skills.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-4">
                      {skills.map((s: any) => (
                        <span
                          key={s.id}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        >
                          {s.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{members.length} members</span>
                    </span>
                    {isPM && (
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-1.5 py-0.5 rounded">
                        PM
                      </span>
                    )}
                    {members.find((m: any) => m.user_id === userId)?.invitation_status === 'PENDING' && (
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded">
                        Invite Pending
                      </span>
                    )}
                  </div>

                  <span className="group-hover:translate-x-1 transition text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
                    <span>Board</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-8 space-y-3">
          <FolderKanban className="w-14 h-14 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            No projects yet
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Create your first project to set up a Kanban task board, assign tasks, and award XP.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-block mt-3 px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700"
          >
            ＋ Create First Project
          </button>
        </div>
      )}

      {/* Create Project Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <FolderKanban className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Create New Project
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  You will be assigned as the Project Manager (PM).
                </p>
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
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Quadcopter Drone V2, Walnut Dining Table"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Team Completion XP Reward
                </label>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={xpReward}
                  onChange={(e) => setXpReward(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Distributed to every project member for each linked skill when marked COMPLETED by the PM.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Link Developing Skills
                </label>
                <div className="flex items-center gap-1.5 flex-wrap max-h-32 overflow-y-auto p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  {catalogSkills.map((cs) => {
                    const isSelected = selectedSkillIds.includes(cs.id);
                    return (
                      <button
                        key={cs.id}
                        type="button"
                        onClick={() => toggleSkill(cs.id)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        {cs.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
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
