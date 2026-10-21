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
        oo.on('attr.tuyaOperationMode', (v) => setMode(device, router, R.modeFrom8004(v), '0x8004'));
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
        e1.on('attr.switchMode', (v) => setMode(device, router, R.modeFromE001(v), 'E001/0xD020'));
      }
    } catch (_e) { /* soft */ }
  }

  // Raw chain: E000/E001 command frames + unknown manufacturer clusters.
  try {
    const { wrapHandleFrame } = require('../utils/BidirectionalButtonState');
    wrapHandleFrame(zclNode, 'p2926-button-router', (args, next) => {
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

function detachButtonPaths(device) {
  try { device._p2926Attached = false; } catch (_e) { /* soft */ }
  R.disposeRouter(device);
}

module.exports = { attachButtonPaths, detachButtonPaths, isPureRemote, KNOWN };
