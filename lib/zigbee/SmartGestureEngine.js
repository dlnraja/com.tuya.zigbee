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
        return;
    }

    // 2. MULTI-CLICK BUFFERING
    this._buffer.push({ type, ts: now });
    
    if (this._timer) clearTimeout(this._timer);
    this._timer = setTimeout(() => this._flush(), GESTURE_WINDOW_MS);
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
    this.device.triggerCapabilityListener ? null : this._triggerFlow(finalType);
  }

  _triggerFlow(type) {
     const cardId = `button_${type}`;
     const card = this.device._getFlowCard ? this.device._getFlowCard(cardId, 'trigger')   :  null;
     if (card) card.trigger(this.device).catch(() => {});
  }
}

module.exports = SmartGestureEngine;



