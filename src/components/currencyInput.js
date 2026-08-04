import { h } from '../utils/dom.js';
import { formatNumber, parseAmountInput } from '../utils/formatCurrency.js';

export function CurrencyField(field, { value, onChange, error }) {
  const input = h('input', {
    type: 'text',
    inputmode: 'numeric',
    autocomplete: 'off',
    placeholder: field.placeholder || '0',
    value: value ? formatNumber(value) : '',
    'aria-label': field.label,
    onInput: (event) => {
      const amount = parseAmountInput(event.target.value);
      event.target.value = amount ? formatNumber(amount) : '';
      onChange(amount);
    },
  });

  return h('div', { class: 'currency-field' }, [
    h('label', { class: 'currency-field__label' }, field.label),
    field.hint ? h('p', { class: 'currency-field__hint' }, field.hint) : null,
    h('div', { class: 'currency-field__control' }, [input, h('span', { class: 'currency-field__suffix' }, 'FCFA')]),
    h('p', { class: 'currency-field__error' }, error || ''),
  ]);
}
