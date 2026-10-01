'use strict';
/**
 * scripts/digest/triage.js — auto-triage of a NEW issue (issues: opened), deterministic, no AI.
 *  1. Extract identifiers (manufacturerName, productId, DP, clusters, interview) from title+body.
 *  2. Look the couple up in the repo (driver.compose.json index) and the offline caches
 *     (external cross-reference caches committed in the repo; no network lookups).
 *  3. Add labels — only labels that already exist in the repo — and post ONE
 *     "what we already know" comment (marker-deduplicated, never twice).
 * Skips: bot authors, the tracking issue, issues labelled bot-digest, other repos.
 * Pattern borrowed from issue-template-driven triage (bug / feature / new-device templates).
 * Env: GITHUB_EVENT_PATH · GITHUB_TOKEN · TRIAGE_DRY (1 = print only)
 */
const fs = require('fs');
const path = require('path');
const L = require('./lib');
const E = require('./enrich');
const Q = require('./quirks');

const MARK = '<!-- auto-triage:v1 -->';
const DRY = process.env.TRIAGE_DRY === '1' || L.DRY;
const ev = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH || process.argv[2], 'utf8'));

function offlineCaches(root) {
  const out = { ext: {} };
  try {
    const z = JSON.parse(fs.readFileSync(path.join(root, 'data', 'z2m_herdsman_cache.json'), 'utf8'));
    for (const d of z.devices || []) for (const m of d.mfrs || []) (out.ext[m.toLowerCase()] = out.ext[m.toLowerCase()] || []).push({ desc: d.description, pids: d.modelIds || [], dps: (d.dps || []).slice(0, 8) });
  } catch { /* cache absent */ }
  try {
    const b = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'sync', 'data', 'blakadder.json'), 'utf8'));
    for (const fp of b.fingerprints || []) if (fp.mfr) (out.ext[fp.mfr.toLowerCase()] = out.ext[fp.mfr.toLowerCase()] || []).push({ desc: `${fp.vendor || ''} ${fp.category || ''}`.trim(), pids: fp.productId ? [fp.productId] : [] });
  } catch { /* cache absent */ }
  return out;
}

L.run(async () => {
  const it = ev.issue;
  if (!it || it.pull_request) return console.log('not an issue');
  if (/\[bot\]$/.test(it.user.login) || (it.labels || []).some((l) => /bot-digest/.test(l.name))) return console.log('bot / tracking issue — skip');
  const repo = (ev.repository && ev.repository.full_name) || L.REPO;
  const text = `${it.title}\n${it.body || ''}`;
  const ex = E.extract(text);
  const idx = E.buildIndex(process.cwd());
  const chk = E.check(ex, idx);
  const caches = offlineCaches(process.cwd());
  const quirks = Q.classify(text);

  // ---- labels (only existing ones)
  let existing = new Set();
  try { existing = new Set((await L.gh(`/repos/${repo}/labels?per_page=100`)).map((l) => l.name)); } catch (e) { L.log(e.message); }
  const want = new Set(['auto-triage']);
  if (/bug|crash|error|not work|doesn.t work|broken|fails?/i.test(it.title)) want.add('bug');
  if (/device request|new device|support for|add (?:support|device)|request/i.test(it.title)) want.add('device_request');
  const known = ex.mfr.filter((m) => idx.mfr[m]);
  const unknown = ex.mfr.filter((m) => !idx.mfr[m]);
  if (known.length) want.add('fingerprint-supported');
  if (unknown.length) want.add('fingerprint-missing');
  if (!ex.mfr.length && !ex.pid.length) want.add('diagnostics-needed');
  if (quirks.includes('disconnect')) want.add('connectivity_issue');
  if (quirks.includes('reboot') || /crash/i.test(text)) want.add('crash');
  const labels = [...want].filter((l) => existing.has(l));

  // ---- "what we already know"
  const lines = [];
  for (const m of ex.mfr.slice(0, 5)) {
    const drv = idx.mfr[m] || [];
    const ext = (caches.ext[m] || [])[0];
    const pidHit = ex.pid.length ? ex.pid.filter((p) => (ext && ext.pids.map((x) => String(x).toUpperCase()).includes(p))) : [];
    lines.push(`- \`${m}\`${ex.pid.length === 1 ? ` + \`${ex.pid[0]}\`` : ''}: ${drv.length ? `already in driver(s) **${drv.slice(0, 4).join(', ')}**` : 'not in any driver yet'}` +
      (ext ? ` · external cross-reference: known as _${L.esc(String(ext.desc || '').slice(0, 60))}_${pidHit.length ? ` (${pidHit.join('/')})` : ''}${ext.dps && ext.dps.length ? ` · reference DPs ${ext.dps.map((d) => `${d.id}:${L.esc(d.name)}`).join(', ')}` : ''}` : ' · no external cross-reference found'));
  }
  if (!ex.mfr.length && ex.pid.length) lines.push(`- productId ${ex.pid.map((p) => `\`${p}\``).join(', ')} without a manufacturerName — the exact pair is needed to match a driver.`);
  if (ex.dp.length) lines.push(`- DPs mentioned: ${ex.dp.join(', ')}${chk && E.unmappedLeads(chk).some((u) => u.startsWith('dp:')) ? ' (some are not handled yet in the matching driver)' : ''}.`);
  if (quirks.length) lines.push(`- Symptoms detected: ${quirks.join(', ')}.`);
  const ask = [];
  if (!ex.mfr.length) ask.push('the **manufacturerName** and **modelId/productId** (Homey Developer Tools → Zigbee → device interview)');
  if (!ex.interview) ask.push('the full **device interview** if possible');
  if (/bug|crash|error/i.test(text) && !ex.uuid.length) ask.push('a **diagnostic report ID** sent from the app settings right after the problem');
  const body = `${MARK}\nThanks for the report! Here is what is already known automatically (no human review yet):\n\n${lines.length ? lines.join('\n') : '- No device identifiers found in the issue.'}\n` +
    (ask.length ? `\nTo go further, please add ${ask.join(', ')}.\n` : '') +
    `\n<sub>Automatic triage — labels: ${labels.map((l) => `\`${l}\``).join(', ') || 'none'}. A maintainer will follow up.</sub>`;
  console.log(body);
  if (DRY) return;
  // dedupe: never comment twice
  const cs = await L.gh(`/repos/${repo}/issues/${it.number}/comments?per_page=100`);
  if (cs.some((c) => (c.body || '').includes(MARK))) return console.log('already triaged');
  if (labels.length) await L.gh(`/repos/${repo}/issues/${it.number}/labels`, { method: 'POST', body: { labels } });
  await L.gh(`/repos/${repo}/issues/${it.number}/comments`, { method: 'POST', body: { body } });
});
