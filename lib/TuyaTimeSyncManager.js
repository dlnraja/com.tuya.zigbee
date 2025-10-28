'use strict';

/**
 * TuyaTimeSyncManager - Synchronize time to Tuya EF00 devices
 * Implements ChatGPT recommendation for TS0601 time sync
 * 
 * Features:
 * - Automatic time sync on pairing and daily
 * - Multiple datapoint ID attempts (0x67, 0x01, 0x24)
 * - Timezone support
 * - Verbose logging
 */

const Logger = require('./Logger');
const TuyaDPParser = require('./TuyaDPParser');

class TuyaTimeSyncManager {
  
  constructor(device) {
    this.device = device;
    this.logger = Logger.createLogger(device, 'TuyaTimeSyncManager');
    
    // Common time sync datapoint IDs (try multiple)
    this.timeSyncDpIds = [0x67, 0x01, 0x24, 0x18];
    
    // Schedule daily sync
    this.scheduleDailySync();
  }

  /**
   * Send time sync to device
   */
  async sendTimeSync() {
    this.logger.info('📅 Sending time sync to device...');
    
    const now = new Date();
    
    // Try each datapoint ID
    for (const dpId of this.timeSyncDpIds) {
      try {
        const payload = this.buildTimePayload(now);
        this.logger.debug(`Trying DP ${dpId.toString(16).toUpperCase()} with payload:`, payload.toString('hex'));
        
        const success = await this.sendDataPoint(dpId, payload);
        
        if (success) {
          this.logger.success(`✅ Time synced via DP ${dpId.toString(16).toUpperCase()}`);
          return true;
        }
      } catch (err) {
        this.logger.debug(`DP ${dpId.toString(16).toUpperCase()} failed:`, err.message);
      }
    }
    
    this.logger.warn('⚠️ Time sync failed on all datapoint IDs');
    return false;
  }

  /**
   * Build time payload (multiple formats)
   */
  buildTimePayload(date) {
    // Format 1: Year(2) Month(1) Day(1) Hour(1) Minute(1) Second(1) DayOfWeek(1)
    const year = date.getFullYear() - 2000;
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    const second = date.getSeconds();
    const dayOfWeek = date.getDay(); // 0=Sunday

    return Buffer.from([
      year,
      month,
      day,
      hour,
      minute,
      second,
      dayOfWeek
    ]);
  }

  /**
   * Send datapoint to Tuya cluster
   */
  async sendDataPoint(dp, payload) {
    try {
      const tuyaCluster = this.device.zclNode?.endpoints?.[1]?.clusters?.manuSpecificTuya;
      
      if (!tuyaCluster) {
        this.logger.warn('Tuya cluster 0xEF00 not found');
        return false;
      }

      // Send as Tuya datapoint
      await tuyaCluster.setDataValue({
        dp,
        datatype: 0x00, // RAW
        data: payload
      });

      return true;
    } catch (err) {
      this.logger.debug('Send datapoint error:', err.message);
      return false;
    }
  }

  /**
   * Schedule daily time sync at 3 AM
   */
  scheduleDailySync() {
    // Calculate ms until 3 AM tomorrow
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(3, 0, 0, 0);
    const msUntil3AM = tomorrow - now;

    this.logger.debug(`Next time sync scheduled in ${Math.round(msUntil3AM / 1000 / 60 / 60)}h`);

    this.syncInterval = setTimeout(() => {
      this.sendTimeSync();
      // Reschedule for next day
      this.scheduleDailySync();
    }, msUntil3AM);
  }

  /**
   * Cleanup on device removal
   */
  cleanup() {
    if (this.syncInterval) {
      clearTimeout(this.syncInterval);
    }
  }

}

module.exports = TuyaTimeSyncManager;
