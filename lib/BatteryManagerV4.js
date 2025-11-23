'use strict';

/**
 * BATTERY MANAGER V4 - ULTRA PRECISE
 *
 * Features:
 * - Voltage-based calculations with discharge curves
 * - Auto-detection battery type (CR2032, AAA, AA, Li-ion, Li-polymer)
 * - Smart polling intervals by device type
 * - Multi-source: Tuya DP → ZCL 0x0001 → Voltage calc
 * - No fake values
 *
 * Battery Technologies Supported:
 * - Lithium Coin Cells (CR2032, CR2450, CR123A)
 * - Alkaline (AAA, AA)
 * - Lithium-ion (3.7V rechargeable)
 * - Lithium-polymer (3.7V)
 */

class BatteryManagerV4 {

  /**
   * Precise battery specifications with voltage curves
   * Based on datasheets + real-world testing
   */
  static BATTERY_SPECS = {
    'CR2032': {
      type: 'Lithium Coin Cell',
      chemistry: 'Li-MnO2',
      nominal: 3.0,
      capacity: 220,      // mAh
      fresh: 3.3,
      full: 3.0,
      low: 2.5,
      dead: 2.0,
      // Non-linear curve (flat discharge then drops)
      curve: [
        { v: 3.3, p: 100 }, { v: 3.0, p: 95 }, { v: 2.9, p: 85 },
        { v: 2.8, p: 70 }, { v: 2.7, p: 50 }, { v: 2.6, p: 30 },
        { v: 2.5, p: 20 }, { v: 2.4, p: 10 }, { v: 2.3, p: 5 }, { v: 2.0, p: 0 }
      ]
    },
    'CR2450': {
      type: 'Lithium Coin Cell',
      chemistry: 'Li-MnO2',
      nominal: 3.0,
      capacity: 620,
      fresh: 3.3,
      full: 3.0,
      low: 2.5,
      dead: 2.0,
      curve: [
        { v: 3.3, p: 100 }, { v: 3.0, p: 95 }, { v: 2.9, p: 85 },
        { v: 2.8, p: 70 }, { v: 2.7, p: 50 }, { v: 2.6, p: 30 },
        { v: 2.5, p: 20 }, { v: 2.4, p: 10 }, { v: 2.3, p: 5 }, { v: 2.0, p: 0 }
      ]
    },
    'CR123A': {
      type: 'Lithium Photo',
      chemistry: 'Li-MnO2',
      nominal: 3.0,
      capacity: 1500,
      fresh: 3.3,
      full: 3.0,
      low: 2.5,
      dead: 2.0,
      curve: [
        { v: 3.3, p: 100 }, { v: 3.1, p: 95 }, { v: 3.0, p: 90 },
        { v: 2.9, p: 80 }, { v: 2.8, p: 65 }, { v: 2.7, p: 45 },
        { v: 2.6, p: 25 }, { v: 2.5, p: 15 }, { v: 2.4, p: 8 },
        { v: 2.3, p: 3 }, { v: 2.0, p: 0 }
      ]
    },
    'AAA': {
      type: 'Alkaline',
      chemistry: 'Zn-MnO2',
      nominal: 1.5,
      capacity: 1200,
      fresh: 1.6,
      full: 1.5,
      low: 1.2,
      dead: 0.9,
      // Linear discharge for alkaline
      curve: [
        { v: 1.6, p: 100 }, { v: 1.5, p: 95 }, { v: 1.45, p: 90 },
        { v: 1.4, p: 80 }, { v: 1.35, p: 70 }, { v: 1.3, p: 55 },
        { v: 1.25, p: 40 }, { v: 1.2, p: 25 }, { v: 1.15, p: 15 },
        { v: 1.1, p: 8 }, { v: 1.0, p: 2 }, { v: 0.9, p: 0 }
      ]
    },
    'AA': {
      type: 'Alkaline',
      chemistry: 'Zn-MnO2',
      nominal: 1.5,
      capacity: 2850,
      fresh: 1.6,
      full: 1.5,
      low: 1.2,
      dead: 0.9,
      curve: [
        { v: 1.6, p: 100 }, { v: 1.5, p: 95 }, { v: 1.45, p: 90 },
        { v: 1.4, p: 80 }, { v: 1.35, p: 70 }, { v: 1.3, p: 55 },
        { v: 1.25, p: 40 }, { v: 1.2, p: 25 }, { v: 1.15, p: 15 },
        { v: 1.1, p: 8 }, { v: 1.0, p: 2 }, { v: 0.9, p: 0 }
      ]
    },
    'Li-ion': {
      type: 'Lithium-ion Rechargeable',
      chemistry: 'Li-ion',
      nominal: 3.7,
      capacity: 2600,     // Typical 18650
      fresh: 4.2,
      full: 4.1,
      low: 3.3,
      dead: 2.8,
      curve: [
        { v: 4.2, p: 100 }, { v: 4.1, p: 95 }, { v: 4.0, p: 90 },
        { v: 3.9, p: 80 }, { v: 3.8, p: 65 }, { v: 3.7, p: 50 },
        { v: 3.6, p: 35 }, { v: 3.5, p: 20 }, { v: 3.4, p: 10 },
        { v: 3.3, p: 5 }, { v: 2.8, p: 0 }
      ]
    },
    'Li-polymer': {
      type: 'Lithium-polymer Rechargeable',
      chemistry: 'Li-po',
      nominal: 3.7,
      capacity: 1200,
      fresh: 4.2,
      full: 4.1,
      low: 3.3,
      dead: 3.0,
      curve: [
        { v: 4.2, p: 100 }, { v: 4.1, p: 95 }, { v: 4.0, p: 88 },
        { v: 3.9, p: 77 }, { v: 3.8, p: 62 }, { v: 3.7, p: 45 },
        { v: 3.6, p: 30 }, { v: 3.5, p: 18 }, { v: 3.4, p: 10 },
        { v: 3.3, p: 5 }, { v: 3.0, p: 0 }
      ]
    }
  };

  /**
   * Polling intervals by device type
   */
  static INTERVALS = {
    button: 43200,        // 12h (event-driven)
    remote: 43200,        // 12h
    sensor_motion: 14400, // 4h
    sensor_climate: 7200, // 2h
    sensor_contact: 14400,// 4h
    sensor_water: 14400,  // 4h
    trv: 10800,           // 3h (TRV uses battery)
    default: 10800        // 3h
  };

  constructor(device, batteryType = null) {
    this.device = device;
    this.batteryType = batteryType;
    this.method = null;
    this.interval = null;
    this.voltage = null;
  }

  /**
   * Start monitoring
   */
  async startMonitoring() {
    this.device.log('[BATTERY-V4] 🔋 Starting ultra-precise monitoring...');

    // Auto-detect battery type if not specified
    if (!this.batteryType) {
      this.batteryType = this.detectBatteryType();
    }
    this.device.log(`[BATTERY-V4] 📊 Battery type: ${this.batteryType}`);

    const deviceType = this.detectDeviceType();
    const intervalMs = BatteryManagerV4.INTERVALS[deviceType] || BatteryManagerV4.INTERVALS.default;
    this.device.log(`[BATTERY-V4] ⏱️  Polling: ${intervalMs / 3600}h`);

    // Try methods in priority order
    if (await this.tryTuyaDP()) {
      this.method = 'tuya_dp';
      this.device.log('[BATTERY-V4] ✅ Method: Tuya DP');
    } else if (await this.tryZCL()) {
      this.method = 'zcl';
      this.device.log('[BATTERY-V4] ✅ Method: ZCL 0x0001');
    } else {
      this.device.log('[BATTERY-V4] ⚠️  No battery source available');
      return false;
    }

    this.startPolling(intervalMs);
    return true;
  }

  /**
   * Auto-detect battery type from device info
   */
  detectBatteryType() {
    const driverUri = this.device.driver?.id || '';
    const settings = this.device.getSettings();

    // Check settings first
    if (settings.battery_type) {
      return settings.battery_type;
    }

    // Heuristics based on device type
    if (driverUri.includes('button') || driverUri.includes('remote')) {
      return 'CR2032'; // Most remotes use coin cells
    }
    if (driverUri.includes('trv') || driverUri.includes('thermostat')) {
      return 'AA'; // TRVs typically use AA
    }
    if (driverUri.includes('motion') || driverUri.includes('contact')) {
      return 'CR2032'; // Small sensors
    }
    if (driverUri.includes('climate') || driverUri.includes('soil')) {
      return 'AAA'; // Medium sensors
    }

    // Check voltage to guess
    if (this.voltage) {
      if (this.voltage > 3.8) return 'Li-ion';
      if (this.voltage > 2.8 && this.voltage < 3.5) return 'CR2032';
      if (this.voltage > 1.3 && this.voltage < 1.7) return 'AAA';
    }

    return 'CR2032'; // Safe default
  }

  /**
   * Detect device type
   */
  detectDeviceType() {
    const driverUri = this.device.driver?.id || '';

    if (driverUri.includes('button') || driverUri.includes('remote')) return 'button';
    if (driverUri.includes('motion') || driverUri.includes('pir') || driverUri.includes('radar')) return 'sensor_motion';
    if (driverUri.includes('climate') || driverUri.includes('temp') || driverUri.includes('humidity')) return 'sensor_climate';
    if (driverUri.includes('contact') || driverUri.includes('door')) return 'sensor_contact';
    if (driverUri.includes('water') || driverUri.includes('leak')) return 'sensor_water';
    if (driverUri.includes('trv') || driverUri.includes('thermostat')) return 'trv';

    return 'default';
  }

  /**
   * Calculate percentage from voltage using discharge curves
   */
  static calculateFromVoltage(voltage, batteryType = 'CR2032') {
    const specs = this.BATTERY_SPECS[batteryType];
    if (!specs) {
      console.warn(`Unknown battery: ${batteryType}, using CR2032`);
      return this.calculateFromVoltage(voltage, 'CR2032');
    }

    if (voltage >= specs.fresh) return 100;
    if (voltage <= specs.dead) return 0;

    const curve = specs.curve;

    // Linear interpolation between curve points
    for (let i = 0; i < curve.length - 1; i++) {
      const high = curve[i];
      const low = curve[i + 1];

      if (voltage >= low.v && voltage <= high.v) {
        const vRange = high.v - low.v;
        const pRange = high.p - low.p;
        const vOffset = voltage - low.v;

        const percentage = low.p + (vOffset / vRange) * pRange;
        return Math.round(Math.max(0, Math.min(100, percentage)));
      }
    }

    return voltage > curve[0].v ? 100 : 0;
  }

  /**
   * Try Tuya DP
   */
  async tryTuyaDP() {
    try {
      if (!this.device.tuyaEF00Manager) return false;

      // Listen to DP events
      this.device.tuyaEF00Manager.on('dp-4', (value) => {
        this.updateBattery(value, 'DP4');
      });
      this.device.tuyaEF00Manager.on('dp-15', (value) => {
        this.updateBattery(value, 'DP15');
      });

      // Request initial
      await this.device.tuyaEF00Manager.requestDP(4).catch(() => { });
      await this.device.tuyaEF00Manager.requestDP(15).catch(() => { });

      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Try ZCL
   */
  async tryZCL() {
    try {
      const endpoint = this.device.zclNode?.endpoints?.[1];
      if (!endpoint?.clusters?.genPowerCfg) return false;

      // Subscribe
      endpoint.clusters.genPowerCfg.on('attr.batteryPercentageRemaining', (value) => {
        this.updateBattery(Math.round(value / 2), 'ZCL');
      });

      // Configure reporting
      await endpoint.clusters.genPowerCfg.configureReporting({
        attributes: [{ id: 33, minimumReportInterval: 3600, maximumReportInterval: 43200, reportableChange: 2 }]
      }).catch(() => { });

      // Read voltage for better accuracy
      const { batteryVoltage } = await endpoint.clusters.genPowerCfg.readAttributes(['batteryVoltage']).catch(() => ({}));
      if (batteryVoltage !== undefined) {
        this.voltage = batteryVoltage / 10; // Convert to volts
        const calculated = BatteryManagerV4.calculateFromVoltage(this.voltage, this.batteryType);
        this.updateBattery(calculated, 'Voltage');
      }

      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Update battery value
   */
  updateBattery(value, source) {
    if (typeof value !== 'number' || value < 0 || value > 100) return;

    const rounded = Math.round(value);
    this.device.log(`[BATTERY-V4] 🔋 ${rounded}% (${source}, type: ${this.batteryType})`);

    if (this.device.hasCapability('measure_battery')) {
      this.device.setCapabilityValue('measure_battery', rounded).catch(this.device.error);
    }

    if (this.device.hasCapability('alarm_battery')) {
      this.device.setCapabilityValue('alarm_battery', rounded < 20).catch(this.device.error);
    }
  }

  /**
   * Start polling
   */
  startPolling(intervalMs) {
    if (this.interval) {
      this.device.homey.clearInterval(this.interval);
    }

    this.interval = this.device.homey.setInterval(async () => {
      if (this.method === 'tuya_dp' && this.device.tuyaEF00Manager) {
        await this.device.tuyaEF00Manager.requestDP(4).catch(() => { });
        await this.device.tuyaEF00Manager.requestDP(15).catch(() => { });
      } else if (this.method === 'zcl') {
        try {
          const endpoint = this.device.zclNode?.endpoints?.[1];
          if (endpoint?.clusters?.genPowerCfg) {
            const { batteryPercentageRemaining, batteryVoltage } = await endpoint.clusters.genPowerCfg.readAttributes(['batteryPercentageRemaining', 'batteryVoltage']).catch(() => ({}));

            if (batteryVoltage !== undefined) {
              this.voltage = batteryVoltage / 10;
              const calculated = BatteryManagerV4.calculateFromVoltage(this.voltage, this.batteryType);
              this.updateBattery(calculated, 'Voltage');
            } else if (batteryPercentageRemaining !== undefined) {
              this.updateBattery(Math.round(batteryPercentageRemaining / 2), 'ZCL');
            }
          }
        } catch (err) {
          // Silent (device asleep)
        }
      }
    }, intervalMs);
  }

  /**
   * Stop
   */
  stopMonitoring() {
    if (this.interval) {
      this.device.homey.clearInterval(this.interval);
      this.interval = null;
    }
  }
}

module.exports = BatteryManagerV4;
