'use strict';

/**
 * UnifiedBatteryHandler - v5.3.15
 *
 * Handles battery reading from BOTH sources:
 * 1. ZCL Standard (cluster 0x0001 - powerConfiguration)
 * 2. Tuya DP (DP 4, 10, 14, 15, 101, 102, 105)
 *
 * CRITICAL: Many Tuya devices do NOT have ZCL battery cluster!
 * They report battery via DP instead.
 */

// v5.8.69: Unified DP list — must match SmartBatteryManager
const BATTERY_DPS = [4, 10, 14, 15, 21, 100, 101, 102, 104, 105];
const VOLTAGE_DPS = [33, 35, 247];

class UnifiedBatteryHandler {

  constructor(device) {
    this.device = device;
    this.source = null;  // 'zcl' | 'tuya' | 'unknown'
    this.lastValue = null;
    this.lastVoltage = null;
    this.initialized = false;
  }

  /**
   * Initialize battery handling
   * Detects which source to use
   */
  async initialize(zclNode) {
    if (this.initialized) return;

    this.device.log('[BATTERY-UNIFIED] 🔋 Initializing...');

    // Check if device has ZCL battery cluster
    const hasZclBattery = this._hasZclBatteryCluster(zclNode);

    // Check if device is Tuya DP device
    const isTuyaDP = this._isTuyaDPDevice();

    if (hasZclBattery && !isTuyaDP) {
      this.source = 'zcl';
      this.device.log('[BATTERY-UNIFIED] 📡 Source: ZCL (cluster 0x0001)');
      await this._setupZclBattery(zclNode);
    } else if (isTuyaDP) {
      this.source = 'tuya';
      this.device.log('[BATTERY-UNIFIED] 🔶 Source: Tuya DP');
      this._setupTuyaBattery();
    } else {
      this.source = 'unknown';
      this.device.log('[BATTERY-UNIFIED] ⚠️ No battery source detected');
      // Set default value so KPI isn't null
      this._setDefaultBattery();
    }

    this.initialized = true;
  }

  /**
   * Check if ZCL battery cluster exists
   */
  _hasZclBatteryCluster(zclNode) {
    try {
      const endpoint = zclNode?.endpoints?.[1];
      if (!endpoint?.clusters) return false;

      // Check for powerConfiguration cluster (0x0001)
      return !!(
        endpoint.clusters.powerConfiguration ||
        endpoint.clusters.genPowerCfg ||
        endpoint.clusters[0x0001] ||
        endpoint.clusters['0x0001'] ||
        endpoint.clusters[1]
      );
    } catch (err) {
      return false;
    }
  }

  /**
   * Check if device is Tuya DP type
   */
  _isTuyaDPDevice() {
    try {
      const settings = this.device.getSettings?.() || {};
      const store = this.device.getStore?.() || {};

      const modelId = settings.zb_model_id || settings.zb_modelId || store.modelId || '';
      const mfr = settings.zb_manufacturer_name || settings.zb_manufacturerName || store.manufacturerName || '';

      // TS0601 = Pure Tuya DP
      // _TZE = Tuya extended
      return modelId.toUpperCase() === 'TS0601' || mfr.toUpperCase().startsWith('_TZE');
    } catch (err) {
      return false;
    }
  }

  /**
   * Setup ZCL battery reporting
   */
  async _setupZclBattery(zclNode) {
    try {
      const endpoint = zclNode?.endpoints?.[1];
      const cluster = endpoint?.clusters?.powerConfiguration ||
        endpoint?.clusters?.genPowerCfg ||
        endpoint?.clusters?.[1];

      if (!cluster) return;

      // Read initial value
      try {
        const attrs = await cluster.readAttributes(['batteryPercentageRemaining', 'batteryVoltage']);

        if (attrs.batteryPercentageRemaining !== undefined) {
          // Value is 0-200 (0.5% steps), divide by 2
          const percent = Math.round(attrs.batteryPercentageRemaining / 2);
          this._updateBattery(percent);
          this.device.log(`[BATTERY-UNIFIED] ✅ ZCL read: ${percent}%`);
        }

        if (attrs.batteryVoltage !== undefined) {
          // Value is in 0.1V units
          const voltage = attrs.batteryVoltage / 10;
          this._updateVoltage(voltage);
          this.device.log(`[BATTERY-UNIFIED] ✅ ZCL voltage: ${voltage}V`);
        }
      } catch (readErr) {
        this.device.log('[BATTERY-UNIFIED] ZCL read failed (normal for sleeping devices):', readErr.message);
      }

      // Setup reporting listener
      cluster.on('attr.batteryPercentageRemaining', (value) => {
        const percent = Math.round(value / 2);
        this._updateBattery(percent);
        this.device.log(`[BATTERY-UNIFIED] 📡 ZCL report: ${percent}%`);
      });

      cluster.on('attr.batteryVoltage', (value) => {
        const voltage = value / 10;
        this._updateVoltage(voltage);
        this.device.log(`[BATTERY-UNIFIED] 📡 ZCL voltage report: ${voltage}V`);
      });

      // Configure reporting (may fail for sleepy devices)
      try {
        await cluster.configureReporting({
          batteryPercentageRemaining: {
            minInterval: 3600,  // 1 hour
            maxInterval: 43200, // 12 hours
            minChange: 2        // 1% change
          }
        });
        this.device.log('[BATTERY-UNIFIED] ✅ ZCL reporting configured');
      } catch (configErr) {
        // This is normal for sleepy/battery devices
        this.device.log('[BATTERY-UNIFIED] ZCL config failed (normal for sleepy):', configErr.message);
      }
    } catch (err) {
      this.device.error('[BATTERY-UNIFIED] ZCL setup failed:', err.message);
    }
  }

  /**
   * Setup Tuya DP battery listening
   */
  _setupTuyaBattery() {
    // Listen to TuyaEF00Manager events
    const ef00Manager = this.device.tuyaEF00Manager;

    if (ef00Manager) {
      // Listen for battery DPs
      BATTERY_DPS.forEach(dp => {
        ef00Manager.on(`dp-${dp}`, (value) => {
          this._handleTuyaBatteryDP(dp, value);
        });
      });

      // Listen for voltage DPs
      VOLTAGE_DPS.forEach(dp => {
        ef00Manager.on(`dp-${dp}`, (value) => {
          this._handleTuyaVoltageDP(dp, value);
        });
      });

      this.device.log('[BATTERY-UNIFIED] ✅ Tuya DP listeners registered');
    }

    // Also listen to TuyaClusterWrapper if available
    const tuyaWrapper = this.device.tuyaWrapper;
    if (tuyaWrapper) {
      BATTERY_DPS.forEach(dp => {
        tuyaWrapper.on(`dp-${dp}`, (value) => {
          this._handleTuyaBatteryDP(dp, value);
        });
      });

      VOLTAGE_DPS.forEach(dp => {
        tuyaWrapper.on(`dp-${dp}`, (value) => {
          this._handleTuyaVoltageDP(dp, value);
        });
      });
    }

    // Set default if no value received after init
    setTimeout(() => {
      if (this.lastValue === null) {
        this._setDefaultBattery();
      }
    }, 5000);
  }

  /**
   * Handle Tuya battery DP
   */
  _handleTuyaBatteryDP(dp, value) {
    let percent = value;

    // Some DPs use different scales
    if (dp === 14 && value > 100) {
      // DP 14 sometimes uses 0-200 scale
      percent = Math.round(value / 2);
    }

    // Clamp to valid range
    percent = Math.max(0, Math.min(100, Math.round(percent)));

    this.device.log(`[BATTERY-UNIFIED] 🔶 Tuya DP${dp}: ${percent}%`);
    this._updateBattery(percent);
  }

  /**
   * Handle Tuya voltage DP
   */
  _handleTuyaVoltageDP(dp, value) {
    let voltage = value;

    // DP 247 is in mV
    if (dp === 247) {
      voltage = value / 1000;
    }
    // DP 33/35 might be in 10mV or 100mV
    else if (value > 100) {
      voltage = value / 100;
    } else if (value > 10) {
      voltage = value / 10;
    }

    // Sanity check
    if (voltage > 0 && voltage < 20) {
      this.device.log(`[BATTERY-UNIFIED] 🔶 Tuya voltage DP${dp}: ${voltage}V`);
      this._updateVoltage(voltage);
    }
  }

  /**
   * Set default battery value
   */
  _setDefaultBattery() {
    if (this.device.hasCapability?.('measure_battery')) {
      const current = this.device.getCapabilityValue?.('measure_battery');
      if (current === null || current === undefined) {
        this.device.log('[BATTERY-UNIFIED] 📊 Setting default battery (100%)');
        this._updateBattery(100);
      }
    }
  }

  /**
   * Update battery capability
   */
  _updateBattery(percent) {
    this.lastValue = percent;

    if (this.device.hasCapability?.('measure_battery')) {
      this.device.setCapabilityValue('measure_battery', parseFloat(percent)).catch(err => {
        this.device.error('[BATTERY-UNIFIED] Failed to set battery:', err.message);
      });
    }

    // Emit event for other handlers
    this.device.emit?.('battery_update', percent);
  }

  /**
   * Update voltage
   */
  _updateVoltage(voltage) {
    this.lastVoltage = voltage;

    // Store voltage
    this.device.setStoreValue?.('battery_voltage', voltage).catch(() => { });

    // Update capability if exists
    if (this.device.hasCapability?.('measure_voltage')) {
      this.device.setCapabilityValue('measure_voltage', parseFloat(voltage)).catch(() => { });
    }

    // Calculate percentage from voltage if we don't have direct %
    if (this.lastValue === null) {
      const percent = this._voltageToPercent(voltage);
      if (percent !== null) {
        this._updateBattery(percent);
      }
    }
  }

  /**
   * Convert voltage to percentage (for common battery types)
   */
  _voltageToPercent(voltage) {
    // v5.8.69: Driver-based curve selection + non-linear discharge curves
    const mV = Math.round(voltage * 1000);
    const d = (this.device?.driver?.id || '').toLowerCase();
    
    let curve;
    // 2xAA/2xAAA alkaline (TRVs, locks, thermostats, sirens)
    if (d.includes('trv') || d.includes('thermostat') || d.includes('lock') || d.includes('siren') || d.includes('radiator')) {
      curve = [[3200,100],[3100,95],[3000,90],[2900,80],[2800,70],[2700,60],[2600,50],[2500,40],[2400,30],[2300,20],[2200,12],[2000,5],[1800,0]];
    }
    // Li-ion 3.7V rechargeable
    else if (mV >= 3500) {
      curve = [[4200,100],[4100,95],[4000,88],[3900,78],[3800,65],[3700,50],[3600,35],[3500,22],[3400,12],[3300,5],[3000,0]];
    }
    // Single AA/AAA (1.5V nominal)
    else if (mV < 1800) {
      curve = [[1600,100],[1550,95],[1500,90],[1450,80],[1400,70],[1350,60],[1300,50],[1250,40],[1200,30],[1150,20],[1100,12],[1000,3],[900,0]];
    }
    // CR2032/CR2450/CR123A (most common, Z2M '3V_2100')
    else if (mV >= 2000) {
      curve = [[3000,100],[2950,95],[2900,90],[2850,85],[2800,80],[2750,70],[2700,60],[2650,50],[2600,40],[2550,30],[2500,20],[2400,10],[2300,5],[2100,0]];
    } else {
      return null;
    }
    if (mV >= curve[0][0]) return 100;
    if (mV <= curve[curve.length - 1][0]) return 0;
    for (let i = 0; i < curve.length - 1; i++) {
      if (mV >= curve[i + 1][0] && mV <= curve[i][0]) {
        return Math.round(curve[i + 1][1] + ((mV - curve[i + 1][0]) / (curve[i][0] - curve[i + 1][0])) * (curve[i][1] - curve[i + 1][1]));
      }
    }
    return null;
  }

  /**
   * Get current battery value
   */
  getValue() {
    return this.lastValue;
  }

  /**
   * Get current voltage
   */
  getVoltage() {
    return this.lastVoltage;
  }

  /**
   * Get source type
   */
  getSource() {
    return this.source;
  }

  /**
   * Force refresh (for mains-powered devices, remove battery capability)
   */
  async checkMainsPowered() {
    // If device is mains powered, remove battery capability
    const isMains = this.device.powerType === 'MAINS' ||
      this.device.powerType === 'AC' ||
      !this._hasZclBatteryCluster(this.device.zclNode) && !this._isTuyaDPDevice();

    if (isMains && this.device.hasCapability?.('measure_battery')) {
      this.device.log('[BATTERY-UNIFIED] ⚡ Mains-powered - removing battery capability');
      await this.device.removeCapability('measure_battery').catch(() => { });
    }

    return isMains;
  }
}

module.exports = UnifiedBatteryHandler;
