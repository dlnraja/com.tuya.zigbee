const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  rootDir: path.join(__dirname, '..'),
  driversDir: path.join(__dirname, '..', 'drivers')
};

// Templates SVG par type d'appareil
const SVG_TEMPLATES = {
  // Capteurs de mouvement / PIR
  motion: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
  <path d="M12 7 L12 12 L16 14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
  <circle cx="12" cy="12" r="2" fill="currentColor"/>
</svg>`,

  // Capteurs de contact / porte
  contact: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
  <rect x="4" y="4" width="7" height="16" rx="1" fill="none" stroke="currentColor" stroke-width="2"/>
  <rect x="13" y="6" width="7" height="12" rx="1" fill="none" stroke="currentColor" stroke-width="2"/>
  <circle cx="9" cy="12" r="1" fill="currentColor"/>
</svg>`,

  // Capteurs de température/humidité
  temperature: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
  <path d="M9 4 L9 12 M9 14 L9 18 M15 4 L15 12 M15 14 L15 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <circle cx="12" cy="18" r="3" fill="none" stroke="currentColor" stroke-width="2"/>
  <path d="M12 15 L12 7" stroke="currentColor" stroke-width="2"/>
</svg>`,

  // Interrupteurs / switches
  switch: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
  <rect x="6" y="4" width="12" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
  <rect x="8" y="7" width="8" height="5" rx="1" fill="currentColor"/>
  <line x1="10" y1="15" x2="14" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>`,

  // Prises / plugs
  plug: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
  <rect x="5" y="8" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
  <line x1="9" y1="5" x2="9" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <line x1="15" y1="5" x2="15" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <circle cx="12" cy="13" r="1.5" fill="currentColor"/>
</svg>`,

  // Ampoules / bulbs
  bulb: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
  <circle cx="12" cy="9" r="5" fill="none" stroke="currentColor" stroke-width="2"/>
  <path d="M9 14 L9 17 L15 17 L15 14" stroke="currentColor" stroke-width="2" fill="none"/>
  <line x1="9" y1="19" x2="15" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <line x1="12" y1="4" x2="12" y2="2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>`,

  // Bandes LED / LED strips
  led_strip: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
  <rect x="3" y="10" width="18" height="4" rx="1" fill="none" stroke="currentColor" stroke-width="2"/>
  <circle cx="6" cy="12" r="1" fill="currentColor"/>
  <circle cx="10" cy="12" r="1" fill="currentColor"/>
  <circle cx="14" cy="12" r="1" fill="currentColor"/>
  <circle cx="18" cy="12" r="1" fill="currentColor"/>
</svg>`,

  // Variateurs / dimmers
  dimmer: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
  <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/>
  <path d="M12 6 L12 12 L16 16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
  <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
</svg>`,

  // Rideaux / curtains
  curtain: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
  <line x1="4" y1="4" x2="20" y2="4" stroke="currentColor" stroke-width="2"/>
  <path d="M6 4 L6 20 M10 4 L10 20 M14 4 L14 20 M18 4 L18 20" stroke="currentColor" stroke-width="1.5"/>
  <line x1="4" y1="20" x2="11" y2="20" stroke="currentColor" stroke-width="2"/>
  <line x1="13" y1="20" x2="20" y2="20" stroke="currentColor" stroke-width="2"/>
</svg>`,

  // Thermostats / TRV
  thermostat: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
  <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/>
  <path d="M12 6 L12 12 L16 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
  <circle cx="12" cy="12" r="2" fill="currentColor"/>
</svg>`,

  // Vannes / valves
  valve: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
  <path d="M12 4 L12 20" stroke="currentColor" stroke-width="2"/>
  <path d="M8 10 L16 10 L16 14 L8 14 Z" fill="none" stroke="currentColor" stroke-width="2"/>
  <circle cx="12" cy="12" r="2" fill="currentColor"/>
</svg>`,

  // Capteurs de fumée / smoke
  smoke: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
  <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/>
  <path d="M8 10 Q10 8 12 10 T16 10" stroke="currentColor" stroke-width="2" fill="none"/>
  <path d="M8 14 Q10 12 12 14 T16 14" stroke="currentColor" stroke-width="2" fill="none"/>
</svg>`,

  // Capteurs de fuite d'eau
  water: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
  <path d="M12 3 L12 3 C12 3, 8 8, 8 13 C8 16.3 9.8 19 12 19 C14.2 19 16 16.3 16 13 C16 8, 12 3, 12 3 Z" fill="none" stroke="currentColor" stroke-width="2"/>
  <circle cx="12" cy="13" r="1.5" fill="currentColor"/>
</svg>`,

  // Boutons SOS / emergency
  sos: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
  <path d="M12 7 L12 13" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="12" cy="16" r="1" fill="currentColor"/>
</svg>`,

  // Boutons sans fil / wireless buttons
  wireless: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
  <rect x="6" y="6" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
  <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/>
  <circle cx="12" cy="12" r="1" fill="currentColor"/>
</svg>`,

  // Scènes / scene controllers
  scene: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
  <rect x="5" y="5" width="14" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
  <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2"/>
  <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2"/>
</svg>`,

  // Sonnettes / doorbells
  doorbell: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
  <path d="M12 3 L12 3 C12 3, 8 6, 8 10 C8 12 9 13 9 13 L15 13 C15 13 16 12 16 10 C16 6, 12 3, 12 3 Z" fill="none" stroke="currentColor" stroke-width="2"/>
  <path d="M9 13 L9 15 L15 15 L15 13" stroke="currentColor" stroke-width="2"/>
  <line x1="7" y1="17" x2="17" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>`,

  // Qualité d'air / air quality
  air_quality: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
  <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/>
  <path d="M8 10 L16 10 M8 14 L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <circle cx="10" cy="10" r="0.5" fill="currentColor"/>
  <circle cx="14" cy="10" r="0.5" fill="currentColor"/>
</svg>`,

  // Sirènes / sirens
  siren: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
  <path d="M6 16 L18 16 L16 8 L8 8 Z" fill="none" stroke="currentColor" stroke-width="2"/>
  <line x1="8" y1="16" x2="7" y2="20" stroke="currentColor" stroke-width="2"/>
  <line x1="16" y1="16" x2="17" y2="20" stroke="currentColor" stroke-width="2"/>
  <path d="M10 8 L12 4 L14 8" stroke="currentColor" stroke-width="2" fill="none"/>
</svg>`,

  // Serrures / locks
  lock: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
  <rect x="7" y="11" width="10" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="2"/>
  <path d="M9 11 L9 7 C9 5.3 10.3 4 12 4 C13.7 4 15 5.3 15 7 L15 11" fill="none" stroke="currentColor" stroke-width="2"/>
  <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
</svg>`,

  // Ventilateurs / fans
  fan: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
  <circle cx="12" cy="12" r="2" fill="currentColor"/>
  <path d="M12 4 L12 10 M12 14 L12 20 M4 12 L10 12 M14 12 L20 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
</svg>`,

  // Moniteurs / monitors
  monitor: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
  <rect x="4" y="5" width="16" height="11" rx="1" fill="none" stroke="currentColor" stroke-width="2"/>
  <line x1="9" y1="19" x2="15" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <line x1="12" y1="16" x2="12" y2="19" stroke="currentColor" stroke-width="2"/>
  <circle cx="12" cy="10" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
</svg>`,

  // Par défaut
  default: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
  <rect x="5" y="5" width="14" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
  <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/>
  <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
</svg>`
};

// Déterminer le type d'appareil basé sur le nom du pilote
function getDeviceType(driverName) {
  const name = driverName.toLowerCase();
  
  // Capteurs de mouvement
  if (name.includes('motion') || name.includes('pir') || name.includes('presence') || name.includes('radar')) {
    return 'motion';
  }
  
  // Capteurs de contact
  if (name.includes('contact') || name.includes('door') || name.includes('window')) {
    return 'contact';
  }
  
  // Capteurs de température/humidité
  if (name.includes('temperature') || name.includes('humidity') || name.includes('temp') || name.includes('humid') || name.includes('climate')) {
    return 'temperature';
  }
  
  // Interrupteurs
  if (name.includes('switch') && !name.includes('wireless') && !name.includes('remote')) {
    return 'switch';
  }
  
  // Prises
  if (name.includes('plug') || name.includes('socket') || name.includes('outlet')) {
    return 'plug';
  }
  
  // Ampoules
  if (name.includes('bulb') || name.includes('lamp')) {
    return 'bulb';
  }
  
  // Bandes LED
  if (name.includes('led') || name.includes('strip')) {
    return 'led_strip';
  }
  
  // Variateurs
  if (name.includes('dimmer')) {
    return 'dimmer';
  }
  
  // Rideaux
  if (name.includes('curtain') || name.includes('blind') || name.includes('roller') || name.includes('shutter')) {
    return 'curtain';
  }
  
  // Thermostats
  if (name.includes('thermostat') || name.includes('trv') || name.includes('radiator')) {
    return 'thermostat';
  }
  
  // Vannes
  if (name.includes('valve')) {
    return 'valve';
  }
  
  // Capteurs de fumée
  if (name.includes('smoke') || name.includes('fire')) {
    return 'smoke';
  }
  
  // Capteurs de fuite d'eau
  if (name.includes('water') || name.includes('leak') || name.includes('flood')) {
    return 'water';
  }
  
  // Boutons SOS
  if (name.includes('sos') || name.includes('emergency') || name.includes('panic')) {
    return 'sos';
  }
  
  // Boutons sans fil
  if (name.includes('wireless') || name.includes('remote') || name.includes('button')) {
    return 'wireless';
  }
  
  // Contrôleurs de scène
  if (name.includes('scene')) {
    return 'scene';
  }
  
  // Sonnettes
  if (name.includes('doorbell') || name.includes('chime')) {
    return 'doorbell';
  }
  
  // Qualité d'air
  if (name.includes('air') || name.includes('co2') || name.includes('pm25') || name.includes('pm2.5')) {
    return 'air_quality';
  }
  
  // Sirènes
  if (name.includes('siren') || name.includes('alarm')) {
    return 'siren';
  }
  
  // Serrures
  if (name.includes('lock')) {
    return 'lock';
  }
  
  // Ventilateurs
  if (name.includes('fan')) {
    return 'fan';
  }
  
  // Moniteurs
  if (name.includes('monitor') || name.includes('sensor') || name.includes('detector')) {
    return 'monitor';
  }
  
  return 'default';
}

// Générer les icônes manquantes
async function generateMissingIcons() {
  console.log('🎨 Génération des icônes manquantes...\n');
  console.log('='.repeat(80));
  
  const drivers = fs.readdirSync(CONFIG.driversDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  let generated = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const driverName of drivers) {
    const driverPath = path.join(CONFIG.driversDir, driverName);
    const assetsPath = path.join(driverPath, 'assets');
    const iconPath = path.join(assetsPath, 'icon.svg');
    
    // Vérifier si l'icône existe déjà
    if (fs.existsSync(iconPath)) {
      skipped++;
      continue;
    }
    
    try {
      // Créer le dossier assets s'il n'existe pas
      if (!fs.existsSync(assetsPath)) {
        fs.mkdirSync(assetsPath, { recursive: true });
      }
      
      // Déterminer le type d'appareil
      const deviceType = getDeviceType(driverName);
      const svgTemplate = SVG_TEMPLATES[deviceType];
      
      // Créer l'icône
      fs.writeFileSync(iconPath, svgTemplate);
      
      console.log(`✅ ${driverName} → ${deviceType}`);
      generated++;
      
    } catch (err) {
      console.error(`❌ ${driverName}: ${err.message}`);
      errors++;
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`\n📊 RÉSUMÉ:`);
  console.log(`  Icônes générées:  ${generated}`);
  console.log(`  Déjà existantes:  ${skipped}`);
  console.log(`  Erreurs:          ${errors}`);
  console.log(`\n✅ Génération terminée!\n`);
}

// Point d'entrée
generateMissingIcons().catch(err => {
  console.error('❌ Erreur:', err);
  process.exit(1);
});
