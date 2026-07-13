'use strict';

/**
 * Local Key Validation - SECURITY #76
 *
 * Validates Tuya local encryption keys:
 * - Format validation (16-byte hex)
 * - Key strength checking
 * - Key rotation tracking
 * - Encrypted communication verification
 *
 * @version 9.1.0
 */

const crypto = require('crypto');

class LocalKeyValidator {
  constructor(options = {}) {
    this.minKeyLength = options.minKeyLength || 16;
    this.maxKeyLength = options.maxKeyLength || 16;
    this.keyRotationDays = options.keyRotationDays || 90;

    // Key store: deviceId -> { key, createdAt, lastUsed, useCount }
    this._keyStore = new Map();
  }

  /**
   * Validate a Tuya local key format
   * @param {string|Buffer} key
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validateKeyFormat(key) {
    const errors = [];

    if (!key) {
      errors.push('Key is null or undefined');
      return { valid: false, errors };
    }

    const keyStr = Buffer.isBuffer(key) ? key.toString('hex') : String(key);

    // Check length
    if (keyStr.length !== this.minKeyLength * 2) {
      errors.push(`Key must be ${this.minKeyLength} bytes (${this.minKeyLength * 2} hex chars), got ${keyStr.length} chars`);
    }

    // Check hex format
    if (!/^[0-9a-fA-F]+$/.test(keyStr)) {
      errors.push('Key must contain only hexadecimal characters');
    }

    // Check for all-zeros key
    if (/^0+$/.test(keyStr)) {
      errors.push('Key is all zeros (insecure)');
    }

    // Check for all-same-byte key
    if (/^(.)\1+$/.test(keyStr)) {
      errors.push('Key uses repeated bytes (weak)');
    }

    // Check entropy
    const entropy = this._calculateEntropy(keyStr);
    if (entropy < 2.5) {
      errors.push(`Low entropy: ${entropy.toFixed(2)} bits/char (expected > 2.5)`);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate a key and store it
   * @param {string} deviceId
   * @param {string|Buffer} key
   * @returns {{ valid: boolean, errors: string[], stored: boolean }}
   */
  validateAndStoreKey(deviceId, key) {
    const validation = this.validateKeyFormat(key);
    const keyStr = Buffer.isBuffer(key) ? key.toString('hex') : String(key);

    if (validation.valid) {
      this._keyStore.set(deviceId, {
        key: keyStr,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        useCount: 0,
        validated: true
      });
    }

    return { ...validation, stored: validation.valid };
  }

  /**
   * Verify that an encrypted message was encrypted with the stored key
   * @param {string} deviceId
   * @param {Buffer} encryptedData
   * @param {Buffer} expectedPlaintext - Known plaintext for verification
   * @returns {boolean}
   */
  verifyEncryption(deviceId, encryptedData, expectedPlaintext) {
    const keyEntry = this._keyStore.get(deviceId);
    if (!keyEntry) return false;

    try {
      const key = Buffer.from(keyEntry.key, 'hex');
      const decipher = crypto.createDecipheriv('aes-128-ecb', key, null);
      const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);

      keyEntry.useCount++;
      keyEntry.lastUsed = Date.now();

      if (expectedPlaintext) {
        return decrypted.equals(Buffer.from(expectedPlaintext));
      }

      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Check if a key needs rotation
   * @param {string} deviceId
   * @returns {{ needsRotation: boolean, ageDays: number, useCount: number }}
   */
  checkKeyRotation(deviceId) {
    const keyEntry = this._keyStore.get(deviceId);
    if (!keyEntry) {
      return { needsRotation: true, ageDays: -1, useCount: 0, reason: 'no_key_stored' };
    }

    const ageMs = Date.now() - keyEntry.createdAt;
    const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
    const needsRotation = ageDays >= this.keyRotationDays;

    return {
      needsRotation,
      ageDays,
      useCount: keyEntry.useCount,
      reason: needsRotation ? `key_age_${ageDays}d_exceeds_${this.keyRotationDays}d` : null
    };
  }

  /**
   * Get key info for a device (without exposing the actual key)
   * @param {string} deviceId
   */
  getKeyInfo(deviceId) {
    const keyEntry = this._keyStore.get(deviceId);
    if (!keyEntry) return null;

    return {
      deviceId,
      keyPreview: `${keyEntry.key.substring(0, 4)}...${keyEntry.key.substring(keyEntry.key.length - 4)}`,
      keyHash: crypto.createHash('sha256').update(keyEntry.key).digest('hex').substring(0, 16),
      createdAt: keyEntry.createdAt,
      lastUsed: keyEntry.lastUsed,
      useCount: keyEntry.useCount,
      ageDays: Math.floor((Date.now() - keyEntry.createdAt) / (24 * 60 * 60 * 1000)),
      validated: keyEntry.validated
    };
  }

  /**
   * Get all stored keys summary
   */
  getKeysSummary() {
    const summary = {
      totalKeys: this._keyStore.size,
      keysNeedingRotation: 0,
      neverUsedKeys: 0,
      devices: []
    };

    for (const [deviceId] of this._keyStore.entries()) {
      const info = this.getKeyInfo(deviceId);
      const rotation = this.checkKeyRotation(deviceId);

      summary.devices.push({ ...info, needsRotation: rotation.needsRotation });

      if (rotation.needsRotation) summary.keysNeedingRotation++;
      if (info.useCount === 0) summary.neverUsedKeys++;
    }

    return summary;
  }

  /**
   * Remove a device's key
   */
  removeKey(deviceId) {
    return this._keyStore.delete(deviceId);
  }

  /**
   * Calculate Shannon entropy of a hex string
   */
  _calculateEntropy(str) {
    const freq = {};
    for (const char of str) {
      freq[char] = (freq[char] || 0) + 1;
    }

    let entropy = 0;
    const len = str.length;
    for (const count of Object.values(freq)) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }

    return entropy;
  }
}

module.exports = LocalKeyValidator;
