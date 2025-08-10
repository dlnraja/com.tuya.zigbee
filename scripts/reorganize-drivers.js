'use strict';
const fs=require('fs'),path=require('path'),glob=require('glob');
function reorganize(){let c=0;const drivers=glob.sync('drivers/**/driver.json');
for(const d of drivers){try{const dir=path.dirname(d);const driver=JSON.parse(fs.readFileSync(d,'utf8'));
// Skip if already in correct format
if(path.basename(dir).includes('-'))continue;
// Determine vendor, category, model
const vendor=driver.manufacturerName?.[0]||'tuya';
const category=driver.capabilities?.[0]||'generic';
const model=driver.modelId?.[0]||path.basename(dir);
const newName=`${vendor}-${category}-${model}`.toLowerCase().replace(/[^a-z0-9-]/g,'-');
const newPath=path.join(path.dirname(dir),newName);
if(newPath!==dir&&!fs.existsSync(newPath)){fs.renameSync(dir,newPath);c++;console.log(`[reorg] ${path.basename(dir)} → ${newName}`);}
}catch(e){console.error(`[reorg] error with ${d}:`,e.message);}}
console.log(`[reorg] ${c} drivers reorganized`);}
reorganize();
