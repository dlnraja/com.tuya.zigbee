'use strict';

const { BoundCluster } = require('zigbee-clusters');

/**
 * OnOff Bound Cluster
 * 
 * Used to receive ON/OFF commands from button devices and remotes.
 * Instead of polling or attribute reports, bound clusters allow devices
 * to send commands directly to Homey, which are caught by these handlers.
 * 
 * Benefits:
 * - Immediate response (no polling delay)
 * - Better battery life (no periodic polls)
 * - Reliable (commands, not reports)
 * 
 * Inspired by: IKEA Trådfri, Sonoff Zigbee apps
 * 
 * @see https://github.com/athombv/com.ikea.tradfri-example
 * @see https://github.com/StyraHem/Homey.Sonoff.Zigbee
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

  /**
   * Handle 'on' command (0x01)
   * Triggered when button pressed for "ON" action
   */
  on(payload) {
    console.log('[OnOffBoundCluster] ON command received');
    if (typeof this._onSetOnHandler === 'function') {
      this._onSetOnHandler(payload);
    }
  }

  // SDK3 alias: setOn
  setOn(payload) {
    console.log('[OnOffBoundCluster] setOn command received');
    if (typeof this._onSetOnHandler === 'function') {
      this._onSetOnHandler(payload);
    }
  }

  /**
   * Handle 'off' command (0x00)
   * Triggered when button pressed for "OFF" action
   */
  off(payload) {
    console.log('[OnOffBoundCluster] OFF command received');
    if (typeof this._onSetOffHandler === 'function') {
      this._onSetOffHandler(payload);
    }
  }

  // SDK3 alias: setOff
  setOff(payload) {
    console.log('[OnOffBoundCluster] setOff command received');
    if (typeof this._onSetOffHandler === 'function') {
      this._onSetOffHandler(payload);
    }
  }

  /**
   * Handle 'toggle' command (0x02)
   * Triggered when button pressed for "TOGGLE" action
   * Most common for simple buttons
   */
  toggle(payload) {
    console.log('[OnOffBoundCluster] TOGGLE command received');
    if (typeof this._onToggleHandler === 'function') {
      this._onToggleHandler(payload);
    }
  }

  // SDK3 alias: setToggle
  setToggle(payload) {
    console.log('[OnOffBoundCluster] setToggle command received');
    if (typeof this._onToggleHandler === 'function') {
      this._onToggleHandler(payload);
    }
  }

  /**
   * Handle 'onWithTimedOff' command (0x42)
   * Some buttons (e.g., Sonoff) use this instead of simple 'on'
   * 
   * Payload:
   * - onOffControl: uint8
   * - onTime: uint16 (1/10s)
   * - offWaitTime: uint16 (1/10s)
   */
  onWithTimedOff(payload) {
    if (typeof this._onWithTimedOffHandler === 'function') {
      this._onWithTimedOffHandler(payload);
    }
  }
}

module.exports = OnOffBoundCluster;
