'use strict';

const { BoundCluster } = require('zigbee-clusters');

/**
 * OnOff Bound Cluster - v5.8.96 FRAME DROP FIX
 *
 * Used to receive ON/OFF commands from button devices and remotes.
 * v5.8.96: Added try/catch to ALL handlers to prevent silent frame drops.
 * If a callback throws, the error is logged but the frame is NOT lost.
 *
 * WHY(P2290): cmdId extraction must match PhysicalButtonMixin raw catcher
 * (Peter #2203 Softbutton) — Homey SDK variants nest command.id / toJSON().
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
      if (typeof fn === 'function') {fn(payload);}
    } catch (err) {
      if (this._device?.error) {this._device.error('[OnOffBound] FRAME SAVED — error in', name, ':', err.message);}
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

  /** Resolve manufacturer cmd id across Homey/zigbee-clusters frame shapes. */
  _resolveCmdId(f) {
    const json = typeof f?.toJSON === 'function' ? f.toJSON() : f;
    return f?.cmdId ?? f?.commandId ?? f?.command?.id
      ?? json?.cmdId ?? json?.commandId ?? json?.command?.id;
  }

  _resolveData(f, r) {
    const json = typeof f?.toJSON === 'function' ? f.toJSON() : f;
    if (Buffer.isBuffer(json?.data)) {return json.data;}
    if (Array.isArray(json?.data)) {return Buffer.from(json.data);}
    if (Buffer.isBuffer(f?.data)) {return f.data;}
    if (Array.isArray(f?.data)) {return Buffer.from(f.data);}
    if (Buffer.isBuffer(r)) {return r;}
    if (Array.isArray(r)) {return Buffer.from(r);}
    return f?.data || r;
  }

  // v5.9.11 + P2290: Catch Tuya custom cmds (0xFC rotate, 0xFD scene)
  async handleFrame(f, m, r) {
    try {
      const c = this._resolveCmdId(f);
      if (c === undefined || [0, 1, 2, 6, 0x42].includes(c)) {return;}
      const d = this._resolveData(f, r);
      const hex = Buffer.isBuffer(d) ? d.toString('hex')
        : (d?.toString?.('hex') || (Array.isArray(d) ? Buffer.from(d).toString('hex') : 'none'));
      if (this._device?.log) {this._device.log(`[OnOffBound] FRAME CAUGHT cmd=0x${Number(c).toString(16)} data=${hex}`);}
      if ((c === 0xFD || c === 253) && typeof this._onSetOnHandler === 'function') {
        const scene = (Buffer.isBuffer(d) || Array.isArray(d)) ? d[0] : d?.[0];
        this._safe('scene_0xFD', this._onSetOnHandler, {
          cmdId: 0xFD,
          scene,
          press: scene === 1 ? 'double' : scene === 2 ? 'long' : 'single',
          raw: d,
        });
      } else if ((c === 0xFC || c === 252) && typeof this._onToggleHandler === 'function') {
        const direction = (Buffer.isBuffer(d) || Array.isArray(d)) ? d[0] : d?.[0];
        this._safe('rotate_0xFC', this._onToggleHandler, { cmdId: 0xFC, direction, raw: d });
      }
    } catch (e) {
      if (this._device?.error) {this._device.error('[OnOffBound] handleFrame error:', e.message);}
    }
  }
}

module.exports = OnOffBoundCluster;
