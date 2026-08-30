import { Shell } from '@/components/layout/Shell';
import { GraphSkeleton } from '@/components/ui/Skeleton';

export default function GraphLoading() {
  return (
    <Shell>
      <GraphSkeleton />
    </Shell>
  );
}
