const fs = require('fs');

// Add PowerSourceIntelligence to HybridSensorBase.js
const file = 'lib/devices/HybridSensorBase.js';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('PowerSourceIntelligence')) {
  const lines = content.split('\n');
  let newLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    newLines.push(lines[i]);
    
    // Add require after IEEEAdvancedEnrollment
    if (lines[i].includes('const IEEEAdvancedEnrollment')) {
      newLines.push("const PowerSourceIntelligence = require('../helpers/PowerSourceIntelligence');");
    }
  }
  
  fs.writeFileSync(file, newLines.join('\n'));
  console.log(' Added PowerSourceIntelligence require to HybridSensorBase.js');
} else {
  console.log('Already contains PowerSourceIntelligence');
}
