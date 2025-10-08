"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, "drivers");
const REPORT_DIR = path.join(ROOT, "project-data");
const OUT = path.join(REPORT_DIR, "compose_integrity_report_v38.json");

function exists(p){ try{ fs.accessSync(p); return true; } catch { return false; } }
function ensureDir(p){ if (!exists(p)) fs.mkdirSync(p, { recursive: true }); }

(function main(){
  ensureDir(REPORT_DIR);
  const res = { timestamp: new Date().toISOString(), ok: true, drivers: [], errors: [] };
  if (!exists(DRIVERS_DIR)){
    res.ok = false; res.errors.push({ type: 'missing_drivers_dir', path: DRIVERS_DIR });
    fs.writeFileSync(OUT, JSON.stringify(res, null, 2)+"\n", 'utf8');
    console.log(`Integrity report -> ${OUT}`);
    return;
  }
  const folders = fs.readdirSync(DRIVERS_DIR).filter(d => exists(path.join(DRIVERS_DIR, d, 'driver.compose.json')));
  for (const folder of folders){
    const file = path.join(DRIVERS_DIR, folder, 'driver.compose.json');
    try {
      const text = fs.readFileSync(file, 'utf8');
      JSON.parse(text);
      res.drivers.push({ folder, file, status: 'ok' });
    } catch (e){
      res.ok = false;
      res.drivers.push({ folder, file, status: 'parse_failed' });
      res.errors.push({ folder, file, error: e.message });
    }
  }
  fs.writeFileSync(OUT, JSON.stringify(res, null, 2)+"\n", 'utf8');
  console.log(`Integrity report -> ${OUT}`);
})();
