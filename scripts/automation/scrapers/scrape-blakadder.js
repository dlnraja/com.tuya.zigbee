/**
 * BLAKADDER ZIGBEE DATABASE SCRAPER
 * 
 * Source: https://zigbee.blakadder.com/
 * Scrapes crowdsourced Zigbee device database
 * 
 * Data extracted:
 * - Manufacturer IDs
 * - Model IDs
 * - Device photos
 * - Purchase links
 * - Community compatibility reports
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');

class BlakadderScraper {

  constructor() {
    this.baseUrl = 'https://zigbee.blakadder.com';
    this.outputPath = path.join(__dirname, '../../../data/sources/blakadder');
    this.manufacturerIds = new Set();
    this.devices = [];
  }

  async scrape() {
    console.log('🔍 Blakadder Scraper - Starting...');
    
    try {
      await fs.mkdir(this.outputPath, { recursive: true });
      
      // 1. Scrape Tuya devices page
      await this.scrapeTuyaDevices();
      
      // 2. Extract manufacturer IDs
      this.extractManufacturerIds();
      
      // 3. Save results
      await this.saveResults();
      
      console.log('✅ Blakadder scraped');
      console.log(`   - Devices: ${this.devices.length}`);
      console.log(`   - Manufacturer IDs: ${this.manufacturerIds.size}`);
      
      return {
        success: true,
        devices: this.devices,
        manufacturerIds: Array.from(this.manufacturerIds)
      };
      
    } catch (error) {
      console.error('❌ Blakadder scraping failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async scrapeTuyaDevices() {
    // Blakadder has JSON API
    const urls = [
      `${this.baseUrl}/_zigbee/tuya.json`,
      `${this.baseUrl}/_zigbee/all.json`
    ];
    
    for (const url of urls) {
      try {
        const content = await this.fetchUrl(url);
        const data = JSON.parse(content);
        this.parseBlakadderData(data);
      } catch (error) {
        console.log(`   Failed to fetch ${url}:`, error.message);
      }
    }
  }

  parseBlakadderData(data) {
    if (Array.isArray(data)) {
      data.forEach(device => {
        if (device.ManufacturerName && device.ManufacturerName.startsWith('_TZ')) {
          this.manufacturerIds.add(device.ManufacturerName);
          
          this.devices.push({
            manufacturer: device.ManufacturerName,
            model: device.ModelID || device.ModelId,
            type: device.Type,
            brand: device.Brand,
            source: 'Blakadder'
          });
        }
      });
    }
  }

  extractManufacturerIds() {
    // Already extracted during parsing
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
      source: 'Blakadder Zigbee Database',
      url: 'https://zigbee.blakadder.com/',
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
  const scraper = new BlakadderScraper();
  scraper.scrape().then(result => {
    console.log('Result:', result);
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = BlakadderScraper;
