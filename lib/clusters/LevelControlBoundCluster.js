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
  }

  // v5.8.96: Safe callback wrapper - prevents frame drops from uncaught errors
  _safe(name, fn, payload) {
    try {
      if (typeof fn === 'function') fn(payload);
    } catch (err) {
      console.error('[LevelControlBound] FRAME SAVED - error in', name, ':', err.message);
    }
  }

  step(payload) {
    this._safe('step', this._onStepHandler, {
      mode: payload?.stepMode === 0 ? 'up' : 'down',
      stepSize: payload?.stepSize || 10,
      transitionTime: payload?.transitionTime || 0,
    });
  }

  stepWithOnOff(payload) {
    this._safe('stepWithOnOff', this._onStepWithOnOffHandler, {
      mode: payload?.stepMode === 0 ? 'up' : 'down',
      stepSize: payload?.stepSize || 10,
      transitionTime: payload?.transitionTime || 0,
    });
  }

  move(payload) {
    this._safe('move', this._onMoveHandler, {
      moveMode: payload?.moveMode === 0 ? 'up' : 'down',
      rate: payload?.rate || 50,
    });
  }

  moveWithOnOff(payload) {
    this._safe('moveWithOnOff', this._onMoveWithOnOffHandler, {
      moveMode: payload?.moveMode === 0 ? 'up' : 'down',
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

  // v5.9.11: Catch Tuya custom cmd 0xF0 (Tuya Level 0-1000)
  async handleFrame(f, m, r) {
    try {
      const c = f?.cmdId ?? f?.commandId;
      if (c === undefined || [0,1,2,3,4,5,6,7].includes(c)) return;
      const d = f?.data || r;console.log(`[LevelBound] FRAME CAUGHT cmd=0x${c.toString(16)} data=${d?.toString?.('hex')||'none'}`);
      if (c === 0xF0 && typeof this._onMoveToLevelHandler === 'function') {
        const level = (d?.length >= 2) ? d.readUInt16BE(0) : (d?.[0] ?? 0);
        const transTime = (d?.length >= 4) ? d.readUInt16BE(2) : 0;
        this._safe('tuyaLevel_0xF0', this._onMoveToLevelHandler, { level, transitionTime: transTime, tuyaLevel: true });
      }
    } catch (e) { console.error('[LevelBound] handleFrame error:', e.message); }
  }
}

module.exports = LevelControlBoundCluster;


