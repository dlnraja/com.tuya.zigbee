'use strict';

/**
 * SmartGestureEngine - v1.0.0
 * Deciphers complex button gestures (Single, Double, Triple, Hold) across multiple protocols.
 * Solves: Redundant click reporting and multi-click detection.
 */

const GESTURE_WINDOW_MS = 500;

class SmartGestureEngine {
  constructor(device) {
    this.device = device;
    this._buffer = [];
    this._timer = null;
    this._lastSequence = null;
    this._destroyed = false;
  }

  /**
   * Process a potential button event
   * @param {string} source - 'zcl' | 'tuya-dp'
   * @param {string} type - 'click' | 'hold' | 'release'
   * @param {number} seq - Sequence number
   */
  process(source, type, seq) {
    const now = Date.now();

    // 1. DEDUPLICATION: Cross-protocol suppression
    if (this._lastSequence === seq) {
      // this.device.log(`[GESTURE] Suppressing duplicate sequence: ${seq} (${source})`);
      return;
    }
    this._lastSequence = seq;

    if (type === 'hold' || type === 'release') {
        this.device.emit('button_gesture', { type, source });
        this._triggerFlow(type, 1);
        return;
    }

    // 2. MULTI-CLICK BUFFERING
    this._buffer.push({ type, ts: now });

    if (this._timer) this._clearTimer(this._timer);
    this._timer = this._setTimer(() => { if (this._destroyed) return; this._flush(); }, GESTURE_WINDOW_MS);
  }

  _flush() {
    const count = this._buffer.length;
    this._buffer = [];
    this._timer = null;

    let finalType = 'single';
    if (count === 2) finalType = 'double';
    if (count >= 3) finalType = 'triple';

    this.device.log(` [GESTURE] Resolved gesture: ${finalType} (${count} events)`);
    this.device.emit('button_gesture', { type: finalType, count });

    // Trigger Flow Cards
    this._triggerFlow(finalType, count);
  }

  _triggerFlow(type, count = 1) {
     if (typeof this.device.triggerButtonPress === 'function') {
       const button = this.device._lastButtonNumber || 1;
       this.device.triggerButtonPress(button, type, count, { source: 'physical' }).catch(() => {});
       return;
     }

     const cardMap = {
       single: 'button_pressed',
       double: 'button_double_press',
       triple: 'button_triple_clicked',
       hold: 'button_long_press',
       long: 'button_long_press',
       release: 'button_release',
     };
     const cardId = cardMap[type] || 'button_multi_press';
     const card = this.device._getFlowCard ? this.device._getFlowCard(cardId, 'trigger') : null;
     if (card) card.trigger(this.device, { button: 1, count }, { button: 1, count }).catch(() => {});
  }

  _setTimer(fn, delay) {
    const setTimer = this.device?.homey?.setTimeout
      ? this.device.homey.setTimeout.bind(this.device.homey)
      : globalThis.setTimeout;
    return setTimer(fn, delay);
  }

  _clearTimer(timer) {
    const clearTimer = this.device?.homey?.clearTimeout
      ? this.device.homey.clearTimeout.bind(this.device.homey)
      : globalThis.clearTimeout;
    clearTimer(timer);
  }

  /**
   * Destroy and cleanup pending timers.
   */
  destroy() {
    this._destroyed = true;
    if (this._timer) {
      this._clearTimer(this._timer);
      this._timer = null;
    }
    this._buffer = [];
  }
}

module.exports = SmartGestureEngine;



