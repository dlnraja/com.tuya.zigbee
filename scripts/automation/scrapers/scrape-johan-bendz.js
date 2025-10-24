/**
 * JOHAN BENDZ REPOSITORY SCRAPER
 * 
 * Source: https://github.com/JohanBendz/com.tuya.zigbee
 * Scrapes historical device support and manufacturer IDs
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');

class JohanBenzScraper {
  constructor() {
    this.baseUrl = 'https://raw.githubusercontent.com/JohanBendz/com.tuya.zigbee/master';
    this.outputPath = path.join(__dirname, '../../../data/sources/johan-bendz');
    this.manufacturerIds = new Set();
    this.devices = [];
  }

  async scrape() {
    console.log('🔍 Johan Bendz Scraper - Starting...');
    
    try {
      await fs.mkdir(this.outputPath, { recursive: true });
      
      // Scrape drivers directory
      await this.scrapeDrivers();
      
      await this.saveResults();
      
      console.log('✅ Johan Bendz scraped');
      console.log(`   - Devices: ${this.devices.length}`);
      console.log(`   - Manufacturer IDs: ${this.manufacturerIds.size}`);
      
      return {
        success: true,
        devices: this.devices,
        manufacturerIds: Array.from(this.manufacturerIds)
      };
      
    } catch (error) {
      console.error('❌ Johan Bendz scraping failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async scrapeDrivers() {
    // Try to fetch driver list from repository
    const driversToCheck = [
      'socket',
      'switch',
      'sensor',
      'motion',
      'contact',
      'thermostat',
      'light',
      'dimmer'
    ];
    
    for (const driverType of driversToCheck) {
      try {
        const url = `${this.baseUrl}/drivers/${driverType}/driver.json`;
        const content = await this.fetchUrl(url);
        const driver = JSON.parse(content);
        
        if (driver.id && driver.name) {
          const device = {
            id: driver.id,
            name: driver.name,
            type: driverType,
            source: 'Johan Bendz'
          };
          
          // Extract manufacturer IDs
          if (driver.zigbee && driver.zigbee.manufacturerName) {
            const ids = Array.isArray(driver.zigbee.manufacturerName) 
              ? driver.zigbee.manufacturerName 
              : [driver.zigbee.manufacturerName];
            
            ids.forEach(id => {
              this.manufacturerIds.add(id);
              device.manufacturerIds = ids;
            });
          }
          
          this.devices.push(device);
        }
      } catch (error) {
        // Driver might not exist
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
      source: 'Johan Bendz Repository',
      url: 'https://github.com/JohanBendz/com.tuya.zigbee',
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
  const scraper = new JohanBenzScraper();
  scraper.scrape().then(result => {
    console.log('Result:', result);
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = JohanBenzScraper;
