import { isFsa, isFsaError, isFsaData } from './fsa.js';
/** @typedef {import('./fsa').FSA} FSA */
/** @typedef {import('./fsa').PAYLOAD} PAYLOAD */

const MESSAGE_ID = Symbol.for('__message_id__');
const MESSAGES = Symbol.for('__messages__');
const ACTION_HANDLER = Symbol.for('__action_handler__');
const WORKER = Symbol.for('__worker__');

const GLOBAL_TIMEOUT = 5000;
const WORKER_ERROR = 'WORKER_ERROR';
const TIMEOUT_ERROR = 'TIMEOUT_ERROR';
const TERMINATION_ERROR = 'TERMINATION_ERROR';
const INVALID_ACTION_TYPE = 'INVALID_ACTION_TYPE';

export const errorTypes = {
  WORKER_ERROR,
  TIMEOUT_ERROR,
  TERMINATION_ERROR,
  INVALID_ACTION_TYPE
};

/** @typedef {Parameters<ConstructorParameters<typeof Promise>[0]>[0]} Resolve */
/** @typedef {Parameters<ConstructorParameters<typeof Promise>[0]>[1]} Reject */
/** @typedef {[Resolve, Reject, number]} MESSAGE */
/** @typedef {import('./fsa').G_FSA<PAYLOAD | Error, { id: number, timeout: number }>} FSA_CONTROLLED */

/**
 * Called after `isFsa`
 * @param {FSA} action
 * @returns {action is FSA_CONTROLLED}
 */
function isFsaControlled(action) {
  const { meta } = action;
  return ['id', 'timeout'].every(key => typeof meta[key] === 'number');
}

/**
 * @param {WorkerClient} client
 */
function nextId(client) {
  return client[MESSAGE_ID]++;
}

/**
 * @param {WorkerClient[MESSAGES]} messages
 * @param {FSA_CONTROLLED} fsa
 */
function setActionTimeout(messages, fsa) {
  const {
    type,
    meta: { id, timeout }
  } = fsa;

  if (typeof timeout !== 'number') {
    return null;
  }

  return window.setTimeout(() => {
    const message = messages.get(id);

    const fsaError = {
      error: true,
      type: TIMEOUT_ERROR,
      payload: new Error(
        `[WorkerClient] Message for action ${type} timed-out after ${timeout} ms`
      )
    };

    resolveFsa(message, fsaError);
    messages.delete(id);
  }, timeout);
}

/**
 * @param {MESSAGE} message
 * @param {FSA} fsa
 */
function resolveFsa([resolve, reject, timeoutId], fsa) {
  if (timeoutId) {
    window.clearTimeout(timeoutId);
  }

  if (isFsaData(fsa)) {
    resolve(fsa);
  } else if (isFsaError(fsa)) {
    reject(fsa);
  } else {
    throw new Error(
      `[WorkerClient] Reached an unknown state resolveing action ${fsa.type}`
    );
  }
}

export default class WorkerClient extends EventTarget {
  [MESSAGE_ID] = 0;

  /** @type {Map<number, MESSAGE>} */
  [MESSAGES] = new Map();

  /**
   *
   * @param {Worker} worker
   * @param {number} timeout
   */
  constructor(worker, timeout = GLOBAL_TIMEOUT) {
    super();
    this.timeout = timeout;
    this[WORKER] = worker;

    worker.addEventListener('message', event => {
      this[ACTION_HANDLER](event.data);
    });

    worker.addEventListener('error', event => {
      this.dispatchEvent(
        new CustomEvent(WORKER_ERROR, {
          detail: event
        })
      );
    });
  }

  /**
   * @param {FSA_CONTROLLED['type']} type
   * @param {FSA_CONTROLLED['payload']} payload
   * @param {Partial<Pick<FSA_CONTROLLED['meta'], 'timeout'>>} [meta]
   * @returns {Promise<FSA>}
   */
  dispatchAction(type, payload, meta = {}) {
    const { [WORKER]: worker, [MESSAGES]: messages } = this;
    const id = nextId(this);

    return new Promise((resolve, reject) => {
      const fsa = {
        meta: { timeout: this.timeout, ...meta, id },
        type,
        payload
      };
      const timeoutId = setActionTimeout(messages, fsa);

      messages.set(id, [resolve, reject, timeoutId]);
      worker.postMessage(fsa);
    });
  }

  destroy() {
    const { [WORKER]: worker, [MESSAGES]: messages } = this;
    worker.terminate();

    for (const message of messages.values()) {
      const fsaError = {
        error: true,
        type: TERMINATION_ERROR,
        payload: new Error('[WorkerClient] The web worker has been terminated')
      };

      resolveFsa(message, fsaError);
    }

    messages.clear();
  }

  /**
   * @param {any} action
   */
  [ACTION_HANDLER](action) {
    const { [MESSAGES]: messages } = this;
    const fsa = !isFsa(action)
      ? {
          error: true,
          type: INVALID_ACTION_TYPE,
          payload: new Error(`[WorkerClient] Invalid action sent from worker`),
          meta: { action }
        }
      : action;

    if (isFsaControlled(fsa)) {
      const { id } = fsa.meta;
      const message = messages.get(id);
      resolveFsa(message, fsa);
      messages.delete(id);
    }

    const actionEvent = new CustomEvent(fsa.type, {
      detail: fsa
    });
    this.dispatchEvent(actionEvent);

    // @ts-ignore
    if (typeof this.onAction === 'function') {
      // @ts-ignore
      this.onAction(actionEvent);
    }
  }
}
