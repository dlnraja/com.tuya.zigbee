'use strict';

/**
 * ComplementaryMerge (P2520)
 * WHY: Enrichments are variants/additions — never wipe or shrink working compose.
 * Use everywhere enrich scripts mutate manufacturerName / productId / capabilities / settings.
 */

function normKey(s) {
  return String(s == null ? '' : s).trim().toLowerCase();
}

/** Case-aware union; preserves first-seen casing. */
function unionStrings(existing, incoming) {
  const out = [];
  const seen = new Set();
  for (const list of [existing, incoming]) {
    for (const raw of Array.isArray(list) ? list : list != null && list !== '' ? [list] : []) {
      const k = normKey(raw);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(typeof raw === 'string' ? raw : String(raw));
    }
  }
  return out;
}

function unionCapabilities(existing, incoming) {
  return unionStrings(existing, incoming);
}

/**
 * Append settings by id — never replace the array.
 * Incoming items with existing ids are skipped (keep curated).
 */
function appendSettingsById(existing, incoming) {
  const base = Array.isArray(existing) ? existing.slice() : [];
  const hasId = (settings, id) => {
    if (!id || !Array.isArray(settings)) return false;
    for (const s of settings) {
      if (s && s.id === id) return true;
      if (s && Array.isArray(s.children) && hasId(s.children, id)) return true;
    }
    return false;
  };
  for (const item of Array.isArray(incoming) ? incoming : []) {
    if (!item || typeof item !== 'object') continue;
    if (item.id && hasId(base, item.id)) continue;
    if (item.type === 'group' && Array.isArray(item.children)) {
      // merge children into existing same-label group when possible
      const labelEn = item.label && (item.label.en || item.label);
      const group = base.find(
        (s) => s && s.type === 'group' && labelEn
          && JSON.stringify(s.label || {}).includes(String(labelEn))
      );
      if (group && Array.isArray(group.children)) {
        for (const child of item.children) {
          if (child && child.id && !hasId(base, child.id)) {
            group.children.push(JSON.parse(JSON.stringify(child)));
          }
        }
        continue;
      }
    }
    base.push(JSON.parse(JSON.stringify(item)));
  }
  return base;
}

/** Merge zigbee identity arrays in place (union). */
function mergeZigbeeIdentity(zigbee, { manufacturerName, productId } = {}) {
  const z = zigbee && typeof zigbee === 'object' ? zigbee : {};
  if (manufacturerName !== undefined) {
    z.manufacturerName = unionStrings(z.manufacturerName, manufacturerName);
  }
  if (productId !== undefined) {
    z.productId = unionStrings(z.productId, productId);
  }
  return z;
}

/**
 * Append identity strings WITHOUT collapsing existing dual-case entries.
 * WHY(P2531/P2532): Homey compose often lists both `_TZ…` and `_tz…` forms;
 * unionStrings() is correct for unique-id sets but must not rewrite a dense
 * dual-case manufacturerName array during complementary OEM overlays.
 */
function appendIdentityStrings(existing, incoming) {
  const out = Array.isArray(existing) ? existing.slice() : [];
  const seen = new Set(out.map((m) => normKey(m)).filter(Boolean));
  for (const raw of Array.isArray(incoming) ? incoming : incoming != null && incoming !== '' ? [incoming] : []) {
    const k = normKey(raw);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(typeof raw === 'string' ? raw : String(raw));
  }
  return out;
}

/**
 * Append EXACT identity string forms (case-sensitive).
 * WHY(P2543): dual-app benefit — stable may carry `_tze200_x` while master
 * only has `_TZE200_x`; normKey-collapse must not block complementary dual-case.
 */
function appendExactIdentityForms(existing, incoming) {
  const out = Array.isArray(existing) ? existing.slice() : [];
  const seen = new Set(out.map((m) => String(m)));
  for (const raw of Array.isArray(incoming) ? incoming : incoming != null && incoming !== '' ? [incoming] : []) {
    const s = typeof raw === 'string' ? raw : String(raw);
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

/** Merge DP map: existing keys win unless forceOverwriteKeys lists them. */
function mergeDpMap(existing, incoming, { forceOverwriteKeys = [] } = {}) {
  const out = { ...(existing && typeof existing === 'object' ? existing : {}) };
  const force = new Set((forceOverwriteKeys || []).map(String));
  for (const [k, v] of Object.entries(incoming && typeof incoming === 'object' ? incoming : {})) {
    if (Object.prototype.hasOwnProperty.call(out, k) && !force.has(String(k))) continue;
    out[k] = v;
  }
  return out;
}

/**
 * Refuse destructive assigns — returns true if candidate would shrink identity/caps.
 */
function wouldDegradeCompose(before, after) {
  if (!before || !after) return false;
  const bm = (before.zigbee && before.zigbee.manufacturerName) || [];
  const am = (after.zigbee && after.zigbee.manufacturerName) || [];
  const bp = (before.zigbee && before.zigbee.productId) || [];
  const ap = (after.zigbee && after.zigbee.productId) || [];
  const bc = before.capabilities || [];
  const ac = after.capabilities || [];
  if (am.length < bm.length) return true;
  if (ap.length < bp.length) return true;
  if (ac.length < bc.length) return true;
  // WHY(P2541): Homey dual-case mfr arrays — exact form must survive (unionStrings collapses)
  for (const m of bm) {
    if (!am.includes(m)) return true;
  }
  for (const p of bp) {
    if (!ap.includes(p) && !ap.some((x) => normKey(x) === normKey(p))) return true;
  }
  for (const c of bc) {
    if (!ac.includes(c)) return true;
  }
  const bs = before.settings;
  const as_ = after.settings;
  if (Array.isArray(bs) && bs.length > 0 && Array.isArray(as_) && as_.length === 0) return true;
  return false;
}

module.exports = {
  unionStrings,
  unionCapabilities,
  appendSettingsById,
  mergeZigbeeIdentity,
  appendIdentityStrings,
  appendExactIdentityForms,
  mergeDpMap,
  wouldDegradeCompose,
  normKey,
};
