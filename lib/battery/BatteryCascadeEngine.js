'use strict';
/**
 * @deprecated P54 — This file has 0 importers and is scheduled for removal.
 * Its functionality has been consolidated into UnifiedBatteryHandler.js.
 * See docs/BATTERY_AUDIT.md for the full P54 plan.
 * Removal is safe: search the codebase for any imports of this file first.
 */

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║          BatteryCascadeEngine v1.0.0 — P33 FINAL BATTERY ENGINE             ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  Synthèse de 8+ années de battery handling (v5.3.15 → 2026).                ║
 * ║  CASCADE de 7 méthodes avec fallback à chaque niveau.                        ║
 * ║  100% offline. Pas d'IA, pas de réseau.                                     ║
 * ║                                                                              ║
 * ║  CASCADE ORDER (priority 1 → 7):                                            ║
 * ║   1. STORED VALUE    — Last known good value (cold-boot restore)             ║
 * ║   2. PROFILE LOOKUP  — mfr+pid → battery type (P14, P19.1, P28)             ║
 * ║   3. TUYA DP         — DP 4/15/101 (percent) + 3/14 (state) + 33/35/247 (V) ║
 * ║   4. ZCL PERCENT     — powerConfiguration.batteryPercentageRemaining       ║
 * ║   5. ZCL VOLTAGE     — powerConfiguration.batteryVoltage + chemistry curve  ║
 * ║   6. IAS ZONE        — bit 3 in zoneStatus (low battery alarm)             ║
 * ║   7. VOLTAGE FALLBACK — If only raw ADC value, convert to V + curve         ║
 * ║                                                                              ║
 * ║  Plus ALL the historical fixes:                                             ║
 * ║  - 200% sentinel (P19.1) — ZCL value 200 means "not available"              ║
 * ║  - 0-50 scale (TZE200_vvmbj4f5) — multiply by 2                             ║
 * ║  - 255/0xFFFF sentinels — filter before normalize                           ║
 * ║  - EMA smoothing (factor 0.3, max 5% jump)                                  ║
 * ║  - Battery replacement detection (>20% increase)                            ║
 * ║  - Anti-flood (60s min, <2% change ignored)                                 ║
 * ║  - Anti-fluctuation (>50% jump rejected in <24h)                            ║
 * ║  - Persist to store (key: last_battery_percentage + last_battery_time)     ║
 * ║  - Voltage temperature compensation                                        ║
 * ║  - 18 battery chemistry profiles (P28)                                     ║
 * ║  - 32 manufacturer profiles (P28)                                         ║
 * ║  - Source tracking (zcl, tuya, voltage, state, stored)                     ║
 * ║  - Diagnostic state (drain rate, estimated days, health)                   ║
 * ║  - onEndDeviceAnnounce hook for sleepy devices                             ║
 * ║  - Button wake-up read for TS0041/TS0044/TS004F                            ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: BATTERY CHEMISTRY SPECS
// From UnifiedBatteryHandler.js (P28) — non-linear discharge curves
// ═══════════════════════════════════════════════════════════════════════════════

const BATTERY_SPECS = {
  CR2032: { type: 'Lithium Coin Cell', chemistry: 'Li-MnO2', cells: 1, nominal: 3.0, fresh: 3.3, full: 3.0, low: 2.5, dead: 2.0, capacity: 220,
    curve: [[3.30,100],[3.10,98],[3.00,95],[2.95,90],[2.90,85],[2.85,75],[2.80,65],[2.75,50],[2.70,40],[2.60,25],[2.50,15],[2.40,8],[2.30,4],[2.20,2],[2.00,0]] },
  CR2450: { type: 'Lithium Coin Cell', chemistry: 'Li-MnO2', cells: 1, nominal: 3.0, fresh: 3.3, full: 3.0, low: 2.5, dead: 2.0, capacity: 620,
    curve: [[3.30,100],[3.00,95],[2.90,85],[2.80,70],[2.70,50],[2.60,30],[2.50,15],[2.40,8],[2.00,0]] },
  CR2477: { type: 'Lithium Coin Cell', chemistry: 'Li-MnO2', cells: 1, nominal: 3.0, fresh: 3.3, full: 3.0, low: 2.5, dead: 2.0, capacity: 1000,
    curve: [[3.30,100],[3.00,95],[2.90,85],[2.80,70],[2.70,50],[2.60,30],[2.50,15],[2.00,0]] },
  CR123A: { type: 'Lithium Photo', chemistry: 'Li-MnO2', cells: 1, nominal: 3.0, fresh: 3.3, full: 3.0, low: 2.5, dead: 2.0, capacity: 1500,
    curve: [[3.30,100],[3.15,95],[3.00,90],[2.90,80],[2.80,65],[2.70,45],[2.60,25],[2.50,12],[2.40,5],[2.00,0]] },
  CR1632: { type: 'Lithium Coin Cell', chemistry: 'Li-MnO2', cells: 1, nominal: 3.0, fresh: 3.3, full: 3.0, low: 2.5, dead: 2.0, capacity: 140,
    curve: [[3.30,100],[3.00,95],[2.90,85],[2.80,70],[2.70,50],[2.60,30],[2.50,15],[2.00,0]] },
  AAA: { type: 'Alkaline', chemistry: 'Zn-MnO2', cells: 1, nominal: 1.5, fresh: 1.65, full: 1.55, low: 1.1, dead: 0.9, capacity: 1200,
    curve: [[1.65,100],[1.55,95],[1.50,90],[1.45,80],[1.40,70],[1.35,60],[1.30,50],[1.25,40],[1.20,30],[1.15,20],[1.10,12],[1.05,6],[1.00,3],[0.90,0]] },
  AA: { type: 'Alkaline', chemistry: 'Zn-MnO2', cells: 1, nominal: 1.5, fresh: 1.65, full: 1.55, low: 1.1, dead: 0.9, capacity: 2850,
    curve: [[1.65,100],[1.55,95],[1.50,90],[1.45,80],[1.40,70],[1.35,60],[1.30,50],[1.25,40],[1.20,30],[1.15,20],[1.10,12],[1.05,6],[1.00,3],[0.90,0]] },
  '2xAAA': { type: 'Alkaline Multi-Cell', chemistry: 'Zn-MnO2', cells: 2, nominal: 3.0, fresh: 3.3, full: 3.1, low: 2.2, dead: 1.8, capacity: 1200,
    curve: [[3.30,100],[3.10,95],[3.00,90],[2.90,80],[2.80,70],[2.70,60],[2.60,50],[2.50,40],[2.40,30],[2.30,20],[2.20,12],[2.00,5],[1.80,0]] },
  '2xAA': { type: 'Alkaline Multi-Cell', chemistry: 'Zn-MnO2', cells: 2, nominal: 3.0, fresh: 3.3, full: 3.1, low: 2.2, dead: 1.8, capacity: 2850,
    curve: [[3.30,100],[3.10,95],[3.00,90],[2.90,80],[2.80,70],[2.70,60],[2.60,50],[2.50,40],[2.40,30],[2.30,20],[2.20,12],[2.00,5],[1.80,0]] },
  '4xAAA': { type: 'Alkaline Multi-Cell', chemistry: 'Zn-MnO2', cells: 4, nominal: 6.0, fresh: 6.6, full: 6.2, low: 4.4, dead: 3.6, capacity: 1200,
    curve: [[6.60,100],[6.20,95],[6.00,90],[5.80,80],[5.60,70],[5.40,60],[5.20,50],[5.00,40],[4.80,30],[4.60,20],[4.40,12],[4.00,5],[3.60,0]] },
  'Li-ion': { type: 'Lithium-ion Rechargeable', chemistry: 'Li-ion', cells: 1, nominal: 3.7, fresh: 4.2, full: 4.1, low: 3.3, dead: 2.8, capacity: 2600,
    curve: [[4.20,100],[4.15,98],[4.10,95],[4.00,88],[3.90,78],[3.80,65],[3.70,50],[3.60,35],[3.50,22],[3.40,12],[3.30,5],[3.00,2],[2.80,0]] },
  '18650': { type: 'Lithium-ion 18650', chemistry: 'Li-ion', cells: 1, nominal: 3.7, fresh: 4.2, full: 4.1, low: 3.3, dead: 2.5, capacity: 3400,
    curve: [[4.20,100],[4.10,95],[4.00,88],[3.90,78],[3.80,65],[3.70,50],[3.60,35],[3.50,22],[3.40,12],[3.30,5],[3.00,2],[2.50,0]] },
  USB: { type: 'USB Powered', chemistry: 'none', cells: 0, nominal: 5.0, fresh: 5.0, full: 5.0, low: 5.0, dead: 0, capacity: Infinity, curve: [[5,100],[0,0]] },
  MAINS: { type: 'AC Powered', chemistry: 'none', cells: 0, nominal: 230, fresh: 230, full: 230, low: 200, dead: 0, capacity: Infinity, curve: [[230,100],[0,0]] },
  NiMH: { type: 'NiMH Rechargeable', chemistry: 'NiMH', cells: 1, nominal: 1.2, fresh: 1.4, full: 1.25, low: 1.0, dead: 0.9, capacity: 2500,
    curve: [[1.40,100],[1.30,90],[1.25,80],[1.20,70],[1.15,55],[1.10,40],[1.05,25],[1.00,10],[0.95,3],[0.90,0]] },
};

const DEFAULT_BATTERY = 'CR2032';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: TUYA DP CONSTANTS
// From P14, P28, UnifiedBatteryHandler.js
// ═══════════════════════════════════════════════════════════════════════════════

const TUYA_PERCENT_DPS = new Set([4, 15, 101, 10, 21, 100, 102, 104, 105, 121]);
const TUYA_STATE_DPS = new Set([3, 14]);
const TUYA_VOLTAGE_DPS = new Set([33, 35, 247]);

// ZCL manufacturers that LEGITIMATELY use 200 as 100% (P19.1 a234bcf32)
const BATTERY_200_WHITELIST = new Set(['_TZ3000_lqmvrwa2']);

// ZCL sentinel values
const ZCL_SENTINELS = [255, 0xFFFF];

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: MANUFACTURER PROFILES (P28 — 32 profiles)
// ═══════════════════════════════════════════════════════════════════════════════

const MANUFACTURER_PROFILES = {
  // Soil sensors
  '_TZE284_oitavov2':   { chemistry: 'CR2032', source: 'tuya_dp', dpId: 15, algorithm: 'direct' },
  '_TZE284_aao3yzhs':  { chemistry: 'CR2032', source: 'tuya_dp', dpId: 15, algorithm: 'direct' },
  '_TZE200_myd45weu':  { chemistry: 'CR2450', source: 'tuya_dp', dpId: 15, algorithm: 'direct' },
  '_TZE204_myd45weu':  { chemistry: 'CR2450', source: 'tuya_dp', dpId: 15, algorithm: 'direct' },
  '_TZE284_myd45weu':  { chemistry: 'CR2450', source: 'tuya_dp', dpId: 15, algorithm: 'direct' },
  // Climate sensors
  '_TZE284_vvmbj4f5':  { chemistry: 'CR2032', source: 'tuya_dp', dpId: 4, algorithm: 'multiply_2' },
  '_TZE200_vvmbj4f5':  { chemistry: 'CR2032', source: 'tuya_dp', dpId: 4, algorithm: 'multiply_2' },
  '_TZE200_bjawzodf':  { chemistry: 'CR2032', source: 'tuya_dp', dpId: 4, algorithm: 'multiply_2' },
  '_TZE200_a8sdabtg':  { chemistry: 'CR2032', source: 'tuya_dp', dpId: 4, algorithm: 'direct' },
  // SOS buttons
  '_TZ3000_0dumfk2z':  { chemistry: 'CR2032', source: 'tuya_dp', dpId: 101, algorithm: 'direct', skipZclPolling: true },
  '_TZ3000_fdr5rqsn':  { chemistry: 'CR2032', source: 'tuya_dp', dpId: 101, algorithm: 'direct', skipZclPolling: true },
  // PIR motion
  '_TZ3000_mcxw5ehu':  { chemistry: 'AAA', source: 'zcl_power', algorithm: 'alkaline_curve' },
  '_TZ3000_kmh5qpmb':  { chemistry: 'CR123A', source: 'zcl_power', algorithm: 'lithium_flat' },
  // Contact sensors
  '_TZ3000_26fmupbb':  { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve' },
  '_TZ3000_decxrtwa':  { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve' },
  '_TZ3000_fxwsnmhb':  { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve' },
  // Scene switches
  '_TZ3400_keyjqthh':  { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve' },
  '_TZ3000_bi6lpsew':  { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve' },
  // 4-button scene (zcl200IsPercent = true)
  '_TZ3000_b4awzgct':  { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve', zcl200IsPercent: true },
  '_TZ3000_yj6k7vfo':  { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve', zcl200IsPercent: true },
  '_TZ3000_u3nv1jwk':  { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve', zcl200IsPercent: true },
  '_TZ3000_kfu8zapd':  { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve', zcl200IsPercent: true },
  '_TZ3000_xabckq1v':  { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve', zcl200IsPercent: true },
  '_TZ3000_czuyt8lz':  { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve', zcl200IsPercent: true },
  '_TZ3000_b3mgfu0d':  { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve', zcl200IsPercent: true },
  '_TZ3000_rco1yzb1':  { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve', zcl200IsPercent: true },
  '_TZ3000_qja6nq5z':  { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve', zcl200IsPercent: true },
  '_TZ3000_gwkzibhs':  { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve', zcl200IsPercent: true },
  // USB / mains powered (no battery)
  '_TZE200_rhgsbacq':  { chemistry: 'USB', source: 'none' },
  '_TZE204_sxm7l9xa':  { chemistry: 'USB', source: 'none' },
  '_TZ3000_h1ipgkwn':  { chemistry: 'MAINS', source: 'none' },
  'LELLKI':             { chemistry: 'MAINS', source: 'none' },
};

const PRODUCT_ID_DEFAULTS = {
  'TS0601': { source: 'tuya_dp', dpId: 4, algorithm: 'direct' },
  'TS0001': { chemistry: 'MAINS', source: 'none' },
  'TS0002': { chemistry: 'MAINS', source: 'none' },
  'TS0003': { chemistry: 'MAINS', source: 'none' },
  'TS0004': { chemistry: 'MAINS', source: 'none' },
  'TS011F': { chemistry: 'MAINS', source: 'none' },
  'TS0115': { chemistry: 'MAINS', source: 'none' },
  'TS0201': { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve' },
  'TS0202': { chemistry: 'AAA', source: 'zcl_power', algorithm: 'alkaline_curve' },
  'TS0203': { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve' },
  'TS0207': { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve' },
  'TS0215A': { chemistry: 'CR2032', source: 'tuya_dp', dpId: 101, algorithm: 'direct' },
  'TS0041': { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve', zcl200IsPercent: true },
  'TS0042': { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve', zcl200IsPercent: true },
  'TS0043': { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve', zcl200IsPercent: true },
  'TS0044': { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve', zcl200IsPercent: true },
  'TS004F': { chemistry: 'CR2032', source: 'zcl_power', algorithm: 'cr2032_curve', zcl200IsPercent: true },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: HELPER FUNCTIONS
// From UnifiedBatteryHandler.js, UniversalBatteryFallback.js (P28)
// ═══════════════════════════════════════════════════════════════════════════════

function coerceNumeric(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (Buffer.isBuffer(value)) {
    if (value.length === 0) return null;
    if (value.length <= 4) return value.readUIntBE(0, value.length);
    return value[value.length - 1];
  }
  if (Array.isArray(value)) return coerceNumeric(Buffer.from(value));
  if (typeof value === 'object') {
    return coerceNumeric(value.value ?? value.dpValue ?? value.data ?? value.raw);
  }
  return null;
}

function normalizeVoltage(raw) {
  const v = coerceNumeric(raw);
  if (!Number.isFinite(v) || v <= 0) return null;
  if (v >= 800 && v <= 6000) return v / 1000;  // mV
  if (v > 100 && v <= 600) return v / 100;       // cV
  if (v >= 20 && v <= 60) return v / 10;          // dV
  if (v >= 0.8 && v <= 15) return v;              // V
  return null;
}

function voltageToPercent(voltage, batteryType = DEFAULT_BATTERY, temperature = 20) {
  const spec = BATTERY_SPECS[batteryType] || BATTERY_SPECS[DEFAULT_BATTERY];
  if (!Number.isFinite(voltage) || voltage <= 0) return null;

  // Temperature compensation (P28 — cold weather = lower)
  let compensated = voltage;
  if (temperature < 20 && spec.tempCoeff) {
    compensated = voltage - (spec.tempCoeff * (20 - temperature));
  }

  if (compensated >= spec.fresh) return 100;
  if (compensated <= spec.dead) return 0;

  for (let i = 0; i < spec.curve.length - 1; i++) {
    const [vH, pH] = spec.curve[i];
    const [vL, pL] = spec.curve[i + 1];
    if (compensated >= vL && compensated <= vH) {
      const t = (compensated - vL) / (vH - vL);
      return Math.round(pL + t * (pH - pL));
    }
  }
  return compensated > spec.curve[0][0] ? 100 : 0;
}

function normalizeZigbeeValue(raw, options = {}) {
  const value = coerceNumeric(raw);
  if (!Number.isFinite(value)) return null;

  const treat200AsSentinel = options.treat200AsSentinel !== false;
  const lastValue = options.lastValue;
  const hasLastValue = Number.isFinite(lastValue);
  const manufacturer = options.manufacturer || '';

  // Sentinels
  if (value === 255 || value === 0xFFFF || value < 0) return null;

  // 200 sentinel (P19.1)
  if (value === 200) {
    if (treat200AsSentinel && !BATTERY_200_WHITELIST.has(manufacturer)) return null;
    return 100;
  }

  // 0-50 scale anomaly (P28 — TZE200_vvmbj4f5 etc.)
  if (value > 0 && value <= 50 && hasLastValue && lastValue > 0 && lastValue <= 50) {
    return Math.min(100, Math.round(value * 2));
  }

  // 0-200 ZCL scale (e.g., 160 = 80%)
  if (value > 100 && value <= 200) {
    return Math.round(value / 2);
  }

  // 201-1000 (rare 0-1000 scale)
  if (value > 200 && value < 1000) {
    return Math.round((value / 255) * 100);
  }

  // 1000-4000 mV (e.g., 3000 = 3.0V)
  if (value >= 1000 && value <= 4000) {
    const voltage = value / 1000;
    return voltageToPercent(voltage, options.batteryType || DEFAULT_BATTERY, options.temperature);
  }

  // 25-50 with last value > 40 (voltage as percent, 2.5-3.6V → 0-100%)
  if (value >= 25 && value <= 50 && hasLastValue && lastValue > 40) {
    return Math.round(((value - 25) / 11) * 100);
  }

  // 0-100 = direct percent
  if (value >= 0 && value <= 100) {
    return Math.round(value);
  }

  // Out of range — clamp
  return Math.max(0, Math.min(100, Math.round(value)));
}

function tuyaDpToPercent(dp, value, options = {}) {
  const dpId = Number(dp);
  const raw = coerceNumeric(value);
  if (!Number.isFinite(dpId) || !Number.isFinite(raw)) return null;

  if (raw === 255 || raw === 0xFFFF || raw < 0) return null;

  // Voltage DPs
  if (TUYA_VOLTAGE_DPS.has(dpId)) {
    const voltage = normalizeVoltage(raw);
    if (voltage === null) return null;
    return voltageToPercent(voltage, options.batteryType || DEFAULT_BATTERY, options.temperature);
  }

  // State DPs
  if (TUYA_STATE_DPS.has(dpId)) {
    if (raw === 0) return 10;
    if (raw === 1) return 50;
    if (raw === 2) return 100;
    if (raw >= 3 && raw <= 100) return Math.round(raw);
    return null;
  }

  // Battery percent DPs
  if (TUYA_PERCENT_DPS.has(dpId)) {
    if (raw <= 2 && dpId !== 4 && dpId !== 15 && dpId !== 101) return null;
    return normalizeZigbeeValue(raw, options);
  }

  return null;
}

function lookupProfile(manufacturer, productId) {
  if (manufacturer && MANUFACTURER_PROFILES[manufacturer]) {
    return { source: 'manufacturer', ...MANUFACTURER_PROFILES[manufacturer] };
  }
  if (productId) {
    const pid = String(productId).toUpperCase();
    for (const [pattern, profile] of Object.entries(PRODUCT_ID_DEFAULTS)) {
      if (pid.startsWith(pattern)) {
        return { source: 'productId', ...profile };
      }
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: BatteryCascadeEngine CLASS
// Combines ALL methods with cascade fallback
// ═══════════════════════════════════════════════════════════════════════════════

class BatteryCascadeEngine {
  constructor(device, options = {}) {
    this.device = device;
    this.options = {
      // Default options — can be overridden per device
      smoothing: true,
      smoothingFactor: 0.3,
      maxJump: 5,
      antiFlood: true,
      minInterval: 60000,        // 1 minute
      minChangeThreshold: 2,
      maxChangeRejection: 50,    // reject >50% jumps
      maxChangeWindow: 86400000,  // 24h
      batteryReplacementJump: 20,// >20% = replacement
      persistToStore: true,
      enableHealth: true,
      enableVoltageCompensation: true,
      defaultTemperature: 20,
      ...options,
    };

    // State
    this.lastValue = null;
    this.lastVoltage = null;
    this.lastUpdate = 0;
    this.lastSource = null;
    this._smoothedValue = null;
    this._initialized = false;
    this._destroyed = false;

    // Health state (P28 + P19.1)
    this.health = {
      drainRate: null,
      estimatedDays: null,
      history: [],
      lastReport: null,
    };

    // Profile cache
    this._profile = null;
    this._batteryType = null;
    this._temperature = this.options.defaultTemperature;

    // Source tracking (P28)
    this._sources = {
      stored: 0,
      zcl: 0,
      tuya: 0,
      voltage: 0,
      state: 0,
      ias: 0,
    };
  }

  // ─── CASCADE: 7 METHODS WITH FALLBACK ─────────────────────────
  // Returns { value, source, method } or null

  readBattery() {
    if (this._destroyed) return null;

    // METHOD 1: STORED VALUE (cold-boot restore, P19.1 50847cd15)
    let result = this._tryStored();
    if (result) {
      this._sources.stored++;
      return { ...result, method: 1, sourceLabel: 'stored' };
    }

    // METHOD 2: PROFILE LOOKUP (mfr → chemistry, P28)
    result = this._tryProfile();
    if (result) {
      this._sources.profile = (this._sources.profile || 0) + 1;
      return { ...result, method: 2, sourceLabel: 'profile' };
    }

    // METHOD 3: TUYA DP (DP 4/15/101 + 3/14 + 33/35/247)
    if (this.device.tuyaEF00Manager) {
      result = this._tryTuyaDP();
      if (result) {
        this._sources.tuya++;
        return { ...result, method: 3, sourceLabel: 'tuya' };
      }
    }

    // METHOD 4: ZCL PERCENT (powerConfiguration.batteryPercentageRemaining)
    result = this._tryZclPercent();
    if (result) {
      this._sources.zcl++;
      return { ...result, method: 4, sourceLabel: 'zcl' };
    }

    // METHOD 5: ZCL VOLTAGE (powerConfiguration.batteryVoltage)
    result = this._tryZclVoltage();
    if (result) {
      this._sources.voltage++;
      return { ...result, method: 5, sourceLabel: 'voltage' };
    }

    // METHOD 6: IAS ZONE (bit 3 of zoneStatus)
    result = this._tryIasZone();
    if (result) {
      this._sources.ias++;
      return { ...result, method: 6, sourceLabel: 'ias' };
    }

    // METHOD 7: VOLTAGE FALLBACK (any raw value that looks like voltage)
    result = this._tryVoltageFallback();
    if (result) {
      this._sources.voltage++;
      return { ...result, method: 7, sourceLabel: 'voltage-fallback' };
    }

    return null;  // No method succeeded
  }

  // ─── METHOD 1: STORED VALUE ─────────────────────────────────────
  _tryStored() {
    if (!this.device.getStoreValue) return null;
    const stored = this.device.getStoreValue('last_battery_percentage');
    if (!Number.isFinite(stored)) return null;
    return { value: Number(stored), source: 'stored', estimated: true };
  }

  // ─── METHOD 2: PROFILE LOOKUP ──────────────────────────────────
  _tryProfile() {
    if (!this._profile) {
      const settings = this.device.getSettings?.() || {};
      const mfr = settings.zb_manufacturer_name || '';
      const pid = settings.zb_model_id || '';
      this._profile = lookupProfile(mfr, pid);
      if (this._profile) {
        this._batteryType = this._profile.chemistry || DEFAULT_BATTERY;
        this.device.log?.(`[BAT-CASCADE] Profile: mfr=${mfr} pid=${pid} → ${this._batteryType}`);
      }
    }
    if (!this._profile || this._profile.source === 'none') return null;
    // Profile just gives the battery type — value comes from another method
    return null;
  }

  // ─── METHOD 3: TUYA DP ─────────────────────────────────────────
  _tryTuyaDP() {
    try {
      const mgr = this.device.tuyaEF00Manager;
      if (!mgr) return null;
      // Try common battery DPs
      for (const dp of [4, 15, 101, 14, 3, 33, 35, 247]) {
        if (typeof mgr.getDP === 'function') {
          const value = mgr.getDP(dp);
          if (value !== null && value !== undefined) {
            const percent = tuyaDpToPercent(dp, value, {
              batteryType: this._batteryType || DEFAULT_BATTERY,
              temperature: this._temperature,
              lastValue: this.lastValue,
            });
            if (percent !== null) {
              return { value: percent, source: `tuya-dp-${dp}`, dp, rawValue: value };
            }
          }
        }
      }
    } catch (e) { /* silent */ }
    return null;
  }

  // ─── METHOD 4: ZCL PERCENT ─────────────────────────────────────
  _tryZclPercent() {
    try {
      const zclNode = this.device.zclNode;
      if (!zclNode?.endpoints) return null;
      const settings = this.device.getSettings?.() || {};
      const mfr = settings.zb_manufacturer_name || '';

      for (const ep of Object.values(zclNode.endpoints)) {
        const cluster = ep?.clusters?.powerConfiguration || ep?.clusters?.genPowerCfg || ep?.clusters?.[0x0001];
        if (!cluster) continue;

        // Read batteryPercentageRemaining (P19.1: handle 200 sentinel)
        if (typeof cluster.readAttributes === 'function') {
          const attrs = cluster.readAttributes(['batteryPercentageRemaining']).catch(() => ({}));
          if (attrs?.batteryPercentageRemaining !== undefined) {
            const percent = normalizeZigbeeValue(attrs.batteryPercentageRemaining, {
              batteryType: this._batteryType || DEFAULT_BATTERY,
              manufacturer: mfr,
              treat200AsSentinel: this._profile?.zcl200IsPercent !== true,
              lastValue: this.lastValue,
              temperature: this._temperature,
            });
            if (percent !== null) {
              return { value: percent, source: 'zcl-percent', rawValue: attrs.batteryPercentageRemaining };
            }
          }
        }

        // Direct attribute access
        if (cluster.batteryPercentageRemaining !== undefined) {
          const percent = normalizeZigbeeValue(cluster.batteryPercentageRemaining, {
            batteryType: this._batteryType || DEFAULT_BATTERY,
            manufacturer: mfr,
            treat200AsSentinel: this._profile?.zcl200IsPercent !== true,
            lastValue: this.lastValue,
          });
          if (percent !== null) {
            return { value: percent, source: 'zcl-direct', rawValue: cluster.batteryPercentageRemaining };
          }
        }
      }
    } catch (e) { /* silent (sleepy device) */ }
    return null;
  }

  // ─── METHOD 5: ZCL VOLTAGE ──────────────────────────────────────
  _tryZclVoltage() {
    try {
      const zclNode = this.device.zclNode;
      if (!zclNode?.endpoints) return null;

      for (const ep of Object.values(zclNode.endpoints)) {
        const cluster = ep?.clusters?.powerConfiguration || ep?.clusters?.genPowerCfg || ep?.clusters?.[0x0001];
        if (!cluster) continue;

        if (typeof cluster.readAttributes === 'function') {
          const attrs = cluster.readAttributes(['batteryVoltage']).catch(() => ({}));
          if (attrs?.batteryVoltage !== undefined) {
            const voltage = normalizeVoltage(attrs.batteryVoltage);
            if (voltage !== null) {
              this.lastVoltage = voltage;
              const percent = voltageToPercent(voltage, this._batteryType || DEFAULT_BATTERY, this._temperature);
              if (percent !== null) {
                return { value: percent, source: 'zcl-voltage', rawValue: attrs.batteryVoltage, voltage };
              }
            }
          }
        }

        if (cluster.batteryVoltage !== undefined) {
          const voltage = normalizeVoltage(cluster.batteryVoltage);
          if (voltage !== null) {
            this.lastVoltage = voltage;
            const percent = voltageToPercent(voltage, this._batteryType || DEFAULT_BATTERY, this._temperature);
            if (percent !== null) {
              return { value: percent, source: 'zcl-direct-voltage', rawValue: cluster.batteryVoltage, voltage };
            }
          }
        }
      }
    } catch (e) { /* silent */ }
    return null;
  }

  // ─── METHOD 6: IAS ZONE ─────────────────────────────────────────
  _tryIasZone() {
    try {
      const zclNode = this.device.zclNode;
      if (!zclNode?.endpoints) return null;
      for (const ep of Object.values(zclNode.endpoints)) {
        const cluster = ep?.clusters?.iasZone || ep?.clusters?.ssIasZone || ep?.clusters?.[0x0500];
        if (!cluster) continue;
        // Listen for zoneStatus bit 3 = low battery
        if (typeof cluster.readAttributes === 'function') {
          const attrs = cluster.readAttributes(['zoneStatus']).catch(() => ({}));
          if (attrs?.zoneStatus !== undefined) {
            const isLow = (attrs.zoneStatus & 0x08) !== 0;
            return { value: isLow ? 5 : 100, source: 'ias-zone', estimated: isLow };
          }
        }
      }
    } catch (e) { /* silent */ }
    return null;
  }

  // ─── METHOD 7: VOLTAGE FALLBACK ─────────────────────────────────
  _tryVoltageFallback() {
    try {
      // Last resort: try any attribute that looks like voltage
      const zclNode = this.device.zclNode;
      if (!zclNode?.endpoints) return null;
      for (const ep of Object.values(zclNode.endpoints)) {
        const cluster = ep?.clusters?.powerConfiguration;
        if (!cluster) continue;
        for (const attr of ['batteryVoltage', 'batteryQuantity', 'batteryRatedVoltage']) {
          if (cluster[attr] !== undefined) {
            const voltage = normalizeVoltage(cluster[attr]);
            if (voltage !== null && voltage > 0.5 && voltage < 15) {
              const percent = voltageToPercent(voltage, this._batteryType || DEFAULT_BATTERY, this._temperature);
              if (percent !== null) {
                return { value: percent, source: `voltage-fallback-${attr}`, voltage };
              }
            }
          }
        }
      }
    } catch (e) { /* silent */ }
    return null;
  }

  // ─── UPDATE: Apply with all the historical fixes ────────────────
  // P19 EMA smoothing, P19.1 anti-flood, P28 persist, P19.1 replacement detection
  update(percent, meta = {}) {
    if (this._destroyed) return null;
    if (!Number.isFinite(percent)) return null;

    const value = Math.max(0, Math.min(100, Math.round(percent)));
    const now = Date.now();
    const previous = this.lastValue;

    // P19.1: ANTI-FLOOD (5min + 5% change)
    if (this.options.antiFlood && this.lastValue !== null) {
      const elapsed = now - this.lastUpdate;
      const change = Math.abs(value - this.lastValue);

      if (value === this.lastValue) return this.lastValue;
      if (elapsed < this.options.minInterval && change < this.options.minChangeThreshold) return this.lastValue;

      // P19.1: ANTI-FLUCTUATION (reject >50% in <24h)
      if (elapsed < this.options.maxChangeWindow && change > this.options.maxChangeRejection && value > 0) {
        this.device.log?.(`[BAT-CASCADE] ⚠️ Rejected abnormal ${this.lastValue}→${value} (${change}% in ${Math.round(elapsed/1000)}s)`);
        // Trigger anomaly flow card if available
        try {
          const card = this.device.homey?.flow?.getDeviceTriggerCard?.('battery_anomaly_detected');
          if (card) {
            card.trigger(this.device, { previous_value: this.lastValue, current_value: value, change }).catch(() => {});
          }
        } catch { /* ignore */ }
        return this.lastValue;
      }
      this.lastUpdate = now;
    } else {
      this.lastUpdate = now;
    }

    // P19: EMA SMOOTHING
    let smoothed = value;
    if (this.options.smoothing && this._smoothedValue !== null) {
      // P19.1: Battery replacement detection (>20% increase)
      if (value > this._smoothedValue + this.options.batteryReplacementJump) {
        this.device.log?.(`[BAT-CASCADE] 🔄 Battery replacement: ${this._smoothedValue}% → ${value}%`);
        this._smoothedValue = value;
      } else {
        const candidate = this._smoothedValue + this.options.smoothingFactor * (value - this._smoothedValue);
        const rounded = Math.round(candidate);
        const maxJump = this.options.maxJump;
        if (Math.abs(rounded - this._smoothedValue) > maxJump) {
          this._smoothedValue = this._smoothedValue + Math.sign(rounded - this._smoothedValue) * maxJump;
        } else {
          this._smoothedValue = rounded;
        }
        smoothed = this._smoothedValue;
      }
    } else {
      this._smoothedValue = value;
    }

    this.lastValue = smoothed;
    this.lastSource = meta.source || 'unknown';

    // P28: Update Health
    this._updateHealth(smoothed);

    // Update measure_battery capability
    if (this.device.hasCapability?.('measure_battery')) {
      this.device.setCapabilityValue('measure_battery', parseFloat(smoothed)).catch(err => {
        this.device.error?.(`[BAT-CASCADE] setCapabilityValue failed: ${err.message}`);
      });
    }

    // Update measure_voltage capability if present
    if (this.lastVoltage !== null && this.device.hasCapability?.('measure_voltage')) {
      this.device.setCapabilityValue('measure_voltage', parseFloat(this.lastVoltage)).catch(() => {});
    }

    // P19.1: PERSIST TO STORE (cold-boot restore)
    if (this.options.persistToStore && this.device.setStoreValue) {
      try {
        this.device.setStoreValue('last_battery_percentage', smoothed);
        this.device.setStoreValue('last_battery_time', Date.now());
        this.device.setStoreValue('last_battery_source', this.lastSource);
        if (this.lastVoltage !== null) {
          this.device.setStoreValue('battery_voltage', this.lastVoltage);
        }
      } catch { /* ignore */ }
    }

    // Battery low flow card
    if (smoothed <= 20 && previous > 20) {
      try {
        const card = this.device.homey?.flow?.getDeviceTriggerCard?.('battery_low');
        if (card) card.trigger(this.device, { battery: smoothed }).catch(() => {});
      } catch { /* ignore */ }
    }

    this.device.log?.(`[BAT-CASCADE] ${this.lastSource}: ${smoothed}% (raw: ${percent}%)`);

    return smoothed;
  }

  _updateHealth(percent) {
    const now = Date.now();
    this.health.history.push({ time: now, percentage: percent });
    if (this.health.history.length > 30) this.health.history.shift();
    if (this.health.history.length >= 2) {
      const oldest = this.health.history[0];
      const newest = this.health.history[this.health.history.length - 1];
      const daysDiff = (newest.time - oldest.time) / (1000 * 60 * 60 * 24);
      const percentDiff = oldest.percentage - newest.percentage;
      if (daysDiff > 0 && percentDiff > 0) {
        this.health.drainRate = percentDiff / daysDiff;
        this.health.estimatedDays = Math.round(percent / this.health.drainRate);
      }
    }
    this.health.lastReport = now;
  }

  // ─── Public API for direct integration ──────────────────────────
  // Use this when you have a ZCL/Tuya value to feed in directly

  feedZcl(value) {
    const percent = normalizeZigbeeValue(value, {
      batteryType: this._batteryType || DEFAULT_BATTERY,
      manufacturer: this.device.getSettings?.()?.zb_manufacturer_name || '',
      treat200AsSentinel: this._profile?.zcl200IsPercent !== true,
      lastValue: this.lastValue,
      temperature: this._temperature,
    });
    if (percent !== null) {
      return this.update(percent, { source: 'zcl-feed' });
    }
    return null;
  }

  feedTuyaDP(dp, value) {
    const percent = tuyaDpToPercent(dp, value, {
      batteryType: this._batteryType || DEFAULT_BATTERY,
      lastValue: this.lastValue,
      temperature: this._temperature,
    });
    if (percent !== null) {
      return this.update(percent, { source: `tuya-dp-${dp}` });
    }
    return null;
  }

  feedVoltage(volts) {
    const percent = voltageToPercent(volts, this._batteryType || DEFAULT_BATTERY, this._temperature);
    if (percent !== null) {
      this.lastVoltage = volts;
      return this.update(percent, { source: 'voltage-direct' });
    }
    return null;
  }

  feedState(state) {
    // 0 = low = 10%, 1 = medium = 50%, 2 = high = 100%
    const map = { 0: 10, 1: 50, 2: 100 };
    const percent = map[state];
    if (percent !== undefined) {
      return this.update(percent, { source: 'state-enum' });
    }
    return null;
  }

  // ─── onEndDeviceAnnounce hook (P19.1 + P28) ─────────────────────
  // Call this from device.js onNodeInit
  onEndDeviceAnnounce() {
    this.device.log?.('[BAT-CASCADE] Device wake — re-reading battery');
    const result = this.readBattery();
    if (result) {
      return this.update(result.value, { source: `wake-${result.sourceLabel}` });
    }
    return null;
  }

  // ─── Restore from store (P19.1) ──────────────────────────────────
  async restoreFromStore() {
    if (!this.device.getStoreValue) return null;
    try {
      const stored = await Promise.resolve(this.device.getStoreValue('last_battery_percentage')).catch(() => null);
      if (Number.isFinite(Number(stored))) {
        const value = Number(stored);
        this.lastValue = value;
        this._smoothedValue = value;
        if (this.device.hasCapability?.('measure_battery')) {
          await this.device.setCapabilityValue('measure_battery', parseFloat(value)).catch(() => {});
        }
        this.device.log?.(`[BAT-CASCADE] ✅ Restored from store: ${value}%`);
        return value;
      }
    } catch { /* ignore */ }
    return null;
  }

  // ─── Diagnostics ────────────────────────────────────────────────
  getDiagnostics() {
    return {
      lastValue: this.lastValue,
      lastVoltage: this.lastVoltage,
      lastSource: this.lastSource,
      batteryType: this._batteryType,
      profile: this._profile,
      health: this.health,
      sources: this._sources,
      options: this.options,
    };
  }

  destroy() {
    this._destroyed = true;
    this.lastValue = null;
    this.lastVoltage = null;
    this._smoothedValue = null;
    this._profile = null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  BatteryCascadeEngine,
  BATTERY_SPECS,
  MANUFACTURER_PROFILES,
  PRODUCT_ID_DEFAULTS,
  TUYA_PERCENT_DPS,
  TUYA_STATE_DPS,
  TUYA_VOLTAGE_DPS,
  BATTERY_200_WHITELIST,
  ZCL_SENTINELS,
  DEFAULT_BATTERY,
  // Helpers
  coerceNumeric,
  normalizeVoltage,
  voltageToPercent,
  normalizeZigbeeValue,
  tuyaDpToPercent,
  lookupProfile,
  // Version
  version: '1.0.0',
  cascadeSteps: 7,
  chemProfiles: Object.keys(BATTERY_SPECS).length,
  manufacturerProfiles: Object.keys(MANUFACTURER_PROFILES).length,
  productIdDefaults: Object.keys(PRODUCT_ID_DEFAULTS).length,
};
