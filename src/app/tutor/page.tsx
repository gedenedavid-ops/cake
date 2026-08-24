'use client';

import { useEffect } from 'react';
import { Shell } from '@/components/layout/Shell';
import { ChatPanel } from '@/components/tutor/ChatPanel';
import { NoteEditor } from '@/components/journal/NoteEditor';
import { PinLockModal } from '@/components/journal/PinLock';
import { useStore } from '@/store';

export default function TutorPage() {
  const { loadSessions, loadUserProfile, sessionsLoaded, profileLoaded } = useStore();

  useEffect(() => {
    if (!sessionsLoaded) loadSessions();
    if (!profileLoaded) loadUserProfile();
  }, [loadSessions, loadUserProfile, sessionsLoaded, profileLoaded]);

  return (
    <Shell>
      <div className="h-screen overflow-hidden">
        <ChatPanel />
      </div>
      <NoteEditor />
      <PinLockModal />
    </Shell>
  );
}
