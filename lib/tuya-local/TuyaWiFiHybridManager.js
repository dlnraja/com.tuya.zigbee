'use strict';

const EventEmitter = require('events');
const TuyaLocalClient = require('./TuyaLocalClient');
const TuyaCloudAPI = require('./TuyaCloudAPI');
const TuyaCloudMQTT = require('./TuyaCloudMQTT');
const TuyaSmartLifeAuth = require('./TuyaSmartLifeAuth');

/**
 * TuyaWiFiHybridManager v1.1.0 "The Mirror Mirror"
 * 
 * Implements "Local Direct First" + "Bidirectional Cloud Mirroring".
 * Features:
 * - Direct local control (LAN) with mDNS/IP discovery.
 * - Cloud State Shadowing: Mirrors local changes to the Tuya account.
 * - Real-time Cloud updates: Listens to MQTT for changes made in the Tuya App.
 */
class TuyaWiFiHybridManager extends EventEmitter {
  constructor(device) {
    super();
    this.device = device;
    this.homey = device.homey;
    this.log = device.log.bind(device);
    this.error = device.error.bind(device);

    this._localClient = null;
    this._cloudApi = null;
    this._cloudMqtt = null;
    this._cloudEnabled = false;
    this._isRefreshingKey = false;
    this._fallbackToCloud = false;
    this._dpToCodeMap = {};
  }

  async initialize() {
    this._initCloud();
    await this._initLocal();

    if (this._cloudEnabled) {
      this.syncMappings().catch(this.error);
      this._startCloudMirror();
    }
  }

  _initCloud() {
    const accessId = this.homey.settings.get('tuya_cloud_access_id');
    const accessSecret = this.homey.settings.get('tuya_cloud_access_secret');
    const region = this.homey.settings.get('tuya_cloud_region') || 'eu';

    if (accessId && accessSecret) {
      this._cloudApi = new TuyaCloudAPI({
        accessId,
        accessKey: accessSecret,
        region,
        log: this.device
      });
      this._cloudEnabled = true;
      this.log('[WiFi-Hybrid]  Cloud Shadowing active');

      // v7.0.22: Attach Cloud API to Pulsar singleton
      const TuyaShadowPulsar = require('./TuyaShadowPulsar');
      TuyaShadowPulsar.setCloudApi(this._cloudApi, (msg) => this.log(`[Pulsar] ${msg}`));
    }
  }

  /**
   * Starts the MQTT listener to receive updates from the Tuya App
   */
  async _startCloudMirror() {
    if (!this._cloudApi) return;
    try {
      this._cloudMqtt = new TuyaCloudMQTT({
        api: this._cloudApi,
        log: this.device
      });

      this._cloudMqtt.onMessage((data) => {
        // v7.0.22: Receive updates from Tuya Account (Mobile App)
        if (data && data.devId === this.device.getSettings().device_id) {
          const dps = data.status || data.dps;
          if (dps) {
            const normalizedDps = {};
            const TuyaShadowPulsar = require('./TuyaShadowPulsar');
            const localId = this.device.getSettings().device_id;

            dps.forEach(item => {
              const dp = Object.keys(this._dpToCodeMap).find(k => this._dpToCodeMap[k] === item.code) || item.code;

              //  THE ANTI-ECHO FILTER (entrance shield)
              if (TuyaShadowPulsar.isEcho(localId, dp, item.value)) {
                this.log(`[WiFi-Hybrid]  Cloud Echo Intercepted for DP ${dp} -> Discarding.`);
                return;
              }

              normalizedDps[dp] = item.value;
            });

            if (Object.keys(normalizedDps).length > 0) {
              this.log('[WiFi-Hybrid]  Sync FROM Cloud (Mobile App)');
              this.emit('dp-update', normalizedDps);
            }
          }
        }
      });

      await this._cloudMqtt.start();
    } catch (e) {
      this.error('[WiFi-Hybrid]  MQTT Mirror failed:', e.message);
    }
  }

  async _initLocal(forceNewKey = null) {
    const settings = this.device.getSettings();
    const deviceId = settings.device_id;
    const localKey = forceNewKey || settings.local_key;
    const ip = settings.ip_address;

    if (!deviceId || !localKey) {
      this.log('[WiFi-Hybrid]  Missing local credentials');
      if (this._cloudEnabled) await this.syncLocalKey();
      return;
    }

    if (this._localClient) {
      await this._localClient.destroy().catch(() => { });
    }

    this._localClient = new TuyaLocalClient({
      id: deviceId,
      key: localKey,
      ip: ip || null,
      version: settings.protocol_version || '3.3',
      autoDetectProtocol: settings.protocol_version === 'auto',
      autoHealing: true,
      homey: this.homey,
      log: this.log
    });

    this._localClient.on('connected', () => {
      this.log('[WiFi-Hybrid]  Connected LOCALLY');
      this._fallbackToCloud = false;
      this.emit('connected', 'local');
      });

    this._localClient.on('disconnected', () => {
      this.log('[WiFi-Hybrid]  Local disconnect. Mode: Fallback enabled.');
      this._fallbackToCloud = true;
      this.emit('disconnected', 'local');
      });

    this._localClient.on('dp-update', (dps) => {
      this.emit('dp-update', dps);
      });

    this._localClient.on('auth-error', async () => {
      this.log('[WiFi-Hybrid]  Local Auth Error! Triggering Autonomous Sync...');
      await this.syncLocalKey();
      });

    await this._localClient.connect().catch(e => {
      this.log(`[WiFi-Hybrid]  Local connect failed: ${e.message}`);
      this._fallbackToCloud = true;
    });
  }

  async syncLocalKey() {
    if (this._isRefreshingKey || !this._cloudEnabled) return;
    this._isRefreshingKey = true;

    try {
      this.log('[WiFi-Hybrid]  Syncing credentials from Tuya Account...');
      const auth = new TuyaSmartLifeAuth({
        region: this.homey.settings.get('tuya_cloud_region') || 'eu',
        log: this.device
      });

      const loginRes = await auth.loginWithApiKey(
        this.homey.settings.get('tuya_cloud_access_id'),
        this.homey.settings.get('tuya_cloud_access_secret')
      );

      if (!loginRes.success) throw new Error(loginRes.error || 'Cloud login failed');

      const devRes = await auth.getDevicesWithLocalKeys();
      if (!devRes.success) throw new Error(devRes.error || 'Failed to fetch device list');

      const devId = this.device.getSettings().device_id;
      const found = devRes.devices.find(d => d.id === devId);

      if (found && found.local_key) {
        this.log(`[WiFi-Hybrid]  Credentials updated for ${devId}`);
        await this.device.setSettings({
          local_key: found.local_key,
          ip_address: found.ip || this.device.getSettings().ip_address
        });
        await this._initLocal(found.local_key);
      }

      await this.syncMappings(auth);
    } catch (err) {
      this.error(`[WiFi-Hybrid]  Autonomous Sync failed: ${err.message}`);
    } finally {
      this._isRefreshingKey = false;
    }
  }

  /**
   * Sync DP mappings
   */
  async syncMappings(providedAuth = null) {
    try {
      const auth = providedAuth || new TuyaSmartLifeAuth({
        region: this.homey.settings.get('tuya_cloud_region') || 'eu',
        log: this.device
      });

      if (!providedAuth) {
        await auth.loginWithApiKey(
          this.homey.settings.get('tuya_cloud_access_id'),
          this.homey.settings.get('tuya_cloud_access_secret')
        );
      }

      const devId = this.device.getSettings().device_id;
      const model = await auth.getDeviceDataModel(devId);
      if (model && model.length) {
        model.forEach(m => {
          this._dpToCodeMap[m.id] = m.name;
        });
        this.log(`[WiFi-Hybrid]  Synced ${model.length} DP mappings`);
      }
    } catch (e) {
      this.log(`[WiFi-Hybrid]  Mapping sync failed: ${e.message}`);
    }
  }

  /**
   * Hybrid DP Sender with Mirroring
   */
  async setDP(dp, value) {
    const dpId = String(dp);
    let successLocally = false;

    // 1. Try Local First
    if (this._localClient && this._localClient.connected && !this._fallbackToCloud) {
      try {
        await this._localClient.setDP(parseInt(dpId, 10), value);
        successLocally = true;
      } catch (err) {
        this.log(`[WiFi-Hybrid]  Local command failed: ${err.message}`);
      }
    }

    // 2. Cloud Action (Mirror or Fallback)
    if (this._cloudEnabled && this._cloudApi) {
      const devId = this.device.getSettings().device_id;
      const code = this._dpToCodeMap[dpId] || dpId;

      if (!successLocally) {
        this.log(`[WiFi-Hybrid]  FALLBACK: Sending Code ${code}=${value} via Cloud`);
        const res = await this._cloudApi.sendCommand(devId, [{ code: code, value: value }]);
        if (!res.success) throw new Error(`Fallback failed: ${res.msg}`);
      } else {
        // MIRROR SYNC: Update Tuya Cloud so Mobile App stays in sync
        this.log(`[WiFi-Hybrid]  MIRROR: Updating Cloud state for ${code}`);
        this._cloudApi.sendCommand(devId, [{ code: code, value: value }]).catch(() => {
          // Ignore mirror errors (non-critical if local succeeded)
        });
      }
    } else if (!successLocally) {
      throw new Error('Device unreachable (Local failed, Cloud inactive)');
    }
  }

  async destroy() {
    if (this._localClient) await this._localClient.destroy();
    if (this._cloudMqtt) this._cloudMqtt.stop();
    this.removeAllListeners();
  }
}

module.exports = TuyaWiFiHybridManager;
