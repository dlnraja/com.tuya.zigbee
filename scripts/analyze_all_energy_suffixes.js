#!/usr/bin/env node
'use strict';

/**
 * Comprehensive Driver Analysis - Energy Suffix Elimination
 * Identifies ALL drivers with energy suffixes and groups them for consolidation
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '../drivers');

// Energy suffixes to detect
const ENERGY_SUFFIXES = ['_ac', '_dc', '_battery', '_cr2032', '_cr2450', '_aaa', '_aa', '_usb'];

// Store analysis results
const analysis = {
  driversByType: {},
  totalDrivers: 0,
  driversWithSuffix: 0,
  driversWithoutSuffix: 0,
  consolidationGroups: {}
};

function analyzeDrivers() {
  console.log('🔍 Analyzing ALL drivers for energy suffixes...\n');

  const drivers = fs.readdirSync(driversDir)
    .filter(name => {
      const driverPath = path.join(driversDir, name);
      return fs.statSync(driverPath).isDirectory();
    });

  analysis.totalDrivers = drivers.length;

  for (const driverName of drivers) {
    const driverPath = path.join(driversDir, driverName);
    
    // Check if driver has energy suffix
    let hasSuffix = false;
    let baseName = driverName;
    let suffix = 'none';

    for (const energySuffix of ENERGY_SUFFIXES) {
      if (driverName.endsWith(energySuffix)) {
        hasSuffix = true;
        baseName = driverName.slice(0, -energySuffix.length);
        suffix = energySuffix;
        break;
      }
    }

    // Read driver.compose.json to get device type
    const composeFile = path.join(driverPath, 'driver.compose.json');
    let deviceClass = 'unknown';
    let capabilities = [];
    let manufacturerCount = 0;

    if (fs.existsSync(composeFile)) {
      try {
        const compose = JSON.parse(fs.readFileSync(composeFile, 'utf-8'));
        deviceClass = compose.class || 'unknown';
        capabilities = compose.capabilities || [];
        
        // Count manufacturer IDs
        if (compose.zigbee && compose.zigbee.manufacturerName) {
          manufacturerCount = Array.isArray(compose.zigbee.manufacturerName) 
            ? compose.zigbee.manufacturerName.length 
            : 1;
        }
      } catch (err) {
        console.warn(`⚠️  Could not parse ${composeFile}`);
      }
    }

    // Categorize driver
    if (hasSuffix) {
      analysis.driversWithSuffix++;
      
      // Add to consolidation groups
      if (!analysis.consolidationGroups[baseName]) {
        analysis.consolidationGroups[baseName] = {
          baseName,
          deviceClass,
          variants: [],
          totalManufacturers: 0,
          capabilities: new Set()
        };
      }

      analysis.consolidationGroups[baseName].variants.push({
        driverName,
        suffix,
        manufacturerCount,
        capabilities
      });
      analysis.consolidationGroups[baseName].totalManufacturers += manufacturerCount;
      capabilities.forEach(cap => analysis.consolidationGroups[baseName].capabilities.add(cap));
    } else {
      analysis.driversWithoutSuffix++;
    }

    // Categorize by device class
    if (!analysis.driversByType[deviceClass]) {
      analysis.driversByType[deviceClass] = {
        withSuffix: [],
        withoutSuffix: []
      };
    }

    if (hasSuffix) {
      analysis.driversByType[deviceClass].withSuffix.push({ driverName, baseName, suffix, manufacturerCount });
    } else {
      analysis.driversByType[deviceClass].withoutSuffix.push({ driverName, manufacturerCount });
    }
  }

  return analysis;
}

function printAnalysis() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   COMPREHENSIVE DRIVER ANALYSIS - ENERGY SUFFIX ELIMINATION');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log(`📊 Total Drivers: ${analysis.totalDrivers}`);
  console.log(`   ├─ With energy suffix: ${analysis.driversWithSuffix}`);
  console.log(`   └─ Without suffix: ${analysis.driversWithoutSuffix}\n`);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('   CONSOLIDATION GROUPS (Base Name → Variants)');
  console.log('═══════════════════════════════════════════════════════════\n');

  const groups = Object.values(analysis.consolidationGroups)
    .sort((a, b) => b.variants.length - a.variants.length);

  for (const group of groups) {
    console.log(`\n🎯 ${group.baseName.toUpperCase()}`);
    console.log(`   Class: ${group.deviceClass}`);
    console.log(`   Variants: ${group.variants.length}`);
    console.log(`   Total Manufacturers: ${group.totalManufacturers}`);
    console.log(`   Capabilities: ${Array.from(group.capabilities).join(', ')}`);
    console.log('   ├─ Variants:');
    
    for (const variant of group.variants) {
      console.log(`   │  ├─ ${variant.driverName} (${variant.suffix}) - ${variant.manufacturerCount} manufacturers`);
    }
  }

  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('   DRIVERS BY DEVICE CLASS');
  console.log('═══════════════════════════════════════════════════════════\n');

  for (const [deviceClass, data] of Object.entries(analysis.driversByType)) {
    const total = data.withSuffix.length + data.withoutSuffix.length;
    if (total === 0) continue;

    console.log(`\n📦 ${deviceClass.toUpperCase()} (${total} drivers)`);
    
    if (data.withSuffix.length > 0) {
      console.log(`   ├─ WITH suffix (${data.withSuffix.length}):`);
      for (const driver of data.withSuffix) {
        console.log(`   │  ├─ ${driver.driverName} → ${driver.baseName} (${driver.manufacturerCount} manufacturers)`);
      }
    }
    
    if (data.withoutSuffix.length > 0) {
      console.log(`   └─ WITHOUT suffix (${data.withoutSuffix.length}):`);
      for (const driver of data.withoutSuffix) {
        console.log(`      ├─ ${driver.driverName} (${driver.manufacturerCount} manufacturers)`);
      }
    }
  }

  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('   CONSOLIDATION PRIORITY');
  console.log('═══════════════════════════════════════════════════════════\n');

  const priority = groups.filter(g => g.variants.length > 1);
  
  console.log(`🎯 ${priority.length} consolidation groups identified:\n`);
  
  for (let i = 0; i < priority.length; i++) {
    const group = priority[i];
    console.log(`${i + 1}. ${group.baseName}`);
    console.log(`   ├─ ${group.variants.length} variants → 1 unified driver`);
    console.log(`   ├─ ${group.totalManufacturers} manufacturer IDs`);
    console.log(`   └─ Device class: ${group.deviceClass}\n`);
  }

  console.log('═══════════════════════════════════════════════════════════\n');
}

function saveAnalysisReport() {
  const reportPath = path.join(__dirname, '../CONSOLIDATION_ANALYSIS_FULL.json');
  fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2));
  console.log(`✅ Full analysis saved to: CONSOLIDATION_ANALYSIS_FULL.json\n`);

  // Also create a summary markdown
  const markdownPath = path.join(__dirname, '../CONSOLIDATION_PLAN_FULL.md');
  let markdown = `# 🎯 Complete Driver Consolidation Plan\n\n`;
  markdown += `**Generated:** ${new Date().toISOString()}\n\n`;
  markdown += `## 📊 Overview\n\n`;
  markdown += `- **Total Drivers:** ${analysis.totalDrivers}\n`;
  markdown += `- **With Energy Suffix:** ${analysis.driversWithSuffix}\n`;
  markdown += `- **Without Suffix:** ${analysis.driversWithoutSuffix}\n`;
  markdown += `- **Consolidation Groups:** ${Object.keys(analysis.consolidationGroups).length}\n\n`;

  markdown += `## 🎯 Consolidation Groups\n\n`;
  
  const groups = Object.values(analysis.consolidationGroups)
    .sort((a, b) => b.variants.length - a.variants.length);

  for (const group of groups) {
    markdown += `### ${group.baseName}\n\n`;
    markdown += `- **Device Class:** ${group.deviceClass}\n`;
    markdown += `- **Variants:** ${group.variants.length}\n`;
    markdown += `- **Total Manufacturers:** ${group.totalManufacturers}\n`;
    markdown += `- **Capabilities:** ${Array.from(group.capabilities).join(', ')}\n\n`;
    markdown += `**Variants to merge:**\n\n`;
    
    for (const variant of group.variants) {
      markdown += `- \`${variant.driverName}\` (${variant.suffix}) - ${variant.manufacturerCount} manufacturers\n`;
    }
    markdown += `\n`;
  }

  fs.writeFileSync(markdownPath, markdown);
  console.log(`✅ Consolidation plan saved to: CONSOLIDATION_PLAN_FULL.md\n`);
}

// Run analysis
analyzeDrivers();
printAnalysis();
saveAnalysisReport();
