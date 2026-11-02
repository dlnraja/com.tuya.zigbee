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
 * P3228: a held continuation (registry continuationOf) folds its zigbee lists back into its root
 * driver in the payload view, so holding it never drops a couple the root already shipped.
 * Exact strings only, appended once, root order kept. The folded driver leaves the view at once
 * (the hold cuts it anyway), so the compaction budget sees exactly the pre-split driver set.
 * Returns the number of folded drivers.
 */
function foldHeldContinuations(manifest, heldIds, registry) {
  if (!manifest || !Array.isArray(manifest.drivers) || !heldIds || !heldIds.size || !registry) return 0;
  const byId = new Map(manifest.drivers.map((d) => [d && d.id, d]));
  let folded = 0;
  for (const id of heldIds) {
    const e = typeof registry.entry === 'function' ? registry.entry(id) : null;
    const rootId = e && e.continuationOf;
    const held = byId.get(id), root = byId.get(rootId);
    if (!rootId || !held || !root || !held.zigbee || !root.zigbee) continue;
    for (const k of ['manufacturerName', 'productId']) {
      const into = Array.isArray(root.zigbee[k]) ? root.zigbee[k] : (root.zigbee[k] = []);
      const have = new Set(into);
      for (const v of held.zigbee[k] || []) if (!have.has(v)) { have.add(v); into.push(v); }
    }
    folded++;
    manifest.drivers = manifest.drivers.filter((d) => d !== held);
  }
  return folded;
}

module.exports = { parseRelease, effectiveHoldIds, foldHeldContinuations };
