const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  DRIVERS_DIR: path.join(__dirname, '..', 'drivers'),
  REQUIRED_FILES: [
    'driver.compose.json',
    'device.js',
    'assets/icon.svg',
    'assets/images/small.png',
    'assets/images/large.png'
  ],
  REQUIRED_FIELDS: {
    'driver.compose.json': [
      'id', 'name', 'class', 'capabilities', 'capabilitiesOptions', 'images', 'icon'
    ],
    'device.js': [
      'onNodeInit', 'onAdded', 'onSettings', 'onDeleted'
    ]
  },
  LANGUAGES: ['en', 'fr', 'nl', 'ta']
};

// Statistics
const stats = {
  totalDrivers: 0,
  validDrivers: 0,
  missingFiles: {},
  missingFields: {},
  missingTranslations: {}
};

/**
 * Check if a file exists
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (err) {
    return false;
  }
}

/**
 * Validate driver files and structure
 */
function validateDriver(driverDir) {
  const driverName = path.basename(driverDir);
  const driverStats = {
    valid: true,
    missingFiles: [],
    missingFields: {},
    missingTranslations: {}
  };

  // Check required files
  CONFIG.REQUIRED_FILES.forEach(file => {
    const filePath = path.join(driverDir, file);
    if (!fileExists(filePath)) {
      driverStats.missingFiles.push(file);
      driverStats.valid = false;
      
      // Update global stats
      if (!stats.missingFiles[file]) {
        stats.missingFiles[file] = 0;
      }
      stats.missingFiles[file]++;
    }
  });

  // Check required fields in JSON files
  Object.entries(CONFIG.REQUIRED_FIELDS).forEach(([file, fields]) => {
    const filePath = path.join(driverDir, file);
    if (fileExists(filePath)) {
      try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const missing = [];
        
        fields.forEach(field => {
          if (!(field in content)) {
            missing.push(field);
          }
        });

        // Check translations for name and description
        if (content.name) {
          const missingLangs = CONFIG.LANGUAGES.filter(lang => !content.name[lang]);
          if (missingLangs.length > 0) {
            driverStats.missingTranslations[file] = driverStats.missingTranslations[file] || {};
            driverStats.missingTranslations[file].name = missingLangs;
          }
        }

        if (missing.length > 0) {
          driverStats.missingFields[file] = missing;
          driverStats.valid = false;
          
          // Update global stats
          if (!stats.missingFields[file]) {
            stats.missingFields[file] = {};
          }
          missing.forEach(field => {
            stats.missingFields[file][field] = (stats.missingFields[file][field] || 0) + 1;
          });
        }
      } catch (error) {
        console.error(`Error parsing ${filePath}:`, error.message);
        driverStats.valid = false;
      }
    }
  });

  // Update global stats
  stats.totalDrivers++;
  if (driverStats.valid) {
    stats.validDrivers++;
  }

  return {
    [driverName]: driverStats
  };
}

/**
 * Get all driver directories
 */
function getDriverDirectories() {
  return fs.readdirSync(CONFIG.DRIVERS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => path.join(CONFIG.DRIVERS_DIR, dirent.name));
}

/**
 * Generate report
 */
function generateReport(results) {
  const report = {
    summary: {
      totalDrivers: stats.totalDrivers,
      validDrivers: stats.validDrivers,
      validationRate: stats.totalDrivers > 0 ? (stats.validDrivers / stats.totalDrivers * 100).toFixed(2) + '%' : '0%',
      missingFiles: stats.missingFiles,
      missingFields: stats.missingFields,
      missingTranslations: stats.missingTranslations
    },
    details: results
  };

  // Save report to file
  const reportPath = path.join(__dirname, '..', 'reports', 'driver-analysis.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  return report;
}

/**
 * Main function
 */
function main() {
  console.log('Starting driver analysis...');
  
  const driverDirs = getDriverDirectories();
  console.log(`Found ${driverDirs.length} drivers to analyze`);
  
  const results = {};
  driverDirs.forEach(dir => {
    const result = validateDriver(dir);
    Object.assign(results, result);
  });
  
  const report = generateReport(results);
  
  console.log('\n=== Analysis Complete ===');
  console.log(`Total Drivers: ${report.summary.totalDrivers}`);
  console.log(`Valid Drivers: ${report.summary.validDrivers} (${report.summary.validationRate})`);
  console.log('\nMissing Files:');
  console.log(JSON.stringify(report.summary.missingFiles, null, 2));
  console.log('\nMissing Fields:');
  console.log(JSON.stringify(report.summary.missingFields, null, 2));
  
  // Exit with error code if there are validation issues
  process.exit(report.summary.validDrivers === report.summary.totalDrivers ? 0 : 1);
}

// Run the analysis
main();
