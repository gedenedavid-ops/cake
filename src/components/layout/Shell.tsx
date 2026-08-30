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
  const { accentColor, theme } = useStore((s) => s.prefs);

  // Injecte la couleur d'accent + applique la classe dark sur <html>
  useEffect(() => {
    document.documentElement.style.setProperty('--binlinpad-accent', accentColor);
  }, [accentColor]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#FAF8F5] dark:bg-[#111110]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0 min-w-0 bg-[#FAF8F5] dark:bg-[#111110]">
        {children}
      </main>
      <BottomNav />
      <ToastContainer />
    </div>
  );
}
