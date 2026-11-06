'use client';

import React from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Flame,
  Award,
  ArrowRight,
  Coffee,
  Boxes,
  Calculator,
  Headphones,
  CheckCircle2,
  Lock,
  Layers,
  Heart,
  MessageSquare,
  Globe,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import UserAvatar from '@/components/UserAvatar';
import { relativeTime } from '@/lib/utils';

interface PublicLandingPageProps {
  recentPosts?: any[];
  recentProjects?: any[];
}

export default function PublicLandingPage({
  recentPosts = [],
  recentProjects = [],
}: PublicLandingPageProps) {
  const buyMeACoffeeUrl =
    process.env.NEXT_PUBLIC_BUYMEACOFFEE_URL || 'https://buymeacoffee.com/orjustdosomething';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* ==================================================================== */}
      {/* 1. PUBLIC NAVIGATION HEADER                                          */}
      {/* ==================================================================== */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
              W
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-white group-hover:text-blue-400 transition-colors">
                Workbench
              </span>
              <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase -mt-1">
                RPG Operating System
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <Link href="/tools" className="hover:text-white transition-colors flex items-center gap-1.5">
              <span>Free Calculators</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                New
              </span>
            </Link>
            <Link href="/community" className="hover:text-white transition-colors">
              Community
            </Link>
            <Link href="/makers" className="hover:text-white transition-colors">
              Makers
            </Link>
            <a href="#showcase" className="hover:text-white transition-colors">
              Showcase
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5">
            {/* Buy Me a Coffee Header Button */}
            <a
              href={buyMeACoffeeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold transition shadow-sm"
              title="Support Workbench development on Buy Me a Coffee"
            >
              <Coffee className="w-3.5 h-3.5 fill-current" />
              <span>Buy Me a Coffee</span>
            </a>

            <Link
              href="/login"
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-800 transition"
            >
              Sign In
            </Link>

            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/30 transition transform hover:-translate-y-0.5"
            >
              <span>Start Free</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* 2. HERO SECTION                                                      */}
      {/* ==================================================================== */}
      <section className="relative pt-20 pb-24 md:pt-28 md:pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Ambient Glow Orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-600/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[300px] bg-purple-600/15 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-8">
          {/* Version & Launch Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold tracking-wide animate-in fade-in duration-700">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Workbench v2.1 — Built for Makers, Engineers &amp; Artisans</span>
          </div>

          {/* Hero Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.08] max-w-4xl mx-auto">
            The RPG Operating System for{' '}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              Makers &amp; Creators
            </span>
          </h1>

          {/* Hero Subheadline */}
          <p className="text-base sm:text-lg lg:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Gamify your workshop. Track builds with task dependencies, level up craft skills with deterministic XP, manage materials with 1-click restock links, and calculate lab formulas with precision.
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <Link
              href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-600/30 transition transform hover:-translate-y-0.5"
            >
              <span>Start Your Workshop — Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href={buyMeACoffeeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 shadow-lg shadow-amber-400/20 transition transform hover:-translate-y-0.5"
            >
              <Coffee className="w-4 h-4 fill-current" />
              <span>Buy Me a Coffee</span>
            </a>

            <a
              href="#showcase"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-900 border border-slate-800 transition"
            >
              <span>Explore Community</span>
            </a>
          </div>

          {/* Trust Badges */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-semibold text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Zero-Client-Trust Security</span>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>Daily Consistency Streaks</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-400" />
              <span>Offline PWA Ready</span>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 3. BENTO GRID FEATURES SECTION                                       */}
      {/* ==================================================================== */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-900 bg-slate-950/60">
        <div className="max-w-7xl mx-auto space-y-14">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-extrabold uppercase tracking-widest text-blue-400">
              Complete Workshop Engine
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Everything Your Creative Workshop Needs
            </h2>
            <p className="text-sm text-slate-400">
              From raw brainstorming notes to structured BOM builds, deliberate practice ledger, and social showcase.
            </p>
          </div>

          {/* 5-Pillar Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: RPG Skill Mastery (Large 2-col) */}
            <div className="md:col-span-2 rounded-3xl bg-slate-900/60 border border-slate-800/80 p-8 relative overflow-hidden group hover:border-slate-700 transition">
              <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 blur-3xl pointer-events-none rounded-full" />
              <div className="relative space-y-5">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Award className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">
                    RPG Skill Progression &amp; 365-Day Consistency Heatmap
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed max-w-xl">
                    Every task completed and deliberate practice session logged awards auditable Experience Points (XP). Watch your mastery advance deterministically across Apprenticeship, Journeyman, Artisan, and Master tiers.
                  </p>
                </div>

                {/* Visual Preview Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Level 1–9</span>
                    <span className="text-xs font-extrabold text-slate-300">Apprentice</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-[10px] font-bold text-blue-400 uppercase block">Level 10–24</span>
                    <span className="text-xs font-extrabold text-blue-300">Journeyman</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-[10px] font-bold text-purple-400 uppercase block">Level 25–49</span>
                    <span className="text-xs font-extrabold text-purple-300">Artisan</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-[10px] font-bold text-amber-400 uppercase block">Level 50+</span>
                    <span className="text-xs font-extrabold text-amber-300">Master Crafter</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Procedural Focus Audio */}
            <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-8 relative overflow-hidden group hover:border-slate-700 transition">
              <div className="space-y-5">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Headphones className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">Procedural Focus Audio Bar</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Zero external MP3s. Procedural Web Audio synthesizer generates binaural beats, pink/brown noise, and lofi chimes directly in your browser.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-purple-400 pt-2">
                  <Flame className="w-4 h-4 fill-current text-amber-400" />
                  <span>Built-in 25-Min Pomodoro Timer</span>
                </div>
              </div>
            </div>

            {/* Card 3: Kanban with Task Dependencies */}
            <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-8 relative overflow-hidden group hover:border-slate-700 transition">
              <div className="space-y-5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Layers className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">Task Dependencies &amp; BOM</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Prevent out-of-order execution with prerequisite task locks. Attach inventory materials to tasks and auto-deduct stock upon completion.
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Prerequisite Enforcement</span>
                </div>
              </div>
            </div>

            {/* Card 4: Smart Inventory & Restock Links (Large 2-col) */}
            <div className="md:col-span-2 rounded-3xl bg-slate-900/60 border border-slate-800/80 p-8 relative overflow-hidden group hover:border-slate-700 transition">
              <div className="absolute top-0 right-0 w-80 h-80 bg-amber-600/10 blur-3xl pointer-events-none rounded-full" />
              <div className="relative space-y-5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Boxes className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">
                    Maker Inventory &amp; 1-Click AliExpress/Temu Restock Cart
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed max-w-xl">
                    Track raw materials, tools, and finished goods. When stock drops below minimum thresholds, items auto-populate your restock cart with pre-configured search links.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-semibold text-slate-300">
                  <span className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700">⚡ Auto Stock Deduction</span>
                  <span className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700">📦 Custom Units &amp; Steppers</span>
                  <span className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700">💰 Unit Economics &amp; Margin Simulator</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 4. LAB CALCULATORS SECTION                                           */}
      {/* ==================================================================== */}
      <section id="calculators" className="py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-900 bg-slate-950">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-400">
              Interactive Lab Tools
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Precision Formulations Without Guesswork
            </h2>
            <p className="text-sm text-slate-400">
              Stop guessing batch weights and cure times. Built-in lab calculators for resin artisans, perfumers, and 3D printing shops.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Calculator 1: Epoxy Resin */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                🧪
              </div>
              <h3 className="text-base font-bold text-white">Epoxy Resin &amp; Mold Volume</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Calculate Part A/B ratios for rectangular, cylindrical, or custom molds. Warns against exothermic thermal runaway on pours over 100g.
              </p>
            </div>

            {/* Calculator 2: Perfume Accord */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                🌸
              </div>
              <h3 className="text-base font-bold text-white">Perfume Dilution &amp; Maceration</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Extrait, EDP, EDT, and EDC formulation with alcohol density weighting and maturation aging schedules.
              </p>
            </div>

            {/* Calculator 3: 3D Print Costing */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                🖨️
              </div>
              <h3 className="text-base font-bold text-white">3D Print Prototyping Cost</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Calculates material grams, purge allowance, machine electrical wattage costs, and target retail gross margins.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 5. COMMUNITY SHOWCASE SECTION                                        */}
      {/* ==================================================================== */}
      <section id="showcase" className="py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-900 bg-slate-950/80">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
                Community Creations
              </span>
              <h2 className="text-3xl font-extrabold text-white tracking-tight">
                Live Public Maker Showcase
              </h2>
              <p className="text-sm text-slate-400">
                Browse real builds, prototypes, and milestones crafted by Workbench makers.
              </p>
            </div>

            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition"
            >
              <span>Join the Community</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Recent Community Posts & Public Projects */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recentPosts.length > 0 ? (
              recentPosts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-3xl bg-slate-900/60 border border-slate-800 p-6 flex flex-col justify-between space-y-4 hover:border-slate-700 transition"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        src={post.author?.avatar_url}
                        name={post.author?.display_name || post.author?.username}
                        size="md"
                        shape="circle"
                      />
                      <div className="overflow-hidden">
                        <Link
                          href={`/makers/${post.author?.username}`}
                          className="text-xs font-bold text-white hover:text-blue-400 transition truncate block"
                        >
                          {post.author?.display_name || post.author?.username}
                        </Link>
                        <span className="text-[10px] text-slate-500">
                          @{post.author?.username} &bull; {relativeTime(post.created_at)}
                        </span>
                      </div>
                    </div>

                    {post.skill && (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {post.skill.name}
                      </span>
                    )}

                    <p className="text-xs text-slate-300 line-clamp-4 leading-relaxed whitespace-pre-wrap">
                      {post.content_md}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-500">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5" />
                        {post.likes_count || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {post.comments_count || 0}
                      </span>
                    </div>

                    <Link
                      href={`/makers/${post.author?.username}`}
                      className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                    >
                      <span>View Profile</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))
            ) : recentProjects.length > 0 ? (
              recentProjects.map((project) => (
                <div
                  key={project.id}
                  className="rounded-3xl bg-slate-900/60 border border-slate-800 p-6 flex flex-col justify-between space-y-4 hover:border-slate-700 transition"
                >
                  <div className="space-y-3">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Public Showcase Project
                    </span>
                    <h3 className="text-base font-bold text-white">{project.name}</h3>
                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                      {project.description || 'Public workshop build blueprint.'}
                    </p>
                  </div>

                  <Link
                    href={`/projects/${project.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition"
                  >
                    <span>Inspect Blueprint</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-12 rounded-3xl bg-slate-900/40 border border-slate-800">
                <Globe className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Public showcase projects and maker milestones live here.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 6. BOTTOM CALL TO ACTION                                             */}
      {/* ==================================================================== */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-slate-900 bg-gradient-to-b from-slate-950 to-blue-950/20 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-blue-600/20 border border-blue-500/30 text-blue-400 mb-2">
            <Sparkles className="w-7 h-7" />
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Ready to Level Up Your Workshop?
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Join thousands of multidisciplinary makers, electrical engineers, and craft artisans tracking their creative progression on Workbench.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-600/30 transition transform hover:-translate-y-0.5"
            >
              <span>Create Free Account</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href={buyMeACoffeeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-sm font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 shadow-lg shadow-amber-400/20 transition transform hover:-translate-y-0.5"
            >
              <Coffee className="w-4 h-4 fill-current" />
              <span>Support on Buy Me a Coffee</span>
            </a>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 7. FOOTER                                                            */}
      {/* ==================================================================== */}
      <footer className="border-t border-slate-900 py-12 px-4 sm:px-6 lg:px-8 bg-slate-950 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
              W
            </div>
            <span className="font-extrabold text-slate-300">Workbench</span>
            <span>&bull; The RPG Operating System for Makers</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/tools" className="hover:text-slate-300 transition">
              Calculators
            </Link>
            <Link href="/community" className="hover:text-slate-300 transition">
              Community
            </Link>
            <Link href="/makers" className="hover:text-slate-300 transition">
              Makers
            </Link>
            <a
              href={buyMeACoffeeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-bold transition"
            >
              <Coffee className="w-3.5 h-3.5 fill-current" />
              <span>Buy Me a Coffee</span>
            </a>
            <Link href="/login" className="hover:text-slate-300 transition">
              Sign In
            </Link>
            <Link href="/signup" className="hover:text-slate-300 transition">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
