'use client';

/**
 * Script exécuté avant le premier rendu (thème). Côté client il devient `text/plain` pour
 * éviter l'avertissement React sur les balises <script> (motif recommandé par Next.js).
 */
export function InlineScript({ html, nonce }: { html: string; nonce?: string }) {
  return (
    <script
      nonce={nonce}
      type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
