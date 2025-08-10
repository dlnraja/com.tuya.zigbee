'use strict';
const fs=require('fs'),path=require('path'),glob=require('glob');
function reindex(){const index=[];const drivers=glob.sync('drivers/**/driver.json');
for(const d of drivers){try{const driver=JSON.parse(fs.readFileSync(d,'utf8'));const dir=path.dirname(d);
index.push({dir:path.relative(process.cwd(),dir),id:driver.id,capabilities:driver.capabilities||[],compose:path.relative(process.cwd(),d)});
}catch(e){console.error(`[reindex] error with ${d}:`,e.message);}}
fs.writeFileSync('drivers-index.json',JSON.stringify(index,null,2));console.log(`[reindex] ${index.length} drivers indexed`);}
reindex();
