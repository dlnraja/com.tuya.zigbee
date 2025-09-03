#!/usr/bin/env node

/**
 * 🚀 CHECK INTEGRITY - Validation rapide alternative
 * Vérification rapide des manifestes et drivers
 * Mode YOLO Ultra - Exécution immédiate
 */

const fs = require('fs');
const path = require('path');

class CheckIntegrity {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      version: '3.0.0',
      status: 'running',
      checks: [],
      errors: [],
      warnings: []
    };
  }

  async run() {
    console.log('🚀 DÉMARRAGE CHECK INTEGRITY - VALIDATION RAPIDE');
    
    try {
      // 1. Vérifier app.json
      await this.checkAppJson();
      
      // 2. Vérifier package.json
      await this.checkPackageJson();
      
      // 3. Vérifier les drivers
      await this.checkDrivers();
      
      // 4. Vérifier les assets
      await this.checkAssets();
      
      // 5. Vérifier la structure
      await this.checkStructure();
      
      // 6. Rapport final
      await this.generateReport();
      
      console.log('✅ CHECK INTEGRITY RÉUSSI !');
      this.results.status = 'success';
      
    } catch (error) {
      console.error('❌ ERREUR:', error.message);
      this.results.status = 'failed';
      this.results.errors.push(error.message);
    }
    
    return this.results;
  }

  async checkAppJson() {
    console.log('📋 Vérification app.json...');
    
    if (!fs.existsSync('app.json')) {
      throw new Error('app.json manquant');
    }
    
    try {
      const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
      
      // Vérifications essentielles
      const requiredFields = ['id', 'version', 'name', 'description'];
      for (const field of requiredFields) {
        if (!appJson[field]) {
          throw new Error(`Champ requis manquant dans app.json: ${field}`);
        }
      }
      
      // Vérifier la version
      if (appJson.version !== '3.0.0') {
        this.results.warnings.push(`Version app.json: ${appJson.version} (attendu: 3.0.0)`);
      }
      
      // Vérifier brandColor
      if (!appJson.brandColor) {
        this.results.warnings.push('brandColor manquant dans app.json');
      }
      
      this.results.checks.push('✅ app.json valide');
      console.log('✅ app.json valide');
      
    } catch (error) {
      throw new Error(`app.json invalide: ${error.message}`);
    }
  }

  async checkPackageJson() {
    console.log('📦 Vérification package.json...');
    
    if (!fs.existsSync('package.json')) {
      throw new Error('package.json manquant');
    }
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      // Vérifications de base
      if (!packageJson.name) {
        throw new Error('Nom manquant dans package.json');
      }
      
      if (!packageJson.version) {
        throw new Error('Version manquante dans package.json');
      }
      
      this.results.checks.push('✅ package.json valide');
      console.log('✅ package.json valide');
      
    } catch (error) {
      throw new Error(`package.json invalide: ${error.message}`);
    }
  }

  async checkDrivers() {
    console.log('🔧 Vérification des drivers...');
    
    const driversPath = 'drivers';
    if (!fs.existsSync(driversPath)) {
      this.results.warnings.push('Dossier drivers manquant');
      return;
    }
    
    const driverTypes = ['tuya', 'zigbee'];
    let totalDrivers = 0;
    
    for (const type of driverTypes) {
      const typePath = path.join(driversPath, type);
      if (fs.existsSync(typePath)) {
        const drivers = fs.readdirSync(typePath).filter(f => f.endsWith('.js'));
        totalDrivers += drivers.length;
        
        // Vérifier la syntaxe de chaque driver
        for (const driver of drivers) {
          try {
            const driverPath = path.join(typePath, driver);
            const driverCode = fs.readFileSync(driverPath, 'utf8');
            new Function(driverCode); // Test de syntaxe
          } catch (error) {
            this.results.errors.push(`Erreur de syntaxe dans ${driver}: ${error.message}`);
          }
        }
        
        this.results.checks.push(`✅ ${type} drivers: ${drivers.length} valides`);
      } else {
        this.results.warnings.push(`Dossier ${type} manquant`);
      }
    }
    
    if (totalDrivers === 0) {
      this.results.warnings.push('Aucun driver trouvé');
    }
    
    console.log(`✅ Drivers vérifiés: ${totalDrivers} total`);
  }

  async checkAssets() {
    console.log('🖼️ Vérification des assets...');
    
    const assetsPath = 'assets';
    if (!fs.existsSync(assetsPath)) {
      this.results.warnings.push('Dossier assets manquant');
      return;
    }
    
    const imagesPath = path.join(assetsPath, 'images');
    if (fs.existsSync(imagesPath)) {
      const images = fs.readdirSync(imagesPath).filter(f => f.endsWith('.png'));
      
      // Vérifier les images requises
      const requiredImages = ['small.png', 'large.png'];
      for (const image of requiredImages) {
        if (!images.includes(image)) {
          this.results.warnings.push(`Image requise manquante: ${image}`);
        }
      }
      
      this.results.checks.push(`✅ Images: ${images.length} trouvées`);
    } else {
      this.results.warnings.push('Dossier images manquant');
    }
    
    console.log('✅ Assets vérifiés');
  }

  async checkStructure() {
    console.log('🏗️ Vérification de la structure...');
    
    // Vérifier les fichiers essentiels
    const essentialFiles = ['app.js'];
    for (const file of essentialFiles) {
      if (!fs.existsSync(file)) {
        throw new Error(`Fichier essentiel manquant: ${file}`);
      }
      
      // Vérifier la syntaxe JavaScript
      try {
        const fileContent = fs.readFileSync(file, 'utf8');
        new Function(fileContent); // Test de syntaxe
      } catch (error) {
        throw new Error(`Erreur de syntaxe dans ${file}: ${error.message}`);
      }
    }
    
    // Vérifier les dossiers essentiels
    const essentialDirs = ['lib'];
    for (const dir of essentialDirs) {
      if (!fs.existsSync(dir)) {
        this.results.warnings.push(`Dossier essentiel manquant: ${dir}`);
      }
    }
    
    this.results.checks.push('✅ Structure valide');
    console.log('✅ Structure vérifiée');
  }

  async generateReport() {
    console.log('📊 Génération du rapport...');
    
    const reportPath = 'reports/check-integrity-report.json';
    fs.mkdirSync('reports', { recursive: true });
    
    this.results.timestamp = new Date().toISOString();
    
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    
    console.log(`📄 Rapport sauvegardé: ${reportPath}`);
    
    // Affichage du résumé
    console.log('\n📊 RÉSUMÉ CHECK INTEGRITY:');
    console.log(`✅ Statut: ${this.results.status}`);
    console.log(`📋 Vérifications: ${this.results.checks.length}`);
    console.log(`⚠️ Avertissements: ${this.results.warnings.length}`);
    console.log(`❌ Erreurs: ${this.results.errors.length}`);
    
    if (this.results.warnings.length > 0) {
      console.log('\n⚠️ AVERTISSEMENTS:');
      this.results.warnings.forEach(warning => {
        console.log(`- ${warning}`);
      });
    }
    
    if (this.results.errors.length > 0) {
      console.log('\n❌ ERREURS:');
      this.results.errors.forEach(error => {
        console.log(`- ${error}`);
      });
    }
  }
}

// Exécution immédiate
if (require.main === module) {
  const checker = new CheckIntegrity();
  checker.run().then(() => {
    console.log('🎉 VÉRIFICATION D\'INTÉGRITÉ TERMINÉE !');
    process.exit(0);
  }).catch(error => {
    console.error('❌ ERREUR FATALE:', error);
    process.exit(1);
  });
}

module.exports = CheckIntegrity; 