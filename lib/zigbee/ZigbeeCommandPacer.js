'use strict';

/**
 * Per-device Zigbee TX queue.
 *
 * Spacing (NOT retry): 15–50 ms between successive commands so multi-gang
 * bursts do not collide on the air.
 *
 * Retry (separate): up to 3 attempts with a FIXED 350 ms delay on MAC/APS
 * no-ack. Do not jitter or exponentially back off the retry delay — that
 * mixed two unrelated mechanisms and made unacked frames wait too long.
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
 * @param {boolean} [opts.enabled] - when false, skip inter-command spacing (still retries)
 * @param {number} [opts.minJitter] - TX queue spacing min ms (not retry)
 * @param {number} [opts.maxJitter] - TX queue spacing max ms (not retry)
 * @param {number} [opts.maxRetries]
 * @param {number} [opts.retryDelayMs] - fixed delay between retries (default 350)
 * @returns {Promise<*>}
 */
async function paceZigbeeCommand(device, fn, opts = {}) {
  const enabled = opts.enabled !== false;
  const wait = enabled ? jitterMs(opts.minJitter ?? 15, opts.maxJitter ?? 50) : 0;
  const maxRetries = opts.maxRetries ?? 3;
  const retryDelayMs = opts.retryDelayMs ?? 350;

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
      initialDelay: retryDelayMs,
      maxDelay: retryDelayMs,
      backoffMultiplier: 1,
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
