/**
 * Capability Auditor - Checks all drivers for issues
 */
const fs = require('fs');
const path = require('path');
const DRIVERS_DIR = path.join(__dirname, '../../drivers');

let errors = 0, warnings = 0;

fs.readdirSync(DRIVERS_DIR).forEach(driver => {
  const composePath = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return;
  
  try {
    const data = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    const caps = data.capabilities || [];
    const opts = data.capabilitiesOptions || {};
    
    // Check subcapabilities
    caps.filter(c => c.includes('.')).forEach(c => {
      if (!opts[c]) {
        console.log(`⚠️ [${driver}] Missing options: ${c}`);
        warnings++;
      }
    });
    
    // Button check
    if (driver.includes('button') && caps.includes('onoff')) {
      console.log(`❌ [${driver}] Button has onoff`);
      errors++;
    }
  } catch (e) {
    console.log(`❌ [${driver}] JSON error: ${e.message}`);
    errors++;
  }
});

console.log(`\n📊 ${errors} errors, ${warnings} warnings`);
