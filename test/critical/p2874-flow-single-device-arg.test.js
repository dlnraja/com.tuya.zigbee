'use strict';
// P2874: `homey app build` always adds the device argument to every card in a
// driver.flow.compose.json. A card that also declares it by hand ends up with
// two `device` args (guidelines FLOW_ARG_DUPLICATE_NAME).
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2874 flow cards carry one device argument', () => {
  it('no driver flow compose card declares its own driver device arg by hand', () => {
    const bad = [];
    for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
      const p = path.join(ROOT, 'drivers', d, 'driver.flow.compose.json');
      if (!fs.existsSync(p)) { continue; }
      const j = JSON.parse(fs.readFileSync(p, 'utf8'));
      for (const k of ['triggers', 'conditions', 'actions']) {
        for (const c of j[k] || []) {
          const devName = c.$deviceName || 'device';
          if ((c.args || []).some((a) => a.type === 'device' && a.name === devName)) { bad.push(`${d}:${c.id}`); }
        }
      }
    }
    assert.deepEqual(bad, []);
  });

  it('app.json flow cards have no duplicate argument names', () => {
    const a = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const bad = [];
    for (const k of ['triggers', 'conditions', 'actions']) {
      for (const c of (a.flow && a.flow[k]) || []) {
        const names = (c.args || []).map((x) => x.name);
        if (names.length !== new Set(names).size) { bad.push(c.id); }
      }
    }
    assert.deepEqual(bad, []);
  });

  it('the cards that lost their hand-written arg still exist (wifi_ir_remote, presence_sensor_radar)', () => {
    const ids = new Set();
    for (const d of ['wifi_ir_remote', 'presence_sensor_radar']) {
      const p = path.join(ROOT, 'drivers', d, 'driver.flow.compose.json');
      if (!fs.existsSync(p)) { continue; }
      const j = JSON.parse(fs.readFileSync(p, 'utf8'));
      for (const k of ['triggers', 'actions']) { for (const c of j[k] || []) { ids.add(c.id); } }
    }
    for (const id of ['wifi_ir_remote_send_raw', 'wifi_ir_remote_start_learn', 'wifi_ir_remote_learning_started']) {
      if (fs.existsSync(path.join(ROOT, 'drivers/wifi_ir_remote'))) { assert.ok(ids.has(id), id); }
    }
  });
});
