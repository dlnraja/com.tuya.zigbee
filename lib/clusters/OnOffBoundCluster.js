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

  // v5.8.96: Safe callback wrapper  prevents frame drops from uncaught errors
  _safe(name, fn, payload) {
    try {
      if (typeof fn === 'function') fn(payload);
    } catch (err) {
      console.error('[OnOffBound] FRAME SAVED  error in', name, ':', err.message);
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

  // v5.9.11: Catch Tuya custom cmds (0xFC rotate, 0xFD scene)
  async handleFrame(f, m, r) {
    try {
      const c = f?.cmdId ?? f?.commandId;
      if (c === undefined || [0,1,2,6,0x42].includes(c)) return;
      const d = f?.data || r;console.log(`[OnOffBound] FRAME CAUGHT cmd=0x${c.toString(16)} data=${d?.toString?.('hex')||'none'}`);
      if (c === 0xFD && typeof this._onSetOnHandler === 'function') {
        this._safe('scene_0xFD', this._onSetOnHandler, { cmdId: c, scene: d?.[0], raw: d });
      } else if (c === 0xFC && typeof this._onToggleHandler === 'function') {
        this._safe('rotate_0xFC', this._onToggleHandler, { cmdId: c, direction: d?.[0], raw: d });
      }
    } catch (e) { console.error('[OnOffBound] handleFrame error:', e.message); }
  }
}

module.exports = OnOffBoundCluster;


