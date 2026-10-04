'use strict';

/**
 * Decoder for the 8-byte "phase" raw datapoint some Tuya DP meters and breakers send
 * (voltage, current and power of one phase packed together).
 *
 * Layout, big-endian: bytes 0-1 voltage in 0.1 V, bytes 2-4 current in mA,
 * bytes 5-7 power in W. Negative power is not two's complement: values with the top
 * bit set are encoded as (0x99999A - |power|).
 * Layout credit: Koen Kanters and the zigbee-herdsman-converters contributors
 * (valueConverter.phaseVariant2WithPhase, Z2M issues #18603 and #32995). Own implementation.
 */

const NEG_THRESHOLD = 0x800000;
const NEG_OFFSET = 0x99999a;

function toBuffer(raw) {
  if (Buffer.isBuffer(raw)) {return raw;}
  if (Array.isArray(raw)) {return Buffer.from(raw);}
  if (raw && raw.type === 'Buffer' && Array.isArray(raw.data)) {return Buffer.from(raw.data);}
  if (typeof raw === 'string' && raw.length) {
    const b = Buffer.from(raw, 'base64');
    return b.length ? b : null;
  }
  return null;
}

/** @returns {{voltage:number,current:number,power:number}|null} */
function decodePhaseVariant2(raw) {
  const buf = toBuffer(raw);
  if (!buf || buf.length < 8) {return null;}
  const voltage = ((buf[0] << 8) | buf[1]) / 10;
  const current = ((buf[2] << 16) | (buf[3] << 8) | buf[4]) / 1000;
  let power = (buf[5] << 16) | (buf[6] << 8) | buf[7];
  if (power >= NEG_THRESHOLD) {power -= NEG_OFFSET;}
  return { voltage, current, power };
}

module.exports = { decodePhaseVariant2, toBuffer };
