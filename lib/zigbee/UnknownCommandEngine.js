'use strict';

/**
 * P3016: UnknownCommandEngine. Per-device orchestration for unknown frames and DPs.
 *
 *   UnknownCommandSink.record ─┐                         ┌─> app trigger unknown_command_received
 *                              ├─> interpret ─> learn ───┼─> app trigger inferred_button_action
 *   UnknownDPLogger.logUnknownDP┘   (exact > family >    └─> condition last_inferred_action_is
 *                                    heuristic)               + diag export (no personal data)
 *
 * Safety: never throws and never awaits the device. Flow cards fire only when the card is
 * declared in this build's manifest (FlowCardPresence). Rate limits apply per device+pattern
 * (FLOW_MIN_INTERVAL_MS) and globally (FanoutLimiter). Logs: one line per pattern every
 * LOG_INTERVAL_MS.
 */

const I = require('./UnknownCommandInterpreter');
const L = require('./UnknownLearning');

const FLOW_MIN_INTERVAL_MS = 1000;
const LOG_INTERVAL_MS = 10 * 60 * 1000;
const RECENT_MAX = 12;
const LAST_MAX = 200;
const MIN_BUTTON_CONF = 0.4;
const FRAME_BUTTON_EXTRA = ['on', 'off', 'toggle'];

const _last = new Map(); // deviceId -> { action, button, at, source, confidence }
let _fanout = null;

function _presence() {
  try { return require('../flow/FlowCardPresence'); } catch (_e) { return null; }
}

function _limiter() {
  if (_fanout === null) {
    const P = _presence();
    _fanout = P && P.FanoutLimiter ? new P.FanoutLimiter({ max: 20, windowMs: 1000 }) : false;
  }
  return _fanout || null;
}

function _devId(device) {
  try { const d = typeof device.getData === 'function' ? device.getData() : null; return (d && d.id) || device.id || null; } catch (_e) { return device.id || null; }
}

function _st(device) {
  if (!device._unknownEngine) {
    device._unknownEngine = { recent: [], lastFlow: new Map(), lastLog: new Map(), lastDpVal: new Map(), stats: { frames: 0, dps: 0, exact: 0, learned: 0, fired: 0, dropped: 0 } };
  }
  return device._unknownEngine;
}

function _bound(map, max) { while (map.size > max) { map.delete(map.keys().next().value); } }

function _setting(device, k) {
  try { return (typeof device.getSetting === 'function' && device.getSetting(k)) || ''; } catch (_e) { return ''; }
}

function _cls(device) {
  try { return (typeof device.getClass === 'function' && device.getClass()) || (device.driver && device.driver.manifest && device.driver.manifest.class) || ''; } catch (_e) { return ''; }
}

function _driverId(device) {
  try { return (device.driver && (device.driver.id || (device.driver.manifest && device.driver.manifest.id))) || ''; } catch (_e) { return ''; }
}

function _fire(device, kind, id, tokens, state) {
  try {
    const homey = device.homey;
    const flow = homey && homey.flow;
    if (!flow) { return false; }
    const P = _presence();
    if (P && !P.isCardDeclared(homey, kind, id)) { return false; }
    const lim = _limiter();
    if (lim && !lim.allow()) { _st(device).stats.dropped++; return false; }
    const card = typeof flow.getTriggerCard === 'function' ? flow.getTriggerCard(id) : null;
    if (!card || typeof card.trigger !== 'function') { return false; }
    Promise.resolve(card.trigger(tokens, state)).catch(() => {});
    _st(device).stats.fired++;
    return true;
  } catch (_e) { return false; }
}

function _log(device, st, key, r, now) {
  if (st.lastLog.has(key) && now - st.lastLog.get(key) < LOG_INTERVAL_MS) { return; }
  st.lastLog.set(key, now);
  _bound(st.lastLog, 100);
  try { device.log(`[UNKNOWN-INTERP] ${key} → ${r.action}${r.button != null ? `#${r.button}` : ''} conf=${r.confidence.toFixed(2)} ${r.exact ? 'exact' : r.learned ? 'learned' : 'guess'} (${r.source})`); } catch (_e) { /* soft */ }
}

function _emit(device, st, key, r, meta, now) {
  const id = _devId(device);
  const isButton = I.BUTTON_ACTIONS.includes(r.action) || (meta.kind === 'frame' && FRAME_BUTTON_EXTRA.includes(r.action));
  if (id && (isButton || r.action === 'state' || r.action === 'value')) {
    _last.set(id, { action: r.action, button: r.button, at: now, source: r.source, confidence: r.confidence });
    if (_last.size > LAST_MAX) { _last.delete(_last.keys().next().value); }
  }
  if (st.lastFlow.has(key) && now - st.lastFlow.get(key) < FLOW_MIN_INTERVAL_MS) { return; }
  st.lastFlow.set(key, now);
  _bound(st.lastFlow, 100);
  let name = '';
  try { name = String((typeof device.getName === 'function' && device.getName()) || ''); } catch (_e) { name = ''; }
  const decoded = (() => { try { return JSON.stringify(r.value != null ? r.value : r.decoded).slice(0, 200); } catch (_e) { return ''; } })();
  if (meta.notify !== false) {
    _fire(device, 'trigger', 'unknown_command_received', {
      device_name: name,
      cluster: meta.cluster,
      command: meta.command,
      payload_hex: meta.hex,
      decoded,
      inferred_action: r.action,
      confidence: Number(r.confidence.toFixed(2)),
    }, { deviceId: id });
  }
  if (isButton && r.confidence >= MIN_BUTTON_CONF) {
    _fire(device, 'trigger', 'inferred_button_action', {
      device_name: name,
      button: r.button == null ? 1 : Number(r.button),
      action: r.action,
      source: String(r.source || '').slice(0, 80),
      confidence: Number(r.confidence.toFixed(2)),
    }, { deviceId: id, action: r.action });
  }
}

function _remember(st, entry) {
  st.recent.push(entry);
  if (st.recent.length > RECENT_MAX) { st.recent.shift(); }
}

/**
 * @param {object} device
 * @param {{clusterId:number, cmdId:number, data?:any, endpoint?:number}} evt
 */
function handleFrame(device, evt = {}, now = Date.now()) {
  if (!device || device._destroyed) { return null; }
  try {
    const st = _st(device);
    st.stats.frames++;
    let endpointCount = 1;
    try { endpointCount = Object.keys((device.zclNode && device.zclNode.endpoints) || {}).length || 1; } catch (_e) { /* soft */ }
    const fresh = I.interpretFrame(Object.assign({ endpointCount }, evt));
    const key = I.framePattern(evt);
    const r = L.learn(device, key, fresh, now);
    if (r.exact) { st.stats.exact++; }
    if (r.learned) { st.stats.learned++; }
    _remember(st, { at: now, key, action: r.action, button: r.button, confidence: Number(r.confidence.toFixed(2)), source: r.source });
    _log(device, st, key, r, now);
    const buf = I.toBuf(evt.data);
    _emit(device, st, key, r, {
      kind: 'frame',
      cluster: Number.isFinite(Number(evt.clusterId)) ? `0x${(Number(evt.clusterId) >>> 0).toString(16).toUpperCase().padStart(4, '0')}` : String(evt.clusterName || evt.clusterId || ''),
      command: Number(evt.cmdId) || 0,
      hex: buf.toString('hex').slice(0, 128),
    }, now);
    return r;
  } catch (_e) { return null; }
}

/**
 * Called for every unknown DP report, BEFORE any dedup, so repeated button presses count.
 * @param {object} device
 * @param {{dp:number, value:any, datatype?:number|string}} evt
 */
function handleDp(device, evt = {}, now = Date.now()) {
  if (!device || device._destroyed) { return null; }
  try {
    const st = _st(device);
    st.stats.dps++;
    const fresh = I.interpretDp({
      dp: evt.dp,
      datatype: evt.datatype,
      value: evt.value,
      deviceClass: _cls(device),
      driverId: _driverId(device),
      mfr: _setting(device, 'zb_manufacturer_name'),
      pid: _setting(device, 'zb_model_id') || _setting(device, 'zb_product_id'),
    });
    const key = I.dpPattern(evt);
    const r = L.learn(device, key, fresh, now);
    if (r.exact) { st.stats.exact++; }
    if (r.learned) { st.stats.learned++; }
    _remember(st, { at: now, key, action: r.action, button: r.button, confidence: Number(r.confidence.toFixed(2)), source: r.source });
    _log(device, st, key, r, now);
    // Periodic sensor/parameter echoes: notify Flows only when the value changed for this DP.
    let vKey = '';
    try { vKey = Buffer.isBuffer(evt.value) ? evt.value.toString('hex') : JSON.stringify(evt.value); } catch (_e) { vKey = String(evt.value); }
    const isButton = I.BUTTON_ACTIONS.includes(r.action);
    const changed = st.lastDpVal.get(evt.dp) !== vKey;
    st.lastDpVal.set(evt.dp, vKey);
    _bound(st.lastDpVal, 64);
    _emit(device, st, key, r, {
      kind: 'dp',
      cluster: '0xEF00',
      command: Number(evt.dp) || 0,
      hex: I.toBuf(Buffer.isBuffer(evt.value) || Array.isArray(evt.value) ? evt.value : []).toString('hex').slice(0, 128),
      notify: isButton || changed,
    }, now);
    return r;
  } catch (_e) { return null; }
}

/** Last inferred action for a device id (used by the condition card). */
function lastAction(deviceId) { return (deviceId && _last.get(deviceId)) || null; }

function lastActionIs(deviceId, action, minutes = 1, now = Date.now()) {
  const e = lastAction(deviceId);
  if (!e) { return false; }
  const win = Math.max(1, Math.min(1440, Number(minutes) || 1)) * 60000;
  return e.action === String(action) && now - e.at <= win;
}

/** Diag export: patterns, actions, counters. No names, ids, IEEE or tokens. */
function diagExport(device) {
  if (!device) { return { v: 1, learned: [], recent: [], stats: {} }; }
  const st = device._unknownEngine;
  return {
    v: 1,
    driver: _driverId(device) || null,
    mfr: _setting(device, 'zb_manufacturer_name') || null,
    pid: _setting(device, 'zb_model_id') || null,
    stats: st ? Object.assign({}, st.stats) : {},
    learned: L.snapshot(device, 40),
    recent: st ? st.recent.map((e) => Object.assign({}, e)) : [],
  };
}

function dispose(device) {
  try {
    L.dispose(device);
    const id = _devId(device);
    if (id) { _last.delete(id); }
    delete device._unknownEngine;
  } catch (_e) { /* soft */ }
}

function _resetForTests() { _last.clear(); _fanout = null; }

module.exports = { handleFrame, handleDp, lastAction, lastActionIs, diagExport, dispose, FLOW_MIN_INTERVAL_MS, LOG_INTERVAL_MS, _resetForTests };
