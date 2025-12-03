#!/usr/bin/env node
/**
 * Fix Manufacturer Name Case Issues
 *
 * Problem: Some manufacturerNames have incorrect case:
 * - _tz3210_ should be _TZ3210_
 * - _TZe200_ should be _TZE200_
 *
 * This can cause matching failures on some devices.
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '..', 'drivers');

const drivers = fs.readdirSync(driversDir).filter(d => {
  const stat = fs.statSync(path.join(driversDir, d));
  return stat.isDirectory();
});

let totalFixed = 0;
let totalCaseFixes = 0;

console.log('🔧 Fixing manufacturer name case issues...\n');

for (const driver of drivers) {
  const composePath = path.join(driversDir, driver, 'driver.compose.json');

  if (!fs.existsSync(composePath)) {
    continue;
  }

  try {
    let content = fs.readFileSync(composePath, 'utf8');
    let modified = false;
    let fixes = 0;

    // Fix case patterns
    const patterns = [
      // _tzXXXX_ -> _TZXXXX_
      { from: /_tz(\d{4}_)/gi, to: '_TZ$1' },
      // _TZeXXX_ -> _TZEXXX_
      { from: /_TZe(\d{3}_)/gi, to: '_TZE$1' },
      // _tze -> _TZE
      { from: /"_tze(\d{3}_)/gi, to: '"_TZE$1' },
    ];

    for (const pattern of patterns) {
      const matches = content.match(pattern.from);
      if (matches) {
        fixes += matches.length;
        content = content.replace(pattern.from, pattern.to);
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(composePath, content);
      console.log(`✅ ${driver}: Fixed ${fixes} case issues`);
      totalFixed++;
      totalCaseFixes += fixes;
    }
  } catch (err) {
    console.log(`❌ ${driver}: Error - ${err.message}`);
  }
}

console.log('\n' + '='.repeat(60));
console.log(`✅ Drivers fixed: ${totalFixed}`);
console.log(`🔧 Total case fixes: ${totalCaseFixes}`);
console.log(`📊 Total drivers scanned: ${drivers.length}`);
console.log('='.repeat(60));
