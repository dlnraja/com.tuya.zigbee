#!/usr/bin/env node
'use strict';

/**
 * inventory-features-bugs.js (P2225)
 *
 * Inventories feature domains + historical bug classes + critical gaps.
 * Methodology: Homey gap → parallel complementary stacks → gates/workflows.
 * SHADOW forum only.
 *
 *   node tools/ci/inventory-features-bugs.js
 *   node tools/ci/inventory-features-bugs.js --write-report
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MANIFEST = path.join(ROOT, 'config', 'resilience', 'manifest.json');

function loadJson(fp) {
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function main() {
  const writeReport = process.argv.includes('--write-report') || !process.argv.includes('--no-report');
  const manifest = loadJson(MANIFEST);
  const domainsDoc = loadJson(path.join(ROOT, manifest.domains));
  const bugsDoc = loadJson(path.join(ROOT, manifest.bugClasses));
  const criticalPath = manifest.criticalGaps || 'config/resilience/critical-gaps.json';
  const glossaryPath = manifest.layerGlossary || 'config/resilience/layer-glossary.json';

  let critical = { criticalPriority: [], methodology: [], workflowHooks: {} };
  let glossary = { schemes: {} };
  try { critical = loadJson(path.join(ROOT, criticalPath)); } catch { /* optional */ }
  try { glossary = loadJson(path.join(ROOT, glossaryPath)); } catch { /* optional */ }

  const domains = domainsDoc.domains || {};
  const classes = bugsDoc.classes || {};

  const byStatus = { fixed: 0, partial: 0, open: 0, hardened: 0 };
  for (const c of Object.values(classes)) {
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
  }

  const domainRows = Object.entries(domains)
    .map(([id, d]) => ({
      id,
      priority: d.priority || 99,
      status: d.status,
      homeyGap: d.homeyGap,
      stackCount: (d.stack || []).length,
      gatesPresent: (d.gates || []).filter((g) => exists(g)).length,
      gatesTotal: (d.gates || []).length,
      testsPresent: (d.tests || []).filter((t) => exists(t)).length,
      dualApp: d.dualApp || 'BOTH',
    }))
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));

  const residual = Object.entries(classes)
    .filter(([, v]) => v.status === 'open' || v.status === 'partial')
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1));

  const criticalIds = (critical.criticalPriority || []).map((c) => c.id);
  const missingCriticalArtifacts = [];
  for (const c of critical.criticalPriority || []) {
    for (const g of c.gates || []) {
      if (!exists(g)) missingCriticalArtifacts.push({ domain: c.id, gate: g });
    }
  }

  const inventory = {
    generatedAt: new Date().toISOString(),
    policy: 'SHADOW forum — intelligence in code/CI only',
    methodology: critical.methodology || [
      'Homey gap → parallel complementary stack',
      'Wire gate/test/workflow',
      'Honest FIXED/PARTIAL/OPEN',
    ],
    counts: {
      domains: domainRows.length,
      priority1: domainRows.filter((d) => d.priority === 1).length,
      bugClasses: Object.keys(classes).length,
      residualOpenPartial: residual.length,
      criticalGaps: criticalIds.length,
      layerSchemes: Object.keys(glossary.schemes || {}).length,
    },
    criticalPriority: critical.criticalPriority || [],
    domains: domainRows,
    residualBugs: residual,
    layerSchemes: Object.keys(glossary.schemes || {}),
    workflowHooks: critical.workflowHooks || {},
    missingCriticalArtifacts,
    discoveries: (critical.criticalPriority || []).flatMap((c) =>
      (c.discoveries || []).map((d) => ({ domain: c.id, note: d }))
    ),
  };

  const date = new Date().toISOString().slice(0, 10);
  const reportDir = path.join(ROOT, (manifest.outputs?.reportDir || 'reports/resilience-{{date}}').replace('{{date}}', date));
  const stateDir = path.join(ROOT, '.github', 'state', 'resilience');
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(path.join(stateDir, 'inventory.json'), `${JSON.stringify(inventory, null, 2)}\n`);

  if (writeReport) {
    fs.mkdirSync(reportDir, { recursive: true });
    const md = [
      `# Features + historical bugs inventory — ${date}`,
      '',
      'SHADOW forum. Method: Homey-native gaps → **parallel complementary stacks** → gates/workflows (P2221→P2225).',
      '',
      `Domains: **${inventory.counts.domains}** (prio1=${inventory.counts.priority1}) | Bugs: **${inventory.counts.bugClasses}** (residual OPEN/PARTIAL=${inventory.counts.residualOpenPartial}) | Critical gaps: **${inventory.counts.criticalGaps}** | Layer schemes: **${inventory.counts.layerSchemes}**`,
      '',
      '## Methodology',
      '',
      ...inventory.methodology.map((m) => `- ${m}`),
      '',
      '## Critical gaps (priority 1 — audit first)',
      '',
      '| Domain | Why | Homey gap | Bugs |',
      '|--------|-----|-----------|------|',
    ];
    for (const c of inventory.criticalPriority) {
      md.push(`| \`${c.id}\` | ${(c.why || '').slice(0, 50)} | ${(c.homeyGap || '').slice(0, 40)} | ${(c.bugs || []).join(', ')} |`);
    }
    md.push('', '### Parallel stacks (critical)', '');
    for (const c of inventory.criticalPriority) {
      md.push(`#### ${c.id}`, '');
      md.push((c.stack || []).map((s) => `- ${s}`).join('\n'));
      if (c.discoveries?.length) {
        md.push('', '_Discoveries:_', ...c.discoveries.map((d) => `- ${d}`));
      }
      md.push('');
    }
    md.push('## All feature domains', '');
    md.push('| Domain | Prio | Status | Gates | Homey gap |');
    md.push('|--------|------|--------|-------|-----------|');
    for (const d of domainRows) {
      md.push(`| ${d.id} | ${d.priority} | ${d.status} | ${d.gatesPresent}/${d.gatesTotal} | ${(d.homeyGap || '').slice(0, 55)} |`);
    }
    md.push('', '## Residual OPEN / PARTIAL bugs', '');
    for (const b of residual) {
      md.push(`- \`${b.id}\` (**${b.status}**) → ${b.fix} [${(b.domains || []).join(', ')}]`);
    }
    md.push('', '## Layer glossary schemes (coexist)', '');
    md.push(inventory.layerSchemes.map((s) => `- \`${s}\``).join('\n') || '_none_');
    md.push('', '## Workflow hooks', '');
    md.push('```json');
    md.push(JSON.stringify(inventory.workflowHooks, null, 2));
    md.push('```');
    if (missingCriticalArtifacts.length) {
      md.push('', '## Missing critical gate artifacts', '');
      for (const m of missingCriticalArtifacts) md.push(`- ${m.domain}: \`${m.gate}\``);
    }
    md.push('', '---', 'Regenerate: `npm run resilience:inventory`', '');
    fs.writeFileSync(path.join(reportDir, 'INVENTORY.md'), `${md.join('\n')}\n`);
    fs.writeFileSync(path.join(reportDir, 'inventory.json'), `${JSON.stringify(inventory, null, 2)}\n`);
    console.log('[inventory] wrote', path.join(reportDir, 'INVENTORY.md'));
  }

  console.log('[inventory] domains=', inventory.counts.domains, 'critical=', inventory.counts.criticalGaps, 'residual=', inventory.counts.residualOpenPartial);
  process.exit(missingCriticalArtifacts.length ? 2 : 0);
}

main();
