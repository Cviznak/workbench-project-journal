'use client';

import { useState, useMemo } from 'react';
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
  Columns,
  Eye,
  Edit3,
  Tag,
  X,
  Hash,
} from 'lucide-react';

interface WorkspaceClientProps {
  initialItems: WorkspaceItem[];
  userId: string;
}

type ViewMode = 'edit' | 'split' | 'preview';

export default function WorkspaceClient({ initialItems, userId }: WorkspaceClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [items, setItems] = useState<WorkspaceItem[]>(initialItems);
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id || null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'IDEA' | 'NOTE'>('ALL');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [newTagInput, setNewTagInput] = useState('');
  const [promoting, setPromoting] = useState(false);

  const selectedItem = items.find((i) => i.id === selectedId) || null;

  // Extract all unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      (item.tags || []).forEach((t) => set.add(t));
    });
    return Array.from(set);
  }, [items]);

  // Filtered items
  const filtered = items.filter((item) => {
    const matchesSearch =
      !search ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.content_md.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'ALL' || item.item_type === typeFilter;
    const matchesTag = !selectedTag || (item.tags || []).includes(selectedTag);
    return matchesSearch && matchesType && matchesTag;
  });

  async function handleCreateItem(type: WorkspaceItemType) {
    const newItem = {
      user_id: userId,
      item_type: type,
      title: type === 'IDEA' ? 'New Build Idea' : 'Workshop Note',
      content_md:
        type === 'IDEA'
          ? `## Concept Overview\nBrief description of the build idea...\n\n### Required Materials\n- [ ] Material 1\n- [ ] Material 2\n\n### Key Steps\n1. Initial sketch\n2. Prototype assembly`
          : `## Notes\nKey observations and notes...\n\n- [ ] Action item 1\n- [ ] Action item 2`,
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

  async function handleAddTag() {
    if (!selectedItem || !newTagInput.trim()) return;
    const cleanTag = newTagInput.trim().replace(/^#/, '').toLowerCase();
    if ((selectedItem.tags || []).includes(cleanTag)) {
      setNewTagInput('');
      return;
    }

    const updatedTags = [...(selectedItem.tags || []), cleanTag];
    handleUpdateField('tags', updatedTags);
    setNewTagInput('');
  }

  async function handleRemoveTag(tagToRemove: string) {
    if (!selectedItem) return;
    const updatedTags = (selectedItem.tags || []).filter((t) => t !== tagToRemove);
    handleUpdateField('tags', updatedTags);
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

  // Convert Idea to Project
  async function handlePromoteToProject(idea: WorkspaceItem) {
    if (promoting) return;
    setPromoting(true);

    try {
      const { data: newProject, error: projErr } = await supabase
        .from('projects')
        .insert({
          name: idea.title,
          description: idea.content_md.slice(0, 500),
          pm_user_id: userId,
          status: 'PLANNING',
          completion_xp_reward: 100,
        })
        .select()
        .single();

      if (projErr) throw projErr;

      // Add user as project member as ACCEPTED (upsert on conflict)
      await supabase.from('project_members').upsert(
        {
          project_id: newProject.id,
          user_id: userId,
          invitation_status: 'ACCEPTED',
        },
        { onConflict: 'project_id,user_id' }
      );

      // Mark Idea as PROMOTED
      await handleUpdateField('idea_status', 'PROMOTED');

      router.push(`/projects/${newProject.id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to promote idea to project');
      setPromoting(false);
    }
  }

  // Simple, robust Markdown parser
  function renderMarkdown(md: string) {
    if (!md) return <p className="text-slate-400 italic">No content yet. Start typing...</p>;

    const lines = md.split('\n');
    return (
      <div className="space-y-2 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
        {lines.map((line, idx) => {
          // Headers
          if (line.startsWith('### ')) {
            return (
              <h3 key={idx} className="text-base font-bold text-slate-900 dark:text-white mt-4 mb-1">
                {line.slice(4)}
              </h3>
            );
          }
          if (line.startsWith('## ')) {
            return (
              <h2 key={idx} className="text-lg font-bold text-slate-900 dark:text-white mt-5 mb-1.5 border-b border-slate-100 dark:border-slate-800 pb-1">
                {line.slice(3)}
              </h2>
            );
          }
          if (line.startsWith('# ')) {
            return (
              <h1 key={idx} className="text-xl font-extrabold text-slate-900 dark:text-white mt-6 mb-2">
                {line.slice(2)}
              </h1>
            );
          }

          // Checkboxes
          if (line.trim().startsWith('- [ ] ')) {
            return (
              <div key={idx} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => {
                    const updated = lines
                      .map((l, i) => (i === idx ? l.replace('- [ ] ', '- [x] ') : l))
                      .join('\n');
                    handleUpdateField('content_md', updated);
                  }}
                  className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                />
                <span>{line.trim().slice(6)}</span>
              </div>
            );
          }
          if (line.trim().startsWith('- [x] ') || line.trim().startsWith('- [X] ')) {
            return (
              <div key={idx} className="flex items-center gap-2 text-slate-400 line-through">
                <input
                  type="checkbox"
                  checked={true}
                  onChange={() => {
                    const updated = lines
                      .map((l, i) => (i === idx ? l.replace(/- \[[xX]\] /, '- [ ] ') : l))
                      .join('\n');
                    handleUpdateField('content_md', updated);
                  }}
                  className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                />
                <span>{line.trim().slice(6)}</span>
              </div>
            );
          }

          // Bullet list
          if (line.trim().startsWith('- ')) {
            return (
              <li key={idx} className="ml-4 list-disc text-slate-700 dark:text-slate-300">
                {line.trim().slice(2)}
              </li>
            );
          }

          // Empty lines
          if (!line.trim()) {
            return <div key={idx} className="h-2" />;
          }

          // Normal paragraph with bold parsing
          const parts = line.split(/(\*\*.*?\*\*)/g);
          return (
            <p key={idx}>
              {parts.map((part, pIdx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return (
                    <strong key={pIdx} className="font-bold text-slate-900 dark:text-white">
                      {part.slice(2, -2)}
                    </strong>
                  );
                }
                return part;
              })}
            </p>
          );
        })}
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col md:flex-row gap-6 animate-in fade-in duration-200">
      {/* Left Sidebar: Items List */}
      <div className="w-full md:w-80 lg:w-96 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        {/* Header & Controls */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="font-extrabold text-lg text-slate-900 dark:text-white">Workspace</h1>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleCreateItem('IDEA')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition"
                title="Create Idea"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>+ Idea</span>
              </button>
              <button
                onClick={() => handleCreateItem('NOTE')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
                title="Create Note"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>+ Note</span>
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes & ideas..."
              className="w-full bg-transparent outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
            />
          </div>

          {/* Type Filters */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
            {(['ALL', 'IDEA', 'NOTE'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`flex-1 py-1 rounded-lg transition capitalize ${
                  typeFilter === type
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {type.toLowerCase()}
              </button>
            ))}
          </div>

          {/* Tag Filter Pills */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-2 py-0.5 rounded-md font-medium shrink-0 transition ${
                  selectedTag === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                All Tags
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={`px-2 py-0.5 rounded-md font-medium shrink-0 transition flex items-center gap-1 ${
                    selectedTag === tag
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Hash className="w-2.5 h-2.5" />
                  <span>{tag}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* List of items */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
          {filtered.map((item) => {
            const isSelected = item.id === selectedId;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={`p-4 cursor-pointer transition text-left space-y-1.5 ${
                  isSelected
                    ? 'bg-blue-50/70 dark:bg-blue-950/30 border-l-4 border-blue-600'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {item.item_type === 'IDEA' ? (
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-blue-500" />
                    )}
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      {item.item_type}
                    </span>
                  </div>
                  {item.is_pinned && <Pin className="w-3 h-3 text-amber-500 fill-current" />}
                </div>

                <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                  {item.title || 'Untitled'}
                </h4>

                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {item.content_md || 'No content...'}
                </p>

                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                  <span>{relativeTime(item.updated_at)}</span>
                  {item.item_type === 'IDEA' && (
                    <span
                      className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        item.idea_status === 'PROMOTED'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {item.idea_status}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400">
              No matching notes or ideas found.
            </div>
          )}
        </div>
      </div>

      {/* Right Pane: Selected Item Editor & Preview */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        {selectedItem ? (
          <>
            {/* Editor Toolbar */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleUpdateField('is_pinned', !selectedItem.is_pinned)}
                  className={`p-2 rounded-xl transition ${
                    selectedItem.is_pinned
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400'
                  }`}
                  title="Pin item"
                >
                  <Pin className="w-4 h-4" />
                </button>

                {selectedItem.item_type === 'IDEA' && (
                  <select
                    value={selectedItem.idea_status}
                    onChange={(e) => handleUpdateField('idea_status', e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none"
                  >
                    <option value="RAW">Raw Concept</option>
                    <option value="PROTOTYPING">Prototyping</option>
                    <option value="PROMOTED">Promoted to Project</option>
                    <option value="SHELVED">Shelved</option>
                  </select>
                )}
              </div>

              {/* View mode switcher */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
                <button
                  onClick={() => setViewMode('edit')}
                  className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 ${
                    viewMode === 'edit'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                  title="Editor Only"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
                <button
                  onClick={() => setViewMode('split')}
                  className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 ${
                    viewMode === 'split'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                  title="Side-by-Side Split View"
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Split</span>
                </button>
                <button
                  onClick={() => setViewMode('preview')}
                  className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 ${
                    viewMode === 'preview'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                  title="Formatted Preview"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Preview</span>
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {selectedItem.item_type === 'IDEA' && selectedItem.idea_status !== 'PROMOTED' && (
                  <button
                    onClick={() => handlePromoteToProject(selectedItem)}
                    disabled={promoting}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition disabled:opacity-50"
                  >
                    {promoting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Rocket className="w-3.5 h-3.5" />
                    )}
                    <span>Promote to Project</span>
                  </button>
                )}

                <button
                  onClick={() => handleDelete(selectedItem.id)}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                  title="Delete item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Title & Tag bar */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 space-y-2">
              <input
                type="text"
                value={selectedItem.title}
                onChange={(e) => handleUpdateField('title', e.target.value)}
                placeholder="Title..."
                className="w-full text-xl lg:text-2xl font-extrabold bg-transparent text-slate-900 dark:text-white outline-none placeholder:text-slate-300"
              />

              {/* Tag editor */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                {(selectedItem.tags || []).map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold text-[11px]"
                  >
                    #{t}
                    <button
                      onClick={() => handleRemoveTag(t)}
                      className="hover:text-red-500 ml-0.5"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
                <div className="inline-flex items-center gap-1">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="+ add tag"
                    className="w-20 text-[11px] bg-transparent outline-none text-slate-600 dark:text-slate-300 placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* Body: Split View / Edit / Preview */}
            <div className="flex-1 flex overflow-hidden">
              {(viewMode === 'edit' || viewMode === 'split') && (
                <div
                  className={`h-full p-6 flex flex-col ${
                    viewMode === 'split' ? 'w-1/2 border-r border-slate-100 dark:border-slate-800' : 'w-full'
                  }`}
                >
                  <textarea
                    value={selectedItem.content_md}
                    onChange={(e) => handleUpdateField('content_md', e.target.value)}
                    placeholder="Write with Markdown (# Header, - [ ] checklist item, **bold**)..."
                    className="w-full flex-1 bg-transparent text-slate-800 dark:text-slate-200 text-sm font-mono leading-relaxed outline-none resize-none placeholder:text-slate-400"
                  />
                  <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>
                      {selectedItem.content_md.split(/\s+/).filter(Boolean).length} words
                    </span>
                    <span>Markdown Enabled</span>
                  </div>
                </div>
              )}

              {(viewMode === 'preview' || viewMode === 'split') && (
                <div
                  className={`h-full p-6 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/30 ${
                    viewMode === 'split' ? 'w-1/2' : 'w-full'
                  }`}
                >
                  {renderMarkdown(selectedItem.content_md)}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
            <Lightbulb className="w-10 h-10 stroke-1 text-slate-300 dark:text-slate-600" />
            <p className="text-sm">Select an item from the sidebar or create a new one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
