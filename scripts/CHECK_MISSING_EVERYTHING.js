#!/usr/bin/env node

/**
 * CHECK MISSING EVERYTHING
 * Vérifie TOUS les éléments manquants dans le projet
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 CHECK MISSING EVERYTHING\n');

const rootDir = path.join(__dirname, '..');
const driversDir = path.join(rootDir, 'drivers');

const missing = {
  folders: [],
  files: [],
  required_files: [],
  empty_drivers: [],
  incomplete_drivers: [],
  missing_assets: [],
  missing_device_js: [],
  missing_driver_js: [],
  missing_compose: []
};

// Vérifier dossiers essentiels
console.log('1. Vérification dossiers essentiels...\n');

const essentialFolders = [
  'drivers',
  'lib',
  'assets',
  'locales',
  '.homeycompose',
  'docs',
  'scripts',
  'planning_v5'
];

for (const folder of essentialFolders) {
  const folderPath = path.join(rootDir, folder);
  if (!fs.existsSync(folderPath)) {
    missing.folders.push(folder);
    console.log(`❌ Missing folder: ${folder}`);
  } else {
    console.log(`✅ ${folder}`);
  }
}

// Vérifier fichiers essentiels
console.log('\n2. Vérification fichiers essentiels...\n');

const essentialFiles = [
  'app.json',
  'package.json',
  'README.md',
  'CHANGELOG.md',
  'LICENSE',
  '.gitignore',
  '.homeyignore'
];

for (const file of essentialFiles) {
  const filePath = path.join(rootDir, file);
  if (!fs.existsSync(filePath)) {
    missing.files.push(file);
    console.log(`❌ Missing: ${file}`);
  } else {
    console.log(`✅ ${file}`);
  }
}

// Vérifier drivers
console.log('\n3. Vérification drivers...\n');

if (fs.existsSync(driversDir)) {
  const drivers = fs.readdirSync(driversDir).filter(d =>
    fs.statSync(path.join(driversDir, d)).isDirectory()
  );
  
  console.log(`Found ${drivers.length} drivers\n`);
  
  for (const driver of drivers) {
    const driverPath = path.join(driversDir, driver);
    
    // Vérifier driver.compose.json
    const composePath = path.join(driverPath, 'driver.compose.json');
    if (!fs.existsSync(composePath)) {
      missing.missing_compose.push(driver);
    }
    
    // Vérifier device.js
    const devicePath = path.join(driverPath, 'device.js');
    if (!fs.existsSync(devicePath)) {
      missing.missing_device_js.push(driver);
    }
    
    // Vérifier assets
    const assetsPath = path.join(driverPath, 'assets');
    if (!fs.existsSync(assetsPath)) {
      missing.missing_assets.push(driver);
    } else {
      const requiredImages = ['large.png', 'small.png'];
      for (const img of requiredImages) {
        if (!fs.existsSync(path.join(assetsPath, img))) {
          missing.missing_assets.push(`${driver}/${img}`);
        }
      }
    }
    
    // Vérifier si le dossier est vide
    const files = fs.readdirSync(driverPath);
    if (files.length === 0) {
      missing.empty_drivers.push(driver);
    }
    
    // Vérifier si incomplete (< 3 fichiers)
    if (files.length < 3) {
      missing.incomplete_drivers.push(driver);
    }
  }
}

// Vérifier lib/
console.log('\n4. Vérification lib/...\n');

const libDir = path.join(rootDir, 'lib');
if (fs.existsSync(libDir)) {
  const libFiles = fs.readdirSync(libDir);
  console.log(`✅ lib/ contains ${libFiles.length} files`);
  
  const expectedLib = [
    'TuyaZigbeeDevice.js',
    'IASZoneEnroller.js'
  ];
  
  for (const file of expectedLib) {
    if (!libFiles.includes(file)) {
      missing.required_files.push(`lib/${file}`);
      console.log(`❌ Missing: lib/${file}`);
    } else {
      console.log(`✅ lib/${file}`);
    }
  }
} else {
  missing.folders.push('lib');
}

// Vérifier assets/
console.log('\n5. Vérification assets/...\n');

const assetsDir = path.join(rootDir, 'assets');
if (fs.existsSync(assetsDir)) {
  const requiredAssets = [
    'images/large.png',
    'images/small.png',
    'images/xlarge.png'
  ];
  
  for (const asset of requiredAssets) {
    const assetPath = path.join(assetsDir, asset);
    if (!fs.existsSync(assetPath)) {
      missing.required_files.push(`assets/${asset}`);
      console.log(`❌ Missing: assets/${asset}`);
    } else {
      console.log(`✅ assets/${asset}`);
    }
  }
}

// Vérifier .homeycompose/
console.log('\n6. Vérification .homeycompose/...\n');

const homeycomposeDir = path.join(rootDir, '.homeycompose');
if (fs.existsSync(homeycomposeDir)) {
  const requiredCompose = [
    'app.json',
    'capabilities',
    'flow'
  ];
  
  for (const item of requiredCompose) {
    const itemPath = path.join(homeycomposeDir, item);
    if (!fs.existsSync(itemPath)) {
      missing.required_files.push(`.homeycompose/${item}`);
      console.log(`❌ Missing: .homeycompose/${item}`);
    } else {
      console.log(`✅ .homeycompose/${item}`);
    }
  }
}

// Vérifier locales/
console.log('\n7. Vérification locales/...\n');

const localesDir = path.join(rootDir, 'locales');
if (fs.existsSync(localesDir)) {
  const requiredLocales = ['en.json', 'fr.json'];
  
  for (const locale of requiredLocales) {
    const localePath = path.join(localesDir, locale);
    if (!fs.existsSync(localePath)) {
      missing.required_files.push(`locales/${locale}`);
      console.log(`❌ Missing: locales/${locale}`);
    } else {
      console.log(`✅ locales/${locale}`);
    }
  }
}

// Générer rapport
console.log('\n\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║         CHECK MISSING EVERYTHING - RAPPORT                    ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

console.log('📊 RÉSUMÉ:\n');

console.log(`Dossiers manquants:              ${missing.folders.length}`);
console.log(`Fichiers essentiels manquants:   ${missing.files.length}`);
console.log(`Fichiers requis manquants:       ${missing.required_files.length}`);
console.log(`Drivers vides:                   ${missing.empty_drivers.length}`);
console.log(`Drivers incomplets:              ${missing.incomplete_drivers.length}`);
console.log(`Assets manquants:                ${missing.missing_assets.length}`);
console.log(`device.js manquants:             ${missing.missing_device_js.length}`);
console.log(`driver.compose.json manquants:   ${missing.missing_compose.length}\n`);

if (missing.folders.length > 0) {
  console.log('❌ DOSSIERS MANQUANTS:');
  missing.folders.forEach(f => console.log(`   - ${f}`));
  console.log('');
}

if (missing.files.length > 0) {
  console.log('❌ FICHIERS ESSENTIELS MANQUANTS:');
  missing.files.forEach(f => console.log(`   - ${f}`));
  console.log('');
}

if (missing.required_files.length > 0) {
  console.log('❌ FICHIERS REQUIS MANQUANTS:');
  missing.required_files.slice(0, 20).forEach(f => console.log(`   - ${f}`));
  if (missing.required_files.length > 20) {
    console.log(`   ... et ${missing.required_files.length - 20} autres`);
  }
  console.log('');
}

if (missing.empty_drivers.length > 0) {
  console.log('❌ DRIVERS VIDES:');
  missing.empty_drivers.forEach(d => console.log(`   - ${d}`));
  console.log('');
}

if (missing.incomplete_drivers.length > 0) {
  console.log('⚠️  DRIVERS INCOMPLETS (< 3 fichiers):');
  missing.incomplete_drivers.slice(0, 10).forEach(d => console.log(`   - ${d}`));
  if (missing.incomplete_drivers.length > 10) {
    console.log(`   ... et ${missing.incomplete_drivers.length - 10} autres`);
  }
  console.log('');
}

if (missing.missing_device_js.length > 0) {
  console.log('❌ device.js MANQUANTS:');
  missing.missing_device_js.slice(0, 10).forEach(d => console.log(`   - ${d}`));
  if (missing.missing_device_js.length > 10) {
    console.log(`   ... et ${missing.missing_device_js.length - 10} autres`);
  }
  console.log('');
}

if (missing.missing_compose.length > 0) {
  console.log('❌ driver.compose.json MANQUANTS:');
  missing.missing_compose.slice(0, 10).forEach(d => console.log(`   - ${d}`));
  if (missing.missing_compose.length > 10) {
    console.log(`   ... et ${missing.missing_compose.length - 10} autres`);
  }
  console.log('');
}

// Sauvegarder rapport
const reportPath = path.join(rootDir, 'MISSING_REPORT.json');
fs.writeFileSync(reportPath, JSON.stringify(missing, null, 2));
console.log(`✅ Rapport sauvegardé: MISSING_REPORT.json\n`);

// Total
const totalMissing = 
  missing.folders.length +
  missing.files.length +
  missing.required_files.length +
  missing.empty_drivers.length +
  missing.incomplete_drivers.length +
  missing.missing_assets.length +
  missing.missing_device_js.length +
  missing.missing_compose.length;

if (totalMissing === 0) {
  console.log('✅ AUCUN ÉLÉMENT MANQUANT!\n');
} else {
  console.log(`⚠️  TOTAL ÉLÉMENTS MANQUANTS: ${totalMissing}\n`);
}
