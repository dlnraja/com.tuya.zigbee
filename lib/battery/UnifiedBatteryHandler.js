'use strict';

/**
 * UnifiedBatteryHandler v8.3.0 — PHOENIX SOVEREIGN
 *
 * FUSION COMPLÈTE : v8 runtime-adaptive + v5 BatteryManagerV4/V5 courbes non-linéaires
 * + v1.0 BatteryHealthIntelligence (discharge curves, lifecycle, manufacturing date, health scoring)
 *
 * Features fusionnées:
 * - v8: Runtime adaptive (ZCL, Tuya DP, IAS, mains, kinetic) — CONSOMMÉ
 * - v5: BATTERY_SPECS (15+ types, courbes de décharge précises) — AJOUTÉ
 * - v5: calculateFromVoltage() interpolation linéaire + température — AJOUTÉ
 * - v5: BatteryProfileDatabase lookup par manufacturer/productId — AJOUTÉ
 * - v5: DEVICE_BATTERY_MAP (30+ device type → battery type) — AJOUTÉ
 * - v5: Active polling par type d'appareil — AJOUTÉ
 * - v5: Exponential Moving Average smoothing — AJOUTÉ
 * - v5: Health monitoring (drain rate, estimated days) — AJOUTÉ
 * - v5: validateAndCorrectPercentage cross-validation — AJOUTÉ
 * - v1.0: BatteryHealthIntelligence (non-linear curves, lifecycle, mfg date, health score) — AJOUTÉ
 * - v1.0: Flow cards (battery_health_changed, battery_needs_replacement, calibrate) — AJOUTÉ
 * - v1.0: Capabilities (measure_battery_health, cycles, temperature, IR, text_battery_status) — AJOUTÉ
 *
 * ⚠️ RULE: NEVER have both measure_battery + alarm_battery on same device (SDK v3)
 * ⚠️ RULE: Linear formulas like (voltage - 2.5) / 0.5 are STRICTLY BANNED
 * ⚠️ RULE: Use non-linear profiles like '3V_2100' or '1.5V_AA'
 */

// ═══════════════════════════════════════════════════════════════════════════════
// BATTERY DPs (Tuya) — v5.8.69 unified list
// ═══════════════════════════════════════════════════════════════════════════════
const BATTERY_DPS = [4, 10, 14, 15, 21, 100, 101, 102, 104, 105];
const VOLTAGE_DPS = [33, 35, 247];

// v1.0: Battery Health Intelligence integration
let BatteryHealthIntelligence;
try {
  BatteryHealthIntelligence = require('./BatteryHealthIntelligence');
} catch (_e) {
  BatteryHealthIntelligence = null;
}
let BatteryHealthFlowHandler;
try {
  BatteryHealthFlowHandler = require('../flow/BatteryHealthFlowHandler');
} catch (_e) {
  BatteryHealthFlowHandler = null;
}

class UnifiedBatteryHandler {

  // ═════════════════════════════════════════════════════════════════════════════
  // v5 BATTERY_SPECS — 15+ types avec courbes de décharge non-linéaires
  // Basé sur BatteryManagerV4 + BatteryManagerV5 + BatteryProfileDatabase
  // ═════════════════════════════════════════════════════════════════════════════
  static BATTERY_SPECS = {
    // ─── Tuya Generic 3V Lithium (used by 5+ drivers) ─────────────────────
    '3V_2100': {
      type: 'Lithium Coin Cell', chemistry: 'Li-MnO2', cells: 1,
      nominal: 3.0, capacity: 220, fresh: 3.3, full: 3.0, low: 2.5, dead: 2.1,
      selfDischarge: 1, tempCoeff: -0.003,
      curve: [
        { v: 3.30, p: 100 }, { v: 3.10, p: 98 }, { v: 3.00, p: 95 },
        { v: 2.95, p: 90 }, { v: 2.90, p: 85 }, { v: 2.85, p: 75 },
        { v: 2.80, p: 65 }, { v: 2.75, p: 50 }, { v: 2.70, p: 40 },
        { v: 2.60, p: 25 }, { v: 2.50, p: 15 }, { v: 2.40, p: 8 },
        { v: 2.30, p: 4 }, { v: 2.20, p: 2 }, { v: 2.10, p: 0 }
      ]
    },
    '3V_2500': {
      type: 'Lithium Coin Cell', chemistry: 'Li-MnO2', cells: 1,
      nominal: 3.0, capacity: 220, fresh: 3.3, full: 3.0, low: 2.5, dead: 2.5,
      selfDischarge: 1, tempCoeff: -0.003,
      curve: [
        { v: 3.30, p: 100 }, { v: 3.10, p: 98 }, { v: 3.00, p: 95 },
        { v: 2.95, p: 90 }, { v: 2.90, p: 85 }, { v: 2.85, p: 75 },
        { v: 2.80, p: 65 }, { v: 2.75, p: 50 }, { v: 2.70, p: 40 },
        { v: 2.60, p: 25 }, { v: 2.50, p: 15 }, { v: 2.40, p: 8 },
        { v: 2.30, p: 4 }, { v: 2.20, p: 2 }, { v: 2.00, p: 0 }
      ]
    },
    // ─── Lithium Coin Cells (3V nominal) ──────────────────────────────────
    'CR2032': {
      type: 'Lithium Coin Cell', chemistry: 'Li-MnO2', cells: 1,
      nominal: 3.0, capacity: 220, fresh: 3.3, full: 3.0, low: 2.5, dead: 2.0,
      selfDischarge: 1, tempCoeff: -0.003,
      curve: [
        { v: 3.30, p: 100 }, { v: 3.10, p: 98 }, { v: 3.00, p: 95 },
        { v: 2.95, p: 90 }, { v: 2.90, p: 85 }, { v: 2.85, p: 75 },
        { v: 2.80, p: 65 }, { v: 2.75, p: 50 }, { v: 2.70, p: 40 },
        { v: 2.60, p: 25 }, { v: 2.50, p: 15 }, { v: 2.40, p: 8 },
        { v: 2.30, p: 4 }, { v: 2.20, p: 2 }, { v: 2.00, p: 0 }
      ]
    },
    'CR2450': {
      type: 'Lithium Coin Cell', chemistry: 'Li-MnO2', cells: 1,
      nominal: 3.0, capacity: 620, fresh: 3.3, full: 3.0, low: 2.5, dead: 2.0,
      selfDischarge: 1, tempCoeff: -0.003,
      curve: [
        { v: 3.30, p: 100 }, { v: 3.10, p: 98 }, { v: 3.00, p: 95 },
        { v: 2.95, p: 90 }, { v: 2.90, p: 85 }, { v: 2.85, p: 75 },
        { v: 2.80, p: 65 }, { v: 2.75, p: 50 }, { v: 2.70, p: 40 },
        { v: 2.60, p: 25 }, { v: 2.50, p: 15 }, { v: 2.40, p: 8 },
        { v: 2.30, p: 4 }, { v: 2.00, p: 0 }
      ]
    },
    'CR2477': {
      type: 'Lithium Coin Cell', chemistry: 'Li-MnO2', cells: 1,
      nominal: 3.0, capacity: 1000, fresh: 3.3, full: 3.0, low: 2.5, dead: 2.0,
      selfDischarge: 1, tempCoeff: -0.003,
      curve: [
        { v: 3.30, p: 100 }, { v: 3.00, p: 95 }, { v: 2.90, p: 85 },
        { v: 2.80, p: 70 }, { v: 2.70, p: 50 }, { v: 2.60, p: 30 },
        { v: 2.50, p: 15 }, { v: 2.40, p: 8 }, { v: 2.00, p: 0 }
      ]
    },
    'CR123A': {
      type: 'Lithium Photo', chemistry: 'Li-MnO2', cells: 1,
      nominal: 3.0, capacity: 1500, fresh: 3.3, full: 3.0, low: 2.5, dead: 2.0,
      selfDischarge: 1, tempCoeff: -0.003,
      curve: [
        { v: 3.30, p: 100 }, { v: 3.15, p: 95 }, { v: 3.00, p: 90 },
        { v: 2.90, p: 80 }, { v: 2.80, p: 65 }, { v: 2.70, p: 45 },
        { v: 2.60, p: 25 }, { v: 2.50, p: 12 }, { v: 2.40, p: 5 },
        { v: 2.00, p: 0 }
      ]
    },
    'CR1632': {
      type: 'Lithium Coin Cell', chemistry: 'Li-MnO2', cells: 1,
      nominal: 3.0, capacity: 140, fresh: 3.3, full: 3.0, low: 2.5, dead: 2.0,
      selfDischarge: 1, tempCoeff: -0.003,
      curve: [
        { v: 3.30, p: 100 }, { v: 3.00, p: 95 }, { v: 2.90, p: 85 },
        { v: 2.80, p: 70 }, { v: 2.70, p: 50 }, { v: 2.60, p: 30 },
        { v: 2.50, p: 15 }, { v: 2.00, p: 0 }
      ]
    },
    // ─── Alkaline (1.5V nominal per cell) ─────────────────────────────────
    'AAA': {
      type: 'Alkaline', chemistry: 'Zn-MnO2', cells: 1,
      nominal: 1.5, capacity: 1200, fresh: 1.65, full: 1.55, low: 1.1, dead: 0.9,
      selfDischarge: 3, tempCoeff: -0.004,
      curve: [
        { v: 1.65, p: 100 }, { v: 1.55, p: 95 }, { v: 1.50, p: 90 },
        { v: 1.45, p: 80 }, { v: 1.40, p: 70 }, { v: 1.35, p: 60 },
        { v: 1.30, p: 50 }, { v: 1.25, p: 40 }, { v: 1.20, p: 30 },
        { v: 1.15, p: 20 }, { v: 1.10, p: 12 }, { v: 1.05, p: 6 },
        { v: 1.00, p: 3 }, { v: 0.90, p: 0 }
      ]
    },
    'AA': {
      type: 'Alkaline', chemistry: 'Zn-MnO2', cells: 1,
      nominal: 1.5, capacity: 2850, fresh: 1.65, full: 1.55, low: 1.1, dead: 0.9,
      selfDischarge: 3, tempCoeff: -0.004,
      curve: [
        { v: 1.65, p: 100 }, { v: 1.55, p: 95 }, { v: 1.50, p: 90 },
        { v: 1.45, p: 80 }, { v: 1.40, p: 70 }, { v: 1.35, p: 60 },
        { v: 1.30, p: 50 }, { v: 1.25, p: 40 }, { v: 1.20, p: 30 },
        { v: 1.15, p: 20 }, { v: 1.10, p: 12 }, { v: 1.05, p: 6 },
        { v: 1.00, p: 3 }, { v: 0.90, p: 0 }
      ]
    },
    'C': {
      type: 'Alkaline', chemistry: 'Zn-MnO2', cells: 1,
      nominal: 1.5, capacity: 8000, fresh: 1.65, full: 1.55, low: 1.1, dead: 0.9,
      selfDischarge: 3, tempCoeff: -0.004,
      curve: [
        { v: 1.65, p: 100 }, { v: 1.55, p: 95 }, { v: 1.50, p: 88 },
        { v: 1.45, p: 78 }, { v: 1.40, p: 68 }, { v: 1.35, p: 55 },
        { v: 1.30, p: 42 }, { v: 1.25, p: 30 }, { v: 1.20, p: 20 },
        { v: 1.10, p: 8 }, { v: 0.90, p: 0 }
      ]
    },
    'D': {
      type: 'Alkaline', chemistry: 'Zn-MnO2', cells: 1,
      nominal: 1.5, capacity: 17000, fresh: 1.65, full: 1.55, low: 1.1, dead: 0.9,
      selfDischarge: 3, tempCoeff: -0.004,
      curve: [
        { v: 1.65, p: 100 }, { v: 1.55, p: 95 }, { v: 1.50, p: 88 },
        { v: 1.45, p: 78 }, { v: 1.40, p: 68 }, { v: 1.35, p: 55 },
        { v: 1.30, p: 42 }, { v: 1.25, p: 30 }, { v: 1.20, p: 20 },
        { v: 1.10, p: 8 }, { v: 0.90, p: 0 }
      ]
    },
    '9V': {
      type: 'Alkaline', chemistry: 'Zn-MnO2', cells: 6,
      nominal: 9.0, capacity: 565, fresh: 9.6, full: 9.0, low: 7.2, dead: 5.4,
      selfDischarge: 3, tempCoeff: -0.024,
      curve: [
        { v: 9.60, p: 100 }, { v: 9.30, p: 95 }, { v: 9.00, p: 88 },
        { v: 8.70, p: 78 }, { v: 8.40, p: 65 }, { v: 8.10, p: 50 },
        { v: 7.80, p: 35 }, { v: 7.50, p: 22 }, { v: 7.20, p: 12 },
        { v: 6.60, p: 5 }, { v: 5.40, p: 0 }
      ]
    },
    // ─── Multi-Cell (common in Zigbee) ────────────────────────────────────
    '2xAAA': {
      type: 'Alkaline Multi-Cell', chemistry: 'Zn-MnO2', cells: 2,
      nominal: 3.0, capacity: 1200, fresh: 3.30, full: 3.10, low: 2.20, dead: 1.80,
      selfDischarge: 3, tempCoeff: -0.008,
      curve: [
        { v: 3.30, p: 100 }, { v: 3.10, p: 95 }, { v: 3.00, p: 90 },
        { v: 2.90, p: 80 }, { v: 2.80, p: 70 }, { v: 2.70, p: 60 },
        { v: 2.60, p: 50 }, { v: 2.50, p: 40 }, { v: 2.40, p: 30 },
        { v: 2.30, p: 20 }, { v: 2.20, p: 12 }, { v: 2.00, p: 5 },
        { v: 1.80, p: 0 }
      ]
    },
    '2xAA': {
      type: 'Alkaline Multi-Cell', chemistry: 'Zn-MnO2', cells: 2,
      nominal: 3.0, capacity: 2850, fresh: 3.30, full: 3.10, low: 2.20, dead: 1.80,
      selfDischarge: 3, tempCoeff: -0.008,
      curve: [
        { v: 3.30, p: 100 }, { v: 3.10, p: 95 }, { v: 3.00, p: 90 },
        { v: 2.90, p: 80 }, { v: 2.80, p: 70 }, { v: 2.70, p: 60 },
        { v: 2.60, p: 50 }, { v: 2.50, p: 40 }, { v: 2.40, p: 30 },
        { v: 2.30, p: 20 }, { v: 2.20, p: 12 }, { v: 2.00, p: 5 },
        { v: 1.80, p: 0 }
      ]
    },
    '4xAAA': {
      type: 'Alkaline Multi-Cell', chemistry: 'Zn-MnO2', cells: 4,
      nominal: 6.0, capacity: 1200, fresh: 6.60, full: 6.20, low: 4.40, dead: 3.60,
      selfDischarge: 3, tempCoeff: -0.016,
      curve: [
        { v: 6.60, p: 100 }, { v: 6.20, p: 95 }, { v: 6.00, p: 90 },
        { v: 5.80, p: 80 }, { v: 5.60, p: 70 }, { v: 5.40, p: 60 },
        { v: 5.20, p: 50 }, { v: 5.00, p: 40 }, { v: 4.80, p: 30 },
        { v: 4.60, p: 20 }, { v: 4.40, p: 12 }, { v: 4.00, p: 5 },
        { v: 3.60, p: 0 }
      ]
    },
    // ─── Lithium-ion Rechargeable (3.7V nominal) ──────────────────────────
    'Li-ion': {
      type: 'Lithium-ion Rechargeable', chemistry: 'Li-ion', cells: 1,
      nominal: 3.7, capacity: 2600, fresh: 4.20, full: 4.10, low: 3.30, dead: 2.80,
      selfDischarge: 2, tempCoeff: -0.002,
      curve: [
        { v: 4.20, p: 100 }, { v: 4.15, p: 98 }, { v: 4.10, p: 95 },
        { v: 4.00, p: 88 }, { v: 3.90, p: 78 }, { v: 3.80, p: 65 },
        { v: 3.70, p: 50 }, { v: 3.60, p: 35 }, { v: 3.50, p: 22 },
        { v: 3.40, p: 12 }, { v: 3.30, p: 5 }, { v: 3.00, p: 2 },
        { v: 2.80, p: 0 }
      ]
    },
    'Li-polymer': {
      type: 'Lithium-polymer Rechargeable', chemistry: 'Li-po', cells: 1,
      nominal: 3.7, capacity: 1200, fresh: 4.20, full: 4.10, low: 3.30, dead: 3.00,
      selfDischarge: 2, tempCoeff: -0.002,
      curve: [
        { v: 4.20, p: 100 }, { v: 4.15, p: 97 }, { v: 4.10, p: 93 },
        { v: 4.00, p: 85 }, { v: 3.90, p: 73 }, { v: 3.80, p: 58 },
        { v: 3.70, p: 42 }, { v: 3.60, p: 28 }, { v: 3.50, p: 16 },
        { v: 3.40, p: 8 }, { v: 3.30, p: 3 }, { v: 3.00, p: 0 }
      ]
    },
    '18650': {
      type: 'Lithium-ion 18650', chemistry: 'Li-ion', cells: 1,
      nominal: 3.7, capacity: 3400, fresh: 4.20, full: 4.10, low: 3.30, dead: 2.50,
      selfDischarge: 2, tempCoeff: -0.002,
      curve: [
        { v: 4.20, p: 100 }, { v: 4.10, p: 95 }, { v: 4.00, p: 88 },
        { v: 3.90, p: 78 }, { v: 3.80, p: 65 }, { v: 3.70, p: 50 },
        { v: 3.60, p: 35 }, { v: 3.50, p: 22 }, { v: 3.40, p: 12 },
        { v: 3.30, p: 5 }, { v: 3.00, p: 2 }, { v: 2.50, p: 0 }
      ]
    }
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // v5 DEVICE → BATTERY TYPE MAPPING (30+ device types)
  // ═════════════════════════════════════════════════════════════════════════════
  static DEVICE_BATTERY_MAP = {
    'button': 'CR2032', 'remote': 'CR2032', 'scene_switch': 'CR2032', 'smart_knob': 'CR2032',
    'motion': 'CR2450', 'pir': 'CR2450', 'radar': 'Li-ion', 'presence': 'Li-ion',
    'climate': '2xAAA', 'temperature': 'CR2032', 'humidity': 'CR2032',
    'soil': '2xAAA', 'air_quality': 'Li-ion',
    'contact': 'CR2032', 'door': 'CR2032', 'window': 'CR1632',
    'vibration': 'CR2032', 'water': 'CR2032', 'leak': 'CR2032',
    'smoke': 'CR123A', 'gas': 'Li-ion',
    'trv': '2xAA', 'thermostat': '2xAA', 'lock': '4xAAA', 'siren': '2xAA', 'sos': 'CR2032'
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // v5 Polling intervals per device type (seconds)
  // ═════════════════════════════════════════════════════════════════════════════
  static INTERVALS = {
    button: 43200, remote: 43200, sensor_motion: 14400,
    sensor_climate: 7200, sensor_contact: 21600, sensor_water: 14400,
    sensor_soil: 3600, trv: 7200, thermostat: 7200,
    lock: 10800, siren: 21600, default: 14400
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // v5.5.42 BatteryProfileDatabase intégrée — lookup manufacturer/productId
  // ═════════════════════════════════════════════════════════════════════════════
  static BATTERY_PROFILES = {
    '_TZE284_oitavov2':    { chemistry: 'CR2032', source: 'tuya_dp', dpId: 15, algorithm: 'direct', notes: 'QT-07S Soil sensor' },
    '_TZE284_aao3yzhs':   { chemistry: 'CR2032', source: 'tuya_dp', dpId: 15, algorithm: 'direct', notes: 'Soil variant' },
    '_TZE200_myd45weu':   { chemistry: 'CR2450', source: 'tuya_dp', dpId: 15, algorithm: 'direct', notes: 'Soil _TZE200' },
    '_TZE284_vvmbj46n':   { chemistry: 'CR2032', source: 'tuya_dp', dpId: 4, algorithm: 'multiply_2', notes: 'TH05Z LCD Climate' },
    '_TZE200_vvmbj46n':   { chemistry: 'CR2032', source: 'tuya_dp', dpId: 4, algorithm: 'multiply_2', notes: 'ONENUO TH05Z' },
    '_TZE200_bjawzodf':   { chemistry: 'CR2032', source: 'tuya_dp', dpId: 4, algorithm: 'multiply_2', notes: 'Climate standard' },
    '_TZE200_a8sdabtg':   { chemistry: 'CR2032', source: 'tuya_dp', dpId: 4, algorithm: 'direct', notes: 'Climate direct' },
    '_TZ3000_0dumfk2z':   { chemistry: 'CR2032', source: 'tuya_dp', dpId: 101, algorithm: 'direct', skipZcl: true, notes: 'SOS button' },
    '_TZ3000_fdr5rqsn':   { chemistry: 'CR2032', source: 'tuya_dp', dpId: 101, algorithm: 'direct', skipZcl: true, notes: 'SOS variant' },
    '_TZ3000_mcxw5ehu':   { chemistry: 'AAA', source: 'zcl', algorithm: 'alkaline_curve', notes: 'PIR 2xAAA' },
    '_TZ3000_kmh5qpmb':   { chemistry: 'CR123A', source: 'zcl', algorithm: 'lithium_flat', notes: 'PIR CR123A' },
    '_TZ3000_26fmupbb':   { chemistry: 'CR2032', source: 'zcl', algorithm: 'cr2032_curve', notes: 'Contact sensor' },
    '_TZ3000_decxrtwa':   { chemistry: 'CR2032', source: 'zcl', algorithm: 'cr2032_curve', notes: 'Contact sensor' },
    '_TZ3000_fxwsnmhb':   { chemistry: 'CR2032', source: 'zcl', algorithm: 'cr2032_curve', notes: 'Water leak' },
    '_TZ3400_keyjqthh':   { chemistry: 'CR2032', source: 'zcl', algorithm: 'cr2032_curve', notes: '1-button scene' },
    '_TZ3000_bi6lpsew':   { chemistry: 'CR2032', source: 'zcl', algorithm: 'cr2032_curve', notes: 'Scene switch' },
    '_TZE200_rhgsbacq':   { chemistry: 'USB', source: 'none', algorithm: null, notes: 'mmWave radar USB' },
    '_TZE204_sxm7l9xa':   { chemistry: 'USB', source: 'none', algorithm: null, notes: '24GHz radar USB' },
    '_TZ3000_h1ipgkwn':   { chemistry: 'MAINS', source: 'none', algorithm: null, notes: '2-gang switch mains' },
    'LELLKI':             { chemistry: 'MAINS', source: 'none', algorithm: null, notes: 'USB outlet mains' }
  };

  /**
   * v5: Lookup battery profile par manufacturerName + productId
   */
  static lookupBatteryProfile(manufacturerName, productId) {
    if (manufacturerName && UnifiedBatteryHandler.BATTERY_PROFILES[manufacturerName]) {
      return { source: 'manufacturer', ...UnifiedBatteryHandler.BATTERY_PROFILES[manufacturerName] };
    }
    // Fallback par productId pattern
    if (productId) {
      const pid = String(productId).toUpperCase();
      const defaults = {
        'TS0601': { chemistry: 'CR2032', source: 'tuya_dp', dpId: 4, algorithm: 'direct' },
        'TS0001': { chemistry: 'MAINS', source: 'none', algorithm: null },
        'TS0002': { chemistry: 'MAINS', source: 'none', algorithm: null },
        'TS0003': { chemistry: 'MAINS', source: 'none', algorithm: null },
        'TS0004': { chemistry: 'MAINS', source: 'none', algorithm: null },
        'TS011F': { chemistry: 'MAINS', source: 'none', algorithm: null },
        'TS0201': { chemistry: 'CR2032', source: 'zcl', algorithm: 'cr2032_curve' },
        'TS0202': { chemistry: 'AAA', source: 'zcl', algorithm: 'alkaline_curve' },
        'TS0203': { chemistry: 'CR2032', source: 'zcl', algorithm: 'cr2032_curve' },
        'TS0041': { chemistry: 'CR2032', source: 'zcl', algorithm: 'cr2032_curve' },
        'TS0042': { chemistry: 'CR2032', source: 'zcl', algorithm: 'cr2032_curve' },
        'TS0043': { chemistry: 'CR2032', source: 'zcl', algorithm: 'cr2032_curve' },
        'TS0044': { chemistry: 'CR2032', source: 'zcl', algorithm: 'cr2032_curve' },
        'TS0215A': { chemistry: 'CR2032', source: 'tuya_dp', dpId: 101, algorithm: 'direct' }
      };
      for (const [pattern, profile] of Object.entries(defaults)) {
        if (pid.startsWith(pattern)) return { source: 'productId', ...profile };
      }
    }
    return null;
  }

  /**
   * v5: Calculate percentage from voltage — interpolation sur courbes + température
   * @param {number} voltage - Tension en volts
   * @param {string} batteryType - Type de batterie (CR2032, AA, Li-ion, etc.)
   * @param {number} temperature - Température ambiante en °C (défaut 20)
   * @returns {number} Pourcentage 0-100
   */
  static calculateFromVoltage(voltage, batteryType = 'CR2032', temperature = 20) {
    const specs = UnifiedBatteryHandler.BATTERY_SPECS[batteryType];
    if (!specs) {
      // Fallback sécurisé CR2032
      return UnifiedBatteryHandler.calculateFromVoltage(voltage, 'CR2032', temperature);
    }

    // Compensation température (les batteries perform moins bien dans le froid)
    let compensatedVoltage = voltage;
    if (temperature < 20 && specs.tempCoeff) {
      const tempDiff = 20 - temperature;
      compensatedVoltage = voltage - (specs.tempCoeff * tempDiff);
    }

    // Bornes
    if (compensatedVoltage >= specs.fresh) return 100;
    if (compensatedVoltage <= specs.dead) return 0;

    // Interpolation linéaire sur la courbe
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
   * v5: Convertir Tuya DP value en pourcentage selon l'algorithme du profil
   */
  static calculateFromTuyaDP(dpValue, algorithm = 'direct') {
    if (dpValue === null || dpValue === undefined || isNaN(dpValue)) return null;
    switch (algorithm) {
      case 'multiply_2': return Math.round(Math.max(0, Math.min(100, dpValue * 2)));
      case 'divide_2': return Math.round(Math.max(0, Math.min(100, dpValue / 2)));
      case 'direct':
      default: return Math.round(Math.max(0, Math.min(100, dpValue)));
    }
  }

  static normalizeZigbeeValue(rawValue, options = {}) {
    if (rawValue === null || rawValue === undefined || isNaN(rawValue)) return null;
    const treat200AsSentinel = options.treat200AsSentinel || false;

    // v9.0.86: Smart Heuristic for Voltage sent as Percentage (Z2M/ZHA quirk)
    // If a sensor sends 3000 (meaning 3000mV) in the percentage attribute
    if (rawValue > 200 && rawValue < 4000) {
        const voltage = rawValue > 1000 ? rawValue / 1000 : rawValue / 10;
        return UnifiedBatteryHandler.calculateFromVoltage(voltage, options.batteryType || 'CR2032');
    }

    // v9.0.85: Filter ZCL sentinels (Z2M #11470)
    if (rawValue === 255 || rawValue === 0xFFFF) return null;  // 255/65535 = unknown/invalid
    if (rawValue === 200) {
        if (treat200AsSentinel) return null; // 200 = "not available" sentinel
        return 100; // ZCL standard 200 = 100%
    }
    if (rawValue > 100 && rawValue < 200) return Math.round(rawValue / 2);  // ZCL 0-200 scale → 0-100%
    if (rawValue >= 0 && rawValue <= 100) return Math.round(rawValue);       // Already 0-100% — return as-is
    
    // Out of range — clamp to 0-100
    return Math.round(Math.max(0, Math.min(100, rawValue)));
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // CONSTRUCTEUR
  // ═════════════════════════════════════════════════════════════════════════════

  constructor(device) {
    this.device = device;
    this.homey = device?.homey || globalThis;
    this.source = null;       // 'zcl' | 'tuya' | 'unknown'
    this.lastValue = null;
    this.lastVoltage = null;
    this.initialized = false;
    this._destroyed = false;

    // v5: Battery type auto-détecté
    this.batteryType = null;

    // v5: Temperature ambiante (pour compensation)
    this.temperature = 20;

    // v5: Smoothing (EMA)
    this.smoothingFactor = 0.3;
    this.lastSmoothedValue = null;

    // v5: Health monitoring
    this.health = {
      drainRate: null,
      estimatedDays: null,
      lastUpdate: null,
      history: []
    };

    // v5: Polling
    this._pollingInterval = null;

    // v5: Anti-flood
    this._lastBattUpdate = 0;

    // v5: Profile cache
    this._profile = null;

    // v5: Store battery sur arrêt
    this._storeInterval = null;

    // v1.0: Battery Health Intelligence
    this.batteryHealthIntelligence = null;

    // v1.0: Previous health status for flow card triggers
    this._previousHealthStatusCode = null;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // INITIALIZATION (v8 runtime-adaptive + v5 enrichi)
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Initialize battery handling — fusion v8 runtime-adaptive + v5 enrichi
   */
  async initialize(zclNode) {
    if (this.initialized) {return;}

    this.device.log('[BATTERY-UNIFIED] 🔋 Initializing Phoenix Sovereign v8.3.0...');

    // v5: Detect battery type from device driver
    this.batteryType = this._detectBatteryType();
    this.device.log(`[BATTERY-UNIFIED] 📊 Battery type: ${this.batteryType}`);

    // v5: Lookup profile from BatteryProfileDatabase
    const settings = this.device.getSettings?.() || {};
    const mfr = settings.zb_manufacturer_name || '';
    const modelId = settings.zb_model_id || '';
    this._profile = UnifiedBatteryHandler.lookupBatteryProfile(mfr, modelId);
    if (this._profile) {
      this.device.log(`[BATTERY-UNIFIED] 📋 Profile found: ${this._profile.notes || 'generic'} (${this._profile.source})`);
    }

    // v1.0: Initialize Battery Health Intelligence
    await this._initBatteryHealthIntelligence();

    // v8: Detect ALL available energy sources
    const hasZclBattery = this._hasZclBatteryCluster(zclNode);
    const isTuyaDP = this._isTuyaDPDevice();
    const hasIasZone = this._hasIasZoneCluster(zclNode);
    const isMains = this.device.mainsPowered === true || this._profile?.chemistry === 'MAINS' || this._profile?.chemistry === 'USB';
    const isKinetic = this._isKineticDevice();

    this.device.log(`[BATTERY-UNIFIED] Detection: ZCL=${hasZclBattery} TuyaDP=${isTuyaDP} IAS=${hasIasZone} Mains=${isMains} Kinetic=${isKinetic}`);

    // v8: Runtime capability adaptation
    await this._adaptBatteryCapabilities(hasZclBattery, isTuyaDP, hasIasZone, isMains, isKinetic);

    // Restore stored battery value
    await this._restoreStoredBattery();

    // Setup sources
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

    // v5: Start active polling
    this._startPolling();

    // v5: Periodic store saver (every 5 min)
    this._storeInterval = this._setInterval(() => {
      if (this._destroyed) return;
      if (this.lastValue !== null) {
        this.device.setStoreValue?.('last_battery_percentage', this.lastValue).catch(() => {});
      }
      if (this.lastVoltage !== null) {
        this.device.setStoreValue?.('battery_voltage', this.lastVoltage).catch(() => {});
      }
    }, 300000);

    this.initialized = true;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // v5: BATTERY TYPE DETECTION
  // ═════════════════════════════════════════════════════════════════════════════

  _detectBatteryType() {
    const settings = this.device.getSettings?.() || {};
    const driverId = (this.device.driver?.id || '').toLowerCase();

    // 1. User setting override
    if (settings.battery_type && settings.battery_type !== 'auto') {
      return settings.battery_type;
    }

    // 2. Profile lookup first
    const mfr = settings.zb_manufacturer_name || '';
    const modelId = settings.zb_model_id || '';
    const profile = UnifiedBatteryHandler.lookupBatteryProfile(mfr, modelId);
    if (profile?.chemistry && !['MAINS', 'USB', 'NONE'].includes(profile.chemistry)) {
      return profile.chemistry;
    }

    // 3. Driver-based detection (DEVICE_BATTERY_MAP)
    for (const [keyword, batteryType] of Object.entries(UnifiedBatteryHandler.DEVICE_BATTERY_MAP)) {
      if (driverId.includes(keyword)) {
        return batteryType;
      }
    }

    // 4. Voltage-based fallback
    if (this.lastVoltage) {
      if (this.lastVoltage > 3.8) return 'Li-ion';
      if (this.lastVoltage > 3.2) return 'CR2032';
      if (this.lastVoltage > 2.8 && this.lastVoltage < 3.2) return '2xAAA';
      if (this.lastVoltage > 1.3 && this.lastVoltage < 1.7) return 'AAA';
    }

    return 'CR2032'; // Safe default
  }

  /**
   * v5: Detect device type for polling interval
   */
  _detectDeviceType() {
    const driverId = (this.device.driver?.id || '').toLowerCase();
    for (const keyword of Object.keys(UnifiedBatteryHandler.INTERVALS)) {
      if (driverId.includes(keyword.replace('sensor_', ''))) {
        return keyword;
      }
    }
    return 'default';
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // v8: Runtime capability adaptation (conservé)
  // ═════════════════════════════════════════════════════════════════════════════

  async _adaptBatteryCapabilities(hasZcl, hasTuya, hasIas, isMains, isKinetic) {
    try {
      const hasMeasure = this.device.hasCapability?.('measure_battery');
      const hasAlarm = this.device.hasCapability?.('alarm_battery');

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

      if (hasZcl || hasTuya) {
        if (!hasMeasure) {
          await this.device.addCapability('measure_battery').catch(() => {});
          this.device.log('[BATTERY-UNIFIED] ➕ Added measure_battery');
        }
        if (hasAlarm) {
          await this.device.removeCapability('alarm_battery').catch(() => {});
          this.device.log('[BATTERY-UNIFIED] ➖ Removed alarm_battery (SDK v3)');
        }
        return;
      }

      if (hasIas && !hasZcl && !hasTuya) {
        if (!hasAlarm) {
          await this.device.addCapability('alarm_battery').catch(() => {});
          this.device.log('[BATTERY-UNIFIED] ➕ Added alarm_battery (IAS only)');
        }
        if (hasMeasure) {
          await this.device.removeCapability('measure_battery').catch(() => {});
          this.device.log('[BATTERY-UNIFIED] ➖ Removed measure_battery (SDK v3)');
        }
        return;
      }
    } catch (err) {
      this.device.log('[BATTERY-UNIFIED] Capability adaptation error:', err.message);
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // v5: Restore stored battery
  // ═════════════════════════════════════════════════════════════════════════════

  async _restoreStoredBattery() {
    try {
      const stored = await this.device.getStoreValue?.('last_battery_percentage');
      const storedVoltage = await this.device.getStoreValue?.('battery_voltage');
      if (stored !== null && stored !== undefined && typeof stored === 'number') {
        const current = this.device.getCapabilityValue?.('measure_battery');
        if (current === null || current === undefined) {
          this.device.log(`[BATTERY-UNIFIED] 🔄 Restored stored battery: ${stored}%`);
          this.lastValue = stored;
          if (this.device.hasCapability?.('measure_battery')) {
            await this.device.setCapabilityValue('measure_battery', stored).catch(() => {});
          }
        }
      }
      if (storedVoltage !== null && storedVoltage !== undefined) {
        this.lastVoltage = storedVoltage;
      }
    } catch { /* ignore */ }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // v5: Active polling
  // ═════════════════════════════════════════════════════════════════════════════

  _startPolling() {
    const deviceType = this._detectDeviceType();
    const intervalMs = (UnifiedBatteryHandler.INTERVALS[deviceType] || UnifiedBatteryHandler.INTERVALS.default) * 1000;
    this.device.log(`[BATTERY-UNIFIED] ⏱️ Polling interval: ${intervalMs / 3600000}h (type: ${deviceType})`);

    if (this._pollingInterval) {
      clearInterval(this._pollingInterval);
    }

    this._pollingInterval = this._setInterval(() => {
      if (this._destroyed) return;
      this._poll().catch(e => this.device.log('[BATTERY] Poll error:', e.message));
    }, intervalMs);
  }

  _setInterval(fn, ms) {
    const scheduler = this.homey && typeof this.homey.setInterval === 'function'
      ? this.homey
      : globalThis;
    return scheduler.setInterval(fn, ms);
  }

  _clearInterval(timer) {
    const scheduler = this.homey && typeof this.homey.clearInterval === 'function'
      ? this.homey
      : globalThis;
    return scheduler.clearInterval(timer);
  }

  async _poll() {
    try {
      if (this.source?.includes('zcl')) {
        const ep = this._findEndpointByCluster(['powerConfiguration', 'genPowerCfg', 0x0001, '0x0001', 1], this.device.zclNode);
        const cluster = ep?.clusters?.powerConfiguration || ep?.clusters?.genPowerCfg || ep?.clusters?.[1];
        if (cluster) {
          const attrs = await cluster.readAttributes(['batteryPercentageRemaining', 'batteryVoltage']).catch(() => ({}));
          if (attrs.batteryPercentageRemaining !== undefined) {
            const percent = UnifiedBatteryHandler.normalizeZigbeeValue(attrs.batteryPercentageRemaining);
            if (percent !== null) this._updateBattery(percent);
          }
          if (attrs.batteryVoltage !== undefined) {
            this._updateVoltage(attrs.batteryVoltage / 10);
          }
        }
      }
      if (this.source?.includes('tuya') && this.device.tuyaEF00Manager) {
        await this.device.tuyaEF00Manager.requestDP(4).catch(() => {});
      }
    } catch { /* silent (sleeping device) */ }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // v8: Find endpoint by cluster (conservé)
  // ═════════════════════════════════════════════════════════════════════════════

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

  // ═════════════════════════════════════════════════════════════════════════════
  // v8: Detection helpers (conservés)
  // ═════════════════════════════════════════════════════════════════════════════

  _hasIasZoneCluster(zclNode) {
    try {
      const ep = this._findEndpointByCluster(['iasZone', 'ssIasZone', 0x0500, '0x0500'], zclNode);
      if (!ep?.clusters) {return false;}
      return !!(ep.clusters.iasZone || ep.clusters.ssIasZone || ep.clusters[0x0500] || ep.clusters['0x0500']);
    } catch { return false; }
  }

  _isKineticDevice() {
    try {
      const settings = this.device.getSettings?.() || {};
      const modelId = (settings.zb_model_id || '').toUpperCase();
      const energy = this.device.getEnergy?.();
      if (energy?.batteries?.length > 0) {return false;}
      const driverId = (this.device.driver?.id || '').toLowerCase();
      if (driverId.includes('battery') || driverId.includes('button_wireless') || driverId.includes('remote')) {return false;}
      const hasBatteryCaps = this.device.hasCapability?.('measure_battery') || this.device.hasCapability?.('alarm_battery');
      if (hasBatteryCaps) {return false;}
      const kineticModels = ['TS0044', 'TS0046'];
      return kineticModels.includes(modelId);
    } catch { return false; }
  }

  _hasZclBatteryCluster(zclNode) {
    try {
      const ep = this._findEndpointByCluster(['powerConfiguration', 'genPowerCfg', 0x0001, '0x0001', 1], zclNode);
      if (!ep?.clusters) {return false;}
      return !!(ep.clusters.powerConfiguration || ep.clusters.genPowerCfg || ep.clusters[0x0001] || ep.clusters['0x0001'] || ep.clusters[1]);
    } catch { return false; }
  }

  _isTuyaDPDevice() {
    try {
      const settings = this.device.getSettings?.() || {};
      const store = this.device.getStore?.() || {};
      const modelId = settings.zb_model_id || settings.zb_modelId || store.modelId || '';
      const mfr = settings.zb_manufacturer_name || settings.zb_manufacturerName || store.manufacturerName || '';
      return modelId.toUpperCase() === 'TS0601' || mfr.toUpperCase().startsWith('_TZE');
    } catch { return false; }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // v8: ZCL battery setup (conservé + v5 normalize)
  // ═════════════════════════════════════════════════════════════════════════════

  async _setupZclBattery(zclNode) {
    try {
      const ep = this._findEndpointByCluster(['powerConfiguration', 'genPowerCfg', 0x0001, '0x0001', 1], zclNode);
      const cluster = ep?.clusters?.powerConfiguration || ep?.clusters?.genPowerCfg || ep?.clusters?.[1];
      if (!cluster) {
        this.device.log('[BATTERY-UNIFIED] ⚠️ ZCL battery cluster missing');
        return;
      }

      try {
        const attrs = await cluster.readAttributes(['batteryPercentageRemaining', 'batteryVoltage']);
        if (attrs.batteryPercentageRemaining !== undefined) {
          const percent = UnifiedBatteryHandler.normalizeZigbeeValue(attrs.batteryPercentageRemaining);
          if (percent !== null) {
            this._updateBattery(percent);
          }
        }
        if (attrs.batteryVoltage !== undefined) {
          this._updateVoltage(attrs.batteryVoltage / 10);
        }
      } catch { /* normal for sleeping */ }

      cluster.on('attr.batteryPercentageRemaining', (value) => {
        const percent = UnifiedBatteryHandler.normalizeZigbeeValue(value);
        if (percent !== null) {
          this._updateBattery(percent);
        }
      });

      cluster.on('attr.batteryVoltage', (value) => {
        this._updateVoltage(value / 10);
      });

      try {
        await cluster.configureReporting({
          batteryPercentageRemaining: { minInterval: 3600, maxInterval: 43200, minChange: 2 }
        });
      } catch { /* normal for sleepy */ }

      this.device.log('[BATTERY-UNIFIED] ✅ ZCL battery configured');
    } catch (err) {
      this.device.error('[BATTERY-UNIFIED] ZCL setup failed:', err.message);
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // v8: Tuya DP battery setup (conservé + v5 profile-aware)
  // ═════════════════════════════════════════════════════════════════════════════

  _setupTuyaBattery() {
    let attempts = 0;
    const bindManager = () => {
      const ef00Manager = this.device.tuyaEF00Manager;
      if (ef00Manager) {
        BATTERY_DPS.forEach(dp => {
          ef00Manager.on(`dp-${dp}`, (value) => this._handleTuyaBatteryDP(dp, value));
        });
        VOLTAGE_DPS.forEach(dp => {
          ef00Manager.on(`dp-${dp}`, (value) => this._handleTuyaVoltageDP(dp, value));
        });
        this.device.log('[BATTERY-UNIFIED] ✅ Tuya DP listeners registered');
        return true;
      }
      return false;
    };

    if (!bindManager()) {
      const checkInterval = this._setInterval(() => { if (this._destroyed) return; attempts++;
        if (bindManager()) {
          this._clearInterval(checkInterval);
        } else if (attempts > 30) {
          this._clearInterval(checkInterval);
          this.device.log('[BATTERY-UNIFIED] ⚠️ Tuya DP battery listeners NOT registered (no EF00 manager found)');
        } }, 500);
    }

    (this.device.homey?.setTimeout ?? setTimeout)(() => {
      if (this.lastValue === null) { this._setDefaultBattery(); }
    }, 5000);
  }

  _handleTuyaBatteryDP(dp, value) {
    // v9.1.0: Use normalization to handle inconsistent reporting patterns
    let percent = this._normalizeBatteryValue(value, dp);

    // Validate the normalized value
    if (!this._validateBatteryValue(percent, this.lastValue)) {
      this.device.log(`[BATTERY-UNIFIED] ⚠️ Tuya DP${dp}: Rejected invalid value ${value} -> ${percent}`);
      return;
    }

    this.device.log(`[BATTERY-UNIFIED] 🔶 Tuya DP${dp}: ${percent}%`);
    this._updateBattery(percent);
  }

  _handleTuyaVoltageDP(dp, value) {
    let voltage = value;
    if (dp === 247) { voltage = value / 1000; }
    else if (value > 100) { voltage = value / 100; }
    else if (value > 10) { voltage = value / 10; }

    if (voltage > 0 && voltage < 20) {
      this.device.log(`[BATTERY-UNIFIED] 🔶 Tuya voltage DP${dp}: ${voltage}V`);
      this._updateVoltage(voltage);
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // v8: IAS Zone battery (conservé)
  // ═════════════════════════════════════════════════════════════════════════════

  _setupIasZoneBattery(zclNode) {
    try {
      const ep = this._findEndpointByCluster(['iasZone', 'ssIasZone', 0x0500, '0x0500'], zclNode);
      const cluster = ep?.clusters?.iasZone || ep?.clusters?.ssIasZone || ep?.clusters[0x0500] || ep?.clusters['0x0500'];
      if (!cluster) {
        this.device.log('[BATTERY-UNIFIED] ⚠️ IAS Zone cluster missing');
        return;
      }

      cluster.on('attr.zoneStatus', (status) => {
        this._updateBatteryAlarm((status & 0x08) !== 0);
      });

      this.device.log('[BATTERY-UNIFIED] ✅ IAS Zone battery listener configured');
    } catch (err) {
      this.device.log('[BATTERY-UNIFIED] IAS Zone setup error:', err.message);
    }
  }

  _updateBatteryAlarm(isLow) {
    if (this.device.hasCapability?.('alarm_battery')) {
      this.device.setCapabilityValue('alarm_battery', isLow).catch(() => {});
      this.device.log(`[BATTERY-UNIFIED] 🔋 Battery alarm: ${isLow ? 'LOW' : 'OK'}`);
    }
    if (isLow && this.device.hasCapability?.('measure_battery') && this.lastValue === null) {
      this._updateBattery(5);
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // v8: Default battery restore (conservé)
  // ═════════════════════════════════════════════════════════════════════════════

  _setDefaultBattery() {
    if (this.device.hasCapability?.('measure_battery')) {
      const current = this.device.getCapabilityValue?.('measure_battery');
      if (current === null || current === undefined) {
        const stored = this.device.getStoreValue?.('last_battery_percentage');
        if (stored !== null && stored !== undefined && typeof stored === 'number') {
          this.device.log(`[BATTERY-UNIFIED] 🔄 Restored stored battery: ${stored}%`);
          this._updateBattery(stored, true);
        }
      }
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // v8: _updateBattery + v5: Smoothing (EMA), Health, Anti-flood
  // ═════════════════════════════════════════════════════════════════════════════

  _updateBattery(percent, force = false) {
    const prev = this.device.getCapabilityValue?.('measure_battery');

    // Anti-flood & Anti-fluctuation (v8 & v9.0.86)
    if (!force) {
      if (prev === percent) {return;}
      const now = Date.now();
      const elapsed = now - this._lastBattUpdate;
      const change = prev !== null ? Math.abs(percent - prev) : 100;
      
      // Reject sudden >50% drops/spikes unless value is 0 (dead battery)
      if (prev !== null && change > 50 && percent > 0 && elapsed < 86400000) {
        this.device.log(`[BATTERY-UNIFIED] ⚠️ Rejected abnormal battery fluctuation: ${prev}% -> ${percent}%`);
        return;
      }
      
      if (elapsed < 300000 && change < 2) {return;}
      this._lastBattUpdate = now;
    }

    // v5: Exponential Moving Average smoothing
    const smoothed = this._applySmoothing(percent, force);

    this.lastValue = smoothed;

    // v5: Update health monitoring
    this._updateHealth(smoothed);

    if (this.device.hasCapability?.('measure_battery')) {
      this.device.setCapabilityValue('measure_battery', parseFloat(smoothed)).catch(err => {
        this.device.error('[BATTERY-UNIFIED] Failed to set battery:', err.message);
      });
    }

    // v5: Store periodically (defensive)
    this.device.setStoreValue?.('last_battery_percentage', Math.round(smoothed)).catch(() => {});

    // v1.0: Feed to Battery Health Intelligence
    this._updateBatteryHealthIntelligence(smoothed);

    this.device.emit?.('battery_update', smoothed);
  }

  /**
   * v5: Exponential Moving Average smoothing
   * Permet les sauts > 20% (remplacement de batterie), sinon lisse à max 5%/step
   */
  _applySmoothing(newPercentage, force = false) {
    if (force || this.lastSmoothedValue === null) {
      this.lastSmoothedValue = newPercentage;
      return newPercentage;
    }

    // Large jump > 20% = battery replacement, accept immediately
    if (newPercentage > this.lastSmoothedValue + 20) {
      this.device.log(`[BATTERY-UNIFIED] 🔄 Battery replacement detected: ${this.lastSmoothedValue}% → ${newPercentage}%`);
      this.lastSmoothedValue = newPercentage;
      return newPercentage;
    }

    // EMA smoothing
    const smoothed = this.lastSmoothedValue +
      this.smoothingFactor * (newPercentage - this.lastSmoothedValue);
    const result = Math.round(smoothed);

    // Limit max jump to 5% (prevent spikes)
    const maxJump = 5;
    if (Math.abs(result - this.lastSmoothedValue) > maxJump) {
      const direction = result > this.lastSmoothedValue ? 1 : -1;
      this.lastSmoothedValue = this.lastSmoothedValue + (direction * maxJump);
      return this.lastSmoothedValue;
    }

    this.lastSmoothedValue = result;
    return result;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // v5: Health monitoring
  // ═════════════════════════════════════════════════════════════════════════════

  _updateHealth(percentage) {
    const now = Date.now();
    this.health.history.push({ time: now, percentage });
    if (this.health.history.length > 30) { this.health.history.shift(); }

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

  // ═════════════════════════════════════════════════════════════════════════════
  // v8: _updateVoltage (conservé)
  // ═════════════════════════════════════════════════════════════════════════════

  _updateVoltage(voltage) {
    this.lastVoltage = voltage;
    this.device.setStoreValue?.('battery_voltage', voltage).catch(() => {});

    if (this.device.hasCapability?.('measure_voltage')) {
      this.device.setCapabilityValue('measure_voltage', parseFloat(voltage)).catch(() => {});
    }

    // v1.0: Feed voltage to health intelligence for voltage-level analysis
    this._updateVoltageHealthIntelligence(voltage);

    // Calculate percentage from voltage if no direct %
    if (this.lastValue === null && voltage > 0) {
      const percent = UnifiedBatteryHandler.calculateFromVoltage(voltage, this.batteryType, this.temperature);
      if (percent !== null) {
        this._updateBattery(percent);
      }
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // v8: checkMainsPowered (conservé + v5 profile-aware)
  // ═════════════════════════════════════════════════════════════════════════════

  async checkMainsPowered() {
    const zclNode = this.device.zclNode;
    const driverId = (this.device.driver?.id || '').toLowerCase();

    // Priority 1: Explicit mains flag
    if (this.device.mainsPowered === true) {
      this.device.log('[BATTERY-UNIFIED] ⚡ Explicit mainsPowered=true');
      await this._removeBatteryCaps();
      return true;
    }

    // Priority 1b: v5 Profile says MAINS or USB
    if (this._profile && (this._profile.chemistry === 'MAINS' || this._profile.chemistry === 'USB')) {
      this.device.log(`[BATTERY-UNIFIED] ⚡ Profile says ${this._profile.chemistry}`);
      await this._removeBatteryCaps();
      return true;
    }

    // Priority 2: Known mains drivers
    const mainsDrivers = [
      'switch_', 'socket', 'plug', 'bulb_', 'dimmer', 'device_din_rail',
      'ceiling_fan', 'air_purifier', 'air_quality', 'curtain_motor',
      'switch_usb_dongle', 'device_floor_heating', 'device_radiator_valve'
    ];
    if (mainsDrivers.some(id => driverId.startsWith(id) || driverId.includes(id))) {
      const hasBatteryCaps = this.device.hasCapability?.('measure_battery') || this.device.hasCapability?.('alarm_battery');
      if (!hasBatteryCaps) {
        this.device.log('[BATTERY-UNIFIED] ⚡ Mains-powered driver:', driverId);
        return true;
      }
      this.device.log('[BATTERY-UNIFIED] ⚡ Mains driver with battery backup:', driverId);
      return false;
    }

    // Priority 3: Energy config
    try {
      const energy = this.device.getEnergy?.();
      if (energy?.batteries?.length === 0 && this.device.powerType === 'MAINS') {
        await this._removeBatteryCaps();
        return true;
      }
    } catch { /* optional */ }

    // Priority 4: Temperature sensor in plug/socket
    if (driverId.includes('plug') || driverId.includes('socket')) {
      const hasTemp = this.device.hasCapability?.('measure_temperature');
      const hasBattery = this.device.hasCapability?.('measure_battery') || this.device.hasCapability?.('alarm_battery');
      if (hasTemp && !hasBattery) {return true;}
    }

    return false;
  }

  async _removeBatteryCaps() {
    if (this.device.hasCapability?.('measure_battery')) {
      await this.device.removeCapability('measure_battery').catch(() => {});
    }
    if (this.device.hasCapability?.('alarm_battery')) {
      await this.device.removeCapability('alarm_battery').catch(() => {});
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // v5: GETTERS enrichis
  // ═════════════════════════════════════════════════════════════════════════════

  getValue() { return this.lastValue; }
  getVoltage() { return this.lastVoltage; }
  getSource() { return this.source; }
  getBatteryType() { return this.batteryType; }

  /**
   * v5: Status text
   */
  getStatus() {
    if (this.lastValue === null) return 'unknown';
    if (this.lastValue > 80) return 'good';
    if (this.lastValue > 50) return 'medium';
    if (this.lastValue > 20) return 'low';
    if (this.lastValue > 10) return 'critical';
    return 'dead';
  }

  /**
   * v5: Health report complet
   */
  getHealthReport() {
    return {
      current: this.lastValue,
      voltage: this.lastVoltage,
      batteryType: this.batteryType,
      status: this.getStatus(),
      source: this.source,
      smoothing: { enabled: true, factor: this.smoothingFactor, lastSmoothed: this.lastSmoothedValue },
      health: {
        drainRate: this.health.drainRate ? `${this.health.drainRate.toFixed(1)}%/day` : null,
        estimatedDays: this.health.estimatedDays,
        historySize: this.health.history.length,
        lastUpdate: this.health.lastUpdate
      },
      specs: UnifiedBatteryHandler.BATTERY_SPECS[this.batteryType] ? {
        type: UnifiedBatteryHandler.BATTERY_SPECS[this.batteryType].type,
        chemistry: UnifiedBatteryHandler.BATTERY_SPECS[this.batteryType].chemistry,
        capacity: `${UnifiedBatteryHandler.BATTERY_SPECS[this.batteryType].capacity}mAh`,
        cells: UnifiedBatteryHandler.BATTERY_SPECS[this.batteryType].cells
      } : null,
      profile: this._profile ? { algorithm: this._profile.algorithm, notes: this._profile.notes } : null
    };
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // v1.0: BATTERY HEALTH INTELLIGENCE INTEGRATION
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * v1.0: Initialize BatteryHealthIntelligence with detected battery type.
   */
  async _initBatteryHealthIntelligence() {
    if (!BatteryHealthIntelligence) {
      this.device.log('[BATTERY-HEALTH] BatteryHealthIntelligence module not available, skipping');
      return;
    }

    try {
      this.batteryHealthIntelligence = new BatteryHealthIntelligence(this.device, {
        batteryType: this.batteryType,
        temperature: this.temperature || 20
      });

      await this.batteryHealthIntelligence.initialize();

      // Store reference on device for flow card access
      this.device.batteryHealthIntelligence = this.batteryHealthIntelligence;

      // Initialize previous status tracking
      this._previousHealthStatusCode = this.batteryHealthIntelligence.healthStatusCode;

      this.device.log('[BATTERY-HEALTH] BatteryHealthIntelligence initialized successfully');
    } catch (err) {
      this.device.error('[BATTERY-HEALTH] Failed to initialize:', err.message);
      this.batteryHealthIntelligence = null;
    }
  }

  /**
   * v1.0: Feed battery percentage updates to health intelligence.
   * Updates capabilities: measure_battery_health, measure_battery_cycles,
   * text_battery_status, measure_battery_internal_resistance.
   * Triggers flow cards on status changes.
   *
   * @param {number} percentage - Smoothed battery percentage
   */
  _updateBatteryHealthIntelligence(percentage) {
    if (!this.batteryHealthIntelligence) return;
    if (percentage === null || percentage === undefined) return;

    try {
      // Feed the reading to health intelligence (uses voltage if available)
      const voltage = this.lastVoltage;
      const report = this.batteryHealthIntelligence.update(voltage, percentage, {
        temperature: this.temperature || 20
      });

      // ─── Update new capabilities ──────────────────────────────────────
      if (this.device.hasCapability?.('measure_battery_health')) {
        this.device.setCapabilityValue('measure_battery_health', report.healthScore).catch(() => {});
      }

      if (this.device.hasCapability?.('measure_battery_cycles')) {
        this.device.setCapabilityValue('measure_battery_cycles', report.cycleCount).catch(() => {});
      }

      if (this.device.hasCapability?.('text_battery_status')) {
        this.device.setCapabilityValue('text_battery_status', report.healthStatus).catch(() => {});
      }

      if (this.device.hasCapability?.('measure_battery_internal_resistance') && report.internalResistanceEstimate !== null) {
        this.device.setCapabilityValue('measure_battery_internal_resistance', report.internalResistanceEstimate).catch(() => {});
      }

      // ─── Flow card triggers ──────────────────────────────────────────
      if (BatteryHealthFlowHandler) {
        // Trigger health_changed if status level transitioned
        if (report.healthStatusCode !== this._previousHealthStatusCode) {
          BatteryHealthFlowHandler.triggerHealthChanged(this.device, report, this._previousHealthStatusCode).catch(() => {});

          // Trigger needs_replacement when entering Poor or Replace
          if (report.healthStatusCode === 'POOR' || report.healthStatusCode === 'REPLACE') {
            BatteryHealthFlowHandler.triggerNeedsReplacement(this.device, report).catch(() => {});
          }

          this._previousHealthStatusCode = report.healthStatusCode;
        }
      }
    } catch (err) {
      this.device.error('[BATTERY-HEALTH] Update error:', err.message);
    }
  }

  /**
   * v1.0: Feed voltage-level updates to health intelligence.
   * Handles voltage-specific analysis (internal resistance, self-discharge).
   *
   * @param {number} voltage - Measured voltage
   */
  _updateVoltageHealthIntelligence(voltage) {
    if (!this.batteryHealthIntelligence) return;
    if (voltage === null || voltage === undefined || isNaN(voltage)) return;

    try {
      // Update temperature if available
      if (this.temperature) {
        this.batteryHealthIntelligence.setTemperature(this.temperature);
      }

      // Feed voltage for manufacturing date estimation and internal resistance
      this.batteryHealthIntelligence.update(voltage, null, {
        temperature: this.temperature || 20
      });
    } catch (err) {
      this.device.error('[BATTERY-HEALTH] Voltage update error:', err.message);
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ═════════════════════════════════════════════════════════════════════════════

  destroy() {
    this._destroyed = true;
    if (this._pollingInterval) {
      this._clearInterval(this._pollingInterval);
      this._pollingInterval = null;
    }
    if (this._storeInterval) {
      this._clearInterval(this._storeInterval);
      this._storeInterval = null;
    }
    // v1.0: Cleanup Battery Health Intelligence
    if (this.batteryHealthIntelligence) {
      this.batteryHealthIntelligence.destroy();
      this.batteryHealthIntelligence = null;
    }
    this.device.log('[BATTERY-UNIFIED] 🛑 Destroyed');
  }

  /**
   * Force stop monitoring
   */
  stopMonitoring() {
    this.destroy();
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // v9.1.0: BATTERY REPORTING NORMALIZATION (Issue #4)
  // Fixes inconsistent battery level reporting on battery-powered devices
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Known Tuya battery reporting patterns and their corrections
   * Based on community reports and Z2M device definitions
   */
  static BATTERY_REPORTING_PATTERNS = {
    // Devices that report 0-200 instead of 0-100
    'multiply_2': {
      detect: (value) => value > 100 && value <= 200,
      correct: (value) => Math.round(value / 2),
      notes: 'Device reports 0-200 scale'
    },
    // Devices that report 0-400 instead of 0-100
    'multiply_4': {
      detect: (value) => value > 200 && value <= 400,
      correct: (value) => Math.round(value / 4),
      notes: 'Device reports 0-400 scale'
    },
    // Devices that report inverted (100=empty, 0=full)
    'inverted': {
      detect: (value, lastValue) => lastValue !== null && Math.abs(value - lastValue) > 50,
      correct: (value) => 100 - value,
      notes: 'Device reports inverted battery level'
    },
    // Devices that report voltage as battery percentage (tightened: 25-36 range only)
    'voltage_as_percent': {
      detect: (value, lastValue) => {
        // Only match if value looks like a voltage (2.5-3.6V as integer 25-36)
        // AND lastValue was clearly in a different range (percentage)
        if (value >= 25 && value <= 36 && lastValue !== null && lastValue > 40) return true;
        return false;
      },
      correct: (value) => {
        // 25-36 maps to 0-100% (2.5V=0%, 3.6V=100%)
        return Math.round(((value - 25) / 11) * 100);
      },
      notes: 'Device reports voltage (25-36 = 2.5-3.6V) as battery percentage'
    },
    // Devices that report with 0.5% steps
    'half_percent': {
      detect: (value) => value % 0.5 === 0 && value === Math.floor(value),
      correct: (value) => Math.round(value),
      notes: 'Device reports with 0.5% steps'
    }
  };

  /**
   * Normalize battery value based on known Tuya patterns
   * Called before updating battery to handle common reporting inconsistencies
   */
  _normalizeBatteryValue(value, dpId = null) {
    if (value === null || value === undefined || typeof value !== 'number') {
      return value;
    }

    // Check profile-specific algorithm first
    if (this._profile && this._profile.algorithm) {
      const profileResult = UnifiedBatteryHandler.calculateFromTuyaDP(value, this._profile.algorithm);
      if (profileResult !== null) {
        this.device.log(`[BATTERY-NORM] Profile algorithm '${this._profile.algorithm}': ${value} -> ${profileResult}`);
        return profileResult;
      }
    }

    // Check for known reporting patterns
    for (const [patternName, pattern] of Object.entries(UnifiedBatteryHandler.BATTERY_REPORTING_PATTERNS)) {
      if (pattern.detect(value, this.lastValue)) {
        const normalized = pattern.correct(value);
        this.device.log(`[BATTERY-NORM] Pattern '${patternName}' detected: ${value} -> ${normalized} (${pattern.notes})`);
        return normalized;
      }
    }

    // Ensure value is within valid range
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  /**
   * Validate battery value for sanity
   * Returns true if value is reasonable, false if suspicious
   */
  _validateBatteryValue(value, previousValue = null) {
    if (value === null || value === undefined || typeof value !== 'number') {
      return false;
    }

    // Basic range check
    if (value < 0 || value > 100) {
      this.device.log(`[BATTERY-VALID] Value out of range: ${value}`);
      return false;
    }

    // Sudden drop check (more than 50% in one update — v9.0.77: relaxed from 30%)
    // Legitimate drops of 30-50% happen with dying batteries
    if (previousValue !== null && previousValue > 30) {
      const drop = previousValue - value;
      if (drop > 50) {
        this.device.log(`[BATTERY-VALID] Suspicious drop: ${previousValue}% -> ${value}% (${drop}% drop)`);
        return false;
      }
    }

    // Sudden increase check (more than 20% without battery replacement)
    if (previousValue !== null && value > previousValue + 20) {
      // This could be a battery replacement, but log it
      this.device.log(`[BATTERY-VALID] Large increase detected: ${previousValue}% -> ${value}% (possible battery replacement)`);
    }

    return true;
  }

  /**
   * Get battery reporting diagnostics
   * Returns information about current battery reporting state
   */
  getBatteryReportingDiagnostics() {
    const settings = this.device.getSettings?.() || {};
    const store = this.device.getStore?.() || {};
    const data = this.device.getData?.() || {};

    const manufacturerName = settings.zb_manufacturer_name ||
                             store.manufacturerName ||
                             data.manufacturerName || '';

    return {
      currentValue: this.lastValue,
      lastVoltage: this.lastVoltage,
      batteryType: this.batteryType,
      source: this.source,
      manufacturerName,
      hasProfile: !!this._profile,
      profileAlgorithm: this._profile?.algorithm || null,
      health: {
        drainRate: this.health.drainRate,
        estimatedDays: this.health.estimatedDays,
        historyLength: this.health.history.length
      },
      smoothing: {
        enabled: true,
        factor: this.smoothingFactor,
        lastSmoothed: this.lastSmoothedValue
      }
    };
  }
}

module.exports = UnifiedBatteryHandler;
