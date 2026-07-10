'use strict';

/**
 * DP Value Input Validation - SECURITY #78
 *
 * Validates incoming DP values before processing:
 * - Type checking
 * - Range validation
 * - Injection prevention
 * - Rate-based anomaly detection
 *
 * @version 9.1.0
 */

class DPValueInputValidator {
  constructor(options = {}) {
    this.maxStringLength = options.maxStringLength || 1024;
    this.maxArrayLength = options.maxArrayLength || 256;
    this.maxNumberValue = options.maxNumberValue || 4294967295; // 32-bit max
    this.minNumberValue = options.minNumberValue || -4294967295;

    // Anomaly detection
    this._valueHistory = new Map(); // dpId -> [{ value, timestamp }]
    this._maxHistoryPerDP = options.maxHistoryPerDP || 50;
    this._anomalyThreshold = options.anomalyThreshold || 10; // Max value changes per minute

    // Known DP schemas: dpId -> { type, min, max, enum, pattern }
    this._schemas = new Map();
  }

  /**
   * Register a schema for a DP
   * @param {number} dpId
   * @param {Object} schema - { type, min, max, enum, pattern, required }
   */
  registerSchema(dpId, schema) {
    this._schemas.set(Number(dpId), schema);
  }

  /**
   * Validate a DP value
   * @param {number} dpId
   * @param {*} value
   * @param {string} dpType - 'raw' | 'value' | 'string' | 'bool'
   * @returns {{ valid: boolean, sanitized: *, errors: string[] }}
   */
  validate(dpId, value, dpType = 'value') {
    const errors = [];
    let sanitized = value;

    // Null/undefined check
    if (value === null || value === undefined) {
      errors.push('Value is null or undefined');
      return { valid: false, sanitized: null, errors };
    }

    // Type-specific validation
    switch (dpType) {
    case 'value':
      sanitized = this._validateNumber(value, errors);
      break;
    case 'string':
      sanitized = this._validateString(value, errors);
      break;
    case 'bool':
      sanitized = this._validateBoolean(value, errors);
      break;
    case 'raw':
      sanitized = this._validateRaw(value, errors);
      break;
    default:
      errors.push(`Unknown DP type: ${dpType}`);
    }

    // Schema-based validation
    const schema = this._schemas.get(Number(dpId));
    if (schema) {
      this._validateAgainstSchema(schema, sanitized, errors);
    }

    // Anomaly detection
    if (this._isAnomalous(dpId, sanitized)) {
      errors.push('Value change rate exceeds normal threshold');
    }

    // Record in history
    this._recordValue(dpId, sanitized);

    return {
      valid: errors.length === 0,
      sanitized,
      errors
    };
  }

  /**
   * Validate batch of DP values
   * @param {Array<{ dpId, value, type }>} values
   * @returns {Array<{ dpId, valid, sanitized, errors }>}
   */
  validateBatch(values) {
    return values.map(v => ({
      dpId: v.dpId,
      ...this.validate(v.dpId, v.value, v.type)
    }));
  }

  /**
   * Sanitize a string value (strip dangerous characters)
   * @param {string} str
   * @returns {string}
   */
  sanitizeString(str) {
    if (typeof str !== 'string') return String(str);

    return str
      .replace(/[<>]/g, '') // Strip angle brackets (XSS prevention)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // Strip control characters
      .substring(0, this.maxStringLength);
  }

  // ─── Internal ────────────────────────────────────────────────────────

  _validateNumber(value, errors) {
    const num = Number(value);

    if (isNaN(num)) {
      errors.push(`Value "${value}" is not a valid number`);
      return 0;
    }

    if (!Number.isFinite(num)) {
      errors.push(`Value is not finite: ${value}`);
      return 0;
    }

    if (num > this.maxNumberValue || num < this.minNumberValue) {
      errors.push(`Value ${num} outside allowed range [${this.minNumberValue}, ${this.maxNumberValue}]`);
    }

    // Check for suspicious values
    if (num === Infinity || num === -Infinity) {
      errors.push('Infinity values are not allowed');
    }

    return num;
  }

  _validateString(value, errors) {
    const str = String(value);

    if (str.length > this.maxStringLength) {
      errors.push(`String length ${str.length} exceeds max ${this.maxStringLength}`);
      return str.substring(0, this.maxStringLength);
    }

    // Check for null bytes
    if (str.includes('\0')) {
      errors.push('String contains null bytes');
      return str.replace(/\0/g, '');
    }

    return str;
  }

  _validateBoolean(value, errors) {
    if (typeof value === 'boolean') return value;
    if (value === 0 || value === 1) return Boolean(value);
    if (value === '0' || value === '1') return value === '1';
    if (value === 'true' || value === 'false') return value === 'true';

    errors.push(`Cannot convert "${value}" to boolean`);
    return Boolean(value);
  }

  _validateRaw(value, errors) {
    if (Buffer.isBuffer(value)) {
      if (value.length > this.maxStringLength) {
        errors.push(`Buffer length ${value.length} exceeds max ${this.maxStringLength}`);
      }
      return value;
    }

    if (typeof value === 'string') {
      // Try to parse as hex
      if (/^[0-9a-fA-F]+$/.test(value) && value.length % 2 === 0) {
        return Buffer.from(value, 'hex');
      }
      return Buffer.from(value, 'utf8');
    }

    errors.push('Raw value must be Buffer or hex string');
    return Buffer.alloc(0);
  }

  _validateAgainstSchema(schema, value, errors) {
    // Type check
    if (schema.type) {
      const actualType = typeof value;
      if (schema.type === 'number' && actualType !== 'number') {
        errors.push(`Schema expects number, got ${actualType}`);
      }
      if (schema.type === 'string' && actualType !== 'string') {
        errors.push(`Schema expects string, got ${actualType}`);
      }
    }

    // Range check
    if (typeof value === 'number') {
      if (schema.min !== undefined && value < schema.min) {
        errors.push(`Value ${value} below minimum ${schema.min}`);
      }
      if (schema.max !== undefined && value > schema.max) {
        errors.push(`Value ${value} above maximum ${schema.max}`);
      }
    }

    // Enum check
    if (schema.enum && Array.isArray(schema.enum)) {
      if (!schema.enum.includes(value)) {
        errors.push(`Value ${value} not in allowed values: [${schema.enum.join(', ')}]`);
      }
    }

    // Pattern check (for strings)
    if (schema.pattern && typeof value === 'string') {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(value)) {
        errors.push(`Value "${value}" does not match pattern: ${schema.pattern}`);
      }
    }
  }

  _isAnomalous(dpId, value) {
    const history = this._valueHistory.get(Number(dpId));
    if (!history || history.length < 5) return false;

    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentChanges = history.filter(h => h.timestamp > oneMinuteAgo);

    return recentChanges.length >= this._anomalyThreshold;
  }

  _recordValue(dpId, value) {
    const numDpId = Number(dpId);
    if (!this._valueHistory.has(numDpId)) {
      this._valueHistory.set(numDpId, []);
    }

    const history = this._valueHistory.get(numDpId);
    history.push({ value, timestamp: Date.now() });

    if (history.length > this._maxHistoryPerDP) {
      history.shift();
    }
  }

  /**
   * Clear value history
   */
  clearHistory(dpId) {
    if (dpId !== undefined) {
      this._valueHistory.delete(Number(dpId));
    } else {
      this._valueHistory.clear();
    }
  }
}

module.exports = DPValueInputValidator;
