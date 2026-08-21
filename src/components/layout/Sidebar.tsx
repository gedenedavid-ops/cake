'use client';

import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Network,
  Sparkles,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  LogOut,
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useStore } from '@/store';
import { cn } from '@/lib/utils';
import type { NavRoute } from '@/types';

const NAV_ITEMS: { route: NavRoute; label: string; icon: React.ElementType; href: string }[] = [
  { route: 'journal',  label: 'Notes',          icon: BookOpen,  href: '/journal'  },
  { route: 'graph',    label: 'Carte mentale',  icon: Network,   href: '/graph'    },
  { route: 'tutor',    label: 'Tuteur IA',       icon: Sparkles,  href: '/tutor'    },
  { route: 'settings', label: 'Paramètres',      icon: Settings,  href: '/settings' },
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const { sidebarCollapsed, setSidebarCollapsed, openEditor, prefs } = useStore();

  const activeRoute = NAV_ITEMS.find((item) => pathname.startsWith(item.href))?.route ?? 'journal';

  // Nom à afficher : préférence > session > fallback
  const displayName = prefs.displayName.trim() || session?.user?.name || 'Étudiant';
  const displayEmail = session?.user?.email ?? '';
  const avatarLetter = displayName[0]?.toUpperCase() ?? 'E';

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 72 : 220 }}
      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
      className="hidden md:flex flex-col h-screen bg-white border-r border-[#E8E4DF] overflow-hidden flex-shrink-0 z-30"
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-[#E8E4DF] flex-shrink-0">
        <div className="w-8 h-8 rounded-xl bg-[#F4A236] flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">C</span>
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="ml-3 font-semibold text-[#1A1A1A] text-lg whitespace-nowrap"
            >
              Cake
            </motion.span>
          )}
        </AnimatePresence>
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="ml-auto p-1.5 rounded-lg text-[#9B9590] hover:text-[#1A1A1A] hover:bg-[#F5F3EF] transition-colors flex-shrink-0"
          aria-label="Toggle sidebar"
        >
          {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* New Note Button */}
      <div className="px-3 py-3 border-b border-[#E8E4DF]">
        <button
          onClick={() => openEditor()}
          className={cn(
            'flex items-center gap-2.5 w-full rounded-xl bg-[#F4A236] text-white transition-all hover:bg-[#EAA240] active:scale-[0.97]',
            sidebarCollapsed ? 'justify-center p-2' : 'px-3 py-2.5'
          )}
        >
          <Plus size={16} className="flex-shrink-0" />
          {!sidebarCollapsed && (
            <span className="text-sm font-medium whitespace-nowrap">Nouvelle note</span>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ route, label, icon: Icon, href }) => {
          const isActive = activeRoute === route;
          return (
            <button
              key={route}
              onClick={() => router.push(href)}
              className={cn(
                'flex items-center gap-3 w-full rounded-xl px-3 py-2.5 transition-all text-sm font-medium',
                isActive
                  ? 'bg-[#FDF0DC] text-[#F4A236]'
                  : 'text-[#9B9590] hover:bg-[#F5F3EF] hover:text-[#1A1A1A]',
                sidebarCollapsed && 'justify-center px-2'
              )}
              aria-label={label}
              title={label}
            >
              {/* Icône visible uniquement quand la sidebar est réduite */}
              {sidebarCollapsed && <Icon size={18} className="flex-shrink-0" />}
              {!sidebarCollapsed && (
                <span className="whitespace-nowrap">{label}</span>
              )}
              {isActive && !sidebarCollapsed && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-[#F4A236]"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer — user + logout */}
      <div className="px-3 py-3 border-t border-[#E8E4DF] space-y-1">
        {/* User info */}
        <div className={cn(
          'flex items-center gap-2.5 px-2 py-1.5',
          sidebarCollapsed && 'justify-center'
        )}>
          {/* Avatar */}
          {session?.user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user.image}
              alt={displayName}
              className="w-7 h-7 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#F4A236] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              {avatarLetter}
            </div>
          )}
          {!sidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-[#1A1A1A] truncate">{displayName}</p>
              {displayEmail && (
                <p className="text-[10px] text-[#9B9590] truncate">{displayEmail}</p>
              )}
            </div>
          )}
        </div>

        {/* Logout button */}
        <button
          onClick={() => signOut({ callbackUrl: '/auth/connexion' })}
          className={cn(
            'flex items-center gap-2 w-full rounded-xl px-3 py-2 text-xs font-medium text-[#9B9590] hover:bg-red-50 hover:text-red-500 transition-all',
            sidebarCollapsed && 'justify-center px-2'
          )}
          title="Se déconnecter"
        >
          <LogOut size={14} className="flex-shrink-0" />
          {!sidebarCollapsed && <span>Se déconnecter</span>}
        </button>
      </div>
    </motion.aside>
  );
}
