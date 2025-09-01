const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

// Configuration
const CONFIG = {
  driversDir: path.join(__dirname, '../drivers'),
  iconSizes: {
    small: { width: 100, height: 100 },
    large: { width: 500, height: 500 }
  },
  defaultIcons: {
    generic: path.join(__dirname, '../assets/icons/default-device.png'),
    sensor: path.join(__dirname, '../assets/icons/sensor.png'),
    switch: path.join(__dirname, '../assets/icons/switch.png'),
    light: path.join(__dirname, '../assets/icons/light.png')
  }
};

// Mappage des types d'appareils aux icônes par défaut
const DEVICE_TYPE_ICONS = {
  'sensor': 'sensor',
  'switch': 'switch',
  'light': 'light',
  'thermostat': 'sensor',
  'curtain': 'sensor',
  'plug': 'switch',
  'outlet': 'switch'
};

// Fonction pour déterminer le type d'appareil basé sur ses capacités
function getDeviceType(device) {
  if (device.capabilities.includes('onoff') && device.capabilities.includes('measure_power')) {
    return 'plug';
  } else if (device.capabilities.includes('alarm_smoke') || device.capabilities.includes('alarm_motion')) {
    return 'sensor';
  } else if (device.capabilities.includes('target_temperature')) {
    return 'thermostat';
  }
  return 'generic';
}

// Fonction pour générer une icône
async function generateIcon(device, size, outputPath) {
  const canvas = createCanvas(size.width, size.height);
  const ctx = canvas.getContext('2d');
  
  // Déterminer le type d'appareil et l'icône par défaut à utiliser
  const deviceType = getDeviceType(device);
  const defaultIconPath = CONFIG.defaultIcons[DEVICE_TYPE_ICONS[deviceType] || 'generic'];
  
  try {
    // Charger l'icône par défaut
    const image = await loadImage(defaultIconPath);
    
    // Dessiner l'icône
    ctx.drawImage(image, 0, 0, size.width, size.height);
    
    // Ajouter le texte du nom de l'appareil
    ctx.font = `${Math.floor(size.height * 0.1)}px Arial`;
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.fillText(device.name, size.width / 2, size.height - 10);
    
    // Enregistrer l'image
    const out = fs.createWriteStream(outputPath);
    const stream = canvas.createPNGStream();
    
    return new Promise((resolve, reject) => {
      stream.pipe(out);
      out.on('finish', () => resolve(outputPath));
      out.on('error', reject);
    });
  } catch (error) {
    console.error(`Erreur lors de la génération de l'icône pour ${device.name}:`, error);
    throw error;
  }
}

// Fonction pour générer toutes les icônes manquantes
async function generateMissingIcons() {
  console.log('Recherche des icônes manquantes...');
  
  // Parcourir tous les dossiers de drivers
  const driverDirs = fs.readdirSync(CONFIG.driversDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  for (const driverName of driverDirs) {
    const device = {
      name: driverName,
      // Ces informations devraient provenir de la configuration du driver
      capabilities: ['onoff'] // Valeur par défaut, à remplacer par les vraies capacités
    };
    
    // Vérifier et générer les icônes manquantes
    for (const [sizeName, dimensions] of Object.entries(CONFIG.iconSizes)) {
      const iconPath = path.join(CONFIG.driversDir, driverName, 'assets', 'images', sizeName, `${driverName}.png`);
      const iconDir = path.dirname(iconPath);
      
      // Créer le répertoire s'il n'existe pas
      if (!fs.existsSync(iconDir)) {
        fs.mkdirSync(iconDir, { recursive: true });
      }
      
      // Vérifier si l'icône existe déjà
      if (!fs.existsSync(iconPath)) {
        console.log(`Génération de l'icône ${sizeName} pour ${driverName}...`);
        try {
          await generateIcon(device, dimensions, iconPath);
          console.log(`✓ Icône générée: ${iconPath}`);
        } catch (error) {
          console.error(`✗ Erreur lors de la génération de l'icône pour ${driverName}:`, error);
        }
      }
    }
  }
  
  console.log('\nGénération des icônes terminée.');
}

// Exécuter la génération des icônes
generateMissingIcons().catch(console.error);
