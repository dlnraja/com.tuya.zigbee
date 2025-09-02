const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../drivers');
const TEMPLATES_DIR = path.join(__dirname, 'templates');

function repairDrivers() {
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(dir => 
    fs.statSync(path.join(DRIVERS_DIR, dir)).isDirectory()
  );

  drivers.forEach(driver => {
    const driverPath = path.join(DRIVERS_DIR, driver);
    const files = fs.readdirSync(driverPath);
    
    // Repair missing files
    if (!files.includes('device.js')) {
      fs.copyFileSync(
        path.join(TEMPLATES_DIR, 'device.template.js'),
        path.join(driverPath, 'device.js')
      );
    }
    
    // Validate JSON files
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    jsonFiles.forEach(file => {
      try {
        JSON.parse(fs.readFileSync(path.join(driverPath, file)));
      } catch (e) {
        // Auto-repair invalid JSON
        const backup = path.join(driverPath, `${file}.bak`);
        fs.renameSync(path.join(driverPath, file), backup);
        fs.copyFileSync(
          path.join(TEMPLATES_DIR, 'json.template'),
          path.join(driverPath, file)
        );
      }
    });
  });
}

// Execute repair
repairDrivers();
console.log('Driver repair completed');
