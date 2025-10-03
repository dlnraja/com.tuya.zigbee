#!/usr/bin/env node
/*
 * verify_driver_assets_sizes.js
 * --------------------------------------------------------------
 * Scans driver asset images (small.png, large.png) in each driver folder
 * and verifies PNG sizes:
 *  - small.png must be 75x75
 *  - large.png must be 500x500
 * Writes a report to references/assets_verification.json
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS = path.join(ROOT, 'drivers');
const REF_DIR = path.join(ROOT, 'references');
const OUT = path.join(REF_DIR, 'assets_verification.json');

function ensureDir(d){ if(!fs.existsSync(d)) fs.mkdirSync(d,{recursive:true}); }
function pngSize(buf){
  if (!buf || buf.length < 24) return null;
  // PNG signature
  const sig = Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]);
  if (!buf.slice(0,8).equals(sig)) return null;
  // Width/Height at fixed offsets (IHDR)
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

function checkPng(file, expectedW, expectedH){
  if (!fs.existsSync(file)) return { exists: false, ok: false, width: null, height: null };
  try {
    const buf = fs.readFileSync(file);
    const sz = pngSize(buf);
    if (!sz) return { exists: true, ok: false, width: null, height: null };
    const ok = sz.width === expectedW && sz.height === expectedH;
    return { exists: true, ok, width: sz.width, height: sz.height };
  } catch {
    return { exists: true, ok: false, width: null, height: null };
  }
}

function main(){
  ensureDir(REF_DIR);
  const dirents = fs.readdirSync(DRIVERS,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name);
  const items = [];
  let pass = 0, fail = 0;

  for (const id of dirents){
    const small = path.join(DRIVERS, id, 'assets', 'small.png');
    const large = path.join(DRIVERS, id, 'assets', 'large.png');
    const s = checkPng(small, 75, 75);
    const l = checkPng(large, 500, 500);
    const ok = s.exists && l.exists && s.ok && l.ok;
    if (ok) pass++; else fail++;
    items.push({ id, small: s, large: l, ok });
  }

  const report = { generatedAt: new Date().toISOString(), pass, fail, total: items.length, items: items.slice(0, 100) };
  fs.writeFileSync(OUT, JSON.stringify(report,null,2), 'utf8');
  console.log(`✅ Assets verification: ${pass} pass, ${fail} fail → ${path.relative(ROOT, OUT)}`);
}

if (require.main===module){ try{ main(); } catch(e){ console.error('❌ verify_driver_assets_sizes failed:', e.message); process.exit(1);} }

module.exports = { main };
