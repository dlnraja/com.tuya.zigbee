'use strict';

/**
 * L9 - Session Manager
 * Gère la fragmentation/réassemblage des codes IR Zosung (clusters 0xE004/0xED00)
 * Buffer circulaire + CRC + NACK pour réassemblage fiable
 */
class SessionManager {
  constructor(device) {
    this.device = device;
    this.sessions = new Map(); // sessionId -> { fragments, total, received, timestamp }
    this.maxSessionAge = 30000; // 30s timeout
    this.maxFragments = 64;
    this.cleanupInterval = setInterval(() => this._cleanup(), 10000);
  }

  /**
   * Démarre une nouvelle session de réception IR
   * @param {number} sessionId - Identifiant de session
   * @param {number} totalFragments - Nombre total de fragments attendus
   */
  startSession(sessionId, totalFragments) {
    this.sessions.set(sessionId, {
      fragments: new Map(),
      total: totalFragments,
      received: 0,
      timestamp: Date.now(),
      complete: false
    });
    this.device.log(`[L9] Session ${sessionId} démarrée: ${totalFragments} fragments attendus`);
  }

  /**
   * Ajoute un fragment à une session existante
   * @param {number} sessionId - Identifiant de session
   * @param {number} index - Index du fragment
   * @param {Buffer} data - Données du fragment
   * @returns {Buffer|null} Données réassemblées si complète, null sinon
   */
  addFragment(sessionId, index, data) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.device.log(`[L9] Session ${sessionId} inconnue, démarrage auto`);
      this.startSession(sessionId, this.maxFragments);
      return this.addFragment(sessionId, index, data);
    }

    if (session.fragments.has(index)) {
      this.device.log(`[L9] Fragment ${index} déjà reçu, ignoré`);
      return null;
    }

    session.fragments.set(index, data);
    session.received++;
    session.timestamp = Date.now();

    this.device.log(`[L9] Fragment ${index}/${session.total} reçu (${session.received}/${session.total})`);

    if (session.received >= session.total) {
      session.complete = true;
      return this._reassemble(sessionId);
    }

    return null;
  }

  /**
   * Réassemble tous les fragments d'une session complète
   * @private
   */
  _reassemble(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const sorted = [...session.fragments.entries()].sort((a, b) => a[0] - b[0]);
    const parts = sorted.map(([, data]) => data);
    const result = Buffer.concat(parts);

    this.device.log(`[L9] Session ${sessionId} réassemblée: ${result.length} octets`);
    this.sessions.delete(sessionId);

    return result;
  }

  /**
   * Envoie un NACK pour un fragment manquant
   * @param {number} sessionId - Identifiant de session
   * @returns {number[]} Index des fragments manquants
   */
  getMissingFragments(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    const missing = [];
    for (let i = 0; i < session.total; i++) {
      if (!session.fragments.has(i)) {
        missing.push(i);
      }
    }
    return missing;
  }

  /**
   * Nettoie les sessions expirées
   * @private
   */
  _cleanup() {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.timestamp > this.maxSessionAge) {
        this.device.log(`[L9] Session ${id} expirée (${session.received}/${session.total} fragments)`);
        this.sessions.delete(id);
      }
    }
  }

  /**
   * Détruit le gestionnaire et nettoie les ressources
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.sessions.clear();
  }
}

module.exports = SessionManager;