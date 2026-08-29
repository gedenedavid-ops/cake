'use client';

import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { getStreak, type StreakData } from '@/lib/streak';
import { cn } from '@/lib/utils';

/**
 * Badge de streak affiché dans les headers (journal, tutor).
 * Ne se monte que côté client (localStorage).
 */
export function StreakBadge({ className }: { className?: string }) {
  const [streak, setStreak] = useState<StreakData | null>(null);

  useEffect(() => {
    setStreak(getStreak());
  }, []);

  if (!streak || streak.count === 0) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold select-none',
        streak.count >= 7 ? 'bg-orange-100 text-orange-600' : 'bg-[#FDF0DC] text-[#F4A236]',
        className
      )}
      title={`Meilleur streak : ${streak.longest} jour${streak.longest > 1 ? 's' : ''}`}
    >
      <Flame size={10} />
      {streak.count} jour{streak.count > 1 ? 's' : ''}
    </span>
  );
}
