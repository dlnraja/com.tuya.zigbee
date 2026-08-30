'use strict';

/**
 * Device operating modes — one policy for remotes, relays, and DP switches.
 *
 * Same ZCL id 0x8004 means DIFFERENT things:
 *   TS004F remote  → tuyaOperationMode (0=command/dimmer, 1=event/scene)
 *   TS000x wall    → sometimes switchMode (0=toggle, 1=state, 2=momentary)
 * Never write "scene=1" onto a wall switch: that would set switchType=state.
 *
 * TS004F (Z2M #7158, ZHA): genOnOff 0x8004 enum8. Hardware toggle: hold 2+4 ~6s.
 * Some firmware answers UNSUPPORTED_ATTRIBUTE — cache and stop.
 * Homey zigbee-clusters often rejects the named attr locally ("not a valid
 * attribute") — that is NOT a device rejection; fall through to a raw Enum8 write.
 *
 * TS0041/42/43: one OnOff (+ scenes) per endpoint. They do not implement 0x8004.
 * Smart knobs: command/dimmer is the useful default (rotation).
 * TS0601: DP14/DP15, never 0x8004.
 */

const { getRegistry } = require('./UnsupportedRegistry');
const { safeSetTimeout } = require('../utils/safe-timers');

const ATTR_ID = 0x8004;
const ATTR_NAMES = ['tuyaOperationMode', 'operationMode', '32772', ATTR_ID];
const STORE_UNSUPPORTED = 'tuya_operation_mode_unsupported';
const ENUM8 = 0x30;
const UINT8 = 0x20;
const RETRY_MS = [0, 80, 200];

const MODE_TO_ZCL = { command: 0, dimmer: 0, event: 1, scene: 1 };
const MODE_FROM_ZCL = { 0: 'dimmer', 1: 'scene' };

const KNOB_MFR = /402vrq2i|qja6nq5z|gwkzibhs|ugi8ky6u|kaflzta4/i;

function _model(device) {
  return String(
    device?.getSetting?.('zb_model_id')
    || device?.getStoreValue?.('zb_model_id')
    || device?.getData?.()?.productId
    || device?.getData?.()?.modelId
    || ''
  ).toUpperCase();
}

function _mfr(device) {
  return String(
    device?.getSetting?.('zb_manufacturer_name')
    || device?.getStoreValue?.('zb_manufacturer_name')
    || device?.getData?.()?.manufacturerName
    || ''
  );
}

function _driverId(device) {
  return String(device?.driver?.id || device?.driverId || '');
}

function classifyOperatingFamily(device) {
  const model = _model(device);
  const mfr = _mfr(device);
  const driver = _driverId(device);

  if (/smart_knob/.test(driver) || KNOB_MFR.test(mfr)) {
    return { family: 'knob', writeSceneAttr: false, defaultMode: 'dimmer' };
  }
  // WHY: Nobø / Moes / Zemismart endpoint remotes that reject genOnOff 0x8004
  // even when interview labels them TS004F (diag scene_mode_unsupported).
  // WHY(P2253): also lock known TS0043/44 sacred mfrs when modelId is wrong/missing.
  // WHY(P2290): mrpevh8p / SH-SC07 siblings reject 0x8004 even if modelId lags
  // WHY(P2317): also Moes/Tuya TS0044_1 white-labels (mh9px7cq/dziaict4/…)
  if (/xffhmvhv|kfu8zapd|xabckq1v|zgyzgdua|wkai4ga5|a7ouggvs|key8kk7r|bczr4e10|mrpevh8p|5bpeda8u|b4awzgct|mh9px7cq|j61x9rxn|dziaict4|u3nv1jwk|a4xycprs/i.test(mfr)) {
    return { family: 'ts0044', writeSceneAttr: false, defaultMode: 'scene' };
  }
  if (model === 'TS004F' || /TS004F/.test(model)) {
    return { family: 'ts004f', writeSceneAttr: true, defaultMode: 'scene' };
  }
  if (model === 'TS0044' || /TS0044/.test(model)) {
    // meter91 #2189 / diag 55e3e591: TS0044 is a 4-endpoint onOff remote (like TS0041/42/43).
    // It does NOT implement genOnOff 0x8004. Writing 32772 logs
    // "32772 is not a valid attribute of onOff" and kills physical buttons.
    return { family: 'ts0044', writeSceneAttr: false, defaultMode: 'scene' };
  }
  if (/^TS004[123]$/.test(model) || /TS004[123]/.test(model)) {
    return { family: 'endpoint_remote', writeSceneAttr: false, defaultMode: 'scene' };
  }
  if (/^TS000[1-8]$/.test(model) || /^TS001[1-8]$/.test(model)
    || /TS000[1-8]/.test(model) || /TS001[1-8]/.test(model)
    || (Number(device?.gangCount) > 1 && device?.hasCapability?.('onoff'))) {
    return { family: 'zcl_relay', writeSceneAttr: false, defaultMode: 'toggle' };
  }
  if (model === 'TS0601' || /TS0601/.test(model)) {
    return { family: 'tuya_dp', writeSceneAttr: false };
  }
  if (/^TS0215/.test(model)) {
    return { family: 'sos', writeSceneAttr: false };
  }
  if (!model) {
    if (/button_wireless_[123]$/.test(driver) || /wall_remote_[123]/.test(driver)
      || /scene_switch_[123]$/.test(driver)) {
      return { family: 'endpoint_remote', writeSceneAttr: false, defaultMode: 'scene' };
    }
    if (/scene_switch_4/.test(driver)) {
      return { family: 'endpoint_remote', writeSceneAttr: false, defaultMode: 'scene' };
    }
    // WHY (P2235): without model, do NOT blind-write 0x8004 — TS0044/endpoint
    // remotes reject it and physical press dies (meter91 / Nobø). TS004F users
    // still get scene mode once zb_model_id is known (branch above).
    if (/button_wireless_4|scene_controller/.test(driver)) {
      return { family: 'endpoint_remote', writeSceneAttr: false, defaultMode: 'scene' };
    }
    if (/switch_|wall_switch|relay_/.test(driver)) {
      return { family: 'zcl_relay', writeSceneAttr: false };
    }
  }
  return { family: 'unknown', writeSceneAttr: false };
}

function _onOffCluster(zclNode) {
  const ep = zclNode?.endpoints?.[1];
  return ep?.clusters?.onOff || ep?.clusters?.genOnOff || ep?.clusters?.[6] || ep?.clusters?.['6'] || null;
}

function _isHomeySchemaError(err) {
  const msg = String(err?.message || '').toLowerCase();
  return /not a valid attribute|unknown attribute|invalid attribute/.test(msg);
}

function _isDeviceUnsupported(err) {
  if (_isHomeySchemaError(err)) {return false;}
  const status = err?.status ?? err?.zclStatus ?? err?.statusCode;
  if (status === 0x86 || status === 0x8d || status === 0x81) {return true;}
  const msg = String(err?.message || '').toLowerCase();
  return /unsupported_attribute|unsupported attribute/.test(msg);
}

function buildWritePayload(value, dataType) {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE(ATTR_ID, 0);
  buf.writeUInt8(dataType, 2);
  buf.writeUInt8(value & 0xff, 3);
  return buf;
}

function _delay(device, ms) {
  if (!ms) {return Promise.resolve();}
  return new Promise((resolve) => {
    safeSetTimeout(device, resolve, ms);
  });
}

async function _rawWrite(cluster, ep, value) {
  const payload = buildWritePayload(value, ENUM8);
  const targets = [cluster, ep].filter((t) => t && typeof t.sendFrame === 'function');
  for (const target of targets) {
    try {
      await target.sendFrame({ frameControl: [], cmdId: 0x02, data: payload });
      return true;
    } catch (_e) { /* next */ }
  }
  if (cluster && typeof cluster.writeRaw === 'function') {
    try {
      await cluster.writeRaw(0x02, payload);
      return true;
    } catch (_e) { /* fall through */ }
  }
  if (cluster && typeof cluster.write === 'function') {
    try {
      await cluster.write({ attributeId: ATTR_ID, dataType: ENUM8, value });
      return true;
    } catch (_e) {
      try {
        await cluster.write({ attributeId: ATTR_ID, dataType: UINT8, value });
        return true;
      } catch (_e2) { /* noop */ }
    }
  }
  if (cluster && typeof cluster.writeAttributesRaw === 'function') {
    try {
      await cluster.writeAttributesRaw([{ id: ATTR_ID, value, dataType: ENUM8 }]);
      return true;
    } catch (_e) { /* noop */ }
  }
  return false;
}

function _markUnsupported(device, err) {
  try {
    getRegistry(device).mark('genOnOff', 'tuyaOperationMode', 'unsupported-attr');
  } catch (_e) { /* noop */ }
  try {
    const p = device.setStoreValue?.(STORE_UNSUPPORTED, true);
    if (p && typeof p.catch === 'function') {p.catch(() => {});}
  } catch (_e) { /* noop */ }
  try { device.log(`[OP-MODE] 0x8004 unsupported: ${err && err.message}`); } catch (_e2) { /* noop */ }
}

function _alreadyUnsupported(device) {
  try {
    if (device.getStoreValue?.(STORE_UNSUPPORTED) === true) {return true;}
  } catch (_e) { /* noop */ }
  try {
    if (getRegistry(device).isKnown('genOnOff', 'tuyaOperationMode')) {return true;}
  } catch (_e) { /* noop */ }
  return false;
}

async function writeOperationMode(device, zclNode, mode) {
  const numeric = MODE_TO_ZCL[mode] ?? (mode === 0 || mode === 1 ? mode : 1);
  if (_alreadyUnsupported(device)) {
    return { ok: false, unsupported: true };
  }

  const cluster = _onOffCluster(zclNode);
  if (!cluster) {return { ok: false, reason: 'no-onoff' };}

  for (let i = 0; i < RETRY_MS.length; i++) {
    await _delay(device, RETRY_MS[i]);
    if (typeof cluster.writeAttributes === 'function') {
      for (const key of ATTR_NAMES) {
        try {
          await cluster.writeAttributes({ [key]: numeric });
          return { ok: true, via: 'writeAttributes', value: numeric };
        } catch (err) {
          if (_isDeviceUnsupported(err)) {
            _markUnsupported(device, err);
            return { ok: false, unsupported: true };
          }
        }
      }
    }
    const ep = zclNode?.endpoints?.[1];
    const rawOk = await _rawWrite(cluster, ep, numeric);
    if (rawOk) {return { ok: true, via: 'raw', value: numeric };}
  }

  return { ok: false, reason: 'write-failed' };
}

async function applyDesiredMode(device, zclNode) {
  const family = classifyOperatingFamily(device);
  const setting = String(device.getSetting?.('button_mode') || family.defaultMode || 'auto').toLowerCase();

  if (!family.writeSceneAttr) {
    return { ok: true, skipped: family.family };
  }
  const desired = (setting === 'dimmer' || setting === 'command') ? 'command' : 'scene';
  const r = await writeOperationMode(device, zclNode, desired);
  return { ...r, family: family.family, desired };
}

function registerOperationModeListener(device, zclNode) {
  if (device._operationModeListenerBound) {return;}
  const family = classifyOperatingFamily(device);
  if (!family.writeSceneAttr) {return;}
  device._operationModeListenerBound = true;

  for (const [epKey, ep] of Object.entries(zclNode?.endpoints || {})) {
    const epNum = Number(epKey);
    if (!Number.isInteger(epNum) || epNum < 1 || epNum === 242) {continue;}
    const cluster = ep?.clusters?.onOff || ep?.clusters?.genOnOff || ep?.clusters?.[6];
    if (!cluster || typeof cluster.on !== 'function') {continue;}
    const handler = (attrId, value) => {
      try {
        const id = typeof attrId === 'object' && attrId !== null
          ? (attrId.id ?? attrId.attributeId ?? attrId.attrId) : attrId;
        const v = typeof attrId === 'object' && attrId !== null && value === undefined
          ? attrId.value : value;
        if (Number(id) !== ATTR_ID && String(id) !== 'tuyaOperationMode') {return;}
        const mode = MODE_FROM_ZCL[Number(v)] || (Number(v) === 1 ? 'scene' : 'dimmer');
        device.sceneMode = mode;
        const storeP = device.setStoreValue?.('button_mode', mode);
        if (storeP && typeof storeP.catch === 'function') {storeP.catch(() => {});}
        const setP = device.setSettings?.({ button_mode: mode });
        if (setP && typeof setP.catch === 'function') {setP.catch(() => {});}
        try { device.log(`[OP-MODE] Manual mode toggle detected on EP${epKey}: ${mode}`); } catch (_e) { /* noop */ }
      } catch (_e) { /* noop */ }
    };
    try { cluster.on('attr', handler); } catch (_e) { /* noop */ }
    try { cluster.on(`attr.${ATTR_ID}`, (value) => handler(ATTR_ID, value)); } catch (_e) { /* noop */ }
    try { cluster.on('attr.tuyaOperationMode', (value) => handler(ATTR_ID, value)); } catch (_e) { /* noop */ }
  }
}

module.exports = {
  ATTR_ID,
  MODE_TO_ZCL,
  MODE_FROM_ZCL,
  STORE_UNSUPPORTED,
  classifyOperatingFamily,
  writeOperationMode,
  applyDesiredMode,
  registerOperationModeListener,
  buildWritePayload,
};
