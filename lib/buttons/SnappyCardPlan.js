'use strict';

/**
 * P3387 - one Flow card id fires at most once per physical press on the
 * snappy (fire-and-forget) remote path of ButtonDevice.triggerButtonPress.
 *
 * Before: the snappy path called triggerFlowCardHeuristic(candidates), which
 * fires the preferred declared card (for button_wireless_3 single:
 * button_wireless_3_button_3gang_button_pressed), and then fired the declared
 * list whose first entry is that same id. Every TS0043 press ran Flows built on
 * the generic "Button pressed" card twice (same for double / long).
 *
 * The plan keeps every card that used to fire; it only removes the repeat.
 */

function lc(id) {return String(id || '').toLowerCase();}

/**
 * @param {object} p
 * @param {string[]} p.candidates  heuristic candidates (buildPhysicalFlowCandidates)
 * @param {string[]} p.declared    driver card ids fired directly (already capped)
 * @param {string|null} p.universal app-level card fired directly (button_pressed...)
 * @param {string|null} p.preferred resolveFlowCardId(candidates, declaredSet)
 * @returns {{ heuristic: string[]|null, declared: string[], universal: string|null }}
 *   heuristic === null means: do not call triggerFlowCardHeuristic.
 */
function planSnappyCards({ candidates, declared, universal, preferred }) {
  const direct = new Set((declared || []).map(lc));
  if (universal) {direct.add(lc(universal));}
  const list = Array.isArray(candidates) ? candidates : [];
  let heuristic;
  if (preferred) {
    // The heuristic fires only the preferred id; skip it when that id fires anyway.
    heuristic = direct.has(lc(preferred)) ? null : list;
  } else {
    // No preferred id: the heuristic falls back to the first triggerable
    // candidate, so hand it only ids that are not fired directly.
    const rest = list.filter((id) => id && !direct.has(lc(id)));
    heuristic = rest.length ? rest : null;
  }
  return { heuristic, declared: (declared || []).slice(), universal: universal || null };
}

/** Ids that would fire for a plan, given the id the heuristic resolves to. */
function firedIds(plan, heuristicFires) {
  const out = [];
  if (plan.heuristic && heuristicFires) {out.push(heuristicFires);}
  out.push(...plan.declared);
  if (plan.universal) {out.push(plan.universal);}
  return out;
}

module.exports = { planSnappyCards, firedIds };
