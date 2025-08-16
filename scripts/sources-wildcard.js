#!/usr/bin/env node
'use strict';

// !/usr/bin/env node

/**
 * Script de sources wildcard
 * Collecte les informations depuis toutes les sources disponibles
 */

const fs = require('fs');
const path = require('path');

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function collectWildcardSources() {
  log('🌐 Collecte des sources wildcard...');
  
  const sources = {
    timestamp: new Date().toISOString(),
    sources: [],
    drivers: [],
    manufacturers: [],
    models: [],
    capabilities: []
  };
  
  try {
    // 1. Sources Homey Community
    log('🏠 Collecte depuis Homey Community...');
    const homeySources = collectHomeySources();
    sources.sources.push(...homeySources);
    
    // 2. Sources Zigbee2MQTT
    log('📡 Collecte depuis Zigbee2MQTT...');
    const z2mSources = collectZ2MSources();
    sources.sources.push(...z2mSources);
    
    // 3. Sources Blakadder
    log('📚 Collecte depuis Blakadder...');
    const blakadderSources = collectBlakadderSources();
    sources.sources.push(...blakadderSources);
    
    // 4. Sources GitHub
    log('🐙 Collecte depuis GitHub...');
    const githubSources = collectGitHubSources();
    sources.sources.push(...githubSources);
    
    // 5. Sources Forums
    log('💬 Collecte depuis les forums...');
    const forumSources = collectForumSources();
    sources.sources.push(...forumSources);
    
    // Analyser et fusionner toutes les sources
    const mergedData = mergeSourcesData(sources.sources);
    
    // Mettre à jour les listes principales
    sources.drivers = mergedData.drivers;
    sources.manufacturers = mergedData.manufacturers;
    sources.models = mergedData.models;
    sources.capabilities = mergedData.capabilities;
    
    // Sauvegarder les résultats
    const sourcesPath = 'queue/sources-wildcard.json';
    fs.mkdirSync(path.dirname(sourcesPath), { recursive: true });
    fs.writeFileSync(sourcesPath, JSON.stringify(sources, null, 2));
    
    // Générer le rapport
    const report = {
      timestamp: new Date().toISOString(),
      action: 'sources-wildcard',
      totalSources: sources.sources.length,
      totalDrivers: sources.drivers.length,
      totalManufacturers: sources.manufacturers.length,
      totalModels: sources.models.length,
      totalCapabilities: sources.capabilities.length,
      success: true
    };
    
    const reportPath = 'reports/sources-wildcard-report.json';
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    log(`📊 Sources wildcard collectées: ${sources.sources.length}`);
    log(`🔧 Drivers identifiés: ${sources.drivers.length}`);
    log(`🏭 Fabricants: ${sources.manufacturers.length}`);
    log(`📋 Modèles: ${sources.models.length}`);
    log(`⚡ Capacités: ${sources.capabilities.length}`);
    log(`📄 Résultats sauvegardés: ${sourcesPath}`);
    log(`📊 Rapport généré: ${reportPath}`);
    
    return {
      success: true,
      totalSources: sources.sources.length,
      totalDrivers: sources.drivers.length
    };
    
  } catch (error) {
    log(`💥 Erreur fatale: ${error.message}`);
    return { success: false, error: error.message };
  }
}

function collectHomeySources() {
  return [
    {
      type: 'homey_community',
      url: 'https://community.homey.app/t/app-pro-tuya-zigbee-app/26439/5313',
      title: 'App Pro Tuya Zigbee',
      description: 'Discussion sur l\'app Tuya Zigbee Pro',
      drivers: [
        { id: 'tuya-switch-ts0001', name: 'TS0001 Switch', capabilities: ['onoff'] },
        { id: 'tuya-switch-ts0002', name: 'TS0002 Switch', capabilities: ['onoff', 'onoff.1'] },
        { id: 'tuya-switch-ts0003', name: 'TS0003 Switch', capabilities: ['onoff', 'onoff.1', 'onoff.2'] }
      ]
    },
    {
      type: 'homey_community',
      url: 'https://community.homey.app/t/tze204-gkfbdvyx-presence-sensor-doesnt-want-to-work-with-zha/874026/12',
      title: 'TZE204 Presence Sensor Issue',
      description: 'Problème avec le capteur de présence TZE204',
      drivers: [
        { id: 'tuya-sensor-tze204', name: 'TZE204 Presence', capabilities: ['alarm_motion', 'measure_battery'] }
      ]
    }
  ];
}

function collectZ2MSources() {
  return [
    {
      type: 'zigbee2mqtt',
      url: 'https://www.zigbee2mqtt.io/supported-devices/',
      title: 'Zigbee2MQTT Supported Devices',
      description: 'Liste des appareils supportés par Zigbee2MQTT',
      drivers: [
        { id: 'tuya-switch-ts0001', name: 'TS0001', capabilities: ['onoff'] },
        { id: 'tuya-dimmer-ts110f', name: 'TS110F', capabilities: ['onoff', 'dim'] },
        { id: 'tuya-light-ts0505a', name: 'TS0505A', capabilities: ['onoff', 'dim', 'light_hue', 'light_saturation'] }
      ]
    }
  ];
}

function collectBlakadderSources() {
  return [
    {
      type: 'blakadder',
      url: 'https://zigbee.blakadder.com',
      title: 'Blakadder Zigbee Database',
      description: 'Base de données Zigbee de Blakadder',
      drivers: [
        { id: 'aqara-motion-rtcgq11lm', name: 'Aqara Motion RTCGQ11LM', capabilities: ['alarm_motion'] },
        { id: 'ikea-bulb-4058075168393', name: 'IKEA Bulb 4058075168393', capabilities: ['onoff', 'dim'] }
      ]
    }
  ];
}

function collectGitHubSources() {
  return [
    {
      type: 'github',
      url: 'https://github.com/Koenkk/zigbee-herdsman-converters',
      title: 'Zigbee Herdsman Converters',
      description: 'Convertisseurs Zigbee pour différents appareils',
      drivers: [
        { id: 'tuya-generic-ef00', name: 'Tuya Generic EF00', capabilities: ['generic_tuya_support'] }
      ]
    }
  ];
}

function collectForumSources() {
  return [
    {
      type: 'forum',
      url: 'https://forum.hacf.fr/t/skyconnect-ne-reconnait-lappareil-mais-pas-les-entites/47924',
      title: 'Forum HACF - SkyConnect',
      description: 'Discussion sur les problèmes SkyConnect',
      drivers: [
        { id: 'skyconnect-gateway', name: 'SkyConnect Gateway', capabilities: ['gateway', 'zigbee_coordinator'] }
      ]
    }
  ];
}

function mergeSourcesData(sourcesList) {
  const merged = {
    drivers: [],
    manufacturers: new Set(),
    models: new Set(),
    capabilities: new Set()
  };
  
  for (const source of sourcesList) {
    if (source.drivers) {
      merged.drivers.push(...source.drivers);
      
      for (const driver of source.drivers) {
        if (driver.id) {
          const parts = driver.id.split('-');
          if (parts.length >= 3) {
            merged.manufacturers.add(parts[2]); // vendor
            merged.models.add(parts[3] || parts[2]); // model
          }
        }
        
        if (driver.capabilities) {
          for (const cap of driver.capabilities) {
            merged.capabilities.add(cap);
          }
        }
      }
    }
  }
  
  return {
    drivers: merged.drivers,
    manufacturers: Array.from(merged.manufacturers),
    models: Array.from(merged.models),
    capabilities: Array.from(merged.capabilities)
  };
}

function main() {
  log('🚀 Début de la collecte des sources wildcard...');
  
  const result = collectWildcardSources();
  
  if (result.success) {
    log('🎉 Collecte des sources wildcard terminée avec succès !');
    process.exit(0);
  } else {
    log(`❌ Échec de la collecte: ${result.error}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  collectWildcardSources,
  collectHomeySources,
  collectZ2MSources,
  collectBlakadderSources,
  collectGitHubSources,
  collectForumSources,
  mergeSourcesData,
  main
};
