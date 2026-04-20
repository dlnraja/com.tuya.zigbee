const fs = require('fs');
const path = require('path');

// Remove icon references from custom capabilities to avoid validation errors
const capabilitiesDir = '.homeycompose/capabilities';
const capabilities = [
  'window_detection.json',
  'boost_mode.json',
  'valve_position.json',
  'temperature_calibration.json',
  'eco_temperature.json',
  'frost_protection_temperature.json'
];

for (const capFile of capabilities) {
  const filePath = path.join(capabilitiesDir, capFile);
  
  if (fs.existsSync(filePath)) {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Remove icon reference
    if (content.icon) {
      delete content.icon;
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
      console.log(` Removed icon reference from ${capFile}`);
    }
  }
}

console.log(' Fixed all capability icon references');
