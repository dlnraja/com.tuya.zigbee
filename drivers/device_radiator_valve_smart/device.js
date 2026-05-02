'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');

const UnifiedThermostatBase = require('../../lib/devices/UnifiedThermostatBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const setupSonoffTRVZB = require('../../lib/mixins/SonoffTRVZBMixin');

class RadiatorValveDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedThermostatBase)) {

  get mainsPowered() { return false; }

  get dpProfile() {
    const mfr = this.getSetting('zb_manufacturer_name') || this.getStoreValue('manufacturerName') || '';
    const me167Ids = [
      '_TZE284_o3x45p96', '_tze284_o3x45p96',
      '_TZE284_p3dbf6qs', '_tze284_p3dbf6qs',
      '_TZE200_p3dbf6qs', '_tze200_p3dbf6qs',
      '_TZE284_rv6iuyxb', '_tze284_rv6iuyxb',
      '_TZE284_c6wv4xyo', '_tze284_c6wv4xyo',
      '_TZE284_hvaxb2tc', '_tze284_hvaxb2tc',
      '_TZE204_o3x45p96', '_tze204_o3x45p96'
    ];
    return me167Ids.some(id => mfr.toLowerCase().includes(id.toLowerCase())) ? 'me167' : 'standard';
  }

  get dpMappings() {
    if (this.dpProfile === 'me167') {
      return {
        2: { capability: 'thermostat_mode', transform: (v) => ({ 0: 'auto', 1: 'heat', 2: 'off' }[v] ?? 'heat') },
        3: { internal: true, type: 'running_state', transform: (v) => v === 0 ? 'heat' : 'idle' },
        4: { capability: 'target_temperature', divisor: 10 },
        5: { capability: 'measure_temperature', divisor: 10 },
        7: { internal: true, type: 'child_lock', writable: true },
        35: { capability: 'alarm_battery', transform: (v) => v === 1 },
        36: { internal: true, type: 'frost_protection', writable: true },
        39: { internal: true, type: 'anti_scaling', writable: true },
        47: { internal: true, type: 'temp_calibration', writable: true }
      };
    }
    return {
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true || v === 'on' },
      2: { capability: 'thermostat_mode', transform: (v) => ({ 0: 'heat', 1: 'auto', 2: 'off' }[v] ?? 'heat') },
      3: { capability: 'target_temperature', divisor: 10 },
      4: { capability: 'measure_temperature', divisor: 10 },
      7: { internal: true, type: 'child_lock', writable: true },
      8: { internal: true, type: 'frost_protection', writable: true },
      9: { internal: true, type: 'eco_temp', divisor: 10, writable: true },
      10: { internal: true, type: 'comfort_temp', divisor: 10, writable: true },
      13: { capability: 'measure_battery', divisor: 1 },
      14: { internal: true, type: 'battery_low', transform: (v) => v === 1 || v === true },
      15: { capability: 'measure_battery', divisor: 1 },
      101: { capability: 'alarm_contact', transform: (v) => v === 1 || v === true },
      102: { capability: 'dim', divisor: 100 },
      103: { internal: true, type: 'boost_mode', writable: true },
      104: { internal: true, type: 'temp_offset', divisor: 10, writable: true },
      105: { internal: true, type: 'min_temp', divisor: 10, writable: true },
      106: { internal: true, type: 'max_temp', divisor: 10, writable: true },
      107: { internal: true, type: 'away_mode', writable: true },
      108: { internal: true, type: 'away_temp', divisor: 10, writable: true },
      109: { capability: 'alarm_generic', transform: (v) => v === 1 || v === true }
    };
  }

  get gangCount() { return 1; }

  _registerCapabilityListeners() {
    this.log('[TRV] Using profile-specific capability listeners');
  }

  async onNodeInit({ zclNode }) {
    try {
      const ZigbeeTimeSync = require('../../lib/ZigbeeTimeSync');
      this._timeSync = new ZigbeeTimeSync(this, { throttleMs: (6 * 60 * 60 * 1000) });
      
      this.homey.setTimeout(async () => {
        try {
          const result = await this._timeSync.sync({ force: true });
          if (!result.success && result.reason === 'no_rtc') {
            await this._tuyaTimeSyncFallback();
          }
        } catch (e) {
          this.log('[TimeSync] Initial sync failed:', e.message);
        }
      }, 10000);
      
      this._timeSyncInterval = this.homey.setInterval(async () => {
        try {
          const result = await this._timeSync.sync();
          if (!result.success && result.reason === 'no_rtc') {
            await this._tuyaTimeSyncFallback();
          }
        } catch (e) {
          this.log('[TimeSync] Periodic sync failed:', e.message);
        }
      }, (6 * 60 * 60 * 1000));
    } catch (e) {
      this.log('[TimeSync] Time sync init failed:', e.message);
    }

    try {
      await this.configureAttributeReporting([
        {
          cluster: 'msTemperatureMeasurement',
          attributeName: 'measuredValue',
          minInterval: 30,
          maxInterval: 600,
          minChange: 50,
        },
        {
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 2,
        }
      ]);
    } catch (err) {
      this.log('Attribute reporting config failed:', err.message);
    }

    this._lastModeState = null;
    this._appCommandPending = false;
    this._appCommandTimeout = null;

    await this._setupThermostatCluster(zclNode);
    this._setupTRVListeners();
    await setupSonoffTRVZB(this, zclNode);

    await this.initPhysicalButtonDetection(zclNode);
    await this.initVirtualButtons();
    this._setupTRVVirtualActions();

    this.log(`[TRV] Ready (${this.dpProfile} profile)`);
  }

  _setupTRVVirtualActions() {
    if (this.hasCapability('button_boost')) {
      this.registerCapabilityListener('button_boost', async () => {
        await this._sendTuyaDP(103, true, 'bool');
      });
    }
    if (this.hasCapability('button_child_lock')) {
      this.registerCapabilityListener('button_child_lock', async () => {
        const currentLock = this.getStoreValue('child_lock') || false;
        await this._sendTuyaDP(7, !currentLock, 'bool');
        this.setStoreValue('child_lock', !currentLock).catch(() => {});
      });
    }
  }

  async _setupThermostatCluster(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;
    const thermo = ep1.clusters?.hvacThermostat;
    if (thermo && typeof thermo.on === 'function') {
      thermo.on('attr.localTemperature', (v) => this.setCapabilityValue('measure_temperature', parseFloat(v)).catch(() => { }));
      thermo.on('attr.occupiedHeatingSetpoint', (v) => this.setCapabilityValue('target_temperature', v * 100).catch(() => { }));
      if (this.hasCapability('dim')) {
        thermo.on('attr.pIHeatingDemand', (v) => this.setCapabilityValue('dim', v * 100).catch(() => { }));
      }
    }
  }

  _setupTRVListeners() {
    const profile = this.dpProfile;
    if (this.hasCapability('onoff') && profile === 'standard') {
      this.registerCapabilityListener('onoff', async (v) => {
        await this._sendTuyaDP(1, v, 'bool');
      });
    }
    if (this.hasCapability('thermostat_mode')) {
      this.registerCapabilityListener('thermostat_mode', async (v) => {
        const map = profile === 'me167' ? { auto: 0, heat: 1, off: 2 } : { heat: 0, auto: 1, off: 2 };
        await this._sendTuyaDP(2, map[v] ?? 0, 'enum');
      });
    }
    if (this.hasCapability('target_temperature')) {
      this.registerCapabilityListener('target_temperature', async (v) => {
        const dp = profile === 'me167' ? 4 : 3;
        await this._sendTuyaDP(dp, Math.round(v * 10), 'value');
      });
    }
  }

  async _sendTuyaDP(dp, value, type) {
    const tuya = this.zclNode?.endpoints?.[1]?.clusters?.tuya;
    if (tuya && typeof tuya.datapoint === 'function') {
      await tuya.datapoint({ dp, value, type });
    }
  }

  async _tuyaTimeSyncFallback() {
    try {
      const tuyaCluster = this.zclNode?.endpoints?.[1]?.clusters?.tuya;
      if (!tuyaCluster) return;
      const now = new Date();
      const payload = Buffer.from([
        now.getFullYear() - 2000,
        now.getMonth() + 1,
        now.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
        now.getDay() === 0 ? 7 : now.getDay()
      ]);
      await tuyaCluster.datapoint({ dp: 36, datatype: 4, data: payload });
    } catch (e) {
      this.log('[TimeSync] Tuya fallback failed:', e.message);
    }
  }

  onDeleted() {
    if (this._timeSyncInterval) this.homey.clearInterval(this._timeSyncInterval);
    super.onDeleted?.();
  }
}

module.exports = RadiatorValveDevice;
