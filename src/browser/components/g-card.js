import Component, {
  Partial,
  decorateProperties,
  lit
} from '../../packages/Component.js';

const STYLES = lit.html`
<style type="text/css">
  :host {
    --g-card--header-background: var(--color--neutral);
    --g-card--footer-background: var(--color--neutral-light);
    --g-card--border-color: var(--color--neutral-dark);
    --g-card--border-radius: calc(var(--g-card--padding) * 1.5);
    --g-card--border: 1px solid var(--g-card--border-color);
    --g-card--padding: var(--spacing--sm);
  }

  .g-card {
    border: var(--g-card--border);
    border-radius: var(--g-card--border-radius);
  }

  .g-card__header {
    border-top-left-radius: inherit;
    border-top-right-radius: inherit;
    background: var(--g-card--header-background);
    border-bottom: var(--g-card--border);
  }

  .g-card__footer {
    border-top: var(--g-card--border);
    border-bottom-left-radius: inherit;
    border-bottom-right-radius: inherit;
    background: var(--g-card--footer-background);
  }

  .g-card__header,
  .g-card__body,
  .g-card__footer {
    padding: var(--g-card--padding);
  }
</style>
`;

const TITLE = Partial((html, title) => {
  const titleText =
    title || 'Assign html to "title" slot or the "data-title" attribute';

  return html`
    <span class="g-card__title">
      <slot name="title">
        ${titleText}
      </slot>
    </span>
  `;
});

const BODY = Partial(html => {
  return html`
    <div class="g-card__body">
      <slot name="body">
        Assign html to "body" slot
      </slot>
    </div>
  `;
});

const FOOTER = Partial(html => {
  return html`
    <div class="g-card__footer">
      <slot name="footer">
        Assign html to "footer" slot
      </slot>
    </div>
  `;
});

const VARIANTS = {
  details: Partial((html, state) => {
    const { titleText } = state.properties;

    return html`
      ${STYLES}
      <details class="g-card -details">
        <summary class="g-card__header">
          <slot name="header">
            ${TITLE(titleText)}
          </slot>
        </summary>
        ${BODY()}
      </details>
    `;
  }),

  default: Partial((html, state) => {
    const { titleText } = state.properties;

    return html`
      ${STYLES}
      <section class="g-card">
        <header class="g-card__header">
          <slot name="header">
            ${TITLE(titleText)}
          </slot>
        </header>
        ${BODY()}
      </section>
    `;
  })
};

export default class GCard extends Component {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  render(html, state) {
    const { variant } = state.properties;
    const view = variant in VARIANTS ? VARIANTS[variant] : VARIANTS.default;
    return view(state);
  }
}

decorateProperties(GCard, {
  titleText: {
    bindAttribute: 'title-text'
  }
});

window.customElements.define('g-card', GCard);
