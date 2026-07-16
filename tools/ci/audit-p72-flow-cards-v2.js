#!/usr/bin/env node
/**
 * P72 v2 — Tighter flow card cross-ref:
 *   1. Extract flow.compose.json card IDs (canonical)
 *   2. Extract static string IDs from driver.js (e.g. getActionCard('xxx') with literal string)
 *   3. Skip template literal expressions (with ${...}) - those are runtime
 *   4. Report: static ID referenced in driver.js but NOT in any compose file
 *      for that driver (and not in a parent driver like "air_purifier_*" referenced
 *      by sub-drivers)
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS = path.join(ROOT, 'drivers');

const declared = new Map(); // driverName -> Set<id>
const referenced = new Map(); // driverName -> Set<id>
const referencedWithContext = new Map(); // driverName -> {id -> line}

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
  const m = file.match(/[\\/](drivers[\\/][^\\/]+)[\\/]/);
  if (!m) return;
  const driverName = m[1];

  if (file.endsWith('driver.flow.compose.json') || file.endsWith('.homeycompose/flow/triggers/' + path.basename(file)) || file.includes('flow.compose.json')) {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!declared.has(driverName)) declared.set(driverName, new Set());
      const set = declared.get(driverName);
      for (const arr of ['actions', 'triggers', 'conditions']) {
        for (const c of (data[arr] || [])) {
          if (c.id) set.add(c.id);
        }
      }
    } catch (e) { /* ignore */ }
  } else if (file.endsWith('.js')) {
    const content = fs.readFileSync(file, 'utf8');
    if (!referenced.has(driverName)) referenced.set(driverName, new Map());
    const map = referenced.get(driverName);
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Only static strings: getActionCard('literal')
      const re = /\.(?:flow\.(?:getActionCard|getTriggerCard|getConditionCard|getDeviceActionCard|getDeviceTriggerCard|getDeviceConditionCard)|_getFlowCard|_getFlowCardSafe)\s*\(\s*['"]([A-Za-z0-9_]+)['"]/g;
      let m;
      while ((m = re.exec(line)) !== null) {
        const id = m[1];
        if (!map.has(id)) map.set(id, i + 1);
      }
    }
  }
}

walk(DRIVERS);

// Build the union of all declared IDs (for sub-drivers inheriting from parent)
const allDeclared = new Set();
for (const set of declared.values()) {
  for (const id of set) allDeclared.add(id);
}

let refButNotDecl = [];
let declButNotRef = [];

for (const [driver, refs] of referenced) {
  const decls = declared.get(driver) || new Set();
  for (const [id, line] of refs) {
    if (!decls.has(id) && !allDeclared.has(id)) {
      refButNotDecl.push({ driver, id, line });
    }
  }
}

for (const [driver, decls] of declared) {
  const refs = referenced.get(driver) || new Map();
  for (const d of decls) {
    if (!refs.has(d)) {
      declButNotRef.push({ driver, id: d });
    }
  }
}

console.log('=== REFERENCED (static) in driver.js but NOT DECLARED in flow.compose.json ===');
console.log(`  total: ${refButNotDecl.length}`);
for (const x of refButNotDecl) {
  console.log(`  ${x.driver}:${x.line}  ${x.id}`);
}
