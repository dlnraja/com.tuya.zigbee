"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const DRIVERS = path.join(ROOT, "drivers");
const REPORT = path.join(ROOT, "project-data", "fs_scan_report.json");

function ex(p){ try{ fs.accessSync(p); return true; } catch { return false; } }
function dj(p){ return JSON.parse(fs.readFileSync(p, "utf8")); }
function ed(p){ if(!ex(p)) fs.mkdirSync(p,{recursive:true}); }

function inferType(folder, cls){
  const f = String(folder || '').toLowerCase();
  const c = String(cls || '').toLowerCase();
  if(/dimmer/.test(f)) return 'dimmer';
  if(/switch/.test(f) && !/dimmer/.test(f)) return 'switch';
  if(/plug|outlet|socket/.test(f)) return 'plug';
  if(/bulb|spot|strip|ceiling.*light/.test(f)) return 'bulb';
  if(/curtain|roller|shade/.test(f)) return 'curtain';
  if(/lock/.test(f)) return 'lock';
  if(/thermostat|radiator/.test(f)) return 'thermostat';
  if(/contact|door.*window/.test(f)) return 'contact';
  if(/motion|pir|radar|presence/.test(f)) return 'motion';
  if(/water.*leak/.test(f)) return 'water_leak';
  if(/smoke/.test(f)) return 'smoke';
  if(/air|co2|pm25|tvoc|formaldehyde/.test(f)) return 'air_quality';
  if(/temp|humidity|climate/.test(f) || c === 'sensor') return 'climate';
  if(/sensor|detector|monitor/.test(f)) return 'sensor';
  return 'other';
}

(function main(){
  ed(path.dirname(REPORT));
  const result = [];
  const folders = ex(DRIVERS) ? fs.readdirSync(DRIVERS) : [];

  for(const folder of folders){
    const file = path.join(DRIVERS, folder, 'driver.compose.json');
    if(!ex(file)) continue;
    try{
      const j = dj(file);
      const dtype = inferType(folder, j.class);
      const names = j?.zigbee?.manufacturerName || [];
      const pids = j?.zigbee?.productId || [];
      result.push({
        folder,
        class: j.class || '',
        type: dtype,
        manufacturerCount: Array.isArray(names) ? names.length : 0,
        productIdCount: Array.isArray(pids) ? pids.length : 0
      });
    } catch(e){
      result.push({ folder, error: e.message });
    }
  }

  const summary = {
    timestamp: new Date().toISOString(),
    drivers: result.length,
    over200: result.filter(r => (r.manufacturerCount||0) > 200).length,
    byType: {}
  };
  for(const r of result){
    if(!r.type) continue;
    summary.byType[r.type] = (summary.byType[r.type]||0) + 1;
  }

  fs.writeFileSync(REPORT, JSON.stringify({ summary, items: result }, null, 2)+"\n", "utf8");
  console.log(`FS scan complete -> ${REPORT}`);
})();
