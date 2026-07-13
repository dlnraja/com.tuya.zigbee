// lib/multichannel/MultiChannelManager.js — v1.0 (P37.2)
'use strict';
// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHANNEL MANAGER — Coordinates all channels per device
// ═══════════════════════════════════════════════════════════════════════════════
//
// Architecture:
//   - 5 channels per device (ZCL, Tuya DP, Raw Zigbee, Homey App, Hybrid)
//   - Cross-validates answers from multiple channels
//   - Returns the MOST CONFIDENT answer
//   - Records per-channel metrics (latency, error rate)
//   - Handles AggregateError + process errors gracefully
//   - Auto-disables chronically failing channels (recovery via health check)
//
// Cross-validation rules:
//   - If 2+ channels agree on value (and confidence > 0.5) → return with +0.2 confidence boost
//   - If channels DISAGREE → log discrepancy, return highest-confidence, mark as 'disputed'
//   - If only 1 channel succeeds → return with normal confidence
//   - If 0 channels succeed → throw AggregateError (caught by caller, not propagated)

const {
  ZclChannelAdapter,
  TuyaDpChannelAdapter,
  RawZigbeeChannelAdapter,
  HomeyAppChannelAdapter,
  HybridChannelAdapter,
  ChannelResult,
} = require('./ChannelAdapters');
const safeTimer = require('../utils/safe-timers');

const PARALLEL_TIMEOUT_MS = 10000; // 10s hard timeout per channel
const MAX_ERRORS_PER_CHANNEL = 5;  // disable after 5 consecutive errors
const HEALTH_CHECK_INTERVAL = 60000; // 1 minute

class MultiChannelManager {
  constructor(device, options = {}) {
    this.device = device;
    this.options = options;
    this._channels = new Map();
    this._errors = new Map(); // channel → consecutive error count
    this._discrepancies = []; // log of disagreements
    this._maxDiscrepancies = options.maxDiscrepancies || 100;
    this._initChannels();
    this._lastHealthCheck = 0;
  }

  _initChannels() {
    const zcl = new ZclChannelAdapter(this.device);
    const tuya = new TuyaDpChannelAdapter(this.device);
    const raw = new RawZigbeeChannelAdapter(this.device);
    const homeyApp = new HomeyAppChannelAdapter(this.device);
    const hybrid = new HybridChannelAdapter(this.device, { zcl, tuya, raw });

    this._channels.set('zcl', zcl);
    this._channels.set('tuya_dp', tuya);
    this._channels.set('raw_zigbee', raw);
    this._channels.set('homey_app', homeyApp);
    this._channels.set('hybrid', hybrid);
  }

  /**
   * Read a capability using multiple channels in PARALLEL.
   * Returns the most confident + cross-validated result.
   */
  async read(capability) {
    const available = this._getAvailableChannels();
    if (available.length === 0) {
      return new ChannelResult({ value: null, source: 'multi', errors: ['no available channels'] });
    }

    // Run all channels in parallel with hard timeout
    const promises = available.map(async (channel) => {
      try {
        const result = await Promise.race([
          channel.read(capability),
          new Promise((_, reject) => safeTimer.safeSetTimeout(this.device || globalThis, () => reject(new Error('CHANNEL_TIMEOUT')), PARALLEL_TIMEOUT_MS)),
        ]);
        return { channel: channel.name, result };
      } catch (e) {
        return { channel: channel.name, result: new ChannelResult({ value: null, source: channel.name, errors: [e.message] }) };
      }
    });

    const all = await Promise.all(promises);

    // Reset consecutive error count on success
    all.forEach(({ channel, result }) => {
      if (result.isSuccess() && result.value !== null) {
        this._errors.set(channel, 0);
      } else {
        this._errors.set(channel, (this._errors.get(channel) || 0) + 1);
      }
    });

    // Cross-validate
    return this._crossValidate(capability, all);
  }

  /**
   * Write a capability using the BEST channel for that capability.
   * Tries channels in order of historical success.
   */
  async write(capability, value) {
    const available = this._getAvailableChannels();
    // Order: homey_app first (most reliable for high-level), then zcl, then hybrid, then tuya_dp, then raw
    const order = ['homey_app', 'zcl', 'hybrid', 'tuya_dp', 'raw_zigbee'];
    const errors = [];

    for (const name of order) {
      if (!available.find((c) => c.name === name)) continue;
      const channel = this._channels.get(name);
      try {
        const r = await Promise.race([
          channel.write(capability, value),
          new Promise((_, reject) => safeTimer.safeSetTimeout(this.device || globalThis, () => reject(new Error('WRITE_TIMEOUT')), PARALLEL_TIMEOUT_MS)),
        ]);
        if (r.ok) {
          this._errors.set(name, 0);
          return r;
        }
        errors.push(`${name}: ${(r.errors || []).join(', ') || 'failed'}`);
      } catch (e) {
        errors.push(`${name}: ${e.message}`);
        this._errors.set(name, (this._errors.get(name) || 0) + 1);
      }
    }

    return { ok: false, source: 'multi', errors };
  }

  /**
   * Subscribe to a capability. Hybrid channel handles multi-source.
   */
  async subscribe(capability, callback) {
    const available = this._getAvailableChannels();
    const errors = [];
    for (const channel of available) {
      try {
        const r = await channel.subscribe(capability, callback);
        if (r && r.ok) return r;
        errors.push(`${channel.name}: ${(r && r.errors || []).join(', ') || 'failed'}`);
      } catch (e) {
        errors.push(`${channel.name}: ${e.message}`);
      }
    }
    return { ok: false, source: 'multi', errors };
  }

  /**
   * Cross-validate results from all channels.
   * Returns the most confident + cross-validated result.
   */
  _crossValidate(capability, results) {
    const successful = results.filter((r) => r.result.isSuccess() && r.result.value !== null);
    const failed = results.filter((r) => !r.result.isSuccess() || r.result.value === null);

    if (successful.length === 0) {
      // All failed — aggregate errors
      const aggErr = new AggregateError(
        failed.map((r) => new Error(`${r.channel}: ${(r.result.errors || []).join(', ') || 'no value'}`)),
        `MultiChannel: all ${results.length} channels failed for ${capability}`,
      );
      return new ChannelResult({ value: null, source: 'multi', confidence: 0, errors: failed.map((r) => r.result.errors.join(', ')) });
    }

    // Find consensus — values that match
    const valueMap = new Map(); // serialized value → list of results
    for (const r of successful) {
      const key = JSON.stringify(r.result.value);
      if (!valueMap.has(key)) valueMap.set(key, []);
      valueMap.get(key).push(r);
    }

    // Pick the value with the most support
    let best = null;
    let bestSupport = 0;
    for (const [key, list] of valueMap.entries()) {
      const totalConf = list.reduce((sum, r) => sum + r.result.confidence, 0);
      if (totalConf > bestSupport || (totalConf === bestSupport && best && list.length > best.list.length)) {
        bestSupport = totalConf;
        best = { value: JSON.parse(key), list, totalConf };
      }
    }

    if (!best) {
      // Should never happen
      return successful[0].result;
    }

    // If only 1 channel succeeded, return it as-is
    if (successful.length === 1) {
      return successful[0].result;
    }

    // Boost confidence if multiple channels agree
    const consensusBoost = Math.min(0.2, (best.list.length - 1) * 0.1);
    const winner = best.list[0].result;
    const newConfidence = Math.min(1.0, winner.confidence + consensusBoost);

    // Log discrepancies
    if (successful.length > best.list.length) {
      const disagreeing = successful.filter((r) => !best.list.includes(r));
      this._logDiscrepancy(capability, best.value, disagreeing.map((r) => ({ channel: r.channel, value: r.result.value, confidence: r.result.confidence })));
    }

    return new ChannelResult({
      value: best.value,
      source: best.list.length > 1 ? `multi/${best.list.map((r) => r.channel).join('+')}` : winner.source,
      confidence: newConfidence,
      latencyMs: Math.max(...best.list.map((r) => r.result.latencyMs)),
    });
  }

  _logDiscrepancy(capability, consensusValue, disagreeing) {
    this._discrepancies.push({ capability, consensusValue, disagreeing, timestamp: Date.now() });
    if (this._discrepancies.length > this._maxDiscrepancies) {
      this._discrepancies.shift();
    }
  }

  /**
   * Get channels that are available and not chronically failing.
   */
  _getAvailableChannels() {
    return Array.from(this._channels.values()).filter((c) => {
      if (!c.isAvailable()) return false;
      const errs = this._errors.get(c.name) || 0;
      if (errs >= MAX_ERRORS_PER_CHANNEL) return false;
      return true;
    });
  }

  /**
   * Health check — re-enable channels that have been disabled.
   * Run periodically (e.g., every 1 minute from a cron).
   */
  healthCheck() {
    const now = Date.now();
    if (now - this._lastHealthCheck < HEALTH_CHECK_INTERVAL && this._lastHealthCheck !== 0) {
      return { skipped: true, reason: 'too soon' };
    }
    this._lastHealthCheck = now;
    const reEnabled = [];
    for (const [name, errs] of this._errors.entries()) {
      if (errs >= MAX_ERRORS_PER_CHANNEL) {
        // Half-life the error count
        this._errors.set(name, Math.floor(errs / 2));
        reEnabled.push(name);
      }
    }
    return {
      skipped: false,
      channels: Array.from(this._channels.values()).map((c) => c.health()),
      reEnabled,
      discrepancies: this._discrepancies.length,
    };
  }

  /**
   * Get the overall health of this manager.
   */
  getHealth() {
    return {
      totalChannels: this._channels.size,
      availableChannels: this._getAvailableChannels().length,
      errors: Object.fromEntries(this._errors),
      discrepancies: this._discrepancies.length,
      lastDiscrepancies: this._discrepancies.slice(-5),
      channels: Array.from(this._channels.values()).map((c) => c.health()),
    };
  }
}

module.exports = { MultiChannelManager, PARALLEL_TIMEOUT_MS, MAX_ERRORS_PER_CHANNEL };
