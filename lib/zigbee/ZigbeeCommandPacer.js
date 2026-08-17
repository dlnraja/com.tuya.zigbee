'use strict';

/**
 * Per-device Zigbee TX queue: 15–50 ms jitter between successive commands
 * plus retry on MAC/APS no-ack. Stops multi-gang bursts from colliding.
 */

const { retryZigbeeOperation, isTransientZigbeeError } = require('../utils/ZigbeeRetry');

function sleepMs(device, ms) {
  const n = Math.max(0, Number(ms) || 0);
  if (n === 0) {return Promise.resolve();}
  const t = device?.homey && typeof device.homey.setTimeout === 'function'
    ? device.homey.setTimeout.bind(device.homey)
    : setTimeout;
  return new Promise((resolve) => t(resolve, n));
}

function jitterMs(min = 15, max = 50) {
  const lo = Math.max(0, min);
  const hi = Math.max(lo, max);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

function getQueue(device) {
  if (!device._zigbeeTxPacer) {
    device._zigbeeTxPacer = { tail: Promise.resolve() };
  }
  return device._zigbeeTxPacer;
}

/**
 * Serialize `fn` on the device TX queue.
 * @param {object} device
 * @param {Function} fn
 * @param {object} [opts]
 * @param {boolean} [opts.enabled] - when false, run immediately (still retries)
 * @param {number} [opts.minJitter]
 * @param {number} [opts.maxJitter]
 * @param {number} [opts.maxRetries]
 * @returns {Promise<*>}
 */
async function paceZigbeeCommand(device, fn, opts = {}) {
  const enabled = opts.enabled !== false;
  const wait = enabled ? jitterMs(opts.minJitter ?? 15, opts.maxJitter ?? 50) : 0;
  const maxRetries = opts.maxRetries ?? 3;

  const run = async () => {
    if (wait) {await sleepMs(device, wait);}
    const result = await retryZigbeeOperation(async () => {
      const out = await fn();
      if (out && out.ok === false && out.error && isTransientZigbeeError(out.error)) {
        throw out.error;
      }
      return out;
    }, {
      maxRetries,
      initialDelay: 80,
      maxDelay: 400,
      backoffMultiplier: 2,
      logger: (m) => device?.log?.(`[TX-PACE] ${m}`),
    });
    if (result == null) {
      throw new Error('zigbee-tx-retry-exhausted');
    }
    return result;
  };

  if (!device) {return run();}

  const q = getQueue(device);
  const next = q.tail.then(run, run);
  q.tail = next.catch(() => {});
  return next;
}

module.exports = {
  paceZigbeeCommand,
  sleepMs,
  jitterMs,
};
