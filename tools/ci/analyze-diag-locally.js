'use strict';

/**
 * analyze-diag-locally.js (P170 + P2211 enrich)
 *
 * Local-first triage of Homey crash/diag text against:
 *   - lib/diagnostics/DiagContentEnricher (log id, couples, signals)
 *   - data/error-patterns.json
 *   - docs/knowledge/device-truth.json + misattribution registry
 *
 * READ-ONLY: prints a report. Does NOT post to GitHub or mutate drivers.
 */

const fs = require('fs');
const path = require('path');
const { enrich } = require('../../lib/diagnostics/DiagContentEnricher');
const { lookup, isForbiddenDriver } = require('../../lib/pairing/UserMisattributionRegistry');

const ROOT = path.join(__dirname, '..', '..');
const PATTERNS_PATH = path.join(ROOT, 'data', 'error-patterns.json');
const TRUTH_PATH = path.join(ROOT, 'docs', 'knowledge', 'device-truth.json');
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

function loadTruth() {
  try {
    return JSON.parse(fs.readFileSync(TRUTH_PATH, 'utf8'));
  } catch {
    return { drivers: {} };
  }
}

function truthDriverFor(truth, mfr, pid) {
  if (!mfr || !pid) return null;
  const ml = norm(mfr);
  const np = norm(pid);
  for (const [driverId, row] of Object.entries(truth.drivers || {})) {
    for (const lock of row.locks || []) {
      if (norm(lock.mfr) === ml && norm(lock.productId) === np) return driverId;
    }
  }
  return null;
}

function readInputText() {
  if (STDIN) return fs.readFileSync(0, 'utf8');
  const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  if (args[0] && fs.existsSync(args[0])) return fs.readFileSync(args[0], 'utf8');
  return '';
}

function matchPatterns(text, patterns) {
  const hits = [];
  for (const p of patterns) {
    let matched = false;
    if (p.regex) {
      try {
        if (new RegExp(p.regex, 'i').test(text)) matched = true;
      } catch { /* ignore */ }
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

function analyzeCouples(enriched, truth) {
  return (enriched.couples || []).map((c) => {
    const reg = lookup(c.mfr, c.pid);
    const truthDriver = truthDriverFor(truth, c.mfr, c.pid);
    const forbidden = (reg?.forbiddenDrivers || []).filter((d) => isForbiddenDriver(c.mfr, c.pid, d));
    return {
      mfr: c.mfr,
      pid: c.pid,
      registryId: reg?.id || null,
      canonicalDriver: reg?.canonicalDriver || truthDriver || null,
      forbiddenDrivers: forbidden,
      deviceTruthDriver: truthDriver,
    };
  });
}

function main() {
  const patterns = loadPatterns();
  const kb = loadKb();
  const truth = loadTruth();
  const text = readInputText();
  const mfr = arg('mfr');
  const pid = arg('pid');
  const enriched = enrich(text);
  if (mfr && pid && !enriched.couples.some((c) => norm(c.mfr) === norm(mfr) && norm(c.pid) === norm(pid))) {
    enriched.couples.unshift({ mfr, pid });
  }

  const hits = text ? matchPatterns(text, patterns) : [];
  const device = mfr ? lookupDevice(kb, mfr, pid) : null;
  const coupleAnalysis = analyzeCouples(enriched, truth);

  const report = {
    timestamp: new Date().toISOString(),
    tool: 'analyze-diag-locally',
    policy: 'local-first read-only — no GitHub comments, no auto-PR, no AI',
    inputChars: text.length,
    enriched: {
      logId: enriched.logId,
      logIdShort: enriched.logIdShort,
      userMessage: enriched.userMessage,
      meta: enriched.meta,
      summary: enriched.summary,
      drivers: enriched.drivers,
      signals: enriched.signals,
      highlights: enriched.highlights,
    },
    couples: coupleAnalysis,
    patternHits: hits.map((h) => ({
      id: h.id,
      severity: h.severity,
      rootCause: h.rootCause,
      suggestedFix: h.suggestedFix,
      fixAction: h.fixAction,
      status: h.status,
      codeRefs: h.codeRefs || [],
      autoFixable: false,
    })),
    deviceKnowledge: device,
    nextSteps: [
      'Verify sacred couple in compose + user-misattribution-registry.json',
      'Cross-ref forum-actionable-processor + device-truth.json locks',
      'If OOM: Test ≥9.0.541 LiveData caps — not fingerprints.json myth',
      'Never open auto-PRs from this tool',
    ],
  };

  if (JSON_MODE) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log('=== analyze-diag-locally ===');
  if (enriched.logIdShort) console.log(`Log ID: ${enriched.logIdShort} (${enriched.logId || 'partial'})`);
  if (enriched.meta.appVersion) console.log(`App: v${enriched.meta.appVersion} | Homey: v${enriched.meta.homeyVersion || '?'}`);
  if (enriched.userMessage) console.log(`User: ${enriched.userMessage}`);
  console.log(`Summary: ${enriched.summary || 'no structured content'}`);
  console.log(`Pattern hits: ${hits.length} | signals: ${enriched.signals.length} | couples: ${coupleAnalysis.length}`);

  if (enriched.signals.length) {
    console.log('\nSignals:');
    for (const s of enriched.signals) console.log(`  [${s.severity}] ${s.id} → ${s.fix}`);
  }
  if (coupleAnalysis.length) {
    console.log('\nSacred couples:');
    for (const c of coupleAnalysis) {
      console.log(`  ${c.mfr}+${c.pid} → canonical=${c.canonicalDriver || '?'} registry=${c.registryId || '—'}`);
      if (c.forbiddenDrivers?.length) console.log(`    forbid: ${c.forbiddenDrivers.join(', ')}`);
    }
  }
  for (const h of report.patternHits) {
    console.log(`\n[${h.severity}] ${h.id} (${h.status || 'n/a'})`);
    console.log(`  cause: ${h.rootCause}`);
    console.log(`  fix:   ${h.suggestedFix}`);
  }
  if (enriched.highlights.length) {
    console.log('\nLog highlights:');
    for (const line of enriched.highlights.slice(0, 5)) console.log(`  ${line}`);
  }
  if (!hits.length && !text && !mfr) {
    console.log('\nUsage: node tools/ci/analyze-diag-locally.js <logfile> | --stdin | --mfr=... --pid=...');
  }
}

main();
