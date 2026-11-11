'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { THEME_STORAGE_KEY as KEY } from '@/lib/theme';
import { cn } from '@/lib/utils';

type ThemeChoice = 'light' | 'dark' | 'system';

function readChoice(): ThemeChoice {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

function apply(choice: ThemeChoice) {
  const dark = choice === 'dark' || (choice === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}


export function ThemeToggle({ className }: { className?: string }) {
  const choice = useSyncExternalStore(subscribe, readChoice, () => 'system' as ThemeChoice);
  const set = (next: ThemeChoice) => {
    try {
      if (next === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {
      /* stockage indisponible : le choix vaut pour la session */
    }
    apply(next);
    listeners.forEach((l) => l());
  };
  const options: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Clair', icon: Sun },
    { value: 'dark', label: 'Sombre', icon: Moon },
    { value: 'system', label: 'Système', icon: Monitor },
  ];
  return (
    <div role="radiogroup" aria-label="Thème" className={cn('inline-flex rounded-xl border bg-surface-2 p-0.5', className)}>
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={choice === value}
          title={label}
          onClick={() => set(value)}
          className={cn(
            'flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-xs font-medium text-ink-2 transition-colors',
            choice === value && 'bg-surface text-ink shadow-card',
          )}
        >
          <Icon className="size-3.5" aria-hidden />
          <span className="sr-only sm:not-sr-only">{label}</span>
        </button>
      ))}
    </div>
  );
}
