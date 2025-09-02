// Simple driver analysis script
const fs = require('fs');
const path = require('path');

// Configuration
const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');
const OUTPUT_DIR = path.join(__dirname, '..', 'analysis-results');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Get all driver directories
const driverDirs = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

console.log(`Found ${driverDirs.length} driver directories`);

// Analyze drivers
const report = {
  timestamp: new Date().toISOString(),
  totalDrivers: driverDirs.length,
  drivers: [],
  summary: {
    byType: {},
    hasDeviceJs: 0,
    hasDriverJs: 0,
    hasComposeJson: 0,
    hasReadme: 0,
    hasTests: 0
  }
};

// Analyze each driver
driverDirs.forEach(dir => {
  const driverPath = path.join(DRIVERS_DIR, dir);
  const files = fs.readdirSync(driverPath);
  
  // Check for required files
  const hasDeviceJs = files.includes('device.js');
  const hasDriverJs = files.includes('driver.js');
  const hasComposeJson = files.includes('driver.compose.json');
  const hasReadme = files.some(f => f.toLowerCase() === 'readme.md');
  const hasTests = fs.existsSync(path.join(driverPath, 'test'));
  
  // Determine driver type (first part of directory name)
  const type = dir.split('-')[0] || 'unknown';
  
  // Update summary
  report.summary.byType[type] = (report.summary.byType[type] || 0) + 1;
  if (hasDeviceJs) report.summary.hasDeviceJs++;
  if (hasDriverJs) report.summary.hasDriverJs++;
  if (hasComposeJson) report.summary.hasComposeJson++;
  if (hasReadme) report.summary.hasReadme++;
  if (hasTests) report.summary.hasTests++;
  
  // Add driver info
  report.drivers.push({
    name: dir,
    type,
    files: {
      deviceJs: hasDeviceJs,
      driverJs: hasDriverJs,
      composeJson: hasComposeJson,
      readme: hasReadme,
      tests: hasTests
    },
    path: driverPath
  });
});

// Generate report
const reportPath = path.join(OUTPUT_DIR, 'driver-summary.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

// Print summary
console.log('\n=== Driver Analysis Summary ===');
console.log(`Total drivers: ${report.totalDrivers}`);
console.log('\nBy type:');
Object.entries(report.summary.byType)
  .sort((a, b) => b[1] - a[1])
  .forEach(([type, count]) => {
    console.log(`- ${type}: ${count} drivers`);
  });

console.log('\nFile coverage:');
console.log(`- device.js: ${report.summary.hasDeviceJs} (${Math.round((report.summary.hasDeviceJs / report.totalDrivers) * 100)}%)`);
console.log(`- driver.js: ${report.summary.hasDriverJs} (${Math.round((report.summary.hasDriverJs / report.totalDrivers) * 100)}%)`);
console.log(`- driver.compose.json: ${report.summary.hasComposeJson} (${Math.round((report.summary.hasComposeJson / report.totalDrivers) * 100)}%)`);
console.log(`- README.md: ${report.summary.hasReadme} (${Math.round((report.summary.hasReadme / report.totalDrivers) * 100)}%)`);
console.log(`- Tests: ${report.summary.hasTests} (${Math.round((report.summary.hasTests / report.totalDrivers) * 100)}%)`);

console.log(`\nReport saved to: ${reportPath}`);
