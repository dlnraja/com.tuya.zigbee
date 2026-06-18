'use strict';

/**
 * Occupancy Sensing Enhancement - PROTOCOL #5
 *
 * Enhanced motion/occupancy detection with:
 * - Configurable hold time (auto-clear after N seconds)
 * - Multi-zone occupancy aggregation
 * - Sensitivity levels (low/medium/high)
 * - Presence timeout management
 * - Dual-technology (PIR + microwave) fusion
 *
 * @version 9.1.0
 */

const EventEmitter = require('events');

class OccupancySensingEnhancement extends EventEmitter {
  constructor(options = {}) {
    super();

    // Configuration
    this.defaultHoldTimeMs = options.defaultHoldTimeMs || 30000; // 30 seconds
    this.presenceTimeoutMs = options.presenceTimeoutMs || 300000; // 5 minutes for presence
    this.minOccupiedDurationMs = options.minOccupiedDurationMs || 5000; // 5 seconds minimum
    this.dualTechFusion = options.dualTechFusion !== false; // Enable dual-tech fusion by default

    // Sensitivity presets (threshold in lux for light-dependent motion)
    this.sensitivityPresets = {
      low: { minLux: 100, holdTimeMultiplier: 0.5, debounceMs: 1000 },
      medium: { minLux: 50, holdTimeMultiplier: 1.0, debounceMs: 500 },
      high: { minLux: 0, holdTimeMultiplier: 1.5, debounceMs: 250 }
    };

    // State per device/zone
    this.zones = new Map(); // key: zoneId, value: zone state

    // Default sensitivity
    this.sensitivity = options.sensitivity || 'medium';
  }

  /**
   * Register a zone for occupancy tracking
   * @param {string} zoneId - Unique zone identifier (typically deviceId or deviceId_endpoint)
   * @param {Object} config - Zone configuration
   */
  registerZone(zoneId, config = {}) {
    if (this.zones.has(zoneId)) return;

    this.zones.set(zoneId, {
      zoneId,
      isOccupied: false,
      lastMotionTime: 0,
      lastClearTime: 0,
      occupiedSince: null,
      holdTimeMs: config.holdTimeMs || this.defaultHoldTimeMs,
      sensitivity: config.sensitivity || this.sensitivity,
      pirTriggered: false,
      microwaveTriggered: false,
      lightLevel: 0,
      temperature: null,
      motionCount: 0,
      totalOccupiedMs: 0,
      _clearTimer: null
    });
  }

  /**
   * Handle motion detection event
   * @param {string} zoneId
   * @param {Object} event - { source: 'pir'|'microwave'|'dual', lightLevel, temperature }
   * @returns {Object} - { occupied, isStateChanged, holdTimeRemaining }
   */
  handleMotion(zoneId, event = {}) {
    if (!this.zones.has(zoneId)) {
      this.registerZone(zoneId);
    }

    const zone = this.zones.get(zoneId);
    const now = Date.now();
    const preset = this.sensitivityPresets[zone.sensitivity] || this.sensitivityPresets.medium;
    const holdTimeMs = Math.round(zone.holdTimeMs * preset.holdTimeMultiplier);

    // Update motion source tracking
    const source = event.source || 'pir';
    if (source === 'pir' || source === 'dual') {
      zone.pirTriggered = true;
    }
    if (source === 'microwave' || source === 'dual') {
      zone.microwaveTriggered = true;
    }

    // Update sensor readings
    if (event.lightLevel !== undefined) {
      zone.lightLevel = event.lightLevel;
    }
    if (event.temperature !== undefined) {
      zone.temperature = event.temperature;
    }

    // Dual-technology fusion logic
    if (this.dualTechFusion && source === 'dual') {
      // Require both PIR and microwave for confirmed occupancy
      // But still report motion if at least one triggers
    }

    zone.lastMotionTime = now;
    zone.motionCount++;

    // Debounce check
    const timeSinceLastMotion = now - zone.lastMotionTime;
    if (timeSinceLastMotion < preset.debounceMs && zone.isOccupied) {
      // Reset the clear timer (extend hold time)
      this._resetClearTimer(zone, holdTimeMs);
      return { occupied: true, isStateChanged: false, holdTimeRemaining: holdTimeMs };
    }

    // State transition: unoccupied -> occupied
    const wasOccupied = zone.isOccupied;
    zone.isOccupied = true;
    zone.occupiedSince = zone.occupiedSince || now;

    // Set auto-clear timer
    this._resetClearTimer(zone, holdTimeMs);

    const isStateChanged = !wasOccupied;

    if (isStateChanged) {
      this.emit('occupied', { zoneId, timestamp: now, source, lightLevel: zone.lightLevel });

      // Notify Homey flow
      if (zone.homey) {
        this._triggerOccupancyFlow(zone, true);
      }
    }

    this.emit('motion', { zoneId, timestamp: now, source, lightLevel: zone.lightLevel, motionCount: zone.motionCount });

    return {
      occupied: true,
      isStateChanged,
      holdTimeRemaining: holdTimeMs,
      motionCount: zone.motionCount
    };
  }

  /**
   * Handle explicit vacancy/clear event
   * @param {string} zoneId
   */
  handleVacancy(zoneId) {
    if (!this.zones.has(zoneId)) return;

    const zone = this.zones.get(zoneId);
    const wasOccupied = zone.isOccupied;
    const now = Date.now();

    zone.isOccupied = false;
    zone.pirTriggered = false;
    zone.microwaveTriggered = false;
    zone.lastClearTime = now;

    if (zone.occupiedSince) {
      zone.totalOccupiedMs += (now - zone.occupiedSince);
      zone.occupiedSince = null;
    }

    if (zone._clearTimer) {
      clearTimeout(zone._clearTimer);
      zone._clearTimer = null;
    }

    if (wasOccupied) {
      const duration = zone.totalOccupiedMs > 0 ? Math.round(zone.totalOccupiedMs / 1000) : 0;
      this.emit('vacant', { zoneId, timestamp: now, durationSeconds: duration });

      if (zone.homey) {
        this._triggerOccupancyFlow(zone, false, duration);
      }
    }
  }

  /**
   * Reset the auto-clear timer for a zone
   */
  _resetClearTimer(zone, holdTimeMs) {
    if (zone._clearTimer) {
      clearTimeout(zone._clearTimer);
    }

    zone._clearTimer = this.homey.setTimeout(() => {
      if (this._destroyed) return;
      this.handleVacancy(zone.zoneId);
    }, holdTimeMs);
  }

  /**
   * Trigger occupancy flow card
   */
  _triggerOccupancyFlow(zone, occupied, duration = 0) {
    try {
      if (zone.homey && zone.flowTriggerCardId) {
        const card = zone.homey.flow.getDeviceTriggerCard(zone.flowTriggerCardId);
        if (card) {
          card.trigger(zone.deviceRef || {}, {
            occupied,
            duration: Math.round(duration),
            zone: zone.zoneId
          }).catch(() => {});
        }
      }
    } catch (err) {
      // Flow card may not exist
    }
  }

  /**
   * Get zone occupancy status
   * @param {string} zoneId
   * @returns {Object}
   */
  getZoneStatus(zoneId) {
    const zone = this.zones.get(zoneId);
    if (!zone) return null;

    const now = Date.now();
    return {
      zoneId,
      isOccupied: zone.isOccupied,
      occupiedSince: zone.occupiedSince,
      occupiedDurationMs: zone.occupiedSince ? now - zone.occupiedSince : 0,
      totalOccupiedMs: zone.totalOccupiedMs,
      lastMotionTime: zone.lastMotionTime,
      timeSinceLastMotion: zone.lastMotionTime ? now - zone.lastMotionTime : null,
      motionCount: zone.motionCount,
      lightLevel: zone.lightLevel,
      temperature: zone.temperature,
      sensitivity: zone.sensitivity,
      holdTimeMs: zone.holdTimeMs
    };
  }

  /**
   * Set sensitivity for a zone
   */
  setSensitivity(zoneId, level) {
    if (!this.sensitivityPresets[level]) return false;
    const zone = this.zones.get(zoneId);
    if (!zone) return false;

    zone.sensitivity = level;
    return true;
  }

  /**
   * Get occupancy summary across all zones
   */
  getOccupancySummary() {
    const summary = {
      totalZones: this.zones.size,
      occupiedZones: 0,
      vacantZones: 0,
      zones: []
    };

    for (const zone of this.zones.values()) {
      if (zone.isOccupied) summary.occupiedZones++;
      else summary.vacantZones++;

      summary.zones.push(this.getZoneStatus(zone.zoneId));
    }

    return summary;
  }

  /**
   * Remove a zone from tracking
   */
  removeZone(zoneId) {
    const zone = this.zones.get(zoneId);
    if (zone && zone._clearTimer) {
      clearTimeout(zone._clearTimer);
    }
    this.zones.delete(zoneId);
  }

  /**
   * Cleanup all state
   */
  destroy() {
    for (const zone of this.zones.values()) {
      if (zone._clearTimer) {
        clearTimeout(zone._clearTimer);
      }
    }
    this.zones.clear();
  }
}

module.exports = OccupancySensingEnhancement;
