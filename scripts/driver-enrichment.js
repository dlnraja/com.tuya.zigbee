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

const DRIVERS_DIR = path.join(__dirname, '../drivers');
const TUYA_API = 'https://api.tuya.com/v1.0/devices/'; 

async function enrichDrivers() {
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(dir => 
    fs.statSync(path.join(DRIVERS_DIR, dir)).isDirectory()
  );

  for (const driver of drivers) {
    const composePath = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
    if (fs.existsSync(composePath)) {
      try {
        const compose = JSON.parse(fs.readFileSync(composePath));
        const productId = compose.metadata?.tuya?.productId;
        
        if (productId) {
          const response = await axios.get(`${TUYA_API}${productId}/specification`);
          const tuyaData = response.data;
          
          // Merge Tuya metadata with driver
          compose.metadata.tuya = { ...compose.metadata.tuya, ...tuyaData };
          fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
          console.log(`Enriched ${driver} with Tuya data`);
        }
      } catch (error) {
        console.error(`Failed to enrich ${driver}:`, error.message);
      }
    }
  }
}

// Execute enrichment
enrichDrivers().then(() => {
  console.log('Driver enrichment completed');
  process.exit(0);
});
