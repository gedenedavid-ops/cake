/**
 * Gestion du streak (jours consécutifs d'activité).
 * Stocké dans localStorage sous la clé `binlinpad_streak`.
 * Un "jour actif" = l'utilisateur a pris une note OU échangé avec le tuteur.
 */

import { getFromStorage, setToStorage } from './utils';

const STREAK_KEY = 'binlinpad_streak';

export type StreakData = {
  count: number;          // jours consécutifs actuels
  longest: number;        // meilleur streak historique
  lastActiveDate: string; // ISO date (YYYY-MM-DD) du dernier jour actif
};

const DEFAULT_STREAK: StreakData = { count: 0, longest: 0, lastActiveDate: '' };

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

/** Lit le streak actuel depuis localStorage. */
export function getStreak(): StreakData {
  return getFromStorage<StreakData>(STREAK_KEY, DEFAULT_STREAK);
}

/**
 * À appeler lors de toute activité de l'utilisateur (note créée/modifiée ou message envoyé).
 * Met à jour le streak et retourne les nouvelles données.
 */
export function recordActivity(): StreakData {
  const today = toDateStr(new Date());
  const data   = getStreak();

  if (data.lastActiveDate === today) {
    // Déjà compté aujourd'hui — rien à faire
    return data;
  }

  const yesterday = toDateStr(new Date(Date.now() - 86_400_000));
  const newCount = data.lastActiveDate === yesterday ? data.count + 1 : 1;
  const updated: StreakData = {
    count:          newCount,
    longest:        Math.max(newCount, data.longest),
    lastActiveDate: today,
  };
  setToStorage(STREAK_KEY, updated);
  return updated;
}
