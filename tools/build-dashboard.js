#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const base='drivers', rows=[];
if(fs.existsSync(base)){ for(const d of fs.readdirSync(base,{withFileTypes:true})){
 if(!d.isDirectory())continue; const id=d.name,root=path.join(base,id);
 const metaPath=['driver.compose.json','driver.json'].map(f=>path.join(root,f)).find(f=>fs.existsSync(f));
 let meta={}; if(metaPath){ try{ meta=JSON.parse(fs.readFileSync(metaPath,'utf8')); }catch{} }
 rows.push({ id, class:meta.class||null, capabilities:meta.capabilities||null,
  has_driver_js:fs.existsSync(path.join(root,'driver.js')),
  has_device_js:fs.existsSync(path.join(root,'device.js')),
  has_pair:fs.existsSync(path.join(root,'pair'))});
}}
fs.mkdirSync('docs/data',{recursive:true});
fs.writeFileSync('docs/data/drivers.json', JSON.stringify({generatedAt:new Date().toISOString(),drivers:rows},null,2));
console.log('✅ docs/data/drivers.json');
