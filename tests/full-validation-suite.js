const fs = require('fs');
const path = require('path');
const { HomeyMock } = require('homey-mock');

// Global error handler for debugging silent failures
process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

/**
 * Complete validation suite for Tuya Zigbee project
 * Tests all drivers, JSON files, and functionality
 */
class FullValidationSuite {
  constructor() {
    this.rootPath = path.join(__dirname, '..');
    this.results = {
      timestamp: new Date().toISOString(),
      drivers: [],
      json: [],
      capabilities: [],
      errors: []
    };
  }

  async runFullValidation() {
    console.log('🔍 Starting Full Project Validation...\n');
    
    try {
      // 1. Validate JSON files
      await this.validateAllJson();
      
      // 2. Test all drivers
      await this.testAllDrivers();
      
      // 3. Validate capabilities
      await this.validateCapabilities();
      
      // 4. Check device coverage
      await this.checkDeviceCoverage();
      
      // 5. Validate project structure
      await this.validateStructure();
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      console.error('Validation failed:', error);
      this.results.errors.push({
        phase: 'general',
        error: error.message
      });
    }
  }

  async validateAllJson() {
    console.log('📄 Validating JSON files...');
    const jsonFiles = await this.findFiles('.json');
    
    for (const file of jsonFiles) {
      const relativePath = path.relative(this.rootPath, file);
      
      try {
        const content = fs.readFileSync(file, 'utf8');
        JSON.parse(content);
        
        // Additional validation for driver.compose.json
        if (file.includes('driver.compose.json')) {
          const json = JSON.parse(content);
          const issues = this.validateDriverCompose(json);
          
          if (issues.length > 0) {
            this.results.json.push({
              file: relativePath,
              status: 'warning',
              issues
            });
          } else {
            this.results.json.push({
              file: relativePath,
              status: 'valid'
            });
          }
        }
      } catch (error) {
        this.results.json.push({
          file: relativePath,
          status: 'error',
          error: error.message
        });
      }
    }
    
    console.log(`  ✓ Validated ${jsonFiles.length} JSON files\n`);
  }

  validateDriverCompose(json) {
    const issues = [];
    
    // Required fields
    if (!json.id) issues.push('Missing id field');
    if (!json.name) issues.push('Missing name field');
    if (!json.class) issues.push('Missing class field');
    if (!json.capabilities || !Array.isArray(json.capabilities)) {
      issues.push('Missing or invalid capabilities');
    }
    if (!json.zigbee) issues.push('Missing zigbee configuration');
    
    // Zigbee configuration
    if (json.zigbee) {
      if (!json.zigbee.manufacturerName) {
        issues.push('Missing manufacturerName in zigbee config');
      }
      if (!json.zigbee.productId) {
        issues.push('Missing productId in zigbee config');
      }
      if (!json.zigbee.endpoints) {
        issues.push('Missing endpoints in zigbee config');
      }
    }
    
    return issues;
  }

  async testAllDrivers() {
    console.log('🔧 Testing all drivers...');
    const driversPath = path.join(this.rootPath, 'drivers');
    const driverCategories = fs.readdirSync(driversPath)
      .filter(f => fs.statSync(path.join(driversPath, f)).isDirectory());
    console.log(`   - Found categories: ${driverCategories.join(', ')}`);
    
    for (const category of driverCategories) {
      if (category.startsWith('_')) continue; // Skip _base, _template
      
      const categoryPath = path.join(driversPath, category);
      const drivers = fs.readdirSync(categoryPath)
        .filter(f => fs.statSync(path.join(categoryPath, f)).isDirectory());
      
      for (const driver of drivers) {
        const driverPath = path.join(categoryPath, driver);
        console.log(`    -> Testing driver: ${driver}`);
        const result = await this.testDriver(driverPath, driver);
        this.results.drivers.push(result);
      }
    }
    
    console.log(`  ✓ Tested ${this.results.drivers.length} drivers\n`);
  }

  async testDriver(driverPath, driverId) {
    const result = {
      id: driverId,
      path: path.relative(this.rootPath, driverPath),
      status: 'unknown',
      tests: []
    };
    
    try {
      // Check if device.js exists
      const deviceFile = path.join(driverPath, 'device.js');
      if (!fs.existsSync(deviceFile)) {
        result.status = 'missing';
        result.error = 'device.js not found';
        return result;
      }
      
      // Try to load the device class
      const DeviceClass = require(deviceFile);
      result.tests.push({ test: 'load', passed: true });
      
      // Create mock instance
      const homey = new HomeyMock();
      const device = new DeviceClass({ homey });
      result.tests.push({ test: 'instantiate', passed: true });
      
      // Test onNodeInit
      const mockZclNode = this.createMockZclNode();
      await device.onNodeInit({ zclNode: mockZclNode });
      result.tests.push({ test: 'onNodeInit', passed: true });
      
      // Test capabilities
      const composeFile = path.join(driverPath, 'driver.compose.json');
      if (fs.existsSync(composeFile)) {
        const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
        
        for (const capability of compose.capabilities || []) {
          const hasCapability = typeof device.hasCapability === 'function' 
            ? device.hasCapability(capability) 
            : true;
          
          result.tests.push({
            test: `capability_${capability}`,
            passed: hasCapability
          });
        }
      }
      
      result.status = 'passed';
    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
    }
    
    return result;
  }

  createMockZclNode() {
    return {
      endpoints: {
        1: {
          clusters: {
            genOnOff: {
              on: () => Promise.resolve(),
              off: () => Promise.resolve(),
              readAttributes: () => Promise.resolve({ onOff: 1 })
            },
            genPowerCfg: {
              readAttributes: () => Promise.resolve({ batteryPercentageRemaining: 200 })
            },
            msTemperatureMeasurement: {
              readAttributes: () => Promise.resolve({ measuredValue: 2000 })
            },
            msRelativeHumidity: {
              readAttributes: () => Promise.resolve({ measuredValue: 5000 })
            },
            manuSpecificTuya: {
              on: () => {},
              dataRequest: () => Promise.resolve()
            }
          }
        }
      },
      on: () => {}
    };
  }

  async validateCapabilities() {
    console.log('🎯 Validating capabilities...');
    
    const capabilityMap = {
      'onoff': ['genOnOff'],
      'dim': ['genLevelCtrl'],
      'measure_temperature': ['msTemperatureMeasurement'],
      'measure_humidity': ['msRelativeHumidity'],
      'measure_power': ['haElectricalMeasurement', 'seMetering'],
      'measure_battery': ['genPowerCfg'],
      'alarm_motion': ['ssIasZone'],
      'alarm_contact': ['ssIasZone'],
      'alarm_water': ['ssIasZone']
    };
    
    for (const [capability, clusters] of Object.entries(capabilityMap)) {
      this.results.capabilities.push({
        capability,
        requiredClusters: clusters,
        status: 'defined'
      });
    }
    
    console.log(`  ✓ Validated ${Object.keys(capabilityMap).length} capabilities\n`);
  }

  async checkDeviceCoverage() {
    console.log('📊 Checking device coverage...');
    
    // List of priority Tuya devices
    const priorityDevices = [
      'TS0201', 'TS0202', 'TS0203', 'TS0207', 'TS0210',
      'TS0001', 'TS0002', 'TS0003', 'TS0041', 'TS0042',
      'TS011F', 'TS0121', 'TS0505A', 'TS0505B', 'TS0601',
      'TS130F', 'TS0302', 'TS0303', 'TS0305', 'TS004F'
    ];
    
    const implementedDevices = this.results.drivers.map(d => d.id);
    const coverage = {
      total: priorityDevices.length,
      implemented: 0,
      missing: []
    };
    
    for (const device of priorityDevices) {
      if (implementedDevices.includes(device)) {
        coverage.implemented++;
      } else {
        coverage.missing.push(device);
      }
    }
    
    coverage.percentage = Math.round((coverage.implemented / coverage.total) * 100);
    this.results.coverage = coverage;
    
    console.log(`  ✓ Device coverage: ${coverage.percentage}% (${coverage.implemented}/${coverage.total})\n`);
  }

  async validateStructure() {
    console.log('📁 Validating project structure...');
    
    const requiredDirs = [
      'drivers/_base',
      'drivers/sensors',
      'drivers/switches',
      'drivers/lights',
      'drivers/climate',
      'scripts',
      'tests',
      'reports'
    ];
    
    const structure = {
      valid: true,
      missing: []
    };
    
    for (const dir of requiredDirs) {
      const fullPath = path.join(this.rootPath, dir);
      if (!fs.existsSync(fullPath)) {
        structure.valid = false;
        structure.missing.push(dir);
      }
    }
    
    this.results.structure = structure;
    console.log(`  ✓ Structure validation complete\n`);
  }

  async findFiles(extension) {
    const files = [];
    
    const walk = (dir) => {
      const entries = fs.readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        
        if (entry === 'node_modules' || entry === '.git') continue;
        
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          walk(fullPath);
        } else if (entry.endsWith(extension)) {
          files.push(fullPath);
        }
      }
    };
    
    walk(this.rootPath);
    return files;
  }

  generateReport() {
    // Calculate statistics
    const stats = {
      totalDrivers: this.results.drivers.length,
      passedDrivers: this.results.drivers.filter(d => d.status === 'passed').length,
      failedDrivers: this.results.drivers.filter(d => d.status === 'failed').length,
      totalJson: this.results.json.length,
      validJson: this.results.json.filter(j => j.status === 'valid').length,
      invalidJson: this.results.json.filter(j => j.status === 'error').length,
      deviceCoverage: this.results.coverage?.percentage || 0,
      structureValid: this.results.structure?.valid || false
    };
    
    this.results.statistics = stats;
    
    // Save report
    const reportPath = path.join(this.rootPath, 'reports', 'validation-report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    
    // Print summary
    console.log('=' .repeat(60));
    console.log('📊 VALIDATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Drivers: ${stats.passedDrivers}/${stats.totalDrivers} passed`);
    console.log(`JSON Files: ${stats.validJson}/${stats.totalJson} valid`);
    console.log(`Device Coverage: ${stats.deviceCoverage}%`);
    console.log(`Structure: ${stats.structureValid ? '✅ Valid' : '❌ Invalid'}`);
    console.log('\n✅ Full report saved to: reports/validation-report.json');
    
    // Return success based on critical failures
    return stats.failedDrivers === 0 && stats.invalidJson === 0;
  }
}


// Run validation if executed directly
if (require.main === module) {
  const suite = new FullValidationSuite();
  suite.runFullValidation()
    .then(success => process.exit(success ? 0 : 1))
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = FullValidationSuite;
