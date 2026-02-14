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
      // v5.9.14: Z2M-compatible zosungSendIRCode00
      startTransmit: {
        id: 0x00,
        args: {
          seq: ZCLDataTypes.uint16,
          length: ZCLDataTypes.uint32,
          unk1: ZCLDataTypes.uint32,
          unk2: ZCLDataTypes.uint16,
          unk3: ZCLDataTypes.uint8,
          cmd: ZCLDataTypes.uint8,
          unk4: ZCLDataTypes.uint16
        }
      },
      // v5.9.14: Z2M zosungSendIRCode01
      startTransmitAck: {
        id: 0x01,
        args: {
          zero: ZCLDataTypes.uint8,
          seq: ZCLDataTypes.uint16,
          length: ZCLDataTypes.uint32,
          unk1: ZCLDataTypes.uint32,
          unk2: ZCLDataTypes.uint16,
          unk3: ZCLDataTypes.uint8,
          cmd: ZCLDataTypes.uint8,
          unk4: ZCLDataTypes.uint16
        }
      },
      // v5.9.14: Z2M zosungSendIRCode02
      codeDataRequest: {
        id: 0x02,
        args: {
          seq: ZCLDataTypes.uint16,
          position: ZCLDataTypes.uint16,
          maxlen: ZCLDataTypes.uint8
        }
      },
      // v5.9.14: Z2M zosungSendIRCode03
      codeDataResponse: {
        id: 0x03,
        args: {
          zero: ZCLDataTypes.uint8,
          seq: ZCLDataTypes.uint16,
          position: ZCLDataTypes.uint16,
          msgpart: ZCLDataTypes.buffer,
          msgpartcrc: ZCLDataTypes.uint8
        }
      },
      doneSending: {
        id: 0x04,
        args: {
          zero0: ZCLDataTypes.uint8,
          seq: ZCLDataTypes.uint16,
          zero1: ZCLDataTypes.uint8
        }
      },
      doneReceiving: {
        id: 0x05,
        args: {
          seq: ZCLDataTypes.uint16,
          zero: ZCLDataTypes.uint8
        }
      }
    };
  }
}

module.exports = ZosungIRTransmitCluster;
