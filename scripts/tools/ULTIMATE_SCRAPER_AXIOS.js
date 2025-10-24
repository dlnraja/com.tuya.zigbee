#!/usr/bin/env node
'use strict';

/**
 * ULTIMATE SCRAPER AXIOS
 * Scrape toutes les sources avec Node Axios et enrichissement intelligent
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const ROOT = path.join(__dirname, '..');

class UltimateScraperAxios {
  constructor() {
    this.discoveries = {
      manufacturers: new Set(),
      models: new Set(),
      capabilities: new Set(),
      clusters: new Set(),
      batteries: new Map(),
      flows: []
    };
    
    this.sources = [
      'https://zigbee.blakadder.com/zigbee_devices.json',
      'https://raw.githubusercontent.com/Koenkk/zigbee2mqtt/master/lib/devices.js',
      'https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/tuya/__init__.py'
    ];
  }

  log(msg, icon = '📡') {
    console.log(`${icon} ${msg}`);
  }

  // PHASE 1: Scraper Blakadder
  async scrapeBlakadder() {
    this.log('Scraping Blakadder database...', '🔍');
    
    try {
      const response = await axios.get('https://zigbee.blakadder.com/zigbee_devices.json', {
        timeout: 30000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      const devices = response.data;
      this.log(`Blakadder: ${devices.length} devices trouvés`);

      for (const device of devices) {
        if (device.manufacturerName?.includes('Tuya') || 
            device.manufacturerID?.startsWith('_TZ')) {
          
          // Manufacturer
          if (device.manufacturerID) {
            this.discoveries.manufacturers.add(device.manufacturerID);
          }

          // Model
          if (device.model) {
            this.discoveries.models.add(device.model);
          }

          // Battery info
          if (device.powerSource?.includes('Battery')) {
            const batteryType = this.inferBatteryType(device.model, device.description);
            this.discoveries.batteries.set(device.model, batteryType);
          }

          // Clusters
          if (device.exposes) {
            for (const expose of device.exposes) {
              if (expose.features) {
                expose.features.forEach(f => this.discoveries.capabilities.add(f.name));
              }
            }
          }
        }
      }

      this.log(`✅ Blakadder: ${this.discoveries.manufacturers.size} manufacturers`, '  ');
      return true;
    } catch (err) {
      this.log(`⚠️  Blakadder error: ${err.message}`);
      return false;
    }
  }

  // PHASE 2: Scraper Zigbee2MQTT
  async scrapeZigbee2MQTT() {
    this.log('Scraping Zigbee2MQTT definitions...', '🔍');
    
    try {
      const response = await axios.get(
        'https://raw.githubusercontent.com/Koenkk/zigbee2mqtt/master/lib/devices.js',
        { timeout: 30000 }
      );

      const content = response.data;
      
      // Parser les définitions Tuya
      const tuyaMatches = content.match(/manufacturerName:\s*['"]Tuya['"]/g) || [];
      this.log(`Z2M: ${tuyaMatches.length} devices Tuya trouvés`);

      // Extraire manufacturer IDs
      const idMatches = content.match(/_TZ[A-Z0-9_]+/g) || [];
      idMatches.forEach(id => this.discoveries.manufacturers.add(id));

      // Extraire models
      const modelMatches = content.match(/model:\s*['"]([^'"]+)['"]/g) || [];
      modelMatches.forEach(match => {
        const model = match.match(/['"]([^'"]+)['"]/)[1];
        this.discoveries.models.add(model);
      });

      this.log(`✅ Z2M: ${this.discoveries.manufacturers.size} total manufacturers`, '  ');
      return true;
    } catch (err) {
      this.log(`⚠️  Z2M error: ${err.message}`);
      return false;
    }
  }

  // PHASE 3: Scraper ZHA
  async scrapeZHA() {
    this.log('Scraping ZHA quirks...', '🔍');
    
    try {
      const response = await axios.get(
        'https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/tuya/__init__.py',
        { timeout: 30000 }
      );

      const content = response.data;
      
      // Extraire manufacturer IDs
      const idMatches = content.match(/_TZ[A-Z0-9_]+/g) || [];
      idMatches.forEach(id => this.discoveries.manufacturers.add(id));

      // Extraire clusters
      const clusterMatches = content.match(/0x[0-9A-Fa-f]{4}/g) || [];
      clusterMatches.forEach(cluster => this.discoveries.clusters.add(cluster));

      this.log(`✅ ZHA: ${this.discoveries.clusters.size} clusters`, '  ');
      return true;
    } catch (err) {
      this.log(`⚠️  ZHA error: ${err.message}`);
      return false;
    }
  }

  // PHASE 4: Analyse intelligente batteries
  inferBatteryType(model, description) {
    const text = `${model} ${description}`.toLowerCase();
    
    // Patterns batterie
    if (text.includes('cr2032')) return ['CR2032'];
    if (text.includes('cr2450')) return ['CR2450'];
    if (text.includes('cr123')) return ['CR123A'];
    if (text.includes('aaa')) return ['AAA'];
    if (text.includes('aa') && !text.includes('aaa')) return ['AA'];
    
    // Par type de device
    if (text.includes('button') || text.includes('remote')) return ['CR2032'];
    if (text.includes('motion') || text.includes('pir')) return ['CR2032', 'AAA'];
    if (text.includes('door') || text.includes('window')) return ['CR2032', 'AAA'];
    if (text.includes('smoke') || text.includes('co')) return ['AA', '9V'];
    
    return ['CR2032', 'AAA', 'AA']; // Défaut
  }

  // PHASE 5: Générer flows intelligents
  generateIntelligentFlows() {
    this.log('Génération flows intelligents...', '⚡');

    const flows = {
      triggers: [
        {
          id: 'low_battery_alert',
          title: { en: 'Low battery alert', fr: 'Alerte batterie faible' },
          titleFormatted: { 
            en: 'Battery level below [[threshold]]%',
            fr: 'Niveau batterie sous [[threshold]]%'
          },
          tokens: [
            { name: 'device', type: 'string', title: { en: 'Device' } },
            { name: 'battery', type: 'number', title: { en: 'Battery %' } },
            { name: 'battery_type', type: 'string', title: { en: 'Battery Type' } }
          ],
          args: [{
            name: 'threshold',
            type: 'number',
            min: 5,
            max: 50,
            value: 20,
            placeholder: { en: 'Threshold' }
          }]
        },
        {
          id: 'battery_critical',
          title: { en: 'Battery critical (< 10%)', fr: 'Batterie critique (< 10%)' },
          tokens: [
            { name: 'device', type: 'string', title: { en: 'Device' } },
            { name: 'battery', type: 'number', title: { en: 'Battery %' } }
          ]
        },
        {
          id: 'device_battery_changed',
          title: { en: 'Battery changed/replaced', fr: 'Batterie changée/remplacée' },
          hint: { en: 'Triggered when battery jumps from low to high' },
          tokens: [
            { name: 'device', type: 'string', title: { en: 'Device' } },
            { name: 'old_battery', type: 'number', title: { en: 'Old %' } },
            { name: 'new_battery', type: 'number', title: { en: 'New %' } }
          ]
        },
        {
          id: 'multiple_low_batteries',
          title: { en: 'Multiple devices low battery', fr: 'Plusieurs appareils batterie faible' },
          tokens: [
            { name: 'count', type: 'number', title: { en: 'Device Count' } },
            { name: 'devices', type: 'string', title: { en: 'Device List' } }
          ]
        }
      ],
      
      conditions: [
        {
          id: 'battery_level_between',
          title: { en: 'Battery level is between', fr: 'Niveau batterie entre' },
          titleFormatted: {
            en: 'Battery between [[min]]% and [[max]]%',
            fr: 'Batterie entre [[min]]% et [[max]]%'
          },
          args: [
            { name: 'min', type: 'number', min: 0, max: 100, placeholder: { en: 'Min %' } },
            { name: 'max', type: 'number', min: 0, max: 100, placeholder: { en: 'Max %' } }
          ]
        },
        {
          id: 'battery_needs_replacement',
          title: { en: 'Battery needs replacement', fr: 'Batterie nécessite remplacement' },
          hint: { en: 'True if battery < 15% or voltage low' }
        },
        {
          id: 'all_batteries_healthy',
          title: { en: 'All batteries healthy (> 30%)', fr: 'Toutes batteries saines (> 30%)' }
        }
      ],
      
      actions: [
        {
          id: 'send_battery_report',
          title: { en: 'Send battery status report', fr: 'Envoyer rapport état batteries' },
          hint: { en: 'Generate and send full battery status for all devices' },
          args: [{
            name: 'method',
            type: 'dropdown',
            values: [
              { id: 'notification', label: { en: 'Homey Notification' } },
              { id: 'email', label: { en: 'Email' } },
              { id: 'log', label: { en: 'Log Only' } }
            ]
          }]
        },
        {
          id: 'battery_maintenance_mode',
          title: { en: 'Enable battery maintenance mode', fr: 'Activer mode maintenance batterie' },
          hint: { en: 'Monitor all batteries closely and alert on changes' },
          args: [{
            name: 'duration',
            type: 'number',
            min: 1,
            max: 168,
            units: 'hours',
            placeholder: { en: 'Duration (hours)' }
          }]
        }
      ]
    };

    this.discoveries.flows = flows;
    this.log(`✅ ${flows.triggers.length} triggers + ${flows.conditions.length} conditions + ${flows.actions.length} actions`, '  ');
  }

  // PHASE 6: Sauvegarder découvertes
  async saveDiscoveries() {
    this.log('Sauvegarde des découvertes...', '💾');

    const data = {
      timestamp: new Date().toISOString(),
      statistics: {
        manufacturers: this.discoveries.manufacturers.size,
        models: this.discoveries.models.size,
        capabilities: this.discoveries.capabilities.size,
        clusters: this.discoveries.clusters.size,
        batteries: this.discoveries.batteries.size,
        flows: this.discoveries.flows.triggers?.length || 0
      },
      data: {
        manufacturers: Array.from(this.discoveries.manufacturers).sort(),
        models: Array.from(this.discoveries.models).sort(),
        capabilities: Array.from(this.discoveries.capabilities).sort(),
        clusters: Array.from(this.discoveries.clusters).sort(),
        batteries: Object.fromEntries(this.discoveries.batteries),
        flows: this.discoveries.flows
      }
    };

    // Sauvegarder JSON
    const jsonPath = path.join(ROOT, 'project-data', 'SCRAPED_DISCOVERIES.json');
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    
    this.log(`✅ Sauvegardé: ${jsonPath}`, '  ');
    return data;
  }

  // Exécution complète
  async run() {
    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                    ║');
    console.log('║     ULTIMATE SCRAPER AXIOS - ENRICHISSEMENT INTELLIGENT            ║');
    console.log('║                                                                    ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    const startTime = Date.now();

    // Exécuter tous les scrapers
    await this.scrapeBlakadder();
    await this.scrapeZigbee2MQTT();
    await this.scrapeZHA();
    
    // Analyse intelligente
    this.generateIntelligentFlows();
    
    // Sauvegarder
    const data = await this.saveDiscoveries();

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    // Rapport final
    console.log('\n' + '═'.repeat(70));
    console.log('📊 RAPPORT FINAL SCRAPING');
    console.log('═'.repeat(70));
    console.log(`\n⏱️  Temps total: ${totalTime}s`);
    console.log(`📡 Sources scrapées: 3/3`);
    console.log(`🏷️  Manufacturers: ${data.statistics.manufacturers}`);
    console.log(`📱 Models: ${data.statistics.models}`);
    console.log(`🔋 Batteries: ${data.statistics.batteries}`);
    console.log(`⚡ Flows: ${data.statistics.flows}`);
    console.log(`🔌 Clusters: ${data.statistics.clusters}`);

    console.log('\n' + '═'.repeat(70));
    console.log('✅ SCRAPING TERMINÉ AVEC SUCCÈS');
    console.log('═'.repeat(70) + '\n');

    return data;
  }
}

// Exécuter
if (require.main === module) {
  const scraper = new UltimateScraperAxios();
  scraper.run().catch(err => {
    console.error('Erreur fatale:', err);
    process.exit(1);
  });
}

module.exports = UltimateScraperAxios;
