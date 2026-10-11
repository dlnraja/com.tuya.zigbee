'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');

function load(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}
function save(rel, obj) {
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(obj, null, 2)}\n`);
}

// Audit water leak family (Johan #1041)
const wl = load('drivers/water_leak_sensor/driver.compose.json');
for (const m of ['bzt33cyu', 'bfopm9ga', '4qaowtdo', 'qhozxs2b', 'baeiitad', 'k4ej3ww2']) {
  const ok = (wl.zigbee.manufacturerName || []).some((x) => String(x).toLowerCase().includes(m));
  console.log('water', m, ok, 'TS0207', (wl.zigbee.productId || []).includes('TS0207'));
}

const lcdJs = fs.readFileSync(path.join(ROOT, 'drivers/lcdtemphumidsensor_3/device.js'), 'utf8');
console.log('lcd3 response', /on\(\s*['"]response['"]/.test(lcdJs), 'reporting', /on\(\s*['"]reporting['"]/.test(lcdJs));
const lcd = load('drivers/lcdtemphumidsensor_3/driver.compose.json');
console.log('locansqn forms', (lcd.zigbee.manufacturerName || []).filter((x) => /locansqn/i.test(x)).length);

// 1) Remove air-monitor mfr from IAS contact (Johan #1489 → gas_sensor+TS0601)
{
  const rel = 'drivers/contact_sensor/driver.compose.json';
  const c = load(rel);
  const before = c.zigbee.manufacturerName.length;
  c.zigbee.manufacturerName = c.zigbee.manufacturerName.filter((m) => !/vrcfo4i0/i.test(m));
  save(rel, c);
  console.log('contact strip vrcfo4i0', before, '->', c.zigbee.manufacturerName.length);
}

// 2) Moes SR-ZS: move vaq2bfcu+TS0726 from 1gang → 3gang (Johan #1478 / Z2M)
{
  const forms = ['_TZ3002_vaq2bfcu', '_tz3002_vaq2bfcu', '_TZ3002_VAQ2BFCU', '_tz3002_VAQ2BFCU'];
  const p1 = 'drivers/switch_1gang/driver.compose.json';
  const c1 = load(p1);
  const b1 = c1.zigbee.manufacturerName.length;
  c1.zigbee.manufacturerName = c1.zigbee.manufacturerName.filter((m) => !/vaq2bfcu/i.test(m));
  save(p1, c1);
  console.log('1gang strip vaq2bfcu', b1, '->', c1.zigbee.manufacturerName.length);

  const p3 = 'drivers/switch_3gang/driver.compose.json';
  const c3 = load(p3);
  const set = new Set(c3.zigbee.manufacturerName);
  for (const f of forms) set.add(f);
  c3.zigbee.manufacturerName = [...set];
  if (!(c3.zigbee.productId || []).includes('TS0726')) {
    c3.zigbee.productId = [...(c3.zigbee.productId || []), 'TS0726'];
  }
  save(p3, c3);
  console.log(
    '3gang vaq2bfcu',
    c3.zigbee.manufacturerName.filter((m) => /vaq2bfcu/i.test(m)).length,
    'TS0726',
    c3.zigbee.productId.includes('TS0726'),
  );
}

console.log('done');
