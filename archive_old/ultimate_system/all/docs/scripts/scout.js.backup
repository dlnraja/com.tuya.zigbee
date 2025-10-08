#!/usr/bin/env node
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { fileURLToPath } = require('url');
const chalk = require('chalk');

const __filename = __filename || '';
const __dirname = __dirname || '';
const DATA_DIR = path.resolve(__dirname, '../data');
const OUTPUT_FILE = path.join(DATA_DIR, 'scraped_datapoints.json');

// URL des références externes
const Z2M_URL = 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts';
const TYUA_DOCS_URL = 'https://developer.tuya.com/en/docs/iot/';

async function fetchZ2MData() {
  console.log(chalk.blue('🔍 Récupération des données Z2M...'));
  try {
    const { data } = await axios.get(Z2M_URL);
    return data;
  } catch (error) {
    console.error(chalk.red('❌ Erreur lors de la récupération des données Z2M:'), error.message);
    return null;
  }
}

function extractDatapoints(z2mData) {
  console.log(chalk.blue('🔍 Extraction des datapoints...'));
  
  // Cette expression régulière trouve les définitions de devices dans le fichier Z2M
  const deviceRegex = /{\s*fingerprint:\s*\[\s*{\s*modelID:\s*'([^']+)',[\s\S]*?}];/g;
  const devices = [];
  
  let match;
  while ((match = deviceRegex.exec(z2mData)) !== null) {
    const modelID = match[1];
    const deviceBlock = match[0];
    
    // Extraction des datapoints
    const dpRegex =/dp\s*:\s*(\d+).*?\/\*\s*\[([^\]]+)\]/g;
    const datapoints = [];
    let dpMatch;
    
    while ((dpMatch = dpRegex.exec(deviceBlock)) !== null) {
      datapoints.push({
        dp: parseInt(dpMatch[1]),
        description: dpMatch[2].trim()
      });
    }
    
    if (datapoints.length > 0) {
      devices.push({
        model: modelID,
        datapoints
      });
    }
  }
  
  return devices;
}

async function findMissingDatapoints(existingDrivers, z2mDevices) {
  console.log(chalk.blue('🔍 Recherche des datapoints manquants...'));
  const missing = [];
  
  // Parcourir chaque driver existant
  for (const driver of existingDrivers) {
    const driverFile = path.join('drivers', driver, 'device.js');
    if (!await fs.pathExists(driverFile)) continue;
    
    const content = await fs.readFile(driverFile, 'utf8');
    const modelMatch = content.match(/model:\s*['"]([^'"]+)['"]/);
    if (!modelMatch) continue;
    
    const model = modelMatch[1];
    const z2mDevice = z2mDevices.find(d => d.model === model);
    if (!z2mDevice) continue;
    
    // Vérifier les datapoints manquants
    const registeredDps = [];
    const dpRegex = /registerTuyaDatapoint\(\s*(\d+)/g;
    let dpMatch;
    
    while ((dpMatch = dpRegex.exec(content)) !== null) {
      registeredDps.push(parseInt(dpMatch[1]));
    }
    
    const missingDps = z2mDevice.datapoints.filter(dp => !registeredDps.includes(dp.dp));
    if (missingDps.length > 0) {
      missing.push({
        driver,
        model,
        missingDatapoints: missingDps
      });
    }
  }
  
  return missing;
}

async function main() {
  console.log('Début de la fonction main');
  try {
    // Créer le répertoire data s'il n'existe pas
    console.log('Création du répertoire data...');
    await fs.ensureDir(DATA_DIR);
    console.log('Répertoire data créé avec succès');
    
    // Récupérer les données Z2M
    console.log('Appel de fetchZ2MData()...');
    const z2mData = await fetchZ2MData();
    console.log('Données Z2M récupérées:', z2mData ? 'succès' : 'échec');
    if (!z2mData) {
      console.error(chalk.red('Impossible de continuer sans les données Z2M'));
      process.exit(1);
    }
    
    // Extraire les datapoints
    const z2mDevices = extractDatapoints(z2mData);
    
    // Lire les drivers existants
    const driversDir = path.join(process.cwd(), 'drivers');
    const existingDrivers = (await fs.readdir(driversDir, { withFileTypes: true }))
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    // Trouver les datapoints manquants
    const missingDatapoints = await findMissingDatapoints(existingDrivers, z2mDevices);
    
    // Sauvegarder les résultats
    const result = {
      timestamp: new Date().toISOString(),
      source: 'Z2M Tuya Devices',
      devices: z2mDevices,
      missingDatapoints
    };
    
    await fs.writeJson(OUTPUT_FILE, result, { spaces: 2 });
    
    // Afficher un résumé
    console.log('\n' + chalk.green.bold('✅ Analyse terminée avec succès !'));
    console.log(chalk.cyan(`📊 ${z2mDevices.length} appareils analysés`));
    console.log(chalk.cyan(`🔍 ${missingDatapoints.length} drivers avec des datapoints manquants`));
    console.log(chalk.cyan(`📄 Résultats enregistrés dans: ${path.relative(process.cwd(), OUTPUT_FILE)}`));
    
    // Afficher les datapoints manquants
    if (missingDatapoints.length > 0) {
      console.log('\n' + chalk.yellow.bold('📋 Datapoints manquants détectés:'));
      missingDatapoints.forEach(({ driver, model, missingDatapoints: dps }) => {
        console.log(`\n${chalk.bold(driver)} (${model}):`);
        dps.forEach(dp => {
          console.log(`  - DP${dp.dp}: ${dp.description}`);
        });
      });
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Erreur dans scout.js:'), error);
    process.exit(1);
  }
}

main();
