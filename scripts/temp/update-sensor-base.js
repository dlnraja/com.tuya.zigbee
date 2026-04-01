const fs = require('fs');

const targetFile = 'lib/devices/HybridSensorBase.js';
let content = fs.readFileSync(targetFile, 'utf8');

if (!content.includes('PowerSourceIntelligence')) {
  const requireStatement = "const PowerSourceIntelligence = require('../helpers/PowerSourceIntelligence');\n";
  content = content.replace(/(const.*require.*\n)+/, match => match + requireStatement);
  
  // Replace the old mainsPowered check using string replacement with exactly how it appears
  const searchString =     // v5.12.2: Auto-remove battery for mains-powered sensors\n    if (this.mainsPowered && this.hasCapability('measure_battery')) {\n      await this.removeCapability('measure_battery').catch(() => {});\n      this.log('[HYBRID] Mains-powered: removed measure_battery');\n    };
  
  const replaceString =     // v6.0: Intelligent Power Source Detection\n    this.log('');\n    this.log('🔄 STEP 2.1: Intelligent Power Source Detection...');\n    await PowerSourceIntelligence.applyCapabilities(this, zclNode);;
  
  if (content.includes(searchString)) {
    content = content.replace(searchString, replaceString);
    fs.writeFileSync(targetFile, content);
    console.log('✅ Updated HybridSensorBase.js with PowerSourceIntelligence');
  } else {
    console.log('❌ Could not find exact string to replace in HybridSensorBase.js');
  }
} else {
  console.log('HybridSensorBase.js already contains PowerSourceIntelligence');
}
