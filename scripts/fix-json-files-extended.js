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

function removeComments(txt){
  // Supprimer /* ... */ et // ... en fin de ligne (approximation suffisante)
  return txt
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:\\])\/\/.*$/gm, '$1');
}

function removeTrailingCommas(txt){
  return txt
    .replace(/,(\s*}[\s]*)/g, '$1')
    .replace(/,(\s*][\s]*)/g, '$1');
}

function quoteUnquotedKeys(txt){
  // Ajouter des quotes doubles autour des clés non quotées: key: value -> "key": value
  // Évite d'agir dans les chaînes en supposant un format simple (fichier JSON, pas JS)
  return txt.replace(/(^|\{|\s)([A-Za-z0-9_\-]+)\s*:/g, (m, p1, key) => {
    // Si déjà entre quotes, ne rien faire
    if (/^\s*"/.test(m)) return m;
    return `${p1}"${key}":`;
  });
}

function normalizeSingleQuotedKeys(txt){
  // 'key': -> "key":
  return txt.replace(/'([^'\n\r]+)'\s*:/g, '"$1":');
}

function tryFix(content){
  let txt = content;
  const transforms = [
    stripBOM,
    removeComments,
    removeTrailingCommas,
    normalizeSingleQuotedKeys,
    quoteUnquotedKeys,
    removeTrailingCommas
  ];
  for (let i=0;i<transforms.length;i++){
    try { JSON.parse(txt); return { ok:true, txt }; } catch {}
    txt = transforms[i](txt);
  }
  // Dernière tentative
  try { JSON.parse(txt); return { ok:true, txt }; } catch(err) { return { ok:false, err, txt }; }
}

function main(){
  const files = listJsonFiles(process.cwd());
  let fixed = 0, failed = 0;
  for (const file of files){
    try{
      const raw = fs.readFileSync(file,'utf8');
      try { JSON.parse(raw); continue; } catch {}
      const { ok, txt } = tryFix(raw);
      if (ok && txt !== raw){ fs.writeFileSync(file, txt); fixed++; }
      else if (!ok) failed++;
    }catch{ failed++; }
  }
  console.log(`[json-fix-ext] fixed=${fixed} failed=${failed}`);
}

if (require.main===module) main();
