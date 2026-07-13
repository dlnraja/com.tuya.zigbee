#!/usr/bin/env node
'use strict';

/**
 * P25.7 — Dashboard for BOTH apps (master + stable)
 *
 * Runs dashboard-monitor.js for both apps in sequence:
 * 1. com.dlnraja.tuya.zigbee (master/innovation)
 * 2. com.dlnraja.tuya.zigbee.stable (stable/production)
 *
 * Aggregates results into a single report.
 *
 * Output: .github/state/dashboard-monitor-both.json
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = 'C:/Users/Dell/Documents/homey/master';
const STATE_DIR = 'C:/Users/Dell/Documents/homey/master/.github/state';

const APPS = [
  { id: 'com.dlnraja.tuya.zigbee', name: 'master', branch: 'master' },
  // Add stable if different app id
  // { id: 'com.dlnraja.tuya.zigbee.stable', name: 'stable', branch: 'stable-v5' },
];

function runDashboardForApp(app, expectedVersion) {
  console.log(`\n=== Dashboard for ${app.name} (${app.id}) v${expectedVersion} ===`);
  const args = [
    path.join(ROOT, 'scripts', 'automation', 'dashboard-monitor.js'),
    '--latest',
    '--expect-version',
    expectedVersion,
    '--expect-state',
    'test',
  ];
  try {
    const output = execFileSync(process.execPath, args, {
      cwd: ROOT,
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
    return { success: true, output };
  } catch (error) {
    const out = `${error.stdout || ''}\n${error.stderr || ''}`;
    console.log(out);
    return { success: false, output: out, error: error.message };
  }
}

function main() {
  // Read expected version from master app.json
  let masterVersion = '9.0.0';
  try {
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    masterVersion = app.version;
  } catch (e) {
    console.error('Cannot read app.json:', e.message);
  }

  // Read stable version from stable app.json
  let stableVersion = masterVersion;
  const stableApp = 'C:/Users/Dell/Documents/homey/stable/app.json';
  if (fs.existsSync(stableApp)) {
    try {
      const app = JSON.parse(fs.readFileSync(stableApp, 'utf8'));
      stableVersion = app.version;
    } catch (e) {
      console.error('Cannot read stable app.json:', e.message);
    }
  }

  console.log('Master version:', masterVersion);
  console.log('Stable version:', stableVersion);

  const results = {};

  for (const app of APPS) {
    const version = app.name === 'master' ? masterVersion : stableVersion;
    results[app.name] = runDashboardForApp(app, version);
  }

  // Save combined report
  const report = {
    meta: {
      generatedAt: new Date().toISOString(),
      masterVersion,
      stableVersion,
    },
    apps: APPS.map(app => ({
      ...app,
      expectedVersion: app.name === 'master' ? masterVersion : stableVersion,
      result: results[app.name],
    })),
  };

  fs.writeFileSync(
    path.join(STATE_DIR, 'dashboard-monitor-both.json'),
    JSON.stringify(report, null, 2)
  );

  console.log('\n=== Summary ===');
  console.log(`Master (${masterVersion}): ${results.master.success ? '✓' : '⚠'}`);
  if (results.stable) {
    console.log(`Stable (${stableVersion}): ${results.stable.success ? '✓' : '⚠'}`);
  }
  console.log(`\nReport: ${path.join(STATE_DIR, 'dashboard-monitor-both.json')}`);
}

main();
