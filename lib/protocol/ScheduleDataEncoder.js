'use strict';

/**
 * Schedule Data Encoder - PROTOCOL #9
 *
 * Encodes/decodes Tuya timer and schedule data for thermostats, switches, curtains.
 * Tuya schedule DPs typically pack time-of-day and action into 2-4 byte values.
 *
 * Common formats:
 * - Switch timer: 2 bytes (hours << 8 | minutes) + 1 byte action
 * - Thermostat schedule: 3 bytes per slot (hours << 16 | minutes << 8 | temperature)
 * - Weekly schedule: 7 days x N slots x 3 bytes
 *
 * @version 9.1.0
 */

class ScheduleDataEncoder {
  /**
   * Encode a single schedule slot
   * @param {Object} slot - { hours, minutes, action/value }
   * @param {string} format - 'switch_timer' | 'thermostat_slot' | 'curtain_timer'
   * @returns {Buffer} Encoded slot data
   */
  static encodeSlot(slot, format = 'switch_timer') {
    switch (format) {
    case 'switch_timer':
      return ScheduleDataEncoder._encodeSwitchTimer(slot);
    case 'thermostat_slot':
      return ScheduleDataEncoder._encodeThermostatSlot(slot);
    case 'curtain_timer':
      return ScheduleDataEncoder._encodeCurtainTimer(slot);
    default:
      return Buffer.alloc(0);
    }
  }

  /**
   * Decode a single schedule slot
   * @param {Buffer} data - Raw encoded data
   * @param {string} format
   * @returns {Object} Decoded slot
   */
  static decodeSlot(data, format = 'switch_timer') {
    if (!Buffer.isBuffer(data)) {
      data = Buffer.from(data);
    }

    switch (format) {
    case 'switch_timer':
      return ScheduleDataEncoder._decodeSwitchTimer(data);
    case 'thermostat_slot':
      return ScheduleDataEncoder._decodeThermostatSlot(data);
    case 'curtain_timer':
      return ScheduleDataEncoder._decodeCurtainTimer(data);
    default:
      return null;
    }
  }

  /**
   * Encode a full weekly schedule (7 days, N slots per day)
   * @param {Array<Array<Object>>} weeklySchedule - [day0slots, day1slots, ...]
   * @param {string} format
   * @returns {Buffer} Encoded weekly schedule
   */
  static encodeWeeklySchedule(weeklySchedule, format = 'thermostat_slot') {
    const chunks = [];

    for (let day = 0; day < 7; day++) {
      const slots = weeklySchedule[day] || [];
      // First byte = day number, second = slot count
      chunks.push(Buffer.from([day, slots.length]));

      for (const slot of slots) {
        chunks.push(ScheduleDataEncoder.encodeSlot(slot, format));
      }
    }

    return Buffer.concat(chunks);
  }

  /**
   * Decode a full weekly schedule
   * @param {Buffer} data
   * @param {string} format
   * @returns {Array<Array<Object>>}
   */
  static decodeWeeklySchedule(data, format = 'thermostat_slot') {
    if (!Buffer.isBuffer(data)) {
      data = Buffer.from(data);
    }

    const weekly = Array.from({ length: 7 }, () => []);
    let offset = 0;

    while (offset < data.length - 1) {
      const day = data[offset];
      const slotCount = data[offset + 1];
      offset += 2;

      if (day < 0 || day > 6) break;

      const slotSize = format === 'thermostat_slot' ? 3 : 3;
      for (let s = 0; s < slotCount && offset + slotSize <= data.length; s++) {
        const slotData = data.slice(offset, offset + slotSize);
        const slot = ScheduleDataEncoder.decodeSlot(slotData, format);
        if (slot) {
          weekly[day].push(slot);
        }
        offset += slotSize;
      }
    }

    return weekly;
  }

  // ─── Switch Timer Format ────────────────────────────────────────────────

  static _encodeSwitchTimer(slot) {
    const hours = Math.max(0, Math.min(23, slot.hours || 0));
    const minutes = Math.max(0, Math.min(59, slot.minutes || 0));
    const action = slot.action !== undefined ? (slot.action ? 1 : 0) : 0;

    // 3 bytes: hours, minutes, action
    return Buffer.from([hours, minutes, action]);
  }

  static _decodeSwitchTimer(data) {
    if (data.length < 3) return null;
    return {
      hours: data[0],
      minutes: data[1],
      action: data[2] !== 0,
      timeString: `${String(data[0]).padStart(2, '0')}:${String(data[1]).padStart(2, '0')}`
    };
  }

  // ─── Thermostat Slot Format ─────────────────────────────────────────────

  static _encodeThermostatSlot(slot) {
    const hours = Math.max(0, Math.min(23, slot.hours || 0));
    const minutes = Math.max(0, Math.min(59, slot.minutes || 0));
    // Temperature: store as integer with 0.5 degree precision (e.g., 21.5 = 43)
    const tempRaw = Math.round((slot.temperature || 20) * 2);

    return Buffer.from([
      hours,
      minutes,
      Math.max(0, Math.min(255, tempRaw))
    ]);
  }

  static _decodeThermostatSlot(data) {
    if (data.length < 3) return null;
    const tempRaw = data[2];
    return {
      hours: data[0],
      minutes: data[1],
      temperature: tempRaw / 2,
      temperatureRaw: tempRaw,
      timeString: `${String(data[0]).padStart(2, '0')}:${String(data[1]).padStart(2, '0')}`
    };
  }

  // ─── Curtain Timer Format ───────────────────────────────────────────────

  static _encodeCurtainTimer(slot) {
    const hours = Math.max(0, Math.min(23, slot.hours || 0));
    const minutes = Math.max(0, Math.min(59, slot.minutes || 0));
    // Position: 0-100% as a byte
    const position = Math.max(0, Math.min(100, slot.position || 0));

    return Buffer.from([hours, minutes, position]);
  }

  static _decodeCurtainTimer(data) {
    if (data.length < 3) return null;
    return {
      hours: data[0],
      minutes: data[1],
      position: data[2],
      timeString: `${String(data[0]).padStart(2, '0')}:${String(data[1]).padStart(2, '0')}`
    };
  }

  // ─── Utility Methods ────────────────────────────────────────────────────

  /**
   * Generate a default weekly thermostat schedule
   * @param {Object} weekday - { wake: temp, leave: temp, return: temp, sleep: temp }
   * @param {Object} weekend - { wake: temp, leave: temp, return: temp, sleep: temp }
   * @returns {Array<Array<Object>>}
   */
  static generateDefaultThermostatSchedule(weekday = {}, weekend = {}) {
    const defaults = {
      wake: 21,
      leave: 18,
      return: 21,
      sleep: 18
    };

    const wd = { ...defaults, ...weekday };
    const we = { ...defaults, ...weekend };

    const weekdaySlots = [
      { hours: 6, minutes: 0, temperature: wd.wake },
      { hours: 8, minutes: 30, temperature: wd.leave },
      { hours: 17, minutes: 0, temperature: wd.return },
      { hours: 22, minutes: 0, temperature: wd.sleep }
    ];

    const weekendSlots = [
      { hours: 8, minutes: 0, temperature: we.wake },
      { hours: 10, minutes: 0, temperature: we.leave },
      { hours: 17, minutes: 0, temperature: we.return },
      { hours: 22, minutes: 0, temperature: we.sleep }
    ];

    return [
      weekdaySlots,  // Monday
      weekdaySlots,  // Tuesday
      weekdaySlots,  // Wednesday
      weekdaySlots,  // Thursday
      weekdaySlots,  // Friday
      weekendSlots,  // Saturday
      weekendSlots   // Sunday
    ];
  }

  /**
   * Validate a schedule slot
   * @param {Object} slot
   * @returns {{ valid: boolean, errors: Array<string> }}
   */
  static validateSlot(slot) {
    const errors = [];

    if (typeof slot.hours !== 'number' || slot.hours < 0 || slot.hours > 23) {
      errors.push('hours must be 0-23');
    }
    if (typeof slot.minutes !== 'number' || slot.minutes < 0 || slot.minutes > 59) {
      errors.push('minutes must be 0-59');
    }
    if (slot.temperature !== undefined && (slot.temperature < 5 || slot.temperature > 35)) {
      errors.push('temperature must be 5-35');
    }
    if (slot.position !== undefined && (slot.position < 0 || slot.position > 100)) {
      errors.push('position must be 0-100');
    }

    return { valid: errors.length === 0, errors };
  }
}

module.exports = ScheduleDataEncoder;
