'use strict';
const ZclBatteryMonitor = require('../../lib/battery/ZclBatteryMonitor');
const { setupDoorWindowSensor, handleDoorWindowSettings } = require('../../lib/devices/DoorWindowContactHelper');

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * Door/Window contact sensor (DS01 family, IAS zone).
 * v9.0.415 (P92.123): enrollment + initial read + invert via shared helper
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
    // Battery % via ZclBatteryMonitor.attach (UnifiedBatteryHandler) — no naive /2 path
    await setupDoorWindowSensor(this, zclNode, { hasTamper: false });
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
