'use client';

import { Shell } from '@/components/layout/Shell';
import { ChatPanel } from '@/components/tutor/ChatPanel';
import { NoteEditor } from '@/components/journal/NoteEditor';
import { PinLockModal } from '@/components/journal/PinLock';

export default function TutorPage() {
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
