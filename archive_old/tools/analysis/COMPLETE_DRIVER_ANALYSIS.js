#!/usr/bin/env node
/**
 * COMPLETE DRIVER ANALYSIS - Analyse approfondie de tous les drivers
 * - Identifie les drivers sans flow cards
 * - Analyse les capabilities pour générer flow cards appropriées
 * - Détecte les problèmes potentiels
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..', '..');
const driversDir = path.join(rootDir, 'drivers');

console.log('🔍 ANALYSE COMPLÈTE DES DRIVERS');
console.log('='.repeat(80));

const results = {
  totalDrivers: 0,
  driversWithoutFlowCards: [],
  capabilitiesFound: {},
  recommendations: [],
  errors: []
};

// Lire tous les drivers
const drivers = fs.readdirSync(driversDir).filter(d => {
  return fs.statSync(path.join(driversDir, d)).isDirectory();
});

results.totalDrivers = drivers.length;

drivers.forEach(driverName => {
  const driverPath = path.join(driversDir, driverName);
  const composeFile = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(composeFile)) {
    results.errors.push(`${driverName}: Pas de driver.compose.json`);
    return;
  }
  
  try {
    const driverData = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
    const capabilities = driverData.capabilities || [];
    
    // Analyser les capabilities
    capabilities.forEach(cap => {
      const capName = typeof cap === 'string' ? cap : cap.split('.')[0];
      results.capabilitiesFound[capName] = (results.capabilitiesFound[capName] || 0) + 1;
    });
    
    // Identifier les drivers qui bénéficieraient de flow cards
    const needsFlowCards = capabilities.some(cap => {
      const c = typeof cap === 'string' ? cap : cap.split('.')[0];
      return ['alarm_motion', 'alarm_contact', 'alarm_smoke', 'alarm_co', 
              'alarm_water', 'measure_temperature', 'measure_humidity',
              'onoff', 'dim', 'measure_power'].includes(c);
    });
    
    if (needsFlowCards) {
      results.driversWithoutFlowCards.push({
        name: driverName,
        class: driverData.class,
        capabilities: capabilities,
        suggestedFlowCards: generateFlowCardSuggestions(driverName, capabilities, driverData.class)
      });
    }
    
  } catch (err) {
    results.errors.push(`${driverName}: ${err.message}`);
  }
});

function generateFlowCardSuggestions(driverName, capabilities, driverClass) {
  const suggestions = {
    triggers: [],
    conditions: [],
    actions: []
  };
  
  capabilities.forEach(cap => {
    const capName = typeof cap === 'string' ? cap : cap.split('.')[0];
    
    // Triggers
    if (capName.startsWith('alarm_')) {
      suggestions.triggers.push({
        id: `${driverName}_${capName}_true`,
        title: `Alarm activated (${driverName})`,
        tokens: [{ name: 'device', type: 'string', title: 'Device name' }]
      });
    }
    
    if (capName === 'measure_temperature' || capName === 'measure_humidity') {
      suggestions.triggers.push({
        id: `${driverName}_${capName}_changed`,
        title: `${capName} changed (${driverName})`,
        tokens: [{ name: 'value', type: 'number', title: 'Value' }]
      });
    }
    
    // Conditions
    if (capName === 'onoff') {
      suggestions.conditions.push({
        id: `${driverName}_is_on`,
        title: `Device is turned on (${driverName})`
      });
    }
    
    if (capName.startsWith('alarm_')) {
      suggestions.conditions.push({
        id: `${driverName}_${capName}_is_active`,
        title: `${capName} is active (${driverName})`
      });
    }
    
    // Actions
    if (capName === 'onoff') {
      suggestions.actions.push({
        id: `${driverName}_turn_on`,
        title: `Turn on (${driverName})`
      });
      suggestions.actions.push({
        id: `${driverName}_turn_off`,
        title: `Turn off (${driverName})`
      });
      suggestions.actions.push({
        id: `${driverName}_toggle`,
        title: `Toggle (${driverName})`
      });
    }
    
    if (capName === 'dim') {
      suggestions.actions.push({
        id: `${driverName}_set_dim`,
        title: `Set brightness (${driverName})`,
        args: [{ name: 'brightness', type: 'range', min: 0, max: 1, step: 0.01 }]
      });
    }
  });
  
  return suggestions;
}

// Générer le rapport
console.log(`\n📊 STATISTIQUES:`);
console.log(`   Total drivers: ${results.totalDrivers}`);
console.log(`   Drivers pouvant bénéficier de flow cards: ${results.driversWithoutFlowCards.length}`);
console.log(`   Erreurs détectées: ${results.errors.length}\n`);

console.log(`\n🎯 TOP 10 CAPABILITIES:`);
Object.entries(results.capabilitiesFound)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .forEach(([cap, count]) => {
    console.log(`   ${cap}: ${count} drivers`);
  });

console.log(`\n⚠️  ERREURS:`);
results.errors.slice(0, 10).forEach(err => console.log(`   ${err}`));

console.log(`\n💡 DRIVERS PRIORITAIRES POUR FLOW CARDS:`);
results.driversWithoutFlowCards
  .slice(0, 15)
  .forEach(driver => {
    console.log(`\n   📦 ${driver.name} (${driver.class})`);
    console.log(`      Capabilities: ${driver.capabilities.slice(0, 5).join(', ')}`);
    console.log(`      Suggested Triggers: ${driver.suggestedFlowCards.triggers.length}`);
    console.log(`      Suggested Conditions: ${driver.suggestedFlowCards.conditions.length}`);
    console.log(`      Suggested Actions: ${driver.suggestedFlowCards.actions.length}`);
  });

// Sauvegarder le rapport
const reportPath = path.join(rootDir, 'references', 'reports', 'DRIVER_ANALYSIS_REPORT.json');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

console.log(`\n✅ Rapport sauvegardé: ${reportPath}`);
console.log('='.repeat(80));
