import { Shell } from '@/components/layout/Shell';
import { TutorSkeleton } from '@/components/ui/Skeleton';

export default function TutorLoading() {
  return (
    <Shell>
      <TutorSkeleton />
    </Shell>
  );
}
