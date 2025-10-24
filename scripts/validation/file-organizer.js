#!/usr/bin/env node
'use strict';

/**
 * FILE ORGANIZER MODULE
 * Module technique pour organiser intelligemment les fichiers
 */

const fs = require('fs');
const path = require('path');

class FileOrganizer {
  constructor(rootPath) {
    this.root = rootPath;
    this.stats = {
      moved: [],
      created: [],
      errors: []
    };
  }

  // Catégories de fichiers
  getFileCategory(filename) {
    const categories = {
      documentation: /\.(md|txt|pdf)$/i,
      reports: /REPORT|STATUS|SUMMARY|COMPLETE/i,
      scripts: /\.(js|ps1|sh|bat)$/i,
      data: /\.(json|yaml|yml|xml|csv)$/i,
      images: /\.(png|jpg|jpeg|gif|svg)$/i,
      configs: /(package\.json|app\.json|\.gitignore|\.npmrc)$/i,
      temp: /\.(tmp|log|bak|old)$/i
    };

    for (const [category, pattern] of Object.entries(categories)) {
      if (pattern.test(filename)) return category;
    }
    return 'other';
  }

  // Créer structure de dossiers
  ensureStructure() {
    const dirs = [
      'docs',
      'reports',
      'project-data',
      'scripts/modules',
      'scripts/automation',
      'scripts/maintenance',
      'scripts/deployment',
      'scripts/enrichment',
      '.archive/old-files',
      '.archive/old-scripts',
      '.temp'
    ];

    for (const dir of dirs) {
      const fullPath = path.join(this.root, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        this.stats.created.push(dir);
      }
    }
  }

  // Organiser fichiers racine
  organizeRootFiles() {
    const rootFiles = fs.readdirSync(this.root);
    
    for (const file of rootFiles) {
      const filePath = path.join(this.root, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isFile()) {
        const category = this.getFileCategory(file);
        let targetDir = null;

        // Déterminer destination
        if (file.includes('REPORT') || file.includes('STATUS') || file.includes('SUMMARY')) {
          targetDir = 'reports';
        } else if (category === 'documentation' && !['README.md', 'CHANGELOG.md', 'LICENSE'].includes(file)) {
          targetDir = 'docs';
        } else if (category === 'data') {
          targetDir = 'project-data';
        } else if (category === 'temp') {
          targetDir = '.temp';
        }

        // Déplacer si nécessaire
        if (targetDir) {
          const target = path.join(this.root, targetDir, file);
          try {
            if (!fs.existsSync(target)) {
              fs.copyFileSync(filePath, target);
              this.stats.moved.push(`${file} → ${targetDir}/`);
            }
          } catch (err) {
            this.stats.errors.push(`${file}: ${err.message}`);
          }
        }
      }
    }
  }

  // Nettoyer duplicats
  removeDuplicates() {
    // Identifier et supprimer les doublons basiques
    const files = this.getAllFiles(this.root);
    const seen = new Map();

    for (const file of files) {
      const basename = path.basename(file);
      const stat = fs.statSync(file);
      const key = `${basename}-${stat.size}`;

      if (seen.has(key)) {
        // Duplicat potentiel
        const original = seen.get(key);
        if (this.areFilesIdentical(original, file)) {
          // Déplacer vers archive au lieu de supprimer
          const archivePath = path.join(this.root, '.archive', 'old-files', basename);
          try {
            fs.copyFileSync(file, archivePath);
            this.stats.moved.push(`Duplicate: ${basename} → .archive/`);
          } catch (err) {
            // Ignore si déjà existe
          }
        }
      } else {
        seen.set(key, file);
      }
    }
  }

  // Vérifier si fichiers identiques
  areFilesIdentical(file1, file2) {
    try {
      const content1 = fs.readFileSync(file1);
      const content2 = fs.readFileSync(file2);
      return content1.equals(content2);
    } catch {
      return false;
    }
  }

  // Récupérer tous les fichiers
  getAllFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        this.getAllFiles(filePath, fileList);
      } else if (stat.isFile()) {
        fileList.push(filePath);
      }
    }
    
    return fileList;
  }

  // Exécuter organisation
  run() {
    console.log('📁 File Organizer Module');
    console.log('═'.repeat(60));

    this.ensureStructure();
    this.organizeRootFiles();
    this.removeDuplicates();

    console.log(`\n✅ Created: ${this.stats.created.length} directories`);
    console.log(`✅ Moved: ${this.stats.moved.length} files`);
    if (this.stats.errors.length > 0) {
      console.log(`⚠️  Errors: ${this.stats.errors.length}`);
    }

    return this.stats;
  }
}

module.exports = FileOrganizer;
