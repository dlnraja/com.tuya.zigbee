#!/usr/bin/env node
/**
 * P72 — Cross-ref every flow card ID used in driver.js against
 * driver.flow.compose.json (or .homeycompose/flow/*.json) declarations.
 *
 * Reports:
 *   - REFERENCED but NOT DECLARED  ->  "Invalid Flow Card ID" crash
 *   - DECLARED but NEVER USED      ->  dead flow card (safe to remove)
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS = path.join(ROOT, 'drivers');

const referenced = new Map(); // driverName -> Set<id>
const declared = new Map();   // driverName -> Set<id>
const safeFuncs = new Set(['getActionCard', 'getTriggerCard', 'getConditionCard', 'getDeviceActionCard', 'getDeviceTriggerCard', 'getDeviceConditionCard', '_getFlowCard']);

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === '.git') continue;
      walk(full);
    } else if (ent.isFile()) {
      processFile(full);
    }
  }
}

function processFile(file) {
  if (file.endsWith('.js') && (file.includes('\\drivers\\') || file.includes('/drivers/'))) {
    // driver.js — look for flow card id references
    const m = file.match(/[\\/](drivers[\\/][^\\/]+)[\\/]/);
    if (!m) return;
    const driverName = m[1];
    const content = fs.readFileSync(file, 'utf8');
    if (!referenced.has(driverName)) referenced.set(driverName, new Set());
    const set = referenced.get(driverName);

    // Match: this.homey.flow.getActionCard('xxx') / getTriggerCard('xxx') / _getFlowCard('xxx', 'action')
    // Also: this.homey.flow.getDeviceActionCard('xxx') etc
    const patterns = [
      /\.flow\.(getActionCard|getTriggerCard|getConditionCard|getDeviceActionCard|getDeviceTriggerCard|getDeviceConditionCard)\s*\(\s*['"]([^'"]+)['"]/g,
      /\._getFlowCard\s*\(\s*['"]([^'"]+)['"]/g,
      /\._getFlowCardSafe\s*\(\s*['"]([^'"]+)['"]/g,
    ];
    for (const p of patterns) {
      let m;
      while ((m = p.exec(content)) !== null) {
        // m[1] = method name (ignored), m[2] = id (use this)
        const id = m[2];
        if (id) set.add(id);
      }
    }
  } else if (file.endsWith('.json') && (file.includes('driver.flow.compose.json') || file.includes('\\drivers\\') && file.includes('flow.compose.json'))) {
    // driver.flow.compose.json
    const m = file.match(/[\\/](drivers[\\/][^\\/]+)[\\/]/);
    if (!m) return;
    const driverName = m[1];
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!declared.has(driverName)) declared.set(driverName, new Set());
      const set = declared.get(driverName);
      for (const arr of ['actions', 'triggers', 'conditions']) {
        for (const c of (data[arr] || [])) {
          if (c.id) set.add(c.id);
        }
      }
    } catch (e) {
      console.error(`Parse error: ${file}: ${e.message}`);
    }
  } else if (file.endsWith('.json') && file.includes('.homeycompose') && file.includes('flow')) {
    // .homeycompose/flow/triggers/... or actions/...
    let m = file.match(/drivers[\\/]([^\\/]+)[\\/].homeycompose/);
    if (!m) return;
    const driverName = m[1];
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (data.id) {
        if (!declared.has(driverName)) declared.set(driverName, new Set());
        declared.get(driverName).add(data.id);
      }
    } catch (e) { /* ignore */ }
  }
}

walk(DRIVERS);

// Cross-ref
let refButNotDecl = [];
let declButNotRef = [];

for (const [driver, refs] of referenced) {
  const decls = declared.get(driver) || new Set();
  for (const r of refs) {
    if (!decls.has(r)) {
      refButNotDecl.push({ driver, id: r });
    }
  }
}

for (const [driver, decls] of declared) {
  const refs = referenced.get(driver) || new Set();
  for (const d of decls) {
    if (!refs.has(d)) {
      declButNotRef.push({ driver, id: d });
    }
  }
}

console.log('=== REFERENCED in driver.js but NOT DECLARED in flow.compose.json ===');
console.log(`  total: ${refButNotDecl.length}`);
for (const x of refButNotDecl.slice(0, 60)) {
  console.log(`  ${x.driver}:  ${x.id}`);
}
if (refButNotDecl.length > 60) console.log(`  ... +${refButNotDecl.length - 60} more`);

console.log('');
console.log('=== DECLARED in flow.compose.json but NEVER REFERENCED in driver.js ===');
console.log(`  total: ${declButNotRef.length}`);
for (const x of declButNotRef.slice(0, 30)) {
  console.log(`  ${x.driver}:  ${x.id}`);
}
if (declButNotRef.length > 30) console.log(`  ... +${declButNotRef.length - 30} more`);
