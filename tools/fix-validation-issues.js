#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

class ValidationFixer {
  constructor() {
    this.fixes = {
      jsonFixed: 0,
      iconsAdded: 0,
      translationsFixed: 0,
      errors: []
    };
  }

  async fixAllIssues() {
    console.log('🔧 CORRECTION AUTOMATIQUE DES PROBLÈMES DE VALIDATION');
    console.log('='.repeat(60));

    await this.fixInvalidJSON();
    await this.fixMissingIcons();
    await this.fixMissingTranslations();
    
    this.generateReport();
  }

  async fixInvalidJSON() {
    console.log('\n🔍 Correction des fichiers JSON invalides...');
    
    const jsonFiles = this.findJsonFiles('.');
    let fixed = 0;
    
    for (const file of jsonFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        JSON.parse(content);
      } catch (error) {
        try {
          // Essayer de corriger le JSON
          const fixedContent = this.fixJSONContent(content);
          if (fixedContent) {
            fs.writeFileSync(file, fixedContent);
            fixed++;
            console.log(`✅ JSON corrigé: ${file}`);
          }
        } catch (fixError) {
          this.fixes.errors.push(`Erreur correction ${file}: ${fixError.message}`);
        }
      }
    }
    
    this.fixes.jsonFixed = fixed;
    console.log(`✅ ${fixed} fichiers JSON corrigés`);
  }

  fixJSONContent(content) {
    // Supprimer les caractères BOM
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }
    
    // Supprimer les commentaires de fin de ligne
    content = content.replace(/\/\/.*$/gm, '');
    
    // Supprimer les virgules trailing
    content = content.replace(/,(\s*[}\]])/g, '$1');
    
    // Essayer de parser
    try {
      JSON.parse(content);
      return content;
    } catch {
      // Si ça ne marche toujours pas, essayer de nettoyer plus agressivement
      content = content.replace(/[^\x20-\x7E]/g, '');
      try {
        JSON.parse(content);
        return content;
      } catch {
        return null;
      }
    }
  }

  async fixMissingIcons() {
    console.log('\n🎨 Ajout des icônes manquantes...');
    
    const driversDir = 'drivers';
    if (!fs.existsSync(driversDir)) return;
    
    let iconsAdded = 0;
    
    const scanDrivers = (dir) => {
      try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            const hasCompose = fs.existsSync(path.join(fullPath, 'driver.compose.json'));
            const hasDriver = fs.existsSync(path.join(fullPath, 'driver.json'));
            
            if (hasCompose || hasDriver) {
              // C'est un vrai driver, vérifier l'icône
              const iconPath = path.join(fullPath, 'assets/icon.svg');
              if (!fs.existsSync(iconPath)) {
                // Créer le dossier assets s'il n'existe pas
                const assetsDir = path.join(fullPath, 'assets');
                if (!fs.existsSync(assetsDir)) {
                  fs.mkdirSync(assetsDir, { recursive: true });
                }
                
                // Créer une icône par défaut
                this.createDefaultIcon(iconPath);
                iconsAdded++;
                console.log(`✅ Icône ajoutée: ${fullPath}`);
              }
            }
            scanDrivers(fullPath);
          }
        }
      } catch (error) {
        // Ignorer les erreurs
      }
    };
    
    scanDrivers(driversDir);
    this.fixes.iconsAdded = iconsAdded;
    console.log(`✅ ${iconsAdded} icônes ajoutées`);
  }

  createDefaultIcon(iconPath) {
    const defaultIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"/>
  <path d="M12 6v6l4 2"/>
</svg>`;
    
    fs.writeFileSync(iconPath, defaultIcon);
  }

  async fixMissingTranslations() {
    console.log('\n🌍 Correction des traductions manquantes...');
    
    const driversDir = 'drivers';
    if (!fs.existsSync(driversDir)) return;
    
    let translationsFixed = 0;
    
    const scanDrivers = (dir) => {
      try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            const composeFile = path.join(fullPath, 'driver.compose.json');
            if (fs.existsSync(composeFile)) {
              try {
                const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
                let needsUpdate = false;
                
                // Ajouter des traductions françaises si manquantes
                if (compose.name && !compose.name.fr) {
                  compose.name.fr = compose.name.en || 'Appareil Tuya';
                  needsUpdate = true;
                }
                
                // Ajouter des traductions anglaises si manquantes
                if (compose.name && !compose.name.en) {
                  compose.name.en = compose.name.fr || 'Tuya Device';
                  needsUpdate = true;
                }
                
                if (needsUpdate) {
                  fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2));
                  translationsFixed++;
                  console.log(`✅ Traductions ajoutées: ${fullPath}`);
                }
              } catch (error) {
                // Ignorer les erreurs
              }
            }
            scanDrivers(fullPath);
          }
        }
      } catch (error) {
        // Ignorer les erreurs
      }
    };
    
    scanDrivers(driversDir);
    this.fixes.translationsFixed = translationsFixed;
    console.log(`✅ ${translationsFixed} traductions ajoutées`);
  }

  findJsonFiles(dir, excludeDirs = ['node_modules', '.git', 'dumps']) {
    const files = [];
    
    const scan = (currentDir) => {
      if (excludeDirs.some(exclude => currentDir.includes(exclude))) return;
      
      try {
        const items = fs.readdirSync(currentDir);
        for (const item of items) {
          const fullPath = path.join(currentDir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            scan(fullPath);
          } else if (item.endsWith('.json')) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Ignorer les erreurs de permission
      }
    };
    
    scan(dir);
    return files;
  }

  generateReport() {
    console.log('\n📋 RAPPORT DE CORRECTION');
    console.log('='.repeat(60));
    console.log(`✅ Fichiers JSON corrigés: ${this.fixes.jsonFixed}`);
    console.log(`✅ Icônes ajoutées: ${this.fixes.iconsAdded}`);
    console.log(`✅ Traductions ajoutées: ${this.fixes.translationsFixed}`);
    
    if (this.fixes.errors.length > 0) {
      console.log('\n❌ Erreurs rencontrées:');
      this.fixes.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    console.log('\n🎉 Correction terminée ! Relancez la validation pour vérifier.');
  }
}

// Exécution principale
if (require.main === module) {
  const fixer = new ValidationFixer();
  fixer.fixAllIssues().catch(console.error);
}

module.exports = ValidationFixer;
