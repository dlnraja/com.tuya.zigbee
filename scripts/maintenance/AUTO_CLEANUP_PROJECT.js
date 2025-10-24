#!/usr/bin/env node

/**
 * AUTO CLEANUP PROJECT
 * 
 * Nettoie automatiquement le projet:
 * - Supprime fichiers temporaires
 * - Organise les rapports
 * - Nettoie les caches
 * - Prépare pour push
 * 
 * @version 2.1.42
 * @author Dylan Rajasekaram
 */

const fs = require('fs');
const path = require('path');

class AutoCleanup {
  constructor() {
    this.rootDir = path.join(__dirname, '..');
    this.cleaned = [];
  }

  log(msg, symbol = 'ℹ') {
    console.log(`${symbol} ${msg}`);
  }

  async run() {
    try {
      console.log('\n' + '='.repeat(80));
      console.log('🧹 AUTO CLEANUP PROJECT');
      console.log('='.repeat(80) + '\n');

      // 1. Nettoyer .homeybuild
      this.cleanDirectory('.homeybuild', 'Cache Homey build');

      // 2. Nettoyer node_modules/.cache
      this.cleanDirectory('node_modules/.cache', 'Cache Node.js');

      // 3. Organiser les rapports
      this.organizeReports();

      // 4. Supprimer fichiers temporaires
      this.cleanTempFiles();

      // 5. Vérifier .gitignore
      this.verifyGitignore();

      console.log('\n' + '='.repeat(80));
      console.log(`✅ NETTOYAGE TERMINÉ - ${this.cleaned.length} actions`);
      console.log('='.repeat(80) + '\n');

    } catch (error) {
      console.error(`\n❌ ERREUR: ${error.message}\n`);
      process.exit(1);
    }
  }

  cleanDirectory(dirPath, description) {
    const fullPath = path.join(this.rootDir, dirPath);
    if (fs.existsSync(fullPath)) {
      try {
        fs.rmSync(fullPath, { recursive: true, force: true });
        this.log(`✓ ${description} supprimé`, '✓');
        this.cleaned.push(dirPath);
      } catch (error) {
        this.log(`⚠ ${description}: ${error.message}`, '⚠');
      }
    }
  }

  organizeReports() {
    const reportsDir = path.join(this.rootDir, 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Déplacer les rapports de la racine vers reports/
    const rootFiles = fs.readdirSync(this.rootDir);
    const reportPatterns = ['RAPPORT', 'REPORT', 'DIAGNOSTIC', 'VALIDATION', 'FIX', 'SUMMARY'];

    rootFiles.forEach(file => {
      const shouldMove = reportPatterns.some(pattern => 
        file.toUpperCase().includes(pattern) && 
        (file.endsWith('.md') || file.endsWith('.json') || file.endsWith('.txt'))
      );

      if (shouldMove) {
        const sourcePath = path.join(this.rootDir, file);
        const destPath = path.join(reportsDir, file);
        
        if (fs.statSync(sourcePath).isFile() && !fs.existsSync(destPath)) {
          fs.copyFileSync(sourcePath, destPath);
          this.log(`✓ ${file} déplacé vers reports/`, '✓');
          this.cleaned.push(file);
        }
      }
    });
  }

  cleanTempFiles() {
    const tempPatterns = [
      '*.tmp',
      '*.temp',
      '*.log',
      '*~',
      '.DS_Store',
      'Thumbs.db'
    ];

    const rootFiles = fs.readdirSync(this.rootDir);
    
    rootFiles.forEach(file => {
      const shouldDelete = tempPatterns.some(pattern => {
        const regex = new RegExp(String(pattern).replace('*', '.*'));
        return regex.test(file);
      });

      if (shouldDelete) {
        const filePath = path.join(this.rootDir, file);
        try {
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
            this.log(`✓ ${file} supprimé (fichier temporaire)`, '✓');
            this.cleaned.push(file);
          }
        } catch (error) {
          // Ignore
        }
      }
    });
  }

  verifyGitignore() {
    const gitignorePath = path.join(this.rootDir, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const content = fs.readFileSync(gitignorePath, 'utf-8');
      
      const requiredEntries = [
        '.homeybuild/',
        '.homeycompose/',
        'node_modules/',
        '*.env',
        '*.log',
        '.DS_Store',
        'Thumbs.db'
      ];

      const missing = requiredEntries.filter(entry => !content.includes(entry));
      
      if (missing.length === 0) {
        this.log('✓ .gitignore vérifié', '✓');
      } else {
        this.log(`⚠ .gitignore manque: ${missing.join(', ')}`, '⚠');
      }
    }
  }
}

if (require.main === module) {
  const cleanup = new AutoCleanup();
  cleanup.run();
}

module.exports = AutoCleanup;
