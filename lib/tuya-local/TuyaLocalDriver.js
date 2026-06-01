'use strict';
// v5.12.8: TuyaLocalDriver - Enhanced driver with 3 pairing methods
// Method 1: SmartLife QR code scan (email+password, no IoT developer account)
// Method 2: Tuya IoT Platform API (apiKey+apiSecret, needs developer account)
// Method 3: Manual (user enters device_id + local_key + IP directly)
// Patterns from: tuya-local (HA), LocalTuya, TinyTuya, rebtor, heszegi
const Homey = require('homey');
const TuyaSmartLifeAuth = require('./TuyaSmartLifeAuth');
const TuyaDeviceDiscovery = require('./TuyaDeviceDiscovery');
const TuyaZigbeeBridge = require('./TuyaZigbeeBridge');
const QRCode = require('qrcode');
const TuyaCloudAPI = require('./TuyaCloudAPI');

class TuyaLocalDriver extends Homey.Driver {
  
  /** Safe app getter to prevent proxy crash */
  get safeApp() {
    try { if (!this.homey || this.homey.isDestroyed) return null; return this.homey.app; } catch(e) { return null; }
  }

  async onInit() {
    this.log('TuyaLocalDriver init');
    this._auth = null;
    this._discovery = null;
  }

  /**
   * Defensive override to prevent "could not get device by ID" crashes
   * especially during deserialization or pairing of sub-devices.
   */
  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`);
      return null;
    }
  }

  async onPair(session) {
    let pairMethod = 'manual';
    let discoveredDevices = [];

    // Handler to auto-fill saved IoT Platform credentials from global app settings
    session.setHandler('getSavedCredentials', async () => {
      const accessId = this.homey.settings.get('tuya_cloud_access_id');
      const accessSecret = this.homey.settings.get('tuya_cloud_access_secret');
      const region = this.homey.settings.get('tuya_cloud_region');
      return {
        hasSaved: !!(accessId && accessSecret),
        accessId: accessId || '',
        accessSecret: accessSecret || '',
        region: region || 'eu'
      };
    });

    // Handler: user selects pairing method
    session.setHandler('set_pair_method', async (method) => {
      pairMethod = method;
      this.log('Pairing method:', method);
      return true;
    });

    // ─── Method 1: SmartLife QR code login ───
    session.setHandler('smartlife_get_qr', async (data) => {
      const { region, schema } = data;
      this._auth = new TuyaSmartLifeAuth({ region, log: this });
      const result = await this._auth.getQRCode(null, schema || 'smartlife');
      return result;
    });

    session.setHandler('smartlife_poll_qr', async () => {
      if (!this._auth) {return { success: false, error: 'No auth session' };}
      const result = await this._auth.pollQRLogin(120000);
      return result;
    });

    session.setHandler('smartlife_get_devices', async () => {
      if (!this._auth) {return { success: false, error: 'Not authenticated' };}
      // Get cloud devices with local keys
      const cloudResult = await this._auth.getDevicesWithLocalKeys();
      if (!cloudResult.success) {return cloudResult;}
      // 🚀 Instant Discovery using Global UDP Cache
      let lanDevices = this.safeApp?._tuyaUDPDiscovery ? this.safeApp?._tuyaUDPDiscovery.devices : [];
      if (!lanDevices.length) {
        try {
          this._discovery = new TuyaDeviceDiscovery({ log: this, timeout: 6000 });
          lanDevices = await this._discovery.scan();
        } catch (err) {
          this.log('UDP discovery failed:', err.message);
        }
      }
      discoveredDevices = TuyaDeviceDiscovery.matchDevices(cloudResult.devices, lanDevices);
      return { success: true, devices: discoveredDevices };
    });

    // ─── Method 2: IoT Platform API ───
    session.setHandler('iot_login', async (data) => {
      const { accessId, accessSecret, region } = data;
      this._auth = new TuyaSmartLifeAuth({ region, log: this });
      const loginRes = await this._auth.loginWithApiKey(accessId, accessSecret);
      if (!loginRes.success) {throw new Error(loginRes.error);}
      const devRes = await this._auth.getDevicesWithLocalKeys();
      if (!devRes.success) {throw new Error(devRes.error);}
      let lanDevices = this.safeApp?._tuyaUDPDiscovery ? this.safeApp?._tuyaUDPDiscovery.devices : [];
      if (!lanDevices.length) {
        try {
          this._discovery = new TuyaDeviceDiscovery({ log: this, timeout: 6000 });
          lanDevices = await this._discovery.scan();
        } catch(e) {}
      }
      discoveredDevices = TuyaDeviceDiscovery.matchDevices(devRes.devices, lanDevices);
      return { count: discoveredDevices.length };
    });

    // ─── Method 3: Manual ───
    session.setHandler('manual_add', async (data) => {
      const { device_id, local_key, ip_address, name, protocol_version } = data;
      if (!device_id || !local_key) {throw new Error('Device ID and Local Key required');}
      return [{
        name: name || 'Tuya WiFi Device',
        data: { id: device_id },
        settings: {
          device_id, local_key,
          ip_address: ip_address || '',
          protocol_version: protocol_version || '3.3',
        },
      }];
    });

    // ─── Unified UI Login Handler (from configure.html) ───
    session.setHandler('login', async (data) => {
      try {
        if (data.mode === 'simple') {
          // Easy Login flow using email + password + saved global credentials
          const accessId = this.homey.settings.get('tuya_cloud_access_id');
          const accessSecret = this.homey.settings.get('tuya_cloud_access_secret');
          const region = this.homey.settings.get('tuya_cloud_region') || 'eu';

          if (!accessId || !accessSecret) {
            throw new Error('Please configure Tuya Access ID and Access Secret first in App Settings.');
          }

          // Step 1: Login to TuyaCloudAPI to get user UID
          const cloudApi = new TuyaCloudAPI({
            accessId,
            accessKey: accessSecret,
            region,
            log: this
          });

          const loginRes = await cloudApi.login(data.email, data.password);
          if (!loginRes.success) {
            throw new Error(loginRes.msg || 'Easy login failed. Check credentials/Region.');
          }

          const uid = loginRes.result && loginRes.result.uid;
          if (!uid) {
            throw new Error('Failed to retrieve user UID from login response.');
          }

          // Step 2: Authenticate and retrieve devices with local keys using TuyaSmartLifeAuth
          this._auth = new TuyaSmartLifeAuth({ region, log: this });
          const authRes = await this._auth.loginWithApiKey(accessId, accessSecret);
          if (!authRes.success) {
            throw new Error(authRes.error || 'API Login failed');
          }

          // Inject user UID to pull association list
          this._auth.tokenInfo.uid = uid;

          const devRes = await this._auth.getDevicesWithLocalKeys();
          if (!devRes.success) {
            throw new Error(devRes.error || 'Failed to fetch devices with local keys');
          }

          // Step 3: Match with LAN discovery
          let lanDevices = this.safeApp?._tuyaUDPDiscovery ? this.safeApp?._tuyaUDPDiscovery.devices : [];
          if (!lanDevices.length) {
            try {
              this._discovery = new TuyaDeviceDiscovery({ log: this, timeout: 6000 });
              lanDevices = await this._discovery.scan();
            } catch (e) {}
          }
          discoveredDevices = TuyaDeviceDiscovery.matchDevices(devRes.devices, lanDevices);

          return { count: discoveredDevices.length, devices: discoveredDevices };
        } else if (data.mode === 'cloud' || data.mode === 'smartlife') {
          this._auth = new TuyaSmartLifeAuth({ region: data.region, log: this });
          const loginRes = await this._auth.loginWithApiKey(data.accessId, data.accessSecret);
          if (!loginRes.success) {throw new Error(loginRes.error || 'API Login failed');}
          
          const devRes = await this._auth.getDevicesWithLocalKeys();
          if (!devRes.success) {throw new Error(devRes.error || 'Failed to fetch devices');}
          
          let lanDevices = this.safeApp?._tuyaUDPDiscovery ? this.safeApp?._tuyaUDPDiscovery.devices : [];
          if (!lanDevices.length) {
            try {
              this._discovery = new TuyaDeviceDiscovery({ log: this, timeout: 6000 });
              lanDevices = await this._discovery.scan();
            } catch(e) {}
          }
          discoveredDevices = TuyaDeviceDiscovery.matchDevices(devRes.devices, lanDevices);
          
          return { count: discoveredDevices.length, devices: discoveredDevices };
        } else if (data.mode === 'smartlife_qr') {
          this._auth = new TuyaSmartLifeAuth({ region: data.region, log: this });
          const schema = data.schema || 'smartlife';
          const qrRes = await this._auth.getQRCode(null, schema);
          if (!qrRes.success) {throw new Error(qrRes.error || 'Failed to fetch QR');}
          const qrUrl = `${schema}://qrLogin?token=${qrRes.qrCode}`;
          const localQrBase64 = await QRCode.toDataURL(qrUrl, { margin: 1, scale: 5 });
          return { qrCode: qrRes.qrCode, localQrImage: localQrBase64 };
        } else {
          throw new Error('Unsupported mode or missing credentials.');
        }
      } catch (err) {
        return { success: false, error: err.message };
      }
    });

    // ─── Poll QR ───
    session.setHandler('poll_qr', async (data) => {
      if (!this._auth) {return { success: false, error: 'No auth session' };}
      const pollRes = await this._auth.pollQRLogin(120000);
      if (!pollRes.success) {throw new Error(pollRes.error);}
      const devRes = await this._auth.getDevicesWithLocalKeys();
      if (!devRes.success) {throw new Error(devRes.error);}
      let lanDevices = this.safeApp?._tuyaUDPDiscovery ? this.safeApp?._tuyaUDPDiscovery.devices : [];
      if (!lanDevices.length) {
        try {
          this._discovery = new TuyaDeviceDiscovery({ log: this, timeout: 6000 });
          lanDevices = await this._discovery.scan();
        } catch(e) {}
      }
      discoveredDevices = TuyaDeviceDiscovery.matchDevices(devRes.devices, lanDevices);
      return { count: discoveredDevices.length, devices: discoveredDevices };
    });

    session.setHandler('configure', async (data) => {
      discoveredDevices = [{
        id: data.device_id,
        name: data.name || 'Tuya WiFi Device',
        local_key: data.local_key,
        ip: data.ip,
        version: data.protocol_version || '3.3'
      }];
      return true;
    });

    // ─── Standard list_devices handler ───
    session.setHandler('list_devices', async () => {
      if (!discoveredDevices.length) {return [];}
      return discoveredDevices
        .filter(d => d.local_key)
        .map(d => {
          let badge = '';
          const brand = d.brand || TuyaDeviceDiscovery.classifyBrand(d.productKey || d.product_id, d.category, d.name);
          const type = d.deviceType || TuyaDeviceDiscovery.classifyDeviceType(d.category, d.productKey || d.product_id, d.name);
          
          if (brand && type) {
            badge = `[${brand} - ${type}] `;
          } else if (brand) {
            badge = `[${brand}] `;
          } else if (type) {
            badge = `[${type}] `;
          }
          return {
            name: badge + (d.name || `Tuya ${  d.id.slice(-6)}`),
            data: { id: d.id },
            settings: {
              device_id: d.id,
              local_key: d.local_key,
              ip_address: d.ip || '',
              protocol_version: d.version || '3.3',
              zb_model_id: d.product_id || '',
              zb_manufacturer_name: d.product_name || d.name || '',
            },
          };
        });
    });


    session.setHandler('detect_gateways', async () => {
      if (!discoveredDevices.length) {return {success:false};}
      return {success:true, gateways: TuyaZigbeeBridge.identifyGateways(discoveredDevices)};
    });

    session.setHandler('get_sub_devices', async (data) => {
      const r = TuyaZigbeeBridge.identifySubDevices(discoveredDevices, data.gatewayId);
      if (!r.gateway) {return {success:false};}
      return {success:true, gateway:r.gateway, subDevices:r.subDevices};
    });
    // ─── LAN-only discovery (no cloud) ───
    session.setHandler('lan_discover', async () => {
      try {
        this._discovery = new TuyaDeviceDiscovery({ log: this, timeout: 10000 });
        let devices = await this._discovery.scan();
        // SMART ADAPTATION: Auto-classify purely local LAN devices using their internal productKey
        devices = devices.map(d => {
           const type = TuyaDeviceDiscovery.classifyDeviceType(null, d.productKey, null);
           const brand = TuyaDeviceDiscovery.classifyBrand(d.productKey, null, null);
           return { 
             ...d, 
             deviceType: type, 
             brand: brand, 
             name: d.name || `${brand !== 'Tuya / SmartLife' ? brand : 'Local'} ${type} (${d.id.slice(-6)})`
           };
        });
        return { success: true, devices };
      } catch (err) {
        return { success: false, error: err.message };
      }
    });
  }

  async onRepair(session, device) {
    session.setHandler('update_credentials', async (data) => {
      const settings = {};
      if (data.local_key) {settings.local_key = data.local_key;}
      if (data.ip_address) {settings.ip_address = data.ip_address;}
      if (data.protocol_version) {settings.protocol_version = data.protocol_version;}
      await device.setSettings(settings);
      return true;
    });

    // Refresh local key from cloud
    session.setHandler('refresh_key', async (data) => {
      const { region, accessId, accessKey } = data;
      const auth = new TuyaSmartLifeAuth({ region, log: this });
      const loginResult = await auth.loginWithApiKey(accessId, accessKey);
      if (!loginResult.success) {return loginResult;}
      const devResult = await auth.getDevicesWithLocalKeys();
      if (!devResult.success) {return devResult;}
      const devId = device.getSettings().device_id;
      const found = devResult.devices.find(d => d.id === devId);
      if (found && found.local_key) {
        const settings = { local_key: found.local_key };
        if (found.ip) {settings.ip_address = found.ip;}
        await device.setSettings(settings);
        return { success: true, local_key: found.local_key };
      }
      return { success: false, error: 'Device not found in cloud account' };
    });
  }
}

module.exports = TuyaLocalDriver;