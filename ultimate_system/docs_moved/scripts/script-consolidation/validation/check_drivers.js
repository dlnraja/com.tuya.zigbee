#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

// Configuration
const DRIVERS_DIR = path.join(__dirname, 'drivers');
const REQUIRED_FILES = ['device.js', 'driver.js', 'driver.compose.json', 'README.md'];

// Results
const results = {
  total: 0,
  complete: 0,
  missingFiles: {},
  byType: {},
  drivers: {}
};

// Initialize missing files counter
REQUIRED_FILES.forEach(file => {
  results.missingFiles[file] = 0;
});

// Get all driver directories
try {
  const driverDirs = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  results.total = driverDirs.length;
  
  // Analyze each driver
  driverDirs.forEach(dir => {
    const driverPath = path.join(DRIVERS_DIR, dir);
    const files = fs.readdirSync(driverPath);
    const driverType = dir.split('-')[0] || 'unknown';
    
    // Count by type
    if (!results.byType[driverType]) {
      results.byType[driverType] = 0;
    }
    results.byType[driverType]++;
    
    // Check for required files
    const driverInfo = {
      path: dir,
      files: {},
      missingFiles: []
    };
    
    let isComplete = true;
    
    REQUIRED_FILES.forEach(file => {
      const hasFile = files.includes(file);
      driverInfo.files[file] = hasFile;
      
      if (!hasFile) {
        results.missingFiles[file]++;
        driverInfo.missingFiles.push(file);
        isComplete = false;
      }
    });
    
    if (isComplete) {
      results.complete++;
    }
    
    results.drivers[dir] = driverInfo;
  });
  
  // Calculate completion percentage
  results.completionRate = Math.round((results.complete / results.total) * 100) || 0;
  
} catch (error) {
  console.error('Error analyzing drivers:', error.message);
  process.exit(1);
}

// Print results
console.log('\n=== Driver Analysis ===\n');
console.log(`Total Drivers: ${results.total}`);
console.log(`Complete Drivers: ${results.complete} (${results.completionRate}%)\n`);

console.log('Missing Files:');
Object.entries(results.missingFiles).forEach(([file, count]) => {
  if (count > 0) {
    console.log(`- ${file}: ${count} missing`);
  }
});

console.log('\nDriver Types:');
Object.entries(results.byType)
  .sort((a, b) => b[1] - a[1])
  .forEach(([type, count]) => {
    console.log(`- ${type}: ${count}`);
  });

// Save results to file
const outputDir = path.join(__dirname, 'analysis-results');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, 'driver-analysis.json');
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
console.log(`\nAnalysis saved to: ${outputPath}`);
