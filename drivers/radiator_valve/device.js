const { includesCI } = require('../../../lib/utils/CaseInsensitiveMatcher');
'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');

const UnifiedThermostatBase = require('../../lib/devices/UnifiedThermostatBase');
const { boolean, enumMap } = require('../../lib/converters/ValueConverterRegistry');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const setupSonoffTRVZB = require('../../lib/mixins/SonoffTRVZBMixin');

// Idea #22: TRV Schedule encoding/decoding helpers
const TRV_SCHEDULE_DPS = {
  scheduleMonday: 104,
  scheduleTuesday: 105,
};

/**
 * Decode a raw schedule buffer from a TRV DP into a human-readable string.
 * Format: "HH:MM/TT HH:MM/TT ... HH:MM/TT" where TT is temperature x10.
 * Each period = 3 bytes: [time_segment, temp_high, temp_low]
 * time_segment * 10 = minutes from midnight.
 */
function decodeTRVSchedule(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 3) return '';
  const maxPeriods = Math.min(Math.floor(buffer.length / 3), 10);
  const periods = [];
  for (let i = 0; i < maxPeriods; i++) {
    const timeSegment = buffer[i * 3];
    const totalMinutes = timeSegment * 10;
    if (totalMinutes > 1440) break; // beyond 24:00 = sentinel
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const tempRaw = (buffer[i * 3 + 1] << 8) | buffer[i * 3 + 2];
    const temp = tempRaw / 10;
    periods.push(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}/${temp}`);
    if (hours === 24) break;
  }
  return periods.join(' ');
}

/**
 * Encode a human-readable schedule string into a raw buffer for a TRV DP.
 * Input: "HH:MM/TT HH:MM/TT ..."
 * Output: Buffer of 30 bytes (10 periods x 3 bytes each)
 */
function encodeTRVSchedule(scheduleString) {
  if (!scheduleString || typeof scheduleString !== 'string') return null;
  const periods = scheduleString.trim().split(/\s+/).filter(Boolean);
  const maxPeriods = 10;
  const buf = Buffer.alloc(maxPeriods * 3, 0);

  for (let i = 0; i < Math.min(periods.length, maxPeriods); i++) {
    const [timePart, tempPart] = periods[i].split('/');
    if (!timePart || tempPart === undefined) continue;
    const [h, m] = timePart.split(':').map(Number);
    const temp = parseFloat(tempPart);
    if (isNaN(h) || isNaN(m) || isNaN(temp)) continue;
    const totalMinutes = h * 60 + m;
    const timeSegment = Math.round(totalMinutes / 10);
    const tempRaw = Math.round(temp * 10);
    buf[i * 3] = timeSegment & 0xFF;
    buf[i * 3 + 1] = (tempRaw >> 8) & 0xFF;
    buf[i * 3 + 2] = tempRaw & 0xFF;
  }

  return buf;
}

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
      '_TZE204_o3x45p96', '_tze204_o3x45p96',
      '_tze200_ne4pikwm', '_TZE284_ne4pikwm',
      '_TZE200_9xfjixap', '_tze200_9xfjixap'
    ];
    if (me167Ids.some(id => includesCI(me167Ids, id))) {return 'me167';}
    
    const nedisIds = ['_TZE284_ne4pikwm', '_tze284_ne4pikwm', 'ne4pikwm'];
    if (nedisIds.some(id => includesCI(nedisIds, id))) {return 'nedis';}
    
    return 'standard';
  }

  get dpMappings() {
    if (this.dpProfile === 'nedis') {
      return {
        1: { capability: 'onoff', transform: boolean() },
        2: { capability: 'thermostat_mode', transform: enumMap({ 0: 'auto', 1: 'heat', 2: 'off' }, 'heat') },
        16: { capability: 'target_temperature', smartDivisor: true },
        24: { capability: 'measure_temperature', smartDivisor: true },
        40: { capability: 'child_lock', transform: (v) => v === true || v === 1 }
      };
    }
    if (this.dpProfile === 'me167') {
      // Profile B: AVATTO ME167/TRV06 DP mapping (also _TZE200_9xfjixap per haadeess #395)
      return {
        2: { capability: 'thermostat_mode', transform: enumMap({ 0: 'auto', 1: 'heat', 2: 'off' }, 'heat') },
        3: { internal: true, type: 'running_state', transform: enumMap({ 0: 'heat', 1: 'idle' }, 'idle') },
        4: { capability: 'target_temperature', smartDivisor: true },
        5: { capability: 'measure_temperature', smartDivisor: true },
        7: { capability: 'child_lock', transform: (v) => v === true || v === 1 },
        14: { internal: true, type: 'window_open', transform: boolean() },
        35: { capability: 'alarm_battery', transform: boolean() },
        36: { capability: 'frost_protection', transform: (v) => v === true || v === 1 },
        39: { internal: true, type: 'anti_scaling', writable: true },
        47: { internal: true, type: 'temp_calibration', divisor: 10, writable: true },
        101: { capability: 'dim', divisor: 100 },
        102: { internal: true, type: 'battery_low', transform: boolean() }
      };
    }
    // Profile A: Standard TRV DP mapping (MOES, etc.)
    return {
      1: { capability: 'onoff', transform: boolean() },
      2: { capability: 'thermostat_mode', transform: enumMap({ 0: 'heat', 1: 'auto', 2: 'off' }, 'heat') },
      3: { capability: 'target_temperature', smartDivisor: true },
      4: { capability: 'measure_temperature', smartDivisor: true },
      7: { capability: 'child_lock', transform: (v) => v === true || v === 1 },
      8: { capability: 'frost_protection', transform: (v) => v === true || v === 1 },
      9: { internal: true, type: 'eco_temp', divisor: 10, writable: true },
      10: { internal: true, type: 'comfort_temp', divisor: 10, writable: true },
      13: { capability: 'measure_battery', divisor: 1 },
      14: { internal: true, type: 'battery_low', transform: boolean() },
      15: { capability: 'measure_battery', divisor: 1 },
      101: { capability: 'alarm_contact', transform: boolean() },
      102: { capability: 'dim', divisor: 100 },
      103: { internal: true, type: 'boost_mode', writable: true },
      // Idea #22: Schedule DPs 104/105 (weekly schedule data)
      104: { internal: true, type: 'schedule_weekday', writable: true, scheduleDP: true },
      105: { internal: true, type: 'schedule_weekend', writable: true, scheduleDP: true },
      106: { internal: true, type: 'max_temp', divisor: 10, writable: true },
      107: { internal: true, type: 'away_mode', writable: true },
      108: { internal: true, type: 'away_temp', divisor: 10, writable: true },
      109: { capability: 'alarm_generic', transform: boolean() }
    };
  }

  get gangCount() { return 1; }

  _registerCapabilityListeners() {
    this.log('[TRV] Using profile-specific capability listeners (not parent)');
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.initPhysicalButtonDetection();
    try {
      const ZigbeeTimeSync = require('../../lib/ZigbeeTimeSync');
      this._timeSync = new ZigbeeTimeSync(this, { throttleMs: 6 * 3600000 });
      this.homey.setTimeout(async () => {
        if (this._destroyed) return;
        try {
          const result = await this._timeSync.sync({ force: true });
          if (!result.success && result.reason === 'no_rtc') {await this._tuyaTimeSyncFallback();}
        } catch (e) { this.log('[TimeSync] Error:', e.message); }
      }, 10000);
    } catch (e) { this.log('[TimeSync] Init failed:', e.message); }

    const profile = this.dpProfile;
    this.log(`[TRV] Profile: ${profile}`);

    await this._setupThermostatCluster(zclNode);
    this._setupTRVListeners();
    await this._setupSonoffTRVZB(zclNode);
    await this.initPhysicalButtonDetection(zclNode);
    await this.initVirtualButtons();
    this._setupTRVVirtualActions();

    this.log(`[TRV] Ready with profile ${profile}`);
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

  /**
   * Idea #22: Handle schedule-related settings changes.
   * DP 104 = weekday schedule, DP 105 = weekend schedule.
   * Schedule format: "HH:MM/TT HH:MM/TT ..." (up to 10 periods).
   */
  _handleScheduleSettings(settings, keys) {
    if (keys.includes('schedule_weekday')) {
      const buf = encodeTRVSchedule(settings.schedule_weekday);
      if (buf) {
        this.log('[TRV] Sending weekday schedule:', settings.schedule_weekday);
        this._sendTuyaDP(104, buf, 'raw').catch(e => this.error('[TRV] Schedule send failed:', e.message));
      }
    }
    if (keys.includes('schedule_weekend')) {
      const buf = encodeTRVSchedule(settings.schedule_weekend);
      if (buf) {
        this.log('[TRV] Sending weekend schedule:', settings.schedule_weekend);
        this._sendTuyaDP(105, buf, 'raw').catch(e => this.error('[TRV] Schedule send failed:', e.message));
      }
    }
    if (keys.includes('schedule_enabled')) {
      const enabled = settings.schedule_enabled ? 1 : 0;
      this.log('[TRV] Schedule mode:', enabled ? 'enabled' : 'disabled');
      // DP 101 (alarm_contact / schedule mode) as schedule enable toggle
      this._sendTuyaDP(101, enabled, 'value').catch(() => {});
    }
  }

  /**
   * Idea #22: Process incoming schedule DP values from the device.
   * DP 104 = weekday schedule buffer, DP 105 = weekend schedule buffer.
   */
  _processScheduleDP(dp, value) {
    if (dp === 104 && Buffer.isBuffer(value)) {
      const decoded = decodeTRVSchedule(value);
      this.log('[TRV] Weekday schedule received:', decoded);
      this.setSettings({ schedule_weekday: decoded }).catch(() => {});
    } else if (dp === 105 && Buffer.isBuffer(value)) {
      const decoded = decodeTRVSchedule(value);
      this.log('[TRV] Weekend schedule received:', decoded);
      this.setSettings({ schedule_weekend: decoded }).catch(() => {});
    }
  }

  async _setupThermostatCluster(zclNode) {
    const thermo = zclNode?.endpoints?.[1]?.clusters?.hvacThermostat;
    if (thermo?.on) {
      thermo.on('attr.localTemperature', (v) => this.safeSetCapabilityValue('measure_temperature', parseFloat(v )).catch(() => { }));
      thermo.on('attr.occupiedHeatingSetpoint', (v) => this.safeSetCapabilityValue('target_temperature', v * 100).catch(() => { }));
    }
  }

  _setupTRVListeners() {
    const profile = this.dpProfile;
    if (this.hasCapability('onoff') && profile === 'standard') {
      this.registerCapabilityListener('onoff', async (v) => { await this._sendTuyaDP(1, v, 'bool');
      });
    }
    if (this.hasCapability('thermostat_mode')) {
      this.registerCapabilityListener('thermostat_mode', async (v) => {
        const val = profile === 'me167' ? { 'auto': 0, 'heat': 1, 'off': 2 }[v] : { 'heat': 0, 'auto': 1, 'off': 2 }[v];
        await this._sendTuyaDP(2, val ?? 0, 'enum');
      });
    }
    if (this.hasCapability('target_temperature')) {
      this.registerCapabilityListener('target_temperature', async (v) => {
        let dp = 3;
        if (profile === 'me167') {dp = 4;}
        if (profile === 'nedis') {dp = 16;}
        await this._sendTuyaDP(dp, Math.round(safeMultiply(v, 10, 10), "value"));
      });
    }
  }

  async _sendTuyaDP(dp, value, type) {
    const tuya = this.zclNode?.endpoints?.[1]?.clusters?.tuya;
    if (tuya?.datapoint) {
      await tuya.datapoint({ dp, value, type } );
    }
  }

  async _setupSonoffTRVZB(zclNode) {
    try {
      await setupSonoffTRVZB(this, zclNode);
    } catch (e) {}
  }

  async _tuyaTimeSyncFallback() {
    try {
      const tuyaCluster = this.zclNode?.endpoints?.[1]?.clusters?.tuya;
      if (!tuyaCluster) {return;}
      const now = new Date();
      const payload = Buffer.from([now.getFullYear() - 2000, now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds() , now.getDay() === 0 ? 7 : now.getDay()]);
      await tuyaCluster.datapoint({ dp: 36, datatype: 4, data: payload });
    } catch (e) {}
  }


  /**
   * Idea #22: Handle settings changes including schedule updates
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    // Delegate schedule-related settings to the schedule handler
    this._handleScheduleSettings(newSettings, changedKeys);
    // Call parent onSettings if it exists
    if (super.onSettings) {
      await super.onSettings({ oldSettings, newSettings, changedKeys });
    }
  }

  /**
   * v7.4.6: Refresh state when device announces itself (rejoin/wakeup)
   */
  async onEndDeviceAnnounce() {
    this.log('[REJOIN] Device announced itself, refreshing state...');
    if (typeof this._updateLastSeen === 'function') {this._updateLastSeen();}
    // Proactive data recovery if supported
    if (this._dataRecoveryManager) {
       this._dataRecoveryManager?.forceRecovery?.();
    }
  }
}

module.exports = RadiatorValveDevice;


