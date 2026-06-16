'use strict';

const { AutoAdaptiveDevice } = require('../dynamic');
const ManufacturerVariationManager = require('../ManufacturerVariationManager');
const { includesCI, containsCI } = require('../utils/CaseInsensitiveMatcher');
const MfrHelper = require('../helpers/ManufacturerNameHelper');
const { PRESS_MAP, resolve: resolvePressType } = require('../utils/TuyaPressTypeMap');

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
  }

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

    // Note: Physical and Virtual button detection is now automatically
    // initialized by the root TuyaZigbeeDevice.js base class (v7.1.0)
    // v5.8.76: Delayed battery read on init — fixes '?' until first press
    // Sleepy button devices may still be awake briefly after init (pairing/reboot)
    this.homey.setTimeout(async () => {
      try {
        if (this.hasCapability('measure_battery') && this.getCapabilityValue('measure_battery') === null) {
          // Try restore from store first (instant)
          const stored = this.getStoreValue('last_battery_percentage');
          if (stored !== null && typeof stored === 'number') {
            await this.setCapabilityValue('measure_battery', stored).catch((err) => {
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

    this.log('[BUTTON] ✅ ButtonDevice ready');
  }

  /**
   * v5.7.19: Universal Scene Mode Switching
   * Applies to ALL button devices that may need mode 0→1 (dimmer→scene)
   * 
   * Research: SmartThings, Z2M #7158, ZHA #1372
   * - Cluster 6, attribute 0x8004 = mode (0=dimmer, 1=scene)
   * - DataType 0x30 (Enum8)
   * - Some TS0044 devices also need this despite being "scene" devices
   */

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
      deviceName.toLowerCase().includes(pattern.toLowerCase()) ||
      productId.toLowerCase().includes(pattern.toLowerCase())
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
      const ep1 = this.zclNode?.endpoints?.[1];
      if (ep1) {
        const powerCluster =
          ep1.clusters?.powerConfiguration ||
          ep1.clusters?.genPowerCfg ||
          ep1.clusters?.[0x0001] ||
          ep1.clusters?.['powerConfiguration'];

        if (powerCluster) {
          this.log('[BUTTON-BATTERY] 📡 Trying ZCL powerConfiguration cluster...');

          // Try readAttributes if available
          if (typeof powerCluster.readAttributes === 'function') {
            const data = await Promise.race([
              powerCluster.readAttributes(['batteryPercentageRemaining', 'batteryVoltage']),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
            ]).catch(e => {
              this.log('[BUTTON-BATTERY] ⚠️ readAttributes failed:', e.message);
              return null;
            });

            // v5.8.69: Don't reject 0 — dead battery legitimately reports 0. Only reject 255 (invalid)
            if (data?.batteryPercentageRemaining !== undefined &&
              data.batteryPercentageRemaining !== 255) {
              const battery = Math.round(data.batteryPercentageRemaining / 2);
              this.log(`[BUTTON-BATTERY] ✅ ZCL Battery: ${battery}%`);
              if (this.hasCapability('measure_battery')) {
                await this.setCapabilityValue('measure_battery', parseFloat(battery)).catch((err) => {
                  this.log(`[BUTTON-BATTERY] ⚠️ Failed to set ZCL battery: ${err.message}`);
                });
              } else {
                this.log('[BUTTON-BATTERY] ⚠️ No measure_battery capability (removed by adapter?)');
              }
              batteryRead = true;
            } else if (data?.batteryVoltage !== undefined && data.batteryVoltage > 0) {
              const voltage = data.batteryVoltage / 10;
              // v5.8.67: Non-linear CR2032 curve instead of broken linear formula
              const battery = this._voltageToPercentCurve(Math.round(voltage * 1000));
              this.log(`[BUTTON-BATTERY] ✅ Battery from voltage: ${voltage}V → ${battery}%`);
              if (this.hasCapability('measure_battery')) {
                await this.setCapabilityValue('measure_battery', parseFloat(battery)).catch((err) => {
                  this.log(`[BUTTON-BATTERY] ⚠️ Failed to set voltage battery: ${err.message}`);
                });
              } else {
                this.log('[BUTTON-BATTERY] ⚠️ No measure_battery capability (removed by adapter?)');
              }
              batteryRead = true;
            }
          }

          // Try direct attribute access if readAttributes failed
          if (!batteryRead && powerCluster.batteryPercentageRemaining !== undefined) {
            const raw = powerCluster.batteryPercentageRemaining;
            // v5.8.69: Don't reject 0 — dead battery legitimately reports 0
            if (raw !== 255) {
              const battery = Math.round(raw / 2);
              this.log(`[BUTTON-BATTERY] ✅ Direct attr Battery: ${battery}%`);
              if (this.hasCapability('measure_battery')) {
                await this.setCapabilityValue('measure_battery', parseFloat(battery)).catch((err) => {
                  this.log(`[BUTTON-BATTERY] ⚠️ Failed to set direct attr battery: ${err.message}`);
                });
              } else {
                this.log('[BUTTON-BATTERY] ⚠️ No measure_battery capability (removed by adapter?)');
              }
              batteryRead = true;
            }
          }
        }
      }
    } catch (e) {
      this.log('[BUTTON-BATTERY] ⚠️ ZCL method failed:', e.message);
    }

    // METHOD 2: Tuya DP (some buttons report battery via DP101 or DP4)
    if (!batteryRead) {
      try {
        const tuyaCluster = this.zclNode?.endpoints?.[1]?.clusters?.tuya ||
          this.zclNode?.endpoints?.[1]?.clusters?.[0xEF00] ||
          this.zclNode?.endpoints?.[1]?.clusters?.[61184];

        if (tuyaCluster && typeof tuyaCluster.dataQuery === 'function') {
          this.log('[BUTTON-BATTERY] 📡 Trying Tuya DP for battery...');
          // Request battery DP (common DPs: 4, 101, 3)
          for (const dp of [4, 101, 3]) {
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
          await this.setCapabilityValue('measure_battery', parseFloat(storedBattery)).catch((err) => {
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

    let battery = null;

    // DP4: battery percentage (some devices send 0-100, some 0-200)
    if (dp === 4) {
      battery = value > 100 ? Math.round(value / 2) : value;
    }
    // DP101: battery percentage
    else if (dp === 101) {
      battery = value > 100 ? Math.round(value / 2) : value;
    }
    // DP3: battery level enum (0=low, 1=medium, 2=high)
    else if (dp === 3 && value <= 2) {
      battery = value === 0 ? 10 : value === 1 ? 50 : 100;
    }

    if (battery !== null && battery >= 0 && battery <= 100) {
      // v5.8.70: Anti-flood — dedup + 5min throttle
      const prev = this.getCapabilityValue('measure_battery');
      if (prev === battery) {return;}
      const now = Date.now();
      if (!this._battLastDP) {this._battLastDP = 0;}
      if (prev !== null && (now - this._battLastDP) < 300000 && Math.abs(battery - prev) < 2) {return;}
      this._battLastDP = now;

      this.log(`[BUTTON-BATTERY] ✅ Tuya DP${dp} Battery: ${battery}%`);
      if (this.hasCapability('measure_battery')) {
        await this.setCapabilityValue('measure_battery', parseFloat(battery)).catch((err) => {
          this.log(`[BUTTON-BATTERY] ⚠️ Failed to set Tuya DP battery: ${err.message}`);
        });
      }
      await this.setStoreValue('last_battery_percentage', battery).catch((err) => {
        this.log(`[BUTTON-BATTERY] ⚠️ Failed to store battery value: ${err.message}`);
      });
    }
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
   * v7.1.2: Trigger button press flow cards
   * Called by button_wireless_scene, button_wireless_wall, button_wireless_valve
   * and BaseUnifiedDevice.onCommand() for button-class devices.
   * Resolves press type, triggers per-button + generic flow cards,
   * and reads battery on wake for sleepy devices.
   * @param {number} buttonNumber - Button/endpoint number (1-based)
   * @param {string} pressType - 'single', 'double', 'long', etc.
   */
  async triggerButtonPress(buttonNumber, pressType) {
    const driverId = this.driver?.id || 'button_wireless';
    const gangCount = this.buttonCount || 1;
    const btn = Number(buttonNumber) || 1;
    const pt = pressType || 'single';

    this.log(`[BUTTON-FLOW] triggerButtonPress(btn=${btn}, type=${pt})`);

    // v7.1.2: Try PhysicalButtonMixin / VirtualButtonMixin dispatch first
    if (typeof this._triggerPhysicalFlow === 'function') {
      this._triggerPhysicalFlow(btn, pt);
    }

    // Trigger per-button flow card (e.g. button_wireless_2_button_2gang_button_1_pressed)
    const perButtonId = `${driverId}_button_${gangCount}gang_button_${btn}_${pt === 'single' ? 'pressed' : pt === 'double' ? 'double' : pt === 'long' ? 'long' : pt}`;
    await this._tryCard(perButtonId, { button: String(btn) });

    // Trigger generic flow card (e.g. button_wireless_2_button_2gang_button_pressed)
    const genericSuffix = pt === 'single' ? 'pressed' : pt === 'double' ? 'double_press' : pt === 'long' ? 'long_press' : pt;
    const genericId = `${driverId}_button_${gangCount}gang_button_${genericSuffix}`;
    await this._tryCard(genericId, { button: String(btn) });

    // Read battery on wake (device is awake after button press)
    await this._readBatteryWhileAwake();
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

    const attrId = sceneModeAttr || 0x8004;

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
  async _universalSceneModeSwitch(zclNode) {
    const productId = this.getSetting?.('zb_model_id') || '';
    const mfr = this.getSetting?.('zb_manufacturer_name') || '';

    // Determine if this device needs scene mode
    const needsScene = productId.includes('TS004F') ||
      productId.includes('TS0044') ||
      productId.includes('TS0041') ||
      productId.includes('TS0042') ||
      productId.includes('TS0043');

    if (needsScene) {
      this.log('[BUTTON-MODE] Auto: Device needs scene mode, switching...');
      await this._switchToSceneMode(0x8004);
      this._scheduleSceneModeRecovery();
    } else {
      this.log('[BUTTON-MODE] Auto: Device does not require scene mode switch');
    }
  }

  /**
   * v5.8.0: Schedule periodic scene mode recovery for battery devices
   * Based on Hubitat kkossev TS004F driver - battery devices lose mode after sleep
   */
  _scheduleSceneModeRecovery() {
    if (this._sceneRecoveryTimer) {
      this.homey.clearTimeout(this._sceneRecoveryTimer);
    }

    this._sceneRecoveryTimer = this.homey.setTimeout(async () => {
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
   * 🛡️ STANDARDIZED RAW FRAME HANDLER
   * Intercepts unhandled ZigBee frames before Homey SDK routing
   * v5.13.2: Specifically captures scene and onOff commands that SDK3 misses
   */
  async onUninit() {
    this.log('[BUTTON] onUninit called - cleaning up resources...');

    // Call super onUninit to cascade cleanup through Mixins and Base
    if (typeof super.onUninit === 'function') {
      await super.onUninit();
    }
  }

}

module.exports = ButtonDevice;
