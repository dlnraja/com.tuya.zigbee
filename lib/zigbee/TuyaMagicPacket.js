'use strict';

/**
 * v9.0.413 (P92.121) + P103 era-enrich:
 * TuyaMagicPacket — mandatory basic-cluster handshake.
 *
 * Pattern (Z2M configureMagicPacket / ZHA quirks / TuyaOS #1651):
 * read genBasic attrs incl. manufacturer-specific 0xFFFE so the device
 * starts reporting. Prefer SDK readAttributes; fall back to raw sendFrame
 * when zigbee-clusters rejects 0xFFFE as "not a valid attribute".
 *
 * In-memory idempotent for a single init. Do NOT skip on a persisted store
 * flag: Tuya chips lose the handshake after power-cut / re-pair / app
 * restart (Z2M configureMagicPacket, ZHA Tuya spell, TuyaOS #1651).
 * Use opts.force after device announce.
 */

const { isUnsupportedError, getRegistry } = require('../zigbee/UnsupportedRegistry');

const MAGIC_ATTRIBUTES = [0x0004, 0x0000, 0x0001, 0x0005, 0x0007, 0xfffe];
const STORE_FLAG = 'tuya_magic_packet_sent';

/**
 * Build ZCL Read Attributes payload for MAGIC_ATTRIBUTES.
 * Global command 0x00; each attr as uint16 LE.
 */
function buildMagicReadPayload() {
  const buf = Buffer.alloc(MAGIC_ATTRIBUTES.length * 2);
  MAGIC_ATTRIBUTES.forEach((attr, i) => {
    buf.writeUInt16LE(attr & 0xffff, i * 2);
  });
  return buf;
}

/**
 * @param {Object} device
 * @param {Object} zclNode
 * @param {number} [endpointId=1]
 * @param {{force?: boolean}} [opts]
 * @returns {Promise<boolean>}
 */
async function sendTuyaMagicPacket(device, zclNode, endpointId = 1, opts = {}) {
  try {
    const force = opts.force === true;
    if (!force && device._tuyaMagicPacketSent) { return true; }

    const ep = zclNode && zclNode.endpoints && zclNode.endpoints[endpointId];
    const basic = ep && ep.clusters && (ep.clusters.genBasic || ep.clusters.basic || ep.clusters[0]);
    if (!basic) {
      return false;
    }

    let ok = false;

    // Path A: SDK readAttributes (preferred)
    if (typeof basic.readAttributes === 'function') {
      try {
        const attrs = await basic.readAttributes(MAGIC_ATTRIBUTES);
        const model = attrs && (attrs.modelIdentifier || attrs[5]);
        const mfr = attrs && (attrs.manufacturerName || attrs[4]);
        try {
          device.log(`[TUYA-MAGIC] handshake OK via readAttributes (ep${endpointId}) — ${mfr || '?'} / ${model || '?'}`);
        } catch (_e) { /* no-op */ }
        ok = true;
      } catch (err) {
        if (isUnsupportedError(err)) {
          try { getRegistry(device).mark('genBasic', 'magicPacket', 'none-needed'); } catch (_e) { /* noop */ }
        }
        try {
          device.log(`[TUYA-MAGIC] readAttributes failed, trying sendFrame: ${err && err.message}`);
        } catch (_e) { /* no-op */ }
      }
    }

    // Path B: raw sendFrame when 0xFFFE rejected by schema validation
    if (!ok) {
      const payload = buildMagicReadPayload();
      const sendTargets = [
        basic,
        ep,
        typeof ep?.sendFrame === 'function' ? ep : null,
      ].filter(Boolean);

      for (const target of sendTargets) {
        if (typeof target.sendFrame !== 'function') { continue; }
        try {
          await target.sendFrame({
            frameControl: [],
            cmdId: 0x00,
            data: payload,
          });
          try {
            device.log(`[TUYA-MAGIC] handshake OK via sendFrame (ep${endpointId})`);
          } catch (_e) { /* no-op */ }
          ok = true;
          break;
        } catch (_e) { /* try next target */ }
      }
    }

    // Path C: cluster.writeRaw / command fallbacks used by older bases
    if (!ok && typeof basic.writeRaw === 'function') {
      try {
        await basic.writeRaw(0x00, buildMagicReadPayload());
        ok = true;
        try { device.log(`[TUYA-MAGIC] handshake OK via writeRaw (ep${endpointId})`); } catch (_e) { /* noop */ }
      } catch (_e) { /* noop */ }
    }

    if (!ok) { return false; }

    // Path D (historical restore): MCU magic sequences for TS0601 / LCD / weather
    try {
      const {
        getMagicPacketConfig,
        executeMagicPackets,
        findTuyaCluster,
      } = require('../tuya/MagicPacketRegistry');
      const mfr = device.getStoreValue?.('zb_manufacturer_name')
        || device.getData?.()?.manufacturerName
        || '';
      const pid = device.getStoreValue?.('zb_model_id')
        || device.getData?.()?.productId
        || device.getData?.()?.modelId
        || '';
      const mcuConfig = getMagicPacketConfig(mfr, pid);
      if (mcuConfig) {
        const tuyaCluster = findTuyaCluster(device, zclNode);
        if (tuyaCluster) {
          await executeMagicPackets(device, tuyaCluster, mcuConfig);
        }
      }
    } catch (_e) { /* non-blocking */ }

    device._tuyaMagicPacketSent = true;
    try {
      if (typeof device.setStoreValue === 'function') {
        device.setStoreValue(STORE_FLAG, true).catch(() => {});
      }
    } catch (_e) { /* no-op */ }
    return true;
  } catch (err) {
    try {
      device.log(`[TUYA-MAGIC] handshake failed (non-blocking): ${err && err.message}`);
    } catch (_e) { /* no-op */ }
    return false;
  }
}

module.exports = { sendTuyaMagicPacket, MAGIC_ATTRIBUTES, STORE_FLAG, buildMagicReadPayload };
