#!/usr/bin/env node
'use strict';

// !/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const IGNORE_DIRS = new Set(['node_modules','.git','.homeybuild']);
const REPORT_PATH = 'reports/validation/json-lint-report.json';

function listJsonFiles(dir){
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })){
    if (IGNORE_DIRS.has(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listJsonFiles(p));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) out.push(p);
  }
  return out;
}

function main(){
  try { fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true }); }} catch (error) {}
  const files = listJsonFiles(process.cwd());
  const errors = [];
  for (const file of files){
    try {
      const txt = fs.readFileSync(file,'utf8');
      JSON.parse(txt);
    }catch(err){
      errors.push({ file, error: String(err.message||err) });
    }
  }
  const report = { generated: new Date().toISOString(), total: files.length, errors };
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report,null,2));
  console.log(`[json-lint] scanned ${files.length} json files; errors=${errors.length}`);
  if (errors.length>0) process.exit(1);
}

if (require.main===module) main();
