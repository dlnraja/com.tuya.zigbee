'use strict';

/**
 * MultiProtocolBatteryPercent (P209)
 *
 * Fine-grained battery % support across every transport:
 *   ZCL / Zigbee · Tuya DP (EF00) · WiFi / local Tuya · IAS/ACE ("acl") ·
 *   voltage · raw frame · MCU · estimated/cached
 *
 * Rules (project doctrine):
 *  - Never linear (V - 2.5) / 0.5 — curves via UnifiedBatteryHandler
 *  - Prefer confirmInbound / safeSetCapabilityValue (L14)
 *  - Mains devices: never invent measure_battery
 *  - Cross-validate multi-source via SmartCap when present
 */

const { normalizeZclBatteryPercent, normalizeZclBatteryVoltagePercent } = require('./zcl-percent');

let UnifiedBatteryHandler = null;
try {
  UnifiedBatteryHandler = require('./UnifiedBatteryHandler');
} catch (_e) {
  UnifiedBatteryHandler = null;
}

/** Map every slang / diag / crash label → canonical protocol id */
const PROTOCOL_ALIASES = Object.freeze({
  zcl: 'zcl',
  zigbee: 'zcl',
  'genpowercfg': 'zcl',
  powerconfiguration: 'zcl',
  'power-cfg': 'zcl',
  'tuya-dp': 'tuya-dp',
  dp: 'tuya-dp',
  tuya: 'tuya-dp',
  ef00: 'tuya-dp',
  '0xef00': 'tuya-dp',
  wifi: 'wifi',
  'tuya-wifi': 'wifi',
  'local-wifi': 'wifi',
  local: 'wifi',
  'wifi-local': 'wifi',
  ias: 'ias',
  ace: 'ias',
  acl: 'ias', // forum/diag shorthand for IAS ACE / zone low-batt
  'ias-zone': 'ias',
  voltage: 'voltage',
  mv: 'voltage',
  millivolt: 'voltage',
  v: 'voltage',
  raw: 'raw',
  raw_frame: 'raw',
  'raw-frame': 'raw',
  'raw_value': 'raw',
  mcu: 'mcu',
  estimated: 'estimated',
  cached: 'cached',
  store: 'cached',
  ui: 'ui',
  virtual: 'ui',
});

const SOURCE_CONFIDENCE = Object.freeze({
  zcl: 0.92,
  'tuya-dp': 0.88,
  wifi: 0.85,
  voltage: 0.75,
  ias: 0.55,
  raw: 0.65,
  mcu: 0.7,
  estimated: 0.35,
  cached: 0.4,
  ui: 0.3,
});

function clampPercent(value) {
  if (!Number.isFinite(value)) {return null;}
  return Math.min(100, Math.max(0, Math.round(value)));
}

function normalizeProtocol(protocolOrSource) {
  const key = String(protocolOrSource || 'unknown').toLowerCase().trim();
  return PROTOCOL_ALIASES[key] || PROTOCOL_ALIASES[key.replace(/\s+/g, '-')] || key;
}

function _deviceContext(device) {
  let manufacturer = '';
  let batteryType = 'CR2032';
  let temperature;
  let lastValue = null;
  try {
    manufacturer = device?.getSetting?.('zb_manufacturer_name')
      || device?.getStoreValue?.('manufacturerName')
      || '';
  } catch (_e) { /* soft */ }
  try {
    const t = device?.getSetting?.('battery_type')
      || device?.getStoreValue?.('battery_type');
    if (t) {batteryType = t;}
  } catch (_e) { /* soft */ }
  try {
    temperature = device?.getCapabilityValue?.('measure_temperature');
  } catch (_e) { /* soft */ }
  try {
    const lv = device?.getCapabilityValue?.('measure_battery')
      ?? device?.getStoreValue?.('last_battery_percentage');
    if (Number.isFinite(lv)) {lastValue = Number(lv);}
  } catch (_e) { /* soft */ }
  return { manufacturer, batteryType, temperature, lastValue };
}

/**
 * Normalize a raw sample from any protocol into 0–100 (or null).
 * @param {*} raw
 * @param {{ protocol?: string, source?: string, dp?: number, batteryType?: string, manufacturer?: string, temperature?: number, lastValue?: number, profile?: object }} [opts]
 * @returns {number|null}
 */
function normalizeBatteryPercent(raw, opts = {}) {
  if (raw === null || raw === undefined) {return null;}
  const protocol = normalizeProtocol(opts.protocol || opts.source);
  const manufacturer = opts.manufacturer || '';
  const batteryType = opts.batteryType || 'CR2032';
  const temperature = opts.temperature;
  const lastValue = opts.lastValue;

  // Boolean / IAS low-battery: never invent a fake high %
  if (typeof raw === 'boolean' || protocol === 'ias') {
    if (raw === true || raw === 1 || raw === '1' || raw === 'true') {
      return 10;
    }
    if (raw === false || raw === 0 || raw === '0' || raw === 'false') {
      // Healthy zone bit — keep last known or abstain
      return Number.isFinite(lastValue) ? clampPercent(lastValue) : null;
    }
  }

  if (protocol === 'voltage') {
    if (typeof normalizeZclBatteryVoltagePercent === 'function') {
      return normalizeZclBatteryVoltagePercent(raw, { batteryType, temperature });
    }
    if (UnifiedBatteryHandler?.calculateFromVoltage) {
      const v = UnifiedBatteryHandler.normalizeVoltage?.(raw) ?? Number(raw);
      return clampPercent(UnifiedBatteryHandler.calculateFromVoltage(v, batteryType, temperature));
    }
    return null;
  }

  if (protocol === 'zcl') {
    return normalizeZclBatteryPercent(raw, { manufacturer, batteryType });
  }

  if (protocol === 'tuya-dp' || protocol === 'mcu') {
    if (UnifiedBatteryHandler?.normalizeTuyaBatteryValue && opts.dp != null) {
      const n = UnifiedBatteryHandler.normalizeTuyaBatteryValue(opts.dp, raw, {
        manufacturer,
        batteryType,
        temperature,
        lastValue,
        profile: opts.profile || null,
      });
      if (n !== null && n !== undefined) {return clampPercent(n);}
      // Fall through — DP id may be non-standard; still try algorithms
    }
    if (UnifiedBatteryHandler?.calculateFromTuyaDP) {
      const num = Number(raw);
      // direct algorithm clamps >100 to 100 — apply 0–200→% first when no profile
      if ((!opts.algorithm || opts.algorithm === 'direct')
          && Number.isFinite(num) && num > 100 && num <= 200) {
        return clampPercent(num / 2);
      }
      const n = UnifiedBatteryHandler.calculateFromTuyaDP(raw, opts.algorithm || 'direct', {
        batteryType,
        temperature,
      });
      if (n !== null && n !== undefined) {return clampPercent(n);}
    }
    // Fallback: 0–200 ZCL-like or 0–100 direct
    const num = Number(raw);
    if (!Number.isFinite(num) || num < 0 || num === 255 || num === 0xFFFF) {return null;}
    if (num > 100 && num <= 200) {return clampPercent(num / 2);}
    if (num <= 100) {return clampPercent(num);}
    return null;
  }

  if (protocol === 'wifi') {
    // Local WiFi / Tuya cloud-local bridges usually send 0–100; some send 0–200
    const num = Number(raw);
    if (!Number.isFinite(num) || num < 0) {return null;}
    if (num === 255 || num === 0xFFFF) {return null;}
    if (num > 100 && num <= 200) {return clampPercent(num / 2);}
    if (num > 200 && num < 4000 && UnifiedBatteryHandler?.calculateFromVoltage) {
      // mis-tagged voltage on wifi path
      const v = UnifiedBatteryHandler.normalizeVoltage?.(num) ?? num / 1000;
      return clampPercent(UnifiedBatteryHandler.calculateFromVoltage(v, batteryType, temperature));
    }
    if (num <= 100) {return clampPercent(num);}
    return null;
  }

  if (protocol === 'raw') {
    // Try ZCL then Tuya heuristics
    const z = normalizeZclBatteryPercent(raw, { manufacturer, batteryType });
    if (z !== null) {return z;}
    const num = Number(raw);
    if (Number.isFinite(num) && num >= 0 && num <= 100) {return clampPercent(num);}
    if (Number.isFinite(num) && num > 100 && num <= 200) {return clampPercent(num / 2);}
    return null;
  }

  if (protocol === 'estimated' || protocol === 'cached' || protocol === 'ui') {
    const num = Number(raw);
    return Number.isFinite(num) ? clampPercent(num) : null;
  }

  // Unknown protocol — safest heuristic
  const num = Number(raw);
  if (!Number.isFinite(num)) {return null;}
  if (num === 255 || num === 0xFFFF) {return null;}
  if (num > 200 && num < 4000) {
    return normalizeZclBatteryVoltagePercent?.(raw, { batteryType, temperature }) ?? null;
  }
  if (num > 100 && num <= 200) {return clampPercent(num / 2);}
  if (num >= 0 && num <= 100) {return clampPercent(num);}
  return null;
}

function _isMains(device) {
  try {
    if (typeof device.mainsPowered === 'boolean') {return device.mainsPowered;}
    if (typeof device.mainsPowered === 'function') {return !!device.mainsPowered();}
  } catch (_e) { /* soft */ }
  return false;
}

/**
 * Commit a already-normalized 0–100 % through the best available path.
 */
async function commitBatteryPercent(device, percent, opts = {}) {
  if (!device || device._destroyed) {return { ok: false, reason: 'destroyed' };}
  if (_isMains(device)) {
    return { ok: false, reason: 'mains' };
  }
  const pct = clampPercent(percent);
  if (pct === null) {return { ok: false, reason: 'invalid' };}

  const protocol = normalizeProtocol(opts.protocol || opts.source || 'unknown');
  const confidence = opts.confidence ?? SOURCE_CONFIDENCE[protocol] ?? 0.7;
  const estimated = opts.estimated === true
    || protocol === 'estimated'
    || protocol === 'ias';

  try {
    // Multi-source agree path (P207)
    if (typeof device.confirmInbound === 'function') {
      const r = await device.confirmInbound('measure_battery', pct, protocol, confidence);
      await _persistMeta(device, pct, protocol, estimated);
      if (device.protocolRxTx?.noteRx && opts.clusterId != null) {
        device.protocolRxTx.noteRx(opts.clusterId, {
          capability: 'measure_battery',
          value: pct,
          confidence,
        });
      }
      return { ok: !!r?.ok, percent: pct, protocol, via: 'confirmInbound', detail: r };
    }

    // SmartBatteryManager is a caller of commit — do NOT call back into setBattery
    // (would recurse). Prefer confirmInbound, else L14 safeSet.

    // L14 direct
    if (typeof device.safeSetCapabilityValue === 'function') {
      if (!device.hasCapability?.('measure_battery')) {
        await device.addCapability?.('measure_battery').catch(() => {});
      }
      await device.safeSetCapabilityValue('measure_battery', pct, {
        source: protocol,
        confidence,
      });
      await _persistMeta(device, pct, protocol, estimated);
      return { ok: true, percent: pct, protocol, via: 'safeSet' };
    }

    if (typeof device.setCapabilityValue === 'function' && device.hasCapability?.('measure_battery')) {
      await device.setCapabilityValue('measure_battery', pct);
      await _persistMeta(device, pct, protocol, estimated);
      return { ok: true, percent: pct, protocol, via: 'setCapability' };
    }

    return { ok: false, reason: 'no-writer' };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

async function _persistMeta(device, pct, protocol, estimated) {
  try {
    await device.setStoreValue?.('last_battery_percentage', pct).catch(() => {});
    await device.setStoreValue?.('last_battery_source', protocol).catch(() => {});
    await device.setStoreValue?.('last_battery_estimated', !!estimated).catch(() => {});
    await device.setStoreValue?.('last_battery_time', Date.now()).catch(() => {});
  } catch (_e) { /* soft */ }
}

/**
 * Normalize + commit in one call — preferred driver / IO entry point.
 * @param {object} device
 * @param {*} raw
 * @param {object} [opts]
 */
async function ingestBatterySample(device, raw, opts = {}) {
  const ctx = _deviceContext(device);
  const merged = {
    ...ctx,
    ...opts,
    protocol: opts.protocol || opts.source,
    batteryType: opts.batteryType || ctx.batteryType,
    manufacturer: opts.manufacturer || ctx.manufacturer,
    temperature: opts.temperature ?? ctx.temperature,
    lastValue: opts.lastValue ?? ctx.lastValue,
  };
  const percent = normalizeBatteryPercent(raw, merged);
  if (percent === null) {
    return { ok: false, reason: 'unusable', protocol: normalizeProtocol(merged.protocol) };
  }
  return commitBatteryPercent(device, percent, {
    ...merged,
    protocol: normalizeProtocol(merged.protocol),
  });
}

/**
 * Soft-attach helpers on a device instance (idempotent).
 */
function attachMultiProtocolBattery(device) {
  if (!device || device._multiProtocolBatteryAttached) {
    return { skipped: true };
  }
  device._multiProtocolBatteryAttached = true;
  device.ingestBatteryPercent = (raw, opts) => ingestBatterySample(device, raw, opts);
  device.normalizeBatteryPercent = (raw, opts) => {
    const ctx = _deviceContext(device);
    return normalizeBatteryPercent(raw, { ...ctx, ...opts, protocol: opts?.protocol || opts?.source });
  };
  return { ok: true };
}

module.exports = {
  PROTOCOL_ALIASES,
  SOURCE_CONFIDENCE,
  normalizeProtocol,
  normalizeBatteryPercent,
  commitBatteryPercent,
  ingestBatterySample,
  attachMultiProtocolBattery,
  clampPercent,
};
