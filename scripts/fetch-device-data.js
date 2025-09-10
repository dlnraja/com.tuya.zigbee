#!/usr/bin/env node
// Fallback implementations for missing dependencies

const https = require('https');
const http = require('http');
// Fallback HTTP client
const axios = {
  get: (url) => new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ data }));
    }).on('error', reject);
  })
};

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execSync } = require('child_process');

class DeviceDataFetcher {
  constructor() {
    this.outputDir = path.join(__dirname, '..', 'research', 'device-data');
    this.ensureDirectoryExists(this.outputDir);
    this.sources = {
      zigbee2mqtt: 'https://zigbee2mqtt.io/supported-devices/',
      homeyCommunity: 'https://community.homey.app/t/zigbee-device-support/12345', // Example URL
      tuyaDevices: 'https://developer.tuya.com/en/docs/iot/device-list?id=K9m1d1n3v5l3k'
    };
  }

  ensureDirectoryExists(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async fetchZigbee2MQTTDevices() {
    try {
      console.log('Fetching devices from Zigbee2MQTT...');
      const response = await axios.get(this.sources.zigbee2mqtt);
      const devices = this.parseZ2MDevices(response.data);
      
      const outputPath = path.join(this.outputDir, 'zigbee2mqtt-devices.json');
      fs.writeFileSync(outputPath, JSON.stringify(devices, null, 2));
      console.log(`✅ Saved ${devices.length} devices to ${outputPath}`);
      
      return devices;
    } catch (error) {
      console.error('❌ Error fetching Zigbee2MQTT devices:', error.message);
      return [];
    }
  }

  parseZ2MDevices(html) {
    const devices = [];
    // This is a simplified parser - in a real scenario, you'd want to use a proper HTML parser
    const regex = /<tr>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>/g;
    let match;
    
    while ((match = regex.exec(html)) !== null) {
      devices.push({
        manufacturer: match[1].trim(),
        model: match[2].trim(),
        source: 'zigbee2mqtt',
        timestamp: new Date().toISOString()
      });
    }
    
    return devices;
  }

  async fetchHomeyCommunityDevices() {
    try {
      console.log('Fetching device discussions from Homey Community...');
      // This would be replaced with actual API calls or web scraping
      // For now, we'll return a sample structure
      const devices = [
        {
          name: 'Tuya Motion Sensor',
          model: 'RS0201',
          capabilities: ['alarm_motion', 'measure_battery'],
          source: 'homey_community',
          timestamp: new Date().toISOString()
        }
      ];
      
      const outputPath = path.join(this.outputDir, 'homey-community-devices.json');
      fs.writeFileSync(outputPath, JSON.stringify(devices, null, 2));
      console.log(`✅ Saved ${devices.length} community devices to ${outputPath}`);
      
      return devices;
    } catch (error) {
      console.error('❌ Error fetching Homey Community devices:', error.message);
      return [];
    }
  }

  async updateDeviceMatrix() {
    try {
      console.log('Updating device compatibility matrix...');
      const zigbee2mqttDevices = await this.fetchZigbee2MQTTDevices();
      const homeyDevices = await this.fetchHomeyCommunityDevices();
      
      const matrix = {
        updated: new Date().toISOString(),
        sources: Object.keys(this.sources),
        devices: {}
      };
      
      // Process Zigbee2MQTT devices
      zigbee2mqttDevices.forEach(device => {
        if (!matrix.devices[device.model]) {
          matrix.devices[device.model] = {
            model: device.model,
            manufacturer: device.manufacturer,
            supported: {
              zigbee2mqtt: true,
              homey: false,
              homey_notes: ''
            },
            capabilities: [],
            last_updated: new Date().toISOString()
          };
        }
      });
      
      // Process Homey community devices
      homeyDevices.forEach(device => {
        if (matrix.devices[device.model]) {
          matrix.devices[device.model].supported.homey = true;
          matrix.devices[device.model].capabilities = device.capabilities || [];
        } else {
          matrix.devices[device.model] = {
            model: device.model,
            manufacturer: 'Tuya',
            supported: {
              zigbee2mqtt: false,
              homey: true,
              homey_notes: 'Community supported'
            },
            capabilities: device.capabilities || [],
            last_updated: new Date().toISOString()
          };
        }
      });
      
      const matrixPath = path.join(this.outputDir, 'device-matrix.json');
      fs.writeFileSync(matrixPath, JSON.stringify(matrix, null, 2));
      
      console.log(`✅ Device matrix updated with ${Object.keys(matrix.devices).length} devices`);
      
      return matrix;
    } catch (error) {
      console.error('❌ Error updating device matrix:', error);
      throw error;
    }
  }

  async run() {
    try {
      console.log('🚀 Starting device data collection...\n');
      
      // Update all data sources
      await this.updateDeviceMatrix();
      
      console.log('\n✨ Device data collection complete!');
    } catch (error) {
      console.error('❌ Error in device data collection:', error);
      process.exit(1);
    }
  }
}

// Run the fetcher
const fetcher = new DeviceDataFetcher();
fetcher.run();
