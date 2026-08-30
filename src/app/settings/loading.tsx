import { Shell } from '@/components/layout/Shell';
import { SettingsSkeleton } from '@/components/ui/Skeleton';

export default function SettingsLoading() {
  return (
    <Shell>
      <SettingsSkeleton />
    </Shell>
  );
}
