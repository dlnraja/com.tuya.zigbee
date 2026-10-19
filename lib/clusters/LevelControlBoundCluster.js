'use strict';

const { BoundCluster } = require('zigbee-clusters');

/**
 * Level Control Bound Cluster - v5.8.96 FRAME DROP FIX
 * 
 * Used to receive dim/brightness commands from dimmer devices and remotes.
 * v5.8.96: Added try/catch to ALL handlers to prevent silent frame drops.
 */
class LevelControlBoundCluster extends BoundCluster {
  
  constructor({
    onStep,
    onStepWithOnOff,
    onMove,
    onMoveWithOnOff,
    onStop,
    onStopWithOnOff,
    onMoveToLevel,
    onMoveToLevelWithOnOff,
    dispatchStandard = false,
  } = {}) {
    super();
    this._onStepHandler = onStep;
    this._onStepWithOnOffHandler = onStepWithOnOff;
    this._onMoveHandler = onMove;
    this._onMoveWithOnOffHandler = onMoveWithOnOff;
    this._onStopHandler = onStop;
    this._onStopWithOnOffHandler = onStopWithOnOff;
    this._onMoveToLevelHandler = onMoveToLevel;
    this._onMoveToLevelWithOnOffHandler = onMoveToLevelWithOnOff;
    // WHY(P2870): opt-in, same reason as OnOffBoundCluster (raw L1 path already sees these on
    // TuyaZigbeeDevice buttons; dispatching by default would double-fire).
    this._dispatchStandard = dispatchStandard === true;
  }

  // v5.8.96: Safe callback wrapper - prevents frame drops from uncaught errors
  _safe(name, fn, payload) {
    try {
      if (typeof fn === 'function') {
        const res = fn(payload);
        // WHY(P2870): async handlers must not leave unhandled rejections
        if (res && typeof res.catch === 'function') {res.catch(() => {});}
      }
    } catch (err) {
      // Frame error handled silently
    }
  }

  step(payload) {
    this._safe('step', this._onStepHandler, {
      mode: LevelControlBoundCluster.direction(payload?.stepMode ?? payload?.mode),
      stepSize: payload?.stepSize || 10,
      transitionTime: payload?.transitionTime || 0,
    });
  }

  stepWithOnOff(payload) {
    this._safe('stepWithOnOff', this._onStepWithOnOffHandler, {
      mode: LevelControlBoundCluster.direction(payload?.stepMode ?? payload?.mode),
      stepSize: payload?.stepSize || 10,
      transitionTime: payload?.transitionTime || 0,
    });
  }

  move(payload) {
    this._safe('move', this._onMoveHandler, {
      moveMode: LevelControlBoundCluster.direction(payload?.moveMode),
      rate: payload?.rate || 50,
    });
  }

  moveWithOnOff(payload) {
    this._safe('moveWithOnOff', this._onMoveWithOnOffHandler, {
      moveMode: LevelControlBoundCluster.direction(payload?.moveMode),
      rate: payload?.rate || 50,
    });
  }

  stop(payload) {
    this._safe('stop', this._onStopHandler, payload);
  }

  stopWithOnOff(payload) {
    this._safe('stopWithOnOff', this._onStopWithOnOffHandler, payload);
  }

  moveToLevel(payload) {
    this._safe('moveToLevel', this._onMoveToLevelHandler, {
      level: payload?.level,
      transitionTime: payload?.transitionTime || 0,
    });
  }

  moveToLevelWithOnOff(payload) {
    this._safe('moveToLevelWithOnOff', this._onMoveToLevelWithOnOffHandler, {
      level: payload?.level,
      transitionTime: payload?.transitionTime || 0,
    });
  }

  /**
   * P2870: zigbee-clusters decodes step/move mode as 'up'/'down'; raw callers pass 0/1.
   * The old `=== 0` test read every decoded frame as 'down'.
   */
  static direction(v) {
    return v === 0 || v === 'up' ? 'up' : 'down';
  }

  /** P2870: dispatch a standard ZCL Level Control command (only when opted in). Never throws. */
  async _dispatchStandardFrame(f, m, r, c) {
    if (!this._dispatchStandard) {return undefined;}
    try {
      if (f && f.frameControl && typeof super.handleFrame === 'function') {
        return await super.handleFrame(f, m, r);
      }
      const name = LevelControlBoundCluster.STANDARD_COMMANDS[c];
      if (name && typeof this[name] === 'function') {this[name](f?.args || {});}
    } catch (e) {
      if (this._device?.error) {this._device.error('[LevelBound] standard cmd error:', e.message);}
    }
    return undefined;
  }

  // v5.9.11: Catch Tuya custom cmd 0xF0 (Tuya Level 0-1000)
  async handleFrame(f, m, r) {
    try {
      const c = f?.cmdId ?? f?.commandId;
      if (c === undefined) {return;}
      if (LevelControlBoundCluster.STANDARD_COMMANDS[c]) {return this._dispatchStandardFrame(f, m, r, c);}
      const d = f?.data || r;
      if (c === 0xF0 && typeof this._onMoveToLevelHandler === 'function') {
        const level = d?.length >= 2 ? d.readUInt16BE(0) : d?.[0] ?? 0;
        const transTime = d?.length >= 4 ? d.readUInt16BE(2) : 0;
        this._safe('tuyaLevel_0xF0', this._onMoveToLevelHandler, { level, transitionTime: transTime, tuyaLevel: true });
      }
    } catch (e) { /* Frame error handled silently */ }
  }
}

// P2870: ZCL Level Control client->server command ids (ZCL spec 3.10.2.3) -> handler names
LevelControlBoundCluster.STANDARD_COMMANDS = Object.freeze({
  0x00: 'moveToLevel', 0x01: 'move', 0x02: 'step', 0x03: 'stop',
  0x04: 'moveToLevelWithOnOff', 0x05: 'moveWithOnOff', 0x06: 'stepWithOnOff', 0x07: 'stopWithOnOff',
});

module.exports = LevelControlBoundCluster;
