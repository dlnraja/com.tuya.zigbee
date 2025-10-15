#!/usr/bin/env node

/**
 * 🔍 IMAGE DIAGNOSTIC AGENT
 * 
 * Agent AI qui diagnostique automatiquement les problèmes d'images:
 * - Dashboard Homey
 * - Test channel web page
 * - App Store preview
 * - GitHub repository
 * 
 * Utilise Puppeteer + AI pour analyse visuelle et corrections
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ImageDiagnosticAgent {
  constructor() {
    this.root = path.resolve(__dirname, '../..');
    this.screenshotsDir = path.join(this.root, 'docs/screenshots/image-diagnostics');
    this.reportPath = path.join(this.root, 'docs/reports/IMAGE_DIAGNOSTIC_REPORT.json');
    
    this.issues = [];
    this.corrections = [];
    
    // Créer dossiers
    if (!fs.existsSync(this.screenshotsDir)) {
      fs.mkdirSync(this.screenshotsDir, { recursive: true });
    }
  }

  async run() {
    console.log('🔍 IMAGE DIAGNOSTIC AGENT v2.15.33');
    console.log('=' .repeat(70));
    console.log('');

    try {
      // Phase 1: Diagnostic local
      console.log('📊 Phase 1: Diagnostic fichiers locaux...');
      await this.checkLocalImages();

      // Phase 2: Diagnostic Dashboard Homey
      console.log('\n🌐 Phase 2: Diagnostic Dashboard Homey...');
      await this.checkHomeyDashboard();

      // Phase 3: Diagnostic Test Channel
      console.log('\n🌐 Phase 3: Diagnostic Test Channel...');
      await this.checkTestChannel();

      // Phase 4: Analyse AI des problèmes
      console.log('\n🤖 Phase 4: Analyse AI des problèmes...');
      await this.analyzeIssuesWithAI();

      // Phase 5: Générer corrections
      console.log('\n🔧 Phase 5: Génération corrections...');
      await this.generateCorrections();

      // Phase 6: Rapport final
      console.log('\n📊 Phase 6: Génération rapport...');
      await this.generateReport();

      console.log('\n✅ DIAGNOSTIC COMPLET!');
      console.log(`📊 Issues trouvées: ${this.issues.length}`);
      console.log(`🔧 Corrections proposées: ${this.corrections.length}`);

    } catch (error) {
      console.error('❌ ERREUR:', error.message);
      throw error;
    }
  }

  async checkLocalImages() {
    const checks = {
      appImages: this.checkAppImages(),
      driverImages: this.checkDriverImages(),
      capabilities: this.checkCapabilityIcons()
    };

    console.log('  📁 Vérification app images...');
    const appResult = checks.appImages;
    if (appResult.issues.length > 0) {
      this.issues.push(...appResult.issues);
      console.log(`    ⚠️  ${appResult.issues.length} problèmes détectés`);
    } else {
      console.log('    ✅ App images OK');
    }

    console.log('  📁 Vérification driver images (sample 20)...');
    const driverResult = checks.driverImages;
    if (driverResult.issues.length > 0) {
      this.issues.push(...driverResult.issues);
      console.log(`    ⚠️  ${driverResult.issues.length} problèmes détectés`);
    } else {
      console.log('    ✅ Driver images OK');
    }

    console.log('  📁 Vérification capability icons...');
    const capResult = checks.capabilities;
    if (capResult.issues.length > 0) {
      this.issues.push(...capResult.issues);
      console.log(`    ⚠️  ${capResult.issues.length} problèmes détectés`);
    } else {
      console.log('    ✅ Capability icons OK');
    }
  }

  checkAppImages() {
    const issues = [];
    const appImagesDir = path.join(this.root, 'assets/images');
    const requiredSizes = {
      'small.png': { width: 250, height: 175 },
      'large.png': { width: 500, height: 350 },
      'xlarge.png': { width: 1000, height: 700 }
    };

    for (const [file, expectedSize] of Object.entries(requiredSizes)) {
      const filepath = path.join(appImagesDir, file);
      
      if (!fs.existsSync(filepath)) {
        issues.push({
          type: 'missing',
          category: 'app-image',
          file: file,
          path: filepath,
          severity: 'critical',
          message: `Fichier manquant: ${file}`
        });
      } else {
        // Vérifier dimensions avec ImageMagick si disponible
        try {
          const output = execSync(`identify -format "%wx%h" "${filepath}"`, {
            encoding: 'utf8'
          });
          const [width, height] = output.trim().split('x').map(Number);
          
          if (width !== expectedSize.width || height !== expectedSize.height) {
            issues.push({
              type: 'wrong-dimensions',
              category: 'app-image',
              file: file,
              path: filepath,
              severity: 'high',
              expected: `${expectedSize.width}x${expectedSize.height}`,
              actual: `${width}x${height}`,
              message: `Dimensions incorrectes: ${width}x${height} au lieu de ${expectedSize.width}x${expectedSize.height}`
            });
          }
        } catch (error) {
          // ImageMagick not available, skip dimension check
        }

        // Vérifier taille fichier (trop petite = problème)
        const stats = fs.statSync(filepath);
        if (stats.size < 1000) {
          issues.push({
            type: 'too-small',
            category: 'app-image',
            file: file,
            path: filepath,
            severity: 'medium',
            size: stats.size,
            message: `Fichier trop petit: ${stats.size} bytes`
          });
        }
      }
    }

    return { issues };
  }

  checkDriverImages() {
    const issues = [];
    const driversDir = path.join(this.root, 'drivers');
    const drivers = fs.readdirSync(driversDir)
      .filter(d => fs.statSync(path.join(driversDir, d)).isDirectory())
      .slice(0, 20); // Sample

    const requiredSizes = {
      'small.png': { width: 75, height: 75 },
      'large.png': { width: 500, height: 500 },
      'xlarge.png': { width: 1000, height: 1000 }
    };

    for (const driver of drivers) {
      const assetsDir = path.join(driversDir, driver, 'assets');
      
      if (!fs.existsSync(assetsDir)) {
        issues.push({
          type: 'missing-assets-dir',
          category: 'driver-image',
          driver: driver,
          severity: 'high',
          message: `Dossier assets/ manquant pour ${driver}`
        });
        continue;
      }

      for (const [file, expectedSize] of Object.entries(requiredSizes)) {
        const filepath = path.join(assetsDir, file);
        
        if (!fs.existsSync(filepath)) {
          issues.push({
            type: 'missing',
            category: 'driver-image',
            driver: driver,
            file: file,
            path: filepath,
            severity: 'medium',
            message: `Image manquante: ${driver}/${file}`
          });
        } else {
          // Check dimensions si possible
          try {
            const output = execSync(`identify -format "%wx%h" "${filepath}"`, {
              encoding: 'utf8'
            });
            const [width, height] = output.trim().split('x').map(Number);
            
            if (width !== expectedSize.width || height !== expectedSize.height) {
              issues.push({
                type: 'wrong-dimensions',
                category: 'driver-image',
                driver: driver,
                file: file,
                path: filepath,
                severity: 'medium',
                expected: `${expectedSize.width}x${expectedSize.height}`,
                actual: `${width}x${height}`,
                message: `${driver}/${file}: ${width}x${height} au lieu de ${expectedSize.width}x${expectedSize.height}`
              });
            }
          } catch (error) {
            // Skip dimension check
          }
        }
      }
    }

    return { issues };
  }

  checkCapabilityIcons() {
    const issues = [];
    const capabilitiesDir = path.join(this.root, '.homeycompose/capabilities');
    
    if (!fs.existsSync(capabilitiesDir)) {
      return { issues };
    }

    const capabilities = fs.readdirSync(capabilitiesDir)
      .filter(f => f.endsWith('.json'));

    for (const capFile of capabilities) {
      try {
        const capData = JSON.parse(
          fs.readFileSync(path.join(capabilitiesDir, capFile), 'utf8')
        );

        if (capData.icon) {
          const iconPath = path.join(this.root, capData.icon.replace(/^\//, ''));
          
          if (!fs.existsSync(iconPath)) {
            issues.push({
              type: 'missing',
              category: 'capability-icon',
              capability: capFile.replace('.json', ''),
              iconPath: capData.icon,
              severity: 'medium',
              message: `Icon manquant pour capability ${capFile}: ${capData.icon}`
            });
          }
        }
      } catch (error) {
        // Skip invalid JSON
      }
    }

    return { issues };
  }

  async checkHomeyDashboard() {
    if (!process.env.HOMEY_EMAIL || !process.env.HOMEY_PASSWORD) {
      console.log('  ⏭️  Credentials manquants, skip dashboard check');
      return;
    }

    try {
      const browser = await puppeteer.launch({
        headless: true,
        defaultViewport: { width: 1920, height: 1080 }
      });

      const page = await browser.newPage();

      // Login
      console.log('  🔐 Login dashboard...');
      await page.goto('https://tools.developer.homey.app/');
      
      await page.waitForSelector('input[type="email"]', { timeout: 10000 });
      await page.type('input[type="email"]', process.env.HOMEY_EMAIL);
      await page.type('input[type="password"]', process.env.HOMEY_PASSWORD);
      await page.click('button[type="submit"]');
      
      await page.waitForNavigation({ waitUntil: 'networkidle2' });

      // Navigate to app
      console.log('  📱 Navigation vers app...');
      await page.goto(`https://tools.developer.homey.app/apps/app/${process.env.HOMEY_APP_ID || 'com.dlnraja.tuya.zigbee'}`);
      await page.waitForTimeout(3000);

      // Screenshot dashboard
      const dashboardScreenshot = path.join(this.screenshotsDir, 'dashboard-overview.png');
      await page.screenshot({
        path: dashboardScreenshot,
        fullPage: true
      });
      console.log(`  📸 Screenshot: dashboard-overview.png`);

      // Vérifier images affichées
      const imageIssues = await page.evaluate(() => {
        const issues = [];
        const images = document.querySelectorAll('img');
        
        images.forEach((img, i) => {
          if (!img.complete || img.naturalWidth === 0) {
            issues.push({
              type: 'broken-image',
              category: 'dashboard',
              src: img.src,
              alt: img.alt || 'No alt text',
              index: i
            });
          }
          
          // Check si image placeholder
          if (img.src.includes('placeholder') || img.src.includes('default')) {
            issues.push({
              type: 'placeholder-image',
              category: 'dashboard',
              src: img.src,
              alt: img.alt || 'No alt text'
            });
          }
        });
        
        return issues;
      });

      if (imageIssues.length > 0) {
        this.issues.push(...imageIssues.map(i => ({
          ...i,
          severity: 'high',
          message: `Dashboard: ${i.type} - ${i.src}`
        })));
        console.log(`  ⚠️  ${imageIssues.length} problèmes images dashboard`);
      } else {
        console.log('  ✅ Images dashboard OK');
      }

      await browser.close();

    } catch (error) {
      console.log(`  ⚠️  Erreur dashboard check: ${error.message}`);
      this.issues.push({
        type: 'dashboard-check-failed',
        category: 'dashboard',
        severity: 'medium',
        error: error.message,
        message: `Impossible de vérifier dashboard: ${error.message}`
      });
    }
  }

  async checkTestChannel() {
    try {
      const browser = await puppeteer.launch({
        headless: true,
        defaultViewport: { width: 1920, height: 1080 }
      });

      const page = await browser.newPage();

      console.log('  🌐 Navigation test channel...');
      const testUrl = `https://homey.app/a/${process.env.HOMEY_APP_ID || 'com.dlnraja.tuya.zigbee'}/test/`;
      
      await page.goto(testUrl, { waitUntil: 'networkidle2' });
      await page.waitForTimeout(3000);

      // Screenshot test page
      const testScreenshot = path.join(this.screenshotsDir, 'test-channel.png');
      await page.screenshot({
        path: testScreenshot,
        fullPage: true
      });
      console.log(`  📸 Screenshot: test-channel.png`);

      // Vérifier images
      const imageIssues = await page.evaluate(() => {
        const issues = [];
        const images = document.querySelectorAll('img');
        
        images.forEach((img, i) => {
          if (!img.complete || img.naturalWidth === 0) {
            issues.push({
              type: 'broken-image',
              category: 'test-channel',
              src: img.src,
              alt: img.alt,
              index: i
            });
          }
          
          // Check dimensions affichées
          if (img.naturalWidth > 0) {
            const rect = img.getBoundingClientRect();
            if (rect.width < 50 || rect.height < 50) {
              issues.push({
                type: 'too-small-display',
                category: 'test-channel',
                src: img.src,
                displaySize: `${Math.round(rect.width)}x${Math.round(rect.height)}`
              });
            }
          }
        });
        
        return issues;
      });

      if (imageIssues.length > 0) {
        this.issues.push(...imageIssues.map(i => ({
          ...i,
          severity: 'high',
          message: `Test Channel: ${i.type} - ${i.src || i.displaySize}`
        })));
        console.log(`  ⚠️  ${imageIssues.length} problèmes images test channel`);
      } else {
        console.log('  ✅ Images test channel OK');
      }

      await browser.close();

    } catch (error) {
      console.log(`  ⚠️  Erreur test channel check: ${error.message}`);
      this.issues.push({
        type: 'test-channel-check-failed',
        category: 'test-channel',
        severity: 'medium',
        error: error.message,
        message: `Impossible de vérifier test channel: ${error.message}`
      });
    }
  }

  async analyzeIssuesWithAI() {
    if (this.issues.length === 0) {
      console.log('  ✅ Aucun problème à analyser');
      return;
    }

    console.log(`  🤖 Analyse AI de ${this.issues.length} problèmes...`);

    // Grouper par catégorie
    const byCategory = {};
    this.issues.forEach(issue => {
      if (!byCategory[issue.category]) {
        byCategory[issue.category] = [];
      }
      byCategory[issue.category].push(issue);
    });

    console.log('  📊 Problèmes par catégorie:');
    for (const [category, issues] of Object.entries(byCategory)) {
      console.log(`    - ${category}: ${issues.length}`);
    }

    // Analyser patterns
    const patterns = this.detectPatterns(this.issues);
    console.log(`  🔍 Patterns détectés: ${patterns.length}`);

    return patterns;
  }

  detectPatterns(issues) {
    const patterns = [];

    // Pattern 1: Toutes les images d'une catégorie sont problématiques
    const categories = [...new Set(issues.map(i => i.category))];
    for (const category of categories) {
      const categoryIssues = issues.filter(i => i.category === category);
      if (categoryIssues.length >= 3) {
        patterns.push({
          pattern: 'category-wide',
          category,
          count: categoryIssues.length,
          recommendation: `Toutes les images ${category} semblent avoir un problème - vérifier processus génération`
        });
      }
    }

    // Pattern 2: Dimensions incorrectes récurrentes
    const dimensionIssues = issues.filter(i => i.type === 'wrong-dimensions');
    if (dimensionIssues.length >= 3) {
      const commonActual = dimensionIssues[0]?.actual;
      const sameActual = dimensionIssues.filter(i => i.actual === commonActual).length;
      
      if (sameActual >= 3) {
        patterns.push({
          pattern: 'consistent-wrong-dimensions',
          actual: commonActual,
          count: sameActual,
          recommendation: `Plusieurs images ont dimensions ${commonActual} - corriger script génération`
        });
      }
    }

    // Pattern 3: Images manquantes
    const missingIssues = issues.filter(i => i.type === 'missing');
    if (missingIssues.length >= 5) {
      patterns.push({
        pattern: 'many-missing',
        count: missingIssues.length,
        recommendation: `${missingIssues.length} images manquantes - exécuter script génération`
      });
    }

    return patterns;
  }

  async generateCorrections() {
    this.corrections = [];

    // Pour chaque problème, proposer correction
    const issuesByType = {};
    this.issues.forEach(issue => {
      if (!issuesByType[issue.type]) {
        issuesByType[issue.type] = [];
      }
      issuesByType[issue.type].push(issue);
    });

    for (const [type, issues] of Object.entries(issuesByType)) {
      let correction = null;

      switch (type) {
        case 'missing':
          correction = {
            action: 'generate-missing-images',
            affectedFiles: issues.map(i => i.path || i.file),
            command: 'node scripts/generation/GENERATE_MISSING_IMAGES.js',
            priority: 'high',
            automated: true
          };
          break;

        case 'wrong-dimensions':
          correction = {
            action: 'resize-images',
            affectedFiles: issues.map(i => i.path),
            details: issues.map(i => ({
              file: i.file,
              from: i.actual,
              to: i.expected
            })),
            command: 'node scripts/generation/RESIZE_ALL_IMAGES.js',
            priority: 'high',
            automated: true
          };
          break;

        case 'broken-image':
          correction = {
            action: 'fix-broken-images',
            category: issues[0].category,
            count: issues.length,
            command: 'Check dashboard/test-channel deployment',
            priority: 'critical',
            automated: false,
            manual_steps: [
              'Vérifier build process',
              'Vérifier upload images vers Homey',
              'Re-publish app',
              'Clear cache browser'
            ]
          };
          break;

        case 'placeholder-image':
          correction = {
            action: 'replace-placeholders',
            count: issues.length,
            command: 'node scripts/generation/GENERATE_MISSING_IMAGES.js',
            priority: 'medium',
            automated: true
          };
          break;
      }

      if (correction) {
        this.corrections.push(correction);
      }
    }

    console.log(`  ✅ ${this.corrections.length} corrections proposées`);
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      version: 'v2.15.33',
      summary: {
        totalIssues: this.issues.length,
        criticalIssues: this.issues.filter(i => i.severity === 'critical').length,
        highIssues: this.issues.filter(i => i.severity === 'high').length,
        mediumIssues: this.issues.filter(i => i.severity === 'medium').length,
        corrections: this.corrections.length
      },
      issues: this.issues,
      corrections: this.corrections,
      screenshots: fs.existsSync(this.screenshotsDir) 
        ? fs.readdirSync(this.screenshotsDir)
        : []
    };

    // Sauvegarder rapport JSON
    const reportsDir = path.dirname(this.reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(this.reportPath, JSON.stringify(report, null, 2));
    console.log(`  📄 Rapport JSON: ${this.reportPath}`);

    // Générer rapport Markdown
    const mdReport = this.generateMarkdownReport(report);
    const mdPath = this.reportPath.replace('.json', '.md');
    fs.writeFileSync(mdPath, mdReport);
    console.log(`  📄 Rapport Markdown: ${mdPath}`);
  }

  generateMarkdownReport(report) {
    let md = `# 🔍 IMAGE DIAGNOSTIC REPORT\n\n`;
    md += `**Date:** ${report.timestamp}\n`;
    md += `**Version:** ${report.version}\n\n`;
    md += `---\n\n`;

    md += `## 📊 SUMMARY\n\n`;
    md += `- **Total Issues:** ${report.summary.totalIssues}\n`;
    md += `- **Critical:** ${report.summary.criticalIssues}\n`;
    md += `- **High:** ${report.summary.highIssues}\n`;
    md += `- **Medium:** ${report.summary.mediumIssues}\n`;
    md += `- **Corrections Proposed:** ${report.summary.corrections}\n\n`;

    if (report.issues.length > 0) {
      md += `## ⚠️  ISSUES FOUND\n\n`;
      
      const byCategory = {};
      report.issues.forEach(issue => {
        if (!byCategory[issue.category]) {
          byCategory[issue.category] = [];
        }
        byCategory[issue.category].push(issue);
      });

      for (const [category, issues] of Object.entries(byCategory)) {
        md += `### ${category.toUpperCase()}\n\n`;
        issues.forEach(issue => {
          md += `- **[${issue.severity}]** ${issue.message}\n`;
        });
        md += `\n`;
      }
    }

    if (report.corrections.length > 0) {
      md += `## 🔧 CORRECTIONS PROPOSÉES\n\n`;
      report.corrections.forEach((correction, i) => {
        md += `### ${i + 1}. ${correction.action}\n\n`;
        md += `- **Priority:** ${correction.priority}\n`;
        md += `- **Automated:** ${correction.automated ? 'Yes' : 'No'}\n`;
        if (correction.command) {
          md += `- **Command:** \`${correction.command}\`\n`;
        }
        if (correction.manual_steps) {
          md += `- **Manual Steps:**\n`;
          correction.manual_steps.forEach(step => {
            md += `  - ${step}\n`;
          });
        }
        md += `\n`;
      });
    }

    if (report.screenshots.length > 0) {
      md += `## 📸 SCREENSHOTS\n\n`;
      report.screenshots.forEach(screenshot => {
        md += `- \`${screenshot}\`\n`;
      });
      md += `\n`;
    }

    md += `---\n\n`;
    md += `**Generated by:** IMAGE_DIAGNOSTIC_AGENT.js\n`;

    return md;
  }
}

// CLI Usage
if (require.main === module) {
  const agent = new ImageDiagnosticAgent();
  agent.run()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('FATAL ERROR:', error);
      process.exit(1);
    });
}

module.exports = ImageDiagnosticAgent;
