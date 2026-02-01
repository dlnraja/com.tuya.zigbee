'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║     UNIVERSAL DP SENDER - v5.7.21 - Unified Tuya DP Communication           ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Supports ALL protocols with complete fallback chain:                        ║
 * ║  1. TuyaEF00Manager.sendDP() - Preferred method                              ║
 * ║  2. Direct cluster OLD format: { dp, datatype, data }                        ║
 * ║  3. Direct cluster NEW format: { data: completeFrame }                       ║
 * ║  4. setDataValue fallback                                                    ║
 * ║  5. sendData fallback                                                        ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

const DP_TYPES = {
  raw: 0,
  bool: 1,
  value: 2,
  string: 3,
  enum: 4,
  bitmap: 5
};

class UniversalDPSender {
  constructor(device) {
    this.device = device;
    this._commFailures = 0;
    this._lastCommSuccess = 0;
  }

  /**
   * Build data buffer based on type
   */
  _buildDataBuffer(value, dataType) {
    switch (dataType) {
      case 'bool':
        return Buffer.from([value ? 1 : 0]);
      case 'enum':
        return Buffer.from([value & 0xFF]);
      case 'value':
        const buf = Buffer.alloc(4);
        buf.writeInt32BE(value, 0);
        return buf;
      case 'string':
        return Buffer.from(String(value), 'utf8');
      case 'bitmap':
        return Buffer.from([value & 0xFF]);
      case 'raw':
        return Buffer.isBuffer(value) ? value : Buffer.from([value]);
      default:
        return Buffer.from([value & 0xFF]);
    }
  }

  /**
   * Build complete DP frame for NEW format
   */
  _buildCompleteFrame(dpId, dataType, dataBuf) {
    const dt = DP_TYPES[dataType] ?? 2;
    const dataLen = dataBuf.length;
    const seq = Math.floor(Math.random() * 65535);
    const cmd = Buffer.alloc(6 + dataLen);
    cmd.writeUInt16BE(seq, 0);
    cmd[2] = dpId;
    cmd[3] = dt;
    cmd.writeUInt16BE(dataLen, 4);
    dataBuf.copy(cmd, 6);
    return cmd;
  }

  /**
   * Get Tuya cluster from zclNode
   */
  _getTuyaCluster(endpoint = 1) {
    const ep = this.device.zclNode?.endpoints?.[endpoint];
    if (!ep?.clusters) return null;
    
    return ep.clusters.tuya || 
           ep.clusters.manuSpecificTuya || 
           ep.clusters[0xEF00] || 
           ep.clusters['61184'] ||
           ep.clusters[61184];
  }

  /**
   * Universal DP send with complete fallback chain
   * @param {number} dpId - DataPoint ID
   * @param {*} value - Value to send
   * @param {string} dataType - 'bool', 'value', 'enum', 'string', 'raw', 'bitmap'
   * @param {object} options - { endpoint: 1, retries: 3, timeout: 5000 }
   */
  async sendDP(dpId, value, dataType = 'value', options = {}) {
    const { endpoint = 1, retries = 3, timeout = 5000 } = options;
    const log = (msg) => this.device.log?.(`[DP-SEND] ${msg}`) || console.log(`[DP-SEND] ${msg}`);
    const error = (msg) => this.device.error?.(`[DP-SEND] ${msg}`) || console.error(`[DP-SEND] ${msg}`);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        log(`DP${dpId}=${value} (${dataType}) attempt ${attempt}/${retries}`);

        // Method 1: TuyaEF00Manager (preferred)
        if (this.device.tuyaEF00Manager?.sendDP) {
          await this.device.tuyaEF00Manager.sendDP(dpId, value, dataType);
          log(`✅ DP${dpId} sent via TuyaEF00Manager`);
          this._recordSuccess();
          return true;
        }

        // Get Tuya cluster for direct methods
        const tuyaCluster = this._getTuyaCluster(endpoint);
        if (!tuyaCluster) {
          throw new Error('No Tuya cluster available');
        }

        // Build data buffer
        const dataBuf = this._buildDataBuffer(value, dataType);
        const dt = DP_TYPES[dataType] ?? 2;

        // Method 2: OLD format { dp, datatype, data } - v5.5.937 compatible
        if (typeof tuyaCluster.datapoint === 'function') {
          try {
            await tuyaCluster.datapoint({ dp: dpId, datatype: dt, data: dataBuf });
            log(`✅ DP${dpId} sent via datapoint(OLD format)`);
            this._recordSuccess();
            return true;
          } catch (oldErr) {
            log(`⚠️ OLD format failed: ${oldErr.message}`);
          }

          // Method 3: NEW format { data: completeFrame } - v5.5.939+
          try {
            const cmd = this._buildCompleteFrame(dpId, dataType, dataBuf);
            await tuyaCluster.datapoint({ data: cmd });
            log(`✅ DP${dpId} sent via datapoint(NEW format)`);
            this._recordSuccess();
            return true;
          } catch (newErr) {
            log(`⚠️ NEW format failed: ${newErr.message}`);
          }
        }

        // Method 4: setDataValue fallback
        if (typeof tuyaCluster.setDataValue === 'function') {
          try {
            await tuyaCluster.setDataValue({ dp: dpId, datatype: dt, data: dataBuf });
            log(`✅ DP${dpId} sent via setDataValue()`);
            this._recordSuccess();
            return true;
          } catch (sdvErr) {
            log(`⚠️ setDataValue failed: ${sdvErr.message}`);
          }
        }

        // Method 5: sendData fallback
        if (typeof tuyaCluster.sendData === 'function') {
          try {
            await tuyaCluster.sendData({ dp: dpId, value, dataType: dt });
            log(`✅ DP${dpId} sent via sendData()`);
            this._recordSuccess();
            return true;
          } catch (sdErr) {
            log(`⚠️ sendData failed: ${sdErr.message}`);
          }
        }

        throw new Error('All DP send methods failed');

      } catch (err) {
        error(`Attempt ${attempt} failed: ${err.message}`);
        
        if (attempt === retries) {
          this._commFailures++;
          error(`❌ All ${retries} attempts failed for DP${dpId}=${value}`);
          
          // Soft fail for transient issues
          if (err.message?.includes('Timeout') || err.message?.includes('timeout')) {
            log('⚠️ Timeout - command may still execute');
            return false;
          }
          throw err;
        }

        // Exponential backoff
        const delay = Math.min(500 * Math.pow(2, attempt - 1), 3000);
        await new Promise(r => setTimeout(r, delay));
      }
    }
    return false;
  }

  _recordSuccess() {
    this._commFailures = 0;
    this._lastCommSuccess = Date.now();
  }

  get isHealthy() {
    return this._commFailures < 5;
  }
}

/**
 * Mixin to add universal DP sending to any device class
 */
function UniversalDPMixin(Base) {
  return class extends Base {
    _getUniversalDPSender() {
      if (!this._universalDPSender) {
        this._universalDPSender = new UniversalDPSender(this);
      }
      return this._universalDPSender;
    }

    /**
     * Universal DP send - use this instead of custom implementations
     */
    async _sendTuyaDPUniversal(dpId, value, dataType = 'value', options = {}) {
      return this._getUniversalDPSender().sendDP(dpId, value, dataType, options);
    }
  };
}

module.exports = { UniversalDPSender, UniversalDPMixin, DP_TYPES };
