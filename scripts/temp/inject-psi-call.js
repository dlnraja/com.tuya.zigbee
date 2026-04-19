const fs = require('fs');

const file = 'lib/devices/TuyaHybridDevice.js';
let content = fs.readFileSync(file, 'utf8');

// Find where to inject PowerSourceIntelligence.applyCapabilities
// Best location: After Z2M magic packet and before hybrid mode setup

const searchString = `    // Hybrid mode state
    this._hybridMode = {`;

const replaceString = `    // v6.0: Intelligent Power Source Detection
    this.log('');
    this.log(' Detecting power source...');
    await PowerSourceIntelligence.applyCapabilities(this, zclNode);

    // Hybrid mode state
    this._hybridMode = {`;

if (content.includes('PowerSourceIntelligence.applyCapabilities')) {
  console.log('Already has PowerSourceIntelligence.applyCapabilities call');
} else if (content.includes(searchString)) {
  content = content.replace(searchString, replaceString);
  fs.writeFileSync(file, content);
  console.log(' Added PowerSourceIntelligence.applyCapabilities to TuyaHybridDevice.js');
} else {
  console.log(' Could not find injection point');
}
