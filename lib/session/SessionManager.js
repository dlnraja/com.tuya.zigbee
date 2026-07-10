const EventEmitter = require('events');

/**
 * L12: SessionManager (Hardened)
 * Manages packet assembly and fragmentation for Tuya/Zosung infrared codes and MCU payloads.
 * v8.1.0: Added security guards, EventEmitter support, and namespace isolation.
 */
class SessionManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.activeSessions = new Map(); // key: namespace + ":" + deviceId + "_" + dpId
    this.MAX_TOTAL_PACKETS = options.maxTotalPackets || 256;
    this.MAX_CHUNKS_TOTAL_SIZE = options.maxChunksTotalSize || 100 * 1024; // 100KB
    this.SESSION_TIMEOUT_MS = options.sessionTimeoutMs || 30000; // 30 seconds

    // v9.1.0: Maximum allowed out-of-order gap before rejecting a packet
    this.MAX_SEQUENCE_GAP = options.maxSequenceGap || 32;
  }

  /**
   * Process an incoming fragmented payload packet
   * @param {string} deviceId - Unique device ID
   * @param {number} dpId - DataPoint ID
   * @param {number} packetSeq - Packet sequence number (0-based)
   * @param {number} totalPackets - Total expected packets
   * @param {string|Buffer} chunk - Raw string or hex chunk
   * @param {string} namespace - Session namespace (default: 'ir_code')
   * @returns {string|Buffer|null} - Reassembled payload if complete, otherwise null
   */
  processPacket(deviceId, dpId, packetSeq, totalPackets, chunk, namespace = 'ir_code') {
    const key = `${namespace}:${deviceId}_${dpId}`;
    
    // Security Guard: Total packets limit
    if (totalPackets > this.MAX_TOTAL_PACKETS) {
      this.emit('error', new Error(`MAX_TOTAL_PACKETS exceeded: ${totalPackets} > ${this.MAX_TOTAL_PACKETS}`), { key, deviceId });
      return null;
    }

    // Auto-reap old expired sessions
    this.reapExpiredSessions();

    if (!this.activeSessions.has(key)) {
      this.activeSessions.set(key, {
        parts: new Map(),
        total: totalPackets,
        totalSize: 0,
        timestamp: Date.now(),
        namespace,
        deviceId,
        dpId,
        maxSeqReceived: -1, // v9.1.0: Track highest sequence number received
      });
      this.emit('sessionStart', { key, namespace, deviceId, dpId, totalPackets });
    }

    const session = this.activeSessions.get(key);

    // Security Guard: Sequence out of bounds
    if (packetSeq >= session.total) {
      this.emit('error', new Error(`Packet sequence ${packetSeq} exceeds total ${session.total}`), { key, deviceId });
      return null;
    }

    // v9.1.0: Out-of-order packet validation
    // Detect large sequence gaps that may indicate corrupted/malicious traffic
    if (session.parts.size > 0 && packetSeq > session.maxSeqReceived) {
      const gap = packetSeq - session.maxSeqReceived;
      if (gap > this.MAX_SEQUENCE_GAP) {
        this.emit('error', new Error(`Sequence gap too large: seq=${packetSeq}, maxSeen=${session.maxSeqReceived}, gap=${gap}`), { key, deviceId });
        return null;
      }
    }
    // Reject duplicate packets (already received)
    if (session.parts.has(packetSeq)) {
      this.emit('packetDuplicate', { key, packetSeq, deviceId });
      return null;
    }

    // Security Guard: Total size limit
    const chunkSize = chunk.length;
    if (session.totalSize + chunkSize > this.MAX_CHUNKS_TOTAL_SIZE) {
      this.emit('error', new Error(`MAX_CHUNKS_TOTAL_SIZE exceeded: ${session.totalSize + chunkSize} bytes`), { key, deviceId });
      this.activeSessions.delete(key);
      return null;
    }

    session.parts.set(packetSeq, chunk);
    session.totalSize += chunkSize;
    session.timestamp = Date.now();
    // v9.1.0: Track highest sequence number for out-of-order validation
    if (packetSeq > session.maxSeqReceived) {
      session.maxSeqReceived = packetSeq;
    }

    this.emit('packet', { key, packetSeq, total: session.total, progress: Math.round((session.parts.size / session.total) * 100) });

    if (session.parts.size === session.total) {
      // Reassemble session
      let fullPayload;
      const isBuffer = chunk instanceof Buffer;

      if (isBuffer) {
        fullPayload = Buffer.concat(Array.from({ length: session.total }, (_, i) => session.parts.get(i)));
      } else {
        fullPayload = '';
        for (let i = 0; i < session.total; i++) {
          fullPayload += session.parts.get(i) || '';
        }
      }

      this.activeSessions.delete(key);
      this.emit('sessionComplete', { key, namespace, deviceId, dpId, payload: fullPayload, size: session.totalSize });
      return fullPayload;
    }

    return null;
  }

  /**
   * Cleans up stale sessions older than timeout
   */
  reapExpiredSessions() {
    const now = Date.now();
    for (const [key, session] of this.activeSessions.entries()) {
      if (now - session.timestamp > this.SESSION_TIMEOUT_MS) {
        // v9.1.0: Deliver partial payload on timeout so caller can use what was collected
        let partialPayload = null;
        if (session.parts.size > 0) {
          const isBuffer = this._isBufferSession(session);
          if (isBuffer) {
            partialPayload = Buffer.concat(
              Array.from({ length: session.total }, (_, i) => session.parts.get(i)).filter(Boolean)
            );
          } else {
            partialPayload = '';
            for (let i = 0; i < session.total; i++) {
              const part = session.parts.get(i);
              if (part) partialPayload += part;
            }
          }
        }

        this.emit('sessionTimeout', {
          key,
          namespace: session.namespace,
          deviceId: session.deviceId,
          dpId: session.dpId,
          // v9.1.0: Partial delivery fields
          partialPayload,
          packetsReceived: session.parts.size,
          packetsExpected: session.total,
          bytesReceived: session.totalSize,
          isPartial: session.parts.size > 0 && session.parts.size < session.total,
        });
        this.activeSessions.delete(key);
      }
    }
  }

  /**
   * v9.1.0: Detect whether a session is assembling Buffer chunks
   */
  _isBufferSession(session) {
    for (const chunk of session.parts.values()) {
      return chunk instanceof Buffer;
    }
    return false;
  }

  /**
   * Explicitly cancel/clear session for a device
   */
  cancelSession(deviceId, namespace = null) {
    for (const [key, session] of this.activeSessions.entries()) {
      if (session.deviceId === deviceId && (!namespace || session.namespace === namespace)) {
        this.activeSessions.delete(key);
      }
    }
  }
}

module.exports = SessionManager;