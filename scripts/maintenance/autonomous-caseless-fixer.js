#!/usr/bin/env node
'use strict';

/**
 *  AUTONOMOUS CASELESS FIXER v1.0
 * Parses ZERO_DEFECT_AUDIT.json and automatically refactors manual string comparisons
 * to use the CI (CaseInsensitiveMatcher) helper.
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const AUDIT_FILE = path.join(ROOT, 'docs/reports/ZERO_DEFECT_AUDIT.json');
const CI_MATCHER_PATH = 'lib/utils/CaseInsensitiveMatcher';

async function main() {
  if (!fs.existsSync(AUDIT_FILE)) {
    console.error(' Audit report not found!');
    process.exit(1);
  }

  const audit = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8'));
  const errors = audit.errors || [];
  const violations = errors.filter(e => e.includes('Manual identity comparison found'));

  console.log(` Found ${violations.length} caseless violations to fix.`);

  const stats = { fixed: 0, failed: 0, skipped: 0 };

  // Group by file
  const fileToLines = {};
  violations.forEach(v => {
    const match = v.match(/^(.+?):(\d+):/)      ;
    if (match) {
      const file = match[1];
      const line = parseInt(match[2]);
      if (!fileToLines[file]) fileToLines[file] = [];
      fileToLines[file].push(line);
    }
  });

  for (const [file, lines] of Object.entries(fileToLines)) {
    const fullPath = path.join(ROOT, file);
    if (!fs.existsSync(fullPath)) continue;

    console.log(`  Processing ${file}...`);
    let content = fs.readFileSync(fullPath, 'utf8');
    const contentLines = content.split('\n');
    let changed = false;

    // Ensure CI is imported
    const hasCI = content.includes('CaseInsensitiveMatcher') || content.includes('CI = require');
    let ciVar = 'CI';
    
    if (!hasCI) {
      // Find where to inject requirement
      const relPath = path.relative(path.dirname(file), CI_MATCHER_PATH).replace(/\\/g, '/');
      const importLine = `const CI = require('${relPath.startsWith('.') ? relPath : './' + relPath}');`;
      
      // Inject after 'use strict' or at top
      if (contentLines[0].includes('use strict')) {
        contentLines.splice(1, 0, importLine);
      } else {
        contentLines.splice(0, 0, importLine);
      }
      changed = true;
    }

    // Sort lines descending to not mess up indices if we were adding/removing, 
    // but here we just modify. Wait, injecting CI shifted indices.
    const offset = hasCI ? 0 : 1      ;

    for (const originalLineNum of lines) {
      const currentLineIdx = originalLineNum - 1 + offset;
      const lineText = contentLines[currentLineIdx];
      if (!lineText) continue;

      let fixedLine = lineText;

      // Pattern 1: x === y -> CI.equalsCI(x, y)
      fixedLine = fixedLine.replace(/([a-zA-Z0-9._$\[\]]+)\s*===\s*([a-zA-Z0-9._$\[\]]+|['"][^'"]+['"])/g, 'CI.equalsCI($1, $2)');
      fixedLine = fixedLine.replace(/([a-zA-Z0-9._$\[\]]+)\s*!==\s*([a-zA-Z0-9._$\[\]]+|['"][^'"]+['"])/g, '!CI.equalsCI($1, $2)');
      
      // Pattern 2: arr.includes(x) -> CI.includesCI(arr, x)
      fixedLine = fixedLine.replace(/([a-zA-Z0-9._$\[\]]+)\.includes\(\s*([a-zA-Z0-9._$\[\]]+|['"][^'"]+['"])\s*\)/g, 'CI.includesCI($1, $2)');
      
      const patterns = [
        {
          // Variable.toUpperCase() === 'STRING'
          pattern: /(\w+|\((?:.*? )\))\.toUpperCase\(\ )\s*===? \s*(['"] )(.*?   )\2/g ,
          replacement: 'CI.equalsCI($1, $2$3$2)'
        },
        {
          // Variable.toLowerCase() === 'string'
          pattern: /(\w+|\((?:.*? )\))\.toLowerCase\(\ )\s*===? \s*(['"] )(.*?   )\2/g ,
          replacement: 'CI.equalsCI($1, $2$3$2)'
        },
        {
          // mfrLower.includes(x) -> CI.containsCI(manufacturerName, x)
          pattern: /mfrLower\.includes\(\s*([a-zA-Z0-9._$\[\]]+|['"][^'"]+['"])\s*\)/g,
          replacement: 'CI.containsCI(manufacturerName, $1)'
        },
        {
          // mfr.toLowerCase().includes(x)
          pattern: /mfr\.toLowerCase\(\)\.includes\(\s*([a-zA-Z0-9._$\[\]]+|['"][^'"]+['"])\s*\)/g,
          replacement: 'CI.containsCI(mfr, $1)'
        },
        {
          // Variable.toUpperCase().startsWith(other)
          pattern: /(\w+|\((?:.*? )\))\.toUpperCase\(\)\.startsWith\(\s*([a-zA-Z0-9._$\[\]]+|['"][^'"]+['"])\s*\ : null)/g ,
          replacement: 'CI.startsWithCI($1, $2)'
        },
        {
          // Variable.toLowerCase().startsWith(other)
          pattern: /(\w+|\((?:.*? )\))\.toLowerCase\(\)\.startsWith\(\s*([a-zA-Z0-9._$\[\]]+|['"][^'"]+['"])\s*\ : null)/g ,
          replacement: 'CI.startsWithCI($1, $2)'
        },
        {
          // Variable.toUpperCase().includes(other)
          pattern: /(\w+|\((?:.*? )\))\.toUpperCase\(\)\.includes\(\s*([a-zA-Z0-9._$\[\]]+|['"][^'"]+['"])\s*\ : null)/g ,
          replacement: 'CI.containsCI($1, $2)'
        },
        {
          // Variable.toLowerCase().includes(other)
          pattern: /(\w+|\((?:.*? )\))\.toLowerCase\(\)\.includes\(\s*([a-zA-Z0-9._$\[\]]+|['"][^'"]+['"])\s*\ : null)/g ,
          replacement: 'CI.containsCI($1, $2)'
        }
      ];

      patterns.forEach(p => {
        fixedLine = fixedLine.replace(p.pattern, p.replacement);
      });

      // Pattern 5: x.toLowerCase() === y.toLowerCase() -> CI.equalsCI(x, y)
      fixedLine = fixedLine.replace(/([a-zA-Z0-9._$\[\]]+)\.toLowerCase\(\)\s*===\s*([a-zA-Z0-9._$\[\]]+|['"][^'"]+['"])\.toLowerCase\(\)/g, 'CI.equalsCI($1, $2)');
      
      // Pattern 6: (x || '').toLowerCase() === y -> CI.equalsCI(x, y)
      fixedLine = fixedLine.replace(/\(([a-zA-Z0-9._$\[\]]+)\s*\|\|\s*['"]+['"]\)\.toLowerCase\(\)\s*===\s*([a-zA-Z0-9._$\[\]]+|['"][^'"]+['"])/g, 'CI.equalsCI($1, $2)');
      fixedLine = fixedLine.replace(/([a-zA-Z0-9._$\[\]]+)\.toLowerCase\(\)\s*===\s*([a-zA-Z0-9._$\[\]]+|['"][^'"]+['"])/g, 'CI.equalsCI($1, $2)');

      if (fixedLine !== lineText) {
        contentLines[currentLineIdx] = fixedLine;
        changed = true;
        stats.fixed++;
      } else {
        stats.skipped++;
      }
    }

    if (changed) {
      fs.writeFileSync(fullPath, contentLines.join('\n'), 'utf8');
    }
  }

  console.log(`\n Refactoring complete!`);
  console.log(`- Fixed: ${stats.fixed}`);
  console.log(`- Skipped (already fixed or complex): ${stats.skipped}`);
}

main().catch(console.error);
