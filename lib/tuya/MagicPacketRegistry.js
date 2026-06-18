'use strict';
// v9.0.40: Magic Packet Registry - Tuya device initialization packets
// Based on Z2M tuya magic packet patterns + known device requirements

/**
 * Magic packet types:
 * - dataQuery (0x03): Request device to report all DPs
 * - mcuVersionRequest (0x10): Configure MCU reporting
 * - mcuGatewaySniffer (0x25): Gateway sub-device discovery
 *
 * Some devices require specific magic packets to start reporting data.
 * This registry maps manufacturer/productId patterns to required packets.
 */

const MAGIC_PACKET_CONFIGS = {
  // TS0601 devices that need MCU version request before reporting
  TS0601_STANDARD: {
    packets: [
      { command: 'mcuVersionRequest', data: Buffer.from([0x00, 0x00]), delay: 100 },
      { command: 'dataQuery', data: Buffer.from([]), delay: 0 },
    ],
    appliesTo: (mfr, pid) => pid && pid.startsWith('TS060'),
  },

  // LCD temperature displays need time sync after init
  LCD_TEMPERATURE: {
    packets: [
      { command: 'mcuVersionRequest', data: Buffer.from([0x00, 0x02]), delay: 100 },
      { command: 'dataQuery', data: Buffer.from([]), delay: 0 },
    ],
    appliesTo: (mfr, pid) => mfr && (mfr.includes('_TZE200_') || mfr.includes('_TZE204_')) && pid === 'TS0601',
  },

  // Weather stations (ZT08) need commit trigger after time sync
  ZT08_WEATHER: {
    packets: [
      { command: 'mcuVersionRequest', data: Buffer.from([0x00, 0x02]), delay: 100 },
      { command: 'dataQuery', data: Buffer.from([]), delay: 200 },
    ],
    appliesTo: (mfr) => mfr && mfr.includes('ZT08'),
  },

  // BSEED switches need special init
  BSEED_SWITCH: {
    packets: [
      { command: 'mcuVersionRequest', data: Buffer.from([0x00, 0x00]), delay: 50 },
      { command: 'dataQuery', data: Buffer.from([]), delay: 50 },
    ],
    appliesTo: (mfr) => mfr && mfr.toLowerCase().includes('bseed'),
  },

  // Xiaomi/Aqara need basic cluster attribute write
  XIAOMI_KEEPALIVE: {
    packets: [
      { command: 'xiaomiKeepalive', data: Buffer.from([0x01]), delay: 0 },
    ],
    appliesTo: (mfr) => mfr && (mfr.includes('LUMI') || mfr.includes('lumi')),
  },
};

/**
 * Get magic packet config for a device
 * @param {string} manufacturerName
 * @param {string} productId
 * @returns {object|null} - { packets: [...] } or null
 */
function getMagicPacketConfig(manufacturerName, productId) {
  const mfr = (manufacturerName || '').toLowerCase();
  const pid = (productId || '').toUpperCase();

  for (const [, config] of Object.entries(MAGIC_PACKET_CONFIGS)) {
    if (config.appliesTo(mfr, pid)) {
      return config;
    }
  }
  return null;
}

/**
 * Execute magic packets on a Tuya device
 * @param {object} device - TuyaZigbeeDevice instance
 * @param {object} cluster - TuyaSpecificCluster instance
 * @param {object} config - Magic packet config
 */
async function executeMagicPackets(device, cluster, config) {
  if (!config || !config.packets) return;

  for (const pkt of config.packets) {
    try {
      if (pkt.command === 'mcuVersionRequest') {
        await cluster.mcuVersionRequest({ data: pkt.data });
      } else if (pkt.command === 'dataQuery') {
        await cluster.dataQuery({});
      } else if (pkt.command === 'xiaomiKeepalive') {
        // Xiaomi keepalive is handled by ExoticQuirkEngine
        continue;
      }
      if (pkt.delay > 0) {
        await new Promise(r => this.homey.setTimeout(r, pkt.delay));
      }
    } catch (err) {
      device.log(`[MagicPacket] ${pkt.command} failed:`, err.message);
    }
  }
}

module.exports = { MAGIC_PACKET_CONFIGS, getMagicPacketConfig, executeMagicPackets };
