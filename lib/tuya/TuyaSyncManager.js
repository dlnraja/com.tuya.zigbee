'use strict';

const { EventEmitter } = require('events');

/**
 * TuyaSyncManager - Advanced Synchronization System
 * 
 * Manages comprehensive synchronization for Tuya devices:
 * 1. Time/Date Synchronization (DP 0x24, 0x67, 0x01, 0x18)
 * 2. Battery Status Synchronization
 * 3. Device State Sync
 * 4. Periodic Health Checks
 * 
 * Based on Tuya Developer Documentation:
 * https://developer.tuya.com/en/docs/iot/tuya-zigbee-universal-docking-access-standard
 */

class TuyaSyncManager extends EventEmitter {
  
  constructor(device) {
    super();
    this.device = device;
    this.log = device.log.bind(device);
    this.error = device.error.bind(device);
    
    // Sync intervals
    this.timeSyncInterval = null;
    this.batterySyncInterval = null;
    this.healthCheckInterval = null;
    
    // Sync DPs (Tuya DataPoints for time sync)
    this.timeSyncDPs = {
      main: 0x24,      // Main time sync DP (36 decimal)
      alt1: 0x67,      // Alternative time sync DP (103 decimal)
      alt2: 0x01,      // Alternative time sync DP (1 decimal)
      alt3: 0x18       // Alternative time sync DP (24 decimal)
    };
    
    // Battery DPs
    this.batteryDPs = {
      percentage: 4,    // DP4 - Battery percentage
      voltage: 5,       // DP5 - Battery voltage
      state: 14,        // DP14 - Battery state (charging, etc.)
      alarm: 15         // DP15 - Low battery alarm
    };
    
    // Sync status
    this.lastTimeSync = null;
    this.lastBatterySync = null;
    this.syncAttempts = {
      time: 0,
      battery: 0
    };
  }
  
  /**
   * Initialize synchronization manager
   */
  async initialize(zclNode, tuyaEF00Manager) {
    this.log('[SYNC] Initializing TuyaSyncManager...');
    this.zclNode = zclNode;
    this.tuyaEF00Manager = tuyaEF00Manager;
    
    // Check if device supports time sync
    if (this.tuyaEF00Manager) {
      this.log('[SYNC] Tuya device detected - enabling advanced sync');
      await this.setupTuyaSync();
    } else {
      this.log('[SYNC] Standard Zigbee device - using basic sync');
      await this.setupStandardSync();
    }
    
    // Start health checks
    this.startHealthChecks();
    
    this.log('[SYNC] ✅ TuyaSyncManager initialized');
    return true;
  }
  
  /**
   * Setup synchronization for Tuya devices
   */
  async setupTuyaSync() {
    // Initial time sync
    await this.syncTime();
    
    // Schedule daily time sync at 3 AM
    this.scheduleTimeSy;

    nc();
    
    // Initial battery sync
    await this.syncBattery();
    
    // Schedule hourly battery sync
    this.scheduleBatterySync();
  }
  
  /**
   * Setup synchronization for standard Zigbee devices
   */
  async setupStandardSync() {
    // For standard Zigbee, only battery sync via PowerConfiguration cluster
    await this.syncBatteryStandard();
    
    // Schedule hourly battery check
    this.scheduleBatterySync();
  }
  
  /**
   * Synchronize time with device (Tuya DP method)
   * 
   * Format: [year-2000][month][day][hour][minute][second][weekday]
   * Example: 2025-11-03 16:45:30 Sunday → [25][11][03][16][45][30][06]
   */
  async syncTime() {
    if (!this.tuyaEF00Manager) {
      this.log('[SYNC] Time sync not available for non-Tuya devices');
      return false;
    }
    
    try {
      const now = new Date();
      
      // Build time sync payload
      const payload = Buffer.from([
        now.getFullYear() - 2000,  // Year (0-99)
        now.getMonth() + 1,        // Month (1-12)
        now.getDate(),             // Day (1-31)
        now.getHours(),            // Hour (0-23)
        now.getMinutes(),          // Minute (0-59)
        now.getSeconds(),          // Second (0-59)
        (now.getDay() + 6) % 7     // Weekday (Monday=0, Sunday=6)
      ]);
      
      this.log('[SYNC] ⏰ Syncing time:', {
        datetime: now.toISOString(),
        payload: payload.toString('hex')
      });
      
      // Try all time sync DPs
      let success = false;
      for (const [name, dp] of Object.entries(this.timeSyncDPs)) {
        try {
          await this.tuyaEF00Manager.sendTuyaDP(dp, 0x00, payload); // Type 0x00 = RAW
          this.log(`[SYNC] ✅ Time synced via DP${dp} (${name})`);
          success = true;
          this.lastTimeSync = now;
          this.syncAttempts.time = 0;
          break;
        } catch (err) {
          this.log(`[SYNC] ⚠️  Time sync via DP${dp} failed:`, err.message);
        }
      }
      
      if (!success) {
        this.syncAttempts.time++;
        this.log(`[SYNC] ❌ All time sync DPs failed (attempt ${this.syncAttempts.time})`);
      }
      
      return success;
      
    } catch (err) {
      this.error('[SYNC] Time sync error:', err);
      return false;
    }
  }
  
  /**
   * Synchronize battery status (Tuya DP method)
   */
  async syncBattery() {
    if (!this.tuyaEF00Manager) {
      return await this.syncBatteryStandard();
    }
    
    try {
      this.log('[SYNC] 🔋 Syncing battery status...');
      
      // Request battery DPs
      let updated = false;
      
      for (const [name, dp] of Object.entries(this.batteryDPs)) {
        try {
          await this.tuyaEF00Manager.requestDP(dp);
          this.log(`[SYNC] Requested battery ${name} (DP${dp})`);
          updated = true;
        } catch (err) {
          // Silently continue, not all devices support all battery DPs
        }
      }
      
      if (updated) {
        this.lastBatterySync = new Date();
        this.syncAttempts.battery = 0;
      }
      
      return updated;
      
    } catch (err) {
      this.syncAttempts.battery++;
      this.log('[SYNC] Battery sync failed:', err.message);
      return false;
    }
  }
  
  /**
   * Synchronize battery status (Standard Zigbee method)
   */
  async syncBatteryStandard() {
    try {
      const endpoint = this.zclNode?.endpoints?.[1];
      if (!endpoint || !endpoint.clusters?.powerConfiguration) {
        return false;
      }
      
      this.log('[SYNC] 🔋 Reading standard battery status...');
      
      // Read battery attributes
      try {
        const attrs = await endpoint.clusters.powerConfiguration.readAttributes([
          'batteryPercentageRemaining',
          'batteryVoltage'
        ]);
        
        if (attrs.batteryPercentageRemaining !== undefined) {
          const percentage = attrs.batteryPercentageRemaining / 2;
          this.device.setCapabilityValue('measure_battery', parseFloat(percentage)).catch(() => {});
          this.log(`[SYNC] ✅ Battery: ${percentage}%`);
        }
        
        if (attrs.batteryVoltage !== undefined) {
          const voltage = attrs.batteryVoltage / 10;
          this.log(`[SYNC] Battery voltage: ${voltage}V`);
        }
        
        this.lastBatterySync = new Date();
        return true;
        
      } catch (err) {
        this.log('[SYNC] Battery read failed:', err.message);
        return false;
      }
      
    } catch (err) {
      this.error('[SYNC] Battery sync error:', err);
      return false;
    }
  }
  
  /**
   * Schedule automatic time synchronization
   * Runs daily at 3 AM
   */
  scheduleTimeSync() {
    if (this.timeSyncInterval) {
      clearTimeout(this.timeSyncInterval);
    }
    
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(3, 0, 0, 0);
    
    const msUntil3AM = tomorrow - now;
    
    this.log(`[SYNC] Next time sync in ${Math.round(msUntil3AM / 1000 / 60 / 60)}h`);
    
    this.timeSyncInterval = setTimeout(() => {
      this.syncTime();
      this.scheduleTimeSync(); // Reschedule
    }, msUntil3AM);
  }
  
  /**
   * Schedule automatic battery synchronization
   * Runs every hour
   */
  scheduleBatterySync() {
    if (this.batterySyncInterval) {
      clearInterval(this.batterySyncInterval);
    }
    
    // Sync every hour
    this.batterySyncInterval = setInterval(() => {
      this.syncBattery();
    }, 60 * 60 * 1000); // 1 hour
    
    this.log('[SYNC] Battery sync scheduled (every hour)');
  }
  
  /**
   * Start health checks
   * Monitors sync status and retries if needed
   */
  startHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // Check every 30 minutes
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30 * 60 * 1000); // 30 minutes
    
    this.log('[SYNC] Health checks started (every 30min)');
  }
  
  /**
   * Perform health check on sync status
   */
  async performHealthCheck() {
    this.log('[SYNC] 🏥 Performing health check...');
    
    const now = new Date();
    
    // Check time sync
    if (this.lastTimeSync) {
      const hoursSinceTimeSync = (now - this.lastTimeSync) / (1000 * 60 * 60);
      if (hoursSinceTimeSync > 48) {
        this.log('[SYNC] ⚠️  Time sync outdated (>48h), re-syncing...');
        await this.syncTime();
      }
    }
    
    // Check battery sync
    if (this.lastBatterySync) {
      const hoursSinceBatterySync = (now - this.lastBatterySync) / (1000 * 60 * 60);
      if (hoursSinceBatterySync > 2) {
        this.log('[SYNC] ⚠️  Battery sync outdated (>2h), re-syncing...');
        await this.syncBattery();
      }
    }
    
    // Check sync attempts
    if (this.syncAttempts.time > 5) {
      this.log('[SYNC] ⚠️  Time sync failing repeatedly, device may not support it');
      this.syncAttempts.time = 0; // Reset to avoid spam
    }
    
    if (this.syncAttempts.battery > 10) {
      this.log('[SYNC] ⚠️  Battery sync failing repeatedly');
      this.syncAttempts.battery = 0; // Reset
    }
    
    this.log('[SYNC] ✅ Health check complete');
  }
  
  /**
   * Get synchronization status
   */
  getStatus() {
    return {
      lastTimeSync: this.lastTimeSync,
      lastBatterySync: this.lastBatterySync,
      syncAttempts: this.syncAttempts,
      timeSyncScheduled: !!this.timeSyncInterval,
      batterySyncScheduled: !!this.batterySyncInterval,
      healthChecksActive: !!this.healthCheckInterval
    };
  }
  
  /**
   * Manually trigger time sync
   */
  async triggerTimeSync() {
    this.log('[SYNC] Manual time sync triggered');
    return await this.syncTime();
  }
  
  /**
   * Manually trigger battery sync
   */
  async triggerBatterySync() {
    this.log('[SYNC] Manual battery sync triggered');
    return await this.syncBattery();
  }
  
  /**
   * Cleanup
   */
  cleanup() {
    this.log('[SYNC] Cleaning up TuyaSyncManager...');
    
    if (this.timeSyncInterval) {
      clearTimeout(this.timeSyncInterval);
      this.timeSyncInterval = null;
    }
    
    if (this.batterySyncInterval) {
      clearInterval(this.batterySyncInterval);
      this.batterySyncInterval = null;
    }
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    this.removeAllListeners();
  }
}

module.exports = TuyaSyncManager;
