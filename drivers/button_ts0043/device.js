'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const BatteryManagerV4 = require('../../lib/BatteryManagerV4');

/**
 * TS0043Device - 3-Button Wireless Switch
 *
 * v5.0.9 REFACTORED:
 * - Uses proper Zigbee command listeners
 * - Triggers remote_button_pressed flow card
 * - Battery via ZCL powerConfiguration
 * - Supports single/double/long press per button
 */
class TS0043Device extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('[TS0043] 🎛️  3-button wireless switch initializing...');

    // Store zclNode
    this.zclNode = zclNode;

    // v5.0.9: Battery Manager V4 (ZCL only - no Tuya DP)
    this.batteryManagerV4 = new BatteryManagerV4(this, 'CR2032', {
      useTuyaDP: false  // TS0043 uses standard ZCL, not Tuya DP
    });
    await this.batteryManagerV4.startMonitoring().catch(err => {
      this.log('[TS0043] ⚠️  Battery V4 init failed:', err.message);
    });

    // v5.0.9: Setup button listeners for all 3 endpoints
    for (let ep = 1; ep <= 3; ep++) {
      await this._setupButtonEndpoint(zclNode, ep);
    }

    this.log('[TS0043] ✅ 3-button wireless switch initialized');
    this.log('[TS0043]    Use flow card: "Remote button pressed"');
    this.log('[TS0043]    Actions: single, double, long press');
  }

  /**
   * Setup button listeners for a specific endpoint
   */
  async _setupButtonEndpoint(zclNode, endpointId) {
    const endpoint = zclNode.endpoints[endpointId];
    if (!endpoint) {
      this.log(`[TS0043] ℹ️  No endpoint ${endpointId}, skipping`);
      return;
    }

    const onOffCluster = endpoint.clusters.onOff;
    if (!onOffCluster) {
      this.log(`[TS0043] ℹ️  No onOff cluster on endpoint ${endpointId}`);
      return;
    }

    // Bind cluster (required for button commands)
    try {
      await onOffCluster.bind();
      this.log(`[TS0043] ✅ Bound onOff on endpoint ${endpointId}`);
    } catch (err) {
      this.log(`[TS0043] ⚠️  Bind failed on endpoint ${endpointId}:`, err.message);
    }

    // Listen for ZCL commands
    // TS0043 behavior: on=single, off=double, toggle=long press
    onOffCluster.on('command', (commandName, payload) => {
      this.log(`[TS0043] 📥 Button ${endpointId}: ${commandName}`);

      let scene = 'unknown';
      switch (commandName) {
        case 'on':
        case 'commandOn':
          scene = 'single';
          break;
        case 'off':
        case 'commandOff':
          scene = 'double';
          break;
        case 'toggle':
        case 'commandToggle':
          scene = 'long';
          break;
        default:
          this.log(`[TS0043] ℹ️  Unknown command: ${commandName}`);
          return;
      }

      this._triggerButtonFlow(endpointId, scene);
    });

    this.log(`[TS0043] 👂 Listening for button ${endpointId} commands`);
  }

  /**
   * Trigger the flow card
   */
  _triggerButtonFlow(button, scene) {
    this.log(`[TS0043] 🎯 Triggering: button=${button}, scene=${scene}`);

    const triggerCard = this.homey.flow.getDeviceTriggerCard('remote_button_pressed');
    if (!triggerCard) {
      this.error('[TS0043] ❌ Flow card "remote_button_pressed" not found!');
      return;
    }

    triggerCard
      .trigger(this, {}, { button: String(button), scene })
      .then(() => {
        this.log(`[TS0043] ✅ Flow triggered: button ${button}, ${scene}`);
      })
      .catch(err => {
        this.error('[TS0043] ❌ Flow trigger error:', err);
      });
  }
}

module.exports = TS0043Device;
