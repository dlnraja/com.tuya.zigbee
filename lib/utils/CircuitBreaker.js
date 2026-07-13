'use strict';

/**
 * CircuitBreaker - Resilience pattern for external API calls
 *
 * States:
 *   CLOSED   = normal operation, requests pass through
 *   OPEN     = failing, requests are rejected immediately
 *   HALF_OPEN = testing recovery, limited requests allowed
 *
 * Transitions:
 *   CLOSED  -> OPEN      (after `failureThreshold` consecutive failures)
 *   OPEN    -> HALF_OPEN (after `resetTimeout` ms)
 *   HALF_OPEN -> CLOSED  (after `successThreshold` consecutive successes)
 *   HALF_OPEN -> OPEN    (on any failure)
 *
 * Features:
 *   - Exponential backoff on repeated OPEN->HALF_OPEN cycles
 *   - EventEmitter for state changes
 *   - Configurable thresholds and timeouts
 *   - Failure filtering (only count specific errors)
 *
 * Usage:
 *   const CircuitBreaker = require('./CircuitBreaker');
 *   const breaker = new CircuitBreaker({ name: 'TuyaCloudAPI' });
 *   breaker.on('stateChange', ({ from, to }) => this.log(`State: ${from} -> ${to}`));
 *
 *   try {
 *     const result = await breaker.exec(() => api.getDevices());
 *   } catch (err) {
 *     // err.message === 'Circuit breaker is OPEN' if rejected
 *   }
 */

const EventEmitter = require('events');

const STATE = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
};

class CircuitBreaker extends EventEmitter {
  /**
   * @param {Object} options
   * @param {string} options.name - Identifier for logging
   * @param {number} [options.failureThreshold=5] - Consecutive failures before OPEN
   * @param {number} [options.resetTimeout=30000] - ms before OPEN -> HALF_OPEN
   * @param {number} [options.successThreshold=2] - Consecutive successes in HALF_OPEN to close
   * @param {number} [options.maxBackoff=300000] - Max backoff in ms (5 min)
   * @param {number} [options.backoffMultiplier=2] - Exponential backoff multiplier
   * @param {Function} [options.isFailure] - Predicate: (err) => boolean, default all errors count
   * @param {Function} [options.log] - Logger function
   */
  constructor(options = {}) {
    super();

    this.name = options.name || 'CircuitBreaker';
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000;
    this.successThreshold = options.successThreshold || 2;
    this.maxBackoff = options.maxBackoff || 300000; // 5 minutes
    this.backoffMultiplier = options.backoffMultiplier || 2;
    this.isFailure = options.isFailure || (() => true);
    this.log = options.log || (() => {});

    // Internal state
    this._state = STATE.CLOSED;
    this._failureCount = 0;
    this._successCount = 0;
    this._nextAttempt = 0;
    this._consecutiveOpenCycles = 0;
    this._lastError = null;

    // Statistics
    this._stats = {
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      totalRejected: 0,
      totalFallbacks: 0,
      lastStateChange: Date.now(),
    };
  }

  /**
   * Current state of the circuit breaker
   */
  get state() {
    return this._state;
  }

  /**
   * Whether the circuit is allowing requests
   */
  get isAvailable() {
    return this._state !== STATE.OPEN || Date.now() >= this._nextAttempt;
  }

  /**
   * Execute a function through the circuit breaker
   * @param {Function} fn - Async function to execute
   * @returns {Promise<*>} Result of fn
   * @throws {Error} If circuit is OPEN or fn throws
   */
  async exec(fn) {
    this._stats.totalRequests++;

    // Check if we should attempt
    if (this._state === STATE.OPEN) {
      if (Date.now() >= this._nextAttempt) {
        // Transition to HALF_OPEN
        this._transitionTo(STATE.HALF_OPEN);
      } else {
        this._stats.totalRejected++;
        const waitMs = Math.max(0, this._nextAttempt - Date.now());
        throw new Error(`Circuit breaker [${this.name}] is OPEN. Retry in ${Math.round(waitMs / 1000)}s`);
      }
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure(err);
      throw err;
    }
  }

  /**
   * Execute with a fallback function when circuit is OPEN
   * @param {Function} fn - Primary async function
   * @param {Function} fallback - Fallback function when circuit is open
   * @returns {Promise<*>}
   */
  async execWithFallback(fn, fallback) {
    try {
      return await this.exec(fn);
    } catch (err) {
      if (err.message && err.message.includes('Circuit breaker')) {
        this._stats.totalFallbacks++;
        return fallback();
      }
      throw err;
    }
  }

  /**
   * Manually trip the circuit (force OPEN)
   * @param {Error} [reason] - Reason for tripping
   */
  trip(reason) {
    this._lastError = reason || new Error('Manually tripped');
    this._transitionTo(STATE.OPEN);
    this._scheduleReset();
  }

  /**
   * Manually reset the circuit to CLOSED
   */
  reset() {
    this._failureCount = 0;
    this._successCount = 0;
    this._consecutiveOpenCycles = 0;
    this._nextAttempt = 0;
    this._transitionTo(STATE.CLOSED);
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      ...this._stats,
      state: this._state,
      failureCount: this._failureCount,
      successCount: this._successCount,
      lastError: this._lastError ? this._lastError.message : null,
      uptime: Date.now() - this._stats.lastStateChange,
    };
  }

  // ─── Internal ───────────────────────────────────────────────────────

  _onSuccess() {
    this._stats.totalSuccesses++;
    this._failureCount = 0;

    if (this._state === STATE.HALF_OPEN) {
      this._successCount++;
      if (this._successCount >= this.successThreshold) {
        this._consecutiveOpenCycles = 0;
        this._transitionTo(STATE.CLOSED);
      }
    }
  }

  _onFailure(err) {
    // Check if this error should be counted
    if (!this.isFailure(err)) {
      return;
    }

    this._stats.totalFailures++;
    this._failureCount++;
    this._successCount = 0;
    this._lastError = err;

    if (this._state === STATE.HALF_OPEN) {
      // Any failure in HALF_OPEN goes straight back to OPEN
      this._transitionTo(STATE.OPEN);
      this._scheduleReset();
    } else if (this._failureCount >= this.failureThreshold) {
      this._transitionTo(STATE.OPEN);
      this._scheduleReset();
    }
  }

  _transitionTo(newState) {
    const oldState = this._state;
    if (oldState === newState) return;

    this._state = newState;
    this._stats.lastStateChange = Date.now();

    this.log(`[${this.name}] Circuit: ${oldState} -> ${newState}`);

    this.emit('stateChange', {
      from: oldState,
      to: newState,
      failureCount: this._failureCount,
      timestamp: Date.now(),
    });
  }

  _scheduleReset() {
    this._consecutiveOpenCycles++;
    const backoff = Math.min(
      this.resetTimeout * Math.pow(this.backoffMultiplier, this._consecutiveOpenCycles - 1),
      this.maxBackoff
    );
    this._nextAttempt = Date.now() + backoff;

    this.log(`[${this.name}] Reset scheduled in ${Math.round(backoff / 1000)}s (cycle ${this._consecutiveOpenCycles})`);
  }
}

// Export both the class and the states for external use
CircuitBreaker.STATE = STATE;
module.exports = CircuitBreaker;
