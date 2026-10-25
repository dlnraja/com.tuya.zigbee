#!/usr/bin/env node
'use strict';
/**
 * P3048 (5) — public reply CANDIDATES only. Never posts, never comments, never reacts, never edits.
 *
 * A GitHub issue of this repo is a candidate when ALL hold:
 *   - a commit pushed to master in the last 60 days references it (#N in the message);
 *   - CI is green on that commit (>= 1 successful run, no failed run; [skip ci]/no-run commits = pending);
 *   - the issue is open, not a pull request, updated in the last 60 days;
 *   - the last comment (or the issue itself when no comment) is not from the owner (dlnraja);
 *   - no reply candidate for this issue was already listed in the last 14 days (journal).
 * Output: data/progress/reply-candidates.json + one journal line. Same limits as the anti-flood routine
 * (documented in the file): a human or the Grok Bot routine decides; max 1 reply per run, 3 per 7 days,
 * 1 per thread per 14 days, nothing after a warning/captcha/403/429.
 *
 *   node scripts/automation/reply-candidates.cjs [--days=60] [--owner=dlnraja] [--dry]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'data', 'progress', 'reply-candidates.json');
const LIMITS = {
  autoPost: false,
  maxRepliesPerRun: 1, maxRepliesPer7Days: 3, maxForumRepliesPer7Days: 1, minDaysBetweenRepliesSameThread: 14,
  quietHoursAfterAnyReply: 24, stopOn: ['warning', 'captcha', '403', '429', 'moderation', 'AI remark'],
  never: ['open/close/edit issues', 'reactions', 'mentions of third parties', 'replies to Athom, moderators or bots', 'reviving threads idle > 60 days'],
};

/** Issue numbers referenced by a commit message (#123, fixes #123, GH-123). */
function issueRefs(message) {
  const out = new Set();
  for (const m of String(message || '').matchAll(/(?:^|[\s(\[,])(?:#|GH-)(\d{1,6})\b/g)) out.add(Number(m[1]));
  return [...out].filter((n) => n > 0);
}

function ciState(runs) {
  const done = (runs || []).filter((r) => r.status === 'completed' && !['cancelled', 'skipped', 'neutral'].includes(r.conclusion));
  if (done.some((r) => r.conclusion === 'failure' || r.conclusion === 'timed_out')) return 'red';
  if (done.some((r) => r.conclusion === 'success')) return 'green';
  return 'pending';
}

/** evaluate(...) -> { candidate: bool, reason } (pure, tested). */
function evaluate({ issue, lastComment, ci, owner = 'dlnraja', now = Date.now(), days = 60, recentlyListed = false }) {
  if (!issue) return { candidate: false, reason: 'not found' };
  if (issue.pull_request) return { candidate: false, reason: 'pull request' };
  if (issue.state !== 'open') return { candidate: false, reason: 'closed' };
  const upd = Date.parse(issue.updated_at);
  if (!Number.isFinite(upd) || now - upd > days * 86400000) return { candidate: false, reason: `idle > ${days} d` };
  if (ci !== 'green') return { candidate: false, reason: `CI ${ci}` };
  const lastAuthor = lastComment ? (lastComment.user || {}).login : (issue.user || {}).login;
  if (String(lastAuthor || '').toLowerCase() === owner.toLowerCase()) return { candidate: false, reason: 'last message is from the owner' };
  if (/\[bot\]$/i.test(String(lastAuthor || ''))) return { candidate: false, reason: 'last message from a bot' };
  if (recentlyListed) return { candidate: false, reason: 'already listed in the last 14 days' };
  return { candidate: true, reason: 'fix pushed with green CI, the reporter spoke last' };
}

async function main() {
  const { gh, REPO } = require('./gh.cjs');
  const journal = require('./journal.cjs');
  const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
  const days = Number(arg('days', 60)); const owner = arg('owner', 'dlnraja'); const dry = process.argv.includes('--dry');
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const commits = [];
  for (let page = 1; page <= 3; page++) {
    const r = await gh(`/repos/${REPO}/commits?sha=master&since=${since}&per_page=100&page=${page}`, { soft: true });
    if (!Array.isArray(r) || !r.length) break;
    commits.push(...r); if (r.length < 100) break;
  }
  const refs = new Map(); // issue -> newest commit
  for (const c of commits) for (const n of issueRefs((c.commit || {}).message)) if (!refs.has(n)) refs.set(n, c);
  const listed = journal.readSince(24 * 14).filter((e) => e.workflow === 'reply-candidates' && e.data && Array.isArray(e.data.issues)).flatMap((e) => e.data.issues);
  const candidates = []; const skipped = [];
  for (const [n, c] of [...refs.entries()].slice(0, 40)) {
    const issue = await gh(`/repos/${REPO}/issues/${n}`, { soft: true });
    if (!issue || issue.pull_request || issue.state !== 'open') { skipped.push({ issue: n, reason: !issue ? 'not found' : issue.pull_request ? 'pull request' : 'closed' }); continue; }
    let lastComment = null;
    if (issue.comments > 0) {
      const page = Math.ceil(issue.comments / 100);
      const cs = await gh(`/repos/${REPO}/issues/${n}/comments?per_page=100&page=${page}`, { soft: true });
      lastComment = Array.isArray(cs) && cs.length ? cs[cs.length - 1] : null;
    }
    const runs = ((await gh(`/repos/${REPO}/actions/runs?head_sha=${c.sha}&per_page=50`, { soft: true })) || {}).workflow_runs || [];
    const ci = ciState(runs);
    const v = evaluate({ issue, lastComment, ci, owner, days, recentlyListed: listed.includes(n) });
    const row = { issue: n, title: String(issue.title || '').slice(0, 120), url: issue.html_url, commit: c.sha.slice(0, 10), commitAt: (c.commit.committer || {}).date, ci, lastAuthor: lastComment ? lastComment.user.login : issue.user.login, reason: v.reason };
    (v.candidate ? candidates : skipped).push(row);
  }
  const out = { generated: new Date().toISOString(), note: 'P3048: candidates only. No workflow posts, comments or reacts. A human (or the Grok Bot anti-flood routine) decides.', limits: LIMITS, scanned: { commits: commits.length, issues: refs.size }, candidates, skipped: skipped.slice(0, 60) };
  if (!dry) {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
    journal.append({ workflow: 'reply-candidates', status: 'info', key: `reply-candidates:${candidates.map((x) => x.issue).join(',') || 'none'}`, summary: `${candidates.length} reply candidate(s) from ${commits.length} commits / ${refs.size} referenced issues (nothing posted)`, data: { issues: candidates.map((x) => x.issue) } });
  }
  const md = `### Reply candidates (P3048, nothing posted)\n${candidates.map((x) => `- #${x.issue} ${x.title} (commit ${x.commit}, CI ${x.ci})`).join('\n') || '- none'}\n`;
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  console.log(md);
}

module.exports = { issueRefs, ciState, evaluate, LIMITS };
if (require.main === module) main().catch((e) => { console.log(`::warning::reply-candidates: ${e.message}`); process.exit(0); });
