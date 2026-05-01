'use strict';

/**
 * SessionManager — Layer L9
 * Gestion des sessions fragmentées (IR Zosung 0xE004/0xED00)
 * Réassemble les codes IR longs en trames multiples
 * 
 * Protocole Zosung IR:
 *   - Cluster 0xE004: Contrôle apprentissage (learn mode)
 *   - Cluster 0xED00: Transmission IR fragmentée
 *   - Commandes: 0x01 (Start), 0x02 (Request next), 0x03 (Data fragment),
 *                0x04 (End/ACK), 0x05 (NACK/Retry)
 * 
 * Pattern: CircularBuffer + NACK (inspiré de ZHA zigpy-zhaquirks)
 */

const EventEmitter = require('events');

// Timeout avant abandon d'une session IR (30 secondes)
const SESSION_TIMEOUT_MS = 30000;
// Taille max d'un fragment IR (octets)
const MAX_FRAGMENT_SIZE = 56; // 0x38 comme dans ZHA
// Nombre max de tentatives de retransmission
const MAX_RETRY_COUNT = 3;
// Taille max du buffer IR total (8 Ko)
const MAX_IR_BUFFER_SIZE = 8192;

class IRSession {
  constructor(sessionId, device, options = {}) {
    this.sessionId = sessionId;
    this.device = device;
    this.buffer = Buffer.alloc(0);
    this.expectedLength = options.expectedLength || 0;
    this.fragments = [];
    this.receivedFragments = 0;
    this.totalFragments = 0;
    this.startTime = Date.now();
    this.lastActivity = Date.now();
    this.retryCount = 0;
    this.state = 'WAITING'; // WAITING | RECEIVING | COMPLETE | ERROR | TIMEOUT
    this.timeout = options.timeout || SESSION_TIMEOUT_MS;
    this._timeoutTimer = null;
    this._startTimeout();
  }

  _startTimeout() {
    this._timeoutTimer = setTimeout(() => {
      if (this.state === 'RECEIVING' || this.state === 'WAITING') {
        this.state = 'TIMEOUT';
        this.emit('timeout', this.sessionId);
      }
    }, this.timeout);
  }

  addFragment(data) {
    if (this.state === 'COMPLETE' || this.state === 'ERROR') return false;
    
    this.lastActivity = Date.now();
    this.state = 'RECEIVING';
    this.receivedFragments++;
    
    // Accumuler dans le buffer
    if (Buffer.isBuffer(data)) {
      this.buffer = Buffer.concat([this.buffer, data]);
    } else if (typeof data === 'string') {
      this.buffer = Buffer.concat([this.buffer, Buffer.from(data, 'hex')]);
    } else if (data && data.msgpart) {
      // Format Zosung: { pos, msgpart, msgpartcrc, msg_length }
      this.buffer = Buffer.concat([this.buffer, Buffer.from(data.msgpart)]);
      if (data.msg_length && !this.expectedLength) {
        this.expectedLength = data.msg_length;
      }
    }
    
    // Vérifier taille max
    if (this.buffer.length > MAX_IR_BUFFER_SIZE) {
      this.state = 'ERROR';
      this.emit('error', new Error('IR buffer overflow'), this.sessionId);
      return false;
    }
    
    // Vérifier complétude
    if (this.expectedLength > 0 && this.buffer.length >= this.expectedLength) {
      this.state = 'COMPLETE';
      this._clearTimeout();
      this.emit('complete', this.sessionId, this.buffer);
      return true;
    }
    
    return true;
  }

  requestNext() {
    this.retryCount++;
    if (this.retryCount > MAX_RETRY_COUNT) {
      this.state = 'ERROR';
      this.emit('error', new Error('Max retries exceeded'), this.sessionId);
      return false;
    }
    return true;
  }

  getBuffer() {
    return this.buffer;
  }

  getElapsed() {
    return Date.now() - this.startTime;
  }

  isExpired() {
    return Date.now() - this.lastActivity > this.timeout;
  }

  _clearTimeout() {
    if (this._timeoutTimer) {
      clearTimeout(this._timeoutTimer);
      this._timeoutTimer = null;
    }
  }

  destroy() {
    this._clearTimeout();
    this.buffer = null;
    this.fragments = null;
    this.state = 'DESTROYED';
  }
}

// Mixin EventEmitter pour IRSession
Object.assign(IRSession.prototype, EventEmitter.prototype);

class SessionManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.sessions = new Map();
    this.maxConcurrentSessions = options.maxConcurrent || 5;
    this.sessionTimeout = options.sessionTimeout || SESSION_TIMEOUT_MS;
    this.cleanupInterval = options.cleanupInterval || 60000; // 1 min
    
    // Nettoyage périodique des sessions expirées
    this._cleanupTimer = setInterval(() => this._cleanup(), this.cleanupInterval);
  }

  /**
   * Crée ou récupère une session IR
   * @param {string} sessionId - Identifiant unique de session
   * @param {object} device - Référence au device Homey
   * @param {object} options - Options (expectedLength, timeout)
   * @returns {IRSession}
   */
  createSession(sessionId, device, options = {}) {
    if (this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId);
    }

    // Limiter les sessions concurrentes
    if (this.sessions.size >= this.maxConcurrentSessions) {
      this._cleanup();
      if (this.sessions.size >= this.maxConcurrentSessions) {
        // Supprimer la session la plus ancienne
        const oldest = this.sessions.keys().next().value;
        this.destroySession(oldest);
      }
    }

    const session = new IRSession(sessionId, device, {
      ...options,
      timeout: this.sessionTimeout,
    });

    // Propager les événements
    session.on('complete', (id, buffer) => {
      this.emit('ir_complete', id, buffer, device);
    });
    session.on('timeout', (id) => {
      this.emit('ir_timeout', id, device);
      this.destroySession(id);
    });
    session.on('error', (err, id) => {
      this.emit('ir_error', err, id, device);
      this.destroySession(id);
    });

    this.sessions.set(sessionId, session);
    this.emit('session_created', sessionId);
    return session;
  }

  /**
   * Gère un fragment IR entrant (cluster 0xED00, cmd 0x03)
   * @param {object} frame - Trame Zigbee brute
   * @param {object} device - Device Homey
   * @returns {object|null} - Résultat si session complète
   */
  handleIrFragment(frame, device) {
    const { seq, pos, msg_length, msgpart, msgpartcrc } = frame;
    const sessionId = `ir_${device?.id || 'unknown'}_${seq || 0}`;
    
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = this.createSession(sessionId, device, {
        expectedLength: msg_length || 0,
      });
    }

    const success = session.addFragment({ pos, msgpart, msgpartcrc, msg_length });
    
    if (!success) {
      return { status: 'error', sessionId, state: session.state };
    }

    if (session.state === 'COMPLETE') {
      const result = {
        status: 'complete',
        sessionId,
        buffer: session.getBuffer(),
        hex: session.getBuffer().toString('hex'),
        length: session.getBuffer().length,
        elapsed: session.getElapsed(),
        fragments: session.receivedFragments,
      };
      // La session sera nettoyée par le listener 'complete'
      return result;
    }

    return { status: 'receiving', sessionId, received: session.buffer.length, expected: session.expectedLength };
  }

  /**
   * Gère une commande IR entrante (cluster 0xE004)
   * @param {number} cmdId - ID de commande
   * @param {object} payload - Données de la commande
   * @param {object} device - Device Homey
   */
  handleIrCommand(cmdId, payload, device) {
    switch (cmdId) {
      case 0x00: // Data response (learned code)
        this.emit('ir_learned', payload, device);
        break;
      case 0x01: // Learn mode start
        this.emit('ir_learn_start', device);
        break;
      case 0x02: // Request next fragment
        this.emit('ir_request_next', payload, device);
        break;
      case 0x04: // End/ACK
        this.emit('ir_end', payload, device);
        break;
      case 0x05: // NACK/Retry
        this.emit('ir_nack', payload, device);
        break;
      default:
        this.emit('ir_unknown_cmd', cmdId, payload, device);
    }
  }

  /**
   * Prépare un code IR pour l'émission fragmentée
   * @param {Buffer|string} irCode - Code IR en hex ou Buffer
   * @returns {Array<Buffer>} - Tableau de fragments
   */
  fragmentForTransmit(irCode) {
    const buffer = Buffer.isBuffer(irCode) ? irCode : Buffer.from(irCode, 'hex');
    const fragments = [];
    let offset = 0;
    
    while (offset < buffer.length) {
      const end = Math.min(offset + MAX_FRAGMENT_SIZE, buffer.length);
      fragments.push(buffer.slice(offset, end));
      offset = end;
    }
    
    return fragments;
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  destroySession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.destroy();
      this.sessions.delete(sessionId);
      this.emit('session_destroyed', sessionId);
    }
  }

  getActiveSessionCount() {
    return this.sessions.size;
  }

  _cleanup() {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (session.isExpired() || session.state === 'COMPLETE' || session.state === 'ERROR' || session.state === 'DESTROYED') {
        this.destroySession(id);
      }
    }
  }

  destroy() {
    if (this._cleanupTimer) {
      clearInterval(this._cleanupTimer);
      this._cleanupTimer = null;
    }
    for (const [id] of this.sessions) {
      this.destroySession(id);
    }
    this.removeAllListeners();
  }
}

module.exports = { SessionManager, IRSession };