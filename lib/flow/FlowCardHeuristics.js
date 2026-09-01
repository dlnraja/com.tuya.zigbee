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

const { safeGetFlowCard, isNoopFlowCard } = require('../io/HomeyCompensationLayer');
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
    // WHY(P2369): SOS remotes declare *_pressed not *_button_pressed (button_emergency_sos).
    if (/emergency|_sos$/i.test(did)) {
      if (pressType === 'single' || pressType === 'on') {
        push(`${did}_pressed`);
        push(`${did}_button_pressed`);
      }
      if (pressType === 'double') {
        push(`${did}_double_pressed`);
        push(`${did}_button_double_press`);
      }
      if (pressType === 'long' || pressType === 'long_press') {
        push(`${did}_long_pressed`);
        push(`${did}_button_long_press`);
      }
    }

    if (isButton) {
      // WHY: compose uses *_button_4gang_button_N_pressed / *_button_pressed —
      // never invent *_button_N_button_pressed (Nobø 9cbf9eb6 FLOW-GUARD) or
      // *_button_1gang_button_pressed (meter91 55e3e591 on scene_switch_4).
      // WHY(P2353): scene_switch_4 declares BOTH *_button_N_* and *_button_4gang_button_N_*
      // — always emit Ngang patterns when gangCount>1 so PhysicalButtonMixin hits declared cards.
      if (gangCount === 1 && !/scene_switch/i.test(did)) {
        push(`${did}_${suffix}`);
        push(`${did}_button_pressed`);
        push(`${did}_button_${gang}_pressed`);
        // WHY(P2364): 1-gang remotes (button_wireless_1, smart_knob) declare Ngang 1gang cards
        push(`${did}_button_1gang_${suffix}`);
        push(`${did}_button_1gang_button_pressed`);
        push(`${did}_button_1gang_button_${gang}_pressed`);
        if (suffix === 'button_double_press') {
          push(`${did}_button_${gang}_double`);
          push(`${did}_button_1gang_button_double_press`);
          push(`${did}_button_1gang_button_${gang}_double`);
        }
        if (suffix === 'button_long_press') {
          push(`${did}_button_${gang}_long`);
          push(`${did}_button_1gang_button_long_press`);
          push(`${did}_button_1gang_button_${gang}_long`);
        }
        if (pressType === 'triple') {
          push(`${did}_button_1gang_button_${gang}_triple`);
        }
        if (pressType === 'release') {
          push(`${did}_button_1gang_button_${gang}_release`);
        }
      } else {
        // Multi-button remotes + scene_switch_N (shared compose shapes)
        push(`${did}_button_${gangCount}gang_${suffix}`);
        push(`${did}_button_${gangCount}gang_button_${suffix === 'button_pressed' ? 'pressed' : suffix.replace(/^button_/, '')}`);
        push(`${did}_button_${gangCount}gang_button_${gang}_pressed`);
        if (suffix === 'button_double_press') {
          push(`${did}_button_${gangCount}gang_button_${gang}_double`);
          push(`${did}_button_${gangCount}gang_button_double_press`);
          push(`${did}_button_${gang}_double`);
        }
        if (suffix === 'button_long_press') {
          push(`${did}_button_${gangCount}gang_button_${gang}_long`);
          push(`${did}_button_${gangCount}gang_button_long_press`);
          push(`${did}_button_${gang}_long`);
        }
        push(`${did}_button_${gang}_pressed`);
        push(`${did}_${suffix}`);
        push(`${did}_button_pressed`);
      }
    } else {
      const pressSuffix = pressType === 'long' || pressType === 'long_press' ? 'long_press' : pressType;
      if (gangCount === 1) {
        push(`${did}_physical_${pressType}`);
        push(`${did}_physical_gang1_${pressType}`);
        push(`${did}_1gang_physical_${pressType}`);
        // WHY(P2334): fingerbot / *_switch compose uses `${did}_switch_1gang_physical_*`
        push(`${did}_switch_1gang_physical_${pressSuffix}`);
        push(`${did}_switch_1gang_physical_${pressType}`);
      } else {
        push(`${did}_physical_gang${gang}_${pressType}`);
        push(`${did}_gang${gang}_physical_${pressType}`);
        push(`${did}_physical_${pressType}`);
        // WHY(P2369): socket hybrids (fingerbot) keep switch_1gang cards despite button.2 cap
        push(`${did}_switch_1gang_physical_${pressSuffix}`);
        push(`${did}_switch_1gang_physical_${pressType}`);
      }
      // P2199: never emit bare switch_Ngang_physical_* — cross-driver collisions
    }

    // WHY (P2235): *_physical_on is for wall switches only — remotes use
    // *_button_*_pressed (FLOW-GUARD spam on button_wireless / scene_switch).
    if (!isButton && (pressType === 'single' || pressType === 'double' || pressType === 'triple')) {
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
 * Pick first declared candidate.
 * Matching is case-insensitive; returns Homey's declared casing when known.
 *
 * WHY (P2247): when a declared set exists, NEVER fall back to undeclared list[0].
 * Homey logs "Invalid Flow Card ID" / FLOW-GUARD on every speculative getDeviceTriggerCard
 * even when callers catch — that was 59 diag hits (invalid_flow_card).
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
        // WHY(P2369): hashed compose IDs (remote_button_emergency_sos_button_4gang_but_5cf0a)
        const gangBut = idNorm.match(/^(.+_button_\d+gang)_button_/);
        if (gangBut) {
          const butPrefix = `${gangBut[1]}_but_`;
          if (dNorm.startsWith(butPrefix)) {return d;}
        }
      }
    }
    return null;
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

    // WHY (P2247): only probe IDs Homey already registered — never spray candidates.
    let ordered;
    if (declared.size) {
      if (!preferred) {return false;}
      ordered = [preferred];
    } else {
      ordered = preferred ? [preferred, ...list.filter((x) => !equalsIgnoreCase(x, preferred))] : list;
    }

    for (const id of ordered) {
      if (!id) {continue;}
      const declaredForm = findDeclaredCI(declared, id) || id;
      // Pass declared set so safeGetFlowCard skips Homey lookups for unknowns
      const card = safeGetFlowCard(homey, declaredForm, type, declared);
      if (!card || isNoopFlowCard(card) || typeof card.trigger !== 'function') {continue;}
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
