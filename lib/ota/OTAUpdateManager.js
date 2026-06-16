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

    // v9.1.0: Firmware version tracking and endpoint change detection (Issue #2)
    this.firmwareVersions = new Map(); // deviceId -> { version, endpointSnapshot, lastChecked }
    this.endpointWatchers = new Map(); // deviceId -> intervalId
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // v9.1.0: FIRMWARE VERSION TRACKING & ENDPOINT CHANGE DETECTION (Issue #2)
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Track firmware version for a device
   * Called during device initialization to establish baseline
   */
  trackFirmwareVersion(device) {
    try {
      const deviceId = device.getData()?.id;
      if (!deviceId) return;

      const otaInfo = this.getDeviceOTAInfo(device);
      if (!otaInfo) return;

      const endpointSnapshot = this._captureEndpointSnapshot(device);

      this.firmwareVersions.set(deviceId, {
        version: otaInfo.fileVersion,
        manufacturerCode: otaInfo.manufacturerCode,
        imageType: otaInfo.imageType,
        endpointSnapshot,
        lastChecked: Date.now(),
        lastVersionChange: null
      });

      this.log(`[OTA-TRACK] Tracked firmware v${otaInfo.fileVersion} for ${device.getName()}`);
    } catch (err) {
      this.log(`[OTA-TRACK] Failed to track firmware: ${err.message}`);
    }
  }

  /**
   * Check if firmware has changed since last check
   * Returns change info if endpoints were modified by OTA
   */
  checkFirmwareChange(device) {
    try {
      const deviceId = device.getData()?.id;
      if (!deviceId) return null;

      const tracked = this.firmwareVersions.get(deviceId);
      if (!tracked) return null;

      const currentInfo = this.getDeviceOTAInfo(device);
      if (!currentInfo) return null;

      const changes = [];

      // Check version change
      if (currentInfo.fileVersion !== tracked.version) {
        changes.push({
          type: 'version',
          from: tracked.version,
          to: currentInfo.fileVersion
        });
        this.log(`[OTA-TRACK] Firmware version changed: ${tracked.version} -> ${currentInfo.fileVersion}`);
      }

      // Check endpoint changes
      const currentSnapshot = this._captureEndpointSnapshot(device);
      const endpointChanges = this._compareEndpointSnapshots(tracked.endpointSnapshot, currentSnapshot);

      if (endpointChanges.length > 0) {
        changes.push(...endpointChanges);
        this.log(`[OTA-TRACK] Endpoint changes detected:`, endpointChanges);
      }

      if (changes.length > 0) {
        // Update tracked info
        this.firmwareVersions.set(deviceId, {
          ...tracked,
          version: currentInfo.fileVersion,
          endpointSnapshot: currentSnapshot,
          lastChecked: Date.now(),
          lastVersionChange: Date.now()
        });

        return {
          deviceId,
          deviceName: device.getName(),
          changes,
          timestamp: Date.now()
        };
      }

      // Update lastChecked
      tracked.lastChecked = Date.now();
      return null;

    } catch (err) {
      this.log(`[OTA-TRACK] Firmware check error: ${err.message}`);
      return null;
    }
  }

  /**
   * Capture endpoint snapshot for comparison
   */
  _captureEndpointSnapshot(device) {
    try {
      const zclNode = device.zclNode;
      if (!zclNode?.endpoints) return {};

      const snapshot = {};
      for (const [epId, endpoint] of Object.entries(zclNode.endpoints)) {
        snapshot[epId] = {
          clusters: Object.keys(endpoint.clusters || {}),
          manufacturerId: endpoint.manufacturerId || null,
          profileId: endpoint.profileId || null,
          deviceId: endpoint.deviceId || null
        };
      }
      return snapshot;
    } catch (err) {
      return {};
    }
  }

  /**
   * Compare endpoint snapshots and detect changes
   */
  _compareEndpointSnapshots(oldSnapshot, newSnapshot) {
    const changes = [];

    // Check for removed endpoints
    for (const epId of Object.keys(oldSnapshot)) {
      if (!newSnapshot[epId]) {
        changes.push({
          type: 'endpoint_removed',
          endpoint: epId,
          detail: `Endpoint ${epId} removed after firmware update`
        });
      }
    }

    // Check for added or modified endpoints
    for (const [epId, newEp] of Object.entries(newSnapshot)) {
      const oldEp = oldSnapshot[epId];

      if (!oldEp) {
        changes.push({
          type: 'endpoint_added',
          endpoint: epId,
          detail: `Endpoint ${epId} added after firmware update`
        });
      } else {
        // Check cluster changes
        const oldClusters = new Set(oldEp.clusters);
        const newClusters = new Set(newEp.clusters);

        const addedClusters = [...newClusters].filter(c => !oldClusters.has(c));
        const removedClusters = [...oldClusters].filter(c => !newClusters.has(c));

        if (addedClusters.length > 0) {
          changes.push({
            type: 'clusters_added',
            endpoint: epId,
            clusters: addedClusters,
            detail: `Clusters added on EP${epId}: ${addedClusters.join(', ')}`
          });
        }

        if (removedClusters.length > 0) {
          changes.push({
            type: 'clusters_removed',
            endpoint: epId,
            clusters: removedClusters,
            detail: `Clusters removed from EP${epId}: ${removedClusters.join(', ')}`
          });
        }
      }
    }

    return changes;
  }

  /**
   * Notify user about endpoint changes after firmware update
   */
  async notifyEndpointChanges(changeInfo) {
    if (!changeInfo || !changeInfo.changes.length) return;

    const summary = changeInfo.changes
      .map(c => c.detail)
      .join('; ');

    try {
      await this.homey.notifications.createNotification({
        excerpt: `[${changeInfo.deviceName}] Firmware update changed device endpoints: ${summary}. Re-pairing may be needed if device stops working.`
      });
    } catch (e) { /* notification failed */ }

    this.log(`[OTA-TRACK] Endpoint changes for ${changeInfo.deviceName}: ${summary}`);
  }

  /**
   * Start watching a device for endpoint changes
   */
  startEndpointWatcher(device, intervalMs = 300000) { // 5 min default
    const deviceId = device.getData()?.id;
    if (!deviceId) return;

    // Stop existing watcher if any
    this.stopEndpointWatcher(deviceId);

    // Track initial firmware version
    this.trackFirmwareVersion(device);

    // Start periodic checks
    const intervalId = this.homey.setInterval(() => {
      const changeInfo = this.checkFirmwareChange(device);
      if (changeInfo) {
        this.notifyEndpointChanges(changeInfo);
      }
    }, intervalMs);

    this.endpointWatchers.set(deviceId, intervalId);
    this.log(`[OTA-TRACK] Started endpoint watcher for ${device.getName()}`);
  }

  /**
   * Stop watching a device
   */
  stopEndpointWatcher(deviceId) {
    const intervalId = this.endpointWatchers.get(deviceId);
    if (intervalId) {
      clearInterval(intervalId);
      this.endpointWatchers.delete(deviceId);
    }
  }

  /**
   * Cleanup all watchers
   */
  cleanup() {
    for (const [deviceId, intervalId] of this.endpointWatchers) {
      clearInterval(intervalId);
    }
    this.endpointWatchers.clear();
    this.firmwareVersions.clear();
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

      // v9.1.0: Check for endpoint changes after firmware update
      setTimeout(async () => {
        try {
          const changeInfo = this.checkFirmwareChange(device);
          if (changeInfo) {
            await this.notifyEndpointChanges(changeInfo);
          }
          // Restart endpoint watcher with new baseline
          this.startEndpointWatcher(device);
        } catch (e) {
          this.log(`[OTA-TRACK] Post-update check failed: ${e.message}`);
        }
      }, 10000); // Wait 10s for device to restart

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
      if (!zclNode) {return null;}
      
      const endpoint = zclNode.endpoints[1];
      if (!endpoint || !endpoint.clusters.otaUpdate) {return null;}
      
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
