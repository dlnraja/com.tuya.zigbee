'use strict';
const ZclBatteryMonitor = require('../../lib/battery/ZclBatteryMonitor');
const { setupDoorWindowSensor, handleDoorWindowSettings } = require('../../lib/devices/DoorWindowContactHelper');

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * Door/Window contact sensor (DS01 family, IAS zone).
 * v5.12.55 (P92.123): enrollment + initial read + invert via shared helper
 * (the sensor's own interview showed zoneState "notEnrolled" / CIE 00:00...
 * — the root cause of frozen contact states). Battery percentage handling
 * preserved.
 */
class doorwindowsensor_4 extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    ZclBatteryMonitor.attach(this, zclNode);
    this.printNode();

    if (this.isFirstInit()) {
      await this.configureAttributeReporting([
        {
          endpointId: 1,
          cluster: CLUSTER.POWER_CONFIGURATION,
          attributeName: 'batteryPercentageRemaining',
          minInterval: 60, // Minimum interval (1 minute)
          maxInterval: 21600, // Maximum interval (6 hours)
          minChange: 1, // Report changes greater than 1%
        }
      ]).catch((e) => this.log('battery reporting config failed (non-critical):', e.message));
    }

    // alarm_contact (+ alarm_battery from the zone battery bit)
    await setupDoorWindowSensor(this, zclNode, { hasTamper: false });

    // measure_battery // alarm_battery
    const powerCluster = zclNode.endpoints[1] && zclNode.endpoints[1].clusters
      && zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME];
    if (powerCluster && typeof powerCluster.on === 'function') {
      powerCluster.on('attr.batteryPercentageRemaining', this.handleBatteryPercentageReport.bind(this));
    }
  }

  handleBatteryPercentageReport(batteryPercentageRemaining) {
    const batteryThreshold = this.getSetting('batteryThreshold') || 20;
    this.log('DS01 measure_battery | powerConfiguration - batteryPercentageRemaining (%): ', batteryPercentageRemaining / 2);
    this.safeSetCapabilityValue('measure_battery', batteryPercentageRemaining / 2).catch(this.error);
    this.safeSetCapabilityValue('alarm_battery', batteryPercentageRemaining / 2 < batteryThreshold).catch(this.error);
  }

  async onSettings({ newSettings, changedKeys }) {
    handleDoorWindowSettings(this, changedKeys || Object.keys(newSettings || {}));
  }

  onDeleted() {
    super.onDeleted();
    this.log('Door/Window Sensor removed');
  }

}

module.exports = doorwindowsensor_4;
