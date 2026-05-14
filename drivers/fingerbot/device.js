'use strict';

const { Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/clusters/TuyaSpecificCluster');
const TuyaOnOffCluster = require('../../lib/clusters/TuyaOnOffCluster');
const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const TuyaTimeSyncManager = require('../../lib/tuya/TuyaTimeSyncManager');
const { V1_FINGER_BOT_DATA_POINTS } = require('../../lib/tuya/TuyaDataPointsJohan');

Cluster.addCluster(TuyaSpecificCluster);
Cluster.addCluster(TuyaOnOffCluster);

const MODE = {
  click: 0,
  switch: 1,
  program: 2,
};

const DEFAULT_MODE = 'click';
const LOCAL_PRESS_SUPPRESS_MS = 2000;
const LOCAL_REPORT_IGNORE_MS = 3500;
const LOCAL_UI_RESET_DELAY_MS = 100;
const REMOTE_PRESS_DEBOUNCE_MS = 800;
const MOMENTARY_GUI_PULSE_MS = 700;

/**
 * FingerBot - Refactored for TuyaZigbeeDevice architecture
 * v6.2.0: Antigravity Hardened
 * - Inherits from TuyaZigbeeDevice for centralized management
 * - Integrates TuyaTimeSyncManager for standardized time synchronization
 * - Integrates SmartBatteryManager for intelligent battery reporting
 * - Uses TuyaUniversalBridge for DP communication
 */
class FingerBot extends TuyaZigbeeDevice {

  async onNodeInit() {
    await super.onNodeInit();

    this.log('Initializing FingerBot (v6.2.0)...');

    // --- State Initialization ---
    this._suppressUntil = 0;
    this._ignoreOnOffReportsUntil = 0;
    this._lastRemotePressAt = 0;
    this._guiPulseTimeout = null;

    // --- Manager Integration ---
    // Initialize Time Sync Manager
    this.timeSyncManager = new TuyaTimeSyncManager(this);
    await this.timeSyncManager.initialize(this.zclNode);

    // --- Tuya Cluster Setup ---
    // Setup listener for manufacturer-specific Tuya cluster (0xEF00)
    this._setupTuyaClusterListener();

    // --- Capability Listeners ---
    this._registerCapabilities();

    // --- Attribute Listeners ---
    this._registerAttributeListeners();

    // --- Initialization ---
    // Apply current settings once on init
    await this.applyConfiguredSettings({ includeMode: true });

    this.log('FingerBot initialization complete.');
  }

  /**
   * Setup listener for Tuya manufacturer cluster (0xEF00)
   */
  _setupTuyaClusterListener() {
    const endpoint = this.zclNode?.endpoints?.[1];
    const tuyaCluster = endpoint?.clusters?.tuya 
      || endpoint?.clusters?.manuSpecificTuya 
      || endpoint?.clusters?.tuyaSpecific
      || endpoint?.clusters?.[0xEF00]
      || endpoint?.clusters?.[61184];

    if (tuyaCluster) {
      this.log('✅ Tuya cluster detected, registering DP listeners');
      
      const handleData = async (data) => {
        if (data && data.dp !== undefined) {
          await this.onTuyaDataPoint(data.dp, data.value || data.data);
          
          // Also forward to Universal Bridge for flow card support
          if (this._universalBridge) {
            // Map Zigbee-Cluster types to Tuya DP types (simplified)
            let dpType = 0; // Raw
            if (typeof (data.value || data.data) === 'boolean') dpType = 1;
            else if (typeof (data.value || data.data) === 'number') dpType = 2; // Value or Enum
            
            this._universalBridge.onDP(data.dp, data.value || data.data, dpType);
          }
        }
      };

      tuyaCluster.on('dataReport', handleData);
      tuyaCluster.on('reporting', handleData);
      tuyaCluster.on('datapoint', handleData);
    } else {
      this.error('❌ Tuya cluster NOT found! Fingerbot features may be limited.');
    }
  }

  /**
   * Register Homey capability listeners
   */
  _registerCapabilities() {
    if (this.hasCapability('onoff')) {
      this.registerCapabilityListener('onoff', async (value) => {
        this.log('FingerBot onoff triggered:', value);

        const mode = this._getConfiguredMode();

        if (mode === 'click') {
          // In click mode only "true" should trigger a physical press.
          if (value !== true) return;
          await this.triggerPush();
          return;
        }

        // In switch/program mode, use ZCL OnOff cluster
        try {
          const onOffCluster = this.zclNode?.endpoints?.[1]?.clusters?.onOff;
          if (onOffCluster) {
            if (value) await onOffCluster.setOn();
            else await onOffCluster.setOff();
          } else {
            // Fallback to DP1 via bridge
            await this.writeBool(V1_FINGER_BOT_DATA_POINTS.onOff || 1, value);
          }
        } catch (err) {
          this.error(`Failed to set FingerBot onoff (${value})`, err);
          throw err;
        }
      });
    }

    if (this.hasCapability('button.push')) {
      this.registerCapabilityListener('button.push', async () => {
        this.log('FingerBot button.push triggered');
        await this.triggerPush();
      });
    }

    if (this.hasCapability('finger_bot_mode')) {
      this.registerCapabilityListener('finger_bot_mode', async (value) => {
        this.log(`FingerBot mode change requested: ${value}`);
        const modeEnum = MODE[value] !== undefined ? MODE[value] : 0;
        await this.writeEnum(V1_FINGER_BOT_DATA_POINTS.mode || 101, modeEnum).catch(() => {});
      });
    }
  }

  /**
   * Register ZCL attribute listeners (Standard OnOff)
   */
  _registerAttributeListeners() {
    const onOffCluster = this.zclNode?.endpoints?.[1]?.clusters?.onOff;
    if (onOffCluster) {
      onOffCluster.on('attr.onOff', (value) => {
        const now = Date.now();
        const mode = this._getConfiguredMode();

        if (mode === 'click') {
          if (now < this._ignoreOnOffReportsUntil) return;
          if (now - this._lastRemotePressAt < REMOTE_PRESS_DEBOUNCE_MS) return;

          this._lastRemotePressAt = now;
          this.log('Remote FingerBot press detected (OnOff report)');

          this._pulseMomentaryGui();
          this.triggerFlowCard('fingerbot_button_pressed').catch(() => {});
          return;
        }

        this.safeSetCapabilityValue('onoff', value).catch(() => {});
      });
    }
  }

  /**
   * Handle incoming Tuya DataPoints
   */
  async onTuyaDataPoint(dpId, value) {
    this.log(`FingerBot DP ${dpId} report:`, value);

    // 1. Let SmartManagers (Battery/Energy) handle it first
    if (await this.handleSmartDP(dpId, value)) {
      // If it was a battery report, check for low battery trigger
      if (dpId === V1_FINGER_BOT_DATA_POINTS.battery || dpId === 105) {
        if (typeof value === 'number' && value <= 20) {
          this.triggerFlowCard('fingerbot_battery_low').catch(() => {});
        }
      }
      return;
    }

    // 2. Fingerbot-specific DP handling
    switch (dpId) {
      case V1_FINGER_BOT_DATA_POINTS.onOff:
        if (this._getConfiguredMode() !== 'click') {
          const previousValue = this.getCapabilityValue('onoff');
          await this.safeSetCapabilityValue('onoff', !!value).catch(() => {});
          
          if (previousValue !== !!value) {
            this.triggerFlowCard(value ? 'fingerbot_turned_on' : 'fingerbot_turned_off').catch(() => {});
          }
        }
        break;

      case V1_FINGER_BOT_DATA_POINTS.mode:
        const modes = ['click', 'switch', 'program'];
        const modeString = modes[value] || 'click';
        if (this.hasCapability('finger_bot_mode')) {
          this.safeSetCapabilityValue('finger_bot_mode', modeString).catch(() => {});
        }
        break;

      case V1_FINGER_BOT_DATA_POINTS.battery:
        // Already handled by SmartBatteryManager via handleSmartDP
        break;

      // Other DPs (lowerLimit, upperLimit, etc.) are usually for settings,
      // but we log them for diagnostics.
      default:
        this.log(`Diagnostic: Fingerbot reported DP${dpId} = ${value}`);
    }
  }

  /**
   * Trigger a physical press (Click mode)
   */
  async triggerPush() {
    if (Date.now() < this._suppressUntil) return;

    this._suppressUntil = Date.now() + LOCAL_PRESS_SUPPRESS_MS;
    this._ignoreOnOffReportsUntil = Date.now() + LOCAL_REPORT_IGNORE_MS;

    try {
      // Force click mode if necessary before pressing
      if (this._getConfiguredMode() !== 'click') {
        await this.writeEnum(V1_FINGER_BOT_DATA_POINTS.mode || 101, MODE.click);
      }

      const onOffCluster = this.zclNode?.endpoints?.[1]?.clusters?.onOff;
      if (onOffCluster) {
        await onOffCluster.setOn();
      } else {
        await this.writeBool(V1_FINGER_BOT_DATA_POINTS.onOff || 1, true);
      }

      this.triggerFlowCard('fingerbot_button_pressed').catch(() => {});

      // Reset GUI state for click feedback
      this.homey.setTimeout(() => {
        this.safeSetCapabilityValue('onoff', false).catch(() => {});
      }, LOCAL_UI_RESET_DELAY_MS);
    } catch (err) {
      this.error('Failed to trigger FingerBot press', err);
      throw err;
    }
  }

  _pulseMomentaryGui() {
    this.safeSetCapabilityValue('onoff', true).catch(() => {});
    if (this._guiPulseTimeout) this.homey.clearTimeout(this._guiPulseTimeout);
    this._guiPulseTimeout = this.homey.setTimeout(() => {
      this.safeSetCapabilityValue('onoff', false).catch(() => {});
    }, MOMENTARY_GUI_PULSE_MS);
  }

  async applyConfiguredSettings({ includeMode = false } = {}) {
    try {
      if (includeMode) {
        await this.writeEnum(V1_FINGER_BOT_DATA_POINTS.mode || 101, MODE[this._getConfiguredMode()]);
      }
      
      const lowerLimit = this.getSetting('lower_limit');
      if (lowerLimit !== undefined) await this.writeData32(V1_FINGER_BOT_DATA_POINTS.lowerLimit || 102, lowerLimit);
      
      const upperLimit = this.getSetting('upper_limit');
      if (upperLimit !== undefined) await this.writeData32(V1_FINGER_BOT_DATA_POINTS.upperLimit || 106, upperLimit);
      
      const sustainTime = this.getSetting('sustain_time');
      if (sustainTime !== undefined) await this.writeData32(V1_FINGER_BOT_DATA_POINTS.delay || 103, sustainTime);
      
      const reverse = this.getSetting('reverse_direction');
      if (reverse !== undefined) await this.writeBool(V1_FINGER_BOT_DATA_POINTS.reverse || 104, reverse);
      
    } catch (err) {
      this.error('Failed to apply settings:', err);
    }
  }

  async onSettings({ newSettings, changedKeys }) {
    for (const key of changedKeys) {
      switch (key) {
        case 'fingerbot_mode':
          await this.writeEnum(V1_FINGER_BOT_DATA_POINTS.mode || 101, MODE[this._normalizeMode(newSettings.fingerbot_mode)]);
          break;
        case 'lower_limit':
          await this.writeData32(V1_FINGER_BOT_DATA_POINTS.lowerLimit || 102, newSettings.lower_limit);
          break;
        case 'upper_limit':
          await this.writeData32(V1_FINGER_BOT_DATA_POINTS.upperLimit || 106, newSettings.upper_limit);
          break;
        case 'sustain_time':
          await this.writeData32(V1_FINGER_BOT_DATA_POINTS.delay || 103, newSettings.sustain_time);
          break;
        case 'reverse_direction':
          await this.writeBool(V1_FINGER_BOT_DATA_POINTS.reverse || 104, newSettings.reverse_direction);
          break;
      }
    }
  }

  _getConfiguredMode() {
    return this._normalizeMode(this.getSetting('fingerbot_mode'));
  }

  _normalizeMode(mode) {
    if (mode === 'switch' || mode === 'program') return mode;
    return DEFAULT_MODE;
  }

  // --- DP Writing Helpers (via Universal Bridge) ---
  
  async writeEnum(dp, value) {
    if (this._universalBridge) return this._universalBridge.sendDP(dp, value, 'enum');
    return false;
  }

  async writeData32(dp, value) {
    if (this._universalBridge) return this._universalBridge.sendDP(dp, value, 'value');
    return false;
  }

  async writeBool(dp, value) {
    if (this._universalBridge) return this._universalBridge.sendDP(dp, value, 'bool');
    return false;
  }

  onDeleted() {
    if (this._guiPulseTimeout) this.homey.clearTimeout(this._guiPulseTimeout);
    if (this.timeSyncManager) this.timeSyncManager.cleanup();
    super.onDeleted();
  }
}

module.exports = FingerBot;
