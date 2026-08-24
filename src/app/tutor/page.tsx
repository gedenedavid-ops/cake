'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { ChatPanel } from '@/components/tutor/ChatPanel';
import { NoteEditor } from '@/components/journal/NoteEditor';
import { PinLockModal } from '@/components/journal/PinLock';
import { useStore } from '@/store';

// Composant interne isolé dans Suspense (requis par useSearchParams)
function TutorContent() {
  const { loadSessions, loadUserProfile, sessionsLoaded, profileLoaded } = useStore();
  const searchParams = useSearchParams();
  const subjectFromGraph = searchParams.get('subject') ?? undefined;

  useEffect(() => {
    if (!sessionsLoaded) loadSessions();
    if (!profileLoaded) loadUserProfile();
  }, [loadSessions, loadUserProfile, sessionsLoaded, profileLoaded]);

  return (
    <div className="h-screen overflow-hidden">
      <ChatPanel initialPrompt={subjectFromGraph
        ? `Interroge-moi sur mes notes de ${subjectFromGraph} et aide-moi à identifier mes lacunes 🎯`
        : undefined}
      />
    </div>
  );
}

export default function TutorPage() {
  return (
    <Shell>
      <Suspense fallback={<div className="h-screen" />}>
        <TutorContent />
      </Suspense>
      <NoteEditor />
      <PinLockModal />
    </Shell>
  );
}
