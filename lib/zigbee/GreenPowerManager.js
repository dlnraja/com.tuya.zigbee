'use strict';

/**
 * GreenPowerManager - Zigbee Green Power Device Support
 *
 * Zigbee Green Power (ZGP) is a feature for energy-harvesting devices:
 * - No battery required (kinetic/solar energy)
 * - Ultra-low power consumption
 * - Unidirectional communication (GPD → Network)
 *
 * Green Power Devices (GPD) include:
 * - Philips Hue Tap / Friends of Hue switches
 * - Linptech/Tuya self-powered switches
 * - Sunricher ZGP switches
 * - EnOcean-based devices
 *
 * Architecture:
 * - GPD: Green Power Device (the switch itself)
 * - GPP: Green Power Proxy (routes GPD frames to network)
 * - GPS: Green Power Sink (final destination that processes commands)
 *
 * Cluster: Green Power (0x0021)
 *
 * @see https://csa-iot.org/all-solutions/green-power/
 * @see ZGP Specification v1.1.2
 *
 * @version 5.0.7
 * @author Dylan Rajasekaram
 */

const EventEmitter = require('events');

// Green Power Cluster ID
const GP_CLUSTER_ID = 0x0021;

// Green Power Frame Types
const GP_FRAME_TYPES = {
  DATA: 0x00,
  MAINTENANCE: 0x01
};

// Green Power Commands (GPD → GPS)
const GP_COMMANDS = {
  // Generic commands
  IDENTIFY: 0x00,
  RECALL_SCENE_0: 0x10,
  RECALL_SCENE_1: 0x11,
  RECALL_SCENE_2: 0x12,
  RECALL_SCENE_3: 0x13,
  RECALL_SCENE_4: 0x14,
  RECALL_SCENE_5: 0x15,
  RECALL_SCENE_6: 0x16,
  RECALL_SCENE_7: 0x17,
  STORE_SCENE_0: 0x18,
  STORE_SCENE_1: 0x19,
  STORE_SCENE_2: 0x1A,
  STORE_SCENE_3: 0x1B,
  STORE_SCENE_4: 0x1C,
  STORE_SCENE_5: 0x1D,
  STORE_SCENE_6: 0x1E,
  STORE_SCENE_7: 0x1F,

  // On/Off commands
  OFF: 0x20,
  ON: 0x21,
  TOGGLE: 0x22,

  // Level Control
  MOVE_UP: 0x30,
  MOVE_DOWN: 0x31,
  STEP_UP: 0x32,
  STEP_DOWN: 0x33,
  LEVEL_CONTROL_STOP: 0x34,
  MOVE_UP_WITH_ON_OFF: 0x35,
  MOVE_DOWN_WITH_ON_OFF: 0x36,
  STEP_UP_WITH_ON_OFF: 0x37,
  STEP_DOWN_WITH_ON_OFF: 0x38,

  // Color Control
  MOVE_HUE_STOP: 0x40,
  MOVE_HUE_UP: 0x41,
  MOVE_HUE_DOWN: 0x42,
  STEP_HUE_UP: 0x43,
  STEP_HUE_DOWN: 0x44,
  MOVE_SATURATION_STOP: 0x45,
  MOVE_SATURATION_UP: 0x46,
  MOVE_SATURATION_DOWN: 0x47,
  STEP_SATURATION_UP: 0x48,
  STEP_SATURATION_DOWN: 0x49,
  MOVE_COLOR: 0x4A,
  STEP_COLOR: 0x4B,

  // Lock commands
  LOCK: 0x50,
  UNLOCK: 0x51,

  // Attribute reporting
  ATTRIBUTE_REPORTING: 0xA0,
  MANUFACTURER_SPECIFIC: 0xB0,

  // Commissioning
  COMMISSIONING: 0xE0,
  DECOMMISSIONING: 0xE1,
  SUCCESS: 0xE2,
  CHANNEL_REQUEST: 0xE3,
  COMMISSIONING_REPLY: 0xF0,
  CHANNEL_CONFIGURATION: 0xF3
};

// Known Green Power Devices (2024-2026)
const KNOWN_GPD_DEVICES = {
  // Philips Hue
  'Philips': {
    'PTM215Z': { name: 'Friends of Hue Switch', buttons: 4, type: 'switch' },
    'PTM216Z': { name: 'Friends of Hue Switch (2024)', buttons: 4, type: 'switch' },
    'RWL020': { name: 'Hue Dimmer Switch', buttons: 4, type: 'dimmer' },
    'RWL021': { name: 'Hue Dimmer Switch (2021)', buttons: 4, type: 'dimmer' },
    'RWL022': { name: 'Hue Dimmer Switch V2', buttons: 4, type: 'dimmer' },
    'ZGPSWITCH': { name: 'Hue Tap', buttons: 4, type: 'switch' }
  },

  // Tuya/Linptech Green Power (energy harvesting)
  'Tuya': {
    'TS0221': { name: 'Self-Powered Switch 1-Gang', buttons: 1, type: 'switch', greenPower: true },
    'TS0222': { name: 'Self-Powered Switch 2-Gang', buttons: 2, type: 'switch', greenPower: true },
    'TS0223': { name: 'Self-Powered Switch 3-Gang', buttons: 3, type: 'switch', greenPower: true },
    'TS0224': { name: 'Self-Powered Switch 4-Gang', buttons: 4, type: 'switch', greenPower: true }
  },

  // Linptech (Tuya OEM)
  'Linptech': {
    'K9-GP': { name: 'Self-Powered 2-Rocker', buttons: 2, type: 'switch', greenPower: true },
    'K11-GP': { name: 'Self-Powered Scene Switch', buttons: 4, type: 'scene', greenPower: true }
  },

  // Sunricher Green Power
  'Sunricher': {
    'SR-ZGP2801K4-DIM': { name: 'GPD Dimmer Switch', buttons: 4, type: 'dimmer', greenPower: true },
    'SR-ZGP2801K2-DIM': { name: 'GPD 2-Button Dimmer', buttons: 2, type: 'dimmer', greenPower: true },
    'SR-ZGP2801K1': { name: 'GPD 1-Button Switch', buttons: 1, type: 'switch', greenPower: true }
  },

  // Schneider Electric (Wiser)
  'Schneider': {
    'WDE002924': { name: 'Wiser GPD Switch', buttons: 2, type: 'switch', greenPower: true }
  },

  // Legrand
  'Legrand': {
    '067773': { name: 'Céliane GPD Switch', buttons: 2, type: 'switch', greenPower: true }
  },

  // IKEA TRÅDFRI (upcoming Green Power models)
  'IKEA': {
    'E2213': { name: 'RODRET Dimmer (2025)', buttons: 2, type: 'dimmer' },
    'E2214': { name: 'SOMRIG Shortcut Button (2025)', buttons: 2, type: 'switch' }
  }
};

/**
 * GreenPowerManager class
 * Manages Green Power Device (GPD) commissioning and command handling
 */
class GreenPowerManager extends EventEmitter {
  /**
   * Create a GreenPowerManager instance
   * @param {Object} device - Homey device instance
   * @param {Object} options - Configuration options
   */
  constructor(device, options = {}) {
    super();

    this.device = device;
    this.options = {
      autoCommission: true,
      proxyMode: 'combined', // 'basic', 'advanced', 'combined'
      ...options
    };

    this.gpdId = null;
    this.commissioned = false;
    this.securityLevel = 0; // 0=none, 1=deprecated, 2=4-byte, 3=full
    this.lastCommand = null;
    this.lastCommandTime = 0;

    this.device.log('[GREEN-POWER] 🌿 GreenPowerManager initialized');
  }

  /**
   * Check if a device is a Green Power Device
   * @param {Object} deviceInfo - Device information
   * @returns {boolean}
   */
  static isGreenPowerDevice(deviceInfo) {
    const { manufacturerName, modelId } = deviceInfo;

    // Check known GPD manufacturers
    if (KNOWN_GPD_DEVICES[manufacturerName]?.[modelId]) {
      return KNOWN_GPD_DEVICES[manufacturerName][modelId].greenPower === true;
    }

    // Check for GPD indicators in model ID
    if (modelId?.includes('GPD') || modelId?.includes('ZGP') || modelId?.includes('GP')) {
      return true;
    }

    // Check manufacturer name patterns
    if (manufacturerName?.includes('EnOcean') || manufacturerName?.includes('GreenPower')) {
      return true;
    }

    return false;
  }

  /**
   * Get device info from known GPD database
   * @param {string} manufacturerName
   * @param {string} modelId
   * @returns {Object|null}
   */
  static getGPDInfo(manufacturerName, modelId) {
    return KNOWN_GPD_DEVICES[manufacturerName]?.[modelId] || null;
  }

  /**
   * Get all known GPD manufacturers
   * @returns {string[]}
   */
  static getKnownManufacturers() {
    return Object.keys(KNOWN_GPD_DEVICES);
  }

  /**
   * Get all known GPD models for a manufacturer
   * @param {string} manufacturer
   * @returns {Object}
   */
  static getModelsForManufacturer(manufacturer) {
    return KNOWN_GPD_DEVICES[manufacturer] || {};
  }

  /**
   * Handle incoming Green Power Data Frame (GPDF)
   * @param {Object} frame - GPDF frame data
   */
  handleGPDF(frame) {
    try {
      const { gpdId, commandId, payload } = frame;

      this.device.log(`[GREEN-POWER] 📥 GPDF received: GPD=${gpdId}, cmd=0x${commandId.toString(16)}`);

      // Debounce rapid presses (GPD often sends multiple frames)
      const now = Date.now();
      if (commandId === this.lastCommand && now - this.lastCommandTime < 300) {
        this.device.log('[GREEN-POWER] ⏭️  Debounced duplicate frame');
        return;
      }
      this.lastCommand = commandId;
      this.lastCommandTime = now;

      // Translate GPD command to action
      const action = this.translateCommand(commandId, payload);

      if (action) {
        this.device.log(`[GREEN-POWER] 🎯 Action: ${action.type} (${action.scene || action.value || ''})`);
        this.emit('action', action);
      }

    } catch (err) {
      this.device.error('[GREEN-POWER] ❌ GPDF handling error:', err);
    }
  }

  /**
   * Translate GPD command to actionable event
   * @param {number} commandId - GPD command ID
   * @param {Buffer} payload - Command payload
   * @returns {Object|null}
   */
  translateCommand(commandId, payload) {
    switch (commandId) {
    // On/Off
    case GP_COMMANDS.OFF:
      return { type: 'onoff', value: false };
    case GP_COMMANDS.ON:
      return { type: 'onoff', value: true };
    case GP_COMMANDS.TOGGLE:
      return { type: 'toggle' };

      // Scenes
    case GP_COMMANDS.RECALL_SCENE_0:
    case GP_COMMANDS.RECALL_SCENE_1:
    case GP_COMMANDS.RECALL_SCENE_2:
    case GP_COMMANDS.RECALL_SCENE_3:
    case GP_COMMANDS.RECALL_SCENE_4:
    case GP_COMMANDS.RECALL_SCENE_5:
    case GP_COMMANDS.RECALL_SCENE_6:
    case GP_COMMANDS.RECALL_SCENE_7:
      const sceneId = commandId - GP_COMMANDS.RECALL_SCENE_0;
      return { type: 'scene', scene: sceneId };

      // Level Control
    case GP_COMMANDS.MOVE_UP:
    case GP_COMMANDS.MOVE_UP_WITH_ON_OFF:
      return { type: 'dim', direction: 'up', mode: 'move' };
    case GP_COMMANDS.MOVE_DOWN:
    case GP_COMMANDS.MOVE_DOWN_WITH_ON_OFF:
      return { type: 'dim', direction: 'down', mode: 'move' };
    case GP_COMMANDS.STEP_UP:
    case GP_COMMANDS.STEP_UP_WITH_ON_OFF:
      return { type: 'dim', direction: 'up', mode: 'step' };
    case GP_COMMANDS.STEP_DOWN:
    case GP_COMMANDS.STEP_DOWN_WITH_ON_OFF:
      return { type: 'dim', direction: 'down', mode: 'step' };
    case GP_COMMANDS.LEVEL_CONTROL_STOP:
      return { type: 'dim', direction: 'stop' };

      // Lock
    case GP_COMMANDS.LOCK:
      return { type: 'lock', value: true };
    case GP_COMMANDS.UNLOCK:
      return { type: 'lock', value: false };

      // Commissioning
    case GP_COMMANDS.COMMISSIONING:
      this.device.log('[GREEN-POWER] 🔑 Commissioning request received');
      return { type: 'commission' };
    case GP_COMMANDS.DECOMMISSIONING:
      this.device.log('[GREEN-POWER] 🔓 Decommissioning request received');
      return { type: 'decommission' };

    default:
      this.device.log(`[GREEN-POWER] ❓ Unknown command: 0x${commandId.toString(16)}`);
      return { type: 'unknown', commandId };
    }
  }

  /**
   * Trigger Homey flow from GPD action
   * @param {Object} action - Translated action
   */
  async triggerFlow(action) {
    try {
      const triggerCard = this.device.homey.flow.getDeviceTriggerCard('green_power_action');

      if (!triggerCard) {
        this.device.error('[GREEN-POWER] ❌ Flow card "green_power_action" not found');
        return;
      }

      await triggerCard.trigger(this.device, {}, {
        action_type: action.type,
        scene: action.scene || 0,
        direction: action.direction || '',
        value: action.value !== undefined ? action.value : null
      });

      this.device.log('[GREEN-POWER] ✅ Flow triggered:', action.type);

    } catch (err) {
      this.device.error('[GREEN-POWER] ❌ Flow trigger error:', err);
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.removeAllListeners();
    this.device.log('[GREEN-POWER] 🔌 GreenPowerManager destroyed');
  }
}

// Export class and constants
module.exports = GreenPowerManager;
module.exports.GP_CLUSTER_ID = GP_CLUSTER_ID;
module.exports.GP_COMMANDS = GP_COMMANDS;
module.exports.KNOWN_GPD_DEVICES = KNOWN_GPD_DEVICES;
