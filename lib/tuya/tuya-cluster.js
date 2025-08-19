'use strict';

/**
 * TuyaCluster - Tuya-specific Zigbee cluster interactions
 */
class TuyaCluster {
  /**
   * Write integer with retry logic
   */
  async writeInteger(endpoint, dp, value) {
    const maxRetries = 2;
    const payload = this.encodeInt(dp, value);
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await endpoint.write('manuSpecificTuya', payload);
      } catch (e) {
        if (this.isTimeout(e) && i === 0) {
          // Retry with jitter
          await this.delay(50 + Math.random() * 70);
        } else {
          throw this.classify(e);
        }
      }
    }
  }

  /**
   * Encode integer for Tuya DP
   */
  encodeInt(dp, value) {
    const buffer = Buffer.alloc(5);
    buffer[0] = dp;
    buffer[1] = 0x02; // Integer type
    buffer[2] = 0x00;
    buffer[3] = 0x04; // Length
    buffer.writeInt32BE(value, 4);
    return buffer;
  }

  /**
   * Check if error is timeout
   */
  isTimeout(error) {
    const msg = error.message?.toLowerCase() || '';
    return msg.includes('timeout') || msg.includes('timed out');
  }

  /**
   * Classify error type
   */
  classify(error) {
    const msg = error.message?.toLowerCase() || '';
    
    if (this.isTimeout(error)) {
      error.type = 'ZigbeeTimeout';
    } else if (msg.includes('unsupported')) {
      error.type = 'Unsupported';
    } else if (msg.includes('range') || msg.includes('payload')) {
      error.type = 'PayloadRange';
    } else {
      error.type = 'Unknown';
    }
    
    return error;
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Read Tuya DP
   */
  async readDp(endpoint, dp) {
    try {
      const result = await endpoint.read('manuSpecificTuya', dp);
      return this.decodeDp(result);
    } catch (e) {
      throw this.classify(e);
    }
  }

  /**
   * Decode DP value
   */
  decodeDp(data) {
    if (!data || data.length < 5) return null;
    
    const dp = data[0];
    const type = data[1];
    const length = data.readUInt16BE(2);
    
    let value;
    switch (type) {
      case 0x01: // Boolean
        value = data[4] === 1;
        break;
      case 0x02: // Integer
        value = data.readInt32BE(4);
        break;
      case 0x03: // String
        value = data.slice(4, 4 + length).toString();
        break;
      default:
        value = data.slice(4, 4 + length);
    }
    
    return { dp, type, value };
  }
}

module.exports = new TuyaCluster();