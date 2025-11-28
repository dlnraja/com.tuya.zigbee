'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * Aqara Presence Sensor FP1/FP2 Device
 * Supports mmWave presence detection from Aqara/Lumi devices
 */
class AqaraPresenceFP1Device extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Aqara Presence Sensor FP1 initializing...');

    // Get device info
    const { manufacturerName, productId } = this.getData() || {};
    this.log(`Device: ${manufacturerName} / ${productId}`);

    // Initialize capabilities
    await this._initCapabilities(zclNode);

    // Setup cluster bindings
    await this._setupClusterBindings(zclNode);

    this.log('Aqara Presence Sensor FP1 initialized');
  }

  async _initCapabilities(zclNode) {
    // Presence/Motion detection via occupancySensing cluster
    if (zclNode.endpoints[1]?.clusters?.occupancySensing) {
      this.log('[AQARA] Setting up occupancy sensing...');

      zclNode.endpoints[1].clusters.occupancySensing.on('attr.occupancy', (value) => {
        const occupied = (value & 0x01) === 1;
        this.log(`[AQARA] Occupancy: ${occupied}`);
        this.setCapabilityValue('alarm_motion', occupied).catch(this.error);
      });

      // Read initial state
      try {
        const { occupancy } = await zclNode.endpoints[1].clusters.occupancySensing.readAttributes(['occupancy']);
        const occupied = (occupancy & 0x01) === 1;
        this.setCapabilityValue('alarm_motion', occupied).catch(this.error);
      } catch (e) {
        this.log('[AQARA] Could not read initial occupancy:', e.message);
      }
    }

    // Illuminance via illuminanceMeasurement cluster
    if (zclNode.endpoints[1]?.clusters?.illuminanceMeasurement) {
      this.log('[AQARA] Setting up illuminance measurement...');

      zclNode.endpoints[1].clusters.illuminanceMeasurement.on('attr.measuredValue', (value) => {
        // Convert from log scale: lux = 10^((value-1)/10000)
        const lux = value > 0 ? Math.pow(10, (value - 1) / 10000) : 0;
        this.log(`[AQARA] Illuminance: ${Math.round(lux)} lux`);
        this.setCapabilityValue('measure_luminance', Math.round(lux)).catch(this.error);
      });
    }

    // Battery via genPowerCfg cluster
    if (zclNode.endpoints[1]?.clusters?.genPowerCfg) {
      this.log('[AQARA] Setting up battery reporting...');

      zclNode.endpoints[1].clusters.genPowerCfg.on('attr.batteryPercentageRemaining', (value) => {
        const battery = Math.round(value / 2);
        this.log(`[AQARA] Battery: ${battery}%`);
        this.setCapabilityValue('measure_battery', battery).catch(this.error);
      });

      // Read initial battery
      try {
        const { batteryPercentageRemaining } = await zclNode.endpoints[1].clusters.genPowerCfg.readAttributes(['batteryPercentageRemaining']);
        if (batteryPercentageRemaining !== undefined) {
          this.setCapabilityValue('measure_battery', Math.round(batteryPercentageRemaining / 2)).catch(this.error);
        }
      } catch (e) {
        this.log('[AQARA] Could not read battery:', e.message);
      }
    }
  }

  async _setupClusterBindings(zclNode) {
    // Configure attribute reporting
    try {
      if (zclNode.endpoints[1]?.clusters?.occupancySensing) {
        await zclNode.endpoints[1].clusters.occupancySensing.configureReporting({
          occupancy: {
            minInterval: 0,
            maxInterval: 3600,
            minChange: 1
          }
        });
        this.log('[AQARA] Occupancy reporting configured');
      }
    } catch (e) {
      this.log('[AQARA] Reporting config failed:', e.message);
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('[AQARA] Settings changed:', changedKeys);

    // Handle sensitivity change
    if (changedKeys.includes('detection_sensitivity')) {
      this.log(`[AQARA] Sensitivity: ${newSettings.detection_sensitivity}`);
      // Aqara uses manufacturer-specific attributes for this
    }

    // Handle approach distance
    if (changedKeys.includes('approach_distance')) {
      this.log(`[AQARA] Approach distance: ${newSettings.approach_distance}`);
    }
  }

  onDeleted() {
    this.log('Aqara Presence Sensor deleted');
  }
}

module.exports = AqaraPresenceFP1Device;
