const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

/**
 * v7.2.1: Advanced Collision Resolver
 * Now respects productId differences for the same manufacturerName.
 */
const COLLISIONS_TO_FIX = [
  {
    fp: '_TZ3210_ncw88jfq',
    winner: 'air_purifier_climate_hybrid',
    // Only remove if the loser has the SAME productId as the winner,
    // OR if the winner is a strict upgrade for ALL products of this manufacturer.
    strictProductMatch: false, 
    losers: ['air_purifier', 'climate_sensor', 'sensor_climate_temphumidsensor_hybrid']
  },
  {
    fp: '_TZ3000_WYHUOCAL',
    winner: 'remote_button_wireless_wall_hybrid',
    strictProductMatch: false,
    losers: ['button_wireless_2', 'contact_sensor']
  }
];

function resolveCollisions() {
  console.log(' Starting Intelligent Collision Resolver v7.2.1...');
  
  COLLISIONS_TO_FIX.forEach(rule => {
    console.log(`\n Processing Rule: ${rule.fp}`);
    
    // Get winner product IDs for comparison if strict mode enabled
    let winnerProductIds = [];
    const winnerPath = path.join(DRIVERS_DIR, rule.winner, 'driver.compose.json');
    if (fs.existsSync(winnerPath)) {
        try {
            const winner = JSON.parse(fs.readFileSync(winnerPath, 'utf8'));
            winnerProductIds = winner.zigbee?.productId || []       ;
        } catch(e) {}
    }

    rule.losers.forEach(loser => {
      const composeFile = path.join(DRIVERS_DIR, loser, 'driver.compose.json');
      if (!fs.existsSync(composeFile)) return;
      
      try {
        let raw = fs.readFileSync(composeFile, 'utf8');
        let compose = JSON.parse(raw);
        let changed = false;
        
        if (compose.zigbee && Array.isArray(compose.zigbee.manufacturerName)) {
          const hasMfr = compose.zigbee.manufacturerName.some(m => m.toLowerCase() === rule.fp.toLowerCase());
          
          if (hasMfr) {
             const loserProductIds = compose.zigbee.productId || [];
             
             // v7.2.1: Safety Check
             // If Rule is NOT strict, OR if product IDs overlap, we remove mfr from loser.
             // If product IDs are completely disjoint, we KEEEP it as it might be a different device.
             const hasOverlap = loserProductIds.some(id => winnerProductIds.includes(id));
             const bothEmpty = loserProductIds.length === 0 && winnerProductIds.length === 0;

             if (!rule.strictProductMatch || hasOverlap || bothEmpty) {
                const originalCount = compose.zigbee.manufacturerName.length;
                compose.zigbee.manufacturerName = compose.zigbee.manufacturerName.filter(
                    m => m.toLowerCase() !== rule.fp.toLowerCase()
                );
                
                if (compose.zigbee.manufacturerName.length !== originalCount) {
                    changed = true;
                    console.log(`   Removed ${rule.fp} from ${loser} (Overlapping/Global Collision)`);
                }
             } else {
                console.log(`   Preserved ${rule.fp} in ${loser} (Different productIds detected)`);
             }
          }
        }
        
        if (changed) {
          fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2) + '\n');
        }
      } catch (e) {
        console.error(`   Error processing ${loser}: ${e.message}`);
      }
    });
  });
  
  console.log('\n Collision Resolution Complete!');
}

resolveCollisions();
