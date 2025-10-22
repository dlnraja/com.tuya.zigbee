#!/usr/bin/env node
'use strict';

/**
 * DEEP ANALYZE AND ENRICH
 * 
 * Analyse complète et enrichissement profond de tous les drivers
 * avec vérification pas à pas et validation.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const DRIVERS_DIR = path.join(__dirname, '../../drivers');
const REPORTS_DIR = path.join(__dirname, '../../reports');
const LOG_FILE = path.join(REPORTS_DIR, 'DEEP_ANALYSIS_LOG.md');

// Créer le dossier reports s'il n'existe pas
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// Initialiser le fichier de log
let logContent = '# 🧠 DEEP ANALYSIS AND ENRICHMENT LOG\n\n';
logContent += `**Date:** ${new Date().toISOString()}\n`;
logContent += `**App Version:** ${require('../../app.json').version}\n\n`;

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${type.toUpperCase()}] ${message}\n`;
  logContent += logLine;
  console[type === 'error' ? 'error' : 'log'](logLine.trim());
  
  // Sauvegarder le log à chaque entrée
  fs.writeFileSync(LOG_FILE, logContent);
}

// Analyse des drivers
function analyzeDrivers() {
  log('🔍 Démarrage de l\'analyse des drivers...');
  
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => 
    fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory()
  );
  
  log(`📊 ${drivers.length} drivers trouvés`);
  
  const analysis = {
    totalDrivers: drivers.length,
    byType: {},
    byManufacturer: {},
    needsEnrichment: 0,
    fullyEnriched: 0,
    drivers: {}
  };
  
  // Analyser chaque driver
  drivers.forEach(driver => {
    try {
      const driverPath = path.join(DRIVERS_DIR, driver);
      const composePath = path.join(driverPath, 'driver.compose.json');
      
      if (!fs.existsSync(composePath)) {
        log(`⚠️  ${driver}: Fichier driver.compose.json manquant`, 'warn');
        return;
      }
      
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const manufacturerIds = compose.zigbee?.manufacturerName || [];
      const productIds = compose.zigbee?.productId || [];
      
      // Détecter le type de driver
      const driverType = detectDriverType(driver, compose);
      
      // Enregistrer les statistiques
      analysis.drivers[driver] = {
        type: driverType,
        manufacturerCount: manufacturerIds.length,
        productCount: productIds.length,
        needsEnrichment: manufacturerIds.length < 5, // Moins de 5 = besoin d'enrichissement
        path: driverPath
      };
      
      // Mettre à jour les compteurs
      analysis.byType[driverType] = (analysis.byType[driverType] || 0) + 1;
      
      if (manufacturerIds.length < 5) {
        analysis.needsEnrichment++;
      } else {
        analysis.fullyEnriched++;
      }
      
      log(`✅ ${driver}: ${manufacturerIds.length} manufacturers, ${productIds.length} products [${driverType}]`);
      
    } catch (err) {
      log(`❌ Erreur lors de l'analyse de ${driver}: ${err.message}`, 'error');
    }
  });
  
  // Sauvegarder l'analyse complète
  const analysisPath = path.join(REPORTS_DIR, 'DEEP_DRIVER_ANALYSIS.json');
  fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));
  
  log(`\n📊 ANALYSE TERMINÉE: ${analysis.needsEnrichment} drivers à enrichir sur ${analysis.totalDrivers}`);
  
  // Générer un rapport markdown
  generateMarkdownReport(analysis);
  
  return analysis;
}

// Détecter le type de driver
function detectDriverType(driverName, compose) {
  const name = driverName.toLowerCase();
  
  // Détection par nom
  if (name.includes('motion')) return 'motion_sensor';
  if (name.includes('contact')) return 'contact_sensor';
  if (name.includes('temperature') || name.includes('temp') || name.includes('humidity') || name.includes('humidex')) return 'climate_sensor';
  if (name.includes('plug') || name.includes('socket') || name.includes('outlet')) return 'smart_plug';
  if (name.includes('switch')) return 'switch';
  if (name.includes('dimmer')) return 'dimmer';
  if (name.includes('bulb') || name.includes('light')) return 'light';
  if (name.includes('led') || name.includes('strip')) return 'led_strip';
  if (name.includes('button') || name.includes('remote')) return 'remote';
  if (name.includes('water') || name.includes('leak')) return 'water_leak';
  if (name.includes('smoke') || name.includes('fire')) return 'smoke_detector';
  if (name.includes('curtain') || name.includes('blind') || name.includes('shutter')) return 'curtain';
  
  // Détection par clusters Zigbee
  if (compose.zigbee?.clusters?.includes('genOnOff') && compose.zigbee?.clusters?.includes('genLevelCtrl')) {
    return 'dimmer';
  } else if (compose.zigbee?.clusters?.includes('genOnOff')) {
    return 'switch';
  }
  
  return 'other';
}

// Générer un rapport markdown
function generateMarkdownReport(analysis) {
  let report = '# 📊 RAPPORT D\'ANALYSE DES DRIVERS\n\n';
  
  // Résumé
  report += '## 📈 RÉSUMÉ\n\n';
  report += `- **Total des drivers:** ${analysis.totalDrivers}\n`;
  report += `- **À enrichir:** ${analysis.needsEnrichment} (${Math.round((analysis.needsEnrichment / analysis.totalDrivers) * 100)}%)\n`;
  report += `- **Bien configurés:** ${analysis.fullyEnriched} (${Math.round((analysis.fullyEnriched / analysis.totalDrivers) * 100)}%)\n\n`;
  
  // Par type
  report += '## 🔍 RÉPARTITION PAR TYPE\n\n';
  report += '| Type | Nombre | Pourcentage |\n';
  report += '|------|--------|-------------|\n';
  
  Object.entries(analysis.byType).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
    report += `| ${type} | ${count} | ${Math.round((count / analysis.totalDrivers) * 100)}% |\n`;
  });
  
  // Drivers à enrichir
  report += '\n## 🚨 DRIVERS À ENRICHIR\n\n';
  report += '| Driver | Type | Manufacturers | Products |\n';
  report += '|--------|------|---------------|----------|\n';
  
  Object.entries(analysis.drivers)
    .filter(([_, d]) => d.needsEnrichment)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([name, data]) => {
      report += `| ${name} | ${data.type} | ${data.manufacturerCount} | ${data.productCount} |\n`;
    });
  
  // Sauvegarder le rapport
  const reportPath = path.join(REPORTS_DIR, 'DRIVER_ANALYSIS_REPORT.md');
  fs.writeFileSync(reportPath, report);
  
  log(`📝 Rapport généré: ${reportPath}`);
}

// Exécuter l'analyse
log('🚀 DÉMARRAGE DE L\'ANALYSE PROFONDE');
try {
  const analysis = analyzeDrivers();
  log('✅ ANALYSE TERMINÉE AVEC SUCCÈS');
  
  // Afficher un résumé
  console.log('\n' + '='.repeat(80));
  console.log('📊 RÉSUMÉ DE L\'ANALYSE');
  console.log('='.repeat(80));
  console.log(`Total des drivers: ${analysis.totalDrivers}`);
  console.log(`À enrichir: ${analysis.needsEnrichment} (${Math.round((analysis.needsEnrichment / analysis.totalDrivers) * 100)}%)`);
  console.log(`Bien configurés: ${analysis.fullyEnriched} (${Math.round((analysis.fullyEnrichment / analysis.totalDrivers) * 100)}%)`);
  console.log('\nRapports générés:');
  console.log(`- ${path.join(REPORTS_DIR, 'DEEP_DRIVER_ANALYSIS.json')}`);
  console.log(`- ${path.join(REPORTS_DIR, 'DRIVER_ANALYSIS_REPORT.md')}`);
  console.log(`- ${LOG_FILE}`);
  
} catch (err) {
  log(`❌ ERREUR CRITIQUE: ${err.message}`, 'error');
  process.exit(1);
}
