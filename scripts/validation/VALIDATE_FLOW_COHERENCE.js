#!/usr/bin/env node
'use strict';

const fs = require('fs').promises;
const path = require('path');

/**
 * VALIDATE FLOW COHERENCE
 * Vérifie que chaque flow correspond aux capabilities réelles des drivers
 */

async function analyzeAllDrivers() {
  const driversDir = path.join(__dirname, '../..', 'drivers');
  const folders = await fs.readdir(driversDir);
  
  const driverCapabilities = new Map();
  
  for (const folder of folders) {
    try {
      const driverPath = path.join(driversDir, folder);
      const stats = await fs.stat(driverPath);
      if (!stats.isDirectory()) continue;
      
      const composePath = path.join(driverPath, 'driver.compose.json');
      const composeData = await fs.readFile(composePath, 'utf8');
      const compose = JSON.parse(composeData);
      
      driverCapabilities.set(folder, {
        name: compose.name || {},
        class: compose.class,
        capabilities: compose.capabilities || [],
        energy: compose.energy || null
      });
    } catch (err) {
      // Skip if can't read
    }
  }
  
  return driverCapabilities;
}

function analyzeFlowCoherence(flows, driverCapabilities) {
  const issues = [];
  const recommendations = [];
  
  // Group drivers by capabilities
  const capabilityToDrivers = new Map();
  
  driverCapabilities.forEach((data, driverName) => {
    data.capabilities.forEach(cap => {
      if (!capabilityToDrivers.has(cap)) {
        capabilityToDrivers.set(cap, []);
      }
      capabilityToDrivers.get(cap).push(driverName);
    });
  });
  
  // Check each flow's relevance
  
  // TRIGGERS
  flows.triggers.forEach(trigger => {
    const id = trigger.id;
    
    // Check if trigger makes sense for capabilities
    if (id === 'motion_detected' || id === 'motion_cleared') {
      const relevantDrivers = capabilityToDrivers.get('alarm_motion') || [];
      if (relevantDrivers.length === 0) {
        issues.push({
          flow: id,
          type: 'trigger',
          issue: 'No drivers with alarm_motion capability',
          severity: 'high'
        });
      }
    }
    
    if (id === 'temperature_changed') {
      const relevantDrivers = capabilityToDrivers.get('measure_temperature') || [];
      if (relevantDrivers.length === 0) {
        issues.push({
          flow: id,
          type: 'trigger',
          issue: 'No drivers with measure_temperature capability',
          severity: 'high'
        });
      }
    }
    
    if (id === 'turned_on' || id === 'turned_off') {
      const relevantDrivers = capabilityToDrivers.get('onoff') || [];
      if (relevantDrivers.length === 0) {
        issues.push({
          flow: id,
          type: 'trigger',
          issue: 'No drivers with onoff capability',
          severity: 'high'
        });
      }
    }
    
    // Check for missing important triggers
    if (id === 'smoke_detected') {
      const smokeDrivers = capabilityToDrivers.get('alarm_smoke') || [];
      if (smokeDrivers.length > 0 && !trigger.tokens) {
        recommendations.push({
          flow: id,
          recommendation: 'Add tokens: location, severity, timestamp for emergency context'
        });
      }
    }
  });
  
  // CONDITIONS
  flows.conditions.forEach(condition => {
    const id = condition.id;
    
    // Check temperature_above needs proper args
    if (id === 'temperature_above') {
      if (!condition.args || !condition.args.some(a => a.name === 'threshold')) {
        issues.push({
          flow: id,
          type: 'condition',
          issue: 'Missing threshold argument',
          severity: 'high'
        });
      }
    }
    
    // Check for capability-specific conditions
    if (id === 'is_motion_detected') {
      const relevantDrivers = capabilityToDrivers.get('alarm_motion') || [];
      if (relevantDrivers.length === 0) {
        issues.push({
          flow: id,
          type: 'condition',
          issue: 'No drivers with alarm_motion capability',
          severity: 'medium'
        });
      }
    }
  });
  
  // ACTIONS
  flows.actions.forEach(action => {
    const id = action.id;
    
    // Check set_brightness needs dim capability
    if (id === 'set_brightness') {
      const dimDrivers = capabilityToDrivers.get('dim') || [];
      if (dimDrivers.length === 0) {
        issues.push({
          flow: id,
          type: 'action',
          issue: 'No drivers with dim capability',
          severity: 'high'
        });
      }
      
      // Should have brightness arg
      if (!action.args || !action.args.some(a => a.name === 'brightness')) {
        issues.push({
          flow: id,
          type: 'action',
          issue: 'Missing brightness argument',
          severity: 'high'
        });
      }
    }
    
    // Check lock/unlock needs locked capability
    if (id === 'lock' || id === 'unlock') {
      const lockDrivers = capabilityToDrivers.get('locked') || [];
      if (lockDrivers.length === 0) {
        issues.push({
          flow: id,
          type: 'action',
          issue: 'No drivers with locked capability',
          severity: 'medium'
        });
      }
    }
  });
  
  return { issues, recommendations, capabilityToDrivers };
}

function suggestMissingFlows(capabilityToDrivers) {
  const suggestions = [];
  
  // Check for capabilities that should have flows but don't
  const importantCapabilities = {
    'alarm_tamper': {
      trigger: 'tamper_detected',
      description: 'Tamper alarm triggered - security critical'
    },
    'alarm_vibration': {
      trigger: 'vibration_detected',
      description: 'Vibration detected - useful for intrusion detection'
    },
    'measure_voltage': {
      trigger: 'voltage_changed',
      condition: 'voltage_above',
      description: 'Voltage monitoring for power quality'
    },
    'windowcoverings_set': {
      action: 'set_curtain_position',
      description: 'Set curtain to specific position (0-100%)'
    },
    'target_temperature': {
      action: 'set_target_temperature',
      description: 'Set thermostat target temperature'
    }
  };
  
  Object.entries(importantCapabilities).forEach(([cap, flowData]) => {
    const drivers = capabilityToDrivers.get(cap) || [];
    if (drivers.length > 0) {
      suggestions.push({
        capability: cap,
        drivers_count: drivers.length,
        suggested_flow: flowData,
        priority: drivers.length > 10 ? 'high' : 'medium'
      });
    }
  });
  
  return suggestions;
}

function checkFilterCoherence(flows, capabilityToDrivers) {
  const filterIssues = [];
  
  [...flows.triggers, ...flows.conditions, ...flows.actions].forEach(flow => {
    if (flow.args) {
      const deviceArg = flow.args.find(a => a.type === 'device');
      if (deviceArg && deviceArg.filter) {
        const filter = deviceArg.filter;
        
        // Check if filter is too broad or too specific
        if (filter === 'driver_uri=homey:app:com.dlnraja.tuya.zigbee') {
          // Too broad - should filter by capability
          filterIssues.push({
            flow: flow.id,
            issue: 'Filter too broad - should filter by specific capability',
            suggestion: `Add capability filter like: capabilities=alarm_motion`
          });
        }
      }
    }
  });
  
  return filterIssues;
}

async function main() {
  console.log('🔍 VALIDATING FLOW COHERENCE\n');
  
  // Load app.json
  const appJsonPath = path.join(__dirname, '../..', 'app.json');
  const appJsonData = await fs.readFile(appJsonPath, 'utf8');
  const appJson = JSON.parse(appJsonData);
  
  const flows = appJson.flow || { triggers: [], conditions: [], actions: [] };
  
  console.log('📊 Current Flow Cards:');
  console.log(`  Triggers: ${flows.triggers.length}`);
  console.log(`  Conditions: ${flows.conditions.length}`);
  console.log(`  Actions: ${flows.actions.length}\n`);
  
  // Analyze all drivers
  console.log('📦 Analyzing all drivers...');
  const driverCapabilities = await analyzeAllDrivers();
  console.log(`  Found ${driverCapabilities.size} drivers\n`);
  
  // Check coherence
  console.log('🔍 Checking flow coherence...\n');
  const { issues, recommendations, capabilityToDrivers } = analyzeFlowCoherence(flows, driverCapabilities);
  
  // Display issues
  if (issues.length > 0) {
    console.log('❌ ISSUES FOUND:\n');
    issues.forEach(issue => {
      console.log(`  [${issue.severity.toUpperCase()}] ${issue.flow} (${issue.type})`);
      console.log(`    ${issue.issue}\n`);
    });
  } else {
    console.log('✅ No critical issues found\n');
  }
  
  // Display recommendations
  if (recommendations.length > 0) {
    console.log('💡 RECOMMENDATIONS:\n');
    recommendations.forEach(rec => {
      console.log(`  ${rec.flow}:`);
      console.log(`    ${rec.recommendation}\n`);
    });
  }
  
  // Check filter coherence
  const filterIssues = checkFilterCoherence(flows, capabilityToDrivers);
  if (filterIssues.length > 0) {
    console.log('⚠️  FILTER ISSUES:\n');
    filterIssues.forEach(issue => {
      console.log(`  ${issue.flow}:`);
      console.log(`    ${issue.issue}`);
      console.log(`    💡 ${issue.suggestion}\n`);
    });
  }
  
  // Suggest missing flows
  console.log('🎯 MISSING FLOWS ANALYSIS:\n');
  const suggestions = suggestMissingFlows(capabilityToDrivers);
  
  if (suggestions.length > 0) {
    console.log(`Found ${suggestions.length} capabilities with missing flows:\n`);
    suggestions.forEach(sug => {
      console.log(`  ${sug.capability} (${sug.drivers_count} drivers) [${sug.priority}]`);
      console.log(`    ${sug.suggested_flow.description}`);
      if (sug.suggested_flow.trigger) console.log(`    → Trigger: ${sug.suggested_flow.trigger}`);
      if (sug.suggested_flow.condition) console.log(`    → Condition: ${sug.suggested_flow.condition}`);
      if (sug.suggested_flow.action) console.log(`    → Action: ${sug.suggested_flow.action}`);
      console.log('');
    });
  }
  
  // Capability coverage stats
  console.log('📊 CAPABILITY COVERAGE STATS:\n');
  
  const capabilitiesWithFlows = new Set();
  flows.triggers.forEach(t => {
    if (t.id.includes('motion')) capabilitiesWithFlows.add('alarm_motion');
    if (t.id.includes('temperature')) capabilitiesWithFlows.add('measure_temperature');
    if (t.id.includes('humidity')) capabilitiesWithFlows.add('measure_humidity');
    if (t.id.includes('contact')) capabilitiesWithFlows.add('alarm_contact');
    if (t.id.includes('smoke')) capabilitiesWithFlows.add('alarm_smoke');
    if (t.id.includes('turned')) capabilitiesWithFlows.add('onoff');
    if (t.id.includes('brightness')) capabilitiesWithFlows.add('dim');
    if (t.id.includes('lock')) capabilitiesWithFlows.add('locked');
  });
  
  const totalCapabilities = capabilityToDrivers.size;
  const coveredCapabilities = capabilitiesWithFlows.size;
  const coveragePercent = ((coveredCapabilities / totalCapabilities) * 100).toFixed(1);
  
  console.log(`  Total unique capabilities: ${totalCapabilities}`);
  console.log(`  Capabilities with flows: ${coveredCapabilities}`);
  console.log(`  Coverage: ${coveragePercent}%\n`);
  
  // Top 10 most used capabilities
  console.log('🏆 TOP 10 MOST USED CAPABILITIES:\n');
  const capabilityCounts = Array.from(capabilityToDrivers.entries())
    .map(([cap, drivers]) => ({ capability: cap, count: drivers.length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  capabilityCounts.forEach((item, i) => {
    const hasFlow = capabilitiesWithFlows.has(item.capability);
    console.log(`  ${i + 1}. ${item.capability} - ${item.count} drivers ${hasFlow ? '✅' : '❌'}`);
  });
  
  // Save detailed report
  const report = {
    summary: {
      total_flows: flows.triggers.length + flows.conditions.length + flows.actions.length,
      total_drivers: driverCapabilities.size,
      total_capabilities: totalCapabilities,
      coverage_percent: parseFloat(coveragePercent)
    },
    issues: issues,
    recommendations: recommendations,
    filter_issues: filterIssues,
    missing_flows: suggestions,
    top_capabilities: capabilityCounts
  };
  
  const reportPath = path.join(__dirname, '../../reports/FLOW_COHERENCE_VALIDATION.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Full report: ${reportPath}`);
}

main().catch(console.error);
