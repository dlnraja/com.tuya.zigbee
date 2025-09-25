const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// Configuration
const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');
const REPORT_FILE = path.join(__dirname, '..', 'driver-status-report.md');

async function generateDriverReport() {
  try {
    const report = {
      generatedAt: new Date().toISOString(),
      totalDrivers: 0,
      driversByType: {},
      missingFiles: [],
      missingTests: [],
      missingAssets: [],
      drivers: []
    };

    // Get all driver directories
    const driverDirs = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    report.totalDrivers = driverDirs.length;

    // Analyze each driver
    for (const driverId of driverDirs) {
      const driverPath = path.join(DRIVERS_DIR, driverId);
      const driverInfo = {
        id: driverId,
        path: driverPath,
        hasDeviceJs: false,
        hasDriverJs: false,
        hasComposeJson: false,
        hasTests: false,
        hasAssets: false,
        type: 'unknown',
        modelId: null,
        manufacturer: null,
        capabilities: []
      };

      // Check for required files
      const requiredFiles = ['device.js', 'driver.js', 'driver.compose.json'];
      for (const file of requiredFiles) {
        const filePath = path.join(driverPath, file);
        if (fs.existsSync(filePath)) {
          if (file === 'device.js') driverInfo.hasDeviceJs = true;
          if (file === 'driver.js') driverInfo.hasDriverJs = true;
          if (file === 'driver.compose.json') driverInfo.hasComposeJson = true;
        } else {
          report.missingFiles.push(`${driverId}: Missing ${file}`);
        }
      }

      // Check for test file
      const testFile = path.join(__dirname, '..', 'test', 'unit', `${driverId}.test.js`);
      driverInfo.hasTests = fs.existsSync(testFile);
      if (!driverInfo.hasTests) {
        report.missingTests.push(driverId);
      }

      // Check for assets
      const assetsDir = path.join(driverPath, 'assets');
      driverInfo.hasAssets = fs.existsSync(assetsDir) && 
                            fs.statSync(assetsDir).isDirectory() &&
                            fs.readdirSync(assetsDir).length > 0;
      if (!driverInfo.hasAssets) {
        report.missingAssets.push(driverId);
      }

      // Read compose.json for additional info
      const composeFile = path.join(driverPath, 'driver.compose.json');
      if (fs.existsSync(composeFile)) {
        try {
          const composeData = JSON.parse(await readFile(composeFile, 'utf8'));
          driverInfo.type = composeData.class || 'unknown';
          driverInfo.capabilities = Array.isArray(composeData.capabilities) 
            ? composeData.capabilities 
            : [];
          
          if (composeData.zigbee) {
            driverInfo.modelId = Array.isArray(composeData.zigbee.modelId)
              ? composeData.zigbee.modelId[0]
              : composeData.zigbee.modelId;
            driverInfo.manufacturer = composeData.zigbee.manufacturerName || null;
          }

          // Update driver type count
          report.driversByType[driverInfo.type] = (report.driversByType[driverInfo.type] || 0) + 1;
        } catch (e) {
          console.error(`Error processing ${driverId}:`, e.message);
        }
      }

      report.drivers.push(driverInfo);
    }

    // Generate markdown report
    let markdown = `# Tuya Zigbee Driver Status Report\n\n`;
    markdown += `**Generated at:** ${new Date().toLocaleString()}\n\n`;
    
    // Summary
    markdown += '## 📊 Summary\n\n';
    markdown += `- **Total Drivers:** ${report.totalDrivers}\n`;
    markdown += `- **Drivers with Tests:** ${report.totalDrivers - report.missingTests.length} (${Math.round(((report.totalDrivers - report.missingTests.length) / report.totalDrivers) * 100)}%)\n`;
    markdown += `- **Drivers with Assets:** ${report.totalDrivers - report.missingAssets.length} (${Math.round(((report.totalDrivers - report.missingAssets.length) / report.totalDrivers) * 100)}%)\n\n`;
    
    // Drivers by type
    markdown += '## 📦 Drivers by Type\n\n';
    markdown += '| Type | Count |\n';
    markdown += '|------|-------|\n';
    for (const [type, count] of Object.entries(report.driversByType)) {
      markdown += `| ${type} | ${count} |\n`;
    }
    markdown += '\n';
    
    // Missing files
    if (report.missingFiles.length > 0) {
      markdown += '## ❌ Missing Files\n\n';
      markdown += 'The following drivers are missing required files:\n\n';
      for (const file of report.missingFiles) {
        markdown += `- ${file}\n`;
      }
      markdown += '\n';
    }
    
    // Missing tests
    if (report.missingTests.length > 0) {
      markdown += `## ⚠️ Missing Tests (${report.missingTests.length})\n\n`;
      markdown += 'The following drivers are missing test files:\n\n';
      for (const driver of report.missingTests) {
        markdown += `- ${driver}\n`;
      }
      markdown += '\n';
    }
    
    // Missing assets
    if (report.missingAssets.length > 0) {
      markdown += `## 🖼️ Missing Assets (${report.missingAssets.length})\n\n`;
      markdown += 'The following drivers are missing asset files:\n\n';
      for (const driver of report.missingAssets) {
        markdown += `- ${driver}\n`;
      }
      markdown += '\n';
    }
    
    // Driver details
    markdown += '## 📋 Driver Details\n\n';
    markdown += '| Driver ID | Type | Model ID | Manufacturer | Capabilities | Tests | Assets |\n';
    markdown += '|-----------|------|----------|--------------|--------------|-------|--------|\n';
    
    for (const driver of report.drivers.sort((a, b) => a.id.localeCompare(b.id))) {
      markdown += `| ${driver.id} `;
      markdown += `| ${driver.type || '?'} `;
      markdown += `| ${driver.modelId || 'N/A'} `;
      markdown += `| ${driver.manufacturer || 'N/A'} `;
      markdown += `| ${driver.capabilities.join(', ') || 'None'} `;
      markdown += `| ${driver.hasTests ? '✅' : '❌'} `;
      markdown += `| ${driver.hasAssets ? '✅' : '❌'} |\n`;
    }
    
    // Save the report
    await writeFile(REPORT_FILE, markdown);
    console.log(`Report generated at: ${REPORT_FILE}`);
    
    return report;
  } catch (error) {
    console.error('Error generating driver report:', error);
    throw error;
  }
}

// Generate the report
generateDriverReport().catch(console.error);
