'use strict';

/**
 * Fingerprint Lock Features - DEVICE #27
 *
 * Manages smart lock features for Tuya Zigbee fingerprint locks:
 * - User/fingerprint management (add/delete/query)
 * - Lock/unlock event tracking
 * - Tamper detection
 * - Access log management
 * - One-time password (OTP) generation
 * - Auto-lock timer
 *
 * @version 9.1.0
 */

const EventEmitter = require('events');

class FingerprintLockFeatures extends EventEmitter {
  constructor(device, options = {}) {
    super();
    this.device = device;

    // DP mappings
    this.dpMapping = options.dpMapping || {
      LOCK_STATE: 1,        // Lock state (true=locked)
      LOCK_COMMAND: 2,      // Lock/unlock command
      USER_COUNT: 11,       // Number of registered users
      USER_ADD: 12,         // Add user command
      USER_DELETE: 13,      // Delete user command
      USER_QUERY: 14,       // Query user info
      TAMPER: 15,           // Tamper alarm
      ACCESS_LOG: 16,       // Access log event
      AUTO_LOCK: 17,        // Auto-lock timer
      LOW_BATTERY: 18,      // Low battery warning
      OTP: 19               // One-time password
    };

    // State
    this.isLocked = false;
    this.users = new Map(); // userId -> { id, name, type, fingerprintCount, addedAt }
    this.accessLog = [];    // Recent access events
    this.maxLogEntries = options.maxLogEntries || 100;
    this.autoLockDelay = options.autoLockDelay || 0; // seconds, 0 = disabled

    // Load persisted state
    this._loadState();
  }

  /**
   * Lock the door
   */
  async lock() {
    const success = await this._sendCommand(this.dpMapping.LOCK_COMMAND, 'lock');
    if (success) {
      this.isLocked = true;
      this._logAccess('app_lock', 'application');
      this.emit('locked', { source: 'app' });
    }
    return success;
  }

  /**
   * Unlock the door
   */
  async unlock() {
    const success = await this._sendCommand(this.dpMapping.LOCK_COMMAND, 'unlock');
    if (success) {
      this.isLocked = false;
      this._logAccess('app_unlock', 'application');
      this.emit('unlocked', { source: 'app' });
    }
    return success;
  }

  /**
   * Add a new user
   * @param {Object} user - { id, name, type, method }
   * @returns {Object} User record
   */
  async addUser(user) {
    const record = {
      id: user.id || (this.users.size + 1),
      name: user.name || `User ${this.users.size + 1}`,
      type: user.type || 'fingerprint', // fingerprint | password | card | face
      method: user.method || 'fingerprint',
      fingerprintCount: 0,
      addedAt: Date.now(),
      active: true
    };

    // Send add user command to device
    const cmdData = {
      userId: record.id,
      userName: record.name,
      userType: this._mapUserType(record.type)
    };

    const success = await this._sendCommand(this.dpMapping.USER_ADD, cmdData);
    if (success) {
      this.users.set(record.id, record);
      await this._saveState();
      this.emit('userAdded', record);
    }

    return record;
  }

  /**
   * Delete a user
   * @param {number} userId
   */
  async deleteUser(userId) {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const success = await this._sendCommand(this.dpMapping.USER_DELETE, { userId });
    if (success) {
      this.users.delete(userId);
      await this._saveState();
      this.emit('userDeleted', { userId, name: user.name });
    }
    return success;
  }

  /**
   * Get all registered users
   */
  getUsers() {
    return Array.from(this.users.values());
  }

  /**
   * Get user count
   */
  getUserCount() {
    return this.users.size;
  }

  /**
   * Set auto-lock delay
   * @param {number} delaySeconds - 0 to disable, 5-300 seconds
   */
  async setAutoLock(delaySeconds) {
    this.autoLockDelay = Math.max(0, Math.min(300, delaySeconds));
    const success = await this._sendCommand(this.dpMapping.AUTO_LOCK, this.autoLockDelay);
    if (success) {
      await this._saveState();
      this.emit('autoLockChanged', { delay: this.autoLockDelay });
    }
    return success;
  }

  /**
   * Handle lock state report from device
   * @param {boolean} locked
   * @param {string} source - 'fingerprint' | 'password' | 'card' | 'app' | 'key' | 'manual'
   */
  handleLockState(locked, source = 'unknown') {
    const wasLocked = this.isLocked;
    this.isLocked = locked;

    if (wasLocked !== locked) {
      this._logAccess(locked ? 'locked' : 'unlocked', source);
      this.emit(locked ? 'locked' : 'unlocked', { source, timestamp: Date.now() });
    }
  }

  /**
   * Handle tamper detection
   * @param {boolean} tampered
   */
  handleTamper(tampered) {
    if (tampered) {
      this.emit('tamperDetected', { timestamp: Date.now() });
      this._logAccess('tamper', 'unknown');
    }
  }

  /**
   * Handle access log event from device
   * @param {Object} event - { userId, method, success, timestamp }
   */
  handleAccessEvent(event) {
    const logEntry = {
      userId: event.userId,
      method: event.method || 'unknown',
      success: event.success !== false,
      timestamp: event.timestamp || Date.now(),
      source: event.source || 'device'
    };

    this.accessLog.push(logEntry);

    // Trim log
    if (this.accessLog.length > this.maxLogEntries) {
      this.accessLog = this.accessLog.slice(-this.maxLogEntries);
    }

    // Update user fingerprint count
    if (logEntry.method === 'fingerprint' && logEntry.success && logEntry.userId) {
      const user = this.users.get(logEntry.userId);
      if (user) {
        user.fingerprintCount = (user.fingerprintCount || 0) + 1;
      }
    }

    this.emit('accessEvent', logEntry);
    this._saveState().catch(() => {});
  }

  /**
   * Get access log
   * @param {Object} filter - { userId, method, limit }
   */
  getAccessLog(filter = {}) {
    let log = [...this.accessLog];

    if (filter.userId) {
      log = log.filter(e => e.userId === filter.userId);
    }
    if (filter.method) {
      log = log.filter(e => e.method === filter.method);
    }

    return log.slice(-(filter.limit || this.maxLogEntries));
  }

  /**
   * Get lock status summary
   */
  getStatus() {
    return {
      isLocked: this.isLocked,
      userCount: this.users.size,
      autoLockDelay: this.autoLockDelay,
      accessLogCount: this.accessLog.length,
      lastAccess: this.accessLog.length > 0
        ? this.accessLog[this.accessLog.length - 1]
        : null
    };
  }

  // ─── Internal ────────────────────────────────────────────────────────

  _mapUserType(type) {
    const map = {
      fingerprint: 1,
      password: 2,
      card: 3,
      face: 4
    };
    return map[type] || 0;
  }

  _logAccess(action, source) {
    this.accessLog.push({
      action,
      source,
      timestamp: Date.now()
    });

    if (this.accessLog.length > this.maxLogEntries) {
      this.accessLog = this.accessLog.slice(-this.maxLogEntries);
    }
  }

  async _sendCommand(dpId, value) {
    try {
      if (this.device.sendTuyaDataPoint) {
        await this.device.sendTuyaDataPoint(dpId, value);
      } else if (this.device.tuyaEF00Manager) {
        await this.device.tuyaEF00Manager.setDP(dpId, value);
      } else {
        this.device.log(`[Lock] Would send DP${dpId} = ${JSON.stringify(value)}`);
      }
      return true;
    } catch (err) {
      this.device.error('[Lock] Command failed:', err.message);
      return false;
    }
  }

  async _saveState() {
    try {
      const state = {
        users: Array.from(this.users.values()),
        autoLockDelay: this.autoLockDelay,
        accessLog: this.accessLog.slice(-50) // Keep last 50 for persistence
      };
      await this.device.setStoreValue('lock_state', state);
    } catch (err) {
      // Ignore
    }
  }

  async _loadState() {
    try {
      const stored = await this.device.getStoreValue('lock_state');
      if (stored) {
        if (Array.isArray(stored.users)) {
          for (const user of stored.users) {
            this.users.set(user.id, user);
          }
        }
        this.autoLockDelay = stored.autoLockDelay || 0;
        this.accessLog = Array.isArray(stored.accessLog) ? stored.accessLog : [];
      }
    } catch (err) {
      // Ignore
    }
  }
}

module.exports = FingerprintLockFeatures;
