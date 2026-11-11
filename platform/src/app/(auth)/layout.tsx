import { CircleCheck, Lock, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/layout/logo';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-primary p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -top-32 -right-32 size-[420px] rounded-full border-[40px] border-white/5" aria-hidden />
        <Link href="/" className="relative inline-flex w-fit items-center gap-2.5 rounded-xl bg-white/95 px-3 py-2">
          <Logo />
        </Link>
        <div className="relative max-w-md space-y-6">
          <p className="text-3xl leading-tight font-semibold tracking-tight">
            « Ton argent doit avoir une destination avant même d’arriver dans tes mains. »
          </p>
          <ul className="space-y-3 text-[15px] text-white/85">
            {[
              'Répartis ton salaire en 1 minute, selon ta vraie situation',
              'Suis tes dépenses et reçois une alerte avant de dépasser',
              'Un coach IA qui s’appuie sur tes chiffres, pas sur des promesses',
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <CircleCheck className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative flex items-center gap-5 text-xs text-white/70">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="size-4" aria-hidden /> Nous ne détenons jamais ton argent
          </span>
          <span className="flex items-center gap-1.5">
            <Lock className="size-4" aria-hidden /> Aucun code PIN demandé
          </span>
        </div>
      </aside>
      <main className="flex flex-col px-5 py-8 sm:px-10">
        <Link href="/" className="mb-10 lg:hidden">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">{children}</div>
      </main>
    </div>
  );
}
