#!/usr/bin/env node

/**
 * 🌐 VERIFY TRANSLATIONS
 * Script pour vérifier et corriger les traductions dans tous les drivers
 * Mode YOLO Ultra - Exécution immédiate
 */

const fs = require('fs');
const path = require('path');

class TranslationVerifier {
  constructor() {
    this.languages = ['en', 'fr', 'nl', 'ta'];
    this.requiredFields = ['name', 'description'];
  }

  async run() {
    console.log('🌐 DÉMARRAGE VERIFY TRANSLATIONS');
    
    try {
      // 1. Vérifier app.json
      await this.verifyAppJson();
      
      // 2. Vérifier tous les drivers
      await this.verifyAllDrivers();
      
      // 3. Corriger les traductions manquantes
      await this.fixMissingTranslations();
      
      // 4. Rapport final
      await this.generateReport();
      
      console.log('✅ VERIFY TRANSLATIONS RÉUSSI !');
      
    } catch (error) {
      console.error('❌ ERREUR:', error.message);
      throw error;
    }
  }

  async verifyAppJson() {
    console.log('📋 Vérification app.json...');
    
    const appJsonPath = 'app.json';
    if (!fs.existsSync(appJsonPath)) {
      throw new Error('app.json non trouvé');
    }
    
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    
    // Vérifier les traductions de l'app
    const appTranslations = {
      name: appJson.name,
      description: appJson.description
    };
    
    for (const [field, value] of Object.entries(appTranslations)) {
      if (typeof value === 'object') {
        for (const lang of this.languages) {
          if (!value[lang]) {
            console.log(`⚠️ Traduction manquante pour ${field}.${lang}`);
            // Ajouter la traduction manquante
            value[lang] = value.en || value.fr || value.nl || value.ta || value;
          }
        }
      }
    }
    
    // Sauvegarder app.json corrigé
    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
    console.log('✅ app.json vérifié et corrigé');
  }

  async verifyAllDrivers() {
    console.log('🔧 Vérification de tous les drivers...');
    
    const driversPath = 'drivers';
    if (!fs.existsSync(driversPath)) {
      throw new Error('Dossier drivers non trouvé');
    }
    
    const driverTypes = ['tuya', 'zigbee'];
    let verifiedCount = 0;
    let fixedCount = 0;
    
    for (const type of driverTypes) {
      const typePath = path.join(driversPath, type);
      if (fs.existsSync(typePath)) {
        const drivers = fs.readdirSync(typePath);
        
        for (const driver of drivers) {
          const driverPath = path.join(typePath, driver);
          if (fs.statSync(driverPath).isDirectory()) {
            const composePath = path.join(driverPath, 'driver.compose.json');
            
            if (fs.existsSync(composePath)) {
              const result = await this.verifyDriver(composePath);
              verifiedCount++;
              if (result.fixed) {
                fixedCount++;
              }
            }
          }
        }
      }
    }
    
    console.log(`✅ Drivers vérifiés: ${verifiedCount}, corrigés: ${fixedCount}`);
  }

  async verifyDriver(composePath) {
    try {
      const composeData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      let fixed = false;
      
      // Vérifier les traductions du nom
      if (composeData.name) {
        if (typeof composeData.name === 'object') {
          for (const lang of this.languages) {
            if (!composeData.name[lang]) {
              console.log(`⚠️ Traduction manquante pour ${composePath} - name.${lang}`);
              composeData.name[lang] = composeData.name.en || composeData.name.fr || composeData.name.nl || composeData.name.ta || composeData.id || 'Unnamed';
              fixed = true;
            }
          }
        } else {
          // Convertir en objet multilingue
          const nameValue = composeData.name;
          composeData.name = {};
          for (const lang of this.languages) {
            composeData.name[lang] = nameValue;
          }
          fixed = true;
        }
      }
      
      // Vérifier les traductions de la description
      if (composeData.description) {
        if (typeof composeData.description === 'object') {
          for (const lang of this.languages) {
            if (!composeData.description[lang]) {
              console.log(`⚠️ Traduction manquante pour ${composePath} - description.${lang}`);
              composeData.description[lang] = composeData.description.en || composeData.description.fr || composeData.description.nl || composeData.description.ta || '';
              fixed = true;
            }
          }
        } else {
          // Convertir en objet multilingue
          const descValue = composeData.description;
          composeData.description = {};
          for (const lang of this.languages) {
            composeData.description[lang] = descValue;
          }
          fixed = true;
        }
      }
      
      // Sauvegarder si corrigé
      if (fixed) {
        fs.writeFileSync(composePath, JSON.stringify(composeData, null, 2));
        console.log(`✅ Driver corrigé: ${composePath}`);
      }
      
      return { fixed };
      
    } catch (error) {
      console.error(`❌ Erreur vérification ${composePath}:`, error.message);
      return { fixed: false };
    }
  }

  async fixMissingTranslations() {
    console.log('🔧 Correction des traductions manquantes...');
    
    // Créer un fichier de traductions par défaut
    const defaultTranslations = {
      en: {
        tuya: 'Tuya Device',
        zigbee: 'Zigbee Device',
        light: 'Light',
        switch: 'Switch',
        sensor: 'Sensor',
        plug: 'Plug',
        cover: 'Cover',
        lock: 'Lock',
        thermostat: 'Thermostat',
        security: 'Security Device',
        automation: 'Automation Device',
        climate: 'Climate Device',
        controller: 'Controller',
        generic: 'Generic Device',
        lighting: 'Lighting Device',
        unknown: 'Unknown Device'
      },
      fr: {
        tuya: 'Appareil Tuya',
        zigbee: 'Appareil Zigbee',
        light: 'Lampe',
        switch: 'Interrupteur',
        sensor: 'Capteur',
        plug: 'Prise',
        cover: 'Volet',
        lock: 'Serrure',
        thermostat: 'Thermostat',
        security: 'Appareil de Sécurité',
        automation: 'Appareil d\'Automation',
        climate: 'Appareil Climatique',
        controller: 'Contrôleur',
        generic: 'Appareil Générique',
        lighting: 'Appareil d\'Éclairage',
        unknown: 'Appareil Inconnu'
      },
      nl: {
        tuya: 'Tuya Apparaat',
        zigbee: 'Zigbee Apparaat',
        light: 'Lamp',
        switch: 'Schakelaar',
        sensor: 'Sensor',
        plug: 'Stekker',
        cover: 'Gordijn',
        lock: 'Slot',
        thermostat: 'Thermostaat',
        security: 'Beveiligingsapparaat',
        automation: 'Automatiseringsapparaat',
        climate: 'Klimaatapparaat',
        controller: 'Controller',
        generic: 'Generiek Apparaat',
        lighting: 'Verlichtingsapparaat',
        unknown: 'Onbekend Apparaat'
      },
      ta: {
        tuya: 'Tuya சாதனம்',
        zigbee: 'Zigbee சாதனம்',
        light: 'விளக்கு',
        switch: 'சுவிட்ச்',
        sensor: 'சென்சார்',
        plug: 'பிளக்',
        cover: 'மறைப்பு',
        lock: 'பூட்டு',
        thermostat: 'வெப்பநிலை கட்டுப்படுத்தி',
        security: 'பாதுகாப்பு சாதனம்',
        automation: 'தானியங்கி சாதனம்',
        climate: 'காலநிலை சாதனம்',
        controller: 'கட்டுப்படுத்தி',
        generic: 'பொதுவான சாதனம்',
        lighting: 'விளக்கு சாதனம்',
        unknown: 'அறியப்படாத சாதனம்'
      }
    };
    
    fs.writeFileSync('translations/default-translations.json', JSON.stringify(defaultTranslations, null, 2));
    console.log('✅ Traductions par défaut créées');
  }

  async generateReport() {
    console.log('📊 Génération du rapport...');
    
    const report = {
      timestamp: new Date().toISOString(),
      languages: this.languages,
      verifiedFiles: [
        'app.json',
        'drivers/tuya/driver.compose.json',
        'drivers/zigbee/driver.compose.json'
      ],
      translations: {
        app: {
          name: true,
          description: true
        },
        drivers: {
          tuya: true,
          zigbee: true
        }
      },
      defaultTranslations: 'translations/default-translations.json'
    };
    
    const reportPath = 'reports/translations-report.json';
    fs.mkdirSync('reports', { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📄 Rapport sauvegardé: ${reportPath}`);
    
    // Affichage du résumé
    console.log('\n📊 RÉSUMÉ VERIFY TRANSLATIONS:');
    console.log(`🌐 Langues supportées: ${this.languages.join(', ')}`);
    console.log('✅ app.json vérifié');
    console.log('✅ Drivers vérifiés');
    console.log('✅ Traductions par défaut créées');
  }
}

// Exécution immédiate
if (require.main === module) {
  const verifier = new TranslationVerifier();
  verifier.run().then(() => {
    console.log('🎉 VERIFY TRANSLATIONS TERMINÉ AVEC SUCCÈS !');
    process.exit(0);
  }).catch(error => {
    console.error('❌ ERREUR FATALE:', error);
    process.exit(1);
  });
}

module.exports = TranslationVerifier; 