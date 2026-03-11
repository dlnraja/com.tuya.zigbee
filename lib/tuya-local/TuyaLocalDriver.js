'use strict';
// v5.12.7: TuyaLocalDriver - Base driver for pairing Tuya WiFi local devices
// Supports manual pairing (user enters device_id + local_key + IP)
// Future: cloud-assisted discovery via Tuya Open API
const Homey = require('homey');

class TuyaLocalDriver extends Homey.Driver {
  async onInit() {
    this.log('TuyaLocalDriver init');
  }

  async onPair(session) {
    // Manual pairing: user provides device_id, local_key, and optionally IP
    session.setHandler('list_devices', async () => {
      // Return empty - user must manually add
      return [];
    });

    session.setHandler('manual_add', async (data) => {
      const { device_id, local_key, ip_address, name } = data;
      if (!device_id || !local_key) {
        throw new Error('Device ID and Local Key are required');
      }
      return [{
        name: name || 'Tuya WiFi Device',
        data: { id: device_id },
        settings: {
          device_id,
          local_key,
          ip_address: ip_address || '',
          protocol_version: '3.3',
        },
      }];
    });
  }

  async onRepair(session, device) {
    session.setHandler('update_credentials', async (data) => {
      const { local_key, ip_address } = data;
      const settings = {};
      if (local_key) settings.local_key = local_key;
      if (ip_address) settings.ip_address = ip_address;
      await device.setSettings(settings);
      return true;
    });
  }
}

module.exports = TuyaLocalDriver;
