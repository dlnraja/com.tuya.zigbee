#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const REPORT = 'reports/validation/json-lint-report.json';

function stripBOM(txt){
  if (txt.charCodeAt(0) === 0xFEFF) return txt.slice(1);
  return txt.replace(/^\uFEFF/, '');
}
function removeComments(txt){
  return txt.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/.*$/gm, '$1');
}
function removeTrailingCommas(txt){
  return txt.replace(/,(\s*}[\s]*)/g, '$1').replace(/,(\s*][\s]*)/g, '$1');
}
function normalizeSingleQuotedKeys(txt){
  return txt.replace(/'([^'\n\r]+)'\s*:/g, '"$1":');
}
function quoteUnquotedKeys(txt){
  return txt.replace(/(^|\{|\s)([A-Za-z0-9_\-]+)\s*:/g, (m, p1, key) => {
    if (/^\s*"/.test(m)) return m;
    return `${p1}"${key}":`;
  });
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
  try { JSON.parse(txt); return { ok:true, txt }; } catch(err) { return { ok:false, err, txt }; }
}

function main(){
  if (!fs.existsSync(REPORT)){
    console.log('[auto-fix-report] no report found, abort');
    process.exit(0);
  }
  const rep = JSON.parse(fs.readFileSync(REPORT,'utf8'));
  const errors = Array.isArray(rep.errors)? rep.errors: [];
  let fixed = 0, failed = 0;
  for (const e of errors){
    const file = e.file;
    if (!file || !fs.existsSync(file)) { failed++; continue; }
    try{
      const raw = fs.readFileSync(file,'utf8');
      const { ok, txt } = tryFix(raw);
      if (ok && txt !== raw){ fs.writeFileSync(file, txt); fixed++; }
      else if (!ok) failed++;
    }catch{ failed++; }
  }
  console.log(`[auto-fix-report] fixed=${fixed} failed=${failed} of ${errors.length}`);
}

if (require.main===module) main();
