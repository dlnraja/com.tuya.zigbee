'use strict';

/**
 * ADVANCED ANALYTICS & INSIGHTS
 * 
 * Rich data visualization and tracking system
 * - Device health monitoring
 * - Energy consumption analytics
 * - Network quality tracking
 * - Predictive maintenance
 * - Usage patterns analysis
 */

const { EventEmitter } = require('events');

class AdvancedAnalytics extends EventEmitter {
  
  constructor(homey) {
    super();
    this.homey = homey;
    this.insights = new Map();
    this.deviceMetrics = new Map();
    this.initialized = false;
  }
  
  /**
   * Initialize all insights logs
   */
  async initialize() {
    if (this.initialized) return;
    
    this.homey.log('[Analytics] Initializing advanced analytics...');
    
    try {
      // Core insights
      await this.createInsight('battery_health', {
        title: { en: 'Battery Health', fr: 'Santé Batterie' },
        type: 'number',
        units: '%',
        decimals: 0,
        chart: 'line'
      });
      
      await this.createInsight('device_uptime', {
        title: { en: 'Device Uptime', fr: 'Disponibilité' },
        type: 'number',
        units: '%',
        decimals: 1,
        chart: 'line'
      });
      
      await this.createInsight('zigbee_lqi', {
        title: { en: 'Zigbee Link Quality', fr: 'Qualité Lien Zigbee' },
        type: 'number',
        units: '',
        decimals: 0,
        chart: 'line'
      });
      
      await this.createInsight('command_success_rate', {
        title: { en: 'Command Success Rate', fr: 'Taux Succès Commandes' },
        type: 'number',
        units: '%',
        decimals: 1,
        chart: 'line'
      });
      
      // Energy insights
      await this.createInsight('energy_daily', {
        title: { en: 'Daily Energy', fr: 'Énergie Quotidienne' },
        type: 'number',
        units: 'Wh',
        decimals: 0,
        chart: 'column'
      });
      
      await this.createInsight('energy_cost', {
        title: { en: 'Energy Cost', fr: 'Coût Énergétique' },
        type: 'number',
        units: '€',
        decimals: 2,
        chart: 'column'
      });
      
      // Performance insights
      await this.createInsight('response_time', {
        title: { en: 'Response Time', fr: 'Temps de Réponse' },
        type: 'number',
        units: 'ms',
        decimals: 0,
        chart: 'line'
      });
      
      await this.createInsight('network_latency', {
        title: { en: 'Network Latency', fr: 'Latence Réseau' },
        type: 'number',
        units: 'ms',
        decimals: 0,
        chart: 'line'
      });
      
      // Device health insights
      await this.createInsight('device_errors', {
        title: { en: 'Device Errors', fr: 'Erreurs Appareil' },
        type: 'number',
        units: '',
        decimals: 0,
        chart: 'column'
      });
      
      await this.createInsight('reconnections', {
        title: { en: 'Reconnections', fr: 'Reconnexions' },
        type: 'number',
        units: '',
        decimals: 0,
        chart: 'column'
      });
      
      this.initialized = true;
      this.homey.log('[Analytics] ✅ Advanced analytics initialized');
      
    } catch (err) {
      this.homey.error('[Analytics] Failed to initialize:', err);
    }
  }
  
  /**
   * Create or get insight log
   */
  async createInsight(id, options) {
    try {
      const log = await this.homey.insights.createLog(id, options);
      this.insights.set(id, log);
      return log;
    } catch (err) {
      // Already exists
      try {
        const log = await this.homey.insights.getLog(id);
        this.insights.set(id, log);
        return log;
      } catch (getErr) {
        this.homey.error(`[Analytics] Failed to create/get insight ${id}:`, getErr);
        return null;
      }
    }
  }
  
  /**
   * Track device metric
   */
  async trackMetric(deviceId, metric, value) {
    if (!this.initialized) return;
    
    try {
      const log = this.insights.get(metric);
      if (!log) return;
      
      await log.createEntry(value);
      
      // Store in device metrics
      if (!this.deviceMetrics.has(deviceId)) {
        this.deviceMetrics.set(deviceId, {});
      }
      
      const metrics = this.deviceMetrics.get(deviceId);
      metrics[metric] = {
        value,
        timestamp: Date.now()
      };
      
      // Emit event for real-time monitoring
      this.emit('metric', { deviceId, metric, value });
      
    } catch (err) {
      this.homey.error(`[Analytics] Failed to track metric ${metric}:`, err);
    }
  }
  
  /**
   * Calculate battery health score
   */
  calculateBatteryHealth(device) {
    const battery = device.getCapabilityValue('measure_battery');
    if (battery === null) return null;
    
    // Simple health score based on battery level
    let health = 100;
    
    if (battery < 10) health = 20;
    else if (battery < 20) health = 50;
    else if (battery < 50) health = 80;
    
    return health;
  }
  
  /**
   * Calculate device uptime percentage
   */
  calculateUptime(deviceId) {
    const metrics = this.deviceMetrics.get(deviceId);
    if (!metrics) return 100;
    
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);
    
    // Count reconnections in last 24h
    const reconnections = metrics.reconnections || 0;
    
    // Calculate uptime percentage
    const downtime = reconnections * 5; // Assume 5 min per reconnection
    const uptime = Math.max(0, 100 - (downtime / 1440 * 100));
    
    return Math.round(uptime * 10) / 10;
  }
  
  /**
   * Analyze energy consumption
   */
  async analyzeEnergy(device) {
    if (!device.hasCapability('measure_power')) return null;
    
    const power = device.getCapabilityValue('measure_power');
    if (power === null) return null;
    
    // Calculate daily energy (Wh)
    const dailyEnergy = Math.round(power * 24);
    
    // Calculate cost (assuming 0.20€/kWh)
    const cost = Math.round(dailyEnergy * 0.20 / 1000 * 100) / 100;
    
    await this.trackMetric(device.getData().id, 'energy_daily', dailyEnergy);
    await this.trackMetric(device.getData().id, 'energy_cost', cost);
    
    return { dailyEnergy, cost };
  }
  
  /**
   * Track command execution
   */
  async trackCommand(deviceId, success, duration) {
    const metrics = this.deviceMetrics.get(deviceId) || {};
    
    // Update success rate
    if (!metrics.commands) {
      metrics.commands = { success: 0, failed: 0 };
    }
    
    if (success) {
      metrics.commands.success++;
    } else {
      metrics.commands.failed++;
    }
    
    const total = metrics.commands.success + metrics.commands.failed;
    const successRate = Math.round((metrics.commands.success / total) * 100);
    
    await this.trackMetric(deviceId, 'command_success_rate', successRate);
    
    // Track response time
    if (duration) {
      await this.trackMetric(deviceId, 'response_time', duration);
    }
    
    this.deviceMetrics.set(deviceId, metrics);
  }
  
  /**
   * Get device analytics summary
   */
  getDeviceSummary(deviceId) {
    const metrics = this.deviceMetrics.get(deviceId);
    if (!metrics) {
      return {
        health: 'unknown',
        uptime: 100,
        successRate: 100,
        lastUpdate: null
      };
    }
    
    const successRate = metrics.command_success_rate?.value || 100;
    const uptime = metrics.device_uptime?.value || 100;
    
    let health = 'excellent';
    if (successRate < 80 || uptime < 95) health = 'poor';
    else if (successRate < 95 || uptime < 98) health = 'good';
    
    return {
      health,
      uptime,
      successRate,
      lastUpdate: metrics.timestamp || Date.now()
    };
  }
  
  /**
   * Generate insights report
   */
  async generateReport() {
    const devices = Array.from(this.deviceMetrics.keys());
    
    const report = {
      timestamp: Date.now(),
      totalDevices: devices.length,
      health: {
        excellent: 0,
        good: 0,
        poor: 0,
        unknown: 0
      },
      averageUptime: 0,
      averageSuccessRate: 0,
      totalEnergy: 0,
      totalCost: 0
    };
    
    let uptimeSum = 0;
    let successRateSum = 0;
    
    for (const deviceId of devices) {
      const summary = this.getDeviceSummary(deviceId);
      report.health[summary.health]++;
      uptimeSum += summary.uptime;
      successRateSum += summary.successRate;
      
      const metrics = this.deviceMetrics.get(deviceId);
      if (metrics.energy_daily) {
        report.totalEnergy += metrics.energy_daily.value;
      }
      if (metrics.energy_cost) {
        report.totalCost += metrics.energy_cost.value;
      }
    }
    
    if (devices.length > 0) {
      report.averageUptime = Math.round(uptimeSum / devices.length * 10) / 10;
      report.averageSuccessRate = Math.round(successRateSum / devices.length * 10) / 10;
    }
    
    return report;
  }
  
  /**
   * Cleanup old data
   */
  async cleanup() {
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    
    for (const [deviceId, metrics] of this.deviceMetrics.entries()) {
      if (metrics.timestamp && (now - metrics.timestamp > maxAge)) {
        this.deviceMetrics.delete(deviceId);
      }
    }
  }
}

module.exports = AdvancedAnalytics;
