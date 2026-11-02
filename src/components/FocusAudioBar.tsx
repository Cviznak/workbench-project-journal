'use client';

import { useState, useEffect, useRef } from 'react';
import { sounds } from '@/lib/soundEffects';
import {
  Headphones,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  CloudRain,
  Radio,
  Waves,
  Zap,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Timer,
} from 'lucide-react';

type SoundMode = 'off' | 'lofi' | 'rain' | 'brown' | 'binaural';

export default function FocusAudioBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [soundMode, setSoundMode] = useState<SoundMode>('off');
  const [volume, setVolume] = useState(0.35);

  // Pomodoro state
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<'work' | 'break'>('work');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Soundscape switcher
  function handleSelectMode(mode: SoundMode) {
    if (mode === soundMode) {
      sounds.stopAmbient();
      setSoundMode('off');
    } else {
      setSoundMode(mode);
      if (mode !== 'off') {
        sounds.playAmbient(mode, volume);
      } else {
        sounds.stopAmbient();
      }
    }
  }

  function handleVolumeChange(newVol: number) {
    setVolume(newVol);
    sounds.setAmbientVolume(newVol);
  }

  // Pomodoro timer ticker
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            // Timer finished
            sounds.playTimerBell();
            if (timerMode === 'work') {
              setTimerMode('break');
              return 5 * 60; // 5 min break
            } else {
              setTimerMode('work');
              return 25 * 60; // back to work
            }
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning, timerMode]);

  function toggleTimer() {
    setIsTimerRunning(!isTimerRunning);
  }

  function resetTimer(mode: 'work' | 'break') {
    setIsTimerRunning(false);
    setTimerMode(mode);
    setTimerSeconds(mode === 'work' ? 25 * 60 : 5 * 60);
  }

  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="relative">
      {/* Trigger pill */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
          soundMode !== 'off' || isTimerRunning
            ? 'bg-blue-500/10 border-blue-500/30 text-blue-500 dark:text-blue-400 shadow-sm'
            : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
        }`}
        title="Focus Soundscape & Pomodoro Timer"
      >
        <Headphones className={`w-3.5 h-3.5 ${soundMode !== 'off' ? 'animate-pulse text-blue-500' : ''}`} />
        <span className="hidden sm:inline">
          {soundMode !== 'off'
            ? soundMode.toUpperCase()
            : isTimerRunning
            ? timeFormatted
            : 'Focus & Ambience'}
        </span>
        {isTimerRunning && (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        )}
        {isOpen ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
      </button>

      {/* Flyout panel */}
      {isOpen && (
        <div className="fixed sm:absolute right-4 sm:right-0 top-16 sm:top-10 mt-1 w-[calc(100vw-2rem)] sm:w-80 max-w-sm p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Focus Studio
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Offline Ready</span>
          </div>

          {/* Pomodoro Timer Section */}
          <div className="mt-3.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Timer className="w-3.5 h-3.5 text-blue-500" />
                <span>{timerMode === 'work' ? 'Focus Interval' : 'Rest Break'}</span>
              </div>
              <div className="flex gap-1 text-[11px]">
                <button
                  onClick={() => resetTimer('work')}
                  className={`px-2 py-0.5 rounded-md font-medium transition ${
                    timerMode === 'work'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  25m
                </button>
                <button
                  onClick={() => resetTimer('break')}
                  className={`px-2 py-0.5 rounded-md font-medium transition ${
                    timerMode === 'break'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  5m
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-2xl font-mono font-bold tracking-tight text-slate-900 dark:text-white">
                {timeFormatted}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={toggleTimer}
                  className={`p-2 rounded-lg text-white font-medium text-xs transition flex items-center gap-1 ${
                    isTimerRunning
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isTimerRunning ? 'Pause' : 'Start'}</span>
                </button>
                <button
                  onClick={() => resetTimer(timerMode)}
                  className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 transition"
                  title="Reset"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Ambient Soundscapes */}
          <div className="mt-4">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Ambient Audio
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleSelectMode('lofi')}
                className={`p-2 rounded-xl text-left border text-xs font-medium transition flex items-center gap-2 ${
                  soundMode === 'lofi'
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-pink-500" />
                <span>Lo-Fi Radio</span>
              </button>

              <button
                onClick={() => handleSelectMode('rain')}
                className={`p-2 rounded-xl text-left border text-xs font-medium transition flex items-center gap-2 ${
                  soundMode === 'rain'
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <CloudRain className="w-3.5 h-3.5 text-cyan-500" />
                <span>Rainstorm</span>
              </button>

              <button
                onClick={() => handleSelectMode('brown')}
                className={`p-2 rounded-xl text-left border text-xs font-medium transition flex items-center gap-2 ${
                  soundMode === 'brown'
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Waves className="w-3.5 h-3.5 text-amber-500" />
                <span>Brown Noise</span>
              </button>

              <button
                onClick={() => handleSelectMode('binaural')}
                className={`p-2 rounded-xl text-left border text-xs font-medium transition flex items-center gap-2 ${
                  soundMode === 'binaural'
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-purple-500" />
                <span>Alpha Beats</span>
              </button>
            </div>
          </div>

          {/* Volume slider & Mute button */}
          {soundMode !== 'off' && (
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
              <button
                onClick={() => handleSelectMode('off')}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                title="Turn Off"
              >
                <VolumeX className="w-4 h-4" />
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-full accent-blue-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
              />
              <Volume2 className="w-4 h-4 text-slate-400" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
