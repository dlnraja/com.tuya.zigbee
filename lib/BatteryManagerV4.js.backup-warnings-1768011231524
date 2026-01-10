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

  constructor(device, batteryType = null, options = {}) {
    this.device = device;
    this.batteryType = batteryType;
    this.method = null;
    this.interval = null;
    this.voltage = null;

    // v5.0.9: Proper Tuya DP disable flag
    this._tuyaDPDisabled = false;
    this._dpRequestsFailed = false;

    // Options
    this._useTuyaDP = options.useTuyaDP !== false; // Default true

    // v5.2.10: PATCH 1 - mainsPowered flag to completely disable battery
    this._mainsPowered = options.mainsPowered === true;

    // v5.2.10: PATCH 2 - Track if we ever received REAL battery data
    this._hasRealBatteryData = false;
    this._batterySource = null; // 'DP4', 'DP15', 'ZCL', 'Voltage', 'assumption'
    this._lastRealBatteryUpdate = null;
  }

  /**
   * Start monitoring
   * v5.2.10: Added mainsPowered check and honest battery handling
   */
  async startMonitoring() {
    // v5.2.11: Also check if device itself is marked as mains-powered
    const isMainsPowered = this._mainsPowered || this.device._mainsPowered === true;

    // v5.2.10: PATCH 1 - Skip completely for mains-powered devices
    if (isMainsPowered) {
      this.device.log('[BATTERY-V4] ⚡ Device is mains powered - skipping battery management');
      // Remove measure_battery if it exists (shouldn't be on mains devices)
      if (this.device.hasCapability('measure_battery')) {
        this.device.log('[BATTERY-V4] ⚠️ Removing measure_battery from mains-powered device');
        await this.device.removeCapability('measure_battery').catch(() => { });
      }
      return false;
    }

    this.device.log('[BATTERY-V4] 🔋 Starting ultra-precise monitoring...');

    // Auto-detect battery type if not specified
    if (!this.batteryType) {
      this.batteryType = this.detectBatteryType();
    }
    this.device.log(`[BATTERY-V4] 📊 Battery type: ${this.batteryType}`);

    const deviceType = this.detectDeviceType();
    const intervalMs = BatteryManagerV4.INTERVALS[deviceType] || BatteryManagerV4.INTERVALS.default;
    this.device.log(`[BATTERY-V4] ⏱️  Polling: ${intervalMs / 3600}h`);

    // v5.2.14: Try to restore REAL battery data from previous session
    const storedBattery = await this.device.getStoreValue('last_real_battery').catch(() => null);
    if (storedBattery && storedBattery.value !== undefined) {
      const age = Date.now() - (storedBattery.timestamp || 0);
      const ageHours = Math.round(age / 1000 / 3600);
      this.device.log(`[BATTERY-V4] 📦 Found stored battery: ${storedBattery.value}% (source: ${storedBattery.source}, age: ${ageHours}h)`);

      // Only use stored value if it's real data (not assumption) and less than 7 days old
      if (storedBattery.source && storedBattery.source !== 'assumption' && age < 7 * 24 * 3600 * 1000) {
        this._hasRealBatteryData = true;
        this._batterySource = `stored_${storedBattery.source}`;
        this._lastRealBatteryUpdate = storedBattery.timestamp;
        // Set the stored value
        if (this.device.hasCapability('measure_battery')) {
          await this.device.setCapabilityValue('measure_battery', storedBattery.value).catch(() => { });
          this.device.log(`[BATTERY-V4] ✅ Restored battery: ${storedBattery.value}%`);
        }
      } else {
        this.device.log('[BATTERY-V4] ℹ️ Stored battery too old or was assumption - ignoring');
      }
    }

    // Try methods in priority order
    if (await this.tryTuyaDP()) {
      this.method = 'tuya_dp';
      this.device.log('[BATTERY-V4] ✅ Method: Tuya DP (will receive passive reports)');
    } else if (await this.tryZCL()) {
      this.method = 'zcl';
      this.device.log('[BATTERY-V4] ✅ Method: ZCL 0x0001');
    } else {
      this.device.log('[BATTERY-V4] ⚠️ No active battery source - waiting for passive reports');
      // v5.2.14: PATCH 2 - Don't set fake 100%, just wait for real data
      this._batterySource = 'waiting';
      this.method = 'passive';
      // Still register listeners for when device wakes up
      this._registerTuyaDPListeners();

      // v5.2.14: If no stored real data, log that we're waiting
      if (!this._hasRealBatteryData) {
        this.device.log('[BATTERY-V4] ℹ️ No real battery data yet - capability will update when device reports');
      }
      return true; // Return true to keep monitoring active
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
   * Try Tuya DP - v5.0.9 REFACTORED
   * - Only attempts if useTuyaDP option is true
   * - Sets _tuyaDPDisabled if cluster not available
   * - Never spams requests if disabled
   */
  async tryTuyaDP() {
    try {
      // v5.0.9: Respect useTuyaDP option
      if (!this._useTuyaDP) {
        this.device.log('[BATTERY-V4] ℹ️  Tuya DP disabled by option');
        this._tuyaDPDisabled = true;
        return false;
      }

      if (!this.device.tuyaEF00Manager) {
        this.device.log('[BATTERY-V4] ℹ️  No tuyaEF00Manager - disabling Tuya DP');
        this._tuyaDPDisabled = true;
        return false;
      }

      // v5.0.9: Check if Tuya cluster is actually available on Homey
      if (this.device._tuyaClusterAvailable === false) {
        this.device.log('[BATTERY-V4] ℹ️  Tuya cluster not available on Homey - disabling DP polling');
        this._tuyaDPDisabled = true;
        return false;
      }

      // v5.0.9: Try one initial request to verify cluster works
      const canUseTuyaDP = await this._tryTuyaDPOnce();
      if (!canUseTuyaDP) {
        this.device.log('[BATTERY-V4] ℹ️  Initial DP test failed - disabling Tuya DP polling');
        this._tuyaDPDisabled = true;
        // Still register listeners for passive reports
        this._registerTuyaDPListeners();
        return false;
      }

      // Register listeners for DP battery reports
      this._registerTuyaDPListeners();

      this.device.log('[BATTERY-V4] ✅ Tuya DP battery monitoring active');
      return true;
    } catch (err) {
      this.device.log('[BATTERY-V4] ⚠️  tryTuyaDP error:', err.message);
      this._tuyaDPDisabled = true;
      return false;
    }
  }

  /**
   * v5.0.9: Try one DP request to verify cluster is working
   */
  async _tryTuyaDPOnce() {
    try {
      const result = await this.device.tuyaEF00Manager.requestDP(4);
      return result !== false && result !== null;
    } catch (err) {
      // Check for specific "cluster not available" error
      if (String(err.message || '').includes('not available')) {
        return false;
      }
      // Other errors might be temporary
      return false;
    }
  }

  /**
   * v5.2.14: Register DP listeners for passive battery reports
   * Enhanced to catch ALL battery events from TuyaEF00Manager
   */
  _registerTuyaDPListeners() {
    if (!this.device.tuyaEF00Manager) {
      this.device.log('[BATTERY-V4] ⚠️ No tuyaEF00Manager, cannot register DP listeners');
      return;
    }

    this.device.log('[BATTERY-V4] 📡 Registering Tuya DP battery listeners...');

    // Common battery DPs
    const batteryDPs = [4, 14, 15, 33, 35];
    batteryDPs.forEach(dpId => {
      this.device.tuyaEF00Manager.on(`dp-${dpId}`, (value) => {
        this.device.log(`[BATTERY-V4] 📥 Received dp-${dpId} event: ${value}`);
        const percent = this._convertTuyaDPToBattery(value);
        if (percent !== null) {
          this.updateBattery(percent, `DP${dpId}`);
        }
      });
    });

    // v5.2.14: Also listen for the generic batteryDP event
    this.device.tuyaEF00Manager.on('batteryDP', ({ dpId, value }) => {
      this.device.log(`[BATTERY-V4] 📥 Received batteryDP event: DP${dpId} = ${value}`);
      const percent = this._convertTuyaDPToBattery(value);
      if (percent !== null) {
        this.updateBattery(percent, `DP${dpId}`);
      }
    });

    // v5.2.14: Listen to dpReport for comprehensive coverage
    this.device.tuyaEF00Manager.on('dpReport', ({ dpId, value }) => {
      if (batteryDPs.includes(dpId)) {
        this.device.log(`[BATTERY-V4] 📥 Received dpReport battery: DP${dpId} = ${value}`);
        const percent = this._convertTuyaDPToBattery(value);
        if (percent !== null) {
          this.updateBattery(percent, `DP${dpId}`);
        }
      }
    });

    this.device.log('[BATTERY-V4] ✅ DP battery listeners registered for DPs:', batteryDPs.join(', '));
  }

  /**
   * v5.0.9: Convert Tuya DP value to battery percentage
   */
  _convertTuyaDPToBattery(value) {
    if (typeof value === 'number') {
      // Most Tuya devices send 0-100 directly
      return Math.min(100, Math.max(0, value));
    }
    if (typeof value === 'object' && value.battery !== undefined) {
      return Math.min(100, Math.max(0, value.battery));
    }
    return null;
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
   * v5.2.10: PATCH 2 - Track real vs assumed data
   */
  async updateBattery(value, source) {
    if (typeof value !== 'number' || value < 0 || value > 100) {
      this.device.log(`[BATTERY-V4] ⚠️ Invalid battery value: ${value}`);
      return;
    }

    const rounded = Math.round(value);
    const threshold = this.device.getSetting?.('battery_low_threshold') || 20;
    const isLow = rounded <= threshold;

    // v5.2.10: PATCH 2 - Mark as REAL battery data (not assumption)
    const isRealSource = source !== 'assumption' && source !== 'stored' && source !== 'waiting';
    if (isRealSource) {
      this._hasRealBatteryData = true;
      this._batterySource = source;
      this._lastRealBatteryUpdate = Date.now();
      this.device.log(`[BATTERY-V4] 🔋 REAL battery update: ${rounded}% (source: ${source}, type: ${this.batteryType})`);

      // Store for persistence
      await this.device.setStoreValue('last_real_battery', {
        value: rounded,
        source: source,
        timestamp: Date.now()
      }).catch(() => { });
    } else {
      this.device.log(`[BATTERY-V4] ℹ️ Battery value ${rounded}% (source: ${source}) - NOT real data`);
    }

    if (this.device.hasCapability('measure_battery')) {
      await this.device.setCapabilityValue('measure_battery', rounded).catch(err => {
        this.device.error('[BATTERY-V4] ❌ Failed to set measure_battery:', err.message);
      });
      this.device.log(`[BATTERY-V4] ✅ measure_battery updated to ${rounded}%`);
    } else {
      this.device.log('[BATTERY-V4] ⚠️ measure_battery capability missing!');
    }

    if (this.device.hasCapability('alarm_battery')) {
      await this.device.setCapabilityValue('alarm_battery', isLow).catch(err => {
        this.device.error('[BATTERY-V4] ❌ Failed to set alarm_battery:', err.message);
      });
      this.device.log(`[BATTERY-V4] ✅ alarm_battery set to ${isLow} (threshold: ${threshold}%)`);
    }
  }

  /**
   * v5.2.10: PATCH 3 - Explicit method for Tuya DP battery updates
   * Called from TuyaEF00Manager when DP battery is received
   */
  onTuyaDPBattery(parsed) {
    try {
      const { dpId, value } = parsed;
      const percent = this._convertTuyaDPToBattery(value);

      if (percent !== null && percent >= 0 && percent <= 100) {
        this.device.log(`[BATTERY-V4] 🔋 Battery from Tuya DP${dpId}: ${percent}%`);
        this.updateBattery(percent, `DP${dpId}`);
      } else {
        this.device.log('[BATTERY-V4] ⚠️ Unrecognized Tuya DP battery value', { dpId, value });
      }
    } catch (err) {
      this.device.error('[BATTERY-V4] ❌ onTuyaDPBattery error:', err.message);
    }
  }

  /**
   * v5.2.10: Check if we have real battery data
   */
  hasRealBatteryData() {
    return this._hasRealBatteryData;
  }

  /**
   * v5.2.10: Get battery status for diagnostics
   */
  getBatteryStatus() {
    return {
      hasRealData: this._hasRealBatteryData,
      source: this._batterySource,
      lastUpdate: this._lastRealBatteryUpdate,
      method: this.method,
      batteryType: this.batteryType,
      mainsPowered: this._mainsPowered
    };
  }

  /**
   * Start polling
   * v5.0.9: Complete rewrite - respects _tuyaDPDisabled flag
   */
  startPolling(intervalMs) {
    if (this.interval) {
      this.device.homey.clearInterval(this.interval);
    }

    this.interval = this.device.homey.setInterval(async () => {
      if (this.method === 'tuya_dp' && this.device.tuyaEF00Manager) {
        // v5.0.9: CRITICAL - Never poll if Tuya DP is disabled
        if (this._tuyaDPDisabled) {
          // Battery devices report passively on wake - no polling needed
          return;
        }
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
