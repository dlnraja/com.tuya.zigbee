#!/usr/bin/env node
/**
 * fix-empty-mfr-aggregateerror.js
 *
 * Fix CRITIQUE for the AggregateError bug documented in:
 *   - docs/MASTER_REFERENCE.md:307 (BUG CRITIQUE #4)
 *   - docs/KNOWN_ISSUES.md:54 (v8.5.34)
 *   - docs/issues/WORKAROUNDS.md:207
 *
 * Root cause: 7 drivers still have `"manufacturerName": []` empty array.
 * Even though the v9.0.111 fix eliminated 182 synthetic hybrid drivers,
 * these 7 generic drivers (dimmable_led_strip, light_bulb_rgb_led, etc.)
 * are STILL a server-side build risk per the WORKAROUNDS.md note.
 *
 * Fix: Add a placeholder mfr to each empty driver so the array is non-empty.
 * This is SAFE because these drivers use `$extends` pattern and the
 * placeholder mfrs are unique per driver (won't match real devices).
 *
 * Usage:
 *   node .github/scripts/fix-empty-mfr-aggregateerror.js --apply
 *   node .github/scripts/fix-empty-mfr-aggregateerror.js --revert
 *
 * @author Mavis investigation 2026-07-12
 * @version 1.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DRIVERS = path.resolve(__dirname, '..', '..', 'drivers');
const APPLY = process.argv.includes('--apply');
const REVERT = process.argv.includes('--revert');

const EMPTY_DRIVERS = [
  { id: 'dimmable_led_strip', placeholder: '_TZE200_placeholder_dimmable_led_strip' },
  { id: 'light_bulb_rgb_led', placeholder: '_TZE200_placeholder_light_bulb_rgb_led' },
  { id: 'plug', placeholder: '_TZE200_placeholder_plug' },
  { id: 'rgb_led_strip', placeholder: '_TZE200_placeholder_rgb_led_strip' },
  { id: 'rgb_mood_light', placeholder: '_TZE200_placeholder_rgb_mood_light' },
  { id: 'rgb_wall_led_light', placeholder: '_TZE200_placeholder_rgb_wall_led_light' },
  { id: 'tunable_bulb_E14', placeholder: '_TZE200_placeholder_tunable_bulb_E14' },
];

const MARKER = '// FIX-EMPTY-MFR-AGGREGATEERROR: 2026-07-12 — placeholder added to prevent server-side build crash';

function fix() {
  const results = [];
  for (const { id, placeholder } of EMPTY_DRIVERS) {
    const composePath = path.join(DRIVERS, id, 'driver.compose.json');
    if (!fs.existsSync(composePath)) {
      results.push({ id, status: 'skipped', reason: 'not found' });
      continue;
    }
    let compose;
    try { compose = JSON.parse(fs.readFileSync(composePath, 'utf8')); }
    catch (e) { results.push({ id, status: 'error', reason: e.message }); continue; }

    const before = JSON.stringify(compose, null, 2);
    if (REVERT) {
      if (compose.zigbee && Array.isArray(compose.zigbee.manufacturerName) && compose.zigbee.manufacturerName.includes(placeholder)) {
        compose.zigbee.manufacturerName = compose.zigbee.manufacturerName.filter((m) => m !== placeholder);
        if (compose.zigbee.manufacturerName.length === 0) compose.zigbee.manufacturerName = [];
        // Remove marker
        if (compose._notes && compose._notes.includes(MARKER)) {
          compose._notes = compose._notes.filter((n) => n !== MARKER);
        }
      }
    }
    else {
      // Ensure manufacturerName exists
      compose.zigbee = compose.zigbee || {};
      compose.zigbee.manufacturerName = compose.zigbee.manufacturerName || [];
      // Add placeholder only if empty
      if (compose.zigbee.manufacturerName.length === 0) {
        compose.zigbee.manufacturerName.push(placeholder);
      }
      // Add marker comment in _notes
      compose._notes = compose._notes || [];
      if (!compose._notes.includes(MARKER)) compose._notes.push(MARKER);
    }

    const after = JSON.stringify(compose, null, 2);
    if (before === after) {
      results.push({ id, status: 'no-change' });
      continue;
    }
    if (APPLY) {
      fs.writeFileSync(composePath, after, 'utf8');
      results.push({ id, status: REVERT ? 'reverted' : 'fixed' });
    }
    else {
      results.push({ id, status: REVERT ? 'would-revert' : 'would-fix' });
    }
  }

  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'} (${REVERT ? 'REVERT' : 'FIX'})`);
  console.log('');
  for (const r of results) {
    const icon = r.status === 'fixed' || r.status === 'reverted' ? '✓' :
                 r.status === 'would-fix' || r.status === 'would-revert' ? '○' : '⚠';
    console.log(`  ${icon} ${r.id}: ${r.status}${r.reason ? ' (' + r.reason + ')' : ''}`);
  }
  const changed = results.filter((r) => r.status === 'fixed' || r.status === 'reverted').length;
  console.log(`\n  ${changed} driver(s) ${REVERT ? 'reverted' : 'fixed'}.`);
  if (!APPLY) console.log('  Run with --apply to actually modify files.');
  if (!APPLY) console.log('  Run with --apply --revert to revert.');
}

fix();
