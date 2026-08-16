#!/usr/bin/env node
'use strict';

/**
 * dual-claim-compose-gate.js
 *
 * Report-only gate: find manufacturerName values (case-folded) that appear in
 * 2+ drivers whose productId sets intersect — exact dual-claim / fingerprint
 * collision risk under Homey pairing.
 *
 * Never modifies drivers. Skips pure brand / catch-all labels.
 *
 * Usage:
 *   node tools/ci/dual-claim-compose-gate.js
 *   node tools/ci/dual-claim-compose-gate.js --json
 *   node tools/ci/dual-claim-compose-gate.js --strict
 *   node tools/ci/dual-claim-compose-gate.js --root C:/path/to/repo
 *
 * Exit 0 by default (warn mode)
 * Exit 1 with --strict only when conflict count > 0 for _TZ* / _TZE* / _TYZB* mfrs
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
let ROOT = path.join(__dirname, '..', '..');
const JSON_MODE = args.includes('--json');
const STRICT = args.includes('--strict');
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--root') ROOT = path.resolve(args[++i]);
}

const DRIVERS_DIR = path.join(ROOT, 'drivers');
const TOP_N = 25;

/** Skip pure brand / deprecated catch-alls (not Tuya sacred-couple style IDs). */
function isSkippedMfr(mfrLower) {
  if (!mfrLower) return true;
  if (mfrLower === 'hobeian' || mfrLower === 'sonoff') return true;
  if (mfrLower.startsWith('lumi.')) return true;
  if (mfrLower.startsWith('_deprecated')) return true;
  return false;
}

function isTzFamily(mfrLower) {
  return (
    mfrLower.startsWith('_tz')
    || mfrLower.startsWith('_tze')
    || mfrLower.startsWith('_tyzb')
  );
}

function asStringList(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return [String(value)].filter(Boolean);
}

function scan() {
  /** @type {Map<string, Array<{driver:string, productIds:Set<string>, rawMfr:string}>>} */
  const byMfr = new Map();
  let scanned = 0;
  let parseErrors = 0;

  if (!fs.existsSync(DRIVERS_DIR)) {
    return { scanned: 0, parseErrors: 0, conflicts: [], tzConflicts: [], error: `missing drivers dir: ${DRIVERS_DIR}` };
  }

  for (const dir of fs.readdirSync(DRIVERS_DIR)) {
    const composePath = path.join(DRIVERS_DIR, dir, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;
    scanned += 1;
    let compose;
    try {
      compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    } catch (err) {
      parseErrors += 1;
      continue;
    }

    const zigbee = compose.zigbee || {};
    const mfrs = asStringList(zigbee.manufacturerName);
    const pids = new Set(asStringList(zigbee.productId).map((p) => p.toLowerCase()));
    if (mfrs.length === 0 || pids.size === 0) continue;

    for (const rawMfr of mfrs) {
      const key = rawMfr.toLowerCase();
      if (isSkippedMfr(key)) continue;
      if (!byMfr.has(key)) byMfr.set(key, []);
      byMfr.get(key).push({ driver: dir, productIds: pids, rawMfr });
    }
  }

  const conflicts = [];
  for (const [mfrLower, entries] of byMfr) {
    // Deduplicate same driver appearing multiple times (case variants of same mfr in one compose)
    const byDriver = new Map();
    for (const e of entries) {
      if (!byDriver.has(e.driver)) {
        byDriver.set(e.driver, { driver: e.driver, productIds: new Set(e.productIds), rawMfr: e.rawMfr });
      } else {
        const existing = byDriver.get(e.driver);
        for (const p of e.productIds) existing.productIds.add(p);
      }
    }
    const drivers = [...byDriver.values()];
    if (drivers.length < 2) continue;

    // Pairwise productId intersection
    for (let i = 0; i < drivers.length; i++) {
      for (let j = i + 1; j < drivers.length; j++) {
        const a = drivers[i];
        const b = drivers[j];
        const shared = [...a.productIds].filter((p) => b.productIds.has(p));
        if (shared.length === 0) continue;
        conflicts.push({
          manufacturerName: mfrLower,
          drivers: [a.driver, b.driver].sort(),
          sharedProductIds: shared.sort(),
          sharedCount: shared.length,
          tzFamily: isTzFamily(mfrLower),
        });
      }
    }
  }

  conflicts.sort((x, y) => {
    if (y.sharedCount !== x.sharedCount) return y.sharedCount - x.sharedCount;
    return x.manufacturerName.localeCompare(y.manufacturerName);
  });

  const tzConflicts = conflicts.filter((c) => c.tzFamily);

  return { scanned, parseErrors, conflicts, tzConflicts };
}

function main() {
  const result = scan();
  const strictFail = STRICT && result.tzConflicts.length > 0;
  const ok = !strictFail && !result.error;

  if (JSON_MODE) {
    console.log(JSON.stringify({
      ok,
      gate: 'dual-claim-compose',
      mode: STRICT ? 'strict' : 'warn',
      scanned: result.scanned,
      parseErrors: result.parseErrors,
      conflictCount: result.conflicts.length,
      tzConflictCount: result.tzConflicts.length,
      conflicts: result.conflicts,
      topConflicts: result.conflicts.slice(0, TOP_N),
      error: result.error || null,
    }, null, 2));
  } else {
    console.log(`dual-claim-compose-gate: scanned ${result.scanned} driver.compose.json files`);
    if (result.error) console.log(`ERROR: ${result.error}`);
    if (result.parseErrors) console.log(`WARN: ${result.parseErrors} unreadable compose file(s)`);
    console.log(
      `Found ${result.conflicts.length} dual-claim conflict(s) `
      + `(${result.tzConflicts.length} involving _TZ/_TZE/_TYZB mfrs)`
    );

    const top = result.conflicts.slice(0, TOP_N);
    if (top.length === 0) {
      console.log('OK: no intersecting manufacturerName+productId dual-claims');
    } else {
      console.log(`Top ${top.length} conflict(s):`);
      for (const c of top) {
        const tag = c.tzFamily ? 'TZ' : 'other';
        console.log(
          `  [${tag}] ${c.manufacturerName} shared=[${c.sharedProductIds.join(', ')}] `
          + `drivers=${c.drivers.join(' | ')}`
        );
      }
      if (result.conflicts.length > TOP_N) {
        console.log(`  ... and ${result.conflicts.length - TOP_N} more`);
      }
    }

    if (STRICT) {
      console.log(strictFail
        ? `STRICT FAIL: ${result.tzConflicts.length} _TZ* family dual-claim(s)`
        : 'STRICT OK: no _TZ* family dual-claims');
    } else {
      console.log('Mode: warn (exit 0). Pass --strict to fail on _TZ* family conflicts.');
    }
  }

  process.exit(ok ? 0 : 1);
}

main();
