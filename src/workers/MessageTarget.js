function MessageAction(action, handler) {
  const fsaProps = new Set(['type', 'payload', 'meta', 'error']);
  const isFsa = action => Object.keys(action).every(key => fsaProps.has(key));
  return new Promise(resolve => {
    let responded = false;
    const { type, meta = {} } = action;
    const timeoutID = setTimeout(() => {
      rejectWith(`Time out responding to ${type}`);
    }, MessageAction.TIMEOUT);

    const respondWith = (type, payload, metadata = {}, error = false) => {
      if (responded) {
        throw new Error(`[WorkerAction] Already responded to action '${type}'`);
      }

      clearTimeout(timeoutID);
      responded = true;
      const data = {
        meta: {
          ...meta,
          ...metadata
        },
        payload,
        type
      };

      if (error) {
        data.error = error;
      }

      resolve(data);
    };

    /**
     * @param {any} payload
     * @param {object} [meta]
     */
    const resolveWith = (payload, meta) => {
      if (isFsa(payload)) {
        const { type, payload, meta, error } = payload;
        respondWith(type, payload, meta, error);
      } else {
        respondWith(type, payload, meta);
      }
    };

    /**
     * @param {string} errorMessage
     * @param {object} [meta]
     */
    const rejectWith = (errorMessage, meta) => {
      const cast = message => typeof message === 'string' ?
          new Error(message) :
          message
      if (isFsa(errorMessage)) {
        const { type, payload, meta, error } = errorMessage;
        respondWith(type, cast(payload), meta, error);
      } else {
        respondWith(type, cast(errorMessage), meta, true);
      }
    };

    try {
      handler({ action, resolveWith, rejectWith });
    } catch (error) {
      rejectWith(error);
    }
  });
}
MessageAction.TIMEOUT = 5000;

function MessageActionUnknown(action) {
  return {
    type: 'WORKER_ACTION_UNKNOWN',
    payload: new Error(`No action matches type: ${action.type}`),
    meta: {
      ...action.meta,
      action
    },
    error: true
  };
}

/**
 * @param {Worker} worker
 * @param {Record<string, Parameters<typeof MessageAction>[1]>} handlers
 */
function MessageTarget(worker, handlers) {
  worker.addEventListener('message', async event => {
    const { data: action } = event;
    const { [action.type]: handler } = handlers;
    const data =
      typeof handler !== 'function'
        ? MessageActionUnknown(action)
        : await MessageAction(action, handler);
    worker.postMessage(data);
  });
}
