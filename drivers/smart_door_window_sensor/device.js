'use strict';
const ZclBatteryMonitor = require('../../lib/battery/ZclBatteryMonitor');
const { setupDoorWindowSensor, handleDoorWindowSettings } = require('../../lib/devices/DoorWindowContactHelper');

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * Smart Door/Window sensor (TY0203 family, IAS zone) with tamper.
 * v9.0.415 (P92.123): enrollment + initial read + invert via shared helper —
 * the device's own interview (kept below) showed zoneState "notEnrolled"
 * with CIE 00:00:00:00:00:00:00:00, the root cause of frozen contacts.
 */
class smart_door_window_sensor extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    ZclBatteryMonitor.attach(this, zclNode);
    this.printNode();

    if (this.isFirstInit()) {
      await this.configureAttributeReporting([
        {
          endpointId: 1,
          cluster: CLUSTER.IAS_ZONE,
          attributeName: 'zoneStatus',
          minInterval: 65535,
          maxInterval: 0,
          minChange: 0,
        }, {
          endpointId: 1,
          cluster: CLUSTER.POWER_CONFIGURATION,
          attributeName: 'batteryPercentageRemaining',
          minInterval: 60, // Minimum interval (1 minute)
          maxInterval: 21600, // Maximum interval (6 hours)
          minChange: 1, // Report changes greater than 1%
        }
      ]).catch((e) => this.log('reporting config failed (non-critical):', e.message));
    }

    // alarm_contact & alarm_tamper & alarm_battery (+ enrollment + invert)
    // Battery % via ZclBatteryMonitor.attach (UnifiedBatteryHandler) — no naive /2 path
    await setupDoorWindowSensor(this, zclNode, { hasTamper: true });
  }

  async onSettings({ newSettings, changedKeys }) {
    handleDoorWindowSettings(this, changedKeys || Object.keys(newSettings || {}));
  }

  onDeleted() {
    super.onDeleted();
    this.log('Smart Door/Window Sensor removed');
  }

}

module.exports = smart_door_window_sensor;
