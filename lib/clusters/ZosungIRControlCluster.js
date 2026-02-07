'use strict';

const { Cluster, ZCLDataTypes } = require('zigbee-clusters');

// ZosungIRControl commands (cluster 0xE004)
const CMD_IR_LEARN = 0x00;       // Start/stop learn mode
const CMD_IR_SEND = 0x02;        // Send IR code

/**
 * v5.8.52: ZosungIRControl cluster (0xE004 / 57348)
 * Extracted from ir_blaster/device.js for early registration at app startup
 * Based on Zigbee2MQTT/ZHA + research from SDK documentation
 */
class ZosungIRControlCluster extends Cluster {
  static get ID() { return 0xE004; } // 57348
  static get NAME() { return 'zosungIRControl'; }

  static get COMMANDS() {
    return {
      IRLearn: {
        id: CMD_IR_LEARN,
        args: {
          onoff: ZCLDataTypes.bool
        }
      },
      IRSend: {
        id: CMD_IR_SEND,
        args: {
          code: ZCLDataTypes.string
        }
      },
      IRCodeQuery: {
        id: 0x03,
        args: {
          codeId: ZCLDataTypes.uint8
        }
      },
      IRProtocolSet: {
        id: 0x04,
        args: {
          protocol: ZCLDataTypes.enum8,  // 0=NEC, 1=RC5, 2=Sony, etc.
          frequency: ZCLDataTypes.uint32
        }
      }
    };
  }

  static get ATTRIBUTES() {
    return {
      lastLearnedIRCode: {
        id: 0x0000,
        type: ZCLDataTypes.string
      },
      learningStatus: {
        id: 0x0001,
        type: ZCLDataTypes.enum8  // 0=idle, 1=learning, 2=success, 3=timeout
      },
      supportedProtocols: {
        id: 0x0002,
        type: ZCLDataTypes.bitmap8  // Bit mask of supported IR protocols
      },
      carrierFrequency: {
        id: 0x0003,
        type: ZCLDataTypes.uint32   // Current carrier frequency (Hz)
      },
      maxCodeLength: {
        id: 0x0004,
        type: ZCLDataTypes.uint16   // Maximum IR code length
      }
    };
  }
}

module.exports = ZosungIRControlCluster;
