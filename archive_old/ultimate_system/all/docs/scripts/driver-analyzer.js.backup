const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const chalk = require('chalk');
const axios = require('axios');
const yaml = require('js-yaml');

const __dirname = path.dirname(require.main.filename);

// Configuration
const DRIVERS_DIR = path.join(__dirname, '../drivers');
const ANALYSIS_DIR = path.join(__dirname, '../analysis-results');
const SUPPORTED_LANGUAGES = ['en', 'fr', 'nl', 'ta'];
const DEFAULT_LANGUAGE = 'en';

// External data sources
const EXTERNAL_SOURCES = {
  tuya: 'https://developer.tuya.com/en/docs/iot/zigbee-development-guide',
  homey: 'https://developer.athom.com/docs/apps/Homey-App-Store-Approval-Requirements',
  zigbee: 'https://zigbeealliance.org/developers/zigbee-cluster-library/'
};

// Stats and results
const analysisResults = {
  timestamp: new Date().toISOString(),
  totalDrivers: 0,
  validDrivers: 0,
  drivers: [],
  issues: {
    critical: [],
    warning: [],
    info: []
  },
  summary: {
    byType: {},
    byManufacturer: {},
    byStatus: {}
  }
};

// Helper functions
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function logMessage(level, message, context) {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, level, message, ...context };
  
  switch (level) {
    case 'error':
      console.error(chalk.red(`[${timestamp}] ERROR: ${message}`));
      analysisResults.issues.critical.push(logEntry);
      break;
    case 'warn':
      console.warn(chalk.yellow(`[${timestamp}] WARNING: ${message}`));
      analysisResults.issues.warning.push(logEntry);
      break;
    case 'info':
      console.log(chalk.blue(`[${timestamp}] INFO: ${message}`));
      analysisResults.issues.info.push(logEntry);
      break;
    default:
      console.log(`[${timestamp}] ${message}`);
  }
  
  return logEntry;
}

// Analysis functions
function analyzeDriver(driverPath, driverName) {
  const driverInfo = {
    name: driverName,
    path: path.relative(process.cwd(), driverPath),
    files: [],
    issues: [],
    metadata: {},
    status: 'unknown',
    lastUpdated: null
  };

  try {
    // Check for required files
    const requiredFiles = ['driver.js', 'device.js', 'driver.compose.json'];
    const files = fs.readdirSync(driverPath);
    
    // Check for required files
    for (const file of requiredFiles) {
      if (!files.includes(file)) {
        driverInfo.issues.push(`Missing required file: ${file}`);
        logMessage('warn', `Missing required file in ${driverName}: ${file}`, { driver: driverName });
      }
    }

    // Analyze driver.compose.json if it exists
    const composePath = path.join(driverPath, 'driver.compose.json');
    if (fs.existsSync(composePath)) {
      try {
        const composeContent = fs.readFileSync(composePath, 'utf8');
        driverInfo.metadata = JSON.parse(composeContent);
        
        // Extract basic information
        driverInfo.name = driverInfo.metadata.name || driverName;
        driverInfo.description = driverInfo.metadata.description || '';
        driverInfo.manufacturer = driverInfo.metadata.manufacturer || 'Unknown';
        driverInfo.model = driverInfo.metadata.model || driverName;
        driverInfo.type = driverInfo.metadata.class || 'unknown';
        
        // Check for multilingual support
        if (typeof driverInfo.metadata.name === 'object') {
          driverInfo.multilingual = true;
          driverInfo.supportedLanguages = Object.keys(driverInfo.metadata.name);
          
          // Check for missing translations
          const missingTranslations = SUPPORTED_LANGUAGES.filter(lang => !driverInfo.supportedLanguages.includes(lang));
          if (missingTranslations.length > 0) {
            driverInfo.issues.push(`Missing translations for: ${missingTranslations.join(', ')}`);
          }
        } else {
          driverInfo.multilingual = false;
          driverInfo.issues.push('Missing multilingual support for driver name');
        }
        
        // Get file stats for last updated
        const stats = fs.statSync(composePath);
        driverInfo.lastUpdated = stats.mtime;
        
        // Check capabilities
        if (Array.isArray(driverInfo.metadata.capabilities)) {
          driverInfo.capabilities = driverInfo.metadata.capabilities;
        } else {
          driverInfo.issues.push('Missing or invalid capabilities array');
        }
        
        // Determine driver status
        if (driverInfo.issues.length === 0) {
          driverInfo.status = 'valid';
          analysisResults.validDrivers++;
        } else {
          driverInfo.status = 'needs_attention';
        }
        
      } catch (error) {
        driverInfo.issues.push(`Error parsing driver.compose.json: ${error.message}`);
        logMessage('error', `Error parsing driver.compose.json in ${driverName}: ${error.message}`, { driver: driverName });
      }
    } else {
      driverInfo.issues.push('Missing driver.compose.json');
      logMessage('error', `Missing driver.compose.json in ${driverName}`, { driver: driverName });
    }
    
    // Analyze device.js if it exists
    const deviceJsPath = path.join(driverPath, 'device.js');
    if (fs.existsSync(deviceJsPath)) {
      try {
        const deviceJs = fs.readFileSync(deviceJsPath, 'utf8');
        // Basic analysis of device.js
        const hasOnInit = deviceJs.includes('onInit');
        const hasOnAdded = deviceJs.includes('onAdded');
        const hasOnDeleted = deviceJs.includes('onDeleted');
        
        driverInfo.deviceMethods = {
          hasOnInit,
          hasOnAdded,
          hasOnDeleted,
          hasCapabilityHandlers: deviceJs.includes('onCapability')
        };
        
        if (!hasOnInit) {
          driverInfo.issues.push('Missing onInit method in device.js');
        }
        
      } catch (error) {
        driverInfo.issues.push(`Error analyzing device.js: ${error.message}`);
        logMessage('error', `Error analyzing device.js in ${driverName}: ${error.message}`, { driver: driverName });
      }
    }
    
    // Analyze driver.js if it exists
    const driverJsPath = path.join(driverPath, 'driver.js');
    if (fs.existsSync(driverJsPath)) {
      try {
        const driverJs = fs.readFileSync(driverJsPath, 'utf8');
        // Basic analysis of driver.js
        driverInfo.driverAnalysis = {
          hasPairing: driverJs.includes('onPair'),
          hasDiscovery: driverJs.includes('onDiscovery') || driverJs.includes('onPairListDevices')
        };
        
        if (!driverInfo.driverAnalysis.hasPairing) {
          driverInfo.issues.push('Missing pairing implementation in driver.js');
        }
        
      } catch (error) {
        driverInfo.issues.push(`Error analyzing driver.js: ${error.message}`);
        logMessage('error', `Error analyzing driver.js in ${driverName}: ${error.message}`, { driver: driverName });
      }
    }
    
    // Update summary statistics
    analysisResults.summary.byType[driverInfo.type] = (analysisResults.summary.byType[driverInfo.type] || 0) + 1;
    analysisResults.summary.byManufacturer[driverInfo.manufacturer] = (analysisResults.summary.byManufacturer[driverInfo.manufacturer] || 0) + 1;
    analysisResults.summary.byStatus[driverInfo.status] = (analysisResults.summary.byStatus[driverInfo.status] || 0) + 1;
    
  } catch (error) {
    logMessage('error', `Error analyzing driver ${driverName}: ${error.message}`, { driver: driverName });
    driverInfo.issues.push(`Fatal error during analysis: ${error.message}`);
    driverInfo.status = 'error';
  }
  
  return driverInfo;
}

function analyzeAllDrivers() {
  logMessage('info', 'Starting driver analysis...');
  
  try {
    // Ensure analysis directory exists
    ensureDir(ANALYSIS_DIR);
    
    // Get all driver directories
    const driverDirs = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('_'))
      .map(dirent => dirent.name);
    
    analysisResults.totalDrivers = driverDirs.length;
    logMessage('info', `Found ${driverDirs.length} drivers to analyze`);
    
    // Analyze each driver
    for (const driverDir of driverDirs) {
      const driverPath = path.join(DRIVERS_DIR, driverDir);
      logMessage('info', `Analyzing driver: ${driverDir}`);
      
      const driverInfo = analyzeDriver(driverPath, driverDir);
      analysisResults.drivers.push(driverInfo);
      
      // Log summary for this driver
      const statusMsg = driverInfo.status === 'valid' ? 
        chalk.green('✓ Valid') : 
        chalk.yellow(`⚠ Needs attention (${driverInfo.issues.length} issues)`);
      
      console.log(`  ${chalk.bold(driverDir)}: ${statusMsg}`);
      
      if (driverInfo.issues.length > 0) {
        console.log('    Issues:');
        driverInfo.issues.forEach(issue => console.log(`    - ${chalk.yellow(issue)}`));
      }
    }
    
    // Generate reports
    generateReports();
    
    logMessage('info', 'Driver analysis completed successfully');
    logMessage('info', `Summary: ${analysisResults.validDrivers}/${analysisResults.totalDrivers} valid drivers`);
    
    if (analysisResults.issues.critical.length > 0) {
      logMessage('warn', `Found ${analysisResults.issues.critical.length} critical issues`);
    }
    
    if (analysisResults.issues.warning.length > 0) {
      logMessage('warn', `Found ${analysisResults.issues.warning.length} warnings`);
    }
    
    return analysisResults;
    
  } catch (error) {
    logMessage('error', `Failed to analyze drivers: ${error.message}`);
    throw error;
  }
}

function generateReports() {
  try {
    // Generate JSON report
    const jsonReportPath = path.join(ANALYSIS_DIR, 'driver-analysis.json');
    fs.writeFileSync(jsonReportPath, JSON.stringify(analysisResults, null, 2));
    logMessage('info', `Generated JSON report: ${jsonReportPath}`);
    
    // Generate Markdown report
    const markdownReport = generateMarkdownReport();
    const markdownPath = path.join(ANALYSIS_DIR, 'driver-analysis.md');
    fs.writeFileSync(markdownPath, markdownReport);
    logMessage('info', `Generated Markdown report: ${markdownPath}`);
    
  } catch (error) {
    logMessage('error', `Failed to generate reports: ${error.message}`);
    throw error;
  }
}

function generateMarkdownReport() {
  const timestamp = new Date().toISOString();
  
  let markdown = `# Tuya Zigbee Driver Analysis Report

**Generated on**: ${timestamp}  
**Total Drivers**: ${analysisResults.totalDrivers}  
**Valid Drivers**: ${analysisResults.validDrivers} (${Math.round((analysisResults.validDrivers / analysisResults.totalDrivers) * 100)}%)  
**Drivers Needing Attention**: ${analysisResults.totalDrivers - analysisResults.validDrivers}

## Summary

### By Type
${generateSummaryTable(analysisResults.summary.byType)}

### By Manufacturer
${generateSummaryTable(analysisResults.summary.byManufacturer)}

### By Status
${generateSummaryTable(analysisResults.summary.byStatus)}

## Issues Summary

### Critical Issues (${analysisResults.issues.critical.length})
${generateIssuesList(analysisResults.issues.critical)}

### Warnings (${analysisResults.issues.warning.length})
${generateIssuesList(analysisResults.issues.warning)}

## Driver Details

${generateDriverDetails()}

## External Resources

- [Tuya Developer Platform](${EXTERNAL_SOURCES.tuya})
- [Homey Developer Documentation](${EXTERNAL_SOURCES.homey})
- [Zigbee Cluster Library](${EXTERNAL_SOURCES.zigbee})

---

*This report was generated automatically by the Tuya Zigbee Driver Analyzer.*
`;

  return markdown;
}

function generateSummaryTable(data) {
  if (!data || Object.keys(data).length === 0) return 'No data available\n';
  
  let table = '| Category | Count |\n|----------|-------|\n';
  
  for (const [category, count] of Object.entries(data)) {
    table += `| ${category} | ${count} |\n`;
  }
  
  return table + '\n';
}

function generateIssuesList(issues) {
  if (!issues || issues.length === 0) return 'No issues found\n';
  
  let list = '';
  
  for (const issue of issues) {
    list += `- ${issue.message}\n`;
  }
  
  return list;
}

function generateDriverDetails() {
  let details = '';
  
  for (const driver of analysisResults.drivers) {
    details += `### ${driver.name}\n`;
    details += `* Path: ${driver.path}\n`;
    details += `* Status: ${driver.status}\n`;
    details += `* Last Updated: ${driver.lastUpdated}\n`;
    details += `* Issues: ${driver.issues.length}\n`;
    details += '\n';
  }
  
  return details;
}
