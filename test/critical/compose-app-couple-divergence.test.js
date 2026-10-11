'use strict';
// Guard: committed app.json must not carry couples or settings that exist in NO driver compose.
// `homey app build` regenerates app.json from compose, so anything only in app.json is silently
// dropped at publish. Stale copies of couples that moved to another driver are reported (not fatal).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
function readJson(f) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } }
function settingIds(node, out = new Set()) {
  if (Array.isArray(node)) { node.forEach((n) => settingIds(n, out)); }
  else if (node && typeof node === 'object') {
    if (typeof node.id === 'string') { out.add(node.id); }
    // `$extends` pulls a template from .homeycompose/drivers/settings/<id>.json (same id at build)
    for (const ext of [].concat(node.$extends || [])) { if (typeof ext === 'string') { out.add(ext); } }
    if (node.children) { settingIds(node.children, out); }
  }
  return out;
}
function analyse() {
  const app = readJson(path.join(ROOT, 'app.json')) || { drivers: [] };
  const everywhere = new Set();
  const perDriver = {};
  const ddir = path.join(ROOT, 'drivers');
  for (const id of fs.existsSync(ddir) ? fs.readdirSync(ddir) : []) {
    const c = readJson(path.join(ddir, id, 'driver.compose.json'));
    if (!c) { continue; }
    const mfrs = ((c.zigbee || {}).manufacturerName || []);
    (Array.isArray(mfrs) ? mfrs : [mfrs]).forEach((m) => everywhere.add(String(m).toLowerCase()));
    const s = settingIds(c.settings);
    settingIds(readJson(path.join(ddir, id, 'driver.settings.compose.json')), s);
    perDriver[id] = s;
  }
  const orphans = []; const orphanSettings = [];
  for (const d of app.drivers || []) {
    if (!perDriver[d.id]) { continue; }
    const mfrs = ((d.zigbee || {}).manufacturerName || []);
    for (const m of Array.isArray(mfrs) ? mfrs : [mfrs]) {
      if (!everywhere.has(String(m).toLowerCase())) { orphans.push(`${d.id}:${m}`); }
    }
    for (const sid of settingIds(d.settings)) {
      if (!perDriver[d.id].has(sid)) { orphanSettings.push(`${d.id}:${sid}`); }
    }
  }
  return { orphans, orphanSettings };
}
describe('compose vs app.json divergence', () => {
  it('no couple exists only in app.json', () => {
    const { orphans } = analyse();
    assert.deepStrictEqual(orphans.slice(0, 20), [], `app.json-only couples (dropped at build): ${orphans.length}`);
  });
  it('no driver setting exists only in app.json', () => {
    const { orphanSettings } = analyse();
    assert.deepStrictEqual(orphanSettings.slice(0, 20), [], `app.json-only settings (dropped at build): ${orphanSettings.length}`);
  });
});
module.exports = { analyse };
