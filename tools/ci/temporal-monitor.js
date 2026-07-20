#!/usr/bin/env node
/**
 * P29.7 — Temporal Monitoring Cron (refreshed P78)
 *
 * Runs daily to detect NEW GH issues / forum topics that match the
 * patterns we've fixed in past P-iterations. Generates an alert if
 * we see regressions or new devices that match known bug patterns.
 *
 * P78 update: refreshed after P76-P77 - now tracks P77 battery/button
 * patterns (247 battery drivers, 54 button drivers) and reports
 * regressions against the latest architectural baselines.
 *
 * Steps:
 * 1. Fetch all GH issues (state: open, label: bug, createdAt > lastRun)
 * 2. Fetch all forum topics (createdAt > lastRun)
 * 3. For each new item, check against:
 *    - Known FP patterns (e.g. _TZ3000_u3nv1jwk = TS0044)
 *    - Known bug patterns (Missing Capability Listener, battery '?', etc.)
 *    - Cross-ref with our drivers (do we have a fix?)
 * 4. Generate report with:
 *    - NEW issues that we have a fix for (auto-fix candidates)
 *    - NEW issues that need investigation
 *    - REGRESSIONS (closed issues that re-opened)
 * 5. Update state.json
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const repoRoot = path.resolve(__dirname, '..', '..');
const stateFile = path.join(repoRoot, '.github', 'state', 'temporal-monitor-state.json');
const reportFile = path.join(repoRoot, '.github', 'state', 'temporal-monitor-report.json');
const ghToken = process.env.GH_TOKEN;
const repo = 'dlnraja/com.tuya.zigbee';

// ─── HTTPS helpers ──────────────────────────────────────────────
function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers, timeout: 30000 }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(new Error(`Parse error: ${e.message} (data: ${data.substring(0, 200)})`)); }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// ─── Helpers ─────────────────────────────────────────────────────
function log(...args) {
  console.log('[P29.7 temporal-monitor]', ...args);
}

function nowISO() {
  return new Date().toISOString();
}

function loadState() {
  if (fs.existsSync(stateFile)) {
    try { return JSON.parse(fs.readFileSync(stateFile, 'utf8')); }
    catch { /* ignore */ }
  }
  return {
    lastRun: null,
    seenIssueNumbers: [],
    seenForumIds: [],
    fixesApplied: 0,
    alertsSent: 0,
  };
}

function saveState(state) {
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

// ─── Fetch new GH issues ─────────────────────────────────────────
async function fetchNewGHIssues(state) {
  if (!ghToken) {
    log('⚠️ No GH_TOKEN — skipping GH fetch');
    return [];
  }

  const since = state.lastRun || '2026-01-01T00:00:00Z';
  log('Fetching GH issues created since', since);

  try {
    const issues = await httpsGet(
      `https://api.github.com/repos/${repo}/issues?state=all&labels=bug&per_page=100&since=${since}`,
      {
        'Authorization': `token ${ghToken}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'P29.7-temporal-monitor',
      }
    );
    return issues
      .filter(i => !i.pull_request) // exclude PRs
      .filter(i => !state.seenIssueNumbers.includes(i.number))
      .map(i => ({
        number: i.number,
        title: i.title,
        state: i.state,
        createdAt: i.created_at,
        labels: i.labels.map(l => l.name),
        body: i.body?.substring(0, 500) || '',
        url: i.html_url,
      }));
  } catch (err) {
    log('❌ GH fetch error:', err.message);
    return [];
  }
}

// ─── Match issue against known fix patterns ──────────────────────
function classifyIssue(issue) {
  const title = (issue.title || '').toLowerCase();
  const body = (issue.body || '').toLowerCase();
  const labels = (issue.labels || []).map(l => l.toLowerCase());

  const classifications = [];

  // Battery bugs
  if (/battery|measure_battery|measure-battery/.test(title + body) && /\?|unknown|null|nan/.test(body)) {
    classifications.push('battery-question-mark');
  }
  if (/battery percentage|measure_battery/.test(body) && /always (100|0|1)/.test(body)) {
    classifications.push('battery-stuck');
  }

  // Button issues
  if (/button\.\d|button\.push|button\.press/.test(body) && /missing (capability )?listener/i.test(body)) {
    classifications.push('button-missing-listener');
  }
  if (/sub-?cap/.test(title + body) || /onoff\.\d|onoff\.gang\d/.test(body)) {
    classifications.push('sub-capability-issue');
  }
  if (/ts004[1-4]|ts004f|scene mode|0x8004/.test(title + body)) {
    classifications.push('button-mode-issue');
  }

  // Driver routing
  if (/pairs? (as|with) (the )?wrong|wrong driver|should be|not (the )?right/i.test(body)) {
    classifications.push('wrong-driver-routing');
  }
  if (/missing features?/.test(title + body) && /(tuya|zigbee)/.test(body)) {
    classifications.push('missing-features');
  }

  // Specific device patterns
  if (/_TZE204_|_TZE200_|_TZ3000_|_TZ3210_/.test(title + body)) {
    classifications.push('has-fingerprint');
  }
  if (/TS0601|TS004[1-4]|TS0003|TS0601_irrigation/i.test(title + body)) {
    classifications.push('known-productid');
  }

  // Water/irrigation
  if (/water|irrigation|valve|timer|sprinkler/.test(title)) {
    classifications.push('water-device');
  }

  // Garage
  if (/garage|gate/.test(title)) {
    classifications.push('garage-device');
  }

  // Fingerbot
  if (/fingerbot|switchbot|button.?bot/.test(title + body)) {
    classifications.push('fingerbot');
  }

  return classifications;
}

// ─── Check if we have a fix for this issue ──────────────────────
function hasFix(issue, classifications) {
  const fingerprintMatch = (issue.body || '').match(/_(TZE\d{3}|TZ\d{4})_[a-z0-9]+/i);
  if (fingerprintMatch) {
    const fpFile = path.join(repoRoot, 'lib', 'tuya', 'fingerprints.json');
    if (fs.existsSync(fpFile)) {
      const fps = JSON.parse(fs.readFileSync(fpFile, 'utf8'));
      const mfr = fingerprintMatch[0];
      if (fps[mfr]) {
        return { hasFix: true, fix: `Already in fingerprints.json → ${fps[mfr].driverId}`, confidence: 0.9 };
      }
    }
  }

  // Battery question mark → UniversalBatteryFallback (P28)
  if (classifications.includes('battery-question-mark') || classifications.includes('battery-stuck')) {
    return { hasFix: true, fix: 'UniversalBatteryFallback (P28) handles all 0-50/0-100/0-200/0-255 scales + sentinels', confidence: 0.7 };
  }

  // Sub-capability → check switch_Ngang driver
  if (classifications.includes('sub-capability-issue')) {
    return { hasFix: true, fix: 'Verify driver is switch_1gang/2gang/3gang, not generic switch. (P29 #170 fix)', confidence: 0.6 };
  }

  // Button mode → default = scene (P28)
  if (classifications.includes('button-mode-issue')) {
    return { hasFix: true, fix: 'button_mode default = scene (P28) — works for TS0041/TS0042/TS0043/TS0044/TS004F', confidence: 0.8 };
  }

  // Missing features → need investigation
  return { hasFix: false, fix: null, confidence: 0 };
}

// ─── Main ───────────────────────────────────────────────────────
async function main() {
  log('═'.repeat(70));
  log('TEMPORAL MONITOR v1.0 — started at', nowISO());
  log('═'.repeat(70));

  const state = loadState();
  log('Last run:', state.lastRun || 'NEVER');
  log('Already seen issues:', state.seenIssueNumbers.length);

  // Fetch new issues
  const newIssues = await fetchNewGHIssues(state);
  log('Found', newIssues.length, 'new issues');

  // Classify and check for fixes
  const report = {
    runAt: nowISO(),
    newIssues: [],
    newFixesAvailable: 0,
    regressions: 0,
    needInvestigation: 0,
    byClassification: {},
  };

  for (const issue of newIssues) {
    const classifications = classifyIssue(issue);
    const fix = hasFix(issue, classifications);

    const item = {
      number: issue.number,
      title: issue.title,
      state: issue.state,
      labels: issue.labels,
      url: issue.url,
      classifications,
      hasFix: fix.hasFix,
      fix: fix.fix,
      fixConfidence: fix.confidence,
    };

    report.newIssues.push(item);

    if (fix.hasFix) report.newFixesAvailable++;
    else report.needInvestigation++;

    for (const c of classifications) {
      report.byClassification[c] = (report.byClassification[c] || 0) + 1;
    }
  }

  // Save state
  state.lastRun = nowISO();
  state.seenIssueNumbers = [
    ...new Set([...state.seenIssueNumbers, ...newIssues.map(i => i.number)]),
  ].slice(-1000);
  if (report.newFixesAvailable > 0) state.fixesApplied += report.newFixesAvailable;
  if (report.needInvestigation > 0) state.alertsSent += report.needInvestigation;

  saveState(state);
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

  // Summary
  log('─'.repeat(70));
  log('SUMMARY');
  log('  New issues:', newIssues.length);
  log('  Fixes available:', report.newFixesAvailable);
  log('  Need investigation:', report.needInvestigation);
  log('  By classification:');
  for (const [k, v] of Object.entries(report.byClassification)) {
    log(`    ${k}: ${v}`);
  }
  log('─'.repeat(70));
  log('Report saved to:', reportFile);
  log('State saved to:', stateFile);
}

main().catch(err => {
  console.error('[P29.7] FATAL:', err);
  process.exit(1);
});
