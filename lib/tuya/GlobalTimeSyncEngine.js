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
 * v10.4.0 / P2360: syncTime uses Formats.buildPayload + fallback chain;
 * FORCE_UPDATE honored in schedulePeriodicSync.
 */

const TuyaSpecificCluster = require('../clusters/TuyaSpecificCluster');
const TuyaTimeSyncFormats = require('./TuyaTimeSyncFormats');
const { safeSetTimeout } = require('../utils/safe-timers');

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
        'zt08_dp17': EPOCH_UNIX_1970,
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

    // ZT08 LCD weather station — Z2M timeStart "1970" (GH #513 / Z2M #29627)
    if (mfr.includes('hodyryli')) {
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

  /**
   * WHY(P2360): Prefer TuyaTimeSyncFormats payloads (incl. 10-byte seq echo) over
   * a single {utc,local} shape — MCU v3.3+ and LCD/TRV variants need the chain.
   * @param {object} zclNode
   * @param {number|object} [seqOrOpts] sequence from device request, or { sequenceNumber, force }
   */
  async syncTime(zclNode, seqOrOpts = null) {
    const force = seqOrOpts && typeof seqOrOpts === 'object' && seqOrOpts.force === true;
    if (!force && Date.now() - this._lastSync < 60000) {return { skipped: true };}

    const sequenceNumber = typeof seqOrOpts === 'number'
      ? seqOrOpts
      : (seqOrOpts?.sequenceNumber ?? seqOrOpts?.payloadSize ?? null);

    this.log('[TIME] Syncing time...');
    try {
      const tuya = this._getTuyaCluster(zclNode);
      const format = this._resolveSyncFormat();
      const objectPayload = this._buildPayload();
      let sent = false;
      let usedFormat = format;

      const trySendBuffer = async (buf) => {
        if (!buf || !Buffer.isBuffer(buf)) {return false;}
        if (this.device.tuyaEF00Manager?.sendCommand) {
          try {
            await this.device.tuyaEF00Manager.sendCommand(0x24, buf);
            return true;
          } catch (_e) { /* fall through */ }
        }
        if (tuya?.mcuSyncTime) {
          try {
            await tuya.mcuSyncTime({ payloadSize: buf.length, payload: buf });
            return true;
          } catch (_e) {
            try {
              await tuya.mcuSyncTime(objectPayload);
              return true;
            } catch (_e2) { /* fall through */ }
          }
        }
        if (typeof tuya?.command === 'function') {
          try {
            await tuya.command('mcuSyncTime', {
              payloadSize: buf.length,
              payload: buf,
            }, { disableDefaultResponse: true });
            return true;
          } catch (_e) { /* fall through */ }
        }
        return false;
      };

      try {
        const primaryBuf = TuyaTimeSyncFormats.buildPayload(format, {
          timezone: 'auto',
          sequenceNumber: sequenceNumber != null ? sequenceNumber : 0,
        });
        sent = await trySendBuffer(primaryBuf);
      } catch (err) {
        this.log(`[TIME] Primary format ${format} build/send failed:`, err?.message || err);
      }

      if (!sent) {
        const chain = TuyaTimeSyncFormats.getFallbackChain?.(format, this._deviceInfoForGuess()) || [];
        for (const step of chain) {
          const next = step?.format || step;
          if (!next || next === format) {continue;}
          try {
            const buf = TuyaTimeSyncFormats.buildPayload(next, {
              timezone: 'auto',
              sequenceNumber: sequenceNumber != null ? sequenceNumber : 0,
            });
            if (await trySendBuffer(buf)) {
              sent = true;
              usedFormat = next;
              this._cacheProbedFormat(next);
              break;
            }
          } catch (_e) { /* try next */ }
        }
      }

      if (!sent) {
        if (tuya?.mcuSyncTime) {
          await tuya.mcuSyncTime(objectPayload);
          sent = true;
        } else if (tuya?.dataReport) {
          await tuya.dataReport({ dp: 9, datatype: 4, data: Buffer.from(objectPayload.utc.toString()) });
          sent = true;
        }
      }

      if (!sent) {
        this.log('[TIME] Sync failed: no TX path');
        return { success: false };
      }

      this._lastSync = Date.now();
      this.log(`[TIME] Synced (format: ${usedFormat}, epoch: ${objectPayload.epoch})`);

      // P140 / Z2M #29627: ZT08 and siblings need DP17 commit after mcuSyncTime
      await this._applyFirmwareWorkarounds(zclNode);

      return { success: true, epoch: objectPayload.epoch, format: usedFormat };
    } catch (e) {
      this.log('[TIME] Sync failed:', e.message);
      return { success: false };
    }
  }

  _deviceInfoForGuess() {
    const mfr = this.device.getSetting?.('zb_manufacturer_name')
      || this.device.getData?.()?.manufacturerName
      || '';
    const model = this.device.getSetting?.('zb_model_id')
      || this.device.getData?.()?.productId
      || '';
    return {
      manufacturerName: mfr,
      productId: model,
      driverClass: this.device.driver?.manifest?.class || '',
      modelId: model,
    };
  }

  _resolveSyncFormat() {
    const cached = this._formatProbeState?.cachedFormat
      || this.device.getStoreValue?.('time_sync_format')
      || this.device.getStore?.('time_sync_format');
    if (cached && typeof cached === 'string') {return cached;}
    try {
      const guess = TuyaTimeSyncFormats.guessFormat(this._deviceInfoForGuess());
      return guess?.primary || 'tuya_dual_2000';
    } catch {
      return 'tuya_dual_2000';
    }
  }

  _cacheProbedFormat(format) {
    try {
      if (this._formatProbeState) {this._formatProbeState.cachedFormat = format;}
      if (typeof this.device.setStoreValue === 'function') {
        this.device.setStoreValue('time_sync_format', format);
      }
    } catch { /* ignore */ }
  }

  /**
   * Apply known MCU firmware workarounds after a successful time sync.
   * ZT08 (_TZE284_hodyryli): write DP17=false ~500ms later or the MCU
   * silently ignores the clock and may keep reporting temp 0 (GH #513).
   */
  async _applyFirmwareWorkarounds(zclNode) {
    try {
      const MCUFormatDatabase = require('./MCUFormatDatabase');
      const mfr = this.device.getSetting?.('zb_manufacturer_name')
        || this.device.getData?.()?.manufacturerName
        || '';
      const bug = MCUFormatDatabase.getFirmwareBug(mfr);
      if (!bug?.fix || bug.fix.type !== 'DP17_COMMIT') { return; }

      const delayMs = Number(bug.fix.delay_ms) || 500;
      const dp = Number(bug.fix.dp) || 17;
      const value = bug.fix.value === true;

      await new Promise((resolve) => {
        // Use safeSetTimeout(device, ...) — never detach this.homey.setTimeout
        // (Homey timer-context guard / P76 crash pattern).
        safeSetTimeout(this.device, resolve, delayMs);
      });

      await this._writeDpBool(zclNode, dp, value);
      this.log(`[TIME] Firmware workaround DP${dp}=${value} committed (${bug.bug || 'DP17'})`);
    } catch (e) {
      this.log('[TIME] Firmware workaround failed (non-fatal):', e?.message || e);
    }
  }

  /**
   * WHY(P2360): ZTH05Z (vvmbj46n) drifts unless synced hourly — FORCE_UPDATE.
   */
  _resolveForceUpdateIntervalMs(defaultMs) {
    try {
      const MCUFormatDatabase = require('./MCUFormatDatabase');
      const mfr = this.device.getSetting?.('zb_manufacturer_name')
        || this.device.getData?.()?.manufacturerName
        || '';
      const bug = MCUFormatDatabase.getFirmwareBug(mfr);
      if (bug?.fix?.type === 'FORCE_UPDATE') {
        const ms = Number(bug.fix.interval_ms);
        if (Number.isFinite(ms) && ms > 0) {return ms;}
      }
    } catch { /* ignore */ }
    return defaultMs;
  }

  async _writeDpBool(zclNode, dp, value) {
    const boolVal = !!value;
    if (this.device.tuyaEF00Manager?.sendDP) {
      await this.device.tuyaEF00Manager.sendDP(dp, boolVal, 'bool');
      return;
    }
    if (typeof this.device.writeBool === 'function') {
      await this.device.writeBool(dp, boolVal);
      return;
    }
    if (typeof this.device.sendTuyaCommand === 'function') {
      await this.device.sendTuyaCommand(dp, boolVal, 'bool');
      return;
    }
    const tuya = this._getTuyaCluster(zclNode);
    if (tuya?.dataRequest) {
      await tuya.dataRequest({
        dpValues: [{ dp, datatype: 1, data: Buffer.from([boolVal ? 1 : 0]) }],
      });
      return;
    }
    throw new Error('No Tuya bool write path available');
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
        if (this._destroyed) {return;}
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
    if (!tuya) {return;}

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

    // Prefer our epoch-aware timestamps when TuyaSpecificCluster is missing,
    // the user set time_epoch, or the constructor forced unix_1970 / zigbee_2000
    // (ZT08 / GH #513 must not fall back to a wrong cluster epoch).
    const settingEpoch = this.device.getSetting?.('time_epoch');
    const forcedEpoch = this._epochMode === EPOCH_UNIX_1970 || this._epochMode === EPOCH_ZIGBEE_2000;
    if (!ts || settingEpoch || forcedEpoch) {
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
      tuya.on('mcuSyncTime', (data) => {
        const seq = data?.sequenceNumber ?? data?.payloadSize ?? null;
        this.syncTime(zclNode, seq != null ? { sequenceNumber: seq, force: true } : { force: true });
      });
      tuya.on('command', (cmd) => {
        if (cmd === 'mcuSyncTime' || cmd?.command === 'mcuSyncTime') {
          this.syncTime(zclNode, { force: true });
        }
      });
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
    // WHY(P2360): FORCE_UPDATE devices (e.g. vvmbj46n) need hourly push even if default differs
    const resolvedMs = this._resolveForceUpdateIntervalMs(intervalMs);
    if (this._periodicSyncTimer) {
      this.homey.clearInterval(this._periodicSyncTimer);
    }
    this._periodicSyncTimer = this.homey.setInterval(() => {
      if (this._destroyed) {return;}
      this.syncTime(zclNode, { force: true });
    }, resolvedMs);
    if (resolvedMs !== intervalMs) {
      this.log(`[TIME] FORCE_UPDATE interval ${resolvedMs}ms`);
    }
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
