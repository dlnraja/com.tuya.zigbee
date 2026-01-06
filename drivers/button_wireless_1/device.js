'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║     BUTTON 1 GANG - v5.5.371 ENHANCED FOR TS0041 / TS0042                    ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  v5.5.371: FIX for "No Action detected" diagnostic report                   ║
 * ║  - Added enhanced physical button detection (like button_wireless_4)         ║
 * ║  - Multiple event listener patterns for SDK3 compatibility                   ║
 * ║  - Tuya DP fallback for non-ZCL button events                               ║
 * ║                                                                              ║
 * ║  STRUCTURE TS0041:                                                           ║
 * ║  EP1: Button 1 (scenes, onOff, powerCfg, groups, iasZone)                   ║
 * ║                                                                              ║
 * ║  ACTIONS: single, double, hold                                               ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class Button1GangDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.log('═══════════════════════════════════════════════════════════════');
    this.log('[BUTTON1] 🔘 Button1GangDevice v5.5.371 initializing...');
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
            this.log(`[BUTTON1-ONOFF] 🔘 Button 1 ${pressType.toUpperCase()} (${commandName})`);
            await this.triggerButtonPress(1, pressType);
          }
        });

        this.log('[BUTTON1-PHYSICAL] ✅ Enhanced onOff command listeners configured');
      }

      // v5.5.371: IAS ZONE CLUSTER - For button devices with iasZone
      const iasZoneCluster = endpoint.clusters?.iasZone || endpoint.clusters?.ssIasZone || endpoint.clusters?.[1280];
      if (iasZoneCluster && typeof iasZoneCluster.on === 'function') {
        this.log('[BUTTON1-PHYSICAL] 📡 Setting up IAS Zone listeners...');

        iasZoneCluster.on('zoneStatusChangeNotification', async (payload) => {
          this.log('[BUTTON1-IASZONE] zoneStatusChangeNotification:', payload);
          // Zone status bit 0 = alarm1 (button press)
          if (payload?.zoneStatus & 0x01) {
            this.log('[BUTTON1-IASZONE] 🔘 Button 1 SINGLE (IAS Zone alarm)');
            await this.triggerButtonPress(1, 'single');
          }
        });

        iasZoneCluster.on('statusChangeNotification', async (payload) => {
          this.log('[BUTTON1-IASZONE] statusChangeNotification:', payload);
          if (payload?.zoneStatus & 0x01) {
            await this.triggerButtonPress(1, 'single');
          }
        });

        this.log('[BUTTON1-PHYSICAL] ✅ IAS Zone listeners configured');
      }

      // v5.5.371: TUYA DP CLUSTER - For Tuya-specific devices
      await this._setupTuyaDPButtonDetection(zclNode);

      this.log('[BUTTON1-PHYSICAL] ✅ Enhanced physical button detection configured');

    } catch (error) {
      this.log('[BUTTON1-PHYSICAL] ❌ Setup error:', error.message);
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
            await this.setCapabilityValue('measure_battery', battery).catch(() => { });
          }
        });

        this._powerCluster.on('attr.batteryVoltage', async (value) => {
          if (value !== undefined && value > 0) {
            const voltage = value / 10;
            const battery = Math.min(100, Math.max(0, Math.round((voltage - 2.0) * 100)));
            this.log(`[BUTTON1-BATTERY] ✅ Battery from voltage: ${voltage}V → ${battery}%`);
            await this.setCapabilityValue('measure_battery', battery).catch(() => { });
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
            await this.setCapabilityValue('measure_battery', battery).catch(() => { });
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
