#!/usr/bin/env node
'use strict';
// P3036: "retry at the next slot". A publish gate that held an upload (red/pending CI, spacing, busy build)
// leaves an artifact athom-deferred-<key>-<run_id>. publish-self-heal (cron, master) calls this script:
// when the newest marker of an app is newer than the latest run of that app's publish workflow and nothing
// of that workflow is queued/running, it dispatches the workflow once with deferred_retry=true.
// The dispatched run goes through the same gate again. Read-only on artifacts: never deletes anything.
// See docs/knowledge/P3036_ATHOM_PUBLISH_POLICY.md.

const TARGETS = {
  master: { workflow: 'auto-publish-on-push.yml', ref: 'master' },
  stable: { workflow: 'publish-stable.yml', ref: 'stable-v5' },
  bastien: { workflow: 'bastien-publish.yml', ref: 'bastien-home' },
};
const MAX_MARKER_AGE_H = 48;

// artifacts: [{name, created_at, expired}], runs: [{created_at, status}] newest first for that workflow+branch.
function deferredDecision({ key, artifacts, runs, now = Date.now() }) {
  const prefix = `athom-deferred-${key}-`;
  const markers = (artifacts || []).filter((a) => a && !a.expired && String(a.name || '').startsWith(prefix))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  if (!markers.length) return { dispatch: false, reason: 'no deferred marker' };
  const m = markers[0];
  // P3087: athom-deferred-<key>-m-b<id>.c<n>-<run> = held MANUAL run; only a newer dispatch re-checked it
  // (a push run is stopped by the open breaker and must not swallow the manual intent).
  const carry = (/-m-(b\d+\.c\d+)-\d+$/.exec(String(m.name)) || [])[1] || '';
  const mt = Date.parse(m.created_at);
  if (!Number.isFinite(mt) || now - mt > MAX_MARKER_AGE_H * 3600e3) return { dispatch: false, reason: `newest marker ${m.name} too old` };
  const active = (runs || []).find((r) => r && ['queued', 'in_progress', 'waiting', 'pending', 'requested'].includes(r.status));
  if (active) return { dispatch: false, reason: 'a run of the publish workflow is already queued/running' };
  const latest = (runs || []).filter((r) => r && (!carry || r.event === 'workflow_dispatch'))[0];
  if (latest && Date.parse(latest.created_at) > mt) return { dispatch: false, reason: `a newer run (${latest.created_at}) already re-checked the gate` };
  const inputs = carry ? { deferred_retry: 'true', deferred_manual: carry } : { deferred_retry: 'true' };
  return { dispatch: true, inputs, reason: `marker ${m.name} (${m.created_at}) newer than the latest ${carry ? 'dispatch ' : ''}run` };
}

async function gh(apiPath, { method = 'GET', body } = {}) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN missing');
  const res = await fetch(`${process.env.GITHUB_API_URL || 'https://api.github.com'}${apiPath}`, {
    method, headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${apiPath} -> ${res.status}`);
  return res.status === 204 ? null : res.json();
}

async function main() {
  const repo = process.env.GITHUB_REPOSITORY;
  const dry = process.env.DEFERRED_DRY_RUN === '1';
  const keys = (process.argv[2] || 'master,stable,bastien').split(',').map((k) => k.trim()).filter((k) => TARGETS[k]);
  const arts = await gh(`/repos/${repo}/actions/artifacts?per_page=100`);
  for (const key of keys) {
    const t = TARGETS[key];
    try {
      const runs = await gh(`/repos/${repo}/actions/workflows/${t.workflow}/runs?branch=${encodeURIComponent(t.ref)}&per_page=20`);
      const d = deferredDecision({ key, artifacts: arts.artifacts, runs: runs.workflow_runs });
      console.log(`[p3036-deferred] ${key}: ${d.dispatch ? 'DISPATCH' : 'skip'} — ${d.reason}`);
      if (d.dispatch && !dry) {
        await gh(`/repos/${repo}/actions/workflows/${t.workflow}/dispatches`, { method: 'POST', body: { ref: t.ref, inputs: d.inputs || { deferred_retry: 'true' } } });
      }
    } catch (e) { console.log(`[p3036-deferred] ${key}: error ${e.message} (no dispatch)`); }
  }
}

module.exports = { TARGETS, deferredDecision, MAX_MARKER_AGE_H };
if (require.main === module) main().catch((e) => { console.log(`[p3036-deferred] error ${e.message}`); process.exit(0); });
