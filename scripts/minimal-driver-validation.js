const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../drivers');
const ANALYSIS_DIR = path.join(__dirname, '../analysis-results/minimal-validation.json');

// Ensure analysis directory exists
if (!fs.existsSync(ANALYSIS_DIR)) {
  fs.mkdirSync(path.dirname(ANALYSIS_DIR), { recursive: true });
}

const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('_'))
  .map(dirent => dirent.name);

const results = {
  total: drivers.length,
  valid: 0,
  drivers: []
};

drivers.forEach(driver => {
  const driverPath = path.join(DRIVERS_DIR, driver);
  const files = fs.readdirSync(driverPath);
  const issues = [];
  
  // Check required files
  const requiredFiles = ['driver.js', 'device.js', 'driver.compose.json'];
  requiredFiles.forEach(file => {
    if (!files.includes(file)) {
      issues.push(`Missing ${file}`);
    }
  });
  
  // Validate driver.compose.json if present
  if (files.includes('driver.compose.json')) {
    try {
      const content = fs.readFileSync(path.join(driverPath, 'driver.compose.json'), 'utf8');
      JSON.parse(content);
    } catch (e) {
      issues.push(`Invalid driver.compose.json: ${e.message}`);
    }
  }
  
  const isValid = issues.length === 0;
  if (isValid) results.valid++;
  
  results.drivers.push({
    driver,
    isValid,
    issues
  });
});

fs.writeFileSync(ANALYSIS_DIR, JSON.stringify(results, null, 2));
console.log(`Minimal validation complete. Results saved to ${ANALYSIS_DIR}`);
