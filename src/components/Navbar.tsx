'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/lib/types';
import { getLevelProgress } from '@/lib/utils';
import { Flame, Plus, LogOut, Settings, Shield, Menu, X, Search } from 'lucide-react';
import PracticeModal from './PracticeModal';
import FocusAudioBar from './FocusAudioBar';
import ThemeToggle from './ThemeToggle';
import SpotlightSearch from './SpotlightSearch';

interface NavbarProps {
  profile: Profile | null;
  totalXp: number;
}

export default function Navbar({ profile, totalXp }: NavbarProps) {
  const router = useRouter();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [practiceModalOpen, setPracticeModalOpen] = useState(false);
  const [spotlightOpen, setSpotlightOpen] = useState(false);

  const levelInfo = getLevelProgress(totalXp);
  const isAdmin = profile?.role === 'ROOT_ADMIN' || profile?.role === 'ADMIN';

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSpotlightOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/" className="lg:hidden flex items-center gap-2">
            <span className="text-xl">🪵</span>
            <span className="font-bold text-base text-slate-900 dark:text-white">
              Workbench
            </span>
          </Link>

          {/* Spotlight Search Trigger */}
          <button
            onClick={() => setSpotlightOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs transition"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="text-slate-500 dark:text-slate-400">Search or jump to...</span>
            <span className="ml-2 px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[10px] text-slate-400">
              Ctrl K
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Ambient Focus & Pomodoro Tool */}
          <FocusAudioBar />

          {/* Theme Switcher */}
          <ThemeToggle />

          {/* Global User XP & Level Pill */}
          <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
            <div className="flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400">
              <Flame className="w-3.5 h-3.5 fill-current text-blue-500" />
              <span>Lv {levelInfo.currentLevel}</span>
            </div>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="text-slate-600 dark:text-slate-300 font-semibold">
              {totalXp.toLocaleString()} XP
            </span>
          </div>

          {/* Quick Practice Trigger Button */}
          <button
            onClick={() => setPracticeModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-semibold text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Log Practice</span>
          </button>

          {/* User Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center ring-2 ring-slate-100 dark:ring-slate-800"
            >
              {profile?.display_name?.charAt(0).toUpperCase() || 'U'}
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 text-sm"
                onClick={() => setMenuOpen(false)}
              >
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="font-semibold text-slate-900 dark:text-white truncate">
                    {profile?.display_name}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                    @{profile?.username}
                  </p>
                </div>

                <div className="py-1">
                  <Link
                    href="/settings"
                    className="flex items-center gap-2.5 px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Settings</span>
                  </Link>

                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-2.5 px-4 py-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-xs font-semibold"
                    >
                      <Shield className="w-4 h-4" />
                      <span>Admin Hub</span>
                    </Link>
                  )}
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileNavOpen(false)}
        >
          <div
            className="w-64 bg-white dark:bg-slate-900 h-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-lg text-slate-900 dark:text-white">Workbench</span>
              <button onClick={() => setMobileNavOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <nav className="space-y-2 text-sm font-semibold">
              <Link
                href="/"
                className="block p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => setMobileNavOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                href="/skills"
                className="block p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => setMobileNavOpen(false)}
              >
                Skills &amp; XP
              </Link>
              <Link
                href="/workspace"
                className="block p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => setMobileNavOpen(false)}
              >
                Ideas &amp; Notes
              </Link>
              <Link
                href="/projects"
                className="block p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => setMobileNavOpen(false)}
              >
                Projects &amp; Tasks
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="block p-2 rounded-xl text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                  onClick={() => setMobileNavOpen(false)}
                >
                  Admin Hub
                </Link>
              )}
              <Link
                href="/settings"
                className="block p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => setMobileNavOpen(false)}
              >
                Settings
              </Link>
            </nav>
          </div>
        </div>
      )}

      {/* Practice Logger Modal */}
      {practiceModalOpen && (
        <PracticeModal onClose={() => setPracticeModalOpen(false)} />
      )}

      {/* Spotlight Command Palette */}
      <SpotlightSearch
        isOpen={spotlightOpen}
        onClose={() => setSpotlightOpen(false)}
        onOpenPractice={() => setPracticeModalOpen(true)}
      />
    </>
  );
}
