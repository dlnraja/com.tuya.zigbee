'use strict';

/**
 * BATTERY MANAGER V2 (Simplified)
 *
 * AUDIT V2 CHANGES:
 * - Simple, predictable battery reading
 * - Priority: Tuya DP → Cluster 0x0001 → null
 * - No aggressive polling (1-4h intervals, not 5 minutes)
 * - No fictional 100% values
 * - Aligns with stable apps (Tuya, Xiaomi, Hue)
 *
 * Philosophy:
 * - Let Homey handle measure_battery naturally
 * - Don't over-engineer battery reading
 * - Reporting > Polling when possible
 */

class BatteryManagerV2 {

  /**
   * Battery polling intervals by device type
   * Much more reasonable than 5 minutes!
   */
  static BATTERY_INTERVALS = {
    motion: 4 * 3600 * 1000,      // 4 hours
    contact: 4 * 3600 * 1000,     // 4 hours
    climate: 2 * 3600 * 1000,     // 2 hours
    button: 6 * 3600 * 1000,      // 6 hours
    remote: 6 * 3600 * 1000,      // 6 hours
    default: 4 * 3600 * 1000      // 4 hours fallback
  };

  /**
   * Simple voltage to percentage conversion
   * Good enough for most use cases
   */
  static VOLTAGE_TO_PERCENT = {
    // CR2032/CR2450 (3V lithium)
    '3V': [
      { voltage: 3.0, percent: 100 },
      { voltage: 2.9, percent: 90 },
      { voltage: 2.8, percent: 75 },
      { voltage: 2.7, percent: 50 },
      { voltage: 2.6, percent: 30 },
      { voltage: 2.5, percent: 20 },
      { voltage: 2.4, percent: 10 },
      { voltage: 2.3, percent: 5 },
      { voltage: 2.0, percent: 0 }
    ],

    // AA/AAA (1.5V alkaline)
    '1.5V': [
      { voltage: 1.5, percent: 100 },
      { voltage: 1.4, percent: 90 },
      { voltage: 1.35, percent: 75 },
      { voltage: 1.3, percent: 50 },
      { voltage: 1.2, percent: 25 },
      { voltage: 1.1, percent: 10 },
      { voltage: 1.0, percent: 0 }
    ]
  };

  constructor(device) {
    this.device = device;
    this.pollInterval = null;
  }

  /**
   * Read battery level
   * Priority: Tuya DP → ZCL Cluster 0x0001 → null
   */
  async readBattery() {
    try {
      // Priority 1: Tuya DP (for TS0601, TS004x, TS0215A, etc.)
      if (this.isTuyaDpDevice()) {
        const batteryDp = this.getTuyaBatteryDp();
        if (batteryDp) {
          const value = await this.readTuyaDpBattery(batteryDp);
          if (value !== null) {
            this.device.log(`[BATTERY-V2] Read from Tuya DP ${batteryDp}: ${value}%`);
            return value;
          }
        }
      }

      // Priority 2: ZCL Power Configuration (cluster 0x0001)
      if (this.hasCluster(0x0001)) {
        const value = await this.readZclBattery();
        if (value !== null) {
          this.device.log(`[BATTERY-V2] Read from ZCL cluster 0x0001: ${value}%`);
          return value;
        }
      }

      // Priority 3: No battery or unable to read
      this.device.log('[BATTERY-V2] No battery reading available');
      return null;

    } catch (err) {
      this.device.error('[BATTERY-V2] Read failed:', err.message);
      return null;
    }
  }

  /**
   * Check if device uses Tuya DP protocol
   */
  isTuyaDpDevice() {
    const modelId = this.device.getData().modelId || '';
    const manufacturerName = this.device.getData().manufacturerName || '';

    // TS0601 = Tuya DP devices
    // _TZE2xx_ = Tuya DP manufacturer names
    const mfrLower = (manufacturerName || '').toLowerCase();
    return modelId === 'TS0601' ||
      mfrLower.startsWith('_tze2') ||
      mfrLower.startsWith('_tze6');
  }

  /**
   * Get Tuya DP for battery (from settings or defaults)
   */
  getTuyaBatteryDp() {
    // Try from tuya_dp_configuration settings
    const dpConfig = this.device.getStoreValue('tuya_dp_configuration');
    if (dpConfig) {
      for (const [dp, capability] of Object.entries(dpConfig)) {
        if (capability === 'measure_battery' || capability === 'battery_percentage') {
          return parseInt(dp);
        }
      }
    }

    // Common defaults
    const modelId = this.device.getData().modelId;
    const mfrName = this.device.getData().manufacturerName || '';

    // TS004x buttons: DP 4
    if (modelId && modelId.startsWith('TS004')) {
      return 4;
    }

    // TS0215A SOS: DP 15
    if (modelId === 'TS0215A') {
      return 15;
    }

    // TS0601 climate/soil/radar: usually DP 4 or 14
    if (modelId === 'TS0601') {
      // Check manufacturer-specific
      if (mfrName.includes('oitavov2')) return 4; // Soil sensor
      if (mfrName.includes('vvmbj46n')) return 4; // Climate monitor
      if (mfrName.includes('rhgsbacq')) return 14; // Radar
      return 4; // Default for most TS0601
    }

    return null;
  }

  /**
   * Read battery from Tuya DP
   */
  async readTuyaDpBattery(dp) {
    try {
      // Note: Actual Tuya DP reading depends on zigbee-clusters API
      // This is a placeholder - needs correct API call

      // TODO: Fix dataQuery API (AUDIT V2 critical)
      // Old API: { dp: 4 }
      // New API: { dpValues: [{ dp: 4, datatype: 2, value: 0 }] }

      this.device.log(`[BATTERY-V2] TODO: Implement Tuya DP ${dp} reading with correct API`);
      return null;

    } catch (err) {
      this.device.error(`[BATTERY-V2] Tuya DP ${dp} read failed:`, err.message);
      return null;
    }
  }

  /**
   * Read battery from ZCL Power Configuration cluster
   */
  async readZclBattery() {
    try {
      const endpoint = this.device.zclNode?.endpoints?.[1];
      if (!endpoint) return null;

      const cluster = endpoint.clusters?.powerConfiguration;
      if (!cluster) return null;

      // Read batteryPercentageRemaining attribute
      const { batteryPercentageRemaining } = await cluster.readAttributes(['batteryPercentageRemaining']);

      if (batteryPercentageRemaining !== null && batteryPercentageRemaining !== undefined) {
        // ZCL reports 0-200 (0-100% in steps of 0.5%)
        const percent = Math.round(batteryPercentageRemaining / 2);
        return Math.max(0, Math.min(100, percent));
      }

      // Fallback: read batteryVoltage and convert
      const { batteryVoltage } = await cluster.readAttributes(['batteryVoltage']);
      if (batteryVoltage) {
        // Voltage in decivolts (e.g., 30 = 3.0V)
        const voltage = batteryVoltage / 10;
        return this.voltageToPercent(voltage);
      }

      return null;

    } catch (err) {
      this.device.error('[BATTERY-V2] ZCL read failed:', err.message);
      return null;
    }
  }

  /**
   * Convert voltage to percentage (simple linear approximation)
   */
  voltageToPercent(voltage) {
    // Detect battery type from voltage range
    const curve = voltage > 2.0 ? this.constructor.VOLTAGE_TO_PERCENT['3V'] : this.constructor.VOLTAGE_TO_PERCENT['1.5V'];

    // Find closest points in curve
    for (let i = 0; i < curve.length - 1; i++) {
      const p1 = curve[i];
      const p2 = curve[i + 1];

      if (voltage >= p2.voltage) {
        // Linear interpolation
        const ratio = (voltage - p2.voltage) / (p1.voltage - p2.voltage);
        const percent = p2.percent + ratio * (p1.percent - p2.percent);
        return Math.round(percent);
      }
    }

    // Below minimum
    return 0;
  }

  /**
   * Check if device has cluster
   */
  hasCluster(clusterId) {
    const endpoint = this.device.zclNode?.endpoints?.[1];
    if (!endpoint) return false;

    const clusterName = typeof clusterId === 'number' ? this.getClusterName(clusterId) : clusterId;
    return endpoint.clusters?.[clusterName] !== undefined;
  }

  /**
   * Get cluster name from ID
   */
  getClusterName(clusterId) {
    const clusterMap = {
      0x0001: 'powerConfiguration',
      0x0006: 'onOff',
      0x0008: 'levelControl',
      0x0300: 'colorControl',
      0x0402: 'temperatureMeasurement',
      0x0405: 'relativeHumidity',
      0x0406: 'occupancySensing',
      0x0500: 'iasZone',
      0x0702: 'metering',
      0x0B04: 'electricalMeasurement',
      0xEF00: 'tuyaSpecific'
    };

    return clusterMap[clusterId] || `cluster${clusterId}`;
  }

  /**
   * Start battery monitoring
   */
  async startMonitoring() {
    // Get appropriate interval for device type
    const driverType = this.getDriverType();
    const interval = this.constructor.BATTERY_INTERVALS[driverType] || this.constructor.BATTERY_INTERVALS.default;

    this.device.log(`[BATTERY-V2] Starting monitoring (interval: ${interval / 3600000}h)`);

    // Initial read
    const battery = await this.readBattery();
    if (battery !== null && this.device.hasCapability('measure_battery')) {
      await this.device.setCapabilityValue('measure_battery', parseFloat(battery));
    }

    // Setup periodic polling (but not too aggressive!)
    this.pollInterval = this.device.homey.setInterval(async () => {
      const battery = await this.readBattery();
      if (battery !== null && this.device.hasCapability('measure_battery')) {
        await this.device.setCapabilityValue('measure_battery', parseFloat(battery));
      }
    }, interval);
  }

  /**
   * Stop battery monitoring
   */
  stopMonitoring() {
    if (this.pollInterval) {
      this.device.homey.clearInterval(this.pollInterval);
      this.pollInterval = null;
      this.device.log('[BATTERY-V2] Monitoring stopped');
    }
  }

  /**
   * Get driver type for interval selection
   */
  getDriverType() {
    const driverId = this.device.driver.id;

    if (driverId.includes('motion')) return 'motion';
    if (driverId.includes('contact')) return 'contact';
    if (driverId.includes('climate')) return 'climate';
    if (driverId.includes('button')) return 'button';
    if (driverId.includes('remote')) return 'remote';

    return 'default';
  }
}

module.exports = BatteryManagerV2;
