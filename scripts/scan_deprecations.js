#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * SCAN DEPRECATIONS - Audit complet SDK3 + Flow Cards
 * Détecte:
 * - APIs dépréciées (Homey.Manager*, globals, etc.)
 * - Flow cards sans deprecated:true
 * - Flow cards dupliquées
 * - Patterns SDK2 à migrer
 */

console.log('\n🔍 SCAN DEPRECATIONS - Audit complet\n');
console.log('='.repeat(80));

const DEPRECATED_PATTERNS = [
  // SDK2 Global Managers
  { pattern: /Homey\.ManagerDevices/g, severity: 'HIGH', fix: 'this.homey.devices', description: 'Global ManagerDevices deprecated' },
  { pattern: /Homey\.ManagerDrivers/g, severity: 'HIGH', fix: 'this.homey.drivers', description: 'Global ManagerDrivers deprecated' },
  { pattern: /Homey\.ManagerSettings/g, severity: 'HIGH', fix: 'this.homey.settings', description: 'Global ManagerSettings deprecated' },
  { pattern: /Homey\.ManagerFlow/g, severity: 'HIGH', fix: 'this.homey.flow', description: 'Global ManagerFlow deprecated' },
  { pattern: /Homey\.ManagerZigBee/g, severity: 'HIGH', fix: 'this.homey.zigbee', description: 'Global ManagerZigBee deprecated' },
  { pattern: /Homey\.manager\(/g, severity: 'HIGH', fix: 'this.homey.<manager>', description: 'Homey.manager() deprecated' },
  { pattern: /Homey\.apps/g, severity: 'MEDIUM', fix: 'this.homey.apps', description: 'Global Homey.apps deprecated' },
  
  // SDK2 API Methods
  { pattern: /registerAttrReportListener/g, severity: 'CRITICAL', fix: 'endpoint.clusters.<cluster>.on()', description: 'registerAttrReportListener deprecated - use direct cluster listeners' },
  { pattern: /registerCapability\(/g, severity: 'HIGH', fix: 'Direct cluster listeners + configureAttributeReporting', description: 'registerCapability deprecated in SDK3' },
  { pattern: /registerMultipleCapabilityListener/g, severity: 'MEDIUM', fix: 'Individual capability listeners', description: 'registerMultipleCapabilityListener deprecated' },
  
  // Flow Cards inline code (Advanced)
  { pattern: /"inline":\s*true/g, severity: 'MEDIUM', fix: 'Move to driver.js registerRunListener', description: 'Inline flow card code deprecated' },
  
  // Capability changes without await
  { pattern: /setCapabilityValue\([^)]+\)(?!\s*\.catch|;|\))/g, severity: 'LOW', fix: 'await device.setCapabilityValue() with try/catch', description: 'setCapabilityValue should be awaited' },
];

const results = {
  timestamp: new Date().toISOString(),
  summary: {
    driversScanned: 0,
    filesScanned: 0,
    deprecatedAPIs: 0,
    flowCardsFound: 0,
    flowCardsIssues: 0
  },
  drivers: [],
  deprecatedAPIs: [],
  flowCards: []
};

/**
 * Scan directory recursively
 */
function scanDirectory(dir, fileCallback) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Skip node_modules, .git, backups
      if (item === 'node_modules' || item === '.git' || item.includes('backup')) {
        continue;
      }
      scanDirectory(fullPath, fileCallback);
    } else if (stat.isFile()) {
      fileCallback(fullPath);
    }
  }
}

/**
 * Scan file for deprecated patterns
 */
function scanFileForDeprecations(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  
  for (const { pattern, severity, fix, description } of DEPRECATED_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      const lines = content.split('\n');
      const occurrences = [];
      
      lines.forEach((line, index) => {
        if (pattern.test(line)) {
          occurrences.push({
            line: index + 1,
            code: line.trim().substring(0, 100)
          });
        }
      });
      
      issues.push({
        file: filePath,
        pattern: pattern.source,
        severity,
        fix,
        description,
        count: matches.length,
        occurrences
      });
      
      results.summary.deprecatedAPIs += matches.length;
      results.deprecatedAPIs.push(...occurrences.map(occ => ({
        file: filePath,
        line: occ.line,
        code: occ.code,
        severity,
        fix,
        description
      })));
    }
  }
  
  return issues;
}

/**
 * Scan flow cards in driver.compose.json
 */
function scanFlowCards(manifestPath, driverName) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const flowCards = {
      actions: [],
      triggers: [],
      conditions: []
    };
    
    // Scan actions
    if (manifest.flow && manifest.flow.actions) {
      manifest.flow.actions.forEach(action => {
        const issues = [];
        
        // Check for deprecated flag
        if (!action.deprecated && action.id.includes('old_') || action.id.includes('legacy_')) {
          issues.push('Suspected legacy card without deprecated:true');
        }
        
        // Check for duplicate IDs
        const duplicates = manifest.flow.actions.filter(a => a.id === action.id);
        if (duplicates.length > 1) {
          issues.push('Duplicate action ID');
        }
        
        // Check arguments
        if (action.args) {
          action.args.forEach(arg => {
            if (arg.type === 'number' && (!arg.min || !arg.max)) {
              issues.push(`Argument ${arg.name}: missing min/max`);
            }
          });
        }
        
        flowCards.actions.push({
          id: action.id,
          title: action.title,
          deprecated: action.deprecated || false,
          args: action.args ? action.args.length : 0,
          issues
        });
        
        results.summary.flowCardsFound++;
        if (issues.length > 0) {
          results.summary.flowCardsIssues++;
        }
      });
    }
    
    // Scan triggers
    if (manifest.flow && manifest.flow.triggers) {
      manifest.flow.triggers.forEach(trigger => {
        const issues = [];
        
        if (!trigger.deprecated && trigger.id.includes('old_') || trigger.id.includes('legacy_')) {
          issues.push('Suspected legacy card without deprecated:true');
        }
        
        // Check tokens
        if (!trigger.tokens && trigger.id.includes('changed')) {
          issues.push('Trigger missing tokens (value, previous, etc.)');
        }
        
        flowCards.triggers.push({
          id: trigger.id,
          title: trigger.title,
          deprecated: trigger.deprecated || false,
          tokens: trigger.tokens ? trigger.tokens.length : 0,
          issues
        });
        
        results.summary.flowCardsFound++;
        if (issues.length > 0) {
          results.summary.flowCardsIssues++;
        }
      });
    }
    
    // Scan conditions
    if (manifest.flow && manifest.flow.conditions) {
      manifest.flow.conditions.forEach(condition => {
        const issues = [];
        
        if (!condition.deprecated && condition.id.includes('old_') || condition.id.includes('legacy_')) {
          issues.push('Suspected legacy card without deprecated:true');
        }
        
        flowCards.conditions.push({
          id: condition.id,
          title: condition.title,
          deprecated: condition.deprecated || false,
          issues
        });
        
        results.summary.flowCardsFound++;
        if (issues.length > 0) {
          results.summary.flowCardsIssues++;
        }
      });
    }
    
    if (flowCards.actions.length > 0 || flowCards.triggers.length > 0 || flowCards.conditions.length > 0) {
      results.flowCards.push({
        driver: driverName,
        file: manifestPath,
        ...flowCards
      });
    }
    
    return flowCards;
  } catch (err) {
    console.error(`Error scanning ${manifestPath}:`, err.message);
    return null;
  }
}

/**
 * Main scan function
 */
function scanProject(rootDir) {
  console.log(`📂 Scanning: ${rootDir}\n`);
  
  const driversDir = path.join(rootDir, 'drivers');
  
  if (!fs.existsSync(driversDir)) {
    console.error('❌ drivers/ directory not found!');
    process.exit(1);
  }
  
  // Scan each driver
  const drivers = fs.readdirSync(driversDir);
  
  for (const driverName of drivers) {
    const driverPath = path.join(driversDir, driverName);
    const stat = fs.statSync(driverPath);
    
    if (!stat.isDirectory()) continue;
    
    console.log(`🔍 Scanning driver: ${driverName}`);
    
    const driverData = {
      name: driverName,
      path: driverPath,
      files: [],
      deprecations: [],
      flowCards: null
    };
    
    // Scan driver files
    scanDirectory(driverPath, (filePath) => {
      // Skip backups
      if (filePath.includes('.backup')) return;
      
      results.summary.filesScanned++;
      driverData.files.push(filePath);
      
      // Scan for deprecated patterns
      if (filePath.endsWith('.js')) {
        const issues = scanFileForDeprecations(filePath);
        if (issues.length > 0) {
          driverData.deprecations.push(...issues);
        }
      }
      
      // Scan flow cards
      if (filePath.endsWith('driver.compose.json') || filePath.endsWith('driver.settings.compose.json')) {
        const flowCards = scanFlowCards(filePath, driverName);
        if (flowCards) {
          driverData.flowCards = flowCards;
        }
      }
    });
    
    results.summary.driversScanned++;
    results.drivers.push(driverData);
  }
  
  // Scan lib/ directory for base classes
  const libDir = path.join(rootDir, 'lib');
  if (fs.existsSync(libDir)) {
    console.log(`\n🔍 Scanning lib/ directory`);
    
    scanDirectory(libDir, (filePath) => {
      if (filePath.includes('.backup')) return;
      if (filePath.endsWith('.js')) {
        results.summary.filesScanned++;
        const issues = scanFileForDeprecations(filePath);
        if (issues.length > 0) {
          results.deprecatedAPIs.push(...issues.flatMap(i => 
            i.occurrences.map(occ => ({
              file: filePath,
              line: occ.line,
              code: occ.code,
              severity: i.severity,
              fix: i.fix,
              description: i.description
            }))
          ));
        }
      }
    });
  }
}

/**
 * Generate report
 */
function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 SCAN COMPLETE\n');
  
  console.log('📈 SUMMARY:');
  console.log(`   Drivers scanned: ${results.summary.driversScanned}`);
  console.log(`   Files scanned: ${results.summary.filesScanned}`);
  console.log(`   Deprecated API occurrences: ${results.summary.deprecatedAPIs}`);
  console.log(`   Flow cards found: ${results.summary.flowCardsFound}`);
  console.log(`   Flow cards with issues: ${results.summary.flowCardsIssues}`);
  
  console.log('\n🚨 DEPRECATED APIs BY SEVERITY:');
  const bySeverity = {
    CRITICAL: results.deprecatedAPIs.filter(a => a.severity === 'CRITICAL').length,
    HIGH: results.deprecatedAPIs.filter(a => a.severity === 'HIGH').length,
    MEDIUM: results.deprecatedAPIs.filter(a => a.severity === 'MEDIUM').length,
    LOW: results.deprecatedAPIs.filter(a => a.severity === 'LOW').length
  };
  
  console.log(`   CRITICAL: ${bySeverity.CRITICAL}`);
  console.log(`   HIGH: ${bySeverity.HIGH}`);
  console.log(`   MEDIUM: ${bySeverity.MEDIUM}`);
  console.log(`   LOW: ${bySeverity.LOW}`);
  
  // Top 5 deprecated APIs
  console.log('\n🔝 TOP DEPRECATED APIs:');
  const apiCounts = {};
  results.deprecatedAPIs.forEach(api => {
    apiCounts[api.description] = (apiCounts[api.description] || 0) + 1;
  });
  
  Object.entries(apiCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([desc, count]) => {
      console.log(`   ${count}× ${desc}`);
    });
  
  // Flow cards issues
  if (results.summary.flowCardsIssues > 0) {
    console.log('\n⚠️  FLOW CARDS WITH ISSUES:');
    results.flowCards.forEach(fc => {
      const allCards = [...fc.actions, ...fc.triggers, ...fc.conditions];
      const withIssues = allCards.filter(c => c.issues && c.issues.length > 0);
      
      if (withIssues.length > 0) {
        console.log(`   Driver: ${fc.driver}`);
        withIssues.forEach(card => {
          console.log(`     - ${card.id}: ${card.issues.join(', ')}`);
        });
      }
    });
  }
  
  console.log('\n' + '='.repeat(80));
}

/**
 * Save report to JSON
 */
function saveReport(outputPath) {
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\n💾 Report saved to: ${outputPath}`);
  
  // Also save a summary markdown
  const summaryMd = `# Deprecation Scan Report

**Date**: ${results.timestamp}

## Summary

- **Drivers Scanned**: ${results.summary.driversScanned}
- **Files Scanned**: ${results.summary.filesScanned}
- **Deprecated API Occurrences**: ${results.summary.deprecatedAPIs}
- **Flow Cards Found**: ${results.summary.flowCardsFound}
- **Flow Cards with Issues**: ${results.summary.flowCardsIssues}

## Deprecated APIs by Severity

- **CRITICAL**: ${results.deprecatedAPIs.filter(a => a.severity === 'CRITICAL').length}
- **HIGH**: ${results.deprecatedAPIs.filter(a => a.severity === 'HIGH').length}
- **MEDIUM**: ${results.deprecatedAPIs.filter(a => a.severity === 'MEDIUM').length}
- **LOW**: ${results.deprecatedAPIs.filter(a => a.severity === 'LOW').length}

## Action Required

1. **Fix CRITICAL issues first** (registerAttrReportListener, etc.)
2. **Migrate HIGH severity APIs** (Homey.Manager* to this.homey.*)
3. **Review flow cards** with missing deprecated:true flags
4. **Add await/try-catch** for capability changes

## Full Report

See \`deprecation_report.json\` for complete details with line numbers and suggested fixes.
`;
  
  const summaryPath = outputPath.replace('.json', '_summary.md');
  fs.writeFileSync(summaryPath, summaryMd, 'utf8');
  console.log(`📄 Summary saved to: ${summaryPath}`);
}

/**
 * CLI Entry Point
 */
const args = process.argv.slice(2);
const rootDir = args[0] || process.cwd();
const outputPath = args[1] || path.join(rootDir, 'deprecation_report.json');

console.log('⚡ Starting deprecation scan...\n');
console.log(`Root directory: ${rootDir}`);
console.log(`Output: ${outputPath}\n`);

try {
  scanProject(rootDir);
  generateReport();
  saveReport(outputPath);
  
  console.log('\n✅ Scan complete!\n');
  
  if (results.summary.deprecatedAPIs > 0) {
    console.log('⚠️  Action required: Review deprecation_report.json for details\n');
    process.exit(1); // Exit with error if deprecations found
  } else {
    console.log('🎉 No deprecated APIs found!\n');
    process.exit(0);
  }
  
} catch (err) {
  console.error('\n❌ Scan failed:', err.message);
  console.error(err.stack);
  process.exit(1);
}
