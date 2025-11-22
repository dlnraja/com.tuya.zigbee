'use strict';

/**
 * ENHANCED TUYA DP ENGINE HANDLER
 * 
 * Amélioration du moteur DP Tuya (cluster 0xEF00)
 * Basé sur best practices SONOFF Zigbee
 * 
 * Features:
 * - Better DP parsing
 * - Type handling (raw, bool, value, string, enum, bitmap)
 * - Data conversion
 * - Error recovery
 */

const CLUSTER_TUYA = 'manuSpecificTuya';
const CLUSTER_ID_TUYA = 0xEF00;

class EnhancedDPHandler {
  constructor(device) {
    this.device = device;
    this.dpMap = new Map(); // DP number → capability mapping
    this.dpCache = new Map(); // DP cache for quick access
    this.lastReceived = null;
  }

  /**
   * Initialize DP handler
   */
  async initialize(dpMapping) {
    this.device.log('Initializing Enhanced DP Handler');

    // Store DP mapping
    for (const [dp, config] of Object.entries(dpMapping)) {
      this.dpMap.set(parseInt(dp), config);
    }

    // Register listener for Tuya datapoints
    try {
      await this.registerDatapointListener().catch(err => this.error(err));
      this.device.log(`[OK] Enhanced DP Handler initialized with ${this.dpMap.size} DPs`);
    } catch (err) {
      this.device.error('Failed to initialize DP handler:', err);
      throw err;
    }
  }

  /**
   * Register datapoint listener
   */
  async registerDatapointListener() {
    const endpoint = this.device.zclNode.endpoints[1];
    
    if (!endpoint || !endpoint.clusters[CLUSTER_TUYA]) {
      throw new Error('Tuya cluster not available on endpoint 1');
    }

    // Listen to datapoints attribute
    this.device.registerAttrReportListener(
      CLUSTER_TUYA,
      'datapoints',
      1,
      60,
      null,
      this.onDatapointReport.bind(this)
    );

    this.device.log('[OK] Datapoint listener registered');
  }

  /**
   * Handle datapoint report
   */
  async onDatapointReport(data) {
    try {
      this.lastReceived = Date.now();

      if (!data || typeof data !== 'object') {
        this.device.error('Invalid datapoint data:', data);
        return;
      }

      const dp = data.dp;
      const datatype = data.datatype;
      const value = data.data;

      this.device.log(`[RECV] Received DP ${dp} (type: ${datatype}):`, value);

      // Cache the value
      this.dpCache.set(dp, { value, datatype, timestamp: Date.now() });

      // Process the datapoint
      await this.processDatapoint(dp, datatype, value).catch(err => this.error(err));

    } catch (err) {
      this.device.error('Error processing datapoint:', err);
    }
  }

  /**
   * Process a single datapoint
   */
  async processDatapoint(dp, datatype, rawValue) {
    const config = this.dpMap.get(dp);

    if (!config) {
      this.device.log(`[WARN]  Unknown DP ${dp}, ignoring`);
      return;
    }

    try {
      // Convert value based on datatype
      const convertedValue = this.convertValue(rawValue, datatype, config);

      this.device.log(`[OK] DP ${dp} → ${config.capability}: ${convertedValue}`);

      // Update capability
      if (config.capability) {
        await this.device.setCapabilityValue(config.capability, convertedValue).catch(err => this.error(err));
      }

      // Call custom handler if defined
      if (config.handler && typeof config.handler === 'function') {
        await config.handler.call(this.device, convertedValue, dp).catch(err => this.error(err));
      }

    } catch (err) {
      this.device.error(`Failed to process DP ${dp}:`, err);
    }
  }

  /**
   * Convert DP value based on datatype
   */
  convertValue(rawValue, datatype, config) {
    // Apply custom converter if defined
    if (config.converter && typeof config.converter === 'function') {
      return config.converter(rawValue);
    }

    // Default conversion based on datatype
    switch (datatype) {
    case 0: // RAW (buffer)
      return this.convertRaw(rawValue, config);

    case 1: // BOOL
      return this.convertBool(rawValue);

    case 2: // VALUE (4-byte int)
      return this.convertValue4byte(rawValue, config);

    case 3: // STRING
      return this.convertString(rawValue);

    case 4: // ENUM
      return this.convertEnum(rawValue, config);

    case 5: // BITMAP
      return this.convertBitmap(rawValue, config);

    default:
      this.device.warn(`Unknown datatype ${datatype}, returning raw value`);
      return rawValue;
    }
  }

  /**
   * Convert RAW (type 0)
   */
  convertRaw(value, config) {
    if (Buffer.isBuffer(value)) {
      // Default: return as hex string
      return value.toString('hex');
    }
    return value;
  }

  /**
   * Convert BOOL (type 1)
   */
  convertBool(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (Buffer.isBuffer(value)) return value[0] !== 0;
    return Boolean(value);
  }

  /**
   * Convert VALUE 4-byte (type 2)
   */
  convertValue4byte(value, config) {
    let numValue;

    if (Buffer.isBuffer(value)) {
      // Read as 32-bit big-endian
      numValue = value.readUInt32BE(0);
    } else if (typeof value === 'number') {
      numValue = value;
    } else {
      numValue = parseInt(value, 10);
    }

    // Apply scale if defined
    if (config.scale) {
      numValue = numValue / config.scale;
    }

    // Apply min/max if defined
    if (config.min !== undefined) {
      numValue = Math.max(config.min, numValue);
    }
    if (config.max !== undefined) {
      numValue = Math.min(config.max, numValue);
    }

    return numValue;
  }

  /**
   * Convert STRING (type 3)
   */
  convertString(value) {
    if (typeof value === 'string') return value;
    if (Buffer.isBuffer(value)) return value.toString('utf8');
    return String(value);
  }

  /**
   * Convert ENUM (type 4)
   */
  convertEnum(value, config) {
    let enumValue;

    if (Buffer.isBuffer(value)) {
      enumValue = value[0];
    } else if (typeof value === 'number') {
      enumValue = value;
    } else {
      enumValue = parseInt(value, 10);
    }

    // Map enum value if mapping defined
    if (config.enumMap && config.enumMap[enumValue] !== undefined) {
      return config.enumMap[enumValue];
    }

    return enumValue;
  }

  /**
   * Convert BITMAP (type 5)
   */
  convertBitmap(value, config) {
    let bitmap;

    if (Buffer.isBuffer(value)) {
      bitmap = value.readUInt32BE(0);
    } else if (typeof value === 'number') {
      bitmap = value;
    } else {
      bitmap = parseInt(value, 10);
    }

    // Extract specific bit if bit number defined
    if (config.bit !== undefined) {
      return (bitmap & (1 << config.bit)) !== 0;
    }

    return bitmap;
  }

  /**
   * Send DP command
   */
  async sendDatapoint(dp, datatype, value) {
    try {
      this.device.log(`[SEND] Sending DP ${dp} (type: ${datatype}):`, value);

      const endpoint = this.device.zclNode.endpoints[1];
      
      if (!endpoint || !endpoint.clusters[CLUSTER_TUYA]) {
        throw new Error('Tuya cluster not available');
      }

      // Format value based on datatype
      const formattedValue = this.formatValueForSend(value, datatype);

      // Send command
      await endpoint.clusters[CLUSTER_TUYA].writeAttributes({
        datapoints: {
          dp,
          datatype,
          data: formattedValue
        }
      });

      this.device.log(`[OK] DP ${dp} sent successfully`);

      // Update cache optimistically
      this.dpCache.set(dp, { value: formattedValue, datatype, timestamp: Date.now() });

    } catch (err) {
      this.device.error(`Failed to send DP ${dp}:`, err);
      throw err;
    }
  }

  /**
   * Format value for sending
   */
  formatValueForSend(value, datatype) {
    switch (datatype) {
    case 1: // BOOL
      return value ? 1 : 0;

    case 2: // VALUE (4-byte)
      const buffer = Buffer.alloc(4);
      buffer.writeUInt32BE(value, 0);
      return buffer;

    case 3: // STRING
      return Buffer.from(String(value), 'utf8');

    case 4: // ENUM
      return Buffer.from([value]);

    default:
      return value;
    }
  }

  /**
   * Get DP value from cache
   */
  getCachedDP(dp) {
    return this.dpCache.get(dp);
  }

  /**
   * Get all cached DPs
   */
  getAllCachedDPs() {
    return Object.fromEntries(this.dpCache);
  }

  /**
   * Clear DP cache
   */
  clearCache() {
    this.dpCache.clear();
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalDPs: this.dpMap.size,
      cachedDPs: this.dpCache.size,
      lastReceived: this.lastReceived,
      timeSinceLastReceived: this.lastReceived ? Date.now() - this.lastReceived : null
    };
  }
}

module.exports = EnhancedDPHandler;
