// analyze-emails.js — Deep analysis of 10,742 emails
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('.github/state/emails-aggregate.json', 'utf8'));
const emails = data.emails;

console.log('=== EMAIL DEEP ANALYSIS ===');
console.log('Total unique emails:', emails.length);

// ============ 1. CRASH REPORT PATTERNS ============
console.log('\n=== 1. CRASH REPORT PATTERNS (989) ===');
const crashes = emails.filter(e => e.type === 'crash_report');
const errPatterns = {};
const crashByApp = {};
const crashByCluster = {};
const crashByCap = {};
const crashByDate = {};

for (const c of crashes) {
  // Count error patterns
  for (const e of c.errs || []) {
    // Normalize: remove line numbers, addresses, etc
    let norm = e.replace(/\\n/g, ' ')
                .replace(/\d+:\d+/g, 'X:X')
                .replace(/0x[0-9a-f]+/gi, '0xX')
                .replace(/:\d+/g, ':X')
                .replace(/[A-Z][a-z]+Error: /g, '')
                .trim();
    if (norm.length > 200) norm = norm.substring(0, 200);
    errPatterns[norm] = (errPatterns[norm] || 0) + 1;
  }
  // Crash info
  if (c.crashInfo) {
    for (const cap of c.crashInfo.capabilities || []) crashByCap[cap] = (crashByCap[cap] || 0) + 1;
    for (const cl of c.crashInfo.clusters || []) crashByCluster[cl] = (crashByCluster[cl] || 0) + 1;
  }
  if (c.date) {
    const d = c.date.substring(0, 10);
    crashByDate[d] = (crashByDate[d] || 0) + 1;
  }
}

const topErrs = Object.entries(errPatterns).sort((a,b) => b[1] - a[1]).slice(0, 20);
console.log('Top 20 error patterns:');
for (const [err, count] of topErrs) {
  console.log('  ' + count + 'x  ' + err.substring(0, 120));
}
console.log('\nTop 10 capabilities in crashes:');
for (const [cap, count] of Object.entries(crashByCap).sort((a,b) => b[1] - a[1]).slice(0, 10)) {
  console.log('  ' + count + 'x  ' + cap);
}
console.log('\nTop 10 clusters in crashes:');
for (const [cl, count] of Object.entries(crashByCluster).sort((a,b) => b[1] - a[1]).slice(0, 10)) {
  console.log('  ' + count + 'x  ' + cl);
}

// ============ 2. BUG REPORTS ============
console.log('\n=== 2. BUG REPORTS (373) ===');
const bugs = emails.filter(e => e.type === 'bug_report');
const bugFps = {};
const bugByMfr = {};
for (const b of bugs) {
  for (const m of b.fps?.mfr || []) bugByMfr[m] = (bugByMfr[m] || 0) + 1;
  for (const m of b.fps?.mfr || []) {
    for (const p of b.fps?.pid || []) {
      const key = m + ' / ' + p;
      bugFps[key] = (bugFps[key] || 0) + 1;
    }
  }
}
console.log('Top 20 mfrs in bug reports:');
for (const [mfr, count] of Object.entries(bugByMfr).sort((a,b) => b[1] - a[1]).slice(0, 20)) {
  console.log('  ' + count + 'x  ' + mfr);
}
console.log('\nTop 15 mfr+pid combos:');
for (const [k, count] of Object.entries(bugFps).sort((a,b) => b[1] - a[1]).slice(0, 15)) {
  console.log('  ' + count + 'x  ' + k);
}

// ============ 3. DEVICE ISSUES ============
console.log('\n=== 3. DEVICE ISSUES (565) ===');
const devs = emails.filter(e => e.type === 'device_issue');
const devFps = {};
for (const d of devs) {
  for (const m of d.fps?.mfr || []) {
    for (const p of d.fps?.pid || []) {
      const key = m + ' / ' + p;
      devFps[key] = (devFps[key] || 0) + 1;
    }
  }
}
console.log('Top 15 mfr+pid combos with device issues:');
for (const [k, count] of Object.entries(devFps).sort((a,b) => b[1] - a[1]).slice(0, 15)) {
  console.log('  ' + count + 'x  ' + k);
}

// ============ 4. DIAGNOSTICS (549) ============
console.log('\n=== 4. DIAGNOSTIC REPORTS (549) ===');
const diags = emails.filter(e => e.type === 'diagnostic');
let withFp = 0;
for (const d of diags) {
  if (d.fps?.mfr?.length) withFp++;
}
console.log('Total:', diags.length, '| with FP:', withFp);

// ============ 5. UNIQUE FINGERPRINTS NOT IN MFS ============
console.log('\n=== 5. FINGERPRINT COVERAGE ===');
const mfs = JSON.parse(fs.readFileSync('data/mfs_db.json', 'utf8'));
const inMfs = new Set();
for (const did in mfs.devices) {
  const d = mfs.devices[did];
  for (const fp of d.fingerprints || []) {
    if (fp.mfr) inMfs.add(fp.mfr);
  }
}
const allEmailFps = new Set();
for (const e of emails) {
  for (const m of e.fps?.mfr || []) allEmailFps.add(m);
}
const missingFromMfs = [...allEmailFps].filter(m => !inMfs.has(m));
console.log('Unique FPs in emails:', allEmailFps.size);
console.log('Already in mfs_db:', allEmailFps.size - missingFromMfs.length);
console.log('Missing from mfs_db:', missingFromMfs.length);
console.log('Sample missing FPs:');
for (const m of missingFromMfs.slice(0, 30)) console.log('  ' + m);

// ============ 6. RECENT (last 30 days) ISSUES THAT NEED ATTENTION ============
console.log('\n=== 6. RECENT (last 30 days) ===');
const cutoff = new Date('2026-06-13');
const recent = emails.filter(e => new Date(e.date) > cutoff);
console.log('Recent emails:', recent.length);
const recentByType = {};
for (const e of recent) recentByType[e.type] = (recentByType[e.type] || 0) + 1;
console.log('By type:', recentByType);
const recentBugs = recent.filter(e => e.type === 'bug_report' || e.type === 'crash_report' || e.type === 'device_issue');
console.log('Bugs + crashes + device issues:', recentBugs.length);

// ============ 7. ISSUES NOT YET CROSS-REFERENCED ============
console.log('\n=== 7. GITHUB ISSUE CROSS-REFERENCE ===');
const ghIssues = emails.filter(e => e.type === 'github' && e.ghInfo?.issueNum);
const issueMap = {};
for (const e of ghIssues) {
  const k = e.ghInfo.repo + '#' + e.ghInfo.issueNum;
  issueMap[k] = (issueMap[k] || 0) + 1;
}
console.log('Unique issues mentioned in emails:', Object.keys(issueMap).length);
const ourIssues = Object.keys(issueMap).filter(k => k.startsWith('dlnraja/'));
console.log('Our repo issues:', ourIssues.length);
const topIssues = Object.entries(issueMap).sort((a,b) => b[1] - a[1]).slice(0, 15);
console.log('Top 15 issues (most emails):');
for (const [iss, count] of topIssues) {
  console.log('  ' + count + 'x  ' + iss);
}

// ============ 8. WRITE ANALYSIS REPORT ============
const report = {
  meta: { generatedAt: new Date().toISOString(), totalEmails: emails.length },
  crashes: {
    total: crashes.length,
    topErrPatterns: topErrs.slice(0, 30),
    topCapabilities: Object.entries(crashByCap).sort((a,b) => b[1] - a[1]).slice(0, 30),
    topClusters: Object.entries(crashByCluster).sort((a,b) => b[1] - a[1]).slice(0, 30),
    byDate: crashByDate
  },
  bugReports: {
    total: bugs.length,
    topMfrs: Object.entries(bugByMfr).sort((a,b) => b[1] - a[1]).slice(0, 30),
    topFpCombos: Object.entries(bugFps).sort((a,b) => b[1] - a[1]).slice(0, 30)
  },
  deviceIssues: {
    total: devs.length,
    topFpCombos: Object.entries(devFps).sort((a,b) => b[1] - a[1]).slice(0, 30)
  },
  fingerprintCoverage: {
    inEmails: allEmailFps.size,
    inMfs: allEmailFps.size - missingFromMfs.length,
    missing: missingFromMfs
  },
  recent: {
    total: recent.length,
    byType: recentByType,
    bugsAndCrashes: recentBugs.length
  },
  githubIssues: {
    total: ghIssues.length,
    uniqueIssues: Object.keys(issueMap).length,
    ourIssues: ourIssues.length,
    topIssues
  }
};
fs.writeFileSync('.github/state/emails-analysis.json', JSON.stringify(report, null, 2));
console.log('\n\nSaved analysis to .github/state/emails-analysis.json');
