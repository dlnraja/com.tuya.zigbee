'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * Sonoff Zigbee Switch Device
 * Supports ZBMINI, BASICZBR3, S26R2ZB, etc.
 */
class SonoffSwitchDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Sonoff Switch initializing...');

    // Mark as mains powered
    this._mainsPowered = true;

    // On/Off capability
    this.registerCapability('onoff', CLUSTER.ON_OFF, {
      getOpts: {
        getOnStart: true,
        pollInterval: 60000
      }
    });

    // Listen for on/off attribute changes
    if (zclNode.endpoints[1]?.clusters?.onOff) {
      zclNode.endpoints[1].clusters.onOff.on('attr.onOff', (value) => {
        this.log(`[SONOFF] On/Off: ${value}`);
        this.setCapabilityValue('onoff', value).catch(this.error);
      });
    }

    // Power measurement (if available)
    if (this.hasCapability('measure_power') && zclNode.endpoints[1]?.clusters?.haElectricalMeasurement) {
      zclNode.endpoints[1].clusters.haElectricalMeasurement.on('attr.activePower', (value) => {
        const power = value / 10;
        this.log(`[SONOFF] Power: ${power}W`);
        this.setCapabilityValue('measure_power', power).catch(this.error);
      });
    }

    // Energy metering (if available)
    if (this.hasCapability('meter_power') && zclNode.endpoints[1]?.clusters?.seMetering) {
      zclNode.endpoints[1].clusters.seMetering.on('attr.currentSummationDelivered', (value) => {
        const energy = value / 1000;
        this.log(`[SONOFF] Energy: ${energy}kWh`);
        this.setCapabilityValue('meter_power', energy).catch(this.error);
      });
    }

    this.log('Sonoff Switch initialized');
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.includes('power_on_behavior')) {
      this.log(`[SONOFF] Power-on behavior: ${newSettings.power_on_behavior}`);
      // Send to device via manufacturer-specific attribute
    }
  }
}

module.exports = SonoffSwitchDevice;
