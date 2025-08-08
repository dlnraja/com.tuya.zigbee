#!/usr/bin/env node

/**
 * 🔄 VERSION MIGRATION SYSTEM
 * Système de gestion des versions et migration automatique
 * Mode YOLO Ultra - Exécution immédiate
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class VersionMigrationSystem {
  constructor() {
    this.currentVersion = '3.0.0';
    this.migrationConfig = {
      schemaVersion: '3.0.0',
      migrations: [
        {
          from: '2.0.0',
          to: '3.0.0',
          steps: [
            'update-driver-compose-schema',
            'migrate-capabilities',
            'update-metadata'
          ]
        }
      ]
    };
  }

  async run() {
    console.log('🔄 DÉMARRAGE VERSION MIGRATION SYSTEM');
    
    try {
      // 1. Créer le système de migration de schéma
      await this.createSchemaMigrationSystem();
      
      // 2. Générer les codemods Node.js
      await this.generateCodemods();
      
      // 3. Créer le système de versioning
      await this.createVersioningSystem();
      
      // 4. Configurer les migrations automatiques
      await this.setupAutoMigrations();
      
      // 5. Rapport final
      await this.generateReport();
      
      console.log('✅ VERSION MIGRATION SYSTEM RÉUSSI !');
      
    } catch (error) {
      console.error('❌ ERREUR:', error.message);
      throw error;
    }
  }

  async createSchemaMigrationSystem() {
    console.log('📋 Création du système de migration de schéma...');
    
    const schemaMigration = {
      version: this.currentVersion,
      migrations: {
        '2.0.0_to_3.0.0': {
          description: 'Migration from v2.0.0 to v3.0.0',
          steps: [
            {
              name: 'update-driver-compose-schema',
              description: 'Update driver.compose.json schema',
              transform: (data) => {
                // Ajouter les nouveaux champs requis
                if (!data.metadata) {
                  data.metadata = {
                    version: '3.0.0',
                    migrationDate: new Date().toISOString()
                  };
                }
                return data;
              }
            },
            {
              name: 'migrate-capabilities',
              description: 'Migrate device capabilities',
              transform: (data) => {
                // Mettre à jour les capacités
                if (data.capabilities) {
                  data.capabilities = data.capabilities.map(cap => {
                    if (cap === 'onoff') return 'onoff';
                    if (cap === 'dim') return 'dim';
                    if (cap === 'light_temperature') return 'light_temperature';
                    return cap;
                  });
                }
                return data;
              }
            },
            {
              name: 'update-metadata',
              description: 'Update metadata fields',
              transform: (data) => {
                // Mettre à jour les métadonnées
                if (!data.metadata) {
                  data.metadata = {};
                }
                data.metadata.lastMigration = new Date().toISOString();
                data.metadata.version = '3.0.0';
                return data;
              }
            }
          ]
        }
      }
    };
    
    fs.writeFileSync('migrations/schema-migration.json', JSON.stringify(schemaMigration, null, 2));
    
    // Script de migration
    const migrationScript = `#!/usr/bin/env node

/**
 * 🔄 SCHEMA MIGRATION SCRIPT
 * Script de migration automatique des schémas
 */

const fs = require('fs');
const path = require('path');
const schemaMigration = require('./schema-migration.json');

class SchemaMigration {
  constructor() {
    this.migrations = schemaMigration.migrations;
  }
  
  async migrateDriverCompose(driverPath) {
    const composePath = path.join(driverPath, 'driver.compose.json');
    
    if (!fs.existsSync(composePath)) {
      console.log('⚠️ driver.compose.json non trouvé:', driverPath);
      return;
    }
    
    try {
      const data = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const currentVersion = data.metadata?.version || '2.0.0';
      
      if (currentVersion !== '3.0.0') {
        console.log('🔄 Migration de', driverPath, 'de', currentVersion, 'vers 3.0.0');
        
        const migration = this.migrations['2.0.0_to_3.0.0'];
        let migratedData = data;
        
        for (const step of migration.steps) {
          console.log('📋 Exécution:', step.name);
          migratedData = step.transform(migratedData);
        }
        
        // Sauvegarder la version migrée
        fs.writeFileSync(composePath, JSON.stringify(migratedData, null, 2));
        
        console.log('✅ Migration réussie:', driverPath);
      }
      
    } catch (error) {
      console.error('❌ Erreur migration:', driverPath, error.message);
    }
  }
  
  async migrateAllDrivers() {
    console.log('🔄 Début de la migration de tous les drivers...');
    
    const driversPath = 'drivers';
    if (!fs.existsSync(driversPath)) {
      console.log('⚠️ Dossier drivers non trouvé');
      return;
    }
    
    const driverTypes = ['tuya', 'zigbee'];
    let migratedCount = 0;
    
    for (const type of driverTypes) {
      const typePath = path.join(driversPath, type);
      if (fs.existsSync(typePath)) {
        const drivers = fs.readdirSync(typePath);
        
        for (const driver of drivers) {
          const driverPath = path.join(typePath, driver);
          if (fs.statSync(driverPath).isDirectory()) {
            await this.migrateDriverCompose(driverPath);
            migratedCount++;
          }
        }
      }
    }
    
    console.log('✅ Migration terminée. Drivers migrés:', migratedCount);
  }
}

// Exécution de la migration
const migration = new SchemaMigration();
migration.migrateAllDrivers().catch(console.error);`;
    
    fs.writeFileSync('migrations/migrate-schema.js', migrationScript);
    
    console.log('✅ Système de migration de schéma créé');
  }

  async generateCodemods() {
    console.log('🔧 Génération des codemods Node.js...');
    
    // Codemod pour migrer les drivers
    const driverCodemod = `#!/usr/bin/env node

/**
 * 🔧 DRIVER MIGRATION CODEMOD
 * Codemod pour migrer automatiquement les drivers
 */

const fs = require('fs');
const path = require('path');

class DriverCodemod {
  constructor() {
    this.transformations = [
      {
        name: 'update-require-statements',
        pattern: /require\\(['"]homey-meshdriver['"]\\)/g,
        replacement: "require('homey-meshdriver')"
      },
      {
        name: 'update-class-declarations',
        pattern: /class\\s+(\\w+)\\s+extends\\s+(\\w+)/g,
        replacement: 'class $1 extends $2'
      },
      {
        name: 'update-capability-registration',
        pattern: /this\\.registerCapability\\((['"])(\\w+)\\1,\\s*(['"])(\\w+)\\3\\)/g,
        replacement: 'this.registerCapability(\'$2\', \'$4\')'
      }
    ];
  }
  
  async transformFile(filePath) {
    if (!fs.existsSync(filePath)) {
      return;
    }
    
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let transformed = false;
      
      for (const transform of this.transformations) {
        const newContent = content.replace(transform.pattern, transform.replacement);
        if (newContent !== content) {
          content = newContent;
          transformed = true;
          console.log('🔧 Transformation appliquée:', transform.name, 'dans', filePath);
        }
      }
      
      if (transformed) {
        // Créer une sauvegarde
        const backupPath = filePath + '.backup';
        fs.writeFileSync(backupPath, fs.readFileSync(filePath, 'utf8'));
        
        // Écrire le fichier transformé
        fs.writeFileSync(filePath, content);
        
        console.log('✅ Fichier transformé:', filePath);
      }
      
    } catch (error) {
      console.error('❌ Erreur transformation:', filePath, error.message);
    }
  }
  
  async transformAllDrivers() {
    console.log('🔧 Début de la transformation de tous les drivers...');
    
    const driversPath = 'drivers';
    if (!fs.existsSync(driversPath)) {
      return;
    }
    
    const driverTypes = ['tuya', 'zigbee'];
    let transformedCount = 0;
    
    for (const type of driverTypes) {
      const typePath = path.join(driversPath, type);
      if (fs.existsSync(typePath)) {
        const drivers = fs.readdirSync(typePath);
        
        for (const driver of drivers) {
          const driverPath = path.join(typePath, driver);
          if (fs.statSync(driverPath).isDirectory()) {
            const driverFile = path.join(driverPath, 'driver.js');
            if (fs.existsSync(driverFile)) {
              await this.transformFile(driverFile);
              transformedCount++;
            }
          }
        }
      }
    }
    
    console.log('✅ Transformation terminée. Drivers transformés:', transformedCount);
  }
}

// Exécution du codemod
const codemod = new DriverCodemod();
codemod.transformAllDrivers().catch(console.error);`;
    
    fs.writeFileSync('migrations/driver-codemod.js', driverCodemod);
    
    // Codemod pour migrer app.json
    const appJsonCodemod = `#!/usr/bin/env node

/**
 * 🔧 APP.JSON MIGRATION CODEMOD
 * Codemod pour migrer app.json vers la nouvelle structure
 */

const fs = require('fs');

class AppJsonCodemod {
  constructor() {
    this.targetVersion = '3.0.0';
  }
  
  async migrateAppJson() {
    const appJsonPath = 'app.json';
    
    if (!fs.existsSync(appJsonPath)) {
      console.log('⚠️ app.json non trouvé');
      return;
    }
    
    try {
      const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
      
      // Sauvegarder l'ancienne version
      const backupPath = 'app.json.backup';
      fs.writeFileSync(backupPath, JSON.stringify(appJson, null, 2));
      
      // Appliquer les transformations
      const migrated = this.applyTransformations(appJson);
      
      // Écrire la nouvelle version
      fs.writeFileSync(appJsonPath, JSON.stringify(migrated, null, 2));
      
      console.log('✅ app.json migré vers v' + this.targetVersion);
      
    } catch (error) {
      console.error('❌ Erreur migration app.json:', error.message);
    }
  }
  
  applyTransformations(appJson) {
    // Mettre à jour la version
    appJson.version = this.targetVersion;
    
    // Ajouter les nouveaux champs requis
    if (!appJson.brandColor) {
      appJson.brandColor = '#FF6B35';
    }
    
    if (!appJson.metadata) {
      appJson.metadata = {};
    }
    
    appJson.metadata.migrationDate = new Date().toISOString();
    appJson.metadata.migratedFrom = appJson.version || '2.0.0';
    
    // Mettre à jour les permissions si nécessaire
    if (!appJson.permissions) {
      appJson.permissions = ['homey:manager:api'];
    }
    
    // Mettre à jour la compatibilité
    if (!appJson.compatibility) {
      appJson.compatibility = '>=6.0.0';
    }
    
    return appJson;
  }
}

// Exécution du codemod
const codemod = new AppJsonCodemod();
codemod.migrateAppJson().catch(console.error);`;
    
    fs.writeFileSync('migrations/app-json-codemod.js', appJsonCodemod);
    
    console.log('✅ Codemods Node.js générés');
  }

  async createVersioningSystem() {
    console.log('🏷️ Création du système de versioning...');
    
    const versioningConfig = {
      version: this.currentVersion,
      rules: {
        major: 'Breaking changes',
        minor: 'New features, backward compatible',
        patch: 'Bug fixes, backward compatible'
      },
      autoIncrement: {
        enabled: true,
        strategy: 'semantic'
      },
      changelog: {
        autoGenerate: true,
        template: 'conventional'
      }
    };
    
    fs.writeFileSync('versioning/config.json', JSON.stringify(versioningConfig, null, 2));
    
    // Script de versioning automatique
    const versioningScript = `#!/usr/bin/env node

/**
 * 🏷️ AUTOMATIC VERSIONING SYSTEM
 * Système de versioning automatique
 */

const fs = require('fs');
const { execSync } = require('child_process');

class AutomaticVersioning {
  constructor() {
    this.config = require('./config.json');
  }
  
  async analyzeChanges() {
    try {
      // Analyser les commits depuis la dernière version
      const lastTag = this.getLastTag();
      const commits = this.getCommitsSince(lastTag);
      
      const changes = {
        breaking: 0,
        features: 0,
        fixes: 0,
        docs: 0
      };
      
      for (const commit of commits) {
        if (commit.includes('BREAKING CHANGE')) {
          changes.breaking++;
        } else if (commit.includes('feat:')) {
          changes.features++;
        } else if (commit.includes('fix:')) {
          changes.fixes++;
        } else if (commit.includes('docs:')) {
          changes.docs++;
        }
      }
      
      return changes;
    } catch (error) {
      console.error('❌ Erreur analyse des changements:', error.message);
      return null;
    }
  }
  
  getLastTag() {
    try {
      return execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
    } catch (error) {
      return 'v1.0.0'; // Version par défaut
    }
  }
  
  getCommitsSince(tag) {
    try {
      const commits = execSync(`git log ${tag}..HEAD --oneline`, { encoding: 'utf8' });
      return commits.split('\n').filter(c => c.trim());
    } catch (error) {
      return [];
    }
  }
  
  suggestNextVersion(changes) {
    if (changes.breaking > 0) {
      return 'major';
    } else if (changes.features > 0) {
      return 'minor';
    } else if (changes.fixes > 0 || changes.docs > 0) {
      return 'patch';
    }
    return 'patch';
  }
  
  async updateVersion(type) {
    try {
      const currentVersion = this.getCurrentVersion();
      const newVersion = this.incrementVersion(currentVersion, type);
      
      // Mettre à jour app.json
      const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
      appJson.version = newVersion;
      fs.writeFileSync('app.json', JSON.stringify(appJson, null, 2));
      
      // Mettre à jour package.json
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      packageJson.version = newVersion;
      fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
      
      console.log('✅ Version mise à jour:', newVersion);
      return newVersion;
      
    } catch (error) {
      console.error('❌ Erreur mise à jour version:', error.message);
      return null;
    }
  }
  
  getCurrentVersion() {
    const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
    return appJson.version;
  }
  
  incrementVersion(version, type) {
    const parts = version.split('.').map(Number);
    
    switch (type) {
      case 'major':
        parts[0]++;
        parts[1] = 0;
        parts[2] = 0;
        break;
      case 'minor':
        parts[1]++;
        parts[2] = 0;
        break;
      case 'patch':
        parts[2]++;
        break;
    }
    
    return parts.join('.');
  }
  
  async createTag(version) {
    try {
      execSync(`git tag -a v${version} -m "🚀 RELEASE v${version} - AUTOMATIC VERSIONING"`);
      execSync(`git push origin v${version}`);
      console.log('✅ Tag créé et poussé:', version);
    } catch (error) {
      console.error('❌ Erreur création tag:', error.message);
    }
  }
}

// Exécution du versioning automatique
const versioning = new AutomaticVersioning();

async function runVersioning() {
  const changes = await versioning.analyzeChanges();
  if (changes) {
    const nextType = versioning.suggestNextVersion(changes);
    const newVersion = await versioning.updateVersion(nextType);
    if (newVersion) {
      await versioning.createTag(newVersion);
    }
  }
}

runVersioning().catch(console.error);`;
    
    fs.writeFileSync('versioning/auto-versioning.js', versioningScript);
    
    console.log('✅ Système de versioning créé');
  }

  async setupAutoMigrations() {
    console.log('🔄 Configuration des migrations automatiques...');
    
    const autoMigrationConfig = {
      enabled: true,
      triggers: [
        'on-version-update',
        'on-driver-add',
        'on-schema-change'
      ],
      backup: {
        enabled: true,
        keepBackups: 5
      },
      rollback: {
        enabled: true,
        maxRollbacks: 3
      }
    };
    
    fs.writeFileSync('migrations/auto-migration-config.json', JSON.stringify(autoMigrationConfig, null, 2));
    
    // Script de migration automatique
    const autoMigrationScript = `#!/usr/bin/env node

/**
 * 🔄 AUTO MIGRATION SYSTEM
 * Système de migration automatique
 */

const fs = require('fs');
const path = require('path');
const config = require('./auto-migration-config.json');

class AutoMigration {
  constructor() {
    this.config = config;
    this.backupDir = 'migrations/backups';
  }
  
  async createBackup() {
    if (!this.config.backup.enabled) {
      return;
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `backup_${timestamp}`);
    
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
    
    // Créer une sauvegarde des drivers
    const driversPath = 'drivers';
    if (fs.existsSync(driversPath)) {
      this.copyDirectory(driversPath, path.join(backupPath, 'drivers'));
    }
    
    // Sauvegarder app.json
    if (fs.existsSync('app.json')) {
      fs.copyFileSync('app.json', path.join(backupPath, 'app.json'));
    }
    
    console.log('💾 Sauvegarde créée:', backupPath);
    return backupPath;
  }
  
  copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const files = fs.readdirSync(src);
    for (const file of files) {
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);
      
      if (fs.statSync(srcPath).isDirectory()) {
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
  
  async runMigration() {
    console.log('🔄 Début de la migration automatique...');
    
    // Créer une sauvegarde
    const backupPath = await this.createBackup();
    
    try {
      // Exécuter la migration de schéma
      const { execSync } = require('child_process');
      execSync('node migrations/migrate-schema.js', { stdio: 'inherit' });
      
      // Exécuter les codemods
      execSync('node migrations/driver-codemod.js', { stdio: 'inherit' });
      execSync('node migrations/app-json-codemod.js', { stdio: 'inherit' });
      
      console.log('✅ Migration automatique réussie');
      
      // Nettoyer les anciennes sauvegardes
      this.cleanupOldBackups();
      
    } catch (error) {
      console.error('❌ Erreur migration automatique:', error.message);
      
      // Rollback si activé
      if (this.config.rollback.enabled && backupPath) {
        await this.rollback(backupPath);
      }
    }
  }
  
  async rollback(backupPath) {
    console.log('🔄 Rollback vers la sauvegarde...');
    
    try {
      // Restaurer les drivers
      const driversBackup = path.join(backupPath, 'drivers');
      if (fs.existsSync(driversBackup)) {
        if (fs.existsSync('drivers')) {
          fs.rmSync('drivers', { recursive: true });
        }
        this.copyDirectory(driversBackup, 'drivers');
      }
      
      // Restaurer app.json
      const appJsonBackup = path.join(backupPath, 'app.json');
      if (fs.existsSync(appJsonBackup)) {
        fs.copyFileSync(appJsonBackup, 'app.json');
      }
      
      console.log('✅ Rollback réussi');
      
    } catch (error) {
      console.error('❌ Erreur rollback:', error.message);
    }
  }
  
  cleanupOldBackups() {
    if (!fs.existsSync(this.backupDir)) {
      return;
    }
    
    const backups = fs.readdirSync(this.backupDir)
      .filter(f => f.startsWith('backup_'))
      .sort()
      .reverse();
    
    // Garder seulement les N dernières sauvegardes
    const keepCount = this.config.backup.keepBackups;
    for (let i = keepCount; i < backups.length; i++) {
      const backupToRemove = path.join(this.backupDir, backups[i]);
      fs.rmSync(backupToRemove, { recursive: true });
      console.log('🗑️ Sauvegarde supprimée:', backupToRemove);
    }
  }
}

// Exécution de la migration automatique
const autoMigration = new AutoMigration();
autoMigration.runMigration().catch(console.error);`;
    
    fs.writeFileSync('migrations/auto-migration.js', autoMigrationScript);
    
    console.log('✅ Migrations automatiques configurées');
  }

  async generateReport() {
    console.log('📊 Génération du rapport...');
    
    const report = {
      timestamp: new Date().toISOString(),
      version: this.currentVersion,
      schemaMigration: {
        config: 'migrations/schema-migration.json',
        script: 'migrations/migrate-schema.js'
      },
      codemods: [
        'migrations/driver-codemod.js',
        'migrations/app-json-codemod.js'
      ],
      versioning: {
        config: 'versioning/config.json',
        script: 'versioning/auto-versioning.js'
      },
      autoMigration: {
        config: 'migrations/auto-migration-config.json',
        script: 'migrations/auto-migration.js'
      },
      features: [
        'Schema Migration System',
        'Node.js Codemods',
        'Automatic Versioning',
        'Auto Migration',
        'Backup & Rollback',
        'Semantic Versioning'
      ]
    };
    
    const reportPath = 'reports/version-migration-report.json';
    fs.mkdirSync('reports', { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📄 Rapport sauvegardé: ${reportPath}`);
    
    // Affichage du résumé
    console.log('\n📊 RÉSUMÉ VERSION MIGRATION SYSTEM:');
    console.log('📋 Migration de schéma créée');
    console.log('🔧 Codemods Node.js générés');
    console.log('🏷️ Système de versioning configuré');
    console.log('🔄 Migrations automatiques activées');
    console.log(`📋 Fonctionnalités: ${report.features.length}`);
  }
}

// Exécution immédiate
if (require.main === module) {
  const system = new VersionMigrationSystem();
  system.run().then(() => {
    console.log('🎉 VERSION MIGRATION SYSTEM TERMINÉ AVEC SUCCÈS !');
    process.exit(0);
  }).catch(error => {
    console.error('❌ ERREUR FATALE:', error);
    process.exit(1);
  });
}

module.exports = VersionMigrationSystem; 