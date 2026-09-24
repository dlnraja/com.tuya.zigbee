'use strict';

/**
 * P2710 — Battery Chemistry Precision Curves
 *
 * WHY (P215):
 * - Pourquoi: precise measure_battery % + measure_voltage from non-linear
 *   discharge curves per energy type (pile / akku / lithium techno).
 * - Comment: SSOT curves + normalizeVoltagePrecise + estimateSocFromVoltage;
 *   UnifiedBatteryHandler merges SPECS; fuse with ZCL % via P2689.
 * - Pour qui: Homey UI % (Universal + Bastien + Stable BOTH).
 * - Quand: ZCL batteryVoltage / Tuya mV DP / voltage-derived %.
 * - Contre quoi: linear (V-2.5)/0.5 · missing LiFePO4/NiMH/Li-SOCl2 ·
 *   raw ZCL units mis-scaled · curve algos falling through to "direct".
 *
 * Banned: linear (voltage - 2.5) / 0.5
 */

/** Extra chemistries / pack layouts — merged into UnifiedBatteryHandler.BATTERY_SPECS */
const EXTRA_SPECS = {
  // Homey energy.batteries alias used in many compose manifests
  '1.5V_AA': {
    type: 'Alkaline AA alias', chemistry: 'Zn-MnO2', cells: 1,
    nominal: 1.5, capacity: 2850, fresh: 1.65, full: 1.55, low: 1.1, dead: 0.9,
    selfDischarge: 3, tempCoeff: -0.004,
    curve: [
      { v: 1.65, p: 100 }, { v: 1.55, p: 95 }, { v: 1.50, p: 90 },
      { v: 1.45, p: 80 }, { v: 1.40, p: 70 }, { v: 1.35, p: 60 },
      { v: 1.30, p: 50 }, { v: 1.25, p: 40 }, { v: 1.20, p: 30 },
      { v: 1.15, p: 20 }, { v: 1.10, p: 12 }, { v: 1.05, p: 6 },
      { v: 1.00, p: 3 }, { v: 0.90, p: 0 },
    ],
  },
  '1.5V_AAA': {
    type: 'Alkaline AAA alias', chemistry: 'Zn-MnO2', cells: 1,
    nominal: 1.5, capacity: 1200, fresh: 1.65, full: 1.55, low: 1.1, dead: 0.9,
    selfDischarge: 3, tempCoeff: -0.004,
    curve: [
      { v: 1.65, p: 100 }, { v: 1.55, p: 95 }, { v: 1.50, p: 90 },
      { v: 1.45, p: 80 }, { v: 1.40, p: 70 }, { v: 1.35, p: 60 },
      { v: 1.30, p: 50 }, { v: 1.25, p: 40 }, { v: 1.20, p: 30 },
      { v: 1.15, p: 20 }, { v: 1.10, p: 12 }, { v: 0.90, p: 0 },
    ],
  },
  '4xAA': {
    type: 'Alkaline Multi-Cell', chemistry: 'Zn-MnO2', cells: 4,
    nominal: 6.0, capacity: 2850, fresh: 6.60, full: 6.20, low: 4.40, dead: 3.60,
    selfDischarge: 3, tempCoeff: -0.016,
    curve: [
      { v: 6.60, p: 100 }, { v: 6.20, p: 95 }, { v: 6.00, p: 90 },
      { v: 5.80, p: 80 }, { v: 5.60, p: 70 }, { v: 5.40, p: 60 },
      { v: 5.20, p: 50 }, { v: 5.00, p: 40 }, { v: 4.80, p: 30 },
      { v: 4.60, p: 20 }, { v: 4.40, p: 12 }, { v: 4.00, p: 5 },
      { v: 3.60, p: 0 },
    ],
  },
  // NiMH akkumulators (1.2V nominal — flatter mid curve)
  NiMH: {
    type: 'NiMH Rechargeable', chemistry: 'NiMH', cells: 1,
    nominal: 1.2, capacity: 2000, fresh: 1.45, full: 1.35, low: 1.10, dead: 0.95,
    selfDischarge: 15, tempCoeff: -0.003,
    curve: [
      { v: 1.45, p: 100 }, { v: 1.40, p: 98 }, { v: 1.35, p: 95 },
      { v: 1.30, p: 88 }, { v: 1.28, p: 75 }, { v: 1.25, p: 55 },
      { v: 1.22, p: 40 }, { v: 1.18, p: 25 }, { v: 1.15, p: 15 },
      { v: 1.10, p: 8 }, { v: 1.05, p: 3 }, { v: 0.95, p: 0 },
    ],
  },
  NiMH_AA: {
    type: 'NiMH AA Rechargeable', chemistry: 'NiMH', cells: 1,
    nominal: 1.2, capacity: 2500, fresh: 1.45, full: 1.35, low: 1.10, dead: 0.95,
    selfDischarge: 15, tempCoeff: -0.003,
    curve: [
      { v: 1.45, p: 100 }, { v: 1.40, p: 98 }, { v: 1.35, p: 95 },
      { v: 1.30, p: 88 }, { v: 1.28, p: 75 }, { v: 1.25, p: 55 },
      { v: 1.22, p: 40 }, { v: 1.18, p: 25 }, { v: 1.15, p: 15 },
      { v: 1.10, p: 8 }, { v: 0.95, p: 0 },
    ],
  },
  NiMH_AAA: {
    type: 'NiMH AAA Rechargeable', chemistry: 'NiMH', cells: 1,
    nominal: 1.2, capacity: 900, fresh: 1.45, full: 1.35, low: 1.10, dead: 0.95,
    selfDischarge: 15, tempCoeff: -0.003,
    curve: [
      { v: 1.45, p: 100 }, { v: 1.40, p: 97 }, { v: 1.35, p: 92 },
      { v: 1.30, p: 85 }, { v: 1.28, p: 70 }, { v: 1.25, p: 50 },
      { v: 1.20, p: 30 }, { v: 1.15, p: 15 }, { v: 1.10, p: 8 },
      { v: 0.95, p: 0 },
    ],
  },
  '2xNiMH': {
    type: 'NiMH Multi-Cell', chemistry: 'NiMH', cells: 2,
    nominal: 2.4, capacity: 2000, fresh: 2.90, full: 2.70, low: 2.20, dead: 1.90,
    selfDischarge: 15, tempCoeff: -0.006,
    curve: [
      { v: 2.90, p: 100 }, { v: 2.80, p: 98 }, { v: 2.70, p: 95 },
      { v: 2.60, p: 85 }, { v: 2.55, p: 70 }, { v: 2.50, p: 50 },
      { v: 2.40, p: 30 }, { v: 2.30, p: 15 }, { v: 2.20, p: 8 },
      { v: 1.90, p: 0 },
    ],
  },
  NiCd: {
    type: 'NiCd Rechargeable', chemistry: 'NiCd', cells: 1,
    nominal: 1.2, capacity: 1000, fresh: 1.40, full: 1.30, low: 1.10, dead: 0.90,
    selfDischarge: 20, tempCoeff: -0.004,
    curve: [
      { v: 1.40, p: 100 }, { v: 1.35, p: 95 }, { v: 1.30, p: 85 },
      { v: 1.28, p: 70 }, { v: 1.25, p: 50 }, { v: 1.20, p: 30 },
      { v: 1.15, p: 15 }, { v: 1.10, p: 8 }, { v: 0.90, p: 0 },
    ],
  },
  // LiFePO4 akku (3.2V nominal — very flat mid)
  LiFePO4: {
    type: 'LiFePO4 Rechargeable', chemistry: 'LiFePO4', cells: 1,
    nominal: 3.2, capacity: 2000, fresh: 3.65, full: 3.40, low: 3.00, dead: 2.50,
    selfDischarge: 3, tempCoeff: -0.002,
    curve: [
      { v: 3.65, p: 100 }, { v: 3.50, p: 99 }, { v: 3.40, p: 95 },
      { v: 3.35, p: 90 }, { v: 3.32, p: 80 }, { v: 3.30, p: 60 },
      { v: 3.28, p: 40 }, { v: 3.25, p: 25 }, { v: 3.20, p: 15 },
      { v: 3.10, p: 8 }, { v: 3.00, p: 3 }, { v: 2.50, p: 0 },
    ],
  },
  // High-voltage Li-ion (4.35V charge)
  LiHV: {
    type: 'Li-ion High Voltage', chemistry: 'LiHV', cells: 1,
    nominal: 3.8, capacity: 3000, fresh: 4.35, full: 4.25, low: 3.40, dead: 3.00,
    selfDischarge: 2, tempCoeff: -0.002,
    curve: [
      { v: 4.35, p: 100 }, { v: 4.25, p: 97 }, { v: 4.15, p: 90 },
      { v: 4.05, p: 80 }, { v: 3.95, p: 68 }, { v: 3.85, p: 55 },
      { v: 3.75, p: 42 }, { v: 3.65, p: 28 }, { v: 3.55, p: 16 },
      { v: 3.40, p: 6 }, { v: 3.00, p: 0 },
    ],
  },
  // Lithium thionyl chloride (long-life primary, flat then cliff)
  'Li-SOCl2': {
    type: 'Lithium Thionyl Chloride', chemistry: 'Li-SOCl2', cells: 1,
    nominal: 3.6, capacity: 2400, fresh: 3.70, full: 3.65, low: 3.20, dead: 2.80,
    selfDischarge: 1, tempCoeff: -0.002,
    curve: [
      { v: 3.70, p: 100 }, { v: 3.65, p: 98 }, { v: 3.60, p: 90 },
      { v: 3.55, p: 70 }, { v: 3.50, p: 45 }, { v: 3.40, p: 25 },
      { v: 3.30, p: 12 }, { v: 3.20, p: 5 }, { v: 2.80, p: 0 },
    ],
  },
  ER14505: {
    type: 'Li-SOCl2 AA-size', chemistry: 'Li-SOCl2', cells: 1,
    nominal: 3.6, capacity: 2400, fresh: 3.70, full: 3.65, low: 3.20, dead: 2.80,
    selfDischarge: 1, tempCoeff: -0.002,
    curve: [
      { v: 3.70, p: 100 }, { v: 3.65, p: 98 }, { v: 3.60, p: 90 },
      { v: 3.55, p: 70 }, { v: 3.50, p: 45 }, { v: 3.40, p: 25 },
      { v: 3.30, p: 12 }, { v: 3.20, p: 5 }, { v: 2.80, p: 0 },
    ],
  },
  '2xCR123A': {
    type: 'Lithium Photo Pack', chemistry: 'Li-MnO2', cells: 2,
    nominal: 6.0, capacity: 1500, fresh: 6.60, full: 6.00, low: 5.00, dead: 4.00,
    selfDischarge: 1, tempCoeff: -0.006,
    curve: [
      { v: 6.60, p: 100 }, { v: 6.30, p: 95 }, { v: 6.00, p: 90 },
      { v: 5.80, p: 80 }, { v: 5.60, p: 65 }, { v: 5.40, p: 45 },
      { v: 5.20, p: 25 }, { v: 5.00, p: 12 }, { v: 4.80, p: 5 },
      { v: 4.00, p: 0 },
    ],
  },
  CR1220: {
    type: 'Lithium Coin Cell', chemistry: 'Li-MnO2', cells: 1,
    nominal: 3.0, capacity: 40, fresh: 3.30, full: 3.00, low: 2.50, dead: 2.00,
    selfDischarge: 1, tempCoeff: -0.003,
    curve: [
      { v: 3.30, p: 100 }, { v: 3.00, p: 95 }, { v: 2.90, p: 85 },
      { v: 2.80, p: 70 }, { v: 2.70, p: 50 }, { v: 2.60, p: 30 },
      { v: 2.50, p: 15 }, { v: 2.00, p: 0 },
    ],
  },
};

const ALIASES = {
  '1.5v': '1.5V_AA',
  '1.5v_aa': '1.5V_AA',
  '1.5v_aaa': '1.5V_AAA',
  aa_alkaline: 'AA',
  aaa_alkaline: 'AAA',
  alkaline: 'AA',
  nimh: 'NiMH',
  'ni-mh': 'NiMH',
  nimh_aa: 'NiMH_AA',
  nimh_aaa: 'NiMH_AAA',
  nicd: 'NiCd',
  'ni-cd': 'NiCd',
  lifepo4: 'LiFePO4',
  lfp: 'LiFePO4',
  lihv: 'LiHV',
  'li-hv': 'LiHV',
  lipo: 'Li-polymer',
  'li-po': 'Li-polymer',
  'li-polymer': 'Li-polymer',
  li_ion: 'Li-ion',
  lithium_ion: 'Li-ion',
  'li-ion': 'Li-ion',
  lisocl2: 'Li-SOCl2',
  'li-socl2': 'Li-SOCl2',
  er14505: 'ER14505',
  cr1220: 'CR1220',
  '2xcr123a': '2xCR123A',
  '4xaa': '4xAA',
  '2xnimh': '2xNiMH',
  lithium_flat: 'CR2032',
  cr2032_curve: 'CR2032',
  cr2450_curve: 'CR2450',
  alkaline_curve: '2xAAA',
};

const COIN = new Set(['CR2032', 'CR2450', 'CR2477', 'CR1632', 'CR1220', '3V_2100', '3V_2500']);
const ALKALINE = new Set(['AAA', 'AA', 'C', 'D', '9V', '2xAAA', '2xAA', '4xAAA', '4xAA', '1.5V_AA', '1.5V_AAA']);
const RECHARGEABLE = new Set([
  'Li-ion', 'Li-polymer', '18650', 'LiHV', 'LiFePO4',
  'NiMH', 'NiMH_AA', 'NiMH_AAA', '2xNiMH', 'NiCd',
]);
const LITHIUM_PRIMARY = new Set(['CR123A', '2xCR123A', 'Li-SOCl2', 'ER14505']);

function normalizeChemistryKey(batteryType) {
  if (!batteryType) return 'CR2032';
  const key = String(batteryType).trim();
  const lower = key.toLowerCase().replace(/\s+/g, '_');
  if (ALIASES[lower]) return ALIASES[lower];
  if (EXTRA_SPECS[key]) return key;
  return key;
}

function chemistryClass(batteryType) {
  const c = normalizeChemistryKey(batteryType);
  if (COIN.has(c) || /^CR\d+/i.test(c)) return 'coin';
  if (RECHARGEABLE.has(c) || /li-?ion|lipo|lifepo|18650|nimh|nicd|lihv/i.test(c)) return 'rechargeable';
  if (ALKALINE.has(c) || /1\.5V|AA|AAA/i.test(c)) return 'alkaline';
  if (LITHIUM_PRIMARY.has(c) || /CR123|SOCl|ER145/i.test(c)) return 'lithiumPrimary';
  if (/MAINS|USB|NONE/i.test(c)) return 'mains';
  return 'coin';
}

/**
 * Precise voltage normalize — Zigbee batteryVoltage is often 100 mV units (30 → 3.0 V).
 * @returns {number|null} volts
 */
function normalizeVoltagePrecise(rawVoltage) {
  const raw = Number(rawVoltage);
  if (!Number.isFinite(raw) || raw <= 0) return null;

  // millivolts (typical Tuya DP)
  if (raw >= 800 && raw <= 6000) return Math.round((raw / 1000) * 1000) / 1000;
  // centivolts
  if (raw > 100 && raw <= 600) return Math.round((raw / 100) * 1000) / 1000;
  // Zigbee Power Configuration batteryVoltage (100 mV units) — 20..60 → 2.0..6.0 V
  if (raw >= 20 && raw <= 60) return Math.round((raw / 10) * 1000) / 1000;
  // already volts
  if (raw >= 0.8 && raw <= 15) return Math.round(raw * 1000) / 1000;
  // 2-cell pack in 100 mV (60..90)
  if (raw > 60 && raw <= 90) return Math.round((raw / 10) * 1000) / 1000;
  return null;
}

function interpolateCurve(voltage, specs, temperature = 20) {
  let compensated = voltage;
  if (temperature < 20 && specs.tempCoeff) {
    compensated = voltage + (specs.tempCoeff * (20 - temperature));
  }
  if (compensated >= specs.fresh) return 100;
  if (compensated <= specs.dead) return 0;
  const curve = specs.curve || [];
  for (let i = 0; i < curve.length - 1; i++) {
    const high = curve[i];
    const low = curve[i + 1];
    if (compensated >= low.v && compensated <= high.v) {
      const vRange = high.v - low.v;
      if (vRange <= 0) return high.p;
      const p = low.p + ((compensated - low.v) / vRange) * (high.p - low.p);
      return Math.max(0, Math.min(100, p));
    }
  }
  return compensated > (curve[0]?.v || specs.fresh) ? 100 : 0;
}

/**
 * @param {number} voltageOrRaw - volts OR raw Zigbee/Tuya value
 * @param {string} batteryType
 * @param {object} [opts]
 * @returns {{ percent: number, percentPrecise: number, voltageV: number, chemistry: string, chemistryClass: string, confidence: number }|null}
 */
function estimateSocFromVoltage(voltageOrRaw, batteryType = 'CR2032', opts = {}) {
  let voltageV = normalizeVoltagePrecise(voltageOrRaw);
  // Already-normalized volts sometimes pass through as 2.9 (OK); if null try as volts directly
  if (voltageV == null && Number.isFinite(Number(voltageOrRaw)) && Number(voltageOrRaw) >= 0.8 && Number(voltageOrRaw) <= 15) {
    voltageV = Math.round(Number(voltageOrRaw) * 1000) / 1000;
  }
  if (voltageV == null) return null;

  const chemistry = normalizeChemistryKey(batteryType);
  const specs = EXTRA_SPECS[chemistry] || opts.specs || null;
  // Caller (UBH) may pass full SPECS lookup
  const effective = specs || opts.lookupSpecs?.(chemistry);
  if (!effective?.curve) {
    return {
      percent: null,
      percentPrecise: null,
      voltageV,
      chemistry,
      chemistryClass: chemistryClass(chemistry),
      confidence: 0,
    };
  }

  const precise = interpolateCurve(voltageV, effective, opts.temperature ?? 20);
  const percent = Math.round(precise);
  const klass = chemistryClass(chemistry);
  // Flat chemistries (LiFePO4 / Li-SOCl2 mid) → slightly lower confidence mid-band
  let confidence = 0.85;
  if (klass === 'rechargeable' && /LiFePO4|NiMH/i.test(chemistry) && percent > 20 && percent < 90) {
    confidence = 0.7;
  }
  if (klass === 'lithiumPrimary' && /SOCl/i.test(chemistry) && percent > 20 && percent < 80) {
    confidence = 0.65;
  }

  return {
    percent,
    percentPrecise: Math.round(precise * 10) / 10,
    voltageV,
    chemistry,
    chemistryClass: klass,
    confidence,
  };
}

function listSupportedChemistries() {
  return Object.keys(EXTRA_SPECS).sort();
}

module.exports = {
  EXTRA_SPECS,
  ALIASES,
  normalizeChemistryKey,
  chemistryClass,
  normalizeVoltagePrecise,
  estimateSocFromVoltage,
  interpolateCurve,
  listSupportedChemistries,
};
