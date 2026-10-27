'use strict';
// P3070: on bastien-home (and partly master/stable) every wifi_* driver declares repair [{id:'configure'}] but shipped no
// repair/configure.html, so "Repair" opened an empty view. Each driver now has one, and the view
// only emits a handler that its driver base really registers in onRepair (TuyaLocalDriver:
// update_credentials; EweLinkLocalDriver: configure; plain Driver/ZigBeeDriver: none, info only).
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const handlers = (src) => {
  const i = src.indexOf('onRepair(');
  if (i < 0) {return [];}
  return [...src.slice(i, i + 4000).matchAll(/setHandler\(\s*['"]([a-zA-Z_]+)['"]/g)].map((m) => m[1]);
};
// P3072: the generated wifi_sonoff_* drivers register the eWeLink repair handler through this helper.
const EWE_FILE = 'lib/ewelink-local/eweLinkRepair.js';
const EWE_REPAIR = fs.existsSync(path.join(ROOT, EWE_FILE))
  ? [...read(EWE_FILE).matchAll(/setHandler\(\s*['"]([a-zA-Z_]+)['"]/g)].map((m) => m[1]) : [];
const BASES = {
  TuyaLocalDriver: handlers(read('lib/tuya-local/TuyaLocalDriver.js')),
  EweLinkLocalDriver: [...handlers(read('lib/ewelink-local/EweLinkLocalDriver.js')),
    ...read('lib/ewelink-local/EweLinkLocalDriver.js').includes('registerEweLinkRepairHandlers(') ? EWE_REPAIR : []],
};
const WIZ_FILE = 'lib/ir/irWizardSession.js';
const WIZARD = fs.existsSync(path.join(ROOT, WIZ_FILE))
  ? [...read(WIZ_FILE).matchAll(/setHandler\(\s*['"]([a-zA-Z_]+)['"]/g)].map((m) => m[1]) : [];
const wifi = fs.readdirSync(path.join(ROOT, 'drivers')).filter((d) => d.startsWith('wifi_'));

describe('P3070 wifi_* repair views', () => {
  it('every wifi_* driver that declares a repair view ships its html', () => {
    const missing = [];
    for (const d of wifi) {
      const c = JSON.parse(read(`drivers/${d}/driver.compose.json`));
      for (const r of c.repair || []) {
        if (!fs.existsSync(path.join(ROOT, 'drivers', d, 'repair', `${r.id}.html`))) {missing.push(`${d}/${r.id}`);}
      }
    }
    assert.deepStrictEqual(missing, []);
  });

  it('each view emits only handlers its driver registers', () => {
    const bad = [];
    for (const d of wifi) {
      const f = path.join(ROOT, 'drivers', d, 'repair', 'configure.html');
      if (!fs.existsSync(f)) {continue;}
      const emits = [...fs.readFileSync(f, 'utf8').matchAll(/\.emit\(\s*['"]([a-zA-Z_]+)['"]/g)].map((m) => m[1]);
      const drv = read(`drivers/${d}/driver.js`);
      const base = Object.keys(BASES).find((b) => drv.includes(`/${b}'`) || drv.includes(`/${b}"`));
      // A driver with its own onRepair and no super.onRepair replaces the base handlers.
      const own = drv.includes('onRepair(') && !drv.includes('super.onRepair');
      const wiz = drv.includes('registerIrWizardHandlers(') ? WIZARD : [];
      const ewe = drv.includes('registerEweLinkRepairHandlers(') ? EWE_REPAIR : [];
      const have = new Set([...base && !own ? BASES[base] : [], ...handlers(drv), ...wiz, ...ewe]);
      for (const e of emits) {if (!have.has(e)) {bad.push(`${d}:${e}`);}}
    }
    assert.deepStrictEqual(bad, []);
  });

  it('views send the keys their handler reads', () => {
    const src = read('drivers/wifi_plug/repair/configure.html');
    if (src.includes("emit('update_credentials'") || src.includes('emit("update_credentials"')) {
      for (const k of ['ip_address', 'local_key', 'protocol_version']) {assert.ok(src.includes(`p.${k}`), k);}
    }
    const ew = read('drivers/wifi_ewelink_plug/repair/configure.html');
    for (const k of ['ip', 'api_key']) {assert.ok(ew.includes(`p.${k}=`), k);}
  });
});
