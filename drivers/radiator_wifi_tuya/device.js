'use strict';

const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');
const TuyaLocalClient = require('../../lib/tuya-local/TuyaLocalClient');

/**
 * RADIATOR WiFi TUYA - v6.1
 * Local WiFi control for Tuya/Besterm radiators via queue-safe TuyaLocalDevice base class.
 */
class RadiatorWifiTuyaDevice extends TuyaLocalDevice {

  // Dynamic bidirectional DP-to-capability mappings
  get capabilityMap() {
    return [
      {
        capability: 'onoff',
        dp: 1
      },
      {
        capability: 'target_temperature',
        dp: 2,
        toDevice: (v) => Math.round(v * 2),
        fromDevice: (v) => parseFloat(v) / 2
      },
      {
        capability: 'measure_temperature',
        dp: 3,
        fromDevice: (v) => parseFloat(v) / 2
      },
      {
        capability: 'thermostat_mode',
        dp: 4,
        toDevice: (v) => {
          const modeMap = { 'auto': 0, 'manual': 1, 'eco': 2, 'boost': 3 };
          return modeMap[v] !== undefined ? modeMap[v] : 1;
        },
        fromDevice: (v) => {
          const modeMap = { '0': 'auto', '1': 'manual', '2': 'eco', '3': 'boost' };
          return modeMap[String(v)] || 'manual';
        }
      },
      {
        capability: 'child_lock',
        dp: 5
      },
      {
        capability: 'window_detection',
        dp: 6
      }
    ];
  }

  // Override to handle non-standard settings keys for this specific driver
  async _createDevice() {
    const settings = this.getSettings();
    const deviceId = settings.device_id || this.getData()?.id;
    const deviceKey = settings.device_key;
    const deviceIp = settings.device_ip;
    
    if (!deviceId || !deviceKey) {
      this.log('Missing device_id or device_key');
      await this.setUnavailable('Missing device credentials.');
      return;
    }

    try {
      const version = settings.protocol_version || this.protocolVersion;
      this._client = new TuyaLocalClient({
        id: deviceId,
        key: deviceKey,
        ip: deviceIp || undefined,
        version: version === 'auto' ? '3.3' : version,
        autoDetectProtocol: version === 'auto',
        log: (...args) => this.log('[TUYA-TCP]', ...args),
      });

      this._client.on('connected', () => this._onConnected());
      this._client.on('disconnected', () => this._onDisconnected());
      this._client.on('error', (err) => this._onError(err));
      this._client.on('dp-update', (dps) => this._onData({ dps }));
      this._client.on('auth-error', (err) => {
        this.setWarning('Authentication failed: Local key might have changed. Re-fetch from cloud.');
      });

      await this._client.connect();
    } catch (err) {
      this.error('TuyaLocalClient create failed:', err.message);
      await this.setUnavailable('Client: ' + err.message);
    }
  }

  // Handle settings updates gracefully
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.some(k => ['device_id', 'device_key', 'device_ip', 'protocol_version'].includes(k))) {
      this._destroyDevice();
      await this._createDevice();
    }
  }
}

module.exports = RadiatorWifiTuyaDevice;
