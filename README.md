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

## Brancher la capture de leads sur Google Sheet

Le formulaire de l'écran "lead" envoie déjà les données (email, téléphone, revenu, charges, taux d'épargne, diagnostic) vers `LEAD.endpointUrl` (`src/content.js`) via `src/utils/leads.js`. Il ne manque que le point de chute côté Google :

1. Créer un Google Sheet dédié (une ligne = un lead).
2. Dans le Sheet : **Extensions > Apps Script**, remplacer le contenu par :

   ```javascript
   function doPost(e) {
     const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
     const data = JSON.parse(e.postData.contents);
     sheet.appendRow([
       new Date(data.date || Date.now()),
       data.email || '',
       data.phone || '',
       data.revenu || '',
       data.chargesFixes || '',
       data.depensesVariables || '',
       data.epargneActuelle || '',
       data.tauxEpargnePct ? data.tauxEpargnePct + '%' : '',
       data.diagnostic || '',
     ]);
     return ContentService.createTextOutput(JSON.stringify({ status: 'ok' })).setMimeType(ContentService.MimeType.JSON);
   }
   ```

3. **Déployer > Nouveau déploiement** → type "Application Web" → exécuter en tant que "Moi" → accès "Tout le monde".
4. Copier l'URL de déploiement (se termine par `/exec`) dans `LEAD.endpointUrl` (`src/content.js`), à la place de `#TODO_GOOGLE_SHEET_WEBAPP_URL`.

L'appel se fait en `mode: 'no-cors'` (limitation d'Apps Script), donc le navigateur ne peut pas confirmer la réussite de l'écriture — c'est le comportement normal de ce pattern, pas un bug.

## Points à finaliser avant mise en ligne

1. **Lien du guide** (`src/content.js` → `OFFER.ctaUrl`) : actuellement un placeholder `#TODO_LIEN_CHARIOW_GUIDE`. À remplacer par l'URL du produit une fois la page créée sur la boutique NexaFi Academy (Chariow).
2. **Endpoint Google Sheet** (`src/content.js` → `LEAD.endpointUrl`) : voir section ci-dessus.
3. **Logo réel** : `public/icons/*.svg` et le mark dans `index.html` sont une interprétation du logo NexaFi Academy (anneau + flèche, mêmes couleurs) créée à partir d'une capture d'écran — à remplacer par les vrais fichiers du logo (SVG/PNG) dès qu'ils sont disponibles dans le repo.
4. **Analytics** : `src/utils/analytics.js` relaie les événements vers Plausible/GA4/dataLayer s'ils sont présents sur la page, sans imposer d'outil. Ajouter le script de l'outil choisi dans `index.html` pour activer le tracking du funnel.
