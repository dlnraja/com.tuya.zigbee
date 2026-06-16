'use strict';

/**
 * SignalTriangulation - Zigbee signal-space room estimation
 *
 * This does NOT perform physical RF triangulation. It computes a probabilistic
 * room/zone estimate from multiple Zigbee routers using relative LQI rankings,
 * correlation between devices, and time-weighted evidence.
 *
 * Approach:
 *   1. Each device contributes a weighted vote to candidate rooms/zones.
 *   2. Strong LQI from a zone's devices increases that zone's score.
 *   3. Router diversity improves confidence: multiple routers in a zone agreeing
 *      increases confidence more than one strong reading.
 *   4. Scores decay over time unless new evidence arrives.
 *
 * This follows the spirit of SmartThings and Home Assistant room presence, but
 * stays within Homey SDK3 constraints (no raw WiFi/BT APIs).
 */

const EventEmitter = require('events');

function clampNumber(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function normalizeLqiForPresence(lqi) {
  // LQI 255 => 1.0, LQI 0 => 0.0, but emphasize mid/high range
  const v = clampNumber(lqi, 0, 255);
  return v / 255;
}

function decayScore(score, elapsedMinutes, decayPerMinute) {
  return Math.max(0, score - elapsedMinutes * decayPerMinute);
}

class SignalTriangulation extends EventEmitter {
  constructor(options = {}) {
    super();

    this._logger = typeof options.logger === 'function' ? options.logger : () => {};
    this._nowFn = typeof options.now === 'function' ? options.now : () => Date.now();
    this._decayPerMinute = clampNumber(options.decayPerMinute || 0.02, 0.001, 0.2);
    this._presenceThreshold = clampNumber(options.presenceThreshold || 0.25, 0.05, 0.95);
    this._clearThreshold = clampNumber(options.clearThreshold || 0.08, 0.0, 0.5);
    this._diversityBonus = clampNumber(options.diversityBonus || 0.12, 0.0, 0.4);
    this._recentWindowMs = clampNumber(options.recentWindowMs || 5 * 60 * 1000, 30_000, 30 * 60 * 1000);

    // zoneId -> { score, lastUpdated, contributors }
    this._zones = new Map();

    // deviceId -> { zoneId, weight, type, lastLqi }
    this._deviceProfiles = new Map();
  }

  /**
   * Register a zone.
   */
  registerZone(zoneId, meta = {}) {
    if (!zoneId) return;
    if (!this._zones.has(zoneId)) {
      this._zones.set(zoneId, {
        id: zoneId,
        meta: Object.assign({}, meta),
        score: 0,
        lastUpdated: 0,
        contributors: new Map(),
      });
    } else {
      const zone = this._zones.get(zoneId);
      zone.meta = Object.assign({}, zone.meta, meta);
    }
  }

  /**
   * Register a device as belonging to a zone.
   */
  registerDevice(deviceId, profile = {}) {
    if (!deviceId) return;
    this._deviceProfiles.set(deviceId, {
      zoneId: profile.zoneId || null,
      weight: clampNumber(profile.weight || 1.0, 0.1, 5.0),
      type: profile.type || 'unknown',
      lastLqi: null,
      lastUpdated: 0,
    });

    if (profile.zoneId) {
      this.registerZone(profile.zoneId);
      const zone = this._zones.get(profile.zoneId);
      zone.contributors.set(deviceId, 0);
    }
  }

  /**
   * Update device zone assignment.
   */
  assignDeviceToZone(deviceId, zoneId) {
    const profile = this._deviceProfiles.get(deviceId);
    if (!profile) return;
    profile.zoneId = zoneId || null;
    if (zoneId) this.registerZone(zoneId);
  }

  /**
   * Ingest an LQI sample from a device and update zone scores.
   */
  ingestLqi(deviceId, lqi, timestamp = this._nowFn()) {
    const profile = this._deviceProfiles.get(deviceId);
    if (!profile) return;

    const normalized = normalizeLqiForPresence(lqi);
    profile.lastLqi = normalized;
    profile.lastUpdated = timestamp;

    // If the device is assigned to a zone, boost that zone directly.
    if (profile.zoneId && this._zones.has(profile.zoneId)) {
      this._updateZoneFromDevice(profile.zoneId, deviceId, normalized, profile.weight, timestamp);
    }

    // Also update other zones if the LQI is very strong or very weak.
    // Strong signal from a device assigned elsewhere suggests wrong assignment.
    this._checkCrossZoneImpact(deviceId, normalized, profile, timestamp);
  }

  /**
   * Ingest presence signal from any source: motion, door, button, etc.
   */
  ingestPresenceSignal(signal) {
    const {
      zoneId,
      deviceId,
      weight = 0.4,
      timestamp = this._nowFn(),
    } = signal || {};

    if (!zoneId || !this._zones.has(zoneId)) return;

    const zone = this._zones.get(zoneId);
    zone.score = clampNumber(zone.score + weight, 0, 1);
    zone.lastUpdated = timestamp;

    if (deviceId) {
      zone.contributors.set(deviceId, (zone.contributors.get(deviceId) || 0) + weight);
    }

    this._emitZoneUpdate(zone, 'signal');
  }

  /**
   * Periodic update: decay scores, detect transitions.
   */
  update(timestamp = this._nowFn()) {
    for (const zone of this._zones.values()) {
      if (zone.score <= 0) continue;

      const elapsedMinutes = zone.lastUpdated > 0 ? (timestamp - zone.lastUpdated) / 60000 : 0;
      const prevScore = zone.score;
      zone.score = decayScore(zone.score, elapsedMinutes, this._decayPerMinute);

      if (prevScore > 0 && zone.score === 0) {
        this.emit('zone_cleared', { zoneId: zone.id, timestamp });
      }
    }
  }

  /**
   * Get the best estimated zone.
   */
  getEstimatedZone() {
    let best = null;
    for (const zone of this._zones.values()) {
      if (!best || zone.score > best.score) {
        best = zone;
      }
    }
    if (!best || best.score < this._clearThreshold) return null;
    return {
      zoneId: best.id,
      score: Math.round(best.score * 1000) / 1000,
      meta: best.meta,
    };
  }

  /**
   * Get all zone scores.
   */
  getZoneScores() {
    const result = [];
    for (const zone of this._zones.values()) {
      result.push({
        zoneId: zone.id,
        score: Math.round(zone.score * 1000) / 1000,
        contributorCount: zone.contributors.size,
        meta: zone.meta,
        lastUpdated: zone.lastUpdated,
      });
    }
    return result.sort((a, b) => b.score - a.score);
  }

  /**
   * Get triangulation diagnostics.
   */
  getDiagnostics() {
    const zones = this.getZoneScores();
    const estimated = this.getEstimatedZone();
    const devices = [];
    for (const [deviceId, profile] of this._deviceProfiles.entries()) {
      devices.push({
        deviceId,
        zoneId: profile.zoneId,
        weight: profile.weight,
        type: profile.type,
        lastLqi: profile.lastLqi !== null ? Math.round(profile.lastLqi * 1000) / 1000 : null,
        lastUpdated: profile.lastUpdated,
      });
    }

    return {
      estimatedZone: estimated,
      zones,
      devices,
      presenceThreshold: this._presenceThreshold,
      clearThreshold: this._clearThreshold,
      decayPerMinute: this._decayPerMinute,
    };
  }

  destroy() {
    this._zones.clear();
    this._deviceProfiles.clear();
    this.removeAllListeners();
  }

  // --- internals ---

  _updateZoneFromDevice(zoneId, deviceId, normalizedLqi, weight, timestamp) {
    const zone = this._zones.get(zoneId);
    if (!zone) return;

    const weightedEvidence = normalizedLqi * clampNumber(weight, 0.1, 5.0);
    zone.score = clampNumber(zone.score + weightedEvidence * 0.08, 0, 1);
    zone.lastUpdated = timestamp;
    zone.contributors.set(deviceId, weightedEvidence);

    const diverseContributors = [...zone.contributors.values()].filter(v => v > 0.15).length;
    if (diverseContributors >= 3) {
      zone.score = clampNumber(zone.score + this._diversityBonus, 0, 1);
    }

    this._emitZoneUpdate(zone, 'lqi');
  }

  _checkCrossZoneImpact(deviceId, normalizedLqi, profile, timestamp) {
    // If the device is far outside its assigned zone, softly boost the strongest zone instead.
    if (!profile.zoneId) return;
    const assignedZone = this._zones.get(profile.zoneId);
    if (!assignedZone) return;

    if (normalizedLqi >= 0.65) return; // Device still hears its assigned zone well enough

    let bestAltZone = null;
    let bestAltScore = 0;
    for (const zone of this._zones.values()) {
      if (zone.id === profile.zoneId) continue;
      if (zone.score > bestAltScore) {
        bestAltScore = zone.score;
        bestAltZone = zone;
      }
    }

    if (bestAltZone && bestAltScore > assignedZone.score && normalizedLqi < 0.35) {
      bestAltZone.score = clampNumber(bestAltZone.score + normalizedLqi * 0.05, 0, 1);
      bestAltZone.lastUpdated = timestamp;
      this._emitZoneUpdate(bestAltZone, 'cross_zone');
    }
  }

  _emitZoneUpdate(zone, source) {
    const score = Math.round(zone.score * 1000) / 1000;
    if (score >= this._presenceThreshold) {
      this.emit('zone_present', {
        zoneId: zone.id,
        score,
        source,
        timestamp: zone.lastUpdated,
      });
    }
  }
}

module.exports = SignalTriangulation;
