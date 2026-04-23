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

class TuyaLocalDriver extends Homey.Driver {
  async onInit() {
    this.log('TuyaLocalDriver init');
    this._auth = null;
    this._discovery = null;
  }

  async onPair(session) {
    let pairMethod = 'manual';
    let discoveredDevices = [];

    // Handler: user selects pairing method
    session.setHandler('set_pair_method', async (method) => {
      pairMethod = method;
      this.log('Pairing method:', method);
      return true;
    });

    //  Method 1: SmartLife QR code login 
    session.setHandler('smartlife_get_qr', async (data) => {
      const { region } = data;
      this._auth = new TuyaSmartLifeAuth({ region, log: this });
      const result = await this._auth.getQRCode();
      return result;
    });

    session.setHandler('smartlife_poll_qr', async () => {
      if (!this._auth) return { success: false, error: 'No auth session' };
      const result = await this._auth.pollQRLogin(120000);
      return result;
    });

    session.setHandler('smartlife_get_devices', async () => {
      if (!this._auth) return { success: false, error: 'Not authenticated' };
      // Get cloud devices with local keys
      const cloudResult = await this._auth.getDevicesWithLocalKeys();
      if (!cloudResult.success) return cloudResult;
      // Run UDP discovery to find device IPs
      try {
        this._discovery = new TuyaDeviceDiscovery({ log: this, timeout: 8000 });
        const lanDevices = await this._discovery.scan();
        discoveredDevices = TuyaDeviceDiscovery.matchDevices(cloudResult.devices, lanDevices);
      } catch (err) {
        this.log('UDP discovery failed, using cloud IPs:', err.message);
        discoveredDevices = cloudResult.devices;
      }
      return { success: true, devices: discoveredDevices };
    });

    //  Method 2: IoT Platform API 
    session.setHandler('iot_login', async (data) => {
      const { accessId, accessKey, region, deviceId } = data;
      this._auth = new TuyaSmartLifeAuth({ region, log: this });
      const result = await this._auth.loginWithApiKey(accessId, accessKey, deviceId);
      if (!result.success) return result;
      // Get devices
      const cloudResult = await this._auth.getDevicesWithLocalKeys();
      if (!cloudResult.success) return cloudResult;
      // UDP discovery
      try {
        this._discovery = new TuyaDeviceDiscovery({ log: this, timeout: 8000 });
        const lanDevices = await this._discovery.scan();
        discoveredDevices = TuyaDeviceDiscovery.matchDevices(cloudResult.devices, lanDevices);
      } catch (err) {
        discoveredDevices = cloudResult.devices;
      }
      return { success: true, devices: discoveredDevices };
    });

    //  Method 3: Manual 
    session.setHandler('manual_add', async (data) => {
      const { device_id, local_key, ip_address, name, protocol_version } = data;
      if (!device_id || !local_key) throw new Error('Device ID and Local Key required');
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

    //  Unified UI Login Handler (from configure.html) 
    session.setHandler('login', async (data) => {
      try {
        if (data.mode === 'cloud' || data.mode === 'smartlife') {
          this._auth = new TuyaSmartLifeAuth({ region: data.region, log: this });
          const loginRes = await this._auth.loginWithApiKey(data.accessId, data.accessSecret);
          if (!loginRes.success) throw new Error(loginRes.error || 'API Login failed');
          
          const devRes = await this._auth.getDevicesWithLocalKeys();
          if (!devRes.success) throw new Error(devRes.error || 'Failed to fetch devices');
          
          try {
            const discovery = new TuyaDeviceDiscovery({ log: this, timeout: 6000 });
            const lanDevices = await discovery.scan();
            discoveredDevices = TuyaDeviceDiscovery.matchDevices(devRes.devices, lanDevices);
          } catch(e) { discoveredDevices = devRes.devices; }
          
          return { count: discoveredDevices.length, devices: discoveredDevices };

        } else if (data.mode === 'smartlife_qr' || data.mode === 'tuya_qr') {
          this.log(`[AUTH] Starting QR login for ${data.schema || 'smartlife'} in ${data.region || 'eu'}`);
          this._auth = new TuyaSmartLifeAuth({ region: data.region, log: this });
          this._auth.setSchema(data.schema);
          
          const qrRes = await this._auth.getQRCode();
          if (!qrRes.success) throw new Error(qrRes.error);

          const qrUrl = (data.schema || 'smartlife') + '://qrLogin?token=' + qrRes.qrCode;
          const localQrBase64 = await QRCode.toDataURL(qrUrl, { margin: 1, scale: 5 });
          
          return { qrCode: qrRes.qrCode, localQrImage: localQrBase64 };

        } else if (data.mode === 'simple') {
          this.log(`[AUTH] Starting Simple login for ${data.email}`);
          this._auth = new TuyaSmartLifeAuth({ region: data.region || 'eu', log: this });
          this._auth.setSchema(data.schema);
          
          const loginRes = await this._auth.loginWithEmailPassword(data.email, data.password, data.countryCode);
          if (!loginRes.success) throw new Error(loginRes.error || 'Simple login failed');
          
          const devRes = await this._auth.getDevicesWithLocalKeys();
          if (!devRes.success) throw new Error(devRes.error || 'Failed to fetch devices');
          
          try {
            const discovery = new TuyaDeviceDiscovery({ log: this, timeout: 6000 });
            const lanDevices = await discovery.scan();
            discoveredDevices = TuyaDeviceDiscovery.matchDevices(devRes.devices, lanDevices);
          } catch(e) { discoveredDevices = devRes.devices; }

          // v7.0.22: Persist session for background maintenance
          await this.homey.settings.set('tuya_cloud_token_info', {
              ...this._auth.tokenInfo,
              region: data.region || 'eu'
          });
          
          return { count: discoveredDevices.length, devices: discoveredDevices };
        } else {
          throw new Error('Unsupported pairing mode.');
        }
      } catch (err) {
        this.error('[PAIR] Error:', err.message);
        throw err;
      }
    });

    //  Poll QR 
    session.setHandler('poll_qr', async (data) => {
      if (!this._auth) return { success: false, error: 'No auth session' };
      const pollRes = await this._auth.pollQRLogin(120000);
      if (!pollRes.success) throw new Error(pollRes.error);
      const devRes = await this._auth.getDevicesWithLocalKeys();
      if (!devRes.success) throw new Error(devRes.error);
      try {
        this._discovery = new TuyaDeviceDiscovery({ log: this, timeout: 6000 });
        const lanDevices = await this._discovery.scan();
        discoveredDevices = TuyaDeviceDiscovery.matchDevices(devRes.devices, lanDevices);
      } catch(e) { discoveredDevices = devRes.devices; }
      return { count: discoveredDevices.length, devices: discoveredDevices };
    });

    session.setHandler('configure', async (data) => {
      // v7.0.22: Zero-Trust TCP Probe before adding
      if (data.device_id && data.local_key) {
        this.log(`[PAIR] Initiating Zero-Trust Probe for ${data.device_id} @ ${data.ip || 'broadcast'}`);
        try {
          const TuyaLocalClient = require('./TuyaLocalClient');
          const testClient = new TuyaLocalClient({
            id: data.device_id,
            key: data.local_key,
            ip: data.ip || null,
            version: data.protocol_version || '3.3',
            log: (msg) => this.log(`[PROBE] ${msg}`)
          });
          
          const probeSuccessful = await Promise.race([
             testClient.connect().then(() => {
                testClient.destroy();
                return true;
             }),
             new Promise((_, reject) => setTimeout(() => reject(new Error('Probe timeout')), 5000))
          ]).catch(e => {
             this.warn(`[PROBE]  Validation failed: ${e.message}`);
             return false;
          });

          if (!probeSuccessful && data.ip) {
              throw new Error('Device unreachable on IP ' + data.ip + '. Check Local Key and network connectivity.');
          }
        } catch (e) {
          this.error(`[PROBE] Critical error: ${e.message}`);
          throw e; // Pass to UI
        }
      }

      discoveredDevices = [{
        id: data.device_id,
        name: data.name || 'Tuya WiFi Device',
        local_key: data.local_key,
        ip: data.ip,
        version: data.protocol_version || '3.3'
      }];
      return true;
    });

    //  Standard list_devices handler 
    session.setHandler('list_devices', async () => {
      if (!discoveredDevices.length) return [];
      return discoveredDevices
        .filter(d => d.local_key)
        .map(d => ({
          name: d.name || 'Tuya ' + d.id.slice(-6),
          data: { id: d.id },
          settings: {
            device_id: d.id,
            local_key: d.local_key,
            ip_address: d.ip || '',
            protocol_version: d.version || '3.3',
            zb_model_id: d.product_id || '',
            zb_manufacturer_name: d.product_name || '',
          },
        }));
      });


    session.setHandler('detect_gateways', async () => {
      if (!discoveredDevices.length) return {success:false};
      return {success:true, gateways: TuyaZigbeeBridge.identifyGateways(discoveredDevices)};
    });

    session.setHandler('get_sub_devices', async (data) => {
      const r = TuyaZigbeeBridge.identifySubDevices(discoveredDevices, data.gatewayId);
      if (!r.gateway) return {success:false};
      return {success:true, gateway:r.gateway, subDevices:r.subDevices};
    });
    //  LAN-only discovery (no cloud) 
    session.setHandler('lan_discover', async () => {
      try {
        this._discovery = new TuyaDeviceDiscovery({ log: this, timeout: 10000 });
        const devices = await this._discovery.scan();
        return { success: true, devices };
      } catch (err) {
        return { success: false, error: err.message };
      }
    });
  }

  async onRepair(session, device) {
    session.setHandler('update_credentials', async (data) => {
      const settings = {};
      if (data.local_key) settings.local_key = data.local_key;
      if (data.ip_address) settings.ip_address = data.ip_address;
      if (data.protocol_version) settings.protocol_version = data.protocol_version;
      await device.setSettings(settings);
      return true;
    });

    // Refresh local key from cloud
    session.setHandler('refresh_key', async (data) => {
      const { region, accessId, accessKey } = data;
      const auth = new TuyaSmartLifeAuth({ region, log: this });
      const loginResult = await auth.loginWithApiKey(accessId, accessKey);
      if (!loginResult.success) return loginResult;
      const devResult = await auth.getDevicesWithLocalKeys();
      if (!devResult.success) return devResult;
      const devId = device.getSettings().device_id;
      const found = devResult.devices.find(d => d.id === devId);
      if (found && found.local_key) {
        const settings = { local_key: found.local_key };
        if (found.ip) settings.ip_address = found.ip;
        await device.setSettings(settings);
        return { success: true, local_key: found.local_key };
      }
      return { success: false, error: 'Device not found in cloud account' };
    });
  }
}

module.exports = TuyaLocalDriver;
