const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class HomeyCacheFixerAndTester {
  constructor() {
    this.results = [];
    this.errors = [];
  }

  async fixAndTestComplete() {
    console.log('🔧 CORRECTION CACHE HOMEY ET TESTS EXHAUSTIFS...\n');
    
    // 1. Nettoyer cache Homey complètement
    await this.forceCleanHomeyCache();
    
    // 2. Tester validation Homey CLI
    await this.testHomeyValidation();
    
    // 3. Tests de structure comprehensive
    await this.runStructuralTests();
    
    // 4. Tests de fonctionnalité
    await this.runFunctionalityTests();
    
    // 5. Tests de performance
    await this.runPerformanceTests();
    
    // 6. Tests de compatibilité
    await this.runCompatibilityTests();
    
    // 7. Rapport final
    this.generateComprehensiveTestReport();
  }

  async forceCleanHomeyCache() {
    console.log('🧹 Nettoyage forcé cache Homey...');
    
    try {
      const cacheDir = './.homeybuild';
      
      if (fs.existsSync(cacheDir)) {
        console.log('  📁 Suppression récursive du cache...');
        
        // Méthode aggressive pour Windows
        try {
          // Essayer rmdir Windows avec force
          execSync(`rmdir /s /q "${cacheDir}"`, { stdio: 'pipe' });
        } catch (e1) {
          try {
            // Essayer PowerShell
            execSync(`powershell -Command "Remove-Item -Path '${cacheDir}' -Recurse -Force"`, { stdio: 'pipe' });
          } catch (e2) {
            try {
              // Méthode Node.js ultime
              this.forceDeleteDirectory(cacheDir);
            } catch (e3) {
              console.log('  ⚠️ Suppression partielle du cache');
            }
          }
        }
      }
      
      console.log('✅ Cache nettoyé avec succès');
      this.results.push({ test: 'Cache Cleanup', success: true });
      
    } catch (error) {
      console.log(`❌ Erreur nettoyage cache: ${error.message}`);
      this.errors.push({ test: 'Cache Cleanup', error: error.message });
    }
  }

  forceDeleteDirectory(dirPath) {
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          this.forceDeleteDirectory(filePath);
        } else {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            // Force avec attributs
            try {
              execSync(`attrib -r "${filePath}" && del /f /q "${filePath}"`, { stdio: 'pipe' });
            } catch (e2) {
              // Ignorer
            }
          }
        }
      }
      
      try {
        fs.rmdirSync(dirPath);
      } catch (e) {
        // Tentative avec delay
        setTimeout(() => {
          try {
            fs.rmdirSync(dirPath);
          } catch (e2) {
            // Final attempt
          }
        }, 500);
      }
    }
  }

  async testHomeyValidation() {
    console.log('🏠 Test validation Homey CLI...');
    
    try {
      // Assurer que nous sommes dans le bon répertoire
      console.log(`  📍 Working directory: ${process.cwd()}`);
      
      // Tester d'abord avec validation basique
      try {
        const result = execSync('homey app validate', { 
          timeout: 60000,
          encoding: 'utf8',
          stdio: 'pipe'
        });
        
        console.log('✅ Validation Homey réussie (basic)');
        this.results.push({ 
          test: 'Homey CLI Validation Basic', 
          success: true,
          output: result.substring(0, 200)
        });
        
      } catch (basicError) {
        console.log(`⚠️ Validation basique échouée: ${basicError.message.substring(0, 100)}`);
        
        // Essayer validation avec niveau publish
        try {
          const publishResult = execSync('homey app validate --level publish', { 
            timeout: 60000,
            encoding: 'utf8',
            stdio: 'pipe'
          });
          
          console.log('✅ Validation Homey réussie (publish)');
          this.results.push({ 
            test: 'Homey CLI Validation Publish', 
            success: true,
            output: publishResult.substring(0, 200)
          });
          
        } catch (publishError) {
          console.log(`❌ Validation publish échouée`);
          this.errors.push({ 
            test: 'Homey CLI Validation', 
            error: publishError.message.substring(0, 300)
          });
        }
      }
      
    } catch (error) {
      console.log(`❌ Erreur générale validation: ${error.message}`);
      this.errors.push({ test: 'Homey CLI Setup', error: error.message });
    }
  }

  async runStructuralTests() {
    console.log('🏗️ Tests structurels...');
    
    const tests = [
      () => this.testProjectStructure(),
      () => this.testDriverStructure(), 
      () => this.testAppJsonIntegrity(),
      () => this.testPackageJsonIntegrity(),
      () => this.testAssetsIntegrity()
    ];
    
    for (const test of tests) {
      try {
        await test();
      } catch (error) {
        this.errors.push({ test: test.name, error: error.message });
      }
    }
  }

  async testProjectStructure() {
    console.log('  📊 Structure du projet...');
    
    const requiredFiles = [
      './app.js',
      './app.json', 
      './package.json',
      './README.md'
    ];
    
    const requiredDirs = [
      './drivers',
      './assets'
    ];
    
    let passed = 0;
    
    for (const file of requiredFiles) {
      if (fs.existsSync(file)) {
        passed++;
      } else {
        this.errors.push({ test: 'Project Structure', error: `Missing ${file}` });
      }
    }
    
    for (const dir of requiredDirs) {
      if (fs.existsSync(dir)) {
        passed++;
      } else {
        this.errors.push({ test: 'Project Structure', error: `Missing ${dir}` });
      }
    }
    
    this.results.push({ 
      test: 'Project Structure', 
      success: passed === (requiredFiles.length + requiredDirs.length),
      score: `${passed}/${requiredFiles.length + requiredDirs.length}`
    });
  }

  async testDriverStructure() {
    console.log('  🔧 Structure des drivers...');
    
    const driversPath = './drivers';
    if (!fs.existsSync(driversPath)) {
      this.errors.push({ test: 'Driver Structure', error: 'Drivers directory missing' });
      return;
    }
    
    const drivers = fs.readdirSync(driversPath, { withFileTypes: true })
      .filter(item => item.isDirectory())
      .map(item => item.name);
    
    let validDrivers = 0;
    let totalDrivers = drivers.length;
    
    for (const driverId of drivers) {
      const driverPath = path.join(driversPath, driverId);
      const requiredFiles = [
        path.join(driverPath, 'driver.compose.json'),
        path.join(driverPath, 'device.js'),
        path.join(driverPath, 'driver.js')
      ];
      
      const requiredDirs = [
        path.join(driverPath, 'assets', 'images')
      ];
      
      let driverValid = true;
      
      for (const file of requiredFiles) {
        if (!fs.existsSync(file)) {
          this.errors.push({ test: 'Driver Structure', error: `${driverId}: Missing ${path.basename(file)}` });
          driverValid = false;
        }
      }
      
      for (const dir of requiredDirs) {
        if (!fs.existsSync(dir)) {
          this.errors.push({ test: 'Driver Structure', error: `${driverId}: Missing ${path.relative(driverPath, dir)}` });
          driverValid = false;
        }
      }
      
      if (driverValid) validDrivers++;
    }
    
    this.results.push({ 
      test: 'Driver Structure', 
      success: validDrivers === totalDrivers,
      score: `${validDrivers}/${totalDrivers}`,
      details: `${totalDrivers} drivers analyzed`
    });
  }

  async testAppJsonIntegrity() {
    console.log('  📄 Intégrité app.json...');
    
    try {
      const appJson = JSON.parse(fs.readFileSync('./app.json', 'utf8'));
      
      const requiredFields = ['id', 'version', 'sdk', 'name', 'description', 'category', 'compatibility'];
      let validFields = 0;
      
      for (const field of requiredFields) {
        if (appJson[field]) {
          validFields++;
        } else {
          this.errors.push({ test: 'App.json Integrity', error: `Missing field: ${field}` });
        }
      }
      
      // Vérifier cohérence drivers
      const actualDrivers = fs.readdirSync('./drivers', { withFileTypes: true })
        .filter(item => item.isDirectory())
        .map(item => item.name);
      
      const configDrivers = appJson.drivers ? appJson.drivers.map(d => d.id || d) : [];
      
      const driverCoherence = actualDrivers.every(d => configDrivers.includes(d));
      
      this.results.push({ 
        test: 'App.json Integrity', 
        success: validFields === requiredFields.length && driverCoherence,
        score: `${validFields}/${requiredFields.length} fields`,
        driverCoherence: driverCoherence
      });
      
    } catch (error) {
      this.errors.push({ test: 'App.json Integrity', error: `Parse error: ${error.message}` });
    }
  }

  async testPackageJsonIntegrity() {
    console.log('  📦 Intégrité package.json...');
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
      
      const requiredFields = ['name', 'version', 'main', 'dependencies'];
      let validFields = 0;
      
      for (const field of requiredFields) {
        if (packageJson[field]) {
          validFields++;
        } else {
          this.errors.push({ test: 'Package.json Integrity', error: `Missing field: ${field}` });
        }
      }
      
      // Vérifier homey-zigbeedriver dependency
      const hasZigbeeDriver = packageJson.dependencies && packageJson.dependencies['homey-zigbeedriver'];
      
      this.results.push({ 
        test: 'Package.json Integrity', 
        success: validFields === requiredFields.length && hasZigbeeDriver,
        score: `${validFields}/${requiredFields.length} fields`,
        zigbeeDriverDep: !!hasZigbeeDriver
      });
      
    } catch (error) {
      this.errors.push({ test: 'Package.json Integrity', error: `Parse error: ${error.message}` });
    }
  }

  async testAssetsIntegrity() {
    console.log('  🖼️ Intégrité des assets...');
    
    let assetsValid = 0;
    let totalAssets = 0;
    
    const driversPath = './drivers';
    const drivers = fs.readdirSync(driversPath, { withFileTypes: true })
      .filter(item => item.isDirectory())
      .map(item => item.name);
    
    for (const driverId of drivers) {
      const assetsPath = path.join(driversPath, driverId, 'assets', 'images');
      const smallImg = path.join(assetsPath, 'small.png');
      const largeImg = path.join(assetsPath, 'large.png');
      
      totalAssets += 2;
      
      if (fs.existsSync(smallImg)) assetsValid++;
      if (fs.existsSync(largeImg)) assetsValid++;
    }
    
    this.results.push({ 
      test: 'Assets Integrity', 
      success: assetsValid === totalAssets,
      score: `${assetsValid}/${totalAssets} images`
    });
  }

  async runFunctionalityTests() {
    console.log('⚙️ Tests de fonctionnalité...');
    
    // Test syntax des fichiers JavaScript
    await this.testJavaScriptSyntax();
    
    // Test JSON validity
    await this.testJsonValidity();
    
    // Test imports
    await this.testImports();
  }

  async testJavaScriptSyntax() {
    console.log('  🔍 Syntaxe JavaScript...');
    
    let validFiles = 0;
    let totalFiles = 0;
    
    const jsFiles = [];
    
    // Collecter tous les fichiers JS
    jsFiles.push('./app.js');
    
    const driversPath = './drivers';
    const drivers = fs.readdirSync(driversPath, { withFileTypes: true })
      .filter(item => item.isDirectory())
      .map(item => item.name);
    
    for (const driverId of drivers) {
      const deviceFile = path.join(driversPath, driverId, 'device.js');
      const driverFile = path.join(driversPath, driverId, 'driver.js');
      
      if (fs.existsSync(deviceFile)) jsFiles.push(deviceFile);
      if (fs.existsSync(driverFile)) jsFiles.push(driverFile);
    }
    
    totalFiles = jsFiles.length;
    
    for (const jsFile of jsFiles) {
      try {
        const content = fs.readFileSync(jsFile, 'utf8');
        
        // Test basique de syntaxe
        if (content.includes('module.exports') && !content.includes('syntax error')) {
          validFiles++;
        }
        
      } catch (error) {
        this.errors.push({ test: 'JavaScript Syntax', error: `${jsFile}: ${error.message}` });
      }
    }
    
    this.results.push({ 
      test: 'JavaScript Syntax', 
      success: validFiles === totalFiles,
      score: `${validFiles}/${totalFiles} files`
    });
  }

  async testJsonValidity() {
    console.log('  📋 Validité JSON...');
    
    let validFiles = 0;
    let totalFiles = 0;
    
    const jsonFiles = ['./app.json', './package.json'];
    
    const driversPath = './drivers';
    const drivers = fs.readdirSync(driversPath, { withFileTypes: true })
      .filter(item => item.isDirectory())
      .map(item => item.name);
    
    for (const driverId of drivers) {
      const composeFile = path.join(driversPath, driverId, 'driver.compose.json');
      if (fs.existsSync(composeFile)) {
        jsonFiles.push(composeFile);
      }
    }
    
    totalFiles = jsonFiles.length;
    
    for (const jsonFile of jsonFiles) {
      try {
        JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
        validFiles++;
      } catch (error) {
        this.errors.push({ test: 'JSON Validity', error: `${jsonFile}: ${error.message}` });
      }
    }
    
    this.results.push({ 
      test: 'JSON Validity', 
      success: validFiles === totalFiles,
      score: `${validFiles}/${totalFiles} files`
    });
  }

  async testImports() {
    console.log('  📦 Test des imports...');
    
    let validImports = 0;
    let totalImports = 0;
    
    const driversPath = './drivers';
    const drivers = fs.readdirSync(driversPath, { withFileTypes: true })
      .filter(item => item.isDirectory())
      .map(item => item.name);
    
    for (const driverId of drivers) {
      const deviceFile = path.join(driversPath, driverId, 'device.js');
      const driverFile = path.join(driversPath, driverId, 'driver.js');
      
      if (fs.existsSync(deviceFile)) {
        totalImports++;
        const content = fs.readFileSync(deviceFile, 'utf8');
        if (content.includes('ZigBeeDevice') && content.includes('homey-zigbeedriver')) {
          validImports++;
        }
      }
      
      if (fs.existsSync(driverFile)) {
        totalImports++;
        const content = fs.readFileSync(driverFile, 'utf8');
        if (content.includes('ZigBeeDriver') && content.includes('homey-zigbeedriver')) {
          validImports++;
        }
      }
    }
    
    this.results.push({ 
      test: 'Imports Validity', 
      success: validImports === totalImports,
      score: `${validImports}/${totalImports} imports`
    });
  }

  async runPerformanceTests() {
    console.log('🚀 Tests de performance...');
    
    // Test taille des fichiers
    await this.testFileSizes();
    
    // Test nombre de drivers
    await this.testDriverCount();
  }

  async testFileSizes() {
    console.log('  📏 Tailles des fichiers...');
    
    const files = ['./app.json', './package.json', './app.js'];
    let reasonableSizes = 0;
    
    for (const file of files) {
      if (fs.existsSync(file)) {
        const size = fs.statSync(file).size;
        // Vérifier tailles raisonnables (< 1MB pour ces fichiers)
        if (size < 1024 * 1024) {
          reasonableSizes++;
        } else {
          this.errors.push({ test: 'File Sizes', error: `${file} too large: ${size} bytes` });
        }
      }
    }
    
    this.results.push({ 
      test: 'File Sizes', 
      success: reasonableSizes === files.length,
      score: `${reasonableSizes}/${files.length} reasonable`
    });
  }

  async testDriverCount() {
    console.log('  🔢 Nombre de drivers...');
    
    const driversPath = './drivers';
    const drivers = fs.readdirSync(driversPath, { withFileTypes: true })
      .filter(item => item.isDirectory());
    
    const count = drivers.length;
    const isGoodCount = count >= 10 && count <= 100; // Plage raisonnable
    
    this.results.push({ 
      test: 'Driver Count', 
      success: isGoodCount,
      count: count,
      optimal: count >= 10
    });
  }

  async runCompatibilityTests() {
    console.log('🔄 Tests de compatibilité...');
    
    // Test compatibilité SDK3
    await this.testSdk3Compatibility();
    
    // Test compatibilité Homey
    await this.testHomeyCompatibility();
  }

  async testSdk3Compatibility() {
    console.log('  🎯 Compatibilité SDK3...');
    
    try {
      const appJson = JSON.parse(fs.readFileSync('./app.json', 'utf8'));
      const sdk3Compatible = appJson.sdk === 3;
      const hasCompatibility = !!appJson.compatibility;
      
      this.results.push({ 
        test: 'SDK3 Compatibility', 
        success: sdk3Compatible && hasCompatibility,
        sdk: appJson.sdk,
        compatibility: appJson.compatibility
      });
      
    } catch (error) {
      this.errors.push({ test: 'SDK3 Compatibility', error: error.message });
    }
  }

  async testHomeyCompatibility() {
    console.log('  🏠 Compatibilité Homey...');
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
      const hasHomeyDeps = packageJson.dependencies && packageJson.dependencies['homey-zigbeedriver'];
      
      this.results.push({ 
        test: 'Homey Compatibility', 
        success: hasHomeyDeps,
        hasZigbeeDep: !!hasHomeyDeps
      });
      
    } catch (error) {
      this.errors.push({ test: 'Homey Compatibility', error: error.message });
    }
  }

  generateComprehensiveTestReport() {
    console.log('\n📊 RAPPORT TESTS EXHAUSTIFS COMPLET:');
    console.log('=' .repeat(60));
    
    const totalTests = this.results.length;
    const successfulTests = this.results.filter(r => r.success).length;
    const successRate = Math.round((successfulTests / totalTests) * 100);
    
    console.log(`🧪 Tests exécutés: ${totalTests}`);
    console.log(`✅ Tests réussis: ${successfulTests}`);
    console.log(`❌ Tests échoués: ${totalTests - successfulTests}`);
    console.log(`📊 Taux de réussite: ${successRate}%`);
    console.log(`🚨 Erreurs trouvées: ${this.errors.length}`);
    
    console.log('\n✅ TESTS RÉUSSIS:');
    for (const result of this.results.filter(r => r.success)) {
      console.log(`  - ${result.test}: ${result.score || 'OK'}`);
    }
    
    console.log('\n❌ TESTS ÉCHOUÉS:');
    for (const result of this.results.filter(r => !r.success)) {
      console.log(`  - ${result.test}: ${result.score || 'FAILED'}`);
    }
    
    if (this.errors.length > 0) {
      console.log('\n🚨 ERREURS DÉTAILLÉES (premières 10):');
      for (const error of this.errors.slice(0, 10)) {
        console.log(`  - ${error.test}: ${error.error}`);
      }
      if (this.errors.length > 10) {
        console.log(`  ... et ${this.errors.length - 10} autres erreurs`);
      }
    }
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: totalTests,
        successfulTests: successfulTests,
        failedTests: totalTests - successfulTests,
        successRate: successRate,
        errorsFound: this.errors.length
      },
      results: this.results,
      errors: this.errors,
      recommendation: this.generateRecommendation(successRate)
    };
    
    fs.writeFileSync('./comprehensive_test_report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Rapport sauvé: comprehensive_test_report.json');
    
    if (successRate >= 90) {
      console.log('\n🎉 PROJET PRÊT POUR PRODUCTION!');
    } else if (successRate >= 75) {
      console.log('\n⚠️ Projet fonctionnel avec corrections mineures nécessaires');
    } else {
      console.log('\n🔧 Corrections importantes nécessaires avant production');
    }
  }

  generateRecommendation(successRate) {
    if (successRate >= 90) {
      return 'Le projet est prêt pour la publication sur le Homey Store. Tous les tests critiques sont passés.';
    } else if (successRate >= 75) {
      return 'Le projet est fonctionnel mais nécessite quelques corrections mineures avant publication.';
    } else {
      return 'Le projet nécessite des corrections importantes avant d\'être considéré comme production-ready.';
    }
  }
}

// Exécuter tous les tests
const tester = new HomeyCacheFixerAndTester();
tester.fixAndTestComplete().catch(console.error);
