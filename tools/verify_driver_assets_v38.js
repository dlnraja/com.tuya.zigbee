"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, "drivers");
const REPORT_DIR = path.join(ROOT, "project-data");
const REPORT_FILE = path.join(REPORT_DIR, "asset_size_report_v38.json");

function ensureDir(p){ try{ fs.mkdirSync(p, { recursive: true }); } catch{} }
function exists(p){ try{ fs.accessSync(p); return true; } catch { return false; } }

function listDriverFolders(){
  if (!exists(DRIVERS_DIR)) return [];
  return fs.readdirSync(DRIVERS_DIR).filter(d => exists(path.join(DRIVERS_DIR, d)));
}

// Minimal PNG dimension reader (reads IHDR width/height)
function readPngSize(file){
  try{
    const buf = fs.readFileSync(file);
    // PNG signature 8 bytes, then IHDR chunk: 4 length + 4 type + 13 data
    if (buf.length < 33) return null;
    // Verify signature
    const sig = Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]);
    if (!buf.slice(0,8).equals(sig)) return null;
    // IHDR starts at 8+8=16 offset (after length+type), but safer to search for 'IHDR'
    const idx = buf.indexOf(Buffer.from('IHDR'));
    if (idx < 0) return null;
    const dataStart = idx + 4;
    const width = buf.readUInt32BE(dataStart);
    const height = buf.readUInt32BE(dataStart + 4);
    return { width, height };
  } catch(e){ return null; }
}

(function main(){
  ensureDir(REPORT_DIR);
  const result = { timestamp: new Date().toISOString(), drivers: [] };
  const folders = listDriverFolders();
  for (const folder of folders){
    const assetsDir = path.join(DRIVERS_DIR, folder, 'assets');
    const smallPng = path.join(assetsDir, 'small.png');
    const largePng = path.join(assetsDir, 'large.png');
    const entry = { folder, small: null, large: null, needsFix: false };
    if (exists(smallPng)){
      const s = readPngSize(smallPng);
      if (s) entry.small = s;
      if (!s || s.width !== 75 || s.height !== 75) entry.needsFix = true;
    } else {
      entry.small = { missing: true };
      entry.needsFix = true;
    }
    if (exists(largePng)){
      const l = readPngSize(largePng);
      if (l) entry.large = l;
      if (!l || l.width !== 500 || l.height !== 500) entry.needsFix = true;
    } else {
      entry.large = { missing: true };
      entry.needsFix = true;
    }
    result.drivers.push(entry);
  }
  fs.writeFileSync(REPORT_FILE, JSON.stringify(result, null, 2) + "\n", "utf8");
  console.log(`Asset size verification complete. Report: ${REPORT_FILE}`);
})();
