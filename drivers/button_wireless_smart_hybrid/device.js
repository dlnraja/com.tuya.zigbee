'use strict';
// A8: NaN Safety - use safeDivide/safeMultiply
  require('../../lib/utils/CaseInsensitiveMatcher');
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');


const { CLUSTERS } = require('../../lib/constants/ZigbeeConstants.js');


const ButtonDevice = require('../../lib/devices/ButtonDevice');
const { resolve: resolvePressType, PRESS_MAP } = require('../../lib/utils/TuyaPressTypeMap');

// v5.5.733: HOBEIAN ZG-101ZL FIX - Import OnOffBoundCluster for outputCluster command reception
let OnOffBoundCluster = null;
try {
  OnOffBoundCluster = require('../../lib/clusters/OnOffBoundCluster');
  console.log('[BUTTON1]  OnOffBoundCluster loaded');
} catch (e) {
  console.log('[BUTTON1]  OnOffBoundCluster not available:', e.message);
}

// v5.5.823: TS004F Smart Knob FIX (GitHub #113) - Import LevelControlBoundCluster for rotary dimmer
let LevelControlBoundCluster = null;
try {
  LevelControlBoundCluster = require('../../lib/clusters/LevelControlBoundCluster');
  console.log('[BUTTON1]  LevelControlBoundCluster loaded');
} catch (e) {
  console.log('[BUTTON1]  LevelControlBoundCluster not available:', e.message);
}

/**
 * 
 *      BUTTON 1 GANG - v5.5.823 + TS004F SMART KNOB FIX (GitHub #113)         
 * 
 *                                                                               
 *   v5.5.823: TS004F Smart Knob Dimmer support (GitHub #113)                   
 *   - Added LevelControlBoundCluster for rotary dimmer commands                 
 *   - Supports step/move/stop commands from rotary knobs                        
 *   - _TZ3000_gwkzibhs Smart Knob Scene Switch                                  
 *                                                                               
 *   v5.5.376: FIX for "No Action detected" - Added IAS ACE support             
 *   - IAS ACE cluster (1281) for SOS/Emergency buttons (TS0215A)               
 *   - commandEmergency, panic, arm, disarm event handling                       
 *                                                                               
 *   v5.5.371: Enhanced physical button detection                                
 *   - Multiple event listener patterns for SDK3 compatibility                   
 *   - Tuya DP fallback for non-ZCL button events                               
 *                                                                               
 *   STRUCTURE TS0041/TS004F:                                                    
 *   EP1: Button 1 (scenes, onOff, powerCfg, groups, levelControl)              
 *                                                                               
 *   ACTIONS: single, double, hold, rotate_left, rotate_right                    
 *                                                                               
 * 
 */
class Button1GangDevice extends ButtonDevice {

  // v5.5.733: Track binding state for HOBEIAN
  _onOffBound = false;
  _onOffBoundClusterInstalled = false;
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
    this.log('[BUTTON1]  Button1GangDevice v5.5.823 initializing...');
    this.log('[BUTTON1] FIX: TS004F Smart Knob + Forum fixes');
    this.log('');

    // Set button count BEFORE calling super
    this.buttonCount = 1;

    // Log available endpoints for debugging
    const availableEndpoints = Object.keys(zclNode?.endpoints || {});this.log(`[BUTTON1]  Available endpoints: ${availableEndpoints.join(', ')}`);

    // Initialize ButtonDevice (handles basic button detection + battery)
    await super.onNodeInit({ zclNode }).catch(err => this.error('[INIT] Error:', err.message));

    // v5.5.715: HOBEIAN FIX - Explicit onOff binding for command reception
    // The device sends onOff commands (outputCluster 6) which need binding
    await this._setupOnOffBinding(zclNode);

    // v5.5.823: TS004F Smart Knob FIX (GitHub #113) - LevelControl for rotary dimmer
    await this._setupLevelControlBinding(zclNode);

    // v5.5.371: FORUM FIX - Enhanced physical button detection
    // Based on research from Zigbee2MQTT, ZHA, SmartThings patterns
    await this._setupEnhancedPhysicalButtonDetection(zclNode);

    // v5.5.371: Setup battery reporting listener
    await this._setupBatteryReporting(zclNode);

    // v5.9.8: Raw frame interceptor  SDK drops unknown cluster frames like E000
    // Fix: GH#124 Lalla80111 _TZ3000_b4awzgct TS0041 buttons not working
    await this._setupRawFrameInterceptor(zclNode);

    this.log('[BUTTON1]  Button1GangDevice initialized - 1 button ready');
    this.log('');
  }

  /**
   * v5.5.371: FORUM FIX - Enhanced physical button detection
   * Based on button_wireless_4 implementation that works correctly
   *
   * CRITICAL FINDINGS:
   * - Some devices send scene.recall commands
   * - Some devices use multistateInput cluster (cluster 18)
   * - Some devices use onOff attribute changes
   * - Need multiple listener patterns for SDK3 compatibility
   */
  async _setupEnhancedPhysicalButtonDetection(zclNode) {
    this.log('[BUTTON1-PHYSICAL]  Setting up enhanced physical button detection...');

    const manufacturerName = this.getSetting?.('zb_manufacturer_name') || this.getData()?.manufacturerName || '';
    this.log(`[BUTTON1-PHYSICAL] Manufacturer: ${manufacturerName}`);

    try {
      const endpoint = zclNode?.endpoints?.[1];
      if (!endpoint) {
        this.log('[BUTTON1-PHYSICAL]  Endpoint 1 not found' );
        return;
      }

      // v5.9.22: Use centralized PRESS_MAP (prevents 0-index regression)
      const pressTypeMap = PRESS_MAP;

      // v5.5.371: SCENES CLUSTER - Multiple event patterns
      const scenesCluster = endpoint.clusters?.scenes || endpoint.clusters?.genScenes || endpoint.clusters?.[5];
      if (scenesCluster && typeof scenesCluster.on === 'function') {
        this.log('[BUTTON1-PHYSICAL]  Setting up enhanced scene listeners...');

        const handleSceneRecall = async (sceneId) => {
          const pressType = pressTypeMap[sceneId] || 'single';
          this.log(`[BUTTON1-SCENE]  Button 1 ${pressType.toUpperCase()} (scene ${sceneId})`);
          await this.triggerButtonPress(1, pressType);
        };

        // Pattern 1: Direct 'recall' event
        scenesCluster.on('recall', async (payload) => {
          this.log('[BUTTON1-SCENE] recall event:', payload);
          const sceneId = payload?.sceneId ?? payload?.sceneid ?? payload?.scene ?? 0;
          await handleSceneRecall(sceneId);
      });

        // Pattern 2: 'recallScene' event
        scenesCluster.on('recallScene', async (payload) => {
          this.log('[BUTTON1-SCENE] recallScene event:', payload);
          const sceneId = payload?.sceneId ?? payload?.sceneid ?? payload?.scene ?? 0;
          await handleSceneRecall(sceneId);
      });

        this.log('[BUTTON1-PHYSICAL]  Enhanced scene listeners configured' );
      }

      // v5.5.371: MULTISTATE INPUT CLUSTER - For Tuya variants
      const multistateCluster = endpoint.clusters?.multistateInput || endpoint.clusters?.genMultistateInput || endpoint.clusters?.[18];
      if (multistateCluster && typeof multistateCluster.on === 'function') {
        this.log('[BUTTON1-PHYSICAL]  Setting up multistateInput listeners...');

        const handleMultistate = async (value) => {
          const pressType = pressTypeMap[value] || 'single';
          this.log(`[BUTTON1-MULTISTATE]  Button 1 ${pressType.toUpperCase()} (multistate ${value})`);
          await this.triggerButtonPress(1, pressType);
        };

        // Pattern 1: attr.presentValue
        multistateCluster.on('attr.presentValue', async (value) => {
          this.log('[BUTTON1-MULTISTATE] attr.presentValue:', value);
          await handleMultistate(value);
      });

        // Pattern 2: presentValue
        multistateCluster.on('presentValue', async (value) => {
          this.log('[BUTTON1-MULTISTATE] presentValue:', value);
          await handleMultistate(value);
      });

        // Pattern 3: report event
        multistateCluster.on('report', async (attributes) => {
          this.log('[BUTTON1-MULTISTATE] report:', attributes);
          if (attributes?.presentValue !== undefined) {
            await handleMultistate(attributes.presentValue);
          }
        });

        this.log('[BUTTON1-PHYSICAL]  MultistateInput listeners configured' );
      }

      // v5.5.371: ONOFF CLUSTER COMMANDS - For command-based buttons
      const onOffCluster = endpoint.clusters?.onOff || endpoint.clusters?.genOnOff || endpoint.clusters?.[6];
      if (onOffCluster && typeof onOffCluster.on === 'function') {
        this.log('[BUTTON1-PHYSICAL]  Setting up enhanced onOff command listeners...' );

        // v5.5.500: HOBEIAN ZG-101ZL DUAL MODE SUPPORT
        // The device has TWO modes (switch with triple-click):
        // 1. EVENT mode (default): sends single/double/hold via commandOn/Off/Toggle
        // 2. COMMAND mode: sends toggle/on/off for group control
        //
        // In EVENT mode (Z2M fz.on_off_action):
        // - commandOn = single press
        // - commandOff = double press
        // - commandToggle = hold/long press
        //
        // In COMMAND mode:
        // - toggle = single press
        // - on = double press
        // - off = long press

        onOffCluster.on('command', async (commandName, commandPayload) => {
          this.log(`[BUTTON1-ONOFF]  COMMAND RECEIVED: ${commandName}`, commandPayload);

          // v5.5.500: EVENT MODE mapping (default mode)
          // This is what Z2M's fz.on_off_action uses
          const eventModeMap = {
            'commandOn': 'single',
            'commandOff': 'double',
            'commandToggle': 'long',
            'commandOnWithTimedOff': 'single',
            'commandOffWithEffect': 'double'
          };

          // v5.5.500: COMMAND MODE mapping (triple-click to switch)
          const commandModeMap = {
            'toggle': 'single',
            'setToggle': 'single',
            'on': 'double',
            'setOn': 'double',
            'off': 'long',
            'setOff': 'long'
          };

          // Try event mode first (default), then command mode
          let pressType = eventModeMap[commandName] || commandModeMap[commandName];

          if (pressType) {
            this.log(`[BUTTON1-ONOFF]  Button 1 ${pressType.toUpperCase()} (${commandName})`);
            await this.triggerButtonPress(1, pressType);
          } else {
            this.log(`[BUTTON1-ONOFF]  Unknown command: ${commandName}`);
            // Fallback: trigger single press for any unknown command
            await this.triggerButtonPress(1, 'single');
          }
        });

        // v5.5.500: Additional command listeners for different SDK event names
        onOffCluster.on('commandOn', async (payload) => {
          this.log('[BUTTON1-ONOFF]  commandOn event (EVENT MODE: single)');
          await this.triggerButtonPress(1, 'single');
      });

        onOffCluster.on('commandOff', async (payload) => {
          this.log('[BUTTON1-ONOFF]  commandOff event (EVENT MODE: double)');
          await this.triggerButtonPress(1, 'double');
      });

        onOffCluster.on('commandToggle', async (payload) => {
          this.log('[BUTTON1-ONOFF]  commandToggle event (EVENT MODE: long)');
          await this.triggerButtonPress(1, 'long');
      });

        // v5.5.500: Direct command name listeners
        onOffCluster.on('toggle', async () => {
          this.log('[BUTTON1-ONOFF]  toggle event (COMMAND MODE: single)');
          await this.triggerButtonPress(1, 'single');
      });

        onOffCluster.on('on', async () => {
          this.log('[BUTTON1-ONOFF]  on event (COMMAND MODE: double)');
          await this.triggerButtonPress(1, 'double');
      });

        onOffCluster.on('off', async () => {
          this.log('[BUTTON1-ONOFF]  off event (COMMAND MODE: long)');
          await this.triggerButtonPress(1, 'long');
      });

        // v5.5.504: HOBEIAN FIX - Listen for onOff ATTRIBUTE changes with PERIODIC REPORT FILTERING
        // HOBEIAN ZG-101ZL uses onOff attribute reports for button presses
        // BUT also sends periodic reports every ~10 minutes that should NOT trigger button press
        this._lastOnOffState = null;
        this._lastOnOffTime = 0;
        this._initTime = Date.now();

        onOffCluster.on('attr.onOff', async (value) => {
          const now = Date.now();
          const timeSinceLastEvent = now - this._lastOnOffTime;
          const timeSinceInit = now - this._initTime;

          this.log(`[BUTTON1-ONOFF] attr.onOff: ${value} (last=${this._lastOnOffState}, sinceEvent=${timeSinceLastEvent}ms)`);

          // v5.5.504: IGNORE PERIODIC REPORTS - same value after >5 seconds = status report, NOT button press
          if (this._lastOnOffState !== null && value === this._lastOnOffState && timeSinceLastEvent > 60000) {
            const secs = timeSinceLastEvent * 1000;
            if ([300,600,900,1800,3600].some(i => Math.abs(secs-i) < i * 10)) {
              this.log(`[BUTTON1-ONOFF]  Ignored: periodic (~${Math.round(secs)}s)`);
              this._lastOnOffTime = now;
              return;
            }
          }

          // Ignore initial state report within first 3 seconds of init
          if (this._lastOnOffState === null && timeSinceInit < 3000) {
            this.log('[BUTTON1-ONOFF]  Initial state stored (not triggering)');
            this._lastOnOffState = value;
            this._lastOnOffTime = now;
            return;
          }

          // Debounce rapid duplicates (<100ms)
          if (this._lastOnOffState === value && timeSinceLastEvent < 100) {
            this.log('[BUTTON1-ONOFF]  Debounced duplicate');
            return;
          }

          this._lastOnOffState = value;
          this._lastOnOffTime = now;

          this.log(`[BUTTON1-ONOFF]  HOBEIAN button press detected: ${value}`);
          await this.triggerButtonPress(1, 'single');
      });

        onOffCluster.on('report', async (attributes) => {
          if (attributes?.onOff !== undefined) {
            const now = Date.now();
            const timeSinceLastEvent = now - this._lastOnOffTime;

            // v5.5.504: IGNORE PERIODIC REPORTS
            if (this._lastOnOffState !== null && attributes.onOff === this._lastOnOffState && timeSinceLastEvent > 60000) {
              const secs = timeSinceLastEvent * 1000;
              if ([300,600,900,1800,3600].some(i => Math.abs(secs-i) < i * 10)) {
                this.log(`[BUTTON1-ONOFF]  Ignored report: periodic (~${Math.round(secs)}s)`);
                this._lastOnOffTime = now;
                return;
              }
            }

            if (this._lastOnOffState === attributes.onOff && timeSinceLastEvent < 100) {
              return; // Debounce
            }

            this._lastOnOffState = attributes.onOff;
            this._lastOnOffTime = now;

            this.log(`[BUTTON1-ONOFF]  HOBEIAN report button press: ${attributes.onOff}`);
            await this.triggerButtonPress(1, 'single');
          }
        });

        this.log('[BUTTON1-PHYSICAL]  Enhanced onOff command + attribute listeners configured');
      }

      // v5.5.371: IAS ZONE CLUSTER - For button devices with iasZone
      // v5.5.480: FIX for Cam's issue - debounce IAS Zone to filter keep-alive messages
      // Keep-alive messages occur at regular intervals (30min/1hour) and should not trigger button press
      const iasZoneCluster = endpoint.clusters?.iasZone || endpoint.clusters?.ssIasZone || endpoint.clusters?.[1280];
      if (iasZoneCluster && typeof iasZoneCluster.on === 'function') {
        this.log('[BUTTON1-PHYSICAL]  Setting up IAS Zone listeners with keep-alive filter...' );

        // v5.5.480: Track IAS Zone events to filter keep-alive vs real button presses
        this._lastIasZoneTime = 0;
        this._iasZoneDebounceMs = 5000; // 5 second debounce
        this._iasZoneLastStatus = null;

        const handleIasZoneEvent = async (payload, eventName) => {
          const now = Date.now();
          const timeSinceLast = now - this._lastIasZoneTime;
          const zoneStatus = payload?.zoneStatus;this.log(`[BUTTON1-IASZONE] ${eventName}: zoneStatus=${zoneStatus}, timeSinceLast=${timeSinceLast}ms`);

          // v5.5.480: Filter keep-alive messages
          // Keep-alive typically sends the SAME status at regular intervals
          // Real button presses have status change or rapid succession
          if (zoneStatus !== undefined && (zoneStatus & 0x01)) {
            // Debounce: ignore if same status within 5 seconds (keep-alive filter)
            if (this._iasZoneLastStatus === zoneStatus && timeSinceLast < this._iasZoneDebounceMs) {
              this.log('[BUTTON1-IASZONE]  Debounced (same status within 5s - likely keep-alive)');
              return;
            }

            // v5.5.480: Additional keep-alive detection
            // If message arrives at ~30min or ~60min intervals, it's likely keep-alive
            const isLikelyKeepAlive = (
              (timeSinceLast > 1700000 && timeSinceLast < 1900000) || // ~30 min
              (timeSinceLast > 3500000 && timeSinceLast < 3700000)    // ~60 min
            );

            if (isLikelyKeepAlive && this._iasZoneLastStatus === zoneStatus) {
              this.log('[BUTTON1-IASZONE]  BLOCKED: Likely keep-alive message (30/60min interval)');
              this._lastIasZoneTime = now;
              return;
            }

            this._lastIasZoneTime = now;
            this._iasZoneLastStatus = zoneStatus;

            this.log('[BUTTON1-IASZONE]  Button 1 SINGLE (IAS Zone alarm - real press)');
            await this.triggerButtonPress(1, 'single');
          }
        };

        iasZoneCluster.on('zoneStatusChangeNotification', async (payload) => {
          await handleIasZoneEvent(payload, 'zoneStatusChangeNotification');
      });

        iasZoneCluster.on('statusChangeNotification', async (payload) => {
          await handleIasZoneEvent(payload, 'statusChangeNotification');
      });

        this.log('[BUTTON1-PHYSICAL]  IAS Zone listeners configured with keep-alive filter');
      }

      // v5.5.376: IAS ACE CLUSTER - For SOS/Emergency buttons (TS0215A)
      // These buttons use IAS ACE cluster (1281) with commandEmergency
      const iasAceCluster = endpoint.clusters?.iasAce || endpoint.clusters?.ssIasAce || endpoint.clusters?.[1281];
      if (iasAceCluster && typeof iasAceCluster.on === 'function') {
        this.log('[BUTTON1-PHYSICAL]  Setting up IAS ACE listeners (SOS button)...');

        // Emergency command = SOS button press
        iasAceCluster.on('emergency', async (payload) => {
          this.log('[BUTTON1-IASACE]  EMERGENCY command received:', payload);
          await this.triggerButtonPress(1, 'single');
      });

        iasAceCluster.on('commandEmergency', async (payload) => {
          this.log('[BUTTON1-IASACE]  commandEmergency received:', payload);
          await this.triggerButtonPress(1, 'single');
      });

        // Panic command = double press on some SOS buttons
        iasAceCluster.on('panic', async (payload) => {
          this.log('[BUTTON1-IASACE]  PANIC command received:', payload);
          await this.triggerButtonPress(1, 'double');
      });

        // Arm/Disarm commands used by some remote buttons
        iasAceCluster.on('arm', async (payload) => {
          this.log('[BUTTON1-IASACE]  ARM command:', payload);
          await this.triggerButtonPress(1, 'single');
      });

        iasAceCluster.on('disarm', async (payload) => {
          this.log('[BUTTON1-IASACE]  DISARM command:', payload);
          await this.triggerButtonPress(1, 'double');
      });

        this.log('[BUTTON1-PHYSICAL]  IAS ACE listeners configured (SOS/Emergency support)');
      }

      // v5.5.371: TUYA DP CLUSTER - For Tuya-specific devices
      await this._setupTuyaDPButtonDetection(zclNode);

      // v5.8.66: Cluster 0xE000 (57344) - Tuya/MOES button event cluster
      // GitHub #121: _TZ3000_an5rjiwd TS0041 uses this cluster for button presses
      // Already in button_wireless_3 and button_wireless_4, was MISSING from button_wireless_1
      await this._setupE000ButtonDetection(zclNode);

      // v5.5.457: HOBEIAN CLUSTER 57345 (0xE001) - Tuya button-specific cluster
      await this._setupHobeianCluster(zclNode);

      this.log('[BUTTON1-PHYSICAL]  Enhanced physical button detection configured');

    } catch (error) {
      this.log('[BUTTON1-PHYSICAL]  Setup error:', error.message);
    }
  }

  /**
   * v5.5.457: HOBEIAN cluster 57345 (0xE001) support
   * HOBEIAN ZG-101ZL uses this Tuya-specific cluster for button events
   */
  async _setupHobeianCluster(zclNode) {
    try {
      const endpoint = zclNode?.endpoints?.[1];
      if (!endpoint ) return;

      // Cluster 57345 = 0xE001 - Tuya button event cluster
      const hobeianCluster = endpoint.clusters?.[57345] || endpoint.clusters?.['57345'];

      if (hobeianCluster && typeof hobeianCluster.on === 'function') {
        this.log('[BUTTON1-HOBEIAN]  Setting up HOBEIAN cluster 0xE001 listeners...' );

        // Listen for any events from this cluster
        hobeianCluster.on('report', async (data) => {
          this.log('[BUTTON1-HOBEIAN]  Report:', data);
          const value = data?.value ?? data?.[0] ?? 0;
          await this.triggerButtonPress(1, resolvePressType(value, 'HOBEIAN-report'));
      });

        hobeianCluster.on('response', async (data) => {
          this.log('[BUTTON1-HOBEIAN]  Response:', data);
          const value = data?.value ?? data?.data ?? 0;
          await this.triggerButtonPress(1, resolvePressType(value, 'HOBEIAN-response'));
      });

        // Generic command listener
        hobeianCluster.on('command', async (commandName, payload) => {
          this.log(`[BUTTON1-HOBEIAN]  Command ${commandName}:`, payload);
          await this.triggerButtonPress(1, 'single');
      });

        this.log('[BUTTON1-HOBEIAN]  HOBEIAN cluster 0xE001 listeners configured');
      } else {
        this.log('[BUTTON1-HOBEIAN]  Cluster 57345 (0xE001) not found');
      }
    } catch (err) {
      this.log('[BUTTON1-HOBEIAN]  Setup error:', err.message);
    }
  }

  // v5.8.66: Cluster 0xE000 (57344) - GitHub #121 _TZ3000_an5rjiwd fix
  async _setupE000ButtonDetection(zclNode) {
    try {
      const E000 = require('../../lib/clusters/TuyaE000BoundCluster');
      const ep = zclNode?.endpoints?.[1];
      if (!ep ) return;
      const bc = new E000({ device: this, onButtonPress: async (b, p) => {
        const pt = resolvePressType(p, 'BUTTON1-E000');
        this.log(`[BUTTON1-E000]  ${pt} (btn=${b})`);
        await this.triggerButtonPress(1, pt);
      }});
      bc.endpoint = 1;
      if (!ep.bindings) ep.bindings = {};
      ep.bindings['tuyaE000'] = bc;
      this.log('[BUTTON1-E000]  BoundCluster EP1');
    } catch (e) { this.log('[BUTTON1-E000]  skip:', e.message); }
  }

  // v5.9.8: Raw frame interceptor (GH#124 _TZ3000_b4awzgct fix)
  async _setupRawFrameInterceptor(zclNode) {
    try {
      if (!zclNode || typeof zclNode.handleFrame !== 'function') return;
      const orig = zclNode.handleFrame.bind(zclNode);
      zclNode.handleFrame = async (epId, cId, frame, meta) => {
        if (cId === 57344 || cId === 0xE000) {
          this.log(`[BUTTON1-RAW] EP${epId} E000 frame`);
          this._parseRawE000Frame(epId, frame);
        }
        return orig(epId, cId, frame, meta);
      };
      this.log('[BUTTON1-RAW]  Frame interceptor ready');
    } catch (e) { this.log(`[BUTTON1-RAW]  ${e.message}`); }
  }

  _parseRawE000Frame(ep, frame) {
    try {
      const cmdId = frame?.cmdId ?? frame?.commandId;
      const data = frame?.data;this.log(`[BUTTON1-RAW] cmdId=${cmdId} data=${data?.toString?.('hex') || '-'}`);
      if (cmdId >= 0 && cmdId <= 5) {
        const pt = resolvePressType(data?.[0], 'BUTTON1-RAW-cmd');this.log(`[BUTTON1-RAW]  ${pt} (cmdId)`);
        this.triggerButtonPress(1, pt);
        return;
      }
      if (data && data.length >= 2) {
        const pt = resolvePressType(data[1], 'BUTTON1-RAW-data');
        this.log(`[BUTTON1-RAW]  ${pt} (data)`);
        this.triggerButtonPress(1, pt);
        return;
      }
      if (data && data.length === 1) {
        const pt = resolvePressType(data[0], 'BUTTON1-RAW-byte');
        this.log(`[BUTTON1-RAW]  ${pt} (byte)`);
        this.triggerButtonPress(1, pt);
        return;
      }
      this.log('[BUTTON1-RAW]  single (fallback)');
      this.triggerButtonPress(1, 'single');
    } catch (e) { this.log(`[BUTTON1-RAW]  ${e.message}`); }
  }

  /**
   * v5.5.715: HOBEIAN FIX - Explicit onOff cluster binding
   * 
   * HOBEIAN ZG-101ZL sends button events via onOff cluster COMMANDS (outputCluster 6)
   * For Homey to receive these commands, the cluster must be bound.
   * 
   * Z2M docs: Device has two modes (triple-click to switch):
   * - EVENT mode: commandOn=single, commandOff=double, commandToggle=hold
   * - COMMAND mode: on/off/toggle for group control
   */
  async _setupOnOffBinding(zclNode) {
    const manufacturerName = this.getSetting?.('zb_manufacturer_name') || this.getData()?.manufacturerName || '';
    const modelId = this.getSetting?.('zb_model_id') || this.getData()?.productId || this.getData()?.modelId || '';
    
    // v5.8.39: UNIVERSAL for ALL 1-gang buttons (was HOBEIAN-only, caused TS0041 to miss presses)
    // Root cause: Button devices send onOff COMMANDS (client-to-server). These go to
    // endpoint.bindings['onOff'] (BoundCluster), NOT endpoint.clusters['onOff'].
    // Without BoundCluster, frames are silently dropped with 'binding_unavailable'.
    this.log(`[BUTTON1-BIND]  Setting up universal onOff binding (${manufacturerName})...`);

    try {
      const endpoint = zclNode?.endpoints?.[1];
      if (!endpoint) {
        this.log('[BUTTON1-BIND]  Endpoint 1 not found' );
        return;
      }

      // v5.5.733: CRITICAL FIX - Use OnOffBoundCluster to RECEIVE commands from outputCluster
      // HOBEIAN ZG-101ZL sends button presses via onOff outputCluster (cluster 6 in outputClusters)
      // We need a BoundCluster to intercept these incoming commands
      if (OnOffBoundCluster && typeof endpoint.bind === 'function' && !this._onOffBoundClusterInstalled) {
        try {
          this.log('[BUTTON1-BIND]  Installing OnOffBoundCluster to receive commands...');
          
          const boundCluster = new OnOffBoundCluster({
            onSetOn: (p) => {
              // v5.9.20: Handle Tuya cmd 0xFD multi-press
              if (p?.cmdId === 0xFD) {
                const action = resolvePressType(p.scene ?? 0, 'BUTTON1-0xFD');
                this.log(`[BUTTON1-0xFD] pressType=${p.scene}  ${action}` );
                this.triggerButtonPress(1, action);
                return;
              }
              this.log('[BUTTON1-BOUND]  ON command received (EVENT MODE: single)');
              this.triggerButtonPress(1, 'single');
            },
            onSetOff: () => {
              this.log('[BUTTON1-BOUND]  OFF command received (EVENT MODE: double)');
              this.triggerButtonPress(1, 'double');
            },
            onToggle: () => {
              this.log('[BUTTON1-BOUND]  TOGGLE command received (EVENT MODE: long)');
              this.triggerButtonPress(1, 'long');
            },
            onWithTimedOff: (payload) => {
              this.log('[BUTTON1-BOUND]  onWithTimedOff received:', payload);
              this.triggerButtonPress(1, 'single');
            }
          });

          // Bind to onOff cluster name (cluster 6)
          endpoint.bind('onOff', boundCluster);
          this._onOffBoundClusterInstalled = true;
          this.log('[BUTTON1-BIND]  OnOffBoundCluster installed successfully!');
          this.log('[BUTTON1-BIND]  Now listening for ON/OFF/TOGGLE commands from device');
          
        } catch (boundErr) {
          this.log(`[BUTTON1-BIND]  BoundCluster install failed: ${boundErr.message}`);
        }
      }

      // Fallback: Try regular cluster binding
      const onOffCluster = endpoint.clusters?.onOff || endpoint.clusters?.genOnOff || endpoint.clusters?.[6];
      // v5.11.16: Fire-and-forget bind (don't block init on sleepy battery buttons  SkiMattie #1446)
      if (onOffCluster && typeof onOffCluster.bind === 'function') {
        onOffCluster.bind().then(() => {
          this._onOffBound = true;
          this.log('[BUTTON1-BIND]  OnOff cluster bound (fallback method)');
        }).catch(() => {});
      }

      // Store for later use
      this._onOffCluster = onOffCluster;

      this.log('[BUTTON1-BIND]  Universal onOff binding setup complete');

    } catch (err) {
      this.log('[BUTTON1-BIND]  Setup error:', err.message);
    }
  }

  /**
   * v5.5.715: Handle device wake/rejoin - re-attempt binding
   * Sleepy devices only accept commands when awake
   */
  async onEndDeviceAnnounce() {
    this.log('[BUTTON1]  Device announced (wake/rejoin)');
    
    // v7.3.0: Call parent handler to re-bind standard clusters
    await super.onEndDeviceAnnounce();
    
    // Try to bind onOff cluster when device wakes
    if (this._zclNode && !this._onOffBound) {
      this.log('[BUTTON1]  Attempting onOff binding on wake...');
      await this._setupOnOffBinding(this._zclNode);
    }
  }

  /**
   * v5.5.371: Tuya DP button detection for non-ZCL button events
   */
  async _setupTuyaDPButtonDetection(zclNode) {
    try {
      const tuyaCluster = zclNode?.endpoints?.[1]?.clusters?.tuya
        || zclNode?.endpoints?.[1]?.clusters?.manuSpecificTuya
        || zclNode?.endpoints?.[1]?.clusters?.[CLUSTERS.TUYA_EF00]
        || zclNode?.endpoints?.[1]?.clusters?.['61184']
        || zclNode?.endpoints?.[1]?.clusters?.[CLUSTERS.TUYA_EF00];

      if (!tuyaCluster) {
        this.log('[BUTTON1-TUYA-DP]  No Tuya cluster found - using ZCL only');
        return;
      }

      this.log('[BUTTON1-TUYA-DP]  Setting up Tuya DP button detection...' );

      if (typeof tuyaCluster.on === 'function') {
        tuyaCluster.on('response', async (data) => {
          const dp = data?.dp ?? data?.dataPointId ?? data?.dpId;
          const value = data?.data ?? data?.value ?? data?.raw?.[0] ?? 0;

          this.log(`[BUTTON1-TUYA-DP]  DP${dp} = ${value}`, data);

          // DP 1 typically is button 1 press
          if (dp === 1) {
            const pressType = resolvePressType(value, 'BUTTON1-DP');
            this.log(`[BUTTON1-TUYA-DP]  Button 1 ${pressType.toUpperCase()} (DP${dp}=${value})`);
            await this.triggerButtonPress(1, pressType);
          }
        });

        tuyaCluster.on('report', async (data) => {
          this.log('[BUTTON1-TUYA-DP]  Report event:', data);
          const dp = data?.dp ?? data?.dataPointId ?? data?.dpId;
          const value = data?.data ?? data?.value ?? 0;
          if (dp === 1) {
            await this.triggerButtonPress(1, resolvePressType(value, 'BUTTON1-DP-rpt'));
          }
        });

        tuyaCluster.on('datapoint', async (data) => {
          const dp = data?.dp ?? data?.datapoint ?? data?.dpId;
          const value = data?.data?.[0] ?? data?.value ?? 0;
          if (dp === 1) {
            const pressType = resolvePressType(value, 'BUTTON1-DP-dp' );
            await this.triggerButtonPress(1, pressType);
          }
        });

        this.log('[BUTTON1-TUYA-DP]  Tuya DP button detection configured');
      }
    } catch (err) {
      this.log('[BUTTON1-TUYA-DP]  Setup error:', err.message);
    }
  }

  /**
   * v5.5.371: Enhanced battery reporting for sleepy devices
   */
  async _setupBatteryReporting(zclNode) {
    try {
      this._powerCluster = zclNode?.endpoints?.[1]?.clusters?.powerConfiguration
        || zclNode?.endpoints?.[1]?.clusters?.genPowerCfg
        || zclNode?.endpoints?.[1]?.clusters?.[1];

      if (this._powerCluster && typeof this._powerCluster.on === 'function') {
        this.log('[BUTTON1-BATTERY]  Setting up battery reporting...' );

        this._powerCluster.on('attr.batteryPercentageRemaining', async (value) => {
          if (value !== undefined && value !== 255 && value !== 0) {
            const battery = Math.round(value);
            this.log(`[BUTTON1-BATTERY]  Battery report: ${battery}%`);
            // v5.5.519: Check capability exists before setting (fix HOBEIAN AC-powered button error)
            if (this.hasCapability('measure_battery')) {
              await this._safeSetCapability('measure_battery', parseFloat(battery)).catch(() => { });
            }
          }
        });

        this._powerCluster.on('attr.batteryVoltage', async (value) => {
          if (value !== undefined && value > 0) {
            const voltage = value * 10;
            const battery = Math.min(100, Math.max(0, Math.round((voltage - 2.0) * 100)));
            this.log(`[BUTTON1-BATTERY]  Battery from voltage: ${voltage}V  ${battery}%`);
            // v5.5.519: Check capability exists before setting
            if (this.hasCapability('measure_battery')) {
              await this._safeSetCapability('measure_battery', parseFloat(battery)).catch(() => { });
            }
          }
        });

        this.log('[BUTTON1-BATTERY]  Battery listeners registered');
      }
    } catch (err) {
      this.log('[BUTTON1-BATTERY]  Battery setup error:', err.message);
    }
  }

  /**
   * v5.5.371: Override triggerButtonPress to read battery when device wakes
   */
  async triggerButtonPress(buttonNumber, pressType) {
    // Call parent implementation
    if (super.triggerButtonPress) {
      await super.triggerButtonPress(buttonNumber, pressType);
    }

    // Device is awake after button press - try to read battery
    if (this._powerCluster && typeof this._powerCluster.readAttributes === 'function') {
      this.homey.setTimeout(async () => {
        try {
          const attrs = await this._powerCluster.readAttributes(['batteryPercentageRemaining', 'batteryVoltage']);
          if (attrs?.batteryPercentageRemaining !== undefined && attrs.batteryPercentageRemaining !== 255) {
            const battery = Math.round(attrs.batteryPercentageRemaining );
            this.log(`[BUTTON1-BATTERY]  Battery read on wake: ${battery}%`);
            // v5.5.519: Check capability exists before setting
            if (this.hasCapability('measure_battery')) {
              await this._safeSetCapability('measure_battery', parseFloat(battery)).catch(() => { });
            }
          }
        } catch (err) {
          // Expected for sleeping devices
        }
      });
    }
  }

  /**
   * v5.5.823: TS004F Smart Knob FIX (GitHub #113)
   * Setup LevelControlBoundCluster for rotary dimmer commands
   * The TS004F sends levelControl commands (outputCluster 8) for rotation
   */
  async _setupLevelControlBinding(zclNode) {
    if (!LevelControlBoundCluster) {
      this.log('[BUTTON1-LEVEL]  LevelControlBoundCluster not available');
      return;
    }

    const modelId = this.getSetting?.('zb_model_id') || this.getData()?.modelId || '';
    const manufacturerName = this.getSetting?.('zb_manufacturer_name') || this.getData()?.manufacturerName || '';
    
    // Only setup for TS004F Smart Knob devices
    const isSmartKnob = CI.containsCI(modelId, 'TS004F') || 
                        CI.containsCI(manufacturerName, 'gwkzibhs' );
    
    if (!isSmartKnob) {
      this.log('[BUTTON1-LEVEL] Not a Smart Knob device, skipping levelControl setup');
      return;
    }

    this.log('[BUTTON1-LEVEL]  Setting up LevelControl for Smart Knob...');

    try {
      const endpoint = zclNode?.endpoints?.[1];
      if (!endpoint) {
        this.log('[BUTTON1-LEVEL]  Endpoint 1 not found' );
        return;
      }

      // Install LevelControlBoundCluster to receive rotation commands
      const levelControlBoundCluster = new LevelControlBoundCluster({
        onStep: async ({ mode, stepSize }) => {
          this.log(`[BUTTON1-LEVEL]  Step ${mode} (size: ${stepSize})`);
          const pressType = mode === 'up' ? 'rotate_right' : 'rotate_left';
          await this.triggerButtonPress(1, pressType);
        },
        onStepWithOnOff: async ({ mode, stepSize }) => {
          this.log(`[BUTTON1-LEVEL]  StepWithOnOff ${mode} (size: ${stepSize})`);
          const pressType = mode === 'up' ? 'rotate_right' : 'rotate_left';
          await this.triggerButtonPress(1, pressType);
        },
        onMove: async ({ moveMode, rate }) => {
          this.log(`[BUTTON1-LEVEL]  Move ${moveMode} (rate: ${rate})`);
          const pressType = moveMode === 'up' ? 'rotate_right' : 'rotate_left';
          await this.triggerButtonPress(1, pressType);
        },
        onMoveWithOnOff: async ({ moveMode, rate }) => {
          this.log(`[BUTTON1-LEVEL]  MoveWithOnOff ${moveMode} (rate: ${rate})`);
          const pressType = moveMode === 'up' ? 'rotate_right' : 'rotate_left';
          await this.triggerButtonPress(1, pressType);
        },
        onStop: async () => {
          this.log('[BUTTON1-LEVEL]  Stop (rotation released)');
        },
        onStopWithOnOff: async () => {
          this.log('[BUTTON1-LEVEL]  StopWithOnOff (rotation released)');
        },
      });

      // Bind the cluster
      endpoint.bind('levelControl', levelControlBoundCluster);
      this.log('[BUTTON1-LEVEL]  LevelControlBoundCluster installed for Smart Knob');

    } catch (err) {
      this.log('[BUTTON1-LEVEL]  LevelControl setup error:', err.message);
    }
  }

  async onDeleted() {
    this.log('Button1GangDevice deleted');

    // Cleanup timers
    if (this._clickState) {
      if (this._clickState.clickTimer) {
        clearTimeout(this._clickState.clickTimer);
      }
      if (this._clickState.longPressTimer) {
        clearTimeout(this._clickState.longPressTimer);
      }
    }

    // Call parent cleanup
    if (super.onDeleted) {
      await super.onDeleted();
    }
  }
}

module.exports = Button1GangDevice;


