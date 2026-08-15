'use strict';

/**
 * Universal flow-card ID heuristics (P104 + P108 case-less)
 *
 * Homey compose often has hybrid/copied IDs (air_purifier_switch_1gang_physical_on)
 * or truncated hash suffixes. Mixins must try a candidate chain, never a single ID.
 *
 * Homey / Athom may re-case manufacturerName and sometimes driver/flow IDs
 * (lower, UPPER, hybrid). All matching MUST be case-insensitive via TuyaNormalizer.
 */

const { safeGetFlowCard } = require('../io/HomeyCompensationLayer');
const {
  normalize,
  equalsIgnoreCase,
  generateCaseVariants,
} = require('../utils/TuyaNormalizer');

/**
 * Expand a driver / flow fragment into Homey-likely case forms.
 * Driver IDs are usually snake_case lower, but Homey may store mixed.
 * @param {string} id
 * @returns {string[]}
 */
function expandIdCaseVariants(id) {
  if (!id) {return [];}
  const s = String(id);
  const lower = s.toLowerCase();
  const upper = s.toUpperCase();
  // Prefer lower for driver/flow IDs (Homey compose convention), keep original + upper.
  return Array.from(new Set([s, lower, upper].filter(Boolean)));
}

/**
 * Collect declared flow card IDs from Homey manifest (any of triggers/actions/conditions).
 * @param {object} homey
 * @returns {Set<string>}
 */
function collectDeclaredFlowIds(homey) {
  const out = new Set();
  try {
    const flow = homey?.manifest?.flow || {};
    for (const kind of ['triggers', 'actions', 'conditions']) {
      const list = flow[kind];
      if (!Array.isArray(list)) {continue;}
      for (const entry of list) {
        if (typeof entry === 'string') {out.add(entry);}
        else if (entry?.id) {out.add(String(entry.id));}
      }
    }
  } catch (_e) { /* noop */ }
  return out;
}

/**
 * Case-insensitive membership in declared ID set.
 * Returns the **declared** casing (outbound form Homey registered).
 * @param {Set<string>|Iterable<string>} declaredIds
 * @param {string} id
 * @returns {string|null}
 */
function findDeclaredCI(declaredIds, id) {
  if (!declaredIds || !id) {return null;}
  if (declaredIds.has?.(id)) {return id;}
  const needle = normalize(id);
  for (const d of declaredIds) {
    if (equalsIgnoreCase(d, id) || normalize(d) === needle) {return d;}
  }
  return null;
}

/**
 * App-level button cards that every press should also try (virtual + physical parity).
 */
function buildAppLevelButtonCandidates(pressType) {
  const pressMap = {
    single: 'button_pressed',
    on: 'button_pressed',
    off: 'button_pressed',
    double: 'button_double_press',
    long: 'button_long_press',
    long_press: 'button_long_press',
    triple: 'button_triple_clicked',
    multi: 'button_multi_press',
    release: 'button_release',
  };
  const primary = pressMap[pressType] || 'button_pressed';
  return Array.from(new Set([primary, 'button_pressed', 'virtual_button_pressed', 'button_matrix']));
}

/**
 * Build candidate physical / button flow IDs for a press event.
 * Expands driverId case variants so Homey case transforms still resolve.
 */
function buildPhysicalFlowCandidates(driverId, gang, pressType, opts = {}) {
  const gangCount = opts.gangCount || 1;
  const isButton = opts.isButtonDevice === true;
  const candidates = [];
  const push = (id) => {
    if (!id) {return;}
    for (const v of expandIdCaseVariants(id)) {
      if (!candidates.includes(v)) {candidates.push(v);}
    }
  };

  const pressMap = { single: 'button_pressed', double: 'button_double_press', long: 'button_long_press', long_press: 'button_long_press' };
  const suffix = pressMap[pressType] || pressType;
  const driverIds = expandIdCaseVariants(driverId);

  for (const did of driverIds) {
    if (isButton) {
      if (gangCount === 1) {
        push(`${did}_button_1gang_${suffix}`);
        push(`${did}_${suffix}`);
        push(`${did}_button_pressed`);
      } else {
        push(`${did}_button_${gangCount}gang_${suffix}`);
        push(`${did}_button_${gang}_${suffix}`);
        push(`${did}_${suffix}`);
      }
    } else {
      if (gangCount === 1) {
        push(`${did}_physical_${pressType}`);
        push(`${did}_physical_gang1_${pressType}`);
        push(`${did}_1gang_physical_${pressType}`);
      } else {
        push(`${did}_physical_gang${gang}_${pressType}`);
        push(`${did}_gang${gang}_physical_${pressType}`);
        push(`${did}_physical_${pressType}`);
      }
      const m = String(did).match(/switch_(\d)gang/i);
      if (m) {
        const n = m[1];
        push(`${did.replace(/.*?(switch_\dgang)/i, '$1')}_physical_${pressType}`);
        if (Number(n) === 1) {push(`switch_1gang_physical_${pressType}`);}
        else {push(`switch_${n}gang_physical_gang${gang}_${pressType}`);}
      }
    }

    if (pressType === 'single' || pressType === 'double' || pressType === 'triple') {
      if (gangCount === 1) {
        push(`${did}_physical_on`);
        push(`${did}_1gang_physical_on`);
      } else {
        push(`${did}_physical_gang${gang}_on`);
      }
    }
  }

  // Always append universal app-level cards (parity physical ↔ virtual UI)
  for (const appId of buildAppLevelButtonCandidates(pressType)) {
    push(appId);
  }

  return candidates;
}

/**
 * Pick first declared candidate, else first candidate (SDK may still resolve).
 * Matching is case-insensitive; returns Homey's declared casing when known.
 */
function resolveFlowCardId(candidates, declaredIds) {
  const list = Array.isArray(candidates) ? candidates.filter(Boolean) : [candidates].filter(Boolean);
  if (!list.length) {return null;}
  if (declaredIds && declaredIds.size) {
    for (const id of list) {
      const hit = findDeclaredCI(declaredIds, id);
      if (hit) {return hit;}
    }
    // Fuzzy: declared ends with candidate suffix or vice-versa (hash truncation)
    for (const id of list) {
      const idNorm = normalize(id);
      for (const d of declaredIds) {
        const dNorm = normalize(d);
        if (dNorm === idNorm || dNorm.startsWith(`${idNorm}_`) || idNorm.startsWith(`${dNorm}_`)) {return d;}
        const dBase = dNorm.replace(/_[a-f0-9]{5}$/i, '');
        if (dNorm.includes(idNorm) || idNorm.includes(dBase)) {
          if (list.some((x) => equalsIgnoreCase(x, dBase)) || equalsIgnoreCase(dBase, id) || idNorm.startsWith(dBase)) {
            return d;
          }
        }
      }
    }
  }
  return list[0];
}

/**
 * Trigger first working flow card among candidates. Never throws.
 * Prefer declared casing from Homey manifest (outbound form).
 */
async function triggerFlowCardHeuristic(device, candidates, tokens = {}, type = 'trigger') {
  try {
    const homey = device?.homey;
    if (!homey?.flow) {return false;}
    const declared = collectDeclaredFlowIds(homey);
    const list = Array.isArray(candidates) ? candidates : [candidates];
    const preferred = resolveFlowCardId(list, declared);
    const ordered = preferred ? [preferred, ...list.filter((x) => !equalsIgnoreCase(x, preferred))] : list;

    for (const id of ordered) {
      if (!id) {continue;}
      const declaredForm = findDeclaredCI(declared, id) || id;
      const card = safeGetFlowCard(homey, declaredForm, type)
        || safeGetFlowCard(homey, id, type);
      if (!card || typeof card.trigger !== 'function') {continue;}
      try {
        // eslint-disable-next-line no-await-in-loop
        await card.trigger(device, tokens, {});
        return true;
      } catch (_e) { /* try next */ }
    }
    return false;
  } catch (_e) {
    return false;
  }
}

/**
 * Prefer Homey's canonical outbound casing for a Tuya manufacturerName.
 * Input may be lower/UPPER/hybrid; output is pairing-safe canonical when Tuya-shaped.
 * @param {string} mfr
 * @returns {string}
 */
function preferOutboundManufacturerCase(mfr) {
  if (!mfr) {return mfr;}
  const variants = generateCaseVariants(mfr);
  // generateCaseVariants puts canonical (prefix UPPER + suffix lower) as index 3 when Tuya-shaped
  const norm = normalize(mfr);
  const m = norm && norm.match(/^(_[a-z0-9]+)_(.+)$/i);
  if (m) {return `${m[1].toUpperCase()}_${m[2].toLowerCase()}`;}
  // Brand tokens: keep original if mixed meaningful, else upper for Homey display brands
  if (variants.includes(mfr)) {return mfr;}
  return String(mfr);
}

module.exports = {
  collectDeclaredFlowIds,
  buildPhysicalFlowCandidates,
  buildAppLevelButtonCandidates,
  resolveFlowCardId,
  triggerFlowCardHeuristic,
  safeGetFlowCard,
  expandIdCaseVariants,
  findDeclaredCI,
  preferOutboundManufacturerCase,
};
