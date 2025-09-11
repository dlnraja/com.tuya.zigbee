const fs = require('fs');
const path = require('path');

class ProjectAnalyzer {
  constructor() {
    this.drivers = [];
    this.issues = [];
    this.references = new Map();
    this.duplicateIds = new Set();
    this.missingFiles = [];
    this.invalidStructures = [];
  }

  analyzeProject() {
    console.log('🔍 Analyzing Tuya Homey Project Structure...\n');
    
    // 1. Analyze driver structure
    this.analyzeDrivers();
    
    // 2. Check file references
    this.checkFileReferences();
    
    // 3. Validate SDK3 compliance
    this.validateSDK3Compliance();
    
    // 4. Check for duplicates and conflicts
    this.checkDuplicatesAndConflicts();
    
    // 5. Generate report
    this.generateReport();
  }

  analyzeDrivers() {
    console.log('📁 Analyzing drivers directory structure...');
    
    const driversPath = './drivers';
    if (!fs.existsSync(driversPath)) {
      this.issues.push('CRITICAL: drivers directory missing');
      return;
    }

    this.scanDriversRecursively(driversPath);
    
    console.log(`Found ${this.drivers.length} drivers`);
  }

  scanDriversRecursively(dir, depth = 0) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        // Check if this is a driver directory (contains driver.compose.json)
        const composeFile = path.join(fullPath, 'driver.compose.json');
        if (fs.existsSync(composeFile)) {
          this.analyzeDriver(fullPath, composeFile);
        } else {
          // Recurse into subdirectories
          this.scanDriversRecursively(fullPath, depth + 1);
        }
      }
    }
  }

  analyzeDriver(driverPath, composeFile) {
    try {
      const content = fs.readFileSync(composeFile, 'utf8');
      const config = JSON.parse(content);
      
      const driver = {
        path: driverPath,
        id: config.id,
        name: config.name,
        class: config.class,
        capabilities: config.capabilities || [],
        hasImages: this.checkDriverImages(driverPath, config),
        hasDevice: fs.existsSync(path.join(driverPath, 'device.js')),
        hasDriver: fs.existsSync(path.join(driverPath, 'driver.js')),
        config: config,
        issues: []
      };

      // Validate driver structure
      this.validateDriverStructure(driver);
      
      this.drivers.push(driver);
      
      // Track duplicate IDs
      if (config.id) {
        if (this.references.has(config.id)) {
          this.duplicateIds.add(config.id);
        } else {
          this.references.set(config.id, driverPath);
        }
      }
      
    } catch (error) {
      this.issues.push(`Invalid JSON in ${composeFile}: ${error.message}`);
    }
  }

  checkDriverImages(driverPath, config) {
    const issues = [];
    
    if (!config.images) {
      issues.push('Missing images property');
      return { valid: false, issues };
    }

    const { small, large } = config.images;
    
    if (!small || !large) {
      issues.push('Missing small or large image reference');
      return { valid: false, issues };
    }

    // Resolve image paths
    const smallPath = this.resolveImagePath(driverPath, small);
    const largePath = this.resolveImagePath(driverPath, large);

    if (!fs.existsSync(smallPath)) {
      issues.push(`Small image not found: ${smallPath}`);
    }
    
    if (!fs.existsSync(largePath)) {
      issues.push(`Large image not found: ${largePath}`);
    }

    return { 
      valid: issues.length === 0, 
      issues, 
      smallPath, 
      largePath 
    };
  }

  resolveImagePath(driverPath, imagePath) {
    if (imagePath.includes('{{driverAssetsPath}}')) {
      return path.join(driverPath, 'assets', imagePath.replace('{{driverAssetsPath}}/', ''));
    } else if (imagePath.startsWith('./')) {
      return path.join(driverPath, imagePath.substring(2));
    } else if (imagePath.startsWith('/drivers/')) {
      return path.join('.', imagePath);
    } else {
      return path.join(driverPath, imagePath);
    }
  }

  validateDriverStructure(driver) {
    // Check required files
    if (!driver.hasDevice) {
      driver.issues.push('Missing device.js');
    }
    
    // Check class validity
    const validClasses = ['light', 'socket', 'switch', 'sensor', 'thermostat', 'lock', 'doorbell', 'other'];
    if (!validClasses.includes(driver.class)) {
      driver.issues.push(`Invalid class: ${driver.class}`);
    }

    // Check capabilities
    if (driver.capabilities.includes('measure_battery') && !driver.config.energy?.batteries) {
      driver.issues.push('measure_battery capability requires energy.batteries configuration');
    }

    // Check zigbee configuration
    if (driver.config.zigbee) {
      this.validateZigbeeConfig(driver);
    }
  }

  validateZigbeeConfig(driver) {
    const zigbee = driver.config.zigbee;
    
    if (!zigbee.manufacturerName || !Array.isArray(zigbee.manufacturerName)) {
      driver.issues.push('Invalid zigbee.manufacturerName');
    }
    
    if (!zigbee.productId || !Array.isArray(zigbee.productId)) {
      driver.issues.push('Invalid zigbee.productId');
    }

    if (zigbee.endpoints) {
      for (const [endpoint, config] of Object.entries(zigbee.endpoints)) {
        if (config.clusters) {
          // Validate cluster IDs are numeric
          for (const cluster of config.clusters) {
            if (typeof cluster !== 'number') {
              driver.issues.push(`Non-numeric cluster ID in endpoint ${endpoint}: ${cluster}`);
            }
          }
        }
        
        if (config.bindings) {
          // Validate binding IDs are numeric
          for (const binding of config.bindings) {
            if (typeof binding !== 'number') {
              driver.issues.push(`Non-numeric binding ID in endpoint ${endpoint}: ${binding}`);
            }
          }
        }
      }
    }
  }

  checkFileReferences() {
    console.log('\n🔗 Checking file references and dependencies...');
    
    // Check app.json driver references
    this.validateAppJsonReferences();
    
    // Check cross-file imports
    this.checkImportReferences();
  }

  validateAppJsonReferences() {
    const appJsonPath = './app.json';
    if (!fs.existsSync(appJsonPath)) {
      this.issues.push('app.json not found');
      return;
    }

    try {
      const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
      
      if (appJson.drivers) {
        for (const driver of appJson.drivers) {
          if (driver.images) {
            // Check if referenced image paths exist
            const { small, large } = driver.images;
            
            if (small && !fs.existsSync(`.${small}`)) {
              this.missingFiles.push(small);
            }
            
            if (large && !fs.existsSync(`.${large}`)) {
              this.missingFiles.push(large);
            }
          }
        }
      }
      
    } catch (error) {
      this.issues.push(`Invalid app.json: ${error.message}`);
    }
  }

  checkImportReferences() {
    // Scan for require() statements and imports
    const jsFiles = this.findJSFiles('./');
    
    for (const jsFile of jsFiles) {
      try {
        const content = fs.readFileSync(jsFile, 'utf8');
        
        // Find require statements
        const requireRegex = /require\(['"`]([^'"`]+)['"`]\)/g;
        let match;
        
        while ((match = requireRegex.exec(content)) !== null) {
          const requiredPath = match[1];
          
          if (requiredPath.startsWith('./') || requiredPath.startsWith('../')) {
            const resolvedPath = path.resolve(path.dirname(jsFile), requiredPath);
            
            if (!fs.existsSync(resolvedPath) && !fs.existsSync(resolvedPath + '.js')) {
              this.missingFiles.push(`${jsFile} -> ${requiredPath}`);
            }
          }
        }
        
      } catch (error) {
        // Skip files that can't be read
      }
    }
  }

  findJSFiles(dir) {
    const jsFiles = [];
    
    const scan = (directory) => {
      const items = fs.readdirSync(directory, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(directory, item.name);
        
        if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
          scan(fullPath);
        } else if (item.name.endsWith('.js')) {
          jsFiles.push(fullPath);
        }
      }
    };
    
    scan(dir);
    return jsFiles;
  }

  validateSDK3Compliance() {
    console.log('\n⚙️ Validating SDK3 compliance...');
    
    for (const driver of this.drivers) {
      // Check for deprecated properties
      if (driver.config.mobile) {
        driver.issues.push('Deprecated mobile property (use pair instead)');
      }
      
      // Check capability format
      for (const capability of driver.capabilities) {
        if (typeof capability !== 'string') {
          driver.issues.push(`Invalid capability format: ${capability}`);
        }
      }
      
      // Check settings structure
      if (driver.config.settings) {
        this.validateSettings(driver);
      }
    }
  }

  validateSettings(driver) {
    if (!Array.isArray(driver.config.settings)) {
      driver.issues.push('Settings must be an array');
      return;
    }
    
    for (const setting of driver.config.settings) {
      if (!setting.id || !setting.type) {
        driver.issues.push(`Invalid setting structure: missing id or type`);
      }
      
      if (!setting.label) {
        driver.issues.push(`Setting ${setting.id} missing label`);
      }
    }
  }

  checkDuplicatesAndConflicts() {
    console.log('\n🔍 Checking for duplicates and conflicts...');
    
    // Report duplicate IDs
    for (const duplicateId of this.duplicateIds) {
      this.issues.push(`Duplicate driver ID: ${duplicateId}`);
    }
    
    // Check for conflicting productIds
    const productIds = new Map();
    
    for (const driver of this.drivers) {
      if (driver.config.zigbee?.productId) {
        for (const productId of driver.config.zigbee.productId) {
          if (productIds.has(productId)) {
            this.issues.push(`Conflicting productId "${productId}" between ${driver.id} and ${productIds.get(productId)}`);
          } else {
            productIds.set(productId, driver.id);
          }
        }
      }
    }
  }

  generateReport() {
    console.log('\n📊 PROJECT ANALYSIS REPORT');
    console.log('=' .repeat(50));
    
    console.log(`\n📁 DRIVERS SUMMARY:`);
    console.log(`Total drivers found: ${this.drivers.length}`);
    
    const driversByClass = {};
    for (const driver of this.drivers) {
      driversByClass[driver.class] = (driversByClass[driver.class] || 0) + 1;
    }
    
    console.log(`Drivers by class:`);
    for (const [driverClass, count] of Object.entries(driversByClass)) {
      console.log(`  ${driverClass}: ${count}`);
    }
    
    console.log(`\n❌ ISSUES FOUND:`);
    if (this.issues.length === 0) {
      console.log('No global issues found.');
    } else {
      for (const issue of this.issues) {
        console.log(`  - ${issue}`);
      }
    }
    
    console.log(`\n🚨 DRIVER-SPECIFIC ISSUES:`);
    let totalDriverIssues = 0;
    for (const driver of this.drivers) {
      if (driver.issues.length > 0) {
        console.log(`\n${driver.id} (${driver.path}):`);
        for (const issue of driver.issues) {
          console.log(`  - ${issue}`);
          totalDriverIssues++;
        }
        
        if (driver.hasImages && !driver.hasImages.valid) {
          for (const issue of driver.hasImages.issues) {
            console.log(`  - Image: ${issue}`);
            totalDriverIssues++;
          }
        }
      }
    }
    
    if (totalDriverIssues === 0) {
      console.log('No driver-specific issues found.');
    }
    
    console.log(`\n📂 MISSING FILES:`);
    if (this.missingFiles.length === 0) {
      console.log('No missing files detected.');
    } else {
      for (const missing of this.missingFiles) {
        console.log(`  - ${missing}`);
      }
    }
    
    console.log(`\n🔄 DUPLICATE IDs:`);
    if (this.duplicateIds.size === 0) {
      console.log('No duplicate driver IDs found.');
    } else {
      for (const duplicate of this.duplicateIds) {
        console.log(`  - ${duplicate}`);
      }
    }
    
    // Write detailed report to file
    this.writeDetailedReport();
    
    console.log(`\n✅ Analysis complete. Total issues: ${this.issues.length + totalDriverIssues + this.missingFiles.length}`);
  }

  writeDetailedReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalDrivers: this.drivers.length,
        globalIssues: this.issues.length,
        missingFiles: this.missingFiles.length,
        duplicateIds: this.duplicateIds.size
      },
      drivers: this.drivers,
      issues: this.issues,
      missingFiles: this.missingFiles,
      duplicateIds: Array.from(this.duplicateIds)
    };
    
    fs.writeFileSync('./project_analysis_report.json', JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report written to: project_analysis_report.json`);
  }
}

// Run analysis
const analyzer = new ProjectAnalyzer();
analyzer.analyzeProject();
