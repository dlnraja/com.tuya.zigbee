'use strict';
// P3075 D20: German and Dutch titles for the most-used driver flow cards, written in
// driver.flow.compose.json (the file the bump rebuild reads), only where they were missing.
const assert = require('assert');
const { describe, it } = require('../_support/dual-runner');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const cards = (d) => {
  const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', d, 'driver.flow.compose.json'), 'utf8'));
  return [...j.triggers || [], ...j.conditions || [], ...j.actions || []];
};

describe('P3075 D20 de/nl driver flow titles', () => {
  it('shared button cards carry the D20 wording in compose', () => {
    const t = cards('air_purifier_din').map((c) => c.title || {});
    const single = t.find((x) => x.fr === 'Appui simple - physique');
    assert.ok(single, 'card present');
    assert.strictEqual(single.de, 'Einfacher Druck – Taste');
    assert.strictEqual(single.nl, 'Enkele druk – knop');
  });

  it('batch 2 uses device-aware wording (lock, fan, radiator) in compose', () => {
    const get = (d, id) => (cards(d).find((c) => c.id === id) || {}).title || {};
    assert.strictEqual(get('lock_smart', 'lock_smart_lock').de, 'Verriegeln');
    assert.strictEqual(get('lock_smart', 'lock_smart_unlock').nl, 'Ontgrendelen');
    assert.strictEqual(get('hybrid_fan_sensor', 'hybrid_fan_sensor_turned_on').nl, 'Ventilator ingeschakeld');
    const mode = get('radiator_controller', 'heating_mode_is');
    assert.strictEqual(mode.de, 'Heizmodus !{{ist|ist nicht}} [[mode]]');
    assert.strictEqual(mode.nl, 'Verwarmingsmodus !{{is|is niet}} [[mode]]');
  });

  it('batch 3 covers the deferred and remaining cards, only switch_1gang left', () => {
    const get = (d, id) => (cards(d).find((c) => c.id === id) || {}).title || {};
    const dock = get('wifi_robot_vacuum', 'wifi_robot_vacuum_is_docked');
    assert.strictEqual(dock.de, 'Sauger !{{ist|ist nicht}} in der Ladestation');
    assert.strictEqual(dock.nl, 'Stofzuiger !{{staat|staat niet}} in het laadstation');
    for (const d of ['generic_diy', 'generic_tuya', 'ir_blaster', 'wifi_kettle', 'thermostatic_radiator_valve']) {
      for (const c of cards(d)) {
        if (c.title && c.title.en) { assert.ok(c.title.de && c.title.nl, `${d}:${c.id}`); }
      }
    }
  });

  it('every German title has its Dutch twin and no broken characters', () => {
    const bad = [];
    for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
      if (!fs.existsSync(path.join(ROOT, 'drivers', d, 'driver.flow.compose.json'))) { continue; }
      let list; try { list = cards(d); } catch (_e) { continue; }
      for (const c of list) {
        const t = c.title;
        if (!t || typeof t !== 'object' || !t.de) { continue; }
        if (!t.nl || /\uFFFD/.test(t.de + t.nl)) { bad.push(`${d}:${c.id}`); }
      }
    }
    assert.deepStrictEqual(bad, []);
  });
});
