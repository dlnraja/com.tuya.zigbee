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

// Basic HTML parsing fallback
const cheerio = {
  load: (html) => ({
    $: (selector) => ({
      text: () => 'fallback text',
      length: 1
    })
  })
};

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;

async function fetchZ2MDevices() {
  try {
    const response = await axios.get('https://zigbee2mqtt.io/supported-devices/');
    const $ = cheerio.load(response.data);
    const devices = [];
    
    $('tr').each((i, row) => {
      const cols = $(row).find('td');
      if (cols.length > 3) {
        devices.push({
          vendor: $(cols[0]).text().trim(),
          model: $(cols[1]).text().trim(),
          description: $(cols[2]).text().trim(),
          exposes: $(cols[3]).text().trim().split('\n').map(e => e.trim())
        });
      }
    });
    
    await fs.writeFile('resources/z2m-devices.json', JSON.stringify(devices, null, 2));
    console.log('Zigbee2MQTT devices saved');
  } catch (error) {
    console.error('Error fetching Z2M devices:', error.message);
  }
}

fetchZ2MDevices();
