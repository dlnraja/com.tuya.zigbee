#!/usr/bin/env node
// Check forum FPs in mfs_db
const fs = require('fs');
const path = require('path');
const mfs = JSON.parse(fs.readFileSync(path.resolve('data/mfs_db.json'), 'utf8'));
const targets = [
  '_TZE284_myd45weu','_TZE200_npj9bug3','_TZE284_aaeasoll',
  '_TZE284_pcdmj88b','_TZE284_hodyryli','_TZE200_ka8l86iu',
  '_TZE204_dhotiauw','_TZE284_81yrt3lo','_TZ3000_mrduubod',
  'HOBEIAN'
];
for (const t of targets) {
  const tl = t.toLowerCase();
  const ms = Object.entries(mfs).filter(([k]) => k.toLowerCase() === tl);
  if (ms.length) {
    for (const [k, v] of ms) {
      const modelIds = v.modelIds || (v.pid ? [v.pid] : []);
      console.log(`${t} -> driverId=${v.driverId} pid=${v.pid} modelIds[${modelIds.length}]=${modelIds.slice(0,5).join(',')}${modelIds.length>5?'...':''}`);
    }
  } else {
    console.log(`${t} -> NOT IN mfs_db`);
  }
}
