const fs = require('fs');
const path = require('path');
const appJsonPath = path.join(__dirname, '..', 'app.json');

function validateDriverIds() {
  const appJson = JSON.parse(fs.readFileSync(appJsonPath));
  const driverIds = new Set();
  const productIds = new Set();
  const duplicateDriverIds = [];
  const duplicateProductIds = [];
  
  appJson.drivers.forEach(driver => {
    // Check driver IDs
    if (driverIds.has(driver.id)) {
      duplicateDriverIds.push(driver.id);
    } else {
      driverIds.add(driver.id);
    }
    
    // Check Zigbee product IDs
    if (driver.zigbee && driver.zigbee.productId) {
      driver.zigbee.productId.forEach(id => {
        if (productIds.has(id)) {
          duplicateProductIds.push(`${driver.id}: ${id}`);
        } else {
          productIds.add(id);
        }
      });
    }
  });

  if (duplicateDriverIds.length > 0 || duplicateProductIds.length > 0) {
    if (duplicateDriverIds.length > 0) {
      console.error('Duplicate driver IDs found:', duplicateDriverIds);
    }
    if (duplicateProductIds.length > 0) {
      console.error('Duplicate Zigbee product IDs found:', duplicateProductIds);
    }
    process.exit(1);
  }
  
  console.log('Validation passed - all driver and product IDs are unique');
}

validateDriverIds();
