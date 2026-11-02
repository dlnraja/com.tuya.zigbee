'use strict';

/**
 * Publish-hold release (P2830c): a one-shot way to retry a held driver without editing
 * config/publish-hold-drivers.json. Used by workflow_dispatch input `release_held`
 * (env PUBLISH_HOLD_RELEASE = comma/space separated driver ids).
 *
 * Rules: an id that is not currently held is ignored; the committed config is never changed,
 * so the next normal push holds the driver again (a failed retry cannot stick).
 * Bisect plan when a released driver fails with AggregateError: release ONE id per dispatch;
 * "socket hang up" / ETIMEDOUT are transport errors = plain retry, not a bisect.
 */

function parseRelease(value) {
  return new Set(String(value || '').split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean));
}

function effectiveHoldIds(hold, releaseValue) {
  const release = parseRelease(releaseValue);
  const held = (hold && Array.isArray(hold.drivers) ? hold.drivers : []).map((d) => d && d.id).filter(Boolean);
  const ids = new Set(held.filter((id) => !release.has(id)));
  const released = held.filter((id) => release.has(id));
  return { ids, released };
}

/**
 * P3228/P3229: every continuation (registry continuationOf) folds its zigbee lists back into its root
 * BEFORE compaction, so the compaction budget always sees the pre-split logical driver (a release
 * can never redistribute the budget and drop a couple). Exact strings, appended once, root order kept.
 * Held ids are dropped; released ones are returned as split specs for splitContinuations() after
 * compaction. Returns { folded, splits }.
 */
function foldContinuations(manifest, registry, heldIds = new Set()) {
  const out = { folded: 0, splits: [] };
  if (!manifest || !Array.isArray(manifest.drivers) || !registry || typeof registry.entry !== 'function') return out;
  for (const held of [...manifest.drivers]) {
    const rootId = held && registry.entry(held.id).continuationOf;
    const root = rootId && manifest.drivers.find((d) => d && d.id === rootId);
    if (!root || !held.zigbee || !root.zigbee) continue;
    for (const k of ['manufacturerName', 'productId']) {
      const into = Array.isArray(root.zigbee[k]) ? root.zigbee[k] : (root.zigbee[k] = []);
      const have = new Set(into);
      for (const v of held.zigbee[k] || []) if (!have.has(v)) { have.add(v); into.push(v); }
    }
    manifest.drivers = manifest.drivers.filter((d) => d !== held);
    out.folded++;
    if (!heldIds.has(held.id)) {
      out.splits.push({ id: held.id, rootId, def: held, mfrs: [...(held.zigbee.manufacturerName || [])], pids: [...(held.zigbee.productId || [])] });
    }
  }
  return out;
}

/** P3229: after compaction, a released continuation takes back its own makers (kept by the
 * compaction) with its own pids; the root drops them (their other pids were parasites by construction). */
function splitContinuations(manifest, splits) {
  let n = 0;
  for (const s of splits || []) {
    const i = manifest.drivers.findIndex((d) => d && d.id === s.rootId);
    if (i < 0) continue;
    const root = manifest.drivers[i];
    const own = new Set(s.mfrs);
    const m = (root.zigbee.manufacturerName || []).filter((x) => own.has(x));
    const pset = new Set(root.zigbee.productId || []);
    const p = s.pids.filter((x) => pset.has(x));
    root.zigbee.manufacturerName = (root.zigbee.manufacturerName || []).filter((x) => !own.has(x));
    if (!m.length || !p.length) continue;
    manifest.drivers.splice(i + 1, 0, { ...s.def, zigbee: { ...s.def.zigbee, manufacturerName: m, productId: p } });
    n++;
  }
  return n;
}

/** P3228 compat: fold held continuations only (non-held ones untouched). */
function foldHeldContinuations(manifest, heldIds, registry) {
  if (!heldIds || !heldIds.size || !registry) return 0;
  const sub = { drivers: (manifest && manifest.drivers) || [] };
  const only = { entry: (id) => (heldIds.has(id) ? registry.entry(id) : {}) };
  const r = foldContinuations(sub, only, heldIds);
  if (manifest) manifest.drivers = sub.drivers;
  return r.folded;
}

/** P3233: what prepare-publish does to held ids (drivers + flow cards whose device filter names only
 * held drivers), as a pure function so the size-gate projection measures the real upload. */
function dropHeld(manifest, ids) {
  const out = { drivers: 0, cards: 0 };
  if (!manifest || !ids || !ids.size) {return out;}
  const before = (manifest.drivers || []).length;
  manifest.drivers = (manifest.drivers || []).filter((d) => !ids.has(d && d.id));
  out.drivers = before - manifest.drivers.length;
  const cardUsesHeld = (card) => (Array.isArray(card && card.args) ? card.args : []).some((a) => {
    if (!a || a.type !== 'device' || typeof a.filter !== 'string') {return false;}
    const m = a.filter.match(/(?:^|&)driver_id=([^&]+)/);
    if (!m) {return false;}
    const named = m[1].split('|').filter(Boolean);
    return named.length > 0 && named.every((x) => ids.has(x));
  });
  for (const type of Object.keys(manifest.flow || {})) {
    if (!Array.isArray(manifest.flow[type])) {continue;}
    const n = manifest.flow[type].length;
    manifest.flow[type] = manifest.flow[type].filter((c) => !cardUsesHeld(c));
    out.cards += n - manifest.flow[type].length;
  }
  return out;
}

module.exports = { parseRelease, effectiveHoldIds, foldHeldContinuations, foldContinuations, splitContinuations, dropHeld };
