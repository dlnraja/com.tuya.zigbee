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

function emergencyFix(content) {
  let res = content;

  // PASS 1: Catastrophic injections from MASTER_STABILIZER
  
  // Math & Date corruption
  res = res.replace(/\(Date\.now\(\)\s*-\s*([A-Za-z0-9_.]+)\)\s*\*\s*1000(?!\))/g, '(Date.now() - $1) / 1000');
  res = res.replace(/\(Date\.now\(\)\s*-\s*([A-Za-z0-9_.]+)\s*\*\s*1000\)\)/g, '(Date.now() - $1) / 1000');
  res = res.replace(/Math\.floor\(\(Date\.now\(\)\s*-\s*([A-Za-z0-9_.]+)\)\s*[/*]\s*1000(?!\))/g, 'Math.floor((Date.now() - $1) / 1000)');

  // getTimezoneOffset recovery
  res = res.replace(/\.getTimezoneOffset\(\s*,\s*([0-9.]+)\)/g, '.getTimezoneOffset() * $1');
  res = res.replace(/\.getTimezoneOffset\(\s*\*\s*([0-9.]+)\s*\)\s*\)/g, '.getTimezoneOffset() * $1)');
  res = res.replace(/\.getTimezoneOffset\(\s*\*\s*([0-9.]+)\s*\)/g, '.getTimezoneOffset() * $1');
  res = res.replace(/new Date\(\)\.getTimezoneOffset\(\)\s*\*\s*([0-9.]+)\s*\)/g, 'new Date().getTimezoneOffset() * $1');

  // PASS 2: Surgical regex & Math repairs
  // Fix .replace(/^safeDivide(0x, i),'') -> .replace(/^(0x)/i,'')
  res = res.replace(/\.replace\(\/\^safeDivide\(([^,]+),\s*([a-z]+)\)/g, '.replace(/^($1)/$2');
  // Fix safeDivide(exist, i.test) -> exist/i.test
  res = res.replace(/safeDivide\(([^,]+),\s*([a-z]+)\.test\)/g, '$1/$2.test');
  
  // Fix mangled decimals: safeMultiply(A, 0).95 -> (A * 0.95)
  res = res.replace(/safeMultiply\(([^,]+),\s*0\)\s*\.([0-9]+)/g, '($1 * 0.$2)');
  res = res.replace(/safeMultiply\(([^,]+)\s*,\s*0\)\s*\.([0-9]+)/g, '($1 * 0.$2)');
  
  // Unwrap 1-arg safeMultiply/safeDivide (Iterative for nested)
  for(let i=0; i<3; i++) {
    res = res.replace(/safeMultiply\(([^,)]+)\)/g, '$1');
    res = res.replace(/safeDivide\(([^,)]+)\)/g, '$1');
    res = res.replace(/safeMultiply\((safeMultiply\([^)]+\))\)/g, '$1');
  }

  // Fix split multiplication artifacts
  res = res.replace(/\)\)\s*safeMultiply\(\s*([0-9.]+)\s*\+\s*([^,]+)?\s*[*]\s*([0-9.]+)\s*\)\)/g, ' * ($1 + $2 * $3))');
  res = res.replace(/\)\s*safeMultiply\(\s*\.([0-9]+)\s*\+\s*([^,]+)?\s*[*]\s*([0-9.]+)\s*\)\)/g, ' * (0.$1 + $2 * $3))');

  // Fix Math.random artifact
  res = res.replace(/Math\.random\(,\s*([0-9A-Za-z]+)\)/g, 'Math.random() * $1');

  // Fix mangled math in template literals
  res = res.replace(/\$\{([^}/,]+)\s*\/\s*([^}/,]+)\s*,\s*([^}/]+)\}/g, '${safeDivide($1, $2, $3)}');
  res = res.replace(/safeDivide\(([^,]+),\s*([^,]+)\),\s*([^)]+)\)/g, 'safeMultiply(safeDivide($1, $2), $3)');
  
  // Fix specific BatteryManager corruption
  res = res.replace(/Math\.round\(safeMultiply\(([^)]+)\)\s*safeMultiply\(\s*\.([0-9]+)\s*\+\s*([^,]+),\s*0\)\s*\.([0-9]+)\s*\)/g, 
                   'Math.round(($1 * 0.$2) + ($3 * 0.$4))');

  // Fix template literal parenthesis imbalance: ${Math.round(...)/60/60)} -> ${Math.round(.../3600)}
  res = res.replace(/\$\{Math\.round\(([^)]+)\)\/60\/60\)\}/g, '${Math.round($1 / 3600)}');
  res = res.replace(/\$\{Math\.round\(([^)]+)\)\/1000\)\/60\/60\)\}/g, '${Math.round($1 / 3600000)}');
  res = res.replace(/\$\{([^}]+)\)\}/g, (match, p1) => {
      // If there's an extra closing paren at the end of a template expression
      const openCount = (p1.match(/\(/g) || []).length;
      const closeCount = (p1.match(/\)/g) || []).length;
      if (closeCount > openCount) return `\${${p1.substring(0, p1.length - 1)}}`;
      return match;
  });

  // Fix mid-regex safeDivide
  res = res.replace(/safeDivide\(([^,]+),\s*g\)/g, '$1/g');
  res = res.replace(/safeDivide\(([^,]+),\s*i\)/g, '$1/i');
  
  // Fix mangled replace(/.../g)
  res = res.replace(/replace\(\/([^/]+?)\s*,\s*g\)/g, 'replace(/$1/g)');
  res = res.replace(/\/not found\|doesn't exist\|does not \(exist \/i/g, "/not found|doesn't exist|does not exist/i");

  // PASS 3: Ternary & Artifact cleanup
  // Fix nested ternary artifact
  res = res.replace(/\?\s*([^?:]+)\s*:\s*null\s*:\s*([^; ]+)/g, '? $1 : $2');
  
  // Specific TuyaEF00Manager time sync artifact repair (Improved for multiline)
  res = res.replace(/timezoneMinutes\s*!==\s*null\s*\n\s*\?\s*timezoneMinutes\s*:\s*null\s*\n\s*:\s*-now\.getTimezoneOffset\(\)/g, 
                   'timezoneMinutes !== null ? timezoneMinutes : -now.getTimezoneOffset()');
  res = res.replace(/timezoneMinutes\s*!==\s*null\s*\?\s*timezoneMinutes\s*:\s*null\s*:\s*-now\.getTimezoneOffset\(\)/g, 
                   'timezoneMinutes !== null ? timezoneMinutes : -now.getTimezoneOffset()');

  // Multiline iterative double colon removal
  for(let i=0; i<5; i++) {
    res = res.replace(/:\s*:\s*null\s*([\t ]*\n[\t ]*)?/g, ': $1');
  }
  
  const lines = res.split('\n');
  const fixedLines = lines.map(line => {
    let newLine = line;
    
    // Fix (: null) or (arg : null) patterns
    newLine = newLine.replace(/\(\s*:\s*null\s*\)/g, '()');
    newLine = newLine.replace(/\(([^,:()]+)\s*:\s*null\s*\)/g, '($1)');
    newLine = newLine.replace(/\(([^,:()]+)\s*:\s*null\s*,\s*/g, '($1, ');
    
    // Fix truncated ternary: ? val -> ? val : null
    if (newLine.includes(' ? ') && !newLine.includes(' : ') && !newLine.includes('?.') && !newLine.includes('??')) {
        const trimmed = newLine.trim();
        if ( (trimmed.includes('=') || trimmed.startsWith('return ')) && !trimmed.match(/[,)]$|^\/\//)) {
             if (trimmed.endsWith(';')) {
                 newLine = newLine.replace(/;\s*$/, ' : null;');
             } else {
                 newLine = newLine.replace(/([^; \t]+)$/, '$1 : null');
             }
        }
    }
    
    // Double assignment/const await in IASAlarmFallback
    newLine = newLine.replace(/^(\s*)const\s+await\s+this\._tryBind\(\);/g, '$1const bindOk = await this._tryBind();');

    // Specific fix for mapping = dpMappings ? dpMappings[dp] ;
    newLine = newLine.replace(/(\?\s*[^;]+)\s*;\s*$/, '$1 : null;');

    // General cleanup
    newLine = newLine.replace(/: null\s*:/g, ': ');
    newLine = newLine.replace(/: null\s*,/g, ',');
    newLine = newLine.replace(/: null\s*;/g, ';');
    
    // Fix "const m = v.match(... : null)"
    newLine = newLine.replace(/\.match\(([^)]+)\s*:\s*null\)/g, '.match($1)');

    return newLine;
  });
  res = fixedLines.join('\n');

  // Fix BatteryManager curve math parenthesis imbalance (Robust)
  res = res.replace(/low\.percentage\s*\+\s*\(\(safeMultiply\(safeDivide\(voltageOffset,\s*safeMultiply\(voltageRange\)\),\s*percentageRange\)\);/g, 
                   'low.percentage + safeMultiply(safeDivide(voltageOffset, voltageRange), percentageRange);');
  res = res.replace(/low\.percentage\s*\+\s*\(\(safeMultiply\(safeDivide\(voltageOffset,\s*voltageRange\),\s*percentageRange\)\);/g,
                   'low.percentage + safeMultiply(safeDivide(voltageOffset, voltageRange), percentageRange);');

  // PASS 4: Object properties & Functions
  res = res.replace(/([A-Z_]+\.[A-Z0-9_]+)\s*:\s*('|")/g, '[$1]: $2');
  res = res.replace(/([A-Z_]+\.[A-Z0-9_]+)\s*(\/\/|$)/g, (match, p1, p2) => {
    if (match.includes(':') || match.includes('[')) return match;
    return `[${p1}]: null ${p2}`;
  });

  // Restore parseInt/writeInt commas
  res = res.replace(/parseInt\(([^,()]+)\s*[/*]\s*16\s*\)/g, 'parseInt($1, 16)');

  // NEW RECOVERY PATTERNS v18
  
  // 1. Fix runaway function openers (redundant nesting from botched passes)
  const fns = ['safeMultiply', 'safeDivide', 'safeParse', 'Math\\.round', 'Math\\.floor', 'Math\\.floorsafeMultiply'];
  fns.forEach(fn => {
    const re = new RegExp(`(${fn})\\(\\s*\\1\\(`, 'g');
    while (re.test(res)) {
      res = res.replace(re, '$1(');
    }
  });

  // 2. Fix app.js diagnostic report object corruption
  res = res.replace(/identificationDatabase:\s*this\.identificationDatabase\s*\?\s*this\.identificationDatabase\.getStats\(\)\s*,(\s*diagnostics:)/g, 
                   "identificationDatabase: this.identificationDatabase ? this.identificationDatabase.getStats() : {},$1");
  res = res.replace(/(diagnostics:\s*this\.diagnosticAPI\s*\?\s*this\.diagnosticAPI\.getFullReport\(true\s*\))\s*\/\/\s*MCP\/AI\s*data\s*;/g, 
                   "$1 : {} // MCP/AI data");

  // 3. Fix Groovy/Adapter Regex Mangling (safeMultiply/safeDivide injected into /.../)
  res = res.replace(/\[\^\]\]\*\)\]\[\^\}\]\*\?model:\\safeMultiply\(s,\s*'(\[^'\]\+)'\[\^\}\]\*\?vendor:\\s\*'(\[^'\]\+)'\(\[\\s\\S\]\*\?\\n\\s\*\\\}/g, 
                   "[^\\]]*)\\][^}]*?model:\\s*'($1)'[^}]*?vendor:\\s*'($2)'([\\s\\S]*?)\\n\\s*}");
  res = res.replace(/dpRegex\s*=\s*\/\(\?:dp\|DP\|datapoint\)\[:\\s=safeMultiply\( \],\s*\(\)\\d\{1,3\}safeDivide\(\),\s*gi\)/g, 
                   'dpRegex = /(?:dp|DP|datapoint)[:\\s=](\\d{1,3})/gi');
  res = res.replace(/pairRegex\s*=\s*\\\/\\safeMultiply\(safeDivide\(\(\\s\*\["\'\]\(\[\^"\'\]\+\["\'\]\\s\*, \\s\*\["\'\]\(\[\^"\'\]\+\)\["\'\]\\s\*\\\), g\);/g, 
                   'pairRegex = /\\s*\\(\\s*["\']([^"\']+)["\']\\s*,\\s*["\']([^"\']+)["\']\\s*\\)/g;');
  res = res.replace(/dpMatches\s*=\s*\[\.\.\.new\s*Set\(\(body\.match\(\/\(\?:dp\|DP\|datapoint\)\[:\\s=\]\*safeMultiply\(safeDivide\(\(\\d\{1,\s*3\}\),\s*gi\)\)\s*\|\|\s*\[\]\)/g,
                   'dpMatches = [...new Set((body.match(/(?:dp|DP|datapoint)[:\\s=]*(\\d{1,3})/gi) || [])');

  // 4. Fix lib/adapters/ExternalDeviceAdapter.js if/test mangling
  res = res.replace(/safeDivide\(if\s*\(,\s*([^)]+)\)\|([^/]+)\/i\.test\(([^)]+)\)\)/g, "if (/$1|$2/i.test($3))");

  // 5. Fix safeMultiply(val)).7 -> val * 0.7
  res = res.replace(/Math\.round\(\(voltageBasedPercentage\)\)\.7/g, "Math.round(voltageBasedPercentage * 0.7)");
  res = res.replace(/\(voltageBasedPercentage\)\.7/g, "(voltageBasedPercentage * 0.7)");

  // 6. Fix AnalyticsSystem.js mangled reduce/safeDivide
  res = res.replace(/avg:\s*values\.reduce\(\(a,\s*b\)\s*=>\s*a\s*\+\s*b,safeMultiply\(safeDivide\(0,\s*values\.length\),\s*latest:\s*values\[values\.length\s*-\s*1\],/g,
                   "avg: safeDivide(values.reduce((a, b) => a + b, 0), values.length), latest: values[values.length - 1],");
  res = res.replace(/reduce\(\(a,\s*b\)\s*=>\s*a\s*\+\s*b,0,\s*recent\.length\);/g, "reduce((a, b) => a + b, 0) / recent.length;");
  res = res.replace(/reduce\(\(a,\s*b\)\s*=>\s*a\s*\+\s*b,0,\s*older\.length\);/g, "reduce((a, b) => a + b, 0) / older.length;");
  res = res.replace(/const\s+oldAvg\s*=\s*older\.reduce\(\(a,\s*b\)\s*=>\s*a\s*\+\s*b,safeDivide\(0,\s*older\.length\);/g,
                   "const oldAvg = safeDivide(older.reduce((a, b) => a + b, 0), older.length);");
  res = res.replace(/const\s+change\s*=\s*\(\(avg\s*-oldAvg,\s*oldAvg\),\s*100\);/g,
                   "const change = safeMultiply(safeDivide(avg - oldAvg, oldAvg), 100);");

  // 7. Fix AnalyticsSystem.js linear regression mangling
  res = res.replace(/sumXY\s*=\s*x\.reduce\(\(sum,\s*xi,\s*i\)\s*=>safeMultiply\(sum\s*\+\s*xi,\s*y\)\[i\],\s*0\);/g,
                   "sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);");
  res = res.replace(/sumX2\s*=\s*x\.reduce\(\(sum,\s*xi\)\s*=>safeMultiply\(sum\s*\+\s*xi,\s*xi\),\s*0\);/g,
                   "sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);");
  res = res.replace(/const\s+slope\s*=safeMultiply\(\(n,\s*sumXY\)safeMultiply\(-\s*sumX,\s*sumY\)\)\s*\/\s*safeMultiply\(\(n,\s*sumX2\)safeMultiply\(-\s*sumX,\s*sumX\)\);/g,
                   "const slope = safeDivide(safeMultiply(n, sumXY) - safeMultiply(sumX, sumY), safeMultiply(n, sumX2) - safeMultiply(sumX, sumX));");
  res = res.replace(/const\s+intercept\s*=safeMultiply\(\(sumY\s*-\s*slope,\s*safeDivide\)\(sumX\),\s*n\);/g,
                   "const intercept = safeDivide(sumY - safeMultiply(slope, sumX), n);");
  res = res.replace(/const\s+daysUntilEmpty\s*=\s*-safeMultiply\(safeDivide\(intercept,\s*slope\);/g,
                   "const daysUntilEmpty = safeDivide(-intercept, slope);");

  // 8. Fix BatteryCalculator.js mangled cases
  res = res.replace(/percentage\s*=safeMultiply\(rawValue,\s*safeDivide\)\(multiplier,\s*divisor\);/g,
                   "percentage = safeMultiply(rawValue, safeDivide(multiplier, divisor));");
  res = res.replace(/return\s*\(\(voltage\s*-\s*vMin\)\s*\/safeMultiply\(vMax\s*-\s*vMin,\s*100\);/g,
                   "return safeMultiply(safeDivide(voltage - vMin, vMax - vMin), 100);");
  res = res.replace(/return\s*p2\s*\+\s*safeMultiply\(ratio,\s*\(p1\s*-\s*p2\)\);/g,
                   "return p2 + safeMultiply(ratio, (p1 - p2));");

  // 9. Fix SecurityManager.js score calculation
  res = res.replace(/report\.score\s*=\s*Math\.max\(0,\s*100\s*-\s*report\.findings\.filter\(f\s*=>\s*f\.severity\s*===\s*'critical'\.length,\s*30\)\)/g,
                   "report.score = Math.max(0, 100 - report.findings.filter(f => f.severity === 'critical').length * 30)");
  res = res.replace(/-\s*report\.findings\.filter\(f\s*=>\s*f\.severity\s*===\s*'warning'\.length,\s*10\)/g, 
                   "- report.findings.filter(f => f.severity === 'warning').length * 10");
  res = res.replace(/-\s*report\.findings\.filter\(f\s*=>\s*f\.severity\s*===\s*'info'\.length,\s*2\)\);/g,
                   "- report.findings.filter(f => f.severity === 'info').length * 2);");

  // PASS 5: Global restoration & Deduplication
  res = res.replace(/^\s*require\('\.\.\/utils\/CaseInsensitiveMatcher'\);/gm, "const CI = require('../utils/CaseInsensitiveMatcher');");
  res = res.replace(/^\s*require\('\.\/utils\/CaseInsensitiveMatcher'\);/gm, "const CI = require('./utils/CaseInsensitiveMatcher');");
  
  // Smarter Deduplication
  const requireRegex = /const\s+\{([^}]+)\}\s*=\s*require\('([./]*utils\/tuyaUtils\.js)'\);/g;
  const requireMatches = [...res.matchAll(requireRegex)];
  if (requireMatches.length > 1) {
    const allProps = new Set();
    let firstPath = '';
    requireMatches.forEach(m => {
        if (!firstPath) firstPath = m[2];
        if (m[2].length < firstPath.length) firstPath = m[2];
        m[1].split(',').forEach(p => {
          const prop = p.trim();
          if (prop) allProps.add(prop);
        });
    });
    res = res.replace(requireRegex, '');
    const combined = `const { ${Array.from(allProps).sort().join(', ')} } = require('${firstPath}');`;
    if (res.includes("'use strict';")) {
       res = res.replace(/'use strict';\n?/, `'use strict';\n${combined}\n`);
    } else {
       res = combined + '\n' + res;
    }
  }

  res = res.replace(/for\s*\(\s*(\/\/[^\n]*\n)?\s*let\s+0;\s*([a-z])\s*</gi, 'for (let $2 = 0; $2 <');
  res = res.replace(/let\s+0;/g, 'let listenerCount = 0;');

  return res;
}

const files = getFiles(BASE_DIR);
console.log(`Found ${files.length} files to check.`);
files.forEach(f => {
  if (f.includes('EMERGENCY_RECOVER.js') || f.includes('node_modules')) return;
  try {
    const original = fs.readFileSync(f, 'utf8');
    const fixed = emergencyFix(original);
    if (fixed !== original) {
      fs.writeFileSync(f, fixed, 'utf8');
      console.log(`[EMERGENCY-FIX] ${path.relative(BASE_DIR, f)}`);
    }
  } catch(e) {
    console.error(`Error processing ${f}: ${e.message}`);
  }
});

console.log('Emergency Recovery Complete.');
