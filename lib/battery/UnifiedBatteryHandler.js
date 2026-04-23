'use strict';
const CI = require('../utils/CaseInsensitiveMatcher');
const { safeMultiply, safeParse, safeDivide } = require('../utils/tuyaUtils.js');


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

// v5.8.69: Unified DP list  must match SmartBatteryManager
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
   * Initialize battery handling  runtime adaptive
   * Probes ALL possible energy sources and adapts capabilities.
   * 
   * Chinese manufacturers mix implementations freely:
   * - Same mfr name: some variants battery, some mains, some kinetic
   * - Some devices report % AND boolean alarm AND voltage all at once
   * - Some devices switch between ZCL and Tuya DP mid-session
   * 
   * SDK v3 rule: NEVER have both measure_battery + alarm_battery.
   * We adapt at runtime: if device reports %, we use measure_battery.
   * If it only reports low/ok, we use alarm_battery.
   */
  async initialize(zclNode) {
    if (this.initialized) return;

    this.device.log('[BATTERY-UNIFIED]  Initializing runtime-adaptive energy handler...');

    // Detect ALL available energy sources
    const hasZclBattery = this._hasZclBatteryCluster(zclNode);
    const isTuyaDP = this._isTuyaDPDevice();
    const hasIasZone = this._hasIasZoneCluster(zclNode);
    const isMains = this.device.mainsPowered === true;
    const isKinetic = this._isKineticDevice();

    this.device.log(`[BATTERY-UNIFIED] Detection: ZCL=${hasZclBattery} TuyaDP=${isTuyaDP} IAS=${hasIasZone} Mains=${isMains} Kinetic=${isKinetic}`);

    // === Runtime capability adaptation ===
    // At runtime, we ensure the RIGHT battery capability exists
    await this._adaptBatteryCapabilities(hasZclBattery, isTuyaDP, hasIasZone, isMains, isKinetic);

    // === Setup ALL available sources (greedy) ===
    // Devices may report battery from multiple sources simultaneously
    // We listen to ALL and use the most recent/accurate value
    const sources = [];

    if (hasZclBattery) {
      await this._setupZclBattery(zclNode);
      sources.push('zcl');
    }

    if (isTuyaDP) {
      this._setupTuyaBattery();
      sources.push('tuya');
    }

    if (hasIasZone) {
      this._setupIasZoneBattery(zclNode);
      sources.push('ias');
    }

    this.source = sources.length > 0 ? sources.join('+') : (isMains ? 'mains' : isKinetic ? 'kinetic' : 'unknown');
    this.device.log(`[BATTERY-UNIFIED]  Energy source(s): ${this.source}`);

    if (sources.length === 0 && !isMains && !isKinetic) {
      this._setDefaultBattery();
    }

    this.initialized = true;
  }

  /**
   * Runtime capability adaptation
   * SDK v3: NEVER have both measure_battery + alarm_battery
   * Dynamically add/remove based on actual device capabilities
   */
  async _adaptBatteryCapabilities(hasZcl, hasTuya, hasIas, isMains, isKinetic) {
    try {
      const hasMeasure = this.device.hasCapability?.('measure_battery');const hasAlarm = this.device.hasCapability?.('alarm_battery');// Mains or kinetic: remove all battery capabilities
      if (isMains || isKinetic) {
        if (hasMeasure) {
          await this.device.removeCapability('measure_battery').catch(() => {});
          this.device.log('[BATTERY-UNIFIED]  Removed measure_battery (mains/kinetic)');
        }
        if (hasAlarm) {
          await this.device.removeCapability('alarm_battery').catch(() => {});
          this.device.log('[BATTERY-UNIFIED]  Removed alarm_battery (mains/kinetic)');
        }
        return;
      }

      // Device reports battery via ZCL or Tuya DP  needs measure_battery (precise %)
      if (hasZcl || hasTuya) {
        if (!hasMeasure) {
          await this.device.addCapability('measure_battery').catch(() => {});
          this.device.log('[BATTERY-UNIFIED]  Added measure_battery (runtime detection)');
        }
        // SDK v3: remove alarm_battery if measure_battery exists
        if (hasAlarm) {
          await this.device.removeCapability('alarm_battery').catch(() => {});
          this.device.log('[BATTERY-UNIFIED]  Removed alarm_battery (SDK v3: conflicts with measure_battery)');
        }
        return;
      }

      // Device only has IAS Zone  boolean low-battery only  alarm_battery
      if (hasIas && !hasZcl && !hasTuya) {
        if (!hasAlarm) {
          await this.device.addCapability('alarm_battery').catch(() => {});
          this.device.log('[BATTERY-UNIFIED]  Added alarm_battery (IAS Zone low-battery only)');
        }
        // SDK v3: remove measure_battery if alarm_battery exists
        if (hasMeasure) {
          await this.device.removeCapability('measure_battery').catch(() => {});
          this.device.log('[BATTERY-UNIFIED]  Removed measure_battery (SDK v3: conflicts with alarm_battery)');
        }
        return;
      }

      // Unknown source  keep whatever is declared in compose
      // Don't touch capabilities, let the device report what it reports
    } catch (err) {
      this.device.log('[BATTERY-UNIFIED] Capability adaptation error:', err.message);
    }
  }

  /**
   * Check for IAS Zone cluster (some devices report battery via Zone Status)
   */
  _hasIasZoneCluster(zclNode) {
    try {
      const endpoint = zclNode?.endpoints?.[1];
      if (!endpoint?.clusters) return false;
      return !!(
        endpoint.clusters.iasZone ||
        endpoint.clusters.ssIasZone ||
        endpoint.clusters[0x0500] ||
        endpoint.clusters['0x0500']
      );
    } catch { return false; }
  }

  /**
   * Check if device is kinetic/self-powered (energy harvesting)
   * These devices have no battery AND no mains  they get energy from button clicks
   */
  _isKineticDevice() {
    try {
      const settings = this.device.getSettings?.() || {};const modelId = CI.normalize(settings.zb_model_id || '');
      // TS004x are wireless scene switches  many are kinetic
      // Also check for 'self_powered' in driver config
      return /^TS004[1-6]$/.test(modelId) && 
             !this.device.getEnergy?.()?.batteries?.length;
    } catch { return false; }
  }

  /**
   * Setup IAS Zone battery monitoring
   * Some Tuya sensors report low-battery via IAS Zone Status bit 3
   */
  _setupIasZoneBattery(zclNode) {
    try {
      const endpoint = zclNode?.endpoints?.[1];
      const cluster = endpoint?.clusters?.iasZone || endpoint?.clusters?.ssIasZone;
      if (!cluster) return;

      // Zone Status bit 3 = battery low
      const parseLowBat = (status) => (status & 0x08) !== 0;

      if (cluster.onZoneStatusChangeNotification) {
        const origHandler = cluster.onZoneStatusChangeNotification;
        cluster.onZoneStatusChangeNotification = (payload) => {
          origHandler(payload);
          const lowBat = parseLowBat(payload?.zoneStatus || 0);this._updateBatteryAlarm(lowBat);
        };
      } else {
        cluster.onZoneStatusChangeNotification = (payload) => {
          const lowBat = parseLowBat(payload?.zoneStatus || 0);this._updateBatteryAlarm(lowBat);
        };
      }

      cluster.on?.('attr.zoneStatus', (status) => {
        const lowBat = parseLowBat(status);
        this._updateBatteryAlarm(lowBat);
      });

      this.device.log('[BATTERY-UNIFIED]  IAS Zone battery listener configured');
    } catch (err) {
      this.device.log('[BATTERY-UNIFIED] IAS Zone battery setup error:', err.message);
    }
  }

  /**
   * Update alarm_battery from IAS Zone or other boolean source
   */
  _updateBatteryAlarm(isLow) {
    if (this.device.hasCapability?.('alarm_battery')) {
      this.device.setCapabilityValue('alarm_battery', isLow).catch(() => {});
      this.device.log(`[BATTERY-UNIFIED]  Battery alarm: ${isLow ? 'LOW' : 'OK'}`);
    }
    // If we also have measure_battery and the device reports low,
    // we can infer approximately 5-10%
    if (isLow && this.device.hasCapability?.('measure_battery') && this.lastValue === null) {
      this._updateBattery(5);
    }
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
      const settings = this.device.getSettings?.() || {};const store = this.device.getStore?.() || {};const modelId = settings.zb_model_id || settings.zb_model_id || store.modelId || '';
      const mfr = settings.zb_manufacturer_name || settings.zb_manufacturer_name || store.manufacturerName || '';

      // TS0601 = Pure Tuya DP
      // _TZE = Tuya extended
      return CI.equalsCI(modelId, 'TS0601') || CI.startsWithCI(mfr, '_TZE');
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
          const percent = Math.round(safeParse(attrs.batteryPercentageRemaining));
          this._updateBattery(percent);
          this.device.log(`[BATTERY-UNIFIED]  ZCL read: ${percent}%`);
        }

        if (attrs.batteryVoltage !== undefined) {
          // Value is in 0.1V units
          const voltage = safeParse(attrs.batteryVoltage, 10);
          this._updateVoltage(voltage);
          this.device.log(`[BATTERY-UNIFIED]  ZCL voltage: ${voltage}V`);
        }
      } catch (readErr) {
        this.device.log('[BATTERY-UNIFIED] ZCL read failed (normal for sleeping devices):', readErr.message);
      }

      // Setup reporting listener
      cluster.on('attr.batteryPercentageRemaining', (value) => {
        const percent = Math.round(safeParse(value));
        this._updateBattery(percent);
        this.device.log(`[BATTERY-UNIFIED]  ZCL report: ${percent}%`);
      });

      cluster.on('attr.batteryVoltage', (value) => {
        const voltage = safeParse(value, 10);
        this._updateVoltage(voltage);
        this.device.log(`[BATTERY-UNIFIED]  ZCL voltage report: ${voltage}V`);
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
        this.device.log('[BATTERY-UNIFIED]  ZCL reporting configured');
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

      this.device.log('[BATTERY-UNIFIED]  Tuya DP listeners registered');
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
      percent = Math.round(safeParse(value));
    }

    // Clamp to valid range
    percent = Math.max(0, Math.min(100, Math.round(percent)));

    this.device.log(`[BATTERY-UNIFIED]  Tuya DP${dp}: ${percent}%`);
    this._updateBattery(percent);
  }

  /**
   * Handle Tuya voltage DP
   */
  _handleTuyaVoltageDP(dp, value) {
    let voltage = value;

    // DP 247 is in mV
    if (dp === 247) {
      voltage = safeParse(value, 1000);
    }
    // DP 33/35 might be in 10mV or 100mV
    else if (value > 100) {
      voltage = safeParse(value, 100);
    } else if (value > 10) {
      voltage = safeParse(value, 10);
    }

    // Sanity check
    if (voltage > 0 && voltage < 20) {
      this.device.log(`[BATTERY-UNIFIED]  Tuya voltage DP${dp}: ${voltage}V`);
      this._updateVoltage(voltage);
    }
  }

  /**
   * Set default battery value
   */
  _setDefaultBattery() {
    if (this.device.hasCapability?.('measure_battery')) {
      const current = this.device.getCapabilityValue?.('measure_battery');if (current === null || current === undefined) {
        // v5.8.70: Restore from store instead of misleading 100%
        const stored = this.device.getStoreValue?.('last_battery_percentage');
        if (stored !== null && stored !== undefined && typeof stored === 'number') {
          this.device.log(`[BATTERY-UNIFIED]  Restored stored battery: ${stored}%`);
          this._updateBattery(stored, true);
        }
      }
    }
  }

  /**
   * Update battery capability
   * v5.8.70: Anti-flood  dedup + 5min throttle
   */
  _updateBattery(percent, force = false) {
    const prev = this.device.getCapabilityValue?.('measure_battery');if (!force) {
      if (prev === percent) return;
      const now = Date.now();
      const elapsed = now - (this._lastBattUpdate || 0);
      const change = prev !== null ? Math.abs(percent - prev) : 100;
      if (elapsed < 300000 && change < 2) return;
      this._lastBattUpdate = now;
    }
    this.lastValue = percent;

    if (this.device.hasCapability?.('measure_battery')) {
      this.device.setCapabilityValue('measure_battery', parseFloat(percent)).catch(err => {
        this.device.error('[BATTERY-UNIFIED] Failed to set battery:', err.message);
      });
      this.device.setStoreValue('last_battery_percentage', Math.round(percent)).catch(() => {});
    }

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
      this.device.setCapabilityValue('measure_voltage', parseFloat(voltage).catch(() => { }));
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
    const mV =Math.round(voltage);
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
        const numerator = safeMultiply(mV - curve[i + 1][0], curve[i][1] - curve[i + 1][1]);
        const denominator = curve[i][0] - curve[i + 1][0];
        return Math.round(curve[i + 1][1] + safeDivide(numerator, denominator));
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
      this.device.log('[BATTERY-UNIFIED]  Mains-powered - removing battery capability');
      await this.device.removeCapability('measure_battery').catch(() => { });
    }

    return isMains;
  }
}

module.exports = UnifiedBatteryHandler;


