#!/usr/bin/env node

/**
 * ULTIMATE_DRIVER_ENRICHMENT.js
 * Enrichissement complet des drivers selon standards Homey
 * Analyse comparative avec les meilleures apps Homey
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

console.log('🔍 ENRICHISSEMENT ULTIME DES DRIVERS - STANDARDS HOMEY\n');

// PATTERNS DE NAMING HOMEY (basés sur Johan Bendz, Athom, etc.)
const HOMEY_STANDARDS = {
  sensors: {
    motion: {
      prefix: 'Motion Sensor',
      features: {
        pir: 'PIR',
        mmwave: 'mmWave',
        radar: 'Radar',
        presence: 'Presence'
      }
    },
    contact: {
      prefix: 'Door/Window Sensor',
      alt: 'Contact Sensor'
    },
    temperature: {
      prefix: 'Temperature Sensor',
      combined: {
        temp_humid: 'Temperature & Humidity Sensor',
        temp_humid_pressure: 'Weather Sensor',
        multi: 'Multi Sensor'
      }
    },
    water: {
      leak: 'Water Leak Sensor',
      flood: 'Flood Sensor'
    },
    air_quality: {
      co2: 'CO₂ Sensor',
      voc: 'VOC Sensor',
      tvoc: 'TVOC Sensor',
      pm25: 'PM2.5 Sensor'
    }
  },
  switches: {
    wall: {
      pattern: '{N}-Gang Wall Switch',
      variants: ['1-Gang', '2-Gang', '3-Gang', '4-Gang']
    },
    remote: {
      pattern: '{N}-Button Remote',
      variants: ['1-Button', '2-Button', '3-Button', '4-Button']
    },
    dimmer: 'Dimmer Switch'
  },
  lighting: {
    bulb: {
      rgb: 'RGB Bulb',
      cct: 'White Ambiance Bulb',
      rgbcct: 'Color & White Bulb',
      dimmable: 'Dimmable Bulb'
    },
    strip: {
      rgb: 'LED Strip',
      rgbcct: 'Color & White LED Strip'
    }
  },
  power: {
    plug: 'Smart Plug',
    power_meter: 'Smart Plug with Energy Monitor',
    strip: 'Power Strip'
  }
};

// DESCRIPTIONS ENRICHIES (standards Homey)
const RICH_DESCRIPTIONS = {
  battery_suffix: ' Battery powered device.',
  ac_suffix: ' Mains powered device.',
  pairing: ' Easy to pair. Just press the pairing button.',
  local: ' Works 100% local, no cloud required.',
  zigbee: ' Zigbee 3.0 compatible.',
  energy: ' Includes energy monitoring.',
  multi: ' Multiple sensors in one device.'
};

let stats = {
  total: 0,
  enriched: 0,
  renamed: 0,
  descriptionsAdded: 0,
  errors: 0
};

// Lire tous les drivers
const driverFolders = fs.readdirSync(DRIVERS_DIR).filter(folder => {
  const stat = fs.statSync(path.join(DRIVERS_DIR, folder));
  return stat.isDirectory();
});

stats.total = driverFolders.length;

console.log(`📦 ${stats.total} drivers à enrichir\n`);

driverFolders.forEach((driverFolder, idx) => {
  const driverPath = path.join(DRIVERS_DIR, driverFolder);
  const composeFile = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(composeFile)) return;
  
  try {
    const content = fs.readFileSync(composeFile, 'utf8');
    const driver = JSON.parse(content);
    let needsUpdate = false;
    let changes = [];
    
    const currentName = driver.name?.en || '';
    const hasBattery = driver.energy?.batteries;
    const isAC = !hasBattery && !driverFolder.includes('hybrid');
    
    // ============================================
    // 1. ENRICHIR LE NOM
    // ============================================
    let newName = currentName;
    
    // Motion sensors
    if (driverFolder.includes('motion') || currentName.toLowerCase().includes('motion')) {
      if (driverFolder.includes('mmwave') && !currentName.includes('mmWave')) {
        newName = newName.replace(/mmwave/gi, 'mmWave');
      }
      if (driverFolder.includes('pir') && !currentName.includes('PIR')) {
        newName = newName.replace(/pir/gi, 'PIR');
      }
      // Multi-sensor enrichment
      if ((driverFolder.includes('temp') || driverFolder.includes('humidity') || driverFolder.includes('illuminance')) 
          && !currentName.includes('Multi')) {
        if (currentName.includes('Motion') && currentName.includes('Lux') && currentName.includes('Temp')) {
          // Already good
        } else if (driverFolder.includes('temp') && driverFolder.includes('humid')) {
          if (!newName.includes('Multi-Sensor')) {
            newName = 'Multi-Sensor (Motion + Climate)';
          }
        }
      }
    }
    
    // Contact/Door sensors
    if (driverFolder.includes('contact') && !currentName.includes('Door')) {
      if (!currentName.includes('Contact')) {
        newName = 'Door & Window Sensor';
      }
    }
    
    // Water leak sensors
    if (driverFolder.includes('water_leak') || driverFolder.includes('leak')) {
      if (!currentName.includes('Leak')) {
        newName = 'Water Leak Sensor';
      }
    }
    
    // CO2 sensors - enrichir symbole
    if (currentName.includes('CO2') && !currentName.includes('CO₂')) {
      newName = newName.replace(/CO2/g, 'CO₂');
    }
    
    // Wall switches - standardiser format
    if (driverFolder.includes('switch') && driverFolder.includes('gang')) {
      const gangMatch = driverFolder.match(/(\d)gang/);
      if (gangMatch) {
        const gangNum = gangMatch[1];
        if (!currentName.match(new RegExp(`${gangNum}-Gang`))) {
          newName = `${gangNum}-Gang Wall Switch`;
        }
      }
    }
    
    // Buttons/Remotes
    if (driverFolder.includes('button') || driverFolder.includes('wireless_switch')) {
      const buttonMatch = driverFolder.match(/(\d)(button|gang)/);
      if (buttonMatch) {
        const num = buttonMatch[1];
        if (!currentName.includes('Button Remote') && !currentName.includes('-Button')) {
          newName = `${num}-Button Remote`;
        }
      }
    }
    
    // Bulbs - enrichir
    if (driverFolder.includes('bulb')) {
      if (driverFolder.includes('rgbcct') && !currentName.includes('Color & White')) {
        newName = 'Color & White Bulb';
      } else if (driverFolder.includes('rgb') && !currentName.includes('Color')) {
        newName = 'Color Bulb (RGB)';
      } else if (driverFolder.includes('cct') && !currentName.includes('Ambiance')) {
        newName = 'White Ambiance Bulb';
      }
    }
    
    // Vérifier si le nom a changé
    if (newName !== currentName && newName !== '') {
      driver.name.en = newName;
      needsUpdate = true;
      changes.push(`name: "${currentName}" → "${newName}"`);
      stats.renamed++;
    }
    
    // ============================================
    // 2. ENRICHIR LA CLASSE
    // ============================================
    const currentClass = driver.class;
    let suggestedClass = currentClass;
    
    if (driverFolder.includes('motion') && currentClass !== 'sensor') {
      suggestedClass = 'sensor';
    } else if (driverFolder.includes('contact') && currentClass !== 'sensor') {
      suggestedClass = 'sensor';
    } else if (driverFolder.includes('button') && currentClass !== 'button') {
      suggestedClass = 'button';
    } else if (driverFolder.includes('switch') && driverFolder.includes('gang') && currentClass !== 'socket') {
      suggestedClass = 'socket';
    } else if (driverFolder.includes('bulb') && currentClass !== 'light') {
      suggestedClass = 'light';
    } else if (driverFolder.includes('plug') && currentClass !== 'socket') {
      suggestedClass = 'socket';
    }
    
    if (suggestedClass !== currentClass) {
      driver.class = suggestedClass;
      needsUpdate = true;
      changes.push(`class: ${currentClass} → ${suggestedClass}`);
    }
    
    // ============================================
    // 3. PLATFORMS & CONNECTIVITY (Homey standard)
    // ============================================
    if (!driver.platforms || !driver.platforms.includes('local')) {
      driver.platforms = ['local'];
      needsUpdate = true;
      changes.push('platforms added');
    }
    
    if (!driver.connectivity || !driver.connectivity.includes('zigbee')) {
      driver.connectivity = ['zigbee'];
      needsUpdate = true;
      changes.push('connectivity added');
    }
    
    // ============================================
    // 4. ENERGY (si batterie)
    // ============================================
    if (hasBattery) {
      // S'assurer que measure_battery est présent
      if (!driver.capabilities?.includes('measure_battery')) {
        if (!driver.capabilities) driver.capabilities = [];
        if (!driver.capabilities.includes('measure_battery')) {
          driver.capabilities.push('measure_battery');
          needsUpdate = true;
          changes.push('measure_battery capability added');
        }
      }
    }
    
    // ============================================
    // 5. CAPABILITIESOPTIONS - Enrichir
    // ============================================
    if (!driver.capabilitiesOptions) {
      driver.capabilitiesOptions = {};
    }
    
    // Ajouter titles si manquants
    if (driver.capabilities?.includes('alarm_motion') && !driver.capabilitiesOptions.alarm_motion) {
      driver.capabilitiesOptions.alarm_motion = {
        title: { en: 'Motion' }
      };
      needsUpdate = true;
      changes.push('alarm_motion title');
    }
    
    if (driver.capabilities?.includes('measure_temperature') && !driver.capabilitiesOptions.measure_temperature) {
      driver.capabilitiesOptions.measure_temperature = {
        title: { en: 'Temperature' }
      };
      needsUpdate = true;
      changes.push('measure_temperature title');
    }
    
    if (driver.capabilities?.includes('measure_humidity') && !driver.capabilitiesOptions.measure_humidity) {
      driver.capabilitiesOptions.measure_humidity = {
        title: { en: 'Humidity' }
      };
      needsUpdate = true;
      changes.push('measure_humidity title');
    }
    
    // ============================================
    // SAUVEGARDER
    // ============================================
    if (needsUpdate) {
      fs.writeFileSync(
        composeFile,
        JSON.stringify(driver, null, 2) + '\n',
        'utf8'
      );
      stats.enriched++;
      
      if (idx % 20 === 0 || changes.length > 0) {
        console.log(`✅ [${idx + 1}/${stats.total}] ${driverFolder}`);
        if (changes.length > 0) {
          changes.forEach(c => console.log(`   ${c}`));
        }
      }
    }
    
  } catch (error) {
    stats.errors++;
    console.error(`❌ ${driverFolder}: ${error.message}`);
  }
});

// ============================================
// RAPPORT FINAL
// ============================================
console.log('\n' + '='.repeat(70));
console.log('📊 RAPPORT D\'ENRICHISSEMENT COMPLET');
console.log('='.repeat(70));
console.log(`Total drivers: ${stats.total}`);
console.log(`Drivers enrichis: ${stats.enriched}`);
console.log(`Drivers renommés: ${stats.renamed}`);
console.log(`Erreurs: ${stats.errors}`);
console.log('='.repeat(70));

if (stats.enriched > 0) {
  console.log('\n✅ ENRICHISSEMENT TERMINÉ!');
  console.log('\n📋 PROCHAINES ÉTAPES:');
  console.log('1. Nettoyer cache: rm -rf .homeybuild .homeycompose');
  console.log('2. Valider: homey app validate --level publish');
  console.log('3. Commit: git add -A && git commit');
  console.log('4. Push: git push origin master');
}

process.exit(stats.errors > 0 ? 1 : 0);
