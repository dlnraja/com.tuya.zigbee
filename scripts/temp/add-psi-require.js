const fs = require('fs');

const file = 'lib/devices/TuyaUnifiedDevice.js';
let content = fs.readFileSync(file, 'utf8');

// Add PowerSourceIntelligence require after other helpers
if (!content.includes('PowerSourceIntelligence')) {
  const requireLine = "const PowerSourceIntelligence = require('../helpers/PowerSourceIntelligence');\n";
  const insertAfter = "const { ensureManufacturerSettings } = require('../helpers/ManufacturerNameHelper');";
  
  content = content.replace(insertAfter, insertAfter + '\n' + requireLine);
  
  fs.writeFileSync(file, content);
  console.log('✅ Added PowerSourceIntelligence require to TuyaUnifiedDevice.js');
} else {
  console.log('Already has PowerSourceIntelligence require');
}
