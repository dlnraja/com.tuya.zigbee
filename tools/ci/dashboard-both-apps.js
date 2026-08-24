#!/usr/bin/env node
'use strict';

/**
 * P25.7 / P2240 — Dashboard monitor for BOTH apps (master + stable)
 *
 * Runs dashboard-monitor.js per Athom app ID with portable repo paths.
 * Output: .github/state/dashboard-monitor-both.json
 *
 * Env:
 *   STABLE_ROOT — path to stable-v5 clone (default: sibling ../stable)
 *   HOMEY_PAT / ATHOM credentials — forwarded to dashboard-monitor
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const MASTER_ROOT = path.resolve(__dirname, '..', '..');
const STABLE_ROOT = process.env.STABLE_ROOT
  ? path.resolve(process.env.STABLE_ROOT)
  : path.resolve(MASTER_ROOT, '..', 'stable');
const STATE_DIR = path.join(MASTER_ROOT, '.github', 'state');

const APPS = [
  {
    id: 'com.dlnraja.tuya.zigbee',
    name: 'master',
    branch: 'master',
    root: MASTER_ROOT,
    reportFile: 'dashboard-monitor-report-master.json',
  },
  {
    id: 'com.dlnraja.tuya.zigbee.stable',
    name: 'stable',
    branch: 'stable-v5',
    root: STABLE_ROOT,
    reportFile: 'dashboard-monitor-report-stable.json',
  },
];

function readVersion(appRoot, fallback) {
  try {
    const app = JSON.parse(fs.readFileSync(path.join(appRoot, 'app.json'), 'utf8'));
    return app.version || fallback;
  } catch {
    return fallback;
  }
}

function runDashboardForApp(app, expectedVersion) {
  console.log(`\n=== Dashboard for ${app.name} (${app.id}) v${expectedVersion} ===`);
  if (!fs.existsSync(app.root)) {
    const msg = `Root missing: ${app.root}`;
    console.warn(msg);
    return { success: false, skipped: true, output: msg, error: msg };
  }
  const monitor = path.join(MASTER_ROOT, 'scripts', 'automation', 'dashboard-monitor.js');
  const perAppReport = path.join(STATE_DIR, app.reportFile);
  const args = [
    monitor,
    '--latest',
    '--expect-version',
    expectedVersion,
    '--expect-state',
    'test',
    '--soft-expect',
  ];
  try {
    const output = execFileSync(process.execPath, args, {
      cwd: app.root,
      env: {
        ...process.env,
        APP_ID: app.id,
        TARGET_APP_ID: app.id,
        EXPECTED_APP_VERSION: expectedVersion,
        EXPECTED_BUILD_STATE: 'test',
      },
      encoding: 'utf8',
      timeout: 120000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    console.log(output);
    let snapshot = null;
    const srcReport = path.join(app.root, '.github', 'state', 'dashboard-monitor-report.json');
    if (fs.existsSync(srcReport)) {
      try {
        snapshot = JSON.parse(fs.readFileSync(srcReport, 'utf8'));
        fs.mkdirSync(STATE_DIR, { recursive: true });
        fs.writeFileSync(perAppReport, JSON.stringify(snapshot, null, 2));
      } catch { /* ignore parse */ }
    }
    return { success: true, output, snapshot };
  } catch (error) {
    const out = `${error.stdout || ''}\n${error.stderr || ''}`;
    console.log(out);
    let snapshot = null;
    const srcReport = path.join(app.root, '.github', 'state', 'dashboard-monitor-report.json');
    if (fs.existsSync(srcReport)) {
      try {
        snapshot = JSON.parse(fs.readFileSync(srcReport, 'utf8'));
        fs.mkdirSync(STATE_DIR, { recursive: true });
        fs.writeFileSync(perAppReport, JSON.stringify(snapshot, null, 2));
      } catch { /* ignore parse */ }
    }
    const partial = Boolean(snapshot);
    return { success: partial, partial, output: out, error: error.message, snapshot };
  }
}

function main() {
  const masterVersion = readVersion(MASTER_ROOT, '9.0.0');
  const stableVersion = fs.existsSync(STABLE_ROOT)
    ? readVersion(STABLE_ROOT, masterVersion)
    : null;

  console.log('Master root:', MASTER_ROOT, 'version:', masterVersion);
  console.log('Stable root:', STABLE_ROOT, 'version:', stableVersion ?? '(missing)');

  const results = {};
  for (const app of APPS) {
    if (app.name === 'stable' && !fs.existsSync(app.root)) {
      results[app.name] = { success: false, skipped: true, output: 'stable clone not found' };
      continue;
    }
    const version = app.name === 'master' ? masterVersion : (stableVersion || masterVersion);
    results[app.name] = runDashboardForApp(app, version);
  }

  const report = {
    meta: {
      generatedAt: new Date().toISOString(),
      masterRoot: MASTER_ROOT,
      stableRoot: STABLE_ROOT,
      masterVersion,
      stableVersion,
    },
    apps: APPS.map((app) => ({
      id: app.id,
      name: app.name,
      branch: app.branch,
      root: app.root,
      expectedVersion: app.name === 'master' ? masterVersion : stableVersion,
      result: results[app.name],
    })),
  };

  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(STATE_DIR, 'dashboard-monitor-both.json'),
    JSON.stringify(report, null, 2),
  );

  console.log('\n=== Summary ===');
  for (const app of APPS) {
    const r = results[app.name];
    if (!r) continue;
    const icon = r.skipped ? '—' : (r.success ? '✓' : (r.partial ? '~' : '⚠'));
    const ver = app.name === 'master' ? masterVersion : stableVersion;
    console.log(`${app.name} (${ver}): ${icon}${r.skipped ? ' skipped' : ''}`);
  }
  console.log(`\nReport: ${path.join(STATE_DIR, 'dashboard-monitor-both.json')}`);

  const hardFail = Object.values(results).some((r) => r && !r.success && !r.skipped && !r.partial);
  if (hardFail) process.exit(1);
}

main();
