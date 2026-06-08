const fs = require('fs');
const path = require('path');
const driversPath = path.join(__dirname, 'drivers');
let count = 0;

fs.readdirSync(driversPath).forEach(dir => {
  const devPath = path.join(driversPath, dir, 'device.js');
  const compPath = path.join(driversPath, dir, 'driver.compose.json');

  if (fs.existsSync(devPath) && fs.existsSync(compPath)) {
    const compData = fs.readFileSync(compPath, 'utf8');
    
    if (compData.includes('measure_battery') && !compData.includes('alarm_battery')) {
      let devData = fs.readFileSync(devPath, 'utf8');
      
      if (devData.includes('alarm_battery')) {
        const newData = devData.split('\n').map(line => {
          if (line.includes(`capability: 'alarm_battery'`) || line.includes(`capability: "alarm_battery"`)) {
            return '// ' + line + ' // REMOVED - SDK3 Rule AO: never combine measure_battery + alarm_battery';
          }
          return line;
        }).join('\n');
        
        if (newData !== devData) {
          fs.writeFileSync(devPath, newData);
          count++;
          console.log(`Fixed ${dir}`);
        }
      }
    }
  }
});

console.log(`Total drivers fixed: ${count}`);
