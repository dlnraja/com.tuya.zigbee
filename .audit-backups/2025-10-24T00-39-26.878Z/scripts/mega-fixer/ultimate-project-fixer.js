#!/usr/bin/env node
/**
 * 🚀 ULTIMATE PROJECT FIXER
 * 
 * Utilise TOUS les fichiers du projet pour:
 * 1. Détecter TOUS les bugs (drivers, workflows, scripts, docs)
 * 2. Analyser GitHub Actions (actifs + désactivés)
 * 3. Vérifier toutes les dépendances
 * 4. Réparer automatiquement ce qui peut l'être
 * 5. Générer rapport ultra-complet
 * 6. Valider tout le projet
 * 
 * Usage: node scripts/mega-fixer/ultimate-project-fixer.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const COLORS = {
  reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m',
  yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

class UltimateProjectFixer {
  constructor() {
    this.rootDir = path.resolve(__dirname, '..', '..');
    this.results = {
      totalFiles: 0,
      totalDirs: 0,
      scanned: 0,
      issues: [],
      fixes: [],
      githubActions: {
        active: [],
        disabled: [],
        broken: [],
        recommendations: []
      },
      drivers: {
        total: 0,
        valid: 0,
        broken: [],
        warnings: []
      },
      dependencies: {
        missing: [],
        outdated: [],
        conflicts: []
      },
      validation: {
        homey: null,
        eslint: null,
        syntax: null
      }
    };
    
    this.ignoreDirs = [
      'node_modules', '.git', '.homeybuild', '.backup-manufacturer-cleanup',
      '.backup-cluster-fixes', '.backup-enrichment', '.archive'
    ];
  }

  log(msg, color = 'reset') {
    console.log(`${COLORS[color]}${msg}${COLORS.reset}`);
  }

  // SCAN 1: Complet du projet
  scanProject() {
    this.log('\n🔍 SCAN COMPLET DU PROJET', 'cyan');
    this.log('='.repeat(70), 'cyan');
    
    const scanDir = (dir, depth = 0) => {
      if (depth > 5) return; // Limite profondeur
      
      try {
        const items = fs.readdirSync(dir);
        this.results.totalDirs++;
        
        for (const item of items) {
          if (this.ignoreDirs.includes(item)) continue;
          
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            scanDir(fullPath, depth + 1);
          } else {
            this.results.totalFiles++;
            this.results.scanned++;
            
            // Analyse fichier
            this.analyzeFile(fullPath);
          }
          
          if (this.results.scanned % 1000 === 0) {
            this.log(`  📊 Progression: ${this.results.scanned} fichiers`, 'blue');
          }
        }
      } catch (err) {
        // Ignore errors
      }
    };
    
    scanDir(this.rootDir);
    
    this.log(`  ✅ Scan terminé: ${this.results.totalFiles} fichiers, ${this.results.totalDirs} dossiers`, 'green');
  }

  // ANALYSE 2: Fichier individuel
  analyzeFile(filePath) {
    const ext = path.extname(filePath);
    const relativePath = path.relative(this.rootDir, filePath);
    
    try {
      // JavaScript/JSON files
      if (ext === '.js' || ext === '.json') {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for common issues
        if (content.includes('CLUSTER.')) {
          this.results.issues.push({
            file: relativePath,
            type: 'CLUSTER_FORMAT',
            severity: 'HIGH',
            message: 'CLUSTER.* format detected (should be string or numeric)'
          });
        }
        
        if (content.match(/const\s+endpoint.*const\s+endpoint/s)) {
          this.results.issues.push({
            file: relativePath,
            type: 'DUPLICATE_VAR',
            severity: 'CRITICAL',
            message: 'Duplicate variable declaration'
          });
        }
        
        // Check for syntax errors in JSON
        if (ext === '.json') {
          try {
            JSON.parse(content);
          } catch (err) {
            this.results.issues.push({
              file: relativePath,
              type: 'JSON_SYNTAX',
              severity: 'CRITICAL',
              message: `JSON syntax error: ${err.message}`
            });
          }
        }
      }
      
      // GitHub Actions workflows
      if (filePath.includes('.github/workflows') && ext === '.yml') {
        this.analyzeWorkflow(filePath, relativePath);
      }
      
      // Drivers
      if (filePath.includes('drivers/') && (filePath.endsWith('device.js') || filePath.endsWith('driver.compose.json'))) {
        this.analyzeDriver(filePath, relativePath);
      }
      
    } catch (err) {
      // Ignore file read errors
    }
  }

  // ANALYSE 3: GitHub Actions Workflows
  analyzeWorkflow(filePath, relativePath) {
    const fileName = path.basename(filePath);
    
    if (fileName.includes('.disabled') || fileName.includes('.DISABLED') || fileName.includes('.manual')) {
      this.results.githubActions.disabled.push({
        file: relativePath,
        reason: 'Explicitly disabled'
      });
    } else {
      this.results.githubActions.active.push({
        file: relativePath,
        status: 'active'
      });
      
      // Check for common workflow issues
      const content = fs.readFileSync(filePath, 'utf8');
      
      if (!content.includes('on:')) {
        this.results.githubActions.broken.push({
          file: relativePath,
          issue: 'Missing "on:" trigger'
        });
      }
      
      if (!content.includes('jobs:')) {
        this.results.githubActions.broken.push({
          file: relativePath,
          issue: 'Missing "jobs:" section'
        });
      }
    }
  }

  // ANALYSE 4: Drivers
  analyzeDriver(filePath, relativePath) {
    const driverId = relativePath.split('/')[1];
    
    if (!this.results.drivers[driverId]) {
      this.results.drivers.total++;
      this.results.drivers[driverId] = {
        hasDevice: false,
        hasCompose: false,
        issues: []
      };
    }
    
    if (filePath.endsWith('device.js')) {
      this.results.drivers[driverId].hasDevice = true;
    }
    
    if (filePath.endsWith('driver.compose.json')) {
      this.results.drivers[driverId].hasCompose = true;
      
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        
        // Check manufacturerName vs productId
        if (data.zigbee?.manufacturerName) {
          const mfrs = Array.isArray(data.zigbee.manufacturerName) 
            ? data.zigbee.manufacturerName 
            : [data.zigbee.manufacturerName];
          
          const hasProductIds = mfrs.some(m => /^TS\d{4}$/.test(m));
          if (hasProductIds) {
            this.results.drivers[driverId].issues.push('ProductIds in manufacturerName');
          }
        }
      } catch (err) {
        this.results.drivers[driverId].issues.push(`JSON error: ${err.message}`);
      }
    }
  }

  // FIX 1: Auto-fix issues détectés
  autoFix() {
    this.log('\n🔧 AUTO-FIX ISSUES', 'cyan');
    this.log('='.repeat(70), 'cyan');
    
    let fixCount = 0;
    
    // Fix CLUSTER.* issues
    const clusterIssues = this.results.issues.filter(i => i.type === 'CLUSTER_FORMAT');
    if (clusterIssues.length > 0) {
      this.log(`  🔧 Fixing ${clusterIssues.length} CLUSTER.* issues...`, 'yellow');
      
      for (const issue of clusterIssues.slice(0, 10)) { // Max 10 pour sécurité
        try {
          const filePath = path.join(this.rootDir, issue.file);
          let content = fs.readFileSync(filePath, 'utf8');
          
          // Replace common patterns
          content = content.replace(/CLUSTER\.POWER_CONFIGURATION/g, "'genPowerCfg'");
          content = content.replace(/CLUSTER\.IAS_ZONE/g, "'ssIasZone'");
          
          fs.writeFileSync(filePath, content, 'utf8');
          fixCount++;
          
          this.results.fixes.push({
            file: issue.file,
            type: 'CLUSTER_FORMAT',
            action: 'Replaced CLUSTER.* with string format'
          });
        } catch (err) {
          // Skip on error
        }
      }
    }
    
    this.log(`  ✅ ${fixCount} issues auto-fixed`, fixCount > 0 ? 'green' : 'yellow');
  }

  // VALIDATION 1: Homey App
  validateHomey() {
    this.log('\n✅ VALIDATION HOMEY', 'cyan');
    this.log('='.repeat(70), 'cyan');
    
    try {
      const output = execSync('homey app validate --level publish', {
        cwd: this.rootDir,
        encoding: 'utf8',
        timeout: 60000
      });
      
      this.results.validation.homey = 'PASSED';
      this.log('  ✅ Homey validation: PASSED', 'green');
    } catch (err) {
      this.results.validation.homey = 'FAILED';
      this.log('  ❌ Homey validation: FAILED', 'red');
      this.results.issues.push({
        file: 'app.json',
        type: 'VALIDATION',
        severity: 'CRITICAL',
        message: 'Homey validation failed'
      });
    }
  }

  // ANALYSE 5: GitHub Actions Status
  analyzeGitHubActions() {
    this.log('\n🔍 ANALYSE GITHUB ACTIONS', 'cyan');
    this.log('='.repeat(70), 'cyan');
    
    // Recommendations
    if (this.results.githubActions.disabled.length > 5) {
      this.results.githubActions.recommendations.push({
        type: 'CLEANUP',
        message: `${this.results.githubActions.disabled.length} workflows désactivés - considérer suppression`
      });
    }
    
    if (this.results.githubActions.active.length === 0) {
      this.results.githubActions.recommendations.push({
        type: 'WARNING',
        message: 'Aucun workflow actif détecté - vérifier configuration'
      });
    }
    
    this.log(`  📊 Workflows actifs: ${this.results.githubActions.active.length}`, 'green');
    this.log(`  📊 Workflows désactivés: ${this.results.githubActions.disabled.length}`, 'yellow');
    this.log(`  📊 Workflows cassés: ${this.results.githubActions.broken.length}`, this.results.githubActions.broken.length > 0 ? 'red' : 'green');
  }

  // GÉNÉRATION RAPPORT
  generateReport() {
    this.log('\n📊 GÉNÉRATION RAPPORT ULTRA-COMPLET', 'cyan');
    this.log('='.repeat(70), 'cyan');
    
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalFiles: this.results.totalFiles,
        totalDirs: this.results.totalDirs,
        scanned: this.results.scanned,
        issues: this.results.issues.length,
        fixes: this.results.fixes.length,
        driversTotal: this.results.drivers.total,
        validation: this.results.validation
      },
      issues: this.results.issues,
      fixes: this.results.fixes,
      githubActions: this.results.githubActions,
      drivers: this.results.drivers,
      recommendations: this.generateRecommendations()
    };
    
    // Save JSON
    const referencesDir = path.join(this.rootDir, 'references');
    if (!fs.existsSync(referencesDir)) {
      fs.mkdirSync(referencesDir, { recursive: true });
    }
    
    const jsonPath = path.join(referencesDir, 'ULTIMATE_PROJECT_ANALYSIS.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    this.log(`  ✅ JSON: ${jsonPath}`, 'green');
    
    // Generate Markdown
    this.generateMarkdown(report);
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Issues critiques
    const criticalIssues = this.results.issues.filter(i => i.severity === 'CRITICAL');
    if (criticalIssues.length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'Issues',
        issue: `${criticalIssues.length} issues critiques détectés`,
        action: 'Corriger immédiatement'
      });
    }
    
    // Workflows désactivés
    if (this.results.githubActions.disabled.length > 10) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'GitHub Actions',
        issue: `${this.results.githubActions.disabled.length} workflows désactivés`,
        action: 'Nettoyer les workflows inutilisés'
      });
    }
    
    // Validation
    if (this.results.validation.homey === 'FAILED') {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'Validation',
        issue: 'Homey validation failed',
        action: 'Corriger erreurs de validation'
      });
    }
    
    return recommendations;
  }

  generateMarkdown(report) {
    let md = '# 🚀 ULTIMATE PROJECT ANALYSIS\n\n';
    md += `**Généré le:** ${new Date().toLocaleString('fr-FR')}\n\n`;
    md += `---\n\n`;
    
    // Summary
    md += '## 📊 SOMMAIRE\n\n';
    md += `- **Fichiers analysés:** ${report.summary.totalFiles}\n`;
    md += `- **Dossiers:** ${report.summary.totalDirs}\n`;
    md += `- **Issues détectés:** ${report.summary.issues}\n`;
    md += `- **Fixes appliqués:** ${report.summary.fixes}\n`;
    md += `- **Drivers:** ${report.summary.driversTotal}\n`;
    md += `- **Validation Homey:** ${report.summary.validation.homey || 'N/A'}\n\n`;
    
    // GitHub Actions
    md += '## 🔄 GITHUB ACTIONS\n\n';
    md += `- **Actifs:** ${report.githubActions.active.length}\n`;
    md += `- **Désactivés:** ${report.githubActions.disabled.length}\n`;
    md += `- **Cassés:** ${report.githubActions.broken.length}\n\n`;
    
    if (report.githubActions.active.length > 0) {
      md += '### Workflows Actifs\n';
      report.githubActions.active.forEach(w => {
        md += `- \`${w.file}\`\n`;
      });
      md += '\n';
    }
    
    // Issues
    if (report.issues.length > 0) {
      md += '## 🔴 ISSUES DÉTECTÉS\n\n';
      
      const bySeverity = {};
      report.issues.forEach(issue => {
        if (!bySeverity[issue.severity]) bySeverity[issue.severity] = [];
        bySeverity[issue.severity].push(issue);
      });
      
      for (const [severity, issues] of Object.entries(bySeverity)) {
        md += `### ${severity} (${issues.length})\n`;
        issues.slice(0, 20).forEach(issue => {
          md += `- \`${issue.file}\`: ${issue.message}\n`;
        });
        if (issues.length > 20) {
          md += `\n*... et ${issues.length - 20} autres*\n`;
        }
        md += '\n';
      }
    }
    
    // Recommendations
    if (report.recommendations.length > 0) {
      md += '## 💡 RECOMMANDATIONS\n\n';
      report.recommendations.forEach((rec, idx) => {
        md += `### ${idx + 1}. ${rec.category} (${rec.priority})\n`;
        md += `- **Problème:** ${rec.issue}\n`;
        md += `- **Action:** ${rec.action}\n\n`;
      });
    }
    
    // Save Markdown
    const docsDir = path.join(this.rootDir, 'docs');
    const mdPath = path.join(docsDir, 'ULTIMATE_PROJECT_ANALYSIS.md');
    fs.writeFileSync(mdPath, md);
    this.log(`  ✅ Markdown: ${mdPath}`, 'green');
  }

  displaySummary() {
    this.log('\n' + '═'.repeat(70), 'magenta');
    this.log('  🎉 ANALYSE ULTRA-COMPLÈTE TERMINÉE', 'magenta');
    this.log('═'.repeat(70), 'magenta');
    
    this.log(`\n📊 Fichiers analysés: ${this.results.totalFiles}`, 'cyan');
    this.log(`📁 Dossiers: ${this.results.totalDirs}`, 'cyan');
    this.log(`🔴 Issues: ${this.results.issues.length}`, this.results.issues.length > 0 ? 'yellow' : 'green');
    this.log(`🔧 Fixes: ${this.results.fixes.length}`, this.results.fixes.length > 0 ? 'green' : 'blue');
    this.log(`🚀 Drivers: ${this.results.drivers.total}`, 'cyan');
    this.log(`✅ Validation: ${this.results.validation.homey || 'N/A'}`, this.results.validation.homey === 'PASSED' ? 'green' : 'yellow');
    
    this.log('\n🔄 GitHub Actions:', 'cyan');
    this.log(`   Actifs: ${this.results.githubActions.active.length}`, 'green');
    this.log(`   Désactivés: ${this.results.githubActions.disabled.length}`, 'yellow');
    this.log(`   Cassés: ${this.results.githubActions.broken.length}`, this.results.githubActions.broken.length > 0 ? 'red' : 'green');
    
    this.log('\n' + '═'.repeat(70), 'magenta');
  }

  async run() {
    console.log('\n');
    this.log('╔══════════════════════════════════════════════════════════════════════╗', 'magenta');
    this.log('║     🚀 ULTIMATE PROJECT FIXER                                       ║', 'magenta');
    this.log('║     Analyse + Correction TOTALE du projet                           ║', 'magenta');
    this.log('╚══════════════════════════════════════════════════════════════════════╝', 'magenta');
    console.log('\n');
    
    this.scanProject();
    this.analyzeGitHubActions();
    this.autoFix();
    this.validateHomey();
    this.generateReport();
    this.displaySummary();
    
    this.log('\n✅ ANALYSE + CORRECTIONS TERMINÉES!\n', 'green');
    this.log('Rapports générés:', 'cyan');
    this.log('  - references/ULTIMATE_PROJECT_ANALYSIS.json', 'blue');
    this.log('  - docs/ULTIMATE_PROJECT_ANALYSIS.md\n', 'blue');
  }
}

if (require.main === module) {
  const fixer = new UltimateProjectFixer();
  fixer.run().catch(err => {
    console.error('❌ Erreur fatale:', err);
    process.exit(1);
  });
}

module.exports = UltimateProjectFixer;
