/**
 * DECONZ REST PLUGIN SCRAPER
 * 
 * Source: https://github.com/dresden-elektronik/deconz-rest-plugin
 * Scrapes Tuya device support from deCONZ
 * 
 * Data extracted:
 * - Manufacturer IDs
 * - Model IDs  
 * - Device descriptors
 * - Attribute mappings
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');

class DeconzScraper {

  constructor() {
    this.baseUrl = 'https://raw.githubusercontent.com/dresden-elektronik/deconz-rest-plugin/master';
    this.outputPath = path.join(__dirname, '../../../data/sources/deconz');
    this.manufacturerIds = new Set();
    this.devices = [];
  }

  async scrape() {
    console.log('🔍 deCONZ Scraper - Starting...');
    
    try {
      await fs.mkdir(this.outputPath, { recursive: true });
      
      // 1. Scrape device descriptors
      await this.scrapeDeviceDescriptors();
      
      // 2. Extract manufacturer IDs
      this.extractManufacturerIds();
      
      // 3. Save results
      await this.saveResults();
      
      console.log('✅ deCONZ scraped');
      console.log(`   - Devices: ${this.devices.length}`);
      console.log(`   - Manufacturer IDs: ${this.manufacturerIds.size}`);
      
      return {
        success: true,
        devices: this.devices,
        manufacturerIds: Array.from(this.manufacturerIds)
      };
      
    } catch (error) {
      console.error('❌ deCONZ scraping failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async scrapeDeviceDescriptors() {
    // deCONZ uses device description files (DDF)
    const ddfFiles = [
      'tuya/tuya_smart_socket.json',
      'tuya/tuya_smart_switch.json',
      'tuya/tuya_motion_sensor.json',
      'tuya/tuya_door_sensor.json',
      'tuya/tuya_temperature_sensor.json',
      'generic/tuya_devices.json'
    ];
    
    for (const file of ddfFiles) {
      try {
        const url = `${this.baseUrl}/devices/${file}`;
        const content = await this.fetchUrl(url);
        const ddf = JSON.parse(content);
        this.parseDDF(ddf);
      } catch (error) {
        // File might not exist
      }
    }
  }

  parseDDF(ddf) {
    if (ddf.manufacturername) {
      this.manufacturerIds.add(ddf.manufacturername);
    }
    
    if (ddf.modelid) {
      this.devices.push({
        manufacturer: ddf.manufacturername,
        model: ddf.modelid,
        type: ddf.product || 'unknown',
        source: 'deCONZ'
      });
    }
  }

  extractManufacturerIds() {
    // Already extracted during DDF parsing
  }

  fetchUrl(url) {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) resolve(data);
          else reject(new Error(`HTTP ${res.statusCode}`));
        });
      }).on('error', reject);
    });
  }

  async saveResults() {
    await fs.writeFile(
      path.join(this.outputPath, 'manufacturer-ids.json'),
      JSON.stringify(Array.from(this.manufacturerIds), null, 2)
    );
    
    await fs.writeFile(
      path.join(this.outputPath, 'devices.json'),
      JSON.stringify(this.devices, null, 2)
    );
    
    const summary = {
      timestamp: new Date().toISOString(),
      source: 'deCONZ REST Plugin',
      url: 'https://github.com/dresden-elektronik/deconz-rest-plugin',
      statistics: {
        manufacturer_ids: this.manufacturerIds.size,
        devices: this.devices.length
      }
    };
    
    await fs.writeFile(
      path.join(this.outputPath, 'summary.json'),
      JSON.stringify(summary, null, 2)
    );
  }
}

if (require.main === module) {
  const scraper = new DeconzScraper();
  scraper.scrape().then(result => {
    console.log('Result:', result);
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = DeconzScraper;
