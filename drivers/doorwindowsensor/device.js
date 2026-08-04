'use strict';
const ZclBatteryMonitor = require('../../lib/battery/ZclBatteryMonitor');
const { setupDoorWindowSensor, handleDoorWindowSettings } = require('../../lib/devices/DoorWindowContactHelper');

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * Door/Window contact sensor (IAS zone).
 * v9.0.415 (P92.123): full IAS enrollment + initial read + invert setting
 * via DoorWindowContactHelper — the bare listener-only version left
 * devices un-enrolled (zoneState "notEnrolled"), so contact states never
 * changed (forum Peter_van_Werkhoven #2108/#2114/#2118).
 */
class doorwindowsensor extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    ZclBatteryMonitor.attach(this, zclNode);
    this.printNode();
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

module.exports = doorwindowsensor;
