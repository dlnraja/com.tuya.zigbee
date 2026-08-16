#!/usr/bin/env node
/**
 * max-coverage-investigate.js — P177
 *
 * Single entry for FREE / local-first max coverage investigation + maintenance
 * dry-runs. Uses existing tools only. NEVER generates drivers, NEVER injects
 * workarounds into device.js, NEVER posts to Homey forum, NEVER calls paid AI.
 *
 * Modes:
 *   (default)     Local gates + dry multi-source (--skip-scan)
 *   --with-scan   Also forum silent multi-scan (network, free)
 *   --apply-safe  Pass --apply to multi-source known-routes only (human still reviews PR)
 *   --json        Print JSON summary to stdout
 *
 * Usage:
 *   node tools/ci/max-coverage-investigate.js
 *   node tools/ci/max-coverage-investigate.js --with-scan
 *   node tools/ci/max-coverage-investigate.js --apply-safe
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const REPORT_MD = path.join(ROOT, 'reports', 'MAX_COVERAGE_INVESTIGATE.md');
const REPORT_JSON = path.join(ROOT, '.github', 'state', 'max-coverage-investigate.json');

const args = process.argv.slice(2);
const WITH_SCAN = args.includes('--with-scan');
const APPLY_SAFE = args.includes('--apply-safe');
const AS_JSON = args.includes('--json');
const STRICT = args.includes('--strict');

function run(label, script, extra = [], soft = true) {
  const full = path.join(ROOT, script);
  if (!fs.existsSync(full)) {
    return { label, ok: false, skipped: true, reason: 'missing', script };
  }
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [full, ...extra], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 300000,
    env: {
      ...process.env,
      FORUM_AUTO_POST: '0',
      REPLY_TOPICS: '140352',
      SMART_FETCH_READER_FALLBACK: process.env.SMART_FETCH_READER_FALLBACK || '1',
    },
  });
  const out = `${r.stdout || ''}${r.stderr || ''}`.trim();
  return {
    label,
    script,
    ok: soft ? true : r.status === 0,
    hardOk: r.status === 0,
    exitCode: r.status,
    durationMs: Date.now() - t0,
    tail: out.slice(-1200),
  };
}

const summary = {
  generatedAt: new Date().toISOString(),
  mode: {
    withScan: WITH_SCAN,
    applySafe: APPLY_SAFE,
    strict: STRICT,
    note: 'report-only unless --apply-safe (known routes only; no driver codegen)',
  },
  phases: [],
  recommendations: [],
  intelligence: {
    tzDualClaims: null,
    brandDualClaims: null,
    mfsHighDrift: null,
  },
};

function phase(label, fn) {
  console.log(`[max-coverage] ▶ ${label}`);
  const t0 = Date.now();
  try {
    const result = fn() || {};
    const entry = { label, ok: true, durationMs: Date.now() - t0, ...result };
    summary.phases.push(entry);
    console.log(`[max-coverage] ✓ ${label} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    return entry;
  } catch (e) {
    const entry = { label, ok: false, durationMs: Date.now() - t0, error: e.message };
    summary.phases.push(entry);
    console.log(`[max-coverage] ✗ ${label}: ${e.message}`);
    return entry;
  }
}

// ── Local maintenance gates (free, offline) ─────────────────────────────
phase('dual-claim-compose-gate', () =>
  run('dual-claim', 'tools/ci/dual-claim-compose-gate.js', STRICT ? ['--strict'] : []));
phase('dual-claim-brand-scan', () =>
  run('dual-claim-brands', 'tools/ci/dual-claim-compose-gate.js', ['--include-brands', '--json'], true));
phase('align-mfs-db-intelligent --check', () =>
  run('align-mfs', 'tools/ci/align-mfs-db-intelligent.js', ['--check'], !STRICT));
phase('audit-sacred-couple --from-registry', () =>
  run('sacred-registry', 'tools/ci/audit-sacred-couple.js', ['--from-registry']));
phase('audit-sacred-couple-by-class', () =>
  run('sacred-class', 'tools/ci/audit-sacred-couple-by-class.js'));
phase('energy-compose-gate', () => run('energy', 'tools/ci/energy-compose-gate.js'));
phase('homey-heap-json-gate', () => run('heap', 'tools/ci/homey-heap-json-gate.js'));
phase('gmail-crash-pattern-gate', () =>
  run('gmail-patterns', 'tools/ci/gmail-crash-pattern-gate.js', ['--json']));
phase('layer-pass-audit', () => run('layers', 'tools/ci/layer-pass-audit.js'));
phase('forum-ai-paste-gate', () =>
  run('forum-paste', 'tools/ci/forum-ai-paste-gate.js', ['--scan-defaults']));
phase('apply-blakadder-new dry-run', () =>
  run('blakadder-dry', 'tools/ci/apply-blakadder-new.js'));

// ── Multi-source enrich (existing P114) ─────────────────────────────────
phase('multi-source-enrich-orchestrator', () => {
  const extra = [];
  if (!WITH_SCAN) extra.push('--skip-scan');
  if (APPLY_SAFE) extra.push('--apply');
  return run('multi-source', 'tools/ci/multi-source-enrich-orchestrator.js', extra);
});

// ── Optional local diag KB smoke ────────────────────────────────────────
phase('analyze-diag-locally smoke', () => {
  const script = path.join(ROOT, 'tools/ci/analyze-diag-locally.js');
  if (!fs.existsSync(script)) return { skipped: true };
  const sample = 'FATAL ERROR: Reached heap limit Allocation failed LiveData';
  const r = spawnSync(process.execPath, [script, '--stdin'], {
    cwd: ROOT,
    encoding: 'utf8',
    input: sample,
    timeout: 60000,
  });
  return {
    hardOk: r.status === 0,
    exitCode: r.status,
    tail: `${r.stdout || ''}${r.stderr || ''}`.trim().slice(-800),
  };
});

// ── Intelligence extraction ─────────────────────────────────────────────
const dual = summary.phases.find((p) => p.label === 'dual-claim-compose-gate');
if (dual && /Found (\d+) dual-claim/i.test(dual.tail || '')) {
  const m = (dual.tail || '').match(/Found (\d+) dual-claim[^\n]*\((\d+) involving/i);
  if (m) {
    summary.intelligence.tzDualClaims = Number(m[2]);
    if (Number(m[1]) > 0) {
      summary.recommendations.push(
        `Dual-claim: ${m[1]} total (${m[2]} TZ-family) — triage with registry + Z2M/ZHA (no codegen).`
      );
    }
  }
}
const brand = summary.phases.find((p) => p.label === 'dual-claim-brand-scan');
if (brand && brand.tail) {
  try {
    const j = JSON.parse(brand.tail);
    summary.intelligence.brandDualClaims = j.conflictCount || 0;
    if (j.conflictCount > 0) {
      summary.recommendations.push(
        `Brand-label dual-claims (${j.conflictCount}): prefer OEM _TZ*/_TZE* couples; strip bare HOBEIAN/SONOFF from wrong drivers.`
      );
    }
  } catch (_e) { /* non-json tail */ }
}
const alignPh = summary.phases.find((p) => p.label === 'align-mfs-db-intelligent --check');
if (alignPh && /CHECK FAIL:\s*(\d+)/i.test(alignPh.tail || '')) {
  const m = (alignPh.tail || '').match(/CHECK FAIL:\s*(\d+)/i);
  summary.intelligence.mfsHighDrift = m ? Number(m[1]) : null;
  summary.recommendations.push('mfs_db high drift — run: node tools/ci/align-mfs-db-intelligent.js --apply');
}

summary.recommendations.push(
  'Coverage growth: mega-crawl.yml (daily) + weekly-sovereign-loop.yml — do not invent sync-mfs-db codegen.'
);
summary.recommendations.push(
  'FP apply: tools/ci/apply-blakadder-new.js dry-run → human review → --apply on master only.'
);
summary.recommendations.push(
  'Peter soak: Homey Test ≥9.0.541; new diag only if OOM persists (LiveData settings, not fingerprints.json).'
);

fs.mkdirSync(path.dirname(REPORT_JSON), { recursive: true });
fs.writeFileSync(REPORT_JSON, `${JSON.stringify(summary, null, 2)}\n`);

const md = [
  '# Max coverage investigate (P177/P179)',
  '',
  `Generated: ${summary.generatedAt}`,
  '',
  '## Mode',
  '',
  `- with-scan: ${WITH_SCAN}`,
  `- apply-safe: ${APPLY_SAFE}`,
  `- strict: ${STRICT}`,
  '',
  '## Intelligence',
  '',
  `- TZ dual-claims: ${summary.intelligence.tzDualClaims}`,
  `- Brand dual-claims: ${summary.intelligence.brandDualClaims}`,
  `- mfs high drift: ${summary.intelligence.mfsHighDrift}`,
  '',
  '## Phases',
  '',
  '| Phase | OK | Hard | ms |',
  '|-------|----|------|----|',
  ...summary.phases.map((p) => {
    const hard = p.hardOk === undefined ? (p.ok ? 'n/a' : 'no') : p.hardOk ? 'yes' : 'no';
    return `| ${p.label} | ${p.ok ? '✓' : '✗'} | ${hard} | ${p.durationMs || 0} |`;
  }),
  '',
  '## Recommendations',
  '',
  ...summary.recommendations.map((r) => `- ${r}`),
  '',
  '## Hard rules',
  '',
  '- No bidirectional mfs→device.js generation (P171–P176)',
  '- No JSON >2MB fail gate (breaks mfs_db; OOM ≠ fingerprints)',
  '- Forum silent-first (T157628)',
  '',
  `JSON: \`.github/state/max-coverage-investigate.json\``,
  '',
].join('\n');

fs.writeFileSync(REPORT_MD, md);
console.log(`[max-coverage] Report → ${REPORT_MD}`);

if (AS_JSON) console.log(JSON.stringify(summary, null, 2));

const hardFails = summary.phases.filter((p) => p.hardOk === false && !p.skipped);
const strictFail = STRICT && (
  (summary.intelligence.tzDualClaims || 0) > 0
  || (summary.intelligence.mfsHighDrift || 0) > 0
  || hardFails.some((p) => /align-mfs|dual-claim-compose/.test(p.label))
);
process.exit(strictFail ? 1 : 0);
