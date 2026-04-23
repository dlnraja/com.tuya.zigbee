#!/usr/bin/env node
const { safeParse } = require('../../lib/utils/tuyaUtils.js');
/**
 * 
 *           DRIVER IMAGES FIXER - Universal Tuya Zigbee                        
 * 
 *   v1.0.0 - Janvier 2026                                                       
 *   Corrige automatiquement les images des drivers selon Homey SDK Guidelines  
 *                                                                               
 *   SpÃ©cifications Homey:                                                       
 *   - Small: 75x75 px                                                           
 *   - Large: 500x500 px                                                         
 *   - XLarge: 1000x1000 px                                                      
 *   - Format: PNG, fond blanc                                                   
 * 
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Configuration
const DRIVERS_PATH = path.join(__dirname, '..', 'drivers');
const BACKUP_PATH = path.join(__dirname, '..', 'backup', 'images_backup');

// Mapping des drivers incorrects vers les bonnes sources d'images
// Sources: Zigbee2MQTT, images existantes correctes, ou URLs directes
const IMAGE_FIXES = {
  // === CATÃ‰GORIE 1: Smart Plug utilisÃ© incorrectement ===
  'air_purifier': {
    source: 'z2m',
    model: 'TS0601_air_quality_sensor', // Closest match
    fallback: 'generate',
    description: 'Purificateur air Tuya'
  },
  'pool_pump': {
    source: 'copy_from',
    copyFrom: 'switch_1gang', // Use switch module as base
    description: 'ContrÃ´leur pompe piscine'
  },
  'garage_door': {
    source: 'z2m',
    model: 'TS0601_cover_5', // Garage door controller
    fallback: 'copy_from',
    copyFrom: 'door_controller',
    description: 'ContrÃ´leur porte garage'
  },
  'fan_controller': {
    source: 'copy_from',
    copyFrom: 'ceiling_fan',
    description: 'ContrÃ´leur ventilateur'
  },
  'din_rail_switch': {
    source: 'copy_from',
    copyFrom: 'smart_rcbo', // DIN rail device
    description: 'Switch DIN rail'
  },
  'din_rail_meter': {
    source: 'copy_from',
    copyFrom: 'energy_meter_3phase',
    description: 'Compteur DIN rail'
  },
  'fingerprint_lock': {
    source: 'copy_from',
    copyFrom: 'lock_smart',
    description: 'Serrure biomÃ©trique'
  },
  'humidifier': {
    source: 'generate',
    baseColor: '#4FC3F7',
    icon: 'humidity',
    description: 'Humidificateur'
  },
  'generic_tuya': {
    source: 'generate',
    baseColor: '#FF6B35',
    icon: 'tuya',
    description: 'Device Tuya gÃ©nÃ©rique'
  },
  'smart_breaker': {
    source: 'copy_from',
    copyFrom: 'smart_rcbo',
    description: 'Disjoncteur intelligent'
  },
  'power_clamp_meter': {
    source: 'copy_from',
    copyFrom: 'energy_meter_3phase',
    description: 'Pince ampÃ¨remÃ©trique'
  },
  'pet_feeder': {
    source: 'generate',
    baseColor: '#8BC34A',
    icon: 'pet',
    description: 'Distributeur croquettes'
  },

  // === CATÃ‰GORIE 2: Wall Switch utilisÃ© incorrectement ===
  'hvac_dehumidifier': {
    source: 'generate',
    baseColor: '#03A9F4',
    icon: 'dehumidifier',
    description: 'DÃ©shumidificateur'
  },
  'hvac_air_conditioner': {
    source: 'copy_from',
    copyFrom: 'thermostat_tuya_dp',
    description: 'Climatiseur'
  },
  'radiator_valve': {
    source: 'z2m',
    model: 'TS0601_thermostat',
    fallback: 'generate',
    baseColor: '#FF5722',
    icon: 'trv',
    description: 'Vanne thermostatique TRV'
  },
  'thermostat_4ch': {
    source: 'copy_from',
    copyFrom: 'lcdtemphumidsensor',
    description: 'Thermostat 4 canaux'
  },
  'smart_heater': {
    source: 'copy_from',
    copyFrom: 'smart_heater_controller',
    description: 'Chauffage intelligent'
  },

  // === CATÃ‰GORIE 3: Autres erreurs ===
  'doorbell': {
    source: 'generate',
    baseColor: '#FFC107',
    icon: 'doorbell',
    description: 'Sonnette'
  },
  'vibration_sensor': {
    source: 'z2m',
    model: 'TS0210',
    fallback: 'copy_from',
    copyFrom: 'motion_sensor',
    description: 'Capteur vibration'
  },
  'water_tank_monitor': {
    source: 'copy_from',
    copyFrom: 'soil_sensor',
    description: 'Moniteur niveau eau'
  },
  'weather_station_outdoor': {
    source: 'copy_from',
    copyFrom: 'rain_sensor',
    description: 'Station mÃ©tÃ©o extÃ©rieure'
  },
  'ceiling_fan': {
    source: 'generate',
    baseColor: '#9E9E9E',
    icon: 'fan',
    description: 'Ventilateur plafond'
  }
};

// Statistiques
let stats = {
  total: 0,
  fixed: 0,
  skipped: 0,
  errors: 0,
  copied: 0,
  generated: 0
};

/**
 * CrÃ©e le dossier de backup si nÃ©cessaire
 */
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_PATH)) {
    fs.mkdirSync(BACKUP_PATH, { recursive: true });
    console.log(` Dossier backup crÃ©Ã©: ${BACKUP_PATH}`);
  }
}

/**
 * Sauvegarde les images existantes avant modification
 */
function backupExistingImages(driverId) {
  const driverImagesPath = path.join(DRIVERS_PATH, driverId, 'assets', 'images');
  const backupDriverPath = path.join(BACKUP_PATH, driverId);

  if (fs.existsSync(driverImagesPath)) {
    if (!fs.existsSync(backupDriverPath)) {
      fs.mkdirSync(backupDriverPath, { recursive: true });
    }

    const files = fs.readdirSync(driverImagesPath);
    files.forEach(file => {
      if (file.endsWith('.png') || file.endsWith('.jpg')) {
        const src = path.join(driverImagesPath, file);
        const dest = path.join(backupDriverPath, file);
        fs.copyFileSync(src, dest);
      }
    });
    console.log(`   Backup: ${driverId}`);
  }
}

/**
 * Copie les images d'un driver source vers un driver destination
 */
function copyImagesFromDriver(sourceDriverId, destDriverId) {
  const sourcePath = path.join(DRIVERS_PATH, sourceDriverId, 'assets', 'images');
  const destPath = path.join(DRIVERS_PATH, destDriverId, 'assets', 'images');

  if (!fs.existsSync(sourcePath)) {
    console.log(`   Source non trouvÃ©e: ${sourceDriverId}`);
    return false;
  }

  // CrÃ©er le dossier destination si nÃ©cessaire
  if (!fs.existsSync(destPath)) {
    fs.mkdirSync(destPath, { recursive: true });
  }

  // Copier les fichiers
  const files = ['small.png', 'large.png', 'xlarge.png'];
  let copied = 0;

  files.forEach(file => {
    const src = path.join(sourcePath, file);
    const dest = path.join(destPath, file);

    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      copied++;
    }
  });

  if (copied > 0) {
    console.log(`   CopiÃ© ${copied} images de ${sourceDriverId}  ${destDriverId}`);
    stats.copied++;
    return true;
  }

  return false;
}

/**
 * GÃ©nÃ¨re une image placeholder simple avec canvas
 * Note: NÃ©cessite le package 'canvas' installÃ©
 */
function generatePlaceholderImage(driverId, config) {
  try {
    const { createCanvas } = require('canvas');
    const destPath = path.join(DRIVERS_PATH, driverId, 'assets', 'images');

    if (!fs.existsSync(destPath)) {
      fs.mkdirSync(destPath, { recursive: true });
    }

    const sizes = [
      { name: 'small.png', size: 75 },
      { name: 'large.png', size: 500 },
      { name: 'xlarge.png', size: 1000 }
    ];

    sizes.forEach(({ name, size }) => {
      const canvas = createCanvas(size, size);
      const ctx = canvas.getContext('2d');

      // Fond blanc
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, size, size);

      // Cercle colorÃ© au centre
      const centerX = size * 2;
      const centerY = size * 2;
      const radius = size * 0.35;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = config.baseColor || '#607D8B';
      ctx.fill();

      // IcÃ´ne simple (premiÃ¨re lettre)
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${size * 0.3}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const iconText = getIconText(config.icon || driverId);
      ctx.fillText(iconText, centerX, centerY);

      // Sauvegarder
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(path.join(destPath, name), buffer);
    });

    console.log(`   GÃ©nÃ©rÃ© images pour ${driverId}`);
    stats.generated++;
    return true;
  } catch (err) {
    console.log(`   Canvas non disponible, utilisation fallback pour ${driverId}`);
    return false;
  }
}

/**
 * Retourne le texte d'icÃ´ne basÃ© sur le type
 */
function getIconText(iconType) {
  const icons = {
    'humidity': '',
    'tuya': 'T',
    'pet': '',
    'dehumidifier': '',
    'trv': '',
    'doorbell': '',
    'fan': '',
    'default': ''
  };
  return icons[iconType] || icons['default'];
}

/**
 * VÃ©rifie si un driver a des images valides
 */
function hasValidImages(driverId) {
  const imagesPath = path.join(DRIVERS_PATH, driverId, 'assets', 'images');
  if (!fs.existsSync(imagesPath)) return false;

  const smallPath = path.join(imagesPath, 'small.png');
  return fs.existsSync(smallPath);
}

/**
 * Corrige les images d'un driver
 */
async function fixDriverImages(driverId, config) {
  console.log(`\n Traitement: ${driverId}`);
  console.log(`   Description: ${config.description}`);

  // Backup d'abord
  backupExistingImages(driverId);

  let success = false;

  // StratÃ©gie 1: Copier depuis un autre driver
  if (config.source === 'copy_from' && config.copyFrom) {
    success = copyImagesFromDriver(config.copyFrom, driverId);
  }

  // StratÃ©gie 2: GÃ©nÃ©rer une image
  if (!success && (config.source === 'generate' || config.fallback === 'generate')) {
    success = generatePlaceholderImage(driverId, config);
  }

  // StratÃ©gie 3: Fallback - copier depuis un driver similaire
  if (!success && config.fallback === 'copy_from' && config.copyFrom) {
    success = copyImagesFromDriver(config.copyFrom, driverId);
  }

  if (success) {
    stats.fixed++;
  } else {
    stats.errors++;
    console.log(`   Ã‰chec pour ${driverId}`);
  }

  return success;
}

/**
 * VÃ©rifie la cohÃ©rence de toutes les images
 */
function checkImageConsistency() {
  console.log('\n' + ''.repeat(60));
  console.log(' VÃ‰RIFICATION COHÃ‰RENCE IMAGES');
  console.log(''.repeat(60));

  const drivers = fs.readdirSync(DRIVERS_PATH).filter(d => {
    const driverPath = path.join(DRIVERS_PATH, d);
    return fs.statSync(driverPath).isDirectory();
  });

  let missingSmall = [];
  let missingLarge = [];
  let missingXlarge = [];

  drivers.forEach(driverId => {
    const imagesPath = path.join(DRIVERS_PATH, driverId, 'assets', 'images');

    if (!fs.existsSync(path.join(imagesPath, 'small.png'))) {
      missingSmall.push(driverId);
    }
    if (!fs.existsSync(path.join(imagesPath, 'large.png'))) {
      missingLarge.push(driverId);
    }
    if (!fs.existsSync(path.join(imagesPath, 'xlarge.png'))) {
      missingXlarge.push(driverId);
    }
  });

  console.log(`\n Total drivers: ${drivers.length}`);
  console.log(` Manquant small.png: ${missingSmall.length}`);
  console.log(` Manquant large.png: ${missingLarge.length}`);
  console.log(` Manquant xlarge.png: ${missingXlarge.length}`);

  if (missingSmall.length > 0) {
    console.log(`\n Drivers sans small.png:`);
    missingSmall.forEach(d => console.log(`   - ${d}`));
  }

  return {
    total: drivers.length,
    missingSmall,
    missingLarge,
    missingXlarge
  };
}

/**
 * Fonction principale
 */
async function main() {
  console.log('');
  console.log('         DRIVER IMAGES FIXER - Universal Tuya Zigbee             ');
  console.log('                      v1.0.0 - Janvier 2026                       ');
  console.log('');
  console.log('');

  // CrÃ©er dossier backup
  ensureBackupDir();

  // Nombre de drivers Ã corriger
  const driversToFix = Object.keys(IMAGE_FIXES);
  stats.total = driversToFix.length;

  console.log(` ${stats.total} drivers Ã corriger\n`);

  // Corriger chaque driver
  for (const driverId of driversToFix) {
    const config = IMAGE_FIXES[driverId];

    // VÃ©rifier si le driver existe
    const driverPath = path.join(DRIVERS_PATH, driverId);
    if (!fs.existsSync(driverPath)) {
      console.log(`\n Driver non trouvÃ©: ${driverId}`);
      stats.skipped++;
      continue;
    }

    await fixDriverImages(driverId, config);
  }

  // VÃ©rifier cohÃ©rence globale
  const consistency = checkImageConsistency();

  // RÃ©sumÃ©
  console.log('\n' + ''.repeat(60));
  console.log(' RÃ‰SUMÃ‰ FINAL');
  console.log(''.repeat(60));
  console.log(` CorrigÃ©s: ${stats.fixed}`);
  console.log(` CopiÃ©s: ${stats.copied}`);
  console.log(` GÃ©nÃ©rÃ©s: ${stats.generated}`);
  console.log(` IgnorÃ©s: ${stats.skipped}`);
  console.log(` Erreurs: ${stats.errors}`);
  console.log(''.repeat(60));

  if (stats.fixed > 0) {
    console.log('\n Images corrigÃ©es avec succÃ¨s!');
    console.log('   ExÃ©cutez: npx homey app build');
  }
}

// ExÃ©cution
main().catch(console.error);
