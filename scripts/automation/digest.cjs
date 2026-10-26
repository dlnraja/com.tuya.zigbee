#!/usr/bin/env node
'use strict';
/**
 * P3048 (6)(7) — deterministic digest, no AI, no mail, no post: writes docs/progress/DIGEST.md.
 * Sources (all local or GITHUB_TOKEN): versions of the 3 branches (git show origin/<b>:package.json,
 * API fallback), last known Athom outcome per app (docs/knowledge/athom-publish-outcomes.jsonl +
 * data/status/athom-publish-gate-*.json), journal (72 h failures, 7-day trends: flaky = recovered by a
 * plain re-run, repeated signatures), reply candidates, watchdog findings, couple combinations vs caps.
 *
 *   node scripts/automation/digest.cjs [--out=docs/progress/DIGEST.md] [--dry]
 */
const fs = require('fs');
const path = require('path');
const RW = require('../lib/report-writer');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const BRANCHES = [['master', 'com.dlnraja.tuya.zigbee'], ['stable-v5', 'com.dlnraja.tuya.zigbee.stable'], ['bastien-home', 'com.dlnraja.tuya.zigbee.bastien']];
const CAPS = { total: Number(process.env.COMBO_CAP_TOTAL || 17000), perDriver: Number(process.env.COMBO_CAP_DRIVER || 1008) };

const readJson = (f, d = null) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')); } catch { return d; } };
const readJsonl = (f) => { try { return fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); } catch { return []; } };

function branchVersion(branch) {
  const r = spawnSync('git', ['show', `origin/${branch}:package.json`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 << 20 });
  if (r.status === 0) { try { return JSON.parse(r.stdout).version; } catch { /* fall through */ } }
  return null;
}

/** combos(driversDir) -> { total, maxDriver: { id, n }, over: [{ id, n }] } from driver.compose.json (pure). */
function combos(dir = path.join(ROOT, 'drivers'), caps = CAPS) {
  let total = 0; let max = { id: null, n: 0 }; const over = [];
  if (!fs.existsSync(dir)) return { total, maxDriver: max, over };
  for (const id of fs.readdirSync(dir)) {
    const f = path.join(dir, id, 'driver.compose.json');
    if (!fs.existsSync(f)) continue;
    let z; try { z = (JSON.parse(fs.readFileSync(f, 'utf8')).zigbee) || {}; } catch { continue; }
    // Same cartesian rule as platform-budget-gate comboCount (unique non-empty strings, case kept).
    const uniq = (v) => new Set((Array.isArray(v) ? v : v == null ? [] : [v]).filter((x) => typeof x === 'string' && x.trim())).size;
    const n = uniq(z.manufacturerName) * uniq(z.productId);
    total += n;
    if (n > max.n) max = { id, n };
    if (n > caps.perDriver) over.push({ id, n });
  }
  return { total, maxDriver: max, over: over.sort((a, b) => b.n - a.n) };
}

/** trends(entries) -> per-workflow counts over 7 days (pure, tested). */
function trends(entries, now = Date.now()) {
  const wk = entries.filter((e) => now - Date.parse(e.at) <= 7 * 86400000);
  const per = {};
  for (const e of wk) {
    if (e.workflow !== 'ci-collect' || !e.data) continue;
    const k = e.data.name || e.data.wf || '?';
    per[k] = per[k] || { fail: 0, transient: 0, recovered: 0, sigs: {} };
    if (per[k][e.status] !== undefined) per[k][e.status]++;
    if (e.data.sig && e.status === 'fail') per[k].sigs[e.data.sig] = (per[k].sigs[e.data.sig] || 0) + 1;
  }
  const flaky = Object.entries(per).filter(([, v]) => v.recovered > 0).map(([k, v]) => ({ workflow: k, recovered: v.recovered }));
  const repeated = Object.entries(per).flatMap(([k, v]) => Object.entries(v.sigs).filter(([, n]) => n >= 2).map(([sig, n]) => ({ workflow: k, sig, n })));
  return { per, flaky, repeated };
}

function liveCaps() {
  try {
    const y = fs.readFileSync(path.join(ROOT, '.github/workflows/auto-publish-on-push.yml'), 'utf8');
    const g = (k) => { const m = new RegExp(`${k}:\\s*"?(\\d+)`).exec(y); return m ? Number(m[1]) : null; };
    return { total: g('HOMEY_ZIGBEE_MAX_TOTAL_COMBOS'), driver: g('HOMEY_ZIGBEE_MAX_DRIVER_COMBOS'), topup: g('HOMEY_ZIGBEE_TOPUP_MAX_TOTAL') };
  } catch { return null; }
}

function lastOutcome(app, key) {
  const rows = readJsonl('docs/knowledge/athom-publish-outcomes.jsonl').filter((r) => r.app_id === app || r.app === key || r.app === app);
  return rows[rows.length - 1] || null;
}

function render(d) {
  const L = [];
  L.push('# Digest automatique (P3048)', '', `_Généré le ${d.generatedParis} (heure de Paris) par \`scripts/automation/digest.cjs\`, sans IA, sans envoi : ni mail, ni post, ni commentaire._`, '');
  L.push('## Versions', '', '| Branche | App | Version | Dernier statut Athom connu | Gate P3036 |', '|---|---|---|---|---|');
  for (const b of d.branches) L.push(`| ${b.branch} | ${b.app} | ${b.version || '?'} | ${b.outcome ? `${b.outcome.version || '?'} #${b.outcome.build || '?'} ${b.outcome.state || '?'}` : 'inconnu'} | ${b.gate ? `${b.gate.go ? 'go' : 'hold'} (${String(b.gate.reason || '').slice(0, 80)})` : 'n/a'} |`);
  L.push('', '## Échecs CI (72 h)', '');
  if (!d.failures.length) L.push('Aucun échec journalisé.');
  for (const f of d.failures.slice(0, 15)) L.push(`- ${f.at.slice(0, 16).replace('T', ' ')} UTC · ${f.status} · ${f.summary}`);
  L.push('', '## Santé (7 jours)', '');
  const pk = d.packageCombos;
  if (pk && Number.isFinite(pk.total)) L.push(`- Combinaisons du paquet publié (${pk.source || 'mesure'}) : **${pk.total}** / ${CAPS.total} (marge ${CAPS.total - pk.total})${Number.isFinite(pk.maxDriver) ? ` ; plus gros driver ${pk.maxDriverId || '?'} = ${pk.maxDriver} / ${CAPS.perDriver} (marge ${CAPS.perDriver - pk.maxDriver})` : ''}`);
  else L.push(`- Combinaisons du paquet publié : pas de mesure récente (\`data/status/package-combos.json\` absent ; écrit par une mesure prepare-publish). Repères : ${CAPS.total} au total, ${CAPS.perDriver} par driver.`);
  L.push(`- Combinaisons brutes des sources (avant élagage prepare-publish, indicatif) : ${d.combos.total} ; plus gros driver ${d.combos.maxDriver.id || '?'} = ${d.combos.maxDriver.n} ; ${d.combos.over.length} driver(s) au-dessus de ${CAPS.perDriver} avant élagage.`);
  if (d.liveCaps) L.push(`- Plafonds actifs dans auto-publish-on-push.yml : total ${d.liveCaps.total || '?'}, par driver ${d.liveCaps.driver || '?'}, top-up ${d.liveCaps.topup || '?'}.`);
  L.push(`- Workflows rattrapés par une simple relance (instables) : ${d.trends.flaky.map((x) => `${x.workflow} ×${x.recovered}`).join(', ') || 'aucun'}`);
  L.push(`- Échecs répétés (même signature ≥ 2) : ${d.trends.repeated.map((x) => `${x.workflow} ${x.sig} ×${x.n}`).join(', ') || 'aucun'}`);
  L.push(`- Watchdog : ${d.watchdog ? `${d.watchdog.checked} workflows planifiés, ${(d.watchdog.findings || []).length} alerte(s)` : 'pas encore tourné'}`);
  for (const f of ((d.watchdog || {}).findings || []).slice(0, 10)) L.push(`  - ${f.kind} \`${f.wf}\` : ${f.detail}`);
  L.push('', '## Candidats de réponse (rien n\'est publié automatiquement)', '');
  const rc = (d.replies || {}).candidates || [];
  if (!rc.length) L.push('Aucun.');
  for (const c of rc) L.push(`- ${RW.linkRef({ id: c.issue, url: c.url, author: c.author, about: c.about || RW.topicOf(c.title || '', 'fr') }, 'fr')} — commit ${c.commit}, CI ${c.ci}`); // P3069: no copied title
  L.push('', '## Journal', '', `${d.journalCount} ligne(s) sur 72 h dans \`data/progress/automation-journal.jsonl\`.`, '');
  return `${L.join('\n')}\n`;
}

function build({ now = new Date() } = {}) {
  const journal = require('./journal.cjs');
  const recent = journal.readSince(72);
  const week = journal.readSince(24 * 7);
  return {
    generatedParis: now.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }),
    branches: BRANCHES.map(([branch, app]) => ({ branch, app, version: branchVersion(branch), outcome: lastOutcome(app, branch === 'master' ? 'master' : branch === 'stable-v5' ? 'stable' : 'bastien'), gate: readJson(`data/status/athom-publish-gate-${app}.json`) })),
    failures: recent.filter((e) => ['fail', 'transient'].includes(e.status)).reverse(),
    trends: trends(week, now.getTime()),
    combos: combos(),
    packageCombos: readJson('data/status/package-combos.json'),
    liveCaps: liveCaps(),
    watchdog: readJson('data/status/workflow-watchdog.json'),
    replies: readJson('data/progress/reply-candidates.json'),
    journalCount: recent.length,
  };
}

/** Pull the published-payload measure from the newest platform-budget-report artifact of master (read-only). */
async function fetchPackageCombos(out = path.join(ROOT, 'data', 'status', 'package-combos.json')) {
  const { latestArtifactZip } = require('./gh.cjs');
  const got = await latestArtifactZip('platform-budget-report', 'master').catch(() => null);
  if (!got) return null;
  const tmp = path.join(require('os').tmpdir(), `pbr-${process.pid}.zip`);
  fs.writeFileSync(tmp, got.zip);
  const r = spawnSync('unzip', ['-p', tmp, 'platform-budget-report.json'], { encoding: 'utf8', maxBuffer: 8 << 20 });
  fs.rmSync(tmp, { force: true });
  let rep; try { rep = JSON.parse(r.stdout); } catch { return null; }
  const info = rep.info || {};
  const row = (rep.rows || []).find((x) => x.id === 'zigbee_combos') || {};
  const total = Number.isFinite(info.zigbeeCombos) ? info.zigbeeCombos : row.value;
  if (!Number.isFinite(total)) return null;
  const res = { total, maxDriver: info.maxDriverCombos, maxDriverId: info.maxDriverId, at: rep.at, source: `platform-budget run ${(got.artifact.workflow_run || {}).id || '?'} du ${String(rep.at || '').slice(0, 10)}` };
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(res, null, 2)}\n`);
  return res;
}

module.exports = { fetchPackageCombos, combos, trends, render, build, liveCaps, CAPS };

if (require.main === module) {
  (async () => {
    const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
    const out = path.join(ROOT, arg('out', 'docs/progress/DIGEST.md'));
    if (process.argv.includes('--fetch-package-combos')) await fetchPackageCombos().catch(() => null);
    const md = render(build());
    if (!process.argv.includes('--dry')) { fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, md); }
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
    console.log(md);
  })().catch((e) => { console.log(`::warning::digest: ${e.message}`); process.exit(0); });
}
