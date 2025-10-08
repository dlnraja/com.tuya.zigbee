"use strict";
const fs = require("fs");
const path = require("path");

function arg(name, def){ const i = process.argv.indexOf(name); return (i>=0 && i+1<process.argv.length) ? process.argv[i+1] : def; }
function exists(p){ try{ fs.accessSync(p); return true; } catch { return false; } }
function readJSON(p){ return JSON.parse(fs.readFileSync(p, "utf8")); }
function uniq(a){ return Array.from(new Set(a)); }

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, "drivers");
const targetRel = arg("--path");
if (!targetRel){
  console.error("Usage: node tools/fix_coherence_specific.js --path ./drivers/<driver>");
  process.exit(2);
}
const targetDir = path.resolve(ROOT, targetRel);
const targetFile = path.join(targetDir, 'driver.compose.json');

function driverCategory(folder, cls){
  const f = folder.toLowerCase();
  if (cls === 'light' || /bulb|strip|spot|ceiling|rgb|tunable|dimmer/.test(f)) return 'lighting';
  if (cls === 'socket' || /plug|outlet|socket/.test(f)) return 'plugs';
  if (/curtain|roller|shade/.test(f)) return 'curtains';
  if (/door_window|contact/.test(f)) return 'contact';
  if (/motion|pir|presence|radar|vibration/.test(f)) return 'motion';
  if (cls === 'sensor' || /climate|temperature|humidity|air|tvoc|co2|pm25/.test(f)) return 'climate';
  if (/switch|relay/.test(f)) return 'switches';
  if (/smoke|co_detector|gas|water_leak/.test(f)) return 'safety';
  if (/lock|fingerprint/.test(f)) return 'locks';
  return 'other';
}

function listDriverFolders(){
  if (!exists(DRIVERS_DIR)) return [];
  return fs.readdirSync(DRIVERS_DIR).filter(d => exists(path.join(DRIVERS_DIR, d, 'driver.compose.json')));
}

// Build manufacturerName -> categories map across repo
function buildNameCategoryIndex(){
  const index = new Map();
  const climateSet = new Set();
  const folders = listDriverFolders();
  for (const folder of folders){
    const file = path.join(DRIVERS_DIR, folder, 'driver.compose.json');
    let j;
    try { j = readJSON(file); } catch { continue; }
    const names = (j.zigbee && Array.isArray(j.zigbee.manufacturerName)) ? j.zigbee.manufacturerName : [];
    const cat = driverCategory(folder, j.class || '');
    for (const n of names){
      if (!index.has(n)) index.set(n, {});
      index.get(n)[cat] = (index.get(n)[cat] || 0) + 1;
      if (cat === 'climate') climateSet.add(n);
    }
  }
  return { index, climateSet };
}

(function main(){
  if (!exists(targetFile)){
    console.error("Target compose not found:", targetFile);
    process.exit(1);
  }
  const { index: nameIndex, climateSet } = buildNameCategoryIndex();
  const targetFolder = path.basename(targetDir);
  const targetJson = readJSON(targetFile);
  const srcNames = (targetJson.zigbee && Array.isArray(targetJson.zigbee.manufacturerName)) ? targetJson.zigbee.manufacturerName.slice() : [];

  // Keep names that either appear in climate drivers or have climateRatio >= 0.3
  const keep = [];
  const dropped = [];
  for (const n of srcNames){
    const freq = nameIndex.get(n) || {};
    const total = Object.values(freq).reduce((a,b)=>a+b,0);
    const climateCount = freq['climate'] || 0;
    const climateRatio = total ? (climateCount/total) : 0;
    if (climateSet.has(n) || climateRatio >= 0.3) keep.push(n); else dropped.push(n);
  }

  // Fallbacks:
  // (1) If nothing kept but we had source names, select top 50 by climateCount from srcNames.
  if (keep.length === 0 && srcNames.length){
    const scored = srcNames.map(n => {
      const freq = nameIndex.get(n) || {};
      const climateCount = freq['climate'] || 0;
      const total = Object.values(freq).reduce((a,b)=>a+b,0);
      return { n, climateCount, total };
    }).sort((a,b)=> b.climateCount - a.climateCount || b.total - a.total);
    const top = scored.slice(0, 50).map(s => s.n);
    keep.push(...top);
  }
  // (2) If still empty (e.g., srcNames already empty), seed from global climate names top 50.
  if (keep.length === 0){
    const global = Array.from(nameIndex.entries()).map(([n, freq]) => {
      const climateCount = freq['climate'] || 0;
      const total = Object.values(freq).reduce((a,b)=>a+b,0);
      return { n, climateCount, total };
    }).filter(r => r.climateCount > 0)
      .sort((a,b)=> b.climateCount - a.climateCount || b.total - a.total)
      .slice(0, 50)
      .map(r => r.n);
    keep.push(...global);
  }

  targetJson.zigbee = targetJson.zigbee || {};
  targetJson.zigbee.manufacturerName = uniq(keep).sort((a,b)=>a.localeCompare(b));
  fs.writeFileSync(targetFile, JSON.stringify(targetJson, null, 2)+"\n", 'utf8');

  const report = {
    target: targetFolder,
    before: srcNames.length,
    after: keep.length,
    dropped: dropped.length,
    droppedPreview: dropped.slice(0, 20)
  };
  console.log(JSON.stringify(report, null, 2));
})();
