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
    dispatchStandard = false,
  } = {}) {
    super();
    this._onSetOnHandler = onSetOn;
    this._onSetOffHandler = onSetOff;
    this._onToggleHandler = onToggle;
    this._onWithTimedOffHandler = onWithTimedOff;
    // WHY(P2870): opt-in. Standard on/off/toggle sent by a remote reach ONLY this BoundCluster
    // (zigbee-clusters routes client->server frames to endpoint.bindings). Drivers built on
    // TuyaZigbeeDevice already see them through the raw L1 path (PhysicalButtonMixin.onZigBeeMessage),
    // so dispatching here by default would fire twice. Owners without another path pass true.
    this._dispatchStandard = dispatchStandard === true;
  }

  // v5.8.96: Safe callback wrapper — prevents frame drops from uncaught errors
  _safe(name, fn, payload) {
    try {
      if (typeof fn === 'function') {
        const res = fn(payload);
        // WHY(P2870): async handlers must not leave unhandled rejections
        if (res && typeof res.catch === 'function') {res.catch(() => {});}
      }
    } catch (err) {
      if (this._device?.error) this._device.error('[OnOffBound] FRAME SAVED — error in', name, ':', err.message);
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

  offWithEffect(payload) {
    this._safe('offWithEffect', this._onSetOffHandler, payload);
  }

  onWithRecallGlobalScene(payload) {
    this._safe('onWithRecallGlobalScene', this._onSetOnHandler, payload);
  }

  /**
   * P2870: dispatch a standard ZCL On/Off command to the named handler (only when opted in).
   * Parsed frames go through zigbee-clusters' own dispatcher (args decoded); other shapes by name.
   * Never throws, so the remote always gets a SUCCESS default response.
   */
  async _dispatchStandardFrame(f, m, r, c) {
    if (!this._dispatchStandard) {return undefined;}
    try {
      if (f && f.frameControl && typeof super.handleFrame === 'function') {
        return await super.handleFrame(f, m, r);
      }
      const name = OnOffBoundCluster.STANDARD_COMMANDS[c];
      if (name && typeof this[name] === 'function') {this[name](undefined);}
    } catch (e) {
      if (this._device?.error) {this._device.error('[OnOffBound] standard cmd error:', e.message);}
    }
    return undefined;
  }

  // v5.9.11: Catch Tuya custom cmds (0xFC rotate, 0xFD scene)
  async handleFrame(f, m, r) {
    try {
      const c = f?.cmdId ?? f?.commandId;
      if (c === undefined) {return;}
      if (OnOffBoundCluster.STANDARD_COMMANDS[c]) {return this._dispatchStandardFrame(f, m, r, c);}
      if (c === 6) {return;}
      const d = f?.data || r;
      if (this._device?.log) this._device.log(`[OnOffBound] FRAME CAUGHT cmd=0x${c.toString(16)} data=${d?.toString?.('hex')||'none'}`);
      if (c === 0xFD && typeof this._onSetOnHandler === 'function') {
        const scene = (Buffer.isBuffer(d) || Array.isArray(d)) ? d[0] : d?.[0];
        this._safe('scene_0xFD', this._onSetOnHandler, { cmdId: c, scene, press: scene === 1 ? 'double' : scene === 2 ? 'long' : 'single', raw: d });
      } else if (c === 0xFC && typeof this._onToggleHandler === 'function') {
        this._safe('rotate_0xFC', this._onToggleHandler, { cmdId: c, direction: d?.[0], raw: d });
      }
    } catch (e) { if (this._device?.error) this._device.error('[OnOffBound] handleFrame error:', e.message); }
  }
}

// P2870: ZCL On/Off client->server command ids (ZCL spec 3.8.2.3) -> handler names
OnOffBoundCluster.STANDARD_COMMANDS = Object.freeze({
  0x00: 'setOff', 0x01: 'setOn', 0x02: 'toggle', 0x40: 'offWithEffect', 0x41: 'onWithRecallGlobalScene', 0x42: 'onWithTimedOff',
});

module.exports = OnOffBoundCluster;
