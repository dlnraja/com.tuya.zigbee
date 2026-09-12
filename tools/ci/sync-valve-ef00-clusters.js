'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const appPath = path.join(root, 'app.json');
const app = JSON.parse(fs.readFileSync(appPath, 'utf8'));

for (const id of ['water_valve_smart', 'valve_dual_irrigation']) {
  const compose = JSON.parse(fs.readFileSync(
    path.join(root, 'drivers', id, 'driver.compose.json'), 'utf8'));
  const d = app.drivers.find((x) => x.id === id);
  if (!d?.zigbee?.endpoints?.['1']) throw new Error(`missing ${id}`);
  d.zigbee.endpoints['1'].clusters = [...compose.zigbee.endpoints['1'].clusters];
  console.log(id, d.zigbee.endpoints['1'].clusters);
}

fs.writeFileSync(appPath, `${JSON.stringify(app)}\n`);
console.log('app.json valve clusters synced');
