'use strict';
const fs=require('fs'),path=require('path'),glob=require('glob');
function enrich(){const tmp=path.join(process.cwd(),'tmp-ingest');if(!fs.existsSync(tmp)){console.log('[enrich] no tmp-ingest found');return;}
let c=0;const drivers=glob.sync('drivers/**/driver.json');
for(const d of drivers){try{const driver=JSON.parse(fs.readFileSync(d,'utf8'));let m=false;
// Merge manufacturerName and modelId arrays
if(driver.manufacturerName&&Array.isArray(driver.manufacturerName)){const existing=new Set(driver.manufacturerName);
const sources=glob.sync(path.join(tmp,'**/manufacturer*.json'));for(const s of sources){try{const data=JSON.parse(fs.readFileSync(s,'utf8'));
if(data.manufacturerName)existing.add(data.manufacturerName);}catch(e){}}const merged=Array.from(existing);
if(merged.length!==driver.manufacturerName.length){driver.manufacturerName=merged;m=true;}}
if(driver.modelId&&Array.isArray(driver.modelId)){const existing=new Set(driver.modelId);
const sources=glob.sync(path.join(tmp,'**/model*.json'));for(const s of sources){try{const data=JSON.parse(fs.readFileSync(s,'utf8'));
if(data.modelId)existing.add(data.modelId);}catch(e){}}const merged=Array.from(existing);
if(merged.length!==driver.modelId.length){driver.modelId=merged;m=true;}}
if(m){fs.writeFileSync(d,JSON.stringify(driver,null,2));c++;console.log(`[enrich] ${d}`);}}catch(e){console.error(`[enrich] error with ${d}:`,e.message);}}
console.log(`[enrich] ${c} drivers updated`);}
enrich();
