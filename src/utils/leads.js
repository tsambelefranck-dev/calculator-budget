// Envoie un lead vers un Google Apps Script Web App qui l'ajoute comme ligne
// dans un Google Sheet. `mode: 'no-cors'` + Content-Type text/plain évite le
// préflight CORS (Apps Script ne répond pas aux requêtes OPTIONS).
export async function submitLead(endpointUrl, payload) {
  if (!endpointUrl || endpointUrl.startsWith('#')) {
    console.warn('[Budget Express] Aucun endpoint de capture configuré (LEAD.endpointUrl dans content.js).');
    return false;
  }

  try {
    await fetch(endpointUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    return true;
  } catch {
    // Le lead reste capturé côté UI même si l'envoi réseau échoue.
    return false;
  }
}
