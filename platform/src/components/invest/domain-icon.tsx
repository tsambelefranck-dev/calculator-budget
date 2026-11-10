import { Building2, Cpu, GraduationCap, Layers, ChartLine, Rocket, ScrollText, Sprout, Store, Sun, Truck, TrendingUp, type LucideIcon } from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  sprout: Sprout,
  building: Building2,
  store: Store,
  truck: Truck,
  sun: Sun,
  cpu: Cpu,
  'line-chart': ChartLine,
  'scroll-text': ScrollText,
  layers: Layers,
  rocket: Rocket,
  'graduation-cap': GraduationCap,
};

export function DomainIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = ICONS[icon] ?? TrendingUp;
  return <Icon className={className} aria-hidden />;
}

export function RiskDots({ level }: { level: number }) {
  const labels = ['', 'Très faible', 'Faible', 'Modéré', 'Élevé', 'Très élevé'];
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`Risque ${labels[level] ?? level} (${level} sur 5)`}>
      <span className="flex gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={`h-2 w-3 rounded-sm ${i <= level ? 'bg-chart-3' : 'bg-surface-3'}`} />
        ))}
      </span>
      <span className="text-xs text-ink-2">{labels[level]}</span>
    </span>
  );
}
