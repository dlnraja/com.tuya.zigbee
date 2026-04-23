'use strict';
const fs = require('fs');
const path = require('path');

const FILES = [
  'lib/utils/energy-kpi.js',
  'lib/utils/TitleSanitizer.js',
  'lib/zigbee/zigbee-cluster-map.js',
  'lib/zigbee/ZigbeeDataQuery.js',
  'lib/analytics/AdvancedAnalytics.js',
  'lib/tuya/UniversalTuyaParser.js',
  'lib/ir/IRCodeLibrary.js'
];

const BASE_DIR = path.resolve('c:/Users/HP/Desktop/homey app/tuya_repair');

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.git')) {
      results = results.concat(getFiles(file));
    } else if (file.endsWith('.js')) {
      results.push(file);
    }
  });
  return results;
}

function cleanupFile(absolutePath) {
  let content = fs.readFileSync(absolutePath, 'utf8');
  const original = content;

  // Pattern A: (X / Y) -> (X / Y)
  content = content.replace(/safeDivide\(([^)]+)\), ([^)]+)\)/g, '($1 / $2)');
  
  // Pattern B: (X * Y) -> (X * Y)
  content = content.replace(/safeMultiply\(([^)]+)\), ([^)]+)\)/g, '($1 * $2)');

  // Pattern C: Math.round((X / Y) -> Math.round((X / Y))
  content = content.replace(/Math\.round\(safeDivide\(([^)]+)\), ([^)]+)\)/g, 'Math.round(($1 / $2))');

  // Pattern D: corrupted template literals ${Math.round(X/Y)} -> ${Math.round(X/Y)}
  content = content.replace(/\${([^/{}]+)\/([^,{}]+), ([^/{}]+)}/g, '${Math.round($1/$2)}');

  // Pattern E: corrupted regex /([a-z])(([A-Z]/g)
  content = content.replace(/\/(\[a-z\])safeDivide\(\(\[A-Z\]\), g\)\//g, '/([a-z])([A-Z])/g');

  // Pattern F: (age / 3600000).toFixed(1) -> (age / 3600000).toFixed(1)
  content = content.replace(/safeParse\(age, 3600000, 1\)/g, '(age / 3600000).toFixed(1)');

  // Pattern G: double quotes or extra junk in property names
  content = content.replace(/'genOnOff'/g, "'genOnOff'");

  if (content !== original) {
    fs.writeFileSync(absolutePath, content, 'utf8');
    console.log(`[CLEANUP] Fixed: ${path.relative(BASE_DIR, absolutePath)}`);
  }
}

const allFiles = getFiles(BASE_DIR);
console.log(`Cleaning ${allFiles.length} files...`);
allFiles.forEach(cleanupFile);
console.log('Cleanup complete.');
