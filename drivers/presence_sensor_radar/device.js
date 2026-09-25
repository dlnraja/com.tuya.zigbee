'use strict';

const UnifiedSensorBase = require('../../lib/devices/UnifiedSensorBase');
const { getSensorConfig, transformPresence } = require('./configs');
const IntelligentPresenceInference = require('../../lib/sensors/IntelligentPresenceInference');
const IntelligentDPAutoDiscovery = require('../../lib/sensors/IntelligentDPAutoDiscovery');
const MfrHelper = require('../../lib/helpers/ManufacturerNameHelper');
const { UniversalDPSender } = require('../../lib/tuya/UniversalDPSender');

/**
 * Known mains-powered mmWave radar manufacturers (230V AC ceiling/wall radars).
 * These devices report battery DPs but are actually mains-powered.
 */
const MTG_RELAY_RADARS = [
  '_tze204_sbyx0lm6',
  '_tze204_clrdrnya',
  '_tze204_dtzziy1e',
  '_tze204_iaeejhvf',
  '_tze204_mtoaryre',
  '_tze200_mp902om5',
  '_tze204_pfayrzcw',
  '_tze284_4qznlkbu',
  '_tze200_clrdrnya',
  '_tze200_sbyx0lm6',
  '_tze200_dtzziy1e',
  '_tze284_clrdrnya',
  '_tze284_dtzziy1e',
  '_tze284_sbyx0lm6',
];

// WHY(P2587): MTG075 family (VicHY clrdrnya + Z2M dtzziy1e siblings) — one regex for heal/relay.
const MTG_RELAY_MFR_RE = /clrdrnya|sbyx0lm6|dtzziy1e|iaeejhvf|mtoaryre|pfayrzcw|mp902om5|4qznlkbu/;

const MAINS_POWERED_RADARS = new Set([
  '_tze200_lyetpprm',
  '_tze204_lyetpprm',
  '_tze200_wukb7rhc',
  '_tze204_wukb7rhc',
  '_tze200_jva8ink8',
  '_tze204_jva8ink8',
  // P102: SZR07U 24GHz mmWave (Z2M) — USB/mains ceiling radar, ignore phantom battery DPs
  '_tze204_muvkrjr5',
  '_tze200_muvkrjr5',
  // P2482 / GH#547: ZY-M100-24GV3 ceiling radar (gkfbdvyx) — mains, no phantom battery
  '_tze200_gkfbdvyx',
  '_tze204_gkfbdvyx',
  '_tze284_gkfbdvyx',
  ...MTG_RELAY_RADARS,
]);

/**
 * PresenceSensorRadarDevice - v8.0.0 ULTIMATE
 * Universal Radar/mmWave sensor driver with intelligent inference and auto-discovery.
 */
class PresenceSensorRadarDevice extends UnifiedSensorBase {

  /**
   * Override: Mains-powered radars should not be treated as battery devices.
   * This suppresses battery polling, periodic dataQuery, and adjusts reporting intervals.
   */
  get mainsPowered() {
    const config = this._getRadarConfig();
    if (config && config.mainsPowered) {return true;}
    const mfr = (MfrHelper.getManufacturerName(this) || '').toLowerCase();
    return MAINS_POWERED_RADARS.has(mfr);
  }

  /**
   * WHY(P2600 / GH#550): ceiling EF00 radars must active-query DP1/9/101 —
   * UnifiedSensorBase skips periodic DataQuery when mainsPowered, and native
   * tuya.dataQuery alone left distance "-" while lux flooded.
   */
  get forceActiveTuyaMode() {
    try {
      const cfg = this._getRadarConfig() || {};
      if (cfg.enableFindSwitchOnBoot || cfg.forceActiveTuyaMode) return true;
      const mfr = (MfrHelper.getManufacturerName(this) || '').toLowerCase();
      if (/gkfbdvyx|ya4ft0w4|laokfqwu|clrdrnya|sbyx0lm6/.test(mfr)) return true;
    } catch (_e) { /* soft */ }
    return false;
  }

  /**
   * WHY(P2379): override UnifiedSensorBase climate defaults — radar owns config.dpMap
   * (sensitivity/range/delay DPs must show as driver-owned to DynCap).
   */
  get dpMappings() {
    if (this._dynamicDpMappings && Object.keys(this._dynamicDpMappings).length) {
      return this._dynamicDpMappings;
    }
    const config = this._getRadarConfig() || {};
    return config.dpMap || {};
  }

  get sensorCapabilities() {
    const config = this._getRadarConfig();
    const mfr = (MfrHelper.getManufacturerName(this) || '').toLowerCase();
    const noRelayCeiling = config.hasRelay === false
      || /gkfbdvyx|laokfqwu|ya4ft0w4/.test(mfr);
    const caps = new Set(['alarm_motion', 'alarm_human']);
    if (!noRelayCeiling) caps.add('button.1');
    const noBattery = this.mainsPowered
      || config.noBatteryCapability
      || config.suppressBatteryCapability
      || config.disableBatteryReporting;

    const addCap = (capability) => {
      if (!capability) {return;}
      if (capability === 'measure_battery' && noBattery) {return;}
      if (capability === 'alarm_battery' && noBattery) {return;}
      if (capability === 'measure_temperature' && config.noTemperature) {return;}
      if (capability === 'measure_humidity' && config.noHumidity) {return;}
      if (capability === 'onoff' && !config.hasRelay) {return;}
      if ((capability === 'button.1' || capability === 'button') && noRelayCeiling) {return;}
      caps.add(capability);
    };

    if (config.hasIlluminance) {caps.add('measure_luminance');}

    for (const mapping of Object.values(config.dpMap || {})) {
      addCap(mapping.cap);
    }

    return Array.from(caps);
  }

  /**
   * Cache the radar config lookup to avoid repeated calls.
   */
  _getRadarConfig() {
    // WHY(P2391 / VicHY #2224): never freeze DEFAULT when mfr arrives late —
    // wrong cache can attach HOBEIAN battery DP121 → Homey "low battery" on mains MTG.
    const mfr = MfrHelper.getManufacturerName(this);
    const modelId = this.getStoreValue('modelId') || this.getSetting?.('zb_model_id');
    const resolved = getSensorConfig(mfr, modelId);
    if (!this._cachedRadarConfig) {
      this._cachedRadarConfig = resolved;
      return this._cachedRadarConfig;
    }
    const cachedName = this._cachedRadarConfig.configName || 'DEFAULT';
    const nextName = resolved.configName || 'DEFAULT';
    if ((cachedName === 'DEFAULT' || !mfr) && nextName !== cachedName && mfr) {
      this.log(`[RADAR] P2391 config upgrade ${cachedName} → ${nextName} (mfr resolved)`);
      this._cachedRadarConfig = resolved;
      // WHY(P2459 / VicHY #2227): Homey app update often resolves mfr AFTER first heal —
      // re-arm DynCap + strip curtain/battery now that mains MTG config is known.
      try {
        this._armRadarDynCapGuards();
        this._healRadarPhantomCaps().catch(() => {});
        this._applyRadarCapabilityProfile().catch(() => {});
      } catch (_e) { /* soft */ }
    }
    return this._cachedRadarConfig;
  }

  /**
   * WHY(P2459 / VicHY #2227): Homey may restore DynCap curtain caps after tip updates.
   * WHY(P2472a): compose no longer ships measure_battery / energy.batteries (hybrid
   * HOBEIAN+MTG driver) — refuse phantom battery adds on mains so 220V clrdrnya never
   * shows Homey Energy low-battery after tip update.
   */
  async addCapability(capability) {
    const cap = String(capability || '');
    const forbidden = Array.isArray(this._forbiddenCapabilities) ? this._forbiddenCapabilities : [];
    if (forbidden.includes(cap)) {
      this.log(`[RADAR] P2459 refused addCapability(${cap}) (forbidden phantom)`);
      return;
    }
    if ((cap === 'measure_battery' || cap === 'alarm_battery' || cap === 'tuya_battery_low') && this.mainsPowered) {
      this.log(`[RADAR] P2459/P2511 refused addCapability(${cap}) (mains radar)`);
      return;
    }
    if (/^windowcoverings_|^dim$|^target_temperature$|^thermostat_mode$|^tuya_dp_/.test(cap)) {
      this.log(`[RADAR] P2459 refused addCapability(${cap}) (radar never cover/DIY)`);
      return;
    }
    return super.addCapability(capability);
  }

  /**
   * WHY(P2548 / VicHY #2241): Homey can flip class to windowcoverings hours after boot
   * even with auto-updates blocked (store/cap restore race). Refuse non-sensor class on
   * mains MTG/clrdrnya — heal path also forces sensor.
   * WHY(P2555 / VicHY soft-dismiss): ANY curtain/blind/cover class on this driver is poison
   * — refuse even if mainsPowered flag lags interview.
   */
  async setClass(deviceClass) {
    try {
      const mfr = (MfrHelper.getManufacturerName(this) || '').toLowerCase();
      const forceMains = this.mainsPowered || MAINS_POWERED_RADARS.has(mfr) || MTG_RELAY_MFR_RE.test(mfr);
      const next = String(deviceClass || '');
      const curtainLike = /windowcoverings|curtain|blind|cover|socket|light/i.test(next);
      if ((forceMains || curtainLike) && next && next !== 'sensor' && !/^other$/i.test(next)) {
        this.log(`[RADAR] P2548/P2555 refused setClass(${next}) — locked sensor`);
        if (typeof super.setClass === 'function') {
          return super.setClass('sensor');
        }
        return;
      }
    } catch (_e) { /* soft */ }
    if (typeof super.setClass === 'function') {
      return super.setClass(deviceClass);
    }
  }

  /**
   * WHY(P2548): never let Homey/adapters strip presence caps — "type flip" often
   * coincides with silent remove of alarm_motion → presence WHEN stops (#2240).
   */
  async removeCapability(capability) {
    const cap = String(capability || '');
    // WHY(P2577 / VicHY #2247 screenshot): lock ONLY primary presence caps.
    // /^alarm_motion/ also matched alarm_motion.zoneN → MTG075 could never strip
    // phantom multi-zone tiles (shown as "-" in bathroom UI).
    if (cap === 'alarm_motion' || cap === 'alarm_human' || cap === 'alarm_presence') {
      this.log(`[RADAR] P2548 refused removeCapability(${cap}) (presence lock)`);
      return;
    }
    // WHY(P2595 / GH#550): allow strip of phantom Button 1 on no-relay ceiling radars
    if (cap === 'button.1' || cap === 'button') {
      try {
        const cfg = this._getRadarConfig?.() || {};
        const mfr = (MfrHelper.getManufacturerName(this) || '').toLowerCase();
        const noRelayCeiling = cfg.hasRelay === false
          || /gkfbdvyx|laokfqwu|ya4ft0w4/.test(mfr);
        if (noRelayCeiling) {
          // fall through to super.removeCapability
        } else {
          this.log(`[RADAR] P2548 refused removeCapability(${cap}) (presence lock)`);
          return;
        }
      } catch (_e) {
        this.log(`[RADAR] P2548 refused removeCapability(${cap}) (presence lock)`);
        return;
      }
    }
    // WHY(P2575 / VicHY #2247): tip update stripped relay onoff on MTG075 — never drop it
    // when config.hasRelay / known clrdrnya family (bathroom switch tile disappeared).
    // WHY(P2581 / diag 8d9d0199): fail-closed — empty mfr+cfg after tip MUST NOT allow strip.
    // WHY(P2595 / GH#550): gkfbdvyx/ya4ft0w4 ceiling — ALLOW strip (no relay; Missing Listener).
    if (cap === 'onoff') {
      try {
        const cfg = this._getRadarConfig?.() || {};
        const mfr = (MfrHelper.getManufacturerName(this) || '').toLowerCase();
        const noRelayCeiling = cfg.hasRelay === false
          || /gkfbdvyx|laokfqwu|ya4ft0w4/.test(mfr);
        if (noRelayCeiling) {
          // allow strip
        } else {
          const composeOn = Array.isArray(this.driver?.manifest?.capabilities)
            && this.driver.manifest.capabilities.includes('onoff');
          const keepRelay = cfg.hasRelay === true
            || MTG_RELAY_MFR_RE.test(mfr)
            || this.getStoreValue?.('radar_has_relay') === true
            || (composeOn && cfg.hasRelay !== false);
          if (keepRelay || cfg.hasRelay !== false) {
            this.log('[RADAR] P2581 refused removeCapability(onoff) (MTG relay lock)');
            return;
          }
        }
      } catch (_e) {
        this.log('[RADAR] P2581 refused removeCapability(onoff) (fail-closed)');
        return;
      }
    }
    if (typeof super.removeCapability === 'function') {
      return super.removeCapability(capability);
    }
  }

  /**
   * v8.0.1: Keep alarm_human (presence) in sync with alarm_motion.
   * Forum bug (ka8l86iu): the device exposes motion but never presence.
   * Root cause: ZCL occupancy (0x0406) updates in the base class only feed
   * alarm_motion, while alarm_human was only set from DP reports. This
   * driver treats presence ≡ motion (DP1 handler already sets both), so
   * mirroring is consistent with the driver's own semantics.
   */
  async safeSetCapabilityValue(capability, value) {
    // WHY(P2391): mains MTG/clrdrnya must never commit phantom battery or DIY DP caps
    if (this.mainsPowered && (capability === 'measure_battery' || capability === 'alarm_battery' || capability === 'tuya_battery_low')) {
      return false;
    }
    if (capability === 'tuya_dp_value' || capability === 'tuya_dp_raw' || capability === 'tuya_dp_string') {
      return false;
    }
    // WHY(P2524b / VicHY #2239+74e5cae7): MTG075 inference/distance may paint alarm_motion
    // without _commitPresenceAndFlows — edge-fire declared presence cards on ANY path.
    // WHY(P2528): also edge-fire when alarm_human flips alone (UI "human presence" path).
    // WHY(P2719 / GH#550): ceiling splitMotionPresence — motion flicker must not wipe human.
    const split = this._getRadarConfig?.()?.splitMotionPresence === true;
    const edgeMotion = capability === 'alarm_motion' && typeof value === 'boolean';
    const edgeHuman = capability === 'alarm_human' && typeof value === 'boolean';
    const prevMotion = edgeMotion ? this.getCapabilityValue('alarm_motion') : undefined;
    const prevHuman = edgeHuman ? this.getCapabilityValue('alarm_human') : undefined;
    const result = await super.safeSetCapabilityValue(capability, value);
    if (edgeMotion || edgeHuman) {
      // WHY(P2557 / VicHY #2243): tip-lag 9.0.992 still flips to curtain — re-lock on presence edges
      this._nudgeSensorClassLock().catch(() => {});
    }
    if (edgeMotion) {
      if (!split && typeof this.hasCapability === 'function' && this.hasCapability('alarm_human')) {
        await super.safeSetCapabilityValue('alarm_human', value).catch(() => {});
      }
      // Split: motion true also lifts human; motion false leaves human for departure_delay
      if (split && value === true && typeof this.hasCapability === 'function'
          && this.hasCapability('alarm_human')) {
        const curH = this.getCapabilityValue('alarm_human');
        if (curH !== true) {
          await super.safeSetCapabilityValue('alarm_human', true).catch(() => {});
        }
      }
      if (prevMotion !== value) {
        if (!split || value === true) this._triggerPresenceFlows(value);
        else if (split && value === false) {
          try {
            this.homey.flow.getDeviceTriggerCard('presence_sensor_radar_motion_cleared')
              ?.trigger?.(this, {}).catch(() => {});
          } catch (_e) { /* soft — card may be absent */ }
        }
      }
    } else if (edgeHuman && prevHuman !== value) {
      if (!split && typeof this.hasCapability === 'function' && this.hasCapability('alarm_motion')) {
        const curMotion = this.getCapabilityValue('alarm_motion');
        if (curMotion !== value) {
          await super.safeSetCapabilityValue('alarm_motion', value).catch(() => {});
        }
      }
      // Split: human clear also clears motion
      if (split && value === false && typeof this.hasCapability === 'function'
          && this.hasCapability('alarm_motion')) {
        const curMotion = this.getCapabilityValue('alarm_motion');
        if (curMotion !== false) {
          await super.safeSetCapabilityValue('alarm_motion', false).catch(() => {});
        }
      }
      this._triggerPresenceFlows(value);
    }
    return result;
  }

  /**
   * WHY(P2559 / VicHY #2243): Homey can flip class to curtain while tip lags —
   * throttle sensor re-lock so presence RX keeps UI on sensor.
   */
  async _nudgeSensorClassLock() {
    const now = Date.now();
    if (this._lastClassNudgeAt && (now - this._lastClassNudgeAt) < 15_000) {return;}
    this._lastClassNudgeAt = now;
    try {
      const mfrNow = (MfrHelper.getManufacturerName(this) || '').toLowerCase();
      const forceMains = this.mainsPowered || MAINS_POWERED_RADARS.has(mfrNow)
        || MTG_RELAY_MFR_RE.test(mfrNow) || /gkfbdvyx/.test(mfrNow);
      if (!forceMains || typeof this.getClass !== 'function' || typeof this.setClass !== 'function') {return;}
      const cls = String(this.getClass() || '');
      if (cls && cls !== 'sensor') {
        await this.setClass('sensor').catch(() => {});
        await this._healRadarPhantomCaps().catch(() => {});
        this.log(`[RADAR] P2557 class nudge sensor (was ${cls})`);
      }
    } catch (_e) { /* soft */ }
  }

  /**
   * WHY(P2559 / GH#547 / Z2M): ceiling radars need magic or EF00 stays silent / leaves mesh.
   */
  async _ensureRadarMagicHandshake(zclNode) {
    try {
      const mfr = (MfrHelper.getManufacturerName(this) || '').toLowerCase();
      if (!(/gkfbdvyx|laokfqwu/.test(mfr) || MTG_RELAY_MFR_RE.test(mfr)) && this.mainsPowered !== true) {return;}
      const { sendTuyaMagicPacket } = require('../../lib/zigbee/TuyaMagicPacket');
      const node = zclNode || this.zclNode;
      if (!node?.endpoints?.[1] && !node?.endpoints?.[2]) {return;}
      try { await this.setStoreValue?.('tuya_magic_packet_sent', false); } catch (_e) { /* noop */ }
      this._tuyaMagicPacketSent = false;
      const epId = node.endpoints[1] ? 1 : 2;
      await sendTuyaMagicPacket(this, node, epId, { force: true });
      this.log('[RADAR] P2559 Tuya magic handshake armed');
      // WHY(P2583 / GH#547): first handshake can race interview — one delayed retry only
      if (!this._radarMagicRetryScheduled) {
        this._radarMagicRetryScheduled = true;
        try {
          const { safeSetTimeout } = require('../../lib/utils/safe-timers');
          safeSetTimeout(this, () => {
            this._ensureRadarMagicHandshake(node).catch(() => {});
          }, 5000);
        } catch (_e) { /* soft */ }
      }
    } catch (err) {
      this.log(`[RADAR] magic handshake soft-fail: ${err?.message || err}`);
    }
  }

  async onNodeInit({ zclNode }) {
    // WHY(VicHY #2227 / P2431): Arm DynCap guards and heal phantom curtain/battery caps FIRST
    // before super.onNodeInit can trigger any background adaptation or restore stale store caps.
    this._armRadarDynCapGuards();
    // WHY(P2573 / VicHY #2243): clrdrnya/gkfbdvyx interview is EF00-only ([0,61184]) —
    // force pure Tuya DP before Hybrid/ZCL can prefer hollow OnOff.
    try {
      const { forcePureTuyaDp } = require('../../lib/zigbee/Ef00OnlyInterview');
      forcePureTuyaDp(this);
    } catch (_e) { /* soft */ }
    try {
      const earlyCfg = this._getRadarConfig();
      this._radarFloodCalm = !!(earlyCfg && (earlyCfg.floodCalm || earlyCfg.mainsPowered));
    } catch (_e) { this._radarFloodCalm = true; /* driver is radar */ }
    await this._healRadarPhantomCaps();
    // WHY(P2551 / VicHY #2240 screenshot): dual History (Presence + Alarma movimiento)
    // — silence motion insights; keep alarm_human Presence titles for the timeline.
    await this._healPresenceHistoryUx().catch(() => {});
    // WHY(P2599 / VicHY #2252 OCR): arm tile sanitize even if early mfr empty (heal retries)
    try { this._armMtgTileSanitizeBurst(); } catch (_eArm) { /* soft */ }
    // WHY(P2386 / VicHY #2222): Homey may re-apply store caps async after app update —
    // re-heal shortly after boot so "blind mode" does not stick until delete+re-pair.
    this._scheduleRadarPhantomReheal();
    // WHY(P2555 / VicHY #2240): soft-dismiss "WHEN dead while tile green" → one-shot nudge
    this._schedulePresenceWhenNudge();
    // WHY(P2579 / Z2M): if Homey store still has sensor_mode=occupied after tip, unlock soon
    try {
      const { safeSetTimeout } = require('../../lib/utils/safe-timers');
      safeSetTimeout(this, () => {
        try {
          this._healForcedOccupiedSensorMode(this._getRadarConfig() || {});
        } catch (_e) { /* soft */ }
      }, 20_000);
    } catch (_e2) { /* soft */ }
    // WHY(P2581 / VicHY #2247 8d9d0199): soft-clear only ran on DP9 RX — floodCalm +
    // needsPolling:false left sticky presence forever in empty bathrooms. Watchdog.
    this._armStickyPresenceWatchdog();

    // WHY(P2597): Homey may keep compose onoff until strip — soft listener stops
    // "Missing capability Listener: onoff" on no-relay ceiling tiles (GH#550).
    // WHY(P2601): register BEFORE super so UI tap during long base init cannot 500.
    this._registerPhantomRelaySoftListeners();

    // WHY(P2589/P2591 Software Shield Module 3): after EF00 ready, restore sensitivity/delay
    // (MCU amnesia → zeros). Boot delay ~12s matches Hubitat-style post-init restore.
    this._scheduleRadarSettingsRestore('boot');

    // v5.11.139: Call super.onNodeInit() to initialize TuyaZigbeeDevice base class
    // which provides _safeInvoke and other L14 features
    try {
      await super.onNodeInit({ zclNode });
    } catch (err) {
      this.log('[RADAR] Base init error:', err.message);
    }

    // WHY(P2591): also hook raw Zigbee announce (complementary to onEndDeviceAnnounce)
    this._hookRadarNodeAnnounce(zclNode);

    // WHY(P2559 / GH#547 gkfbdvyx): MCU may leave network / silent RX without Tuya magic
    await this._ensureRadarMagicHandshake(zclNode).catch(() => {});

    this.log('[RADAR] v8.0.0 Ultimate Initializing...');

    // Initialize v8 components
    this._inference = new IntelligentPresenceInference(this);
    this._discovery = new IntelligentDPAutoDiscovery(this);
    // WHY(P2597 / GH#550): lower lux→presence gates for ceiling 24G (ambient flood)
    try {
      const cfg0 = this._getRadarConfig() || {};
      if (typeof this._inference.applyRadarConfigTuning === 'function') {
        this._inference.applyRadarConfigTuning(cfg0);
      }
    } catch (_eTune) { /* soft */ }

    await this._applyRadarCapabilityProfile();
    this._registerRadarCapabilityListeners();
    // WHY(P2597): Homey may keep compose onoff until strip — soft listener stops
    // "Missing capability Listener: onoff" on no-relay ceiling tiles (GH#550).
    this._registerPhantomRelaySoftListeners();

    // WHY(P2597 / Z2M find_switch): enable DP101 so DP9 distance starts reporting
    this._scheduleCeilingFindSwitchEnable('boot');
    // WHY(P2690 / GH#550 @ 9.0.1145): lux+distance cold while DP1 alarms still move —
    // lux-nudge never fires when DP103 is silent; poll must re-arm find_switch.
    this._armCeilingColdStreamWatchdog();

    // Idea #21: Initialize multi-zone capabilities if config supports it
    await this._initMultiZoneCapabilities();

    try {
      const appVersion = this.getStoreValue('appVersion') || this.zclNode?.endpoints?.[1]?.clusters?.basic?.appVersion;
      if (appVersion) {this._inference.setFirmwareInfo(appVersion);}
    } catch (e) {
      this.log('[RADAR] Firmware detection failed:', e.message);
    }

    // v9.0.249 (P59): Non-blocking cluster binding — same pattern as
    // drivers/sensor_presence_radar/device.js. Without explicit binding,
    // the device sends reports to its previous parent (the Zigbee
    // coordinator it was last paired to) and Homey never sees them.
    // Forum reference: #2045 (Kringloper: "no bindings").
    this._setupRadarClusterBinding(zclNode);

    // Start polling/refresh cycle
    this._startInitializationCycle(zclNode);

    this.log('[RADAR] Ready');
  }

  /**
   * WHY(P2379): DynCap must treat radar config.dpMap as driver-owned (settings DPs
   * have cap:null but must still block invent). Also forbid curtain/dim phantoms.
   */
  _armRadarDynCapGuards() {
    try {
      const config = this._getRadarConfig() || {};
      const dpMap = config.dpMap || {};
      const block = new Set(Object.keys(dpMap).map(Number).filter((n) => Number.isFinite(n)));
      for (const id of [1, 2, 3, 4, 6, 9, 12, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115]) {
        block.add(id);
      }
      this._dynCapBlockDps = block;
      const forbidden = [
        'windowcoverings_set',
        'windowcoverings_state',
        'windowcoverings_tilt_set',
        'dim',
        'target_temperature',
        'thermostat_mode',
        'tuya_dp_value',
        'tuya_dp_raw',
        'tuya_dp_string',
      ];
      if (this.mainsPowered || config.noBatteryCapability || config.suppressBatteryCapability) {
        // WHY(P2511): also refuse P2506 tuya_battery_low — Homey may reinject after tip soak
        forbidden.push('measure_battery', 'alarm_battery', 'tuya_battery_low');
      }
      this._forbiddenCapabilities = Array.from(new Set([
        ...(this._forbiddenCapabilities || []),
        ...forbidden,
      ]));
      // Bridge configs.dpMap → _dynamicDpMappings (dpMappings getter prefers this)
      const bridged = {};
      for (const [k, v] of Object.entries(dpMap)) {
        bridged[k] = v;
        bridged[Number(k)] = v;
      }
      this._dynamicDpMappings = { ...(this._dynamicDpMappings || {}), ...bridged };
    } catch (e) {
      this.log('[RADAR] P2379 dyn-cap guards skipped:', e.message);
    }
  }

  /**
   * WHY(P2551 / VicHY #2240 image Presencia baño): History logged BOTH
   * "Presence detected" (alarm_human) AND "Alarma de movimiento" (alarm_motion).
   * Silence motion insights; keep human-presence titles. Capability WHEN still works.
   * Also ensure alarm_human exists so Presence WHEN / is_present stay coherent.
   */
  async _healPresenceHistoryUx() {
    try {
      if (typeof this.hasCapability === 'function' && !this.hasCapability('alarm_human')
          && typeof this.addCapability === 'function') {
        await this.addCapability('alarm_human').catch(() => {});
      }
      if (typeof this.setCapabilityOptions !== 'function') return;
      if (this.hasCapability?.('alarm_motion')) {
        const curM = (typeof this.getCapabilityOptions === 'function'
          && this.getCapabilityOptions('alarm_motion')) || {};
        if (curM.preventInsights !== true) {
          await this.setCapabilityOptions('alarm_motion', {
            ...curM,
            preventInsights: true,
            title: curM.title || {
              en: 'Motion alarm', nl: 'Bewegingsalarm', fr: 'Alarme de mouvement',
              de: 'Bewegungsalarm', es: 'Alarma de movimiento',
            },
          }).catch(() => {});
          this.log('[RADAR] P2551 alarm_motion preventInsights (dedupe History)');
        }
      }
      // WHY(P2577 / VicHY #2247): units must be string "m" — object {"en":"m"} renders
      // Homey UI as "0 [object Object]" and breaks soft-clear readability.
      // WHY(P2599 / VicHY #2252 OCR): tip 9.0.1053 still showed object units after update —
      // ALWAYS force string "m" (not only when typeof !== string).
      if (this.hasCapability?.('measure_luminance.distance')) {
        await this._ensureDistanceUnitsString('boot-heal').catch(() => {});
      }
      if (this.hasCapability?.('alarm_human')) {
        const curH = (typeof this.getCapabilityOptions === 'function'
          && this.getCapabilityOptions('alarm_human')) || {};
        if (!curH.insightsTitleTrue || curH.preventInsights === true) {
          await this.setCapabilityOptions('alarm_human', {
            ...curH,
            preventInsights: false,
            getable: true,
            title: curH.title || {
              en: 'Human presence', nl: 'Menselijke aanwezigheid',
              fr: 'Présence humaine', de: 'Menschliche Anwesenheit', es: 'Presencia humana',
            },
            insightsTitleTrue: curH.insightsTitleTrue || {
              en: 'Presence detected', nl: 'Aanwezigheid gedetecteerd',
              fr: 'Présence détectée', de: 'Anwesenheit erkannt', es: 'Presencia detectada',
            },
            insightsTitleFalse: curH.insightsTitleFalse || {
              en: 'No presence', nl: 'Geen aanwezigheid',
              fr: 'Aucune présence', de: 'Keine Anwesenheit', es: 'Sin presencia',
            },
          }).catch(() => {});
          this.log('[RADAR] P2551 alarm_human Insights titles restored');
        }
      }
    } catch (_e) { /* soft */ }
  }

  /**
   * WHY(P2379): remove DynCap-poisoned curtain UI + clear stored dyn discoveries.
   * WHY(P2391 / VicHY #2224): mains clrdrnya also strips phantom battery + Homey Energy batteries
   * so timeline stops showing "low battery" after app updates.
   */
  async _healRadarPhantomCaps() {
    const phantoms = [
      'windowcoverings_set',
      'windowcoverings_state',
      'windowcoverings_tilt_set',
      'dim',
      'target_temperature',
      'thermostat_mode',
      'tuya_dp_value',
      'tuya_dp_raw',
      'tuya_dp_string',
    ];
    // WHY(P2459): treat known MTG/clrdrnya mfr as mains even if config cache still DEFAULT
    const mfrNow = (MfrHelper.getManufacturerName(this) || '').toLowerCase();
    const forceMains = this.mainsPowered || MAINS_POWERED_RADARS.has(mfrNow) || MTG_RELAY_MFR_RE.test(mfrNow);
    if (forceMains) {
      // WHY(P2511 / VicHY): strip native + app-owned battery low after tip update
      // WHY(P2599 / VicHY #2252 OCR): Temperatura + Battery low still on tile @ 9.0.1053
      phantoms.push(
        'measure_battery',
        'alarm_battery',
        'tuya_battery_low',
        'measure_temperature',
        'measure_humidity',
        'alarm_motion.zone1',
        'alarm_motion.zone2',
        'alarm_motion.zone3',
        'measure_luminance.distance.zone1',
        'measure_luminance.distance.zone2',
        'measure_luminance.distance.zone3',
        'measure_motion.classification',
      );
      // WHY(P2604 / GH#550): no-relay ceiling — strip Button 1 reinject after re-pair
      if (/gkfbdvyx|laokfqwu|ya4ft0w4/.test(mfrNow)) {
        phantoms.push('button.1', 'button', 'onoff');
      }
    }
    // WHY(P2712 / VicHY #2255): Advanced Flows cards disappear/reload when we
    // removeCapability/setClass/setEnergy on a clean device every minute.
    // Dirty-check first — no Homey UI invalidate when already healthy.
    let dirty = false;
    try {
      if (typeof this.getClass === 'function') {
        const cls0 = String(this.getClass() || '');
        if (forceMains && cls0 && cls0 !== 'sensor') dirty = true;
        if (/windowcoverings|curtain|blind|cover/i.test(cls0)) dirty = true;
      }
      if (!dirty && typeof this.hasCapability === 'function') {
        dirty = phantoms.some((cap) => this.hasCapability(cap));
      }
    } catch (_e) { dirty = true; }
    if (!dirty) {
      return { dirty: false, flippedFromCurtain: false };
    }

    let flippedFromCurtain = false;
    let removedAny = false;
    for (const cap of phantoms) {
      try {
        if (typeof this.hasCapability === 'function' && this.hasCapability(cap)) {
          await this.removeCapability(cap).catch(() => {});
          removedAny = true;
          this.log(`[RADAR] P2379/P2386/P2391 removed phantom capability ${cap}`);
        }
      } catch (_e) { /* soft */ }
    }
    try {
      // Homey UI "blind/curtain" often tracks class drift after DynCap poison
      // WHY(P2546 / VicHY #2241): even without app update Homey may flip class asynchronously —
      // force sensor for known mains MTG whenever heal runs (not only curtain-looking class).
      // WHY(P2587 / VicHY #2242/#2246): Rideau type-flip is Homey cache — not Occupied mode.
      if (typeof this.getClass === 'function' && typeof this.setClass === 'function') {
        const cls = String(this.getClass() || '');
        if (forceMains || /windowcoverings|curtain|blind|cover/i.test(cls)) {
          if (cls !== 'sensor') {
            flippedFromCurtain = /windowcoverings|curtain|blind|cover/i.test(cls);
            await this.setClass('sensor').catch(() => {});
            this.log(`[RADAR] P2386/P2546/P2587 restored class sensor (was ${cls || 'empty'})`);
          }
        }
      }
    } catch (_e) { /* soft */ }
    // WHY(P2391/P2420/P2431/P2459/P2472a VicHY): even after compose dropped energy.batteries,
    // Homey may keep prior session Energy metadata — mains MTG must clear batteries: null.
    // WHY(P2712): only setEnergy when dirty (Homey UI refresh cost).
    if (forceMains && typeof this.setEnergy === 'function' && (removedAny || flippedFromCurtain)) {
      try {
        await this.setEnergy({ batteries: null, mains: true });
        this.log('[RADAR] P2391/P2420/P2431/P2459/P2472a cleared Homey Energy batteries on mains radar');
      } catch (_e) { /* soft */ }
    }
    try {
      await this.unsetStoreValue('dynamic_capabilities').catch(() => {});
    } catch (_e) { /* soft */ }
    try {
      const mgr = this.dynamicCapabilityManager;
      if (mgr && typeof mgr.purgeDriverOwnedDiscoveries === 'function') {
        await mgr.purgeDriverOwnedDiscoveries();
      } else if (mgr && mgr._discoveredDPs) {
        mgr._discoveredDPs.clear();
      }
    } catch (_e) { /* soft */ }
    await this._ensureRelayOnoffCapability().catch(() => {});
    // WHY(P2587): after Rideau heal, immediately re-add presence core caps (Homey may have
    // stripped alarm_motion while class was windowcoverings — presence UI looks "frozen").
    if (forceMains) {
      await this._applyRadarCapabilityProfile().catch(() => {});
      if (flippedFromCurtain) {
        this._armCurtainFlipBurstHeal();
      }
      // WHY(P2599 / VicHY #2252 OCR): tip bump re-injects compose zones/temp — burst strip
      // WHY(P2712 / VicHY #2255): NEVER re-arm burst from clean periodic ticks —
      // only when phantoms were actually removed or class flipped (Contre quoi Flow lag).
      if (removedAny || flippedFromCurtain) {
        this._armMtgTileSanitizeBurst();
      }
    }
    return { dirty: true, flippedFromCurtain, removedAny };
  }

  /**
   * WHY(P2599 / VicHY #2252 OCR screenshot): after tip update Homey re-applies compose
   * zone/temp/battery tiles (shown as "-" / Battery low) and distance units object
   * ("0 [object Object]") for minutes — burst sanitize without requiring Rideau flip.
   */
  _armMtgTileSanitizeBurst() {
    try {
      if (this._mtgTileSanitizeArmed) return;
      this._mtgTileSanitizeArmed = true;
      const { safeSetTimeout } = require('../../lib/utils/safe-timers');
      // WHY(P2617 / GH#550 @ 9.0.1097): tip bump re-injects Button/zones/temp/battery for
      // minutes — extend burst so gkfbdvyx ceiling stays clean after Homey compose heal.
      // WHY(P2712 / VicHY #2255): keep arm flag for full burst window (was 150s while
      // ceiling bursts ran to 600s → periodic heal re-armed forever → Flow UI lag).
      const mfrNow = (MfrHelper.getManufacturerName(this) || '').toLowerCase();
      const ceiling = /gkfbdvyx|laokfqwu|ya4ft0w4/.test(mfrNow);
      const bursts = ceiling
        ? [3_000, 8_000, 20_000, 45_000, 90_000, 180_000, 300_000]
        : [5_000, 15_000, 45_000, 120_000];
      const armMs = (bursts[bursts.length - 1] || 120_000) + 30_000;
      for (const ms of bursts) {
        safeSetTimeout(this, () => {
          this._healPresenceHistoryUx().catch(() => {});
          this._healRadarPhantomCaps().catch(() => {});
          this._applyRadarCapabilityProfile().catch(() => {});
          this._sanitizeCorruptDistanceTile().catch(() => {});
        }, ms);
      }
      safeSetTimeout(this, () => { this._mtgTileSanitizeArmed = false; }, armMs);
      this.log(`[RADAR] P2599/P2712 MTG tile sanitize burst armed (${armMs}ms)`);
    } catch (_e) { /* soft */ }
  }

  /**
   * WHY(P2599 / VicHY #2252 OCR): force distance units string + repair corrupt value.
   */
  async _ensureDistanceUnitsString(reason = 'heal') {
    try {
      if (!this.hasCapability?.('measure_luminance.distance')) return false;
      if (typeof this.setCapabilityOptions !== 'function') return false;
      const curD = (typeof this.getCapabilityOptions === 'function'
        && this.getCapabilityOptions('measure_luminance.distance')) || {};
      if (curD.units === 'm' && typeof curD.units === 'string') {
        // still re-assert if Homey keeps object in store — only skip when exact
      }
      if (curD.units !== 'm') {
        await this.setCapabilityOptions('measure_luminance.distance', {
          ...curD,
          units: 'm',
          title: curD.title || {
            en: 'Detection Distance', fr: 'Distance de Détection',
            nl: 'Detectieafstand', de: 'Erkennungsdistanz', es: 'Distancia de detección',
          },
          preventInsights: true,
          getable: true,
        }).catch(() => {});
        this.log(`[RADAR] P2599 distance units → "m" (${reason})`);
      }
      return true;
    } catch (_e) {
      return false;
    }
  }

  /**
   * WHY(P2599): if Homey already painted "0 [object Object]", rewrite numeric meters.
   */
  async _sanitizeCorruptDistanceTile() {
    try {
      if (!this.hasCapability?.('measure_luminance.distance')) return;
      await this._ensureDistanceUnitsString('sanitize');
      const raw = this.getCapabilityValue?.('measure_luminance.distance');
      const asStr = String(raw);
      if (raw != null && typeof raw === 'object') {
        const n = this._coerceDistanceMeters(raw, { divisor: 100 });
        if (n != null) {
          await this.safeSetCapabilityValue('measure_luminance.distance', n).catch(() => {});
          this.log(`[RADAR] P2599 distance object→${n}m`);
        }
        return;
      }
      if (asStr.includes('[object Object]')) {
        const n = Number(this._lastDistanceM);
        const fallback = Number.isFinite(n) ? n : 0;
        await this.safeSetCapabilityValue('measure_luminance.distance', fallback).catch(() => {});
        this.log(`[RADAR] P2599 distance corrupt string→${fallback}m`);
      }
    } catch (_e) { /* soft */ }
  }

  /**
   * WHY(P2587 / VicHY #2242/#2246): Homey cache can re-poison class/caps for minutes after
   * tip/restart — burst re-heal so Rideau does not stick until delete+re-pair.
   */
  _armCurtainFlipBurstHeal() {
    try {
      if (this._curtainFlipBurstArmed) return;
      this._curtainFlipBurstArmed = true;
      const { safeSetTimeout } = require('../../lib/utils/safe-timers');
      const bursts = [10_000, 20_000, 30_000, 45_000, 90_000, 180_000];
      for (const ms of bursts) {
        safeSetTimeout(this, () => {
          this._armRadarDynCapGuards();
          this._healRadarPhantomCaps().catch(() => {});
        }, ms);
      }
      safeSetTimeout(this, () => { this._curtainFlipBurstArmed = false; }, 200_000);
      this.log('[RADAR] P2587 curtain-flip burst heal armed');
    } catch (_e) { /* soft */ }
  }

  /**
   * WHY(P2386): re-heal after app updates when Homey restores capabilities asynchronously.
   * WHY(P2546 / VicHY #2241): Homey can flip class/caps hours later WITHOUT tip update —
   * keep a slow periodic heal for mains MTG/clrdrnya (Contre quoi curtain UI recurrence).
   */
  _scheduleRadarPhantomReheal() {
    try {
      const { safeSetTimeout, safeSetInterval } = require('../../lib/utils/safe-timers');
      // WHY(P2420 / VicHY #2227): Homey restores energy.batteries + curtain caps within
      // seconds of an app update — 2s/5s catch the race before user sees phantom UI.
      // WHY(P2468 / VicHY #2232): Homey can re-apply Energy minutes after tip update.
      // WHY(P2472a): also re-heal at 30min for long-lived Energy UI after tip soak.
      const delays = [2_000, 5_000, 15_000, 60_000, 180_000, 600_000, 1_800_000];
      for (const ms of delays) {
        safeSetTimeout(this, () => {
          this._armRadarDynCapGuards();
          this._healRadarPhantomCaps().catch(() => {});
          const mfr = (MfrHelper.getManufacturerName(this) || '').toLowerCase();
          if (this.mainsPowered || MAINS_POWERED_RADARS.has(mfr) || MTG_RELAY_MFR_RE.test(mfr)) {
            this._applyRadarCapabilityProfile().catch(() => {});
          }
        }, ms);
      }
      // WHY(P2546 / VicHY #2241): slow periodic heal for class flip without tip.
      // WHY(P2712 / VicHY #2255): NEVER 60s — addCapability/removeCapability storms make
      // Advanced Flows cards vanish/reload and lag when dragging. Dirty heal is cheap;
      // interval stays 10 min (P2546 Contre quoi).
      if (!this._radarPhantomHealInterval && typeof safeSetInterval === 'function') {
        this._radarPhantomHealInterval = safeSetInterval(this, () => {
          const mfr = (MfrHelper.getManufacturerName(this) || '').toLowerCase();
          if (!(this.mainsPowered || MAINS_POWERED_RADARS.has(mfr) || MTG_RELAY_MFR_RE.test(mfr))) {
            return;
          }
          this._armRadarDynCapGuards();
          // Profile apply only when heal reports dirty (avoid Flow UI invalidate)
          this._healRadarPhantomCaps().then((r) => {
            if (r && r.dirty) {
              return this._applyRadarCapabilityProfile();
            }
            return null;
          }).catch(() => {});
        }, 600_000);
      }
    } catch (_e) {
      try {
        this.homey.setTimeout(() => {
          this._healRadarPhantomCaps().catch(() => {});
        }, 5_000);
      } catch (__e) { /* soft */ }
    }
  }

  _clearRadarPhantomHealInterval() {
    try {
      if (this._radarPhantomHealInterval) {
        const { safeClearInterval } = require('../../lib/utils/safe-timers');
        if (typeof safeClearInterval === 'function') {
          safeClearInterval(this, this._radarPhantomHealInterval);
        } else {
          clearInterval(this._radarPhantomHealInterval);
        }
        this._radarPhantomHealInterval = null;
      }
    } catch (_e) { /* soft */ }
  }

  /**
   * WHY(P2548 / VicHY #2241): Zigbee remesh / parent change around App Store publishes
   * can wake the node and Homey may restore stale curtain caps — heal on announce.
   */
  async onEndDeviceAnnounce() {
    try {
      if (typeof super.onEndDeviceAnnounce === 'function') {
        await super.onEndDeviceAnnounce();
      }
    } catch (_e) { /* soft */ }
    try {
      this._armRadarDynCapGuards();
      await this._healRadarPhantomCaps();
      const mfr = (MfrHelper.getManufacturerName(this) || '').toLowerCase();
      if (this.mainsPowered || MAINS_POWERED_RADARS.has(mfr) || MTG_RELAY_MFR_RE.test(mfr)) {
        await this._applyRadarCapabilityProfile().catch(() => {});
        // WHY(P2589): MCU amnesia zeros sensitivity/delay after power blip — re-push Homey settings
        this._scheduleRadarSettingsRestore('announce');
      }
      // WHY(P2602 / GH#550): remesh/announce — re-arm find_switch + EF00 query (distance cold)
      try {
        this._registerPhantomRelaySoftListeners();
        this._scheduleCeilingFindSwitchEnable('announce');
        this._queryCeilingPresenceDps('announce').catch(() => {});
      } catch (_eFs) { /* soft */ }
    } catch (_e) { /* soft */ }
  }

  /**
   * WHY(P2591 Software Shield): complementary to Homey onEndDeviceAnnounce —
   * some stacks emit node 'announce' / 'endDeviceAnnounce' on the ZCL node.
   */
  _hookRadarNodeAnnounce(zclNode) {
    try {
      if (this._radarAnnounceHooked) return;
      const node = zclNode || this.zclNode || this.node;
      if (!node || typeof node.on !== 'function') return;
      this._radarAnnounceHooked = true;
      const onAnnounce = () => {
        try { this._scheduleRadarSettingsRestore('node-announce'); } catch (_e) { /* soft */ }
      };
      try { node.on('announce', onAnnounce); } catch (_e1) { /* soft */ }
      try { node.on('endDeviceAnnounce', onAnnounce); } catch (_e2) { /* soft */ }
    } catch (_e) { /* soft */ }
  }

  /**
   * WHY(P2589/P2591 Module 3 Auto-Restore): Tuya mmWave MCU often resets DP
   * sensitivity/delay to 0 after reboot/power blip (Hubitat Contre quoi).
   * Re-push Homey settings → EF00 DPs. Throttled — announce storms must not flood mesh.
   */
  _scheduleRadarSettingsRestore(reason = 'boot') {
    try {
      const now = Date.now();
      if (this._lastSettingsRestoreAt && (now - this._lastSettingsRestoreAt) < 25_000) {
        return;
      }
      this._lastSettingsRestoreAt = now;
      const { safeSetTimeout } = require('../../lib/utils/safe-timers');
      // boot: 12s post-init (prompt 10–15s); announce: sooner so MCU gets settings fast
      const delay = (reason === 'announce' || reason === 'node-announce') ? 2_500 : 12_000;
      safeSetTimeout(this, () => {
        this._pushAllRadarSettingsToDevice(reason).catch(() => {});
      }, delay);
      // Second pass — first TX can race EF00 not ready after announce
      safeSetTimeout(this, () => {
        this._pushAllRadarSettingsToDevice(`${reason}-retry`).catch(() => {});
      }, delay + 12_000);
    } catch (_e) { /* soft */ }
  }

  /**
   * Prompt API Module 3 — restoreTuyaParameters()
   * Push every Homey setting that maps to a Tuya DP (sensitivity, range, delay, …).
   * Contre quoi: MCU amnesia leaves radar at 0 → looks frozen / never detects.
   */
  async restoreTuyaParameters(reason = 'manual') {
    return this._pushAllRadarSettingsToDevice(reason);
  }

  async _pushAllRadarSettingsToDevice(reason = 'restore') {
    const config = this._getRadarConfig() || {};
    if (!config.dpMap) return 0;
    let sentCount = 0;
    const entries = Object.entries(config.dpMap).filter(([, m]) => m && m.setting);
    for (const [dpId, dpConfig] of entries) {
      try {
        if (this._destroyed) break;
        let value;
        try { value = this.getSetting(dpConfig.setting); } catch (_e) { continue; }
        if (value === undefined || value === null) continue;
        const tx = this._toRadarDPValue(value, dpConfig);
        const dpType = this._getRadarDPType(dpConfig);
        const ok = await this._sendRadarDP(parseInt(dpId, 10), tx, dpType);
        if (ok) sentCount += 1;
        // WHY(P2590c): spacing between EF00 writes — safeSetTimeout only (no bare fallback; TITAN gate)
        await new Promise((resolve) => {
          const { safeSetTimeout } = require('../../lib/utils/safe-timers');
          safeSetTimeout(this, resolve, 90);
        });
      } catch (_e) { /* soft per-DP */ }
    }
    this.log(`[RADAR] P2589 restored ${sentCount}/${entries.length} settings DPs (${reason})`);
    // WHY(P2597): settings restore must also re-arm find_switch (MCU amnesia)
    try { await this._ensureCeilingFindSwitchOn(`${reason}-findswitch`); } catch (_eFs) { /* soft */ }
    return sentCount;
  }

  /**
   * WHY(P2597 / Z2M ZY-M100-24GV3 + GH#550): DP101 find_switch OFF → illuminance keeps
   * flooding while target_distance stays null forever. Auto-ON after pair / restore.
   */
  _scheduleCeilingFindSwitchEnable(reason = 'boot') {
    try {
      const config = this._getRadarConfig() || {};
      if (!config.enableFindSwitchOnBoot && !config.dpMap?.[101]?.autoEnableFindSwitch) return;
      const { safeSetTimeout } = require('../../lib/utils/safe-timers');
      const delays = reason === 'boot' ? [8_000, 22_000] : [2_000, 14_000];
      for (const ms of delays) {
        safeSetTimeout(this, () => {
          this._ensureCeilingFindSwitchOn(reason).catch(() => {});
        }, ms);
      }
    } catch (_e) { /* soft */ }
  }

  async _ensureCeilingFindSwitchOn(reason = 'boot') {
    const config = this._getRadarConfig() || {};
    const map101 = config.dpMap?.[101];
    if (!config.enableFindSwitchOnBoot && !map101?.autoEnableFindSwitch) return false;
    const mfr = (MfrHelper.getManufacturerName(this) || '').toLowerCase();
    const isCeilingFamily = /gkfbdvyx|ya4ft0w4|laokfqwu/.test(mfr)
      || config.configName === 'ZY_M100_CEILING_24G'
      || config.enableFindSwitchOnBoot === true;
    if (!isCeilingFamily) return false;
    const now = Date.now();
    if (this._lastFindSwitchOnAt && (now - this._lastFindSwitchOnAt) < 20_000) {
      // WHY(P2604): allow immediate re-arm when distance stuck at 0 after re-pair
      // WHY(P2690): cold/poll paths also bypass — MCU can drop find_switch while DP1 lives
      if (!/stuck|repair|announce|lux-stuck|cold|poll/.test(String(reason || ''))) return false;
    }
    this._lastFindSwitchOnAt = now;
    this.log(`[RADAR] P2597 enabling DP101 find_switch (${reason})`);
    // WHY(P2600): prefer EF00 manager (same Contre quoi as TRV P2593 Buffer path)
    let ok = false;
    try {
      if (this.tuyaEF00Manager && typeof this.tuyaEF00Manager.sendDP === 'function') {
        ok = !!(await this.tuyaEF00Manager.sendDP(101, true, 'bool'));
      }
    } catch (_eMgr) { /* soft */ }
    if (!ok) ok = !!(await this._sendRadarDP(101, true, 'bool'));
    // Soft query presence + distance after tracking is armed
    try {
      const { safeSetTimeout } = require('../../lib/utils/safe-timers');
      safeSetTimeout(this, () => {
        this._queryCeilingPresenceDps('post-findswitch').catch(() => {});
      }, 1_500);
    } catch (_e2) { /* soft */ }
    return !!ok;
  }

  /**
   * WHY(P2600 / GH#550 OCR): lux floods every 1–2s while DP9 stays "-" —
   * re-arm find_switch + EF00 requestDP (not Homey-native dataQuery alone).
   * WHY(P2604 / GH#550 re-pair): once DP9 paints 0m, `_distanceSeenOnce` blocked
   * forever re-arm → distance stuck 0 + lux goes quiet. Keep nudging while ≤0.05m.
   * WHY(P2690): also called from presence/poll when lux stream itself is dead.
   */
  _nudgeCeilingDistanceArmFromLux(reasonHint = 'lux-nudge') {
    try {
      const cfg = this._getRadarConfig() || {};
      if (!cfg.enableFindSwitchOnBoot && !cfg.syncPresenceFromLuxInference) return;
      const dist = Number(this._lastDistanceM);
      // WHY(P2617 / GH#550): treat sub-0.3m sticky as cold (OCR showed 0.2m while room occupied)
      const stuckZero = this._distanceSeenOnce
        && Number.isFinite(dist)
        && dist <= 0.3;
      const streamsCold = this._ceilingStreamsAreCold();
      // WHY(P2705 / GH#550 HiepSVG @ 9.0.1207): distance can tick while lux stays dead —
      // still re-arm find_switch + request DP103 (old AND gate skipped forever).
      const luxCold = this._ceilingLuxIsCold();
      if (this._distanceSeenOnce && !stuckZero && !streamsCold && !luxCold) return;
      const now = Date.now();
      const throttleMs = (stuckZero || streamsCold || luxCold) ? 45_000 : 12_000;
      if (this._lastLuxDistanceNudgeAt && (now - this._lastLuxDistanceNudgeAt) < throttleMs) return;
      this._lastLuxDistanceNudgeAt = now;
      const reason = luxCold && !streamsCold
        ? (String(reasonHint || '').includes('lux') ? reasonHint : 'lux-cold')
        : (streamsCold
          ? (String(reasonHint || '').includes('cold') ? reasonHint : 'cold-stream')
          : (stuckZero ? 'lux-stuck-zero' : reasonHint));
      this._ensureCeilingFindSwitchOn(reason).catch(() => {});
      this._queryCeilingPresenceDps(reason).catch(() => {});
    } catch (_e) { /* soft */ }
  }

  /**
   * WHY(P2690 / GH#550 @ 9.0.1145): alarms still update (DP1) while lux last-changed
   * hours ago and distance stuck at 0 — find_switch OFF / DP103 silent.
   * Contre quoi: lux-only nudge never runs when illuminance RX is dead.
   * WHY(P2705): split lux vs distance — HiepSVG lux dead while distance still moves.
   */
  _ceilingLuxIsCold(now = Date.now()) {
    try {
      const cfg = this._getRadarConfig() || {};
      if (!cfg.enableFindSwitchOnBoot) return false;
      const luxAt = this._lastLuxPaintAt || this._lastDp103LuxAt || 0;
      // WHY(P2715 / GH#550 @ 9.0.1207): lux "nearly dead" — re-arm sooner than 90s
      return !luxAt || (now - luxAt) > 45_000;
    } catch (_e) {
      return false;
    }
  }

  _ceilingDistanceIsCold(now = Date.now()) {
    try {
      const cfg = this._getRadarConfig() || {};
      if (!cfg.enableFindSwitchOnBoot) return false;
      const distAt = this._lastDistancePaintAt || 0;
      const dist = Number(this._lastDistanceM);
      return !distAt
        || (now - distAt) > 90_000
        || (Number.isFinite(dist) && dist <= 0.3);
    } catch (_e) {
      return false;
    }
  }

  _ceilingStreamsAreCold(now = Date.now()) {
    return this._ceilingLuxIsCold(now) && this._ceilingDistanceIsCold(now);
  }

  _armCeilingColdStreamWatchdog() {
    try {
      if (this._ceilingColdWatchArmed) return;
      const cfg = this._getRadarConfig() || {};
      if (!cfg.enableFindSwitchOnBoot) return;
      const { safeSetInterval } = require('../../lib/utils/safe-timers');
      if (typeof safeSetInterval !== 'function') return;
      this._ceilingColdWatchArmed = true;
      this._ceilingColdWatchTimer = safeSetInterval(this, () => {
        if (this._destroyed) return;
        // WHY(P2744 / GH#550 C14): measures hung for several minutes — also heal when
        // any stream went silent ≥90s even if not fully "cold" by both lux+distance.
        const now = Date.now();
        const luxAge = this._lastLuxPaintAt ? now - this._lastLuxPaintAt : Infinity;
        const distAge = this._lastDistancePaintAt ? now - this._lastDistancePaintAt : Infinity;
        const hung = luxAge > 90_000 || distAge > 90_000;
        if (!hung && !this._ceilingStreamsAreCold() && !this._ceilingLuxIsCold()) return;
        this.log('[RADAR] P2690/P2744 cold/hang watchdog → re-arm find_switch + requestDPs');
        this._nudgeCeilingDistanceArmFromLux(
          hung ? 'hang-watchdog' : (this._ceilingStreamsAreCold() ? 'cold-watchdog' : 'lux-cold-watchdog'),
        );
      }, 30_000);
    } catch (_e) { /* soft */ }
  }

  async _queryCeilingPresenceDps(reason = 'boot') {
    try {
      const mgr = this.tuyaEF00Manager;
      // WHY(P2604): V3 lux = DP103; keep 9/101 for find_switch + distance
      // WHY(P2617 / GH#550): also nudge DP10 (soft sibling) when lux goes quiet after tip bump
      const dps = [1, 9, 10, 101, 103];
      if (mgr && typeof mgr.requestDPs === 'function') {
        this.log(`[RADAR] P2600 requestDPs [${dps.join(',')}] (${reason})`);
        await mgr.requestDPs(dps).catch(() => {});
        return true;
      }
      if (mgr && typeof mgr.requestDP === 'function') {
        for (const dp of dps) {
          await mgr.requestDP(dp, { force: true }).catch(() => {});
        }
        return true;
      }
      if (typeof this.tuyaDataQuery === 'function') {
        await this.tuyaDataQuery(dps, { logPrefix: '[RADAR-P2600]', delayBetweenQueries: 40 }).catch(() => {});
        return true;
      }
    } catch (_e) { /* soft */ }
    return false;
  }

  /**
   * WHY(P2597 / GH#550): compose still lists onoff/button.1 for relay MTG siblings.
   * Ceiling no-relay tiles get Missing capability Listener until strip lands — soft
   * no-op listeners prevent UI errors without driving a phantom relay.
   */
  _registerPhantomRelaySoftListeners() {
    try {
      const cfg = this._getRadarConfig() || {};
      const mfr = String(this.getSetting?.('zb_manufacturer_name') || '').toLowerCase();
      const noRelay = cfg.hasRelay === false || /gkfbdvyx|laokfqwu|ya4ft0w4/.test(mfr);
      if (!noRelay) return;
      if (this.hasCapability('onoff') && !this._phantomOnoffListener) {
        this._phantomOnoffListener = true;
        this.registerCapabilityListener('onoff', async () => {
          this.log('[RADAR] P2597 ignore phantom Channel 1 (no relay)');
          return true;
        });
      }
      if (this.hasCapability('button.1') && !this._phantomButtonListener) {
        this._phantomButtonListener = true;
        this.registerCapabilityListener('button.1', async () => true);
      }
    } catch (_e) { /* soft */ }
  }

  /**
   * WHY(P2589/P2591 Module 4 Clear Presence): manual / Flow clear when ghost presence
   * or MCU stuck Occupied — paint Homey absent + arm sticky-DP1 ignore (no unplug).
   */
  async clearStuckPresence(opts = {}) {
    const config = this._getRadarConfig() || {};
    const source = opts.source || 'manual';
    this.log(`[RADAR] P2589/P2590 clearStuckPresence (${source})`);
    this._clearSurvivalWatchdog();
    try { this._armStickyDp1Ignore(config); } catch (_e) { /* soft */ }
    try { this._healForcedOccupiedSensorMode(config); } catch (_e2) { /* soft */ }
    this._lastPresenceFlowEdge = true;
    await this._commitPresenceAndFlows(false);
    return true;
  }

  /**
   * Prompt API Module 4 — forceClearPresence()
   * Cancels survival watchdog and forces alarm_motion = false (ZHA-style Clear Presence).
   */
  async forceClearPresence() {
    return this.clearStuckPresence({ source: 'forceClearPresence' });
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    // WHY(P2579): single onSettings — prior duplicate method left DynCap heal unreachable.
    try {
      if (typeof super.onSettings === 'function') {
        await super.onSettings({ oldSettings, newSettings, changedKeys });
      }
    } catch (_e) { /* soft */ }

    const config = this._getRadarConfig() || {};
    if (config.dpMap) {
      for (const key of changedKeys || []) {
        if (key === 'clear_presence_now') continue;
        const dpId = Object.keys(config.dpMap).find((id) => config.dpMap[id].setting === key);
        if (!dpId) continue;
        let value = newSettings[key];
        const dpConfig = config.dpMap[dpId];
        value = this._toRadarDPValue(value, dpConfig);
        const dpType = this._getRadarDPType(dpConfig);
        this.log(`[RADAR] Syncing ${key} → DP${dpId} value=${value}`);
        const sent = await this._sendRadarDP(parseInt(dpId, 10), value, dpType);
        if (!sent) {
          this.error(`[RADAR] Failed syncing ${key} to DP${dpId}`);
        }
      }
    }

    // WHY(P2589): maintenance checkbox — clear stuck presence without unplug
    if ((changedKeys || []).includes('clear_presence_now') && newSettings.clear_presence_now === true) {
      await this.clearStuckPresence({ source: 'settings' }).catch(() => {});
      try {
        await this.setSettings({ clear_presence_now: false });
      } catch (_e) { /* soft */ }
    }

    // Settings writes touch DP2/3/102 — never let DynCap reinvent curtain from those values
    this._armRadarDynCapGuards();
    await this._healRadarPhantomCaps();
  }

  /**
   * v9.0.249 (P59): Bind ZCL clusters to Homey for sleepy radar devices.
   * Mirrors sensor_presence_radar (line 826-834). Best-effort: each
   * .bind() is fire-and-forget; failures are logged but non-fatal.
   */
  _setupRadarClusterBinding(zclNode) {
    try {
      const ep1 = zclNode?.endpoints?.[1];
      if (!ep1) {
        this.log('[RADAR] No endpoint 1 — skipping cluster binding');
        return;
      }
      const clusters = [
        'iasZone', 'ssIasZone', 'genPowerCfg', 'powerConfiguration',
        'msIlluminanceMeasurement', 'msOccupancySensing',
        'msTemperatureMeasurement', 'msRelativeHumidity'
      ];
      let bound = 0;
      for (const cName of clusters) {
        const cl = ep1.clusters?.[cName];
        if (cl?.bind) {
          cl.bind().catch((e) => this.log(`[RADAR] bind ${cName} failed: ${e.message}`));
          bound++;
        }
      }
      this.log(`[RADAR] Cluster binding initiated (${bound} clusters)`);
    } catch (e) {
      this.log('[RADAR] Cluster binding skipped:', e.message);
    }
  }

  _ensureInference() {
    if (!this._inference) {
      this._inference = new IntelligentPresenceInference(this);
    }
    return this._inference;
  }

  _ensureDiscovery() {
    if (!this._discovery) {
      this._discovery = new IntelligentDPAutoDiscovery(this);
    }
    return this._discovery;
  }

  async _applyRadarCapabilityProfile() {
    const requiredCaps = new Set(this.sensorCapabilities);
    // WHY(P2575 / VicHY #2247): always keep relay onoff on required set for MTG family
    // even if dpMap race left sensorCapabilities without it for one tick.
    try {
      const cfg = this._getRadarConfig() || {};
      const mfr = (MfrHelper.getManufacturerName(this) || '').toLowerCase();
      if (cfg.hasRelay || MTG_RELAY_MFR_RE.test(mfr)) {
        requiredCaps.add('onoff');
      }
    } catch (_e) { /* soft */ }
    // WHY(P2490 / VicHY complementary): also list curtain phantoms in staleCaps so
    // profile apply strips them even if _healRadarPhantomCaps races / store DynCap lags.
    const staleCaps = [
      'measure_battery',
      'alarm_battery',
      'tuya_battery_low',
      'measure_temperature',
      'measure_humidity',
      'windowcoverings_set',
      'windowcoverings_state',
      'windowcoverings_tilt_set',
      'dim',
      // WHY(P2575): do NOT list onoff here — requiredCaps gate already protects hasRelay
      'alarm_motion.zone1',
      'alarm_motion.zone2',
      'alarm_motion.zone3',
      'measure_luminance.distance.zone1',
      'measure_luminance.distance.zone2',
      'measure_luminance.distance.zone3',
      'measure_motion.classification',
    ];
    // WHY(P2581 / VicHY #2247 8d9d0199): NEVER push onoff into staleCaps when mfr/config
    // is still empty after tip update — that race deleted the bathroom relay button.
    // WHY(P2595 / GH#550 gkfbdvyx): mainsPowered alone must NOT keep Channel 1 —
    // ceiling 24G has no relay; keepRelay only for hasRelay / MTG family / compose relay.
    try {
      const cfg = this._getRadarConfig() || {};
      const mfr = (MfrHelper.getManufacturerName(this) || '').toLowerCase();
      const noRelayCeiling = cfg.hasRelay === false
        || /gkfbdvyx|laokfqwu|ya4ft0w4/.test(mfr);
      const composeOn = Array.isArray(this.driver?.manifest?.capabilities)
        && this.driver.manifest.capabilities.includes('onoff');
      const keepRelay = !noRelayCeiling && (
        cfg.hasRelay === true
        || MTG_RELAY_MFR_RE.test(mfr)
        || (composeOn && cfg.hasRelay !== false && !/gkfbdvyx|laokfqwu|ya4ft0w4/.test(mfr))
      );
      if (keepRelay) {
        try { this.setStoreValue?.('radar_has_relay', true).catch(() => {}); } catch (_e) { /* soft */ }
      }
      if (!keepRelay) {
        staleCaps.push('onoff', 'button.1', 'button');
      }
    } catch (_e) { /* soft — do not push onoff */ }

    for (const cap of requiredCaps) {
      if (!this.hasCapability(cap)) {
        await this.addCapability(cap).catch(e => this.log(`[RADAR] Could not add ${cap}: ${e.message}`));
      }
    }

    for (const cap of staleCaps) {
      if (this.hasCapability(cap) && !requiredCaps.has(cap)) {
        await this.removeCapability(cap).catch(e => this.log(`[RADAR] Could not remove stale ${cap}: ${e.message}`));
      }
    }

    if (this.mainsPowered) {
      // P120 / P2472a: always strip phantom energy/climate caps on mains radars (clrdrnya / MTG075)
      for (const phantom of ['measure_battery', 'alarm_battery', 'tuya_battery_low', 'measure_temperature', 'measure_humidity']) {
        if (this.hasCapability(phantom)) {
          await this.removeCapability(phantom).catch(e => this.log(`[RADAR] Could not strip phantom ${phantom}: ${e.message}`));
        }
      }
      await this.setStoreValue('powerSource', 'mains').catch(() => {});
      await this.setStoreValue('battery', false).catch(() => {});
      if (typeof this.setEnergy === 'function') {
        await this.setEnergy({ batteries: null, mains: true }).catch(() => {});
      }
    } else if (requiredCaps.has('measure_battery') && typeof this.setEnergy === 'function') {
      // WHY(P2472a): compose no longer declares energy.batteries — battery HOBEIAN radars
      // must opt-in at runtime so Homey Energy UI stays correct without poisoning mains.
      await this.setEnergy({
        batteries: ['CR2032', 'CR2450', 'AAA', 'AA', 'CR123A', 'INTERNAL'],
      }).catch(() => {});
    }
  }

  _registerRadarCapabilityListeners() {
    const config = this._getRadarConfig();
    if (!config.hasRelay || !this.hasCapability('onoff') || this._radarRelayListenerRegistered) {return;}

    try {
      this.registerCapabilityListener('onoff', async (value) => {
        const dp = Number(config.relayDp || 108);
        const sent = await this._sendRadarDP(dp, value ? 1 : 0, config.relayType || 'enum');
        if (!sent) {
          throw new Error(`Relay DP${dp} write failed`);
        }
        return true;
      });
      this._radarRelayListenerRegistered = true;
      this.log(`[RADAR] Relay capability registered on DP${config.relayDp || 108}`);
    } catch (err) {
      this.log('[RADAR] Relay listener registration failed:', err.message);
    }
  }

  async _sendRadarDP(dp, value, type = 'value') {
    try {
      if (!this._radarDPSender) {
        this._radarDPSender = new UniversalDPSender(this);
      }
      return await this._radarDPSender.sendTuyaDP(dp, value, type);
    } catch (err) {
      this.error(`[RADAR] DP${dp} send failed:`, err.message);
      return false;
    }
  }

  _convertRadarSettingValue(value, mapping = {}) {
    if (mapping.enumMap && Object.prototype.hasOwnProperty.call(mapping.enumMap, value)) {
      return mapping.enumMap[value];
    }
    // WHY(P2583 / GH#547): Z2M ÷100 vs ZHA ×0.1 for near/far range DPs
    // WHY(P2648 crash mail): soft-require — missing module must never crash Homey app process
    if (mapping.radarRangeScale) {
      try {
        const { normalizeRadarRangeMeters } = require('../../lib/tuya/TuyaRadarRangeScale');
        const m = normalizeRadarRangeMeters(value, { maxMeters: mapping.maxMeters || 12 });
        return m != null ? m : value;
      } catch (err) {
        this.error?.('[RADAR] TuyaRadarRangeScale missing/soft-fail:', err?.message || err);
        return value;
      }
    }
    if (mapping.divisor && typeof value === 'number') {
      return value / mapping.divisor;
    }
    return value;
  }

  _toRadarDPValue(value, mapping = {}) {
    if (mapping.reverseEnumMap && Object.prototype.hasOwnProperty.call(mapping.reverseEnumMap, value)) {
      return mapping.reverseEnumMap[value];
    }
    // WHY(P2597 / Z2M#24831): 24G MTG detection_range <2.5m → unstable / dead radar
    try {
      const cfg = this._getRadarConfig?.() || {};
      const minM = Number(cfg.mtg24gMinDetectionRangeM);
      const setting = mapping.setting || '';
      if (minM > 0 && setting === 'detection_range' && typeof value === 'number' && value < minM) {
        this.log(`[RADAR] P2597 clamp detection_range ${value}→${minM}m (24G min)`);
        value = minM;
      }
    } catch (_eClamp) { /* soft */ }
    if (mapping.radarRangeScale) {
      // WHY(P2650): soft-require — missing module must not crash Homey on settings TX (stable crash mail)
      try {
        const { toRadarRangeTuyaValue } = require('../../lib/tuya/TuyaRadarRangeScale');
        return toRadarRangeTuyaValue(value, { maxMeters: mapping.maxMeters || 12 });
      } catch (_eScale) {
        this.error?.('[RADAR] TuyaRadarRangeScale missing — fallback divisor TX');
        const div = Number(mapping.divisor) > 0 ? Number(mapping.divisor) : 100;
        return Math.round(Number(value) * div);
      }
    }
    if (mapping.divisor && typeof value === 'number') {
      // WHY(P2580 / Z2M#32561 MTG275): detection_range TX must be unsigned scaled int
      const { toTuyaScaledUint } = require('../../lib/tuya/TuyaUnsignedValue');
      const setting = mapping.setting || '';
      const isRange = /range|distance|shield|detection/i.test(setting);
      if (isRange || mapping.unsignedScaled) {
        const max = Number(mapping.max) > 0 ? Math.round(Number(mapping.max) * mapping.divisor) : 800;
        return toTuyaScaledUint(value, mapping.divisor, { min: 0, max });
      }
      return Math.round(value * mapping.divisor);
    }
    return value;
  }

  _getRadarDPType(mapping = {}) {
    if (mapping.type === 'enum' || mapping.type === 'enum_onoff') {return 'enum';}
    if (mapping.type === 'bool' || mapping.type === 'presence_bool') {return 'bool';}
    return 'value';
  }

  _handleDP(dpId, rawValue) {
    const dp = parseInt(dpId, 10);
    const config = this._getRadarConfig();
    const mapping = config.dpMap?.[dp];

    // v10.9.0 (z2m/forum lesson): the ZY-M100-24GV3 firmware (_TZE204_ya4ft0w4)
    // emits 0 values in endless loops (documented firmware bug, no update
    // available). Drop 0-valued reports from THIS mfr on numeric DPs —
    // a real 0 (nobody present) is still surfaced via absence timeout,
    // not via the buggy stream.
    // WHY(P2715 / Z2M#12069 / GH#550): gkfbdvyx also floods bogus 0 on
    // move_sensitivity (DP2) / presence_sensitivity (DP102) — never overwrite
    // Homey settings or collapse range → "dead past 3.5m" lookalike.
    if (rawValue === 0 || rawValue === '0') {
      const mfr = String(this.getSetting?.('zb_manufacturer_name') || '').toLowerCase();
      if (mfr === '_tze204_ya4ft0w4' && mapping && mapping.type !== 'bool') {
        if (!this._zeroFilterLogCount) {this._zeroFilterLogCount = 0;}
        this._zeroFilterLogCount++;
        if (this._zeroFilterLogCount <= 3 || this._zeroFilterLogCount % 60 === 0) {
          this.log(`[RADAR] Zero-value report dropped (ZY-M100 firmware bug, DP${dp})`);
        }
        return;
      }
      if (/gkfbdvyx|ya4ft0w4|laokfqwu/.test(mfr) && (dp === 2 || dp === 102)) {
        this.log(`[RADAR] P2715 drop bogus sensitivity 0 (DP${dp})`);
        return;
      }
    }

    if (mapping) {
      this._sendTimeSyncIfNeeded?.();
      this.updateRadioActivity?.();
      const value = this._parseValue ? this._parseValue(rawValue) : rawValue;
      return this._handleStaticDP(dp, value, mapping, config);
    }

    return super._handleDP(dpId, rawValue);
  }

  /**
   * Main Tuya DP processing entry point
   */
  onTuyaDP(dpId, value, dpType) {
    const config = this._getRadarConfig();
    const dp = parseInt(dpId, 10);
    const mapping = config.dpMap?.[dp];

    // v10.9.0: same ZY-M100 zero-filter as _handleDP (both entry points)
    if (value === 0 || value === '0') {
      const mfr = String(this.getSetting?.('zb_manufacturer_name') || '').toLowerCase();
      if (mfr === '_tze204_ya4ft0w4' && mapping && mapping.type !== 'bool') {
        return;
      }
      // WHY(P2715 / Z2M#12069): drop bogus sensitivity 0 on ceiling V3
      if (/gkfbdvyx|ya4ft0w4|laokfqwu/.test(mfr) && (dp === 2 || dp === 102)) {
        return;
      }
    }

    // 1. Process via static config if matched
    if (mapping) {
      const parsedValue = this._parseValue ? this._parseValue(value) : value;
      return this._handleStaticDP(dp, parsedValue, mapping, config);
    }

    // 2. Fallback: Intelligent Auto-Discovery
    // WHY(P2618 / GH#550 Gmail Repair): discovery invents battery/zones/temp on ceiling
    // V3 (OCR: Battery 7%, Button 1, Zone 1–3) — skip for gkfbdvyx family.
    try {
      const mfr = String(this.getSetting?.('zb_manufacturer_name') || '').toLowerCase();
      if (/gkfbdvyx|ya4ft0w4|laokfqwu/.test(mfr) || (config && config.hasRelay === false && config.enableFindSwitchOnBoot)) {
        this.log(`[RADAR] P2618 skip auto-discovery DP${dpId}=${value} (ceiling V3)`);
        return;
      }
    } catch (_e) { /* soft */ }
    const discovery = this._ensureDiscovery();
    const discovered = discovery.analyzeDP(dp, value);
    if (discovered && discovered.confidence >= 60) {
      const result = discovery.applyDiscoveredValue(dp, value);
      if (result) {
        this.log(`[RADAR] 🧠 Auto-Discovery: DP${dpId} → ${result.capability}=${result.value} (${result.confidence}%)`);
        return this.safeSetCapabilityValue(result.capability, result.value).catch(() => { });
      }
    }

    // 3. Diagnostic logging for unknown DPs
    this.log(`[RADAR] 📊 Unknown DP${dpId} [type=${dpType}] = ${value}`);
  }

  /**
   * WHY(P2389/P2590 Module 1 Anti-Spam): coalesce chatty telemetry DPs (distance/lux)
   * without delaying presence (DP1). Firmware still TX on air — this only protects
   * Homey CPU/flows/UI and reduces missed clear frames on saturated mesh.
   * Spec: distance Δ>0.1m OR ≥5s; lux Δ>5 OR ≥10s (MTG075_ZB_RL_RELAY defaults).
   * @returns {boolean} true = skip capability commit
   */
  _shouldSkipFloodCalmDp(dpId, numericValue, config) {
    if (!config?.floodCalm && !config?.dpThrottleMs) {return false;}
    const dp = Number(dpId);
    const throttleMs = config.dpThrottleMs?.[dp];
    if (!throttleMs) {return false;}
    if (!this._radarDpCalm) {this._radarDpCalm = Object.create(null);}
    const now = Date.now();
    const last = this._radarDpCalm[dp] || { t: 0, v: null };
    const minDelta = config.dpMinDelta?.[dp];
    const elapsed = now - last.t;

    if (elapsed >= throttleMs) {
      this._radarDpCalm[dp] = { t: now, v: numericValue };
      return false;
    }
    // Inside window: allow only significant telemetry jumps (e.g. person moved far)
    if (minDelta != null && Number.isFinite(numericValue) && last.v != null
      && Math.abs(numericValue - last.v) >= minDelta) {
      this._radarDpCalm[dp] = { t: now, v: numericValue };
      return false;
    }
    return true;
  }

  /**
   * Handle DPs defined in the SENSOR_CONFIGS
   */
  _handleStaticDP(dpId, value, mapping, config) {
    // A. Handle presence DPs
    if (mapping.cap === 'alarm_motion') {
      const inference = this._ensureInference();
      // v9.7.6: Use enumMap from mapping if available (e.g., gkfbdvyx: {0:false, 1:true, 2:true})
      // WHY(P2719 / Z2M): raw 0=none, 1=presence, 2=move — split motion vs human on ceiling
      const rawEnum = (typeof value === 'number') ? value : null;
      let presence;
      if (mapping.enumMap) {
        if (typeof value === 'boolean') {
          // v8.0.1: Bool frames are unambiguous per Z2M binary presence
          // semantics (true = present). A numeric enumMap would silently
          // invert booleans (enumMap[true] → enumMap["1"]) — forum bug
          // ka8l86iu "motion but no presence".
          presence = value;
        } else {
          presence = mapping.enumMap[value] !== undefined ? mapping.enumMap[value] : !!value;
        }
        if (config.invertPresence) { presence = !presence; }
      } else {
        presence = transformPresence(value, mapping.type, config.invertPresence, config.configName);
      }

      // WHY(P2600 / ZHA DP104 motion_state): none/clear must not wipe lux/DP1 presence
      // while find_switch warms and DP9 is still "-".
      if (mapping.ignorePresenceClear === true && (presence === false || presence === 0)) {
        this.log(`[RADAR] P2600 ignore presence clear from DP${dpId} (motion_state)`);
        return;
      }

      // WHY(P2719 / GH#550 @ 9.0.1222): split motion (move) vs presence (still human)
      if (config.splitMotionPresence === true && rawEnum != null && mapping.enumMap) {
        if (rawEnum === 2) {
          this._commitPresenceAndFlows(true, { motion: true });
          if (config.enableFindSwitchOnBoot) this._nudgeCeilingDistanceArmFromLux('presence-cold');
          return;
        }
        if (rawEnum === 1) {
          // Still present — keep human, clear motion (no 1s flicker wipe of presence)
          this._commitPresenceAndFlows(true, { motion: false });
          if (config.enableFindSwitchOnBoot) this._nudgeCeilingDistanceArmFromLux('presence-cold');
          return;
        }
        if (rawEnum === 0) {
          // Clear motion immediately; human clears via departure_delay / soft-clear / zero-dist
          this.safeSetCapabilityValue('alarm_motion', false).catch(() => {});
          if (this._distanceCorroboratesPresence()) {
            this.log('[RADAR] P2719 DP1 none — keep human (distance corroborates)');
            this._nudgeSurvivalWatchdog('presence');
          } else {
            this._nudgeSurvivalWatchdog('dp1-none');
          }
          return;
        }
      }

      // Integrate with inference engine if needed
      // WHY(P2453): pass unreliable so sticky DP1 cannot pin alarm_motion forever
      // WHY(P2584): under Occupied+smart, DP1 is firmware-forced true — treat as unreliable
      const occupiedSmart = this._smartPresenceUnderOccupiedActive(config);
      const dp1Unreliable = !!mapping.unreliable || occupiedSmart;
      if (mapping.useInference) {
        presence = inference.updatePresenceDP(value, { unreliable: dp1Unreliable });
      } else {
        inference.updatePresenceDP(value, { unreliable: dp1Unreliable });
      }

      try { this.setStoreValue?.('radar_fw_presence', !!presence).catch(() => {}); } catch (_e) { /* soft */ }

      if (presence !== null) {
        // WHY(P2584): Occupied forces DP1=true forever — Homey presence owned by distance/lux
        if (occupiedSmart && (presence === true || presence === 1 || presence === 2)) {
          if (!this._distanceCorroboratesPresence()) {
            this.log('[RADAR] P2584 drop forced DP1 true (Occupied — wait distance/lux)');
            return;
          }
        }
        // WHY(P2577 / VicHY #2247 photos): bathroom sticky DP1 re-paints true after soft-clear.
        // Gate true through anti-FP; clears stay immediate.
        presence = this._gatePresenceAgainstFalsePositive(presence, config);
        if (presence === null) return;
        // WHY(P2524 / diag 74e5cae7): UI painted presence but declared presence_* flow
        // triggers were never fired (sibling sensor_presence_radar did). Edge-fire only.
        this._commitPresenceAndFlows(presence);
        // WHY(P2690 / GH#550): DP1 still moves while lux/distance cold → re-arm find_switch
        if (config.enableFindSwitchOnBoot) {
          this._nudgeCeilingDistanceArmFromLux('presence-cold');
        }
        return;
      }
      return;
    }

    // A2. Idea #21: Handle multi-zone presence DPs (alarm_motion.zone1/zone2/zone3)
    if (mapping.cap && mapping.cap.startsWith('alarm_motion.zone')) {
      const presence = transformPresence(value, mapping.type, config.invertPresence, config.configName);
      if (presence !== null) {
        this.log(`[RADAR] Zone ${mapping.zone} presence: ${presence}`);
        const prev = this.getCapabilityValue(mapping.cap);
        const p = this.safeSetCapabilityValue(mapping.cap, presence).catch(() => {});
        if (prev !== presence && presence === true) {
          this._triggerZonePresenceFlow(mapping.zone);
        }
        return p;
      }
      return;
    }

    // A3. Idea #21: Handle movement classification DP
    if (mapping.cap === 'measure_motion.classification') {
      const classification = transformPresence(value, mapping.type, false, config.configName);
      this.log(`[RADAR] Movement classification: ${classification} (raw=${value})`);
      return this.safeSetCapabilityValue('measure_motion.classification', classification).catch(() => {});
    }

    // B. Handle distance DPs (feed inference)
    if (mapping.cap === 'measure_luminance.distance') {
      let distance = this._coerceDistanceMeters(value, mapping);
      if (distance == null) return;
      this._distanceSeenOnce = true;
      // WHY(P2640): meaningful = tracking actually ranged (>0.3m) — not cold 0m frames
      if (Number(distance) > 0.3) this._distanceSeenMeaningful = true;
      // WHY(P2722 / GH#550): keep pre-scale meters for soft-clear / corroboration /
      // motion re-arm; apply distanceDisplayScale only on Homey UI paint.
      const logicDistance = distance;
      // WHY(P2744 / GH#550 C14): mmWave often paints a farther ghost then corrects —
      // reject upward spikes while human YES and recent samples were trending closer.
      const gatedDistance = this._gateGhostFartherDistance(logicDistance, config);
      this._lastDistanceM = gatedDistance;
      this._lastDistancePaintAt = Date.now();
      this._noteDistanceSample(gatedDistance);
      // WHY(P2722): still-present MCU sticks DP1=1 — distance jump while human YES → motion YES
      this._rearmMotionFromDistanceDelta(gatedDistance, config);
      let paintDistance = gatedDistance;
      const displayScale = Number(config.distanceDisplayScale);
      if (Number.isFinite(displayScale) && displayScale > 0 && displayScale !== 1) {
        paintDistance = Math.round(gatedDistance * displayScale * 100) / 100;
      }
      const inferred = this._ensureInference().updateDistance(gatedDistance);
      // WHY(P2509 / Z2M#30785): gkfbdvyx sticks DP1=true while DP9=0m — clear Homey presence
      // WHY(P2640 / GH#550): never zero-clear until a meaningful distance was seen —
      // find_switch OFF paints DP9=0 forever and would wipe lux/DP1 presence.
      if (config.clearPresenceOnZeroDistance && Number(gatedDistance) <= 0.05) {
        if (this._distanceSeenMeaningful === true) {
          this._commitPresenceAndFlows(false);
        }
      } else if (config.syncPresenceFromDistanceInference && typeof inferred === 'boolean') {
        const painted = this.getCapabilityValue('alarm_motion') === true
          || this.getCapabilityValue('alarm_human') === true;
        // WHY(P2719): after soft-clear, ghost stagnant distance must not re-assert presence
        const ignoreActive = this._ignoreStickyDp1Until && Date.now() < this._ignoreStickyDp1Until;
        if (inferred === true && ignoreActive && !this._distanceCorroboratesPresence()) {
          this.log('[RADAR] P2719 skip distance→presence (sticky-ignore / ghost)');
        } else if (painted !== inferred) {
          this._commitPresenceAndFlows(inferred);
        }
      } else {
        // WHY(P2584): Occupied mode — DP1 useless; paint Homey presence from distance motion
        this._applySmartPresenceUnderOccupied(gatedDistance, inferred, config);
      }
      // WHY(P2575 / VicHY #2247 bathroom): DP1 can stick true while empty room distance≈0.
      // Soft clear after sustained zero distance (default 90s) — does not fight P2534
      // instantaneous flip-flop (needs sustained empty, not single DP9=0 frame).
      this._softClearStuckPresenceOnZeroDistance(gatedDistance, config);
      // WHY(P2389): still feed inference every frame; only coalesce Homey capability writes
      if (this._shouldSkipFloodCalmDp(dpId, gatedDistance, config)) {return;}
      // WHY(P2590 Module 2): meaningful distance while Occupied = sign of life → rearm
      this._nudgeSurvivalWatchdog('distance');
      // WHY(P2599 / VicHY #2252 OCR): keep units string on every paint
      this._ensureDistanceUnitsString('dp9').catch(() => {});
      return this.safeSetCapabilityValue('measure_luminance.distance', paintDistance).catch(() => {});
    }

    // B2. Idea #21: Handle multi-zone distance DPs (measure_luminance.distance.zone1/zone2/zone3)
    if (mapping.cap && mapping.cap.startsWith('measure_luminance.distance.zone')) {
      let distance;
      if (mapping.smartDivisor === true) {
        const { smartParse } = require('../../lib/managers/SmartDivisorManager');
        distance = smartParse(value, dpId, { capability: mapping.cap });
      } else {
        distance = value / (mapping.divisor || 100);
      }
      this.log(`[RADAR] Zone ${mapping.zone} distance: ${distance}m`);
      return this.safeSetCapabilityValue(mapping.cap, distance).catch(() => {});
    }

    // C. Handle illuminance DPs
    if (mapping.cap === 'measure_luminance') {
      let lux = value;
      if (mapping.type === 'lux_direct') {lux = value;}
      else if (mapping.smartDivisor === true) {
        const { smartParse } = require('../../lib/managers/SmartDivisorManager');
        lux = smartParse(value, dpId, { capability: 'measure_luminance' });
      } else if (mapping.divisor) {lux = value / mapping.divisor;}

      // WHY(P2617 / GH#550 @ 9.0.1097): DP10 junk (lux=1) must not overwrite fresh DP103.
      // Prefer V3 illuminance; keep DP10 only when DP103 has been quiet ≥45s.
      const nowLux = Date.now();
      if (Number(dpId) === 103) {
        this._lastDp103LuxAt = nowLux;
        this._lastDp103Lux = lux;
        this._lastLuxPaintAt = nowLux;
      } else if (Number(dpId) === 10) {
        const recent103 = this._lastDp103LuxAt && (nowLux - this._lastDp103LuxAt) < 45_000;
        if (recent103) {
          this.log(`[RADAR] P2617 skip DP10 lux=${lux} (DP103 preferred)`);
          this._nudgeCeilingDistanceArmFromLux();
          return;
        }
      }

      const luxInferred = this._ensureInference().updateLux(lux);
      // WHY(P2600 / GH#550): lux stream alive while DP9 never seen → re-arm find_switch
      this._nudgeCeilingDistanceArmFromLux();
      // WHY(P2584): lux step still corroborates entry while Occupied forces DP1
      if (this._smartPresenceUnderOccupiedActive(config) && !this.getCapabilityValue('alarm_motion')) {
        if (this._distanceCorroboratesPresence()
            || (luxInferred === true && this._distanceCorroboratesPresence())) {
          this.log('[RADAR] P2584 smart presence=true (lux corroboration under Occupied)');
          this._commitPresenceAndFlows(true);
        }
      }
      // WHY(P2595 / GH#550): gkfbdvyx lux floods while DP9 null — paint presence from lux rate
      // WHY(P2600): also accept lux-cadence soft present while find_switch warms
      // WHY(P2617): never lux-force absent while distance still indicates someone
      if (config.syncPresenceFromLuxInference && typeof luxInferred === 'boolean') {
        const painted = this.getCapabilityValue('alarm_motion') === true
          || this.getCapabilityValue('alarm_human') === true;
        if (painted !== luxInferred) {
          if (luxInferred === false && this._distanceCorroboratesPresence()) {
            this.log('[RADAR] P2617 keep presence (distance corroborates; lux quiet)');
          } else if (luxInferred === true && this._ignoreStickyDp1Until
              && Date.now() < this._ignoreStickyDp1Until
              && !this._distanceCorroboratesPresence()) {
            this.log('[RADAR] P2719 skip lux→presence (sticky-ignore)');
          } else {
            this._commitPresenceAndFlows(luxInferred);
          }
        }
      }
      if (this._shouldSkipFloodCalmDp(dpId, lux, config)) {return;}
      this._nudgeSurvivalWatchdog('lux');
      // WHY(P2743 / GH#550 @ 9.0.1243): MCU often skips DP1 enum 2 after stillness;
      // distance Δ can stay <0.05m while walking in place — lux steps still prove move.
      this._rearmMotionFromLuxDelta(lux, config);
      return this.safeSetCapabilityValue('measure_luminance', lux).catch(() => {});
    }

    // C2. Handle relay status DPs.
    if (mapping.cap === 'onoff') {
      let relayOn;
      if (mapping.enumMap && Object.prototype.hasOwnProperty.call(mapping.enumMap, value)) {
        relayOn = mapping.enumMap[value];
      } else {
        relayOn = value === true || value === 1 || value === '1' || value === 'ON' || value === 'on';
      }
      return this.safeSetCapabilityValue('onoff', !!relayOn).catch(() => {});
    }

    // D. Handle battery DPs - ignore for mains-powered radars
    if (mapping.cap === 'measure_battery') {
      if (this.mainsPowered) {
        this.log(`[RADAR] Ignoring battery DP${dpId} on mains-powered radar`);
        return;
      }
      let battery;
      if (mapping.smartDivisor === true) {
        const { smartParse } = require('../../lib/managers/SmartDivisorManager');
        battery = smartParse(value, dpId, { capability: 'measure_battery' });
      } else {
        battery = value / (mapping.divisor || 1);
      }
      return this.safeSetCapabilityValue('measure_battery', Math.min(100, battery)).catch(() => {});
    }

    // E. Setting/internal feedback DPs: store the decoded value for diagnostics.
    if (!mapping.cap && (mapping.setting || mapping.internal)) {
      const key = mapping.setting || mapping.internal;
      const converted = this._convertRadarSettingValue(value, mapping);
      this.setStoreValue(`radar_${key}`, converted).catch(() => {});
      if (mapping.setting === 'sensor_mode') {
        this._radarSensorMode = converted;
        // WHY(P2579 / Z2M): occupied locks presence forever — note for soft-clear heal
        if (converted === 'occupied' || converted === 2 || converted === '2') {
          this.log('[RADAR] P2579 DP115 sensor_mode=occupied (forces permanent presence)');
          // WHY(P2584): arm sticky-DP1 ignore so Homey presence switches to distance/lux overlay
          if (this._smartPresenceUnderOccupiedActive(config)) {
            this._armStickyDp1Ignore(config);
            this.log('[RADAR] P2584 Occupied+smart: Homey presence from distance/lux (DP1 ignored)');
          }
        }
      }
      if (mapping.setting && this.getSetting?.(mapping.setting) !== undefined) {
        this.setSettings({ [mapping.setting]: converted }).catch(() => {});
      }
    }
  }

  /**
   * Initialize polling and time sync
   */
  _startInitializationCycle(zclNode) {
    if (!zclNode?.endpoints?.[1]) {
      this.log('[RADAR] No endpoint 1 available - deferring initialization');
      // Retry after delay for connection failures
      this.homey.setTimeout(() => {
        if (this._destroyed) {return;}
        this.log('[RADAR] Retrying initialization after connection delay...');
        try {
          this._sendTimeSync(zclNode);
          this._requestDPRefresh(zclNode);
        } catch (e) {
          this.log('[RADAR] Deferred init failed:', e.message);
        }
      }, 5000);
      return;
    }

    // 1. Time Sync
    this.homey.setTimeout(() => { if (this._destroyed) {return;} this._sendTimeSync(zclNode); }, 2000);

    // 2. DP Refresh
    this.homey.setTimeout(() => { if (this._destroyed) {return;} this._requestDPRefresh(zclNode); }, 3000);

    if (this._getRadarConfig().needsPolling === false) {
      this.log('[RADAR] Periodic DP polling disabled by device profile');
      return;
    }

    // 3. Periodic polling (config.pollIntervalMs or 60s)
    const pollMs = Number(this._getRadarConfig()?.pollIntervalMs) > 0
      ? Number(this._getRadarConfig().pollIntervalMs) : 60000;
    this._pollingInterval = this.homey.setInterval(() => {
      if (this._destroyed) { return; }
      this._requestDPRefresh(zclNode);
    }, pollMs);
  }

  /**
   * Logic for sending time sync to Tuya devices
   */
  async _sendTimeSync(zclNode) {
    try {
      const ep1 = zclNode?.endpoints?.[1];
      const tuya = ep1?.clusters?.tuya || ep1?.clusters?.[61184];
      if (!tuya || !tuya.command) {return;}

      const ZIGBEE_EPOCH = new Date(Date.UTC(2000, 0, 1, 0, 0, 0)).getTime();
      const utcSeconds = Math.floor((Date.now() - ZIGBEE_EPOCH) / 1000);
      const localSeconds = utcSeconds + (-new Date().getTimezoneOffset() * 60);

      const payload = Buffer.alloc(8);
      payload.writeUInt32BE(utcSeconds, 0);
      payload.writeUInt32BE(localSeconds, 4);

      await tuya.command('mcuSyncTime', { payloadSize: 8, payload }).catch(() => {});
      this.log('[RADAR] ⏰ Time sync sent');
    } catch (e) {
      this.error('[RADAR] Time sync failed:', e.message);
    }
  }

  async _requestDPRefresh(zclNode) {
    try {
      // WHY(P2600 / GH#550): EF00 targeted query first — native dataQuery alone
      // left presence/distance dead while lux (DP103) kept streaming.
      // WHY(P2690 / GH#550 @ 9.0.1145): query alone does not re-enable DP101 —
      // when lux+distance are cold, force find_switch ON then requestDPs.
      const cfg = this._getRadarConfig() || {};
      if (cfg.enableFindSwitchOnBoot || this.forceActiveTuyaMode) {
        // WHY(P2705): lux-only cold → still re-arm (distance may still tick)
        if (this._ceilingStreamsAreCold() || this._ceilingLuxIsCold()) {
          this._nudgeCeilingDistanceArmFromLux(
            this._ceilingStreamsAreCold() ? 'poll-cold' : 'poll-lux-cold',
          );
          return;
        }
        const ok = await this._queryCeilingPresenceDps('poll');
        if (ok) return;
      }
      const ep1 = zclNode?.endpoints?.[1];
      const tuya = ep1?.clusters?.tuya || ep1?.clusters?.[61184];
      if (tuya?.dataQuery) {
        await tuya.dataQuery().catch(() => {});
      }
    } catch (e) {
      this.error('[RADAR] DP refresh failed:', e.message);
    }
  }

  /**
   * WHY(P2581 / VicHY #2247 diag 8d9d0199): soft-clear was only invoked from DP9 handler.
   * MTG floodCalm throttles distance + needsPolling:false → sticky Sí forever in empty
   * bathrooms. Tick every ~15s using last distance / absent telemetry.
   */
  _armStickyPresenceWatchdog() {
    try {
      if (this._presenceWatchdogArmed) return;
      const config = this._getRadarConfig() || {};
      // WHY(P2705 / GH#550 HiepSVG): ceiling gkfbdvyx had no floodCalm/relay → sticky hung
      if (!(config.antiFalsePositive || config.hasRelay || config.floodCalm
        || config.enableFindSwitchOnBoot || config.survivalWatchdog === true)) return;
      const { safeSetInterval } = require('../../lib/utils/safe-timers');
      const period = Number(config.stickyPresenceWatchdogMs) > 0
        ? Number(config.stickyPresenceWatchdogMs) : 15_000;
      this._presenceWatchdogArmed = true;
      // WHY(P2582 / OCR): store handle — safeSetInterval does not auto-clear on delete.
      this._presenceWatchdogTimer = safeSetInterval(this, () => {
        try {
          if (this._destroyed) return;
          const cfg = this._getRadarConfig() || config;
          this._ensureRelayOnoffCapability().catch(() => {});
          const present = this.getCapabilityValue?.('alarm_motion') === true
            || this.getCapabilityValue?.('alarm_human') === true;
          if (!present) return;
          const d = Number(this._lastDistanceM);
          const now = Date.now();
          // WHY(P2582 / OCR): never treat "never received DP9" as age=Infinity —
          // that cleared bathroom presence on first tick for distance-less paths.
          if (!this._lastDistanceAt) return;
          const age = now - this._lastDistanceAt;
          if (Number.isFinite(d)) {
            this._softClearStuckPresenceOnZeroDistance(d, cfg);
            return;
          }
          // Had distance once, then silent ≥90s while still "present" → clear
          if (age >= 90_000) {
            this.log('[RADAR] P2581 soft-clear (watchdog: no distance corroboration)');
            this._armStickyDp1Ignore(cfg);
            this._healForcedOccupiedSensorMode(cfg);
            this._commitPresenceAndFlows(false);
          }
        } catch (_e) { /* soft */ }
      }, period);
      this.log(`[RADAR] P2581 sticky-presence watchdog armed (${period}ms)`);
    } catch (_e) { /* soft */ }
  }

  _clearStickyPresenceWatchdog() {
    try {
      if (this._presenceWatchdogTimer) {
        const { safeClearInterval } = require('../../lib/utils/safe-timers');
        safeClearInterval(this, this._presenceWatchdogTimer);
      }
    } catch (_e) { /* soft */ }
    this._presenceWatchdogTimer = null;
    this._presenceWatchdogArmed = false;
  }

  /**
   * WHY(P2575/P2576 / VicHY #2247 diag 8d9d0199 @ 9.0.1021):
   * Bathroom walls keep a non-zero stagnant distance → zero-only clear never fires.
   * Soft-clear when (a) distance≈0 for softClearZeroDistanceMs OR (b) distance stable
   * within 0.2m for softClearStableDistanceMs while presence stuck true.
   * WHY(P2577): after soft-clear arm sticky-DP1 ignore until distance/lux corroborates
   * re-entry — Contre quoi firmware re-paints DP1=true every second in empty bathroom.
   * WHY(P2587): (c) bathroom VMC / shower glass — distance jitters slightly so stagnant
   * anchor never holds; micro-jitter soft-clear when span stays tiny for a long window.
   */
  _softClearStuckPresenceOnZeroDistance(distance, config) {
    try {
      // WHY(P2719 / GH#550): ceiling gkfbdvyx must soft-clear stagnant ghost distance
      // even when clearPresenceOnZeroDistance (instant ≈0 path) is also enabled.
      if (!(config?.floodCalm || config?.hasRelay || config?.antiFalsePositive
        || config?.survivalWatchdog === true || config?.enableFindSwitchOnBoot)) return;
      const d = Number(distance);
      const now = Date.now();
      if (!Number.isFinite(d)) return;

      const present = this.getCapabilityValue?.('alarm_motion') === true
        || this.getCapabilityValue?.('alarm_human') === true;
      if (!present) {
        this._zeroDistSinceMs = 0;
        this._stableDistSinceMs = 0;
        this._stableDistAnchor = null;
        this._quantizedStagnantSinceMs = 0;
        this._jitterSamples = null;
        return;
      }

      // (a) near-zero hold
      if (d <= 0.15) {
        if (!this._zeroDistSinceMs) this._zeroDistSinceMs = now;
        const zeroHold = Number(config.softClearZeroDistanceMs) > 0
          ? Number(config.softClearZeroDistanceMs) : 45_000;
        if (now - this._zeroDistSinceMs >= zeroHold) {
          this.log(`[RADAR] P2577 soft-clear (zero-distance≈${d}m for ${zeroHold}ms)`);
          this._zeroDistSinceMs = 0;
          this._stableDistSinceMs = 0;
          this._jitterSamples = null;
          this._armStickyDp1Ignore(config);
          this._healForcedOccupiedSensorMode(config);
          this._commitPresenceAndFlows(false);
          return;
        }
      } else {
        this._zeroDistSinceMs = 0;
      }

      // WHY(P2725 / GH#550 HiepSVG @ 9.0.1236): ceiling splitMotionPresence —
      // sitting still at d>1m (human YES, motion NO) is NORMAL, not bathroom wall ghost.
      // Stagnant/micro-jitter soft-clear was wiping presence + arming 120s sticky →
      // motion locked NO, human flapping YES, distance/lux felt "locked/slow".
      // Empty room still clears via path (a) near-zero distance.
      if (config.splitMotionPresence === true && d > 1.0) {
        this._stableDistSinceMs = 0;
        this._stableDistAnchor = d;
        this._quantizedStagnantSinceMs = 0;
        this._jitterSamples = null;
        return;
      }

      // (c) WHY(P2587): VMC / fan micro-motion — lux+distance still update, DP1 stuck true
      if (this._trySoftClearMicroJitter(d, now, config)) {
        return;
      }

      // (b) stagnant reflection (bathroom wall) — Contre quoi constant false presence
      const anchor = this._stableDistAnchor;
      if (anchor == null || Math.abs(d - anchor) > 0.2) {
        this._stableDistAnchor = d;
        this._stableDistSinceMs = now;
        // WHY(P2579 / Z2M#18677): MTG distance often jumps 0↔~2.8m with no intermediates —
        // still count quantized stagnation below.
        if (config.quantizedDistanceSoftClear && this._isQuantizedDistanceStagnant(now)) {
          const stableHoldQ = Number(config.softClearStableDistanceMs) > 0
            ? Number(config.softClearStableDistanceMs) : 60_000;
          if (!this._quantizedStagnantSinceMs) this._quantizedStagnantSinceMs = now;
          if (now - this._quantizedStagnantSinceMs >= stableHoldQ) {
            this.log('[RADAR] P2579 soft-clear (quantized distance stagnation)');
            this._quantizedStagnantSinceMs = 0;
            this._jitterSamples = null;
            this._armStickyDp1Ignore(config);
            this._healForcedOccupiedSensorMode(config);
            this._commitPresenceAndFlows(false);
          }
        } else {
          this._quantizedStagnantSinceMs = 0;
        }
        return;
      }
      if (!this._stableDistSinceMs) this._stableDistSinceMs = now;
      const stableHold = Number(config.softClearStableDistanceMs) > 0
        ? Number(config.softClearStableDistanceMs) : 60_000;
      if (now - this._stableDistSinceMs >= stableHold) {
        this.log(`[RADAR] P2577 soft-clear (stagnant distance≈${d}m for ${stableHold}ms)`);
        this._stableDistSinceMs = 0;
        this._stableDistAnchor = null;
        this._jitterSamples = null;
        this._armStickyDp1Ignore(config);
        this._healForcedOccupiedSensorMode(config);
        this._commitPresenceAndFlows(false);
      }
    } catch (_e) { /* soft */ }
  }

  /**
   * WHY(P2587): bathroom extract fan / vibrating glass resets the 0.2m stagnant anchor
   * forever while presence stays true. If rolling distance span stays ≤ maxSpan for
   * softClearMicroJitterMs → treat as empty-room micro-motion and soft-clear.
   * Contre quoi: lux/distance still tick, Homey WHEN never edges off.
   * @returns {boolean} true if soft-clear fired
   */
  _trySoftClearMicroJitter(distance, now, config) {
    try {
      if (!config?.antiFalsePositive && !config?.hasRelay) return false;
      const windowMs = Number(config.softClearMicroJitterWindowMs) > 0
        ? Number(config.softClearMicroJitterWindowMs) : 120_000;
      const holdMs = Number(config.softClearMicroJitterMs) > 0
        ? Number(config.softClearMicroJitterMs) : 90_000;
      const maxSpan = Number(config.softClearMicroJitterMaxSpanM) > 0
        ? Number(config.softClearMicroJitterMaxSpanM) : 0.45;
      if (!Array.isArray(this._jitterSamples)) this._jitterSamples = [];
      this._jitterSamples.push({ t: now, d: distance });
      this._jitterSamples = this._jitterSamples.filter((s) => now - s.t <= windowMs);
      if (this._jitterSamples.length < 6) return false;
      const oldest = this._jitterSamples[0].t;
      if (now - oldest < holdMs) return false;
      const vals = this._jitterSamples.map((s) => s.d);
      const span = Math.max(...vals) - Math.min(...vals);
      if (!(span > 0.02 && span <= maxSpan)) return false;
      this.log(`[RADAR] P2587 soft-clear (VMC/micro-jitter span≈${span.toFixed(2)}m for ${holdMs}ms)`);
      this._jitterSamples = null;
      this._stableDistSinceMs = 0;
      this._stableDistAnchor = null;
      this._armStickyDp1Ignore(config);
      this._healForcedOccupiedSensorMode(config);
      this._commitPresenceAndFlows(false);
      return true;
    } catch (_e) {
      return false;
    }
  }

  /**
   * WHY(P2579 / Z2M MTG075-ZB-RL sensor enum): occupied keeps presence ON forever.
   * Soft-clear evidence that room is empty → unlock firmware by writing DP115=on.
   * WHY(P2584): when smart overlay is ON, keep Occupied unless user opts into auto-unlock.
   */
  _healForcedOccupiedSensorMode(config) {
    try {
      if (!(config?.healForcedOccupiedOnSoftClear || config?.antiFalsePositive)) return;
      const mode = this._radarSensorMode
        ?? this.getSetting?.('sensor_mode')
        ?? this.getStoreValue?.('radar_sensor_mode');
      if (mode !== 'occupied' && mode !== 2 && mode !== '2') return;

      // WHY(P2584): Occupied+smart → Homey already soft-cleared; keep firmware mode
      if (config?.smartPresenceWhileOccupied) {
        const unlock = this.getSetting?.('auto_unlock_occupied_on_empty');
        if (!(unlock === true || unlock === 'true' || unlock === 1 || unlock === '1')) {
          this.log('[RADAR] P2584 keep Occupied (smart overlay — no DP115 unlock)');
          return;
        }
      }

      this.log('[RADAR] P2579 heal DP115 occupied→on (Z2M: occupied forces permanent presence)');
      this._radarSensorMode = 'on';
      try { this.setSettings?.({ sensor_mode: 'on' }).catch(() => {}); } catch (_e) { /* soft */ }
      try { this.setStoreValue?.('radar_sensor_mode', 'on').catch(() => {}); } catch (_e2) { /* soft */ }
      const mapping = config.dpMap?.[115] || config.dpMap?.['115'];
      if (!mapping) return;
      const raw = mapping.reverseEnumMap?.on ?? 0;
      this._sendRadarDP(115, raw, this._getRadarDPType(mapping)).catch(() => {});
    } catch (_e) { /* soft */ }
  }

  /**
   * WHY(P2584 / VicHY MTG075 Occupied): firmware DP1 stuck true; Homey presence from telemetry.
   */
  _isOccupiedSensorMode() {
    const mode = this._radarSensorMode
      ?? this.getSetting?.('sensor_mode')
      ?? this.getStoreValue?.('radar_sensor_mode');
    return mode === 'occupied' || mode === 2 || mode === '2';
  }

  _smartPresenceUnderOccupiedActive(config) {
    try {
      if (!config?.smartPresenceWhileOccupied) return false;
      const s = this.getSetting?.('smart_presence_while_occupied');
      // default ON when setting not yet in Homey store (first tip after pair)
      if (s === false || s === 'false' || s === 0 || s === '0') return false;
      return this._isOccupiedSensorMode();
    } catch (_e) {
      return false;
    }
  }

  /**
   * WHY(P2584): rising-edge Homey presence from distance while Occupied keeps DP115.
   * Soft-clear path still owns clears — never flip-flop on every floodCalm DP9 frame.
   */
  _applySmartPresenceUnderOccupied(distance, inferred, config) {
    try {
      if (!this._smartPresenceUnderOccupiedActive(config)) return false;
      const painted = this.getCapabilityValue?.('alarm_motion') === true
        || this.getCapabilityValue?.('alarm_human') === true;
      const d = Number(distance);
      try {
        this.setStoreValue?.('radar_smart_presence_source', 'distance').catch(() => {});
      } catch (_e) { /* soft */ }

      // Entry: distance motion or lux corroboration → paint present
      if (this._distanceCorroboratesPresence()) {
        if (!painted) {
          this.log(`[RADAR] P2584 smart presence=true (distance motion under Occupied, d≈${d}m)`);
          this._ignoreStickyDp1Until = 0;
          this._commitPresenceAndFlows(true);
        }
        return true;
      }

      // Fresh non-empty target after ignore window + inference agrees
      if (Number.isFinite(d) && d > 0.35 && inferred === true && !painted) {
        const now = Date.now();
        const ignoreActive = this._ignoreStickyDp1Until && now < this._ignoreStickyDp1Until;
        if (!ignoreActive) {
          this.log(`[RADAR] P2584 smart presence=true (inferred distance under Occupied, d≈${d}m)`);
          this._commitPresenceAndFlows(true);
        }
      }
      return true;
    } catch (_e) {
      return false;
    }
  }

  /**
   * WHY(P2579 / Z2M#18677): target_distance often only reports a few discrete meters.
   * ≤2 quantized bins over recent samples ⇒ reflection / empty-room spam.
   */
  _isQuantizedDistanceStagnant(now = Date.now()) {
    try {
      const samples = (this._distanceSamples || []).filter((s) => now - s.t < 90_000);
      if (samples.length < 4) return false;
      const bins = new Set(samples.map((s) => Math.round(Number(s.d) * 4) / 4));
      return bins.size <= 2;
    } catch (_e) {
      return false;
    }
  }

  /**
   * WHY(P2577 / VicHY #2247 photo "0 [object Object]" + sticky Sí):
   * Coerce DP9 / smartParse into a finite meters number — never setCapability(object).
   */
  _coerceDistanceMeters(value, mapping = {}) {
    try {
      let raw = value;
      if (raw != null && typeof raw === 'object' && !Buffer.isBuffer(raw)) {
        raw = raw.value ?? raw.data ?? raw.v ?? raw.distance ?? null;
      }
      if (Buffer.isBuffer(raw)) {
        raw = raw.length >= 4 ? raw.readUInt32BE(0) : raw[0];
      }
      if (mapping.smartDivisor === true) {
        const { smartParse } = require('../../lib/managers/SmartDivisorManager');
        const parsed = smartParse(raw, mapping.dpId || 9, { capability: 'measure_luminance.distance' });
        const n = Number(parsed);
        return Number.isFinite(n) ? n : null;
      }
      // WHY(P2715 / GH#550): dual-scale target distance (dm preferred, cm when ≥100)
      if (mapping.radarDistanceScale === true) {
        const { normalizeRadarTargetDistanceMeters } = require('../../lib/tuya/TuyaRadarRangeScale');
        if (!this._radarDistanceScaleHint || typeof this._radarDistanceScaleHint !== 'object') {
          this._radarDistanceScaleHint = { last: null };
        }
        return normalizeRadarTargetDistanceMeters(raw, {
          maxMeters: mapping.maxMeters || 12,
          preferDivisor: mapping.preferDivisor || 10,
          scaleHint: this._radarDistanceScaleHint,
        });
      }
      // WHY(P2580 / Z2M#32561): coerce signed VALUE garbage → uint32 before /divisor
      const { asUnsignedTuyaValue } = require('../../lib/tuya/TuyaUnsignedValue');
      const u = asUnsignedTuyaValue(raw);
      if (u == null) return null;
      const div = Number(mapping.divisor) > 0 ? Number(mapping.divisor) : 100;
      return u / div;
    } catch (_e) {
      return null;
    }
  }

  _noteDistanceSample(distance) {
    const d = Number(distance);
    if (!Number.isFinite(d)) return;
    const now = Date.now();
    if (!Array.isArray(this._distanceSamples)) this._distanceSamples = [];
    this._distanceSamples.push({ d, t: now });
    if (this._distanceSamples.length > 12) this._distanceSamples.shift();
    this._lastDistanceM = d;
    this._lastDistanceAt = now;
  }

  /**
   * WHY(P2722 / GH#550 HiepSVG @ 9.0.1232): after stillness DP1 sticks at enum 1 —
   * MCU often skips enum 2 on re-move. Contre quoi: alarm_motion stuck NO while
   * alarm_human YES and DP9 still updates.
   */
  /**
   * WHY(P2744 / GH#550 HiepSVG C14 @ 9.0.1250): walk closer → Homey distance first
   * jumped FARTHER for ~10s then corrected. Multipath ghost + sticky cm÷100 poison.
   * Keep last painted meters when a sudden farther jump fights a closing trend.
   */
  _gateGhostFartherDistance(meters, config) {
    try {
      const d = Number(meters);
      if (!Number.isFinite(d)) return meters;
      if (config && config.rejectGhostFartherDistance === false) return d;
      if (this.getCapabilityValue('alarm_human') !== true
        && this.getCapabilityValue('alarm_motion') !== true) {
        this._lastGatedDistanceM = d;
        return d;
      }
      const samples = Array.isArray(this._distanceSamples) ? this._distanceSamples : [];
      const recent = samples.slice(-5);
      let trendingCloser = false;
      if (recent.length >= 3) {
        trendingCloser = recent[recent.length - 1].d <= recent[0].d - 0.2;
      }
      const prev = Number(this._lastGatedDistanceM);
      const jumpUp = Number.isFinite(prev) && d > prev + 0.75;
      if (jumpUp && trendingCloser) {
        this.log(`[RADAR] P2744 reject ghost farther ${d.toFixed(2)}m (kept ${prev.toFixed(2)}m)`);
        return prev;
      }
      this._lastGatedDistanceM = d;
      return d;
    } catch (_e) {
      return meters;
    }
  }

  _rearmMotionFromDistanceDelta(distance, config) {
    try {
      if (!config || config.splitMotionPresence !== true) return false;
      if (config.rearmMotionOnDistanceDelta !== true) return false;
      if (this.getCapabilityValue('alarm_human') !== true) return false;
      if (this.getCapabilityValue('alarm_motion') === true) {
        this._prevDistanceForMotionRearm = Number(distance);
        return false;
      }
      const d = Number(distance);
      if (!Number.isFinite(d)) return false;
      const prev = Number(this._prevDistanceForMotionRearm);
      this._prevDistanceForMotionRearm = d;
      if (!Number.isFinite(prev)) return false;
      const thr = Number(config.rearmMotionDistanceDeltaM) > 0
        ? Number(config.rearmMotionDistanceDeltaM) : 0.15;
      if (Math.abs(d - prev) < thr) return false;
      // WHY(P2725 / GH#550 HiepSVG @ 9.0.1236): soft-clear arms sticky-DP1 ignore (≤120s)
      // to block ghost *presence* — but motion re-arm while human YES must still run
      // (else motion stays locked NO after stillness + walk). Sticky stays for DP1/presence paths.
      this.log(`[RADAR] P2722/P2725 re-arm motion (Δd=${Math.abs(d - prev).toFixed(2)}m while human)`);
      this.safeSetCapabilityValue('alarm_motion', true).catch(() => {});
      return true;
    } catch (_e) {
      return false;
    }
  }

  /**
   * WHY(P2743 / GH#550): after stillness MCU sticks DP1=1 (presence) and DP9 may barely
   * move when walking in place — lux steps still prove movement → re-arm alarm_motion.
   */
  _rearmMotionFromLuxDelta(lux, config) {
    try {
      if (!config || config.splitMotionPresence !== true) return false;
      if (config.rearmMotionOnLuxDelta === false) return false;
      if (this.getCapabilityValue('alarm_human') !== true) return false;
      if (this.getCapabilityValue('alarm_motion') === true) {
        this._prevLuxForMotionRearm = Number(lux);
        return false;
      }
      const v = Number(lux);
      if (!Number.isFinite(v)) return false;
      const prev = Number(this._prevLuxForMotionRearm);
      this._prevLuxForMotionRearm = v;
      if (!Number.isFinite(prev)) return false;
      const thr = Number(config.rearmMotionLuxDelta) > 0
        ? Number(config.rearmMotionLuxDelta) : 12;
      if (Math.abs(v - prev) < thr) return false;
      this.log(`[RADAR] P2743 re-arm motion (Δlux=${Math.abs(v - prev).toFixed(0)} while human)`);
      this.safeSetCapabilityValue('alarm_motion', true).catch(() => {});
      return true;
    } catch (_e) {
      return false;
    }
  }

  _armStickyDp1Ignore(config) {
    const hold = Number(config?.softClearIgnoreStickyDp1Ms) > 0
      ? Number(config.softClearIgnoreStickyDp1Ms) : 90_000;
    this._ignoreStickyDp1Until = Date.now() + hold;
    this.log(`[RADAR] P2577 ignore sticky DP1 true for ${hold}ms (need entry corroboration)`);
  }

  /**
   * Entry corroboration: distance jumped or lux changed recently → real person.
   * Static mmWave standing still is OK once already present (gate only blocks re-assert).
   */
  _distanceCorroboratesPresence() {
    try {
      const now = Date.now();
      const samples = Array.isArray(this._distanceSamples) ? this._distanceSamples : [];
      const recent = samples.filter((s) => now - s.t < 15_000);
      if (recent.length >= 2) {
        let min = recent[0].d;
        let max = recent[0].d;
        for (const s of recent) {
          if (s.d < min) min = s.d;
          if (s.d > max) max = s.d;
        }
        if (max - min >= 0.25) return true;
      }
      // WHY(P2719): during sticky-ignore after leave, stagnant ghost (2–3m) is NOT entry
      if (this._ignoreStickyDp1Until && now < this._ignoreStickyDp1Until) {
        return false;
      }
      const d = Number(this._lastDistanceM);
      // WHY(P2618 / GH#550): OCR @ 9.0.1097 showed distance 0.2m while person nearby —
      // treat fresh target >0.15m as entry corroboration (was 0.35 → missed).
      if (Number.isFinite(d) && d > 0.15
          && this._lastDistanceAt && (now - this._lastDistanceAt) < 10_000) {
        // Ceiling V3: any fresh non-zero target while painted absent → corroborate
        try {
          const mfr = String(this.getSetting?.('zb_manufacturer_name') || '').toLowerCase();
          if (/gkfbdvyx|ya4ft0w4|laokfqwu/.test(mfr) && d > 0.15) return true;
        } catch (_e2) { /* soft */ }
      }
      const inf = this._inference;
      if (inf?.state?.luxChangeRate > 8) return true;
      return false;
    } catch (_e) {
      return false;
    }
  }

  /**
   * WHY(P2577): asymmetric anti-FP for MTG075 bathrooms.
   * - false → always accept (immediate clear)
   * - true during sticky-ignore → require corroboration
   * - true otherwise → accept (static presence OK)
   * Returns null to drop the frame (keep current Homey state).
   */
  _gatePresenceAgainstFalsePositive(presence, config) {
    if (!config?.antiFalsePositive) return presence;
    if (presence === false || presence === 0) {
      this._pendingPresenceTrueSince = 0;
      return false;
    }
    if (presence !== true && presence !== 1 && presence !== 2) return presence;

    const now = Date.now();
    if (this._ignoreStickyDp1Until && now < this._ignoreStickyDp1Until) {
      if (this._distanceCorroboratesPresence()) {
        this._ignoreStickyDp1Until = 0;
        this._pendingPresenceTrueSince = 0;
        this.log('[RADAR] P2577 sticky ignore lifted (entry corroborated)');
        return true;
      }
      this.log('[RADAR] P2577 drop sticky DP1 true (empty bathroom / no entry motion)');
      return null;
    }

    // WHY(P2600 / GH#550 OCR): DP9 never received (find_switch OFF) ≠ empty room.
    // Anti-FP must not refuse presence while distance tracking is still cold.
    if (!this._distanceSeenOnce && (config.enableFindSwitchOnBoot || config.syncPresenceFromLuxInference)) {
      this._pendingPresenceTrueSince = 0;
      return true;
    }

    // Optional rising-edge confirm when distance looks empty (0 / NaN) — avoid instant FP
    const d = Number(this._lastDistanceM);
    const distLooksEmpty = !Number.isFinite(d) || d <= 0.15;
    if (distLooksEmpty && !this._distanceCorroboratesPresence()) {
      if (!this._pendingPresenceTrueSince) this._pendingPresenceTrueSince = now;
      const need = Number(config.presenceConfirmMs) > 0 ? Number(config.presenceConfirmMs) : 3000;
      if (now - this._pendingPresenceTrueSince < need) {
        return null;
      }
      // Sustained DP1 with distance≈0 → treat as sticky FP, arm ignore instead of paint
      this._pendingPresenceTrueSince = 0;
      this._armStickyDp1Ignore(config);
      this.log('[RADAR] P2577 refuse sustained DP1 true @ distance≈0');
      return false;
    }
    this._pendingPresenceTrueSince = 0;
    return true;
  }

  /**
   * WHY(P2576 / VicHY #2247): tip update dropped relay tile — re-add onoff + listener.
   */
  async _ensureRelayOnoffCapability() {
    try {
      const cfg = this._getRadarConfig() || {};
      const mfr = (MfrHelper.getManufacturerName(this) || '').toLowerCase();
      if (!(cfg.hasRelay || MTG_RELAY_MFR_RE.test(mfr))) return;
      if (typeof this.hasCapability === 'function' && !this.hasCapability('onoff')) {
        await this.addCapability('onoff').catch(() => {});
        this.log('[RADAR] P2576 restored missing onoff (MTG relay)');
      }
      this._radarRelayListenerRegistered = false;
      this._registerRadarCapabilityListeners();
    } catch (_e) { /* soft */ }
  }

  /**
   * Idea #21: Initialize multi-zone presence capabilities dynamically.
   * Only adds zone DPs if the device config declares hasMultiZone.
   */
  async _initMultiZoneCapabilities() {
    const config = this._getRadarConfig();
    if (!config || !config.hasMultiZone) {return;}

    // Zone presence capabilities (alarm_motion.zone1, zone2, zone3)
    const zoneCaps = [
      'alarm_motion.zone1',
      'alarm_motion.zone2',
      'alarm_motion.zone3',
    ];
    // Zone distance capabilities (measure_luminance.distance.zone1, zone2, zone3)
    const zoneDistanceCaps = [
      'measure_luminance.distance.zone1',
      'measure_luminance.distance.zone2',
      'measure_luminance.distance.zone3',
    ];
    // Movement classification capability
    const classificationCap = 'measure_motion.classification';

    for (const cap of [...zoneCaps, ...zoneDistanceCaps, classificationCap]) {
      if (!this.hasCapability(cap)) {
        await this.addCapability(cap).catch(() => {});
      }
    }

    // Initialize zone state tracker
    this._zoneState = { 1: false, 2: false, 3: false };
    this._movementClassification = 'none';

    this.log('[RADAR] Multi-zone capabilities initialized');
  }

  /**
   * WHY(P2524 / diag 74e5cae7): paint alarm_motion+alarm_human AND fire declared
   * presence_detected / presence_cleared / motion_detected on edge only.
   * Contre quoi: compose cards exist but device never called getDeviceTriggerCard.
   * WHY(P2528): await motion write so edge-fire is not raced by a parallel human set.
   */
  _commitPresenceAndFlows(presence, opts = {}) {
    const next = !!presence;
    // WHY(P2555): heal/boot paints must not lock edge-dedupe without firing WHEN —
    // VicHY #2240 "sensor shows present but Presence detected WHEN dead".
    if (opts && opts.silent === true) {
      return this.safeSetCapabilityValue('alarm_motion', next).catch(() => {});
    }
    // WHY(P2590 Module 2 Survival Watchdog): rearm on present; cancel on clear
    if (next) {
      this._nudgeSurvivalWatchdog('presence');
    } else {
      this._clearSurvivalWatchdog();
    }
    const cfg = this._getRadarConfig() || {};
    // WHY(P2719 / GH#550): split — human stays when motion opts.false; full clear both
    if (cfg.splitMotionPresence === true) {
      if (!next) {
        return this.safeSetCapabilityValue('alarm_human', false).catch(() => {});
      }
      if (opts.motion === true) {
        return this.safeSetCapabilityValue('alarm_motion', true).catch(() => {});
      }
      if (opts.motion === false) {
        return Promise.all([
          this.safeSetCapabilityValue('alarm_motion', false).catch(() => {}),
          super.safeSetCapabilityValue('alarm_human', true).catch(() => {}),
        ]).then(() => {
          if (this._lastPresenceFlowEdge !== true) {
            this._lastPresenceFlowEdge = false;
            this._triggerPresenceFlows(true);
          }
        }).catch(() => {});
      }
      // presence true without motion hint — set human; leave motion alone
      return super.safeSetCapabilityValue('alarm_human', true).then(() => {
        if (this._lastPresenceFlowEdge !== true) {
          this._triggerPresenceFlows(true);
        }
      }).catch(() => {});
    }
    // Motion first — safeSet mirrors human + fires presence WHEN on edge.
    return this.safeSetCapabilityValue('alarm_motion', next).catch(() => {});
  }

  /**
   * Prompt API Module 2 — triggerPresenceWatchdog()
   * Rearm Z2M-style occupancy_timeout: departure_delay + network margin.
   */
  triggerPresenceWatchdog() {
    return this._nudgeSurvivalWatchdog('presence');
  }

  /**
   * WHY(P2719): only meaningful life (distance jump / lux motion) may reset the timer.
   * Contre quoi: ambient lux + ghost distance forever rearm → hung after leave.
   */
  _isMeaningfulSurvivalLife(reason) {
    try {
      if (reason === 'presence' || reason === 'dp1-none') return true;
      if (reason === 'distance') {
        const samples = Array.isArray(this._distanceSamples) ? this._distanceSamples : [];
        if (samples.length < 2) return true;
        const a = samples[samples.length - 1];
        const b = samples[samples.length - 2];
        return Math.abs(Number(a.d) - Number(b.d)) >= 0.25;
      }
      if (reason === 'lux') {
        const rate = Number(this._inference?.state?.luxChangeRate) || 0;
        const thr = Number(this._getRadarConfig?.()?.luxPresenceRateThreshold) || 3;
        return rate > thr;
      }
      return true;
    } catch (_e) {
      return true;
    }
  }

  /**
   * WHY(P2590/P2591 Software Shield Module 2 Survival Watchdog): if clear frame is lost
   * in Zigbee flood or MCU freezes Occupied, force Homey absent after departure_delay + margin.
   * Contre quoi: NEVER paint presence=true from distance alone (P2534 bathroom flip-flop).
   * Only rearm while already Occupied / after DP1 true.
   * WHY(P2719 / GH#550): stagnant lux/distance must not reset the countdown.
   */
  _nudgeSurvivalWatchdog(reason = 'life') {
    try {
      const config = this._getRadarConfig() || {};
      if (config.survivalWatchdog === false) return;
      if (!(config.floodCalm || config.antiFalsePositive || config.hasRelay
        || config.survivalWatchdog === true || config.enableFindSwitchOnBoot)) {
        return;
      }
      // Optional user opt-out
      try {
        if (this.getSetting?.('survival_watchdog') === false) return;
      } catch (_e) { /* soft */ }

      const present = this.getCapabilityValue?.('alarm_motion') === true
        || this.getCapabilityValue?.('alarm_human') === true
        || reason === 'presence' || reason === 'dp1-none';
      if (!present && reason !== 'presence' && reason !== 'dp1-none') return;

      // Already armed + calm telemetry → let countdown finish (honour departure_delay)
      if (this._survivalWatchdogTimer && !this._isMeaningfulSurvivalLife(reason)) {
        return;
      }

      this._clearSurvivalWatchdog();
      const { safeSetTimeout } = require('../../lib/utils/safe-timers');
      let keepSec = Number(this.getSetting?.('departure_delay'));
      if (!Number.isFinite(keepSec) || keepSec < 0) keepSec = 30;
      const margin = Number(config.survivalWatchdogMarginSec) >= 0
        ? Number(config.survivalWatchdogMarginSec) : 5;
      // Cap absurd delays so a 1500s firmware delay does not block soft-clear forever
      const waitMs = Math.min((keepSec + margin) * 1000, 180_000);
      this._survivalWatchdogTimer = safeSetTimeout(this, () => {
        this._survivalWatchdogTimer = null;
        try {
          const still = this.getCapabilityValue?.('alarm_motion') === true
            || this.getCapabilityValue?.('alarm_human') === true;
          if (!still) return;
          // Prompt log + P2590 tag (Z2M occupancy_timeout Contre quoi)
          this.log(`[WATCHDOG] Timeout expiré, forçage de l'état libre (${reason})`);
          this.clearStuckPresence({ source: 'survival-watchdog' }).catch(() => {});
        } catch (_e) { /* soft */ }
      }, waitMs);
    } catch (_e) { /* soft */ }
  }

  _clearSurvivalWatchdog() {
    try {
      if (this._survivalWatchdogTimer) {
        const { safeClearTimeout } = require('../../lib/utils/safe-timers');
        if (typeof safeClearTimeout === 'function') {
          safeClearTimeout(this, this._survivalWatchdogTimer);
        } else {
          clearTimeout(this._survivalWatchdogTimer);
        }
      }
    } catch (_e) { /* soft */ }
    this._survivalWatchdogTimer = null;
  }

  _triggerPresenceFlows(detected) {
    // WHY(P2526 / VicHY 74e5cae7 @ 9.0.945): custom WHEN "Presence detected" must fire
    // on false→true — native Homey "Motion alarm" works via capability; this card does not.
    // WHY(P2546): dedupe identical edges so boot/heal re-paints do not spam flows.
    // WHY(P2551 / VicHY #2240): History dual spam fixed via alarm_motion.preventInsights
    // (compose + runtime heal); this edge still drives the declared WHEN cards.
    const next = !!detected;
    if (this._lastPresenceFlowEdge === next) return;
    this._lastPresenceFlowEdge = next;
    const cardId = next
      ? 'presence_sensor_radar_presence_detected'
      : 'presence_sensor_radar_presence_cleared';
    try {
      this.log?.(`[P2526/P2546/P2551] flow ${cardId} edge=${next}`);
      this.homey.flow.getDeviceTriggerCard(cardId).trigger(this, {}).catch((e) => {
        this.log?.(`[P2526] flow ${cardId} trigger failed: ${e?.message || e}`);
      });
    } catch (_e) { /* soft */ }
    if (next) {
      try {
        this.homey.flow.getDeviceTriggerCard('presence_sensor_radar_motion_detected')
          .trigger(this, {}).catch(() => {});
      } catch (_e2) { /* soft */ }
    }
  }

  /**
   * WHY(P2555 / VicHY #2240 soft-dismiss): after tip, presence may already be true
   * so false→true never happens until leave+re-enter. One-shot nudge fires WHEN once
   * if UI already shows present — Contre quoi: "I configured Presence detected and
   * nothing fires while tile is green".
   */
  _schedulePresenceWhenNudge() {
    try {
      if (typeof this.getStoreValue === 'function'
          && this.getStoreValue('p2555_presence_when_nudge')) {
        return;
      }
      const { safeSetTimeout } = require('../../lib/utils/safe-timers');
      safeSetTimeout(this, () => {
        try {
          const present = this.getCapabilityValue?.('alarm_human') === true
            || this.getCapabilityValue?.('alarm_motion') === true;
          if (!present) return;
          // Allow edge fire even if dedupe thinks we're already true
          this._lastPresenceFlowEdge = false;
          this._triggerPresenceFlows(true);
          if (typeof this.setStoreValue === 'function') {
            this.setStoreValue('p2555_presence_when_nudge', 1).catch(() => {});
          }
          this.log?.('[RADAR] P2555 one-shot Presence detected WHEN nudge');
        } catch (_e) { /* soft */ }
      }, 25_000);
    } catch (_e2) { /* soft */ }
  }

  _triggerZonePresenceFlow(zone) {
    const z = Number(zone);
    if (![1, 2, 3].includes(z)) return;
    const cardId = `presence_sensor_radar_zone${z}_presence`;
    try {
      this.homey.flow.getDeviceTriggerCard(cardId).trigger(this, {}).catch(() => {});
    } catch (_e) { /* soft */ }
  }

  /**
   * Handle settings changes — see merged onSettings above (P2579).
   * Kept no-op guard removed; class had two onSettings and the second overwrote the first.
   */

  onUninit() {
    if (this._pollingInterval) {this.homey.clearInterval(this._pollingInterval);}
    this._clearRadarPhantomHealInterval();
    this._clearStickyPresenceWatchdog();
    this._clearSurvivalWatchdog();
    if (super.onUninit) {super.onUninit();}
  }

  onDeleted() {
    this.log('[RADAR] Device deleted');
    this._clearRadarPhantomHealInterval();
    this._clearStickyPresenceWatchdog();
    this._clearSurvivalWatchdog();
    if (super.onDeleted) {super.onDeleted();}
  }
}

module.exports = PresenceSensorRadarDevice;
