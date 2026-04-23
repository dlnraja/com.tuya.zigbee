'use strict';
const fs = require('fs');
const path = require('path');
const DDIR = path.join(__dirname, '..', '..', 'drivers');

function loadDrivers() {
  const drivers = [];
  for (const d of fs.readdirSync(DDIR)) {
    const f = path.join(DDIR, d, 'driver.compose.json');
    if (!fs.existsSync(f)) continue;
    try {
      const c = JSON.parse(fs.readFileSync(f, 'utf8'));
      drivers.push({ name: d, mfrs: c.zigbee?.manufacturerName || [], pids: c.zigbee?.productId || [] })       ;
    } catch {}
  }
  return drivers;
}

function findDriver(mfr, pid, drivers) {
  return drivers.filter(d => d.mfrs.includes(mfr) && (!pid || d.pids.includes(pid))).map(d => d.name);
}

const drivers = loadDrivers();
const args = process.argv.slice(2);
if (args.length >= 1 ) {
  const [mfr, pid] = args;
  const matches = findDriver(mfr, pid || null, drivers);
  console.log(matches.length ? matches.join(' , ') : 'NOT FOUND')      ;
} else {
  console.log('Usage: node crossref-user-issues.js <mfr> [pid]');
  console.log('Drivers: ' + drivers.length + ', Total mfrs: ' + drivers.reduce((s,d) => s + d.mfrs.length, 0));
}
