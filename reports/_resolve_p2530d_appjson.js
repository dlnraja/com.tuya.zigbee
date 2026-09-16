'use strict';
const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'app.json');
const composePath = path.join(__dirname, '..', 'drivers', 'wall_dimmer_tuya', 'driver.compose.json');
let raw = fs.readFileSync(appPath, 'utf8');

if (raw.includes('<<<<<<< HEAD')) {
  const head = raw.split('<<<<<<< HEAD\n')[1].split('\n=======')[0];
  raw = head.endsWith('\n') ? head : `${head}\n`;
}

raw = raw.replace(/"version"\s*:\s*"5\.12\.\d+"/, '"version":"5.12.208"');
const app = JSON.parse(raw);

const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
const fwMfr = compose.firmwareUpdates?.updates?.[0]?.device?.manufacturerName?.[0];
if (!fwMfr) throw new Error('compose missing firmwareUpdates mfr');

const drivers = Array.isArray(app.drivers) ? app.drivers : [];
const dimmer = drivers.find((d) => d && d.id === 'wall_dimmer_tuya');
if (dimmer?.firmwareUpdates?.updates?.[0]?.device) {
  dimmer.firmwareUpdates.updates[0].device.manufacturerName = [fwMfr];
  console.log('patched app.json wall_dimmer firmwareUpdates ->', fwMfr);
} else {
  console.log('warn: wall_dimmer_tuya firmwareUpdates not found in app.json drivers');
}

app.version = '5.12.208';
fs.writeFileSync(appPath, `${JSON.stringify(app)}\n`);
console.log('resolved version', app.version, 'size', fs.statSync(appPath).size);
