'use strict';

const { OAuth2Driver } = require('homey-oauth2app');

class SmartThingsGenericDriver extends OAuth2Driver {
  onInit() {
    super.onInit();
    this.log('SmartThings Generic Driver Initialized (OAuth2)');
  }

  async onPairListDevices({ oAuth2Client }) {
    try {
      const devices = await oAuth2Client.getDevices();
      return devices.map(device => {
        return {
          name: device.label || device.name,
          data: {
            id: device.deviceId
          },
          store: {
            deviceId: device.deviceId
          }
        };
      });
    } catch (err) {
      this.error('Pairing error:', err);
      throw new Error(`Failed to list devices: ${err.message}`);
    }
  }
}

module.exports = SmartThingsGenericDriver;
