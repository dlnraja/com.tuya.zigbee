'use strict';
// Spec 006 (#1503-class): read-only startup sync of Tuya OnOff manufacturer attributes
// (0x8000 childLock, 0x8001 indicatorMode, 0x8002 relayStatus = power-on state) into the
// existing Homey settings. Each attribute is read independently so one unsupported attribute
// never hides the others; only valid values are written to settings; nothing is ever written
// to the device here. Standard ZCL StartUpOnOff (0x4003) is a different contract and is not handled.

const ENUMS = {
  relayStatus: { off: 0, on: 1, remember: 2, max: 2 },
  indicatorMode: { off: 0, status: 1, position: 2, max: 2 },
};

function normalizeEnum(kind, raw) {
  const e = ENUMS[kind];
  if (raw === null || raw === undefined) {return null;}
  if (typeof raw === 'number') {return Number.isInteger(raw) && raw >= 0 && raw <= e.max ? raw : null;}
  const s = String(raw).trim().toLowerCase();
  if (/^\d+$/.test(s)) {return normalizeEnum(kind, Number(s));}
  return Object.prototype.hasOwnProperty.call(e, s) && s !== 'max' ? e[s] : null;
}

function normalizeBool(raw) {
  if (typeof raw === 'boolean') {return raw;}
  if (raw === 0 || raw === 1) {return raw === 1;}
  if (typeof raw === 'string') {
    const s = raw.trim().toLowerCase();
    if (['1', 'true', 'on'].includes(s)) {return true;}
    if (['0', 'false', 'off'].includes(s)) {return false;}
  }
  return null;
}

async function readOne(cluster, attr) {
  try {
    const r = await cluster.readAttributes([attr]);
    return r ? r[attr] : undefined;
  } catch (_) { return undefined; }
}

/**
 * @returns {Promise<Object>} settings actually applied (may be empty)
 */
async function syncTuyaOnOffSettings(device, endpointId = 1) {
  const cluster = device?.zclNode?.endpoints?.[endpointId]?.clusters?.onOff;
  if (!cluster || typeof cluster.readAttributes !== 'function') {return {};}
  const [relay, indicator, lock] = [
    await readOne(cluster, 'relayStatus'),
    await readOne(cluster, 'indicatorMode'),
    await readOne(cluster, 'childLock'),
  ];
  const next = {};
  const r = normalizeEnum('relayStatus', relay);
  if (r !== null) {next.relay_status = String(r);}
  const i = normalizeEnum('indicatorMode', indicator);
  if (i !== null) {next.indicator_mode = String(i);}
  const l = normalizeBool(lock);
  if (l !== null) {next.child_lock = l ? '1' : '0';}
  if (Object.keys(next).length) {
    await device.setSettings(next);
    device.log?.('[ONOFF-SETTINGS] synced from device:', JSON.stringify(next));
  } else {
    device.log?.('[ONOFF-SETTINGS] no supported Tuya OnOff attributes reported; settings unchanged');
  }
  return next;
}

/** Strict outgoing value for relay_status / indicator_mode settings; throws on invalid input. */
function parseOutgoingEnum(kind, value) {
  const v = normalizeEnum(kind, value);
  if (v === null) {throw new Error(`Invalid ${kind} value: ${value}`);}
  return v;
}

module.exports = { syncTuyaOnOffSettings, normalizeEnum, normalizeBool, parseOutgoingEnum };
