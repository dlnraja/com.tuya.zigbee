'use strict';

/**
 * Air Purifier Filter Life - DEVICE #24
 *
 * Tracks filter usage and remaining life for Tuya air purifiers.
 * Common DPs: filter_life (percentage), filter_time (hours used),
 * filter_reset (command to reset after replacement).
 *
 * @version 9.1.0
 */

const EventEmitter = require('events');

class AirPurifierFilterLife extends EventEmitter {
  constructor(device, options = {}) {
    super();
    this.device = device;

    // DP mappings
    this.dpMapping = options.dpMapping || {
      FILTER_LIFE: 11,      // Filter remaining life (0-100%)
      FILTER_TIME: 12,      // Filter usage time in hours
      FILTER_RESET: 13      // Reset filter timer command
    };

    // Configuration
    this.filters = new Map(); // filterId -> { name, maxHours, currentHours, lifePercent }
    this.lowLifeThreshold = options.lowLifeThreshold || 10; // % warning threshold
    this.criticalLifeThreshold = options.criticalLifeThreshold || 5; // % critical threshold

    // Initialize default filter profiles
    this._initDefaultFilters();
  }

  /**
   * Initialize default filter types
   */
  _initDefaultFilters() {
    this.registerFilter('hepa', {
      name: 'HEPA Filter',
      maxHours: 2000, // ~6 months at 12h/day
      dpLife: this.dpMapping.FILTER_LIFE,
      dpTime: this.dpMapping.FILTER_TIME,
      dpReset: this.dpMapping.FILTER_RESET
    });

    this.registerFilter('carbon', {
      name: 'Carbon Filter',
      maxHours: 4000, // ~12 months
      dpLife: null,
      dpTime: null,
      dpReset: null
    });
  }

  /**
   * Register a filter type
   * @param {string} filterId - Unique filter identifier
   * @param {Object} config - { name, maxHours, dpLife, dpTime, dpReset }
   */
  registerFilter(filterId, config) {
    this.filters.set(filterId, {
      filterId,
      name: config.name || filterId,
      maxHours: config.maxHours || 2000,
      dpLife: config.dpLife,
      dpTime: config.dpTime,
      dpReset: config.dpReset,
      currentHours: 0,
      lifePercent: 100,
      lastUpdated: null
    });
  }

  /**
   * Update filter life percentage from DP report
   * @param {number} dpId - DP that reported
   * @param {number} value - Life percentage (0-100)
   */
  handleLifeReport(dpId, value) {
    for (const [filterId, filter] of this.filters.entries()) {
      if (filter.dpLife === dpId) {
        const previous = filter.lifePercent;
        filter.lifePercent = Math.max(0, Math.min(100, value));
        filter.lastUpdated = Date.now();

        // Calculate estimated remaining hours
        if (filter.lifePercent > 0 && filter.maxHours > 0) {
          filter.estimatedRemainingHours = Math.round((filter.lifePercent / 100) * filter.maxHours);
        } else {
          filter.estimatedRemainingHours = 0;
        }

        this._checkThresholds(filterId, filter, previous);
        this.emit('filterLifeChanged', { filterId, lifePercent: filter.lifePercent, previous });
      }
    }
  }

  /**
   * Update filter usage time from DP report
   * @param {number} dpId
   * @param {number} hoursUsed
   */
  handleTimeReport(dpId, hoursUsed) {
    for (const [filterId, filter] of this.filters.entries()) {
      if (filter.dpTime === dpId) {
        filter.currentHours = Math.max(0, hoursUsed);

        // Calculate life percentage from hours
        if (filter.maxHours > 0) {
          filter.lifePercent = Math.max(0, Math.round(((filter.maxHours - filter.currentHours) / filter.maxHours) * 100));
          filter.estimatedRemainingHours = Math.max(0, filter.maxHours - filter.currentHours);
        }

        filter.lastUpdated = Date.now();
        this.emit('filterTimeChanged', { filterId, hoursUsed: filter.currentHours, lifePercent: filter.lifePercent });
      }
    }
  }

  /**
   * Reset a filter after replacement
   * @param {string} filterId
   */
  async resetFilter(filterId) {
    const filter = this.filters.get(filterId);
    if (!filter) {
      throw new Error(`Filter ${filterId} not found`);
    }

    // Send reset command to device
    if (filter.dpReset) {
      try {
        if (this.device.sendTuyaDataPoint) {
          await this.device.sendTuyaDataPoint(filter.dpReset, true, 'bool');
        } else if (this.device.tuyaEF00Manager) {
          await this.device.tuyaEF00Manager.setDP(filter.dpReset, true, 'bool');
        }
      } catch (err) {
        this.device.error('[FilterLife] Reset command failed:', err.message);
      }
    }

    // Reset local state
    filter.currentHours = 0;
    filter.lifePercent = 100;
    filter.estimatedRemainingHours = filter.maxHours;
    filter.lastUpdated = Date.now();

    await this._saveState();
    this.emit('filterReset', { filterId, name: filter.name });
  }

  /**
   * Get status of all filters
   */
  getFilterStatus() {
    const result = {};

    for (const [filterId, filter] of this.filters.entries()) {
      result[filterId] = {
        name: filter.name,
        lifePercent: filter.lifePercent,
        currentHours: filter.currentHours,
        maxHours: filter.maxHours,
        estimatedRemainingHours: filter.estimatedRemainingHours || 0,
        estimatedDaysRemaining: this._estimateDaysRemaining(filter),
        status: this._getFilterStatus(filter.lifePercent),
        lastUpdated: filter.lastUpdated
      };
    }

    return result;
  }

  /**
   * Get a specific filter's status
   */
  getFilterInfo(filterId) {
    return this.getFilterStatus()[filterId] || null;
  }

  /**
   * Get all filters that need attention
   */
  getFiltersNeedingAttention() {
    const result = [];

    for (const [filterId, filter] of this.filters.entries()) {
      if (filter.lifePercent <= this.criticalLifeThreshold) {
        result.push({
          filterId,
          name: filter.name,
          lifePercent: filter.lifePercent,
          urgency: 'critical'
        });
      } else if (filter.lifePercent <= this.lowLifeThreshold) {
        result.push({
          filterId,
          name: filter.name,
          lifePercent: filter.lifePercent,
          urgency: 'warning'
        });
      }
    }

    return result;
  }

  /**
   * Check thresholds and emit alerts
   */
  _checkThresholds(filterId, filter, previousLife) {
    if (filter.lifePercent <= this.criticalLifeThreshold && previousLife > this.criticalLifeThreshold) {
      this.emit('filterCritical', {
        filterId,
        name: filter.name,
        lifePercent: filter.lifePercent
      });
    } else if (filter.lifePercent <= this.lowLifeThreshold && previousLife > this.lowLifeThreshold) {
      this.emit('filterLow', {
        filterId,
        name: filter.name,
        lifePercent: filter.lifePercent
      });
    }
  }

  _estimateDaysRemaining(filter) {
    if (!filter.estimatedRemainingHours || filter.estimatedRemainingHours <= 0) return 0;
    // Assume 12 hours/day average usage
    return Math.round(filter.estimatedRemainingHours / 12);
  }

  _getFilterStatus(lifePercent) {
    if (lifePercent <= this.criticalLifeThreshold) return 'critical';
    if (lifePercent <= this.lowLifeThreshold) return 'low';
    if (lifePercent <= 25) return 'moderate';
    return 'good';
  }

  async _saveState() {
    try {
      const state = {};
      for (const [id, filter] of this.filters.entries()) {
        state[id] = {
          currentHours: filter.currentHours,
          lifePercent: filter.lifePercent
        };
      }
      await this.device.setStoreValue('filter_state', state);
    } catch (err) {
      // Ignore
    }
  }

  async loadState() {
    try {
      const stored = await this.device.getStoreValue('filter_state');
      if (stored && typeof stored === 'object') {
        for (const [id, state] of Object.entries(stored)) {
          const filter = this.filters.get(id);
          if (filter) {
            filter.currentHours = state.currentHours || 0;
            filter.lifePercent = state.lifePercent || 100;
          }
        }
      }
    } catch (err) {
      // Ignore
    }
  }
}

module.exports = AirPurifierFilterLife;
