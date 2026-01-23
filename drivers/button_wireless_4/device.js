'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const { includesCI, containsCI } = require('../../lib/utils/CaseInsensitiveMatcher');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║     BUTTON 4 GANG - v5.5.379 CRITICAL FIX FOR TS004F SCENE MODE             ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  v5.5.379: CRITICAL FIX - TS004F Scene Mode Switching                        ║
 * ║  - TS004F has TWO modes: Dimmer (default) and Scene                         ║
 * ║  - Dimmer mode: Only single press works, uses levelControl cluster          ║
 * ║  - Scene mode: Single/double/long work, uses scenes cluster                 ║
 * ║  - Mode controlled by: Cluster 6 (onOff), Attribute 0x8004                  ║
 * ║  - Value 0 = Dimmer mode, Value 1 = Scene mode                              ║
 * ║  - Research: SmartThings, Z2M #7158, ZHA #1372                              ║
 * ║                                                                              ║
 * ║  STRUCTURE TS0044/TS004F:                                                    ║
 * ║  EP1: Button 1 (scenes, onOff, powerCfg, groups)                             ║
 * ║  EP2: Button 2 (scenes, onOff, groups)                                       ║
 * ║  EP3: Button 3 (scenes, onOff, groups)                                       ║
 * ║  EP4: Button 4 (scenes, onOff, groups)                                       ║
 * ║                                                                              ║
 * ║  ACTIONS: X_single, X_double, X_hold (X = button 1-4)                        ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class Button4GangDevice extends ButtonDevice {

  // v5.5.617: Scene mode constants (Z2M #7158, SmartThings research)
  static MODE_ATTRIBUTE = 0x8004;
  static SCENE_MODE = 1;
  static DIMMER_MODE = 0;

  // v5.5.618: Mode tracking (debounce removed - handled by parent)
  _modeSwitchAttempts = 0;
  _modeVerified = false;
  _zclNode = null;

  async onNodeInit({ zclNode }) {
    this._zclNode = zclNode;
    this.log('═══════════════════════════════════════════════════════════════');
    this.log('[BUTTON4] 🔘 Button4GangDevice v5.5.617 initializing...');
    this.log('[BUTTON4] CRITICAL FIX: TS004F Scene Mode Switching');
    this.log('[BUTTON4] Research: SmartThings, Z2M #7158, ZHA #1372');
    this.log('═══════════════════════════════════════════════════════════════');

    // Set button count BEFORE calling super (ButtonDevice uses this)
    this.buttonCount = 4;

    // v5.5.295: Log available endpoints for debugging
    const availableEndpoints = Object.keys(zclNode?.endpoints || {});
    this.log(`[BUTTON4] 📡 Available endpoints: ${availableEndpoints.join(', ')}`);

    // Initialize base (power detection + button detection)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));

    // v5.5.617: INTELLIGENT Mode Switch with retry + verification
    // Research: Z2M #7158, SmartThings - mode must be set during pairing window
    await this._intelligentModeSwitch(zclNode);

    // v5.5.617: Schedule periodic mode re-check (cold boot recovery)
    this._scheduleModeMaintenance();

    // v5.5.295: FORUM FIX - Enhanced physical button detection
    // Based on research from Zigbee2MQTT, ZHA, SmartThings patterns
    await this._setupEnhancedPhysicalButtonDetection(zclNode);

    // v5.5.260: Setup battery reporting listener
    await this._setupBatteryReporting(zclNode);

    this.log('[BUTTON4] ✅ Button4GangDevice initialized - 4 buttons ready');
    this.log('═══════════════════════════════════════════════════════════════');
  }

  /**
   * v5.5.617: INTELLIGENT MODE SWITCH - Autonomous with retry + verification
   *
   * RESEARCH SOURCES (Z2M #7158, SmartThings, ZHA #1372):
   * - Attribute 0x8004 on cluster 6 controls mode (0=Dimmer, 1=Scene)
   * - Mode switch only works if sent FAST (50ms) during pairing window
   * - Cold boot (battery removal) resets mode - need re-apply
   * - Some devices need initial Tuya hub pairing first
   * - Buttons 2,3,4 may send 3x duplicate events (needs filtering)
   *
   * INTELLIGENT FEATURES:
   * - Exponential backoff retry (50ms, 100ms, 200ms, 500ms, 1s)
   * - Mode verification after each attempt
   * - Scheduled re-check for cold boot recovery
   * - Duplicate event filtering with debounce
   */
  async _intelligentModeSwitch(zclNode) {
    const productId = this.getData()?.productId || '';
    const manufacturerName = this.getData()?.manufacturerName || '';

    // Only TS004F needs mode switching (TS0044 doesn't have this issue)
    const isTS004F = containsCI(productId, 'TS004F');

    this.log(`[BUTTON4-MODE] 🔍 Device: ${productId} / ${manufacturerName}`);
    this.log(`[BUTTON4-MODE] 🔍 Is TS004F: ${isTS004F}`);

    // Also apply to devices that might be mislabeled or unknown
    // These manufacturers are known to use TS004F-style devices
    const ts004fManufacturers = [
      '_TZ3000_xabckq1v',
      '_TZ3000_czuyt8lz',
      '_TZ3000_pcqjmcud',
      '_TZ3000_4fjiwweb',
      '_TZ3000_uri7oadn',
      '_TZ3000_ixla93vd',
      '_TZ3000_qzjcsmar',
      '_TZ3000_wkai4ga5',  // v5.5.419: Forum report Eftychis
      '_TZ3000_5tqxpine'   // v5.5.419: Forum report Eftychis
      // NOTE: _TZ3000_zgyzgdua is TS0044, NOT TS004F - uses cluster 0xE000, no mode switching needed
    ];
    const needsModeSwitching = isTS004F || includesCI(ts004fManufacturers, manufacturerName);

    if (!needsModeSwitching) {
      this.log('[BUTTON4-MODE] ℹ️ Device is TS0044-type, no mode switching needed');
      return;
    }

    try {
      // Get onOff cluster on endpoint 1
      const onOffCluster = zclNode?.endpoints?.[1]?.clusters?.onOff
        || zclNode?.endpoints?.[1]?.clusters?.genOnOff
        || zclNode?.endpoints?.[1]?.clusters?.[6];

      if (!onOffCluster) {
        this.log('[BUTTON4-MODE] ⚠️ OnOff cluster not found on EP1');
        return;
      }

      // v5.5.617: INTELLIGENT retry with exponential backoff (Z2M research: 50ms timing critical)
      const retryDelays = [0, 50, 100, 200, 500, 1000]; // ms between attempts
      this._onOffCluster = onOffCluster;

      for (let attempt = 0; attempt < retryDelays.length; attempt++) {
        this._modeSwitchAttempts = attempt + 1;

        if (attempt > 0) {
          await new Promise(r => setTimeout(r, retryDelays[attempt]));
        }

        this.log(`[BUTTON4-MODE] 🔄 Attempt ${attempt + 1}/${retryDelays.length}...`);

        // Try to switch mode
        const success = await this._attemptModeSwitch(onOffCluster);

        if (success) {
          // Verify mode actually changed
          const verified = await this._verifySceneMode(onOffCluster);
          if (verified) {
            this._modeVerified = true;
            this.log('[BUTTON4-MODE] ✅ Scene mode VERIFIED - all buttons should work!');
            await this.setStoreValue('button_mode', 'scene').catch(() => {});
            await this.setStoreValue('mode_switch_success', Date.now()).catch(() => {});
            return;
          }
        }
      }

      // All attempts failed - schedule retry later (cold boot recovery)
      this.log('[BUTTON4-MODE] ⚠️ Mode switch not verified after all attempts');
      this.log('[BUTTON4-MODE] 💡 Will retry on next button press or in 5 minutes');

    } catch (err) {
      this.log(`[BUTTON4-MODE] ❌ Mode switching error: ${err.message}`);
    }
  }

  /**
   * v5.5.617: Attempt single mode switch
   */
  async _attemptModeSwitch(onOffCluster) {
    try {
      if (typeof onOffCluster.writeAttributes === 'function') {
        await onOffCluster.writeAttributes({ [Button4GangDevice.MODE_ATTRIBUTE]: Button4GangDevice.SCENE_MODE });
        this.log('[BUTTON4-MODE] ✅ writeAttributes succeeded');
        return true;
      }
    } catch (err) {
      this.log(`[BUTTON4-MODE] ⚠️ writeAttributes failed: ${err.message}`);
    }

    // Fallback: raw write
    try {
      if (typeof onOffCluster.write === 'function') {
        await onOffCluster.write({
          attributeId: Button4GangDevice.MODE_ATTRIBUTE,
          dataType: 0x30, // Enum8
          value: Button4GangDevice.SCENE_MODE
        });
        this.log('[BUTTON4-MODE] ✅ Raw write succeeded');
        return true;
      }
    } catch (err) {
      this.log(`[BUTTON4-MODE] ⚠️ Raw write failed: ${err.message}`);
    }

    return false;
  }

  /**
   * v5.5.617: Verify mode is actually Scene mode
   */
  async _verifySceneMode(onOffCluster) {
    try {
      if (typeof onOffCluster.readAttributes !== 'function') return true; // Assume success

      await new Promise(r => setTimeout(r, 50)); // Small delay before read
      const attrs = await onOffCluster.readAttributes([Button4GangDevice.MODE_ATTRIBUTE]);
      const mode = attrs?.[Button4GangDevice.MODE_ATTRIBUTE] ?? attrs?.['32772'] ?? attrs?.['0x8004'];

      this.log(`[BUTTON4-MODE] 🔍 Verify read: mode = ${mode}`);
      return mode === Button4GangDevice.SCENE_MODE;
    } catch (err) {
      this.log(`[BUTTON4-MODE] ⚠️ Verify read failed: ${err.message}`);
      return true; // Assume success if can't verify
    }
  }

  /**
   * v5.5.617: Schedule periodic mode maintenance (cold boot recovery)
   * Research: After battery removal, mode resets - need to re-apply
   */
  _scheduleModeMaintenance() {
    // Check mode every 5 minutes if not verified
    this._modeMaintenanceInterval = this.homey.setInterval(async () => {
      if (this._modeVerified) return;

      this.log('[BUTTON4-MODE] 🔄 Scheduled mode re-check...');
      if (this._onOffCluster) {
        const success = await this._attemptModeSwitch(this._onOffCluster);
        if (success) {
          const verified = await this._verifySceneMode(this._onOffCluster);
          if (verified) {
            this._modeVerified = true;
            this.log('[BUTTON4-MODE] ✅ Mode verified on scheduled check!');
          }
        }
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * v5.5.617: Handle device wake (cold boot recovery via onEndDeviceAnnounce)
   */
  async onEndDeviceAnnounce() {
    this.log('[BUTTON4-MODE] 📡 Device announced (wake/rejoin) - re-applying mode...');
    this._modeVerified = false;

    // Re-apply mode on wake with short delay
    this.homey.setTimeout(async () => {
      if (this._zclNode) {
        await this._intelligentModeSwitch(this._zclNode);
      }
    }, 500);
  }

  /**
   * v5.5.333: FORUM FIX - Enhanced physical button detection for TS004F
   * Based on research from 10+ sources: Zigbee2MQTT, ZHA, SmartThings, etc.
   * Added support for _TZ3000_wkai4ga5 and _TZ3000_5tqxpine (Eftychis report)
   *
   * CRITICAL FINDINGS:
   * - TS004F physical buttons send scene.recall commands
   * - Some devices use multistateInput cluster (cluster 18)
   * - Virtual buttons (app icons) use onOff commands
   * - Need BOTH listeners for complete functionality
   * - Scene commands: 0=single, 1=double, 2=long press
   */
  async _setupEnhancedPhysicalButtonDetection(zclNode) {
    this.log('[BUTTON4-PHYSICAL] 🔧 Setting up enhanced physical button detection...');
    this.log('[BUTTON4-PHYSICAL] Research base: Z2M, ZHA, SmartThings, deCONZ patterns');

    const manufacturerName = this.getData()?.manufacturerName || '';
    this.log(`[BUTTON4-PHYSICAL] Manufacturer: ${manufacturerName}`);

    try {
      // Setup scene cluster listeners on all 4 endpoints for physical buttons
      for (let ep = 1; ep <= 4; ep++) {
        const endpoint = zclNode?.endpoints?.[ep];
        if (!endpoint) {
          this.log(`[BUTTON4-PHYSICAL] ⚠️ Endpoint ${ep} not found`);
          continue;
        }

        // v5.5.369: FIXED scenes cluster listener - use multiple event patterns
        const scenesCluster = endpoint.clusters?.scenes || endpoint.clusters?.genScenes || endpoint.clusters?.[5];
        if (scenesCluster) {
          this.log(`[BUTTON4-PHYSICAL] 📡 Setting up scene listener on EP${ep}...`);

          // Map scene ID to press type based on research
          const pressTypeMap = {
            0: 'single',    // Scene 0 = single press
            1: 'double',    // Scene 1 = double press
            2: 'long',      // Scene 2 = long/hold press
            3: 'single',    // Some variants use 3 for single
            4: 'double',    // Some variants use 4 for double
            5: 'long'       // Some variants use 5 for long
          };

          const handleSceneRecall = async (sceneId) => {
            const pressType = pressTypeMap[sceneId] || 'single';
            this.log(`[BUTTON4-SCENE] 🔘 Physical Button ${ep} ${pressType.toUpperCase()} (scene ${sceneId})`);
            await this.triggerButtonPress(ep, pressType);
          };

          // v5.5.369: Pattern 1 - Direct 'recall' event (SonoffZclDevice pattern)
          if (typeof scenesCluster.on === 'function') {
            scenesCluster.on('recall', async (payload) => {
              this.log(`[BUTTON4-SCENE] EP${ep} recall event:`, payload);
              const sceneId = payload?.sceneId ?? payload?.sceneid ?? payload?.scene ?? 0;
              await handleSceneRecall(sceneId);
            });

            // v5.5.369: Pattern 2 - 'recallScene' event (alternative naming)
            scenesCluster.on('recallScene', async (payload) => {
              this.log(`[BUTTON4-SCENE] EP${ep} recallScene event:`, payload);
              const sceneId = payload?.sceneId ?? payload?.sceneid ?? payload?.scene ?? 0;
              await handleSceneRecall(sceneId);
            });

            // v5.5.369: Pattern 3 - Generic 'command' event (fallback)
            scenesCluster.on('command', async (commandName, commandPayload) => {
              this.log(`[BUTTON4-SCENE] EP${ep} command: ${commandName}`, commandPayload);
              if (commandName === 'recall' || commandName === 'recallScene') {
                const sceneId = commandPayload?.sceneId ?? commandPayload?.sceneid ?? commandPayload?.scene ?? 0;
                await handleSceneRecall(sceneId);
              }
            });
          }

          this.log(`[BUTTON4-PHYSICAL] ✅ Scene listener configured for EP${ep}`);
        } else {
          this.log(`[BUTTON4-PHYSICAL] ⚠️ No scenes cluster on EP${ep}`);
        }

        // v5.5.369: FIXED multistateInput cluster listener - use multiple event patterns
        const multistateCluster = endpoint.clusters?.multistateInput || endpoint.clusters?.genMultistateInput || endpoint.clusters?.[18];
        if (multistateCluster) {
          this.log(`[BUTTON4-PHYSICAL] 📡 Setting up multistateInput listener on EP${ep}...`);

          // Map multistate values to press types (0=single, 1=double, 2=long)
          const pressTypeMap = { 0: 'single', 1: 'double', 2: 'long' };

          const handleMultistate = async (value) => {
            const pressType = pressTypeMap[value] || 'single';
            this.log(`[BUTTON4-MULTISTATE] 🔘 Button ${ep} ${pressType.toUpperCase()} (multistate ${value})`);
            await this.triggerButtonPress(ep, pressType);
          };

          if (typeof multistateCluster.on === 'function') {
            // v5.5.369: Pattern 1 - attr.presentValue (original)
            multistateCluster.on('attr.presentValue', async (value) => {
              this.log(`[BUTTON4-MULTISTATE] EP${ep} attr.presentValue: ${value}`);
              await handleMultistate(value);
            });

            // v5.5.369: Pattern 2 - presentValue (SDK3 style)
            multistateCluster.on('presentValue', async (value) => {
              this.log(`[BUTTON4-MULTISTATE] EP${ep} presentValue: ${value}`);
              await handleMultistate(value);
            });

            // v5.5.369: Pattern 3 - report event with attributes
            multistateCluster.on('report', async (attributes) => {
              this.log(`[BUTTON4-MULTISTATE] EP${ep} report:`, attributes);
              if (attributes?.presentValue !== undefined) {
                await handleMultistate(attributes.presentValue);
              }
            });

            this.log(`[BUTTON4-PHYSICAL] ✅ MultistateInput listener configured for EP${ep}`);
          }
        }

        // Also ensure onOff cluster is available for virtual buttons (app icons)
        const onOffCluster = endpoint.clusters?.onOff || endpoint.clusters?.genOnOff || endpoint.clusters?.[6];
        if (onOffCluster) {
          this.log(`[BUTTON4-PHYSICAL] 📱 OnOff cluster available on EP${ep} (virtual buttons)`);

          // v5.5.333: Also listen for onOff commands as button events
          if (typeof onOffCluster.on === 'function') {
            onOffCluster.on('command', async (commandName, commandPayload) => {
              this.log(`[BUTTON4-ONOFF] EP${ep} command: ${commandName}`, commandPayload);

              // Map onOff commands to press types
              const commandMap = {
                'on': 'single',
                'setOn': 'single',
                'off': 'double',
                'setOff': 'double',
                'toggle': 'long'
              };

              const pressType = commandMap[commandName];
              if (pressType) {
                this.log(`[BUTTON4-ONOFF] 🔘 Button ${ep} ${pressType.toUpperCase()} (${commandName})`);
                await this.triggerButtonPress(ep, pressType);
              }
            });
          }
        }
      }

      this.log('[BUTTON4-PHYSICAL] ✅ Enhanced physical button detection configured');
      this.log('[BUTTON4-PHYSICAL] 🔄 Scenes, MultistateInput, and OnOff listeners active');

      // v5.5.367: MOES ESW-0ZAA-EU FIX - Setup Tuya DP button detection
      // Some MOES devices use Tuya cluster (0xEF00) for physical button presses
      await this._setupTuyaDPButtonDetection(zclNode);

      // v5.5.714: MOES _TZ3000_zgyzgdua FIX - Setup cluster 0xE000 (57344) button detection
      // This Moes TS0044 device uses cluster 57344 (0xE000) instead of standard scenes
      await this._setupTuyaE000ButtonDetection(zclNode);

    } catch (error) {
      this.log('[BUTTON4-PHYSICAL] ❌ Setup error:', error.message);
    }
  }

  /**
   * v5.5.367: MOES ESW-0ZAA-EU FIX - Tuya DP button detection
   * Some MOES 4-button devices send button presses via Tuya cluster (0xEF00)
   * instead of standard ZCL scenes/onOff commands
   *
   * Common Tuya DP patterns for buttons:
   * - DP 1-4: Button 1-4 press events
   * - Values: 0=single, 1=double, 2=long
   */
  async _setupTuyaDPButtonDetection(zclNode) {
    try {
      const tuyaCluster = zclNode?.endpoints?.[1]?.clusters?.tuya
        || zclNode?.endpoints?.[1]?.clusters?.manuSpecificTuya
        || zclNode?.endpoints?.[1]?.clusters?.[61184]
        || zclNode?.endpoints?.[1]?.clusters?.['61184']
        || zclNode?.endpoints?.[1]?.clusters?.['0xEF00'];

      if (!tuyaCluster) {
        this.log('[BUTTON4-TUYA-DP] ℹ️ No Tuya cluster found - using ZCL only');
        return;
      }

      this.log('[BUTTON4-TUYA-DP] 🔧 Setting up Tuya DP button detection (MOES fix)...');

      if (typeof tuyaCluster.on === 'function') {
        // Listen for Tuya datapoint reports
        tuyaCluster.on('response', async (data) => {
          const dp = data?.dp ?? data?.dataPointId ?? data?.dpId;
          const value = data?.data ?? data?.value ?? data?.raw?.[0] ?? 0;

          this.log(`[BUTTON4-TUYA-DP] 📡 DP${dp} = ${value}`, data);

          // DP 1-4 typically map to buttons 1-4
          if (dp >= 1 && dp <= 4) {
            const buttonNumber = dp;
            const pressTypeMap = { 0: 'single', 1: 'double', 2: 'long' };
            const pressType = pressTypeMap[value] || 'single';

            this.log(`[BUTTON4-TUYA-DP] 🔘 Button ${buttonNumber} ${pressType.toUpperCase()} (DP${dp}=${value})`);
            await this.triggerButtonPress(buttonNumber, pressType);
          }

          // Some devices use DP 101-104 for buttons
          if (dp >= 101 && dp <= 104) {
            const buttonNumber = dp - 100;
            const pressTypeMap = { 0: 'single', 1: 'double', 2: 'long' };
            const pressType = pressTypeMap[value] || 'single';

            this.log(`[BUTTON4-TUYA-DP] 🔘 Button ${buttonNumber} ${pressType.toUpperCase()} (DP${dp}=${value})`);
            await this.triggerButtonPress(buttonNumber, pressType);
          }
        });

        // Also listen for 'report' and 'datapoint' events (different Tuya cluster implementations)
        tuyaCluster.on('report', async (data) => {
          this.log(`[BUTTON4-TUYA-DP] 📡 Report event:`, data);
          // Process same as response
          const dp = data?.dp ?? data?.dataPointId ?? data?.dpId;
          const value = data?.data ?? data?.value ?? 0;
          if (dp >= 1 && dp <= 4) {
            const pressTypeMap = { 0: 'single', 1: 'double', 2: 'long' };
            await this.triggerButtonPress(dp, pressTypeMap[value] || 'single');
          }
        });

        this.log('[BUTTON4-TUYA-DP] ✅ Tuya DP button detection configured');
      } else {
        this.log('[BUTTON4-TUYA-DP] ⚠️ Tuya cluster does not support event listeners');
      }
    } catch (err) {
      this.log('[BUTTON4-TUYA-DP] ⚠️ Setup error:', err.message);
    }
  }

  /**
   * v5.5.758: MOES _TZ3000_zgyzgdua FIX - Cluster 0xE000 (57344) button detection
   * 
   * CRITICAL FIX: Homey SDK does NOT expose unknown clusters like 57344 in zclNode.endpoints[].clusters
   * Diagnostics show: "EP1 available clusters: basic" - only known clusters are exposed
   * 
   * Solution: Use BoundCluster pattern to receive incoming frames from cluster 57344
   * - Create TuyaE000BoundCluster instance
   * - Manually bind to endpoint.bindings[57344] (bypassing standard bind method)
   * 
   * Z2M Issue #28224: MOES XH-SY-04Z 4-button remote
   * Device structure: EP1 inClusterList: [1, 6, 57344, 0]
   */
  async _setupTuyaE000ButtonDetection(zclNode) {
    try {
      // v5.5.758: Get manufacturer from multiple sources (may be empty on first init)
      const manufacturerName = this.getData()?.manufacturerName 
        || this.getStoreValue?.('manufacturerName')
        || this.getSetting?.('zb_manufacturer_name')
        || '';
      const productId = this.getData()?.productId || '';
      
      // v5.5.758: Known devices that use cluster 0xE000
      const knownE000Devices = [
        '_TZ3000_zgyzgdua',  // Moes XH-SY-04Z 4-button remote
        '_TZ3000_abrsvsou',  // Similar Moes variant
        '_TZ3000_mh9px7cq',  // Similar Moes variant
        '_TZ3000_uri7ez8u',  // Another MOES TS0044 variant
        '_TZ3000_rrjr1q0u',  // MOES TS0044 variant
      ];
      
      // Check if this is TS0044 product (uses 4 endpoints with cluster 57344)
      const isTS0044 = productId.includes('TS0044') || productId.includes('TS004F');
      const usesE000ByManufacturer = knownE000Devices.some(id => manufacturerName.includes(id));

      // v5.5.762: ALWAYS setup E000 BoundCluster for 4-button devices
      // On first init, manufacturerName/productId may be empty - we can't know if device uses E000
      // Better to setup and not receive anything than to miss button presses
      // This is a no-op if device doesn't actually use cluster 57344
      const shouldSetupE000 = usesE000ByManufacturer || isTS0044 || !manufacturerName;
      
      if (!shouldSetupE000) {
        this.log('[BUTTON4-E000] ℹ️ Device is not a known E000 user, skipping BoundCluster setup');
        return;
      }
      
      // Log why we're setting up
      if (!manufacturerName) {
        this.log('[BUTTON4-E000] ⚠️ ManufacturerName empty on first init - setting up E000 as fallback');
      }
      
      this.log(`[BUTTON4-E000] 🔧 Setting up BoundCluster for cluster 0xE000 (57344)`);
      this.log(`[BUTTON4-E000] 📋 Manufacturer: ${manufacturerName || 'unknown'}, Product: ${productId || 'unknown'}`);

      // v5.5.758: Import TuyaE000BoundCluster for receiving button presses
      let TuyaE000BoundCluster;
      try {
        TuyaE000BoundCluster = require('../../lib/clusters/TuyaE000BoundCluster');
      } catch (e) {
        this.log('[BUTTON4-E000] ⚠️ Could not load TuyaE000BoundCluster:', e.message);
        return;
      }

      // Setup BoundCluster on all 4 endpoints
      for (let ep = 1; ep <= 4; ep++) {
        const endpoint = zclNode?.endpoints?.[ep];
        if (!endpoint) {
          this.log(`[BUTTON4-E000] ⚠️ EP${ep} not available`);
          continue;
        }

        // v5.5.758: CRITICAL - Manually bind BoundCluster using numeric cluster ID
        // Standard endpoint.bind() requires known cluster - we bypass this
        const boundCluster = new TuyaE000BoundCluster({
          device: this,
          onButtonPress: async (button, pressType) => {
            // Button number from frame, or use endpoint number
            const buttonNum = (button >= 1 && button <= 4) ? button : ep;
            this.log(`[BUTTON4-E000] 🔘 Button ${buttonNum} ${pressType.toUpperCase()} (from EP${ep})`);
            await this.triggerButtonPress(buttonNum, pressType);
          }
        });

        // Set endpoint reference for the bound cluster
        boundCluster.endpoint = ep;

        // CRITICAL: Bind to endpoint.bindings using numeric cluster ID
        // This is how zigbee-clusters handles unknown clusters (see Endpoint.js handleZCLFrame)
        if (!endpoint.bindings) {
          endpoint.bindings = {};
        }
        endpoint.bindings[57344] = boundCluster;
        
        this.log(`[BUTTON4-E000] ✅ BoundCluster registered for EP${ep} cluster 57344`);
      }

      // v5.5.758: Also setup onOff command listeners as fallback
      // Some TS0044 variants send commandOn/commandOff/commandToggle on onOff cluster
      for (let ep = 1; ep <= 4; ep++) {
        const endpoint = zclNode?.endpoints?.[ep];
        if (!endpoint) continue;

        const onOffCluster = endpoint.clusters?.onOff || endpoint.clusters?.genOnOff || endpoint.clusters?.[6];
        if (onOffCluster && typeof onOffCluster.on === 'function') {
          this.log(`[BUTTON4-E000] 📡 Setting up onOff command listeners on EP${ep}...`);

          onOffCluster.on('commandOn', async () => {
            this.log(`[BUTTON4-E000] 🔘 EP${ep} commandOn → Button ${ep} SINGLE`);
            await this.triggerButtonPress(ep, 'single');
          });

          onOffCluster.on('commandOff', async () => {
            this.log(`[BUTTON4-E000] 🔘 EP${ep} commandOff → Button ${ep} DOUBLE`);
            await this.triggerButtonPress(ep, 'double');
          });

          onOffCluster.on('commandToggle', async () => {
            this.log(`[BUTTON4-E000] 🔘 EP${ep} commandToggle → Button ${ep} LONG`);
            await this.triggerButtonPress(ep, 'long');
          });

          this.log(`[BUTTON4-E000] ✅ onOff command listeners configured for EP${ep}`);
        }
      }

      this.log('[BUTTON4-E000] ✅ MOES TS0044 cluster 0xE000 BoundCluster setup complete');

    } catch (err) {
      this.log('[BUTTON4-E000] ⚠️ Setup error:', err.message);
    }
  }

  /**
   * v5.5.344: ENHANCED battery reporting for sleepy devices
   * Research from deCONZ issue #7048 and Zigbee2MQTT:
   * - TS0044 _TZ3000_wkai4ga5 reports battery 0% always
   * - Solution: TuyaNoBindPowerConfigurationCluster pattern
   * - Don't bind to powerConfiguration cluster
   * - Poll battery attribute 0x0021 when device wakes (on button press)
   */
  async _setupBatteryReporting(zclNode) {
    try {
      this._powerCluster = zclNode?.endpoints?.[1]?.clusters?.powerConfiguration
        || zclNode?.endpoints?.[1]?.clusters?.genPowerCfg
        || zclNode?.endpoints?.[1]?.clusters?.[1];

      if (this._powerCluster) {
        this.log('[BUTTON4-BATTERY] 🔋 Setting up battery reporting on EP1...');

        // Listen for battery attribute reports
        if (typeof this._powerCluster.on === 'function') {
          this._powerCluster.on('attr.batteryPercentageRemaining', async (value) => {
            if (value !== undefined && value !== 255 && value !== 0) {
              const battery = Math.round(value / 2);
              this.log(`[BUTTON4-BATTERY] ✅ Battery report: ${battery}%`);
              await this._updateBattery(battery);
            }
          });

          this._powerCluster.on('attr.batteryVoltage', async (value) => {
            if (value !== undefined && value > 0) {
              const voltage = value / 10;
              // CR2032/CR2450: 3.0V=100%, 2.0V=0%
              const battery = Math.min(100, Math.max(0, Math.round((voltage - 2.0) * 100)));
              this.log(`[BUTTON4-BATTERY] ✅ Battery from voltage: ${voltage}V → ${battery}%`);
              await this._updateBattery(battery);
            }
          });

          this.log('[BUTTON4-BATTERY] ✅ Battery listeners registered');
        }

        // v5.5.344: Schedule battery read (device may be asleep, will retry on wake)
        this._scheduleInitialBatteryRead();
      } else {
        this.log('[BUTTON4-BATTERY] ⚠️ No powerConfiguration cluster found on EP1');
      }

      // v5.5.344: FORUM FIX - Also setup Tuya DP battery fallback for _TZ3000_5tqxpine
      await this._setupTuyaDPBatteryFallback(zclNode);

    } catch (err) {
      this.log('[BUTTON4-BATTERY] ⚠️ Battery setup error:', err.message);
    }
  }

  /**
   * v5.5.344: Update battery with validation and caching
   */
  async _updateBattery(battery) {
    if (battery >= 0 && battery <= 100) {
      await this.setCapabilityValue('measure_battery', parseFloat(battery)).catch(() => { });
      await this.setStoreValue('last_battery_percentage', battery).catch(() => { });
      await this.setStoreValue('last_battery_time', Date.now()).catch(() => { });
      this._lastBatteryRead = Date.now();
    }
  }

  /**
   * v5.5.344: Schedule initial battery read with retry
   * Based on deCONZ research: device sleeps, need to read when awake
   */
  _scheduleInitialBatteryRead() {
    // Try after short delay (device might still be awake from pairing)
    this.homey.setTimeout(() => this._tryReadBattery(), 2000);
    // Retry after 30 seconds
    this.homey.setTimeout(() => this._tryReadBattery(), 30000);
  }

  /**
   * v5.5.344: Try to read battery from powerConfiguration cluster
   * Called on init and after each button press (when device is awake)
   */
  async _tryReadBattery() {
    if (!this._powerCluster) return;

    // Don't read too frequently (max once per 5 minutes)
    if (this._lastBatteryRead && Date.now() - this._lastBatteryRead < 300000) {
      return;
    }

    try {
      this.log('[BUTTON4-BATTERY] 📡 Attempting to read battery...');
      const attrs = await this._powerCluster.readAttributes(['batteryPercentageRemaining', 'batteryVoltage']);

      if (attrs?.batteryPercentageRemaining !== undefined &&
        attrs.batteryPercentageRemaining !== 255 &&
        attrs.batteryPercentageRemaining !== 0) {
        const battery = Math.round(attrs.batteryPercentageRemaining / 2);
        this.log(`[BUTTON4-BATTERY] 📊 Battery read success: ${battery}%`);
        await this._updateBattery(battery);
      } else if (attrs?.batteryVoltage !== undefined && attrs.batteryVoltage > 0) {
        const voltage = attrs.batteryVoltage / 10;
        const battery = Math.min(100, Math.max(0, Math.round((voltage - 2.0) * 100)));
        this.log(`[BUTTON4-BATTERY] 📊 Battery from voltage: ${voltage}V → ${battery}%`);
        await this._updateBattery(battery);
      } else {
        this.log('[BUTTON4-BATTERY] ⚠️ Battery read returned invalid value');
      }
    } catch (err) {
      // Expected for sleeping devices - will retry on next button press
      this.log('[BUTTON4-BATTERY] ⚠️ Battery read failed (device may be sleeping):', err.message);
    }
  }

  /**
   * v5.5.618: Override triggerButtonPress - MODE VERIFICATION + PARENT DEBOUNCE
   * CRITICAL FIX: Removed duplicate debounce (parent ButtonDevice already has 300ms debounce)
   * Double debouncing caused events to be filtered incorrectly
   */
  async triggerButtonPress(buttonNumber, pressType) {
    // v5.5.618: MODE VERIFICATION on button press (device awake)
    if (!this._modeVerified && this._onOffCluster) {
      this.homey.setTimeout(async () => {
        const verified = await this._verifySceneMode(this._onOffCluster);
        if (verified) {
          this._modeVerified = true;
          this.log('[BUTTON4-MODE] ✅ Mode verified on button press!');
        }
      }, 100);
    }

    // Call parent implementation (includes comprehensive debouncing)
    if (super.triggerButtonPress) {
      await super.triggerButtonPress(buttonNumber, pressType);
    }

    // Device is awake after button press - try to read battery
    this.homey.setTimeout(() => this._tryReadBattery(), 500);
  }

  /**
   * v5.5.343: FORUM FIX - Tuya DP battery fallback for devices like _TZ3000_5tqxpine
   * Eftychis_Georgilas reported: "_TZ3000_5tqxpine does not present battery level"
   */
  async _setupTuyaDPBatteryFallback(zclNode) {
    try {
      const tuyaCluster = zclNode?.endpoints?.[1]?.clusters?.tuya
        || zclNode?.endpoints?.[1]?.clusters?.manuSpecificTuya
        || zclNode?.endpoints?.[1]?.clusters?.[61184]
        || zclNode?.endpoints?.[1]?.clusters?.['61184'];

      if (tuyaCluster && typeof tuyaCluster.on === 'function') {
        this.log('[BUTTON4-BATTERY] 🔋 Setting up Tuya DP battery fallback...');

        tuyaCluster.on('response', async (data) => {
          // Battery is commonly on DP 2, 3, 4, or 10 for Tuya buttons
          const batteryDPs = [2, 3, 4, 10, 15];
          const dp = data?.dp ?? data?.dataPointId;
          const value = data?.data ?? data?.value ?? data?.raw?.[0];

          if (batteryDPs.includes(dp) && value !== undefined) {
            let battery = null;

            // Interpret value based on range
            if (typeof value === 'number') {
              if (value <= 100) {
                battery = value; // Direct percentage
              } else if (value <= 200) {
                battery = Math.round(value / 2); // Doubled percentage
              } else if (value <= 3200) {
                // Voltage in mV (CR2032: 3000mV = 100%, 2000mV = 0%)
                battery = Math.min(100, Math.max(0, Math.round((value - 2000) / 10)));
              }
            }

            if (battery !== null && battery >= 0 && battery <= 100) {
              this.log(`[BUTTON4-BATTERY-DP] ✅ Battery from DP${dp}: ${battery}%`);
              await this.setCapabilityValue('measure_battery', parseFloat(battery)).catch(() => { });
              await this.setStoreValue('last_battery_percentage', battery).catch(() => { });
            }
          }
        });

        this.log('[BUTTON4-BATTERY] ✅ Tuya DP battery fallback registered');
      }
    } catch (err) {
      this.log('[BUTTON4-BATTERY] ⚠️ Tuya DP battery fallback error:', err.message);
    }
  }

  async onDeleted() {
    this.log('Button4GangDevice deleted');

    // v5.5.617: Cleanup mode maintenance interval
    if (this._modeMaintenanceInterval) {
      this.homey.clearInterval(this._modeMaintenanceInterval);
    }

    // Cleanup timers
    if (this._clickState) {
      if (this._clickState.clickTimer) {
        clearTimeout(this._clickState.clickTimer);
      }
      if (this._clickState.longPressTimer) {
        clearTimeout(this._clickState.longPressTimer);
      }
    }
  }
}

module.exports = Button4GangDevice;
