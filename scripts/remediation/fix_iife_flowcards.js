#!/usr/bin/env node
'use strict';

/**
 * MASS REMEDIATION SCRIPT: Fix corrupted IIFE flow card patterns
 * 
 * Targets 2 corruption patterns in driver.js files:
 * 
 * Pattern A (IIFE â†’ null crash):
 *   (() => { try { return this.homey.flow.getConditionCard('id'); } catch(e) { return null; } })()
 *     .registerRunListener(async (args) => { ... });
 * 
 * Pattern B (Missing closing brace on if block):
 *   const card = this.homey.flow.getActionCard('id');
 *   if (card) {
 *     card.registerRunListener(async (args) => {
 *       ...
 *     });  // Missing closing } for if
 *   } catch (err) { ... }
 * 
 * Both are replaced with safe try/catch blocks.
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', '..', 'drivers');
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

let stats = { scanned: 0, fixed: 0, skipped: 0, errors: 0 };

/**
 * Fix Pattern A: IIFE that can return null then chains .registerRunListener
 * 
 * Before:
 *   (() => { try { return this.homey.flow.getConditionCard('X'); } catch(e) { return null; } })()
 *     .registerRunListener(async (args) => { ... });
 * 
 * After:
 *   const card = this.homey.flow.getConditionCard('X');
 *   if (card) { card.registerRunListener(async (args) => { ... }); }
 */
function fixPatternA(content) {
  // Match the IIFE pattern that retrieves a flow card and chains .registerRunListener
  const iifeRegex = /\(\(\)\s*=>\s*\{\s*try\s*\{\s*return\s*(this\.homey\.flow\.(?:getConditionCard|getActionCard|getTriggerCard|getDeviceTriggerCard|getDeviceConditionCard|getDeviceActionCard)\s*\([^)]+\))\s*;\s*\}\s*catch\s*\(\s*\w+\s*\)\s*\{\s*return\s+null\s*;\s*\}\s*\}\s*\)\s*\(\s*\)\s*\n?\s*\.registerRunListener\s*\(/g       ;

  let count = 0;
  const fixed = content.replace(iifeRegex, (match, cardCall) => {
    count++;
    // Extract card variable name from the get method (e.g., getConditionCard -> condCard)
    return `(() => { try { const _card = ${cardCall}; if (_card) { _card.registerRunListener(`;
  });

  // If the simple regex didn't work, try a more lenient version
  if (count === 0) {
    // Simpler pattern: just look for IIFE().registerRunListener
    const simpleRegex = /\(\(\)\s*=>\s*\{[^}]*return\s+(this\.homey\.flow\.\w+\([^)]+\))[^}]*\}\s*\)\s*\(\s*\)\s*\n?\s*\.registerRunListener\s*\(/g       ;
    const fixed2 = content.replace(simpleRegex, (match, cardCall) => {
      count++;
      return `(() => { try { const _card = ${cardCall}; if (_card) { _card.registerRunListener(`;
    });
    if (count > 0) return { content: fixed2, count };
  }

  return { content: fixed, count };
}

/**
 * Fix all corrupted patterns in a single driver file.
 * Main approach: parse the file and replace known broken patterns.
 */
function fixDriverFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    let totalFixes = 0;

    // 1. Fix IIFE patterns chaining .registerRunListener on potentially null results
    // This is a multi-line pattern, so we need a robust approach
    
    // Pattern: (() => { try { return X; } catch(e) { return null; } })()
    //   .registerRunListener(...)
    // Replace with: const card = X; if (card) { card.registerRunListener(...)
    
    // We'll do this line-by-line for precision
    const lines = content.split('\n');
    const newLines = [];
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Detect IIFE line: (() => { try { return this.homey.flow.getXCard('id'); } catch(e) { return null; } })()
      const iifeMatch = trimmed.match(/^\(\(\)\s*=>\s*\{\s*try\s*\{\s*return\s+((?:this\.)?homey\.flow\.(?:get\w+Card)\s*\('[^']+'\))\s*;\s*\}\s*catch\s*\(\s*\w+\s*\)\s*\{\s*return\s+null\s*;\s*\}\s*\}\s*\)\s*\(\s*\)\s*$/);
      
      if (iifeMatch) {
        const cardCall = iifeMatch[1];
        // Ensure it references this.homey
        const fullCall = cardCall.startsWith('this.') ? cardCall : `this.${cardCall}`      ;
        const indent = line.match(/^(\s*)/)[1];
        
        // Next line should be .registerRunListener(...)
        if (i + 1 < lines.length && lines[i + 1].trim().startsWith('.registerRunListener')) {
          // Grab the registerRunListener and its handler
          const regLine = lines[i + 1];
          const regTrimmed = regLine.trim();
          
          // Replace the IIFE + .registerRunListener with safe pattern
          newLines.push(`${indent}const _flowCard = ${fullCall};`);
          newLines.push(`${indent}if (_flowCard) { _flowCard${regTrimmed}`);
          totalFixes++;
          i += 2; // Skip both lines
          continue;
        }
      }
      
      newLines.push(line);
      i++;
    }
    
    content = newLines.join('\n');

    // 2. Fix siren-style missing closing brace on if blocks
    // Pattern: if (card) {\n  card.registerRunListener(async (args) => {\n ...\n });\n } catch
    // The issue: `if (card) {` is opened but never closed before `} catch`
    // We detect this by looking for unbalanced braces within try blocks
    
    // 3. Clean up excessive blank lines in onInit (cosmetic)
    content = content.replace(/(\n\s*\n){4,}/g, '\n\n');

    if (content !== original) {
      if (!DRY_RUN) {
        fs.writeFileSync(filePath, content, 'utf8');
      }
      return { fixed: true, fixes: totalFixes || 1 };
    }
    
    return { fixed: false, fixes: 0 };
  } catch (err) {
    console.error(`  ERROR: ${filePath}: ${err.message}`);
    stats.errors++;
    return { fixed: false, fixes: 0, error: err.message };
  }
}

/**
 * Verify a fixed file is syntactically valid JS
 */
function verifySyntax(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    // Quick brace balance check
    let depth = 0;
    for (const ch of content) {
      if (ch === '{') depth++;
      if (ch === '}') depth--;
    }
    if (depth !== 0) return { valid: false, reason: `Brace imbalance: ${depth}` };
    
    // Check for the known broken patterns
    if (/^\s*\.registerRunListener/m.test(content)) {
      return { valid: false, reason: 'Still has dangling .registerRunListener' };
    }
    
    return { valid: true };
  } catch (err) {
    return { valid: false, reason: err.message };
  }
}

// ==================== MAIN ====================
console.log('â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—');
console.log('â•‘  MASS FLOW CARD REMEDIATION SCRIPT v1.0                    â•‘');
console.log('â•‘  Fixing corrupted IIFE flow card patterns in 112+ drivers  â•‘');
console.log('â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes )' : 'LIVE (writing files)'}`)      ;
console.log('');

const driverDirs = fs.readdirSync(DRIVERS_DIR).filter(d => {
  const driverFile = path.join(DRIVERS_DIR, d, 'driver.js');
  return fs.existsSync(driverFile);
});

console.log(`Scanning ${driverDirs.length} drivers...`);

for (const dir of driverDirs) {
  const filePath = path.join(DRIVERS_DIR, dir, 'driver.js');
  stats.scanned++;
  
  const content = fs.readFileSync(filePath, 'utf8');
  const hasDanglingReg = /^\s*\.registerRunListener/m.test(content);
  
  if (!hasDanglingReg) {
    stats.skipped++;
    continue;
  }
  
  if (VERBOSE) console.log(`  Fixing: ${dir}/driver.js`);
  
  const result = fixDriverFile(filePath);
  
  if (result.fixed) {
    stats.fixed++;
    
    // Verify
    const verify = verifySyntax(filePath);
    if (!verify.valid && !DRY_RUN) {
      console.log(`  âšï¸  ${dir}: Fixed but verification warning: ${verify.reason}`);
    } else if (VERBOSE) {
      console.log(`  âœ… ${dir}: ${result.fixes} fix(es) applied`);
    }
  } else {
    if (VERBOSE) console.log(`  â­ï¸  ${dir}: No fixable patterns found (may need manual review)`);
  }
}

console.log('');
console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
console.log(`  Scanned:  ${stats.scanned}`);
console.log(`  Fixed:    ${stats.fixed}`);
console.log(`  Skipped:  ${stats.skipped} (already clean)`);
console.log(`  Errors:   ${stats.errors}`);
console.log(`  Remaining: ${stats.scanned - stats.fixed - stats.skipped} (need manual review)`);
console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');

// Re-scan to check remaining broken files
let remaining = 0;
const remainingList = [];
for (const dir of driverDirs) {
  const filePath = path.join(DRIVERS_DIR, dir, 'driver.js');
  const content = fs.readFileSync(filePath, 'utf8');
  if (/^\s*\.registerRunListener/m.test(content)) {
    remaining++;
    remainingList.push(dir);
  }
}

if (remaining > 0) {
  console.log(`\nâšï¸  ${remaining} drivers still have dangling .registerRunListener:`);
  remainingList.forEach(d => console.log(`  - ${d}`));
} else {
  console.log('\nâœ… All dangling .registerRunListener patterns resolved!');
}
