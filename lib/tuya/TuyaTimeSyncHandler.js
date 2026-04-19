'use strict';

/**
 * TuyaTimeSyncHandler v1.1.0
 * 
 * Centralized handler for Tuya Cluster 0xEF00 Command 0x24 (TUYA_MCU_SYNC_TIME).
 * Supports both 1970 (UNIX) and 2000 (Zigbee) epochs.
 * 
 * Formats:
 * 1. ZCL-8 (8 bytes): [UTC:4BE][Local:4BE]
 * 2. ZCL-10 (10 bytes): [Seq:2BE][UTC:4BE][Local:4BE] - Standard for Cmd 0x24
 * 3. MCU-7 (7 bytes): [YY, MM, DD, HH, MM, SS, Weekday]
 */

const { CLUSTERS } = require('../constants/ZigbeeConstants.js');

class TuyaTimeSyncHandler {
  static get CLUSTER_ID() { return CLUSTERS.TUYA_EF00 || 0xEF00; }
  static get COMMAND_TIME_SYNC() { return 0x24; }
  
  // Zigbee Epoch offset (Sec between 1970-01-01 and 2000-01-01)
  static get ZIGBEE_EPOCH_OFFSET() { return 946684800; }

  /**
   * Generates the time payload based on requested format.
   * @param {Homey} homey 
   * @param {Object} options 
   */
  static generatePayload(homey, options = {}) {
    const {
      format = 'ZCL-10', // ZCL-8, ZCL-10, MCU-7
      baseYear = 1970,   // 1970 or 2000
      sequenceNumber = 0
    } = options;

    const useBase2000 = baseYear === 2000;
    
    let nowSeconds = Math.floor(Date.now() / 1000);
    if (useBase2000) {
      nowSeconds -= this.ZIGBEE_EPOCH_OFFSET;
    }

    let localOffset = 0;
    try {
      // Homey SDK3: homey.clock.getTimezone()
      const tz = homey.clock.getTimezone();
      const tzDate = new Date().toLocaleString('en-US', { timeZone: tz });
      const offsetMs = new Date(tzDate).getTime() - new Date().getTime();
      // Ajustez le décodage bit-wise via un sign extend
      localOffset = Math.round(offsetMs / 1000) | 0;
    } catch (e) {
      // Fallback: use local offset from system
      localOffset = (-new Date().getTimezoneOffset() * 60) | 0;
    }

    // Force sign extend for bit-wise consistency
    const localTime = (nowSeconds + localOffset) >>> 0;

    if (format === 'MCU-7') {
      const date = new Date();
      return Buffer.from([
        date.getFullYear() - 2000,
        date.getMonth() + 1,
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
        date.getSeconds(),
        date.getDay() === 0 ? 7 : date.getDay() // 1=Mon, 7=Sun
      ]);
    }

    if (format === 'ZCL-8') {
      const buffer = Buffer.alloc(8);
      buffer.writeUInt32BE(nowSeconds, 0);   // UTC
      buffer.writeUInt32BE(localTime, 4);    // Local
      return buffer;
    }

    // Default: ZCL-10 (Standard for Cmd 0x24)
    const buffer = Buffer.alloc(10);
    buffer.writeUInt16BE(sequenceNumber, 0); // Seq
    buffer.writeUInt32BE(nowSeconds, 2);     // UTC
    buffer.writeUInt32BE(localTime, 6);      // Local
    return buffer;
  }

  /**
   * Responds to a time sync request.
   */
  static async handleRequest(device, request = {}) {
    try {
      const mfr = (device.getSetting('zb_manufacturer_name') || '').toLowerCase();
      const is_TZE284 = mfr.includes('_tze284_');
      
      // Determine options
      const options = {
        sequenceNumber: request.sequenceNumber || 0,
        baseYear: is_TZE284 ? 2000 : 1970,
        format: is_TZE284 ? 'ZCL-8' : 'ZCL-10'
      };

      // v1.1.0: Support for Nedis TRV / LCD sensors that use payloadSize to determine format
      if (request.payloadSize === 7) options.format = 'MCU-7';

      const payload = this.generatePayload(device.homey, options);
      const node = device.zclNode || device._zclNode;
      const tuyaCluster = node?.endpoints?.[1]?.clusters?.tuya;
      
      if (!tuyaCluster) {
        throw new Error('Tuya cluster not found on endpoint 1');
      }

      // Send response via mcuSyncTime command (0x24)
      if (typeof tuyaCluster.mcuSyncTime === 'function') {
        await tuyaCluster.mcuSyncTime({
          payloadSize: payload.length,
          payload: payload
        });
      } else {
        // Fallback to generic datapoint if command not explicitly defined
        await tuyaCluster.datapoint({ 
          dp: this.COMMAND_TIME_SYNC, 
          datatype: 0, // RAW
          data: payload 
        });
      }

      device.log(`[TimeSync]  Time sync sent to ${mfr}: Format=${options.format}, Seq=${options.sequenceNumber}, Base=${options.baseYear}`);
      return true;
    } catch (err) {
      device.error('[TimeSync]  Failed to respond to time sync:', err.message);
      return false;
    }
  }
}

module.exports = TuyaTimeSyncHandler;
