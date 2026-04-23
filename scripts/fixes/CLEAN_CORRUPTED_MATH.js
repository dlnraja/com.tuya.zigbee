/**
 * CLEAN_CORRUPTED_MATH.js
 * Fixes mass corruption of math expressions introduced by faulty numeric hardening.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const REPLACEMENTS = [
  {
    // Fix illuminance formula corruption: (v - 1) / 10000 -> (v - 1) / 10000
    from: /-safeParse\(1\), 10000/g,
    to: '- 1) / 10000'
  },
  {
    // Fix temperature formula corruption: temp * 10)), 10) -> temp * 10), 10)
    from: /safeDivide\(temp, 10\)\)\), 10\)/g,
    to: 'temp * 10), 10)'
  },
  {
    // Fix endpoint cluster read corruption
    from: /\.Promise\.resolve\(readAttributes\(\['measuredValue'\]\)\)/g,
    to: '.readAttributes([\'measuredValue\'])'
  },
  {
    // Fix gang match corruption in triggerCapabilityListener
    from: /const gangMatch =safeDivide\(capability\.match\(, gang\)\(\\d\+\)\/\);/g,
    to: 'const gangMatch = capability.match(/gang(\\d+)/);'
  }
];

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (file.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const r of REPLACEMENTS) {
        if (r.from.test(content)) {
          content = content.replace(r.from, r.to);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log(` Fixed corruption in ${fullPath}`);
      }
    }
  }
}

console.log(' Starting Math Corruption Cleanup...');
walk(path.join(process.cwd(), 'lib'));
console.log(' Cleanup Complete.');
