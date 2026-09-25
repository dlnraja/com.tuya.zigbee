'use strict';

/**
 * P2746 — Fleet button/remote Homey Flows Contre quoi
 * All tagged dropdown cards (token≠arg) + measure_battery_changed on remotes.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const REMOTE_RE = /button_wireless|scene_switch|smart_remote|wall_remote|handheld_remote|remote_button/;

describe('P2746 fleet button/remote Flows', () => {
  it('no token/arg name collisions on remote drivers', () => {
    const drivers = fs.readdirSync(path.join(ROOT, 'drivers')).filter((d) => REMOTE_RE.test(d));
    const bad = [];
    for (const d of drivers) {
      const fp = path.join(ROOT, 'drivers', d, 'driver.flow.compose.json');
      if (!fs.existsSync(fp)) continue;
      const flow = JSON.parse(fs.readFileSync(fp, 'utf8'));
      for (const t of flow.triggers || []) {
        const args = new Set((t.args || []).map((a) => a.name).filter(Boolean));
        for (const tok of t.tokens || []) {
          if (tok?.name && args.has(tok.name)) bad.push(`${d}:${t.id}:${tok.name}`);
        }
      }
    }
    assert.deepEqual(bad, []);
  });

  it('remotes with measure_battery declare battery_changed card', () => {
    const drivers = fs.readdirSync(path.join(ROOT, 'drivers')).filter((d) => REMOTE_RE.test(d));
    const missing = [];
    for (const d of drivers) {
      const composePath = path.join(ROOT, 'drivers', d, 'driver.compose.json');
      const flowPath = path.join(ROOT, 'drivers', d, 'driver.flow.compose.json');
      if (!fs.existsSync(composePath) || !fs.existsSync(flowPath)) continue;
      const caps = JSON.parse(fs.readFileSync(composePath, 'utf8')).capabilities || [];
      if (!caps.includes('measure_battery')) continue;
      const ids = (JSON.parse(fs.readFileSync(flowPath, 'utf8')).triggers || []).map((t) => t.id);
      if (!ids.some((id) => /battery_changed|measure_battery_changed/i.test(id || ''))) {
        missing.push(d);
      }
    }
    assert.deepEqual(missing, []);
  });

  it('snappy path covers scene_switch short IDs + 1gang (P2746)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/ButtonDevice.js'), 'utf8');
    assert.ok(src.includes('P2746'));
    assert.ok(src.includes('sceneStyle'));
    assert.ok(src.includes('${driverId}_button_pressed'));
    assert.ok(src.includes('capped.length >= 4'));
  });

  it('FlowCardHelper registers compose triggers + battery_changed', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/FlowCardHelper.js'), 'utf8');
    assert.ok(src.includes('P2746'));
    assert.ok(src.includes('driver.flow.compose.json'));
    assert.ok(src.includes('battery_changed'));
  });

  it('npm check:p2746 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2746']);
  });
});
