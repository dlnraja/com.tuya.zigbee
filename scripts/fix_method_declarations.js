#!/usr/bin/env node
/**
 * Correction des déclarations de méthodes - indentation à 2 espaces exactement
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION DES DÉCLARATIONS DE MÉTHODES\n');

const fixes = [
  {
    file: 'drivers/contact_sensor_vibration/device.js',
    line: 225,
    search: '    async setupIASZone() {',
    replace: '  async setupIASZone() {'
  },
  {
    file: 'drivers/doorbell_button/device.js',
    line: 368,
    search: '    async setupIASZone() {',
    replace: '  async setupIASZone() {'
  },
  {
    file: 'drivers/thermostat_advanced/device.js',
    line: 188,
    search: '    async triggerFlowCard(cardId, tokens = {}) {',
    replace: '  async triggerFlowCard(cardId, tokens = {}) {'
  },
  {
    file: 'drivers/thermostat_smart/device.js',
    line: 188,
    search: '    async triggerFlowCard(cardId, tokens = {}) {',
    replace: '  async triggerFlowCard(cardId, tokens = {}) {'
  },
  {
    file: 'drivers/thermostat_temperature_control/device.js',
    line: 189,
    search: '    async triggerFlowCard(cardId, tokens = {}) {',
    replace: '  async triggerFlowCard(cardId, tokens = {}) {'
  },
  {
    file: 'drivers/water_valve_controller/device.js',
    line: 189,
    search: '    async triggerFlowCard(cardId, tokens = {}) {',
    replace: '  async triggerFlowCard(cardId, tokens = {}) {'
  }
];

let success = 0;
let errors = 0;

fixes.forEach(fix => {
  const filePath = path.join(__dirname, fix.file);
  console.log(`📝 ${fix.file}:${fix.line}`);

  try {
    let content = fs.readFileSync(filePath, 'utf8');

    if (content.includes(fix.search)) {
      content = content.replace(fix.search, fix.replace);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`   ✅ Corrigé`);
      success++;
    } else {
      console.log(`   ℹ️  Déjà corrigé ou pattern non trouvé`);
    }
  } catch (err) {
    console.log(`   ❌ Erreur: ${err.message}`);
    errors++;
  }
});

console.log(`\n✅ ${success} corrigés, ❌ ${errors} erreurs\n`);

if (success > 0) {
  console.log('⏭️  Vérifier: npm run lint\n');
}
