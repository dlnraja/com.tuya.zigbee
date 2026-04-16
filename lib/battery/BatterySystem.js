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
    // v5.8.69: Non-linear discharge curves replacing broken linear formula
    const mV = Math.round(voltage * 1000);
    const type = (this.options.type || 'CR2032').toUpperCase();
    
    let curve;
    if (type.includes('LI') && !type.includes('CR')) {
      // Li-ion rechargeable
      curve = [[4200,100],[4100,95],[4000,88],[3900,78],[3800,65],[3700,50],[3600,35],[3500,22],[3400,12],[3300,5],[3000,0]];
    } else if (type.includes('2XAA') || type.includes('2XAAA')) {
      // 2-cell alkaline (TRVs, locks)
      curve = [[3200,100],[3100,95],[3000,90],[2900,80],[2800,70],[2700,60],[2600,50],[2500,40],[2400,30],[2300,20],[2200,12],[2000,5],[1800,0]];
    } else if (type === 'AA' || type === 'AAA') {
      // Single-cell alkaline
      curve = [[1600,100],[1550,95],[1500,90],[1450,80],[1400,70],[1350,60],[1300,50],[1250,40],[1200,30],[1150,20],[1100,12],[1000,3],[900,0]];
    } else {
      // CR2032/CR2450/CR123A (most common, Z2M '3V_2100' profile)
      curve = [[3000,100],[2950,95],[2900,90],[2850,85],[2800,80],[2750,70],[2700,60],[2650,50],[2600,40],[2550,30],[2500,20],[2400,10],[2300,5],[2100,0]];
    }
    
    if (mV >= curve[0][0]) return 100;
    if (mV <= curve[curve.length - 1][0]) return 0;
    for (let i = 0; i < curve.length - 1; i++) {
      const [vH, pH] = curve[i];
      const [vL, pL] = curve[i + 1];
      if (mV >= vL && mV <= vH) {
        return Math.round(pL + ((mV - vL) / (vH - vL)) * (pH - pL));
      }
    }
    return 0;
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
    // v5.8.69: Fixed — Zigbee batteryPercentageRemaining is ALWAYS 0-200 scale
    // Previous code checked <= 100 first, treating 80 (=40%) as 80%
    
    if (rawValue > 100 && rawValue <= 200) {
      // Definitely Zigbee 0-200 scale (e.g., 160 = 80%)
      return Math.round(rawValue / 2);
    } else if (rawValue >= 0 && rawValue <= 100) {
      // Zigbee 0-200 scale (low range) — divide by 2
      // A fully charged device reports 200, so 100 = 50%
      return Math.round(rawValue / 2);
    } else {
      // Voltage (e.g., 30 = 3.0V) or raw ADC
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
    // v5.8.67: Corrected for actual Tuya Zigbee device battery configs
    const typeMap = {
      // Sensors
      'motion': 'CR2450',
      'contact': 'CR2032',
      'temperature': 'CR2032',
      'humidity': 'CR2032',
      'water_leak': 'CR2032',
      'smoke': 'CR123A',
      'gas': 'CR123A',
      
      // Remotes/Buttons
      'button': 'CR2032',
      'remote': 'CR2032',
      'scene_switch': 'CR2032',
      
      // Locks
      'lock': '4xAAA',
      'smart_lock': '4xAAA',
      
      // Other
      'thermostat': '2xAA',
      'trv': '2xAA',
      'climate': '2xAAA'
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
