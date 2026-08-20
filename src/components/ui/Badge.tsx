import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  bg?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function Badge({ children, color, bg, className, size = 'md' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        !bg && 'bg-[#F5F3EF]',
        !color && 'text-[#9B9590]',
        className
      )}
      style={{
        ...(bg ? { backgroundColor: bg } : {}),
        ...(color ? { color } : {}),
      }}
    >
      {children}
    </span>
  );
}

interface SubjectBadgeProps {
  emoji: string;
  label: string;
  color: string;
  bg: string;
  className?: string;
}

export function SubjectBadge({ emoji, label, color, bg, className }: SubjectBadgeProps) {
  return (
    <Badge color={color} bg={bg} className={className}>
      <span>{emoji}</span>
      <span>{label}</span>
    </Badge>
  );
}
