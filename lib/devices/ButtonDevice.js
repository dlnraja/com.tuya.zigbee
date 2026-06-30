'use strict';

const { AutoAdaptiveDevice } = require('../dynamic');
const ManufacturerVariationManager = require('../ManufacturerVariationManager');
const { includesCI, containsCI } = require('../utils/CaseInsensitiveMatcher');
const MfrHelper = require('../helpers/ManufacturerNameHelper');
const { PRESS_MAP, resolve: resolvePressType } = require('../utils/TuyaPressTypeMap');

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

    return {
      manufacturer,
      modelId,
      profile,
      chemistry: profile?.chemistry || 'CR2032',
    };
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
        treat200AsSentinel: context.profile?.zcl200IsPercent !== true,
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
    const orderedIds = Object.keys(endpoints)
      .map(id => Number(id))
      .filter(id => Number.isFinite(id))
      .sort((a, b) => (a === 1 ? -1 : b === 1 ? 1 : a - b));
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

    const voltage = raw / 10;
    await this.setStoreValue('battery_voltage', voltage).catch(() => {});
    await this.setStoreValue('batteryVoltage', raw).catch(() => {});
  }

  async _setButtonBattery(percent, source = 'unknown') {
    if (percent === undefined || percent === null) {return false;}
    const value = Math.max(0, Math.min(100, Math.round(Number(percent))));
    if (!Number.isFinite(value)) {return false;}

    this.log(`[BUTTON-BATTERY] ✅ ${source}: ${value}%`);
    if (typeof this._updateBattery === 'function') {
      await this._updateBattery(value);
    } else if (this.hasCapability('measure_battery')) {
      await this.safeSetCapabilityValue('measure_battery', value).catch((err) => {
        this.log(`[BUTTON-BATTERY] ⚠️ Failed to set battery: ${err.message}`);
      });
      await this.setStoreValue('last_battery_percentage', value).catch(() => {});
    }
    await this.setStoreValue('last_battery_time', Date.now()).catch(() => {});
    return true;
  }

  /**
   * v5.2.92: Force BUTTON profile to prevent SWITCH detection
   */
  constructor(...args) {
    super(...args);

    // 🔒 FORCE BUTTON PROFILE - Never detect as SWITCH
    this._forcedDeviceType = 'BUTTON';
    this._skipHybridTypeDetection = true;

    // Buttons should NEVER have onoff capability
    this._forbiddenCapabilities = ['onoff'];

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
   * v9.0.88 BACKPORT from stable-v5: fastInitMode
   * Tells the base class to defer complex initialization for sleepy battery buttons.
   * TS0041-44 devices sleep after 3-5 seconds — we must be fast.
   */
  get fastInitMode() { return true; }

  /**
   * v9.0.50 BACKPORT from v5.11.205-stable : _updateBattery
   * Méthode unifiée de mise à jour batterie (capability + store).
   * Perdue lors d'un sync, restaurée pour fix batterie '?' sur boutons.
   */
  async _updateBattery(percentage) {
    if (percentage === undefined || percentage === null) return;
    const value = parseFloat(percentage);
    if (isNaN(value)) return;
    this.log(`[BUTTON-BATTERY] Set battery: ${value}%`);
    // v9.0.54 FIX CRITICAL : _safeSetCapability n'existe PAS dans la chaîne ButtonDevice
    // (CapabilityManagerMixin n'est pas hérité). Fallback vers setCapabilityValue direct.
    if (typeof this._safeSetCapability === 'function') {
      await this._safeSetCapability('measure_battery', value).catch(() => {});
    } else {
      await this.safeSetCapabilityValue('measure_battery', value).catch(() => {});
    }
    await this.setStoreValue('last_battery_percentage', value).catch(() => {});
  }

  /**
   * v9.0.54 : Fallback _safeSetCapability si CapabilityManagerMixin absent.
   * ButtonDevice n'hérite pas de CapabilityManagerMixin (contrairement à UnifiedSwitchBase).
   * Cette méthode empêche le TypeError quand _updateBattery ou d'autres l'appellent.
   */
  async _safeSetCapabilityFallback(capability, value) {
    if (!capability || value === undefined || value === null) return false;
    // Mains-powered : skip battery capabilities
    if (this.mainsPowered && (capability === 'measure_battery' || capability === 'alarm_battery')) {
      return false;
    }
    try {
      const prev = this.getCapabilityValue(capability);
      if (prev === value) return false; // skip si pas de changement
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
    this.log('[BUTTON] Device announce (wake/rejoin) — re-binding + battery read');
    const zclNode = this.zclNode;
    if (!zclNode) return;
    const endpoints = this.buttonCount || 1;
    for (let ep = 1; ep <= endpoints; ep++) {
      const endpoint = zclNode.endpoints?.[ep];
      if (!endpoint) continue;
      const clusterIdsToBind = [5, 6, 18, 8];
      for (const cid of clusterIdsToBind) {
        try {
          const cluster = endpoint.clusters?.[cid]
            || endpoint.clusters?.[[5,'genScenes',6,'genOnOff',8,'genLevelCtrl',18,'multistateInput'][cid]];
          if (cluster?.bind) await cluster.bind();
        } catch (_e) {}
      }
    }
    // v5.11.201 : read battery on wake (sleepy devices)
    if (this._readBatteryWhileAwake) {
      await this._readBatteryWhileAwake().catch(() => {});
    }
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
    await MfrHelper.ensureManufacturerSettings(this).catch((err) => {
      this.log('[BUTTON] ⚠️ ensureManufacturerSettings failed (non-critical):', err.message || err);
    });
    
    // v5.5.805: Anti-auto-trigger protection - REDUCED from 2000ms to 500ms
    // Forum fix Ronny_M/Cam/Hartmut: 2s was too aggressive, blocking legitimate presses
    this._buttonTriggerProtection = {
      lastTrigger: 0,
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

    // v5.7.19: Universal scene mode switching for TS004F/TS0044 devices
    // Moved from button_wireless_4 to base class so ALL button drivers benefit
    await this._universalSceneModeSwitch(zclNode);

    // Note: Physical and Virtual button detection is now automatically
    // initialized by the root TuyaZigbeeDevice.js base class (v7.1.0)
    // v5.8.76: Delayed battery read on init — fixes '?' until first press
    // Sleepy button devices may still be awake briefly after init (pairing/reboot)
    // v9.0.50 FIX batterie '?' : fallback robuste avec timer Homey bindé.
    const _batTimer = this.homey?.setTimeout ? this.homey.setTimeout.bind(this.homey) : globalThis.setTimeout;
    _batTimer(async () => {
      try {
        if (this._destroyed) return;
        if (this.hasCapability('measure_battery') && this.getCapabilityValue('measure_battery') === null) {
          // Try restore from store first (instant)
          const stored = this.getStoreValue('last_battery_percentage');
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
  }

  /**
   * v9.0.50 : Register capability listeners for button.X capabilities
   * Porté de v5.11.205-stable (perdu lors du commit TITAN V5 53234799d).
   * Buttons sont "virtual" — ils déclenchent des flows mais ne sont pas settable.
   * Le listener no-op empêche l'erreur "Missing Capability Listener".
   */
  async _registerButtonCapabilityListeners() {
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
            this._virtualPhysicalDedup.lastVirtualPress[buttonNum] = now;
            const lastPhysical = this._virtualPhysicalDedup.lastPhysicalPress[buttonNum] || 0;
            if (now - lastPhysical < this._virtualPhysicalDedup.dedupWindow) {
              this.log(`[DEDUP] Skipping virtual trigger (physical press ${now - lastPhysical}ms ago)`);
              return;
            }
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
   * v5.7.19: Universal Scene Mode Switching
   * Applies to ALL button devices that may need mode 0→1 (dimmer→scene)
   *
   * Research: SmartThings, Z2M #7158, ZHA #1372
   * - Cluster 6, attribute 0x8004 = mode (0=dimmer, 1=scene)
   * - DataType 0x30 (Enum8)
   * - Some TS0044 devices also need this despite being "scene" devices
   *
   * v5.9.4: Skip E000 devices (use E000 for multi-press, not 0x8004)
   * v5.9.4: Retry logic with escalating delays
   */
  async _universalSceneModeSwitch(zclNode) {
    const productId = MfrHelper.getModelId(this);
    const manufacturerName = MfrHelper.getManufacturerName(this);

    this.log(`[BUTTON-MODE] Device: ${productId || 'unknown'} / ${manufacturerName || 'unknown'}`);

    // v5.9.4: Skip scene mode for E000 devices — they use E000 for multi-press, not 0x8004
    const hasE000 = zclNode?.endpoints && Object.values(zclNode.endpoints).some(ep =>
      ep?.clusters?.tuyaE000 || ep?.clusters?.['57344'] || ep?.clusters?.[0xE000]
    );
    if (hasE000) {
      this.log('[BUTTON-MODE] E000 cluster detected — skipping scene mode switch');
      return;
    }

    // Devices that need scene mode switching
    const needsModeSwitching =
      containsCI(productId, 'TS004F') ||
      containsCI(productId, 'TS0041') ||
      containsCI(productId, 'TS0042') ||
      containsCI(productId, 'TS0043') ||
      containsCI(productId, 'TS0044') ||
      includesCI([
        '_TZ3000_xabckq1v', '_TZ3000_czuyt8lz', '_TZ3000_pcqjmcud',
        '_TZ3000_4fjiwweb', '_TZ3000_uri7oadn', '_TZ3000_ixla93vd',
        '_TZ3000_qzjcsmar', '_TZ3000_wkai4ga5', '_TZ3000_5tqxpine',
        '_TZ3000_zgyzgdua', '_TZ3000_abrsvsou', '_TZ3000_mh9px7cq',
        '_TZ3000_vp6clf9d', '_TZ3000_rrjr1q0u'
      ], manufacturerName);

    if (!needsModeSwitching && manufacturerName) {
      this.log('[BUTTON-MODE] Device does not need mode switching');
      return;
    }

    if (!manufacturerName) {
      this.log('[BUTTON-MODE] ManufacturerName empty - attempting mode switch anyway');
    }

    try {
      const onOffCluster = zclNode?.endpoints?.[1]?.clusters?.onOff
        || zclNode?.endpoints?.[1]?.clusters?.genOnOff
        || zclNode?.endpoints?.[1]?.clusters?.[6];

      if (!onOffCluster) {
        this.log('[BUTTON-MODE] OnOff cluster not found on EP1');
        return;
      }

      // Attempt mode switch with retry
      const MODE_ATTRIBUTE = 0x8004; // 32772
      const SCENE_MODE = 1;
      const retryDelays = [0, 50, 100, 200, 500];

      for (let attempt = 0; attempt < retryDelays.length; attempt++) {
        if (attempt > 0) {
          await new Promise(r => this.homey.setTimeout(r, retryDelays[attempt]));
        }

        this.log(`[BUTTON-MODE] Attempt ${attempt + 1}/${retryDelays.length}...`);

        try {
          if (typeof onOffCluster.writeAttributes === 'function') {
            await onOffCluster.writeAttributes({ [MODE_ATTRIBUTE]: SCENE_MODE });
            this.log('[BUTTON-MODE] Scene mode set successfully');
            await this.setStoreValue('button_mode', 'scene').catch(() => {});
            return;
          }
        } catch (err) {
          this.log(`[BUTTON-MODE] Attempt ${attempt + 1} failed: ${err.message}`);
        }

        // Fallback: raw write
        try {
          if (typeof onOffCluster.write === 'function') {
            await onOffCluster.write({
              attributeId: MODE_ATTRIBUTE,
              dataType: 0x30, // Enum8
              value: SCENE_MODE
            });
            this.log('[BUTTON-MODE] Scene mode set via raw write');
            await this.setStoreValue('button_mode', 'scene').catch(() => {});
            return;
          }
        } catch (err) {
          // Silent on raw write fail
        }
      }

      this.log('[BUTTON-MODE] Mode switch not verified after all attempts');
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
            const battery = this._normalizeButtonZclBattery(data.batteryPercentageRemaining);
            if (battery !== null) {
              batteryRead = await this._setButtonBattery(battery, `ZCL EP${endpointId}`);
            }
          }

          if (!batteryRead && data?.batteryVoltage !== undefined && data.batteryVoltage > 0) {
            const voltage = Number(data.batteryVoltage) / 10;
            const context = this._getButtonBatteryProfile();
            const battery = UnifiedBatteryHandler?.calculateFromVoltage
              ? UnifiedBatteryHandler.calculateFromVoltage(voltage, context.chemistry)
              : this._voltageToPercentCurve(Math.round(voltage * 1000));
            batteryRead = await this._setButtonBattery(battery, `ZCL voltage EP${endpointId} (${voltage}V)`);
          }
        }

        if (!batteryRead && powerCluster.batteryPercentageRemaining !== undefined) {
          const battery = this._normalizeButtonZclBattery(powerCluster.batteryPercentageRemaining);
          if (battery !== null) {
            batteryRead = await this._setButtonBattery(battery, `direct attr EP${endpointId}`);
          }
        }

        if (!batteryRead && powerCluster.batteryVoltage !== undefined && powerCluster.batteryVoltage > 0) {
          await this._storeButtonBatteryVoltage(powerCluster.batteryVoltage);
          const voltage = Number(powerCluster.batteryVoltage) / 10;
          const context = this._getButtonBatteryProfile();
          const battery = UnifiedBatteryHandler?.calculateFromVoltage
            ? UnifiedBatteryHandler.calculateFromVoltage(voltage, context.chemistry)
            : this._voltageToPercentCurve(Math.round(voltage * 1000));
          batteryRead = await this._setButtonBattery(battery, `direct voltage EP${endpointId} (${voltage}V)`);
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
      const storedBattery = this.getStoreValue('last_battery_percentage');
      if (storedBattery !== null && storedBattery !== undefined) {
        this.log(`[BUTTON-BATTERY] ℹ️ Using stored battery: ${storedBattery}%`);
        if (this.hasCapability('measure_battery')) {
          await this.safeSetCapabilityValue('measure_battery', parseFloat(storedBattery)).catch((err) => {
            this.log(`[BUTTON-BATTERY] ⚠️ Failed to set stored fallback battery: ${err.message}`);
          });
        }
        batteryRead = true;
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

    const battery = this._normalizeButtonDpBattery(Number(dp), value);
    if (battery === null) {return;}

    // v5.8.70: Anti-flood — dedup + 5min throttle
    const prev = Number(this.getCapabilityValue('measure_battery'));
    if (Number.isFinite(prev) && prev === battery) {return;}
    const now = Date.now();
    if (!this._battLastDP) {this._battLastDP = 0;}
    if (Number.isFinite(prev) && (now - this._battLastDP) < 300000 && Math.abs(battery - prev) < 2) {return;}
    this._battLastDP = now;

    await this._setButtonBattery(battery, `Tuya DP${dp}`);
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
      ? (count.clicks ?? count.count ?? count.value ?? 1)
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
    const button = Number(buttonNumber) || 1;
    const normalized = this._normalizeButtonPressType(pressType, count);
    const type = normalized.type;
    count = normalized.count;

    // v5.5.430: GLOBAL DEBOUNCE - Prevent random ghost triggers
    const now = Date.now();
    if (!this._lastTriggerTime) this._lastTriggerTime = {};

    // v5.7.14: Bidirectional deduplication - virtual <-> physical
    if (this._virtualPhysicalDedup) {
      const dedupWindow = this._virtualPhysicalDedup.dedupWindow || 1500;

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

      // v5.5.805: Minimum interval protection - 500ms
      if (timeSinceLastTrigger < this._buttonTriggerProtection.minInterval && timeSinceLastTrigger > 0) {
        this.log(`[ANTI-TRIGGER] Debounced (${timeSinceLastTrigger}ms < ${this._buttonTriggerProtection.minInterval}ms)`);
        return;
      }

      this._buttonTriggerProtection.lastTrigger = now;
    }

    this._lastTriggerTime[`${button}_${type}`] = now;

    // v5.5.430: Reset button capability to false after trigger (fixes "stays true" issue)
    const buttonCapId = `button.${button}`;
    if (this.hasCapability(buttonCapId)) {
      await this.safeSetCapabilityValue(buttonCapId, true).catch(() => {});
      this.homey.setTimeout(async () => {
        if (this._destroyed) return;
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

          if (state.timer) clearTimeout(state.timer);

          state.timer = (this.homey?.setTimeout ? this.homey.setTimeout.bind(this.homey) : globalThis.setTimeout)(() => {
            if (this._destroyed) return;
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
            if (this._destroyed) return;
            const recentNativeRelease = (Date.now() - (this._nativeEventTracker.lastReleaseTime[button] || 0)) < DEDUP_WINDOW;
            if (!recentNativeRelease) {
              this.log(`[HOLD-RELEASE] Button ${button} released (software detection after hold timeout)`);
              this._triggerHoldRelease(button);
            }
          }, HOLD_RELEASE_DELAY);
        }
      }

      // v5.9.6: Use _tryCard helper for cleaner logging with comprehensive fallback patterns
      const gangCount = this.buttonCount || 1;

      if (type === 'single') {
        const btnNum = Number(button) || 1;
        const btnStr = button.toString();
        await this._tryCard('button_pressed', { button: btnNum }, { button: btnNum });
        await this._tryCard(`${driverId}_button_${gangCount}gang_button_pressed`, { button: btnStr }, { button: btnStr });
        await this._tryCard(`${driverId}_button_${gangCount}gang_button_${button}_pressed`);
        // v5.8.59: scene_switch_* fallback (no _button_Xgang infix)
        await this._tryCard(`${driverId}_button_pressed`, { button: btnStr }, { button: btnStr });
        await this._tryCard(`${driverId}_button_${button}_pressed`, { button: btnStr }, { button: btnStr });
      } else if (type === 'double') {
        const btnNum = Number(button) || 1;
        const btnStr = button.toString();
        await this._tryCard('button_double_press', { button: btnNum }, { button: btnNum });
        await this._tryCard(`${driverId}_button_${gangCount}gang_button_${button}_double`);
        await this._tryCard(`${driverId}_button_${gangCount}gang_button_double_press`, { button: btnStr }, { button: btnStr });
        // v5.8.59: scene_switch_* fallback
        await this._tryCard(`${driverId}_button_double_press`, { button: btnStr }, { button: btnStr });
        await this._tryCard(`${driverId}_button_${button}_double`, { button: btnStr }, { button: btnStr });
      } else if (type === 'long') {
        const btnNum = Number(button) || 1;
        const btnStr = button.toString();
        await this._tryCard('button_long_press', { button: btnNum }, { button: btnNum });
        await this._tryCard(`${driverId}_button_${gangCount}gang_button_${button}_long`);
        await this._tryCard(`${driverId}_button_${gangCount}gang_button_long_press`, { button: btnStr }, { button: btnStr });
        // v5.8.59: scene_switch_* fallback
        await this._tryCard(`${driverId}_button_long_press`, { button: btnStr }, { button: btnStr });
        await this._tryCard(`${driverId}_button_${button}_long`, { button: btnStr }, { button: btnStr });
      } else if (type === 'multi') {
        const btnNum = Number(button) || 1;
        const btnStr = button.toString();
        await this._tryCard('button_multi_press', { button: btnNum, count }, { button: btnNum, count });
        await this._tryCard(`${driverId}_button_${gangCount}gang_button_multi_press`, { button: btnStr, count }, { button: btnStr, count });
        if (count === 3) {
          await this._tryCard('button_triple_clicked', { button: btnNum }, { button: btnNum });
          await this._tryCard(`${driverId}_button_${gangCount}gang_button_${button}_triple`);
        }
      } else if (type === 'release') {
        const btnNum = Number(button) || 1;
        const btnStr = button.toString();
        await this._tryCard('button_release', { button: btnNum }, { button: btnNum });
        await this._tryCard(`${driverId}_button_${gangCount}gang_button_${button}_release`);
        await this._tryCard(`${driverId}_button_release`, { button: btnStr }, { button: btnStr });
        await this._tryCard(`${driverId}_button_${button}_release`, { button: btnStr }, { button: btnStr });
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
    const onOffCluster =
      this.zclNode?.endpoints?.[1]?.clusters?.onOff ||
      this.zclNode?.endpoints?.[1]?.clusters?.genOnOff ||
      this.zclNode?.endpoints?.[1]?.clusters?.[6];

    if (!onOffCluster) {
      this.log('[BUTTON-MODE] No onOff cluster found - cannot switch scene mode');
      return;
    }

    // Handle both calling conventions: attribute ID (number) or zclNode object (from mixin)
    const attrId = (typeof sceneModeAttr === 'number') ? sceneModeAttr : 0x8004;

    // Try scene mode (value=1)
    try {
      if (typeof onOffCluster.writeAttributes === 'function') {
        await onOffCluster.writeAttributes({ [attrId]: 1 });
      } else if (typeof onOffCluster.write === 'function') {
        await onOffCluster.write(attrId, 1);
      } else {
        this.log('[BUTTON-MODE] No writeAttributes/write method on onOff cluster');
        return;
      }
      this.log('[BUTTON-MODE] Scene mode set successfully (0x8004=1)');
      this._lastSceneModeApply = Date.now();
    } catch (err) {
      this.log(`[BUTTON-MODE] Scene mode write failed: ${err.message}`);

      // Fallback: try dimmer mode (value=0) so at least single-press works
      try {
        if (typeof onOffCluster.writeAttributes === 'function') {
          await onOffCluster.writeAttributes({ [attrId]: 0 });
        } else if (typeof onOffCluster.write === 'function') {
          await onOffCluster.write(attrId, 0);
        }
        this.log('[BUTTON-MODE] Fallback to dimmer mode succeeded (0x8004=0) -- single press only');
      } catch (dimmerErr) {
        this.log(`[BUTTON-MODE] Dimmer fallback also failed: ${dimmerErr.message}`);
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
  // La version ligne 311 gère correctement : E000 skip, containsCI matching, scene mode recovery.

  /**
   * v5.8.0: Schedule periodic scene mode recovery for battery devices
   * Based on Hubitat kkossev TS004F driver - battery devices lose mode after sleep
   */
  _scheduleSceneModeRecovery() {
    if (this._sceneRecoveryTimer) {
      this.homey.clearTimeout(this._sceneRecoveryTimer);
    }

    this._sceneRecoveryTimer = this.homey.setTimeout(async () => {
      if (this._destroyed) return;
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
    const now = Date.now();
    const lastApply = this._lastSceneModeApply || 0;

    // Debounce re-application (max once per 10 minutes)
    if (now - lastApply < 10 * 60 * 1000) {return;}

    this.log('[BUTTON-MODE] Re-applying scene mode on wake...');
    await this._switchToSceneMode(0x8004);
  }

  /**
   * v5.9.6: Helper -- try flow card silently, log only success
   * @private
   */
  async _tryCard(cardId, tokens = {}, state = {}) {
    try {
      if (!this.homey?.flow) {return false;}
      const card = this.homey.flow.getDeviceTriggerCard(cardId);
      if (typeof card?.trigger !== 'function') {return false;}
      await card.trigger(this, tokens, state);
      this.log(`[BUTTON-FLOW] ${cardId} triggered`);
      return true;
    } catch (_) {
      // Flow card not defined for this driver variant -- normal
      return false;
    }
  }

  /**
   * v6.0: Manual Mode Override Setting
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.includes('button_mode')) {
      this.log(`[BUTTON-MODE] 🔄 Mode setting changed to: ${  newSettings.button_mode}`);
      
      const onOffCluster = this.zclNode?.endpoints?.[1]?.clusters?.onOff
        || this.zclNode?.endpoints?.[1]?.clusters?.genOnOff
        || this.zclNode?.endpoints?.[1]?.clusters?.[6];
        
      if (!onOffCluster) {
        throw new Error('OnOff cluster not found on EP1 - device might not support mode switching');
      }

      if (newSettings.button_mode === 'scene') {
        try {
          if (typeof onOffCluster.writeAttributes === 'function') {
            await onOffCluster.writeAttributes({ [0x8004]: 1 });
          } else {
            await onOffCluster.write(0x8004, 1);
          }
          this.log('[BUTTON-MODE] ✅ Successfully switched to Scene mode!');
        } catch (err) {
          this.error('[BUTTON-MODE] ❌ Failed to switch to Scene mode:', err.message);
          throw new Error(`Failed to switch mode: ${  err.message}`);
        }
      } else if (newSettings.button_mode === 'dimmer') {
        try {
          if (typeof onOffCluster.writeAttributes === 'function') {
            await onOffCluster.writeAttributes({ [0x8004]: 0 });
          } else {
            await onOffCluster.write(0x8004, 0);
          }
          this.log('[BUTTON-MODE] ✅ Successfully switched to Dimmer mode!');
        } catch (err) {
          this.error('[BUTTON-MODE] ❌ Failed to switch to Dimmer mode:', err.message);
          throw new Error(`Failed to switch mode: ${  err.message}`);
        }
      } else if (newSettings.button_mode === 'auto') {
        await this._universalSceneModeSwitch(this.zclNode);
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
      this.homey.clearTimeout(this._sceneRecoveryTimer);
      this._sceneRecoveryTimer = null;
    }

    // Call super onUninit to cascade cleanup through Mixins and Base
    if (typeof super.onUninit === 'function') {
      await super.onUninit();
    }
  }

}

module.exports = ButtonDevice;
