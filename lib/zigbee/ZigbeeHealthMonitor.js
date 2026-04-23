'use strict';
const CI = require('../utils/CaseInsensitiveMatcher');
const { safeDivide, safeMultiply } = require('../utils/tuyaUtils.js');

/**
 * ZigbeeHealthMonitor - Monitors Zigbee network health and detects issues.
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
        '0x87': 0,
        '0x8B': 0,
        '0x32': 0,
        'timeout': 0,
        'offline': 0
      },
      network: {
        strength: 'unknown',
        routerCount: 0,
        endDeviceCount: 0
      },
      lastCheck: null,
      lastCleanup: null
    };
    
    this.healthHistory = [];
    this.maxHistory = 100;
    
    this.thresholds = {
      maxDevices: 100,
      warningDevices: 90,
      maxError0x87: 10,
      maxLostDevices: 5,
      inactiveDeviceDays: 30
    };
  }

  async checkHealth() {
    const start = Date.now();
    this.log('[Health] Starting health check...');
    
    try {
      const allDevices = await this.getAllZigbeeDevices();
      await this.updateDeviceMetrics(allDevices);
      await this.updateNetworkMetrics(allDevices);
      await this.detectIssues();
      
      this.metrics.lastCheck = Date.now();
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

  async updateDeviceMetrics(devices) {
    this.metrics.totalDevices = devices.length;
    this.metrics.activeDevices = 0;
    this.metrics.unavailableDevices = 0;
    this.metrics.xiaomiDevices = 0;
    this.metrics.tuyaDevices = 0;
    
    for (const device of devices) {
      if (device.getAvailable()) {
        this.metrics.activeDevices++;
      } else {
        this.metrics.unavailableDevices++;
      }
      
      const manufacturerName = device.getData().manufacturerName || '';
      const mfrLower = CI.normalize(manufacturerName);
      if (mfrLower.includes('lumi')) this.metrics.xiaomiDevices++;
      if (mfrLower.includes('_tz')) this.metrics.tuyaDevices++;
    }
  }

  async updateNetworkMetrics(devices) {
    this.metrics.network.routerCount = 0;
    this.metrics.network.endDeviceCount = 0;
    
    for (const device of devices) {
      const deviceType = device.getStoreValue('zigbee_device_type');
      if (deviceType === 'router') this.metrics.network.routerCount++;
      else if (deviceType === 'endDevice') this.metrics.network.endDeviceCount++;
    }
    
    const routerRatio = safeDivide(this.metrics.network.routerCount, this.metrics.totalDevices);
    if (routerRatio > 0.3) this.metrics.network.strength = 'excellent';
    else if (routerRatio > 0.2) this.metrics.network.strength = 'good';
    else if (routerRatio > 0.1) this.metrics.network.strength = 'fair';
    else this.metrics.network.strength = 'poor';
  }

  async detectIssues() {
    this.currentIssues = [];
    this.suggestions = [];
    
    if (this.metrics.totalDevices >= this.thresholds.maxDevices) {
      this.currentIssues.push({ severity: 'critical', code: 'DEVICE_LIMIT_REACHED', message: `Device limit reached (${this.metrics.totalDevices}/${this.thresholds.maxDevices})` });
      this.suggestions.push('Remove unused devices immediately');
    }
    
    if (this.metrics.unavailableDevices > this.thresholds.maxLostDevices) {
      this.currentIssues.push({ severity: 'warning', code: 'HIGH_DEVICE_LOSS', message: `${this.metrics.unavailableDevices} devices unavailable` });
      this.suggestions.push('Check Zigbee mesh health');
    }
  }

  getOverallStatus() {
    if (this.currentIssues?.some(i => i.severity === 'critical')) return 'critical';
    if (this.currentIssues?.some(i => i.severity === 'warning')) return 'warning';
    return 'healthy';
  }

  reportError(errorCode, details = {}) {
    if (this.metrics.errors[errorCode] !== undefined) {
      this.metrics.errors[errorCode]++;
      this.log(`[Health] Error ${errorCode} reported`);
    }
  }

  addToHistory() {
    this.healthHistory.push({
      timestamp: Date.now(),
      status: this.getOverallStatus(),
      totalDevices: this.metrics.totalDevices,
      activeDevices: this.metrics.activeDevices,
      unavailableDevices: this.metrics.unavailableDevices,
      errors: { ...this.metrics.errors }
    });
    if (this.healthHistory.length > this.maxHistory) {
      this.healthHistory = this.healthHistory.slice(-this.maxHistory);
    }
  }

  async getAllZigbeeDevices() {
    const drivers = this.homey.drivers.getDrivers();
    const allDevices = [];
    for (const driver of Object.values(drivers)) {
      allDevices.push(...driver.getDevices());
    }
    return allDevices;
  }

  getReport() {
    return {
      status: this.getOverallStatus(),
      metrics: this.metrics,
      issues: this.currentIssues,
      suggestions: this.suggestions
    };
  }

  log(...args) { console.log('[ZigbeeHealthMonitor]', ...args); }
  error(...args) { console.error('[ZigbeeHealthMonitor]', ...args); }
}

module.exports = ZigbeeHealthMonitor;
