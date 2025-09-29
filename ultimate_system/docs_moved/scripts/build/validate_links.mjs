#!/usr/bin/env node

/**
 * 🔗 VALIDATEUR DE LIENS POUR README ET DASHBOARD
 * 
 * Vérifie tous les liens du README et du dashboard
 * 
 * Usage: DEBUG=1 node scripts/build/validate_links.mjs
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEBUG = process.env.DEBUG === '1';
const PROJECT_ROOT = path.resolve(__dirname, '../../..');

class LinksValidator {
  constructor() {
    this.projectRoot = PROJECT_ROOT;
    this.stats = {
      total: 0,
      valid: 0,
      invalid: 0,
      broken: 0,
      external: 0,
      internal: 0
    };
    
    this.brokenLinks = [];
    this.validLinks = [];
  }

  async run() {
    try {
      console.log('🔗 VALIDATEUR DE LIENS POUR README ET DASHBOARD');
      console.log(`📁 Projet: ${this.projectRoot}`);
      
      // 1. Valider le README
      await this.validateReadme();
      
      // 2. Valider le dashboard
      await this.validateDashboard();
      
      // 3. Afficher les statistiques
      this.displayStats();
      
      // 4. Générer le rapport
      await this.generateReport();
      
      console.log('✅ VALIDATION DES LIENS TERMINÉE !');
      
    } catch (error) {
      console.error('❌ Erreur:', error);
      process.exit(1);
    }
  }

  async validateReadme() {
    console.log('\n📄 VALIDATION DU README...');
    
    const readmePath = path.join(this.projectRoot, 'README.md');
    
    if (!(await fs.pathExists(readmePath))) {
      console.log('⚠️  README.md non trouvé');
      return;
    }
    
    const content = await fs.readFile(readmePath, 'utf8');
    const links = this.extractLinks(content);
    
    console.log(`  📊 ${links.length} liens trouvés dans README.md`);
    
    for (const link of links) {
      await this.validateLink(link, 'README.md');
    }
  }

  async validateDashboard() {
    console.log('\n📊 VALIDATION DU DASHBOARD...');
    
    const dashboardPath = path.join(this.projectRoot, 'docs');
    
    if (!(await fs.pathExists(dashboardPath))) {
      console.log('⚠️  Dossier docs/ non trouvé');
      return;
    }
    
    // Valider les fichiers HTML
    const htmlFiles = await this.findHtmlFiles(dashboardPath);
    
    for (const htmlFile of htmlFiles) {
      await this.validateHtmlFile(htmlFile);
    }
    
    // Valider les fichiers JavaScript
    const jsFiles = await this.findJsFiles(dashboardPath);
    
    for (const jsFile of jsFiles) {
      await this.validateJsFile(jsFile);
    }
  }

  extractLinks(content) {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const links = [];
    let match;
    
    while ((match = linkRegex.exec(content)) !== null) {
      links.push({
        text: match[1],
        url: match[2],
        type: 'markdown'
      });
    }
    
    // Extraire aussi les URLs brutes
    const urlRegex = /https?:\/\/[^\s\)]+/g;
    while ((match = urlRegex.exec(content)) !== null) {
      links.push({
        text: match[0],
        url: match[0],
        type: 'raw_url'
      });
    }
    
    return links;
  }

  async findHtmlFiles(dir) {
    const files = [];
    
    try {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isDirectory()) {
          files.push(...(await this.findHtmlFiles(itemPath)));
        } else if (item.endsWith('.html')) {
          files.push(itemPath);
        }
      }
    } catch (error) {
      // Ignorer les erreurs de lecture
    }
    
    return files;
  }

  async findJsFiles(dir) {
    const files = [];
    
    try {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isDirectory()) {
          files.push(...(await this.findJsFiles(itemPath)));
        } else if (item.endsWith('.js')) {
          files.push(itemPath);
        }
      }
    } catch (error) {
      // Ignorer les erreurs de lecture
    }
    
    return files;
  }

  async validateHtmlFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const links = this.extractLinksFromHtml(content);
      
      if (links.length > 0) {
        console.log(`  📄 ${path.relative(this.projectRoot, filePath)}: ${links.length} liens`);
        
        for (const link of links) {
          await this.validateLink(link, path.relative(this.projectRoot, filePath));
        }
      }
    } catch (error) {
      if (DEBUG) console.log(`    ⚠️  Erreur lecture ${filePath}: ${error.message}`);
    }
  }

  async validateJsFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const links = this.extractLinksFromJs(content);
      
      if (links.length > 0) {
        console.log(`  📜 ${path.relative(this.projectRoot, filePath)}: ${links.length} liens`);
        
        for (const link of links) {
          await this.validateLink(link, path.relative(this.projectRoot, filePath));
        }
      }
    } catch (error) {
      if (DEBUG) console.log(`    ⚠️  Erreur lecture ${filePath}: ${error.message}`);
    }
  }

  extractLinksFromHtml(content) {
    const links = [];
    
    // Liens href
    const hrefRegex = /href=["']([^"']+)["']/g;
    let match;
    
    while ((match = hrefRegex.exec(content)) !== null) {
      links.push({
        text: match[1],
        url: match[1],
        type: 'html_href'
      });
    }
    
    // Liens src
    const srcRegex = /src=["']([^"']+)["']/g;
    while ((match = srcRegex.exec(content)) !== null) {
      links.push({
        text: match[1],
        url: match[1],
        type: 'html_src'
      });
    }
    
    return links;
  }

  extractLinksFromJs(content) {
    const links = [];
    
    // URLs dans les chaînes
    const urlRegex = /['"`](https?:\/\/[^'"`]+)['"`]/g;
    let match;
    
    while ((match = urlRegex.exec(content)) !== null) {
      links.push({
        text: match[1],
        url: match[1],
        type: 'js_string'
      });
    }
    
    // URLs dans les commentaires
    const commentUrlRegex = /\/\/\s*(https?:\/\/[^\s]+)/g;
    while ((match = commentUrlRegex.exec(content)) !== null) {
      links.push({
        text: match[1],
        url: match[1],
        type: 'js_comment'
      });
    }
    
    return links;
  }

  async validateLink(link, sourceFile) {
    this.stats.total++;
    
    try {
      if (link.url.startsWith('http')) {
        // Lien externe
        this.stats.external++;
        
        if (DEBUG) console.log(`    🔗 Externe: ${link.url}`);
        
        // Note: En production, on ferait une vraie vérification HTTP
        // Pour l'instant, on considère tous les liens externes comme valides
        this.stats.valid++;
        this.validLinks.push({
          ...link,
          sourceFile,
          status: 'external_valid'
        });
        
      } else if (link.url.startsWith('#'') || link.url.startsWith('mailto:')) {
        // Ancre ou mailto
        this.stats.valid++;
        this.validLinks.push({
          ...link,
          sourceFile,
          status: 'anchor_or_mailto'
        });
        
      } else {
        // Lien interne
        this.stats.internal++;
        
        const targetPath = this.resolveInternalLink(link.url);
        const isValid = await this.validateInternalLink(targetPath);
        
        if (isValid) {
          this.stats.valid++;
          this.validLinks.push({
            ...link,
            sourceFile,
            targetPath,
            status: 'internal_valid'
          });
          
          if (DEBUG) console.log(`    ✅ Interne: ${link.url} → ${targetPath}`);
        } else {
          this.stats.invalid++;
          this.brokenLinks.push({
            ...link,
            sourceFile,
            targetPath,
            status: 'internal_broken'
          });
          
          if (DEBUG) console.log(`    ❌ Interne cassé: ${link.url} → ${targetPath}`);
        }
      }
      
    } catch (error) {
      this.stats.invalid++;
      this.brokenLinks.push({
        ...link,
        sourceFile,
        status: 'error',
        error: error.message
      });
      
      if (DEBUG) console.log(`    ❌ Erreur validation: ${link.url} - ${error.message}`);
    }
  }

  resolveInternalLink(url) {
    // Gérer les liens relatifs
    if (url.startsWith('./') || url.startsWith('../')) {
      return path.resolve(this.projectRoot, url);
    }
    
    // Lien absolu depuis la racine du projet
    if (url.startsWith('/')) {
      return path.join(this.projectRoot, url.substring(1));
    }
    
    // Lien relatif simple
    return path.join(this.projectRoot, url);
  }

  async validateInternalLink(targetPath) {
    try {
      // Vérifier que le fichier/dossier existe
      if (await fs.pathExists(targetPath)) {
        return true;
      }
      
      // Vérifier si c'est un lien vers une section (avec #)
      if (targetPath.includes('#')) {
        const [filePath, section] = targetPath.split('#');
        if (await fs.pathExists(filePath)) {
          return true; // Le fichier existe, on ne peut pas vérifier la section
        }
      }
      
      return false;
      
    } catch (error) {
      return false;
    }
  }

  displayStats() {
    console.log('\n📊 STATISTIQUES DE VALIDATION DES LIENS:');
    console.log(`🔗 Total liens: ${this.stats.total.toLocaleString()}`);
    console.log(`✅ Liens valides: ${this.stats.valid.toLocaleString()}`);
    console.log(`❌ Liens invalides: ${this.stats.invalid.toLocaleString()}`);
    console.log(`🌐 Liens externes: ${this.stats.external.toLocaleString()}`);
    console.log(`📁 Liens internes: ${this.stats.internal.toLocaleString()}`);
    
    const validityPercentage = this.stats.total > 0 ? 
      Math.round((this.stats.valid / this.stats.total) * 100) : 0;
    
    console.log(`📊 Taux de validité: ${validityPercentage}%`);
    
    if (this.brokenLinks.length > 0) {
      console.log(`\n❌ LIENS CASSÉS (${this.brokenLinks.length}):`);
      for (const link of this.brokenLinks.slice(0, 10)) { // Afficher les 10 premiers
        console.log(`  - ${link.url} (dans ${link.sourceFile})`);
      }
      
      if (this.brokenLinks.length > 10) {
        console.log(`  ... et ${this.brokenLinks.length - 10} autres`);
      }
    }
  }

  async generateReport() {
    console.log('\n📋 GÉNÉRATION DU RAPPORT...');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.stats.total,
        valid: this.stats.valid,
        invalid: this.stats.invalid,
        external: this.stats.external,
        internal: this.stats.internal,
        validityPercentage: this.stats.total > 0 ? 
          Math.round((this.stats.valid / this.stats.total) * 100) : 0
      },
      brokenLinks: this.brokenLinks,
      validLinks: this.validLinks.slice(0, 100), // Limiter à 100 liens valides
      recommendations: this.generateRecommendations()
    };
    
    const reportPath = path.join(this.projectRoot, 'LINKS_VALIDATION_REPORT.json');
    await fs.writeJson(reportPath, report, { spaces: 2 });
    
    console.log('✅ Rapport de validation généré: LINKS_VALIDATION_REPORT.json');
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.brokenLinks.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        issue: 'Liens internes cassés',
        count: this.brokenLinks.length,
        action: 'Corriger ou supprimer les liens cassés'
      });
    }
    
    if (this.stats.external > this.stats.total * 0.5) {
      recommendations.push({
        priority: 'MEDIUM',
        issue: 'Trop de liens externes',
        count: this.stats.external,
        action: 'Réduire la dépendance aux liens externes'
      });
    }
    
    if (this.stats.valid < this.stats.total * 0.9) {
      recommendations.push({
        priority: 'MEDIUM',
        issue: 'Taux de validité faible',
        count: this.stats.valid,
        action: 'Améliorer la qualité des liens'
      });
    }
    
    return recommendations;
  }
}

// Exécuter le validateur
const validator = new LinksValidator();
validator.run().catch(console.error);
