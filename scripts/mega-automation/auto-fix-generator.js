#!/usr/bin/env node

/**
 * 🔧 AUTO-FIX GENERATOR v1.0.0
 *
 * Générateur automatique de fixes intelligents:
 * - Application automatique fixes JSON/code
 * - Templates fixes pré-configurés
 * - Validation sécurisée avant application
 * - Rollback automatique si échec
 * - Intégration avec AI Problem Resolver
 */

const fs = require('fs').promises;
const path = require('path');

class AutoFixGenerator {
  constructor() {
    this.config = {
      backupDir: path.join(process.cwd(), 'backups', 'auto-fixes'),
      templatesDir: path.join(__dirname, 'fix-templates'),
      maxBackups: 10
    };

    this.fixTemplates = {
      batteryFix: {
        bindings: [1, 1280, 1281],
        clusters: [0, 1, 3, 1280, 1281],
        deviceMethod: `
  async onEndDeviceAnnounce() {
    await this.super.onEndDeviceAnnounce();

    try {
      const powerCfg = this.zclNode.endpoints[1].clusters.powerConfiguration;
      await powerCfg.bind('batteryPercentageRemaining');
      await powerCfg.configureReporting('batteryPercentageRemaining', {
        minInterval: 300,
        maxInterval: 3600,
        minChange: 1
      });
      this.log('Battery reporting configured');
    } catch (error) {
      this.error('Failed to configure battery reporting:', error);
    }
  }`
      },

      pairingFix: {
        resetInstructions: 'Reset device according to manufacturer instructions and re-pair',
        fingerprintUpdate: true
      },

      capabilityFix: {
        removeUnsupported: ['alarm_battery'],
        addRequired: ['measure_battery'],
        energyBatteries: []
      }
    };
  }

  /**
   * 🔧 Appliquer fix JSON merge
   */
  async applyJsonMerge(change) {
    try {
      const filePath = change.file;
      const backup = await this.createBackup(filePath);

      const content = JSON.parse(await fs.readFile(filePath, 'utf8'));

      // Merge changes
      for (const [key, value] of Object.entries(change.changes)) {
        const keyPath = key.split('.');
        let target = content;

        for (let i = 0; i < keyPath.length - 1; i++) {
          if (!target[keyPath[i]]) target[keyPath[i]] = {};
          target = target[keyPath[i]];
        }

        const finalKey = keyPath[keyPath.length - 1];

        if (Array.isArray(value) && Array.isArray(target[finalKey])) {
          // Merge arrays uniquely
          target[finalKey] = [...new Set([...target[finalKey], ...value])];
        } else {
          target[finalKey] = value;
        }
      }

      await fs.writeFile(filePath, JSON.stringify(content, null, 2));
      console.log(`✅ JSON merge applied to ${filePath}`);

      return { success: true, backup };

    } catch (error) {
      console.error(`❌ JSON merge failed for ${change.file}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🔧 Appliquer insertion de code
   */
  async applyCodeInsert(change) {
    try {
      const filePath = change.file;
      const backup = await this.createBackup(filePath);

      let content = await fs.readFile(filePath, 'utf8');

      // Insertion selon location
      switch (change.location) {
        case 'onEndDeviceAnnounce':
          if (!content.includes('onEndDeviceAnnounce')) {
            // Ajouter méthode complète
            const classMatch = content.match(/class\s+\w+Device\s+extends\s+[\w.]+\s*{/);
            if (classMatch) {
              const insertPos = content.indexOf('{', classMatch.index) + 1;
              content = content.slice(0, insertPos) + '\n' + change.code + '\n' + content.slice(insertPos);
            }
          } else {
            console.log('⚠️ onEndDeviceAnnounce already exists, skipping insertion');
          }
          break;

        default:
          // Insertion à la fin de la classe
          const lastBrace = content.lastIndexOf('}');
          content = content.slice(0, lastBrace) + '\n' + change.code + '\n' + content.slice(lastBrace);
      }

      await fs.writeFile(filePath, content);
      console.log(`✅ Code insertion applied to ${filePath}`);

      return { success: true, backup };

    } catch (error) {
      console.error(`❌ Code insertion failed for ${change.file}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🔧 Appliquer remplacement de fichier
   */
  async applyFileReplace(change) {
    try {
      const filePath = change.file;
      const backup = await this.createBackup(filePath);

      await fs.writeFile(filePath, change.content);
      console.log(`✅ File replacement applied to ${filePath}`);

      return { success: true, backup };

    } catch (error) {
      console.error(`❌ File replacement failed for ${change.file}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 💾 Créer backup avant modification
   */
  async createBackup(filePath) {
    try {
      await fs.mkdir(this.config.backupDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = path.basename(filePath);
      const backupPath = path.join(this.config.backupDir, `${fileName}.${timestamp}.backup`);

      const content = await fs.readFile(filePath, 'utf8');
      await fs.writeFile(backupPath, content);

      console.log(`💾 Backup created: ${backupPath}`);

      // Nettoyer anciens backups
      await this.cleanOldBackups();

      return backupPath;

    } catch (error) {
      console.error('❌ Backup creation failed:', error.message);
      return null;
    }
  }

  /**
   * 🧹 Nettoyer anciens backups
   */
  async cleanOldBackups() {
    try {
      const backups = await fs.readdir(this.config.backupDir);
      const backupFiles = backups
        .filter(f => f.endsWith('.backup'))
        .map(f => ({ name: f, path: path.join(this.config.backupDir, f) }))
        .sort((a, b) => b.name.localeCompare(a.name));

      if (backupFiles.length > this.config.maxBackups) {
        const toDelete = backupFiles.slice(this.config.maxBackups);
        for (const backup of toDelete) {
          await fs.unlink(backup.path);
          console.log(`🗑️ Deleted old backup: ${backup.name}`);
        }
      }

    } catch (error) {
      console.log('⚠️ Backup cleanup failed:', error.message);
    }
  }

  /**
   * 🔄 Rollback depuis backup
   */
  async rollbackFromBackup(backupPath, originalPath) {
    try {
      const backupContent = await fs.readFile(backupPath, 'utf8');
      await fs.writeFile(originalPath, backupContent);

      console.log(`🔄 Rollback successful: ${originalPath} restored from backup`);
      return true;

    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      return false;
    }
  }

  /**
   * 🎯 Générer fix batterie automatique
   */
  generateBatteryFix(manufacturerId, driverPath) {
    return {
      type: 'batteryFix',
      confidence: 0.9,
      description: `Auto-configure battery reporting for ${manufacturerId}`,
      changes: [
        {
          file: path.join(driverPath, 'driver.compose.json'),
          type: 'json_merge',
          changes: {
            'zigbee.bindings': this.fixTemplates.batteryFix.bindings,
            'zigbee.clusters': this.fixTemplates.batteryFix.clusters
          }
        },
        {
          file: path.join(driverPath, 'device.js'),
          type: 'code_insert',
          location: 'onEndDeviceAnnounce',
          code: this.fixTemplates.batteryFix.deviceMethod
        }
      ]
    };
  }

  /**
   * 🎯 Générer fix pairing automatique
   */
  generatePairingFix(manufacturerId, similarDevices, driverPath) {
    const productIds = similarDevices.map(d => d.productId).filter(Boolean);

    return {
      type: 'pairingFix',
      confidence: 0.8,
      description: `Fix pairing fingerprints for ${manufacturerId}`,
      changes: [
        {
          file: path.join(driverPath, 'driver.compose.json'),
          type: 'json_merge',
          changes: {
            'zigbee.manufacturerName': [manufacturerId],
            'zigbee.productId': productIds.length > 0 ? productIds : ['TS0601']
          }
        }
      ]
    };
  }

  /**
   * 🎯 Générer fix capability automatique
   */
  generateCapabilityFix(issues, driverPath) {
    const changes = [];

    // Fix driver.compose.json
    const composeChanges = {};

    if (issues.includes('alarm_battery_unsupported')) {
      composeChanges['capabilities'] = {
        remove: ['alarm_battery'],
        add: ['measure_battery']
      };
      composeChanges['energy'] = {
        batteries: ['INTERNAL']
      };
    }

    if (Object.keys(composeChanges).length > 0) {
      changes.push({
        file: path.join(driverPath, 'driver.compose.json'),
        type: 'json_merge',
        changes: composeChanges
      });
    }

    return {
      type: 'capabilityFix',
      confidence: 0.85,
      description: 'Fix capability issues for SDK3 compliance',
      changes
    };
  }

  /**
   * 🧪 Valider fix avant application
   */
  async validateFix(fix) {
    const validation = {
      safe: true,
      warnings: [],
      errors: []
    };

    for (const change of fix.changes) {
      // Vérifier que le fichier existe
      try {
        await fs.access(change.file);
      } catch (error) {
        validation.errors.push(`File not found: ${change.file}`);
        validation.safe = false;
        continue;
      }

      // Validations spécifiques par type
      switch (change.type) {
        case 'json_merge':
          try {
            const content = await fs.readFile(change.file, 'utf8');
            JSON.parse(content); // Validate JSON
          } catch (error) {
            validation.errors.push(`Invalid JSON in ${change.file}: ${error.message}`);
            validation.safe = false;
          }
          break;

        case 'code_insert':
          if (!change.code || change.code.trim().length === 0) {
            validation.errors.push(`Empty code insertion for ${change.file}`);
            validation.safe = false;
          }
          break;
      }
    }

    // Warnings pour confiance faible
    if (fix.confidence < 0.7) {
      validation.warnings.push(`Low confidence fix (${Math.round(fix.confidence * 100)}%)`);
    }

    return validation;
  }

  /**
   * 🚀 Exécution complète du fix
   */
  async executeFix(fix) {
    try {
      console.log(`🚀 Executing fix: ${fix.description}`);

      // Validation préalable
      const validation = await this.validateFix(fix);
      if (!validation.safe) {
        console.error('❌ Fix validation failed:', validation.errors);
        return { success: false, errors: validation.errors };
      }

      if (validation.warnings.length > 0) {
        console.log('⚠️ Fix warnings:', validation.warnings);
      }

      const results = [];
      let allSuccessful = true;

      // Appliquer changements un par un
      for (const change of fix.changes) {
        let result;

        switch (change.type) {
          case 'json_merge':
            result = await this.applyJsonMerge(change);
            break;
          case 'code_insert':
            result = await this.applyCodeInsert(change);
            break;
          case 'file_replace':
            result = await this.applyFileReplace(change);
            break;
          default:
            result = { success: false, error: `Unknown change type: ${change.type}` };
        }

        results.push({ change, result });
        if (!result.success) {
          allSuccessful = false;
          break;
        }
      }

      // Rollback en cas d'échec
      if (!allSuccessful) {
        console.log('🔄 Rolling back changes due to failures...');
        for (const { change, result } of results) {
          if (result.success && result.backup) {
            await this.rollbackFromBackup(result.backup, change.file);
          }
        }
      }

      return {
        success: allSuccessful,
        results,
        validation
      };

    } catch (error) {
      console.error('❌ Fix execution failed:', error.message);
      return { success: false, error: error.message };
    }
  }
}

// CLI execution
if (require.main === module) {
  const generator = new AutoFixGenerator();

  // Exemple d'utilisation
  const exampleFix = generator.generateBatteryFix(
    '_TZE200_example',
    path.join(process.cwd(), 'drivers', 'example_driver')
  );

  generator.executeFix(exampleFix)
    .then(result => {
      if (result.success) {
        console.log('🎉 Fix executed successfully');
      } else {
        console.error('💥 Fix execution failed');
      }
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Auto-fix generator failed:', error);
      process.exit(1);
    });
}

module.exports = AutoFixGenerator;
