#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * CREATE WALL TOUCH VARIANTS (1-8 GANG)
 * Génère tous les variants wall_touch hybrides sans suffixe _hybrid
 */

const BASE_DIR = path.join(__dirname, '..', 'drivers');
const SOURCE_DRIVER = path.join(BASE_DIR, 'wall_touch_3gang_hybrid');

console.log('🔧 CREATING WALL TOUCH VARIANTS (1-8 GANG)\n');

// Configuration pour chaque variant
const VARIANTS = [
  { gang: 1, name: 'Wall Touch Button 1 Gang', nameFr: 'Interrupteur Tactile 1 Bouton' },
  { gang: 2, name: 'Wall Touch Button 2 Gang', nameFr: 'Interrupteur Tactile 2 Boutons' },
  { gang: 3, name: 'Wall Touch Button 3 Gang', nameFr: 'Interrupteur Tactile 3 Boutons' },
  { gang: 4, name: 'Wall Touch Button 4 Gang', nameFr: 'Interrupteur Tactile 4 Boutons' },
  { gang: 5, name: 'Wall Touch Button 5 Gang', nameFr: 'Interrupteur Tactile 5 Boutons' },
  { gang: 6, name: 'Wall Touch Button 6 Gang', nameFr: 'Interrupteur Tactile 6 Boutons' },
  { gang: 7, name: 'Wall Touch Button 7 Gang', nameFr: 'Interrupteur Tactile 7 Boutons' },
  { gang: 8, name: 'Wall Touch Button 8 Gang', nameFr: 'Interrupteur Tactile 8 Boutons' }
];

function generateCapabilities(gangCount) {
  const caps = [];
  for (let i = 1; i <= gangCount; i++) {
    caps.push(`onoff.button${i}`);
  }
  caps.push('measure_temperature', 'measure_battery', 'alarm_battery', 'alarm_tamper');
  return caps;
}

function generateCapabilitiesOptions(gangCount) {
  const opts = {};
  for (let i = 1; i <= gangCount; i++) {
    opts[`onoff.button${i}`] = {
      title: { en: `Button ${i}`, fr: `Bouton ${i}` },
      insightsTitleTrue: { en: `Button ${i} turned on`, fr: `Bouton ${i} activé` },
      insightsTitleFalse: { en: `Button ${i} turned off`, fr: `Bouton ${i} désactivé` }
    };
  }
  opts.measure_battery = { title: { en: 'Battery', fr: 'Batterie' }, preventInsights: false };
  opts.measure_temperature = { title: { en: 'Temperature', fr: 'Température' } };
  opts.alarm_tamper = { title: { en: 'Tamper Alarm', fr: 'Alarme Sabotage' } };
  return opts;
}

function generateEndpoints(gangCount) {
  const endpoints = {};
  for (let i = 1; i <= gangCount; i++) {
    endpoints[i.toString()] = {
      clusters: i === 1 ? [0, 1, 3, 6, 4096, 64704] : [6],
      bindings: i === 1 ? [6, 1] : [6]
    };
  }
  return endpoints;
}

function createDriverCompose(gangCount, name, nameFr, targetDir) {
  const driverCompose = {
    name: { en: name, fr: nameFr },
    class: 'socket',
    capabilities: generateCapabilities(gangCount),
    capabilitiesOptions: generateCapabilitiesOptions(gangCount),
    energy: {
      batteries: ['CR2032', 'CR2032'],
      approximation: { usageConstant: 0.5 }
    },
    platforms: ['local'],
    connectivity: ['zigbee'],
    images: {
      small: `drivers/wall_touch_${gangCount}gang/assets/images/small.png`,
      large: `drivers/wall_touch_${gangCount}gang/assets/images/large.png`,
      xlarge: `drivers/wall_touch_${gangCount}gang/assets/images/xlarge.png`
    },
    zigbee: {
      manufacturerName: ['_TZ3000_xabckq1v', '_TZ3000_lupfd8zu', '_TZ3000_4fjiwweb', '_TZ3000_kjfzuycl'],
      productId: gangCount === 1 ? ['TS0041'] : gangCount === 2 ? ['TS0042'] : gangCount === 3 ? ['TS0043', 'TS004F'] : ['TS0044', 'TS004F'],
      endpoints: generateEndpoints(gangCount),
      learnmode: {
        image: '{{driverAssetsPath}}/learn.svg',
        instruction: {
          en: 'Press and hold any button for 5 seconds until the LED flashes rapidly',
          fr: "Maintenez n'importe quel bouton pendant 5 secondes jusqu'à ce que la LED clignote rapidement"
        }
      }
    },
    settings: [
      {
        id: 'power_source',
        type: 'dropdown',
        label: { en: 'Power Source', fr: "Source d'alimentation" },
        value: 'auto',
        values: [
          { id: 'auto', label: { en: 'Auto Detect', fr: 'Détection Automatique' } },
          { id: 'battery', label: { en: 'Battery', fr: 'Batterie' } },
          { id: 'ac', label: { en: 'AC Mains', fr: 'Secteur AC' } }
        ]
      },
      {
        id: 'switch_type',
        type: 'dropdown',
        label: { en: 'Switch Type', fr: "Type d'interrupteur" },
        value: 'toggle',
        values: [
          { id: 'toggle', label: { en: 'Toggle (On/Off)', fr: 'Bascule (On/Off)' } },
          { id: 'momentary', label: { en: 'Momentary (Push)', fr: 'Momentané (Poussoir)' } }
        ]
      },
      {
        id: 'button_mode',
        type: 'dropdown',
        label: { en: 'Button Mode', fr: 'Mode Bouton' },
        hint: {
          en: 'Command mode: Control device directly. Scene mode: Trigger scenes only',
          fr: 'Mode Commande: Contrôle direct. Mode Scène: Déclenche uniquement des scènes'
        },
        value: 'command',
        values: [
          { id: 'command', label: { en: 'Command Mode', fr: 'Mode Commande' } },
          { id: 'scene', label: { en: 'Scene Mode', fr: 'Mode Scène' } }
        ]
      },
      {
        id: 'reporting_interval',
        type: 'number',
        label: { en: 'Reporting Interval (seconds)', fr: 'Intervalle de rapport (secondes)' },
        hint: {
          en: 'How often the device reports its status (60-3600 seconds)',
          fr: "Fréquence de rapport d'état (60-3600 secondes)"
        },
        value: 300,
        min: 60,
        max: 3600,
        units: { en: 'seconds', fr: 'secondes' }
      }
    ]
  };

  fs.writeFileSync(
    path.join(targetDir, 'driver.compose.json'),
    JSON.stringify(driverCompose, null, 2)
  );
}

function copyFile(src, dest) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
}

// Créer chaque variant
VARIANTS.forEach(variant => {
  const targetDir = path.join(BASE_DIR, `wall_touch_${variant.gang}gang`);
  
  // Skip si existe déjà (sauf pour 3gang qu'on remplace)
  if (fs.existsSync(targetDir) && variant.gang !== 3) {
    console.log(`  ⏭️  wall_touch_${variant.gang}gang already exists`);
    return;
  }

  console.log(`  📦 Creating wall_touch_${variant.gang}gang...`);
  
  // Créer structure
  fs.mkdirSync(targetDir, { recursive: true });
  fs.mkdirSync(path.join(targetDir, 'assets', 'images'), { recursive: true });
  
  // Générer driver.compose.json
  createDriverCompose(variant.gang, variant.name, variant.nameFr, targetDir);
  
  // Copier fichiers depuis source si existe
  if (fs.existsSync(SOURCE_DRIVER)) {
    // Copier driver.js
    const driverJsSrc = path.join(SOURCE_DRIVER, 'driver.js');
    if (fs.existsSync(driverJsSrc)) {
      let driverJs = fs.readFileSync(driverJsSrc, 'utf8');
      // Adapter pour le nombre de gang
      driverJs = driverJs.replace(/3gang/g, `${variant.gang}gang`);
      driverJs = driverJs.replace(/button3/g, `button${variant.gang}`);
      fs.writeFileSync(path.join(targetDir, 'driver.js'), driverJs);
    }
    
    // Copier device.js
    const deviceJsSrc = path.join(SOURCE_DRIVER, 'device.js');
    if (fs.existsSync(deviceJsSrc)) {
      copyFile(deviceJsSrc, path.join(targetDir, 'device.js'));
    }
    
    // Copier images si existent
    ['small.png', 'large.png', 'xlarge.png', 'learn.svg'].forEach(img => {
      const imgSrc = path.join(SOURCE_DRIVER, 'assets', 'images', img);
      copyFile(imgSrc, path.join(targetDir, 'assets', 'images', img));
    });
  }
  
  // Créer README
  const readme = `# ${variant.name}\n\nHybrid Wall Touch Switch - ${variant.gang} Gang\nSupports both battery and AC power operation.\n`;
  fs.writeFileSync(path.join(targetDir, 'README.md'), readme);
  
  console.log(`    ✅ Created wall_touch_${variant.gang}gang`);
});

// Renommer wall_touch_3gang_hybrid -> wall_touch_3gang
const oldDir = path.join(BASE_DIR, 'wall_touch_3gang_hybrid');
const newDir = path.join(BASE_DIR, 'wall_touch_3gang');

if (fs.existsSync(oldDir)) {
  console.log('\n  🔄 Renaming wall_touch_3gang_hybrid -> wall_touch_3gang...');
  if (fs.existsSync(newDir)) {
    fs.rmSync(newDir, { recursive: true, force: true });
  }
  fs.renameSync(oldDir, newDir);
  console.log('    ✅ Renamed successfully');
}

console.log('\n✅ ALL WALL TOUCH VARIANTS CREATED!\n');
console.log(`📊 Total: ${VARIANTS.length} variants (1-8 gang)\n`);
