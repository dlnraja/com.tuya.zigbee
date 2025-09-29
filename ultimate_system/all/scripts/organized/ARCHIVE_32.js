#!/usr/bin/env node
// 📚 ARCHIVE 32 v2.0.0 - Archive commits + enrichit
const fs = require('fs');
const { execSync } = require('child_process');

console.log('📚 ARCHIVE 32 v2.0.0');

// 1. SETUP
const archiveDir = './archives/commits';
if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, {recursive: true});

// 2. ARCHIVE COMMITS
const commits = execSync('git log --oneline -30', {encoding: 'utf8'}).split('\n');
const enrichDB = {};

commits.forEach((c, i) => {
  if (!c.trim()) return;
  const [hash, ...msg] = c.split(' ');
  const dir = `${archiveDir}/${hash.substring(0,7)}_${i}`;
  
  fs.mkdirSync(dir, {recursive: true});
  fs.writeFileSync(`${dir}/info.json`, JSON.stringify({hash, msg: msg.join(' ')}, null, 2));
  
  // Extract data
  const mfg = c.match(/_TZ[A-Z0-9_]+/g) || [];
  const prod = c.match(/TS[0-9A-F]+/g) || [];
  enrichDB[hash] = {mfg, prod};
});

// 3. ENRICH DRIVERS
const uniqueMfg = [...new Set(Object.values(enrichDB).flatMap(d => d.mfg))];
const uniqueProd = [...new Set(Object.values(enrichDB).flatMap(d => d.prod))];

fs.readdirSync('./drivers').slice(0,10).forEach(d => {
  const f = `./drivers/${d}/driver.compose.json`;
  if (fs.existsSync(f)) {
    const data = JSON.parse(fs.readFileSync(f));
    if (uniqueMfg.length > 0) data.zigbee.manufacturerName = [uniqueMfg[0]];
    if (uniqueProd.length > 0) data.zigbee.productId = [uniqueProd[0]];
    fs.writeFileSync(f, JSON.stringify(data, null, 2));
  }
});

// 4. SAVE
fs.writeFileSync('./archives/enrichment_db.json', JSON.stringify({uniqueMfg, uniqueProd, total: commits.length}, null, 2));

console.log(`✅ Archivé ${commits.length} commits, enrichi drivers`);
