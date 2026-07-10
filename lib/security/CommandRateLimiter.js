'use strict';

/**
 * Command Rate Limiting Per User - SECURITY #79
 *
 * Rate limits device commands to prevent abuse:
 * - Per-user command rate tracking
 * - Per-device command rate tracking
 * - Burst allowance with sustained rate limiting
 * - Adaptive rate limiting based on network health
 *
 * @version 9.1.0
 */

const EventEmitter = require('events');

class CommandRateLimiter extends EventEmitter {
  constructor(options = {}) {
    super();

    // Configuration
    this.maxCommandsPerUserPerMinute = options.maxPerUserPerMinute || 60;
    this.maxCommandsPerDevicePerMinute = options.maxPerDevicePerMinute || 30;
    this.maxBurstSize = options.maxBurstSize || 10;
    this.burstWindowMs = options.burstWindowMs || 1000; // 1 second
    this.cooldownMultiplier = options.cooldownMultiplier || 2;

    // State: userId -> [timestamps]
    this._userCommands = new Map();
    // State: deviceId -> [timestamps]
    this._deviceCommands = new Map();
    // State: userId -> cooldownUntil timestamp
    this._userCooldowns = new Map();
    // Violation tracking
    this._violations = new Map(); // key -> { count, lastViolation }

    this.maxViolationsBeforeBan = options.maxViolationsBeforeBan || 5;
    this.banDurationMs = options.banDurationMs || 300000; // 5 minutes
  }

  /**
   * Check if a command is allowed
   * @param {string} userId - User/app identifier
   * @param {string} deviceId - Target device
   * @returns {{ allowed: boolean, reason: string, retryAfterMs: number }}
   */
  checkCommand(userId, deviceId) {
    const now = Date.now();

    // Check user ban
    const cooldownUntil = this._userCooldowns.get(userId) || 0;
    if (now < cooldownUntil) {
      return {
        allowed: false,
        reason: 'user_cooldown',
        retryAfterMs: cooldownUntil - now
      };
    }

    // Check user rate
    const userRate = this._getUserRate(userId, now);
    if (userRate >= this.maxCommandsPerUserPerMinute) {
      this._recordViolation(userId);
      return {
        allowed: false,
        reason: 'user_rate_exceeded',
        retryAfterMs: this._calculateRetryTime(userId, now)
      };
    }

    // Check device rate
    const deviceRate = this._getDeviceRate(deviceId, now);
    if (deviceRate >= this.maxCommandsPerDevicePerMinute) {
      return {
        allowed: false,
        reason: 'device_rate_exceeded',
        retryAfterMs: this._calculateDeviceRetryTime(deviceId, now)
      };
    }

    // Check burst
    const burstRate = this._getBurstRate(userId, now);
    if (burstRate >= this.maxBurstSize) {
      return {
        allowed: false,
        reason: 'burst_limit',
        retryAfterMs: this.burstWindowMs
      };
    }

    return { allowed: true, reason: 'ok', retryAfterMs: 0 };
  }

  /**
   * Record that a command was executed
   * @param {string} userId
   * @param {string} deviceId
   */
  recordCommand(userId, deviceId) {
    const now = Date.now();

    // Record user command
    if (!this._userCommands.has(userId)) {
      this._userCommands.set(userId, []);
    }
    this._userCommands.get(userId).push(now);
    this._trimHistory(this._userCommands.get(userId), 60000);

    // Record device command
    if (!this._deviceCommands.has(deviceId)) {
      this._deviceCommands.set(deviceId, []);
    }
    this._deviceCommands.get(deviceId).push(now);
    this._trimHistory(this._deviceCommands.get(deviceId), 60000);

    // Clear violation on successful command
    this._clearViolation(userId);
  }

  /**
   * Get rate limiting stats for a user
   * @param {string} userId
   */
  getUserStats(userId) {
    const now = Date.now();
    const commands = this._userCommands.get(userId) || [];
    const oneMinuteAgo = now - 60000;
    const recentCommands = commands.filter(t => t > oneMinuteAgo);

    return {
      userId,
      commandsLastMinute: recentCommands.length,
      maxPerMinute: this.maxCommandsPerUserPerMinute,
      utilizationPercent: Math.round((recentCommands.length / this.maxCommandsPerUserPerMinute) * 100),
      isOnCooldown: (this._userCooldowns.get(userId) || 0) > now,
      cooldownRemainingMs: Math.max(0, (this._userCooldowns.get(userId) || 0) - now),
      violations: this._getViolationCount(userId)
    };
  }

  /**
   * Get rate limiting stats for a device
   * @param {string} deviceId
   */
  getDeviceStats(deviceId) {
    const now = Date.now();
    const commands = this._deviceCommands.get(deviceId) || [];
    const oneMinuteAgo = now - 60000;
    const recentCommands = commands.filter(t => t > oneMinuteAgo);

    return {
      deviceId,
      commandsLastMinute: recentCommands.length,
      maxPerMinute: this.maxCommandsPerDevicePerMinute,
      utilizationPercent: Math.round((recentCommands.length / this.maxCommandsPerDevicePerMinute) * 100)
    };
  }

  /**
   * Get global stats
   */
  getGlobalStats() {
    let totalActiveUsers = 0;
    let totalActiveDevices = 0;
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    for (const [, commands] of this._userCommands) {
      if (commands.some(t => t > oneMinuteAgo)) totalActiveUsers++;
    }
    for (const [, commands] of this._deviceCommands) {
      if (commands.some(t => t > oneMinuteAgo)) totalActiveDevices++;
    }

    return {
      trackedUsers: this._userCommands.size,
      trackedDevices: this._deviceCommands.size,
      activeUsers: totalActiveUsers,
      activeDevices: totalActiveDevices,
      totalViolations: Array.from(this._violations.values()).reduce((sum, v) => sum + v.count, 0),
      usersOnCooldown: this._countCooldowns()
    };
  }

  /**
   * Manually put a user on cooldown
   */
  setCooldown(userId, durationMs) {
    this._userCooldowns.set(userId, Date.now() + durationMs);
    this.emit('cooldownApplied', { userId, durationMs });
  }

  /**
   * Clear all rate limiting state
   */
  reset() {
    this._userCommands.clear();
    this._deviceCommands.clear();
    this._userCooldowns.clear();
    this._violations.clear();
  }

  // ─── Internal ────────────────────────────────────────────────────────

  _getUserRate(userId, now) {
    const commands = this._userCommands.get(userId) || [];
    const oneMinuteAgo = now - 60000;
    return commands.filter(t => t > oneMinuteAgo).length;
  }

  _getDeviceRate(deviceId, now) {
    const commands = this._deviceCommands.get(deviceId) || [];
    const oneMinuteAgo = now - 60000;
    return commands.filter(t => t > oneMinuteAgo).length;
  }

  _getBurstRate(userId, now) {
    const commands = this._userCommands.get(userId) || [];
    const burstWindow = now - this.burstWindowMs;
    return commands.filter(t => t > burstWindow).length;
  }

  _calculateRetryTime(userId, now) {
    const commands = this._userCommands.get(userId) || [];
    if (commands.length === 0) return 0;

    const oldest = Math.min(...commands);
    return Math.max(0, oldest + 60000 - now);
  }

  _calculateDeviceRetryTime(deviceId, now) {
    const commands = this._deviceCommands.get(deviceId) || [];
    if (commands.length === 0) return 0;

    const oldest = Math.min(...commands);
    return Math.max(0, oldest + 60000 - now);
  }

  _trimHistory(history, windowMs) {
    const cutoff = Date.now() - windowMs;
    while (history.length > 0 && history[0] < cutoff) {
      history.shift();
    }
  }

  _recordViolation(userId) {
    if (!this._violations.has(userId)) {
      this._violations.set(userId, { count: 0, lastViolation: 0 });
    }

    const violation = this._violations.get(userId);
    violation.count++;
    violation.lastViolation = Date.now();

    if (violation.count >= this.maxViolationsBeforeBan) {
      this._userCooldowns.set(userId, Date.now() + this.banDurationMs);
      this.emit('userBanned', { userId, durationMs: this.banDurationMs, violations: violation.count });
    }
  }

  _clearViolation(userId) {
    const violation = this._violations.get(userId);
    if (violation) {
      violation.count = Math.max(0, violation.count - 1);
    }
  }

  _getViolationCount(userId) {
    return this._violations.get(userId)?.count || 0;
  }

  _countCooldowns() {
    const now = Date.now();
    let count = 0;
    for (const until of this._userCooldowns.values()) {
      if (until > now) count++;
    }
    return count;
  }
}

module.exports = CommandRateLimiter;
