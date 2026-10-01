'use strict';
/**
 * scripts/digest/inspiration-scan.js — "inspiration" scan of JohanBendz public repos. REPORT-ONLY.
 * Reads ALL issues + PRs (open AND closed) and their conversation comments, incrementally:
 *   - per-repo cursor = updated_at of the last processed item (ascending order), stored in the
 *     tracking-issue state → the backlog is walked a little each run, then only new activity;
 *   - hard caps per run: INSPIRATION_MAX_ITEMS (100) items, comments ≤ 1 page (50) per item,
 *     pages of 50 with the lib's 300–800 ms spacing, API-call budget, graceful stop on low quota.
 * Each item's text (title + body + comments) goes through scripts/digest/enrich.js (mfr, pid,
 * DP, clusters incl. non-native, endpoints, raw frames, flows, TX/RX, Z2M/ZHA refs) and is
 * cross-checked against this repo. UNMAPPED mfr/pid leads get a free lookup (lookup.js:
 * Z2M cache, blakadder.json, ≤5 code searches). ONE comment on the tracking issue only when
 * there are NEW leads (already-reported leads are remembered as short hashes).
 * Bot-authored PRs/comments (dependabot, renovate, any [bot]) are scanned like any other item.
 * Workflow ideas: ≤5 repos per run (rotating) get their .github/workflows listed; NEW workflow
 * files are summarised (notable practices) as SUGGESTIONS only — never adopted automatically.
 * Env: INSPIRATION_OWNER (JohanBendz) · INSPIRATION_REPOS (comma list; default = all public
 *      non-fork repos of the owner) · INSPIRATION_MAX_ITEMS (100) · LOOKUP_CODE_SEARCH_MAX (5)
 */
const crypto = require('crypto');
const L = require('./lib');
const E = require('./enrich');
const LD = require('./leads');
const { lookup, stats } = require('./lookup');

const OWNER = process.env.INSPIRATION_OWNER || 'JohanBendz';
const MAX_ITEMS = Math.min(Number(process.env.INSPIRATION_MAX_ITEMS || 100), 200);
const MAX_LOOKUPS = Number(process.env.INSPIRATION_MAX_LOOKUPS || 8);
const h8 = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 8);

async function repos() {
  if (process.env.INSPIRATION_REPOS) return process.env.INSPIRATION_REPOS.split(',').map((s) => s.trim()).filter(Boolean);
  const list = await L.gh(`/users/${OWNER}/repos?type=owner&sort=pushed&per_page=100`);
  return list.filter((r) => !r.fork && !r.private).map((r) => r.full_name);
}
// Own repo is scanned too (issues/PRs + comments, incremental) so its feedback reaches the loop.
const EXTRA = (process.env.INSPIRATION_EXTRA_REPOS ?? 'dlnraja/com.tuya.zigbee').split(',').map((s) => s.trim()).filter(Boolean);
const sourceOf = (repo) => (/^dlnraja\//i.test(repo) ? 'github-own' : 'johan-issue');

L.run(async () => {
  const { issue, prev } = await L.loadState('inspiration');
  const st = prev || { cursors: {}, seen: [], scanned: 0 };
  const seen = new Set(st.seen || []);
  const idx = E.buildIndex(process.cwd());
  const repoList = [...new Set([...(await repos()), ...EXTRA])];
  let budget = MAX_ITEMS;
  const found = []; // { item, leads(render), unmapped[] }
  let scanned = 0;
  // Fair share: repos with the oldest cursor first, so every repo progresses.
  // Own repo (EXTRA) always first; each repo gets at most PER_REPO items per run so a long
  // backlog in one repo cannot starve the others.
  repoList.sort((a, b) => (EXTRA.includes(b) - EXTRA.includes(a)) || String(st.cursors[a] || '').localeCompare(String(st.cursors[b] || '')));
  const PER_REPO = Math.max(10, Number(process.env.INSPIRATION_PER_REPO || 40));
  for (const repo of repoList) {
    if (budget <= 0) break;
    const since = st.cursors[repo];
    const stopAt = Math.max(0, budget - PER_REPO);
    for (let page = 1; page <= 4 && budget > stopAt; page++) {
      const q = `state=all&sort=updated&direction=asc&per_page=${Math.min(50, PER_REPO)}&page=${page}` + (since ? `&since=${encodeURIComponent(since)}` : '');
      let items;
      try { items = await L.gh(`/repos/${repo}/issues?${q}`, { allow404: true }); } catch (e) {
        if (e.name === 'StopDigest') throw e;
        L.log(`${repo}: ${e.message.slice(0, 100)}`); break;
      }
      if (!items || !items.length) break;
      for (const it of items) {
        if (budget <= stopAt) break;
        // `since` is inclusive: skip the item that set the cursor last time
        if (since && it.updated_at === since && st.lastIds && st.lastIds[repo] === it.id) continue;
        let text = `${it.title}\n${it.body || ''}`;
        if (it.comments > 0) {
          try {
            const cs = await L.gh(`/repos/${repo}/issues/${it.number}/comments?per_page=50`);
            text += '\n' + cs.map((c) => c.body || '').join('\n');
          } catch (e) { if (e.name === 'StopDigest') throw e; }
        }
        const c = E.check(E.extract(text), idx);
        try { if (/tuya/i.test(repo)) await LD.recordDeep(sourceOf(repo), it.html_url, text, { idx }); else LD.record(sourceOf(repo), it.html_url, text, { idx }); } catch (e) { if (e.name === 'StopDigest') throw e; L.log(`leads: ${e.message}`); }
        const unmapped = E.unmappedLeads(c).filter((u) => !u.startsWith('endpoint:')); // endpoints w/o device context = noise
        const fresh = unmapped.filter((u) => !seen.has(h8(u)));
        if (fresh.length) found.push({ it, repo, leads: E.renderLeads(c), fresh });
        fresh.forEach((u) => seen.add(h8(u)));
        st.cursors[repo] = it.updated_at;
        st.lastIds = { ...(st.lastIds || {}), [repo]: it.id };
        budget--; scanned++;
      }
      if (items.length < Math.min(50, PER_REPO)) break;
    }
  }
  // ---- workflow ideas (bounded: ≤5 listings + ≤3 file reads per run)
  st.wf = st.wf || {}; st.wfChecked = st.wfChecked || {};
  const ideas = [];
  let reads = 0;
  const wfRepos = repoList.filter((r) => !EXTRA.includes(r)).sort((a, b) => String(st.wfChecked[a] || '').localeCompare(String(st.wfChecked[b] || ''))).slice(0, 5);
  for (const repo of wfRepos) {
    let files = [];
    try { files = (await L.gh(`/repos/${repo}/contents/.github/workflows`, { allow404: true })) || []; } catch (e) { if (e.name === 'StopDigest') throw e; }
    files = Array.isArray(files) ? files.filter((f) => /\.ya?ml$/.test(f.name)) : [];
    const known = new Set(st.wf[repo] || []);
    for (const f of files.filter((x) => !known.has(x.name))) {
      let notes = [];
      if (reads < 3) {
        reads++;
        try {
          const y = await L.fileAt(repo, 'HEAD', f.path) || '';
          const pick = [
            [/homey@[\d.]+\s+app\s+validate[^\n]*/, (m) => `validation Homey CLI épinglée (\`${m[0].trim().slice(0, 60)}\`)`],
            [/--ignore-scripts/, () => '`npm ci --ignore-scripts` (durcissement supply-chain)'],
            [/git diff --check/, () => '`git diff --check` (whitespace)'],
            [/npm (?:run )?test/, () => 'tests npm sur push/PR'],
            [/cron:\s*'([^']+)'/, (m) => `planifié (\`${m[1]}\`)`],
            [/dependabot|renovate/i, () => 'automatisation dépendances'],
            [/permissions:\s*\n\s*contents:\s*read/, () => 'permissions minimales (contents: read)'],
          ];
          for (const [re, fmt] of pick) { const m = re.exec(y); if (m) notes.push(fmt(m)); }
        } catch (e) { if (e.name === 'StopDigest') throw e; }
      }
      ideas.push(`- [${repo.split('/')[1]}/${L.esc(f.name)}](${f.html_url})${notes.length ? ' — ' + notes.join(' · ') : ''}`);
    }
    st.wf[repo] = files.map((f) => f.name).slice(0, 40);
    st.wfChecked[repo] = new Date().toISOString();
  }

  st.seen = [...seen].slice(-1500);
  st.scanned = (st.scanned || 0) + scanned;
  st.at = new Date().toISOString();

  if (!found.length && !ideas.length) {
    console.log(`Scanned ${scanned} item(s) — no new lead — silent.`);
    L.summary(`Inspiration ${OWNER}: ${scanned} item(s) scanned, no new lead.`);
    await L.saveState(issue, 'inspiration', st);
    return;
  }
  // Free lookups for the freshest unmapped mfr/pid leads (bounded).
  const toLook = [...new Set(found.flatMap((f) => f.fresh).filter((u) => /^(mfr|pid):/.test(u)))].slice(0, MAX_LOOKUPS);
  const looks = [];
  for (const u of toLook) looks.push(`- \`${u}\`\n  - ${(await lookup(u)).join('\n  - ')}`);
  const lines = found.slice(0, 40).map((f) => `- [${f.repo.split('/')[1]}#${f.it.number}](${f.it.html_url}) ${f.it.pull_request ? 'PR' : 'issue'} · ${f.it.state} · ${L.esc(f.it.title)}\n  - 🆕 ${f.fresh.map((u) => '`' + u + '`').join(', ')}\n  - ${f.leads}`);
  const s = stats();
  const md = `## 🧭 Inspiration ${OWNER} — ${found.length} élément(s) avec nouvelles pistes${ideas.length ? `, ${ideas.length} idée(s) de workflow` : ''}\n\n` +
    `${scanned} issue(s)/PR(s) (ouvertes + fermées, avec commentaires) analysées ce passage · ${st.scanned} au total · ${repoList.length} repo(s).\n\n` +
    `${lines.join('\n')}${found.length > 40 ? `\n- … +${found.length - 40}` : ''}\n\n` +
    (ideas.length ? `### 💡 Idées de workflows (suggestions, non adoptées)\n${ideas.join('\n')}\n\n` : '') +
    (looks.length ? `### Recoupement externe gratuit (caches · code search ${s.codeSearchUsed}/5${s.codeSearchBlocked ? ' — indisponible ce passage' : ''})\n${looks.join('\n')}\n\n` : '') +
    `${E.LEGEND}\n\n<sub>daily-digest.yml (inspiration) · lecture seule · run ${process.env.GITHUB_RUN_ID || 'local'}</sub>`;
  L.summary(md);
  await L.postComment(issue, md.length > 60000 ? md.slice(0, 60000) + '\n…(tronqué)' : md);
  await L.saveState(issue, 'inspiration', st);
});
