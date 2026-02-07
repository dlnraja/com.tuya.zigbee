'use strict';

const { Cluster, ZCLDataTypes } = require('zigbee-clusters');

/**
 * v5.8.52: ZosungIRTransmit cluster (0xED00 / 60672)
 * Extracted from ir_blaster/device.js for early registration at app startup
 * Advanced protocol implementation from Zigbee2MQTT/ZHA sources
 */
class ZosungIRTransmitCluster extends Cluster {
  static get ID() { return 0xED00; } // 60672
  static get NAME() { return 'zosungIRTransmit'; }

  static get COMMANDS() {
    return {
      startTransmit: {
        id: 0x00,
        args: {
          sequenceNumber: ZCLDataTypes.uint8,
          totalLength: ZCLDataTypes.uint16
        }
      },
      startTransmitAck: {
        id: 0x01,
        args: {
          sequenceNumber: ZCLDataTypes.uint8,
          status: ZCLDataTypes.uint8
        }
      },
      codeDataRequest: {
        id: 0x02,
        args: {
          sequenceNumber: ZCLDataTypes.uint8,
          position: ZCLDataTypes.uint16,
          maxLength: ZCLDataTypes.uint8
        }
      },
      codeDataResponse: {
        id: 0x03,
        args: {
          sequenceNumber: ZCLDataTypes.uint8,
          position: ZCLDataTypes.uint16,
          data: ZCLDataTypes.buffer
        }
      },
      doneSending: {
        id: 0x04,
        args: {
          sequenceNumber: ZCLDataTypes.uint8
        }
      },
      doneReceiving: {
        id: 0x05,
        args: {
          sequenceNumber: ZCLDataTypes.uint8,
          totalLength: ZCLDataTypes.uint16
        }
      }
    };
  }
}

module.exports = ZosungIRTransmitCluster;
