'use strict';

/**
 * TuyaCommandSender - v5.3.16
 *
 * Universal helper for sending commands to Tuya EF00 cluster
 *
 * PROBLEM: The method `tuyaCluster.dataRequest()` doesn't exist in Homey SDK3
 * SOLUTION: Try multiple methods in order of availability
 *
 * This fixes the error:
 * "tuyaCluster.dataRequest is not a function"
 */

class TuyaCommandSender {

  /**
   * Send a command to Tuya cluster using available methods
   *
   * @param {Object} tuyaCluster - The Tuya cluster object
   * @param {Object} device - The device for logging
   * @param {number} commandType - Command type (0x00 = SET, 0x01 = GET)
   * @param {Buffer|Object} payload - The payload to send
   * @returns {Promise<boolean>} - Success status
   */
  static async send(tuyaCluster, device, commandType, payload) {
    if (!tuyaCluster) {
      device?.log?.('[TUYA-CMD] No cluster available');
      return false;
    }

    const methods = [
      // Method 1: command() - Most common in SDK3
      async () => {
        if (typeof tuyaCluster.command === 'function') {
          await tuyaCluster.command(commandType, payload);
          device?.log?.('[TUYA-CMD] ✅ Sent via command()');
          return true;
        }
        return false;
      },

      // Method 2: sendCommand() - Alternative
      async () => {
        if (typeof tuyaCluster.sendCommand === 'function') {
          const cmdName = commandType === 0x00 ? 'setData' : 'getData';
          await tuyaCluster.sendCommand(cmdName, payload);
          device?.log?.(`[TUYA-CMD] ✅ Sent via sendCommand('${cmdName}')`);
          return true;
        }
        return false;
      },

      // Method 3: dataRequest() - Legacy but still used in some clusters
      async () => {
        if (typeof tuyaCluster.dataRequest === 'function') {
          await tuyaCluster.dataRequest(payload);
          device?.log?.('[TUYA-CMD] ✅ Sent via dataRequest()');
          return true;
        }
        return false;
      },

      // Method 4: setDataValue() - Some zigbee-clusters versions
      async () => {
        if (typeof tuyaCluster.setDataValue === 'function') {
          await tuyaCluster.setDataValue(payload);
          device?.log?.('[TUYA-CMD] ✅ Sent via setDataValue()');
          return true;
        }
        return false;
      },

      // Method 5: write() - Raw write
      async () => {
        if (typeof tuyaCluster.write === 'function') {
          await tuyaCluster.write(payload);
          device?.log?.('[TUYA-CMD] ✅ Sent via write()');
          return true;
        }
        return false;
      },

      // Method 6: sendFrame() - Direct frame sending
      async () => {
        if (typeof tuyaCluster.sendFrame === 'function') {
          const frame = Buffer.isBuffer(payload) ? payload :
            Buffer.from(JSON.stringify(payload));
          await tuyaCluster.sendFrame(frame);
          device?.log?.('[TUYA-CMD] ✅ Sent via sendFrame()');
          return true;
        }
        return false;
      }
    ];

    // Try each method until one works
    for (const method of methods) {
      try {
        const success = await method();
        if (success) return true;
      } catch (err) {
        // Continue to next method
        device?.log?.(`[TUYA-CMD] Method failed: ${err.message}`);
      }
    }

    // Log available methods for debugging
    const available = [];
    if (typeof tuyaCluster.command === 'function') available.push('command');
    if (typeof tuyaCluster.sendCommand === 'function') available.push('sendCommand');
    if (typeof tuyaCluster.dataRequest === 'function') available.push('dataRequest');
    if (typeof tuyaCluster.setDataValue === 'function') available.push('setDataValue');
    if (typeof tuyaCluster.write === 'function') available.push('write');
    if (typeof tuyaCluster.sendFrame === 'function') available.push('sendFrame');

    device?.log?.(`[TUYA-CMD] ❌ All methods failed. Available: ${available.join(', ') || 'none'}`);
    return false;
  }

  /**
   * Send a SET DP command
   */
  static async setDP(tuyaCluster, device, dp, dataType, value) {
    const payload = TuyaCommandSender.buildDPPayload(dp, dataType, value);
    return TuyaCommandSender.send(tuyaCluster, device, 0x00, payload);
  }

  /**
   * Send a GET DP command (request value)
   */
  static async getDP(tuyaCluster, device, dp) {
    const payload = { dp, fn: 0, data: Buffer.from([]) };
    return TuyaCommandSender.send(tuyaCluster, device, 0x01, payload);
  }

  /**
   * Send time sync to Tuya device
   */
  static async sendTimeSync(tuyaCluster, device) {
    const now = new Date();
    const utcTime = Math.floor(now.getTime() / 1000);
    const localTime = utcTime + (now.getTimezoneOffset() * -60);

    // Build time payload
    const payload = Buffer.alloc(8);
    payload.writeUInt32BE(utcTime, 0);
    payload.writeUInt32BE(localTime, 4);

    device?.log?.(`[TUYA-CMD] ⏰ Sending time sync: UTC=${utcTime}, Local=${localTime}`);

    // Try DP 0x67 first (most common for time sync)
    const dpPayload = TuyaCommandSender.buildDPPayload(0x67, 0x00, payload);

    let success = await TuyaCommandSender.send(tuyaCluster, device, 0x00, dpPayload);

    if (!success) {
      // Try DP 0x24 (alternative time sync DP)
      const altPayload = TuyaCommandSender.buildDPPayload(0x24, 0x00, payload);
      success = await TuyaCommandSender.send(tuyaCluster, device, 0x00, altPayload);
    }

    return success;
  }

  /**
   * Build DP payload buffer
   */
  static buildDPPayload(dp, dataType, value) {
    let dataBuffer;

    if (Buffer.isBuffer(value)) {
      dataBuffer = value;
    } else if (typeof value === 'boolean') {
      dataBuffer = Buffer.from([value ? 1 : 0]);
    } else if (typeof value === 'number') {
      dataBuffer = Buffer.alloc(4);
      dataBuffer.writeInt32BE(value, 0);
    } else if (typeof value === 'string') {
      dataBuffer = Buffer.from(value, 'utf8');
    } else {
      dataBuffer = Buffer.from([0]);
    }

    // Can return as object (for some cluster implementations)
    // or as raw buffer (for others)
    return {
      dp,
      datatype: dataType,
      data: dataBuffer,
      // Also include dpValues format for compatibility
      dpValues: [{
        dp,
        dataType,
        data: dataBuffer
      }]
    };
  }
}

module.exports = TuyaCommandSender;
