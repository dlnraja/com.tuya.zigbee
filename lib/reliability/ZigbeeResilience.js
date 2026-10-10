'use strict';
/**
 * ZigbeeResilience: additive per-device reliability helpers.
 * WHY (docs/knowledge/HOMEY_FIRMWARE.md): Homey OS 13.5.0 moved the Zigbee NCP from EmberZNet
 * 7.4.2 to 9.1.0. Users reported lost bindings and reporting after the upgrade, and the new stack already
 * retries at APS level. So:
 *  1. One-shot re-bind + re-configure-reporting when a device stays silent > N x its report interval.
 *  2. At most ONE app-level retry with jitter (never stack bursts on top of APS retries).
 *  3. Battery (sleepy) devices: a failed write is queued and flushed on the next RX (wake).
 *  4. Availability: unavailable only after `missedIntervals` (2-3) report intervals of silence.
 */
const MIN_INTERVAL = 60 * 1000;
const MAX_INTERVAL = 6 * 3600 * 1000;
const DEFAULT_INTERVAL = { battery: 3600 * 1000, mains: 600 * 1000 };
const TICK_MS = 5000;

const REACHABILITY_RE = /timeout|timed out|not reachable|unreachable|no response|MAC_NO_ACK|NWK|APS|delivery|ENETUNREACH|could not reach/i;

function isReachabilityError(err) {
  return !!err && REACHABILITY_RE.test(String(err.message || err));
}

function jitterDelay(baseMs = 500, jitterMs = 1000, rnd = Math.random) {
  return Math.round(baseMs + rnd() * jitterMs);
}

/** Run fn; on a reachability error retry exactly once after a jittered delay. */
async function retryOnceWithJitter(fn, { baseMs = 500, jitterMs = 1000, sleep, rnd } = {}) {
  // native setTimeout fallback only when no homey sleep is injected (module-level helper, script utility)
  const wait = sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
  try { return await fn(); } catch (err) {
    if (!isReachabilityError(err)) throw err;
    await wait(jitterDelay(baseMs, jitterMs, rnd));
    return fn();
  }
}

function clampInterval(ms) { return Math.min(MAX_INTERVAL, Math.max(MIN_INTERVAL, ms)); }

class ZigbeeResilience {
  /**
   * @param {object} dev  Homey device-like object
   * @param {object} [opts]
   */
  constructor(dev, opts = {}) {
    this.dev = dev;
    this.now = opts.now || (() => Date.now());
    this.silenceFactor = opts.silenceFactor ?? 4;            // re-bind after 4 x interval silent
    this.missedIntervals = Math.min(3, Math.max(2, opts.missedIntervals ?? 3));
    this.maxQueue = opts.maxQueue ?? 8;
    this.queueTtlMs = opts.queueTtlMs ?? 24 * 3600 * 1000;
    this._ema = null; this._lastRx = 0; this._seenRx = 0;
    this._rebindDoneForRx = -1; this._queue = []; this.rebindCount = 0;
  }

  isBattery() {
    const d = this.dev || {};
    const p = String(d.powerType || d._powerType || '').toUpperCase();
    if (p) return p === 'BATTERY';
    try { return typeof d.hasCapability === 'function' && d.hasCapability('measure_battery'); } catch (_) { return false; }
  }

  /** Expected report interval: learned EMA of RX gaps, else explicit, else default by power. */
  reportIntervalMs() {
    const explicit = Number(this.dev && this.dev._reportIntervalMs);
    if (explicit > 0) return clampInterval(explicit);
    if (this._ema) return clampInterval(this._ema);
    return this.isBattery() ? DEFAULT_INTERVAL.battery : DEFAULT_INTERVAL.mains;
  }

  _readDeviceRx() {
    const d = this.dev || {};
    return Math.max(Number(d._lastRxTimestamp) || 0, Number(d._lastMessageTime) || 0, Number(d._lastSeen) || 0);
  }

  /** Record an RX (explicit call or detected by tick). Flushes the sleepy queue. */
  noteRx(at = this.now()) {
    const gap = this._lastRx ? at - this._lastRx : 0;
    // Learn from normal gaps only; an outage (> silenceFactor x interval) must not inflate the interval.
    if (gap >= 5000 && gap <= this.silenceFactor * this.reportIntervalMs()) {
      this._ema = this._ema ? Math.round(this._ema * 0.8 + gap * 0.2) : gap;
    }
    this._lastRx = at;
    if (this._queue.length) this.flushQueue();
  }

  silentForMs() { return this._lastRx ? this.now() - this._lastRx : 0; }

  /** Availability policy: unavailable only after N missed intervals (and never while recently heard). */
  shouldMarkUnavailable() {
    if (!this._lastRx) return false;
    return this.silentForMs() > Math.max(120000, this.missedIntervals * this.reportIntervalMs());
  }

  needsRebind() {
    if (!this._lastRx || this._rebindDoneForRx === this._lastRx) return false;
    return this.silentForMs() > this.silenceFactor * this.reportIntervalMs();
  }

  /** One-shot re-bind + re-configure reporting using whatever the device class offers. */
  async rebind(reason = 'silence') {
    const d = this.dev || {};
    this._rebindDoneForRx = this._lastRx;
    this.rebindCount++;
    const done = [];
    const steps = [
      ['bindings', d._rebindClusters || d.rebindClusters],
      ['reporting', d._reconfigureAttributeReporting],
      ['switch-reporting', d._setupReporting && d.zclNode ? () => d._setupReporting(d.zclNode) : null],
      ['energy', d._configureEnergyReporting],
    ];
    for (const [name, fn] of steps) {
      if (typeof fn !== 'function') continue;
      try { await fn.call(d); done.push(name); } catch (e) { try { d.log && d.log(`[RESILIENCE] ${name} failed: ${e && e.message}`); } catch (_) { /* */ } }
    }
    try { d.log && d.log(`[RESILIENCE] re-bind (${reason}) silent=${Math.round(this.silentForMs() / 1000)}s steps=${done.join(',') || 'none'}`); } catch (_) { /* */ }
    return done;
  }

  /** Send a command: one jittered retry; for battery devices a reachability failure is queued until wake. */
  async send(fn, label = 'cmd') {
    try {
      return await retryOnceWithJitter(fn, this._retryOpts || {});
    } catch (err) {
      if (!this.isBattery() || !isReachabilityError(err)) throw err;
      if (this._queue.length >= this.maxQueue) this._queue.shift();
      this._queue.push({ fn, label, at: this.now() });
      try { this.dev.log && this.dev.log(`[RESILIENCE] ${label} queued until device wakes (${this._queue.length})`); } catch (_) { /* */ }
      return { queued: true };
    }
  }

  flushQueue() {
    const q = this._queue; this._queue = [];
    const fresh = q.filter((e) => this.now() - e.at < this.queueTtlMs);
    // Sequential, so a waking device is not hit by a burst.
    return fresh.reduce((p, e) => p.then(() => Promise.resolve().then(e.fn).catch(() => {})), Promise.resolve())
      .then(() => fresh.length);
  }

  queueLength() { return this._queue.length; }

  /** Periodic check (shared timer). */
  async tick() {
    const rx = this._readDeviceRx();
    if (rx && rx !== this._seenRx) { this._seenRx = rx; this.noteRx(rx); }
    if (this.needsRebind()) await this.rebind('silence');
  }

  snapshot() {
    return { lastRx: this._lastRx || null, reportIntervalMs: this.reportIntervalMs(), queued: this._queue.length, rebinds: this.rebindCount };
  }
}

// One shared timer for all devices (cheap, unref'd).
const _registry = new Set();
let _timer = null;
function _ensureTimer() {
  if (_timer) return;
  // module-level native setInterval: one shared unref'd timer for all devices (no device homey here)
  _timer = setInterval(() => { for (const r of _registry) r.tick().catch(() => {}); }, TICK_MS);
  if (_timer.unref) _timer.unref();
}
function attach(dev, opts) {
  const r = new ZigbeeResilience(dev, opts);
  _registry.add(r); _ensureTimer();
  return r;
}
function detach(r) {
  _registry.delete(r);
  if (!_registry.size && _timer) { clearInterval(_timer); _timer = null; }
}

module.exports = { ZigbeeResilience, attach, detach, retryOnceWithJitter, isReachabilityError, jitterDelay, _registry };
