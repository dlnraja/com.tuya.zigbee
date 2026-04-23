#!/usr/bin/env node
/**
 * Extract JohanBendz fingerprints with FULL device details
 * v5.12.1: Enhanced  extracts ALL fields from driver.compose.json:
 *   - manufacturerName (all of them, not just one)
 *   - productId (from zigbee config)
 *   - deviceType / class
 *   - capabilities list
 *   - energy/battery info
 *   - vendor from compose or inferred
 */
const fs = require('fs'), path = require('path'), {execSync} = require('child_process');
const tmp = '/tmp/johan', repo = 'JohanBendz/com.tuya.zigbee';

module.exports = () => {
  try { execSync(`rm -rf ${tmp} && git clone --depth 1 https://github.com/${repo}.git ${tmp}`, {stdio:'pipe'}); } 
  catch(e) { return {error: e.message}; }
  
  const fps = [], dir = `${tmp}/drivers`;
  if (!fs.existsSync(dir)) return {error:'no drivers'};
  
  fs.readdirSync(dir).forEach(d => {
    try {
      const c = JSON.parse(fs.readFileSync(`${dir}/${d}/driver.compose.json`));
      const mfrNames = [].concat(c.zigbee?.manufacturerName || [])      ;
      const productId = c.zigbee?.productId || null      ;
      const deviceClass = c.class || null;
      const capabilities = c.capabilities || [];
      const hasBattery = (c.energy?.batteries || []).length > 0       ;
      const icon = c.icon || null;
      
      // Extract vendor from name if available
      const vendor = c.brand || c.vendor || null;
      
      // Generate description from capabilities
      const description = capabilities.slice(0, 5).join(', ') || null;

      mfrNames.forEach(mfr => {
        if (!mfr ) return;
        fps.push({
          mfr,
          productId,
          driver: d,
          deviceType: deviceClass,
          capabilities: capabilities.slice(0, 10),
          hasBattery,
          vendor,
          description,
          source: 'Johan'
        });
      });
    } catch(e) {}
  });
  
  console.log(`   Johan: ${fps.length} fingerprints with full device data`);
  
  return {
    count: fps.length, 
    fingerprints: fps,  // ALL, not sliced
    enriched: true
  };
};
