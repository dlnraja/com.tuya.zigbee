'use strict';

/**
 * OTAManager - Over-The-Air firmware update manager
 * 
 * Monitors and manages OTA updates for Zigbee devices
 * Compatible with Homey Zigbee infrastructure
 * 
 * Based on zigpy OTA update mechanisms
 */
class OTAManager {

  constructor(device) {
    this.device = device;
    this.otaStatus = {
      available: false,
      currentVersion: null,
      availableVersion: null,
      updateInProgress: false,
      lastCheck: null
    };
  }

  /**
   * Initialize OTA Manager
   */
  async initialize() {
    this.device.log('📦 OTAManager initializing...');
    
    try {
      // Check if device supports OTA
      const supported = await this.checkOTASupport();
      if (!supported) {
        this.device.log('[INFO]  Device does not support OTA updates');
        return;
      }
      
      // Get current firmware version
      await this.getCurrentVersion();
      
      // Setup OTA cluster listener
      await this.setupOTAListener();
      
      this.device.log('[OK] OTAManager initialized successfully');
      
    } catch (err) {
      this.device.error('OTAManager initialization failed:', err);
    }
  }

  /**
   * Check if device supports OTA updates
   */
  async checkOTASupport() {
    const endpoint = this.device.zclNode?.endpoints?.[1];
    if (!endpoint) return false;
    
    // OTA Cluster ID: 25 (0x0019)
    return !!(endpoint.clusters[25] || endpoint.clusters[0x0019]);
  }

  /**
   * Get current firmware version
   */
  async getCurrentVersion() {
    try {
      const endpoint = this.device.zclNode?.endpoints?.[1];
      if (!endpoint) return null;
      
      const otaCluster = endpoint.clusters[25] || endpoint.clusters[0x0019];
      if (!otaCluster) return null;
      
      const result = await otaCluster.Promise.resolve(readAttributes(['currentFileVersion'])).catch(() => null);
      if (result && result.currentFileVersion !== undefined) {
        this.otaStatus.currentVersion = result.currentFileVersion;
        this.device.log(`📌 Current firmware version: ${this.otaStatus.currentVersion}`);
        
        // Store in device settings for user visibility
        await this.device.setSettings({ 
          firmware_version: `0x${this.otaStatus.currentVersion.toString(16)}` 
        }).catch(() => {});
      }
      
      return this.otaStatus.currentVersion;
      
    } catch (err) {
      this.device.error('Failed to get current firmware version:', err);
      return null;
    }
  }

  /**
   * Setup OTA cluster listener
   */
  async setupOTAListener() {
    try {
      const endpoint = this.device.zclNode?.endpoints?.[1];
      if (!endpoint) return;
      
      const otaCluster = endpoint.clusters[25] || endpoint.clusters[0x0019];
      if (!otaCluster) return;
      
      // Listen for OTA notifications
      otaCluster.on('upgradeEndRequest', this.handleUpgradeEnd.bind(this));
      otaCluster.on('imageNotify', this.handleImageNotify.bind(this));
      
      this.device.log('[OK] OTA cluster listener active');
      
    } catch (err) {
      this.device.error('Failed to setup OTA listener:', err);
    }
  }

  /**
   * Handle upgrade end notification
   */
  async handleUpgradeEnd(data) {
    this.device.log('📦 OTA Upgrade completed:', data);
    this.otaStatus.updateInProgress = false;
    
    // Refresh current version
    await this.getCurrentVersion();
    
    // Notify user
    await this.device.Promise.resolve(setWarning('Firmware updated successfully! Device may restart.')).catch(() => {});
  }

  /**
   * Handle image notify
   */
  async handleImageNotify(data) {
    this.device.log('📦 OTA Image available:', data);
    this.otaStatus.available = true;
    
    // Notify user
    await this.device.Promise.resolve(setWarning('Firmware update available for this device')).catch(() => {});
  }

  /**
   * Check for updates manually
   */
  async checkForUpdates() {
    this.device.log('[SEARCH] Checking for OTA updates...');
    
    try {
      const endpoint = this.device.zclNode?.endpoints?.[1];
      if (!endpoint) return { available: false, error: 'No endpoint' };
      
      const otaCluster = endpoint.clusters[25] || endpoint.clusters[0x0019];
      if (!otaCluster) return { available: false, error: 'No OTA cluster' };
      
      // Query next image
      const result = await otaCluster.command('queryNextImage', {
        fieldControl: 0,
        manufacturerCode: this.device.getData().manufacturerName || 0,
        imageType: 0,
        fileVersion: this.otaStatus.currentVersion || 0
      }).catch(err => {
        this.device.log('No update available:', err.message);
        return null;
      });
      
      if (result && result.status === 0) {
        this.otaStatus.available = true;
        this.otaStatus.availableVersion = result.fileVersion;
        this.device.log(`[OK] Update available: ${result.fileVersion}`);
        return { available: true, version: result.fileVersion };
      }
      
      this.otaStatus.lastCheck = new Date();
      return { available: false };
      
    } catch (err) {
      this.device.error('Failed to check for updates:', err);
      return { available: false, error: err.message };
    }
  }

  /**
   * Get OTA status
   */
  getStatus() {
    return this.otaStatus;
  }
}

module.exports = OTAManager;
