#!/usr/bin/env node
/**
 * Correction automatique des accolades de classes
 */

const fs = require('fs');
const path = require('path');

const files = [
  'drivers/thermostat_advanced/device.js',
  'drivers/thermostat_smart/device.js',
  'drivers/thermostat_temperature_control/device.js',
  'drivers/water_valve_controller/device.js'
];

console.log('🔧 CORRECTION DES FERMETURES DE CLASSES\n');

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  console.log(`📝 ${file}`);

  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Pattern: accolade fermante orpheline avant triggerFlowCard
    // Chercher: }\n\n  async triggerFlowCard
    // Remplacer par:   async triggerFlowCard (enlever l'accolade et réduire indentation)

    const orphanPattern = /^}\s*\n+\s*async triggerFlowCard/m;
    if (content.match(orphanPattern)) {
      content = content.replace(orphanPattern, '\n  async triggerFlowCard');
      console.log('   ✅ Accolade orpheline retirée');
    }

    // Vérifier qu'il y a bien une accolade fermante avant module.exports
    const beforeModuleExports = /}\s*\n+module\.exports\s*=/;
    if (!content.match(beforeModuleExports)) {
      // Ajouter accolade avant module.exports
      content = content.replace(/(  }\s*)\n+(module\.exports\s*=)/, '$1\n}\n\n$2');
      console.log('   ✅ Accolade de classe ajoutée');
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('   ✅ Fichier corrigé\n');

  } catch (err) {
    console.log(`   ❌ Erreur: ${err.message}\n`);
  }
});

console.log('✨ TERMINÉ!\n');
