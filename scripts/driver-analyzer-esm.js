import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import yaml from 'js-yaml';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const DRIVERS_DIR = path.join(__dirname, '../drivers');
const ANALYSIS_DIR = path.join(__dirname, '../analysis-results');

// Ensure analysis directory exists
if (!fs.existsSync(ANALYSIS_DIR)) {
  fs.mkdirSync(ANALYSIS_DIR, { recursive: true });
}

// Get all driver directories
const driverDirs = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('_'))
  .map(dirent => dirent.name);

const analysisResults = {
  totalDrivers: driverDirs.length,
  validDrivers: 0,
  drivers: []
};

driverDirs.forEach(driverDir => {
  const driverPath = path.join(DRIVERS_DIR, driverDir);
  const driverInfo = {
    name: driverDir,
    path: driverPath,
    issues: [],
    status: 'unknown'
  };

  // Check required files
  const requiredFiles = ['driver.js', 'device.js', 'driver.compose.json'];
  const files = fs.readdirSync(driverPath);
  
  requiredFiles.forEach(file => {
    if (!files.includes(file)) {
      driverInfo.issues.push(`Missing ${file}`);
    }
  });

  // Validate driver.compose.json
  const composePath = path.join(driverPath, 'driver.compose.json');
  if (fs.existsSync(composePath)) {
    try {
      const content = fs.readFileSync(composePath, 'utf8');
      JSON.parse(content);
    } catch (error) {
      driverInfo.issues.push(`Invalid driver.compose.json: ${error.message}`);
    }
  } else {
    driverInfo.issues.push('Missing driver.compose.json');
  }

  // Determine status
  if (driverInfo.issues.length === 0) {
    driverInfo.status = 'valid';
    analysisResults.validDrivers++;
  } else {
    driverInfo.status = 'needs_attention';
  }

  analysisResults.drivers.push(driverInfo);
});

// Generate report
const reportPath = path.join(ANALYSIS_DIR, 'driver-analysis.json');
fs.writeFileSync(reportPath, JSON.stringify(analysisResults, null, 2));
console.log(chalk.green(`Analysis complete. Report saved to ${reportPath}`));
