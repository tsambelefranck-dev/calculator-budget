import { h } from '../utils/dom.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const SIZE = 100;
const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function DonutChart(segments, centerValue, centerLabel) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${SIZE} ${SIZE}`);

  const track = document.createElementNS(SVG_NS, 'circle');
  track.setAttribute('class', 'donut__track');
  track.setAttribute('cx', SIZE / 2);
  track.setAttribute('cy', SIZE / 2);
  track.setAttribute('r', RADIUS);
  svg.appendChild(track);

  let offset = 0;
  segments.forEach((segment) => {
    const length = segment.pct * CIRCUMFERENCE;
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('class', 'donut__segment');
    circle.setAttribute('cx', SIZE / 2);
    circle.setAttribute('cy', SIZE / 2);
    circle.setAttribute('r', RADIUS);
    circle.setAttribute('stroke', segment.color);
    circle.setAttribute('stroke-dasharray', `${length} ${CIRCUMFERENCE - length}`);
    circle.setAttribute('stroke-dashoffset', String(-offset));
    svg.appendChild(circle);
    offset += length;
  });

  return h('div', { class: 'donut' }, [
    svg,
    h('div', { class: 'donut__center' }, [
      h('span', { class: 'donut__center-value' }, centerValue),
      h('span', { class: 'donut__center-label' }, centerLabel),
    ]),
  ]);
}

export function DonutLegend(segments, labels, formatValue) {
  return h(
    'div',
    { class: 'donut-legend' },
    segments.map((segment) =>
      h('div', { class: 'donut-legend__item' }, [
        h('span', { class: 'donut-legend__dot', style: `background:${segment.color}` }),
        h('span', { class: 'donut-legend__label' }, labels[segment.key]),
        h('span', { class: 'donut-legend__value' }, formatValue(segment.value)),
      ]),
    ),
  );
}
