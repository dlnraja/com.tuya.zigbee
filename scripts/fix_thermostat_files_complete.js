#!/usr/bin/env node
/**
 * Correction complète des fichiers thermostat et water_valve
 * Supprime l'accolade orpheline et les fonctions en dehors de la classe
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION COMPLÈTE DES FICHIERS THERMOSTAT/WATER_VALVE\n');

const files = [
  'drivers/thermostat_advanced/device.js',
  'drivers/thermostat_smart/device.js',
  'drivers/thermostat_temperature_control/device.js',
  'drivers/water_valve_controller/device.js'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  console.log(`📝 ${file}`);

  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Supprimer l'accolade orpheline et le catch orphelin avant FLOW METHODS
    content = content.replace(
      /}\s*catch\s*\(\s*err\s*\)\s*\{\s*this\.error\('Battery change detection error:',\s*err\);\s*}\s*}\s*\/\/ ========================================\s*\/\/ FLOW METHODS/,
      '  }\n\n  // ========================================\n  // FLOW METHODS'
    );

    // 2. Corriger l'indentation de triggerFlowCard (2 espaces au lieu de 0)
    content = content.replace(
      /^async triggerFlowCard\(/m,
      '  async triggerFlowCard('
    );

    content = content.replace(
      /^  try \{$/m,
      '    try {'
    );

    // 3. Supprimer toutes les fonctions orphelines entre triggerFlowCard et module.exports
    // checkAnyAlarm, getContextData, getTimeOfDay, etc.
    const pattern = /}\s*}\s*\n+\/\*\*[\s\S]*?(?=module\.exports)/;
    if (content.match(pattern)) {
      content = content.replace(pattern, '  }\n}\n\n');
      console.log('   ✅ Fonctions orphelines supprimées');
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('   ✅ Fichier corrigé\n');

  } catch (err) {
    console.log(`   ❌ Erreur: ${err.message}\n`);
  }
});

console.log('✨ TERMINÉ!\n');
