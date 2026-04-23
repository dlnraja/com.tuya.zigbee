'use strict';

/**
 * TuyaTimeSyncHandler v1.2.0 - Stabilized & Exhaustive
 * 
 * Centralized handler for Tuya Cluster 0xEF00 Command 0x24 (TUYA_MCU_SYNC_TIME).
 * Supports all known Tuya and Zigbee time formats.
 * 
 * Formats:
 * 1. ZCL-8 (8 bytes): [UTC:4BE][Local:4BE] - Epoch 2000 or 1970
 * 2. ZCL-10 (10 bytes): [Seq:2BE][UTC:4BE][Local:4BE] - Standard for Cmd 0x24
 * 3. ZCL-5 (5 bytes): [UTC:4BE][Weekday:1] - Minimal LCD sensors
 * 4. MCU-7 (7 bytes): [YY, MM, DD, HH, MM, SS, Weekday]
 * 5. MCU-9 (9 bytes): [Type:1, Len:1, YY, MM, DD, HH, MM, SS, Weekday] - Headered MCU
 */

const { CLUSTERS } = require('../constants/ZigbeeConstants.js');

class TuyaTimeSyncHandler {
  static get CLUSTER_ID() { return CLUSTERS.TUYA_EF00 || 0xEF00; }
  static get COMMAND_TIME_SYNC() { return 0x24; }
  
  // Zigbee Epoch offset (Sec between 1970-01-01 and 2000-01-01)
  static get ZIGBEE_EPOCH_OFFSET() { return 946684800; }

  /**
   * Generates the time payload based on requested format.
   */
  static generatePayload(homey, options = {}) {
    const {
      format = 'ZCL-10', 
      baseYear = 1970,   
      sequenceNumber = 0
    } = options;

    const useBase2000 = baseYear === 2000;
    const now = new Date();
    
    let nowSeconds = Math.floor(now.getTime() / 1000);
    if (useBase2000) {
      nowSeconds -= this.ZIGBEE_EPOCH_OFFSET;
    }

    let localOffset = 0;
    try {
      if (homey.clock && typeof homey.clock.getTimezone === 'function') {
        const tz = homey.clock.getTimezone();
        const tzDate = new Date().toLocaleString('en-US', { timeZone: tz });
        const offsetMs = new Date(tzDate).getTime() - now.getTime();
        localOffset = Math.round(offsetMs / 1000) | 0;
      } else {
        localOffset = (-now.getTimezoneOffset() * 60) | 0;
      }
    } catch (e) {
      localOffset = (-now.getTimezoneOffset() * 60) | 0;
    }

    const localTime = (nowSeconds + localOffset) >>> 0;
    const weekday = now.getDay() === 0 ? 7 : now.getDay();

    // v1.2.0: Comprehensive format switch
    switch (format.toUpperCase()) {
      case 'MCU-7':
        return Buffer.from([
          now.getFullYear() - 2000,
          now.getMonth() + 1,
          now.getDate(),
          now.getHours(),
          now.getMinutes(),
          now.getSeconds(),
          weekday
        ]);

      case 'MCU-9':
        return Buffer.from([
          0x00, 0x07, // Header ? Buffer.from([
          0x00, 0x07, // Header : Type 0, Length 7
          now.getFullYear() - 2000,
          now.getMonth() + 1,
          now.getDate(),
          now.getHours(),
          now.getMinutes(),
          now.getSeconds(),
          weekday
        ]);

      case 'ZCL-5':
        const b5 = Buffer.alloc(5);
        b5.writeUInt32BE(nowSeconds, 0);
        b5.writeUInt8(weekday, 4);
        return b5;

      case 'ZCL-8':
        const b8 = Buffer.alloc(8);
        b8.writeUInt32BE(nowSeconds, 0);   // UTC
        b8.writeUInt32BE(localTime, 4);    // Local
        return b8;

      case 'ZCL-10':
      default:
        const b10 = Buffer.alloc(10);
        b10.writeUInt16BE(sequenceNumber, 0); // Seq
        b10.writeUInt32BE(nowSeconds, 2);     // UTC
        b10.writeUInt32BE(localTime, 6);      // Local
        return b10;
    }
  }

  /**
   * Responds to a time sync request with intelligent format detection.
   */
  static async handleRequest(device, request = {}) {
    try {
      const mfr = (device.getSetting('zb_manufacturer_name') || '').toLowerCase();
      const payloadSize = request.payloadSize || 0;
      
      // Intelligent Defaults based on manufacturer and size
      let format = 'ZCL-10';
      let baseYear = 1970;

      if (mfr.includes('_tze284_') || mfr.includes('_tze204_')) {
        baseYear = 2000;
        format = 'ZCL-8'; // Many LCD sensors prefer 8-byte
      }

      // v1.2.0: Payload size based overrides
      if (payloadSize === 7) format = 'MCU-7';
      if (payloadSize === 9) format = 'MCU-9';
      if (payloadSize === 5) format = 'ZCL-5';
      if (payloadSize === 10) format = 'ZCL-10';

      const options = {
        sequenceNumber: request.sequenceNumber || 0,
        baseYear: baseYear,
        format: format
      };

      const payload = this.generatePayload(device.homey, options);
      const node = device.zclNode || device._zclNode;
      const endpoint = node?.endpoints?.[1] || node?.endpoints?.[Object.keys(node.endpoints)[0]];
      const tuyaCluster = endpoint?.clusters?.tuya || endpoint?.clusters?.manuSpecificTuya;
      
      if (!tuyaCluster) {
        throw new Error('Tuya cluster not found');
      }

      // Silent Shadow Response
      if (typeof tuyaCluster.mcuSyncTime === 'function') {
        await tuyaCluster.mcuSyncTime({
          payloadSize: payload.length,
          payload: payload
        });
      } else {
        await tuyaCluster.datapoint({ 
          dp: this.COMMAND_TIME_SYNC, 
          datatype: 0, 
          data: payload 
        });
      }

      device.log(`[TimeSync] Auto-Responding to ${mfr}: Format=${format}, Base=${baseYear}, Size=${payload.length}`);
      return true;
    } catch (err) {
      device.error('[TimeSync] Error:', err.message);
      return false;
    }
  }
}

module.exports = TuyaTimeSyncHandler;



