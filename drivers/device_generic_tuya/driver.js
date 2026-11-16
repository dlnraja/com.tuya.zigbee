'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class DeviceGenericTuyaDriver extends ZigBeeDriver {
  // P3331: dormant host (lib/drivers/held-driver-folds.json): an exact hosted couple runs its held device class.
  onMapDeviceClass(device) {
    return require('../../lib/drivers/HeldDriverFolds').foldedDeviceClass('device_generic_tuya', device) || require('./device');
  }

}

module.exports = DeviceGenericTuyaDriver;
