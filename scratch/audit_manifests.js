const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

function checkManifests() {
  console.log('=== DRIVER MANIFEST AUDIT ===');
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory());
  
  let issuesFound = 0;
  
  for (const driver of drivers) {
    const composePath = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;
    
    const content = fs.readFileSync(composePath, 'utf8');
    
    // 1. Check for corruption markers
    if (content.includes('+++++') || content.includes('REPLACE')) {
      console.error(`❌ CORRUPTION DETECTED in ${driver}/driver.compose.json: Found markers!`);
      issuesFound++;
    }
    
    // 2. Check JSON validity
    try {
      const data = JSON.parse(content);
      
      // 3. Check for obvious logical gaps
      if (!data.id) {
        console.error(`❌ ERROR in ${driver}: Missing id`);
        issuesFound++;
      }
      
      if (!data.capabilities || data.capabilities.length === 0) {
        // Some drivers might be virtual or placeholders, but usually they need caps
        if (!driver.includes('diy_custom')) {
           console.warn(`⚠️ WARNING in ${driver}: No capabilities defined`);
        }
      }
      
      if (data.zigbee && (!data.zigbee.manufacturerName || data.zigbee.manufacturerName.length === 0)) {
         console.warn(`⚠️ WARNING in ${driver}: No manufacturerNames in zigbee config`);
      }

    } catch (err) {
      console.error(`❌ SYNTAX ERROR in ${driver}/driver.compose.json: ${err.message}`);
      issuesFound++;
      
      // Try to identify where the syntax error is
      if (content.includes('safeDivide')) {
         console.log(`   (Suspected safeDivide corruption inside JSON!)`);
      }
    }
  }
  
  console.log(`Audit complete. Found ${issuesFound} critical issues.`);
  return issuesFound === 0;
}

checkManifests();
