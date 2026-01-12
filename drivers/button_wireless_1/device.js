'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║     BUTTON 1 GANG - v5.5.499 ENHANCED FOR TS0041 / TS0042 / TS0215A         ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  v5.5.376: FIX for "No Action detected" - Added IAS ACE support             ║
 * ║  - IAS ACE cluster (1281) for SOS/Emergency buttons (TS0215A)               ║
 * ║  - commandEmergency, panic, arm, disarm event handling                       ║
 * ║                                                                              ║
 * ║  v5.5.371: Enhanced physical button detection                                ║
 * ║  - Multiple event listener patterns for SDK3 compatibility                   ║
 * ║  - Tuya DP fallback for non-ZCL button events                               ║
 * ║                                                                              ║
 * ║  STRUCTURE TS0041:                                                           ║
 * ║  EP1: Button 1 (scenes, onOff, powerCfg, groups, iasZone, iasAce)           ║
 * ║                                                                              ║
 * ║  ACTIONS: single, double, hold                                               ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class Button1GangDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.log('═══════════════════════════════════════════════════════════════');
    this.log('[BUTTON1] 🔘 Button1GangDevice v5.5.376 initializing...');
    this.log('[BUTTON1] FIX: Enhanced detection for "No Action detected" issue');
    this.log('═══════════════════════════════════════════════════════════════');

    // Set button count BEFORE calling super
    this.buttonCount = 1;

    // Log available endpoints for debugging
    const availableEndpoints = Object.keys(zclNode?.endpoints || {});
    this.log(`[BUTTON1] 📡 Available endpoints: ${availableEndpoints.join(', ')}`);

    // Initialize ButtonDevice (handles basic button detection + battery)
    await super.onNodeInit({ zclNode }).catch(err => this.error('[INIT] Error:', err.message));

    // v5.5.371: FORUM FIX - Enhanced physical button detection
    // Based on research from Zigbee2MQTT, ZHA, SmartThings patterns
    await this._setupEnhancedPhysicalButtonDetection(zclNode);

    // v5.5.371: Setup battery reporting listener
    await this._setupBatteryReporting(zclNode);

    this.log('[BUTTON1] ✅ Button1GangDevice initialized - 1 button ready');
    this.log('═══════════════════════════════════════════════════════════════');
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
    this.log('[BUTTON1-PHYSICAL] 🔧 Setting up enhanced physical button detection...');

    const manufacturerName = this.getData()?.manufacturerName || '';
    this.log(`[BUTTON1-PHYSICAL] Manufacturer: ${manufacturerName}`);

    try {
      const endpoint = zclNode?.endpoints?.[1];
      if (!endpoint) {
        this.log('[BUTTON1-PHYSICAL] ⚠️ Endpoint 1 not found');
        return;
      }

      // Map press values to types
      const pressTypeMap = {
        0: 'single',
        1: 'double',
        2: 'long',
        3: 'single',
        4: 'double',
        5: 'long'
      };

      // v5.5.371: SCENES CLUSTER - Multiple event patterns
      const scenesCluster = endpoint.clusters?.scenes || endpoint.clusters?.genScenes || endpoint.clusters?.[5];
      if (scenesCluster && typeof scenesCluster.on === 'function') {
        this.log('[BUTTON1-PHYSICAL] 📡 Setting up enhanced scene listeners...');

        const handleSceneRecall = async (sceneId) => {
          const pressType = pressTypeMap[sceneId] || 'single';
          this.log(`[BUTTON1-SCENE] 🔘 Button 1 ${pressType.toUpperCase()} (scene ${sceneId})`);
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

        this.log('[BUTTON1-PHYSICAL] ✅ Enhanced scene listeners configured');
      }

      // v5.5.371: MULTISTATE INPUT CLUSTER - For Tuya variants
      const multistateCluster = endpoint.clusters?.multistateInput || endpoint.clusters?.genMultistateInput || endpoint.clusters?.[18];
      if (multistateCluster && typeof multistateCluster.on === 'function') {
        this.log('[BUTTON1-PHYSICAL] 📡 Setting up multistateInput listeners...');

        const handleMultistate = async (value) => {
          const pressType = pressTypeMap[value] || 'single';
          this.log(`[BUTTON1-MULTISTATE] 🔘 Button 1 ${pressType.toUpperCase()} (multistate ${value})`);
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

        this.log('[BUTTON1-PHYSICAL] ✅ MultistateInput listeners configured');
      }

      // v5.5.371: ONOFF CLUSTER COMMANDS - For command-based buttons
      const onOffCluster = endpoint.clusters?.onOff || endpoint.clusters?.genOnOff || endpoint.clusters?.[6];
      if (onOffCluster && typeof onOffCluster.on === 'function') {
        this.log('[BUTTON1-PHYSICAL] 📡 Setting up enhanced onOff command listeners...');

        onOffCluster.on('command', async (commandName, commandPayload) => {
          this.log(`[BUTTON1-ONOFF] command: ${commandName}`, commandPayload);

          // v5.5.499: FORUM #936 FIX - HOBEIAN ZG-101ZL command mapping
          // Source: ZHA Blueprint + Zigbee2MQTT documentation
          // In "command" mode (triple-click to switch modes):
          // - toggle = single press
          // - on = double press
          // - off = long press
          const commandMap = {
            'toggle': 'single',
            'setToggle': 'single',
            'on': 'double',
            'setOn': 'double',
            'off': 'long',
            'setOff': 'long'
          };

          const pressType = commandMap[commandName];
          if (pressType) {
            this.log(`[BUTTON1-ONOFF] 🔘 Button 1 ${pressType.toUpperCase()} (${commandName})`);
            await this.triggerButtonPress(1, pressType);
          }
        });

        // v5.5.457: HOBEIAN FIX - Listen for onOff ATTRIBUTE changes (not just commands)
        // HOBEIAN ZG-101ZL uses onOff attribute reports for button presses
        this._lastOnOffState = null;
        this._lastOnOffTime = 0;

        onOffCluster.on('attr.onOff', async (value) => {
          const now = Date.now();
          // Debounce: ignore if same value within 500ms
          if (this._lastOnOffState === value && (now - this._lastOnOffTime) < 500) {
            return;
          }
          this._lastOnOffState = value;
          this._lastOnOffTime = now;

          this.log(`[BUTTON1-ONOFF] 🔘 HOBEIAN attr.onOff change: ${value}`);
          // onOff true = single press, false = can indicate release or double
          await this.triggerButtonPress(1, 'single');
        });

        onOffCluster.on('report', async (attributes) => {
          if (attributes?.onOff !== undefined) {
            const now = Date.now();
            if (this._lastOnOffState === attributes.onOff && (now - this._lastOnOffTime) < 500) {
              return;
            }
            this._lastOnOffState = attributes.onOff;
            this._lastOnOffTime = now;

            this.log(`[BUTTON1-ONOFF] 🔘 HOBEIAN report.onOff: ${attributes.onOff}`);
            await this.triggerButtonPress(1, 'single');
          }
        });

        this.log('[BUTTON1-PHYSICAL] ✅ Enhanced onOff command + attribute listeners configured');
      }

      // v5.5.371: IAS ZONE CLUSTER - For button devices with iasZone
      // v5.5.480: FIX for Cam's issue - debounce IAS Zone to filter keep-alive messages
      // Keep-alive messages occur at regular intervals (30min/1hour) and should not trigger button press
      const iasZoneCluster = endpoint.clusters?.iasZone || endpoint.clusters?.ssIasZone || endpoint.clusters?.[1280];
      if (iasZoneCluster && typeof iasZoneCluster.on === 'function') {
        this.log('[BUTTON1-PHYSICAL] 📡 Setting up IAS Zone listeners with keep-alive filter...');

        // v5.5.480: Track IAS Zone events to filter keep-alive vs real button presses
        this._lastIasZoneTime = 0;
        this._iasZoneDebounceMs = 5000; // 5 second debounce
        this._iasZoneLastStatus = null;

        const handleIasZoneEvent = async (payload, eventName) => {
          const now = Date.now();
          const timeSinceLast = now - this._lastIasZoneTime;
          const zoneStatus = payload?.zoneStatus;

          this.log(`[BUTTON1-IASZONE] ${eventName}: zoneStatus=${zoneStatus}, timeSinceLast=${timeSinceLast}ms`);

          // v5.5.480: Filter keep-alive messages
          // Keep-alive typically sends the SAME status at regular intervals
          // Real button presses have status change or rapid succession
          if (zoneStatus !== undefined && (zoneStatus & 0x01)) {
            // Debounce: ignore if same status within 5 seconds (keep-alive filter)
            if (this._iasZoneLastStatus === zoneStatus && timeSinceLast < this._iasZoneDebounceMs) {
              this.log('[BUTTON1-IASZONE] ⏭️ Debounced (same status within 5s - likely keep-alive)');
              return;
            }

            // v5.5.480: Additional keep-alive detection
            // If message arrives at ~30min or ~60min intervals, it's likely keep-alive
            const isLikelyKeepAlive = (
              (timeSinceLast > 1700000 && timeSinceLast < 1900000) || // ~30 min
              (timeSinceLast > 3500000 && timeSinceLast < 3700000)    // ~60 min
            );

            if (isLikelyKeepAlive && this._iasZoneLastStatus === zoneStatus) {
              this.log('[BUTTON1-IASZONE] 🚫 BLOCKED: Likely keep-alive message (30/60min interval)');
              this._lastIasZoneTime = now;
              return;
            }

            this._lastIasZoneTime = now;
            this._iasZoneLastStatus = zoneStatus;

            this.log('[BUTTON1-IASZONE] 🔘 Button 1 SINGLE (IAS Zone alarm - real press)');
            await this.triggerButtonPress(1, 'single');
          }
        };

        iasZoneCluster.on('zoneStatusChangeNotification', async (payload) => {
          await handleIasZoneEvent(payload, 'zoneStatusChangeNotification');
        });

        iasZoneCluster.on('statusChangeNotification', async (payload) => {
          await handleIasZoneEvent(payload, 'statusChangeNotification');
        });

        this.log('[BUTTON1-PHYSICAL] ✅ IAS Zone listeners configured with keep-alive filter');
      }

      // v5.5.376: IAS ACE CLUSTER - For SOS/Emergency buttons (TS0215A)
      // These buttons use IAS ACE cluster (1281) with commandEmergency
      const iasAceCluster = endpoint.clusters?.iasAce || endpoint.clusters?.ssIasAce || endpoint.clusters?.[1281];
      if (iasAceCluster && typeof iasAceCluster.on === 'function') {
        this.log('[BUTTON1-PHYSICAL] 📡 Setting up IAS ACE listeners (SOS button)...');

        // Emergency command = SOS button press
        iasAceCluster.on('emergency', async (payload) => {
          this.log('[BUTTON1-IASACE] 🆘 EMERGENCY command received:', payload);
          await this.triggerButtonPress(1, 'single');
        });

        iasAceCluster.on('commandEmergency', async (payload) => {
          this.log('[BUTTON1-IASACE] 🆘 commandEmergency received:', payload);
          await this.triggerButtonPress(1, 'single');
        });

        // Panic command = double press on some SOS buttons
        iasAceCluster.on('panic', async (payload) => {
          this.log('[BUTTON1-IASACE] 🆘 PANIC command received:', payload);
          await this.triggerButtonPress(1, 'double');
        });

        // Arm/Disarm commands used by some remote buttons
        iasAceCluster.on('arm', async (payload) => {
          this.log('[BUTTON1-IASACE] 🔒 ARM command:', payload);
          await this.triggerButtonPress(1, 'single');
        });

        iasAceCluster.on('disarm', async (payload) => {
          this.log('[BUTTON1-IASACE] 🔓 DISARM command:', payload);
          await this.triggerButtonPress(1, 'double');
        });

        this.log('[BUTTON1-PHYSICAL] ✅ IAS ACE listeners configured (SOS/Emergency support)');
      }

      // v5.5.371: TUYA DP CLUSTER - For Tuya-specific devices
      await this._setupTuyaDPButtonDetection(zclNode);

      // v5.5.457: HOBEIAN CLUSTER 57345 (0xE001) - Tuya button-specific cluster
      await this._setupHobeianCluster(zclNode);

      this.log('[BUTTON1-PHYSICAL] ✅ Enhanced physical button detection configured');

    } catch (error) {
      this.log('[BUTTON1-PHYSICAL] ❌ Setup error:', error.message);
    }
  }

  /**
   * v5.5.457: HOBEIAN cluster 57345 (0xE001) support
   * HOBEIAN ZG-101ZL uses this Tuya-specific cluster for button events
   */
  async _setupHobeianCluster(zclNode) {
    try {
      const endpoint = zclNode?.endpoints?.[1];
      if (!endpoint) return;

      // Cluster 57345 = 0xE001 - Tuya button event cluster
      const hobeianCluster = endpoint.clusters?.[57345] || endpoint.clusters?.['57345'];

      if (hobeianCluster && typeof hobeianCluster.on === 'function') {
        this.log('[BUTTON1-HOBEIAN] 📡 Setting up HOBEIAN cluster 0xE001 listeners...');

        const pressTypeMap = { 0: 'single', 1: 'double', 2: 'long' };

        // Listen for any events from this cluster
        hobeianCluster.on('report', async (data) => {
          this.log('[BUTTON1-HOBEIAN] 📡 Report:', data);
          const value = data?.value ?? data?.[0] ?? 0;
          const pressType = pressTypeMap[value] || 'single';
          await this.triggerButtonPress(1, pressType);
        });

        hobeianCluster.on('response', async (data) => {
          this.log('[BUTTON1-HOBEIAN] 📡 Response:', data);
          const value = data?.value ?? data?.data ?? 0;
          const pressType = pressTypeMap[value] || 'single';
          await this.triggerButtonPress(1, pressType);
        });

        // Generic command listener
        hobeianCluster.on('command', async (commandName, payload) => {
          this.log(`[BUTTON1-HOBEIAN] 📡 Command ${commandName}:`, payload);
          await this.triggerButtonPress(1, 'single');
        });

        this.log('[BUTTON1-HOBEIAN] ✅ HOBEIAN cluster 0xE001 listeners configured');
      } else {
        this.log('[BUTTON1-HOBEIAN] ℹ️ Cluster 57345 (0xE001) not found');
      }
    } catch (err) {
      this.log('[BUTTON1-HOBEIAN] ⚠️ Setup error:', err.message);
    }
  }

  /**
   * v5.5.371: Tuya DP button detection for non-ZCL button events
   */
  async _setupTuyaDPButtonDetection(zclNode) {
    try {
      const tuyaCluster = zclNode?.endpoints?.[1]?.clusters?.tuya
        || zclNode?.endpoints?.[1]?.clusters?.manuSpecificTuya
        || zclNode?.endpoints?.[1]?.clusters?.[61184]
        || zclNode?.endpoints?.[1]?.clusters?.['61184']
        || zclNode?.endpoints?.[1]?.clusters?.['0xEF00'];

      if (!tuyaCluster) {
        this.log('[BUTTON1-TUYA-DP] ℹ️ No Tuya cluster found - using ZCL only');
        return;
      }

      this.log('[BUTTON1-TUYA-DP] 🔧 Setting up Tuya DP button detection...');

      if (typeof tuyaCluster.on === 'function') {
        const pressTypeMap = { 0: 'single', 1: 'double', 2: 'long' };

        tuyaCluster.on('response', async (data) => {
          const dp = data?.dp ?? data?.dataPointId ?? data?.dpId;
          const value = data?.data ?? data?.value ?? data?.raw?.[0] ?? 0;

          this.log(`[BUTTON1-TUYA-DP] 📡 DP${dp} = ${value}`, data);

          // DP 1 typically is button 1 press
          if (dp === 1) {
            const pressType = pressTypeMap[value] || 'single';
            this.log(`[BUTTON1-TUYA-DP] 🔘 Button 1 ${pressType.toUpperCase()} (DP${dp}=${value})`);
            await this.triggerButtonPress(1, pressType);
          }
        });

        tuyaCluster.on('report', async (data) => {
          this.log('[BUTTON1-TUYA-DP] 📡 Report event:', data);
          const dp = data?.dp ?? data?.dataPointId ?? data?.dpId;
          const value = data?.data ?? data?.value ?? 0;
          if (dp === 1) {
            const pressType = pressTypeMap[value] || 'single';
            await this.triggerButtonPress(1, pressType);
          }
        });

        tuyaCluster.on('dataReport', async (data) => {
          this.log('[BUTTON1-TUYA-DP] 📡 dataReport event:', data);
          const dp = data?.dp ?? data?.datapoint ?? data?.dpId;
          const value = data?.data?.[0] ?? data?.value ?? 0;
          if (dp === 1) {
            const pressType = pressTypeMap[value] || 'single';
            await this.triggerButtonPress(1, pressType);
          }
        });

        this.log('[BUTTON1-TUYA-DP] ✅ Tuya DP button detection configured');
      }
    } catch (err) {
      this.log('[BUTTON1-TUYA-DP] ⚠️ Setup error:', err.message);
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
        this.log('[BUTTON1-BATTERY] 🔋 Setting up battery reporting...');

        this._powerCluster.on('attr.batteryPercentageRemaining', async (value) => {
          if (value !== undefined && value !== 255 && value !== 0) {
            const battery = Math.round(value / 2);
            this.log(`[BUTTON1-BATTERY] ✅ Battery report: ${battery}%`);
            await this.setCapabilityValue('measure_battery', parseFloat(battery)).catch(() => { });
          }
        });

        this._powerCluster.on('attr.batteryVoltage', async (value) => {
          if (value !== undefined && value > 0) {
            const voltage = value / 10;
            const battery = Math.min(100, Math.max(0, Math.round((voltage - 2.0) * 100)));
            this.log(`[BUTTON1-BATTERY] ✅ Battery from voltage: ${voltage}V → ${battery}%`);
            await this.setCapabilityValue('measure_battery', parseFloat(battery)).catch(() => { });
          }
        });

        this.log('[BUTTON1-BATTERY] ✅ Battery listeners registered');
      }
    } catch (err) {
      this.log('[BUTTON1-BATTERY] ⚠️ Battery setup error:', err.message);
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
            const battery = Math.round(attrs.batteryPercentageRemaining / 2);
            this.log(`[BUTTON1-BATTERY] 📊 Battery read on wake: ${battery}%`);
            await this.setCapabilityValue('measure_battery', parseFloat(battery)).catch(() => { });
          }
        } catch (err) {
          // Expected for sleeping devices
        }
      }, 500);
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
