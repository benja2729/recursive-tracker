import { lit, Partial } from '../packages/templating.js';
import './components/g-card.js';

const { html, render } = lit;

let STATE = {
  hasPendingRequest: false,
  posts: [],
  error: null
};

const worker = new Worker('/src/workers/store-worker.js');

function renderApp(state) {
  render(HEADER, document.getElementById('trackerAppHeader'));
  render(Cards(state), document.getElementById('trackerAppBody'));
}

function updateState(state = {}) {
  STATE = {
    ...STATE,
    ...state
  };
  renderApp(STATE);
}

function dispatchAction(type, payload, meta, error = false) {
  const action = {
    type,
    payload,
    meta,
    error
  };

  worker.postMessage(action);
}
window.workerDispatchAction = dispatchAction;

const HEADER = html`
  <button
    @click=${() => {
      updateState({ hasPendingRequest: true });
      dispatchAction('UNKNOWN_ACTION');
    }}
  >
    Test Error
  </button>
  <button
    @click=${() => {
      updateState({ hasPendingRequest: true });
      dispatchAction('TEST_TIMEOUT');
    }}
  >
    Test Timeout
  </button>
`;

const Cards = Partial((html, state = {}) => {
  const { posts = [], error, hasPendingRequest } = state;

  return html`
    <div class="g-cards">
      ${hasPendingRequest ? 'Loading...' : lit.nothing}
      ${error
        ? html`
            <g-card
              class="g-card__error"
              @click=${() => updateState({ error: null })}
            >
              <div slot="header">
                There was an error
              </div>
              <div slot="body">
                ${error.message}
              </div>
            </g-card>
          `
        : lit.nothing}
      ${posts.map(({ title, body }) => {
        return html`
          <g-card title-text=${title}>
            <div slot="body">${body}</div>
          </g-card>
        `;
      })}
    </div>
  `;
});

worker.addEventListener('message', ({ data: action }) => {
  updateState({
    ...(action.error ? { error: action.payload } : action.payload),
    hasPendingRequest: false
  });
});

renderApp(STATE);
dispatchAction('FETCH_POSTS');
