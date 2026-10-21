'use strict';
// P2930e (21/10/2026 Paris): bounded retry for cloud HTTPS calls that die on a transient socket error.
// Node >= 19 reuses keep-alive sockets by default; when the Tuya server has closed an idle one, the
// next request fails with "socket hang up" / ECONNRESET before any response. A fresh attempt
// succeeds. Only idempotent methods (GET/HEAD) are retried, so a device command is never sent twice.

const TRANSIENT_RE = /socket hang up|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|EAI_AGAIN|ENOTFOUND|ECONNABORTED|ENETUNREACH|EHOSTUNREACH/i; // 15 s request timeouts are not retried (would stall a Flow 45 s)
const IDEMPOTENT = new Set(['GET', 'HEAD']);

function isTransientNetError(errOrMsg) {
  if (!errOrMsg) {return false;}
  const s = typeof errOrMsg === 'string' ? errOrMsg : `${errOrMsg.code || ''} ${errOrMsg.message || errOrMsg.msg || ''}`;
  return TRANSIENT_RE.test(s);
}

// module-level helper, no homey instance here: native setTimeout for a short (<= 3.6 s) backoff.
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * @param {() => Promise<any>} fn one attempt
 * @param {object} o
 * @param {string} o.method HTTP method; non-idempotent methods run once
 * @param {(result:any) => boolean} [o.resultIsTransient] for transports that resolve errors instead of rejecting
 * @param {number} [o.retries=2] @param {number} [o.baseMs=400] @param {Function} [o.sleep]
 */
async function withTransientRetry(fn, o = {}) {
  const retries = IDEMPOTENT.has(String(o.method || '').toUpperCase()) ? Math.max(0, Math.min(3, o.retries == null ? 2 : o.retries)) : 0;
  const sleep = o.sleep || delay;
  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fn();
    } catch (err) {
      if (attempt < retries && isTransientNetError(err)) { await sleep(o.baseMs == null ? 400 * 3 ** attempt : o.baseMs); continue; }
      throw err;
    }
    if (attempt < retries && o.resultIsTransient && o.resultIsTransient(res)) { await sleep(o.baseMs == null ? 400 * 3 ** attempt : o.baseMs); continue; }
    return res;
  }
}

module.exports = { withTransientRetry, isTransientNetError };
