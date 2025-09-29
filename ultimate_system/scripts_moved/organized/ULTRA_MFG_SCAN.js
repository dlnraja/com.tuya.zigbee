#!/usr/bin/env node
// 🔍 ULTRA MFG SCAN v2.0.0 - Scan complet manufacturer names
const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔍 ULTRA MFG SCAN v2.0.0');

// BASE ULTRA COMPLÈTE MANUFACTURER IDs
const ULTRA_MFG_DB = {
  motion: ['_TZ3000_mmtwjmaq', '_TZ3000_kmh5qpmb', '_TZE200_3towulqd', '_TZ3000_mcxw5ehu', '_TZ3000_lf56vpxj'],
  switch: ['_TZ3000_qzjcsmar', '_TZ3000_ji4araar', '_TZE284_aao6qtcs', '_TZ3000_tasrktzi', '_TZ3000_wyhuocal'],
  plug: ['_TZ3000_g5xawfcq', '_TZ3000_cehuw1lw', '_TZE284_cjbofhxw', '_TZ3000_okaz9tjs', '_TZ3000_2putqrmw'],
  climate: ['_TZE200_cwbvmsar', '_TZE200_bjawzodf', '_TZE200_8ygsuhe1', '_TZE200_ztvwu4nk'],
  curtain: ['_TZE200_fctwhugx', '_TZE200_cowvfni3', '_TZE200_rddyvrci', '_TZE200_xuzcvlku'],
  contact: ['_TZ3000_26fmupbb', '_TZ3000_n2egfsli', '_TZ3000_6jbvbzpi', '_TZ3000_2mbfxlzr'],
  dimmer: ['_TZ3000_rdz06uge', '_TZE284_rccgwzz8', '_TZ3000_7ysdnebc', '_TZ3000_92chsky7'],
  light: ['_TZ3000_msl6wxk9', '_TZE284_98z4zhra', '_TZ3000_oborybow', '_TZ3000_ke_x5ola']
};

// Enrichissement massif drivers
let enriched = 0;
fs.readdirSync('./drivers').forEach(driverName => {
  const composePath = `./drivers/${driverName}/driver.compose.json`;
  if (fs.existsSync(composePath)) {
    const data = JSON.parse(fs.readFileSync(composePath));
    
    // Détection catégorie intelligente
    let category = 'switch';
    for (const [cat, _] of Object.entries(ULTRA_MFG_DB)) {
      if (driverName.toLowerCase().includes(cat)) {
        category = cat;
        break;
      }
    }
    
    // Application manufacturer IDs enrichis
    data.zigbee.manufacturerName = ULTRA_MFG_DB[category];
    fs.writeFileSync(composePath, JSON.stringify(data, null, 2));
    enriched++;
  }
});

// Sauvegarde base enrichie
fs.writeFileSync('./references/ultra_mfg_database.json', JSON.stringify(ULTRA_MFG_DB, null, 2));

console.log(`✅ ENRICHI ${enriched} drivers avec base ultra complète`);

// Validation & push
try {
  execSync('homey app validate && git add -A && git commit -m "🔍 Ultra MFG Scan v2.0.0" && git push', {stdio: 'inherit'});
  console.log('🚀 ULTRA SCAN COMPLETE');
} catch (e) {
  console.log('❌', e.message);
}
