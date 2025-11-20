#!/usr/bin/env node
/**
 * Script d'enrichissement automatique des drivers
 * basé sur l'analyse des PDFs
 */

const fs = require('fs');
const path = require('path');

console.log('🤖 ENRICHISSEMENT AUTOMATIQUE DES DRIVERS DEPUIS PDFs\n');

// Charger l'analyse PDF
const analysisFile = path.join(__dirname, 'pdf_analysis', 'COMPLETE_PDF_ANALYSIS.json');
if (!fs.existsSync(analysisFile)) {
  console.error('❌ Fichier d\'analyse introuvable:', analysisFile);
  console.error('   Exécutez d\'abord: python extract_pdfs.py');
  process.exit(1);
}

const analysis = JSON.parse(fs.readFileSync(analysisFile, 'utf8'));

console.log('📊 Analyse chargée:');
console.log(`   - ${analysis.summary.manufacturerNamesFound} manufacturer IDs`);
console.log(`   - ${analysis.summary.modelIdsFound} model IDs`);
console.log('');

// Mapping manufacturer ID → driver
const manufacturerToDriver = {
  // CRITIQUE - Smart Buttons
  '_TZ3000_5bpeda8u': {
    driver: 'button_wireless_1',
    model: 'TS0041',
    priority: 'CRITIQUE',
    reason: 'User Cam post #527 - Flow cards not triggering'
  },
  '_TZ3000_bgtzm4ny': {
    driver: 'button_wireless_4',
    model: 'TS0044',
    priority: 'HAUTE',
    reason: 'Diagnostic report - TS0044 button'
  },
  '_TZE284_vvmbj46n': {
    driver: 'button_wireless_4',
    model: 'TS0044',
    priority: 'HAUTE',
    reason: 'PDF analysis - TS0044 button'
  },
  '_TZE284_oitavov2': {
    driver: 'button_wireless_3',
    model: 'TS0043',
    priority: 'HAUTE',
    reason: 'PDF analysis - TS0043 button'
  },

  // Sirens/Alarms
  '_TZ3000_0dumfk2z': {
    driver: 'siren_alarm_advanced',
    model: 'TS0215',
    priority: 'MOYENNE',
    reason: 'Forum post - TS0215 smart siren'
  },

  // Switches
  '_TZ3000_l9brjwau': {
    driver: 'switch_basic_2gang',
    model: 'TS0002',
    priority: 'MOYENNE',
    reason: 'User suggestion - TS0002 switch'
  },

  // Climate Sensors
  '_TZ3000_ja5osu5g': {
    driver: 'climate_sensor_temp_humidity_battery',
    model: 'TS0201',
    priority: 'MOYENNE',
    reason: 'Forum post - TS0201 climate sensor'
  },

  // TS0601 Multi-purpose (nécessite analyse datapoints)
  '_TZ3000_bczr4e10': {
    driver: 'climate_monitor_temp_humidity',
    model: 'TS0601',
    priority: 'MOYENNE',
    reason: 'PDF analysis - TS0601 with temp/humidity DPs',
    note: 'Vérifier datapoints pour attribution correcte'
  },
  '_TZE200_rhgsbacq': {
    driver: 'climate_monitor_temp_humidity',
    model: 'TS0601',
    priority: 'MOYENNE',
    reason: 'Diagnostic report - TS0601 climate with DPs 1,2,4',
    note: 'DP 1=temp, 2=humidity, 4=battery'
  },
  '_TZE204_qasjif9e': {
    driver: 'climate_monitor_temp_humidity',
    model: 'TS0601',
    priority: 'MOYENNE',
    reason: 'Forum post - TS0601 climate',
    note: 'Vérifier datapoints pour attribution correcte'
  }
};

// Résultats d'enrichissement
const results = {
  success: [],
  skipped: [],
  errors: [],
  summary: {}
};

// Fonction pour enrichir un driver
function enrichDriver(manufacturerName, config) {
  const driverPath = path.join(__dirname, 'drivers', config.driver);
  const composeFile = path.join(driverPath, 'driver.compose.json');

  console.log(`📦 Traitement: ${manufacturerName}`);
  console.log(`   → Driver: ${config.driver}`);
  console.log(`   → Model: ${config.model}`);
  console.log(`   → Priorité: ${config.priority}`);
  console.log(`   → Raison: ${config.reason}`);

  if (!fs.existsSync(composeFile)) {
    console.log(`   ⚠️  Fichier introuvable: ${composeFile}`);
    results.skipped.push({
      manufacturerName,
      driver: config.driver,
      reason: 'driver.compose.json not found'
    });
    console.log('');
    return;
  }

  try {
    // Lire le fichier
    const content = fs.readFileSync(composeFile, 'utf8');
    const driver = JSON.parse(content);

    // Accéder à zigbee.manufacturerName
    if (!driver.zigbee) {
      console.log(`   ⚠️  Pas de section zigbee dans le driver`);
      results.errors.push({
        manufacturerName,
        driver: config.driver,
        error: 'No zigbee section in driver.compose.json'
      });
      console.log('');
      return;
    }

    if (!driver.zigbee.manufacturerName) {
      driver.zigbee.manufacturerName = [];
    }

    if (driver.zigbee.manufacturerName.includes(manufacturerName)) {
      console.log(`   ✓ Déjà présent - SKIP`);
      results.skipped.push({
        manufacturerName,
        driver: config.driver,
        reason: 'Already exists'
      });
      console.log('');
      return;
    }

    // Ajouter le manufacturer ID
    driver.zigbee.manufacturerName.push(manufacturerName);
    driver.zigbee.manufacturerName.sort();

    // Sauvegarder
    const newContent = JSON.stringify(driver, null, 2) + '\n';
    fs.writeFileSync(composeFile, newContent, 'utf8');

    console.log(`   ✅ AJOUTÉ avec succès!`);
    results.success.push({
      manufacturerName,
      driver: config.driver,
      model: config.model,
      priority: config.priority
    });

  } catch (err) {
    console.log(`   ❌ Erreur: ${err.message}`);
    results.errors.push({
      manufacturerName,
      driver: config.driver,
      error: err.message
    });
  }

  console.log('');
}

// Traiter tous les manufacturer IDs
console.log('🔄 DÉBUT DE L\'ENRICHISSEMENT\n');
console.log('═'.repeat(60));
console.log('');

Object.entries(manufacturerToDriver).forEach(([manufacturerName, config]) => {
  enrichDriver(manufacturerName, config);
});

// Générer le rapport final
console.log('═'.repeat(60));
console.log('\n📊 RAPPORT FINAL D\'ENRICHISSEMENT\n');

console.log(`✅ Succès: ${results.success.length}`);
results.success.forEach(r => {
  console.log(`   - ${r.manufacturerName} → ${r.driver} (${r.priority})`);
});
console.log('');

console.log(`⚠️  Ignorés: ${results.skipped.length}`);
results.skipped.forEach(r => {
  console.log(`   - ${r.manufacturerName} → ${r.driver} (${r.reason})`);
});
console.log('');

console.log(`❌ Erreurs: ${results.errors.length}`);
results.errors.forEach(r => {
  console.log(`   - ${r.manufacturerName} → ${r.driver}: ${r.error}`);
});
console.log('');

// Sauvegarder le rapport
const reportFile = path.join(__dirname, 'pdf_analysis', 'ENRICHMENT_REPORT.json');
fs.writeFileSync(reportFile, JSON.stringify(results, null, 2), 'utf8');
console.log(`📄 Rapport sauvegardé: ${reportFile}`);
console.log('');

// Résumé par priorité
const byPriority = results.success.reduce((acc, r) => {
  acc[r.priority] = (acc[r.priority] || 0) + 1;
  return acc;
}, {});

console.log('📈 RÉSUMÉ PAR PRIORITÉ:');
Object.entries(byPriority).forEach(([priority, count]) => {
  console.log(`   ${priority}: ${count} manufacturer ID(s)`);
});
console.log('');

// Drivers modifiés
const driversModified = [...new Set(results.success.map(r => r.driver))];
console.log(`🔧 DRIVERS MODIFIÉS (${driversModified.length}):`);
driversModified.forEach(driver => {
  const count = results.success.filter(r => r.driver === driver).length;
  console.log(`   - ${driver} (+${count} manufacturer ID${count > 1 ? 's' : ''})`);
});
console.log('');

if (results.success.length > 0) {
  console.log('✅ ENRICHISSEMENT TERMINÉ AVEC SUCCÈS!');
  console.log('');
  console.log('⏭️  PROCHAINES ÉTAPES:');
  console.log('   1. Vérifier les modifications: git diff');
  console.log('   2. Valider: homey app validate --level publish');
  console.log('   3. Tester si possible avec devices réels');
  console.log('   4. Commit: git add . && git commit -m "feat: Add manufacturer IDs from PDF analysis"');
  console.log('   5. Push: git push origin master');
} else if (results.skipped.length > 0 && results.errors.length === 0) {
  console.log('ℹ️  TOUS LES MANUFACTURER IDs DÉJÀ PRÉSENTS');
  console.log('   Aucune modification nécessaire.');
} else {
  console.log('⚠️  ENRICHISSEMENT INCOMPLET');
  console.log('   Vérifier les erreurs ci-dessus.');
}

console.log('');
console.log('✨ FIN DU TRAITEMENT');
