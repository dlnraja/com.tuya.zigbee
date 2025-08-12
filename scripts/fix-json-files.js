#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const IGNORE_DIRS = new Set(['node_modules','.git','.homeybuild']);

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

function stripBOM(txt){
  if (txt.charCodeAt(0) === 0xFEFF) return txt.slice(1);
  return txt.replace(/^\uFEFF/, '');
}

function removeTrailingCommas(txt){
  // Supprimer virgules avant } ou ]
  return txt
    .replace(/,(\s*}[\s]*)/g, '$1')
    .replace(/,(\s*][\s]*)/g, '$1');
}

function main(){
  const files = listJsonFiles(process.cwd());
  let fixed = 0;
  for (const file of files){
    try{
      const raw = fs.readFileSync(file,'utf8');
      try { JSON.parse(raw); continue; } catch {}
      let txt = stripBOM(raw);
      try { JSON.parse(txt); } catch {
        const cleaned = removeTrailingCommas(txt);
        try { JSON.parse(cleaned); txt = cleaned; } catch { /* leave as is */ }
      }
      if (txt !== raw){
        fs.writeFileSync(file, txt);
        fixed++;
      }
    }catch{}
  }
  console.log(`[json-fix] fixed ${fixed} files`);
}

if (require.main===module) main();
