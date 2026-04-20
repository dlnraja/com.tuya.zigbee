const fs = require('fs');

const targetFile = 'lib/devices/TuyaHybridDevice.js';
let content = fs.readFileSync(targetFile, 'utf8');

if (!content.includes('PowerSourceIntelligence')) {
  const requireStatement = "const PowerSourceIntelligence = require('../helpers/PowerSourceIntelligence');\n";
  content = content.replace(/(const.*require.*\n)+/, match => match + requireStatement);
  
  // Find a good place to inject PowerSourceIntelligence check
  // Best place is right after ensuring manufacturer settings or before unified handler init
  const searchString = "    // v5.11.16: Unified Manufacturer Initialization";
  
  const replaceString = "    // v6.0: Intelligent Power Source Detection\n    this.log('');\n    this.log(' STEP 1.5: Intelligent Power Source Detection...');\n    await PowerSourceIntelligence.applyCapabilities(this, zclNode);\n\n" + searchString;
  
  if (content.includes(searchString)) {
    content = content.replace(searchString, replaceString);
    fs.writeFileSync(targetFile, content);
    console.log(' Updated TuyaHybridDevice.js with PowerSourceIntelligence');
  } else {
    console.log(' Could not find search string in TuyaHybridDevice.js');
    
    // Alternative location
    const altSearchString = "this.log(' STEP 2: Pre-initializing capabilities...');";
    const altReplaceString = "this.log('');\n    this.log(' STEP 1.5: Intelligent Power Source Detection...');\n    await PowerSourceIntelligence.applyCapabilities(this, zclNode);\n\n    " + altSearchString;
    
    if (content.includes(altSearchString)) {
      content = content.replace(altSearchString, altReplaceString);
      fs.writeFileSync(targetFile, content);
      console.log(' Updated TuyaHybridDevice.js with PowerSourceIntelligence (Alt location)');
    }
  }
} else {
  console.log('TuyaHybridDevice.js already contains PowerSourceIntelligence');
}
