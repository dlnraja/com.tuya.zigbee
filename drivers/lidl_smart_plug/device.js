'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * Lidl/Silvercrest Smart Plug Device
 */
class LidlSmartPlugDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Lidl Smart Plug initializing...');
    this._mainsPowered = true;

    // On/Off capability
    this.registerCapability('onoff', CLUSTER.ON_OFF, {
      getOpts: { getOnStart: true, pollInterval: 60000 }
    });

    // Power measurement
    if (this.hasCapability('measure_power') && zclNode.endpoints[1]?.clusters?.haElectricalMeasurement) {
      this.registerCapability('measure_power', CLUSTER.ELECTRICAL_MEASUREMENT, {
        get: 'activePower',
        report: 'activePower',
        reportParser: value => value / 10
      });
    }

    // Energy metering
    if (this.hasCapability('meter_power') && zclNode.endpoints[1]?.clusters?.seMetering) {
      this.registerCapability('meter_power', CLUSTER.METERING, {
        get: 'currentSummationDelivered',
        report: 'currentSummationDelivered',
        reportParser: value => value / 1000
      });
    }

    this.log('Lidl Smart Plug initialized');
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.includes('power_on_behavior')) {
      this.log(`[LIDL] Power-on: ${newSettings.power_on_behavior}`);
    }
  }
}

module.exports = LidlSmartPlugDevice;
