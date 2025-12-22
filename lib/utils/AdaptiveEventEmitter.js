'use strict';

const { EventEmitter } = require('events');
const AdaptiveDataParser = require('./AdaptiveDataParser');

/**
 * AdaptiveEventEmitter - Universal event handling with auto data parsing
 * v5.3.62: Automatically normalizes data before emitting events
 *
 * Features:
 * - Auto-parses all event data
 * - Emits normalized events
 * - Multiple listener patterns supported
 * - Memory leak protection built-in
 */

class AdaptiveEventEmitter extends EventEmitter {

  constructor(options = {}) {
    super();

    this.maxListeners = options.maxListeners || 50;
    this.setMaxListeners(this.maxListeners);

    this._listenerCounts = new Map();
    this._lastEmit = new Map();
    this._cooldowns = new Map();

    // Default cooldown to prevent spam (ms)
    this.defaultCooldown = options.defaultCooldown || 100;
  }

  /**
   * Emit event with auto-parsed data
   * @param {string} event - Event name
   * @param {any} data - Raw data (will be auto-parsed)
   * @param {Object} options - Additional options
   */
  emitParsed(event, data, options = {}) {
    const context = options.context || event;
    const parsed = AdaptiveDataParser.parse(data, context);

    // Emit the original event with parsed data
    this.emit(event, parsed.value, parsed);

    // Also emit a normalized event
    this.emit(`${event}:parsed`, parsed);

    return parsed;
  }

  /**
   * Emit DP event with full normalization
   * @param {number} dpId - DataPoint ID
   * @param {any} value - Raw value
   * @param {number} dpType - DP type (optional)
   */
  emitDP(dpId, value, dpType = null) {
    // Determine context based on common DP mappings
    const context = this._getDPContext(dpId);
    const parsed = AdaptiveDataParser.parse(value, context);

    // Apply sensor conversion if applicable
    let convertedValue = parsed.value;
    if (context.includes('temp')) {
      convertedValue = AdaptiveDataParser.toTemperature(parsed.value);
    } else if (context.includes('humid')) {
      convertedValue = AdaptiveDataParser.toHumidity(parsed.value);
    } else if (context.includes('battery')) {
      convertedValue = AdaptiveDataParser.toBattery(parsed.value);
    } else if (context.includes('lux') || context.includes('illumin')) {
      convertedValue = AdaptiveDataParser.toIlluminance(parsed.value);
    }

    const dpData = {
      dpId,
      dpType,
      rawValue: value,
      parsedValue: parsed.value,
      convertedValue,
      context,
      parsed
    };

    // Emit multiple event patterns for maximum compatibility
    this.emit('dp', dpId, convertedValue, dpData);
    this.emit(`dp-${dpId}`, convertedValue, dpData);
    this.emit(`dp:${dpId}`, convertedValue, dpData);
    this.emit('datapoint', dpData);
    this.emit('dpReport', dpData);

    return dpData;
  }

  /**
   * Get context hint based on DP ID
   */
  _getDPContext(dpId) {
    const dpContexts = {
      1: 'temperature',
      2: 'humidity',
      3: 'temperature_soil',
      4: 'battery',
      5: 'humidity_soil',
      7: 'alarm_contact',
      9: 'distance',
      14: 'battery_low',
      15: 'battery',
      18: 'temperature',
      19: 'humidity',
      101: 'sensitivity',
      102: 'illuminance'
    };
    return dpContexts[dpId] || `dp_${dpId}`;
  }

  /**
   * Emit ZCL attribute event
   * @param {string} cluster - Cluster name
   * @param {string} attribute - Attribute name
   * @param {any} value - Raw value
   */
  emitZCL(cluster, attribute, value) {
    const context = `${cluster}.${attribute}`;
    const parsed = AdaptiveDataParser.parse(value, context);

    // Apply conversions based on cluster/attribute
    let convertedValue = parsed.value;

    if (cluster === 'temperatureMeasurement' || cluster === 'msTemperatureMeasurement') {
      convertedValue = AdaptiveDataParser.toTemperature(parsed.value);
    } else if (cluster === 'relativeHumidity' || cluster === 'msRelativeHumidity') {
      convertedValue = AdaptiveDataParser.toHumidity(parsed.value);
    } else if (cluster === 'powerConfiguration' && attribute.includes('battery')) {
      convertedValue = AdaptiveDataParser.toBattery(parsed.value);
    } else if (cluster === 'illuminanceMeasurement') {
      convertedValue = AdaptiveDataParser.toIlluminance(parsed.value);
    }

    const zclData = {
      cluster,
      attribute,
      rawValue: value,
      parsedValue: parsed.value,
      convertedValue,
      context,
      parsed
    };

    // Emit multiple event patterns
    this.emit('zcl', cluster, attribute, convertedValue, zclData);
    this.emit(`zcl:${cluster}`, attribute, convertedValue, zclData);
    this.emit(`zcl:${cluster}:${attribute}`, convertedValue, zclData);
    this.emit(`attr.${attribute}`, convertedValue, zclData);
    this.emit('zclReport', zclData);

    return zclData;
  }

  /**
   * Add listener with duplicate protection
   */
  safeOn(event, listener, options = {}) {
    const key = `${event}:${listener.toString().slice(0, 50)}`;

    // Check if similar listener already exists
    if (this._listenerCounts.has(key)) {
      console.log(`[AdaptiveEmitter] Skipping duplicate listener for ${event}`);
      return this;
    }

    this._listenerCounts.set(key, true);
    return this.on(event, listener);
  }

  /**
   * Add one-time listener
   */
  safeOnce(event, listener) {
    const key = `${event}:once:${listener.toString().slice(0, 50)}`;

    if (this._listenerCounts.has(key)) {
      return this;
    }

    this._listenerCounts.set(key, true);
    return this.once(event, (...args) => {
      this._listenerCounts.delete(key);
      listener(...args);
    });
  }

  /**
   * Emit with cooldown to prevent spam
   */
  emitThrottled(event, ...args) {
    const now = Date.now();
    const lastEmit = this._lastEmit.get(event) || 0;
    const cooldown = this._cooldowns.get(event) || this.defaultCooldown;

    if (now - lastEmit < cooldown) {
      return false;
    }

    this._lastEmit.set(event, now);
    this.emit(event, ...args);
    return true;
  }

  /**
   * Set cooldown for specific event
   */
  setCooldown(event, ms) {
    this._cooldowns.set(event, ms);
  }

  /**
   * Forward all events from another emitter with auto-parsing
   */
  forwardFrom(source, options = {}) {
    const { prefix = '', events = null, parse = true } = options;

    const originalEmit = source.emit.bind(source);
    source.emit = (event, ...args) => {
      // Call original
      originalEmit(event, ...args);

      // Forward to this emitter
      if (!events || events.includes(event)) {
        const forwardEvent = prefix ? `${prefix}:${event}` : event;

        if (parse && args.length > 0) {
          this.emitParsed(forwardEvent, args[0], { context: event });
        } else {
          this.emit(forwardEvent, ...args);
        }
      }
    };
  }

  /**
   * Create a proxy that auto-parses all incoming data
   */
  createParsingProxy(target) {
    const self = this;

    return new Proxy(target, {
      set(obj, prop, value) {
        const parsed = AdaptiveDataParser.parse(value, prop);
        obj[prop] = parsed.value;
        self.emit(`set:${prop}`, parsed.value, parsed);
        return true;
      },
      get(obj, prop) {
        return obj[prop];
      }
    });
  }
}

module.exports = AdaptiveEventEmitter;
