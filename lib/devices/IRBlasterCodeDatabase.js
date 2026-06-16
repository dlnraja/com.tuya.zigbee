'use strict';

/**
 * IR Blaster Code Database - DEVICE #26
 *
 * Manages IR code libraries for Tuya IR blasters (Zosung, Tuya generic).
 * Handles code storage, retrieval, and transmission for:
 * - Air conditioners
 * - TVs
 * - Fans
 * - Audio systems
 * - Custom learned codes
 *
 * @version 9.1.0
 */

const EventEmitter = require('events');

class IRBlasterCodeDatabase extends EventEmitter {
  constructor(device, options = {}) {
    super();
    this.device = device;

    // DP mappings for IR transmission
    this.dpMapping = options.dpMapping || {
      IR_TX_STUDY: 201,    // Study mode trigger
      IR_TX_SEND: 202,     // Send IR code
      IR_TX_TYPE: 203,     // Code type (0=raw, 1=pronto, 2=unified)
      IR_TX_KEY: 204       // Key/button identifier
    };

    // Code database: deviceType -> { brand -> { model -> { command -> code } } }
    this.database = new Map();
    this.learningMode = false;
    this.learningTimeout = options.learningTimeoutMs || 30000; // 30 seconds
    this._learningTimer = null;
    this._learningResolve = null;

    // Load persisted codes
    this._loadDatabase();
  }

  /**
   * Store an IR code
   * @param {Object} entry - { deviceType, brand, model, command, code, codeType, raw }
   */
  async storeCode(entry) {
    const { deviceType = 'unknown', brand = 'generic', model = 'default', command, code, codeType = 'raw', raw } = entry;

    if (!command) {
      throw new Error('command is required');
    }

    const path = `${deviceType}/${brand}/${model}`;
    if (!this.database.has(path)) {
      this.database.set(path, new Map());
    }

    const commands = this.database.get(path);
    commands.set(command, {
      command,
      code: code || raw,
      codeType,
      storedAt: Date.now(),
      brand,
      model,
      deviceType
    });

    await this._saveDatabase();
    this.emit('codeStored', { path, command, codeType });

    return { path, command };
  }

  /**
   * Retrieve an IR code
   * @param {string} deviceType
   * @param {string} brand
   * @param {string} model
   * @param {string} command
   * @returns {Object|null}
   */
  getCode(deviceType, brand, model, command) {
    const path = `${deviceType}/${brand}/${model}`;
    const commands = this.database.get(path);
    if (!commands) return null;

    // Try exact match first
    if (commands.has(command)) {
      return commands.get(command);
    }

    // Try default model
    const defaultPath = `${deviceType}/${brand}/default`;
    const defaultCommands = this.database.get(defaultPath);
    if (defaultCommands && defaultCommands.has(command)) {
      return defaultCommands.get(command);
    }

    // Try generic brand
    const genericPath = `${deviceType}/generic/default`;
    const genericCommands = this.database.get(genericPath);
    if (genericCommands && genericCommands.has(command)) {
      return genericCommands.get(command);
    }

    return null;
  }

  /**
   * Send an IR code
   * @param {string} deviceType
   * @param {string} brand
   * @param {string} model
   * @param {string} command
   */
  async sendCode(deviceType, brand, model, command) {
    const entry = this.getCode(deviceType, brand, model, command);
    if (!entry) {
      throw new Error(`No IR code found: ${deviceType}/${brand}/${model}/${command}`);
    }

    return this._transmitCode(entry.code, entry.codeType);
  }

  /**
   * Send a raw IR code directly
   * @param {string|Buffer} code
   * @param {string} codeType - 'raw' | 'pronto' | 'unified'
   */
  async sendRawCode(code, codeType = 'raw') {
    return this._transmitCode(code, codeType);
  }

  /**
   * Start IR learning mode
   * @returns {Promise<Object>} Learned code
   */
  startLearning() {
    return new Promise(async (resolve, reject) => {
      if (this.learningMode) {
        return reject(new Error('Already in learning mode'));
      }

      this.learningMode = true;
      this._learningResolve = resolve;

      // Send study mode command to device
      try {
        await this._sendDP(this.dpMapping.IR_TX_STUDY, true, 'bool');
      } catch (err) {
        this.learningMode = false;
        return reject(err);
      }

      // Set timeout
      this._learningTimer = setTimeout(() => {
        this.learningMode = false;
        this._learningResolve = null;
        reject(new Error('Learning timeout - no IR signal received'));
      }, this.learningTimeout);

      this.emit('learningStarted');
    });
  }

  /**
   * Handle learned code from device (called when device reports learned IR data)
   * @param {Object} learnedData - { code, codeType, raw }
   */
  handleLearnedCode(learnedData) {
    if (!this.learningMode) return;

    this.learningMode = false;

    if (this._learningTimer) {
      clearTimeout(this._learningTimer);
      this._learningTimer = null;
    }

    const result = {
      code: learnedData.code || learnedData.raw,
      codeType: learnedData.codeType || 'raw',
      learnedAt: Date.now()
    };

    this.emit('codeLearned', result);

    if (this._learningResolve) {
      this._learningResolve(result);
      this._learningResolve = null;
    }
  }

  /**
   * Stop learning mode
   */
  async stopLearning() {
    if (!this.learningMode) return;

    this.learningMode = false;
    if (this._learningTimer) {
      clearTimeout(this._learningTimer);
      this._learningTimer = null;
    }

    try {
      await this._sendDP(this.dpMapping.IR_TX_STUDY, false, 'bool');
    } catch (err) {
      // Ignore
    }

    this._learningResolve = null;
    this.emit('learningStopped');
  }

  /**
   * Get all stored codes summary
   */
  getDatabaseSummary() {
    const summary = { totalCodes: 0, byDeviceType: {}, paths: [] };

    for (const [path, commands] of this.database.entries()) {
      summary.paths.push(path);
      summary.totalCodes += commands.size;

      const deviceType = path.split('/')[0];
      summary.byDeviceType[deviceType] = (summary.byDeviceType[deviceType] || 0) + commands.size;
    }

    return summary;
  }

  /**
   * Get all codes for a specific device type/brand/model
   */
  getCodesForDevice(deviceType, brand, model) {
    const path = `${deviceType}/${brand}/${model}`;
    const commands = this.database.get(path);
    if (!commands) return [];

    return Array.from(commands.values());
  }

  /**
   * Delete a code
   */
  async deleteCode(deviceType, brand, model, command) {
    const path = `${deviceType}/${brand}/${model}`;
    const commands = this.database.get(path);
    if (!commands) return false;

    const existed = commands.delete(command);
    if (existed) {
      if (commands.size === 0) {
        this.database.delete(path);
      }
      await this._saveDatabase();
    }
    return existed;
  }

  // ─── Internal ────────────────────────────────────────────────────────

  async _transmitCode(code, codeType) {
    try {
      // Send code type
      const typeMap = { raw: 0, pronto: 1, unified: 2 };
      await this._sendDP(this.dpMapping.IR_TX_TYPE, typeMap[codeType] || 0, 'value');

      // Send the code
      await this._sendDP(this.dpMapping.IR_TX_SEND, code, 'string');

      this.emit('codeSent', { codeType, codeLength: code.length || 0 });
      return true;
    } catch (err) {
      this.device.error('[IR] Transmission failed:', err.message);
      this.emit('codeSendFailed', { codeType, error: err.message });
      return false;
    }
  }

  async _sendDP(dpId, value, type) {
    try {
      if (this.device.sendTuyaDataPoint) {
        await this.device.sendTuyaDataPoint(dpId, value, type);
      } else if (this.device.tuyaEF00Manager) {
        await this.device.tuyaEF00Manager.setDP(dpId, value, type);
      }
    } catch (err) {
      throw err;
    }
  }

  async _saveDatabase() {
    try {
      const data = {};
      for (const [path, commands] of this.database.entries()) {
        data[path] = Array.from(commands.values());
      }
      await this.device.setStoreValue('ir_code_database', data);
    } catch (err) {
      this.device.error('[IR] Failed to save database:', err.message);
    }
  }

  async _loadDatabase() {
    try {
      const stored = await this.device.getStoreValue('ir_code_database');
      if (stored && typeof stored === 'object') {
        for (const [path, entries] of Object.entries(stored)) {
          const commands = new Map();
          for (const entry of entries) {
            commands.set(entry.command, entry);
          }
          this.database.set(path, commands);
        }
      }
    } catch (err) {
      // Ignore
    }
  }

  destroy() {
    if (this._learningTimer) {
      clearTimeout(this._learningTimer);
    }
    this.learningMode = false;
    this._learningResolve = null;
  }
}

module.exports = IRBlasterCodeDatabase;
