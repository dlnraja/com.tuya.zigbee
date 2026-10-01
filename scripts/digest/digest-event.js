'use strict';
/**
 * scripts/digest/digest-event.js — real-time listener (replaces the Grok event routine).
 *  - pull_request opened / closed+merged  → one short comment on the tracking issue
 *  - workflow_run completed on master     → comment when a workflow turns red (with failed
 *    jobs) or turns green again; deduplicated against the ci-health state (silent while
 *    it stays red).
 * Env: DIGEST_IGNORE_ACTORS (comma list, default dependabot[bot],github-actions[bot])
 */
const fs = require('fs');
const L = require('./lib');
const { failedJobs, BAD } = require('./ci-health');

const ev = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
const name = process.env.GITHUB_EVENT_NAME;
const IGN = (process.env.DIGEST_IGNORE_ACTORS || 'dependabot[bot],github-actions[bot]').split(',');

(async () => {
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
    const wasRed = !!ci.master.red[r.name];
    if (BAD.includes(r.conclusion)) {
      const jobs = await failedJobs(r.id);
      ci.master.red[r.name] = { id: r.id, conclusion: r.conclusion, sha: r.head_sha, at: r.updated_at, url: r.html_url, event: r.event, jobs };
      if (!wasRed) await L.postComment(issue, `🔴 CI rouge sur **master** · _${L.esc(r.name)}_ (\`${L.short(r.head_sha)}\` ${L.esc(r.head_commit && r.head_commit.message.split('\n')[0])})\n- ${jobs.map(L.esc).join('\n- ') || 'job ?'}\n${r.html_url}`);
      else console.log('already red — silent');
    } else if (r.conclusion === 'success' && wasRed) {
      delete ci.master.red[r.name];
      await L.postComment(issue, `🟢 **master** · _${L.esc(r.name)}_ est repassé au vert (\`${L.short(r.head_sha)}\`) ${r.html_url}`);
    } else return console.log('green and was green — silent');
    await L.saveState(issue, 'ci', ci);
    return;
  }
  console.log(`event ${name} not handled`);
})().catch((e) => { console.error(e); process.exit(1); });
