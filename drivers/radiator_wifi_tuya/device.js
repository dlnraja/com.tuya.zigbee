'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');

const Homey = require('homey');
const TuyAPI = require('tuyapi');

/**
 * RADIATOR WiFi TUYA - v6.0
 * Local WiFi control for (Tuya / Besterm) radiators
 * 
 * Features:
 * - Local WiFi communication (no cloud)
 * - Besterm compatibility
 * - Temperature control, scheduler, modes
 * - Real-time status updates
 * - Auto-reconnection
 */

class RadiatorWifiTuyaDevice extends Homey.Device {
  async onInit() {
    this.log('[RADIATOR-WIFI]  Initializing WiFi Tuya radiator...');
    
    // Device settings
    const settings = this.getSettings();
    this.deviceId = settings.device_id || this.getData().id;
    this.deviceKey = settings.device_key;
    this.deviceIp = settings.device_ip;
    
    if (!this.deviceId || !this.deviceKey) {
      this.error('[RADIATOR-WIFI] Missing device_id or device_key');
      await this.setUnavailable('Configuration incomplete');
      return;
    }

    // Initialize Tuya API
    this.tuya = new TuyAPI({
      id: this.deviceId,
      key: this.deviceKey,
      ip: this.deviceIp,
      version: settings.protocol_version || '3.3',
      issueGetOnConnect: true,
      issueRefreshOnConnect: true,
      nullPayloadOnJSONError: false
    });

    // Setup event handlers
    this.tuya.on('connected', () => {
      this.log('[RADIATOR-WIFI]  Connected to device');
      this.setAvailable().catch(() => {});
      });

    this.tuya.on('disconnected', () => {
      this.log('[RADIATOR-WIFI]  Disconnected from device');
      this.setUnavailable('Device disconnected').catch(() => {});
      this._scheduleReconnect();
      });

    this.tuya.on('error', (err) => {
      this.error('[RADIATOR-WIFI] Error:', err.message);
      });

    this.tuya.on('data', (data) => {
      this.log('[RADIATOR-WIFI]  Received data:', JSON.stringify(data));
      this._processData(data);
      });

    this.tuya.on('dp-refresh', (data) => {
      this.log('[RADIATOR-WIFI]  DP refresh:', JSON.stringify(data));
      this._processData(data);
      });

    // Connect to device
    try {
      await this.tuya.find();
      await this.tuya.connect();
      this.log('[RADIATOR-WIFI] Connected successfully');
    } catch (err) {
      this.error('[RADIATOR-WIFI] Connection failed:', err.message);
      this._scheduleReconnect();
    }

    // Register capability listeners
    this.registerCapabilityListener('target_temperature', this.onTargetTemperatureChange.bind(this));
    this.registerCapabilityListener('thermostat_mode', this.onModeChange.bind(this));
    this.registerCapabilityListener('onoff', this.onOnOffChange.bind(this));

    // Start heartbeat
    this._startHeartbeat();

    this.log('[RADIATOR-WIFI]  Initialized');
  }

  _processData(data) {
    if (!data || !data.dps) return;

    const dps = data.dps;

    // DP mapping for Besterm and common Tuya radiators
    // DP1: Power (true/false)
    if (typeof dps['1'] !== 'undefined') {
      this.setCapabilityValue('onoff', dps['1']).catch(() => {});
    }

    // DP2: Target temperature (in 0.5Â°C steps, multiply by 2)
    if (typeof dps['2'] !== 'undefined') {
      const temp = parseFloat(dps['2'] , 2);
      this.setCapabilityValue('target_temperature', temp).catch(() => {});
    }

    // DP3: Current temperature
    if (typeof dps['3'] !== 'undefined') {
      const temp = parseFloat(dps['3'] , 2);
      this.setCapabilityValue('measure_temperature', temp).catch(() => {});
    }

    // DP4: Mode (auto/manual/eco/boost)
    if (typeof dps['4'] !== 'undefined') {
      const modeMap = {
        '0': 'auto',
        '1': 'manual',
        '2': 'eco',
        '3': 'boost'
      };
      const mode = modeMap[String(dps['4'])] || 'manual';
      this.setCapabilityValue('thermostat_mode', mode).catch(() => {});
    }

    // DP5: Child lock
    if (typeof dps['5'] !== 'undefined') {
      if (this.hasCapability('child_lock')) {
        this.setCapabilityValue('child_lock', dps['5']).catch(() => {});
      }
    }

    // DP6: Window detection
    if (typeof dps['6'] !== 'undefined') {
      if (this.hasCapability('window_detection')) {
        this.setCapabilityValue('window_detection', dps['6']).catch(() => {});
      }
    }
  }

  async onTargetTemperatureChange(value) {
    this.log(`[RADIATOR-WIFI] Setting target temp: ${value}Â°C`);
    
    // Besterm uses 0.5Â°C steps, multiply by 2
    const dpValue =Math.round(value * 10);
    
    try {
      await this.tuya.set({ dps: 2, set: dpValue });
      return true;
    } catch (err) {
      this.error('[RADIATOR-WIFI] Failed to set target temp:', err.message);
      throw err;
    }
  }

  async onModeChange(mode) {
    this.log(`[RADIATOR-WIFI] Setting mode: ${mode}`);
    
    const modeMap = {
      'auto': 0,
      'manual': 1,
      'eco': 2,
      'boost': 3
    };
    
    const dpValue = modeMap[mode] !== undefined ? modeMap[mode] : 1;
    
    try {
      await this.tuya.set({ dps: 4, set: dpValue });
      return true;
    } catch (err) {
      this.error('[RADIATOR-WIFI] Failed to set mode:', err.message);
      throw err;
    }
  }

  async onOnOffChange(value) {
    this.log(`[RADIATOR-WIFI] Setting power: ${value}`);
    
    try {
      await this.tuya.set({ dps: 1, set: value });
      return true;
    } catch (err) {
      this.error('[RADIATOR-WIFI] Failed to set power:', err.message);
      throw err;
    }
  }

  _startHeartbeat() {
    this._heartbeatInterval = setInterval(async () => {
      if (!this.tuya.isConnected()) {
        this.log('[RADIATOR-WIFI] Heartbeat: Not connected, reconnecting...');
        this._scheduleReconnect();
      } else {
        try {
          await this.tuya.get({ schema: true });
        } catch (err) {
          this.log('[RADIATOR-WIFI] Heartbeat failed:', err.message);
        }
      }
    }, 60000); // Every 60 seconds
  }

  _scheduleReconnect() {
    if (this._reconnectTimeout) return;
    
    this._reconnectTimeout = setTimeout(async () => {
      this._reconnectTimeout = null;
      this.log('[RADIATOR-WIFI] Attempting reconnection...');
      
      try {
        await this.tuya.find();
        await this.tuya.connect();
        this.log('[RADIATOR-WIFI] Reconnected successfully');
      } catch (err) {
        this.error('[RADIATOR-WIFI] Reconnection failed:', err.message);
        this._scheduleReconnect();
      }
    }, 10000); // Retry after 10 seconds
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.includes('device_ip') || changedKeys.includes('device_key') || changedKeys.includes('protocol_version')) {
      this.log('[RADIATOR-WIFI] Settings changed, reconnecting...');
      
      if (this.tuya) {
        await this.tuya.disconnect();
      }
      
      await this.onInit();
    }
  }

  async onDeleted() {
    this.log('[RADIATOR-WIFI] Device deleted');
    
    if (this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval);
    }
    
    if (this._reconnectTimeout) {
      clearTimeout(this._reconnectTimeout);
    }
    
    if (this.tuya) {
      await this.tuya.disconnect();
    }
  }
}

module.exports = RadiatorWifiTuyaDevice;
