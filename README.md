# Calculateur Budget Express

Lead magnet mobile-first pour le guide **« Comment Économiser Facilement Juste avec son Salaire »** (NexaFi Academy). Calculateur de budget en 4 questions, diagnostic instantané, puis passerelle vers l'offre du guide.

## Stack

- Vanilla HTML / CSS / JavaScript (modules ES), aucun framework front
- [Vite](https://vitejs.dev) uniquement pour le build/minification en production
- Zéro dépendance runtime, PWA (manifest + service worker cache-first)

## Démarrer en local

```bash
npm install
npm run dev
```

Ouvrir l'URL affichée (par défaut http://localhost:5173) — idéalement dans les outils de dev en émulation mobile (Chrome DevTools > toggle device toolbar, viewport ~390×844).

## Build de production

```bash
npm run build
npm run preview
```

Le dossier `dist/` généré est déployable tel quel sur n'importe quel hébergeur statique (Netlify, Vercel, Cloudflare Pages, GitHub Pages).

## Structure

```
src/
  main.js          # bootstrap de l'app, navigation entre écrans
  state.js         # store central (pub/sub) + persistance localStorage
  screens.js        # les 9 écrans du parcours + machine à états
  calculations.js   # moteur de calcul du budget
  rules.js           # seuils du diagnostic
  content.js         # tous les textes FR, centralisés
  components/         # composants UI réutilisables
  utils/              # helpers (formatage FCFA, validation, DOM, analytics...)
  css/                # design tokens + styles (mobile-first)
public/
  manifest.json, sw.js, icons/   # PWA
```

## Points à finaliser avant mise en ligne

1. **Lien du guide** (`src/content.js` → `OFFER.ctaUrl`) : actuellement un placeholder `#TODO_LIEN_CHARIOW_GUIDE`. À remplacer par l'URL du produit une fois la page créée sur la boutique NexaFi Academy (Chariow).
2. **Réception des leads** : le formulaire de capture (écran "lead") ne fait actuellement qu'enregistrer les données en mémoire côté client. Il faut brancher un point de chute réel (Google Sheet via Apps Script, Formspree, endpoint serverless...) dans `src/screens.js` (fonction `renderLead`, callback `onSubmit`).
3. **Icônes PWA** : `public/icons/*.svg` sont des placeholders (lettre "B" sur fond vert). À remplacer par le vrai logo dès qu'il est disponible.
4. **Analytics** : `src/utils/analytics.js` relaie les événements vers Plausible/GA4/dataLayer s'ils sont présents sur la page, sans imposer d'outil. Ajouter le script de l'outil choisi dans `index.html` pour activer le tracking du funnel.
