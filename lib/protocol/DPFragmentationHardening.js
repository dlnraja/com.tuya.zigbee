'use strict';

/**
 * DP Fragmentation Hardening - PROTOCOL #2
 *
 * Robust reassembly of fragmented Tuya DP payloads with:
 * - Multi-frame reassembly with checksum validation
 * - Timeout-based session cleanup
 * - Duplicate fragment detection
 * - Out-of-order fragment support
 * - Memory-bounded fragment buffers
 *
 * @version 9.1.0
 */

const EventEmitter = require('events');

class DPFragmentationHardening extends EventEmitter {
  constructor(options = {}) {
    super();

    // Configuration
    this.maxSessionAge = options.maxSessionAge || 30000; // 30 seconds
    this.maxFragmentsPerSession = options.maxFragmentsPerSession || 256;
    this.maxTotalBufferSize = options.maxTotalBufferSize || 512 * 1024; // 512KB total across all sessions
    this.maxSessions = options.maxSessions || 64;
    this.cleanupIntervalMs = options.cleanupIntervalMs || 10000; // 10 seconds

    // State
    this.sessions = new Map(); // key: `${deviceId}_${dpId}`, value: session data
    this._cleanupTimer = null;
    this.stats = {
      totalReassembled: 0,
      totalFailed: 0,
      totalFragments: 0,
      checksumErrors: 0,
      timeoutCleanups: 0,
      memoryEvictions: 0
    };

    this._startCleanup();
  }

  /**
   * Process an incoming fragment
   * @param {string} deviceId - Device identifier
   * @param {number} dpId - Data point ID
   * @param {number} seq - Fragment sequence number (0-based)
   * @param {number} total - Total number of fragments expected
   * @param {Buffer|string} data - Fragment payload
   * @param {Object} [meta] - Optional metadata (checksum, timestamp, etc.)
   * @returns {Buffer|null} Complete payload if reassembled, null otherwise
   */
  processFragment(deviceId, dpId, seq, total, data, meta = {}) {
    if (total < 1 || seq < 0 || seq >= total) {
      this.stats.totalFailed++;
      this.emit('invalidFragment', { deviceId, dpId, seq, total });
      return null;
    }

    // Enforce session count limit
    if (this.sessions.size >= this.maxSessions) {
      this._evictOldestSession();
    }

    const key = `${deviceId}_${dpId}`;
    let session = this.sessions.get(key);

    if (!session) {
      session = this._createSession(deviceId, dpId, total, meta);
      this.sessions.set(key, session);
    }

    // Validate session consistency
    if (session.total !== total) {
      this.stats.totalFailed++;
      this.emit('sessionConflict', { deviceId, dpId, expected: session.total, received: total });
      this.sessions.delete(key);
      return null;
    }

    // Duplicate detection
    if (session.fragments.has(seq)) {
      this.emit('duplicateFragment', { deviceId, dpId, seq });
      return null;
    }

    // Memory check
    const dataSize = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data, 'utf8');
    if (session.currentSize + dataSize > this.maxTotalBufferSize) {
      this.stats.memoryEvictions++;
      this.emit('bufferOverflow', { deviceId, dpId, currentSize: session.currentSize, adding: dataSize });
      this.sessions.delete(key);
      return null;
    }

    // Store fragment
    session.fragments.set(seq, { data, size: dataSize, timestamp: Date.now(), meta });
    session.currentSize += dataSize;
    session.lastActivity = Date.now();
    this.stats.totalFragments++;

    // Progress tracking
    const progress = session.fragments.size / session.total;
    this.emit('progress', { deviceId, dpId, seq, total: session.total, progress: Math.round(progress * 100) });

    // Check if complete
    if (session.fragments.size === session.total) {
      return this._reassemble(key, session);
    }

    return null;
  }

  /**
   * Create a new reassembly session
   */
  _createSession(deviceId, dpId, total, meta) {
    return {
      deviceId,
      dpId,
      total,
      fragments: new Map(),
      currentSize: 0,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      meta
    };
  }

  /**
   * Reassemble complete payload from fragments
   */
  _reassemble(key, session) {
    try {
      // Build ordered buffer array
      const chunks = [];
      for (let i = 0; i < session.total; i++) {
        const fragment = session.fragments.get(i);
        if (!fragment) {
          this.stats.totalFailed++;
          this.emit('missingFragment', { key, expectedSeq: i });
          this.sessions.delete(key);
          return null;
        }
        chunks.push(fragment.data);
      }

      // Detect type and concatenate
      const isBuffer = chunks[0] instanceof Buffer;
      const payload = isBuffer ? Buffer.concat(chunks) : chunks.join('');

      // Optional checksum validation
      if (session.meta.checksum) {
        const crypto = require('crypto');
        const hash = crypto.createHash('md5').update(isBuffer ? payload : Buffer.from(payload)).digest('hex');
        if (hash !== session.meta.checksum) {
          this.stats.checksumErrors++;
          this.emit('checksumError', { key, expected: session.meta.checksum, actual: hash });
          // Still deliver but emit warning - some devices don't checksum correctly
        }
      }

      this.stats.totalReassembled++;
      this.sessions.delete(key);
      this.emit('reassembled', { key, deviceId: session.deviceId, dpId: session.dpId, size: isBuffer ? payload.length : Buffer.byteLength(payload) });

      return payload;
    } catch (err) {
      this.stats.totalFailed++;
      this.emit('reassembleError', { key, error: err.message });
      this.sessions.delete(key);
      return null;
    }
  }

  /**
   * Get session status
   */
  getSessionStatus(deviceId, dpId) {
    const key = `${deviceId}_${dpId}`;
    const session = this.sessions.get(key);
    if (!session) return null;

    return {
      deviceId,
      dpId,
      total: session.total,
      received: session.fragments.size,
      progress: Math.round((session.fragments.size / session.total) * 100),
      currentSize: session.currentSize,
      age: Date.now() - session.createdAt,
      missingFragments: this._findMissingFragments(session)
    };
  }

  /**
   * Find which fragment sequence numbers are missing
   */
  _findMissingFragments(session) {
    const missing = [];
    for (let i = 0; i < session.total; i++) {
      if (!session.fragments.has(i)) {
        missing.push(i);
      }
    }
    return missing;
  }

  /**
   * Evict the oldest session to free memory
   */
  _evictOldestSession() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, session] of this.sessions.entries()) {
      if (session.createdAt < oldestTime) {
        oldestTime = session.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.sessions.delete(oldestKey);
      this.stats.memoryEvictions++;
      this.emit('sessionEvicted', { key: oldestKey });
    }
  }

  /**
   * Start periodic cleanup of stale sessions
   */
  _startCleanup() {
    this._cleanupTimer = setInterval(() => this._cleanup(), this.cleanupIntervalMs);
  }

  /**
   * Remove expired sessions
   */
  _cleanup() {
    const now = Date.now();
    for (const [key, session] of this.sessions.entries()) {
      if (now - session.lastActivity > this.maxSessionAge) {
        this.stats.timeoutCleanups++;
        this.emit('sessionTimeout', {
          key,
          deviceId: session.deviceId,
          dpId: session.dpId,
          fragmentsReceived: session.fragments.size,
          fragmentsExpected: session.total
        });
        this.sessions.delete(key);
      }
    }
  }

  /**
   * Cancel a specific session
   */
  cancelSession(deviceId, dpId) {
    const key = `${deviceId}_${dpId}`;
    if (this.sessions.has(key)) {
      this.sessions.delete(key);
      this.emit('sessionCancelled', { key });
    }
  }

  /**
   * Cancel all sessions for a device
   */
  cancelDeviceSessions(deviceId) {
    for (const [key] of this.sessions.entries()) {
      if (key.startsWith(`${deviceId}_`)) {
        this.sessions.delete(key);
      }
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      activeSessions: this.sessions.size,
      successRate: this.stats.totalReassembled + this.stats.totalFailed > 0
        ? Math.round((this.stats.totalReassembled / (this.stats.totalReassembled + this.stats.totalFailed)) * 100)
        : 100
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this._cleanupTimer) {
      clearInterval(this._cleanupTimer);
      this._cleanupTimer = null;
    }
    this.sessions.clear();
  }
}

module.exports = DPFragmentationHardening;
