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
          position: ZCLDataTypes.uint32,
          maxlen: ZCLDataTypes.uint8
        }
      },
      // v5.9.14: Z2M zosungSendIRCode03
      // WHY(P3063): Z2M wire = msgpart OCTET_STR (u8 length prefix) + msgpartcrc u8.
      // The old `buffer` (no prefix, CRC glued inside) made TX chunks malformed and
      // left the length byte inside learned chunks (CRC mismatch on RX).
      codeDataResponse: {
        id: 0x03,
        args: {
          zero: ZCLDataTypes.uint8,
          seq: ZCLDataTypes.uint16,
          position: ZCLDataTypes.uint32,
          msgpart: ZCLDataTypes.buffer8,
          msgpartcrc: ZCLDataTypes.uint8
        }
      },
      doneSending: {
        id: 0x04,
        args: {
          zero0: ZCLDataTypes.uint8,
          seq: ZCLDataTypes.uint16,
          zero1: ZCLDataTypes.uint16
        }
      },
      doneReceiving: {
        id: 0x05,
        args: {
          seq: ZCLDataTypes.uint16,
          zero: ZCLDataTypes.uint16
        }
      }
    };
  }

  // WHY(P3063): frames the device sends server→client (learned Code03Resp / Code05Resp,
  // plus any echo) are dispatched by zigbee-clusters to Cluster.on<Command>() handlers —
  // without these the frame was rejected (unknown_command_received) and the
  // cluster.on('codeDataResponse' | 'doneReceiving') listeners never fired.
  _zosungEmit(name, args) {
    try { this.emit(name, args || {}); } catch (e) { /* listener errors must not NAK the frame */ }
  }

  onStartTransmit(args) { this._zosungEmit('startTransmit', args); }

  onStartTransmitAck(args) { this._zosungEmit('startTransmitAck', args); }

  onCodeDataRequest(args) { this._zosungEmit('codeDataRequest', args); }

  onCodeDataResponse(args) { this._zosungEmit('codeDataResponse', args); }

  onDoneSending(args) { this._zosungEmit('doneSending', args); }

  onDoneReceiving(args) { this._zosungEmit('doneReceiving', args); }
}

module.exports = ZosungIRTransmitCluster;
