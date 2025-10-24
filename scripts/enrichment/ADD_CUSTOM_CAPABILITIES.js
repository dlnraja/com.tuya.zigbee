#!/usr/bin/env node

/**
 * ADD_CUSTOM_CAPABILITIES.js
 * Ajoute les custom capabilities manquantes à app.json
 */

const fs = require('fs');
const path = require('path');

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║   📝 AJOUT CUSTOM CAPABILITIES À APP.JSON             ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

const CUSTOM_CAPABILITIES = {
  "measure_angle": {
    "type": "number",
    "title": {
      "en": "Opening Angle",
      "fr": "Angle d'ouverture"
    },
    "units": {
      "en": "°"
    },
    "decimals": 0,
    "min": 0,
    "max": 180,
    "desc": {
      "en": "Door/window opening angle in degrees",
      "fr": "Angle d'ouverture porte/fenêtre en degrés"
    },
    "chartType": "stepLine",
    "getable": true,
    "setable": false,
    "uiComponent": "sensor"
  },
  "battery_state": {
    "type": "enum",
    "title": {
      "en": "Battery State",
      "fr": "État batterie"
    },
    "desc": {
      "en": "Battery health state",
      "fr": "État de santé de la batterie"
    },
    "values": [
      {
        "id": "low",
        "title": {
          "en": "Low",
          "fr": "Faible"
        }
      },
      {
        "id": "medium",
        "title": {
          "en": "Medium",
          "fr": "Moyen"
        }
      },
      {
        "id": "high",
        "title": {
          "en": "High",
          "fr": "Élevé"
        }
      },
      {
        "id": "charging",
        "title": {
          "en": "Charging",
          "fr": "En charge"
        }
      }
    ],
    "getable": true,
    "setable": false,
    "uiComponent": "sensor"
  },
  "measure_smoke": {
    "type": "number",
    "title": {
      "en": "Smoke Level",
      "fr": "Niveau fumée"
    },
    "units": {
      "en": "ppm"
    },
    "decimals": 0,
    "min": 0,
    "max": 1000,
    "desc": {
      "en": "Smoke concentration level in parts per million",
      "fr": "Niveau de concentration de fumée en parties par million"
    },
    "chartType": "stepLine",
    "getable": true,
    "setable": false,
    "uiComponent": "sensor"
  },
  "alarm_fault": {
    "type": "boolean",
    "title": {
      "en": "Fault Alarm",
      "fr": "Alarme défaut"
    },
    "desc": {
      "en": "Device fault or malfunction detected",
      "fr": "Défaut ou dysfonctionnement du dispositif détecté"
    },
    "getable": true,
    "setable": false,
    "uiComponent": "sensor"
  },
  "alarm_temperature": {
    "type": "boolean",
    "title": {
      "en": "Temperature Alarm",
      "fr": "Alarme température"
    },
    "desc": {
      "en": "Temperature threshold exceeded",
      "fr": "Seuil de température dépassé"
    },
    "getable": true,
    "setable": false,
    "uiComponent": "sensor"
  }
};

// Lire app.json
const appJsonPath = 'app.json';
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// Vérifier si capabilities existe
if (!appJson.capabilities) {
  appJson.capabilities = {};
  console.log('   ℹ️  Création section capabilities\n');
}

let added = 0;
let existing = 0;

console.log('🔍 Vérification capabilities...\n');

Object.entries(CUSTOM_CAPABILITIES).forEach(([key, definition]) => {
  if (appJson.capabilities[key]) {
    console.log(`   ℹ️  ${key}: déjà présent`);
    existing++;
  } else {
    appJson.capabilities[key] = definition;
    console.log(`   ✅ ${key}: ajouté`);
    added++;
  }
});

console.log('');

if (added > 0) {
  // Sauvegarder
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
  
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║                  RÉSUMÉ AJOUT                          ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  console.log(`   ✅ Ajoutées:  ${added}`);
  console.log(`   ℹ️  Existantes: ${existing}`);
  console.log(`   📊 Total:      ${added + existing}`);
  console.log('');
  console.log('✅ app.json mis à jour avec succès!\n');
  console.log('⚡ Prochaine étape: homey app validate\n');
} else {
  console.log('ℹ️  Toutes les capabilities sont déjà présentes.\n');
}
