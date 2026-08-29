'use strict';

/**
 * MagicPacketRegistry — restored from pre-P92.17 (was deleted as "dead" but
 * profiles were never elevated). Complements genBasic 0xFFFE handshake with
 * MCU 0x10 + dataQuery sequences for TS0601 / LCD / weather / BSEED.
 */

const { safeSetTimeout } = require('../utils/safe-timers');
const { isBatteryCoverMfr } = require('../helpers/batteryPowerSource');

// More-specific profiles MUST come before TS0601_STANDARD (first match wins).
const MAGIC_PACKET_CONFIGS = {
  ZT08_WEATHER: {
    packets: [
      { command: 'mcuVersionRequest', data: Buffer.from([0x00, 0x02]), delay: 100 },
      { command: 'dataQuery', data: Buffer.from([]), delay: 200 },
    ],
    appliesTo: (mfr) => /ZT08/i.test(mfr || ''),
  },

  // WHY(P2296): Z2M #28655/#29124 — mcuVersionRequest spam drains ZM16EL battery.
  // dataQuery only; never 0x10 MCU version poll for these couples.
  ZEISMART_BATTERY_COVER: {
    packets: [
      { command: 'dataQuery', data: Buffer.from([]), delay: 0 },
    ],
    appliesTo: (mfr, pid) => isBatteryCoverMfr(mfr) && /^TS0601$/i.test(pid || ''),
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

  // Scene remotes: wake via dataQuery when EF00 present (TS004F often ZCL-only)
  TS004F_HYBRID: {
    packets: [
      { command: 'dataQuery', data: Buffer.from([]), delay: 0 },
    ],
    appliesTo: (mfr, pid) => /^TS004F$/i.test(pid || ''),
  },

  // Energy plugs — MCU query after genBasic (divisors read separately via quirk seq)
  ENERGY_PLUG: {
    packets: [
      { command: 'mcuVersionRequest', data: Buffer.from([0x00, 0x00]), delay: 80 },
      { command: 'dataQuery', data: Buffer.from([]), delay: 0 },
    ],
    appliesTo: (mfr, pid) => /^(TS011F|TS0121)$/i.test(pid || ''),
  },

  // Curtain / cover modules on EF00
  COVER_TS130F: {
    packets: [
      { command: 'mcuVersionRequest', data: Buffer.from([0x00, 0x00]), delay: 100 },
      { command: 'dataQuery', data: Buffer.from([]), delay: 0 },
    ],
    appliesTo: (mfr, pid) => /^TS130F$/i.test(pid || ''),
  },

  // Generic TZE* MCU sensors (catch-all before TS060 pid family)
  TZE_MCU_GENERIC: {
    packets: [
      { command: 'mcuVersionRequest', data: Buffer.from([0x00, 0x02]), delay: 100 },
      { command: 'dataQuery', data: Buffer.from([]), delay: 0 },
    ],
    appliesTo: (mfr, pid) => /^_TZE/i.test(mfr || '') && /^TS0/i.test(pid || ''),
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
