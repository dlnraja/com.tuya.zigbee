'use strict';

/**
 * P3016: UnknownCommandInterpreter. Gives a meaning to frames and DPs that no driver handles.
 *
 * Pure functions with no I/O and no device access. They never throw.
 *   interpretFrame(evt) → { action, button, value, decoded, confidence, source, exact, family }
 *   interpretDp(evt)    → same shape
 *
 * Order of precedence:
 *  1. EXACT decoders (exact: true). Each one is a documented ZCL, Z2M, ZHA or deCONZ semantic,
 *     or a per-couple decoder confirmed against real diag samples.
 *  2. FAMILY decoders (exact: false, confidence 0.5–0.7). The meaning is known for a device
 *     family, but the polarity or scale changes by couple.
 *  3. HEURISTICS by wire type (confidence ≤ 0.45). This is the fallback only.
 *
 * Sources (semantics rewritten here, nothing is copied):
 *  - ZCL r8 spec / zigbee-herdsman zspec cluster.ts: onOff 0x00–0x02 and 0x40–0x42;
 *    levelControl 0x00–0x07; scenes recall 0x05; colorControl 0x01/0x02/0x04/0x05/0x08/0x09/
 *    0x41/0x42/0x47/0x4B/0x4C.
 *  - Z2M lib/tuya.ts: genOnOff 0xFD tuyaAction (0 single / 1 double / 2 hold) and
 *    0xFC tuyaAction2 (0 rotate_right / 1 rotate_left) in fz.on_off_action / fz.multi_action;
 *    manuSpecificTuya (0xEF00) responses 0x01/0x02/0x05/0x06/0x11/0x13/0x15/0x24/0x25/0x60;
 *    manuSpecificTuya4 (0xE000) 0xF7/0xF8/0xFB timing commands; valueConverter.phaseVariant2.
 *  - ZHA zhaquirks/tuya: TuyaSmartRemoteOnOffCluster (0xFD press), TuyaZBE000Cluster,
 *    TuyaZBExternalSwitchTypeCluster (E001).
 *  - deCONZ: scene-id blocks on single-endpoint remotes (reused from ButtonEventRouter).
 *  - Diags harvested 22/08 to 21/09/2026 (Gmail): _TZE284_6ocnqlhn DP6 8-byte phase frames,
 *    wall thermostat DP36, radar DP113–117.
 * Full table: docs/knowledge/KB/UNKNOWN_COMMANDS.md
 */

let _ber = null;
function _router() {
  if (_ber === null) {
    try { _ber = require('../buttons/ButtonEventRouter'); } catch (_e) { _ber = false; }
  }
  return _ber || null;
}

const PRESS = Object.freeze({ 0: 'single', 1: 'double', 2: 'long' });

function toBuf(data) {
  try {
    if (Buffer.isBuffer(data)) { return data; }
    if (data && data.type === 'Buffer' && Array.isArray(data.data)) { return Buffer.from(data.data); }
    if (Array.isArray(data)) { return Buffer.from(data.map((n) => Number(n) & 0xff)); }
    if (typeof data === 'string') {
      const s = data.trim();
      if (/^[0-9a-f]*$/i.test(s) && s.length % 2 === 0) { return Buffer.from(s, 'hex'); }
      if (/^\d+(,\s*\d+)*$/.test(s)) { return Buffer.from(s.split(',').map((n) => Number(n) & 0xff)); }
    }
  } catch (_e) { /* soft */ }
  return Buffer.alloc(0);
}

function hex(n, w = 4) { return `0x${(Number(n) >>> 0).toString(16).toUpperCase().padStart(w, '0')}`; }

function result(o) {
  return {
    action: o.action || 'unknown',
    button: o.button == null ? null : Number(o.button),
    value: o.value === undefined ? null : o.value,
    decoded: o.decoded || null,
    confidence: Math.max(0, Math.min(1, Number(o.confidence) || 0)),
    source: o.source || 'heuristic',
    exact: o.exact === true,
    family: o.family || null,
  };
}

/* ------------------------------------------------------------------ ZCL frames */

const LEVEL_CMDS = {
  0x00: 'moveToLevel', 0x01: 'move', 0x02: 'step', 0x03: 'stop',
  0x04: 'moveToLevelWithOnOff', 0x05: 'moveWithOnOff', 0x06: 'stepWithOnOff', 0x07: 'stopWithOnOff',
};
const COLOR_CMDS = {
  0x01: 'moveHue', 0x02: 'stepHue', 0x04: 'moveSaturation', 0x05: 'stepSaturation',
  0x08: 'moveColor', 0x09: 'stepColor', 0x0A: 'moveToColorTemp', 0x41: 'enhancedMoveHue',
  0x42: 'enhancedStepHue', 0x47: 'stopMoveStep', 0x4B: 'moveColorTemp', 0x4C: 'stepColorTemp',
};
const EF00_RSP = {
  0x01: 'dataResponse', 0x02: 'dataReport', 0x05: 'activeStatusReportAlt', 0x06: 'activeStatusReport',
  0x11: 'mcuVersionResponse', 0x13: 'mcuOtaBlockDataRequest', 0x15: 'mcuOtaResult',
  0x24: 'mcuSyncTime', 0x25: 'mcuGatewayConnectionStatus', 0x60: 'tuyaWeatherRequest',
};

function _onOff(cmd, buf, ep) {
  const b = Number(ep) || 1;
  switch (cmd) {
  case 0x00: return result({ action: 'off', button: b, value: false, confidence: 0.95, source: 'zcl:onOff.off', exact: true, family: 'zcl_onoff' });
  case 0x01: return result({ action: 'on', button: b, value: true, confidence: 0.95, source: 'zcl:onOff.on', exact: true, family: 'zcl_onoff' });
  case 0x02: return result({ action: 'toggle', button: b, confidence: 0.95, source: 'zcl:onOff.toggle', exact: true, family: 'zcl_onoff' });
  case 0x40: return result({ action: 'off', button: b, value: false, decoded: { effectId: buf[0], variant: buf[1] }, confidence: 0.9, source: 'zcl:onOff.offWithEffect', exact: true, family: 'zcl_onoff' });
  case 0x41: return result({ action: 'on', button: b, value: true, confidence: 0.9, source: 'zcl:onOff.onWithRecallGlobalScene', exact: true, family: 'zcl_onoff' });
  case 0x42: return result({ action: 'on', button: b, value: true, decoded: buf.length >= 5 ? { onTimeS: buf.readUInt16LE(1) / 10, offWaitS: buf.readUInt16LE(3) / 10 } : null, confidence: 0.9, source: 'zcl:onOff.onWithTimedOff', exact: true, family: 'zcl_onoff' });
  case 0xFD: {
    const v = buf.length ? buf[0] : null;
    if (PRESS[v]) { return result({ action: PRESS[v], button: b, value: v, confidence: 0.95, source: 'z2m:tuya.on_off_action(0xFD)', exact: true, family: 'tuya_fd' }); }
    return result({ action: 'single', button: b, value: v, confidence: 0.4, source: 'z2m:tuya 0xFD out-of-range value', family: 'tuya_fd' });
  }
  case 0xFC: {
    const v = buf.length ? buf[0] : null;
    if (v === 0 || v === 1) { return result({ action: v === 0 ? 'rotate_right' : 'rotate_left', button: b, value: v, confidence: 0.95, source: 'z2m:tuya.multi_action(0xFC)', exact: true, family: 'tuya_fc' }); }
    // ZHA TuyaSmartRemoteOnOffCluster: 0xFC value 2 = rotate STOP (knob released).
    if (v === 2) { return result({ action: 'release', button: b, value: v, confidence: 0.9, source: 'zha:tuya TuyaSmartRemoteOnOffCluster rotate_type 2=stop', exact: true, family: 'tuya_fc' }); }
    return result({ action: 'rotate', button: b, value: v, confidence: 0.4, source: 'z2m:tuya 0xFC out-of-range value', family: 'tuya_fc' });
  }
  case 0xF0: // Z2M tuyaClusters genOnOff.tuyaCountdown (countdown buffer echo)
    return result({ action: 'config_echo', button: b, decoded: { command: 'tuyaCountdown', hex: buf.toString('hex').slice(0, 32) }, confidence: 0.8, source: 'z2m:tuya.ts genOnOff.tuyaCountdown(0xF0)', exact: true, family: 'tuya_private' });
  default: return null;
  }
}

function _level(cmd, buf, ep) {
  if (cmd === 0xF0) { // Z2M tuyaClusters genLevelCtrl.moveToLevelTuya {level u16, transtime u16}
    const level = buf.length >= 2 ? buf.readUInt16LE(0) : null;
    return result({ action: 'value', button: Number(ep) || 1, value: level, decoded: { command: 'moveToLevelTuya', level, transtime: buf.length >= 4 ? buf.readUInt16LE(2) : null }, confidence: 0.85, source: 'z2m:tuya.ts genLevelCtrl.moveToLevelTuya(0xF0)', exact: true, family: 'tuya_private' });
  }
  const name = LEVEL_CMDS[cmd];
  if (!name) { return null; }
  const b = Number(ep) || 1;
  const src = `zcl:levelControl.${name}`;
  if (cmd === 0x03 || cmd === 0x07) { return result({ action: 'release', button: b, confidence: 0.9, source: src, exact: true, family: 'level' }); }
  if (cmd === 0x01 || cmd === 0x05) {
    const up = buf[0] !== 1;
    return result({ action: 'long', button: b, value: up ? 'up' : 'down', decoded: { direction: up ? 'up' : 'down', rate: buf[1] }, confidence: 0.85, source: src, exact: true, family: 'level' });
  }
  if (cmd === 0x02 || cmd === 0x06) {
    const up = buf[0] !== 1;
    return result({ action: up ? 'rotate_right' : 'rotate_left', button: b, value: buf[1] ?? null, decoded: { direction: up ? 'up' : 'down', stepSize: buf[1], transitionDs: buf.length >= 4 ? buf.readUInt16LE(2) : null }, confidence: 0.85, source: src, exact: true, family: 'level' });
  }
  // moveToLevel: absolute value (slider / dimmer remotes)
  return result({ action: 'value', button: b, value: buf.length ? buf[0] : null, decoded: { level: buf[0], pct: buf.length ? Math.round(buf[0] / 2.54) : null }, confidence: 0.85, source: src, exact: true, family: 'level' });
}

function _scenes(cmd, buf, ep, ctx) {
  if (cmd !== 0x05) { return null; }
  const sceneId = buf.length >= 3 ? buf[2] : null;
  const groupId = buf.length >= 2 ? buf.readUInt16LE(0) : null;
  const r = _router();
  let btn = { button: Number(ep) || 1, type: 'single' };
  if (r && sceneId != null) { try { btn = r.sceneToButton(sceneId, ep, ctx.endpointCount, ctx.sceneMap) || btn; } catch (_e) { /* soft */ } }
  return result({ action: 'scene', button: btn.button, value: sceneId, decoded: { groupId, sceneId, press: btn.type }, confidence: 0.85, source: 'zcl:scenes.recall + deCONZ scene blocks', exact: true, family: 'scene_recall' });
}

const COLOR_PRIVATE = Object.freeze({ 0xE0: 'tuyaSetMinimumBrightness', 0xE1: 'tuyaMoveToHueAndSaturationBrightness2', 0xF0: 'tuyaRgbMode', 0xF9: 'tuyaOnStartUp', 0xFA: 'tuyaDoNotDisturb', 0xFB: 'tuyaOnOffTransitionTime' });

function _colorPrivate(cmd, buf, ep) {
  const name = COLOR_PRIVATE[cmd];
  const b = Number(ep) || 1;
  const decoded = { command: name, hex: buf.toString('hex').slice(0, 32) };
  if (cmd === 0xE0 && buf.length >= 2) { decoded.minimum = buf.readUInt16LE(0); }
  if (cmd === 0xE1 && buf.length >= 6) { decoded.hue = buf.readUInt16LE(0); decoded.saturation = buf.readUInt16LE(2); decoded.brightness = buf.readUInt16LE(4); }
  if (cmd === 0xF0 && buf.length >= 1) { decoded.mode = buf[0]; }
  if (cmd === 0xFB && buf.length >= 7) { decoded.onTransition = buf.readUIntBE(1, 3); decoded.offTransition = buf.readUIntBE(4, 3); }
  const action = cmd === 0xE1 ? 'value' : 'config_echo';
  return result({ action, button: b, value: cmd === 0xE1 ? decoded.brightness ?? null : null, decoded, confidence: 0.8, source: `z2m:tuya.ts lightingColorCtrl.${name}(${hex(cmd, 2)})`, exact: true, family: 'tuya_private' });
}

function _color(cmd, buf, ep) {
  if (COLOR_PRIVATE[cmd]) { return _colorPrivate(cmd, buf, ep); }
  const name = COLOR_CMDS[cmd];
  if (!name) { return null; }
  const b = Number(ep) || 1;
  const src = `zcl:colorControl.${name}`;
  if (cmd === 0x47) { return result({ action: 'release', button: b, confidence: 0.85, source: src, exact: true, family: 'color' }); }
  if (cmd === 0x0A) {
    const mired = buf.length >= 2 ? buf.readUInt16LE(0) : null;
    return result({ action: 'value', button: b, value: mired, decoded: { colorTempMired: mired }, confidence: 0.85, source: src, exact: true, family: 'color' });
  }
  const isStep = /^step/.test(name) || name === 'enhancedStepHue';
  const hasMode = [0x01, 0x02, 0x04, 0x05, 0x41, 0x42, 0x4B, 0x4C].includes(cmd);
  if (!hasMode) { // moveColor / stepColor carry signed X/Y rates, no direction byte
    return result({ action: isStep ? 'rotate' : 'long', button: b, decoded: { command: name }, confidence: 0.6, source: src, exact: true, family: 'color' });
  }
  if (buf[0] === 0 && !isStep) { return result({ action: 'release', button: b, confidence: 0.8, source: `${src} (mode stop)`, exact: true, family: 'color' }); }
  const up = buf[0] === 1; // ZCL 5.2.2.3: move/step mode 1 = up, 3 = down
  return result({
    action: !isStep ? 'long' : up ? 'rotate_right' : 'rotate_left',
    button: b,
    value: up ? 'up' : 'down',
    decoded: { command: name, mode: buf[0], arg: buf[1] },
    confidence: 0.75,
    source: src,
    exact: true,
    family: 'color',
  });
}

function _ef00(cmd, buf) {
  const name = EF00_RSP[cmd];
  if (!name) { return null; }
  const map = {
    dataResponse: 'dp', dataReport: 'dp', activeStatusReport: 'dp', activeStatusReportAlt: 'dp',
    mcuVersionResponse: 'version', mcuOtaBlockDataRequest: 'ota', mcuOtaResult: 'ota',
    mcuSyncTime: 'time_request', mcuGatewayConnectionStatus: 'gateway_status', tuyaWeatherRequest: 'weather_request',
  };
  const decoded = { command: name };
  if (map[name] === 'version' && buf.length >= 3) { const v = buf[2]; decoded.version = `${(v >> 6) & 3}.${(v >> 4) & 3}.${v & 0x0f}`; }
  return result({ action: map[name], decoded, confidence: 0.9, source: `z2m:manuSpecificTuya.${name}`, exact: true, family: 'tuya_ef00' });
}

function _e000(cmd, buf, ep) {
  const names = { 0xF7: 'setRandomTiming', 0xF8: 'setCycleTiming', 0xFB: 'setInchingSwitch' };
  if (names[cmd]) { return result({ action: 'config_echo', decoded: { command: names[cmd], hex: buf.toString('hex').slice(0, 32) }, confidence: 0.8, source: `z2m:manuSpecificTuya4.${names[cmd]}`, exact: true, family: 'tuya_e000' }); }
  // Remote endpoints (ZHA ts0042/ts0046 TuyaZBE000Cluster): command frames carry a press byte.
  const v = buf.length ? buf[0] : cmd;
  if (PRESS[v]) { return result({ action: PRESS[v], button: Number(ep) || 1, value: v, confidence: 0.45, source: 'heuristic:e000 press byte (ZHA TuyaZBE000Cluster remotes)', family: 'tuya_e000' }); }
  return null;
}

function _e001(cmd, buf) {
  const names = { 0xE5: 'setOptions1', 0xE6: 'setOptions2', 0xE7: 'setOptions3' };
  if (!names[cmd]) { return null; }
  return result({ action: 'config_echo', decoded: { command: names[cmd], hex: buf.toString('hex').slice(0, 32) }, confidence: 0.8, source: `z2m:manuSpecificTuya3.${names[cmd]}`, exact: true, family: 'tuya_e001' });
}

/** 0xE002 (manuSpecificTuya2, alarm thresholds) and 0x1888 (ZHA TuyaZB1888Cluster): private, semantics per couple. */
function _privateOpaque(cluster, cmd, buf) {
  const src = cluster === 0xE002 ? 'z2m:manuSpecificTuya2 (alarm thresholds 0xD006-0xD00F)' : 'zha:tuya TuyaZB1888Cluster (semantics unknown)';
  return result({ action: 'config_echo', decoded: { command: cmd, hex: buf.toString('hex').slice(0, 32) }, confidence: 0.4, source: src, family: 'tuya_private' });
}

function _basic(cmd) {
  if (cmd === 0xF0) { return result({ action: 'ignore', decoded: { command: 'tuyaSetup' }, confidence: 0.8, source: 'z2m:tuya.ts genBasic.tuyaSetup(0xF0)', exact: true, family: 'basic' }); }
  // Tuya sends private attribute reports on genBasic (0xFFDE/0xFFE2/0xFFE4…) and some MCU
  // frames on cmd 0x0A/0x01 that Homey cannot parse. Z2M ignores them (fz.ignore_basic_report).
  return result({ action: 'ignore', decoded: { note: 'tuya_basic_private', cmd }, confidence: 0.6, source: 'z2m:fz.ignore_basic_report', family: 'basic' });
}

function _heuristicFrame(cluster, cmd, buf, ep) {
  const b = Number(ep) || 1;
  if (buf.length <= 2) {
    const v = buf.length ? buf[0] : null;
    if (v != null && PRESS[v]) { return result({ action: PRESS[v], button: b, value: v, confidence: cluster >= 0xFC00 ? 0.35 : 0.25, source: 'heuristic:short payload press byte', family: 'heuristic' }); }
    if (v == null && PRESS[cmd]) { return result({ action: PRESS[cmd], button: b, confidence: 0.2, source: 'heuristic:command id as press', family: 'heuristic' }); }
    return result({ action: 'value', button: b, value: v, confidence: 0.2, source: 'heuristic:short payload value', family: 'heuristic' });
  }
  return result({ action: 'unknown', button: b, decoded: { length: buf.length }, confidence: 0.05, source: 'heuristic:opaque payload', family: 'heuristic' });
}

/**
 * @param {{clusterId:number, cmdId:number, data?:any, endpoint?:number, endpointCount?:number, sceneMap?:object}} evt
 */
function interpretFrame(evt = {}) {
  try {
    const cluster = Number(evt.clusterId);
    const cmd = Number(evt.cmdId);
    const buf = toBuf(evt.data);
    const ep = evt.endpoint;
    let r = null;
    if (cluster === 0x0006) { r = _onOff(cmd, buf, ep); }
    else if (cluster === 0x0008) { r = _level(cmd, buf, ep); }
    else if (cluster === 0x0005) { r = _scenes(cmd, buf, ep, evt); }
    else if (cluster === 0x0300) { r = _color(cmd, buf, ep); }
    else if (cluster === 0xEF00) { r = _ef00(cmd, buf); }
    else if (cluster === 0xE000) { r = _e000(cmd, buf, ep); }
    else if (cluster === 0xE001) { r = _e001(cmd, buf); }
    else if (cluster === 0xE002 || cluster === 0x1888) { r = _privateOpaque(cluster, cmd, buf); }
    else if (cluster === 0x0000) { r = _basic(cmd); }
    if (!r) { r = _heuristicFrame(cluster, Number.isFinite(cmd) ? cmd : -1, buf, ep); }
    r.decoded = Object.assign({ cluster: Number.isFinite(cluster) ? hex(cluster) : String(evt.clusterId), cmd: Number.isFinite(cmd) ? cmd : null }, r.decoded || {});
    return r;
  } catch (_e) {
    return result({ action: 'unknown', confidence: 0, source: 'error' });
  }
}

/* ------------------------------------------------------------------ EF00 DPs */

const WIRE = { 0: 'raw', 1: 'bool', 2: 'value', 3: 'string', 4: 'enum', 5: 'bitmap' };

function wireKind(datatype, value) {
  const w = WIRE[Number(datatype)];
  if (w) { return w; }
  if (typeof datatype === 'string' && Object.values(WIRE).includes(datatype.toLowerCase())) { return datatype.toLowerCase(); }
  if (typeof value === 'boolean') { return 'bool'; }
  if (typeof value === 'number') { return Number.isInteger(value) && value >= 0 && value <= 5 ? 'enum' : 'value'; }
  if (typeof value === 'string') { return 'string'; }
  if (Buffer.isBuffer(value) || Array.isArray(value) || (value && value.type === 'Buffer')) { return 'raw'; }
  return 'unknown';
}

/** Z2M valueConverter.phaseVariant2 layout (8 bytes): V u16 /10, I u24 mA, P u24 W. */
function decodePhaseVariant2(raw) {
  const b = toBuf(raw);
  if (b.length < 8) { return null; }
  const voltage = ((b[0] << 8) | b[1]) / 10;
  const current = ((b[2] << 16) | (b[3] << 8) | b[4]) / 1000;
  const power = (b[5] << 16) | (b[6] << 8) | b[7];
  if (!(voltage >= 80 && voltage <= 300) || current > 100 || power > 30000) { return null; }
  return { voltage, current, power };
}

const BUTTON_CLASS = /button|remote|scene|knob|wireless|switch_[0-9]gang_battery|sos/;
const RADAR_CLASS = /radar|presence|mmwave/;
const THERMO_CLASS = /thermostat|trv|radiator|heating/;
const METER_CLASS = /rcbo|din_rail|meter|breaker|energy|plug|socket/;

/**
 * Per-couple exact DP decoders. Each row is confirmed against the given source.
 * Key: `${mfr}|${pid}` lower-cased mfr, upper-cased pid.
 */
function _hexOf(v) { const b = toBuf(v); return b.length ? b.toString('hex') : null; }

const SINXPBRL_MODES = Object.freeze({ 0: 'white', 1: 'colour', 2: 'scene', 3: 'music' });
const SINXPBRL_SRC = 'Koenkk/zigbee2mqtt#31445 (YoshiWalsh Tuya schema) + JohanBendz/com.tuya.zigbee#1504';
const SINXPBRL_DP = Object.freeze({
  2: { kind: 'enum', decode: (v) => { const n = Number(v); return SINXPBRL_MODES[n] ? { work_mode: SINXPBRL_MODES[n] } : null; }, action: 'state', source: `${SINXPBRL_SRC} DP2 work_mode` },
  6: { kind: 'raw', decode: (v) => { const h = _hexOf(v); return h ? { scene_data: h } : null; }, action: 'state', source: `${SINXPBRL_SRC} DP6 scene_data` },
  7: { kind: 'value', decode: (v) => { const n = Number(v); return Number.isFinite(n) && n >= 0 && n <= 86400 ? { countdown_s: n } : null; }, action: 'value', source: `${SINXPBRL_SRC} DP7 countdown` },
  101: { kind: 'raw', decode: (v) => { if (typeof v === 'number' || typeof v === 'boolean') { return { power_memory: Number(v) }; } const h = _hexOf(v); return h ? { power_memory: h } : null; }, action: 'state', source: `${SINXPBRL_SRC} DP101 power-off memory` },
  102: { kind: 'bool', decode: (v) => { const b = Buffer.isBuffer(v) ? v[0] : v; if (b === true || b === 1 || b === '1') { return { do_not_disturb: true }; } if (b === false || b === 0 || b === '0') { return { do_not_disturb: false }; } return null; }, action: 'state', source: `${SINXPBRL_SRC} DP102 do_not_disturb` },
});

// ZS-SF00 rows are generated from the driver-side profile so the two never drift apart.
const ZS_SF00_DP = (() => {
  const P = require('../profiles/ZsSf00Profile');
  const rows = {};
  for (const dp of Object.keys(P.DPS)) {
    rows[dp] = { kind: 'value', decode: (v) => { const r = P.decode(Number(dp), v); return r ? { [r.capability || r.store]: r.value } : null; }, action: 'value', source: `${P.SOURCE} DP${dp}` };
  }
  return Object.freeze(rows);
})();

const COUPLE_DP = Object.freeze({
  // JohanBendz/com.tuya.zigbee #619 (TS0202 PIR + button): DP101 0/1/2 = single/double/hold,
  // DP102 0/1 = dark/bright; dedup on transaction id (device repeats the frame).
  '_tz3210_cwamkvua|TS0202': {
    101: { kind: 'enum', decode: (v) => { const n = Number(v); return PRESS[n] ? { action: PRESS[n], press: n } : null; }, action: 'single', button: 1, source: 'JohanBendz/com.tuya.zigbee#619 DP101 press' },
    102: { kind: 'enum', decode: (v) => { const n = Number(v); return n === 0 || n === 1 ? { illuminance: n === 0 ? 'dark' : 'bright' } : null; }, action: 'state', source: 'JohanBendz/com.tuya.zigbee#619 DP102 dark/bright' },
  },
  '_tze284_6ocnqlhn|TS0601': {
    6: { kind: 'raw', decode: decodePhaseVariant2, action: 'value', source: 'z2m:tuya.ts TO-Q-SYS-JZT [6, null, phaseVariant2] + Gmail diags 09/2026' },
  },
  // P3019: MC101Z PWM dimmer. Tuya product schema posted by YoshiWalsh (Koenkk/zigbee2mqtt#31445)
  // and JohanBendz/com.tuya.zigbee#1504: DP2 work_mode, DP6 scene_data, DP7 countdown (s),
  // DP101 power-off memory (raw blob), DP102 do_not_disturb (bool). Read-only decoders.
  '_tze28c1000000_sinxpbrl|TS0601': SINXPBRL_DP,
  '_tze284_sinxpbrl|TS0601': SINXPBRL_DP,
  // P3019: Arteco ZS-SF00 soil fertility sensor (z2m:tuya.ts ZS-SF00, fingerprint A89G12C|Arteco).
  'a89g12c|ARTECO': ZS_SF00_DP,
});

function _coupleKey(mfr, pid) { return `${String(mfr || '').toLowerCase()}|${String(pid || '').toUpperCase()}`; }

let _catalog = null;
function _cat() {
  if (_catalog === null) {
    try { _catalog = require('./data/unknown-dp-catalog.json'); } catch (_e) { _catalog = false; }
  }
  return _catalog || null;
}

/** DP name for a couple from the shipped catalogue, or null. */
function catalogName(mfr, pid, dp) {
  // P3023: sharded per-couple lookup first (no whole-catalogue parse), full catalogue as fallback.
  try {
    const cc = require('../memory/CatalogStore').couple(mfr, pid);
    if (!cc) { return null; }
    const row = cc.rows.find((r) => r.dp === Number(dp));
    return row ? row.name : null;
  } catch (_e) { /* fall through to the full catalogue */ }
  const c = _cat();
  if (!c) { return null; }
  const pi = c.idx[_coupleKey(mfr, pid)];
  const prof = pi === undefined ? null : c.profiles[pi];
  if (!prof) { return null; }
  for (let i = 0; i < prof.length; i += 2) { if (prof[i] === Number(dp)) { return c.names[prof[i + 1]] || null; } }
  return null;
}

const SEM_PRESS = /^(action\w*|button_\w+|click_control|scene_data|event)$/;
const SEM_MEASURE_OVERRIDE = /^(target_distance\w*|closest_target_distance|distance|illuminance_average_20min|illuminance_maximum_today|countdown_remaining|liquid_depth|liquid_level_percent)$/;
const SEM_CONFIG = /(^|_)(calibrat\w*|sensitivity|threshold|treshold|limits?|setting|setpoint|countdown\w*|schedule\w*|week_program\w*|power_on_behavior\w*|power_outage_memory|child_lock|backlight\w*|indicator\w*|led|mode|preset|delay|timeout|interval|period|duration|hysteresis|deadzone|unit|scale|format|volume|ringtone|keysound|reverse|programming|factory|reset|self_test|test\d*|name|border\w*|installation_height|transmission_power|update_frequency|sampling|time|timeset|set|type|range|max|min|mini|detection|direction|parameter|linkage|situation|silence|quiet|muffling|buzzer)(_|$)/;
const SEM_ALARM = /^(alarm\w*|smoke|gas|co|carbon_monoxide|tamper|leakage|water_warning|fault\w*|faults|error_status|device_fault|motor_fault|battery_low|frost|tumble\w*|fall_down_status|\w+_warning|\w+_alarm|vibration|rain_sensor_status)$/;
const SEM_STATE = /^(state\w*|switch\d*|switch_\d|onoff\S*|valve(_\d)?|valve_state|valve_status\w*|relay_status|light_switch|led_switch|radar_switch|presence|presence_state|occupancy|motion_state|human_motion_state|contact|garage_door_contact|moving|opening_state|running_state|heating_demand|status_\d|breaker_status|magnetic_status|liquid_state|position_reached|child_lock)$/;

/**
 * Map a Z2M-style DP name to an interpreter semantic. Rules are ours (rewritten), names come from
 * the sourced catalogue. Order: press → measure override → config → alarm → state → measure.
 * @returns {{semantic:string, gang:number|null}|null}
 */
function semanticOf(name) {
  const n = String(name || '').toLowerCase();
  if (!n || /^dp_\d+$/.test(n)) { return null; }
  const g = n.match(/(?:_l|_|valve_|switch)(\d{1,2})$/);
  const gang = g ? Number(g[1]) : null;
  if (SEM_PRESS.test(n)) { return { semantic: 'press', gang }; }
  if (SEM_MEASURE_OVERRIDE.test(n)) { return { semantic: 'measure', gang }; }
  if (SEM_ALARM.test(n) && !/_(volume|duration|time|ringtone|switch|set|setting)$/.test(n)) { return { semantic: 'alarm', gang }; }
  if (SEM_STATE.test(n)) { return { semantic: 'state', gang }; }
  if (SEM_CONFIG.test(n)) { return { semantic: 'config', gang }; }
  return { semantic: 'measure', gang };
}

function _catalogResult(mfr, pid, dp, kind, v) {
  const name = catalogName(mfr, pid, dp);
  const sem = name ? semanticOf(name) : null;
  if (!sem) { return null; }
  let source = `z2m:tuyaDatapoints ${String(pid || '').toUpperCase()} DP${dp}=${name}`;
  const decoded = { dp, kind, name, semantic: sem.semantic };
  const n = Number(v);
  // P3018: exact converter from the catalogue (v2) when upstream declares one; otherwise the
  // generic typed value below is kept (never dropped).
  let conv = null;
  try {
    const D = require('./DpCatalogDecoder');
    const e = D.entry(mfr, pid, dp);
    const d = e && e.conv && kind !== 'raw' ? D.decode(e.conv, v) : null;
    if (d) { conv = d; decoded.conv = e.conv; decoded.converted = d.value; source += ` (${e.conv})`; }
  } catch (_e) { /* decoder optional */ }
  if (conv && sem.semantic !== 'press') {
    const action = sem.semantic === 'config' ? 'config_echo' : (sem.semantic === 'measure' ? 'value' : 'state');
    return result({ action, button: sem.gang, value: conv.value, decoded, confidence: 0.95, source, exact: true, family: 'catalog' });
  }
  if (sem.semantic === 'press') {
    if (kind !== 'raw' && kind !== 'string' && PRESS[n]) { return result({ action: PRESS[n], button: sem.gang || 1, value: n, decoded, confidence: 0.9, source, exact: true, family: 'catalog' }); }
    return result({ action: 'value', button: sem.gang || 1, value: kind === 'raw' ? toBuf(v).toString('hex').slice(0, 64) : v, decoded, confidence: 0.6, source, family: 'catalog' });
  }
  if (sem.semantic === 'state' || sem.semantic === 'alarm') {
    let val = Number.isFinite(n) ? n : v;
    if (kind === 'bool') { val = !!v; }
    return result({ action: 'state', button: sem.gang, value: val, decoded, confidence: 0.85, source, exact: true, family: 'catalog' });
  }
  if (sem.semantic === 'config') {
    return result({ action: 'config_echo', value: kind === 'raw' ? toBuf(v).toString('hex').slice(0, 64) : v, decoded, confidence: 0.85, source, exact: true, family: 'catalog' });
  }
  if (kind === 'raw') { return result({ action: 'raw', value: toBuf(v).toString('hex').slice(0, 64), decoded, confidence: 0.7, source, family: 'catalog' }); }
  return result({ action: 'value', button: sem.gang, value: Number.isFinite(n) ? n : v, decoded, confidence: 0.85, source, exact: true, family: 'catalog' });
}

/**
 * @param {{dp:number, datatype?:number|string, value:any, deviceClass?:string, driverId?:string, mfr?:string, pid?:string, dpMap?:object}} evt
 */
function interpretDp(evt = {}) {
  try {
    const dp = Number(evt.dp);
    const kind = wireKind(evt.datatype, evt.value);
    const cls = `${String(evt.deviceClass || '').toLowerCase()} ${String(evt.driverId || '').toLowerCase()}`;
    const v = evt.value;

    // 1. exact per-couple
    const row = (COUPLE_DP[_coupleKey(evt.mfr, evt.pid)] || {})[dp];
    if (row) {
      const d = row.decode(v);
      if (d) { return result({ action: d.action || row.action, button: row.button, value: d.press !== undefined ? d.press : d, decoded: Object.assign({ dp, kind }, d), confidence: 0.95, source: row.source, exact: true, family: 'couple' }); }
    }

    // 1b. per-couple DP NAME catalogue (Z2M tuyaDatapoints + project knowledge) → semantic
    const cat = _catalogResult(evt.mfr, evt.pid, dp, kind, v);
    if (cat) { return cat; }

    // 2. family decoders
    if (BUTTON_CLASS.test(cls) && (kind === 'enum' || kind === 'value' || kind === 'bool') && dp >= 1 && dp <= 8) {
      const n = Number(v);
      if (PRESS[n]) {
        return result({ action: PRESS[n], button: dp, value: n, decoded: { dp, kind }, confidence: 0.7, source: 'z2m:tuya scene switch convention DPn = button n, 0/1/2 = single/double/hold', family: 'ef00_button' });
      }
    }
    if (METER_CLASS.test(cls) && kind === 'raw' && dp >= 6 && dp <= 8) {
      const d = decodePhaseVariant2(v);
      if (d) { return result({ action: 'value', value: d, decoded: Object.assign({ dp, kind, phase: 'abc'[dp - 6] }, d), confidence: 0.65, source: 'z2m:valueConverter.phaseVariant2 (DP6/7/8 = phase A/B/C on Tuya meters)', family: 'phase' }); }
    }
    if (THERMO_CLASS.test(cls) && dp === 36 && (kind === 'enum' || kind === 'bool' || kind === 'value')) {
      return result({ action: 'state', value: Number(v), decoded: { dp, kind, meaning: 'running_state (heat/idle), polarity depends on couple' }, confidence: 0.55, source: 'z2m:tuya.ts [36, running_state] (both lookup polarities exist)', family: 'thermostat_running_state' });
    }
    if (RADAR_CLASS.test(cls) && dp >= 101 && dp <= 125 && (kind === 'enum' || kind === 'value' || kind === 'bool')) {
      return result({ action: 'config_echo', value: v, decoded: { dp, kind, meaning: 'radar parameter echo (threshold / gate / mode); per-couple' }, confidence: 0.45, source: 'z2m:tuya.ts radars (MTD285/MTD085/ZY-M100) DP1xx = settings', family: 'radar_param' });
    }

    // 3. heuristics by wire type
    if (kind === 'bool') { return result({ action: 'state', value: !!v, decoded: { dp, kind }, confidence: 0.4, source: 'heuristic:bool → on/off or alarm', family: 'heuristic' }); }
    if (kind === 'enum') { return result({ action: 'value', value: Number(v), decoded: { dp, kind, hint: 'mode/state enum' }, confidence: 0.3, source: 'heuristic:enum', family: 'heuristic' }); }
    if (kind === 'bitmap') {
      const n = Number(v) >>> 0;
      const bits = [];
      for (let i = 0; i < 32; i++) { if (n & (1 << i)) { bits.push(i); } }
      return result({ action: 'fault_flags', value: n, decoded: { dp, kind, bits }, confidence: 0.4, source: 'heuristic:bitmap → fault/alarm flags', family: 'heuristic' });
    }
    if (kind === 'value') {
      const a = Math.abs(Number(v));
      const scale = a <= 100 ? 1 : a <= 1000 ? 10 : a <= 10000 ? 100 : 1000;
      return result({ action: 'value', value: Number(v), decoded: { dp, kind, scaleGuess: scale }, confidence: 0.3, source: 'heuristic:value range → scale', family: 'heuristic' });
    }
    if (kind === 'raw') {
      const b = toBuf(v);
      const d = b.length === 8 ? decodePhaseVariant2(b) : null;
      if (d) { return result({ action: 'value', value: d, decoded: Object.assign({ dp, kind }, d), confidence: 0.35, source: 'heuristic:8-byte raw fits phaseVariant2', family: 'heuristic' }); }
      return result({ action: 'raw', value: b.toString('hex').slice(0, 64), decoded: { dp, kind, length: b.length }, confidence: 0.1, source: 'heuristic:raw struct', family: 'heuristic' });
    }
    if (kind === 'string') { return result({ action: 'value', value: String(v).slice(0, 64), decoded: { dp, kind }, confidence: 0.2, source: 'heuristic:string', family: 'heuristic' }); }
    return result({ action: 'unknown', decoded: { dp, kind }, confidence: 0, source: 'heuristic:unknown' });
  } catch (_e) {
    return result({ action: 'unknown', confidence: 0, source: 'error' });
  }
}

/** Stable learning key for a payload: short payloads keep their bytes, long ones keep their length. */
function framePattern(evt = {}) {
  const b = toBuf(evt.data);
  const p = b.length <= 2 ? b.toString('hex') : `len${b.length}`;
  return `f:ep${Number(evt.endpoint) || 1}:${hex(evt.clusterId)}:${Number(evt.cmdId)}:${p}`;
}

function dpPattern(evt = {}) {
  const kind = wireKind(evt.datatype, evt.value);
  let p = 'n';
  if (kind === 'bool') { p = evt.value ? '1' : '0'; }
  else if (kind === 'enum') { p = String(Number(evt.value)); }
  else if (kind === 'raw') { p = `len${toBuf(evt.value).length}`; }
  return `dp:${Number(evt.dp)}:${kind}:${p}`;
}

const BUTTON_ACTIONS = Object.freeze(['single', 'double', 'long', 'release', 'rotate_left', 'rotate_right', 'scene']);

module.exports = {
  interpretFrame,
  interpretDp,
  framePattern,
  dpPattern,
  decodePhaseVariant2,
  wireKind,
  toBuf,
  BUTTON_ACTIONS,
  COUPLE_DP,
  COLOR_PRIVATE,
  semanticOf,
  catalogName,
  LEVEL_CMDS,
  COLOR_CMDS,
  EF00_RSP,
};
