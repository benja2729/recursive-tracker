import * as lit from '../../web_modules/lit-html.js';
export { lit };

const STATE = Symbol('__state__');
const PROPERTIES = Symbol('__properties__');

export function Partial(view) {
  return state => view(lit.html, state);
}

export function decorateProperties(Base, propertiesConfig) {
  const configEntries = Object.entries(propertiesConfig);
  const observedAttributes = new Set(Base.observedAttributes || []);
  const observedProperties = Base.observedProperties
    ? {
        attributes: {
          ...(Base.observedProperties || {})
        },

        values: {
          ...(Base.observedProperties || {})
        }
      }
    : { attributes: {}, values: {} };

  for (const [name, config] of configEntries) {
    const { default: value, bindAttribute, get, set } = config;
    observedProperties.values[name] = value;

    if (typeof bindAttribute === 'string') {
      observedAttributes.add(bindAttribute);
      observedProperties.attributes[bindAttribute] = name;
    }

    Object.defineProperty(Base.prototype, name, {
      configurable: false,
      enumerable: false,

      get() {
        const { [STATE]: state, [PROPERTIES]: properties } = this;

        if (typeof get === 'function') {
          return get.call(this, { state, properties });
        }

        return properties[name];
      },

      set(value) {
        if (typeof set === 'function') {
          set.call(this, value);
        } else {
          this.updateProperties({ [name]: value });
        }
      }
    });
  }

  Object.defineProperties(Base, {
    observedAttributes: {
      configurable: true,
      enumerable: true,
      value: Array.from(observedAttributes)
    },

    observedProperties: {
      configurable: true,
      enumerable: true,
      value: observedProperties
    }
  });
}

function debounce(func, timeout) {
  let id;

  return (...args) => {
    if (id) {
      window.clearTimeout(id);
    }

    id = window.setTimeout(() => func.apply(null, args), timeout);
  };
}

export default class Component extends HTMLElement {
  constructor() {
    super();
    this[STATE] = {};
    this[PROPERTIES] = { ...this.constructor.observedProperties.values };

    const scheduleRender =
      typeof this.render === 'function'
        ? debounce(() => {
            const { [STATE]: state, [PROPERTIES]: properties } = this;
            const template = this.render(lit.html, {
              state: { ...state },
              properties: { ...properties },
              updateProperties,
              updateState
            });
            lit.render(template, this.shadowRoot || this);
          }, 0)
        : () => {};

    const updateProperties = properties => {
      this[PROPERTIES] = {
        ...this[PROPERTIES],
        ...properties
      };
      scheduleRender();
    };

    const updateState = state => {
      this[STATE] = {
        ...this[STATE],
        ...state
      };
      scheduleRender();
    };

    this._scheduleRender = scheduleRender;
    this.updateProperties = updateProperties;
    this.updateState = updateState;
  }

  connectedCallback() {
    if (this.isConnected) {
      this._scheduleRender();
    }
  }

  attributeChangedCallback(attr, oldValue, newValue) {
    if (oldValue !== newValue) {
      const prop = this.constructor.observedProperties.attributes[attr];
      this.updateProperties({ [prop]: newValue });
    }
  }
}
