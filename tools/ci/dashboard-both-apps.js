#!/usr/bin/env node
'use strict';

/**
 * P25.7 / P2240 — Dashboard monitor for BOTH apps (master + stable)
 * Stable clone runs from its own tree; reports aggregate under master .github/state.
 *
 * Env:
 *   MASTER_ROOT — path to master clone (default: sibling ../master)
 *   STABLE_ROOT — override stable path
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const STABLE_ROOT = process.env.STABLE_ROOT
  ? path.resolve(process.env.STABLE_ROOT)
  : path.resolve(__dirname, '..', '..');
const MASTER_ROOT = process.env.MASTER_ROOT
  ? path.resolve(process.env.MASTER_ROOT)
  : path.resolve(STABLE_ROOT, '..', 'master');
const STATE_DIR = fs.existsSync(path.join(MASTER_ROOT, '.github', 'state'))
  ? path.join(MASTER_ROOT, '.github', 'state')
  : path.join(STABLE_ROOT, '.github', 'state');

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

function monitorScriptFor(app) {
  const local = path.join(app.root, 'scripts', 'automation', 'dashboard-monitor.js');
  if (fs.existsSync(local)) return local;
  const master = path.join(MASTER_ROOT, 'scripts', 'automation', 'dashboard-monitor.js');
  return fs.existsSync(master) ? master : local;
}

function copySnapshot(app, perAppReport) {
  const srcReport = path.join(app.root, '.github', 'state', 'dashboard-monitor-report.json');
  if (!fs.existsSync(srcReport)) return null;
  try {
    const snapshot = JSON.parse(fs.readFileSync(srcReport, 'utf8'));
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(perAppReport, JSON.stringify(snapshot, null, 2));
    return snapshot;
  } catch {
    return null;
  }
}

function runDashboardForApp(app, expectedVersion) {
  console.log(`\n=== Dashboard for ${app.name} (${app.id}) v${expectedVersion} ===`);
  if (!fs.existsSync(app.root)) {
    const msg = `Root missing: ${app.root}`;
    console.warn(msg);
    return { success: false, skipped: true, output: msg, error: msg };
  }
  const monitor = monitorScriptFor(app);
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
    const snapshot = copySnapshot(app, perAppReport);
    return { success: true, output, snapshot };
  } catch (error) {
    const out = `${error.stdout || ''}\n${error.stderr || ''}`;
    console.log(out);
    const snapshot = copySnapshot(app, perAppReport);
    const partial = Boolean(snapshot);
    return { success: partial, partial, output: out, error: error.message, snapshot };
  }
}

function main() {
  const stableVersion = readVersion(STABLE_ROOT, '5.12.0');
  const masterVersion = fs.existsSync(MASTER_ROOT)
    ? readVersion(MASTER_ROOT, stableVersion)
    : null;

  console.log('Master root:', MASTER_ROOT, 'version:', masterVersion ?? '(missing)');
  console.log('Stable root:', STABLE_ROOT, 'version:', stableVersion);

  const results = {};
  for (const app of APPS) {
    if (app.name === 'master' && !fs.existsSync(app.root)) {
      results[app.name] = { success: false, skipped: true, output: 'master clone not found' };
      continue;
    }
    const version = app.name === 'stable' ? stableVersion : (masterVersion || stableVersion);
    results[app.name] = runDashboardForApp(app, version);
  }

  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(STATE_DIR, 'dashboard-monitor-both.json'),
    JSON.stringify({
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
        expectedVersion: app.name === 'stable' ? stableVersion : masterVersion,
        result: results[app.name],
      })),
    }, null, 2),
  );

  console.log('\n=== Summary ===');
  for (const app of APPS) {
    const r = results[app.name];
    if (!r) continue;
    const icon = r.skipped ? '—' : (r.success ? '✓' : (r.partial ? '~' : '⚠'));
    console.log(`${app.name}: ${icon}${r.skipped ? ' skipped' : ''}`);
  }
  console.log(`\nReport: ${path.join(STATE_DIR, 'dashboard-monitor-both.json')}`);

  const hardFail = Object.values(results).some((r) => r && !r.success && !r.skipped && !r.partial);
  if (hardFail) process.exit(1);
}

main();
