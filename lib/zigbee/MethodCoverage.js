'use strict';

/**
 * P3017: MethodCoverage — the 20 indirect/alternative methods applied to every capability of every
 * device family, plus a generic per-capability READ/REFRESH chain built on MethodChain.
 *
 * Inspired by (rewritten, credited in CREDITS.md / KB comparison table):
 *  - Z2M tuya.ts: onEvent mcuSyncTime(0x24) answer, configureMagicPacket, dataQuery(0x03) on
 *    start, poll-on-interval for TS011F meters, fz.ignore_* for private chatter;
 *  - ZHA quirks: TuyaNewManufCluster DP→attribute mapping, TSN dedup, private 0xE000/0xE001;
 *  - deCONZ DDF: per-item "read"/"parse" fallbacks (zcl | tuya | ias) + refresh.interval polling;
 *  - kkossev (Hubitat): ping/health-check, refresh() polling when reporting is silent, magic;
 *  - SmartThings Edge: health-check poll of the "main" attribute, device-type fallbacks;
 *  - tuya-local / localtuya / tinytuya: per-device DP maps, "updatedps"/dataQuery refresh,
 *    unknown DPs exposed raw with type;
 *  - Tasmota / ESPHome: unknown attributes/DPs logged with type + raw, heartbeat keep-alive.
 *
 * Contract: additive (never adds/removes capabilities), never throws, bounded memory (MethodChain).
 */

const MC = require('./MethodChain');

/** The 20 methods, grouped. `impl` = module (relative to lib/zigbee) + export proving it exists. */
const METHODS = Object.freeze([
  { id: 'read.zcl_attr', group: 'read', tier: 'zcl-native', impl: ['./MethodChain', 'standardReadSteps'] },
  { id: 'read.ef00_dp', group: 'read', tier: 'tuya-dp', impl: ['./MethodCoverage', 'refreshCapability'] },
  { id: 'read.private_cluster', group: 'read', tier: 'tuya-private', impl: ['./MethodCoverage', 'PRIVATE_READS'] },
  { id: 'read.alt_endpoint', group: 'read', tier: 'alt-endpoint', impl: ['./MethodChain', 'standardReadSteps'] },
  { id: 'read.polling', group: 'read', tier: 'poll', impl: ['./FallbackChains', 'readSensorWithFallbacks'] },
  { id: 'read.dataquery_0x03', group: 'read', tier: 'magic-query', impl: ['./MethodChain', 'standardReadSteps'] },
  { id: 'read.derived', group: 'read', tier: 'derived', impl: ['./MethodCoverage', 'DERIVED'] },
  { id: 'write.zcl_cmd_to_dp', group: 'write', impl: ['./CapabilityCommandRouter', 'writeCapabilityWithFallbacks'] },
  { id: 'write.attr_vs_cmd', group: 'write', impl: ['./CapabilityCommandRouter', 'writeCapabilityWithFallbacks'] },
  { id: 'write.mfr_specific', group: 'write', impl: ['./ZclFrameHeader', 'parseZclHeader'] },
  { id: 'startup.magic_packet', group: 'startup', impl: ['./TuyaMagicPacket', 'sendTuyaMagicPacket'] },
  { id: 'startup.time_sync_0x24', group: 'startup', impl: ['../tuya/TuyaMcuTimeService', 'buildEf00TimePayload'] },
  { id: 'startup.reporting_to_polling', group: 'startup', impl: ['./FallbackChains', 'readSensorWithFallbacks'] },
  { id: 'unknown.unsupported_memory', group: 'unknown', impl: ['./UnsupportedRegistry', 'getRegistry'] },
  { id: 'unknown.interpreter', group: 'unknown', impl: ['./UnknownCommandInterpreter', 'interpretDp'] },
  { id: 'unknown.learning', group: 'unknown', impl: ['./UnknownLearning', 'teach'] },
  { id: 'unknown.flow_event', group: 'unknown', impl: ['../flow/UnknownCommandFlowCards', 'register'] },
  { id: 'chain.failover_winner', group: 'chain', impl: ['./MethodChain', 'runChain'] },
  { id: 'chain.reprobe_backoff', group: 'chain', impl: ['./MethodChain', 'BACKOFF_MS'] },
  { id: 'chain.never_remove_caps', group: 'chain', impl: ['./MethodChain', 'runChain'] },
]);

/** Family → capabilities. Methods that physically cannot apply are 'n/a' (with the reason). */
const FAMILIES = Object.freeze({
  switch_plug: { caps: ['onoff', 'measure_power', 'meter_power', 'measure_voltage', 'measure_current'], private: true },
  dimmer_light: { caps: ['onoff', 'dim', 'light_temperature', 'light_hue', 'light_saturation'], private: true },
  cover: { caps: ['windowcoverings_set', 'windowcoverings_state'], private: true },
  thermostat_trv: { caps: ['target_temperature', 'measure_temperature', 'thermostat_mode', 'measure_battery'] },
  climate_sensor: { caps: ['measure_temperature', 'measure_humidity', 'measure_battery', 'measure_luminance'], private: true, sleepy: true },
  motion_presence: { caps: ['alarm_motion', 'measure_luminance', 'measure_battery'], sleepy: true },
  ias_contact_water_smoke: { caps: ['alarm_contact', 'alarm_water', 'alarm_smoke', 'alarm_tamper', 'measure_battery'], sleepy: true, readOnly: true },
  button_remote: { caps: ['measure_battery'], sleepy: true, readOnly: true, events: true },
  meter_din: { caps: ['meter_power', 'measure_power', 'measure_voltage', 'measure_current', 'onoff'] },
  valve_irrigation: { caps: ['onoff', 'measure_battery', 'meter_water'] },
  siren: { caps: ['onoff', 'alarm_generic', 'measure_battery'] },
  lock: { caps: ['locked', 'measure_battery'] },
  fan: { caps: ['onoff', 'fan_speed'] },
  soil: { caps: ['measure_humidity', 'measure_temperature', 'measure_battery'], sleepy: true, readOnly: true },
});

/**
 * P3019: sourced complementary layers that make a method apply to a family whose generic rule says
 * 'n/a'. Each entry points at the real module/export (checked by _implOk, relative to lib/zigbee)
 * and names its source. Optional only: never needed at pairing, never removes anything. When the
 * module is absent on a branch, the generic rule applies again (no 'missing').
 */
const EXTRA_LAYERS = Object.freeze({
  button_remote: {
    'read.private_cluster': [{ impl: ['../buttons/attachButtonPaths', 'initModeForNewDevice'], what: 'genOnOff 0x8004 tuyaOperationMode read (TS004F family, passive + one read for new devices)', src: 'z2m tuya.ts TS004F operation_mode (genOnOff tuyaOperationMode 0x8004); ZHA TuyaSmartRemoteOnOffCluster' }],
    'write.attr_vs_cmd': [{ impl: ['./DeviceOperatingMode', 'writeOperationMode'], what: 'genOnOff 0x8004 attribute write when the user changes button_mode (writeAttributes, then raw fallback)', src: 'z2m tuya.ts TS004F operation_mode (write genOnOff tuyaOperationMode)' }],
  },
  valve_irrigation: {
    'write.mfr_specific': [{ impl: ['../tuya/Ts0049Countdown', 'sendCountdown'], what: '0xE001 setCountdown 0xFE (HZ-WT02, TS0049 _TZ3000_kz1anoi8), opt-in setting ts0049_water_countdown', src: 'z2m tuya.ts HZ-WT02 manuSpecificTuyaE001 setCountdown 0xFE (tzLocal/fzLocal.ts0049_countdown)' }],
  },
});

/**
 * P3019: why each remaining 'n/a' cell stays 'n/a' after the P3019 cross-source pass
 * (Z2M tuya.ts, ZHA quirks, deCONZ DDF, kkossev, SmartThings Edge, tuya-local, Johan + forks).
 * Keyed `${family}|${methodId}`. Generic reasons per method are used when no specific one exists.
 */
const NA_REASONS = Object.freeze({
  'read.private_cluster': 'no private-cluster attribute is defined for these capabilities in Z2M/ZHA',
  'read.derived': 'none of the family capabilities can be computed from siblings (alarm_battery is not derived: project rule, never both alarm_battery and measure_battery)',
  'write.zcl_cmd_to_dp': 'read-only family (sensor/event device): nothing to write',
  'write.attr_vs_cmd': 'read-only family (sensor/event device): nothing to write',
  'write.mfr_specific': 'no manufacturer-specific write found for this family in Z2M/ZHA/deCONZ',
  'motion_presence|read.private_cluster': 'radar/PIR settings travel as EF00 DPs (M2), no private ZCL attribute in Z2M/ZHA',
  'ias_contact_water_smoke|read.private_cluster': 'IAS zone only; Tuya extras (sensitivity DP9) are EF00 DPs, covered by M2',
  'ias_contact_water_smoke|write.zcl_cmd_to_dp': 'sleepy IAS sensors; sensitivity DP9 is read-only in the drivers (no sourced write path)',
  'ias_contact_water_smoke|write.attr_vs_cmd': 'sleepy IAS sensors; no writable attribute used by Z2M for this family',
  'button_remote|write.zcl_cmd_to_dp': 'remotes have no capability to command; mode change is an attribute write (M9)',
  'button_remote|write.mfr_specific': 'E001 0xD020 switch_mode belongs to wall switches (TS0726/TS0012), not remotes',
  'lock|read.private_cluster': 'Tuya locks use EF00 DPs (M2) or standard doorLock; no private ZCL attribute sourced',
  'soil|read.derived': 'no derivable capability (moisture/temperature/battery are measured)',
  'soil|write.zcl_cmd_to_dp': 'calibration DPs exist (Z2M) but Homey soil settings are software offsets: writing them too would apply the offset twice',
  'soil|write.attr_vs_cmd': 'sleepy EF00-only sensor: no ZCL attribute to write',
  'soil|write.mfr_specific': 'no private-cluster write for soil sensors in Z2M/ZHA',
  'thermostat_trv|write.mfr_specific': 'TRV settings are EF00 DPs (M8); no private-cluster write sourced',
  'meter_din|write.mfr_specific': 'DIN meters use EF00 DPs or standard ZCL; no private-cluster write sourced',
  'siren|write.mfr_specific': 'sirens use EF00 DPs or IAS WD; no private-cluster write sourced',
  'fan|write.mfr_specific': 'fans use EF00 DPs or fanControl; no private-cluster write sourced',
  'lock|write.mfr_specific': 'locks use EF00 DPs or doorLock; no private-cluster write sourced',
  'motion_presence|write.mfr_specific': 'radar settings are EF00 DPs (M8); no private-cluster write sourced',
  'valve_irrigation|write.mfr_specific': 'only HZ-WT02 has a sourced 0xE001 write; its helper is not on this branch',
});

/** Reason for an 'n/a' cell (specific first, then generic). */
function naReason(family, methodId) {
  return NA_REASONS[`${family}|${methodId}`] || NA_REASONS[methodId] || 'not applicable';
}

/** Extra layers that apply on this branch (module present) for family × method. */
function extraLayers(family, methodId) {
  const l = (EXTRA_LAYERS[family] || {})[methodId] || [];
  return l.filter((x) => _implOk(x.impl));
}

/** Capability → ZCL read spec (cluster label, numeric id, attribute). */
const CAP_READ = Object.freeze({
  onoff: ['onOff', 0x0006, 'onOff'],
  dim: ['levelControl', 0x0008, 'currentLevel'],
  light_temperature: ['colorControl', 0x0300, 'colorTemperatureMireds'],
  light_hue: ['colorControl', 0x0300, 'currentHue'],
  light_saturation: ['colorControl', 0x0300, 'currentSaturation'],
  windowcoverings_set: ['windowCovering', 0x0102, 'currentPositionLiftPercentage'],
  target_temperature: ['thermostat', 0x0201, 'occupiedHeatingSetpoint'],
  measure_temperature: ['temperatureMeasurement', 0x0402, 'measuredValue'],
  measure_humidity: ['relativeHumidity', 0x0405, 'measuredValue'],
  measure_luminance: ['illuminanceMeasurement', 0x0400, 'measuredValue'],
  measure_battery: ['powerConfiguration', 0x0001, 'batteryPercentageRemaining'],
  measure_power: ['electricalMeasurement', 0x0B04, 'activePower'],
  measure_voltage: ['electricalMeasurement', 0x0B04, 'rmsVoltage'],
  measure_current: ['electricalMeasurement', 0x0B04, 'rmsCurrent'],
  meter_power: ['metering', 0x0702, 'currentSummationDelivered'],
  alarm_contact: ['iasZone', 0x0500, 'zoneStatus'],
  alarm_water: ['iasZone', 0x0500, 'zoneStatus'],
  alarm_smoke: ['iasZone', 0x0500, 'zoneStatus'],
  alarm_motion: ['iasZone', 0x0500, 'zoneStatus'],
  alarm_tamper: ['iasZone', 0x0500, 'zoneStatus'],
  locked: ['doorLock', 0x0101, 'lockState'],
  fan_speed: ['fanControl', 0x0202, 'fanMode'],
});

/**
 * Tuya private-cluster reads (Z2M tuyaClusters / ZHA quirks), used as tier 'tuya-private'.
 * Only attributes whose meaning is sourced; value semantics stay with the driver.
 */
const PRIVATE_READS = Object.freeze({
  onoff: [{ cluster: 0xE001, attr: 'powerOnBehavior', src: 'z2m manuSpecificTuya3 0xD010' }, { cluster: 0x0006, attr: 'tuyaBacklightSwitch', src: 'z2m genOnOff 0x5000' }],
  windowcoverings_set: [{ cluster: 0x0102, attr: 'tuyaMovingState', src: 'z2m closuresWindowCovering 0xF000' }],
  measure_temperature: [{ cluster: 0xE002, attr: 'alarmTemperature', src: 'z2m manuSpecificTuya2 0xD006' }],
  measure_humidity: [{ cluster: 0xE002, attr: 'alarmHumidity', src: 'z2m manuSpecificTuya2 0xD00F' }],
});

/** Computed values from sibling capabilities (last resort, never written back to the device). */
const DERIVED = Object.freeze({
  measure_power: (get) => { const v = get('measure_voltage'); const i = get('measure_current'); return Number.isFinite(v) && Number.isFinite(i) ? Math.round(v * i * 10) / 10 : null; },
  measure_current: (get) => { const p = get('measure_power'); const v = get('measure_voltage'); return Number.isFinite(p) && Number.isFinite(v) && v > 0 ? Math.round((p / v) * 1000) / 1000 : null; },
  alarm_battery: (get) => { const b = get('measure_battery'); return Number.isFinite(b) ? b <= 20 : null; },
  onoff: (get) => { const p = get('measure_power'); return Number.isFinite(p) ? p > 0.5 : null; },
});

function _cap(device, c) {
  try { return device && typeof device.hasCapability === 'function' && device.hasCapability(c) ? device.getCapabilityValue(c) : null; } catch (_e) { return null; }
}

function _couple(device) {
  try {
    const s = (k) => (typeof device.getSetting === 'function' ? device.getSetting(k) : null) || (typeof device.getStoreValue === 'function' ? device.getStoreValue(k) : null);
    return `${String(s('zb_manufacturer_name') || '')}|${String(s('zb_model_id') || s('zb_product_id') || '').toUpperCase()}`;
  } catch (_e) { return '|'; }
}

/** Z2M tuyaDatapoints names → Homey capability (for couples without project research). */
const NAME_CAP = Object.freeze({
  state: 'onoff', state_l1: 'onoff', brightness: 'dim', position: 'windowcoverings_set',
  temperature: 'measure_temperature', local_temperature: 'measure_temperature', humidity: 'measure_humidity',
  battery: 'measure_battery', illuminance: 'measure_luminance', illuminance_lux: 'measure_luminance',
  power: 'measure_power', voltage: 'measure_voltage', current: 'measure_current', energy: 'meter_power',
  current_heating_setpoint: 'target_temperature', occupancy: 'alarm_motion', presence: 'alarm_motion',
  contact: 'alarm_contact', water_leak: 'alarm_water', smoke: 'alarm_smoke', tamper: 'alarm_tamper',
  soil_moisture: 'measure_humidity', alarm: 'alarm_generic', child_lock: 'child_lock',
});

let _cat = null;
/** DP for a capability on this couple: project research first, then Z2M DP names (shipped catalog). */
function dpForCapability(device, capability) {
  try {
    const [mfr, pid] = _couple(device).split('|');
    // P3023: sharded per-couple lookup (CatalogStore) before the whole catalogue.
    let cc;
    try { cc = require('../memory/CatalogStore').couple(mfr, pid); } catch (_e) { cc = undefined; }
    if (cc !== undefined) {
      if (!cc) { return null; }
      if (cc.caps && Number.isFinite(cc.caps[capability])) { return cc.caps[capability]; }
      const hit = cc.rows.find((r) => NAME_CAP[r.name] === capability);
      return hit ? hit.dp : null;
    }
    if (_cat === null) { try { _cat = require('./data/unknown-dp-catalog.json'); } catch (_e) { _cat = false; } }
    if (!_cat) { return null; }
    const key = `${mfr.toLowerCase()}|${pid.toUpperCase()}`;
    const own = _cat.caps && _cat.caps[key];
    if (own && Number.isFinite(own[capability])) { return own[capability]; }
    const pi = _cat.idx && _cat.idx[key];
    const prof = Number.isInteger(pi) ? _cat.profiles[pi] : null;
    for (let i = 0; prof && i < prof.length; i += 2) { if (NAME_CAP[_cat.names[prof[i + 1]]] === capability) { return prof[i]; } }
  } catch (_e) { /* soft */ }
  return null;
}

function _ef00(device) { return device && (device.tuyaEF00Manager || device._tuyaEF00Manager) || null; }

/**
 * Build the full ordered read chain for one capability on this device.
 * @returns {Array} MethodChain steps
 */
function stepsForCapability(device, capability, opts = {}) {
  const spec = CAP_READ[String(capability).split('.')[0]];
  const ep = opts.endpoint || (() => { try { return require('../utils/endpointCapability').endpointForCapability(capability); } catch (_e) { return 1; } })();
  const eps = (device && device.zclNode && device.zclNode.endpoints) || {};
  const named = spec && eps[ep] && eps[ep].clusters ? eps[ep].clusters[spec[0]] : null;
  const dp = opts.dp || dpForCapability(device, capability);
  const priv = PRIVATE_READS[capability] || [];
  const derive = DERIVED[capability];
  return MC.standardReadSteps(device, {
    cluster: named,
    clusterLabel: spec ? spec[0] : capability,
    clusterId: spec ? spec[1] : undefined,
    attribute: spec ? spec[2] : capability,
    endpoint: ep,
    dpRead: dp ? async () => {
      const m = _ef00(device);
      if (!m || typeof m.requestDP !== 'function') { throw Object.assign(new Error('UNSUPPORTED_CLUSTER'), { status: 0x81 }); }
      await m.requestDP(dp, { force: true });
      return { requested: dp }; // value arrives through the normal DP report path
    } : undefined,
    privateRead: priv.length ? async () => {
      for (const p of priv) {
        const c = eps[ep] && eps[ep].clusters && (eps[ep].clusters[p.cluster] || eps[ep].clusters[String(p.cluster)]);
        if (c && typeof c.readAttributes === 'function') {
          // eslint-disable-next-line no-await-in-loop
          try { const d = await c.readAttributes([p.attr]); if (d && d[p.attr] !== undefined) { return { [p.attr]: d[p.attr], src: p.src }; } } catch (_e) { /* next */ }
        }
      }
      return null;
    } : undefined,
    derive: derive ? async () => derive((c) => _cap(device, c)) : undefined,
    magic: opts.magic,
  });
}

/**
 * Refresh one capability through every method in order (remembered winner, failover, re-probe).
 * Parallel-safe: callers may refresh several capabilities concurrently; per-capability domains
 * keep their own memory. Never adds/removes capabilities and never sets values itself.
 */
async function refreshCapability(device, capability, opts = {}) {
  const steps = stepsForCapability(device, capability, opts);
  return MC.runChain(device, `refresh.${capability}`, steps, { timeoutMs: opts.timeoutMs, now: opts.now });
}

/** Refresh many capabilities concurrently (complementary, additive merge of results). */
async function refreshAll(device, capabilities, opts = {}) {
  const caps = (Array.isArray(capabilities) ? capabilities : []).slice(0, 24);
  const settled = await Promise.allSettled(caps.map((c) => refreshCapability(device, c, opts)));
  const out = {};
  settled.forEach((s, i) => { out[caps[i]] = s.status === 'fulfilled' ? s.value : { ok: false, error: s.reason }; });
  return out;
}

function _implOk(impl) {
  const [mod, exp] = impl;
  try {
    const m = mod === './MethodCoverage' ? module.exports : require(mod);
    return exp === null ? !!m : m && m[exp] !== undefined;
  } catch (_e) { return false; }
}

function _status(fam, m, cap) {
  if (!_implOk(m.impl)) { return 'missing'; }
  if (m.id === 'read.private_cluster' && !PRIVATE_READS[cap] && !fam.private) { return 'n/a'; }
  if (m.id === 'read.derived' && !DERIVED[cap]) { return 'n/a'; }
  if (m.group === 'write' && fam.readOnly) { return 'n/a'; }
  if (m.id === 'write.mfr_specific' && !fam.private) { return 'n/a'; }
  if (m.id === 'read.zcl_attr' && !CAP_READ[cap]) { return 'dp-only'; }
  return 'yes';
}

/** Family × method coverage (aggregated over the family's capabilities). */
function coverageMatrix() {
  const rows = {};
  for (const [name, fam] of Object.entries(FAMILIES)) {
    rows[name] = {};
    for (const m of METHODS) {
      const st = fam.caps.map((c) => _status(fam, m, c));
      rows[name][m.id] = st.includes('missing') ? 'missing' : st.includes('yes') ? 'yes' : st[0];
      // P3019: a sourced complementary layer flips an 'n/a' cell (never a 'missing' one).
      if (rows[name][m.id] === 'n/a' && extraLayers(name, m.id).length) { rows[name][m.id] = 'yes'; }
    }
  }
  return rows;
}

/**
 * P3018: DP coverage of THIS device's couple. Each catalogue DP is classified:
 *   driver  — in dpMappings or named by the driver's own DP handler;
 *   exact   — catalogue converter decodes it exactly (interpreter / DpCatalogDecoder);
 *   generic — no exact converter → generic typed value, learned + exposed (never dropped).
 * `seen` = DPs actually received but not mapped (UnknownDPLogger), bounded.
 */
function dpCoverage(device) {
  const out = { couple: _couple(device), driver: [], exact: [], generic: [], seen: [] };
  try {
    const D = require('./DpCatalogDecoder');
    const [mfr, pid] = out.couple.split('|');
    const m = device && device.dpMappings && typeof device.dpMappings === 'object' ? device.dpMappings : {};
    for (const e of D.coupleDps(mfr, pid)) {
      if (Object.prototype.hasOwnProperty.call(m, e.dp) || D._customHandles(device, e.dp)) { out.driver.push(e.dp); continue; }
      const probe = /^(tf|onOff|bool|inv)\b/.test(e.conv || '') ? 1 : 0;
      if (e.conv && (D.decode(e.conv, probe) !== null || /^lookup:/.test(e.conv))) { out.exact.push(`${e.dp}:${e.name}:${e.conv}`); } else { out.generic.push(`${e.dp}:${e.name}`); }
    }
    const u = device && device._unknownDPs;
    const keys = u instanceof Map ? [...u.keys()] : u && typeof u === 'object' ? Object.keys(u) : [];
    out.seen = keys.map(Number).filter(Number.isInteger).slice(0, 64);
  } catch (_e) { /* soft */ }
  return out;
}

/** P3018: endpoint coverage — inventory of the live node + passive routing state (EndpointCoverage). */
function endpointCoverage(device) {
  try {
    const E = require('./EndpointCoverage');
    const inv = device && device.zclNode ? E.inventory(device.zclNode) : typeof device?.getStoreValue === 'function' ? device.getStoreValue('endpoint_inventory') : null;
    return { inventory: inv || null, runtime: E.snapshot(device) };
  } catch (_e) { return { inventory: null, runtime: null }; }
}

module.exports = { dpCoverage, endpointCoverage, NAME_CAP, METHODS, FAMILIES, CAP_READ, PRIVATE_READS, DERIVED, EXTRA_LAYERS, NA_REASONS, naReason, extraLayers, dpForCapability, stepsForCapability, refreshCapability, refreshAll, coverageMatrix };
