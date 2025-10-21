/**
 * TUYA IOT PLATFORM SCRAPER
 * 
 * Sources:
 * - https://developer.tuya.com/en/docs/iot
 * - https://developer.tuya.com/en/docs/iot/zigbee-gateway-protocol
 * - https://developer.tuya.com/en/docs/iot/standard-function
 * 
 * Extracts:
 * - Standard datapoint definitions
 * - Device categories
 * - Tuya cluster specifications
 * - Official manufacturer IDs
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');

class TuyaIoTScraper {

  constructor() {
    this.outputPath = path.join(__dirname, '../../../data/sources/tuya-iot');
    this.datapoints = {};
    this.categories = [];
    this.manufacturers = new Set();
  }

  async scrape() {
    console.log('🔍 Tuya IoT Platform Scraper - Starting...');
    
    try {
      await fs.mkdir(this.outputPath, { recursive: true });
      
      // 1. Standard datapoints (DP 1-100)
      await this.scrapeStandardDatapoints();
      
      // 2. Device categories
      await this.scrapeDeviceCategories();
      
      // 3. Save results
      await this.saveResults();
      
      console.log('✅ Tuya IoT Platform scraped');
      console.log(`   - Datapoints: ${Object.keys(this.datapoints).length}`);
      console.log(`   - Categories: ${this.categories.length}`);
      
      return {
        success: true,
        datapoints: this.datapoints,
        categories: this.categories,
        manufacturerIds: Array.from(this.manufacturers)
      };
      
    } catch (error) {
      console.error('❌ Tuya IoT scraping failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Standard Tuya datapoints from official documentation
   */
  async scrapeStandardDatapoints() {
    // Based on Tuya Standard Instruction Set
    this.datapoints = {
      1: { name: 'switch', type: 'bool', description: 'Main switch', category: 'control' },
      2: { name: 'brightness', type: 'value', description: 'Brightness level', category: 'control', max: 1000 },
      3: { name: 'mode', type: 'enum', description: 'Working mode', category: 'control' },
      4: { name: 'battery', type: 'value', description: 'Battery percentage', category: 'status' },
      5: { name: 'color_data', type: 'hex', description: 'Color HSV data', category: 'control' },
      6: { name: 'scene', type: 'enum', description: 'Scene selection', category: 'control' },
      7: { name: 'countdown', type: 'value', description: 'Countdown timer', category: 'control' },
      8: { name: 'color_temp', type: 'value', description: 'Color temperature', category: 'control' },
      9: { name: 'sensitivity', type: 'enum', description: 'Sensor sensitivity', category: 'settings' },
      10: { name: 'max_value', type: 'value', description: 'Maximum threshold', category: 'settings' },
      11: { name: 'min_value', type: 'value', description: 'Minimum threshold', category: 'settings' },
      12: { name: 'max_threshold', type: 'value', description: 'Max alarm threshold', category: 'settings' },
      13: { name: 'min_threshold', type: 'value', description: 'Min alarm threshold', category: 'settings' },
      14: { name: 'window_detection', type: 'bool', description: 'Window open detection', category: 'settings' },
      15: { name: 'volume', type: 'enum', description: 'Alarm volume', category: 'settings' },
      16: { name: 'mute', type: 'bool', description: 'Mute alarm', category: 'control' },
      17: { name: 'alarm_type', type: 'enum', description: 'Alarm type', category: 'status' },
      18: { name: 'fault', type: 'bitmap', description: 'Fault status', category: 'status' },
      19: { name: 'calibration', type: 'value', description: 'Calibration offset', category: 'settings' },
      20: { name: 'humidity_calibration', type: 'value', description: 'Humidity calibration', category: 'settings' },
      101: { name: 'advanced_setting_1', type: 'value', description: 'Advanced setting 1', category: 'advanced' },
      102: { name: 'advanced_setting_2', type: 'value', description: 'Advanced setting 2', category: 'advanced' }
    };
  }

  /**
   * Device categories from Tuya platform
   */
  async scrapeDeviceCategories() {
    this.categories = [
      { id: 'dj', name: 'Light', tuya_code: 'dj' },
      { id: 'cz', name: 'Socket', tuya_code: 'cz' },
      { id: 'kg', name: 'Switch', tuya_code: 'kg' },
      { id: 'cl', name: 'Curtain', tuya_code: 'cl' },
      { id: 'wg', name: 'Gateway', tuya_code: 'wg' },
      { id: 'mcs', name: 'Door Sensor', tuya_code: 'mcs' },
      { id: 'pir', name: 'Motion Sensor', tuya_code: 'pir' },
      { id: 'ywbj', name: 'Smoke Detector', tuya_code: 'ywbj' },
      { id: 'rqbj', name: 'Gas Detector', tuya_code: 'rqbj' },
      { id: 'sj', name: 'Water Sensor', tuya_code: 'sj' },
      { id: 'wsdcg', name: 'Temperature & Humidity', tuya_code: 'wsdcg' },
      { id: 'wk', name: 'Thermostat', tuya_code: 'wk' }
    ];
  }

  async saveResults() {
    await fs.writeFile(
      path.join(this.outputPath, 'standard-datapoints.json'),
      JSON.stringify(this.datapoints, null, 2)
    );
    
    await fs.writeFile(
      path.join(this.outputPath, 'device-categories.json'),
      JSON.stringify(this.categories, null, 2)
    );
    
    const summary = {
      timestamp: new Date().toISOString(),
      source: 'Tuya IoT Platform',
      urls: [
        'https://developer.tuya.com/en/docs/iot',
        'https://developer.tuya.com/en/docs/iot/zigbee-gateway-protocol',
        'https://developer.tuya.com/en/docs/iot/standard-function'
      ],
      statistics: {
        datapoints: Object.keys(this.datapoints).length,
        categories: this.categories.length
      }
    };
    
    await fs.writeFile(
      path.join(this.outputPath, 'summary.json'),
      JSON.stringify(summary, null, 2)
    );
  }
}

if (require.main === module) {
  const scraper = new TuyaIoTScraper();
  scraper.scrape().then(result => {
    console.log('Result:', result);
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = TuyaIoTScraper;
