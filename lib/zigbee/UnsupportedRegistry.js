'use strict';

/**
 * v9.0.412 (P92.120): UnsupportedRegistry — negative cache for unsupported
 * ZCL operations.
 *
 * Problem (user observation from diag logs): Tuya devices frequently lack
 * standard ZCL attributes/commands. Every poll cycle and every boot the app
 * re-asked for them, the device answered UNSUPPORTED_ATTRIBUTE /
 * UNSUPPORTED_CLUSTER_COMMAND, and the diag log flooded with
 * "not supported" / "not compatible" lines.
 *
 * Solution, at the lowest level possible:
 *  1. Detect ZCL "unsupported" statuses precisely (textual names + numeric
 *     status field). Bare hex codes are deliberately NOT matched — 0x86 in
 *     the Ember/ezsp space means "buffer full" (transient), while in the
 *     ZCL status space it means UNSUPPORTED_ATTRIBUTE. Only unambiguous
 *     signals poison the cache.
 *  2. Remember per device (persisted in the device store, survives
 *     restarts) which cluster.attr / cluster.command is unsupported.
 *  3. Skip those operations silently afterwards (one info log at mark
 *     time, nothing after) and activate the alternative path instead
 *     (Tuya DP query, raw cluster access, sibling cluster).
 *  4. Batch-read failures are isolated per attribute once, so a single
 *     bad attribute does not blacklist the good ones.
 *
 * This complements RawClusterFallback (bind/report palliatives) and
 * ErrorClassifier (log-level classification): those catch errors, this
 * one STOPS the operations that are guaranteed to fail.
 */

const MAX_KEYS = 200;
// P3011: shared classifier (2.6 Error(status) / 3.9 ZCLError / numeric / Default Response)
const { classifyZclError, extractZclStatus } = require('./ZclErrorKind');
const MISSING_STRIKES = 3; // absent from 3 successful reads → treat as unsupported
const MAX_SOFT = 48; // in-memory counters bound (P3023: was 100; rebuilt from live traffic)

// ZCL status codes that mean "this device will never support that op"
const UNSUPPORTED_STATUS = new Set([
  0x81, // UNSUPPORTED_CLUSTER_COMMAND
  0x82, // UNSUPPORTED_GENERAL_COMMAND
  0x83, // UNSUP_MANUF_CLUSTER_COMMAND (P3002c, zigbee-clusters zclTypes)
  0x84, // UNSUP_MANUF_GENERAL_COMMAND (P3002c)
  0x86, // UNSUPPORTED_ATTRIBUTE (ZCL status space)
  0x8b, // NOT_FOUND
  0x8c, // UNREPORTABLE_ATTRIBUTE
  0x8d, // INVALID_DATA_TYPE
  0xc3, // UNSUPPORTED_MANUFACTURER_CLUSTER_COMMAND (common Tuya)
]);

const UNSUPPORTED_TEXT = [
  'unsupported_attribute',
  'unsupported attribute',
  'unsupported_cluster_command',
  'unsupported cluster command',
  'unsupported_general_command',
  'unsup_general_command',
  // P3002c: zigbee-clusters 2.6.0 throws new Error(<status name>) (Cluster.js), short names from
  // zclTypes — 'UNSUP_CLUSTER_COMMAND' was not matched by any entry above.
  'unsup_cluster_command',
  'unsup_manuf_cluster_command',
  'unsup_manuf_general_command',
  'unsupported_manufacturer_cluster',
  'unsupported_cluster',
  'unreportable_attribute',
  'not supported',
  'not_supported',
  'unimplemented',
];

/**
 * True only when the error UNAMBIGUOUSLY means "unsupported by design".
 * Timeouts, reachability and Ember resource errors return false — those
 * are transient and must never poison the negative cache.
 * @param {any} err
 * @returns {boolean}
 */
function isUnsupportedError(err) {
  if (!err) { return false; }
  const status = err.status ?? err.zclStatus ?? err.statusCode ??
    (typeof err.code === 'number' ? err.code : undefined);
  if (typeof status === 'number' && UNSUPPORTED_STATUS.has(status)) { return true; }
  const msg = String(err.message || err).toLowerCase();
  if (UNSUPPORTED_TEXT.some((t) => msg.includes(t))) { return true; }
  // Homey UI / zigbee-clusters sometimes put the status in err.name
  const name = String(err.name || '').toLowerCase();
  if (name.includes('unsupported')) { return true; }
  // P3011: zigbee-clusters 3.9 ZCLError carries zclStatus as a NAME string ('UNSUP_CLUSTER_COMMAND')
  try {
    const st = extractZclStatus(err);
    return Boolean(st && UNSUPPORTED_STATUS.has(st.code));
  } catch (_e) { return false; }
}

/**
 * Per-device registry of unsupported ZCL operations.
 */
class UnsupportedRegistry {
  /**
   * @param {Object} device - Homey device instance
   */
  constructor(device) {
    this.device = device;
    this._map = null; // lazy: { 'clusterLabel.item': { at, count, fallback? } }
    this._persistTimer = null;
    this._dirty = false;
    this._soft = new Map(); // P3011: in-memory only { key: {missing, transient, local, lastKind} }
  }

  _softEntry(key) {
    let e = this._soft.get(key);
    if (!e) {
      if (this._soft.size >= MAX_SOFT) { this._soft.delete(this._soft.keys().next().value); }
      e = { missing: 0, transient: 0, local: 0, denied: 0, lastKind: null, lastAt: 0 };
      this._soft.set(key, e);
    }
    return e;
  }

  _load() {
    if (this._map) { return this._map; }
    let stored = {};
    try {
      if (typeof this.device.getStoreValue === 'function') {
        stored = this.device.getStoreValue('zcl_unsupported_matrix') || {};
      }
    } catch (_e) { stored = {}; }
    this._map = stored && typeof stored === 'object' ? stored : {};
    return this._map;
  }

  _key(clusterLabel, item) {
    return `${clusterLabel}.${item}`;
  }

  /**
   * @param {string} clusterLabel - e.g. 'genPowerCfg' or 'msTemperatureMeasurement'
   * @param {string} item - attribute or command name
   * @returns {boolean}
   */
  isKnown(clusterLabel, item) {
    return Boolean(this._load()[this._key(clusterLabel, item)]);
  }

  /**
   * Filter a list of attributes down to the ones NOT known unsupported.
   * @param {string} clusterLabel
   * @param {string[]} attrs
   * @returns {string[]}
   */
  filterAttrs(clusterLabel, attrs) {
    const map = this._load();
    return attrs.filter((a) => !map[this._key(clusterLabel, a)]);
  }

  /**
   * Mark an operation as unsupported (logged once, persisted, then silent).
   * @param {string} clusterLabel
   * @param {string} item
   * @param {string} [fallback] - which alternative path took over
   * @param {string} [status] - P3011: ZCL status name the device answered
   */
  mark(clusterLabel, item, fallback, status) {
    const map = this._load();
    const key = this._key(clusterLabel, item);
    if (map[key]) {
      map[key].count = (map[key].count || 1) + 1;
      map[key].lastAt = Date.now();
    } else {
      // Evict oldest when full
      const keys = Object.keys(map);
      if (keys.length >= MAX_KEYS) {
        keys.sort((a, b) => (map[a].at || 0) - (map[b].at || 0));
        delete map[keys[0]];
      }
      map[key] = { at: Date.now(), lastAt: Date.now(), count: 1, fallback: fallback || null };
      if (status) { map[key].status = String(status); }
      try {
        this.device.log(`[ZCL-SMART] ⛔ ${key} unsupported by this device${ 
          fallback ? ` → fallback: ${fallback}` : ' → skipped from now on'}`);
      } catch (_e) { /* no-op */ }
    }
    this._dirty = true;
    this._schedulePersist();
  }

  _schedulePersist() {
    if (this._persistTimer) { return; }
    const schedule = this.device.homey && typeof this.device.homey.setTimeout === 'function'
      ? this.device.homey.setTimeout.bind(this.device.homey)
      : setTimeout;
    this._persistTimer = schedule(() => {
      this._persistTimer = null;
      if (!this._dirty) { return; }
      this._dirty = false;
      try {
        if (typeof this.device.setStoreValue === 'function') {
          this.device.setStoreValue('zcl_unsupported_matrix', this._map).catch(() => {});
        }
      } catch (_e) { /* no-op */ }
    }, 2000);
  }

  /**
   * P3011: attribute answered READ_ONLY on write → block further writes (reads stay allowed).
   * @param {string} clusterLabel
   * @param {string} attr
   */
  markReadOnly(clusterLabel, attr) { this.mark(clusterLabel, `${attr}@write`, 'read-only'); }

  /** @returns {boolean} true when writes of this attribute are known to fail by design */
  isWriteBlocked(clusterLabel, attr) {
    return this.isKnown(clusterLabel, `${attr}@write`) || this.isKnown(clusterLabel, attr);
  }

  /**
   * P3011: attribute absent from a SUCCESSFUL read response (zigbee-clusters 2.6 silently drops
   * UNSUPPORTED_ATTRIBUTE records). Marked unsupported after MISSING_STRIKES occurrences.
   * @returns {boolean} true when it just got marked
   */
  noteMissing(clusterLabel, attr, fallback) {
    const key = this._key(clusterLabel, attr);
    if (this._load()[key]) { return false; }
    const e = this._softEntry(key);
    e.missing++; e.lastKind = 'missing'; e.lastAt = Date.now();
    if (e.missing >= MISSING_STRIKES) {
      this._soft.delete(key);
      this.mark(clusterLabel, attr, fallback || 'missing-in-read');
      return true;
    }
    return false;
  }

  /** P3011: an attribute that did come back resets its missing strikes. */
  noteSeen(clusterLabel, attr) {
    const e = this._soft.get(this._key(clusterLabel, attr));
    if (e) { e.missing = 0; }
  }

  /**
   * P3011: record a non-"by design" outcome in memory only (never persisted, never blocks).
   * kind: transient | timeout | local_unsupported | denied | invalid | unknown
   */
  noteSoft(clusterLabel, item, kind) {
    const e = this._softEntry(this._key(clusterLabel, item));
    if (kind === 'local_unsupported') { e.local++; } else if (kind === 'denied') { e.denied++; } else { e.transient++; }
    e.lastKind = kind; e.lastAt = Date.now();
  }

  /** P3011: local programming errors (unknown attr/command name) are blocked for this session only. */
  isLocallyBlocked(clusterLabel, item) {
    const e = this._soft.get(this._key(clusterLabel, item));
    return Boolean(e && e.local > 0);
  }

  /**
   * P3011: route a failure to the right bucket. Returns the classification.
   * @returns {{kind:string,status:(number|null),statusName:(string|null),byDesign:boolean}}
   */
  record(clusterLabel, item, err, { write = false, fallback } = {}) {
    const c = classifyZclError(err);
    if (c.kind === 'unsupported' || (c.kind !== 'read_only' && c.kind !== 'write_only' && isUnsupportedError(err))) {
      this.mark(clusterLabel, item, fallback);
      return Object.assign(c, { kind: 'unsupported', byDesign: true });
    }
    if (c.kind === 'read_only') {
      if (write) { this.markReadOnly(clusterLabel, item); } else { this.noteSoft(clusterLabel, item, 'invalid'); }
      return c;
    }
    if (c.kind === 'write_only') {
      if (!write) { this.mark(clusterLabel, item, fallback || 'write-only'); } else { this.noteSoft(clusterLabel, item, 'invalid'); }
      return c;
    }
    this.noteSoft(clusterLabel, item, c.kind);
    return c;
  }

  /** P3011: bounded diag snapshot. */
  snapshot(limit = 50) {
    const map = this._load();
    const keys = Object.keys(map).sort((a, b) => (map[b].lastAt || 0) - (map[a].lastAt || 0)).slice(0, limit);
    const soft = [];
    for (const [k, v] of this._soft) { if (soft.length < limit) { soft.push(Object.assign({ key: k }, v)); } }
    return { unsupported: keys.map((k) => Object.assign({ key: k }, map[k])), soft, total: Object.keys(map).length };
  }

  /** P3023: memory-budget trim — drop the in-memory soft counters only (persisted matrix kept). */
  trimSoft() {
    const n = this._soft.size;
    this._soft.clear();
    return n;
  }

  /** P3011: forget everything (re-pair / firmware update / user "reset diag"). */
  clear() {
    this._map = {};
    this._soft.clear();
    this._dirty = true;
    this._schedulePersist();
  }

  /**
   * Number of known-unsupported ops (diag/debug).
   * @returns {number}
   */
  size() {
    return Object.keys(this._load()).length;
  }
}

/**
 * Get (or create) the registry attached to a device.
 * @param {Object} device
 * @returns {UnsupportedRegistry}
 */
function getRegistry(device) {
  if (!device._unsupportedRegistry) {
    device._unsupportedRegistry = new UnsupportedRegistry(device);
    // P3011: let the process-wide guard persist its marks for this device too
    try { if (device.zclNode) { require('./ZclUnsupportedGuard').linkDevice(device, device.zclNode); } } catch (_e) { /* optional */ }
  }
  return device._unsupportedRegistry;
}

/**
 * Smart attribute read:
 *  - attributes already known unsupported are skipped (no traffic, no log);
 *  - batch read is attempted for the rest;
 *  - on an "unsupported" batch failure, each attribute is isolated once so
 *    only the truly unsupported ones are blacklisted;
 *  - missing/unsupported attributes are handed to `onFallback(missingAttrs)`
 *    when provided (e.g. Tuya DP query), never to the log flood.
 *
 * @param {Object} device
 * @param {Object} cluster - zigbee-clusters cluster instance
 * @param {string} clusterLabel - stable label used as registry key
 * @param {string[]} attrs
 * @param {Object} [opts]
 * @param {Function} [opts.onFallback] - async (device, missingAttrs) => {}
 * @param {string} [opts.fallbackLabel] - name of the fallback path (log)
 * @returns {Promise<Object>} attributes successfully read
 */
async function readAttributesSmart(device, cluster, clusterLabel, attrs, opts = {}) {
  const result = {};
  if (!cluster || typeof cluster.readAttributes !== 'function' || !Array.isArray(attrs) || attrs.length === 0) {
    return result;
  }
  const registry = getRegistry(device);
  const remaining = registry.filterAttrs(clusterLabel, attrs);
  const skipped = attrs.filter((a) => !remaining.includes(a));
  if (skipped.length > 0 && typeof opts.onFallback === 'function') {
    await Promise.resolve(opts.onFallback(device, skipped)).catch(() => {});
  }
  if (remaining.length === 0) { return result; }

  try {
    const data = await cluster.readAttributes(remaining);
    // P3011: 2.6 drops UNSUPPORTED records silently — count absences, mark after 3 strikes
    if (data && typeof data === 'object') {
      const missing = [];
      for (const a of remaining) {
        if (data[a] === undefined) { if (registry.noteMissing(clusterLabel, a, opts.fallbackLabel)) { missing.push(a); } } else { registry.noteSeen(clusterLabel, a); }
      }
      if (missing.length > 0 && typeof opts.onFallback === 'function') {
        await Promise.resolve(opts.onFallback(device, missing)).catch(() => {});
      }
    }
    return data || result;
  } catch (err) {
    if (!isUnsupportedError(err)) {
      // Transient (sleepy device, timeout, reachability): do NOT mark,
      // keep quiet — the next regular poll will retry.
      return result;
    }
    // Batch failed as unsupported: isolate per attribute, once.
    for (const attr of remaining) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const single = await cluster.readAttributes([attr]);
        if (single && single[attr] !== undefined) { result[attr] = single[attr]; }
      } catch (singleErr) {
        if (isUnsupportedError(singleErr)) {
          registry.mark(clusterLabel, attr, opts.fallbackLabel);
          if (typeof opts.onFallback === 'function') {
            // eslint-disable-next-line no-await-in-loop
            await Promise.resolve(opts.onFallback(device, [attr])).catch(() => {});
          }
        }
        // transient single failure: leave unmarked, retried next cycle
      }
    }
    return result;
  }
}

/**
 * Smart configureReporting: skips attributes already known unsupported and
 * blacklists (once, silently afterwards) the ones the device rejects.
 *
 * @param {Object} device
 * @param {Object} cluster
 * @param {string} clusterLabel
 * @param {Object} reportConfig - { attribute: {minInterval,maxInterval,minChange} }
 * @returns {Promise<boolean>} true when reporting was (at least partially) configured
 */
async function configureReportingSmart(device, cluster, clusterLabel, reportConfig) {
  if (!cluster || typeof cluster.configureReporting !== 'function' || !reportConfig) {
    return false;
  }
  const registry = getRegistry(device);
  const attrs = Object.keys(reportConfig);
  const remaining = registry.filterAttrs(clusterLabel, attrs);
  if (remaining.length === 0) { return false; }
  const filtered = {};
  for (const a of remaining) { filtered[a] = reportConfig[a]; }
  try {
    await cluster.configureReporting(filtered);
    return true;
  } catch (err) {
    if (isUnsupportedError(err)) {
      if (remaining.length === 1) {
        registry.mark(clusterLabel, remaining[0], 'attr-report-listener');
        return false;
      }
      // P3011: 2.6 throws the FIRST failing status without its attributeId — isolate once so a
      // single unreportable attribute does not blacklist the reportable ones.
      let any = false;
      for (const a of remaining) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await cluster.configureReporting({ [a]: reportConfig[a] });
          any = true;
        } catch (singleErr) {
          if (isUnsupportedError(singleErr)) { registry.mark(clusterLabel, a, 'attr-report-listener'); } else { registry.noteSoft(clusterLabel, a, classifyZclError(singleErr).kind); }
        }
      }
      return any;
    } else {
      try {
        device.log(`[ZCL-SMART] ⚠️ reporting config failed (${clusterLabel}): ${err.message}`);
      } catch (_e) { /* no-op */ }
    }
    return false;
  }
}

/**
 * P3011: run ONE Zigbee op through the registry. Never throws (unless opts.rethrow).
 *  - op already known unsupported (or read-only for writes) → skipped, fallback runs instead;
 *  - by-design failure → remembered per device (persisted), fallback runs, silent afterwards;
 *  - transient / timeout → in-memory counter only, fallback only when opts.fallbackOnTransient;
 *  - local programming error (unknown attr/cmd name) → blocked for this session.
 *
 * @param {Object} device
 * @param {string} clusterLabel
 * @param {string} item - attribute / command / 'bind' / 'configureReporting:attr' …
 * @param {Function} fn - async () => result
 * @param {Object} [opts]
 * @param {Function} [opts.fallback] - async (classification) => result
 * @param {string} [opts.fallbackLabel]
 * @param {boolean} [opts.write] - write op (READ_ONLY blocks writes only)
 * @param {boolean} [opts.rethrow] - rethrow non-skipped errors after recording
 * @param {boolean} [opts.fallbackOnTransient]
 * @returns {Promise<{ok:boolean, skipped?:boolean, result?:any, kind?:string, fallbackResult?:any}>}
 */
async function safeZclOp(device, clusterLabel, item, fn, opts = {}) {
  const registry = getRegistry(device);
  const runFallback = async (c) => {
    if (typeof opts.fallback !== 'function') { return undefined; }
    try { return await opts.fallback(c); } catch (_e) { return undefined; }
  };
  const blocked = opts.write ? registry.isWriteBlocked(clusterLabel, item) : registry.isKnown(clusterLabel, item);
  if (blocked || registry.isLocallyBlocked(clusterLabel, item)) {
    const c = { kind: blocked ? 'unsupported' : 'local_unsupported', status: null, statusName: null, byDesign: blocked };
    return { ok: false, skipped: true, kind: c.kind, fallbackResult: await runFallback(c) };
  }
  try {
    const result = await fn();
    return { ok: true, result };
  } catch (err) {
    let c;
    try { c = registry.record(clusterLabel, item, err, { write: Boolean(opts.write), fallback: opts.fallbackLabel }); } catch (_e) { c = { kind: 'unknown', byDesign: false }; }
    if (opts.rethrow) { throw err; }
    const wantFallback = c.byDesign || c.kind === 'local_unsupported' || (opts.fallbackOnTransient && !c.byDesign);
    return { ok: false, kind: c.kind, error: err, fallbackResult: wantFallback ? await runFallback(c) : undefined };
  }
}

function _decodeAttrName(cluster, id) {
  try {
    const byId = cluster && cluster.constructor && cluster.constructor.attributesById;
    return (byId && byId[id] && byId[id].name) || null;
  } catch (_e) { return null; }
}

/**
 * P3011: smart writeAttributes. Filters attributes known read-only/unsupported, writes the rest,
 * and inspects the writeAttributesResponse records (2.6 does NOT throw on per-attribute
 * READ_ONLY / UNSUPPORTED_ATTRIBUTE — it returns them) to remember the failures.
 * @returns {Promise<{written:string[], rejected:Object<string,string>, skipped:string[]}>}
 */
async function writeAttributesSmart(device, cluster, clusterLabel, attributes, opts = {}) {
  const out = { written: [], rejected: {}, skipped: [] };
  if (!cluster || typeof cluster.writeAttributes !== 'function' || !attributes || typeof attributes !== 'object') { return out; }
  const registry = getRegistry(device);
  const send = {};
  for (const [k, v] of Object.entries(attributes)) {
    if (registry.isWriteBlocked(clusterLabel, k)) { out.skipped.push(k); } else { send[k] = v; }
  }
  const names = Object.keys(send);
  if (names.length === 0) { return out; }
  try {
    const res = await cluster.writeAttributes(send, opts.zclOpts);
    const recs = res && Array.isArray(res.attributes) ? res.attributes : [];
    for (const r of recs) {
      if (!r || r.status === 'SUCCESS' || r.status === 0) { continue; }
      const name = _decodeAttrName(cluster, r.id) || (names.length === 1 ? names[0] : null);
      if (!name) { continue; }
      out.rejected[name] = String(r.status);
      registry.record(clusterLabel, name, { status: r.status, message: String(r.status) }, { write: true });
    }
    out.written = names.filter((n) => !out.rejected[n]);
  } catch (err) {
    const c = classifyZclError(err);
    if (c.byDesign && names.length > 1) {
      // isolate once so one read-only attribute does not block the others
      for (const n of names) {
        // eslint-disable-next-line no-await-in-loop
        const r = await safeZclOp(device, clusterLabel, n, () => cluster.writeAttributes({ [n]: send[n] }, opts.zclOpts), { write: true });
        if (r.ok) { out.written.push(n); } else { out.rejected[n] = r.kind; }
      }
    } else {
      for (const n of names) { out.rejected[n] = c.kind; registry.record(clusterLabel, n, err, { write: true }); }
    }
  }
  return out;
}

/** P3011: cluster-specific command through the registry (item = `cmd:<name>`). */
function commandSmart(device, cluster, clusterLabel, cmdName, args, opts = {}) {
  return safeZclOp(device, clusterLabel, `cmd:${cmdName}`, async () => {
    if (!cluster) { throw new TypeError(`${clusterLabel} cluster_not_found`); }
    if (typeof cluster[cmdName] === 'function') { return cluster[cmdName](args || {}, opts.zclOpts); }
    if (typeof cluster.command === 'function') { return cluster.command(cmdName, args || {}, opts.zclOpts); }
    throw new TypeError(`${cmdName} is not a function`);
  }, opts);
}

/** P3011: cluster.bind() through the registry; fallback typically = polling. */
function bindSmart(device, cluster, clusterLabel, opts = {}) {
  return safeZclOp(device, clusterLabel, 'bind', async () => {
    if (!cluster || typeof cluster.bind !== 'function') { throw new TypeError('bind is not a function'); }
    return cluster.bind();
  }, Object.assign({ fallbackLabel: 'polling' }, opts));
}

module.exports = {
  UnsupportedRegistry,
  safeZclOp,
  writeAttributesSmart,
  commandSmart,
  bindSmart,
  classifyZclError,
  getRegistry,
  isUnsupportedError,
  readAttributesSmart,
  configureReportingSmart,
};
