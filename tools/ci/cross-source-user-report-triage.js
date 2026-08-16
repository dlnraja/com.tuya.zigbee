#!/usr/bin/env node
/**
 * cross-source-user-report-triage.js — P184
 *
 * Cross-references the Zigbee identities that REAL USERS mentioned against what
 * the drivers actually claim, using every local evidence source at once:
 *
 *   - GitHub issues and pull requests (cached, refreshed with --fetch)
 *   - Homey community forum scan  (.github/state/forum/forum-media-deep.json)
 *   - Gmail crash diagnostics     (.github/state/gmail-crash-patterns.json)
 *
 * The hard part is signal, not collection. The `[Auto]` community-sync issues
 * carry bulk crawler dumps of a thousand manufacturers each; mixing them with
 * the handful a human actually reported drowns the only rows worth reading. So
 * bot-generated issues are collected but scored separately, and the report
 * leads with human-reported identities.
 *
 * Read-only with respect to the app: it never edits a driver, and it never
 * contacts the forum for anything but the already-cached scan output.
 *
 * Usage:
 *   node tools/ci/cross-source-user-report-triage.js
 *   node tools/ci/cross-source-user-report-triage.js --fetch    # refresh GitHub via gh
 *   node tools/ci/cross-source-user-report-triage.js --json
 *   node tools/ci/cross-source-user-report-triage.js --strict   # exit 1 on human-reported gaps
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const STATE = path.join(ROOT, '.github', 'state');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const REPORT_MD = path.join(ROOT, 'reports', 'CROSS_SOURCE_USER_TRIAGE.md');
const REPORT_JSON = path.join(STATE, 'cross-source-user-triage.json');

const args = process.argv.slice(2);
const FETCH = args.includes('--fetch');
const AS_JSON = args.includes('--json');
const STRICT = args.includes('--strict');

const MFR_RE = /_TZ[A-Z0-9]{0,4}_[a-z0-9]{8}/gi;
const PID_RE = /\bTS[0-9]{3,4}[A-Z]?\b/g;

// Bulk crawler output posing as an issue. Keeps 1,200 machine-harvested
// manufacturers from burying the six a human actually complained about.
const BOT_TITLE = /^\[Auto\]|community-sync|new fingerprints from community/i;

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  } catch (err) {
    return fallback;
  }
}

function fetchGitHub() {
  const run = (a) => JSON.parse(execFileSync('gh', a, { maxBuffer: 1 << 26, encoding: 'utf8' }).replace(/^\uFEFF/, ''));
  const fields = 'number,title,body,state,labels';
  const issues = [
    ...run(['issue', 'list', '--repo', 'dlnraja/com.tuya.zigbee', '--state', 'all', '--limit', '100', '--json', fields]),
  ];
  const prs = run(['pr', 'list', '--repo', 'dlnraja/com.tuya.zigbee', '--state', 'all', '--limit', '60', '--json', fields]);
  fs.mkdirSync(STATE, { recursive: true });
  fs.writeFileSync(path.join(STATE, 'gh-issues-all.json'), JSON.stringify(issues, null, 1));
  fs.writeFileSync(path.join(STATE, 'gh-prs-all.json'), JSON.stringify(prs, null, 1));
  return { issues, prs };
}

function loadGitHub() {
  if (FETCH) {
    try {
      return fetchGitHub();
    } catch (err) {
      console.warn(`[triage] gh fetch failed (${err.message}); falling back to cache`);
    }
  }
  return {
    issues: readJson(path.join(STATE, 'gh-issues-all.json'), null)
      || readJson(path.join(STATE, '_gh-issues-closed.json'), []),
    prs: readJson(path.join(STATE, 'gh-prs-all.json'), null)
      || readJson(path.join(STATE, '_gh-prs.json'), []),
  };
}

/** manufacturerName (lowercased) -> { drivers:Set, sources:Map<source, Set<ref>> } */
const mentions = new Map();

function note(mfr, source, ref, human) {
  const key = String(mfr).toLowerCase();
  if (!mentions.has(key)) mentions.set(key, { sources: new Map(), human: false });
  const entry = mentions.get(key);
  if (!entry.sources.has(source)) entry.sources.set(source, new Set());
  entry.sources.get(source).add(ref);
  if (human) entry.human = true;
}

function harvest(text, source, ref, human) {
  for (const m of String(text || '').match(MFR_RE) || []) note(m, source, ref, human);
}

// ── Sources ────────────────────────────────────────────────────────────────
const { issues, prs } = loadGitHub();
for (const i of issues) {
  const human = !BOT_TITLE.test(String(i.title || ''));
  harvest(`${i.title}\n${i.body}`, 'github-issue', `#${i.number}`, human);
}
for (const p of prs) {
  harvest(`${p.title}\n${p.body}`, 'github-pr', `#${p.number}`, false);
}

const forum = readJson(path.join(STATE, 'forum', 'forum-media-deep.json'), null);
if (forum) harvest(JSON.stringify(forum), 'forum', 'forum-media-deep', true);

const gmail = readJson(path.join(STATE, 'gmail-crash-patterns.json'), null);
if (gmail) harvest(JSON.stringify(gmail), 'gmail-diag', 'crash-patterns', true);

// ── Driver coverage ────────────────────────────────────────────────────────
const driverByMfr = new Map();
const driverMeta = new Map();
for (const entry of fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const compose = readJson(path.join(DRIVERS_DIR, entry.name, 'driver.compose.json'), null);
  if (!compose) continue;
  const zigbee = compose.zigbee || {};
  driverMeta.set(entry.name, { class: compose.class, pids: zigbee.productId || [] });
  for (const mfr of zigbee.manufacturerName || []) {
    const key = String(mfr).toLowerCase();
    if (!driverByMfr.has(key)) driverByMfr.set(key, new Set());
    driverByMfr.get(key).add(entry.name);
  }
}

// mfs_db records the modelIds a manufacturer has actually been observed
// reporting. A driver listing that manufacturer while sharing none of those
// modelIds describes a couple that cannot exist, which separates a genuine
// multi-product manufacturer from a placement left behind by bulk enrichment.
// mfs_db keys the same manufacturer under several case variants, so the model
// lists must be UNIONED. Overwriting instead loses observations and invents
// impossible placements — the same last-write-wins trap fixed for the
// misattribution registry in P179.
const { knownModels, modelEvidence } = (() => {
  const models = new Map();
  const evidence = new Map();
  try {
    const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'mfs_db.json')));
    for (const [key, rec] of Object.entries(db.devices || {})) {
      const k = key.toLowerCase();
      const merged = new Set([...(models.get(k) || []), ...(rec.modelIds || [])]);
      models.set(k, [...merged]);
      const prev = evidence.get(k) || { sources: new Set(), confidence: 0 };
      for (const s of rec.sources || []) prev.sources.add(s);
      prev.confidence = Math.max(prev.confidence, Number(rec.confidence) || 0);
      evidence.set(k, prev);
    }
  } catch (err) { /* optional evidence source */ }
  return { knownModels: models, modelEvidence: evidence };
})();

const rows = [...mentions.entries()].map(([mfr, entry]) => {
  const drivers = [...(driverByMfr.get(mfr) || [])].sort();
  const models = knownModels.get(mfr) || [];
  const placements = drivers.map((d) => {
    const pids = driverMeta.get(d)?.pids || [];
    return { driver: d, class: driverMeta.get(d)?.class, matches: models.filter((m) => pids.includes(m)) };
  });
  return {
    mfr,
    human: entry.human,
    covered: drivers.length > 0,
    driverCount: drivers.length,
    drivers,
    classes: [...new Set(drivers.map((d) => driverMeta.get(d)?.class).filter(Boolean))].sort(),
    knownModels: models,
    evidence: (() => {
      const e = modelEvidence.get(mfr);
      return e ? { sources: [...e.sources], confidence: e.confidence } : { sources: [], confidence: 0 };
    })(),
    placements,
    impossible: models.length ? placements.filter((p) => !p.matches.length).map((p) => p.driver) : [],
    sources: Object.fromEntries([...entry.sources].map(([s, refs]) => [s, [...refs].slice(0, 6)])),
  };
});

const humanRows = rows.filter((r) => r.human);
const humanGaps = humanRows.filter((r) => !r.covered);
const botGaps = rows.filter((r) => !r.human && !r.covered);
// A manufacturer spanning several device classes is where a user ends up with a
// socket showing as a motion sensor, so class spread is the useful signal.
const classSpread = rows.filter((r) => r.classes.length > 1)
  .sort((a, b) => b.classes.length - a.classes.length || b.driverCount - a.driverCount);
const impossiblePlacements = rows.filter((r) => r.impossible.length);

const summary = {
  generatedAt: new Date().toISOString(),
  sources: {
    githubIssues: issues.length,
    githubPrs: prs.length,
    forumScan: Boolean(forum),
    gmailDiagnostics: Boolean(gmail),
  },
  totals: {
    manufacturersMentioned: rows.length,
    humanReported: humanRows.length,
    humanReportedGaps: humanGaps.length,
    botHarvestedGaps: botGaps.length,
    multiClassManufacturers: classSpread.length,
    impossiblePlacements: impossiblePlacements.length,
  },
  humanGaps,
  impossiblePlacements,
  classSpread: classSpread.slice(0, 40),
};

fs.mkdirSync(STATE, { recursive: true });
fs.writeFileSync(REPORT_JSON, JSON.stringify({ ...summary, rows }, null, 1));

const md = [
  '# Cross-source user report triage',
  '',
  `Generated: ${summary.generatedAt}`,
  '',
  `Sources: ${issues.length} GitHub issues, ${prs.length} pull requests, forum scan ${forum ? 'present' : 'absent'}, Gmail diagnostics ${gmail ? 'present' : 'absent'}.`,
  '',
  `Manufacturers mentioned anywhere: **${rows.length}** — of which **${humanRows.length}** appear in a human-written report.`,
  `Human-reported and not claimed by any driver: **${humanGaps.length}**.`,
  `Harvested by bulk crawlers and not claimed: **${botGaps.length}** (expected; these are candidates, not defects).`,
  '',
  '## Human-reported coverage gaps',
  '',
  humanGaps.length
    ? ['| manufacturerName | seen in |', '|---|---|',
      ...humanGaps.map((r) => `| \`${r.mfr}\` | ${Object.entries(r.sources).map(([s, refs]) => `${s} ${refs.join(' ')}`).join('; ')} |`)].join('\n')
    : 'None. Every manufacturer a user reported is claimed by at least one driver.',
  '',
  '## Placements with no observed modelId overlap',
  '',
  'A driver lists this manufacturer but shares none of the modelIds mfs_db has seen it',
  'report, so on current evidence the couple cannot occur. Harmless today — it simply',
  'never matches — but it widens the driver\'s claim surface for nothing.',
  '',
  'Read the evidence column before acting: mfs_db is aggregated from crawlers and a',
  'single low-confidence `local` source can mean the model list is merely incomplete.',
  '',
  impossiblePlacements.length
    ? ['| manufacturerName | observed modelIds | evidence | no overlap in | matched elsewhere |', '|---|---|---|---|---|',
      ...impossiblePlacements.map((r) => `| \`${r.mfr}\` | ${r.knownModels.join(', ')} | ${r.evidence.sources.join('/') || 'none'} (conf ${r.evidence.confidence.toFixed(2)}) | ${r.impossible.join(', ')} | ${r.placements.filter((p) => p.matches.length).map((p) => `${p.driver} (${p.matches.join('/')})`).join(', ') || '—'} |`)].join('\n')
    : 'None.',
  '',
  '## Manufacturers spanning several device classes',
  '',
  'One manufacturer legitimately covers several products, so this is not an error list.',
  'The `matches` column shows which of its observed modelIds each driver actually claims —',
  'when every driver matches something distinct, the spread is the sacred-couple case working as intended.',
  '',
  '| manufacturerName | classes | placements (driver → matched modelIds) |',
  '|---|---|---|',
  ...classSpread.slice(0, 40).map((r) => `| \`${r.mfr}\` | ${r.classes.join(', ')} | ${r.placements.map((p) => `${p.driver} → ${p.matches.join('/') || 'none'}`).join('; ')} |`),
  '',
].join('\n');

fs.mkdirSync(path.dirname(REPORT_MD), { recursive: true });
fs.writeFileSync(REPORT_MD, md);

if (AS_JSON) {
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
} else {
  console.log('[triage] mentioned=%d human=%d humanGaps=%d botGaps=%d multiClass=%d impossible=%d',
    rows.length, humanRows.length, humanGaps.length, botGaps.length, classSpread.length, impossiblePlacements.length);
  for (const r of humanGaps) {
    console.log(`  GAP ${r.mfr} — ${Object.entries(r.sources).map(([s, refs]) => `${s}:${refs.join(',')}`).join(' ')}`);
  }
  for (const r of impossiblePlacements) {
    console.log(`  NO-OVERLAP ${r.mfr} in ${r.impossible.join(',')} — observed ${r.knownModels.join('/')} (sources: ${r.evidence.sources.join(',') || 'none'})`);
  }
  console.log('[triage] report: reports/CROSS_SOURCE_USER_TRIAGE.md');
}

process.exit(STRICT && humanGaps.length ? 1 : 0);
