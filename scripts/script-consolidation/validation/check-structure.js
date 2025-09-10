#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

// Configuration
const PROJECT_ROOT = __dirname;
const DRIVERS_DIR = path.join(PROJECT_ROOT, 'drivers');

// Fonction pour lister les dossiers
function listDirectories(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
  } catch (error) {
    console.error(`Erreur lors de la lecture du répertoire ${dir}:`, error.message);
    return [];
  }
}

// Vérifier la structure de base
function checkBaseStructure() {
  console.log('\n🔍 Vérification de la structure du projet...');
  
  const requiredDirs = [
    'drivers',
    'scripts',
    'assets'
  ];
  
  let allGood = true;
  
  requiredDirs.forEach(dir => {
    const dirPath = path.join(PROJECT_ROOT, dir);
    if (fs.existsSync(dirPath)) {
      console.log(`✅ ${dir}/`);
    } else {
      console.error(`❌ ${dir}/ - Manquant`);
      allGood = false;
    }
  });
  
  return allGood;
}

// Vérifier les drivers
function checkDrivers() {
  console.log('\n🔍 Analyse des drivers...');
  
  if (!fs.existsSync(DRIVERS_DIR)) {
    console.error('❌ Le dossier des drivers est introuvable');
    return false;
  }
  
  const drivers = listDirectories(DRIVERS_DIR);
  console.log(`📦 ${drivers.length} drivers trouvés`);
  
  let validDrivers = 0;
  
  drivers.forEach(driver => {
    const driverPath = path.join(DRIVERS_DIR, driver);
    const configPath = path.join(driverPath, 'driver.compose.json');
    
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        console.log(`\n📁 ${driver}:`);
        console.log(`   - ID: ${config.id || 'Non défini'}`);
        console.log(`   - Nom: ${config.name?.en || 'Non défini'}`);
        console.log(`   - Capabilités: ${config.capabilities?.join(', ') || 'Aucune'}`);
        validDrivers++;
      } catch (error) {
        console.error(`❌ ${driver}: Erreur de configuration - ${error.message}`);
      }
    } else {
      console.error(`❌ ${driver}: Fichier de configuration manquant`);
    }
  });
  
  console.log(`\n📊 Résumé: ${validDrivers}/${drivers.length} drivers valides`);
  return validDrivers > 0;
}

// Vérifier les dépendances
function checkDependencies() {
  console.log('\n🔍 Vérification des dépendances...');
  
  const packageJsonPath = path.join(PROJECT_ROOT, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    console.error('❌ Fichier package.json introuvable');
    return false;
  }
  
  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    console.log(`📦 ${pkg.name} v${pkg.version}`);
    console.log(`📝 Description: ${pkg.description || 'Non définie'}`);
    
    if (pkg.dependencies) {
      console.log(`\n🔗 Dépendances (${Object.keys(pkg.dependencies).length}):`);
      Object.entries(pkg.dependencies).forEach(([name, version]) => {
        console.log(`   - ${name}@${version}`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la lecture du package.json:', error.message);
    return false;
  }
}

// Fonction principale
function main() {
  console.log('\n🚀 Vérification du projet Tuya Zigbee\n');
  
  const structureOk = checkBaseStructure();
  const driversOk = checkDrivers();
  const depsOk = checkDependencies();
  
  console.log('\n--- RÉSUMÉ ---');
  console.log(`Structure du projet: ${structureOk ? '✅' : '❌'}`);
  console.log(`Drivers valides: ${driversOk ? '✅' : '❌'}`);
  console.log(`Dépendances: ${depsOk ? '✅' : '❌'}`);
  
  if (structureOk && driversOk && depsOk) {
    console.log('\n✨ Le projet semble correctement configuré !');
  } else {
    console.log('\n⚠️ Des problèmes ont été détectés. Veuillez vérifier les messages ci-dessus.');
  }
}

// Démarrer la vérification
main();
