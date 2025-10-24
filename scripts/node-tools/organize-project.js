#!/usr/bin/env node

/**
 * Organize project files into proper structure
 * Comprehensive file organization and cleanup
 */

import path from 'path';
import fs from 'fs/promises';
import { logger } from './lib/logger.js';
import { exists, ensureDir, getProjectRoot, copyFile, deleteFile, getFiles } from './lib/file-utils.js';

const PROJECT_ROOT = getProjectRoot();

const ORGANIZATION_MAP = {
  // Documentation
  docs: {
    path: 'docs',
    patterns: ['*.md', '*.txt'],
    exclude: ['README.md', 'CHANGELOG.md', 'LICENSE.md', 'CONTRIBUTING.md'],
    subdirs: {
      fixes: ['*FIX*.md', '*DIAGNOSTIC*.md', '*BUG*.md'],
      workflow: ['*WORKFLOW*.md', '*PUBLISH*.md', '*GUIDE*.md'],
      community: ['*COMMUNITY*.md', '*FORUM*.md', '*FAQ*.md'],
      analysis: ['*ANALYSIS*.md', '*AUDIT*.md', '*REPORT*.md']
    }
  },
  
  // Scripts
  scripts: {
    path: 'scripts',
    patterns: ['*.ps1', '*.js', '*.sh'],
    exclude: ['app.js', 'api.js'],
    subdirs: {
      automation: ['*commit*.ps1', '*publish*.ps1', '*auto*.ps1', '*smart*.ps1'],
      fixes: ['*fix*.ps1', '*repair*.ps1'],
      utils: ['*create*.ps1', '*add*.ps1', '*remove*.ps1'],
      deployment: ['*deploy*.ps1', '*push*.ps1', '*force*.ps1'],
      monitoring: ['*monitor*.ps1', '*watch*.ps1']
    }
  },
  
  // Project data & reports
  'project-data': {
    path: 'project-data',
    patterns: ['*.json', '*.csv', '*.html'],
    exclude: ['package.json', 'package-lock.json', 'app.json'],
    subdirs: {
      reports: ['*REPORT*.json', '*ANALYSIS*.json'],
      exports: ['*EXPORT*.csv', '*EXPORT*.html', '*DATABASE*.csv'],
      backups: ['*backup*.json', '*.bak']
    }
  },
  
  // Build artifacts
  build: {
    path: 'build',
    patterns: ['*.tar.gz', '*.zip'],
    subdirs: {}
  },
  
  // Temporary files
  temp: {
    path: '.temp',
    patterns: ['*.tmp', '*.temp', '*.log'],
    subdirs: {}
  }
};

class ProjectOrganizer {
  constructor() {
    this.stats = {
      filesMoved: 0,
      filesSkipped: 0,
      errors: 0,
      dirsCreated: 0
    };
  }

  async organize() {
    logger.title('ORGANISATION COMPLÈTE DU PROJET');
    
    try {
      // Step 1: Create directory structure
      await this.createDirectories();
      
      // Step 2: Organize files
      await this.organizeFiles();
      
      // Step 3: Clean up empty directories
      await this.cleanupEmptyDirs();
      
      // Step 4: Update .gitignore
      await this.updateGitignore();
      
      // Display summary
      this.displaySummary();
      
      logger.success('\n✅ Organisation terminée avec succès!\n');
      
    } catch (error) {
      logger.error(`Erreur lors de l'organisation: ${error.message}`);
      throw error;
    }
  }

  async createDirectories() {
    logger.section('📁 Création de la structure des dossiers');
    
    for (const [category, config] of Object.entries(ORGANIZATION_MAP)) {
      const mainDir = path.join(PROJECT_ROOT, config.path);
      
      if (!await exists(mainDir)) {
        await ensureDir(mainDir);
        this.stats.dirsCreated++;
        logger.success(`  ✓ Créé: ${config.path}`);
      }
      
      // Create subdirectories
      for (const subdir of Object.keys(config.subdirs || {})) {
        const subdirPath = path.join(mainDir, subdir);
        if (!await exists(subdirPath)) {
          await ensureDir(subdirPath);
          this.stats.dirsCreated++;
          logger.success(`  ✓ Créé: ${path.join(config.path, subdir)}`);
        }
      }
    }
    
    console.log('');
  }

  async organizeFiles() {
    logger.section('📦 Organisation des fichiers');
    
    // Get all files in root
    const rootFiles = await fs.readdir(PROJECT_ROOT);
    
    for (const file of rootFiles) {
      const filePath = path.join(PROJECT_ROOT, file);
      const stats = await fs.stat(filePath);
      
      if (!stats.isFile()) continue;
      
      // Determine destination
      const destination = await this.getDestination(file);
      
      if (destination) {
        try {
          const destPath = path.join(PROJECT_ROOT, destination, file);
          
          // Check if destination already exists
          if (await exists(destPath)) {
            logger.warning(`  ⚠️  Skipped (exists): ${file}`);
            this.stats.filesSkipped++;
            continue;
          }
          
          // Move file
          await fs.rename(filePath, destPath);
          this.stats.filesMoved++;
          logger.success(`  ✓ Moved: ${file} → ${destination}/`);
          
        } catch (error) {
          logger.error(`  ✗ Error moving ${file}: ${error.message}`);
          this.stats.errors++;
        }
      } else {
        // File should stay in root
        this.stats.filesSkipped++;
      }
    }
    
    console.log('');
  }

  async getDestination(filename) {
    const ext = path.extname(filename).toLowerCase();
    const basename = path.basename(filename, ext);
    
    for (const [category, config] of Object.entries(ORGANIZATION_MAP)) {
      // Check if file should be excluded
      if (config.exclude?.some(pattern => 
        filename.match(new RegExp(String(pattern).replace('*', '.*')))
      )) {
        continue;
      }
      
      // Check if file matches patterns
      const matchesPattern = config.patterns?.some(pattern => {
        const regex = new RegExp(String(pattern).replace('*', '.*').replace('.', '\\.'));
        return regex.test(filename);
      });
      
      if (!matchesPattern) continue;
      
      // Check for subdirectory placement
      for (const [subdir, patterns] of Object.entries(config.subdirs || {})) {
        if (patterns.some(pattern => {
          const regex = new RegExp(String(pattern).replace('*', '.*'), 'i');
          return regex.test(filename);
        })) {
          return path.join(config.path, subdir);
        }
      }
      
      // Return main directory
      return config.path;
    }
    
    return null; // Stay in root
  }

  async cleanupEmptyDirs() {
    logger.section('🧹 Nettoyage des dossiers vides');
    
    let cleaned = 0;
    
    // Recursively check directories
    async function checkAndClean(dirPath) {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        if (entries.length === 0) {
          await fs.rmdir(dirPath);
          cleaned++;
          return true;
        }
        
        // Check subdirectories
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const subdirPath = path.join(dirPath, entry.name);
            await checkAndClean(subdirPath);
          }
        }
        
        return false;
      } catch (error) {
        // Ignore errors for non-empty directories
        return false;
      }
    }
    
    // Check main project directories
    for (const config of Object.values(ORGANIZATION_MAP)) {
      const dirPath = path.join(PROJECT_ROOT, config.path);
      if (await exists(dirPath)) {
        await checkAndClean(dirPath);
      }
    }
    
    if (cleaned > 0) {
      logger.success(`  ✓ ${cleaned} dossiers vides supprimés`);
    } else {
      logger.info('  ℹ️  Aucun dossier vide trouvé');
    }
    
    console.log('');
  }

  async updateGitignore() {
    logger.section('📝 Mise à jour .gitignore');
    
    const gitignorePath = path.join(PROJECT_ROOT, '.gitignore');
    
    const newEntries = [
      '# Project data & reports',
      'project-data/*.json',
      'project-data/reports/',
      'project-data/exports/',
      'project-data/backups/',
      '',
      '# Build artifacts',
      'build/',
      '*.tar.gz',
      '*.zip',
      '',
      '# Temporary files',
      '.temp/',
      '*.tmp',
      '*.log',
      'orchestration_log_*.txt',
      '',
      '# Node modules (tools)',
      'scripts/node-tools/node_modules/'
    ];
    
    try {
      let gitignore = '';
      
      if (await exists(gitignorePath)) {
        gitignore = await fs.readFile(gitignorePath, 'utf8');
      }
      
      // Add new entries if not present
      let added = 0;
      for (const entry of newEntries) {
        if (entry && !gitignore.includes(entry)) {
          gitignore += `\n${entry}`;
          added++;
        }
      }
      
      if (added > 0) {
        await fs.writeFile(gitignorePath, gitignore, 'utf8');
        logger.success(`  ✓ ${added} nouvelles entrées ajoutées à .gitignore`);
      } else {
        logger.info('  ℹ️  .gitignore déjà à jour');
      }
      
    } catch (error) {
      logger.warning(`  ⚠️  Erreur mise à jour .gitignore: ${error.message}`);
    }
    
    console.log('');
  }

  displaySummary() {
    logger.section('📊 RÉSUMÉ DE L\'ORGANISATION');
    
    logger.summary('Statistiques', [
      { label: 'Dossiers créés', value: this.stats.dirsCreated, status: 'success' },
      { label: 'Fichiers déplacés', value: this.stats.filesMoved, status: 'success' },
      { label: 'Fichiers ignorés', value: this.stats.filesSkipped, status: 'warning' },
      { label: 'Erreurs', value: this.stats.errors, status: this.stats.errors > 0 ? 'error' : 'success' }
    ]);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const organizer = new ProjectOrganizer();
  
  organizer.organize()
    .then(() => process.exit(0))
    .catch(error => {
      logger.error(`Erreur fatale: ${error.message}`);
      console.error(error.stack);
      process.exit(1);
    });
}

export default ProjectOrganizer;
