'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/lib/types';
import { sounds, triggerConfetti } from '@/lib/soundEffects';
import { formatCurrency, cn } from '@/lib/utils';
import {
  Zap,
  Sparkles,
  Flame,
  Award,
  Check,
  CheckCircle2,
  RefreshCw,
  Volume2,
  Music,
  Smile,
  Heart,
  Coffee,
  Lightbulb,
  Clock,
  ArrowRight,
  Loader2,
  Compass,
  PartyPopper,
  Radio,
  BookOpen,
  Wrench,
  Droplets,
  Layers,
} from 'lucide-react';

interface DopamineClientProps {
  profile: Profile;
  totalXp: number;
  streakDays: number;
  userSkills: any[];
}

interface MiniQuest {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  icon: any;
  skillName: string;
}

const MINI_QUESTS: MiniQuest[] = [
  {
    id: 'bench-reset',
    title: '5-Minute Bench Reset',
    description: 'Clear stray sawdust, return 3 tools to their holders, and wipe your primary work surface.',
    xpReward: 10,
    icon: Wrench,
    skillName: 'general-crafting',
  },
  {
    id: 'hydrate-stretch',
    title: 'Hydration & Posture Reset',
    description: 'Drink a tall glass of ice water, roll your shoulders back 5 times, and stretch both wrists.',
    xpReward: 5,
    icon: Droplets,
    skillName: 'deliberate-practice',
  },
  {
    id: 'thumbnail-sketch',
    title: 'Rapid 5-Thumbnail Sketch',
    description: 'Grab scrap paper and doodle 5 rapid variations of a mechanism, joint, or artistic motif.',
    xpReward: 15,
    icon: Lightbulb,
    skillName: 'creative-spark',
  },
  {
    id: 'sort-label-bin',
    title: 'Sort & Tag One Mystery Bin',
    description: 'Tag or organize one drawer of screws, leftover acrylic cutoffs, or uncategorized hardware.',
    xpReward: 10,
    icon: Layers,
    skillName: 'workshop-organization',
  },
  {
    id: 'technique-lookup',
    title: 'Learn 1 Micro-Technique',
    description: 'Look up one joinery trick, resin degassing tip, or perfume top-note blending standard.',
    xpReward: 15,
    icon: BookOpen,
    skillName: 'deliberate-practice',
  },
];

const DAILY_CHALLENGES = [
  'Tidy one corner of your bench and admire the bare, clean surface.',
  'Sketch 3 impossible, wild, or oversized variations of your current build.',
  'Pair two completely unrelated workshop materials in a quick mock-up test.',
  'Sharpen your favorite chisel, replace an exacto blade, or tune your 3D printer belts.',
  'Brew a warm drink, sit back for 5 minutes, and reflect on everything you created this month.',
  'Sort one mystery drawer of hardware, beads, or electrical components by size.',
  'Draft a 1-sentence elevator pitch for your wildest dream invention.',
  'Test a new resin dye, paint wash, or fabric stitch on scrap cutoff stock.',
  'Inspect your workshop safety gear: wipe safety goggles, check mask filters, and check first aid.',
  'Leave an encouraging, thoughtful comment on another creator\'s post in the Community Feed.',
  'Label three storage bins or jars with their exact contents and purchase date.',
  'Step outside for 3 minutes, breathe deeply, and observe three textures found in nature.',
];

const MAKER_QUOTES = [
  {
    quote: 'Every master was once a disaster. The difference between the novice and the master is that the master has failed more times than the novice has even tried.',
    author: 'Maker Axiom',
  },
  {
    quote: 'Inspiration exists, but it has to find you working.',
    author: 'Pablo Picasso',
  },
  {
    quote: 'A clean workbench is a playground for tomorrow\'s ideas.',
    author: 'Workshop Wisdom',
  },
  {
    quote: 'You can\'t use up creativity. The more you use, the more you have.',
    author: 'Maya Angelou',
  },
  {
    quote: 'Measure twice, cut once, sand forever.',
    author: 'Lumberjack Proverb',
  },
  {
    quote: 'Done is better than perfect. A finished imperfect creation teaches you ten times more than an unstarted masterpiece.',
    author: 'Engineering Creed',
  },
  {
    quote: 'The scariest moment is always just before you start. After that, things can only get better.',
    author: 'Stephen King',
  },
  {
    quote: 'Small daily disciplines compounded over time yield staggering creative breakthroughs.',
    author: 'Atomic Mastery',
  },
];

export default function DopamineClient({
  profile,
  totalXp: initialXp,
  streakDays,
  userSkills,
}: DopamineClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [totalXp, setTotalXp] = useState(initialXp);
  const [celebratingStreak, setCelebratingStreak] = useState(false);
  const [xpBanner, setXpBanner] = useState<{ amount: number; message: string } | null>(null);

  // Sound tap counters for visual tactile feel
  const [tapCounts, setTapCounts] = useState<Record<string, number>>({});

  // Daily Challenge state
  const [challengeIndex, setChallengeIndex] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('workbench_daily_challenge_idx');
      if (saved !== null) return parseInt(saved, 10) % DAILY_CHALLENGES.length;
    }
    const todayNum = new Date().getDate();
    return todayNum % DAILY_CHALLENGES.length;
  });
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [completingChallenge, setCompletingChallenge] = useState(false);

  // Mini-Quests completed IDs today
  const [completedQuestIds, setCompletedQuestIds] = useState<string[]>([]);
  const [completingQuestId, setCompletingQuestId] = useState<string | null>(null);

  // Quotes state
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    // Load today's completed mini-quests from localStorage
    const todayKey = `workbench_dopamine_quests_${new Date().toISOString().split('T')[0]}`;
    try {
      const saved = localStorage.getItem(todayKey);
      if (saved) {
        setCompletedQuestIds(JSON.parse(saved));
      }
      const challengeDoneKey = `workbench_dopamine_challenge_${new Date().toISOString().split('T')[0]}`;
      if (localStorage.getItem(challengeDoneKey)) {
        setChallengeCompleted(true);
      }
    } catch (_) {}
  }, []);

  function handleSoundTap(id: string, playFn: () => void) {
    playFn();
    setTapCounts((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  }

  function handleCelebrateStreak() {
    setCelebratingStreak(true);
    sounds.playLevelUp();
    triggerConfetti();
    setTimeout(() => {
      triggerConfetti();
    }, 400);
    setTimeout(() => {
      setCelebratingStreak(false);
    }, 3000);
  }

  function handleRerollChallenge() {
    sounds.playMechanicalClick();
    const nextIdx = (challengeIndex + 1) % DAILY_CHALLENGES.length;
    setChallengeIndex(nextIdx);
    if (typeof window !== 'undefined') {
      localStorage.setItem('workbench_daily_challenge_idx', String(nextIdx));
    }
  }

  async function handleCompleteChallenge() {
    if (challengeCompleted || completingChallenge) return;
    setCompletingChallenge(true);

    try {
      const challengeText = DAILY_CHALLENGES[challengeIndex];
      const { data, error } = await supabase.rpc('log_skill_practice', {
        p_skill_name: 'creative-spark',
        p_duration_minutes: 5,
        p_xp: 15,
        p_note: `Daily Challenge Completed: ${challengeText}`,
      });

      if (error) throw error;

      sounds.playCoinSound();
      triggerConfetti();
      setTotalXp((prev) => prev + 15);
      setChallengeCompleted(true);

      const todayKey = `workbench_dopamine_challenge_${new Date().toISOString().split('T')[0]}`;
      localStorage.setItem(todayKey, 'true');

      setXpBanner({ amount: 15, message: 'Daily Creative Challenge Complete! +15 XP' });
      setTimeout(() => setXpBanner(null), 3500);
      router.refresh();
    } catch (err: any) {
      console.error('Challenge error:', err);
    } finally {
      setCompletingChallenge(false);
    }
  }

  async function handleCompleteQuest(quest: MiniQuest) {
    if (completedQuestIds.includes(quest.id) || completingQuestId) return;
    setCompletingQuestId(quest.id);

    try {
      const { data, error } = await supabase.rpc('log_skill_practice', {
        p_skill_name: quest.skillName,
        p_duration_minutes: 5,
        p_xp: quest.xpReward,
        p_note: `Micro-Quest Completed: ${quest.title}`,
      });

      if (error) throw error;

      sounds.playCoinSound();
      triggerConfetti();

      const nextIds = [...completedQuestIds, quest.id];
      setCompletedQuestIds(nextIds);
      setTotalXp((prev) => prev + quest.xpReward);

      const todayKey = `workbench_dopamine_quests_${new Date().toISOString().split('T')[0]}`;
      localStorage.setItem(todayKey, JSON.stringify(nextIds));

      setXpBanner({
        amount: quest.xpReward,
        message: `${quest.title} Complete! +${quest.xpReward} XP`,
      });
      setTimeout(() => setXpBanner(null), 3500);
      router.refresh();
    } catch (err: any) {
      console.error('Quest error:', err);
    } finally {
      setCompletingQuestId(null);
    }
  }

  function handleNextQuote() {
    sounds.playSubtaskCheck();
    setQuoteIndex((prev) => (prev + 1) % MAKER_QUOTES.length);
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200 pb-28 lg:pb-12 max-w-6xl mx-auto min-w-0">
      {/* Floating XP Notification Banner */}
      {xpBanner && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xl shadow-emerald-600/30 font-bold text-xs">
            <Sparkles className="w-4 h-4 animate-spin" />
            <span>{xpBanner.message}</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">⭐ +{xpBanner.amount} XP</span>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. HERO BANNER: STREAK CELEBRATION & DOPAMINE SPARK            */}
      {/* ============================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white p-6 sm:p-8 lg:p-10 shadow-xl shadow-purple-600/20">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/10 rounded-l-full pointer-events-none transform translate-x-12" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 border border-white/30 text-white text-xs font-bold backdrop-blur-sm">
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Dopamine &amp; Creative Momentum Station</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              Instant Maker Dopamine
            </h1>
            <p className="text-xs sm:text-sm text-purple-100 leading-relaxed">
              When procrastination or cognitive fatigue strikes: trigger tactile sensory sounds, claim micro-XP boosts, and ignite quick creative momentum.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {/* Streak Counter Box */}
            <div className="px-5 py-3 rounded-2xl bg-white/15 border border-white/25 backdrop-blur-md text-center">
              <span className="text-[10px] font-bold text-purple-200 uppercase tracking-wider block">
                Maker Streak
              </span>
              <div className="flex items-center justify-center gap-1.5 text-2xl font-black mt-0.5">
                <Flame className="w-6 h-6 text-amber-300 fill-current animate-bounce" />
                <span>{streakDays} {streakDays === 1 ? 'Day' : 'Days'}</span>
              </div>
            </div>

            {/* Celebrate Button */}
            <button
              onClick={handleCelebrateStreak}
              disabled={celebratingStreak}
              className="px-6 py-3.5 rounded-2xl bg-white text-purple-900 hover:bg-purple-50 font-black text-xs transition shadow-lg shadow-black/10 flex items-center justify-center gap-2 touch-manipulation active:scale-95 disabled:opacity-75 min-h-[48px]"
            >
              <PartyPopper className={cn('w-4 h-4 text-pink-600', celebratingStreak && 'animate-spin')} />
              <span>{celebratingStreak ? 'Celebrating! 🎉' : 'Celebrate Streak! 💥'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. TACTILE SOUNDBOARD & HAPTIC SATISFACTION STATION            */}
      {/* ============================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 lg:p-8 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900 dark:text-white">
                Tactile Soundboard &amp; Sensory Satisfaction
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Procedural Web Audio synthesizer instruments with zero latency. Tap for immediate tactile acoustic satisfaction.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {/* 1. Bubble Pop */}
          <button
            onClick={() => handleSoundTap('bubble', () => sounds.playBubblePop())}
            className="group p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 hover:border-pink-400 dark:hover:border-pink-500 text-left transition flex flex-col justify-between space-y-3 min-h-[105px] touch-manipulation active:scale-95"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl group-hover:scale-125 transition-transform">🎈</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300">
                {tapCounts['bubble'] || 0}
              </span>
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Bubble Pop</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Organic gentle pop</div>
            </div>
          </button>

          {/* 2. 8-Bit Coin */}
          <button
            onClick={() => handleSoundTap('coin', () => sounds.playCoinSound())}
            className="group p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 hover:border-amber-400 dark:hover:border-amber-500 text-left transition flex flex-col justify-between space-y-3 min-h-[105px] touch-manipulation active:scale-95"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl group-hover:scale-125 transition-transform">🪙</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                {tapCounts['coin'] || 0}
              </span>
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">8-Bit Coin</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Retro RPG ding</div>
            </div>
          </button>

          {/* 3. Magic Shimmer */}
          <button
            onClick={() => handleSoundTap('magic', () => sounds.playMagicChime())}
            className="group p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 hover:border-purple-400 dark:hover:border-purple-500 text-left transition flex flex-col justify-between space-y-3 min-h-[105px] touch-manipulation active:scale-95"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl group-hover:scale-125 transition-transform">✨</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                {tapCounts['magic'] || 0}
              </span>
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Magic Shimmer</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Glittering chime</div>
            </div>
          </button>

          {/* 4. Rhodes Dream Chord */}
          <button
            onClick={() => handleSoundTap('chord', () => sounds.playSuccessChord())}
            className="group p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 hover:border-indigo-400 dark:hover:border-indigo-500 text-left transition flex flex-col justify-between space-y-3 min-h-[105px] touch-manipulation active:scale-95"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl group-hover:scale-125 transition-transform">🎹</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                {tapCounts['chord'] || 0}
              </span>
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Rhodes Chord</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Warm Cmaj7 wash</div>
            </div>
          </button>

          {/* 5. Singing Bowl */}
          <button
            onClick={() => handleSoundTap('bell', () => sounds.playTimerBell())}
            className="group p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 hover:border-emerald-400 dark:hover:border-emerald-500 text-left transition flex flex-col justify-between space-y-3 min-h-[105px] touch-manipulation active:scale-95"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl group-hover:scale-125 transition-transform">🔔</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                {tapCounts['bell'] || 0}
              </span>
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Singing Bowl</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Zen calm ring</div>
            </div>
          </button>

          {/* 6. Victory Fanfare */}
          <button
            onClick={() => handleSoundTap('fanfare', () => sounds.playLevelUp())}
            className="group p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 hover:border-yellow-400 dark:hover:border-yellow-500 text-left transition flex flex-col justify-between space-y-3 min-h-[105px] touch-manipulation active:scale-95"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl group-hover:scale-125 transition-transform">🎺</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-950/60 text-yellow-700 dark:text-yellow-300">
                {tapCounts['fanfare'] || 0}
              </span>
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Victory Fanfare</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Level-up brass</div>
            </div>
          </button>

          {/* 7. Switch Click */}
          <button
            onClick={() => handleSoundTap('click', () => sounds.playMechanicalClick())}
            className="group p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 hover:border-cyan-400 dark:hover:border-cyan-500 text-left transition flex flex-col justify-between space-y-3 min-h-[105px] touch-manipulation active:scale-95"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl group-hover:scale-125 transition-transform">🪵</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300">
                {tapCounts['click'] || 0}
              </span>
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Switch Click</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Crisp tactile impulse</div>
            </div>
          </button>

          {/* 8. Confetti Cannon */}
          <button
            onClick={() => handleSoundTap('confetti', () => triggerConfetti())}
            className="group p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 hover:border-rose-400 dark:hover:border-rose-500 text-left transition flex flex-col justify-between space-y-3 min-h-[105px] touch-manipulation active:scale-95"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl group-hover:scale-125 transition-transform">🎊</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                {tapCounts['confetti'] || 0}
              </span>
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Confetti Blast</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Visual celebration</div>
            </div>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. RANDOM DAILY MAKER CHALLENGE                                */}
      {/* ============================================================== */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 shadow-sm space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <Sparkles className="w-4 h-4 fill-current" />
            <span>Today&apos;s Creative Catalyst</span>
          </div>

          <button
            onClick={handleRerollChallenge}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 text-xs font-semibold transition touch-manipulation active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Roll New Challenge 🎲</span>
          </button>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-500/20 shadow-sm space-y-3">
          <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
            &ldquo;{DAILY_CHALLENGES[challengeIndex]}&rdquo;
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Takes ~5 minutes · No perfection required</span>
            </span>

            <button
              onClick={handleCompleteChallenge}
              disabled={challengeCompleted || completingChallenge}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 touch-manipulation active:scale-95 shadow-sm min-h-[44px]',
                challengeCompleted
                  ? 'bg-emerald-500 text-white cursor-default'
                  : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
              )}
            >
              {completingChallenge ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : challengeCompleted ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{challengeCompleted ? 'Challenge Completed! (+15 XP)' : 'Accept & Complete (+15 XP)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. QUICK MICRO-XP MINI-QUESTS                                  */}
      {/* ============================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 lg:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900 dark:text-white">
                5-Minute Micro-XP Mini-Quests
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Actionable low-friction habits that log real deliberate practice XP directly to your maker account.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800">
            {completedQuestIds.length}/{MINI_QUESTS.length} Done Today
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MINI_QUESTS.map((quest) => {
            const isDone = completedQuestIds.includes(quest.id);
            const isBusy = completingQuestId === quest.id;
            const Icon = quest.icon;

            return (
              <div
                key={quest.id}
                className={cn(
                  'p-4 rounded-2xl border transition flex flex-col justify-between space-y-3',
                  isDone
                    ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 hover:border-slate-300'
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
                      isDone
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                        {quest.title}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 shrink-0">
                        +{quest.xpReward} XP
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {quest.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    onClick={() => handleCompleteQuest(quest)}
                    disabled={isDone || isBusy}
                    className={cn(
                      'px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 touch-manipulation active:scale-95 min-h-[40px]',
                      isDone
                        ? 'bg-emerald-600 text-white cursor-default'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20'
                    )}
                  >
                    {isBusy ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isDone ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <PlusIcon className="w-3.5 h-3.5" />
                    )}
                    <span>{isDone ? 'Completed Today ✓' : 'Mark Done (+XP)'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. ADHD & FLOW-STATE BREAK MENU                                */}
      {/* ============================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 lg:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900 dark:text-white">
                The Maker Break Menu
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                A structured menu for taking healthy cognitive pauses instead of falling into doom-scrolling.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Starters */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              <span>🥗 Starters (2 Mins)</span>
            </div>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                <span><strong>Cold Water Splash:</strong> Awaken sensory nerves at the sink.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                <span><strong>Box Breathing:</strong> 4s inhale, 4s hold, 4s exhale, 4s hold.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                <span><strong>20-20-20 Rule:</strong> Look 20ft away for 20 seconds.</span>
              </li>
            </ul>
          </div>

          {/* Mains */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              <span>🍲 Mains (15 Mins)</span>
            </div>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-purple-500">•</span>
                <span><strong>Sunlight Walk:</strong> Step outside, zero screens, notice textures.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500">•</span>
                <span><strong>Tea/Coffee Ritual:</strong> Slow hand pour, savor steam &amp; aroma.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500">•</span>
                <span><strong>Binaural Focus Beat:</strong> Close eyes with rain or pink noise.</span>
              </li>
            </ul>
          </div>

          {/* Desserts */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400">
              <span>🍰 Desserts (Maker Delights)</span>
            </div>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-pink-500">•</span>
                <span><Link href="/community" className="underline hover:text-white">Community Lab</Link>: Browse public formulas.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pink-500">•</span>
                <span><Link href="/projects" className="underline hover:text-white">Showcase Projects</Link>: Admire completed builds.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pink-500">•</span>
                <span><strong>Trophy Case:</strong> Review verified RPG achievements.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 6. RANDOM MAKER WISDOM QUOTE CAROUSEL                          */}
      {/* ============================================================== */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <Lightbulb className="w-4 h-4 fill-current" />
            <span>Maker Wisdom &amp; Creative Affirmation</span>
          </div>

          <button
            onClick={handleNextQuote}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 hover:text-white transition touch-manipulation active:scale-95"
          >
            <span>Next Spark 💡</span>
          </button>
        </div>

        <blockquote className="text-base sm:text-lg font-medium text-slate-200 italic leading-relaxed pt-1">
          &ldquo;{MAKER_QUOTES[quoteIndex].quote}&rdquo;
        </blockquote>
        <div className="text-xs font-bold text-amber-400">
          — {MAKER_QUOTES[quoteIndex].author}
        </div>
      </div>
    </div>
  );
}

function PlusIcon(props: any) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
