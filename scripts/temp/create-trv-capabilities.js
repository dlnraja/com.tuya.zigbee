const fs = require('fs');
const path = require('path');

// Create missing custom capabilities for TRV driver
const capabilitiesDir = '.homeycompose/capabilities';

// window_detection capability
const windowDetection = {
  "type": "boolean",
  "title": {
    "en": "Window Detection",
    "fr": "Détection Fenêtre"
  },
  "desc": {
    "en": "Automatically turn off heating when window is opened",
    "fr": "Éteint automatiquement le chauffage quand la fenêtre est ouverte"
  },
  "getable": true,
  "setable": true,
  "uiComponent": "toggle",
  "icon": "/assets/capability_icons/window_detection.svg"
};

fs.writeFileSync(
  path.join(capabilitiesDir, 'window_detection.json'),
  JSON.stringify(windowDetection, null, 2)
);

// boost_mode capability
const boostMode = {
  "type": "boolean",
  "title": {
    "en": "Boost Mode",
    "fr": "Mode Boost"
  },
  "desc": {
    "en": "Temporarily heat at maximum power",
    "fr": "Chauffage temporaire à puissance maximale"
  },
  "getable": true,
  "setable": true,
  "uiComponent": "toggle",
  "icon": "/assets/capability_icons/boost_mode.svg"
};

fs.writeFileSync(
  path.join(capabilitiesDir, 'boost_mode.json'),
  JSON.stringify(boostMode, null, 2)
);

// valve_position capability
const valvePosition = {
  "type": "number",
  "title": {
    "en": "Valve Position",
    "fr": "Position Vanne"
  },
  "desc": {
    "en": "Current valve opening percentage",
    "fr": "Pourcentage d'ouverture de la vanne"
  },
  "units": {
    "en": "%"
  },
  "getable": true,
  "setable": false,
  "uiComponent": "sensor",
  "min": 0,
  "max": 100,
  "decimals": 0,
  "icon": "/assets/capability_icons/valve_position.svg"
};

fs.writeFileSync(
  path.join(capabilitiesDir, 'valve_position.json'),
  JSON.stringify(valvePosition, null, 2)
);

// temperature_calibration capability
const tempCalibration = {
  "type": "number",
  "title": {
    "en": "Temperature Calibration",
    "fr": "Calibration Température"
  },
  "desc": {
    "en": "Temperature offset for local sensor",
    "fr": "Décalage de température pour le capteur local"
  },
  "units": {
    "en": "°C"
  },
  "getable": true,
  "setable": true,
  "uiComponent": "slider",
  "min": -5,
  "max": 5,
  "step": 0.1,
  "decimals": 1
};

fs.writeFileSync(
  path.join(capabilitiesDir, 'temperature_calibration.json'),
  JSON.stringify(tempCalibration, null, 2)
);

// eco_temperature capability
const ecoTemperature = {
  "type": "number",
  "title": {
    "en": "Eco Temperature",
    "fr": "Température Éco"
  },
  "desc": {
    "en": "Temperature in eco mode",
    "fr": "Température en mode éco"
  },
  "units": {
    "en": "°C"
  },
  "getable": true,
  "setable": true,
  "uiComponent": "slider",
  "min": 5,
  "max": 25,
  "step": 0.5,
  "decimals": 1
};

fs.writeFileSync(
  path.join(capabilitiesDir, 'eco_temperature.json'),
  JSON.stringify(ecoTemperature, null, 2)
);

// frost_protection_temperature capability
const frostProtectionTemp = {
  "type": "number",
  "title": {
    "en": "Frost Protection Temperature",
    "fr": "Température Antigel"
  },
  "desc": {
    "en": "Minimum temperature for frost protection",
    "fr": "Température minimale pour protection antigel"
  },
  "units": {
    "en": "°C"
  },
  "getable": true,
  "setable": true,
  "uiComponent": "slider",
  "min": 5,
  "max": 10,
  "step": 0.5,
  "decimals": 1
};

fs.writeFileSync(
  path.join(capabilitiesDir, 'frost_protection_temperature.json'),
  JSON.stringify(frostProtectionTemp, null, 2)
);

console.log('✅ Created 6 custom capabilities for TRV:');
console.log('   - window_detection');
console.log('   - boost_mode');
console.log('   - valve_position');
console.log('   - temperature_calibration');
console.log('   - eco_temperature');
console.log('   - frost_protection_temperature');
