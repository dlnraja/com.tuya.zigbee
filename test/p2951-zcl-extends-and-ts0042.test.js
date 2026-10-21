'use strict';
/**
 * P2951: (1) zcl_cluster_layer setting is declared from compose via $extends whose name equals
 * the setting id (so committed app.json matches compose after build); (2) Marmitek/Eardatek
 * `_TZ3000_dfgbtub0` + TS0042 lives on the 2-button driver only.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const ROOT = path.join(__dirname, '..');

describe('P2951 zcl_cluster_layer $extends', () => {
  it('template file name matches the setting id', () => {
    const f = path.join(ROOT, '.homeycompose/drivers/settings/zcl_cluster_layer.json');
    assert.ok(fs.existsSync(f), 'zcl_cluster_layer.json template');
    assert.ok(!fs.existsSync(path.join(ROOT, '.homeycompose/drivers/settings/zclClusterLayer.json')), 'old camelCase template gone');
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    assert.strictEqual(j.id, 'zcl_cluster_layer');
  });
  it('every driver that pulls the layer uses $extends: ["zcl_cluster_layer"]', () => {
    const bad = [];
    for (const id of fs.readdirSync(path.join(ROOT, 'drivers'))) {
      if (!fs.statSync(path.join(ROOT, 'drivers', id)).isDirectory()) continue; // drivers/README.md (docs)
      for (const name of ['driver.compose.json', 'driver.settings.compose.json']) {
        const f = path.join(ROOT, 'drivers', id, name);
        if (!fs.existsSync(f)) continue;
        const raw = fs.readFileSync(f, 'utf8');
        if (raw.includes('zclClusterLayer')) bad.push(`${id}/${name}`);
        if (!raw.includes('zcl_cluster_layer') && !raw.includes('zclClusterLayer')) continue;
      }
    }
    assert.deepStrictEqual(bad, []);
  });
  it('compose vs app.json divergence reports no orphan zcl_cluster_layer settings', () => {
    // Inline the same analyser as the critical test (mocha-free).
    function settingIds(node, out = new Set()) {
      if (Array.isArray(node)) node.forEach((n) => settingIds(n, out));
      else if (node && typeof node === 'object') {
        if (typeof node.id === 'string') out.add(node.id);
        for (const ext of [].concat(node.$extends || [])) if (typeof ext === 'string') out.add(ext);
        if (node.children) settingIds(node.children, out);
      }
      return out;
    }
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const per = {};
    for (const id of fs.readdirSync(path.join(ROOT, 'drivers'))) {
      if (!fs.statSync(path.join(ROOT, 'drivers', id)).isDirectory()) continue; // drivers/README.md (docs)
      const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));
      const s = settingIds(c.settings);
      const sf = path.join(ROOT, 'drivers', id, 'driver.settings.compose.json');
      if (fs.existsSync(sf)) settingIds(JSON.parse(fs.readFileSync(sf, 'utf8')), s);
      per[id] = s;
    }
    const orphan = [];
    for (const d of app.drivers || []) {
      if (!per[d.id]) continue;
      for (const sid of settingIds(d.settings)) {
        if (sid === 'zcl_cluster_layer' && !per[d.id].has(sid)) orphan.push(d.id);
      }
    }
    assert.deepStrictEqual(orphan.slice(0, 5), [], `orphan zcl_cluster_layer still on ${orphan.length} drivers`);
  });
});

describe('P2951 _TZ3000_dfgbtub0|TS0042 on button_wireless_2', () => {
  function zigbee(id) {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8')).zigbee;
  }
  it('button_wireless_2 holds both case forms and TS0042', () => {
    const z = zigbee('button_wireless_2');
    assert.ok(z.manufacturerName.includes('_TZ3000_dfgbtub0'));
    assert.ok(z.manufacturerName.includes('_tz3000_dfgbtub0'));
    assert.ok(z.productId.includes('TS0042'));
  });
  it('button_wireless_4 keeps the sacred TS0044 couple and never lists TS0042', () => {
    const z = zigbee('button_wireless_4');
    assert.ok(z.manufacturerName.includes('_TZ3000_dfgbtub0'));
    assert.ok(z.productId.includes('TS0044'));
    assert.ok(!z.productId.includes('TS0042'));
  });
  it('button_wireless_2 never lists TS0044 (TS0044 couple stays on button_wireless_4 only)', () => {
    assert.ok(!zigbee('button_wireless_2').productId.includes('TS0044'));
  });
  it('exact couple resolves to button_wireless_2 only among button drivers', () => {
    const owners = [];
    for (const id of fs.readdirSync(path.join(ROOT, 'drivers'))) {
      if (!fs.statSync(path.join(ROOT, 'drivers', id)).isDirectory()) continue; // drivers/README.md (docs)
      const f = path.join(ROOT, 'drivers', id, 'driver.compose.json');
      if (!fs.existsSync(f)) continue;
      const z = JSON.parse(fs.readFileSync(f, 'utf8')).zigbee || {};
      const hasM = (z.manufacturerName || []).some((m) => m.toLowerCase() === '_tz3000_dfgbtub0');
      const hasP = (z.productId || []).includes('TS0042');
      if (hasM && hasP) owners.push(id);
    }
    assert.deepStrictEqual(owners.filter((d) => !d.startsWith('universal') && !d.includes('generic')), ['button_wireless_2']);
  });
});
