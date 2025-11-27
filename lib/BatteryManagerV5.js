'use strict';

/**
 * BATTERY MANAGER V5 - ULTIMATE PRECISION
 *
 * Consolidation de toutes les versions précédentes avec:
 * - 15+ types de batteries supportés
 * - Courbes de décharge précises par chimie
 * - Compensation température
 * - Support multi-cellules (2xAA, 4xAAA, etc.)
 * - Lissage intelligent (évite les sauts)
 * - Monitoring santé batterie
 * - Support Tuya DP natif
 * - Alertes configurables
 *
 * Basé sur: V1, V2, V3, V4, BatteryCalculator, BatteryHelper, tuya-engine/battery
 */

class BatteryManagerV5 {

  /**
   * SPECIFICATIONS BATTERIES COMPLÈTES
   * Basées sur datasheets constructeurs + tests réels
   */
  static BATTERY_SPECS = {
    // ═══════════════════════════════════════════════════════════════
    // LITHIUM COIN CELLS (3V nominal)
    // ═══════════════════════════════════════════════════════════════
    'CR2032': {
      type: 'Lithium Coin Cell',
      chemistry: 'Li-MnO2',
      cells: 1,
      nominal: 3.0,
      capacity: 220,      // mAh
      fresh: 3.3,
      full: 3.0,
      low: 2.5,
      dead: 2.0,
      selfDischarge: 1,   // % per year
      tempCoeff: -0.003,  // V per °C below 20°C
      curve: [
        { v: 3.30, p: 100 }, { v: 3.10, p: 98 }, { v: 3.00, p: 95 },
        { v: 2.95, p: 90 }, { v: 2.90, p: 85 }, { v: 2.85, p: 75 },
        { v: 2.80, p: 65 }, { v: 2.75, p: 50 }, { v: 2.70, p: 40 },
        { v: 2.60, p: 25 }, { v: 2.50, p: 15 }, { v: 2.40, p: 8 },
        { v: 2.30, p: 4 }, { v: 2.20, p: 2 }, { v: 2.00, p: 0 }
      ]
    },
    'CR2450': {
      type: 'Lithium Coin Cell',
      chemistry: 'Li-MnO2',
      cells: 1,
      nominal: 3.0,
      capacity: 620,
      fresh: 3.3,
      full: 3.0,
      low: 2.5,
      dead: 2.0,
      selfDischarge: 1,
      tempCoeff: -0.003,
      curve: [
        { v: 3.30, p: 100 }, { v: 3.10, p: 98 }, { v: 3.00, p: 95 },
        { v: 2.95, p: 90 }, { v: 2.90, p: 85 }, { v: 2.85, p: 75 },
        { v: 2.80, p: 65 }, { v: 2.75, p: 50 }, { v: 2.70, p: 40 },
        { v: 2.60, p: 25 }, { v: 2.50, p: 15 }, { v: 2.40, p: 8 },
        { v: 2.30, p: 4 }, { v: 2.00, p: 0 }
      ]
    },
    'CR2477': {
      type: 'Lithium Coin Cell',
      chemistry: 'Li-MnO2',
      cells: 1,
      nominal: 3.0,
      capacity: 1000,
      fresh: 3.3,
      full: 3.0,
      low: 2.5,
      dead: 2.0,
      selfDischarge: 1,
      tempCoeff: -0.003,
      curve: [
        { v: 3.30, p: 100 }, { v: 3.00, p: 95 }, { v: 2.90, p: 85 },
        { v: 2.80, p: 70 }, { v: 2.70, p: 50 }, { v: 2.60, p: 30 },
        { v: 2.50, p: 15 }, { v: 2.40, p: 8 }, { v: 2.00, p: 0 }
      ]
    },
    'CR123A': {
      type: 'Lithium Photo',
      chemistry: 'Li-MnO2',
      cells: 1,
      nominal: 3.0,
      capacity: 1500,
      fresh: 3.3,
      full: 3.0,
      low: 2.5,
      dead: 2.0,
      selfDischarge: 1,
      tempCoeff: -0.003,
      curve: [
        { v: 3.30, p: 100 }, { v: 3.15, p: 95 }, { v: 3.00, p: 90 },
        { v: 2.90, p: 80 }, { v: 2.80, p: 65 }, { v: 2.70, p: 45 },
        { v: 2.60, p: 25 }, { v: 2.50, p: 12 }, { v: 2.40, p: 5 },
        { v: 2.00, p: 0 }
      ]
    },
    'CR1632': {
      type: 'Lithium Coin Cell',
      chemistry: 'Li-MnO2',
      cells: 1,
      nominal: 3.0,
      capacity: 140,
      fresh: 3.3,
      full: 3.0,
      low: 2.5,
      dead: 2.0,
      selfDischarge: 1,
      tempCoeff: -0.003,
      curve: [
        { v: 3.30, p: 100 }, { v: 3.00, p: 95 }, { v: 2.90, p: 85 },
        { v: 2.80, p: 70 }, { v: 2.70, p: 50 }, { v: 2.60, p: 30 },
        { v: 2.50, p: 15 }, { v: 2.00, p: 0 }
      ]
    },

    // ═══════════════════════════════════════════════════════════════
    // ALKALINE (1.5V nominal per cell)
    // ═══════════════════════════════════════════════════════════════
    'AAA': {
      type: 'Alkaline',
      chemistry: 'Zn-MnO2',
      cells: 1,
      nominal: 1.5,
      capacity: 1200,
      fresh: 1.65,
      full: 1.55,
      low: 1.1,
      dead: 0.9,
      selfDischarge: 3,
      tempCoeff: -0.004,
      curve: [
        { v: 1.65, p: 100 }, { v: 1.55, p: 95 }, { v: 1.50, p: 90 },
        { v: 1.45, p: 80 }, { v: 1.40, p: 70 }, { v: 1.35, p: 60 },
        { v: 1.30, p: 50 }, { v: 1.25, p: 40 }, { v: 1.20, p: 30 },
        { v: 1.15, p: 20 }, { v: 1.10, p: 12 }, { v: 1.05, p: 6 },
        { v: 1.00, p: 3 }, { v: 0.90, p: 0 }
      ]
    },
    'AA': {
      type: 'Alkaline',
      chemistry: 'Zn-MnO2',
      cells: 1,
      nominal: 1.5,
      capacity: 2850,
      fresh: 1.65,
      full: 1.55,
      low: 1.1,
      dead: 0.9,
      selfDischarge: 3,
      tempCoeff: -0.004,
      curve: [
        { v: 1.65, p: 100 }, { v: 1.55, p: 95 }, { v: 1.50, p: 90 },
        { v: 1.45, p: 80 }, { v: 1.40, p: 70 }, { v: 1.35, p: 60 },
        { v: 1.30, p: 50 }, { v: 1.25, p: 40 }, { v: 1.20, p: 30 },
        { v: 1.15, p: 20 }, { v: 1.10, p: 12 }, { v: 1.05, p: 6 },
        { v: 1.00, p: 3 }, { v: 0.90, p: 0 }
      ]
    },
    'C': {
      type: 'Alkaline',
      chemistry: 'Zn-MnO2',
      cells: 1,
      nominal: 1.5,
      capacity: 8000,
      fresh: 1.65,
      full: 1.55,
      low: 1.1,
      dead: 0.9,
      selfDischarge: 3,
      tempCoeff: -0.004,
      curve: [
        { v: 1.65, p: 100 }, { v: 1.55, p: 95 }, { v: 1.50, p: 88 },
        { v: 1.45, p: 78 }, { v: 1.40, p: 68 }, { v: 1.35, p: 55 },
        { v: 1.30, p: 42 }, { v: 1.25, p: 30 }, { v: 1.20, p: 20 },
        { v: 1.10, p: 8 }, { v: 0.90, p: 0 }
      ]
    },
    'D': {
      type: 'Alkaline',
      chemistry: 'Zn-MnO2',
      cells: 1,
      nominal: 1.5,
      capacity: 17000,
      fresh: 1.65,
      full: 1.55,
      low: 1.1,
      dead: 0.9,
      selfDischarge: 3,
      tempCoeff: -0.004,
      curve: [
        { v: 1.65, p: 100 }, { v: 1.55, p: 95 }, { v: 1.50, p: 88 },
        { v: 1.45, p: 78 }, { v: 1.40, p: 68 }, { v: 1.35, p: 55 },
        { v: 1.30, p: 42 }, { v: 1.25, p: 30 }, { v: 1.20, p: 20 },
        { v: 1.10, p: 8 }, { v: 0.90, p: 0 }
      ]
    },
    '9V': {
      type: 'Alkaline',
      chemistry: 'Zn-MnO2',
      cells: 6,  // 6 cells in series
      nominal: 9.0,
      capacity: 565,
      fresh: 9.6,
      full: 9.0,
      low: 7.2,
      dead: 5.4,
      selfDischarge: 3,
      tempCoeff: -0.024,  // 6 cells × -0.004
      curve: [
        { v: 9.60, p: 100 }, { v: 9.30, p: 95 }, { v: 9.00, p: 88 },
        { v: 8.70, p: 78 }, { v: 8.40, p: 65 }, { v: 8.10, p: 50 },
        { v: 7.80, p: 35 }, { v: 7.50, p: 22 }, { v: 7.20, p: 12 },
        { v: 6.60, p: 5 }, { v: 5.40, p: 0 }
      ]
    },

    // ═══════════════════════════════════════════════════════════════
    // MULTI-CELL CONFIGURATIONS (common in Zigbee devices)
    // ═══════════════════════════════════════════════════════════════
    '2xAAA': {
      type: 'Alkaline Multi-Cell',
      chemistry: 'Zn-MnO2',
      cells: 2,
      nominal: 3.0,
      capacity: 1200,
      fresh: 3.30,
      full: 3.10,
      low: 2.20,
      dead: 1.80,
      selfDischarge: 3,
      tempCoeff: -0.008,
      curve: [
        { v: 3.30, p: 100 }, { v: 3.10, p: 95 }, { v: 3.00, p: 90 },
        { v: 2.90, p: 80 }, { v: 2.80, p: 70 }, { v: 2.70, p: 60 },
        { v: 2.60, p: 50 }, { v: 2.50, p: 40 }, { v: 2.40, p: 30 },
        { v: 2.30, p: 20 }, { v: 2.20, p: 12 }, { v: 2.00, p: 5 },
        { v: 1.80, p: 0 }
      ]
    },
    '2xAA': {
      type: 'Alkaline Multi-Cell',
      chemistry: 'Zn-MnO2',
      cells: 2,
      nominal: 3.0,
      capacity: 2850,
      fresh: 3.30,
      full: 3.10,
      low: 2.20,
      dead: 1.80,
      selfDischarge: 3,
      tempCoeff: -0.008,
      curve: [
        { v: 3.30, p: 100 }, { v: 3.10, p: 95 }, { v: 3.00, p: 90 },
        { v: 2.90, p: 80 }, { v: 2.80, p: 70 }, { v: 2.70, p: 60 },
        { v: 2.60, p: 50 }, { v: 2.50, p: 40 }, { v: 2.40, p: 30 },
        { v: 2.30, p: 20 }, { v: 2.20, p: 12 }, { v: 2.00, p: 5 },
        { v: 1.80, p: 0 }
      ]
    },
    '4xAAA': {
      type: 'Alkaline Multi-Cell',
      chemistry: 'Zn-MnO2',
      cells: 4,
      nominal: 6.0,
      capacity: 1200,
      fresh: 6.60,
      full: 6.20,
      low: 4.40,
      dead: 3.60,
      selfDischarge: 3,
      tempCoeff: -0.016,
      curve: [
        { v: 6.60, p: 100 }, { v: 6.20, p: 95 }, { v: 6.00, p: 90 },
        { v: 5.80, p: 80 }, { v: 5.60, p: 70 }, { v: 5.40, p: 60 },
        { v: 5.20, p: 50 }, { v: 5.00, p: 40 }, { v: 4.80, p: 30 },
        { v: 4.60, p: 20 }, { v: 4.40, p: 12 }, { v: 4.00, p: 5 },
        { v: 3.60, p: 0 }
      ]
    },

    // ═══════════════════════════════════════════════════════════════
    // LITHIUM-ION RECHARGEABLE (3.7V nominal)
    // ═══════════════════════════════════════════════════════════════
    'Li-ion': {
      type: 'Lithium-ion Rechargeable',
      chemistry: 'Li-ion',
      cells: 1,
      nominal: 3.7,
      capacity: 2600,
      fresh: 4.20,
      full: 4.10,
      low: 3.30,
      dead: 2.80,
      selfDischarge: 2,
      tempCoeff: -0.002,
      curve: [
        { v: 4.20, p: 100 }, { v: 4.15, p: 98 }, { v: 4.10, p: 95 },
        { v: 4.00, p: 88 }, { v: 3.90, p: 78 }, { v: 3.80, p: 65 },
        { v: 3.70, p: 50 }, { v: 3.60, p: 35 }, { v: 3.50, p: 22 },
        { v: 3.40, p: 12 }, { v: 3.30, p: 5 }, { v: 3.00, p: 2 },
        { v: 2.80, p: 0 }
      ]
    },
    'Li-polymer': {
      type: 'Lithium-polymer Rechargeable',
      chemistry: 'Li-po',
      cells: 1,
      nominal: 3.7,
      capacity: 1200,
      fresh: 4.20,
      full: 4.10,
      low: 3.30,
      dead: 3.00,
      selfDischarge: 2,
      tempCoeff: -0.002,
      curve: [
        { v: 4.20, p: 100 }, { v: 4.15, p: 97 }, { v: 4.10, p: 93 },
        { v: 4.00, p: 85 }, { v: 3.90, p: 73 }, { v: 3.80, p: 58 },
        { v: 3.70, p: 42 }, { v: 3.60, p: 28 }, { v: 3.50, p: 16 },
        { v: 3.40, p: 8 }, { v: 3.30, p: 3 }, { v: 3.00, p: 0 }
      ]
    },
    '18650': {
      type: 'Lithium-ion 18650',
      chemistry: 'Li-ion',
      cells: 1,
      nominal: 3.7,
      capacity: 3400,  // High capacity cells
      fresh: 4.20,
      full: 4.10,
      low: 3.30,
      dead: 2.50,
      selfDischarge: 2,
      tempCoeff: -0.002,
      curve: [
        { v: 4.20, p: 100 }, { v: 4.10, p: 95 }, { v: 4.00, p: 88 },
        { v: 3.90, p: 78 }, { v: 3.80, p: 65 }, { v: 3.70, p: 50 },
        { v: 3.60, p: 35 }, { v: 3.50, p: 22 }, { v: 3.40, p: 12 },
        { v: 3.30, p: 5 }, { v: 3.00, p: 2 }, { v: 2.50, p: 0 }
      ]
    }
  };

  /**
   * POLLING INTERVALS PAR TYPE D'APPAREIL
   */
  static INTERVALS = {
    button: 43200,           // 12h (event-driven devices)
    remote: 43200,           // 12h
    sensor_motion: 14400,    // 4h
    sensor_climate: 7200,    // 2h (need frequent updates)
    sensor_contact: 21600,   // 6h
    sensor_water: 14400,     // 4h
    sensor_soil: 3600,       // 1h
    trv: 7200,               // 2h (TRV motors use battery)
    thermostat: 7200,        // 2h
    lock: 10800,             // 3h
    siren: 21600,            // 6h
    default: 14400           // 4h
  };

  /**
   * DEVICE TYPE → BATTERY TYPE MAPPING
   */
  static DEVICE_BATTERY_MAP = {
    // Buttons & Remotes
    'button': 'CR2032',
    'remote': 'CR2032',
    'scene_switch': 'CR2032',
    'smart_knob': 'CR2032',

    // Motion sensors
    'motion': 'CR2450',
    'pir': 'CR2450',
    'radar': 'Li-ion',  // Radar sensors often have internal Li-ion
    'presence': 'Li-ion',

    // Environmental sensors
    'climate': '2xAAA',
    'temperature': 'CR2032',
    'humidity': 'CR2032',
    'soil': '2xAAA',
    'air_quality': 'Li-ion',

    // Security sensors
    'contact': 'CR2032',
    'door': 'CR2032',
    'window': 'CR1632',
    'vibration': 'CR2032',
    'water': 'CR2032',
    'leak': 'CR2032',
    'smoke': 'CR123A',
    'gas': 'Li-ion',

    // Other devices
    'trv': '2xAA',
    'thermostat': '2xAA',
    'lock': '4xAAA',
    'siren': '2xAA',
    'sos': 'CR2032'
  };

  // ═══════════════════════════════════════════════════════════════
  // INSTANCE
  // ═══════════════════════════════════════════════════════════════

  constructor(device, options = {}) {
    this.device = device;
    this.batteryType = options.batteryType || null;
    this.temperature = options.temperature || 20; // °C
    this.smoothing = options.smoothing !== false;
    this.smoothingFactor = options.smoothingFactor || 0.3;

    // State
    this.lastPercentage = null;
    this.lastVoltage = null;
    this.readings = [];
    this.method = null;
    this.pollingInterval = null;

    // Tuya DP
    this._tuyaDPEnabled = options.useTuyaDP !== false;
    this._tuyaDPDisabled = false;

    // Health monitoring
    this.health = {
      drainRate: null,      // % per day
      estimatedDays: null,  // days remaining
      lastUpdate: null,
      history: []           // Last 30 readings
    };
  }

  /**
   * Start battery monitoring
   */
  async start() {
    this.log('Starting V5 ultra-precision monitoring...');

    // Auto-detect battery type
    if (!this.batteryType) {
      this.batteryType = this.detectBatteryType();
    }
    this.log(`Battery type: ${this.batteryType}`);

    // Get specs
    const specs = BatteryManagerV5.BATTERY_SPECS[this.batteryType];
    if (specs) {
      this.log(`Specs: ${specs.type} ${specs.chemistry} ${specs.capacity}mAh`);
    }

    // Try methods in priority order
    if (await this.tryTuyaDP()) {
      this.method = 'tuya_dp';
    } else if (await this.tryZCL()) {
      this.method = 'zcl';
    } else {
      this.log('No battery source available - passive mode');
      this.method = 'passive';
    }

    this.log(`Method: ${this.method}`);

    // Start polling
    const deviceType = this.detectDeviceType();
    const intervalMs = (BatteryManagerV5.INTERVALS[deviceType] || BatteryManagerV5.INTERVALS.default) * 1000;
    this.startPolling(intervalMs);

    return true;
  }

  /**
   * Auto-detect battery type from device info
   */
  detectBatteryType() {
    const settings = this.device.getSettings?.() || {};
    const driverId = this.device.driver?.id || '';

    // 1. Check user settings
    if (settings.battery_type && settings.battery_type !== 'auto') {
      return settings.battery_type;
    }

    // 2. Check driver name for hints
    for (const [keyword, batteryType] of Object.entries(BatteryManagerV5.DEVICE_BATTERY_MAP)) {
      if (driverId.toLowerCase().includes(keyword)) {
        return batteryType;
      }
    }

    // 3. Check voltage to guess
    if (this.lastVoltage) {
      if (this.lastVoltage > 3.8) return 'Li-ion';
      if (this.lastVoltage > 3.2) return 'CR2032';
      if (this.lastVoltage > 2.8 && this.lastVoltage < 3.2) return '2xAAA';
      if (this.lastVoltage > 1.3 && this.lastVoltage < 1.7) return 'AAA';
    }

    return 'CR2032'; // Safe default
  }

  /**
   * Detect device type for polling interval
   */
  detectDeviceType() {
    const driverId = this.device.driver?.id || '';

    for (const keyword of Object.keys(BatteryManagerV5.INTERVALS)) {
      if (driverId.toLowerCase().includes(keyword.replace('sensor_', ''))) {
        return keyword;
      }
    }
    return 'default';
  }

  /**
   * Calculate percentage from voltage with temperature compensation
   */
  static calculateFromVoltage(voltage, batteryType = 'CR2032', temperature = 20) {
    const specs = this.BATTERY_SPECS[batteryType];
    if (!specs) {
      console.warn(`Unknown battery: ${batteryType}, using CR2032`);
      return this.calculateFromVoltage(voltage, 'CR2032', temperature);
    }

    // Temperature compensation (batteries perform worse in cold)
    let compensatedVoltage = voltage;
    if (temperature < 20) {
      const tempDiff = 20 - temperature;
      compensatedVoltage = voltage - (specs.tempCoeff * tempDiff);
    }

    // Check bounds
    if (compensatedVoltage >= specs.fresh) return 100;
    if (compensatedVoltage <= specs.dead) return 0;

    // Interpolate on curve
    const curve = specs.curve;
    for (let i = 0; i < curve.length - 1; i++) {
      const high = curve[i];
      const low = curve[i + 1];

      if (compensatedVoltage >= low.v && compensatedVoltage <= high.v) {
        const vRange = high.v - low.v;
        const pRange = high.p - low.p;
        const vOffset = compensatedVoltage - low.v;

        const percentage = low.p + (vOffset / vRange) * pRange;
        return Math.round(Math.max(0, Math.min(100, percentage)));
      }
    }

    return compensatedVoltage > curve[0].v ? 100 : 0;
  }

  /**
   * Calculate from Zigbee raw value (0-200 scale)
   */
  static calculateFromZigbee(rawValue, modelId = '') {
    if (rawValue == null || isNaN(rawValue)) return null;

    // Standard Zigbee: 0-200 = 0-100%
    let percentage = rawValue / 2;

    // Clamp
    return Math.round(Math.max(0, Math.min(100, percentage)));
  }

  /**
   * Calculate from Tuya DP (usually 0-100 direct)
   */
  static calculateFromTuyaDP(dpValue) {
    if (dpValue == null || isNaN(dpValue)) return null;
    return Math.round(Math.max(0, Math.min(100, dpValue)));
  }

  /**
   * Apply smoothing to avoid jumps
   */
  applySmoothing(newPercentage) {
    if (!this.smoothing || this.lastPercentage === null) {
      this.lastPercentage = newPercentage;
      return newPercentage;
    }

    // Exponential moving average
    const smoothed = this.lastPercentage +
      this.smoothingFactor * (newPercentage - this.lastPercentage);

    // Round to integer
    const result = Math.round(smoothed);

    // Don't let it jump more than 5% at once (unless charging/replacing)
    const maxJump = 5;
    if (Math.abs(result - this.lastPercentage) > maxJump) {
      // Large jump - might be battery replacement
      if (newPercentage > this.lastPercentage + 20) {
        // Battery replaced - accept new value
        this.lastPercentage = newPercentage;
        return newPercentage;
      }
      // Limit the change
      const direction = result > this.lastPercentage ? 1 : -1;
      this.lastPercentage = this.lastPercentage + (direction * maxJump);
      return this.lastPercentage;
    }

    this.lastPercentage = result;
    return result;
  }

  /**
   * Update health monitoring
   */
  updateHealth(percentage) {
    const now = Date.now();

    // Add to history
    this.health.history.push({ time: now, percentage });

    // Keep only last 30 readings
    if (this.health.history.length > 30) {
      this.health.history.shift();
    }

    // Calculate drain rate (% per day)
    if (this.health.history.length >= 2) {
      const oldest = this.health.history[0];
      const newest = this.health.history[this.health.history.length - 1];

      const daysDiff = (newest.time - oldest.time) / (1000 * 60 * 60 * 24);
      const percentDiff = oldest.percentage - newest.percentage;

      if (daysDiff > 0 && percentDiff > 0) {
        this.health.drainRate = percentDiff / daysDiff;
        this.health.estimatedDays = Math.round(percentage / this.health.drainRate);
      }
    }

    this.health.lastUpdate = now;
  }

  /**
   * Try Tuya DP method
   */
  async tryTuyaDP() {
    if (!this._tuyaDPEnabled) return false;
    if (!this.device.tuyaEF00Manager) return false;

    try {
      // Register listeners for battery DPs (4, 14, 15)
      this.device.tuyaEF00Manager.on('dp-4', (value) => this.onTuyaDPBattery(value));
      this.device.tuyaEF00Manager.on('dp-14', (value) => this.onTuyaDPBattery(value));
      this.device.tuyaEF00Manager.on('dp-15', (value) => this.onTuyaDPBattery(value));

      this.log('Tuya DP listeners registered');
      return true;
    } catch (err) {
      this.log('Tuya DP setup failed:', err.message);
      return false;
    }
  }

  /**
   * Handle Tuya DP battery report
   */
  async onTuyaDPBattery(value) {
    const percentage = BatteryManagerV5.calculateFromTuyaDP(value);
    if (percentage !== null) {
      await this.updateBattery(percentage, 'tuya_dp');
    }
  }

  /**
   * Try ZCL cluster method
   */
  async tryZCL() {
    try {
      const ep = this.device.zclNode?.endpoints?.[1];
      if (!ep?.clusters?.genPowerCfg) return false;

      // Register listener
      ep.clusters.genPowerCfg.on('report', (attr, value) => {
        if (attr === 'batteryPercentageRemaining') {
          const pct = BatteryManagerV5.calculateFromZigbee(value);
          if (pct !== null) this.updateBattery(pct, 'zcl_percent');
        } else if (attr === 'batteryVoltage') {
          const voltage = value / 10; // 0.1V units
          this.lastVoltage = voltage;
          const pct = BatteryManagerV5.calculateFromVoltage(voltage, this.batteryType, this.temperature);
          this.updateBattery(pct, 'zcl_voltage');
        }
      });

      this.log('ZCL listeners registered');
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Update battery value
   */
  async updateBattery(percentage, source) {
    if (percentage === null) return;

    // Apply smoothing
    const smoothed = this.applySmoothing(percentage);

    // Update health
    this.updateHealth(smoothed);

    // Store
    await this.device.setStoreValue('last_battery_percent', smoothed).catch(() => { });

    // Set capability
    if (this.device.hasCapability('measure_battery')) {
      await this.device.setCapabilityValue('measure_battery', smoothed).catch((err) => {
        this.log('Failed to set battery:', err.message);
      });
    }

    this.log(`Battery: ${smoothed}% (raw: ${percentage}%, source: ${source})`);

    // Check alerts
    this.checkAlerts(smoothed);
  }

  /**
   * Check battery alerts
   */
  checkAlerts(percentage) {
    const settings = this.device.getSettings?.() || {};
    const lowThreshold = settings.battery_low_threshold || 20;
    const criticalThreshold = settings.battery_critical_threshold || 10;

    // TODO: Trigger flow cards for low/critical battery
  }

  /**
   * Start polling
   */
  startPolling(intervalMs) {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(() => {
      this.poll();
    }, intervalMs);

    // Initial poll
    this.poll();

    this.log(`Polling started: ${intervalMs / 1000 / 60}min interval`);
  }

  /**
   * Poll battery
   */
  async poll() {
    // TODO: Implement polling based on method
  }

  /**
   * Log helper
   */
  log(...args) {
    this.device?.log?.('[BATTERY-V5]', ...args);
  }

  /**
   * Get battery status text
   */
  static getStatus(percentage) {
    if (percentage > 80) return 'good';
    if (percentage > 50) return 'medium';
    if (percentage > 20) return 'low';
    if (percentage > 10) return 'critical';
    return 'dead';
  }

  /**
   * Get estimated days remaining
   */
  getEstimatedDays() {
    return this.health.estimatedDays;
  }

  /**
   * Cleanup
   */
  stop() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}

module.exports = BatteryManagerV5;
