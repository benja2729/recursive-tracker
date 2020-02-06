import * as lit from '../../web_modules/lit-html.js';
export { lit };

export const html = lit.html;

/**
 * @template S
 * @callback View
 * @param {typeof lit.html} html
 * @param {S} state
 * @returns {ReturnType<typeof lit.html>}
 */

/**
 * @param {View<any>} view
 */
export function Partial(view) {
  return state => view(lit.html, state);
}

/** @param {HTMLElement} host */
function composeState(host, state = {}) {
  const properties = {};
  const attributes = {};
  const data = host.dataset;

  for (const key of Object.keys(host)) {
    properties[key] = host[key];
  }

  for (const { name, value } of host.attributes) {
    attributes[name] = value;
  }

  return { properties, attributes, state, data };
}

/**
 * @param {View<ReturnType<typeof composeState>>} view
 */
export function Template(view) {
  const partial = Partial(view);

  /** @param {HTMLElement} host */
  const template = (host, state) => {
    const target = host.shadowRoot || host;
    const context = composeState(host, state);
    lit.render(partial(context), target);
  };

  return template;
}
