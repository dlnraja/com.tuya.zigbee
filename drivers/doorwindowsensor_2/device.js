'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {
const ZclBatteryMonitor = require('../../lib/battery/ZclBatteryMonitor');
const { setupDoorWindowSensor, handleDoorWindowSettings } = require('../../lib/devices/DoorWindowContactHelper');

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');

/**
 * Door/Window contact sensor with tamper (IAS zone).
 * v9.0.415 (P92.123): enrollment + initial read + invert via shared helper.
 */
class doorwindowsensor2 extends TuyaZigbeeDevice {

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode }).catch(() => {});
    ZclBatteryMonitor.attach(this, zclNode);
    this.printNode();
    await setupDoorWindowSensor(this, zclNode, { hasTamper: true });
  }

  async onSettings({ newSettings, changedKeys }) {
    handleDoorWindowSettings(this, changedKeys || Object.keys(newSettings || {}));
  }

  onDeleted() {
    super.onDeleted();
    this.log('Door/Window Sensor removed');
  }

}

module.exports = doorwindowsensor2;
return module.exports;
});
