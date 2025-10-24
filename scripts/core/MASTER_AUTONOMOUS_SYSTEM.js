const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * MASTER AUTONOMOUS SYSTEM
 * Système intelligent ultra-autonome et auto-adaptatif
 * Scanne, analyse, corrige et met à jour TOUT automatiquement
 */

console.log('🤖 MASTER AUTONOMOUS SYSTEM - ANALYSE & CORRECTION COMPLÈTE');
console.log('═'.repeat(80));

class MasterAutonomousSystem {
  constructor() {
    this.projectRoot = this.findProjectRoot();
    this.config = this.loadConfig();
    this.state = {
      scanned: { files: 0, dirs: 0 },
      analyzed: { drivers: 0, scripts: 0, docs: 0 },
      fixed: { renamed: 0, updated: 0, created: 0 },
      errors: [],
      warnings: []
    };
  }

  /**
   * AUTO-DÉTECTION RACINE PROJET
   */
  findProjectRoot() {
    let dir = process.cwd();
    while (dir !== path.parse(dir).root) {
      if (fs.existsSync(path.join(dir, 'app.json')) && 
          fs.existsSync(path.join(dir, 'package.json'))) {
        return dir;
      }
      dir = path.dirname(dir);
    }
    return process.cwd();
  }

  /**
   * CHARGEMENT CONFIGURATION DYNAMIQUE
   */
  loadConfig() {
    return {
      // Règles de nommage
      naming: {
        specialChars: /[()]/g,
        multipleUnderscores: /_+/g,
        powerTypes: ['_ac', '_dc', '_battery', '_cr2032', '_cr2450', '_hybrid'],
        gangs: ['1gang', '2gang', '3gang', '4gang', '5gang', '6gang', '8gang']
      },
      
      // Dossiers critiques
      criticalDirs: ['drivers', 'scripts', 'docs', 'reports', 'assets', 'utils'],
      
      // Extensions à scanner
      scanExtensions: ['.js', '.json', '.md', '.txt'],
      
      // Fichiers à ignorer
      ignoreDirs: ['node_modules', '.git', '.homeybuild', '.homeycompose', '.vscode'],
      
      // Patterns à détecter
      patterns: {
        driverReference: /drivers\/([a-z0-9_]+)/g,
        imageReference: /\/drivers\/([a-z0-9_]+)\/assets\//g,
        filterReference: /driver_id=([a-z0-9_]+)/g
      }
    };
  }

  /**
   * SCAN COMPLET PROJET
   */
  scanProject() {
    console.log('\n🔍 SCAN COMPLET DU PROJET\n');
    
    const structure = {
      drivers: this.scanDirectory(path.join(this.projectRoot, 'drivers')),
      scripts: this.scanDirectory(path.join(this.projectRoot, 'scripts')),
      docs: this.scanDirectory(path.join(this.projectRoot, 'docs')),
      reports: this.scanDirectory(path.join(this.projectRoot, 'reports')),
      root: this.scanDirectory(this.projectRoot, 1)
    };
    
    Object.entries(structure).forEach(([name, data]) => {
      console.log(`   ✅ ${name}/: ${data.files.length} fichiers, ${data.dirs.length} dossiers`);
    });
    
    return structure;
  }

  /**
   * SCAN RÉCURSIF RÉPERTOIRE
   */
  scanDirectory(dir, maxDepth = 10, currentDepth = 0) {
    const result = { files: [], dirs: [], items: [] };
    
    if (!fs.existsSync(dir) || currentDepth >= maxDepth) return result;
    
    try {
      const items = fs.readdirSync(dir);
      
      items.forEach(item => {
        if (this.config.ignoreDirs.includes(item)) return;
        
        const fullPath = path.join(dir, item);
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory()) {
          result.dirs.push(fullPath);
          if (currentDepth < maxDepth - 1) {
            const subResult = this.scanDirectory(fullPath, maxDepth, currentDepth + 1);
            result.files.push(...subResult.files);
            result.dirs.push(...subResult.dirs);
          }
        } else {
          const ext = path.extname(item);
          if (this.config.scanExtensions.includes(ext)) {
            result.files.push(fullPath);
          }
        }
      });
    } catch (error) {
      this.state.errors.push(`Scan error: ${dir} - ${error.message}`);
    }
    
    this.state.scanned.files += result.files.length;
    this.state.scanned.dirs += result.dirs.length;
    
    return result;
  }

  /**
   * ANALYSE INTELLIGENTE DRIVERS
   */
  analyzeDrivers() {
    console.log('\n🚗 ANALYSE INTELLIGENTE DES DRIVERS\n');
    
    const driversDir = path.join(this.projectRoot, 'drivers');
    if (!fs.existsSync(driversDir)) {
      console.log('   ⚠️  Dossier drivers introuvable');
      return [];
    }
    
    const driverDirs = fs.readdirSync(driversDir).filter(item => {
      return fs.statSync(path.join(driversDir, item)).isDirectory();
    });
    
    const drivers = [];
    
    driverDirs.forEach(driverId => {
      const driverPath = path.join(driversDir, driverId);
      const driver = {
        id: driverId,
        path: driverPath,
        issues: [],
        recommendations: []
      };
      
      // Vérifier structure
      const requiredFiles = ['device.js', 'driver.compose.json'];
      requiredFiles.forEach(file => {
        if (!fs.existsSync(path.join(driverPath, file))) {
          driver.issues.push(`Missing ${file}`);
        }
      });
      
      // Vérifier assets
      const assetsPath = path.join(driverPath, 'assets');
      if (!fs.existsSync(assetsPath)) {
        driver.issues.push('Missing assets folder');
      } else {
        const requiredAssets = ['small.png', 'large.png'];
        requiredAssets.forEach(asset => {
          if (!fs.existsSync(path.join(assetsPath, asset))) {
            driver.issues.push(`Missing ${asset}`);
          }
        });
      }
      
      // Analyser nom pour conformité
      const namingIssues = this.analyzeDriverNaming(driverId);
      driver.issues.push(...namingIssues);
      
      drivers.push(driver);
      this.state.analyzed.drivers++;
    });
    
    const withIssues = drivers.filter(d => d.issues.length > 0);
    console.log(`   ✅ ${drivers.length} drivers analysés`);
    console.log(`   ${withIssues.length === 0 ? '✅' : '⚠️'}  ${withIssues.length} avec issues`);
    
    return drivers;
  }

  /**
   * ANALYSE NOMMAGE DRIVER
   */
  analyzeDriverNaming(driverId) {
    const issues = [];
    
    // Vérifier caractères spéciaux
    if (this.config.naming.specialChars.test(driverId)) {
      issues.push('Contains special characters');
    }
    
    // Vérifier underscores multiples
    if (/__{2,}/.test(driverId)) {
      issues.push('Multiple consecutive underscores');
    }
    
    // Vérifier si nom commence/finit par underscore
    if (/^_|_$/.test(driverId)) {
      issues.push('Starts or ends with underscore');
    }
    
    return issues;
  }

  /**
   * EXTRACTION TOUTES RÉFÉRENCES
   */
  extractAllReferences() {
    console.log('\n📋 EXTRACTION TOUTES LES RÉFÉRENCES\n');
    
    const references = {
      drivers: new Set(),
      images: new Set(),
      filters: new Set()
    };
    
    const appJsonPath = path.join(this.projectRoot, 'app.json');
    if (fs.existsSync(appJsonPath)) {
      const content = fs.readFileSync(appJsonPath, 'utf8');
      
      // Extraire références drivers
      const driverMatches = content.match(this.config.patterns.driverReference);
      if (driverMatches) {
        driverMatches.forEach(match => {
          const driverId = String(match).replace('drivers/', '');
          references.drivers.add(driverId);
        });
      }
      
      // Extraire références filters
      const filterMatches = content.match(this.config.patterns.filterReference);
      if (filterMatches) {
        filterMatches.forEach(match => {
          const driverId = String(match).replace('driver_id=', '');
          references.filters.add(driverId);
        });
      }
    }
    
    console.log(`   ✅ ${references.drivers.size} références drivers trouvées`);
    console.log(`   ✅ ${references.filters.size} références filters trouvées`);
    
    return references;
  }

  /**
   * MISE À JOUR INTELLIGENTE FICHIER
   */
  updateFileIntelligently(filePath, replacements) {
    if (!fs.existsSync(filePath)) return 0;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let changes = 0;
    
    Object.entries(replacements).forEach(([oldValue, newValue]) => {
      if (oldValue === newValue) return;
      
      const regex = new RegExp(this.escapeRegex(oldValue), 'g');
      const matches = content.match(regex);
      
      if (matches) {
        content = String(content).replace(regex, newValue);
        changes += matches.length;
      }
    });
    
    if (changes > 0) {
      fs.writeFileSync(filePath, content);
      this.state.fixed.updated++;
    }
    
    return changes;
  }

  /**
   * ESCAPE REGEX
   */
  escapeRegex(string) {
    return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * AUTO-FIX COMPLET
   */
  autoFixAll() {
    console.log('\n🔧 AUTO-FIX INTELLIGENT COMPLET\n');
    
    const fixes = [];
    
    // 1. Nettoyer app.json
    console.log('   1️⃣ Nettoyage app.json...');
    const appJsonFixes = this.cleanAppJson();
    fixes.push(...appJsonFixes);
    
    // 2. Synchroniser tous les fichiers
    console.log('   2️⃣ Synchronisation fichiers...');
    const syncFixes = this.synchronizeAllFiles();
    fixes.push(...syncFixes);
    
    // 3. Valider structure
    console.log('   3️⃣ Validation structure...');
    const structureFixes = this.validateStructure();
    fixes.push(...structureFixes);
    
    console.log(`\n   ✅ ${fixes.length} corrections appliquées`);
    
    return fixes;
  }

  /**
   * NETTOYAGE APP.JSON
   */
  cleanAppJson() {
    const appJsonPath = path.join(this.projectRoot, 'app.json');
    if (!fs.existsSync(appJsonPath)) return [];
    
    let appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    const fixes = [];
    
    // Supprimer doublons dans suffixes
    const cleanSuffix = (str) => {
      return str
        .replace(/_battery_battery/g, '_battery')
        .replace(/_ac_ac/g, '_ac')
        .replace(/_dc_dc/g, '_dc')
        .replace(/_cr2032_cr2032/g, '_cr2032')
        .replace(/_cr2450_cr2450/g, '_cr2450')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
    };
    
    // Nettoyer récursivement
    const cleanObject = (obj) => {
      if (typeof obj === 'string') {
        const cleaned = cleanSuffix(obj);
        if (cleaned !== obj) fixes.push(`Cleaned: ${obj} → ${cleaned}`);
        return cleaned;
      } else if (Array.isArray(obj)) {
        return obj.map(item => cleanObject(item));
      } else if (obj !== null && typeof obj === 'object') {
        const newObj = {};
        Object.entries(obj).forEach(([key, value]) => {
          newObj[key] = cleanObject(value);
        });
        return newObj;
      }
      return obj;
    };
    
    const cleanedAppJson = cleanObject(appJson);
    fs.writeFileSync(appJsonPath, JSON.stringify(cleanedAppJson, null, 2));
    
    return fixes;
  }

  /**
   * SYNCHRONISATION TOUS FICHIERS
   */
  synchronizeAllFiles() {
    const structure = this.scanProject();
    const fixes = [];
    
    // Obtenir mapping des renommages depuis HARMONIZE_MAPPING_APPLIED.json
    const mappingPath = path.join(this.projectRoot, 'HARMONIZE_MAPPING_APPLIED.json');
    if (!fs.existsSync(mappingPath)) return fixes;
    
    const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
    const replacements = {};
    mapping.forEach(m => {
      replacements[m.old] = m.new;
    });
    
    // Mettre à jour tous les fichiers
    [...structure.scripts.files, ...structure.docs.files, ...structure.reports.files].forEach(file => {
      const changes = this.updateFileIntelligently(file, replacements);
      if (changes > 0) {
        fixes.push(`Updated ${path.basename(file)}: ${changes} changes`);
      }
    });
    
    return fixes;
  }

  /**
   * VALIDATION STRUCTURE
   */
  validateStructure() {
    const fixes = [];
    
    // Vérifier que tous les dossiers critiques existent
    this.config.criticalDirs.forEach(dir => {
      const dirPath = path.join(this.projectRoot, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        fixes.push(`Created missing directory: ${dir}`);
        this.state.fixed.created++;
      }
    });
    
    return fixes;
  }

  /**
   * GÉNÉRATION RAPPORT COMPLET
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      projectRoot: this.projectRoot,
      state: this.state,
      validation: this.runValidation()
    };
    
    const reportPath = path.join(this.projectRoot, 'reports', 'json', 'MASTER_AUTONOMOUS_REPORT.json');
    
    // Créer dossier si nécessaire
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    return report;
  }

  /**
   * VALIDATION HOMEY
   */
  runValidation() {
    console.log('\n✅ VALIDATION HOMEY SDK3\n');
    
    try {
      const output = execSync('homey app validate', {
        cwd: this.projectRoot,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      console.log('   ✅ Validation RÉUSSIE !');
      return { success: true, output };
    } catch (error) {
      console.log('   ❌ Validation ÉCHOUÉE');
      return { success: false, error: error.stdout || error.message };
    }
  }

  /**
   * EXÉCUTION COMPLÈTE
   */
  async run() {
    console.log(`\n📁 Projet: ${path.basename(this.projectRoot)}`);
    console.log(`📍 Racine: ${this.projectRoot}\n`);
    
    // 1. Scan complet
    const structure = this.scanProject();
    
    // 2. Analyse drivers
    const drivers = this.analyzeDrivers();
    
    // 3. Extraction références
    const references = this.extractAllReferences();
    
    // 4. Auto-fix
    const fixes = this.autoFixAll();
    
    // 5. Génération rapport
    const report = this.generateReport();
    
    // 6. Résumé
    this.showSummary(report);
    
    return report;
  }

  /**
   * AFFICHAGE RÉSUMÉ
   */
  showSummary(report) {
    console.log('\n═'.repeat(80));
    console.log('📊 RÉSUMÉ MASTER AUTONOMOUS SYSTEM');
    console.log('═'.repeat(80));
    
    console.log(`\n✅ SCAN:`);
    console.log(`   Fichiers: ${this.state.scanned.files}`);
    console.log(`   Dossiers: ${this.state.scanned.dirs}`);
    
    console.log(`\n✅ ANALYSE:`);
    console.log(`   Drivers: ${this.state.analyzed.drivers}`);
    console.log(`   Scripts: ${this.state.analyzed.scripts}`);
    console.log(`   Docs: ${this.state.analyzed.docs}`);
    
    console.log(`\n✅ CORRECTIONS:`);
    console.log(`   Renommés: ${this.state.fixed.renamed}`);
    console.log(`   Mis à jour: ${this.state.fixed.updated}`);
    console.log(`   Créés: ${this.state.fixed.created}`);
    
    if (this.state.errors.length > 0) {
      console.log(`\n⚠️  ERREURS: ${this.state.errors.length}`);
      this.state.errors.slice(0, 5).forEach(err => console.log(`   - ${err}`));
    }
    
    console.log(`\n${report.validation.success ? '✅' : '❌'} VALIDATION: ${report.validation.success ? 'PASSED' : 'FAILED'}`);
    
    console.log('\n📝 Rapport: reports/json/MASTER_AUTONOMOUS_REPORT.json');
    console.log('\n✅ MASTER AUTONOMOUS SYSTEM TERMINÉ !');
  }
}

// EXÉCUTION
(async () => {
  const system = new MasterAutonomousSystem();
  await system.run();
})();
