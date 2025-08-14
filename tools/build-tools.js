/**
 * 🔧 Build Tools - Universal Tuya Zigbee
 * Project structure validation and build utilities
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class BuildTools {
  constructor() {
    this.projectRoot = process.cwd();
    this.errors = [];
    this.warnings = [];
    this.stats = {
      totalDrivers: 0,
      validDrivers: 0,
      invalidDrivers: 0,
      missingAssets: 0,
      missingMetadata: 0
    };
  }

  /**
   * Validate project structure
   */
  validateProjectStructure() {
    console.log('🔍 Validating project structure...');
    
    const requiredDirs = [
      'drivers',
      'drivers/tuya_zigbee',
      'drivers/zigbee',
      'drivers/_common',
      'lib',
      'lib/tuya',
      'lib/zcl',
      '.github/workflows',
      'docs',
      'scripts',
      'tools'
    ];
    
    for (const dir of requiredDirs) {
      if (!fs.existsSync(dir)) {
        this.errors.push(`Missing required directory: ${dir}`);
      }
    }
    
    const requiredFiles = [
      'app.json',
      'app.js',
      'package.json',
      'README.md',
      'CHANGELOG.md'
    ];
    
    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        this.errors.push(`Missing required file: ${file}`);
      }
    }
    
    return this.errors.length === 0;
  }

  /**
   * Validate driver structure
   */
  validateDriverStructure() {
    console.log('🔍 Validating driver structure...');
    
    const tuyaDriversPath = path.join(this.projectRoot, 'drivers/tuya_zigbee/models');
    const zigbeeDriversPath = path.join(this.projectRoot, 'drivers/zigbee/models');
    
    if (fs.existsSync(tuyaDriversPath)) {
      this.validateDriversInPath(tuyaDriversPath, 'tuya_zigbee');
    }
    
    if (fs.existsSync(zigbeeDriversPath)) {
      this.validateDriversInPath(zigbeeDriversPath, 'zigbee');
    }
    
    return this.errors.length === 0;
  }

  /**
   * Validate drivers in a specific path
   */
  validateDriversInPath(driversPath, type) {
    const drivers = fs.readdirSync(driversPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    this.stats.totalDrivers += drivers.length;
    
    for (const driver of drivers) {
      const driverPath = path.join(driversPath, driver);
      this.validateSingleDriver(driverPath, driver, type);
    }
  }

  /**
   * Validate a single driver
   */
  validateSingleDriver(driverPath, driverName, type) {
    const requiredFiles = [
      'driver.compose.json',
      'driver.js',
      'device.js',
      'metadata.json'
    ];
    
    const requiredDirs = [
      'assets',
      'assets/images'
    ];
    
    let driverValid = true;
    
    // Check required files
    for (const file of requiredFiles) {
      const filePath = path.join(driverPath, file);
      if (!fs.existsSync(filePath)) {
        this.errors.push(`[${type}] ${driverName}: Missing ${file}`);
        driverValid = false;
        this.stats.missingMetadata++;
      }
    }
    
    // Check required directories
    for (const dir of requiredDirs) {
      const dirPath = path.join(driverPath, dir);
      if (!fs.existsSync(dirPath)) {
        this.errors.push(`[${type}] ${driverName}: Missing ${dir}`);
        driverValid = false;
      }
    }
    
    // Check assets
    if (fs.existsSync(path.join(driverPath, 'assets/images'))) {
      const imagesPath = path.join(driverPath, 'assets/images');
      const images = fs.readdirSync(imagesPath);
      
      const requiredImages = ['small.png', 'large.png'];
      for (const img of requiredImages) {
        if (!images.includes(img)) {
          this.warnings.push(`[${type}] ${driverName}: Missing ${img}`);
          this.stats.missingAssets++;
        }
      }
      
      // Check icon.svg
      if (!fs.existsSync(path.join(driverPath, 'assets/icon.svg'))) {
        this.warnings.push(`[${type}] ${driverName}: Missing icon.svg`);
      }
    }
    
    if (driverValid) {
      this.stats.validDrivers++;
    } else {
      this.stats.invalidDrivers++;
    }
  }

  /**
   * Validate JSON schemas
   */
  validateJSONSchemas() {
    console.log('🔍 Validating JSON schemas...');
    
    try {
      // Validate app.json
      const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
      this.validateAppJson(appJson);
      
      // Validate package.json
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      this.validatePackageJson(packageJson);
      
    } catch (error) {
      this.errors.push(`JSON validation error: ${error.message}`);
    }
  }

  /**
   * Validate app.json
   */
  validateAppJson(appJson) {
    const required = ['id', 'version', 'name', 'description', 'category'];
    for (const field of required) {
      if (!appJson[field]) {
        this.errors.push(`app.json: Missing required field: ${field}`);
      }
    }
    
    // Check version format
    if (appJson.version && !/^\d+\.\d+\.\d+$/.test(appJson.version)) {
      this.warnings.push(`app.json: Version format should be X.Y.Z, got: ${appJson.version}`);
    }
  }

  /**
   * Validate package.json
   */
  validatePackageJson(packageJson) {
    const required = ['name', 'version', 'description', 'main'];
    for (const field of required) {
      if (!packageJson[field]) {
        this.errors.push(`package.json: Missing required field: ${field}`);
      }
    }
    
    // Check dependencies
    if (!packageJson.dependencies || Object.keys(packageJson.dependencies).length === 0) {
      this.warnings.push('package.json: No dependencies defined');
    }
  }

  /**
   * Validate image sizes
   */
  validateImageSizes() {
    console.log('🔍 Validating image sizes...');
    
    // This would require image processing libraries
    // For now, just check if files exist
    this.warnings.push('Image size validation requires additional libraries (skipped)');
  }

  /**
   * Generate validation report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      project: path.basename(this.projectRoot),
      validation: {
        structure: this.errors.length === 0,
        drivers: this.stats.validDrivers > 0,
        schemas: this.errors.filter(e => e.includes('JSON')).length === 0
      },
      stats: this.stats,
      errors: this.errors,
      warnings: this.warnings,
      summary: {
        total: this.stats.totalDrivers,
        valid: this.stats.validDrivers,
        invalid: this.stats.invalidDrivers,
        successRate: this.stats.totalDrivers > 0 ? 
          Math.round((this.stats.validDrivers / this.stats.totalDrivers) * 100) : 0
      }
    };
    
    return report;
  }

  /**
   * Run full validation
   */
  async runFullValidation() {
    console.log('🚀 Starting full project validation...\n');
    
    const startTime = Date.now();
    
    try {
      // Run all validations
      this.validateProjectStructure();
      this.validateDriverStructure();
      this.validateJSONSchemas();
      this.validateImageSizes();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Generate report
      const report = this.generateReport();
      
      console.log('\n📊 VALIDATION REPORT');
      console.log('====================');
      console.log(`⏱️  Duration: ${duration}ms`);
      console.log(`📁 Total Drivers: ${report.stats.totalDrivers}`);
      console.log(`✅ Valid Drivers: ${report.stats.validDrivers}`);
      console.log(`❌ Invalid Drivers: ${report.stats.invalidDrivers}`);
      console.log(`📈 Success Rate: ${report.summary.successRate}%`);
      console.log(`⚠️  Warnings: ${report.warnings.length}`);
      console.log(`🚨 Errors: ${report.errors.length}`);
      
      if (report.errors.length > 0) {
        console.log('\n🚨 ERRORS:');
        report.errors.forEach(error => console.log(`  - ${error}`));
      }
      
      if (report.warnings.length > 0) {
        console.log('\n⚠️  WARNINGS:');
        report.warnings.forEach(warning => console.log(`  - ${warning}`));
      }
      
      // Save report
      const reportPath = path.join(this.projectRoot, 'docs/validation-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 Report saved to: ${reportPath}`);
      
      return report.validation.structure && report.validation.drivers;
      
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      return false;
    }
  }
}

// Export for use in scripts
module.exports = BuildTools;

// Run if called directly
if (require.main === module) {
  const buildTools = new BuildTools();
  buildTools.runFullValidation()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
