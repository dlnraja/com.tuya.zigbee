/**
 * HOME ASSISTANT ZHA QUIRKS SCRAPER
 * 
 * Source: https://github.com/zigpy/zha-device-handlers
 * Scrapes Tuya device quirks from Home Assistant ZHA integration
 * 
 * Data extracted:
 * - Manufacturer IDs
 * - Model IDs
 * - Cluster configurations
 * - Datapoint mappings
 * - Device quirks and workarounds
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');

class ZHAScraper {

  constructor() {
    this.baseUrl = 'https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev';
    this.outputPath = path.join(__dirname, '../../../data/sources/zha');
    this.manufacturerIds = new Set();
    this.devices = [];
    this.datapoints = {};
    this.quirks = [];
  }

  /**
   * Main scraping function
   */
  async scrape() {
    console.log('🔍 ZHA Scraper - Starting...');
    
    try {
      await fs.mkdir(this.outputPath, { recursive: true });
      
      // 1. Scrape Tuya quirks directory
      console.log('📥 Fetching Tuya quirks...');
      await this.scrapeTuyaQuirks();
      
      // 2. Extract manufacturer IDs from quirks
      console.log('🏭 Extracting manufacturer IDs...');
      this.extractManufacturerIds();
      
      // 3. Extract datapoint mappings
      console.log('📊 Extracting datapoint mappings...');
      this.extractDatapoints();
      
      // 4. Save results
      await this.saveResults();
      
      console.log('✅ ZHA scraping complete');
      console.log(`   - Devices: ${this.devices.length}`);
      console.log(`   - Manufacturer IDs: ${this.manufacturerIds.size}`);
      console.log(`   - Quirks: ${this.quirks.length}`);
      
      return {
        success: true,
        devices: this.devices,
        manufacturerIds: Array.from(this.manufacturerIds),
        datapoints: this.datapoints,
        quirks: this.quirks
      };
      
    } catch (error) {
      console.error('❌ ZHA scraping failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Scrape Tuya quirks from ZHA
   */
  async scrapeTuyaQuirks() {
    const quirksUrl = `${this.baseUrl}/zhaquirks/tuya/__init__.py`;
    
    try {
      const content = await this.fetchUrl(quirksUrl);
      this.parseQuirksFile(content);
    } catch (error) {
      console.error('Failed to fetch Tuya quirks:', error.message);
    }
    
    // Also scrape individual quirk files
    const quirkFiles = [
      'air.py',
      'siren.py', 
      'sensor.py',
      'switch.py',
      'light.py',
      'valve.py',
      'ts0601_sensor.py',
      'ts0601_trv.py'
    ];
    
    for (const file of quirkFiles) {
      try {
        const url = `${this.baseUrl}/zhaquirks/tuya/${file}`;
        const content = await this.fetchUrl(url);
        this.parseQuirksFile(content);
      } catch (error) {
        // File might not exist, continue
      }
    }
  }

  /**
   * Parse Python quirks file
   */
  parseQuirksFile(content) {
    const lines = content.split('\n');
    let currentDevice = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Extract manufacturer name
      if (line.includes('MODELS_INFO')) {
        const match = line.match(/"([^"]+)"/);
        if (match) {
          this.manufacturerIds.add(match[1]);
        }
      }
      
      // Extract model ID
      if (line.includes('model:')) {
        const match = line.match(/model:\s*"([^"]+)"/);
        if (match && currentDevice) {
          currentDevice.modelId = match[1];
        }
      }
      
      // Extract datapoints
      if (line.includes('TUYA_DP_ID')) {
        const match = line.match(/TUYA_DP_ID:\s*(\d+)/);
        if (match) {
          const dp = parseInt(match[1]);
          if (!this.datapoints[dp]) {
            this.datapoints[dp] = {
              sources: ['ZHA'],
              devices: []
            };
          }
        }
      }
      
      // Extract quirk information
      if (line.includes('class ') && line.includes('CustomDevice')) {
        const quirkMatch = line.match(/class\s+(\w+)/);
        if (quirkMatch) {
          const quirk = {
            name: quirkMatch[1],
            description: this.extractQuirkDescription(lines, i),
            manufacturer: null,
            model: null
          };
          this.quirks.push(quirk);
          currentDevice = quirk;
        }
      }
    }
  }

  /**
   * Extract quirk description from comments
   */
  extractQuirkDescription(lines, startIndex) {
    for (let i = startIndex - 1; i >= Math.max(0, startIndex - 5); i--) {
      const line = lines[i].trim();
      if (line.startsWith('"""') || line.startsWith('#')) {
        return line.replace(/["""#]/g, '').trim();
      }
    }
    return '';
  }

  /**
   * Extract manufacturer IDs
   */
  extractManufacturerIds() {
    // Already done during parsing
  }

  /**
   * Extract datapoint mappings
   */
  extractDatapoints() {
    // Already done during parsing
  }

  /**
   * Fetch URL content
   */
  fetchUrl(url) {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        
        res.on('data', chunk => {
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

  /**
   * Save results
   */
  async saveResults() {
    // Save manufacturer IDs
    await fs.writeFile(
      path.join(this.outputPath, 'manufacturer-ids.json'),
      JSON.stringify(Array.from(this.manufacturerIds), null, 2)
    );
    
    // Save datapoints
    await fs.writeFile(
      path.join(this.outputPath, 'datapoints.json'),
      JSON.stringify(this.datapoints, null, 2)
    );
    
    // Save quirks
    await fs.writeFile(
      path.join(this.outputPath, 'quirks.json'),
      JSON.stringify(this.quirks, null, 2)
    );
    
    // Save summary
    const summary = {
      timestamp: new Date().toISOString(),
      source: 'Home Assistant ZHA',
      url: 'https://github.com/zigpy/zha-device-handlers',
      statistics: {
        manufacturer_ids: this.manufacturerIds.size,
        devices: this.devices.length,
        datapoints: Object.keys(this.datapoints).length,
        quirks: this.quirks.length
      }
    };
    
    await fs.writeFile(
      path.join(this.outputPath, 'summary.json'),
      JSON.stringify(summary, null, 2)
    );
  }
}

// Run if called directly
if (require.main === module) {
  const scraper = new ZHAScraper();
  scraper.scrape().then(result => {
    console.log('Result:', result);
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = ZHAScraper;
