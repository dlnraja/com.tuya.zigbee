'use strict';

/**
 * ZigbeeHealthMonitor - Inspired by ZiGate
 * 
 * Monitors Zigbee network health and detects issues:
 * - Device count and limits
 * - Error patterns (0x87, 0x8B, routing errors)
 * - Lost devices tracking
 * - Automatic suggestions and fixes
 * 
 * Based on ZiGate issues #38, #33, #15, #91
 */

class ZigbeeHealthMonitor {
  
  constructor(homey) {
    this.homey = homey;
    
    this.metrics = {
      totalDevices: 0,
      activeDevices: 0,
      unavailableDevices: 0,
      xiaomiDevices: 0,
      tuyaDevices: 0,
      
      errors: {
        '0x87': 0,  // No free entries in extended address table
        '0x8B': 0,  // Broadcast transaction table overflow
        '0x32': 0,  // Routing table errors
        'timeout': 0, // Communication timeouts
        'offline': 0  // Device offline events
      },
      
      network: {
        strength: 'unknown', // excellent, good, fair, poor
        routerCount: 0,
        endDeviceCount: 0
      },
      
      lastCheck: null,
      lastCleanup: null
    };
    
    this.healthHistory = [];
    this.maxHistory = 100;
    
    // Thresholds
    this.thresholds = {
      maxDevices: 100, // Homey limit
      warningDevices: 90,
      maxError0x87: 10,
      maxLostDevices: 5,
      inactiveDeviceDays: 30
    };
  }
  
  // ========================================================================
  // HEALTH CHECK
  // ========================================================================
  
  /**
   * Perform complete health check
   */
  async checkHealth() {
    const start = Date.now();
    this.log('[Health] Starting health check...');
    
    try {
      // Get all devices
      const allDevices = await this.getAllZigbeeDevices();
      
      // Update metrics
      await this.updateDeviceMetrics(allDevices);
      await this.updateNetworkMetrics(allDevices);
      await this.detectIssues();
      
      this.metrics.lastCheck = Date.now();
      
      // Add to history
      this.addToHistory();
      
      const duration = Date.now() - start;
      this.log(`[Health] Check complete in ${duration}ms`);
      
      return {
        status: this.getOverallStatus(),
        metrics: this.metrics,
        issues: this.currentIssues || [],
        suggestions: this.suggestions || []
      };
      
    } catch (err) {
      this.error('[Health] Check failed:', err);
      return { status: 'error', error: err.message };
    }
  }
  
  /**
   * Update device metrics
   */
  async updateDeviceMetrics(devices) {
    this.metrics.totalDevices = devices.length;
    this.metrics.activeDevices = 0;
    this.metrics.unavailableDevices = 0;
    this.metrics.xiaomiDevices = 0;
    this.metrics.tuyaDevices = 0;
    
    for (const device of devices) {
      // Availability
      const available = device.getAvailable();
      if (available) {
        this.metrics.activeDevices++;
      } else {
        this.metrics.unavailableDevices++;
      }
      
      // Manufacturer detection
      const manufacturerName = device.getData().manufacturerName || '';
      const mfrLower = (manufacturerName || '').toLowerCase();
      if (mfrLower.includes('lumi')) {
        this.metrics.xiaomiDevices++;
      }
      if (mfrLower.includes('_tz')) {
        this.metrics.tuyaDevices++;
      }
    }
  }
  
  /**
   * Update network metrics
   */
  async updateNetworkMetrics(devices) {
    this.metrics.network.routerCount = 0;
    this.metrics.network.endDeviceCount = 0;
    
    for (const device of devices) {
      const deviceType = device.getStoreValue('zigbee_device_type');
      
      if (deviceType === 'router') {
        this.metrics.network.routerCount++;
      } else if (deviceType === 'endDevice') {
        this.metrics.network.endDeviceCount++;
      }
    }
    
    // Estimate network strength
    const routerRatio = this.metrics.network.routerCount / this.metrics.totalDevices;
    
    if (routerRatio > 0.3) {
      this.metrics.network.strength = 'excellent';
    } else if (routerRatio > 0.2) {
      this.metrics.network.strength = 'good';
    } else if (routerRatio > 0.1) {
      this.metrics.network.strength = 'fair';
    } else {
      this.metrics.network.strength = 'poor';
    }
  }
  
  // ========================================================================
  // ISSUE DETECTION
  // ========================================================================
  
  /**
   * Detect issues and generate suggestions
   */
  async detectIssues() {
    this.currentIssues = [];
    this.suggestions = [];
    
    // Check device limit
    if (this.metrics.totalDevices >= this.thresholds.maxDevices) {
      this.currentIssues.push({
        severity: 'critical',
        code: 'DEVICE_LIMIT_REACHED',
        message: `Device limit reached (${this.metrics.totalDevices}/${this.thresholds.maxDevices})`
      });
      this.suggestions.push('Remove unused devices immediately or extend coordinator');
    } else if (this.metrics.totalDevices >= this.thresholds.warningDevices) {
      this.currentIssues.push({
        severity: 'warning',
        code: 'DEVICE_LIMIT_WARNING',
        message: `Approaching device limit (${this.metrics.totalDevices}/${this.thresholds.maxDevices})`
      });
      this.suggestions.push('Consider cleanup of inactive devices');
    }
    
    // Check lost devices
    if (this.metrics.unavailableDevices > this.thresholds.maxLostDevices) {
      this.currentIssues.push({
        severity: 'warning',
        code: 'HIGH_DEVICE_LOSS',
        message: `${this.metrics.unavailableDevices} devices unavailable`
      });
      this.suggestions.push('Check Zigbee mesh health');
      this.suggestions.push('Add more router devices');
      this.suggestions.push('Check for interference');
    }
    
    // Check 0x87 errors (Address table full)
    if (this.metrics.errors['0x87'] > this.thresholds.maxError0x87) {
      this.currentIssues.push({
        severity: 'critical',
        code: 'ADDRESS_TABLE_FULL',
        message: `Frequent 0x87 errors (${this.metrics.errors['0x87']})`
      });
      this.suggestions.push('Run address table cleanup');
      this.suggestions.push('Remove devices that re-paired multiple times');
    }
    
    // Check network strength
    if (this.metrics.network.strength === 'poor') {
      this.currentIssues.push({
        severity: 'warning',
        code: 'WEAK_MESH',
        message: `Poor mesh network (${this.metrics.network.routerCount} routers)`
      });
      this.suggestions.push(`Add more router devices (currently ${this.metrics.network.routerCount})`);
    }
    
    // Check Xiaomi device count (ZiGate Issue #38)
    if (this.metrics.xiaomiDevices > 25) {
      this.currentIssues.push({
        severity: 'info',
        code: 'MANY_XIAOMI_DEVICES',
        message: `${this.metrics.xiaomiDevices} Xiaomi devices detected`
      });
      this.suggestions.push('Enable Xiaomi keep-alive system');
      this.suggestions.push('Monitor for device loss patterns');
    }
  }
  
  /**
   * Get overall status
   */
  getOverallStatus() {
    if (this.currentIssues.some(i => i.severity === 'critical')) {
      return 'critical';
    }
    if (this.currentIssues.some(i => i.severity === 'warning')) {
      return 'warning';
    }
    if (this.currentIssues.some(i => i.severity === 'info')) {
      return 'info';
    }
    return 'healthy';
  }
  
  // ========================================================================
  // ERROR TRACKING
  // ========================================================================
  
  /**
   * Report error
   */
  reportError(errorCode, details = {}) {
    if (this.metrics.errors[errorCode] !== undefined) {
      this.metrics.errors[errorCode]++;
      this.log(`[Health] Error ${errorCode} reported (total: ${this.metrics.errors[errorCode]})`);
      
      // Auto-actions for critical errors
      if (errorCode === '0x87' && this.metrics.errors['0x87'] > this.thresholds.maxError0x87) {
        this.handle0x87Error();
      }
    }
  }
  
  /**
   * Handle 0x87 error (Address table full)
   */
  async handle0x87Error() {
    this.error('[Health] Critical: Address table full (0x87)');
    
    // Check auto-cleanup setting
    const autoCleanup = await this.homey.settings.get('auto_cleanup_0x87');
    
    if (autoCleanup) {
      this.log('[Health] Auto-cleanup enabled, starting cleanup...');
      await this.cleanupInactiveDevices();
    } else {
      // Notify user
      await this.homey.notifications.createNotification({
        excerpt: 'Zigbee address table full. Cleanup recommended. Enable auto-cleanup in settings.'
      });
    }
  }
  
  // ========================================================================
  // CLEANUP
  // ========================================================================
  
  /**
   * Cleanup inactive devices
   */
  async cleanupInactiveDevices() {
    this.log('[Health] Starting inactive device cleanup...');
    
    const devices = await this.getAllZigbeeDevices();
    const inactiveDevices = [];
    
    const now = Date.now();
    const maxAge = this.thresholds.inactiveDeviceDays * 24 * 60 * 60 * 1000;
    
    for (const device of devices) {
      const lastSeen = device.getStoreValue('last_seen');
      if (!lastSeen) continue;
      
      const age = now - lastSeen;
      if (age > maxAge) {
        inactiveDevices.push({
          device: device,
          age: age,
          daysSinceLastSeen: Math.floor(age / (24 * 60 * 60 * 1000))
        });
      }
    }
    
    this.log(`[Health] Found ${inactiveDevices.length} inactive devices`);
    
    // Log candidates
    for (const item of inactiveDevices) {
      this.log(`  - ${item.device.getName()}: ${item.daysSinceLastSeen} days inactive`);
    }
    
    this.metrics.lastCleanup = Date.now();
    
    return inactiveDevices;
  }
  
  // ========================================================================
  // HISTORY
  // ========================================================================
  
  /**
   * Add current state to history
   */
  addToHistory() {
    this.healthHistory.push({
      timestamp: Date.now(),
      status: this.getOverallStatus(),
      totalDevices: this.metrics.totalDevices,
      activeDevices: this.metrics.activeDevices,
      unavailableDevices: this.metrics.unavailableDevices,
      errors: { ...this.metrics.errors }
    });
    
    // Keep only last N entries
    if (this.healthHistory.length > this.maxHistory) {
      this.healthHistory = this.healthHistory.slice(-this.maxHistory);
    }
  }
  
  /**
   * Get health history
   */
  getHistory(maxEntries = 50) {
    return this.healthHistory.slice(-maxEntries);
  }
  
  // ========================================================================
  // UTILITIES
  // ========================================================================
  
  /**
   * Get all Zigbee devices
   */
  async getAllZigbeeDevices() {
    const drivers = this.homey.drivers.getDrivers();
    const allDevices = [];
    
    for (const driver of Object.values(drivers)) {
      const devices = driver.getDevices();
      allDevices.push(...devices);
    }
    
    return allDevices;
  }
  
  /**
   * Get report for display
   */
  getReport() {
    const status = this.getOverallStatus();
    const statusEmoji = {
      'healthy': '✅',
      'info': 'ℹ️',
      'warning': '⚠️',
      'critical': '🔴'
    }[status] || '❓';
    
    return {
      status: status,
      emoji: statusEmoji,
      summary: `${statusEmoji} ${this.metrics.activeDevices}/${this.metrics.totalDevices} devices active`,
      details: this.metrics,
      issues: this.currentIssues,
      suggestions: this.suggestions,
      lastCheck: this.metrics.lastCheck
    };
  }
  
  // Logging helpers
  log(...args) {
    console.log('[ZigbeeHealthMonitor]', ...args);
  }
  
  error(...args) {
    console.error('[ZigbeeHealthMonitor]', ...args);
  }
}

module.exports = ZigbeeHealthMonitor;
