'use strict';
/**
 * scripts/digest/git-mine.js — incremental mining of commit history as a feedback-loop input.
 *
 * Branches: GITMINE_BRANCHES (default master,stable-v5,bastien-home). Per branch the state keeps
 * `head` (newest commit date mined) and `back` (oldest reached). Each run first mines everything
 * newer than `head` (≤2 pages), then spends the rest of GITMINE_MAX_PAGES (default 5 × 100) on
 * backfill below `back` until the whole history is done. New commits are never starved.
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
const SKIP_BOT = /\[auto:|\[bot\]|github-actions/i;
const h8 = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 8);

L.run(async () => {
  const { issue, prev } = await L.loadState('gitmine');
  const st = prev || { cursors: {}, seen: [], mined: 0 };
  const seen = new Set(st.seen || []);
  const idx = E.buildIndex(process.cwd());
  const fresh = []; let mined = 0;
  const handle = (br, c) => {
    const date = c.commit.committer && c.commit.committer.date;
    const msg = c.commit.message || '';
    if (SKIP_BOT.test(msg) || (c.author && /\[bot\]$/.test(c.author.login || ''))) return date;
    mined++;
    const rec = LD.record('git-history', c.html_url, msg, { origin: 'commit', idx, branch: br });
    if (rec && rec.signals.unmapped) {
      const f = rec.signals.unmapped.filter((u) => !u.startsWith('endpoint:') && !seen.has(h8(br + u)));
      f.forEach((u) => seen.add(h8(br + u)));
      if (f.length) fresh.push({ recent: Date.now() - Date.parse(date) < 14 * 864e5, br, sha: c.sha.slice(0, 10), url: c.html_url, title: msg.split('\n')[0].replace(/\b(?:z2m|zha|zigbee2mqtt|blakadder|deconz|herdsman|zigpy|koenkk)\b/gi, 'ext').slice(0, 90), f });
    }
    return date;
  };
  const page = async (br, extra, p) => {
    try { return (await L.gh(`/repos/${REPO}/commits?sha=${encodeURIComponent(br)}&per_page=100&page=${p}${extra}`, { allow404: true })) || []; } catch (e) { if (e.name === 'StopDigest') throw e; L.log(`${br}: ${e.message.slice(0, 100)}`); return null; }
  };
  for (const br of BRANCHES) {
    // Newest-first: (1) everything newer than `head` (≤ NEW_PAGES pages), then (2) backfill older
    // history below `back` with the remaining page budget, until `done`.
    let cur = st.cursors[br] || {};
    if (cur.untilNewest || cur.until) cur = { head: cur.untilNewest || null, back: cur.until || null }; // migrate v1 state
    let used = 0; let newest = null; let oldest = cur.back;
    const NEW_PAGES = Math.max(1, Math.min(2, MAX_PAGES));
    for (let p = 1; p <= NEW_PAGES; p++) {
      const list = await page(br, cur.head ? `&since=${encodeURIComponent(cur.head)}` : '', p); used++;
      if (!list || !list.length) break;
      for (const c of list) {
        if (cur.head && c.commit.committer.date <= cur.head) continue;
        const d = handle(br, c);
        if (!newest || d > newest) newest = d;
        if (!cur.head && (!oldest || d < oldest)) oldest = d; // first run: new window doubles as backfill start
      }
      if (list.length < 100) break;
    }
    if (newest) cur.head = newest;
    if (!cur.back) cur.back = oldest || cur.head;
    for (let p = 1; !cur.done && used < MAX_PAGES && cur.back; p++) {
      const until = new Date(Date.parse(cur.back) - 1000).toISOString();
      const list = await page(br, `&until=${encodeURIComponent(until)}`, 1); used++;
      if (!list) break;
      if (!list.length) { cur.done = true; break; }
      for (const c of list) { const d = handle(br, c); if (d < cur.back) cur.back = d; }
      if (list.length < 100) { cur.done = true; break; }
    }
    st.cursors[br] = { head: cur.head, back: cur.back, done: !!cur.done };
  }
  st.seen = [...seen].slice(-1000); // issue body ≤ 65 536 chars: keep state compact st.mined = (st.mined || 0) + mined; st.at = new Date().toISOString();
  const md = `## 🧬 Git history mining — ${BRANCHES.join(', ')}\n\n${mined} commit(s) analysés ce run (total ${st.mined}).` +
    (fresh.length ? `\n\n🧭 **Pistes non mappées sur master** (heuristiques, à vérifier — bastien-home = expérimental) :\n${fresh.slice(0, 25).map((x) => `- \`${x.br}\` [${x.sha}](${x.url}) ${L.esc(x.title)} — ${x.f.slice(0, 8).map((u) => '`' + u + '`').join(', ')}`).join('\n')}` : '') +
    `\n\n<sub>daily-digest.yml (inspiration/git-mine) · lecture seule · run ${process.env.GITHUB_RUN_ID || 'local'}</sub>`;
  L.summary(md);
  // Backfill of old history goes to the artifact + step summary only; comment only for recent commits.
  if (prev && fresh.some((x) => x.recent)) await L.postComment(issue, md);
  await L.saveState(issue, 'gitmine', st);
});
