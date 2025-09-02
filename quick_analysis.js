// Quick analysis script for Tuya Zigbee project
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  outputDir: path.join(__dirname, 'analysis-results'),
  driversDir: path.join(__dirname, 'drivers'),
  requiredFiles: ['device.js', 'driver.js', 'driver.compose.json', 'README.md']
};

// Ensure output directory exists
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

// Get all driver directories
const driverDirs = fs.readdirSync(CONFIG.driversDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

console.log(`Found ${driverDirs.length} driver directories`);

// Analyze each driver
const analysis = {
  timestamp: new Date().toISOString(),
  totalDrivers: driverDirs.length,
  drivers: [],
  summary: {
    byType: {},
    missingFiles: {},
    hasAllRequiredFiles: 0
  }
};

// Initialize missing files counter
CONFIG.requiredFiles.forEach(file => {
  analysis.summary.missingFiles[file] = 0;
});

// Analyze drivers
driverDirs.forEach(dir => {
  const driverPath = path.join(CONFIG.driversDir, dir);
  const files = fs.readdirSync(driverPath);
  
  // Check for required files
  const driverInfo = {
    name: dir,
    path: driverPath,
    missingFiles: [],
    hasAllFiles: true
  };
  
  CONFIG.requiredFiles.forEach(file => {
    if (!files.includes(file)) {
      driverInfo.missingFiles.push(file);
      analysis.summary.missingFiles[file]++;
      driverInfo.hasAllFiles = false;
    }
  });
  
  if (driverInfo.hasAllFiles) {
    analysis.summary.hasAllRequiredFiles++;
  }
  
  // Determine driver type (first part of directory name)
  const type = dir.split('-')[0] || 'unknown';
  driverInfo.type = type;
  
  // Update type count
  if (!analysis.summary.byType[type]) {
    analysis.summary.byType[type] = 0;
  }
  analysis.summary.byType[type]++;
  
  analysis.drivers.push(driverInfo);
});

// Calculate percentages
analysis.summary.percentages = {
  hasAllRequiredFiles: (analysis.summary.hasAllRequiredFiles / analysis.totalDrivers * 100).toFixed(2)
};

// Generate reports
const reportPath = path.join(CONFIG.outputDir, 'quick-analysis.json');
fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2));

// Generate markdown summary
const markdownReport = `# Tuya Zigbee Project Analysis
**Generated:** ${new Date().toLocaleString()}

## Summary
- **Total Drivers:** ${analysis.totalDrivers}
- **Complete Drivers:** ${analysis.summary.hasAllRequiredFiles} (${analysis.summary.percentages.hasAllRequiredFiles}%)

## Missing Files
${Object.entries(analysis.summary.missingFiles).map(([file, count]) => `- ${file}: ${count} missing (${((count / analysis.totalDrivers) * 100).toFixed(2)}%)`).join('\n')}

## Driver Types
${Object.entries(analysis.summary.byType).map(([type, count]) => `- ${type}: ${count} (${((count / analysis.totalDrivers) * 100).toFixed(2)}%)`).join('\n')}

## Recommendations
1. **Fix Missing Files:** ${Object.entries(analysis.summary.missingFiles).filter(([_, count]) => count > 0).length} file types are missing across drivers
2. **Standardize Drivers:** ${Object.keys(analysis.summary.byType).length} different driver types found - consider standardizing
3. **Documentation:** ${analysis.summary.missingFiles['README.md']} drivers are missing README files
`;

const markdownPath = path.join(CONFIG.outputDir, 'quick-analysis.md');
fs.writeFileSync(markdownPath, markdownReport);

console.log('\n=== Analysis Complete ===');
console.log(`- JSON Report: ${reportPath}`);
console.log(`- Markdown Report: ${markdownPath}`);

// Display summary
console.log('\n=== Quick Summary ===');
console.log(`Total Drivers: ${analysis.totalDrivers}`);
console.log(`Complete Drivers: ${analysis.summary.hasAllRequiredFiles} (${analysis.summary.percentages.hasAllRequiredFiles}%)`);
console.log('\nMissing Files:');
Object.entries(analysis.summary.missingFiles).forEach(([file, count]) => {
  console.log(`- ${file}: ${count} missing`);
});
