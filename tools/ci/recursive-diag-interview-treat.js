#!/usr/bin/env node
'use strict';

/**
 * recursive-diag-interview-treat.js
 *
 * Same methodology as manual f647d35b paste-analysis, applied recursively to:
 *   - local diag excerpts / homey-app-diag dumps
 *   - Gmail plaintext dumps under .github/state/diag-recursive-inbox/bodies/
 *   - docs/data/DEVICE_INTERVIEWS.json
 *
 * READ-ONLY on drivers. Writes sanitized TREAT report only (no raw Gmail commit).
 *
 * Usage:
 *   node tools/ci/recursive-diag-interview-treat.js
 *   node tools/ci/recursive-diag-interview-treat.js --out=reports/diag-recursive-treat-2026-08-24
 */

const fs = require('fs');
const path = require('path');
const { enrich } = require('../../lib/diagnostics/DiagContentEnricher');
const { lookup, isForbiddenDriver } = require('../../lib/pairing/UserMisattributionRegistry');

const ROOT = path.resolve(__dirname, '..', '..');
const outArg = process.argv.find((a) => a.startsWith('--out='));
const OUT = outArg
  ? path.resolve(ROOT, outArg.split('=')[1])
  : path.join(ROOT, 'reports', `diag-recursive-treat-${new Date().toISOString().slice(0, 10)}`);

const DEEP_SIGNALS = [
  { id: 'd101_no_mfr', severity: 'high', re: /D101:\s*No manufacturerName/i, rootCause: 'ensureManufacturerSettings before zclNode / sleepy blank settings', fix: 'Assign zclNode before ensure; DIAG via ManufacturerNameHelper; re-pair while pressing', track: 'BOTH' },
  { id: 'd102_no_pid', severity: 'high', re: /D102:\s*No productId/i, rootCause: 'productId never persisted to zb_model_id', fix: 'Same as D101 + interview for sacred couple', track: 'BOTH' },
  { id: 'ias_storm_button', severity: 'high', re: /\[Driver:button_[^\]]+\].{0,80}\[SDK3-IAS\].{0,120}Zone Enroll|\[Driver:button_[^\]]+\].{0,200}Het apparaat reageert niet/i, rootCause: 'Proactive IAS enroll on sleepy wireless button', fix: 'Skip proactive IAS for wireless button/remote drivers', track: 'BOTH' },
  { id: 'dcm_onoff_on_button', severity: 'high', re: /\[Driver:button_[^\]]+\].{0,200}\[DCM-FB\]\s*\+\s*onoff/i, rootCause: 'DynamicCapabilityManager fallback adds switch onoff on button', fix: '_isIrrelevantCap rejects onoff on button drivers', track: 'BOTH' },
  { id: 'dp_adapt_not_found', severity: 'low', re: /\[DP-ADAPT\]\s*Save patterns failed:\s*Not Found:\s*Device/i, rootCause: 'DPAdaptationEngine store race after device delete', fix: 'Soft-log DP-ADAPT Not Found (no stderr spam)', track: 'BOTH' },
  { id: 'wrong_smart_rcbo', severity: 'critical', re: /\[Driver:smart_rcbo\].{0,400}_TZE284_6[0o]cnqlhn|_TZE284_6[0o]cnqlhn.{0,120}smart_rcbo|smart_rcbo.{0,80}6[0o]cnqlhn/i, rootCause: 'Tongou DIN meter stolen by smart_rcbo (6ocnqlhn / OCR 60cnqlhn)', fix: 'Lock _TZE284_6ocnqlhn+TS0601 → din_rail_meter; user update+re-pair', track: 'BOTH' },
  { id: 'dyn_cap_humidity_on_meter', severity: 'high', re: /\[Driver:smart_rcbo\].{0,80}\[DYN-CAP\]\s*measure_humidity/i, rootCause: 'DYN-CAP maps meter DP6 raw → humidity on wrong driver', fix: 'din_rail_meter DP profile; block humidity on RCBO/DIN', track: 'BOTH' },
  { id: 'battery_health_token', severity: 'medium', re: /battery_health_changed.*Expected number but got undefined|health_score.*undefined/i, rootCause: 'battery_health_changed flow token missing number', fix: 'Guard health_score before flow trigger', track: 'BOTH' },
  { id: 'dcm_audit_crash', severity: 'critical', re: /auditCapabilities is not a function|getDiscoveries is not a function/i, rootCause: 'DCM method missing on BaseUnifiedDevice path (stable-era crash)', fix: 'Guard dynamicCapabilityManager calls; ensure DCM init', track: 'BOTH' },
  { id: 'sos_no_press_flow', severity: 'high', re: /SOS buttons not receiving button press|SOS.*not receiving.*press/i, rootCause: 'SOS awake but flow press not firing', fix: 'button_emergency_sos physical path + IAS enroll on wake', track: 'BOTH' },
  { id: 'physical_vs_virtual_button', severity: 'high', re: /physical doesn.?t work|physical doesnt work|but digitally|virtual press/i, rootCause: 'Physical button path silent; virtual/UI works', fix: '0xFD/0xFC PhysicalButtonMixin; re-pair while pressing', track: 'BOTH' },
  { id: 'flow_guard_spam', severity: 'medium', re: /FLOW-GUARD|Invalid Flow Card ID|flow card id/i, rootCause: 'Stale or mismatched flow card IDs', fix: 'Hashed flow resolve / compose ID audit', track: 'BOTH' },
  { id: 'bind_fail_sleepy', severity: 'medium', re: /bind:\s*❌|INVALID_EP|Could not retrieve coordinator IEEE/i, rootCause: 'Sleepy end-device bind/IEEE noise', fix: 'Skip genPowerCfg bind on IAS-only; wake-on-press', track: 'BOTH' },
  { id: 'processing_failed', severity: 'low', re: /processing_failed|socket hang up/i, rootCause: 'Athom publish transient (P139)', fix: 'Do not spam republish; wait cooldown', track: 'CI' },
  { id: 'heap_oom', severity: 'critical', re: /JavaScript heap out of memory|FATAL ERROR:.*heap|Ineffective mark-compacts near heap limit|Allocation failed - JavaScript heap/i, rootCause: 'Homey 64MB heap OOM', fix: 'Buffer JSON load + LiveData caps', track: 'BOTH' },
  { id: 'ias_object_coerce', severity: 'high', re: /0x\[object Object\]|Zone status change:\s*0x\[object/i, rootCause: 'zoneStatus Buffer/object not coerced', fix: 'IASZoneEnhanced coerce', track: 'BOTH' },
  { id: 'ef00_leftover_ias', severity: 'medium', re: /TUYA 0xEF00 FRAME RECEIVED[\s\S]{0,160}\[Driver:(?:water_leak|contact_sensor|button_emergency)/i, rootCause: 'Leftover EF00 TX on IAS-only sleepy', fix: 'shouldSkipIasOnlyEf00Tx', track: 'BOTH' },
  { id: 'scene_0x8004', severity: 'medium', re: /0x8004|DeviceOperatingMode|Unsupported Attribute/i, rootCause: 'TS004x scene mode attribute probe', fix: 'Skip 0x8004 for known scene/button mfrs', track: 'BOTH' },
  { id: 'battery_spike', severity: 'medium', re: /Set battery:\s*\d+%[\s\S]{0,300}Set battery:\s*\d+%/i, rootCause: 'Battery % flip spam', fix: 'UnifiedBatteryHandler anti-flood / SOS debounce', track: 'BOTH' },
];

function norm(s) {
  return String(s || '').trim().toLowerCase();
}

function loadTruth() {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/knowledge/device-truth.json'), 'utf8'));
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

function deepSignals(text) {
  return DEEP_SIGNALS.filter((s) => s.re.test(text)).map(({ id, severity, rootCause, fix, track }) => ({
    id, severity, rootCause, fix, track,
  }));
}

function collectTextSources() {
  const sources = [];
  const pushFile = (file, kind) => {
    try {
      const raw = fs.readFileSync(file, 'utf8');
      let text = raw;
      if (file.endsWith('.json')) {
        try {
          const j = JSON.parse(raw);
          text = typeof j === 'string' ? j : JSON.stringify(j);
          if (j.stdout || j.stderr || j.body || j.stack || j.rawStack) {
            text = [j.stdout, j.stderr, j.body, j.stack, j.rawStack, j.userMessage, j.message]
              .filter(Boolean).join('\n');
          }
          if (Array.isArray(j.stackTraces)) text += `\n${j.stackTraces.join('\n')}`;
        } catch { /* keep raw */ }
      }
      if (text.length < 40) return;
      sources.push({
        kind,
        path: path.relative(ROOT, file).replace(/\\/g, '/'),
        text,
      });
    } catch { /* skip */ }
  };

  const walk = (dir, kind, pred) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (/node_modules|\.git|from-auto-analysis/.test(e.name)) continue;
        walk(p, kind, pred);
      } else if (pred(e.name, p)) pushFile(p, kind);
    }
  };

  // WHY: never re-ingest generated TREAT/SUMMARY (cross-contaminates couples from markdown tables)
  walk(path.join(ROOT, 'reports'), 'local_report', (n, p) => {
    if (/diag-recursive-treat-/i.test(p)) return false;
    return /diag-.*excerpt\.txt$/i.test(n) || /DIAG_FIXES\.md$/i.test(n);
  });
  walk(path.join(ROOT, '.github/state/homey-app-diag'), 'homey_app_diag', (n) =>
    /\.(sanitized\.json|raw-stack\.txt|summary\.json)$/i.test(n) || (/^[a-f0-9-]{36}\.json$/i.test(n) && !/\.sanitized/.test(n)));
  walk(path.join(ROOT, '.github/state/diag-recursive-inbox/bodies'), 'gmail_body', (n) => /\.txt$/i.test(n));
  walk(path.join(ROOT, 'reports/gmail-diags-2026-08-24'), 'gmail_treat', (n) => /SUMMARY\.json$/i.test(n));

  // DEVICE_INTERVIEWS — expand each interview entry as its own source
  const ivPath = path.join(ROOT, 'docs/data/DEVICE_INTERVIEWS.json');
  if (fs.existsSync(ivPath)) {
    try {
      const db = JSON.parse(fs.readFileSync(ivPath, 'utf8'));
      const buckets = db.interviews || {};
      for (const [cat, list] of Object.entries(buckets)) {
        if (!Array.isArray(list)) continue;
        for (const iv of list) {
          const mfr = iv.manufacturerName || iv.mfr || '';
          const pid = iv.modelId || iv.productId || iv.pid || '';
          const text = [
            `Interview ${iv.id || ''}`,
            `category=${cat}`,
            `deviceName=${iv.deviceName || ''}`,
            `manufacturerName=${mfr}`,
            `modelId=${pid}`,
            `driver=${iv.driver || iv.suggestedDriver || ''}`,
            JSON.stringify(iv).slice(0, 4000),
          ].join('\n');
          sources.push({
            kind: 'interview',
            path: `docs/data/DEVICE_INTERVIEWS.json#${iv.id || cat}`,
            text,
            interview: { id: iv.id, cat, mfr, pid, driver: iv.driver || iv.suggestedDriver || null },
          });
        }
      }
    } catch (e) {
      console.warn('[recursive-treat] interview load failed', e.message);
    }
  }

  return sources;
}

function analyzeSource(src, truth, interviewByDriver) {
  const en = enrich(src.text);
  const deep = deepSignals(src.text);
  const couples = (en.couples || []).map((c) => {
    const reg = lookup(c.mfr, c.pid);
    const truthDriver = truthDriverFor(truth, c.mfr, c.pid);
    const canonical = reg?.canonicalDriver || truthDriver || null;
    const forbidden = (reg?.forbiddenDrivers || []).filter((d) => isForbiddenDriver(c.mfr, c.pid, d));
    return {
      mfr: c.mfr,
      pid: c.pid,
      canonicalDriver: canonical,
      forbiddenDrivers: forbidden,
      confidence: src.kind === 'interview' && c.mfr && c.pid ? 'interview_locked' : (c.mfr && c.pid ? 'in_log' : 'absent'),
    };
  });

  if (src.interview?.mfr && src.interview?.pid && !couples.some((c) => norm(c.mfr) === norm(src.interview.mfr))) {
    const c = { mfr: src.interview.mfr, pid: src.interview.pid };
    const reg = lookup(c.mfr, c.pid);
    couples.unshift({
      mfr: c.mfr,
      pid: c.pid,
      canonicalDriver: reg?.canonicalDriver || truthDriverFor(truth, c.mfr, c.pid) || src.interview.driver,
      forbiddenDrivers: [],
      confidence: 'interview_locked',
    });
  }

  // WHY (P2246): when D101/D102 leave couple ABSENT, derive ONLY from interview rows
  // for drivers present in the log — never invent a pid. Soft when >1 interview hit.
  let derived = [];
  if (couples.length === 0 && (en.drivers || []).length) {
    const hits = [];
    for (const drv of en.drivers) {
      const rows = interviewByDriver.get(norm(drv)) || [];
      for (const r of rows) {
        if (!r.mfr || !r.pid) continue;
        if (/^unknown$/i.test(r.mfr) || /^unknown$/i.test(r.pid)) continue;
        hits.push({
          mfr: r.mfr,
          pid: r.pid,
          canonicalDriver: r.driver || drv,
          forbiddenDrivers: [],
          confidence: rows.length === 1 ? 'derived_interview' : 'derived_interview_soft',
          sourceInterview: r.id || null,
        });
      }
    }
    const seen = new Set();
    derived = hits.filter((h) => {
      const k = `${norm(h.mfr)}|${norm(h.pid)}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).slice(0, 6);
    for (const d of derived) couples.push(d);
  }

  const coupleAbsent = couples.length === 0 && /D101|D102|button_wireless|Smartbutton|smart button/i.test(src.text);

  return {
    source: src.path,
    kind: src.kind,
    logId: en.logIdShort || (src.path.match(/([a-f0-9]{8})/i) || [])[1] || null,
    appVersion: en.meta?.appVersion || null,
    userMessage: en.userMessage || null,
    drivers: en.drivers || [],
    deviceIds: en.deviceIds || [],
    couples,
    coupleAbsent,
    derivedCoupleCount: derived.length,
    signals: [...(en.signals || []).map((s) => ({ id: s.id, severity: s.severity, fix: s.fix, track: 'BOTH' })), ...deep],
    highlights: (en.highlights || []).slice(0, 6),
    summary: en.summary || null,
    interviewId: src.interview?.id || null,
  };
}

function dedupeKey(row) {
  if (row.logId) return `log:${row.logId}`;
  if (row.interviewId) return `iv:${row.interviewId}`;
  return `src:${row.source}`;
}

function severityRank(s) {
  return ({ critical: 0, high: 1, medium: 2, low: 3 }[s] ?? 9);
}

function loadInterviewByDriver() {
  const map = new Map();
  const ivPath = path.join(ROOT, 'docs/data/DEVICE_INTERVIEWS.json');
  if (!fs.existsSync(ivPath)) return map;
  try {
    const db = JSON.parse(fs.readFileSync(ivPath, 'utf8'));
    for (const list of Object.values(db.interviews || {})) {
      if (!Array.isArray(list)) continue;
      for (const iv of list) {
        const driver = iv.driver || iv.suggestedDriver || '';
        const mfr = iv.manufacturerName || iv.mfr || '';
        const pid = iv.modelId || iv.productId || iv.pid || '';
        if (!driver || !mfr || !pid) continue;
        const key = norm(driver);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push({ id: iv.id, mfr, pid, driver });
      }
    }
  } catch { /* ignore */ }
  return map;
}

function main() {
  const truth = loadTruth();
  const interviewByDriver = loadInterviewByDriver();
  const sources = collectTextSources();
  console.log('[recursive-treat] sources:', sources.length);

  const analyzed = sources.map((s) => analyzeSource(s, truth, interviewByDriver));
  const byKey = new Map();
  for (const row of analyzed) {
    const k = dedupeKey(row);
    const prev = byKey.get(k);
    if (!prev || (row.signals.length + row.couples.length) > (prev.signals.length + prev.couples.length)) {
      byKey.set(k, row);
    }
  }
  const unique = [...byKey.values()].sort((a, b) => {
    const sa = Math.min(...(a.signals.map((x) => severityRank(x.severity)).concat([9])));
    const sb = Math.min(...(b.signals.map((x) => severityRank(x.severity)).concat([9])));
    return sa - sb || String(b.logId || '').localeCompare(String(a.logId || ''));
  });

  const signalTally = {};
  const actionable = [];
  for (const row of unique) {
    for (const s of row.signals) signalTally[s.id] = (signalTally[s.id] || 0) + 1;
    if (row.signals.length || row.coupleAbsent || row.couples.some((c) => c.forbiddenDrivers?.length)) {
      actionable.push(row);
    }
  }

  const interviewCouples = unique
    .filter((r) => r.kind === 'interview' && r.couples.length)
    .map((r) => ({
      id: r.interviewId,
      couple: r.couples[0] ? `${r.couples[0].mfr}+${r.couples[0].pid}` : null,
      driver: r.couples[0]?.canonicalDriver || null,
      source: r.source,
    }));

  fs.mkdirSync(OUT, { recursive: true });
  const summary = {
    generatedAt: new Date().toISOString(),
    methodology: 'f647d35b-style full-body recursive treat — sacred couple never invented; P2246 derive from interview when ABSENT',
    sourcesScanned: sources.length,
    uniqueCases: unique.length,
    actionable: actionable.length,
    derivedFromInterview: unique.filter((r) => (r.derivedCoupleCount || 0) > 0).length,
    signalTally,
    gmailBodiesPresent: sources.filter((s) => s.kind === 'gmail_body').length,
    interviews: interviewCouples.length,
  };
  fs.writeFileSync(path.join(OUT, 'SUMMARY.json'), `${JSON.stringify(summary, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT, 'CASES.json'), `${JSON.stringify({ cases: unique }, null, 2)}\n`);

  const lines = [
    `# Recursive diag + interview treat — ${new Date().toISOString().slice(0, 10)}`,
    '',
    'Silent enrichment only. Same methodology as manual `f647d35b` paste analysis.',
    '**Never invent** manufacturerName+productId. Couple ABSENT stays ABSENT.',
    '',
    `Sources scanned: **${sources.length}** · Unique cases: **${unique.length}** · Actionable: **${actionable.length}** · Interview couples: **${interviewCouples.length}** · Gmail bodies ingested: **${summary.gmailBodiesPresent}**`,
    '',
    '## Signal tally',
    '',
    '| Signal | Count |',
    '|--------|------:|',
  ];
  for (const [id, n] of Object.entries(signalTally).sort((a, b) => b[1] - a[1])) {
    lines.push(`| \`${id}\` | ${n} |`);
  }
  if (!Object.keys(signalTally).length) lines.push('| — | 0 |');

  lines.push('', '## Actionable cases (deep root cause)', '');
  for (const row of actionable.slice(0, 80)) {
    lines.push(`### ${row.logId || row.interviewId || path.basename(row.source)} (${row.kind})`);
    lines.push('');
    lines.push(`- **Source:** \`${row.source}\``);
    if (row.appVersion) lines.push(`- **App:** ${row.appVersion}`);
    if (row.userMessage) lines.push(`- **User:** ${row.userMessage}`);
    if (row.drivers.length) lines.push(`- **Drivers:** ${row.drivers.join(', ')}`);
    if (row.coupleAbsent) lines.push('- **Couple:** **ABSENT** (do not invent / do not glue known TS0041 couples)');
    else if (row.couples.length) {
      lines.push(`- **Couples:** ${row.couples.map((c) => `\`${c.mfr}+${c.pid}\` → ${c.canonicalDriver || '?'} (${c.confidence})`).join('; ')}`);
      for (const c of row.couples.filter((x) => x.forbiddenDrivers?.length)) {
        lines.push(`  - Forbidden: ${c.forbiddenDrivers.join(', ')}`);
      }
    } else {
      lines.push('- **Couple:** none in text');
    }
    if (row.signals.length) {
      lines.push('- **Root causes:**');
      for (const s of row.signals) {
        lines.push(`  - \`${s.id}\` [${s.severity}/${s.track || 'BOTH'}] — ${s.rootCause || s.fix}`);
        if (s.fix && s.rootCause) lines.push(`    - Fix: ${s.fix}`);
      }
    }
    lines.push('');
  }

  lines.push('## Interview sacred couples (from DEVICE_INTERVIEWS)', '');
  lines.push('| ID | Couple | Driver |');
  lines.push('|----|--------|--------|');
  for (const iv of interviewCouples.slice(0, 120)) {
    lines.push(`| ${iv.id || '—'} | \`${iv.couple || '—'}\` | ${iv.driver || '—'} |`);
  }
  if (!interviewCouples.length) lines.push('| — | — | — |');

  lines.push('', '## Next (ops)', '');
  lines.push('1. Drop Gmail PLAIN_TEXT bodies into `.github/state/diag-recursive-inbox/bodies/*.txt` then re-run this script.');
  lines.push('2. CI with secrets: `npm run diag:gmail:history` then re-run.');
  lines.push('3. Ship BOTH-track fixes already identified; user update + re-pair when couple was ABSENT.');
  lines.push('4. Never commit raw bodies; keep reports sanitized.', '');

  fs.writeFileSync(path.join(OUT, 'TREAT.md'), `${lines.join('\n')}\n`);
  console.log('[recursive-treat] wrote', OUT);
  console.log(JSON.stringify(summary, null, 2));
}

main();
