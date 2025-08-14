#!/usr/bin/env node

console.log('🏠 VALIDATION COMPLÈTE HOMEY v3.4.1 - DÉMARRAGE...');

const fs = require('fs-extra');
const path = require('path');

class HomeyValidationComplete {
  constructor() {
    this.projectRoot = process.cwd();
    this.driversPath = path.join(this.projectRoot, 'drivers');
    this.catalogPath = path.join(this.projectRoot, 'catalog');
    this.reportsPath = path.join(this.projectRoot, 'reports');
    
    this.validationResults = {
      startTime: new Date(),
      drivers: { total: 0, valid: 0, invalid: 0, details: [] },
      structure: { valid: false, issues: [] },
      assets: { total: 0, complete: 0, incomplete: 0, details: [] },
      documentation: { valid: false, issues: [] },
      sdk3: { valid: false, issues: [] },
      overall: { score: 0, status: 'UNKNOWN' }
    };
  }

  async run() {
    try {
      console.log('🔍 PHASE 1: VALIDATION STRUCTURE COMPLÈTE...');
      await this.validateStructure();
      
      console.log('🚗 PHASE 2: VALIDATION DRIVERS COMPLÈTE...');
      await this.validateAllDrivers();
      
      console.log('🎨 PHASE 3: VALIDATION ASSETS COMPLÈTE...');
      await this.validateAllAssets();
      
      console.log('📚 PHASE 4: VALIDATION DOCUMENTATION...');
      await this.validateDocumentation();
      
      console.log('⚡ PHASE 5: VALIDATION SDK3+...');
      await this.validateSDK3();
      
      console.log('📊 PHASE 6: CALCUL SCORE FINAL...');
      this.calculateOverallScore();
      
      console.log('📝 PHASE 7: GÉNÉRATION RAPPORT...');
      await this.generateValidationReport();
      
      console.log('✅ VALIDATION COMPLÈTE TERMINÉE !');
      console.log(`🏆 SCORE FINAL: ${this.validationResults.overall.score}/100 - ${this.validationResults.overall.status}`);
      
      return this.validationResults;
      
    } catch (error) {
      console.error('❌ VALIDATION COMPLÈTE ÉCHOUÉE:', error);
      throw error;
    }
  }

  async validateStructure() {
    console.log('🔍 Validation de la structure du projet...');
    
    try {
      // Vérifier dossiers principaux
      const requiredDirs = ['drivers', 'catalog', 'docs', 'scripts', 'tests'];
      let validDirs = 0;
      
      for (const dir of requiredDirs) {
        const dirPath = path.join(this.projectRoot, dir);
        if (await fs.pathExists(dirPath)) {
          validDirs++;
        } else {
          this.validationResults.structure.issues.push(`Dossier manquant: ${dir}`);
        }
      }
      
      // Vérifier structure SOT
      if (await fs.pathExists(this.catalogPath)) {
        const catalogItems = await fs.readdir(this.catalogPath);
        const hasValidStructure = catalogItems.some(async (item) => {
          const itemPath = path.join(this.catalogPath, item);
          const stats = await fs.stat(itemPath);
          return stats.isDirectory();
        });
        
        if (hasValidStructure) {
          validDirs++;
        } else {
          this.validationResults.structure.issues.push('Structure SOT invalide');
        }
      } else {
        this.validationResults.structure.issues.push('Dossier catalog manquant');
      }
      
      this.validationResults.structure.valid = validDirs === requiredDirs.length + 1;
      console.log(`✅ Structure: ${validDirs}/${requiredDirs.length + 1} dossiers valides`);
      
    } catch (error) {
      console.error('❌ Erreur validation structure:', error);
      this.validationResults.structure.issues.push(`Erreur: ${error.message}`);
    }
  }

  async validateAllDrivers() {
    console.log('🚗 Validation de tous les drivers...');
    
    try {
      const driverDirs = await fs.readdir(this.driversPath);
      this.validationResults.drivers.total = driverDirs.length;
      
      for (const driverDir of driverDirs) {
        if (driverDir.startsWith('_')) continue;
        
        const driverPath = path.join(this.driversPath, driverDir);
        const stats = await fs.stat(driverPath);
        
        if (stats.isDirectory()) {
          const driverValidation = await this.validateDriver(driverPath, driverDir);
          
          if (driverValidation.valid) {
            this.validationResults.drivers.valid++;
          } else {
            this.validationResults.drivers.invalid++;
          }
          
          this.validationResults.drivers.details.push(driverValidation);
        }
      }
      
      console.log(`✅ Drivers: ${this.validationResults.drivers.valid}/${this.validationResults.drivers.total} valides`);
      
    } catch (error) {
      console.error('❌ Erreur validation drivers:', error);
    }
  }

  async validateDriver(driverPath, driverDir) {
    const result = {
      name: driverDir,
      valid: false,
      issues: [],
      files: { compose: false, device: false, driver: false },
      assets: { icon: false, images: false }
    };
    
    try {
      // Vérifier fichiers requis
      const composePath = path.join(driverPath, 'driver.compose.json');
      if (await fs.pathExists(composePath)) {
        result.files.compose = true;
        
        // Valider JSON
        try {
          const composeData = await fs.readJson(composePath);
          if (!composeData.id || !composeData.name || !composeData.class) {
            result.issues.push('driver.compose.json invalide');
          }
        } catch (jsonError) {
          result.issues.push('driver.compose.json JSON invalide');
        }
      } else {
        result.issues.push('driver.compose.json manquant');
      }
      
      const deviceJsPath = path.join(driverPath, 'device.js');
      if (await fs.pathExists(deviceJsPath)) {
        result.files.device = true;
        
        // Vérifier contenu SDK3+
        const deviceContent = await fs.readFile(deviceJsPath, 'utf8');
        if (!deviceContent.includes('ZigBeeDevice') && !deviceContent.includes('homey-zigbeedriver')) {
          result.issues.push('device.js pas compatible SDK3+');
        }
      } else {
        result.issues.push('device.js manquant');
      }
      
      const driverJsPath = path.join(driverPath, 'driver.js');
      if (await fs.pathExists(driverJsPath)) {
        result.files.driver = true;
        
        // Vérifier contenu SDK3+
        const driverContent = await fs.readFile(driverJsPath, 'utf8');
        if (!driverContent.includes('ZigBeeDriver') && !driverContent.includes('homey-zigbeedriver')) {
          result.issues.push('driver.js pas compatible SDK3+');
        }
      } else {
        result.issues.push('driver.js manquant');
      }
      
      // Vérifier assets
      const assetsPath = path.join(driverPath, 'assets');
      if (await fs.pathExists(assetsPath)) {
        const iconPath = path.join(assetsPath, 'icon.svg');
        if (await fs.pathExists(iconPath)) {
          result.assets.icon = true;
        } else {
          result.issues.push('icon.svg manquant');
        }
        
        const imagesPath = path.join(assetsPath, 'images');
        if (await fs.pathExists(imagesPath)) {
          const images = await fs.readdir(imagesPath);
          if (images.length >= 3) {
            result.assets.images = true;
          } else {
            result.issues.push('Images manquantes');
          }
        } else {
          result.issues.push('Dossier images manquant');
        }
      } else {
        result.issues.push('Dossier assets manquant');
      }
      
      // Calculer validité
      result.valid = result.files.compose && result.files.device && result.files.driver && 
                    result.assets.icon && result.assets.images && result.issues.length === 0;
      
    } catch (error) {
      result.issues.push(`Erreur: ${error.message}`);
    }
    
    return result;
  }

  async validateAllAssets() {
    console.log('🎨 Validation de tous les assets...');
    
    try {
      const driverDirs = await fs.readdir(this.driversPath);
      this.validationResults.assets.total = driverDirs.filter(d => !d.startsWith('_')).length;
      
      for (const driverDir of driverDirs) {
        if (driverDir.startsWith('_')) continue;
        
        const driverPath = path.join(this.driversPath, driverDir);
        const stats = await fs.stat(driverPath);
        
        if (stats.isDirectory()) {
          const assetsPath = path.join(driverPath, 'assets');
          
          if (await fs.pathExists(assetsPath)) {
            const iconExists = await fs.pathExists(path.join(assetsPath, 'icon.svg'));
            const imagesExist = await fs.pathExists(path.join(assetsPath, 'images'));
            
            if (iconExists && imagesExist) {
              const images = await fs.readdir(path.join(assetsPath, 'images'));
              if (images.length >= 3) {
                this.validationResults.assets.complete++;
              } else {
                this.validationResults.assets.incomplete++;
                this.validationResults.assets.details.push(`${driverDir}: Images insuffisantes (${images.length}/3)`);
              }
            } else {
              this.validationResults.assets.incomplete++;
              this.validationResults.assets.details.push(`${driverDir}: Assets incomplets`);
            }
          } else {
            this.validationResults.assets.incomplete++;
            this.validationResults.assets.details.push(`${driverDir}: Dossier assets manquant`);
          }
        }
      }
      
      console.log(`✅ Assets: ${this.validationResults.assets.complete}/${this.validationResults.assets.total} complets`);
      
    } catch (error) {
      console.error('❌ Erreur validation assets:', error);
    }
  }

  async validateDocumentation() {
    console.log('📚 Validation de la documentation...');
    
    try {
      const requiredDocs = [
        'README.md',
        'CHANGELOG.md',
        'docs/DRIVERS.md',
        'docs/index.html',
        'docs/style.css',
        'docs/script.js'
      ];
      
      let validDocs = 0;
      
      for (const doc of requiredDocs) {
        const docPath = path.join(this.projectRoot, doc);
        if (await fs.pathExists(docPath)) {
          validDocs++;
        } else {
          this.validationResults.documentation.issues.push(`Document manquant: ${doc}`);
        }
      }
      
      this.validationResults.documentation.valid = validDocs === requiredDocs.length;
      console.log(`✅ Documentation: ${validDocs}/${requiredDocs.length} documents présents`);
      
    } catch (error) {
      console.error('❌ Erreur validation documentation:', error);
      this.validationResults.documentation.issues.push(`Erreur: ${error.message}`);
    }
  }

  async validateSDK3() {
    console.log('⚡ Validation compatibilité SDK3+...');
    
    try {
      let sdk3Valid = true;
      
      // Vérifier package.json
      const packagePath = path.join(this.projectRoot, 'package.json');
      if (await fs.pathExists(packagePath)) {
        const packageData = await fs.readJson(packagePath);
        if (packageData.homey && packageData.homey.sdk) {
          const sdkVersion = packageData.homey.sdk;
          if (sdkVersion >= 3) {
            console.log(`✅ SDK Version: ${sdkVersion}`);
          } else {
            sdk3Valid = false;
            this.validationResults.sdk3.issues.push(`SDK version trop ancienne: ${sdkVersion}`);
          }
        } else {
          sdk3Valid = false;
          this.validationResults.sdk3.issues.push('SDK version non spécifiée');
        }
      } else {
        sdk3Valid = false;
        this.validationResults.sdk3.issues.push('package.json manquant');
      }
      
      // Vérifier app.json
      const appPath = path.join(this.projectRoot, 'app.json');
      if (await fs.pathExists(appPath)) {
        const appData = await fs.readJson(appPath);
        if (appData.sdk && appData.sdk >= 3) {
          console.log(`✅ App SDK: ${appData.sdk}`);
        } else {
          sdk3Valid = false;
          this.validationResults.sdk3.issues.push(`App SDK trop ancien: ${appData.sdk || 'non spécifié'}`);
        }
      } else {
        sdk3Valid = false;
        this.validationResults.sdk3.issues.push('app.json manquant');
      }
      
      this.validationResults.sdk3.valid = sdk3Valid;
      console.log(`✅ SDK3+: ${sdk3Valid ? 'Compatible' : 'Non compatible'}`);
      
    } catch (error) {
      console.error('❌ Erreur validation SDK3:', error);
      this.validationResults.sdk3.issues.push(`Erreur: ${error.message}`);
    }
  }

  calculateOverallScore() {
    console.log('📊 Calcul du score final...');
    
    let totalScore = 0;
    let maxScore = 0;
    
    // Structure (20 points)
    maxScore += 20;
    totalScore += this.validationResults.structure.valid ? 20 : 0;
    
    // Drivers (40 points)
    maxScore += 40;
    if (this.validationResults.drivers.total > 0) {
      const driverScore = (this.validationResults.drivers.valid / this.validationResults.drivers.total) * 40;
      totalScore += driverScore;
    }
    
    // Assets (20 points)
    maxScore += 20;
    if (this.validationResults.assets.total > 0) {
      const assetScore = (this.validationResults.assets.complete / this.validationResults.assets.total) * 20;
      totalScore += assetScore;
    }
    
    // Documentation (10 points)
    maxScore += 10;
    totalScore += this.validationResults.documentation.valid ? 10 : 0;
    
    // SDK3 (10 points)
    maxScore += 10;
    totalScore += this.validationResults.sdk3.valid ? 10 : 0;
    
    this.validationResults.overall.score = Math.round(totalScore);
    
    // Déterminer statut
    if (this.validationResults.overall.score >= 95) {
      this.validationResults.overall.status = 'EXCELLENT';
    } else if (this.validationResults.overall.score >= 85) {
      this.validationResults.overall.status = 'TRÈS BON';
    } else if (this.validationResults.overall.score >= 75) {
      this.validationResults.overall.status = 'BON';
    } else if (this.validationResults.overall.score >= 60) {
      this.validationResults.overall.status = 'MOYEN';
    } else {
      this.validationResults.overall.status = 'INSUFFISANT';
    }
    
    console.log(`🏆 Score final: ${this.validationResults.overall.score}/${maxScore} - ${this.validationResults.overall.status}`);
  }

  async generateValidationReport() {
    const reportPath = path.join(this.reportsPath, `HOMEY_VALIDATION_COMPLETE_v3.4.1_${new Date().toISOString().split('T')[0]}.md`);
    
    const report = `# 🏠 VALIDATION COMPLÈTE HOMEY v3.4.1 - RAPPORT FINAL

## 📊 **RÉSUMÉ EXÉCUTIF**

**📅 Date de validation** : ${new Date().toISOString()}  
**🏆 Score final** : ${this.validationResults.overall.score}/100  
**📈 Statut** : ${this.validationResults.overall.status}  

## ✅ **RÉSULTATS PAR CATÉGORIE**

### **🏗️ Structure du Projet** ${this.validationResults.structure.valid ? '✅' : '❌'}
- **Validité** : ${this.validationResults.structure.valid ? 'Valide' : 'Invalide'}
- **Issues** : ${this.validationResults.structure.issues.length}
${this.validationResults.structure.issues.map(issue => `  - ${issue}`).join('\n')}

### **🚗 Drivers** 
- **Total** : ${this.validationResults.drivers.total}
- **Valides** : ${this.validationResults.drivers.valid}
- **Invalides** : ${this.validationResults.drivers.invalid}
- **Taux de succès** : ${this.validationResults.drivers.total > 0 ? Math.round((this.validationResults.drivers.valid / this.validationResults.drivers.total) * 100) : 0}%

#### **Détails des Drivers**
${this.validationResults.drivers.details.map(driver => `
**${driver.name}** ${driver.valid ? '✅' : '❌'}
- Fichiers: Compose=${driver.files.compose ? '✅' : '❌'}, Device=${driver.files.device ? '✅' : '❌'}, Driver=${driver.files.driver ? '✅' : '❌'}
- Assets: Icon=${driver.assets.icon ? '✅' : '❌'}, Images=${driver.assets.images ? '✅' : '❌'}
${driver.issues.length > 0 ? `- Issues: ${driver.issues.join(', ')}` : ''}`).join('\n')}

### **🎨 Assets**
- **Total** : ${this.validationResults.assets.total}
- **Complets** : ${this.validationResults.assets.complete}
- **Incomplets** : ${this.validationResults.assets.incomplete}
- **Taux de succès** : ${this.validationResults.assets.total > 0 ? Math.round((this.validationResults.assets.complete / this.validationResults.assets.total) * 100) : 0}%

${this.validationResults.assets.details.length > 0 ? `#### **Issues Assets**
${this.validationResults.assets.details.map(issue => `- ${issue}`).join('\n')}` : ''}

### **📚 Documentation** ${this.validationResults.documentation.valid ? '✅' : '❌'}
- **Validité** : ${this.validationResults.documentation.valid ? 'Complète' : 'Incomplète'}
- **Issues** : ${this.validationResults.documentation.issues.length}
${this.validationResults.documentation.issues.map(issue => `  - ${issue}`).join('\n')}

### **⚡ SDK3+ Compatibilité** ${this.validationResults.sdk3.valid ? '✅' : '❌'}
- **Validité** : ${this.validationResults.sdk3.valid ? 'Compatible' : 'Non compatible'}
- **Issues** : ${this.validationResults.sdk3.issues.length}
${this.validationResults.sdk3.issues.map(issue => `  - ${issue}`).join('\n')}

## 🎯 **RECOMMANDATIONS**

${this.validationResults.overall.score >= 95 ? '🎉 **EXCELLENT !** Le projet est prêt pour la production.' : 
  this.validationResults.overall.score >= 85 ? '👍 **TRÈS BON !** Quelques améliorations mineures recommandées.' :
  this.validationResults.overall.score >= 75 ? '✅ **BON !** Améliorations modérées nécessaires.' :
  this.validationResults.overall.score >= 60 ? '⚠️ **MOYEN !** Améliorations importantes nécessaires.' :
  '❌ **INSUFFISANT !** Travail important requis avant production.'}

### **Actions Prioritaires**
${this.validationResults.drivers.invalid > 0 ? `1. **Corriger ${this.validationResults.drivers.invalid} drivers invalides**` : ''}
${this.validationResults.assets.incomplete > 0 ? `2. **Compléter ${this.validationResults.assets.incomplete} assets manquants**` : ''}
${!this.validationResults.sdk3.valid ? '3. **Mettre à jour vers SDK3+**' : ''}
${!this.validationResults.documentation.valid ? '4. **Compléter la documentation**' : ''}

## 📈 **MÉTRIQUES DÉTAILLÉES**

| Métrique | Valeur | Score | Max |
|----------|--------|-------|-----|
| **Structure** | ${this.validationResults.structure.valid ? 'Valide' : 'Invalide'} | ${this.validationResults.structure.valid ? 20 : 0} | 20 |
| **Drivers** | ${this.validationResults.drivers.valid}/${this.validationResults.drivers.total} | ${Math.round((this.validationResults.drivers.valid / Math.max(this.validationResults.drivers.total, 1)) * 40)} | 40 |
| **Assets** | ${this.validationResults.assets.complete}/${this.validationResults.assets.total} | ${Math.round((this.validationResults.assets.complete / Math.max(this.validationResults.assets.total, 1)) * 20)} | 20 |
| **Documentation** | ${this.validationResults.documentation.valid ? 'Complète' : 'Incomplète'} | ${this.validationResults.documentation.valid ? 10 : 0} | 10 |
| **SDK3+** | ${this.validationResults.sdk3.valid ? 'Compatible' : 'Non compatible'} | ${this.validationResults.sdk3.valid ? 10 : 0} | 10 |
| **TOTAL** | - | **${this.validationResults.overall.score}** | **100** |

## 🏆 **STATUT FINAL**

**${this.validationResults.overall.status.toUpperCase()}** - Score: ${this.validationResults.overall.score}/100

---

**📅 Version** : 3.4.1  
**👤 Auteur** : dlnraja  
**✅ Statut** : VALIDATION COMPLÈTE TERMINÉE  
**🏆 Niveau** : ${this.validationResults.overall.status}
`;
    
    await fs.writeFile(reportPath, report);
    console.log(`📊 Rapport de validation généré: ${reportPath}`);
    
    return reportPath;
  }
}

// Exécution immédiate
const validator = new HomeyValidationComplete();
validator.run().catch(console.error);
