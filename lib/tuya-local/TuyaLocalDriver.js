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
const { createWiFiConnectionStore } = require('../wifi/WiFiConnectionPolicy');
const { normalizeRegion, normalizeAppSchema, listRegionsForUi } = require('./TuyaAuthCatalog');
const {
  collectLanDevices,
  matchCloudToLan,
  probeLocalCredentials,
  maxDiscover,
} = require('./TuyaPairingOrchestrator');
const { normalizeLocalKey } = require('./UdpDiscoveryKeys');

class TuyaLocalDriver extends Homey.Driver {
  
  /** Safe app getter to prevent proxy crash */
  get safeApp() {
    try { if (!this.homey || this.homey.isDestroyed) {return null;} return this.homey.app; } catch(e) { return null; }
  }

  async onInit() {
    this.log('TuyaLocalDriver init');
    this._auth = null;
    this._discovery = null;
  }

  // v9.0.40: Clean up auth and discovery on driver uninit
  async onUninit() {
    if (this._auth) {
      this._auth = null;
    }
    if (this._discovery) {
      if (typeof this._discovery.stop === 'function') {
        this._discovery.stop();
      }
      this._discovery = null;
    }
    this.log('TuyaLocalDriver uninit');
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

  _toLocalFirstPairDevice(device, pairingMode = 'ad_hoc') {
    const id = device.id || device.device_id;
    const localKey = normalizeLocalKey(device.local_key || device.localKey || device.key)
      || device.local_key || device.localKey || device.key;
    const ip = device.ip || device.ip_address || device.device_ip || '';
    const version = device.version || device.protocol_version || 'auto';
    const name = device.name || (id ? `Tuya ${String(id).slice(-6)}` : 'Tuya WiFi Device');

    let badge = '';
    if (device.brand && device.deviceType) {
      badge = `[${device.brand} - ${device.deviceType}] `;
    } else if (device.brand) {
      badge = `[${device.brand}] `;
    } else if (device.deviceType) {
      badge = `[${device.deviceType}] `;
    }

    return {
      name: badge + name,
      data: { id },
      store: createWiFiConnectionStore({
        pairingMode,
        transport: 'lan_tcp',
        localDiscovery: true,
        cloudFallback: false,
        cloudMirroring: false,
      }),
      settings: {
        device_id: id,
        local_key: localKey,
        ip_address: ip,
        protocol_version: version,
        product_id: device.product_id || '',
        category: device.category || '',
        zb_model_id: device.product_id || '',
        zb_manufacturer_name: device.product_name || device.name || '',
      },
    };
  }

  async _matchCloudAndLan(cloudDevices) {
    // P2411: max discovery every pair — UDP burst + TCP/6668 force + mDNS
    const lanDevices = await collectLanDevices(this, {
      timeoutMs: 12000,
      forceScan: true,
      forceTcpScan: true,
      max: true,
    });
    const devices = matchCloudToLan(cloudDevices, lanDevices);
    return {
      devices,
      lan_count: lanDevices.length,
      cloud_count: (cloudDevices || []).length,
      lan_stats: {
        udp: lanDevices.filter((d) => String(d.source || '').includes('udp')).length,
        tcp: lanDevices.filter((d) => String(d.source || '').includes('tcp')).length,
        mdns: lanDevices.filter((d) => String(d.source || '').includes('mdns')).length,
      },
    };
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
        region: normalizeRegion(region || 'eu'),
        regions: listRegionsForUi(),
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
      const { region, schema, autoRegion } = data || {};
      this._auth = new TuyaSmartLifeAuth({
        region: normalizeRegion(region || 'eu'),
        log: this,
        autoRegion: autoRegion !== false,
      });
      const result = await this._auth.getQRCodeWithRegionFallback(null, normalizeAppSchema(schema || 'smartlife'));
      return result;
    });

    session.setHandler('smartlife_poll_qr', async () => {
      if (!this._auth) { return { success: false, error: 'No auth session' }; }
      return this._auth.pollQRLogin(120000);
    });

    session.setHandler('smartlife_get_devices', async () => {
      pairMethod = 'cloud_key_lookup';
      if (!this._auth) { return { success: false, error: 'Not authenticated' }; }
      const cloudResult = await this._auth.getDevicesWithLocalKeys();
      if (!cloudResult.success) { return cloudResult; }
      const matched = await this._matchCloudAndLan(cloudResult.devices);
      discoveredDevices = matched.devices;
      return { success: true, ...matched };
    });

    // ─── Method 2: IoT Platform API ───
    session.setHandler('iot_login', async (data) => {
      pairMethod = 'cloud_key_lookup';
      const { accessId, accessSecret, region, autoRegion } = data;
      this._auth = new TuyaSmartLifeAuth({
        region: normalizeRegion(region || 'eu'),
        log: this,
        autoRegion: autoRegion !== false,
      });
      const loginRes = await this._auth.loginWithApiKey(accessId, accessSecret);
      if (!loginRes.success) { throw new Error(loginRes.error); }
      const devRes = await this._auth.getDevicesWithLocalKeys();
      if (!devRes.success) { throw new Error(devRes.error); }
      const matched = await this._matchCloudAndLan(devRes.devices);
      discoveredDevices = matched.devices;
      return { count: discoveredDevices.length, ...matched };
    });

    // ─── Method 3: Manual ───
    session.setHandler('manual_add', async (data) => {
      const { device_id, local_key, ip_address, name, protocol_version } = data;
      if (!device_id || !local_key) { throw new Error('Device ID and Local Key required'); }
      pairMethod = 'ad_hoc';

      const probeResult = await probeLocalCredentials({
        id: device_id,
        key: local_key,
        ip: ip_address || undefined,
        version: protocol_version || 'auto',
        ipHints: await this._recentLanIps(),
      }, (...a) => this.log(...a));
      if (!probeResult.ok) {
        throw new Error(`Cannot reach device with these credentials: ${probeResult.reason}. Check the local_key (it changes on every re-pair) and the IP. Tried protocols 3.1–3.5.`);
      }

      return [this._toLocalFirstPairDevice({
        id: device_id,
        local_key,
        ip: ip_address || probeResult.ip || '',
        name: name || 'Tuya WiFi Device',
        version: probeResult.version || protocol_version || 'auto',
      }, 'ad_hoc')];
    });

    // ─── Unified UI Login Handler (from configure.html) ───
    session.setHandler('login', async (data) => {
      try {
        if (data.mode === 'simple') {
          pairMethod = 'cloud_key_lookup';
          const accessId = this.homey.settings.get('tuya_cloud_access_id');
          const accessSecret = this.homey.settings.get('tuya_cloud_access_secret');
          const region = normalizeRegion(data.region || this.homey.settings.get('tuya_cloud_region') || 'eu');

          if (!accessId || !accessSecret) {
            throw new Error('Please configure Tuya Access ID and Access Secret first in App Settings.');
          }

          const cloudApi = new TuyaCloudAPI({
            accessId,
            accessKey: accessSecret,
            region,
            log: this,
          });

          const loginRes = await cloudApi.login(data.email, data.password);
          if (!loginRes.success) {
            throw new Error(loginRes.msg || 'Easy login failed. Check credentials/Region.');
          }

          const uid = loginRes.result && loginRes.result.uid;
          if (!uid) {
            throw new Error('Failed to retrieve user UID from login response.');
          }

          this._auth = new TuyaSmartLifeAuth({ region, log: this, autoRegion: true });
          const authRes = await this._auth.loginWithApiKey(accessId, accessSecret);
          if (!authRes.success) {
            throw new Error(authRes.error || 'API Login failed');
          }

          this._auth.tokenInfo.uid = uid;

          const devRes = await this._auth.getDevicesWithLocalKeys();
          if (!devRes.success) {
            throw new Error(devRes.error || 'Failed to fetch devices with local keys');
          }

          const matched = await this._matchCloudAndLan(devRes.devices);
          discoveredDevices = matched.devices;
          return { count: discoveredDevices.length, ...matched };
        } else if (data.mode === 'cloud' || data.mode === 'smartlife') {
          pairMethod = 'cloud_key_lookup';
          this._auth = new TuyaSmartLifeAuth({
            region: normalizeRegion(data.region || 'eu'),
            log: this,
            autoRegion: data.autoRegion !== false,
          });
          const loginRes = await this._auth.loginWithApiKey(data.accessId, data.accessSecret);
          if (!loginRes.success) { throw new Error(loginRes.error || 'API Login failed'); }

          const devRes = await this._auth.getDevicesWithLocalKeys();
          if (!devRes.success) { throw new Error(devRes.error || 'Failed to fetch devices'); }

          const matched = await this._matchCloudAndLan(devRes.devices);
          discoveredDevices = matched.devices;
          return { count: discoveredDevices.length, ...matched };
        } else if (data.mode === 'smartlife_qr') {
          pairMethod = 'cloud_key_lookup';
          this._auth = new TuyaSmartLifeAuth({
            region: normalizeRegion(data.region || 'eu'),
            log: this,
            autoRegion: data.autoRegion !== false,
          });
          const schema = normalizeAppSchema(data.schema || 'smartlife');
          const qrRes = await this._auth.getQRCodeWithRegionFallback(null, schema);
          if (!qrRes.success) { throw new Error(qrRes.error || 'Failed to fetch QR'); }
          const usedSchema = qrRes.schema || schema;
          const qrUrl = `${usedSchema}://qrLogin?token=${qrRes.qrCode}`;
          const localQrBase64 = await QRCode.toDataURL(qrUrl, { margin: 1, scale: 5 });
          return {
            qrCode: qrRes.qrCode,
            localQrImage: localQrBase64,
            schema: usedSchema,
            region: qrRes.region || this._auth.region,
          };
        }
        throw new Error('Unsupported mode or missing credentials.');
      } catch (err) {
        return { success: false, error: err.message };
      }
    });

    // ─── Poll QR ───
    session.setHandler('poll_qr', async () => {
      pairMethod = 'cloud_key_lookup';
      if (!this._auth) { return { success: false, error: 'No auth session' }; }
      const pollRes = await this._auth.pollQRLogin(120000);
      if (!pollRes.success) { throw new Error(pollRes.error); }
      const devRes = await this._auth.getDevicesWithLocalKeys();
      if (!devRes.success) { throw new Error(devRes.error); }
      const matched = await this._matchCloudAndLan(devRes.devices);
      discoveredDevices = matched.devices;
      return { count: discoveredDevices.length, ...matched };
    });

    session.setHandler('configure', async (data) => {
      pairMethod = 'ad_hoc';
      const probe = await probeLocalCredentials({
        id: data.device_id,
        key: data.local_key,
        ip: data.ip || undefined,
        version: data.protocol_version || 'auto',
        ipHints: await this._recentLanIps(),
      }, (...a) => this.log(...a));
      if (!probe.ok) {
        throw new Error(`LAN probe failed: ${probe.reason}`);
      }
      discoveredDevices = [{
        id: data.device_id,
        name: data.name || 'Tuya WiFi Device',
        local_key: data.local_key,
        ip: data.ip || probe.ip || '',
        version: probe.version || data.protocol_version || 'auto',
        pairingMode: 'ad_hoc',
      }];
      return true;
    });

    // ─── Standard list_devices handler ───
    session.setHandler('list_devices', async () => {
      if (!discoveredDevices.length) { return []; }
      return discoveredDevices
        .filter((d) => d.local_key)
        .map((d) => this._toLocalFirstPairDevice(d, d.pairingMode || pairMethod || 'ad_hoc'));
    });

    // ─── v9.0.406: ONE-CLICK AUTO-PAIR ───
    // Full chain with ZERO user input when IoT credentials are saved in App
    // Settings: API login → devices+local keys → LAN match → ready to create.
    // The configure.html "⚡ Appairage automatique" button calls this once.
    session.setHandler('one_click_auto_pair', async () => {
      try {
        const accessId = this.homey.settings.get('tuya_cloud_access_id');
        const accessSecret = this.homey.settings.get('tuya_cloud_access_secret');
        const region = normalizeRegion(this.homey.settings.get('tuya_cloud_region') || 'eu');
        if (!accessId || !accessSecret) {
          return {
            success: false,
            error: 'missing_credentials',
            message: 'No IoT credentials saved. Use Smart Life QR (one scan) or save Access ID/Secret in App Settings once.',
          };
        }

        pairMethod = 'cloud_key_lookup';
        this._auth = new TuyaSmartLifeAuth({ region, log: this, autoRegion: true });
        const loginRes = await this._auth.loginWithApiKey(accessId, accessSecret);
        if (!loginRes.success) { throw new Error(loginRes.error || 'API login failed'); }
        const devRes = await this._auth.getDevicesWithLocalKeys();
        if (!devRes.success) { throw new Error(devRes.error || 'Failed to fetch devices with local keys'); }

        const matched = await this._matchCloudAndLan(devRes.devices);
        discoveredDevices = matched.devices;
        const pairable = discoveredDevices.filter((d) => d.local_key);
        this.log(`[TuyaLocal] one-click auto-pair: ${pairable.length} device(s) ready (cloud: ${matched.cloud_count}, LAN: ${matched.lan_count})`);
        return {
          success: true,
          count: pairable.length,
          cloud_count: matched.cloud_count,
          lan_count: matched.lan_count,
          devices: pairable,
          region: this._auth.region,
        };
      } catch (err) {
        return { success: false, error: err.message };
      }
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
    // ─── LAN max discovery (UDP + TCP/6668 + mDNS) ───
    session.setHandler('lan_discover', async () => {
      try {
        return await maxDiscover(this, { timeoutMs: 12000 });
      } catch (err) {
        return { success: false, error: err.message };
      }
    });

    session.setHandler('max_discover', async () => {
      try {
        return await maxDiscover(this, { timeoutMs: 14000, forceTcpScan: true });
      } catch (err) {
        return { success: false, error: err.message };
      }
    });
  }

  /** Recent advertising IPs for manual probe hints */
  async _recentLanIps() {
    try {
      const lan = await collectLanDevices(this, {
        timeoutMs: 4000,
        forceScan: false,
        forceTcpScan: false,
        max: false,
      });
      return lan.map((d) => d.ip).filter(Boolean);
    } catch (_e) {
      return [];
    }
  }

  // Homey discovery strategy (tuya_wifi / _tuya._tcp) — accept any result with id
  onDiscoveryResult(discoveryResult) {
    return !!(discoveryResult && (discoveryResult.id || discoveryResult.address));
  }

  async onDiscoveryAvailable(discoveryResult) {
    this.log('[DISC-MDNS] Advertising:', discoveryResult?.id, discoveryResult?.address);
  }

  onDiscoveryAddressChanged(discoveryResult) {
    this.log('[DISC-MDNS] IP changed:', discoveryResult?.id, discoveryResult?.address);
  }

  onDiscoveryLastSeenChanged(_discoveryResult) {}

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

  /**
   * v10.10.0 (L99): TCP probe — verify device_id + local_key actually open
   * a Tuya local connection before the device is created. 8000ms hard timeout (8s).
   * @param {{id:string, key:string, ip?:string, version:string}} cfg
   * @returns {Promise<{ok:boolean, reason?:string, ip?:string}>}
   */
  async _probeLocalKey(cfg) {
    return probeLocalCredentials(cfg, (...a) => this.log(...a));
  }
}

module.exports = TuyaLocalDriver;
