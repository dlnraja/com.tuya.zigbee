'use strict';

/**
 * P2479 — CI unblock: smart_knob flow UX + rkgngb5o CCT couple.
 * Contre quoi: Auto-Publish / syntax-check fail on missing knob cards or dual-claim bulb.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const flow = JSON.parse(fs.readFileSync(
  path.join(ROOT, 'drivers', 'smart_knob', 'driver.flow.compose.json'), 'utf8'
));
const ids = new Set([
  ...(flow.triggers || []).map((c) => c.id),
  ...(flow.conditions || []).map((c) => c.id),
  ...(flow.actions || []).map((c) => c.id),
]);

for (const id of [
  'smart_knob_rotate_left',
  'smart_knob_rotate_right',
  'smart_knob_brightness_changed',
  'smart_knob_set_brightness',
  'smart_knob_brightness_above',
]) {
  assert.ok(ids.has(id), `P2479 missing flow ${id}`);
}

const dim = JSON.parse(fs.readFileSync(
  path.join(ROOT, 'drivers', 'bulb_dimmable', 'driver.compose.json'), 'utf8'
));
const mfrs = (dim.zigbee.manufacturerName || []).map((m) => String(m).toLowerCase());
assert.ok(!mfrs.includes('_tzb210_rkgngb5o'), 'P2479: rkgngb5o must not live on bulb_dimmable (TS0502B CCT)');

const tun = JSON.parse(fs.readFileSync(
  path.join(ROOT, 'drivers', 'bulb_tunable_white', 'driver.compose.json'), 'utf8'
));
assert.ok(
  (tun.zigbee.manufacturerName || []).some((m) => /rkgngb5o/i.test(m)),
  'P2479: rkgngb5o stays on bulb_tunable_white'
);

// WHY(P2480b): button-flow-harvest must merge, not wipe smart_knob rotary UX
const harvest = fs.readFileSync(
  path.join(ROOT, 'tools', 'ci', 'button-flow-harvest.js'), 'utf8'
);
assert.ok(harvest.includes('never REPLACE smart_knob') || harvest.includes('merge: true')
  || (harvest.includes('smart_knob_switch') && harvest.includes('smart_knob_rotate_left')),
  'P2480b: harvest must preserve/merge rotary UX cards');

console.log('P2479 smart_knob flows + rkgngb5o CCT couple: PASS');
