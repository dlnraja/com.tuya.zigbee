'use strict';

/**
 * P2416 — CI bare-timer gate + diagnostics dashboard soft shell + draft soft-expect
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');

const orchestrator = fs.readFileSync(
  path.join(ROOT, 'lib', 'tuya-local', 'TuyaPairingOrchestrator.js'),
  'utf8',
);
assert.ok(/native setTimeout/i.test(orchestrator), 'pairing orchestrator documents native timers');

execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'mirror-ci-grep.js')], {
  cwd: ROOT,
  stdio: 'pipe',
});

const waitSrc = fs.readFileSync(
  path.join(ROOT, '.github', 'scripts', 'wait-athom-draft-ready.js'),
  'utf8',
);
assert.ok(waitSrc.includes('decideFinalDraftOutcome'), 'final soft-expect helper');
assert.ok(waitSrc.includes('HOMEY_DRAFT_SOFT_EXPECT'), 'soft-expect env');

const gen = fs.readFileSync(
  path.join(ROOT, 'scripts', 'dashboard', 'generate-diagnostics-dashboard.js'),
  'utf8',
);
assert.ok(gen.includes('empty shell') || gen.includes('writing empty'), 'diag soft empty shell');

const hub = fs.readFileSync(
  path.join(ROOT, '.github', 'scripts', 'generate-dashboards-page.js'),
  'utf8',
);
assert.ok(hub.includes('DASHBOARDS.length'), 'hub count uses DASHBOARDS.length');

console.log('P2416 CI + dashboard soft-expect: PASS');
