'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Generate drivers.json for pairing view
 * Reads all driver.compose.json and extracts fingerprints
 * 
 * Usage: node scripts/tools/generate-drivers-json.js
 * Output: assets/drivers.json
 */
async function generateDriversJSON() {
  console.log('📦 Generating drivers.json for pairing view...\n');
  
  const driversDir = path.join(__dirname, '../../drivers');
  const outputPath = path.join(__dirname, '../../assets/drivers.json');
  
  const drivers = [];
  const driverIds = fs.readdirSync(driversDir);
  
  let processed = 0;
  let errors = 0;
  
  for (const driverId of driverIds) {
    const driverPath = path.join(driversDir, driverId, 'driver.compose.json');
    
    if (!fs.existsSync(driverPath)) {
      // Try driver.json fallback
      const fallbackPath = path.join(driversDir, driverId, 'driver.json');
      if (!fs.existsSync(fallbackPath)) continue;
    }
    
    try {
      const driver = JSON.parse(fs.readFileSync(driverPath, 'utf8'));
      
      const driverInfo = {
        id: driver.id || driverId,
        name: driver.name?.en || driverId,
        manufacturerName: driver.manufacturerName || [],
        productId: driver.productId || [],
        modelId: driver.modelId || [],
        class: driver.class,
        capabilities: driver.capabilities || [],
        endpoints: driver.zigbee?.endpoints ? Object.keys(driver.zigbee.endpoints) : [],
        clusters: extractClusters(driver.zigbee?.endpoints),
        category: driver.category || 'Other',
        icon: driver.images?.small || `/drivers/${driverId}/assets/images/small.png`
      };
      
      drivers.push(driverInfo);
      processed++;
      
    } catch (err) {
      console.error(`❌ Error processing ${driverId}:`, err.message);
      errors++;
    }
  }
  
  // Sort by specificity (more specific first)
  drivers.sort((a, b) => {
    const aScore = (a.manufacturerName?.length || 0) * 10 + 
                   (a.productId?.length || 0) * 5 +
                   (a.clusters?.length || 0);
    const bScore = (b.manufacturerName?.length || 0) * 10 + 
                   (b.productId?.length || 0) * 5 +
                   (b.clusters?.length || 0);
    
    // Penalize generic TS0002
    if (a.productId?.includes('TS0002') && a.productId.length === 1) return 1;
    if (b.productId?.includes('TS0002') && b.productId.length === 1) return -1;
    
    return bScore - aScore;
  });
  
  // Write to assets/
  const assetsDir = path.join(__dirname, '../../assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(drivers, null, 2));
  
  console.log(`\n✅ Generated drivers.json`);
  console.log(`   📊 ${drivers.length} drivers processed`);
  console.log(`   ❌ ${errors} errors`);
  console.log(`   📁 Output: ${outputPath}\n`);
  
  // Statistics
  const generic = drivers.filter(d => 
    d.productId?.includes('TS0002') && d.manufacturerName?.length === 0
  );
  const specific = drivers.filter(d => 
    d.manufacturerName?.length > 0 && d.productId?.length > 0
  );
  
  console.log(`📈 Statistics:`);
  console.log(`   🎯 Specific drivers: ${specific.length}`);
  console.log(`   ⚠️  Generic drivers: ${generic.length}`);
  
  if (generic.length > 0) {
    console.log(`\n⚠️  Generic drivers that need manufacturer IDs:`);
    generic.forEach(d => console.log(`   - ${d.id}`));
  }
  
  return drivers;
}

/**
 * Extract all clusters from endpoints
 */
function extractClusters(endpoints) {
  if (!endpoints) return [];
  
  const clusters = new Set();
  
  for (const ep of Object.values(endpoints)) {
    if (ep.clusters) {
      ep.clusters.forEach(c => clusters.add(String(c)));
    }
    if (ep.bindings) {
      ep.bindings.forEach(c => clusters.add(String(c)));
    }
  }
  
  return Array.from(clusters);
}

// Run if called directly
if (require.main === module) {
  generateDriversJSON().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { generateDriversJSON };
