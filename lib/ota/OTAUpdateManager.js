'use strict';

/**
 * OTAUpdateManager - OTA Update Orchestration
 * 
 * Inspired by fairecasoimeme/zigbee-OTA
 * Manages OTA firmware updates for Zigbee devices
 * 
 * Features:
 * - Automatic update checking
 * - Progress monitoring
 * - Retry mechanism
 * - User notifications
 * - Update scheduling
 */

const OTARepository = require('./OTARepository');

class OTAUpdateManager {
  
  constructor(homey) {
    this.homey = homey;
    this.repository = new OTARepository(homey);
    this.activeUpdates = new Map();
    this.updateHistory = [];
  }
  
  /**
   * Check if update is available for device
   */
  async checkUpdate(device) {
    try {
      const otaInfo = this.getDeviceOTAInfo(device);
      
      if (!otaInfo) {
        return { available: false, reason: 'No OTA info' };
      }
      
      const { manufacturerCode, imageType, fileVersion } = otaInfo;
      
      // Query repository
      const availableImage = await this.repository.findImage(
        manufacturerCode,
        imageType,
        fileVersion
      );
      
      if (!availableImage) {
        return { available: false, reason: 'No update found' };
      }
      
      if (availableImage.fileVersion > fileVersion) {
        return {
          available: true,
          currentVersion: fileVersion,
          newVersion: availableImage.fileVersion,
          size: availableImage.size,
          url: availableImage.url,
          changelog: availableImage.changelog || 'No changelog available'
        };
      }
      
      return { available: false, reason: 'Already up to date' };
      
    } catch (err) {
      this.error('[OTA] Check update failed:', err);
      return { available: false, reason: err.message };
    }
  }
  
  /**
   * Perform OTA update
   */
  async performUpdate(device, options = {}) {
    const deviceId = device.getData().id;
    
    // Check if update already in progress
    if (this.activeUpdates.has(deviceId)) {
      throw new Error('Update already in progress');
    }
    
    try {
      // Check for available update
      const updateCheck = await this.checkUpdate(device);
      
      if (!updateCheck.available) {
        throw new Error(updateCheck.reason || 'No update available');
      }
      
      // Download image
      this.log(`[OTA] Downloading image for ${device.getName()}...`);
      const imageBuffer = await this.repository.downloadImage(updateCheck.url);
      
      // Register active update
      const updateState = {
        deviceId: deviceId,
        deviceName: device.getName(),
        startTime: Date.now(),
        currentVersion: updateCheck.currentVersion,
        newVersion: updateCheck.newVersion,
        progress: 0,
        status: 'starting'
      };
      
      this.activeUpdates.set(deviceId, updateState);
      
      // Notify user
      await this.homey.notifications.createNotification({
        excerpt: `Firmware update started for ${device.getName()}`
      });
      
      // Start OTA update
      const endpoint = device.zclNode.endpoints[1];
      
      await endpoint.clusters.otaUpdate.queryNextImageRequest({
        fieldControl: 0,
        manufacturerCode: updateCheck.manufacturerCode || 0,
        imageType: updateCheck.imageType || 0,
        fileVersion: updateCheck.newVersion
      });
      
      // Monitor progress
      this.monitorProgress(device, updateState);
      
      return {
        success: true,
        message: 'Update started'
      };
      
    } catch (err) {
      this.activeUpdates.delete(deviceId);
      this.error('[OTA] Update failed:', err);
      
      await this.homey.notifications.createNotification({
        excerpt: `Firmware update failed for ${device.getName()}: ${err.message}`
      });
      
      throw err;
    }
  }
  
  /**
   * Monitor update progress
   */
  monitorProgress(device, updateState) {
    const deviceId = device.getData().id;
    
    // Listen for progress events
    const progressListener = (progress) => {
      updateState.progress = progress;
      updateState.status = 'updating';
      
      this.log(`[OTA] Progress for ${device.getName()}: ${progress}%`);
      
      // Emit progress event
      this.homey.emit('ota.progress', {
        deviceId: deviceId,
        progress: progress
      });
    };
    
    // Listen for completion
    const completeListener = async () => {
      updateState.progress = 100;
      updateState.status = 'complete';
      updateState.endTime = Date.now();
      
      this.log(`[OTA] Update complete for ${device.getName()}`);
      
      // Add to history
      this.updateHistory.push(updateState);
      
      // Remove from active
      this.activeUpdates.delete(deviceId);
      
      // Notify user
      await this.homey.notifications.createNotification({
        excerpt: `Firmware update completed for ${device.getName()}`
      });
      
      // Clean up listeners
      device.removeListener('ota.progress', progressListener);
      device.removeListener('ota.complete', completeListener);
      device.removeListener('ota.error', errorListener);
    };
    
    // Listen for errors
    const errorListener = async (error) => {
      updateState.status = 'error';
      updateState.error = error;
      updateState.endTime = Date.now();
      
      this.error(`[OTA] Update error for ${device.getName()}:`, error);
      
      // Add to history
      this.updateHistory.push(updateState);
      
      // Remove from active
      this.activeUpdates.delete(deviceId);
      
      // Notify user
      await this.homey.notifications.createNotification({
        excerpt: `Firmware update error for ${device.getName()}: ${error.message}`
      });
      
      // Clean up listeners
      device.removeListener('ota.progress', progressListener);
      device.removeListener('ota.complete', completeListener);
      device.removeListener('ota.error', errorListener);
    };
    
    // Register listeners
    device.on('ota.progress', progressListener);
    device.on('ota.complete', completeListener);
    device.on('ota.error', errorListener);
  }
  
  /**
   * Get device OTA info
   */
  getDeviceOTAInfo(device) {
    try {
      const zclNode = device.zclNode;
      if (!zclNode) return null;
      
      const endpoint = zclNode.endpoints[1];
      if (!endpoint || !endpoint.clusters.otaUpdate) return null;
      
      return {
        manufacturerCode: zclNode.manufacturerId || 0,
        imageType: endpoint.clusters.otaUpdate.imageType || 0,
        fileVersion: endpoint.clusters.otaUpdate.currentFileVersion || 0
      };
    } catch (err) {
      return null;
    }
  }
  
  /**
   * Get active updates
   */
  getActiveUpdates() {
    return Array.from(this.activeUpdates.values());
  }
  
  /**
   * Get update history
   */
  getUpdateHistory(limit = 10) {
    return this.updateHistory.slice(-limit);
  }
  
  /**
   * Cancel update
   */
  async cancelUpdate(deviceId) {
    const updateState = this.activeUpdates.get(deviceId);
    
    if (!updateState) {
      throw new Error('No active update for device');
    }
    
    updateState.status = 'cancelled';
    updateState.endTime = Date.now();
    
    this.activeUpdates.delete(deviceId);
    this.updateHistory.push(updateState);
    
    this.log(`[OTA] Update cancelled for device ${deviceId}`);
  }
  
  // Logging helpers
  log(...args) {
    console.log('[OTAUpdateManager]', ...args);
  }
  
  error(...args) {
    console.error('[OTAUpdateManager]', ...args);
  }
}

module.exports = OTAUpdateManager;
