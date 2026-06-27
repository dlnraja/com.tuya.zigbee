'use strict';

/**
 * GlobalTimeSyncEngine - Time sync for Tuya devices
 * @version 10.3.0
 *
 * Supports configurable time epoch:
 * - Unix epoch (1970): seconds since 1970-01-01 (standard Unix/Linux)
 * - Tuya/Zigbee epoch (2000): seconds since 2000-01-01 (ZCL standard)
 *
 * The epoch is auto-detected from device manufacturer or can be set via
 * device setting 'time_epoch' ('unix_1970' | 'zigbee_2000' | 'auto').
 *
 * v10.3.0: Added format guessing via TuyaTimeSyncFormats.guessFormat()
 */

const TuyaSpecificCluster = require('../clusters/TuyaSpecificCluster');
const TuyaTimeSyncFormats = require('./TuyaTimeSyncFormats');

// v10.2.0: Epoch constants
const EPOCH_UNIX_1970 = 'unix_1970';
const EPOCH_ZIGBEE_2000 = 'zigbee_2000';
const TUYA_EPOCH_OFFSET = 946684800; // Seconds between 1970-01-01 and 2000-01-01

class GlobalTimeSyncEngine {
  constructor(device, options = {}) {
    this.device = device;
    this.log = device.log?.bind(device) || console.log;
    this._lastSync = 0;

    // v10.2.0: Configurable epoch mode
    // Supported: 'unix_1970', 'zigbee_2000', 'auto'
    this._epochMode = options.epoch || 'auto';

    // Access homey instance from device
    this.homey = device.homey;
  }

  /**
   * v10.2.0: Resolve the effective epoch mode for this device.
   * Priority: constructor option > device setting > auto-detect from manufacturer
   *
   * @returns {string} 'unix_1970' or 'zigbee_2000'
   */
  _resolveEpoch() {
    // 1. Check device setting (user-configurable)
    const settingEpoch = this.device.getSetting?.('time_epoch');
    if (settingEpoch === EPOCH_UNIX_1970 || settingEpoch === EPOCH_ZIGBEE_2000) {
      return settingEpoch;
    }

    // 2. Check constructor option
    if (this._epochMode === EPOCH_UNIX_1970 || this._epochMode === EPOCH_ZIGBEE_2000) {
      return this._epochMode;
    }

    // 3. Auto-detect from manufacturer
    return this._autoDetectEpoch();
  }

  /**
   * v10.3.0: Auto-detect epoch from device manufacturer/model.
   * Uses TuyaTimeSyncFormats.guessFormat() for comprehensive analysis.
   * Most Tuya devices use epoch 2000. Some soil sensors and non-Tuya devices use 1970.
   *
   * @returns {string} Detected epoch mode
   */
  _autoDetectEpoch() {
    const mfr = (this.device.getSetting?.('zb_manufacturer_name') || '').toLowerCase();
    const model = (this.device.getSetting?.('zb_model_id') || '').toUpperCase();
    const productId = this.device.getStoreValue?.('productId') || '';
    const driverClass = this.device.driver?.manifest?.class || '';

    // v10.3.0: Use TuyaTimeSyncFormats.guessFormat() for comprehensive analysis
    try {
      // Build endpoint info for cluster analysis
      const endpoints = {};
      const node = this.device.zclNode || this.device.node || this.device._zclNode;
      if (node?.endpoints) {
        for (const [epId, ep] of Object.entries(node.endpoints)) {
          endpoints[epId] = {
            inClusters: ep?.inClusters || [],
            outClusters: ep?.outClusters || [],
          };
        }
      }

      const guess = TuyaTimeSyncFormats.guessFormat({
        manufacturerName: mfr,
        productId: productId || model,
        driverClass,
        endpoints,
        modelId: model,
      });

      this.log(`[GlobalTimeSync] Format guess: ${guess.primary} (confidence: ${guess.confidence}%)`);

      // Map format to epoch
      const formatToEpoch = {
        'zigbee_2000': EPOCH_ZIGBEE_2000,
        'zigbee_2000_local': EPOCH_ZIGBEE_2000,
        'zigbee_2000_le': EPOCH_ZIGBEE_2000,
        'unix_1970': EPOCH_UNIX_1970,
        'unix_1970_local': EPOCH_UNIX_1970,
        'unix_1970_le': EPOCH_UNIX_1970,
        'unix_1970_ms': EPOCH_UNIX_1970,
        'tuya_dual_2000': EPOCH_ZIGBEE_2000,
        'tuya_dual_1970': EPOCH_UNIX_1970,
        'z2m_dual_2000': EPOCH_ZIGBEE_2000,
        'z2m_dual_1970': EPOCH_UNIX_1970,
        'tuya_mcu': EPOCH_ZIGBEE_2000,
        'tuya_mcu_hdr_10': EPOCH_UNIX_1970,
        'tuya_mcu_hdr_8': EPOCH_UNIX_1970,
        'tuya_seq_10': EPOCH_UNIX_1970,
        'tuya_seq_10_e2k': EPOCH_ZIGBEE_2000,
        'zcl_5': EPOCH_ZIGBEE_2000,
        'tuya_standard': EPOCH_ZIGBEE_2000,
        'tuya_utc': EPOCH_ZIGBEE_2000,
        'tuya_ext_tz': EPOCH_ZIGBEE_2000,
        'tuya_full_tz': EPOCH_ZIGBEE_2000,
        'tuya_gateway': EPOCH_ZIGBEE_2000,
      };

      return formatToEpoch[guess.primary] || EPOCH_ZIGBEE_2000;
    } catch (err) {
      this.log(`[GlobalTimeSync] guessFormat failed, using legacy detection: ${err.message}`);
    }

    // Legacy detection fallback
    return this._autoDetectEpochLegacy();
  }

  /**
   * v10.3.0: Legacy epoch detection (original implementation)
   * @returns {string} Detected epoch mode
   */
  _autoDetectEpochLegacy() {
    const mfr = (this.device.getSetting?.('zb_manufacturer_name') || '').toLowerCase();
    const model = (this.device.getSetting?.('zb_model_id') || '').toUpperCase();

    // Non-Tuya manufacturers typically use Unix epoch
    if (!mfr.startsWith('_t') && !mfr.startsWith('_tz') && mfr.length > 0) {
      return EPOCH_UNIX_1970;
    }

    // Soil/plant sensors often use Unix epoch
    if (mfr.includes('soil') || mfr.includes('plant') || mfr.includes('moisture')) {
      return EPOCH_UNIX_1970;
    }

    // Default: Tuya/Zigbee epoch 2000
    return EPOCH_ZIGBEE_2000;
  }

  /**
   * v10.2.0: Build timestamp pair using the resolved epoch.
   *
   * @returns {Object} { utc: number, local: number, epoch: string }
   */
  _buildTimestamps() {
    const nowSec = Math.floor(Date.now() / 1000);
    const tzOffsetSec = -new Date().getTimezoneOffset() * 60;
    const epoch = this._resolveEpoch();

    if (epoch === EPOCH_UNIX_1970) {
      return {
        utc: nowSec,
        local: nowSec + tzOffsetSec,
        epoch: EPOCH_UNIX_1970,
      };
    }

    // Zigbee/Tuya epoch 2000
    return {
      utc: nowSec - TUYA_EPOCH_OFFSET,
      local: nowSec + tzOffsetSec - TUYA_EPOCH_OFFSET,
      epoch: EPOCH_ZIGBEE_2000,
    };
  }

  async syncTime(zclNode) {
    if (Date.now() - this._lastSync < 60000) {return { skipped: true };}

    this.log('[TIME] Syncing time...');
    try {
      const tuya = this._getTuyaCluster(zclNode);
      const payload = this._buildPayload();

      if (tuya?.mcuSyncTime) {
        await tuya.mcuSyncTime(payload);
      } else if (tuya?.dataReport) {
        await tuya.dataReport({ dp: 9, datatype: 4, data: Buffer.from(payload.utc.toString()) });
      }

      this._lastSync = Date.now();
      this.log(`[TIME] Synced (epoch: ${payload.epoch})`);
      return { success: true, epoch: payload.epoch };
    } catch (e) {
      this.log('[TIME] Sync failed:', e.message);
      return { success: false };
    }
  }

  /**
   * Get the probed/cached time format
   * @returns {string|null} Cached format or null if not probed
   */
  getProbedFormat() {
    return this._formatProbeState.cachedFormat;
  }

  /**
   * Check if format probe is needed (no cached format)
   * @returns {boolean} True if probe is needed
   */
  needsFormatProbe() {
    return !this._formatProbeState.cachedFormat &&
           !this.device.getStore?.('time_sync_format');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Idea #10: TIME SYNC EPOCH AUTO-DETECTION
  // ═══════════════════════════════════════════════════════════════════════════════
  // Runtime format probing with acknowledgment detection

  /**
   * Time format probing state
   */
  _formatProbeState = {
    probeActive: false,
    currentFormatIndex: 0,
    probeTimeoutMs: 3000,
    cachedFormat: null,
    probeFormats: [
      'zigbee_2000',
      'unix_1970',
      'tuya_timestamp',
      'tuya_standard',
      'tuya_mcu',
      'tuya_extended',
      'tuya_full_tz',
      'tuya_gateway'
    ]
  };

  /**
   * Probe device for correct time format by sending test time and checking acknowledgment
   * @param {Object} zclNode - ZCL node
   * @returns {Promise<string>} Detected format
   */
  async probeTimeFormat(zclNode) {
    if (this._formatProbeState.probeActive) {
      this.log('[TIME-PROBE] Probe already active, skipping');
      return this._formatProbeState.cachedFormat || 'auto';
    }

    // Check cache first
    const cachedFormat = this.device.getStore?.('time_sync_format');
    if (cachedFormat) {
      this.log(`[TIME-PROBE] Using cached format: ${cachedFormat}`);
      this._formatProbeState.cachedFormat = cachedFormat;
      return cachedFormat;
    }

    this._formatProbeState.probeActive = true;
    this._formatProbeState.currentFormatIndex = 0;

    this.log('[TIME-PROBE] Starting format probe...');

    try {
      for (let i = 0; i < this._formatProbeState.probeFormats.length; i++) {
        const format = this._formatProbeState.probeFormats[i];
        this._formatProbeState.currentFormatIndex = i;

        this.log(`[TIME-PROBE] Testing format: ${format}`);

        const success = await this._testTimeFormat(zclNode, format);
        if (success) {
          this.log(`[TIME-PROBE] Format ${format} accepted by device`);
          this._formatProbeState.cachedFormat = format;

          // Cache successful format
          if (this.device.setStoreValue) {
            await this.device.setStoreValue('time_sync_format', format).catch(() => {});
          }

          this._formatProbeState.probeActive = false;
          return format;
        }

        this.log(`[TIME-PROBE] Format ${format} not confirmed`);
      }

      this.log('[TIME-PROBE] No format confirmed, using auto');
      this._formatProbeState.probeActive = false;
      return 'auto';
    } catch (err) {
      this.log(`[TIME-PROBE] Probe failed: ${err.message}`);
      this._formatProbeState.probeActive = false;
      return this._formatProbeState.cachedFormat || 'auto';
    }
  }

  /**
   * Test a specific time format by sending and waiting for acknowledgment
   * @param {Object} zclNode - ZCL node
   * @param {string} format - Time format to test
   * @returns {Promise<boolean>} True if format was accepted
   */
  async _testTimeFormat(zclNode, format) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let resolved = false;

      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          if (handler) {
            this.device.removeListener?.('dpReport', handler);
          }
        }
      };

      const timer = this.homey.setTimeout(() => {
        if (this._destroyed) return;
        cleanup();
        resolve(false);
      }, this._formatProbeState.probeTimeoutMs);

      // Listen for time acknowledgment (DP 0x67 or 0x24 response)
      const handler = (report) => {
        if ((report.dpId === 0x67 || report.dpId === 0x24) && !resolved) {
          const waitTime = Date.now() - startTime;
          this.log(`[TIME-PROBE] Received time DP${report.dpId} response after ${waitTime}ms`);
          cleanup();
          resolve(true);
        }
      };

      this.device.on?.('dpReport', handler);

      // Send test time with this format
      this._sendTestTime(zclNode, format).catch(() => {
        cleanup();
        resolve(false);
      });
    });
  }

  /**
   * Send test time with specific format
   * @param {Object} zclNode - ZCL node
   * @param {string} format - Time format to use
   */
  async _sendTestTime(zclNode, format) {
    const tuya = this._getTuyaCluster(zclNode);
    if (!tuya) return;

    const now = new Date();
    const unixTimestampUtc = Math.floor(now.getTime() / 1000);
    const tuya2000Utc = unixTimestampUtc - TUYA_EPOCH_OFFSET;

    let buffer;
    switch (format) {
      case 'zigbee_2000':
        buffer = Buffer.alloc(4);
        buffer.writeUInt32BE(tuya2000Utc, 0);
        break;
      case 'unix_1970':
        buffer = Buffer.alloc(4);
        buffer.writeUInt32BE(unixTimestampUtc, 0);
        break;
      case 'tuya_timestamp':
        buffer = Buffer.alloc(8);
        buffer.writeUInt32BE(tuya2000Utc, 0);
        buffer.writeUInt32BE(tuya2000Utc, 4);
        break;
      case 'tuya_standard':
        buffer = Buffer.from([
          now.getFullYear() - 2000,
          now.getMonth() + 1,
          now.getDate(),
          now.getHours(),
          now.getMinutes(),
          now.getSeconds(),
          now.getDay() === 0 ? 7 : now.getDay()
        ]);
        break;
      default:
        buffer = Buffer.alloc(4);
        buffer.writeUInt32BE(tuya2000Utc, 0);
    }

    if (tuya.dataReport) {
      await tuya.dataReport({ dp: 0x67, datatype: 4, data: buffer });
    }
  }

  /**
   * Clear cached time format (for re-probing)
   */
  clearTimeFormatCache() {
    this._formatProbeState.cachedFormat = null;
    if (this.device.setStoreValue) {
      this.device.setStoreValue('time_sync_format', null).catch(() => {});
    }
    this.log('[TIME-PROBE] Format cache cleared');
  }

  _getTuyaCluster(zclNode) {
    for (const ep of Object.values(zclNode?.endpoints || {})) {
      if (ep.clusters?.[61184] || ep.clusters?.tuya) {
        return ep.clusters[61184] || ep.clusters.tuya;
      }
    }
    return null;
  }

  _buildPayload() {
    const mfr = this.device.getSetting?.('zb_manufacturer_name') || '';
    const timestamps = this._buildTimestamps();

    // Try TuyaSpecificCluster first (manufacturer-aware)
    let ts;
    try {
      ts = TuyaSpecificCluster.getTimestamps(mfr);
    } catch (e) {
      ts = null;
    }

    // Use our epoch-aware timestamps when TuyaSpecificCluster is not available
    // or when the user has explicitly configured an epoch override
    const settingEpoch = this.device.getSetting?.('time_epoch');
    if (!ts || settingEpoch) {
      return {
        utc: timestamps.utc,
        local: timestamps.local,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        epoch: timestamps.epoch,
      };
    }

    return {
      utc: ts.utc,
      local: ts.local,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      epoch: this._resolveEpoch(),
    };
  }

  setupListener(zclNode) {
    const tuya = this._getTuyaCluster(zclNode);
    if (tuya?.on) {
      tuya.on('mcuSyncTime', () => this.syncTime(zclNode));
      tuya.on('command', (cmd) => { if (cmd === 'mcuSyncTime') {this.syncTime(zclNode);} });
      this.log('[TIME] Listener setup for time requests');
    }
  }

  _getTimeCluster(zclNode) {
    for (const ep of Object.values(zclNode?.endpoints || {})) {
      if (ep.clusters?.genTime || ep.clusters?.[10]) {return ep.clusters.genTime || ep.clusters[10];}
    }
    return null;
  }

  schedulePeriodicSync(zclNode, intervalMs = 3600000) {
    // Clear any existing periodic sync timer to prevent duplicate intervals
    if (this._periodicSyncTimer) {
      this.homey.clearInterval(this._periodicSyncTimer);
    }
    this._periodicSyncTimer = this.homey.setInterval(() => {
      if (this._destroyed) return;
      this.syncTime(zclNode);
    }, intervalMs);
  }

  destroy() {
    this._destroyed = true;
    if (this._periodicSyncTimer) {
      this.homey.clearInterval(this._periodicSyncTimer);
      this._periodicSyncTimer = null;
    }
  }
}

module.exports = GlobalTimeSyncEngine;
module.exports.EPOCH_UNIX_1970 = EPOCH_UNIX_1970;
module.exports.EPOCH_ZIGBEE_2000 = EPOCH_ZIGBEE_2000;
module.exports.TUYA_EPOCH_OFFSET = TUYA_EPOCH_OFFSET;
