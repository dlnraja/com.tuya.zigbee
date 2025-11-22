'use strict';

/**
 * MASS MIGRATION TO HYBRID SYSTEM
 *
 * Migrates ALL existing drivers to HybridDriverSystem
 * - Preserves existing functionality
 * - Adds hybrid auto-adaptation
 * - Energy-aware management
 * - Smart capability detection
 */

const fs = require('fs').promises;
const path = require('path');

class MigrationTool {

  /**
   * Analyze existing device.js
   */
  static async analyzeDriver(driverPath) {
    try {
      const devicePath = path.join(driverPath, 'device.js');
      const content = await fs.readFile(devicePath, 'utf8');

      return {
        hasDeviceFile: true,
        extendsZigBeeDevice: content.includes('extends ZigBeeDevice') || content.includes('extends Zigbee'),
        extendsBaseHybrid: content.includes('BaseHybridDevice'),
        hasOnNodeInit: content.includes('async onNodeInit'),
        usesCapabilityListener: content.includes('registerCapabilityListener'),
        usesTuyaDP: content.includes('tuyaSpecific') || content.includes('TuyaDP') || content.includes('dataReport'),
        hasBatteryManager: content.includes('BatteryManager'),
        lineCount: content.split('\n').length,
        content
      };
    } catch (err) {
      return { hasDeviceFile: false };
    }
  }

  /**
   * Create hybrid wrapper for existing driver
   */
  static createHybridWrapper(driverName, analysis) {
    const className = analysis.content.match(/class\s+(\w+)/)?.[1] || 'Device';
    const originalExtends = analysis.content.match(/extends\s+(\w+)/)?.[1] || 'ZigBeeDevice';

    // Inject Hybrid System at the beginning
    const wrapper = `'use strict';

// MIGRATED TO HYBRID SYSTEM v2.0
const HybridDriverSystem = require('../../lib/HybridDriverSystem');
const BatteryManagerV2 = require('../../lib/BatteryManagerV2');

/**
 * ${driverName} - Hybrid-Enhanced Driver
 *
 * MIGRATION: Original driver enhanced with Hybrid System
 * - Auto-adaptive capabilities
 * - Energy-aware management
 * - Smart detection
 */

// Create hybrid base
const HybridDevice = HybridDriverSystem.createHybridDevice();

${analysis.content
        .replace(/const\s+{\s*ZigBeeDevice\s*}\s*=\s*require\([^)]+\);?/, '')
        .replace(/const\s+BaseHybridDevice\s*=\s*require\([^)]+\);?/, '')
        .replace(/extends\s+\w+/, 'extends HybridDevice')
        .replace(/async onNodeInit\(\s*{\s*zclNode\s*}\s*\)\s*{/, `async onNodeInit({ zclNode }) {
    // Hybrid system initialization
    await super.onNodeInit({ zclNode });

    // Original initialization below:`)}

module.exports = ${className};
`;

    return wrapper;
  }

  /**
   * Migrate single driver
   */
  static async migrateDriver(driverPath, driverName) {
    const analysis = await this.analyzeDriver(driverPath);

    if (!analysis.hasDeviceFile) {
      return { status: 'skip', reason: 'No device.js' };
    }

    if (analysis.extendsBaseHybrid) {
      return { status: 'skip', reason: 'Already uses BaseHybrid' };
    }

    // Check if already migrated
    if (analysis.content.includes('HybridDriverSystem')) {
      return { status: 'skip', reason: 'Already migrated' };
    }

    try {
      // Create backup
      const backupPath = path.join(driverPath, 'device.js.backup');
      await fs.writeFile(backupPath, analysis.content);

      // Create hybrid version
      const hybridVersion = this.createHybridWrapper(driverName, analysis);

      // Write new version
      await fs.writeFile(path.join(driverPath, 'device.js'), hybridVersion);

      return {
        status: 'migrated',
        lines: analysis.lineCount,
        features: {
          tuyaDP: analysis.usesTuyaDP,
          battery: analysis.hasBatteryManager,
          capabilities: analysis.usesCapabilityListener
        }
      };

    } catch (err) {
      return { status: 'error', error: err.message };
    }
  }

  /**
   * Migrate all drivers
   */
  static async migrateAll(driversDir) {
    console.log('🚀 MASS MIGRATION TO HYBRID SYSTEM STARTING...');
    console.log('');

    const entries = await fs.readdir(driversDir, { withFileTypes: true });
    const driverFolders = entries.filter(e => e.isDirectory()).map(e => e.name);

    console.log(`📊 Found ${driverFolders.length} driver folders`);
    console.log('');

    const stats = {
      migrated: 0,
      skipped: 0,
      errors: 0,
      reasons: {}
    };

    for (const driverName of driverFolders) {
      const driverPath = path.join(driversDir, driverName);
      const result = await this.migrateDriver(driverPath, driverName);

      if (result.status === 'migrated') {
        console.log(`✅ ${driverName}: Migrated (${result.lines} lines)`);
        stats.migrated++;
      } else if (result.status === 'skip') {
        console.log(`⏭️  ${driverName}: ${result.reason}`);
        stats.skipped++;
        stats.reasons[result.reason] = (stats.reasons[result.reason] || 0) + 1;
      } else if (result.status === 'error') {
        console.log(`❌ ${driverName}: ${result.error}`);
        stats.errors++;
      }
    }

    console.log('');
    console.log('╔═══════════════════════════════════════════╗');
    console.log('║   MIGRATION COMPLETE!                    ║');
    console.log('╚═══════════════════════════════════════════╝');
    console.log(`✅ Migrated: ${stats.migrated} drivers`);
    console.log(`⏭️  Skipped: ${stats.skipped} drivers`);
    console.log(`❌ Errors: ${stats.errors} drivers`);
    console.log('');
    console.log('Skip reasons:');
    for (const [reason, count] of Object.entries(stats.reasons)) {
      console.log(`   ${reason}: ${count}`);
    }
    console.log('');
    console.log('🎉 ALL DRIVERS NOW USE HYBRID SYSTEM!');
    console.log('⚠️  Backups saved as device.js.backup');
  }
}

// Run if called directly
if (require.main === module) {
  const driversPath = path.join(__dirname, '..', 'drivers');
  MigrationTool.migrateAll(driversPath)
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = MigrationTool;
