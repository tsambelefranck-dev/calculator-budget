export function isValidAmount(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0;
}

export function isValidEmail(value) {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

// Tolérant : accepte les formats locaux avec ou sans indicatif (+237 6XX XX XX XX, 6XXXXXXXX...).
export function isValidPhone(value) {
  if (!value) return true; // champ optionnel
  const digits = String(value).replace(/[^\d]/g, '');
  return digits.length >= 8 && digits.length <= 13;
}
