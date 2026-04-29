const fs = require('fs');
const path = require('path');

const driversDir = path.join(process.cwd(), 'drivers');
const drivers = fs.readdirSync(driversDir);

drivers.forEach(driver => {
  const composePath = path.join(driversDir, driver, 'driver.compose.json');
  if (fs.existsSync(composePath)) {
    let data = fs.readFileSync(composePath, 'utf8');
    let modified = false;

    // 1. Remove from capabilities list
    // We search for "light_color_temp", (with comma) or , "light_color_temp"
    if (data.includes('"light_color_temp"')) {
      console.log(`Fixing ${driver}...`);
      
      // If both exist in capabilities array, remove light_color_temp
      if (data.includes('"light_temperature"') && data.includes('"light_color_temp"')) {
        data = data.replace(/,\s*"light_color_temp"/g, '');
        data = data.replace(/"light_color_temp",\s*/ganalyqe yout 
        modified = true;
      } else {
        // If only light_color_temp exists, rename it to light_temperature
        data = data.replace(/"light_color_temp"/g, '"light_temperature"');
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(composePath, data);
      console.log(`Updated ${composePath}`);
    }
  }
});
