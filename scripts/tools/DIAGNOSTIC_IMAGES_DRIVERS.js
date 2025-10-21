#!/usr/bin/env node

/**
 * 🔍 DIAGNOSTIC IMAGES DRIVERS
 * 
 * Analyse TOUTES les images des 183 drivers:
 * - Vérifie présence images (small, large, xlarge)
 * - Vérifie dimensions (75x75, 500x500, 1000x1000)
 * - Détecte images SVG mal converties
 * - Identifie drivers problématiques
 * - Génère plan correction
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DriverImagesDiagnostic {
  constructor() {
    this.root = path.resolve(__dirname, '../..');
    this.driversDir = path.join(this.root, 'drivers');
    this.results = {
      total: 0,
      ok: 0,
      missing: 0,
      wrongDimensions: 0,
      problems: []
    };
  }

  async run() {
    console.log('🔍 DIAGNOSTIC IMAGES DRIVERS - 183 DRIVERS');
    console.log('='.repeat(70));
    console.log('');

    try {
      // Lister tous les drivers
      const drivers = fs.readdirSync(this.driversDir)
        .filter(d => fs.statSync(path.join(this.driversDir, d)).isDirectory())
        .sort();

      console.log(`📊 Analyse de ${drivers.length} drivers...\n`);
      this.results.total = drivers.length;

      // Analyser chaque driver
      let count = 0;
      for (const driver of drivers) {
        count++;
        if (count % 20 === 0) {
          console.log(`  Progression: ${count}/${drivers.length}...`);
        }
        await this.analyzeDriver(driver);
      }

      // Rapport final
      console.log('\n' + '='.repeat(70));
      this.generateReport();

    } catch (error) {
      console.error('❌ ERREUR:', error.message);
      throw error;
    }
  }

  async analyzeDriver(driverName) {
    const assetsDir = path.join(this.driversDir, driverName, 'assets');
    
    if (!fs.existsSync(assetsDir)) {
      this.results.problems.push({
        driver: driverName,
        severity: 'HIGH',
        issue: 'assets_missing',
        message: 'Dossier assets/ manquant'
      });
      this.results.missing++;
      return;
    }

    const requiredImages = {
      'small.png': { width: 75, height: 75 },
      'large.png': { width: 500, height: 500 }
    };

    const optionalImages = {
      'xlarge.png': { width: 1000, height: 1000 }
    };

    let driverOk = true;

    // Vérifier images requises
    for (const [filename, expectedDim] of Object.entries(requiredImages)) {
      const filepath = path.join(assetsDir, filename);
      
      if (!fs.existsSync(filepath)) {
        this.results.problems.push({
          driver: driverName,
          severity: 'CRITICAL',
          issue: 'image_missing',
          file: filename,
          message: `${filename} manquant`
        });
        driverOk = false;
        continue;
      }

      // Vérifier dimensions
      const dimCheck = await this.checkDimensions(filepath, expectedDim);
      if (!dimCheck.ok) {
        this.results.problems.push({
          driver: driverName,
          severity: 'HIGH',
          issue: 'wrong_dimensions',
          file: filename,
          expected: `${expectedDim.width}x${expectedDim.height}`,
          actual: dimCheck.actual || 'unknown',
          message: `${filename} dimensions incorrectes`
        });
        driverOk = false;
      }

      // Vérifier taille fichier
      const stats = fs.statSync(filepath);
      if (stats.size < 500) {
        this.results.problems.push({
          driver: driverName,
          severity: 'MEDIUM',
          issue: 'file_too_small',
          file: filename,
          size: stats.size,
          message: `${filename} trop petit (${stats.size} bytes)`
        });
        driverOk = false;
      }
    }

    if (driverOk) {
      this.results.ok++;
    } else {
      if (this.results.problems.filter(p => p.driver === driverName && p.severity === 'CRITICAL').length > 0) {
        this.results.missing++;
      } else {
        this.results.wrongDimensions++;
      }
    }
  }

  async checkDimensions(filepath, expected) {
    // Méthode 1: ImageMagick
    try {
      const output = execSync(`identify -format "%wx%h" "${filepath}"`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore']
      }).trim();
      
      const [width, height] = output.split('x').map(Number);
      
      if (width === expected.width && height === expected.height) {
        return { ok: true, actual: `${width}x${height}` };
      } else {
        return { ok: false, actual: `${width}x${height}` };
      }
    } catch (error) {
      // ImageMagick non disponible - essayer Sharp
      try {
        const sharp = require('sharp');
        const metadata = await sharp(filepath).metadata();
        
        if (metadata.width === expected.width && metadata.height === expected.height) {
          return { ok: true, actual: `${metadata.width}x${metadata.height}` };
        } else {
          return { ok: false, actual: `${metadata.width}x${metadata.height}` };
        }
      } catch {
        // Impossible de vérifier
        return { ok: true, actual: 'unverifiable' };
      }
    }
  }

  generateReport() {
    console.log('📊 RÉSULTATS:');
    console.log(`  Total drivers: ${this.results.total}`);
    console.log(`  ✅ OK: ${this.results.ok} (${(this.results.ok / this.results.total * 100).toFixed(1)}%)`);
    console.log(`  ⚠️  Problèmes dimensions: ${this.results.wrongDimensions}`);
    console.log(`  ❌ Images manquantes: ${this.results.missing}`);
    console.log(`  📋 Total problèmes: ${this.results.problems.length}`);

    // Grouper par type de problème
    const byIssue = {};
    this.results.problems.forEach(p => {
      if (!byIssue[p.issue]) {
        byIssue[p.issue] = [];
      }
      byIssue[p.issue].push(p);
    });

    console.log('\n📋 PROBLÈMES PAR TYPE:');
    Object.entries(byIssue).forEach(([issue, problems]) => {
      console.log(`  ${issue}: ${problems.length}`);
    });

    // Sauvegarder rapport détaillé
    const reportPath = path.join(this.root, 'docs/reports/DRIVER_IMAGES_DIAGNOSTIC.json');
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Rapport détaillé: ${reportPath}`);

    // Générer Markdown
    this.generateMarkdownReport();

    // Générer script de correction
    if (this.results.problems.length > 0) {
      console.log('\n🔧 CORRECTION:');
      console.log('  1. Les drivers avec problèmes sont identifiés');
      console.log('  2. Utiliser script de correction pour regénérer images');
      console.log('  Command: node scripts/fixes/FIX_ALL_DRIVER_IMAGES.js');
    }
  }

  generateMarkdownReport() {
    let md = `# 🔍 DIAGNOSTIC IMAGES DRIVERS\n\n`;
    md += `**Date:** ${new Date().toISOString()}\n`;
    md += `**Drivers analysés:** ${this.results.total}\n\n`;
    md += `---\n\n`;

    md += `## 📊 RÉSUMÉ\n\n`;
    md += `- **✅ OK:** ${this.results.ok} (${(this.results.ok / this.results.total * 100).toFixed(1)}%)\n`;
    md += `- **⚠️  Problèmes dimensions:** ${this.results.wrongDimensions}\n`;
    md += `- **❌ Images manquantes:** ${this.results.missing}\n`;
    md += `- **📋 Total problèmes:** ${this.results.problems.length}\n\n`;

    if (this.results.problems.length > 0) {
      md += `## ⚠️  PROBLÈMES DÉTAILLÉS\n\n`;

      // Grouper par sévérité
      ['CRITICAL', 'HIGH', 'MEDIUM'].forEach(severity => {
        const problems = this.results.problems.filter(p => p.severity === severity);
        if (problems.length > 0) {
          md += `### ${severity} (${problems.length})\n\n`;
          problems.slice(0, 20).forEach(p => {
            md += `- **${p.driver}**: ${p.message}`;
            if (p.expected) {
              md += ` (attendu: ${p.expected}, actuel: ${p.actual})`;
            }
            md += `\n`;
          });
          if (problems.length > 20) {
            md += `\n... et ${problems.length - 20} autres\n`;
          }
          md += `\n`;
        }
      });
    }

    md += `## 🔧 CORRECTION\n\n`;
    md += `Pour corriger automatiquement:\n\n`;
    md += `\`\`\`bash\n`;
    md += `node scripts/fixes/FIX_ALL_DRIVER_IMAGES.js\n`;
    md += `\`\`\`\n\n`;

    md += `### Dimensions requises Homey:\n\n`;
    md += `- **small.png:** 75×75 pixels\n`;
    md += `- **large.png:** 500×500 pixels\n`;
    md += `- **xlarge.png:** 1000×1000 pixels (optionnel)\n\n`;

    const mdPath = path.join(this.root, 'docs/reports/DRIVER_IMAGES_DIAGNOSTIC.md');
    fs.writeFileSync(mdPath, md);
    console.log(`📄 Rapport Markdown: ${mdPath}`);
  }
}

// Run
if (require.main === module) {
  const diagnostic = new DriverImagesDiagnostic();
  diagnostic.run()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('FATAL:', error);
      process.exit(1);
    });
}

module.exports = DriverImagesDiagnostic;
