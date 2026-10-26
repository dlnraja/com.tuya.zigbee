'use strict';

const { safeSetTimeout, safeClearTimeout } = require('../../lib/utils/safe-timers');
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
// WHY(P3067 family 5): ME168 differs from ME167 only above DP7 (Z2M avatto.ts ME168_AVATTO):
// DP14 window detection switch, DP15 window state (0 = open, trueFalseEnum0) — not a battery %,
// DP101 comfort temp /10, DP103 boost time min, DP104 boost countdown, DP105 eco temp /10.
const ME168_RE = /_tze200_(cxakecfo|ybsqljjg|4aijvczq|r5ksy7qo)$/i;
const ME168_DPS = {
  14: { internal: true, type: 'window_detection', writable: true },
  15: { internal: true, type: 'window_open', transform: (v) => Number(v) === 0 },
  101: { internal: true, type: 'comfort_temp', divisor: 10, writable: true },
  102: { internal: true, type: 'switch_unused' },
  103: { internal: true, type: 'boost_time', writable: true },
  104: { internal: true, type: 'boost_countdown' },
  105: { internal: true, type: 'eco_temp', divisor: 10, writable: true },
};

class RadiatorValveDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedThermostatBase)) {

  get mainsPowered() { return false; }

  /**
   * Detect DP profile based on manufacturerName
   * Profile B (ME167 / TS0601_thermostat_3): AVATTO ME167 + EARU + ogx8u5z6 family
   * WHY P2278: _TZE204_ogx8u5z6 uses DP4/5 /10 + DP47 cal (Z2M#25199 / ZHA#4124) — not Profile A
   */
  /**
   * WHY(P2822 / GH#560): zb_manufacturer_name can be empty early in boot / after
   * Repair — fall back to store + zclNode so ME167 tails still win over Profile A.
   */
  _resolveMfr() {
    try {
      const fromZcl = this.zclNode?.manufacturerName
        || this.zclNode?.attrs?.manufacturerName
        || '';
      return String(
        this.getSetting('zb_manufacturer_name')
        || this.getStoreValue('manufacturerName')
        || this.getStoreValue('zb_manufacturer_name')
        || this.getData?.()?.manufacturerName
        || fromZcl
        || '',
      );
    } catch (_e) {
      return String(this.getSetting('zb_manufacturer_name') || this.getStoreValue('manufacturerName') || '');
    }
  }

  get dpProfile() {
    const mfr = this._resolveMfr().toLowerCase();
    const me167Tails = [
      'o3x45p96', 'p3dbf6qs',
      // WHY(#560 TRV06 _TZE200_rxq4iti9): Z2M tuya.ts lists these in the same ME167/TRV06 definition (DP4 setpoint, DP5 temp)
      'rxq4iti9', 'yqgbrdyo', '6rdj8dzm', 'jkfbph7l', 'rxntag7i', '4utwozi2',
      'rv6iuyxb', 'c6wv4xyo', 'hvaxb2tc', 'ogx8u5z6',
      // WHY(P2818/#2261): ANTIK ATK-TRV02 `_TZE200_fl8cuafl` — retail TV02-class (manual InS/AdA);
      // not yet in Z2M herdsman; soft ME167 map (DP4/5 ÷10) until user DP sniff proves otherwise.
      'fl8cuafl',
      // WHY(P3067 family 5): AVATTO / Girier ME168 (Z2M avatto.ts ME168_AVATTO, Domoticz z4d TS0601-ME168):
      // DP2 mode, DP3 work state, DP4 setpoint /10, DP5 temperature /10, DP6 battery, DP7 lock, DP35 fault —
      // the ME167 core. Profile A read DP3 as setpoint and DP4 as temperature.
      'cxakecfo', 'ybsqljjg', '4aijvczq', 'r5ksy7qo',
    ];
    return me167Tails.some((t) => mfr.includes(t)) ? 'me167' : 'standard';
  }

  get dpMappings() {
    const mfr = this._resolveMfr();
    // WHY P2278: ogx8u5z6 firmware stores cal in tenths (user-confirmed Z2M divideBy10)
    const calDivisor = /ogx8u5z6/i.test(mfr) ? 10 : 1;

    if (this.dpProfile === 'me167') {
      // Profile B: AVATTO ME167/TRV06 / thermostat_3 DP mapping
      // WHY(P2598 / Z2M#25199 / Michaelp #2253): DP4/5 are always ÷10 — never smartDivisor
      // (auto-detect can leave raw tenths as °C → looks empty/wrong after pair).
      const me167 = {
        2: { capability: 'thermostat_mode', transform: (v) => ({ 0: 'auto', 1: 'heat', 2: 'off' }[v] ?? 'heat') },
        3: { internal: true, type: 'running_state', transform: (v) => v === 0 ? 'heat' : 'idle' },
        4: { capability: 'target_temperature', divisor: 10 },
        5: { capability: 'measure_temperature', divisor: 10 },
        // WHY(#560 / Z2M TRV06): DP6 = battery % — never treat DP4 as battery (Profile A bug / tip-lag)
        6: { capability: 'measure_battery', divisor: 1 },
        7: { capability: 'child_lock', transform: (v) => v === true || v === 1 },
        // Complementary battery DPs (Z2M thermostat_3 variants) — keep alarm on 35
        13: { capability: 'measure_battery', divisor: 1 },
        15: { capability: 'measure_battery', divisor: 1 },
        // WHY(#560 / Z2M TS0601_thermostat_3 `errorOrBatteryLow`): DP35 is a fault bitmap, bit 0 = battery low.
        // alarm_battery is added lazily on the first DP35 report (see _handleDP) so TRVs that never send it stay clean.
        35: { capability: 'alarm_battery', transform: (v) => (Number(v) & 1) === 1 },
        36: { capability: 'frost_protection', transform: (v) => v === true || v === 1 },
        39: { internal: true, type: 'anti_scaling', writable: true },
        // WHY P2278: ogx8u5z6 stores tenths (ZHA#4124); other ME167 = whole °C (Z2M raw)
        47: { internal: true, type: 'temp_calibration', writable: true, divisor: calDivisor, setting: 'temperature_calibration' },
        // WHY(P2598 / Z2M#25199 IoT): eco complementary — do not wipe existing maps
        101: { internal: true, type: 'eco_mode', writable: true },
        102: { internal: true, type: 'eco_temp', divisor: 10, writable: true },
      };
      if (ME168_RE.test(mfr)) { return { ...me167, ...ME168_DPS }; }
      return me167;
    }
    // Profile A: Standard TRV DP mapping (MOES, etc.)
    return {
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true || v === 'on' },
      2: { capability: 'thermostat_mode', transform: (v) => ({ 0: 'heat', 1: 'auto', 2: 'off' }[v] ?? 'heat') },
      3: { capability: 'target_temperature', smartDivisor: true },
      4: { capability: 'measure_temperature', smartDivisor: true },
      7: { capability: 'child_lock', transform: (v) => v === true || v === 1 },
      8: { capability: 'frost_protection', transform: (v) => v === true || v === 1 },
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

  /**
   * WHY(#560 artisare, TRV06 _TZE200_rxq4iti9 / TS0601): the TRV has no humidity sensor, yet the
   * driver-wide capability list always offers measure_humidity. Strip it for this exact couple only
   * (soft, idempotent; other TRVs in this driver keep their capabilities).
   */
  _isNoHumidityTrv() {
    try {
      const mfr = this._resolveMfr().toLowerCase();
      return mfr === '_tze200_rxq4iti9';
    } catch (_e) { return false; }
  }

  async _stripPhantomHumidity() {
    if (!this._isNoHumidityTrv()) {return;}
    // WHY(P3045 / #560): proven phantom, not a guess — the Z2M TS0601_thermostat_3 definition (EARU TRV06,
    // this exact couple) has no humidity DP and exposes no humidity, and Z2M disc. #24659 lists none either.
    // Any value on measure_humidity can only come from a misrouted DP, so it is removed even when non-null,
    // and the capability is forbidden so hot-swap / dynamic managers never re-add it.
    this._forbiddenCapabilities = Array.from(new Set([...this._forbiddenCapabilities || [], 'measure_humidity']));
    if (!this.hasCapability('measure_humidity')) {return;}
    try {
      const cur = this.getCapabilityValue('measure_humidity');
      await this.removeCapability('measure_humidity');
      this.log(`[TRV] #560 removed phantom measure_humidity (TRV06 has no humidity sensor; last value ${cur})`);
    } catch (e) {
      this.log('[TRV] #560 humidity strip skipped:', e && e.message);
    }
  }

  /**
   * WHY(#560): me167 DP35 (fault bitmap, bit0 = low battery) -> alarm_battery, added only once a DP35
   * report really arrives (Z2M exposes only a boolean battery_low for TRV06; no battery percentage).
   */
  /**
   * WHY(#560 artisare 19/10, TRV06 _TZE200_rxq4iti9): "battery shows no value". Z2M TS0601_thermostat_3
   * (EARU/AVATTO TRV06 whitelabel) has NO battery percentage DP — only battery_low inside the DP35 fault
   * bitmap, and DP35 is rarely sent. So for this exact couple: show alarm_battery from pairing (false until
   * DP35 bit0 says otherwise) and drop an empty measure_battery. If a battery % DP (6/13/15) ever arrives,
   * measure_battery is re-added lazily in _handleDP, so nothing real is lost.
   */
  /** P3002d: single onNodeInit entry for TRV06 alignment (keeps max-statements flat). */
  async _alignTrv06() {
    await this._alignTrv06Battery();
    await this._alignTrv06WholeDegree();
  }

  /**
   * WHY(P3001 / #560 artisare): TRV06 `_TZE200_rxq4iti9` firmware reports local
   * temperature, setpoint and calibration in whole °C only (Z2M TRV06 docs: step 1;
   * Z2M discussion #24659). Show a 1 °C setpoint step so the UI matches the device.
   */
  async _alignTrv06WholeDegree() {
    if (!this._isNoHumidityTrv() || !this.hasCapability('target_temperature')) { return; }
    try {
      let cur = {};
      try { cur = this.getCapabilityOptions('target_temperature') || {}; } catch (_e) { cur = {}; }
      if (cur.step === 1 && cur.decimals === 0) { return; }
      await this.setCapabilityOptions('target_temperature', { ...cur, step: 1, decimals: 0 });
      this.log('[TRV] P3001 TRV06 setpoint step 1 °C (firmware whole degrees)');
    } catch (e) {
      this.log('[TRV] P3001 setpoint step skipped:', e?.message || e);
    }
  }

  async _alignTrv06Battery() {
    if (!this._isNoHumidityTrv()) {return;}
    try {
      if (!this.hasCapability('alarm_battery')) {
        await this.addCapability('alarm_battery');
        await this.safeSetCapabilityValue('alarm_battery', false);
      }
      if (this.hasCapability('measure_battery')) {
        const cur = this.getCapabilityValue('measure_battery');
        if (cur === null || cur === undefined) {
          await this.removeCapability('measure_battery');
          this.log('[TRV] #560 TRV06: no battery % DP (Z2M) -> alarm_battery only');
        }
      }
    } catch (e) {
      this.log('[TRV] #560 battery align skipped:', e && e.message);
    }
  }

  _handleDP(dpId, raw) {
    if ([6, 13, 15].includes(Number(dpId)) && this._isNoHumidityTrv() && !this.hasCapability('measure_battery')) {
      Promise.resolve(this.addCapability('measure_battery'))
        .then(() => super._handleDP(dpId, raw))
        .catch((e) => this.log('[TRV] #560 measure_battery re-add skipped:', e && e.message));
      return undefined;
    }
    if (Number(dpId) === 35 && this.dpProfile === 'me167' && !this.hasCapability('alarm_battery')) {
      Promise.resolve(this.addCapability('alarm_battery'))
        .then(() => super._handleDP(dpId, raw))
        .catch((e) => this.log('[TRV] #560 alarm_battery add skipped:', e && e.message));
      return undefined;
    }
    return super._handleDP(dpId, raw);
  }

  async onNodeInit({ zclNode }) {
    // WHY(P2569/P2573 / Michaelp #2244): ogx8u5z6 interview is EF00-only
    // ([0,4,5,61184] ± 0xED00) — force pure Tuya DP BEFORE Hybrid base init.
    try {
      const { forcePureTuyaDp } = require('../../lib/zigbee/Ef00OnlyInterview');
      forcePureTuyaDp(this);
    } catch (_e) { /* soft */ }
    // WHY(P2596): seed identity BEFORE thermostat init so me167 maps + pid settings exist
    try {
      const { ensureManufacturerSettings } = require('../../lib/helpers/ManufacturerNameHelper');
      await ensureManufacturerSettings(this, zclNode);
      this.forceActiveTuyaMode = true;
      this._trvInitAt = Date.now();
      this._deviceInitTime = this._trvInitAt;
    } catch (_e) { /* soft */ }
    await super.onNodeInit({ zclNode });
    // --- Homey Time Sync for TRV / LCD/Thermostat devices ---
    // Syncs the device clock with the Homey box time every 6 hours.
    // Uses ZCL Time Cluster (0x000A) or Tuya EF00 DP 0x24 as fallback.
    try {
      const ZigbeeTimeSync = require('../../lib/ZigbeeTimeSync');
      this._timeSync = new ZigbeeTimeSync(this, { throttleMs:6 * 60 * 60 * 1000 });
      
      // Initial sync after 10 seconds (let device settle)
      this.homey.setTimeout(async () => {
        if (this._destroyed) {return;}
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
        if (this._destroyed) {return;}
        try {
          const result = await this._timeSync.sync();
          if (!result.success && result.reason === 'no_rtc') {
            await this._tuyaTimeSyncFallback();
          }
        } catch (e) {
          this.log('[TimeSync] Periodic sync failed:', e.message);
        }
      },6 * 60 * 60 * 1000);
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

    // WHY(P2326 / salvagr #533 diag c137a5d7): empty zb_manufacturer_name left TRV on
    // Generic profile while Moes ZTS-EUR-C curtain was mis-paired as radiator.
    try {
      const { ensureManufacturerSettings, getManufacturerName, getModelId } = require('../../lib/helpers/ManufacturerNameHelper');
      await ensureManufacturerSettings(this, zclNode);
      const mfr = getManufacturerName(this);
      const pid = getModelId(this) || 'TS0601';
      const { isForbiddenDriver, lookup } = require('../../lib/pairing/UserMisattributionRegistry');
      if (mfr && isForbiddenDriver(mfr, pid, 'device_radiator_valve')) {
        const c = lookup(mfr, pid);
        this.error(
          `[MISROUTE-P2326] ${mfr}+${pid} is locked to ${c?.canonicalDriver || 'curtain_motor'} `
          + '— remove this device and re-pair under Curtain / Window Coverings (not Radiator Valve).',
        );
      } else if (!mfr) {
        this.log('[TRV-P2326] manufacturerName still empty after ensure — pair identity incomplete');
      }
    } catch (e) {
      this.log('[TRV-P2326] misroute check skipped:', e?.message || e);
    }

    // WHY(P2594): after mfr settings filled, lock me167 maps + re-arm EF00 RX
    // (super thermostat init may have run with empty mfr → wrong/empty dynamic maps)
    try {
      if (this.dpProfile === 'me167') {
        this._dynamicDpMappings = { ...this._dynamicDpMappings || {}, ...this.dpMappings };
        this.log('[TRV] P2594 me167 DP maps re-locked after identity');
      }
      await this._setupTuyaDPMode?.();
    } catch (_e) { /* soft */ }
    await this._stripPhantomHumidity();
    await this._alignTrv06();

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

    // Register onoff/mode listeners AFTER identity (me167 needs DP4 not DP3)
    this._setupTRVListeners();

    // WHY(P2593 / Michaelp #2253): caps stay null until first EF00 report — nudge query
    this._scheduleTrvDpRefresh();

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
    safeClearTimeout(this, this._appCommandTimeout);
    this._appCommandTimeout = safeSetTimeout(this, () => { if (this._destroyed) {return;} this._appCommandPending = false; }, 2000);
  }

  /**
   * WHY(P2593): after pair/tip, EF00 sleepy TRVs may not push DPs until queried.
   */
  _scheduleTrvDpRefresh() {
    try {
      this.forceActiveTuyaMode = true;
      this._trvInitAt = this._trvInitAt || Date.now();
      this._deviceInitTime = this._deviceInitTime || this._trvInitAt;
      safeSetTimeout(this, () => {
        if (this._destroyed) {return;}
        const dps = this.dpProfile === 'me167'
          ? [2, 3, 4, 5, 7, 13, 15, 35]
          : [1, 2, 3, 4, 13, 15];
        this.log(`[TRV] P2596 refresh DPs ${dps.join(',')}`);
        try {
          const { tuyaDataQuery } = require('../../lib/tuya/TuyaDataQuery');
          tuyaDataQuery(this, dps, { logPrefix: '[TRV-REFRESH]', force: true }).catch(() => {});
        } catch (_e) {
          const mgr = this.tuyaEF00Manager;
          if (!mgr || typeof mgr.requestDP !== 'function') {return;}
          for (const id of dps) {
            try { mgr.requestDP(id, { force: true }).catch(() => {}); } catch (_e2) { /* soft */ }
          }
        }
      }, 5_000);
    } catch (_e) { /* soft */ }
  }

  /**
   * WHY(P2598 / Michaelp #2253): sleepy me167 wakes briefly — re-query sacred DPs on announce.
   */
  async onEndDeviceAnnounce() {
    try {
      if (typeof super.onEndDeviceAnnounce === 'function') {
        await super.onEndDeviceAnnounce();
      }
    } catch (_e) { /* soft */ }
    // WHY(#560 root cause): a second onEndDeviceAnnounce() further down this class used to override
    // this one, so the DP refresh on wake-up never ran. Both duties now live in this single method.
    try {
      this.log('[REJOIN] Device announced itself, refreshing state...');
      if (typeof this._updateLastSeen === 'function') { this._updateLastSeen(); }
      if (this._dataRecoveryManager) { this._dataRecoveryManager.forceRecovery?.(); }
    } catch (_e3) { /* soft */ }
    try {
      this.log('[TRV] P2598 endDeviceAnnounce → DP refresh');
      this._scheduleTrvDpRefresh();
    } catch (_e2) { /* soft */ }
  }

  async _setupThermostatCluster(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1 ) {return;}

    try {
      const thermo = ep1.clusters?.hvacThermostat;if (thermo?.on) {
        thermo.on('attr.localTemperature', (v) => this.safeSetCapabilityValue('measure_temperature', parseFloat(v) / 100).catch(() => { }));
        thermo.on('attr.occupiedHeatingSetpoint', (v) => this.safeSetCapabilityValue('target_temperature', v / 100).catch(() => { }));
        thermo.on('attr.pIHeatingDemand', (v) => {
          if (this.hasCapability('dim')) {this['safeSetCapabilityValue']('dim', v * 100).catch(() => { });}
      });
        this.log('[TRV]  ZCL Thermostat configured');
      }
    } catch (e) { /* ignore */ }
  }

  _setupTRVListeners() {
    // WHY(P2598 / Michaelp #2253): never close over a stale profile — read live dpProfile
    // each TX so late identity (empty mfr at first tick) cannot lock standard DP3 forever.

    // On/Off - NOT handled by parent (standard profile only)
    if (this.hasCapability('onoff')) {
      this.registerCapabilityListener('onoff', async (v) => {
        if (this.dpProfile !== 'standard') {return;}
        await this._sendTuyaDP(1, v, 'bool');
      });
    }

    // Mode - different mapping per profile
    if (this.hasCapability('thermostat_mode')) {
      this.registerCapabilityListener('thermostat_mode', async (v) => {
        if (this.dpProfile === 'me167') {
          // ME167: 0=auto, 1=heat, 2=off
          await this._sendTuyaDP(2, { 'auto': 0, 'heat': 1, 'off': 2 }[v] ?? 1, 'enum');
        } else {
          // Standard: 0=heat, 1=auto, 2=off
          await this._sendTuyaDP(2, { 'heat': 0, 'auto': 1, 'off': 2 }[v] ?? 0, 'enum');
        }
      });
    }

    // Target temperature - different DP per profile
    if (this.hasCapability('target_temperature')) {
      this.registerCapabilityListener('target_temperature', async (v) => {
        const dp = this.dpProfile === 'me167' ? 4 : 3;
        // WHY(P3001 / #560): TRV06 firmware only honours whole °C (Z2M disc. #24659);
        // decimals have been reported to glitch the setpoint → snap to 1 °C.
        const target = this._isNoHumidityTrv() ? Math.round(Number(v)) : Number(v);
        // WHY(P2593 / Michaelp #2253): tenths °C as Tuya value DP (4-byte)
        await this._sendTuyaDP(dp, Math.round(safeMultiply(target, 10)), 'value');
      });
    }
  }

  /**
   * WHY(P2593 / Michaelp #2253): Homey zigbee-clusters rejects legacy
   * args with value/type keys → "unexpected property".
   * Prefer TuyaEF00Manager / UniversalDriverInit (datatype + Buffer data).
   */
  async _sendTuyaDP(dp, value, type = 'value') {
    const typeName = type || 'value';
    this.log(`[TRV] Sending DP${dp} = ${value} (${typeName})`);
    try {
      if (this.tuyaEF00Manager && typeof this.tuyaEF00Manager.sendDP === 'function') {
        const ok = await this.tuyaEF00Manager.sendDP(dp, value, typeName);
        if (ok) {return true;}
      }
      if (this.io && typeof this.io.sendDP === 'function') {
        const ok = await this.io.sendDP(dp, value, { type: typeName });
        if (ok) {return true;}
      }
      const { sendTuyaDP } = require('../../lib/helpers/UniversalDriverInit');
      return !!await sendTuyaDP(this, dp, value, typeName);
    } catch (err) {
      this.error(`[TRV] DP${dp} TX failed:`, err?.message || err);
      throw err;
    }
  }

  async _setupSonoffTRVZB(zclNode) {
    try {
      const isSonoff = await setupSonoffTRVZB(this, zclNode);
      if (isSonoff) {this.log('[TRV] SONOFF TRVZB features enabled');}
    } catch (e) {
      this.log('[TRV] SONOFF setup skipped:', e.message);
    }
  }


  async onDeleted() {
    this._destroyed = true;
    await super.onDeleted();
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
      if (!tuyaCluster) {return;}

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
        (((now.getHours() + utcOffset) % 24) + 24) % 24,
        now.getMinutes(),
        now.getSeconds(),
        now.getDay() === 0 ? 7 : now.getDay() // Sunday=7 in Tuya format
      ]);

      // WHY(P2823b): full EF00 args — bare {dp,datatype,data} trips zigbee-clusters
      // ("unexpected property") on some tips; structured path matches P2711/P2593.
      const { sendStructuredDatapoint } = require('../../lib/helpers/UniversalDriverInit');
      await sendStructuredDatapoint(tuyaCluster, 36, payload, 'raw');
      this.log('[TimeSync] Tuya DP36 time sync sent:', payload.toString('hex'));
    } catch (e) {
      this.log('[TimeSync] Tuya fallback failed:', e.message);
    }
  }


}

module.exports = RadiatorValveDevice;



