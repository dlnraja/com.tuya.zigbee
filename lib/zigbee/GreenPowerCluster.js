'use strict';

/**
 * GreenPowerCluster - Zigbee Green Power Cluster (0x0021) Implementation
 *
 * This cluster handles Green Power Device (GPD) communication for:
 * - Energy-harvesting switches (kinetic/solar)
 * - Friends of Hue switches
 * - Philips Hue Tap
 * - Linptech/Tuya self-powered switches
 *
 * @see ZGP Specification v1.1.2
 * @see Zigbee Cluster Library (ZCL) Specification
 *
 * Note: This is a custom implementation as zigbee-clusters doesn't include GP natively
 *
 * @version 5.0.7
 * @author Dylan Rajasekaram
 */

const { Cluster, ZCLDataTypes } = require('zigbee-clusters');

const typeOr = (primary, fallback) => ZCLDataTypes[primary] || ZCLDataTypes[fallback] || ZCLDataTypes.buffer;
const GP_ZCL_TYPES = {
  uint8: typeOr('uint8', 'uint8'),
  uint16: typeOr('uint16', 'uint16'),
  uint32: typeOr('uint32', 'uint32'),
  data16: typeOr('data16', 'uint16'),
  map8: typeOr('map8', 'uint8'),
  map16: typeOr('map16', 'uint16'),
  map24: typeOr('map24', 'uint24'),
  buffer: typeOr('buffer', 'string'),
  eui64: typeOr('EUI64', 'buffer'),
  longOctetStr: typeOr('longOctetStr', 'buffer'),
  securityKey128: typeOr('securityKey128', 'buffer'),
};

const GP_DATA_TYPES = {
  eui64: GP_ZCL_TYPES.eui64,
  longOctetStr: GP_ZCL_TYPES.longOctetStr,
  securityKey128: GP_ZCL_TYPES.securityKey128,
};

// Cluster ID
const GREEN_POWER_CLUSTER_ID = 0x0021;

// Attribute IDs
const ATTRIBUTES = {
  gppMaxProxyTableEntries: { id: 0x0000, type: GP_ZCL_TYPES.uint8 },
  proxyTableEntries: { id: 0x0001, type: GP_DATA_TYPES.longOctetStr },
  gppNotificationRetryNumber: { id: 0x0002, type: GP_ZCL_TYPES.uint8 },
  gppNotificationRetryTimer: { id: 0x0003, type: GP_ZCL_TYPES.uint8 },
  gppMaxSearchCounter: { id: 0x0004, type: GP_ZCL_TYPES.uint8 },
  gppBlockedGPDID: { id: 0x0005, type: GP_DATA_TYPES.longOctetStr },
  gppFunctionality: { id: 0x0006, type: GP_ZCL_TYPES.map24 },
  gppActiveFunctionality: { id: 0x0007, type: GP_ZCL_TYPES.map24 },
  gpSharedSecurityKeyType: { id: 0x0020, type: GP_ZCL_TYPES.map8 },
  gpSharedSecurityKey: { id: 0x0021, type: GP_DATA_TYPES.securityKey128 },
  gpLinkKey: { id: 0x0022, type: GP_DATA_TYPES.securityKey128 }
};

// Command IDs (Server → Client, i.e., GPD → GPS)
const COMMANDS = {
  // Notifications (from proxy/GPD)
  gpNotification: {
    id: 0x00,
    args: {
      options: GP_ZCL_TYPES.map16,
      gpdId: GP_ZCL_TYPES.uint32,
      gpdIeee: GP_DATA_TYPES.eui64,
      endpoint: GP_ZCL_TYPES.uint8,
      securityFrameCounter: GP_ZCL_TYPES.uint32,
      commandId: GP_ZCL_TYPES.uint8,
      payload: GP_ZCL_TYPES.buffer
    }
  },
  gpPairing: {
    id: 0x01,
    args: {
      options: GP_ZCL_TYPES.map24,
      gpdId: GP_ZCL_TYPES.uint32,
      gpdIeee: GP_DATA_TYPES.eui64,
      endpoint: GP_ZCL_TYPES.uint8,
      sinkIeee: GP_DATA_TYPES.eui64,
      sinkNwkAddress: GP_ZCL_TYPES.uint16,
      sinkGroupId: GP_ZCL_TYPES.uint16,
      deviceId: GP_ZCL_TYPES.uint8,
      frameCounter: GP_ZCL_TYPES.uint32,
      key: GP_DATA_TYPES.securityKey128
    }
  },
  gpProxyCommissioningMode: {
    id: 0x02,
    args: {
      options: GP_ZCL_TYPES.map8,
      commissioningWindow: GP_ZCL_TYPES.uint16,
      channel: GP_ZCL_TYPES.uint8
    }
  },
  gpResponse: {
    id: 0x06,
    args: {
      options: GP_ZCL_TYPES.map8,
      tempMaster: GP_ZCL_TYPES.uint16,
      tempMasterTxChannel: GP_ZCL_TYPES.uint8,
      gpdId: GP_ZCL_TYPES.uint32,
      gpdIeee: GP_DATA_TYPES.eui64,
      endpoint: GP_ZCL_TYPES.uint8,
      commandId: GP_ZCL_TYPES.uint8,
      payload: GP_ZCL_TYPES.buffer
    }
  },
  gpTranslationTableUpdate: {
    id: 0x07,
    args: {
      options: GP_ZCL_TYPES.map16,
      gpdId: GP_ZCL_TYPES.uint32,
      gpdIeee: GP_DATA_TYPES.eui64,
      endpoint: GP_ZCL_TYPES.uint8,
      translations: GP_ZCL_TYPES.buffer
    }
  },
  gpTranslationTableRequest: {
    id: 0x08,
    args: {
      startIndex: GP_ZCL_TYPES.uint8
    }
  },
  gpPairingConfiguration: {
    id: 0x09,
    args: {
      actions: GP_ZCL_TYPES.map8,
      options: GP_ZCL_TYPES.map16,
      gpdId: GP_ZCL_TYPES.uint32,
      gpdIeee: GP_DATA_TYPES.eui64,
      endpoint: GP_ZCL_TYPES.uint8,
      deviceId: GP_ZCL_TYPES.uint8,
      groupList: GP_ZCL_TYPES.buffer,
      assignedAlias: GP_ZCL_TYPES.uint16,
      forwardingRadius: GP_ZCL_TYPES.uint8,
      securityOptions: GP_ZCL_TYPES.uint8,
      frameCounter: GP_ZCL_TYPES.uint32,
      key: GP_DATA_TYPES.securityKey128,
      numPairedEndpoints: GP_ZCL_TYPES.uint8,
      pairedEndpoints: GP_ZCL_TYPES.buffer,
      actions2: GP_ZCL_TYPES.map8,
      sinkType: GP_ZCL_TYPES.uint8,
      sinkAddress: GP_DATA_TYPES.eui64,
      sinkGroupId: GP_ZCL_TYPES.uint16
    }
  }
};

/**
 * GPD Command Types (from GPD to network)
 */
const GPD_COMMANDS = {
  // Identify
  IDENTIFY: 0x00,

  // Scenes
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

  // On/Off
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

  // Lock
  LOCK: 0x50,
  UNLOCK: 0x51,

  // Commissioning
  COMMISSIONING: 0xE0,
  DECOMMISSIONING: 0xE1,
  SUCCESS: 0xE2,
  CHANNEL_REQUEST: 0xE3,

  // Attribute Reporting
  ATTRIBUTE_REPORTING: 0xA0,

  // Manufacturer Specific
  MANUFACTURER_SPECIFIC: 0xB0
};

/**
 * GreenPowerCluster class
 * Extends Cluster from zigbee-clusters
 */
class GreenPowerCluster extends Cluster {
  static get ID() {
    return GREEN_POWER_CLUSTER_ID;
  }

  static get NAME() {
    return 'greenPower';
  }

  static get ATTRIBUTES() {
    return ATTRIBUTES;
  }

  static get COMMANDS() {
    return COMMANDS;
  }

  /**
   * Handle GP Notification from proxy/GPD
   * @param {Object} payload - Notification payload
   */
  onGpNotification(payload) {
    const { options, gpdId, commandId, payload: cmdPayload } = payload;

    this.log(`[GP] Notification: GPD=0x${gpdId.toString(16)}, cmd=0x${commandId.toString(16)}`);

    // Emit event for handling
    this.emit('gpNotification', {
      gpdId,
      commandId,
      payload: cmdPayload,
      options
    });

    // Translate to action
    const action = this.translateCommand(commandId, cmdPayload);
    if (action) {
      this.emit('gpAction', action);
    }
  }

  /**
   * Translate GPD command to action
   * @param {number} commandId
   * @param {Buffer} payload
   * @returns {Object|null}
   */
  translateCommand(commandId, payload) {
    switch (commandId) {
    case GPD_COMMANDS.OFF:
      return { type: 'onoff', value: false };
    case GPD_COMMANDS.ON:
      return { type: 'onoff', value: true };
    case GPD_COMMANDS.TOGGLE:
      return { type: 'toggle' };
    case GPD_COMMANDS.MOVE_UP:
    case GPD_COMMANDS.MOVE_UP_WITH_ON_OFF:
      return { type: 'dim', direction: 'up' };
    case GPD_COMMANDS.MOVE_DOWN:
    case GPD_COMMANDS.MOVE_DOWN_WITH_ON_OFF:
      return { type: 'dim', direction: 'down' };
    case GPD_COMMANDS.STEP_UP:
    case GPD_COMMANDS.STEP_UP_WITH_ON_OFF:
      return { type: 'step', direction: 'up' };
    case GPD_COMMANDS.STEP_DOWN:
    case GPD_COMMANDS.STEP_DOWN_WITH_ON_OFF:
      return { type: 'step', direction: 'down' };
    case GPD_COMMANDS.LEVEL_CONTROL_STOP:
      return { type: 'stop' };
    default:
      // Scene commands
      if (commandId >= GPD_COMMANDS.RECALL_SCENE_0 && commandId <= GPD_COMMANDS.RECALL_SCENE_7) {
        return { type: 'scene', scene: commandId - GPD_COMMANDS.RECALL_SCENE_0, action: 'recall' };
      }
      if (commandId >= GPD_COMMANDS.STORE_SCENE_0 && commandId <= GPD_COMMANDS.STORE_SCENE_7) {
        return { type: 'scene', scene: commandId - GPD_COMMANDS.STORE_SCENE_0, action: 'store' };
      }
      return null;
    }
  }

  /**
   * Enter commissioning mode for GPD pairing
   * @param {Object} options
   */
  async enterCommissioningMode(options = {}) {
    const {
      window = 180, // seconds
      channel = 0   // 0 = current channel
    } = options;

    await this.gpProxyCommissioningMode({
      options: 0x01, // Enter commissioning mode
      commissioningWindow: window,
      channel
    });

    this.log(`[GP] Entered commissioning mode for ${window}s`);
  }

  /**
   * Exit commissioning mode
   */
  async exitCommissioningMode() {
    await this.gpProxyCommissioningMode({
      options: 0x00, // Exit commissioning mode
      commissioningWindow: 0,
      channel: 0
    });

    this.log('[GP] Exited commissioning mode');
  }
}

// Register cluster
Cluster.addCluster(GreenPowerCluster);

// Export
module.exports = GreenPowerCluster;
module.exports.GPD_COMMANDS = GPD_COMMANDS;
module.exports.GREEN_POWER_CLUSTER_ID = GREEN_POWER_CLUSTER_ID;
