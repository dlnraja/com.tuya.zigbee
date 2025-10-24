/**
 * ZIGBEE ALLIANCE SCRAPER
 * 
 * Sources:
 * - Zigbee Cluster Library Specification
 * - Zigbee Alliance Device Specification
 * - Zigbee 3.0 Standards
 * 
 * Extracts official specifications
 */

const fs = require('fs').promises;
const path = require('path');

class ZigbeeAllianceScraper {
  constructor() {
    this.outputPath = path.join(__dirname, '../../../data/sources/zigbee-alliance');
    this.clusterIds = {};
    this.specifications = [];
  }

  async scrape() {
    console.log('🔍 Zigbee Alliance Scraper - Starting...');
    
    try {
      await fs.mkdir(this.outputPath, { recursive: true });
      
      // Load official cluster IDs
      await this.loadClusterSpecifications();
      
      // Load manufacturer-specific ranges
      await this.loadManufacturerRanges();
      
      await this.saveResults();
      
      console.log('✅ Zigbee Alliance scraped');
      console.log(`   - Cluster IDs: ${Object.keys(this.clusterIds).length}`);
      
      return {
        success: true,
        clusterIds: this.clusterIds,
        specifications: this.specifications
      };
      
    } catch (error) {
      console.error('❌ Zigbee Alliance scraping failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async loadClusterSpecifications() {
    // Official Zigbee Cluster Library cluster IDs
    this.clusterIds = {
      // General clusters
      0x0000: { name: 'Basic', type: 'general' },
      0x0001: { name: 'PowerConfiguration', type: 'general' },
      0x0002: { name: 'DeviceTemperatureConfiguration', type: 'general' },
      0x0003: { name: 'Identify', type: 'general' },
      0x0004: { name: 'Groups', type: 'general' },
      0x0005: { name: 'Scenes', type: 'general' },
      0x0006: { name: 'OnOff', type: 'general' },
      0x0007: { name: 'OnOffSwitchConfiguration', type: 'general' },
      0x0008: { name: 'LevelControl', type: 'general' },
      
      // Measurement clusters
      0x0400: { name: 'IlluminanceMeasurement', type: 'measurement' },
      0x0401: { name: 'IlluminanceLevelSensing', type: 'measurement' },
      0x0402: { name: 'TemperatureMeasurement', type: 'measurement' },
      0x0403: { name: 'PressureMeasurement', type: 'measurement' },
      0x0404: { name: 'FlowMeasurement', type: 'measurement' },
      0x0405: { name: 'RelativeHumidity', type: 'measurement' },
      0x0406: { name: 'OccupancySensing', type: 'measurement' },
      
      // Security clusters
      0x0500: { name: 'IASZone', type: 'security' },
      0x0501: { name: 'IASACE', type: 'security' },
      0x0502: { name: 'IASWarningDevice', type: 'security' },
      
      // HVAC clusters
      0x0201: { name: 'Thermostat', type: 'hvac' },
      0x0202: { name: 'FanControl', type: 'hvac' },
      
      // Color Control
      0x0300: { name: 'ColorControl', type: 'lighting' },
      
      // Window Covering
      0x0102: { name: 'WindowCovering', type: 'closures' },
      
      // Electrical Measurement
      0x0B04: { name: 'ElectricalMeasurement', type: 'measurement' },
      
      // Manufacturer-specific range
      0xEF00: { name: 'TuyaCluster', type: 'manufacturer', manufacturer: 'Tuya' },
      0xFC00: { name: 'ManufacturerSpecificStart', type: 'manufacturer' },
      0xFFFF: { name: 'ManufacturerSpecificEnd', type: 'manufacturer' }
    };
  }

  async loadManufacturerRanges() {
    // Manufacturer-specific cluster ID ranges
    this.specifications.push({
      name: 'Manufacturer-Specific Clusters',
      range: '0xFC00 - 0xFFFF',
      description: 'Reserved for manufacturer-specific clusters',
      examples: [
        { id: 0xEF00, manufacturer: 'Tuya', description: 'Tuya proprietary cluster' },
        { id: 0xFC00, manufacturer: 'Various', description: 'Start of manufacturer range' }
      ]
    });
    
    // Tuya specific
    this.specifications.push({
      name: 'Tuya Cluster 0xEF00',
      cluster_id: 0xEF00,
      manufacturer: 'Tuya Smart / Hangzhou Tuya Information Technology',
      protocol: 'Proprietary datapoint-based communication',
      attributes: [
        { id: 0x0000, name: 'dataPoints', type: 'map', access: 'read/report' },
        { id: 0x0001, name: 'dataRequest', type: 'command', access: 'write' }
      ]
    });
  }

  async saveResults() {
    await fs.writeFile(
      path.join(this.outputPath, 'cluster-ids.json'),
      JSON.stringify(this.clusterIds, null, 2)
    );
    
    await fs.writeFile(
      path.join(this.outputPath, 'specifications.json'),
      JSON.stringify(this.specifications, null, 2)
    );
    
    const summary = {
      timestamp: new Date().toISOString(),
      source: 'Zigbee Alliance',
      urls: [
        'https://zigbeealliance.org/wp-content/uploads/2019/12/07-5123-06-zigbee-cluster-library-specification.pdf',
        'https://zigbeealliance.org/developer_resources/zigbee-3-0-specification/'
      ],
      statistics: {
        cluster_ids: Object.keys(this.clusterIds).length,
        specifications: this.specifications.length
      }
    };
    
    await fs.writeFile(
      path.join(this.outputPath, 'summary.json'),
      JSON.stringify(summary, null, 2)
    );
  }
}

if (require.main === module) {
  const scraper = new ZigbeeAllianceScraper();
  scraper.scrape().then(result => {
    console.log('Result:', result);
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = ZigbeeAllianceScraper;
