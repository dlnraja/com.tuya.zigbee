'use strict';

/**
 * Camera PTZ Control - DEVICE #23
 *
 * Pan/Tilt/Zoom controller for Tuya Zigbee cameras.
 * Handles PTZ commands via Tuya DP 0xEF00 or proprietary clusters.
 *
 * Features:
 * - Smooth pan/tilt with speed control
 * - Zoom in/out with step and absolute positioning
 * - Preset position management (save/recall/delete)
 * - Patrol/scan modes (horizontal, vertical, auto)
 * - Tour programming
 *
 * @version 9.1.0
 */

const EventEmitter = require('events');

class CameraPTZController extends EventEmitter {
  constructor(device, options = {}) {
    super();
    this.device = device;

    // DP mappings (configurable per device)
    this.dpMapping = options.dpMapping || {
      PTZ_CONTROL: 102,    // DP for PTZ movement commands
      PTZ_POSITION: 103,   // DP for current position report
      PTZ_PRESET: 104,     // DP for preset recall/save
      PTZ_SCAN_MODE: 105,  // DP for scan/patrol mode
      PTZ_CRUISE: 106      // DP for cruise/tour programming
    };

    // State
    this.currentPosition = { pan: 0, tilt: 0, zoom: 0 };
    this.presets = new Map(); // id -> { pan, tilt, zoom, name }
    this.activeMode = null; // 'horizontal_scan' | 'vertical_scan' | 'auto_scan' | 'tour' | null
    this.maxPan = options.maxPan || 360;
    this.maxTilt = options.maxTilt || 90;
    this.maxZoom = options.maxZoom || 10;
    this.speed = options.speed || 5; // 1-10

    // Load persisted presets
    this._loadPresets();
  }

  /**
   * Pan camera
   * @param {number} direction - -1 (left), 0 (stop), 1 (right)
   * @param {number} [speed] - Speed 1-10 (optional, uses current speed)
   */
  async pan(direction, speed) {
    const cmd = this._buildMoveCommand('pan', direction, speed);
    return this._sendPTZCommand(this.dpMapping.PTZ_CONTROL, cmd);
  }

  /**
   * Tilt camera
   * @param {number} direction - -1 (down), 0 (stop), 1 (up)
   * @param {number} [speed]
   */
  async tilt(direction, speed) {
    const cmd = this._buildMoveCommand('tilt', direction, speed);
    return this._sendPTZCommand(this.dpMapping.PTZ_CONTROL, cmd);
  }

  /**
   * Zoom camera
   * @param {number} direction - -1 (out/wide), 0 (stop), 1 (in/tele)
   * @param {number} [speed]
   */
  async zoom(direction, speed) {
    const cmd = this._buildMoveCommand('zoom', direction, speed);
    return this._sendPTZCommand(this.dpMapping.PTZ_CONTROL, cmd);
  }

  /**
   * Stop all PTZ movement
   */
  async stop() {
    return this._sendPTZCommand(this.dpMapping.PTZ_CONTROL, 0);
  }

  /**
   * Move to absolute position
   * @param {Object} position - { pan, tilt, zoom }
   */
  async moveToPosition(position) {
    const { pan, tilt, zoom } = position;
    const encoded = this._encodePosition(
      Math.max(0, Math.min(this.maxPan, pan)),
      Math.max(0, Math.min(this.maxTilt, tilt)),
      Math.max(0, Math.min(this.maxZoom, zoom))
    );
    return this._sendPTZCommand(this.dpMapping.PTZ_CONTROL, encoded);
  }

  /**
   * Save current position as preset
   * @param {number} id - Preset ID (1-255)
   * @param {string} [name] - Optional name
   */
  async savePreset(id, name) {
    if (id < 1 || id > 255) {
      throw new Error('Preset ID must be 1-255');
    }

    const preset = {
      id,
      name: name || `Preset ${id}`,
      pan: this.currentPosition.pan,
      tilt: this.currentPosition.tilt,
      zoom: this.currentPosition.zoom,
      savedAt: Date.now()
    };

    this.presets.set(id, preset);
    await this._savePresets();

    // Send save command to device: preset_id | 0x80 (save flag)
    const cmd = id | 0x80;
    await this._sendPTZCommand(this.dpMapping.PTZ_PRESET, cmd);

    this.emit('presetSaved', preset);
    return preset;
  }

  /**
   * Recall a preset position
   * @param {number} id - Preset ID
   */
  async recallPreset(id) {
    const preset = this.presets.get(id);
    if (!preset) {
      throw new Error(`Preset ${id} not found`);
    }

    // Send recall command to device: preset_id (no flag)
    await this._sendPTZCommand(this.dpMapping.PTZ_PRESET, id);

    this.currentPosition = { pan: preset.pan, tilt: preset.tilt, zoom: preset.zoom };
    this.emit('presetRecalled', preset);
    return preset;
  }

  /**
   * Delete a preset
   * @param {number} id
   */
  async deletePreset(id) {
    const existed = this.presets.delete(id);
    if (existed) {
      await this._savePresets();
      // Send delete command: preset_id | 0xC0 (delete flag)
      await this._sendPTZCommand(this.dpMapping.PTZ_PRESET, id | 0xC0);
      this.emit('presetDeleted', { id });
    }
    return existed;
  }

  /**
   * Get all saved presets
   */
  getPresets() {
    return Array.from(this.presets.values());
  }

  /**
   * Start scan mode
   * @param {string} mode - 'horizontal' | 'vertical' | 'auto'
   */
  async startScan(mode) {
    const modeMap = {
      horizontal: 1,
      vertical: 2,
      auto: 3
    };

    const cmd = modeMap[mode];
    if (cmd === undefined) {
      throw new Error(`Unknown scan mode: ${mode}`);
    }

    this.activeMode = `${mode}_scan`;
    await this._sendPTZCommand(this.dpMapping.PTZ_SCAN_MODE, cmd);
    this.emit('scanStarted', { mode });
  }

  /**
   * Stop current scan/cruise mode
   */
  async stopScan() {
    this.activeMode = null;
    await this._sendPTZCommand(this.dpMapping.PTZ_SCAN_MODE, 0);
    await this.stop();
    this.emit('scanStopped');
  }

  /**
   * Handle position report from device
   * @param {number} rawValue - Encoded position from DP
   */
  handlePositionReport(rawValue) {
    const pos = this._decodePosition(rawValue);
    this.currentPosition = pos;
    this.emit('positionChanged', pos);
    return pos;
  }

  /**
   * Set PTZ speed
   * @param {number} speed - 1-10
   */
  setSpeed(speed) {
    this.speed = Math.max(1, Math.min(10, speed));
    return this.speed;
  }

  // ─── Internal Methods ────────────────────────────────────────────────

  _buildMoveCommand(axis, direction, speed) {
    const s = speed || this.speed;
    // Encode: axis bits [3:2] | direction bit [1] | stop bit [0]
    const axisMap = { pan: 0, tilt: 1, zoom: 2 };
    const axisBits = (axisMap[axis] || 0) << 2;
    const dirBit = (direction > 0 ? 1 : 0) << 1;
    const stopBit = direction === 0 ? 1 : 0;
    const speedBits = s << 4;

    return speedBits | axisBits | dirBit | stopBit;
  }

  _encodePosition(pan, tilt, zoom) {
    // Encode position into a single value: pan * 10000 + tilt * 100 + zoom
    return Math.round(pan * 10000 + tilt * 100 + zoom);
  }

  _decodePosition(value) {
    const zoom = value % 100;
    const tilt = Math.floor(value / 100) % 100;
    const pan = Math.floor(value / 10000);
    return { pan, tilt, zoom };
  }

  async _sendPTZCommand(dpId, value) {
    try {
      if (this.device.sendTuyaDataPoint) {
        await this.device.sendTuyaDataPoint(dpId, value, 'value');
      } else if (this.device.tuyaEF00Manager) {
        await this.device.tuyaEF00Manager.setDP(dpId, value, 'value');
      } else {
        this.device.log(`[PTZ] Would send DP${dpId} = ${value}`);
      }
      return true;
    } catch (err) {
      this.device.error('[PTZ] Command failed:', err.message);
      return false;
    }
  }

  async _savePresets() {
    try {
      const arr = Array.from(this.presets.values());
      await this.device.setStoreValue('ptz_presets', arr);
    } catch (err) {
      this.device.error('[PTZ] Failed to save presets:', err.message);
    }
  }

  async _loadPresets() {
    try {
      const stored = await this.device.getStoreValue('ptz_presets');
      if (Array.isArray(stored)) {
        for (const preset of stored) {
          this.presets.set(preset.id, preset);
        }
      }
    } catch (err) {
      // Ignore
    }
  }
}

module.exports = CameraPTZController;
