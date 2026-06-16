'use strict';

/**
 * DiagnosticLogger Buffer Rotation - PERFORMANCE #70
 *
 * Manages diagnostic log buffer with automatic rotation:
 * - Size-based rotation (rotate when buffer exceeds limit)
 * - Time-based rotation (rotate every N minutes)
 * - Compressed archival of old logs
 * - Memory-efficient circular buffer
 *
 * @version 9.1.0
 */

const EventEmitter = require('events');

class DiagnosticLoggerRotation extends EventEmitter {
  constructor(options = {}) {
    super();

    // Configuration
    this.maxBufferSize = options.maxBufferSize || 1000; // max entries in active buffer
    this.maxEntrySize = options.maxEntrySize || 2048; // max bytes per entry (truncated if larger)
    this.rotationIntervalMs = options.rotationIntervalMs || 300000; // 5 minutes
    this.maxArchivedBuffers = options.maxArchivedBuffers || 10;
    this.compressArchives = options.compressArchives !== false;

    // Active buffer
    this._activeBuffer = [];
    this._archivedBuffers = [];
    this._currentSize = 0;

    // Rotation state
    this._lastRotation = Date.now();
    this._rotationTimer = null;
    this._totalEntriesLogged = 0;
    this._totalEntriesDropped = 0;

    this._startRotationTimer();
  }

  /**
   * Log an entry to the active buffer
   * @param {string} level - 'info' | 'warn' | 'error' | 'debug'
   * @param {string} category
   * @param {string} message
   * @param {Object} [meta]
   */
  log(level, category, message, meta = {}) {
    // Truncate message if too long
    let truncatedMessage = message;
    if (typeof message === 'string' && message.length > this.maxEntrySize) {
      truncatedMessage = message.substring(0, this.maxEntrySize) + '...[truncated]';
    }

    const entry = {
      t: Date.now(),     // timestamp (compact key)
      l: level,          // level
      c: category,       // category
      m: truncatedMessage, // message
      ...meta
    };

    // Check if rotation needed
    if (this._activeBuffer.length >= this.maxBufferSize) {
      this._rotate();
    }

    this._activeBuffer.push(entry);
    this._currentSize += this._estimateSize(entry);
    this._totalEntriesLogged++;
  }

  /**
   * Convenience methods
   */
  info(category, message, meta) { this.log('info', category, message, meta); }
  warn(category, message, meta) { this.log('warn', category, message, meta); }
  error(category, message, meta) { this.log('error', category, message, meta); }
  debug(category, message, meta) { this.log('debug', category, message, meta); }

  /**
   * Read current buffer entries
   * @param {Object} filter - { level, category, since, limit }
   * @returns {Array}
   */
  read(filter = {}) {
    let entries = [...this._activeBuffer];

    if (filter.level) {
      entries = entries.filter(e => e.l === filter.level);
    }
    if (filter.category) {
      entries = entries.filter(e => e.c === filter.category);
    }
    if (filter.since) {
      entries = entries.filter(e => e.t >= filter.since);
    }

    return filter.limit ? entries.slice(-filter.limit) : entries;
  }

  /**
   * Read from archived buffers
   * @param {Object} filter
   * @returns {Array}
   */
  readArchived(filter = {}) {
    let entries = [];
    for (const archive of this._archivedBuffers) {
      entries.push(...archive.entries);
    }

    if (filter.level) {
      entries = entries.filter(e => e.l === filter.level);
    }
    if (filter.since) {
      entries = entries.filter(e => e.t >= filter.since);
    }

    return filter.limit ? entries.slice(-filter.limit) : entries;
  }

  /**
   * Force rotation
   */
  forceRotation() {
    this._rotate();
  }

  /**
   * Get buffer statistics
   */
  getStats() {
    return {
      activeBufferSize: this._activeBuffer.length,
      maxBufferSize: this.maxBufferSize,
      activeBytes: this._currentSize,
      archivedBufferCount: this._archivedBuffers.length,
      totalEntriesLogged: this._totalEntriesLogged,
      totalEntriesDropped: this._totalEntriesDropped,
      lastRotation: this._lastRotation,
      timeSinceLastRotation: Date.now() - this._lastRotation,
      rotationInterval: this.rotationIntervalMs,
      entriesByLevel: this._countByLevel(),
      entriesByCategory: this._countByCategory()
    };
  }

  /**
   * Clear all buffers
   */
  clearAll() {
    this._activeBuffer = [];
    this._archivedBuffers = [];
    this._currentSize = 0;
  }

  /**
   * Export all logs (active + archived) as JSON
   */
  exportAll() {
    const allEntries = [];

    for (const archive of this._archivedBuffers) {
      allEntries.push(...archive.entries);
    }
    allEntries.push(...this._activeBuffer);

    return {
      exported: new Date().toISOString(),
      totalEntries: allEntries.length,
      entries: allEntries
    };
  }

  // ─── Internal ────────────────────────────────────────────────────────

  _rotate() {
    if (this._activeBuffer.length === 0) return;

    const archive = {
      rotatedAt: Date.now(),
      entryCount: this._activeBuffer.length,
      entries: this._activeBuffer
    };

    this._archivedBuffers.push(archive);

    // Trim archived buffers
    while (this._archivedBuffers.length > this.maxArchivedBuffers) {
      const dropped = this._archivedBuffers.shift();
      this._totalEntriesDropped += dropped.entryCount;
    }

    // Reset active buffer
    this._activeBuffer = [];
    this._currentSize = 0;
    this._lastRotation = Date.now();

    this.emit('rotated', {
      archivedEntries: archive.entryCount,
      totalArchived: this._archivedBuffers.length
    });
  }

  _startRotationTimer() {
    if (this._rotationTimer) clearInterval(this._rotationTimer);

    this._rotationTimer = setInterval(() => {
      this._rotate();
    }, this.rotationIntervalMs);
  }

  _estimateSize(entry) {
    // Rough estimate: timestamp(13) + level(5) + category(10) + message(~50) + overhead(50) = ~128 bytes average
    return 128 + (entry.m ? entry.m.length : 0);
  }

  _countByLevel() {
    const counts = {};
    for (const entry of this._activeBuffer) {
      counts[entry.l] = (counts[entry.l] || 0) + 1;
    }
    return counts;
  }

  _countByCategory() {
    const counts = {};
    for (const entry of this._activeBuffer) {
      counts[entry.c] = (counts[entry.c] || 0) + 1;
    }
    return counts;
  }

  destroy() {
    if (this._rotationTimer) {
      clearInterval(this._rotationTimer);
    }
  }
}

module.exports = DiagnosticLoggerRotation;
