'use strict';
const ZclBatteryMonitor = require('../../lib/battery/ZclBatteryMonitor');
const { setupDoorWindowSensor, handleDoorWindowSettings } = require('../../lib/devices/DoorWindowContactHelper');

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');

/**
 * Door/Window contact sensor (IAS zone).
 * v9.0.415 (P92.123): enrollment + initial read + invert via shared helper.
 */
class doorwindowsensor_3 extends TuyaZigbeeDevice {

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode }).catch(() => {});
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

module.exports = doorwindowsensor_3;
