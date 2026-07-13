// find-flow-issues.js — find all flow card inconsistencies
const fs = require('fs');
const path = require('path');

function walkJs(d) {
  const out = [];
  if (!fs.existsSync(d)) return out;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) out.push(...walkJs(p));
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

const drivers = 'drivers';
const driverDirs = fs.readdirSync(drivers).filter(d => fs.statSync(path.join(drivers, d)).isDirectory());

const issues = [];
for (const d of driverDirs) {
  const driverFile = path.join(drivers, d, 'driver.js');
  const flowFile = path.join(drivers, d, 'driver.flow.compose.json');
  if (!fs.existsSync(driverFile) || !fs.existsSync(flowFile)) continue;
  
  const driverCode = fs.readFileSync(driverFile, 'utf8');
  const flowData = JSON.parse(fs.readFileSync(flowFile, 'utf8'));
  
  // Get all registered IDs from driver.js
  const registered = new Set();
  // getActionCard, getTriggerCard, getConditionCard
  const matches = driverCode.matchAll(/get(Action|Trigger|Condition)Card\(['"]([^'"]+)['"]/g);
  for (const m of matches) {
    registered.add({ id: m[2], type: m[1].toLowerCase() });
  }
  
  // Get all defined IDs in flow.compose
  const defined = new Set();
  for (const a of flowData.actions || []) defined.add(a.id);
  for (const t of flowData.triggers || []) defined.add(t.id);
  for (const c of flowData.conditions || []) defined.add(c.id);
  
  // Find registered but not defined
  for (const r of registered) {
    if (!defined.has(r.id)) {
      issues.push({ driver: d, id: r.id, type: r.type, file: driverFile, line: driverCode.split('\n').findIndex(l => l.includes(r.id)) + 1 });
    }
  }
}

console.log('=== FLOW CARD REGISTRATION ISSUES ===');
console.log('Total:', issues.length);
for (const i of issues) {
  console.log('  ' + i.driver + ': ' + i.id + ' (' + i.type + ') — registered in ' + i.file + ':' + i.line);
}
