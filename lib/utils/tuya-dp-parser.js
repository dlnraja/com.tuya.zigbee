'use strict';

/**
 * Tuya DP Parser - Parse cluster 0xEF00 data points
 * Handles: Soil sensors, PIR sensors, climate sensors, etc.
 * 
 * Based on: Tuya Zigbee protocol reverse engineering
 */

/**
 * Common Tuya DP IDs (Data Points)
 */
const TUYA_DP_IDS = {
  // Battery & Power
  BATTERY_PERCENTAGE: 15,
  BATTERY_LOW: 14,
  
  // Soil Sensor
  SOIL_MOISTURE: 5,
  SOIL_TEMPERATURE: 3,
  SOIL_HUMIDITY: 1,
  
  // PIR Motion Sensor
  PRESENCE_STATE: 1,
  PRESENCE_SENSITIVITY: 2,
  RADAR_SENSITIVITY: 101,
  ILLUMINANCE_THRESHOLD: 102,
  TARGET_DISTANCE: 9,
  
  // Climate
  TEMPERATURE: 1,
  HUMIDITY: 2,
  
  // Contact Sensor
  CONTACT_STATE: 1,
  
  // General
  SWITCH_STATE: 1,
  MODE: 2
};

/**
 * Tuya DP Data Types
 */
const TUYA_DP_TYPES = {
  RAW: 0x00,
  BOOL: 0x01,
  VALUE: 0x02,
  STRING: 0x03,
  ENUM: 0x04,
  BITMAP: 0x05
};

/**
 * Parse Tuya DP frame from cluster 0xEF00
 * 
 * Frame format:
 * [status(1)] [transid(1)] [dp(1)] [datatype(1)] [fn(2)] [data(n)]
 * 
 * @param {Buffer} data - Raw frame data
 * @returns {Array<Object>} - Parsed DP values: [{ dp, type, value }, ...]
 */
function parseTuyaDPFrame(data) {
  const result = [];
  
  try {
    if (!data || !Buffer.isBuffer(data)) {
      return result;
    }
    
    let offset = 0;
    
    while (offset < data.length) {
      // Need at least 6 bytes for header
      if (offset + 6 > data.length) break;
      
      const status = data.readUInt8(offset);
      const transid = data.readUInt8(offset + 1);
      const dp = data.readUInt8(offset + 2);
      const datatype = data.readUInt8(offset + 3);
      const fn = data.readUInt16BE(offset + 4); // Length of data
      
      offset += 6;
      
      // Validate length
      if (offset + fn > data.length) {
        console.error('[TUYA-DP] Invalid frame length');
        break;
      }
      
      // Extract data
      const dpData = data.slice(offset, offset + fn);
      offset += fn;
      
      // Parse based on type
      let value = null;
      
      switch (datatype) {
      case TUYA_DP_TYPES.BOOL:
        value = dpData.length > 0 ? dpData.readUInt8(0) === 1 : false;
        break;
          
      case TUYA_DP_TYPES.VALUE:
        if (dpData.length === 4) {
          value = dpData.readInt32BE(0);
        } else if (dpData.length === 2) {
          value = dpData.readInt16BE(0);
        } else if (dpData.length === 1) {
          value = dpData.readInt8(0);
        }
        break;
          
      case TUYA_DP_TYPES.ENUM:
        value = dpData.length > 0 ? dpData.readUInt8(0) : 0;
        break;
          
      case TUYA_DP_TYPES.STRING:
        value = dpData.toString('utf8');
        break;
          
      case TUYA_DP_TYPES.RAW:
      case TUYA_DP_TYPES.BITMAP:
        value = dpData;
        break;
          
      default:
        console.warn(`[TUYA-DP] Unknown datatype: ${datatype}`);
        value = dpData;
      }
      
      result.push({
        dp,
        type: datatype,
        value,
        status,
        transid
      });
    }
    
  } catch (err) {
    console.error('[TUYA-DP] Parse error:', err.message);
  }
  
  return result;
}

/**
 * Register Tuya DP listener on device
 * 
 * @param {Object} device - Homey device instance
 * @param {Object} zclNode - ZCL node
 * @param {Function} callback - Callback(dpId, value, type)
 * @returns {boolean} Success
 */
function registerTuyaDPListener(device, zclNode, callback) {
  try {
    if (!zclNode || !zclNode.endpoints || !zclNode.endpoints[1]) {
      device.error('[TUYA-DP] No endpoint 1 available');
      return false;
    }
    
    const endpoint = zclNode.endpoints[1];
    
    // Check if cluster 0xEF00 exists
    if (!endpoint.clusters || !endpoint.clusters['manuSpecificTuya']) {
      device.log('[TUYA-DP] Cluster 0xEF00 not found - trying alternative...');
      
      // Try to bind to the cluster manually
      // Some devices expose it as 'tuya' or 'manuSpecificTuya1'
      const tuyaCluster = endpoint.clusters['tuya'] || 
                          endpoint.clusters['manuSpecificTuya1'] ||
                          endpoint.clusters['ef00'];
      
      if (!tuyaCluster) {
        device.error('[TUYA-DP] ❌ Tuya cluster 0xEF00 not accessible');
        return false;
      }
      
      device.log('[TUYA-DP] ✅ Found alternative Tuya cluster');
    }
    
    const tuyaCluster = endpoint.clusters['manuSpecificTuya'] ||
                        endpoint.clusters['tuya'] ||
                        endpoint.clusters['ef00'];
    
    // Listen to dataReport attribute (0x0000 or specific attr)
    tuyaCluster.on('attr', (attr, value) => {
      device.log('[TUYA-DP] 📦 Received attribute update:', attr);
      
      // Parse if it's a DP frame
      if (Buffer.isBuffer(value)) {
        const parsed = parseTuyaDPFrame(value);
        
        parsed.forEach(dp => {
          device.log(`[TUYA-DP] DP ${dp.dp}: ${dp.value} (type ${dp.type})`);
          callback(dp.dp, dp.value, dp.type);
        });
      }
    });
    
    // Also listen to specific DP attributes if available
    if (typeof tuyaCluster.on === 'function') {
      tuyaCluster.on('dataReport', (data) => {
        device.log('[TUYA-DP] 📦 dataReport received');
        
        const parsed = parseTuyaDPFrame(data);
        parsed.forEach(dp => {
          device.log(`[TUYA-DP] DP ${dp.dp}: ${dp.value}`);
          callback(dp.dp, dp.value, dp.type);
        });
      });
    }
    
    device.log('[TUYA-DP] ✅ Listener registered successfully');
    return true;
    
  } catch (err) {
    device.error('[TUYA-DP] ❌ Failed to register listener:', err.message);
    return false;
  }
}

/**
 * Request Tuya DP value
 * 
 * @param {Object} device - Homey device
 * @param {Object} zclNode - ZCL node
 * @param {number} dpId - DP ID to read
 * @returns {Promise<any>} DP value or null
 */
async function requestTuyaDP(device, zclNode, dpId) {
  try {
    if (!zclNode || !zclNode.endpoints || !zclNode.endpoints[1]) {
      return null;
    }
    
    const endpoint = zclNode.endpoints[1];
    const tuyaCluster = endpoint.clusters['manuSpecificTuya'] ||
                        endpoint.clusters['tuya'] ||
                        endpoint.clusters['ef00'];
    
    if (!tuyaCluster) {
      device.error('[TUYA-DP] Cluster not available for read');
      return null;
    }
    
    // Build request frame
    const requestFrame = Buffer.alloc(4);
    requestFrame.writeUInt8(0x00, 0); // status
    requestFrame.writeUInt8(0x00, 1); // transid
    requestFrame.writeUInt8(dpId, 2); // dp id
    requestFrame.writeUInt8(0x00, 3); // read request
    
    // Send via dataRequest command
    if (typeof tuyaCluster.dataRequest === 'function') {
      await tuyaCluster.dataRequest(requestFrame);
      device.log(`[TUYA-DP] ✅ Requested DP ${dpId}`);
    } else {
      device.log('[TUYA-DP] ⚠️ dataRequest command not available');
    }
    
    return null; // Response will come via listener
    
  } catch (err) {
    device.error('[TUYA-DP] Request error:', err.message);
    return null;
  }
}

module.exports = {
  TUYA_DP_IDS,
  TUYA_DP_TYPES,
  parseTuyaDPFrame,
  registerTuyaDPListener,
  requestTuyaDP
};
