'use strict';

/**
 * L9: SessionManager
 * Manages packet assembly and fragmentation for Tuya/Zosung infrared codes.
 * Reassembles multi-packet hex strings received across multiple DP payload frames.
 */
class SessionManager {
  constructor() {
    this.activeSessions = new Map(); // key: deviceId + "_" + dpId, value: { parts: Map, total: number, timestamp: number }
  }

  /**
   * Process an incoming fragmented payload packet
   * @param {string} deviceId - Unique device ID
   * @param {number} dpId - DataPoint ID
   * @param {number} packetSeq - Packet sequence number (0-based)
   * @param {number} totalPackets - Total expected packets
   * @param {string} chunk - Raw string or hex chunk
   * @returns {string|null} - Reassembled payload string if complete, otherwise null
   */
  processPacket(deviceId, dpId, packetSeq, totalPackets, chunk) {
    const key = `${deviceId}_${dpId}`;
    
    // Auto-reap old expired sessions before starting/handling
    this.reapExpiredSessions();

    if (!this.activeSessions.has(key)) {
      this.activeSessions.set(key, {
        parts: new Map(),
        total: totalPackets,
        timestamp: Date.now()
      });
    }

    const session = this.activeSessions.get(key);
    session.parts.set(packetSeq, chunk);
    session.timestamp = Date.now(); // Update keep-alive timestamp

    if (session.parts.size === session.total) {
      // Reassemble session chunks in chronological order
      let fullPayload = '';
      for (let i = 0; i < session.total; i++) {
        fullPayload += session.parts.get(i) || '';
      }
      this.activeSessions.delete(key); // Cleanup session from map memory
      return fullPayload;
    }

    return null; // Payload is still incomplete
  }

  /**
   * Cleans up stale sessions older than 30 seconds to prevent RAM memory leaks
   * @param {number} timeoutMs - Max session lifetime (default 30 seconds)
   */
  reapExpiredSessions(timeoutMs = 30000) {
    const now = Date.now();
    for (const [key, session] of this.activeSessions.entries()) {
      if (now - session.timestamp > timeoutMs) {
        this.activeSessions.delete(key);
      }
    }
  }

  /**
   * Explicitly cancel/clear session for a device
   * @param {string} deviceId 
   */
  cancelSession(deviceId) {
    for (const key of this.activeSessions.keys()) {
      if (key.startsWith(`${deviceId}_`)) {
        this.activeSessions.delete(key);
      }
    }
  }
}

module.exports = SessionManager;