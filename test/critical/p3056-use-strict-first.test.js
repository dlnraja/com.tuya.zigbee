'use strict';

/**
 * P3056 — "use strict" must stay the first statement of a driver/lib module.
 * A codemod (P3045 port) inserted a require() above the directive in drivers/curtain_module/device.js
 * on stable-v5: the directive became a plain expression (strict mode silently lost) and the
 * lint ratchet went red (no-unused-expressions). Ratchet: no NEW file may lose its directive;
 * the files below were already in that state on the three branches and are tracked separately.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const KNOWN = new Set([
  'drivers/curtain_module_2_gang/device.js',
  'drivers/dimmer_1_gang/device.js',
  'drivers/dimmer_1_gang_2/device.js',
  'drivers/dimmer_2_gang/device.js',
  'drivers/dimmer_2_gang_tuya/device.js',
  'drivers/power_clamp_meter/device.js',
  'drivers/remote_button_wireless_usb/device.js',
  'drivers/remote_dimmer/device.js',
  'drivers/switch_1_gang/device.js',
  'drivers/switch_1_gang_metering/device.js',
  'drivers/switch_2_gang/device.js',
  'drivers/switch_2_gang_metering/device.js',
  'drivers/switch_3_gang/device.js',
  'drivers/switch_4_gang_metering/device.js',
  'drivers/wall_remote_4_gang_2/device.js',
  'drivers/wall_switch_1_gang/device.js',
  'drivers/wall_switch_1_gang_tuya/device.js',
  'drivers/wall_switch_2_gang/device.js',
  'drivers/wall_switch_3_gang/device.js',
  'drivers/wall_switch_5_gang_tuya/device.js',
  'drivers/wall_switch_6_gang_tuya/device.js',
  'lib/adapters/SecurityManager.js',
  'lib/performance/PerformanceOptimizer.js',
  'lib/tuya-local/TuyaDeviceDiscovery.js',
  'lib/tuya/DataRecoveryManager.js',
  'lib/utils/ErrorClassifier.js',
  'lib/utils/mask-pii.js',
]);

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p, out); } else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

function directiveLost(src) {
  if (!/^\s*['"]use strict['"];?\s*$/m.test(src)) return false; // no directive at all: not our concern
  let t = src.replace(/^\uFEFF/, '').replace(/^#!.*\n/, '');
  for (;;) {
    const o = t;
    t = t.replace(/^\s+/, '').replace(/^\/\/.*\n?/, '').replace(/^\/\*[\s\S]*?\*\//, '');
    if (t === o) break;
  }
  return !/^['"]use strict['"]/.test(t);
}

test('P3056 directiveLost detects a require above the directive', () => {
  assert.strictEqual(directiveLost("const a = require('x');\n\"use strict\";\n"), true);
  assert.strictEqual(directiveLost("/* h */\n// c\n'use strict';\nconst a = 1;\n"), false);
  assert.strictEqual(directiveLost('const a = 1;\n'), false);
});

test('P3056 no new driver/lib module loses its "use strict" directive', () => {
  const files = [...walk(path.join(ROOT, 'drivers'), []), ...walk(path.join(ROOT, 'lib'), [])];
  const lost = files
    .map(f => path.relative(ROOT, f).split(path.sep).join('/'))
    .filter(rel => !KNOWN.has(rel) && directiveLost(fs.readFileSync(path.join(ROOT, rel), 'utf8')));
  assert.deepStrictEqual(lost, [], `move "use strict" back to line 1 in: ${lost.join(', ')}`);
});

test('P3056 curtain_module keeps strict mode', () => {
  const src = fs.readFileSync(path.join(ROOT, 'drivers/curtain_module/device.js'), 'utf8');
  assert.strictEqual(directiveLost(src), false);
});
