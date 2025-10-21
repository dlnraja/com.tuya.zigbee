#!/usr/bin/env node
'use strict';

/**
 * SDK3 AUDIT: Error Handling in Device Drivers
 * 
 * Vérifie que tous les drivers ont un error handling correct:
 * - Try/catch autour des commandes Zigbee
 * - Async/await correctement utilisé
 * - Errors loggés avec this.error()
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 SDK3 AUDIT: Error Handling in Drivers\n');

const driversDir = path.join(__dirname, '../../drivers');
const drivers = fs.readdirSync(driversDir).filter(d => {
  const devicePath = path.join(driversDir, d, 'device.js');
  return fs.existsSync(devicePath);
});

let issues = [];

drivers.forEach(driverName => {
  const devicePath = path.join(driversDir, driverName, 'device.js');
  const content = fs.readFileSync(devicePath, 'utf8');
  
  // 1. Check for async functions without try/catch
  const asyncFunctions = content.match(/async\s+\w+\s*\([^)]*\)\s*{/g) || [];
  asyncFunctions.forEach(func => {
    const funcName = func.match(/async\s+(\w+)/)?.[1];
    const funcStart = content.indexOf(func);
    const funcEnd = findMatchingBrace(content, funcStart + func.length);
    const funcBody = content.substring(funcStart, funcEnd);
    
    if (!funcBody.includes('try') && funcBody.includes('await')) {
      issues.push({
        driver: driverName,
        type: 'missing_try_catch',
        function: funcName,
        severity: 'high'
      });
    }
  });
  
  // 2. Check for .catch() without error handling
  const catchBlocks = content.match(/\.catch\(\s*\)/g) || [];
  if (catchBlocks.length > 0) {
    issues.push({
      driver: driverName,
      type: 'empty_catch',
      count: catchBlocks.length,
      severity: 'medium'
    });
  }
  
  // 3. Check for throw without try/catch in async context
  const throwStatements = content.match(/throw\s+/g) || [];
  if (throwStatements.length > 0) {
    issues.push({
      driver: driverName,
      type: 'unhandled_throw',
      count: throwStatements.length,
      severity: 'medium'
    });
  }
  
  // 4. Check for missing this.error() calls
  const errorCalls = (content.match(/this\.error\(/g) || []).length;
  const catchCalls = (content.match(/catch\s*\(/g) || []).length;
  
  if (catchCalls > 0 && errorCalls === 0) {
    issues.push({
      driver: driverName,
      type: 'missing_error_logging',
      severity: 'low'
    });
  }
});

function findMatchingBrace(str, start) {
  let depth = 1;
  for (let i = start; i < str.length; i++) {
    if (str[i] === '{') depth++;
    if (str[i] === '}') depth--;
    if (depth === 0) return i;
  }
  return str.length;
}

// Group issues by type
const grouped = {};
issues.forEach(issue => {
  if (!grouped[issue.type]) grouped[issue.type] = [];
  grouped[issue.type].push(issue);
});

console.log('='.repeat(60));
console.log('AUDIT RESULTS');
console.log('='.repeat(60) + '\n');

console.log(`📊 Total drivers checked: ${drivers.length}`);
console.log(`⚠️  Total issues found: ${issues.length}\n`);

// Display by type
Object.entries(grouped).forEach(([type, items]) => {
  const severity = items[0].severity;
  const icon = severity === 'high' ? '🔴' : severity === 'medium' ? '🟡' : '🟢';
  
  console.log(`${icon} ${type.toUpperCase()} (${items.length} drivers)`);
  console.log('   Severity:', severity);
  console.log('   Examples:', items.slice(0, 5).map(i => i.driver).join(', '));
  console.log('');
});

// Recommendations
console.log('='.repeat(60));
console.log('RECOMMENDATIONS');
console.log('='.repeat(60) + '\n');

console.log('1. ✅ Always wrap Zigbee commands in try/catch:');
console.log('   try {');
console.log('     await this.zclNode.endpoints[1].clusters.onOff.setOn();');
console.log('   } catch (err) {');
console.log('     this.error("Failed to turn on:", err);');
console.log('     throw new Error(this.homey.__("errors.command_failed"));');
console.log('   }\n');

console.log('2. ✅ Never use empty .catch():');
console.log('   // ❌ BAD');
console.log('   promise.catch();');
console.log('   // ✅ GOOD');
console.log('   promise.catch(err => this.error("Error:", err));\n');

console.log('3. ✅ Always log errors with this.error():');
console.log('   catch (err) {');
console.log('     this.error("Command failed:", err);');
console.log('     throw err;');
console.log('   }\n');

if (issues.length === 0) {
  console.log('\n✅ Perfect! All drivers have good error handling.\n');
  process.exit(0);
} else {
  console.log(`\n⚠️  Found ${issues.length} potential issues to review.\n`);
  
  // Save detailed report
  const reportPath = path.join(__dirname, '../../docs/audit/error-handling-report.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(issues, null, 2));
  console.log(`📄 Detailed report saved to: docs/audit/error-handling-report.json\n`);
  
  process.exit(0);
}
