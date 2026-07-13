// process-fresh-gmail.js — process the 551 fresh Gmail emails
const fs = require('fs');
const path = require('path');

const source = '.github/state/gmail-2026-07-13-FRESH/.github/state/diagnostics-report.json';
const data = JSON.parse(fs.readFileSync(source, 'utf8'));
const emails = data.diagnostics || [];
console.log('Total emails:', emails.length);

// Load mfs_db
const mfs = JSON.parse(fs.readFileSync('data/mfs_db.json', 'utf8'));
const inMfs = new Set();
for (const did in mfs.devices) {
  const d = mfs.devices[did];
  if (d.manufacturerId) inMfs.add(d.manufacturerId.toLowerCase());
  for (const mid of d.manufacturerIds || []) inMfs.add(mid.toLowerCase());
}
for (const dm of Object.values(mfs.driverMapping)) {
  for (const mid of dm.manufacturerIds || []) inMfs.add(mid.toLowerCase());
}
const inMfsUpper = new Set([...inMfs].map(s => s.toUpperCase()));

// Extract fingerprints from emails
const allFps = new Set();
const fpsByEmail = [];
for (const e of emails) {
  const mfrs = e.fps?.mfr || [];
  for (const m of mfrs) allFps.add(m.toUpperCase());
  if (mfrs.length) fpsByEmail.push({ id: e.id, type: e.type, mfrs, pids: e.fps?.pid || [], date: e.date });
}

// Find missing FPs
const missing = [...allFps].filter(m => !inMfsUpper.has(m));
console.log('Unique FPs in fresh emails:', allFps.size);
console.log('Already in mfs_db:', allFps.size - missing.length);
console.log('Missing from mfs_db:', missing.length);

// Apply missing FPs
let added = 0;
for (const mfr of missing) {
  const mfrLower = mfr.toLowerCase();
  if (mfrLower.startsWith('_tz') || mfrLower.startsWith('_tyzb') || mfrLower.startsWith('_tyst')) {
    if (!mfs.driverMapping.generic_tuya) mfs.driverMapping.generic_tuya = { manufacturerIds: [], fingerprints: [] };
    const dm = mfs.driverMapping.generic_tuya;
    if (!dm.manufacturerIds) dm.manufacturerIds = [];
    if (!dm.manufacturerIds.includes(mfrLower)) {
      dm.manufacturerIds.push(mfrLower);
      added++;
    }
  }
}
console.log('Applied to mfs_db.generic_tuya:', added);

if (added > 0) {
  const bak = `data/mfs_db.json.bak.fresh.${Date.now()}`;
  fs.copyFileSync('data/mfs_db.json', bak);
  console.log('Backup:', bak);
  fs.writeFileSync('data/mfs_db.json', JSON.stringify(mfs, null, 2));
  console.log('Saved mfs_db.json');
}

// Process crashes
const crashes = emails.filter(e => e.type === 'crash_report');
const errPatterns = {};
for (const c of crashes) {
  for (const e of c.errs || []) {
    let norm = String(e).replace(/\\n/g, ' ').replace(/\d+:\d+/g, 'X:X').replace(/0x[0-9a-f]+/gi, '0xX').replace(/:\d+/g, ':X').replace(/[A-Z][a-z]+Error: /g, '').trim();
    if (norm.length > 200) norm = norm.substring(0, 200);
    errPatterns[norm] = (errPatterns[norm] || 0) + 1;
  }
}
const topErrs = Object.entries(errPatterns).sort((a,b) => b[1] - a[1]).slice(0, 20);

// Bug reports with mfrs
const bugs = emails.filter(e => e.type === 'bug_report');
const bugFps = {};
for (const b of bugs) {
  for (const m of b.fps?.mfr || []) {
    for (const p of b.fps?.pid || []) {
      const k = m + ' / ' + p;
      bugFps[k] = (bugFps[k] || 0) + 1;
    }
  }
}
const topBugFps = Object.entries(bugFps).sort((a,b) => b[1] - a[1]).slice(0, 20);

// GitHub issues
const ghEmails = emails.filter(e => e.type === 'github' && e.ghInfo?.issueNum);
const issueMap = {};
for (const e of ghEmails) {
  const k = e.ghInfo.repo + '#' + e.ghInfo.issueNum;
  issueMap[k] = (issueMap[k] || 0) + 1;
}
const topIssues = Object.entries(issueMap).sort((a,b) => b[1] - a[1]).slice(0, 15);

// Recent (last 7 days)
const cutoff = new Date('2026-07-06');
const recent = emails.filter(e => new Date(e.date) > cutoff);
console.log('Recent (last 7 days):', recent.length);

// Save full report
const summary = {
  meta: { generatedAt: new Date().toISOString(), sourceRun: '29234338719' },
  totals: {
    totalEmails: emails.length,
    dateRange: [emails.map(e => e.date).sort()[0], emails.map(e => e.date).sort().pop()],
    byType: data.byType,
    uniqueFps: allFps.size,
    missingFps: missing.length,
    applied: added
  },
  recentCount: recent.length,
  topCrashes: topErrs,
  topBugFps,
  topIssues,
  topMissingFps: missing.slice(0, 50)
};
fs.writeFileSync('.github/state/fresh-gmail-summary.json', JSON.stringify(summary, null, 2));
console.log('Summary saved');

console.log('\n=== TOP 20 NEW CRASH PATTERNS ===');
for (const [e, c] of topErrs) {
  console.log('  ' + c + 'x  ' + e.substring(0, 100));
}

console.log('\n=== TOP 15 BUG FPs ===');
for (const [k, c] of topBugFps) {
  console.log('  ' + c + 'x  ' + k);
}

console.log('\n=== TOP 15 GITHUB ISSUES ===');
for (const [iss, c] of topIssues) {
  console.log('  ' + c + 'x  ' + iss);
}

console.log('\n=== MISSING FPs (first 20) ===');
for (const m of missing.slice(0, 20)) console.log('  ' + m);
