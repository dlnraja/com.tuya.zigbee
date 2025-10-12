'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * Wireless Dimmer Scroll Battery
 * 
 * UNBRANDED Architecture
 * Generated: 2025-10-12
 * Supports: IKEA
 */
class WirelessDimmerScrollBatteryDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('wireless_dimmer_scroll_battery initialized');
    this.log('Device:', this.getData());

    await super.onNodeInit({ zclNode });

    // Register capabilities
    await this.registerCapabilities();

    await this.setAvailable();
  }

  async registerCapabilities() {
    // measure_battery
    if (this.hasCapability('measure_battery')) {
      try {
        this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
      get: 'batteryPercentageRemaining',
      report: 'batteryPercentageRemaining',
      reportParser: value => Math.round(value / 2)
    });
        this.log('✅ measure_battery registered');
      } catch (err) {
        this.error('measure_battery failed:', err);
      }
    }
  }

  async onDeleted() {
    this.log('wireless_dimmer_scroll_battery deleted');
  }

}

module.exports = WirelessDimmerScrollBatteryDevice;
