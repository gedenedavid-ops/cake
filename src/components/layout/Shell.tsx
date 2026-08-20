'use client';

import { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { ToastContainer } from '@/components/ui/Toast';
import { useStore } from '@/store';

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  const accentColor = useStore((s) => s.prefs.accentColor);

  // Injecte la couleur d'accentuation comme variable CSS globale
  // afin que les composants puissent utiliser var(--cake-accent)
  useEffect(() => {
    document.documentElement.style.setProperty('--cake-accent', accentColor);
  }, [accentColor]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#FAF8F5]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0 min-w-0">
        {children}
      </main>
      <BottomNav />
      <ToastContainer />
    </div>
  );
}
