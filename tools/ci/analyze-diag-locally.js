'use strict';

/**
 * analyze-diag-locally.js (P170)
 *
 * Local-first, zero-AI triage of Homey crash/diag text against:
 *   - data/error-patterns.json
 *   - data/device-knowledge-base.json (optional mfr/pid hints)
 *
 * READ-ONLY: prints a report. Does NOT post to GitHub, open PRs, or mutate drivers.
 *
 * Usage:
 *   node tools/ci/analyze-diag-locally.js path/to/log.txt
 *   node tools/ci/analyze-diag-locally.js --stdin < crash.txt
 *   echo "heap out of memory" | node tools/ci/analyze-diag-locally.js --stdin --json
 *   node tools/ci/analyze-diag-locally.js --mfr=_TZ3000_k4ej3ww2 --pid=TS0207
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const PATTERNS_PATH = path.join(ROOT, 'data', 'error-patterns.json');
const KB_PATH = path.join(ROOT, 'data', 'device-knowledge-base.json');
const JSON_MODE = process.argv.includes('--json');
const STDIN = process.argv.includes('--stdin');

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

function norm(s) {
  return String(s || '').trim().toLowerCase();
}

function loadPatterns() {
  const raw = JSON.parse(fs.readFileSync(PATTERNS_PATH, 'utf8'));
  return raw.patterns || raw;
}

function loadKb() {
  try {
    return JSON.parse(fs.readFileSync(KB_PATH, 'utf8'));
  } catch {
    return { devices: [], productIdHints: {}, workarounds: {} };
  }
}

function readInputText() {
  if (STDIN) {
    return fs.readFileSync(0, 'utf8');
  }
  const file = process.argv.find((a) => !a.startsWith('-') && a !== process.argv[0] && a !== process.argv[1]
    && !a.includes('analyze-diag-locally'));
  // argv[1] is script path; find first non-flag path after script
  const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  if (args[0] && fs.existsSync(args[0])) {
    return fs.readFileSync(args[0], 'utf8');
  }
  return '';
}

function matchPatterns(text, patterns) {
  const hits = [];
  for (const p of patterns) {
    let matched = false;
    if (p.regex) {
      try {
        if (new RegExp(p.regex, 'i').test(text)) matched = true;
      } catch { /* ignore bad regex */ }
    }
    if (!matched && Array.isArray(p.keywords)) {
      matched = p.keywords.some((k) => text.toLowerCase().includes(String(k).toLowerCase()));
    }
    if (matched) hits.push(p);
  }
  return hits;
}

function lookupDevice(kb, mfr, pid) {
  const nm = norm(mfr);
  const np = pid ? norm(pid) : null;
  const devices = kb.devices || [];
  const exact = devices.filter((d) => {
    if (norm(d.mfr) !== nm) return false;
    if (!np) return true;
    return [].concat(d.productId || []).some((p) => norm(p) === np);
  });
  const hint = np && kb.productIdHints ? kb.productIdHints[pid] || kb.productIdHints[String(pid).toUpperCase()] : null;
  return { exact, productIdHint: hint || null };
}

function main() {
  const patterns = loadPatterns();
  const kb = loadKb();
  const text = readInputText();
  const mfr = arg('mfr');
  const pid = arg('pid');

  const hits = text ? matchPatterns(text, patterns) : [];
  const device = mfr ? lookupDevice(kb, mfr, pid) : null;

  const report = {
    timestamp: new Date().toISOString(),
    tool: 'analyze-diag-locally',
    policy: 'local-first read-only — no GitHub comments, no auto-PR, no AI',
    inputChars: text.length,
    patternHits: hits.map((h) => ({
      id: h.id,
      severity: h.severity,
      rootCause: h.rootCause,
      suggestedFix: h.suggestedFix,
      fixAction: h.fixAction,
      status: h.status,
      codeRefs: h.codeRefs || [],
      autoFixable: false, // force honesty: never claim auto-PR
    })),
    deviceKnowledge: device,
    nextSteps: [
      'Verify against tip code + registry (audit-sacred-couple.js)',
      'If OOM: ensure Test ≥9.0.541 LiveData caps (not fingerprints.json myth)',
      'Do not open auto-PRs from this tool',
    ],
  };

  if (JSON_MODE) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`analyze-diag-locally: ${hits.length} pattern hit(s), input ${text.length} chars`);
    for (const h of report.patternHits) {
      console.log(`\n[${h.severity}] ${h.id} (${h.status || 'n/a'})`);
      console.log(`  cause: ${h.rootCause}`);
      console.log(`  fix:   ${h.suggestedFix}`);
      if (h.codeRefs?.length) console.log(`  code:  ${h.codeRefs.join(', ')}`);
    }
    if (device?.exact?.length) {
      console.log('\nDevice KB (sacred couple):');
      for (const d of device.exact) {
        console.log(`  ${d.mfr} + ${(d.productId || []).join('|')} → ${d.canonicalDriverHint || '?'} [${d.type}]`);
        if (d.requiredWorkarounds?.length) console.log(`  workarounds: ${d.requiredWorkarounds.join(', ')}`);
      }
    } else if (device?.productIdHint) {
      console.log('\nproductId hint only (ambiguous without mfr):', JSON.stringify(device.productIdHint));
    }
    if (!hits.length && !text && !mfr) {
      console.log('Usage: node tools/ci/analyze-diag-locally.js <logfile> | --stdin | --mfr=... --pid=...');
    }
  }
}

main();
