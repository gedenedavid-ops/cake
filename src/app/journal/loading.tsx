import { Shell } from '@/components/layout/Shell';
import { JournalSkeleton } from '@/components/ui/Skeleton';

export default function JournalLoading() {
  return (
    <Shell>
      <JournalSkeleton />
    </Shell>
  );
}
