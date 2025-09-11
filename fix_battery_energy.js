const fs = require('fs');
const path = require('path');

function fixBatteryEnergy(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      fixBatteryEnergy(fullPath);
    } else if (file.name === 'driver.compose.json') {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const json = JSON.parse(content);
        
        if (json.capabilities && json.capabilities.includes('measure_battery') && !json.energy) {
          json.energy = {
            batteries: ["INTERNAL"]
          };
          
          fs.writeFileSync(fullPath, JSON.stringify(json, null, 2));
          console.log(`Fixed: ${fullPath}`);
        }
      } catch (error) {
        console.error(`Error processing ${fullPath}:`, error.message);
      }
    }
  }
}

// Fix all drivers
fixBatteryEnergy('./drivers');
console.log('Battery energy configuration fixed for all drivers.');
