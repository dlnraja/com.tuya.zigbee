// !/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

function* listDriverDirs(root){
  for (const entry of fs.readdirSync(root, { withFileTypes:true })){
    const p = path.join(root, entry.name);
    if (entry.isDirectory()){
      const compose = path.join(p, 'driver.compose.json');
      if (fs.existsSync(compose)) yield p; else yield* listDriverDirs(p);
    }
  }
}

function main(){
  const root = path.join(process.cwd(), 'drivers');
  const missing = [];
  if (!fs.existsSync(root)) { console.log('[scan-missing] no drivers/'); return; }
  for (const dir of listDriverDirs(root)){
    const required = [
      'driver.compose.json',
      'device.js',
      'assets/icon.svg',
      'assets/small.png'
    ];
    for (const f of required){
      const p = path.join(dir, f);
      if (!fs.existsSync(p)) missing.push({ driver: dir, missing: f });
    }
  }
  fs.mkdirSync('reports/validation', { recursive:true });
  fs.writeFileSync('reports/validation/missing-required.json', JSON.stringify({generated:new Date().toISOString(), missing}, null,2));
  console.log(`[scan-missing] drivers missing items: ${missing.length}`);
  if (missing.length>0) process.exit(1);
}

if (require.main===module) main();
