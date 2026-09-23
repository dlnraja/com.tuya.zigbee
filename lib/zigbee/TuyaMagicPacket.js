'use strict';

/**
 * v9.0.413 (P92.121) + P103 era-enrich + P2249 + P2685:
 * TuyaMagicPacket — complementary basic-cluster handshake (soft; never boot-fatal).
 *
 * Pattern (Z2M configureMagicPacket / ZHA quirks / TuyaOS #1651 / HA TS0044):
 * 1) read genBasic attrs incl. manufacturer-specific 0xFFFE so the device
 *    starts reporting.
 * 2) write genBasic 0xFFDE = 0x13 (Tuya "setup mode") — without this, TS0043/
 *    TS0044 remotes often drop the first physical press after sleep.
 *
 * Prefer SDK readAttributes; fall back to raw sendFrame when zigbee-clusters
 * rejects 0xFFFE as "not a valid attribute".
 *
 * In-memory idempotent for a single init. Do NOT skip on a persisted store
 * flag alone: Tuya chips lose the handshake after power-cut / re-pair.
 * WHY(P2685): force still respects FORCE_COOLDOWN_MS so wake+re-arm storms
 * do not burn CR2032 (Bastien pile conso).
 */

const { isUnsupportedError, getRegistry } = require('../zigbee/UnsupportedRegistry');

const MAGIC_ATTRIBUTES = [0x0004, 0x0000, 0x0001, 0x0005, 0x0007, 0xfffe];
/** Z2M tuya.configureMagicPacket — enables action reporting on sleepy remotes */
const MAGIC_SETUP_ATTR = 0xffde;
const MAGIC_SETUP_VALUE = 0x13;
const STORE_FLAG = 'tuya_magic_packet_sent';
const STORE_TS = 'tuya_magic_packet_ts';
/** WHY(P2685): max one forced handshake per 6h unless forceAlways */
const FORCE_COOLDOWN_MS = 6 * 60 * 60 * 1000;

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
 * @param {{force?: boolean, forceAlways?: boolean}} [opts]
 * @returns {Promise<boolean>}
 */
async function sendTuyaMagicPacket(device, zclNode, endpointId = 1, opts = {}) {
  try {
    const forceAlways = opts.forceAlways === true;
    const force = opts.force === true || forceAlways;
    if (!force && device._tuyaMagicPacketSent) { return true; }

    // WHY(P2685 / Bastien pile): force on every wake/re-arm was triple-TX storm
    if (force && !forceAlways) {
      let lastTs = device._tuyaMagicPacketTs || 0;
      try {
        const stored = await Promise.resolve(device.getStoreValue?.(STORE_TS)).catch(() => null);
        if (typeof stored === 'number' && stored > lastTs) lastTs = stored;
      } catch (_e) { /* soft */ }
      if (lastTs && (Date.now() - lastTs) < FORCE_COOLDOWN_MS) {
        device._tuyaMagicPacketSent = true;
        try {
          device.log?.(`[TUYA-MAGIC] P2685 skip force (cooldown ${Math.round((FORCE_COOLDOWN_MS - (Date.now() - lastTs)) / 60000)}min left)`);
        } catch (_e) { /* noop */ }
        return true;
      }
    }

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

    // WHY (P2249): HA/Z2M TS0044 first-press-ignored — write setup attr after read.
    // Soft-fail: some firmwares reject 0xFFDE; read handshake alone still helps.
    try {
      if (typeof basic.writeAttributes === 'function') {
        await basic.writeAttributes({ [MAGIC_SETUP_ATTR]: MAGIC_SETUP_VALUE });
        try { device.log(`[TUYA-MAGIC] setup 0xFFDE=${MAGIC_SETUP_VALUE} written (ep${endpointId})`); } catch (_e) { /* noop */ }
      } else if (typeof basic.write === 'function') {
        await basic.write(MAGIC_SETUP_ATTR, MAGIC_SETUP_VALUE);
        try { device.log(`[TUYA-MAGIC] setup 0xFFDE written via write()`); } catch (_e) { /* noop */ }
      }
    } catch (err) {
      try {
        device.log(`[TUYA-MAGIC] 0xFFDE write skipped: ${err && err.message}`);
      } catch (_e) { /* noop */ }
    }

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
    device._tuyaMagicPacketTs = Date.now();
    try {
      if (typeof device.setStoreValue === 'function') {
        device.setStoreValue(STORE_FLAG, true).catch(() => {});
        device.setStoreValue(STORE_TS, device._tuyaMagicPacketTs).catch(() => {});
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

module.exports = {
  sendTuyaMagicPacket,
  MAGIC_ATTRIBUTES,
  MAGIC_SETUP_ATTR,
  MAGIC_SETUP_VALUE,
  STORE_FLAG,
  STORE_TS,
  FORCE_COOLDOWN_MS,
  buildMagicReadPayload,
};
