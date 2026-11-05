'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { WorkspaceItem, WorkspaceItemType, IdeaStatus } from '@/lib/types';
import { formatDate, relativeTime, cn } from '@/lib/utils';
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
  Palette,
  CheckSquare,
  Copy,
  ChevronDown,
  ChevronUp,
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

  // Blueprint Metadata Tools State
  const [showBlueprintTools, setShowBlueprintTools] = useState(true);
  const [newColorHex, setNewColorHex] = useState('#6366f1');
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [newChecklistText, setNewChecklistText] = useState('');

  const selectedItem = items.find((i) => i.id === selectedId) || null;

  // Swatch helpers
  function handleAddSwatch(hex: string) {
    if (!selectedItem) return;
    const current = selectedItem.metadata_json?.color_swatches || [];
    if (current.includes(hex)) return;
    const updatedMeta = {
      ...selectedItem.metadata_json,
      color_swatches: [...current, hex],
    };
    handleUpdateField('metadata_json', updatedMeta);
  }

  function handleRemoveSwatch(hex: string) {
    if (!selectedItem) return;
    const current = selectedItem.metadata_json?.color_swatches || [];
    const updatedMeta = {
      ...selectedItem.metadata_json,
      color_swatches: current.filter((c) => c !== hex),
    };
    handleUpdateField('metadata_json', updatedMeta);
  }

  function handleCopyHex(hex: string) {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 2000);
  }

  // Checklist helpers
  function handleAddChecklistItem() {
    if (!selectedItem || !newChecklistText.trim()) return;
    const current = selectedItem.metadata_json?.checklist || [];
    const newItem = {
      id: crypto.randomUUID(),
      text: newChecklistText.trim(),
      done: false,
    };
    const updatedMeta = {
      ...selectedItem.metadata_json,
      checklist: [...current, newItem],
    };
    handleUpdateField('metadata_json', updatedMeta);
    setNewChecklistText('');
  }

  function handleToggleChecklistItem(itemId: string) {
    if (!selectedItem) return;
    const current = selectedItem.metadata_json?.checklist || [];
    const updatedMeta = {
      ...selectedItem.metadata_json,
      checklist: current.map((item) =>
        item.id === itemId ? { ...item, done: !item.done } : item
      ),
    };
    handleUpdateField('metadata_json', updatedMeta);
  }

  function handleRemoveChecklistItem(itemId: string) {
    if (!selectedItem) return;
    const current = selectedItem.metadata_json?.checklist || [];
    const updatedMeta = {
      ...selectedItem.metadata_json,
      checklist: current.filter((item) => item.id !== itemId),
    };
    handleUpdateField('metadata_json', updatedMeta);
  }

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
      const { data: newProjectId, error: rpcErr } = await supabase.rpc('create_maker_project', {
        p_name: idea.title.trim(),
        p_description: (idea.content_md || '').slice(0, 500),
        p_completion_xp_reward: 100,
        p_skill_ids: [],
        p_member_user_ids: [],
      });

      if (rpcErr) throw rpcErr;
      if (!newProjectId) throw new Error('Failed to create project from idea: no ID returned');

      // Mark Idea as PROMOTED
      await handleUpdateField('idea_status', 'PROMOTED');

      router.push(`/projects/${newProjectId}`);
      router.refresh();
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

            {/* Blueprint Tools: Color Swatches & Interactive Checklist */}
            <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
              <div className="px-6 py-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowBlueprintTools(!showBlueprintTools)}
                  className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                >
                  <Palette className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Blueprint Palette &amp; Checklist</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    ({(selectedItem.metadata_json?.color_swatches || []).length} colors,{' '}
                    {(selectedItem.metadata_json?.checklist || []).filter((c) => c.done).length}/
                    {(selectedItem.metadata_json?.checklist || []).length} done)
                  </span>
                  {showBlueprintTools ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>
              </div>

              {showBlueprintTools && (
                <div className="px-6 pb-4 pt-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Color Palette Swatches */}
                  <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Palette className="w-3 h-3 text-indigo-500" />
                        <span>Color Swatches</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={newColorHex}
                          onChange={(e) => setNewColorHex(e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                          title="Pick custom hex color"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddSwatch(newColorHex)}
                          className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] hover:bg-indigo-100"
                        >
                          + Add Swatch
                        </button>
                      </div>
                    </div>

                    {/* Preset Swatch Chips */}
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[10px] text-slate-400 mr-1">Presets:</span>
                      {['#1e293b', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#eab308'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleAddSwatch(preset)}
                          className="w-4 h-4 rounded-full border border-black/10 hover:scale-125 transition"
                          style={{ backgroundColor: preset }}
                          title={`Add ${preset}`}
                        />
                      ))}
                    </div>

                    {/* Active Swatches List */}
                    <div className="flex items-center gap-2 flex-wrap pt-1 min-h-[32px]">
                      {(selectedItem.metadata_json?.color_swatches || []).map((hex) => (
                        <div
                          key={hex}
                          className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-mono group"
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full shadow-inner border border-black/10 shrink-0"
                            style={{ backgroundColor: hex }}
                          />
                          <button
                            type="button"
                            onClick={() => handleCopyHex(hex)}
                            className="hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 font-semibold"
                            title="Click to copy hex"
                          >
                            <span>{hex}</span>
                            {copiedHex === hex ? (
                              <Check className="w-2.5 h-2.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-slate-400" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveSwatch(hex)}
                            className="text-slate-400 hover:text-red-500 ml-0.5"
                            title="Remove swatch"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {(selectedItem.metadata_json?.color_swatches || []).length === 0 && (
                        <span className="text-[11px] text-slate-400 italic">No color swatches pinned to this blueprint.</span>
                      )}
                    </div>
                  </div>

                  {/* Interactive Checklist */}
                  <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckSquare className="w-3 h-3 text-indigo-500" />
                        <span>Interactive Checklist</span>
                      </span>
                      {(() => {
                        const list = selectedItem.metadata_json?.checklist || [];
                        const doneCount = list.filter((c) => c.done).length;
                        const pct = list.length > 0 ? Math.round((doneCount / list.length) * 100) : 0;
                        return (
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                            {doneCount}/{list.length} ({pct}%)
                          </span>
                        );
                      })()}
                    </div>

                    {/* Add Checklist Item */}
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={newChecklistText}
                        onChange={(e) => setNewChecklistText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddChecklistItem();
                          }
                        }}
                        placeholder="Add subtask checklist item..."
                        className="flex-1 px-2.5 py-1 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddChecklistItem}
                        className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                      >
                        + Add
                      </button>
                    </div>

                    {/* Checklist Items List */}
                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                      {(selectedItem.metadata_json?.checklist || []).map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between text-xs py-1 px-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 group"
                        >
                          <label className="flex items-center gap-2 cursor-pointer flex-1 truncate mr-2">
                            <input
                              type="checkbox"
                              checked={c.done}
                              onChange={() => handleToggleChecklistItem(c.id)}
                              className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                            />
                            <span className={cn('truncate', c.done ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200')}>
                              {c.text}
                            </span>
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemoveChecklistItem(c.id)}
                            className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                            title="Delete item"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {(selectedItem.metadata_json?.checklist || []).length === 0 && (
                        <span className="text-[11px] text-slate-400 italic block py-1">No checklist items yet.</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
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
