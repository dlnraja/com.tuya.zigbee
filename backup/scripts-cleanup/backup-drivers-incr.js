#!/usr/bin/env node
'use strict';

// !/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

function log(msg){ console.log(`[backup-incr] ${msg}`); }

const SRC = path.join(process.cwd(), 'drivers');
const DEST = path.join(process.cwd(), '.backup', 'drivers-snap');

function ensureDir(p){ fs.mkdirSync(p, { recursive: true }); }
function listFiles(dir){
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })){
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(p));
    else out.push(p);
  }
  return out;
}

function copyIfChanged(src, dest){
  try {
    const sStat = fs.statSync(src);
    let dStat = null;
    try { dStat = fs.statSync(dest);}} catch (error) {}
    if (!dStat || sStat.mtimeMs > dStat.mtimeMs || sStat.size !== dStat.size){
      ensureDir(path.dirname(dest));
      fs.copyFileSync(src, dest);
      return true;
    }
  }} catch (error) {}
  return false;
}

(function main(){
  if (!fs.existsSync(SRC)) { log('no drivers/ found, skipping'); process.exit(0); }
  ensureDir(DEST);
  const files = listFiles(SRC);
  let copied = 0;
  for (const file of files){
    const rel = path.relative(SRC, file);
    const to = path.join(DEST, rel);
    if (copyIfChanged(file, to)) copied++;
  }
  log(`snapshot updated: ${copied} files`);
})();
