'use strict';

/**
 * Doorbell Camera Snapshot - DEVICE #31
 *
 * Manages snapshot/capture functionality for Tuya doorbell cameras.
 * Handles:
 * - Snapshot capture on doorbell press
 * - Motion-triggered snapshots
 * - Snapshot storage and retrieval
 * - Image URL management
 *
 * @version 9.1.0
 */

const EventEmitter = require('events');

class DoorbellCameraSnapshot extends EventEmitter {
  constructor(device, options = {}) {
    super();
    this.device = device;

    // DP mappings
    this.dpMapping = options.dpMapping || {
      DOORBELL_EVENT: 1,    // Doorbell press event
      MOTION_EVENT: 2,      // Motion detection event
      SNAPSHOT_CMD: 3,      // Take snapshot command
      SNAPSHOT_URL: 4,      // Snapshot URL/data
      BATTERY_LEVEL: 5      // Battery level (for wireless doorbells)
    };

    // Configuration
    this.captureOnDoorbell = options.captureOnDoorbell !== false;
    this.captureOnMotion = options.captureOnMotion !== false;
    this.maxSnapshots = options.maxSnapshots || 50;
    this.snapshotRetentionDays = options.snapshotRetentionDays || 7;

    // State
    this.snapshots = []; // { id, type, url, timestamp, thumbnail }
    this.lastDoorbellPress = null;
    this.lastMotion = null;
    this._snapshotId = 0;
  }

  /**
   * Handle doorbell press event
   * @param {Object} eventData - { timestamp, imageUrl, etc. }
   */
  async handleDoorbellEvent(eventData = {}) {
    const event = {
      type: 'doorbell',
      timestamp: eventData.timestamp || Date.now(),
      imageUrl: eventData.imageUrl || null
    };

    this.lastDoorbellPress = event.timestamp;
    this.emit('doorbellPressed', event);

    // Auto-capture snapshot if enabled
    if (this.captureOnDoorbell) {
      await this.captureSnapshot('doorbell', event);
    }

    return event;
  }

  /**
   * Handle motion detection event
   * @param {Object} eventData
   */
  async handleMotionEvent(eventData = {}) {
    const event = {
      type: 'motion',
      timestamp: eventData.timestamp || Date.now(),
      imageUrl: eventData.imageUrl || null,
      motionLevel: eventData.motionLevel || 0
    };

    this.lastMotion = event.timestamp;
    this.emit('motionDetected', event);

    // Auto-capture snapshot if enabled
    if (this.captureOnMotion) {
      await this.captureSnapshot('motion', event);
    }

    return event;
  }

  /**
   * Capture a snapshot
   * @param {string} trigger - 'doorbell' | 'motion' | 'manual' | 'scheduled'
   * @param {Object} eventData - Context data
   * @returns {Object} Snapshot record
   */
  async captureSnapshot(trigger = 'manual', eventData = {}) {
    // Send capture command to device
    try {
      if (this.device.sendTuyaDataPoint) {
        await this.device.sendTuyaDataPoint(this.dpMapping.SNAPSHOT_CMD, true, 'bool');
      }
    } catch (err) {
      this.device.error('[DoorbellSnapshot] Capture command failed:', err.message);
    }

    const snapshot = {
      id: ++this._snapshotId,
      trigger,
      timestamp: Date.now(),
      imageUrl: eventData.imageUrl || null,
      thumbnailUrl: eventData.thumbnailUrl || null
    };

    this.snapshots.push(snapshot);

    // Trim old snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
    }

    // Remove snapshots older than retention period
    this._pruneOldSnapshots();

    this.emit('snapshotCaptured', snapshot);

    // Persist
    this._saveState().catch(() => {});

    return snapshot;
  }

  /**
   * Handle snapshot URL report from device
   * @param {string} url - Image URL
   * @param {string} type - 'full' | 'thumbnail'
   */
  handleSnapshotUrl(url, type = 'full') {
    // Find the most recent snapshot without a URL
    const recentSnapshot = [...this.snapshots].reverse().find(s => !s.imageUrl);

    if (recentSnapshot) {
      if (type === 'thumbnail') {
        recentSnapshot.thumbnailUrl = url;
      } else {
        recentSnapshot.imageUrl = url;
      }

      this.emit('snapshotUrlUpdated', { id: recentSnapshot.id, url, type });
    }
  }

  /**
   * Get all snapshots
   * @param {Object} filter - { trigger, limit, since }
   */
  getSnapshots(filter = {}) {
    let result = [...this.snapshots];

    if (filter.trigger) {
      result = result.filter(s => s.trigger === filter.trigger);
    }
    if (filter.since) {
      result = result.filter(s => s.timestamp >= filter.since);
    }

    return result.slice(-(filter.limit || this.maxSnapshots));
  }

  /**
   * Get the latest snapshot
   */
  getLatestSnapshot() {
    return this.snapshots.length > 0
      ? this.snapshots[this.snapshots.length - 1]
      : null;
  }

  /**
   * Get snapshot stats
   */
  getStats() {
    const triggers = {};
    for (const s of this.snapshots) {
      triggers[s.trigger] = (triggers[s.trigger] || 0) + 1;
    }

    return {
      totalSnapshots: this.snapshots.length,
      maxSnapshots: this.maxSnapshots,
      byTrigger: triggers,
      lastDoorbellPress: this.lastDoorbellPress,
      lastMotion: this.lastMotion,
      oldestSnapshot: this.snapshots.length > 0 ? this.snapshots[0].timestamp : null,
      newestSnapshot: this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1].timestamp : null
    };
  }

  /**
   * Clear all snapshots
   */
  async clearSnapshots() {
    this.snapshots = [];
    await this._saveState();
  }

  _pruneOldSnapshots() {
    const cutoff = Date.now() - (this.snapshotRetentionDays * 24 * 60 * 60 * 1000);
    this.snapshots = this.snapshots.filter(s => s.timestamp > cutoff);
  }

  async _saveState() {
    try {
      await this.device.setStoreValue('doorbell_snapshots', {
        snapshots: this.snapshots.slice(-this.maxSnapshots),
        _snapshotId: this._snapshotId,
        lastDoorbellPress: this.lastDoorbellPress,
        lastMotion: this.lastMotion
      });
    } catch (err) {
      // Ignore
    }
  }

  async _loadState() {
    try {
      const stored = await this.device.getStoreValue('doorbell_snapshots');
      if (stored) {
        this.snapshots = stored.snapshots || [];
        this._snapshotId = stored._snapshotId || 0;
        this.lastDoorbellPress = stored.lastDoorbellPress || null;
        this.lastMotion = stored.lastMotion || null;
      }
    } catch (err) {
      // Ignore
    }
  }
}

module.exports = DoorbellCameraSnapshot;
