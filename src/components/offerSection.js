import { h } from '../utils/dom.js';
import { OFFER } from '../content.js';

export function OfferCard({ onCtaClick }) {
  return h('div', { class: 'offer-card pop-in' }, [
    h('span', { class: 'offer-card__badge' }, OFFER.badge),
    h('h2', { class: 'offer-card__title' }, OFFER.title),
    h('p', { class: 'screen__text' }, OFFER.subtitle),
    h(
      'ul',
      { class: 'offer-benefits' },
      OFFER.benefits.map((benefit) => h('li', {}, benefit)),
    ),
    h('div', { class: 'offer-price' }, [
      h('span', { class: 'offer-price__old' }, OFFER.priceOld),
      h('span', { class: 'offer-price__new' }, OFFER.priceNew),
    ]),
    h('p', { class: 'offer-guarantee' }, OFFER.guarantee),
    h('p', { class: 'social-proof' }, OFFER.socialProof),
    h(
      'a',
      {
        class: 'btn btn--accent btn--block',
        href: OFFER.ctaUrl,
        id: 'offer-cta',
        onClick: onCtaClick,
      },
      OFFER.ctaLabel,
    ),
  ]);
}
