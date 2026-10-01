'use strict';
/**
 * scripts/digest/git-mine.js — incremental mining of commit history as a feedback-loop input.
 *
 * Branches: GITMINE_BRANCHES (default master,stable-v5,bastien-home). Per branch a `since`
 * cursor (last commit date seen) lives in the tracking-issue state (key `gitmine`). First run
 * walks back GITMINE_BOOT_DAYS (default 3650 = whole history) but at most GITMINE_MAX_PAGES
 * (default 5 × 100 commits) per branch per run, oldest-first progress, so the full history is
 * covered over successive days without bursts.
 *
 * Commit messages describe what was fixed/added (mfr/pid, DP, cluster, frames, MCU behaviour).
 * Every lead from here is recorded with source `git-history` → heuristic: true. leads-merge only
 * promotes a git-history couple after it is verified in an external dataset, and bastien-home
 * (an experimental branch) never becomes more than a report line.
 * Report: ONE comment on the tracking issue only when commits < 14 days old carry fresh unmapped
 * leads (backfill of older history → artifact + step summary only).
 */
const crypto = require('crypto');
const L = require('./lib');
const E = require('./enrich');
const LD = require('./leads');

const REPO = process.env.GITMINE_REPO || L.REPO;
const BRANCHES = (process.env.GITMINE_BRANCHES || 'master,stable-v5,bastien-home').split(',').map((s) => s.trim()).filter(Boolean);
const MAX_PAGES = Math.min(Number(process.env.GITMINE_MAX_PAGES || 5), 10);
const BOOT_DAYS = Number(process.env.GITMINE_BOOT_DAYS || 3650);
const SKIP_BOT = /\[auto:|\[bot\]|github-actions/i;
const h8 = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 8);

L.run(async () => {
  const { issue, prev } = await L.loadState('gitmine');
  const st = prev || { cursors: {}, seen: [], mined: 0 };
  const seen = new Set(st.seen || []);
  const idx = E.buildIndex(process.cwd());
  const fresh = []; let mined = 0;
  for (const br of BRANCHES) {
    const cur = st.cursors[br] || { since: new Date(Date.now() - BOOT_DAYS * 864e5).toISOString(), until: null };
    // The commits API lists newest-first. To progress oldest-first we page from `since`, and when
    // a branch has more than MAX_PAGES*100 commits pending we remember `until` (oldest reached)
    // and continue next run, then move `since` forward once the window is exhausted.
    let reachedEnd = false; let oldest = null; let newest = null;
    for (let page = 1; page <= MAX_PAGES; page++) {
      let list;
      const q = `sha=${encodeURIComponent(br)}&per_page=100&page=${page}&since=${encodeURIComponent(cur.since)}` + (cur.until ? `&until=${encodeURIComponent(cur.until)}` : '');
      try { list = await L.gh(`/repos/${REPO}/commits?${q}`, { allow404: true }); } catch (e) { if (e.name === 'StopDigest') throw e; L.log(`${br}: ${e.message.slice(0, 100)}`); break; }
      if (!list || !list.length) { reachedEnd = true; break; }
      for (const c of list) {
        const date = c.commit.committer && c.commit.committer.date;
        if (!newest || date > newest) newest = date;
        if (!oldest || date < oldest) oldest = date;
        const msg = c.commit.message || '';
        if (SKIP_BOT.test(msg) || (c.author && /\[bot\]$/.test(c.author.login || ''))) continue;
        mined++;
        const rec = LD.record('git-history', c.html_url, msg, { origin: 'commit', idx, branch: br });
        if (!rec || !rec.signals.unmapped) continue;
        const f = rec.signals.unmapped.filter((u) => !u.startsWith('endpoint:') && !seen.has(h8(br + u)));
        f.forEach((u) => seen.add(h8(br + u)));
        if (f.length) fresh.push({ recent: Date.now() - Date.parse(date) < 14 * 864e5, br, sha: c.sha.slice(0, 10), url: c.html_url, title: msg.split('\n')[0].slice(0, 90), f });
      }
      if (list.length < 100) { reachedEnd = true; break; }
    }
    if (reachedEnd) st.cursors[br] = { since: (cur.untilNewest && cur.untilNewest > (newest || '')) ? cur.untilNewest : (newest || cur.since), until: null };
    else st.cursors[br] = { since: cur.since, until: oldest, untilNewest: cur.untilNewest || newest };
  }
  st.seen = [...seen].slice(-3000); st.mined = (st.mined || 0) + mined; st.at = new Date().toISOString();
  const md = `## 🧬 Git history mining — ${BRANCHES.join(', ')}\n\n${mined} commit(s) analysés ce run (total ${st.mined}).` +
    (fresh.length ? `\n\n🧭 **Pistes non mappées sur master** (heuristiques, à vérifier — bastien-home = expérimental) :\n${fresh.slice(0, 25).map((x) => `- \`${x.br}\` [${x.sha}](${x.url}) ${L.esc(x.title)} — ${x.f.slice(0, 8).map((u) => '`' + u + '`').join(', ')}`).join('\n')}` : '') +
    `\n\n<sub>daily-digest.yml (inspiration/git-mine) · lecture seule · run ${process.env.GITHUB_RUN_ID || 'local'}</sub>`;
  L.summary(md);
  // Backfill of old history goes to the artifact + step summary only; comment only for recent commits.
  if (prev && fresh.some((x) => x.recent)) await L.postComment(issue, md);
  await L.saveState(issue, 'gitmine', st);
});
