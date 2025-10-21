const fs = require('fs');
const path = require('path');

/**
 * ANALYSEUR DYNAMIQUE ET INTELLIGENT DU PROJET
 * Détecte automatiquement l'environnement, fichiers, dossiers
 * Fonctionne de manière autonome sans configuration manuelle
 */

console.log('🤖 ANALYSEUR DYNAMIQUE INTELLIGENT - DÉTECTION AUTOMATIQUE');
console.log('═'.repeat(80));

class DynamicProjectAnalyzer {
  constructor() {
    this.projectRoot = this.findProjectRoot();
    this.structure = {};
    this.environment = {};
    this.drivers = [];
    this.scripts = [];
  }

  /**
   * Trouve automatiquement la racine du projet
   */
  findProjectRoot() {
    let currentDir = process.cwd();
    
    // Remonter jusqu'à trouver app.json ou package.json
    while (currentDir !== path.parse(currentDir).root) {
      if (fs.existsSync(path.join(currentDir, 'app.json')) ||
          fs.existsSync(path.join(currentDir, 'package.json'))) {
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }
    
    // Si pas trouvé, utiliser le répertoire courant
    return process.cwd();
  }

  /**
   * Détecte automatiquement l'environnement
   */
  detectEnvironment() {
    console.log('\n🔍 Détection automatique de l\'environnement...\n');
    
    // Système d'exploitation
    this.environment.os = process.platform;
    this.environment.isWindows = process.platform === 'win32';
    this.environment.isLinux = process.platform === 'linux';
    this.environment.isMac = process.platform === 'darwin';
    
    // Node.js
    this.environment.nodeVersion = process.version;
    
    // Répertoire projet
    this.environment.projectRoot = this.projectRoot;
    this.environment.projectName = path.basename(this.projectRoot);
    
    // Fichiers critiques
    this.environment.hasAppJson = fs.existsSync(path.join(this.projectRoot, 'app.json'));
    this.environment.hasPackageJson = fs.existsSync(path.join(this.projectRoot, 'package.json'));
    this.environment.hasGit = fs.existsSync(path.join(this.projectRoot, '.git'));
    
    // Homey
    if (this.environment.hasAppJson) {
      const appJson = JSON.parse(fs.readFileSync(path.join(this.projectRoot, 'app.json'), 'utf8'));
      this.environment.appId = appJson.id;
      this.environment.appVersion = appJson.version;
      this.environment.sdk = appJson.sdk;
      this.environment.driversCount = appJson.drivers?.length || 0;
    }
    
    console.log(`   ✅ OS: ${this.environment.os}`);
    console.log(`   ✅ Node: ${this.environment.nodeVersion}`);
    console.log(`   ✅ Projet: ${this.environment.projectName}`);
    console.log(`   ✅ SDK: ${this.environment.sdk || 'N/A'}`);
    console.log(`   ✅ Version: ${this.environment.appVersion || 'N/A'}`);
    console.log(`   ✅ Drivers: ${this.environment.driversCount || 0}`);
    
    return this.environment;
  }

  /**
   * Détecte automatiquement la structure des dossiers
   */
  detectStructure() {
    console.log('\n📁 Détection automatique de la structure...\n');
    
    const scan = (dir, depth = 0, maxDepth = 3) => {
      if (depth > maxDepth) return null;
      
      const stats = {
        path: dir,
        exists: fs.existsSync(dir),
        files: [],
        dirs: [],
        count: 0
      };
      
      if (!stats.exists) return stats;
      
      try {
        const items = fs.readdirSync(dir);
        
        items.forEach(item => {
          const fullPath = path.join(dir, item);
          const itemStats = fs.statSync(fullPath);
          
          if (itemStats.isDirectory()) {
            if (!item.startsWith('.') && item !== 'node_modules') {
              stats.dirs.push(item);
            }
          } else {
            stats.files.push(item);
          }
        });
        
        stats.count = stats.files.length + stats.dirs.length;
      } catch (error) {
        // Ignorer les erreurs de permission
      }
      
      return stats;
    };
    
    // Dossiers critiques
    const criticalDirs = [
      'drivers',
      'scripts',
      'docs',
      'reports',
      'assets',
      'utils',
      '.github'
    ];
    
    criticalDirs.forEach(dir => {
      const fullPath = path.join(this.projectRoot, dir);
      this.structure[dir] = scan(fullPath);
      
      if (this.structure[dir].exists) {
        console.log(`   ✅ ${dir}/ (${this.structure[dir].count} items)`);
      } else {
        console.log(`   ⚠️  ${dir}/ (manquant)`);
      }
    });
    
    return this.structure;
  }

  /**
   * Détecte automatiquement tous les drivers
   */
  detectDrivers() {
    console.log('\n🚗 Détection automatique des drivers...\n');
    
    const driversDir = path.join(this.projectRoot, 'drivers');
    
    if (!fs.existsSync(driversDir)) {
      console.log('   ⚠️  Aucun dossier drivers trouvé');
      return [];
    }
    
    const driverDirs = fs.readdirSync(driversDir).filter(item => {
      const fullPath = path.join(driversDir, item);
      return fs.statSync(fullPath).isDirectory();
    });
    
    driverDirs.forEach(driverId => {
      const driverPath = path.join(driversDir, driverId);
      const driver = {
        id: driverId,
        path: driverPath,
        files: {}
      };
      
      // Détecter les fichiers critiques
      ['device.js', 'driver.js', 'driver.compose.json', 'pair'].forEach(file => {
        const filePath = path.join(driverPath, file);
        driver.files[file] = fs.existsSync(filePath);
      });
      
      // Détecter assets
      const assetsPath = path.join(driverPath, 'assets');
      driver.files.assets = fs.existsSync(assetsPath);
      
      if (driver.files.assets) {
        const assetFiles = fs.readdirSync(assetsPath);
        driver.files.assetsList = assetFiles;
      }
      
      this.drivers.push(driver);
    });
    
    console.log(`   ✅ ${this.drivers.length} drivers détectés`);
    
    // Stats
    const withDeviceJs = this.drivers.filter(d => d.files['device.js']).length;
    const withCompose = this.drivers.filter(d => d.files['driver.compose.json']).length;
    const withAssets = this.drivers.filter(d => d.files.assets).length;
    
    console.log(`   ✅ Avec device.js: ${withDeviceJs}/${this.drivers.length}`);
    console.log(`   ✅ Avec compose: ${withCompose}/${this.drivers.length}`);
    console.log(`   ✅ Avec assets: ${withAssets}/${this.drivers.length}`);
    
    return this.drivers;
  }

  /**
   * Détecte automatiquement tous les scripts
   */
  detectScripts() {
    console.log('\n📜 Détection automatique des scripts...\n');
    
    const scriptsDir = path.join(this.projectRoot, 'scripts');
    
    if (!fs.existsSync(scriptsDir)) {
      console.log('   ⚠️  Aucun dossier scripts trouvé');
      return [];
    }
    
    const scanScripts = (dir, category = 'root') => {
      const items = fs.readdirSync(dir);
      
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory()) {
          scanScripts(fullPath, item);
        } else if (item.endsWith('.js')) {
          this.scripts.push({
            name: item,
            category: category,
            path: fullPath,
            size: stats.size
          });
        }
      });
    };
    
    scanScripts(scriptsDir);
    
    console.log(`   ✅ ${this.scripts.length} scripts détectés`);
    
    // Stats par catégorie
    const categories = [...new Set(this.scripts.map(s => s.category))];
    categories.forEach(cat => {
      const count = this.scripts.filter(s => s.category === cat).length;
      console.log(`      ${cat}: ${count} scripts`);
    });
    
    return this.scripts;
  }

  /**
   * Génère un rapport complet
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      environment: this.environment,
      structure: this.structure,
      drivers: {
        total: this.drivers.length,
        list: this.drivers
      },
      scripts: {
        total: this.scripts.length,
        list: this.scripts
      }
    };
    
    const reportPath = path.join(this.projectRoot, 'reports', 'json', 'DYNAMIC_ANALYSIS_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    return report;
  }

  /**
   * Exécute l'analyse complète
   */
  analyze() {
    this.detectEnvironment();
    this.detectStructure();
    this.detectDrivers();
    this.detectScripts();
    
    console.log('\n═'.repeat(80));
    console.log('📊 RÉSUMÉ ANALYSE DYNAMIQUE');
    console.log('═'.repeat(80));
    
    console.log(`\n✅ Environnement: ${this.environment.os} / Node ${this.environment.nodeVersion}`);
    console.log(`✅ Projet: ${this.environment.projectName} v${this.environment.appVersion}`);
    console.log(`✅ SDK: ${this.environment.sdk}`);
    console.log(`✅ Drivers: ${this.drivers.length}`);
    console.log(`✅ Scripts: ${this.scripts.length}`);
    console.log(`✅ Structure: ${Object.keys(this.structure).length} dossiers critiques`);
    
    const report = this.generateReport();
    console.log('\n📝 Rapport sauvegardé: reports/json/DYNAMIC_ANALYSIS_REPORT.json');
    
    return report;
  }
}

// Exécution
const analyzer = new DynamicProjectAnalyzer();
const report = analyzer.analyze();

console.log('\n✅ ANALYSE DYNAMIQUE TERMINÉE !');
console.log('🤖 Le système peut maintenant fonctionner de manière autonome.');
