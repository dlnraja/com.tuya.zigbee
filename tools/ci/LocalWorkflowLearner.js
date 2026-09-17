'use strict';

/**
 * LocalWorkflowLearner (P2562) — habit learning for GitHub Actions / CI (no cloud AI).
 *
 * WHY(P215):
 * - Pourquoi: energy learner is Homey-only; crons/enrich/publish need the same local
 *   EMA habits (success rate, duration, soft-skip) without burning forfait tokens.
 * - Comment: persist compact EMA in reports/local-workflow-learn/STATE.json;
 *   observe(workflow, {ok, durationMs, extras}); recommend(workflow).
 * - Pour qui: ALL GHA workflows + improve:local (BOTH tracks).
 * - Quand: end of workflow / orchestrator step / --observe CLI.
 * - Contre quoi: remote AI triage; blind re-run of always-failing jobs; no habit memory.
 *
 * Dual-app: BOTH (CI reliability). State is report-local (not Homey bundle).
 */

const fs = require('fs');
const path = require('path');

const ALPHA_FAST = 0.3;
const ALPHA_SLOW = 0.1;
const MIN_SAMPLES = 3;

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function round(n, d = 4) {
  const f = 10 ** d;
  return Math.round(Number(n) * f) / f;
}

function ema(prev, next, alpha) {
  if (!isFiniteNumber(next)) return prev;
  if (!isFiniteNumber(prev)) return next;
  return prev * (1 - alpha) + next * alpha;
}

function normalizeId(id) {
  return String(id || 'unknown')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '_')
    .slice(0, 120) || 'unknown';
}

class LocalWorkflowLearner {
  /**
   * @param {object} [opts]
   * @param {string} [opts.root] repo root
   * @param {string} [opts.statePath] override state file
   */
  constructor(opts = {}) {
    this.root = opts.root || path.resolve(__dirname, '..', '..');
    this.statePath = opts.statePath
      || path.join(this.root, 'reports', 'local-workflow-learn', 'STATE.json');
    this._state = null;
  }

  _load() {
    if (this._state) return this._state;
    try {
      if (fs.existsSync(this.statePath)) {
        this._state = JSON.parse(fs.readFileSync(this.statePath, 'utf8'));
      }
    } catch (_e) {
      this._state = null;
    }
    if (!this._state || typeof this._state !== 'object') {
      this._state = { version: 1, workflows: {}, updatedAt: null };
    }
    if (!this._state.workflows) this._state.workflows = {};
    return this._state;
  }

  _save() {
    const st = this._load();
    st.updatedAt = new Date().toISOString();
    fs.mkdirSync(path.dirname(this.statePath), { recursive: true });
    fs.writeFileSync(this.statePath, `${JSON.stringify(st, null, 2)}\n`);
  }

  /**
   * Record one workflow run outcome.
   * @param {string} workflowId name or file stem
   * @param {{ ok?: boolean, durationMs?: number, conclusion?: string, extras?: object }} obs
   */
  observe(workflowId, obs = {}) {
    const id = normalizeId(workflowId);
    const st = this._load();
    const row = st.workflows[id] || {
      samples: 0,
      successEma: null,
      durationEmaMs: null,
      failStreak: 0,
      lastOk: null,
      lastAt: null,
      lastConclusion: null,
    };

    const ok = obs.ok === true
      || String(obs.conclusion || '').toLowerCase() === 'success';
    const samples = Math.min(2000, (Number(row.samples) || 0) + 1);
    const alpha = samples < MIN_SAMPLES ? ALPHA_FAST : ALPHA_SLOW;

    row.samples = samples;
    row.successEma = round(ema(row.successEma, ok ? 1 : 0, alpha), 4);
    if (isFiniteNumber(obs.durationMs) && obs.durationMs >= 0) {
      row.durationEmaMs = round(ema(row.durationEmaMs, obs.durationMs, alpha), 1);
    }
    row.failStreak = ok ? 0 : (Number(row.failStreak) || 0) + 1;
    row.lastOk = ok;
    row.lastAt = Date.now();
    row.lastConclusion = String(obs.conclusion || (ok ? 'success' : 'failure'));
    if (obs.extras && typeof obs.extras === 'object') {
      row.lastExtras = Object.keys(obs.extras).slice(0, 12).reduce((a, k) => {
        a[k] = obs.extras[k];
        return a;
      }, {});
    }

    st.workflows[id] = row;
    this._save();
    return row;
  }

  /**
   * Soft recommendation for next run — never blocks; CI may soft-skip expensive steps.
   */
  recommend(workflowId) {
    const id = normalizeId(workflowId);
    const row = this._load().workflows[id];
    if (!row || (row.samples || 0) < MIN_SAMPLES) {
      return {
        id,
        action: 'run',
        reason: 'insufficient_history',
        confidence: 0.2,
        row: row || null,
      };
    }

    const success = Number(row.successEma) || 0;
    const failStreak = Number(row.failStreak) || 0;

    if (failStreak >= 5 && success < 0.25) {
      return {
        id,
        action: 'soft_skip_or_heal',
        reason: 'chronic_failure',
        confidence: clamp(1 - success, 0.5, 0.95),
        row,
        hint: 'Prefer local heal (prepare-publish / size-gate / sacred-keep) before remote AI',
      };
    }
    if (success >= 0.85 && failStreak === 0) {
      return {
        id,
        action: 'run',
        reason: 'healthy_habit',
        confidence: success,
        row,
      };
    }
    if (success < 0.45) {
      return {
        id,
        action: 'run_with_local_heal_first',
        reason: 'low_success_ema',
        confidence: clamp(0.55 + (0.45 - success), 0.55, 0.9),
        row,
        hint: 'Run improve:local / layer-coverage / publish-size heal before retry',
      };
    }
    return {
      id,
      action: 'run',
      reason: 'neutral',
      confidence: 0.5,
      row,
    };
  }

  snapshot() {
    const st = this._load();
    const ids = Object.keys(st.workflows || {});
    return {
      updatedAt: st.updatedAt,
      workflowCount: ids.length,
      chronic: ids
        .map((id) => ({ id, ...this.recommend(id) }))
        .filter((r) => r.action === 'soft_skip_or_heal' || r.action === 'run_with_local_heal_first')
        .slice(0, 20),
    };
  }

  list() {
    return this._load().workflows;
  }
}

module.exports = LocalWorkflowLearner;
module.exports.normalizeId = normalizeId;
module.exports.ema = ema;
