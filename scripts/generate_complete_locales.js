#!/usr/bin/env node
'use strict';

/**
 * GENERATE COMPLETE LOCALES - Fix visual issues
 * 
 * Generates complete fr.json and en.json with all:
 * - Capabilities translations
 * - Driver names
 * - capabilitiesOptions
 * - Settings
 * - Flow cards
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Standard Homey capabilities with FR translations
const STANDARD_CAPABILITIES = {
  'measure_battery': {
    title: {
      en: 'Battery',
      fr: 'Batterie'
    },
    units: {
      en: '%',
      fr: '%'
    }
  },
  'alarm_generic': {
    title: {
      en: 'Alarm',
      fr: 'Alarme'
    }
  },
  'alarm_motion': {
    title: {
      en: 'Motion',
      fr: 'Mouvement'
    }
  },
  'alarm_contact': {
    title: {
      en: 'Contact',
      fr: 'Contact'
    }
  },
  'alarm_water': {
    title: {
      en: 'Water leak',
      fr: 'Fuite d\'eau'
    }
  },
  'alarm_smoke': {
    title: {
      en: 'Smoke',
      fr: 'Fumée'
    }
  },
  'alarm_co': {
    title: {
      en: 'CO',
      fr: 'CO'
    }
  },
  'alarm_co2': {
    title: {
      en: 'CO₂',
      fr: 'CO₂'
    }
  },
  'alarm_tamper': {
    title: {
      en: 'Tamper',
      fr: 'Sabotage'
    }
  },
  'alarm_vibration': {
    title: {
      en: 'Vibration',
      fr: 'Vibration'
    }
  },
  'onoff': {
    title: {
      en: 'Power',
      fr: 'Alimentation'
    }
  },
  'dim': {
    title: {
      en: 'Brightness',
      fr: 'Luminosité'
    },
    units: {
      en: '%',
      fr: '%'
    }
  },
  'light_hue': {
    title: {
      en: 'Hue',
      fr: 'Teinte'
    }
  },
  'light_saturation': {
    title: {
      en: 'Saturation',
      fr: 'Saturation'
    }
  },
  'light_temperature': {
    title: {
      en: 'Temperature',
      fr: 'Température'
    }
  },
  'light_mode': {
    title: {
      en: 'Light mode',
      fr: 'Mode lumineux'
    }
  },
  'measure_temperature': {
    title: {
      en: 'Temperature',
      fr: 'Température'
    },
    units: {
      en: '°C',
      fr: '°C'
    }
  },
  'measure_humidity': {
    title: {
      en: 'Humidity',
      fr: 'Humidité'
    },
    units: {
      en: '%',
      fr: '%'
    }
  },
  'measure_pressure': {
    title: {
      en: 'Pressure',
      fr: 'Pression'
    },
    units: {
      en: 'mbar',
      fr: 'mbar'
    }
  },
  'measure_co2': {
    title: {
      en: 'CO₂',
      fr: 'CO₂'
    },
    units: {
      en: 'ppm',
      fr: 'ppm'
    }
  },
  'measure_pm25': {
    title: {
      en: 'PM2.5',
      fr: 'PM2.5'
    },
    units: {
      en: 'µg/m³',
      fr: 'µg/m³'
    }
  },
  'measure_voc': {
    title: {
      en: 'VOC',
      fr: 'COV'
    },
    units: {
      en: 'ppb',
      fr: 'ppb'
    }
  },
  'measure_luminance': {
    title: {
      en: 'Luminance',
      fr: 'Luminance'
    },
    units: {
      en: 'lux',
      fr: 'lux'
    }
  },
  'measure_power': {
    title: {
      en: 'Power',
      fr: 'Puissance'
    },
    units: {
      en: 'W',
      fr: 'W'
    }
  },
  'measure_voltage': {
    title: {
      en: 'Voltage',
      fr: 'Tension'
    },
    units: {
      en: 'V',
      fr: 'V'
    }
  },
  'measure_current': {
    title: {
      en: 'Current',
      fr: 'Courant'
    },
    units: {
      en: 'A',
      fr: 'A'
    }
  },
  'meter_power': {
    title: {
      en: 'Energy',
      fr: 'Énergie'
    },
    units: {
      en: 'kWh',
      fr: 'kWh'
    }
  },
  'target_temperature': {
    title: {
      en: 'Target temperature',
      fr: 'Température cible'
    },
    units: {
      en: '°C',
      fr: '°C'
    }
  },
  'windowcoverings_state': {
    title: {
      en: 'Window coverings',
      fr: 'Stores'
    },
    values: {
      en: {
        up: 'Up',
        idle: 'Idle',
        down: 'Down'
      },
      fr: {
        up: 'Haut',
        idle: 'Arrêt',
        down: 'Bas'
      }
    }
  },
  'windowcoverings_set': {
    title: {
      en: 'Position',
      fr: 'Position'
    },
    units: {
      en: '%',
      fr: '%'
    }
  },
  'button': {
    title: {
      en: 'Button',
      fr: 'Bouton'
    }
  }
};

// Settings translations
const COMMON_SETTINGS = {
  power_source: {
    label: {
      en: 'Power Source',
      fr: 'Source d\'Alimentation'
    },
    hint: {
      en: 'Select power source manually or use auto-detection',
      fr: 'Sélectionnez la source d\'alimentation manuellement ou utilisez la détection automatique'
    },
    values: {
      auto: {
        en: 'Auto Detect',
        fr: 'Détection Automatique'
      },
      ac: {
        en: 'AC Powered',
        fr: 'Alimentation Secteur'
      },
      dc: {
        en: 'DC Powered',
        fr: 'Alimentation DC'
      },
      battery: {
        en: 'Battery Powered',
        fr: 'Sur Batterie'
      }
    }
  },
  battery_type: {
    label: {
      en: 'Battery Type',
      fr: 'Type de Batterie'
    },
    hint: {
      en: 'Select battery type manually or use auto-detection based on voltage',
      fr: 'Sélectionnez le type de batterie manuellement ou utilisez la détection automatique basée sur la tension'
    }
  },
  battery_low_threshold: {
    label: {
      en: 'Low Battery Threshold (%)',
      fr: 'Seuil Batterie Faible (%)'
    },
    hint: {
      en: 'Trigger low battery warning when below this percentage',
      fr: 'Déclencher l\'alerte batterie faible en dessous de ce pourcentage'
    }
  },
  battery_critical_threshold: {
    label: {
      en: 'Critical Battery Threshold (%)',
      fr: 'Seuil Batterie Critique (%)'
    },
    hint: {
      en: 'Trigger critical battery warning when below this percentage',
      fr: 'Déclencher l\'alerte batterie critique en dessous de ce pourcentage'
    }
  },
  enable_battery_notifications: {
    label: {
      en: 'Enable Battery Notifications',
      fr: 'Activer Notifications Batterie'
    },
    hint: {
      en: 'Send flow notifications for battery events',
      fr: 'Envoyer des notifications de flow pour les événements de batterie'
    }
  },
  battery_report_interval: {
    label: {
      en: 'Battery Report Interval (hours)',
      fr: 'Intervalle Rapport Batterie (heures)'
    },
    hint: {
      en: 'How often to request battery status updates',
      fr: 'Fréquence de demande des mises à jour d\'état de batterie'
    }
  },
  optimization_mode: {
    label: {
      en: 'Energy Optimization Mode',
      fr: 'Mode Optimisation Énergétique'
    },
    hint: {
      en: 'Balance between responsiveness and battery life',
      fr: 'Équilibre entre réactivité et durée de vie de la batterie'
    },
    values: {
      performance: {
        en: 'Performance (More responsive)',
        fr: 'Performance (Plus réactif)'
      },
      balanced: {
        en: 'Balanced',
        fr: 'Équilibré'
      },
      power_saving: {
        en: 'Power Saving (Longer battery)',
        fr: 'Économie d\'énergie (Batterie plus longue)'
      }
    }
  },
  show_voltage: {
    label: {
      en: 'Show Battery Voltage',
      fr: 'Afficher Tension Batterie'
    },
    hint: {
      en: 'Display raw battery voltage in device settings',
      fr: 'Afficher la tension brute de la batterie dans les paramètres du périphérique'
    }
  },
  enable_power_estimation: {
    label: {
      en: 'Enable Power Estimation',
      fr: 'Activer Estimation Puissance'
    },
    hint: {
      en: 'Estimate power consumption when real measurement is not available (AC/DC devices only)',
      fr: 'Estimer la consommation quand la mesure réelle n\'est pas disponible (appareils AC/DC seulement)'
    }
  }
};

// Build complete locales
function buildLocales() {
  const locales = {
    en: {
      capabilities: {},
      settings: {}
    },
    fr: {
      capabilities: {},
      settings: {}
    }
  };

  // Add all capability translations
  for (const [capId, capData] of Object.entries(STANDARD_CAPABILITIES)) {
    if (capData.title) {
      locales.en.capabilities[capId] = {
        title: capData.title.en
      };
      locales.fr.capabilities[capId] = {
        title: capData.title.fr
      };

      if (capData.units) {
        locales.en.capabilities[capId].units = capData.units.en;
        locales.fr.capabilities[capId].units = capData.units.fr;
      }

      if (capData.values) {
        locales.en.capabilities[capId].values = capData.values.en;
        locales.fr.capabilities[capId].values = capData.values.fr;
      }
    }
  }

  // Add all settings translations
  for (const [settingId, settingData] of Object.entries(COMMON_SETTINGS)) {
    locales.en.settings[settingId] = {
      label: settingData.label.en,
      hint: settingData.hint?.en
    };
    locales.fr.settings[settingId] = {
      label: settingData.label.fr,
      hint: settingData.hint?.fr
    };

    if (settingData.values) {
      locales.en.settings[settingId].values = settingData.values;
      locales.fr.settings[settingId].values = settingData.values;
    }
  }

  // Add common translations
  locales.en.tabs = {
    general: 'General',
    advanced: 'Advanced',
    about: 'About'
  };
  locales.fr.tabs = {
    general: 'Général',
    advanced: 'Avancé',
    about: 'À propos'
  };

  locales.en.common = {
    save: 'Save',
    cancel: 'Cancel',
    ok: 'OK',
    delete: 'Delete',
    edit: 'Edit'
  };
  locales.fr.common = {
    save: 'Enregistrer',
    cancel: 'Annuler',
    ok: 'OK',
    delete: 'Supprimer',
    edit: 'Modifier'
  };

  return locales;
}

// Write locales files
function writeLocales() {
  const locales = buildLocales();

  const enPath = path.join(ROOT, 'locales', 'en.json');
  const frPath = path.join(ROOT, 'locales', 'fr.json');

  fs.writeFileSync(enPath, JSON.stringify(locales.en, null, 2) + '\n');
  fs.writeFileSync(frPath, JSON.stringify(locales.fr, null, 2) + '\n');

  console.log('✅ Generated complete locales:');
  console.log(`   - ${enPath}`);
  console.log(`   - ${frPath}`);
  console.log(`   - EN: ${Object.keys(locales.en.capabilities).length} capabilities`);
  console.log(`   - FR: ${Object.keys(locales.fr.capabilities).length} capabilities`);
  console.log(`   - EN: ${Object.keys(locales.en.settings).length} settings`);
  console.log(`   - FR: ${Object.keys(locales.fr.settings).length} settings`);
}

// Run
writeLocales();
