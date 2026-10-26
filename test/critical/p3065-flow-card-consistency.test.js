'use strict';
// P3065: flow-card consistency gate (ratchet). Known findings are frozen below; any NEW
// duplicate id, missing en title, bad arg, titleFormatted [[x]] that is not an arg, or literal
// get*Card('id') reference to an undeclared card fails. Shrinking a list is always allowed.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { audit } = require('../../scripts/diag/flow-card-audit');

const r = audit(path.join(__dirname, '..', '..'));

// Known 2026-10-26. undeclaredRefs are all inside try/catch (legacy helpers; card never declared).
const BASELINE = {
  duplicateIds: 0, // P3065 D3: shadowed driver.compose.json "flow" copies removed after merging their hints into the shipped cards
  noEnTitle: 0,
  badArgs: 0,
  titleFormattedUnknown: 0, // P3065 uplift: arg-less triggers no longer carry a token-based titleFormatted
  undeclaredRefs: 17,
};

for (const [key, max] of Object.entries(BASELINE)) {
  test(`P3065 flow audit: ${key} <= ${max}`, () => {
    assert.ok(r[key].length <= max, `${key} grew to ${r[key].length}:\n${r[key].join('\n')}`);
  });
}

test('P3065 flow audit sees the whole card set', () => {
  assert.ok(r.counts.triggers > 1000 && r.counts.actions > 500 && r.counts.conditions > 100, JSON.stringify(r.counts));
});

test('P3065 flow uplift: no U+FFFD (broken encoding) in driver flow cards', () => {
  const fs = require('fs');
  const root = path.join(__dirname, '..', '..', 'drivers');
  const bad = fs.readdirSync(root).filter((d) => {
    const p = path.join(root, d, 'driver.flow.compose.json');
    return fs.existsSync(p) && fs.readFileSync(p, 'utf8').includes('\uFFFD');
  });
  assert.deepStrictEqual(bad, []);
});

test('P3065 flow uplift D3: curtain calibrate/reset/hold cards keep the hint merged from the removed shadow copy', () => {
  const fs = require('fs');
  const path = require('path');
  const want = {
    air_purifier_curtain: ['air_purifier_curtain_curtain_calibrate', 'air_purifier_curtain_curtain_reset_position', 'air_purifier_curtain_curtain_hold'],
    curtain_motor_tilt: ['curtain_calibrate', 'curtain_reset_position', 'curtain_hold'],
  };
  for (const [d, ids] of Object.entries(want)) {
    const flow = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'drivers', d, 'driver.flow.compose.json'), 'utf8'));
    for (const id of ids) {
      const card = (flow.actions || []).find((c) => c.id === id);
      assert.ok(card, `${d}: ${id} missing`);
      for (const l of ['en', 'fr', 'de', 'nl']) assert.ok(card.hint && card.hint[l], `${d}: ${id} hint.${l} missing`);
    }
    const compose = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'drivers', d, 'driver.compose.json'), 'utf8'));
    assert.strictEqual(compose.flow, undefined, `${d}: shadowed flow block came back in driver.compose.json`);
  }
});

// P3065 D4: the 17 undeclared generic trigger ids are frozen as a SET (not only a count), and every
// literal call site must stay error-safe (inside try, optional chaining, or a safe helper), because
// getDeviceTriggerCard() throws when the card is not declared for that driver.
const KNOWN_UNDECLARED = new Set([
  'alarm_triggered', 'battery_low', 'button_released', 'contact_closed', 'contact_opened', 'device_offline',
  'device_online', 'green_power_action', 'humidity_changed', 'low_battery_warning', 'motion_started',
  'motion_stopped', 'presence_changed', 'scene_button_pressed', 'target_temperature_reached',
  'temperature_changed', 'universal_battery_changed',
].map((id) => `triggers:${id}`));

test('P3065 flow uplift D4: no new undeclared flow card id', () => {
  const fresh = r.undeclaredRefs.filter((x) => !KNOWN_UNDECLARED.has(x));
  assert.deepStrictEqual(fresh, []);
});

test('P3065 flow uplift D4: every literal call to an undeclared trigger is error-safe', () => {
  const fs = require('fs');
  const root = path.join(__dirname, '..', '..');
  const ids = [...KNOWN_UNDECLARED].map((x) => x.split(':')[1]);
  const re = new RegExp(`get(?:Device)?TriggerCard\\??\\.?\\(\\s*['"\`](${ids.join('|')})['"\`]`);
  const unsafe = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.js')) {
        const lines = fs.readFileSync(p, 'utf8').split('\n');
        lines.forEach((l, i) => {
          if (!re.test(l)) return;
          const ctx = lines.slice(Math.max(0, i - 15), i + 1).join('\n');
          if (/\btry\s*\{/.test(ctx) || /\?\.\s*\(|\?\.getDeviceTriggerCard|safeFlowCard|_safeGetCard/.test(l)) return;
          unsafe.push(`${path.relative(root, p)}:${i + 1}`);
        });
      }
    }
  };
  for (const d of ['lib', 'drivers']) walk(path.join(root, d));
  assert.deepStrictEqual(unsafe, []);
});
