'use strict';

/**
 * TransitionEngine - Smooth Multi-Step Transitions
 * FEATURE #81
 *
 * Provides smooth multi-step transitions for device capabilities:
 *   - Linear, ease-in, ease-out, ease-in-out, cubic bezier interpolation
 *   - Color temperature transitions
 *   - Brightness ramping with step control
 *   - Parallel multi-capability transitions
 *   - Cancellation and interrupt support
 *
 * @version 9.1.0
 */

const EventEmitter = require('events');

const EASING = {
  linear: t => t,
  easeIn: t => t * t,
  easeOut: t => t * (2 - t),
  easeInOut: t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  cubicIn: t => t * t * t,
  cubicOut: t => (--t) * t * t + 1,
  cubicInOut: t => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1)
};

class TransitionEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.defaultStepMs = options.stepMs || 50;
    this.minSteps = options.minSteps || 2;
    this.maxSteps = options.maxSteps || 200;
    this._activeTransitions = new Map(); // key: transitionId
    this._nextId = 1;
    this._destroyed = false;
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                         */
  /* ------------------------------------------------------------------ */

  /**
   * Execute a smooth transition on a single numeric capability.
   *
   * @param {Object} params
   * @param {number} params.from       - Start value
   * @param {number} params.to         - End value
   * @param {number} params.durationMs - Total transition time
   * @param {string} [params.easing='linear'] - Easing function name
   * @param {number} [params.stepMs]   - Override step interval
   * @param {Function} params.onStep   - Called with interpolated value each step
   * @returns {Promise<{ cancelled: boolean }>}
   */
  async transition(params) {
    const {
      from, to, durationMs,
      easing = 'linear',
      stepMs = this.defaultStepMs,
      onStep
    } = params;

    if (typeof onStep !== 'function') throw new Error('onStep callback is required');
    if (durationMs <= 0) { await onStep(to); return { cancelled: false }; }

    const easingFn = EASING[easing] || EASING.linear;
    const steps = Math.max(this.minSteps, Math.min(this.maxSteps, Math.ceil(durationMs / stepMs)));
    const actualStepMs = durationMs / steps;
    const id = this._nextId++;

    return new Promise((resolve) => {
      const state = { cancelled: false, timer: null };
      this._activeTransitions.set(id, state);

      let currentStep = 0;

      const tick = () => {
        if (state.cancelled || this._destroyed) {
          this._activeTransitions.delete(id);
          resolve({ cancelled: true });
          return;
        }

        currentStep++;
        const t = currentStep / steps;
        const easedT = easingFn(Math.min(t, 1));
        const value = from + (to - from) * easedT;

        onStep(currentStep >= steps ? to : value);

        if (currentStep >= steps) {
          this._activeTransitions.delete(id);
          resolve({ cancelled: false });
        } else {
          state.timer = this.homey.setTimeout(tick, actualStepMs);
        }
      };

      // First step immediately
      onStep(from);
      state.timer = this.homey.setTimeout(tick, actualStepMs);
    });
  }

  /**
   * Transition brightness with exponential easing for perceptually smooth dimming.
   *
   * @param {Object} params
   * @param {number} params.from       - Start brightness 0..1
   * @param {number} params.to         - End brightness 0..1
   * @param {number} params.durationMs
   * @param {Function} params.onStep   - Called with brightness 0..1
   * @returns {Promise}
   */
  async transitionBrightness(params) {
    return this.transition({
      ...params,
      easing: params.easing || 'cubicInOut',
      onStep: (v) => params.onStep(Math.max(0, Math.min(1, v)))
    });
  }

  /**
   * Transition color temperature (Kelvin) with linear interpolation.
   *
   * @param {Object} params
   * @param {number} params.from       - Start Kelvin (e.g., 2700)
   * @param {number} params.to         - End Kelvin (e.g., 6500)
   * @param {number} params.durationMs
   * @param {Function} params.onStep   - Called with Kelvin value
   * @returns {Promise}
   */
  async transitionColorTemp(params) {
    return this.transition({
      ...params,
      easing: params.easing || 'linear',
      onStep: (v) => params.onStep(Math.round(Math.max(2700, Math.min(6500, v))))
    });
  }

  /**
   * Execute parallel transitions on multiple capabilities.
   *
   * @param {Array<Object>} transitions - Array of transition params
   * @returns {Promise<Array>}
   */
  async parallel(transitions) {
    return Promise.all(transitions.map(t => this.transition(t)));
  }

  /**
   * Execute sequential transitions (one after another).
   *
   * @param {Array<Object>} transitions
   * @returns {Promise<Array>}
   */
  async sequential(transitions) {
    const results = [];
    for (const t of transitions) {
      if (this._destroyed) break;
      results.push(await this.transition(t));
    }
    return results;
  }

  /**
   * Cancel all active transitions.
   */
  cancelAll() {
    for (const [id, state] of this._activeTransitions.entries()) {
      if (state.timer) clearTimeout(state.timer);
      state.cancelled = true;
    }
    this._activeTransitions.clear();
  }

  /**
   * Get count of active transitions.
   * @returns {number}
   */
  getActiveCount() {
    return this._activeTransitions.size;
  }

  /**
   * Cleanup and destroy the engine.
   */
  destroy() {
    this._destroyed = true;
    this.cancelAll();
    this.removeAllListeners();
  }
}

module.exports = TransitionEngine;
