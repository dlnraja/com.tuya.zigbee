#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 🛡️ OPTIMIZE HOMEYIGNORE - Réduction intelligente des fichiers dans le build Homey
 * Analyse et optimise les exclusions pour éliminer les 4445+ fichiers inutiles
 */
class OptimizeHomeyIgnore {
  constructor() {
    this.projectRoot = process.cwd();
    this.homeyignorePath = path.join(this.projectRoot, '.homeyignore');
    this.exclusions = new Set();
    this.filesScanned = 0;
    this.filesExcluded = 0;
  }

  log(message, type = 'info') {
    const icons = {
      info: '📝', success: '✅', error: '❌', warning: '⚠️',
      security: '🔒', scan: '🔍', optimize: '🛡️'
    };
    console.log(`${icons[type]} ${message}`);
  }

  /**
   * Analyse intelligente des fichiers à exclure
   */
  analyzeProjectFiles() {
    this.log('🔍 Analyse intelligente des fichiers projet...', 'scan');

    const exclusionPatterns = [
      // GitHub & CI/CD (priorité haute)
      '.github/**',
      '.githooks/**',
      '.git/**',

      // Scripts développement (priorité haute)
      'scripts/**',
      'project-data/**',
      'docs/**',
      'references/**',
      'backup/**',
      'temp/**',
      'tmp/**',

      // Cache et logs (priorité haute)
      'node_modules/**',
      '*.log',
      '*.tmp',
      'npm-debug.log*',
      '.npm/**',
      '.nyc_output/**',

      // IDE et éditeurs (priorité moyenne)
      '.vscode/**',
      '.idea/**',
      '*.sublime-*',
      '.vs/**',

      // Tests et développement (priorité moyenne)
      'test/**',
      'tests/**',
      'spec/**',
      '*.test.js',
      '*.spec.js',
      'jest.config.js',
      'karma.conf.js',

      // Build et distribution (priorité moyenne)
      'build/**',
      'dist/**',
      'out/**',
      'target/**',

      // Archives et backups (priorité basse)
      '*.zip',
      '*.tar.gz',
      '*.rar',
      '*.7z',
      'backup-*',

      // OS spécifiques (priorité basse)
      '.DS_Store',
      'Thumbs.db',
      'desktop.ini',

      // Configuration développement (priorité haute)
      '.env',
      '.env.*',
      'config.local.js',
      'secrets.json',

      // Documentation développement (priorité basse)
      'README.dev.md',
      'CONTRIBUTING.md',
      'CHANGELOG.dev.md',
      'TODO.md',

      // Fichiers temporaires script (priorité haute)
      '*.bak',
      '*.old',
      '*.orig',
      '*~',
      '*.swp',
      '*.swo'
    ];

    exclusionPatterns.forEach(pattern => {
      this.exclusions.add(pattern);
    });

    this.log(`🛡️ ${this.exclusions.size} patterns d'exclusion intelligents définis`, 'optimize');
    return this.exclusions;
  }

  /**
   * Analyse spécifique des scripts et outils développement
   */
  analyzeDevScripts() {
    this.log('🔍 Analyse spécifique scripts développement...', 'scan');

    const devExclusions = [
      // Scripts sécurité (ne doivent pas être dans l'app)
      'scripts/security/**',
      'scripts/validation/**',
      'scripts/community/**',
      'scripts/automation/**',
      'scripts/diagnostic/**',
      'scripts/fixes/**',
      'scripts/organized/**',

      // Outils PowerShell développement
      '*.ps1',
      '*.cmd',
      '*.bat',

      // Configuration développement
      'eslint.config.js',
      '.eslintrc.*',
      '.prettierrc.*',
      'babel.config.js',
      'webpack.config.js',
      'rollup.config.js',
      'vite.config.js',

      // Fichiers de reporting
      'project-data/*.json',
      'project-data/*.md',
      'reports/**',
      'logs/**'
    ];

    devExclusions.forEach(pattern => {
      this.exclusions.add(pattern);
    });

    this.log(`🛡️ ${devExclusions.length} patterns développement ajoutés`, 'optimize');
  }

  /**
   * Génère le nouveau .homeyignore optimisé
   */
  generateOptimizedHomeyIgnore() {
    this.log('🛡️ Génération .homeyignore optimisé...', 'optimize');

    const currentContent = fs.existsSync(this.homeyignorePath)
      ? fs.readFileSync(this.homeyignorePath, 'utf8')
      : '';

    const optimizedContent = `# 🛡️ HOMEYIGNORE OPTIMISÉ - Version sécurisée et intelligente
# Généré automatiquement - NE PAS ÉDITER MANUELLEMENT
# Script: optimize-homeyignore.js
# Date: ${new Date().toISOString()}

# === SÉCURITÉ CRITIQUE ===
# GitHub Actions et workflows (CRITIQUE - ne jamais inclure dans l'app)
.github/
.githooks/
.git/

# Scripts développement et sécurité (CRITIQUE)
scripts/
project-data/
docs/
references/
backup/

# === OPTIMISATION BUILD ===
# Cache et dépendances
node_modules/
.npm/
.nyc_output/
*.log
*.tmp
npm-debug.log*

# IDE et éditeurs
.vscode/
.idea/
*.sublime-*
.vs/

# Tests et développement
test/
tests/
spec/
*.test.js
*.spec.js
jest.config.js
karma.conf.js

# Build et distribution
build/
dist/
out/
target/

# === FICHIERS TEMPORAIRES ===
# Archives
*.zip
*.tar.gz
*.rar
*.7z
backup-*

# OS spécifiques
.DS_Store
Thumbs.db
desktop.ini

# Configuration développement
.env
.env.*
config.local.js
secrets.json

# Documentation développement
README.dev.md
CONTRIBUTING.md
CHANGELOG.dev.md
TODO.md

# Scripts système
*.ps1
*.cmd
*.bat

# Configuration linting/formatting
eslint.config.js
.eslintrc.*
.prettierrc.*
babel.config.js
webpack.config.js
rollup.config.js
vite.config.js

# Fichiers temporaires
*.bak
*.old
*.orig
*~
*.swp
*.swo
temp/
tmp/

# Logs et reporting
reports/
logs/
`;

    fs.writeFileSync(this.homeyignorePath, optimizedContent);
    this.log(`✅ .homeyignore optimisé généré (${optimizedContent.split('\n').length} lignes)`, 'success');

    return optimizedContent;
  }

  /**
   * Valide l'efficacité de l'optimisation
   */
  validateOptimization() {
    this.log('🔍 Validation efficacité optimisation...', 'scan');

    const excludedFiles = [];
    const includedFiles = [];

    // Simulation scan des fichiers
    const scanDirectory = (dir) => {
      const items = fs.readdirSync(dir, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        const relativePath = path.relative(this.projectRoot, fullPath);

        this.filesScanned++;

        if (this.shouldExclude(relativePath)) {
          excludedFiles.push(relativePath);
          this.filesExcluded++;
        } else if (item.isFile()) {
          includedFiles.push(relativePath);
        }

        if (item.isDirectory() && !this.shouldExclude(relativePath)) {
          try {
            scanDirectory(fullPath);
          } catch (error) {
            // Ignore erreurs d'accès
          }
        }
      }
    };

    try {
      scanDirectory(this.projectRoot);
    } catch (error) {
      this.log(`⚠️ Erreur scan: ${error.message}`, 'warning');
    }

    const optimizationReport = {
      filesScanned: this.filesScanned,
      filesExcluded: this.filesExcluded,
      filesIncluded: includedFiles.length,
      exclusionRate: Math.round((this.filesExcluded / this.filesScanned) * 100),
      topExcludedDirs: this.getTopExcludedDirectories(excludedFiles),
      criticalInclusions: this.getCriticalInclusions(includedFiles)
    };

    this.log(`📊 Fichiers scannés: ${optimizationReport.filesScanned}`, 'scan');
    this.log(`🚫 Fichiers exclus: ${optimizationReport.filesExcluded}`, 'optimize');
    this.log(`✅ Fichiers inclus: ${optimizationReport.filesIncluded}`, 'success');
    this.log(`📈 Taux d'exclusion: ${optimizationReport.exclusionRate}%`, 'optimize');

    return optimizationReport;
  }

  /**
   * Vérifie si un fichier doit être exclu
   */
  shouldExclude(filePath) {
    for (const pattern of this.exclusions) {
      if (this.matchesPattern(filePath, pattern)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Correspondance pattern simple
   */
  matchesPattern(filePath, pattern) {
    // Conversion pattern glob simple
    const regex = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.');

    return new RegExp('^' + regex + '$').test(filePath) ||
      new RegExp('^' + regex).test(filePath);
  }

  /**
   * Analyse des répertoires les plus exclus
   */
  getTopExcludedDirectories(excludedFiles) {
    const dirCounts = new Map();

    excludedFiles.forEach(file => {
      const dir = path.dirname(file);
      const topDir = dir.split(path.sep)[0];
      dirCounts.set(topDir, (dirCounts.get(topDir) || 0) + 1);
    });

    return Array.from(dirCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }

  /**
   * Identifie les inclusions critiques
   */
  getCriticalInclusions(includedFiles) {
    const critical = [];
    const criticalPatterns = [
      /app\.json$/,
      /package\.json$/,
      /drivers\/.*\/driver\.compose\.json$/,
      /lib\/.*\.js$/,
      /assets\/.*\.(png|jpg|svg)$/
    ];

    includedFiles.forEach(file => {
      if (criticalPatterns.some(pattern => pattern.test(file))) {
        critical.push(file);
      }
    });

    return critical.slice(0, 20); // Top 20 inclusions critiques
  }

  /**
   * Génère rapport d'optimisation
   */
  generateOptimizationReport(report) {
    const reportPath = path.join(this.projectRoot, 'project-data', 'HOMEYIGNORE_OPTIMIZATION_REPORT.json');

    const fullReport = {
      timestamp: new Date().toISOString(),
      optimization_summary: report,
      exclusion_patterns: Array.from(this.exclusions),
      recommendations: this.generateRecommendations(report)
    };

    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(fullReport, null, 2));

    this.log(`📄 Rapport: project-data/HOMEYIGNORE_OPTIMIZATION_REPORT.json`, 'success');
    return fullReport;
  }

  /**
   * Génère recommandations
   */
  generateRecommendations(report) {
    const recommendations = [];

    if (report.exclusionRate > 80) {
      recommendations.push('✅ Excellent: Taux d\'exclusion optimal (>80%)');
    } else if (report.exclusionRate > 60) {
      recommendations.push('⚠️ Bon: Taux d\'exclusion correct, amélioration possible');
    } else {
      recommendations.push('❌ Attention: Taux d\'exclusion faible (<60%), review nécessaire');
    }

    if (report.filesIncluded < 500) {
      recommendations.push('✅ Build léger: Moins de 500 fichiers dans l\'app');
    } else if (report.filesIncluded < 1000) {
      recommendations.push('⚠️ Build modéré: Considérer optimisations supplémentaires');
    } else {
      recommendations.push('❌ Build lourd: Plus de 1000 fichiers, optimisation critique');
    }

    recommendations.push('🔍 Vérifier que drivers/ et lib/ sont bien inclus');
    recommendations.push('🛡️ Confirmer que scripts/ et .github/ sont exclus');
    recommendations.push('📱 Tester l\'app après optimisation');

    return recommendations;
  }

  /**
   * Exécution principale
   */
  async run() {
    this.log('🛡️ DÉMARRAGE OPTIMISATION HOMEYIGNORE...', 'optimize');

    try {
      // 1. Analyse patterns exclusion
      this.analyzeProjectFiles();
      this.analyzeDevScripts();

      // 2. Génération .homeyignore optimisé
      const optimizedContent = this.generateOptimizedHomeyIgnore();

      // 3. Validation efficacité
      const report = this.validateOptimization();

      // 4. Génération rapport
      const fullReport = this.generateOptimizationReport(report);

      // Résumé final
      this.log('📋 === RÉSUMÉ OPTIMISATION HOMEYIGNORE ===', 'success');
      this.log(`🛡️ Patterns exclusion: ${this.exclusions.size}`, 'optimize');
      this.log(`📊 Fichiers scannés: ${report.filesScanned}`, 'scan');
      this.log(`🚫 Fichiers exclus: ${report.filesExcluded}`, 'optimize');
      this.log(`✅ Fichiers inclus: ${report.filesIncluded}`, 'success');
      this.log(`📈 Efficacité: ${report.exclusionRate}%`, 'optimize');
      this.log(`📄 Rapport: project-data/HOMEYIGNORE_OPTIMIZATION_REPORT.json`, 'success');

      return {
        success: true,
        exclusions: this.exclusions.size,
        filesExcluded: report.filesExcluded,
        filesIncluded: report.filesIncluded,
        optimizationRate: report.exclusionRate
      };

    } catch (error) {
      this.log(`❌ Erreur optimisation: ${error.message}`, 'error');
      throw error;
    }
  }
}

// Exécution si script appelé directement
if (require.main === module) {
  const optimizer = new OptimizeHomeyIgnore();
  optimizer.run().catch(console.error);
}

module.exports = OptimizeHomeyIgnore;
