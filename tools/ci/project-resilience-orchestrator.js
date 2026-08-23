#!/usr/bin/env node
'use strict';

/**
 * project-resilience-orchestrator.js (P2222 / P2225)
 *
 * Fleet-wide audit: every feature domain + historical bug class.
 * Same methodology as P2221 buttons — Homey gaps → parallel stacks → gates/tests.
 * Critical-first via config/resilience/critical-gaps.json.
 * SHADOW forum only.
 *
 *   node tools/ci/project-resilience-orchestrator.js
 *   node tools/ci/project-resilience-orchestrator.js --write-report
 *   node tools/ci/project-resilience-orchestrator.js --write-report --critical-first
 *   node tools/ci/project-resilience-orchestrator.js --domain=battery
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const MANIFEST = path.join(ROOT, 'config', 'resilience', 'manifest.json');

function loadJson(fp) {
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function runNode(scriptRel, args = [], timeout = 180000) {
  const script = path.join(ROOT, scriptRel);
  if (!fs.existsSync(script)) {
    return { ok: false, skipped: true, reason: 'missing', durationMs: 0 };
  }
  const t0 = Date.now();
  const res = spawnSync(process.execPath, [script, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout,
    env: { ...process.env, FORUM_AUTO_POST: '0', SHADOW_FORUM: '1', DISCOURSE_WRITE: '0' },
  });
  return {
    ok: res.status === 0,
    exitCode: res.status,
    durationMs: Date.now() - t0,
    tail: `${res.stdout || ''}${res.stderr || ''}`.trim().slice(-400),
  };
}

function runNpm(script, timeout = 180000) {
  const t0 = Date.now();
  // Skip if package.json has no such script (soft — complementary BOTH tracks)
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    if (!pkg.scripts || !pkg.scripts[script]) {
      return { ok: true, skipped: true, reason: 'npm-script-missing', durationMs: 0 };
    }
  } catch { /* continue */ }
  // Avoid npm.ps1 execution policy on Windows — call node npm-cli if needed
  const res = spawnSync('npm.cmd', ['run', script, '--silent'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout,
    shell: true,
    env: { ...process.env, FORUM_AUTO_POST: '0' },
  });
  return {
    ok: res.status === 0,
    exitCode: res.status,
    durationMs: Date.now() - t0,
    tail: `${res.stdout || ''}${res.stderr || ''}`.trim().slice(-300),
  };
}

function auditDomain(id, domain) {
  const result = {
    id,
    priority: domain.priority,
    status: domain.status,
    homeyGap: domain.homeyGap,
    stack: domain.stack,
    gates: [],
    npm: [],
    tests: [],
    missingArtifacts: [],
  };

  for (const g of domain.gates || []) {
    if (!exists(g)) {
      result.missingArtifacts.push(g);
      result.gates.push({ script: g, ok: false, skipped: true });
      continue;
    }
    result.gates.push({ script: g, ...runNode(g) });
  }

  for (const n of domain.npm || []) {
    result.npm.push({ script: n, ...runNpm(n) });
  }
  for (const n of domain.npmSoft || []) {
    result.npm.push({ script: n, soft: true, ...runNpm(n) });
  }

  for (const t of domain.tests || []) {
    if (!exists(t)) {
      result.missingArtifacts.push(t);
      result.tests.push({ file: t, ok: false, skipped: true });
      continue;
    }
    // Existence check only for speed; full suite is separate
    result.tests.push({ file: t, ok: true, present: true });
  }

  const gateFails = result.gates.filter((g) => !g.ok && !g.skipped).length;
  const npmFails = result.npm.filter((n) => !n.ok && !n.skipped && !n.soft).length;
  result.ok = gateFails === 0 && npmFails === 0;
  result.gateFails = gateFails;
  result.npmFails = npmFails;
  return result;
}

function main() {
  const writeReport = process.argv.includes('--write-report');
  const criticalFirst = process.argv.includes('--critical-first');
  const withInventory = process.argv.includes('--with-inventory') || criticalFirst;
  const domainFilter = (process.argv.find((a) => a.startsWith('--domain=')) || '').split('=')[1];

  const manifest = loadJson(MANIFEST);
  const domainsDoc = loadJson(path.join(ROOT, manifest.domains));
  const bugsDoc = loadJson(path.join(ROOT, manifest.bugClasses));

  let criticalIds = [];
  if (manifest.criticalGaps) {
    try {
      const crit = loadJson(path.join(ROOT, manifest.criticalGaps));
      criticalIds = (crit.criticalPriority || []).map((c) => c.id);
    } catch { /* optional */ }
  }

  if (withInventory && exists('tools/ci/inventory-features-bugs.js')) {
    console.log('[resilience] ▶ inventory-features-bugs');
    const inv = runNode('tools/ci/inventory-features-bugs.js', ['--write-report'], 120000);
    console.log(`[resilience] ${inv.ok ? '✓' : '⚠'} inventory`);
  }

  const domains = domainsDoc.domains || {};
  let ids = Object.keys(domains)
    .filter((id) => !domainFilter || id === domainFilter);

  if (criticalFirst && !domainFilter) {
    const critSet = new Set(criticalIds);
    const first = criticalIds.filter((id) => domains[id]);
    const rest = ids.filter((id) => !critSet.has(id))
      .sort((a, b) => (domains[a].priority || 99) - (domains[b].priority || 99));
    ids = [...first, ...rest];
  } else {
    ids = ids.sort((a, b) => (domains[a].priority || 99) - (domains[b].priority || 99));
  }

  if (criticalFirst && process.argv.includes('--critical-only')) {
    ids = ids.filter((id) => criticalIds.includes(id));
  }

  const results = [];
  for (const id of ids) {
    console.log(`[resilience] ▶ ${id}`);
    const r = auditDomain(id, domains[id]);
    results.push(r);
    console.log(`[resilience] ${r.ok ? '✓' : '⚠'} ${id} gates_fail=${r.gateFails} npm_fail=${r.npmFails}`);
  }

  const bugClasses = bugsDoc.classes || {};
  const byStatus = { fixed: 0, partial: 0, open: 0, hardened: 0 };
  for (const c of Object.values(bugClasses)) {
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
  }
  for (const r of results) {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  }

  let glossary = null;
  if (manifest.layerGlossary) {
    try {
      glossary = loadJson(path.join(ROOT, manifest.layerGlossary));
    } catch { /* optional */ }
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    policy: 'SHADOW forum — intelligence in code/CI only',
    complementary: 'P2224/P2225 — inventory + critical-first + parallel layer vocabularies',
    criticalFirst,
    criticalIds,
    domainsAudited: results.length,
    domainsOk: results.filter((r) => r.ok).length,
    bugClassCounts: byStatus,
    layerSchemes: glossary ? Object.keys(glossary.schemes || {}) : [],
    evolutionRefs: manifest.evolutionRefs || [],
    results,
    openBugs: Object.entries(bugClasses)
      .filter(([, v]) => v.status === 'open' || v.status === 'partial')
      .map(([k, v]) => ({ id: k, ...v })),
  };

  const date = new Date().toISOString().slice(0, 10);
  const reportDir = path.join(ROOT, manifest.outputs.reportDir.replace('{{date}}', date));
  const statePath = path.join(ROOT, manifest.state.lastRun);
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, `${JSON.stringify(summary, null, 2)}\n`);

  if (writeReport) {
    fs.mkdirSync(reportDir, { recursive: true });
    const md = [
      `# Project resilience audit — ${date}`,
      '',
      'SHADOW forum. Methodology: Homey-native gaps → parallel complementary stacks (P2221→P2225).',
      criticalFirst ? `Mode: **critical-first** (${criticalIds.join(', ')})` : 'Mode: full fleet',
      '',
      `Domains: **${summary.domainsOk}/${summary.domainsAudited}** gates green | Bug classes: fixed=${byStatus.fixed || 0} partial=${byStatus.partial || 0} open=${byStatus.open || 0}`,
      '',
      'See also: `INVENTORY.md` (`npm run resilience:inventory`)',
      '',
      '## Domains',
      '',
      '| Domain | Prio | Status | Gates | Homey gap |',
      '|--------|------|--------|-------|-----------|',
    ];
    for (const r of results) {
      const g = `${r.gates.filter((x) => x.ok).length}/${r.gates.length}`;
      md.push(`| ${r.id} | ${r.priority} | ${r.status} | ${g}${r.ok ? '' : ' ⚠'} | ${(r.homeyGap || '').slice(0, 60)} |`);
    }
    md.push('', '## Residual OPEN/PARTIAL bugs', '');
    for (const b of summary.openBugs.slice(0, 40)) {
      md.push(`- \`${b.id}\` (**${b.status}**) → ${b.fix} [${(b.domains || []).join(', ')}]`);
    }
    md.push('', '## Parallel stacks (priority 1)', '');
    for (const r of results.filter((x) => x.priority === 1)) {
      md.push(`### ${r.id}`, '');
      md.push((r.stack || []).map((s) => `- ${s}`).join('\n'), '');
    }
    md.push('', '## Layer glossary (P2224 complementary)', '');
    if (summary.layerSchemes.length) {
      md.push(`Schemes coexisting: ${summary.layerSchemes.map((s) => `\`${s}\``).join(', ')}`);
      md.push('', `SSOT: \`${manifest.layerGlossary}\` · doctrine: \`docs/architecture/COMPLEMENTARY_ENRICHMENT.md\``);
    } else {
      md.push('_No layer-glossary loaded_');
    }
    if (summary.evolutionRefs.length) {
      md.push('', '### Evolution refs', '');
      for (const ref of summary.evolutionRefs.slice(0, 12)) md.push(`- \`${ref}\``);
    }
    md.push('', '---', 'Regenerate: `npm run resilience:audit`', '');
    const mdPath = path.join(reportDir, 'RESILIENCE.md');
    fs.writeFileSync(mdPath, `${md.join('\n')}\n`);
    fs.writeFileSync(path.join(reportDir, 'resilience.json'), `${JSON.stringify(summary, null, 2)}\n`);
    console.log('[resilience] wrote', mdPath);
  }

  console.log('[resilience] domains_ok=', summary.domainsOk, '/', summary.domainsAudited);
  process.exit(summary.domainsOk === summary.domainsAudited ? 0 : 2);
}

main();
