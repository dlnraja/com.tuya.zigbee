'use strict';

const Homey = require('homey');
const TuyaCloudAPI = require('./TuyaCloudAPI');

class TuyaLocalDriver extends Homey.Driver {

  async onInit() {
    this.log('[WIFI-DRV] TuyaLocalDriver initialized');
  }

  _getSavedCloudCredentials() {
    const id = this.homey.settings.get('tuya_cloud_access_id');
    const secret = this.homey.settings.get('tuya_cloud_access_secret');
    const region = this.homey.settings.get('tuya_cloud_region') || 'eu';
    if (id && secret) return { accessId: id, accessSecret: secret, region };
    return null;
  }

  _saveCloudCredentials(accessId, accessSecret, region) {
    this.homey.settings.set('tuya_cloud_access_id', accessId);
    this.homey.settings.set('tuya_cloud_access_secret', accessSecret);
    this.homey.settings.set('tuya_cloud_region', region || 'eu');
  }

  async onPair(session) {
    let cloudDevices = [];
    let pairData = {};
    let pairMode = 'manual';

    session.setHandler('getSavedCredentials', async () => {
      const creds = this._getSavedCloudCredentials();
      return creds ? { accessId: creds.accessId, region: creds.region, hasSaved: true } : { hasSaved: false };
    });

    session.setHandler('getUDPDevices', async () => {
      const app = this.homey.app;
      if (app && app._tuyaUDPDiscovery) return app._tuyaUDPDiscovery.devices;
      return [];
    });

    session.setHandler('login', async (data) => {
      pairMode = data.mode || 'manual';
      this.log('[WIFI-DRV] Login mode:', pairMode);

      if (pairMode === 'simple') {
        const creds = this._getSavedCloudCredentials();
        if (!creds) throw new Error('No saved IoT credentials. Save them in App Settings first, or use Smart Life Login tab.');
        if (!data.email || !data.password) throw new Error('Email and password are required');
        try {
          const api = new TuyaCloudAPI({ ...creds, log: this.log.bind(this) });
          await api.loginWithSmartLife(data.email, data.password, data.countryCode || '33', data.schema || 'smartlife');
          cloudDevices = await api.getDevices();
          this.log('[WIFI-DRV] Simple login: ' + cloudDevices.length + ' devices');
          return { success: true, count: cloudDevices.length };
        } catch (err) {
          this.log('[WIFI-DRV] Simple login failed:', err.message);
          throw new Error(err.message);
        }
      }

      if (pairMode === 'smartlife') {
        const accessId = data.accessId || '';
        const accessSecret = data.accessSecret || '';
        if (!accessId || !accessSecret) throw new Error('Access ID and Secret are required');
        if (!data.email || !data.password) throw new Error('Email and password are required');
        try {
          const api = new TuyaCloudAPI({ accessId, accessSecret, region: data.region || 'eu', log: this.log.bind(this) });
          await api.loginWithSmartLife(data.email, data.password, data.countryCode || '33', data.schema || 'smartlife');
          cloudDevices = await api.getDevices();
          this._saveCloudCredentials(accessId, accessSecret, data.region || 'eu');
          this.log('[WIFI-DRV] Smart Life: ' + cloudDevices.length + ' devices');
          return { success: true, count: cloudDevices.length };
        } catch (err) {
          this.log('[WIFI-DRV] Smart Life login failed:', err.message);
          throw new Error(err.message);
        }
      }

      if (pairMode === 'cloud') {
        const accessId = data.accessId || '';
        const accessSecret = data.accessSecret || '';
        if (!accessId || !accessSecret) throw new Error('Access ID and Secret are required');
        try {
          const api = new TuyaCloudAPI({ accessId, accessSecret, region: data.region || 'eu', log: this.log.bind(this) });
          cloudDevices = await api.getDevices();
          this._saveCloudCredentials(accessId, accessSecret, data.region || 'eu');
          this.log('[WIFI-DRV] IoT Platform: ' + cloudDevices.length + ' devices');
          return { success: true, count: cloudDevices.length };
        } catch (err) {
          this.log('[WIFI-DRV] IoT Platform failed:', err.message);
          throw new Error(err.message);
        }
      }

      return { success: true };
    });

    session.setHandler('configure', async (data) => {
      pairData = data;
      if (!data.device_id || !data.local_key) throw new Error('Device ID and Local Key are required');
      return { success: true };
    });

    session.setHandler('list_devices', async () => {
      if ((pairMode === 'smartlife' || pairMode === 'cloud') && cloudDevices.length > 0) {
        const udpMap = {};
        const app = this.homey.app;
        if (app && app._tuyaUDPDiscovery) {
          for (const d of app._tuyaUDPDiscovery.devices) udpMap[d.deviceId] = d;
        }
        return cloudDevices.filter((d) => !d.sub).map((d) => {
          const udp = udpMap[d.deviceId];
          return {
            name: d.name || ('Tuya ' + d.deviceId.substring(0, 8)),
            data: { id: d.deviceId },
            settings: {
              device_id: d.deviceId,
              local_key: d.localKey,
              ip: (udp && udp.ip) || d.ip || '',
              protocol_version: (udp && udp.version) || '3.3',
            },
          };
        });
      }

      if (pairData.device_id && pairData.local_key) {
        return [{
          name: pairData.name || ('Tuya WiFi ' + pairData.device_id.substring(0, 8)),
          data: { id: pairData.device_id },
          settings: {
            device_id: pairData.device_id,
            local_key: pairData.local_key,
            ip: pairData.ip || '',
            protocol_version: pairData.protocol_version || '3.3',
          },
        }];
      }
      return [];
    });
  }

  async onRepair(session, device) {
    session.setHandler('configure', async (data) => {
      const s = {};
      if (data.local_key) s.local_key = data.local_key;
      if (data.ip) s.ip = data.ip;
      if (data.protocol_version) s.protocol_version = data.protocol_version;
      await device.setSettings(s);
      return { success: true };
    });

    session.setHandler('refreshKey', async () => {
      const creds = this._getSavedCloudCredentials();
      if (!creds) throw new Error('No saved Cloud API credentials. Re-pair with Cloud mode first.');
      const api = new TuyaCloudAPI({ ...creds, log: this.log.bind(this) });
      const did = device.getSettings().device_id || device.getData().id;
      const newKey = await api.refreshLocalKey(did);
      await device.setSettings({ local_key: newKey });
      return { success: true, localKey: newKey };
    });
  }
}

module.exports = TuyaLocalDriver;
