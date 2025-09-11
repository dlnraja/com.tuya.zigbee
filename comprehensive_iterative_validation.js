const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ComprehensiveIterativeValidator {
  constructor() {
    this.issues = [];
    this.fixes = [];
    this.validationRounds = [];
    this.maxRounds = 5;
  }

  async runIterativeValidation() {
    console.log('🔍 VALIDATION ITÉRATIVE COMPREHENSIVE...\n');
    
    for (let round = 1; round <= this.maxRounds; round++) {
      console.log(`\n🔄 ROUND ${round}/${this.maxRounds}`);
      console.log('='.repeat(50));
      
      const roundResult = await this.executeValidationRound(round);
      this.validationRounds.push(roundResult);
      
      if (roundResult.issuesFound === 0) {
        console.log('🎉 VALIDATION COMPLÈTE - Aucune erreur trouvée!');
        break;
      }
      
      if (round < this.maxRounds) {
        console.log(`⏳ Pause de 2s avant round ${round + 1}...`);
        await this.sleep(2000);
      }
    }
    
    this.generateFinalValidationReport();
  }

  async executeValidationRound(round) {
    const roundStart = Date.now();
    const roundIssues = [];
    const roundFixes = [];
    
    console.log('📊 Analyse structure projet...');
    const structureIssues = await this.validateProjectStructure();
    roundIssues.push(...structureIssues);
    
    console.log('🔧 Validation fichiers drivers...');
    const driverIssues = await this.validateAllDrivers();
    roundIssues.push(...driverIssues);
    
    console.log('📄 Validation app.json...');
    const appJsonIssues = await this.validateAppJson();
    roundIssues.push(...appJsonIssues);
    
    console.log('📦 Validation package.json...');
    const packageIssues = await this.validatePackageJson();
    roundIssues.push(...packageIssues);
    
    console.log('🖼️ Validation assets...');
    const assetIssues = await this.validateAssets();
    roundIssues.push(...assetIssues);
    
    console.log('🔧 Application corrections automatiques...');
    const fixesApplied = await this.applyAutomaticFixes(roundIssues);
    roundFixes.push(...fixesApplied);
    
    // Tenter validation Homey CLI si disponible
    console.log('🏠 Test validation Homey CLI...');
    const homeyValidation = await this.tryHomeyValidation();
    
    const roundEnd = Date.now();
    const roundResult = {
      round: round,
      duration: roundEnd - roundStart,
      issuesFound: roundIssues.length,
      fixesApplied: roundFixes.length,
      issues: roundIssues,
      fixes: roundFixes,
      homeyValidation: homeyValidation
    };
    
    console.log(`📊 Round ${round} résultats:`);
    console.log(`  Issues trouvés: ${roundIssues.length}`);
    console.log(`  Corrections appliquées: ${roundFixes.length}`);
    console.log(`  Durée: ${roundEnd - roundStart}ms`);
    
    return roundResult;
  }

  async validateProjectStructure() {
    const issues = [];
    
    // Vérifier fichiers essentiels
    const essentialFiles = [
      './app.js',
      './app.json',
      './package.json',
      './README.md'
    ];
    
    for (const file of essentialFiles) {
      if (!fs.existsSync(file)) {
        issues.push(`Missing essential file: ${file}`);
      }
    }
    
    // Vérifier dossiers essentiels
    const essentialDirs = [
      './drivers',
      './assets',
      './locales'
    ];
    
    for (const dir of essentialDirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.fixes.push(`Created missing directory: ${dir}`);
      }
    }
    
    // Vérifier que drivers n'est pas vide
    const driversPath = './drivers';
    if (fs.existsSync(driversPath)) {
      const drivers = fs.readdirSync(driversPath, { withFileTypes: true })
        .filter(item => item.isDirectory());
      
      if (drivers.length === 0) {
        issues.push('No drivers found in ./drivers directory');
      }
    }
    
    return issues;
  }

  async validateAllDrivers() {
    const issues = [];
    const driversPath = './drivers';
    
    if (!fs.existsSync(driversPath)) {
      return ['Drivers directory does not exist'];
    }
    
    const drivers = fs.readdirSync(driversPath, { withFileTypes: true })
      .filter(item => item.isDirectory())
      .map(item => item.name);
    
    for (const driverId of drivers) {
      const driverPath = path.join(driversPath, driverId);
      const driverIssues = await this.validateSingleDriver(driverId, driverPath);
      issues.push(...driverIssues);
    }
    
    return issues;
  }

  async validateSingleDriver(driverId, driverPath) {
    const issues = [];
    
    // Vérifier fichiers essentiels du driver
    const composeFile = path.join(driverPath, 'driver.compose.json');
    const deviceFile = path.join(driverPath, 'device.js');
    const driverFile = path.join(driverPath, 'driver.js');
    
    if (!fs.existsSync(composeFile)) {
      issues.push(`${driverId}: Missing driver.compose.json`);
      return issues;
    }
    
    // Valider JSON du compose file
    try {
      const config = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
      
      // Vérifier propriétés essentielles
      if (!config.id) issues.push(`${driverId}: Missing id in compose file`);
      if (!config.name) issues.push(`${driverId}: Missing name in compose file`);
      if (!config.class) issues.push(`${driverId}: Missing class in compose file`);
      if (!Array.isArray(config.capabilities)) issues.push(`${driverId}: Missing or invalid capabilities array`);
      
      // Vérifier cohérence ID
      if (config.id !== driverId) {
        issues.push(`${driverId}: ID mismatch - folder: ${driverId}, config: ${config.id}`);
      }
      
      // Vérifier classe valide
      const validClasses = ['light', 'sensor', 'socket', 'thermostat', 'lock', 'other'];
      if (!validClasses.includes(config.class)) {
        issues.push(`${driverId}: Invalid class '${config.class}'`);
      }
      
      // Vérifier images
      if (!config.images || !config.images.small || !config.images.large) {
        issues.push(`${driverId}: Missing images configuration`);
      }
      
      // Vérifier zigbee config
      if (!config.zigbee) {
        issues.push(`${driverId}: Missing zigbee configuration`);
      } else {
        if (!config.zigbee.manufacturerName) {
          issues.push(`${driverId}: Missing zigbee.manufacturerName`);
        }
        if (!config.zigbee.productId) {
          issues.push(`${driverId}: Missing zigbee.productId`);
        }
        if (!config.zigbee.endpoints) {
          issues.push(`${driverId}: Missing zigbee.endpoints`);
        }
      }
      
      // Vérifier energy config pour battery devices
      if (config.capabilities?.includes('measure_battery') && !config.energy) {
        issues.push(`${driverId}: Missing energy config for battery device`);
      }
      
    } catch (error) {
      issues.push(`${driverId}: Invalid JSON in driver.compose.json - ${error.message}`);
    }
    
    // Vérifier device.js
    if (!fs.existsSync(deviceFile)) {
      issues.push(`${driverId}: Missing device.js`);
    } else {
      const deviceContent = fs.readFileSync(deviceFile, 'utf8');
      if (!deviceContent.includes('ZigBeeDevice')) {
        issues.push(`${driverId}: device.js missing ZigBeeDevice import or extension`);
      }
    }
    
    // Vérifier driver.js
    if (!fs.existsSync(driverFile)) {
      issues.push(`${driverId}: Missing driver.js`);
    } else {
      const driverContent = fs.readFileSync(driverFile, 'utf8');
      if (!driverContent.includes('ZigBeeDriver')) {
        issues.push(`${driverId}: driver.js missing ZigBeeDriver import or extension`);
      }
    }
    
    // Vérifier assets
    const assetsPath = path.join(driverPath, 'assets', 'images');
    if (!fs.existsSync(assetsPath)) {
      issues.push(`${driverId}: Missing assets/images directory`);
    } else {
      const smallImg = path.join(assetsPath, 'small.png');
      const largeImg = path.join(assetsPath, 'large.png');
      
      if (!fs.existsSync(smallImg)) {
        issues.push(`${driverId}: Missing small.png image`);
      }
      if (!fs.existsSync(largeImg)) {
        issues.push(`${driverId}: Missing large.png image`);
      }
    }
    
    return issues;
  }

  async validateAppJson() {
    const issues = [];
    const appJsonPath = './app.json';
    
    if (!fs.existsSync(appJsonPath)) {
      return ['Missing app.json file'];
    }
    
    try {
      const appConfig = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
      
      // Vérifier propriétés essentielles
      if (!appConfig.id) issues.push('app.json: Missing id');
      if (!appConfig.version) issues.push('app.json: Missing version');
      if (!appConfig.sdk) issues.push('app.json: Missing sdk version');
      if (!appConfig.name) issues.push('app.json: Missing name');
      if (!appConfig.description) issues.push('app.json: Missing description');
      if (!appConfig.category) issues.push('app.json: Missing category');
      if (!Array.isArray(appConfig.permissions)) issues.push('app.json: Missing permissions array');
      
      // Vérifier drivers
      if (!Array.isArray(appConfig.drivers)) {
        issues.push('app.json: Missing drivers array');
      } else {
        const driversPath = './drivers';
        if (fs.existsSync(driversPath)) {
          const actualDrivers = fs.readdirSync(driversPath, { withFileTypes: true })
            .filter(item => item.isDirectory())
            .map(item => item.name);
          
          const configDrivers = appConfig.drivers.map(d => d.id || d);
          
          // Vérifier cohérence
          for (const actualDriver of actualDrivers) {
            if (!configDrivers.includes(actualDriver)) {
              issues.push(`app.json: Missing driver reference for ${actualDriver}`);
            }
          }
          
          for (const configDriver of configDrivers) {
            if (!actualDrivers.includes(configDriver)) {
              issues.push(`app.json: Invalid driver reference ${configDriver}`);
            }
          }
        }
      }
      
      // Vérifier compatibility
      if (!appConfig.compatibility) {
        issues.push('app.json: Missing compatibility');
      }
      
    } catch (error) {
      issues.push(`app.json: Invalid JSON - ${error.message}`);
    }
    
    return issues;
  }

  async validatePackageJson() {
    const issues = [];
    const packageJsonPath = './package.json';
    
    if (!fs.existsSync(packageJsonPath)) {
      return ['Missing package.json file'];
    }
    
    try {
      const packageConfig = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      if (!packageConfig.name) issues.push('package.json: Missing name');
      if (!packageConfig.version) issues.push('package.json: Missing version');
      if (!packageConfig.main) issues.push('package.json: Missing main');
      if (!packageConfig.dependencies) issues.push('package.json: Missing dependencies');
      
      // Vérifier homey-zigbeedriver dependency
      if (!packageConfig.dependencies?.['homey-zigbeedriver']) {
        issues.push('package.json: Missing homey-zigbeedriver dependency');
      }
      
    } catch (error) {
      issues.push(`package.json: Invalid JSON - ${error.message}`);
    }
    
    return issues;
  }

  async validateAssets() {
    const issues = [];
    
    // Vérifier assets globaux
    const assetsPath = './assets';
    if (!fs.existsSync(assetsPath)) {
      issues.push('Missing global assets directory');
    }
    
    // Vérifier icon.svg
    const iconPath = './assets/icon.svg';
    if (!fs.existsSync(iconPath)) {
      issues.push('Missing assets/icon.svg');
    }
    
    return issues;
  }

  async applyAutomaticFixes(issues) {
    const fixes = [];
    
    for (const issue of issues) {
      const fix = await this.attemptAutoFix(issue);
      if (fix) {
        fixes.push(fix);
      }
    }
    
    return fixes;
  }

  async attemptAutoFix(issue) {
    try {
      // Fix missing images
      if (issue.includes('Missing') && issue.includes('image')) {
        const match = issue.match(/([^:]+):\s*Missing\s+(.*\.png)/);
        if (match) {
          const driverId = match[1];
          const imageName = match[2];
          const imagePath = path.join('./drivers', driverId, 'assets', 'images', path.basename(imageName));
          
          if (!fs.existsSync(imagePath)) {
            fs.mkdirSync(path.dirname(imagePath), { recursive: true });
            const placeholder = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
            fs.writeFileSync(imagePath, placeholder);
            return `Fixed: Created ${imagePath}`;
          }
        }
      }
      
      // Fix missing energy config
      if (issue.includes('Missing energy config for battery device')) {
        const driverId = issue.split(':')[0];
        const composeFile = path.join('./drivers', driverId, 'driver.compose.json');
        
        if (fs.existsSync(composeFile)) {
          const config = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
          if (!config.energy && config.capabilities?.includes('measure_battery')) {
            config.energy = { batteries: ['INTERNAL'] };
            fs.writeFileSync(composeFile, JSON.stringify(config, null, 2));
            return `Fixed: Added energy config to ${driverId}`;
          }
        }
      }
      
      // Fix missing images config
      if (issue.includes('Missing images configuration')) {
        const driverId = issue.split(':')[0];
        const composeFile = path.join('./drivers', driverId, 'driver.compose.json');
        
        if (fs.existsSync(composeFile)) {
          const config = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
          if (!config.images) {
            config.images = {
              small: "{{driverAssetsPath}}/images/small.png",
              large: "{{driverAssetsPath}}/images/large.png"
            };
            fs.writeFileSync(composeFile, JSON.stringify(config, null, 2));
            return `Fixed: Added images config to ${driverId}`;
          }
        }
      }
      
      // Fix missing directories
      if (issue.includes('Missing') && issue.includes('directory')) {
        const match = issue.match(/Missing\s+(.+)\s+directory/);
        if (match) {
          const dirPath = match[1].replace(' assets/images', '/assets/images');
          if (dirPath.startsWith('./') || dirPath.includes('drivers/')) {
            fs.mkdirSync(dirPath, { recursive: true });
            return `Fixed: Created directory ${dirPath}`;
          }
        }
      }
      
    } catch (error) {
      // Ignore auto-fix errors
    }
    
    return null;
  }

  async tryHomeyValidation() {
    try {
      // Clear cache first
      if (fs.existsSync('./.homeybuild')) {
        fs.rmSync('./.homeybuild', { recursive: true, force: true });
      }
      
      const result = execSync('homey app validate --level publish', { 
        timeout: 30000,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      return {
        success: true,
        output: result
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        output: error.stdout || error.stderr || ''
      };
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  generateFinalValidationReport() {
    console.log('\n📊 RAPPORT FINAL VALIDATION ITÉRATIVE:');
    console.log('=' .repeat(60));
    
    const totalIssues = this.validationRounds.reduce((sum, round) => sum + round.issuesFound, 0);
    const totalFixes = this.validationRounds.reduce((sum, round) => sum + round.fixesApplied, 0);
    const lastRound = this.validationRounds[this.validationRounds.length - 1];
    
    console.log(`🔄 Rounds exécutés: ${this.validationRounds.length}`);
    console.log(`⚠️ Total issues trouvés: ${totalIssues}`);
    console.log(`✅ Total corrections appliquées: ${totalFixes}`);
    console.log(`🎯 Issues restants: ${lastRound.issuesFound}`);
    
    if (lastRound.issuesFound === 0) {
      console.log('🎉 VALIDATION RÉUSSIE - Projet prêt pour publication!');
    } else {
      console.log('⚠️ Issues restants à résoudre manuellement:');
      for (const issue of lastRound.issues.slice(0, 10)) {
        console.log(`  - ${issue}`);
      }
      if (lastRound.issues.length > 10) {
        console.log(`  ... et ${lastRound.issues.length - 10} autres issues`);
      }
    }
    
    // Rapport Homey validation
    if (lastRound.homeyValidation) {
      console.log('\n🏠 HOMEY CLI VALIDATION:');
      if (lastRound.homeyValidation.success) {
        console.log('✅ Homey validation réussie!');
      } else {
        console.log('❌ Homey validation échouée:');
        console.log(lastRound.homeyValidation.error);
      }
    }
    
    const report = {
      timestamp: new Date().toISOString(),
      roundsExecuted: this.validationRounds.length,
      totalIssuesFound: totalIssues,
      totalFixesApplied: totalFixes,
      finalIssuesRemaining: lastRound.issuesFound,
      validationSuccessful: lastRound.issuesFound === 0,
      homeyValidationSuccessful: lastRound.homeyValidation?.success || false,
      rounds: this.validationRounds
    };
    
    fs.writeFileSync('./comprehensive_validation_report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Rapport sauvé: comprehensive_validation_report.json');
    
    if (lastRound.issuesFound === 0) {
      console.log('\n🚀 PRÊT POUR ÉTAPE SUIVANTE: Tests exhaustifs');
    } else {
      console.log('\n🔧 CORRECTION MANUELLE REQUISE avant tests');
    }
  }
}

// Exécuter validation itérative
const validator = new ComprehensiveIterativeValidator();
validator.runIterativeValidation().catch(console.error);
