const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ProjectValidator {
  constructor() {
    this.rootDir = path.join(__dirname, '..');
    this.requiredDirs = [
      'drivers',
      'drivers/_templates',
      'resources',
      'matrices',
      'scripts',
      'test'
    ];
    
    this.requiredFiles = [
      'app.js',
      'app.json',
      'package.json',
      'README.md',
      'CHANGELOG.md',
      'scripts/validate-project-structure.js'
    ];
    
    this.requiredDriverFiles = [
      'driver.compose.json',
      'device.js',
      'assets/icon.svg',
      'assets/images/icon.png'
    ];
    
    this.issues = [];
  }
  
  /**
   * Check if a file or directory exists
   */
  pathExists(path) {
    try {
      fs.accessSync(path);
      return true;
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Add an issue to the issues list
   */
  addIssue(type, message, path, severity = 'warning') {
    this.issues.push({
      type,
      message,
      path: path ? path.replace(this.rootDir + path.sep, '') : '',
      severity
    });
  }
  
  /**
   * Validate the project structure
   */
  validateProjectStructure() {
    console.log('🔍 Validating project structure...');
    
    // Check required directories
    this.requiredDirs.forEach(dir => {
      const dirPath = path.join(this.rootDir, dir);
      if (!this.pathExists(dirPath)) {
        this.addIssue('missing_directory', `Missing required directory: ${dir}`, dirPath, 'error');
      } else if (!fs.statSync(dirPath).isDirectory()) {
        this.addIssue('invalid_directory', `Path exists but is not a directory: ${dir}`, dirPath, 'error');
      }
    });
    
    // Check required files
    this.requiredFiles.forEach(file => {
      const filePath = path.join(this.rootDir, file);
      if (!this.pathExists(filePath)) {
        this.addIssue('missing_file', `Missing required file: ${file}`, filePath, 'error');
      } else if (!fs.statSync(filePath).isFile()) {
        this.addIssue('invalid_file', `Path exists but is not a file: ${file}`, filePath, 'error');
      }
    });
    
    // Check driver structure
    this.validateDrivers();
    
    // Check package.json scripts
    this.validatePackageJson();
    
    return this.issues;
  }
  
  /**
   * Validate driver structure
   */
  validateDrivers() {
    const driversDir = path.join(this.rootDir, 'drivers');
    
    if (!this.pathExists(driversDir)) {
      this.addIssue('missing_directory', 'Missing drivers directory', driversDir, 'error');
      return;
    }
    
    // Get all driver directories
    const driverDirs = fs.readdirSync(driversDir)
      .filter(file => {
        const filePath = path.join(driversDir, file);
        return fs.statSync(filePath).isDirectory() && !file.startsWith('_');
      });
    
    if (driverDirs.length === 0) {
      this.addIssue('no_drivers', 'No driver directories found in drivers folder', driversDir, 'warning');
      return;
    }
    
    // Check each driver
    driverDirs.forEach(driver => {
      const driverPath = path.join(driversDir, driver);
      
      // Check for required files
      this.requiredDriverFiles.forEach(requiredFile => {
        const filePath = path.join(driverPath, requiredFile);
        if (!this.pathExists(filePath)) {
          this.addIssue(
            'missing_driver_file', 
            `Missing driver file: ${requiredFile}`, 
            filePath,
            requiredFile.startsWith('assets/') ? 'warning' : 'error'
          );
        }
      });
      
      // Check driver.compose.json
      const composePath = path.join(driverPath, 'driver.compose.json');
      if (this.pathExists(composePath)) {
        try {
          const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
          
          // Check required fields
          const requiredFields = ['id', 'class', 'name', 'capabilities'];
          requiredFields.forEach(field => {
            if (!compose[field]) {
              this.addIssue(
                'missing_field', 
                `Missing required field in driver.compose.json: ${field}`, 
                composePath
              );
            }
          });
          
          // Check if it's a Zigbee driver
          if (!compose.zigbee) {
            this.addIssue(
              'missing_zigbee_config',
              'Driver is missing Zigbee configuration',
              composePath,
              'error'
            );
          } else {
            // Check required Zigbee fields
            if (!compose.zigbee.manufacturer) {
              this.addIssue(
                'missing_field',
                'Zigbee driver is missing manufacturer',
                composePath
              );
            }
            
            if (!compose.zigbee.model) {
              this.addIssue(
                'missing_field',
                'Zigbee driver is missing model',
                composePath
              );
            }
          }
          
        } catch (e) {
          this.addIssue('invalid_json', `Invalid JSON in ${composePath}: ${e.message}`, composePath, 'error');
        }
      }
    });
  }
  
  /**
   * Validate package.json scripts and dependencies
   */
  validatePackageJson() {
    const packageJsonPath = path.join(this.rootDir, 'package.json');
    
    if (!this.pathExists(packageJsonPath)) {
      this.addIssue('missing_file', 'package.json not found', packageJsonPath, 'error');
      return;
    }
    
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Check required scripts
      const requiredScripts = [
        'start', 'build', 'test', 'lint', 'validate', 'fix'
      ];
      
      requiredScripts.forEach(script => {
        if (!pkg.scripts || !pkg.scripts[script]) {
          this.addIssue(
            'missing_script',
            `Missing required script: ${script}`,
            packageJsonPath
          );
        }
      });
      
      // Check required dependencies
      const requiredDeps = [
        'homey-zigbeedriver',
        'zigbee-clusters',
        'axios',
        'jsdom',
        'natural'
      ];
      
      requiredDeps.forEach(dep => {
        if (!pkg.dependencies?.[dep] && !pkg.devDependencies?.[dep]) {
          this.addIssue(
            'missing_dependency',
            `Missing required dependency: ${dep}`,
            packageJsonPath,
            'warning'
          );
        }
      });
      
    } catch (e) {
      this.addIssue('invalid_json', `Invalid package.json: ${e.message}`, packageJsonPath, 'error');
    }
  }
  
  /**
   * Generate a report of all issues
   */
  generateReport() {
    const errors = this.issues.filter(i => i.severity === 'error');
    const warnings = this.issues.filter(i => i.severity === 'warning');
    
    console.log('\n📋 Validation Report');
    console.log('='.repeat(50));
    
    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach(issue => {
        console.log(`\n[${issue.type.toUpperCase()}] ${issue.message}`);
        if (issue.path) console.log(`   at ${issue.path}`);
      });
    }
    
    if (warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      warnings.forEach(issue => {
        console.log(`\n[${issue.type.toUpperCase()}] ${issue.message}`);
        if (issue.path) console.log(`   at ${issue.path}`);
      });
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`\nFound ${errors.length} errors and ${warnings.length} warnings.`);
    
    return {
      errors,
      warnings,
      hasErrors: errors.length > 0,
      hasWarnings: warnings.length > 0
    };
  }
}

// Run the validator if this file is executed directly
if (require.main === module) {
  const validator = new ProjectValidator();
  validator.validateProjectStructure();
  const report = validator.generateReport();
  
  // Exit with error code if there are any errors
  if (report.hasErrors) {
    process.exit(1);
  }
}

module.exports = ProjectValidator;
