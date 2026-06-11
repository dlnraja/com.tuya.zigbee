'use strict';

/**
 * Generate driver.firmware.compose.json for Homey native Zigbee OTA support
 * 
 * Usage: node scripts/ota/generate-firmware-compose.js [driver_id]
 * 
 * This script:
 * 1. Reads driver.compose.json to get manufacturerName and productId
 * 2. Queries Koenkk/zigbee-OTA index for matching firmware
 * 3. Generates driver.firmware.compose.json with metadata
 * 4. Downloads firmware files to assets/firmware/
 * 
 * Requires: Node.js 18+, homey CLI v4.3.0+
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const DRIVERS_DIR = path.join(__dirname, '..', '..', 'drivers');
const OTA_INDEX_URL = 'https://raw.githubusercontent.com/Koenkk/zigbee-OTA/master/index.json';

async function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => { file.close(); fs.unlinkSync(destPath); reject(err); });
  });
}

function computeHash(filePath, algorithm = 'sha256') {
  const data = fs.readFileSync(filePath);
  return `${algorithm}:${crypto.createHash(algorithm).update(data).digest('hex')}`;
}

async function generateFirmwareCompose(driverId) {
  const driverDir = path.join(DRIVERS_DIR, driverId);
  const composePath = path.join(driverDir, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    console.error(`❌ driver.compose.json not found for ${driverId}`);
    return null;
  }

  const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  const zigbee = compose.zigbee || {};
  const manufacturerNames = Array.isArray(zigbee.manufacturerName) 
    ? zigbee.manufacturerName 
    : [zigbee.manufacturerName].filter(Boolean);
  const productIds = Array.isArray(zigbee.productId) 
    ? zigbee.productId 
    : [zigbee.productId].filter(Boolean);

  if (manufacturerNames.length === 0) {
    console.warn(`⚠️  No manufacturerName found for ${driverId}`);
    return null;
  }

  console.log(`\n📦 Processing driver: ${driverId}`);
  console.log(`   Manufacturers: ${manufacturerNames.join(', ')}`);
  console.log(`   Products: ${productIds.join(', ')}`);

  // Query OTA index
  let otaIndex = [];
  try {
    otaIndex = await fetchJSON(OTA_INDEX_URL);
    console.log(`   Loaded ${otaIndex.length} OTA entries from Koenkk/zigbee-OTA`);
  } catch (err) {
    console.error(`   ❌ Failed to fetch OTA index: ${err.message}`);
    return null;
  }

  // Find matching firmware entries
  const matches = [];
  for (const entry of otaIndex) {
    const url = (entry.url || '').toLowerCase();
    const mfr = (entry.manufacturerName || '').toLowerCase();
    const model = (entry.modelId || '').toLowerCase();
    
    for (const mfrName of manufacturerNames) {
      if (url.includes(mfrName.toLowerCase()) || mfr.includes(mfrName.toLowerCase())) {
        matches.push(entry);
        break;
      }
    }
    for (const pid of productIds) {
      if (url.includes(pid.toLowerCase()) || model.includes(pid.toLowerCase())) {
        if (!matches.includes(entry)) matches.push(entry);
        break;
      }
    }
  }

  if (matches.length === 0) {
    console.log(`   ℹ️  No OTA firmware found for ${driverId}`);
    return null;
  }

  console.log(`   ✅ Found ${matches.length} matching firmware entries`);

  // Generate firmware compose
  const firmwareDir = path.join(driverDir, 'assets', 'firmware');
  if (!fs.existsSync(firmwareDir)) {
    fs.mkdirSync(firmwareDir, { recursive: true });
  }

  const updates = [];
  for (const match of matches.slice(0, 5)) { // Limit to 5 most recent
    const fileName = match.url.split('/').pop() || `firmware_${match.fileVersion}.bin`;
    const destPath = path.join(firmwareDir, fileName);
    
    try {
      console.log(`   ⬇️  Downloading ${fileName}...`);
      await downloadFile(match.url, destPath);
      
      const stats = fs.statSync(destPath);
      const integrity = computeHash(destPath);
      
      updates.push({
        changelog: { en: `OTA firmware update v${match.fileVersion || 'unknown'}` },
        device: {
          manufacturerName: manufacturerNames[0],
          productId: productIds.length > 0 ? productIds : [compose.name?.en || driverId]
        },
        files: [{
          fileVersion: match.fileVersion || 0,
          imageType: match.imageType || 0,
          manufacturerCode: match.manufacturerCode || 0,
          size: stats.size,
          name: fileName,
          integrity: integrity
        }]
      });
      
      console.log(`   ✅ ${fileName} (${stats.size} bytes)`);
    } catch (err) {
      console.error(`   ❌ Failed to download ${fileName}: ${err.message}`);
    }
  }

  if (updates.length === 0) {
    console.log(`   ℹ️  No firmware files could be downloaded`);
    return null;
  }

  const firmwareCompose = {
    wakeInstruction: {
      en: "Wake up the device (press button or trigger sensor) to start the firmware update."
    },
    updates: updates
  };

  const outputPath = path.join(driverDir, 'driver.firmware.compose.json');
  fs.writeFileSync(outputPath, JSON.stringify(firmwareCompose, null, 2));
  console.log(`   ✅ Generated ${outputPath}`);
  
  return firmwareCompose;
}

async function main() {
  const targetDriver = process.argv[2];
  
  if (targetDriver) {
    await generateFirmwareCompose(targetDriver);
  } else {
    // Process all drivers
    const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => {
      const dir = path.join(DRIVERS_DIR, d);
      return fs.statSync(dir).isDirectory() && !d.startsWith('_');
    });
    
    console.log(`\n🔄 Processing ${drivers.length} drivers...\n`);
    
    let generated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const driver of drivers) {
      try {
        const result = await generateFirmwareCompose(driver);
        if (result) generated++;
        else skipped++;
      } catch (err) {
        console.error(`❌ Error processing ${driver}: ${err.message}`);
        errors++;
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Generated: ${generated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors: ${errors}`);
  }
}

main().catch(console.error);
