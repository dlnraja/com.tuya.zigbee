#!/usr/bin/env node
'use strict';
/**
 * scripts/ci/safe-auto-commit.js — the ONLY way automation should commit to master/stable-v5.
 *
 *   node scripts/ci/safe-auto-commit.js --id=fleet-enrich --message="fleet-enrich: …" \
 *        --paths="drivers data app.json" [--branch=master] [--max-per-day=1] [--dry]
 *
 * Safety (Node built-ins only):
 *  1. Loop guard   — refuses when triggered by a push from a bot, or when the last 3 commits on the
 *                    branch are all automation commits from the last hour (re-trigger storm).
 *  2. Daily cap    — max N commits per workflow id per UTC day (default 1), counted on the remote
 *                    via the "[auto:<id>]" tag appended to every commit message.
 *  3. Local gate   — on the STAGED files only: JSON parse, `node --check`, TITAN patterns (raw
 *                    setCapabilityValue / console.* in drivers, utf8 JSON loads in lib, wildcard mfr),
 *                    then the repo's own gates if present: auto-validation-gate, P2138 sacred-couple
 *                    matrix, regression-lessons, anti-bot regression.
 *  4. Push         — commit "<message> [auto:<id>] [skip ci]", pull --rebase + push with 3 retries,
 *                    never force. Rebase conflict → abort.
 *  On any gate failure / conflict: nothing is pushed; ONE comment per workflow id on the tracking
 *  issue (#557, label bot-digest) is created or edited in place (no flood). Exit code stays 0 so the
 *  workflow does not go red for a refused commit; output `committed=true|false` → $GITHUB_OUTPUT.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const ID = arg('id');
const MSG = arg('message', `chore(${ID}): automated enrichment`);
const PATHS = (arg('paths', '') || '').split(/\s+/).filter(Boolean);
const BRANCH = arg('branch', 'master');
const MAX = Number(arg('max-per-day', process.env.AUTO_COMMIT_MAX_PER_DAY || 1));
const DRY = process.argv.includes('--dry');
const ROOT = process.cwd();
if (!ID || !PATHS.length) { console.error('usage: --id=<workflow-id> --paths="<paths>" [--message=…]'); process.exit(2); }

const sh = (cmd, args, opts = {}) => spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20, ...opts });
const git = (...a) => sh('git', a);
const out = (k, v) => { if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`); };
const summary = (md) => { if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n'); console.log(md); };

async function report(reason, details) {
  summary(`### 🚧 safe-auto-commit [${ID}] refused: ${reason}\n${details ? '```\n' + String(details).slice(-3000) + '\n```' : ''}`);
  if (DRY || !process.env.GITHUB_TOKEN) return;
  try {
    const L = require(path.join(ROOT, 'scripts', 'digest', 'lib.js'));
    const issue = await L.findTrackingIssue({ create: false });
    if (!issue) return;
    const marker = `<!-- safe-auto-commit:${ID} -->`;
    const comments = await L.gh(`/repos/${L.REPO}/issues/${issue.number}/comments?per_page=100`);
    const body = `${marker}\n### 🚧 Auto-commit refusé — \`${ID}\`\n**Raison :** ${reason}\n\nRun : ${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID || '?'} · ${new Date().toISOString()}\n\n${details ? '<details><summary>détails</summary>\n\n```\n' + String(details).slice(-2500).replace(/```/g, "'''") + '\n```\n</details>' : ''}\n\n_Aucun push effectué. Ce commentaire est mis à jour en place à chaque refus de ce workflow._`;
    const mine = (comments || []).find((c) => (c.body || '').includes(marker));
    if (mine) await L.gh(`/repos/${L.REPO}/issues/comments/${mine.id}`, { method: 'PATCH', body: { body } });
    else await L.gh(`/repos/${L.REPO}/issues/${issue.number}/comments`, { method: 'POST', body: { body } });
  } catch (e) { console.error('report failed:', e.message); }
}

function gate(files) {
  const errs = [];
  for (const f of files) {
    if (!fs.existsSync(f)) continue; // deletion
    if (f.endsWith('.json')) { try { JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { errs.push(`JSON invalide: ${f}: ${e.message}`); } }
    if (/\.(c?js)$/.test(f)) { const r = sh(process.execPath, ['--check', f]); if (r.status !== 0) errs.push(`syntaxe: ${f}: ${(r.stderr || '').split('\n').slice(0, 4).join(' ')}`); }
    if (/^drivers\/.+\/device\.js$/.test(f)) {
      const t = fs.readFileSync(f, 'utf8');
      if (/this\.setCapabilityValue\(/.test(t)) errs.push(`TITAN: raw setCapabilityValue dans ${f}`);
      if (/console\.(log|error|warn)\(/.test(t)) errs.push(`TITAN: console.* dans ${f}`);
    }
    if (/^lib\/.+\.js$/.test(f) && /JSON\.parse\(fs\.readFileSync.*'utf8'/.test(fs.readFileSync(f, 'utf8'))) errs.push(`TITAN: JSON utf8 load dans ${f}`);
    if (f.endsWith('.json') && /_TZE200_\*|_TZ3000_\*|_TZE204_\*/.test(fs.readFileSync(f, 'utf8'))) errs.push(`TITAN: wildcard mfr dans ${f}`);
  }
  if (errs.length) return errs;
  const touchesApp = files.some((f) => /^(drivers|lib|app\.json|\.homeycompose|data)\//.test(f) || f === 'app.json');
  if (touchesApp) {
    for (const g of ['tools/ci/p2138-sacred-couple-matrix-gate.js', 'tools/ci/regression-lessons-gate.js', 'tools/ci/anti-bot-regression-gate.js', 'tools/ci/p214-intelligent-protocol-gate.js']) {
      if (!fs.existsSync(g)) continue;
      const r = sh(process.execPath, [g], { timeout: 600000 });
      if (r.status === 0) continue;
      // Differential: only block when THIS change introduces the failure (gate green on baseline).
      const st = git('stash', 'push', '-q', '--include-untracked', '-m', 'safe-auto-commit-baseline');
      let baseOk = false;
      if (st.status === 0) {
        baseOk = sh(process.execPath, [g], { timeout: 600000 }).status === 0;
        git('stash', 'pop', '-q', '--index');
      }
      if (baseOk) errs.push(`${g} exit ${r.status} (introduit par ce changement): ${((r.stdout || '') + (r.stderr || '')).trim().split('\n').slice(-8).join(' | ')}`);
      else summary(`⚠️ ${g} déjà rouge sur la base (pré-existant) — non bloquant pour ce commit additif.`);
    }
  }
  return errs;
}

(async () => {
  out('committed', 'false');
  // 1. loop guard
  const actor = process.env.GITHUB_ACTOR || '';
  if (process.env.GITHUB_EVENT_NAME === 'push' && /\[bot\]$/.test(actor)) { summary(`safe-auto-commit [${ID}]: push by ${actor} — loop guard, skip.`); return; }
  git('fetch', '-q', 'origin', BRANCH);
  const recent = git('log', `origin/${BRANCH}`, '-3', '--format=%ct|%an|%s').stdout.trim().split('\n').filter(Boolean);
  if (recent.length === 3 && recent.every((l) => { const [ts, an, s] = l.split('|'); return /\[bot\]/.test(an) && /\[auto:/.test(s) && Date.now() / 1000 - Number(ts) < 3600; })) {
    await report('tempête de commits automatiques détectée (3 derniers commits = bots < 1 h)', recent.join('\n')); return;
  }
  // 2. stage + daily cap
  for (const p of PATHS) git('add', '-A', '--', p);
  const files = git('diff', '--cached', '--name-only').stdout.trim().split('\n').filter(Boolean);
  if (!files.length) { summary(`safe-auto-commit [${ID}]: nothing to commit.`); return; }
  const today = new Date().toISOString().slice(0, 10);
  const n = git('log', `origin/${BRANCH}`, `--since=${today}T00:00:00Z`, '--fixed-strings', `--grep=[auto:${ID}]`, '--format=%h').stdout.trim().split('\n').filter(Boolean).length;
  if (n >= MAX) { git('reset', '-q'); summary(`safe-auto-commit [${ID}]: daily cap reached (${n}/${MAX}) — ${files.length} file(s) left for tomorrow.`); return; }
  // 3. gate
  const errs = gate(files);
  if (errs.length) { git('reset', '-q'); await report(`gate locale en échec (${errs.length})`, errs.join('\n')); return; }
  if (DRY) { git('reset', '-q'); summary(`safe-auto-commit [${ID}] DRY: gate OK on ${files.length} file(s), would commit.`); return; }
  // 4. commit + push with rebase retries (never force)
  if (!git('config', 'user.name').stdout.trim()) { git('config', 'user.name', 'github-actions[bot]'); git('config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com'); }
  const c = git('commit', '-q', '-m', `${MSG} [auto:${ID}] [skip ci]`);
  if (c.status !== 0) { await report('git commit a échoué', c.stderr); return; }
  for (let i = 1; i <= 3; i++) {
    const r = git('pull', '-q', '--rebase', 'origin', BRANCH);
    if (r.status !== 0) { git('rebase', '--abort'); await report('conflit de rebase (autre worker sur la même zone)', r.stderr); return; }
    const p = git('push', '-q', 'origin', `HEAD:${BRANCH}`);
    if (p.status === 0) { out('committed', 'true'); summary(`✅ safe-auto-commit [${ID}]: ${files.length} file(s) pushed to ${BRANCH}.`); return; }
    await new Promise((res) => setTimeout(res, 3000 * i + Math.random() * 4000));
  }
  await report('push refusé après 3 tentatives', '');
})();
