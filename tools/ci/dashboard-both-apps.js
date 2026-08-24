#!/usr/bin/env node
'use strict';

/**
 * P25.7 / P2240 — Dashboard monitor for BOTH apps (master + stable)
 * Stable clone runs from its own tree; reports aggregate under master .github/state.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const STABLE_ROOT = path.resolve(__dirname, '..', '..');
const MASTER_ROOT = process.env.MASTER_ROOT
  ? path.resolve(process.env.MASTER_ROOT)
  : path.resolve(STABLE_ROOT, '..', 'master');
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
  const monitor = path.join(
    fs.existsSync(path.join(app.root, 'scripts', 'automation', 'dashboard-monitor.js'))
      ? app.root
      : MASTER_ROOT,
    'scripts',
    'automation',
    'dashboard-monitor.js',
  );
  const perAppReport = path.join(STATE_DIR, app.reportFile);
  const args = [monitor, '--latest', '--expect-version', expectedVersion, '--expect-state', 'test'];
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
    const srcReport = path.join(app.root, '.github', 'state', 'dashboard-monitor-report.json');
    if (fs.existsSync(srcReport) && fs.existsSync(MASTER_ROOT)) {
      try {
        fs.mkdirSync(STATE_DIR, { recursive: true });
        fs.copyFileSync(srcReport, perAppReport);
      } catch { /* ignore */ }
    }
    return { success: true, output };
  } catch (error) {
    const out = `${error.stdout || ''}\n${error.stderr || ''}`;
    console.log(out);
    return { success: false, output: out, error: error.message };
  }
}

function main() {
  const stableVersion = readVersion(STABLE_ROOT, '5.12.0');
  const masterVersion = fs.existsSync(MASTER_ROOT)
    ? readVersion(MASTER_ROOT, stableVersion)
    : null;

  const results = {};
  for (const app of APPS) {
    if (app.name === 'master' && !fs.existsSync(app.root)) {
      results[app.name] = { success: false, skipped: true, output: 'master clone not found' };
      continue;
    }
    const version = app.name === 'stable' ? stableVersion : (masterVersion || stableVersion);
    results[app.name] = runDashboardForApp(app, version);
  }

  if (fs.existsSync(MASTER_ROOT)) {
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
          expectedVersion: app.name === 'stable' ? stableVersion : masterVersion,
          result: results[app.name],
        })),
      }, null, 2),
    );
  }

  console.log('\n=== Summary ===');
  for (const app of APPS) {
    const r = results[app.name];
    if (!r) continue;
    console.log(`${app.name}: ${r.skipped ? 'skipped' : (r.success ? 'ok' : 'fail')}`);
  }
}

main();
