import { h } from '../utils/dom.js';

export function ProgressBar({ current, total }) {
  const pct = Math.round((current / total) * 100);
  return h('div', { class: 'progress-wrap' }, [
    h('div', { class: 'progress-bar' }, [h('div', { class: 'progress-bar__fill', style: `width:${pct}%` })]),
  ]);
}
