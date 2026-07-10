#!/usr/bin/env node
'use strict';

/**
 * Fingerprint Collision Check v3.0
 *
 * Detects manufacturerName+productId pairs that appear in multiple
 * driver.compose.json files. Existing historical collisions can be tracked in
 * a baseline so CI fails only on new or changed collisions.
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const EXEMPT_DRIVERS = new Set([
  'universal_fallback',
  'tuya_dummy_device',
  'generic_tuya',
  'generic_diy',
  'device_generic_diy_universal',
  'universal_zigbee'
]);

const EXEMPT_KEY_RE = /_hybrid_.*_needs_device_assignment|_master_.*_needs_device_assignment|_stable_v5_.*_needs_device_assignment|_tz3000_unknown|_tze200_placeholder_generic/i;

function parseArgs(argv) {
  const args = { baseline: null, writeBaseline: null, json: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--baseline') args.baseline = argv[++i];
    else if (arg === '--write-baseline') args.writeBaseline = argv[++i];
    else if (arg === '--json') args.json = true;
  }
  return args;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function collisionId(collision) {
  return `${collision.key} -> ${collision.drivers.join(',')}`;
}

function normalizeDrivers(drivers) {
  return [...new Set(drivers)].sort((a, b) => a.localeCompare(b));
}

function collectCollisions() {
  const map = new Map();
  if (!fs.existsSync(DRIVERS_DIR)) return [];

  const dirs = fs.readdirSync(DRIVERS_DIR)
    .filter(name => fs.statSync(path.join(DRIVERS_DIR, name)).isDirectory());

  for (const driverId of dirs) {
    const file = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
    if (!fs.existsSync(file)) continue;

    let compose;
    try {
      compose = readJson(file);
    } catch {
      continue;
    }

    const zigbee = compose.zigbee;
    if (!zigbee?.manufacturerName || !zigbee?.productId) continue;

    for (const mfr of zigbee.manufacturerName) {
      for (const pid of zigbee.productId) {
        const key = `${String(mfr).toLowerCase()}|${String(pid)}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(driverId);
      }
    }
  }

  const collisions = [];
  for (const [key, drivers] of map) {
    const uniqueDrivers = normalizeDrivers(drivers);
    const nonExempt = uniqueDrivers.filter(driverId => !EXEMPT_DRIVERS.has(driverId));
    if (nonExempt.length <= 1) continue;
    if (EXEMPT_KEY_RE.test(key)) continue;
    collisions.push({ key, drivers: uniqueDrivers });
  }

  return collisions.sort((a, b) => collisionId(a).localeCompare(collisionId(b)));
}

function loadBaseline(file) {
  if (!file || !fs.existsSync(file)) return new Set();
  const data = readJson(file);
  return new Set((data.collisions || []).map(c => collisionId({
    key: c.key,
    drivers: normalizeDrivers(c.drivers || [])
  })));
}

function writeBaseline(file, collisions) {
  const out = {
    version: 1,
    generatedAt: new Date().toISOString(),
    description: 'Known historical fingerprint collisions. CI fails only for collisions not listed here.',
    collisions
  };
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(out, null, 2)}\n`);
}

function appendSummary(collisions, newCollisions, resolvedBaseline) {
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (!summary) return;

  let md = `## Fingerprint Collision Check\n\n`;
  md += `| Metric | Count |\n|---|---:|\n`;
  md += `| Current collisions | ${collisions.length} |\n`;
  md += `| New collisions | ${newCollisions.length} |\n`;
  md += `| Resolved baseline entries | ${resolvedBaseline.length} |\n\n`;

  if (newCollisions.length) {
    md += `### New Collisions\n\n`;
    for (const collision of newCollisions.slice(0, 50)) {
      md += `- \`${collision.key}\` in ${collision.drivers.map(d => `\`${d}\``).join(', ')}\n`;
    }
  }

  fs.appendFileSync(summary, md);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const collisions = collectCollisions();

  if (args.writeBaseline) {
    writeBaseline(args.writeBaseline, collisions);
    console.log(`FP collision baseline written: ${args.writeBaseline} (${collisions.length} collisions)`);
    return;
  }

  const baseline = loadBaseline(args.baseline);
  const currentIds = new Set(collisions.map(collisionId));
  const newCollisions = collisions.filter(c => !baseline.has(collisionId(c)));
  const resolvedBaseline = [...baseline].filter(id => !currentIds.has(id));

  const result = {
    total: collisions.length,
    baseline: baseline.size,
    new: newCollisions.length,
    resolvedBaseline: resolvedBaseline.length,
    collisions,
    newCollisions,
    resolvedBaseline
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`FP collision check: ${collisions.length} current, ${baseline.size} baseline, ${newCollisions.length} new`);
    for (const collision of newCollisions.slice(0, 20)) {
      console.log(`::error::NEW COLLISION ${collision.key} -> ${collision.drivers.join(', ')}`);
    }
    for (const id of resolvedBaseline.slice(0, 20)) {
      console.log(`::notice::Resolved baseline collision: ${id}`);
    }
  }

  appendSummary(collisions, newCollisions, resolvedBaseline);

  if (newCollisions.length > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
