import { h } from '../utils/dom.js';

export function AdviceCard(advice) {
  return h('div', { class: 'advice-card' }, [
    h('span', { class: 'advice-card__icon' }, advice.icon),
    h('div', {}, [
      h('p', { class: 'advice-card__title' }, advice.titre),
      h('p', { class: 'advice-card__text' }, advice.texte),
    ]),
  ]);
}
