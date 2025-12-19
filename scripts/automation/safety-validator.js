#!/usr/bin/env node

/**
 * 🛡️ SAFETY VALIDATOR v1.0.0
 *
 * Système de validation et sécurité pour l'automatisation GitHub
 *
 * PROTECTION CONTRE:
 * - Devices dupliqués ou conflictuels
 * - Corruption des fichiers driver.compose.json
 * - Ajouts dans les mauvais drivers
 * - Surcharge du système (trop d'ajouts simultanés)
 * - Erreurs de build cassant l'app
 * - Commits corrompus ou incomplets
 *
 * FONCTIONNALITÉS:
 * - Backup automatique avant modifications
 * - Validation des fingerprints Zigbee
 * - Test de build avant commit
 * - Rollback automatique en cas d'erreur
 * - Quarantaine des devices suspects
 * - Rate limiting et throttling
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class SafetyValidator {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.config = {
      // Limits and thresholds
      maxDevicesPerRun: 5,
      maxDevicesPerDriver: 50,
      backupRetentionDays: 7,

      // Validation rules
      requiredFields: ['manufacturerName', 'productId'],
      validManufacturerPattern: /^_TZ[0-9A-Z]{4}_[a-zA-Z0-9]{8,12}$/,
      validProductPattern: /^TS[0-9]{4}[A-Z]?$/,

      // Paths
      driversPath: path.join(projectRoot, 'drivers'),
      backupPath: path.join(projectRoot, 'backups', 'automation'),
      quarantinePath: path.join(projectRoot, 'quarantine'),

      // Blacklists and rules
      blacklistedManufacturers: [
        '_TZ0000_invalid',
        '_TEST_device'
      ],

      conflictRules: {
        // Devices that should not coexist in certain drivers
        'climate_sensor': ['gas_detector', 'smoke_detector'],
        'gas_detector': ['climate_sensor', 'smoke_detector_advanced'],
        'smoke_detector': ['gas_detector', 'climate_sensor']
      }
    };

    this.state = {
      backups: new Map(),
      validationErrors: [],
      quarantinedDevices: [],
      processedDrivers: new Set()
    };

    this.initializeDirectories();
  }

  /**
   * 📁 Initialize required directories
   */
  async initializeDirectories() {
    const dirs = [this.config.backupPath, this.config.quarantinePath];

    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        console.warn(`Failed to create directory ${dir}:`, error.message);
      }
    }
  }

  /**
   * 📝 Log with timestamp
   */
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [SAFETY/${level}] ${message}`;
    console.log(logLine);

    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  /**
   * 💾 Create backup of driver before modification
   */
  async createDriverBackup(driverName) {
    try {
      const driverPath = path.join(this.config.driversPath, driverName, 'driver.compose.json');
      const backupDir = path.join(this.config.backupPath, new Date().toISOString().split('T')[0]);

      await fs.mkdir(backupDir, { recursive: true });

      const backupPath = path.join(backupDir, `${driverName}_${Date.now()}.json`);
      await fs.copyFile(driverPath, backupPath);

      this.state.backups.set(driverName, backupPath);
      this.log('INFO', `Backup created for driver ${driverName}`, { backupPath });

      return backupPath;

    } catch (error) {
      this.log('ERROR', `Failed to backup driver ${driverName}:`, error);
      throw new Error(`Backup failed: ${error.message}`);
    }
  }

  /**
   * 🔄 Restore driver from backup
   */
  async restoreDriverBackup(driverName) {
    try {
      const backupPath = this.state.backups.get(driverName);
      if (!backupPath) {
        throw new Error(`No backup found for driver ${driverName}`);
      }

      const driverPath = path.join(this.config.driversPath, driverName, 'driver.compose.json');
      await fs.copyFile(backupPath, driverPath);

      this.log('INFO', `Driver ${driverName} restored from backup`);
      return true;

    } catch (error) {
      this.log('ERROR', `Failed to restore driver ${driverName}:`, error);
      return false;
    }
  }

  /**
   * 🔍 Validate device fingerprint
   */
  validateDeviceFingerprint(fingerprint) {
    const errors = [];

    // Check required fields
    for (const field of this.config.requiredFields) {
      if (!fingerprint[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate manufacturer name format
    if (fingerprint.manufacturerName && !this.config.validManufacturerPattern.test(fingerprint.manufacturerName)) {
      errors.push(`Invalid manufacturer name format: ${fingerprint.manufacturerName}`);
    }

    // Validate product ID format
    if (fingerprint.productId && !this.config.validProductPattern.test(fingerprint.productId)) {
      errors.push(`Invalid product ID format: ${fingerprint.productId}`);
    }

    // Check blacklist
    if (fingerprint.manufacturerName && this.config.blacklistedManufacturers.includes(fingerprint.manufacturerName)) {
      errors.push(`Blacklisted manufacturer: ${fingerprint.manufacturerName}`);
    }

    // Check for suspicious patterns
    if (fingerprint.deviceName && fingerprint.deviceName.toLowerCase().includes('test')) {
      errors.push(`Suspicious device name contains 'test': ${fingerprint.deviceName}`);
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * 🔍 Check for device conflicts in driver
   */
  async checkDeviceConflicts(driverName, newFingerprint) {
    try {
      const driverPath = path.join(this.config.driversPath, driverName, 'driver.compose.json');
      const driverContent = await fs.readFile(driverPath, 'utf8');
      const driverConfig = JSON.parse(driverContent);

      const conflicts = [];

      // Check if device already exists
      const existingMfrs = driverConfig.zigbee.manufacturerName || [];
      const existingProducts = driverConfig.zigbee.productId || [];

      if (existingMfrs.includes(newFingerprint.manufacturerName)) {
        conflicts.push({
          type: 'DUPLICATE_MANUFACTURER',
          message: `Manufacturer ${newFingerprint.manufacturerName} already exists in ${driverName}`,
          severity: 'HIGH'
        });
      }

      if (existingProducts.includes(newFingerprint.productId)) {
        conflicts.push({
          type: 'DUPLICATE_PRODUCT',
          message: `Product ${newFingerprint.productId} already exists in ${driverName}`,
          severity: 'HIGH'
        });
      }

      // Check driver capacity limits
      if (existingMfrs.length >= this.config.maxDevicesPerDriver) {
        conflicts.push({
          type: 'DRIVER_CAPACITY',
          message: `Driver ${driverName} has reached maximum device capacity (${this.config.maxDevicesPerDriver})`,
          severity: 'MEDIUM'
        });
      }

      // Check for category conflicts
      const conflictCategories = this.config.conflictRules[driverName] || [];
      for (const category of conflictCategories) {
        if (newFingerprint.category === category) {
          conflicts.push({
            type: 'CATEGORY_CONFLICT',
            message: `Device category ${category} conflicts with driver ${driverName}`,
            severity: 'HIGH'
          });
        }
      }

      return conflicts;

    } catch (error) {
      this.log('ERROR', `Failed to check conflicts for ${driverName}:`, error);
      return [{
        type: 'VALIDATION_ERROR',
        message: `Could not validate conflicts: ${error.message}`,
        severity: 'HIGH'
      }];
    }
  }

  /**
   * 🧪 Test build after modifications
   */
  async testBuild() {
    try {
      this.log('INFO', 'Testing app build after modifications...');

      // Run homey app build in test mode
      const buildOutput = execSync('homey app build', {
        cwd: this.projectRoot,
        encoding: 'utf8',
        stdio: 'pipe'
      });

      this.log('SUCCESS', 'Build test passed');
      return {
        success: true,
        output: buildOutput
      };

    } catch (error) {
      this.log('ERROR', 'Build test failed:', error);
      return {
        success: false,
        error: error.message,
        output: error.stdout || error.stderr
      };
    }
  }

  /**
   * 🔒 Quarantine problematic device
   */
  async quarantineDevice(fingerprint, reason) {
    try {
      const quarantineFile = path.join(
        this.config.quarantinePath,
        `${fingerprint.manufacturerName}_${Date.now()}.json`
      );

      const quarantineData = {
        fingerprint: fingerprint,
        reason: reason,
        timestamp: new Date().toISOString(),
        source: 'auto-validation'
      };

      await fs.writeFile(quarantineFile, JSON.stringify(quarantineData, null, 2));

      this.state.quarantinedDevices.push(quarantineData);
      this.log('WARN', `Device quarantined: ${fingerprint.manufacturerName}`, { reason });

      return quarantineFile;

    } catch (error) {
      this.log('ERROR', `Failed to quarantine device:`, error);
      return null;
    }
  }

  /**
   * 🔍 Validate and approve device addition
   */
  async validateDeviceAddition(driverName, fingerprint) {
    this.log('INFO', `Validating device addition to ${driverName}...`, fingerprint);

    const validationResult = {
      approved: false,
      warnings: [],
      errors: [],
      quarantined: false
    };

    try {
      // 1. Validate fingerprint format
      const fingerprintValidation = this.validateDeviceFingerprint(fingerprint);
      if (!fingerprintValidation.valid) {
        validationResult.errors.push(...fingerprintValidation.errors);
        await this.quarantineDevice(fingerprint, 'Invalid fingerprint format');
        validationResult.quarantined = true;
        return validationResult;
      }

      // 2. Check for conflicts
      const conflicts = await this.checkDeviceConflicts(driverName, fingerprint);
      const highSeverityConflicts = conflicts.filter(c => c.severity === 'HIGH');
      const mediumSeverityConflicts = conflicts.filter(c => c.severity === 'MEDIUM');

      if (highSeverityConflicts.length > 0) {
        validationResult.errors.push(...highSeverityConflicts.map(c => c.message));
        await this.quarantineDevice(fingerprint, `High severity conflicts: ${highSeverityConflicts.map(c => c.type).join(', ')}`);
        validationResult.quarantined = true;
        return validationResult;
      }

      if (mediumSeverityConflicts.length > 0) {
        validationResult.warnings.push(...mediumSeverityConflicts.map(c => c.message));
      }

      // 3. Create backup before proceeding
      await this.createDriverBackup(driverName);

      // 4. If we get here, device is approved
      validationResult.approved = true;
      this.log('SUCCESS', `Device validation passed for ${driverName}`, {
        manufacturerName: fingerprint.manufacturerName,
        productId: fingerprint.productId,
        warnings: validationResult.warnings
      });

    } catch (error) {
      validationResult.errors.push(`Validation failed: ${error.message}`);
      this.log('ERROR', 'Device validation failed:', error);
    }

    return validationResult;
  }

  /**
   * 🔄 Rollback all changes if build fails
   */
  async rollbackChanges() {
    this.log('WARN', 'Rolling back all driver changes...');

    let rollbackCount = 0;
    for (const driverName of this.state.processedDrivers) {
      const success = await this.restoreDriverBackup(driverName);
      if (success) {
        rollbackCount++;
      }
    }

    this.log('INFO', `Rolled back ${rollbackCount} drivers`);
    this.state.processedDrivers.clear();

    return rollbackCount;
  }

  /**
   * 🧹 Clean old backups
   */
  async cleanOldBackups() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.backupRetentionDays);

      const backupDirs = await fs.readdir(this.config.backupPath);
      let cleanedCount = 0;

      for (const dirName of backupDirs) {
        const dirDate = new Date(dirName);
        if (dirDate < cutoffDate) {
          const dirPath = path.join(this.config.backupPath, dirName);
          await fs.rmdir(dirPath, { recursive: true });
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        this.log('INFO', `Cleaned ${cleanedCount} old backup directories`);
      }

    } catch (error) {
      this.log('WARN', 'Failed to clean old backups:', error);
    }
  }

  /**
   * 🔍 Validate entire automation batch
   */
  async validateAutomationBatch(devices) {
    this.log('INFO', `Validating batch of ${devices.length} devices...`);

    // Check batch size limits
    if (devices.length > this.config.maxDevicesPerRun) {
      this.log('WARN', `Batch size ${devices.length} exceeds limit ${this.config.maxDevicesPerRun}, truncating`);
      devices = devices.slice(0, this.config.maxDevicesPerRun);
    }

    const results = {
      approved: [],
      rejected: [],
      warnings: [],
      totalProcessed: 0
    };

    // Validate each device
    for (const device of devices) {
      results.totalProcessed++;

      const validation = await this.validateDeviceAddition(device.driver, device.fingerprint);

      if (validation.approved) {
        results.approved.push(device);
        this.state.processedDrivers.add(device.driver);
      } else {
        results.rejected.push({
          device: device,
          errors: validation.errors,
          quarantined: validation.quarantined
        });
      }

      if (validation.warnings.length > 0) {
        results.warnings.push(...validation.warnings);
      }
    }

    this.log('INFO', `Batch validation complete:`, {
      approved: results.approved.length,
      rejected: results.rejected.length,
      warnings: results.warnings.length
    });

    return results;
  }

  /**
   * 📊 Generate safety report
   */
  generateSafetyReport() {
    return {
      timestamp: new Date().toISOString(),
      backups: Array.from(this.state.backups.entries()),
      quarantined: this.state.quarantinedDevices.length,
      processedDrivers: Array.from(this.state.processedDrivers),
      validationErrors: this.state.validationErrors.length,
      config: {
        maxDevicesPerRun: this.config.maxDevicesPerRun,
        maxDevicesPerDriver: this.config.maxDevicesPerDriver,
        backupRetentionDays: this.config.backupRetentionDays
      }
    };
  }
}

module.exports = SafetyValidator;

// CLI usage
if (require.main === module) {
  const validator = new SafetyValidator(process.cwd());

  const args = process.argv.slice(2);
  const action = args[0];

  switch (action) {
    case 'test-build':
      validator.testBuild().then(result => {
        console.log('Build test result:', result);
        process.exit(result.success ? 0 : 1);
      });
      break;

    case 'rollback':
      validator.rollbackChanges().then(count => {
        console.log(`Rolled back ${count} drivers`);
      });
      break;

    case 'clean-backups':
      validator.cleanOldBackups().then(() => {
        console.log('Old backups cleaned');
      });
      break;

    case 'report':
      const report = validator.generateSafetyReport();
      console.log(JSON.stringify(report, null, 2));
      break;

    default:
      console.log(`
🛡️ Safety Validator CLI

Usage: node safety-validator.js <action>

Actions:
  test-build    - Test app build
  rollback      - Rollback all driver changes
  clean-backups - Clean old backup files
  report        - Generate safety report
      `);
  }
}
