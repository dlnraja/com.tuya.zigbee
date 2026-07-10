'use strict';

/**
 * UDP Discovery Key Rotation - SECURITY #83
 *
 * Manages rotation of UDP discovery keys:
 * - Scheduled key rotation
 * - Key derivation from master key
 * - Grace period for old key acceptance
 * - Discovery packet signing/verification
 *
 * @version 9.1.0
 */

const crypto = require('crypto');
const EventEmitter = require('events');

class UDPDiscoveryKeyRotation extends EventEmitter {
  constructor(options = {}) {
    super();

    // Configuration
    this.rotationIntervalMs = options.rotationIntervalMs || 86400000; // 24 hours
    this.gracePeriodMs = options.gracePeriodMs || 3600000; // 1 hour overlap
    this.masterKey = options.masterKey || null;
    this.keyLength = options.keyLength || 16; // 16 bytes = 128-bit

    // State
    this._currentKey = null;
    this._previousKey = null;
    this._keyCreatedAt = 0;
    this._rotationTimer = null;
    this._rotationHistory = [];
    this._maxHistory = options.maxHistory || 20;

    // Initialize with first key
    if (this.masterKey) {
      this._deriveKey();
    }
  }

  /**
   * Start automatic key rotation
   */
  start() {
    if (this._rotationTimer) return;

    this._rotationTimer = this.homey.setInterval(() => {
      if (this._destroyed) return;
      this.rotateKey();
    }, this.rotationIntervalMs);

    this.emit('started', { rotationInterval: this.rotationIntervalMs });
  }

  /**
   * Stop automatic rotation
   */
  stop() {
    if (this._rotationTimer) {
      clearInterval(this._rotationTimer);
      this._rotationTimer = null;
    }
  }

  /**
   * Manually rotate the key
   * @returns {Object} New key info
   */
  rotateKey() {
    const oldKey = this._currentKey;
    const oldCreatedAt = this._keyCreatedAt;

    this._deriveKey();

    this._previousKey = oldKey;
    this._rotationHistory.push({
      rotatedAt: Date.now(),
      previousKeyHash: oldKey ? this._hashKey(oldKey) : null,
      newKeyHash: this._hashKey(this._currentKey)
    });

    // Trim history
    if (this._rotationHistory.length > this._maxHistory) {
      this._rotationHistory.shift();
    }

    // Clear previous key after grace period
    this.homey.setTimeout(() => {
      if (this._destroyed) return;
      this._previousKey = null;
    }, this.gracePeriodMs);

    const result = {
      keyHash: this._hashKey(this._currentKey),
      createdAt: this._keyCreatedAt,
      previousKeyHash: oldKey ? this._hashKey(oldKey) : null,
      nextRotation: this._keyCreatedAt + this.rotationIntervalMs
    };

    this.emit('keyRotated', result);
    return result;
  }

  /**
   * Get the current discovery key
   * @returns {Buffer}
   */
  getCurrentKey() {
    return this._currentKey;
  }

  /**
   * Sign a discovery packet
   * @param {Buffer} packet
   * @returns {Buffer} Signed packet (original + 4-byte HMAC)
   */
  signPacket(packet) {
    if (!this._currentKey) {
      throw new Error('No key available for signing');
    }

    const hmac = crypto.createHmac('sha256', this._currentKey);
    hmac.update(packet);
    const signature = hmac.digest().slice(0, 4); // 4-byte truncated HMAC

    return Buffer.concat([packet, signature]);
  }

  /**
   * Verify a discovery packet signature
   * @param {Buffer} signedPacket
   * @returns {{ valid: boolean, packet: Buffer, usedCurrentKey: boolean }}
   */
  verifyPacket(signedPacket) {
    if (signedPacket.length < 4) {
      return { valid: false, packet: null, usedCurrentKey: false };
    }

    const packet = signedPacket.slice(0, -4);
    const receivedSignature = signedPacket.slice(-4);

    // Try current key
    if (this._currentKey) {
      const hmac = crypto.createHmac('sha256', this._currentKey);
      hmac.update(packet);
      const expectedSignature = hmac.digest().slice(0, 4);

      if (receivedSignature.equals(expectedSignature)) {
        return { valid: true, packet, usedCurrentKey: true };
      }
    }

    // Try previous key (grace period)
    if (this._previousKey) {
      const hmac = crypto.createHmac('sha256', this._previousKey);
      hmac.update(packet);
      const expectedSignature = hmac.digest().slice(0, 4);

      if (receivedSignature.equals(expectedSignature)) {
        return { valid: true, packet, usedCurrentKey: false };
      }
    }

    return { valid: false, packet: null, usedCurrentKey: false };
  }

  /**
   * Get key status info
   */
  getKeyStatus() {
    const now = Date.now();
    const nextRotation = this._keyCreatedAt + this.rotationIntervalMs;

    return {
      hasKey: this._currentKey !== null,
      keyHash: this._currentKey ? this._hashKey(this._currentKey) : null,
      createdAt: this._keyCreatedAt,
      ageMs: now - this._keyCreatedAt,
      nextRotation,
      timeUntilRotation: Math.max(0, nextRotation - now),
      hasPreviousKey: this._previousKey !== null,
      gracePeriodActive: this._previousKey !== null,
      rotationHistory: this._rotationHistory.slice(-5)
    };
  }

  /**
   * Set master key for derivation
   * @param {string|Buffer} masterKey
   */
  setMasterKey(masterKey) {
    this.masterKey = Buffer.isBuffer(masterKey) ? masterKey : Buffer.from(String(masterKey), 'hex');
    this._deriveKey();
  }

  // ─── Internal ────────────────────────────────────────────────────────

  _deriveKey() {
    if (!this.masterKey) {
      // Generate random key if no master key
      this._currentKey = crypto.randomBytes(this.keyLength);
    } else {
      // Derive from master key + timestamp
      const timestamp = Math.floor(Date.now() / this.rotationIntervalMs);
      const derivationData = Buffer.alloc(8);
      derivationData.writeUInt32BE(Math.floor(timestamp / 4294967296), 0);
      derivationData.writeUInt32BE(timestamp % 4294967296, 4);

      const hmac = crypto.createHmac('sha256', this.masterKey);
      hmac.update(derivationData);
      this._currentKey = hmac.digest().slice(0, this.keyLength);
    }

    this._keyCreatedAt = Date.now();
  }

  _hashKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex').substring(0, 16);
  }

  destroy() {
    this.stop();
    this._currentKey = null;
    this._previousKey = null;
  }
}

module.exports = UDPDiscoveryKeyRotation;
