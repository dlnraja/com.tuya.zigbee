'use strict';

/**
 * Build data/protocol_quirk_table.json from local scrape caches + curated
 * ZHA/Z2M protocol knowledge. Buffer JSON.parse for large files.
 *
 * Usage: node scripts/maintenance/build-protocol-quirk-table.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

function bufParse(rel) {
  const p = path.join(ROOT, rel);
  try {
    if (!fs.existsSync(p)) {return null;}
    if (typeof global.gc === 'function') {
      try { global.gc(); } catch (_e) { /* noop */ }
    }
    let buf = fs.readFileSync(p);
    const data = JSON.parse(buf);
    buf = null;
    if (typeof global.gc === 'function') {
      try { global.gc(); } catch (_e) { /* noop */ }
    }
    return data;
  } catch (_e) {
    return null;
  }
}

function fileMeta(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) {
    return { path: rel, bytes: 0, exists: false };
  }
  return { path: rel, bytes: fs.statSync(p).size, exists: true };
}

const z2m = bufParse('scripts/data/z2m-data.json') || {};
const dpDb = bufParse('data/dp_database.json') || {};

const exoticClusters = {
  '0xEF00': {
    id: 61184,
    name: 'tuya',
    aliases: ['tuya', 'tuyaManufacturer', 'manuSpecificTuya', 'tuyaSpecific', '61184', '0xEF00'],
    role: 'tuya_dp',
    cmds: { set: 0x00, get: 0x01, report: 0x02, query_all: 0x03, active: 0x06, time: 0x24 },
  },
  '0xE000': {
    id: 57344,
    name: 'tuyaE000',
    aliases: ['tuyaE000', 'tuyaMaintenance', '57344', '0xE000'],
    role: 'tuya_button_moes',
  },
  '0xE001': {
    id: 57345,
    name: 'tuyaE001',
    aliases: ['tuyaE001', '57345', '0xE001'],
    role: 'external_switch_type',
    attrs: { '0xD030': 'external_switch_type' },
  },
  '0xE002': {
    id: 57346,
    name: 'tuyaE002',
    aliases: ['tuyaE002', '57346', '0xE002'],
    role: 'tuya_sensor_alarms',
  },
  '0xE003': {
    id: 57347,
    name: 'tuyaE003',
    aliases: ['tuyaE003', '57347', '0xE003'],
    role: 'tuya_scene_button',
  },
  '0xE004': {
    id: 57348,
    name: 'zosungIRControl',
    aliases: ['zosungIRControl', '57348', '0xE004'],
    role: 'ir_control',
  },
  '0xED00': {
    id: 60672,
    name: 'zosungIRTransmit',
    aliases: ['zosungIRTransmit', '60672', '0xED00'],
    role: 'ir_transmit',
  },
  '0x1888': {
    id: 6280,
    name: 'manuSpecific1888',
    aliases: ['6280', '0x1888'],
    role: 'mfr_specific',
  },
  '0xFC11': { id: 64529, name: 'manuSpecificSonoff', role: 'sonoff' },
  '0xFC01': { id: 64513, name: 'manuSpecificLegrand', role: 'legrand' },
  '0xFC00': { id: 64512, name: 'manuSpecificUbisys', role: 'ubisys' },
  '0xFC40': { id: 64576, name: 'manuSpecificSchneider', role: 'schneider' },
  '0xFCAC': { id: 64684, name: 'manuSpecificBosch', role: 'bosch' },
};

const initSequences = {
  tuya_magic_packet: {
    id: 'tuya_magic_packet',
    when: ['pair', 'rejoin', 'interview_miss'],
    cluster: 0x0000,
    action: 'readAttributes',
    attrs: [0x0004, 0x0000, 0x0001, 0x0005, 0x0007, 0xfffe],
    models: ['TS0001', 'TS0002', 'TS0003', 'TS0004', 'TS0041', 'TS0042', 'TS0043', 'TS0044', 'TS004F', 'TS011F', 'TS0601'],
    sources: ['z2m_configureMagicPacket', 'zha_tuya_quirks', 'tuyaos_1651'],
  },
  tuya_query_all_dps: {
    id: 'tuya_query_all_dps',
    when: ['after_magic', 'interview_miss', 'stale_state'],
    cluster: 0xEF00,
    action: 'command',
    cmd: 0x03,
    mfrPrefix: ['_TZE200_', '_TZE204_', '_TZE284_', '_TZE300_'],
    models: ['TS0601'],
    sources: ['z2m', 'zha'],
  },
  tuya_time_sync: {
    id: 'tuya_time_sync',
    when: ['mcu_time_req', 'trv_init', 'lcd_sensor'],
    cluster: 0xEF00,
    action: 'time_sync_cmd_0x24',
    mfrPrefix: ['_TZE200_', '_TZE204_', '_TZE284_'],
    sources: ['TuyaTimeSyncFormats', 'zha'],
  },
  ias_cie_enroll: {
    id: 'ias_cie_enroll',
    when: ['pair', 'interview_miss'],
    cluster: 0x0500,
    action: 'write_cie_and_enroll',
    models: ['TS0202', 'TS0203', 'TS0205', 'TS0210', 'TS0215', 'TS0215A', 'TS0216'],
    sources: ['zha', 'homey_ieee_enrollment'],
  },
  e001_external_switch_read: {
    id: 'e001_external_switch_read',
    when: ['pair'],
    cluster: 0xE001,
    action: 'readAttributes',
    attrs: [0xD030],
    sources: ['zha'],
  },
  ts004f_scene_mode: {
    id: 'ts004f_scene_mode',
    when: ['pair'],
    cluster: 0x0006,
    action: 'listen_mfr_cmds',
    cmds: [0xFC, 0xFD],
    models: ['TS004F'],
    sources: ['zha', 'z2m'],
  },
  metering_divisor_fix: {
    id: 'metering_divisor_fix',
    when: ['pair', 'energy_init'],
    cluster: 0x0702,
    action: 'readAttributes',
    attrs: [0x0301, 0x0302],
    models: ['TS0121', 'TS011F'],
    sources: ['zha_TuyaZBMeteringCluster'],
  },
  electrical_current_divisor: {
    id: 'electrical_current_divisor',
    when: ['pair', 'energy_init'],
    cluster: 0x0B04,
    action: 'readAttributes',
    attrs: [0x0602, 0x0603],
    models: ['TS0121', 'TS011F'],
    sources: ['zha_TuyaZBElectricalMeasurement'],
  },
};

const dpQuirks = {
  battery_candidates: [2, 3, 4, 6, 14, 15, 101, 26],
  battery_voltage_dp: [26, 101],
  backlight_string_only: {
    dp: 15,
    values: ['off', 'normal', 'inverted'],
    map: { off: 0, normal: 1, inverted: 2 },
  },
  power_on_behavior: { dp: 14, enum: ['off', 'on', 'last'] },
  cover_control_zha: {
    dp: 1,
    map: { open: 0, stop: 1, close: 2 },
    note: 'ZHA WINDOW_COVER mapping differs from naive ZCL order',
  },
  trv_standard: { setpoint: 4, local_temp: 5, battery: 6, child_lock: 7 },
  trv_avatto_me167: {
    setpoint: 2,
    local_temp: 38,
    mfr: ['_TZE200_p3dbf6qs', '_TZE200_hvaxb2tc'],
  },
  double_division_guard: {
    note: 'Never /100 then /100; use SmartDivisorManager',
    dps: [18, 19, 22],
  },
  common_from_dp_database: Object.keys(dpDb).slice(0, 40).map(Number),
};

const modelExpectedClusters = {
  TS0601: [0xEF00, 0x0000],
  TS004F: [0x0006, 0x0008, 0xE000, 0xE001],
  TS0041: [0x0006, 0xE000],
  TS0042: [0x0006, 0xE000],
  TS0043: [0x0006, 0xE000],
  TS0044: [0x0006, 0xE000],
  TS0001: [0x0006, 0xE000, 0xE001],
  TS0002: [0x0006, 0xE000, 0xE001],
  TS0003: [0x0006, 0xE000, 0xE001],
  TS0004: [0x0006, 0xE000, 0xE001],
  TS011F: [0x0006, 0x0702, 0x0B04, 0xE000, 0xE001],
  TS0121: [0x0006, 0x0702, 0x0B04],
  TS0202: [0x0500, 0x0001],
  TS0203: [0x0500, 0x0001],
  TS130F: [0x0102],
  TS0505B: [0x0006, 0x0008, 0x0300],
};

const mfrQuirks = {};
for (const [mfr, prof] of Object.entries(z2m.dp || {})) {
  const dps = Array.isArray(prof.dps) ? prof.dps : [];
  const names = dps.map((d) => (d && d.n) || '').filter(Boolean);
  const high = dps.filter((d) => Number(d.d) >= 100).map((d) => d.d);
  const battery = dps
    .filter((d) => /battery|voltage/i.test(d.n || ''))
    .map((d) => ({ dp: d.d, name: d.n }));
  const flags = [];
  if (battery.length) {flags.push('battery_dp');}
  if (high.length >= 3) {flags.push('extended_dp');}
  if (/water|flow|consume/i.test(names.join(','))) {flags.push('metering_dp');}
  if (!flags.length) {continue;}
  mfrQuirks[mfr] = {
    model: prof.model || null,
    init: ['tuya_magic_packet', 'tuya_query_all_dps'],
    clusters: (prof.model === 'TS0601') ? [0xEF00] : [],
    battery_dps: battery,
    high_dps: high.slice(0, 20),
    flags,
  };
  if (Object.keys(mfrQuirks).length >= 120) {break;}
}

const sources = {
  inventoried_at: new Date().toISOString(),
  caches: [
    { ...fileMeta('scripts/data/z2m-data.json'), used: true },
    { ...fileMeta('scripts/data/zha-data.json'), used: false, note: 'thin stub' },
    { ...fileMeta('scripts/data/zha-full-data.json'), used: false, note: 'thin stub' },
    { ...fileMeta('scripts/data/deconz-data.json'), used: false, note: 'empty' },
    { ...fileMeta('scripts/data/zha-quirkbuilder-data.json'), used: false, note: 'empty' },
    { ...fileMeta('data/dp_registry.json'), used: 'runtime_lookup' },
    { ...fileMeta('data/dp_database.json'), used: true },
    { ...fileMeta('data/z2m_expose_gap_report.json'), used: false },
    { ...fileMeta('lib/data/z2m_devices_full.json'), used: false },
    { path: 'docs/ZHA_Z2M_QUIRKS_ANALYSIS.md', used: true },
    { path: 'lib/zigbee/ExoticQuirkEngine.js', used: true },
    { path: 'lib/clusters/UniversalClusterBinder.js', used: true },
  ],
  z2m_stats: z2m.stats || null,
  dp_database_keys: Object.keys(dpDb).length,
};

const table = {
  version: '1.0.0',
  generated: new Date().toISOString(),
  description:
    'Protocol quirk table for HomeyCompensationLayer / ProtocolFallbackChain — exotic clusters, DP init, interview-miss expectations. Loaded via Buffer JSON.parse.',
  sources,
  exoticClusters,
  initSequences,
  dpQuirks,
  modelExpectedClusters,
  mfrQuirks,
  fallbackOrder: {
    tx: [
      'wrapper_manager',
      'sdk3_direct',
      'quirk_guided',
      'raw_zcl_frame',
      'magic_handshake_retry',
      'poll_heuristic',
    ],
    rx: [
      'capability_listener',
      'zcl_attr_report',
      'tuya_dp_report',
      'raw_frame_parse',
      'raw_cluster_fallback',
      'poll_heuristic',
    ],
  },
  interviewMiss: {
    syntheticAliases: true,
    neverInventFingerprints: true,
    compensateClusters: [0xEF00, 0xE000, 0xE001, 0xE002, 0xE003, 0xED00, 0x0500],
  },
  flowCompensation: {
    coordinateWith: 'lib/drivers/ZigBeeDriverFlowCardPatch.js',
    doNotRepatchZigBeeDriver: true,
    stubGetters: [
      'getDeviceTriggerCard',
      'getTriggerCard',
      'getDeviceActionCard',
      'getActionCard',
      'getDeviceConditionCard',
      'getConditionCard',
    ],
  },
};

const outPath = path.join(ROOT, 'data', 'protocol_quirk_table.json');
fs.writeFileSync(outPath, JSON.stringify(table));

const statePath = path.join(ROOT, '.github', 'state', 'protocol-quirk-sources.json');
fs.mkdirSync(path.dirname(statePath), { recursive: true });
fs.writeFileSync(statePath, `${JSON.stringify({
  version: '1.0.0',
  generated: table.generated,
  quirkTable: 'data/protocol_quirk_table.json',
  caches: sources.caches,
  mfrQuirkCount: Object.keys(mfrQuirks).length,
  exoticClusterCount: Object.keys(exoticClusters).length,
  initSequenceCount: Object.keys(initSequences).length,
}, null, 2)}\n`);

console.log(`Wrote ${path.relative(ROOT, outPath)} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
console.log(`mfrQuirks=${Object.keys(mfrQuirks).length} exotic=${Object.keys(exoticClusters).length}`);
