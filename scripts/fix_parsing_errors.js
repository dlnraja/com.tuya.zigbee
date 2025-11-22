#!/usr/bin/env node
/**
 * Script de correction automatique des erreurs de parsing d'indentation
 * Corrige les 6 erreurs "Unexpected token (" en ajustant l'indentation du corps des méthodes
 */

const fs = require('fs');
const path = require('path');

// Fichiers à corriger avec leur ligne d'erreur
const files = [
  { file: 'drivers/contact_sensor_vibration/device.js', line: 225, method: 'setupIASZone' },
  { file: 'drivers/doorbell_button/device.js', line: 368, method: 'setupIASZone' },
  { file: 'drivers/thermostat_advanced/device.js', line: 188, method: 'triggerFlowCard' },
  { file: 'drivers/thermostat_smart/device.js', line: 188, method: 'triggerFlowCard' },
  { file: 'drivers/thermostat_temperature_control/device.js', line: 189, method: 'triggerFlowCard' },
  { file: 'drivers/water_valve_controller/device.js', line: 189, method: 'triggerFlowCard' }
];

console.log('\n🔧 CORRECTION AUTOMATIQUE DES ERREURS D\'INDENTATION\n');

let fixed = 0;
let errors = 0;

files.forEach(({ file, line, method }) => {
  const filePath = path.join(__dirname, file);
  console.log(`Processing: ${file}`);

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // Trouver la ligne de la méthode (ajusté pour 0-indexed)
    const methodLineIndex = line - 1;

    if (methodLineIndex >= lines.length) {
      console.log(`  ⚠️  Line ${line} not found in file`);
      return;
    }

    const methodLine = lines[methodLineIndex];

    // Vérifier que c'est bien une déclaration de méthode async
    if (!methodLine.match(/^\s+async\s+\w+\([^)]*\)\s*\{/)) {
      console.log(`  ⚠️  Line ${line} is not an async method declaration`);
      console.log(`     Found: ${methodLine}`);
      return;
    }

    // Calculer l'indentation de la méthode
    const methodIndent = methodLine.match(/^(\s+)/)[1].length;
    const targetIndent = methodIndent + 4; // Corps de méthode = +4 espaces

    // Corriger les lignes suivantes jusqu'à la fin de la méthode
    let braceDepth = 1; // On commence dans la méthode (après le {)
    let i = methodLineIndex + 1;
    let corrected = 0;

    while (i < lines.length && braceDepth > 0) {
      const currentLine = lines[i];

      // Ligne vide: garder telle quelle
      if (currentLine.trim() === '') {
        i++;
        continue;
      }

      // Compter les accolades
      const openBraces = (currentLine.match(/\{/g) || []).length;
      const closeBraces = (currentLine.match(/\}/g) || []).length;
      braceDepth += openBraces - closeBraces;

      // Si on est sorti de la méthode, arrêter
      if (braceDepth === 0) break;

      // Corriger l'indentation si nécessaire
      const currentIndent = (currentLine.match(/^(\s*)/) || ['', ''])[1].length;
      const trimmed = currentLine.trimStart();

      // Si l'indentation est insuffisante (moins que targetIndent), corriger
      if (currentIndent < targetIndent && currentIndent === methodIndent) {
        // Calculer le niveau relatif basé sur la profondeur des accolades
        const relativeDepth = braceDepth - 1; // -1 car braceDepth=1 = niveau de base du corps
        const correctIndent = targetIndent + (relativeDepth * 2); // +2 espaces par niveau
        lines[i] = ' '.repeat(correctIndent) + trimmed;
        corrected++;
      }

      i++;
    }

    if (corrected > 0) {
      // Écrire le fichier corrigé
      fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
      console.log(`  ✅ Fixed ${corrected} lines`);
      fixed++;
    } else {
      console.log(`  ℹ️  No changes needed`);
    }

  } catch (err) {
    console.log(`  ❌ Error: ${err.message}`);
    errors++;
  }
});

console.log('\n📊 RÉSULTAT:');
console.log(`  ✅ Files fixed: ${fixed}`);
console.log(`  ❌ Errors: ${errors}`);

if (errors === 0) {
  console.log('\n✨ TOUS LES FICHIERS TRAITÉS!\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Des erreurs sont survenues\n');
  process.exit(1);
}
