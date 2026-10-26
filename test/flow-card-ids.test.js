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

// WHY(P3067): root app.json may carry only app-level cards (driver cards live in driver.flow.compose.json).
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

// WHY(P3067 2026-10-26): a leftover .homeybuild/app.json from another branch or an older build
// (homey app validate/build in a reused worktree) used to REPLACE the source manifest, so the test
// failed locally (45 "missing" ids on bastien-home) while CI, which never has .homeybuild, was green.
// Source of truth = root app.json + every driver.flow.compose.json; a build copy is only merged when it
// is the same app id + version and not older than app.json (a stale build is ignored, never trusted).
function isFreshBuild(buildFile, rootApp) {
  if (!fs.existsSync(buildFile)) {return false;}
  try {
    const b = JSON.parse(fs.readFileSync(buildFile, 'utf8'));
    if (b.id !== rootApp.id || b.version !== rootApp.version) {return false;}
    return fs.statSync(buildFile).mtimeMs >= fs.statSync(path.join(ROOT, 'app.json')).mtimeMs;
  } catch { return false; }
}

function collectManifestIds() {
  const rootApp = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
  const ids = new Set();
  const addFlow = (flow) => {
    for (const section of ['triggers', 'actions', 'conditions']) {
      for (const card of (flow && flow[section]) || []) {
        if (card && card.id) { ids.add(card.id); }
      }
    }
  };
  addFlow(rootApp.flow);
  addFlow(driverComposeFlow());
  const buildFile = path.join(ROOT, '.homeybuild', 'app.json');
  if (isFreshBuild(buildFile, rootApp)) { addFlow(JSON.parse(fs.readFileSync(buildFile, 'utf8')).flow); }
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

module.exports = { collectManifestIds, isFreshBuild };

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
            // WHY(P2654 3b486847c3): truncated hashed ids (…_xxxxx) were dropped on purpose; the
            // remaining getActionCard calls are try/catch dead paths, not missing cards.
            if (/_[0-9a-f]{5}$/.test(id)) {continue;}
            missing.push(`${driverId}/${fileName}: ${id}`);
          }
        }
      }
    }
    assert.deepStrictEqual(missing, [],
      `${missing.length} flow card ID(s) référencé(s) mais absent(s) d'app.json:\n${missing.slice(0, 20).join('\n')}`);
  });
});
