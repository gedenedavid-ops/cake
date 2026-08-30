import { cn } from '@/lib/utils';

// ─── Bloc shimmer de base ─────────────────────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl bg-[#EDEBE7]',
        className
      )}
    />
  );
}

// ─── Skeleton d'une NoteCard ──────────────────────────────────────────────────

export function NoteCardSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <div className={cn('bg-white rounded-2xl border border-[#E8E4DF] p-4 space-y-3', tall ? 'h-52' : 'h-36')}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-16 rounded-full" />
        <Skeleton className="h-3 w-10" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
      {tall && <Skeleton className="h-3 w-1/2" />}
    </div>
  );
}

// ─── Skeleton de la grille Journal ───────────────────────────────────────────

export function JournalSkeleton() {
  const cards = [
    { tall: false }, { tall: true }, { tall: false }, { tall: true },
    { tall: true },  { tall: false }, { tall: true }, { tall: false },
  ];
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#E8E4DF] px-5 md:px-8 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-9 w-36 rounded-xl" />
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
      {/* Stats */}
      <div className="px-5 md:px-8 pt-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-[#E8E4DF] space-y-2">
              <Skeleton className="h-8 w-8 rounded-xl" />
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
        {/* Notes masonry */}
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3 space-y-3">
          {cards.map((c, i) => (
            <div key={i} className="break-inside-avoid">
              <NoteCardSkeleton tall={c.tall} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton du tuteur IA ────────────────────────────────────────────────────

export function TutorSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar sessions */}
      <div className="hidden md:flex flex-col w-64 border-r border-[#E8E4DF] bg-white p-4 space-y-3 flex-shrink-0">
        <Skeleton className="h-5 w-24 mb-2" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-xl" />
        ))}
      </div>
      {/* Zone chat */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#E8E4DF]">
          <Skeleton className="h-6 w-40" />
        </div>
        {/* Messages */}
        <div className="flex-1 px-5 py-6 space-y-5 overflow-hidden">
          {/* Message assistant */}
          <div className="flex gap-3">
            <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
            <div className="space-y-2 flex-1 max-w-lg">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          </div>
          {/* Message utilisateur */}
          <div className="flex gap-3 flex-row-reverse">
            <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
            <div className="space-y-2 max-w-xs">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
          {/* Message assistant */}
          <div className="flex gap-3">
            <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
            <div className="space-y-2 flex-1 max-w-md">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>
        {/* Input */}
        <div className="px-5 py-4 border-t border-[#E8E4DF]">
          <Skeleton className="h-12 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton du graphe ───────────────────────────────────────────────────────

export function GraphSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 md:px-8 py-4 border-b border-[#E8E4DF] flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>
      {/* Canvas zone */}
      <div className="flex-1 relative overflow-hidden bg-[#FAF8F5]">
        {/* Nœuds simulés */}
        {[
          { top: '30%', left: '45%', size: 48 },
          { top: '20%', left: '25%', size: 36 },
          { top: '55%', left: '30%', size: 40 },
          { top: '45%', left: '65%', size: 36 },
          { top: '70%', left: '55%', size: 32 },
          { top: '25%', left: '60%', size: 28 },
          { top: '60%', left: '20%', size: 28 },
        ].map((node, i) => (
          <div
            key={i}
            className="absolute animate-pulse rounded-full bg-[#EDEBE7]"
            style={{
              top: node.top, left: node.left,
              width: node.size, height: node.size,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
        {/* Légende en bas */}
        <div className="absolute bottom-6 left-6 right-6 flex gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 flex-1 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton de la page Paramètres ──────────────────────────────────────────

export function SettingsSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-5 md:px-8 py-6">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-3 w-52" />
      </div>
      {/* Tab bar */}
      <Skeleton className="h-10 w-full rounded-2xl mb-6" />
      {/* Cards */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-[#E8E4DF] overflow-hidden mb-4">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[#E8E4DF]">
            <Skeleton className="w-8 h-8 rounded-xl" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="p-5 space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            {i === 0 && <Skeleton className="h-14 w-full rounded-xl" />}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Skeleton de la Sidebar (pendant chargement session) ─────────────────────

export function SidebarSkeleton() {
  return (
    <div className="hidden md:flex flex-col h-screen bg-white border-r border-[#E8E4DF] w-[220px] flex-shrink-0">
      <div className="h-14 flex items-center px-3 gap-2 border-b border-[#E8E4DF]">
        <Skeleton className="w-7 h-7 rounded-lg" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="px-3 py-3 border-b border-[#E8E4DF]">
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
      <div className="flex-1 px-2 py-3 space-y-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-xl" />
        ))}
      </div>
      <div className="px-3 py-3 border-t border-[#E8E4DF] space-y-2">
        <Skeleton className="h-8 w-full rounded-xl" />
        <Skeleton className="h-8 w-full rounded-xl" />
      </div>
    </div>
  );
}
