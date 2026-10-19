'use strict';

/**
 * Fill the fields of a Tuya EF00 `datapoint` command that a caller left out.
 * Bare `tuya.datapoint({ dp, datatype, data })` calls (about 50 driver call sites) used to be serialised with
 * length=0 next to a non-empty payload and transid=0, a frame the MCU ignores. Fully specified calls pass
 * through untouched. (#560 root cause, P2866)
 */
let _dpTransId = 0;

function normalizeDatapointArgs(args) {
  if (!args || typeof args !== 'object') { return args; }
  const out = { ...args };
  if (Array.isArray(out.data)) { out.data = Buffer.from(out.data); }
  if (out.status === undefined) { out.status = 0; }
  if (out.transid === undefined) { _dpTransId = (_dpTransId + 1) & 0xff; out.transid = _dpTransId; }
  if (out.length === undefined && Buffer.isBuffer(out.data)) { out.length = out.data.length; }
  return out;
}

module.exports = { normalizeDatapointArgs };
