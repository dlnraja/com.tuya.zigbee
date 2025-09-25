#!/usr/bin/env node

/**
 * SCAN GIT HISTORY FOR MISSING DRIVERS
 * Analyzes old commits to identify missing drivers and enrichments
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class GitDriverScanner {
  constructor() {
    this.projectRoot = process.cwd();
    this.currentDrivers = new Set();
    this.oldDrivers = new Set();
    this.missingDrivers = [];
    this.missingEnrichments = [];
  }

  log(message, type = 'info') {
    const prefix = { 'info': '🔍', 'success': '✅', 'error': '❌', 'warning': '⚠️' }[type] || 'ℹ️';
    console.log(`${prefix} ${message}`);
  }

  scanCurrentDrivers() {
    this.log('Scanning current drivers...', 'info');
    
    const driversPath = path.join(this.projectRoot, 'drivers');
    if (fs.existsSync(driversPath)) {
      const drivers = fs.readdirSync(driversPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      drivers.forEach(driver => this.currentDrivers.add(driver));
      this.log(`Found ${drivers.length} current drivers`, 'success');
    }
  }

  scanGitHistory() {
    this.log('Scanning git history for old drivers...', 'info');
    
    try {
      // Get list of all driver.compose.json files from git history
      const result = execSync('git log --name-only --pretty=format:"" | findstr "driver.compose.json"', 
        { encoding: 'utf8', cwd: this.projectRoot });
      
      const oldDriverFiles = result.split('\n')
        .filter(line => line.trim() && line.includes('driver.compose.json'))
        .map(line => line.trim());

      // Extract driver names from paths
      oldDriverFiles.forEach(filePath => {
        const parts = filePath.split('/');
        if (parts.includes('drivers')) {
          const driverIndex = parts.indexOf('drivers');
          if (driverIndex + 1 < parts.length) {
            const driverName = parts[driverIndex + 1];
            this.oldDrivers.add(driverName);
          }
        }
        
        // Also check project-data paths
        if (filePath.includes('project-data/src/drivers/')) {
          const match = filePath.match(/project-data\/src\/drivers\/([^\/]+)/);
          if (match) {
            this.oldDrivers.add(match[1]);
          }
        }
      });

      this.log(`Found ${this.oldDrivers.size} unique drivers in git history`, 'success');
    } catch (error) {
      this.log(`Error scanning git history: ${error.message}`, 'error');
    }
  }

  identifyMissingDrivers() {
    this.log('Identifying missing drivers...', 'info');
    
    this.oldDrivers.forEach(oldDriver => {
      if (!this.currentDrivers.has(oldDriver) && 
          !oldDriver.startsWith('_') && 
          !oldDriver.includes('template') &&
          !oldDriver.includes('test') &&
          !oldDriver.includes('common') &&
          !oldDriver.includes('base')) {
        this.missingDrivers.push(oldDriver);
      }
    });

    if (this.missingDrivers.length > 0) {
      this.log(`Found ${this.missingDrivers.length} missing drivers:`, 'warning');
      this.missingDrivers.forEach(driver => {
        this.log(`  - ${driver}`, 'warning');
      });
    } else {
      this.log('No missing drivers found', 'success');
    }
  }

  async analyzeOldDriverFiles() {
    this.log('Analyzing old driver files for enrichments...', 'info');
    
    const interestingDrivers = [
      'TS0601_climate', 'TS0601_cover', 'TS0601_irrigation', 'TS0601_lock', 'TS0601_siren',
      'aqara_motion_sensor', 'bosch_thermostat_valve', 'ikea_tradfri_bulb',
      'tuya_generic_light', 'tuya_generic_plug', 'tuya_generic_sensor', 'tuya_generic_switch'
    ];

    for (const driver of interestingDrivers) {
      try {
        const oldFilePath = path.join(this.projectRoot, 'project-data/src/drivers', driver, 'driver.compose.json');
        if (fs.existsSync(oldFilePath)) {
          const oldContent = JSON.parse(fs.readFileSync(oldFilePath, 'utf8'));
          
          // Map to current unbranded name
          const mappedName = this.mapToUnbrandedName(driver);
          if (mappedName && this.currentDrivers.has(mappedName)) {
            const currentFilePath = path.join(this.projectRoot, 'drivers', mappedName, 'driver.compose.json');
            if (fs.existsSync(currentFilePath)) {
              const currentContent = JSON.parse(fs.readFileSync(currentFilePath, 'utf8'));
              
              // Check for missing enrichments
              if (this.hasMissingEnrichments(oldContent, currentContent)) {
                this.missingEnrichments.push({
                  driver: mappedName,
                  oldData: oldContent,
                  suggestions: this.extractEnrichments(oldContent)
                });
              }
            }
          }
        }
      } catch (error) {
        this.log(`Error analyzing ${driver}: ${error.message}`, 'error');
      }
    }

    if (this.missingEnrichments.length > 0) {
      this.log(`Found ${this.missingEnrichments.length} drivers needing enrichment`, 'warning');
    }
  }

  mapToUnbrandedName(oldName) {
    const mapping = {
      'TS0601_climate': 'thermostat',
      'TS0601_cover': 'curtain_motor',
      'TS0601_irrigation': 'water_leak_sensor',
      'TS0601_lock': 'smart_lock',
      'TS0601_siren': 'emergency_button',
      'aqara_motion_sensor': 'motion_sensor',
      'bosch_thermostat_valve': 'radiator_valve',
      'ikea_tradfri_bulb': 'smart_bulb',
      'tuya_generic_light': 'smart_bulb',
      'tuya_generic_plug': 'smart_plug',
      'tuya_generic_sensor': 'multisensor',
      'tuya_generic_switch': 'wall_switch_1gang'
    };
    
    return mapping[oldName] || null;
  }

  hasMissingEnrichments(oldData, currentData) {
    // Check for missing manufacturer IDs
    if (oldData.zigbee?.manufacturerName && currentData.zigbee?.manufacturerName) {
      const oldIds = new Set(oldData.zigbee.manufacturerName);
      const currentIds = new Set(currentData.zigbee.manufacturerName);
      
      for (const oldId of oldIds) {
        if (!currentIds.has(oldId)) {
          return true;
        }
      }
    }

    // Check for missing product IDs
    if (oldData.zigbee?.productId && currentData.zigbee?.productId) {
      const oldProducts = new Set(oldData.zigbee.productId);
      const currentProducts = new Set(currentData.zigbee.productId);
      
      for (const oldProduct of oldProducts) {
        if (!currentProducts.has(oldProduct)) {
          return true;
        }
      }
    }

    // Check for missing capabilities
    if (oldData.capabilities && currentData.capabilities) {
      const oldCaps = new Set(oldData.capabilities);
      const currentCaps = new Set(currentData.capabilities);
      
      for (const oldCap of oldCaps) {
        if (!currentCaps.has(oldCap) && !oldCap.startsWith('measure_')) {
          return true;
        }
      }
    }

    return false;
  }

  extractEnrichments(oldData) {
    const suggestions = [];
    
    if (oldData.zigbee?.manufacturerName) {
      suggestions.push({
        type: 'manufacturerName',
        values: oldData.zigbee.manufacturerName
      });
    }
    
    if (oldData.zigbee?.productId) {
      suggestions.push({
        type: 'productId',
        values: oldData.zigbee.productId
      });
    }
    
    if (oldData.capabilities) {
      suggestions.push({
        type: 'capabilities',
        values: oldData.capabilities
      });
    }
    
    return suggestions;
  }

  generateReport() {
    this.log('Generating scan report...', 'info');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        currentDrivers: this.currentDrivers.size,
        oldDrivers: this.oldDrivers.size,
        missingDrivers: this.missingDrivers.length,
        missingEnrichments: this.missingEnrichments.length
      },
      missingDrivers: this.missingDrivers,
      missingEnrichments: this.missingEnrichments
    };

    const reportPath = path.join(this.projectRoot, 'reports/git-driver-scan-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`Report saved to: ${reportPath}`, 'success');
    return report;
  }

  async run() {
    this.log('🔍 SCANNING GIT HISTORY FOR MISSING DRIVERS', 'info');
    
    this.scanCurrentDrivers();
    this.scanGitHistory();
    this.identifyMissingDrivers();
    await this.analyzeOldDriverFiles();
    
    const report = this.generateReport();
    
    this.log('\n📊 SCAN COMPLETE', 'success');
    this.log(`Current drivers: ${report.summary.currentDrivers}`, 'info');
    this.log(`Historical drivers: ${report.summary.oldDrivers}`, 'info');
    this.log(`Missing drivers: ${report.summary.missingDrivers}`, 'info');
    this.log(`Drivers needing enrichment: ${report.summary.missingEnrichments}`, 'info');
    
    return report;
  }
}

// Execute if run directly
if (require.main === module) {
  const scanner = new GitDriverScanner();
  scanner.run().catch(console.error);
}

module.exports = GitDriverScanner;
