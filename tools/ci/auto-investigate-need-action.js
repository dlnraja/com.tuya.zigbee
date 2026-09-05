#!/usr/bin/env node
'use strict';

/**
 * auto-investigate-need-action.js (P2217)
 *
 * Investigate all need-action forum posts without waiting for user reply.
 * Cross-ref: registry, device-truth, compose, user history, diags, inbox, Blakadder.
 *
 * Usage:
 *   node tools/ci/auto-investigate-need-action.js
 *   node tools/ci/auto-investigate-need-action.js --dry-run
 */

const fs = require('fs');
const path = require('path');
const { runInvestigation } = require('../../lib/enrichment/NeedActionInvestigator');
const { loadManifest } = require('../../lib/enrichment/EnrichmentRegistry');

const dryRun = process.argv.includes('--dry-run');
const date = new Date().toISOString().slice(0, 10);

async function main() {
  const result = await runInvestigation({ dryRun });
  if (!result.ok) {
    console.error('[auto-investigate-need-action]', result.error);
    process.exit(1);
  }

  const reg = loadManifest();
  const reportDir = reg.reportDir(date);
  fs.mkdirSync(reportDir, { recursive: true });

  const jsonPath = path.join(reportDir, 'need-action-investigation.json');
  fs.writeFileSync(jsonPath, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    investigated: result.investigated,
    webFetches: result.webFetches,
    catalogPatches: result.catalogPatches,
    dryRun: result.dryRun,
    items: result.investigations,
  }, null, 2)}\n`);

  const lines = [
    `# Need-action auto-investigation — ${date}`,
    '',
    'Silent only — **SHADOW forum** (passive GET). Never POST / reply / PM / paste. Never invent pid.',
    '',
    `Investigated: **${result.investigated}** | Web hints: ${result.webFetches} | Catalog patches: ${result.catalogPatches}${result.pruned ? ` | Pruned bloat stubs: ${result.pruned}` : ''}`,
    '',
    '| Topic | Post | User | Action | Resolution | User action (no reply needed) |',
    '|-------|------|------|--------|------------|------------------------------|',
  ];

  for (const inv of result.investigations.slice(0, 60)) {
    const couple = inv.coupleInvestigations?.[0];
    const res = inv.autoResolution || couple?.resolved?.source || 'investigate';
    const action = (inv.userAction || '—').replace(/\|/g, '/').slice(0, 120);
    lines.push(`| T${inv.topicId} | #${inv.postNumber} | ${inv.username} | ${inv.action} | ${res} | ${action} |`);
  }

  lines.push('', '## Detail (top 12)', '');
  for (const inv of result.investigations
    .filter((i) => i.action !== 'user-update-repair')
    .slice(0, 12)) {
    lines.push(`### T${inv.topicId} #${inv.postNumber} @${inv.username}`, '');
    lines.push(`- Action: \`${inv.action}\` · Track: ${inv.dualApp}`);
    if (inv.fixRefs?.length) lines.push(`- Fix refs: ${inv.fixRefs.join(', ')}`);
    if (inv.userAction) lines.push(`- **User action (silent):** ${inv.userAction}`);
    for (const ci of inv.coupleInvestigations || []) {
      lines.push(`- Couple \`${ci.mfr}${ci.pid ? '+' + ci.pid : ''}\` verdict=${ci.verdict}${ci.tier ? ` tier=${ci.tier}` : ''}`);
      if (ci.resolved) {
        lines.push(`  - Resolved: **${ci.resolved.mfr}+${ci.resolved.pid}** → ${ci.resolved.driver} (${ci.resolved.source})`);
      } else if (ci.softHypothesis) {
        lines.push(`  - Soft: **${ci.softHypothesis.mfr}+${ci.softHypothesis.pid}** → ${ci.softHypothesis.driver || '?'} (${ci.softHypothesis.confidence}% — no catalog lock)`);
      } else if (ci.candidates?.length) {
        lines.push(`  - Candidates: ${ci.candidates.slice(0, 3).map((c) => `${c.pid}@${c.confidence}%`).join(', ')}`);
      }
    }
    if (inv.catalogTiles?.length) lines.push(`- Tiles: ${inv.catalogTiles.join('; ')}`);
    lines.push('');
  }

  lines.push('---', 'Regenerate: `npm run enrich:investigate`', '');
  const mdPath = path.join(reportDir, 'NEED_ACTION.md');
  fs.writeFileSync(mdPath, `${lines.join('\n')}\n`);

  console.log('[auto-investigate-need-action] investigated=', result.investigated);
  console.log('[auto-investigate-need-action] wrote', mdPath);
  console.log('[auto-investigate-need-action] wrote', jsonPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
