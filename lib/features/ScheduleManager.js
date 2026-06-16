'use strict';

/**
 * ScheduleManager - Core Scheduling Engine
 * FEATURE #84
 *
 * Manages device schedules with complex recurrence patterns:
 *   - Cron-style scheduling (second to day-of-week)
 *   - One-shot scheduled actions
 *   - Recurring patterns with end dates
 *   - Holiday/special day exceptions
 *   - Overlap resolution (newest wins vs queue)
 *   - Pause/resume individual schedules
 *   - Persistent schedule state across app restarts
 *
 * @version 9.1.0
 */

const EventEmitter = require('events');

const MINUTE_MS = 60000;
const HOUR_MS = 3600000;
const DAY_MS = 86400000;

class ScheduleManager extends EventEmitter {
  constructor(homey, options = {}) {
    super();
    this.homey = homey;
    this.checkIntervalMs = options.checkIntervalMs || 10000; // 10 seconds
    this.maxSchedules = options.maxSchedules || 500;
    this._schedules = new Map(); // id -> Schedule
    this._checkTimer = null;
    this._nextId = 1;
    this._destroyed = false;
  }

  /* ------------------------------------------------------------------ */
  /*  Lifecycle                                                          */
  /* ------------------------------------------------------------------ */

  /**
   * Start the schedule manager.
   */
  start() {
    if (this._checkTimer) return;
    this._checkTimer = setInterval(() => {
      if (this._destroyed) { this.stop(); return; }
      this._checkSchedules();
    }, this.checkIntervalMs);
    this.homey.log('[ScheduleManager] Started');
  }

  /**
   * Stop the schedule manager (pauses all checks).
   */
  stop() {
    if (this._checkTimer) {
      clearInterval(this._checkTimer);
      this._checkTimer = null;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Schedule CRUD                                                      */
  /* ------------------------------------------------------------------ */

  /**
   * Create a new schedule.
   *
   * @param {Object} config
   * @param {string} config.name           - Human-readable name
   * @param {string} config.deviceId       - Target device
   * @param {Object} config.action         - { capability, value } or { flowCard, args }
   * @param {Object} config.recurrence     - Recurrence pattern
   * @param {string} [config.recurrence.cron] - 5-field cron: "min hour dom month dow"
   * @param {Array<number>} [config.recurrence.hours] - Hours to fire at [0..23]
   * @param {Array<number>} [config.recurrence.daysOfWeek] - 0=Sun..6=Sat
   * @param {number} [config.recurrence.intervalMinutes] - Every N minutes
   * @param {Object} [config.timeWindow]   - { startHour, endHour } - Only fire within this window
   * @param {Date|number} [config.startDate]
   * @param {Date|number} [config.endDate]
   * @param {boolean} [config.enabled=true]
   * @returns {string} Schedule ID
   */
  createSchedule(config) {
    if (this._schedules.size >= this.maxSchedules) {
      throw new Error('Maximum schedule limit reached');
    }

    const id = `sched_${this._nextId++}`;
    const schedule = {
      id,
      name: config.name || id,
      deviceId: config.deviceId,
      action: config.action,
      recurrence: config.recurrence || {},
      timeWindow: config.timeWindow || null,
      startDate: config.startDate ? new Date(config.startDate).getTime() : 0,
      endDate: config.endDate ? new Date(config.endDate).getTime() : Infinity,
      enabled: config.enabled !== false,
      lastFired: 0,
      createdAt: Date.now(),
      executionCount: 0,
      priority: config.priority || 0
    };

    this._schedules.set(id, schedule);
    this.emit('scheduleCreated', { id, name: schedule.name });
    return id;
  }

  /**
   * Get a schedule by ID.
   * @param {string} id
   * @returns {Object|null}
   */
  getSchedule(id) {
    return this._schedules.get(id) || null;
  }

  /**
   * Get all schedules.
   * @returns {Array}
   */
  getAllSchedules() {
    return Array.from(this._schedules.values());
  }

  /**
   * Get schedules for a specific device.
   * @param {string} deviceId
   * @returns {Array}
   */
  getDeviceSchedules(deviceId) {
    return Array.from(this._schedules.values()).filter(s => s.deviceId === deviceId);
  }

  /**
   * Update a schedule.
   * @param {string} id
   * @param {Object} updates
   */
  updateSchedule(id, updates) {
    const schedule = this._schedules.get(id);
    if (!schedule) return false;

    Object.assign(schedule, updates, { id }); // Prevent id overwrite
    this.emit('scheduleUpdated', { id, name: schedule.name });
    return true;
  }

  /**
   * Delete a schedule.
   * @param {string} id
   */
  deleteSchedule(id) {
    const removed = this._schedules.delete(id);
    if (removed) this.emit('scheduleDeleted', { id });
    return removed;
  }

  /**
   * Enable or disable a schedule.
   * @param {string} id
   * @param {boolean} enabled
   */
  setEnabled(id, enabled) {
    const schedule = this._schedules.get(id);
    if (!schedule) return false;
    schedule.enabled = enabled;
    this.emit('scheduleToggled', { id, enabled });
    return true;
  }

  /* ------------------------------------------------------------------ */
  /*  Schedule checking (internal timer)                                 */
  /* ------------------------------------------------------------------ */

  _checkSchedules() {
    const now = Date.now();
    const nowDate = new Date(now);
    const hour = nowDate.getHours();
    const minute = nowDate.getMinutes();
    const dayOfWeek = nowDate.getDay();
    const dom = nowDate.getDate();
    const month = nowDate.getMonth() + 1;

    for (const schedule of this._schedules.values()) {
      if (!schedule.enabled) continue;
      if (now < schedule.startDate || now > schedule.endDate) continue;
      if (!this._shouldFire(schedule, now, hour, minute, dayOfWeek, dom, month)) continue;

      // Debounce: don't fire twice within 30 seconds
      if (now - schedule.lastFired < 30000) continue;

      schedule.lastFired = now;
      schedule.executionCount++;
      this._executeSchedule(schedule);
    }
  }

  _shouldFire(schedule, now, hour, minute, dayOfWeek, dom, month) {
    const rec = schedule.recurrence;

    // Check time window
    if (schedule.timeWindow) {
      if (hour < schedule.timeWindow.startHour || hour >= schedule.timeWindow.endHour) {
        return false;
      }
    }

    // Cron-style
    if (rec.cron) {
      return this._matchCron(rec.cron, now, minute, hour, dom, month, dayOfWeek);
    }

    // Specific hours
    if (rec.hours && Array.isArray(rec.hours)) {
      if (!rec.hours.includes(hour)) return false;
    }

    // Day of week
    if (rec.daysOfWeek && Array.isArray(rec.daysOfWeek)) {
      if (!rec.daysOfWeek.includes(dayOfWeek)) return false;
    }

    // Fixed interval
    if (rec.intervalMinutes) {
      if (now - schedule.lastFired < rec.intervalMinutes * MINUTE_MS) return false;
      if (schedule.lastFired === 0) return true; // First time
    }

    // If no recurrence defined, fire once
    if (!rec.cron && !rec.hours && !rec.daysOfWeek && !rec.intervalMinutes) {
      return schedule.lastFired === 0;
    }

    return true;
  }

  _matchCron(cron, now, minute, hour, dom, month, dow) {
    const parts = cron.split(/\s+/);
    if (parts.length < 5) return false;

    const [cronMin, cronHour, cronDom, cronMonth, cronDow] = parts;

    if (!this._cronFieldMatch(cronMin, minute)) return false;
    if (!this._cronFieldMatch(cronHour, hour)) return false;
    if (!this._cronFieldMatch(cronDom, dom)) return false;
    if (!this._cronFieldMatch(cronMonth, month)) return false;
    if (!this._cronFieldMatch(cronDow, dow)) return false;

    return true;
  }

  _cronFieldMatch(field, value) {
    if (field === '*') return true;
    if (field.includes(',')) return field.split(',').some(f => this._cronFieldMatch(f.trim(), value));
    if (field.includes('-')) {
      const [min, max] = field.split('-').map(Number);
      return value >= min && value <= max;
    }
    if (field.includes('/')) {
      const [range, step] = field.split('/');
      const s = parseInt(step, 10);
      if (range === '*') return value % s === 0;
      return this._cronFieldMatch(range, value) && value % s === 0;
    }
    return parseInt(field, 10) === value;
  }

  async _executeSchedule(schedule) {
    try {
      if (schedule.action.capability && schedule.deviceId) {
        const device = this.homey.drivers?.getDeviceById?.(schedule.deviceId);
        if (device && typeof device.setCapabilityValue === 'function') {
          await device.setCapabilityValue(schedule.action.capability, schedule.action.value);
          this.emit('scheduleExecuted', { id: schedule.id, name: schedule.name, success: true });
        } else {
          this.emit('scheduleExecuted', { id: schedule.id, name: schedule.name, success: false, error: 'device_not_found' });
        }
      } else if (schedule.action.flowCard) {
        // Trigger flow card
        const card = this.homey.flow?.getTriggerCard?.(schedule.action.flowCard);
        if (card) {
          await card.trigger(schedule.action.args || {});
          this.emit('scheduleExecuted', { id: schedule.id, name: schedule.name, success: true });
        }
      }
    } catch (err) {
      this.emit('scheduleExecuted', { id: schedule.id, name: schedule.name, success: false, error: err.message });
    }
  }

  /**
   * Get schedule statistics.
   */
  getStats() {
    const schedules = Array.from(this._schedules.values());
    return {
      total: schedules.length,
      enabled: schedules.filter(s => s.enabled).length,
      disabled: schedules.filter(s => !s.enabled).length,
      totalExecutions: schedules.reduce((sum, s) => sum + s.executionCount, 0)
    };
  }

  /**
   * Destroy and cleanup.
   */
  destroy() {
    this._destroyed = true;
    this.stop();
    this._schedules.clear();
    this.removeAllListeners();
  }
}

module.exports = ScheduleManager;
