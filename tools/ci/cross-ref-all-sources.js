// cross-ref-all-sources.js — extract mfr+PID from ALL sources and find new combinations
const fs = require('fs');
const path = require('path');

const mfrPidPairs = new Map(); // key = "mfr|pid" -> { sources: Set, devices: [] }

function addPair(mfr, pid, source, info = {}) {
  if (!mfr || !pid) return;
  const mfrUpper = mfr.toUpperCase();
  const pidUpper = pid.toUpperCase();
  const key = mfrUpper + '|' + pidUpper;
  if (!mfrPidPairs.has(key)) {
    mfrPidPairs.set(key, { mfr: mfrUpper, pid: pidUpper, sources: new Set(), info: [] });
  }
  const entry = mfrPidPairs.get(key);
  entry.sources.add(source);
  if (Object.keys(info).length) entry.info.push({ source, ...info });
}

// ============== SOURCE 1: JOHAN ISSUES ==============
function processJohan() {
  const issueFile = '.github/state/johan-dump/issues.json';
  if (!fs.existsSync(issueFile)) return 0;
  const issues = JSON.parse(fs.readFileSync(issueFile, 'utf8'));
  let count = 0;
  for (const iss of issues) {
    const text = (iss.title || '') + ' ' + (iss.body || '');
    // Extract _TZE/TZ patterns + TS patterns
    const mfrMatches = text.match(/_TZE\d+_[a-zA-Z0-9]+|_TZ\d+_[a-zA-Z0-9]+|_TYZB\d+_[a-zA-Z0-9]+|_TYST\d+_[a-zA-Z0-9]+/g) || [];
    const pidMatches = text.match(/\bTS\d{4}[a-zA-Z]?\b|\bTH\d+\b|\bZG-\d+\b|\bCS-\d+\b/g) || [];
    for (const mfr of mfrMatches) {
      for (const pid of pidMatches) {
        addPair(mfr, pid, 'johan-issue', { issue: iss.number });
        count++;
      }
    }
  }
  return count;
}

// ============== SOURCE 2: JOHAN COMMENTS ==============
function processJohanComments() {
  const file = '.github/state/johan-dump/comments.json';
  if (!fs.existsSync(file)) return 0;
  const comments = JSON.parse(fs.readFileSync(file, 'utf8'));
  let count = 0;
  for (const c of comments) {
    const text = (c.body || '');
    const mfrMatches = text.match(/_TZE\d+_[a-zA-Z0-9]+|_TZ\d+_[a-zA-Z0-9]+|_TYZB\d+_[a-zA-Z0-9]+|_TYST\d+_[a-zA-Z0-9]+/g) || [];
    const pidMatches = text.match(/\bTS\d{4}[a-zA-Z]?\b|\bTH\d+\b|\bZG-\d+\b|\bCS-\d+\b/g) || [];
    for (const mfr of mfrMatches) {
      for (const pid of pidMatches) {
        addPair(mfr, pid, 'johan-comment', { comment: c.id });
        count++;
      }
    }
  }
  return count;
}

// ============== SOURCE 3: GMAIL EMAILS ==============
function processGmail() {
  // Try fresh Gmail first, fallback to aggregate
  const freshFile = '.github/state/gmail-2026-07-13-12pm/.github/state/diagnostics-report.json';
  const aggFile = '.github/state/emails-aggregate.json';
  let emails = [];
  if (fs.existsSync(freshFile)) {
    const data = JSON.parse(fs.readFileSync(freshFile, 'utf8'));
    emails = data.diagnostics || [];
    console.log('  Gmail source: fresh (551 emails)');
  } else if (fs.existsSync(aggFile)) {
    const data = JSON.parse(fs.readFileSync(aggFile, 'utf8'));
    emails = data.emails || [];
    console.log('  Gmail source: aggregate (' + emails.length + ' emails)');
  } else {
    return 0;
  }
  let count = 0;
  for (const e of emails) {
    const mfrs = e.fps?.mfr || [];
    const pids = e.fps?.pid || [];
    for (let i = 0; i < mfrs.length; i++) {
      const mfr = mfrs[i];
      const pid = pids[i] || (pids[0] || null);
      if (pid) {
        addPair(mfr, pid, 'gmail', { type: e.type, date: e.date });
        count++;
      }
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

// ============== MAIN ==============
console.log('=== CROSS-REFERENCING ALL SOURCES ===\n');
console.log('Processing sources...');

const counts = {
  johan_issues: processJohan(),
  johan_comments: processJohanComments(),
  gmail: processGmail(),
  canonical: processCanonical(),
  mfs_db: processMfsDb(),
  drivers: processDrivers()
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
const userSources = new Set(['johan-issue', 'johan-comment', 'gmail']);
const internalSources = new Set(['canonical', 'mfs_db', 'driver']);
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
  }))
};
fs.writeFileSync('.github/state/mfr-pid-cross-ref.json', JSON.stringify(summary, null, 2));
console.log('\nSaved summary to .github/state/mfr-pid-cross-ref.json');

// Save the full pairs map for analysis
const allPairs = [...mfrPidPairs.entries()].map(([k, v]) => ({
  mfr: v.mfr, pid: v.pid, sources: [...v.sources], info: v.info
}));
fs.writeFileSync('.github/state/all-mfr-pid-pairs.json', JSON.stringify(allPairs, null, 2));
console.log('Saved all pairs to .github/state/all-mfr-pid-pairs.json');
