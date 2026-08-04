import { h, clear } from './utils/dom.js';
import { store } from './state.js';
import { LANDING, STEPS, LOADING, RESULT, LEAD, OFFER, NAV } from './content.js';
import { calculateBudget, getRepartition, getDiagnostic, getConseils } from './calculations.js';
import { formatFCFA, formatPercent } from './utils/formatCurrency.js';
import { CurrencyField } from './components/currencyInput.js';
import { DonutChart, DonutLegend } from './components/donutChart.js';
import { StatusBadge } from './components/statusBadge.js';
import { AdviceCard } from './components/adviceCard.js';
import { LeadForm, LeadSuccess } from './components/leadForm.js';
import { OfferCard } from './components/offerSection.js';
import { shareResult } from './components/shareCard.js';
import { trackEvent } from './utils/analytics.js';
import { submitLead } from './utils/leads.js';

export const WIZARD_IDS = STEPS.map((step) => step.id);
export const SCREEN_ORDER = ['landing', ...WIZARD_IDS, 'loading', 'result', 'lead', 'offer'];

const STEP_BY_ID = Object.fromEntries(STEPS.map((step) => [step.id, step]));

export function renderScreen(container, screenId, ctx) {
  clear(container);

  if (STEP_BY_ID[screenId]) {
    return renderStepScreen(container, STEP_BY_ID[screenId], ctx);
  }

  switch (screenId) {
    case 'landing':
      return renderLanding(container, ctx);
    case 'loading':
      return renderLoading(container, ctx);
    case 'result':
      return renderResult(container, ctx);
    case 'lead':
      return renderLead(container, ctx);
    case 'offer':
      return renderOffer(container, ctx);
    default:
      return undefined;
  }
}

function renderLanding(container, { goNext }) {
  container.append(
    h('div', { class: 'screen screen--center' }, [
      h('div', { class: 'screen__body' }, [
        h('span', { class: 'eyebrow' }, LANDING.eyebrow),
        h('div', { class: 'hero-illustration' }, LANDING.illustration),
        h('h1', { class: 'screen__title' }, LANDING.title),
        h('p', { class: 'screen__text' }, LANDING.subtitle),
        h(
          'div',
          { class: 'trust-row' },
          LANDING.trustChips.map((chip) => h('span', { class: 'trust-chip' }, chip)),
        ),
      ]),
      h('div', { class: 'screen__footer' }, [
        h(
          'button',
          {
            class: 'btn btn--primary btn--block',
            onClick: () => {
              trackEvent('landing_cta_click');
              goNext();
            },
          },
          LANDING.ctaLabel,
        ),
      ]),
    ]),
  );
}

function renderStepScreen(container, step, { goNext, goBack }) {
  let error = '';
  const fieldsWrap = h('div', { class: 'field-group' });

  function renderFields() {
    const data = store.getState().data;
    fieldsWrap.replaceChildren(
      ...step.fields.map((field) =>
        CurrencyField(field, {
          value: data[field.key],
          error: field.key === 'revenu' ? error : '',
          onChange: (value) => store.updateField(field.key, value),
        }),
      ),
    );
  }
  renderFields();

  const footerButtons = [];
  if (step.id !== WIZARD_IDS[0]) {
    footerButtons.push(h('button', { class: 'btn btn--ghost btn--back', onClick: goBack }, NAV.back));
  }
  footerButtons.push(
    h(
      'button',
      {
        class: 'btn btn--primary btn--next',
        onClick: () => {
          if (step.id === 'q1' && !(Number(store.getState().data.revenu) > 0)) {
            error = 'Indiquez votre revenu mensuel pour continuer.';
            renderFields();
            return;
          }
          trackEvent('step_completed', { step: step.id });
          goNext();
        },
      },
      NAV.next,
    ),
  );

  container.append(
    h('div', { class: 'screen' }, [
      h('div', { class: 'screen__body' }, [
        h('span', { class: 'eyebrow' }, step.eyebrow),
        h('h1', { class: 'screen__title' }, step.title),
        h('p', { class: 'screen__text' }, step.subtitle),
        fieldsWrap,
      ]),
      h('div', { class: 'screen__footer' }, [h('div', { class: 'step-nav' }, footerButtons)]),
    ]),
  );
}

function renderLoading(container, { goNext }) {
  const messageEl = h('p', { class: 'loading-message screen__text' }, LOADING.messages[0]);

  container.append(
    h('div', { class: 'screen screen--center' }, [
      h('div', { class: 'screen__body' }, [h('div', { class: 'loading-spinner' }), messageEl]),
    ]),
  );

  let messageIndex = 0;
  const stepDuration = LOADING.minDurationMs / LOADING.messages.length;
  const interval = setInterval(() => {
    messageIndex = (messageIndex + 1) % LOADING.messages.length;
    messageEl.textContent = LOADING.messages[messageIndex];
  }, stepDuration);

  const timeout = setTimeout(() => {
    clearInterval(interval);
    goNext();
  }, LOADING.minDurationMs);

  return () => {
    clearInterval(interval);
    clearTimeout(timeout);
  };
}

function renderResult(container, { goNext }) {
  const totals = calculateBudget(store.getState().data);
  const diagnostic = getDiagnostic(totals);
  const repartition = getRepartition(totals);
  const conseils = getConseils(totals, diagnostic.key);

  trackEvent('result_viewed', { diagnostic: diagnostic.key });

  const shareBtn = h(
    'button',
    {
      class: 'btn btn--ghost btn--block',
      onClick: async () => {
        trackEvent('share_clicked');
        shareBtn.disabled = true;
        const original = shareBtn.textContent;
        shareBtn.textContent = 'Préparation…';
        try {
          await shareResult(totals, diagnostic);
        } catch {
          // partage annulé ou non supporté : on ignore silencieusement
        } finally {
          shareBtn.disabled = false;
          shareBtn.textContent = original;
        }
      },
    },
    RESULT.shareCta,
  );

  container.append(
    h('div', { class: 'screen' }, [
      h('div', { class: 'screen__body' }, [
        h('span', { class: 'eyebrow' }, 'Votre résultat'),
        h('h1', { class: 'screen__title' }, RESULT.title),
        StatusBadge(diagnostic),
        h('div', { class: 'donut-wrap fade-in' }, [
          DonutChart(repartition, formatPercent(totals.tauxEpargne), RESULT.chartCenterLabel),
          DonutLegend(repartition, RESULT.legend, formatFCFA),
        ]),
        h('p', { class: 'screen__text' }, diagnostic.message),
        ...conseils.map((advice) => AdviceCard(advice)),
      ]),
      h('div', { class: 'screen__footer' }, [
        h(
          'button',
          {
            class: 'btn btn--primary btn--block',
            onClick: () => {
              trackEvent('result_continue_click');
              goNext();
            },
          },
          RESULT.continueCta,
        ),
        shareBtn,
      ]),
    ]),
  );
}

function renderLead(container, { goNext }) {
  const formHolder = h('div', {});

  function showForm() {
    formHolder.replaceChildren(
      LeadForm({
        onSubmit: ({ email, phone }) => {
          store.setState({ lead: { email, phone, submitted: true } });
          trackEvent('lead_captured');

          const totals = calculateBudget(store.getState().data);
          const diagnostic = getDiagnostic(totals);
          submitLead(LEAD.endpointUrl, {
            date: new Date().toISOString(),
            email,
            phone,
            revenu: totals.revenu,
            chargesFixes: totals.chargesFixes,
            depensesVariables: totals.depensesVariables,
            epargneActuelle: totals.epargneActuelle,
            tauxEpargnePct: Math.round(totals.tauxEpargne * 100),
            diagnostic: diagnostic.key,
          });

          formHolder.replaceChildren(LeadSuccess());
          setTimeout(goNext, 1400);
        },
        onSkip: () => {
          trackEvent('lead_skipped');
          goNext();
        },
      }),
    );
  }
  showForm();

  container.append(
    h('div', { class: 'screen' }, [
      h('div', { class: 'screen__body' }, [
        h('span', { class: 'eyebrow' }, 'Bonus'),
        h('h1', { class: 'screen__title' }, LEAD.title),
        h('p', { class: 'screen__text' }, LEAD.subtitle),
        formHolder,
      ]),
    ]),
  );
}

function renderOffer(container, { restart }) {
  trackEvent('offer_viewed');

  container.append(
    h('div', { class: 'screen' }, [
      h('div', { class: 'screen__body' }, [OfferCard({ onCtaClick: () => trackEvent('guide_cta_click') })]),
      h('div', { class: 'screen__footer' }, [
        h(
          'button',
          {
            class: 'btn btn--ghost btn--block',
            onClick: () => {
              trackEvent('offer_declined');
              restart();
            },
          },
          OFFER.restartLabel,
        ),
      ]),
    ]),
  );
}
