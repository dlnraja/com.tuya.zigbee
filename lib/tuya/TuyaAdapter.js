'use strict';

/**
 * TuyaAdapter - Universal Tuya EF00 send adapter
 * Handles multiple API variations across Homey SDK versions
 * Feature-detects available methods and uses appropriate fallback
 */
class TuyaAdapter {

  /**
   * Send Tuya frame with automatic method detection
   * @param {Object} ctx - Device context (for logging)
   * @param {Object} tuyaCluster - Tuya cluster object
   * @param {Buffer|Object} frame - Frame data to send
   * @returns {Promise} Send result
   */
  static async send(ctx, tuyaCluster, frame) {
    if (!tuyaCluster) {
      const err = new Error('TuyaAdapter: no tuyaCluster provided');
      ctx?.error?.(err.message);
      throw err;
    }

    // Try methods in order of preference
    const methods = [
      { name: 'sendFrame', fn: tuyaCluster.sendFrame },
      { name: 'dataRequest', fn: tuyaCluster.dataRequest },
      { name: 'setDataValue', fn: tuyaCluster.setDataValue },
      { name: 'write', fn: tuyaCluster.write },
    ];

    for (const method of methods) {
      if (typeof method.fn === 'function') {
        try {
          ctx?.log?.(`[TuyaAdapter] Using method: ${method.name}`);
          return await method.fn.call(tuyaCluster, frame);
        } catch (err) {
          ctx?.log?.(`[TuyaAdapter] ${method.name} failed:`, err.message);
          // Try next method
        }
      }
    }

    // No methods worked
    const available = Object.keys(tuyaCluster).filter(k => typeof tuyaCluster[k] === 'function');
    ctx?.error?.('[TuyaAdapter] No compatible send method found!');
    ctx?.error?.('[TuyaAdapter] Available methods:', available.join(', '));

    throw new Error('Tuya cluster has no compatible send method');
  }

  /**
   * Read Tuya DP value
   * @param {Object} ctx - Device context
   * @param {Object} tuyaCluster - Tuya cluster
   * @param {Number} dp - DP number
   * @returns {Promise}
   */
  static async readDP(ctx, tuyaCluster, dp) {
    if (!tuyaCluster) {
      throw new Error('TuyaAdapter: no tuyaCluster provided');
    }

    // Try available read methods
    if (typeof tuyaCluster.getData === 'function') {
      ctx?.log?.(`[TuyaAdapter] Reading DP ${dp} via getData`);
      return await tuyaCluster.getData({ dp });
    }

    if (typeof tuyaCluster.dataQuery === 'function') {
      ctx?.log?.(`[TuyaAdapter] Reading DP ${dp} via dataQuery (new API)`);

      // AUDIT V2 FIX: New API signature uses dpValues array
      // Old: { dp: 101 } ❌
      // New: { dpValues: [{ dp: 101 }] } ✅
      try {
        return await tuyaCluster.dataQuery({
          dpValues: [{ dp }]
        });
      } catch (err) {
        // Fallback: try old API signature
        ctx?.log?.('[TuyaAdapter] New API failed, trying old signature...');
        try {
          return await tuyaCluster.dataQuery({ dp });
        } catch (err2) {
          ctx?.error?.('[TuyaAdapter] Both dataQuery signatures failed:', err.message);
          throw err;
        }
      }
    }

    ctx?.warn?.(`[TuyaAdapter] No read method available for DP ${dp}`);
    return null;
  }
}

module.exports = TuyaAdapter;
