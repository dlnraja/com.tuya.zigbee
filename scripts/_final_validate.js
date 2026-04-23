const fs = require('fs');
const path = require('path');
const d = 'drivers';
let total = 0, pass = 0, fail = 0;
const failures = [];

// 1. ALL JSON files valid
console.log('=== 1. JSON VALIDATION ===');
fs.readdirSync(d).forEach(dr => {
  ['driver.compose.json','driver.flow.compose.json','driver.settings.compose.json'].forEach(file => {
    const f = path.join(d, dr, file);
    if (!fs.existsSync(f)) return;
    total++;
    try { JSON.parse(fs.readFileSync(f, 'utf8')); pass++; }
    catch(e) { fail++; failures.push('JSON: ' + f + ' - ' + e.message); }
  });
});
// Also check .homeycompose
const hc = '.homeycompose';
if (fs.existsSync(hc)) {
  const walk = (dir) => {
    fs.readdirSync(dir).forEach(item => {
      const fp = path.join(dir, item);
      if (fs.statSync(fp).isDirectory()) walk(fp);
      else if (fp.endsWith('.json')) {
        total++;
        try { JSON.parse(fs.readFileSync(fp, 'utf8')); pass++; }
        catch(e) { fail++; failures.push('JSON: ' + fp + ' - ' + e.message); }
      }
    });
  };
  walk(hc);
}
console.log('  JSON: ' + pass + '/' + total + ' passed');

// 2. No duplicate DP keys
console.log('=== 2. DUPLICATE DP KEYS ===');
let dupCount = 0;
fs.readdirSync(d).forEach(dr => {
  const f = path.join(d, dr, 'device.js');
  if (!fs.existsSync(f)) return;
  const c = fs.readFileSync(f, 'utf8');
  const dpMatch = c.match(/get dpMappings\(\)\s*\{[\s\S]*?return\s*\{([\s\S]*?)\} ;/);
  if (!dpMatch) return;
  const dpBlock = dpMatch[1];
  const dpKeys = [];
  const dpRegex = /^\s*(\d+)\s*:/gm;
  let m;
  while ((m = dpRegex.exec(dpBlock)) !== null) {
    const dp = parseInt(m[1]);
    if (dpKeys.includes(dp)) {
      dupCount++;
      failures.push('DUP DP: ' + dr + ' DP' + dp);
    }
    dpKeys.push(dp);
  }
});
console.log('  Duplicate DPs: ' + dupCount);

// 3. Bracket matching on all JS files
console.log('=== 3. JS SYNTAX ===');
let bracketFail = 0;
const jsFiles = [];
const walkJS = (dir) => {
  fs.readdirSync(dir).forEach(item => {
    const fp = path.join(dir, item);
    if (item === 'node_modules' || item === '.git' || item === 'scripts') return;
    if (fs.statSync(fp).isDirectory()) walkJS(fp);
    else if (fp.endsWith('.js')) jsFiles.push(fp);
  });
};
walkJS('.');
jsFiles.forEach(f => {
  const c = fs.readFileSync(f, 'utf8');
  const opens = (c.match(/\{/g) || []).length;
  const closes = (c.match(/\}/g) || []).length;
  if (opens !== closes) { bracketFail++; failures.push('BRACKET: ' + f + ' ({=' + opens + ' }=' + closes + ')'); }
});
console.log('  JS files checked: ' + jsFiles.length + ', bracket mismatches: ' + bracketFail);

// 4. Fingerprint collisions
console.log('=== 4. FINGERPRINT COLLISIONS ===');
const fpMap = {};
let collisions = 0;
fs.readdirSync(d).forEach(dr => {
  const f = path.join(d, dr, 'driver.compose.json');
  if (!fs.existsSync(f)) return;
  try {
    const c = JSON.parse(fs.readFileSync(f, 'utf8'));
    const z = Array.isArray(c.zigbee) ? c.zigbee : c.zigbee ? [c.zigbee] : []      ;
    z.forEach(entry => {
      const mfrs = entry.manufacturerName || [];
      const pids = entry.productId || [];
      mfrs.forEach(mfr => pids.forEach(pid => {
        const key = mfr + '|' + pid;
        if (fpMap[key] && fpMap[key] !== dr) {
          collisions++;
          if (collisions <= 10) failures.push('COLLISION: ' + key + ' in ' + fpMap[key] + ' AND ' + dr);
        }
        fpMap[key] = dr;
      }));
    });
  } catch(e) {}
});
console.log('  Total fingerprints: ' + Object.keys(fpMap).length + ', collisions: ' + collisions);

// 5. Settings keys check
console.log('=== 5. SETTINGS KEYS ===');
let badKeys = 0;
jsFiles.forEach(f => {
  const c = fs.readFileSync(f, 'utf8');
  if (c.includes('zb_modelId') && !c.includes('zb_model_id')) { badKeys++; failures.push('BAD KEY: ' + f + ' uses zb_modelId'); }
  if (c.includes('zb_manufacturerName') && !c.includes('zb_manufacturer_name')) { badKeys++; failures.push('BAD KEY: ' + f + ' uses zb_manufacturerName'); }
});
console.log('  Bad settings keys: ' + badKeys);

// Summary
console.log('\n=== FINAL SUMMARY ===');
console.log('Total failures: ' + failures.length);
if (failures.length > 0) {
  failures.forEach(f => console.log('   ' + f));
} else {
  console.log('   ALL CHECKS PASSED');
}
