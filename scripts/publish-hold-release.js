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

// P3292: swapOut = ids left out of THIS payload only (diagnostic swap, see resolveSwap). Only the
// prepare-publish hold step passes it: compaction and the source gates keep the swapped-out driver,
// so its couples stay pinned where they live and only the final Draft payload lacks it.
function effectiveHoldIds(hold, releaseValue, swapOut = '') {
  const release = parseRelease(releaseValue);
  const held = (hold && Array.isArray(hold.drivers) ? hold.drivers : []).map((d) => d && d.id).filter(Boolean);
  const ids = new Set(held.filter((id) => !release.has(id)));
  const released = held.filter((id) => release.has(id));
  const swappedOut = [...parseRelease(swapOut)].filter((id) => !held.includes(id));
  for (const id of swappedOut) ids.add(id);
  return { ids, released, swappedOut };
}

/**
 * P3292 (15/11/2026): diagnostic swap. Release N held ids and leave N other (published) drivers out of
 * this one payload, so the payload driver count stays the same. Manual workflow_dispatch only, Draft only
 * (the workflow skips Test/Live promotion). The source repo and the hold file are never changed.
 * Returns the swapped-out ids ([] when no swap was asked) or throws on an invalid request.
 */
function resolveSwap(hold, env = process.env) {
  const out = [...parseRelease(env && env.PUBLISH_DIAG_SWAP_OUT)];
  if (!out.length) return [];
  const rel = [...parseRelease(env && env.PUBLISH_HOLD_RELEASE)];
  if (rel.length !== out.length) throw new Error(`diagnostic swap needs the same number of released and swapped-out ids (release ${rel.length}, out ${out.length})`);
  const held = new Set((hold && Array.isArray(hold.drivers) ? hold.drivers : []).map((d) => d && d.id).filter(Boolean));
  const notHeld = rel.filter((id) => !held.has(id));
  if (notHeld.length) throw new Error(`diagnostic swap releases ids that are not held: ${notHeld.join(', ')}`);
  const already = out.filter((id) => held.has(id));
  if (already.length) throw new Error(`diagnostic swap-out ids are already held: ${already.join(', ')}`);
  return out;
}

/** Every held id, comma-separated. The committed hold file is not modified. */
function diagnosticReleaseValue(hold) {
  return (hold && Array.isArray(hold.drivers) ? hold.drivers : []).map((d) => d && d.id).filter(Boolean).join(',');
}

/**
 * Ordinary publishes keep PUBLISH_HOLD_RELEASE (one bisect id, or empty).
 * PUBLISH_DIAGNOSTIC_CATALOGUE=1 releases every held id for that process only.
 */
function resolveReleaseValue(hold, env = process.env) {
  if (String(env && env.PUBLISH_DIAGNOSTIC_CATALOGUE || '') === '1') return diagnosticReleaseValue(hold);
  return (env && env.PUBLISH_HOLD_RELEASE) || '';
}

/** A diagnostic catalogue must stay above 350 real drivers. 346/348 is the held payload. */
function assertDiagnosticCatalogue({ enabled, driverCount, minDrivers = 351 } = {}) {
  const count = Number(driverCount) || 0;
  const floor = Number(minDrivers) || 351;
  if (!enabled) return { ok: true, driverCount: count, minDrivers: 0 };
  if (count < floor || count <= 350) {
    return {
      ok: false,
      driverCount: count,
      minDrivers: floor,
      reason: `diagnostic catalogue has ${count} drivers; floor is ${floor} (more than 350, not the held 346/348 payload)`,
    };
  }
  return { ok: true, driverCount: count, minDrivers: floor };
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
    root.zigbee.manufacturerName = (root.zigbee.manufacturerName || []).filter((x) => !own.has(x));
    // P3360: always restore the pre-compact snapshot (not only the identifiers that
    // survived on the root). Compaction can drop some of the continuation's pids
    // or makers from the root; using the leftover subset would lose those couples.
    const m = [...(s.mfrs || [])];
    const p = [...(s.pids || [])];
    if (!m.length || !p.length) continue;
    manifest.drivers.splice(i + 1, 0, { ...s.def, zigbee: { ...s.def.zigbee, manufacturerName: m, productId: p } });
    n++;
  }
  return n;
}


/** P3360: if a sacred keep couple points at a released driver that is absent from the
 * publish manifest, put the folded snapshot back instead of failing immediately.
 * Held drivers stay out. Still the caller's job to FATAL if the couple is missing after this. */
function reincludeMissingSacredDrivers(manifest, misses, splits = [], heldIds = new Set()) {
  const readded = [];
  if (!manifest || !Array.isArray(manifest.drivers) || !misses || !misses.length) return readded;
  const missingIds = new Set();
  for (const line of misses) {
    const m = String(line).match(/→\s+(\S+)\s+\(driver missing in publish\)/)
      || String(line).match(/->\s+(\S+)\s+\(driver missing in publish\)/);
    if (m && m[1] && !heldIds.has(m[1])) missingIds.add(m[1]);
  }
  const byId = new Map((splits || []).filter((s) => s && s.id && s.def).map((s) => [s.id, s]));
  const have = new Set(manifest.drivers.map((d) => d && d.id));
  for (const id of missingIds) {
    if (have.has(id)) continue;
    const s = byId.get(id);
    if (!s) continue;
    const mfrs = [...(s.mfrs || (s.def.zigbee && s.def.zigbee.manufacturerName) || [])];
    const pids = [...(s.pids || (s.def.zigbee && s.def.zigbee.productId) || [])];
    if (!mfrs.length || !pids.length) continue;
    manifest.drivers.push({ ...s.def, zigbee: { ...(s.def.zigbee || {}), manufacturerName: mfrs, productId: pids } });
    have.add(id);
    readded.push(id);
  }
  return readded;
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

module.exports = {
  parseRelease, effectiveHoldIds, resolveSwap, diagnosticReleaseValue, resolveReleaseValue, assertDiagnosticCatalogue,
  foldHeldContinuations, foldContinuations, splitContinuations, dropHeld,
  reincludeMissingSacredDrivers,
};
