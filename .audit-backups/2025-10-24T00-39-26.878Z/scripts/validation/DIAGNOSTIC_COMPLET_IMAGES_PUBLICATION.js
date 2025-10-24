#!/usr/bin/env node

/**
 * 🔍 DIAGNOSTIC COMPLET - IMAGES & PUBLICATION
 * 
 * Analyse détaillée de TOUS les problèmes:
 * - Images app (dimensions, format, qualité)
 * - Images drivers (échantillon)
 * - Configuration app.json
 * - Historique publications
 * - Workflows GitHub Actions
 * - Recommandations corrections
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DiagnosticComplet {
  constructor() {
    this.root = path.resolve(__dirname, '../..');
    this.issues = [];
    this.warnings = [];
    this.info = [];
  }

  async run() {
    console.log('🔍 DIAGNOSTIC COMPLET - IMAGES & PUBLICATION');
    console.log('='.repeat(70));
    console.log('');

    try {
      // Phase 1: App.json
      console.log('📊 Phase 1: Analyse app.json...');
      this.checkAppJson();

      // Phase 2: Images app
      console.log('\n🖼️  Phase 2: Vérification images app...');
      await this.checkAppImages();

      // Phase 3: Images drivers (échantillon)
      console.log('\n📁 Phase 3: Vérification images drivers (échantillon)...');
      this.checkDriverImages();

      // Phase 4: Historique git
      console.log('\n📜 Phase 4: Analyse historique Git...');
      this.checkGitHistory();

      // Phase 5: Workflows
      console.log('\n⚙️  Phase 5: Analyse workflows...');
      this.checkWorkflows();

      // Phase 6: Génération rapport
      console.log('\n📊 Phase 6: Génération rapport...');
      this.generateReport();

      console.log('\n✅ DIAGNOSTIC TERMINÉ!');
      console.log(`📊 Issues: ${this.issues.length}`);
      console.log(`⚠️  Warnings: ${this.warnings.length}`);
      console.log(`ℹ️  Info: ${this.info.length}`);

    } catch (error) {
      console.error('❌ ERREUR:', error.message);
      throw error;
    }
  }

  checkAppJson() {
    const appJsonPath = path.join(this.root, 'app.json');
    
    if (!fs.existsSync(appJsonPath)) {
      this.issues.push({
        severity: 'CRITICAL',
        category: 'app.json',
        message: 'app.json non trouvé!'
      });
      return;
    }

    try {
      const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
      
      console.log(`  ✅ Version: ${appJson.version}`);
      console.log(`  ✅ SDK: ${appJson.sdk}`);
      console.log(`  ✅ ID: ${appJson.id}`);
      console.log(`  ✅ Name: ${appJson.name.en}`);

      // Vérifier images paths
      if (appJson.images) {
        console.log(`\n  Images configurées:`);
        console.log(`    - small: ${appJson.images.small}`);
        console.log(`    - large: ${appJson.images.large}`);
        console.log(`    - xlarge: ${appJson.images.xlarge || 'N/A'}`);

        // Vérifier si les fichiers existent
        ['small', 'large', 'xlarge'].forEach(size => {
          if (appJson.images[size]) {
            const imagePath = path.join(this.root, appJson.images[size]);
            if (!fs.existsSync(imagePath)) {
              this.issues.push({
                severity: 'HIGH',
                category: 'app-images',
                message: `Image ${size} manquante: ${appJson.images[size]}`
              });
            }
          }
        });
      }

      // Vérifier brandColor
      if (!appJson.brandColor) {
        this.warnings.push({
          category: 'app.json',
          message: 'brandColor non défini'
        });
      }

      // Vérifier category
      if (!appJson.category || appJson.category === 'other') {
        this.warnings.push({
          category: 'app.json',
          message: 'Category "other" ou non définie - impact visibilité App Store'
        });
      }

      this.info.push({
        category: 'app.json',
        message: `Version actuelle: ${appJson.version}`
      });

    } catch (error) {
      this.issues.push({
        severity: 'CRITICAL',
        category: 'app.json',
        message: `Erreur lecture app.json: ${error.message}`
      });
    }
  }

  async checkAppImages() {
    const imagesDir = path.join(this.root, 'assets/images');
    
    if (!fs.existsSync(imagesDir)) {
      this.issues.push({
        severity: 'CRITICAL',
        category: 'app-images',
        message: 'Dossier assets/images/ non trouvé!'
      });
      return;
    }

    const requiredImages = {
      'small.png': { width: 250, height: 175 },
      'large.png': { width: 500, height: 350 },
      'xlarge.png': { width: 1000, height: 700 }
    };

    for (const [filename, expectedDim] of Object.entries(requiredImages)) {
      const filepath = path.join(imagesDir, filename);
      
      console.log(`\n  Vérification ${filename}:`);
      
      if (!fs.existsSync(filepath)) {
        this.issues.push({
          severity: 'CRITICAL',
          category: 'app-images',
          message: `${filename} manquant!`
        });
        console.log(`    ❌ MANQUANT`);
        continue;
      }

      // Vérifier taille fichier
      const stats = fs.statSync(filepath);
      console.log(`    ✅ Taille: ${(stats.size / 1024).toFixed(2)} KB`);

      if (stats.size < 1000) {
        this.warnings.push({
          category: 'app-images',
          message: `${filename} très petit (${stats.size} bytes) - possiblement corrompu`
        });
      }

      // Tentative de vérifier dimensions avec ImageMagick (si disponible)
      try {
        const output = execSync(`identify -format "%wx%h" "${filepath}"`, {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'ignore']
        }).trim();
        
        const [width, height] = output.split('x').map(Number);
        console.log(`    Dimensions: ${width}x${height}`);
        
        if (width !== expectedDim.width || height !== expectedDim.height) {
          this.issues.push({
            severity: 'HIGH',
            category: 'app-images',
            message: `${filename} dimensions incorrectes: ${width}x${height} au lieu de ${expectedDim.width}x${expectedDim.height}`
          });
          console.log(`    ❌ INCORRECTES (attendu: ${expectedDim.width}x${expectedDim.height})`);
        } else {
          console.log(`    ✅ Dimensions correctes`);
        }
      } catch (error) {
        this.info.push({
          category: 'app-images',
          message: `Impossible de vérifier dimensions ${filename} (ImageMagick non disponible)`
        });
        console.log(`    ⚠️  Dimensions non vérifiables (ImageMagick requis)`);
      }
    }

    // Vérifier SVG aussi
    const svgFiles = fs.readdirSync(imagesDir).filter(f => f.endsWith('.svg'));
    if (svgFiles.length > 0) {
      console.log(`\n  SVG trouvés: ${svgFiles.join(', ')}`);
      this.info.push({
        category: 'app-images',
        message: `SVG présents: ${svgFiles.join(', ')} - Homey utilise PNG`
      });
    }
  }

  checkDriverImages() {
    const driversDir = path.join(this.root, 'drivers');
    
    if (!fs.existsSync(driversDir)) {
      return;
    }

    const drivers = fs.readdirSync(driversDir)
      .filter(d => fs.statSync(path.join(driversDir, d)).isDirectory())
      .slice(0, 10); // Échantillon de 10 drivers

    console.log(`  Échantillon: ${drivers.length} drivers`);

    let missingCount = 0;
    let okCount = 0;

    drivers.forEach(driver => {
      const assetsDir = path.join(driversDir, driver, 'assets');
      
      if (!fs.existsSync(assetsDir)) {
        missingCount++;
        return;
      }

      const hasSmall = fs.existsSync(path.join(assetsDir, 'small.png'));
      const hasLarge = fs.existsSync(path.join(assetsDir, 'large.png'));

      if (hasSmall && hasLarge) {
        okCount++;
      } else {
        missingCount++;
      }
    });

    console.log(`  ✅ OK: ${okCount}`);
    console.log(`  ⚠️  Problèmes: ${missingCount}`);

    if (missingCount > 5) {
      this.warnings.push({
        category: 'driver-images',
        message: `${missingCount} drivers sur ${drivers.length} ont des images manquantes`
      });
    }
  }

  checkGitHistory() {
    try {
      // Derniers commits
      const commits = execSync('git log -5 --oneline', {
        encoding: 'utf8',
        cwd: this.root
      }).trim().split('\n');

      console.log(`  Derniers commits:`);
      commits.forEach(commit => {
        console.log(`    ${commit}`);
      });

      // Status git
      const status = execSync('git status --short', {
        encoding: 'utf8',
        cwd: this.root
      }).trim();

      if (status) {
        console.log(`\n  ⚠️  Fichiers non committés:`);
        status.split('\n').slice(0, 5).forEach(line => {
          console.log(`    ${line}`);
        });
        
        this.warnings.push({
          category: 'git',
          message: 'Fichiers non committés détectés'
        });
      }

      // Vérifier remote
      const remote = execSync('git remote get-url origin', {
        encoding: 'utf8',
        cwd: this.root
      }).trim();

      console.log(`\n  Remote: ${remote}`);

    } catch (error) {
      this.warnings.push({
        category: 'git',
        message: `Erreur analyse Git: ${error.message}`
      });
    }
  }

  checkWorkflows() {
    const workflowsDir = path.join(this.root, '.github/workflows');
    
    if (!fs.existsSync(workflowsDir)) {
      this.warnings.push({
        category: 'workflows',
        message: 'Dossier .github/workflows/ non trouvé'
      });
      return;
    }

    const workflows = fs.readdirSync(workflowsDir)
      .filter(f => f.endsWith('.yml') && !f.endsWith('.disabled'));

    console.log(`  Workflows actifs: ${workflows.length}`);
    workflows.forEach(wf => {
      console.log(`    - ${wf}`);
    });

    // Vérifier workflow publication
    const publishWorkflow = workflows.find(w => 
      w.includes('publish') || w.includes('homey')
    );

    if (publishWorkflow) {
      console.log(`\n  ✅ Workflow publication trouvé: ${publishWorkflow}`);
      this.info.push({
        category: 'workflows',
        message: `Workflow publication: ${publishWorkflow}`
      });
    } else {
      this.warnings.push({
        category: 'workflows',
        message: 'Aucun workflow de publication trouvé'
      });
    }
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total_issues: this.issues.length,
        total_warnings: this.warnings.length,
        total_info: this.info.length,
        critical: this.issues.filter(i => i.severity === 'CRITICAL').length,
        high: this.issues.filter(i => i.severity === 'HIGH').length,
        medium: this.issues.filter(i => i.severity === 'MEDIUM').length
      },
      issues: this.issues,
      warnings: this.warnings,
      info: this.info,
      recommendations: this.generateRecommendations()
    };

    // Sauvegarder JSON
    const reportPath = path.join(this.root, 'docs/reports/DIAGNOSTIC_COMPLET.json');
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n  📄 Rapport JSON: ${reportPath}`);

    // Générer Markdown
    const mdReport = this.generateMarkdownReport(report);
    const mdPath = reportPath.replace('.json', '.md');
    fs.writeFileSync(mdPath, mdReport);
    console.log(`  📄 Rapport Markdown: ${mdPath}`);

    // Afficher résumé
    console.log(`\n  📊 RÉSUMÉ:`);
    console.log(`    Issues critiques: ${report.summary.critical}`);
    console.log(`    Issues haute priorité: ${report.summary.high}`);
    console.log(`    Warnings: ${report.summary.total_warnings}`);
    console.log(`    Infos: ${report.summary.total_info}`);
  }

  generateRecommendations() {
    const recommendations = [];

    // Issues critiques
    if (this.issues.filter(i => i.severity === 'CRITICAL').length > 0) {
      recommendations.push({
        priority: 'URGENT',
        action: 'Corriger immédiatement tous les issues critiques avant publication',
        details: 'Les issues critiques bloquent la publication'
      });
    }

    // Images app
    const imageIssues = this.issues.filter(i => i.category === 'app-images');
    if (imageIssues.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Regénérer les images app avec les bonnes dimensions',
        command: 'node scripts/generation/GENERATE_MISSING_IMAGES.js',
        details: 'Images app doivent être: small (250x175), large (500x350), xlarge (1000x700)'
      });
    }

    // Driver images
    const driverImageIssues = this.issues.filter(i => i.category === 'driver-images');
    if (driverImageIssues.length > 5) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Regénérer images drivers manquantes',
        command: 'node scripts/generation/GENERATE_MISSING_IMAGES.js --drivers',
        details: 'Plusieurs drivers ont des images manquantes'
      });
    }

    // Workflow
    if (!fs.existsSync(path.join(this.root, '.github/workflows/homey-publish-simple.yml'))) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Vérifier configuration workflow publication',
        details: 'Workflow de publication peut avoir des problèmes'
      });
    }

    return recommendations;
  }

  generateMarkdownReport(report) {
    let md = `# 🔍 DIAGNOSTIC COMPLET - IMAGES & PUBLICATION\n\n`;
    md += `**Date:** ${report.timestamp}\n\n`;
    md += `---\n\n`;

    md += `## 📊 RÉSUMÉ\n\n`;
    md += `- **Issues Critiques:** ${report.summary.critical}\n`;
    md += `- **Issues Haute Priorité:** ${report.summary.high}\n`;
    md += `- **Warnings:** ${report.summary.total_warnings}\n`;
    md += `- **Infos:** ${report.summary.total_info}\n\n`;

    if (report.issues.length > 0) {
      md += `## ❌ ISSUES\n\n`;
      report.issues.forEach(issue => {
        md += `### [${issue.severity}] ${issue.category}\n`;
        md += `${issue.message}\n\n`;
      });
    }

    if (report.warnings.length > 0) {
      md += `## ⚠️  WARNINGS\n\n`;
      report.warnings.forEach(warning => {
        md += `- **${warning.category}**: ${warning.message}\n`;
      });
      md += `\n`;
    }

    if (report.recommendations.length > 0) {
      md += `## 🔧 RECOMMANDATIONS\n\n`;
      report.recommendations.forEach((rec, i) => {
        md += `### ${i + 1}. [${rec.priority}] ${rec.action}\n\n`;
        if (rec.command) {
          md += `**Command:**\n\`\`\`bash\n${rec.command}\n\`\`\`\n\n`;
        }
        md += `${rec.details}\n\n`;
      });
    }

    return md;
  }
}

// Run
if (require.main === module) {
  const diagnostic = new DiagnosticComplet();
  diagnostic.run()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('FATAL:', error);
      process.exit(1);
    });
}

module.exports = DiagnosticComplet;
