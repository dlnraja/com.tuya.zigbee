/**
 * ZIGBEE HERDSMAN CONVERTERS SCRAPER
 * 
 * Source: https://github.com/Koenkk/zigbee-herdsman-converters
 * Scrapes TypeScript device definitions
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');

class HerdsmanScraper {
  constructor() {
    this.baseUrl = 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master';
    this.outputPath = path.join(__dirname, '../../../data/sources/zigbee-herdsman');
    this.manufacturerIds = new Set();
    this.devices = [];
  }

  async scrape() {
    console.log('🔍 Zigbee Herdsman Scraper - Starting...');
    
    try {
      await fs.mkdir(this.outputPath, { recursive: true });
      
      // Scrape Tuya devices from TypeScript definitions
      await this.scrapeTuyaDevices();
      
      await this.saveResults();
      
      console.log('✅ Zigbee Herdsman scraped');
      console.log(`   - Devices: ${this.devices.length}`);
      console.log(`   - Manufacturer IDs: ${this.manufacturerIds.size}`);
      
      return {
        success: true,
        devices: this.devices,
        manufacturerIds: Array.from(this.manufacturerIds)
      };
      
    } catch (error) {
      console.error('❌ Zigbee Herdsman scraping failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async scrapeTuyaDevices() {
    // Scrape main Tuya definitions file
    const url = `${this.baseUrl}/src/devices/tuya.ts`;
    
    try {
      const content = await this.fetchUrl(url);
      this.parseTuyaDevices(content);
    } catch (error) {
      console.log('Failed to fetch Tuya devices:', error.message);
    }
  }

  parseTuyaDevices(content) {
    const lines = content.split('\n');
    let currentDevice = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Extract manufacturer ID
      if (line.includes('fingerprint:') && line.includes('manufacturerName:')) {
        const match = line.match(/manufacturerName:\s*'([^']+)'/);
        if (match) {
          const manufacturerId = match[1];
          this.manufacturerIds.add(manufacturerId);
          
          if (currentDevice) {
            currentDevice.manufacturerId = manufacturerId;
          } else {
            currentDevice = { manufacturerId };
          }
        }
      }
      
      // Extract model ID
      if (line.includes('model:') && currentDevice) {
        const match = line.match(/model:\s*'([^']+)'/);
        if (match) {
          currentDevice.model = match[1];
        }
      }
      
      // Extract vendor
      if (line.includes('vendor:') && currentDevice) {
        const match = line.match(/vendor:\s*'([^']+)'/);
        if (match) {
          currentDevice.vendor = match[1];
        }
      }
      
      // Extract description
      if (line.includes('description:') && currentDevice) {
        const match = line.match(/description:\s*'([^']+)'/);
        if (match) {
          currentDevice.description = match[1];
          
          // Device complete, save and reset
          this.devices.push({...currentDevice, source: 'Zigbee Herdsman'});
          currentDevice = null;
        }
      }
    }
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
      source: 'Zigbee Herdsman Converters',
      url: 'https://github.com/Koenkk/zigbee-herdsman-converters',
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
  const scraper = new HerdsmanScraper();
  scraper.scrape().then(result => {
    console.log('Result:', result);
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = HerdsmanScraper;
