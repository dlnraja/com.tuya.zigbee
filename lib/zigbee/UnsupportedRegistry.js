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

// ZCL status codes that mean "this device will never support that op"
const UNSUPPORTED_STATUS = new Set([
  0x81, // UNSUPPORTED_CLUSTER_COMMAND
  0x82, // UNSUPPORTED_GENERAL_COMMAND
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
  return UNSUPPORTED_TEXT.some((t) => msg.includes(t));
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
  }

  _load() {
    if (this._map) { return this._map; }
    let stored = {};
    try {
      if (typeof this.device.getStoreValue === 'function') {
        stored = this.device.getStoreValue('zcl_unsupported_matrix') || {};
      }
    } catch (_e) { stored = {}; }
    this._map = (stored && typeof stored === 'object') ? stored : {};
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
   */
  mark(clusterLabel, item, fallback) {
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
      try {
        this.device.log(`[ZCL-SMART] ⛔ ${key} unsupported by this device` +
          (fallback ? ` → fallback: ${fallback}` : ' → skipped from now on'));
      } catch (_e) { /* no-op */ }
    }
    this._dirty = true;
    this._schedulePersist();
  }

  _schedulePersist() {
    if (this._persistTimer) { return; }
    const schedule = (this.device.homey && typeof this.device.homey.setTimeout === 'function')
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
    await opts.onFallback(device, skipped).catch(() => {});
  }
  if (remaining.length === 0) { return result; }

  try {
    const data = await cluster.readAttributes(remaining);
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
            await opts.onFallback(device, [attr]).catch(() => {});
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
      for (const a of remaining) { registry.mark(clusterLabel, a, 'attr-report-listener'); }
    } else {
      try {
        device.log(`[ZCL-SMART] ⚠️ reporting config failed (${clusterLabel}): ${err.message}`);
      } catch (_e) { /* no-op */ }
    }
    return false;
  }
}

module.exports = {
  UnsupportedRegistry,
  getRegistry,
  isUnsupportedError,
  readAttributesSmart,
  configureReportingSmart,
};
