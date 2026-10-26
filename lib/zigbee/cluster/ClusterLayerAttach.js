'use strict';

/**
 * ClusterLayerAttach (P2935) — wires the P2931 cluster layer into every
 * TuyaZigbeeDevice, AFTER native setup (called from the deferred init block).
 *
 * Layers, each in its own try/catch, each optional:
 *   1. bound   — RoutedBoundCluster on endpoints that have no binding yet
 *                (never replaces a driver's own BoundCluster). Commands are
 *                turned into presses ONLY for pure remotes / scene mode /
 *                decoupled relays (no ghost Flows on switches), else recorded.
 *   2. bind    — BindingPlanner: client clusters on every endpoint, bounded,
 *                retried on wake (pollControl checkIn, rejoin, any frame).
 *   3. report  — ReportingPlan fallback polling ONLY for capabilities whose
 *                configureReporting fails; stopped on first real report.
 *   5. endpoints — P3018 EndpointCoverage: read-only attr listeners where none exist,
 *                routed to the SAME endpoint's capability, else learned + exposed.
 *   4. ota     — passive observer of OTA client frames (0x0019) forwarded to
 *                the app OTA manager (noteClientRequest). Never answers.
 *
 * Kill switches: device setting `zcl_cluster_layer` (default on) and the app
 * setting `zcl_cluster_layer_disabled` (Homey ManagerSettings) = true.
 */

const BOUND_CLUSTERS = ['onOff', 'levelControl', 'scenes', 'colorControl', 'windowCovering', 'groups', 'iasACE'];
const WAKE_MIN_MS = 30 * 60 * 1000;
const LOG_BUDGET = 25;

function enabled(device) {
  try { if (device.homey?.settings?.get?.('zcl_cluster_layer_disabled') === true) {return false;} } catch (_e) { /* soft */ }
  try { if (device.getSetting?.('zcl_cluster_layer') === false) {return false;} } catch (_e) { /* soft */ }
  return true;
}

function _log(device, st, msg) {
  if (st.logLeft <= 0) {return;}
  st.logLeft--;
  try { device.log?.(`[ZCL-LAYER] ${msg}`); } catch (_e) { /* soft */ }
}

function _pressAllowed(device) {
  try {
    const { isPureRemote } = require('../../buttons/attachButtonPaths');
    if (isPureRemote(device)) {return true;}
  } catch (_e) { /* soft */ }
  try {
    const r = require('../../buttons/ButtonEventRouter').routerFor(device);
    return r && (r.mode === 'scene' || r.decoupled === true);
  } catch (_e) { return false; }
}

function _fire(device, n, tokens) {
  if (!n || typeof device._triggerPhysicalFlow !== 'function') {return;}
  try { Promise.resolve(device._triggerPhysicalFlow(n.button, n.type, tokens)).catch(() => {}); } catch (_e) { /* soft */ }
}

/** Normalised bound event -> button press (via the shared router normalizers). */
function makeRoute(device, st, epCount) {
  return (evt) => {
    st.events++;
    if (!_pressAllowed(device)) {return;}
    const R = require('../../buttons/ButtonEventRouter');
    const ep = epCount > 1 ? evt.endpoint : 1;
    const path = { onOff: 'zcl_onoff', levelControl: 'level_step', scenes: 'scene_recall' }[evt.cluster];
    let n = null;
    if (evt.command === 'raw') {
      n = R.normalize.raw({ endpoint: ep, clusterId: evt.clusterId, commandId: evt.cmdId, payload: evt.data ? Array.from(evt.data).slice(0, 8) : [] });
    } else if (path === 'zcl_onoff') {
      let mode; try { mode = R.routerFor(device).mode; } catch (_e) { /* soft */ }
      n = R.normalize.zcl_onoff({ endpoint: ep, command: evt.command, mode });
    } else if (path === 'level_step') {
      n = R.normalize.level_step({ endpoint: ep, command: evt.command, stepMode: evt.args && (evt.args.stepMode ?? evt.args.moveMode) });
    } else if (path === 'scene_recall') {
      if (!/recall/i.test(evt.command)) {return;}
      n = R.normalize.scene_recall({ endpoint: ep, sceneId: evt.args && evt.args.sceneId, endpointCount: epCount });
    } else {
      n = { button: ep, type: 'single' };
    }
    _fire(device, n, { path: path || `zcl_${evt.cluster}`, endpoint: evt.endpoint, source: 'zcl_layer' });
  };
}

function _layerBound(device, zclNode, st) {
  const { bindAll } = require('./RoutedBoundCluster');
  const epCount = Object.keys(zclNode.endpoints || {}).length;
  const done = bindAll(zclNode, { route: makeRoute(device, st, epCount), clusters: BOUND_CLUSTERS, log: (...a) => _log(device, st, a.join(' ')) });
  st.bound = done.length;
}

function _descriptor(device, zclNode) {
  // Prefer Homey's interview; fall back to what zclNode exposes.
  try {
    const nd = device.node?.endpointDescriptors || device.getStoreValue?.('zb_endpoint_descriptors');
    if (Array.isArray(nd) && nd.length) {return { endpoints: nd };}
  } catch (_e) { /* soft */ }
  return null; // no real descriptor: never invent output clusters
}

async function _layerBind(device, zclNode, st, wake) {
  const { BindingPlanner } = require('./BindingPlanner');
  if (!st.planner) {st.planner = new BindingPlanner();}
  const nd = _descriptor(device, zclNode);
  if (!nd) {return;}
  const r = await st.planner.run(zclNode, nd, { wake });
  if (r.bound.length || r.failed.length) {_log(device, st, `bind ok=${r.bound.join(',')} fail=${r.failed.join(',')}`);}
}

async function _layerReport(device, zclNode, st) {
  const { planFor, ReportingManager } = require('./ReportingPlan');
  const caps = device.getCapabilities?.() || [];
  const ep = zclNode.endpoints[1] || Object.values(zclNode.endpoints)[0];
  if (!ep) {return;}
  // Only zigbee-native capabilities whose cluster is present; Tuya DP devices have none.
  const entries = planFor(caps, name => !!(ep.clusters && ep.clusters[name]));
  if (!entries.length) {return;}
  const si = (fn, ms) => device._destroyed !== true && device.homey?.setInterval ? device.homey.setInterval(fn, ms) : null; // P3068
  const ci = t => { try { device.homey?.clearInterval?.(t); } catch (_e) { /* soft */ } };
  const mgr = new ReportingManager({ setInterval: si, clearInterval: ci });
  st.reporting = mgr;
  const r = await mgr.apply(ep, entries);
  // P3068: detach() may run while apply() is still awaiting configureReporting (device deleted or
  // re-initialised during pairing): pollers armed after that point would keep polling a dead node forever.
  if (st.detached || device._destroyed === true) { try { mgr.destroy(); } catch (_e) { /* soft */ } if (st.reporting === mgr) {st.reporting = null;} return; }
  if (r.polled.length) {_log(device, st, `report fallback poll=${r.polled.join(',')}`);}
  for (const e of entries) {
    try { ep.clusters[e.cluster].on?.(`attr.${e.attr}`, () => st.reporting && st.reporting.onReport(e.cluster, e.attr)); } catch (_e) { /* soft */ }
  }
}

function _layerWakeHooks(device, zclNode, st) {
  for (const ep of Object.values(zclNode.endpoints || {})) {
    const pc = ep.clusters && ep.clusters.pollControl;
    if (pc && typeof pc.onCheckIn !== 'function') {
      pc.onCheckIn = () => { onWake(device); };
    }
  }
  const { wrapHandleFrame } = require('../../utils/BidirectionalButtonState');
  wrapHandleFrame(zclNode, 'p2935-zcl-layer', (args, next) => {
    try {
      const cId = Number(args[1]);
      if (cId === 0x0019) {_observeOta(device, Number(args[0]) || 1, args[2], st);}
      onWake(device);
    } catch (_e) { /* keep RX */ }
    return next(...args);
  });
}

function _observeOta(device, epId, frame, st) {
  const Z = require('./ZclCodec');
  let buf = frame;
  try { if (!Buffer.isBuffer(buf)) { const j = frame?.toJSON ? frame.toJSON() : frame; buf = Buffer.isBuffer(j) ? j : Buffer.from(j?.data || j || []); } } catch (_e) { return; }
  const parsed = Z.parseFrame(buf);
  if (!parsed.ok || !parsed.header.clusterSpecific || parsed.header.directionToClient) {return;}
  const d = Buffer.from(parsed.payload.raw || '', 'hex');
  const names = { 0x01: 'queryNextImageRequest', 0x03: 'imageBlockRequest', 0x06: 'upgradeEndRequest' };
  const command = names[parsed.header.cmdId];
  if (!command) {return;}
  const args = {};
  try {
    if (command === 'upgradeEndRequest') {
      args.status = d[0]; args.manufacturerCode = d.readUInt16LE(1); args.imageType = d.readUInt16LE(3); args.fileVersion = d.readUInt32LE(5);
    } else {
      args.fieldControl = d[0]; args.manufacturerCode = d.readUInt16LE(1); args.imageType = d.readUInt16LE(3); args.fileVersion = d.readUInt32LE(5);
      if (command === 'imageBlockRequest') { args.fileOffset = d.readUInt32LE(9); args.maximumDataSize = d[13]; }
    }
  } catch (_e) { return; }
  st.ota++;
  try {
    const app = device.homey?.app;
    const mgr = typeof app?._ensureOTAManager === 'function' ? app._ensureOTAManager() : app?.otaManager;
    mgr?.noteClientRequest?.(device, command, args, { endpoint: epId });
  } catch (_e) { /* soft */ }
}

async function attach(device, zclNode) {
  if (!device || !zclNode || !zclNode.endpoints || device._p2935) {return device && device._p2935;}
  if (device._destroyed === true) {return null;} // P3068: a late attach() after onDeleted/onUninit (detach cleared _p2935) must not re-arm pollers
  if (!enabled(device)) { try { device.log?.('[ZCL-LAYER] disabled (setting)'); } catch (_e) { /* soft */ } return null; }
  const st = { logLeft: LOG_BUDGET, events: 0, bound: 0, ota: 0, lastWake: 0, errors: [], planner: null, reporting: null, zclNode };
  device._p2935 = st;
  const layers = [
    ['bound', () => _layerBound(device, zclNode, st)],
    ['wake', () => _layerWakeHooks(device, zclNode, st)],
    ['bind', () => _layerBind(device, zclNode, st, false)],
    ['report', () => _layerReport(device, zclNode, st)],
    // P3018 (master soak): passive listeners on every interviewed endpoint without a handler
    ['endpoints', () => { require('../EndpointCoverage').attach(device, zclNode); }],
  ];
  for (const [name, fn] of layers) {
    if (st.detached) {break;} // P3068: device went away mid-attach
    try { await fn(); } catch (e) { if (st.errors.length < 8) {st.errors.push(`${name}:${e && e.message}`);} }
  }
  _log(device, st, `attached bound=${st.bound} errors=${st.errors.length}`);
  return st;
}

/** Any sign of life: retry pending binds (throttled per device). */
function onWake(device) {
  const st = device && device._p2935;
  if (!st || !st.planner || !enabled(device)) {return;}
  const now = Date.now();
  if (now - st.lastWake < WAKE_MIN_MS) {return;}
  st.lastWake = now;
  const nd = _descriptor(device, st.zclNode);
  if (nd) {st.planner.onWake(st.zclNode, nd).catch(() => {});}
}

function detach(device) {
  const st = device && device._p2935;
  if (!st) {return;}
  st.detached = true; // P3068: late layers of a still-running attach() stand down
  try { if (st.reporting) {st.reporting.destroy();} } catch (_e) { /* soft */ }
  st.reporting = null; st.planner = null; st.zclNode = null;
  device._p2935 = null;
}

module.exports = { attach, detach, onWake, enabled, makeRoute, BOUND_CLUSTERS, WAKE_MIN_MS, _observeOta };
