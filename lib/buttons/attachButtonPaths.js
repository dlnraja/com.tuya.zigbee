'use strict';
/**
 * P2926 — optional, additive button paths on top of the native ones.
 * Never throws, never removes a listener, never writes device config.
 *  - multistateInput presentValue reports        (path multistate)
 *  - onOff attribute reports on pure remotes     (path onoff_attr)
 *  - E000 / E001 cluster command frames          (path e000 / e001)
 *  - scene/operating mode tracking: onOff 0x8004 and E001 0xD020 (read-only, passive)
 *  - unknown manufacturer cluster frames: bounded capture + heuristic, generic card only
 * All presses go through device._triggerPhysicalFlow with a `path` tag so the
 * ButtonEventRouter cross-path dedup lets one press fire once.
 */
const R = require('./ButtonEventRouter');

const KNOWN = new Set([0x0000, 0x0001, 0x0003, 0x0004, 0x0005, 0x0006, 0x0008, 0x0012,
  0x0019, 0x0020, 0x0300, 0x0402, 0x0405, 0x0500, 0x0702, 0x0B04, 0xEF00, 0xE000, 0xE001,
  0xE002, 0xE003, 0x1000]);

function isPureRemote(device) {
  try {
    const caps = device.getCapabilities?.() || [];
    if (caps.some((c) => /^onoff(\.|$)/.test(c))) { return false; }
    const cls = device.driver?.manifest?.class || '';
    return cls === 'button' || cls === 'remote' || /button|remote|scene|knob/i.test(device.driver?.id || '');
  } catch (_e) { return false; }
}

function fire(device, gang, type, tokens) {
  try {
    if (typeof device._triggerPhysicalFlow === 'function') {
      Promise.resolve(device._triggerPhysicalFlow(gang, type, tokens)).catch(() => {});
    }
  } catch (_e) { /* soft */ }
}

function isTs004fFamily(device) {
  try { return !!require('../zigbee/DeviceOperatingMode').classifyOperatingFamily(device).writeSceneAttr; } catch (_e) { return false; }
}

function setMode(device, router, mode, src) {
  if (!router || mode === 'unknown' || router.mode === mode) { return; }
  router.mode = mode;
  try { device.log?.(`[ROUTER] P2926 operating mode ${mode} (from ${src})`); } catch (_e) { /* soft */ }
  try { Promise.resolve(device.setStoreValue?.('button_mode_detected', mode)).catch(() => {}); } catch (_e) { /* soft */ }
}

function attachButtonPaths(device, zclNode) {
  if (!device || !zclNode || !zclNode.endpoints || device._p2926Attached) { return null; }
  device._p2926Attached = true;
  const router = R.routerFor(device);
  const eps = Object.entries(zclNode.endpoints);
  const epCount = eps.length;
  const report = { multistate: 0, onoff_attr: 0, mode: 0, raw: false };
  const pure = isPureRemote(device);

  for (const [k, ep] of eps) {
    const epId = parseInt(k, 10) || 1;
    const cl = ep?.clusters || {};
    try {
      const ms = cl.multistateInput || cl.genMultistateInput;
      if (ms && typeof ms.on === 'function') {
        ms.on('attr.presentValue', (v) => {
          const n = R.normalize.multistate({ endpoint: epId, value: v });
          fire(device, n.button, n.type, { path: 'multistate', endpoint: epId });
        });
        report.multistate++;
      }
    } catch (_e) { /* soft */ }
    try {
      const oo = cl.onOff;
      if (oo && typeof oo.on === 'function') {
        // 0x8004 means operation mode only on the TS004F family (see DeviceOperatingMode).
        oo.on('attr.tuyaOperationMode', (v) => { if (isTs004fFamily(device)) { setMode(device, router, R.modeFrom8004(v), '0x8004'); } });
        report.mode++;
        if (pure) {
          oo.on('attr.onOff', () => {
            const n = R.normalize.onoff_attr({ endpoint: epId });
            fire(device, n.button, n.type, { path: 'onoff_attr', endpoint: epId });
          });
          report.onoff_attr++;
        }
      }
    } catch (_e) { /* soft */ }
    try {
      const e1 = cl.tuyaE001 || cl.tuyaSwitchMode || cl[0xE001];
      if (e1 && typeof e1.on === 'function') {
        e1.on('attr.switchMode', (v) => {
          setMode(device, router, R.modeFromE001(v), 'E001/0xD020');
          // Z2M switch_mode scene = relay decoupled from the paddle.
          router.decoupled = R.isDecoupled(v);
          try { Promise.resolve(device.setStoreValue?.('relay_decoupled', router.decoupled)).catch(() => {}); } catch (_e) { /* soft */ }
        });
      }
    } catch (_e) { /* soft */ }
  }

  // EF00 DP cross-check (record only, never fires: the native DP path fires).
  try {
    const tuya = (zclNode.endpoints[1] || eps[0]?.[1])?.clusters?.tuya;
    if (tuya && typeof tuya.on === 'function') {
      const onDp = (r) => {
        try {
          const dp = r?.dp;
          if (dp == null) { return; }
          const s = device.getSettings?.() || {};
          const id = { mfr: s.zb_manufacturer_name, pid: s.zb_model_id, fw: s.zb_app_version || s.zb_sw_build_id };
          const exp = device.getDeviceProfile?.()?.dpButtons;
          const note = router.recordDp(dp, id, exp);
          if (note) { device.log?.(`[ROUTER] P2926 ${note}`); }
        } catch (_e) { /* soft */ }
      };
      tuya.on('reporting', onDp); tuya.on('response', onDp);
      report.dpCheck = true;
    }
  } catch (_e) { /* soft */ }

  // Raw chain: E000/E001 command frames + unknown manufacturer clusters.
  try {
    const { wrapHandleFrame } = require('../utils/BidirectionalButtonState');
    wrapHandleFrame(zclNode, 'p2926-button-router', (args, next) => {
      try { onWake(device, zclNode); } catch (_w) { /* soft */ }
      try {
        const epId = Number(args[0]) || 1;
        const cId = Number(args[1]);
        const f = args[2];
        const json = typeof f?.toJSON === 'function' ? f.toJSON() : f;
        const d = Buffer.isBuffer(json?.data) ? json.data : Array.isArray(json?.data) ? Buffer.from(json.data) : null;
        const cmd = f?.cmdId ?? f?.commandId ?? json?.cmdId ?? json?.commandId;
        const gang = epCount > 1 ? epId : 1;
        if (pure && (cId === 0xE000 || cId === 0xE001) && typeof cmd === 'number' && cmd !== 0x01 && cmd !== 0x0A) {
          const path = cId === 0xE000 ? 'e000' : 'e001';
          const n = R.normalize[path]({ endpoint: gang, value: d && d.length ? d[0] : undefined, commandId: cmd });
          fire(device, n.button, n.type, { path, endpoint: epId, seq: json?.trxSequenceNumber });
        } else if (!KNOWN.has(cId) && cId >= 0xFC00) {
          const h = router.captureUnknown({ endpoint: gang, clusterId: cId, commandId: cmd,
            payload: d ? Array.from(d.slice(0, 8)) : [] });
          device.log?.(`[ROUTER] P2926 unknown cluster 0x${cId.toString(16)} cmd=${cmd} ep${epId} -> any btn${h.button}/${h.type}`);
          if (typeof device._tryCard === 'function') {
            Promise.resolve(device._tryCard('button_pressed', { button: `any:${h.button}`, type: h.type }, {})).catch(() => {});
          }
        }
      } catch (_e) { /* keep RX */ }
      return next(...args);
    });
    report.raw = true;
  } catch (_e) { /* soft */ }

  try { device.log?.(`[ROUTER] P2926 attached ${JSON.stringify(report)}`); } catch (_e) { /* soft */ }
  return report;
}

const WAKE_THROTTLE_MS = 6 * 3600 * 1000;

/**
 * Battery wake window: any frame means the radio is awake for a few seconds.
 * Use it (at most every 6 h) for work a sleepy remote misses at init:
 *  - bind onOff on extra endpoints where the driver declares native onOff binding;
 *  - the first-pair operating-mode read (see initModeForNewDevice).
 */
function onWake(device, zclNode) {
  const now = Date.now();
  if (device._p2926WakeAt && now - device._p2926WakeAt < WAKE_THROTTLE_MS) { return false; }
  device._p2926WakeAt = now;
  bindExtraEndpoints(device, zclNode);
  if (device.getStoreValue?.('p2926_new_device') === true) { initModeForNewDevice(device, zclNode); }
  return true;
}

function nativeOnOffBinding(device) {
  try {
    const ep = device.driver?.manifest?.zigbee?.endpoints || {};
    return Object.values(ep).some((e) => Array.isArray(e?.bindings) && e.bindings.includes(6));
  } catch (_e) { return false; }
}

function bindExtraEndpoints(device, zclNode) {
  if (!isPureRemote(device) || !nativeOnOffBinding(device)) { return 0; }
  let n = 0;
  for (const [k, ep] of Object.entries(zclNode?.endpoints || {})) {
    if ((parseInt(k, 10) || 1) <= 1) { continue; }
    const oo = ep?.clusters?.onOff;
    if (oo && typeof oo.bind === 'function') {
      n++;
      Promise.resolve().then(() => oo.bind()).then(
        () => device.log?.(`[ROUTER] P2926 bound onOff ep${k}`),
        () => { /* asleep or unsupported: retry next wake window */ device._p2926WakeAt = 0; },
      );
    }
  }
  return n;
}

/**
 * New devices only (flag set in onAdded): default button_mode to the mode read
 * from the device (TS004F 0x8004). On failure the current fallback stays and
 * the next wake window retries once. Existing devices never carry the flag.
 */
async function initModeForNewDevice(device, zclNode) {
  if (device._p2926ModeReading) { return null; }
  device._p2926ModeReading = true;
  try {
    if (!isTs004fFamily(device)) { await device.setStoreValue?.('p2926_new_device', false); return null; }
    const oo = zclNode?.endpoints?.[1]?.clusters?.onOff;
    if (!oo || typeof oo.readAttributes !== 'function') { return null; }
    // Homey-managed timer (cleared by the SDK on uninit) and cleared here when the read wins.
    let t = null;
    const H = device.homey;
    const race = [oo.readAttributes(['tuyaOperationMode'])];
    if (H && typeof H.setTimeout === 'function') {
      race.push(new Promise((_, rej) => { t = H.setTimeout(() => rej(new Error('timeout')), 2500); }));
    }
    const r = await Promise.race(race).finally(() => { if (t && H) { H.clearTimeout(t); } });
    const mode = R.modeFrom8004(r?.tuyaOperationMode);
    if (mode === 'unknown') { return null; }
    const label = mode === 'scene' ? 'scene' : 'dimmer';
    await device.setSettings?.({ button_mode: label }).catch(() => {});
    await device.setStoreValue?.('button_mode_source', 'device-read').catch(() => {});
    await device.setStoreValue?.('p2926_new_device', false).catch(() => {});
    setMode(device, R.routerFor(device), mode, 'first-pair read');
    return label;
  } catch (_e) {
    return null; // keep current fallback
  } finally {
    device._p2926ModeReading = false;
  }
}

function detachButtonPaths(device) {
  try { device._p2926Attached = false; } catch (_e) { /* soft */ }
  R.disposeRouter(device);
}

module.exports = { attachButtonPaths, detachButtonPaths, isPureRemote, KNOWN, onWake, bindExtraEndpoints, initModeForNewDevice, nativeOnOffBinding };
