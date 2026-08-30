'use client';

import { usePathname, useRouter } from 'next/navigation';
import { BookOpen, Network, Sparkles, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NavRoute } from '@/types';

const NAV_ITEMS: { route: NavRoute; label: string; icon: React.ElementType; href: string }[] = [
  { route: 'journal',  label: 'Notes',      icon: BookOpen,  href: '/journal'  },
  { route: 'graph',    label: 'Carte',      icon: Network,   href: '/graph'    },
  { route: 'tutor',    label: 'Tuteur',     icon: Sparkles,  href: '/tutor'    },
  { route: 'settings', label: 'Réglages',   icon: Settings,  href: '/settings' },
];

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const activeRoute = NAV_ITEMS.find((item) => pathname.startsWith(item.href))?.route ?? 'journal';

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#1C1B19] border-t border-[#E8E4DF] dark:border-[#2E2C28] safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map(({ route, label, icon: Icon, href }) => {
          const isActive = activeRoute === route;
          return (
            <button
              key={route}
              onClick={() => router.push(href)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-colors min-w-[56px]',
                isActive ? 'text-[#F4A236]' : 'text-[#9B9590]'
              )}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className={cn('text-[10px] font-medium', isActive ? 'text-[#F4A236]' : 'text-[#9B9590]')}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
