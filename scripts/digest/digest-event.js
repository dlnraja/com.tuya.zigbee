'use strict';
/**
 * scripts/digest/digest-event.js — real-time listener (replaces the Grok event routine).
 *  - pull_request opened / closed+merged  → one short comment on the tracking issue
 *  - workflow_run completed on master     → comment when a workflow turns red (with failed
 *    jobs) or turns green again; deduplicated against the ci-health state (silent while
 *    it stays red).
 *    Bursts: at most one CI comment per DIGEST_EVENT_DEDUPE_MIN (30) minutes; the rest is buffered.
 * Env: DIGEST_IGNORE_ACTORS (comma list, default dependabot[bot],github-actions[bot])
 */
const fs = require('fs');
const L = require('./lib');
const { failedJobs, BAD } = require('./ci-health');

const ev = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
const name = process.env.GITHUB_EVENT_NAME;
const DEDUPE_MIN = Number(process.env.DIGEST_EVENT_DEDUPE_MIN || 30);
const IGN = (process.env.DIGEST_IGNORE_ACTORS || 'dependabot[bot],github-actions[bot]').split(',');

L.run(async () => {
  if (name === 'pull_request' || name === 'pull_request_target') {
    const pr = ev.pull_request;
    if (IGN.includes(pr.user.login)) return console.log(`ignored actor ${pr.user.login}`);
    let what = null;
    if (ev.action === 'opened' || ev.action === 'reopened') what = `🆕 PR ouverte #${pr.number} → \`${pr.base.ref}\` par ${L.esc(pr.user.login)} : ${L.esc(pr.title)}`;
    else if (ev.action === 'closed' && pr.merged) what = `✅ PR mergée #${pr.number} → \`${pr.base.ref}\` (${L.short(pr.merge_commit_sha)}) : ${L.esc(pr.title)}`;
    if (!what) return console.log(`PR action ${ev.action} — silent`);
    const { issue } = await L.loadState('events');
    await L.postComment(issue, `${what}\n${pr.html_url}`);
    return;
  }
  if (name === 'workflow_run') {
    const r = ev.workflow_run;
    if (r.head_branch !== 'master' || r.event === 'pull_request') return console.log('not a master run — silent');
    if (['cancelled', 'skipped', 'neutral'].includes(r.conclusion)) return console.log(`${r.conclusion} — silent`);
    const { issue, prev } = await L.loadState('ci');
    const ci = prev || {};
    ci.master = ci.master || { red: {} };
    ci.master.red = ci.master.red || {};
    ci._events = ci._events || { lastAt: null, pending: [] };
    const wasRed = !!ci.master.red[r.name];
    let line = null;
    if (BAD.includes(r.conclusion)) {
      if (wasRed) return console.log('already red — silent');
      const jobs = await failedJobs(r.id);
      ci.master.red[r.name] = { id: r.id, conclusion: r.conclusion, sha: r.head_sha, at: r.updated_at, url: r.html_url, event: r.event, jobs };
      line = `🔴 CI rouge sur **master** · _${L.esc(r.name)}_ (\`${L.short(r.head_sha)}\` ${L.esc(r.head_commit && r.head_commit.message.split('\n')[0])}) — ${jobs.map(L.esc).join(' ; ') || 'job ?'} — ${r.html_url}`;
    } else if (r.conclusion === 'success' && wasRed) {
      delete ci.master.red[r.name];
      line = `🟢 **master** · _${L.esc(r.name)}_ est repassé au vert (\`${L.short(r.head_sha)}\`) ${r.html_url}`;
    } else return console.log('green and was green — silent');
    // Burst dedupe: at most ONE comment per DEDUPE_MIN minutes; extra transitions are buffered
    // in state and flushed by the next allowed comment (or by the next ci-health run).
    const recent = ci._events.lastAt && Date.now() - Date.parse(ci._events.lastAt) < DEDUPE_MIN * 60e3;
    ci._events.pending = [...(ci._events.pending || []), line].slice(-20);
    if (recent) {
      console.log(`comment suppressed (last one < ${DEDUPE_MIN} min ago) — buffered (${ci._events.pending.length})`);
    } else {
      await L.postComment(issue, ci._events.pending.map((l) => '- ' + l).join('\n'));
      ci._events = { lastAt: new Date().toISOString(), pending: [] };
    }
    await L.saveState(issue, 'ci', ci);
    return;
  }
  console.log(`event ${name} not handled`);
});
