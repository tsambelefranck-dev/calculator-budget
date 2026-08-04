import { h } from '../utils/dom.js';
import { isValidEmail, isValidPhone } from '../utils/validators.js';
import { LEAD } from '../content.js';

export function LeadForm({ onSubmit, onSkip }) {
  const emailInput = h('input', {
    type: 'email',
    inputmode: 'email',
    autocomplete: 'email',
    placeholder: LEAD.emailPlaceholder,
    id: 'lead-email',
  });
  const phoneInput = h('input', {
    type: 'tel',
    inputmode: 'tel',
    autocomplete: 'tel',
    placeholder: LEAD.phonePlaceholder,
    id: 'lead-phone',
  });
  const errorEl = h('p', { class: 'currency-field__error' }, '');

  const form = h(
    'form',
    {
      class: 'lead-form',
      onSubmit: (event) => {
        event.preventDefault();
        const email = emailInput.value.trim();
        const phone = phoneInput.value.trim();

        if (!isValidEmail(email)) {
          errorEl.textContent = 'Merci de renseigner un email valide.';
          return;
        }
        if (!isValidPhone(phone)) {
          errorEl.textContent = 'Ce numéro ne semble pas valide.';
          return;
        }
        errorEl.textContent = '';
        onSubmit({ email, phone });
      },
    },
    [
      h('div', { class: 'text-field' }, [h('label', { for: 'lead-email' }, LEAD.emailLabel), emailInput]),
      h('div', { class: 'text-field' }, [h('label', { for: 'lead-phone' }, LEAD.phoneLabel), phoneInput]),
      errorEl,
      h('button', { type: 'submit', class: 'btn btn--primary btn--block' }, LEAD.submitLabel),
      h('button', { type: 'button', class: 'lead-form__skip', onClick: onSkip }, LEAD.skipLabel),
    ],
  );

  return form;
}

export function LeadSuccess() {
  return h('div', { class: 'lead-form__success pop-in' }, [
    h('span', { style: 'font-size:2rem' }, '✅'),
    h('p', { class: 'screen__subtitle' }, LEAD.successTitle),
    h('p', { class: 'screen__text' }, LEAD.successText),
  ]);
}
