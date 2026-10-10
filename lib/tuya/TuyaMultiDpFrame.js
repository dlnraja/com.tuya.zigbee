'use strict';

// WHY(2026-10-10, Gledopto GL-SPI-206P): bursts of single-DP writes freeze some Tuya light MCUs
// (Koenkk/zigbee2mqtt#32754). zigbee-herdsman-converters sends every DP of one change in ONE
// EF00 dataRequest (seq + [dp,type,len16,data]...). Own implementation of that frame layout.

const TYPE_IDS = { raw: 0, bool: 1, boolean: 1, value: 2, string: 3, enum: 4, bitmap: 5 };

function encodeValue(typeId, value) {
  if (typeId === 0) {return Buffer.isBuffer(value) ? value : Buffer.from(value || []);}
  if (typeId === 1) {return Buffer.from([value ? 1 : 0]);}
  if (typeId === 3) {return Buffer.from(String(value ?? ''), 'utf8');}
  if (typeId === 4) {return Buffer.from([Number(value) & 0xff]);}
  const b = Buffer.alloc(4);
  b.writeInt32BE(Math.round(Number(value) || 0), 0);
  return b;
}

/** @param {Array<{dp:number,value:any,type:string}>} list -> [{dp,typeId,data}] */
function toRecords(list) {
  return (list || []).map(({ dp, value, type }) => {
    const typeId = typeof type === 'number' ? type : TYPE_IDS[String(type || 'value').toLowerCase()] ?? 2;
    return { dp: Number(dp) & 0xff, typeId, data: encodeValue(typeId, value) };
  });
}

/** Records after the first, concatenated as dp(1) type(1) len(2 BE) data. */
function tailBuffer(records) {
  return Buffer.concat(records.slice(1).map((r) => {
    const h = Buffer.alloc(4);
    h[0] = r.dp; h[1] = r.typeId; h.writeUInt16BE(r.data.length, 2);
    return Buffer.concat([h, r.data]);
  }));
}

/** Full TY_DATA_REQUEST payload: seq16 + all records (for endpoint.sendFrame). */
function fullFrame(records, seq) {
  const head = Buffer.alloc(2);
  head.writeUInt16BE(seq & 0xffff, 0);
  const first = records[0];
  const h = Buffer.alloc(4);
  h[0] = first.dp; h[1] = first.typeId; h.writeUInt16BE(first.data.length, 2);
  return Buffer.concat([head, h, first.data, tailBuffer(records)]);
}

function findTuyaCluster(device) {
  const eps = device?.zclNode?.endpoints || {};
  for (const id of [1, 2, 3, 11]) {
    const ep = eps[id];
    const c = ep?.clusters && (ep.clusters.tuya || ep.clusters.tuyaManufacturer || ep.clusters.tuyaSpecific
      || ep.clusters.manuSpecificTuya || ep.clusters[0xEF00] || ep.clusters[61184]);
    if (c || typeof ep?.sendFrame === 'function') {return { ep, cluster: c || null };}
  }
  return { ep: null, cluster: null };
}

/**
 * Send several DPs in one EF00 frame. Returns true when one frame left; false when no single-frame
 * path exists (caller then falls back to per-DP writes).
 */
async function sendMultiDp(device, list) {
  const records = toRecords(list);
  if (!records.length) {return true;}
  const { ep, cluster } = findTuyaCluster(device);
  const seq = Math.floor(Math.random() * 0xffff);
  if (cluster && typeof cluster.datapoint === 'function') {
    try {
      // status+transid == seq16; the tail records ride after the first record's data.
      const first = records[0];
      await cluster.datapoint({
        status: (seq >> 8) & 0xff, transid: seq & 0xff, dp: first.dp, datatype: first.typeId,
        length: first.data.length, data: Buffer.concat([first.data, tailBuffer(records)]),
      });
      return true;
    } catch (_e) { /* fall through to raw frame */ }
  }
  if (ep && typeof ep.sendFrame === 'function') {
    try { await ep.sendFrame(0xEF00, fullFrame(records, seq), 0x00); return true; } catch (_e) { /* caller falls back */ }
  }
  return false;
}

module.exports = { sendMultiDp, toRecords, fullFrame, tailBuffer, TYPE_IDS };
