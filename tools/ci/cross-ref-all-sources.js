// cross-ref-all-sources.js — extract mfr+PID from ALL sources and find new combinations
// P2231/P2232: blakadder, z2m, zha, deconz, forum, gmail, github-own, interview, device-truth
'use strict';

const fs = require('fs');
const path = require('path');
const {
  normalizeSacredCouple,
  extractCouplesFromText,
  isValidSacredCouple,
} = require('./sacred-couple-pair');

const ROOT = path.resolve(__dirname, '..', '..');
const mfrPidPairs = new Map(); // key = "mfr|pid" -> { sources: Set, devices: [] }

function addPair(mfr, pid, source, info = {}) {
  const n = normalizeSacredCouple(mfr, pid);
  if (!n) return;
  if (!mfrPidPairs.has(n.key)) {
    mfrPidPairs.set(n.key, { mfr: n.mfr, pid: n.pid, sources: new Set(), info: [] });
  }
  const entry = mfrPidPairs.get(n.key);
  entry.sources.add(source);
  if (Object.keys(info).length) entry.info.push({ source, ...info });
}

function readJson(relOrAbs) {
  const fp = path.isAbsolute(relOrAbs) ? relOrAbs : path.join(ROOT, relOrAbs);
  if (!fs.existsSync(fp)) return null;
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch {
    return null;
  }
}

function firstExisting(rels) {
  for (const r of rels) {
    const fp = path.join(ROOT, r);
    if (fs.existsSync(fp)) return fp;
  }
  return null;
}

// ============== SOURCE 1: JOHAN ISSUES ==============
function processJohan() {
  const issueFile = path.join(ROOT, '.github', 'state', 'johan-dump', 'issues.json');
  if (!fs.existsSync(issueFile)) return 0;
  const issues = JSON.parse(fs.readFileSync(issueFile, 'utf8'));
  let count = 0;
  for (const iss of issues) {
    const text = `${iss.title || ''}\n${iss.body || ''}`;
    for (const c of extractCouplesFromText(text)) {
      addPair(c.mfr, c.pid, 'johan-issue', { issue: iss.number });
      count++;
    }
  }
  return count;
}

// ============== SOURCE 2: JOHAN COMMENTS ==============
function processJohanComments() {
  const file = path.join(ROOT, '.github', 'state', 'johan-dump', 'comments.json');
  if (!fs.existsSync(file)) return 0;
  const comments = JSON.parse(fs.readFileSync(file, 'utf8'));
  let count = 0;
  for (const c of comments) {
    for (const pair of extractCouplesFromText(c.body || '')) {
      addPair(pair.mfr, pair.pid, 'johan-comment', { comment: c.id });
      count++;
    }
  }
  return count;
}

// ============== SOURCE 3: GMAIL / DIAG LOGS ==============
function processGmail() {
  const diagPath = firstExisting([
    '.github/state/diagnostics-report.json',
    '.github/state/gmail-diagnostics/diagnostics-report.json',
    '.github/state/gmail-2026-07-13-12pm/.github/state/diagnostics-report.json',
  ]);
  const aggPath = path.join(ROOT, '.github', 'state', 'emails-aggregate.json');
  let emails = [];
  let label = 'none';
  if (diagPath) {
    const data = readJson(diagPath) || {};
    emails = data.diagnostics || [];
    label = path.relative(ROOT, diagPath);
  } else if (fs.existsSync(aggPath)) {
    const data = readJson(aggPath) || {};
    emails = data.emails || [];
    label = 'emails-aggregate';
  } else {
    return 0;
  }
  console.log(`  Gmail/diag source: ${label} (${emails.length})`);
  let count = 0;
  for (const e of emails) {
    const mfrs = e.fps?.mfr || [];
    const pids = e.fps?.pid || [];
    // Prefer index-aligned pairs; never cartesian-explode mfr×pid
    const n = Math.max(mfrs.length, pids.length);
    for (let i = 0; i < n; i++) {
      const mfr = mfrs[i] || (mfrs.length === 1 ? mfrs[0] : null);
      const pid = pids[i] || (pids.length === 1 ? pids[0] : null);
      if (mfr && pid) {
        addPair(mfr, pid, 'gmail', { type: e.type, date: e.date, id: e.id });
        count++;
      }
    }
    // xref: single mfr + single pid in same mail → sacred couple
    const xref = Array.isArray(e.xref) ? e.xref : [];
    const xm = xref.filter((x) => x && x.type === 'mfr' && x.fingerprint).map((x) => x.fingerprint);
    const xp = xref.filter((x) => x && x.type === 'pid' && x.fingerprint).map((x) => x.fingerprint);
    if (xm.length === 1 && xp.length === 1) {
      addPair(xm[0], xp[0], 'gmail', { type: e.type, via: 'xref', id: e.id });
      count++;
    }
    for (const c of extractCouplesFromText(JSON.stringify({
      subj: e.subj, errs: e.errs, ai: e.ai, forumInfo: e.forumInfo, crashInfo: e.crashInfo,
    }))) {
      addPair(c.mfr, c.pid, 'gmail', { type: e.type, via: 'text', id: e.id });
      count++;
    }
  }
  return count;
}

// ============== SOURCE 3b: GMAIL CRASH PATTERNS ==============
function processGmailCrash() {
  const data = readJson('.github/state/gmail-crash-patterns.json');
  if (!data) return 0;
  let count = 0;
  const bags = [...(data.hits || []), ...(data.watch || []), ...(data.knownFixed || [])];
  for (const h of bags) {
    const sacred = h.sacred || {};
    const mfrs = sacred.mfrs || [];
    const pids = sacred.pids || [];
    if (mfrs.length === 1 && pids.length === 1) {
      addPair(mfrs[0], pids[0], 'gmail-crash', { pattern: h.pattern, status: h.status });
      count++;
    }
    for (const c of extractCouplesFromText(`${h.fix || ''} ${h.pattern || ''} ${JSON.stringify(h)}`)) {
      addPair(c.mfr, c.pid, 'gmail-crash', { pattern: h.pattern });
      count++;
    }
  }
  return count;
}

// ============== SOURCE 4: CANONICAL FINGERPRINTS ==============
function processCanonical() {
  const file = 'lib/tuya/fingerprints.json';
  if (!fs.existsSync(file)) return 0;
  const fps = JSON.parse(fs.readFileSync(file, 'utf8'));
  let count = 0;
  for (const [mfr, info] of Object.entries(fps)) {
    const pids = info.modelIds || [];
    for (const pid of pids) {
      addPair(mfr, pid, 'canonical', { driver: info.driverId });
      count++;
    }
  }
  return count;
}

// ============== SOURCE 5: MFS_DB ==============
function processMfsDb() {
  const file = 'data/mfs_db.json';
  if (!fs.existsSync(file)) return 0;
  const mfs = JSON.parse(fs.readFileSync(file, 'utf8'));
  let count = 0;
  for (const [did, dev] of Object.entries(mfs.devices || {})) {
    const mfr = dev.manufacturerId;
    const pids = dev.modelIds || [];
    for (const pid of pids) {
      addPair(mfr, pid, 'mfs_db', { deviceType: dev.deviceType, driverHint: dev.driverHint });
      count++;
    }
  }
  return count;
}

// ============== SOURCE 6: DRIVERS ==============
function processDrivers() {
  const driversDir = 'drivers';
  if (!fs.existsSync(driversDir)) return 0;
  let count = 0;
  const drivers = fs.readdirSync(driversDir).filter(d => fs.statSync(path.join(driversDir, d)).isDirectory());
  for (const d of drivers) {
    const composeFile = path.join(driversDir, d, 'driver.compose.json');
    if (!fs.existsSync(composeFile)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
      if (!data.zigbee) continue;
      const mfrs = data.zigbee.manufacturerName || [];
      const pids = data.zigbee.productId || [];
      for (const mfr of mfrs) {
        for (const pid of pids) {
          addPair(mfr, pid, 'driver', { driver: d });
          count++;
        }
      }
    } catch (e) {}
  }
  return count;
}

// ============== SOURCE 7: BLAKADDER ==============
function processBlakadder() {
  const file = path.join(ROOT, 'scripts', 'sync', 'data', 'blakadder.json');
  if (!fs.existsSync(file)) return 0;
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  let count = 0;
  for (const fp of data.fingerprints || []) {
    if (!fp.mfr || !fp.productId) continue;
    addPair(fp.mfr, fp.productId, 'blakadder', {
      vendor: fp.vendor,
      category: fp.category,
      slug: fp.blakadderSlug,
    });
    count++;
  }
  return count;
}

// ============== SOURCE 8: Z2M ==============
function processZ2m() {
  const file = path.join(ROOT, 'scripts', 'sync', 'data', 'z2m.json');
  if (!fs.existsSync(file)) return 0;
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  let count = 0;
  for (const fp of data.fingerprints || []) {
    if (!fp.mfr || !fp.productId) continue;
    addPair(fp.mfr, fp.productId, 'z2m', { vendor: fp.vendor, file: fp.file });
    count++;
  }
  return count;
}

// ============== SOURCE 9: ZHA ==============
function processZha() {
  const file = path.join(ROOT, 'scripts', 'sync', 'data', 'zha.json');
  if (!fs.existsSync(file)) return 0;
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  let count = 0;
  for (const fp of data.fingerprints || []) {
    if (!fp.mfr || !fp.productId) continue;
    if (!isValidSacredCouple(fp.mfr, fp.productId)) continue;
    addPair(fp.mfr, fp.productId, 'zha', { file: fp.file });
    count++;
  }
  return count;
}

// ============== SOURCE 10: DECONZ ==============
function processDeconz() {
  const file = path.join(ROOT, 'scripts', 'sync', 'data', 'deconz.json');
  if (!fs.existsSync(file)) return 0;
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  let count = 0;
  for (const fp of data.fingerprints || data.devices || []) {
    const mfr = fp.mfr || fp.manufacturerName;
    const pid = fp.productId || fp.modelId;
    if (!mfr || !pid) continue;
    addPair(mfr, pid, 'deconz', { model: fp.model });
    count++;
  }
  return count;
}

// ============== SOURCE 11: FORUM SHADOW ==============
function processForum() {
  // Canonical state only — skip local reports/ dumps (may contain heuristic cartesian noise)
  const file = path.join(ROOT, '.github', 'state', 'forum', 'couples-extracted.json');
  if (!fs.existsSync(file)) return 0;
  let data;
  try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return 0; }
  const list = Array.isArray(data) ? data : (data.couples || data.items || []);
  let count = 0;
  for (const c of list) {
    const mfr = c.mfr || c.manufacturerName;
    const pid = c.pid || c.productId || c.modelId;
    if (!mfr || !pid) continue;
    // Skip low-confidence heuristic extractions
    if (Number(c.sourceCount || 0) < 1) continue;
    addPair(mfr, pid, 'forum', { topicId: c.topicId, sourceCount: c.sourceCount });
    count++;
  }
  return count;
}

// ============== SOURCE 12: DEVICE INTERVIEWS (project knowledge) ==============
function processInterviews() {
  const data = readJson('docs/data/DEVICE_INTERVIEWS.json');
  if (!data || !data.interviews) return 0;
  let count = 0;
  for (const [, rows] of Object.entries(data.interviews)) {
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      const mfr = row.manufacturerName || row.mfr;
      const pid = row.productId || row.pid || row.modelId;
      if (!mfr || !pid || String(mfr).includes('*')) continue;
      addPair(mfr, pid, 'interview', {
        id: row.id,
        status: row.status,
        driver: row.driver || null,
        deviceName: row.deviceName,
      });
      count++;
    }
  }
  // Optional per-file interviews under docs/data/interviews (JSON only)
  const idir = path.join(ROOT, 'docs', 'data', 'interviews');
  if (fs.existsSync(idir)) {
    for (const name of fs.readdirSync(idir)) {
      if (!name.endsWith('.json')) continue;
      const one = readJson(path.join(idir, name));
      if (!one || typeof one !== 'object') continue;
      const mfr = one.manufacturerName || one.mfr;
      const pid = one.productId || one.pid || one.modelId;
      if (mfr && pid && !String(mfr).includes('*')) {
        addPair(mfr, pid, 'interview', { file: name, driver: one.driver || null, status: one.status });
        count++;
      }
      for (const c of extractCouplesFromText(JSON.stringify(one))) {
        addPair(c.mfr, c.pid, 'interview', { file: name, via: 'text' });
        count++;
      }
    }
  }
  return count;
}

// ============== SOURCE 13: DEVICE-TRUTH LOCKS ==============
function processDeviceTruth() {
  const data = readJson('docs/knowledge/device-truth.json');
  if (!data || !data.drivers) return 0;
  let count = 0;
  for (const [driverId, d] of Object.entries(data.drivers)) {
    for (const lock of d.locks || []) {
      const mfrs = Array.isArray(lock.mfr) ? lock.mfr : (lock.mfr ? [lock.mfr] : []);
      const pids = Array.isArray(lock.productId) ? lock.productId : (lock.productId ? [lock.productId] : []);
      for (const mfr of mfrs) {
        if (String(mfr).includes('*')) continue;
        for (const pid of pids) {
          addPair(mfr, pid, 'device-truth', {
            driver: driverId,
            caseId: lock.caseId,
            forbidden: lock.forbidden || [],
          });
          count++;
        }
      }
    }
  }
  return count;
}

// ============== SOURCE 14: OWN GITHUB INTEL (issues/PRs respond reports) ==============
function processGithubOwn() {
  const reportsDir = path.join(ROOT, 'reports');
  if (!fs.existsSync(reportsDir)) return 0;
  let count = 0;
  for (const name of fs.readdirSync(reportsDir)) {
    if (!/^github-intel-/i.test(name)) continue;
    const reportPath = path.join(reportsDir, name, 'respond-report.json');
    const data = readJson(reportPath);
    if (!data) continue;
    for (const action of data.actions || []) {
      for (const c of action.couples || []) {
        if (!c.mfr || !c.pid) continue;
        addPair(c.mfr, c.pid, 'github-own', {
          issue: action.number,
          driver: c.driver || null,
          status: c.status,
          note: c.note,
        });
        count++;
      }
      for (const pair of extractCouplesFromText(action.preview || '')) {
        addPair(pair.mfr, pair.pid, 'github-own', { issue: action.number, via: 'preview' });
        count++;
      }
    }
  }
  // Local state intel if present
  const stateIntel = readJson('.github/state/github-intel/respond-report.json');
  if (stateIntel) {
    for (const action of stateIntel.actions || []) {
      for (const c of action.couples || []) {
        if (!c.mfr || !c.pid) continue;
        addPair(c.mfr, c.pid, 'github-own', { issue: action.number, driver: c.driver });
        count++;
      }
    }
  }
  return count;
}

// ============== MAIN ==============
console.log('=== CROSS-REFERENCING ALL SOURCES ===\n');
console.log('Processing sources...');

const counts = {
  johan_issues: processJohan(),
  johan_comments: processJohanComments(),
  gmail: processGmail(),
  gmail_crash: processGmailCrash(),
  canonical: processCanonical(),
  mfs_db: processMfsDb(),
  drivers: processDrivers(),
  blakadder: processBlakadder(),
  z2m: processZ2m(),
  zha: processZha(),
  deconz: processDeconz(),
  forum: processForum(),
  interview: processInterviews(),
  device_truth: processDeviceTruth(),
  github_own: processGithubOwn(),
};

console.log('\n=== PAIRS EXTRACTED ===');
for (const [src, c] of Object.entries(counts)) {
  console.log('  ' + src + ': ' + c + ' mfr+pid pairs');
}
console.log('  TOTAL UNIQUE mfr+pid: ' + mfrPidPairs.size);

// ============== FIND COMBINATIONS IN SOME SOURCES BUT NOT OTHERS ==============
console.log('\n=== COMBINATIONS IN SOME SOURCES BUT NOT OTHERS ===');

const bySource = new Map();
for (const [key, entry] of mfrPidPairs) {
  for (const src of entry.sources) {
    if (!bySource.has(src)) bySource.set(src, new Set());
    bySource.get(src).add(key);
  }
}

// Find pairs that are in user data (Johan, Gmail) but NOT in canonical/mfs_db/drivers
const userSources = new Set([
  'johan-issue', 'johan-comment', 'gmail', 'gmail-crash', 'forum',
  'interview', 'github-own',
]);
const marketSources = new Set([
  'blakadder', 'z2m', 'zha', 'deconz',
  'johan-issue', 'johan-comment', 'gmail', 'gmail-crash', 'forum',
  'interview', 'device-truth', 'github-own',
]);
const internalSources = new Set(['canonical', 'mfs_db', 'driver', 'device-truth']);
const newInUserOnly = [];
for (const [key, entry] of mfrPidPairs) {
  const inUser = [...entry.sources].some(s => userSources.has(s));
  const inInternal = [...entry.sources].some(s => internalSources.has(s));
  if (inUser && !inInternal) {
    newInUserOnly.push(entry);
  }
}
console.log('Pairs in user data but NOT in canonical/mfs_db/drivers:', newInUserOnly.length);
for (const e of newInUserOnly.slice(0, 30)) {
  console.log('  ' + e.mfr + ' + ' + e.pid + ' (sources: ' + [...e.sources].join(',') + ')');
}

// Find pairs in canonical but not in drivers (gap)
const inCanonicalNotDrivers = [];
for (const [key, entry] of mfrPidPairs) {
  if (entry.sources.has('canonical') && !entry.sources.has('driver')) {
    inCanonicalNotDrivers.push(entry);
  }
}
console.log('\nPairs in canonical but NOT in driver.compose.json:', inCanonicalNotDrivers.length);
for (const e of inCanonicalNotDrivers.slice(0, 15)) {
  console.log('  ' + e.mfr + ' + ' + e.pid + ' (drivers: ' + [...e.info].map(i => i.driver).filter(Boolean).join(',') + ')');
}

// Find pairs in mfs_db but not in drivers
const inMfsNotDrivers = [];
for (const [key, entry] of mfrPidPairs) {
  if (entry.sources.has('mfs_db') && !entry.sources.has('driver')) {
    inMfsNotDrivers.push(entry);
  }
}
console.log('\nPairs in mfs_db but NOT in driver.compose.json:', inMfsNotDrivers.length);
for (const e of inMfsNotDrivers.slice(0, 15)) {
  console.log('  ' + e.mfr + ' + ' + e.pid + ' (driverHint: ' + [...e.info].map(i => i.driverHint).filter(Boolean).join(',') + ')');
}

// Market-new: catalog/user-verified sources, not in driver compose
const catalogSources = new Set(['blakadder', 'z2m', 'zha', 'deconz']);
const trustedUserSources = new Set([
  'gmail', 'gmail-crash', 'johan-issue', 'johan-comment',
  'interview', 'github-own', 'device-truth',
]);
const marketNew = [];
for (const [, entry] of mfrPidPairs) {
  const src = [...entry.sources];
  const inDriver = entry.sources.has('driver');
  const inCatalog = src.some((s) => catalogSources.has(s));
  const inTrustedUser = src.some((s) => trustedUserSources.has(s));
  const forumOnly = entry.sources.has('forum') && !inCatalog && !inTrustedUser;
  if (!inDriver && (inCatalog || inTrustedUser) && !forumOnly) {
    marketNew.push(entry);
  }
}
marketNew.sort((a, b) => a.mfr.localeCompare(b.mfr) || a.pid.localeCompare(b.pid));
console.log('\nMarket-new (external sources, not in driver.compose):', marketNew.length);
for (const e of marketNew.slice(0, 20)) {
  console.log('  ' + e.mfr + ' + ' + e.pid + ' (' + [...e.sources].join(',') + ')');
}

// ============== SUMMARY ==============
const summary = {
  meta: { generatedAt: new Date().toISOString() },
  totalUniquePairs: mfrPidPairs.size,
  bySource: Object.fromEntries([...bySource].map(([k, v]) => [k, v.size])),
  pairsBySourceCount: counts,
  newInUserOnly: newInUserOnly.length,
  inCanonicalNotDrivers: inCanonicalNotDrivers.length,
  inMfsNotDrivers: inMfsNotDrivers.length,
  // P75.3: include full lists so apply-canonical-gaps-final.js can read them
  inCanonicalNotDriversList: inCanonicalNotDrivers.map(e => ({
    mfr: e.mfr, pid: e.pid,
    drivers: [...e.info].map(i => i.driver).filter(Boolean)
  })),
  inMfsNotDriversList: inMfsNotDrivers.map(e => ({
    mfr: e.mfr, pid: e.pid,
    driverHint: [...e.info].map(i => i.driverHint).filter(Boolean)[0] || null
  })),
  newInUserOnlyList: newInUserOnly.map(e => ({
    mfr: e.mfr, pid: e.pid,
    sources: [...e.sources]
  })),
  marketNew: marketNew.length,
  marketNewList: marketNew.slice(0, 500).map((e) => ({
    mfr: e.mfr,
    pid: e.pid,
    sources: [...e.sources],
    meta: e.info.slice(0, 3),
  })),
};
const stateDir = path.join(ROOT, '.github', 'state');
if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true });
fs.writeFileSync(path.join(stateDir, 'mfr-pid-cross-ref.json'), JSON.stringify(summary, null, 2));
console.log('\nSaved summary to .github/state/mfr-pid-cross-ref.json');

// Save the full pairs map for analysis
const allPairs = [...mfrPidPairs.entries()].map(([k, v]) => ({
  mfr: v.mfr, pid: v.pid, sources: [...v.sources], info: v.info
}));
fs.writeFileSync(path.join(stateDir, 'all-mfr-pid-pairs.json'), JSON.stringify(allPairs, null, 2));
console.log('Saved all pairs to .github/state/all-mfr-pid-pairs.json');

const marketDir = path.join(stateDir, 'market-couples');
if (!fs.existsSync(marketDir)) fs.mkdirSync(marketDir, { recursive: true });
fs.writeFileSync(path.join(marketDir, 'cross-ref-summary.json'), JSON.stringify({
  generatedAt: summary.meta.generatedAt,
  marketNew: summary.marketNew,
  marketNewList: summary.marketNewList,
  bySource: summary.bySource,
}, null, 2));
