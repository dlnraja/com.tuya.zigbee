'use strict';

/**
 * WHY: Homey builds driver.flow.compose.json into the ROOT app manifest
 * (homey.manifest.flow.*) with a device arg filter `driver_id=<id>`.
 * At runtime `driver.manifest.flow` is therefore empty for almost every driver,
 * which silently disabled the declared-card auto-wiring (P2449/P2747), the
 * capability-changed trigger discovery and the switch/actuator auto-wire.
 *
 * This index is built ONCE from the root manifest (no file I/O, no copy of the
 * card objects — only references), keyed by driver id. Bounded by the number of
 * drivers declared in the manifest. Additive: callers keep using
 * driver.manifest.flow first and fall back to this index.
 */

const KINDS = ['triggers', 'conditions', 'actions'];
let _index = null;
let _indexManifest = null;

function parseDriverIds(filter) {
  if (typeof filter !== 'string') {return [];}
  const out = [];
  // e.g. "driver_id=button_wireless_1" or "driver_id=a|b" (negations are ignored)
  const re = /driver_id=([A-Za-z0-9_.|-]+)/g;
  for (const m of filter.matchAll(re)) {
    for (const id of m[1].split('|')) {
      if (id) {out.push(id);}
    }
  }
  return out;
}

function buildIndex(manifest) {
  const idx = new Map();
  const flow = manifest?.flow;
  if (!flow || typeof flow !== 'object') {return idx;}
  for (const kind of KINDS) {
    const list = flow[kind];
    if (!Array.isArray(list)) {continue;}
    for (const card of list) {
      if (!card || typeof card !== 'object' || !Array.isArray(card.args)) {continue;}
      const devArg = card.args.find((a) => a && a.type === 'device');
      if (!devArg) {continue;}
      for (const driverId of parseDriverIds(devArg.filter)) {
        let entry = idx.get(driverId);
        if (!entry) {
          entry = { triggers: [], conditions: [], actions: [] };
          idx.set(driverId, entry);
        }
        entry[kind].push(card);
      }
    }
  }
  return idx;
}

/**
 * @param {object} homey
 * @param {string} driverId
 * @returns {{triggers:object[],conditions:object[],actions:object[]}|null}
 */
function getDriverFlow(homey, driverId) {
  if (!driverId) {return null;}
  const manifest = homey?.manifest;
  if (!manifest) {return null;}
  if (!_index || _indexManifest !== manifest) {
    try {
      _index = buildIndex(manifest);
      _indexManifest = manifest;
    } catch (_e) {
      _index = new Map();
      _indexManifest = manifest;
    }
  }
  return _index.get(String(driverId)) || null;
}

function hasCards(flow) {
  return !!flow && KINDS.some((k) => Array.isArray(flow[k]) && flow[k].length > 0);
}

/**
 * Union of driver.manifest.flow (inline driver.compose flow) and the root-manifest
 * cards filtered to this driver (driver.flow.compose.json). Cached per driver id
 * (bounded by the number of drivers); card objects are referenced, never copied.
 */
const _merged = new Map();
function resolveDriverFlow(homey, driver) {
  const id = String(driver?.id || driver?.manifest?.id || '');
  if (id && _merged.has(id)) {return _merged.get(id);}
  const own = driver?.manifest?.flow;
  const root = getDriverFlow(homey || driver?.homey, id);
  let out;
  if (!hasCards(own)) {out = root;}
  else if (!hasCards(root)) {out = own;}
  else {
    out = {};
    for (const k of KINDS) {
      const seen = new Set();
      out[k] = [];
      for (const c of [...own[k] || [], ...root[k] || []]) {
        if (!c?.id || seen.has(c.id)) {continue;}
        seen.add(c.id);
        out[k].push(c);
      }
    }
  }
  if (id) {_merged.set(id, out || null);}
  return out || null;
}

/** Non-device args (driver-level manifests omit the device arg, root-level ones include it). */
function userArgs(card) {
  return Array.isArray(card?.args) ? card.args.filter((a) => a && a.type !== 'device') : [];
}

function _resetForTests() {
  _index = null;
  _indexManifest = null;
  _merged.clear();
}

module.exports = { getDriverFlow, resolveDriverFlow, userArgs, parseDriverIds, buildIndex, _resetForTests };
