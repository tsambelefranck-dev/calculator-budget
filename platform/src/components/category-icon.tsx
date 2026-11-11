import {
  Briefcase,
  Bus,
  Ellipsis,
  GraduationCap,
  HeartPulse,
  House,
  PartyPopper,
  Repeat,
  ShoppingBag,
  Smartphone,
  Users,
  Utensils,
  Tag,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ICONS: Record<string, LucideIcon> = {
  home: House,
  utensils: Utensils,
  bus: Bus,
  'heart-pulse': HeartPulse,
  'graduation-cap': GraduationCap,
  users: Users,
  smartphone: Smartphone,
  'party-popper': PartyPopper,
  repeat: Repeat,
  'shopping-bag': ShoppingBag,
  briefcase: Briefcase,
  'more-horizontal': Ellipsis,
};

export function CategoryIcon({ icon, color, className, size = 'md' }: { icon: string; color?: string; className?: string; size?: 'sm' | 'md' }) {
  const Icon = ICONS[icon] ?? Tag;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-xl text-white',
        size === 'md' ? 'size-9' : 'size-7 rounded-lg',
        className,
      )}
      style={{ backgroundColor: color ?? 'var(--muted)' }}
      aria-hidden
    >
      <Icon className={size === 'md' ? 'size-[18px]' : 'size-3.5'} />
    </span>
  );
}
