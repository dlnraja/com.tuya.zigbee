'use strict';

/**
 * P3050 — build the argument object of an outgoing Tuya DP command (0xEF00 cmd 0x00 / 0x04)
 * from the schema of the cluster class that is ACTUALLY live on the node.
 *
 * WHY: three 0xEF00 classes exist in this app and ClusterRegistry merges them at runtime.
 * The canonical one (lib/clusters) declares datapoint/sendData as
 * {status, transid, dp, datatype, length, data}; lib/tuya declares setData/sendData as
 * {seq, dpValues}. Passing the wrong shape throws "<x> is an unexpected property" before
 * a single byte leaves Homey. Both shapes carry the same DP record on the wire
 * (dp, type, len BE, data); only the 2-byte sequence differs in byte order (status|transid
 * vs uint16 LE, as zigbee-herdsman does), and the MCU treats it as opaque.
 * Spotted by iassael in PR #577 (Moes Fingerbot Plus).
 */

function commandArgKeys(cluster, cmdName) {
  try {
    const C = cluster && cluster.constructor;
    const def = C && C.COMMANDS && C.COMMANDS[cmdName];
    if (def && def.args && typeof def.args === 'object') {return Object.keys(def.args);}
  } catch (_e) { /* schema unreadable: fall back to the classic shape */ }
  return null;
}

function dpValuesBuffer(dp, datatype, data) {
  const payload = Buffer.isBuffer(data) ? data : Buffer.from(data || []);
  const header = Buffer.from([dp & 0xff, datatype & 0xff, (payload.length >> 8) & 0xff, payload.length & 0xff]);
  return Buffer.concat([header, payload]);
}

/**
 * @returns {object} args matching the live command schema
 */
function buildDpCommandArgs(cluster, cmdName, { dp, datatype, data, transid = 0 }) {
  const keys = commandArgKeys(cluster, cmdName);
  const payload = Buffer.isBuffer(data) ? data : Buffer.from(data || []);
  if (keys && keys.includes('dpValues')) {
    return { seq: transid & 0xffff, dpValues: dpValuesBuffer(dp, datatype, payload) };
  }
  return { status: 0, transid: transid & 0xff, dp, datatype, length: payload.length, data: payload };
}

module.exports = { buildDpCommandArgs, commandArgKeys, dpValuesBuffer };
