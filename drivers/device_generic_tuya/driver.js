'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class DeviceGenericTuyaDriver extends ZigBeeDriver {
  // P3264 fit-347: this published id is a dormant slot hosting held profiles
  // (config/architecture/hosted-profiles.json); exact couples get their own device class.
  onMapDeviceClass(device) {
    return require('../../lib/hosting/HostedProfiles').mapDeviceClass('device_generic_tuya', device, require('./device'), 'other');
  }


}

module.exports = DeviceGenericTuyaDriver;
