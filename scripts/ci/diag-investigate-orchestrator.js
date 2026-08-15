'use strict';

/**
 * diag-investigate-orchestrator.js
 *
 * Chains free-scrape → diag UUID harvest → Homey/Gmail fetch → polarity/sacred routing.
 * Silent enrichment only (no Homey Community posts).
 *
 * Modes:
 *   --self-test       Inventory + syntax/load smoke for all diag JS (no network secrets)
 *   --scrape-only     Free scrape cascade only
 *   --fetch-diags     Fetch UUIDs from diag-hints.json (or --uuid=)
 *   --full            scrape + fetch + polarity report (default when no mode flag)
 *
 * Usage:
 *   node scripts/ci/diag-investigate-orchestrator.js --self-test
 *   node scripts/ci/diag-investigate-orchestrator.js --full --focus=2137
 *   node scripts/ci/diag-investigate-orchestrator.js --fetch-diags --uuid=f1e5b12d-...
 *   node scripts/ci/diag-investigate-orchestrator.js --full --skip-fetch
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const OUT_DIR = path.join(ROOT, '.github', 'state', 'diag-orchestrator');
const SCRAPE_DIR = path.join(ROOT, '.github', 'state', 'free-scrape');
const DIAG_DIR = path.join(ROOT, '.github', 'state', 'homey-app-diag');

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const get = (prefix, fallback = '') => {
  const hit = args.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
};

const MODE = has('--self-test')
  ? 'self-test'
  : has('--scrape-only')
    ? 'scrape-only'
    : has('--fetch-diags')
      ? 'fetch-diags'
      : 'full';

const TOPIC = get('--topic=', '140352');
const FOCUS = get('--focus=', '2137');
const UUID_ARG = get('--uuid=', '');
const SKIP_FETCH = has('--skip-fetch') || process.env.DIAG_SKIP_FETCH === '1';
const MAX_UUIDS = Number(get('--max-uuids=', process.env.DIAG_MAX_UUIDS || '5')) || 5;

/** Canonical diag-related scripts to inventory / smoke. */
const DIAG_SCRIPTS = [
  'scripts/ci/fetch-homey-app-diag-by-uuid.js',
  'scripts/ci/scan-homey-crashes-for-uuid.js',
  'scripts/ci/gmail-search-diag-uuid.js',
  'scripts/ci/diagnostic-history-gate.js',
  'scripts/ci/diagnostic-report.js',
  'scripts/ci/diag-investigate-orchestrator.js',
  'scripts/diagnostic-auto-resolver.js',
  'tools/ci/free-scrape-crossref.js',
  'tools/ci/dp-diagnostic.js',
  'tools/ci/diag-forum-p94-routing.js',
  'tools/ci/process-diagnostics-emails.js',
  'lib/scraper/FreeScrapeStack.js',
  'lib/managers/AlarmPolarityManager.js',
  'lib/diagnostics/DiagnosticAPI.js',
  'lib/diagnostics/DiagnosticLogger.js',
  'lib/diagnostics/DiagnosticLogsCollector.js',
  'lib/diagnostics/DeviceDiagnostics.js',
  'lib/DiagnosticEngine.js',
  '.github/scripts/fetch-gmail-diagnostics.js',
  '.github/scripts/collect-diagnostics.js',
  '.github/scripts/homey-device-diagnostics.js',
  '.github/scripts/diagnostic-auto-resolver.js',
  '.github/scripts/diagnostic-auto-heal-radar.js',
  '.github/scripts/athom-puppeteer-full-diag.js',
  '.github/scripts/athom-build-error-diag.js',
  '.github/scripts/build-error-diag-v2.js',
  '.github/scripts/anonymize-diagnostics.js',
];

const DIAG_WORKFLOWS = [
  '.github/workflows/tuya-deep-diag.yml',
  '.github/workflows/free-scrape-crossref.yml',
  '.github/workflows/gmail-diagnostics.yml',
  '.github/workflows/collect-diagnostics.yml',
  '.github/workflows/fetch-diags.yml',
  '.github/workflows/build-error-diag.yml',
  '.github/workflows/publish-diagnose.yml',
  '.github/workflows/verified-publish-and-diagnostics.yml',
];

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}

function runNode(relScript, extraArgs = [], opts = {}) {
  const script = path.join(ROOT, relScript);
  if (!fs.existsSync(script)) {
    return { ok: false, skipped: true, error: 'missing', code: -1 };
  }
  const r = spawnSync(process.execPath, [script, ...extraArgs], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, ...(opts.env || {}) },
    timeout: opts.timeoutMs || 120000,
    maxBuffer: 8 * 1024 * 1024,
  });
  return {
    ok: r.status === 0,
    code: r.status,
    skipped: false,
    stdout: (r.stdout || '').slice(-4000),
    stderr: (r.stderr || '').slice(-2000),
    error: r.error ? r.error.message : null,
  };
}

function syntaxCheck(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {return { rel, exists: false, ok: false };}
  if (rel.endsWith('.yml') || rel.endsWith('.yaml')) {
    const raw = fs.readFileSync(abs, 'utf8');
    return {
      rel,
      exists: true,
      ok: raw.includes('name:') || raw.includes('on:'),
      bytes: raw.length,
      kind: 'yaml',
    };
  }
  const r = spawnSync(process.execPath, ['--check', abs], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 30000,
  });
  return {
    rel,
    exists: true,
    ok: r.status === 0,
    kind: 'js',
    error: r.status === 0 ? null : (r.stderr || r.stdout || '').slice(0, 400),
  };
}

function selfTest() {
  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'self-test',
    scripts: [],
    workflows: [],
    modules: {},
  };

  for (const rel of DIAG_SCRIPTS) {
    report.scripts.push(syntaxCheck(rel));
  }
  for (const rel of DIAG_WORKFLOWS) {
    report.workflows.push(syntaxCheck(rel));
  }

  // Load key modules
  try {
    const stack = require('../../lib/scraper/FreeScrapeStack');
    report.modules.FreeScrapeStack = {
      ok: typeof stack.freeScrape === 'function' && typeof stack.structuredExtract === 'function',
      exports: Object.keys(stack),
    };
  } catch (e) {
    report.modules.FreeScrapeStack = { ok: false, error: e.message };
  }
  try {
    const pol = require('../../lib/managers/AlarmPolarityManager');
    report.modules.AlarmPolarityManager = {
      ok: typeof pol.applyPolarity === 'function',
      invertedCount: (pol.INVERTED_POLARITY || []).length,
      normalCount: (pol.NORMAL_POLARITY || []).length,
    };
  } catch (e) {
    report.modules.AlarmPolarityManager = { ok: false, error: e.message };
  }

  report.okScripts = report.scripts.filter((s) => s.ok).length;
  report.failScripts = report.scripts.filter((s) => s.exists && !s.ok).length;
  report.missingScripts = report.scripts.filter((s) => !s.exists).length;
  report.okWorkflows = report.workflows.filter((w) => w.ok).length;

  ensureDir(OUT_DIR);
  const out = path.join(OUT_DIR, 'self-test.json');
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(`[diag-orch] self-test scripts ok=${report.okScripts} fail=${report.failScripts} missing=${report.missingScripts}`);
  console.log(`[diag-orch] workflows ok=${report.okWorkflows}/${report.workflows.length} → ${out}`);
  return report;
}

function enrichPolarityHints(scrapeReport) {
  let polarity;
  try {
    polarity = require('../../lib/managers/AlarmPolarityManager');
  } catch (_e) {
    return { error: 'AlarmPolarityManager missing' };
  }
  const issues = scrapeReport?.merged?.issues || [];
  const mfrs = scrapeReport?.merged?.manufacturers || [];
  const textBlob = JSON.stringify(scrapeReport?.focusPostExtract || {}).toLowerCase();
  const hints = [];

  const wantContact = /contact|open|closed|invert/i.test(textBlob) || issues.some((i) => /contact|invert/i.test(i));
  const wantWater = /water|leak|wet|dry/i.test(textBlob) || issues.some((i) => /water|IAS/i.test(i));
  const wantSos = /sos|emergency|panic|button/i.test(textBlob) || issues.some((i) => /SOS/i.test(i));

  for (const mfr of mfrs.slice(0, 30)) {
    const fake = {
      getSetting: () => 'auto',
      getStoreValue: () => null,
      getData: () => ({ manufacturerName: mfr }),
    };
    if (wantContact) {
      const meta = polarity.resolvePolarity(fake, 'contact');
      if (meta.listedInvert || meta.listedNormal) {
        hints.push({ mfr, profile: 'contact', ...meta });
      }
    }
    if (wantWater) {
      const meta = polarity.resolvePolarity(fake, 'water');
      if (meta.listedInvert || meta.listedNormal) {
        hints.push({ mfr, profile: 'water', ...meta });
      }
    }
    if (wantSos) {
      const meta = polarity.resolvePolarity(fake, 'sos');
      if (meta.listedInvert || meta.listedNormal) {
        hints.push({ mfr, profile: 'sos', ...meta });
      }
    }
  }

  return {
    profilesDetected: { contact: wantContact, water: wantWater, sos: wantSos },
    listHits: hints.slice(0, 40),
    settingAdvice: 'Device settings → Alarm polarity: auto | normal | inverted',
  };
}

function loadDiagHints() {
  const p = path.join(SCRAPE_DIR, 'diag-hints.json');
  if (!fs.existsSync(p)) {return { diagnosticCodes: [] };}
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (_e) {
    return { diagnosticCodes: [] };
  }
}

function fetchUuids(uuids) {
  const results = [];
  const list = [...new Set(uuids.map((u) => String(u).toLowerCase()).filter(Boolean))].slice(0, MAX_UUIDS);
  if (!list.length) {
    console.log('[diag-orch] no UUIDs to fetch');
    return results;
  }

  const hasHomey = !!(process.env.HOMEY_REFRESH_TOKEN || process.env.HOMEY_PAT || process.env.HOMEY_PAT_API);
  const hasGmail = !!(process.env.GMAIL_EMAIL && (process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_REFRESH_TOKEN));

  for (const uuid of list) {
    console.log(`[diag-orch] fetch UUID ${uuid}…`);
    const row = { uuid, steps: {} };
    if (hasHomey) {
      row.steps.fetch = runNode('scripts/ci/fetch-homey-app-diag-by-uuid.js', [uuid], { timeoutMs: 180000 });
      row.steps.scan = runNode('scripts/ci/scan-homey-crashes-for-uuid.js', [uuid], { timeoutMs: 180000 });
    } else {
      row.steps.fetch = { ok: false, skipped: true, error: 'no HOMEY_* secrets' };
      row.steps.scan = { ok: false, skipped: true, error: 'no HOMEY_* secrets' };
    }
    if (hasGmail) {
      row.steps.gmail = runNode('scripts/ci/gmail-search-diag-uuid.js', [uuid], { timeoutMs: 120000 });
    } else {
      row.steps.gmail = { ok: false, skipped: true, error: 'no GMAIL_* secrets' };
    }
    const artifact = path.join(DIAG_DIR, `${uuid}.sanitized.json`);
    const artifactRaw = path.join(DIAG_DIR, `${uuid}.json`);
    row.artifact = fs.existsSync(artifact) ? artifact : (fs.existsSync(artifactRaw) ? artifactRaw : null);
    row.foundLocal = !!row.artifact;
    results.push(row);
  }
  return results;
}

async function main() {
  ensureDir(OUT_DIR);
  const started = Date.now();
  const summary = {
    generatedAt: new Date().toISOString(),
    mode: MODE,
    topic: TOPIC,
    focus: FOCUS,
    steps: {},
  };

  if (MODE === 'self-test') {
    summary.selfTest = selfTest();
    summary.elapsedMs = Date.now() - started;
    fs.writeFileSync(path.join(OUT_DIR, 'last-run.json'), JSON.stringify(summary, null, 2));
    const failed = (summary.selfTest.failScripts || 0) > 0
      || !summary.selfTest.modules?.FreeScrapeStack?.ok
      || !summary.selfTest.modules?.AlarmPolarityManager?.ok;
    process.exit(failed ? 1 : 0);
  }

  if (MODE === 'full' || MODE === 'scrape-only') {
    console.log(`[diag-orch] free-scrape topic=${TOPIC} focus=${FOCUS}`);
    const scrape = runNode('tools/ci/free-scrape-crossref.js', [
      `--topic=${TOPIC}`,
      `--focus=${FOCUS}`,
      '--queries=Tuya SOS Homey,water leak IAS,UNSUPPORTED_CLUSTER dimmer,invert alarm polarity',
    ], { timeoutMs: 300000 });
    summary.steps.scrape = {
      ok: scrape.ok,
      code: scrape.code,
      error: scrape.error,
      stderrTail: scrape.stderr,
    };
    const reportPath = path.join(SCRAPE_DIR, 'crossref-report.json');
    if (fs.existsSync(reportPath)) {
      const scrapeReport = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      summary.scrape = {
        okCount: scrapeReport.okCount,
        failCount: scrapeReport.failCount,
        vias: [...new Set((scrapeReport.sources || []).map((s) => s.via).filter(Boolean))],
        diags: scrapeReport.merged?.diagnosticCodes || [],
        sacredCouples: (scrapeReport.sacredCouples || []).length,
      };
      summary.polarity = enrichPolarityHints(scrapeReport);
      fs.writeFileSync(
        path.join(SCRAPE_DIR, 'polarity-hints.json'),
        JSON.stringify(summary.polarity, null, 2),
      );
      // Enrich diag-hints with orchestrator pointer
      const hints = loadDiagHints();
      hints.orchestrator = 'node scripts/ci/diag-investigate-orchestrator.js --fetch-diags';
      hints.polarityHints = path.join(SCRAPE_DIR, 'polarity-hints.json');
      fs.writeFileSync(path.join(SCRAPE_DIR, 'diag-hints.json'), JSON.stringify(hints, null, 2));
    }
  }

  if (MODE === 'full' || MODE === 'fetch-diags') {
    if (SKIP_FETCH) {
      summary.steps.fetch = { skipped: true, reason: '--skip-fetch' };
    } else {
      const hints = loadDiagHints();
      const uuids = UUID_ARG
        ? [UUID_ARG]
        : (hints.diagnosticCodes || []);
      summary.steps.fetch = fetchUuids(uuids);
    }
  }

  summary.elapsedMs = Date.now() - started;
  const out = path.join(OUT_DIR, 'last-run.json');
  fs.writeFileSync(out, JSON.stringify(summary, null, 2));
  console.log(`[diag-orch] done mode=${MODE} → ${out}`);
  if (summary.scrape?.diags?.length) {
    console.log('[diag-orch] diags:', summary.scrape.diags.join(', '));
  }
  if (summary.polarity?.listHits?.length) {
    console.log(`[diag-orch] polarity list hits: ${summary.polarity.listHits.length}`);
  }
}

main().catch((e) => {
  console.error('[diag-orch] FATAL', e.message);
  process.exit(1);
});
