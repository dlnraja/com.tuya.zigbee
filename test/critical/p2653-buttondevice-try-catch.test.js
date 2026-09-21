'use strict';

/**
 * P2653 — Contre quoi: ButtonDevice.js try without catch (Unified CI Fleetwood / PRE_COMMIT)
 * Broke master tip publish gates with "Missing catch or finally after try".
 */
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const FILE = path.join(ROOT, 'lib', 'devices', 'ButtonDevice.js');

describe('P2653 — ButtonDevice.js syntax (try/catch balance)', () => {
  it('parses with node --check (no Missing catch or finally)', () => {
    const r = spawnSync(process.execPath, ['--check', FILE], { encoding: 'utf8' });
    assert.strictEqual(r.status, 0, r.stderr || r.stdout || 'node --check failed');
  });

  it('scene_recall block closes try with catch (no orphan brace before catch)', () => {
    const src = fs.readFileSync(FILE, 'utf8');
    const marker = 'WHY(P2624): never raw getDeviceTriggerCard';
    const idx = src.indexOf(marker);
    assert.ok(idx > 0, 'P2624 marker present');
    const window = src.slice(idx, idx + 120);
    assert.ok(!/getDeviceTriggerCard[\s\S]*\}\s*\}\s*catch/.test(window), 'no double-close before catch');
    assert.ok(/WHY\(P2624\)[^\n]*\n\s*\} catch/.test(src.slice(idx, idx + 80))
      || /WHY\(P2624\)[^\n]*\n\s*\} catch \(_eScene\)/.test(src.slice(idx, idx + 100)),
      'try closes with catch after P2624 comment');
  });
});
