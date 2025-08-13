// !/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

function isObject(v){ return v && typeof v==='object' && !Array.isArray(v); }
function validateCompose(obj){
  const errors = [];
  if (!obj || !isObject(obj)) return ['compose must be an object'];
  if (!obj.id || typeof obj.id!=='string') errors.push('missing id');
  if (!isObject(obj.name) || !obj.name.en) errors.push('name.en required');
  if (!Array.isArray(obj.capabilities)) errors.push('capabilities must be array');
  if (!isObject(obj.zigbee)) errors.push('zigbee object required');
  return errors;
}

function* listComposes(dir){
  for (const entry of fs.readdirSync(dir, { withFileTypes:true })){
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* listComposes(p);
    if (entry.isFile() && entry.name==='driver.compose.json') yield p;
  }
}

function main(){
  const root = path.join(process.cwd(), 'drivers');
  if (!fs.existsSync(root)) { console.log('[compose-schema] no drivers/'); return; }
  const errors = [];
  for (const file of listComposes(root)){
    try {
      const txt = fs.readFileSync(file,'utf8');
      const json = JSON.parse(txt);
      const errs = validateCompose(json);
      if (errs.length) errors.push({ file, errors: errs });
    }catch(err){ errors.push({ file, errors:[String(err.message||err)]}); }
  }
  const out = { generated: new Date().toISOString(), errors };
  fs.mkdirSync('reports/validation', { recursive: true });
  fs.writeFileSync('reports/validation/compose-schema-report.json', JSON.stringify(out,null,2));
  console.log(`[compose-schema] invalid files: ${errors.length}`);
  if (errors.length>0) process.exit(1);
}

if (require.main===module) main();
