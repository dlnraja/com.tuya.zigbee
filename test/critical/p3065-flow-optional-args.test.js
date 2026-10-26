'use strict';
// P3065 D18 — 12 app-level Flow args were marked `"optional": true`, a key Homey ignores (the SDK docs use
// `"required": false`), so users had to fill fields whose title says "(optional)". Their run listeners in
// app.js already fall back when the arg is missing (filter(Boolean) / `|| default`).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
const OPTIONAL = {
  lux_adaptive_dim_enroll: ['lux_sensor'], soft_ambient_sync_apply: ['light_b', 'light_c'],
  soft_device_link_enroll: ['light_b'], absence_energy_soft_enroll: ['device_b'],
  mirror_light_sync_enroll: ['follower_b'], contact_entry_soft_enroll: ['light_b', 'quiet_start', 'quiet_end'],
  lamp_mesh_occupancy_enroll: ['light_c'], welcome_home_soft_enroll: ['light_b'], peak_load_soft_shed_enroll: ['light_b'],
};

function allCards() {
  const out = [];
  for (const k of ['triggers', 'conditions', 'actions']) for (const c of app.flow[k] || []) out.push(['app.json', c]);
  for (const k of ['triggers', 'conditions', 'actions']) {
    const dir = path.join(ROOT, '.homeycompose/flow', k);
    if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) if (f.endsWith('.json')) out.push([`${k}/${f}`, JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))]);
  }
  for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
    const f = path.join(ROOT, 'drivers', d, 'driver.flow.compose.json');
    if (!fs.existsSync(f)) continue;
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    for (const k of ['triggers', 'conditions', 'actions']) for (const c of j[k] || []) out.push([d, c]);
  }
  return out;
}

test('no Flow arg uses the ignored "optional" key', () => {
  const bad = [];
  for (const [where, c] of allCards()) for (const a of c.args || []) if ('optional' in a) bad.push(`${where}:${c.id}:${a.name}`);
  assert.deepStrictEqual(bad, []);
});

test('the 12 args meant as optional are required:false in app.json and their listener tolerates a missing value', () => {
  const src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  for (const [id, names] of Object.entries(OPTIONAL)) {
    const card = app.flow.actions.find((c) => c.id === id);
    assert.ok(card, id);
    for (const n of names) {
      const a = card.args.find((x) => x.name === n);
      assert.strictEqual(a && a.required, false, `${id}.${n}`);
      assert.ok(new RegExp(`args\\.${n}\\b[^\\n]*(\\]\\.filter\\(Boolean\\)|\\|\\|)`).test(src) || new RegExp(`\\[[^\\]]*args\\.${n}[^\\]]*\\]\\.filter\\(Boolean\\)`).test(src), `${id}.${n} listener fallback`);
    }
  }
});
