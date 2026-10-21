'use strict';
/**
 * P2930c — Tuya Zigbee (EF00) protocol profile, per device, built at runtime.
 * Our own summary (no code copied) of: Tuya developer docs "Zigbee serial/EF00 private
 * cluster" command list; Koenkk/zigbee-herdsman-converters src/lib/tuya.ts (MIT);
 * zigpy/zha-device-handlers tuya quirks (Apache-2.0). Native ZCL clusters stay mandatory;
 * this profile only decides how optional EF00 traffic is read.
 */
const EF00_COMMANDS = Object.freeze({
  0x00: 'dataRequest', 0x01: 'dataResponse', 0x02: 'dataReport', 0x03: 'dataQuery',
  0x04: 'sendData', 0x05: 'dataReport05', 0x06: 'activeStatusReportAlt',
  0x0B: 'otaQuery', 0x10: 'mcuVersionRequest', 0x11: 'mcuVersionResponse',
  0x12: 'mcuOtaNotify', 0x24: 'mcuSyncTime', 0x25: 'mcuGatewayConnectionStatus',
});
const DP_TYPES = Object.freeze({ 0: 'raw', 1: 'bool', 2: 'value', 3: 'string', 4: 'enum', 5: 'bitmap' });

/** Tuya encodes appVersion as 0bMMmmpppp (major 2 bits, minor 2 bits, patch 4 bits). */
function decodeAppVersion(v) {
  if (!Number.isInteger(v) || v < 0 || v > 255) {return null;}
  return `${(v >> 6) & 0x03}.${(v >> 4) & 0x03}.${v & 0x0f}`;
}

/** Manufacturer-name generation (prefix). Unknown prefixes are leads, never guessed. */
function generationOf(mfr) {
  const m = String(mfr || '');
  const p = (m.match(/^_T[A-Z0-9]+_/) || [''])[0].toUpperCase();
  const known = {
    _TZ3000_: { family: 'zcl', ef00: false, note: 'mostly native ZCL (TS0xxx)' },
    _TZ3210_: { family: 'zcl', ef00: false, note: 'newer ZCL firmware, some EF00 extras' },
    _TZ3290_: { family: 'zcl', ef00: false, note: 'IR/RF blasters' },
    _TZE200_: { family: 'ef00', ef00: true, note: 'TS0601 MCU over EF00' },
    _TZE204_: { family: 'ef00', ef00: true, note: 'TS0601 newer MCU firmware' },
    _TZE284_: { family: 'ef00', ef00: true, note: 'TS0601 2023+ firmware' },
    _TZE600_: { family: 'ef00', ef00: true, note: 'TS0601 variant' },
    _TYZB01_: { family: 'zcl', ef00: false, note: 'older ZCL firmware' },
    _TYST11_: { family: 'ef00', ef00: true, note: 'early TS0601 firmware' },
  };
  return known[p] ? { prefix: p, status: 'documented', ...known[p] } : { prefix: p || null, status: 'lead', family: null, ef00: null };
}

const PROFILES = Object.freeze({ 0x0104: 'HA (Zigbee 3.0 and HA 1.2 share 0x0104)', 0xC05E: 'ZLL', 0xA1E0: 'Green Power' });
/** Zigbee 3.0 vs HA 1.2: same profile id; 3.0 devices expose Basic zclVersion >= 3 / stackVersion. */
function profileOf({ profileId, zclVersion } = {}) {
  const name = PROFILES[profileId] || null;
  const zb30 = Number.isInteger(zclVersion) ? zclVersion >= 3 : null;
  return { profileId: profileId ?? null, name, zigbee30: zb30, status: name ? 'documented' : 'lead' };
}

/**
 * Parse an EF00 payload with a fallback chain:
 *  1) standard: seq(2) then [dp(1) type(1) len(2) data]...
 *  2) legacy: status(1) transid(1) then the same DP records (same bytes, older naming)
 *  3) single-byte length records seen on some early firmwares — accepted only if the whole
 *     buffer is consumed exactly; otherwise returned as a lead with the raw hex.
 */
function parseDpFrame(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 6) {return { format: 'lead', dps: [], raw: Buffer.isBuffer(buf) ? buf.toString('hex') : null };}
  const walk = (start, lenBytes) => {
    const dps = []; let i = start;
    while (i < buf.length) {
      if (i + 2 + lenBytes > buf.length) {return null;}
      const dp = buf[i]; const type = buf[i + 1];
      const len = lenBytes === 2 ? buf.readUInt16BE(i + 2) : buf[i + 2];
      const s = i + 2 + lenBytes;
      if (!DP_TYPES[type] || s + len > buf.length) {return null;}
      dps.push({ dp, type: DP_TYPES[type], data: buf.slice(s, s + len) });
      i = s + len;
    }
    return dps.length ? dps : null;
  };
  const std = walk(2, 2);
  if (std) {return { format: 'standard', seq: buf.readUInt16BE(0), dps: std };}
  const short = walk(2, 1);
  if (short) {return { format: 'short_len', seq: buf.readUInt16BE(0), dps: short };}
  return { format: 'lead', dps: [], raw: buf.toString('hex') };
}

/** Per-device profile from what the device actually reported (Basic + first frames). */
function buildProfile({ manufacturerName, modelId, appVersion, stackVersion, hwVersion, zclVersion, profileId, seenCommands } = {}) {
  const gen = generationOf(manufacturerName);
  const cmds = [...new Set(seenCommands || [])].filter((c) => EF00_COMMANDS[c] !== undefined);
  const chain = ['native'];
  if (gen.ef00 !== false || cmds.length) {chain.push('ef00:standard', 'ef00:short_len');}
  chain.push('raw:lead');
  return {
    manufacturerName: manufacturerName || null, modelId: modelId || null,
    firmware: { app: decodeAppVersion(appVersion), stackVersion: stackVersion ?? null, hwVersion: hwVersion ?? null },
    generation: gen, profile: profileOf({ profileId, zclVersion }),
    ef00: { seen: cmds.map((c) => EF00_COMMANDS[c]), timeSync: cmds.includes(0x24), mcuVersion: cmds.includes(0x11), gatewayStatus: cmds.includes(0x25) },
    chain,
  };
}

module.exports = { EF00_COMMANDS, DP_TYPES, decodeAppVersion, generationOf, profileOf, parseDpFrame, buildProfile };
