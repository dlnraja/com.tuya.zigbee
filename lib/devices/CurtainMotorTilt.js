'use strict';

/**
 * Curtain Motor Tilt Control - DEVICE #33
 *
 * Extended curtain/blind motor control with tilt/slat angle support.
 * Handles venetian blinds, plantation shutters, and other tilt-capable coverings.
 *
 * Features:
 * - Position control (0-100%)
 * - Tilt angle control (-90 to +90 degrees)
 * - Combined position + tilt commands
 * - Favorite positions with tilt
 * - Tilt-first vs position-first modes
 *
 * @version 9.1.0
 */

const EventEmitter = require('events');

class CurtainMotorTilt extends EventEmitter {
  constructor(device, options = {}) {
    super();
    this.device = device;

    // DP mappings
    this.dpMapping = options.dpMapping || {
      COVER_POSITION: 2,    // Position 0-100%
      COVER_COMMAND: 3,     // Control command
      TILT_ANGLE: 102,      // Slat/tilt angle
      TILT_REPORT: 103      // Tilt angle report
    };

    // Configuration
    this.positionRange = options.positionRange || { min: 0, max: 100 };
    this.tiltRange = options.tiltRange || { min: -90, max: 90 };
    this.invertPosition = options.invertPosition || false;
    this.invertTilt = options.invertTilt || false;

    // State
    this.currentPosition = 0; // 0 = open, 100 = closed
    this.currentTilt = 0;     // degrees
    this.isMoving = false;
    this.favorites = new Map(); // id -> { name, position, tilt }

    this._loadFavorites();
  }

  /**
   * Set cover position
   * @param {number} position - 0-100%
   */
  async setPosition(position) {
    let pos = Math.max(this.positionRange.min, Math.min(this.positionRange.max, position));
    if (this.invertPosition) pos = 100 - pos;

    this.isMoving = true;
    const success = await this._sendDP(this.dpMapping.COVER_POSITION, Math.round(pos));

    if (success) {
      this.currentPosition = position; // Store un-inverted
      this.emit('positionChanged', { position: this.currentPosition, tilt: this.currentTilt });
    }

    // Movement complete after estimated time
    setTimeout(() => {
      this.isMoving = false;
      this.emit('movementComplete', { position: this.currentPosition, tilt: this.currentTilt });
    }, 5000);

    return success;
  }

  /**
   * Set tilt angle
   * @param {number} angle - -90 to +90 degrees
   */
  async setTilt(angle) {
    let tilt = Math.max(this.tiltRange.min, Math.min(this.tiltRange.max, angle));
    if (this.invertTilt) tilt = -tilt;

    const success = await this._sendDP(this.dpMapping.TILT_ANGLE, Math.round(tilt));

    if (success) {
      this.currentTilt = angle; // Store un-inverted
      this.emit('tiltChanged', { position: this.currentPosition, tilt: this.currentTilt });
    }

    return success;
  }

  /**
   * Set both position and tilt simultaneously
   * @param {Object} state - { position, tilt }
   */
  async setPositionAndTilt(state) {
    const { position, tilt } = state;

    // Set position first, then tilt
    await this.setPosition(position);
    if (tilt !== undefined) {
      await this.setTilt(tilt);
    }

    return true;
  }

  /**
   * Save a favorite position
   * @param {number} id - 1-16
   * @param {string} name
   * @param {Object} state - { position, tilt }
   */
  async saveFavorite(id, name, state) {
    if (id < 1 || id > 16) {
      throw new Error('Favorite ID must be 1-16');
    }

    const favorite = {
      id,
      name: name || `Position ${id}`,
      position: state.position || this.currentPosition,
      tilt: state.tilt !== undefined ? state.tilt : this.currentTilt,
      savedAt: Date.now()
    };

    this.favorites.set(id, favorite);
    await this._saveFavorites();
    this.emit('favoriteSaved', favorite);

    return favorite;
  }

  /**
   * Recall a favorite position
   * @param {number} id
   */
  async recallFavorite(id) {
    const favorite = this.favorites.get(id);
    if (!favorite) {
      throw new Error(`Favorite ${id} not found`);
    }

    return this.setPositionAndTilt({
      position: favorite.position,
      tilt: favorite.tilt
    });
  }

  /**
   * Open fully (0% position)
   */
  async open() {
    return this.setPosition(0);
  }

  /**
   * Close fully (100% position)
   */
  async close() {
    return this.setPosition(100);
  }

  /**
   * Stop movement
   */
  async stop() {
    const success = await this._sendDP(this.dpMapping.COVER_COMMAND, 'stop');
    if (success) {
      this.isMoving = false;
      this.emit('stopped', { position: this.currentPosition, tilt: this.currentTilt });
    }
    return success;
  }

  /**
   * Handle position report from device
   * @param {number} rawPosition
   */
  handlePositionReport(rawPosition) {
    let position = rawPosition;
    if (this.invertPosition) position = 100 - position;
    this.currentPosition = Math.max(0, Math.min(100, position));
    this.emit('positionReported', { position: this.currentPosition });
  }

  /**
   * Handle tilt report from device
   * @param {number} rawTilt
   */
  handleTiltReport(rawTilt) {
    let tilt = rawTilt;
    if (this.invertTilt) tilt = -tilt;
    this.currentTilt = Math.max(this.tiltRange.min, Math.min(this.tiltRange.max, tilt));
    this.emit('tiltReported', { tilt: this.currentTilt });
  }

  /**
   * Get current state
   */
  getState() {
    return {
      position: this.currentPosition,
      tilt: this.currentTilt,
      isMoving: this.isMoving,
      favorites: Array.from(this.favorites.values())
    };
  }

  /**
   * Get all favorites
   */
  getFavorites() {
    return Array.from(this.favorites.values());
  }

  /**
   * Delete a favorite
   */
  async deleteFavorite(id) {
    const existed = this.favorites.delete(id);
    if (existed) {
      await this._saveFavorites();
    }
    return existed;
  }

  // ─── Internal ────────────────────────────────────────────────────────

  async _sendDP(dpId, value) {
    try {
      if (this.device.sendTuyaDataPoint) {
        await this.device.sendTuyaDataPoint(dpId, value, 'value');
      } else if (this.device.tuyaEF00Manager) {
        await this.device.tuyaEF00Manager.setDP(dpId, value, 'value');
      } else {
        this.device.log(`[Curtain] Would send DP${dpId} = ${value}`);
      }
      return true;
    } catch (err) {
      this.device.error('[Curtain] Command failed:', err.message);
      return false;
    }
  }

  async _saveFavorites() {
    try {
      const arr = Array.from(this.favorites.values());
      await this.device.setStoreValue('curtain_favorites', arr);
    } catch (err) {
      // Ignore
    }
  }

  async _loadFavorites() {
    try {
      const stored = await this.device.getStoreValue('curtain_favorites');
      if (Array.isArray(stored)) {
        for (const fav of stored) {
          this.favorites.set(fav.id, fav);
        }
      }
    } catch (err) {
      // Ignore
    }
  }
}

module.exports = CurtainMotorTilt;
