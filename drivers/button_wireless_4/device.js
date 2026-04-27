'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');


const { CLUSTERS } = require('../../lib/constants/ZigbeeConstants.js');


const ButtonDevice = require('../../lib/devices/ButtonDevice');
const { includesCI, containsCI } = require('../../lib/utils/CaseInsensitiveMatcher');
const { resolve: resolvePressType, PRESS_MAP } = require('../../lib/utils/TuyaPressTypeMap');

/**
 * 
 *      BUTTON 4 GANG - v5.5.379 CRITICAL FIX FOR TS004F SCENE MODE             
 * 
 *                                                                               
 *   v5.5.379: CRITICAL FIX - TS004F Scene Mode Switching                        
 *   - TS004F has TWO modes: Dimmer (default) and Scene                         
 *   - Dimmer mode: Only single press works, uses levelControl cluster          
 *   - Scene mode: Single / (double / long) work, uses scenes cluster                 
 *   - Mode controlled by: Cluster 6 (onOff), Attribute 0x8004                  
 *   - Value 0 = Dimmer mode, Value 1 = Scene mode                              
 *   - Research: SmartThings, Z2M #7158, ZHA #1372                              
 *                                                                               
 *   STRUCTURE (TS0044 / TS004F):                                                    
 *   EP1: Button 1 (scenes, onOff, powerCfg, groups)                             
 *   EP2: Button 2 (scenes, onOff, groups)                                       
 *   EP3: Button 3 (scenes, onOff, groups)                                       
 *   EP4: Button 4 (scenes, onOff, groups)                                       
 *                                                                               
 *   ACTIONS: X_single, X_double, X_hold (X = button 1-4)                        
 *                                                                               
 * 
 */
class Button4GangDevice extends ButtonDevice {

  async setupButtonDetection() {
    this.log('[BUTTON4]  Using enhanced physical button detection (overriding base)');
    return Promise.resolve();
  }


  // v5.5.617: Scene mode constants (Z2M #7158, SmartThings research)
  static MODE_ATTRIBUTE = 0x8004;
  static SCENE_MODE = 1;
  static DIMMER_MODE = 0;

  // v5.5.618: Mode tracking (debounce removed - handled by parent)
  _modeSwitchAttempts = 0;
  _modeVerified = false;
  _zclNode = null;

  async onNodeInit({ zclNode }) {
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
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

    this._zclNode = zclNode;
    this.log('');
    this.log('[BUTTON4]  Button4GangDevice v5.7.18 initializing...');
    this.log('[BUTTON4] CRITICAL FIX: TS004F Scene Mode + MOES E000 Detection');
    this.log('[BUTTON4] Research: SmartThings, Z2M #7158, ZHA #1372, PR #120');
    this.log('');

    // Set button count BEFORE calling super (ButtonDevice uses this)
    this.buttonCount = 4;

    // v5.5.295: Log available endpoints for debugging
    const availableEndpoints = Object.keys(zclNode?.endpoints || {});this.log(`[BUTTON4]  Available endpoints: ${availableEndpoints.join(', ')}`);

    // Initialize base (power detection + button detection)
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));

    // v5.11.16: Setup listeners first (no Zigbee I/O), defer heavy ops
    await this._setupEnhancedPhysicalButtonDetection(zclNode);
    await this._registerEnhancedVirtualButtonHandlers();

    // v5.11.16: Defer mode switch + battery (require awake device) to prevent pairing timeout
    this.homey.setTimeout(async () => {
      await this._intelligentModeSwitch(zclNode).catch(e => this.log('[BUTTON4] mode switch deferred err:', e.message));
      this._scheduleModeMaintenance();
      await this._setupBatteryReporting(zclNode).catch(e => this.log('[BUTTON4] battery deferred err:', e.message));
    }, 200);

    this.log('[BUTTON4]  Button4GangDevice initialized - 4 buttons ready');
    this.log('[BUTTON4]  Detection methods: Scenes, OnOff, MultistateInput, E000, Raw Frame');
    this.log('');
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
    // v5.7.18: Use multiple sources for device info (getData may be empty on init)
    const productId = this.getData()?.productId 
      || this.getStoreValue?.('productId' )
      || this.getSetting?.('zb_model_id' )
      || '';
    const manufacturerName = this.getSetting?.('zb_manufacturer_name' )
      || this.getStoreValue?.('manufacturerName')
      || this.getData()?.manufacturerName
      || '';

    // Only TS004F needs mode switching (TS0044 doesn't have this issue)
    const isTS004F = containsCI(productId, 'TS004F');

    this.log(`[BUTTON4-MODE]  Device: ${productId} / ${manufacturerName}`);
    this.log(`[BUTTON4-MODE]  Is TS004F: ${isTS004F}`);

    // Also apply to devices that might be mislabeled or unknown
    // These manufacturers are known to use TS004F-style devices
    // v5.7.17: Extended list - some TS0044 devices also need mode switching
    // Forum fix: Fred's _TZ3000_zgyzgdua not sending button events - try mode switch
    const ts004fManufacturers = [
      '_TZ3000_xabckq1v',
      '_TZ3000_czuyt8lz',
      '_TZ3000_pcqjmcud',
      '_TZ3000_4fjiwweb',
      '_TZ3000_uri7oadn',
      '_TZ3000_ixla93vd',
      '_TZ3000_qzjcsmar',
      '_TZ3000_wkai4ga5',  // v5.5.419: Forum report Eftychis
      '_TZ3000_5tqxpine',  // v5.5.419: Forum report Eftychis
      // v5.9.14: REMOVED _TZ3000_zgyzgdua  TS0044 does NOT support attr 0x8004,
      // mode switch causes repeated errors and may block E000 button detection (Freddyboy)
    ];
    const needsModeSwitching = isTS004F || includesCI(ts004fManufacturers, manufacturerName);
    
    // v5.7.17: Log decision for debugging
    this.log(`[BUTTON4-MODE]  Needs mode switching: ${needsModeSwitching}`);

    if (!needsModeSwitching) {
      this.log('[BUTTON4-MODE]  Device is TS0044-type, skipping mode switch (attribute 0x8004 not supported)');
      // v5.8.85: TS0044 does NOT support attribute 0x8004 - writing it causes
      // repeated "writeAttributes failed: 32772 is not a valid attribute of onOff" errors
      this._modeVerified = true; // Prevent _scheduleModeMaintenance from retrying
      return;
    }

    try {
      // Get onOff cluster on endpoint 1
      const onOffCluster = zclNode?.endpoints?.[1]?.clusters?.onOff
        || zclNode?.endpoints?.[1]?.clusters?.genOnOff
        || zclNode?.endpoints?.[1]?.clusters?.[6];

      if (!onOffCluster) {
        this.log('[BUTTON4-MODE]  OnOff cluster not found on EP1' );
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

        this.log(`[BUTTON4-MODE]  Attempt ${attempt + 1}/${retryDelays.length}...`);

        // Try to switch mode
        const success = await this._attemptModeSwitch(onOffCluster);

        if (success) {
          // Verify mode actually changed
          const verified = await this._verifySceneMode(onOffCluster);
          if (verified) {
            this._modeVerified = true;
            this.log('[BUTTON4-MODE]  Scene mode VERIFIED - all buttons should work!');
            await this.setStoreValue('button_mode', 'scene').catch(() => {});
            await this.setStoreValue('mode_switch_success', Date.now()).catch(() => {});
            return;
          }
        }
      }

      // All attempts failed - schedule retry later (cold boot recovery)
      this.log('[BUTTON4-MODE]  Mode switch not verified after all attempts');
      this.log('[BUTTON4-MODE]  Will retry on next button press or in 5 minutes');

    } catch (err) {
      this.log(`[BUTTON4-MODE]  Mode switching error: ${err.message}`);
    }
  }

  /**
   * v5.5.617: Attempt single mode switch
   */
  async _attemptModeSwitch(onOffCluster) {
    try {
      if (typeof onOffCluster.writeAttributes === 'function') {
        await onOffCluster.writeAttributes({ [Button4GangDevice.MODE_ATTRIBUTE]: Button4GangDevice.SCENE_MODE });
        this.log('[BUTTON4-MODE]  writeAttributes succeeded');
        return true;
      }
    } catch (err) {
      this.log(`[BUTTON4-MODE]  writeAttributes failed: ${err.message}`);
    }

    // Fallback: raw write
    try {
      if (typeof onOffCluster.write === 'function') {
        await onOffCluster.write({
          attributeId: Button4GangDevice.MODE_ATTRIBUTE,
          dataType: 0x30, // Enum8
          value: Button4GangDevice.SCENE_MODE
        });
        this.log('[BUTTON4-MODE]  Raw write succeeded');
        return true;
      }
    } catch (err) {
      this.log(`[BUTTON4-MODE]  Raw write failed: ${err.message}`);
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

      this.log(`[BUTTON4-MODE]  Verify read: mode = ${mode}`);
      return mode === Button4GangDevice.SCENE_MODE;
    } catch (err) {
      this.log(`[BUTTON4-MODE]  Verify read failed: ${err.message}`);
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

      this.log('[BUTTON4-MODE]  Scheduled mode re-check...');
      if (this._onOffCluster) {
        const success = await this._attemptModeSwitch(this._onOffCluster);
        if (success) {
          const verified = await this._verifySceneMode(this._onOffCluster);
          if (verified) {
            this._modeVerified = true;
            this.log('[BUTTON4-MODE]  Mode verified on scheduled check!');
          }
        }
      }
    },5 * 60 * 1000); // 5 minutes
  }

  /**
   * v5.5.617: Handle device wake (cold boot recovery via onEndDeviceAnnounce)
   */
  async onEndDeviceAnnounce() {
    this.log('[BUTTON4-MODE]  Device announced (wake/rejoin) - re-applying mode + re-binding...');
    this._modeVerified = false;

    // Re-bind clusters on wake (sleepy TS0044 may have missed initial binds)
    this.homey.setTimeout(async () => {
      if (this._zclNode) {
        for (let ep = 1; ep <= 4; ep++) {
          const endpoint = this._zclNode?.endpoints?.[ep];
          if (!endpoint ) continue;
          const onOff = endpoint.clusters?.onOff || endpoint.clusters?.genOnOff || endpoint.clusters?.[6];
          if (onOff?.bind) {
            onOff.bind().then(() => this.log(`[BUTTON4-REBIND]  OnOff bound EP${ep}`)).catch(() => {});
          }
          const scenes = endpoint.clusters?.scenes || endpoint.clusters?.genScenes || endpoint.clusters?.[5];
          if (scenes?.bind) {
            scenes.bind().then(() => this.log(`[BUTTON4-REBIND]  Scenes bound EP${ep}`)).catch(() => {});
          }
        }
        await this._intelligentModeSwitch(this._zclNode );
      }
    }, 300);
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
    this.log('[BUTTON4-PHYSICAL]  Setting up enhanced physical button detection...');
    this.log('[BUTTON4-PHYSICAL] Research base: Z2M, ZHA, SmartThings, deCONZ patterns');

    const manufacturerName = this.getSetting?.('zb_manufacturer_name') || this.getData()?.manufacturerName || '';
    this.log(`[BUTTON4-PHYSICAL] Manufacturer: ${manufacturerName}`);

    try {
      // Setup scene cluster listeners on all 4 endpoints for physical buttons
      for (let ep = 1; ep <= 4; ep++) {
        const endpoint = zclNode?.endpoints?.[ep];
        if (!endpoint) {
          this.log(`[BUTTON4-PHYSICAL]  Endpoint ${ep} not found` );
          continue;
        }

        // v5.11.16: Fire-and-forget bind (don't block init on sleepy battery buttons)
        for (const cl of [endpoint.clusters?.onOff, endpoint.clusters?.multistateInput || endpoint.clusters?.genMultistateInput, endpoint.clusters?.scenes]) {
          if (cl?.bind) { cl.bind().catch(() => {}); }
        }

        // v5.5.369: FIXED scenes cluster listener - use multiple event patterns
        const scenesCluster = endpoint.clusters?.scenes || endpoint.clusters?.genScenes || endpoint.clusters?.[5];
        if (scenesCluster) {
          this.log(`[BUTTON4-PHYSICAL]  Setting up scene listener on EP${ep}...` );

          // v5.9.22: Use centralized PRESS_MAP (prevents 0-index regression)
          
          // v5.12.5: Compressed Scene ID Mapping fix (Forum Issue #23)
          // Some devices send all buttons on EP1 with IDs: 1,2,3... or 10,11,12...
          const handleSceneRecall = async (sceneId) => {
            let button = ep;
            let actualScene = sceneId;
            
            if (sceneId >= 10 && ep === 1) {
              button = safeMultiply(Math.floor(sceneId, 10)) + 1;
              actualScene = sceneId % 10;
              this.log(`[BUTTON4-SCENE]  Compressed Mapping: scene ${sceneId} -> button ${button}, action ${actualScene}`);
            } else if (sceneId >= 1 && ep === 1 && sceneId <= 4) {
              // Some use 1=Btn1, 2=Btn2...
              button = sceneId;
              actualScene = 0; // Single press
              this.log(`[BUTTON4-SCENE]  Linear Mapping: scene ${sceneId} -> button ${button}`);
            }

            const pressType = resolvePressType(actualScene, 'BTN4-scene');
            this.log(`[BUTTON4-SCENE]  Physical Button ${button} ${pressType.toUpperCase()} (scene ${sceneId})`);
            await this.triggerButtonPress(button, pressType);
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

          this.log(`[BUTTON4-PHYSICAL]  Scene listener configured for EP${ep}`);
        } else {
          this.log(`[BUTTON4-PHYSICAL]  No scenes cluster on EP${ep}` );
        }

        // v5.5.369: FIXED multistateInput cluster listener - use multiple event patterns
        const multistateCluster = endpoint.clusters?.multistateInput || endpoint.clusters?.genMultistateInput || endpoint.clusters?.[18];
        if (multistateCluster) {
          this.log(`[BUTTON4-PHYSICAL]  Setting up multistateInput listener on EP${ep}...` );

          // v5.9.22: Use centralized resolvePressType (prevents 0-index regression)
          const handleMultistate = async (value) => {
            const pressType = resolvePressType(value, 'BTN4-multi');
            this.log(`[BUTTON4-MULTISTATE]  Button ${ep} ${pressType.toUpperCase()} (multistate ${value})`);
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

            this.log(`[BUTTON4-PHYSICAL]  MultistateInput listener configured for EP${ep}` );
          }
        }

        // Also ensure onOff cluster is available for virtual buttons (app icons)
        const onOffCluster = endpoint.clusters?.onOff || endpoint.clusters?.genOnOff || endpoint.clusters?.[6];
        if (onOffCluster) {
          this.log(`[BUTTON4-PHYSICAL]  OnOff cluster available on EP${ep} (virtual buttons)`);

          // v5.5.333: Also listen for onOff commands as button events
          if (typeof onOffCluster.on === 'function') {
            onOffCluster.on('command', async (commandName, commandPayload) => {
              this.log(`[BUTTON4-ONOFF] EP${ep} command: ${commandName}`, commandPayload);

              // Map onOff commands to press types
              // v5.9.20: Z2M EVENT mode: on=single, off=double, toggle=long
              const commandMap = {
                'on': 'single',
                'setOn': 'single',
                'off': 'double',
                'setOff': 'double',
                'toggle': 'long'
              };

              const pressType = commandMap[commandName];
              if (pressType) {
                this.log(`[BUTTON4-ONOFF]  Button ${ep} ${pressType.toUpperCase()} (${commandName})`);
                await this.triggerButtonPress(ep, pressType);
              }
            });
          }
        }

        // v5.8.47: MOES TS0044/TS004F dimmer mode fix - levelControl cluster detection
        // When in dimmer mode (default after battery change), buttons send
        // moveWithOnOff / stepWithOnOff/stop on levelControl cluster (8) instead of scenes
        const levelCluster = endpoint.clusters?.levelControl || endpoint.clusters?.genLevelCtrl || endpoint.clusters?.[8];
        if (levelCluster) {
          if (typeof levelCluster.on === 'function') {
            // v5.11.16: Fire-and-forget bind (don't block init on sleepy buttons)
            if (levelCluster.bind) { levelCluster.bind().catch(() => {}); }

            const handleLevelCommand = async (commandName) => {
              this.log(`[BUTTON4-LEVEL]  Button ${ep} SINGLE (levelControl ${commandName})`);
              await this.triggerButtonPress(ep, 'single');
            };

            // moveWithOnOff = button press start (single press)
            levelCluster.on('commandMoveWithOnOff', async (payload) => {
              this.log(`[BUTTON4-LEVEL] EP${ep} commandMoveWithOnOff:`, payload);
              await handleLevelCommand('moveWithOnOff');
      });

            // stepWithOnOff = step command (single press on some FW)
            levelCluster.on('commandStepWithOnOff', async (payload) => {
              this.log(`[BUTTON4-LEVEL] EP${ep} commandStepWithOnOff:`, payload);
              await handleLevelCommand('stepWithOnOff');
      });

            // Generic command fallback for level cluster
            levelCluster.on('command', async (commandName, commandPayload) => {
              this.log(`[BUTTON4-LEVEL] EP${ep} command: ${commandName}`, commandPayload);
              if (['moveWithOnOff', 'stepWithOnOff', 'move', 'step'].includes(commandName)) {
                await handleLevelCommand(commandName);
              }
              // stop = button release (ignore, don't trigger again)
            });

            this.log(`[BUTTON4-PHYSICAL]  LevelControl listener configured for EP${ep}`);
          }
        }
      }

      this.log('[BUTTON4-PHYSICAL]  Enhanced physical button detection configured');
      this.log('[BUTTON4-PHYSICAL]  Scenes, MultistateInput, OnOff, and LevelControl listeners active');

      // v5.5.367: MOES ESW-0ZAA-EU FIX - Setup Tuya DP button detection
      // Some MOES devices use Tuya cluster (CLUSTERS.TUYA_EF00) for physical button presses
      await this._setupTuyaDPButtonDetection(zclNode);

      // v5.5.714: MOES _TZ3000_zgyzgdua FIX - Setup cluster 0xE000 (57344) button detection
      // This Moes TS0044 device uses cluster 57344 (0xE000) instead of standard scenes
      await this._setupTuyaE000ButtonDetection(zclNode);

    } catch (error) {
      this.log('[BUTTON4-PHYSICAL]  Setup error:', error.message);
    }
  }

  /**
   * v5.5.367: MOES ESW-0ZAA-EU FIX - Tuya DP button detection
   * Some MOES 4-button devices send button presses via Tuya cluster (CLUSTERS.TUYA_EF00)
   * instead of standard ZCL (scenes / onOff) commands
   *
   * Common Tuya DP patterns for buttons:
   * - DP 1-4: Button 1-4 press events
   * - Values: 0=single, 1=double, 2=long
   */
  async _setupTuyaDPButtonDetection(zclNode) {
    try {
      const tuyaCluster = zclNode?.endpoints?.[1]?.clusters?.tuya
        || zclNode?.endpoints?.[1]?.clusters?.manuSpecificTuya
        || zclNode?.endpoints?.[1]?.clusters?.[CLUSTERS.TUYA_EF00]
        || zclNode?.endpoints?.[1]?.clusters?.['CLUSTERS.TUYA_EF00']
        || zclNode?.endpoints?.[1]?.clusters?.[CLUSTERS.TUYA_EF00];

      if (!tuyaCluster) {
        this.log('[BUTTON4-TUYA-DP]  No Tuya cluster found - using ZCL only');
        return;
      }

      this.log('[BUTTON4-TUYA-DP]  Setting up Tuya DP button detection (MOES fix)...');

      if (typeof tuyaCluster.on === 'function') {
        // Listen for Tuya datapoint reports
        tuyaCluster.on('response', async (data) => {
          const dp = data?.dp ?? data?.dataPointId ?? data?.dpId;
          const value = data?.data ?? data?.value ?? data?.raw?.[0] ?? 0;

          this.log(`[BUTTON4-TUYA-DP]  DP${dp} = ${value}`, data);

          // DP 1-4 typically map to buttons 1-4
          if (dp >= 1 && dp <= 4) {
            const buttonNumber = dp;
            const pressType = resolvePressType(value, 'BTN4-DP');

            this.log(`[BUTTON4-TUYA-DP]  Button ${buttonNumber} ${pressType.toUpperCase()} (DP${dp}=${value})`);
            await this.triggerButtonPress(buttonNumber, pressType);
          }

          // Some devices use DP 101-104 for buttons
          if (dp >= 101 && dp <= 104) {
            const buttonNumber = dp - 100;
            const pressType = resolvePressType(value, 'BTN4-DP101');

            this.log(`[BUTTON4-TUYA-DP]  Button ${buttonNumber} ${pressType.toUpperCase()} (DP${dp}=${value})`);
            await this.triggerButtonPress(buttonNumber, pressType);
          }
        });

        // Also listen for 'report' and 'datapoint' events (different Tuya cluster implementations)
        tuyaCluster.on('report', async (data) => {
          this.log('[BUTTON4-TUYA-DP]  Report event:', data);
          // Process same as response
          const dp = data?.dp ?? data?.dataPointId ?? data?.dpId;
          const value = data?.data ?? data?.value ?? 0;
          if (dp >= 1 && dp <= 4) {
            await this.triggerButtonPress(dp, resolvePressType(value, 'BTN4-DP-rpt'));
          }
        });

        this.log('[BUTTON4-TUYA-DP]  Tuya DP button detection configured');
      } else {
        this.log('[BUTTON4-TUYA-DP]  Tuya cluster does not support event listeners');
      }
    } catch (err) {
      this.log('[BUTTON4-TUYA-DP]  Setup error:', err.message);
    }
  }

  /**
   * v5.5.967: MOES _TZ3000_zgyzgdua FIX - Cluster 0xE000 (57344) button detection
   * 
   * CRITICAL FIX: Homey SDK does NOT expose unknown clusters like 57344 in zclNode.endpoints[].clusters
   * Diagnostics show: "EP1 available clusters: basic" - only known clusters are exposed
   * 
   * Solution: Use BoundCluster pattern to receive incoming frames from cluster 57344
   * - Create TuyaE000BoundCluster instance
   * - Manually bind to endpoint.bindings[57344] (bypassing standard bind method)
   * - v5.5.967: Also register cluster in endpoint.clusters for better SDK integration
   * 
   * Z2M Issue #28224: MOES XH-SY-04Z 4-button remote
   * Device structure: EP1 inClusterList: [1, 6, 57344, 0]
   */
  async _setupTuyaE000ButtonDetection(zclNode) {
    try {
      // v5.5.967: Get manufacturer from multiple sources (may be empty on first init)
      const manufacturerName = this.getData()?.manufacturerName 
        || this.getStoreValue?.('manufacturerName' )
        || this.getSetting?.('zb_manufacturer_name' )
        || '';
      const productId = this.getData()?.productId || '';// v5.5.967: Log device info for debugging
      this.log(`[BUTTON4-E000]  Device: mfr=${manufacturerName || 'empty'}, product=${productId || 'empty'}`);
      
      // v5.5.992: Known devices that use cluster 0xE000 (expanded list)
      // GitHub #121: DAVID9SE _TZ3000_an5rjiwd TS0041 with 4 endpoints + cluster 57344
      const knownE000Devices = [
        '_TZ3000_zgyzgdua',  // Moes XH-SY-04Z 4-button remote
        '_TZ3000_abrsvsou',  // Similar Moes variant
        '_TZ3000_mh9px7cq',  // Similar Moes variant
        '_TZ3000_uri7ez8u',  // Another MOES TS0044 variant
        '_TZ3000_rrjr1q0u',  // MOES TS0044 variant
        '_TZ3000_vp6clf9d',  // MOES TS0044 variant
        '_TZ3000_xabckq1v',  // TS004F variant that may use E000
        '_TZ3000_w8jwkczz',  // TS0044 variant
        '_TZ3000_dku2cfsc',  // TS0044 variant
        '_TZ3000_ja5osu5g',  // TS0044 variant
        '_TZ3000_an5rjiwd',  // GitHub #121: TS0041 with 4 endpoints + E000
      ];
      
      // Check if this is TS0044 product (uses 4 endpoints with cluster 57344)
      const pidLower = CI.normalize(productId);
      const mfrLower = CI.normalize(manufacturerName);
      const isTS0044 = pidLower.includes('ts0044') || pidLower.includes('ts004f');
      const usesE000ByManufacturer = knownE000Devices.some(id => CI.containsCI(mfrLower, id));

      // v5.7.35: FREDDYBOY FIX - ALWAYS setup E000 BoundCluster for ALL 4-button devices
      // Many MOES/Tuya variants use cluster 57344 but aren't in the known list
      // Setting up E000 is a no-op if device doesn't use it, but missing it breaks physical buttons
      // Forum #1333: Physical button doesn't trigger flow even though virtual works
      const shouldSetupE000 = true; // ALWAYS setup for 4-button devices
      
      // Log detection info for debugging
      if (usesE000ByManufacturer) {
        this.log('[BUTTON4-E000]  Known E000 device detected');
      } else if (isTS0044) {
        this.log('[BUTTON4-E000]  TS0044/TS004F product detected');
      } else {
        this.log('[BUTTON4-E000]  Unknown device - setting up E000 as universal fallback');
      }
      
      this.log('[BUTTON4-E000]  Setting up BoundCluster for cluster 0xE000 (57344)');
      this.log(`[BUTTON4-E000]  Manufacturer: ${manufacturerName || 'unknown'}, Product: ${productId || 'unknown'}`);

      // v5.5.758: Import TuyaE000BoundCluster for receiving button presses
      let TuyaE000BoundCluster;
      try {
        TuyaE000BoundCluster = require('../../lib/clusters/TuyaE000BoundCluster');
      } catch (e) {
        this.log('[BUTTON4-E000]  Could not load TuyaE000BoundCluster:', e.message);
        return;
      }

      // v5.8.3: CRITICAL FIX - Attempt explicit Zigbee binding for cluster 57344
      // Forum #1352 Freddyboy: Physical buttons not triggering flows
      // The device needs to be told to send cluster 57344 frames to Homey's coordinator
      await this._bindE000ClusterExplicit(zclNode);

      // Setup BoundCluster on all 4 endpoints
      for (let ep = 1; ep <= 4; ep++) {
        const endpoint = zclNode?.endpoints?.[ep];
        if (!endpoint) {
          this.log(`[BUTTON4-E000]  EP${ep} not available` );
          continue;
        }

        // v5.5.758: CRITICAL - Manually bind BoundCluster using numeric cluster ID
        // Standard endpoint.bind() requires known cluster - we bypass this
        const boundCluster = new TuyaE000BoundCluster({
          device: this,
          onButtonPress: async (button, pressType) => {
            // Button number from frame, or use endpoint number
            const buttonNum = (button >= 1 && button <= 4) ? button : ep;
            this.log(`[BUTTON4-E000]  Button ${buttonNum} ${pressType.toUpperCase()} (from EP${ep})`);
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
        endpoint.bindings['tuyaE000'] = boundCluster;
        
        this.log(`[BUTTON4-E000]  BoundCluster registered for EP${ep} cluster 57344`);
      }

      // v5.5.758: Also setup onOff command listeners as fallback
      // Some TS0044 variants send commandOn / commandOff/commandToggle on onOff cluster
      // v5.7.52: CRITICAL FIX - Add deduplication to prevent ghost presses from periodic reports
      this._e000OnOffDedup = {}; // Track last command time per endpoint
      
      for (let ep = 1; ep <= 4; ep++) {
        const endpoint = zclNode?.endpoints?.[ep];
        if (!endpoint ) continue;

        const onOffCluster = endpoint.clusters?.onOff || endpoint.clusters?.genOnOff || endpoint.clusters?.[6];
        if (onOffCluster && typeof onOffCluster.on === 'function') {
          this.log(`[BUTTON4-E000]  Setting up onOff command listeners on EP${ep}...` );

          const handleCommand = async (cmdName, pressType) => {
            const now = Date.now();
            const dedupKey = `${ep}_${cmdName}`;
            const lastTime = this._e000OnOffDedup[dedupKey] || 0;
            
            // Deduplicate: ignore if same command on same endpoint within 500ms
            if (now - lastTime < 500) {
              this.log(`[BUTTON4-E000]  Deduplicated ${cmdName} (${now - lastTime}ms)`);
              return;
            }
            this._e000OnOffDedup[dedupKey] = now;
            
            this.log(`[BUTTON4-E000]  EP${ep} ${cmdName}  Button ${ep} ${pressType.toUpperCase()}`);
            await this.triggerButtonPress(ep, pressType);
          };

          // v5.9.20: Z2M EVENT mode: commandOn=single, commandOff=double, commandToggle=long
          onOffCluster.on('commandOn', async () => await handleCommand('commandOn', 'single'));
          onOffCluster.on('commandOff', async () => await handleCommand('commandOff', 'double'));
          onOffCluster.on('commandToggle', async () => await handleCommand('commandToggle', 'long'));

          this.log(`[BUTTON4-E000]  onOff command listeners configured for EP${ep}`);

          // v5.12.1: FIX _TZ3000_u3nv1jwk TS0044 buttons not recognized
          // BoundCluster intercepts frames BEFORE cluster.on('commandOn') fires,
          // so we MUST handle standard setOn / setOff/toggle here (not just 0xFD).
          // Z2M: TS0044 sends setOn=single, setOff=double, toggle=long per endpoint.
          try {
            const OnOffBC = require('../../lib/clusters/OnOffBoundCluster');
            const curEp = ep;
            const dedupOnOff = this._e000OnOffDedup;
            const safeHandle = async (cmdName, pressType, p) => {
              const now = Date.now();
              const key = `${curEp}_bc_${cmdName}`;
              if (now - (dedupOnOff[key] || 0) < 500) return;
              dedupOnOff[key] = now;
              this.log(`[BUTTON4-BC]  EP${curEp} ${cmdName}  Button ${curEp} ${pressType.toUpperCase()}`);
              await this.triggerButtonPress(curEp, pressType);
            };
            const bc = new OnOffBC({
              onSetOn: (p) => {
                // Tuya custom 0xFD = scene press type in payload
                if (p?.cmdId === 0xFD) {
                  const action = resolvePressType(p.scene ?? 0, 'BTN4-0xFD');
                  this.log(`[BUTTON4-0xFD] EP${curEp} pressType=${p.scene}  ${action}`);
                  this.triggerButtonPress(curEp, action);
                  return;
                }
                // Standard ON = single press
                safeHandle('setOn', 'single', p );
              },
              onSetOff: (p) => safeHandle('setOff', 'double', p),
              onToggle: (p) => safeHandle('toggle', 'long', p),
            });
            endpoint.bind('onOff', bc);
            this.log(`[BUTTON4-BC]  OnOff BoundCluster bound on EP${ep}(single/double, long + 0xFD)`);
          } catch (e) {
            this.log(`[BUTTON4-BC]  EP${ep}: ${e.message}`);
          }
        }
      }

      this.log('[BUTTON4-E000]  MOES TS0044 cluster 0xE000 BoundCluster setup complete');

      // v5.8.15: CRITICAL FIX - Use REGISTERED cluster for proper event handling
      // TuyaE000Cluster is now registered via Cluster.addCluster() in registerClusters.js
      // This allows SDK to properly route frames to cluster.on() listeners
      for (let ep = 1; ep <= 4; ep++) {
        const endpoint = zclNode?.endpoints?.[ep];
        if (!endpoint ) continue;

        // Access the registered cluster by name 'tuyaE000'
        const e000Cluster = endpoint.clusters?.tuyaE000 || endpoint.clusters?.[57344];
        if (e000Cluster && typeof e000Cluster.on === 'function') {
          this.log(`[BUTTON4-E000]  EP${ep} - Setting up tuyaE000 cluster listeners...` );
          
          // v5.8.54: Listen for ALL cmd events (cmd0-cmd6, cmdFD / FE/FF)
          // Previous version only had buttonPress(0x00) + buttonEvent(0x01) with
          // rigid uint8 args - SDK silently dropped frames with other cmd IDs
          const cmdNames = ['cmd0','cmd1','cmd2','cmd3','cmd4','cmd5','cmd6','cmdFD','cmdFE','cmdFF'];
          for (const cmdName of cmdNames) {
            e000Cluster.on(cmdName, async ({ data }) => {
              this.log(`[BUTTON4-E000]  EP${ep} ${cmdName}: data=${data?.toString?.('hex')}`);
              this._handleRawE000Frame(ep, { data });
      });
          }

          this.log(`[BUTTON4-E000]  tuyaE000 cluster listeners configured for EP${ep}`);
        } else {
          this.log(`[BUTTON4-E000]  EP${ep} - tuyaE000 cluster not available (will use BoundCluster fallback)`);
        }
      }

      // v5.5.923: CRITICAL FIX - Add raw frame interceptor for cluster 57344
      // BoundCluster may not receive frames if endpoint doesn't route unknown clusters
      // This intercepts ALL frames at the endpoint level before they're discarded
      await this._setupRawFrameInterceptor(zclNode);

    } catch (err) {
      this.log('[BUTTON4-E000]  Setup error:', err.message);
    }
  }

  /**
   * v5.5.968: CRITICAL FIX - Raw frame interceptor for MOES _TZ3000_zgyzgdua
   * Issue: BoundCluster may not receive frames because Homey SDK discards unknown cluster frames
   * Solution: Intercept frames at MULTIPLE levels - endpoint, zclNode, and onMessage
   * 
   * Forum reports: Kokosnootmelk, nickpatteeuw - physical buttons don't trigger
   * Z2M #28224: Device uses cluster 0xE000 (57344) for button presses
   */
  async _setupRawFrameInterceptor(zclNode) {
    try {
      this.log('[BUTTON4-RAW]  Setting up raw frame interceptor for cluster 57344...');
      
      // v5.5.968: LEVEL 1 - Hook zclNode.handleFrame for ALL incoming frames
      // This catches frames BEFORE they're routed to endpoints
      if (zclNode && typeof zclNode.handleFrame === 'function') {
        const originalNodeHandleFrame = zclNode.handleFrame.bind(zclNode);
        zclNode.handleFrame = async (endpointId, clusterId, frame, meta) => {
          // Log ALL frames for debugging (only when dp_debug_mode is enabled)
          if (this.getSetting?.('dp_debug_mode')) {
            this.log(`[BUTTON4-NODE]  EP${endpointId} cluster ${clusterId} frame received` );}
          
          // Intercept cluster 57344 (0xE000) frames
          if (clusterId === 57344 || clusterId === 0xE000) {
            this.log(`[BUTTON4-NODE]  EP${endpointId} cluster 57344 INTERCEPTED:`, {
              cmdId: frame?.cmdId,
              data: frame?.data?.toString?.('hex') || 'no data'
            });
            this._handleRawE000Frame(endpointId, frame );
          }
          
          // Always call original handler
          return originalNodeHandleFrame(endpointId, clusterId, frame, meta);
        };
        this.log('[BUTTON4-NODE]  zclNode.handleFrame hooked');
      }
      
      // v5.5.968: LEVEL 2 - Listen for 'message' event on zclNode (lower level)
      if (zclNode && typeof zclNode.on === 'function') {
        zclNode.on('message', (message) => {
          const clusterId = message?.clusterId;if (clusterId === 57344 || clusterId === 0xE000) {
            this.log('[BUTTON4-MSG]  zclNode message cluster 57344:', message);
            const ep = message?.endpointId || 1;this._handleRawE000Frame(ep, message);
          }
        });
        this.log('[BUTTON4-MSG]  zclNode message listener registered');
      }
      
      for (let ep = 1; ep <= 4; ep++) {
        const endpoint = zclNode?.endpoints?.[ep];
        if (!endpoint ) continue;

        // v5.5.968: LEVEL 3 - Listen for ALL incoming frames at endpoint level
        if (typeof endpoint.on === 'function') {
          endpoint.on('frame', (clusterId, frame, meta) => {
            // Only process cluster 57344 (0xE000) frames
            if (clusterId === 57344 || clusterId === 0xE000) {
              this.log(`[BUTTON4-RAW]  EP${ep} cluster 57344 frame:`, {
                clusterId,
                cmdId: frame?.cmdId,
                data: frame?.data?.toString?.('hex') || 'no data'
              });
              
              // Parse button press from frame
              this._handleRawE000Frame(ep, frame);
            }
          });
          this.log(`[BUTTON4-RAW]  Raw frame listener on EP${ep}`);
        }

        // v5.5.968: LEVEL 4 - Listen for 'command' events at endpoint level
        if (typeof endpoint.on === 'function') {
          endpoint.on('command', (clusterId, commandId, payload) => {
            if (clusterId === 57344 || clusterId === 0xE000) {
              this.log(`[BUTTON4-RAW]  EP${ep} cluster 57344 command:`, { commandId, payload });
              this._handleRawE000Command(ep, commandId, payload);
            }
          });
        }

        // v5.5.968: LEVEL 5 - Hook into endpoint.handleFrame
        const originalHandleFrame = endpoint.handleFrame?.bind(endpoint);if (originalHandleFrame) {
          endpoint.handleFrame = async (clusterId, frame, meta) => {
            // Intercept cluster 57344 frames BEFORE they're discarded
            if (clusterId === 57344 || clusterId === 0xE000) {
              this.log(`[BUTTON4-HOOK]  EP${ep} intercepted cluster 57344 frame`);
              this._handleRawE000Frame(ep, frame );
            }
            // Always call original handler
            return originalHandleFrame(clusterId, frame, meta);
          };
          this.log(`[BUTTON4-HOOK]  Frame handler hooked on EP${ep}`);
        }
      }

      this.log('[BUTTON4-RAW]  Raw frame interceptor setup complete');
    } catch (err) {
      this.log('[BUTTON4-RAW]  Setup error:', err.message);
    }
  }

  /**
   * v5.5.923: Handle raw cluster 57344 frame
   */
  _handleRawE000Frame(ep, frame) {
    try {
      const cmdId = frame?.cmdId ?? frame?.commandId;
      const data = frame?.data;this.log(`[BUTTON4-RAW]  Parsing frame: cmdId=${cmdId}, data=${data?.toString?.('hex')}`);
      
      // v5.9.22: Use centralized resolvePressType (prevents 0-index regression)
      
      // Strategy 1: cmdId as button number (1-4), data[0] as press type
      if (cmdId >= 0 && cmdId <= 4) {
        const button = cmdId === 0 ? 1 : cmdId;
        const pressType = resolvePressType(data?.[0], 'BTN4-RAW-cmd');this.log(`[BUTTON4-RAW]  Button ${button} ${pressType.toUpperCase()} (cmdId strategy)`);
        this.triggerButtonPress(button, pressType);
        return;
      }
      
      // Strategy 2: data[0] as button, data[1] as press type
      if (data && data.length >= 2) {
        const button = data[0];
        const pressType = resolvePressType(data[1], 'BTN4-RAW-data');
        if (button >= 1 && button <= 4) {
          this.log(`[BUTTON4-RAW]  Button ${button} ${pressType.toUpperCase()} (data strategy)`);
          this.triggerButtonPress(button, pressType);
          return;
        }
      }
      
      // Strategy 3: Single byte - endpoint as button, value as press type
      if (data && data.length === 1) {
        const button = ep;
        const pressType = resolvePressType(data[0], 'BTN4-RAW-byte');
        this.log(`[BUTTON4-RAW]  Button ${button} ${pressType.toUpperCase()} (single byte strategy)`);
        this.triggerButtonPress(button, pressType);
        return;
      }
      
      // Strategy 4: Fallback - use endpoint as button, single press
      this.log(`[BUTTON4-RAW]  Button ${ep} SINGLE (fallback strategy)`);
      this.triggerButtonPress(ep, 'single');
      
    } catch (err) {
      this.log(`[BUTTON4-RAW]  Parse error: ${err.message}`);
    }
  }

  /**
   * v5.5.923: Handle raw cluster 57344 command
   */
  _handleRawE000Command(ep, commandId, payload) {
    try {
      this.log(`[BUTTON4-RAW]  Command: id=${commandId}, payload=`, payload);
      
      // Command ID might be button number
      if (commandId >= 1 && commandId <= 4) {
        const button = commandId;
        const pressType = resolvePressType(payload?.[0] ?? payload?.data?.[0], 'BTN4-RAW-cmd2');
        this.log(`[BUTTON4-RAW]  Button ${button} ${pressType.toUpperCase()} (command strategy)`);
        this.triggerButtonPress(button, pressType);
      } else {
        // Use endpoint as button
        this.log(`[BUTTON4-RAW]  Button ${ep} SINGLE (command fallback)`);
        this.triggerButtonPress(ep, 'single');
      }
    } catch (err) {
      this.log(`[BUTTON4-RAW]  Command error: ${err.message}`);
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
        this.log('[BUTTON4-BATTERY]  Setting up battery reporting on EP1...' );

        // Listen for battery attribute reports
        if (typeof this._powerCluster.on === 'function') {
          this._powerCluster.on('attr.batteryPercentageRemaining', async (value) => {
            if (value !== undefined && value !== 255 && value !== 0) {
              const battery = Math.round(value);
              this.log(`[BUTTON4-BATTERY]  Battery report: ${battery}%`);
              await this._updateBattery(battery);
            }
          });

          this._powerCluster.on('attr.batteryVoltage', async (value) => {
            if (value !== undefined && value > 0) {
              const voltage = safeMultiply(value, 10);
              // CR2032/CR2450: 3.0V=100%, 2.0V=0%
              const battery = Math.min(100, Math.max(0, Math.round((voltage - 2.0) * 100)));
              this.log(`[BUTTON4-BATTERY]  Battery from voltage: ${voltage}V  ${battery}%`);
              await this._updateBattery(battery);
            }
          });

          this.log('[BUTTON4-BATTERY]  Battery listeners registered');
        }

        // v5.5.344: Schedule battery read (device may be asleep, will retry on wake)
        this._scheduleInitialBatteryRead();
      } else {
        this.log('[BUTTON4-BATTERY]  No powerConfiguration cluster found on EP1');
      }

      // v5.5.344: FORUM FIX - Also setup Tuya DP battery fallback for _TZ3000_5tqxpine
      await this._setupTuyaDPBatteryFallback(zclNode);

    } catch (err) {
      this.log('[BUTTON4-BATTERY]  Battery setup error:', err.message);
    }
  }

  /**
   * v5.5.344: Update battery with validation and caching
   */
  async _updateBattery(battery) {
    if (battery >= 0 && battery <= 100) {
      await this._safeSetCapability('measure_battery', parseFloat(battery)).catch(() => { });
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
      this.log('[BUTTON4-BATTERY]  Attempting to read battery...');
      const attrs = await this._powerCluster.readAttributes(['batteryPercentageRemaining', 'batteryVoltage']);

      if (attrs?.batteryPercentageRemaining !== undefined &&
        attrs.batteryPercentageRemaining !== 255 &&
        attrs.batteryPercentageRemaining !== 0) {
        const battery = Math.round(attrs.batteryPercentageRemaining );
        this.log(`[BUTTON4-BATTERY]  Battery read success: ${battery}%`);
        await this._updateBattery(battery);
      } else if (attrs?.batteryVoltage !== undefined && attrs.batteryVoltage > 0) {
        const voltage = safeMultiply(attrs.batteryVoltage, 10);
        const battery = Math.min(100, Math.max(0, Math.round((voltage - 2.0) * 100)));
        this.log(`[BUTTON4-BATTERY]  Battery from voltage: ${voltage}V  ${battery}%`);
        await this._updateBattery(battery);
      } else {
        this.log('[BUTTON4-BATTERY]  Battery read returned invalid value');
      }
    } catch (err) {
      // Expected for sleeping devices - will retry on next button press
      this.log('[BUTTON4-BATTERY]  Battery read failed (device may be sleeping):', err.message);
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
          this.log('[BUTTON4-MODE]  Mode verified on button press!');
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
        || zclNode?.endpoints?.[1]?.clusters?.[CLUSTERS.TUYA_EF00]
        || zclNode?.endpoints?.[1]?.clusters?.['CLUSTERS.TUYA_EF00'];

      if (tuyaCluster && typeof tuyaCluster.on === 'function') {
        this.log('[BUTTON4-BATTERY]  Setting up Tuya DP battery fallback...' );

        tuyaCluster.on('response', async (data) => {
          // Battery is commonly on DP 2, 3, 4, 10, or 101 for Tuya buttons
          const batteryDPs = [2, 3, 4, 10, 15, 101];
          const dp = data?.dp ?? data?.dataPointId;
          const value = data?.data ?? data?.value ?? data?.raw?.[0];

          if (batteryDPs.includes(dp) && value !== undefined) {
            let battery = null;

            // Interpret value based on range
            if (typeof value === 'number') {
              if (value <= 100) {
                battery = value; // Direct percentage
              } else if (value <= 200) {
                battery = Math.round(value ); // Doubled percentage
              } else if (value <= 3200) {
                // Voltage in mV (CR2032: 3000mV = 100%, 2000mV = 0%)
                battery = Math.min(100, Math.max(0, Math.round(value - 2000)));
              }
            }

            if (battery !== null && battery >= 0 && battery <= 100) {
              this.log(`[BUTTON4-BATTERY-DP]  Battery from DP${dp}: ${battery}%`);
              await this._safeSetCapability('measure_battery', parseFloat(battery)).catch(() => { });
              await this.setStoreValue('last_battery_percentage', battery).catch(() => { });
            }
          }
        });

        this.log('[BUTTON4-BATTERY]  Tuya DP battery fallback registered');
      }
    } catch (err) {
      this.log('[BUTTON4-BATTERY]  Tuya DP battery fallback error:', err.message);
    }
  }

  /**
   * v5.7.16: Enhanced virtual button handlers with explicit logging
   * Forum fix: Virtual buttons not triggering flows
   */
  async _registerEnhancedVirtualButtonHandlers() {
    this.log('[BUTTON4-VIRTUAL]  Setting up enhanced virtual button handlers...');
    
    for (let i = 1; i <= 4; i++) {
      const capId = `button.${i}`;
      const buttonNum = i;
      
      if (this.hasCapability(capId)) {
        try {
          // v5.7.16: Use multi-capability listener pattern for reliability
          this.registerCapabilityListener(capId, async (value) => {
            this.log(`[BUTTON4-VIRTUAL]  Button ${buttonNum} VIRTUAL PRESS (value=${value})`);
            this.log('[BUTTON4-VIRTUAL]  Triggered from Homey app or flow action');
            
            // Trigger flow cards
            await this.triggerButtonPress(buttonNum, 'single');
            
            return true;
          });
          this.log(`[BUTTON4-VIRTUAL]  Button ${buttonNum} handler registered`);
        } catch (err) {
          this.log(`[BUTTON4-VIRTUAL]  Button ${buttonNum} already has listener: ${err.message}`);
        }
      }
    }
    
    this.log('[BUTTON4-VIRTUAL]  Virtual button handlers ready');
  }

  /**
   * v5.8.3: CRITICAL FIX - Explicit Zigbee binding for cluster 57344 (0xE000)
   * Forum #1352 Freddyboy: MOES 4-button physical buttons not triggering flows
   * 
   * Issue: Homey SDK discards frames from unknown clusters before they reach our handlers.
   * Solution: Use ZDO (Zigbee Device Object) to explicitly bind cluster 57344 to coordinator.
   * This tells the device to send E000 cluster frames to Homey.
   */
  async _bindE000ClusterExplicit(zclNode) {
    try {
      this.log('[BUTTON4-BIND]  Attempting explicit Zigbee binding for cluster 57344...');
      
      // Get coordinator address from zclNode
      const coordinatorAddress = zclNode?.coordinatorAddress || this.homey?.zigbee?.coordinatorAddress;
      
      if (!coordinatorAddress) {
        this.log('[BUTTON4-BIND]  Coordinator address not available, skipping explicit binding');
        return;
      }
      
      // Try binding on endpoint 1 (where cluster 57344 is listed)
      const endpoint = zclNode?.endpoints?.[1];
      if (!endpoint) {
        this.log('[BUTTON4-BIND]  Endpoint 1 not available');
        return;
      }
      
      // Check if endpoint has ZDO bind method
      if (typeof endpoint.bind === 'function') {
        try {
          // Try standard bind with cluster ID
          await endpoint.bind('tuyaE000').catch(() => endpoint.bind(57344));
          this.log('[BUTTON4-BIND]  Standard bind succeeded for cluster tuyaE000' );
          return;
        } catch (bindErr) {
          this.log(`[BUTTON4-BIND]  Standard bind failed (expected for unknown cluster): ${bindErr.message}`);
        }
      }
      
      // Alternative: Use zclNode's ZDO if available
      if (zclNode?.zdo && typeof zclNode.zdo.bind === 'function') {
        try {
          await zclNode.zdo.bind(1, 57344, coordinatorAddress);
          this.log('[BUTTON4-BIND]  ZDO bind succeeded for cluster 57344');
          return;
        } catch (zdoErr) {
          this.log(`[BUTTON4-BIND]  ZDO bind failed: ${zdoErr.message}`);
        }
      }
      
      // Last resort: Try configureReporting which implicitly binds
      // This won't work for E000 but worth trying
      this.log('[BUTTON4-BIND]  Explicit binding not available via standard methods');
      this.log('[BUTTON4-BIND]  User should re-pair device for proper binding');
      
    } catch (err) {
      this.log(`[BUTTON4-BIND]  Binding error: ${err.message}`);
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


