#!/usr/bin/env node
'use strict';

/**
 * DRIVER ENRICHER MODULE
 * Module intelligent pour enrichissement des drivers
 */

const fs = require('fs');
const path = require('path');

class DriverEnricher {
  constructor(driversPath) {
    this.driversPath = driversPath;
    this.enrichments = [];
    
    // Base de connaissances pour enrichissement
    this.knowledgeBase = {
      capabilities: {
        alarm_motion: {
          description: 'Motion detection',
          class: 'sensor',
          reportConfig: { min: 0, max: 300, change: 1 }
        },
        measure_temperature: {
          description: 'Temperature measurement',
          class: 'sensor',
          reportConfig: { min: 60, max: 3600, change: 0.5 }
        },
        measure_humidity: {
          description: 'Humidity measurement',
          class: 'sensor',
          reportConfig: { min: 60, max: 3600, change: 5 }
        },
        onoff: {
          description: 'On/Off control',
          class: 'socket',
          reportConfig: { min: 0, max: 300, change: 1 }
        }
      },
      
      clusters: {
        0: 'Basic',
        1: 'PowerConfiguration',
        3: 'Identify',
        6: 'OnOff',
        8: 'LevelControl',
        768: 'ColorControl',
        1024: 'IlluminanceMeasurement',
        1026: 'TemperatureMeasurement',
        1029: 'RelativeHumidity',
        1280: 'IASZone'
      }
    };
  }

  // Analyser un driver
  analyzeDriver(driverPath) {
    const driverName = path.basename(driverPath);
    const composeFile = path.join(driverPath, 'driver.compose.json');
    
    if (!fs.existsSync(composeFile)) return null;

    try {
      const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
      
      return {
        name: driverName,
        path: driverPath,
        compose,
        capabilities: compose.capabilities || [],
        clusters: this.extractClusters(compose),
        needsEnrichment: this.needsEnrichment(compose)
      };
    } catch (err) {
      return null;
    }
  }

  // Extraire clusters
  extractClusters(compose) {
    const clusters = new Set();
    
    if (compose.zigbee && compose.zigbee.endpoints) {
      for (const endpoint of Object.values(compose.zigbee.endpoints)) {
        if (endpoint.clusters) {
          endpoint.clusters.forEach(c => clusters.add(c));
        }
      }
    }
    
    return Array.from(clusters);
  }

  // Vérifier si besoin d'enrichissement
  needsEnrichment(compose) {
    const checks = {
      missingDescription: !compose.name || !compose.name.en,
      missingClass: !compose.class,
      missingImages: !compose.images || !compose.images.large,
      missingEnergy: compose.capabilities && 
                     compose.capabilities.includes('measure_battery') && 
                     !compose.energy,
      missingSettings: !compose.settings || compose.settings.length === 0
    };

    return Object.values(checks).some(v => v);
  }

  // Enrichir un driver
  enrichDriver(analysis) {
    if (!analysis || !analysis.needsEnrichment) return false;

    const { compose, path: driverPath } = analysis;
    let modified = false;

    // Ajouter class si manquant
    if (!compose.class) {
      compose.class = this.inferClass(compose.capabilities);
      modified = true;
    }

    // Ajouter energy si batterie
    if (compose.capabilities && 
        compose.capabilities.includes('measure_battery') && 
        !compose.energy) {
      compose.energy = {
        batteries: ['CR2032', 'AAA', 'AA']
      };
      modified = true;
    }

    // Ajouter images par défaut
    if (!compose.images) {
      compose.images = {
        small: './assets/small.png',
        large: './assets/large.png',
        xlarge: './assets/xlarge.png'
      };
      modified = true;
    }

    // Ajouter settings basiques si manquants
    if (!compose.settings || compose.settings.length === 0) {
      compose.settings = this.generateBasicSettings(compose.capabilities);
      modified = true;
    }

    // Sauvegarder si modifié
    if (modified) {
      const composeFile = path.join(driverPath, 'driver.compose.json');
      fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2) + '\n');
      this.enrichments.push(analysis.name);
      return true;
    }

    return false;
  }

  // Inférer class
  inferClass(capabilities) {
    if (!capabilities) return 'sensor';
    
    if (capabilities.includes('onoff')) return 'socket';
    if (capabilities.includes('dim')) return 'light';
    if (capabilities.includes('alarm_motion')) return 'sensor';
    if (capabilities.includes('alarm_contact')) return 'sensor';
    if (capabilities.includes('button')) return 'button';
    
    return 'sensor';
  }

  // Générer settings basiques
  generateBasicSettings(capabilities) {
    const settings = [];

    if (capabilities && capabilities.includes('measure_battery')) {
      settings.push({
        type: 'group',
        label: { en: 'Battery Settings' },
        children: [{
          id: 'battery_threshold',
          type: 'number',
          label: { en: 'Low Battery Threshold' },
          value: 20,
          min: 5,
          max: 50,
          units: '%'
        }]
      });
    }

    return settings;
  }

  // Enrichir tous les drivers
  enrichAll() {
    console.log('🔧 Driver Enricher Module');
    console.log('═'.repeat(60));

    const drivers = fs.readdirSync(this.driversPath).filter(name => {
      const driverPath = path.join(this.driversPath, name);
      return fs.statSync(driverPath).isDirectory();
    });

    console.log(`Found ${drivers.length} drivers`);

    let enriched = 0;
    for (const driver of drivers) {
      const driverPath = path.join(this.driversPath, driver);
      const analysis = this.analyzeDriver(driverPath);
      
      if (analysis && this.enrichDriver(analysis)) {
        enriched++;
      }
    }

    console.log(`\n✅ Enriched: ${enriched} drivers`);
    return this.enrichments;
  }
}

module.exports = DriverEnricher;
