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

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const OUTPUT_FILE = path.join(__dirname, '..', 'resources', 'z2m-devices.json');
const Z2M_URL = 'https://www.zigbee2mqtt.io/supported-devices/';

async function fetchZigbee2MQTTDevices() {
  try {
    console.log('🌐 Fetching devices from Zigbee2MQTT...');
    
    // Fetch the devices page
    const response = await axios.get(Z2M_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    // Parse the HTML
    const dom = new JSDOM(response.data);
    const document = dom.window.document;
    
    // Extract device data from the page
    const devices = [];
    const rows = document.querySelectorAll('table tbody tr');
    
    rows.forEach(row => {
      const columns = row.querySelectorAll('td');
      if (columns.length >= 2) {
        const model = columns[0].textContent.trim();
        const description = columns[1].textContent.trim();
        const link = columns[0].querySelector('a')?.href || '';
        
        devices.push({
          model,
          description,
          url: link.startsWith('http') ? link : `https://www.zigbee2mqtt.io${link}`,
          source: 'zigbee2mqtt',
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Save to file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(devices, null, 2));
    console.log(`✅ Saved ${devices.length} devices to ${OUTPUT_FILE}`);
    
    return devices;
  } catch (error) {
    console.error('❌ Error fetching Zigbee2MQTT devices:', error.message);
    
    // If we have a previous version, return that instead of failing
    if (fs.existsSync(OUTPUT_FILE)) {
      console.log('Using cached version instead');
      return JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
    }
    
    throw error;
  }
}

// Run the function if this file is executed directly
if (require.main === module) {
  fetchZigbee2MQTTDevices().catch(console.error);
}

module.exports = fetchZigbee2MQTTDevices;
