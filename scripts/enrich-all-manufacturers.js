#!/usr/bin/env node
'use strict';

/**
 * Enrich ALL drivers with comprehensive manufacturer database
 * Based on Homey Community Forum + Johan Bendz + Historical data
 */

const fs = require('fs');
const path = require('path');

// COMPREHENSIVE MANUFACTURER DATABASE
const MANUFACTURER_DB = {
  // Switches & Modules
  'TS0001': ['_TZ3000_qzjcsmar', '_TZ3000_ji4araar', '_TZ3000_tqlv4ug4', '_TZ3000_mx3vgyea', '_TZ3000_zmy4lslw', '_TZ3000_ya9ekqwp'],
  'TS0002': ['_TZ3000_h1ipgkwn', '_TZ3000_w0qqde0g', '_TZ3000_gjnozsaz', '_TZ3000_8gs8h2e4', '_TZ3000_rqbjepe8', '_TZ3000_4rbqgcuv'],
  'TS0003': ['_TZ3000_vsasbzkf', '_TZ3000_odygigth', '_TZ3000_4uf3d0ax', '_TZ3000_wrhhi5h2'],
  'TS0004': ['_TZ3000_jr2atpww', '_TZ3000_krajfo4p', '_TZ3000_xkwalgne', '_TZ3000_nnwehhst'],
  'TS0011': ['_TZ3000_tx5b5gp3', '_TZ3000_pmz6mjyu', '_TZ3000_kpatq5pq'],
  'TS0012': ['_TZ3000_m7wtqkfw', '_TZ3000_kqvb8qa8', '_TZ3000_ljhbw1c9'],
  'TS0013': ['_TZ3000_vjhcenzo', '_TZ3000_zhhcsbrz', '_TZ3000_49qchf10'],
  'TS0014': ['_TZ3000_ssp0maqm', '_TZ3000_o005nuxx', '_TZ3000_bvrlqyj7'],
  
  // USB Outlets
  'TS011F': ['_TZ3000_1obwwnmq', '_TZ3000_w0qqde0g', '_TZ3000_gjnozsaz', '_TZ3000_8gs8h2e4', '_TZ3000_dlz5gn4o'],
  
  // Climate Sensors
  'TS0201': ['_TZ3000_zl1kmjqx', '_TZ3000_yd2e749y', '_TZ3000_fllyghyj', '_TZ3000_bguser20', '_TZ3000_itnrsufe'],
  
  // Motion Sensors
  'TS0202': ['_TZ3000_mmtwjmaq', '_TZ3000_kmh5qpmb', '_TZ3040_bb6xaihh', '_TZ3040_wqmtjsyk'],
  
  // Contact Sensors
  'TS0203': ['_TZ3000_26fmupbb', '_TZ3000_n2egfsli', '_TZ3000_402jjyro', '_TZ3000_k0m3yipr'],
  
  // Water Leak Sensors
  'TS0207': ['_TZ3000_upgcbody', '_TZ3000_kyb656no', '_TZ3000_0s9gukzt'],
  
  // Smart Plugs
  'TS0121': ['_TZ3000_g5xawfcq', '_TZ3000_cehuw1lw', '_TZ3000_1n2zev06', '_TZ3000_okaz9tjs'],
  
  // Curtains
  'TS130F': ['_TZE200_fctwhugx', '_TZE200_cowvfni3', '_TZ3000_vd43bbfq', '_TZE200_zpzndjez', '_TZE200_nogaemzt'],
  
  // Tuya Specialized (TS0601) by type
  'TS0601_climate': ['_TZE200_locansqn', '_TZE200_bjawzodf', '_TZE284_aagrxlbd', '_TZE200_cwbvmsar'],
  'TS0601_thermostat': ['_TZE200_cwbvmsar', '_TZE200_locansqn', '_TZE284_aagrxlbd', '_TZE200_b6wax7g0', '_TZE200_9gvruqf5'],
  'TS0601_air_quality': ['_TZE200_dwcarsat', '_TZE200_ryfmq5rl', '_TZE284_sgabhwa6', '_TZE200_1ibpyhdc'],
  'TS0601_radiator': ['_TZE200_b6wax7g0', '_TZE200_9gvruqf5', '_TZE284_aao6qtcs', '_TZE200_udyjkge1'],
  'TS0601_curtain': ['_TZE200_fctwhugx', '_TZE200_cowvfni3', '_TZE200_zpzndjez', '_TZE200_nogaemzt'],
  'TS0601_lock': ['_TZE200_bmzphld8', '_TZE200_eaac7dkw', '_TZE200_e3kxjcl9'],
  'TS0601_ceiling_fan': ['_TZE200_eevqq1uv', '_TZE200_3towulqd', '_TZE284_1emhi5mm'],
  'TS0601_gateway': ['_TZE200_bjzrowv2', '_TZE200_vm1gyrso'],
  'TS0601_solar': ['_TZE200_lsanae15', '_TZE284_sgabhwa6'],
  'TS0601_sound': ['_TZE200_9yapgbuv', '_TZE284_rccgwzz8'],
  'TS0601_soil': ['_TZE200_myd45weu', '_TZE200_ga1maeof', '_TZE284_asgkb9va'],
};

const driversDir = path.join(__dirname, '..', 'drivers');
const drivers = fs.readdirSync(driversDir)
  .filter(name => fs.statSync(path.join(driversDir, name)).isDirectory() && !name.startsWith('.'));

console.log(`🔄 Enriching ${drivers.length} drivers with comprehensive manufacturer database...\n`);

let enriched = 0;
let added = 0;

drivers.forEach(driverName => {
  const composePath = path.join(driversDir, driverName, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) return;
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    
    if (!compose.zigbee || !compose.zigbee.productId) return;
    
    const productIds = Array.isArray(compose.zigbee.productId) 
      ? compose.zigbee.productId 
      : [compose.zigbee.productId];
    
    // Get current manufacturers
    const current = new Set(
      Array.isArray(compose.zigbee.manufacturerName)
        ? compose.zigbee.manufacturerName
        : []
    );
    
    const beforeCount = current.size;
    
    // Add manufacturers for each productId
    productIds.forEach(pid => {
      // Try exact match first
      const manufacturers = MANUFACTURER_DB[pid] || [];
      manufacturers.forEach(mfg => current.add(mfg));
      
      // Try TS0601 specialized match
      if (pid === 'TS0601') {
        // Guess type from driver name
        const driverLower = driverName.toLowerCase();
        if (driverLower.includes('climate') || driverLower.includes('temp') || driverLower.includes('humid')) {
          (MANUFACTURER_DB['TS0601_climate'] || []).forEach(mfg => current.add(mfg));
        }
        if (driverLower.includes('thermostat')) {
          (MANUFACTURER_DB['TS0601_thermostat'] || []).forEach(mfg => current.add(mfg));
        }
        if (driverLower.includes('air') || driverLower.includes('pm25')) {
          (MANUFACTURER_DB['TS0601_air_quality'] || []).forEach(mfg => current.add(mfg));
        }
        if (driverLower.includes('radiator') || driverLower.includes('valve')) {
          (MANUFACTURER_DB['TS0601_radiator'] || []).forEach(mfg => current.add(mfg));
        }
        if (driverLower.includes('curtain') || driverLower.includes('shutter')) {
          (MANUFACTURER_DB['TS0601_curtain'] || []).forEach(mfg => current.add(mfg));
        }
        if (driverLower.includes('lock')) {
          (MANUFACTURER_DB['TS0601_lock'] || []).forEach(mfg => current.add(mfg));
        }
        if (driverLower.includes('fan')) {
          (MANUFACTURER_DB['TS0601_ceiling_fan'] || []).forEach(mfg => current.add(mfg));
        }
        if (driverLower.includes('gateway') || driverLower.includes('hub')) {
          (MANUFACTURER_DB['TS0601_gateway'] || []).forEach(mfg => current.add(mfg));
        }
        if (driverLower.includes('solar')) {
          (MANUFACTURER_DB['TS0601_solar'] || []).forEach(mfg => current.add(mfg));
        }
        if (driverLower.includes('sound')) {
          (MANUFACTURER_DB['TS0601_sound'] || []).forEach(mfg => current.add(mfg));
        }
        if (driverLower.includes('soil')) {
          (MANUFACTURER_DB['TS0601_soil'] || []).forEach(mfg => current.add(mfg));
        }
      }
    });
    
    const afterCount = current.size;
    const addedCount = afterCount - beforeCount;
    
    if (addedCount > 0) {
      compose.zigbee.manufacturerName = Array.from(current).sort();
      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2) + '\n');
      
      console.log(`✅ ${driverName}: +${addedCount} manufacturers (${beforeCount} → ${afterCount})`);
      enriched++;
      added += addedCount;
    }
    
  } catch (err) {
    console.log(`❌ ${driverName}: ${err.message}`);
  }
});

console.log('\n' + '='.repeat(80));
console.log('📊 ENRICHMENT COMPLETE');
console.log('='.repeat(80));
console.log(`Drivers enriched: ${enriched}`);
console.log(`Total manufacturers added: ${added}`);
console.log('='.repeat(80));
