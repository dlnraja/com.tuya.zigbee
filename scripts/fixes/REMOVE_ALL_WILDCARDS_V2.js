#!/usr/bin/env node

/**
 * REMOVE ALL WILDCARDS V2 - ULTRA AGRESSIF
 * 
 * Supprime TOUS les wildcards de TOUS les drivers
 * Version 2: Plus agressive, supprime même les wildcards partiels
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');

// TOUS les wildcards possibles
const WILDCARD_PATTERNS = [
  /^_TZ\d{4}_$/,       // _TZ3000_, _TZ3040_, _TZ3210_, _TZ3400_
  /^_TZE\d{3}_$/,      // _TZE200_, _TZE204_, _TZE284_
  /^_TYZB\d{2}_$/,     // _TYZB01_, _TYZB02_
  /^_TZ\d{4}$/,        // _TZ3000 (sans underscore final)
  /^_TZE\d{3}$/,       // _TZE200 (sans underscore final)
  /^_TYZB\d{2}$/       // _TYZB01 (sans underscore final)
];

function isWildcard(id) {
  // Complete IDs: minimum 10 chars avec suffix
  if (id.length < 10) return true;
  
  // Check patterns
  return WILDCARD_PATTERNS.some(pattern => pattern.test(id));
}

function processDriver(driverPath) {
  const composePath = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) return null;
  
  try {
    const content = fs.readFileSync(composePath, 'utf8');
    const driver = JSON.parse(content);
    
    if (!driver.zigbee || !driver.zigbee.manufacturerName) return null;
    
    const originalIds = driver.zigbee.manufacturerName;
    const originalCount = originalIds.length;
    
    // Filter out wildcards - ONLY keep IDs 10+ chars
    const cleanIds = originalIds.filter(id => !isWildcard(id));
    const removedCount = originalCount - cleanIds.length;
    
    if (removedCount > 0) {
      driver.zigbee.manufacturerName = cleanIds;
      
      // Write back
      fs.writeFileSync(composePath, JSON.stringify(driver, null, 2) + '\n', 'utf8');
      
      return {
        driverId: driver.id || path.basename(driverPath),
        removed: removedCount,
        remaining: cleanIds.length,
        removedIds: originalIds.filter(id => isWildcard(id))
      };
    }
    
    return null;
  } catch (err) {
    console.error(`Error processing ${driverPath}:`, err.message);
    return null;
  }
}

function main() {
  console.log('🔥 REMOVE ALL WILDCARDS V2 - ULTRA AGRESSIF\n');
  
  const drivers = fs.readdirSync(DRIVERS_DIR)
    .filter(name => {
      const driverPath = path.join(DRIVERS_DIR, name);
      return fs.statSync(driverPath).isDirectory();
    });
  
  const results = [];
  
  for (const driverName of drivers) {
    const driverPath = path.join(DRIVERS_DIR, driverName);
    const result = processDriver(driverPath);
    if (result) {
      results.push(result);
      console.log(`✓ ${result.driverId}: -${result.removed} wildcards (${result.remaining} IDs restants)`);
    }
  }
  
  // Report
  console.log('\n' + '='.repeat(70));
  console.log('📊 RÉSULTAT FINAL');
  console.log('='.repeat(70));
  
  if (results.length === 0) {
    console.log('✅ Aucun wildcard trouvé! Tous les drivers sont propres.');
  } else {
    console.log(`🔧 ${results.length} drivers nettoyés\n`);
    
    let totalRemoved = 0;
    let totalRemaining = 0;
    
    results.forEach(r => {
      totalRemoved += r.removed;
      totalRemaining += r.remaining;
    });
    
    console.log(`📈 TOTAUX:`);
    console.log(`   Drivers nettoyés: ${results.length}`);
    console.log(`   Wildcards supprimés: ${totalRemoved}`);
    console.log(`   IDs complets conservés: ${totalRemaining}`);
    console.log('='.repeat(70));
    console.log('\n✅ Nettoyage complet terminé!');
  }
}

main();
