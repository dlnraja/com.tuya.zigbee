#!/usr/bin/env node
/**
 * scripts/automation/extract-local-keys.js
 * v7.5.0: Automated Local Key Extraction Tool
 * Fetches local keys from Tuya Cloud using provided credentials.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const TuyaSmartLifeAuth = require('../../lib/tuya-local/TuyaSmartLifeAuth');

async function main() {
  const accessId = process.env.TUYA_CLOUD_ACCESS_ID;
  const accessSecret = process.env.TUYA_CLOUD_ACCESS_SECRET;
  const region = process.env.TUYA_CLOUD_REGION || 'eu';

  if (!accessId || !accessSecret) {
    console.error(' Missing TUYA_CLOUD_ACCESS_ID or TUYA_CLOUD_ACCESS_SECRET environment variables.');
    process.exit(1);
  }

  console.log(` Starting Local Key Extraction (Region: ${region})...`);

  const auth = new TuyaSmartLifeAuth({
    region,
    log: { log: console.log, error: console.error }
  });

  try {
    // 1. Login
    const loginRes = await auth.loginWithApiKey(accessId, accessSecret);
    if (!loginRes.success) {
      throw new Error(`Cloud Login Failed: ${loginRes.error}`);
    }
    console.log(' Cloud Authentication Successful');

    // 2. Fetch Devices
    const devRes = await auth.getDevicesWithLocalKeys();
    if (!devRes.success) {
      throw new Error(`Failed to fetch devices: ${devRes.error}`);
    }
    console.log(` Fetched ${devRes.devices.length} devices from cloud`);

    // 3. Export to JSON for use in app
    const output = {
      timestamp: new Date().toISOString(),
      devices: devRes.devices.map(d => ({
        id: d.id,
        name: d.name,
        local_key: d.local_key,
        ip: d.ip,
        product_id: d.product_id,
        category: d.category
      }))
    };

    const outPath = path.join(process.cwd(), 'data/local_keys.json');
    if (!fs.existsSync(path.dirname(outPath))) {
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
    }
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

    console.log(` Extracted local keys saved to: ${outPath}`);
    
    // 4. Verification
    const withKeys = devRes.devices.filter(d => d.local_key).length;
    console.log(` Statistics: ${withKeys} / ${devRes.devices.length} devices have local keys.`);

  } catch (err) {
    console.error(` FATAL: ${err.message}`);
    process.exit(1);
  }
}

main();
