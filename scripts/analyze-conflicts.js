'use strict';
const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');
const dirs = fs.readdirSync(DRIVERS_DIR);
const index = {};

dirs.forEach(dir => {
  const cp = path.join(DRIVERS_DIR, dir, 'driver.compose.json');
  if (!fs.existsSync(cp)) return;
  try {
    const c = JSON.parse(fs.readFileSync(cp, 'utf8'));
    if (!c.zigbee) return;
    const mfs = c.zigbee.manufacturerName || [];
    const pids = c.zigbee.productId || [];
    mfs.forEach(mf => {
      pids.forEach(pid => {
        const key = mf.toUpperCase() + '|' + pid.toUpperCase();
        if (!index[key]) index[key] = [];
        if (!index[key].includes(dir)) index[key].push(dir);
      });
    });
  } catch (e) { /* skip */ }
});

const conflicts = Object.entries(index).filter(([, d]) => d.length > 1);
console.log('Conflits:', conflicts.length);

// Top paires en conflit
const byPair = {};
conflicts.forEach(([key, drivers]) => {
  const sorted = [...drivers].sort();
  const pairKey = sorted.join(' + ');
  if (!byPair[pairKey]) byPair[pairKey] = 0;
  byPair[pairKey]++;
});

const top = Object.entries(byPair).sort((a, b) => b[1] - a[1]).slice(0, 15);
console.log('\nTop conflits par paires de drivers:');
top.forEach(([pair, count]) => {
  console.log('  ' + count + 'x : ' + pair);
});
