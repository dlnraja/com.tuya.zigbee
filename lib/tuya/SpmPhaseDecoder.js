'use strict';

/**
 * Decoder for Tuya SPM01 (1P+N) / SPM02 (3P+N) DIN energy monitors.
 *
 * Packed phase datapoint (raw, 8 bytes, big-endian):
 *   [0..1] voltage  (0.1 V) · [2..4] current (mA) · [5..7] active power (W)
 * Negative power is reported as OFFSET - |P| (24-bit, OFFSET = 0x99999a) when bit 23 is set.
 *
 * DP map: 1 = forward energy (kWh ÷100), 2 = reverse energy (kWh ÷100),
 *         6 = phase A (SPM01: the only phase), 7 = phase B, 8 = phase C (SPM02).
 *
 * Credit: byte layout documented by zigbee-herdsman-converters / Zigbee2MQTT
 * (Koen Kanters and contributors, tuya.ts SPM01/SPM02, valueConverter.phaseVariant4 /
 * phaseVariant2WithPhase). Independent implementation, no code copied.
 */

const SPM01 = new Set(['_tze200_bcusnqt8', '_tze204_bcusnqt8', '_tze284_bcusnqt8']);
const SPM02 = new Set(['_tze200_ves1ycwx', '_tze204_ves1ycwx', '_tze284_ves1ycwx']);
const NEG_OFFSET = 0x99999a;

function spmVariant(mfr) {
  const m = String(mfr || '').toLowerCase();
  if (SPM01.has(m)) return 'spm01';
  if (SPM02.has(m)) return 'spm02';
  return null;
}

function toBuf(raw) {
  if (Buffer.isBuffer(raw)) return raw;
  if (Array.isArray(raw)) return Buffer.from(raw);
  if (raw && raw.type === 'Buffer' && Array.isArray(raw.data)) return Buffer.from(raw.data);
  if (typeof raw === 'string') {
    if (/^[0-9a-f]+$/i.test(raw) && raw.length % 2 === 0) return Buffer.from(raw, 'hex');
    return Buffer.from(raw, 'base64');
  }
  return null;
}

function u24(b, o) { return (b[o] << 16) | (b[o + 1] << 8) | b[o + 2]; }

/** @returns {{ok:boolean, voltage?:number, current?:number, power?:number, reason?:string}} */
function decodePhase(raw) {
  const b = toBuf(raw);
  if (!b || b.length < 8) return { ok: false, reason: 'too_short' };
  const voltage = ((b[0] << 8) | b[1]) / 10;
  const current = u24(b, 2) / 1000;
  let power = u24(b, 5);
  if (power & 0x800000) power = power - NEG_OFFSET;
  if (voltage < 0 || voltage > 500 || current > 1000) return { ok: false, reason: 'out_of_range' };
  return { ok: true, voltage, current, power };
}

module.exports = { spmVariant, decodePhase, NEG_OFFSET };
