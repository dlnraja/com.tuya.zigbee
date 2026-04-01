const fs = require('fs');
const glob = require('glob');
const path = require('path');

const deviceFiles = glob.sync('drivers/*/device.js');
let buttonDrivers = [];

deviceFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('extends ButtonDevice') || content.includes('ButtonDevice = require')) {
    buttonDrivers.push(path.dirname(file));
  }
});

// Also check for drivers with button capabilities
const composeFiles = glob.sync('drivers/*/driver.compose.json');
composeFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('"button.1"')) {
    const dir = path.dirname(file);
    if (!buttonDrivers.includes(dir)) {
      buttonDrivers.push(dir);
    }
  }
});

// filter out duplicates
buttonDrivers = [...new Set(buttonDrivers)];

const settingToAdd = {
  "id": "button_mode",
  "type": "dropdown",
  "label": {
    "en": "Operating Mode",
    "fr": "Mode de fonctionnement"
  },
  "hint": {
    "en": "Scene Mode allows single/double/long press. Dimmer Mode only supports single press. Auto tries to detect and switch automatically.",
    "fr": "Le mode Scène permet les appuis simples/doubles/longs. Le mode Variateur ne supporte que l'appui simple. Auto tente de détecter et basculer automatiquement."
  },
  "value": "auto",
  "values": [
    {
      "id": "auto",
      "label": {
        "en": "Auto-Detect",
        "fr": "Détection Auto"
      }
    },
    {
      "id": "scene",
      "label": {
        "en": "Scene Mode (Multi-press)",
        "fr": "Mode Scène (Multi-clics)"
      }
    },
    {
      "id": "dimmer",
      "label": {
        "en": "Dimmer Mode",
        "fr": "Mode Variateur"
      }
    }
  ]
};

let updatedCount = 0;

buttonDrivers.forEach(dir => {
  const composePath = path.join(dir, 'driver.compose.json');
  if (fs.existsSync(composePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      
      if (!data.settings) {
        data.settings = [];
      }
      
      const hasSetting = data.settings.some(s => s.id === 'button_mode');
      if (!hasSetting) {
        data.settings.push(settingToAdd);
        fs.writeFileSync(composePath, JSON.stringify(data, null, 2) + '\n');
        console.log('Updated ' + composePath);
        updatedCount++;
      }
    } catch (e) {
      console.error('Error parsing ' + composePath + ': ' + e.message);
    }
  }
});

console.log('Updated ' + updatedCount + ' drivers with button_mode setting.');
