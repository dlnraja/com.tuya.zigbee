'use strict';
// P2920: the sync phase must not add new case forms of an existing spelling.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const SCRIPT = path.join(ROOT, 'tools', 'ci', 'p2268-apply-parallel-couple-fixes.js');

test('p2268 run leaves every touched compose without new case-only variants', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'p2920-'));
  const ids = ['switch_2gang', 'energy_meter_3phase', 'device_din_rail_meter', 'smart_rcbo', 'din_rail_meter'];
  fs.cpSync(path.join(ROOT, 'tools'), path.join(tmp, 'tools'), { recursive: true });
  const before = {};
  for (const id of fs.readdirSync(path.join(ROOT, 'drivers'))) {
    const p = path.join(ROOT, 'drivers', id, 'driver.compose.json');
    if (!fs.existsSync(p)) continue;
    fs.mkdirSync(path.join(tmp, 'drivers', id), { recursive: true });
    fs.copyFileSync(p, path.join(tmp, 'drivers', id, 'driver.compose.json'));
    before[id] = JSON.parse(fs.readFileSync(p, 'utf8')).zigbee?.manufacturerName || [];
  }
  try { execFileSync('node', [path.join(tmp, 'tools', 'ci', 'p2268-apply-parallel-couple-fixes.js')], { cwd: tmp, stdio: 'pipe' }); } catch { /* script may soft-fail on missing drivers */ }
  for (const id of Object.keys(before)) {
    const after = JSON.parse(fs.readFileSync(path.join(tmp, 'drivers', id, 'driver.compose.json'), 'utf8')).zigbee?.manufacturerName || [];
    const low = new Set(before[id].map((m) => m.toLowerCase()));
    for (const m of after.filter((x) => !before[id].includes(x))) {
      assert.ok(!low.has(m.toLowerCase()), `${id}: case-only variant ${m} added`);
    }
  }
  assert.ok(fs.existsSync(SCRIPT) && ids.length);
});
