'use strict';

/**
 * TuyaEF00Manager - Manage Tuya EF00 cluster datapoints
 * 
 * Handles:
 * - Time synchronization (DP 0x67)
 * - Custom datapoints parsing
 * - Automatic daily time sync
 */

class TuyaEF00Manager {
  
  constructor(device) {
    this.device = device;
    this.timeSyncDPs = [0x67, 0x01, 0x24, 0x18]; // Common time sync DPs
    this.dailySyncTimer = null;
  }

  /**
   * Initialize Tuya EF00 support
   */
  async initialize(zclNode) {
    if (!zclNode) return false;

    this.device.log('[TUYA] Initializing EF00 manager...');
    
    // Check if device has Tuya EF00 cluster
    const tuyaCluster = zclNode.endpoints?.[1]?.clusters?.manuSpecificTuya;
    if (!tuyaCluster) {
      this.device.log('[TUYA] No EF00 cluster found (not a Tuya DP device)');
      return false;
    }

    this.device.log('[TUYA] ✅ EF00 cluster detected');
    
    // Send initial time sync
    await this.sendTimeSync(zclNode);
    
    // Schedule daily sync at 3 AM
    this.scheduleDailySync(zclNode);
    
    // Listen for incoming datapoints
    this.setupDatapointListener(tuyaCluster);
    
    return true;
  }

  /**
   * Send time synchronization to device
   */
  async sendTimeSync(zclNode) {
    if (!zclNode) return false;

    const tuyaCluster = zclNode.endpoints?.[1]?.clusters?.manuSpecificTuya;
    if (!tuyaCluster) return false;

    const now = new Date();
    
    // Build time payload: [year-2000, month, day, hour, minute, second, dayOfWeek]
    const payload = Buffer.from([
      now.getFullYear() - 2000,
      now.getMonth() + 1,
      now.getDate(),
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      now.getDay() // 0=Sunday
    ]);

    this.device.log('[TUYA] 📅 Sending time sync:', {
      date: now.toISOString(),
      payload: payload.toString('hex')
    });

    // Try each known time sync datapoint ID
    for (const dpId of this.timeSyncDPs) {
      try {
        await tuyaCluster.setDataValue({
          dp: dpId,
          datatype: 0x00, // RAW
          data: payload
        });
        
        this.device.log(`[TUYA] ✅ Time synced via DP 0x${dpId.toString(16)}`);
        return true;
      } catch (err) {
        this.device.log(`[TUYA] DP 0x${dpId.toString(16)} failed:`, err.message);
      }
    }

    this.device.log('[TUYA] ⚠️ Time sync failed on all DPs');
    return false;
  }

  /**
   * Schedule daily time sync
   */
  scheduleDailySync(zclNode) {
    if (this.dailySyncTimer) {
      clearTimeout(this.dailySyncTimer);
    }

    // Calculate ms until 3 AM tomorrow
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(3, 0, 0, 0);
    const msUntil3AM = tomorrow - now;

    this.device.log(`[TUYA] Next time sync in ${Math.round(msUntil3AM / 1000 / 60 / 60)}h`);

    this.dailySyncTimer = setTimeout(() => {
      this.sendTimeSync(zclNode);
      this.scheduleDailySync(zclNode); // Reschedule
    }, msUntil3AM);
  }

  /**
   * Setup datapoint listener
   */
  setupDatapointListener(tuyaCluster) {
    try {
      tuyaCluster.on('datapoint', (dp) => {
        this.device.log('[TUYA] 📥 Datapoint received:', {
          dp: `0x${dp.dp.toString(16)}`,
          datatype: `0x${dp.datatype.toString(16)}`,
          data: dp.data.toString('hex')
        });
        
        // Parse and handle datapoint
        this.handleDatapoint(dp);
      });
      
      this.device.log('[TUYA] ✅ Datapoint listener configured');
    } catch (err) {
      this.device.error('[TUYA] Failed to setup listener:', err.message);
    }
  }

  /**
   * Handle incoming datapoint
   */
  handleDatapoint(dp) {
    // Override in child classes for custom handling
    this.device.log(`[TUYA] Unhandled DP 0x${dp.dp.toString(16)}`);
  }

  /**
   * Cleanup
   */
  cleanup() {
    if (this.dailySyncTimer) {
      clearTimeout(this.dailySyncTimer);
      this.dailySyncTimer = null;
    }
  }
}

module.exports = TuyaEF00Manager;
