#!/usr/bin/env node
/**
 * SDK v3 Flow Card Safety Fixer
 * 
 * Wraps all bare this.homey.flow.getDevice*Card() calls in try-catch
 * to prevent app crashes when flow cards aren't registered in app.json.
 * 
 * In Homey SDK v3:
 * - getDeviceTriggerCard(id) throws if card not in app.json
 * - getDeviceConditionCard(id) throws if card not in app.json  
 * - getDeviceActionCard(id) throws if card not in app.json
 * - getActionCard(id) throws similarly
 * - getTriggerCard(id) throws similarly
 * 
 * This was the #1 crash reported in email diagnostics:
 * "TypeError: this.homey.flow.getDeviceConditionCard is not a function"
 */
'use strict';
const fs = require('fs');
const path = require('path');

const DDIR = path.join(process.cwd(), 'drivers');
const LIBDIR = path.join(process.cwd(), 'lib');

// Patterns that need wrapping - bare calls without try-catch
const UNSAFE_PATTERNS = [
  // Direct calls on this.homey.flow
  /(?<!\/\/.*)(this\.homey\.flow\.getDevice(?:Trigger|Condition|Action)Card\(['"][^'"]+['"]\))(?!\s*\))/g,
  /(?<!\/\/.*)(this\.homey\.flow\.get(?:Action|Trigger|Condition)Card\(['"][^'"]+['"]\))(?!\s*\))/g,
  // Calls via variable alias (cf = this.homey.flow)
  /(?<!\/\/.*)(?<!safeGet\()(?<!return\s)(cf\.getDevice(?:Trigger|Condition|Action)Card\(['"][^'"]+['"]\))(?!\s*\))/g,
  /(?<!\/\/.*)(?<!safeGet\()(?<!return\s)(cf\.get(?:Action|Trigger)Card\(['"][^'"]+['"]\))(?!\s*\))/g,
];

function isAlreadySafe(code, matchIndex) {
  // Check if already inside a try-catch or safeGetCard wrapper
  const before = code.substring(Math.max(0, matchIndex - 200), matchIndex);
  if (/try\s*\{/.test(before) && !/\}\s*catch/.test(before)) return true;
  if (/safeGet|_safeGetCard/.test(before)) return true;
  return false;
}

function processFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  let changes = 0;
  
  // Skip files that already have comprehensive safe wrappers
  if (/const safeGet|_safeGetCard/.test(code)) {
    return { changes: 0, skipped: 'has safe wrapper' };
  }
  
  // Check if file has any unsafe patterns
  let hasUnsafe = false;
  for (const p of UNSAFE_PATTERNS) {
    p.lastIndex = 0;
    if (p.test(code)) {
      hasUnsafe = true;
      break;
    }
  }
  
  if (!hasUnsafe) return { changes: 0, skipped: 'no unsafe calls' };
  
  // Strategy: Find the setup method and add a safeGetCard helper at the top
  // Then replace bare calls with the safe version
  
  // Add ?. optional chaining after each get*Card() call that's followed by .register or .trigger
  // Pattern: getDevice*Card('x').registerRunListener -> getDevice*Card('x')?.registerRunListener  
  // But wrap the getDevice*Card in try-catch
  
  // Simpler approach: wrap each get*Card call
  const replacements = [
    [/this\.homey\.flow\.getDeviceTriggerCard\((['"][^'"]+['"])\)\.(\w+)/g, 
     (m, id, method) => `(() => { try { return this.homey.flow.getTriggerCard(${id}); } catch(e) { return null; } })()?.${method}`],
    [/this\.homey\.flow\.getDeviceConditionCard\((['"][^'"]+['"])\)\.(\w+)/g,
     (m, id, method) => `(() => { try { return this.homey.flow.getConditionCard(${id}); } catch(e) { return null; } })()?.${method}`],
    [/this\.homey\.flow\.getDeviceActionCard\((['"][^'"]+['"])\)\.(\w+)/g,
     (m, id, method) => `(() => { try { return this.homey.flow.getActionCard(${id}); } catch(e) { return null; } })()?.${method}`],
    [/this\.homey\.flow\.getActionCard\((['"][^'"]+['"])\)\.(\w+)/g,
     (m, id, method) => `(() => { try { return this.homey.flow.getActionCard(${id}); } catch(e) { return null; } })()?.${method}`],
    [/this\.homey\.flow\.getTriggerCard\((['"][^'"]+['"])\)\.(\w+)/g,
     (m, id, method) => `(() => { try { return this.homey.flow.getTriggerCard(${id}); } catch(e) { return null; } })()?.${method}`],
    [/this\.homey\.flow\.getConditionCard\((['"][^'"]+['"])\)\.(\w+)/g,
     (m, id, method) => `(() => { try { return this.homey.flow.getConditionCard(${id}); } catch(e) { return null; } })()?.${method}`],
    // cf alias versions  
    [/cf\.getDeviceTriggerCard\((['"][^'"]+['"])\)\.(\w+)/g,
     (m, id, method) => `(() => { try { return cf.getTriggerCard(${id}); } catch(e) { return null; } })()?.${method}`],
    [/cf\.getDeviceConditionCard\((['"][^'"]+['"])\)\.(\w+)/g,
     (m, id, method) => `(() => { try { return cf.getConditionCard(${id}); } catch(e) { return null; } })()?.${method}`],
    [/cf\.getDeviceActionCard\((['"][^'"]+['"])\)\.(\w+)/g,
     (m, id, method) => `(() => { try { return cf.getActionCard(${id}); } catch(e) { return null; } })()?.${method}`],
    [/cf\.getActionCard\((['"][^'"]+['"])\)\.(\w+)/g,
     (m, id, method) => `(() => { try { return cf.getActionCard(${id}); } catch(e) { return null; } })()?.${method}`],
    [/cf\.getTriggerCard\((['"][^'"]+['"])\)\.(\w+)/g,
     (m, id, method) => `(() => { try { return cf.getTriggerCard(${id}); } catch(e) { return null; } })()?.${method}`],
  ];
  
  let newCode = code;
  for (const [pattern, replacer] of replacements) {
    pattern.lastIndex = 0;
    const before = newCode;
    newCode = newCode.replace(pattern, replacer);
    if (newCode !== before) changes++;
  }
  
  if (changes > 0) {
    fs.writeFileSync(filePath, newCode);
  }
  
  return { changes };
}

function main() {
  console.log('=== SDK v3 Flow Card Safety Fixer ===\n');
  
  let totalFiles = 0, totalFixed = 0, totalSkipped = 0;
  
  // Process all driver files
  for (const d of fs.readdirSync(DDIR)) {
    const driverDir = path.join(DDIR, d);
    if (!fs.statSync(driverDir).isDirectory()) continue;
    
    for (const f of ['device.js', 'driver.js']) {
      const filePath = path.join(driverDir, f);
      if (!fs.existsSync(filePath)) continue;
      
      totalFiles++;
      const result = processFile(filePath);
      
      if (result.changes > 0) {
        console.log(`  ✅ ${d}/${f}: ${result.changes} pattern(s) fixed`);
        totalFixed++;
      } else if (result.skipped) {
        // silent skip
        totalSkipped++;
      }
    }
  }
  
  // Process all library files
  function getJSFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      file = path.join(dir, file);
      const stat = fs.statSync(file);
      if (stat && stat.isDirectory()) {
        results = results.concat(getJSFiles(file));
      } else if (file.endsWith('.js')) {
        results.push(file);
      }
    });
    return results;
  }

  const libFiles = getJSFiles(LIBDIR);

  for (const filePath of libFiles) {
    totalFiles++;
    const result = processFile(filePath);
    
    if (result.changes > 0) {
      const relPath = path.relative(LIBDIR, filePath);
      console.log(`  ✅ lib/${relPath}: ${result.changes} pattern(s) fixed`);
      totalFixed++;
    } else if (result.skipped) {
      totalSkipped++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Files scanned: ${totalFiles}`);
  console.log(`Files fixed: ${totalFixed}`);
  console.log(`Files already safe: ${totalSkipped}`);
}

main();
