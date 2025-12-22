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

// Cluster ID
const GREEN_POWER_CLUSTER_ID = 0x0021;

// Attribute IDs
const ATTRIBUTES = {
  gppMaxProxyTableEntries: { id: 0x0000, type: ZCLDataTypes.uint8 },
  proxyTableEntries: { id: 0x0001, type: ZCLDataTypes.longOctetStr },
  gppNotificationRetryNumber: { id: 0x0002, type: ZCLDataTypes.uint8 },
  gppNotificationRetryTimer: { id: 0x0003, type: ZCLDataTypes.uint8 },
  gppMaxSearchCounter: { id: 0x0004, type: ZCLDataTypes.uint8 },
  gppBlockedGPDID: { id: 0x0005, type: ZCLDataTypes.longOctetStr },
  gppFunctionality: { id: 0x0006, type: ZCLDataTypes.map24 },
  gppActiveFunctionality: { id: 0x0007, type: ZCLDataTypes.map24 },
  gpSharedSecurityKeyType: { id: 0x0020, type: ZCLDataTypes.map8 },
  gpSharedSecurityKey: { id: 0x0021, type: ZCLDataTypes.securityKey128 },
  gpLinkKey: { id: 0x0022, type: ZCLDataTypes.securityKey128 }
};

// Command IDs (Server → Client, i.e., GPD → GPS)
const COMMANDS = {
  // Notifications (from proxy/GPD)
  gpNotification: {
    id: 0x00,
    args: {
      options: ZCLDataTypes.map16,
      gpdId: ZCLDataTypes.uint32,
      gpdIeee: ZCLDataTypes.EUI64,
      endpoint: ZCLDataTypes.uint8,
      securityFrameCounter: ZCLDataTypes.uint32,
      commandId: ZCLDataTypes.uint8,
      payload: ZCLDataTypes.buffer
    }
  },
  gpPairing: {
    id: 0x01,
    args: {
      options: ZCLDataTypes.map24,
      gpdId: ZCLDataTypes.uint32,
      gpdIeee: ZCLDataTypes.EUI64,
      endpoint: ZCLDataTypes.uint8,
      sinkIeee: ZCLDataTypes.EUI64,
      sinkNwkAddress: ZCLDataTypes.uint16,
      sinkGroupId: ZCLDataTypes.uint16,
      deviceId: ZCLDataTypes.uint8,
      frameCounter: ZCLDataTypes.uint32,
      key: ZCLDataTypes.securityKey128
    }
  },
  gpProxyCommissioningMode: {
    id: 0x02,
    args: {
      options: ZCLDataTypes.map8,
      commissioningWindow: ZCLDataTypes.uint16,
      channel: ZCLDataTypes.uint8
    }
  },
  gpResponse: {
    id: 0x06,
    args: {
      options: ZCLDataTypes.map8,
      tempMaster: ZCLDataTypes.uint16,
      tempMasterTxChannel: ZCLDataTypes.uint8,
      gpdId: ZCLDataTypes.uint32,
      gpdIeee: ZCLDataTypes.EUI64,
      endpoint: ZCLDataTypes.uint8,
      commandId: ZCLDataTypes.uint8,
      payload: ZCLDataTypes.buffer
    }
  },
  gpTranslationTableUpdate: {
    id: 0x07,
    args: {
      options: ZCLDataTypes.map16,
      gpdId: ZCLDataTypes.uint32,
      gpdIeee: ZCLDataTypes.EUI64,
      endpoint: ZCLDataTypes.uint8,
      translations: ZCLDataTypes.buffer
    }
  },
  gpTranslationTableRequest: {
    id: 0x08,
    args: {
      startIndex: ZCLDataTypes.uint8
    }
  },
  gpPairingConfiguration: {
    id: 0x09,
    args: {
      actions: ZCLDataTypes.map8,
      options: ZCLDataTypes.map16,
      gpdId: ZCLDataTypes.uint32,
      gpdIeee: ZCLDataTypes.EUI64,
      endpoint: ZCLDataTypes.uint8,
      deviceId: ZCLDataTypes.uint8,
      groupList: ZCLDataTypes.buffer,
      assignedAlias: ZCLDataTypes.uint16,
      forwardingRadius: ZCLDataTypes.uint8,
      securityOptions: ZCLDataTypes.uint8,
      frameCounter: ZCLDataTypes.uint32,
      key: ZCLDataTypes.securityKey128,
      numPairedEndpoints: ZCLDataTypes.uint8,
      pairedEndpoints: ZCLDataTypes.buffer,
      actions2: ZCLDataTypes.map8,
      sinkType: ZCLDataTypes.uint8,
      sinkAddress: ZCLDataTypes.EUI64,
      sinkGroupId: ZCLDataTypes.uint16
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
