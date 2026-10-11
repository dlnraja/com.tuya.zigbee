'use strict';

/**
 * Test — Flow card IDs referenced at runtime exist in app.json (P92.100)
 *
 * Regression guard for the "Invalid Flow Card ID" family found in user
 * diagnostics (2026-08-03/04): driver.js/device.js referenced IDs that were
 * renamed/hashed in app.json — every such call throws at runtime and the
 * user's flows silently die.
 *
 * Scope: literal string IDs passed to getActionCard / getConditionCard /
 * getDeviceTriggerCard / getTriggerCard / getDeviceActionCard /
 * getDeviceConditionCard in drivers' driver.js and device.js files.
 * Dynamic/template-built IDs are out of scope (cannot be statically proven).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..');


// WHY(2026-10-11): without a local .homeybuild, root app.json only carries the ~200 app-level cards
// (driver cards were deduped into drivers/*/driver.flow.compose.json, P2381) — merge them like `homey app build`.
function driverComposeFlow() {
  const out = { triggers: [], conditions: [], actions: [] };
  const dir = path.join(ROOT, 'drivers');
  for (const d of fs.readdirSync(dir)) {
    const f = path.join(dir, d, 'driver.flow.compose.json');
    if (!fs.existsSync(f)) {continue;}
    let j; try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
    for (const t of Object.keys(out)) {for (const c of j[t] || []) {out[t].push(c);}}
  }
  return out;
}

function collectManifestIds() {
  const appFile = fs.existsSync(path.join(ROOT, '.homeybuild', 'app.json'))
    ? path.join(ROOT, '.homeybuild', 'app.json')
    : path.join(ROOT, 'app.json');
  const app = JSON.parse(fs.readFileSync(appFile, 'utf8'));
  const ids = new Set();
  for (const section of ['triggers', 'actions', 'conditions']) {
    for (const card of (app.flow && app.flow[section]) || []) {
      if (card && card.id) { ids.add(card.id); }
    }
  }
  if (!fs.existsSync(path.join(ROOT, '.homeybuild', 'app.json'))) {
    const dc = driverComposeFlow();
    for (const t of Object.keys(dc)) {for (const c of dc[t]) {if (c && c.id) {ids.add(c.id);}}}
  }
  return ids;
}

const GETTER_RX = /(?:getDeviceTriggerCard|getTriggerCard|getDeviceActionCard|getActionCard|getDeviceConditionCard|getConditionCard)\(\s*'([a-z0-9_]+)'/g;
const TRIGGER_ARRAY_RX = /_triggerIds\s*=\s*\[([\s\S]*?)\]/g;
const STRING_RX = /'([a-z0-9_]+)'/g;

function collectReferencedIds(file) {
  const src = fs.readFileSync(file, 'utf8');
  const ids = new Set();
  let m;
  const getter = new RegExp(GETTER_RX.source, 'g');
  while ((m = getter.exec(src))) { ids.add(m[1]); }
  const arrays = new RegExp(TRIGGER_ARRAY_RX.source, 'g');
  while ((m = arrays.exec(src))) {
    const strings = new RegExp(STRING_RX.source, 'g');
    let s;
    while ((s = strings.exec(m[1]))) { ids.add(s[1]); }
  }
  return ids;
}

describe('flow card IDs referenced by drivers exist in app.json', () => {
  it('has no missing literal flow card ID', () => {
    const manifestIds = collectManifestIds();
    assert.ok(manifestIds.size > 1000, `manifest flow cards: ${manifestIds.size}`);

    const driversDir = path.join(ROOT, 'drivers');
    const missing = [];
    for (const driverId of fs.readdirSync(driversDir)) {
      for (const fileName of ['driver.js', 'device.js']) {
        const file = path.join(driversDir, driverId, fileName);
        if (!fs.existsSync(file)) { continue; }
        for (const id of collectReferencedIds(file)) {
          if (!manifestIds.has(id)) {
            missing.push(`${driverId}/${fileName}: ${id}`);
          }
        }
      }
    }
    assert.deepStrictEqual(missing, [],
      `${missing.length} flow card ID(s) référencé(s) mais absent(s) d'app.json:\n${missing.slice(0, 20).join('\n')}`);
  });
});
