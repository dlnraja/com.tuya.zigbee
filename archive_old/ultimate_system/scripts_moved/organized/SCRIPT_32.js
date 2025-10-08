#!/usr/bin/env node
// SCRIPT 32 - Archive & enrich
const fs = require('fs');
const { execSync } = require('child_process');

console.log('SCRIPT 32 v2.0.0');

// Setup
if (!fs.existsSync('./archives')) fs.mkdirSync('./archives', {recursive: true});

// Get commits
const commits = execSync('git log --oneline -100', {encoding: 'utf8'}).split('\n');
const data = {mfg: [], prod: []};

// Extract & archive
commits.forEach((c, i) => {
  if (!c) return;
  const [hash] = c.split(' ');
  const dir = `./archives/${hash.substring(0,7)}_${i}`;
  fs.mkdirSync(dir, {recursive: true});
  fs.writeFileSync(`${dir}/info.txt`, c);
  
  (c.match(/_TZ[A-Z0-9_]+/g) || []).forEach(id => data.mfg.push(id));
  (c.match(/TS[0-9A-F]+/g) || []).forEach(id => data.prod.push(id));
});

// Enrich drivers
fs.readdirSync('./drivers').slice(0,10).forEach(d => {
  const f = `./drivers/${d}/driver.compose.json`;
  if (fs.existsSync(f) && data.mfg[0]) {
    const json = JSON.parse(fs.readFileSync(f));
    json.zigbee.manufacturerName = [data.mfg[0]];
    fs.writeFileSync(f, JSON.stringify(json, null, 2));
  }
});

console.log(`✅ Archived ${commits.length} commits, enriched drivers`);
