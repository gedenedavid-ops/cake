import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Subject, Mood, Note } from '@/types';

// ─── Class Merging ────────────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Date Formatting ──────────────────────────────────────────────────────────

export function formatNoteDate(date: Date): string {
  if (isToday(date)) return `Aujourd'hui à ${format(date, 'HH:mm')}`;
  if (isYesterday(date)) return `Hier à ${format(date, 'HH:mm')}`;
  return format(date, 'd MMM yyyy');
}

export function formatRelativeDate(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true, locale: fr });
}

// ─── Text Utilities ───────────────────────────────────────────────────────────

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function estimateReadTime(text: string): number {
  const words = countWords(text);
  return Math.max(1, Math.ceil(words / 200));
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '…';
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Subject Config ───────────────────────────────────────────────────────────

export const SUBJECT_CONFIG: Record<Subject, { emoji: string; color: string; bg: string }> = {
  'Mathematics':       { emoji: '📐', color: '#3B82F6', bg: '#EFF6FF' },
  'Physics':           { emoji: '⚛️', color: '#8B5CF6', bg: '#F5F3FF' },
  'Chemistry':         { emoji: '🧪', color: '#10B981', bg: '#ECFDF5' },
  'Biology':           { emoji: '🌿', color: '#22C55E', bg: '#F0FDF4' },
  'History':           { emoji: '📜', color: '#F59E0B', bg: '#FFFBEB' },
  'Geography':         { emoji: '🌍', color: '#06B6D4', bg: '#ECFEFF' },
  'Literature':        { emoji: '📚', color: '#EC4899', bg: '#FDF2F8' },
  'Computer Science':  { emoji: '💻', color: '#6366F1', bg: '#EEF2FF' },
  'Philosophy':        { emoji: '🤔', color: '#78716C', bg: '#F5F5F4' },
  'Languages':         { emoji: '🗣️', color: '#F97316', bg: '#FFF7ED' },
  'Economics':         { emoji: '📈', color: '#14B8A6', bg: '#F0FDFA' },
  'Art':               { emoji: '🎨', color: '#E11D48', bg: '#FFF1F2' },
  'Other':             { emoji: '📝', color: '#9B9590', bg: '#F5F3EF' },
};

// ─── Mood Config ──────────────────────────────────────────────────────────────

export const MOOD_CONFIG: Record<Mood, { emoji: string; label: string; color: string }> = {
  focused:   { emoji: '🎯', label: 'Concentré',  color: '#3B82F6' },
  confused:  { emoji: '😕', label: 'Confus',     color: '#F59E0B' },
  tired:     { emoji: '😴', label: 'Fatigué',    color: '#8B5CF6' },
  motivated: { emoji: '🔥', label: 'Motivé',     color: '#EF4444' },
  anxious:   { emoji: '😰', label: 'Anxieux',    color: '#EC4899' },
  calm:      { emoji: '😌', label: 'Serein',     color: '#10B981' },
};

// ─── Note Color Config ────────────────────────────────────────────────────────

export const NOTE_COLORS = {
  default: { bg: '#FFFFFF',  text: '#1A1A1A', border: '#E8E4DF' },
  ochre:   { bg: '#F4A236',  text: '#FFFFFF', border: '#EAA240' },
  dark:    { bg: '#1A1A1A',  text: '#FFFFFF', border: '#2C2C2C' },
};

// ─── Local Storage ────────────────────────────────────────────────────────────

export function getFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage quota exceeded — ignore
  }
}

// ─── Note Serialization (Date revival) ───────────────────────────────────────

export function reviveNote(raw: Record<string, unknown>): Note {
  return {
    ...(raw as Note),
    createdAt: new Date(raw.createdAt as string),
    updatedAt: new Date(raw.updatedAt as string),
  };
}

// ─── Graph Color Map ──────────────────────────────────────────────────────────

export const GRAPH_NODE_COLORS = {
  subject: '#F4A236',
  concept: '#1A1A1A',
  note:    '#9B9590',
  mood:    '#E8E4DF',
};
