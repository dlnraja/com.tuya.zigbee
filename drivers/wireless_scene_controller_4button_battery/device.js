'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * Wireless Scene Controller 4-Button (Battery)
 * 
 * Category: Controllers
 * Priority: 4
 * 
 * Capabilities: measure_battery
 */
class WirelessSceneController4buttonBatteryDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('wireless_scene_controller_4button_battery initialized');
    this.log('Manufacturer:', this.getData().manufacturerName);
    this.log('Model:', this.getData().productId);

    // Call parent
    await super.onNodeInit({ zclNode });

    // Register capabilities
    await this.registerCapabilities();

    // Mark as available
    await this.setAvailable();
  }

  /**
   * Register all device capabilities
   */
  async registerCapabilities() {

    // measure_battery capability
    if (this.hasCapability('measure_battery')) {
      try {
        this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
          get: 'batteryPercentageRemaining',
          report: 'batteryPercentageRemaining',
          reportParser: value => value / 2
        });
        this.log('✅ measure_battery capability registered');
      } catch (err) {
        this.error('measure_battery capability failed:', err.message);
      }
    }
  }

  /**
   * Handle device deletion
   */
  async onDeleted() {
    this.log('wireless_scene_controller_4button_battery deleted');
  }

}

module.exports = WirelessSceneController4buttonBatteryDevice;
