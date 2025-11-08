'use strict';

const { BoundCluster } = require('zigbee-clusters');

/**
 * Level Control Bound Cluster
 * 
 * Used to receive dim/brightness commands from dimmer devices and remotes.
 * Supports step commands (single press dim up/down) and move commands (long press).
 * 
 * Common use cases:
 * - Dimmer switches (rotate/slide to dim)
 * - Remote controls (arrow buttons for brightness)
 * - Scene controllers (brightness presets)
 * 
 * Inspired by: IKEA Trådfri (dimmer remote, 5-button remote)
 * 
 * @see https://github.com/athombv/com.ikea.tradfri-example/blob/main/lib/LevelControlBoundCluster.js
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

  /**
   * Handle 'step' command (0x02)
   * Single press dim up/down
   * 
   * Payload:
   * - stepMode: 0 = up, 1 = down
   * - stepSize: Amount to change (default 1-10%)
   * - transitionTime: Time in 1/10s (default 0)
   */
  step(payload) {
    if (typeof this._onStepHandler === 'function') {
      const mode = payload.stepMode === 0 ? 'up' : 'down';
      this._onStepHandler({
        mode,
        stepSize: payload.stepSize || 10,
        transitionTime: payload.transitionTime || 0,
      });
    }
  }

  /**
   * Handle 'stepWithOnOff' command (0x06)
   * Same as step, but turns device on if off
   */
  stepWithOnOff(payload) {
    if (typeof this._onStepWithOnOffHandler === 'function') {
      const mode = payload.stepMode === 0 ? 'up' : 'down';
      this._onStepWithOnOffHandler({
        mode,
        stepSize: payload.stepSize || 10,
        transitionTime: payload.transitionTime || 0,
      });
    }
  }

  /**
   * Handle 'move' command (0x01)
   * Long press dim up/down (continuous)
   * 
   * Payload:
   * - moveMode: 0 = up, 1 = down
   * - rate: Speed of change (units/s)
   */
  move(payload) {
    if (typeof this._onMoveHandler === 'function') {
      const moveMode = payload.moveMode === 0 ? 'up' : 'down';
      this._onMoveHandler({
        moveMode,
        rate: payload.rate || 50,
      });
    }
  }

  /**
   * Handle 'moveWithOnOff' command (0x05)
   * Same as move, but turns device on if off
   */
  moveWithOnOff(payload) {
    if (typeof this._onMoveWithOnOffHandler === 'function') {
      const moveMode = payload.moveMode === 0 ? 'up' : 'down';
      this._onMoveWithOnOffHandler({
        moveMode,
        rate: payload.rate || 50,
      });
    }
  }

  /**
   * Handle 'stop' command (0x03)
   * Release long press (stop dimming)
   * 
   * Important: This is how we detect "long press release"
   * If move was called, then stop is called = long press complete
   */
  stop(payload) {
    if (typeof this._onStopHandler === 'function') {
      this._onStopHandler(payload);
    }
  }

  /**
   * Handle 'stopWithOnOff' command (0x07)
   * Same as stop
   */
  stopWithOnOff(payload) {
    if (typeof this._onStopWithOnOffHandler === 'function') {
      this._onStopWithOnOffHandler(payload);
    }
  }

  /**
   * Handle 'moveToLevel' command (0x00)
   * Jump to specific brightness level
   * 
   * Payload:
   * - level: Target level (0-254)
   * - transitionTime: Time in 1/10s
   */
  moveToLevel(payload) {
    if (typeof this._onMoveToLevelHandler === 'function') {
      this._onMoveToLevelHandler({
        level: payload.level,
        transitionTime: payload.transitionTime || 0,
      });
    }
  }

  /**
   * Handle 'moveToLevelWithOnOff' command (0x04)
   * Same as moveToLevel, but turns device on
   */
  moveToLevelWithOnOff(payload) {
    if (typeof this._onMoveToLevelWithOnOffHandler === 'function') {
      this._onMoveToLevelWithOnOffHandler({
        level: payload.level,
        transitionTime: payload.transitionTime || 0,
      });
    }
  }
}

module.exports = LevelControlBoundCluster;
