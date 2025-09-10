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
const fs = require('fs').promises;

async function fetchBlakadderDevices() {
  try {
    const response = await axios.get('https://raw.githubusercontent.com/blakadder/zigbee/master/devices.json');
    await fs.writeFile('resources/blakadder-devices.json', JSON.stringify(response.data, null, 2));
    console.log('Blakadder devices saved');
  } catch (error) {
    console.error('Error fetching Blakadder devices:', error.message);
  }
}

fetchBlakadderDevices();
