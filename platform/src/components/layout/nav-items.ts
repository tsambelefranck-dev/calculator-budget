import {
  ChartLine,
  FileText,
  Gauge,
  GraduationCap,
  HandCoins,
  LayoutDashboard,
  Receipt,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  premium?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  { label: 'Vue d’ensemble', items: [{ href: '/app', label: 'Tableau de bord', icon: LayoutDashboard }] },
  {
    label: 'Mon argent',
    items: [
      { href: '/app/income', label: 'Revenus', icon: Wallet },
      { href: '/app/expenses', label: 'Dépenses', icon: Receipt },
      { href: '/app/budgets', label: 'Budgets', icon: Gauge },
      { href: '/app/planner', label: 'Planificateur', icon: SlidersHorizontal },
    ],
  },
  {
    label: 'Mes projets',
    items: [
      { href: '/app/goals', label: 'Objectifs', icon: Target },
      { href: '/app/debts', label: 'Dettes', icon: HandCoins },
    ],
  },
  {
    label: 'Investir',
    items: [
      { href: '/app/invest', label: 'Centre d’investissement', icon: TrendingUp },
      { href: '/app/simulator', label: 'Simulateur', icon: ChartLine, premium: true },
    ],
  },
  {
    label: 'Coach',
    items: [
      { href: '/app/assistant', label: 'Assistant IA', icon: Sparkles },
      { href: '/app/reports', label: 'Rapports', icon: FileText },
      { href: '/app/learn', label: 'Apprendre', icon: GraduationCap },
    ],
  },
];

export const SETTINGS_ITEM: NavItem = { href: '/app/settings', label: 'Paramètres', icon: Settings };

export function isActive(pathname: string, href: string): boolean {
  if (href === '/app') return pathname === '/app';
  return pathname === href || pathname.startsWith(`${href}/`);
}
