const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  outputDir: path.join(__dirname, 'analysis-results'),
  driversDir: path.join(__dirname, 'drivers'),
  requiredFiles: ['device.js', 'driver.js', 'driver.compose.json', 'README.md'],
  maxDepth: 3
};

// Create output directory if it doesn't exist
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

// Analysis results
const analysis = {
  timestamp: new Date().toISOString(),
  nodeVersion: process.version,
  platform: process.platform,
  drivers: [],
  missingFiles: [],
  errors: [],
  stats: {
    totalDrivers: 0,
    completeDrivers: 0,
    incompleteDrivers: 0,
    missingFiles: 0
  }
};

// Function to list directories
function getDirectories(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
  } catch (error) {
    analysis.errors.push(`Error reading directory ${dir}: ${error.message}`);
    return [];
  }
}

// Function to analyze a driver directory
function analyzeDriver(driverPath, depth = 0) {
  if (depth > CONFIG.maxDepth) return;
  
  try {
    const driverName = path.basename(driverPath);
    const driverInfo = {
      name: driverName,
      path: path.relative(__dirname, driverPath),
      files: [],
      missingFiles: [],
      isComplete: true
    };

    // Check for required files
    CONFIG.requiredFiles.forEach(file => {
      const filePath = path.join(driverPath, file);
      const exists = fs.existsSync(filePath);
      
      if (exists) {
        driverInfo.files.push(file);
      } else {
        driverInfo.missingFiles.push(file);
        driverInfo.isComplete = false;
        analysis.stats.missingFiles++;
      }
    });

    // Add to analysis
    analysis.drivers.push(driverInfo);
    analysis.stats.totalDrivers++;
    
    if (driverInfo.isComplete) {
      analysis.stats.completeDrivers++;
    } else {
      analysis.stats.incompleteDrivers++;
      analysis.missingFiles.push({
        driver: driverName,
        missing: driverInfo.missingFiles
      });
    }

    // Recursively analyze subdirectories
    if (depth < CONFIG.maxDepth) {
      const subDirs = getDirectories(driverPath);
      subDirs.forEach(subDir => {
        analyzeDriver(path.join(driverPath, subDir), depth + 1);
      });
    }
  } catch (error) {
    analysis.errors.push(`Error analyzing ${driverPath}: ${error.message}`);
  }
}

// Generate markdown report
function generateMarkdownReport() {
  let report = `# Tuya Zigbee Project Analysis Report\n`;
  report += `Generated on: ${new Date().toLocaleString()}\n\n`;
  
  // Summary
  report += `## 📊 Project Summary\n`;
  report += `- Total Drivers: ${analysis.stats.totalDrivers}\n`;
  report += `- Complete Drivers: ${analysis.stats.completeDrivers}\n`;
  report += `- Incomplete Drivers: ${analysis.stats.incompleteDrivers}\n`;
  report += `- Missing Files: ${analysis.stats.missingFiles}\n\n`;

  // Incomplete Drivers
  if (analysis.stats.incompleteDrivers > 0) {
    report += `## ⚠️ Incomplete Drivers\n`;
    analysis.missingFiles.forEach(item => {
      report += `### ${item.driver}\n`;
      report += `Missing: ${item.missing.join(', ')}\n\n`;
    });
  }

  // Errors
  if (analysis.errors.length > 0) {
    report += `## ❌ Errors\n`;
    analysis.errors.forEach(error => {
      report += `- ${error}\n`;
    });
    report += '\n';
  }

  // Recommendations
  report += `## 🚀 Recommendations\n`;
  if (analysis.stats.incompleteDrivers > 0) {
    report += `1. **Complete Missing Files**: Add the missing files for incomplete drivers.\n`;
  }
  report += `2. **Standardize Structure**: Ensure all drivers follow the same structure.\n`;
  report += `3. **Add Documentation**: Create/update README files for each driver.\n`;
  report += `4. **Automate Checks**: Set up CI/CD to validate driver completeness.\n`;

  return report;
}

// Main function
async function main() {
  console.log('Starting project analysis...');
  
  // Analyze drivers directory if it exists
  if (fs.existsSync(CONFIG.driversDir)) {
    console.log(`Analyzing drivers in: ${CONFIG.driversDir}`);
    const driverDirs = getDirectories(CONFIG.driversDir);
    
    driverDirs.forEach(driverDir => {
      analyzeDriver(path.join(CONFIG.driversDir, driverDir));
    });
  } else {
    console.warn(`Drivers directory not found: ${CONFIG.driversDir}`);
  }

  // Generate reports
  const report = generateMarkdownReport();
  const jsonReport = JSON.stringify(analysis, null, 2);
  
  // Save reports
  fs.writeFileSync(path.join(CONFIG.outputDir, 'analysis_report.md'), report);
  fs.writeFileSync(path.join(CONFIG.outputDir, 'analysis_report.json'), jsonReport);
  
  console.log('\nAnalysis complete!');
  console.log(`- Markdown report: ${path.join(CONFIG.outputDir, 'analysis_report.md')}`);
  console.log(`- JSON report: ${path.join(CONFIG.outputDir, 'analysis_report.json')}`);
  
  // Show summary in console
  console.log('\n' + report.split('## 📊 Project Summary')[1].split('## ')[0]);
}

// Run the analysis
main().catch(error => {
  console.error('Error during analysis:', error);
  process.exit(1);
});
