const fs = require('fs');
const path = require('path');

// Fix validation error for radiator_valve_zigbee
const file = 'drivers/radiator_valve_zigbee/driver.compose.json';
let content = JSON.parse(fs.readFileSync(file, 'utf8'));

// Add energy.batteries section
content.energy = {
  batteries: ['CR2450']
};

fs.writeFileSync(file, JSON.stringify(content, null, 2));
console.log('✅ Fixed radiator_valve_zigbee: Added energy.batteries');
