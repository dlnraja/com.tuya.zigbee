#!/usr/bin/env node
// Quick check: is each forum-FP in mfs_db? what driverId?
const fs = require('fs');
const path = require('path');
const mfs = JSON.parse(fs.readFileSync(path.resolve('data/mfs_db.json'), 'utf8'));
const targets = ['_TZE284_oitavov2','_TZE284_fhvpaltk','_TZE200_crq3r3la','_tz3000_akqdg6g7','_tze200_kb5noeto'];
for (const t of targets) {
  const tl = t.toLowerCase();
  // mfs_db is keyed by canonical (mfr); scan for exact or case-insensitive
  const matches = Object.entries(mfs).filter(([k]) => k.toLowerCase() === tl);
  if (matches.length === 0) {
    console.log(`${t} -> NOT IN mfs_db`);
    continue;
  }
  for (const [k, v] of matches) {
    const modelIds = v.modelIds || (v.pid ? [v.pid] : []);
    console.log(`${t} -> driverId=${v.driverId} pid=${v.pid} modelIds[${modelIds.length}]=${modelIds.slice(0,5).join(',')}${modelIds.length>5?'...':''}`);
  }
}
