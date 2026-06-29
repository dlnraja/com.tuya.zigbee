#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const JSON_OUTPUT = process.argv.includes('--json');

const report = {
  timestamp: new Date().toISOString(),
  checked: 0,
  errors: [],
  warnings: [],
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function addError(driver, message, details = {}) {
  report.errors.push({ driver, message, ...details });
}

function addWarning(driver, message, details = {}) {
  report.warnings.push({ driver, message, ...details });
}

function getTriggers(flow) {
  return Array.isArray(flow?.triggers) ? flow.triggers : [];
}

function extractButtonPattern(triggers) {
  const matches = new Map();
  for (const card of triggers) {
    const id = card?.id || '';
    const match = id.match(/^(.+)_button_(\d+)gang_button(?:_|$)/);
    if (!match) continue;
    const prefix = match[1];
    const count = Number(match[2]);
    const key = `${prefix}:${count}`;
    if (!matches.has(key)) {
      matches.set(key, { prefix, count, ids: [] });
    }
    matches.get(key).ids.push(id);
  }
  return [...matches.values()];
}

function hasExactHelperCall(driverJs, prefix, count) {
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`registerButtonFlowCards\\s*\\(\\s*this\\s*,\\s*['"]${escapedPrefix}['"]\\s*,\\s*${count}\\s*\\)`);
  return pattern.test(driverJs);
}

function hasDynamicThisIdHelperCall(driverJs, count) {
  const hasThisIdAlias = /\b(?:const|let|var)\s+\w+\s*=\s*(?:this\.id|resolveDriverId\(this\)|this\.id\s*\|\|)/.test(driverJs);
  const pattern = new RegExp(`registerButtonFlowCards\\s*\\(\\s*this\\s*,\\s*\\w+\\s*,\\s*${count}\\s*\\)`);
  return hasThisIdAlias && pattern.test(driverJs);
}

function hasInlineThisIdHelperCall(driverJs, count) {
  const pattern = new RegExp(`registerButtonFlowCards\\s*\\(\\s*this\\s*,\\s*this\\.id\\s*\\|\\|\\s*['"][^'"]+['"]\\s*,\\s*${count}\\s*\\)`);
  return pattern.test(driverJs);
}

function loadDriverSource(driverPath) {
  const source = fs.readFileSync(driverPath, 'utf8');
  const reexport = source.match(/module\.exports\s*=\s*require\(\s*['"]([^'"]+)['"]\s*\)/);
  if (!reexport) {
    return source;
  }
  const target = path.resolve(path.dirname(driverPath), reexport[1]);
  const targetPath = target.endsWith('.js') ? target : `${target}.js`;
  if (!fs.existsSync(targetPath)) {
    return source;
  }
  return `${source}\n${fs.readFileSync(targetPath, 'utf8')}`;
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return [value];
  return [];
}

function loadDriverCompose(driverName) {
  const composePath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  if (!fs.existsSync(composePath)) {
    addError(driverName, 'Missing driver.compose.json for known button routing guard');
    return null;
  }
  try {
    return readJson(composePath);
  } catch (err) {
    addError(driverName, `Invalid driver.compose.json: ${err.message}`);
    return null;
  }
}

function getManufacturerNames(compose) {
  return normalizeArray(compose?.zigbee?.manufacturerName);
}

function getProductIds(compose) {
  return normalizeArray(compose?.zigbee?.productId);
}

function validateConflictData(manufacturerName) {
  const conflictFiles = [
    path.join(ROOT, 'scripts', 'data', 'manufacturer_conflicts.csv'),
    path.join(ROOT, 'scripts', 'data', 'true_manufacturer_conflicts.csv'),
  ];
  for (const file of conflictFiles) {
    if (!fs.existsSync(file)) continue;
    const rel = path.relative(ROOT, file);
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    for (const [index, line] of lines.entries()) {
      if (!line.includes(manufacturerName)) continue;
      if (line.includes('button_wireless_1')) {
        addError(rel, 'Known 4-endpoint TS0041 manufacturer is still documented as button_wireless_1', {
          manufacturerName,
          line: index + 1,
        });
      }
    }
  }
}

function validateKnownTs0041Routing() {
  const oneButton = loadDriverCompose('button_wireless_1');
  const fourButtonTs0041 = loadDriverCompose('button_wireless_4_ts0041');
  if (!oneButton || !fourButtonTs0041) return;

  const oneButtonManufacturers = new Set(getManufacturerNames(oneButton));
  const fourButtonManufacturers = new Set(getManufacturerNames(fourButtonTs0041));
  const fourButtonProducts = new Set(getProductIds(fourButtonTs0041));
  const fourEndpointManufacturers = [
    '_tz3000_yj6k7vfo',
    '_TZ3000_yj6k7vfo',
    '_TZ3000_YJ6K7VFO',
    '_tz3000_b4awzgct',
    '_TZ3000_b4awzgct',
    '_TZ3000_B4AWZGCT',
  ];

  if (!fourButtonProducts.has('TS0041')) {
    addError('button_wireless_4_ts0041', 'Known 4-endpoint TS0041 wrapper lost productId TS0041');
  }

  for (const manufacturerName of fourEndpointManufacturers) {
    if (!fourButtonManufacturers.has(manufacturerName)) {
      addError('button_wireless_4_ts0041', 'Known 4-endpoint TS0041 manufacturer missing from dedicated 4-button wrapper', {
        manufacturerName,
      });
    }
    if (oneButtonManufacturers.has(manufacturerName)) {
      addError('button_wireless_1', 'Known 4-endpoint TS0041 manufacturer is routed to 1-button driver', {
        manufacturerName,
      });
    }
    validateConflictData(manufacturerName);
  }
}

function run() {
  const helperPath = path.join(ROOT, 'lib', 'FlowCardHelper.js');
  const helperText = fs.existsSync(helperPath) ? fs.readFileSync(helperPath, 'utf8') : '';
  for (const required of ['triple', 'release', '_battery_low']) {
    if (!helperText.includes(required)) {
      addError('FlowCardHelper', `Button helper no longer registers ${required} routes`);
    }
  }

  validateKnownTs0041Routing();

  const driverDirs = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);

  for (const driverName of driverDirs) {
    const flowPath = path.join(DRIVERS_DIR, driverName, 'driver.flow.compose.json');
    const driverPath = path.join(DRIVERS_DIR, driverName, 'driver.js');
    if (!fs.existsSync(flowPath) || !fs.existsSync(driverPath)) continue;

    let flow;
    try {
      flow = readJson(flowPath);
    } catch (err) {
      addError(driverName, `Invalid driver.flow.compose.json: ${err.message}`);
      continue;
    }

    const patterns = extractButtonPattern(getTriggers(flow));
    if (patterns.length === 0) continue;
    report.checked++;

    const driverJs = loadDriverSource(driverPath);
    const hasCustomRunListeners = driverJs.includes('registerRunListener') || driverJs.includes('onRunListener');
    const helperCalls = [...driverJs.matchAll(/registerButtonFlowCards\s*\(\s*this\s*,\s*['"]([^'"]+)['"]\s*,\s*(\d+)\s*\)/g)]
      .map(match => ({ prefix: match[1], count: Number(match[2]) }));

    for (const pattern of patterns) {
      if (
        hasExactHelperCall(driverJs, pattern.prefix, pattern.count) ||
        hasDynamicThisIdHelperCall(driverJs, pattern.count) ||
        hasInlineThisIdHelperCall(driverJs, pattern.count) ||
        hasCustomRunListeners
      ) {
        continue;
      }
      addError(driverName, 'Button flow helper does not match declared flow-card IDs', {
        expected: `registerButtonFlowCards(this, '${pattern.prefix}', ${pattern.count})`,
        found: helperCalls,
        examples: pattern.ids.slice(0, 3),
      });
    }

    const helperIndex = driverJs.indexOf('registerButtonFlowCards');
    const beforeHelper = helperIndex === -1 ? driverJs : driverJs.slice(0, helperIndex);
    const guardCount = (beforeHelper.match(/if\s*\(\s*this\._flowCardsRegistered\s*\)/g) || []).length;
    if (guardCount > 1) {
      addWarning(driverName, 'Flow registration guard appears duplicated before helper call');
    }
  }
}

run();

if (JSON_OUTPUT) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Button flow routing: ${report.checked} drivers checked, ${report.errors.length} errors, ${report.warnings.length} warnings`);
  for (const err of report.errors) {
    console.error(`ERROR [${err.driver}] ${err.message}`);
  }
  for (const warn of report.warnings) {
    console.warn(`WARN [${warn.driver}] ${warn.message}`);
  }
}

process.exit(report.errors.length > 0 ? 1 : 0);
