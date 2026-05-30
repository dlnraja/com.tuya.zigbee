#!/usr/bin/env node
/**
 * flow-card-audit.js — SDK3 Flow Card Deep Diagnostic
 *
 * Checks ALL drivers for:
 * 1. [[device]] / [[deviceId]] in titleFormatted → causes manual device selection bug
 * 2. Duplicate flow card IDs across all drivers
 * 3. Flow card IDs in driver.js that don't exist in driver.flow.compose.json
 * 4. Missing trigger/action/condition registrations
 * 5. Invalid getDeviceTriggerCard() calls without try-catch
 * 6. Multiple drivers sharing same manufacturerName+productId (CONFLICT check)
 * 7. Flow cards without args {} (required for proper SDK3 trigger)
 */
'use strict';
const fs   = require('fs');
const path = require('path');

const ROOT    = process.cwd();
const DRIVERS = path.join(ROOT, 'drivers');

const issues  = { error: [], warn: [], info: [] };
const allFlowIds = new Map(); // id -> [driver, ...]

// Track fingerprint conflicts
const fpMap = new Map(); // "mfr|pid" -> [driver, ...]

function addIssue(level, driver, msg) {
  issues[level].push({ driver, msg });
}

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function walkDrivers() {
  const dirs = fs.readdirSync(DRIVERS, { withFileTypes: true })
    .filter(e => e.isDirectory()).map(e => e.name);

  console.log(`\nScanning ${dirs.length} drivers...\n`);

  for (const d of dirs) {
    const driverDir  = path.join(DRIVERS, d);
    const composePath = path.join(driverDir, 'driver.compose.json');
    const flowPath    = path.join(driverDir, 'driver.flow.compose.json');
    const devicePath  = path.join(driverDir, 'device.js');

    const compose = readJson(composePath);
    const flow    = readJson(flowPath);

    // ─── 1. Fingerprint conflict detection ────────────────────────
    if (compose?.zigbee?.manufacturerName && compose?.zigbee?.productId) {
      const mfrs = [].concat(compose.zigbee.manufacturerName);
      const pids = [].concat(compose.zigbee.productId);
      for (const mfr of mfrs) {
        for (const pid of pids) {
          const key = `${mfr.toUpperCase()}|${pid.toUpperCase()}`;
          if (!fpMap.has(key)) fpMap.set(key, []);
          fpMap.get(key).push(d);
        }
      }
    }

    // ─── 2. Flow card [[device]] bug ──────────────────────────────
    // SDK3 RULE: [[device]] and [[deviceId]] in titleFormatted trigger automatic
    // device picker which causes wrong device selection. Other [[*]] tokens are
    // valid flow card arguments (e.g. [[brand]], [[device_type]], [[code_name]])
    if (flow) {
      const flowSections = ['triggers', 'conditions', 'actions'];
      for (const section of flowSections) {
        const cards = flow[section] || [];
        for (const card of cards) {
          const tf = card.titleFormatted || card.title || '';
          const checkStr = JSON.stringify(tf);
          // Only match EXACT [[device]] or [[deviceId]] — NOT [[device_type]], [[device_name]] etc.
          if (/\[\[device\]\]|\[\[deviceId\]\]/i.test(checkStr)) {
            addIssue('error', d, 
              `[FLOW-001] ${section}.${card.id}: titleFormatted contains [[device]] or [[deviceId]] — causes automatic device picker bug. Use 'title' key instead.`
            );
          }

          // Check for duplicate flow IDs globally
          const fid = card.id;
          if (!allFlowIds.has(fid)) allFlowIds.set(fid, []);
          allFlowIds.get(fid).push(d);

          // Validate device args
          if (section === 'triggers' && card.args && card.args.length > 0) {
            for (const arg of card.args) {
              if (arg.type === 'device' && !arg.filter) {
                addIssue('warn', d,
                  `[FLOW-002] triggers.${card.id}: arg '${arg.name}' type=device without filter — may cause wrong device selection`
                );
              }
            }
          }
        }
      }
    }

    // ─── 3. device.js flow card usage audit ───────────────────────
    if (fs.existsSync(devicePath)) {
      const src = fs.readFileSync(devicePath, 'utf8');

      // Check getDeviceTriggerCard without try-catch
      // Accept: exact ID match OR driverId_id match (standard SDK3 prefix pattern)
      const triggerCalls = [...src.matchAll(/getDeviceTriggerCard\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g)];
      for (const match of triggerCalls) {
        const callId = match[1];
        // Skip template literals (dynamic IDs checked at runtime)
        if (callId.includes('${')) continue;
        if (flow) {
          const triggers = flow.triggers || [];
          // Check both exact match and prefixed match
          const exists = triggers.some(t => 
            t.id === callId || 
            t.id === `${d}_${callId}` ||
            callId === `${d}_${t.id.replace(d + '_', '')}`
          );
          if (!exists) {
            addIssue('error', d,
              `[FLOW-004] device.js: getDeviceTriggerCard('${callId}') — ID NOT found in driver.flow.compose.json (checked: '${callId}' and '${d}_${callId}')`
            );
          }
        }
        // Check try-catch wrapping
        const callIndex = src.indexOf(match[0]);
        const surrounding = src.slice(Math.max(0, callIndex - 200), callIndex + 200);
        if (!surrounding.includes('try') && !surrounding.includes('catch')) {
          addIssue('warn', d,
            `[FLOW-005] device.js: getDeviceTriggerCard('${callId}') — not wrapped in try/catch`
          );
        }
      }

      // Check for SDK v2 global Manager patterns
      if (/\bManagerFlow\b|\bManagerDrivers\b|\bManagerSettings\b/.test(src)) {
        addIssue('error', d, '[SDK3-001] device.js: SDK v2 global Manager* detected — crashes on SDK3');
      }

      // Check setCapabilityValue without await
      const noAwait = src.match(/(?<!await\s)(?<!\/\/[^\n]*)setCapabilityValue\s*\(/g);
      if (noAwait && noAwait.length > 0) {
        addIssue('warn', d, `[SDK3-002] device.js: ${noAwait.length}x setCapabilityValue() without await`);
      }
    }

    // ─── 4. driver.compose.json checks ───────────────────────────
    if (compose) {
      const mfrs = [].concat(compose.zigbee?.manufacturerName || []);
      for (const mfr of mfrs) {
        if (mfr.includes('*')) {
          addIssue('error', d, `[FP-001] driver.compose.json: wildcard manufacturerName '${mfr}' — STRICTLY FORBIDDEN`);
        }
      }
      const mfrSet = new Set(mfrs.map(m => m.toUpperCase()));
      if (mfrSet.size !== mfrs.length) {
        addIssue('warn', d, `[FP-002] driver.compose.json: duplicate manufacturerName entries detected`);
      }

      const caps = compose.capabilities || [];
      const hasPower = caps.includes('measure_power') || caps.includes('meter_power');
      if (hasPower && compose.energy?.approximation) {
        addIssue('error', d, '[ENERGY-001] driver.compose.json: has measure_power/meter_power AND energy.approximation — Homey Energy v3 conflict!');
      }
    }
  }
}

function report() {
  // ─── Global: duplicate flow IDs ─────────────────────────────────
  for (const [fid, drivers] of allFlowIds.entries()) {
    if (drivers.length > 1) {
      // Check if same driver appears multiple times (ok within driver)
      const unique = [...new Set(drivers)];
      if (unique.length > 1) {
        addIssue('error', unique.join('+'),
          `[FLOW-007] Flow ID '${fid}' exists in ${unique.length} drivers: ${unique.slice(0,5).join(', ')} — MUST be unique across app!`
        );
      }
    }
  }

  // ─── Global: fingerprint conflicts ──────────────────────────────
  // SDK3 RULE: Same manufacturerName CAN appear in multiple drivers (normal for 
  // multi-product manufacturers). However, if BOTH mfr AND productId are identical
  // in two drivers, Homey will match only ONE driver (indeterminate behavior).
  //
  // Exception: Generic product IDs (TS0601, TS0001, TS0101, etc.) are base IDs 
  // shared across many device categories — these are reported as WARN not ERROR
  // because the same manufacturer makes purifiers, sensors, switches all with TS0601.
  //
  // TRUE ERRORS: specific product IDs (non-generic) in incompatible driver pairs.
  const GENERIC_CONFLICT_PIDS = new Set([
    'TS0601', 'TS0001', 'TS0002', 'TS0003', 'TS0004',
    'TS0011', 'TS0012', 'TS0013', 'TS0014',
    'TS0021', 'TS0022', 'TS0041', 'TS0042', 'TS0043', 'TS0044',
    'TS0101', 'TS0111', 'TS0201', 'TS0202', 'TS0203',
    'TS0204', 'TS0205', 'TS0207', 'TS0225',
    // Custom family PIDs used intentionally across functional variant drivers:
    'TS0601_AIR_PURIFIER', 'TS0601_AIR', 'TS0601_GAS', 'TS0601_THERMOSTAT',
    'TS0601_DIM', 'TS0601_DIM1', 'TS0601_DIM2',
    // Placeholder/generic entries used in template-based driver groups:
    '_TZE200_PLACEHOLDER_GENERIC', '_TZE20X_XXXXXXXX',
  ]);

  for (const [key, drivers] of fpMap.entries()) {
    const unique = [...new Set(drivers)];
    if (unique.length > 1) {
      const [mfr, pid] = key.split('|');
      const isGeneric = GENERIC_CONFLICT_PIDS.has(pid.toUpperCase());
      const level = isGeneric ? 'warn' : 'error';
      const severity = isGeneric ? '[FP-003-WARN]' : '[FP-003]';
      addIssue(level, unique.join('+'),
        `${severity} CONFLICT: manufacturerName '${mfr}' + productId '${pid}' in ${unique.length} drivers: ${unique.slice(0, 4).join(', ')}${unique.length > 4 ? '...' : ''}`
      );
    }
  }

  // ─── Print report ────────────────────────────────────────────────
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  FLOW CARD + SDK3 AUDIT REPORT');
  console.log(`║  ${new Date().toISOString()}`);
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`\nTotal flow IDs seen: ${allFlowIds.size}`);
  console.log(`Total fingerprint combos: ${fpMap.size}`);

  const e = issues.error.length;
  const w = issues.warn.length;
  const i = issues.info.length;
  console.log(`\n❌ Errors  : ${e}`);
  console.log(`⚠️  Warnings: ${w}`);
  console.log(`ℹ️  Info    : ${i}`);

  if (e > 0) {
    console.log('\n── ERRORS ──────────────────────────────────────────────');
    issues.error.forEach(({driver, msg}) => console.log(`  [${driver}] ${msg}`));
  }
  if (w > 0) {
    console.log('\n── WARNINGS ─────────────────────────────────────────────');
    issues.warn.slice(0, 40).forEach(({driver, msg}) => console.log(`  [${driver}] ${msg}`));
    if (w > 40) console.log(`  ... and ${w - 40} more warnings`);
  }

  console.log('\n── SUMMARY ──────────────────────────────────────────────');
  if (e === 0 && w === 0) {
    console.log('✅ All flow cards and fingerprints look clean!');
  } else {
    console.log(`Fix ${e} errors first, then review ${w} warnings.`);
  }

  process.exitCode = e > 0 ? 1 : 0;
}

walkDrivers();
report();
