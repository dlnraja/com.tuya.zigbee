#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const glob = (p) => require('child_process').execSync(`powershell -NoProfile -Command "Get-ChildItem -Path '${p}' -Recurse -File | Select-Object -ExpandProperty FullName"`, { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);

const targets = {
  '_TZE284_oitavov2': 'soil_sensor',
  '_TZE284_fhvpaltk': 'valve_irrigation',
  '_TZE200_crq3r3la': 'presence_sensor_radar',
  '_tz3000_akqdg6g7': 'climate_sensor',
  '_tze200_kb5noeto': 'presence_sensor_radar'
};

const driverFiles = glob('drivers').filter(f => f.endsWith('driver.compose.json'));
console.log(`Found ${driverFiles.length} driver.compose.json files`);

for (const [fp, driverId] of Object.entries(targets)) {
  const f = driverFiles.find(d => d.toLowerCase().includes(`\\${driverId.toLowerCase()}\\`));
  if (!f) { console.log(`${fp} -> driver dir not found: ${driverId}`); continue; }
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  const mfrs = (j.zigbee && j.zigbee.manufacturerName) || [];
  const pids = (j.zigbee && j.zigbee.productId) || [];
  const hasMfr = mfrs.some(m => m.toLowerCase() === fp.toLowerCase());
  console.log(`${fp} -> ${f.replace(/\\/g,'/').split('/').slice(-2,-1)[0]}: mfrs contains=${hasMfr} (mfrs count=${mfrs.length})`);
}
