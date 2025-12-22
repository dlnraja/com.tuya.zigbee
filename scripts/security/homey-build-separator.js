#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 🛡️ HOMEY BUILD SEPARATOR - SÉCURITÉ APP HOMEY
 * Sépare les scripts GitHub Actions de l'app Homey pour éviter l'inclusion de fichiers sensibles
 */
class HomeyBuildSeparator {
  constructor() {
    this.projectRoot = process.cwd();
    this.homeyignorePath = path.join(this.projectRoot, '.homeyignore');
    this.gitignorePath = path.join(this.projectRoot, '.gitignore');

    // Fichiers/dossiers à exclure de l'app Homey (GitHub Actions only)
    this.githubOnlyPaths = [
      // GitHub Actions workflows
      '.github/',
      '.github/**',

      // Scripts automation/validation
      'scripts/automation/',
      'scripts/validation/',
      'scripts/security/',
      'scripts/mega-automation/',
      'scripts/setup/',

      // Reports et données temporaires
      'project-data/',
      'test-reports/',
      'backup/',
      '*-REPORT.md',
      '*-REPORT.json',

      // Build artifacts GitHub
      '*.log',
      'npm-debug.log*',
      'yarn-debug.log*',
      'yarn-error.log*',

      // Configuration sécurité
      'security-config.json',
      '.env.local',
      '.env.*.local',

      // Documentation technique
      'GITHUB-*.md',
      'YML-*.md',
      'AUTO-*.md',
      'ZERO-*.md',
      '*-SETUP*.md',

      // Fichiers temporaires
      '.DS_Store',
      'Thumbs.db',
      '*.tmp',
      '*.temp',

      // Cache et builds
      'node_modules/.cache/',
      '.cache/',
      'dist/',
      'build/',

      // Fichiers de développement
      '*.test.js',
      '*.spec.js',
      '__tests__/',
      'coverage/',

      // Outils spécifiques GitHub
      'package-lock.json',
      'yarn.lock',
      '.npmrc',
      '.yarnrc'
    ];

    // Fichiers ESSENTIELS pour l'app Homey (à ne JAMAIS exclure)
    this.homeyEssentials = [
      'app.json',
      '.homeycompose/',
      'drivers/',
      'lib/',
      'assets/',
      'locales/',
      'README.md',
      'package.json',
      'LICENSE'
    ];

    this.securityViolations = [];
    this.fixes = [];
  }

  log(message, type = 'info') {
    const icons = {
      info: '📝', success: '✅', error: '❌', warning: '⚠️',
      security: '🛡️', fix: '🔧', scan: '🔍', critical: '🚨'
    };
    console.log(`${icons[type]} ${message}`);
  }

  /**
   * Scan sécurité de la structure projet
   */
  async scanProjectStructure() {
    this.log('🔍 Scan structure projet pour séparation sécurisée...', 'scan');

    // 1. Vérifier fichiers sensibles dans racine
    await this.checkSensitiveFilesInRoot();

    // 2. Vérifier scripts dans lib/ (ne doivent pas être GitHub Actions)
    await this.checkLibScripts();

    // 3. Vérifier assets non nécessaires
    await this.checkUnnecessaryAssets();

    // 4. Vérifier configuration Homey
    await this.checkHomeyConfiguration();

    this.log(`🔍 Scan terminé: ${this.securityViolations.length} violations trouvées`, 'scan');
    return this.securityViolations;
  }

  /**
   * Vérifie fichiers sensibles en racine
   */
  async checkSensitiveFilesInRoot() {
    const rootFiles = fs.readdirSync(this.projectRoot);

    for (const file of rootFiles) {
      // Vérifier fichiers de rapport
      if (file.includes('REPORT') || file.includes('GITHUB') || file.includes('YML')) {
        this.securityViolations.push({
          type: 'sensitive_file_in_root',
          file: file,
          severity: 'medium',
          description: `Fichier sensible en racine: ${file} - doit être exclu de l'app Homey`
        });
      }

      // Vérifier fichiers config GitHub
      if (file.includes('.env') || file.includes('security-config')) {
        this.securityViolations.push({
          type: 'config_file_exposure',
          file: file,
          severity: 'high',
          description: `Fichier configuration exposé: ${file} - risque sécurité`
        });
      }
    }
  }

  /**
   * Vérifie scripts dans lib/
   */
  async checkLibScripts() {
    const libDir = path.join(this.projectRoot, 'lib');
    if (!fs.existsSync(libDir)) return;

    const checkLibRecursive = (dir) => {
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          checkLibRecursive(filePath);
        } else if (file.endsWith('.js')) {
          const content = fs.readFileSync(filePath, 'utf8');

          // Vérifier si le script contient des références GitHub Actions
          if (content.includes('github.com/repos/') ||
            content.includes('GITHUB_TOKEN') ||
            content.includes('workflow_dispatch')) {
            this.securityViolations.push({
              type: 'github_script_in_lib',
              file: path.relative(this.projectRoot, filePath),
              severity: 'high',
              description: 'Script GitHub Actions trouvé dans lib/ - doit être déplacé'
            });
          }
        }
      }
    };

    checkLibRecursive(libDir);
  }

  /**
   * Vérifie assets non nécessaires
   */
  async checkUnnecessaryAssets() {
    const assetsDir = path.join(this.projectRoot, 'assets');
    if (!fs.existsSync(assetsDir)) return;

    const checkAssets = (dir) => {
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isFile()) {
          const ext = path.extname(file).toLowerCase();
          const size = stat.size;

          // Vérifier fichiers trop volumineux
          if (size > 1024 * 1024) { // > 1MB
            this.securityViolations.push({
              type: 'large_asset_file',
              file: path.relative(this.projectRoot, filePath),
              severity: 'medium',
              size: `${(size / 1024 / 1024).toFixed(2)}MB`,
              description: 'Asset volumineux - impact sur taille app'
            });
          }

          // Vérifier formats non supportés par Homey
          const unsupportedFormats = ['.psd', '.ai', '.sketch', '.fig', '.tiff'];
          if (unsupportedFormats.includes(ext)) {
            this.securityViolations.push({
              type: 'unsupported_asset_format',
              file: path.relative(this.projectRoot, filePath),
              severity: 'low',
              format: ext,
              description: 'Format asset non supporté par Homey'
            });
          }
        } else if (stat.isDirectory()) {
          checkAssets(filePath);
        }
      }
    };

    checkAssets(assetsDir);
  }

  /**
   * Vérifie configuration Homey
   */
  async checkHomeyConfiguration() {
    // Vérifier app.json
    const appJsonPath = path.join(this.projectRoot, 'app.json');
    if (fs.existsSync(appJsonPath)) {
      const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

      // Vérifier champs sensibles
      if (appJson.env && Object.keys(appJson.env).length > 0) {
        this.securityViolations.push({
          type: 'env_vars_in_app_json',
          severity: 'high',
          description: 'Variables environnement dans app.json - risque exposition'
        });
      }

      // Vérifier permissions excessives
      if (appJson.permissions && appJson.permissions.includes('*')) {
        this.securityViolations.push({
          type: 'excessive_permissions',
          severity: 'medium',
          description: 'Permissions wildcards dans app.json - principe moindre privilège'
        });
      }
    }

    // Vérifier .homeycompose/app.json
    const composeAppJsonPath = path.join(this.projectRoot, '.homeycompose', 'app.json');
    if (fs.existsSync(composeAppJsonPath)) {
      // Même vérifications que app.json
      const content = fs.readFileSync(composeAppJsonPath, 'utf8');
      if (content.includes('"env"') || content.includes('"*"')) {
        this.securityViolations.push({
          type: 'sensitive_config_in_compose',
          severity: 'medium',
          description: 'Configuration sensible dans .homeycompose/app.json'
        });
      }
    }
  }

  /**
   * Met à jour .homeyignore avec exclusions sécurisées
   */
  async updateHomeyIgnore() {
    this.log('🛡️ Mise à jour .homeyignore pour sécurité...', 'security');

    let homeyIgnoreContent = '';

    // Lire contenu existant
    if (fs.existsSync(this.homeyignorePath)) {
      homeyIgnoreContent = fs.readFileSync(this.homeyignorePath, 'utf8');
    }

    // Header sécurité
    const securityHeader = `# 🛡️ HOMEY BUILD SECURITY - EXCLUSIONS GitHub ACTIONS
# Ces fichiers/dossiers sont EXCLUS de l'app Homey pour sécurité
# Généré automatiquement par HomeyBuildSeparator
# Ne pas modifier manuellement cette section

`;

    // Ajouter exclusions GitHub Actions
    const githubExclusions = this.githubOnlyPaths.map(p => p).join('\n');

    // Footer sécurité
    const securityFooter = `
# === FIN EXCLUSIONS SÉCURITÉ ===

`;

    // Construire nouveau contenu
    const newContent = securityHeader + githubExclusions + securityFooter;

    // Nettoyer ancien contenu automatique
    const cleanedContent = homeyIgnoreContent.replace(
      /# 🛡️ HOMEY BUILD SECURITY[\s\S]*?# === FIN EXCLUSIONS SÉCURITÉ ===/g,
      ''
    );

    // Combiner
    const finalContent = newContent + cleanedContent.trim();

    // Écrire fichier
    fs.writeFileSync(this.homeyignorePath, finalContent);

    this.log(`🛡️ .homeyignore mis à jour: ${this.githubOnlyPaths.length} exclusions`, 'security');

    this.fixes.push({
      type: 'homeyignore_updated',
      action: 'security_exclusions_added',
      count: this.githubOnlyPaths.length,
      description: 'Exclusions sécurité ajoutées à .homeyignore'
    });
  }

  /**
   * Valide structure après séparation
   */
  async validateHomeyBuild() {
    this.log('🔍 Validation structure Homey build...', 'scan');

    const issues = [];

    // 1. Vérifier que les essentiels sont présents
    for (const essential of this.homeyEssentials) {
      const essentialPath = path.join(this.projectRoot, essential);
      if (!fs.existsSync(essentialPath)) {
        issues.push({
          type: 'missing_essential',
          file: essential,
          severity: 'critical',
          description: `Fichier essentiel manquant: ${essential}`
        });
      }
    }

    // 2. Simuler ce qui serait inclus dans build Homey
    const simulatedBuild = this.simulateHomeyBuild();

    // 3. Vérifier qu'aucun fichier GitHub Actions n'est inclus
    for (const includedFile of simulatedBuild.includedFiles) {
      for (const githubPath of this.githubOnlyPaths) {
        if (includedFile.includes(githubPath.replace('**', '')) ||
          includedFile.includes(githubPath.replace('/', ''))) {
          issues.push({
            type: 'github_file_in_build',
            file: includedFile,
            severity: 'high',
            description: `Fichier GitHub Actions inclus dans build: ${includedFile}`
          });
        }
      }
    }

    this.log(`🔍 Validation terminée: ${issues.length} problèmes trouvés`, 'scan');
    return issues;
  }

  /**
   * Simule build Homey pour validation
   */
  simulateHomeyBuild() {
    const includedFiles = [];
    const excludedFiles = [];

    // Lire .homeyignore
    let homeyIgnoreRules = [];
    if (fs.existsSync(this.homeyignorePath)) {
      homeyIgnoreRules = fs.readFileSync(this.homeyignorePath, 'utf8')
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .map(line => line.trim());
    }

    // Scanner récursivement le projet
    const scanDirectory = (dir) => {
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const relativePath = path.relative(this.projectRoot, filePath);
        const stat = fs.statSync(filePath);

        // Vérifier si exclu par .homeyignore
        const isExcluded = homeyIgnoreRules.some(rule => {
          if (rule.includes('**')) {
            return relativePath.includes(rule.replace('**', '').replace('/', ''));
          }
          return relativePath.startsWith(rule) || relativePath === rule;
        });

        if (isExcluded) {
          excludedFiles.push(relativePath);
        } else if (stat.isFile()) {
          includedFiles.push(relativePath);
        } else if (stat.isDirectory() && file !== '.git' && file !== 'node_modules') {
          scanDirectory(filePath);
        }
      }
    };

    scanDirectory(this.projectRoot);

    return { includedFiles, excludedFiles };
  }

  /**
   * Génère rapport de séparation
   */
  generateSeparationReport() {
    const buildSim = this.simulateHomeyBuild();

    const report = {
      timestamp: new Date().toISOString(),
      separation_summary: {
        github_paths_excluded: this.githubOnlyPaths.length,
        security_violations: this.securityViolations.length,
        fixes_applied: this.fixes.length,
        files_in_homey_build: buildSim.includedFiles.length,
        files_excluded_from_build: buildSim.excludedFiles.length
      },
      security_violations: this.securityViolations,
      applied_fixes: this.fixes,
      homey_build_simulation: buildSim,
      excluded_paths: this.githubOnlyPaths,
      essential_files: this.homeyEssentials.filter(file =>
        fs.existsSync(path.join(this.projectRoot, file))
      )
    };

    const reportPath = path.join(this.projectRoot, 'project-data', 'HOMEY_BUILD_SEPARATION_REPORT.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return report;
  }

  /**
   * Exécution principale
   */
  async run() {
    this.log('🚀 DÉMARRAGE SÉPARATION SÉCURISÉE HOMEY BUILD...', 'security');

    try {
      // 1. Scan structure projet
      await this.scanProjectStructure();

      // 2. Mise à jour .homeyignore
      await this.updateHomeyIgnore();

      // 3. Validation build simulé
      const buildIssues = await this.validateHomeyBuild();

      // 4. Génération rapport
      const report = this.generateSeparationReport();

      // 5. Résumé final
      this.log('📋 === RÉSUMÉ SÉPARATION HOMEY BUILD ===', 'success');
      this.log(`🛡️ Exclusions GitHub: ${this.githubOnlyPaths.length}`, 'security');
      this.log(`🚨 Violations sécurité: ${this.securityViolations.length}`, 'warning');
      this.log(`🔧 Corrections appliquées: ${this.fixes.length}`, 'success');
      this.log(`📦 Fichiers dans build: ${report.separation_summary.files_in_homey_build}`, 'success');
      this.log(`🚫 Fichiers exclus: ${report.separation_summary.files_excluded_from_build}`, 'success');
      this.log(`📄 Rapport: project-data/HOMEY_BUILD_SEPARATION_REPORT.json`, 'success');

      return {
        violations: this.securityViolations.length,
        buildIssues: buildIssues.length,
        filesInBuild: report.separation_summary.files_in_homey_build,
        success: buildIssues.length === 0
      };

    } catch (error) {
      this.log(`❌ Erreur séparation build: ${error.message}`, 'error');
      throw error;
    }
  }
}

// Exécution si script appelé directement
if (require.main === module) {
  const separator = new HomeyBuildSeparator();
  separator.run().catch(console.error);
}

module.exports = HomeyBuildSeparator;
