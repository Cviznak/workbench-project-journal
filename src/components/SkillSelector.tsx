'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { SkillCatalog } from '@/lib/types';
import { Search, Check, X, ChevronDown, Sparkles, Target } from 'lucide-react';

export interface SkillSelectorProps {
  skills: SkillCatalog[];
  userSkillIds?: string[];
  selectedId?: string | null;
  selectedIds?: string[];
  onChangeSingle?: (skillId: string | null, skill: SkillCatalog | null) => void;
  onChangeMulti?: (skillIds: string[]) => void;
  mode?: 'single' | 'multi';
  placeholder?: string;
  className?: string;
  allowClear?: boolean;
  disabled?: boolean;
}

export default function SkillSelector({
  skills = [],
  userSkillIds = [],
  selectedId = null,
  selectedIds = [],
  onChangeSingle,
  onChangeMulti,
  mode = 'single',
  placeholder = 'Select a skill...',
  className = '',
  allowClear = true,
  disabled = false,
}: SkillSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setSelectedCategory('ALL');
    }
  }, [isOpen]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    skills.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set).sort();
  }, [skills]);

  // Selected skill lookup
  const singleSelectedSkill = useMemo(() => {
    if (mode !== 'single' || !selectedId) return null;
    return skills.find((s) => s.id === selectedId) || null;
  }, [skills, selectedId, mode]);

  const multiSelectedSkills = useMemo(() => {
    if (mode !== 'multi') return [];
    return skills.filter((s) => selectedIds.includes(s.id));
  }, [skills, selectedIds, mode]);

  // Filtered skills
  const filteredSkills = useMemo(() => {
    const q = query.trim().toLowerCase();
    return skills
      .filter((s) => {
        const matchesQuery =
          !q ||
          s.name.toLowerCase().includes(q) ||
          s.slug.toLowerCase().includes(q) ||
          (s.category && s.category.toLowerCase().includes(q));

        const matchesCat =
          selectedCategory === 'ALL' || s.category === selectedCategory;

        return matchesQuery && matchesCat;
      })
      .sort((a, b) => {
        // Prioritize skills user has practiced
        const aUser = userSkillIds.includes(a.id);
        const bUser = userSkillIds.includes(b.id);
        if (aUser && !bUser) return -1;
        if (!aUser && bUser) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [skills, query, selectedCategory, userSkillIds]);

  function handleSelectSkill(skill: SkillCatalog) {
    if (mode === 'single') {
      if (selectedId === skill.id && allowClear) {
        onChangeSingle?.(null, null);
      } else {
        onChangeSingle?.(skill.id, skill);
      }
      setIsOpen(false);
    } else {
      const exists = selectedIds.includes(skill.id);
      const next = exists
        ? selectedIds.filter((id) => id !== skill.id)
        : [...selectedIds, skill.id];
      onChangeMulti?.(next);
    }
  }

  function handleRemoveMulti(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    onChangeMulti?.(selectedIds.filter((item) => item !== id));
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-left transition text-xs ${
          isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white dark:bg-slate-900'
            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex-1 flex flex-wrap items-center gap-1.5 min-w-0">
          {mode === 'single' ? (
            singleSelectedSkill ? (
              <div className="flex items-center gap-2 truncate">
                <Target className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="font-semibold text-slate-900 dark:text-white truncate">
                  {singleSelectedSkill.name}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                  {singleSelectedSkill.category}
                </span>
              </div>
            ) : (
              <span className="text-slate-400 dark:text-slate-500 font-normal">
                {placeholder}
              </span>
            )
          ) : multiSelectedSkills.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 py-0.5">
              {multiSelectedSkills.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-semibold text-[11px]"
                >
                  <span className="truncate max-w-[130px]">{s.name}</span>
                  <span
                    role="button"
                    onClick={(e) => handleRemoveMulti(e, s.id)}
                    className="hover:text-blue-900 dark:hover:text-white cursor-pointer ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </span>
                </span>
              ))}
            </div>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 font-normal">
              {placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {mode === 'single' && singleSelectedSkill && allowClear && (
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                onChangeSingle?.(null, null);
              }}
              className="p-1 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
            }`}
          />
        </div>
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2.5 animate-in fade-in zoom-in-95 duration-150 max-h-80 flex flex-col">
          {/* Search Box */}
          <div className="relative mb-2 shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by skill name, category, or slug..."
              className="w-full pl-8 pr-7 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Chips Bar */}
          {categories.length > 1 && (
            <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-1.5 scrollbar-thin shrink-0 text-[11px]">
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={`px-2 py-0.5 rounded-full whitespace-nowrap font-semibold transition ${
                  selectedCategory === 'ALL'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded-full whitespace-nowrap font-medium transition ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Results List */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {filteredSkills.length > 0 ? (
              filteredSkills.map((skill) => {
                const isSelected =
                  mode === 'single'
                    ? selectedId === skill.id
                    : selectedIds.includes(skill.id);
                const isPracticed = userSkillIds.includes(skill.id);

                return (
                  <div
                    key={skill.id}
                    onClick={() => handleSelectSkill(skill)}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Target
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isSelected
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-slate-400'
                        }`}
                      />
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate">{skill.name}</span>
                          {isPracticed && (
                            <span
                              className="text-[9px] font-bold px-1 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center gap-0.5 shrink-0"
                              title="Skill already in your active practice roster"
                            >
                              <Sparkles className="w-2.5 h-2.5" />
                              Practiced
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                          {skill.category}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 pl-2">
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-slate-400">
                No matching skills found for &quot;{query}&quot;
              </div>
            )}
          </div>

          {/* Multi-select Done footer */}
          {mode === 'multi' && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 text-xs">
              <span className="text-slate-400 text-[11px]">
                {selectedIds.length} {selectedIds.length === 1 ? 'skill' : 'skills'} selected
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px]"
              >
                Done
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
