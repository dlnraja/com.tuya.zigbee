'use strict';

const { BoundCluster } = require('zigbee-clusters');

/**
 * OnOff Bound Cluster - v5.8.96 FRAME DROP FIX
 * 
 * Used to receive ON/OFF commands from button devices and remotes.
 * v5.8.96: Added try/catch to ALL handlers to prevent silent frame drops.
 * If a callback throws, the error is logged but the frame is NOT lost.
 */
class OnOffBoundCluster extends BoundCluster {
  
  constructor({
    onSetOn,
    onSetOff,
    onToggle,
    onWithTimedOff,
  } = {}) {
    super();
    this._onSetOnHandler = onSetOn;
    this._onSetOffHandler = onSetOff;
    this._onToggleHandler = onToggle;
    this._onWithTimedOffHandler = onWithTimedOff;
  }

  // v5.8.96: Safe callback wrapper — prevents frame drops from uncaught errors
  _safe(name, fn, payload) {
    try {
      if (typeof fn === 'function') fn(payload);
    } catch (err) {
      console.error('[OnOffBound] FRAME SAVED — error in', name, ':', err.message);
    }
  }

  on(payload) {
    this._safe('on', this._onSetOnHandler, payload);
  }

  setOn(payload) {
    this._safe('setOn', this._onSetOnHandler, payload);
  }

  off(payload) {
    this._safe('off', this._onSetOffHandler, payload);
  }

  setOff(payload) {
    this._safe('setOff', this._onSetOffHandler, payload);
  }

  toggle(payload) {
    this._safe('toggle', this._onToggleHandler, payload);
  }

  setToggle(payload) {
    this._safe('setToggle', this._onToggleHandler, payload);
  }

  onWithTimedOff(payload) {
    this._safe('onWithTimedOff', this._onWithTimedOffHandler, payload);
  }
}

module.exports = OnOffBoundCluster;
