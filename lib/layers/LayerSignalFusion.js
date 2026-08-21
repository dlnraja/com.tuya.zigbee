'use strict';

/**
 * LayerSignalFusion (P211)
 *
 * Intelligent gate when the same Homey capability is fed by two+ protocol
 * layers (ZCL + Tuya DP, IAS + DP, voltage + ZCL battery, …).
 *
 * Goals:
 *  - Cross-layer echo → one Homey write (no duplicate flows / UI spam)
 *  - Phantom block → estimated/cached never overwrite fresh hardware
 *  - Priority hold → lower-trust layer cannot thrash a fresher higher-trust value
 *  - Soft equality → 22.1 vs 22.05 counts as the same sample
 *
 * MASTER_ONLY. Never throws. Fail-open only when device is destroyed.
 */

const SOURCE_ALIASES = Object.freeze({
  zigbee: 'zcl',
  zcl: 'zcl',
  'zcl-raw': 'zcl',
  raw_cluster: 'zcl',
  dp: 'tuya-dp',
  'tuya-dp': 'tuya-dp',
  tuya: 'tuya-dp',
  ef00: 'tuya-dp',
  wifi: 'wifi',
  'local-wifi': 'wifi',
  ias: 'ias',
  ace: 'ias',
  acl: 'ias',
  voltage: 'voltage',
  raw: 'raw',
  raw_frame: 'raw',
  mcu: 'mcu',
  'tuya-bound': 'tuya-bound',
  'cluster-bound': 'cluster-bound',
  ui: 'ui',
  virtual: 'ui',
  estimated: 'estimated',
  cached: 'cached',
  'last-known': 'cached',
});

/** Lower number = higher trust when layers disagree inside the echo window. */
const SOURCE_PRIORITY = Object.freeze({
  zcl: 1,
  'tuya-dp': 2,
  ias: 2,
  wifi: 2,
  'tuya-bound': 3,
  voltage: 3,
  mcu: 4,
  raw: 5,
  'cluster-bound': 5,
  ui: 6,
  estimated: 9,
  cached: 10,
  unknown: 8,
});

const PHANTOM_SOURCES = new Set(['estimated', 'cached']);
const HARDWARE_SOURCES = new Set(['zcl', 'tuya-dp', 'ias', 'wifi', 'voltage', 'mcu', 'tuya-bound', 'raw']);

function normalizeSource(source) {
  const key = String(source || 'unknown').trim().toLowerCase();
  return SOURCE_ALIASES[key] || key || 'unknown';
}

/**
 * WHY: ias_zone / sleepy / no-EF00 -- raw and ias must beat phantom leftover DP1.
 * Do NOT invert SOURCE_PRIORITY globally (MCU TS0601 needs tuya-dp above raw).
 * Guard on profile ias_zone or live 61184 absent.
 */
function isSleepyIasNoEf00(device) {
  if (!device) {return false;}
  if (device._skipTuyaDataQuery === true || device._iasOnlyProfile === true) {return true;}
  if (device._deviceProfile && device._deviceProfile.type === 'ias_zone') {return true;}
  let pid = '';
  try {
    pid = String(
      (device.getSetting && device.getSetting('zb_model_id'))
      || (device.getData && device.getData().modelId)
      || (device.getData && device.getData().productId)
      || (device._deviceProfile && device._deviceProfile.productId)
      || ''
    ).toUpperCase();
  } catch (_e) {
    pid = '';
  }
  if (pid === 'TS0207' || pid === 'TS0203' || pid.indexOf('TS0215') === 0) {return true;}
  const endpoints = (device.zclNode && device.zclNode.endpoints) || {};
  let hasIas = false;
  let hasEf00 = false;
  const vals = Object.keys(endpoints).map(function (k) { return endpoints[k]; });
  for (let i = 0; i < vals.length; i++) {
    const c = (vals[i] && vals[i].clusters) || {};
    if (c.iasZone || c.ssIasZone || c.iasAce || c[1280] || c['1280'] || c[0x0500]) {
      hasIas = true;
    }
    if (c.tuya || c.manuSpecificTuya || c.tuyaManufacturer || c[61184] || c['61184'] || c[0xEF00]) {
      hasEf00 = true;
    }
  }
  if (hasEf00) {return false;}
  if (hasIas) {return true;}
  return /^TS004[0-9A-F]$/.test(pid);
}

function sourcePriority(source, device) {
  const n = normalizeSource(source);
  if (isSleepyIasNoEf00(device)) {
    if (n === 'ias' || n === 'raw') {return 1;}
    if (n === 'tuya-dp') {return 6;}
  }
  return SOURCE_PRIORITY[n] ?? 8;
}

function isButtonCap(capability) {
  const c = String(capability || '');
  return c === 'button' || c.startsWith('button.');
}

function isAlarmOrBinary(capability) {
  const c = String(capability || '');
  return c.startsWith('alarm_') || c === 'onoff' || c.startsWith('onoff.')
    || c === 'locked' || c === 'garagedoor_closed' || isButtonCap(c);
}

function echoWindowMs(capability) {
  const c = String(capability || '');
  if (c === 'measure_battery' || c === 'alarm_battery') {return 180000;}
  if (c === 'measure_temperature' || c === 'measure_humidity') {return 8000;}
  if (c === 'measure_power' || c === 'measure_current' || c === 'measure_voltage') {return 4000;}
  if (c === 'meter_power' || c.startsWith('meter_power')) {return 15000;}
  if (c === 'dim' || c === 'light_hue' || c === 'light_saturation') {return 1200;}
  if (isButtonCap(c)) {return 280;}
  if (isAlarmOrBinary(c)) {return 1500;}
  return 2000;
}

function softEqual(capability, a, b) {
  if (a === b) {return true;}
  if (typeof a === 'boolean' || typeof b === 'boolean') {return a === b;}
  if (typeof a !== 'number' || typeof b !== 'number' || !Number.isFinite(a) || !Number.isFinite(b)) {
    return String(a) === String(b);
  }
  const c = String(capability || '');
  const abs = Math.abs(a - b);
  if (c === 'measure_temperature') {return abs < 0.35;}
  if (c === 'measure_humidity') {return abs < 2.1;}
  if (c === 'measure_battery') {return abs < 2.1;}
  if (c === 'measure_luminance') {return abs < 40;}
  if (c === 'measure_power' || c === 'measure_current' || c === 'measure_voltage') {
    return abs < Math.max(1, Math.abs(b) * 0.03);
  }
  if (c === 'dim' || c.startsWith('light_')) {return abs < 0.02;}
  if (c.startsWith('meter_power')) {return abs < Math.max(0.01, Math.abs(b) * 0.001);}
  return abs < Math.max(0.05, Math.abs(b) * 0.02);
}

/**
 * Per-device fusion state attached on first use.
 * @param {object} device
 * @returns {{ last: Map<string, object>, stats: object }}
 */
function getFusionState(device) {
  if (!device._layerSignalFusion) {
    device._layerSignalFusion = {
      last: new Map(),
      stats: {
        total: 0,
        echo: 0,
        phantom: 0,
        priorityHold: 0,
        committed: 0,
      },
    };
  }
  return device._layerSignalFusion;
}

/**
 * Decide whether a multi-layer sample should reach L14 / Homey UI.
 *
 * @param {object} device
 * @param {string} capability
 * @param {*} value
 * @param {string} [source]
 * @param {{ now?: number, confidence?: number, dryRun?: boolean }} [opts]
 * @returns {{ commit: boolean, reason: string, source: string, agree?: boolean, winner?: string, echo?: boolean, phantom?: boolean }}
 */
function decide(device, capability, value, source = 'unknown', opts = {}) {
  if (!device || device._destroyed || capability == null || value === undefined) {
    return { commit: false, reason: 'guard', source: normalizeSource(source) };
  }

  const now = opts.now || Date.now();
  const dryRun = opts.dryRun === true;
  const src = normalizeSource(source);
  const state = getFusionState(device);
  if (!dryRun) {state.stats.total += 1;}

  const last = state.last.get(capability);
  const windowMs = echoWindowMs(capability);
  const pri = sourcePriority(src, device);

  // Phantom: soft estimates must not overwrite fresh hardware
  if (PHANTOM_SOURCES.has(src) && last && HARDWARE_SOURCES.has(last.source)) {
    const age = now - last.ts;
    const hardwareTtl = capability === 'measure_battery' ? 3600000 : Math.max(windowMs * 4, 60000);
    if (age < hardwareTtl) {
      if (!dryRun) {state.stats.phantom += 1;}
      return {
        commit: false,
        reason: softEqual(capability, value, last.value) ? 'phantom-echo' : 'phantom-blocked',
        source: src,
        phantom: true,
        winner: last.source,
      };
    }
  }

  if (last && (now - last.ts) < windowMs) {
    const same = softEqual(capability, value, last.value);
    const sameLayer = src === last.source;

    if (same && !sameLayer) {
      if (!dryRun) {
        state.stats.echo += 1;
        state.last.set(capability, {
          ...last,
          ts: now,
          agreeSources: [...(last.agreeSources || [last.source]), src],
        });
      }
      return {
        commit: false, reason: 'cross-layer-echo', source: src, echo: true, agree: true, winner: last.source,
      };
    }

    if (same && sameLayer) {
      if (!dryRun) {state.stats.echo += 1;}
      return {
        commit: false, reason: 'same-layer-spam', source: src, echo: true, winner: last.source,
      };
    }

    if (!same && pri > last.priority) {
      if (!dryRun) {state.stats.priorityHold += 1;}
      return {
        commit: false, reason: 'priority-hold', source: src, winner: last.source,
      };
    }

    if (!same && pri === last.priority && !isAlarmOrBinary(capability)) {
      if (!dryRun) {state.stats.echo += 1;}
      return {
        commit: false, reason: 'peer-thrash-hold', source: src, winner: last.source,
      };
    }
  }

  if (!dryRun) {
    state.last.set(capability, {
      value,
      source: src,
      priority: pri,
      ts: now,
      confidence: opts.confidence ?? 0.85,
      agreeSources: [src],
    });
    state.stats.committed += 1;
  }
  return { commit: true, reason: 'ok', source: src, winner: src };
}

/**
 * Note a sample without deciding (for ReceptionManager / SoftCap bookkeeping).
 */
function note(device, capability, value, source) {
  return decide(device, capability, value, source);
}

function getStats(device) {
  return getFusionState(device).stats;
}

function reset(device) {
  if (device?._layerSignalFusion) {
    device._layerSignalFusion.last.clear();
    device._layerSignalFusion.stats = {
      total: 0, echo: 0, phantom: 0, priorityHold: 0, committed: 0,
    };
  }
}

module.exports = {
  decide,
  note,
  getStats,
  reset,
  normalizeSource,
  sourcePriority,
  softEqual,
  echoWindowMs,
  SOURCE_ALIASES,
  SOURCE_PRIORITY,
  PHANTOM_SOURCES,
};
