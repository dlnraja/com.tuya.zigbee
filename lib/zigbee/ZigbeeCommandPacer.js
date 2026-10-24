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

  // P3023 (master soak): priority lanes + backpressure. Same FIFO order inside a lane.
  if (_priorityEnabled(opts)) { return _enqueuePriority(device, run, opts); }

  const q = getQueue(device);
  const next = q.tail.then(run, run);
  q.tail = next.catch(() => {});
  return next;
}

/**
 * P3023: command priority. A user action (UI / Flow / voice) must never wait behind
 * background traffic (polls, MethodChain re-probes, magic-packet queries). Lanes:
 *   user (0) > flow (1) > poll (2) > reprobe (3); default 'user' (all existing callers).
 * Backpressure: at most MAX_PENDING queued per device; when full, a background command is
 * rejected at once (`zigbee-tx-backpressure`), and a user command evicts the newest
 * background one instead — user commands are never dropped.
 */
const PRIORITY = Object.freeze({ user: 0, flow: 1, poll: 2, reprobe: 3 });
const MAX_PENDING = 32;

function _priorityEnabled(opts) {
  if (opts && opts.priority === false) { return false; }
  try { return require('../smart/SoakFlags').pacerPriority === true; } catch (_e) { return false; }
}

function _lane(opts) {
  const p = opts && opts.priority;
  if (typeof p === 'number' && p >= 0 && p <= 3) { return Math.floor(p); }
  return PRIORITY[p] ?? PRIORITY.user;
}

function _pq(device) {
  if (!device._zigbeeTxPq) { device._zigbeeTxPq = { lanes: [[], [], [], []], busy: false, dropped: 0, served: 0 }; }
  return device._zigbeeTxPq;
}

function _pending(pq) { return pq.lanes[0].length + pq.lanes[1].length + pq.lanes[2].length + pq.lanes[3].length; }

function _enqueuePriority(device, run, opts) {
  const pq = _pq(device);
  const lane = _lane(opts);
  if (_pending(pq) >= MAX_PENDING) {
    if (lane >= PRIORITY.poll) {
      pq.dropped++;
      return Promise.reject(Object.assign(new Error('zigbee-tx-backpressure'), { code: 'EBACKPRESSURE' }));
    }
    for (let l = 3; l >= PRIORITY.poll; l--) {
      if (pq.lanes[l].length) {
        const victim = pq.lanes[l].pop();
        pq.dropped++;
        victim.reject(Object.assign(new Error('zigbee-tx-backpressure'), { code: 'EBACKPRESSURE' }));
        break;
      }
    }
  }
  return new Promise((resolve, reject) => {
    pq.lanes[lane].push({ run, resolve, reject });
    _drain(device, pq);
  });
}

function _drain(device, pq) {
  if (pq.busy) { return; }
  const lane = pq.lanes.find((l) => l.length);
  if (!lane) { return; }
  const job = lane.shift();
  pq.busy = true;
  Promise.resolve().then(job.run).then(job.resolve, job.reject).then(() => {
    pq.busy = false;
    pq.served++;
    if (device._destroyed) {
      for (const l of pq.lanes) { while (l.length) { l.shift().reject(new Error('device-destroyed')); } }
      return;
    }
    _drain(device, pq);
  });
}

/** Diag / memory release. */
function queueStats(device) {
  const pq = device && device._zigbeeTxPq;
  if (!pq) { return null; }
  return { pending: pq.lanes.map((l) => l.length), busy: pq.busy, dropped: pq.dropped, served: pq.served };
}

/**
 * Reject queued commands. backgroundOnly (memory pressure): only poll / re-probe lanes are
 * dropped — user and Flow commands are never discarded while the device is alive.
 */
function releaseQueue(device, opts = {}) {
  const pq = device && device._zigbeeTxPq;
  if (!pq) { return 0; }
  let n = 0;
  const from = opts.backgroundOnly ? PRIORITY.poll : 0;
  for (let i = from; i < pq.lanes.length; i++) {
    const l = pq.lanes[i];
    while (l.length) { l.shift().reject(Object.assign(new Error(opts.backgroundOnly ? 'zigbee-tx-memory-trim' : 'device-released'), { code: opts.backgroundOnly ? 'EBACKPRESSURE' : 'ERELEASED' })); n++; }
  }
  return n;
}

module.exports = {
  paceZigbeeCommand,
  queueStats,
  releaseQueue,
  PRIORITY,
  MAX_PENDING,
  sleepMs,
  jitterMs,
};
