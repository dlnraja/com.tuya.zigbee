'use strict';

/**
 * BatterySystem - UNIFIED Battery Management
 * 
 * Merges functionality from:
 * - BatteryCalculator: Battery percentage calculations
 * - BatteryHelper: Battery type detection and helpers
 * - BatteryManager: Battery reporting management
 * - BatteryMonitoringSystem: Advanced monitoring and health
 * 
 * Provides complete battery management solution
 */

class BatterySystem {
  
  constructor(device, options = {}) {
    this.device = device;
    this.options = {
      type: options.type || 'CR2032',
      reportingInterval: options.reportingInterval || 3600, // 1 hour
      minVoltage: options.minVoltage || 2.1,
      maxVoltage: options.maxVoltage || 3.0,
      enableHealthMonitoring: options.enableHealthMonitoring !== false,
      ...options
    };
    
    this.lastReading = null;
    this.history = [];
    this.health = {
      status: 'unknown',
      lastCheck: null,
      degradation: 0
    };
  }
  
  // ========================================================================
  // BATTERY PERCENTAGE CALCULATION (from BatteryCalculator)
  // ========================================================================
  
  /**
   * Calculate battery percentage from voltage
   * @param {number} voltage - Battery voltage (V)
   * @returns {number} Percentage (0-100)
   */
  calculatePercentageFromVoltage(voltage) {
    const { minVoltage, maxVoltage } = this.options;
    
    if (voltage >= maxVoltage) return 100;
    if (voltage <= minVoltage) return 0;
    
    // Linear interpolation
    const percentage = ((voltage - minVoltage) / (maxVoltage - minVoltage)) * 100;
    return Math.round(Math.max(0, Math.min(100, percentage)));
  }
  
  /**
   * Calculate voltage from battery percentage
   * @param {number} percentage - Battery percentage (0-100)
   * @returns {number} Voltage (V)
   */
  calculateVoltageFromPercentage(percentage) {
    const { minVoltage, maxVoltage } = this.options;
    
    const voltage = minVoltage + (percentage / 100) * (maxVoltage - minVoltage);
    return Math.round(voltage * 100) / 100;
  }
  
  /**
   * Normalize battery value from Zigbee
   * @param {number} rawValue - Raw value from cluster
   * @returns {number} Percentage (0-100)
   */
  normalizeBatteryValue(rawValue) {
    // Zigbee battery reporting can be:
    // - 0-100 (percentage)
    // - 0-200 (half-percent)
    // - Voltage * 10
    
    if (rawValue <= 100) {
      // Direct percentage
      return Math.round(rawValue);
    } else if (rawValue <= 200) {
      // Half-percent (0-200 → 0-100)
      return Math.round(rawValue / 2);
    } else {
      // Voltage (e.g., 30 = 3.0V)
      const voltage = rawValue / 10;
      return this.calculatePercentageFromVoltage(voltage);
    }
  }
  
  // ========================================================================
  // BATTERY TYPE DETECTION (from BatteryHelper)
  // ========================================================================
  
  /**
   * Detect battery type from device characteristics
   * @param {Object} deviceData - Device data from clusters
   * @returns {string} Battery type
   */
  detectBatteryType(deviceData = {}) {
    const { powerSource, manufacturer, deviceType } = deviceData;
    
    // Mains powered
    if (powerSource === 'mains' || powerSource === 1) {
      return 'AC';
    }
    
    // Battery types by device type
    const typeMap = {
      // Sensors
      'motion': 'CR2032',
      'contact': 'CR2032',
      'temperature': 'CR2450',
      'humidity': 'CR2450',
      'water_leak': 'CR2032',
      'smoke': '9V',
      'gas': 'AA',
      
      // Remotes/Buttons
      'button': 'CR2032',
      'remote': 'CR2450',
      'scene_switch': 'CR2450',
      
      // Locks
      'lock': 'AA',
      'smart_lock': 'AA',
      
      // Other
      'thermostat': 'AA',
      'trv': 'AA'
    };
    
    return typeMap[deviceType] || this.options.type || 'CR2032';
  }
  
  /**
   * Get battery specifications
   * @param {string} type - Battery type
   * @returns {Object} Battery specs
   */
  getBatterySpecs(type = null) {
    type = type || this.options.type;
    
    const specs = {
      'CR2032': { voltage: 3.0, minVoltage: 2.0, capacity: 225, typical: 3.0 },
      'CR2450': { voltage: 3.0, minVoltage: 2.0, capacity: 600, typical: 3.0 },
      'CR2477': { voltage: 3.0, minVoltage: 2.0, capacity: 1000, typical: 3.0 },
      'AA': { voltage: 1.5, minVoltage: 0.9, capacity: 2850, typical: 1.5 },
      'AAA': { voltage: 1.5, minVoltage: 0.9, capacity: 1200, typical: 1.5 },
      '9V': { voltage: 9.0, minVoltage: 6.0, capacity: 500, typical: 9.0 },
      'AC': { voltage: 230, minVoltage: 200, capacity: Infinity, typical: 230 }
    };
    
    return specs[type] || specs['CR2032'];
  }
  
  // ========================================================================
  // BATTERY REPORTING (from BatteryManager)
  // ========================================================================
  
  /**
   * Configure battery reporting
   * @param {Object} endpoint - Zigbee endpoint
   */
  async configureBatteryReporting(endpoint) {
    try {
      const cluster = endpoint.clusters.powerConfiguration;
      if (!cluster) {
        this.device.log('[Battery] No powerConfiguration cluster');
        return;
      }
      
      // Configure reporting (min: 5min, max: 1hour, change: 1%)
      await cluster.configureReporting({
        attributes: [{
          attribute: 'batteryPercentageRemaining',
          minimumReportInterval: 300,
          maximumReportInterval: this.options.reportingInterval,
          reportableChange: 1
        }]
      });
      
      this.device.log('[Battery] Reporting configured');
    } catch (err) {
      this.device.error('[Battery] Configure reporting failed:', err);
    }
  }
  
  /**
   * Read battery value
   * @param {Object} endpoint - Zigbee endpoint
   * @returns {number} Battery percentage
   */
  async readBattery(endpoint) {
    try {
      const cluster = endpoint.clusters.powerConfiguration;
      if (!cluster) return null;
      
      const { batteryPercentageRemaining } = await cluster.readAttributes([
        'batteryPercentageRemaining'
      ]);
      
      const percentage = this.normalizeBatteryValue(batteryPercentageRemaining);
      
      this.lastReading = {
        timestamp: Date.now(),
        percentage: percentage,
        raw: batteryPercentageRemaining
      };
      
      // Update device capability
      if (this.device.hasCapability('measure_battery')) {
        await this.device.setCapabilityValue('measure_battery', parseFloat(percentage));
      }
      
      // Update alarm if low battery
      if (this.device.hasCapability('alarm_battery')) {
        await this.device.setCapabilityValue('alarm_battery', percentage < 20);
      }
      
      this.device.log(`[Battery] ${percentage}%`);
      
      // Add to history
      this.addToHistory(percentage);
      
      return percentage;
    } catch (err) {
      this.device.error('[Battery] Read failed:', err);
      return null;
    }
  }
  
  // ========================================================================
  // HEALTH MONITORING (from BatteryMonitoringSystem)
  // ========================================================================
  
  /**
   * Add reading to history
   */
  addToHistory(percentage) {
    this.history.push({
      timestamp: Date.now(),
      percentage: percentage
    });
    
    // Keep only last 100 readings
    if (this.history.length > 100) {
      this.history = this.history.slice(-100);
    }
    
    // Check health
    if (this.options.enableHealthMonitoring) {
      this.checkBatteryHealth();
    }
  }
  
  /**
   * Check battery health and degradation
   */
  checkBatteryHealth() {
    if (this.history.length < 2) return;
    
    const now = Date.now();
    const recent = this.history.filter(h => now - h.timestamp < 7 * 24 * 60 * 60 * 1000); // 7 days
    
    if (recent.length < 2) return;
    
    // Calculate degradation rate
    const first = recent[0];
    const last = recent[recent.length - 1];
    const timeDiff = last.timestamp - first.timestamp;
    const percentageDiff = first.percentage - last.percentage;
    
    if (timeDiff > 0 && percentageDiff > 0) {
      // Degradation per day
      const degradationPerDay = (percentageDiff / timeDiff) * 24 * 60 * 60 * 1000;
      this.health.degradation = degradationPerDay;
      
      // Estimate remaining days
      const remainingDays = last.percentage / degradationPerDay;
      
      // Health status
      if (remainingDays < 7) {
        this.health.status = 'critical';
      } else if (remainingDays < 30) {
        this.health.status = 'low';
      } else if (remainingDays < 90) {
        this.health.status = 'fair';
      } else {
        this.health.status = 'good';
      }
      
      this.health.lastCheck = now;
      this.health.estimatedDaysRemaining = Math.round(remainingDays);
      
      this.device.log(`[Battery Health] ${this.health.status} - ${this.health.estimatedDaysRemaining} days remaining`);
    }
  }
  
  /**
   * Get battery health report
   * @returns {Object} Health report
   */
  getHealthReport() {
    return {
      current: this.lastReading ? this.lastReading.percentage : null,
      health: this.health.status,
      degradationPerDay: this.health.degradation,
      estimatedDaysRemaining: this.health.estimatedDaysRemaining,
      lastCheck: this.health.lastCheck,
      historySize: this.history.length,
      batteryType: this.options.type
    };
  }
  
  // ========================================================================
  // LIFECYCLE
  // ========================================================================
  
  /**
   * Initialize battery system
   * @param {Object} endpoint - Zigbee endpoint
   */
  async initialize(endpoint) {
    this.device.log('[BatterySystem] Initializing...');
    
    // Configure reporting
    await this.configureBatteryReporting(endpoint);
    
    // Initial reading
    await this.readBattery(endpoint);
    
    // Setup polling (backup)
    this.startPolling(endpoint);
    
    this.device.log('[BatterySystem] Initialized');
  }
  
  /**
   * Start polling (backup mechanism)
   */
  startPolling(endpoint) {
    if (this.pollingInterval) {
      this.device.homey.clearInterval(this.pollingInterval);
    }
    
    this.pollingInterval = this.device.homey.setInterval(async () => {
      await this.readBattery(endpoint);
    }, this.options.reportingInterval * 1000);
  }
  
  /**
   * Destroy battery system
   */
  destroy() {
    if (this.pollingInterval) {
      this.device.homey.clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    this.device.log('[BatterySystem] Destroyed');
  }
}

module.exports = BatterySystem;
