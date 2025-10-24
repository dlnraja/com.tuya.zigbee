#!/usr/bin/env node

/**
 * PHASE 7: IDENTIFY BRANDS INTELLIGENTLY
 * Identifie les marques manquantes (ZemiSmart, Avatto, Moes, etc.)
 */

const fs = require('fs');
const path = require('path');

console.log('\n🏭 PHASE 7: IDENTIFY BRANDS\n');

const driversDir = path.join(__dirname, '..', '..', 'drivers');

// Mapping manufacturer IDs → Brand
const brandMapping = {
  // ZemiSmart
  '_TZ3000_zmy4lslw': 'zemismart',
  '_TZ3000_dku2cfsc': 'zemismart',
  '_TZ3000_o005nuxx': 'zemismart',
  
  // Avatto
  '_TZ3000_vd43bbfq': 'avatto',
  '_TZ3210_j4pdtz9v': 'avatto',
  '_TZE200_bqcqqjpb': 'avatto',
  
  // Moes
  '_TZE200_b6wax7g0': 'moes',
  '_TZE200_9cxuhakf': 'moes',
  '_TZ3000_uim07oem': 'moes',
  
  // Nous (NOUS)
  '_TZ3000_cphmq0q7': 'nous',
  '_TZ3000_ksw8qtmt': 'nous',
  
  // BlitzWolf
  '_TZ3000_g5xawfcq': 'blitzwolf',
  
  // LSC Smart Connect
  '_TZ3000_odygigth': 'lsc',
  '_TZ3000_ksw8qtmt': 'lsc',
  
  // Lidl/Silvercrest
  '_TZ3000_fvxfrs0y': 'lidl',
  '_TZ3000_w8jwkczz': 'lidl',
  
  // Nedis SmartLife
  '_TZ3000_vzopcetz': 'nedis',
  '_TZ3000_ss98ec5d': 'nedis',
  
  // Lonsonho
  '_TZ3000_qzjcsmar': 'lonsonho',
  '_TZ3000_ji4araar': 'lonsonho',
  
  // BSEED
  '_TZ3000_pdevogdj': 'bseed',
  
  // Aqara (already handled)
  '_TZ3000_gy2fsqf8': 'aqara',
  
  // IKEA (already handled)
  'IKEA': 'ikea',
  
  // Generic Tuya (fallback)
  '_TZ3000_': 'tuya',
  '_TZE200_': 'tuya',
  '_TZE204_': 'tuya',
  'TS': 'tuya'
};

const drivers = fs.readdirSync(driversDir).filter(d =>
  fs.statSync(path.join(driversDir, d)).isDirectory()
);

const brandStats = {};
let analyzed = 0;

for (const driver of drivers) {
  const composePath = path.join(driversDir, driver, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) continue;
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    const manufacturerNames = compose.zigbee?.manufacturerName || [];
    
    let brand = 'generic'; // Default
    
    // Check if already branded
    if (driver.startsWith('tuya_') || 
        driver.startsWith('aqara_') || 
        driver.startsWith('ikea_') ||
        driver.startsWith('zemismart_') ||
        driver.startsWith('avatto_') ||
        driver.startsWith('moes_') ||
        driver.startsWith('nous_') ||
        driver.startsWith('blitzwolf_') ||
        driver.startsWith('lsc_') ||
        driver.startsWith('lidl_') ||
        driver.startsWith('nedis_') ||
        driver.startsWith('lonsonho_') ||
        driver.startsWith('bseed_')) {
      const prefix = driver.split('_')[0];
      brand = prefix;
    } else {
      // Try to identify brand from manufacturer IDs
      for (const mfr of manufacturerNames) {
        for (const [pattern, brandName] of Object.entries(brandMapping)) {
          if (mfr.includes(pattern)) {
            brand = brandName;
            break;
          }
        }
        if (brand !== 'generic') break;
      }
      
      // If still generic, check name patterns
      if (brand === 'generic') {
        if (manufacturerNames.some(m => m.includes('_TZ'))) {
          brand = 'tuya';
        }
      }
    }
    
    brandStats[brand] = (brandStats[brand] || 0) + 1;
    analyzed++;
    
  } catch (err) {
    console.error(`❌ Error analyzing ${driver}: ${err.message}`);
  }
}

console.log('\n📊 BRAND DISTRIBUTION:\n');
Object.entries(brandStats)
  .sort((a, b) => b[1] - a[1])
  .forEach(([brand, count]) => {
    console.log(`   ${brand.toUpperCase().padEnd(15)} ${count} drivers`);
  });

console.log(`\n✅ PHASE 7 TERMINÉE`);
console.log(`Analyzed: ${analyzed}\n`);

// Save brand mapping
const outputPath = path.join(__dirname, '..', '..', 'BRAND_MAPPING.json');
fs.writeFileSync(outputPath, JSON.stringify(brandStats, null, 2), 'utf8');
console.log(`✅ Saved: BRAND_MAPPING.json\n`);
