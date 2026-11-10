import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NexaFi — Assistant financier',
    short_name: 'NexaFi',
    description: 'Organise ton argent, épargne et apprends à investir.',
    start_url: '/app',
    display: 'standalone',
    background_color: '#f5f7f4',
    theme_color: '#0b4d33',
    lang: 'fr',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
