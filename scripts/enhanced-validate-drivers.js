const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { ZCL } = require('zigbee-clusters');

// Configuration
const CONFIG = {
  rootDir: path.join(__dirname, '..'),
  driversDir: path.join(__dirname, '..', 'drivers'),
  templatesDir: path.join(__dirname, '..', 'drivers', '_templates'),
  requiredFiles: ['driver.compose.json', 'device.js'],
  requiredAssets: ['small.png', 'large.png'],
  reportFile: path.join(__dirname, '..', 'reports', 'driver-validation-report.md'),
  
  // Zigbee specific requirements
  requiredClusters: {
    basic: ZCL.Cluster.BASIC,
    identify: ZCL.Cluster.IDENTIFY
  },
  
  // Common capabilities that should be present in most Zigbee devices
  commonCapabilities: [
    'alarm_battery',
    'measure_battery',
    'measure_voltage'
  ]
};

// Create reports directory if it doesn't exist
if (!fs.existsSync(path.dirname(CONFIG.reportFile))) {
  fs.mkdirSync(path.dirname(CONFIG.reportFile), { recursive: true });
}

// Initialize report
let report = [];

/**
 * Validates a single driver directory
 */
function validateDriver(driverPath, driverName) {
  const issues = [];
  const configPath = path.join(driverPath, 'driver.compose.json');
  const deviceJsPath = path.join(driverPath, 'device.js');
  let config = null;
  let deviceJsContent = '';
  let isZigbee = false;
  
  // 1. Check for required files
  for (const file of CONFIG.requiredFiles) {
    const filePath = path.join(driverPath, file);
    if (!fs.existsSync(filePath)) {
      issues.push(`Missing required file: ${file}`);
    }
  }
  
  // 2. Validate driver.compose.json
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      // Check if this is a Zigbee driver
      isZigbee = config.zigbee !== undefined;
      
      // Required fields for all drivers
      const requiredFields = ['id', 'class', 'name', 'capabilities'];
      for (const field of requiredFields) {
        if (!config[field]) {
          issues.push(`Missing required field in driver.compose.json: ${field}`);
        }
      }
      
      // Zigbee-specific validations
      if (isZigbee) {
        // Check required Zigbee fields
        if (!config.zigbee.manufacturer) {
          issues.push('Zigbee driver is missing manufacturer in zigbee configuration');
        }
        if (!config.zigbee.model) {
          issues.push('Zigbee driver is missing model in zigbee configuration');
        }
        
        // Check for required clusters
        if (config.zigbee.clusters) {
          for (const [clusterName, clusterId] of Object.entries(CONFIG.requiredClusters)) {
            if (!config.zigbee.clusters.includes(clusterId)) {
              issues.push(`Missing required Zigbee cluster: ${clusterName} (${clusterId})`);
            }
          }
        } else {
          issues.push('No Zigbee clusters defined in configuration');
        }
      }
      
      // Check images
      if (config.images) {
        for (const [size, imagePath] of Object.entries(config.images)) {
          const fullPath = path.join(driverPath, imagePath);
          if (!fs.existsSync(fullPath)) {
            issues.push(`Missing image: ${imagePath} (${size})`);
          } else if (!imagePath.toLowerCase().endsWith('.png')) {
            issues.push(`Non-standard image format: ${imagePath} (use .png)`);
          }
        }
      } else {
        issues.push('Missing images section in configuration');
      }
      
    } catch (error) {
      issues.push(`Error reading configuration: ${error.message}`);
    }
  }
  
  // 3. Validate device.js
  if (fs.existsSync(deviceJsPath)) {
    try {
      deviceJsContent = fs.readFileSync(deviceJsPath, 'utf8');
      
      // Check if device extends a Zigbee device class
      const extendsZigbee = deviceJsContent.includes('extends ZigbeeDevice') || 
                          deviceJsContent.includes('extends Homey.ZigBeeDevice');
      
      if (isZigbee && !extendsZigbee) {
        issues.push('Zigbee driver should extend a Zigbee device class');
      }
      
      // Check for required methods
      const requiredMethods = ['onNodeInit', 'onEndDeviceAnnounce', 'onMessage'];
      for (const method of requiredMethods) {
        if (!deviceJsContent.includes(`${method}(`)) {
          issues.push(`Missing required method: ${method}()`);
        }
      }
      
    } catch (error) {
      issues.push(`Error reading device.js: ${error.message}`);
    }
  }
  
  // 4. Check for common capabilities
  if (config && config.capabilities) {
    for (const commonCap of CONFIG.commonCapabilities) {
      if (!config.capabilities.includes(commonCap)) {
        issues.push(`Consider adding common capability: ${commonCap}`);
      }
    }
  }
  
  // 5. Check assets directory
  const assetsDir = path.join(driverPath, 'assets');
  if (!fs.existsSync(assetsDir)) {
    issues.push('Missing assets directory');
  } else {
    for (const asset of CONFIG.requiredAssets) {
      if (!fs.existsSync(path.join(assetsDir, asset))) {
        issues.push(`Missing asset: assets/${asset}`);
      }
    }
  }
  
  return {
    name: driverName,
    path: driverPath,
    isZigbee,
    valid: issues.length === 0,
    issues,
    config
  };
}

/**
 * Generates a detailed markdown report
 */
function generateReport(validationResults) {
  const validCount = validationResults.filter(r => r.valid).length;
  const totalCount = validationResults.length;
  const percentage = Math.round((validCount / totalCount) * 100);
  const zigbeeDrivers = validationResults.filter(r => r.isZigbee);
  const nonZigbeeDrivers = validationResults.filter(r => !r.isZigbee);
  
  let markdown = `# Driver Validation Report

**Generated on:** ${new Date().toISOString()}
**Total Drivers:** ${totalCount}
**Valid Drivers:** ${validCount} (${percentage}%)
**Zigbee Drivers:** ${zigbeeDrivers.length}
**Non-Zigbee Drivers:** ${nonZigbeeDrivers.length}

## Summary

- ✅ **Valid Drivers:** ${validCount}
- ⚠️ **With Warnings:** ${validationResults.filter(r => !r.valid && r.issues.length < 3).length}
- ❌ **Invalid Drivers:** ${validationResults.filter(r => !r.valid && r.issues.length >= 3).length}
- 🌐 **Zigbee Drivers:** ${zigbeeDrivers.length}

## Zigbee Drivers
`;

  // Group drivers by status
  const validZigbee = zigbeeDrivers.filter(r => r.valid);
  const warningZigbee = zigbeeDrivers.filter(r => !r.valid && r.issues.length < 3);
  const invalidZigbee = zigbeeDrivers.filter(r => !r.valid && r.issues.length >= 3);
  
  // Add invalid Zigbee drivers
  if (invalidZigbee.length > 0) {
    markdown += '\n### ❌ Invalid Zigbee Drivers (Require Immediate Attention)\n\n';
    invalidZigbee.forEach(driver => {
      markdown += `#### ${driver.name}\n`;
      markdown += `**Path:** ${path.relative(process.cwd(), driver.path)}\n\n`;
      markdown += '**Issues:**\n';
      markdown += driver.issues.map(issue => `- ${issue}`).join('\n');
      markdown += '\n\n';
    });
  }
  
  // Add warning Zigbee drivers
  if (warningZigbee.length > 0) {
    markdown += '\n### ⚠️ Zigbee Drivers with Warnings\n\n';
    warningZigbee.forEach(driver => {
      markdown += `#### ${driver.name}\n`;
      markdown += `**Path:** ${path.relative(process.cwd(), driver.path)}\n\n`;
      markdown += '**Issues:**\n';
      markdown += driver.issues.map(issue => `- ${issue}`).join('\n');
      markdown += '\n\n';
    });
  }
  
  // Add valid Zigbee drivers
  if (validZigbee.length > 0) {
    markdown += '\n### ✅ Valid Zigbee Drivers\n\n';
    markdown += validZigbee.map(d => `- ${d.name}`).join('\n');
    markdown += '\n\n';
  }
  
  // Add non-Zigbee drivers section
  markdown += '## Non-Zigbee Drivers\n\n';
  const nonZigbeeValid = nonZigbeeDrivers.filter(r => r.valid);
  const nonZigbeeWithIssues = nonZigbeeDrivers.filter(r => !r.valid);
  
  if (nonZigbeeWithIssues.length > 0) {
    markdown += '### ⚠️ Non-Zigbee Drivers with Issues\n\n';
    nonZigbeeWithIssues.forEach(driver => {
      markdown += `#### ${driver.name}\n`;
      markdown += `**Path:** ${path.relative(process.cwd(), driver.path)}\n\n`;
      markdown += '**Issues:**\n';
      markdown += driver.issues.map(issue => `- ${issue}`).join('\n');
      markdown += '\n\n';
    });
  }
  
  if (nonZigbeeValid.length > 0) {
    markdown += '### ✅ Valid Non-Zigbee Drivers\n\n';
    markdown += nonZigbeeValid.map(d => `- ${d.name}`).join('\n');
    markdown += '\n\n';
  }
  
  // Add recommendations
  markdown += `## Recommendations

1. **Fix critical issues** in invalid drivers first
2. **Convert non-Zigbee drivers** to use the Zigbee protocol where possible
3. **Standardize device classes** to extend from BaseZigbeeDevice
4. **Add missing Zigbee clusters** to support all required functionality
5. **Update documentation** to reflect any changes

---
*Report generated automatically by the driver validation script*`;
  
  return markdown;
}

/**
 * Main function
 */
function main() {
  console.log('🚀 Starting driver validation...');
  
  // Check if drivers directory exists
  if (!fs.existsSync(CONFIG.driversDir)) {
    console.error(`❌ Drivers directory not found: ${CONFIG.driversDir}`);
    process.exit(1);
  }
  
  // Get all driver directories
  const driverDirs = fs.readdirSync(CONFIG.driversDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && dirent.name !== '_templates')
    .map(dirent => ({
      name: dirent.name,
      path: path.join(CONFIG.driversDir, dirent.name)
    }));
  
  console.log(`🔍 Analyzing ${driverDirs.length} drivers...`);
  
  // Validate each driver
  const validationResults = [];
  for (const { name, path: driverPath } of driverDirs) {
    process.stdout.write(`\r🔍 Validating ${name}...`);
    validationResults.push(validateDriver(driverPath, name));
  }
  
  console.log('\n✅ Analysis complete. Generating report...');
  
  // Generate and save the report
  const reportContent = generateReport(validationResults);
  fs.writeFileSync(CONFIG.reportFile, reportContent, 'utf8');
  
  // Print summary
  const validCount = validationResults.filter(r => r.valid).length;
  const warningCount = validationResults.filter(r => !r.valid && r.issues.length < 3).length;
  const invalidCount = validationResults.filter(r => !r.valid && r.issues.length >= 3).length;
  const zigbeeCount = validationResults.filter(r => r.isZigbee).length;
  
  console.log('\n📊 Validation Summary:');
  console.log(`✅ ${validCount} valid drivers`);
  console.log(`⚠️  ${warningCount} drivers with warnings`);
  console.log(`❌ ${invalidCount} invalid drivers`);
  console.log(`🌐 ${zigbeeCount} Zigbee drivers`);
  console.log(`\n📄 Full report saved to: ${CONFIG.reportFile}`);
  
  // Exit with error code if there are critical issues
  if (invalidCount > 0) {
    process.exit(1);
  }
}

// Run the validation
main();
