// fix-trailing-newline.js — P53
// Fix the bug in some driver.compose.json files where they have a literal
// "\n" (backslash-n, 2 chars) at the end instead of just "\n" (newline, 1 char).
// This was caused by PowerShell's Out-File -Encoding utf8 (which adds BOM + escapes).
//
// Run: node fix-trailing-newline.js
// Apply: node fix-trailing-newline.js --apply
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const APPLY = process.argv.includes('--apply');

console.log('=== Fix trailing literal \\n in driver.compose.json ===');

let totalFixed = 0;
let totalChecked = 0;
const fixed = [];

for (const d of fs.readdirSync(DRIVERS_DIR)) {
  const cf = path.join(DRIVERS_DIR, d, 'driver.compose.json');
  if (!fs.existsSync(cf)) continue;
  totalChecked++;

  const content = fs.readFileSync(cf, 'utf8');

  // Try parsing as-is
  try {
    JSON.parse(content);
    continue; // Already valid
  } catch (e) {
    if (!e.message.includes('non-whitespace character after JSON')) continue;
  }

  // Find and remove trailing literal "\n" (backslash + n)
  // The file should end with: ..."}\n"  (closing brace + newline)
  // Bug: ends with: ..."}\n\n"  (closing brace + literal \n + newline)
  // Find the last } and truncate there
  const lastBrace = content.lastIndexOf('}');
  if (lastBrace === -1) {
    console.log('  [SKIP]', d, '- no closing brace found');
    continue;
  }
  const fixedContent = content.substring(0, lastBrace + 1);
  if (fixedContent === content) {
    console.log('  [SKIP]', d, '- already clean');
    continue;
  }

  // Verify
  try {
    JSON.parse(fixedContent);
    if (APPLY) {
      fs.writeFileSync(cf, fixedContent);
      totalFixed++;
      fixed.push(d);
      console.log('  [FIXED]', d);
    } else {
      console.log('  [WOULD FIX]', d, '(length', content.length, '->', fixedContent.length, ')');
      totalFixed++;
    }
  } catch (e) {
    console.log('  [FAIL]', d, '-', e.message);
  }
}

console.log('\n' + (APPLY ? 'FIXED' : 'WOULD FIX') + ': ' + totalFixed + ' / ' + totalChecked);
if (!APPLY && totalFixed > 0) console.log('Run with --apply to fix');
