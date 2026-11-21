'use strict';

/**
 * Strict multi-gang endpoint -> capability mapping (stable reliability).
 * Reimplemented for LTS - no command pacer / parallelDiscover.
 */

function parseGangFromCapability(capability) {
  const s = String(capability || '');
  const gang = s.match(/(?:gang|channel)(\d+)/i);
  if (gang) {return Number(gang[1]);}
  const dotted = s.match(/\.(\d+)$/);
  if (dotted) {return Number(dotted[1]);}
  if (s === 'onoff' || s === 'dim') {return 1;}
  return null;
}

function capabilityForOnOffEndpoint(endpointId, gangCount, root = 'onoff') {
  const ep = Number(endpointId);
  if (!Number.isInteger(ep) || ep < 1) {return null;}
  if (Number.isInteger(gangCount) && gangCount > 0 && ep > gangCount) {return null;}
  return ep === 1 ? root : `${root}.gang${ep}`;
}

function normalizeOnOffCommand(commandName) {
  const compact = String(commandName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!compact) {return 'unknown';}
  if (compact.includes('toggle')) {return 'toggle';}
  if (compact.includes('timedoff') || compact === 'commandonwithtimedoff') {return 'on';}
  if (
    compact === 'off'
    || compact === 'setoff'
    || compact === 'commandoff'
    || compact === 'commandoffwitheffect'
    || (compact.endsWith('off') && !compact.includes('on'))
  ) {
    return 'off';
  }
  if (
    compact === 'on'
    || compact === 'seton'
    || compact === 'commandon'
    || compact.startsWith('commandon')
    || compact.startsWith('seton')
  ) {
    return 'on';
  }
  return String(commandName || 'unknown');
}

// P3367 WHY: CapabilityCommandRouter (since 383290373b, 2026-11-01) imports
// endpointForCapability and isZclOnlyDevice from here; stable never exported
// them, so every UnifiedSwitchBase on/off threw "endpointForCapability is not
// a function" before any frame was sent. Same contract as master.
function endpointForCapability(capability, opts = {}) {
  if (opts.endpoint != null) {
    const n = Number(opts.endpoint);
    if (Number.isInteger(n) && n >= 1) {return n;}
  }
  return parseGangFromCapability(capability) || 1;
}

function hasEf00Cluster(device) {
  if (device?.tuyaEF00Manager) {return true;}
  const eps = device?.zclNode?.endpoints || {};
  for (const ep of Object.values(eps)) {
    const c = ep?.clusters || {};
    if (c.tuya || c.manuSpecificTuya || c[0xEF00] || c[61184] || c['61184'] || c.ef00) {
      return true;
    }
  }
  return false;
}

function isZclOnlyDevice(device) {
  if (!device) {return false;}
  if (device._isPureTuyaDP === true) {return false;}
  const proto = String(
    device._manufacturerConfig?.protocol
    || device._protocolInfo?.protocol
    || ''
  ).toLowerCase();
  if (proto === 'zcl_only') {return true;}
  try {
    const { isSacredZclOnlyManufacturer } = require('../protocol/IntelligentProtocolDetect');
    const mfr = device._protocolInfo?.mfr
      || device.getSetting?.('zb_manufacturer_name')
      || device.getData?.()?.manufacturerName;
    if (typeof isSacredZclOnlyManufacturer === 'function' && isSacredZclOnlyManufacturer(mfr)) {return true;}
  } catch (_) { /* optional */ }
  if (device._isPureTuyaDP === false && !hasEf00Cluster(device)) {return true;}
  return false;
}

module.exports = {
  endpointForCapability,
  hasEf00Cluster,
  isZclOnlyDevice,
  parseGangFromCapability,
  capabilityForOnOffEndpoint,
  normalizeOnOffCommand,
};
