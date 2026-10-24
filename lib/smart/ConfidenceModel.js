'use strict';

/**
 * P3023: confidence scoring for interpretations (pure).
 *
 * Each interpretation starts from a Beta(α, β) prior chosen by its EVIDENCE TIER, then real
 * observations update it (Bayesian Beta-Bernoulli):
 *   exact     — an exact mfr|pid couple from a shipped decoder (Z2M/ZHA/our drivers)  prior ≈ 0.97
 *   catalog   — the generated DP catalogue for this couple                            prior ≈ 0.90
 *   family    — same PID / device-class family, not this exact couple                 prior ≈ 0.60
 *   heuristic — shape/size guess                                                       prior ≈ 0.35
 *   user      — taught by the user (Flow card)                                         prior ≈ 0.95
 * confirm  = a later observation agrees (same action for the same pattern, plausible value…)
 * contradict = it disagrees (another action inferred, anomaly flagged…).
 * posterior mean = (α + confirms) / (α + β + confirms + contradicts), clamped to [0.01, 0.99].
 * Prior strengths (α+β) make exact evidence hard to overturn and heuristics quick to move.
 */

const PRIORS = Object.freeze({
  exact: Object.freeze({ a: 29, b: 1 }), // 0.967, strength 30
  user: Object.freeze({ a: 19, b: 1 }), // 0.95, strength 20
  catalog: Object.freeze({ a: 9, b: 1 }), // 0.90, strength 10
  family: Object.freeze({ a: 3, b: 2 }), // 0.60, strength 5
  heuristic: Object.freeze({ a: 0.7, b: 1.3 }), // 0.35, strength 2
});

const COUNT_CAP = 1000;

function tierOf(interp) {
  if (!interp) { return 'heuristic'; }
  if (interp.tier && PRIORS[interp.tier]) { return interp.tier; }
  const src = String(interp.source || '');
  if (/^learned:user|^user/.test(src)) { return 'user'; }
  if (interp.exact) { return 'exact'; }
  if (/catalog/i.test(src)) { return 'catalog'; }
  if (/family|class|pid/i.test(src)) { return 'family'; }
  return 'heuristic';
}

function prior(tier) { return PRIORS[tier] || PRIORS.heuristic; }

/**
 * @param {string} tier
 * @param {number} [confirms]
 * @param {number} [contradicts]
 * @returns {number} posterior mean
 */
function posterior(tier, confirms = 0, contradicts = 0) {
  const p = prior(tier);
  const c = Math.max(0, Math.min(COUNT_CAP, Number(confirms) || 0));
  const x = Math.max(0, Math.min(COUNT_CAP, Number(contradicts) || 0));
  const m = (p.a + c) / (p.a + p.b + c + x);
  return Math.max(0.01, Math.min(0.99, m));
}

/** Combine independent sources (noisy-OR on the evidence, never above 0.99). */
function combine(...confs) {
  let miss = 1;
  for (const c of confs) { const v = Number(c); if (v > 0 && v < 1) { miss *= 1 - v; } else if (v >= 1) { miss = 0.01; } }
  return Math.max(0.01, Math.min(0.99, 1 - miss));
}

/** Update a compact counter record {p: confirms, q: contradicts} in place. */
function observe(rec, agree) {
  if (!rec) { return rec; }
  if (agree) { rec.p = Math.min(COUNT_CAP, (rec.p || 0) + 1); } else { rec.q = Math.min(COUNT_CAP, (rec.q || 0) + 1); }
  return rec;
}

module.exports = { PRIORS, tierOf, prior, posterior, combine, observe, COUNT_CAP };
