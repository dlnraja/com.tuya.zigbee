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
}

module.exports = LevelControlBoundCluster;
