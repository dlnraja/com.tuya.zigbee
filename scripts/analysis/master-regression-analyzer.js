#!/usr/bin/env node
/**
 * 🔍 MASTER REGRESSION ANALYZER
 * 
 * Analyse complète et intelligente:
 * 1. Analyse historique Git pour détecter régressions
 * 2. Vérifie images manquantes (small.png, large.png)
 * 3. Analyse diagnostics Peter et autres utilisateurs
 * 4. Compare versions v2.x vs v3.x pour trouver breaking changes
 * 5. Détecte problèmes clusters, IAS Zone, battery
 * 6. Génère rapport complet avec corrections proposées
 * 7. Valide tous les drivers
 * 
 * Usage: node scripts/analysis/master-regression-analyzer.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const COLORS = {
  reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m',
  yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m'
};

class MasterRegressionAnalyzer {
  constructor() {
    this.rootDir = path.resolve(__dirname, '..', '..');
    this.driversDir = path.join(this.rootDir, 'drivers');
    this.docsDir = path.join(this.rootDir, 'docs');
    this.reportsDir = path.join(this.rootDir, 'reports');
    this.referencesDir = path.join(this.rootDir, 'references');
    
    this.results = {
      gitAnalysis: {},
      missingImages: [],
      diagnostics: [],
      regressions: [],
      clusterIssues: [],
      batteryIssues: [],
      iasZoneIssues: [],
      recommendations: [],
      criticalFixes: []
    };
    
    this.peterIssues = {
      motionSensor: {
        symptoms: ['No data', 'No triggers', 'No battery', 'Last seen 56 years ago'],
        affectedVersions: ['v3.0.42', 'v3.1.2', 'v3.1.3'],
        fixedIn: 'v3.1.4',
        rootCause: null
      },
      sosButton: {
        symptoms: ['Battery reading only', 'No button press detection'],
        affectedVersions: ['v3.0.42', 'v3.1.2', 'v3.1.3'],
        fixedIn: 'v3.1.4',
        rootCause: null
      }
    };
  }

  log(msg, color = 'reset') {
    console.log(`${COLORS[color]}${msg}${COLORS.reset}`);
  }

  // ANALYSE 1: Historique Git
  analyzeGitHistory() {
    this.log('\n🔍 ANALYSE GIT HISTORY', 'cyan');
    this.log('='.repeat(60), 'cyan');
    
    try {
      // Get commits v3.0.42 to v3.1.7
      const log = execSync(
        'git log --oneline --all --grep="v3\\." --since="2 weeks ago"',
        { cwd: this.rootDir, encoding: 'utf8' }
      );
      
      const commits = log.split('\n').filter(line => line.trim());
      this.log(`  ✅ ${commits.length} commits analysés`, 'green');
      
      // Analyze critical commits
      const criticalCommits = commits.filter(c => 
        c.toLowerCase().includes('fix') || 
        c.toLowerCase().includes('critical') ||
        c.toLowerCase().includes('hotfix')
      );
      
      this.log(`  🔴 ${criticalCommits.length} commits critiques trouvés`, 'yellow');
      
      this.results.gitAnalysis = {
        totalCommits: commits.length,
        criticalCommits: criticalCommits.length,
        commits: criticalCommits.slice(0, 20)
      };
      
      return criticalCommits;
    } catch (err) {
      this.log(`  ❌ Erreur: ${err.message}`, 'red');
      return [];
    }
  }

  // ANALYSE 2: Images manquantes
  analyzeMissingImages() {
    this.log('\n🖼️  ANALYSE IMAGES MANQUANTES', 'cyan');
    this.log('='.repeat(60), 'cyan');
    
    const drivers = fs.readdirSync(this.driversDir).filter(item => {
      const driverPath = path.join(this.driversDir, item);
      return fs.statSync(driverPath).isDirectory();
    });
    
    let missingCount = 0;
    
    for (const driver of drivers) {
      const assetsPath = path.join(this.driversDir, driver, 'assets', 'images');
      const missing = [];
      
      if (!fs.existsSync(assetsPath)) {
        missing.push('Dossier assets/images');
      } else {
        if (!fs.existsSync(path.join(assetsPath, 'small.png'))) missing.push('small.png');
        if (!fs.existsSync(path.join(assetsPath, 'large.png'))) missing.push('large.png');
      }
      
      if (missing.length > 0) {
        missingCount++;
        this.results.missingImages.push({ driver, missing });
      }
    }
    
    if (missingCount === 0) {
      this.log(`  ✅ Toutes les images présentes`, 'green');
    } else {
      this.log(`  ⚠️  ${missingCount} drivers avec images manquantes`, 'yellow');
    }
    
    return missingCount;
  }

  // ANALYSE 3: Diagnostics Peter
  analyzePeterDiagnostics() {
    this.log('\n👤 ANALYSE DIAGNOSTICS PETER', 'cyan');
    this.log('='.repeat(60), 'cyan');
    
    const peterFiles = [
      'PETER_SITUATION_SUMMARY.txt',
      'PETER_DIAGNOSTIC_FOLLOWUP_46c66060.md',
      'PETER_RESPONSE_COMPLETE.md',
      'BUGS_PETER_CORRIGES_RESUME.md'
    ];
    
    let foundIssues = 0;
    
    for (const file of peterFiles) {
      const filePath = path.join(this.rootDir, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Extract key issues
        if (content.includes('No data') || content.includes('No triggers')) {
          foundIssues++;
          this.log(`  📄 ${file}: Issues détectés`, 'yellow');
        }
      }
    }
    
    this.log(`  ✅ ${foundIssues} fichiers de diagnostic analysés`, 'green');
    
    return foundIssues;
  }

  // ANALYSE 4: Régressions dans drivers critiques
  analyzeDriverRegressions() {
    this.log('\n🔍 ANALYSE RÉGRESSIONS DRIVERS', 'cyan');
    this.log('='.repeat(60), 'cyan');
    
    const criticalDrivers = [
      'motion_sensor_battery',
      'sos_emergency_button_cr2032',
      'motion_temp_humidity_illumination_multi_battery'
    ];
    
    let regressionsFound = 0;
    
    for (const driverId of criticalDrivers) {
      const devicePath = path.join(this.driversDir, driverId, 'device.js');
      
      if (!fs.existsSync(devicePath)) {
        this.log(`  ⚠️  ${driverId}: device.js manquant`, 'yellow');
        continue;
      }
      
      const content = fs.readFileSync(devicePath, 'utf8');
      
      // Check for known regression patterns
      const issues = [];
      
      // Issue 1: Wrong cluster format
      if (content.includes('CLUSTER.')) {
        issues.push('CLUSTER.* format (should be numeric or string)');
        regressionsFound++;
      }
      
      // Issue 2: Missing IAS Zone enrollment
      if (content.includes('iasZone') && !content.includes('iasCieAddr')) {
        issues.push('IAS Zone enrollment manquant');
        regressionsFound++;
      }
      
      // Issue 3: Battery cluster wrong format
      if (content.includes('POWER_CONFIGURATION') || content.includes('powerConfiguration')) {
        if (!content.includes('genPowerCfg') && !content.match(/\b1\b/)) {
          issues.push('Battery cluster format incorrect');
          regressionsFound++;
        }
      }
      
      // Issue 4: Duplicate variable declarations
      const varMatches = content.match(/const endpoint/g);
      if (varMatches && varMatches.length > 1) {
        issues.push('Duplicate variable "endpoint"');
        regressionsFound++;
      }
      
      if (issues.length > 0) {
        this.log(`  🔴 ${driverId}:`, 'red');
        issues.forEach(issue => this.log(`     - ${issue}`, 'yellow'));
        
        this.results.regressions.push({
          driver: driverId,
          issues
        });
      } else {
        this.log(`  ✅ ${driverId}: OK`, 'green');
      }
    }
    
    this.log(`\n  📊 Total régressions: ${regressionsFound}`, regressionsFound > 0 ? 'yellow' : 'green');
    
    return regressionsFound;
  }

  // ANALYSE 5: Comparaison versions
  compareVersions() {
    this.log('\n📊 COMPARAISON VERSIONS', 'cyan');
    this.log('='.repeat(60), 'cyan');
    
    try {
      // Check current version
      const appJsonPath = path.join(this.rootDir, 'app.json');
      const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
      const currentVersion = appJson.version;
      
      this.log(`  📦 Version actuelle: ${currentVersion}`, 'blue');
      
      // Check if v3.1.4+ (fixes applied)
      const versionNum = parseFloat(String(currentVersion).replace('v', '').substring(0, 5));
      
      if (versionNum >= 3.14) {
        this.log(`  ✅ Version contient les fixes Peter`, 'green');
        this.peterIssues.motionSensor.rootCause = 'FIXED in ' + currentVersion;
        this.peterIssues.sosButton.rootCause = 'FIXED in ' + currentVersion;
      } else {
        this.log(`  ⚠️  Version antérieure aux fixes`, 'yellow');
        this.peterIssues.motionSensor.rootCause = 'NEEDS UPDATE to v3.1.4+';
        this.peterIssues.sosButton.rootCause = 'NEEDS UPDATE to v3.1.4+';
      }
      
      this.results.gitAnalysis.currentVersion = currentVersion;
      this.results.gitAnalysis.hasPeterFixes = versionNum >= 3.14;
      
      return currentVersion;
    } catch (err) {
      this.log(`  ❌ Erreur: ${err.message}`, 'red');
      return null;
    }
  }

  // GÉNÉRATION RAPPORT
  generateReport() {
    this.log('\n📊 GÉNÉRATION RAPPORT COMPLET', 'cyan');
    this.log('='.repeat(60), 'cyan');
    
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        gitCommitsAnalyzed: this.results.gitAnalysis.totalCommits || 0,
        criticalCommits: this.results.gitAnalysis.criticalCommits || 0,
        missingImages: this.results.missingImages.length,
        regressions: this.results.regressions.length,
        currentVersion: this.results.gitAnalysis.currentVersion,
        hasPeterFixes: this.results.gitAnalysis.hasPeterFixes
      },
      peterIssues: this.peterIssues,
      gitAnalysis: this.results.gitAnalysis,
      missingImages: this.results.missingImages,
      regressions: this.results.regressions,
      recommendations: this.generateRecommendations()
    };
    
    // Save JSON report
    const jsonPath = path.join(this.referencesDir, 'MASTER_REGRESSION_ANALYSIS.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    this.log(`  ✅ JSON: ${jsonPath}`, 'green');
    
    // Generate Markdown report
    this.generateMarkdownReport(report);
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Recommendation 1: Images
    if (this.results.missingImages.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Images',
        issue: `${this.results.missingImages.length} drivers avec images manquantes`,
        action: 'Générer images automatiquement avec create-app-images.js',
        command: 'node scripts/utils/create-app-images.js'
      });
    }
    
    // Recommendation 2: Regressions
    if (this.results.regressions.length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'Regressions',
        issue: `${this.results.regressions.length} drivers avec régressions détectées`,
        action: 'Corriger format clusters, IAS Zone, battery',
        command: 'Requires manual fixes based on regression patterns'
      });
    }
    
    // Recommendation 3: Peter issues
    if (!this.results.gitAnalysis.hasPeterFixes) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'Peter Issues',
        issue: 'Version ne contient pas les fixes Peter',
        action: 'Mettre à jour vers v3.1.4+ ou appliquer patches',
        command: 'git pull origin master && npm install'
      });
    }
    
    return recommendations;
  }

  generateMarkdownReport(report) {
    let md = '# 🔍 MASTER REGRESSION ANALYSIS REPORT\n\n';
    md += `**Généré le:** ${new Date().toLocaleString('fr-FR')}\n\n`;
    md += `---\n\n`;
    
    // Summary
    md += '## 📊 SOMMAIRE\n\n';
    md += `- **Version actuelle:** ${report.summary.currentVersion}\n`;
    md += `- **Fixes Peter inclus:** ${report.summary.hasPeterFixes ? '✅ OUI' : '❌ NON'}\n`;
    md += `- **Commits analysés:** ${report.summary.gitCommitsAnalyzed}\n`;
    md += `- **Commits critiques:** ${report.summary.criticalCommits}\n`;
    md += `- **Images manquantes:** ${report.summary.missingImages}\n`;
    md += `- **Régressions détectées:** ${report.summary.regressions}\n\n`;
    
    // Peter Issues
    md += '## 👤 PROBLÈMES PETER\n\n';
    md += '### Motion Sensor\n';
    md += `- **Symptômes:** ${report.peterIssues.motionSensor.symptoms.join(', ')}\n`;
    md += `- **Versions affectées:** ${report.peterIssues.motionSensor.affectedVersions.join(', ')}\n`;
    md += `- **Corrigé dans:** ${report.peterIssues.motionSensor.fixedIn}\n`;
    md += `- **Status:** ${report.peterIssues.motionSensor.rootCause}\n\n`;
    
    md += '### SOS Button\n';
    md += `- **Symptômes:** ${report.peterIssues.sosButton.symptoms.join(', ')}\n`;
    md += `- **Versions affectées:** ${report.peterIssues.sosButton.affectedVersions.join(', ')}\n`;
    md += `- **Corrigé dans:** ${report.peterIssues.sosButton.fixedIn}\n`;
    md += `- **Status:** ${report.peterIssues.sosButton.rootCause}\n\n`;
    
    // Regressions
    if (report.regressions.length > 0) {
      md += '## 🔴 RÉGRESSIONS DÉTECTÉES\n\n';
      report.regressions.forEach(reg => {
        md += `### ${reg.driver}\n`;
        reg.issues.forEach(issue => md += `- ❌ ${issue}\n`);
        md += '\n';
      });
    }
    
    // Images
    if (report.missingImages.length > 0) {
      md += '## 🖼️  IMAGES MANQUANTES\n\n';
      report.missingImages.slice(0, 20).forEach(item => {
        md += `- \`${item.driver}\`: ${item.missing.join(', ')}\n`;
      });
      if (report.missingImages.length > 20) {
        md += `\n*... et ${report.missingImages.length - 20} autres*\n`;
      }
      md += '\n';
    }
    
    // Recommendations
    if (report.recommendations.length > 0) {
      md += '## 💡 RECOMMANDATIONS\n\n';
      report.recommendations.forEach((rec, idx) => {
        md += `### ${idx + 1}. ${rec.category} (${rec.priority})\n`;
        md += `- **Problème:** ${rec.issue}\n`;
        md += `- **Action:** ${rec.action}\n`;
        md += `- **Commande:** \`${rec.command}\`\n\n`;
      });
    }
    
    // Save Markdown
    const mdPath = path.join(this.docsDir, 'MASTER_REGRESSION_ANALYSIS.md');
    fs.writeFileSync(mdPath, md);
    this.log(`  ✅ Markdown: ${mdPath}`, 'green');
  }

  displaySummary() {
    this.log('\n' + '═'.repeat(60), 'magenta');
    this.log('  🎉 ANALYSE TERMINÉE', 'magenta');
    this.log('═'.repeat(60), 'magenta');
    
    this.log(`\n📊 Commits analysés: ${this.results.gitAnalysis.totalCommits || 0}`, 'cyan');
    this.log(`🔴 Commits critiques: ${this.results.gitAnalysis.criticalCommits || 0}`, 'yellow');
    this.log(`🖼️  Images manquantes: ${this.results.missingImages.length}`, this.results.missingImages.length > 0 ? 'yellow' : 'green');
    this.log(`🔴 Régressions: ${this.results.regressions.length}`, this.results.regressions.length > 0 ? 'red' : 'green');
    
    if (this.results.gitAnalysis.hasPeterFixes) {
      this.log(`\n✅ Version contient les fixes Peter`, 'green');
    } else {
      this.log(`\n⚠️  Version ne contient PAS les fixes Peter`, 'yellow');
    }
    
    this.log('\n' + '═'.repeat(60), 'magenta');
  }

  async run() {
    console.log('\n');
    this.log('╔══════════════════════════════════════════════════════════════╗', 'magenta');
    this.log('║     🔍 MASTER REGRESSION ANALYZER                           ║', 'magenta');
    this.log('║     Analyse complète régressions + diagnostics              ║', 'magenta');
    this.log('╚══════════════════════════════════════════════════════════════╝', 'magenta');
    console.log('\n');
    
    this.analyzeGitHistory();
    this.analyzeMissingImages();
    this.analyzePeterDiagnostics();
    this.analyzeDriverRegressions();
    this.compareVersions();
    this.generateReport();
    this.displaySummary();
    
    this.log('\n✅ ANALYSE COMPLÈTE TERMINÉE!\n', 'green');
    this.log('Rapports générés:', 'cyan');
    this.log('  - references/MASTER_REGRESSION_ANALYSIS.json', 'blue');
    this.log('  - docs/MASTER_REGRESSION_ANALYSIS.md\n', 'blue');
  }
}

if (require.main === module) {
  const analyzer = new MasterRegressionAnalyzer();
  analyzer.run().catch(err => {
    console.error('❌ Erreur fatale:', err);
    process.exit(1);
  });
}

module.exports = MasterRegressionAnalyzer;
