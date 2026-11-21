'use strict';

/**
 * Tuya manufacturer attributes on the standard OnOff cluster (0x0006).
 *
 * WHY: callers ask for 'backlightMode' / 'powerOnState', but the registered
 * TuyaOnOffCluster declares the same ids as 'indicatorMode' (0x8001) and
 * 'relayStatus' (0x8002). zigbee-clusters only writes attributes by their
 * declared name, so the old name-based write threw
 * "backlightMode is not a valid attribute of onOff" on every boot and the
 * user's backlight / power-on setting never reached the relay
 * (Bastien 1.0.229 diag, _TZ3000_ltt60asa + TS0004). Z2M writes the same ids
 * on genOnOff (tuyaBacklightMode 0x8001, moesStartUpOnOff 0x8002).
 *
 * The name is resolved by attribute id from the cluster that is actually
 * instantiated. When no declared attribute carries that id, nothing is sent
 * and the caller keeps its Tuya DP fallback.
 */

const ONOFF_TUYA_ATTR_IDS = Object.freeze({
  childLock: 0x8000,
  backlightMode: 0x8001,
  powerOnState: 0x8002,
  switchMode: 0x8004,
});

function declaredAttributes(cluster) {
  try {
    const ctor = cluster && cluster.constructor;
    const attrs = ctor && ctor.ATTRIBUTES;
    return attrs && typeof attrs === 'object' ? attrs : {};
  } catch (_e) {
    return {};
  }
}

/** Declared attribute name on this cluster for a requested logical name, or null. */
function resolveOnOffAttrName(cluster, attrName) {
  const attrs = declaredAttributes(cluster);
  if (attrs[attrName]) { return attrName; }
  const id = ONOFF_TUYA_ATTR_IDS[attrName];
  if (typeof id !== 'number') { return null; }
  for (const [name, def] of Object.entries(attrs)) {
    if (def && def.id === id) { return name; }
  }
  return null;
}

/**
 * Write one Tuya OnOff attribute. Resolves to true when written, false when
 * the cluster declares no attribute with that id (no frame sent).
 * A device-side rejection still throws so the caller can record it.
 */
async function writeTuyaOnOffAttribute(cluster, attrName, value) {
  if (!cluster || typeof cluster.writeAttributes !== 'function') { return false; }
  const name = resolveOnOffAttrName(cluster, attrName);
  if (!name) { return false; }
  await cluster.writeAttributes({ [name]: value });
  return true;
}

module.exports = { ONOFF_TUYA_ATTR_IDS, resolveOnOffAttrName, writeTuyaOnOffAttribute };
