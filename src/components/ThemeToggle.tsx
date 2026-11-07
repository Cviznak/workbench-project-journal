'use client';

import { useState, useEffect, useRef } from 'react';
import { Sun, Moon, Sparkles } from 'lucide-react';

export type ThemeMode = 'dark' | 'light' | 'cute';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = (localStorage.getItem('workbench-theme') as ThemeMode) || 'dark';
    setTheme(saved);
    applyDomClasses(saved);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function applyDomClasses(t: ThemeMode) {
    if (t === 'cute') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('cute');
    } else if (t === 'light') {
      document.documentElement.classList.remove('dark', 'cute');
    } else {
      document.documentElement.classList.remove('cute');
      document.documentElement.classList.add('dark');
    }
  }

  function handleSelectTheme(nextTheme: ThemeMode) {
    setTheme(nextTheme);
    localStorage.setItem('workbench-theme', nextTheme);
    applyDomClasses(nextTheme);
    setMenuOpen(false);
  }

  function cycleTheme() {
    let next: ThemeMode = 'dark';
    if (theme === 'dark') next = 'light';
    else if (theme === 'light') next = 'cute';
    else next = 'dark';
    handleSelectTheme(next);
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={cycleTheme}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenuOpen(!menuOpen);
        }}
        className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition flex items-center justify-center min-w-[36px] min-h-[36px] touch-manipulation active:scale-95"
        title={`Theme: ${theme === 'dark' ? 'Cyber Dark' : theme === 'light' ? 'Studio Light' : 'Cute Pastel'} (Click to cycle, right-click for menu)`}
      >
        {theme === 'dark' && <Moon className="w-4 h-4 text-blue-400" />}
        {theme === 'light' && <Sun className="w-4 h-4 text-amber-500" />}
        {theme === 'cute' && <Sparkles className="w-4 h-4 text-pink-500 animate-pulse" />}
      </button>

      {menuOpen && (
        <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-50 text-xs font-semibold animate-in fade-in">
          <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider border-b border-slate-100 dark:border-slate-800">
            Appearance
          </div>
          <button
            onClick={() => handleSelectTheme('dark')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
              theme === 'dark' ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            <Moon className="w-4 h-4 text-blue-400 shrink-0" />
            <div className="flex-1">
              <span className="block">Cyber Dark</span>
              <span className="block text-[10px] text-slate-400 font-normal">Default workshop</span>
            </div>
            {theme === 'dark' && <span className="text-blue-500">✓</span>}
          </button>
          <button
            onClick={() => handleSelectTheme('light')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
              theme === 'light' ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            <Sun className="w-4 h-4 text-amber-500 shrink-0" />
            <div className="flex-1">
              <span className="block">Studio Light</span>
              <span className="block text-[10px] text-slate-400 font-normal">Daylit workspace</span>
            </div>
            {theme === 'light' && <span className="text-blue-500">✓</span>}
          </button>
          <button
            onClick={() => handleSelectTheme('cute')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
              theme === 'cute' ? 'text-pink-600 font-bold' : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            <Sparkles className="w-4 h-4 text-pink-500 shrink-0" />
            <div className="flex-1">
              <span className="block">Cute Pastel 🌸</span>
              <span className="block text-[10px] text-pink-400 font-normal">Cozy bubble cards</span>
            </div>
            {theme === 'cute' && <span className="text-pink-500">✓</span>}
          </button>
        </div>
      )}
    </div>
  );
}
