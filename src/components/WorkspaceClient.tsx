'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { WorkspaceItem, WorkspaceItemType, IdeaStatus } from '@/lib/types';
import { formatDate, relativeTime } from '@/lib/utils';
import {
  Lightbulb,
  FileText,
  Pin,
  Trash2,
  Rocket,
  Plus,
  Save,
  Search,
  Check,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface WorkspaceClientProps {
  initialItems: WorkspaceItem[];
  userId: string;
}

export default function WorkspaceClient({ initialItems, userId }: WorkspaceClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [items, setItems] = useState<WorkspaceItem[]>(initialItems);
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id || null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'IDEA' | 'NOTE'>('ALL');
  const [saving, setSaving] = useState(false);
  const [promoting, setPromoting] = useState(false);

  const selectedItem = items.find((i) => i.id === selectedId) || null;

  // Filtered items
  const filtered = items.filter((item) => {
    const matchesSearch =
      !search ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.content_md.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'ALL' || item.item_type === typeFilter;
    return matchesSearch && matchesType;
  });

  async function handleCreateItem(type: WorkspaceItemType) {
    const newItem = {
      user_id: userId,
      item_type: type,
      title: type === 'IDEA' ? 'New Build Idea' : 'Workshop Note',
      content_md: '',
      tags: [],
      idea_status: 'RAW' as IdeaStatus,
      is_pinned: false,
    };

    const { data, error } = await supabase
      .from('workspace_items')
      .insert(newItem)
      .select()
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    if (data) {
      setItems([data, ...items]);
      setSelectedId(data.id);
    }
  }

  async function handleUpdateField(field: keyof WorkspaceItem, value: any) {
    if (!selectedId) return;

    // Optimistic update
    setItems((prev) =>
      prev.map((item) =>
        item.id === selectedId
          ? { ...item, [field]: value, updated_at: new Date().toISOString() }
          : item
      )
    );

    await supabase
      .from('workspace_items')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', selectedId);
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this workspace item?')) return;

    await supabase.from('workspace_items').delete().eq('id', id);

    const remaining = items.filter((i) => i.id !== id);
    setItems(remaining);
    if (selectedId === id) {
      setSelectedId(remaining[0]?.id || null);
    }
  }

  async function handleConvertToProject() {
    if (!selectedItem) return;
    setPromoting(true);

    try {
      // 1. Create project with idea details
      const { data: project, error: projErr } = await supabase
        .from('projects')
        .insert({
          name: selectedItem.title,
          description: selectedItem.content_md,
          pm_user_id: userId,
          status: 'ACTIVE',
          completion_xp_reward: 100,
        })
        .select()
        .single();

      if (projErr) throw projErr;

      // 2. Add PM to project_members
      if (project) {
        await supabase.from('project_members').insert({
          project_id: project.id,
          user_id: userId,
        });

        // 3. Mark idea as PROMOTED
        await handleUpdateField('idea_status', 'PROMOTED');

        router.push(`/projects/${project.id}`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to convert idea to project');
    } finally {
      setPromoting(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Private Workspace: Ideas &amp; Notes
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Zero-knowledge isolated notes. No other user or admin has access to your private workspace.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCreateItem('IDEA')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>+ New Idea</span>
          </button>
          <button
            onClick={() => handleCreateItem('NOTE')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>+ Note</span>
          </button>
        </div>
      </div>

      {/* Split-View Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[640px]">
        {/* Left List (Col 4) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 flex flex-col gap-4 shadow-sm">
          {/* Search & Tabs */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ideas &amp; notes..."
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            {(['ALL', 'IDEA', 'NOTE'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`py-1.5 rounded-lg text-center transition ${
                  typeFilter === t
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t === 'ALL' ? 'All' : t === 'IDEA' ? '💡 Ideas' : '📝 Notes'}
              </button>
            ))}
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={`p-3.5 rounded-2xl border cursor-pointer transition text-left relative ${
                  item.id === selectedId
                    ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700'
                    : 'bg-slate-50/60 dark:bg-slate-950/40 border-slate-200/60 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <span>{item.item_type === 'IDEA' ? '💡' : '📝'}</span>
                    <span className="text-[11px] uppercase tracking-wider">
                      {item.item_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {item.is_pinned && <Pin className="w-3 h-3 text-amber-500 fill-current" />}
                    {item.item_type === 'IDEA' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {item.idea_status}
                      </span>
                    )}
                  </div>
                </div>

                <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1.5 truncate">
                  {item.title || 'Untitled'}
                </h4>

                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                  {item.content_md || 'No notes written yet...'}
                </p>

                <span className="text-[10px] text-slate-400 block mt-2">
                  {relativeTime(item.updated_at)}
                </span>
              </div>
            ))}

            {filtered.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-12">
                No items found. Click above to add an idea or note.
              </p>
            )}
          </div>
        </div>

        {/* Right Editor/Viewer (Col 8) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col">
          {selectedItem ? (
            <div className="flex-1 flex flex-col space-y-4">
              {/* Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <input
                  type="text"
                  value={selectedItem.title}
                  onChange={(e) => handleUpdateField('title', e.target.value)}
                  placeholder="Title..."
                  className="text-xl font-bold bg-transparent text-slate-900 dark:text-white focus:outline-none flex-1 border-b border-transparent focus:border-blue-500 pb-1"
                />

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Status Picker for Ideas */}
                  {selectedItem.item_type === 'IDEA' && (
                    <select
                      value={selectedItem.idea_status}
                      onChange={(e) => handleUpdateField('idea_status', e.target.value)}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300"
                    >
                      <option value="RAW">Raw</option>
                      <option value="PROTOTYPING">Prototyping</option>
                      <option value="PROMOTED">Promoted</option>
                      <option value="SHELVED">Shelved</option>
                    </select>
                  )}

                  {/* Convert Idea to Project Button */}
                  {selectedItem.item_type === 'IDEA' && selectedItem.idea_status !== 'PROMOTED' && (
                    <button
                      onClick={handleConvertToProject}
                      disabled={promoting}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-500/20 transition disabled:opacity-50"
                      title="Create a new Project pre-filled with this idea"
                    >
                      {promoting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Rocket className="w-3.5 h-3.5" />
                      )}
                      <span>Convert to Project</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleUpdateField('is_pinned', !selectedItem.is_pinned)}
                    className={`p-2 rounded-xl text-xs transition ${
                      selectedItem.is_pinned
                        ? 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
                        : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title={selectedItem.is_pinned ? 'Unpin' : 'Pin to top'}
                  >
                    <Pin className="w-4 h-4 fill-current" />
                  </button>

                  <button
                    onClick={() => handleDelete(selectedItem.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                    title="Delete item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Markdown Editor */}
              <div className="flex-1 flex flex-col space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Markdown Content
                </label>
                <textarea
                  value={selectedItem.content_md}
                  onChange={(e) => handleUpdateField('content_md', e.target.value)}
                  placeholder="Write your notes, sketches, joinery specs, or prototype logs in Markdown..."
                  className="flex-1 w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[360px]"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span>Last updated: {relativeTime(selectedItem.updated_at)}</span>
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <Check className="w-3.5 h-3.5" />
                  <span>Auto-saved to Supabase</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
              <Lightbulb className="w-12 h-12 text-slate-300 dark:text-slate-600" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Select an idea or note
              </h3>
              <p className="text-xs text-slate-500 max-w-xs">
                Pick an item from the left sidebar or create a new one to start writing.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
