const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const NEW_SETTINGS = [
  {
    "id": "enable_virtual_energy",
    "type": "checkbox",
    "label": {
      "en": "Enable Virtual Energy Meter",
      "fr": "Activer le Compteur d'Ã‰nergie Virtuel"
    },
    "value": true,
    "hint": {
      "en": "Calculate energy based on state when hardware meter is missing",
      "fr": "Calcule l'Ã©nergie selon l'Ã©tat si le compteur physique manque"
    }
  },
  {
    "id": "radio_sensitivity",
    "type": "number",
    "label": {
      "en": "Radio Presence Sensitivity",
      "fr": "SensibilitÃ© PrÃ©sence Radio"
    },
    "value": 15,
    "min": 5,
    "max": 50,
    "hint": {
      "en": "LQI variance threshold for presence sensing (higher = less sensitive)",
      "fr": "Seuil de variance LQI pour la dÃ©tection (plus haut = moins sensible)"
    }
  }
];

function injectSettings() {
  console.log(' Injecting Autonomous Features settings into all drivers...');
  
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(f => fs.statSync(path.join(DRIVERS_DIR, f)).isDirectory());
  
  let successCount = 0;
  
  drivers.forEach(driver => {
    const composeFile = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
    if (!fs.existsSync(composeFile)) return;
    
    try {
      let raw = fs.readFileSync(composeFile, 'utf8');
      let compose = JSON.parse(raw);
      
      if (!compose.settings) {
        compose.settings = [];
      }
      
      // Check if already injected
      const hasVirtual = compose.settings.some(s => s.id === 'enable_virtual_energy');
      if (hasVirtual) return;
      
      compose.settings.push(...NEW_SETTINGS);
      
      fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2) + '\n');
      successCount++;
    } catch (e) {
      console.error(`   Error in ${driver}: ${e.message}`);
    }
  });
  
  console.log(`\n Injected settings into ${successCount} drivers.`);
}

injectSettings();
