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
   * Initialize battery handling — runtime adaptive
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
    if (this.initialized) {return;}

    this.device.log('[BATTERY-UNIFIED] 🔋 Initializing runtime-adaptive energy handler...');

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
    const hasBatteryCap = this.device.hasCapability?.('measure_battery') === true;
    const hasAlarmCap = this.device.hasCapability?.('alarm_battery') === true;
    const isBatteryDriven = !isMains && !isKinetic && (hasBatteryCap || hasAlarmCap);

    if (hasZclBattery || (isBatteryDriven && hasBatteryCap)) {
      await this._setupZclBattery(zclNode);
      sources.push('zcl');
    }

    if (isTuyaDP || (isBatteryDriven && hasBatteryCap)) {
      this._setupTuyaBattery();
      sources.push('tuya');
    }

    if (hasIasZone || (isBatteryDriven && hasAlarmCap)) {
      this._setupIasZoneBattery(zclNode);
      sources.push('ias');
    }

    this.source = sources.length > 0 ? sources.join('+') : isMains ? 'mains' : isKinetic ? 'kinetic' : 'unknown';
    this.device.log(`[BATTERY-UNIFIED] ✅ Energy source(s): ${this.source}`);

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
      const hasMeasure = this.device.hasCapability?.('measure_battery');
      const hasAlarm = this.device.hasCapability?.('alarm_battery');

      // Mains or kinetic: remove all battery capabilities
      if (isMains || isKinetic) {
        if (hasMeasure) {
          await this.device.removeCapability('measure_battery').catch(() => {});
          this.device.log('[BATTERY-UNIFIED] ⚡ Removed measure_battery (mains/kinetic)');
        }
        if (hasAlarm) {
          await this.device.removeCapability('alarm_battery').catch(() => {});
          this.device.log('[BATTERY-UNIFIED] ⚡ Removed alarm_battery (mains/kinetic)');
        }
        return;
      }

      // Device reports battery via ZCL or Tuya DP → needs measure_battery (precise %)
      if (hasZcl || hasTuya) {
        if (!hasMeasure) {
          await this.device.addCapability('measure_battery').catch(() => {});
          this.device.log('[BATTERY-UNIFIED] ➕ Added measure_battery (runtime detection)');
        }
        // SDK v3: remove alarm_battery if measure_battery exists
        if (hasAlarm) {
          await this.device.removeCapability('alarm_battery').catch(() => {});
          this.device.log('[BATTERY-UNIFIED] ➖ Removed alarm_battery (SDK v3: conflicts with measure_battery)');
        }
        return;
      }

      // Device only has IAS Zone → boolean low-battery only → alarm_battery
      if (hasIas && !hasZcl && !hasTuya) {
        if (!hasAlarm) {
          await this.device.addCapability('alarm_battery').catch(() => {});
          this.device.log('[BATTERY-UNIFIED] ➕ Added alarm_battery (IAS Zone low-battery only)');
        }
        // SDK v3: remove measure_battery if alarm_battery exists
        if (hasMeasure) {
          await this.device.removeCapability('measure_battery').catch(() => {});
          this.device.log('[BATTERY-UNIFIED] ➖ Removed measure_battery (SDK v3: conflicts with alarm_battery)');
        }
        return;
      }

      // Unknown source — keep whatever is declared in compose
      // Don't touch capabilities, let the device report what it reports
    } catch (err) {
      this.device.log('[BATTERY-UNIFIED] Capability adaptation error:', err.message);
    }
  }

  /**
   * BUGFIX v5.8.00: Scan ALL endpoints, not just [1]
   * Many ZCL-only battery devices report powerConfiguration on endpoint[2] or [3]
   */
  _findEndpointByCluster(clusterKeys, zclNode) {
    try {
      if (!zclNode?.endpoints) {return null;}
      const keys = Array.isArray(clusterKeys) ? clusterKeys : [clusterKeys];
      for (const epKey of Object.keys(zclNode.endpoints)) {
        const ep = zclNode.endpoints[epKey];
        if (!ep?.clusters) {continue;}
        for (const key of keys) {
          if (ep.clusters[key] || ep.clusters[Number(key)] || ep.clusters[String(key)]) {
            return ep;
          }
        }
      }
      return null;
    } catch { return null; }
  }

  /**
   * Check for IAS Zone cluster (some devices report battery via Zone Status)
   * BUGFIX v5.8.00: Scan ALL endpoints, not just [1]
   */
  _hasIasZoneCluster(zclNode) {
    try {
      const ep = this._findEndpointByCluster(['iasZone', 'ssIasZone', 0x0500, '0x0500'], zclNode);
      if (!ep?.clusters) {return false;}
      return !!(
        ep.clusters.iasZone ||
        ep.clusters.ssIasZone ||
        ep.clusters[0x0500] ||
        ep.clusters['0x0500']
      );
    } catch { return false; }
  }

  /**
   * Check if device is kinetic/self-powered (energy harvesting)
   * These devices have no battery AND no mains — they get energy from button clicks
   * BUGFIX v5.8.00: Only true kinetic models, not over-matching battery TS004x
   */
  _isKineticDevice() {
    try {
      const settings = this.device.getSettings?.() || {};
      const modelId = (settings.zb_model_id || '').toUpperCase();
      
      // If driver explicitly declares batteries → not kinetic
      const energy = this.device.getEnergy?.();
      if (energy?.batteries?.length > 0) {return false;}
      
      // If driver id suggests battery-powered → not kinetic
      const driverId = (this.device.driver?.id || '').toLowerCase();
      if (driverId.includes('battery') || driverId.includes('button_wireless') || driverId.includes('remote')) {return false;}
      
      // If device has any battery capabilities declared → not kinetic
      const hasBatteryCaps = this.device.hasCapability?.('measure_battery') || this.device.hasCapability?.('alarm_battery');
      if (hasBatteryCaps) {return false;}
      
      // True kinetic models (energy harvesting from button clicks)
      // Only TS0044/TS0046 are reliably kinetic. TS0041-3 are often battery-powered.
      const kineticModels = ['TS0044', 'TS0046'];
      return kineticModels.includes(modelId);
    } catch { return false; }
  }

  /**
   * Setup IAS Zone battery monitoring
   * Some Tuya sensors report low-battery via IAS Zone Status bit 3
   * BUGFIX v8.1.0: Removed deprecated SDK2 registerAttrReportListener
   */
  _setupIasZoneBattery(zclNode) {
    try {
      const ep = this._findEndpointByCluster(['iasZone', 'ssIasZone', 0x0500, '0x0500'], zclNode);
      const cluster = ep?.clusters?.iasZone || ep?.clusters?.ssIasZone || ep?.clusters[0x0500] || ep?.clusters['0x0500'];
      
      if (!cluster) {
        this.device.log('[BATTERY-UNIFIED] ⚠️ IAS Zone cluster missing from zclNode. endpoints:', Object.keys(zclNode?.endpoints || {}));
        return;
      }

      // Zone Status bit 3 = battery low
      const parseLowBat = (status) => (status & 0x08) !== 0;

      // Listen via SDK3 event
      cluster.on('attr.zoneStatus', (status) => {
        const lowBat = parseLowBat(status);
        this._updateBatteryAlarm(lowBat);
      });

      // Also listen via notification if supported
      if (typeof cluster.onZoneStatusChangeNotification === 'function') {
        const origHandler = cluster.onZoneStatusChangeNotification.bind(cluster);
        cluster.onZoneStatusChangeNotification = (payload) => {
          origHandler(payload);
          const lowBat = parseLowBat(payload?.zoneStatus || 0);
          this._updateBatteryAlarm(lowBat);
        };
      } else {
        cluster.onZoneStatusChangeNotification = (payload) => {
          const lowBat = parseLowBat(payload?.zoneStatus || 0);
          this._updateBatteryAlarm(lowBat);
        };
      }

      this.device.log('[BATTERY-UNIFIED] ✅ IAS Zone battery listener configured via SDK3');
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
      this.device.log(`[BATTERY-UNIFIED] 🔋 Battery alarm: ${isLow ? 'LOW' : 'OK'}`);
    }
    // If we also have measure_battery and the device reports low,
    // we can infer approximately 5-10%
    if (isLow && this.device.hasCapability?.('measure_battery') && this.lastValue === null) {
      this._updateBattery(5);
    }
  }


  /**
   * Check if ZCL battery cluster exists
   * BUGFIX v5.8.00: Scan ALL endpoints, not just [1]
   */
  _hasZclBatteryCluster(zclNode) {
    try {
      const ep = this._findEndpointByCluster(['powerConfiguration', 'genPowerCfg', 0x0001, '0x0001', 1], zclNode);
      if (!ep?.clusters) {return false;}

      // Check for powerConfiguration cluster (0x0001)
      return !!(
        ep.clusters.powerConfiguration ||
        ep.clusters.genPowerCfg ||
        ep.clusters[0x0001] ||
        ep.clusters['0x0001'] ||
        ep.clusters[1]
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
   * BUGFIX v5.8.00: Scan ALL endpoints, not just [1]
   */
  async _setupZclBattery(zclNode) {
    try {
      const ep = this._findEndpointByCluster(['powerConfiguration', 'genPowerCfg', 0x0001, '0x0001', 1], zclNode);
      const cluster = ep?.clusters?.powerConfiguration ||
        ep?.clusters?.genPowerCfg ||
        ep?.clusters?.[1];

      if (!cluster) {
        this.device.log('[BATTERY-UNIFIED] ⚠️ ZCL battery cluster missing from zclNode. endpoints:', Object.keys(zclNode?.endpoints || {}));
        return;
      }

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
        // v5.8.70: Restore from store instead of misleading 100%
        const stored = this.device.getStoreValue?.('last_battery_percentage');
        if (stored !== null && stored !== undefined && typeof stored === 'number') {
          this.device.log(`[BATTERY-UNIFIED] � Restored stored battery: ${stored}%`);
          this._updateBattery(stored, true);
        }
      }
    }
  }

  /**
   * Update battery capability
   * v5.8.70: Anti-flood — dedup + 5min throttle
   */
  _updateBattery(percent, force = false) {
    const prev = this.device.getCapabilityValue?.('measure_battery');
    if (!force) {
      if (prev === percent) {return;}
      const now = Date.now();
      const elapsed = now - (this._lastBattUpdate || 0);
      const change = prev !== null ? Math.abs(percent - prev) : 100;
      if (elapsed < 300000 && change < 2) {return;}
      this._lastBattUpdate = now;
    }
    this.lastValue = percent;

    if (this.device.hasCapability?.('measure_battery')) {
      this.device.setCapabilityValue('measure_battery', parseFloat(percent)).catch(err => {
        this.device.error('[BATTERY-UNIFIED] Failed to set battery:', err.message);
      });
      this.device.setStoreValue?.('last_battery_percentage', Math.round(percent)).catch(() => {});
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
    if (mV >= curve[0][0]) {return 100;}
    if (mV <= curve[curve.length - 1][0]) {return 0;}
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
   * BUGFIX v7.5.50: 
   * - Never classify as mains solely by absence of battery clusters
   * - A device may not be fully interviewed yet (ZCL clusters not yet reported)
   * - Voltage DPs alone are NOT an indicator of mains (many battery devices report voltage)
   * - Must check device.compose.json energy.batteries to distinguish hybrid cases
   * - BSEED / TS000x ZCL-only switches with NO battery capabilities are correctly mains
   */
  async checkMainsPowered() {
    const zclNode = this.device.zclNode;
    const driverId = (this.device.driver?.id || '').toLowerCase();

    // Priority 1: Explicit mains flag in device class
    if (this.device.mainsPowered === true) {
      this.device.log('[BATTERY-UNIFIED] ⚡ Explicit mainsPowered=true');
      if (this.device.hasCapability?.('measure_battery')) {
        await this.device.removeCapability('measure_battery').catch(() => { });
      }
      if (this.device.hasCapability?.('alarm_battery')) {
        await this.device.removeCapability('alarm_battery').catch(() => { });
      }
      return true;
    }

    // Priority 2: Known mains-powered driver IDs
    const mainsDrivers = [
      'switch_', 'socket', 'plug', 'bulb_', 'dimmer', 'device_din_rail',
      'ceiling_fan', 'air_purifier', 'air_quality', 'curtain_motor',
      'switch_usb_dongle', 'device_floor_heating', 'device_radiator_valve'
    ];
    if (mainsDrivers.some(id => driverId.startsWith(id) || driverId.includes(id))) {
      // Check if this specific driver variant actually has battery
      const hasBatteryCaps = this.device.hasCapability?.('measure_battery') || this.device.hasCapability?.('alarm_battery');
      if (!hasBatteryCaps) {
        this.device.log('[BATTERY-UNIFIED] ⚡ Mains-powered driver detected:', driverId);
        return true;
      }
      // Even mains drivers may have battery backup variants - let them through
      this.device.log('[BATTERY-UNIFIED] ⚡ Mains driver with battery backup:', driverId);
      return false;
    }

    // Priority 3: Energy config in compose
    try {
      const energy = this.device.getEnergy?.();
      if (energy?.batteries?.length === 0 && this.device.powerType === 'MAINS') {
        // Explicitly declared as mains with no batteries
        if (this.device.hasCapability?.('measure_battery')) {
          await this.device.removeCapability('measure_battery').catch(() => { });
        }
        return true;
      }
    } catch { /* energy check optional */ }

    // Priority 4: Temperature sensor inside a plug/socket device = mains
    if (driverId.includes('plug') || driverId.includes('socket')) {
      const hasTemp = this.device.hasCapability?.('measure_temperature');
      const hasBattery = this.device.hasCapability?.('measure_battery') || this.device.hasCapability?.('alarm_battery');
      if (hasTemp && !hasBattery) {return true;}
    }

    // NOT mains - let initialize() decide the actual power source
    return false;
  }
}

module.exports = UnifiedBatteryHandler;
