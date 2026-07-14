// find-battery-name-uses.js — Find any code that uses the removed re-exports
'use strict';
const fs = require('fs');
const path = require('path');

function walk(dir) {
  const files = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p).forEach(x => files.push(x));
    else if (f.endsWith('.js')) files.push(p);
  }
  return files;
}

const NAMES = [
  'BatterySystem', 'BatteryCascadeEngine', 'BatteryHealthIntelligence',
  'BatteryHelper', 'BatteryIconDetector', 'BatteryManagerV3',
  'BatteryMonitoringMixin', 'BatteryMonitoringSystem', 'BatteryProfileDatabase',
  'UniversalBatteryFallback',
];

const allFiles = walk('lib').concat(walk('drivers'));
for (const name of NAMES) {
  const re = new RegExp('\\b' + name + '\\b', 'g');
  const importers = [];
  for (const f of allFiles) {
    const content = fs.readFileSync(f, 'utf8');
    if (re.test(content)) importers.push(f);
  }
  if (importers.length > 0) {
    console.log(name + ':');
    importers.forEach(f => console.log('  ' + f));
  }
}
