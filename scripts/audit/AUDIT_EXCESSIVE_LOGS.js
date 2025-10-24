#!/usr/bin/env node
'use strict';

/**
 * SDK3 AUDIT: Excessive Logging
 * 
 * Vérifie les logs excessifs qui peuvent causer:
 * - Spam dans les logs Homey
 * - Performance issues
 * - Difficulté de debugging
 * 
 * Recommandations SDK3:
 * - Utiliser debug mode setting
 * - Log seulement les erreurs et events importants
 * - Éviter logs dans listeners fréquents
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 SDK3 AUDIT: Excessive Logging\n');

const driversDir = path.join(__dirname, '../../drivers');
const drivers = fs.readdirSync(driversDir).filter(d => {
  const devicePath = path.join(driversDir, d, 'device.js');
  return fs.existsSync(devicePath);
});

let stats = {
  totalLogs: 0,
  totalErrors: 0,
  driversWithExcessiveLogs: [],
  logsInListeners: [],
  unconditionalLogs: []
};

drivers.forEach(driverName => {
  const devicePath = path.join(driversDir, driverName, 'device.js');
  const content = fs.readFileSync(devicePath, 'utf8');
  const lines = content.split('\n');
  
  // Count total logs
  const logCalls = (content.match(/this\.log\(/g) || []).length;
  const errorCalls = (content.match(/this\.error\(/g) || []).length;
  
  stats.totalLogs += logCalls;
  stats.totalErrors += errorCalls;
  
  // Excessive logs (>30 in single driver)
  if (logCalls > 30) {
    stats.driversWithExcessiveLogs.push({
      driver: driverName,
      logs: logCalls,
      errors: errorCalls
    });
  }
  
  // Find logs in capability listeners
  const listenerMatches = content.matchAll(/registerCapabilityListener\(['"](\w+)['"]/g);
  for (const match of listenerMatches) {
    const capability = match[1];
    const listenerStart = match.index;
    const listenerEnd = findMatchingParen(content, listenerStart);
    const listenerBody = content.substring(listenerStart, listenerEnd);
    
    // Count logs in this listener
    const logsInListener = (listenerBody.match(/this\.log\(/g) || []).length;
    if (logsInListener > 0 && !listenerBody.includes('debug')) {
      stats.logsInListeners.push({
        driver: driverName,
        capability,
        count: logsInListener
      });
    }
  }
  
  // Find unconditional logs (not in if/debug checks)
  lines.forEach((line, idx) => {
    if (line.includes('this.log(') && 
        !line.includes('this.error(') &&
        !line.includes('if') &&
        !line.includes('debug') &&
        !line.trim().startsWith('//')) {
      
      // Check if previous line has condition
      const prevLine = lines[idx - 1] || '';
      if (!prevLine.includes('if') && !prevLine.includes('debug')) {
        stats.unconditionalLogs.push({
          driver: driverName,
          line: idx + 1,
          content: line.trim().substring(0, 80)
        });
      }
    }
  });
});

function findMatchingParen(str, start) {
  let depth = 0;
  let inString = false;
  let stringChar = null;
  
  for (let i = start; i < str.length; i++) {
    const char = str[i];
    
    if ((char === '"' || char === "'") && str[i-1] !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = null;
      }
    }
    
    if (!inString) {
      if (char === '(') depth++;
      if (char === ')') depth--;
      if (depth === 0 && i > start) return i;
    }
  }
  return str.length;
}

// Display results
console.log('='.repeat(60));
console.log('AUDIT RESULTS');
console.log('='.repeat(60) + '\n');

console.log(`📊 Total drivers checked: ${drivers.length}`);
console.log(`📝 Total this.log() calls: ${stats.totalLogs}`);
console.log(`❌ Total this.error() calls: ${stats.totalErrors}`);
console.log(`📊 Average logs per driver: ${(stats.totalLogs / drivers.length).toFixed(1)}\n`);

// Excessive logs
if (stats.driversWithExcessiveLogs.length > 0) {
  console.log(`🔴 EXCESSIVE LOGS: ${stats.driversWithExcessiveLogs.length} drivers with >30 logs\n`);
  stats.driversWithExcessiveLogs.slice(0, 10).forEach(d => {
    console.log(`   ${d.driver}: ${d.logs} logs, ${d.errors} errors`);
  });
  console.log('');
}

// Logs in listeners
if (stats.logsInListeners.length > 0) {
  console.log(`🟡 LOGS IN LISTENERS: ${stats.logsInListeners.length} capability listeners with logs\n`);
  const grouped = {};
  stats.logsInListeners.forEach(item => {
    if (!grouped[item.driver]) grouped[item.driver] = [];
    grouped[item.driver].push(item.capability);
  });
  
  Object.entries(grouped).slice(0, 10).forEach(([driver, caps]) => {
    console.log(`   ${driver}: ${caps.join(', ')}`);
  });
  console.log('');
}

// Unconditional logs
const unconditionalCount = stats.unconditionalLogs.length;
if (unconditionalCount > 0) {
  console.log(`🟢 UNCONDITIONAL LOGS: ${unconditionalCount} logs without debug check\n`);
  console.log(`   (Showing first 5 examples)\n`);
  stats.unconditionalLogs.slice(0, 5).forEach(log => {
    console.log(`   ${log.driver}:${log.line}`);
    console.log(`   ${log.content}...`);
    console.log('');
  });
}

// Recommendations
console.log('='.repeat(60));
console.log('RECOMMENDATIONS');
console.log('='.repeat(60) + '\n');

console.log('1. ✅ Add debug mode setting:');
console.log('   // In device.js');
console.log('   if (this.getSetting("debug_mode")) {');
console.log('     this.log("Debug info:", data);');
console.log('   }\n');

console.log('2. ✅ Remove logs from frequent listeners:');
console.log('   // ❌ BAD - Spams logs');
console.log('   this.registerCapabilityListener("onoff", async (value) => {');
console.log('     this.log("OnOff changed:", value);');
console.log('   });');
console.log('   // ✅ GOOD - Only log errors');
console.log('   this.registerCapabilityListener("onoff", async (value) => {');
console.log('     try {');
console.log('       await this.setOnOff(value);');
console.log('     } catch (err) {');
console.log('       this.error("Failed:", err);');
console.log('     }');
console.log('   });\n');

console.log('3. ✅ Use emojis for clarity:');
console.log('   this.log("🔌 Device paired");');
console.log('   this.log("⚠️ Low battery");');
console.log('   this.error("❌ Connection failed");\n');

// Generate fix script recommendation
console.log('='.repeat(60));
console.log('NEXT STEPS');
console.log('='.repeat(60) + '\n');

if (stats.driversWithExcessiveLogs.length > 10) {
  console.log('⚠️  Many drivers have excessive logging');
  console.log('   Consider running: node scripts/fixes/ADD_DEBUG_MODE_SETTING.js\n');
}

if (stats.logsInListeners.length > 20) {
  console.log('⚠️  Many capability listeners contain logs');
  console.log('   Consider running: node scripts/fixes/REMOVE_LISTENER_LOGS.js\n');
}

// Save detailed report
const reportPath = path.join(__dirname, '../../docs/audit/logging-report.json');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(stats, null, 2));
console.log(`📄 Detailed report saved to: docs/audit/logging-report.json\n`);

console.log(`✅ Audit complete!\n`);
process.exit(0);
