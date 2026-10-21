'use strict';
/**
 * P2930b — What a Tuya "version" label really means, and how to fall back.
 * Our own summary of public sources (no code copied):
 *  - tinytuya core (jasonacox, MIT): LAN protocols 3.1, 3.2, 3.3, 3.4, 3.5; the label
 *    "3.22" is tinytuya's alias for a 3.3 socket with "device22" behaviour (status only
 *    via CONTROL_NEW with an explicit dps list).
 *  - tuyapi (codetheweb, MIT): 3.1/3.2/3.3/3.4/3.5 framing; 3.4+ use *_NEW commands.
 *  - LAN framing: 3.1-3.4 use the 0x55AA prefix (3.1 = AES-ECB on writes only with an MD5
 *    signature, 3.2/3.3 = AES-ECB on every payload, 3.4 = session key negotiation +
 *    HMAC-SHA256); 3.5 uses the 0x6699 prefix with AES-GCM.
 *  - Tuya developer docs: device info "pv"/"bv" (often 1.x / 2.x) are the cloud protocol
 *    and baseline firmware versions, NOT the LAN protocol. The MCU serial protocol (UART
 *    0x55AA frames) carries its own version byte (0x00 module->MCU, 0x03 MCU->module).
 *    Tuya BLE advertisements carry a BLE protocol version (2/3/4, ha_tuya_ble by PlusPlus-ua).
 *    Zigbee EF00 frames carry no protocol version. None of these select a LAN cipher.
 * Rule: never invent a LAN protocol. Unknown labels are returned as leads and probed with
 * the documented chain only.
 */
const LAN = Object.freeze({
  '3.1': { frame: '55aa', cipher: 'aes-128-ecb (writes only) + md5 sig', setCmd: 7, queryCmd: 10 },
  '3.2': { frame: '55aa', cipher: 'aes-128-ecb', setCmd: 7, queryCmd: 13, explicitDps: true },
  '3.3': { frame: '55aa', cipher: 'aes-128-ecb', setCmd: 7, queryCmd: 10 },
  '3.4': { frame: '55aa', cipher: 'aes-128-ecb + session key + hmac-sha256', setCmd: 13, queryCmd: 16 },
  '3.5': { frame: '6699', cipher: 'aes-128-gcm + session key', setCmd: 13, queryCmd: 16 },
});
const ORDER = Object.freeze(['3.1', '3.2', '3.3', '3.4', '3.5']);
const ALIASES = Object.freeze({ '3.22': { lan: '3.3', variant: 'device22' } });
const NON_LAN = Object.freeze({
  1: 'cloud/firmware label (device info pv/bv), not a LAN protocol',
  2: 'cloud/firmware label (device info pv/bv), not a LAN protocol',
});
const PROBE = Object.freeze(['3.3', '3.4', '3.1', '3.5', '3.2']);

function neighbours(v) {
  const i = ORDER.indexOf(v);
  return [ORDER[i + 1], ORDER[i - 1]].filter(Boolean);
}

/**
 * @returns {{ input, lan, variant, status: 'documented'|'alias'|'non_lan'|'lead'|'auto', note, chain: string[] }}
 */
function resolve(label) {
  const input = label === undefined || label === null ? '' : String(label).trim().replace(/^v/i, '');
  const build = (lan, extra) => {
    const chain = [...new Set([lan, ...(lan ? neighbours(lan) : []), ...PROBE].filter(Boolean))];
    return { input, lan: lan || null, variant: null, note: null, chain, ...extra };
  };
  if (!input || input === 'auto') {return build(null, { status: 'auto' });}
  if (LAN[input]) {return build(input, { status: 'documented' });}
  if (ALIASES[input]) {return build(ALIASES[input].lan, { status: 'alias', variant: ALIASES[input].variant });}
  const n = parseFloat(input);
  if (Number.isFinite(n) && NON_LAN[Math.floor(n)]) {return build(null, { status: 'non_lan', note: NON_LAN[Math.floor(n)] });}
  // 3.x we do not know (e.g. a future 3.6): probe documented ones from the closest, log a lead.
  if (/^3\.\d+$/.test(input)) {
    const closest = n >= 3.5 ? '3.5' : '3.3';
    return build(closest, { status: 'lead', note: `undocumented LAN label ${input}; probing documented versions` });
  }
  return build(null, { status: 'lead', note: `unknown protocol label ${input}` });
}

/** Detect the LAN protocol from a raw frame header (first bytes off the socket/UDP). */
function detectFromFrame(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 4) {return null;}
  const p = buf.readUInt32BE(0);
  if (p === 0x00006699) {return '3.5';}
  if (p !== 0x000055aa) {return null;}
  // 55AA payload after 16-byte header may start with an ASCII "3.x" version tag.
  const tag = buf.length >= 23 ? buf.slice(20, 23).toString('latin1') : '';
  return LAN[tag] ? tag : null;
}

module.exports = { LAN, ORDER, ALIASES, PROBE, resolve, detectFromFrame, neighbours };
