import { loadState, saveState } from './utils/storage.js';

const DEFAULT_DATA = {
  revenu: '',
  loyer: '',
  transport: '',
  factures: '',
  autresFixes: '',
  alimentation: '',
  famille: '',
  loisirs: '',
  imprevus: '',
  epargneActuelle: '',
};

function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();

  return {
    getState() {
      return state;
    },
    setState(patch) {
      state = { ...state, ...patch };
      saveState({ data: state.data });
      listeners.forEach((listener) => listener(state));
    },
    updateField(key, value) {
      this.setState({ data: { ...state.data, [key]: value } });
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

const persisted = loadState();

export const store = createStore({
  screenIndex: 0,
  direction: 'forward',
  data: { ...DEFAULT_DATA, ...(persisted?.data || {}) },
  lead: { email: '', telephone: '', submitted: false },
});
