#!/usr/bin/env node
'use strict';

/**
 * 🔧 Module de Préparation - Version 3.5.0
 * Préparation et nettoyage du projet avant exécution
 */

const fs = require('fs');
const path = require('path');

class ProjectPreparation {
  constructor() {
    this.config = {
      version: '3.5.0',
      tempDirs: [
        '.tmp_*',
        'dumps',
        'evidence',
        'backups'
      ],
      cleanupPatterns: [
        'FINAL_*_REPORT_*.json',
        'MEGA_*_REPORT_*.json',
        '*.log',
        '*.tmp'
      ]
    };
  }

  async run() {
    console.log('🔧 Préparation du projet...');
    
    try {
      await this.cleanupTemporaryFiles();
      await this.validateProjectStructure();
      await this.prepareComposeFiles();
      await this.cleanupJSONFiles();
      
      console.log('✅ Préparation terminée avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de la préparation:', error.message);
      throw error;
    }
  }

  /**
   * 🧹 Nettoyage des fichiers temporaires
   */
  async cleanupTemporaryFiles() {
    console.log('  🧹 Nettoyage des fichiers temporaires...');
    
    const currentDir = process.cwd();
    const entries = fs.readdirSync(currentDir);
    
    for (const entry of entries) {
      if (entry.startsWith('.tmp_') || entry === 'dumps' || entry === 'evidence') {
        const fullPath = path.join(currentDir, entry);
        if (fs.statSync(fullPath).isDirectory()) {
          console.log(`    📁 Suppression: ${entry}`);
          this.removeDirectoryRecursive(fullPath);
        }
      }
    }
  }

  /**
   * 📁 Suppression récursive d'un répertoire
   */
  removeDirectoryRecursive(dirPath) {
    if (fs.existsSync(dirPath)) {
      fs.readdirSync(dirPath).forEach((file) => {
        const curPath = path.join(dirPath, file);
        if (fs.lstatSync(curPath).isDirectory()) {
          this.removeDirectoryRecursive(curPath);
        } else {
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(dirPath);
    }
  }

  /**
   * 🏗️ Validation de la structure du projet
   */
  async validateProjectStructure() {
    console.log('  🏗️ Validation de la structure...');
    
    const requiredDirs = ['drivers', 'lib', 'tools'];
    const requiredFiles = ['app.json', 'package.json'];
    
    for (const dir of requiredDirs) {
      if (!fs.existsSync(dir)) {
        throw new Error(`Répertoire requis manquant: ${dir}`);
      }
    }
    
    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        throw new Error(`Fichier requis manquant: ${file}`);
      }
    }
    
    console.log('    ✅ Structure du projet valide');
  }

  /**
   * 📝 Préparation des fichiers compose
   */
  async prepareComposeFiles() {
    console.log('  📝 Préparation des fichiers compose...');
    
    const driversDir = path.join(process.cwd(), 'drivers');
    const composeFiles = this.findComposeFiles(driversDir);
    
    for (const composeFile of composeFiles) {
      await this.prepareComposeFile(composeFile);
    }
    
    console.log(`    ✅ ${composeFiles.length} fichiers compose préparés`);
  }

  /**
   * 🔍 Recherche des fichiers compose
   */
  findComposeFiles(dir) {
    const composeFiles = [];
    
    const walkDir = (currentDir) => {
      const entries = fs.readdirSync(currentDir);
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          walkDir(fullPath);
        } else if (entry === 'driver.compose.json') {
          composeFiles.push(fullPath);
        }
      }
    };
    
    walkDir(dir);
    return composeFiles;
  }

  /**
   * 📄 Préparation d'un fichier compose
   */
  async prepareComposeFile(composePath) {
    try {
      let content = fs.readFileSync(composePath, 'utf8');
      
      // Suppression du BOM
      content = content.replace(/^\uFEFF/, '');
      
      // Nettoyage des commentaires et virgules trailing
      content = content.replace(/\/\*[\s\S]*?\*\//g, '');
      content = content.replace(/\/\/.*$/gm, '');
      content = content.replace(/,(\s*[}\]])/g, '$1');
      
      // Validation JSON
      JSON.parse(content);
      
      // Sauvegarde du fichier nettoyé
      fs.writeFileSync(composePath, content);
    } catch (error) {
      console.warn(`    ⚠️ Fichier compose invalide: ${composePath}`);
    }
  }

  /**
   * 🧹 Nettoyage des fichiers JSON
   */
  async cleanupJSONFiles() {
    console.log('  🧹 Nettoyage des fichiers JSON...');
    
    const jsonFiles = this.findJSONFiles(process.cwd());
    let cleanedCount = 0;
    
    for (const jsonFile of jsonFiles) {
      if (await this.cleanupJSONFile(jsonFile)) {
        cleanedCount++;
      }
    }
    
    console.log(`    ✅ ${cleanedCount} fichiers JSON nettoyés`);
  }

  /**
   * 🔍 Recherche des fichiers JSON
   */
  findJSONFiles(dir) {
    const jsonFiles = [];
    
    const walkDir = (currentDir) => {
      const entries = fs.readdirSync(currentDir);
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
          walkDir(fullPath);
        } else if (entry.endsWith('.json')) {
          jsonFiles.push(fullPath);
        }
      }
    };
    
    walkDir(dir);
    return jsonFiles;
  }

  /**
   * 🧹 Nettoyage d'un fichier JSON
   */
  async cleanupJSONFile(jsonPath) {
    try {
      let content = fs.readFileSync(jsonPath, 'utf8');
      let originalContent = content;
      
      // Suppression du BOM
      content = content.replace(/^\uFEFF/, '');
      
      // Suppression des commentaires
      content = content.replace(/\/\*[\s\S]*?\*\//g, '');
      content = content.replace(/\/\/.*$/gm, '');
      
      // Suppression des virgules trailing
      content = content.replace(/,(\s*[}\]])/g, '$1');
      
      // Validation JSON
      JSON.parse(content);
      
      // Sauvegarde si modifié
      if (content !== originalContent) {
        fs.writeFileSync(jsonPath, content);
        return true;
      }
      
      return false;
    } catch (error) {
      console.warn(`    ⚠️ Fichier JSON invalide: ${jsonPath}`);
      return false;
    }
  }
}

// Point d'entrée
if (require.main === module) {
  const preparation = new ProjectPreparation();
  preparation.run().catch(console.error);
}

module.exports = ProjectPreparation;
