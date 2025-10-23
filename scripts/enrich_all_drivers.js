#!/usr/bin/env node
'use strict';

/**
 * Enrich All Hybrid Drivers - Advanced Energy Management
 * Adds:
 * - Manual battery type selection
 * - Advanced energy settings
 * - Flow cards for energy events
 * - Enhanced capabilities
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '../drivers');

const ADVANCED_SETTINGS = [
  {
    id: 'power_source',
    type: 'dropdown',
    label: {
      en: 'Power Source',
      fr: 'Source d\'Alimentation'
    },
    value: 'auto',
    values: [
      { id: 'auto', label: { en: 'Auto Detect', fr: 'Détection Automatique' } },
      { id: 'ac', label: { en: 'AC Powered', fr: 'Alimentation Secteur' } },
      { id: 'dc', label: { en: 'DC Powered', fr: 'Alimentation DC' } },
      { id: 'battery', label: { en: 'Battery Powered', fr: 'Sur Batterie' } }
    ],
    hint: {
      en: 'Select power source manually or use auto-detection',
      fr: 'Sélectionnez la source d\'alimentation manuellement ou utilisez la détection automatique'
    }
  },
  {
    id: 'battery_type',
    type: 'dropdown',
    label: {
      en: 'Battery Type',
      fr: 'Type de Batterie'
    },
    value: 'auto',
    values: [
      { id: 'auto', label: { en: 'Auto Detect', fr: 'Détection Automatique' } },
      { id: 'CR2032', label: { en: 'CR2032 (3V Button Cell)', fr: 'CR2032 (Pile Bouton 3V)' } },
      { id: 'CR2450', label: { en: 'CR2450 (3V Button Cell)', fr: 'CR2450 (Pile Bouton 3V)' } },
      { id: 'AAA', label: { en: 'AAA (1.5V)', fr: 'AAA (1.5V)' } },
      { id: 'AA', label: { en: 'AA (1.5V)', fr: 'AA (1.5V)' } },
      { id: 'CR123A', label: { en: 'CR123A (3V)', fr: 'CR123A (3V)' } }
    ],
    hint: {
      en: 'Select battery type manually or use auto-detection based on voltage',
      fr: 'Sélectionnez le type de batterie manuellement ou utilisez la détection automatique basée sur la tension'
    }
  },
  {
    id: 'battery_low_threshold',
    type: 'number',
    label: {
      en: 'Low Battery Threshold (%)',
      fr: 'Seuil Batterie Faible (%)'
    },
    value: 20,
    min: 0,
    max: 50,
    step: 5,
    hint: {
      en: 'Trigger low battery warning when below this percentage',
      fr: 'Déclencher l\'alerte batterie faible en dessous de ce pourcentage'
    }
  },
  {
    id: 'battery_critical_threshold',
    type: 'number',
    label: {
      en: 'Critical Battery Threshold (%)',
      fr: 'Seuil Batterie Critique (%)'
    },
    value: 10,
    min: 0,
    max: 30,
    step: 5,
    hint: {
      en: 'Trigger critical battery warning when below this percentage',
      fr: 'Déclencher l\'alerte batterie critique en dessous de ce pourcentage'
    }
  },
  {
    id: 'enable_battery_notifications',
    type: 'checkbox',
    label: {
      en: 'Enable Battery Notifications',
      fr: 'Activer Notifications Batterie'
    },
    value: true,
    hint: {
      en: 'Send flow notifications for battery events',
      fr: 'Envoyer des notifications de flow pour les événements de batterie'
    }
  },
  {
    id: 'battery_report_interval',
    type: 'number',
    label: {
      en: 'Battery Report Interval (hours)',
      fr: 'Intervalle Rapport Batterie (heures)'
    },
    value: 24,
    min: 1,
    max: 168,
    step: 1,
    hint: {
      en: 'How often to request battery status updates',
      fr: 'Fréquence de demande des mises à jour d\'état de batterie'
    }
  },
  {
    id: 'energy_optimization',
    type: 'dropdown',
    label: {
      en: 'Energy Optimization Mode',
      fr: 'Mode Optimisation Énergétique'
    },
    value: 'balanced',
    values: [
      { id: 'performance', label: { en: 'Performance (More responsive)', fr: 'Performance (Plus réactif)' } },
      { id: 'balanced', label: { en: 'Balanced', fr: 'Équilibré' } },
      { id: 'power_saving', label: { en: 'Power Saving (Longer battery)', fr: 'Économie d\'énergie (Batterie plus longue)' } }
    ],
    hint: {
      en: 'Balance between responsiveness and battery life',
      fr: 'Équilibre entre réactivité et durée de vie de la batterie'
    }
  },
  {
    id: 'show_voltage',
    type: 'checkbox',
    label: {
      en: 'Show Battery Voltage',
      fr: 'Afficher Tension Batterie'
    },
    value: false,
    hint: {
      en: 'Display raw battery voltage in device settings',
      fr: 'Afficher la tension brute de la batterie dans les paramètres du périphérique'
    }
  }
];

const FLOW_CARDS = {
  triggers: [
    {
      id: 'battery_low',
      title: {
        en: 'Battery is Low',
        fr: 'Batterie Faible'
      },
      hint: {
        en: 'Triggered when battery level drops below low threshold',
        fr: 'Déclenché lorsque le niveau de batterie passe en dessous du seuil faible'
      },
      tokens: [
        {
          name: 'battery',
          type: 'number',
          title: { en: 'Battery Level (%)', fr: 'Niveau Batterie (%)' },
          example: 15
        },
        {
          name: 'voltage',
          type: 'number',
          title: { en: 'Voltage (V)', fr: 'Tension (V)' },
          example: 2.8
        }
      ]
    },
    {
      id: 'battery_critical',
      title: {
        en: 'Battery is Critical',
        fr: 'Batterie Critique'
      },
      hint: {
        en: 'Triggered when battery level drops below critical threshold',
        fr: 'Déclenché lorsque le niveau de batterie passe en dessous du seuil critique'
      },
      tokens: [
        {
          name: 'battery',
          type: 'number',
          title: { en: 'Battery Level (%)', fr: 'Niveau Batterie (%)' },
          example: 5
        },
        {
          name: 'voltage',
          type: 'number',
          title: { en: 'Voltage (V)', fr: 'Tension (V)' },
          example: 2.4
        }
      ]
    },
    {
      id: 'battery_charged',
      title: {
        en: 'Battery Fully Charged',
        fr: 'Batterie Complètement Chargée'
      },
      hint: {
        en: 'Triggered when battery reaches 100%',
        fr: 'Déclenché lorsque la batterie atteint 100%'
      }
    },
    {
      id: 'power_source_changed',
      title: {
        en: 'Power Source Changed',
        fr: 'Source d\'Alimentation Changée'
      },
      hint: {
        en: 'Triggered when device switches power source',
        fr: 'Déclenché lorsque l\'appareil change de source d\'alimentation'
      },
      tokens: [
        {
          name: 'power_source',
          type: 'string',
          title: { en: 'Power Source', fr: 'Source d\'Alimentation' },
          example: 'battery'
        }
      ]
    }
  ],
  conditions: [
    {
      id: 'is_battery_powered',
      title: {
        en: 'Is battery powered',
        fr: 'Fonctionne sur batterie'
      },
      hint: {
        en: 'Check if device is currently running on battery',
        fr: 'Vérifier si l\'appareil fonctionne actuellement sur batterie'
      }
    },
    {
      id: 'is_ac_powered',
      title: {
        en: 'Is AC powered',
        fr: 'Fonctionne sur secteur'
      },
      hint: {
        en: 'Check if device is currently running on AC power',
        fr: 'Vérifier si l\'appareil fonctionne actuellement sur secteur'
      }
    },
    {
      id: 'battery_below_threshold',
      title: {
        en: 'Battery below !{{threshold}}%',
        fr: 'Batterie en dessous de !{{threshold}}%'
      },
      titleFormatted: {
        en: 'Battery below [[threshold]]%',
        fr: 'Batterie en dessous de [[threshold]]%'
      },
      args: [
        {
          name: 'threshold',
          type: 'number',
          min: 0,
          max: 100,
          step: 5,
          placeholder: { en: '20', fr: '20' }
        }
      ]
    }
  ],
  actions: [
    {
      id: 'request_battery_update',
      title: {
        en: 'Request battery update',
        fr: 'Demander mise à jour batterie'
      },
      hint: {
        en: 'Force device to report current battery status',
        fr: 'Forcer l\'appareil à rapporter l\'état actuel de la batterie'
      }
    },
    {
      id: 'set_energy_mode',
      title: {
        en: 'Set energy mode to !{{mode}}',
        fr: 'Définir mode énergie à !{{mode}}'
      },
      titleFormatted: {
        en: 'Set energy mode to [[mode]]',
        fr: 'Définir mode énergie à [[mode]]'
      },
      args: [
        {
          name: 'mode',
          type: 'dropdown',
          values: [
            { id: 'performance', label: { en: 'Performance', fr: 'Performance' } },
            { id: 'balanced', label: { en: 'Balanced', fr: 'Équilibré' } },
            { id: 'power_saving', label: { en: 'Power Saving', fr: 'Économie d\'énergie' } }
          ]
        }
      ]
    }
  ]
};

let stats = {
  enriched: 0,
  skipped: 0,
  errors: []
};

function enrichDriver(driverName) {
  const driverPath = path.join(driversDir, driverName);
  const composePath = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    stats.skipped++;
    return;
  }
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf-8'));
    
    // Skip if already has advanced settings
    if (compose.settings && compose.settings.some(s => s.id === 'power_source')) {
      console.log(`⏭️  ${driverName} - Already enriched`);
      stats.skipped++;
      return;
    }
    
    console.log(`🔧 Enriching: ${driverName}`);
    
    // Add advanced settings
    compose.settings = ADVANCED_SETTINGS;
    
    // Update energy configuration
    if (!compose.energy) compose.energy = {};
    compose.energy.batteries = ['CR2032', 'CR2450', 'AAA', 'AA', 'CR123A'];
    compose.energy.approximation = {
      usageConstant: 0.5
    };
    
    // Write back
    fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
    
    console.log(`   ✅ Enriched successfully`);
    stats.enriched++;
    
  } catch (err) {
    console.error(`   ❌ Error: ${err.message}`);
    stats.errors.push({ driver: driverName, error: err.message });
  }
}

function createGlobalFlowCards() {
  const flowPath = path.join(__dirname, '../flow');
  if (!fs.existsSync(flowPath)) {
    fs.mkdirSync(flowPath, { recursive: true });
  }
  
  // Create flow card files
  fs.writeFileSync(
    path.join(flowPath, 'triggers.json'),
    JSON.stringify(FLOW_CARDS.triggers, null, 2)
  );
  
  fs.writeFileSync(
    path.join(flowPath, 'conditions.json'),
    JSON.stringify(FLOW_CARDS.conditions, null, 2)
  );
  
  fs.writeFileSync(
    path.join(flowPath, 'actions.json'),
    JSON.stringify(FLOW_CARDS.actions, null, 2)
  );
  
  console.log('✅ Global flow cards created');
}

function enrichAllDrivers() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   DRIVER ENRICHMENT - ADVANCED ENERGY MANAGEMENT');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const drivers = fs.readdirSync(driversDir)
    .filter(name => fs.statSync(path.join(driversDir, name)).isDirectory())
    .sort();
  
  console.log(`📦 Processing ${drivers.length} drivers...\n`);
  
  for (const driver of drivers) {
    enrichDriver(driver);
  }
  
  // Create global flow cards
  console.log('\n🎯 Creating global flow cards...');
  createGlobalFlowCards();
  
  // Summary
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('   ENRICHMENT SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log(`✅ Enriched: ${stats.enriched}`);
  console.log(`⏭️  Skipped: ${stats.skipped}`);
  console.log(`❌ Errors: ${stats.errors.length}`);
  
  if (stats.errors.length > 0) {
    console.log('\n❌ Errors:');
    for (const err of stats.errors) {
      console.log(`   - ${err.driver}: ${err.error}`);
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════════════\n');
}

// Run enrichment
enrichAllDrivers();
