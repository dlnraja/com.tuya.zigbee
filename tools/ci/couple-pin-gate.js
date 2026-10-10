#!/usr/bin/env node
'use strict';
/**
 * Couple pin gate: every manufacturerName listed in config/architecture/couple-driver-pins.json
 * as an exact mfr+pid couple must be claimed (case-insensitive) only by its pinned driver. Fails CI if an enrichment job
 * re-adds it elsewhere. Exit 1 on violation.
 */
const fs = require('fs');
const path = require('path');

function check(root = path.join(__dirname, '..', '..')) {
  const cfg = JSON.parse(fs.readFileSync(path.join(root, 'config/architecture/couple-driver-pins.json'), 'utf8'));
  const pinned = new Map();
  for (const p of cfg.pins) for (const m of p.mfr) pinned.set(m.toLowerCase(), { driver: p.driver, pid: String(p.pid).toLowerCase() });
  const violations = [];
  const missing = new Set(pinned.keys());
  const dd = path.join(root, 'drivers');
  for (const d of fs.readdirSync(dd)) {
    const f = path.join(dd, d, 'driver.compose.json');
    if (!fs.existsSync(f)) continue;
    let j; try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
    const pids = new Set((j.zigbee?.productId || []).map((x) => String(x).toLowerCase()));
    for (const m of j.zigbee?.manufacturerName || []) {
      const pin = pinned.get(String(m).toLowerCase());
      if (!pin || !pids.has(pin.pid)) continue;
      const want = pin.driver;
      if (want !== d) violations.push(`${m}+${pin.pid.toUpperCase()} claimed by ${d} (pinned to ${want})`);
      else missing.delete(String(m).toLowerCase());
    }
  }
  return { violations, missing: [...missing] };
}

if (require.main === module) {
  const { violations, missing } = check();
  for (const v of violations) console.error(`[couple-pin] ${v}`);
  for (const m of missing) console.error(`[couple-pin] ${m} missing from its pinned driver`);
  if (violations.length || missing.length) process.exit(1);
  console.log('[couple-pin] OK');
}
module.exports = { check };
