import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import { themeInitScript } from '@/lib/theme';
import { ToastProvider } from '@/components/ui/toast';
import './globals.css';


export const metadata: Metadata = {
  title: { default: 'NexaFi — Ton assistant financier personnel', template: '%s · NexaFi' },
  description:
    'Organise ton salaire, maîtrise tes dépenses, épargne pour tes projets, rembourse tes dettes et apprends à investir. Conçu pour l’Afrique francophone.',
  applicationName: 'NexaFi',
  icons: { icon: '/favicon.svg', apple: '/icon.svg' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f7f4' },
    { media: '(prefers-color-scheme: dark)', color: '#0b110f' },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <html lang="fr" data-theme="light" suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
