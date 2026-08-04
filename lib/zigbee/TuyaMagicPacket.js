'use strict';

/**
 * v9.0.413 (P92.121): TuyaMagicPacket — mandatory basic-cluster handshake.
 *
 * Confirmed by the Tuya developer forum (tuyaos.com #1651) and by every
 * alternative project (Z2M herdsman interview, kkossev Hubitat tuyaMagic /
 * tuyaBlackMagic, ZHA quirks): Tuya devices expect the gateway to read a
 * specific set of genBasic attributes during/after pairing, in a specific
 * format. Without it:
 *  - multi-gang switches toggle ALL gangs at once instead of per-gang,
 *  - TS0041-44 scene switches stay mute or miss presses,
 *  - some devices never send attribute reports.
 *
 * The read is: cluster 0x0000 (genBasic), attributes
 * [0x0004 manufacturerName, 0x0000 zclVersion, 0x0001 appVersion,
 *  0x0005 modelIdentifier, 0x0007 powerSource, 0xfffe attributeReportingStatus]
 *
 * Idempotent per device (in-memory flag + persisted store flag), sleepy
 * tolerant (never throws), and integrated with UnsupportedRegistry so a
 * device that rejects the read is not asked again on every boot.
 */

const { isUnsupportedError, getRegistry } = require('../zigbee/UnsupportedRegistry');

const MAGIC_ATTRIBUTES = [0x0004, 0x0000, 0x0001, 0x0005, 0x0007, 0xfffe];
const STORE_FLAG = 'tuya_magic_packet_sent';

/**
 * Send the Tuya magic packet on the given endpoint (default 1).
 * Never throws. Returns true when the read was issued (or already done).
 *
 * @param {Object} device - Homey device instance
 * @param {Object} zclNode
 * @param {number} [endpointId=1]
 * @returns {Promise<boolean>}
 */
async function sendTuyaMagicPacket(device, zclNode, endpointId = 1) {
  try {
    if (device._tuyaMagicPacketSent) { return true; }
    let persisted = false;
    try {
      persisted = typeof device.getStoreValue === 'function'
        && device.getStoreValue(STORE_FLAG) === true;
    } catch (_e) { persisted = false; }
    if (persisted) {
      device._tuyaMagicPacketSent = true;
      return true;
    }

    const ep = zclNode && zclNode.endpoints && zclNode.endpoints[endpointId];
    const basic = ep && ep.clusters && (ep.clusters.genBasic || ep.clusters.basic || ep.clusters[0]);
    if (!basic || typeof basic.readAttributes !== 'function') {
      return false;
    }

    await basic.readAttributes(MAGIC_ATTRIBUTES).then((attrs) => {
      const model = attrs && (attrs.modelIdentifier || attrs[5]);
      const mfr = attrs && (attrs.manufacturerName || attrs[4]);
      try {
        device.log(`[TUYA-MAGIC] 🔮 handshake OK (ep${endpointId}) — ${mfr || '?'} / ${model || '?'}`);
      } catch (_e) { /* no-op */ }
    }).catch((err) => {
      if (isUnsupportedError(err)) {
        getRegistry(device).mark('genBasic', 'magicPacket', 'none-needed');
      }
      throw err;
    });

    device._tuyaMagicPacketSent = true;
    try {
      if (typeof device.setStoreValue === 'function') {
        device.setStoreValue(STORE_FLAG, true).catch(() => {});
      }
    } catch (_e) { /* no-op */ }
    return true;
  } catch (err) {
    try {
      device.log(`[TUYA-MAGIC] ⚠️ handshake failed (non-blocking): ${err && err.message}`);
    } catch (_e) { /* no-op */ }
    return false;
  }
}

module.exports = { sendTuyaMagicPacket, MAGIC_ATTRIBUTES };
