#!/usr/bin/env node
/**
 * fix-fingerprint-conflicts.js
 * Detects and fixes fingerprint conflicts across drivers.
 * v7.4.9: Typo handling (TSO121 -> TS0121) and final specialized rules.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const DRY_RUN = process.argv.includes('--dry-run');

function loadDrivers() {
  const drivers = new Map();
  const dirs = fs.readdirSync(DRIVERS_DIR).filter(d => {
    try { return fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory(); } catch { return false; }
  });

  for (const d of dirs) {
    const cf = path.join(DRIVERS_DIR, d, 'driver.compose.json');
    if (!fs.existsSync(cf)) continue;
    try {
      let raw = fs.readFileSync(cf, 'utf8');
      
      // Fix typos project-wide in memory
      if (raw.includes('TSO121')) {
         console.log(`  - Fixing TSO121 typo in ${d}`);
         raw = raw.replace(/TSO121/g, 'TS0121');
      }
      
      const c = JSON.parse(raw);
      drivers.set(d, {
        path: cf, 
        config: c,
        mfrs: new Set((c.zigbee?.manufacturerName || []).map(m => m.toLowerCase())),
        pids: new Set((c.zigbee?.productId || []).map(p => p.toLowerCase())),
        isGreedy: !c.zigbee?.productId || c.zigbee.productId.length === 0,
        raw, // original (possibly fixed) raw string
      }) ;
    } catch {}
  }
  return drivers;
}

function findConflicts(drivers) {
  const mfrPidMap = new Map();
  for (const [name, d] of drivers) {
    if (d.isGreedy) {
       for (const m of d.mfrs) {
          const key = `${m}|*`;
          if (!mfrPidMap.has(key)) mfrPidMap.set(key, []);
          mfrPidMap.get(key).push(name);
       }
    } else {
       for (const m of d.mfrs) {
          for (const p of d.pids) {
             const key = `${m}|${p}`;
             if (!mfrPidMap.has(key)) mfrPidMap.set(key, []);
             mfrPidMap.get(key).push(name);
          }
       }
    }
  }

  const conflicts = [];
  for (const [key, drvs] of mfrPidMap) {
    if (drvs.length > 1) {
      const [mfr, pid] = key.split('|' );
      conflicts.push({ mfr, pid, drivers: drvs });
    }
  }
  return conflicts;
}

function resolveConflict(conflict, drivers) {
  const { mfr, pid, drivers: drvNames } = conflict;
  const removals = [];

  // Rules: Specialized beats Generic/Hybrid
  const pairs = [
      { spec: 'wall_remote_3_gang', gen: 'button_wireless_2' },
      { spec: 'fingerbot', gen: 'button_wireless_fingerbot_hybrid' },
      { spec: 'dimmer_wall_1gang', gen: 'bulb_dimmable' },
      { spec: 'plug_smart', gen: 'button_wireless_2' },
      { spec: 'plug_energy_monitor', gen: 'button_wireless_2' }
  ];

  for (const pair of pairs) {
     if (drvNames.includes(pair.spec) && drvNames.includes(pair.gen)) {
        removals.push({ driver: pair.gen, mfr, pid, reason: `Specialized driver ${pair.spec} exists` });
        return removals;
     }
  }

  // Greedy check
  const greedy = drvNames.filter(d => drivers.get(d).isGreedy);
  const specialized = drvNames.filter(d => !drivers.get(d).isGreedy);
  if (greedy.length > 0 && specialized.length > 0) {
      for (const g of greedy) {
          removals.push({ driver: g, mfr, pid, reason: 'Greedy catch-all loses to ' + specialized[0] });
      }
      return removals;
  }

  return removals;
}

function main() {
  const drivers = loadDrivers();
  const conflicts = findConflicts(drivers);

  let totalRemoved = 0;
  const removalLog = new Set();

  for (const c of conflicts) {
    const removals = resolveConflict(c, drivers);
    for (const r of removals) {
      const d = drivers.get(r.driver);
      removalLog.add(`${r.driver}: remove [${r.mfr} | ${r.pid}] (${r.reason})`);
      if (!DRY_RUN) {
         if (r.pid === '*') {
            d.config.zigbee.manufacturerName = (d.config.zigbee.manufacturerName || []).filter(m => m.toLowerCase() !== r.mfr.toLowerCase());
         } else {
            d.config.zigbee.productId = (d.config.zigbee.productId || []).filter(p => p.toLowerCase() !== r.pid.toLowerCase());
         }
         totalRemoved++;
      }
    }
  }

  if (!DRY_RUN) {
    for (const [name, d] of drivers) {
      fs.writeFileSync(d.path, JSON.stringify(d.config, null, 2) + '\n');
    }
  }

  console.log(Array.from(removalLog).join('\n'));
  console.log(`\nTotal removals: ${totalRemoved}`);
}

main();
