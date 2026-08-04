// Couche de tracking neutre : envoie l'événement à l'outil déjà présent sur la page
// (Plausible, GA4...) sans imposer de dépendance. Aucun outil branché = no-op silencieux.

export function trackEvent(name, payload = {}) {
  try {
    if (typeof window.plausible === 'function') {
      window.plausible(name, { props: payload });
    }
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, payload);
    }
    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: name, ...payload });
    }
  } catch {
    // Le tracking ne doit jamais casser l'expérience utilisateur.
  }
}
