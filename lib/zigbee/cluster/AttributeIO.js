'use strict';

/**
 * AttributeIO — readAttributes / writeAttributes with timeout, bounded retry
 * and fallbacks:
 *   1. try as given (with manufacturerId when the attribute is mfr-specific,
 *      e.g. Tuya 0x1001 on 0xEF00 / 0xE001 attrs need code 0x1002 per Z2M);
 *   2. on UNSUPPORTED_ATTRIBUTE / timeout, retry once with the alternative
 *      (with ↔ without manufacturer code), as zigpy quirks do;
 *   3. read: last resort reads attributes one by one (some Tuya firmwares
 *      fail a multi-attribute read as a whole).
 */

const DEFAULT_TIMEOUT = 5000;
const DEFAULT_RETRIES = 1;

// native setTimeout: library helper with no Homey instance (unref'd, cleared in finally)
function withTimeout(p, ms) {
  let t;
  return Promise.race([
    Promise.resolve(p).finally(() => clearTimeout(t)),
    // native setTimeout (no Homey instance in this helper)
    new Promise((_, rej) => { t = setTimeout(() => rej(new Error('attr_timeout')), ms); if (t.unref) t.unref(); }),
  ]);
}

async function _try(fn, { timeout, retries }) {
  let last;
  for (let i = 0; i <= retries; i++) {
    try { return await withTimeout(fn(), timeout); } catch (e) { last = e; }
  }
  throw last;
}

async function readAttributes(cluster, attrs, { manufacturerId, timeout = DEFAULT_TIMEOUT, retries = DEFAULT_RETRIES } = {}) {
  const opt = { timeout, retries };
  const call = mfr => () => cluster.readAttributes(attrs, mfr !== undefined ? { manufacturerId: mfr } : undefined);
  try { return await _try(call(manufacturerId), opt); } catch (e1) {
    const alt = manufacturerId !== undefined ? undefined : cluster.constructor && cluster.constructor.MANUFACTURER_ID;
    if (manufacturerId !== undefined || alt !== undefined) {
      try { return await _try(call(alt), { timeout, retries: 0 }); } catch (e2) { /* fall through */ }
    }
    if (attrs.length > 1) {
      const out = {};
      for (const a of attrs) {
        try { Object.assign(out, await _try(() => cluster.readAttributes([a]), { timeout, retries: 0 })); } catch (e3) { /* skip */ }
      }
      if (Object.keys(out).length) return out;
    }
    throw e1;
  }
}

async function writeAttributes(cluster, values, { manufacturerId, timeout = DEFAULT_TIMEOUT, retries = DEFAULT_RETRIES } = {}) {
  const call = mfr => () => cluster.writeAttributes(values, mfr !== undefined ? { manufacturerId: mfr } : undefined);
  try { return await _try(call(manufacturerId), { timeout, retries }); } catch (e1) {
    if (manufacturerId === undefined) throw e1;
    return _try(call(undefined), { timeout, retries: 0 });
  }
}

module.exports = { readAttributes, writeAttributes, withTimeout, DEFAULT_TIMEOUT, DEFAULT_RETRIES };
