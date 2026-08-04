import { store } from './state.js';
import { SCREEN_ORDER, WIZARD_IDS, renderScreen } from './screens.js';
import { ProgressBar } from './components/progressBar.js';
import { withViewTransition } from './utils/transitions.js';
import { trackEvent } from './utils/analytics.js';
import { clear } from './utils/dom.js';

const screenRoot = document.getElementById('screen-root');
const headerEl = document.getElementById('app-header');
const progressRoot = document.getElementById('progress-root');

let teardown = null;

function currentScreenId() {
  return SCREEN_ORDER[store.getState().screenIndex];
}

function updateHeader() {
  const id = currentScreenId();
  const wizardPosition = WIZARD_IDS.indexOf(id);

  if (wizardPosition === -1) {
    headerEl.classList.add('is-hidden');
    return;
  }

  headerEl.classList.remove('is-hidden');
  clear(progressRoot);
  progressRoot.append(ProgressBar({ current: wizardPosition + 1, total: WIZARD_IDS.length }));
}

function render() {
  if (typeof teardown === 'function') teardown();
  teardown = null;

  updateHeader();

  withViewTransition(() => {
    const result = renderScreen(screenRoot, currentScreenId(), ctx);
    if (typeof result === 'function') teardown = result;

    const screenEl = screenRoot.firstElementChild;
    if (screenEl) screenEl.dataset.direction = store.getState().direction;

    screenRoot.scrollTop = 0;
  });
}

const ctx = {
  goNext() {
    const nextIndex = Math.min(store.getState().screenIndex + 1, SCREEN_ORDER.length - 1);
    store.setState({ screenIndex: nextIndex, direction: 'forward' });
    render();
  },
  goBack() {
    const prevIndex = Math.max(store.getState().screenIndex - 1, 0);
    store.setState({ screenIndex: prevIndex, direction: 'back' });
    render();
  },
  restart() {
    store.setState({ screenIndex: 0, direction: 'forward' });
    render();
  },
};

trackEvent('app_loaded');
render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // installation du service worker non critique pour le fonctionnement de l'app
    });
  });
}
