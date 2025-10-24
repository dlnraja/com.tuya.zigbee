/**
 * ZIGBEE2MQTT DATABASE SCRAPER
 * 
 * Scrape le repository Zigbee2MQTT pour extraire:
 * - Manufacturer IDs
 * - Model IDs
 * - Device capabilities
 * - Tuya datapoints mappings
 * - Cluster configurations
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');

class Zigbee2MQTTScraper {

  constructor() {
    this.baseUrl = 'https://raw.githubusercontent.com/Koenkk/zigbee2mqtt/master';
    this.outputPath = path.join(__dirname, '../../../data/sources/zigbee2mqtt');
    this.manufacturerIds = new Set();
    this.devices = [];
    this.datapoints = {};
  }

  /**
   * Point d'entrée principal
   */
  async scrape() {
    console.log('🔍 Zigbee2MQTT Scraper - Starting...');
    
    try {
      // Créer dossier output
      await fs.mkdir(this.outputPath, { recursive: true });
      
      // 1. Scraper liste devices
      console.log('📥 Fetching devices database...');
      const devices = await this.fetchDevicesDatabase();
      console.log(`✅ Found ${devices.length} devices`);
      
      // 2. Extraire manufacturer IDs
      console.log('🏭 Extracting manufacturer IDs...');
      this.extractManufacturerIds(devices);
      console.log(`✅ Found ${this.manufacturerIds.size} unique manufacturer IDs`);
      
      // 3. Extraire Tuya datapoints
      console.log('📊 Extracting Tuya datapoints...');
      await this.extractTuyaDatapoints();
      console.log(`✅ Found ${Object.keys(this.datapoints).length} datapoint mappings`);
      
      // 4. Sauvegarder résultats
      await this.saveResults();
      console.log('✅ Results saved');
      
      return {
        success: true,
        devices: devices.length,
        manufacturerIds: this.manufacturerIds.size,
        datapoints: Object.keys(this.datapoints).length
      };
      
    } catch (error) {
      console.error('❌ Scraping failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Fetch devices database from GitHub
   */
  async fetchDevicesDatabase() {
    const url = `${this.baseUrl}/lib/devices.json`;
    const data = await this.fetchJSON(url);
    
    // Parse devices
    const devices = [];
    for (const device of data) {
      if (device.vendor && device.model) {
        devices.push({
          vendor: device.vendor,
          model: device.model,
          description: device.description,
          supports: device.supports,
          fromZigbee: device.fromZigbee,
          toZigbee: device.toZigbee,
          exposes: device.exposes,
          meta: device.meta
        });
      }
    }
    
    this.devices = devices;
    return devices;
  }

  /**
   * Extraire manufacturer IDs
   */
  extractManufacturerIds(devices) {
    for (const device of devices) {
      // Manufacturer ID généralement dans meta.manufacturerCode ou inféré du vendor
      if (device.meta && device.meta.manufacturerCode) {
        this.manufacturerIds.add(device.meta.manufacturerCode);
      }
      
      // Patterns pour Tuya devices
      if (device.vendor && device.vendor.toLowerCase().includes('tuya')) {
        // Extraire de model si présent (_TZE204_xxx, etc.)
        const tuyaPattern = /(_TZ[A-Z0-9]{1,4}_[a-z0-9]{8})/gi;
        const matches = device.model.match(tuyaPattern);
        if (matches) {
          matches.forEach(id => this.manufacturerIds.add(id));
        }
      }
    }
  }

  /**
   * Extraire Tuya datapoints mappings
   */
  async extractTuyaDatapoints() {
    try {
      // Fetch Tuya converters file
      const url = `${this.baseUrl}/lib/converters/fromZigbee.js`;
      const content = await this.fetchText(url);
      
      // Pattern pour datapoints
      const dpPattern = /dp\s*:\s*(\d+)[,\s]+.*?(?:type|name)\s*:\s*["']([^"']+)["']/gi;
      let match;
      
      while ((match = dpPattern.exec(content)) !== null) {
        const dpId = parseInt(match[1]);
        const dpName = match[2];
        
        if (!this.datapoints[dpId]) {
          this.datapoints[dpId] = {
            id: dpId,
            names: new Set(),
            types: new Set()
          };
        }
        
        this.datapoints[dpId].names.add(dpName);
      }
      
      // Convertir Sets en Arrays pour JSON
      for (const dp in this.datapoints) {
        this.datapoints[dp].names = Array.from(this.datapoints[dp].names);
        this.datapoints[dp].types = Array.from(this.datapoints[dp].types);
      }
      
    } catch (error) {
      console.warn('Could not fetch Tuya datapoints:', error.message);
    }
  }

  /**
   * Sauvegarder résultats
   */
  async saveResults() {
    // Manufacturer IDs
    const manufacturerIdsPath = path.join(this.outputPath, 'manufacturer-ids.json');
    await fs.writeFile(
      manufacturerIdsPath,
      JSON.stringify(Array.from(this.manufacturerIds).sort(), null, 2)
    );
    
    // Devices
    const devicesPath = path.join(this.outputPath, 'devices.json');
    await fs.writeFile(
      devicesPath,
      JSON.stringify(this.devices, null, 2)
    );
    
    // Tuya datapoints
    const datapointsPath = path.join(this.outputPath, 'tuya-datapoints.json');
    await fs.writeFile(
      datapointsPath,
      JSON.stringify(this.datapoints, null, 2)
    );
    
    // Metadata
    const metaPath = path.join(this.outputPath, 'metadata.json');
    await fs.writeFile(
      metaPath,
      JSON.stringify({
        source: 'Zigbee2MQTT',
        url: 'https://github.com/Koenkk/zigbee2mqtt',
        scraped_at: new Date().toISOString(),
        total_devices: this.devices.length,
        total_manufacturer_ids: this.manufacturerIds.size,
        total_datapoints: Object.keys(this.datapoints).length
      }, null, 2)
    );
  }

  /**
   * Fetch JSON from URL
   */
  async fetchJSON(url) {
    const text = await this.fetchText(url);
    return JSON.parse(text);
  }

  /**
   * Fetch text from URL
   */
  fetchText(url) {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
        
      }).on('error', reject);
    });
  }

}

// Run if called directly
if (require.main === module) {
  const scraper = new Zigbee2MQTTScraper();
  scraper.scrape().then(result => {
    console.log('Result:', result);
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = Zigbee2MQTTScraper;
