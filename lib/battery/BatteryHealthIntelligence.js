'use strict';

/**
 * BatteryHealthIntelligence v1.0.0
 *
 * Intelligent battery health system providing:
 * - Discharge curve analysis (non-linear mapping per chemistry)
 * - Charge cycle counting and degradation tracking
 * - Manufacturing date estimation from voltage patterns
 * - Remaining useful life prediction
 * - Health scoring (0-100)
 * - Temperature compensation
 * - Self-discharge rate estimation
 * - Load-based capacity estimation
 * - Calendar aging model
 *
 * Integrates with UnifiedBatteryHandler and BatteryMonitoringSystem.
 * NEVER uses linear formulas like (voltage - 2.5) / 0.5.
 * All voltage-to-percentage uses non-linear interpolation on chemistry curves.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CHEMISTRY DEFINITIONS WITH FULL DISCHARGE CURVES
// ═══════════════════════════════════════════════════════════════════════════════

const CHEMISTRY_PROFILES = {
  CR2032: {
    name: 'CR2032',
    type: 'Lithium Coin Cell',
    chemistry: 'Li-MnO2',
    nominalVoltage: 3.0,
    capacity_mAh: 220,
    freshVoltage: 3.3,
    fullVoltage: 3.0,
    lowVoltage: 2.5,
    deadVoltage: 2.0,
    maxCycles: 0, // Primary cell, no recharge
    expectedLifeDays: 730, // ~2 years typical
    selfDischargeRate: 0.01, // 1% per month
    tempCoeff: -0.003, // V per degree C below 20
    internalResistanceNew: 15, // ohms (approximate)
    internalResistanceEnd: 80, // ohms at end of life
    calendarAgingFactor: 0.0003, // capacity loss per day
    voltageRecoveryDelay: 30, // seconds for voltage to stabilize after load
    // Non-linear discharge curve: voltage -> percentage remaining
    curve: [
      { v: 3.30, p: 100, r: 0.05 }, { v: 3.10, p: 98, r: 0.06 },
      { v: 3.00, p: 95, r: 0.07 }, { v: 2.95, p: 90, r: 0.08 },
      { v: 2.90, p: 85, r: 0.10 }, { v: 2.85, p: 75, r: 0.13 },
      { v: 2.80, p: 65, r: 0.17 }, { v: 2.75, p: 50, r: 0.22 },
      { v: 2.70, p: 40, r: 0.28 }, { v: 2.60, p: 25, r: 0.38 },
      { v: 2.50, p: 15, r: 0.50 }, { v: 2.40, p: 8, r: 0.65 },
      { v: 2.30, p: 4, r: 0.80 }, { v: 2.20, p: 2, r: 0.95 },
      { v: 2.00, p: 0, r: 1.00 }
    ]
  },
  CR2450: {
    name: 'CR2450',
    type: 'Lithium Coin Cell',
    chemistry: 'Li-MnO2',
    nominalVoltage: 3.0,
    capacity_mAh: 620,
    freshVoltage: 3.3,
    fullVoltage: 3.0,
    lowVoltage: 2.5,
    deadVoltage: 2.0,
    maxCycles: 0,
    expectedLifeDays: 1095, // ~3 years
    selfDischargeRate: 0.01,
    tempCoeff: -0.003,
    internalResistanceNew: 10,
    internalResistanceEnd: 60,
    calendarAgingFactor: 0.00025,
    voltageRecoveryDelay: 30,
    curve: [
      { v: 3.30, p: 100, r: 0.04 }, { v: 3.10, p: 98, r: 0.05 },
      { v: 3.00, p: 95, r: 0.06 }, { v: 2.95, p: 90, r: 0.07 },
      { v: 2.90, p: 85, r: 0.09 }, { v: 2.85, p: 75, r: 0.12 },
      { v: 2.80, p: 65, r: 0.15 }, { v: 2.75, p: 50, r: 0.20 },
      { v: 2.70, p: 40, r: 0.26 }, { v: 2.60, p: 25, r: 0.35 },
      { v: 2.50, p: 15, r: 0.45 }, { v: 2.40, p: 8, r: 0.60 },
      { v: 2.30, p: 4, r: 0.75 }, { v: 2.00, p: 0, r: 1.00 }
    ]
  },
  CR123A: {
    name: 'CR123A',
    type: 'Lithium Photo',
    chemistry: 'Li-MnO2',
    nominalVoltage: 3.0,
    capacity_mAh: 1500,
    freshVoltage: 3.3,
    fullVoltage: 3.0,
    lowVoltage: 2.5,
    deadVoltage: 2.0,
    maxCycles: 0,
    expectedLifeDays: 1095, // ~3 years
    selfDischargeRate: 0.008,
    tempCoeff: -0.003,
    internalResistanceNew: 5,
    internalResistanceEnd: 40,
    calendarAgingFactor: 0.0002,
    voltageRecoveryDelay: 20,
    curve: [
      { v: 3.30, p: 100, r: 0.03 }, { v: 3.15, p: 95, r: 0.04 },
      { v: 3.00, p: 90, r: 0.06 }, { v: 2.90, p: 80, r: 0.08 },
      { v: 2.80, p: 65, r: 0.12 }, { v: 2.70, p: 45, r: 0.18 },
      { v: 2.60, p: 25, r: 0.28 }, { v: 2.50, p: 12, r: 0.40 },
      { v: 2.40, p: 5, r: 0.55 }, { v: 2.00, p: 0, r: 1.00 }
    ]
  },
  AA: {
    name: 'AA',
    type: 'Alkaline',
    chemistry: 'Zn-MnO2',
    nominalVoltage: 1.5,
    capacity_mAh: 2850,
    freshVoltage: 1.65,
    fullVoltage: 1.55,
    lowVoltage: 1.1,
    deadVoltage: 0.9,
    maxCycles: 0,
    expectedLifeDays: 730,
    selfDischargeRate: 0.03,
    tempCoeff: -0.004,
    internalResistanceNew: 2,
    internalResistanceEnd: 25,
    calendarAgingFactor: 0.0004,
    voltageRecoveryDelay: 15,
    curve: [
      { v: 1.65, p: 100, r: 0.03 }, { v: 1.55, p: 95, r: 0.04 },
      { v: 1.50, p: 90, r: 0.05 }, { v: 1.45, p: 80, r: 0.07 },
      { v: 1.40, p: 70, r: 0.09 }, { v: 1.35, p: 60, r: 0.12 },
      { v: 1.30, p: 50, r: 0.16 }, { v: 1.25, p: 40, r: 0.22 },
      { v: 1.20, p: 30, r: 0.30 }, { v: 1.15, p: 20, r: 0.40 },
      { v: 1.10, p: 12, r: 0.52 }, { v: 1.05, p: 6, r: 0.68 },
      { v: 1.00, p: 3, r: 0.85 }, { v: 0.90, p: 0, r: 1.00 }
    ]
  },
  AAA: {
    name: 'AAA',
    type: 'Alkaline',
    chemistry: 'Zn-MnO2',
    nominalVoltage: 1.5,
    capacity_mAh: 1200,
    freshVoltage: 1.65,
    fullVoltage: 1.55,
    lowVoltage: 1.1,
    deadVoltage: 0.9,
    maxCycles: 0,
    expectedLifeDays: 540,
    selfDischargeRate: 0.03,
    tempCoeff: -0.004,
    internalResistanceNew: 4,
    internalResistanceEnd: 40,
    calendarAgingFactor: 0.0005,
    voltageRecoveryDelay: 15,
    curve: [
      { v: 1.65, p: 100, r: 0.03 }, { v: 1.55, p: 95, r: 0.04 },
      { v: 1.50, p: 90, r: 0.05 }, { v: 1.45, p: 80, r: 0.07 },
      { v: 1.40, p: 70, r: 0.09 }, { v: 1.35, p: 60, r: 0.12 },
      { v: 1.30, p: 50, r: 0.16 }, { v: 1.25, p: 40, r: 0.22 },
      { v: 1.20, p: 30, r: 0.30 }, { v: 1.15, p: 20, r: 0.40 },
      { v: 1.10, p: 12, r: 0.52 }, { v: 1.05, p: 6, r: 0.68 },
      { v: 1.00, p: 3, r: 0.85 }, { v: 0.90, p: 0, r: 1.00 }
    ]
  },
  'Li-ion': {
    name: 'Li-ion',
    type: 'Lithium-ion Rechargeable',
    chemistry: 'Li-ion',
    nominalVoltage: 3.7,
    capacity_mAh: 2600,
    freshVoltage: 4.20,
    fullVoltage: 4.10,
    lowVoltage: 3.30,
    deadVoltage: 2.80,
    maxCycles: 500,
    expectedLifeDays: 1095,
    selfDischargeRate: 0.02,
    tempCoeff: -0.002,
    internalResistanceNew: 3,
    internalResistanceEnd: 30,
    calendarAgingFactor: 0.0002,
    voltageRecoveryDelay: 10,
    curve: [
      { v: 4.20, p: 100, r: 0.03 }, { v: 4.15, p: 98, r: 0.04 },
      { v: 4.10, p: 95, r: 0.05 }, { v: 4.00, p: 88, r: 0.07 },
      { v: 3.90, p: 78, r: 0.10 }, { v: 3.80, p: 65, r: 0.14 },
      { v: 3.70, p: 50, r: 0.20 }, { v: 3.60, p: 35, r: 0.28 },
      { v: 3.50, p: 22, r: 0.38 }, { v: 3.40, p: 12, r: 0.50 },
      { v: 3.30, p: 5, r: 0.65 }, { v: 3.00, p: 2, r: 0.85 },
      { v: 2.80, p: 0, r: 1.00 }
    ]
  },
  'Li-polymer': {
    name: 'Li-polymer',
    type: 'Lithium-polymer Rechargeable',
    chemistry: 'Li-po',
    nominalVoltage: 3.7,
    capacity_mAh: 1200,
    freshVoltage: 4.20,
    fullVoltage: 4.10,
    lowVoltage: 3.30,
    deadVoltage: 3.00,
    maxCycles: 500,
    expectedLifeDays: 1095,
    selfDischargeRate: 0.02,
    tempCoeff: -0.002,
    internalResistanceNew: 4,
    internalResistanceEnd: 35,
    calendarAgingFactor: 0.00025,
    voltageRecoveryDelay: 10,
    curve: [
      { v: 4.20, p: 100, r: 0.03 }, { v: 4.15, p: 97, r: 0.04 },
      { v: 4.10, p: 93, r: 0.05 }, { v: 4.00, p: 85, r: 0.08 },
      { v: 3.90, p: 73, r: 0.12 }, { v: 3.80, p: 58, r: 0.18 },
      { v: 3.70, p: 42, r: 0.26 }, { v: 3.60, p: 28, r: 0.36 },
      { v: 3.50, p: 16, r: 0.48 }, { v: 3.40, p: 8, r: 0.62 },
      { v: 3.30, p: 3, r: 0.78 }, { v: 3.00, p: 0, r: 1.00 }
    ]
  },
  NiMH: {
    name: 'NiMH',
    type: 'Nickel-Metal Hydride Rechargeable',
    chemistry: 'NiMH',
    nominalVoltage: 1.2,
    capacity_mAh: 2000,
    freshVoltage: 1.45,
    fullVoltage: 1.35,
    lowVoltage: 1.15,
    deadVoltage: 1.0,
    maxCycles: 1000,
    expectedLifeDays: 1825,
    selfDischargeRate: 0.10, // NiMH self-discharges faster
    tempCoeff: -0.003,
    internalResistanceNew: 5,
    internalResistanceEnd: 40,
    calendarAgingFactor: 0.00015,
    voltageRecoveryDelay: 10,
    curve: [
      { v: 1.45, p: 100, r: 0.03 }, { v: 1.35, p: 90, r: 0.04 },
      { v: 1.30, p: 80, r: 0.05 }, { v: 1.25, p: 70, r: 0.07 },
      { v: 1.20, p: 55, r: 0.10 }, { v: 1.18, p: 40, r: 0.15 },
      { v: 1.15, p: 25, r: 0.25 }, { v: 1.10, p: 12, r: 0.40 },
      { v: 1.05, p: 5, r: 0.60 }, { v: 1.00, p: 0, r: 1.00 }
    ]
  },
  '2xAAA': {
    name: '2xAAA',
    type: 'Alkaline Multi-Cell',
    chemistry: 'Zn-MnO2',
    nominalVoltage: 3.0,
    capacity_mAh: 1200,
    freshVoltage: 3.30,
    fullVoltage: 3.10,
    lowVoltage: 2.20,
    deadVoltage: 1.80,
    maxCycles: 0,
    expectedLifeDays: 540,
    selfDischargeRate: 0.03,
    tempCoeff: -0.008,
    internalResistanceNew: 8,
    internalResistanceEnd: 80,
    calendarAgingFactor: 0.0005,
    voltageRecoveryDelay: 15,
    curve: [
      { v: 3.30, p: 100, r: 0.03 }, { v: 3.10, p: 95, r: 0.04 },
      { v: 3.00, p: 90, r: 0.05 }, { v: 2.90, p: 80, r: 0.07 },
      { v: 2.80, p: 70, r: 0.10 }, { v: 2.70, p: 60, r: 0.13 },
      { v: 2.60, p: 50, r: 0.17 }, { v: 2.50, p: 40, r: 0.22 },
      { v: 2.40, p: 30, r: 0.30 }, { v: 2.30, p: 20, r: 0.40 },
      { v: 2.20, p: 12, r: 0.52 }, { v: 2.00, p: 5, r: 0.75 },
      { v: 1.80, p: 0, r: 1.00 }
    ]
  },
  '18650': {
    name: '18650',
    type: 'Lithium-ion 18650',
    chemistry: 'Li-ion',
    nominalVoltage: 3.7,
    capacity_mAh: 3400,
    freshVoltage: 4.20,
    fullVoltage: 4.10,
    lowVoltage: 3.30,
    deadVoltage: 2.50,
    maxCycles: 500,
    expectedLifeDays: 1825,
    selfDischargeRate: 0.02,
    tempCoeff: -0.002,
    internalResistanceNew: 2,
    internalResistanceEnd: 25,
    calendarAgingFactor: 0.00015,
    voltageRecoveryDelay: 10,
    curve: [
      { v: 4.20, p: 100, r: 0.03 }, { v: 4.10, p: 95, r: 0.04 },
      { v: 4.00, p: 88, r: 0.06 }, { v: 3.90, p: 78, r: 0.09 },
      { v: 3.80, p: 65, r: 0.13 }, { v: 3.70, p: 50, r: 0.18 },
      { v: 3.60, p: 35, r: 0.25 }, { v: 3.50, p: 22, r: 0.34 },
      { v: 3.40, p: 12, r: 0.45 }, { v: 3.30, p: 5, r: 0.58 },
      { v: 3.00, p: 2, r: 0.78 }, { v: 2.50, p: 0, r: 1.00 }
    ]
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH STATUS THRESHOLDS
// ═══════════════════════════════════════════════════════════════════════════════

const HEALTH_THRESHOLDS = {
  excellent: { min: 80, label: 'Excellent', code: 'EXCELLENT' },
  good:      { min: 60, label: 'Good',      code: 'GOOD' },
  fair:      { min: 40, label: 'Fair',      code: 'FAIR' },
  poor:      { min: 20, label: 'Poor',      code: 'POOR' },
  replace:   { min: 0,  label: 'Replace',   code: 'REPLACE' }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MANUFACTURING DATE ESTIMATION CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const MFG_ESTIMATION = {
  // Voltage drop per day for fresh battery at 20C (approximate)
  // Used to estimate age from voltage pattern
  VOLTAGE_DECAY_RATES: {
    'Li-MnO2': 0.00008, // Very slow self-discharge
    'Li-ion': 0.00006,
    'Li-po': 0.00006,
    'Zn-MnO2': 0.0002,  // Moderate self-discharge
    'NiMH': 0.0005       // Fast self-discharge
  },
  // Manufacturing date code patterns (year + week encoded in voltage)
  // Some batteries have date codes on packaging, not from voltage
  // This is a heuristic based on voltage at "fresh" state
  FRESH_VOLTAGE_WINDOW: 0.15, // Voltage must be within this of freshVoltage to be considered "new"
  STORAGE_SELF_DISCHARGE: {
    'Li-MnO2': 0.01, // 1% per month in storage
    'Li-ion': 0.02,
    'Li-po': 0.02,
    'Zn-MnO2': 0.03,
    'NiMH': 0.10
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// BatteryHealthIntelligence CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class BatteryHealthIntelligence {

  /**
   * @param {object} device - Homey device instance
   * @param {object} options - Configuration options
   * @param {string} options.batteryType - Chemistry key (CR2032, Li-ion, etc.)
   * @param {number} options.temperature - Ambient temperature in C (default 20)
   */
  constructor(device, options = {}) {
    this.device = device;
    this.batteryType = options.batteryType || 'CR2032';
    this.temperature = options.temperature || 20;

    // Get chemistry profile
    this.profile = CHEMISTRY_PROFILES[this.batteryType] || CHEMISTRY_PROFILES.CR2032;

    // ─── State ────────────────────────────────────────────────────────────
    this.healthScore = 100;
    this.healthStatus = 'Excellent';
    this.healthStatusCode = 'EXCELLENT';

    // ─── Lifecycle tracking ───────────────────────────────────────────────
    this.lifecycle = {
      cycleCount: 0,
      firstSeen: null,          // Timestamp when first detected
      lastUpdate: null,         // Timestamp of last reading
      totalReadings: 0,
      voltageHistory: [],       // Array of { time, voltage, percent } (max 500)
      percentHistory: [],       // Array of { time, percent } (max 200)
      peakVoltage: 0,           // Highest voltage seen
      minVoltage: Infinity,     // Lowest voltage seen
      avgVoltage: 0,            // Running average
      voltageSum: 0,            // Sum for average calculation
      estimatedManufactureDate: null, // Estimated date battery was manufactured
      batteryAgeDays: null,     // Estimated age in days
      daysSinceInstall: null,   // Days since first seen by this device
      predictedReplacementDate: null, // When to replace
      estimatedRemainingDays: null,
      internalResistanceEstimate: null, // Estimated internal resistance
      selfDischargeEstimate: null, // Estimated self-discharge rate
      degradationPercent: 0,    // Capacity degradation 0-100%
      loadEvents: 0,            // Number of significant load events
      replacementDetected: false,
      lastReplacementTime: null
    };

    // ─── Calibration ──────────────────────────────────────────────────────
    this.calibration = {
      offset: 0,                // Voltage offset for calibration
      enabled: false,
      lastCalibrated: null,
      referenceVoltage: null,
      referencePercentage: null
    };

    // ─── Timers ───────────────────────────────────────────────────────────
    this._analysisInterval = null;
    this._initialized = false;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Initialize battery health intelligence.
   * Loads stored lifecycle data and starts periodic analysis.
   */
  async initialize() {
    if (this._initialized) return;
    this._initialized = true;

    this.device.log(`[BATTERY-HEALTH] Initializing BatteryHealthIntelligence v1.0.0 (type: ${this.batteryType})`);

    // Restore stored lifecycle data
    await this._restoreLifecycleData();

    // Set first-seen if not present
    if (!this.lifecycle.firstSeen) {
      this.lifecycle.firstSeen = Date.now();
    }

    // Start periodic analysis (every 6 hours)
    this._analysisInterval = this.device.homey?.setInterval(() => {
      if (this._destroyed) return;
      this._runPeriodicAnalysis();
    }, 6 * 60 * 60 * 1000);

    this.device.log('[BATTERY-HEALTH] Initialized successfully');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // DISCHARGE CURVE ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Non-linear voltage-to-percentage mapping using chemistry-specific discharge curve.
   * Uses piecewise linear interpolation between curve points.
   * Temperature compensation applied before interpolation.
   *
   * @param {number} voltage - Measured voltage
   * @param {number} temperature - Ambient temperature in C (optional, uses stored temp)
   * @returns {number} Percentage 0-100
   */
  voltageToPercentage(voltage, temperature) {
    if (voltage === null || voltage === undefined || isNaN(voltage)) return null;

    const temp = (temperature !== undefined && temperature !== null) ? temperature : this.temperature;

    // Apply calibration offset
    const calibratedVoltage = voltage + this.calibration.offset;

    // Temperature compensation
    let compensatedVoltage = calibratedVoltage;
    if (temp < 20 && this.profile.tempCoeff) {
      const tempDiff = 20 - temp;
      compensatedVoltage = calibratedVoltage - (this.profile.tempCoeff * tempDiff);
    }

    // Clamp to profile bounds
    if (compensatedVoltage >= this.profile.freshVoltage) return 100;
    if (compensatedVoltage <= this.profile.deadVoltage) return 0;

    // Piecewise linear interpolation on the discharge curve
    const curve = this.profile.curve;
    for (let i = 0; i < curve.length - 1; i++) {
      const high = curve[i];
      const low = curve[i + 1];
      if (compensatedVoltage >= low.v && compensatedVoltage <= high.v) {
        const vRange = high.v - low.v;
        const pRange = high.p - low.p;
        if (vRange === 0) return high.p;
        const vOffset = compensatedVoltage - low.v;
        const percentage = low.p + (vOffset / vRange) * pRange;
        return Math.round(Math.max(0, Math.min(100, percentage)));
      }
    }

    return compensatedVoltage > curve[0].v ? 100 : 0;
  }

  /**
   * Reverse lookup: given a percentage, return the expected voltage for this chemistry.
   * Useful for predicting voltage at a given state of charge.
   *
   * @param {number} percentage - Battery percentage 0-100
   * @returns {number} Expected voltage
   */
  percentageToVoltage(percentage) {
    if (percentage === null || percentage === undefined || isNaN(percentage)) return null;
    const p = Math.max(0, Math.min(100, percentage));

    const curve = this.profile.curve;
    for (let i = 0; i < curve.length - 1; i++) {
      const high = curve[i];
      const low = curve[i + 1];
      if (p >= low.p && p <= high.p) {
        const pRange = high.p - low.p;
        const vRange = high.v - low.v;
        if (pRange === 0) return high.v;
        const pOffset = p - low.p;
        return low.v + (pOffset / pRange) * vRange;
      }
    }
    return p >= curve[0].p ? curve[0].v : curve[curve.length - 1].v;
  }

  /**
   * Get the internal resistance estimate at a given voltage level.
   * Interpolates from the discharge curve 'r' values.
   *
   * @param {number} voltage - Current voltage
   * @returns {number} Estimated internal resistance as fraction 0-1 (0=new, 1=end-of-life)
   */
  getInternalResistanceFraction(voltage) {
    if (voltage === null || voltage === undefined) return null;

    const curve = this.profile.curve;
    for (let i = 0; i < curve.length - 1; i++) {
      const high = curve[i];
      const low = curve[i + 1];
      if (voltage >= low.v && voltage <= high.v) {
        const vRange = high.v - low.v;
        const rRange = low.r - high.r; // Resistance increases as voltage drops
        if (vRange === 0) return high.r;
        const vOffset = voltage - low.v;
        return high.r + (vOffset / vRange) * rRange;
      }
    }
    return voltage > curve[0].v ? curve[0].r : curve[curve.length - 1].r;
  }

  /**
   * Estimate actual internal resistance in ohms from voltage drop under load.
   * Requires a no-load and under-load voltage reading.
   *
   * @param {number} openCircuitVoltage - Voltage when no load
   * @param {number} loadedVoltage - Voltage under typical load
   * @param {number} loadCurrentmA - Estimated load current in mA (optional)
   * @returns {number} Estimated resistance in ohms, or null
   */
  estimateInternalResistance(openCircuitVoltage, loadedVoltage, loadCurrentmA) {
    if (openCircuitVoltage === null || loadedVoltage === null) return null;
    if (loadedVoltage >= openCircuitVoltage) return null;

    const voltageDrop = openCircuitVoltage - loadedVoltage;

    // If load current is known, use Ohm's law: R = V / I
    if (loadCurrentmA && loadCurrentmA > 0) {
      return (voltageDrop / (loadCurrentmA / 1000)); // Convert mA to A
    }

    // Estimate resistance as a fraction of voltage drop relative to the full range
    const fullRange = this.profile.freshVoltage - this.profile.deadVoltage;
    if (fullRange <= 0) return null;

    const resistanceFraction = voltageDrop / fullRange;
    const estimatedOhms = this.profile.internalResistanceNew +
      (resistanceFraction * (this.profile.internalResistanceEnd - this.profile.internalResistanceNew));

    return Math.round(estimatedOhms * 100) / 100;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CYCLE COUNTING
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Detect charge cycles for rechargeable batteries.
   * A cycle is counted when voltage drops below 30% then rises above 80%.
   * For primary cells, counts discharge events (significant voltage drops).
   *
   * @param {number} percentage - Current battery percentage
   */
  _trackCycles(percentage) {
    if (this.profile.maxCycles === 0) {
      // Primary cell: count significant discharge events (>15% drop)
      this._trackDischargeEvents(percentage);
      return;
    }

    // Rechargeable: detect charge/discharge cycles
    if (!this._cycleState) {
      this._cycleState = { wasLow: false, wasHigh: true };
    }

    if (percentage <= 30 && this._cycleState.wasHigh) {
      this._cycleState.wasLow = true;
      this._cycleState.wasHigh = false;
    }

    if (percentage >= 80 && this._cycleState.wasLow) {
      this._cycleState.wasHigh = true;
      this._cycleState.wasLow = false;
      this.lifecycle.cycleCount++;
      this.device.log(`[BATTERY-HEALTH] Cycle counted: ${this.lifecycle.cycleCount}`);
    }
  }

  /**
   * Track discharge events for primary (non-rechargeable) cells.
   * Counts when percentage drops by more than 15% from a local maximum.
   */
  _trackDischargeEvents(percentage) {
    if (!this._dischargeState) {
      this._dischargeState = { localMax: percentage, dropAccumulated: 0 };
    }

    if (percentage > this._dischargeState.localMax) {
      this._dischargeState.localMax = percentage;
      this._dischargeState.dropAccumulated = 0;
    } else {
      const drop = this._dischargeState.localMax - percentage;
      this._dischargeState.dropAccumulated += Math.max(0, drop - this._dischargeState.dropAccumulated);
    }

    // Count a discharge event when accumulated drop exceeds 15%
    if (this._dischargeState.dropAccumulated >= 15) {
      this.lifecycle.cycleCount++;
      this._dischargeState.localMax = percentage;
      this._dischargeState.dropAccumulated = 0;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // MANUFACTURING DATE ESTIMATION
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Estimate the manufacturing date of the battery based on voltage patterns
   * and self-discharge characteristics.
   *
   * Algorithm:
   * 1. If voltage is very close to freshVoltage, battery is likely new (< 1 month)
   * 2. Calculate expected voltage drop from self-discharge over time
   * 3. Find the age that matches the observed voltage drop
   * 4. Use calendar aging model to refine the estimate
   *
   * @param {number} voltage - Current voltage reading
   * @param {number} percentage - Current percentage (from discharge curve)
   * @returns {Date|null} Estimated manufacture date
   */
  estimateManufactureDate(voltage, percentage) {
    if (voltage === null || voltage === undefined) return null;

    // Use the non-linear curve for accurate percentage
    const pct = (percentage !== null && percentage !== undefined) ? percentage : this.voltageToPercentage(voltage);

    // Fresh battery detection: voltage is very close to freshVoltage
    const voltageDelta = this.profile.freshVoltage - voltage;
    if (voltageDelta <= MFG_ESTIMATION.FRESH_VOLTAGE_WINDOW) {
      // Very fresh battery - estimate as manufactured within last 30 days
      const estimatedAgeDays = Math.round((voltageDelta / MFG_ESTIMATION.FRESH_VOLTAGE_WINDOW) * 30);
      const estimatedDate = new Date(Date.now() - (estimatedAgeDays * 24 * 60 * 60 * 1000));
      this.lifecycle.estimatedManufactureDate = estimatedDate;
      this.lifecycle.batteryAgeDays = estimatedAgeDays;
      return estimatedDate;
    }

    // For degraded batteries, use self-discharge model
    const chemistryKey = this.profile.chemistry;
    const monthlySelfDischarge = MFG_ESTIMATION.STORAGE_SELF_DISCHARGE[chemistryKey] || 0.01;

    // Expected percentage loss from self-discharge over time
    // At full charge (fresh), voltage should be at freshVoltage
    // The difference between freshVoltage and current voltage indicates age
    const voltageRange = this.profile.freshVoltage - this.profile.deadVoltage;
    if (voltageRange <= 0) return null;

    // How far along the discharge curve are we due to self-discharge alone?
    const selfDischargeFraction = voltageDelta / voltageRange;

    // Convert to estimated days using self-discharge rate
    // self-discharge is monthly, convert to daily
    const dailySelfDischarge = monthlySelfDischarge / 30;
    if (dailySelfDischarge <= 0) return null;

    // Estimate age based on voltage drop from self-discharge
    // This is approximate - actual self-discharge varies with temperature and load
    let estimatedAgeDays = Math.round(selfDischargeFraction / dailySelfDischarge);

    // Adjust for temperature (higher temp = faster self-discharge)
    const tempFactor = this._getTemperatureAgingFactor();
    estimatedAgeDays = Math.round(estimatedAgeDays / tempFactor);

    // Clamp to reasonable range
    estimatedAgeDays = Math.max(1, Math.min(estimatedAgeDays, this.profile.expectedLifeDays * 2));

    const estimatedDate = new Date(Date.now() - (estimatedAgeDays * 24 * 60 * 60 * 1000));
    this.lifecycle.estimatedManufactureDate = estimatedDate;
    this.lifecycle.batteryAgeDays = estimatedAgeDays;

    return estimatedDate;
  }

  /**
   * Get temperature-based aging factor.
   * Higher temperatures accelerate aging.
   *
   * @returns {number} Multiplier (> 1 means faster aging)
   */
  _getTemperatureAgingFactor() {
    const temp = this.temperature;
    if (temp >= 25) {
      // Every 10C above 25 roughly doubles aging rate (Arrhenius-like)
      return Math.pow(2, (temp - 25) / 10);
    }
    if (temp < 0) {
      // Very cold: reduced aging but also reduced capacity
      return 0.7;
    }
    // 0-25C: linear interpolation between 0.7 and 1.0
    return 0.7 + (temp / 25) * 0.3;
  }

  /**
   * Predict the replacement date based on current health, drain rate,
   * and calendar aging.
   *
   * @param {number} currentPercentage - Current battery percentage
   * @param {number} drainRatePerDay - Percentage drain per day (optional)
   * @returns {Date|null} Predicted replacement date
   */
  predictReplacementDate(currentPercentage, drainRatePerDay) {
    if (currentPercentage === null || currentPercentage === undefined) return null;

    let remainingDays = null;

    // Method 1: If we have a drain rate, use it directly
    if (drainRatePerDay && drainRatePerDay > 0) {
      remainingDays = Math.round(currentPercentage / drainRatePerDay);
    }

    // Method 2: Estimate from battery type expected life and age
    if (this.lifecycle.batteryAgeDays !== null) {
      const remainingLifeDays = this.profile.expectedLifeDays - this.lifecycle.batteryAgeDays;
      if (remainingDays === null || remainingLifeDays < remainingDays) {
        remainingDays = Math.max(0, remainingLifeDays);
      }
    }

    // Method 3: Use health score to estimate remaining capacity
    if (remainingDays === null) {
      // Assume typical drain rate for the device type
      const estimatedDrainPerDay = this._estimateTypicalDrainRate();
      if (estimatedDrainPerDay > 0) {
        remainingDays = Math.round((currentPercentage * (100 - this.lifecycle.degradationPercent) / 100) / estimatedDrainPerDay);
      }
    }

    // Method 4: Minimum fallback based on percentage and health
    if (remainingDays === null) {
      // Assume 1-3% per day drain for battery devices
      remainingDays = Math.round(currentPercentage / 2);
    }

    // Clamp to reasonable range
    remainingDays = Math.max(0, Math.min(remainingDays, this.profile.expectedLifeDays));

    const replacementDate = new Date(Date.now() + (remainingDays * 24 * 60 * 60 * 1000));
    this.lifecycle.predictedReplacementDate = replacementDate;
    this.lifecycle.estimatedRemainingDays = remainingDays;

    return replacementDate;
  }

  /**
   * Estimate typical drain rate for this battery type in a Zigbee device.
   * Based on typical current draw patterns.
   *
   * @returns {number} Estimated percentage drain per day
   */
  _estimateTypicalDrainRate() {
    const drainRates = {
      'CR2032': 0.15,  // ~0.15% per day typical for button/sensor
      'CR2450': 0.10,
      'CR123A': 0.08,
      'AAA': 0.30,     // Higher drain devices
      'AA': 0.20,
      'Li-ion': 0.15,
      'Li-polymer': 0.15,
      'NiMH': 0.25,
      '2xAAA': 0.25,
      '18650': 0.10
    };
    return drainRates[this.batteryType] || 0.15;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // HEALTH SCORING
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Calculate comprehensive battery health score (0-100).
   * Factors:
   * - Voltage relative to fresh/dead range (30%)
   * - Calendar aging (20%)
   * - Cycle degradation (20%)
   * - Internal resistance trend (15%)
   * - Voltage stability (15%)
   *
   * @param {number} voltage - Current voltage
   * @param {number} percentage - Current percentage
   * @returns {number} Health score 0-100
   */
  calculateHealthScore(voltage, percentage) {
    if (voltage === null || voltage === undefined) return this.healthScore;

    const pct = (percentage !== null && percentage !== undefined) ? percentage : this.voltageToPercentage(voltage);

    let score = 0;

    // ─── Factor 1: Voltage relative to fresh/dead range (30%) ─────────────
    const voltageRange = this.profile.freshVoltage - this.profile.deadVoltage;
    const voltagePosition = (voltage - this.profile.deadVoltage) / voltageRange;
    const voltageScore = Math.max(0, Math.min(100, voltagePosition * 100));
    score += voltageScore * 0.30;

    // ─── Factor 2: Calendar aging (20%) ───────────────────────────────────
    if (this.lifecycle.batteryAgeDays !== null) {
      const ageRatio = Math.min(1, this.lifecycle.batteryAgeDays / this.profile.expectedLifeDays);
      const ageScore = Math.max(0, 100 - (ageRatio * 100));
      score += ageScore * 0.20;
    } else {
      score += 50 * 0.20; // Neutral if unknown
    }

    // ─── Factor 3: Cycle degradation (20%) ────────────────────────────────
    if (this.profile.maxCycles > 0 && this.lifecycle.cycleCount > 0) {
      const cycleRatio = Math.min(1, this.lifecycle.cycleCount / this.profile.maxCycles);
      const cycleScore = Math.max(0, 100 - (cycleRatio * 100));
      score += cycleScore * 0.20;
    } else {
      // For primary cells, use degradation estimate
      score += Math.max(0, 100 - this.lifecycle.degradationPercent) * 0.20;
    }

    // ─── Factor 4: Internal resistance trend (15%) ────────────────────────
    if (this.lifecycle.internalResistanceEstimate !== null) {
      const irRange = this.profile.internalResistanceEnd - this.profile.internalResistanceNew;
      if (irRange > 0) {
        const irFraction = (this.lifecycle.internalResistanceEstimate - this.profile.internalResistanceNew) / irRange;
        const irScore = Math.max(0, 100 - (Math.min(1, irFraction) * 100));
        score += irScore * 0.15;
      } else {
        score += 50 * 0.15;
      }
    } else {
      score += 50 * 0.15;
    }

    // ─── Factor 5: Voltage stability (15%) ────────────────────────────────
    const stabilityScore = this._calculateVoltageStability();
    score += stabilityScore * 0.15;

    // Round and clamp
    this.healthScore = Math.round(Math.max(0, Math.min(100, score)));

    // Update status
    this._updateHealthStatus();

    return this.healthScore;
  }

  /**
   * Calculate voltage stability score based on recent readings.
   * Stable voltage = high score. Erratic = low score.
   *
   * @returns {number} Stability score 0-100
   */
  _calculateVoltageStability() {
    const history = this.lifecycle.voltageHistory;
    if (history.length < 3) return 75; // Neutral for insufficient data

    // Get last 10 readings
    const recent = history.slice(-10);
    if (recent.length < 3) return 75;

    // Calculate standard deviation of percentage changes
    const changes = [];
    for (let i = 1; i < recent.length; i++) {
      changes.push(Math.abs((recent[i].percent || 0) - (recent[i - 1].percent || 0)));
    }

    if (changes.length === 0) return 75;

    const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
    const variance = changes.reduce((sum, c) => sum + Math.pow(c - avgChange, 2), 0) / changes.length;
    const stdDev = Math.sqrt(variance);

    // Low stdDev = high stability. 0 stdDev = 100 score, 10+ stdDev = 0 score
    const stabilityScore = Math.max(0, 100 - (stdDev * 10));
    return stabilityScore;
  }

  /**
   * Update health status label from score.
   */
  _updateHealthStatus() {
    for (const [, threshold] of Object.entries(HEALTH_THRESHOLDS)) {
      if (this.healthScore >= threshold.min) {
        this.healthStatus = threshold.label;
        this.healthStatusCode = threshold.code;
        return;
      }
    }
    this.healthStatus = 'Replace';
    this.healthStatusCode = 'REPLACE';
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SELF-DISCHARGE ESTIMATION
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Estimate self-discharge rate from observed voltage changes over time.
   * Compares voltage changes to expected load-driven changes.
   *
   * @returns {number} Estimated self-discharge percentage per month
   */
  estimateSelfDischargeRate() {
    const history = this.lifecycle.voltageHistory;
    if (history.length < 5) return this.profile.selfDischargeRate * 100;

    // Find periods with minimal activity (no large voltage drops from load)
    // These periods reveal self-discharge
    const quietPeriods = [];
    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1];
      const curr = history[i];
      const timeDiffHours = (curr.time - prev.time) / (1000 * 60 * 60);
      const voltageDiff = prev.voltage - curr.voltage;

      // Quiet period: small voltage change over several hours
      if (timeDiffHours >= 4 && timeDiffHours <= 48 && voltageDiff >= 0 && voltageDiff < 0.05) {
        const selfDischargePerHour = voltageDiff / timeDiffHours;
        const selfDischargePerMonth = selfDischargePerHour * 24 * 30;
        quietPeriods.push(selfDischargePerMonth);
      }
    }

    if (quietPeriods.length > 0) {
      const avgRate = quietPeriods.reduce((a, b) => a + b, 0) / quietPeriods.length;
      // Convert voltage drop per month to percentage per month
      const voltageRange = this.profile.freshVoltage - this.profile.deadVoltage;
      const percentPerMonth = (avgRate / voltageRange) * 100;
      this.lifecycle.selfDischargeEstimate = Math.round(percentPerMonth * 100) / 100;
      return this.lifecycle.selfDischargeEstimate;
    }

    // Fallback to chemistry default
    return this.profile.selfDischargeRate * 100;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // DEGRADATION TRACKING
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Calculate battery degradation based on multiple factors.
   * Uses calendar aging model + cycle wear + observed performance.
   *
   * @returns {number} Degradation percentage 0-100 (0=new, 100=dead)
   */
  calculateDegradation() {
    let degradation = 0;

    // ─── Calendar aging ───────────────────────────────────────────────────
    if (this.lifecycle.batteryAgeDays !== null) {
      const calendarAging = this.lifecycle.batteryAgeDays * this.profile.calendarAgingFactor * 100;
      degradation += calendarAging * 0.5; // 50% weight
    }

    // ─── Cycle wear ───────────────────────────────────────────────────────
    if (this.profile.maxCycles > 0 && this.lifecycle.cycleCount > 0) {
      const cycleWear = (this.lifecycle.cycleCount / this.profile.maxCycles) * 100;
      degradation += cycleWear * 0.35; // 35% weight
    }

    // ─── Temperature stress ───────────────────────────────────────────────
    const tempStress = Math.abs(this.temperature - 20) * 0.05; // 0.5% per degree from 20C
    degradation += tempStress * 0.15; // 15% weight

    // Clamp
    degradation = Math.max(0, Math.min(100, degradation));
    this.lifecycle.degradationPercent = Math.round(degradation);

    return this.lifecycle.degradationPercent;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // MAIN UPDATE METHOD
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Process a new battery voltage reading and update all intelligence.
   * This is the primary entry point called by UnifiedBatteryHandler.
   *
   * @param {number} voltage - Measured voltage
   * @param {number} percentage - Pre-calculated percentage (optional, will calculate from curve)
   * @param {object} context - Additional context
   * @param {number} context.temperature - Current temperature
   * @param {number} context.loadCurrentmA - Current draw if known
   * @returns {object} Complete battery health report
   */
  update(voltage, percentage, context = {}) {
    if (voltage === null || voltage === undefined || isNaN(voltage)) return this.getReport();

    const now = Date.now();

    // Update temperature if provided
    if (context.temperature !== undefined && context.temperature !== null) {
      this.temperature = context.temperature;
    }

    // Calculate percentage from discharge curve if not provided
    const pct = (percentage !== null && percentage !== undefined)
      ? percentage
      : this.voltageToPercentage(voltage, this.temperature);

    if (pct === null) return this.getReport();

    // ─── Record in history ────────────────────────────────────────────────
    this.lifecycle.voltageHistory.push({ time: now, voltage, percent: pct });
    if (this.lifecycle.voltageHistory.length > 500) {
      this.lifecycle.voltageHistory.shift();
    }

    this.lifecycle.percentHistory.push({ time: now, percent: pct });
    if (this.lifecycle.percentHistory.length > 200) {
      this.lifecycle.percentHistory.shift();
    }

    // ─── Update stats ─────────────────────────────────────────────────────
    this.lifecycle.totalReadings++;
    this.lifecycle.lastUpdate = now;
    this.lifecycle.peakVoltage = Math.max(this.lifecycle.peakVoltage, voltage);
    this.lifecycle.minVoltage = Math.min(this.lifecycle.minVoltage, voltage);
    this.lifecycle.voltageSum += voltage;
    this.lifecycle.avgVoltage = this.lifecycle.voltageSum / this.lifecycle.totalReadings;

    // ─── Track cycles ─────────────────────────────────────────────────────
    this._trackCycles(pct);

    // ─── Internal resistance estimation ───────────────────────────────────
    if (context.loadCurrentmA && context.openCircuitVoltage) {
      const ir = this.estimateInternalResistance(context.openCircuitVoltage, voltage, context.loadCurrentmA);
      if (ir !== null) {
        this.lifecycle.internalResistanceEstimate = ir;
      }
    } else {
      // Estimate from discharge curve position
      const irFraction = this.getInternalResistanceFraction(voltage);
      if (irFraction !== null) {
        const irRange = this.profile.internalResistanceEnd - this.profile.internalResistanceNew;
        this.lifecycle.internalResistanceEstimate = this.profile.internalResistanceNew + (irFraction * irRange);
      }
    }

    // ─── Manufacturing date estimation ────────────────────────────────────
    if (!this.lifecycle.estimatedManufactureDate || this.lifecycle.totalReadings <= 3) {
      this.estimateManufactureDate(voltage, pct);
    }

    // ─── Days since install ───────────────────────────────────────────────
    if (this.lifecycle.firstSeen) {
      this.lifecycle.daysSinceInstall = Math.round((now - this.lifecycle.firstSeen) / (24 * 60 * 60 * 1000));
    }

    // ─── Degradation ──────────────────────────────────────────────────────
    this.calculateDegradation();

    // ─── Health score ─────────────────────────────────────────────────────
    this.calculateHealthScore(voltage, pct);

    // ─── Self-discharge estimation ────────────────────────────────────────
    this.estimateSelfDischargeRate();

    // ─── Replacement prediction ───────────────────────────────────────────
    const drainRate = this.lifecycle.percentHistory.length >= 2
      ? this._calculateDrainRate()
      : null;
    this.predictReplacementDate(pct, drainRate);

    // ─── Replacement detection ────────────────────────────────────────────
    this._detectReplacement(pct);

    return this.getReport();
  }

  /**
   * Calculate drain rate from percent history.
   *
   * @returns {number} Percentage points per day, or null
   */
  _calculateDrainRate() {
    const history = this.lifecycle.percentHistory;
    if (history.length < 2) return null;

    const oldest = history[0];
    const newest = history[history.length - 1];
    const daysDiff = (newest.time - oldest.time) / (24 * 60 * 60 * 1000);
    const percentDiff = oldest.percent - newest.percent;

    if (daysDiff > 0 && percentDiff > 0) {
      return percentDiff / daysDiff;
    }
    return null;
  }

  /**
   * Detect battery replacement by looking for sudden large voltage increases.
   */
  _detectReplacement(currentPercentage) {
    const history = this.lifecycle.percentHistory;
    if (history.length < 2) return;

    const previous = history[history.length - 2];
    const jump = currentPercentage - previous.percent;

    // A jump of > 40% indicates battery replacement
    if (jump > 40) {
      this.lifecycle.replacementDetected = true;
      this.lifecycle.lastReplacementTime = Date.now();
      this.lifecycle.cycleCount = 0;
      this.lifecycle.degradationPercent = 0;
      this.lifecycle.estimatedManufactureDate = null;
      this.lifecycle.batteryAgeDays = null;
      this.lifecycle.firstSeen = Date.now();

      this.device.log(`[BATTERY-HEALTH] Battery replacement detected: ${previous.percent}% -> ${currentPercentage}% (jump: ${jump}%)`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PERIODIC ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Run periodic analysis and persist data.
   */
  async _runPeriodicAnalysis() {
    try {
      const lastReading = this.lifecycle.voltageHistory.length > 0
        ? this.lifecycle.voltageHistory[this.lifecycle.voltageHistory.length - 1]
        : null;

      if (lastReading) {
        // Recalculate health with latest data
        this.calculateHealthScore(lastReading.voltage, lastReading.percent);
        this.calculateDegradation();
        this.estimateSelfDischargeRate();

        // Recalculate replacement prediction
        const drainRate = this._calculateDrainRate();
        this.predictReplacementDate(lastReading.percent, drainRate);
      }

      // Persist lifecycle data
      await this._persistLifecycleData();

      this.device.log(`[BATTERY-HEALTH] Periodic analysis: score=${this.healthScore} status=${this.healthStatus} cycles=${this.lifecycle.cycleCount} degradation=${this.lifecycle.degradationPercent}%`);
    } catch (err) {
      this.device.error('[BATTERY-HEALTH] Periodic analysis error:', err.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CALIBRATION
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Calibrate the battery reading.
   * Sets an offset so that the next reading matches the reference.
   *
   * @param {number} referenceVoltage - Known accurate voltage
   * @param {number} referencePercentage - Known accurate percentage
   */
  calibrate(referenceVoltage, referencePercentage) {
    if (referenceVoltage === null || referencePercentage === null) return;

    // Calculate what percentage the device is currently reporting at this voltage
    const currentPercentage = this.voltageToPercentage(referenceVoltage);

    // The offset adjusts voltage so the curve gives the reference percentage
    // Find what voltage on the curve gives the reference percentage
    const targetVoltage = this.percentageToVoltage(referencePercentage);
    if (targetVoltage !== null) {
      this.calibration.offset = targetVoltage - referenceVoltage;
      this.calibration.enabled = true;
      this.calibration.lastCalibrated = Date.now();
      this.calibration.referenceVoltage = referenceVoltage;
      this.calibration.referencePercentage = referencePercentage;

      this.device.log(`[BATTERY-HEALTH] Calibrated: offset=${this.calibration.offset.toFixed(3)}V`);
    }
  }

  /**
   * Reset calibration to defaults.
   */
  resetCalibration() {
    this.calibration.offset = 0;
    this.calibration.enabled = false;
    this.calibration.lastCalibrated = null;
    this.calibration.referenceVoltage = null;
    this.calibration.referencePercentage = null;
    this.device.log('[BATTERY-HEALTH] Calibration reset');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // REPORTING
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get comprehensive battery health report.
   *
   * @returns {object} Complete health report
   */
  getReport() {
    return {
      // Health
      healthScore: this.healthScore,
      healthStatus: this.healthStatus,
      healthStatusCode: this.healthStatusCode,

      // Current reading
      batteryType: this.batteryType,
      chemistry: this.profile.chemistry,
      nominalVoltage: this.profile.nominalVoltage,
      capacity_mAh: this.profile.capacity_mAh,

      // Lifecycle
      cycleCount: this.lifecycle.cycleCount,
      degradationPercent: this.lifecycle.degradationPercent,
      internalResistanceEstimate: this.lifecycle.internalResistanceEstimate,
      selfDischargeEstimate: this.lifecycle.selfDischargeEstimate,

      // Time
      firstSeen: this.lifecycle.firstSeen,
      lastUpdate: this.lifecycle.lastUpdate,
      daysSinceInstall: this.lifecycle.daysSinceInstall,
      estimatedManufactureDate: this.lifecycle.estimatedManufactureDate,
      batteryAgeDays: this.lifecycle.batteryAgeDays,

      // Prediction
      predictedReplacementDate: this.lifecycle.predictedReplacementDate,
      estimatedRemainingDays: this.lifecycle.estimatedRemainingDays,

      // Voltage stats
      peakVoltage: this.lifecycle.peakVoltage === Infinity ? null : this.lifecycle.peakVoltage,
      minVoltage: this.lifecycle.minVoltage === Infinity ? null : this.lifecycle.minVoltage,
      avgVoltage: this.lifecycle.totalReadings > 0
        ? Math.round(this.lifecycle.avgVoltage * 1000) / 1000
        : null,
      totalReadings: this.lifecycle.totalReadings,

      // Replacement
      replacementDetected: this.lifecycle.replacementDetected,
      lastReplacementTime: this.lifecycle.lastReplacementTime,

      // Calibration
      calibrationEnabled: this.calibration.enabled,
      calibrationOffset: this.calibration.offset,
      lastCalibrated: this.calibration.lastCalibrated
    };
  }

  /**
   * Get status text for flow card tokens.
   *
   * @returns {string} Status text: "Good", "Fair", "Poor", "Replace", or "Excellent"
   */
  getStatusText() {
    return this.healthStatus;
  }

  /**
   * Get a summary suitable for logging or debug.
   *
   * @returns {string} Human-readable summary
   */
  getSummary() {
    const report = this.getReport();
    const ageStr = report.batteryAgeDays !== null ? `${report.batteryAgeDays}d` : 'unknown';
    const remainStr = report.estimatedRemainingDays !== null ? `${report.estimatedRemainingDays}d` : 'unknown';
    const mfgStr = report.estimatedManufactureDate
      ? report.estimatedManufactureDate.toISOString().split('T')[0]
      : 'unknown';

    return [
      `Health: ${report.healthScore}/100 (${report.healthStatus})`,
      `Type: ${report.batteryType} (${report.chemistry})`,
      `Cycles: ${report.cycleCount}`,
      `Degradation: ${report.degradationPercent}%`,
      `Age: ${ageStr} (mfg: ${mfgStr})`,
      `Remaining: ${remainStr}`,
      `IR: ${report.internalResistanceEstimate !== null ? report.internalResistanceEstimate + 'ohm' : 'N/A'}`,
      `Self-discharge: ${report.selfDischargeEstimate !== null ? report.selfDischargeEstimate + '%/mo' : 'N/A'}`,
      `Readings: ${report.totalReadings}`
    ].join(' | ');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PERSISTENCE
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Persist lifecycle data to device store.
   */
  async _persistLifecycleData() {
    try {
      const storeData = {
        healthScore: this.healthScore,
        healthStatus: this.healthStatusCode,
        cycleCount: this.lifecycle.cycleCount,
        degradationPercent: this.lifecycle.degradationPercent,
        firstSeen: this.lifecycle.firstSeen,
        lastUpdate: this.lifecycle.lastUpdate,
        totalReadings: this.lifecycle.totalReadings,
        estimatedManufactureDate: this.lifecycle.estimatedManufactureDate ? this.lifecycle.estimatedManufactureDate.getTime() : null,
        batteryAgeDays: this.lifecycle.batteryAgeDays,
        internalResistanceEstimate: this.lifecycle.internalResistanceEstimate,
        selfDischargeEstimate: this.lifecycle.selfDischargeEstimate,
        replacementDetected: this.lifecycle.replacementDetected,
        lastReplacementTime: this.lifecycle.lastReplacementTime,
        calibration: { ...this.calibration },
        // Store last 20 voltage readings for trend analysis
        recentVoltageHistory: this.lifecycle.voltageHistory.slice(-20),
        recentPercentHistory: this.lifecycle.percentHistory.slice(-20)
      };

      await this.device.setStoreValue('battery_health_intelligence', storeData);
    } catch (err) {
      this.device.error('[BATTERY-HEALTH] Failed to persist data:', err.message);
    }
  }

  /**
   * Restore lifecycle data from device store.
   */
  async _restoreLifecycleData() {
    try {
      const stored = await this.device.getStoreValue('battery_health_intelligence');
      if (!stored) return;

      this.healthScore = stored.healthScore || 100;
      this.healthStatus = stored.healthStatus || 'Good';
      this.healthStatusCode = stored.healthStatusCode || 'GOOD';

      this.lifecycle.cycleCount = stored.cycleCount || 0;
      this.lifecycle.degradationPercent = stored.degradationPercent || 0;
      this.lifecycle.firstSeen = stored.firstSeen || null;
      this.lifecycle.lastUpdate = stored.lastUpdate || null;
      this.lifecycle.totalReadings = stored.totalReadings || 0;
      this.lifecycle.internalResistanceEstimate = stored.internalResistanceEstimate || null;
      this.lifecycle.selfDischargeEstimate = stored.selfDischargeEstimate || null;
      this.lifecycle.replacementDetected = stored.replacementDetected || false;
      this.lifecycle.lastReplacementTime = stored.lastReplacementTime || null;

      if (stored.estimatedManufactureDate) {
        this.lifecycle.estimatedManufactureDate = new Date(stored.estimatedManufactureDate);
      }
      this.lifecycle.batteryAgeDays = stored.batteryAgeDays || null;

      if (stored.calibration) {
        this.calibration.offset = stored.calibration.offset || 0;
        this.calibration.enabled = stored.calibration.enabled || false;
        this.calibration.lastCalibrated = stored.calibration.lastCalibrated || null;
        this.calibration.referenceVoltage = stored.calibration.referenceVoltage || null;
        this.calibration.referencePercentage = stored.calibration.referencePercentage || null;
      }

      // Restore recent history
      if (stored.recentVoltageHistory) {
        this.lifecycle.voltageHistory = stored.recentVoltageHistory;
      }
      if (stored.recentPercentHistory) {
        this.lifecycle.percentHistory = stored.recentPercentHistory;
      }

      this._updateHealthStatus();

      this.device.log(`[BATTERY-HEALTH] Restored lifecycle data: score=${this.healthScore} cycles=${this.lifecycle.cycleCount} readings=${this.lifecycle.totalReadings}`);
    } catch (err) {
      this.device.error('[BATTERY-HEALTH] Failed to restore data:', err.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // UTILITY
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Set battery type dynamically.
   *
   * @param {string} type - Chemistry key
   */
  setBatteryType(type) {
    if (CHEMISTRY_PROFILES[type]) {
      this.batteryType = type;
      this.profile = CHEMISTRY_PROFILES[type];
      this.device.log(`[BATTERY-HEALTH] Battery type set to: ${type}`);
    }
  }

  /**
   * Set ambient temperature.
   *
   * @param {number} tempC - Temperature in Celsius
   */
  setTemperature(tempC) {
    if (typeof tempC === 'number' && !isNaN(tempC)) {
      this.temperature = tempC;
    }
  }

  /**
   * Reset all lifecycle data (e.g., after physical battery replacement).
   */
  resetLifecycle() {
    this.lifecycle = {
      cycleCount: 0,
      firstSeen: Date.now(),
      lastUpdate: null,
      totalReadings: 0,
      voltageHistory: [],
      percentHistory: [],
      peakVoltage: 0,
      minVoltage: Infinity,
      avgVoltage: 0,
      voltageSum: 0,
      estimatedManufactureDate: null,
      batteryAgeDays: null,
      daysSinceInstall: null,
      predictedReplacementDate: null,
      estimatedRemainingDays: null,
      internalResistanceEstimate: null,
      selfDischargeEstimate: null,
      degradationPercent: 0,
      loadEvents: 0,
      replacementDetected: false,
      lastReplacementTime: null
    };

    this.healthScore = 100;
    this.healthStatus = 'Excellent';
    this.healthStatusCode = 'EXCELLENT';
    this.resetCalibration();

    this._cycleState = null;
    this._dischargeState = null;

    this.device.log('[BATTERY-HEALTH] Lifecycle data reset');
  }

  /**
   * Get the list of supported battery types.
   *
   * @returns {string[]} Array of chemistry keys
   */
  static getSupportedTypes() {
    return Object.keys(CHEMISTRY_PROFILES);
  }

  /**
   * Get chemistry profile for a battery type.
   *
   * @param {string} type - Chemistry key
   * @returns {object|null} Profile object
   */
  static getProfile(type) {
    return CHEMISTRY_PROFILES[type] || null;
  }

  /**
   * Cleanup timers and resources.
   */
  destroy() {
    this._destroyed = true;
    if (this._analysisInterval) {
      this.device.homey?.clearInterval(this._analysisInterval);
      this._analysisInterval = null;
    }
    this._initialized = false;
    this.device.log('[BATTERY-HEALTH] Destroyed');
  }
}

module.exports = BatteryHealthIntelligence;
module.exports.CHEMISTRY_PROFILES = CHEMISTRY_PROFILES;
module.exports.HEALTH_THRESHOLDS = HEALTH_THRESHOLDS;
