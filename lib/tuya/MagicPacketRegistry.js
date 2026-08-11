'use strict';

/**
 * MagicPacketRegistry — restored from pre-P92.17 (was deleted as "dead" but
 * profiles were never elevated). Complements genBasic 0xFFFE handshake with
 * MCU 0x10 + dataQuery sequences for TS0601 / LCD / weather / BSEED.
 */

const { safeSetTimeout } = require('../utils/safe-timers');

// More-specific profiles MUST come before TS0601_STANDARD (first match wins).
const MAGIC_PACKET_CONFIGS = {
  ZT08_WEATHER: {
    packets: [
      { command: 'mcuVersionRequest', data: Buffer.from([0x00, 0x02]), delay: 100 },
      { command: 'dataQuery', data: Buffer.from([]), delay: 200 },
    ],
    appliesTo: (mfr) => /ZT08/i.test(mfr || ''),
  },

  LCD_TEMPERATURE: {
    packets: [
      { command: 'mcuVersionRequest', data: Buffer.from([0x00, 0x02]), delay: 100 },
      { command: 'dataQuery', data: Buffer.from([]), delay: 0 },
    ],
    appliesTo: (mfr, pid) => /_TZE20[04]_/i.test(mfr || '') && /^TS0601$/i.test(pid || ''),
  },

  BSEED_SWITCH: {
    packets: [
      { command: 'mcuVersionRequest', data: Buffer.from([0x00, 0x00]), delay: 50 },
      { command: 'dataQuery', data: Buffer.from([]), delay: 50 },
    ],
    appliesTo: (mfr) => /bseed/i.test(mfr || ''),
  },

  XIAOMI_KEEPALIVE: {
    packets: [
      { command: 'xiaomiKeepalive', data: Buffer.from([0x01]), delay: 0 },
    ],
    appliesTo: (mfr) => /lumi/i.test(mfr || ''),
  },

  TS0601_STANDARD: {
    packets: [
      { command: 'mcuVersionRequest', data: Buffer.from([0x00, 0x00]), delay: 100 },
      { command: 'dataQuery', data: Buffer.from([]), delay: 0 },
    ],
    appliesTo: (mfr, pid) => /^TS060/i.test(pid || ''),
  },
};

function getMagicPacketConfig(manufacturerName, productId) {
  const mfr = manufacturerName || '';
  const pid = productId || '';
  for (const [, config] of Object.entries(MAGIC_PACKET_CONFIGS)) {
    if (config.appliesTo(mfr, pid)) {return config;}
  }
  return null;
}

async function executeMagicPackets(device, cluster, config) {
  if (!config || !config.packets || !cluster) {return false;}
  let any = false;

  for (const pkt of config.packets) {
    try {
      if (device?._destroyed) {return any;}
      if (pkt.command === 'mcuVersionRequest' && typeof cluster.mcuVersionRequest === 'function') {
        await cluster.mcuVersionRequest({ data: pkt.data });
        any = true;
      } else if (pkt.command === 'dataQuery' && typeof cluster.dataQuery === 'function') {
        await cluster.dataQuery({});
        any = true;
      } else if (pkt.command === 'dataQuery' && typeof cluster.command === 'function') {
        await cluster.command('dataQuery', {}, { disableDefaultResponse: true });
        any = true;
      } else if (pkt.command === 'xiaomiKeepalive') {
        continue;
      }
      if (pkt.delay > 0) {
        await new Promise((r) => safeSetTimeout(device, r, pkt.delay));
      }
    } catch (err) {
      try {
        device.log?.(`[MagicPacket] ${pkt.command} failed:`, err?.message || err);
      } catch (_e) { /* noop */ }
    }
  }
  return any;
}

/**
 * Resolve Tuya cluster on endpoint 1/2 (alias-safe).
 */
function findTuyaCluster(device, zclNode) {
  const node = zclNode || device?.zclNode;
  for (const epId of [1, 2]) {
    const ep = node?.endpoints?.[epId];
    if (!ep?.clusters) {continue;}
    const c = ep.clusters.tuya
      || ep.clusters.tuyaManufacturer
      || ep.clusters.manuSpecificTuya
      || ep.clusters.tuyaSpecific
      || ep.clusters[0xEF00]
      || ep.clusters[61184];
    if (c) {return c;}
  }
  return null;
}

module.exports = {
  MAGIC_PACKET_CONFIGS,
  getMagicPacketConfig,
  executeMagicPackets,
  findTuyaCluster,
};
