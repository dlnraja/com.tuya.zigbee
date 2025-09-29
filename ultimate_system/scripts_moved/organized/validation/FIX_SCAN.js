const fs = require('fs');

console.log('🔍 FIX SCAN v6.0.0');

let mfgIds = [];
let productIds = [];

fs.readdirSync('./drivers').forEach(driver => {
  const composePath = `./drivers/${driver}/driver.compose.json`;
  if (fs.existsSync(composePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(composePath));
      if (data.zigbee && data.zigbee.manufacturerName) {
        mfgIds.push(...data.zigbee.manufacturerName);
      }
      if (data.zigbee && data.zigbee.productId) {
        productIds.push(...data.zigbee.productId);
      }
    } catch (e) {
      console.log(`⚠️ Error reading ${driver}: ${e.message}`);
    }
  }
});

console.log(`📊 Found ${mfgIds.length} manufacturer IDs, ${productIds.length} product IDs`);
console.log(`✅ Scan complete - ${mfgIds.length + productIds.length} total IDs`);
