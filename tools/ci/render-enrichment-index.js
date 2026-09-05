#!/usr/bin/env node
'use strict';

/**
 * render-enrichment-index.js
 *
 * Generate profile index pages from enrichment layers + last processor state.
 *
 * Usage:
 *   node tools/ci/render-enrichment-index.js
 *   node tools/ci/render-enrichment-index.js --summary-only
 */

const fs = require('fs');
const path = require('path');
const {
  loadManifest,
  getLayer,
  loadJson,
  resolve,
} = require('../../lib/enrichment/EnrichmentRegistry');

const SUMMARY_ONLY = process.argv.includes('--summary-only');
const date = new Date().toISOString().slice(0, 10);

function safeName(s) {
  return String(s || '').replace(/[^a-zA-Z0-9_-]/g, '_');
}

function renderUserPage(username, profile, fixCatalog) {
  const lines = [
    `# User profile — ${username}`,
    '',
    profile._autoStub ? '> Auto stub — enrich manually from diags/interviews\n' : '> Curated fleet profile\n',
    `Forum topic: **T${profile.forumTopic || 140352}** · Posts: ${(profile.posts || []).join(', ') || '—'}`,
    '',
  ];

  if (profile.devices?.length) {
    lines.push('## Devices', '', '| Tile | Driver | Couple | User action |', '|---|---|---|---|');
    for (const d of profile.devices) {
      lines.push(`| ${d.tile || '—'} | ${d.driver || '—'} | ${d.couple || '**ABSENT**'} | ${d.userAction || '—'} |`);
    }
    lines.push('');
  }

  if (profile.forbiddenInvent?.length) {
    lines.push('## Do not invent', '');
    for (const f of profile.forbiddenInvent) lines.push(`- ${f}`);
    lines.push('');
  }

  lines.push('---', `Regenerate: \`npm run enrich:sync\` + \`npm run enrich:profiles\``, '');
  return `${lines.join('\n')}\n`;
}

function renderCouplePage(key, couple) {
  const lines = [
    `# Couple profile — \`${key.replace('|', '+')}\``,
    '',
    couple._autoStub ? '> Auto stub — needs DP layout enrichment\n' : '',
    `- Driver: **${couple.driver || '—'}**`,
    `- Case: ${couple.caseId || '—'}`,
    `- Sources: ${(couple.sources || []).slice(0, 6).join('; ') || '—'}`,
    '',
  ];

  if (couple.dps && Object.keys(couple.dps).length) {
    lines.push('## DPs', '', '| DP | Name | Type | Direction | Capability |', '|---:|---|---|---|');
    for (const [id, row] of Object.entries(couple.dps)) {
      lines.push(`| ${id} | ${row.name || '—'} | ${row.tuyaType ?? '—'} | ${row.direction || '—'} | ${row.capability || row.internal || '—'} |`);
    }
    lines.push('');
  } else {
    lines.push('_No DP rows yet — run `npm run audit:dp-couples` after interview._', '');
  }

  lines.push('---', 'See `docs/guides/DP_INTERPRETATION.md`', '');
  return `${lines.join('\n')}\n`;
}

function main() {
  const reg = loadManifest();
  const userCatalog = getLayer('userImpact') || { users: {}, fixCatalog: {} };
  const dpKnowledge = getLayer('dpCouples') || { couples: {} };
  const processor = loadJson(reg.statePath('forumProcessor'));
  const parse = loadJson(reg.statePath('forumParse'));

  const profileRoot = reg.profilePagesDir();
  const usersDir = path.join(profileRoot, 'users');
  const couplesDir = path.join(profileRoot, 'couples');
  fs.mkdirSync(usersDir, { recursive: true });
  fs.mkdirSync(couplesDir, { recursive: true });

  const userIndex = [];
  for (const [username, profile] of Object.entries(userCatalog.users || {})) {
    const fn = `${safeName(username)}.md`;
    if (!SUMMARY_ONLY) {
      fs.writeFileSync(path.join(usersDir, fn), renderUserPage(username, profile, userCatalog.fixCatalog));
    }
    userIndex.push({
      username,
      posts: (profile.posts || []).length,
      devices: (profile.devices || []).length,
      autoStub: !!profile._autoStub,
      file: `users/${fn}`,
    });
  }

  const coupleIndex = [];
  for (const [key, couple] of Object.entries(dpKnowledge.couples || {})) {
    const fn = `${safeName(key.replace('|', '_'))}.md`;
    if (!SUMMARY_ONLY) {
      fs.writeFileSync(path.join(couplesDir, fn), renderCouplePage(key, couple));
    }
    coupleIndex.push({
      couple: key,
      driver: couple.driver,
      autoStub: !!couple._autoStub,
      dpCount: Object.keys(couple.dps || {}).length,
      file: `couples/${fn}`,
    });
  }

  const index = {
    generatedAt: new Date().toISOString(),
    users: userIndex.sort((a, b) => b.posts - a.posts),
    couples: coupleIndex.sort((a, b) => (b.dpCount || 0) - (a.dpCount || 0)),
    processorTotals: processor?.totals || null,
    parseStatus: parse?.analysis?.status || null,
    liveHighest: parse?.analysis?.liveHighest || null,
  };

  if (!SUMMARY_ONLY) {
    const idxMd = [
      '# Enrichment profiles index',
      '',
      `Generated: ${index.generatedAt.slice(0, 19)} · manifest \`config/enrichment/manifest.json\``,
      '',
      '## Users',
      '',
      '| User | Posts | Devices | Curated | Page |',
      '|---|---:|---:|---|---|',
    ];
    for (const u of index.users.slice(0, 40)) {
      idxMd.push(`| ${u.username} | ${u.posts} | ${u.devices} | ${u.autoStub ? 'stub' : 'yes'} | [profile](${u.file}) |`);
    }
    idxMd.push('', '## Sacred couples (DP profiles)', '', '| Couple | Driver | DPs | Page |', '|---|---|---:|---|');
    for (const c of index.couples) {
      idxMd.push(`| \`${c.couple.replace('|', '+')}\` | ${c.driver || '—'} | ${c.dpCount} | [profile](${c.file}) |`);
    }
    idxMd.push('', 'Regenerate: `npm run enrich:profiles`', '');
    fs.writeFileSync(path.join(profileRoot, 'INDEX.md'), `${idxMd.join('\n')}\n`);
    fs.writeFileSync(path.join(profileRoot, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
  }

  const reportDir = reg.reportDir(date);
  fs.mkdirSync(reportDir, { recursive: true });
  const enrichmentMd = [
    '# Silent enrichment — ' + date,
    '',
    'Architecture: `config/enrichment/manifest.json` · profiles: `docs/knowledge/profiles/`',
    '',
    '## Forum T140352',
    '',
    `- Live highest: **#${index.liveHighest ?? '—'}**`,
    `- Parse status: ${index.parseStatus || '—'}`,
  ];
  if (processor?.totals) {
    enrichmentMd.push(
      `- Actionable posts: **${processor.totals.posts}** | need action: **${processor.totals.needAction}**`,
      `- BOTH: ${processor.totals.both} | MASTER_ONLY: ${processor.totals.masterOnly}`,
    );
  }
  enrichmentMd.push(
    `- User profiles: **${index.users.length}** (${index.users.filter((u) => !u.autoStub).length} curated)`,
    `- Couple DP profiles: **${index.couples.length}**`,
    '',
    '## Commands',
    '',
    '```bash',
    'npm run enrich:silent',
    'npm run enrich:sync',
    'npm run enrich:profiles',
    '```',
    '',
  );
  fs.writeFileSync(path.join(reportDir, 'ENRICHMENT.md'), `${enrichmentMd.join('\n')}\n`);

  const stateDir = path.dirname(reg.statePath('orchestrator'));
  fs.mkdirSync(stateDir, { recursive: true });

  console.log('[render-enrichment-index] users=', index.users.length, 'couples=', index.couples.length);
  console.log('[render-enrichment-index] wrote', path.join(profileRoot, 'INDEX.md'));
  console.log('[render-enrichment-index] wrote', path.join(reportDir, 'ENRICHMENT.md'));
}

main();
