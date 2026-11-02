'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Command,
  LayoutDashboard,
  Flame,
  Lightbulb,
  FolderKanban,
  Settings,
  Shield,
  Plus,
  ArrowRight,
  X,
} from 'lucide-react';

interface SpotlightSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPractice: () => void;
}

interface SearchItem {
  title: string;
  path?: string;
  action?: () => void;
  icon: any;
  category: string;
}

export default function SpotlightSearch({ isOpen, onClose, onOpenPractice }: SpotlightSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const navigationItems: SearchItem[] = [
    { title: 'Dashboard', path: '/', icon: LayoutDashboard, category: 'Navigation' },
    { title: 'Skills & Progression', path: '/skills', icon: Flame, category: 'Navigation' },
    { title: 'Ideas & Notes Workspace', path: '/workspace', icon: Lightbulb, category: 'Navigation' },
    { title: 'Projects & Tasks', path: '/projects', icon: FolderKanban, category: 'Navigation' },
    { title: 'Account Settings', path: '/settings', icon: Settings, category: 'Navigation' },
    { title: 'Admin Hub', path: '/admin', icon: Shield, category: 'Navigation' },
  ];

  const actionItems: SearchItem[] = [
    {
      title: 'Log Skill Practice (+XP)',
      action: () => {
        onClose();
        onOpenPractice();
      },
      icon: Plus,
      category: 'Actions',
    },
    {
      title: 'Create New Project',
      path: '/projects',
      icon: FolderKanban,
      category: 'Actions',
    },
    {
      title: 'Write New Idea / Note',
      path: '/workspace',
      icon: Lightbulb,
      category: 'Actions',
    },
  ];

  const allItems = [...actionItems, ...navigationItems];

  const filtered = allItems.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation inside modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filtered[selectedIndex];
        if (selected) {
          if (selected.action) {
            selected.action();
          } else if (selected.path) {
            router.push(selected.path);
            onClose();
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filtered, onClose, router]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400 mr-3" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, page, or action..."
            className="w-full bg-transparent text-slate-900 dark:text-white text-sm outline-none placeholder:text-slate-400"
          />
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-500">
            ESC
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No matching commands or pages found.
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((item, index) => {
                const Icon = item.icon;
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={item.title}
                    onClick={() => {
                      if (item.action) {
                        item.action();
                      } else if (item.path) {
                        router.push(item.path);
                        onClose();
                      }
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                      <span className="font-medium">{item.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded ${
                          isSelected
                            ? 'bg-blue-500/30 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.category}
                      </span>
                      {isSelected && <ArrowRight className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span>Workbench Spotlight</span>
        </div>
      </div>
    </div>
  );
}
