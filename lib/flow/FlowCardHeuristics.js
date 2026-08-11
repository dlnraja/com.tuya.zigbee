'use strict';

/**
 * Universal flow-card ID heuristics (P104)
 *
 * Homey compose often has hybrid/copied IDs (air_purifier_switch_1gang_physical_on)
 * or truncated hash suffixes. Mixins must try a candidate chain, never a single ID.
 */

const { safeGetFlowCard } = require('../io/HomeyCompensationLayer');

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
 * Build candidate physical / button flow IDs for a press event.
 */
function buildPhysicalFlowCandidates(driverId, gang, pressType, opts = {}) {
  const gangCount = opts.gangCount || 1;
  const isButton = opts.isButtonDevice === true;
  const candidates = [];
  const push = (id) => {
    if (id && !candidates.includes(id)) {candidates.push(id);}
  };

  const pressMap = { single: 'button_pressed', double: 'button_double_press', long: 'button_long_press', long_press: 'button_long_press' };
  const suffix = pressMap[pressType] || pressType;

  if (isButton) {
    if (gangCount === 1) {
      push(`${driverId}_button_1gang_${suffix}`);
      push(`${driverId}_${suffix}`);
      push(`${driverId}_button_pressed`);
    } else {
      push(`${driverId}_button_${gangCount}gang_${suffix}`);
      push(`${driverId}_button_${gang}_${suffix}`);
      push(`${driverId}_${suffix}`);
    }
  } else {
    if (gangCount === 1) {
      push(`${driverId}_physical_${pressType}`);
      push(`${driverId}_physical_gang1_${pressType}`);
      push(`${driverId}_1gang_physical_${pressType}`);
    } else {
      push(`${driverId}_physical_gang${gang}_${pressType}`);
      push(`${driverId}_gang${gang}_physical_${pressType}`);
      push(`${driverId}_physical_${pressType}`);
    }
    // Hybrid compose leftovers: *switch_Ngang_physical_*
    const m = String(driverId).match(/switch_(\d)gang/i);
    if (m) {
      const n = m[1];
      push(`${driverId.replace(/.*?(switch_\dgang)/i, '$1')}_physical_${pressType}`);
      if (Number(n) === 1) {push(`switch_1gang_physical_${pressType}`);}
      else {push(`switch_${n}gang_physical_gang${gang}_${pressType}`);}
    }
  }

  // Press-type soft aliases (no recursion)
  if (pressType === 'single' || pressType === 'double' || pressType === 'triple') {
    if (gangCount === 1) {
      push(`${driverId}_physical_on`);
      push(`${driverId}_1gang_physical_on`);
    } else {
      push(`${driverId}_physical_gang${gang}_on`);
    }
  }

  return candidates;
}

/**
 * Pick first declared candidate, else first candidate (SDK may still resolve).
 */
function resolveFlowCardId(candidates, declaredIds) {
  const list = Array.isArray(candidates) ? candidates.filter(Boolean) : [candidates].filter(Boolean);
  if (!list.length) {return null;}
  if (declaredIds && declaredIds.size) {
    for (const id of list) {
      if (declaredIds.has(id)) {return id;}
    }
    // Fuzzy: declared ends with candidate suffix or vice-versa (hash truncation)
    for (const id of list) {
      for (const d of declaredIds) {
        if (d === id || d.startsWith(`${id}_`) || id.startsWith(`${d}_`)) {return d;}
        if (d.includes(id) || id.includes(d.replace(/_[a-f0-9]{5}$/i, ''))) {
          const base = d.replace(/_[a-f0-9]{5}$/i, '');
          if (list.includes(base) || base === id || id.startsWith(base)) {return d;}
        }
      }
    }
  }
  return list[0];
}

/**
 * Trigger first working flow card among candidates. Never throws.
 */
async function triggerFlowCardHeuristic(device, candidates, tokens = {}, type = 'trigger') {
  try {
    const homey = device?.homey;
    if (!homey?.flow) {return false;}
    const declared = collectDeclaredFlowIds(homey);
    const list = Array.isArray(candidates) ? candidates : [candidates];
    const preferred = resolveFlowCardId(list, declared);
    const ordered = preferred ? [preferred, ...list.filter((x) => x !== preferred)] : list;

    for (const id of ordered) {
      if (!id) {continue;}
      if (declared.size && !declared.has(id) && !ordered.includes(preferred)) {
        // Still try — some runtimes omit device cards from manifest.flow
      }
      const card = safeGetFlowCard(homey, id, type);
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

module.exports = {
  collectDeclaredFlowIds,
  buildPhysicalFlowCandidates,
  resolveFlowCardId,
  triggerFlowCardHeuristic,
  safeGetFlowCard,
};
