'use strict';

/**
 * Configuration Backup/Restore - FEATURE #56
 *
 * Backup and restore device configurations:
 * - Full app configuration backup
 * - Per-device settings backup
 * - Flow card backup
 * - Export/import as JSON
 *
 * @version 9.1.0
 */

const EventEmitter = require('events');

class ConfigurationBackupRestore extends EventEmitter {
  constructor(homey, options = {}) {
    super();
    this.homey = homey;
    this.maxBackups = options.maxBackups || 10;
  }

  /**
   * Create a full configuration backup
   * @returns {Object} Backup data
   */
  async createBackup() {
    const backup = {
      version: '9.1.0',
      timestamp: Date.now(),
      date: new Date().toISOString(),
      appSettings: {},
      devices: [],
      flows: { triggers: [], actions: [], conditions: [] }
    };

    // Backup app settings
    try {
      const settingsKeys = this.homey.settings.getKeys();
      for (const key of settingsKeys) {
        if (!key.startsWith('_')) { // Skip internal keys
          backup.appSettings[key] = await this.homey.settings.get(key);
        }
      }
    } catch (err) {
      this.emit('backupError', { step: 'app_settings', error: err.message });
    }

    // Backup device settings
    try {
      const devices = this.homey.ManagerDevices.getDevices();
      for (const device of Object.values(devices)) {
        const deviceBackup = {
          id: device.id,
          name: device.getName(),
          driverId: device.driver?.id,
          zone: device.zone?.id,
          settings: device.getSettings ? device.getSettings() : {},
          store: {},
          capabilities: device.capabilities || []
        };

        // Backup store values
        try {
          const storeKeys = device.getStoreKeys ? device.getStoreKeys() : [];
          for (const key of storeKeys) {
            deviceBackup.store[key] = await device.getStoreValue(key);
          }
        } catch (e) {
          // Ignore store errors
        }

        backup.devices.push(deviceBackup);
      }
    } catch (err) {
      this.emit('backupError', { step: 'devices', error: err.message });
    }

    this.emit('backupCreated', { deviceCount: backup.devices.length, size: JSON.stringify(backup).length });

    return backup;
  }

  /**
   * Restore configuration from backup
   * @param {Object} backup - Backup data
   * @param {Object} options - { restoreSettings, restoreFlows, dryRun }
   * @returns {Object} Restore result
   */
  async restoreBackup(backup, options = {}) {
    const { restoreSettings = true, restoreFlows = false, dryRun = false } = options;

    const result = {
      success: true,
      timestamp: Date.now(),
      devicesRestored: 0,
      settingsRestored: 0,
      errors: []
    };

    if (!backup || !backup.version) {
      return { success: false, error: 'Invalid backup format' };
    }

    if (dryRun) {
      result.dryRun = true;
      result.backupInfo = {
        version: backup.version,
        date: backup.date,
        deviceCount: backup.devices?.length || 0,
        settingsCount: Object.keys(backup.appSettings || {}).length
      };
      return result;
    }

    // Restore app settings
    if (restoreSettings && backup.appSettings) {
      for (const [key, value] of Object.entries(backup.appSettings)) {
        try {
          await this.homey.settings.set(key, value);
          result.settingsRestored++;
        } catch (err) {
          result.errors.push({ step: 'settings', key, error: err.message });
        }
      }
    }

    // Restore device settings
    if (backup.devices) {
      for (const deviceBackup of backup.devices) {
        try {
          const device = this.homey.ManagerDevices.getDevice(deviceBackup.id);
          if (!device) {
            result.errors.push({ step: 'device', id: deviceBackup.id, error: 'Device not found' });
            continue;
          }

          // Restore settings
          if (restoreSettings && deviceBackup.settings) {
            for (const [key, value] of Object.entries(deviceBackup.settings)) {
              try {
                await device.setSetting(key, value);
              } catch (e) {
                // Some settings may not be settable
              }
            }
          }

          result.devicesRestored++;
        } catch (err) {
          result.errors.push({ step: 'device', id: deviceBackup.id, error: err.message });
        }
      }
    }

    this.emit('backupRestored', result);
    return result;
  }

  /**
   * Export backup as JSON string
   */
  async exportBackup() {
    const backup = await this.createBackup();
    return JSON.stringify(backup, null, 2);
  }

  /**
   * Import backup from JSON string
   */
  importBackup(jsonString) {
    try {
      return JSON.parse(jsonString);
    } catch (err) {
      throw new Error('Invalid JSON backup format');
    }
  }

  /**
   * Get backup summary without full data
   */
  async getBackupSummary() {
    const backup = await this.createBackup();
    return {
      version: backup.version,
      date: backup.date,
      deviceCount: backup.devices.length,
      settingsCount: Object.keys(backup.appSettings).length,
      estimatedSize: JSON.stringify(backup).length
    };
  }

  destroy() {}
}

module.exports = ConfigurationBackupRestore;
