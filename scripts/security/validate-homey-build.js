#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 🔍 HOMEY BUILD VALIDATOR - Validation finale du build Homey
 * Vérifie que SEULS les fichiers nécessaires sont inclus dans l'app Homey
 */
class HomeyBuildValidator {
  constructor() {
    this.projectRoot = process.cwd();
    this.requiredFiles = new Set();
    this.allowedFiles = new Set();
    this.forbiddenFiles = new Set();
    this.warnings = [];
    this.errors = [];
  }

  log(message, type = 'info') {
    const icons = {
      info: '📝', success: '✅', error: '❌', warning: '⚠️',
      security: '🔒', scan: '🔍', build: '🏗️'
    };
    console.log(`${icons[type]} ${message}`);
  }

  /**
   * Définit les fichiers REQUIS pour une app Homey fonctionnelle
   */
  defineRequiredFiles() {
    this.log('🔍 Définition des fichiers requis...', 'scan');

    const required = [
      'app.json',
      'package.json',
      '.homeyignore'
    ];

    // Drivers requis
    const driversDir = path.join(this.projectRoot, 'drivers');
    if (fs.existsSync(driversDir)) {
      const drivers = fs.readdirSync(driversDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const driver of drivers) {
        required.push(`drivers/${driver}/driver.compose.json`);
        required.push(`drivers/${driver}/device.js`);
        // Images requises
        required.push(`drivers/${driver}/assets/images/small.png`);
        required.push(`drivers/${driver}/assets/images/large.png`);
      }
    }

    // Librairie requis si exist
    const libDir = path.join(this.projectRoot, 'lib');
    if (fs.existsSync(libDir)) {
      required.push('lib/');
    }

    // Assets app si existent
    const assetsDir = path.join(this.projectRoot, 'assets');
    if (fs.existsSync(assetsDir)) {
      required.push('assets/images/small.png');
      required.push('assets/images/large.png');
    }

    required.forEach(file => this.requiredFiles.add(file));
    this.log(`📋 ${this.requiredFiles.size} fichiers requis définis`, 'build');
  }

  /**
   * Définit les fichiers INTERDITS dans le build Homey
   */
  defineForbiddenFiles() {
    this.log('🔍 Définition des fichiers interdits...', 'scan');

    const forbidden = [
      // GitHub & CI/CD (CRITIQUE)
      '.github/',
      '.githooks/',
      '.git/',

      // Scripts développement (CRITIQUE)
      'scripts/',
      'project-data/',
      'docs/',
      'references/',
      'backup/',

      // Cache et dépendances (CRITIQUE)
      'node_modules/',
      '.npm/',
      '.nyc_output/',

      // Build temporaires
      '.homeybuild/',
      'build/',
      'dist/',
      'out/',
      'target/',

      // IDE
      '.vscode/',
      '.idea/',
      '.vs/',

      // Tests
      'test/',
      'tests/',
      'spec/',

      // Config développement
      '.env',
      'config.local.js',
      'secrets.json',

      // Scripts système
      '.ps1',
      '.cmd',
      '.bat',

      // Logs et temporaires
      '.log',
      '.tmp',
      '.bak',
      '.old'
    ];

    forbidden.forEach(pattern => this.forbiddenFiles.add(pattern));
    this.log(`🚫 ${this.forbiddenFiles.size} patterns interdits définis`, 'security');
  }

  /**
   * Simule le processus de build Homey en respectant .homeyignore
   */
  simulateHomeyBuild() {
    this.log('🏗️ Simulation build Homey...', 'build');

    const buildInclusions = [];
    const buildExclusions = [];

    // Lecture .homeyignore
    const homeyignorePath = path.join(this.projectRoot, '.homeyignore');
    let ignorePatterns = [];

    if (fs.existsSync(homeyignorePath)) {
      const content = fs.readFileSync(homeyignorePath, 'utf8');
      ignorePatterns = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
    }

    // Scan récursif avec .homeyignore
    const scanDirectory = (dir, relativePath = '') => {
      const items = fs.readdirSync(dir, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        const relativeFilePath = path.join(relativePath, item.name).replace(/\\/g, '/');

        // Test exclusion par .homeyignore
        const isIgnored = this.shouldIgnore(relativeFilePath, ignorePatterns);

        if (isIgnored) {
          buildExclusions.push(relativeFilePath);
        } else {
          if (item.isFile()) {
            buildInclusions.push(relativeFilePath);
          } else if (item.isDirectory()) {
            try {
              scanDirectory(fullPath, relativeFilePath);
            } catch (error) {
              // Ignore access errors
            }
          }
        }
      }
    };

    scanDirectory(this.projectRoot);

    this.log(`📊 Simulation terminée: ${buildInclusions.length} inclus, ${buildExclusions.length} exclus`, 'build');

    return { buildInclusions, buildExclusions };
  }

  /**
   * Vérifie si un fichier doit être ignoré selon .homeyignore
   */
  shouldIgnore(filePath, patterns) {
    for (const pattern of patterns) {
      if (this.matchesIgnorePattern(filePath, pattern)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Correspondance pattern .homeyignore (glob style)
   */
  matchesIgnorePattern(filePath, pattern) {
    // Patterns de base pour .homeyignore
    if (pattern.endsWith('/')) {
      // Directory pattern
      return filePath.startsWith(pattern.slice(0, -1)) ||
        filePath === pattern.slice(0, -1);
    } else if (pattern.includes('**')) {
      // Recursive glob
      const regex = pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*');
      return new RegExp('^' + regex + '$').test(filePath) ||
        new RegExp('^' + regex + '/').test(filePath);
    } else if (pattern.includes('*')) {
      // Simple glob
      const regex = pattern.replace(/\*/g, '[^/]*');
      return new RegExp('^' + regex + '$').test(filePath);
    } else {
      // Exact match
      return filePath === pattern || filePath.startsWith(pattern + '/');
    }
  }

  /**
   * Valide les fichiers requis sont présents
   */
  validateRequiredFiles(buildInclusions) {
    this.log('✅ Validation fichiers requis...', 'success');

    let missingRequired = [];

    for (const required of this.requiredFiles) {
      const found = buildInclusions.some(file =>
        file === required || file.startsWith(required)
      );

      if (!found) {
        missingRequired.push(required);
        this.errors.push(`MANQUANT REQUIS: ${required}`);
      }
    }

    if (missingRequired.length > 0) {
      this.log(`❌ ${missingRequired.length} fichiers requis manquants`, 'error');
      missingRequired.forEach(file =>
        this.log(`  - ${file}`, 'error')
      );
    } else {
      this.log('✅ Tous les fichiers requis sont présents', 'success');
    }

    return missingRequired;
  }

  /**
   * Valide qu'aucun fichier interdit n'est présent
   */
  validateForbiddenFiles(buildInclusions) {
    this.log('🔒 Validation fichiers interdits...', 'security');

    let foundForbidden = [];

    for (const file of buildInclusions) {
      for (const forbidden of this.forbiddenFiles) {
        if (this.matchesIgnorePattern(file, forbidden)) {
          foundForbidden.push(file);
          this.errors.push(`INTERDIT PRÉSENT: ${file}`);
          break;
        }
      }
    }

    if (foundForbidden.length > 0) {
      this.log(`❌ ${foundForbidden.length} fichiers interdits trouvés`, 'error');
      foundForbidden.slice(0, 10).forEach(file =>
        this.log(`  - ${file}`, 'error')
      );
      if (foundForbidden.length > 10) {
        this.log(`  ... et ${foundForbidden.length - 10} autres`, 'error');
      }
    } else {
      this.log('✅ Aucun fichier interdit détecté', 'success');
    }

    return foundForbidden;
  }

  /**
   * Analyse de la qualité du build
   */
  analyzeBuildQuality(buildInclusions, buildExclusions) {
    this.log('📊 Analyse qualité du build...', 'scan');

    const totalFiles = buildInclusions.length + buildExclusions.length;
    const exclusionRate = Math.round((buildExclusions.length / totalFiles) * 100);

    // Catégorisation des fichiers inclus
    const categories = {
      drivers: buildInclusions.filter(f => f.startsWith('drivers/')).length,
      lib: buildInclusions.filter(f => f.startsWith('lib/')).length,
      assets: buildInclusions.filter(f => f.startsWith('assets/')).length,
      root: buildInclusions.filter(f => !f.includes('/')).length,
      nodeModules: buildInclusions.filter(f => f.includes('node_modules')).length,
      github: buildInclusions.filter(f => f.startsWith('.github/')).length,
      scripts: buildInclusions.filter(f => f.startsWith('scripts/')).length,
      other: 0
    };

    categories.other = buildInclusions.length - Object.values(categories).reduce((a, b) => a + b, 0) + categories.other;

    const quality = {
      totalFiles,
      included: buildInclusions.length,
      excluded: buildExclusions.length,
      exclusionRate,
      categories,
      score: this.calculateQualityScore(categories, buildInclusions.length)
    };

    this.log(`📈 Taux exclusion: ${exclusionRate}%`, 'scan');
    this.log(`📱 Fichiers dans app: ${buildInclusions.length}`, 'build');
    this.log(`🎯 Score qualité: ${quality.score}/100`, quality.score >= 80 ? 'success' : quality.score >= 60 ? 'warning' : 'error');

    return quality;
  }

  /**
   * Calcule score qualité du build
   */
  calculateQualityScore(categories, totalIncluded) {
    let score = 100;

    // Pénalités pour fichiers problématiques
    if (categories.github > 0) score -= 30; // CRITIQUE: fichiers GitHub
    if (categories.scripts > 0) score -= 25; // CRITIQUE: scripts dev
    if (categories.nodeModules > 0) score -= 20; // Grave: node_modules

    // Bonus pour fichiers essentiels
    if (categories.drivers > 0) score += 10;
    if (categories.lib > 0) score += 5;

    // Pénalité pour trop de fichiers
    if (totalIncluded > 1000) score -= 20;
    else if (totalIncluded > 500) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Génère rapport final de validation
   */
  generateValidationReport(quality, missingRequired, foundForbidden) {
    const reportPath = path.join(this.projectRoot, 'project-data', 'HOMEY_BUILD_VALIDATION_REPORT.json');

    const report = {
      timestamp: new Date().toISOString(),
      validation_status: this.errors.length === 0 ? 'PASSED' : 'FAILED',
      quality_score: quality.score,
      build_statistics: quality,
      validation_results: {
        required_files_missing: missingRequired,
        forbidden_files_found: foundForbidden,
        errors: this.errors,
        warnings: this.warnings
      },
      recommendations: this.generateRecommendations(quality, missingRequired, foundForbidden)
    };

    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    this.log(`📄 Rapport: project-data/HOMEY_BUILD_VALIDATION_REPORT.json`, 'success');
    return report;
  }

  /**
   * Génère recommandations
   */
  generateRecommendations(quality, missingRequired, foundForbidden) {
    const recommendations = [];

    if (quality.score >= 90) {
      recommendations.push('🎉 EXCELLENT: Build Homey optimal!');
    } else if (quality.score >= 70) {
      recommendations.push('✅ BON: Build acceptable avec optimisations mineures');
    } else if (quality.score >= 50) {
      recommendations.push('⚠️ MOYEN: Optimisations importantes nécessaires');
    } else {
      recommendations.push('❌ CRITIQUE: Build non-acceptable, corrections majeures requises');
    }

    if (foundForbidden.length > 0) {
      recommendations.push('🔒 SÉCURITÉ: Améliorer .homeyignore pour exclure fichiers sensibles');
    }

    if (missingRequired.length > 0) {
      recommendations.push('📋 INTÉGRITÉ: Vérifier structure projet - fichiers requis manquants');
    }

    if (quality.included > 1000) {
      recommendations.push('⚡ PERFORMANCE: Réduire nombre de fichiers (>1000 inclus)');
    }

    if (quality.categories.nodeModules > 0) {
      recommendations.push('🗂️ NETTOYAGE: Exclure node_modules du build');
    }

    recommendations.push('🧪 TEST: Tester app après validation sur Homey réel');
    recommendations.push('🚀 DÉPLOIEMENT: Prêt pour publication si score >80');

    return recommendations;
  }

  /**
   * Exécution principale
   */
  async run() {
    this.log('🔍 DÉMARRAGE VALIDATION BUILD HOMEY...', 'build');

    try {
      // 1. Définition des règles
      this.defineRequiredFiles();
      this.defineForbiddenFiles();

      // 2. Simulation build
      const { buildInclusions, buildExclusions } = this.simulateHomeyBuild();

      // 3. Validations
      const missingRequired = this.validateRequiredFiles(buildInclusions);
      const foundForbidden = this.validateForbiddenFiles(buildInclusions);

      // 4. Analyse qualité
      const quality = this.analyzeBuildQuality(buildInclusions, buildExclusions);

      // 5. Rapport final
      const report = this.generateValidationReport(quality, missingRequired, foundForbidden);

      // Résumé final
      this.log('📋 === RÉSUMÉ VALIDATION BUILD HOMEY ===', 'success');
      this.log(`🎯 Statut: ${report.validation_status}`, report.validation_status === 'PASSED' ? 'success' : 'error');
      this.log(`📊 Score qualité: ${quality.score}/100`, quality.score >= 80 ? 'success' : 'warning');
      this.log(`📱 Fichiers app: ${buildInclusions.length}`, 'build');
      this.log(`🚫 Fichiers exclus: ${buildExclusions.length}`, 'security');
      this.log(`❌ Erreurs: ${this.errors.length}`, this.errors.length === 0 ? 'success' : 'error');
      this.log(`⚠️ Avertissements: ${this.warnings.length}`, 'warning');

      return {
        success: report.validation_status === 'PASSED',
        score: quality.score,
        errors: this.errors.length,
        warnings: this.warnings.length,
        filesIncluded: buildInclusions.length,
        filesExcluded: buildExclusions.length
      };

    } catch (error) {
      this.log(`❌ Erreur validation: ${error.message}`, 'error');
      throw error;
    }
  }
}

// Exécution si script appelé directement
if (require.main === module) {
  const validator = new HomeyBuildValidator();
  validator.run().catch(console.error);
}

module.exports = HomeyBuildValidator;
