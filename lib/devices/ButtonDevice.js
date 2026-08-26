'use strict';

const { AutoAdaptiveDevice } = require('../dynamic');
const { safeSetTimeout, safeClearTimeout, isDestroyed } = require('../utils/safe-timers');
const ManufacturerVariationManager = require('../ManufacturerVariationManager');
const { includesCI, containsCI } = require('../utils/CaseInsensitiveMatcher');
const MfrHelper = require('../helpers/ManufacturerNameHelper');
const { PRESS_MAP, resolve: resolvePressType } = require('../utils/TuyaPressTypeMap');
const { normalizeZclBatteryVoltagePercent } = require('../battery/zcl-percent');
const DeviceOperatingMode = require('../zigbee/DeviceOperatingMode');

let MultiProtocolBattery;
try {
  MultiProtocolBattery = require('../battery/MultiProtocolBatteryPercent');
} catch (e) {
  MultiProtocolBattery = null;
}

let UnifiedBatteryHandler;
try {
  UnifiedBatteryHandler = require('../battery/UnifiedBatteryHandler');
} catch (e) {
  UnifiedBatteryHandler = null;
}

// v5.7.36: Universal Throttle Manager for flow trigger deduplication
let UniversalThrottleManager;
try {
  UniversalThrottleManager = require('../utils/UniversalThrottleManager');
} catch (e) {
  UniversalThrottleManager = null;
}

/**
 * ButtonDevice - v7.1.0 (Inherited Multi-Layer Vision)
 *
 * Inherits PhysicalButtonMixin + VirtualButtonMixin via TuyaZigbeeDevice
 * Buttons are NOT switches!
 * - NO onoff capability
 * - Relies purely on physical button events
 */
class ButtonDevice extends AutoAdaptiveDevice {

  /**
   * v5.5.455: FAST INIT MODE for sleepy battery buttons
   * Buttons go to sleep very quickly - defer complex initialization
   * to prevent pairing timeout and "not awake long enough" issues
   */
  get fastInitMode() { return true; }

  /**
   * v10.3.0 FIX (B11): This class owns battery handling (ZCL read on wake,
   * store restore, UnifiedBatteryHandler normalization). BatteryRouter must
   * not act as a third writer (50% estimate + duplicate capability reporting).
   */
  get _ownsBatteryHandling() { return true; }

  /** v5.8.67: Non-linear voltage-to-percent (CR2032 curve, mV input) */
  _voltageToPercentCurve(mV) {
    const c = [[3000,100],[2950,95],[2900,90],[2850,85],[2800,80],[2750,70],[2700,60],[2650,50],[2600,40],[2550,30],[2500,20],[2400,10],[2300,5],[2100,0]];
    if (mV >= c[0][0]) {return 100;}
    if (mV <= c[c.length - 1][0]) {return 0;}
    for (let i = 0; i < c.length - 1; i++) {
      if (mV >= c[i + 1][0] && mV <= c[i][0]) {
        return Math.round(c[i + 1][1] + ((mV - c[i + 1][0]) / (c[i][0] - c[i + 1][0])) * (c[i][1] - c[i + 1][1]));
      }
    }
    return 0;
  }

  _getButtonBatteryProfile() {
    const manufacturer = MfrHelper.getManufacturerName(this);
    const modelId = MfrHelper.getModelId(this);
    const profile = UnifiedBatteryHandler?.lookupBatteryProfile?.(manufacturer, modelId);
    const energyType = this.driver?.manifest?.energy?.batteries?.[0]
      || this.getEnergy?.()?.batteries?.[0];

    return {
      manufacturer,
      modelId,
      profile,
      chemistry: profile?.chemistry || energyType || 'CR2032',
    };
  }

  _ensureBatteryIngest() {
    if (typeof this.ingestBatteryPercent === 'function') {return;}
    try {
      MultiProtocolBattery?.attachMultiProtocolBattery?.(this);
    } catch (_e) { /* optional in unit tests */ }
  }

  _registerHybridTuyaBatteryFallback() {
    if (this._hybridTuyaBatteryRegistered) {return;}
    const mgr = this.tuyaEF00Manager;
    if (!mgr || typeof mgr.on !== 'function') {return;}
    this._hybridTuyaBatteryRegistered = true;
    for (const dp of [3, 4, 15, 101]) {
      mgr.on(`dp-${dp}`, (value) => {
        this._handleTuyaBatteryDP(dp, value).catch(() => {});
      });
    }
    this.log('[BUTTON-BATTERY] Hybrid leftover EF00 battery DPs attached (3/4/15/101)');
  }

  _normalizeButtonZclBattery(rawValue) {
    const raw = Number(rawValue);
    if (!Number.isFinite(raw)) {return null;}

    const context = this._getButtonBatteryProfile();
    const previous = this.getCapabilityValue?.('measure_battery');

    if (UnifiedBatteryHandler?.normalizeZigbeeValue) {
      return UnifiedBatteryHandler.normalizeZigbeeValue(raw, {
        manufacturer: context.manufacturer,
        batteryType: context.chemistry,
        // v10.3.0 FIX (B11): default 200→100 like the SOS path; only treat
        // 200 as a sentinel when the profile explicitly says it is NOT percent.
        treat200AsSentinel: context.profile?.zcl200IsPercent === false,
        lastValue: previous ?? undefined,
      });
    }

    if (raw === 255 || raw === 0xFFFF) {return null;}
    if (raw < 0 || raw > 200) {return null;}
    if (raw === 200) {return 100;}
    return raw > 100 ? Math.round(raw / 2) : Math.round(raw);
  }

  _normalizeButtonDpBattery(dp, value) {
    const raw = Number(value);
    if (!Number.isFinite(raw)) {return null;}

    if (dp === 3 && raw >= 0 && raw <= 2) {
      return raw === 0 ? 10 : raw === 1 ? 50 : 100;
    }

    if (![4, 15, 101].includes(Number(dp))) {return null;}
    if (raw === 255 || raw === 0xFFFF || raw < 0 || raw > 200) {return null;}
    return raw > 100 ? Math.round(raw / 2) : Math.round(raw);
  }

  _getButtonPowerClusters() {
    const endpoints = this.zclNode?.endpoints || {};
    const profile = typeof this.getDeviceProfile === 'function' ? this.getDeviceProfile() : null;
    // WHY(P2285): Johan #1120 EP2–4 report batteryPercentageRemaining=253 garbage
    const onlyEp = profile?.batteryEpOnly != null ? Number(profile.batteryEpOnly) : null;
    let orderedIds = Object.keys(endpoints)
      .map(id => Number(id))
      .filter(id => Number.isFinite(id))
      .sort((a, b) => a === 1 ? -1 : b === 1 ? 1 : a - b);
    if (Number.isFinite(onlyEp) && onlyEp > 0) {
      orderedIds = orderedIds.filter((id) => id === onlyEp);
      if (!orderedIds.length) {orderedIds = [onlyEp];}
    }
    const clusters = [];
    const seen = new Set();

    for (const endpointId of orderedIds) {
      const endpoint = endpoints[endpointId];
      const cluster =
        endpoint?.clusters?.powerConfiguration ||
        endpoint?.clusters?.genPowerCfg ||
        endpoint?.clusters?.[0x0001] ||
        endpoint?.clusters?.['powerConfiguration'];

      if (cluster && !seen.has(cluster)) {
        seen.add(cluster);
        clusters.push({ endpointId, cluster });
      }
    }

    return clusters;
  }

  async _storeButtonBatteryVoltage(rawVoltage) {
    const raw = Number(rawVoltage);
    if (!Number.isFinite(raw) || raw <= 0) {return;}

    const voltage = UnifiedBatteryHandler?.normalizeVoltage
      ? UnifiedBatteryHandler.normalizeVoltage(raw)
      : null;
    if (voltage == null) {return;}
    await this.setStoreValue('battery_voltage', voltage).catch(() => {});
    await this.setStoreValue('batteryVoltage', raw).catch(() => {});
  }

  async _setButtonBattery(percent, source = 'unknown') {
    if (percent === undefined || percent === null) {return false;}
    const value = Math.max(0, Math.min(100, Math.round(Number(percent))));
    if (!Number.isFinite(value)) {return false;}

    this.log(`[BUTTON-BATTERY] ${source}: ${value}%`);
    this._ensureBatteryIngest();
    const previous = this.hasCapability?.('measure_battery') ? this.getCapabilityValue('measure_battery') : null;

    if (typeof this.ingestBatteryPercent === 'function') {
      const r = await this.ingestBatteryPercent(value, { protocol: 'cached', source });
      await this._maybeTriggerBatteryLowFlow(value, previous).catch(() => {});
      return r?.ok !== false;
    }
    if (typeof this._updateBattery === 'function') {
      await this._updateBattery(value);
    } else if (this.hasCapability('measure_battery')) {
      await this.safeSetCapabilityValue('measure_battery', value).catch((err) => {
        this.log(`[BUTTON-BATTERY] Failed to set battery: ${err.message}`);
      });
      await this.setStoreValue('last_battery_percentage', value).catch(() => {});
    }
    await this.setStoreValue('last_battery_time', Date.now()).catch(() => {});
    return true;
  }

  async _ingestButtonBatterySample(raw, opts = {}) {
    this._ensureBatteryIngest();
    const context = this._getButtonBatteryProfile();
    const previous = this.hasCapability?.('measure_battery') ? this.getCapabilityValue('measure_battery') : null;
    if (typeof this.ingestBatteryPercent === 'function') {
      const r = await this.ingestBatteryPercent(raw, {
        manufacturer: context.manufacturer,
        batteryType: context.chemistry,
        profile: context.profile,
        ...opts,
      });
      if (r?.ok && Number.isFinite(r.percent)) {
        await this._maybeTriggerBatteryLowFlow(r.percent, previous).catch(() => {});
        return true;
      }
      return false;
    }
    const protocol = String(opts.protocol || opts.source || 'zcl');
    let percent = null;
    if (protocol === 'voltage') {
      percent = normalizeZclBatteryVoltagePercent(raw, { batteryType: context.chemistry });
    } else if (protocol === 'tuya-dp') {
      percent = this._normalizeButtonDpBattery(Number(opts.dp), raw);
    } else if (protocol === 'cached') {
      percent = Number(raw);
    } else {
      percent = this._normalizeButtonZclBattery(raw);
    }
    if (percent === null || !Number.isFinite(percent)) {return false;}
    return this._setButtonBattery(percent, opts.source || protocol);
  }

  /**
   * v5.2.92: Force BUTTON profile to prevent SWITCH detection
   */
  constructor(...args) {
    super(...args);

    // 🔒 FORCE BUTTON PROFILE - Never detect as SWITCH
    this._forcedDeviceType = 'BUTTON';
    this._skipHybridTypeDetection = true;

    // Buttons should NEVER have onoff/dim (UI pollution / DCM-FB phantoms)
    this._forbiddenCapabilities = ['onoff', 'dim'];

    // v5.7.12: Click pattern detection state
    this._clickPatternState = {};
    this._holdReleaseTimers = {};
    // v5.7.13: Smart deduplication - native events tracker
    this._nativeEventTracker = {
      lastTripleTime: {},
      lastReleaseTime: {},
      nativeTripleSupport: null,
      nativeReleaseSupport: null,
    };
    // v5.7.14: Bidirectional deduplication - virtual <-> physical
    this._virtualPhysicalDedup = {
      lastVirtualPress: {},
      lastPhysicalPress: {},
      dedupWindow: 2000,
    };
  }

  /**
   * v9.0.50 BACKPORT from v5.11.205-stable : _updateBattery
   * Méthode unifiée de mise à jour batterie (capability + store).
   * Perdue lors d'un sync, restaurée pour fix batterie '?' sur boutons.
   */
  async _updateBattery(percentage) {
    if (percentage === undefined || percentage === null) {return;}
    const value = Math.max(0, Math.min(100, Math.round(parseFloat(percentage))));
    if (isNaN(value)) {return;}
    const previous = this.hasCapability?.('measure_battery') ? this.getCapabilityValue('measure_battery') : null;
    this.log(`[BUTTON-BATTERY] Set battery: ${value}%`);
    // v9.0.54 FIX CRITICAL : _safeSetCapability n'existe PAS dans la chaîne ButtonDevice
    // (CapabilityManagerMixin n'est pas hérité). Fallback vers setCapabilityValue direct.
    if (this.hasCapability?.('measure_battery')) {
      if (typeof this._safeSetCapability === 'function') {
        await this._safeSetCapability('measure_battery', value).catch(() => {});
      } else {
        await this.safeSetCapabilityValue('measure_battery', value).catch(() => {});
      }
    }
    await this.setStoreValue('last_battery_percentage', value).catch(() => {});
    await this._maybeTriggerBatteryLowFlow(value, previous).catch(() => {});
  }

  async _maybeTriggerBatteryLowFlow(value, previous) {
    const settings = this.getSettings?.() || {};
    if (settings.enable_battery_notifications === false) {return;}

    const threshold = Number.isFinite(Number(settings.battery_low_threshold))
      ? Number(settings.battery_low_threshold)
      : 20;
    if (value > threshold) {return;}

    const lastTs = await Promise.resolve(this.getStoreValue?.('last_battery_low_flow_ts')).catch(() => null);
    const now = Date.now();
    const alreadyLow = previous !== null && previous !== undefined && Number(previous) <= threshold;
    if (alreadyLow && lastTs && now - Number(lastTs) < 24 * 60 * 60 * 1000) {return;}

    const driverId = this.driver?.id || 'button_wireless';
    const gangCount = this.buttonCount || this.gangCount || 1;
    const candidates = [
      `${driverId}_battery_low`,
      `${driverId}_button_${gangCount}gang_measure_battery_changed`,
      `${driverId}_measure_battery_changed`,
    ];

    for (const cardId of candidates) {
      if (await this._tryCard(cardId, { battery: value }, { battery: value })) {
        await this.setStoreValue('last_battery_low_flow_ts', now).catch(() => {});
        return;
      }
    }
  }

  /**
   * v9.0.54 : Fallback _safeSetCapability si CapabilityManagerMixin absent.
   * ButtonDevice n'hérite pas de CapabilityManagerMixin (contrairement à UnifiedSwitchBase).
   * Cette méthode empêche le TypeError quand _updateBattery ou d'autres l'appellent.
   */
  async _safeSetCapabilityFallback(capability, value) {
    if (!capability || value === undefined || value === null) {return false;}
    // Mains-powered : skip battery capabilities
    if (this.mainsPowered && (capability === 'measure_battery' || capability === 'alarm_battery')) {
      return false;
    }
    try {
      const prev = this.getCapabilityValue(capability);
      if (prev === value) {return false;} // skip si pas de changement
      await this.safeSetCapabilityValue(capability, value);
      return true;
    } catch (e) {
      this.error(`[BUTTON] _safeSetCapability ${capability} failed: ${e.message}`);
      return false;
    }
  }

  /**
   * v9.0.50 BACKPORT from v5.11.205-stable : onEndDeviceAnnounce
   * Handler crucial pour boutons sleepy (TS0041-44). Quand le device wake
   * (pression bouton ou rejoin), on re-bind les clusters ET lit la batterie.
   * PERDU lors d'un sync → batterie jamais lue au wake → '?' permanent.
   */
  async onEndDeviceAnnounce() {
    try {
      const { logFleetIdentity } = require('../diagnostics/FleetIdentityLog');
      logFleetIdentity(this, 'BUTTON-WAKE');
    } catch (_e) { /* ignore */ }
    try {
      const BootBudget = require('../performance/BootBudget');
      BootBudget.markRadioActivity(this);
      if (this._deferDataRecoveryInit && !BootBudget.isHeapCritical()) {
        this._deferDataRecoveryInit = false;
        await this._initDataRecoveryManager().catch(() => {});
      }
    } catch (_e) { /* optional */ }
    this.log('[BUTTON] Device announce (wake/rejoin) — re-binding + battery read');
    // v10.3.0 FIX (B4): Run the parent handlers first (battery re-scan,
    // scene-mode re-apply, E000 rebind) — this override used to shadow them.
    try { await super.onEndDeviceAnnounce?.(); } catch (_e) {}
    const zclNode = this.zclNode;
    if (!zclNode) {return;}
    const endpoints = this.buttonCount || 1;
    const CLUSTER_NAMES = {
      5: ['genScenes', 'scenes'],
      6: ['genOnOff', 'onOff'],
      8: ['genLevelCtrl', 'levelControl'],
      18: ['multistateInput'],
    };
    for (let ep = 1; ep <= endpoints; ep++) {
      const endpoint = zclNode.endpoints?.[ep];
      if (!endpoint) {continue;}
      const clusterIdsToBind = [5, 6, 18, 8];
      for (const cid of clusterIdsToBind) {
        try {
          let cluster = endpoint.clusters?.[cid];
          if (!cluster) {
            for (const name of CLUSTER_NAMES[cid] || []) {
              cluster = endpoint.clusters?.[name];
              if (cluster) {break;}
            }
          }
          if (cluster?.bind) {await cluster.bind();}
         } catch (_e) {}
      }
    }
    // P27.1: Register genScenes (cluster 0x05) commandRecall listener
    // When scene mode is active (attribute 0x8004 = 1), buttons send
    // scene recall commands instead of on/off. Listen and dispatch as actions.
    await this._registerSceneRecallListener(zclNode);
    // v10.4.0: Watch 0x8004 mode attribute — reflect MANUAL mode toggles
    // (hold buttons 2+3 for ~5s) into the button_mode setting.
    this._registerSceneModeAttributeListener(zclNode);
    // Forum #2134: Smartbutton no press — re-apply scene mode on wake BEFORE
    // waiting for a press (chicken/egg: presses never arrive in dimmer mode).
    try {
      await this._universalSceneModeSwitch(zclNode);
    } catch (_e) { /* non-fatal */ }
    try {
      await this._reapplySceneModeOnWake();
    } catch (_e) { /* non-fatal */ }
    // v5.11.201 : read battery on wake (sleepy devices)
    if (this._readBatteryWhileAwake) {
      await this._readBatteryWhileAwake().catch(() => {});
    }
    // v9.0.424 (P92.131): persistent ZCL battery listeners + boot read.
    // Until now the battery was ONLY read on physical press — users saw
    // "no battery readings" for days (forum Peter #2072). Attr listeners
    // make every spontaneous report count, and the boot read uses the
    // unsupported-negative-cache (P92.120) so unsupported devices stay quiet.
    try {
      const ZclBatteryMonitor = require('../battery/ZclBatteryMonitor');
      ZclBatteryMonitor.attach(this, zclNode);
    } catch (e) {
      this.log(`[BUTTON-BATTERY] ⚠️ ZclBatteryMonitor attach: ${e.message}`);
    }
  }

  /**
   * v10.4.0 (SCENE_MODE_RESEARCH #1): users can toggle dimmer/scene mode
   * MANUALLY on the device (hold buttons 2+3 ~5s, openHAB/ZHA documented).
   * The device then reports attribute 0x8004 (32772) on the onOff cluster.
   * Listen on every endpoint and sync the button_mode setting so the app
   * state never lies about the real mode.
   */
  _registerSceneModeAttributeListener(zclNode) {
    // Manual mode toggle detected (hold 2+4 ~6s) — shared DeviceOperatingMode listener
    DeviceOperatingMode.registerOperationModeListener(this, zclNode);
  }

  /**
   * P27.1 — Register scene recall listener
   * Some TS0041/2/3/4 devices in scene mode send cluster 0x05 (genScenes)
   * commandRecall commands. We listen and emit:
   *   - `scene_X` action (X = sceneId from 1 to 65535)
   *   - Also trigger button.1 capability press for the configured scene ID
   *
   * P28 — DEFAULT = 'scene' (per user observation that most TS0041 issues
   * are caused by devices being in dimmer mode when scene mode is needed)
   */
  async _registerSceneRecallListener(zclNode) {
    if (!zclNode || !zclNode.endpoints) {return;}

    // v10.3.0 FIX (B3): Guard against double registration — this listener is
    // now registered from BOTH onNodeInit and onEndDeviceAnnounce.
    if (this._sceneRecallListenerRegistered) {return;}
    this._sceneRecallListenerRegistered = true;

    // P28: Default = 'scene' if no setting is configured yet
    let setting = this.getSetting?.('button_mode');
    if (!setting) {
      // Auto-migrate: if setting was never set, default to 'scene'
      setting = 'scene';
      try {
        await this.setSettings?.({ button_mode: 'scene' });
        this.log('[BUTTON-MODE] Auto-migrated button_mode = scene (default)');
      } catch (_e) { /* setting may be read-only initially */ }
    }

    // v10.3.0 FIX (B2): single-endpoint devices keep the legacy
    // 1-16/17-32/33-48 sceneId convention; multi-endpoint devices use the
    // endpoint id as button index and PRESS_MAP (0=single/1=double/2=long).
    const isSingleEndpoint = Object.keys(zclNode.endpoints).length <= 1;

    for (const [epKey, ep] of Object.entries(zclNode.endpoints)) {
      const epId = parseInt(epKey) || 1;
      if (!ep || !ep.clusters) {continue;}

      // Find the genScenes cluster
      const scenesCluster = ep.clusters.genScenes || ep.clusters.scenes
        || ep.clusters['0x0500'] || ep.clusters[5];
      if (!scenesCluster) {continue;}

      try {
        // Listen for commandRecall
        if (typeof scenesCluster.on === 'function') {
          scenesCluster.on('commandRecall', async (msg) => {
            try {
              const sceneId = msg?.data?.sceneid ?? msg?.sceneid ?? 0;
              const sceneIdStr = String(sceneId);
              this.log(`[BUTTON-SCENE] genScenes commandRecall on ep${epId} sceneId=${sceneId} (mode=${setting})`);

              let buttonIdx = 0;
              let pressType = 'single';
              if (isSingleEndpoint) {
                // Legacy single-endpoint convention:
                // 0/1-16 = single press button 1-16
                // 17-32 = double press button 1-16
                // 33-48 = hold button 1-16
                if (sceneId === 0) {
                  // v10.3.0 FIX (B2): sceneId 0 must not be silently dropped
                  buttonIdx = 1;
                  pressType = 'single';
                } else if (sceneId >= 1 && sceneId <= 16) {
                  buttonIdx = sceneId;
                  pressType = 'single';
                } else if (sceneId >= 17 && sceneId <= 32) {
                  buttonIdx = sceneId - 16;
                  pressType = 'double';
                } else if (sceneId >= 33 && sceneId <= 48) {
                  buttonIdx = sceneId - 32;
                  pressType = 'hold';
                }
              } else {
                // Multi-endpoint: endpoint = button, PRESS_MAP = press type
                buttonIdx = epId;
                pressType = PRESS_MAP[sceneId] || 'single';
              }

              if (buttonIdx > 0) {
                const cap = `button.${buttonIdx}`;
                if (this.hasCapability(cap)) {
                  this.log(`[BUTTON-SCENE] Triggering ${cap} ${pressType}`);
                  // v10.3.0 FIX (B2): no direct button_pressed card fire here —
                  // that raced with the capability listener path and caused
                  // double triggers. Route once through the capability
                  // listener (dedup handled by triggerButtonPress).
                  try { await this.triggerCapabilityListener(cap, {}).catch(() => {}); } catch {}
                }
              }

              // Always emit the scene_X action
              try {
                const sceneCard = this.homey.flow.getDeviceTriggerCard('button_scene_recall');
                if (sceneCard) {
                  await sceneCard.trigger(this, { scene_id: sceneIdStr, button: String(buttonIdx || 0), press_type: pressType }, {}).catch(() => {});
                }
              } catch {}
            } catch (err) {
              this.log(`[BUTTON-SCENE] commandRecall handler error: ${err.message}`);
            }
          });
          this.log(`[BUTTON-SCENE] ✓ Registered scene recall listener on endpoint ${epId}`);
        }
      } catch (err) {
        this.log(`[BUTTON-SCENE] Failed to register on ep${epId}: ${err.message}`);
      }
    }
  }

  /**
   * P27.1 — Toggle scene mode manually
   * Some users (especially TS0041 _TZ3000_yj6k7vfo) need to manually
   * toggle the scene mode. The user can call this from a flow action
   * or via a device setting.
   * P28: Enhanced with better error handling + store the mode in both
   * setting and store, so the device re-applies on wake.
   *
   * @param {number} mode - 0 (dimmer) or 1 (scene)
   * @returns {Promise<boolean>} - true if mode was set successfully
   */
  async setButtonMode(mode) {
    const zclNode = this.zclNode;
    if (!zclNode) {return false;}

    const numMode = Number(mode);
    if (numMode !== 0 && numMode !== 1) {
      this.log(`[BUTTON-MODE] Invalid mode=${mode} (must be 0 or 1)`);
      return false;
    }

    const family = DeviceOperatingMode.classifyOperatingFamily(this);
    const label = numMode === 1 ? 'scene' : 'dimmer';
    if (!family.writeSceneAttr) {
      this.log(`[BUTTON-MODE] ${family.family} has no 0x8004 — storing ${label} only`);
      await this.setStoreValue('button_mode', label).catch(() => {});
      await this.setStoreValue('scene_mode_switch_failed', false).catch(() => {});
      return true;
    }

    const r = await DeviceOperatingMode.writeOperationMode(this, zclNode, label);
    if (r.ok) {
      this.log(`[BUTTON-MODE] ✓ Set to mode=${numMode} (${label})`);
      await this.setStoreValue('button_mode', label).catch(() => {});
      await this.setStoreValue('scene_mode_switch_failed', false).catch(() => {});
      try {
        await this.setSettings?.({ button_mode: label });
      } catch (_e) { /* setting may be locked */ }
      return true;
    }

    this.log(`[BUTTON-MODE] ✗ Failed to set mode=${numMode}: ${r.reason || 'unsupported'}`);
    await this.setStoreValue('scene_mode_switch_failed', true).catch(() => {});
    await this.setStoreValue('scene_mode_switch_failed_at', new Date().toISOString()).catch(() => {});
    return false;
  }

  // v5.7.12: Click pattern detection for triple press and hold release
  // (initialisé dans le constructor via this._clickPatternState)

  async onNodeInit({ zclNode }) {
    // v5.2.92: Guard against double initialization
    if (this._buttonInitialized) {
      this.log('[BUTTON] ⚠️ Already initialized, skipping');
      return;
    }
    this._buttonInitialized = true;

    // v5.8.57: Ensure zb_manufacturer_name / zb_model_id settings populated
    await MfrHelper.ensureManufacturerSettings(this, zclNode).catch((err) => {
      this.log('[BUTTON] ⚠️ ensureManufacturerSettings failed (non-critical):', err.message || err);
    });
    
    // v5.5.805: Anti-auto-trigger protection - REDUCED from 2000ms to 500ms
    // Forum fix Ronny_M/Cam/Hartmut: 2s was too aggressive, blocking legitimate presses
    this._buttonTriggerProtection = {
      lastTrigger: 0,
      lastByButton: {},
      minInterval: 500, // v5.5.805: Reduced from 2000ms to 500ms - fixes button not responding
      hourlyPattern: false, // Track hourly x:30 pattern
      hourlyPatternCount: 0 // v5.5.805: Only block after 2 consecutive hourly patterns
    };

    // Removed duplicate state tracking variables. Now handled autonomously by PhysicalButtonMixin and VirtualButtonMixin.

    this.log('[BUTTON] 🔘 ButtonDevice initializing...');
    this.log('[BUTTON] 🔒 Forced type: BUTTON (not SWITCH)');

    // v5.5.452: CRITICAL - Ensure capabilities exist FIRST (devices paired before fix had none!)
    await this._ensureDynamicCapabilities();

    // v5.6.0: Apply dynamic manufacturerName configuration
    await this._applyManufacturerConfig();

    // Initialize base (power detection only, no type detection)
    // v5.8.6: CRITICAL FIX - Wrap in try/catch so setupButtonDetection() ALWAYS runs
    // For sleepy battery buttons, the heavy BaseUnifiedDevice init chain can timeout/error
    // Without this fix, cluster bindings never happen → device never sends events to Homey
    try {
      await super.onNodeInit({ zclNode });
    } catch (err) {
      this.log('[BUTTON] ⚠️ Base init error (non-critical for buttons):', err.message);
      this.log('[BUTTON] ℹ️ Continuing with button detection setup...');
    }

    // v5.2.92: Remove onoff if it was incorrectly added
    if (this.hasCapability('onoff')) {
      this.log('[BUTTON] ⚠️ Removing incorrect onoff capability');
      await this.removeCapability('onoff').catch((err) => {
        this.log(`[BUTTON] ⚠️ Failed to remove onoff capability: ${err.message}`);
      });
    }

    // WHY (f647d35b): DCM-FB can re-add onoff minutes later from cluster 0x0006 — strip again deferred
    const _stripTimer = this.homey?.setTimeout ? this.homey.setTimeout.bind(this.homey) : globalThis.setTimeout;
    _stripTimer(() => {
      if (this._destroyed) {return;}
      if (this.hasCapability('onoff')) {
        this.log('[BUTTON] ⚠️ Late-strip onoff (DCM-FB phantom)');
        this.removeCapability('onoff').catch(() => {});
      }
      // Re-try mfr/pid settings once device may have woken
      MfrHelper.ensureManufacturerSettings(this, this.zclNode).catch(() => {});
    }, 6 * 60 * 1000);

    // v5.5.293: SELECTIVE alarm_contact removal - some devices are button+contact sensors
    // v5.7.51: Use ManufacturerNameHelper for robust retrieval
    const manufacturerName = MfrHelper.getManufacturerName(this);
    const productId = MfrHelper.getModelId(this);
    const isHybridDevice = this._isHybridButtonContactDevice(manufacturerName, productId);

    if (this.hasCapability('alarm_contact')) {
      if (isHybridDevice) {
        this.log('[BUTTON] ✅ Keeping alarm_contact capability (hybrid button+contact device)');
        // Ensure flow triggers are properly connected for contact sensor functionality
        await this._setupContactSensorFlows();
      } else {
        this.log('[BUTTON] ⚠️ Removing incorrect alarm_contact capability (pure button device)');
        await this.removeCapability('alarm_contact').catch((err) => {
          this.log(`[BUTTON] ⚠️ Failed to remove alarm_contact: ${err.message}`);
        });
      }
    } else if (isHybridDevice) {
      // Add alarm_contact capability for devices that don't have it
      try {
        await this.addCapability('alarm_contact');
        this.log('[BUTTON] ✅ Added alarm_contact capability (hybrid button+contact device)');
        await this._setupContactSensorFlows();
      } catch (e) {
        this.log('[BUTTON] ⚠️ Could not add alarm_contact capability:', e.message);
      }
    }

    // v5.5.224: Register capability listeners for button.X capabilities
    // This prevents "missing capability listener" errors and handles virtual button dedup
    await this._registerButtonCapabilityListeners();

    // v5.7.19: Universal scene mode switching (TS004F only — TS0041–44 skip 0x8004)
    // Moved from button_wireless_4 to base class so ALL button drivers benefit
    await this._universalSceneModeSwitch(zclNode);

    // v10.3.0 FIX (B3): Register the genScenes recall listener at init too —
    // previously it only ran on the first Device Announce (first wake).
    // Guarded internally against double registration.
    await this._registerSceneRecallListener(zclNode).catch((err) => {
      this.log('[BUTTON-SCENE] Init registration failed (non-critical):', err.message);
    });

    // Note: Physical and Virtual button detection is now automatically
    // initialized by the root TuyaZigbeeDevice.js base class (v7.1.0)
    // v5.8.76: Delayed battery read on init — fixes '?' until first press
    // Sleepy button devices may still be awake briefly after init (pairing/reboot)
    // v9.0.50 FIX batterie '?' : fallback robuste avec timer Homey bindé.
    const _batTimer = this.homey?.setTimeout ? this.homey.setTimeout.bind(this.homey) : globalThis.setTimeout;
    _batTimer(async () => {
      try {
        if (this._destroyed) {return;}
        if (this.hasCapability('measure_battery') && this.getCapabilityValue('measure_battery') === null) {
          // Try restore from store first (instant)
          const stored = await Promise.resolve(this.getStoreValue('last_battery_percentage')).catch(() => null);
          if (stored !== null && typeof stored === 'number') {
            await this.safeSetCapabilityValue('measure_battery', stored).catch((err) => {
              this.log(`[BUTTON-BATTERY] ⚠️ Failed to set stored battery: ${err.message}`);
            });
            this.log(`[BUTTON-BATTERY] ✅ Restored from store: ${stored}%`);
          } else {
            // Try ZCL read (device may still be awake)
            await this._readBatteryWhileAwake();
          }
        }
      } catch (e) {
        this.log(`[BUTTON-BATTERY] ⚠️ Init battery read failed: ${e.message}`);
      }
    }, 5000);

    // v9.0.88: Removed duplicate _registerButtonCapabilityListeners() call.
    // First call at line 241 already registers all button.X listeners.
    // Calling twice caused double listener registration → double-triggering.

    this.log('[BUTTON] ✅ ButtonDevice ready');
    this._ensureBatteryIngest();
    this._registerHybridTuyaBatteryFallback();
  }

  /**
   * v9.0.50 : Register capability listeners for button.X capabilities
   * Porté de v5.11.205-stable (perdu lors du commit TITAN V5 53234799d).
   * Buttons sont "virtual" — ils déclenchent des flows mais ne sont pas settable.
   * Le listener no-op empêche l'erreur "Missing Capability Listener".
   */
  async _registerButtonCapabilityListeners() {
    // v9.0.410: shared guard with the TuyaZigbeeDevice universal version —
    // whichever runs first wins, no double registration.
    if (this._buttonCapListenersRegistered) { return; }
    this._buttonCapListenersRegistered = true;
    const buttonCount = this.buttonCount || this.gangCount || 1;

    // Init déduplication virtual/physical (évite double-trigger)
    if (!this._virtualPhysicalDedup) {
      this._virtualPhysicalDedup = {
        lastVirtualPress: {},
        lastPhysicalPress: {},
        dedupWindow: 2000,
      };
    }

    for (let i = 1; i <= buttonCount; i++) {
      const capId = `button.${i}`;
      if (this.hasCapability(capId)) {
        try {
          const buttonNum = i;
          this.registerCapabilityListener(capId, async () => {
            this.log(`[BUTTON] Button ${buttonNum} capability triggered (virtual press)`);
            const now = Date.now();
            // v10.6.0 FIX: check BEFORE stamping — a dropped virtual press must
            // NOT shadow a real physical press within the dedup window.
            const lastPhysical = this._virtualPhysicalDedup.lastPhysicalPress[buttonNum] || 0;
            if (now - lastPhysical < this._virtualPhysicalDedup.dedupWindow) {
              this.log(`[DEDUP] Skipping virtual trigger (physical press ${now - lastPhysical}ms ago)`);
              return;
            }
            this._virtualPhysicalDedup.lastVirtualPress[buttonNum] = now;
            await this.triggerButtonPress(buttonNum, 'single', 1, { source: 'virtual' });
          });
          this.log(`[BUTTON] Registered listener for ${capId}`);
        } catch (err) {
          this.log(`[BUTTON] Could not register ${capId}: ${err.message}`);
        }
      }
    }

    // Battery capability : pas de listener requis (read-only) mais on log
    if (this.hasCapability('measure_battery') && !this._batteryListenerRegistered) {
      this._batteryListenerRegistered = true;
      this.log('[BUTTON] Battery capability present');
    }
  }

  /**
   * Universal Scene Mode Switching (TS004F only)
   *
   * Research: SmartThings, Z2M #7158, ZHA #1372
   * - Cluster 6, attribute 0x8004 = mode (0=dimmer, 1=scene)
   * - DataType 0x30 (Enum8)
   * WHY(P2254): TS0041–44 NEVER need 0x8004 — writing 32772 kills physical presses
   * (meter91 / Nobø). Only true TS004F (writeSceneAttr=true) gets this path.
   *
   * v5.9.4: Skip E000 devices (use E000 for multi-press, not 0x8004)
   * v5.9.4: Retry logic with escalating delays
   */
  async _universalSceneModeSwitch(zclNode) {
    const productId = MfrHelper.getModelId(this);
    const manufacturerName = MfrHelper.getManufacturerName(this);
    this.log(`[BUTTON-MODE] Device: ${productId || 'unknown'} / ${manufacturerName || 'unknown'}`);

    DeviceOperatingMode.registerOperationModeListener(this, zclNode);

    const family = DeviceOperatingMode.classifyOperatingFamily(this);
    const profile = typeof this.getDeviceProfile === 'function' ? this.getDeviceProfile() : null;
    const profileSkip = !!(profile?.skip8004 || profile?.writeSceneAttr === false);
    if (!family.writeSceneAttr || profileSkip) {
      this.log(`[BUTTON-MODE] Device does not need mode switching (${family.family}${profileSkip ? ',profileSkip' : ''})`);
      return;
    }

    const buttonModeSetting = this.getSetting?.('button_mode') || family.defaultMode || 'scene';
    if (buttonModeSetting === 'dimmer' || buttonModeSetting === 'command') {
      this.log('[BUTTON-MODE] User chose dimmer mode — writing command/dimmer (0x8004=0)');
    }

    try {
      const r = await DeviceOperatingMode.applyDesiredMode(this, zclNode);
      if (r.ok && !r.skipped) {
        this.log(`[BUTTON-MODE] Scene mode set successfully (${r.via})`);
        this._lastSceneModeApply = Date.now();
        await this.setStoreValue('button_mode', r.desired === 'command' ? 'dimmer' : 'scene').catch(() => {});
        await this.setStoreValue('scene_mode_switch_failed', false).catch(() => {});
        return;
      }
      if (r.unsupported) {
        this.log('[BUTTON-MODE] 0x8004 unsupported on this firmware — stop retrying');
        await this.setStoreValue('scene_mode_switch_failed', true).catch(() => {});
        await this.setStoreValue('scene_mode_switch_failed_at', new Date().toISOString()).catch(() => {});
        return;
      }
      this.log(`[BUTTON-MODE] Mode switch not verified: ${r.reason || r.skipped || 'unknown'}`);
    } catch (err) {
      this.log(`[BUTTON-MODE] Mode switching error: ${err.message}`);
    }
  }

  /**
   * v5.5.796: Dynamically ensure button capabilities exist (Forum fix Cam)
   * Homey SDK3 supports addCapability/removeCapability at runtime!
   * This fixes devices that were paired before capabilities were defined.
   * 
   * v5.5.796: FORUM FIX - Ensure at least 1 button even if detection fails
   */
  async _ensureDynamicCapabilities() {
    // v5.5.796: FORUM FIX - Ensure buttonCount is valid (at least 1)
    // Some devices fail detection and end up with 0 buttons = no GUI
    let buttonCount = this.buttonCount;
    if (!buttonCount || buttonCount < 1) {
      this.log('[BUTTON] ⚠️ Invalid buttonCount, defaulting to 1');
      buttonCount = 1;
      this.buttonCount = 1;
    }
    this.log(`[BUTTON] 🔄 Checking dynamic capabilities for ${buttonCount} buttons...`);

    // Build required capabilities list based on buttonCount
    const requiredCapabilities = [];
    for (let i = 1; i <= buttonCount; i++) {
      requiredCapabilities.push(`button.${i}`);
    }
    requiredCapabilities.push('measure_battery');

    // Track what was added/removed
    let added = 0;
    let removed = 0;

    // Add missing capabilities
    for (const cap of requiredCapabilities) {
      if (!this.hasCapability(cap)) {
        this.log(`[BUTTON] ➕ Adding missing capability: ${cap}`);
        try {
          await this.addCapability(cap);
          added++;
          this.log(`[BUTTON] ✅ Added: ${cap}`);
        } catch (err) {
          this.error(`[BUTTON] ❌ Failed to add ${cap}:`, err.message);
        }
      }
    }

    // Remove forbidden capabilities (onoff should never be on a button!)
    const forbiddenCaps = ['onoff', 'alarm_motion'];
    for (const cap of forbiddenCaps) {
      if (this.hasCapability(cap)) {
        this.log(`[BUTTON] ➖ Removing forbidden capability: ${cap}`);
        try {
          await this.removeCapability(cap);
          removed++;
          this.log(`[BUTTON] ✅ Removed: ${cap}`);
        } catch (err) {
          this.error(`[BUTTON] ❌ Failed to remove ${cap}:`, err.message);
        }
      }
    }

    // Log summary
    if (added > 0 || removed > 0) {
      this.log(`[BUTTON] 📊 Dynamic capabilities: +${added} added, -${removed} removed`);
    } else {
      this.log('[BUTTON] ✅ All capabilities already present');
    }

    // Return current capabilities for logging
    return this.getCapabilities();
  }

  /**
   * v5.5.224: Register capability listeners for button capabilities
   * Buttons are "virtual" - they trigger flows but don't have settable values
   */

  // NOTE: _registerButtonCapabilityListeners is defined at line 285 (v9.0.50).
  // The v5.5.224 duplicate that was here has been removed — it was silently
  // overwriting the richer v9.0.50 version with dedup init + gangCount fallback.

  /**
   * v5.5.295: ENHANCED button+contact device detection
   * Based on research from 10+ sources: Zigbee2MQTT, ZHA, Tuya Developer, ioBroker
   * These devices function as both wireless buttons AND contact sensors
   */
  _isHybridButtonContactDevice(manufacturerName, productId) {
    // SOS/Emergency buttons (TS0215A series) - EXPANDED from research
    const sosButtons = ['TS0215A', 'TS0215', 'TS0218', 'TS0216A'];
    if (sosButtons.some(model => productId && containsCI(productId, model))) {
      this.log(`[BUTTON] 🆘 SOS button detected: ${productId} - enabling alarm_contact`);
      return true;
    }

    // Enhanced manufacturer detection from 10+ sources research
    const hybridManufacturers = [
      // From Zigbee2MQTT Issues #13159, #12819
      '_TZ3000_4fsgukof',  // TS0215A SOS confirmed
      '_TZ3000_0dumfk2z',  // TS0215A variant
      '_TZ3000_fsiepnrh',  // Emergency + door/window sensor
      '_TZ3000_p6ju8myv',  // SOS + magnetic contact
      '_TZ3000_pkfazisv',  // TS0215A variant from research
      '_TZ3000_wr2ucaj9',  // SOS button confirmed
      // From ZHA GitHub issues and ioBroker
      '_TZ3000_ixla93vd',  // Multi-function confirmed
      '_TZ3000_ja5osu5g',  // Wireless switch + contact
      '_TZ3400_keyjhapk',  // Smart button + sensor
      // From Tuya Developer Forum
      '_TZ3000_bi6lpsew',  // Emergency alarm button
      '_TZ3000_qnpiukdu',  // SOS with contact detection
    ];

    if (includesCI(hybridManufacturers, manufacturerName)) {
      this.log(`[BUTTON] 🔍 device confirmed from research: ${manufacturerName} / ${productId}`);
      return true;
    }

    // Check for specific product patterns that indicate functionality
    const hybridPatterns = ['SOS', 'Emergency', 'Door', 'Window', 'Contact'];
    const deviceName = this.getName() || '';
    if (hybridPatterns.some(pattern =>
      containsCI(deviceName, pattern) || containsCI(productId, pattern)
    )) {
      this.log(`[BUTTON] 🔍 Pattern-matched device: ${deviceName} / ${productId}`);
      return true;
    }

    return false;
  }

  /**
   * v5.5.310: Setup contact sensor flow triggers for devices
   * Ensures contact_opened/contact_closed flows work correctly
   * Also binds to IAS Zone cluster (1280) for SOS/emergency buttons
   */
  async _setupContactSensorFlows() {
    if (!this.hasCapability('alarm_contact')) {
      return;
    }

    // v5.5.310: Dynamic IAS Zone binding for devices only
    // This was removed from driver.compose.json to fix binding failures on pure buttons
    try {
      const ep = this.zclNode?.endpoints?.[1];
      const iasZoneCluster = ep?.clusters?.iasZone || ep?.clusters?.ssIasZone || ep?.clusters?.[1280];
      if (iasZoneCluster && typeof iasZoneCluster.bind === 'function') {
        await iasZoneCluster.bind();
        this.log('[BUTTON] ✅ IAS Zone cluster bound for device');
      }
    } catch (bindErr) {
      this.log('[BUTTON] ⚠️ IAS Zone bind skipped:', bindErr.message);
    }

    try {
      // Register capability listener for alarm_contact to trigger flows
      this.registerCapabilityListener('alarm_contact', async (value) => {
        this.log(`[BUTTON-CONTACT] Contact ${value ? 'opened' : 'closed'}`);

        // Trigger appropriate flow cards
        try {
          const cardId = value ? 'contact_opened' : 'contact_closed';
          await this.homey.flow.getDeviceTriggerCard(cardId)
            .trigger(this, {}).catch(() => {
              // Flow card may not exist for this driver - try generic ones
              this.log(`[BUTTON-CONTACT] ⚠️ Flow card '${cardId}' not found, trying generic`);
            });
        } catch (err) {
          this.log(`[BUTTON-CONTACT] ⚠️ Flow trigger error: ${err.message}`);
        }

        return Promise.resolve();
      });

      this.log('[BUTTON] ✅ Contact sensor flow triggers configured');
    } catch (err) {
      this.log(`[BUTTON] ⚠️ Contact sensor flow setup error: ${err.message}`);
    }
  }

  /**
   * v5.5.492: Applique la configuration dynamique basée sur manufacturerName
   * Includes TS004F scene mode switching (attribute 0x8004)
   */
  async _applyManufacturerConfig() {
    // v5.5.916: Fixed manufacturer/model retrieval - use settings/store like other drivers
    const settings = this.getSettings?.() || {};
    const store = this.getStore?.() || {};
    const data = this.getData() || {};
    
    // v5.8.77: Added zclNode + _cached sources — fixes blank mfr on first init
    const manufacturerName = settings.zb_manufacturer_name || 
                             store.manufacturerName || 
                             data.manufacturerName || 
                             this.zclNode?.manufacturerName ||
                             this._cachedManufacturerName ||
                             'unknown';
    const productId = settings.zb_model_id || 
                      store.modelId || 
                      data.productId || 
                      this.zclNode?.modelId ||
                      this._cachedModelId ||
                      'unknown';

    this.log(`[BUTTON] 🔍 Config: ${manufacturerName} / ${productId}`);

    // v5.8.80: Apply registry profile if available
    const profile = this.getDeviceProfile?.() || this._deviceProfile;
    if (profile && profile.dpMappings) {
      this._dynamicDpMappings = profile.dpMappings;
      this.log(`[BUTTON] 📋 Registry profile: ${profile.id}`);
    }
    if (profile?.quirks) {this._profileQuirks = profile.quirks;}

    // Get dynamic configuration
    const config = ManufacturerVariationManager.getManufacturerConfig(
      manufacturerName,
      productId,
      'button_wireless'
    );

    // Apply configuration
    ManufacturerVariationManager.applyManufacturerConfig(this, config);

    this.log(`[BUTTON] ⚙️ Protocol: ${config.protocol}`);
    this.log(`[BUTTON] 🔌 Endpoints: ${Object.keys(config.endpoints || {}).join(', ') || 'default'}`);
    this.log(`[BUTTON] 📡 ZCL Clusters: ${(config.zclClusters || []).join(', ') || 'none'}`);
    this.log(`[BUTTON] 🎯 Primary cluster: ${config.primaryCluster || 'scenes'}`);

    if (config.specialHandling) {
      this.log(`[BUTTON] ⭐ Special handling: ${config.specialHandling}`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // v5.5.492: TS004F SCENE MODE SWITCHING
    // TS004F defaults to Dimmer mode - must switch to Scene mode for multi-press
    // Source: Z2M #7158, ZHA #1372, SmartThings Community
    // ═══════════════════════════════════════════════════════════════════════════
    if (config.sceneModeAttribute) {
      await this._switchToSceneMode(config.sceneModeAttribute);
    }
  }

  /**
   * v5.5.492: Switch TS004F to Scene Mode
   * Attribute 0x8004 on onOff cluster: 0=Dimmer, 1=Scene
   * Scene mode enables single/double/long press detection
   * Dimmer mode only supports single press
   */

  /**
   * v5.8.0: Schedule periodic scene mode recovery for battery devices
   * Based on Hubitat kkossev TS004F driver - battery devices lose mode after sleep
   */

  /**
   * v5.8.1: Re-apply scene mode when device wakes up (button pressed)
   * Based on Hubitat/Z2M research: TS004F devices lose scene mode after deep sleep
   * This is called after each button press to ensure mode is maintained
   */

  /**
   * Setup button click detection
   * Handles single, double, long press, and multi-press
   *
   * Tuya TS0043/TS0044 devices send commands via:
   * - scenes.recall (MOST COMMON for Tuya buttons)
   * - onOff.toggle/on/off (some devices)
   * - levelControl.step (dimmer buttons)
   */

  /**
   * Handle button command (press/release)
   */

  /**
   * v5.9.6: Helper — try flow card silently, log only success
   */

  /**
   * Trigger flow cards for button press
   */

  /**
   * v5.5.225: ENHANCED battery reading for sleepy button devices
   * Reads battery immediately when button is pressed (device is awake!)
   * Multiple fallback methods: ZCL cluster, Tuya DP, voltage conversion
   */
  async _readBatteryWhileAwake() {
    // Debounce - don't read too often (but allow first read immediately)
    const now = Date.now();
    const lastRead = this._lastBatteryRead || 0;
    const isFirstRead = !this._lastBatteryRead;

    // Allow first read, then debounce to once per 30 seconds
    if (!isFirstRead && now - lastRead < 30000) {return;}
    this._lastBatteryRead = now;

    if (!this.hasCapability('measure_battery')) {
      this.log('[BUTTON-BATTERY] ⚠️ No measure_battery capability');
      return;
    }

    this.log('[BUTTON-BATTERY] 🔋 Button pressed - reading battery (device awake)...');

    let batteryRead = false;

    // METHOD 1: ZCL Power Configuration cluster (standard)
    try {
      const powerClusters = this._getButtonPowerClusters();

      for (const { endpointId, cluster: powerCluster } of powerClusters) {
        if (batteryRead) {break;}

        this.log(`[BUTTON-BATTERY] 📡 Trying ZCL powerConfiguration cluster on EP${endpointId}...`);

        if (typeof powerCluster.readAttributes === 'function') {
          const setTimer = this.homey?.setTimeout ? this.homey.setTimeout.bind(this.homey) : setTimeout;
          const data = await Promise.race([
            powerCluster.readAttributes(['batteryPercentageRemaining', 'batteryVoltage']),
            new Promise((_, reject) => setTimer(() => {
              if (this._destroyed) {return;}
              reject(new Error('Timeout'));
            }, 3000)),
          ]).catch(e => {
            this.log('[BUTTON-BATTERY] ⚠️ readAttributes failed:', e.message);
            return null;
          });

          if (data?.batteryVoltage !== undefined) {
            await this._storeButtonBatteryVoltage(data.batteryVoltage);
          }

          if (data?.batteryPercentageRemaining !== undefined) {
            batteryRead = await this._ingestButtonBatterySample(data.batteryPercentageRemaining, {
              protocol: 'zcl',
              source: `ZCL EP${endpointId}`,
            });
          }

          if (!batteryRead && data?.batteryVoltage !== undefined && data.batteryVoltage > 0) {
            batteryRead = await this._ingestButtonBatterySample(data.batteryVoltage, {
              protocol: 'voltage',
              source: `ZCL voltage EP${endpointId} (raw ${data.batteryVoltage})`,
            });
          }
        }

        if (!batteryRead && powerCluster.batteryPercentageRemaining !== undefined) {
          batteryRead = await this._ingestButtonBatterySample(powerCluster.batteryPercentageRemaining, {
            protocol: 'zcl',
            source: `direct attr EP${endpointId}`,
          });
        }

        if (!batteryRead && powerCluster.batteryVoltage !== undefined && powerCluster.batteryVoltage > 0) {
          await this._storeButtonBatteryVoltage(powerCluster.batteryVoltage);
          batteryRead = await this._ingestButtonBatterySample(powerCluster.batteryVoltage, {
            protocol: 'voltage',
            source: `direct voltage EP${endpointId} (raw ${powerCluster.batteryVoltage})`,
          });
        }
      }
    } catch (e) {
      this.log('[BUTTON-BATTERY] ⚠️ ZCL method failed:', e.message);
    }

    // METHOD 2: Tuya DP (some buttons report battery via DP101, DP15 or DP4)
    if (!batteryRead) {
      try {
        const tuyaCluster = this.zclNode?.endpoints?.[1]?.clusters?.tuya ||
          this.zclNode?.endpoints?.[1]?.clusters?.[0xEF00] ||
          this.zclNode?.endpoints?.[1]?.clusters?.[61184];

        if (tuyaCluster && typeof tuyaCluster.dataQuery === 'function') {
          this.log('[BUTTON-BATTERY] 📡 Trying Tuya DP for battery...');
          // Request battery DP (common DPs: 4, 15, 101, 3)
          for (const dp of [4, 15, 101, 3]) {
            try {
              await tuyaCluster.dataQuery({ dp });
            } catch (e) {
              this.log(`[BUTTON-BATTERY] ⚠️ Tuya DP${dp} query failed: ${e.message}`);
            }
          }
        }
      } catch (e) {
        this.log(`[BUTTON-BATTERY] ⚠️ Tuya DP method failed: ${e.message}`);
      }
    }

    // METHOD 3: Check stored value from last report
    if (!batteryRead) {
      const storedBattery = await Promise.resolve(this.getStoreValue('last_battery_percentage')).catch(() => null);
      if (storedBattery !== null && storedBattery !== undefined) {
        this.log(`[BUTTON-BATTERY] ℹ️ Using stored battery: ${storedBattery}%`);
        batteryRead = await this._ingestButtonBatterySample(storedBattery, {
          protocol: 'cached',
          source: 'store-restore',
        });
      }
    }

    if (!batteryRead) {
      this.log('[BUTTON-BATTERY] ⚠️ Could not read battery (device may have gone back to sleep)');
    }
  }

  /**
   * v5.5.225: Handle battery report from Tuya DP
   */
  async _handleTuyaBatteryDP(dp, value) {
    if (!this.hasCapability('measure_battery')) {return;}

    this._ensureBatteryIngest();
    const battery = typeof this.normalizeBatteryPercent === 'function'
      ? this.normalizeBatteryPercent(value, { protocol: 'tuya-dp', dp: Number(dp) })
      : this._normalizeButtonDpBattery(Number(dp), value);
    if (battery === null) {return;}

    const prev = Number(this.getCapabilityValue('measure_battery'));
    if (Number.isFinite(prev) && prev === battery) {return;}
    const now = Date.now();
    if (!this._battLastDP) {this._battLastDP = 0;}
    if (Number.isFinite(prev) && (now - this._battLastDP) < 300000 && Math.abs(battery - prev) < 2) {return;}
    this._battLastDP = now;

    await this._ingestButtonBatterySample(value, {
      protocol: 'tuya-dp',
      dp: Number(dp),
      source: `Tuya DP${dp}`,
    });
  }

  /**
   * Set number of buttons for this device
   */
  setButtonCount(count) {
    this.buttonCount = count;
  }

  /**
   * Get button count
   */
  getButtonCount() {
    return this.buttonCount || 1;
  }

  /**
   * Normalize all button-event vocabularies into the flow router vocabulary.
   * Physical devices report many variants: hold, long_press, triple, click, press.
   */
  _normalizeButtonPressType(pressType = 'single', count = 1) {
    const raw = String(pressType || 'single')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');
    const aliases = {
      press: 'single',
      pressed: 'single',
      click: 'single',
      clicked: 'single',
      single_press: 'single',
      single_click: 'single',
      short: 'single',
      on: 'single',
      off: 'single',
      toggle: 'single',
      command_on: 'single',
      command_off: 'double',
      command_toggle: 'long',
      command_on_with_timed_off: 'single',
      command_off_with_effect: 'double',
      command_toggle_with_effect: 'long',
      commandon: 'single',
      commandoff: 'double',
      commandtoggle: 'long',
      brightness_step_up: 'single',
      brightness_step_down: 'single',
      brightness_move_up: 'long',
      brightness_move_down: 'long',
      brightness_stop: 'release',
      stop: 'release',
      // WHY (P2235): smart knob 0xFC — map to single for flow cards; type kept in options
      rotate_left: 'single',
      rotate_right: 'single',
      rotate_stop: 'single',
      rotation_left: 'single',
      rotation_right: 'single',
      double_press: 'double',
      double_click: 'double',
      double_clicked: 'double',
      hold: 'long',
      held: 'long',
      long_press: 'long',
      long_pressed: 'long',
      triple: 'multi',
      triple_press: 'multi',
      triple_click: 'multi',
      triple_clicked: 'multi',
      multi_press: 'multi',
      release: 'release',
      released: 'release',
      button_release: 'release',
    };

    let type = aliases[raw] || raw;
    if (!['single', 'double', 'long', 'multi', 'release'].includes(type)) {
      type = resolvePressType(pressType, 'BUTTON-FLOW');
      type = aliases[String(type || '').toLowerCase().replace(/[\s-]+/g, '_')] || type || 'single';
    }

    const rawCount = count && typeof count === 'object'
      ? count.clicks ?? count.count ?? count.value ?? 1
      : count;
    const numericCount = Math.max(1, Number(rawCount) || 1);
    if (type === 'multi') {
      return { type, count: Math.max(numericCount, 3) };
    }
    if (type === 'double') {
      return { type, count: Math.max(numericCount, 2) };
    }
    return { type, count: numericCount };
  }

  /**
   * v7.1.2: Trigger button press flow cards
   * Called by button_wireless_scene, button_wireless_wall, button_wireless_valve
   * and BaseUnifiedDevice.onCommand() for button-class devices.
   * Resolves press type, triggers per-button + generic flow cards,
   * and reads battery on wake for sleepy devices.
   *
   * v5.5.430: GLOBAL DEBOUNCE - Prevent random ghost triggers
   * v5.7.14: Bidirectional deduplication (virtual <-> physical)
   * v5.7.12: Click pattern detection for triple press and hold release
   *
   * @param {number} buttonNumber - Button/endpoint number (1-based)
   * @param {string} pressType - 'single', 'double', 'long', 'multi', 'release'
   * @param {number} count - Click count for multi-press
   * @param {Object} options - { source: 'physical'|'virtual' }
   */
  async triggerButtonPress(buttonNumber, pressType = 'single', count = 1, options = {}) {
    const source = options.source || 'physical';
    let button = Number(buttonNumber) || 1;
    // v10.4.0 (Hubitat kkossev): reverse button order preference — some
    // remotes number their buttons 3,4,2,1 physically. Setting flips the
    // mapping at the single central routing point (all paths funnel here).
    if (source === 'physical' && this.getSetting?.('reverse_button_order') === true) {
      const gangs = this.buttonCount || this.gangCount || 1;
      if (gangs > 1 && button >= 1 && button <= gangs) {
        button = gangs + 1 - button;
      }
    }
    const normalized = this._normalizeButtonPressType(pressType, count);
    const type = normalized.type;
    count = normalized.count;

    // v5.5.430: GLOBAL DEBOUNCE - Prevent random ghost triggers
    const now = Date.now();
    if (!this._lastTriggerTime) {this._lastTriggerTime = {};}

    // v5.7.14: Bidirectional deduplication - virtual <-> physical
    if (this._virtualPhysicalDedup) {
      const dedupWindow = this._virtualPhysicalDedup.dedupWindow || 2000;

      if (source === 'physical') {
        this._virtualPhysicalDedup.lastPhysicalPress[button] = now;
        const lastVirtual = this._virtualPhysicalDedup.lastVirtualPress[button] || 0;
        if (now - lastVirtual < dedupWindow) {
          this.log(`[DEDUP] Skipping physical trigger (virtual press ${now - lastVirtual}ms ago)`);
          return;
        }
      } else if (source === 'virtual') {
        this.log('[DEDUP] Virtual button press (source: app/flow)');
      }
    }

    // v5.5.805: Anti-auto-trigger protection - LESS AGGRESSIVE (Forum fix Ronny_M/Cam/Hartmut)
    if (this._buttonTriggerProtection) {
      const timeSinceLastTrigger = now - this._buttonTriggerProtection.lastTrigger;
      const currentMinute = new Date(now).getMinutes();

      // v5.5.805: Check for suspicious hourly x:30 pattern - only block after 2+ consecutive
      if (currentMinute === 30 && timeSinceLastTrigger > (50 * 60 * 1000) && timeSinceLastTrigger < (70 * 60 * 1000)) {
        this._buttonTriggerProtection.hourlyPatternCount = (this._buttonTriggerProtection.hourlyPatternCount || 0) + 1;

        if (this._buttonTriggerProtection.hourlyPatternCount >= 2) {
          this.log(`[ANTI-TRIGGER] BLOCKED: Repeated hourly pattern detected (${this._buttonTriggerProtection.hourlyPatternCount}x)`);
          return;
        } else {
          this.log(`[ANTI-TRIGGER] Hourly pattern detected (${this._buttonTriggerProtection.hourlyPatternCount}x) - allowing this time`);
        }
      } else {
        this._buttonTriggerProtection.hourlyPatternCount = 0;
      }

      // v5.5.805/v10.1.3: Minimum interval protection per button.
      // Multi-gang remotes may legitimately send different buttons close together.
      if (!this._buttonTriggerProtection.lastByButton) {
        this._buttonTriggerProtection.lastByButton = {};
      }
      const lastForButton = this._buttonTriggerProtection.lastByButton[button] || 0;
      const timeSinceLastButton = now - lastForButton;
      if (timeSinceLastButton < this._buttonTriggerProtection.minInterval && timeSinceLastButton > 0) {
        this.log(`[ANTI-TRIGGER] Debounced button ${button} (${timeSinceLastButton}ms < ${this._buttonTriggerProtection.minInterval}ms)`);
        return;
      }

      this._buttonTriggerProtection.lastByButton[button] = now;
      this._buttonTriggerProtection.lastTrigger = now;
    }

    this._lastTriggerTime[`${button}_${type}`] = now;

    // v5.5.430: Reset button capability to false after trigger (fixes "stays true" issue)
    const buttonCapId = `button.${button}`;
    if (this.hasCapability(buttonCapId)) {
      await this.safeSetCapabilityValue(buttonCapId, true).catch(() => {});
      safeSetTimeout(this, async () => {
        if (this._destroyed) {return;}
        await this.safeSetCapabilityValue(buttonCapId, false).catch(() => {});
      }, 500);
    }

    this.log(`[BUTTON-FLOW] triggerButtonPress(btn=${button}, type=${type})`);
    if (typeof this._triggerPhysicalFlow === 'function') {
      this._triggerPhysicalFlow(button, type, { _internalTrigger: true });
    }

    try {
      const driverId = this.driver?.id || 'button_wireless';
      if (source === 'virtual') {
        await this._tryCard('virtual_button_pressed', { gang: button, type }, { button, source });
      }

      // v5.7.13: Smart deduplication - track native events
      const DEDUP_WINDOW = 1000;

      // If this is a native triple/multi with count>=3, mark it
      if (type === 'multi' && count >= 3) {
        this._nativeEventTracker.lastTripleTime[button] = now;
        this._nativeEventTracker.nativeTripleSupport = true;
        this.log(`[SMART-DEDUP] Native triple detected for button ${button} - will skip software detection`);
        const patternKey = `btn_${button}`;
        if (this._clickPatternState[patternKey]?.timer) {
          clearTimeout(this._clickPatternState[patternKey].timer);
          this._clickPatternState[patternKey].count = 0;
        }
      }

      // If this is a native release event, mark it
      if (type === 'release') {
        this._nativeEventTracker.lastReleaseTime[button] = now;
        this._nativeEventTracker.nativeReleaseSupport = true;
        this.log(`[SMART-DEDUP] Native release detected for button ${button} - will skip timer-based detection`);
        const releaseKey = `release_${button}`;
        if (this._holdReleaseTimers[releaseKey]) {
          clearTimeout(this._holdReleaseTimers[releaseKey]);
          delete this._holdReleaseTimers[releaseKey];
        }
      }

      // v5.7.12: Click pattern detection for triple press (software detection)
      // v5.7.13: ONLY if device doesn't natively support triple press
      if (type === 'single') {
        const patternKey = `btn_${button}`;
        const TRIPLE_CLICK_WINDOW = 600;

        const hasNativeTriple = this._nativeEventTracker.nativeTripleSupport === true;

        if (hasNativeTriple) {
          this.log('[SMART-DEDUP] Skipping software triple detection (device has native support)');
        } else {
          if (!this._clickPatternState[patternKey]) {
            this._clickPatternState[patternKey] = { count: 0, timer: null, lastClick: 0 };
          }

          const state = this._clickPatternState[patternKey];
          const timeSinceLast = now - state.lastClick;

          if (timeSinceLast < TRIPLE_CLICK_WINDOW) {
            state.count++;
          } else {
            state.count = 1;
          }
          state.lastClick = now;

          if (state.timer) {clearTimeout(state.timer);}

          state.timer = (this.homey?.setTimeout ? this.homey.setTimeout.bind(this.homey) : globalThis.setTimeout)(() => {
            if (this._destroyed) {return;}
            const recentNativeTriple = (Date.now() - (this._nativeEventTracker.lastTripleTime[button] || 0)) < DEDUP_WINDOW;
            if (state.count >= 3 && !recentNativeTriple) {
              this.log(`[CLICK-PATTERN] Software triple click detected on button ${button}!`);
              this.triggerButtonPress(button, 'multi', 3);
            }
            state.count = 0;
          }, TRIPLE_CLICK_WINDOW);
        }
      }

      // v5.7.12: Hold release detection - start timer when long press detected
      // v5.7.13: ONLY if device doesn't natively support release events
      if (type === 'long') {
        const releaseKey = `release_${button}`;
        const HOLD_RELEASE_DELAY = 2000;

        const hasNativeRelease = this._nativeEventTracker.nativeReleaseSupport === true;

        if (hasNativeRelease) {
          this.log('[SMART-DEDUP] Skipping timer-based release (device has native support)');
        } else {
          if (this._holdReleaseTimers[releaseKey]) {
            clearTimeout(this._holdReleaseTimers[releaseKey]);
          }
          this._holdReleaseTimers[releaseKey] = (this.homey?.setTimeout ? this.homey.setTimeout.bind(this.homey) : globalThis.setTimeout)(() => {
            if (this._destroyed) {return;}
            const recentNativeRelease = (Date.now() - (this._nativeEventTracker.lastReleaseTime[button] || 0)) < DEDUP_WINDOW;
            if (!recentNativeRelease) {
              this.log(`[HOLD-RELEASE] Button ${button} released (software detection after hold timeout)`);
              this._triggerHoldRelease(button);
            }
          }, HOLD_RELEASE_DELAY);
        }
      }

      // v5.9.6: Prefer compose-real IDs only.
      // button_wireless_4 compose uses *_button_4gang_button_N_* (NOT *_button_N_button_pressed).
      // scene_switch_4 compose uses both *_button_N_pressed and *_button_4gang_button_N_*.
      const gangCount = Math.max(1, Number(this.buttonCount || this.gangCount || 1) || 1);
      const btnNum = Number(button) || 1;
      const btnStr = String(button);
      const sceneStyle = /scene_switch/.test(driverId);

      // WHY (P2235): preserve rotate_* in matrix action when PhysicalButtonMixin stamps options
      const matrixAction = options.rotate && options.type ? String(options.type) : type;
      await this._tryCard('button_matrix',
        { button: btnStr, action: matrixAction },
        { button: btnStr, action: matrixAction });

      if (type === 'single') {
        await this._tryCard('button_pressed', { button: btnNum }, { button: btnNum });
        if (gangCount > 1) {
          await this._tryCard(`${driverId}_button_${gangCount}gang_button_pressed`, { button: btnStr }, { button: btnStr });
          await this._tryCard(`${driverId}_button_${gangCount}gang_button_${button}_pressed`);
        }
        await this._tryCard(`${driverId}_button_pressed`, { button: btnStr }, { button: btnStr });
        if (sceneStyle || gangCount === 1) {
          await this._tryCard(`${driverId}_button_${button}_pressed`, { button: btnStr }, { button: btnStr });
        }
      } else if (type === 'double') {
        await this._tryCard('button_double_press', { button: btnNum }, { button: btnNum });
        if (gangCount > 1) {
          await this._tryCard(`${driverId}_button_${gangCount}gang_button_${button}_double`);
          await this._tryCard(`${driverId}_button_${gangCount}gang_button_double_press`, { button: btnStr }, { button: btnStr });
        }
        await this._tryCard(`${driverId}_button_double_press`, { button: btnStr }, { button: btnStr });
        if (sceneStyle || gangCount === 1) {
          await this._tryCard(`${driverId}_button_${button}_double`, { button: btnStr }, { button: btnStr });
        }
      } else if (type === 'long') {
        await this._tryCard('button_long_press', { button: btnNum }, { button: btnNum });
        if (gangCount > 1) {
          await this._tryCard(`${driverId}_button_${gangCount}gang_button_${button}_long`);
          await this._tryCard(`${driverId}_button_${gangCount}gang_button_long_press`, { button: btnStr }, { button: btnStr });
        }
        await this._tryCard(`${driverId}_button_long_press`, { button: btnStr }, { button: btnStr });
        if (sceneStyle || gangCount === 1) {
          await this._tryCard(`${driverId}_button_${button}_long`, { button: btnStr }, { button: btnStr });
        }
      } else if (type === 'multi') {
        await this._tryCard('button_multi_press', { button: btnNum, count }, { button: btnNum, count });
        if (gangCount > 1) {
          await this._tryCard(`${driverId}_button_${gangCount}gang_button_multi_press`, { button: btnStr, count }, { button: btnStr, count });
          if (count === 3) {
            await this._tryCard(`${driverId}_button_${gangCount}gang_button_${button}_triple`);
          }
        }
        if (count === 3) {
          await this._tryCard('button_triple_clicked', { button: btnNum }, { button: btnNum });
          if (sceneStyle || gangCount === 1) {
            await this._tryCard(`${driverId}_button_${button}_triple`, { button: btnStr }, { button: btnStr });
          }
        }
      } else if (type === 'release') {
        await this._tryCard('button_release', { button: btnNum }, { button: btnNum });
        if (gangCount > 1) {
          await this._tryCard(`${driverId}_button_${gangCount}gang_button_${button}_release`);
        }
        await this._tryCard(`${driverId}_button_release`, { button: btnStr }, { button: btnStr });
        if (sceneStyle || gangCount === 1) {
          await this._tryCard(`${driverId}_button_${button}_release`, { button: btnStr }, { button: btnStr });
        }
      }

      this.log('[BUTTON-FLOW] Done');

      // v5.5.111: Read battery while device is awake (button just pressed!)
      this._readBatteryWhileAwake();

      // v5.8.1: Re-apply scene mode for TS004F after wake
      this._reapplySceneModeOnWake();

    } catch (err) {
      this.error(`[BUTTON-FLOW] triggerButtonPress error: ${err.message}`);
    }
  }

  /**
   * v5.7.12: Trigger hold release flow card
   * Called after long press timeout to simulate button release
   * v7.1.1: Implemented -- was previously an empty body causing hold-release flows to silently drop
   */
  async _triggerHoldRelease(button) {
    try {
      const driverId = this.driver?.id || 'button_wireless';
      const gangCount = this.buttonCount || 1;
      const btnNum = Number(button) || 1;

      // v10.5.0: matrix card also covers release (Hue/Aqara 4-state vocabulary)
      await this._tryCard('button_matrix',
        { button: String(btnNum), action: 'release' },
        { button: String(btnNum), action: 'release' });

      // Flow card ID pattern: ${driverId}_button_${gangCount}gang_button_${N}_release
      const releaseCardId = gangCount === 1
        ? `${driverId}_button_1gang_button_${btnNum}_release`
        : `${driverId}_button_${gangCount}gang_button_${btnNum}_release`;

      this.log(`[HOLD-RELEASE] Triggering: ${releaseCardId}`);

      if (this.homey?.flow) {
        const triggerCard = this.homey.flow.getDeviceTriggerCard(releaseCardId);
        if (typeof triggerCard?.trigger === 'function') {
          await triggerCard.trigger(this, { button: btnNum }, {});
          this.log(`[HOLD-RELEASE] ${releaseCardId} triggered successfully`);
          return;
        }
      }

      // Fallback: try the mid-form release card without per-button suffix
      // (${driverId}_button_${gangCount}gang_button_release)
      const midCardId = `${driverId}_button_${gangCount}gang_button_release`;
      if (midCardId !== releaseCardId && this.homey?.flow) {
        try {
          const midCard = this.homey.flow.getDeviceTriggerCard(midCardId);
          if (typeof midCard?.trigger === 'function') {
            await midCard.trigger(this, { button: btnNum }, {});
            this.log(`[HOLD-RELEASE] Fallback ${midCardId} triggered`);
            return;
          }
        } catch (_) { /* mid-form card not defined */ }
      }

      // Fallback: try the generic release card without per-button suffix
      const fallbackCardId = `${driverId}_button_release`;
      if (this.homey?.flow) {
        try {
          const fallbackCard = this.homey.flow.getDeviceTriggerCard(fallbackCardId);
          if (typeof fallbackCard?.trigger === 'function') {
            await fallbackCard.trigger(this, { button: btnNum }, {});
            this.log(`[HOLD-RELEASE] Fallback ${fallbackCardId} triggered`);
            return;
          }
        } catch (_) { /* fallback card not defined */ }
      }

      this.log(`[HOLD-RELEASE] No release flow card found for button ${btnNum}`);
    } catch (err) {
      this.log(`[HOLD-RELEASE] Error triggering release flow: ${err.message}`);
    }
  }

  /**
   * v5.5.492: Switch TS004F to Scene Mode (with dimmer fallback)
   * Attribute 0x8004 on onOff cluster: 0=Dimmer, 1=Scene
   * Scene mode enables single/double/long press detection
   * Dimmer mode only supports single press
   * v7.1.1: Added dimmer fallback when scene mode write fails
   */
  async _switchToSceneMode(sceneModeAttr) {
    // WHY: legacy path hammered genOnOff 0x8004 even when DeviceOperatingMode
    // already classified the remote as no-attr (TS0044) or firmware rejected it
    // (Nobø SWS-IZ _TZ3000_xffhmvhv / diag 9cbf9eb6 — "32772 is not a valid attribute").
    // Prefer DeviceOperatingMode; never spam wake re-apply after unsupported.
    try {
      if (this.getStoreValue?.('scene_mode_switch_failed')
        || this.getStoreValue?.('tuya_operation_mode_unsupported')) {
        this.log('[BUTTON-MODE] skip 0x8004 — previously unsupported on this device');
        return;
      }
      const family = DeviceOperatingMode.classifyOperatingFamily(this);
      if (!family.writeSceneAttr) {
        this.log(`[BUTTON-MODE] skip 0x8004 (${family.family})`);
        return;
      }
      const zclNode = (sceneModeAttr && typeof sceneModeAttr === 'object' && sceneModeAttr.endpoints)
        ? sceneModeAttr
        : this.zclNode;
      const r = await DeviceOperatingMode.applyDesiredMode(this, zclNode);
      if (r?.ok && !r.skipped) {
        this.log(`[BUTTON-MODE] Scene mode set successfully (${r.via || 'DeviceOperatingMode'})`);
        this._lastSceneModeApply = Date.now();
        await this.setStoreValue('scene_mode_switch_failed', false).catch(() => {});
        return;
      }
      if (r?.unsupported || /not a valid attribute|UNSUPPORTED_ATTRIBUTE/i.test(String(r?.reason || ''))) {
        this.log('[BUTTON-MODE] 0x8004 unsupported — stop retrying');
        await this.setStoreValue('scene_mode_switch_failed', true).catch(() => {});
        await this.setStoreValue('tuya_operation_mode_unsupported', true).catch(() => {});
        return;
      }
      if (r?.skipped) {
        this.log(`[BUTTON-MODE] skip 0x8004 (${r.skipped})`);
        return;
      }
    } catch (err) {
      this.log(`[BUTTON-MODE] Scene mode write failed: ${err.message}`);
      if (/not a valid attribute|UNSUPPORTED_ATTRIBUTE/i.test(err.message || '')) {
        await this.setStoreValue('scene_mode_switch_failed', true).catch(() => {});
        await this.setStoreValue('tuya_operation_mode_unsupported', true).catch(() => {});
      }
    }
  }

  /**
   * v5.5.492: Universal scene mode switch (called from onSettings 'auto' mode)
   * Auto-detects whether device needs scene mode and applies it.
   * v7.1.1: Implemented -- was previously causing unhandled rejection on 'auto' mode select
   */
  // v9.0.53 FIX HIGH : cette méthode est un DUPLICATE de _universalSceneModeSwitch (ligne 311).
  // En JS, la 2ème définition écrase la 1ère silencieusement → la version riche (E000-aware +
  // MfrHelper + containsCI) était DEAD CODE. Supprimée pour restaurer la version correcte.
  // Scene/event vs command is owned by DeviceOperatingMode (TS004F only).

  /**
   * v5.8.0: Schedule periodic scene mode recovery for battery devices
   * Based on Hubitat kkossev TS004F driver - battery devices lose mode after sleep
   */
  _scheduleSceneModeRecovery() {
    if (this._sceneRecoveryTimer) {
      safeClearTimeout(this, this._sceneRecoveryTimer);
    }

    this._sceneRecoveryTimer = safeSetTimeout(this, async () => {
      if (this._destroyed) {return;}
      this.log('[BUTTON-MODE] Periodic scene mode recovery check...');
      await this._switchToSceneMode(0x8004);
      // Re-schedule (4 hours)
      this._scheduleSceneModeRecovery();
    }, 4 * 60 * 60 * 1000);
  }

  /**
   * v5.8.1: Re-apply scene mode when device wakes up (button pressed)
   * Based on Hubitat/Z2M research: TS004F devices lose scene mode after deep sleep
   * This is called after each button press to ensure mode is maintained
   */
  async _reapplySceneModeOnWake() {
    if (this.getStoreValue?.('scene_mode_switch_failed')
      || this.getStoreValue?.('tuya_operation_mode_unsupported')) {
      return;
    }
    const family = DeviceOperatingMode.classifyOperatingFamily(this);
    if (!family.writeSceneAttr) {return;}

    const now = Date.now();
    const lastApply = this._lastSceneModeApply || 0;

    // Debounce re-application (max once per 10 minutes)
    if (now - lastApply < 10 * 60 * 1000) {return;}

    this.log('[BUTTON-MODE] Re-applying scene mode on wake...');
    await this._switchToSceneMode(this.zclNode);
  }

  /**
   * v5.9.6: Helper -- try flow card silently, log only success
   * @private
   */
  async _tryCard(cardId, tokens = {}, state = {}) {
    try {
      if (!this.homey?.flow || !cardId) {return false;}
      const { expandIdCaseVariants, findDeclaredCI, collectDeclaredFlowIds, resolveFlowCardId } = require('../flow/FlowCardHeuristics');
      const { safeGetFlowCard, isNoopFlowCard } = require('../io/HomeyCompensationLayer');
      const declared = collectDeclaredFlowIds(this.homey);
      // Case-less: Homey may register flow IDs with different casing than driver.id
      const variants = expandIdCaseVariants(cardId);
      let resolved = null;
      for (const v of variants) {
        resolved = findDeclaredCI(declared, v);
        if (resolved) {break;}
      }
      // WHY: Homey truncates long trigger ids to prefix_<5hex>. findDeclaredCI is
      // exact/case-fold only, so hashed compose cards (button_wireless_4_ts0041,
      // handheld_remote_4_buttons, remote_button_* , smart_remote_*) never match
      // constructed `${driverId}_button_${N}gang_button_pressed`. resolveFlowCardId
      // already strips _[a-f0-9]{5}$. Do not unhash compose cards.
      if (!resolved && declared.size) {
        const heur = resolveFlowCardId(variants, declared);
        if (heur && findDeclaredCI(declared, heur)) {resolved = heur;}
      }
      if (declared.size && !resolved) {
        // Still try app-level universal cards even if not listed in device triggers
        const appLevel = /^(button_pressed|button_double_press|button_long_press|button_matrix|virtual_button_pressed|button_triple_clicked|button_multi_press|button_release)$/i;
        if (!appLevel.test(cardId)) {return false;}
        resolved = cardId;
      }
      // WHY (P2247): only call Homey getters for resolved/declared IDs — no speculative spray
      const tryIds = resolved ? [resolved] : (declared.size ? [] : variants);
      for (const id of tryIds) {
        const card = safeGetFlowCard(this.homey, id, 'trigger', declared.size ? declared : null);
        if (isNoopFlowCard(card) || typeof card?.trigger !== 'function') {continue;}
        await card.trigger(this, tokens, state);
        this.log(`[BUTTON-FLOW] ${id} triggered`);
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  /**
   * v6.0: Manual Mode Override Setting
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.includes('button_mode')) {
      this.log(`[BUTTON-MODE] 🔄 Mode setting changed to: ${  newSettings.button_mode}`);
      const family = DeviceOperatingMode.classifyOperatingFamily(this);
      if (!family.writeSceneAttr) {
        this.log(`[BUTTON-MODE] ${family.family} has no 0x8004 — Homey setting stored only`);
      } else {
        const r = await DeviceOperatingMode.writeOperationMode(
          this,
          this.zclNode,
          newSettings.button_mode === 'auto' ? (family.defaultMode || 'scene') : newSettings.button_mode,
        );
        if (r.ok) {
          this.log(`[BUTTON-MODE] ✅ Switched to ${newSettings.button_mode} via ${r.via}`);
        } else if (r.unsupported) {
          this.log('[BUTTON-MODE] 0x8004 unsupported — toggle on the remote (hold 2+4 ~6s)');
        } else if (newSettings.button_mode === 'auto') {
          await this._universalSceneModeSwitch(this.zclNode);
        } else {
          this.error('[BUTTON-MODE] ❌ Failed to switch mode:', r.reason);
        }
      }
    }
    
    // Call parent if exists
    if (typeof super.onSettings === 'function') {
      return super.onSettings({ oldSettings, newSettings, changedKeys });
    }
  }

  /**
   * Cleanup on device uninit
   * v5.7.12: Clear all timers to prevent memory leaks
   */
  async onUninit() {
    this.log('[BUTTON] onUninit called - cleaning up resources...');

    // v5.8.0: Clear scene mode recovery timer
    if (this._sceneModeRecoveryTimer) {
      this.homey.clearInterval(this._sceneModeRecoveryTimer);
      this._sceneModeRecoveryTimer = null;
    }

    // v5.7.12: Clear hold release timers
    if (this._holdReleaseTimers) {
      for (const key of Object.keys(this._holdReleaseTimers)) {
        if (this._holdReleaseTimers[key]) {
          clearTimeout(this._holdReleaseTimers[key]);
        }
      }
      this._holdReleaseTimers = {};
    }

    // v5.7.12: Clear click pattern timers
    if (this._clickPatternState) {
      for (const key of Object.keys(this._clickPatternState)) {
        if (this._clickPatternState[key]?.timer) {
          clearTimeout(this._clickPatternState[key].timer);
        }
      }
      this._clickPatternState = {};
    }

    // v5.8.0: Clear scene recovery timer (alternate name)
    if (this._sceneRecoveryTimer) {
      safeClearTimeout(this, this._sceneRecoveryTimer);
      this._sceneRecoveryTimer = null;
    }

    // Call super onUninit to cascade cleanup through Mixins and Base
    if (typeof super.onUninit === 'function') {
      await super.onUninit();
    }
  }

}

module.exports = ButtonDevice;
