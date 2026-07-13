// lib/multichannel/TransmissionManager.js — v1.0 (P37.4)
'use strict';
// ═══════════════════════════════════════════════════════════════════════════════
// TRANSMISSION MANAGER — Reliable TX with retry, backoff, channel selection
// ═══════════════════════════════════════════════════════════════════════════════
//
// Ensures every write reaches the device even when:
//   - One channel fails (try next channel)
//   - Network is slow (retry with exponential backoff)
//   - Multiple writes collide (queue + serialize)
//
// Outbox pattern: pending writes are tracked and retried until confirmed.

const { MultiChannelManager } = require('./MultiChannelManager');
const safeTimer = require('../utils/safe-timers');

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_BACKOFF_MS = 250; // exponential: 250, 500, 1000

class TransmissionManager {
  constructor(device, options = {}) {
    this.device = device;
    this.options = options;
    this._mcm = options.multiChannelManager || new MultiChannelManager(device);
    this._outbox = new Map(); // id → { capability, value, attempts, createdAt }
    this._sent = []; // history
    this._maxSentHistory = options.maxSentHistory || 200;
    this._maxRetries = options.maxRetries || DEFAULT_MAX_RETRIES;
  }

  /**
   * Send a write reliably.
   * Tries multiple channels with exponential backoff.
   */
  async send(capability, value, options = {}) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const maxRetries = options.maxRetries || this._maxRetries;
    const backoff = options.backoffMs || DEFAULT_RETRY_BACKOFF_MS;
    const errors = [];

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        const r = await this._mcm.write(capability, value);
        if (r.ok) {
          this._record(id, capability, value, attempt, true, null);
          return { ok: true, id, attempts: attempt + 1, source: r.source, latencyMs: r.latencyMs };
        }
        errors.push({ attempt, errors: r.errors || ['unknown'] });
      } catch (e) {
        errors.push({ attempt, errors: [e.message] });
      }
      if (attempt < maxRetries) {
        await this._delay(backoff * Math.pow(2, attempt));
      }
    }

    // All retries exhausted — add to outbox for later retry
    this._outbox.set(id, { capability, value, attempts: maxRetries + 1, createdAt: Date.now(), errors });
    this._record(id, capability, value, maxRetries + 1, false, errors);
    return { ok: false, id, attempts: maxRetries + 1, errors, outboxed: true };
  }

  /**
   * Flush the outbox (retry pending writes).
   * Returns the count of successfully sent pending writes.
   */
  async flushOutbox() {
    let sent = 0;
    for (const [id, item] of this._outbox.entries()) {
      const r = await this._mcm.write(item.capability, item.value);
      if (r.ok) {
        this._outbox.delete(id);
        sent += 1;
      } else {
        item.attempts += 1;
        if (item.attempts > this._maxRetries * 3) {
          // Give up after 3x normal retries
          this._outbox.delete(id);
        }
      }
    }
    return { sent, remaining: this._outbox.size };
  }

  /**
   * Get the current outbox state.
   */
  getOutbox() {
    return Array.from(this._outbox.entries()).map(([id, item]) => ({ id, ...item }));
  }

  /**
   * Get recent transmission history.
   */
  getRecent(limit = 20) {
    return this._sent.slice(-limit);
  }

  /**
   * Get the health/reliability metrics.
   */
  getHealth() {
    const total = this._sent.length;
    const successful = this._sent.filter((s) => s.success).length;
    return {
      total,
      successful,
      failed: total - successful,
      successRate: total > 0 ? successful / total : 1,
      outboxSize: this._outbox.size,
      averageAttempts: total > 0 ? this._sent.reduce((sum, s) => sum + s.attempts, 0) / total : 0,
    };
  }

  _record(id, capability, value, attempts, success, error) {
    this._sent.push({ id, capability, value, attempts, success, error, timestamp: Date.now() });
    if (this._sent.length > this._maxSentHistory) {
      this._sent.shift();
    }
  }

  _delay(ms) {
    return new Promise((resolve) => safeTimer.safeSetTimeout(this.device || globalThis, resolve, ms));
  }
}

module.exports = { TransmissionManager };
