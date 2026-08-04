import { h } from '../utils/dom.js';

const ICONS = { fragile: '⚠️', equilibre: '⚖️', optimise: '✅' };

export function StatusBadge(diagnostic) {
  return h('span', { class: `status-badge status-badge--${diagnostic.level}` }, [
    `${ICONS[diagnostic.level] || ''} ${diagnostic.title}`,
  ]);
}
