const fs = require('fs');
const path = require('path');
const d = 'drivers';
let jsonErrors = 0, jsErrors = 0, flowMissing = 0;

// 1. Validate all driver.compose.json files
fs.readdirSync(d).forEach(dr => {
  ['driver.compose.json', 'driver.flow.compose.json'].forEach(file => {
    const f = path.join(d, dr, file);
    if (!fs.existsSync(f)) { if (file === 'driver.compose.json') console.log('MISSING: ' + f); return; }
    try { JSON.parse(fs.readFileSync(f, 'utf8')); }
    catch(e) { console.log('JSON ERROR: ' + f + ' - ' + e.message); jsonErrors++; }
  });
});

// 2. Syntax check all device.js files
fs.readdirSync(d).forEach(dr => {
  const f = path.join(d, dr, 'device.js');
  if (!fs.existsSync(f)) return;
  try {
    const c = fs.readFileSync(f, 'utf8');
    // Check for common issues
    if (c.includes('require(') && !c.includes("'use strict'") && !c.includes('"use strict"')) {
      console.log('NO STRICT: ' + f);
    }
    // Check for unclosed brackets (basic)
    const opens = (c.match(/\{/g) || []).length;
    const closes = (c.match(/\}/g) || []).length;
    if (opens !== closes) {
      console.log('BRACKET MISMATCH: ' + f + ' ({=' + opens + ' }=' + closes + ')');
      jsErrors++;
    }
  } catch(e) { console.log('READ ERROR: ' + f + ' - ' + e.message); jsErrors++; }
});

// 3. Audit flow cards: check if driver.flow.compose.json flow IDs match what device.js references
const flowAudit = [];
fs.readdirSync(d).forEach(dr => {
  const flowFile = path.join(d, dr, 'driver.flow.compose.json');
  const deviceFile = path.join(d, dr, 'device.js');
  if (!fs.existsSync(flowFile) || !fs.existsSync(deviceFile)) return;
  
  try {
    const flowJson = JSON.parse(fs.readFileSync(flowFile, 'utf8'));
    const deviceCode = fs.readFileSync(deviceFile, 'utf8');
    
    // Get all trigger IDs from flow compose
    const triggerIds = [];
    if (flowJson.triggers) flowJson.triggers.forEach(t => triggerIds.push(t.id));
    
    // Get all flow card IDs referenced in device.js
    const refs = deviceCode.match(/getDeviceTriggerCard\(['"`]([^'"`]+)['"`]\)/g) || [];
    const referencedIds = refs.map(r => r.match(/['"`]([^'"`]+)['"`]/)[1]);
    
    // Find referenced but not defined
    referencedIds.forEach(id => {
      if (!triggerIds.includes(id)) {
        // Check if it's a scene card (may be defined)
        if (!triggerIds.some(t => t === id)) {
          flowAudit.push({ driver: dr, id, issue: 'REFERENCED but NOT DEFINED in flow compose' });
          flowMissing++;
        }
      }
    });
  } catch(e) {}
});

if (flowAudit.length > 0) {
  console.log('\n=== FLOW CARD AUDIT ===');
  flowAudit.forEach(a => console.log('  ' + a.driver + ': ' + a.id + ' - ' + a.issue));
}

console.log('\n=== SUMMARY ===');
console.log('JSON errors: ' + jsonErrors);
console.log('JS bracket mismatches: ' + jsErrors);
console.log('Flow cards missing: ' + flowMissing);
