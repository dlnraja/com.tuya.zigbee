const fs = require('fs');
const path = require('path');

// Verify packetninja PR integrations
const checks = [];

// PR #120: titleFormatted with [[device]] should NOT exist in any flow compose
const d = 'drivers';
fs.readdirSync(d).forEach(dr => {
  const f = path.join(d, dr, 'driver.flow.compose.json');
  if (!fs.existsSync(f)) return;
  const c = fs.readFileSync(f, 'utf8');
  if (c.includes('[[device]]')) {
    checks.push('PR#120 VIOLATION: ' + f + ' still has [[device]] in titleFormatted');
  }
});

// PR #119: wall_switch_1gang_1way should use HybridSwitchBase
const ws1 = path.join(d, 'wall_switch_1gang_1way', 'device.js');
if (fs.existsSync(ws1)) {
  const c = fs.readFileSync(ws1, 'utf8');
  if (c.includes('HybridSwitchBase')) checks.push('PR#119 OK: wall_switch_1gang_1way uses HybridSwitchBase');
  else checks.push('PR#119 ISSUE: wall_switch_1gang_1way NOT using HybridSwitchBase');
}

// PR #118: _TZ3000_ysdv91bk should be in a driver
let found118 = false;
fs.readdirSync(d).forEach(dr => {
  try {
    const c = fs.readFileSync(path.join(d, dr, 'driver.compose.json'), 'utf8');
    if (c.includes('_TZ3000_ysdv91bk')) { found118 = true; checks.push('PR#118 OK: _TZ3000_ysdv91bk in ' + dr); }
  } catch(e) {}
});
if (!found118) checks.push('PR#118 MISSING: _TZ3000_ysdv91bk not in any driver');

// PR #116: _TZ3000_blhvsaqf should be in a driver with physical button support
let found116 = false;
fs.readdirSync(d).forEach(dr => {
  try {
    const c = fs.readFileSync(path.join(d, dr, 'driver.compose.json'), 'utf8');
    if (c.includes('_TZ3000_blhvsaqf')) { found116 = true; checks.push('PR#116 OK: _TZ3000_blhvsaqf in ' + dr); }
  } catch(e) {}
});
if (!found116) checks.push('PR#116 MISSING: _TZ3000_blhvsaqf not in any driver');

// PR #111: Check for dimmer driver (Bseed touch dimmer)
let foundDimmer = false;
fs.readdirSync(d).forEach(dr => {
  if (dr.includes('dimmer') && dr.includes('wall')) foundDimmer = true;
});
checks.push('PR#111: wall dimmer driver exists: ' + foundDimmer);

// Also check app.json for titleFormatted
if (fs.existsSync('app.json')) {
  const appJson = fs.readFileSync('app.json', 'utf8');
  const tfCount = (appJson.match(/titleFormatted/g) || []).length;
  const ddCount = (appJson.match(/\[\[device\]\]/g) || []).length;
  checks.push('app.json: titleFormatted=' + tfCount + ' [[device]]=' + ddCount);
}

checks.forEach(c => console.log(c));
