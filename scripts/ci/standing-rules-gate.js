#!/usr/bin/env node
'use strict';
// P3102: standing user rules as a deterministic gate (pure git + file reads, no network).
//  R-spacing   : two non-bot pushes to master less than 15 min apart -> warn (report-only, history cannot change)
//  R-changelog : a ci(...)/test(...) commit must not touch CHANGELOG.md on master -> fail
//  R-athom     : no workflow/script may contact Athom (mail, forum post, support form) -> fail
//  R-soak      : a stable-v5/bastien-home behaviour port must name a master commit at least SOAK_H (24) h old -> warn
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 64e6 }).trim();
const gitq = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 64e6, stdio: ['ignore', 'pipe', 'ignore'] }).trim(); // R-soak probes: unknown SHAs are expected
const BOT = /\[bot\]|github-actions|\[auto:|\[skip ci\]/i;
// Only write paths count: reading the forum/API is allowed; mailing Athom or posting to their forum is not.
const ATHOM = [/\b(to|cc|bcc)\s*[:=]\s*[^\n]{0,60}@athom\.com/i, /mailto:[^"'\s]*@athom\.com/i];
const FORUM_WRITE = /(method\s*:\s*['"](POST|PUT)['"]|-X\s*POST|\.post\(|--data\b)/;
const FORUM_HOST = /community\.homey\.app|athom\.com/;

function spacing(lines, minMin = 15) {
  const human = lines.map((l) => l.split('\t')).filter(([, , s]) => !BOT.test(s)).map(([h, t]) => ({ h, t: Number(t) }));
  const out = [];
  for (let i = 1; i < human.length; i++) if (human[i - 1].t - human[i].t < minMin * 60 && human[i - 1].t !== human[i].t) out.push(`${human[i - 1].h} ${(human[i - 1].t - human[i].t) / 60 | 0} min after ${human[i].h}`);
  return out;
}
function changelog(commits) { return commits.filter((c) => /^(ci|test)(\(|:)/.test(c.subject) && c.files.includes('CHANGELOG.md')).map((c) => c.h); }
function athom(files) {
  const out = [];
  for (const f of files) { let s; try { s = fs.readFileSync(f, 'utf8'); } catch { continue; } if (/standing-rules-gate/.test(f)) continue; ATHOM.forEach((re) => { if (re.test(s)) out.push(`${f}: ${re}`); });
    if (FORUM_HOST.test(s) && FORUM_WRITE.test(s) && !/apps-api\.athom\.com|api\.athom\.com/.test(s)) out.push(`${f}: write call next to an Athom/forum host`); }
  return out;
}
// R-soak (P3109): on stable-v5 / bastien-home, a behaviour port (feat/fix/perf/refactor, subject says "port")
// must come at least SOAK_H hours after the master commit(s) it names (P-number or SHA). CI-only ports are exempt
// (ci/test/chore/docs go to all 3 branches at once). Warn only: a human may override with "soak-override" in the subject.
const SOAK_H = Number(process.env.SOAK_H || 24);
const PORT_BRANCHES = ['stable-v5', 'bastien-home'];
function soakRefs(subject) {
  if (!/\bport(s|ed)?\b/i.test(subject) || /^(ci|test|chore|docs|build|style)(\(|:|!)/i.test(subject) || /^\w+\((ci|test|build)\b/i.test(subject) || /soak-override/i.test(subject)) return [];
  const ps = (subject.match(/\bP\d{3,5}[a-z]?\b/g) || []).map((p) => ({ kind: 'p', ref: p }));
  const shas = (subject.match(/\b[0-9a-f]{8,40}\b/g) || []).map((s) => ({ kind: 'sha', ref: s }));
  return [...ps, ...shas];
}
// commits: [{h, t, subject}], masterTime(ref) -> earliest master commit epoch seconds, or null when unknown
function soak(commits, masterTime, soakH = SOAK_H) {
  const out = [];
  for (const c of commits) for (const r of soakRefs(c.subject)) {
    const mt = masterTime(r);
    if (mt == null) continue;
    const age = (c.t - mt) / 3600;
    if (age < soakH) out.push(`${c.h} ports ${r.ref} ${age.toFixed(1)} h after master (< ${soakH} h)`);
  }
  return out;
}
module.exports = { spacing, changelog, athom, ATHOM, soak, soakRefs, PORT_BRANCHES };

if (require.main === module) {
  const range = process.env.RULES_RANGE || 'HEAD~30..HEAD';
  let fail = 0;
  let log = '';
  try { log = git('log', '--first-parent', '--format=%h\t%ct\t%an %s', range); } catch { /* shallow */ }
  const sp = spacing(log ? log.split('\n') : []);
  sp.forEach((x) => console.log(`::warning::push spacing < 15 min: ${x}`));
  const commits = (log ? log.split('\n') : []).map((l) => { const [h] = l.split('\t'); const subject = git('log', '-1', '--format=%s', h); let files = []; try { files = git('show', '--name-only', '--format=', h).split('\n'); } catch { /* */ } return { h, subject, files }; });
  if (process.env.GITHUB_REF_NAME === 'master' || process.env.RULES_BRANCH === 'master') { const cl = changelog(commits); if (cl.length) { console.log(`::error::ci/test commits touching CHANGELOG.md on master: ${cl.join(', ')}`); fail = 1; } }
  const files = git('ls-files', '.github/workflows', 'scripts', 'tools').split('\n').filter((f) => /\.(ya?ml|js|cjs|mjs|sh|py)$/.test(f));
  const at = athom(files);
  at.forEach((x) => console.log(`::error::Athom contact path forbidden: ${x}`));
  if (at.length) fail = 1;
  const branch = process.env.GITHUB_REF_NAME || process.env.RULES_BRANCH || '';
  let so = [];
  if (PORT_BRANCHES.includes(branch)) {
    const master = (() => { try { return git('rev-parse', '--verify', '-q', 'origin/master'); } catch { return ''; } })();
    if (!master) console.log('::notice::R-soak skipped: origin/master not fetched');
    else {
      const masterTime = (r) => { try {
        if (r.kind === 'sha') { gitq('merge-base', '--is-ancestor', r.ref, 'origin/master'); return Number(gitq('log', '-1', '--format=%ct', r.ref)); }
        const ts = gitq('log', 'origin/master', '--format=%ct', '-E', `--grep=${r.ref}([^0-9a-z]|$)`).split('\n').filter(Boolean);
        return ts.length ? Number(ts[ts.length - 1]) : null;
      } catch { return null; } };
      const pc = (log ? log.split('\n') : []).map((l) => { const [h, t] = l.split('\t'); return { h, t: Number(t), subject: git('log', '-1', '--format=%s', h) }; });
      so = soak(pc, masterTime);
      so.forEach((x) => console.log(`::warning::R-soak: ${x}`));
    }
  }
  console.log(`standing-rules-gate: spacing-warn=${sp.length} soak-warn=${so.length} athom=${at.length} ${fail ? 'FAIL' : 'PASS'}`);
  process.exit(fail);
}
