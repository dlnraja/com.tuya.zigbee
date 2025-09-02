import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { dirname } from 'path';

// Get current directory in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const CONFIG = {
  DRIVERS_DIR: path.join(process.cwd(), 'drivers'),
  OUTPUT_DIR: path.join(process.cwd(), 'analysis-results'),
  REQUIRED_FILES: [
    'device.js',
    'driver.js',
    'driver.compose.json',
    'README.md'
  ],
  OPTIONAL_FILES: [
    'test/test.js',
    'test/unit.test.js',
    'test/integration.test.js',
    'test/e2e.test.js'
  ],
  REQUIRED_JSON_FIELDS: [
    'id',
    'name',
    'class',
    'capabilities',
    'images',
    'zigbee'
  ],
  LANGUAGES: ['en', 'fr', 'nl', 'ta'],
  DEFAULT_LANGUAGE: 'en'
};

// Helper function to safely read JSON files
function readJsonFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn(`  Error reading JSON file ${filePath}:`, error.message);
  }
  return null;
}

// Helper function to check file existence
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    console.warn(`  Error checking file ${filePath}:`, error.message);
    return false;
  }
}

// Validate a single driver directory
function validateDriver(driverDir) {
  const driverPath = path.join(CONFIG.DRIVERS_DIR, driverDir);
  const result = {
    name: driverDir,
    path: driverPath,
    files: {},
    score: 0,
    issues: [],
    warnings: [],
    stats: {
      files: { found: 0, total: CONFIG.REQUIRED_FILES.length },
      tests: { found: 0, total: 0 },
      documentation: { hasReadme: false },
      zigbee: { clusters: new Set(), devices: 0 }
    }
  };

  // Check required files
  for (const file of CONFIG.REQUIRED_FILES) {
    const filePath = path.join(driverPath, file);
    const exists = fileExists(filePath);
    result.files[file] = exists;
    
    if (exists) {
      result.stats.files.found++;
      
      // Process specific file types
      if (file === 'driver.compose.json') {
        const json = readJsonFile(filePath);
        if (json) {
          // Check required fields
          for (const field of CONFIG.REQUIRED_JSON_FIELDS) {
            if (!(field in json)) {
              result.issues.push(`Missing required field in driver.compose.json: ${field}`);
            }
          }
          
          // Track zigbee clusters and devices
          if (json.zigbee) {
            if (json.zigbee.manufacturer) {
              result.stats.zigbee.devices++;
            }
            if (json.zigbee.clusters) {
              json.zigbee.clusters.forEach(cluster => result.stats.zigbee.clusters.add(cluster));
            }
          }
        }
      } else if (file === 'README.md') {
        result.stats.documentation.hasReadme = true;
      }
    } else {
      result.issues.push(`Missing required file: ${file}`);
    }
  }
  
  // Check test files
  for (const testFile of CONFIG.OPTIONAL_FILES) {
    if (fileExists(path.join(driverPath, testFile))) {
      result.stats.tests.found++;
    }
  }
  
  // Calculate score (0-100)
  result.score = Math.round((
    (result.stats.files.found / result.stats.files.total) * 50 +
    (result.stats.tests.found > 0 ? 30 : 0) +
    (result.stats.documentation.hasReadme ? 20 : 0)
  ));
  
  return result;
}

// Update summary with driver results
function updateSummary(summary, driverResult) {
  // Update file stats
  summary.files.total += driverResult.stats.files.total;
  summary.files.missing += (driverResult.stats.files.total - driverResult.stats.files.found);
  
  // Update test stats
  summary.tests.total++;
  if (driverResult.stats.tests.found > 0) {
    summary.tests.withTests++;
  }
  
  // Update documentation stats
  summary.documentation.total++;
  if (driverResult.stats.documentation.hasReadme) {
    summary.documentation.withReadme++;
  }
  
  // Update zigbee stats
  driverResult.stats.zigbee.clusters.forEach(cluster => summary.zigbee.clusters.add(cluster));
  summary.zigbee.devices += driverResult.stats.zigbee.devices;
  
  // Update score distribution
  if (driverResult.score >= 90) {
    summary.byScore.excellent++;
  } else if (driverResult.score >= 70) {
    summary.byScore.good++;
  } else if (driverResult.score >= 40) {
    summary.byScore.needsWork++;
  } else {
    summary.byScore.incomplete++;
  }
  
  // Update category distribution
  const category = driverResult.name.split('-')[0] || 'other';
  summary.byCategory[category] = (summary.byCategory[category] || 0) + 1;
}

// Generate a detailed report
function generateReport(results) {
  // Sort drivers by score (descending)
  results.drivers.sort((a, b) => b.score - a.score);
  
  // Prepare report data
  const reportData = {
    timestamp: results.timestamp,
    summary: results.summary,
    topDrivers: results.drivers.slice(0, 5),
    driversNeedingAttention: results.drivers
      .filter(d => d.score < 70)
      .sort((a, b) => a.score - b.score)
      .slice(0, 5)
  };
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
    fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
  }
  
  // Save JSON report
  const reportPath = path.join(CONFIG.OUTPUT_DIR, `driver-analysis-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  
  return reportPath;
}

// Main execution
async function main() {
  try {
    console.log('Starting driver analysis...');
    console.log(`Scanning drivers in: ${CONFIG.DRIVERS_DIR}`);
    
    // Ensure output directory exists
    if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
      fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
    }
    
    // Get all driver directories
    const driverDirs = fs.readdirSync(CONFIG.DRIVERS_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    if (driverDirs.length === 0) {
      console.warn('No driver directories found. Please check the DRIVERS_DIR path in the configuration.');
      return;
    }
    
    console.log(`Found ${driverDirs.length} driver directories`);
    
    // Analyze each driver
    const results = {
      timestamp: new Date().toISOString(),
      totalDrivers: driverDirs.length,
      drivers: [],
      summary: {
        byCategory: {},
        byScore: { excellent: 0, good: 0, needsWork: 0, incomplete: 0 },
        files: { missing: 0, total: 0 },
        tests: { withTests: 0, total: 0 },
        documentation: { withReadme: 0, total: 0 },
        zigbee: { clusters: new Set(), devices: 0 }
      }
    };
    
    for (const driverDir of driverDirs) {
      console.log(`\nAnalyzing driver: ${driverDir}`);
      const driverResult = validateDriver(driverDir);
      results.drivers.push(driverResult);
      
      // Log basic info
      console.log(`  Score: ${driverResult.score}/100`);
      if (driverResult.issues.length > 0) {
        console.log(`  Issues: ${driverResult.issues.length}`);
      }
      
      // Update summary
      updateSummary(results.summary, driverResult);
    }
    
    // Generate report
    const reportPath = generateReport(results);
    
    // Print summary
    console.log('\n=== Analysis Summary ===');
    console.log(`Total drivers analyzed: ${results.totalDrivers}`);
    console.log(`Drivers with tests: ${results.summary.tests.withTests}/${results.summary.tests.total}`);
    console.log(`Drivers with README: ${results.summary.documentation.withReadme}/${results.summary.documentation.total}`);
    console.log(`Missing files: ${results.summary.files.missing} (out of ${results.summary.files.total})`);
    console.log(`Zigbee devices: ${results.summary.zigbee.devices}`);
    console.log(`Zigbee clusters: ${results.summary.zigbee.clusters.size}`);
    
    console.log(`\nReport generated: ${reportPath}`);
    
  } catch (error) {
    console.error('Error during analysis:', error);
    process.exit(1);
  }
}

// Run the analysis
main();
