'use strict';

/**
 * P3017: decode the ZCL header of a raw incoming frame for diagnostics.
 * ZCL 2.4.1: frame control (bit0-1 frame type: 0 global / 1 cluster-specific, bit2 manufacturer
 * specific → 2-byte LE manufacturer code follows), then TSN, then command id.
 * WHY (#560 artisare, _TZE200_rxq4iti9): the L0 log printed `cmd=?` for every EF00/0x0000 frame
 * because the frame is a raw Buffer; users read it as an error although the frame continues to the
 * EF00 DP path. Pure function, never throws.
 */

function _buf(frame) {
  if (!frame) { return null; }
  if (Buffer.isBuffer(frame)) { return frame; }
  if (Buffer.isBuffer(frame.data)) { return frame.data; }
  if (frame.type === 'Buffer' && Array.isArray(frame.data)) { return Buffer.from(frame.data); }
  return null;
}

/** @returns {{frameType:'global'|'cluster', manufacturerSpecific:boolean, manufacturerCode:number|null, tsn:number, cmdId:number}|null} */
function parseZclHeader(frame) {
  try {
    if (frame && Number.isFinite(frame.cmdId)) {
      return { frameType: frame.frameControl && frame.frameControl.clusterSpecific ? 'cluster' : 'global', manufacturerSpecific: !!(frame.frameControl && frame.frameControl.manufacturerSpecific), manufacturerCode: frame.manufacturerId ?? null, tsn: frame.trxSequenceNumber ?? null, cmdId: frame.cmdId };
    }
    const b = _buf(frame);
    if (!b || b.length < 3) { return null; }
    const fc = b[0];
    const ms = (fc & 0x04) !== 0;
    const off = ms ? 3 : 1;
    if (b.length < off + 2) { return null; }
    return { frameType: (fc & 0x03) === 1 ? 'cluster' : 'global', manufacturerSpecific: ms, manufacturerCode: ms ? b.readUInt16LE(1) : null, tsn: b[off], cmdId: b[off + 1] };
  } catch (_e) { return null; }
}

/** Short log fragment, e.g. "cmd=0x02 (cluster-specific, tsn 17) → forwarded to EF00 DP path". */
function describeFrame(frame, clusterId) {
  const h = parseZclHeader(frame);
  if (!h) { return 'cmd=?'; }
  const parts = [`cmd=0x${h.cmdId.toString(16).padStart(2, '0')}`, `(${h.frameType === 'cluster' ? 'cluster-specific' : 'global'}${h.manufacturerSpecific ? `, mfr 0x${Number(h.manufacturerCode).toString(16)}` : ''}${h.tsn != null ? `, tsn ${h.tsn}` : ''})`];
  const c = Number(clusterId);
  if (c === 0xEF00 || c === 61184) { parts.push('→ forwarded to EF00 DP path (not an error)'); }
  else if (c === 0x0000) { parts.push('→ forwarded (Tuya genBasic private, ignored like Z2M)'); }
  return parts.join(' ');
}

module.exports = { parseZclHeader, describeFrame };
