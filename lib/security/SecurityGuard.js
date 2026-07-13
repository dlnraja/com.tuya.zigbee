// lib/security/SecurityGuard.js — v1.0 (P37.7)
'use strict';
// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY GUARD — AggregateError-safe input validation, sanitization, rate-limit
// ═══════════════════════════════════════════════════════════════════════════════
//
// Defensive layer that wraps security-sensitive operations:
//   - Input validation: prevent capability injection, DP injection
//   - Rate limiting: prevent command flooding
//   - Sanitization: strip dangerous characters from user input
//   - Capability scope: only allow whitelisted capabilities per device
//   - Error wrapping: catch + wrap errors as AggregateError where appropriate
//
// This complements the existing security modules:
//   - LocalKeyValidator (P31)
//   - DPValueInputValidator (P31)
//   - CommandRateLimiter (P31)
//   - UDPDiscoveryKeyRotation (P31)
//
// Designed to be USED EVERYWHERE a user-controlled value enters the system.

const LocalKeyValidator = require('./LocalKeyValidator');
const DPValueInputValidator = require('./DPValueInputValidator');
const CommandRateLimiter = require('./CommandRateLimiter');

// Standard whitelists
const VALID_VALUE_TYPES = ['boolean', 'number', 'string'];
const MAX_STRING_LENGTH = 256;
const MAX_NUMBER_VALUE = 1e15;
const MIN_NUMBER_VALUE = -1e15;

class SecurityGuard {
  constructor(options = {}) {
    this.options = options;
    this._rateLimiter = options.rateLimiter || new CommandRateLimiter();
    this._keyValidator = options.keyValidator || new LocalKeyValidator();
    this._dpValidator = options.dpValidator || new DPValueInputValidator();
    this._violations = []; // history of security violations
    this._maxViolations = options.maxViolations || 200;
    this._permittedCapabilities = new Map(); // deviceId → Set<capability>
  }

  /**
   * Validate a value before setting a capability.
   * Throws AggregateError on multiple violations.
   */
  validateCapabilityValue(capability, value, deviceId) {
    const violations = [];

    // Type check
    const vType = typeof value;
    if (!VALID_VALUE_TYPES.includes(vType)) {
      violations.push(new Error(`Invalid type: ${vType} (expected ${VALID_VALUE_TYPES.join('|')})`));
    }

    // String length check
    if (vType === 'string' && value.length > MAX_STRING_LENGTH) {
      violations.push(new Error(`String too long: ${value.length} > ${MAX_STRING_LENGTH}`));
    }

    // Number range check
    if (vType === 'number' && (value > MAX_NUMBER_VALUE || value < MIN_NUMBER_VALUE)) {
      violations.push(new Error(`Number out of range: ${value} (expected ${MIN_NUMBER_VALUE}..${MAX_NUMBER_VALUE})`));
    }

    // Capability scope check
    if (deviceId && this._permittedCapabilities.has(deviceId)) {
      const allowed = this._permittedCapabilities.get(deviceId);
      if (!allowed.has(capability)) {
        violations.push(new Error(`Capability not permitted: ${capability} (not in device scope)`));
      }
    }

    // Sanitize string values
    let sanitized = value;
    if (vType === 'string') {
      sanitized = this._sanitizeString(value);
    }

    if (violations.length > 0) {
      this._recordViolation('capability_validation', capability, violations);
      // AggregateError is the right idiom here
      throw new AggregateError(violations, `SecurityGuard: ${violations.length} validation error(s) for ${capability}`);
    }

    return { valid: true, sanitized, original: value };
  }

  /**
   * Validate a Tuya DP value.
   * Delegates to DPValueInputValidator.
   */
  validateDpValue(dp, value) {
    try {
      return this._dpValidator.validate(dp, value);
    } catch (e) {
      this._recordViolation('dp_validation', `dp${dp}`, [e]);
      throw new AggregateError([e], `SecurityGuard: invalid DP ${dp} value`);
    }
  }

  /**
   * Check if a command is allowed by the rate limiter.
   */
  checkRate(commandType, source) {
    if (!this._rateLimiter.allow(commandType, source)) {
      this._recordViolation('rate_limit', commandType, [new Error('Rate limit exceeded')]);
      throw new AggregateError([new Error('Rate limit exceeded')], `SecurityGuard: rate limit for ${commandType} from ${source}`);
    }
    return true;
  }

  /**
   * Set the permitted capabilities for a device (whitelist).
   */
  setPermittedCapabilities(deviceId, capabilities) {
    this._permittedCapabilities.set(deviceId, new Set(capabilities));
  }

  /**
   * Add a permitted capability to an existing device scope.
   */
  addPermittedCapability(deviceId, capability) {
    if (!this._permittedCapabilities.has(deviceId)) {
      this._permittedCapabilities.set(deviceId, new Set());
    }
    this._permittedCapabilities.get(deviceId).add(capability);
  }

  /**
   * Strip dangerous characters from a string.
   */
  _sanitizeString(s) {
    if (typeof s !== 'string') return s;
    return s
      .replace(/[\u0000-\u001f\u007f]/g, '') // control chars
      .replace(/<script[^>]*>/gi, '') // script tags
      .replace(/<\/?[^>]+(>|$)/g, '') // all HTML tags
      .slice(0, MAX_STRING_LENGTH);
  }

  _recordViolation(type, context, errors) {
    this._violations.push({
      type,
      context,
      errors: errors.map((e) => e.message),
      timestamp: Date.now(),
    });
    if (this._violations.length > this._maxViolations) {
      this._violations.shift();
    }
  }

  /**
   * Get the violation history.
   */
  getViolations(limit = 20) {
    return this._violations.slice(-limit);
  }

  /**
   * Get the health of the security guard.
   */
  getHealth() {
    const recent = this._violations.filter((v) => Date.now() - v.timestamp < 3600000); // last hour
    return {
      totalViolations: this._violations.length,
      recentViolations: recent.length,
      rateLimitHealth: this._rateLimiter.health ? this._rateLimiter.health() : null,
      permittedDevices: this._permittedCapabilities.size,
      byType: recent.reduce((acc, v) => {
        acc[v.type] = (acc[v.type] || 0) + 1;
        return acc;
      }, {}),
    };
  }
}

module.exports = { SecurityGuard, VALID_VALUE_TYPES, MAX_STRING_LENGTH, MAX_NUMBER_VALUE, MIN_NUMBER_VALUE };
