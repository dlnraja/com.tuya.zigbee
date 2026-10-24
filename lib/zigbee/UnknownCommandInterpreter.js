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
    return result({ action: 'rotate', button: b, value: v, confidence: 0.4, source: 'z2m:tuya 0xFC out-of-range value', family: 'tuya_fc' });
  }
  default: return null;
  }
}

function _level(cmd, buf, ep) {
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

function _color(cmd, buf, ep) {
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

function _basic(cmd) {
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
const COUPLE_DP = Object.freeze({
  '_tze284_6ocnqlhn|TS0601': {
    6: { kind: 'raw', decode: decodePhaseVariant2, action: 'value', source: 'z2m:tuya.ts TO-Q-SYS-JZT [6, null, phaseVariant2] + Gmail diags 09/2026' },
  },
});

function _coupleKey(mfr, pid) { return `${String(mfr || '').toLowerCase()}|${String(pid || '').toUpperCase()}`; }

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
      if (d) { return result({ action: row.action, value: d, decoded: Object.assign({ dp, kind }, d), confidence: 0.95, source: row.source, exact: true, family: 'couple' }); }
    }

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
  LEVEL_CMDS,
  COLOR_CMDS,
  EF00_RSP,
};
