/**
 * @template P, M
 * @typedef G_FSA
 * @property {string} type
 * @property {P} payload
 * @property {boolean} [error]
 * @property {Record<string, any> & M} [meta]
 */

/** @typedef {Record<string, any> | any[]} PAYLOAD */
/** @typedef {G_FSA<PAYLOAD | Error, any>} FSA */
/** @typedef {G_FSA<PAYLOAD, any> & { error?: false }} FSA_DATA */
/** @typedef {G_FSA<Error, any> & { error: true }} FSA_ERROR */

/**
 * @param {FSA} action
 * @returns {action is FSA_ERROR}
 */
export function isFsaError(action) {
  const { error, payload } = action;
  return error === true && payload instanceof Error;
}

/**
 * @param {FSA} action
 * @returns {action is FSA_DATA}
 */
export function isFsaData(action) {
  const { error, payload } = action;

  return (
    payload &&
    (payload.constructor === Object || Array.isArray(payload)) &&
    (!('error' in action) || error === false)
  );
}

/**
 * @param {any} action
 * @returns {action is FSA}
 */
export function isFsa(action) {
  return (
    action &&
    action.constructor === Object &&
    typeof action.type === 'string' &&
    (isFsaData(action) || isFsaError(action))
  );
}
