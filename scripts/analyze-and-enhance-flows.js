#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * ANALYZE AND ENHANCE FLOW CARDS
 * Analyse complète des flows existants et détection de gaps
 */

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');
const FLOW_BASE = path.join(__dirname, '..', '.homeycompose', 'flow');

console.log('🔍 ANALYZING FLOW CARDS AND DETECTING GAPS\n');
console.log('═'.repeat(80));

// 1. Analyser tous les drivers
const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => 
  fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory() && !d.startsWith('.')
);

console.log(`\n📦 DRIVERS: ${drivers.length} total\n`);

// 2. Analyser les flow cards existants
const flowTypes = ['actions', 'triggers', 'conditions'];
const flowStats = {};

flowTypes.forEach(type => {
  const flowDir = path.join(FLOW_BASE, type);
  if (fs.existsSync(flowDir)) {
    const files = fs.readdirSync(flowDir).filter(f => f.endsWith('.json'));
    flowStats[type] = files.length;
    console.log(`📋 ${type.toUpperCase()}: ${files.length} flow cards`);
  }
});

console.log('\n' + '═'.repeat(80));

// 3. Détecter les patterns manquants
console.log('\n🔍 DETECTING MISSING PATTERNS\n');

const gaps = {
  missingTriggers: [],
  missingActions: [],
  missingConditions: [],
  recommendations: []
};

// Patterns communs qui devraient exister
const commonPatterns = {
  // Pour devices avec onoff
  onoff: {
    triggers: ['turned_on', 'turned_off', 'onoff_changed'],
    conditions: ['is_on', 'is_off'],
    actions: ['turn_on', 'turn_off', 'toggle']
  },
  // Pour devices avec dim
  dim: {
    triggers: ['dim_changed', 'brightness_above', 'brightness_below'],
    conditions: ['brightness_above', 'brightness_below'],
    actions: ['set_brightness', 'increase_brightness', 'decrease_brightness']
  },
  // Pour sensors avec measure_temperature
  temperature: {
    triggers: ['temperature_changed', 'temperature_above', 'temperature_below'],
    conditions: ['temperature_above', 'temperature_below'],
    actions: []
  },
  // Pour sensors avec measure_humidity
  humidity: {
    triggers: ['humidity_changed', 'humidity_above', 'humidity_below'],
    conditions: ['humidity_above', 'humidity_below'],
    actions: []
  },
  // Pour devices avec alarm_*
  alarm: {
    triggers: ['alarm_true', 'alarm_false', 'alarm_changed'],
    conditions: ['alarm_is_active'],
    actions: []
  },
  // Pour devices battery
  battery: {
    triggers: ['battery_changed', 'battery_low', 'battery_critical'],
    conditions: ['battery_below', 'battery_above'],
    actions: []
  },
  // Pour switches multi-gang
  multigang: {
    triggers: ['any_channel_changed', 'all_channels_on', 'all_channels_off'],
    conditions: ['any_channel_on', 'all_channels_on'],
    actions: ['turn_all_on', 'turn_all_off', 'toggle_all']
  },
  // Pour buttons
  button: {
    triggers: ['pressed', 'double_pressed', 'long_pressed', 'released'],
    conditions: [],
    actions: []
  },
  // Pour sensors motion
  motion: {
    triggers: ['motion_detected', 'no_motion', 'motion_timeout'],
    conditions: ['motion_active'],
    actions: []
  }
};

// Analyser chaque driver
drivers.forEach(driverName => {
  const driverPath = path.join(DRIVERS_DIR, driverName);
  const composeFile = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(composeFile)) return;
  
  try {
    const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
    const caps = compose.capabilities || [];
    
    // Détecter les capabilities et vérifier les flows correspondants
    if (caps.some(c => c === 'onoff' || c.startsWith('onoff.'))) {
      checkFlowsForDriver(driverName, commonPatterns.onoff, gaps);
    }
    if (caps.includes('dim')) {
      checkFlowsForDriver(driverName, commonPatterns.dim, gaps);
    }
    if (caps.includes('measure_temperature')) {
      checkFlowsForDriver(driverName, commonPatterns.temperature, gaps);
    }
    if (caps.includes('measure_humidity')) {
      checkFlowsForDriver(driverName, commonPatterns.humidity, gaps);
    }
    if (caps.some(c => c.startsWith('alarm_'))) {
      checkFlowsForDriver(driverName, commonPatterns.alarm, gaps);
    }
    if (caps.includes('measure_battery')) {
      checkFlowsForDriver(driverName, commonPatterns.battery, gaps);
    }
    
    // Détection patterns spéciaux
    if (driverName.includes('gang') && !driverName.includes('1gang')) {
      checkFlowsForDriver(driverName, commonPatterns.multigang, gaps);
    }
    if (driverName.includes('button') && !driverName.includes('wall')) {
      checkFlowsForDriver(driverName, commonPatterns.button, gaps);
    }
    if (driverName.includes('motion')) {
      checkFlowsForDriver(driverName, commonPatterns.motion, gaps);
    }
    
  } catch (e) {
    // Skip invalid JSON
  }
});

function checkFlowsForDriver(driverName, patterns, gaps) {
  flowTypes.forEach(flowType => {
    const expectedFlows = patterns[flowType + 's'] || [];
    expectedFlows.forEach(flowName => {
      const flowFile = `${driverName}_${flowName}.json`;
      const flowPath = path.join(FLOW_BASE, flowType, flowFile);
      
      if (!fs.existsSync(flowPath)) {
        gaps[`missing${flowType.charAt(0).toUpperCase() + flowType.slice(1)}`].push({
          driver: driverName,
          flow: flowName,
          type: flowType
        });
      }
    });
  });
}

// 4. Afficher les résultats
console.log('📊 GAPS DETECTED:\n');
console.log(`Missing Triggers:   ${gaps.missingTriggers.length}`);
console.log(`Missing Actions:    ${gaps.missingActions.length}`);
console.log(`Missing Conditions: ${gaps.missingConditions.length}`);

// 5. Recommandations intelligentes
console.log('\n' + '═'.repeat(80));
console.log('\n💡 INTELLIGENT RECOMMENDATIONS\n');

const recommendations = [
  {
    category: 'Advanced Triggers',
    items: [
      'Scene triggers (multi-button combinations)',
      'Time-based triggers (button held for X seconds)',
      'Pattern triggers (specific button sequences)',
      'State change history triggers',
      'Threshold-based triggers with hysteresis'
    ]
  },
  {
    category: 'Smart Actions',
    items: [
      'Gradual dim (fade in/out)',
      'Preset scenes (save/restore device states)',
      'Timed actions (turn off after X minutes)',
      'Conditional actions (if brightness > X then...)',
      'Batch actions (control multiple channels)'
    ]
  },
  {
    category: 'Advanced Conditions',
    items: [
      'Time-based conditions (active for X seconds)',
      'Comparative conditions (brighter than device Y)',
      'Range conditions (temperature between X and Y)',
      'State history conditions (was on in last hour)',
      'Battery health conditions'
    ]
  },
  {
    category: 'Specialized Features',
    items: [
      'Energy monitoring flows (power trends)',
      'Maintenance alerts (device offline, low battery)',
      'Smart scheduling (adaptive based on usage)',
      'Group control (control all switches in room)',
      'Automation chains (when X happens, trigger Y)'
    ]
  }
];

recommendations.forEach(rec => {
  console.log(`\n📌 ${rec.category}:`);
  rec.items.forEach((item, idx) => {
    console.log(`   ${idx + 1}. ${item}`);
  });
});

console.log('\n' + '═'.repeat(80));
console.log('\n✅ ANALYSIS COMPLETE\n');

// Sauvegarder le rapport
const report = {
  timestamp: new Date().toISOString(),
  drivers: drivers.length,
  flowStats,
  gaps: {
    missingTriggers: gaps.missingTriggers.length,
    missingActions: gaps.missingActions.length,
    missingConditions: gaps.missingConditions.length
  },
  recommendations
};

fs.writeFileSync(
  path.join(__dirname, '..', 'FLOW_ANALYSIS_REPORT.json'),
  JSON.stringify(report, null, 2)
);

console.log('📄 Report saved to: FLOW_ANALYSIS_REPORT.json\n');
