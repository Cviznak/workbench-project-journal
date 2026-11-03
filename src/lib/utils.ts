import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Deterministic Level Formula:
 * level = floor(0.1 * sqrt(total_xp)) + 1
 */
export function calculateLevel(xp: number): number {
  return Math.floor(0.1 * Math.sqrt(Math.max(0, xp))) + 1;
}

/**
 * Total XP required to reach a specific level L:
 * xp = 100 * (L - 1)^2
 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return 100 * Math.pow(level - 1, 2);
}

/**
 * Returns level progress metrics:
 * currentLevel, startXp, nextLevelXp, currentInLevel, neededInLevel, progressPct
 */
export function getLevelProgress(totalXp: number) {
  const xp = Math.max(0, totalXp || 0);
  const currentLevel = calculateLevel(xp);
  const startXp = xpForLevel(currentLevel);
  const nextLevelXp = xpForLevel(currentLevel + 1);
  const neededInLevel = nextLevelXp - startXp;
  const currentInLevel = xp - startXp;
  const progressPct = Math.min(100, Math.max(0, Math.round((currentInLevel / neededInLevel) * 100)));
  const toNextLevel = nextLevelXp - xp;

  return {
    currentLevel,
    startXp,
    nextLevelXp,
    currentInLevel,
    neededInLevel,
    progressPct,
    toNextLevel,
  };
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export function formatCurrency(amount: number, currency: string = 'ILS'): string {
  const num = Number(amount) || 0;
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₪';
  return `${symbol}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function relativeTime(dateString?: string | null): string {

  if (!dateString) return "just now";
  try {
    const d = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffSec < 60) return "just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return formatDate(dateString);
  } catch {
    return "recently";
  }
}
