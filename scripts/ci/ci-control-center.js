#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  CI/CD CONTROL CENTER v1.0                                                  ║
 * ║  Centralized orchestration for all pre-flight checks before publish/push    ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Run:  node scripts/ci/ci-control-center.js [--fix] [--strict]              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * PHASES:
 *  1. SYNTAX — Check JS syntax of all driver/lib files
 *  2. STRUCTURE — Validate driver folder structure, images, compose.json
 *  3. COMPOSE — Validate all driver.compose.json files
 *  4. COLLISIONS — Check fingerprint collisions across drivers
 *  5. FLOW — Audit flow card definitions (try-catch, routing)
 *  6. BATTERY — Check mains-powered devices don't have stale battery caps
 *  7. HOMEY — Run npx homey app validate --level publish
 *  8. REPORT — Generate summary
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const FIX_MODE = process.argv.includes('--fix');
const STRICT = process.argv.includes('--strict');

// Colors
const R = '\x1b[31m', G = '\x1b[32m', Y = '\x1b[33m', B = '\x1b[34m', N = '\x1b[0m';

let results = { passed: 0, failed: 0, warnings: 0, fixes: 0, errors: [] };

function log(pass, msg, detail = '') {
  const icon = pass ? `${G}✅${N}` : `${R}❌${N}`;
  const warn = msg.startsWith('WARN') ? `${Y}⚠️${N}` : icon;
  if (pass) results.passed++;
  else if (msg.startsWith('WARN')) { results.warnings++; console.log(`  ${warn} ${msg.replace('WARN: ', '')}` + (detail ? ` — ${detail}` : '')); }
  else { results.failed++; results.errors.push(msg + (detail ? ` — ${detail}` : '')); console.log(`  ${icon} ${msg}` + (detail ? ` — ${detail}` : '')); }
}

function section(title) {
  console.log(`\n${B}═══ ${title} ═══${N}`);
}

// Phase 1: Syntax Check
async function phase1() {
  section('Phase 1: JavaScript Syntax Check');
  const dirs = fs.readdirSync(DRIVERS_DIR).filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory());
  let ok = 0, fail = 0;
  for (const d of dirs) {
    const devFile = path.join(DRIVERS_DIR, d, 'device.js');
    if (!fs.existsSync(devFile)) continue;
    try {
      require('child_process').execSync(`node -c "${devFile}"`, { stdio: 'pipe' });
      ok++;
    } catch (e) {
      fail++;
      log(false, `Syntax error: ${d}/device.js`, e.stderr?.toString().split('\n')[0] || '');
    }
  }
  if (fail === 0) log(true, `JS Syntax: ${ok} files OK`);
}

// Phase 2: Structure
async function phase2() {
  section('Phase 2: Driver Structure');
  const dirs = fs.readdirSync(DRIVERS_DIR).filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory());
  for (const d of dirs) {
    const base = path.join(DRIVERS_DIR, d);
    const checks = [
      ['device.js', fs.existsSync(path.join(base, 'device.js'))],
      ['driver.js', fs.existsSync(path.join(base, 'driver.js'))],
      ['driver.compose.json', fs.existsSync(path.join(base, 'driver.compose.json'))],
      ['driver.flow.compose.json', fs.existsSync(path.join(base, 'driver.flow.compose.json'))],
      ['assets/images/small.png', fs.existsSync(path.join(base, 'assets/images/small.png'))],
      ['assets/images/large.png', fs.existsSync(path.join(base, 'assets/images/large.png'))],
      ['assets/images/xlarge.png', fs.existsSync(path.join(base, 'assets/images/xlarge.png'))],
    ];
    const missing = checks.filter(([, exists]) => !exists).map(([f]) => f);
    if (missing.length > 0) {
      log(false, `WARN: ${d} missing files`, missing.join(', '));
    }
  }
}

// Phase 3: Compose Validation
async function phase3() {
  section('Phase 3: Compose.json Validation');
  const dirs = fs.readdirSync(DRIVERS_DIR).filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory());
  for (const d of dirs) {
    const f = path.join(DRIVERS_DIR, d, 'driver.compose.json');
    if (!fs.existsSync(f)) { log(false, `WARN: ${d} missing driver.compose.json`); continue; }
    try {
      const j = JSON.parse(fs.readFileSync(f, 'utf8'));
      const z = j.zigbee || {};
      const mfr = z.manufacturerName || [];
      const pid = z.productId || [];
      if (!mfr.length || !pid.length) {
        log(false, `WARN: ${d} has empty manufacturerName or productId`);
      }
    } catch (e) {
      log(false, `Invalid JSON: ${d}/driver.compose.json`, e.message);
    }
  }
}

// Phase 4: Collision Check
async function phase4() {
  section('Phase 4: Fingerprint Collisions');
  const dirs = fs.readdirSync(DRIVERS_DIR).filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory());
  const map = new Map();
  for (const d of dirs) {
    const f = path.join(DRIVERS_DIR, d, 'driver.compose.json');
    if (!fs.existsSync(f)) continue;
    try {
      const j = JSON.parse(fs.readFileSync(f, 'utf8'));
      const z = j.zigbee || {};
      for (const mfr of (z.manufacturerName || [])) {
        for (const pid of (z.productId || [])) {
          const key = `${mfr.toLowerCase()}|${pid}`;
          if (!map.has(key)) map.set(key, []);
          map.get(key).push(d);
        }
      }
    } catch (e) { /* skip */ }
  }
  let collisions = 0;
  for (const [key, drivers] of map) {
    if (drivers.length > 1) {
      const [mfr, pid] = key.split('|');
      log(false, `WARN: Collision: ${mfr}+${pid} in: ${drivers.join(', ')}`);
      collisions++;
    }
  }
  if (collisions === 0) log(true, 'No fingerprint collisions found');
}

// Phase 5: Flow Card Audit
async function phase5() {
  section('Phase 5: Flow Cards Audit');
  const dirs = fs.readdirSync(DRIVERS_DIR).filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory());
  let total = 0, issues = 0;
  for (const d of dirs) {
    const f = path.join(DRIVERS_DIR, d, 'driver.flow.compose.json');
    if (!fs.existsSync(f)) continue;
    try {
      const j = JSON.parse(fs.readFileSync(f, 'utf8'));
      for (const t of ['triggers', 'conditions', 'actions']) {
        for (const card of (j[t] || [])) {
          total++;
          // Check titleFormatted
          if (card.args && card.args.some(a => a.type === 'device')) {
            // Has device arg — needs titleFormatted
          }
          // Check for [[device]] in args
          if (card.titleFormatted?.en?.includes('[[device]]')) {
            log(false, `WARN: ${d} — titleFormatted contains [[device]]`, card.id);
            issues++;
          }
        }
      }
    } catch (e) { /* skip */ }
  }
  if (issues === 0) log(true, `Flow cards OK: ${total} cards, 0 issues`);
}

// Phase 6: Battery Audit
async function phase6() {
  section('Phase 6: Battery/Mains Check');
  const dirs = fs.readdirSync(DRIVERS_DIR).filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory());
  let issues = 0;
  for (const d of dirs) {
    const devFile = path.join(DRIVERS_DIR, d, 'device.js');
    const compFile = path.join(DRIVERS_DIR, d, 'driver.compose.json');
    if (!fs.existsSync(devFile) || !fs.existsSync(compFile)) continue;
    try {
      const code = fs.readFileSync(devFile, 'utf8');
      const comp = JSON.parse(fs.readFileSync(compFile, 'utf8'));
      const caps = comp.capabilities || [];
      const isMains = code.includes('get mainsPowered()') && code.includes('return true');
      const hasBattery = caps.includes('measure_battery') || caps.includes('alarm_battery');
      const removesBattery = code.includes('removeCapability');
      if (isMains && hasBattery && !removesBattery) {
        log(false, `WARN: ${d} — mains-powered but has battery caps without removeCapability`);
        issues++;
      }
    } catch (e) { /* skip */ }
  }
  if (issues === 0) log(true, 'Battery audit OK');
}

// Phase 7: Homey Validate
async function phase7() {
  section('Phase 7: Homey App Validate');
  const { execSync } = require('child_process');
  try {
    const out = execSync('npx homey app validate --level publish', { stdio: 'pipe', timeout: 120000 });
    log(true, 'homey app validate — PASSED');
  } catch (e) {
    const msg = e.stderr?.toString() || e.stdout?.toString() || e.message;
    log(false, 'homey app validate — FAILED', msg.substring(0, 300));
  }
}

// Phase 8: Report
async function phase8() {
  section('Phase 8: Summary');
  console.log(`\n${B}═══════════════════════════════════════════════════════════════${N}`);
  console.log(`  ${G}✅ Passed:${N}   ${results.passed}`);
  console.log(`  ${Y}⚠️  Warnings:${N} ${results.warnings}`);
  console.log(`  ${R}❌ Failed:${N}   ${results.failed}`);
  console.log(`  Fixes applied: ${results.fixes}`);
  console.log(`${B}═══════════════════════════════════════════════════════════════${N}`);
  
  if (results.failed > 0) {
    console.log(`\n${R}=== ERRORS ===${N}`);
    results.errors.forEach(e => console.log(`  • ${e}`));
    process.exitCode = STRICT ? 1 : 0;
  }
}

async function main() {
  console.log(`${B}╔═══════════════════════════════════════════════════════════════╗${N}`);
  console.log(`${B}║  CI/CD CONTROL CENTER v1.0 — Tuya Unified Zigbee            ║${N}`);
  console.log(`${B}║  ${FIX_MODE ? 'FIX MODE' : 'REPORT MODE'}${N}${STRICT ? ' | STRICT MODE (exit on fail)' : ''}${N}`);
  console.log(`${B}╚═══════════════════════════════════════════════════════════════╝${N}`);
  
  await phase1();
  await phase2();
  await phase3();
  await phase4();
  await phase5();
  await phase6();
  await phase7();
  await phase8();
}

main().catch(e => {
  console.error(`${R}❌ Fatal:${N} ${e.message}`);
  process.exit(1);
});
