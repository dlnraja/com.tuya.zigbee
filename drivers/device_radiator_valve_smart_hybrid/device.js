'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');

const UnifiedThermostatBase = require('../../lib/devices/UnifiedThermostatBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const setupSonoffTRVZB = require('../../lib/mixins/SonoffTRVZBMixin');

/**
 * 
 *       RADIATOR VALVE (TRV) - v5.6.0 + Bidirectional Buttons                  
 * 
 *   UnifiedThermostatBase handles: target_temperature listener                  
 *   This class: dpMappings + ZCL thermostat + (onoff / mode) listeners            
 *   Profile A (Standard): DPs 1-10,13-15,101-109 - MOES, SEA-ICON             
 *   Profile B (ME167): DPs 2-5,7,35,36,39,47 - AVATTO (ME167 / TRV06)             
 *   v5.6.0: Added bidirectional virtual buttons for mode / (boost / child_lock)     
 * 
 */
class RadiatorValveDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedThermostatBase)) {

  get mainsPowered() { return false; }

  /**
   * Detect DP profile based on manufacturerName
   * Profile B (ME167): _TZE284_o3x45p96, _TZE284_p3dbf6qs, _TZE200_p3dbf6qs, etc.
   */
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
      // Profile B: AVATTO ME167/TRV06 DP mapping
      // v5.5.921: FORUM FIX (ManuelKugler #1223) - Added alarm_battery for DP35
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
    // Profile A: Standard TRV DP mapping (MOES, etc.)
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

  /**
   * v5.7.4: Override parent's capability listener registration to use correct DPs per profile
   * FIX: Parent was sending target_temperature to DP2 always, but me167 needs DP4
   */
  _registerCapabilityListeners() {
    // Override parent - we handle target_temperature in _setupTRVListeners with correct DP per profile
    // Don't call super._registerCapabilityListeners() - it sends to wrong DP for me167
    this.log('[TRV] Using profile-specific capability listeners (not parent)');
  }

  async onNodeInit({ zclNode }) {
    this.initPhysicalButtonDetection(); // rule-19 injected
    // --- Homey Time Sync for TRV / LCD/Thermostat devices ---
    // Syncs the device clock with the Homey box time every 6 hours.
    // Uses ZCL Time Cluster (0x000A) or Tuya EF00 DP 0x24 as fallback.
    try {
      const ZigbeeTimeSync = require('../../lib/ZigbeeTimeSync');
      this._timeSync = new ZigbeeTimeSync(this, { throttleMs: (6 * 60 * 60 * 1000) });
      
      // Initial sync after 10 seconds (let device settle)
      this.homey.setTimeout(async () => {
        try {
          const result = await this._timeSync.sync({ force: true });
          if (result.success) {
            this.log('[TimeSync] Initial time sync successful');
          } else if (result.reason === 'no_rtc') {
            // Try Tuya EF00 DP 0x24 fallback for non-ZCL devices
            await this._tuyaTimeSyncFallback();
          }
        } catch (e) {
          this.log('[TimeSync] Initial sync failed (non-critical):', e.message);
        }
      }, 10000);
      
      // Periodic sync every 6 hours
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
      this.log('[TimeSync] Time sync init failed (non-critical):', e.message);
    }

    // --- Attribute Reporting Configuration (auto-generated) ---
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
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    // v5.6.0: Track state for physical button detection
    this._lastModeState = null;
    this._appCommandPending = false;
    this._appCommandTimeout = null;
    const profile = this.dpProfile;
    this.log(`[TRV] v5.6.0 - Profile: ${profile} | ${profile === 'me167' ? 'ME167 DPs: 2-5,7,35,36,39,47' : 'Standard DPs: 1-10,13-15,101-109'}`);

    // Store manufacturerName for profile detection
    try {
      const mfr = this.getStoreValue('manufacturerName') || zclNode?.endpoints?.[1]?.clusters?.basic?.attributes?.manufacturerName?.value;
      if (mfr) {
        this.setStoreValue('manufacturerName', mfr).catch(() => {});
        // v5.6.0: Also set in settings for recognition
        this.setSettings({ zb_manufacturer_name: mfr }).catch(() => {});
      }
    } catch (e) { /* ignore */ }

    // Setup ZCL thermostat (parent doesn't do this)
    await this._setupThermostatCluster(zclNode);

    // Register onoff/mode listeners (parent only handles target_temperature)
    this._setupTRVListeners();

    // v5.11.105: SONOFF TRVZB ZCL features (child_lock, open_window, frost_protection, valve)
    await this._setupSonoffTRVZB(zclNode);

    // v5.6.0: Initialize bidirectional button support
    await this.initPhysicalButtonDetection(zclNode);
    await this.initVirtualButtons();
    this._setupTRVVirtualActions();

    this.log(`[TRV] v5.11.105  Ready (${profile} profile) with bidirectional buttons`);
  }

  /**
   * v5.6.0: Setup virtual button actions for TRV control
   */
  _setupTRVVirtualActions() {
    // Virtual boost toggle
    if (this.hasCapability('button_boost')) {
      this.registerCapabilityListener('button_boost', async () => {
        this._markAppCommand();
        const dp = this.dpProfile === 'me167' ? 103 : 103;
        await this._sendTuyaDP(dp, true, 'bool');
        this.log('[TRV] Boost mode activated via virtual button');
      });
    }

    // Virtual child lock toggle
    if (this.hasCapability('button_child_lock')) {
      this.registerCapabilityListener('button_child_lock', async () => {
        this._markAppCommand();
        const currentLock = this.getStoreValue('child_lock') || false;
        await this._sendTuyaDP(7, !currentLock, 'bool');
        this.setStoreValue('child_lock', !currentLock).catch(() => {});
        this.log(`[TRV] Child lock ${!currentLock ? 'enabled' : 'disabled'} via virtual button`);
      });
    }
  }

  _markAppCommand() {
    this._appCommandPending = true;
    clearTimeout(this._appCommandTimeout);
    this._appCommandTimeout = setTimeout(() => {
      this._appCommandPending = false;
    }, 2000);
  }

  async _setupThermostatCluster(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1 ) return;

    try {
      const thermo = ep1.clusters?.hvacThermostat;if (thermo?.on) {
        thermo.on('attr.localTemperature', (v) => this.setCapabilityValue('measure_temperature', parseFloat(v )).catch(() => { }));
        thermo.on('attr.occupiedHeatingSetpoint', (v) => this.setCapabilityValue('target_temperature', v * 100).catch(() => { }));
        thermo.on('attr.pIHeatingDemand', (v) => {
          if (this.hasCapability('dim')) this.setCapabilityValue('dim', v * 100).catch(() => { });
      });
        this.log('[TRV]  ZCL Thermostat configured');
      }
    } catch (e) { /* ignore */ }
  }

  _setupTRVListeners() {
    const profile = this.dpProfile;

    // On/Off - NOT handled by parent (standard profile only)
    if (this.hasCapability('onoff') && profile === 'standard') {
      this.registerCapabilityListener('onoff', async (v) => {
        await this._sendTuyaDP(1, v, 'bool');
      });
    }

    // Mode - different mapping per profile
    if (this.hasCapability('thermostat_mode')) {
      this.registerCapabilityListener('thermostat_mode', async (v) => {
        if (profile === 'me167') {
          // ME167: 0=auto, 1=heat, 2=off
          await this._sendTuyaDP(2, { auto: 0, heat: 1, off: 2 }[v] ?? 1, 'enum');
        } else {
          // Standard: 0=heat, 1=auto, 2=off
          await this._sendTuyaDP(2, { heat: 0, auto: 1, off: 2 }[v] ?? 0, 'enum');
        }
      });
    }

    // Target temperature - different DP per profile
    if (this.hasCapability('target_temperature')) {
      this.registerCapabilityListener('target_temperature', async (v) => {
        const dp = profile === 'me167' ? 4 : 3;
        await this._sendTuyaDP(dp, Math.round(v * 10), 'value');
      });
    }
  }

  async _sendTuyaDP(dp, value, type) {
    const tuya = this.zclNode?.endpoints?.[1]?.clusters?.tuya;
    if (tuya?.datapoint) {
      this.log(`[TRV] Sending DP${dp} = ${value} (${type})`);
      await tuya.datapoint({ dp, value, type } );
    }
  }

  async _setupSonoffTRVZB(zclNode) {
    try {
      const isSonoff = await setupSonoffTRVZB(this, zclNode);
      if (isSonoff) this.log('[TRV] SONOFF TRVZB features enabled');
    } catch (e) {
      this.log('[TRV] SONOFF setup skipped:', e.message);
    }
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }

  /**
   * Tuya EF00 time sync fallback (DP (0x24 / decimal) 36)
   * Sends current time with timezone offset for Tuya-native (thermostat / TRV) devices.
   */
  async _tuyaTimeSyncFallback() {
    try {
      const node = this.zclNode || this._zclNode;
      const tuyaCluster = node?.endpoints?.[1]?.clusters?.tuya;
      if (!tuyaCluster) return;

      const now = new Date();
      let utcOffset = 0;
      try {
        const tz = this.homey.clock.getTimezone();
        const tzDate = new Date(now.toLocaleString('en-US', { timeZone: tz }));
        utcOffset = Math.round((tzDate - now) / 3600000);
      } catch (e) { /* use UTC */ }

      // Tuya time format: [year-2000, month, day, hour, minute, second, weekday(0=Mon)]
      const payload = Buffer.from([
        now.getFullYear() - 2000,
        now.getMonth() + 1,
        now.getDate(),
        now.getHours() + utcOffset,
        now.getMinutes(),
        now.getSeconds(),
        now.getDay() === 0 ? 7 : now.getDay() // Sunday=7 in Tuya format
      ]);

      await tuyaCluster.datapoint({ dp: 36, datatype: 4, data: payload }); // Raw type
      this.log('[TimeSync] Tuya DP36 time sync sent:', payload.toString('hex'));
    } catch (e) {
      this.log('[TimeSync] Tuya fallback failed:', e.message);
    }
  }


  /**
   * v7.4.6: Refresh state when device announces itself (rejoin/wakeup)
   */
  async onEndDeviceAnnounce() {
    this.log('[REJOIN] Device announced itself, refreshing state...');
    if (typeof this._updateLastSeen === 'function') this._updateLastSeen();
    // Proactive data recovery if supported
    if (this._dataRecoveryManager) {
       this._dataRecoveryManager.triggerRecovery();
    }
  }
}

module.exports = RadiatorValveDevice;



