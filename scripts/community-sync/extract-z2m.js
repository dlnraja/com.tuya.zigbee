#!/usr/bin/env node
/**
 * Extract Zigbee2MQTT fingerprints with full device details
 * v5.7.46: Enhanced to extract productId, device type, and descriptions
 */
const https = require('https'), fs = require('fs'), path = require('path');

const TUYA_TS_URL = 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts';

// Fetch raw TypeScript source
const fetchUrl = (url) => new Promise((resolve, reject) => {
  https.get(url, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => resolve(data));
  }).on('error', reject);
});

// Parse device definitions from tuya.ts
const parseDevices = (src) => {
  const devices = [];
  
  // Match fingerprint blocks with context
  // Pattern: fingerprint: [{modelID: 'XXX', manufacturerName: 'YYY'}]
  const fpRegex = /fingerprint:\s*\[\s*(\{[^}]+\}(?:\s*,\s*\{[^}]+\})*)\s*\]/g;
  const modelRegex = /model:\s*['"]([^'"]+)['"]/;
  const descRegex = /description:\s*['"]([^'"]+)['"]/;
  const vendorRegex = /vendor:\s*['"]([^'"]+)['"]/;
  
  // Split by device definitions
  const deviceBlocks = src.split(/(?=\{\s*(?:zigbeeModel|fingerprint))/);
  
  for (const block of deviceBlocks) {
    // Extract manufacturerName entries
    const mfrMatches = [...block.matchAll(/manufacturerName:\s*['"](_TZ[A-Z0-9]{4}_[a-z0-9]+)['"]/g)];
    const modelIdMatches = [...block.matchAll(/modelID:\s*['"]([^'"]+)['"]/g)];
    const model = block.match(modelRegex)?.[1];
    const desc = block.match(descRegex)?.[1];
    const vendor = block.match(vendorRegex)?.[1];
    
    for (let i = 0; i < mfrMatches.length; i++) {
      const mfr = mfrMatches[i][1];
      const productId = modelIdMatches[i]?.[1] || modelIdMatches[0]?.[1] || null;
      
      devices.push({
        mfr,
        productId,
        model: model || null,
        description: desc || null,
        vendor: vendor || null,
        source: 'Z2M'
      });
    }
  }
  
  // Also catch standalone manufacturer patterns
  const standaloneMatches = [...src.matchAll(/_TZ[A-Z0-9]{4}_[a-z0-9]{8}/g)];
  const seenMfrs = new Set(devices.map(d => d.mfr));
  
  for (const m of standaloneMatches) {
    if (!seenMfrs.has(m[0])) {
      devices.push({ mfr: m[0], productId: null, source: 'Z2M' });
      seenMfrs.add(m[0]);
    }
  }
  
  return devices;
};

module.exports = async () => {
  try {
    console.log('  📡 Fetching Z2M tuya.ts...');
    const src = await fetchUrl(TUYA_TS_URL);
    const devices = parseDevices(src);
    
    // Dedupe by manufacturerName
    const unique = {};
    for (const d of devices) {
      if (!unique[d.mfr] || d.productId) {
        unique[d.mfr] = d;
      }
    }
    
    const result = Object.values(unique);
    console.log(`  ✅ Found ${result.length} unique fingerprints with details`);
    
    // Return with enriched data
    return {
      count: result.length,
      fingerprints: result,
      sample: result.slice(0, 50),
      src: 'Z2M',
      enriched: true
    };
  } catch (e) {
    return { error: e.message };
  }
};
