'use strict';
const fs = require('fs');
const path = require('path');

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

function stabilize(content) {
  let res = content;

  // -- 1. UNWRAP MALFORMED UTILITY CALLS (RECURSIVE) --
  for (let i = 0; i < 5; i++) {
    // (A, B) -> (A / B)
    res = res.replace(/safeDivide\(\(([^,)]+)\), ([^,)]+)\)/g, '($1 / $2)');
    res = res.replace(/safeMultiply\(\(([^,)]+)\), ([^,)]+)\)/g, '($1 * $2)');
    
    // safeDivide(A, B) -> (A / B)
    res = res.replace(/safeDivide\(([^,)]+), ([^,)]+)\)/g, '($1 / $2)');
    res = res.replace(/safeMultiply\(([^,)]+), ([^,)]+)\)/g, '($1 * $2)');
    
    // (A) -> A
    res = res.replace(/safeDivide\(\(([^,)]+)\)\)/g, '$1');
    res = res.replace(/safeMultiply\(\(([^,)]+)\)\)/g, '$1');
    res = res.replace(/safeDivide\(([^,)]+)\)/g, '$1');
    res = res.replace(/safeMultiply\(([^,)]+)\)/g, '$1');
    res = res.replace(/safeParse\(([^,)]+)\)/g, '$1');
  }

  // -- 2. FIX COMMA OPERATOR ARTIFACTS --
  // (A, B) where B is a number -> (A / B) [Common in unit conversion]
  res = res.replace(/\(([^,({}]+), ([0-9.]+)\)/g, '($1 / $2)');

  // -- 3. RESTORE NATIVE BRACKETS & FUNCTIONS --
  res = res.replace(/Date\.now\(([^)])/g, 'Date.now()$1');
  res = res.replace(/\.getTime\(([^)])/g, '.getTime()$1');
  res = res.replace(/Math\.random\(([^)])/g, 'Math.random()$1');
  res = res.replace(/\(Math\.random\(\) \* ([^)]+)\) \/ 2/g, '(Math.random() * $1 / 2)'); // Jitter fix
  
  // -- 4. REPAIR CORRUPTED REGEXES --
  res = res.replace(/([a-z0-9])safeDivide\(([a-z0-9])\, g\)/gi, '$1_$2'); // Cluster map underscore fix
  res = res.replace(/\(\/ ( g\))/g, '/g)'); // Fix (/ g)
  res = res.replace(/\/\(\[a-z\]\)safeDivide\(\(\[A-Z\]\), g\)\//g, '/([a-z])([A-Z])/g');
  res = res.replace(/(\/ g),/g, '/g,'); // Fix / g),
  res = res.replace(/(\/ gi),/g, '/gi,'); // Fix / gi),
  res = res.replace(/ \/ gi\)/g, '/gi)'); // Fix / gi)
  res = res.replace(/\$ \/ gi/g, '$/gi'); // Fix $ / gi
  res = res.replace(/\$ \/ g/g, '$/g');   // Fix $ / g
  res = res.replace(/\s\/\sgi/g, '/gi');
  res = res.replace(/\s\/\sg/g, '/g');
  res = res.replace(/\(_ \/ g\)/g, '(/_/g)'); // TitleSanitizer L137 fix
  res = res.replace(/\\\, i\)/g, '/i)');      // TitleSanitizer L180 fix
  res = res.replace(/\, i\)/g, '/i)');

  // -- 5. SPECIFIC FORMULA RESTORATION & MATH FIXES --
  // Lux formula fix (value - 1) / 10000
  res = res.replace(/value - 1 \* 10000/g, '(value - 1) / 10000');
  res = res.replace(/v - 1 \* 10000/g, '(v - 1) / 10000');
  res = res.replace(/measuredValue - 1 \* 10000/g, '(measuredValue - 1) / 10000');
  // RetryWithBackoff mangled Math.pow
  res = res.replace(/\(([^()]+) \* Math\)\.pow\(2, ([^)]+)\)/g, '$1 * Math.pow(2, $2)');

  // -- 6. FIX TERNARY OPERATORS & PHANTOM ARTIFACTS --
  // A. Restore missing in broken ternaries (Flexible Spacing)
  res = res.replace(/\?\s*([^?:]+),/g, '? $1 ,'); // Property assignments
  res = res.replace(/\?\s*([^?:]+);/g, '? $1 ;'); // Assignments
  res = res.replace(/\?\s*([^?:]+)\)/g, '? $1 : null)'); // Function calls
  
  // B. Remove PHANTOM : null (where no ? exists in the expression)
  res = res.replace(/(\|\| '\?')\s*\)\s*:\s*null;/g, '$1);');
  res = res.replace(/'\?\'\)\s*:\s*null;/g, "'?')")      ;

  // C. Restore missing at line endings for object properties (LogBuffer.js)
  res = res.replace(/([^?:]+\?\s*[^,:]+),$/gm, '$1 ,')      ;

  // -- 7. FIX MISSING VARIABLE NAMES IN OBJECTS (Surgical) --
  res = res.replace(/const {0:'Raw',/g, "const DP_TYPES = {0:'Raw',");
  res = res.replace(/const {[\s\n]+'onoff':/g, "const configs = {\n      'onoff':"); // ReportingConfig fix
  res = res.replace(/\/\/ A8: NaN Safety[^\n]+\n\s+const {[\s\n]+'/g, "// A8: NaN Safety\n    const configs = {\n      '");

  return res;
}

const files = getFiles(BASE_DIR);
files.forEach(f => {
  if (f.includes('MASTER_STABILIZER.js')) return;
  try {
    const original = fs.readFileSync(f, 'utf8');
    const stabilized = stabilize(original);
    if (stabilized !== original) {
      fs.writeFileSync(f, stabilized, 'utf8');
      console.log(`[MASTER-RECOVER] ${path.relative(BASE_DIR, f)}`);
    }
  } catch(e) {}
});
