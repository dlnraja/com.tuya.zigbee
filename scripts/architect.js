#!/usr/bin/env node
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DRIVERS_DIR = path.resolve(__dirname, '../drivers');
const OUTPUT_FILE = path.join(process.cwd(), 'architect-report.json');

// Configuration des exigences SDK3
const SDK3_REQUIREMENTS = {
  requiredCapabilities: [
    'measure_power',
    'measure_voltage',
    'measure_current',
    'onoff',
    'dim',
    'windowcoverings_set',
    'windowcoverings_tilt_set',
    'window_open',
    'alarm_contact',
    'alarm_motion',
    'alarm_tamper',
    'alarm_battery',
    'measure_temperature',
    'measure_humidity',
    'measure_co2',
    'measure_pm25',
    'measure_voc',
    'measure_noise',
    'measure_rain',
    'measure_wind_strength',
    'measure_wind_angle',
    'measure_pressure',
    'measure_ultraviolet',
    'measure_luminance',
    'alarm_water',
    'alarm_smoke',
    'alarm_co',
    'alarm_co2',
    'alarm_pm25',
    'alarm_voc',
    'alarm_tamper',
    'alarm_battery'
  ],
  requiredFlows: {
    conditions: [
      'measure_power',
      'measure_voltage',
      'measure_current',
      'measure_temperature',
      'measure_humidity',
      'measure_co2',
      'measure_pm25',
      'measure_voc',
      'measure_noise',
      'measure_rain',
      'measure_wind_strength',
      'measure_wind_angle',
      'measure_pressure',
      'measure_ultraviolet',
      'measure_luminance',
      'alarm_water',
      'alarm_smoke',
      'alarm_co',
      'alarm_co2',
      'alarm_pm25',
      'alarm_voc',
      'alarm_tamper',
      'alarm_battery',
      'window_open',
      'windowcoverings_state',
      'windowcoverings_tilt_state',
      'onoff',
      'dim',
      'volume_mute',
      'volume_up',
      'volume_down',
      'volume_set',
      'channel_up',
      'channel_down',
      'channel_set',
      'input_source',
      'speaker_playing',
      'speaker_next',
      'speaker_prev',
      'speaker_shuffle',
      'speaker_repeat',
      'speaker_artist',
      'speaker_album',
      'speaker_track',
      'speaker_duration',
      'speaker_position',
      'speaker_album_gfx'
    ],
    actions: [
      'onoff',
      'dim',
      'windowcoverings_set',
      'windowcoverings_tilt_set',
      'volume_mute',
      'volume_up',
      'volume_down',
      'volume_set',
      'channel_up',
      'channel_down',
      'channel_set',
      'input_source',
      'speaker_play',
      'speaker_pause',
      'speaker_stop',
      'speaker_next',
      'speaker_prev',
      'speaker_shuffle',
      'speaker_repeat',
      'speaker_seek',
      'speaker_album_gfx'
    ]
  }
};

async function checkDriver(driverName) {
  const driverDir = path.join(DRIVERS_DIR, driverName);
  const deviceFile = path.join(driverDir, 'device.js');
  const driverFile = path.join(driverDir, 'driver.js');
  const composeFile = path.join(driverDir, 'driver.compose.json');
  
  const result = {
    driver: driverName,
    issues: [],
    warnings: [],
    suggestions: []
  };
  
  // Vérifier l'existence des fichiers requis
  const files = {
    'device.js': await fs.pathExists(deviceFile),
    'driver.js': await fs.pathExists(driverFile),
    'driver.compose.json': await fs.pathExists(composeFile)
  };
  
  // Vérifier les fichiers manquants
  for (const [file, exists] of Object.entries(files)) {
    if (!exists) {
      result.issues.push(`Fichier manquant: ${file}`);
    }
  }
  
  // Si le fichier de composition existe, vérifier sa structure
  if (files['driver.compose.json']) {
    try {
      const compose = await fs.readJson(composeFile);
      
      // Vérifier les champs obligatoires
      const requiredFields = ['id', 'name', 'class', 'compatibility', 'capabilities', 'capabilitiesOptions'];
      for (const field of requiredFields) {
        if (!(field in compose)) {
          result.issues.push(`Champ manquant dans driver.compose.json: ${field}`);
        }
      }
      
      // Vérifier les capacités requises
      if (compose.capabilities) {
        const capabilities = Array.isArray(compose.capabilities) 
          ? compose.capabilities 
          : Object.keys(compose.capabilities || {});
        
        // Vérifier les capacités manquantes
        for (const requiredCap of SDK3_REQUIREMENTS.requiredCapabilities) {
          if (capabilities.includes(requiredCap)) {
            // Vérifier si la capacité est correctement implémentée dans device.js
            const deviceContent = await fs.readFile(deviceFile, 'utf8');
            const capabilityRegex = new RegExp(`registerCapability\\(['"]${requiredCap}['"]`);
            if (!capabilityRegex.test(deviceContent)) {
              result.issues.push(`Capacité non implémentée: ${requiredCap}`);
            }
          }
        }
      }
      
      // Vérifier les icônes
      const iconFiles = ['icon.svg', 'icon@2x.png', 'images/icon.svg', 'images/icon@2x.png'];
      const hasIcon = await Promise.all(
        iconFiles.map(file => fs.pathExists(path.join(driverDir, file)))
      );
      
      if (!hasIcon.some(Boolean)) {
        result.warnings.push('Aucune icône trouvée (recherchée: icon.svg, icon@2x.png, images/icon.svg, images/icon@2x.png)');
      }
      
    } catch (error) {
      result.issues.push(`Erreur lors de l'analyse de driver.compose.json: ${error.message}`);
    }
  }
  
  // Vérifier le fichier device.js
  if (files['device.js']) {
    try {
      const content = await fs.readFile(deviceFile, 'utf8');
      
      // Vérifier la présence des méthodes requises
      const requiredMethods = ['onInit', 'onAdded', 'onSettings', 'onRenamed', 'onDeleted'];
      for (const method of requiredMethods) {
        if (!new RegExp(`async ${method}\\(`).test(content)) {
          result.warnings.push(`Méthode recommandée manquante: ${method}()`);
        }
      }
      
      // Vérifier la gestion des erreurs
      if (!/try\s*\{/.test(content) || !/catch\s*\(/.test(content)) {
        result.suggestions.push('Ajouter des blocs try/catch pour la gestion des erreurs');
      }
      
      // Vérifier la documentation JSDoc
      if (!/\*\*\n \* @/.test(content)) {
        result.suggestions.push('Ajouter une documentation JSDoc pour les méthodes principales');
      }
      
    } catch (error) {
      result.issues.push(`Erreur lors de l'analyse de device.js: ${error.message}`);
    }
  }
  
  return result;
}

async function analyzeProjectStructure() {
  const drivers = (await fs.readdir(DRIVERS_DIR, { withFileTypes: true }))
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  console.log(chalk.blue(`🔍 Analyse de ${drivers.length} drivers...`));
  
  const results = [];
  let totalIssues = 0;
  let totalWarnings = 0;
  
  for (const driver of drivers) {
    const result = await checkDriver(driver);
    results.push(result);
    totalIssues += result.issues.length;
    totalWarnings += result.warnings.length;
    
    // Afficher un résumé pour ce driver
    if (result.issues.length > 0 || result.warnings.length > 0) {
      console.log(`\n${chalk.bold(driver)}:`);
      
      if (result.issues.length > 0) {
        console.log(chalk.red(`  ❌ ${result.issues.length} problème(s)`));
        result.issues.forEach(issue => console.log(`    - ${issue}`));
      }
      
      if (result.warnings.length > 0) {
        console.log(chalk.yellow(`  ⚠️  ${result.warnings.length} avertissement(s)`));
        result.warnings.forEach(warning => console.log(`    - ${warning}`));
      }
      
      if (result.suggestions.length > 0) {
        console.log(chalk.blue(`  💡 ${result.suggestions.length} suggestion(s)`));
        result.suggestions.forEach(suggestion => console.log(`    - ${suggestion}`));
      }
    }
  }
  
  // Générer le rapport
  const report = {
    timestamp: new Date().toISOString(),
    driversAnalyzed: drivers.length,
    totalIssues,
    totalWarnings,
    results: results.filter(r => r.issues.length > 0 || r.warnings.length > 0)
  };
  
  await fs.writeJson(OUTPUT_FILE, report, { spaces: 2 });
  
  // Afficher le résumé
  console.log('\n' + '='.repeat(60));
  console.log(chalk.green.bold('\n✅ Analyse terminée avec succès !'));
  console.log(chalk.cyan(`📊 ${drivers.length} drivers analysés`));
  console.log(chalk.red(`❌ ${totalIssues} problèmes détectés`));
  console.log(chalk.yellow(`⚠️  ${totalWarnings} avertissements`));
  console.log(chalk.cyan(`📄 Rapport complet enregistré dans: ${path.relative(process.cwd(), OUTPUT_FILE)}`));
  
  if (totalIssues > 0) {
    console.log('\n' + chalk.red.bold('🚨 Des problèmes critiques nécessitent votre attention !'));
    process.exit(1);
  }
}

analyzeProjectStructure().catch(error => {
  console.error(chalk.red('❌ Erreur lors de l\'analyse de l\'architecture:'), error);
  process.exit(1);
});
